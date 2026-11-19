import * as THREE from 'three'
import { Save } from './core/Save.js'
import { Audio } from './core/Audio.js'
import { Music } from './core/Music.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Input } from './core/Input.js'
import { allMaterials } from './core/Materials.js'
import { World, SPAWN, SUN_DIR, DIORAMA_CENTER } from './world/World.js'
import { Steam } from './world/Steam.js'
import { Fireworks } from './world/Fireworks.js'
import { NPCs } from './npc/NPCs.js'
import { Player } from './player/Player.js'
import { Interaction } from './systems/Interaction.js'
import { Dialogue } from './systems/Dialogue.js'
import { UI } from './ui/UI.js'
import { composePostcard } from './systems/Postcard.js'
import { STAMPS, FRIEND_NPCS, ALL_DONE_LINE } from './data/stamps.js'

const $ = (s) => document.querySelector(s)

// ───────── 基础 ─────────
const save = new Save()
const S = save.data.settings
const audio = new Audio()
audio.enabled = S.sound
audio.volume = S.volume
const music = new Music(audio)
music.enabled = S.music
music.volume = S.musicVolume
const input = new Input($('#touch-layer'), $('#joystick'))
const isTouch = input.isTouch
document.body.classList.toggle('touch', isTouch)
const ui = new UI(save, audio)
let composer = null, gtao = null
let forceMedium = false

const resolveQuality = (q) => (q === 'auto' ? (isTouch || forceMedium ? 'medium' : 'high') : q)
let quality = resolveQuality(S.quality)

const canvas = $('#scene')
let renderer
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' })
} catch (e) {
  $('#load-step').textContent = '这个浏览器暂时不支持 WebGL，换个浏览器再来溜达吧。'
  throw e
}
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.shadowMap.type = THREE.PCFShadowMap

const scene = new THREE.Scene()
// 背景：薄荷绿纯色，整片街区像摆在桌上的微缩模型
const MINT = new THREE.Color('#b0e6d6')
scene.background = MINT
scene.fog = new THREE.Fog(MINT, 90, 420)
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.08, 700)

// 金色时刻光照
const hemi = new THREE.HemisphereLight('#f4f1e2', '#9a8a74', 1.05)
scene.add(hemi)
const sun = new THREE.DirectionalLight('#ffd09a', 2.9)
sun.castShadow = true
sun.shadow.camera.left = -34; sun.shadow.camera.right = 34
sun.shadow.camera.top = 34; sun.shadow.camera.bottom = -34
sun.shadow.camera.near = 1; sun.shadow.camera.far = 200
sun.shadow.bias = -0.0005
sun.shadow.normalBias = 0.04
sun.shadow.radius = 2.5
scene.add(sun, sun.target)
const fill = new THREE.DirectionalLight('#bcd4ff', 0.35)
fill.position.set(30, 20, -40)
scene.add(fill)

function applyQuality() {
  quality = resolveQuality(S.quality)
  const dpr = Math.min(devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1)
  renderer.setPixelRatio(dpr)
  renderer.setSize(innerWidth, innerHeight, false)
  const shadows = quality !== 'low'
  const size = quality === 'high' ? 2048 : 1024
  if (renderer.shadowMap.enabled !== shadows || sun.shadow.mapSize.x !== size) {
    renderer.shadowMap.enabled = shadows
    sun.castShadow = shadows
    sun.shadow.mapSize.set(size, size)
    sun.shadow.map?.dispose(); sun.shadow.map = null
    for (const m of allMaterials()) m.needsUpdate = true
  }
  setupPost(dpr)
}

/** 高画质：MSAA + GTAO 环境光遮蔽 + OutputPass（色调映射与色彩空间） */
function setupPost(dpr) {
  if (quality !== 'high') { if (composer) { composer.dispose(); composer = null; gtao = null } return }
  if (!composer) {
    const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: 4 })
    composer = new EffectComposer(renderer, rt)
    composer.addPass(new RenderPass(scene, camera))
    gtao = new GTAOPass(scene, camera, innerWidth * dpr, innerHeight * dpr)
    gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: 12 })
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 })
    gtao.blendIntensity = 0.9
    composer.addPass(gtao)
    composer.addPass(new OutputPass())
  }
  composer.setPixelRatio(dpr)
  composer.setSize(innerWidth, innerHeight)
}

