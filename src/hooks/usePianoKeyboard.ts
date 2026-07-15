// 全局钢琴键盘监听：物理键盘 keydown -> 音符
// 忽略: e.repeat (长按只触发一次), Ctrl/Alt/Meta 组合 (那些已被 Rust 钩子拦截，这里二次保险)
import { useEffect } from 'react'
import { KEY_CHAR_TO_NOTE } from '../data/piano'
import { audioEngine } from '../audio/AudioEngine'
import { useAppState } from '../state/AppState'

export function usePianoKeyboard() {
  const { dispatch } = useAppState()

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      // 修饰键组合一律不弹琴（系统快捷键走 Rust 钩子）
      if (e.ctrlKey || e.altKey || e.metaKey) return
      // 长按重复不触发
      if (e.repeat) return

      const ch = e.key.toLowerCase()
      const noteId = KEY_CHAR_TO_NOTE[ch]
      if (!noteId) return

      // 播放音符
      audioEngine.playNote(noteId)
      // 派发状态：宝宝模式累加进度，教学模式由组件自行匹配游标推进
      dispatch({ type: 'PRESS_KEY', noteId, at: Date.now() })
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [dispatch])
}
