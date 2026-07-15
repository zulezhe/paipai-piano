// 25 键钢琴映射表 (C4 - C6, 两个八度)
// 频率基于 A4=440Hz 等比数列计算 (12 平均律)

export type NoteColor = 'white' | 'black'

export interface PianoKey {
  /** 音符 ID，如 'C4', 'Cs4' (Cs 表示 C#) */
  id: string
  /** 频率 Hz，用于振荡器回退 */
  freq: number
  /** 白键还是黑键 */
  color: NoteColor
  /** 对应的物理键盘字符 (小写) */
  keyboardChar: string
  /** 采样文件名 (不带扩展名) */
  sample: string
  /** 白键索引 0..14，黑键为 -1 */
  whiteIndex: number
  /** 显示标签 */
  label: string
}

// 计算 12 平均律频率: freq = 440 * 2^((n-69)/12)，n 是 MIDI 音符号
// C4 = MIDI 60, Cs4 = 61, ... C6 = 84
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// 构建 25 键表 (C4 .. C6)
// 白键 15 个: C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6
// 黑键 10 个: Cs4 Ds4 Fs4 Gs4 As4 Cs5 Ds5 Fs5 Gs5 As5
const NOTE_DEFS: Array<[string, number, NoteColor, string]> = [
  // id, midi, color, keyboardChar
  ['C4', 60, 'white', 'z'],
  ['Cs4', 61, 'black', 's'],
  ['D4', 62, 'white', 'x'],
  ['Ds4', 63, 'black', 'd'],
  ['E4', 64, 'white', 'c'],
  ['F4', 65, 'white', 'v'],
  ['Fs4', 66, 'black', 'g'],
  ['G4', 67, 'white', 'b'],
  ['Gs4', 68, 'black', 'h'],
  ['A4', 69, 'white', 'n'],
  ['As4', 70, 'black', 'j'],
  ['B4', 71, 'white', 'm'],
  ['C5', 72, 'white', 'q'],
  ['Cs5', 73, 'black', '2'],
  ['D5', 74, 'white', 'w'],
  ['Ds5', 75, 'black', '3'],
  ['E5', 76, 'white', 'e'],
  ['F5', 77, 'white', 't'],
  ['Fs5', 78, 'black', '6'],
  ['G5', 79, 'white', 'y'],
  ['Gs5', 80, 'black', '7'],
  ['A5', 81, 'white', 'u'],
  ['As5', 82, 'black', '8'],
  ['B5', 83, 'white', 'i'],
  ['C6', 84, 'white', 'o'],
]

let whiteCounter = 0
export const PIANO_KEYS: PianoKey[] = NOTE_DEFS.map(([id, midi, color, keyboardChar]) => {
  const key: PianoKey = {
    id,
    freq: midiToFreq(midi),
    color,
    keyboardChar,
    sample: id,
    whiteIndex: color === 'white' ? whiteCounter++ : -1,
    label: id,
  }
  return key
})

// 反向映射: 物理键盘字符 -> 音符 ID
export const KEY_CHAR_TO_NOTE: Record<string, string> = Object.fromEntries(
  PIANO_KEYS.map(k => [k.keyboardChar, k.id]),
)

// 反向映射: 音符 ID -> PianoKey
export const NOTE_TO_KEY: Record<string, PianoKey> = Object.fromEntries(
  PIANO_KEYS.map(k => [k.id, k]),
)
