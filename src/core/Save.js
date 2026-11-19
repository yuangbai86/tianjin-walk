const KEY = 'tianjin-walk-save-v1'

const defaults = () => ({
  settings: { sound: true, volume: 0.7, music: true, musicVolume: 0.5, sensitivity: 1, quality: 'auto' },
  stamps: {},          // { breakfast: true, river: true, friend: true }
  flags: {},           // crossedBridge, sawEye, boughtJianbing ...
  talked: {},          // npcId -> true
  visits: {},          // npcId -> 次数
  hintsSeen: 0,
  postcard: false,
})

export class Save {
  constructor() {
    this.data = defaults()
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const d = defaults()
        this.data = { ...d, ...parsed, settings: { ...d.settings, ...(parsed.settings || {}) } }
      }
    } catch (e) { /* 隐私模式等：使用默认值 */ }
  }
  write() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)) } catch (e) { /* ignore */ }
  }
  resetProgress() {
    const settings = this.data.settings
    this.data = defaults()
    this.data.settings = settings
    this.write()
  }
}
