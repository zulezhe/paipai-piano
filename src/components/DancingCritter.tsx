// 常驻跳舞卡通（SVG 分部位动画，同一骨架 4 个形象轮换）
// 静止时完全不动；dancing（最近有按键）时弹跳 + 挥手 + 踢踏，头顶冒音符
// 形象由父组件按 cheerCount 轮换：小黄鸡/粉兔/灰猫/绿蛙
import { cn } from '../lib/utils'

export type CritterVariant = 'chick' | 'bunny' | 'cat' | 'frog'

interface Props {
  /** 热舞中（最近有按键） */
  dancing: boolean
  /** 形象 */
  variant: CritterVariant
  /** 按键累计数：奇偶交替切换舞步（律动版/疯狂版） */
  mood?: number
  className?: string
}

// 各形象配色与五官
const LOOKS: Record<CritterVariant, {
  body: string; bodyStroke: string; belly: string
  arm: string; armStroke: string; leg: string; legStroke: string
}> = {
  chick: { body: '#FFD93D', bodyStroke: '#E5B800', belly: '#FFE98A', arm: '#F2C200', armStroke: '#D4A000', leg: '#F5A623', legStroke: '#D48806' },
  bunny: { body: '#FFB3C1', bodyStroke: '#F08CA0', belly: '#FFDDE4', arm: '#F9A8B8', armStroke: '#E07890', leg: '#F9A8B8', legStroke: '#E07890' },
  cat: { body: '#A5B4FC', bodyStroke: '#818CF8', belly: '#E0E7FF', arm: '#93A3F8', armStroke: '#7284EC', leg: '#93A3F8', legStroke: '#7284EC' },
  frog: { body: '#86EFAC', bodyStroke: '#4ADE80', belly: '#DCFCE7', arm: '#6DE89B', armStroke: '#3EBE70', leg: '#6DE89B', legStroke: '#3EBE70' },
}

function Head({ variant }: { variant: CritterVariant }) {
  const look = LOOKS[variant]
  switch (variant) {
    case 'chick':
      return (
        <>
          {/* 呆毛 */}
          <path d="M100 66 q-4 -22 12 -26 q-16 -2 -20 14 q-2 8 8 12" fill={look.body} stroke={look.bodyStroke} strokeWidth="3" />
          {/* 眼睛 */}
          <g className="dc-eyes">
            <circle cx="75" cy="125" r="10" fill="#2d2d2d" />
            <circle cx="78.5" cy="121.5" r="3.2" fill="#fff" />
            <circle cx="125" cy="125" r="10" fill="#2d2d2d" />
            <circle cx="128.5" cy="121.5" r="3.2" fill="#fff" />
          </g>
          {/* 三角嘴 */}
          <g className="dc-beak">
            <polygon points="88,142 112,142 100,160" fill="#F5A623" stroke="#D48806" strokeWidth="3" strokeLinejoin="round" />
          </g>
        </>
      )
    case 'bunny':
      return (
        <>
          {/* 长耳朵 */}
          <g className="dc-ears">
            <ellipse cx="70" cy="52" rx="13" ry="34" fill={look.body} stroke={look.bodyStroke} strokeWidth="3" />
            <ellipse cx="70" cy="54" rx="6" ry="22" fill="#FF9FB4" />
            <ellipse cx="130" cy="52" rx="13" ry="34" fill={look.body} stroke={look.bodyStroke} strokeWidth="3" />
            <ellipse cx="130" cy="54" rx="6" ry="22" fill="#FF9FB4" />
          </g>
          <g className="dc-eyes">
            <circle cx="75" cy="125" r="10" fill="#2d2d2d" />
            <circle cx="78.5" cy="121.5" r="3.2" fill="#fff" />
            <circle cx="125" cy="125" r="10" fill="#2d2d2d" />
            <circle cx="128.5" cy="121.5" r="3.2" fill="#fff" />
          </g>
          {/* 兔嘴 + 门牙 */}
          <g className="dc-beak">
            <path d="M92 145 q8 8 16 0" fill="none" stroke="#D48806" strokeWidth="3" strokeLinecap="round" />
            <rect x="95" y="146" width="5" height="8" rx="1" fill="#fff" stroke="#ddd" strokeWidth="1" />
            <rect x="101" y="146" width="5" height="8" rx="1" fill="#fff" stroke="#ddd" strokeWidth="1" />
          </g>
        </>
      )
    case 'cat':
      return (
        <>
          {/* 三角耳 */}
          <g className="dc-ears">
            <polygon points="45,95 60,45 90,80" fill={look.body} stroke={look.bodyStroke} strokeWidth="3" strokeLinejoin="round" />
            <polygon points="65,80 71,60 82,76" fill="#FCC8D8" />
            <polygon points="155,95 140,45 110,80" fill={look.body} stroke={look.bodyStroke} strokeWidth="3" strokeLinejoin="round" />
            <polygon points="135,80 129,60 118,76" fill="#FCC8D8" />
          </g>
          <g className="dc-eyes">
            <circle cx="75" cy="125" r="10" fill="#2d2d2d" />
            <circle cx="78.5" cy="121.5" r="3.2" fill="#fff" />
            <circle cx="125" cy="125" r="10" fill="#2d2d2d" />
            <circle cx="128.5" cy="121.5" r="3.2" fill="#fff" />
          </g>
          {/* 猫嘴 w 形 + 胡须 */}
          <g className="dc-beak">
            <path d="M90 145 q5 7 10 0 q5 7 10 0" fill="none" stroke="#D48806" strokeWidth="3" strokeLinecap="round" />
            <path d="M60 138 h-22 M62 146 h-18 M140 138 h22 M138 146 h18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          </g>
        </>
      )
    case 'frog':
      return (
        <>
          {/* 凸眼（头顶两个带瞳孔的眼球） */}
          <g className="dc-ears">
            <circle cx="68" cy="82" r="16" fill="#fff" stroke={look.bodyStroke} strokeWidth="3" />
            <circle cx="68" cy="80" r="7" fill="#2d2d2d" />
            <circle cx="132" cy="82" r="16" fill="#fff" stroke={look.bodyStroke} strokeWidth="3" />
            <circle cx="132" cy="80" r="7" fill="#2d2d2d" />
          </g>
          {/* 脸上无普通眼，宽弧嘴 */}
          <g className="dc-beak">
            <path d="M75 145 q25 20 50 0" fill="none" stroke="#2E7D4F" strokeWidth="3.5" strokeLinecap="round" />
          </g>
          {/* 脸侧色斑 */}
          <ellipse cx="55" cy="130" rx="9" ry="6" fill="#4ADE80" opacity="0.5" />
          <ellipse cx="145" cy="130" rx="9" ry="6" fill="#4ADE80" opacity="0.5" />
        </>
      )
  }
}

