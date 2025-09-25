// src/stores/controlPendingValue.js
import { defineStore } from 'pinia'

export const usePendingValueStore = defineStore('controlPendingValue', {
  state: () => ({
    // 用于存储每个控件的 pendingValue
    controlPendingValues: {}
  }),
  actions: {
    // 设置特定控件的 pendingValue
    setPendingValue(classification, label, value) {
      if (!this.controlPendingValues[classification]) {
        this.controlPendingValues[classification] = {}
      }
      this.controlPendingValues[classification][label] = value
    },
    // 获取特定控件的 pendingValue
    getPendingValue(classification, label) {
      return this.controlPendingValues[classification]?.[label] || null
    }
  }
})
