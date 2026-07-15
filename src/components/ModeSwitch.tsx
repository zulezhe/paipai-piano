// 模式切换器：右上角三个图标按钮
import { useAppState, Mode } from '../state/AppState'
import { cn } from '../lib/utils'

interface ModeDef {
  id: Mode
  icon: string
  label: string
}

const MODES: ModeDef[] = [
  { id: 'baby', icon: '🍼', label: '宝宝模式' },
  { id: 'teach', icon: '📚', label: '教学模式' },
  { id: 'pro', icon: '🎹', label: '大神模式' },
]

export function ModeSwitch() {
  const { state, dispatch } = useAppState()

  return (
    <div className="flex gap-2 bg-white/15 backdrop-blur-md rounded-full p-1.5 border border-white/20 shadow-lg">
      {MODES.map(m => {
        const active = state.mode === m.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => dispatch({ type: 'SET_MODE', mode: m.id })}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-bold transition-all',
              'flex items-center gap-2',
              active
                ? 'bg-white text-purple-600 shadow-md scale-105'
                : 'text-white/80 hover:bg-white/20',
            )}
          >
            <span className="text-lg">{m.icon}</span>
            <span className="hidden md:inline">{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}