export function DancingCritter({ dancing, variant, mood = 0, className }: Props) {
  const look = LOOKS[variant]
  // 按键奇偶切换两套舞步：律动版(慢摆) / 疯狂版(快跳)
  const moodClass = mood % 2 === 0 ? 'dc-groove' : 'dc-frenzy'

  return (
    <div className={cn('relative', className)}>
      {/* 头顶冒出的音符（仅热舞时） */}
      {dancing && (
        <>
          <span
            className="absolute -top-6 left-4 text-2xl pointer-events-none"
            style={{ animation: 'note-float 1.6s ease-out infinite' }}
          >
            🎵
          </span>
          <span
            className="absolute -top-2 right-6 text-xl pointer-events-none"
            style={{ animation: 'note-float 1.9s ease-out 0.5s infinite' }}
          >
            🎶
          </span>
        </>
      )}

      <svg
        viewBox="0 0 200 260"
        className={cn(
          'w-52 h-64 drop-shadow-lg dc-root',
          dancing && `dc-dancing ${moodClass}`,
        )}
      >
        {/* 腿 */}
        <g className="dc-leg dc-leg-l">
          <path d="M70 225 q-5 18 8 20 q10 1 10 -8" fill={look.leg} stroke={look.legStroke} strokeWidth="3" />
          <ellipse cx="80" cy="247" rx="16" ry="7" fill={look.leg} stroke={look.legStroke} strokeWidth="3" />
        </g>
        <g className="dc-leg dc-leg-r">
          <path d="M130 225 q5 18 -8 20 q-10 1 -10 -8" fill={look.leg} stroke={look.legStroke} strokeWidth="3" />
          <ellipse cx="120" cy="247" rx="16" ry="7" fill={look.leg} stroke={look.legStroke} strokeWidth="3" />
        </g>

        {/* 身体 */}
        <g className="dc-body">
          {/* 手臂 */}
          <g className="dc-arm dc-arm-l">
            <ellipse cx="38" cy="160" rx="14" ry="34" fill={look.arm} stroke={look.armStroke} strokeWidth="3" />
          </g>
          <g className="dc-arm dc-arm-r">
            <ellipse cx="162" cy="160" rx="14" ry="34" fill={look.arm} stroke={look.armStroke} strokeWidth="3" />
          </g>

          {/* 主体 */}
          <ellipse cx="100" cy="150" rx="72" ry="82" fill={look.body} stroke={look.bodyStroke} strokeWidth="4" />
          <ellipse cx="100" cy="180" rx="46" ry="50" fill={look.belly} />

          <Head variant={variant} />

          {/* 腮红（青蛙靠上，其余标准位） */}
          {variant !== 'frog' && (
            <>
              <ellipse cx="52" cy="150" rx="10" ry="6" fill="#FF9F9F" opacity="0.7" />
              <ellipse cx="148" cy="150" rx="10" ry="6" fill="#FF9F9F" opacity="0.7" />
            </>
          )}
        </g>
      </svg>
    </div>
  )
}