/** 用天空球生成环境贴图：玻璃、金属、石材会带一点天光反射 */
function setupEnvironment() {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  const sky = world.sky.clone()
  envScene.add(sky)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(300, 16), new THREE.MeshBasicMaterial({ color: '#b8a58c' }))
  ground.rotation.x = -Math.PI / 2; ground.position.y = -2
  envScene.add(ground)
  const rt = pmrem.fromScene(envScene, 0, 0.5, 900)
  scene.environment = rt.texture
  scene.environmentIntensity = 0.55
  pmrem.dispose()
}
applyQuality()
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  applyQuality()
})

// ───────── 状态 ─────────
// loading → title → playing ⇄ (dialogue | paused | modal | resume)
let state = 'loading'
let world, npcs, player, interaction, dialogue, steam, fireworks
let finaleDelay = 0
let pendingFinale = false, finaleT = 0, finaleFrom = null, finaleLook = null
let zone = null
let hintTimer = 0, hintMode = null
let idleGuide = 0
const timer = new THREE.Timer()
let time = 0

function setState(s) {
  state = s
  document.body.classList.toggle('playing', s === 'playing')
  ui.show('#hud', s !== 'loading' && s !== 'title')
  document.body.classList.toggle('overview', s === 'overview' || s === 'finale')
  ui.show('#resume', s === 'resume')
  ui.show('#title', s === 'title')
  if (s !== 'playing') input.clear()
}

// ───────── 全景（微缩模型俯瞰）─────────
const orbit = new OrbitControls(camera, canvas)
orbit.enabled = false
orbit.enableDamping = true
orbit.target.copy(DIORAMA_CENTER)
orbit.minDistance = 30
orbit.maxDistance = 260
orbit.maxPolarAngle = 1.38
orbit.enablePan = false
let overviewFrom = null
function setShadowSpan(span) {
  const c = sun.shadow.camera
  if (c.right === span) return
  c.left = -span; c.right = span; c.top = span; c.bottom = -span
  c.far = span * 2 + 140
  c.updateProjectionMatrix()
}
function enterOverview() {
  if (state !== 'playing' && state !== 'resume') return
  releaseLock()
  if (player.seat) player.stand()
  overviewFrom = state
  setState('overview')
  // 从玩家所在方向拉高到俯瞰
  const dir = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw))
  camera.position.copy(DIORAMA_CENTER).addScaledVector(dir, 90).add(new THREE.Vector3(0, 72, 0))
  orbit.target.copy(DIORAMA_CENTER)
  orbit.enabled = true
  orbit.update()
  ui.show('#overview', true)
}
function exitOverview() {
  if (state !== 'overview') return
  orbit.enabled = false
  ui.show('#overview', false)
  player.apply()
  backToWalk()
}

// ───────── 加载 ─────────
async function boot() {
  world = new World(scene)
  await world.build((p, label) => ui.loadProgress(p * 0.85, label))
  setupEnvironment()
  npcs = new NPCs(scene, world)
  steam = new Steam(scene, world.steamOrigin)
  fireworks = new Fireworks(scene, audio)
  player = new Player(camera, world, input, audio)
  player.sensitivity = S.sensitivity
  player.reset(SPAWN)
  interaction = new Interaction(camera, world.collision)
  dialogue = new Dialogue($('#dialogue'), audio)
  dialogue.on('option', onDialogueOption)
  dialogue.on('action', onDialogueAction)
  dialogue.on('close', onDialogueClose)
  ui.loadProgress(0.9, '预热着色器')
  await new Promise((r) => requestAnimationFrame(r))
  titleCamera(0)
  updateShadow(camera.position)
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera)
  else renderer.compile(scene, camera)
  ui.loadProgress(1, '准备好了')
  ui.refreshStamps()
  setState('title')
  ui.hideLoading()
  loop()
}

