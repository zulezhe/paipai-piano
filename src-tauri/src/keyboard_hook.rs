// 低级键盘钩子（宝宝模式专用）
// 吞掉所有按键，同时把 vkCode 转发给前端出声。
// 设计要点（防 Windows 静默摘钩 + 防漏键）：
//  1. 回调内只做"位图记录 + 入队"，微秒级完成，绝不 I/O、绝不 emit
//     （低级钩子回调超时约 300ms 会被 Windows 静默摘除，摘除后全部拦截失效）
//  2. LOCK_ALL 默认 true：应用启动即全锁，不存在"等前端挂载"的竞态窗口
//  3. 看门狗线程每 15s 重装钩子：即使被系统静默摘除也能自动恢复
//  4. 按 VK 记录按下状态，只转发首次按下，系统自动重复不再连响
use std::mem;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter};
use winapi::shared::minwindef::{LPARAM, WPARAM};
use winapi::um::errhandlingapi::GetLastError;
use winapi::um::libloaderapi::GetModuleHandleW;
use winapi::um::processthreadsapi::GetCurrentThreadId;
use winapi::um::winuser::{
    CallNextHookEx, GetMessageW, KBDLLHOOKSTRUCT, MSG, PostThreadMessageW, SetWindowsHookExW,
    TranslateMessage, DispatchMessageW, UnhookWindowsHookEx, HC_ACTION, WH_KEYBOARD_LL, WM_QUIT,
};

// HHOOK 是裸指针，不实现 Send/Sync，用 AtomicUsize 存原始指针值
static HHOOK_PTR: AtomicUsize = AtomicUsize::new(0);
static THREAD_ID: AtomicU32 = AtomicU32::new(0);
// 全键盘锁定：宝宝模式是唯一模式，默认 true（启动即锁，无竞态窗口）
static LOCK_ALL: AtomicBool = AtomicBool::new(true);
// AppHandle 供转发线程 emit（回调内不直接用）
static APP_HANDLE: Mutex<Option<AppHandle>> = Mutex::new(None);
// 按键事件队列：回调只入队，转发线程负责 emit
static EVENT_QUEUE: Mutex<Vec<u32>> = Mutex::new(Vec::new());
// VK 按下状态位图（256 个键 -> 4 x u64），过滤系统自动重复
static KEY_STATE: [AtomicU64; 4] = [
    AtomicU64::new(0),
    AtomicU64::new(0),
    AtomicU64::new(0),
    AtomicU64::new(0),
];

const WM_KEYDOWN: usize = 0x0100;
const WM_KEYUP: usize = 0x0101;
const WM_SYSKEYDOWN: usize = 0x0104;
const WM_SYSKEYUP: usize = 0x0105;
// 启动信号量：等待钩子线程真正安装好钩子再返回
static INSTALLED: AtomicBool = AtomicBool::new(false);
static INSTALL_LOCK: Mutex<()> = Mutex::new(());
// 服务线程（转发 + 看门狗）只启动一次
static SERVICES_STARTED: AtomicBool = AtomicBool::new(false);

/// 钩子回调：全锁模式下吞掉一切按键，keydown 首次按下入队
unsafe extern "system" fn hook_cb(code: i32, w: WPARAM, l: LPARAM) -> isize {
    if code == HC_ACTION {
        let kb = &*(l as *const KBDLLHOOKSTRUCT);

        if LOCK_ALL.load(Ordering::Relaxed) {
            let vk = kb.vkCode as usize;
            let word = vk / 64;
            let bit = 1u64 << (vk % 64);
            match w {
                WM_KEYDOWN | WM_SYSKEYDOWN => {
                    // 只在"抬起 -> 按下"的边沿转发一次，自动重复不再连响
                    let prev = KEY_STATE[word].fetch_or(bit, Ordering::Relaxed);
                    if prev & bit == 0 {
                        if let Ok(mut q) = EVENT_QUEUE.lock() {
                            if q.len() < 64 {
                                q.push(kb.vkCode); // 队列满则丢弃，防狂按积压
                            }
                        }
                    }
                }
                WM_KEYUP | WM_SYSKEYUP => {
                    KEY_STATE[word].fetch_and(!bit, Ordering::Relaxed);
                }
                _ => {}
            }
            return 1; // 全部吞掉：系统、其他软件热键、webview 都收不到
        }
    }
    // 透传：交给下一个 hook 或系统默认处理
    CallNextHookEx(std::ptr::null_mut(), code, w, l) as isize
}

