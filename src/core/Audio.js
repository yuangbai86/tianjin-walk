// 全部声音由 WebAudio 实时合成，不依赖音频文件，因此不会出现缺失资源。
// 声音只在用户主动点击后初始化；可静音、可调音量；空间声随距离衰减并做左右声像。
export class Audio {
  constructor() {
    this.ctx = null
    this.enabled = true
    this.volume = 0.7
    this.listener = { x: 0, z: 0, yaw: 0 }
    this.stepFlip = false
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    try { this.ctx = new AC() } catch (e) { return }
    const ctx = this.ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.enabled ? this.volume : 0
    this.master.connect(ctx.destination)
    // 噪声缓冲
    const len = ctx.sampleRate * 2
    this.white = ctx.createBuffer(1, len, ctx.sampleRate)
    const w = this.white.getChannelData(0)
    for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate)
    const b = this.brown.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5 }
    // 环境循环：河水、风、煎饼摊滋滋声
    this.river = this.loop(this.brown, [{ type: 'lowpass', f: 700 }], 0)
    this.wind = this.loop(this.white, [{ type: 'bandpass', f: 380, q: 0.5 }], 0)
    this.sizzle = this.loop(this.white, [{ type: 'highpass', f: 3500 }], 0, true)
  }

  loop(buffer, filters, gain, panned = false) {
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = buffer; src.loop = true
    src.playbackRate.value = 0.9 + Math.random() * 0.2
    let node = src
    for (const f of filters) {
      const bq = ctx.createBiquadFilter()
      bq.type = f.type; bq.frequency.value = f.f; if (f.q) bq.Q.value = f.q
      node.connect(bq); node = bq
    }
    const g = ctx.createGain(); g.gain.value = gain
    node.connect(g)
    let pan = null
    if (panned && ctx.createStereoPanner) { pan = ctx.createStereoPanner(); g.connect(pan); pan.connect(this.master) } else g.connect(this.master)
    src.start()
    return { src, g, pan }
  }

  setEnabled(on) {
    this.enabled = on
    if (this.master) this.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.05)
  }
  setVolume(v) {
    this.volume = v
    if (this.master && this.enabled) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }
  get ready() { return !!this.ctx && this.enabled }

  /** 计算一个点相对听者的增益与声像 */
  spatial(pos, ref = 4) {
    const dx = pos.x - this.listener.x, dz = pos.z - this.listener.z
    const d = Math.hypot(dx, dz)
    const gain = 1 / (1 + (d / ref) ** 2)
    // 听者朝向 (-sin yaw, -cos yaw)；右手方向 (cos yaw, -sin yaw)
    const right = Math.cos(this.listener.yaw) * dx - Math.sin(this.listener.yaw) * dz
    const pan = d > 0.01 ? Math.max(-1, Math.min(1, right / d)) * 0.8 : 0
    return { gain, pan, d }
  }

  update(dt, t, listener, env) {
    this.listener = listener
    if (!this.ctx) return
    // 偶尔的鸟叫（树多的地方）
    this.birdT = (this.birdT ?? 4) - dt
    if (this.birdT < 0) {
      this.birdT = 3 + Math.random() * 7
      const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 10
      this.chirp({ x: listener.x + Math.cos(a) * d, z: listener.z + Math.sin(a) * d })
    }
    const now = this.ctx.currentTime
    // 河水：距离河岸线 z=-26 越近越响
    const dr = Math.max(0, listener.z - (-26))
    const riverG = 0.22 / (1 + (dr / 7) ** 2) + 0.015
    this.river.g.gain.setTargetAtTime(riverG * (0.85 + Math.sin(t * 0.5) * 0.15), now, 0.3)
    this.wind.g.gain.setTargetAtTime(0.025 + 0.02 * Math.max(0, Math.sin(t * 0.13) * Math.sin(t * 0.31)) + (dr < 6 ? 0.02 : 0), now, 0.5)
    if (env.stall) {
      const s = this.spatial(env.stall, 3)
      this.sizzle.g.gain.setTargetAtTime(s.gain * 0.09 * (0.6 + Math.random() * 0.6), now, 0.05)
      if (this.sizzle.pan) this.sizzle.pan.pan.setTargetAtTime(s.pan, now, 0.1)
    }
  }

  // ───────── 一次性音效 ─────────
  out(pos, ref) {
    const ctx = this.ctx
    const g = ctx.createGain()
    if (pos && ctx.createStereoPanner) {
      const s = this.spatial(pos, ref)
      const p = ctx.createStereoPanner(); p.pan.value = s.pan
      g.connect(p); p.connect(this.master)
      return { g, k: s.gain }
    }
    g.connect(this.master)
    return { g, k: 1 }
  }
  noiseBurst({ dur = 0.06, type = 'lowpass', f = 900, q = 1, vol = 0.2, pos = null, ref = 4, at = 0 }) {
    if (!this.ready) return
    const ctx = this.ctx, t0 = ctx.currentTime + at
    const src = ctx.createBufferSource(); src.buffer = this.white
    const bq = ctx.createBiquadFilter(); bq.type = type; bq.frequency.value = f; bq.Q.value = q
    const { g, k } = this.out(pos, ref)
    if (k < 0.01) return
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(vol * k, t0 + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(bq); bq.connect(g)
    src.start(t0, Math.random() * 1.5, dur + 0.05)
  }
  tone({ f = 440, f2 = null, type = 'sine', dur = 0.2, vol = 0.15, at = 0, pos = null, ref = 6, attack = 0.005, filter = null }) {
    if (!this.ready) return
    const ctx = this.ctx, t0 = ctx.currentTime + at
    const o = ctx.createOscillator(); o.type = type
    o.frequency.setValueAtTime(f, t0)
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur)
    const { g, k } = this.out(pos, ref)
    if (k < 0.01) return
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(vol * k, t0 + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    if (filter) {
      const bq = ctx.createBiquadFilter(); bq.type = 'bandpass'; bq.frequency.value = filter; bq.Q.value = 2
      o.connect(bq); bq.connect(g)
    } else o.connect(g)
    o.start(t0); o.stop(t0 + dur + 0.05)
    return o
  }

  footstep(onBridge = false) {
    this.stepFlip = !this.stepFlip
    this.noiseBurst({ dur: 0.09, f: onBridge ? 1400 : 700 + (this.stepFlip ? 80 : 0), vol: 0.07 })
    this.tone({ f: onBridge ? 140 : 95, f2: 60, dur: 0.07, vol: 0.05 })
  }
  blip() { this.tone({ f: 740, f2: 880, type: 'triangle', dur: 0.09, vol: 0.06 }) }
  select() { this.tone({ f: 520, f2: 700, type: 'sine', dur: 0.12, vol: 0.08 }); this.tone({ f: 1040, type: 'sine', dur: 0.08, vol: 0.03, at: 0.04 }) }
  close() { this.tone({ f: 600, f2: 420, type: 'sine', dur: 0.12, vol: 0.06 }) }
  stamp() {
    this.tone({ f: 140, f2: 55, dur: 0.25, vol: 0.25 })
    this.noiseBurst({ dur: 0.08, f: 500, vol: 0.12 })
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.6, vol: 0.07, at: 0.12 + i * 0.07 }))
  }
  discover() { [587.33, 783.99].forEach((f, i) => this.tone({ f, type: 'sine', dur: 0.5, vol: 0.06, at: i * 0.09 })) }
  kuaiban(pos, accent = false, vol = 1) {
    this.noiseBurst({ dur: accent ? 0.05 : 0.035, type: 'bandpass', f: accent ? 2200 : 2800, q: 4, vol: (accent ? 0.5 : 0.32) * vol, pos, ref: 3.5 })
    this.tone({ f: accent ? 1500 : 1900, type: 'square', dur: 0.025, vol: 0.05 * vol, pos, ref: 3.5 })
  }
  meow(pos) {
    if (!this.ready) return
    const o = this.tone({ f: 520, f2: 480, type: 'sawtooth', dur: 0.65, vol: 0.12, pos, ref: 3, attack: 0.06, filter: 1100 })
    if (o) { const t0 = this.ctx.currentTime; o.frequency.setValueAtTime(500, t0); o.frequency.linearRampToValueAtTime(820, t0 + 0.22); o.frequency.linearRampToValueAtTime(560, t0 + 0.6) }
  }
  bell(pos) {
    for (const at of [0, 0.22]) {
      this.tone({ f: 2093, type: 'sine', dur: 0.9, vol: 0.12, at, pos, ref: 4 })
      this.tone({ f: 2637, type: 'sine', dur: 0.7, vol: 0.06, at, pos, ref: 4 })
      this.tone({ f: 5400, type: 'sine', dur: 0.2, vol: 0.02, at, pos, ref: 4 })
    }
  }
  chime() { [523.25, 659.25, 783.99, 880, 1046.5, 1318.5].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 1.2, vol: 0.06, at: i * 0.12 })) }
  flutter(pos) { for (let i = 0; i < 12; i++) this.noiseBurst({ dur: 0.04, f: 1200, type: 'bandpass', q: 1, vol: 0.12, pos, ref: 5, at: i * 0.045 }) }
  rustle(pos) { for (let i = 0; i < 4; i++) this.noiseBurst({ dur: 0.08, f: 4000, type: 'highpass', vol: 0.05, pos, at: i * 0.05 }) }
  sit() { this.noiseBurst({ dur: 0.12, f: 400, vol: 0.08 }) }
  neigh(pos) {
    if (!this.ready) return
    const o = this.tone({ f: 700, f2: 320, type: 'sawtooth', dur: 1.0, vol: 0.09, pos, ref: 4, attack: 0.05, filter: 900 })
    if (o) { const t0 = this.ctx.currentTime; for (let i = 0; i < 8; i++) o.frequency.setValueAtTime(700 - i * 45 + (i % 2) * 70, t0 + i * 0.1) }
    this.noiseBurst({ dur: 0.25, f: 600, vol: 0.12, pos, ref: 4, at: 1.0 })
  }
  chirp(pos) {
    const n = 2 + Math.floor(Math.random() * 3)
    const base = 2600 + Math.random() * 1400
    for (let i = 0; i < n; i++) this.tone({ f: base, f2: base * (1.3 + Math.random() * 0.3), type: 'sine', dur: 0.09, vol: 0.05, at: i * 0.13, pos, ref: 6 })
  }
}
