import * as THREE from 'three'
import { PALETTE as P, mat } from '../core/Materials.js'
import { box, cyl, sphere, sign, textTexture } from './kit.js'

// 微缩街景的“生活杂物”：让画面像一个塞满细节的手办模型。
const ironM = () => mat('#2b3133', { metalness: 0.45, roughness: 0.5 })

/** 下垂的电线（悬链近似），合并进静态层 */
export function wire(parent, a, b, sag = 0.6, r = 0.025, color = '#1f2326') {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
  mid.y -= sag
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, r, 4, false), mat(color, { roughness: 0.6 }))
  m.castShadow = false
  parent.add(m)
  return m
}

/** 水泥电线杆：横担、瓷瓶，可带变压器箱。返回挂线点 */
export function utilityPole(parent, x, z, ry = 0, opts = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  const H = opts.h ?? 8
  cyl(g, 0.11, 0.16, H, 8, '#b9b0a2', 0, H / 2, 0, { material: mat('#bdb3a3', { tex: 'stone' }) })
  const arms = [H - 0.4, H - 1.2]
  const pts = []
  for (const y of arms) {
    box(g, 2.0, 0.12, 0.12, '#8a8278', 0, y, 0)
    for (const s of [-0.85, -0.3, 0.3, 0.85]) {
      cyl(g, 0.04, 0.05, 0.16, 6, '#e9eef0', s, y + 0.14, 0, { cast: false })
      pts.push(new THREE.Vector3(s, y + 0.22, 0))
    }
  }
  if (opts.transformer) {
    box(g, 0.7, 0.9, 0.5, '#7d8a84', 0, H - 2.6, 0.4)
    for (const s of [-1, 1]) cyl(g, 0.05, 0.05, 0.3, 6, '#5a6460', s * 0.2, H - 2.0, 0.4, { cast: false })
  }
  // 杆上贴的小广告、编号牌
  sign(g, ['津电', String(opts.no ?? 17)], 0.22, 0.32, 0, 2.2, 0.17, 0, { bg: '#f6f3ea', fg: '#2c5d8c', w: 96, h: 140, font: 'bold 44px' })
  if (opts.flyer) sign(g, ['修自行车', '配钥匙'], 0.26, 0.34, 0, 1.6, 0.17, 0, { bg: '#f2c14e', fg: '#7a3326', w: 128, h: 160, font: 'bold 34px' })
  g.updateMatrixWorld(true)
  return pts.map((p) => p.applyMatrix4(g.matrixWorld))
}

