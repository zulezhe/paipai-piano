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
  /** 对应的物理键盘字符 (小写)；低/高扩展八度无物理键，为 null（仅鼠标点击） */
  keyboardChar: string | null
  /** 采样文件名 (不带扩展名) */
  sample: string
  /** 白键索引，黑键为 -1 */
  whiteIndex: number
  /** 显示标签 */
  label: string
}

// 计算 12 平均律频率: freq = 440 * 2^((n-69)/12)，n 是 MIDI 音符号
// C4 = MIDI 60, Cs4 = 61, ... C6 = 84
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// 生成一个八度的音符定义 (C..B)
// octaveMidi: 该八度 C 的 MIDI 号 (如 C4=60)；chars: 12 个键的物理字符，null 表示无物理键
function octaveDefs(octaveMidi: number, chars: Array<string | null>): Array<[string, number, NoteColor, string | null]> {
  const names = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']
  const colors: NoteColor[] = ['white', 'black', 'white', 'black', 'white', 'white', 'black', 'white', 'black', 'white', 'black', 'white']
  return names.map((name, i) => {
    const midi = octaveMidi + i
    const octaveNum = Math.floor(midi / 12) - 1 // MIDI 60 -> C4
    return [`${name}${octaveNum}`, midi, colors[i], chars[i]] as [string, number, NoteColor, string | null]
  })
}

// 构建 49 键表 (C3 .. B7，四个八度)
// 中间两八度 C4-C6 有物理键映射；C3/B3、C7/B7 仅鼠标/触摸点击
const NOTE_DEFS: Array<[string, number, NoteColor, string | null]> = [
  // 低八度 C3-B3：无物理键（鼠标点击）
  ...octaveDefs(48, [null, null, null, null, null, null, null, null, null, null, null, null]),
  // 八度 4 (z s x d c v g b h n j m) -> C4..B4
  ...octaveDefs(60, ['z', 's', 'x', 'd', 'c', 'v', 'g', 'b', 'h', 'n', 'j', 'm']),
  // 八度 5 (q 2 w 3 e t 6 y 7 u 8 i) -> C5..B5
  ...octaveDefs(72, ['q', '2', 'w', '3', 'e', 't', '6', 'y', '7', 'u', '8', 'i']),
  // C6 (o)
  ['C6', 84, 'white', 'o'] as [string, number, NoteColor, string | null],
  // 高八度 C7-B7：无物理键（鼠标点击）
  ...octaveDefs(96, [null, null, null, null, null, null, null, null, null, null, null, null]),
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

// 反向映射: 物理键盘字符 -> 音符 ID（仅含有物理键的音符）
export const KEY_CHAR_TO_NOTE: Record<string, string> = Object.fromEntries(
  PIANO_KEYS
    .filter(k => k.keyboardChar !== null)
    .map(k => [k.keyboardChar as string, k.id]),
)

// 反向映射: 音符 ID -> PianoKey
export const NOTE_TO_KEY: Record<string, PianoKey> = Object.fromEntries(
  PIANO_KEYS.map(k => [k.id, k]),
)
