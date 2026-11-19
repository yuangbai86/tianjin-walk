import * as THREE from 'three'
import { mat } from '../core/Materials.js'
import { createCharacter } from './Character.js'
import { DIALOGUES } from '../data/dialogues.js'

const tmpV = new THREE.Vector3()
function angleDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d }

// 人物外观与行为设定（替换模型时只需改这里）
const DEFS = [
  {
    id: 'jianbing', pos: [-28.85, -13], yaw: Math.PI / 2, mode: 'cook', range: 3.8,
    look: { skin: '#eebd96', top: '#f3efe6', bottom: '#4a5568', apron: '#3f6f9a', hat: 'chef', hairStyle: 'short', hairColor: '#2b2320', build: 1.15, height: 1.0 },
  },
  {
    id: 'fisher', pos: [-14, -25.0], yaw: Math.PI, mode: 'fish', seat: 0.43, range: 3.0,
    look: { skin: '#e8b48e', top: '#d9cfb8', bottom: '#5a5248', vest: '#6e7f5a', hat: 'bucket', hatColor: '#c9b27a', hairStyle: 'bald', hairColor: '#bdb6ac', browColor: '#9a948a', glasses: true, build: 1.05, height: 0.97 },
  },
  {
    id: 'guide', path: [[-20.3, 12.5], [-20.3, -8.5]], speed: 0.85, mode: 'walk', range: 3.0,
    look: { skin: '#f3cfae', top: '#e0796b', sleeve: '#e0796b', bottom: '#3d4f6a', hairStyle: 'ponytail', hairColor: '#2b2320', tie: '#f2c14e', build: 0.92, height: 0.98 },
  },
  {
    id: 'kuaiban', pos: [21.6, 9.6], yaw: -2.4, mode: 'clap', range: 3.2,
    look: { skin: '#e7b18a', top: '#f6f3ec', shortSleeve: true, vest: '#3b3f4a', bottom: '#34383f', hairStyle: 'bald', hairColor: '#cfcac2', browColor: '#a9a39a', build: 1.08, height: 1.0 },
  },
  {
    id: 'resident', bench: [8, -24.7], seatSide: -0.45, yaw: Math.PI, mode: 'fan', seat: 0.45, range: 3.0,
    look: { skin: '#f1c6a2', top: '#b0577a', bottom: '#4a4560', hairStyle: 'curly', hairColor: '#4a302a', build: 1.12, height: 0.95 },
  },
  {
    id: 'birdman', path: [[-15, 20.6], [10, 20.6]], speed: 0.7, mode: 'walk', range: 2.8, hold: 'cage',
    look: { skin: '#e9b58f', top: '#7d8a96', bottom: '#4a4a4a', hat: 'cap', hatColor: '#4f5a64', hairStyle: 'short', hairColor: '#9e9890', build: 1.0, height: 0.98 },
  },
]

export class NPCs {
  constructor(scene, world) {
    this.scene = scene
    this.world = world
    this.list = []
    this.byId = {}
    for (const d of DEFS) this.spawn(d)
    this.buildCat()
    this.buildPigeons()
  }

  spawn(d) {
    const ch = createCharacter(d.look)
    const npc = { def: d, id: d.id, ch, data: DIALOGUES[d.id], talking: false, pathIdx: 1, wait: 0, yaw: d.yaw ?? 0 }
    if (d.seat) ch.seatHeight = d.seat
    ch.mode = d.mode
    if (d.bench) {
      // 坐在长椅的一侧，并占用该座位
      const seat = this.world.seats.reduce((best, s) => {
        const dist = Math.hypot(s.pos.x - (d.bench[0] + d.seatSide * Math.cos(Math.PI)), s.pos.z - d.bench[1])
        return !best || dist < best.d ? { s, d: dist } : best
      }, null).s
      seat.occupied = true
      npc.seat = seat
      npc.pos = new THREE.Vector3(seat.pos.x, 0, seat.pos.z - 0.12)
      // 自己就坐在椅子上，不额外占用碰撞
    } else if (d.path) {
      npc.pos = new THREE.Vector3(d.path[0][0], 0, d.path[0][1])
    } else {
      npc.pos = new THREE.Vector3(d.pos[0], 0, d.pos[1])
    }
    ch.root.position.copy(npc.pos)
    ch.root.rotation.y = npc.yaw
    this.scene.add(ch.root)
    if (!d.bench) npc.collider = this.world.collision.addCircle(npc.pos.x, npc.pos.z, d.path ? 0.32 : 0.35)
    this.addProps(npc)
    this.list.push(npc)
    this.byId[d.id] = npc
    npc.interact = {
      id: 'npc-' + d.id, kind: 'npc', label: '聊两句', name: `${npc.data.title} · ${npc.data.name}`,
      pos: new THREE.Vector3(), range: d.range, radius: 0.55, npc,
    }
    if (d.path) {
      const [a, b] = d.path
      npc.yaw = Math.atan2(b[0] - a[0], b[1] - a[1])
    }
  }

