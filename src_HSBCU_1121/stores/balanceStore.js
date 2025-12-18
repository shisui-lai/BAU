// stores/balanceStore.js
import { value } from 'lodash-es'
import { defineStore } from 'pinia'

export const useBalanceStore = defineStore('balance', {
  state: () => ({
    balanceData: {} // 以 IP 为键存储均衡数据
  }),
  actions: {
    updateBalanceData(ip, raw, mode = 'charge') {
      const annotated = raw.map((bmu) => ({
        packID: bmu.packID,
        cells: bmu.cells.map((cell) => ({
          index: cell.index,
          value: cell.value,
          mode
        }))
      }))
      this.balanceData[ip] = annotated
    }
  }
})
