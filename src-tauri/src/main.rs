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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();

            // 构建托盘（鼠标退出通道）
            tray::build_tray(&handle)?;

            // 安装低级键盘钩子：拦截 Win/Alt+F4/Alt+Tab/Ctrl+Esc/Win+Tab
            // 字母键透传到 webview 由前端 JS 处理
            if let Err(e) = keyboard_hook::install() {
                eprintln!("[main] keyboard hook install failed: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![exit_app])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            // 应用退出时卸载钩子（清理线程）
            if let RunEvent::ExitRequested { .. } = event {
                keyboard_hook::uninstall();
            }
        });
}
