// 原创生成式背景音乐（WebAudio 实时合成，无音频文件）。
// D 宫五声音阶，80 BPM，古筝感的拨弦旋律 + 柔和铺底 + 低音 + 轻木鱼。
// 乐句为预写的原创短句，每轮随机组合并加入倚音/滑音/八度变化，听久了也不完全重复。

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
const SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83] // D E F# A B d e f# a b
const CH = {
  D: [50, 57, 62, 66], Bm: [47, 54, 59, 62], G: [43, 50, 55, 59], A: [45, 52, 57, 61],
  Fm: [42, 49, 54, 57], Em: [40, 47, 52, 55],
}
// [音阶序号 | null 休止, 时值（八分音符数）]，每句 4 小节 = 32 个八分
const PHRASES = {
  A: { chords: ['D', 'Bm', 'G', 'A'], notes: [[4, 2], [5, 1], [4, 1], [3, 2], [2, 2], [3, 3], [2, 1], [1, 4], [0, 2], [1, 1], [2, 1], [3, 2], [5, 2], [4, 6], [null, 2]] },
  B: { chords: ['G', 'A', 'Fm', 'Bm'], notes: [[5, 2], [6, 2], [7, 2], [6, 1], [5, 1], [4, 3], [5, 1], [3, 4], [2, 2], [3, 2], [4, 1], [3, 1], [2, 2], [1, 2], [0, 2], [1, 4]] },
  C: { chords: ['G', 'A', 'D', 'D'], notes: [[3, 2], [2, 1], [3, 1], [5, 2], [4, 2], [3, 2], [2, 2], [1, 2], [2, 2], [3, 1], [2, 1], [1, 2], [0, 2], [1, 2], [0, 8]] },
  D: { chords: ['Em', 'A', 'Bm', 'G'], notes: [[null, 2], [7, 2], [6, 2], [5, 2], [6, 4], [4, 4], [null, 2], [5, 2], [4, 2], [3, 2], [4, 8]] },
  E: { chords: ['D', 'G', 'D', 'A'], notes: [[0, 1], [1, 1], [2, 2], [4, 2], [2, 2], [3, 2], [5, 2], [4, 4], [5, 1], [4, 1], [3, 2], [2, 2], [1, 2], [2, 4], [null, 4]] },
}
const FORMS = [['A', 'B', 'A', 'C'], ['E', 'D', 'B', 'C'], ['A', 'D', 'E', 'C']]

export class Music {
  constructor(audio) {
    this.audio = audio
    this.enabled = true
    this.volume = 0.45
    this.duck = 1
    this.started = false
  }
  get ctx() { return this.audio.ctx }

  start() {
    if (this.started || !this.ctx) return
    this.started = true
    const ctx = this.ctx
    this.bus = ctx.createGain()
    this.bus.gain.value = 0
    // 轻微混响：多抽头延迟 + 低通，营造“街上远远飘来”的空间感
    const dry = ctx.createGain(); dry.gain.value = 0.8
    const wet = ctx.createGain(); wet.gain.value = 0.28
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400
    const fb = ctx.createGain(); fb.gain.value = 0.35
    const d1 = ctx.createDelay(1); d1.delayTime.value = 0.29
    const d2 = ctx.createDelay(1); d2.delayTime.value = 0.41
    this.input = ctx.createGain()
    this.input.connect(dry); dry.connect(this.bus)
    this.input.connect(d1); this.input.connect(d2)
    d1.connect(lp); d2.connect(lp); lp.connect(fb); fb.connect(d1); lp.connect(wet); wet.connect(this.bus)
    this.bus.connect(this.audio.master)
    this.applyGain(4)
    this.eighth = 60 / 80 / 2
    this.nextTime = ctx.currentTime + 0.5
    this.formIdx = 0; this.phraseIdx = 0
    this.queuePhrase()
    this.timer = setInterval(() => this.schedule(), 60)
  }

  applyGain(fade = 0.5) {
    if (!this.bus) return
    const v = this.enabled ? this.volume * this.duck * 0.55 : 0
    this.bus.gain.cancelScheduledValues(this.ctx.currentTime)
    this.bus.gain.setTargetAtTime(v, this.ctx.currentTime, fade / 3)
  }
  setEnabled(on) { this.enabled = on; if (on && !this.started) this.start(); this.applyGain(1) }
  setVolume(v) { this.volume = v; this.applyGain(0.3) }
  setDuck(d) { if (Math.abs(d - this.duck) > 0.01) { this.duck = d; this.applyGain(0.8) } }

