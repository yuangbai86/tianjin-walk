import * as THREE from 'three'
import { PALETTE as P, mat } from '../core/Materials.js'
import { box, cyl, hipRoof, cone, sign } from './kit.js'
import { solarHeater, waterTank, pigeonCoop, laundry, roofGarden, antenna } from './clutter.js'

// 小洋楼生成器：参考五大道常见做法——红砖清水墙/红青砖分层、拱形门洞与拱形大窗、
// 意式拱券门廊、英式半木构山墙、凸窗、铁艺阳台、檐口齿饰、转角隅石。

export function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

const warmGlass = () => mat(P.glassWarm, { emissive: '#ffb46a', emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.2 })
const coolGlass = () => mat('#47606f', { roughness: 0.12, metalness: 0.55 })
const curtain = (c) => mat(c, { roughness: 0.9 })
const iron = () => mat('#2f3436', { roughness: 0.5, metalness: 0.4 })

/** 墙体材质：红砖用彩色砖纹贴图，其余颜色用灰浆纹理 */
export function wallMat(color, band = false) {
  if (color === P.brick || color === P.brickDark) return mat('#ffffff', { tex: band ? 'brickBand' : 'brick' })
  return mat(color, { tex: 'plaster' })
}
const roofMat = (c) => mat(c, { tex: 'roof', grime: false })
const stoneMat = () => mat(P.stoneDark, { tex: 'stone' })

function useMat(parent, w, h, d, material, x, y, z, o = {}) { return box(parent, w, h, d, null, x, y, z, { ...o, material }) }

/** 半圆拱（窗楣/门洞）：一组小块沿弧排列，形成有厚度的拱圈 */
function archRing(g, cx, cy, z, r, thick, depth, color, segs = 9) {
  for (let i = 0; i < segs; i++) {
    const a0 = Math.PI * i / segs, a1 = Math.PI * (i + 1) / segs, am = (a0 + a1) / 2
    const len = 2 * (r + thick / 2) * Math.sin((a1 - a0) / 2) + 0.02
    box(g, len, thick, depth, color, cx + Math.cos(am) * (r + thick / 2), cy + Math.sin(am) * (r + thick / 2), z, { rz: am - Math.PI / 2, cast: false })
  }
}
/** 半圆玻璃（拱窗上部） */
function halfDisc(g, cx, cy, z, r, material) {
  const geo = new THREE.CircleGeometry(r, 12, 0, Math.PI)
  const m = new THREE.Mesh(geo, material)
  m.position.set(cx, cy, z)
  g.add(m)
  return m
}

