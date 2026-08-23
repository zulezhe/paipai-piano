// 全局应用状态：使用 useReducer + Context，不引入第三方状态库
// 仅宝宝模式：能量条进度 + 按键记录 + 鼓励计数
import React, { createContext, useContext, useEffect, useReducer } from 'react'

export interface State {
  /** 能量条进度 0..100 */
  babyProgress: number
  /** 上次按键时间戳 (ms)，用于进度衰减计算 */
  babyLastPressAt: number
  /** 最近一次按键的音符 ID（用于视觉反馈） */
  lastPressedNote: string | null
  /** 最近一次按键时间戳（用于触发动画） */
  lastPressedAt: number
  /** 鼓励触发计数（每次进度满 +1，BabyMode 用这个 key 重置 Confetti） */
  cheerCount: number
}

type Action =
  | { type: 'PRESS_KEY'; noteId: string; at: number }
  | { type: 'RESET_BABY' }

const initialState: State = {
  babyProgress: 0,
  babyLastPressAt: 0,
  lastPressedNote: null,
  lastPressedAt: 0,
  cheerCount: 0,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PRESS_KEY': {
      // 进度条 +4，距上次 >3s 时先衰减
      let babyProgress = state.babyProgress
      const elapsed = state.babyLastPressAt > 0 ? action.at - state.babyLastPressAt : 0
      if (elapsed > 3000) {
        babyProgress = Math.max(0, babyProgress - Math.floor(elapsed / 3000) * 3)
      }
      // 进度未满时累加；满 100 触发鼓励，本次按键不再叠加
      if (babyProgress < 100) {
        babyProgress = Math.min(100, babyProgress + 4)
      }

      return {
        ...state,
        babyProgress,
        babyLastPressAt: action.at,
        lastPressedNote: action.noteId,
        lastPressedAt: action.at,
      }
    }

    case 'RESET_BABY':
      // 进度归零，鼓励计数 +1（用于触发新一轮动画）
      return {
        ...state,
        babyProgress: 0,
        babyLastPressAt: Date.now(),
        cheerCount: state.cheerCount + 1,
      }

    default:
      return state
  }
}

interface ContextValue {
  state: State
  dispatch: React.Dispatch<Action>
}

const AppStateContext = createContext<ContextValue | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // 进度到 100，触发鼓励并 4 秒后归零
  useEffect(() => {
    if (state.babyProgress >= 100) {
      const t = setTimeout(() => dispatch({ type: 'RESET_BABY' }), 4000)
      return () => clearTimeout(t)
    }
  }, [state.babyProgress])

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): ContextValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider')
  }
  return ctx
}
