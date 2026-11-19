import * as THREE from 'three'
import { mat } from '../core/Materials.js'

const G = {
  head: new THREE.IcosahedronGeometry(0.22, 2),
  eye: new THREE.IcosahedronGeometry(0.028, 1),
  cheek: new THREE.IcosahedronGeometry(0.04, 1),
  nose: new THREE.IcosahedronGeometry(0.035, 1),
  hand: new THREE.IcosahedronGeometry(0.06, 1),
}
function m(geo, color, opts) {
  const mesh = new THREE.Mesh(geo, mat(color, opts))
  mesh.castShadow = true
  return mesh
}
function limb(len, r0, r1, color) {
  const g = new THREE.CylinderGeometry(r0, r1, len, 7)
  g.translate(0, -len / 2, 0)
  return m(g, color, { flat: false })
}

/**
 * 卡通人物。面朝本地 +z。
 * opts: skin, top, bottom, shoes, hair, hairColor, hairStyle, build, height, apron, hat, glasses, prop
 */
export function createCharacter(o = {}) {
  const skin = o.skin || '#f1c9a5'
  const H = o.height ?? 1
  const build = o.build ?? 1
  const root = new THREE.Group()
  const body = new THREE.Group() // 整体缩放
  body.scale.setScalar(H)
  root.add(body)

  const hips = new THREE.Group(); hips.position.y = 0.76; body.add(hips)
  const legs = []
  for (const s of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.set(s * 0.1 * build, 0, 0); hips.add(thigh)
    thigh.add(limb(0.38, 0.085 * build, 0.07, o.bottom || '#4a5568'))
    const knee = new THREE.Group(); knee.position.y = -0.38; thigh.add(knee)
    knee.add(limb(0.36, 0.068, 0.055, o.bottom || '#4a5568'))
    const shoe = m(new THREE.BoxGeometry(0.12, 0.08, 0.22), o.shoes || '#3a3330'); shoe.position.set(0, -0.37, 0.04); knee.add(shoe)
    legs.push({ thigh, knee })
  }
  const torso = new THREE.Group(); hips.add(torso)
  // 裤腰/臀部
  const pelvis = m(new THREE.CylinderGeometry(0.19 * build, 0.2 * build, 0.16, 10), o.bottom || '#4a5568', { flat: false }); pelvis.position.y = 0.02; torso.add(pelvis)
  // 上身（略呈梨形，更亲切）
  const chestGeo = new THREE.CylinderGeometry(0.17 * build, 0.21 * build, 0.5, 10)
  const chest = m(chestGeo, o.top || '#c56b4a', { flat: false }); chest.position.y = 0.32; torso.add(chest)
  const shoulder = m(new THREE.SphereGeometry(0.17 * build, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), o.top || '#c56b4a', { flat: false }); shoulder.position.y = 0.56; shoulder.scale.y = 0.5; torso.add(shoulder)
  if (o.apron) {
    const ap = m(new THREE.BoxGeometry(0.3 * build, 0.5, 0.03), o.apron); ap.position.set(0, 0.22, 0.2 * build); ap.rotation.x = -0.08; torso.add(ap)
  }
  if (o.vest) {
    const v = m(new THREE.CylinderGeometry(0.175 * build, 0.215 * build, 0.42, 10, 1, true, -2.2, 4.4), o.vest, { flat: false, side: THREE.DoubleSide }); v.position.y = 0.34; v.rotation.y = Math.PI; torso.add(v)
  }
  const arms = []
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * (0.2 * build + 0.04), 0.54, 0); torso.add(sh)
    const upper = limb(0.3, 0.06, 0.055, o.sleeve || o.top || '#c56b4a'); sh.add(upper)
    const elbow = new THREE.Group(); elbow.position.y = -0.3; sh.add(elbow)
    elbow.add(limb(0.26, 0.05, 0.045, o.shortSleeve ? skin : (o.sleeve || o.top || '#c56b4a')))
    const hand = m(G.hand, skin, { flat: false }); hand.position.y = -0.29; elbow.add(hand)
    sh.rotation.z = s * 0.08
    arms.push({ sh, elbow, hand })
  }
  // 头
  const neck = new THREE.Group(); neck.position.y = 0.62; torso.add(neck)
  const neckMesh = m(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skin, { flat: false }); neckMesh.position.y = 0.03; neck.add(neckMesh)
  const head = new THREE.Group(); head.position.y = 0.26; neck.add(head)
  const skull = m(G.head, skin, { flat: false }); skull.scale.set(1, 1.02, 0.96); head.add(skull)
  const eyes = []
  for (const s of [-1, 1]) {
    const e = m(G.eye, '#2a211d', { roughness: 0.3, flat: false }); e.position.set(s * 0.075, 0.02, 0.2); head.add(e); eyes.push(e)
    const c = m(G.cheek, '#f09a88', { flat: false }); c.position.set(s * 0.12, -0.05, 0.17); c.scale.set(1, 0.6, 0.4); head.add(c)
    const brow = m(new THREE.BoxGeometry(0.07, 0.015, 0.02), o.browColor || o.hairColor || '#3a2d26'); brow.position.set(s * 0.075, 0.08, 0.205); brow.rotation.z = s * -0.12; head.add(brow)
    const ear = m(G.cheek, skin, { flat: false }); ear.position.set(s * 0.215, 0, 0); ear.scale.set(0.5, 1, 0.8); head.add(ear)
  }
  const nose = m(G.nose, '#e5ad8c', { flat: false }); nose.position.set(0, -0.02, 0.22); head.add(nose)
  const mouth = m(new THREE.BoxGeometry(0.06, 0.014, 0.02), '#8a3d33'); mouth.position.set(0, -0.09, 0.2); head.add(mouth)
  const hc = o.hairColor || '#2b2320'
  switch (o.hairStyle) {
    case 'bald': {
      for (const s of [-1, 1]) { const h = m(new THREE.IcosahedronGeometry(0.1, 1), hc, { flat: false }); h.position.set(s * 0.18, 0.02, -0.05); h.scale.set(0.5, 0.8, 1.2); head.add(h) }
      const b = m(new THREE.IcosahedronGeometry(0.12, 1), hc, { flat: false }); b.position.set(0, 0.0, -0.17); b.scale.set(1.5, 0.8, 0.5); head.add(b)
      break
    }
    case 'curly': {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2
        const c = m(new THREE.IcosahedronGeometry(0.075, 0), hc); c.position.set(Math.cos(a) * 0.16, 0.13 + Math.sin(i * 2.3) * 0.02, Math.sin(a) * 0.16 - 0.02); head.add(c)
      }
      const top = m(new THREE.IcosahedronGeometry(0.17, 1), hc); top.position.y = 0.16; top.scale.y = 0.6; head.add(top)
      break
    }
    case 'bun':
    case 'ponytail':
    case 'short':
    default: {
      const cap = m(new THREE.SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hc, { flat: false })
      cap.position.set(0, 0.02, -0.015); cap.rotation.x = -0.25; head.add(cap)
      const fringe = m(new THREE.BoxGeometry(0.3, 0.06, 0.08), hc); fringe.position.set(0.02, 0.15, 0.17); fringe.rotation.x = 0.4; fringe.rotation.z = 0.1; head.add(fringe)
      if (o.hairStyle === 'bun') { const b = m(new THREE.IcosahedronGeometry(0.1, 1), hc, { flat: false }); b.position.set(0, 0.17, -0.17); head.add(b) }
      if (o.hairStyle === 'ponytail') {
        const t = limb(0.3, 0.06, 0.03, hc); t.position.set(0, 0.1, -0.22); t.rotation.x = 0.4; head.add(t)
        const tie = m(new THREE.TorusGeometry(0.05, 0.015, 4, 8), o.tie || '#d0573f'); tie.position.set(0, 0.1, -0.22); tie.rotation.x = Math.PI / 2; head.add(tie)
      }
    }
  }
  if (o.hat === 'bucket') {
    const h = m(new THREE.CylinderGeometry(0.2, 0.24, 0.14, 12), o.hatColor || '#c9b27a', { flat: false }); h.position.y = 0.18; head.add(h)
    const br = m(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 14), o.hatColor || '#c9b27a', { flat: false }); br.position.y = 0.12; head.add(br)
  } else if (o.hat === 'chef') {
    const h = m(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12), '#ffffff', { flat: false }); h.position.y = 0.2; head.add(h)
  } else if (o.hat === 'cap') {
    const h = m(new THREE.SphereGeometry(0.235, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), o.hatColor || '#3f6f9a', { flat: false }); h.position.y = 0.04; head.add(h)
    const br = m(new THREE.BoxGeometry(0.26, 0.02, 0.16), o.hatColor || '#3f6f9a'); br.position.set(0, 0.06, 0.25); head.add(br)
  }
  if (o.glasses) {
    for (const s of [-1, 1]) { const g = m(new THREE.TorusGeometry(0.045, 0.008, 4, 12), '#3a3330'); g.position.set(s * 0.075, 0.02, 0.215); head.add(g) }
    const br = m(new THREE.BoxGeometry(0.05, 0.008, 0.008), '#3a3330'); br.position.set(0, 0.03, 0.22); head.add(br)
  }

  // 小部件（眼睛、腮红、手等）不投影，减少阴影绘制
  root.traverse((o) => {
    if (!o.isMesh) return
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere()
    if (o.geometry.boundingSphere.radius < 0.09) o.castShadow = false
  })
  const self = {
    root, body, hips, torso, legs, arms, neck, head, eyes,
    mode: 'idle', phase: Math.random() * 10, t: Math.random() * 10,
    headYaw: 0, headYawTarget: 0, headPitch: 0, headPitchTarget: 0,
    blink: 2 + Math.random() * 3, performBoost: 0, wave: 0,
    seatHeight: 0.45,
    update(dt, speed = 0) { animate(self, dt, speed) },
  }
  return self
}

