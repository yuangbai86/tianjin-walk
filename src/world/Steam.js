import * as THREE from 'three'

function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const x = c.getContext('2d')
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g; x.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** 煎饼摊的蒸汽：一组循环上升、渐隐的精灵 */
export class Steam {
  constructor(scene, origin, count = 14) {
    this.origin = origin.clone()
    this.parts = []
    const tex = puffTexture()
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, color: 0xfff6ea })
      const s = new THREE.Sprite(m)
      scene.add(s)
      this.parts.push({ s, life: (i / count) * 2.6, max: 2.6 })
    }
    this.boost = 0
  }
  burst() { this.boost = 2.5 }
  update(dt) {
    this.boost = Math.max(0, this.boost - dt)
    const k = 1 + this.boost * 0.6
    for (const p of this.parts) {
      p.life += dt * k
      if (p.life > p.max) { p.life = 0; p.dx = (Math.random() - 0.5) * 0.3; p.dz = (Math.random() - 0.5) * 0.3 }
      const u = p.life / p.max
      p.s.position.set(this.origin.x + (p.dx || 0) * u + Math.sin(u * 5 + p.max) * 0.08, this.origin.y + u * 1.4, this.origin.z + (p.dz || 0) * u)
      const sc = 0.25 + u * 0.7
      p.s.scale.set(sc, sc, sc)
      p.s.material.opacity = Math.sin(u * Math.PI) * (0.32 + this.boost * 0.1)
    }
  }
}
