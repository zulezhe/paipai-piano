// 宝宝模式：随便按就有声，进度条满 100 触发鼓励 + 彩纸
// 卡通吉祥物在每次按键时弹跳
import { useEffect, useRef, useState } from 'react'
import { PianoKeyboard } from './PianoKeyboard'
import { Confetti } from './Confetti'
import { audioEngine } from '../audio/AudioEngine'
import { useAppState } from '../state/AppState'

export function BabyMode() {
  const { state, dispatch } = useAppState()
  const [showConfetti, setShowConfetti] = useState(false)
  const [pressCount, setPressCount] = useState(0)
  const lastCheerAt = useRef(0)

  // 进度满 100 -> 播放鼓励 + 显示彩纸
  useEffect(() => {
    if (state.babyProgress >= 100 && !showConfetti) {
      audioEngine.playCheer()
      setShowConfetti(true)
      lastCheerAt.current = Date.now()
      // 4 秒后彩纸消失；reducer 里的 RESET_BABY 也会同时触发
      const t = setTimeout(() => setShowConfetti(false), 4000)
      return () => clearTimeout(t)
    }
  }, [state.babyProgress, showConfetti])

  const handleKey = (noteId: string) => {
    audioEngine.playNote(noteId)
    dispatch({ type: 'PRESS_KEY', noteId, at: Date.now() })
    setPressCount(c => c + 1)
  }

  // 进度条颜色随进度变化
  const progress = state.babyProgress
  const progressColor =
    progress < 33 ? 'from-sky-400 to-cyan-300'
    : progress < 66 ? 'from-amber-400 to-yellow-300'
    : 'from-pink-500 to-rose-400'

  // 吉祥物表情随进度变化
  const mascot =
    progress < 33 ? '🐰'
    : progress < 66 ? '🦊'
    : progress < 100 ? '🐯'
    : '🦄'

  const mascotText =
    progress < 33 ? '加油呀～'
    : progress < 66 ? '太棒了！'
    : progress < 100 ? '快到啦！'
    : '超级棒！🎉'

  return (
    <div className="flex flex-col items-center justify-start gap-6 pb-8 pt-4">
      {/* 顶部吉祥物 + 鼓励语 */}
      <div className="flex items-center gap-4">
        <div
          key={pressCount}
          className="text-7xl"
          style={{ animation: 'mascot-bounce 0.4s ease-out' }}
        >
          {mascot}
        </div>
        <div className="text-left">
          <div className="text-3xl font-extrabold text-white drop-shadow-lg">
            {mascotText}
          </div>
          <div className="text-white/70 text-sm mt-1">随便按吧～</div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full max-w-3xl px-8">
        <div className="flex justify-between items-end mb-2">
          <span className="text-white font-bold text-lg">能量条 ⚡</span>
          <span className="text-white text-2xl font-extrabold tabular-nums">
            {progress}%
          </span>
        </div>
        <div className="h-8 w-full rounded-full bg-black/30 border-4 border-white/40 overflow-hidden shadow-inner">
          <div
            className={`
              h-full bg-gradient-to-r ${progressColor}
              transition-all duration-300 ease-out
              flex items-center justify-end pr-3
            `}
            style={{
              width: `${progress}%`,
              boxShadow: progress > 0 ? '0 0 16px rgba(255,255,255,0.5)' : 'none',
            }}
          >
            {progress > 15 && (
              <span className="text-white font-bold text-sm">✨</span>
            )}
          </div>
        </div>
      </div>

      {/* 钢琴键盘 */}
      <PianoKeyboard
        theme="baby"
        onKeyClick={handleKey}
        className="max-w-6xl"
      />

      {/* 彩纸飞溅 */}
      {showConfetti && <Confetti count={50} />}
    </div>
  )
}
