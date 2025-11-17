// stores/export.js
import { defineStore } from 'pinia'
export const useExportStore = defineStore('export', {
  state: () => ({
    isExporting: false,
    current: 0,
    total: 0
  }),
  getters: {
    percent: (state) => (state.total ? Math.floor((state.current / state.total) * 100) : 0)
  },
  actions: {
    start(totalCount) {
      this.isExporting = true
      this.current = 0
      this.total = totalCount
    },
    update(currentIndex) {
      this.current = currentIndex
      if (currentIndex >= this.total) {
        this.isExporting = false
      }
    },
    fail() {
      this.isExporting = false
      this.current = 0
      this.total = 0
    }
  }
})
