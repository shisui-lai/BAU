import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
export const useViewStore = defineStore('viewStore', {
  state: () => ({ activeView: 'isCellVltg' }),
  actions: {
    setActiveView(viewKey) {
      this.activeView = viewKey
    }
  }
})
