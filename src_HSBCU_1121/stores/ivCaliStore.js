import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useIVCaliStore = defineStore('ivCaliStore', () => {
  const ivData = ref({})
  const kbData = ref({})
  // 修改后的setIVData，接收IP参数
  const setIVData = (ip, current, clusterVltg, prechargeVltg) => {
    ivData.value[ip] = {
      current: current || 0,
      clusterVltg: clusterVltg || 0,
      prechargeVltg: prechargeVltg || 0
    }
  }
  const setKBData = (ip, newKbDataArray) => {
    const keys = [
      '电流充电小量程校准K值',
      '电流充电小量程校准B值',
      '电流放电小量程校准K值',
      '电流放电小量程校准B值',
      '电流充电大量程校准K值',
      '电流充电大量程校准B值',
      '电流放电大量程校准K值',
      '电流放电大量程校准B值',
      '预充电压校准K值',
      '预充电压校准B值',
      '组端电压校准K值',
      '组端电压校准B值'
    ]
    kbData.value[ip] = keys.reduce((acc, key, index) => {
      acc[key] = newKbDataArray[index]
      return acc
    }, {})
  }
  return {
    ivData,
    setIVData,
    kbData,
    setKBData
  }
})
