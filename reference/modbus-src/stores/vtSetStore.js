import { defineStore } from 'pinia'
import { ref, reactive, computed, watch } from 'vue'
import { useIpStore } from './ipStore.js'
export const useVtSetStore = defineStore('vtSetStore', () => {
  const ipStore = useIpStore() // 必须在此处初始化
  const isTSetAll = ref(true)
  const isVSetAll = ref(true)
  // 温度校准相关
  const temperatureBMU = ref(null) // BMU编号
  const temperatureCell = ref(null) // 电芯编号
  const temperatureValue = ref(null) // 温度校准值
  // 电压校准相关
  const voltageBMU = ref(null) // BMU编号
  const voltageCell = ref(null) // 电芯编号
  const voltageValue = ref(null) // 电压校准值
  const selectedBMU = ref(null) // 当前选中的 BMU，默认为 BMU 1
  //温度屏蔽相关
  const selectedBMUF = ref(null)
  const tempShieldMode = ref('all')
  const tempShieldBMU = ref(null)
  const tempShieldCell = ref(null)
  const tempShieldValue = ref(false)
  // 电压滤波状态
  const voltShieldMode = ref('all')
  const voltShieldBMU = ref(null)
  const voltShieldCell = ref(null)
  const voltShieldValue = ref(false)
  const tempRangeStart = reactive({ bmu: 1, cell: 1 })
  const tempRangeEnd = reactive({ bmu: 1, cell: 1 })
  const voltRangeStart = reactive({ bmu: 1, cell: 1 })
  const voltRangeEnd = reactive({ bmu: 1, cell: 1 })
  //均衡相关
  const balance = reactive({
    balanceTime: 0,
    balanceEnabelOption: [
      { label: 'balanceControl.balanceEnabelOption.disable', value: 0 },
      { label: 'balanceControl.balanceEnabelOption.enable', value: 1 }
    ],
    balanceModeOption: [
      { key: 'balanceControl.balanceModeOption.discharge', value: '0x0001' },
      { key: 'balanceControl.balanceModeOption.charge', value: '0x0000' }
    ],
    selectionOptions: [
      { key: 'balanceControl.selectionOptions.all', value: 'all' },
      { key: 'balanceControl.selectionOptions.odd', value: 'odd' },
      { key: 'balanceControl.selectionOptions.even', value: 'even' }
    ],
    balanceEnabel: 1,
    balanceMode: '0x0001',
    cellStatus: [],
    allEnabled: false,
    isAllEnabled: false
  })
  const selectionMode = ref('all')
  const balanceBMUOptions = computed(() => {
    const config = ipStore.bmuConfig[ipStore.selectedIp] || { bmuTotal: 0 } // 确保 config 存在
    return Array.from({ length: config.bmuTotal }, (_, index) => ({
      label: `BMU${index + 1}`,
      value: index + 1
    }))
  })
  const balanceStatusMessage = ref('')
  const balanceBMU = ref(1)
  // 保证 balanceBMU 跟随 options 变化
  watch(
    balanceBMUOptions,
    (opts) => {
      if (opts.length && !opts.find((o) => o.value === balanceBMU.value)) {
        balanceBMU.value = opts[0].value
      }
    },
    { immediate: true }
  )
  const setBalanceStatus = (index, status) => {
    balance.cellStatus[index] = status
  }
  const setBalanceByMode = (mode, status) => {
    const len = balance.cellStatus.length
    for (let i = 0; i < len; i++) {
      const isOdd = (i + 1) % 2 === 1
      if (mode === 'all' || (mode === 'odd' && isOdd) || (mode === 'even' && !isOdd)) {
        balance.cellStatus[i] = status
      }
    }
    balance.allEnabled = balance.cellStatus.every(Boolean)
    balance.isAllEnabled = balance.allEnabled
  }
  // 批量设置均衡状态
  const setAllBalance = (status) => {
    balance.cellStatus.fill(status)
    balance.allEnabled = status
  }
  const balanceTimer = reactive({
    remainingTime: 0,
    activeBMU: null,
    activeCells: [],
    intervalId: null
  })

  // 修改定时器方法
  const startBalanceTimer = (duration, bmuIndex, cells) => {
    clearBalanceTimer() // 先清除已有定时器
    balanceTimer.activeBMU = bmuIndex
    balanceTimer.activeCells = cells
    balanceTimer.remainingTime = duration

    // 记录定时器开始时间和计划结束时间
    const startTime = Date.now()
    const endTime = startTime + duration * 1000

    // 存储到localStorage，确保即使页面刷新也能恢复
    const timerData = {
      startTime,
      endTime,
      duration,
      bmuIndex,
      cells,
      selectedIp: ipStore.selectedIp
    }
    localStorage.setItem('balanceTimerData', JSON.stringify(timerData))

    // 设置定时器
    balanceTimer.intervalId = setInterval(() => {
      if (balanceTimer.remainingTime > 0) {
        balanceTimer.remainingTime--
      } else {
        console.log('Timer finished. Stopping balance.')
        stopBalance()
        clearInterval(balanceTimer.intervalId)
        balanceTimer.intervalId = null
        // 清除localStorage中的定时器数据
        localStorage.removeItem('balanceTimerData')
      }
    }, 1000)
  }
  const clearBalanceTimer = () => {
    if (balanceTimer.intervalId) {
      clearInterval(balanceTimer.intervalId)
      balanceTimer.intervalId = null
    }
    balanceTimer.remainingTime = 0
    // 清除localStorage中的定时器数据
    localStorage.removeItem('balanceTimerData')
  }

  // 初始化方法，在应用启动时恢复定时器状态
  const initBalanceTimer = () => {
    try {
      const savedTimer = localStorage.getItem('balanceTimerData')
      if (savedTimer) {
        const timerData = JSON.parse(savedTimer)
        const now = Date.now()

        // 检查是否已经超时
        if (now < timerData.endTime) {
          // 计算剩余时间（秒）
          const remainingTime = Math.floor((timerData.endTime - now) / 1000)

          // 恢复定时器
          balanceTimer.activeBMU = timerData.bmuIndex
          balanceTimer.activeCells = timerData.cells
          balanceTimer.remainingTime = remainingTime

          // 重新启动定时器
          balanceTimer.intervalId = setInterval(() => {
            if (balanceTimer.remainingTime > 0) {
              balanceTimer.remainingTime--
            } else {
              console.log('Restored timer finished. Stopping balance.')
              stopBalance()
              clearInterval(balanceTimer.intervalId)
              balanceTimer.intervalId = null
              localStorage.removeItem('balanceTimerData')
            }
          }, 1000)

          console.log(`已恢复均衡定时器，剩余时间: ${remainingTime}秒`)
        } else {
          // 已超时，立即执行停止操作
          console.log('定时器已超时，立即停止均衡')
          balanceTimer.activeBMU = timerData.bmuIndex
          balanceTimer.activeCells = timerData.cells
          stopBalance()
          localStorage.removeItem('balanceTimerData')
        }
      }
    } catch (error) {
      console.error('恢复定时器失败:', error)
      localStorage.removeItem('balanceTimerData')
    }
  }
  const isStopped = ref(false)
  const stopBalance = async () => {
    // 从localStorage获取存储的定时器数据（如果有），确保我们使用正确的IP
    let currentIP = ipStore.selectedIp
    let bmuIndex = balanceTimer.activeBMU

    try {
      // 尝试从localStorage中获取更准确的信息
      const savedTimer = localStorage.getItem('balanceTimerData')
      if (savedTimer) {
        const timerData = JSON.parse(savedTimer)
        if (timerData.selectedIp) {
          currentIP = timerData.selectedIp
        }
        if (timerData.bmuIndex) {
          bmuIndex = timerData.bmuIndex
        }
      }

      // 如果仍然没有有效的IP或BMU索引，无法继续
      if (!currentIP || !bmuIndex) {
        throw new Error('缺少设备IP或BMU索引信息，无法关闭均衡')
      }

      // 新的地址计算方式：
      // 均衡控制指令：前96个寄存器，每个BMU占用3个连续寄存器
      const controlBaseAddress = 0xc080 + (bmuIndex - 1) * 3

      // 均衡标志：后256个寄存器，按bit连续排列
      const cellsPerBMU = ipStore.bmuConfig[currentIP]?.cellsPerBMU || 0
      const flagBaseAddress = 0xc080 + 96 + Math.floor(((bmuIndex - 1) * cellsPerBMU) / 16)

      // 第一批：清零均衡标志寄存器
      const regsPerBMU = Math.ceil(cellsPerBMU / 16)
      const flagPayload = []

      for (let i = 0; i < regsPerBMU; i++) {
        flagPayload.push({
          address: flagBaseAddress + i,
          value: 0, // 清零均衡标志
          ip: currentIP
        })
      }

      console.log(
        `[自动关闭均衡-清零标志] 发送到 ${currentIP}，BMU${bmuIndex}，地址: 0x${flagBaseAddress.toString(16).toUpperCase()}-0x${(flagBaseAddress + regsPerBMU - 1).toString(16).toUpperCase()}`
      )

      const flagResult = await window.electron.ipcRenderer.invoke(
        'write-modbus-registers',
        flagPayload
      )

      if (!flagResult.success) {
        throw new Error(`均衡标志清零失败: ${flagResult.error || '未知错误'}`)
      }

      // 第二批：清零均衡控制指令寄存器
      const controlPayload = [
        {
          address: controlBaseAddress,
          value: 0, // 均衡使能清零
          ip: currentIP
        },
        {
          address: controlBaseAddress + 1,
          value: 0, // 均衡时间清零
          ip: currentIP
        },
        {
          address: controlBaseAddress + 2,
          value: 0, // 均衡模式清零
          ip: currentIP
        }
      ]

      console.log(
        `[自动关闭均衡-清零控制] 发送到 ${currentIP}，BMU${bmuIndex}，地址: 0x${controlBaseAddress.toString(16).toUpperCase()}-0x${(controlBaseAddress + 2).toString(16).toUpperCase()}`
      )

      const controlResult = await window.electron.ipcRenderer.invoke(
        'write-modbus-registers',
        controlPayload
      )

      if (!controlResult.success) {
        throw new Error(`均衡控制指令清零失败: ${controlResult.error || '未知错误'}`)
      }

      // 两批都成功
      balanceStatusMessage.value = '均衡自动关闭成功' // 设置成功消息
      isStopped.value = true

      // 清除localStorage中的定时器数据
      localStorage.removeItem('balanceTimerData')
    } catch (err) {
      balanceStatusMessage.value = `自动关闭失败：${err.message}` // 设置失败消息
      console.error('均衡自动关闭失败：', err)

      // 尽管失败，也需要清除localStorage数据
      localStorage.removeItem('balanceTimerData')
    }
  }
  // 立即调用初始化函数来恢复可能存在的定时器
  initBalanceTimer()

  return {
    isTSetAll,
    isVSetAll,
    temperatureBMU,
    temperatureCell,
    temperatureValue,
    voltageBMU,
    voltageCell,
    voltageValue,
    selectedBMU,
    selectedBMUF,
    tempShieldMode,
    tempShieldBMU,
    tempShieldCell,
    tempShieldValue,
    voltShieldMode,
    voltShieldBMU,
    voltShieldCell,
    voltShieldValue,
    tempRangeStart,
    tempRangeEnd,
    voltRangeStart,
    voltRangeEnd,
    balance,
    selectionMode,
    balanceBMUOptions,
    balanceBMU,
    setBalanceStatus,
    setAllBalance,
    setBalanceByMode,
    balanceTimer,
    startBalanceTimer,
    stopBalance,
    isStopped,
    clearBalanceTimer,
    balanceStatusMessage,
    initBalanceTimer
  }
})
