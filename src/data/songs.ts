// 教学曲库：5 首儿歌，难度递增
// 音符序列采用简谱/五线谱标准旋律，全部在 C4-C6 范围内
// 难度 1: 单音轨，节奏简单；难度 2: 含跳进；难度 3: 节奏复杂或速度快

export interface SongNote {
  /** 音符 ID（与 piano.ts 对应），null 表示休止 */
  note: string | null
  /** 拍数 (1 = 四分音符) */
  beats: number
  /** 歌词/唱名音节，可选 */
  syllable?: string
}

export interface Song {
  id: string
  title: string
  difficulty: 1 | 2 | 3
  /** 每分钟节拍数 */
  bpm: number
  notes: SongNote[]
}

export const SONGS: Song[] = [
  {
    id: 'twinkle',
    title: '小星星',
    difficulty: 1,
    bpm: 100,
    notes: [
      { note: 'C4', beats: 1, syllable: '一' },
      { note: 'C4', beats: 1, syllable: '闪' },
      { note: 'G4', beats: 1, syllable: '一' },
      { note: 'G4', beats: 1, syllable: '闪' },
      { note: 'A4', beats: 1, syllable: '亮' },
      { note: 'A4', beats: 1, syllable: '晶' },
      { note: 'G4', beats: 2, syllable: '晶' },
      { note: 'F4', beats: 1, syllable: '满' },
      { note: 'F4', beats: 1, syllable: '天' },
      { note: 'E4', beats: 1, syllable: '都' },
      { note: 'E4', beats: 1, syllable: '是' },
      { note: 'D4', beats: 1, syllable: '小' },
      { note: 'D4', beats: 1, syllable: '星' },
      { note: 'C4', beats: 2, syllable: '星' },
    ],
  },
  {
    id: 'tigers',
    title: '两只老虎',
    difficulty: 1,
    bpm: 120,
    notes: [
      { note: 'C4', beats: 1, syllable: '两' },
      { note: 'D4', beats: 1, syllable: '只' },
      { note: 'E4', beats: 1, syllable: '老' },
      { note: 'C4', beats: 1, syllable: '虎' },
      { note: 'C4', beats: 1, syllable: '两' },
      { note: 'D4', beats: 1, syllable: '只' },
      { note: 'E4', beats: 1, syllable: '老' },
      { note: 'C4', beats: 1, syllable: '虎' },
      { note: 'E4', beats: 1, syllable: '跑' },
      { note: 'F4', beats: 1, syllable: '得' },
      { note: 'G4', beats: 2, syllable: '快' },
      { note: 'E4', beats: 1, syllable: '跑' },
      { note: 'F4', beats: 1, syllable: '得' },
      { note: 'G4', beats: 2, syllable: '快' },
    ],
  },
  {
    id: 'birthday',
    title: '生日快乐',
    difficulty: 2,
    bpm: 110,
    notes: [
      { note: 'C4', beats: 0.5, syllable: '祝' },
      { note: 'C4', beats: 0.5, syllable: '你' },
      { note: 'D4', beats: 1, syllable: '生' },
      { note: 'C4', beats: 1, syllable: '日' },
      { note: 'F4', beats: 1, syllable: '快' },
      { note: 'E4', beats: 2, syllable: '乐' },
      { note: 'C4', beats: 0.5, syllable: '祝' },
      { note: 'C4', beats: 0.5, syllable: '你' },
      { note: 'D4', beats: 1, syllable: '生' },
      { note: 'C4', beats: 1, syllable: '日' },
      { note: 'G4', beats: 1, syllable: '快' },
      { note: 'F4', beats: 2, syllable: '乐' },
    ],
  },
  {
    id: 'ode',
    title: '欢乐颂',
    difficulty: 2,
    bpm: 120,
    notes: [
      { note: 'E4', beats: 1, syllable: '欢' },
      { note: 'E4', beats: 1, syllable: '乐' },
      { note: 'F4', beats: 1, syllable: '女' },
      { note: 'G4', beats: 1, syllable: '神' },
      { note: 'G4', beats: 1, syllable: '圣' },
      { note: 'F4', beats: 1, syllable: '洁' },
      { note: 'E4', beats: 1, syllable: '美' },
      { note: 'D4', beats: 1, syllable: '丽' },
      { note: 'C4', beats: 1, syllable: '灿' },
      { note: 'C4', beats: 1, syllable: '烂' },
      { note: 'D4', beats: 1, syllable: '光' },
      { note: 'E4', beats: 1, syllable: '芒' },
      { note: 'E4', beats: 1.5, syllable: '照' },
      { note: 'D4', beats: 0.5, syllable: '大' },
      { note: 'D4', beats: 2, syllable: '地' },
    ],
  },
  {
    id: 'canon',
    title: '卡农 (简化版)',
    difficulty: 3,
    bpm: 90,
    notes: [
      // 帕海贝尔卡农主旋律简化，I-V-vi-III-IV-I-IV-V 进行
      { note: 'E4', beats: 1, syllable: 'D' },
      { note: 'D4', beats: 1, syllable: 'A' },
      { note: 'C4', beats: 1, syllable: 'B' },
      { note: 'D4', beats: 1, syllable: 'm' },
      { note: 'E4', beats: 1, syllable: 'E' },
      { note: 'F4', beats: 1, syllable: 'C' },
      { note: 'G4', beats: 1, syllable: '#' },
      { note: 'F4', beats: 1, syllable: 'm' },
      { note: 'E4', beats: 1, syllable: 'D' },
      { note: 'D4', beats: 1, syllable: 'E' },
      { note: 'C4', beats: 1, syllable: 'm' },
      { note: 'D4', beats: 1, syllable: 'A' },
      { note: 'E4', beats: 1, syllable: 'B' },
      { note: 'F4', beats: 1, syllable: 'm' },
      { note: 'G4', beats: 1, syllable: 'G' },
      { note: 'A4', beats: 1, syllable: 'A' },
      { note: 'G4', beats: 1, syllable: 'D' },
      { note: 'F4', beats: 1, syllable: '/' },
      { note: 'E4', beats: 1, syllable: 'D' },
      { note: 'D4', beats: 1, syllable: '终' },
      { note: 'C4', beats: 2, syllable: '止' },
    ],
  },
]

export function getSongById(id: string | null): Song | undefined {
  if (!id) return undefined
  return SONGS.find(s => s.id === id)
}
