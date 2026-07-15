// 宝宝钢琴应用入口
// 三种模式：宝宝(默认) / 教学 / 大神
import { useEffect, useState } from 'react'
import { AppStateProvider, useAppState } from './state/AppState'
import { usePianoKeyboard } from './hooks/usePianoKeyboard'
import { audioEngine } from './audio/AudioEngine'
import { TitleBar } from './components/TitleBar'
import { ModeSwitch } from './components/ModeSwitch'
import { BabyMode } from './components/BabyMode'
import { TeachMode } from './components/TeachMode'
import { ProMode } from './components/ProMode'
import './global.css'

function AppContent() {
  const { state } = useAppState()
  const [audioReady, setAudioReady] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)

  // 挂载全局键盘监听
  usePianoKeyboard()

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
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [audioReady, audioLoading])

  return (
    <div className="relative w-screen h-screen overflow-hidden app-bg">
      <TitleBar />

      {/* 顶部右侧模式切换（在 TitleBar 下方留出空间） */}
      <div className="absolute top-10 right-4 z-30">
        <ModeSwitch />
      </div>

      {/* 主体内容 */}
      <main className="absolute inset-0 pt-20 pb-4 px-4 overflow-auto">
        {state.mode === 'baby' && <BabyMode />}
        {state.mode === 'teach' && <TeachMode />}
        {state.mode === 'pro' && <ProMode />}
      </main>

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