/** 窗：style = 'rect' | 'arch' | 'pediment' | 'segment'，朝 +z */
function windowUnit(parent, x, y, z, o = {}) {
  const { w = 1.0, h = 1.6, trim = P.white, style = 'rect', shutter = null, lit = false, sill = true, flower = false, balconette = false, curtainColor = null } = o
  const g = new THREE.Group()
  g.position.set(x, y, z)
  parent.add(g)
  const glass = lit ? warmGlass() : coolGlass()
  // 窗洞内侧（深色，形成进深）
  box(g, w + 0.06, h + 0.06, 0.04, '#3a3430', 0, 0, -0.02, { cast: false })
  box(g, w, h, 0.04, null, 0, 0, 0.0, { material: glass, cast: false })
  if (curtainColor && !lit) box(g, w * 0.3, h * 0.85, 0.02, curtainColor, -w * 0.33, 0.04, 0.03, { material: curtain(curtainColor), cast: false })
  // 窗框（四边）与窗棂
  const f = 0.09
  box(g, w + f * 2, f, 0.1, trim, 0, h / 2 + f / 2, 0.05)
  box(g, w + f * 2, f, 0.1, trim, 0, -h / 2 - f / 2, 0.05)
  box(g, f, h, 0.1, trim, -w / 2 - f / 2, 0, 0.05)
  box(g, f, h, 0.1, trim, w / 2 + f / 2, 0, 0.05)
  box(g, 0.045, h, 0.05, trim, 0, 0, 0.04, { cast: false })
  box(g, w, 0.045, 0.05, trim, 0, h * 0.2, 0.04, { cast: false })
  if (sill) {
    box(g, w + 0.42, 0.08, 0.26, trim, 0, -h / 2 - 0.13, 0.11)
    box(g, w + 0.3, 0.06, 0.16, trim, 0, -h / 2 - 0.2, 0.06, { cast: false })
  }
  if (style === 'arch') {
    halfDisc(g, 0, h / 2, 0.0, w / 2, glass)
    archRing(g, 0, h / 2, 0.05, w / 2 + f / 2 - 0.045, 0.14, 0.12, trim)
    box(g, 0.16, 0.26, 0.16, trim, 0, h / 2 + w / 2 + 0.17, 0.09) // 拱心石
  } else if (style === 'pediment') {
    // 三角楣
    const pg = new THREE.Group(); pg.position.set(0, h / 2 + 0.2, 0.08); g.add(pg)
    box(pg, w + 0.5, 0.1, 0.18, trim, 0, 0, 0)
    for (const s of [-1, 1]) box(pg, (w + 0.5) / 2 / Math.cos(0.42) + 0.02, 0.1, 0.18, trim, s * (w + 0.5) / 4, 0.24, 0, { rz: -s * 0.42 })
    // 托架
    for (const s of [-1, 1]) box(g, 0.1, 0.22, 0.14, trim, s * (w / 2 + 0.1), h / 2 + 0.05, 0.1)
  } else if (style === 'segment') {
    box(g, w + 0.5, 0.18, 0.16, trim, 0, h / 2 + 0.16, 0.07)
    box(g, w + 0.6, 0.06, 0.2, trim, 0, h / 2 + 0.28, 0.08)
  } else {
    box(g, w + 0.36, 0.14, 0.16, trim, 0, h / 2 + 0.16, 0.07)
  }
  if (shutter) {
    for (const s of [-1, 1]) {
      const sh = box(g, w * 0.5, h, 0.05, shutter, s * (w / 2 + f + w * 0.25 + 0.02), 0, 0.04, { cast: false })
      for (let i = 0; i < 5; i++) box(g, w * 0.44, 0.03, 0.03, shutter === P.white ? '#d8d2c6' : '#2f4f45', s * (w / 2 + f + w * 0.25 + 0.02), -h / 2 + (i + 0.5) * h / 5, 0.07, { cast: false })
    }
  }
  if (flower) {
    box(g, w + 0.2, 0.22, 0.24, '#7a4f35', 0, -h / 2 - 0.0, 0.27, { cast: false })
    const fc = ['#e86f6f', '#f2c14e', '#f6a6c1', '#fbf6ec']
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), mat(i % 2 ? P.leaf : fc[i % 4]))
      m.position.set(-w / 2 + 0.1 + i * (w / 4.5), -h / 2 + 0.17, 0.27); g.add(m)
    }
  }
  if (balconette) {
    // 法式铁艺小阳台
    box(g, w + 0.5, 0.08, 0.5, P.stone, 0, -h / 2 - 0.12, 0.25)
    useMat(g, w + 0.5, 0.04, 0.04, iron(), 0, -h / 2 + 0.72, 0.48)
    useMat(g, w + 0.5, 0.03, 0.03, iron(), 0, -h / 2 + 0.08, 0.48)
    const n = Math.round((w + 0.5) / 0.14)
    for (let i = 0; i <= n; i++) useMat(g, 0.022, 0.64, 0.022, iron(), -(w + 0.5) / 2 + i * (w + 0.5) / n, -h / 2 + 0.4, 0.48, { cast: false })
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 4, 10), iron()); t.position.set(s * w * 0.22, -h / 2 + 0.4, 0.48); g.add(t)
    }
    for (const s of [-1, 1]) useMat(g, 0.03, 0.66, 0.5, iron(), s * (w + 0.5) / 2, -h / 2 + 0.4, 0.25, { cast: false })
  }
  return g
}

/** 铁艺栏杆（阳台/门廊顶） */
function ironRail(g, x, y, z, w, depth = 0) {
  useMat(g, w, 0.05, 0.05, iron(), x, y + 0.85, z)
  useMat(g, w, 0.035, 0.035, iron(), x, y + 0.12, z)
  const n = Math.round(w / 0.13)
  for (let i = 0; i <= n; i++) useMat(g, 0.022, 0.74, 0.022, iron(), x - w / 2 + i * w / n, y + 0.48, z, { cast: false })
  for (let i = 0; i < Math.floor(w / 0.7); i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.016, 4, 10), iron())
    t.position.set(x - w / 2 + 0.35 + i * 0.7, y + 0.48, z); g.add(t)
  }
  if (depth) for (const s of [-1, 1]) useMat(g, 0.03, 0.85, depth, iron(), x + s * w / 2, y + 0.48, z - depth / 2, { cast: false })
}

function balcony(g, x, y, z, w) {
  useMat(g, w, 0.18, 1.0, stoneMat(), x, y, z + 0.5)
  box(g, w + 0.1, 0.06, 1.06, P.white, x, y - 0.12, z + 0.5, { cast: false })
  ironRail(g, x, y + 0.08, z + 0.97, w, 0.95)
  for (const s of [-1, 1]) box(g, 0.16, 0.42, 0.55, P.stoneDark, x + s * (w / 2 - 0.3), y - 0.3, z + 0.28)
}