  addProps(npc) {
    const { ch, id } = npc
    const hand = ch.arms[1].hand
    const handL = ch.arms[0].hand
    if (id === 'fisher') {
      // 鱼竿：挂在世界里，从手部伸向河面
      const rod = new THREE.Group()
      rod.position.set(npc.pos.x + 0.1, 0.85, npc.pos.z - 0.35)
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.02, 3.6, 4), mat('#6b4a2e'))
      pole.geometry.translate(0, 1.8, 0)
      pole.rotation.x = -1.05
      rod.add(pole)
      this.scene.add(rod)
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf6f0e0, transparent: true, opacity: 0.7 }))
      this.scene.add(line)
      const bob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), mat('#d0573f'))
      this.scene.add(bob)
      npc.rod = { rod, pole, line, bob, lift: 0 }
    }
    if (id === 'resident') {
      const fan = new THREE.Group(); hand.add(fan)
      const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.015, 12), mat('#d9b56a'))
      leaf.position.set(0, -0.22, 0.02); leaf.rotation.x = Math.PI / 2; fan.add(leaf)
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 4), mat('#8a6a3a')); h.position.y = -0.06; fan.add(h)
    }
    if (id === 'kuaiban') {
      for (const hh of [hand, handL]) {
        const g = new THREE.Group(); hh.add(g)
        for (let i = 0; i < 3; i++) {
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.012), mat('#b9894a'))
          b.position.set(0, -0.06, 0.03 + i * 0.016); g.add(b)
        }
      }
      npc.clack = 0
    }
    if (id === 'birdman') {
      ch.idleHold = 'cage'
      const cage = new THREE.Group(); hand.add(cage); cage.position.y = -0.25
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.3, 8, 1, true), mat('#c9a36a', { side: THREE.DoubleSide }))
      cage.add(c)
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.08, 8), mat('#a0714f')); top.position.y = 0.19; cage.add(top)
      const bird = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), mat('#f2c14e')); bird.position.y = -0.04; cage.add(bird)
      const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.04, 8), mat('#3f6f9a')); cover.position.y = -0.15; cage.add(cover)
    }
    if (id === 'guide') {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.08), mat('#f2c14e'))
      bag.position.set(-0.27, 0.15, 0.02); ch.torso.add(bag)
    }
  }

  // ───────── 小猫“馃子” ─────────
  buildCat() {
    const g = new THREE.Group()
    const orange = mat('#e9a25a', { flat: false }), white = mat('#fbf1e2', { flat: false }), dark = mat('#2a211d')
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), orange); body.scale.set(0.9, 1.0, 1.35); body.position.set(0, 0.2, -0.04); body.rotation.x = -0.5; g.add(body)
    const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), white); chest.position.set(0, 0.22, 0.1); g.add(chest)
    const head = new THREE.Group(); head.position.set(0, 0.4, 0.07); g.add(head)
    const hm = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), orange); hm.scale.set(1.1, 0.95, 1); head.add(hm)
    const muzzle = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 1), white); muzzle.position.set(0, -0.035, 0.09); muzzle.scale.set(1.2, 0.8, 0.8); head.add(muzzle)
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 4), orange); ear.position.set(s * 0.07, 0.11, 0); ear.rotation.z = -s * 0.25; head.add(ear)
      const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 0), dark); eye.position.set(s * 0.045, 0.015, 0.105); head.add(eye)
      const paw = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), white); paw.position.set(s * 0.06, 0.03, 0.12); paw.scale.set(1, 0.7, 1.4); g.add(paw)
    }
    const nose = new THREE.Mesh(new THREE.IcosahedronGeometry(0.014, 0), mat('#e07a7a')); nose.position.set(0, -0.01, 0.13); head.add(nose)
    const tail = new THREE.Group(); tail.position.set(0, 0.08, -0.22); g.add(tail)
    const segs = []
    let parent = tail
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Group(); s.position.z = i === 0 ? 0 : -0.07; parent.add(s)
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.08, 5), i === 4 ? white : orange); m.rotation.x = Math.PI / 2; m.position.z = -0.035; s.add(m)
      segs.push(s); parent = s
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true })
    g.position.set(23.6, 0, 23.0)
    g.rotation.y = Math.PI * 0.85
    this.scene.add(g)
    this.cat = { g, head, segs, hop: 0, pets: 0, roll: 0, baseYaw: g.rotation.y }
    this.world.collision.addCircle(23.6, 23.0, 0.28)
    // 爱心
    const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTexture(), transparent: true, depthWrite: false }))
    heart.scale.set(0.3, 0.3, 0.3); heart.visible = false
    this.scene.add(heart)
    this.cat.heart = heart
    this.cat.heartT = 0
    this.cat.interact = { id: 'cat', kind: 'cat', label: '跟小猫打招呼', name: '小猫 · 馃子', pos: new THREE.Vector3(23.6, 0.35, 23.0), range: 2.4, radius: 0.4 }
  }

  petCat() {
    const c = this.cat
    c.hop = 0.6
    c.pets++
    c.heartT = 1.6
    c.heart.visible = true
    if (c.pets % 3 === 0) c.roll = 2.2
    return c.pets
  }

  // ───────── 鸽子 ─────────
  buildPigeons() {
    this.pigeons = []
    const gray = mat('#9aa0a8', { flat: false }), dark = mat('#5d6470'), neck = mat('#6f8b84')
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group()
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), gray); b.scale.set(0.9, 0.85, 1.4); b.position.y = 0.11; g.add(b)
      const head = new THREE.Group(); head.position.set(0, 0.2, 0.1); g.add(head)
      const h = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), neck); head.add(h)
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4), mat('#d8b26a')); beak.rotation.x = Math.PI / 2; beak.position.z = 0.05; head.add(beak)
      const wings = []
      for (const s of [-1, 1]) {
        const w = new THREE.Group(); w.position.set(s * 0.07, 0.14, 0); g.add(w)
        const wm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.14), dark); wm.position.x = s * 0.08; w.add(wm)
        wings.push(w)
      }
      const home = new THREE.Vector3(26.5 + Math.cos(i * 2.1) * 1.5, 0, 6.5 + Math.sin(i * 2.1) * 1.3)
      g.position.copy(home)
      g.rotation.y = i * 1.3
      g.traverse((o) => { if (o.isMesh) o.castShadow = true })
      this.scene.add(g)
      this.pigeons.push({ g, head, wings, home, state: 'ground', v: new THREE.Vector3(), t: Math.random() * 5, away: 0 })
    }
  }

  interactables() {
    const out = this.list.map((n) => {
      n.interact.pos.set(n.ch.root.position.x, n.def.seat ? 1.1 : 1.45, n.ch.root.position.z)
      return n.interact
    })
    out.push(this.cat.interact)
    return out
  }

  startTalk(npc, playerPos) {
    npc.talking = true
    npc.prevMode = npc.ch.mode
    if (npc.def.path) npc.ch.mode = 'idle'
    if (npc.id === 'kuaiban') npc.ch.mode = 'idle'
    npc.ch.wave = 0.9
  }
  endTalk(npc) {
    npc.talking = false
    if (npc.def.path) npc.ch.mode = 'walk'
    else npc.ch.mode = npc.def.mode
    npc.performT = 0
  }
  perform(npc, seconds = 9) {
    npc.ch.mode = 'perform'
    npc.performT = seconds
  }

  update(dt, t, player, audio) {
    for (const npc of this.list) {
      const { ch, def } = npc
      const toP = tmpV.set(player.x - ch.root.position.x, 0, player.z - ch.root.position.z)
      const dist = toP.length()
      const angToPlayer = Math.atan2(toP.x, toP.z)
      // 行走
      let moving = false
      if (def.path && !npc.talking) {
        const target = def.path[npc.pathIdx]
        if (npc.wait > 0) {
          npc.wait -= dt
        } else if (dist < 1.4) {
          // 玩家挡路：停一下
        } else {
          const dx = target[0] - npc.pos.x, dz = target[1] - npc.pos.z
          const d = Math.hypot(dx, dz)
          if (d < 0.2) {
            npc.pathIdx = (npc.pathIdx + 1) % def.path.length
            npc.wait = 2.5 + Math.random() * 2
          } else {
            const desired = Math.atan2(dx, dz)
            npc.yaw += angleDiff(desired, npc.yaw) * Math.min(1, dt * 3)
            const step = Math.min(d, def.speed * dt)
            npc.pos.x += Math.sin(npc.yaw) * step
            npc.pos.z += Math.cos(npc.yaw) * step
            moving = true
          }
        }
      }
      if (npc.talking && (def.path || def.id === 'kuaiban')) {
        npc.yaw += angleDiff(angToPlayer, npc.yaw) * Math.min(1, dt * 4)
      }
      if (def.path) ch.mode = npc.talking ? (npc.performT > 0 ? 'perform' : 'idle') : (moving ? 'walk' : 'idle')
      ch.root.position.set(npc.pos.x, 0, npc.pos.z)
      ch.root.rotation.y = npc.yaw
      if (npc.collider) { npc.collider.x = npc.pos.x; npc.collider.z = npc.pos.z }
      // 转头看玩家（适度、限幅）
      const rel = angleDiff(angToPlayer, npc.yaw)
      if ((dist < 4.5 && Math.abs(rel) < 1.9) || npc.talking) {
        ch.headYawTarget = THREE.MathUtils.clamp(rel, -0.9, 0.9)
        const dy = (player.y ?? 1.65) - (def.seat ? 1.15 : 1.5)
        ch.headPitchTarget = THREE.MathUtils.clamp(-Math.atan2(dy, Math.max(dist, 0.5)) * 0.6, -0.3, 0.3)
      } else {
        ch.headYawTarget = moving ? 0 : Math.sin(t * 0.3 + npc.pos.x) * 0.25
        ch.headPitchTarget = 0
      }
      // 表演计时
      if (npc.performT > 0) {
        npc.performT -= dt
        if (npc.id === 'kuaiban') {
          npc.clack -= dt
          if (npc.clack <= 0) {
            const pattern = [0.22, 0.22, 0.44, 0.22, 0.22, 0.22, 0.44]
            npc.beat = ((npc.beat || 0) + 1) % pattern.length
            npc.clack = pattern[npc.beat]
            audio?.kuaiban(ch.root.position, npc.beat % 3 === 0)
          }
        }
        if (npc.performT <= 0) ch.mode = npc.talking ? 'idle' : def.mode
      } else if (npc.id === 'kuaiban' && !npc.talking) {
        // 平时轻轻练：偶尔打两下
        npc.clack -= dt
        if (npc.clack <= 0) { npc.clack = 0.5 + (Math.random() < 0.2 ? 2.5 : 0); if (dist < 12) audio?.kuaiban(ch.root.position, false, 0.35) }
      }
      ch.update(dt, def.speed || 0)
      if (npc.rod) this.updateRod(npc, dt, t)
    }
    this.updateCat(dt, t, player)
    this.updatePigeons(dt, t, player, audio)
  }

  updateRod(npc, dt, t) {
    const r = npc.rod
    if (Math.random() < dt * 0.05) r.lift = 1.5
    r.lift = Math.max(0, r.lift - dt)
    r.pole.rotation.x = -1.05 + Math.sin(t * 0.7) * 0.02 + Math.sin(Math.min(1, r.lift) * Math.PI) * 0.25
    r.rod.updateMatrixWorld(true)
    const tip = new THREE.Vector3(0, 3.6, 0).applyMatrix4(r.pole.matrixWorld)
    const bobPos = new THREE.Vector3(tip.x, -0.92 + Math.sin(t * 2) * 0.03, tip.z - 0.3)
    r.bob.position.copy(bobPos)
    const arr = r.line.geometry.attributes.position.array
    arr[0] = tip.x; arr[1] = tip.y; arr[2] = tip.z
    arr[3] = bobPos.x; arr[4] = bobPos.y + 0.03; arr[5] = bobPos.z
    r.line.geometry.attributes.position.needsUpdate = true
  }

  updateCat(dt, t, player) {
    const c = this.cat
    const dx = player.x - c.g.position.x, dz = player.z - c.g.position.z
    const d = Math.hypot(dx, dz)
    const near = d < 3.2
    const ang = angleDiff(Math.atan2(dx, dz), c.g.rotation.y)
    const target = near ? THREE.MathUtils.clamp(ang, -1.1, 1.1) : Math.sin(t * 0.4) * 0.4
    c.head.rotation.y += (target - c.head.rotation.y) * Math.min(1, dt * 5)
    c.head.rotation.z = near ? Math.sin(t * 1.5) * 0.15 : 0
    const swish = near ? 3.5 : 1.2
    c.segs.forEach((s, i) => { s.rotation.y = Math.sin(t * swish - i * 0.6) * 0.35; s.rotation.x = -0.25 })
    if (c.hop > 0) {
      c.hop -= dt
      c.g.position.y = Math.max(0, Math.sin((0.6 - c.hop) / 0.6 * Math.PI)) * 0.25
    } else c.g.position.y = 0
    if (c.roll > 0) {
      c.roll -= dt
      c.g.rotation.z = Math.sin(Math.min(1, (2.2 - c.roll) / 2.2) * Math.PI) * 1.4
    } else c.g.rotation.z = 0
    if (c.heartT > 0) {
      c.heartT -= dt
      c.heart.position.set(c.g.position.x, 0.75 + (1.6 - c.heartT) * 0.35, c.g.position.z)
      c.heart.material.opacity = Math.min(1, c.heartT)
      if (c.heartT <= 0) c.heart.visible = false
    }
  }

  updatePigeons(dt, t, player, audio) {
    let scared = false
    for (const p of this.pigeons) {
      p.t += dt
      const d = Math.hypot(player.x - p.g.position.x, player.z - p.g.position.z)
      if (p.state === 'ground') {
        p.head.rotation.x = Math.max(0, Math.sin(p.t * 3 + p.home.x)) * 0.9
        if (d < 2.6) {
          p.state = 'fly'
          const away = new THREE.Vector3(p.g.position.x - player.x, 0, p.g.position.z - player.z).normalize()
          p.v.set(away.x * 3 + (Math.random() - 0.5), 3.5 + Math.random(), away.z * 3 + (Math.random() - 0.5))
          p.g.rotation.y = Math.atan2(p.v.x, p.v.z)
          p.away = 10 + Math.random() * 4
          scared = true
        }
      } else if (p.state === 'fly') {
        p.away -= dt
        p.g.position.addScaledVector(p.v, dt)
        p.v.y = Math.max(p.v.y - dt * 0.5, 0.6)
        for (const [i, w] of p.wings.entries()) w.rotation.z = Math.sin(p.t * 30) * 0.9 * (i ? -1 : 1)
        if (p.away < 0) { p.state = 'return'; p.g.position.set(p.home.x + 6, 12, p.home.z - 6) }
      } else if (p.state === 'return') {
        const to = new THREE.Vector3().subVectors(p.home, p.g.position)
        const dd = to.length()
        if (dd < 0.1) { p.state = 'ground'; p.g.position.copy(p.home); for (const w of p.wings) w.rotation.z = 0; continue }
        if (Math.hypot(player.x - p.home.x, player.z - p.home.z) < 4) { p.away = 3; p.state = 'fly'; p.v.set(1, 1, -1); continue }
        p.g.position.addScaledVector(to.normalize(), Math.min(dd, dt * 4))
        p.g.rotation.y = Math.atan2(to.x, to.z)
        for (const [i, w] of p.wings.entries()) w.rotation.z = Math.sin(p.t * 22) * 0.7 * (i ? -1 : 1)
      }
    }
    if (scared) audio?.flutter(this.pigeons[0].g.position)
  }
}

function heartTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const x = c.getContext('2d')
  x.fillStyle = '#e8566b'
  x.beginPath()
  x.moveTo(32, 54)
  x.bezierCurveTo(4, 34, 8, 8, 32, 20)
  x.bezierCurveTo(56, 8, 60, 34, 32, 54)
  x.fill()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
