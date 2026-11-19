import * as THREE from 'three'

// 程序化细节贴图（无外部图片）。每张贴图对应 1/scale 米见方的一块表面。
// 带颜色的贴图（brick 等）与白色材质相乘；灰度贴图（plaster 等）与调色板颜色相乘。

function rand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
function canvas(n = 512) { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')] }
function noise(x, n, amount, seed = 1, size = 2) {
  const r = rand(seed)
  for (let i = 0; i < n * n * amount; i++) {
    const v = r()
    x.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.18})` : `rgba(0,0,0,${(0.5 - v) * 0.22})`
    x.fillRect(r() * n, r() * n, size, size)
  }
}
const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`

const makers = {
  // 红砖清水墙（可带青砖分层）
  brick(n, band) {
    const [c, x] = canvas(n)
    const r = rand(band ? 7 : 3)
    x.fillStyle = '#e2d6c2'; x.fillRect(0, 0, n, n)
    const rows = 16, rh = n / rows, cols = 4, bw = n / cols, m = 3
    for (let j = 0; j < rows; j++) {
      const grey = band && (j % 8 === 0 || j % 8 === 1)
      const off = (j % 2) * bw / 2
      for (let i = -1; i < cols + 1; i++) {
        const v = r()
        x.fillStyle = grey ? hsl(210, 6, 46 + v * 12) : (v < 0.08 ? hsl(12, 45, 30 + r() * 6) : hsl(10 + r() * 8, 48 + r() * 10, 40 + v * 12))
        x.fillRect(i * bw + off + m / 2, j * rh + m / 2, bw - m, rh - m)
        x.fillStyle = 'rgba(255,255,255,0.08)'
        x.fillRect(i * bw + off + m / 2, j * rh + m / 2, bw - m, 2)
      }
    }
    noise(x, n, 0.25, 5)
    return c
  },
  // 灰浆/水刷石墙面（灰度）
  plaster(n) {
    const [c, x] = canvas(n)
    x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, n, n)
    const r = rand(11)
    for (let i = 0; i < 60; i++) {
      const g = x.createRadialGradient(r() * n, r() * n, 0, r() * n, r() * n, 40 + r() * 90)
      g.addColorStop(0, `rgba(${r() > 0.5 ? '255,255,255' : '120,110,100'},${0.05 + r() * 0.05})`); g.addColorStop(1, 'rgba(0,0,0,0)')
      x.fillStyle = g; x.fillRect(0, 0, n, n)
    }
    noise(x, n, 0.5, 12, 2)
    // 细微的竖向雨痕
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(90,80,70,0.05)'; x.fillRect(r() * n, 0, 2 + r() * 5, n) }
    // 水渍、旧痕（手绘风格的“做旧”）
    for (let i = 0; i < 10; i++) {
      const sx = r() * n, sy = r() * n, h = 60 + r() * 160
      const g = x.createLinearGradient(0, sy, 0, sy + h)
      g.addColorStop(0, 'rgba(110,95,80,0.12)'); g.addColorStop(1, 'rgba(110,95,80,0)')
      x.fillStyle = g; x.fillRect(sx, sy, 8 + r() * 26, h)
    }
    return c
  },
  // 筒瓦/平瓦（灰度，横向成排）
  roof(n) {
    const [c, x] = canvas(n)
    const r = rand(21)
    const rows = 8, rh = n / rows, cols = 6, w = n / cols
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const g = x.createLinearGradient(0, j * rh, 0, (j + 1) * rh)
      const b = 0.82 + r() * 0.18
      g.addColorStop(0, `rgb(${255 * b},${255 * b},${255 * b})`)
      g.addColorStop(1, `rgb(${170 * b},${170 * b},${170 * b})`)
      x.fillStyle = g
      x.fillRect(i * w + (j % 2) * w / 2, j * rh, w - 2, rh - 2)
      x.fillRect(i * w + (j % 2) * w / 2 - n, j * rh, w - 2, rh - 2)
    }
    noise(x, n, 0.2, 22)
    return c
  },
  // 人行道方砖（灰度）
  paving(n) {
    const [c, x] = canvas(n)
    x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, n, n)
    const r = rand(31), k = 4, s = n / k
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const v = 215 + r() * 40
      x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4)
    }
    noise(x, n, 0.4, 32)
    return c
  },
  // 弹石路面（灰度）
  sett(n) {
    const [c, x] = canvas(n)
    x.fillStyle = '#8c8c8c'; x.fillRect(0, 0, n, n)
    const r = rand(41), rows = 8, rh = n / rows, cols = 5, w = n / cols
    for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
      const v = 195 + r() * 55
      x.fillStyle = `rgb(${v},${v},${v * 0.98})`
      const xx = i * w + (j % 2) * w / 2 + 3, yy = j * rh + 3
      x.beginPath(); x.roundRect(xx, yy, w - 6, rh - 6, 8); x.fill()
    }
    noise(x, n, 0.3, 42)
    return c
  },
  // 花岗岩（灰度斑点）
  stone(n) {
    const [c, x] = canvas(n)
    x.fillStyle = '#eeeeee'; x.fillRect(0, 0, n, n)
    noise(x, n, 1.4, 51, 3)
    x.strokeStyle = 'rgba(80,80,80,0.25)'; x.lineWidth = 3
    x.strokeRect(0, 0, n, n); x.beginPath(); x.moveTo(0, n / 2); x.lineTo(n, n / 2); x.stroke()
    return c
  },
  // 木纹（灰度）
  wood(n) {
    const [c, x] = canvas(n)
    x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, n, n)
    const r = rand(61)
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(60,40,20,${0.03 + r() * 0.07})`; x.fillRect(0, r() * n, n, 1 + r() * 3) }
    return c
  },
  // 草地 / 树叶（灰度）
  leaf(n) {
    const [c, x] = canvas(n)
    x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, n, n)
    noise(x, n, 2.2, 71, 4)
    return c
  },
  // 地台剖面：土层（横向分层，彩色）
  earth(n) {
    const [c, x] = canvas(n)
    const r = rand(91)
    const bands = ['#8a6a4e', '#7a5c44', '#9a7a58', '#6e523e', '#a08262', '#7f6048']
    let y = 0
    while (y < n) {
      const h = 18 + r() * 50
      x.fillStyle = bands[Math.floor(r() * bands.length)]
      x.fillRect(0, y, n, h)
      y += h
    }
    for (let i = 0; i < 160; i++) {
      x.fillStyle = r() > 0.5 ? 'rgba(200,190,170,0.6)' : 'rgba(60,45,35,0.5)'
      x.beginPath(); x.ellipse(r() * n, r() * n, 3 + r() * 9, 2 + r() * 6, 0, 0, Math.PI * 2); x.fill()
    }
    noise(x, n, 0.4, 92, 3)
    return c
  },
  // 柏油路面（灰度，带细碎颗粒与补丁）
  asphalt(n) {
    const [c, x] = canvas(n)
    x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, n, n)
    const r = rand(101)
    for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`; x.fillRect(r() * n, r() * n, 40 + r() * 120, 30 + r() * 80) }
    noise(x, n, 2.5, 102, 2)
    x.strokeStyle = 'rgba(40,40,40,0.25)'; x.lineWidth = 2
    for (let i = 0; i < 4; i++) { x.beginPath(); let px = r() * n, py = r() * n; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 60; py += (r() - 0.5) * 60; x.lineTo(px, py) } x.stroke() }
    return c
  },
  // 盲道（黄色带凸点）
  tactile(n) {
    const [c, x] = canvas(n)
    x.fillStyle = '#e3b33c'; x.fillRect(0, 0, n, n)
    x.fillStyle = '#c9971f'; x.fillRect(0, 0, n, 4); x.fillRect(0, 0, 4, n)
    x.fillStyle = '#f0c75a'
    for (let i = 0; i < 4; i++) x.fillRect(n * 0.12, n * (0.08 + i * 0.24), n * 0.76, n * 0.1)
    noise(x, n, 0.2, 81)
    return c
  },
}

const cache = new Map()
export function getTexture(name) {
  if (cache.has(name)) return cache.get(name)
  const base = name === 'brickBand' ? makers.brick(512, true) : makers[name](512)
  const t = new THREE.CanvasTexture(base)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  cache.set(name, t)
  return t
}

// 每种贴图默认尺寸（每米重复次数）
export const TEX_SCALE = { brick: 1.0, brickBand: 1.0, plaster: 0.25, roof: 1.2, paving: 1.0, sett: 2.0, stone: 0.7, wood: 1.5, leaf: 0.8, tactile: 2.5, earth: 0.12, asphalt: 0.4 }
