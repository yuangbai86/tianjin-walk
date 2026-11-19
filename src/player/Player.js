import * as THREE from 'three'

const EYE = 1.65
const SIT_EYE = 1.32

export class Player {
  constructor(camera, world, input, audio) {
    this.camera = camera
    this.world = world
    this.input = input
    this.audio = audio
    this.camera.rotation.order = 'YXZ'
    this.pos = new THREE.Vector3()
    this.vel = new THREE.Vector2()
    this.yaw = 0
    this.pitch = 0
    this.sensitivity = 1
    this.radius = 0.32
    this.walkSpeed = 2.1
    this.speed = 0
    this.stepDist = 0
    this.seat = null
    this.y = EYE
    this.moved = 0
  }
  get x() { return this.pos.x }
  get z() { return this.pos.z }

  reset(spawn) {
    this.pos.set(spawn.x, 0, spawn.z)
    this.yaw = spawn.yaw
    this.pitch = 0
    this.vel.set(0, 0)
    this.seat = null
    this.y = EYE
    this.apply()
  }

  look(dx, dy) {
    const k = 0.0022 * this.sensitivity
    this.yaw -= dx * k
    this.pitch -= dy * k
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.25, 1.25)
  }

  sit(seat) {
    this.seat = seat
    seat.occupied = true
    this.vel.set(0, 0)
    this.yaw = seat.yaw
    this.pitch = -0.05
    this.audio.sit()
  }
  stand() {
    if (!this.seat) return
    const s = this.seat
    s.occupied = false
    this.seat = null
    this.pos.set(s.stand.x, 0, s.stand.z)
    this.world.collision.resolve(this.pos, this.radius)
    this.audio.sit()
  }

  /** 平滑把视线转向某点（如天津之眼）；玩家一动鼠标即取消 */
  lookToward(target, seconds = 1.2) {
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z
    const yaw = Math.atan2(-dx, -dz)
    let dy = yaw - this.yaw
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    const pitch = Math.atan2(target.y - this.y, Math.hypot(dx, dz))
    this.auto = { fromYaw: this.yaw, toYaw: this.yaw + dy, fromPitch: this.pitch, toPitch: THREE.MathUtils.clamp(pitch, -1.2, 1.2), t: 0, dur: seconds }
  }

  update(dt, canMove) {
    const l = this.input.consumeLook()
    if (canMove) this.look(l.x, l.y)
    if (this.auto) {
      if (Math.abs(l.x) + Math.abs(l.y) > 4) this.auto = null
      else {
        const a = this.auto
        a.t = Math.min(1, a.t + dt / a.dur)
        const e = a.t * a.t * (3 - 2 * a.t)
        this.yaw = a.fromYaw + (a.toYaw - a.fromYaw) * e
        this.pitch = a.fromPitch + (a.toPitch - a.fromPitch) * e
        if (a.t >= 1) this.auto = null
      }
    }
    if (this.seat) {
      this.speed = 0
      const target = this.seat.pos
      this.pos.x += (target.x - this.pos.x) * Math.min(1, dt * 8)
      this.pos.z += (target.z - this.pos.z) * Math.min(1, dt * 8)
      this.y += (SIT_EYE + 0.0 - this.y) * Math.min(1, dt * 6)
      this.apply()
      return
    }
    const mv = canMove ? this.input.moveVector() : { x: 0, y: 0, run: false }
    const sp = this.walkSpeed * (mv.run ? 1.6 : 1)
    // 世界方向：前 (-sin yaw, -cos yaw)，右 (cos yaw, -sin yaw)
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw)
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw)
    const tx = (fx * mv.y + rx * mv.x) * sp
    const tz = (fz * mv.y + rz * mv.x) * sp
    // 轻微加减速（不做强惯性）
    const k = 1 - Math.exp(-dt * 14)
    this.vel.x += (tx - this.vel.x) * k
    this.vel.y += (tz - this.vel.y) * k
    const ox = this.pos.x, oz = this.pos.z
    // 子步移动，低帧率时也不会穿过细栏杆
    const dist = Math.hypot(this.vel.x, this.vel.y) * dt
    const n = Math.max(1, Math.ceil(dist / 0.12))
    for (let i = 0; i < n; i++) {
      this.pos.x += this.vel.x * dt / n
      this.pos.z += this.vel.y * dt / n
      this.world.collision.resolve(this.pos, this.radius)
    }
    const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz)
    this.speed = moved / Math.max(dt, 1e-4)
    this.moved += moved
    // 脚步声
    this.stepDist += moved
    if (this.stepDist > 0.78) {
      this.stepDist = 0
      this.audio.footstep(this.world.groundHeight(this.pos.x, this.pos.z) > 0.05)
    }
    const gy = this.world.groundHeight(this.pos.x, this.pos.z)
    this.pos.y = gy
    this.y += (gy + EYE - this.y) * Math.min(1, dt * 12)
    this.apply()
  }

  apply() {
    this.camera.position.set(this.pos.x, this.y, this.pos.z)
    this.camera.rotation.set(this.pitch, this.yaw, 0)
  }
}
