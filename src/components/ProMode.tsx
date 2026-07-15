// 大神模式：自由弹奏 25 键，无引导，无进度
import { PianoKeyboard } from './PianoKeyboard'
import { audioEngine } from '../audio/AudioEngine'

export function ProMode() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 pb-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white drop-shadow-lg">大神模式</h2>
        <p className="text-white/80 mt-2">自由弹奏，键盘或鼠标都可</p>
      </div>
      <PianoKeyboard
        theme="pro"
        onKeyClick={(id) => audioEngine.playNote(id)}
        className="max-w-6xl"
      />
    </div>
  )
}