/** 拱形门洞 + 双开门 + 扇形气窗 + 壁灯 + 门牌 */
function doorUnit(g, x, z, { trim, wall, canopy = null, steps = 4, num = 1 }) {
  const lift = steps * 0.15, w = 1.5, h = 2.3
  // 门洞（深色内凹）
  box(g, w + 0.1, h, 0.05, '#2c2522', x, lift + h / 2, z + 0.01, { cast: false })
  halfDisc(g, x, lift + h, z + 0.02, (w + 0.1) / 2, mat('#2c2522'))
  // 双开门（带门板线脚）
  for (const s of [-1, 1]) {
    box(g, w / 2 - 0.04, h - 0.05, 0.08, P.wood, x + s * w / 4, lift + (h - 0.05) / 2, z + 0.05, { material: mat('#7b4a32', { tex: 'wood' }) })
    for (const yy of [0.55, 1.45]) box(g, w / 2 - 0.3, 0.6, 0.03, '#6a3f2b', x + s * w / 4, lift + yy, z + 0.1, { cast: false })
    const k = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), mat('#d9b25a', { metalness: 0.7, roughness: 0.3 })); k.position.set(x + s * 0.1, lift + 1.05, z + 0.13); g.add(k)
  }
  // 扇形气窗
  halfDisc(g, x, lift + h, z + 0.04, w / 2 - 0.05, warmGlass())
  for (let i = 1; i < 4; i++) { const a = Math.PI * i / 4; box(g, 0.03, w / 2 - 0.05, 0.03, trim, x + Math.cos(a) * (w / 4 - 0.02), lift + h + Math.sin(a) * (w / 4 - 0.02), z + 0.07, { rz: a - Math.PI / 2, cast: false }) }
  // 门套（壁柱 + 拱圈 + 拱心石）
  for (const s of [-1, 1]) {
    box(g, 0.26, h, 0.18, trim, x + s * (w / 2 + 0.13), lift + h / 2, z + 0.07)
    box(g, 0.36, 0.14, 0.24, trim, x + s * (w / 2 + 0.13), lift + h, z + 0.08)
  }
  archRing(g, x, lift + h, z + 0.07, w / 2, 0.24, 0.18, trim, 11)
  box(g, 0.24, 0.36, 0.24, trim, x, lift + h + w / 2 + 0.2, z + 0.1)
  // 台阶（石材）
  for (let i = 0; i < steps; i++) {
    const depth = 0.3 + (steps - 1 - i) * 0.24
    useMat(g, w + 1.0, 0.15, depth, stoneMat(), x, 0.075 + i * 0.15, z + depth / 2)
  }
  // 铁艺扶手
  for (const s of [-1, 1]) {
    const len = steps * 0.24 + 0.3
    const r = useMat(g, 0.04, 0.04, len, iron(), x + s * (w / 2 + 0.45), lift + 0.85, z + len / 2 - 0.1, { rx: Math.atan2(lift, len) })
    useMat(g, 0.04, 0.9, 0.04, iron(), x + s * (w / 2 + 0.45), 0.45, z + len - 0.15, { cast: false })
  }
  // 壁灯
  for (const s of [-1, 1]) {
    const lx = x + s * (w / 2 + 0.6)
    useMat(g, 0.05, 0.25, 0.25, iron(), lx, lift + 2.05, z + 0.12, { cast: false })
    box(g, 0.2, 0.3, 0.2, null, lx, lift + 2.05, z + 0.3, { material: mat('#ffe2a8', { emissive: '#ffcc7a', emissiveIntensity: 0.7 }), cast: false })
    useMat(g, 0.26, 0.06, 0.26, iron(), lx, lift + 2.23, z + 0.3, { cast: false })
  }
  // 门牌
  sign(g, [String(num) + '号'], 0.34, 0.22, x + w / 2 + 0.6, lift + 1.5, z + 0.03, 0, { bg: '#2c5d8c', fg: '#fff', w: 128, h: 84, font: 'bold 52px', border: '#fff', glow: 0.1 })
  if (canopy) {
    // 铸铁玻璃雨棚
    box(g, w + 1.1, 0.06, 1.1, null, x, lift + h + 1.15, z + 0.55, { rx: 0.15, material: mat('#cfe2e6', { transparent: true, opacity: 0.55, roughness: 0.1 }) })
    useMat(g, w + 1.2, 0.08, 0.06, iron(), x, lift + h + 1.07, z + 1.1)
    for (const s of [-1, 1]) useMat(g, 0.05, 0.05, 1.1, iron(), x + s * (w / 2 + 0.5), lift + h + 0.95, z + 0.55, { rx: -0.45, cast: false })
  }
}

