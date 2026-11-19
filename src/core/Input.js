// 键盘、鼠标（Pointer Lock）、触摸（左摇杆 + 右侧拖动环顾）
export class Input {
  constructor(touchLayer, joystickEl) {
    this.keys = new Set()
    this.look = { x: 0, y: 0 }
    this.joy = { x: 0, y: 0 }
    this.handlers = {}
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
    this.touchLayer = touchLayer
    this.joystickEl = joystickEl
    this.knob = joystickEl.querySelector('.knob')
    this.joyId = null
    this.lookId = null
    this.touchEnabled = this.isTouch

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return
      const code = e.code
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault()
      if (!e.repeat) this.emit('key', code, e)
      this.keys.add(code)
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
    window.addEventListener('blur', () => this.clear())
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear() })
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) { this.look.x += e.movementX; this.look.y += e.movementY }
    })
    this.setupTouch()
  }
  on(name, fn) { (this.handlers[name] ||= []).push(fn) }
  emit(name, ...a) { for (const f of this.handlers[name] || []) f(...a) }
  clear() {
    this.keys.clear()
    this.look.x = this.look.y = 0
    this.joy.x = this.joy.y = 0
    this.joyId = this.lookId = null
    this.joystickEl.classList.remove('active')
    if (this.knob) this.knob.style.transform = 'translate(-50%, -50%)'
  }
  /** 键盘方向（x 右，y 前） */
  moveVector() {
    const k = this.keys
    let x = 0, y = 0
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1
    x += this.joy.x; y += this.joy.y
    const l = Math.hypot(x, y)
    if (l > 1) { x /= l; y /= l }
    return { x, y, run: k.has('ShiftLeft') || k.has('ShiftRight') }
  }
  consumeLook() { const l = { x: this.look.x, y: this.look.y }; this.look.x = this.look.y = 0; return l }

  setupTouch() {
    const layer = this.touchLayer
    const base = { x: 0, y: 0 }
    const R = 50
    const last = new Map()
    layer.addEventListener('pointerdown', (e) => {
      if (!this.touchEnabled || e.pointerType === 'mouse') return
      e.preventDefault()
      layer.setPointerCapture?.(e.pointerId)
      if (e.clientX < window.innerWidth * 0.42 && this.joyId === null) {
        this.joyId = e.pointerId
        base.x = e.clientX; base.y = e.clientY
        this.joystickEl.style.left = base.x + 'px'
        this.joystickEl.style.top = base.y + 'px'
        this.joystickEl.classList.add('active')
      } else if (this.lookId === null) {
        this.lookId = e.pointerId
        last.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }
    }, { passive: false })
    layer.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joyId) {
        let dx = e.clientX - base.x, dy = e.clientY - base.y
        const l = Math.hypot(dx, dy)
        if (l > R) { dx = dx / l * R; dy = dy / l * R }
        this.joy.x = dx / R; this.joy.y = -dy / R
        this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
      } else if (e.pointerId === this.lookId) {
        const p = last.get(e.pointerId)
        this.look.x += (e.clientX - p.x) * 2.2
        this.look.y += (e.clientY - p.y) * 2.2
        last.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }
    })
    const end = (e) => {
      if (e.pointerId === this.joyId) {
        this.joyId = null; this.joy.x = this.joy.y = 0
        this.joystickEl.classList.remove('active')
        this.knob.style.transform = 'translate(-50%, -50%)'
      }
      if (e.pointerId === this.lookId) { this.lookId = null; last.delete(e.pointerId) }
    }
    layer.addEventListener('pointerup', end)
    layer.addEventListener('pointercancel', end)
    layer.addEventListener('lostpointercapture', end)
  }
}
