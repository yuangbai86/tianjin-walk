import * as THREE from 'three'
import { PALETTE as P, mat } from '../core/Materials.js'
import { box, cyl, sphere, sign, textTexture, hipRoof } from './kit.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** 行道树（法桐/国槐印象）：斑驳树干 + 多团树冠 + 铸铁树池篦子。返回 {group, canopy} */
export function tree(parent, x, z, s = 1, seed = 0, dynParent = parent) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  parent.add(g)
  const bark = mat('#8a7a68', { tex: 'stone', texScale: 1.6 })
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.22 * s, 3.0 * s, 7), bark)
  trunk.position.y = 1.5 * s; trunk.castShadow = true; g.add(trunk)
  // 分叉
  const r = (k) => Math.abs(Math.sin(seed * 12.9898 + k * 78.233)) % 1
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + seed
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.1 * s, 1.5 * s, 5), bark)
    br.position.set(Math.cos(a) * 0.35 * s, 3.1 * s, Math.sin(a) * 0.35 * s)
    br.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55)
    br.castShadow = true; g.add(br)
  }
  // 树池：石沿 + 铸铁篦子
  box(g, 1.4, 0.1, 1.4, P.stoneDark, 0, 0.05, 0, { cast: false, material: mat(P.stoneDark, { tex: 'stone' }) })
  box(g, 1.2, 0.11, 1.2, '#4a4038', 0, 0.06, 0, { cast: false })
  for (let i = 0; i < 6; i++) box(g, 1.15, 0.02, 0.04, '#2f3436', 0, 0.12, -0.5 + i * 0.2, { cast: false })
  // 树冠：多团合并为一个顶点着色网格（一次绘制、可整体摆动）
  const cols = [new THREE.Color('#93c46f'), new THREE.Color('#78b062'), new THREE.Color('#b2d47e'), new THREE.Color('#a3c96a')]
  const geos = []
  const n = 9
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + seed
    const rad = i === 0 ? 0 : 0.7 + r(i) * 0.6
    const sz = (i === 0 ? 1.25 : 0.65 + r(i + 9) * 0.45) * s
    const ge = new THREE.IcosahedronGeometry(sz, 1)
    ge.rotateX(r(i) * 3); ge.rotateY(r(i + 1) * 3)
    ge.scale(1, 0.82, 1)
    ge.translate(Math.cos(a) * rad * s, (0.9 + r(i + 3) * 1.1 - (i === 0 ? 0 : 0.2)) * s, Math.sin(a) * rad * s)
    const c = cols[(((Math.floor(i + seed)) % 4) + 4) % 4]
    const arr = new Float32Array(ge.attributes.position.count * 3)
    for (let k = 0; k < arr.length; k += 3) { const v = 1.22 + ((k * 7 + i) % 5) * 0.06; arr[k] = c.r * v; arr[k + 1] = c.g * v; arr[k + 2] = c.b * v }
    ge.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    geos.push(ge)
  }
  const canopy = new THREE.Mesh(mergeGeometries(geos), mat('#ffffff', { tex: 'leaf', vertexColors: true, grime: false }))
  canopy.castShadow = true; canopy.receiveShadow = true
  canopy.position.set(x, 3.0 * s, z)
  canopy.userData.noMerge = true
  dynParent.add(canopy)
  canopy.userData.phase = seed * 1.7 + x * 0.13
  return { group: g, canopy }
}

export function hedge(parent, x, z, w, d, h = 0.9) {
  const lm = mat('#7fb062', { tex: 'leaf', grime: false })
  box(parent, w, h, d, null, x, h / 2, z, { material: lm })
  const along = w >= d
  const n = Math.floor(Math.max(w, d) / 0.9)
  for (let i = 0; i < n; i++) {
    const t = -Math.max(w, d) / 2 + 0.45 + i * 0.9
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mat('#8cbd6c', { tex: 'leaf', grime: false }))
    m.position.set(x + (along ? t : 0), h * 0.85, z + (along ? 0 : t)); m.scale.set(1, 0.65, 1); m.castShadow = true; parent.add(m)
  }
}

