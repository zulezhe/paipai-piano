// 钢琴键盘展示组件：15 个白键 + 10 个黑键叠加定位
// 主题: 'baby' (鲜艳) | 'teach' (突出高亮) | 'pro' (经典)
import { PIANO_KEYS } from '../data/piano'
import { cn } from '../lib/utils'

export type PianoTheme = 'baby' | 'teach' | 'pro'

interface Props {
  /** 高亮的音符集合 (教学模式当前音符) */
  highlight?: Set<string>
  /** 按键点击回调 */
  onKeyClick?: (noteId: string) => void
  /** 视觉主题 */
  theme?: PianoTheme
  /** 容器类名 */
  className?: string
}

const WHITE_COUNT = 15

export function PianoKeyboard({
  highlight,
  onKeyClick,
  theme = 'pro',
  className,
}: Props) {
  const whites = PIANO_KEYS.filter(k => k.color === 'white')
  const blacks = PIANO_KEYS.filter(k => k.color === 'black')

  return (
    <div
      className={cn(
        'relative w-full select-none',
        theme === 'baby' && 'piano-baby',
        theme === 'teach' && 'piano-teach',
        theme === 'pro' && 'piano-pro',
        className,
      )}
      style={{ height: '280px' }}
    >
      {/* 白键层：用 flex 平分宽度 */}
      <div className="absolute inset-0 flex gap-[2px]">
        {whites.map((key) => {
          const isHighlight = highlight?.has(key.id)
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
                isHighlight && 'ring-4 ring-pink-400 ring-offset-2 bg-pink-50',
              )}
              style={{
                background: isHighlight
                  ? 'linear-gradient(180deg, #fce7f3 0%, #fbcfe8 100%)'
                  : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                borderBottomColor: '#94a3b8',
              }}
            >
              <span className="text-xs font-bold text-gray-400">
                {key.keyboardChar.toUpperCase()}
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
          // Cs4 在 C4(0) 和 D4(1) 之间 -> whiteIndex 中点
          const prevWhite = PIANO_KEYS
            .filter(k => k.color === 'white' && PIANO_KEYS.indexOf(k) < PIANO_KEYS.indexOf(key))
            .pop()
          const whiteIdx = prevWhite?.whiteIndex ?? 0
          // 每个 白键宽度 = 100% / WHITE_COUNT，黑键位置 = (whiteIdx + 1) * whiteWidth - blackHalfWidth
          const whiteWidthPct = 100 / WHITE_COUNT
          const leftPct = (whiteIdx + 1) * whiteWidthPct
          const isHighlight = highlight?.has(key.id)

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
                isHighlight && 'ring-4 ring-yellow-400 ring-offset-1',
              )}
              style={{
                left: `calc(${leftPct}% - ${whiteWidthPct * 0.3}%)`,
                width: `${whiteWidthPct * 0.6}%`,
                background: isHighlight
                  ? 'linear-gradient(180deg, #7c2d12 0%, #b45309 100%)'
                  : 'linear-gradient(180deg, #1f2937 0%, #0f172a 100%)',
                borderBottomColor: '#000',
              }}
            >
              <span className="text-[10px] font-bold text-gray-300">
                {key.keyboardChar.toUpperCase()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
