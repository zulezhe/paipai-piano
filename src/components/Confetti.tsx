// 彩纸飞溅：纯 DOM，~40 个 div，随机位置/颜色/旋转/速度
// 自带进入/退出动画，4 秒后由父组件卸载
import { useMemo } from 'react'

const COLORS = ['#fbbf24', '#fb7185', '#60a5fa', '#34d399', '#a78bfa', '#f472b6', '#facc15']
const EMOJIS = ['⭐', '🌟', '✨', '🎉', '🎊', '💫', '🎈', '🌈']

interface Piece {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  emoji: string
  rotateEnd: number
  drift: number
}

interface Props {
  /** 彩纸数量，默认 40 */
  count?: number
}

export function Confetti({ count = 40 }: Props) {
  // 用 useMemo 固定一次随机，避免重渲染抖动
  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 2.5 + Math.random() * 1.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      rotateEnd: 360 + Math.random() * 720,
      drift: (Math.random() - 0.5) * 200,
    }))
  }, [count])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute text-3xl"
          style={{
            left: `${p.left}%`,
            top: '-10%',
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
            // CSS 自定义属性供 keyframes 用
            ['--drift' as any]: `${p.drift}px`,
            ['--rotate-end' as any]: `${p.rotateEnd}deg`,
            filter: `drop-shadow(0 0 6px ${p.color}88)`,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  )
}
