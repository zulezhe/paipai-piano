// 教学模式：曲目选择 + 高亮引导 + 按键匹配推进
import { useEffect, useMemo, useState } from 'react'
import { PianoKeyboard } from './PianoKeyboard'
import { Confetti } from './Confetti'
import { audioEngine } from '../audio/AudioEngine'
import { useAppState } from '../state/AppState'
import { SONGS, getSongById } from '../data/songs'
import { NOTE_TO_KEY } from '../data/piano'

export function TeachMode() {
  const { state, dispatch } = useAppState()
  const [showComplete, setShowComplete] = useState(false)

  const song = getSongById(state.teachSongId) ?? SONGS[0]
  const cursor = state.teachCursor
  const currentNote = song.notes[cursor]
  const isComplete = cursor >= song.notes.length

  // 监听最近一次按键，匹配当前音符则推进游标
  useEffect(() => {
    if (isComplete) return
    if (!state.lastPressedNote) return
    // 休止符 (note=null) 直接跳过
    if (currentNote?.note === null) {
      dispatch({ type: 'ADVANCE_CURSOR' })
      return
    }
    if (state.lastPressedNote === currentNote?.note) {
      dispatch({ type: 'ADVANCE_CURSOR' })
    }
  }, [state.lastPressedNote, state.lastPressedAt, currentNote, isComplete, dispatch])

  // 完成时显示彩纸 + 播放鼓励
  useEffect(() => {
    if (isComplete && !showComplete) {
      audioEngine.playCheer()
      setShowComplete(true)
    }
    if (!isComplete && showComplete) {
      setShowComplete(false)
    }
  }, [isComplete, showComplete])

  const handleChangeSong = (id: string) => {
    dispatch({ type: 'SET_SONG', songId: id })
  }

  const handleRestart = () => {
    dispatch({ type: 'RESET_CURSOR' })
  }

  // 高亮集合：当前音符
  const highlight = useMemo(() => {
    if (isComplete || !currentNote?.note) return new Set<string>()
    return new Set([currentNote.note])
  }, [currentNote, isComplete])

  // 下一个音符预览（小标记）
  const nextNote = !isComplete ? song.notes[cursor + 1] : null

  const handleKeyClick = (noteId: string) => {
    audioEngine.playNote(noteId)
    dispatch({ type: 'PRESS_KEY', noteId, at: Date.now() })
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 pb-8 pt-12">
        <div className="text-8xl mascot-celebrate">🎉</div>
        <h2 className="text-4xl font-extrabold text-white drop-shadow-lg">
          太厉害了！
        </h2>
        <p className="text-white/80 text-xl">你完成了《{song.title}》</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="px-6 py-3 rounded-full bg-white text-purple-600 font-bold shadow-lg hover:scale-105 transition-transform"
          >
            再来一次 ↻
          </button>
          <select
            value={song.id}
            onChange={(e) => handleChangeSong(e.target.value)}
            className="px-6 py-3 rounded-full bg-white text-purple-600 font-bold shadow-lg"
          >
            {SONGS.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
        <Confetti count={60} />
      </div>
    )
  }

  const pianoKey = currentNote?.note ? NOTE_TO_KEY[currentNote.note] : null

  return (
    <div className="flex flex-col items-center justify-start gap-6 pb-8 pt-4">
      {/* 顶部曲目选择 */}
      <div className="flex items-center gap-3">
        <span className="text-white/70 text-sm">曲目：</span>
        <select
          value={song.id}
          onChange={(e) => handleChangeSong(e.target.value)}
          className="px-4 py-2 rounded-full bg-white/90 text-purple-700 font-bold shadow-lg"
        >
          {SONGS.map(s => (
            <option key={s.id} value={s.id}>
              {'★'.repeat(s.difficulty)} {s.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleRestart}
          className="px-3 py-2 rounded-full bg-white/20 text-white text-sm hover:bg-white/30"
        >
          ↻ 重来
        </button>
      </div>

      {/* 当前音符大显示 */}
      <div className="flex items-center gap-8 bg-white/10 backdrop-blur-md rounded-3xl px-10 py-6 shadow-xl border border-white/20">
        <div className="text-center">
          <div className="text-white/60 text-xs uppercase tracking-widest mb-1">当前音符</div>
          {currentNote?.note ? (
            <>
              <div className="text-6xl font-extrabold text-yellow-300 drop-shadow animate-pulse">
                {currentNote.note}
              </div>
              {pianoKey && (
                <div className="text-white/80 mt-2 text-sm">
                  按键 <span className="font-bold text-white text-lg">
                    {pianoKey.keyboardChar.toUpperCase()}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-5xl font-bold text-white/60">休止</div>
          )}
        </div>
        {currentNote?.syllable && (
          <div className="text-center border-l border-white/20 pl-8">
            <div className="text-white/60 text-xs uppercase tracking-widest mb-1">唱</div>
            <div className="text-4xl text-pink-200 font-bold">
              {currentNote.syllable}
            </div>
          </div>
        )}
        <div className="text-center border-l border-white/20 pl-8">
          <div className="text-white/60 text-xs uppercase tracking-widest mb-1">进度</div>
          <div className="text-3xl text-white font-bold tabular-nums">
            {cursor + 1}<span className="text-white/50 text-xl"> / {song.notes.length}</span>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full max-w-3xl px-8">
        <div className="h-2 w-full rounded-full bg-black/30 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-200"
            style={{ width: `${(cursor / song.notes.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 钢琴键盘（带高亮） */}
      <PianoKeyboard
        theme="teach"
        highlight={highlight}
        onKeyClick={handleKeyClick}
        className="max-w-6xl"
      />

      {nextNote && (
        <div className="text-white/40 text-sm">
          下一个: <span className="text-white/70 font-bold">{nextNote.note ?? '休止'}</span>
        </div>
      )}
    </div>
  )
}