// ───────── 相机与阴影 ─────────
function titleCamera(t) {
  // 开始界面：围着整块微缩模型缓缓转
  const a = 2.35 + t * 0.035
  const r = innerWidth < 700 ? 175 : 120
  camera.position.set(DIORAMA_CENTER.x + Math.sin(a) * r, (innerWidth < 700 ? 120 : 82) + Math.sin(t * 0.1) * 3, DIORAMA_CENTER.z + Math.cos(a) * r)
  camera.lookAt(DIORAMA_CENTER.x + (innerWidth < 700 ? 0 : -24 * Math.cos(a)), innerWidth < 700 ? -70 : 0, DIORAMA_CENTER.z + (innerWidth < 700 ? 0 : 24 * Math.sin(a)))
}
const shadowCenter = new THREE.Vector3()
function updateShadow(center) {
  // 以玩家为中心并按阴影贴图像素对齐，减少抖动
  const texel = 68 / sun.shadow.mapSize.x
  shadowCenter.set(Math.round(center.x / texel) * texel, 0, Math.round(center.z / texel) * texel)
  sun.target.position.copy(shadowCenter)
  sun.position.copy(shadowCenter).addScaledVector(SUN_DIR, 90)
}

// ───────── 指针锁定 ─────────
function requestLock() {
  if (isTouch) { setState('playing'); return }
  try {
    const p = canvas.requestPointerLock()
    if (p && p.catch) p.catch(() => { ui.resumeTip('浏览器刚才没让锁定鼠标，稍等一下再点一次就好') ; setState('resume') })
  } catch (e) { setState('resume') }
}
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    ui.resumeTip('')
    if (state === 'resume' || state === 'title' || state === 'paused') { ui.closeAllModals(); setState('playing') }
  } else {
    input.clear()
    if (state === 'playing') openPause()
  }
})
document.addEventListener('pointerlockerror', () => { ui.resumeTip('没能锁定鼠标，请再点一次'); if (state !== 'title') setState('resume') })
addEventListener('blur', () => input.clear())

function releaseLock() { if (document.pointerLockElement) document.exitPointerLock() }
/** 回到散步：桌面端需要用户再次点击来锁定鼠标 */
function backToWalk() {
  if (isTouch) setState('playing')
  else setState('resume')
}

// ───────── 界面事件 ─────────
$('#btn-start').addEventListener('click', () => {
  audio.init()
  if (S.music) music.start()
  save.data.hintsSeen++
  save.write()
  hintMode = 'intro'
  hintTimer = save.data.hintsSeen > 2 ? 4 : 12
  ui.hint(isTouch ? '左边拖动走路 · 右边拖动环顾 · 看向街坊点按钮聊两句' : 'WASD 走动 · 鼠标环顾 · 看向街坊按 E 聊两句')
  ui.setLocation('小洋楼街')
  if (isTouch) setState('playing')
  else { setState('resume'); requestLock() }
})
$('#btn-howto').addEventListener('click', () => ui.openModal('#howto'))
$('#btn-resume').addEventListener('click', (e) => { e.stopPropagation(); requestLock() })
$('#resume').addEventListener('click', () => requestLock())
$('#btn-settings').addEventListener('click', () => { if (state === 'playing' || state === 'resume') openPause() })
$('#btn-stamps').addEventListener('click', () => openStampbook())
$('#btn-overview').addEventListener('click', (e) => { e.stopPropagation(); if (state === 'overview') exitOverview(); else enterOverview() })
$('#btn-back-street').addEventListener('click', () => exitOverview())
$('#btn-pause-overview').addEventListener('click', () => { ui.closeAllModals(); setState('resume'); enterOverview() })
$('#btn-continue').addEventListener('click', () => { ui.closeAllModals(); if (isTouch) setState('playing'); else { setState('resume'); requestLock() } })
$('#btn-pause-stamps').addEventListener('click', () => ui.openModal('#stampbook'))
$('#btn-pause-howto').addEventListener('click', () => ui.openModal('#howto'))
$('#btn-open-postcard').addEventListener('click', () => openPostcard())
$('#btn-replay-finale').addEventListener('click', () => { ui.closeAllModals(); if (state === 'title') return; setState('resume'); startFinale() })
$('#btn-restart-yes').addEventListener('click', () => restart())
$('#btn-act').addEventListener('click', (e) => { e.stopPropagation(); interact() })
ui.onSettings((key, val) => {
  S[key] = val
  save.write()
  if (key === 'sound') audio.setEnabled(val)
  if (key === 'volume') audio.setVolume(val)
  if (key === 'sensitivity' && player) player.sensitivity = val
  if (key === 'quality') { forceMedium = false; applyQuality() }
  if (key === 'music') { audio.init(); music.setEnabled(val) }
  if (key === 'musicVolume') music.setVolume(val)
})
ui.onModalClosed(() => {
  if (state === 'title') return
  backToWalk()
})