/** 意式拱券门廊：底层退进，正面一排拱 */
function loggia(g, w, d, H0, trim, wall, bays) {
  const depth = 1.7
  const bw = w / bays
  // 门廊后墙（深）
  useMat(g, w - 0.4, H0 - 0.6, 0.1, wallMat(wall), 0, 0.6 + (H0 - 0.6) / 2, d / 2 - depth, { cast: false })
  // 地面
  useMat(g, w, 0.1, depth, stoneMat(), 0, 0.62, d / 2 - depth / 2)
  // 柱与拱
  const r = bw / 2 - 0.3
  for (let i = 0; i <= bays; i++) {
    const x = -w / 2 + i * bw
    const pw = i === 0 || i === bays ? 0.6 : 0.5
    useMat(g, pw, H0 - 0.6, 0.6, wallMat(wall), x, 0.6 + (H0 - 0.6) / 2, d / 2 - 0.3)
    box(g, pw + 0.12, 0.14, 0.7, trim, x, H0 - r - 0.25, d / 2 - 0.3, { cast: false })
  }
  for (let i = 0; i < bays; i++) {
    const cx = -w / 2 + (i + 0.5) * bw
    // 拱上实墙
    useMat(g, bw, 0.5, 0.6, wallMat(wall), cx, H0 - 0.25, d / 2 - 0.3)
    archRing(g, cx, H0 - r - 0.5 + 0.05, d / 2 - 0.3, r, 0.28, 0.62, trim, 11)
    box(g, 0.18, 0.28, 0.66, trim, cx, H0 - 0.38, d / 2 - 0.3, { cast: false })
    // 拱内两角填充
    for (const s of [-1, 1]) useMat(g, 0.3, r * 0.9, 0.58, wallMat(wall), cx + s * (r + 0.1), H0 - 0.5 - r * 0.45, d / 2 - 0.3, { cast: false })
  }
  // 门廊内的门和窗
  doorUnit(g, 0, d / 2 - depth + 0.05, { trim, wall, steps: 0, num: 7 })
  return depth
}

/** 英式半木构山墙 */
function gable(g, x, y, z, w, h, roof) {
  const sg = new THREE.Group(); sg.position.set(x, y, z); g.add(sg)
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath()
  const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), mat('#f3ead9', { tex: 'plaster' }))
  tri.castShadow = true; sg.add(tri)
  const timber = '#4a3428'
  box(sg, w, 0.1, 0.06, timber, 0, 0.05, 0.33, { cast: false })
  box(sg, 0.1, h * 0.9, 0.06, timber, 0, h * 0.45, 0.33, { cast: false })
  for (const s of [-1, 1]) {
    box(sg, 0.09, h * 0.5, 0.06, timber, s * w * 0.25, h * 0.25, 0.33, { cast: false })
    box(sg, 0.08, h * 0.55, 0.06, timber, s * w * 0.13, h * 0.32, 0.33, { rz: s * 0.6, cast: false })
  }
  // 封檐板
  const L = Math.hypot(w / 2, h) + 0.4
  for (const s of [-1, 1]) {
    useMat(sg, L, 0.12, 0.5, roofMat(roof), s * w / 4, h / 2 + 0.06, 0.2, { rz: -s * Math.atan2(h, w / 2) })
    box(sg, L, 0.18, 0.08, P.white, s * w / 4, h / 2 - 0.02, 0.47, { rz: -s * Math.atan2(h, w / 2), cast: false })
  }
  // 小圆窗
  const ow = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), coolGlass()); ow.position.set(0, h * 0.42, 0.37); sg.add(ow)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 5, 16), mat(P.white)); ring.position.set(0, h * 0.42, 0.38); sg.add(ring)
}

/** 凸窗（两层通高，带小屋顶） */
function bayWindow(g, x, z, floors, fh, trim, wall, roof) {
  const bw = 2.2, bd = 0.7, h = floors * fh - 0.4
  useMat(g, bw, h, bd, wallMat(wall), x, 0.9 + h / 2, z + bd / 2)
  for (let f = 0; f < floors; f++) {
    windowUnit(g, x, 0.6 + f * fh + 1.55, z + bd + 0.01, { trim, w: 1.3, h: 1.5, lit: f === 1, sill: true })
    for (const s of [-1, 1]) {
      const wg = windowUnit(new THREE.Group(), 0, 0, 0, { trim, w: 0.35, h: 1.5, sill: false })
      wg.position.set(x + s * (bw / 2 + 0.01), 0.6 + f * fh + 1.55, z + bd / 2); wg.rotation.y = s * Math.PI / 2; g.add(wg)
    }
  }
  box(g, bw + 0.2, 0.14, bd + 0.2, trim, x, 0.9 + h + 0.05, z + bd / 2)
  hipRoof(g, bw + 0.1, bd + 0.1, 0.45, roof, x, 0.9 + h + 0.12, z + bd / 2, 0.08)
}

/**
 * 小洋楼。原点位于底面中心，正立面朝 +z。
 */