/** 欧式双头复古路灯（海河沿岸、五大道常见的铸铁灯柱印象） */
export function lamp(parent, x, z, twin = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g)
  const ironM = mat('#2b3133', { roughness: 0.45, metalness: 0.5 })
  const glassM = mat('#ffe9bd', { emissive: '#ffcf80', emissiveIntensity: 0.75, roughness: 0.2 })
  const prof = [[0.2, 0], [0.22, 0.1], [0.16, 0.2], [0.17, 0.5], [0.1, 0.62], [0.09, 0.9], [0.06, 1.0], [0.06, 3.6], [0.09, 3.7], [0.05, 3.8]]
  const lathe = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 8), ironM)
  lathe.castShadow = true; g.add(lathe)
  const heads = twin ? [-1, 1] : [0]
  for (const s of heads) {
    if (twin) {
      const arm = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 10, Math.PI), ironM)
      arm.position.set(s * 0.3, 3.75, 0); arm.rotation.z = 0; g.add(arm)
    }
    const hx = s * 0.6
    const hy = twin ? 3.55 : 3.95
    box(g, 0.3, 0.42, 0.3, null, hx, hy, 0, { material: glassM, cast: false })
    for (const a of [-1, 1]) for (const b of [-1, 1]) box(g, 0.03, 0.44, 0.03, null, hx + a * 0.15, hy, b * 0.15, { material: ironM, cast: false })
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.22, 4), ironM); cap.position.set(hx, hy + 0.32, 0); cap.rotation.y = Math.PI / 4; g.add(cap)
    const fin = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), ironM); fin.position.set(hx, hy + 0.47, 0); g.add(fin)
    box(g, 0.2, 0.06, 0.2, null, hx, hy - 0.24, 0, { material: ironM, cast: false })
  }
  return g
}

/** 长椅，座面朝本地 +z。返回 group 与坐点 */
export function bench(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  const wd = mat(P.wood, { tex: 'wood' })
  for (let i = 0; i < 3; i++) box(g, 1.8, 0.06, 0.13, null, 0, 0.45, -0.18 + i * 0.16, { material: wd })
  for (let i = 0; i < 2; i++) box(g, 1.8, 0.12, 0.05, null, 0, 0.66 + i * 0.18, -0.3, { rx: -0.15, material: wd })
  for (const sx of [-0.78, 0.78]) {
    box(g, 0.06, 0.45, 0.06, P.iron, sx, 0.22, 0.12)
    box(g, 0.06, 0.8, 0.06, P.iron, sx, 0.4, -0.27)
    box(g, 0.06, 0.06, 0.46, P.iron, sx, 0.62, -0.05)
  }
  return g
}

export function bicycle(parent, x, z, ry, color, dynParent = null) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  const wg = new THREE.TorusGeometry(0.32, 0.035, 6, 14)
  for (const wx of [-0.52, 0.52]) {
    const w = new THREE.Mesh(wg, mat('#2d2d2d')); w.position.set(wx, 0.34, 0); w.castShadow = true; g.add(w)
    cyl(g, 0.03, 0.03, 0.1, 6, '#888', wx, 0.34, 0, { rx: Math.PI / 2 })
  }
  const tube = (ax, ay, bx, by, r = 0.025) => {
    const len = Math.hypot(bx - ax, by - ay)
    const m = cyl(g, r, r, len, 5, color, (ax + bx) / 2, (ay + by) / 2, 0)
    m.rotation.z = Math.atan2(bx - ax, by - ay) * -1
    return m
  }
  tube(-0.52, 0.34, -0.05, 0.36); tube(-0.05, 0.36, 0.42, 0.72); tube(-0.15, 0.78, -0.05, 0.36)
  tube(-0.15, 0.78, 0.42, 0.72); tube(-0.52, 0.34, -0.15, 0.78); tube(0.52, 0.34, 0.42, 0.72); tube(0.42, 0.72, 0.4, 0.9)
  box(g, 0.25, 0.06, 0.12, '#3a2a22', -0.17, 0.83, 0)
  box(g, 0.05, 0.04, 0.55, '#444', 0.4, 0.92, 0)
  // 车筐
  box(g, 0.3, 0.2, 0.35, '#c9b28a', 0.6, 0.85, 0)
  const bell = sphere(g, 0.035, P.signYellow, 0.4, 0.96, 0.18, { metalness: 0.6, roughness: 0.3, detail: 0 })
  g.userData.bell = bell
  if (dynParent) { g.updateMatrixWorld(true); dynParent.attach(bell); bell.userData.noMerge = true }
  return g
}

