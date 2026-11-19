import { GLOSSARY } from '../data/glossary.js'

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** 对话面板：逐字显示、立即显示整句、继续、选项、关闭 */
export class Dialogue {
  constructor(root, audio) {
    this.root = root
    this.audio = audio
    this.nameEl = root.querySelector('.dlg-name')
    this.titleEl = root.querySelector('.dlg-title')
    this.textEl = root.querySelector('.dlg-text')
    this.glossEl = root.querySelector('.dlg-gloss')
    this.optsEl = root.querySelector('.dlg-options')
    this.nextEl = root.querySelector('.dlg-next')
    root.querySelector('.dlg-close').addEventListener('click', (e) => { e.stopPropagation(); this.close() })
    root.querySelector('.dlg-body').addEventListener('click', () => this.advance())
    this.nextEl.addEventListener('click', (e) => { e.stopPropagation(); this.advance() })
    this.open = false
    this.handlers = {}
  }
  on(n, f) { this.handlers[n] = f }

  start(npc, state) {
    this.npc = npc
    this.data = npc.data
    this.after = null
    this.open = true
    this.root.classList.add('show')
    this.nameEl.textContent = this.data.name
    this.titleEl.textContent = this.data.title
    this.goto(this.data.entry(state))
  }

  goto(id) {
    const node = this.data.nodes[id]
    if (!node) { this.close(); return }
    this.node = node
    this.nodeId = id
    this.pages = Array.isArray(node.text) ? node.text : [node.text]
    this.page = 0
    this.showPage()
  }

  showPage() {
    const raw = this.pages[this.page]
    const terms = []
    const plain = raw.replace(/\{([^}]+)\}/g, (_, w) => { terms.push(w); return w })
    this.full = raw
    this.plainLen = plain.length
    this.shown = 0
    this.typing = true
    this.terms = terms
    this.optsEl.innerHTML = ''
    this.optsEl.classList.remove('show')
    this.nextEl.classList.remove('show')
    this.glossEl.innerHTML = ''
    this.renderText()
    this.audio.blip()
  }

  renderText() {
    // 按已显示字数渲染，方言词加下划线
    let count = 0, html = ''
    const parts = this.full.split(/(\{[^}]+\})/)
    for (const p of parts) {
      if (!p) continue
      const isTerm = p.startsWith('{')
      const word = isTerm ? p.slice(1, -1) : p
      const take = Math.max(0, Math.min(word.length, this.shown - count))
      count += word.length
      if (take <= 0) continue
      const seg = esc(word.slice(0, take))
      html += isTerm && GLOSSARY[word] ? `<span class="gloss">${seg}</span>` : seg
    }
    this.textEl.innerHTML = html
  }

  update(dt) {
    if (!this.open || !this.typing) return
    this.shown += dt * 34
    if (this.shown >= this.plainLen) { this.finishTyping(); return }
    this.renderText()
  }

  finishTyping() {
    this.shown = this.plainLen
    this.typing = false
    this.renderText()
    this.glossEl.innerHTML = this.terms.filter((t) => GLOSSARY[t]).map((t) => `<span><b>${esc(t)}</b>：${esc(GLOSSARY[t])}</span>`).join('')
    const last = this.page >= this.pages.length - 1
    if (!last) { this.nextEl.textContent = '继续 ▸'; this.nextEl.classList.add('show'); return }
    const options = this.node.options
    if (options && options.length) {
      options.forEach((o, i) => {
        const b = document.createElement('button')
        b.className = 'dlg-opt'
        b.innerHTML = `<span class="num">${i + 1}</span>${esc(o.label)}`
        b.addEventListener('click', (e) => { e.stopPropagation(); this.choose(i) })
        this.optsEl.appendChild(b)
      })
      this.optsEl.classList.add('show')
    } else {
      this.nextEl.textContent = '回见 ✓'
      this.nextEl.classList.add('show')
    }
  }

  /** 点击/E/空格：打字中则立即显示整句；否则翻页或结束 */
  advance() {
    if (!this.open) return
    if (this.typing) { this.finishTyping(); return }
    if (this.page < this.pages.length - 1) { this.page++; this.showPage(); return }
    if (!this.node.options || !this.node.options.length) this.close()
  }

  choose(i) {
    if (!this.open || this.typing) return
    const o = this.node.options?.[i]
    if (!o) return
    this.audio.select()
    this.handlers.option?.(this.npc, o)
    if (o.action) this.handlers.action?.(o.action, this.npc)
    if (o.after) this.after = o.after
    this.goto(o.next)
  }

  close() {
    if (!this.open) return
    this.open = false
    this.root.classList.remove('show')
    this.audio.close()
    const npc = this.npc, after = this.after
    this.npc = null
    this.handlers.close?.(npc, after)
  }
}
