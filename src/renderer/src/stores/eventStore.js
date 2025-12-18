// 事件记录导出状态管理Store
import { defineStore } from 'pinia'

export const useEventStore = defineStore('event', {
  state: () => ({
    isExporting: false,
    current: 0,
    total: 0
  }),

  getters: {
    percent: (state) => {
      if (state.total === 0) return 0
      return Math.floor((state.current / state.total) * 100)
    }
  },

  actions: {
    /**
     * 开始导出
     * @param {number} totalCount - 总记录数
     */
    start(totalCount) {
      this.isExporting = true
      this.current = 0
      this.total = totalCount
    },

    /**
     * 更新导出进度
     * @param {number} currentIndex - 当前已读取的记录数
     * @param {number} totalCount - 总记录数（可选，用于更新总数）
     */
    update(currentIndex, totalCount = null) {
      this.current = currentIndex
      if (totalCount !== null) {
        this.total = totalCount
      }
      // 如果当前进度达到或超过总数，自动完成
      if (this.current >= this.total && this.total > 0) {
        this.complete()
      }
    },

    /**
     * 完成导出
     */
    complete() {
      this.isExporting = false
      // 保持current和total，以便显示最终结果
    },

    /**
     * 取消导出
     */
    cancel() {
      this.isExporting = false
      this.current = 0
      this.total = 0
    },

    /**
     * 导出失败
     */
    fail() {
      this.isExporting = false
      this.current = 0
      this.total = 0
    }
  }
})
