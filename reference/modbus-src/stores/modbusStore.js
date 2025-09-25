import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
export const useModbusStore = defineStore('modbusStore', () => {
  const modbusClients = ref(
    JSON.parse(localStorage.getItem('modbusClients')) || [
      { ModbusServerIP: '192.168.10.208', ModbusServerSum: 25, skills: ['JavaScript', 'Node.js'] }
    ]
  )
  const updateModbusClients = (newModbusClients) => {
    modbusClients.value = newModbusClients
    localStorage.setItem('modbusClients', JSON.stringify(newModbusClients))
  }
  // 监听 modbusClients 的变化并存储到 localStorage
  watch(
    modbusClients,
    (newClients) => {
      localStorage.setItem('modbusClients', JSON.stringify(newClients))
    },
    { deep: true }
  )
  return { modbusClients, updateModbusClients }
})