function openPause() {
  if (state === 'title' || state === 'loading') return
  releaseLock()
  setState('paused')
  ui.openModal('#pause')
}
function openStampbook() {
  if (state === 'loading') return
  releaseLock()
  if (state !== 'title') setState('modal')
  ui.refreshStamps()
  ui.openModal('#stampbook')
}

// ───────── 键盘 ─────────
input.on('key', (code) => {
  if (state === 'dialogue') {
    if (code === 'KeyE' || code === 'Space' || code === 'Enter') dialogue.advance()
    else if (code.startsWith('Digit')) dialogue.choose(parseInt(code.slice(5)) - 1)
    else if (code === 'Escape') dialogue.close()
    return
  }
  if (state === 'overview') { if (code === 'Escape' || code === 'KeyV') exitOverview(); return }
  if (state === 'finale') { if (code === 'Escape') endFinale('walk'); return }
  if (code === 'Escape') {
    if (ui.modalOpen()) { ui.closeTopModal(); return }
    if (state === 'playing') openPause()
    return
  }
  if (state === 'resume' && (code === 'KeyE' || code === 'Space' || code === 'Enter')) { requestLock(); return }
  if (state !== 'playing') return
  if (code === 'KeyE' || (code === 'Space' && player.seat)) interact()
  if (code === 'KeyB') openStampbook()
  if (code === 'KeyV') enterOverview()
})

// ───────── 互动 ─────────
function interact() {
  if (state !== 'playing') return
  if (player.seat) { player.stand(); ui.hint(''); hintMode = null; return }
  const t = interaction.current
  if (!t) return
  switch (t.kind) {
    case 'npc': startDialogue(t.npc); break
    case 'bench': {
      const seat = t.seats.filter((s) => !s.occupied).sort((a, b) => a.pos.distanceTo(player.pos) - b.pos.distanceTo(player.pos))[0]
      if (seat) sitOn(seat)
      break
    }
    case 'telescope': {
      world.eye.lightUp(9)
      audio.chime()
      player.lookToward(new THREE.Vector3(55, 21, -46), 1.4)
      const first = !save.data.flags.sawEye
      save.data.flags.sawEye = true
      save.write()
      ui.toast(first ? '天津之眼<b>亮灯</b>了！一圈儿彩灯转起来，倍儿漂亮。' : '再瞅一眼——又亮了！')
      checkRiverStamp()
      break
    }
    case 'cat': {
      const n = npcs.petCat()
      audio.meow(npcs.cat.g.position)
      save.data.flags.petCat = true
      save.write()
      const lines = ['小猫“馃子”：喵～', '馃子蹭了蹭你的裤腿。', '馃子翻了个身，露出肚皮——这是信任你了！']
      ui.toast(lines[(n - 1) % 3])
      break
    }
    case 'bike': {
      audio.bell(t.pos)
      const bell = t.ref.userData.bell
      bell.scale.setScalar(1.6)
      setTimeout(() => bell.scale.setScalar(1), 250)
      ui.toast('叮铃铃——')
      break
    }
    case 'flower': {
      t.ref.userData.flowers.userData.wiggle = 2
      audio.rustle(t.pos)
      ui.toast(['月季开得正好，一股甜香味儿。', '花儿晃了晃，像在点头。', '谁家种的？拾掇得真精神。'][Math.floor(Math.random() * 3)])
      break
    }
    case 'carriage': {
      world.horseNod = 1.2
      audio.neigh(world.carriage.position)
      ui.toast(['马儿打了个响鼻儿，冲你点点头。', '“坐车逛五大道不？”——车把式不在，马儿替他招呼。', '马儿甩了甩尾巴：今儿个不拉活儿，歇着。'][Math.floor(Math.random() * 3)])
      break
    }
    case 'map':
      ui.toast('导览：顺着小洋楼街往北，就是<b>海河</b>；沿河往东到<b>观景点</b>，再往南去<b>口袋广场</b>，从槐荫里绕回来。', 6000)
      break
  }
}

function sitOn(seat) {
  player.sit(seat)
  hintMode = 'sit'
  ui.hint(isTouch ? '点「起身」站起来 · 拖动右侧环顾' : 'E / 空格 起身 · 鼠标环顾')
}

