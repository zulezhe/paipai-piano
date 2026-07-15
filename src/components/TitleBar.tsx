// 标题栏：拖拽区 + 退出按钮（仅鼠标）
// Alt+F4 已被 Rust 键盘钩子拦截，所以这是唯一的退出通道之一（另一个是托盘）
import { invoke } from '@tauri-apps/api/core'

export function TitleBar() {
  const handleClose = async () => {
    try {
      await invoke('exit_app')
    } catch (e) {
      console.error('exit_app failed:', e)
    }
  }

  return (
    <div
      data-tauri-drag-region
      className="absolute top-0 left-0 right-0 h-9 flex items-center justify-between px-3 z-40"
    >
      {/* 左侧标题 */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 text-white/90 font-bold text-sm pointer-events-none"
      >
        <span className="text-xl">🎹</span>
        <span>宝宝钢琴</span>
      </div>

      {/* 右侧退出按钮 */}
      <button
        type="button"
        onClick={handleClose}
        className="w-8 h-8 rounded-full bg-white/15 hover:bg-red-500 text-white font-bold flex items-center justify-center transition-colors"
        title="退出"
      >
        ✕
      </button>
    </div>
  )
}
