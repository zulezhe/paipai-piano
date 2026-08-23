// 宝宝钢琴应用入口
// 职责：构建托盘、安装键盘钩子、暴露 exit_app 命令
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod keyboard_hook;
mod tray;

use tauri::RunEvent;

#[tauri::command]
async fn exit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

/// 切换全键盘锁定：宝宝模式 true（吞掉所有按键，仅转发出声），其他模式 false
#[tauri::command]
fn set_keyboard_lock(locked: bool) {
    eprintln!("[main] set_keyboard_lock({})", locked); // TODO(diag): 临时诊断
    keyboard_hook::set_lock_all(locked);
    if locked {
        // 重装钩子抢回链头：压制比我们后启动的钩子型热键软件（如 Snipaste）
        keyboard_hook::reinstall();
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();

            // 构建托盘（鼠标退出通道）
            tray::build_tray(&handle)?;

            // 注册 AppHandle 供钩子转发按键事件
            keyboard_hook::set_app_handle(handle.clone());

            // 安装低级键盘钩子：拦截 Win/Alt+F4/Alt+Tab/Ctrl+Esc/Win+Tab
            // 字母键透传到 webview 由前端 JS 处理
            if let Err(e) = keyboard_hook::install() {
                eprintln!("[main] keyboard hook install failed: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![exit_app, set_keyboard_lock])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            // 应用退出时卸载钩子（清理线程）
            if let RunEvent::ExitRequested { .. } = event {
                keyboard_hook::uninstall();
            }
        });
}
