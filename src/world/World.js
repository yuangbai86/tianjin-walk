import * as THREE from 'three'
import { PALETTE as P, mat } from '../core/Materials.js'
import { Collision } from '../core/Collision.js'
import { box, cyl, sphere, sign } from './kit.js'
import { yanglou, farBlock, rng, brickArcade } from './buildings.js'
import {
  tree, hedge, lamp, bench, bicycle, flowerBox, railingX, railingZ, streetSign, boardSign,
  jianbingStall, footbridge, boat, telescope, trashBin, mailbox, bollard,
  yardFence, manhole, carriage, jiefangBridge, tactileStrip,
} from './props.js'
import { createWater, createSky } from './Water.js'
import { createTianjinEye } from './TianjinEye.js'
import { mergeStatic } from './merge.js'
import { utilityPole, wire, verticalSign, lanternString, trafficCone, roadPaint, roadText, giantMahua, roofBillboard } from './clutter.js'

// ───────── 地图（单位：米；-z 为北，海河在北侧）─────────
// 小洋楼街   x∈[-29,-19] z∈[-15,26]   （西侧，南北向）
// 海河步道   x∈[-34, 34] z∈[-26,-15]  （北侧，东西向；支流+小拱桥在 x∈[-6,0]）
// 观景台     x∈[26,34]   z∈[-30,-26]
// 望眼道     x∈[17,26]   z∈[-15, 2]   （东侧，南北向）
// 口袋广场   x∈[17,34]   z∈[2, 26]
// 槐荫里     x∈[-29,17]  z∈[14.6,26]  （南侧，东西向）
export const SPAWN = { x: -23.5, z: 22, yaw: 0 }
// 悬浮地台的范围（含海河与对岸）
export const BOUNDS = { X0: -48, X1: 66, Z0: -76, Z1: 38, RIVER_N: -66 }
export const DIORAMA_CENTER = new THREE.Vector3(9, 0, -19)

/** 用带圆角的多边形挤出一块地台。pts: [x, z, 圆角半径] */
function slab(parent, pts, y0, y1, materials) {
  const shape = new THREE.Shape()
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const [x, z, r] = pts[i]
    const [px, pz] = pts[(i + n - 1) % n]
    const [nx, nz] = pts[(i + 1) % n]
    if (!r) { i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z); continue }
    const d1 = Math.hypot(px - x, pz - z), d2 = Math.hypot(nx - x, nz - z)
    const ax = x + (px - x) / d1 * r, az = z + (pz - z) / d1 * r
    const bx = x + (nx - x) / d2 * r, bz = z + (nz - z) / d2 * r
    i === 0 ? shape.moveTo(ax, -az) : shape.lineTo(ax, -az)
    shape.quadraticCurveTo(x, -z, bx, -bz)
  }
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 8 })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, y0, 0)
  const m = new THREE.Mesh(geo, materials)
  m.receiveShadow = true
  m.userData.noMerge = true
  parent.add(m)
  return m
}
export const SUN_DIR = new THREE.Vector3(-0.72, 0.42, 0.55).normalize()

export const ZONES = [
  { id: 'bridge', name: '海河 · 小拱桥', minX: -8, maxX: 2, minZ: -23, maxZ: -19 },
  { id: 'deck', name: '天津之眼观景点', minX: 24, maxX: 35, minZ: -31, maxZ: -20 },
  { id: 'stall', name: '街角早点摊', minX: -30, maxX: -18, minZ: -17, maxZ: -7 },
  { id: 'promenade', name: '海河步道', minX: -40, maxX: 40, minZ: -31, maxZ: -15 },
  { id: 'street', name: '小洋楼街', minX: -31, maxX: -18, minZ: -15, maxZ: 15 },
  { id: 'lane', name: '望眼道', minX: 16, maxX: 27, minZ: -15, maxZ: 2 },
  { id: 'plaza', name: '口袋广场', minX: 16, maxX: 35, minZ: 2, maxZ: 27 },
  { id: 'south', name: '槐荫里', minX: -31, maxX: 17, minZ: 14, maxZ: 27 },
]

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()))

export class World {
  constructor(scene) {
    this.scene = scene
    this.collision = new Collision()
    this.staticRoot = new THREE.Group()
    this.dynRoot = new THREE.Group()
    scene.add(this.staticRoot, this.dynRoot)
    this.trees = []
    this.flowerBoxes = []
    this.bikes = []
    this.seats = []
    this.interactables = []
    this.steam = []
    this.leafPiles = []
    this.time = 0
  }

  /** 分步构建，onProgress(0..1, 文本) 反映真实完成的构建步骤 */
  async build(onProgress) {
    const steps = [
      ['铺路面、引海河水', () => this.buildGround()],
      ['盖小洋楼', () => this.buildBuildings()],
      ['种树、摆花箱', () => this.buildGreenery()],
      ['支起煎饼摊', () => this.buildStreetLife()],
      ['修河沿儿与小桥', () => this.buildRiverside()],
      ['架天津之眼', () => this.buildEye()],
      ['布置口袋广场', () => this.buildPlaza()],
      ['挂电线、灯笼和招牌', () => this.buildClutter()],
      ['远处的城市', () => this.buildFar()],
      ['合并静态模型', () => { this.mergedCount = mergeStatic(this.staticRoot) }],
    ]
    for (let i = 0; i < steps.length; i++) {
      onProgress?.(i / steps.length, steps[i][0])
      await nextFrame()
      steps[i][1]()
    }
    onProgress?.(1, '准备好了')
  }