// ───────── 对话 ─────────
function startDialogue(npc) {
  const st = { visits: save.data.visits[npc.id] || 0, flags: save.data.flags }
  setState('dialogue')
  releaseLock()
  npcs.startTalk(npc, player.pos)
  dialogue.start(npc, st)
  ui.prompt(null)
}
function onDialogueOption(npc) {
  if (FRIEND_NPCS.includes(npc.id) && !save.data.talked[npc.id]) {
    save.data.talked[npc.id] = true
    save.write()
    const n = FRIEND_NPCS.filter((id) => save.data.talked[id]).length
    if (n < FRIEND_NPCS.length) ui.toast(`认识了 <b>${npc.data.name}</b>（天津熟人 ${n}/5）`)
    else award('friend')
  }
}
function onDialogueAction(action, npc) {
  if (action.startsWith('buy:')) {
    const choice = action.slice(4)
    save.data.flags.boughtJianbing = true
    save.data.flags.jianbingChoice = choice
    save.write()
    steam.burst()
    audio.noiseBurst({ dur: 1.2, type: 'highpass', f: 3000, vol: 0.06 })
    award('breakfast')
  }
  if (action === 'perform') {
    npcs.perform(npc, 11)
    save.data.flags.heardKuaiban = true
    save.write()
  }
}
function onDialogueClose(npc, after) {
  if (!npc) return
  npcs.endTalk(npc)
  save.data.visits[npc.id] = (save.data.visits[npc.id] || 0) + 1
  save.write()
  if (after === 'sitNearby') {
    const seat = world.seats.filter((s) => !s.occupied).sort((a, b) => a.pos.distanceTo(player.pos) - b.pos.distanceTo(player.pos))[0]
    if (seat && seat.pos.distanceTo(player.pos) < 8) sitOn(seat)
  }
  backToWalk()
}

// ───────── 印章 ─────────
function award(id) {
  if (save.data.stamps[id]) return
  save.data.stamps[id] = true
  save.write()
  const s = STAMPS.find((x) => x.id === id)
  audio.stamp()
  ui.stampToast(s)
  ui.refreshStamps(true)
  if (STAMPS.every((x) => save.data.stamps[x.id]) && !save.data.postcard) {
    save.data.postcard = true
    save.write()
    // 收尾：等对话或弹窗结束、回到街上后再播放
    pendingFinale = true
    finaleDelay = 1.6
  }
}
function checkRiverStamp() {
  const f = save.data.flags
  if (f.crossedBridge && f.sawEye) award('river')
  else if (f.sawEye && !f.crossedBridge) ui.toast('再去海河边的<b>小拱桥</b>上走一趟，就能盖“海河散步”章。')
  else if (f.crossedBridge && !f.sawEye) ui.toast('走过小拱桥啦！往东到<b>观景点</b>，用望远镜瞅瞅天津之眼。')
}

// ───────── 收尾 ─────────
function startFinale() {
  pendingFinale = false
  save.data.flags.finaleSeen = true
  save.write()
  releaseLock()
  if (player.seat) player.stand()
  setState('finale')
  finaleT = 0
  finaleFrom = camera.position.clone()
  finaleLook = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(10).add(camera.position)
  world.eye.lightUp(30)
  fireworks.start(16)
  audio.chime()
  const f = save.data.flags
  const n = Object.keys(save.data.visits).length
  ui.finale({
    line: ALL_DONE_LINE,
    lines: [
      `早上吃了套${f.jianbingChoice === 'guobi' ? '馃箅儿' : '油条'}的煎饼果子`,
      '走过海河小桥，瞧见天津之眼亮了灯',
      `跟 ${Math.max(5, n)} 位街坊聊了两句${f.heardKuaiban ? '，还听了段快板儿' : ''}`,
    ],
  })
}
function finaleCamera(dt) {
  finaleT += dt
  const p = Math.min(1, finaleT / 4.5)
  const e = p * p * (3 - 2 * p)
  // 从西南方向斜看：海河、天津之眼和烟花落在画面右侧，结尾卡片在左侧
  const narrow = innerWidth < 700
  const a = -0.55 + finaleT * 0.012
  const R = narrow ? 150 : 100
  const orbitPos = new THREE.Vector3(DIORAMA_CENTER.x + Math.sin(a) * R, narrow ? 95 : 58, DIORAMA_CENTER.z + Math.cos(a) * R)
  const orbitLook = narrow ? new THREE.Vector3(DIORAMA_CENTER.x + 5, -40, DIORAMA_CENTER.z - 10) : new THREE.Vector3(DIORAMA_CENTER.x - 22, 8, DIORAMA_CENTER.z - 18)
  camera.position.lerpVectors(finaleFrom, orbitPos, e)
  camera.lookAt(new THREE.Vector3().lerpVectors(finaleLook, orbitLook, e))
}
function endFinale(next) {
  ui.finale(null)
  if (next === 'postcard') { setState('modal'); openPostcard(); return }
  if (next === 'restart') { restart(); return }
  player.apply()
  backToWalk()
}
$('#btn-finale-postcard').addEventListener('click', () => endFinale('postcard'))
$('#btn-finale-walk').addEventListener('click', () => endFinale('walk'))
$('#btn-finale-restart').addEventListener('click', () => endFinale('restart'))

