import * as THREE from 'three'
import { PALETTE as P, mat } from '../core/Materials.js'
import { box, cyl } from './kit.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** 天津之眼：桥上摩天轮。轮面在本地 xy 平面，桥沿本地 x 方向 */
export function createTianjinEye({ radius = 17, hubHeight = 22, bridgeLength = 60 } = {}) {
  const root = new THREE.Group()
  const white = '#f4f1ea'
  // 桥面与桥墩
  const deckY = 3
  box(root, bridgeLength, 0.8, 6, P.stone, 0, deckY, 0)
  box(root, bridgeLength, 0.3, 6.4, P.stoneDark, 0, deckY + 0.5, 0, { cast: false })
  for (const s of [-1, 1]) {
    box(root, bridgeLength, 0.6, 0.15, P.red, 0, deckY + 0.95, s * 3.1, { cast: false })
  }
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue
    box(root, 2.2, deckY + 2, 5, P.stoneDark, i * 13, (deckY - 2) / 2, 0)
  }
  // 中央大墩
  box(root, 6, deckY + 2.5, 7, P.stoneDark, 0, (deckY - 2.5) / 2, 0)
  // 拱
  for (const s of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const cx = s * (6.5 + k * 13)
      for (let j = 0; j < 8; j++) {
        const a0 = Math.PI * j / 8, a1 = Math.PI * (j + 1) / 8
        const r = 5.5
        const xa = cx - Math.cos(a0) * r, ya = Math.sin(a0) * 2.0
        const xb = cx - Math.cos(a1) * r, yb = Math.sin(a1) * 2.0
        box(root, Math.hypot(xb - xa, yb - ya) + 0.05, 0.35, 5.6, P.stone, (xa + xb) / 2, deckY - 0.6 - (2 - (ya + yb) / 2), 0, { rz: Math.atan2(yb - ya, xb - xa), cast: false })
      }
    }
  }
  // A 字支架（两侧）
  for (const s of [-1, 1]) {
    for (const lx of [-1, 1]) {
      const bx = lx * 6.5, bz = s * 2.6
      const tx = 0, tz = s * 1.0
      const ty = hubHeight
      const len = Math.hypot(tx - bx, ty - deckY, tz - bz)
      const leg = cyl(root, 0.35, 0.5, len, 8, white, (bx + tx) / 2, (deckY + ty) / 2, (bz + tz) / 2)
      leg.lookAt(tx, ty, tz)
      leg.rotateX(Math.PI / 2)
    }
  }
  // 转轮
  const wheel = new THREE.Group()
  wheel.position.set(0, hubHeight, 0)
  root.add(wheel)
  const rimMat = new THREE.MeshStandardMaterial({ color: white, roughness: 0.5, flatShading: true })
  for (const z of [-0.6, 0.6]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.22, 6, 64), rimMat)
    rim.position.z = z
    rim.castShadow = true
    wheel.add(rim)
  }
  const inner = new THREE.Mesh(new THREE.TorusGeometry(radius - 1.2, 0.12, 5, 48), rimMat)
  wheel.add(inner)
  cyl(wheel, 1.1, 1.1, 2.6, 12, white, 0, 0, 0, { rx: Math.PI / 2 })
  cyl(wheel, 0.6, 0.6, 3.2, 10, '#c9c4b8', 0, 0, 0, { rx: Math.PI / 2 })
  const spokes = 32
  // 辐条合并为一个网格
  const spokeMat = mat('#e8e4da', { roughness: 0.6 })
  const sg = []
  for (let i = 0; i < spokes; i++) for (const z of [-0.6, 0.6]) {
    const g = new THREE.CylinderGeometry(0.035, 0.035, radius, 3).translate(0, radius / 2, 0)
    g.rotateZ((i / spokes) * Math.PI * 2 + (z > 0 ? 0.05 : 0)); g.translate(0, 0, z)
    sg.push(g)
  }
  wheel.add(new THREE.Mesh(mergeGeometries(sg), spokeMat))
  // 座舱（悬挂在外圈，保持竖直）
  // 48 个座舱（实例化，始终保持竖直）
  const n = 48
  const cabGeo = new THREE.CapsuleGeometry(0.55, 0.7, 2, 8).rotateZ(Math.PI / 2)
  const roofGeo = new THREE.BoxGeometry(0.5, 0.12, 0.5).translate(0, 0.6, 0)
  const cabMesh = new THREE.InstancedMesh(cabGeo, mat('#eaf2f4', { roughness: 0.3, metalness: 0.1 }), n)
  const roofMesh = new THREE.InstancedMesh(roofGeo, mat('#d0573f'), n)
  cabMesh.castShadow = true
  wheel.add(cabMesh, roofMesh)
  const cabDummy = new THREE.Object3D()
  const cabins = { update(rot) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      cabDummy.position.set(Math.cos(a) * (radius + 0.7), Math.sin(a) * (radius + 0.7), 0)
      cabDummy.rotation.z = -rot
      cabDummy.updateMatrix()
      cabMesh.setMatrixAt(i, cabDummy.matrix); roofMesh.setMatrixAt(i, cabDummy.matrix)
    }
    cabMesh.instanceMatrix.needsUpdate = true; roofMesh.instanceMatrix.needsUpdate = true
  } }
  cabins.update(0)
  // 灯珠（实例化）
  const bulbs = 120
  const bulbMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), bulbs * 2)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < bulbs; i++) {
    const a = (i / bulbs) * Math.PI * 2
    for (let k = 0; k < 2; k++) {
      dummy.position.set(Math.cos(a) * radius, Math.sin(a) * radius, k ? 0.85 : -0.85)
      dummy.updateMatrix()
      bulbMesh.setMatrixAt(i * 2 + k, dummy.matrix)
      bulbMesh.setColorAt(i * 2 + k, new THREE.Color('#e9ddc8'))
    }
  }
  wheel.add(bulbMesh)
  root.userData.noMerge = true

  // 状态
  let glow = 0 // 0..1 亮灯动画强度
  let glowTime = 0
  const tmp = new THREE.Color()
  const base = new THREE.Color('#e9ddc8')
  const warm = new THREE.Color('#ffd27a')
  function update(dt, t) {
    wheel.rotation.z += dt * 0.025
    cabins.update(wheel.rotation.z)
    if (glowTime > 0) {
      glowTime -= dt
      glow = Math.min(1, glow + dt * 2)
    } else {
      glow = Math.max(0, glow - dt * 0.6)
    }
    if (glow > 0.001 || bulbMesh.userData.dirty) {
      tmp.setHSL((t * 0.15) % 1, 0.7, 0.55)
      rimMat.emissive.copy(warm).lerp(tmp, 0.5).multiplyScalar(glow * 0.9)
      for (let i = 0; i < bulbs; i++) {
        const h = (i / bulbs + t * 0.25) % 1
        const chase = 0.5 + 0.5 * Math.sin(i * 0.5 - t * 8)
        tmp.setHSL(h, 0.85, 0.55 + chase * 0.2)
        tmp.lerp(warm, 0.25)
        const c = base.clone().lerp(tmp, glow)
        c.multiplyScalar(1 + glow * 1.8 * chase)
        bulbMesh.setColorAt(i * 2, c)
        bulbMesh.setColorAt(i * 2 + 1, c)
      }
      bulbMesh.instanceColor.needsUpdate = true
      bulbMesh.userData.dirty = glow > 0.001
    }
  }
  function lightUp(seconds = 9) { glowTime = seconds }
  function setGlow(v, t = 0) { const prev = glow; glow = v; bulbMesh.userData.dirty = true; update(0, t); return prev }
  return { root, update, lightUp, setGlow, wheel }
}
