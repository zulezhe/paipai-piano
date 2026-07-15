// Web Audio 音频引擎：低延迟钢琴发声
// 优先使用真实采样 MP3 (Tauri resources)；采样缺失时回退到 OscillatorNode 合成
// 单例模式，整个应用共享一个 AudioContext
import { PIANO_KEYS } from '../data/piano'

const SAMPLE_BASE = 'samples'
const CHEER_FILES = ['applause', 'cheer', 'tada']

class AudioEngine {
  private ctx: AudioContext | null = null
  private noteBuffers = new Map<string, AudioBuffer>()
  private cheerBuffers: AudioBuffer[] = []
  private initPromise: Promise<void> | null = null
  private failedNotes = new Set<string>()

  /** 是否已初始化 */
  get isInitialized(): boolean {
    return this.ctx !== null && this.noteBuffers.size > 0
  }

  /** 初始化（在首次用户手势时调用，满足浏览器 autoplay 策略） */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this._doInit()
    return this.initPromise
  }

  private async _doInit(): Promise<void> {
    try {
      // 创建 AudioContext（用户手势触发后才允许）
      const Ctor = window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new Ctor()
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume()
      }

      // 尝试加载真实采样；任何失败都进入振荡器回退
      await this._loadSamples()
    } catch (e) {
      console.warn('[AudioEngine] init failed, will use oscillator fallback:', e)
      // 不抛出：保持 init 成功，运行时用振荡器回退
    }
  }

  private async _loadSamples(): Promise<void> {
    if (!this.ctx) return

    // 尝试动态导入 convertFileSrc（仅在 Tauri 环境可用）
    let convertFileSrc: ((path: string) => string) | null = null
    try {
      const mod = await import('@tauri-apps/api/core')
      convertFileSrc = mod.convertFileSrc
    } catch {
      convertFileSrc = null
    }

    // 并发加载所有音符采样
    const noteTasks = PIANO_KEYS.map(async (key) => {
      try {
        if (!convertFileSrc) throw new Error('convertFileSrc unavailable')
        const url = convertFileSrc(`${SAMPLE_BASE}/${key.sample}.mp3`)
        const buf = await this._fetchAndDecode(url)
        this.noteBuffers.set(key.id, buf)
      } catch (e) {
        // 标记失败，运行时用振荡器
        this.failedNotes.add(key.id)
        console.debug(`[AudioEngine] sample missing for ${key.id}, will use oscillator`)
      }
    })

    const cheerTasks = CHEER_FILES.map(async (name) => {
      try {
        if (!convertFileSrc) throw new Error('convertFileSrc unavailable')
        const url = convertFileSrc(`${SAMPLE_BASE}/_cheer/${name}.mp3`)
        const buf = await this._fetchAndDecode(url)
        this.cheerBuffers.push(buf)
      } catch (e) {
        console.debug(`[AudioEngine] cheer sample missing: ${name}`)
      }
    })

    await Promise.all([...noteTasks, ...cheerTasks])

    const loaded = this.noteBuffers.size
    const total = PIANO_KEYS.length
    console.log(`[AudioEngine] loaded ${loaded}/${total} note samples, ${this.cheerBuffers.length} cheers`)
    if (loaded === 0) {
      console.warn('[AudioEngine] no samples loaded - all notes will use oscillator fallback')
    }
  }

  private async _fetchAndDecode(url: string): Promise<AudioBuffer> {
    if (!this.ctx) throw new Error('no AudioContext')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`fetch ${url} status ${res.status}`)
    const arr = await res.arrayBuffer()
    // decodeAudioData 在新版 Chrome 支持 Promise 形式
    return await this.ctx.decodeAudioData(arr)
  }

  /** 恢复 AudioContext（窗口失焦后恢复播放） */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  /** 播放音符：优先用采样，回退振荡器 */
  playNote(noteId: string): void {
    if (!this.ctx) {
      // 未初始化（首次按键前没点击），同步触发 init
      void this.init()
      return
    }
    if (this.ctx.state === 'suspended') {
      void this.resume()
    }

    const buffer = this.noteBuffers.get(noteId)
    if (buffer) {
      this._playBuffer(buffer, 0.9)
    } else {
      this._playOscillator(noteId)
    }
  }

  /** 播放鼓励音效（随机选一个） */
  playCheer(): void {
    if (!this.ctx || this.cheerBuffers.length === 0) {
      // 没有采样就合成一段欢快的上行琶音作为回退
      this._playSyntheticCheer()
      return
    }
    if (this.ctx.state === 'suspended') {
      void this.resume()
    }
    const buf = this.cheerBuffers[Math.floor(Math.random() * this.cheerBuffers.length)]
    this._playBuffer(buf, 0.8)
  }

  private _playBuffer(buffer: AudioBuffer, gain: number): void {
    if (!this.ctx) return
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const g = this.ctx.createGain()
    g.gain.value = gain
    src.connect(g).connect(this.ctx.destination)
    src.start(0)
    // source 自动 GC，无需 stop
  }

  private _playOscillator(noteId: string): void {
    if (!this.ctx) return
    const key = PIANO_KEYS.find(k => k.id === noteId)
    if (!key) return
    const now = this.ctx.currentTime
    // 钢琴音色近似：基频 + 二次谐波，快速 ADSR
    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.value = key.freq
    osc2.type = 'sine'
    osc2.frequency.value = key.freq * 2  // 二次谐波

    const gain2 = this.ctx.createGain()
    gain2.gain.value = 0.3
    osc1.connect(gain)
    osc2.connect(gain2).connect(gain)
    gain.connect(this.ctx.destination)

    // ADSR：Attack 5ms, Decay 100ms, Sustain 0.3, Release 800ms
    const peak = 0.35
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(peak, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(peak * 0.3, now + 0.105)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 1.0)
    osc2.stop(now + 1.0)
  }

  /** 合成鼓励音效：上行琶音 C-E-G-C */
  private _playSyntheticCheer(): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5]  // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const start = now + i * 0.12
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.3, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
      osc.connect(gain).connect(this.ctx!.destination)
      osc.start(start)
      osc.stop(start + 0.45)
    })
  }
}

// 单例
export const audioEngine = new AudioEngine()
