import { defineStore } from 'pinia'

const LS_KEY = 'event:recent100'

export const useRecentEventsStore = defineStore('recentEvents', {
  state: () => ({
    items: [],
    blockId: null
  }),
  getters: {
    list: (state) => state.items
  },
  actions: {
    setRows(blockId, rows) {
      this.blockId = blockId
      this.items = Array.isArray(rows) ? rows.slice(-1000) : []
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ blockId: this.blockId, items: this.items }))
      } catch {}
    },
    clear() {
      this.blockId = null
      this.items = []
      try {
        localStorage.removeItem(LS_KEY)
      } catch {}
    },
    restore() {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return
        const obj = JSON.parse(raw)
        if (obj && Array.isArray(obj.items)) {
          this.blockId = obj.blockId || null
          this.items = obj.items.slice(-1000)
        }
      } catch {}
    }
  }
})