  queuePhrase() {
    const form = FORMS[this.formIdx % FORMS.length]
    const key = form[this.phraseIdx]
    this.phrase = PHRASES[key]
    this.noteIdx = 0
    this.phraseStart = this.nextTime
    this.octave = Math.random() < 0.2 && key !== 'C' ? 1 : 0
    this.sparse = Math.random() < 0.15 // 偶尔只留铺底，让耳朵歇会儿
    // 和声与低音一次排好整句
    this.phrase.chords.forEach((c, bar) => {
      const t = this.phraseStart + bar * 8 * this.eighth
      this.pad(CH[c], t, 8 * this.eighth)
      this.bass(CH[c][0], t, 3 * this.eighth)
      this.bass(CH[c][0] + (Math.random() < 0.5 ? 7 : 12), t + 4 * this.eighth, 2.5 * this.eighth, 0.6)
      for (const beat of [2, 6]) if (Math.random() < 0.85) this.wood(t + beat * this.eighth, beat === 6 ? 0.7 : 1)
      if (Math.random() < 0.35) this.wood(t + 7 * this.eighth, 0.45)
      // 分解和弦点缀（拨弦）
      if (!this.sparse || bar % 2 === 0) for (let k = 0; k < 4; k++) if (Math.random() < 0.55) this.pluck(mtof(CH[c][1 + (k % 3)] + 12), t + (k * 2 + 1) * this.eighth, 0.035, 1.6)
    })
  }

  schedule() {
    if (!this.ctx) return
    const ahead = this.ctx.currentTime + 0.35
    while (this.nextTime < ahead) {
      const [deg, len] = this.phrase.notes[this.noteIdx]
      if (deg !== null && !this.sparse) {
        const midi = SCALE[Math.min(SCALE.length - 1, deg + (this.octave ? 5 : 0))] ?? SCALE[deg]
        const f = mtof(midi)
        const dur = len * this.eighth
        // 倚音：长音前偶尔加一个上方邻音的快速装饰
        if (len >= 2 && Math.random() < 0.22) {
          const g = mtof(SCALE[Math.min(SCALE.length - 1, deg + 1)])
          this.pluck(g, this.nextTime - 0.07, 0.06, 0.3)
        }
        this.pluck(f, this.nextTime, 0.11, Math.max(0.8, dur * 1.6), len >= 4 && Math.random() < 0.4)
      }
      this.nextTime += len * this.eighth
      this.noteIdx++
      if (this.noteIdx >= this.phrase.notes.length) {
        this.phraseIdx++
        if (this.phraseIdx >= 4) { this.phraseIdx = 0; this.formIdx++ }
        this.queuePhrase()
      }
    }
  }

  // ── 乐器 ──
  pluck(f, t, vol, dur, bend = false) {
    const ctx = this.ctx
    if (t < ctx.currentTime) t = ctx.currentTime + 0.01
    const o1 = ctx.createOscillator(); o1.type = 'triangle'
    const o2 = ctx.createOscillator(); o2.type = 'sine'
    o1.frequency.setValueAtTime(bend ? f * 0.94 : f, t)
    if (bend) o1.frequency.exponentialRampToValueAtTime(f, t + 0.12) // 滑音
    // 揉弦
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.4)
    lfo.connect(lg); lg.connect(o1.frequency)
    o2.frequency.value = f * 2
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'
    lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(1100, t + 0.35)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(vol * 0.5, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    o1.connect(lp); lp.connect(g); o2.connect(g2); g2.connect(this.input); g.connect(this.input)
    o1.start(t); o2.start(t); lfo.start(t)
    o1.stop(t + dur + 0.1); o2.stop(t + 0.3); lfo.stop(t + dur + 0.1)
  }
  pad(chord, t, dur) {
    const ctx = this.ctx
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.3
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.022, t + 0.9); g.gain.setValueAtTime(0.022, t + dur - 0.4); g.gain.linearRampToValueAtTime(0, t + dur + 0.6)
    lp.connect(g); g.connect(this.input)
    for (const m of chord.slice(1)) for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det
      o.connect(lp); o.start(t); o.stop(t + dur + 0.7)
    }
  }
  bass(m, t, dur, k = 1) {
    const ctx = this.ctx
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m - 12 < 30 ? m : m - 12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * k, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(this.input); o.start(t); o.stop(t + dur + 0.05)
  }
  wood(t, k = 1) {
    const ctx = this.ctx
    const o = ctx.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(1250, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.05)
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 4
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * k, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    o.connect(bp); bp.connect(g); g.connect(this.input); o.start(t); o.stop(t + 0.12)
  }
}