  // ───────── 地面 / 路面 ─────────
  buildGround() {
    const S = this.staticRoot
    const ground = (x0, x1, z0, z1, color = P.grass, tex = 'leaf') => box(S, x1 - x0, 1.6, z1 - z0, null, (x0 + x1) / 2, -0.8, (z0 + z1) / 2, { cast: false, material: mat(color, { tex, grime: false }) })
    // 天空（只用来生成环境光照，不放进场景：背景是薄荷绿纯色，像摆在桌上的模型）
    this.sky = createSky(SUN_DIR)
    const { X0, X1, Z0, Z1, RIVER_N } = BOUNDS
    // 水面（只覆盖地台内的河道）
    const water = createWater(X1 - X0, -26 - RIVER_N, 90, 30, SUN_DIR)
    water.mesh.position.set((X0 + X1) / 2, -0.95, (RIVER_N - 26) / 2)
    this.dynRoot.add(water.mesh)
    this.water = water
    const creekWater = createWater(6.2, 11.4, 8, 12, SUN_DIR)
    creekWater.mesh.position.set(-3, -0.95, -20.6)
    this.dynRoot.add(creekWater.mesh)
    this.creekWater = creekWater
    // 河水剖面（地台侧面能看到水的“切面”）
    const waterVol = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, 2.0, -26 - RIVER_N), new THREE.MeshStandardMaterial({ color: '#3f9f98', transparent: true, opacity: 0.78, roughness: 0.2 }))
    waterVol.position.set((X0 + X1) / 2, -2.0, (RIVER_N - 26) / 2)
    waterVol.userData.noMerge = true
    this.dynRoot.add(waterVol)

    // 悬浮地台：圆角底座（土层剖面）+ 两岸陆地
    const earth = mat('#ffffff', { tex: 'earth', grime: false })
    const grass = mat('#a9b98a', { tex: 'leaf', grime: false })
    const bed = mat('#2c6f73', { grime: false })
    const R = 7
    slab(S, [[X0, Z0, R], [X1, Z0, R], [X1, Z1, R], [X0, Z1, R]], -10, -3, [bed, earth])
    slab(S, [[X0, -26, 0], [-6, -26, 0], [-6, -15, 0], [0, -15, 0], [0, -26, 0], [X1, -26, 0], [X1, Z1, R], [X0, Z1, R]], -3, 0, [grass, earth])
    slab(S, [[X0, Z0, R], [X1, Z0, R], [X1, RIVER_N, 0], [X0, RIVER_N, 0]], -3, 0, [grass, earth])
    // 地台顶边一圈石沿
    const rim = mat(P.stoneDark, { tex: 'stone' })
    box(S, X1 - X0 - 2 * R, 0.25, 0.5, null, (X0 + X1) / 2, 0.05, Z1 - 0.25, { cast: false, material: rim })
    ground(26, 34, -30, -26, P.stone, 'stone')
    const embank = mat(P.stoneDark, { tex: 'stone', texScale: 0.5 })
    box(S, -6 - X0, 0.3, 0.6, null, (X0 - 6) / 2, 0.0, -26.0, { cast: false, material: embank })
    box(S, X1, 0.3, 0.6, null, X1 / 2, 0.0, -26.0, { cast: false, material: embank })
    box(S, -6 - X0, 1.3, 0.3, null, (X0 - 6) / 2, -0.55, -26.15, { cast: false, material: embank })
    box(S, X1, 1.3, 0.3, null, X1 / 2, -0.55, -26.15, { cast: false, material: embank })
    // 对岸驳岸
    box(S, X1 - X0, 0.3, 0.6, null, (X0 + X1) / 2, 0.0, RIVER_N, { cast: false, material: embank })
    box(S, X1 - X0, 1.3, 0.3, null, (X0 + X1) / 2, -0.55, RIVER_N + 0.15, { cast: false, material: embank })
    // 支流两岸石壁
    box(S, 0.4, 1.6, 11, null, -6.2, -0.8, -20.5, { cast: false, material: embank })
    box(S, 0.4, 1.6, 11, null, 0.2, -0.8, -20.5, { cast: false, material: embank })
    box(S, 6.4, 1.6, 0.4, null, -3, -0.8, -15.0, { cast: false, material: embank })

    // 铺装：分区材质（方砖人行道、弹石路、花岗岩步道、广场拼花）
    const pave = (x0, x1, z0, z1, color, tex, y = 0.01, scale) => box(S, x1 - x0, 0.04, z1 - z0, null, (x0 + x1) / 2, y, (z0 + z1) / 2, { cast: false, material: mat(color, { tex, grime: false, texScale: scale }) })
    pave(-30, -27, -15, 27, '#dccbb0', 'paving', 0.012, 2)
    pave(-21, -18, -15, 15, '#dccbb0', 'paving', 0.012, 2)
    pave(-27, -21, -15, 27, '#6b6762', 'asphalt')
    // 路缘石
    const curb = mat(P.stone, { tex: 'stone' })
    box(S, 0.24, 0.14, 42, null, -27, 0.07, 6, { cast: false, material: curb })
    box(S, 0.24, 0.14, 30, null, -21, 0.07, 0, { cast: false, material: curb })
    // 盲道
    tactileStrip(S, -27.6, -14.5, 26.5)
    tactileStrip(S, -20.4, -14.5, 14.5)
    // 井盖、雨水篦子
    for (const [x, z] of [[-24, -6], [-24, 9], [-3, 20.5], [21.5, -9], [24, 18]]) manhole(S, x, z)
    for (const z of [-10, 2, 14]) for (const x of [-26.7, -21.3]) box(S, 0.3, 0.02, 0.6, '#3a3734', x, 0.03, z, { cast: false })
    // 步道：花岗岩大板
    pave(-34, 34, -26, -15, '#ebe0cc', 'paving', 0.01, 0.6)
    pave(26, 34, -30, -26, '#ebe0cc', 'paving', 0.01, 0.6)
    pave(-34, 34, -26, -24.6, '#d9ccb4', 'stone', 0.013, 1.2)
    // 望眼道 + 槐荫里
    pave(17, 26, -15, 2, '#d8c7aa', 'paving', 0.01, 2)
    pave(-30, 17, 14.6, 27, '#d8c7aa', 'paving', 0.01, 2)
    pave(-27, 17, 17.5, 24, '#c4b49c', 'sett', 0.013)
    // 广场：拼花地砖
    pave(17, 34, 2, 27, '#e8d9bc', 'paving', 0.01, 1.2)
    for (let i = 0; i < 9; i++) for (let j = 0; j < 12; j++) if ((i + j) % 2 === 0) pave(17.5 + i * 1.8, 17.5 + i * 1.8 + 1.8, 2.5 + j * 2, 2.5 + j * 2 + 2, '#e9cfa6', 'paving', 0.015, 1.1)
    // 广场中央圆形花坛
    cyl(S, 2.6, 2.7, 0.5, 18, P.stone, 25.5, 0.25, 14, { material: mat(P.stone, { tex: 'stone' }) })
    cyl(S, 2.3, 2.3, 0.52, 18, '#6f5845', 25.5, 0.26, 14, { cast: false })

    this.buildColliders()
  }

  buildColliders() {
    const C = this.collision
    // 河
    C.addBox(-60, 26, -60, -25.85)
    C.addBox(26, 60, -60, -29.85)
    C.addBox(33.85, 60, -30, -14)
    C.addBox(-60, -33.85, -30, -15)
    // 支流（小桥两侧）
    C.addBox(-6.2, 0.2, -26, -22.6)
    C.addBox(-6.2, 0.2, -19.4, -14.8)
    // 小桥栏杆
    C.addBox(-7.9, 1.9, -22.62, -22.5)
    C.addBox(-7.9, 1.9, -19.5, -19.38)
    // 中心街区（遮挡视线）
    C.addBox(-18.9, 16.9, -15, 14.6, true, 'central')
    // 西侧楼群
    C.addBox(-60, -29.1, -15, 60, true, 'west')
    // 东侧
    C.addBox(25.9, 60, -15, 1.6, true, 'east')
    C.addBox(33.9, 60, 1.6, 60, true, 'plazaEast')
    // 南侧
    C.addBox(-60, 60, 26.1, 60, true, 'south')
  }

  placeBuilding(x, z, facing, opts) {
    const b = yanglou(opts)
    const ry = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 }[facing]
    b.position.set(x, 0, z)
    b.rotation.y = ry
    this.staticRoot.add(b)
    return b
  }

  // ───────── 建筑 ─────────
  buildBuildings() {
    const C = P
    // 西侧（面朝东，正对小洋楼街）——英式、意式、红青砖分层，参考五大道“万国建筑”
    this.placeBuilding(-35, -10, 'E', { w: 9.4, d: 9, floors: 3, wall: C.cream, trim: C.white, tower: 'left', seed: 11, shutter: '#5b8a72', num: 12 })
    this.placeBuilding(-35, 0, 'E', { w: 9.4, d: 9, floors: 3, wall: C.brick, band: true, trim: C.cream, roofStyle: 'mansard', seed: 12, plaque: ['风貌建筑', '印象·五大道'], num: 16 })
    this.placeBuilding(-35, 10, 'E', { w: 9.4, d: 9, floors: 2, wall: C.brick, trim: C.white, seed: 13, roofStyle: 'hip', style: 'english', num: 20 })
    this.placeBuilding(-35, 20.5, 'E', { w: 10, d: 9, floors: 3, wall: C.peach, trim: C.white, roofStyle: 'flat', seed: 14, style: 'italian', roofClutter: false })
    // 中心街区：西排（面朝西）
    this.placeBuilding(-13.5, -9.5, 'W', { w: 9, d: 9, floors: 3, wall: C.brick, band: true, trim: C.cream, seed: 21, plaque: ['风貌建筑', '红砖小楼'], num: 15 })
    this.placeBuilding(-13.5, 0, 'W', { w: 9, d: 9, floors: 2, wall: C.cream, trim: C.white, tower: 'right', seed: 22, shutter: '#3f6f9a', num: 19 })
    this.placeBuilding(-13.5, 9.5, 'W', { w: 9, d: 9, floors: 2, wall: C.brick, trim: C.white, roofStyle: 'hip', style: 'english', seed: 23, num: 23 })
    // 中心街区：北排（面朝海河）
    this.placeBuilding(-4.5, -9.5, 'N', { w: 8, d: 8, floors: 3, wall: C.cream, trim: C.white, seed: 31, roofStyle: 'flat', style: 'italian' })
    this.placeBuilding(4, -9.5, 'N', { w: 8, d: 8, floors: 2, wall: C.brick, trim: C.cream, seed: 32, tower: 'left' })
    // 中心街区：东排（面朝望眼道）
    this.placeBuilding(11.5, -9.5, 'E', { w: 9, d: 9, floors: 3, wall: C.peach, trim: C.white, seed: 41, shutter: '#5b8a72' })
    this.placeBuilding(11.5, 0, 'E', { w: 9, d: 9, floors: 2, wall: C.brick, trim: C.cream, seed: 42, roofClutter: false, shop: { name: '倍儿香麻花 · 糕干', awning: C.red, frame: '#5a3a2a' } })
    this.placeBuilding(11.5, 9.5, 'E', { w: 9, d: 9, floors: 3, wall: C.cream, trim: C.white, seed: 43, roofStyle: 'mansard' })
    // 中心街区：南排（面朝槐荫里）
    this.placeBuilding(-4.5, 9.5, 'S', { w: 8, d: 8, floors: 2, wall: C.apricot, trim: C.white, seed: 51, shop: { name: '倍儿亮理发', awning: '#3f6f9a' } })
    this.placeBuilding(4, 9.5, 'S', { w: 8, d: 8, floors: 3, wall: C.brick, band: true, trim: C.cream, seed: 52, plaque: ['风貌建筑', '槐荫小院'] })
    // 东侧（面朝望眼道，西向）
    this.placeBuilding(31, -7, 'W', { w: 13, d: 9, floors: 3, wall: C.cream, trim: C.white, seed: 61, tower: 'left', shutter: '#3f6f9a' })
    // 广场东侧：民园式红砖拱廊 + 后面的楼
    const arc = brickArcade(this.staticRoot, 22, 7.2)
    arc.position.set(35.2, 0, 14.5)
    arc.rotation.y = -Math.PI / 2
    sign(this.staticRoot, ['口袋广场'], 3.2, 0.7, 34.9, 8.35, 14.5, -Math.PI / 2, { bg: '#7a3326', fg: '#f6dfa0', w: 640, h: 140, font: 'bold 96px', border: '#d9b25a' })
    this.placeBuilding(41.5, 7.5, 'W', { w: 10, d: 9, floors: 3, wall: C.brick, trim: C.cream, seed: 71, shop: { name: '河沿儿茶社', awning: '#5b8a72' } })
    this.placeBuilding(41.5, 19.5, 'W', { w: 11, d: 9, floors: 3, wall: C.apricot, trim: C.white, seed: 72, roofStyle: 'mansard' })
    // 南侧（北向）
    const southShops = [
      { name: '嘛都有便利店', awning: C.red },
      null,
      { name: '洋楼照相馆', awning: '#3f6f9a', frame: '#2f3f5a' },
      null,
      { name: '津味儿杂货铺', awning: '#c99a3a', frame: '#5a3a2a' },
    ]
    const walls = [C.cream, C.brick, C.apricot, C.brick, C.cream]
    const styles = [null, 'english', 'italian', null, null]
    for (let i = 0; i < 5; i++) {
      this.placeBuilding(-24 + i * 12, 31.5, 'N', { w: 11.4, d: 9, floors: 2 + (i % 2), wall: walls[i], band: i === 3, trim: walls[i] === C.brick ? C.cream : C.white, seed: 81 + i, shop: southShops[i], roofStyle: ['hip', 'hip', 'flat', 'mansard', 'hip'][i], tower: i === 3 ? 'right' : null, style: styles[i] })
    }
    // 观景台以东：桥头的楼
    this.placeBuilding(44, -6, 'W', { w: 12, d: 10, floors: 4, wall: C.cream, trim: C.white, seed: 91, roofStyle: 'mansard' })
    this.placeBuilding(55, -8, 'N', { w: 12, d: 10, floors: 3, wall: C.brick, trim: C.cream, seed: 92 })
    // 地台东缘再补一排小楼，让模型四周都满满当当
    this.placeBuilding(52, 7, 'W', { w: 10, d: 8, floors: 2, wall: C.cream, trim: C.white, seed: 93, style: 'english', sides: false })
    this.placeBuilding(52, 18.5, 'W', { w: 10, d: 8, floors: 3, wall: C.brick, band: true, trim: C.cream, seed: 94, roofStyle: 'flat', sides: false })
    this.placeBuilding(52, 30, 'W', { w: 10, d: 8, floors: 2, wall: C.peach, trim: C.white, seed: 95, tower: 'right', sides: false })
  }

  // ───────── 绿化 ─────────
  buildGreenery() {
    const S = this.staticRoot
    const addTree = (x, z, s = 1, seed = 0, collide = true) => {
      const t = tree(this.staticRoot, x, z, s, seed, this.dynRoot)
      this.trees.push(t.canopy)
      if (collide) this.collision.addCircle(x, z, 0.32)
    }
    // 小洋楼街两侧行道树
    for (const z of [-5, 5, 15, 23]) addTree(-28.3, z, 1.05, z)
    for (const z of [-5, 5, 13]) addTree(-19.7, z, 1.0, z + 3)
    // 步道行道树（与绿篱）
    for (const x of [-26, -18, -10, 5, 11, 22]) addTree(x, -16.2, 1.1, x)
    hedge(S, -15, -15.3, 7, 0.6); hedge(S, 8.5, -15.3, 14, 0.6)
    // 西北角小绿地
    addTree(-32, -22, 1.2, 4); addTree(-32.5, -17.5, 0.9, 7)
    hedge(S, -33.6, -21, 0.6, 9)
    // 槐荫里
    for (const x of [-12, 0, 12]) addTree(x, 25.2, 1.1, x + 1)
    for (const x of [-6, 6]) addTree(x, 15.5, 0.95, x + 2)
    // 望眼道
    addTree(25.2, -11, 1.0, 3); addTree(25.2, -3, 1.0, 5)
    // 广场
    addTree(25.5, 14, 1.45, 9, false)
    this.collision.addCircle(25.5, 14, 2.75)
    addTree(33, 3.5, 1.1, 2); addTree(18, 25, 1.0, 6)
    // 远处
    const r = rng(7)
    for (let i = 0; i < 9; i++) addTree(36 + r() * 27, -14 + r() * 3, 1 + r() * 0.5, i, false)
    for (let i = 0; i < 7; i++) addTree(59 + r() * 4, 2 + i * 5, 1 + r() * 0.4, i + 20, false)

    // 花箱
    const fb = (x, z, ry, w) => { const f = flowerBox(this.staticRoot, x, z, ry, w, this.dynRoot); this.flowerBoxes.push(f); return f }
    fb(-28.75, -3.2, Math.PI / 2, 1.4); fb(-28.75, 7, Math.PI / 2, 1.4)
    fb(-19.25, -3.4, -Math.PI / 2, 1.2)
    fb(-8, 15.0, 0, 1.6); fb(9, 15.0, 0, 1.6)
    fb(17.4, 22, Math.PI / 2, 1.6); fb(17.4, 18.5, Math.PI / 2, 1.6)
    for (const f of this.flowerBoxes) {
      const p = f.position
      const w = 0.6, l = 0.9
      const along = Math.abs(Math.sin(f.rotation.y)) > 0.5
      this.collision.addBox(p.x - (along ? w / 2 : l), p.x + (along ? w / 2 : l), p.z - (along ? l : w / 2), p.z + (along ? l : w / 2))
    }
    // 花箱互动（选几处）
    for (const f of this.flowerBoxes.filter((_, i) => i % 2 === 0)) {
      this.interactables.push({
        id: 'flower' + this.interactables.length, kind: 'flower', label: '摸摸花儿', name: '花箱',
        pos: new THREE.Vector3(f.position.x, 0.8, f.position.z), range: 2.2, radius: 0.7, ref: f,
      })
    }
  }

  // ───────── 街道生活 ─────────
  buildStreetLife() {
    const S = this.staticRoot
    const D = this.dynRoot
    // 煎饼摊（西侧人行道，朝东）
    const stall = jianbingStall(D, -27.85, -13, Math.PI / 2)
    this.stall = stall
    this.collision.addBox(-28.45, -27.25, -14.25, -11.75)
    // 顾客板凳不阻挡太多：只给小桌碰撞
    this.collision.addCircle(-25.5, -12.6, 0.4)
    stall.updateMatrixWorld(true)
    this.steamOrigin = stall.localToWorld(stall.userData.steamLocal.clone())

    // 自行车
    const bikes = [[-20.4, 1.0, 0.25, '#3f6f9a'], [-20.5, 10.6, -0.2, '#d0573f'], [-28.6, 1.6, Math.PI + 0.15, '#4e8a5c'], [-2, 25.0, Math.PI / 2 + 0.2, '#e2b13c'], [23.5, -1.5, 0.1, '#7a5aa6']]
    for (const [x, z, ry, c] of bikes) {
      const b = bicycle(S, x, z, ry + Math.PI / 2, c, D)
      this.bikes.push(b)
      this.collision.addCircle(x, z, 0.55)
      this.interactables.push({ id: 'bike' + this.bikes.length, kind: 'bike', label: '按个车铃', name: '自行车', pos: new THREE.Vector3(x, 0.8, z), range: 2.2, radius: 0.6, ref: b })
    }
    // 路灯
    const lamps = [[-28.6, -15.7], [-28.5, 0], [-28.5, 10], [-19.6, -10], [-19.6, 10], [-12, 16], [2, 16], [14, 25], [-20, 25], [25.5, -7], [18, 3], [33, 12], [33, 23]]
    for (const [x, z] of lamps) { lamp(S, x, z); this.collision.addCircle(x, z, 0.22) }
    // 邮筒、垃圾桶、石墩
    mailbox(S, -19.4, -0.5, -Math.PI / 2); this.collision.addCircle(-19.4, -0.5, 0.35)
    trashBin(S, -28.5, 3.3); this.collision.addCircle(-28.5, 3.3, 0.3)
    trashBin(S, 16.5, 3.2); this.collision.addCircle(16.5, 3.2, 0.3)
    for (const x of [-26.5, -24, -21.5]) { bollard(S, x, -14.6); this.collision.addCircle(x, -14.6, 0.15) }
    // 路牌
    streetSign(S, -19.5, -14.8, [
      { text: '海河步道 →', back: '← 海河步道', sub: 'HAIHE PROMENADE', ry: 0 },
      { text: '小洋楼街', sub: 'YANGLOU ST.', ry: Math.PI / 2 },
    ])
    this.collision.addCircle(-19.5, -14.8, 0.12)
    streetSign(S, -19.5, 15.5, [
      { text: '↑ 小洋楼街 · 海河', sub: 'TO HAIHE RIVER', ry: Math.PI / 2 },
      { text: '槐荫里 →', back: '← 槐荫里', sub: 'HUAIYIN LANE', ry: 0 },
    ])
    this.collision.addCircle(-19.5, 15.5, 0.12)
    streetSign(S, 17.4, -14.6, [
      { text: '望眼道 · 口袋广场', sub: 'WANGYAN RD.', ry: Math.PI / 2 },
      { text: '← 早点 · 小洋楼街', back: '观景点 →', sub: 'HAIHE PROMENADE', ry: 0 },
    ])
    this.collision.addCircle(17.4, -14.6, 0.12)
    streetSign(S, 17.4, 15.4, [
      { text: '口袋广场', sub: 'POCKET SQUARE', ry: Math.PI / 2 },
      { text: '← 槐荫里', back: '槐荫里 →', sub: 'HUAIYIN LANE', ry: 0 },
    ])
    this.collision.addCircle(17.4, 15.4, 0.12)
    // 起点导览牌
    const mb = boardSign(S, -28.6, 18.5, Math.PI / 2, ['天津印象街区 · 导览', '↑ 小洋楼街 → 海河步道', '→ 天津之眼观景点 → 口袋广场', '↙ 槐荫里 回到这儿'], { w: 2.2, h: 1.3, y: 1.35, font: 'bold 40px' })
    this.collision.addBox(-28.9, -28.3, 17.3, 19.7)
    this.interactables.push({ id: 'mapboard', kind: 'map', label: '看看导览图', name: '导览牌', pos: new THREE.Vector3(-28.5, 1.4, 18.5), range: 3, radius: 1.0 })
    // 落叶堆
    for (const [x, z] of [[-24, 3], [-22.4, -8], [-3, 21], [21, -6]]) this.addLeafPile(x, z)
    // 院墙铁栅（五大道小洋楼前常见：砖垛 + 铸铁栅栏 + 门口留空）
    const fW = yardFence(S, -15, 25.6, [[-11.5, -8.5], [-1.5, 1.5], [8.5, 11.5], [19, 22]])
    fW.position.set(-29.35, 0, 0); fW.rotation.y = -Math.PI / 2
    const fC = yardFence(S, -14.4, 14.2, [[-11, -8], [-1.5, 1.5], [8, 11]])
    fC.position.set(-18.7, 0, 0); fC.rotation.y = -Math.PI / 2
    // 观光马车（槐荫里候客）
    this.carriage = carriage(D, -12.5, 23.3, Math.PI / 2)
    this.collision.addBox(-13.8, -8.4, 22.4, 24.2)
    this.interactables.push({ id: 'carriage', kind: 'carriage', label: '摸摸马儿', name: '观光马车', pos: new THREE.Vector3(-9.3, 1.6, 23.3), range: 2.6, radius: 0.6 })
  }

  addLeafPile(x, z) {
    const cols = ['#e2a33c', '#d0743a', '#c9b24a', '#b8582f'].map((c) => new THREE.Color(c))
    const r = rng(Math.floor(Math.abs(x * 31 + z * 7)))
    const N = 22
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.012, 0.1), mat('#ffffff'), N)
    im.receiveShadow = true
    const leaves = []
    for (let i = 0; i < N; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.8
      const o = new THREE.Object3D()
      o.position.set(x + Math.cos(a) * d, 0.03 + r() * 0.03, z + Math.sin(a) * d)
      o.rotation.set(r() * 0.4, r() * 6, r() * 0.4)
      o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, cols[i % 4])
      leaves.push({ m: o, v: new THREE.Vector3(), spin: 0 })
    }
    this.dynRoot.add(im)
    this.leafPiles.push({ x, z, leaves, im })
  }

  // ───────── 河岸 ─────────
  buildRiverside() {
    const S = this.staticRoot
    const D = this.dynRoot
    railingX(S, -34, -6.2, -26.15, { ornament: true })
    railingX(S, 0.2, 26, -26.15, { ornament: true })
    railingX(S, 26, 34, -30.15, { ornament: true })
    railingZ(S, -30, -26, 25.95)
    railingZ(S, -30, -14, 34.0)
    railingZ(S, -25.9, -22.7, -6.35); railingZ(S, -25.9, -22.7, 0.35)
    railingZ(S, -19.3, -15.2, -6.35); railingZ(S, -19.3, -15.2, 0.35)
    // 小拱桥
    const fbridge = footbridge(S, -8, 2, -21, 3.2, 0.9)
    this.bridgeHeight = fbridge.height
    // 长椅（朝河）
    const benches = [[-24, -24.7], [8, -24.7], [12.5, -24.7], [-31.5, -19.5, Math.PI / 2]]
    for (const [x, z, ry0] of benches) this.addBench(x, z, ry0 ?? Math.PI)
    // 钓鱼位：小马扎、水桶
    box(D, 0.4, 0.06, 0.32, '#3f6f9a', -14, 0.4, -25.15)
    cyl(D, 0.18, 0.15, 0.32, 10, '#4e8a5c', -13.2, 0.16, -25.2)
    this.collision.addCircle(-13.2, -25.2, 0.25)
    // 观景台
    this.telescope = telescope(D, 30, -29.2, Math.atan2(55 - 30, -46 + 29.2) + Math.PI)
    this.telescope.lookTarget = new THREE.Vector3(55, 21, -46)
    this.collision.addCircle(30, -29.2, 0.35)
    boardSign(S, 27, -27, Math.PI / 4, ['天津之眼观景点', '海河 · 永远转着的大轮子'], { w: 1.8, h: 0.9, y: 1.3, font: 'bold 56px' })
    this.collision.addCircle(27, -27, 0.5)
    this.interactables.push({ id: 'telescope', kind: 'telescope', label: '看看天津之眼', name: '望远镜', pos: new THREE.Vector3(30, 1.25, -29.2), range: 2.4, radius: 0.6 })
    // 旗杆
    cyl(S, 0.05, 0.06, 6, 6, '#c9c4b8', 26.5, 3, -29.6)
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8, 10, 1), mat('#d0573f', { side: THREE.DoubleSide, flat: false }))
    flag.position.set(27.2, 5.5, -29.6); D.add(flag)
    this.flags = [flag]
    flag.userData.base = flag.geometry.attributes.position.array.slice()
    // 解放桥印象（远处西侧的钢桁架开启桥）
    const jf = jiefangBridge(S, 40, 9)
    jf.position.set(-42.5, -0.2, -46)
    // 游船
    this.boat = boat(D)
    this.boat.position.set(-40, -0.85, -42)
    this.flags.push(this.boat.userData.flag)
    this.boat.userData.flag.userData.base = this.boat.userData.flag.geometry.attributes.position.array.slice()
    // 步道入口提示牌
    boardSign(S, -31.8, -16.2, -Math.PI * 0.75, ['海河步道', '小心脚下 · 别看水看入迷了'], { w: 1.6, h: 0.8, y: 1.2, font: 'bold 52px' })
    this.collision.addCircle(-31.8, -16.2, 0.4)
  }

  addBench(x, z, ry, occupied = false) {
    const b = bench(this.dynRoot, x, z, ry)
    const fwd = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry))
    const side = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry))
    const w = Math.abs(Math.sin(ry)) > 0.5
    this.collision.addBox(x - (w ? 0.35 : 0.95), x + (w ? 0.35 : 0.95), z - (w ? 0.95 : 0.35), z + (w ? 0.95 : 0.35))
    const seats = []
    for (const s of [-0.45, 0.45]) {
      const seat = {
        pos: new THREE.Vector3(x, 0.45, z).addScaledVector(side, s).addScaledVector(fwd, 0.02),
        stand: new THREE.Vector3(x, 0, z).addScaledVector(side, s).addScaledVector(fwd, 0.85),
        yaw: ry + Math.PI, ry, occupied: false, bench: b,
      }
      this.seats.push(seat); seats.push(seat)
    }
    const it = { id: 'bench' + this.seats.length, kind: 'bench', label: '坐会儿', name: '长椅', pos: new THREE.Vector3(x, 0.6, z), range: 2.3, radius: 0.9, seats }
    this.interactables.push(it)
    return { bench: b, seats }
  }

  // ───────── 天津之眼 ─────────
  buildEye() {
    const eye = createTianjinEye({ radius: 17, hubHeight: 22, bridgeLength: 46 })
    const n = new THREE.Vector3(-0.94, 0, 0.33).normalize()
    eye.root.position.set(55, -1, -46)
    eye.root.rotation.y = Math.atan2(n.x, n.z)
    this.dynRoot.add(eye.root)
    this.eye = eye
  }

  // ───────── 口袋广场 ─────────
  buildPlaza() {
    const S = this.staticRoot
    this.addBench(33.2, 8, -Math.PI / 2)
    this.addBench(33.2, 17, -Math.PI / 2)
    this.addBench(22, 25.3, Math.PI)
    // 乒乓球台
    const tg = new THREE.Group(); tg.position.set(29, 0, 21.5); S.add(tg)
    box(tg, 2.7, 0.08, 1.5, '#3f7a6a', 0, 0.76, 0)
    box(tg, 0.04, 0.16, 1.55, P.white, 0, 0.88, 0, { cast: false })
    box(tg, 2.72, 0.02, 0.03, P.white, 0, 0.81, 0, { cast: false })
    for (const a of [-1, 1]) box(tg, 0.4, 0.72, 1.0, '#7b8a85', a * 0.9, 0.36, 0)
    this.collision.addBox(27.6, 30.4, 20.7, 22.3)
    // 告示栏
    boardSign(S, 17.6, 7, Math.PI / 2, ['口袋广场 · 街坊之家', '今晚七点：快板儿练习', '寻猫：橘色，爱吃小鱼，叫“馃子”', '（已找到，天天在广场晒太阳）'], { w: 2.2, h: 1.3, y: 1.4, font: 'bold 40px', bg: '#f6ecd6' })
    this.collision.addBox(17.3, 17.9, 5.8, 8.2)
    // 鸟笼挂在树上
    const cage = new THREE.Group(); cage.position.set(24.2, 2.4, 12.8); this.dynRoot.add(cage)
    cyl(cage, 0.22, 0.22, 0.4, 8, '#c9a36a', 0, 0, 0, { open: true, side: THREE.DoubleSide })
    cyl(cage, 0.01, 0.01, 0.6, 3, '#c9a36a', 0, 0.45, 0)
    sphere(cage, 0.07, '#f2c14e', 0, -0.05, 0, { detail: 0 })
    this.cage = cage
  }

  // ───────── 生活杂物（微缩模型的密度感）─────────
  buildClutter() {
    const S = this.staticRoot
    const C = this.collision
    // 电线杆 + 下垂电线：小洋楼街东侧、槐荫里南侧
    const lineA = [[-21.35, -12], [-21.35, 0.5], [-21.35, 11.5]]
    const lineB = [[-16, 25.6], [-5, 25.6], [6, 25.6]]
    const chain = (list, ry, flyers) => {
      let prev = null
      list.forEach(([x, z], i) => {
        const pts = utilityPole(S, x, z, ry, { transformer: i === 1, no: 20 + i, flyer: flyers && i === 0 })
        C.addCircle(x, z, 0.2)
        if (prev) for (let k = 0; k < pts.length; k++) wire(S, prev[k], pts[k], 0.55 + (k % 4) * 0.08)
        prev = pts
      })
      return prev
    }
    const a = chain(lineA, 0, true)
    const b = chain(lineB, Math.PI / 2, false)
    // 拐角连线、入户线
    wire(S, a[0], new THREE.Vector3(-30.4, 6.2, 11.5), 0.5, 0.018)
    wire(S, a[1], new THREE.Vector3(-30.4, 6.4, 13), 0.55, 0.018)
    wire(S, new THREE.Vector3(-21.35 + 0.85, 7.8, -12), new THREE.Vector3(-30.4, 6.0, -13.8), 0.6, 0.018)
    wire(S, new THREE.Vector3(-21.35, 7.8, 11.5), new THREE.Vector3(-16, 7.8, 25.6), 0.9, 0.025)
    wire(S, b[0], new THREE.Vector3(6, 6, 13.6), 0.6, 0.018)
    wire(S, b[0], new THREE.Vector3(17, 6.5, 26), 0.7, 0.02)
    // 红灯笼串：横跨槐荫里与小洋楼街
    for (const x of [-14, -3, 8]) lanternString(S, new THREE.Vector3(x, 5.6, 26.9), new THREE.Vector3(x, 5.6, 14.1), 7)
    for (const z of [-5.5, 6.5]) lanternString(S, new THREE.Vector3(-30.45, 5.8, z), new THREE.Vector3(-18.05, 5.8, z), 6)
    // 竖招牌
    verticalSign(S, -30.45, 4.6, -14.4, Math.PI / 2, '早点', { bg: '#c9472f' })
    verticalSign(S, -30.45, 5.2, 5.1, Math.PI / 2, '旅馆', { bg: '#2c5d8c', fg: '#fff', border: '#fff' })
    verticalSign(S, -18.05, 4.8, -4.6, -Math.PI / 2, '修车', { bg: '#f2c14e', fg: '#7a3326', border: '#7a3326' })
    verticalSign(S, -18.05, 4.6, 14.0, -Math.PI / 2, '茶食', { bg: '#3d5a4a', fg: '#f6dfa0' })
    verticalSign(S, -8.6, 4.6, 13.6, 0, '理发', { bg: '#2c5d8c', fg: '#fff', border: '#e8566b' })
    verticalSign(S, 5.7, 4.8, 27.05, Math.PI, '照相', { bg: '#7a3326', fg: '#f6dfa0' })
    verticalSign(S, 17.7, 4.8, 27.05, Math.PI, '杂货', { bg: '#c99a3a', fg: '#3d2c22', border: '#3d2c22' })
    verticalSign(S, -18.3, 4.8, 27.05, Math.PI, '粮油', { bg: '#c9472f' })
    verticalSign(S, 26.45, 4.6, -12.3, -Math.PI / 2, '茶社', { bg: '#3d5a4a', fg: '#f6dfa0' })
    verticalSign(S, 16.05, 5.0, -4.6, Math.PI / 2, '麻花', { bg: '#c9472f' })
    // 屋顶：巨型麻花 + 霓虹招牌
    giantMahua(S, 11.5, 10.9, 0, Math.PI / 2, 4.6)
    roofBillboard(S, -33.2, 10.26, 20.5, Math.PI / 2, ['嘛去呀？来天津溜达溜达'], 5.2, 1.2)
    roofBillboard(S, 31, 13.3, -7, -Math.PI / 2, ['海河边儿 · 看天津之眼'], 4.6, 1.1)
    // 柏油路面画线：中线、斑马线、“慢行”
    for (let z = -11; z < 25; z += 4) roadPaint(S, -24, z, 0.14, 2.0)
    for (const zc of [-13.2, 14.6]) for (let i = 0; i < 7; i++) roadPaint(S, -26.4 + i * 0.85, zc, 0.45, 2.6)
    roadText(S, -24.9, 4.2, '慢', 0, 1.5)
    roadText(S, -24.9, 2.4, '行', 0, 1.5)
    roadPaint(S, -25.5, -10.2, 2.6, 0.18); roadPaint(S, -22.5, 12, 2.6, 0.18)
    // 施工：锥桶 + 告示
    for (const [x, z] of [[20.7, -9.8], [22.3, -9.8], [21.5, -7.9], [20.6, -8.3]]) { trafficCone(S, x, z); C.addCircle(x, z, 0.2) }
    boardSign(S, 23.2, -9.2, -Math.PI / 2, ['施工中', '您了绕着走'], { w: 0.9, h: 0.6, y: 0.75, font: 'bold 56px', bg: '#f2c14e', fg: '#3d2c22', border: '#3d2c22' })
    C.addCircle(23.2, -9.2, 0.35)
  }

  // ───────── 远景 ─────────
  buildFar() {
    const S = this.staticRoot
    const r = rng(3)
    const cols = [P.cream, P.apricot, P.brick, P.peach, '#d9c7b0']
    // 对岸一排小楼（地台北缘）
    for (let i = 0; i < 10; i++) {
      const x = -42 + i * 11.5 + r() * 2
      if (x > 41 && x < 57) continue
      farBlock(S, x, -71.5, 9 + r() * 2, 6.5, 7 + r() * 8, cols[i % 5], i)
    }
    for (let i = 0; i < 16; i++) {
      const x = -45 + i * 7.6 + r() * 2
      if (x > 44 && x < 54) continue
      const t = tree(S, x, -67.6, 0.8 + r() * 0.3, i + 40, this.dynRoot)
      this.trees.push(t.canopy)
    }
    for (let i = 0; i < 6; i++) lamp(S, -40 + i * 18, -66.8)
  }

  // ───────── 查询 ─────────
  groundHeight(x, z) {
    if (z > -22.6 && z < -19.4 && x > -8 && x < 2) return this.bridgeHeight(x)
    return 0
  }
  zoneAt(x, z) {
    for (const zn of ZONES) if (x >= zn.minX && x <= zn.maxX && z >= zn.minZ && z <= zn.maxZ) return zn
    return null
  }

  // ───────── 每帧 ─────────
  update(dt, t, player) {
    this.time = t
    this.water.update(t)
    this.creekWater.update(t)
    this.eye.update(dt, t)
    for (const c of this.trees) {
      const ph = c.userData.phase
      c.rotation.z = Math.sin(t * 0.8 + ph) * 0.025
      c.rotation.x = Math.sin(t * 0.6 + ph * 1.3) * 0.02
    }
    // 旗子飘动
    for (const f of this.flags) {
      const pos = f.geometry.attributes.position
      const base = f.userData.base
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3]
        const k = (bx + 0.7) / 1.4
        pos.array[i * 3 + 2] = Math.sin(t * 4 + bx * 4) * 0.08 * k
      }
      pos.needsUpdate = true
      f.geometry.computeVertexNormals()
    }
    // 游船来回
    const bx = Math.sin(t * 0.02) * 70
    const dir = Math.cos(t * 0.02)
    this.boat.position.x = bx
    this.boat.position.z = -42 + Math.sin(t * 0.3) * 0.3
    this.boat.rotation.y = dir >= 0 ? 0 : Math.PI
    this.boat.position.y = -0.85 + Math.sin(t * 1.3) * 0.05
    this.boat.rotation.z = Math.sin(t * 1.1) * 0.015
    // 花箱：靠近时轻轻摇
    for (const f of this.flowerBoxes) {
      const fl = f.userData.flowers
      const d = player ? Math.hypot(player.x - f.position.x, player.z - f.position.z) : 99
      if (d < 1.6) fl.userData.wiggle = Math.max(fl.userData.wiggle || 0, 0.6)
      const w = fl.userData.wiggle || 0
      if (w > 0) {
        fl.userData.wiggle = w - dt
        fl.rotation.z = Math.sin(t * 14) * 0.05 * w
        fl.rotation.x = Math.sin(t * 11 + 1) * 0.04 * w
      }
    }
    // 落叶
    for (const pile of this.leafPiles) {
      const near = player && Math.hypot(player.x - pile.x, player.z - pile.z) < 1.2
      for (const L of pile.leaves) {
        if (near && player.speed > 0.5) {
          const dx = L.m.position.x - player.x, dz = L.m.position.z - player.z
          const d = Math.hypot(dx, dz) || 1
          if (d < 0.9 && L.m.position.y < 0.1) { L.v.set(dx / d * 1.4, 1.2 + Math.random(), dz / d * 1.4); L.spin = (Math.random() - 0.5) * 12 }
        }
        if (L.v.lengthSq() > 0) {
          L.v.y -= dt * 6
          L.v.x *= 1 - dt * 1.5; L.v.z *= 1 - dt * 1.5
          L.m.position.addScaledVector(L.v, dt)
          L.m.rotation.y += L.spin * dt; L.m.rotation.x += L.spin * dt * 0.5
          if (L.m.position.y < 0.03) { L.m.position.y = 0.03; L.v.set(0, 0, 0); L.m.rotation.x = 0 }
          L.m.updateMatrix(); pile.im.setMatrixAt(pile.leaves.indexOf(L), L.m.matrix); pile.dirty = true
        }
      }
      if (pile.dirty) { pile.im.instanceMatrix.needsUpdate = true; pile.dirty = false }
    }
    // 鸟笼轻晃
    if (this.cage) this.cage.rotation.z = Math.sin(t * 1.3) * 0.06
    // 马儿：点头、甩尾
    if (this.carriage) {
      const c = this.carriage.userData
      const nod = this.horseNod > 0 ? (this.horseNod -= dt, Math.sin(t * 9) * 0.25) : 0
      c.neck.rotation.x = Math.sin(t * 0.7) * 0.06 + Math.max(0, Math.sin(t * 0.23)) ** 8 * 0.35 + nod
      c.tail.rotation.z = Math.sin(t * 2.1) * 0.3 * (Math.sin(t * 0.4) > 0.3 ? 1 : 0.2)
    }
    // 煎饼：勺子转圈
    if (this.stall) {
      const u = this.stall.userData
      u.ladle.rotation.y = t * 1.5
      // 摊煎饼：竹刮子转圈，面糊慢慢摊开再重来
      const cyc = (t % 9) / 9
      u.scraper.rotation.y = t * 2.4
      const r = Math.min(1, cyc * 1.6)
      u.crepe.scale.set(0.3 + r * 0.75, 1, 0.3 + r * 0.75)
    }
  }
}
