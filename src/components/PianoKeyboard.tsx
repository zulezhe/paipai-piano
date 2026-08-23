// 钢琴键盘展示组件：白键 + 黑键叠加定位（宝宝模式专用）
import { useEffect, useState } from 'react'
import { PIANO_KEYS } from '../data/piano'
import { cn } from '../lib/utils'

interface Props {
  /** 按键点击回调 */
  onKeyClick?: (noteId: string) => void
  /** 容器类名 */
  className?: string
  /** 物理按键反馈：最近按下的音符 ID */
  activeNote?: string | null
  /** 最近按键时间戳（变化时重放按下动画） */
  activeAt?: number
  /** 键盘高度 px */
  heightPx?: number
}

/** 按下高亮持续时间 ms */
const PRESS_MS = 180

export function PianoKeyboard({
  onKeyClick,
  className,
  activeNote,
  activeAt,
  heightPx = 280,
}: Props) {
  const whites = PIANO_KEYS.filter(k => k.color === 'white')
  const blacks = PIANO_KEYS.filter(k => k.color === 'black')
  const WHITE_COUNT = whites.length

  // 物理按键按下反馈：activeAt 变化时高亮对应键，PRESS_MS 后复原
  const [pressedId, setPressedId] = useState<string | null>(null)
  useEffect(() => {
    if (!activeNote || !activeAt) return
    setPressedId(activeNote)
    const t = setTimeout(() => setPressedId(null), PRESS_MS)
    return () => clearTimeout(t)
  }, [activeNote, activeAt])

  return (
    <div
      className={cn('relative w-full select-none piano-baby', className)}
      style={{ height: `${heightPx}px` }}
    >
      {/* 白键层：用 flex 平分宽度 */}
      <div className="absolute inset-0 flex gap-[2px]">
        {whites.map((key) => {
          const isPressed = pressedId === key.id
          return (
            <button
              key={key.id}
              type="button"
              onPointerDown={() => onKeyClick?.(key.id)}
              className={cn(
                'piano-white-key flex-1 rounded-b-lg border border-b-4 border-gray-300',
                'flex flex-col items-center justify-end pb-3 gap-2',
                'transition-all duration-75 active:scale-y-95 active:bg-amber-50',
                'shadow-md hover:shadow-lg',
                isPressed && 'key-pressed-white scale-y-95 translate-y-[3px] shadow-inner',
              )}
              style={{
                background: isPressed
                  ? 'linear-gradient(180deg, #fde68a 0%, #fbbf24 100%)'
                  : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                borderBottomColor: isPressed ? '#d97706' : '#94a3b8',
              }}
            >
              <span className="text-xs font-bold text-gray-400">
                {key.keyboardChar ? key.keyboardChar.toUpperCase() : ''}
              </span>
              <span className="text-[10px] text-gray-500">{key.label}</span>
            </button>
          )
        })}
      </div>

      {/* 黑键层：绝对定位，按 whiteIndex 比例 */}
      <div className="absolute top-0 left-0 right-0 h-[60%] pointer-events-none">
        {blacks.map((key) => {
          // 黑键在两个白键之间：根据其前后白键索引算位置
          const prevWhite = PIANO_KEYS
            .filter(k => k.color === 'white' && PIANO_KEYS.indexOf(k) < PIANO_KEYS.indexOf(key))
            .pop()
          const whiteIdx = prevWhite?.whiteIndex ?? 0
          // 每个 白键宽度 = 100% / WHITE_COUNT，黑键位置 = (whiteIdx + 1) * whiteWidth - blackHalfWidth
          const whiteWidthPct = 100 / WHITE_COUNT
          const leftPct = (whiteIdx + 1) * whiteWidthPct
          const isPressed = pressedId === key.id

          return (
            <button
              key={key.id}
              type="button"
              onPointerDown={() => onKeyClick?.(key.id)}
              className={cn(
                'piano-black-key absolute h-full rounded-b-md border border-b-4 border-gray-900',
                'flex flex-col items-center justify-end pb-2 pointer-events-auto',
                'transition-all duration-75 active:scale-y-90',
                'shadow-lg',
                isPressed && 'key-pressed-black scale-y-90 translate-y-[2px] shadow-inner',
              )}
              style={{
                left: `calc(${leftPct}% - ${whiteWidthPct * 0.3}%)`,
                width: `${whiteWidthPct * 0.6}%`,
                background: isPressed
                  ? 'linear-gradient(180deg, #b45309 0%, #f59e0b 100%)'
                  : 'linear-gradient(180deg, #1f2937 0%, #0f172a 100%)',
                borderBottomColor: '#000',
              }}
            >
              <span className="text-[10px] font-bold text-gray-300">
                {key.keyboardChar ? key.keyboardChar.toUpperCase() : ''}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