/** 太阳能热水器（中国屋顶标志物） */
export function solarHeater(parent, x, y, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g)
  const frame = mat('#c9ccd0', { metalness: 0.5, roughness: 0.4 })
  cyl(g, 0.24, 0.24, 2.0, 10, '#e6e8ea', 0, 1.25, -0.6, { rz: Math.PI / 2, material: frame })
  for (let i = 0; i < 9; i++) cyl(g, 0.045, 0.045, 1.6, 6, '#22313a', -0.85 + i * 0.21, 0.7, 0, { rx: -0.85, material: mat('#1f2b33', { metalness: 0.6, roughness: 0.2 }), cast: false })
  for (const s of [-1, 1]) {
    box(g, 0.05, 1.3, 0.05, null, s * 0.95, 0.65, -0.6, { material: frame })
    box(g, 0.05, 0.05, 1.5, null, s * 0.95, 0.1, -0.1, { material: frame })
    box(g, 0.05, 1.6, 0.05, null, s * 0.95, 0.7, 0, { rx: -0.85, material: frame })
  }
}
/** 屋顶水箱（带支架） */
export function waterTank(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g)
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(g, 0.08, 0.9, 0.08, null, a * 0.5, 0.45, b * 0.5, { material: ironM() })
  cyl(g, 0.7, 0.7, 1.4, 12, '#5d8fa8', 0, 1.6, 0, { material: mat('#5d8fa8', { tex: 'plaster', texScale: 1 }) })
  cyl(g, 0.74, 0.74, 0.12, 12, '#3f6f8a', 0, 2.35, 0)
  box(g, 0.05, 1.6, 0.05, '#555', 0.72, 1.4, 0, { cast: false })
}
/** 鸽子笼（天津老楼屋顶常见） */
export function pigeonCoop(parent, x, y, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g)
  const wd = mat('#9a7a58', { tex: 'wood' })
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(g, 0.08, 0.6, 0.08, null, a * 0.8, 0.3, b * 0.45, { material: wd })
  box(g, 1.8, 1.1, 1.0, null, 0, 1.15, 0, { material: wd })
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) box(g, 0.34, 0.3, 0.04, '#2a211d', -0.55 + i * 0.55, 0.9 + j * 0.45, 0.51, { cast: false })
  for (let i = 0; i < 10; i++) box(g, 0.02, 1.0, 0.02, ironM().color, -0.85 + i * 0.19, 1.15, 0.53, { material: ironM(), cast: false })
  box(g, 2.0, 0.08, 1.2, '#b85c45', 0, 1.75, 0, { rx: 0.12 })
  // 屋顶上的鸽子
  for (let i = 0; i < 3; i++) {
    const b = sphere(g, 0.09, '#9aa0a8', -0.6 + i * 0.55, 1.88, 0.1, { detail: 1, sx: 0.9, sz: 1.4 })
    sphere(g, 0.045, '#6f8b84', -0.6 + i * 0.55, 1.97, 0.22, { detail: 0 })
  }
}
/** 晾衣绳 + 衣服 */
export function laundry(parent, a, b, seed = 1) {
  wire(parent, a, b, 0.25, 0.012, '#d9d4c8')
  const cols = ['#e86f6f', '#f6efe0', '#3f6f9a', '#f2c14e', '#8fb86a', '#f6a6c1']
  const n = 5
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const p = new THREE.Vector3().lerpVectors(a, b, t)
    p.y -= 0.25 * 4 * t * (1 - t)
    const big = (i + seed) % 3 === 0
    const m = box(parent, big ? 0.55 : 0.4, big ? 0.7 : 0.45, 0.02, cols[(i + seed) % cols.length], p.x, p.y - (big ? 0.37 : 0.25), p.z, { ry: Math.atan2(b.z - a.z, b.x - a.x) * -1, cast: false })
    m.userData.cloth = true
  }
}
/** 屋顶小菜园 / 花盆 */
export function roofGarden(parent, x, y, z, w = 1.8) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g)
  box(g, w, 0.35, 0.6, '#7a4f35', 0, 0.175, 0)
  const lm = mat('#7fb062', { tex: 'leaf', grime: false })
  for (let i = 0; i < Math.round(w / 0.4); i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), lm); m.position.set(-w / 2 + 0.2 + i * 0.4, 0.45, 0); m.scale.y = 0.8; g.add(m) }
  // 泡沫箱种葱
  box(g, 0.6, 0.35, 0.45, '#f4f4f0', w / 2 + 0.5, 0.18, 0.1)
  for (let i = 0; i < 6; i++) cyl(g, 0.012, 0.012, 0.35, 3, '#6fa852', w / 2 + 0.3 + (i % 3) * 0.17, 0.5, 0.0 + Math.floor(i / 3) * 0.18, { cast: false })
}
export function antenna(parent, x, y, z) {
  cyl(parent, 0.025, 0.025, 2.4, 4, '#777', x, y + 1.2, z, { cast: false })
  for (let i = 0; i < 4; i++) box(parent, 0.9 - i * 0.15, 0.025, 0.025, '#777', x, y + 1.4 + i * 0.25, z, { cast: false })
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 5, 0, Math.PI * 2, 0, 0.9), mat('#e9e9e4', { side: THREE.DoubleSide }))
  dish.position.set(x + 0.6, y + 0.6, z); dish.rotation.z = -1.1; parent.add(dish)
}

/** 竖招牌（挂在墙上、垂直于立面） */
export function verticalSign(parent, x, y, z, ry, text, { bg = '#c9472f', fg = '#fff3d6', border = '#f2c14e' } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g)
  const chars = [...text]
  const h = chars.length * 0.48 + 0.2
  box(g, 0.08, 0.06, 0.7, '#333', 0, h / 2 - 0.15, 0.35, { cast: false })
  box(g, 0.08, 0.06, 0.7, '#333', 0, -h / 2 + 0.15, 0.35, { cast: false })
  box(g, 0.14, h, 0.62, bg, 0, 0, 0.72)
  const tex = { bg, fg, w: 128, h: Math.round(128 * h / 0.56), font: 'bold 96px', border }
  sign(g, chars, 0.56, h - 0.06, 0.075, 0, 0.72, Math.PI / 2, tex)
  sign(g, chars, 0.56, h - 0.06, -0.075, 0, 0.72, -Math.PI / 2, tex)
  return g
}

