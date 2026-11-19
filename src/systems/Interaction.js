import * as THREE from 'three'

const fwd = new THREE.Vector3()
const to = new THREE.Vector3()

/** 选择当前互动目标：距离内 + 视线朝向 + 无墙体遮挡；同时只选一个 */
export class Interaction {
  constructor(camera, collision) {
    this.camera = camera
    this.collision = collision
    this.current = null
  }
  pick(candidates, player) {
    this.camera.getWorldDirection(fwd)
    let best = null, bestScore = Infinity
    for (const c of candidates) {
      if (c.disabled) continue
      if (c.kind === 'bench' && !c.seats.some((s) => !s.occupied)) continue
      const dx = c.pos.x - player.x, dz = c.pos.z - player.z
      const d2 = Math.hypot(dx, dz)
      if (d2 > c.range) continue
      to.set(c.pos.x, c.pos.y, c.pos.z).sub(this.camera.position)
      const d = to.length()
      to.normalize()
      const ang = Math.acos(THREE.MathUtils.clamp(fwd.dot(to), -1, 1))
      const allowed = Math.min(0.6, Math.atan2(c.radius, Math.max(d, 0.3)) + 0.2)
      if (ang > allowed) continue
      if (this.collision.blocked(player.x, player.z, c.pos.x, c.pos.z)) continue
      const score = ang / allowed + d2 * 0.05
      if (score < bestScore) { bestScore = score; best = c }
    }
    this.current = best
    return best
  }
}
