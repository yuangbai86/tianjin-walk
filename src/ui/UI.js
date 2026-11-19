import { STAMPS, FRIEND_NPCS, ALL_DONE_LINE } from '../data/stamps.js'

const $ = (s) => document.querySelector(s)
const ICON_ON = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
const ICON_OFF = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'

export class UI {
  constructor(save, audio) {
    this.save = save
    this.audio = audio
    this.stack = []
    this.settingsCb = null
    this.closedCb = null
    this.promptKey = ''
    // 关闭按钮
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.closeTopModal()))
    document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) this.closeTopModal() }))
    $('#btn-restart').addEventListener('click', () => $('#confirm-restart').classList.remove('hidden'))
    $('#btn-restart-no').addEventListener('click', () => $('#confirm-restart').classList.add('hidden'))
    // 设置控件
    const s = save.data.settings
    const toggleSound = () => this.emitSetting('sound', !save.data.settings.sound)
    $('#btn-sound').addEventListener('click', (e) => { e.stopPropagation(); audio.init(); toggleSound() })
    $('#btn-title-sound').addEventListener('click', () => toggleSound())
    $('#set-sound').addEventListener('change', (e) => { audio.init(); this.emitSetting('sound', e.target.checked) })
    $('#set-volume').addEventListener('input', (e) => this.emitSetting('volume', parseFloat(e.target.value)))
    $('#set-music').addEventListener('change', (e) => this.emitSetting('music', e.target.checked))
    $('#set-music-volume').addEventListener('input', (e) => this.emitSetting('musicVolume', parseFloat(e.target.value)))
    $('#btn-title-music').addEventListener('click', () => this.emitSetting('music', !save.data.settings.music))
    $('#set-music-volume').value = s.musicVolume
    $('#set-sens').addEventListener('input', (e) => this.emitSetting('sensitivity', parseFloat(e.target.value)))
    $('#set-quality').addEventListener('change', (e) => this.emitSetting('quality', e.target.value))
    $('#set-volume').value = s.volume
    $('#set-sens').value = s.sensitivity
    $('#set-quality').value = s.quality
    this.syncSound()
  }
  onSettings(cb) { this.settingsCb = cb }
  onModalClosed(cb) { this.closedCb = cb }
  emitSetting(k, v) { this.settingsCb?.(k, v); if (k === 'sound' || k === 'music') this.syncSound() }
  syncSound() {
    const on = this.save.data.settings.sound
    $('#btn-sound').innerHTML = on ? ICON_ON : ICON_OFF
    $('#btn-sound').setAttribute('aria-pressed', String(on))
    $('#btn-title-sound').textContent = on ? '声音：开' : '声音：关'
    $('#set-sound').checked = on
    const mu = this.save.data.settings.music
    $('#btn-title-music').textContent = mu ? '音乐：开' : '音乐：关'
    $('#set-music').checked = mu
  }

  show(sel, on) { $(sel).classList.toggle('hidden', !on) }

  // ── 加载 ──
  loadProgress(p, label) {
    const bar = $('#load-bar')
    bar.classList.remove('indeterminate')
    bar.querySelector('i').style.width = Math.round(p * 100) + '%'
    if (label) $('#load-step').textContent = label + '……'
  }
  hideLoading() {
    const l = $('#loading')
    l.classList.add('fade')
    setTimeout(() => l.classList.add('hidden'), 900)
  }

  // ── HUD ──
  setLocation(name, flash = false) {
    const el = $('#hud-loc')
    if (el.textContent === name) return
    el.textContent = name
    if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash') }
  }
  hint(text) {
    const h = $('#hint')
    if (text) { h.textContent = text; h.classList.add('show') } else h.classList.remove('show')
  }
  prompt(p, isTouch) {
    const key = p ? p.verb + '|' + p.who : ''
    if (key === this.promptKey) return
    this.promptKey = key
    const el = $('#prompt')
    const act = $('#btn-act')
    $('#crosshair').classList.toggle('on', !!p)
    if (!p) { el.classList.remove('show'); act.classList.add('hidden'); return }
    el.querySelector('.verb').textContent = p.verb
    el.querySelector('.who').textContent = p.who
    el.classList.add('show')
    act.textContent = p.verb
    act.classList.remove('hidden')
  }
  resumeTip(t) { $('#resume-tip').textContent = t }

  toast(html, ms = 3600, raw = false) {
    const t = document.createElement('div')
    t.className = 'toast'
    t.innerHTML = raw ? html : `<span>${html}</span>`
    const box = $('#toasts')
    box.appendChild(t)
    while (box.children.length > 3) box.firstChild.remove()
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 420) }, ms)
  }
  stampToast(s) {
    this.toast(`<span class="seal" style="color:${s.color}">${s.name.slice(0, 2)}<br>${s.name.slice(2)}</span><span>盖上印章：<b>${s.name}</b></span>`, 4200, true)
  }

  refreshStamps(bump = false) {
    const d = this.save.data
    const got = STAMPS.filter((s) => d.stamps[s.id]).length
    $('#stamp-count').textContent = `${got}/3`
    if (bump) { const b = $('#btn-stamps'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump') }
    const friends = FRIEND_NPCS.filter((id) => d.talked[id]).length
    $('#stamp-list').innerHTML = STAMPS.map((s) => {
      let prog = ''
      if (s.id === 'friend') prog = `<em>已认识 ${friends}/5</em>`
      if (s.id === 'river') prog = `<em>小拱桥 ${d.flags.crossedBridge ? '✓' : '·'}　天津之眼 ${d.flags.sawEye ? '✓' : '·'}</em>`
      if (s.id === 'breakfast' && d.stamps.breakfast) prog = `<em>吃的是${d.flags.jianbingChoice === 'guobi' ? '馃箅儿' : '油条'}的</em>`
      return `<div class="stamp ${d.stamps[s.id] ? 'got' : ''}"><div class="seal" style="color:${s.color}">${s.name.slice(0, 2)}<br>${s.name.slice(2)}</div><div class="info"><b>${s.name}${d.stamps[s.id] ? ' · 已获得' : ''}</b><span>${s.how}</span>${prog}</div></div>`
    }).join('')
    const done = !!d.postcard
    $('#done-line').textContent = ALL_DONE_LINE
    this.show('#done-line', done)
    this.show('#btn-open-postcard', done)
    this.show('#btn-replay-finale', done)
  }

  // ── 收尾卡片 ──
  finale(data) {
    const el = $('#finale')
    if (!data) { el.classList.add('hidden'); return }
    $('#finale-line').textContent = data.line
    $('#finale-list').innerHTML = data.lines.map((l) => `<li>${l}</li>`).join('')
    $('#finale-seals').innerHTML = STAMPS.map((s) => `<span class="seal" style="color:${s.color}">${s.name.slice(0, 2)}<br>${s.name.slice(2)}</span>`).join('')
    el.classList.remove('hidden')
  }

  // ── 弹窗栈 ──
  openModal(sel) {
    const top = this.stack[this.stack.length - 1]
    if (top === sel) return
    if (top) $(top).classList.add('hidden')
    this.stack.push(sel)
    $(sel).classList.remove('hidden')
    $('#confirm-restart').classList.add('hidden')
  }
  closeTopModal() {
    const top = this.stack.pop()
    if (!top) return
    $(top).classList.add('hidden')
    const prev = this.stack[this.stack.length - 1]
    if (prev) $(prev).classList.remove('hidden')
    else this.closedCb?.()
  }
  closeAllModals() {
    for (const s of this.stack) $(s).classList.add('hidden')
    this.stack = []
  }
  modalOpen() { return this.stack.length > 0 }
}
