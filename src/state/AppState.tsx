// 全局应用状态：使用 useReducer + Context，不引入第三方状态库
import React, { createContext, useContext, useEffect, useReducer } from 'react'

export type Mode = 'baby' | 'teach' | 'pro'

export interface State {
  /** 当前模式 */
  mode: Mode
  /** 宝宝模式进度条 0..100 */
  babyProgress: number
  /** 上次按键时间戳 (ms)，用于进度衰减计算 */
  babyLastPressAt: number
  /** 教学模式当前曲目 ID */
  teachSongId: string | null
  /** 教学模式当前音符索引 */
  teachCursor: number
  /** 最近一次按键的音符 ID（用于教学匹配检测、视觉反馈） */
  lastPressedNote: string | null
  /** 最近一次按键时间戳（用于触发动画） */
  lastPressedAt: number
  /** 鼓励触发计数（每次宝宝进度满 +1，BabyMode 用这个 key 重置 Confetti） */
  cheerCount: number
}

type Action =
  | { type: 'PRESS_KEY'; noteId: string; at: number }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_SONG'; songId: string }
  | { type: 'ADVANCE_CURSOR' }
  | { type: 'RESET_CURSOR' }
  | { type: 'RESET_BABY' }

const initialState: State = {
  mode: 'baby',
  babyProgress: 0,
  babyLastPressAt: 0,
  teachSongId: null,
  teachCursor: 0,
  lastPressedNote: null,
  lastPressedAt: 0,
  cheerCount: 0,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PRESS_KEY': {
      // 宝宝模式：进度条 +4，距上次 >3s 时先衰减
      let babyProgress = state.babyProgress
      let babyLastPressAt = state.babyLastPressAt
      if (state.mode === 'baby') {
        const elapsed = babyLastPressAt > 0 ? action.at - babyLastPressAt : 0
        if (elapsed > 3000) {
          babyProgress = Math.max(0, babyProgress - Math.floor(elapsed / 3000) * 3)
        }
        // 进度未满时累加；满 100 触发鼓励，本次按键不再叠加
        if (babyProgress < 100) {
          babyProgress = Math.min(100, babyProgress + 4)
        }
        babyLastPressAt = action.at
      }

      // 教学模式：匹配当前音符则推进游标（不匹配不惩罚）
      let teachCursor = state.teachCursor
      // teachCursor 推进在 TeachMode 组件内通过 ADVANCE_CURSOR action 处理

      return {
        ...state,
        babyProgress,
        babyLastPressAt,
        teachCursor,
        lastPressedNote: action.noteId,
        lastPressedAt: action.at,
      }
    }

    case 'SET_MODE':
      return { ...state, mode: action.mode }

    case 'SET_SONG':
      return { ...state, teachSongId: action.songId, teachCursor: 0 }

    case 'ADVANCE_CURSOR':
      return { ...state, teachCursor: state.teachCursor + 1 }

    case 'RESET_CURSOR':
      return { ...state, teachCursor: 0 }

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

  // 当宝宝进度到 100，触发鼓励并 4 秒后归零
  useEffect(() => {
    if (state.mode === 'baby' && state.babyProgress >= 100) {
      const t = setTimeout(() => dispatch({ type: 'RESET_BABY' }), 4000)
      return () => clearTimeout(t)
    }
  }, [state.mode, state.babyProgress])

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
