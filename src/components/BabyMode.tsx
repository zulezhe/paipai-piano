// 宝宝模式：随便按就有声，进度条满 100 触发鼓励 + 彩纸
// 卡通吉祥物在每次按键时弹跳；每次按键随机冒出动物跳舞 + 音符上飘
import { useEffect, useReducer, useRef, useState } from 'react'
import { PianoKeyboard } from './PianoKeyboard'
import { DancingCritter, type CritterVariant } from './DancingCritter'
import { Confetti } from './Confetti'
import { audioEngine } from '../audio/AudioEngine'
import { useAppState } from '../state/AppState'

// 动物 emoji 库：按键时随机登场跳舞
const CRITTERS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐯', '🐸', '🐵', '🐷', '🐨', '🦁']
const NOTE_EMOJIS = ['🎵', '🎶', '🎼']

interface Critter {
  id: number
  emoji: string
  note: string
  x: number // 水平位置 vw%
  delay: number // 音符延迟 s
}

let critterSeq = 0

// 常驻卡通形象轮换表：每完成一轮能量条换下一个
const CRITTER_ROTATION: CritterVariant[] = ['chick', 'bunny', 'cat', 'frog']

export function BabyMode() {
  const { state, dispatch } = useAppState()
  const [showConfetti, setShowConfetti] = useState(false)
  const [pressCount, setPressCount] = useState(0)
  const [critters, setCritters] = useState<Critter[]>([])
  const lastCheerAt = useRef(0)
  // 热度 tick：驱动常驻卡通 idle/热舞切换（最近按键 <2.5s 即热舞）
  const [, forceTick] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const t = setInterval(forceTick, 500)
    return () => clearInterval(t)
  }, [])
  const dancing = Date.now() - state.lastPressedAt < 2500

  // 每次物理/鼠标按键：冒出一个动物跳舞 + 音符上飘（上限 6 个防 DOM 爆炸）
  useEffect(() => {
    if (!state.lastPressedNote) return
    const id = ++critterSeq
    const critter: Critter = {
      id,
      emoji: CRITTERS[Math.floor(Math.random() * CRITTERS.length)],
      note: NOTE_EMOJIS[Math.floor(Math.random() * NOTE_EMOJIS.length)],
      x: 8 + Math.random() * 84,
      delay: Math.random() * 0.3,
    }
    setCritters(cs => [...cs.slice(-5), critter])
    const t = setTimeout(() => {
      setCritters(cs => cs.filter(c => c.id !== id))
    }, 2000)
    return () => clearTimeout(t)
  }, [state.lastPressedAt, state.lastPressedNote])

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
  }

  // 按键计数统一由 lastPressedAt 驱动（物理键 + 鼠标点击都覆盖），
  // 用于吉祥物弹跳与跳舞卡通的舞步交替
  useEffect(() => {
    if (state.lastPressedAt > 0) setPressCount(c => c + 1)
  }, [state.lastPressedAt])

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
    <div className="absolute inset-0 flex flex-col items-center justify-start gap-4 pt-16 pb-4 overflow-auto">
      {/* 动物跳舞 + 音符上飘动画层 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
        {critters.map(c => (
          <div
            key={c.id}
            className="absolute bottom-[38%]"
            style={{ left: `${c.x}%` }}
          >
            <div
              className="text-6xl drop-shadow-lg"
              style={{ animation: 'critter-dance 1.8s ease-in-out' }}
            >
              {c.emoji}
            </div>
            <div
              className="absolute -top-4 left-1/2 text-3xl"
              style={{ animation: `note-float 1.6s ease-out ${c.delay}s forwards` }}
            >
              {c.note}
            </div>
          </div>
        ))}
      </div>

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

      {/* 钢琴键盘（放大 + 物理按键按下反馈） */}
      <PianoKeyboard
        onKeyClick={handleKey}
        activeNote={state.lastPressedNote}
        activeAt={state.lastPressedAt}
        heightPx={420}
        className="w-full"
      />

      {/* 常驻跳舞卡通（键盘下方）：静止不动，按键时起舞；
          每完成一轮能量条（cheerCount+1）换一个形象 */}
      <DancingCritter
        dancing={dancing}
        variant={CRITTER_ROTATION[state.cheerCount % CRITTER_ROTATION.length]}
        mood={pressCount}
      />

      {/* 彩纸飞溅 */}
      {showConfetti && <Confetti count={50} />}
    </div>
  )
}
