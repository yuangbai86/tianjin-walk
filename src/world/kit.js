import * as THREE from 'three'
import { mat } from '../core/Materials.js'

// 几何体缓存：同尺寸共享
const gcache = new Map()
function geo(key, make) {
  if (!gcache.has(key)) gcache.set(key, make())
  return gcache.get(key)
}

export function box(parent, w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const g = geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d))
  const m = new THREE.Mesh(g, opts.material || mat(color, opts))
  m.position.set(x, y, z)
  if (opts.ry) m.rotation.y = opts.ry
  if (opts.rx) m.rotation.x = opts.rx
  if (opts.rz) m.rotation.z = opts.rz
  m.castShadow = opts.cast ?? true
  m.receiveShadow = opts.receive ?? true
  parent.add(m)
  return m
}

export function cyl(parent, rt, rb, h, seg, color, x = 0, y = 0, z = 0, opts = {}) {
  const g = geo(`c${rt}|${rb}|${h}|${seg}|${opts.open ? 1 : 0}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!opts.open))
  const m = new THREE.Mesh(g, opts.material || mat(color, opts))
  m.position.set(x, y, z)
  if (opts.rx) m.rotation.x = opts.rx
  if (opts.rz) m.rotation.z = opts.rz
  if (opts.ry) m.rotation.y = opts.ry
  m.castShadow = opts.cast ?? true
  m.receiveShadow = opts.receive ?? true
  parent.add(m)
  return m
}

export function sphere(parent, r, color, x = 0, y = 0, z = 0, opts = {}) {
  const detail = opts.detail ?? 1
  const g = geo(`s${r}|${detail}`, () => new THREE.IcosahedronGeometry(r, detail))
  const m = new THREE.Mesh(g, opts.material || mat(color, opts))
  m.position.set(x, y, z)
  if (opts.sx || opts.sy || opts.sz) m.scale.set(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1)
  m.castShadow = opts.cast ?? true
  m.receiveShadow = opts.receive ?? true
  parent.add(m)
  return m
}

/** 四坡屋顶（截棱锥） */
export function hipRoof(parent, w, d, h, color, x, y, z, overhang = 0.35) {
  const W = w / 2 + overhang, D = d / 2 + overhang
  const tw = Math.max(0.05, W - h * 0.9), td = Math.max(0.05, D - h * 0.9)
  const key = `hip${w}|${d}|${h}|${overhang}`
  const g = geo(key, () => {
    const v = [
      -W, 0, -D, W, 0, -D, W, 0, D, -W, 0, D,
      -tw, h, -td, tw, h, -td, tw, h, td, -tw, h, td,
    ]
    const idx = [
      0, 4, 1, 1, 4, 5, // back
      1, 5, 2, 2, 5, 6, // right
      2, 6, 3, 3, 6, 7, // front
      3, 7, 0, 0, 7, 4, // left
      4, 7, 5, 5, 7, 6, // top
      0, 1, 2, 0, 2, 3, // bottom
    ]
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
    g.setIndex(idx)
    const ng = g.toNonIndexed()
    ng.computeVertexNormals()
    return ng
  })
  const m = new THREE.Mesh(g, mat(color))
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  parent.add(m)
  return m
}

/** 圆锥塔顶 */
export function cone(parent, r, h, seg, color, x, y, z) {
  const g = geo(`cone${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg))
  const m = new THREE.Mesh(g, mat(color))
  m.position.set(x, y + h / 2, z)
  m.castShadow = true
  parent.add(m)
  return m
}

/** 文字贴图招牌（Canvas） */
const texCache = new Map()
export function textTexture(lines, { w = 512, h = 160, bg = '#3f6f9a', fg = '#fbf6ec', font = 'bold 72px', border = null, sub = null } = {}) {
  const key = JSON.stringify([lines, w, h, bg, fg, font, border, sub])
  if (texCache.has(key)) return texCache.get(key)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  if (border) {
    ctx.strokeStyle = border
    ctx.lineWidth = Math.max(4, h * 0.05)
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2)
  }
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const arr = Array.isArray(lines) ? lines : [lines]
  const fam = '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Noto Sans SC","Microsoft YaHei","WenQuanYi Micro Hei",sans-serif'
  const lh = h / (arr.length + (sub ? 0.6 : 0))
  arr.forEach((t, i) => {
    let size = parseInt(font.match(/(\d+)px/)[1])
    ctx.font = `${font.replace(/\d+px/, size + 'px')} ${fam}`
    while (ctx.measureText(t).width > w * 0.9 && size > 10) { size -= 2; ctx.font = `${font.replace(/\d+px/, size + 'px')} ${fam}` }
    ctx.fillText(t, w / 2, lh * (i + 0.5))
  })
  if (sub) {
    ctx.globalAlpha = 0.85
    ctx.font = `500 ${Math.round(h * 0.16)}px ${fam}`
    ctx.fillText(sub, w / 2, h - lh * 0.35)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

export function sign(parent, lines, w, h, x, y, z, ry = 0, opts = {}) {
  const tex = textTexture(lines, opts)
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: opts.glow ?? 0.12 })
  )
  m.position.set(x, y, z)
  m.rotation.y = ry
  m.userData.noMerge = true
  parent.add(m)
  return m
}