export function yanglou(opts) {
  const {
    w = 10, d = 8, floors = 3, wall = P.cream, trim = P.white, roof = P.roof,
    tower = null, balcony: hasBalcony = true, shop = null, seed = 1, shutter = null,
    roofStyle = 'hip', plaque = null, sides = true, back = false,
    style = null, band = false, num = null,
  } = opts
  const r = rng(seed)
  const g = new THREE.Group()
  const fh = 3.1
  const H = floors * fh + 0.5
  const isBrick = wall === P.brick
  const wm = wallMat(wall, band)
  const winStyle = style === 'english' ? 'segment' : isBrick ? (r() > 0.5 ? 'arch' : 'segment') : (r() > 0.5 ? 'pediment' : 'rect')
  // 基座（毛石）
  useMat(g, w + 0.24, 0.6, d + 0.24, stoneMat(), 0, 0.3, 0)
  box(g, w + 0.34, 0.08, d + 0.34, P.stone, 0, 0.62, 0, { cast: false })
  // 墙身
  const loggiaDepth = style === 'italian' && !shop ? 1.7 : 0
  if (loggiaDepth) {
    useMat(g, w, H - 0.6, d - loggiaDepth, wm, 0, 0.6 + (H - 0.6) / 2, -loggiaDepth / 2)
    useMat(g, w, H - fh - 0.6, loggiaDepth, wm, 0, fh + 0.6 + (H - fh - 0.6) / 2, d / 2 - loggiaDepth / 2)
    loggia(g, w, d, fh + 0.6, trim, wall, Math.max(3, Math.round(w / 2.6)))
  } else {
    useMat(g, w, H - 0.6, d, wm, 0, 0.6 + (H - 0.6) / 2, 0)
  }
  // 腰线
  for (let f = 1; f < floors; f++) box(g, w + 0.16, 0.16, d + 0.16, trim, 0, f * fh + 0.45, 0, { cast: false })
  // 檐口 + 齿饰
  box(g, w + 0.6, 0.3, d + 0.6, trim, 0, H + 0.12, 0)
  box(g, w + 0.36, 0.16, d + 0.36, trim, 0, H - 0.1, 0, { cast: false })
  const dn = Math.round(w / 0.32)
  for (let i = 0; i < dn; i++) box(g, 0.12, 0.12, 0.14, trim, -w / 2 + (i + 0.5) * (w / dn), H - 0.24, d / 2 + 0.12, { cast: false })
  // 转角：灰浆楼用隅石，砖楼用壁柱
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (isBrick) box(g, 0.42, H - 0.6, 0.42, trim === P.cream ? P.cream : trim, sx * (w / 2), 0.6 + (H - 0.6) / 2, sz * (d / 2), { cast: false })
    else for (let k = 0; k < Math.floor((H - 0.8) / 0.55); k++) {
      const long = k % 2 === 0
      box(g, long ? 0.62 : 0.4, 0.42, long ? 0.4 : 0.62, P.stone, sx * (w / 2 - (long ? 0.2 : 0.1)), 0.9 + k * 0.55, sz * (d / 2 - (long ? 0.1 : 0.2)), { cast: false })
    }
  }

  // 屋顶
  const rm = roofMat(roof)
  if (roofStyle === 'hip') {
    const m = hipRoof(g, w, d, Math.min(w, d) * 0.34, roof, 0, H + 0.27, 0, 0.45); m.material = rm
    const dg = new THREE.Group(); dg.position.set(-w * 0.18, H + 0.95, d / 2 - 0.5); g.add(dg)
    useMat(dg, 1.3, 1.2, 1.2, wm, 0, 0.3, 0)
    windowUnit(dg, 0, 0.32, 0.61, { trim, w: 0.6, h: 0.7, sill: false, lit: r() > 0.5 })
    const dr = hipRoof(dg, 1.3, 1.2, 0.6, roof, 0, 0.9, 0, 0.15); dr.material = rm
  } else if (roofStyle === 'flat') {
    box(g, w + 0.3, 0.2, d + 0.3, trim, 0, H + 0.36, 0)
    const n = Math.round(w / 0.4)
    const bal = new THREE.LatheGeometry([new THREE.Vector2(0.07, 0), new THREE.Vector2(0.1, 0.12), new THREE.Vector2(0.06, 0.3), new THREE.Vector2(0.09, 0.44), new THREE.Vector2(0.07, 0.55)], 6)
    for (let i = 0; i <= n; i++) { const b = new THREE.Mesh(bal, mat(trim)); b.position.set(-w / 2 + (i / n) * w, H + 0.46, d / 2 + 0.05); b.castShadow = true; g.add(b) }
    box(g, w + 0.3, 0.14, 0.3, trim, 0, H + 1.06, d / 2 + 0.05)
    useMat(g, w * 0.35, 1.8, d * 0.4, wm, w * 0.2, H + 1.2, -d * 0.2)
    const pr = hipRoof(g, w * 0.35, d * 0.4, 0.7, roof, w * 0.2, H + 2.1, -d * 0.2, 0.2); pr.material = rm
  } else {
    // 孟莎式（双折）屋顶 + 老虎窗
    useMat(g, w - 0.2, 1.7, d - 0.2, rm, 0, H + 1.1, 0)
    const top = hipRoof(g, w - 0.6, d - 0.6, 0.9, P.roofDark, 0, H + 1.95, 0, 0.2); top.material = roofMat(P.roofDark)
    const n = Math.max(1, Math.floor(w / 3))
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n)
      box(g, 1.0, 1.2, 0.4, P.white, x, H + 1.15, d / 2 - 0.05)
      windowUnit(g, x, H + 1.12, d / 2 + 0.16, { trim: P.white, w: 0.6, h: 0.8, sill: false, style: 'arch', lit: r() > 0.6 })
    }
  }
  // 烟囱（砖）
  for (const cx of [w * 0.3, -w * 0.32]) {
    useMat(g, 0.75, 2.6, 0.75, mat('#ffffff', { tex: 'brick' }), cx, H + 1.3, -d * 0.18)
    box(g, 0.95, 0.16, 0.95, P.stone, cx, H + 2.62, -d * 0.18)
    cyl(g, 0.12, 0.12, 0.3, 6, '#8a5a40', cx + 0.15, H + 2.85, -d * 0.18)
    if (w < 9.5) break
  }
  // 英式山墙
  if (style === 'english') gable(g, w * 0.18, H + 0.25, d / 2 - 0.25, Math.min(4.2, w * 0.45), 2.6, roof)

  // 正立面开间
  const bays = Math.max(2, Math.floor(w / 2.4))
  const bayW = w / bays
  const doorBay = Math.floor(bays / 2)
  const bayWin = style === 'english' && !shop ? (doorBay > 0 ? 0 : bays - 1) : -1
  if (bayWin >= 0) bayWindow(g, -w / 2 + (bayWin + 0.5) * bayW, d / 2, 2, fh, trim, wall, roof)
  const curtains = ['#d9a441', '#b85c45', '#8fa77a', '#e9e1d0']
  for (let f = 0; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      const x = -w / 2 + (b + 0.5) * bayW
      const y = f * fh + 0.6 + 1.55
      if (bayWin === b && f < 2) continue
      if (f === 0 && (shop || loggiaDepth)) continue
      if (f === 0 && b === doorBay) continue
      if (loggiaDepth && f === 1 && b === doorBay) continue
      const big = f === 0
      windowUnit(g, x, y + (big ? 0.1 : 0), d / 2, {
        trim, style: big && isBrick ? 'arch' : winStyle, shutter: f > 0 ? shutter : null, lit: r() < 0.22,
        h: big ? 1.9 : 1.6, w: big ? 1.15 : 1.0, flower: f > 0 && r() < 0.2, balconette: f > 0 && !shutter && r() < 0.25,
        curtainColor: curtains[Math.floor(r() * 4)],
      })
    }
  }
  // 底层：门或商铺
  if (shop) shopFront(g, w, d, trim, shop)
  else if (!loggiaDepth) {
    const dx = -w / 2 + (doorBay + 0.5) * bayW
    doorUnit(g, dx, d / 2, { trim, wall, canopy: r() > 0.5, num: num ?? (1 + Math.floor(r() * 60)) })
    if (hasBalcony && floors > 1) balcony(g, dx, fh + 0.55, d / 2, Math.min(bayW * 1.3, 3))
    if (plaque) sign(g, plaque, 0.95, 0.6, dx - 1.45, 1.9, d / 2 + 0.03, 0, { bg: '#e9dcc0', fg: '#5a3a2a', w: 256, h: 160, font: 'bold 44px', border: '#8a6a4a', glow: 0.05 })
  } else if (hasBalcony) {
    ironRail(g, 0, fh + 0.6, d / 2 + 0.02, w - 0.4)
  }
  // 侧立面
  if (sides) {
    const sb = Math.max(1, Math.floor(d / 2.8))
    for (const side of [-1, 1]) {
      for (let f = 0; f < floors; f++) for (let b = 0; b < sb; b++) {
        const z = -d / 2 + (b + 0.5) * (d / sb)
        const wg = windowUnit(new THREE.Group(), 0, 0, 0, { trim, style: winStyle, lit: r() < 0.15, curtainColor: curtains[Math.floor(r() * 4)] })
        wg.position.set(side * (w / 2), f * fh + 2.15, z)
        wg.rotation.y = side * Math.PI / 2
        g.add(wg)
      }
      // 落水管
      const px = side * (w / 2 + 0.08)
      cyl(g, 0.06, 0.06, H - 0.3, 6, '#6f7478', px, (H - 0.3) / 2 + 0.15, d / 2 - 0.25, { cast: false })
      box(g, 0.22, 0.2, 0.22, '#6f7478', px, H - 0.1, d / 2 - 0.25, { cast: false })
      // 空调外机（生活气息）
      if (r() < 0.55) {
        const ac = new THREE.Group(); ac.position.set(side * (w / 2 + 0.3), fh * (1 + Math.floor(r() * (floors - 1))) + 1.0, -d / 4); ac.rotation.y = side * Math.PI / 2; g.add(ac)
        box(ac, 0.8, 0.55, 0.3, '#ecebe6', 0, 0, 0)
        const fan = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), mat('#3a3a3a')); fan.position.set(-0.12, 0, 0.16); ac.add(fan)
        box(ac, 0.9, 0.04, 0.4, iron().color, 0, -0.3, 0, { material: iron() })
      }
    }
  }
  if (back) {
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
      const wg = windowUnit(new THREE.Group(), 0, 0, 0, { trim, lit: r() < 0.15 })
      wg.position.set(-w / 2 + (b + 0.5) * bayW, f * fh + 2.15, -d / 2)
      wg.rotation.y = Math.PI
      g.add(wg)
    }
  }
  // 转角塔楼
  if (tower) {
    const tx = (tower === 'left' ? -1 : 1) * (w / 2 - 0.6)
    const tz = d / 2 - 0.6
    const tr = 1.6
    const th = H + 2.2
    const tc = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr, th, 12), wm); tc.position.set(tx, th / 2, tz); tc.castShadow = tc.receiveShadow = true; g.add(tc)
    for (let f = 0; f < floors + 1; f++) cyl(g, tr + 0.08, tr + 0.08, 0.16, 12, trim, tx, f * fh + 0.45, tz, { cast: false })
    for (let f = 0; f < floors; f++) {
      for (const a of [-0.6, 0.15, 0.9]) {
        const wg = windowUnit(new THREE.Group(), 0, 0, 0, { trim, w: 0.7, h: 1.4, lit: r() < 0.3, sill: false, style: 'arch' })
        wg.position.set(tx + Math.sin(a) * tr, f * fh + 2.1, tz + Math.cos(a) * tr)
        wg.rotation.y = a
        g.add(wg)
      }
    }
    cyl(g, tr + 0.3, tr + 0.3, 0.32, 12, trim, tx, th, tz)
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; box(g, 0.1, 0.1, 0.12, trim, tx + Math.sin(a) * (tr + 0.1), th - 0.22, tz + Math.cos(a) * (tr + 0.1), { ry: a, cast: false }) }
    const c = cone(g, tr + 0.35, 3.2, 12, roof, tx, th + 0.16, tz); c.material = rm
    cyl(g, 0.04, 0.04, 1.0, 4, P.iron, tx, th + 3.8, tz)
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), mat('#d9b25a', { metalness: 0.7, roughness: 0.3 })); ball.position.set(tx, th + 4.3, tz); g.add(ball)
  }
  // 屋顶平台信息 + 屋顶杂物（太阳能热水器、水箱、鸽子笼、晾衣绳、小菜园……）
  let roofTop
  if (roofStyle === 'hip') { const h = Math.min(w, d) * 0.34; roofTop = { y: H + 0.27 + h, hw: w / 2 + 0.45 - h * 0.9, hd: d / 2 + 0.45 - h * 0.9, flat: false } }
  else if (roofStyle === 'flat') roofTop = { y: H + 0.46, hw: w / 2 - 0.4, hd: d / 2 - 0.4, flat: true }
  else roofTop = { y: H + 2.85, hw: (w - 0.6) / 2 + 0.2 - 0.81, hd: (d - 0.6) / 2 + 0.2 - 0.81, flat: false }
  g.userData.roof = roofTop
  if (opts.roofClutter !== false) addRoofClutter(g, roofTop, w, d, r)
  g.userData.height = H
  return g
}

