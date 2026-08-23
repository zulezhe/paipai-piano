// 全局钢琴键盘监听：物理按键 -> 音符
// 两条输入通道：
//  1. window keydown（浏览器/落地页，桌面端透传时也走这里）
//  2. Tauri kb-raw 事件（宝宝模式：Rust 钩子全吞按键后转发 vkCode，仅桌面端）
import { useEffect } from 'react'
import { KEY_CHAR_TO_NOTE } from '../data/piano'
import { audioEngine } from '../audio/AudioEngine'
import { useAppState } from '../state/AppState'

// Windows VK 码 -> 钢琴映射表的键字符
// 'A'-'Z' = 0x41-0x5A, '0'-'9' = 0x30-0x39（仅数字行，不含小键盘）
const MODIFIER_VKS = new Set([0x10, 0x11, 0x12, 0x5b, 0x5c, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5])

function vkToChar(vk: number): string | null {
  if (vk >= 0x41 && vk <= 0x5a) return String.fromCharCode(vk + 32) // A-Z -> a-z
  if (vk >= 0x30 && vk <= 0x39) return String.fromCharCode(vk) // 0-9
  return null
}

// 宝宝模式兜底音：C 大调五声音阶（怎么按都不刺耳），扩至 49 键音域
const PENTATONIC = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'E6', 'G6']

export function usePianoKeyboard() {
  const { dispatch } = useAppState()

  useEffect(() => {
    // Tauri kb-raw 通道：Rust 钩子吞掉所有按键后转发 vkCode（仅 keydown，无 repeat）
    // 纯浏览器（落地页）无此通道，跳过
    let disposed = false
    let unlistenFn: (() => void) | null = null
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/event').then(({ listen }) =>
        listen<number>('kb-raw', (event) => {
          const vk = event.payload
          if (MODIFIER_VKS.has(vk)) return // 修饰键吞掉不发声
          pressNote(vkToChar(vk), false)
        }),
      ).then((fn) => {
        if (disposed) fn()
        else unlistenFn = fn
      }).catch(() => { /* 非 Tauri 环境忽略 */ })
    }
    // 统一发音入口：修饰键组合一律不弹琴（锁定模式下修饰键也直接忽略）
    // 未映射到琴键的按键 → 随机五声音阶，兑现"随便按就有声"
    const pressNote = (ch: string | null, hasModifier: boolean) => {
      if (hasModifier) return
      const noteId = ch ? KEY_CHAR_TO_NOTE[ch] : undefined
      const finalNoteId = noteId
        ?? PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]
      audioEngine.playNote(finalNoteId)
      dispatch({ type: 'PRESS_KEY', noteId: finalNoteId, at: Date.now() })
    }

    const onKeydown = (e: KeyboardEvent) => {
      // 修饰键组合一律不弹琴（系统快捷键走 Rust 钩子）
      if (e.ctrlKey || e.altKey || e.metaKey) return
      // 长按重复不触发
      if (e.repeat) return
      pressNote(e.key.toLowerCase(), false)
    }

    window.addEventListener('keydown', onKeydown)
    return () => {
      window.removeEventListener('keydown', onKeydown)
      disposed = true
      unlistenFn?.()
    }
  }, [dispatch])
}