// ───────── 明信片 ─────────
function capturePhoto() {
  const prevPos = camera.position.clone(), prevQuat = camera.quaternion.clone()
  camera.position.set(9.5, 2.3, -23.6)
  camera.lookAt(52, 17, -44)
  updateShadow(new THREE.Vector3(20, 0, -30))
  const g = world.eye.setGlow(1, time)
  renderer.render(scene, camera)
  const src = renderer.domElement
  const c = document.createElement('canvas')
  const ar = 900 / 640
  let w = src.width, h = src.height
  if (w / h > ar) w = h * ar; else h = w / ar
  c.width = Math.round(w); c.height = Math.round(h)
  c.getContext('2d').drawImage(src, (src.width - w) / 2, (src.height - h) / 2, w, h, 0, 0, c.width, c.height)
  world.eye.setGlow(g, time)
  camera.position.copy(prevPos); camera.quaternion.copy(prevQuat)
  return c
}
let postcardUrl = null
let postcardBlob = null
// 在 claude.ai 在线页面里，普通下载链接会被拦截，改用平台的 downloads 能力；本地运行时照常用链接下载
let platformDownloads = null
try { window.claude?.use?.('downloads')?.then((d) => { platformDownloads = d }).catch(() => {}) } catch (e) { /* 不在 claude.ai 中 */ }
$('#btn-download').addEventListener('click', (e) => {
  if (!platformDownloads || !postcardBlob) return
  e.preventDefault()
  platformDownloads.save({ filename: 'tianjin-walk-postcard.png', data: postcardBlob })
    .then(() => ui.toast('明信片收好了！'))
    .catch((err) => { if (err?.code !== 'declined') ui.toast('这里暂时存不了文件，可以右键（或长按）明信片图片保存。') })
})
function openPostcard() {
  if (!save.data.postcard) return
  const card = composePostcard(capturePhoto(), save)
  const img = $('#postcard-img')
  img.src = card.toDataURL('image/png')
  card.toBlob((blob) => {
    if (postcardUrl) URL.revokeObjectURL(postcardUrl)
    postcardBlob = blob
    postcardUrl = URL.createObjectURL(blob)
    $('#btn-download').href = postcardUrl
  }, 'image/png')
  ui.openModal('#postcard')
}

// ───────── 重新开始 ─────────
function restart() {
  save.resetProgress()
  for (const s of world.seats) if (!npcs.list.some((n) => n.seat === s)) s.occupied = false
  player.reset(SPAWN)
  zone = null
  ui.refreshStamps()
  ui.closeAllModals()
  ui.setLocation('小洋楼街')
  ui.toast('重新出发！嘛去呀？')
  backToWalk()
}