function addRoofClutter(g, R, w, d, r) {
  if (R.flat) {
    // 平屋顶：生活气最足
    pigeonCoop(g, -w / 2 + 1.4, R.y, -d / 2 + 1.2, 0)
    roofGarden(g, -w / 2 + 1.6, R.y, d / 2 - 0.9, 1.6)
    solarHeater(g, w * 0.2, R.y + 1.8, d / 2 - 1.2, Math.PI)
    laundry(g, new THREE.Vector3(-w / 2 + 0.6, R.y + 1.5, 0.4), new THREE.Vector3(w * 0.05, R.y + 1.5, 0.6), Math.floor(r() * 6))
    for (const s of [-1, 1]) cyl(g, 0.03, 0.03, 1.5, 4, '#777', s > 0 ? w * 0.05 : -w / 2 + 0.6, R.y + 0.75, s > 0 ? 0.6 : 0.4, { cast: false })
    return
  }
  if (R.hw < 0.9 || R.hd < 0.9) { antenna(g, 0, R.y, 0); return }
  const pick = r()
  if (pick < 0.45) solarHeater(g, 0, R.y, 0.2, r() > 0.5 ? 0 : Math.PI)
  else if (pick < 0.7) waterTank(g, -R.hw * 0.4, R.y, 0)
  else if (pick < 0.85) pigeonCoop(g, 0, R.y, 0, r() * 0.4)
  else roofGarden(g, 0, R.y, 0, Math.min(2, R.hw * 1.6))
  if (r() < 0.5) antenna(g, R.hw * 0.6, R.y, -R.hd * 0.5)
}