export function flowerBox(parent, x, z, ry = 0, w = 1.4, dynParent = parent) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  const wd = mat(P.wood, { tex: 'wood' })
  box(g, w, 0.45, 0.5, null, 0, 0.225, 0, { material: wd })
  box(g, w + 0.08, 0.06, 0.58, P.woodLight, 0, 0.46, 0)
  box(g, w - 0.1, 0.06, 0.4, '#5e4636', 0, 0.47, 0, { cast: false })
  // 花朵合并成一个顶点着色网格（一次绘制，可整体轻摇）
  const fc = ['#e86f6f', '#f2c14e', '#f6a6c1', '#fbf6ec', '#c97bd6'].map((c) => new THREE.Color(c))
  const green = new THREE.Color(P.leafDark), leafC = new THREE.Color(P.leaf)
  const geos = []
  const add = (geo, c) => {
    const arr = new Float32Array(geo.attributes.position.count * 3)
    for (let k = 0; k < arr.length; k += 3) { arr[k] = c.r; arr[k + 1] = c.g; arr[k + 2] = c.b }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    for (const n of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(n)) geo.deleteAttribute(n)
    geos.push(geo.index ? geo.toNonIndexed() : geo)
  }
  const n = Math.round(w / 0.22)
  for (let i = 0; i < n; i++) {
    const fx = -w / 2 + 0.12 + i * ((w - 0.24) / (n - 1))
    const fz = (i % 2 ? 0.08 : -0.08)
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 3).translate(fx, 0.12, fz), green)
    add(new THREE.IcosahedronGeometry(0.08, 0).scale(1, 0.6, 1).translate(fx, 0.1, fz), leafC)
    add(new THREE.IcosahedronGeometry(0.075, 0).translate(fx, 0.27, fz), fc[i % fc.length])
  }
  const flowers = new THREE.Mesh(mergeGeometries(geos), mat('#ffffff', { vertexColors: true }))
  flowers.castShadow = true
  g.updateMatrixWorld(true)
  flowers.position.set(0, 0.48, 0)
  g.add(flowers)
  dynParent.attach(flowers)
  flowers.userData.noMerge = true
  g.userData.flowers = flowers
  return g
}

/** 海河石栏杆：方柱 + 宝瓶栏杆 + 扶手，柱间加铸铁花饰。沿 x 方向 */
const vaseGeo = new THREE.LatheGeometry([[0.07, 0], [0.09, 0.06], [0.06, 0.16], [0.11, 0.36], [0.06, 0.56], [0.08, 0.62], [0.07, 0.66]].map(([r, y]) => new THREE.Vector2(r, y)), 7)
export function railingX(parent, x0, x1, z, opts = {}) {
  const len = x1 - x0
  const n = Math.max(1, Math.round(len / 2.4))
  const stone = mat(P.stone, { tex: 'stone' })
  for (let i = 0; i <= n; i++) {
    const x = x0 + (i / n) * len
    box(parent, 0.34, 1.1, 0.34, null, x, 0.55, z, { material: stone })
    box(parent, 0.44, 0.1, 0.44, P.stoneDark, x, 1.14, z)
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), stone)
    top.position.set(x, 1.19, z); top.castShadow = true; parent.add(top)
  }
  box(parent, len, 0.12, 0.26, null, (x0 + x1) / 2, 0.98, z, { material: stone })
  box(parent, len, 0.14, 0.26, null, (x0 + x1) / 2, 0.07, z, { material: stone })
  const vm = mat(P.stone)
  const count = Math.round(len / 0.26)
  for (let i = 0; i < count; i++) {
    const x = x0 + ((i + 0.5) / count) * len
    if (opts.ornament && Math.abs(((x - x0) % (len / n)) - len / n / 2) < 0.4) continue
    const v = new THREE.Mesh(vaseGeo, vm); v.position.set(x, 0.14, z); v.castShadow = true; parent.add(v)
  }
  if (opts.ornament) for (let i = 0; i < n; i++) {
    const cx = x0 + ((i + 0.5) / n) * len
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 5, 14), mat('#2b3133', { metalness: 0.5, roughness: 0.4 }))
    t.position.set(cx, 0.55, z); parent.add(t)
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 4, 10), mat('#c9a24a', { metalness: 0.6, roughness: 0.35 }))
    t2.position.set(cx, 0.55, z); parent.add(t2)
  }
}
export function railingZ(parent, z0, z1, x) {
  const g = new THREE.Group(); g.position.set(x, 0, 0); g.rotation.y = Math.PI / 2; parent.add(g)
  railingX(g, -z1, -z0, 0)
  return g
}