// ───────── 主循环 ─────────
function loop() {
  requestAnimationFrame(loop)
  timer.update()
  const dt = Math.min(timer.getDelta(), 0.1)
  time += dt
  const pRef = { x: player.pos.x, z: player.pos.z, y: player.y, speed: player.speed }
  world.update(dt, time, pRef)
  npcs.update(dt, time, pRef, audio)
  steam.update(dt)
  dialogue.update(dt)

  fireworks.update(dt)
  if (pendingFinale && (state === 'playing' || state === 'resume') && !ui.modalOpen()) {
    finaleDelay -= dt
    if (finaleDelay <= 0) startFinale()
  }
  const bird = state === 'title' || state === 'loading' || state === 'overview' || (state === 'finale' && finaleT > 2)
  if (state === 'title' || state === 'loading') titleCamera(time)
  else if (state === 'overview') orbit.update()
  else if (state === 'finale') finaleCamera(dt)
  else player.update(dt, state === 'playing')
  // 俯瞰时阴影覆盖整块地台；走路时只覆盖身边（更清晰）
  setShadowSpan(bird ? 78 : 34)
  scene.fog.near = bird ? 260 : 70
  scene.fog.far = bird ? 700 : (quality === 'low' ? 260 : 360)
  updateShadow(bird ? DIORAMA_CENTER : player.pos)

  // 互动目标
  let target = null
  if (state === 'playing') {
    if (player.seat) ui.prompt({ verb: '起身', who: '' }, isTouch)
    else {
      target = interaction.pick([...world.interactables, ...npcs.interactables()], player.pos)
      ui.prompt(target ? { verb: target.label, who: target.name } : null, isTouch)
    }
  } else if (state !== 'dialogue') ui.prompt(null)

  if (state !== 'title' && state !== 'overview' && state !== 'finale') {
    // 地点
    const z = world.zoneAt(player.pos.x, player.pos.z)
    if (z && z !== zone) {
      zone = z
      ui.setLocation(z.name, true)
      const key = 'seen_' + z.id
      if (!save.data.flags[key]) {
        save.data.flags[key] = true
        save.write()
        if (z.id !== 'street') {
          audio.discover()
          const extra = { deck: ' —— 用望远镜瞅一眼天津之眼', bridge: '', promenade: ' —— 河风来了', plaza: ' —— 有人在打快板儿', stall: ' —— 闻着就香' }[z.id] || ''
          ui.toast(`发现：<b>${z.name}</b>${extra}`)
        }
      }
    }
    // 过桥
    if (!save.data.flags.crossedBridge && world.groundHeight(player.pos.x, player.pos.z) > 0.82) {
      save.data.flags.crossedBridge = true
      save.write()
      checkRiverStamp()
    }
    // 提示淡出
    if (hintMode === 'intro') {
      hintTimer -= dt
      if (hintTimer <= 0 || player.moved > 18) { ui.hint(''); hintMode = null }
    }
    if (hintMode === 'sit' && !player.seat) { ui.hint(''); hintMode = null }
    // 迷路引导
    if (state === 'playing' && !save.data.flags.seen_promenade) {
      idleGuide += dt
      if (idleGuide > 40) { idleGuide = -999; ui.toast('顺着小洋楼街往<b>北</b>走，前边儿就是海河。') }
    }
  }

  audio.update(dt, time, { x: camera.position.x, z: camera.position.z, yaw: state === 'title' ? 0 : player.yaw }, { stall: world.steamOrigin })
  // 音乐：对话时稍微压低，快板表演时让位给竹板声
  const kb = npcs.byId.kuaiban
  music.setDuck(kb.performT > 0 ? 0.2 : state === 'dialogue' ? 0.6 : state === 'finale' ? 1.3 : 1)
  // “自动”画质：前几秒帧率太低就降一档
  if (S.quality === 'auto' && state === 'playing' && quality === 'high') {
    fpsAcc.t += dt; fpsAcc.n++
    if (fpsAcc.t > 6) {
      if (fpsAcc.n / fpsAcc.t < 28) { S.quality = 'auto'; quality = 'medium'; forceMedium = true; applyQuality(); ui.toast('画面有点吃力，已自动把画质调到「中」。') }
      fpsAcc.t = -1e9
    }
  }
  if (composer) composer.render(dt)
  else renderer.render(scene, camera)
}
const fpsAcc = { t: 0, n: 0 }

// 方便自动化测试与调试
window.__tj = { startFinale, enterOverview, exitOverview, get info() { return renderer.info.render }, get music() { return music }, get state() { return state }, get player() { return player }, get world() { return world }, get npcs() { return npcs }, save, interact, award, openPostcard, setState }

boot().catch((e) => {
  console.error(e)
  $('#load-step').textContent = '出门时绊了一下：' + e.message
})