/// 注册 AppHandle（setup 时调用一次）
pub fn set_app_handle(handle: AppHandle) {
    if let Ok(mut guard) = APP_HANDLE.lock() {
        *guard = Some(handle);
    }
}

/// 切换全键盘锁定（保留命令接口；宝宝模式是唯一模式，默认已锁）
pub fn set_lock_all(locked: bool) {
    LOCK_ALL.store(locked, Ordering::SeqCst);
}

/// 安装钩子：spawn 专用线程跑 SetWindowsHookExW + GetMessageW 循环
/// 首次安装时同时启动转发线程和看门狗线程
pub fn install() -> Result<(), String> {
    let _guard = INSTALL_LOCK
        .lock()
        .map_err(|e| format!("install lock poisoned: {}", e))?;

    // 已安装则跳过
    if HHOOK_PTR.load(Ordering::SeqCst) != 0 {
        return Ok(());
    }
    INSTALLED.store(false, Ordering::SeqCst);
    // 重装时清空按键状态位图，避免残留"按住"状态吃掉后续按键
    for word in KEY_STATE.iter() {
        word.store(0, Ordering::SeqCst);
    }

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

            HHOOK_PTR.store(hook as usize, Ordering::SeqCst);
            THREAD_ID.store(GetCurrentThreadId(), Ordering::SeqCst);
            INSTALLED.store(true, Ordering::SeqCst);
            eprintln!("[kb-hook] installed, running message loop");

            // WH_KEYBOARD_LL 要求调用线程必须有消息循环
            let mut msg: MSG = mem::zeroed();
            loop {
                let ret = GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0);
                if ret <= 0 {
                    break;
                }
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }

            UnhookWindowsHookEx(hook);
            HHOOK_PTR.store(0, Ordering::SeqCst);
            THREAD_ID.store(0, Ordering::SeqCst);
            eprintln!("[kb-hook] uninstalled");
        })
        .map_err(|e| format!("failed to spawn hook thread: {}", e))?;

    // 等钩子线程完成安装（最多 1 秒）
    for _ in 0..100 {
        if INSTALLED.load(Ordering::SeqCst) {
            start_services();
            return Ok(());
        }
        thread::sleep(std::time::Duration::from_millis(10));
    }
    Err("keyboard hook install timeout (1s)".to_string())
}

/// 服务线程：转发队列按键到前端 + 看门狗定期重装钩子
/// 只在首次安装时启动，之后常驻
fn start_services() {
    if SERVICES_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    // 转发线程：drain 队列后 emit 到 webview（慢也没关系，不在回调路径上）
    thread::Builder::new()
        .name("kb-forward".to_string())
        .spawn(|| {
            let mut batch: Vec<u32> = Vec::new();
            loop {
                thread::sleep(std::time::Duration::from_millis(8));
                batch.clear();
                if let Ok(mut q) = EVENT_QUEUE.lock() {
                    batch.append(&mut q);
                }
                if batch.is_empty() {
                    continue;
                }
                if let Ok(guard) = APP_HANDLE.lock() {
                    if let Some(handle) = guard.as_ref() {
                        for vk in &batch {
                            let _ = handle.emit("kb-raw", *vk);
                        }
                    }
                }
            }
        })
        .expect("spawn kb-forward");

    // 看门狗：锁定状态下每 15s 重装一次钩子。
    // Windows 对回调超时的低级钩子会静默摘除（无任何通知），
    // 唯一可靠的恢复手段就是周期性重装抢回钩子链。
    thread::Builder::new()
        .name("kb-watchdog".to_string())
        .spawn(|| loop {
            thread::sleep(std::time::Duration::from_secs(15));
            if LOCK_ALL.load(Ordering::SeqCst) {
                reinstall();
            }
        })
        .expect("spawn kb-watchdog");
}

/// 重装钩子：摘掉旧钩子再装新的，把自己插回钩子链头部。
/// Windows LL hook 链是"后安装者先调用"；截图类软件（Snipaste 等）
/// 若比我们后启动，其钩子排在前面。定期重装可持续压制。
pub fn reinstall() {
    uninstall();
    if let Err(e) = install() {
        eprintln!("[kb-hook] reinstall failed: {}", e);
    }
}

pub fn uninstall() {
    // 同步卸载：app.exit(0) 会立即终止所有线程，
    // UnhookWindowsHookEx 允许跨线程调用，直接摘除后再等线程退出
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
            PostThreadMessageW(tid, WM_QUIT, 0, 0);
            for _ in 0..50 {
                if THREAD_ID.load(Ordering::SeqCst) == 0 {
                    break;
                }
                thread::sleep(std::time::Duration::from_millis(10));
            }
        }
    }
}
