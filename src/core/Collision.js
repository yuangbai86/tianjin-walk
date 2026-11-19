// 轻量 2D 碰撞：玩家与 NPC 视为圆，建筑/栏杆/摊位为轴对齐盒。
// 本项目地面平坦，只有小桥有坡度，用高度函数处理，因此不引入完整物理引擎。
export class Collision {
  constructor() {
    this.boxes = [] // {minX,maxX,minZ,maxZ, occlude}
    this.circles = [] // {x,z,r, ref}
  }
  addBox(minX, maxX, minZ, maxZ, occlude = false, tag = '') {
    const b = { minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ), occlude, tag }
    this.boxes.push(b)
    return b
  }
  addBoxCentered(x, z, w, d, occlude = false, tag = '') {
    return this.addBox(x - w / 2, x + w / 2, z - d / 2, z + d / 2, occlude, tag)
  }
  addCircle(x, z, r, ref = null) {
    const c = { x, z, r, ref }
    this.circles.push(c)
    return c
  }
  /** 把位置 p({x,z}) 推出所有障碍 */
  resolve(p, r, ignore = null) {
    for (let iter = 0; iter < 4; iter++) {
      let moved = false
      for (const b of this.boxes) {
        const cx = Math.max(b.minX, Math.min(p.x, b.maxX))
        const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ))
        let dx = p.x - cx, dz = p.z - cz
        const d2 = dx * dx + dz * dz
        if (d2 < r * r) {
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2)
            p.x = cx + (dx / d) * r
            p.z = cz + (dz / d) * r
          } else {
            // 圆心在盒内：沿最短边推出
            const l = p.x - b.minX, rr = b.maxX - p.x, t = p.z - b.minZ, bb = b.maxZ - p.z
            const m = Math.min(l, rr, t, bb)
            if (m === l) p.x = b.minX - r
            else if (m === rr) p.x = b.maxX + r
            else if (m === t) p.z = b.minZ - r
            else p.z = b.maxZ + r
          }
          moved = true
        }
      }
      for (const c of this.circles) {
        if (c === ignore || c.disabled) continue
        const dx = p.x - c.x, dz = p.z - c.z
        const rr = r + c.r
        const d2 = dx * dx + dz * dz
        if (d2 < rr * rr && d2 > 1e-8) {
          const d = Math.sqrt(d2)
          p.x = c.x + (dx / d) * rr
          p.z = c.z + (dz / d) * rr
          moved = true
        }
      }
      if (!moved) break
    }
    return p
  }
  /** 线段 a→b 是否被遮挡盒（墙体）挡住 */
  blocked(ax, az, bx, bz) {
    for (const b of this.boxes) {
      if (!b.occlude) continue
      if (segBox(ax, az, bx, bz, b)) return true
    }
    return false
  }
}

function segBox(ax, az, bx, bz, b) {
  let t0 = 0, t1 = 1
  const dx = bx - ax, dz = bz - az
  const p = [-dx, dx, -dz, dz]
  const q = [ax - b.minX, b.maxX - ax, az - b.minZ, b.maxZ - az]
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) {
      if (q[i] < 0) return false
    } else {
      const t = q[i] / p[i]
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t }
      else { if (t < t0) return false; if (t < t1) t1 = t }
    }
  }
  return t0 < t1 && t1 > 0.001 && t0 < 0.999
}