/** 天津风格蓝色路牌（双面） */
export function streetSign(parent, x, z, plates) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g)
  cyl(g, 0.05, 0.06, 3.0, 6, '#5a6870', 0, 1.5, 0)
  plates.forEach((p, i) => {
    const y = 2.75 - i * 0.48
    const pg = new THREE.Group(); pg.position.set(0, y, 0); pg.rotation.y = p.ry ?? 0; g.add(pg)
    box(pg, 1.5, 0.42, 0.05, '#2c5d8c', 0.7, 0, 0)
    const opts = { bg: '#2c5d8c', fg: '#ffffff', w: 512, h: 144, font: 'bold 64px', border: '#ffffff', sub: p.sub }
    sign(pg, p.text, 1.44, 0.38, 0.7, 0, 0.03, 0, opts)
    sign(pg, p.back || p.text, 1.44, 0.38, 0.7, 0, -0.03, Math.PI, opts)
  })
  return g
}

/** 立式指示牌（如观景点） */
export function boardSign(parent, x, z, ry, lines, opts = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  const w = opts.w ?? 1.6, h = opts.h ?? 1.0, y = opts.y ?? 1.4
  box(g, 0.08, y + h / 2, 0.08, P.wood, -w / 2 + 0.1, (y + h / 2) / 2, -0.05)
  box(g, 0.08, y + h / 2, 0.08, P.wood, w / 2 - 0.1, (y + h / 2) / 2, -0.05)
  box(g, w + 0.12, h + 0.12, 0.06, P.woodLight, 0, y, -0.03)
  sign(g, lines, w, h, 0, y, 0.01, 0, { bg: opts.bg || '#fbf1dc', fg: opts.fg || '#7a3326', w: 512, h: Math.round(512 * h / w), font: opts.font || 'bold 64px', border: opts.border || '#b85c45', sub: opts.sub })
  return g
}

