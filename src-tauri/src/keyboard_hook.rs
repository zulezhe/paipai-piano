// 低级键盘钩子
// 普通模式：拦截 Win/Alt+F4/Alt+Tab/Ctrl+Esc/Win+Tab，其余透传给 webview
// 锁定模式（宝宝模式）：吞掉所有按键，同时把 vkCode 通过事件转发给前端，
//   这样任何软件的 RegisterHotKey 全局热键/系统快捷键都不会被触发
// 钩子必须运行在带 GetMessage 循环的线程上，且回调内禁止 I/O
use std::mem;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter};
use winapi::shared::minwindef::{LPARAM, WPARAM};
use winapi::um::errhandlingapi::GetLastError;
use winapi::um::libloaderapi::GetModuleHandleW;
use winapi::um::processthreadsapi::GetCurrentThreadId;
use winapi::um::winuser::{
    CallNextHookEx, GetAsyncKeyState, GetMessageW, KBDLLHOOKSTRUCT, LLKHF_ALTDOWN, MSG,
    PostThreadMessageW, SetWindowsHookExW, TranslateMessage, DispatchMessageW,
    UnhookWindowsHookEx, HC_ACTION, WH_KEYBOARD_LL, WM_QUIT,
};

// VK_* 常量在 winapi 中是 i32 (c_int)，但我们匹配的 vkCode 是 u32
// 直接用字面量更稳，避免类型转换噪声
const VK_LWIN: u32 = 0x5B;
const VK_RWIN: u32 = 0x5C;
const VK_F4: u32 = 0x73;
const VK_TAB: u32 = 0x09;
const VK_ESCAPE: u32 = 0x1B;
const VK_CONTROL: i32 = 0x11;

// HHOOK 是裸指针，不实现 Send/Sync，Mutex<Option<HHOOK>> 无法做静态全局
// 用 AtomicUsize 存原始指针值（AtomicUsize 是 Send + Sync）
static HHOOK_PTR: AtomicUsize = AtomicUsize::new(0);
static THREAD_ID: AtomicU32 = AtomicU32::new(0);
// 全键盘锁定开关（宝宝模式开启：吞掉一切按键，只转发给前端出声）
static LOCK_ALL: AtomicBool = AtomicBool::new(false);
// AppHandle 用于向 webview 转发按键事件（tauri AppHandle 是 Send + Sync）
static APP_HANDLE: Mutex<Option<AppHandle>> = Mutex::new(None);

const WM_KEYDOWN: usize = 0x0100;
const WM_SYSKEYDOWN: usize = 0x0104;
// 启动信号量：等待钩子线程真正安装好钩子再返回
static INSTALLED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
static INSTALL_LOCK: Mutex<()> = Mutex::new(());

/// 钩子回调：HC_ACTION 时检查 vkCode + flags 判定是否吞掉
/// 返回非零值表示吞掉该按键（不传递给后续 hook 或目标窗口）
unsafe extern "system" fn hook_cb(code: i32, w: WPARAM, l: LPARAM) -> isize {
    if code == HC_ACTION {
        let kb = &*(l as *const KBDLLHOOKSTRUCT);

        // 锁定模式：吞掉所有按键，keydown 时把 vkCode 转发给前端
        // emit 走 Tauri 事件队列，非阻塞，可在回调内安全调用
        if LOCK_ALL.load(Ordering::Relaxed) {
            // TODO(diag): 临时诊断日志，定位 F1/F3 截图拦截失败，定位后删除
            if kb.vkCode == 0x70 || kb.vkCode == 0x72 {
                eprintln!("[kb-hook][diag] LOCK_ALL, vk={:#04x} w={:#04x}", kb.vkCode, w);
            }
            if w == WM_KEYDOWN || w == WM_SYSKEYDOWN {
                // LLKHF_LOWER_IL_INJECTED 等注入标志不区分，统一转发
                if let Ok(guard) = APP_HANDLE.lock() {
                    if let Some(handle) = guard.as_ref() {
                        let _ = handle.emit("kb-raw", kb.vkCode);
                    }
                }
            }
            return 1; // 全部吞掉：系统、其他软件的热键、webview 都收不到
        }

        // 普通模式：只拦系统组合键，纯 match，无 I/O
        let blocked = match kb.vkCode {
            // Win 键左右都吞
            VK_LWIN | VK_RWIN => true,
            // Alt+F4
            VK_F4 if (kb.flags & LLKHF_ALTDOWN) != 0 => true,
            // Alt+Tab
            VK_TAB if (kb.flags & LLKHF_ALTDOWN) != 0 => true,
            // Win+Tab：LLKHF_ALTDOWN 不靠谱，用 GetAsyncKeyState 检测 Win 键
            // GetAsyncKeyState 返回 i16，高位 bit (0x8000) 为 1 表示当前按下
            VK_TAB => {
                (GetAsyncKeyState(VK_LWIN as i32) as u16 & 0x8000 != 0)
                    || (GetAsyncKeyState(VK_RWIN as i32) as u16 & 0x8000 != 0)
            }
            // Ctrl+Esc
            VK_ESCAPE => (GetAsyncKeyState(VK_CONTROL) as u16 & 0x8000) != 0,
            _ => false,
        };
        if blocked {
            return 1; // 吞掉
        }
    }
    // 透传：交给下一个 hook 或系统默认处理
    CallNextHookEx(std::ptr::null_mut(), code, w, l) as isize
}

