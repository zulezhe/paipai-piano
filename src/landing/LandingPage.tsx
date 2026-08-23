// 落地页：Hero + 在线钢琴试玩 + 特性 + 页脚
// 复用桌面应用组件（PianoKeyboard/DancingCritter/AudioEngine/usePianoKeyboard）
import { useEffect, useReducer, useState } from 'react'
import { AppStateProvider, useAppState } from '../state/AppState'
import { usePianoKeyboard } from '../hooks/usePianoKeyboard'
import { audioEngine } from '../audio/AudioEngine'
import { PianoKeyboard } from '../components/PianoKeyboard'
import { DancingCritter } from '../components/DancingCritter'

// 卡通形象轮换
const ROTATION = ['chick', 'bunny', 'cat', 'frog'] as const

function OnlinePiano() {
  const { state, dispatch } = useAppState()
  const [audioReady, setAudioReady] = useState(false)

  usePianoKeyboard()

  // 首次交互解锁音频（浏览器 autoplay 策略）
  useEffect(() => {
    const unlock = async () => {
      if (audioReady) return
      await audioEngine.init()
      setAudioReady(true)
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [audioReady])

  // 卡通热度：最近 2.5s 有按键则起舞
  const [, forceTick] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const t = setInterval(forceTick, 500)
    return () => clearInterval(t)
  }, [])
  const dancing = Date.now() - state.lastPressedAt < 2500

  // 按键计数（舞步交替）
  const [pressCount, setPressCount] = useState(0)
  useEffect(() => {
    if (state.lastPressedAt > 0) setPressCount(c => c + 1)
  }, [state.lastPressedAt])

  const handleKeyClick = (noteId: string) => {
    audioEngine.playNote(noteId)
    dispatch({ type: 'PRESS_KEY', noteId, at: Date.now() })
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <DancingCritter
        dancing={dancing}
        variant={ROTATION[0]}
        mood={pressCount}
      />
      <PianoKeyboard
        onKeyClick={handleKeyClick}
        activeNote={state.lastPressedNote}
        activeAt={state.lastPressedAt}
        heightPx={420}
        className="w-full"
      />
      <p className="text-white/70 text-sm">
        提示：电脑键盘按键也能弹（z s x d c v… 对应中排琴键），没映射的键会随机出五声音阶 🎵
      </p>
    </div>
  )
}

const FEATURES = [
  {
    icon: '🎹',
    title: '49 键真钢琴音色',
    desc: 'C3-B7 四个八度，真实钢琴采样，按哪个键都有好听的声音',
  },
  {
    icon: '🛡️',
    title: '全键盘锁定保护',
    desc: '桌面版锁住一切系统快捷键，宝宝乱按也不会退出、误删、打开奇怪的东西',
  },
  {
    icon: '🐰',
    title: '动物陪着跳舞',
    desc: '每完成一轮能量条换一个卡通形象，小黄鸡、粉兔、灰猫、绿蛙轮流登场',
  },
  {
    icon: '🚫',
    title: '免费无广告',
    desc: '开源桌面应用，离线可用，没有广告、内购和诱导按钮',
  },
]

export function LandingPage() {
  return (
    <div className="app-bg min-h-screen text-white">
      {/* 顶部导航 */}
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-extrabold">
          <span className="text-2xl">🎹</span> 宝宝钢琴
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#play" className="opacity-80 hover:opacity-100">在线试玩</a>
          <a href="#features" className="opacity-80 hover:opacity-100">特性</a>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-full bg-white/90 text-slate-800 font-bold hover:bg-white"
          >
            下载桌面版
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold drop-shadow-lg leading-tight">
          给宝宝的第一个钢琴 🎵
        </h1>
        <p className="mt-6 text-xl text-white/85 leading-relaxed">
          随便按就有声，动物陪着跳舞。<br className="hidden md:block" />
          宝宝玩得开心，家长放心。
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a
            href="#play"
            className="px-8 py-3 rounded-full bg-white/90 text-slate-800 font-extrabold text-lg hover:bg-white shadow-lg"
          >
            🎹 立即试玩
          </a>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="px-8 py-3 rounded-full border-2 border-white/60 font-bold text-lg hover:bg-white/10"
          >
            下载 Windows 版
          </a>
        </div>
      </section>

      {/* 在线钢琴 */}
      <section id="play" className="w-full mx-auto px-4 py-10">
        <h2 className="text-3xl font-extrabold text-center mb-2">在线试玩</h2>
        <p className="text-center text-white/70 mb-8">鼠标点琴键，或直接敲电脑键盘</p>
        <div className="rounded-3xl bg-black/15 border border-white/15 backdrop-blur-sm p-6">
          <AppStateProvider>
            <OnlinePiano />
          </AppStateProvider>
        </div>
      </section>

      {/* 特性 */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-14">
        <h2 className="text-3xl font-extrabold text-center mb-10">为什么选宝宝钢琴</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="rounded-2xl bg-white/10 border border-white/15 p-6 backdrop-blur-sm"
            >
              <div className="text-4xl mb-3">{f.icon}</div>
              <div className="font-bold text-lg mb-2">{f.title}</div>
              <div className="text-white/75 text-sm leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 页脚 */}
      <footer className="border-t border-white/15 py-8 text-center text-white/60 text-sm">
        宝宝钢琴 · 免费开源 · 采样基于真实钢琴 ·
        桌面版支持 Windows 10/11
      </footer>
    </div>
  )
}
