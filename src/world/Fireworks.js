import * as THREE from 'three'

// 海河上空的烟花：每一发是一团点粒子，向外散开、受重力下坠、逐渐熄灭
export class Fireworks {
  constructor(scene, audio) {
    this.scene = scene
    this.audio = audio
    this.bursts = []
    this.timer = 0
    this.active = 0
    const c = document.createElement('canvas'); c.width = c.height = 32
    const x = c.getContext('2d')
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g; x.fillRect(0, 0, 32, 32)
    this.tex = new THREE.CanvasTexture(c)
  }
  start(seconds = 14) { this.active = seconds; this.timer = 0 }
  burst() {
    const N = 90
    const origin = new THREE.Vector3(-15 + Math.random() * 60, 26 + Math.random() * 14, -50 + Math.random() * 10)
    const palette = ['#ffd27a', '#ff7a6a', '#7ad9ff', '#c9a0ff', '#ffffff', '#9cff9c']
    const c1 = new THREE.Color(palette[Math.floor(Math.random() * palette.length)])
    const c2 = new THREE.Color(palette[Math.floor(Math.random() * palette.length)])
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = []
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(7 + Math.random() * 3)
      vel.push(v)
      pos.set([origin.x, origin.y, origin.z], i * 3)
      const c = i % 2 ? c1 : c2
      col.set([c.r, c.g, c.b], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const mat = new THREE.PointsMaterial({ size: 1.4, map: this.tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    this.scene.add(pts)
    this.bursts.push({ pts, vel, life: 0 })
    if (this.audio.ready) {
      this.audio.noiseBurst({ dur: 0.5, f: 300, vol: 0.18 })
      for (let i = 0; i < 6; i++) this.audio.noiseBurst({ dur: 0.05, type: 'highpass', f: 4000, vol: 0.05, at: 0.3 + Math.random() * 0.6 })
    }
  }
  update(dt) {
    if (this.active > 0) {
      this.active -= dt
      this.timer -= dt
      if (this.timer <= 0) { this.burst(); this.timer = 0.5 + Math.random() * 0.8 }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]
      b.life += dt
      const p = b.pts.geometry.attributes.position
      for (let k = 0; k < b.vel.length; k++) {
        const v = b.vel[k]
        v.multiplyScalar(1 - dt * 1.6); v.y -= dt * 3
        p.array[k * 3] += v.x * dt; p.array[k * 3 + 1] += v.y * dt; p.array[k * 3 + 2] += v.z * dt
      }
      p.needsUpdate = true
      b.pts.material.opacity = Math.max(0, 1 - b.life / 2.4)
      if (b.life > 2.4) { this.scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); this.bursts.splice(i, 1) }
    }
  }
}