/// 注册 AppHandle（setup 时调用一次），锁定模式用它转发按键事件
pub fn set_app_handle(handle: AppHandle) {
    if let Ok(mut guard) = APP_HANDLE.lock() {
        *guard = Some(handle);
    }
}

/// 切换全键盘锁定（宝宝模式开 / 其他模式关）
pub fn set_lock_all(locked: bool) {
    LOCK_ALL.store(locked, Ordering::SeqCst);
}

/// 安装钩子：spawn 一个专用线程跑 SetWindowsHookExW + GetMessageW 循环
pub fn install() -> Result<(), String> {
    // 取锁防止并发调用
    let _guard = INSTALL_LOCK.lock().map_err(|e| format!("install lock poisoned: {}", e))?;

    // 已安装则跳过
    if HHOOK_PTR.load(Ordering::SeqCst) != 0 {
        return Ok(());
    }
    INSTALLED.store(false, Ordering::SeqCst);

    let _handle = thread::Builder::new()
        .name("kb-hook".to_string())
        .spawn(|| unsafe {
            let hinst = GetModuleHandleW(std::ptr::null());
            if hinst.is_null() {
                eprintln!("[kb-hook] GetModuleHandleW failed: {}", GetLastError());
                return;
            }

            let hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(hook_cb), hinst, 0);
            if hook.is_null() {
                eprintln!("[kb-hook] SetWindowsHookExW failed: {}", GetLastError());
                return;
            }

            // 注册钩子句柄和线程 ID
            HHOOK_PTR.store(hook as usize, Ordering::SeqCst);
            THREAD_ID.store(GetCurrentThreadId(), Ordering::SeqCst);
            INSTALLED.store(true, Ordering::SeqCst);

            eprintln!("[kb-hook] installed, running message loop");

            // 消息循环：WH_KEYBOARD_LL 要求调用线程必须有消息循环，否则回调不会触发
            let mut msg: MSG = mem::zeroed();
            loop {
                // GetMessageW 阻塞直到有消息；返回值 <=0 表示 WM_QUIT 或错误
                let ret = GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0);
                if ret <= 0 {
                    break;
                }
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }

            // 清理：卸载钩子
            UnhookWindowsHookEx(hook);
            HHOOK_PTR.store(0, Ordering::SeqCst);
            THREAD_ID.store(0, Ordering::SeqCst);
            eprintln!("[kb-hook] uninstalled");
        })
        .map_err(|e| format!("failed to spawn hook thread: {}", e))?;

    // 等钩子线程完成安装（最多 1 秒）
    for _ in 0..100 {
        if INSTALLED.load(Ordering::SeqCst) {
            return Ok(());
        }
        thread::sleep(std::time::Duration::from_millis(10));
    }
    Err("keyboard hook install timeout (1s)".to_string())
}

/// 卸载钩子：向钩子线程投递 WM_QUIT 让其退出消息循环
/// 重装钩子：摘掉旧钩子再装新的，把自己插回钩子链头部
/// Windows LL hook 链是"后安装者先调用"；截图类软件（Snipaste 等）
/// 若比我们后启动，其钩子排在前面会先收到按键。进入宝宝模式时
/// 重装一次，可压制所有钩子型热键软件。
pub fn reinstall() {
    uninstall();
    if let Err(e) = install() {
        eprintln!("[kb-hook] reinstall failed: {}", e);
    }
}

pub fn uninstall() {
    // 同步卸载：app.exit(0) 会立即终止所有线程，异步投递 WM_QUIT 后
    // 钩子线程来不及执行 UnhookWindowsHookEx。UnhookWindowsHookEx 允许
    // 跨线程调用，这里直接摘除钩子，再等线程退出消息循环。
    let hook = HHOOK_PTR.load(Ordering::SeqCst);
    if hook != 0 {
        unsafe {
            UnhookWindowsHookEx(hook as _);
        }
        HHOOK_PTR.store(0, Ordering::SeqCst);
        eprintln!("[kb-hook] uninstalled (from exit path)");
    }
    let tid = THREAD_ID.load(Ordering::SeqCst);
    if tid != 0 {
        unsafe {
            // PostThreadMessageW 会唤醒 GetMessageW，返回 0 即 WM_QUIT
            PostThreadMessageW(tid, WM_QUIT, 0, 0);
            // 等钩子线程退出消息循环（THREAD_ID 清零），最多 500ms，
            // 确保 UnhookWindowsHookEx 生效后才放行 process::exit
            for _ in 0..50 {
                if THREAD_ID.load(Ordering::SeqCst) == 0 {
                    break;
                }
                thread::sleep(std::time::Duration::from_millis(10));
            }
        }
    }
}