function shopFront(g, w, d, trim, shop) {
  const sw = w - 1.2
  const panes = 4
  // 木质橱窗框
  const frameMat = mat(shop.frame || '#3d5a4a', { tex: 'wood' })
  useMat(g, sw + 0.3, 2.9, 0.12, frameMat, 0, 2.05, d / 2 + 0.03)
  for (let i = 0; i < panes; i++) {
    const px = -sw / 2 + (i + 0.5) * (sw / panes)
    const isDoor = i === 1
    box(g, sw / panes - 0.2, isDoor ? 2.3 : 1.7, 0.05, null, px, isDoor ? 1.8 : 2.15, d / 2 + 0.1, { material: isDoor ? mat('#3a2a22') : warmGlass(), cast: false })
    if (!isDoor) {
      box(g, sw / panes - 0.2, 0.06, 0.06, '#e8dcc0', px, 2.6, d / 2 + 0.13, { cast: false })
      useMat(g, sw / panes - 0.1, 0.55, 0.14, frameMat, px, 0.95, d / 2 + 0.1)
      // 橱窗里的小货品
      for (let k = 0; k < 3; k++) box(g, 0.25, 0.3 + k * 0.08, 0.2, ['#d9a441', '#b85c45', '#6f9a7a'][k], px - 0.35 + k * 0.35, 1.45 + k * 0.04, d / 2 - 0.15, { cast: false })
    } else {
      box(g, sw / panes - 0.35, 1.0, 0.03, null, px, 2.1, d / 2 + 0.13, { material: warmGlass(), cast: false })
    }
  }
  // 招牌（带框）
  useMat(g, Math.min(sw, 5.4) + 0.24, 0.95, 0.12, frameMat, 0, 3.95, d / 2 + 0.06)
  sign(g, shop.name, Math.min(sw, 5.4), 0.78, 0, 3.95, d / 2 + 0.13, 0, { bg: shop.signBg || '#2f4a3e', fg: shop.signFg || '#f6dfa0', w: 768, h: 112, font: 'bold 76px', border: '#d9b25a' })
  // 条纹遮阳篷（布质，带垂边）
  const stripes = 10
  for (let i = 0; i < stripes; i++) {
    const c = i % 2 ? '#f6efe0' : (shop.awning || P.vintageBlue)
    const sx = -sw / 2 + (i + 0.5) * (sw / stripes)
    box(g, sw / stripes + 0.01, 0.05, 1.5, c, sx, 3.25, d / 2 + 0.72, { rx: 0.35 })
    box(g, sw / stripes + 0.01, 0.22, 0.03, c, sx, 2.92, d / 2 + 1.42, { cast: false })
  }
  for (const s of [-1, 1]) useMat(g, 0.04, 0.04, 1.5, iron(), s * sw / 2, 3.2, d / 2 + 0.72, { rx: 0.35, cast: false })
}