function damp(a, b, k, dt) { return a + (b - a) * (1 - Math.exp(-k * dt)) }

function animate(c, dt, speed) {
  c.t += dt
  const t = c.t
  const [L, R] = c.legs
  const [AL, AR] = c.arms
  const mode = c.mode
  // 默认姿态
  let hipsY = 0.76, torsoX = 0, torsoBob = 0
  let lt = 0, lk = 0, rt = 0, rk = 0
  let alx = 0, alz = 0.08, ale = 0, arx = 0, arz = -0.08, are = 0
  if (mode === 'walk') {
    c.phase += dt * speed * 5.2
    const s = Math.sin(c.phase)
    lt = s * 0.45; rt = -s * 0.45
    lk = Math.max(0, -s) * 0.7; rk = Math.max(0, s) * 0.7
    alx = -s * 0.4; arx = s * 0.4; ale = -0.25; are = -0.25
    torsoBob = Math.abs(Math.cos(c.phase)) * 0.025
  } else if (mode === 'sit' || mode === 'fish' || mode === 'fan') {
    hipsY = c.seatHeight + 0.02
    lt = rt = -Math.PI / 2 + 0.05
    lk = rk = Math.PI / 2 - 0.05
    torsoX = -0.05 + Math.sin(t * 0.9) * 0.015
    alx = -0.5; arx = -0.5; ale = -0.6; are = -0.6
    if (mode === 'fish') { alx = -1.0; arx = -1.0; ale = -0.3; are = -0.3; alz = -0.25; arz = 0.25 }
    if (mode === 'fan') { arx = -1.3 + Math.sin(t * 5) * 0.12; are = -1.6; arz = -0.5 + Math.sin(t * 5) * 0.25 }
  } else if (mode === 'cook') {
    arx = -0.9 + Math.sin(t * 3) * 0.15; arz = -0.15 + Math.cos(t * 3) * 0.2; are = -0.7
    alx = -0.6; ale = -0.9; alz = 0.1
    torsoX = 0.08
  } else if (mode === 'clap' || mode === 'perform') {
    const fast = mode === 'perform' ? 9 : 5
    const amp = mode === 'perform' ? 1 : 0.5
    alx = -1.1 + Math.sin(t * fast) * 0.25 * amp; ale = -0.9
    arx = -1.1 + Math.sin(t * fast + Math.PI) * 0.25 * amp; are = -0.9
    alz = -0.35; arz = 0.35
    torsoBob = mode === 'perform' ? Math.abs(Math.sin(t * fast / 2)) * 0.04 : 0
    if (mode === 'perform') { lk = Math.max(0, Math.sin(t * fast / 2)) * 0.25; lt = -lk * 0.4 }
  } else {
    // idle: 呼吸与轻微摇摆
    torsoBob = Math.sin(t * 1.6) * 0.008
    alx = Math.sin(t * 1.1) * 0.04; arx = -Math.sin(t * 1.1) * 0.04
  }
  if (c.idleHold === 'cage') { arx = -0.55; are = -0.9; arz = -0.1 }
  if (c.wave > 0) {
    c.wave -= dt
    arx = -2.6; arz = -0.3 + Math.sin(t * 10) * 0.35; are = -0.3
  }
  const k = 12
  c.hips.position.y = damp(c.hips.position.y, hipsY + torsoBob, k, dt)
  c.torso.rotation.x = damp(c.torso.rotation.x, torsoX, k, dt)
  L.thigh.rotation.x = damp(L.thigh.rotation.x, lt, k, dt); L.knee.rotation.x = damp(L.knee.rotation.x, lk, k, dt)
  R.thigh.rotation.x = damp(R.thigh.rotation.x, rt, k, dt); R.knee.rotation.x = damp(R.knee.rotation.x, rk, k, dt)
  AL.sh.rotation.x = damp(AL.sh.rotation.x, alx, k, dt); AL.sh.rotation.z = damp(AL.sh.rotation.z, alz, k, dt); AL.elbow.rotation.x = damp(AL.elbow.rotation.x, ale, k, dt)
  AR.sh.rotation.x = damp(AR.sh.rotation.x, arx, k, dt); AR.sh.rotation.z = damp(AR.sh.rotation.z, arz, k, dt); AR.elbow.rotation.x = damp(AR.elbow.rotation.x, are, k, dt)
  // 转头
  c.headYaw = damp(c.headYaw, c.headYawTarget, 4, dt)
  c.headPitch = damp(c.headPitch, c.headPitchTarget, 4, dt)
  c.neck.rotation.y = c.headYaw
  c.head.rotation.x = c.headPitch + (mode === 'perform' ? Math.sin(t * 4.5) * 0.08 : 0)
  // 眨眼
  c.blink -= dt
  const closed = c.blink < 0.12
  for (const e of c.eyes) e.scale.y = closed ? 0.15 : 1
  if (c.blink < 0) c.blink = 2 + Math.random() * 4
}