/** 煎饼果子摊：正面（顾客侧）朝本地 +z */
export function jianbingStall(parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  // 三轮小推车
  box(g, 2.4, 0.9, 1.1, '#e9e1d0', 0, 0.55, 0)
  box(g, 2.5, 0.08, 1.2, '#c9c2b4', 0, 1.04, 0)
  box(g, 2.42, 0.25, 1.12, P.vintageBlue, 0, 0.82, 0.0)
  for (const sx of [-0.9, 0.9]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12), mat('#2d2d2d'))
    w.position.set(sx, 0.2, 0.56); g.add(w)
  }
  // 鏊子（圆铁板）
  cyl(g, 0.42, 0.42, 0.06, 16, '#2b2b2b', -0.4, 1.12, -0.05, { metalness: 0.4, roughness: 0.5 })
  // 绿豆面煎饼（直径约 40cm）+ 竹刮子
  const crepe = cyl(g, 0.22, 0.22, 0.012, 16, '#e3d695', -0.4, 1.16, -0.05, { cast: false })
  const scraper = new THREE.Group(); scraper.position.set(-0.4, 1.19, -0.05); g.add(scraper)
  box(scraper, 0.28, 0.012, 0.03, '#c9a46a', 0.0, 0, 0)
  box(scraper, 0.02, 0.012, 0.16, '#c9a46a', 0.0, 0.005, 0.08)
  g.userData.scraper = scraper
  // 玻璃罩
  box(g, 0.04, 0.5, 1.0, null, 0.45, 1.33, 0, { material: mat('#cfe6ef', { transparent: true, opacity: 0.35, roughness: 0.1 }), cast: false })
  // 面糊桶、鸡蛋筐、酱料瓶、葱花
  cyl(g, 0.14, 0.12, 0.26, 10, '#f3f0e8', 0.75, 1.21, -0.25)
  const ladle = new THREE.Group(); ladle.position.set(0.75, 1.36, -0.25); g.add(ladle)
  cyl(ladle, 0.015, 0.015, 0.4, 4, P.wood, 0, 0.1, 0, { rz: 0.4 })
  box(g, 0.3, 0.1, 0.22, '#c9a36a', 0.8, 1.13, 0.2)
  for (let i = 0; i < 5; i++) sphere(g, 0.045, '#f7ead2', 0.7 + (i % 3) * 0.08, 1.2, 0.15 + Math.floor(i / 3) * 0.1, { detail: 0, sy: 1.25 })
  cyl(g, 0.05, 0.05, 0.18, 6, '#7a2c1d', 1.05, 1.17, -0.3)
  cyl(g, 0.05, 0.05, 0.18, 6, '#c33d2a', 1.05, 1.17, -0.1)
  cyl(g, 0.11, 0.1, 0.08, 10, '#6aa452', 1.0, 1.12, 0.32)
  // 馃箅儿、油条堆
  for (let i = 0; i < 4; i++) box(g, 0.3, 0.02, 0.22, '#e3b066', 0.15, 1.1 + i * 0.025, 0.32)
  for (let i = 0; i < 3; i++) cyl(g, 0.04, 0.04, 0.3, 5, '#d8913f', -0.15 + i * 0.09, 1.12, 0.32, { rz: Math.PI / 2 })
  // 炒勺/小锅
  const wok = cyl(g, 0.22, 0.12, 0.12, 12, '#3a3a3a', -1.0, 1.14, 0.3, { metalness: 0.4, roughness: 0.4 })
  cyl(g, 0.02, 0.02, 0.35, 4, P.wood, -1.3, 1.17, 0.3, { rz: Math.PI / 2 })
  // 遮阳棚
  for (const sx of [-1.15, 1.15]) for (const sz of [-0.5, 0.5]) box(g, 0.05, 1.3, 0.05, '#cfcfcf', sx, 1.7, sz, { cast: false })
  for (let i = 0; i < 6; i++) box(g, 0.45, 0.06, 1.6, i % 2 ? P.white : P.red, -1.125 + i * 0.45, 2.38, 0.15, { rx: 0.12 })
  // 招牌
  sign(g, ['煎饼果子'], 2.2, 0.5, 0, 2.15, 0.62, 0, { bg: '#c9472f', fg: '#fff3d6', w: 640, h: 144, font: 'bold 96px', border: '#f2c14e', glow: 0.25 })
  sign(g, ['煎饼果子'], 2.2, 0.5, 0, 2.15, -0.62, Math.PI, { bg: '#c9472f', fg: '#fff3d6', w: 640, h: 144, font: 'bold 96px', border: '#f2c14e', glow: 0.25 })
  // 菜单板
  const mg = new THREE.Group(); mg.position.set(1.55, 0, 0.55); mg.rotation.y = -0.4; g.add(mg)
  box(mg, 0.05, 1.0, 0.05, P.wood, -0.3, 0.5, -0.1, { rx: 0.15 })
  box(mg, 0.05, 1.0, 0.05, P.wood, 0.3, 0.5, -0.1, { rx: 0.15 })
  const menu = textTexture(['今日早点', '煎饼果子 · 油条 / 馃箅儿', '加个鸡蛋', '豆浆 · 嘎巴菜', '— 不收钱 · 光看看也行 —'], { w: 512, h: 600, bg: '#26302c', fg: '#f6efd8', font: 'bold 44px', border: '#c9a36a' })
  const mm = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.9), new THREE.MeshStandardMaterial({ map: menu, roughness: 0.9, emissive: 0xffffff, emissiveMap: menu, emissiveIntensity: 0.12 }))
  mm.position.set(0, 0.85, 0.0); mm.rotation.x = -0.15; mm.userData.noMerge = true; mg.add(mm)
  // 顾客小板凳 + 小桌
  const stools = [['#d0573f', 0.4, 1.6], ['#3f6f9a', -0.6, 1.9], ['#d0573f', 1.3, 2.1]]
  for (const [c, sx, sz] of stools) {
    box(g, 0.32, 0.05, 0.32, c, sx, 0.32, sz)
    for (const a of [-1, 1]) for (const b of [-1, 1]) box(g, 0.04, 0.3, 0.04, c, sx + a * 0.13, 0.15, sz + b * 0.13, { cast: false })
  }
  box(g, 0.7, 0.05, 0.5, '#e9e1d0', 0.4, 0.5, 2.35)
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(g, 0.04, 0.48, 0.04, '#999', 0.4 + a * 0.3, 0.24, 2.35 + b * 0.2, { cast: false })
  cyl(g, 0.06, 0.05, 0.1, 8, '#f3f0e8', 0.25, 0.58, 2.3)
  g.userData.crepe = crepe
  g.userData.ladle = ladle
  g.userData.steamLocal = new THREE.Vector3(-0.4, 1.25, -0.05)
  return g
}