/** 远岸的楼（低细节，但同样带贴图） */
export function farBlock(parent, x, z, w, d, h, color, seed) {
  const r = rng(seed)
  useMat(parent, w, h, d, wallMat(color), x, h / 2, z, { cast: false })
  const roof = hipRoof(parent, w, d, Math.min(w, d) * 0.3, r() > 0.5 ? P.roof : P.roofDark, x, h, z, 0.2)
  roof.material = roofMat(r() > 0.5 ? P.roof : P.roofDark)
  box(parent, w + 0.3, 0.25, d + 0.3, P.white, x, h - 0.1, z, { cast: false })
  const rows = Math.floor(h / 3), cols = Math.floor(w / 2.5)
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    if (r() < 0.2) continue
    box(parent, 0.9, 1.3, 0.1, null, x - w / 2 + (j + 0.5) * (w / cols), 2 + i * 3, z + d / 2 + 0.05, { material: r() < 0.3 ? warmGlass() : coolGlass(), cast: false, receive: false })
  }
}

/** 民园风格红砖拱廊（两层连续券，像缩小的“斗兽场”立面），沿本地 x 方向，面朝 +z */
export function brickArcade(parent, length, height = 7.2) {
  const g = new THREE.Group(); parent.add(g)
  const bm = mat('#ffffff', { tex: 'brick' })
  const bay = 3.0
  const n = Math.round(length / bay)
  const L = n * bay
  for (let tier = 0; tier < 2; tier++) {
    const y0 = tier * height / 2, th = height / 2
    const r = bay / 2 - 0.45
    for (let i = 0; i <= n; i++) {
      const x = -L / 2 + i * bay
      useMat(g, 0.8, th, 0.9, bm, x, y0 + th / 2, 0)
      box(g, 0.32, th - 0.2, 0.15, P.stone, x, y0 + th / 2, 0.5, { cast: false })
    }
    for (let i = 0; i < n; i++) {
      const cx = -L / 2 + (i + 0.5) * bay
      const spring = y0 + th - r - 0.55
      archRing(g, cx, spring, 0, r, 0.32, 0.92, P.stone, 11)
      useMat(g, bay, th - (spring - y0) - r - 0.3, 0.9, bm, cx, (y0 + th + spring + r + 0.3) / 2, 0)
      for (const s of [-1, 1]) useMat(g, 0.35, r * 0.95, 0.88, bm, cx + s * (r + 0.12), spring + r * 0.48, 0, { cast: false })
      if (tier === 1) ironRail(g, cx, y0, 0.3, bay - 0.8)
    }
    box(g, L + 0.6, 0.3, 1.2, P.stone, 0, y0 + th + 0.1, 0)
  }
  // 檐口与旗杆
  box(g, L + 0.8, 0.5, 1.4, P.stone, 0, height + 0.5, 0)
  return g
}