/** 一串红灯笼（横跨街道） */
export function lanternString(parent, a, b, n = 7) {
  wire(parent, a, b, 0.7, 0.015, '#3a2a22')
  const red = mat('#d9402f', { emissive: '#c0301f', emissiveIntensity: 0.35, roughness: 0.6 })
  const gold = mat('#e6b34a', { metalness: 0.4, roughness: 0.4 })
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const p = new THREE.Vector3().lerpVectors(a, b, t)
    p.y -= 0.7 * 4 * t * (1 - t)
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), red); l.scale.y = 0.85; l.position.set(p.x, p.y - 0.32, p.z); parent.add(l)
    cyl(parent, 0.13, 0.13, 0.06, 8, '#e6b34a', p.x, p.y - 0.13, p.z, { material: gold, cast: false })
    cyl(parent, 0.13, 0.13, 0.06, 8, '#e6b34a', p.x, p.y - 0.51, p.z, { material: gold, cast: false })
    cyl(parent, 0.012, 0.012, 0.22, 3, '#e6b34a', p.x, p.y - 0.66, p.z, { material: gold, cast: false })
  }
}

export function trafficCone(parent, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g)
  box(g, 0.4, 0.04, 0.4, '#e2622f', 0, 0.02, 0)
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 10), mat('#ef6a2f')); c.position.y = 0.33; c.castShadow = true; g.add(c)
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.115, 0.1, 10), mat('#f6f3ea')); s.position.y = 0.36; g.add(s)
}

/** 路面画线/字（贴在地面的平面） */
export function roadPaint(parent, x, z, w, d, ry = 0, color = '#f4f1e8') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, { roughness: 0.8 }))
  m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, 0.045, z); m.receiveShadow = true
  parent.add(m)
  return m
}
export function roadText(parent, x, z, text, ry = 0, size = 1.6) {
  const tex = textTexture([text], { w: 256, h: 256, bg: 'rgba(0,0,0,0)', fg: '#f4f1e8', font: 'bold 200px' })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, depthWrite: false }))
  m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, 0.05, z); m.userData.noMerge = true
  parent.add(m)
}

/** 巨型麻花（麻花铺的屋顶招牌摆件） */
export function giantMahua(parent, x, y, z, ry = 0, len = 4.2) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g)
  const dough = mat('#c9853a', { roughness: 0.55, flat: false })
  const dough2 = mat('#a9692c', { roughness: 0.55, flat: false })
  const strands = 3
  for (let k = 0; k < strands; k++) {
    const pts = []
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      const a = t * Math.PI * 6 + k * (Math.PI * 2 / strands)
      const r = 0.34 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.03)) + 0.06
      pts.push(new THREE.Vector3((t - 0.5) * len, Math.cos(a) * r, Math.sin(a) * r))
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.2, 8, false), k % 2 ? dough2 : dough)
    m.castShadow = true; g.add(m)
  }
  // 芝麻、冰糖点缀
  const sesame = mat('#f4e4c0')
  for (let i = 0; i < 60; i++) {
    const t = Math.random(), a = Math.random() * Math.PI * 2
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 3), sesame)
    s.scale.set(1, 0.5, 0.6)
    s.position.set((t - 0.5) * len * 0.9, Math.cos(a) * 0.5, Math.sin(a) * 0.5)
    g.add(s)
  }
  g.rotation.z = 0.18
  // 底座
  box(parent, 1.4, 0.6, 1.2, '#7a3326', x - Math.cos(ry) * 0.9, y - 0.45, z + Math.sin(ry) * 0.9)
  box(parent, 1.4, 0.6, 1.2, '#7a3326', x + Math.cos(ry) * 0.9, y - 0.45, z - Math.sin(ry) * 0.9)
  return g
}

/** 楼顶霓虹招牌（框架 + 灯泡边） */
export function roofBillboard(parent, x, y, z, ry, lines, w = 4, h = 1.5) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g)
  for (const s of [-1, 1]) { box(g, 0.08, 1.6, 0.08, null, s * w * 0.4, 0.8, -0.3, { material: ironM() }); box(g, 0.06, 1.8, 0.06, null, s * w * 0.4, 0.9, -0.9, { rx: 0.6, material: ironM() }) }
  box(g, w + 0.2, h + 0.2, 0.15, '#2f3f5a', 0, 1.6 + h / 2, -0.32)
  sign(g, lines, w, h, 0, 1.6 + h / 2, -0.23, 0, { bg: '#fbf1dc', fg: '#b8342a', w: 512, h: Math.round(512 * h / w), font: 'bold 120px', border: '#2f3f5a', glow: 0.35 })
  const bulb = mat('#ffe9b0', { emissive: '#ffcf70', emissiveIntensity: 1.2 })
  const n = Math.round(w / 0.3)
  for (let i = 0; i <= n; i++) for (const yy of [1.5, 1.7 + h]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), bulb); b.position.set(-w / 2 - 0.05 + i * (w + 0.1) / n, yy, -0.2); g.add(b) }
}