/** 拱形步行小桥：沿 x 跨越 [x0,x1]，桥面中心 z，宽 w */
export function footbridge(parent, x0, x1, z, w, peak) {
  const g = new THREE.Group(); parent.add(g)
  const seg = 14
  const L = x1 - x0
  const hAt = (t) => peak * Math.sin(Math.PI * t)
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg, t1 = (i + 1) / seg
    const xa = x0 + t0 * L, xb = x0 + t1 * L
    const ya = hAt(t0), yb = hAt(t1)
    const len = Math.hypot(xb - xa, yb - ya)
    const ang = Math.atan2(yb - ya, xb - xa)
    const deck = box(g, len + 0.04, 0.2, w, null, (xa + xb) / 2, (ya + yb) / 2 - 0.1, z, { rz: ang, material: mat('#e6dccb', { tex: 'paving', texScale: 2.5 }) })
    // 拱底
    const depth = 0.25 + (1 - Math.sin(Math.PI * (t0 + t1) / 2)) * 1.0
    box(g, len + 0.04, depth, w - 0.3, P.stoneDark, (xa + xb) / 2, (ya + yb) / 2 - 0.2 - depth / 2, z, { rz: ang })
    for (const side of [-1, 1]) {
      box(g, len + 0.02, 0.08, 0.1, P.red, (xa + xb) / 2, (ya + yb) / 2 + 0.95, z + side * (w / 2 - 0.05), { rz: ang })
      box(g, 0.08, 0.95, 0.08, P.red, xa, ya + 0.47, z + side * (w / 2 - 0.05))
    }
    deck.receiveShadow = true
  }
  for (const side of [-1, 1]) {
    box(g, 0.24, 1.2, 0.24, P.stone, x1, 0.6, z + side * (w / 2 - 0.05))
    box(g, 0.24, 1.2, 0.24, P.stone, x0, 0.6, z + side * (w / 2 - 0.05))
  }
  return { group: g, height: (x) => (x < x0 || x > x1) ? 0 : hAt((x - x0) / L) }
}

/** 游船 */
export function boat(parent) {
  const g = new THREE.Group(); parent.add(g)
  box(g, 6, 0.8, 2.2, P.white, 0, 0.1, 0)
  box(g, 1.6, 0.8, 1.55, P.white, 3.55, 0.1, 0, { ry: Math.PI / 4 })
  box(g, 6.2, 0.18, 2.3, P.vintageBlue, 0.1, 0.5, 0)
  box(g, 3.6, 1.2, 1.8, P.cream, -0.4, 1.1, 0)
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) box(g, 0.5, 0.5, 0.05, P.glass, -1.9 + i * 0.75, 1.25, s * 0.91, { cast: false })
  box(g, 4.0, 0.12, 2.2, P.red, -0.4, 1.76, 0)
  cyl(g, 0.03, 0.03, 1.4, 4, P.iron, -2.2, 2.4, 0)
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42, 6, 1), mat(P.red, { side: THREE.DoubleSide, flat: false }))
  flag.position.set(-2.55, 2.85, 0)
  flag.userData.noMerge = true
  g.add(flag)
  g.userData.flag = flag
  return g
}

export function telescope(parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  cyl(g, 0.22, 0.28, 0.12, 10, P.iron, 0, 0.06, 0)
  cyl(g, 0.06, 0.08, 1.1, 8, P.vintageBlue, 0, 0.6, 0)
  const head = new THREE.Group(); head.position.y = 1.2; g.add(head)
  cyl(head, 0.11, 0.15, 0.55, 10, P.vintageBlue, 0, 0, -0.08, { rx: Math.PI / 2 - 0.15 })
  cyl(head, 0.13, 0.13, 0.08, 10, P.signYellow, 0, 0.04, -0.38, { rx: Math.PI / 2 - 0.15, metalness: 0.5, roughness: 0.35 })
  box(head, 0.36, 0.2, 0.2, P.vintageBlue, 0, -0.08, 0.1)
  return g
}

export function trashBin(parent, x, z) {
  cyl(parent, 0.25, 0.22, 0.8, 10, P.green, x, 0.4, z)
  cyl(parent, 0.27, 0.27, 0.06, 10, '#3c6b48', x, 0.83, z)
}
export function mailbox(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  box(g, 0.5, 1.0, 0.4, '#3f7a4f', 0, 0.75, 0)
  box(g, 0.56, 0.1, 0.46, '#2f5e3c', 0, 1.3, 0)
  box(g, 0.3, 0.04, 0.02, '#1d2f22', 0, 1.05, 0.21, { cast: false })
  box(g, 0.1, 0.25, 0.1, '#2f5e3c', 0, 0.12, 0)
}
export function bollard(parent, x, z) {
  cyl(parent, 0.1, 0.12, 0.7, 8, P.stoneDark, x, 0.35, z)
  sphere(parent, 0.12, P.stoneDark, x, 0.72, z, { detail: 0 })
}

