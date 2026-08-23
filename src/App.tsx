// 宝宝钢琴应用入口：唯一模式 = 宝宝模式（全键盘锁定 + 随便按就有声）
import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { AppStateProvider } from './state/AppState'
import { usePianoKeyboard } from './hooks/usePianoKeyboard'
import { audioEngine } from './audio/AudioEngine'
import { TitleBar } from './components/TitleBar'
import { BabyMode } from './components/BabyMode'
import './global.css'

function AppContent() {
  const [audioReady, setAudioReady] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)

  // 挂载全局键盘监听
  usePianoKeyboard()

  // 启动即全键盘锁定（Rust 钩子吞掉一切按键，仅转发出声）
  useEffect(() => {
    invoke('set_keyboard_lock', { locked: true }).catch(() => {
      // 非 Tauri 环境（纯浏览器 dev）忽略
    })
  }, [])

  // 首次用户交互时初始化音频（autoplay 策略）
  useEffect(() => {
    const unlock = async () => {
      if (audioReady || audioLoading) return
      setAudioLoading(true)
      try {
        await audioEngine.init()
        setAudioReady(true)
      } finally {
        setAudioLoading(false)
      }
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    // 全键盘锁定下 webview 收不到 keydown，按键解锁走 Rust 转发事件
    const unlisten: Promise<UnlistenFn> = listen('kb-raw', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      unlisten.then((fn) => fn())
    }
  }, [audioReady, audioLoading])

  return (
    <div className="relative w-screen h-screen overflow-hidden app-bg">
      <TitleBar />
      <BabyMode />

      {/* 加载提示遮罩 */}
      {audioLoading && !audioReady && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="text-white text-2xl animate-pulse">🎵 准备音色中...</div>
        </div>
      )}

      {/* 首次进入提示 */}
      {!audioReady && !audioLoading && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-sm animate-pulse">
          点击任意位置开始 🔊
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  )
}
