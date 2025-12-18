import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useBmuCountStore = defineStore('bmuCountStore', () => {
  const bmuCountData = ref({})
  const totalVoltage = ref({})
  const setBmuCountData = (ip, bmuNum, afeNum, cellNum, tempNum) => {
    bmuCountData.value[ip] = {
      bmuNum: bmuNum || 0,
      afeNum: afeNum || 0,
      cellNum: cellNum || 0,
      tempNum: tempNum || 0
    }
  }
  const setTotalVoltage = (ip, newTotalVoltage) => {
    totalVoltage.value[ip] = newTotalVoltage
  }
  return {
    bmuCountData,
    totalVoltage,
    setBmuCountData,
    setTotalVoltage
  }
})