/** 五大道式院墙：砖垛 + 石帽 + 铸铁栅栏，沿本地 x，留出门口 */
export function yardFence(parent, x0, x1, gaps = []) {
  const g = new THREE.Group(); parent.add(g)
  const brick = mat('#ffffff', { tex: 'brick' })
  const ironM = mat('#2b3133', { metalness: 0.45, roughness: 0.5 })
  const gold = mat('#c9a24a', { metalness: 0.6, roughness: 0.35 })
  const inGap = (x) => gaps.some(([a, b]) => x > a && x < b)
  const step = 2.2
  const n = Math.max(1, Math.round((x1 - x0) / step))
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * (x1 - x0) / n
    const nearGap = gaps.some(([a, b]) => Math.abs(x - a) < 0.3 || Math.abs(x - b) < 0.3)
    if (inGap(x) && !nearGap) continue
    box(g, 0.42, 1.35, 0.42, null, x, 0.675, 0, { material: brick })
    box(g, 0.52, 0.1, 0.52, P.stone, x, 1.4, 0)
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), mat(P.stone)); ball.position.set(x, 1.55, 0); ball.castShadow = true; g.add(ball)
  }
  for (let i = 0; i < n; i++) {
    const a = x0 + i * (x1 - x0) / n, b = x0 + (i + 1) * (x1 - x0) / n
    if (inGap((a + b) / 2)) continue
    const L = b - a - 0.42, cx = (a + b) / 2
    box(g, L, 0.45, 0.3, null, cx, 0.225, 0, { material: brick })
    box(g, L, 0.06, 0.34, P.stone, cx, 0.48, 0, { cast: false })
    box(g, L, 0.04, 0.04, null, cx, 1.25, 0, { material: ironM, cast: false })
    const bars = Math.round(L / 0.14)
    for (let k = 0; k < bars; k++) {
      const bx = a + 0.21 + (k + 0.5) * L / bars
      box(g, 0.025, 0.85, 0.025, null, bx, 0.92, 0, { material: ironM, cast: false })
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), gold); tip.position.set(bx, 1.38, 0); g.add(tip)
    }
  }
  return g
}

/** 井盖 */
export function manhole(parent, x, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 16), mat('#4d4a46', { tex: 'sett', texScale: 6, metalness: 0.3, roughness: 0.6 }))
  m.position.set(x, 0.035, z); m.receiveShadow = true; parent.add(m)
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 4, 18), mat('#3a3734')); r.rotation.x = Math.PI / 2; r.position.set(x, 0.04, z); parent.add(r)
}

/** 盲道（沿 z 方向的一条） */
export function tactileStrip(parent, x, z0, z1) {
  box(parent, 0.3, 0.03, z1 - z0, null, x, 0.035, (z0 + z1) / 2, { cast: false, material: mat('#ffffff', { tex: 'tactile', grime: false }) })
}

