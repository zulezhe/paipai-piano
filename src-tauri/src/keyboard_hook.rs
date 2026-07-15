// 低级键盘钩子：拦截 Win/Alt+F4/Alt+Tab/Ctrl+Esc/Win+Tab 等系统组合键
// 字母键和数字键透传到 webview，由前端 JS 处理为钢琴音符
// 钩子必须运行在带 GetMessage 循环的线程上，且回调内禁止 I/O
use std::mem;
use std::sync::atomic::{AtomicU32, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::thread;
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
// 启动信号量：等待钩子线程真正安装好钩子再返回
static INSTALLED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
static INSTALL_LOCK: Mutex<()> = Mutex::new(());

/// 钩子回调：HC_ACTION 时检查 vkCode + flags 判定是否吞掉
/// 返回非零值表示吞掉该按键（不传递给后续 hook 或目标窗口）
unsafe extern "system" fn hook_cb(code: i32, w: WPARAM, l: LPARAM) -> isize {
    if code == HC_ACTION {
        let kb = &*(l as *const KBDLLHOOKSTRUCT);
        // 纯 match，无 I/O，确保不阻塞消息循环
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
pub fn uninstall() {
    let tid = THREAD_ID.load(Ordering::SeqCst);
    if tid != 0 {
        unsafe {
            // PostThreadMessageW 会唤醒 GetMessageW，返回 0 即 WM_QUIT
            PostThreadMessageW(tid, WM_QUIT, 0, 0);
        }
    }
}
