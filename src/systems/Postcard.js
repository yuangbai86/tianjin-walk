import { STAMPS } from '../data/stamps.js'

const SERIF = '"Noto Serif CJK SC","Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif'
const KAI = '"Kaiti SC","STKaiti","KaiTi","Noto Serif CJK SC","Songti SC",serif'
const SANS = '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Microsoft YaHei",sans-serif'

/** 合成纪念明信片：photo 为实时渲染的场景截图（canvas） */
export function composePostcard(photo, save) {
  const W = 1600, H = 1000
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d')
  // 纸张
  x.fillStyle = '#fbf3e4'; x.fillRect(0, 0, W, H)
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(150,110,70,${Math.random() * 0.05})`
    x.fillRect(Math.random() * W, Math.random() * H, 2, 2)
  }
  x.strokeStyle = '#c9472f'; x.lineWidth = 6; x.setLineDash([26, 14])
  x.strokeRect(22, 22, W - 44, H - 44); x.setLineDash([])
  // 照片
  const px = 60, py = 60, pw = 900, ph = 640
  x.save()
  x.shadowColor = 'rgba(80,50,30,0.25)'; x.shadowBlur = 18; x.shadowOffsetY = 6
  x.fillStyle = '#fff'; x.fillRect(px - 12, py - 12, pw + 24, ph + 24)
  x.restore()
  if (photo) {
    const ar = pw / ph, sar = photo.width / photo.height
    let sw = photo.width, sh = photo.height, sx = 0, sy = 0
    if (sar > ar) { sw = sh * ar; sx = (photo.width - sw) / 2 } else { sh = sw / ar; sy = (photo.height - sh) / 2 }
    x.drawImage(photo, sx, sy, sw, sh, px, py, pw, ph)
  } else { x.fillStyle = '#7fb3c9'; x.fillRect(px, py, pw, ph) }
  // 暖色滤镜
  x.fillStyle = 'rgba(255,200,140,0.08)'; x.fillRect(px, py, pw, ph)
  // 标题
  x.fillStyle = '#7a3326'
  x.font = `900 76px ${SERIF}`
  x.fillText('嘛去呀？', px, 800)
  x.font = `600 34px ${SERIF}`
  x.fillStyle = '#9a5a3a'
  x.fillText('—— 天津散步  A Little Walk in Tianjin', px + 300, 795)
  x.font = `400 24px ${SANS}`
  x.fillStyle = '#8a7a6a'
  x.fillText('天津印象街区 · 小洋楼 · 海河 · 天津之眼 · 口袋广场', px, 850)
  // 分隔线
  x.strokeStyle = '#d9c4a6'; x.lineWidth = 2
  x.beginPath(); x.moveTo(1010, 80); x.lineTo(1010, 920); x.stroke()
  // 邮票
  drawPostage(x, 1370, 70)
  drawPostmark(x, 1215, 200)
  // 寄语
  const f = save.data.flags
  const food = f.jianbingChoice === 'guobi' ? '馃箅儿' : '油条'
  const lines = [
    '见字如面：',
    `今儿在天津溜达了一圈儿。`,
    `早上吃了套${food}的煎饼果子，`,
    '在海河边儿过了小拱桥，',
    f.sawEye ? '瞧见天津之眼亮了灯。' : '远远瞧了眼天津之眼。',
    f.heardKuaiban ? '张大爷给我打了段快板儿，' : '广场上有人打快板儿，',
    f.petCat ? '小猫“馃子”还冲我喵了一声。' : '广场上的小猫在晒太阳。',
    '',
    '行啊，您了这也算天津熟人了！',
  ]
  x.fillStyle = '#3d2c22'
  x.font = `500 34px ${KAI}`
  lines.forEach((l, i) => x.fillText(l, 1050, 360 + i * 50))
  // 地址线
  x.strokeStyle = '#cdb89a'; x.lineWidth = 2
  for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(1050, 860 + i * 46); x.lineTo(1540, 860 + i * 46); x.stroke() }
  x.font = `400 26px ${KAI}`; x.fillStyle = '#7a6a5a'
  x.fillText('寄给：下回还想来天津的自己', 1056, 850)
  const d = new Date()
  x.fillText(`${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 于海河边`, 1056, 896)
  // 三枚印章
  STAMPS.forEach((s, i) => drawSeal(x, 720 + i * 120, 880, s, save.data.stamps[s.id], i))
  return c
}

function drawPostage(x, X, Y) {
  const w = 160, h = 190
  x.save()
  x.fillStyle = '#fff'
  x.fillRect(X - 8, Y - 8, w + 16, h + 16)
  // 齿孔
  x.fillStyle = '#fbf3e4'
  for (let i = 0; i <= 12; i++) {
    for (const [cx, cy] of [[X - 8 + i * (w + 16) / 12, Y - 8], [X - 8 + i * (w + 16) / 12, Y + h + 8]]) { x.beginPath(); x.arc(cx, cy, 5, 0, Math.PI * 2); x.fill() }
  }
  for (let i = 0; i <= 14; i++) {
    for (const [cx, cy] of [[X - 8, Y - 8 + i * (h + 16) / 14], [X + w + 8, Y - 8 + i * (h + 16) / 14]]) { x.beginPath(); x.arc(cx, cy, 5, 0, Math.PI * 2); x.fill() }
  }
  const g = x.createLinearGradient(0, Y, 0, Y + h)
  g.addColorStop(0, '#f6c995'); g.addColorStop(1, '#e98a6a')
  x.fillStyle = g; x.fillRect(X, Y, w, h)
  // 小摩天轮
  x.strokeStyle = '#fff'; x.lineWidth = 3
  const cx = X + w / 2, cy = Y + 80
  x.beginPath(); x.arc(cx, cy, 48, 0, Math.PI * 2); x.stroke()
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48); x.stroke() }
  x.beginPath(); x.moveTo(cx - 30, Y + 150); x.lineTo(cx, cy); x.lineTo(cx + 30, Y + 150); x.stroke()
  x.fillStyle = '#3f9a9a'; x.fillRect(X, Y + 148, w, 42)
  x.fillStyle = '#fff'; x.font = `700 22px ${SANS}`; x.textAlign = 'center'
  x.fillText('天津 · 嘛去呀', cx, Y + 177)
  x.textAlign = 'left'
  x.restore()
}

function drawPostmark(x, X, Y) {
  x.save()
  x.globalAlpha = 0.65
  x.strokeStyle = '#4a4a6a'; x.lineWidth = 3
  x.beginPath(); x.arc(X, Y, 62, 0, Math.PI * 2); x.stroke()
  x.beginPath(); x.arc(X, Y, 50, 0, Math.PI * 2); x.stroke()
  x.fillStyle = '#4a4a6a'; x.textAlign = 'center'
  x.font = `700 22px ${SANS}`; x.fillText('天津', X, Y - 8)
  const d = new Date()
  x.font = `600 16px ${SANS}`; x.fillText(`${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`, X, Y + 18)
  for (let i = 0; i < 3; i++) {
    x.beginPath()
    for (let k = 0; k <= 16; k++) { const xx = X + 70 + k * 6, yy = Y - 20 + i * 20 + Math.sin(k * 0.8) * 5; k ? x.lineTo(xx, yy) : x.moveTo(xx, yy) }
    x.stroke()
  }
  x.restore()
}

export function drawSeal(x, X, Y, s, got, i) {
  x.save()
  x.translate(X, Y); x.rotate((i - 1) * 0.12)
  x.globalAlpha = got ? 0.88 : 0.18
  x.strokeStyle = s.color; x.fillStyle = s.color
  x.lineWidth = 5
  x.beginPath(); x.arc(0, 0, 50, 0, Math.PI * 2); x.stroke()
  x.lineWidth = 2
  x.beginPath(); x.arc(0, 0, 42, 0, Math.PI * 2); x.stroke()
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.font = `900 24px ${SERIF}`
  x.fillText(s.name.slice(0, 2), 0, -12)
  x.fillText(s.name.slice(2), 0, 16)
  x.restore()
}