/** 五大道观光马车（静置候客，马会点头、甩尾） */
export function carriage(parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g)
  const red = mat('#8a2f26', { roughness: 0.5 }), black = mat('#222'), gold = mat('#d9b25a', { metalness: 0.6, roughness: 0.3 })
  // 车厢
  box(g, 1.5, 0.7, 2.2, null, 0, 1.0, 0, { material: red })
  box(g, 1.55, 0.06, 2.25, null, 0, 1.38, 0, { material: gold })
  box(g, 1.3, 0.12, 0.9, null, 0, 1.45, -0.55, { material: mat('#c8b48a') })
  box(g, 1.3, 0.6, 0.12, null, 0, 1.75, -1.0, { material: red })
  // 折叠车篷
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.4, 10, 1, true, 0, Math.PI), mat('#2a2a2a', { side: THREE.DoubleSide }))
  hood.rotation.z = Math.PI / 2; hood.rotation.y = Math.PI / 2; hood.position.set(0, 1.5, -1.0); g.add(hood)
  box(g, 1.2, 0.1, 0.5, null, 0, 1.6, 0.7, { material: mat('#c8b48a') })
  // 车轮
  for (const [wz, rr] of [[-0.75, 0.62], [0.85, 0.45]]) for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.04, 5, 18), black); w.rotation.y = Math.PI / 2; w.position.set(s * 0.82, rr, wz); w.castShadow = true; g.add(w)
    for (let i = 0; i < 6; i++) { const sp = box(g, 0.03, rr * 2, 0.03, null, s * 0.82, rr, wz, { material: gold, cast: false }); sp.rotation.x = i * Math.PI / 6 }
  }
  // 车辕
  for (const s of [-1, 1]) box(g, 0.05, 0.05, 2.2, null, s * 0.45, 0.95, 2.1, { material: black, cast: false })
  // 马
  const horse = new THREE.Group(); horse.position.set(0, 0, 2.6); g.add(horse)
  const coat = mat('#f1ece2', { flat: false })
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 1.0, 4, 10), coat); body.rotation.x = Math.PI / 2; body.position.y = 1.25; body.castShadow = true; horse.add(body)
  for (const [lx, lz] of [[-0.18, -0.45], [0.18, -0.45], [-0.18, 0.45], [0.18, 0.45]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 1.05, 6), coat); leg.position.set(lx, 0.55, lz); leg.castShadow = true; horse.add(leg)
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 6), black); hoof.position.set(lx, 0.04, lz); horse.add(hoof)
  }
  const neck = new THREE.Group(); neck.position.set(0, 1.45, 0.6); horse.add(neck)
  const nm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.8, 8), coat); nm.position.set(0, 0.3, 0.1); nm.rotation.x = 0.6; neck.add(nm)
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 4, 8), coat); head.position.set(0, 0.62, 0.42); head.rotation.x = 1.25; neck.add(head)
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), coat); ear.position.set(s * 0.07, 0.82, 0.3); neck.add(ear)
    const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), black); eye.position.set(s * 0.11, 0.7, 0.45); neck.add(eye)
  }
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.7), mat('#8a6a4a')); mane.position.set(0, 0.5, -0.05); mane.rotation.x = 0.6; neck.add(mane)
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 5), mat('#d0573f')); plume.position.set(0, 0.9, 0.25); neck.add(plume)
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 6), mat('#8a6a4a')); tail.position.set(0, 1.1, -0.75); tail.rotation.x = -0.5; horse.add(tail)
  box(horse, 0.7, 0.1, 0.5, null, 0, 1.6, 0.1, { material: red, cast: false })
  g.userData.neck = neck; g.userData.tail = tail
  return g
}

/** 解放桥印象：三孔钢桁架开启桥（灰绿色），沿本地 z 跨河 */
export function jiefangBridge(parent, length = 48, width = 9) {
  const g = new THREE.Group(); parent.add(g)
  const steel = mat('#7d958c', { metalness: 0.4, roughness: 0.55 })
  const span = length / 3
  box(g, width, 0.7, length, null, 0, 1.3, 0, { material: mat(P.stone, { tex: 'stone' }) })
  for (let k = 0; k < 3; k++) {
    const zc = -length / 2 + (k + 0.5) * span
    const hMax = k === 1 ? 5.2 : 3.6
    for (const s of [-1, 1]) {
      const x = s * (width / 2 + 0.1)
      // 上下弦
      const segs = 8
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs, t1 = (i + 1) / segs
        const h0 = 1.7 + hMax * Math.sin(Math.PI * t0) ** 0.6, h1 = 1.7 + hMax * Math.sin(Math.PI * t1) ** 0.6
        const za = zc - span / 2 + t0 * span, zb = zc - span / 2 + t1 * span
        box(g, 0.28, 0.3, Math.hypot(zb - za, h1 - h0) + 0.05, null, x, (h0 + h1) / 2, (za + zb) / 2, { material: steel, rx: -Math.atan2(h1 - h0, zb - za) })
        box(g, 0.14, h0 - 1.7, 0.14, null, x, 1.7 + (h0 - 1.7) / 2, za, { material: steel, cast: false })
        const dl = Math.hypot(zb - za, h1 - 1.7)
        box(g, 0.1, dl, 0.1, null, x, 1.7 + (h1 - 1.7) / 2, (za + zb) / 2, { material: steel, rx: Math.atan2(zb - za, h1 - 1.7) * (i % 2 ? 1 : -1), cast: false })
      }
      box(g, 0.3, 0.3, span, null, x, 1.75, zc, { material: steel })
    }
    // 顶部横撑
    for (let i = 1; i < 4; i++) box(g, width + 0.3, 0.16, 0.16, null, 0, 1.7 + hMax * Math.sin(Math.PI * i / 4) ** 0.6, zc - span / 2 + i * span / 4, { material: steel, cast: false })
    // 桥墩
    if (k < 2) box(g, width + 1, 4, 2.4, null, 0, -1, -length / 2 + (k + 1) * span, { material: mat(P.stoneDark, { tex: 'stone' }) })
  }
  return g
}
