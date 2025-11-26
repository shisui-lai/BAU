// stores/ipStore.js
import { defineStore } from 'pinia'
import { ref, onBeforeUnmount } from 'vue'
export const useIpStore = defineStore('ipStore', () => {
  const bmuConfig = ref({})
  // 新增：每个IP最近一小时重启次数
  const recentRestartCount = ref({})
  const setRecentRestartCount = (ip, count) => {
    recentRestartCount.value[ip] = count
  }
  const getRecentRestartCount = (ip) => {
    return recentRestartCount.value[ip] || 0
  }
  // 新增操作方法
  const setBMUConfig = (ip, config) => {
    bmuConfig.value[ip] = {
      bmuTotal: config.bmuTotal || 5,
      cellsPerBMU: config.cellsPerBMU || 48,
      afeConfig: config.afeConfig
    }
  }
  const loadFromLocalStorage = (key, defaultValue) => {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : defaultValue
  }

  const selectedInterface = ref(loadFromLocalStorage('selectedInterface', ''))
  const selectedInterfaceName = ref(loadFromLocalStorage('selectedInterfaceName', ''))
  const networkInterfaces = ref(loadFromLocalStorage('networkInterfaces', ''))
  const responses = ref(loadFromLocalStorage('responses', []))
  const retryCounts = ref({}) // 新增：记录每个ip的重连次数
  const setRetryCount = (ip, count) => {
    retryCounts.value[ip] = count
  }
  const getRetryCount = (ip) => retryCounts.value[ip] || 0
  const modbusClients = ref(
    loadFromLocalStorage('modbusClients', [
      { ModbusServerIP: '192.168.10.208', ModbusServerSum: 25, skills: [] }
    ])
  )
  const selectedIp = ref(loadFromLocalStorage('selectedIp', 'Connect First'))
  const lastManualSelectedIp = ref(null) // 记录最后一次手动选择的IP
  let initialIpList = [] // 默认包含一个初始 IP
  const ipList = ref(loadFromLocalStorage('ipList', initialIpList))
  const isCommunicationActive = ref({})
  const isConnected = ref({})
  const connectedIps = ref(loadFromLocalStorage('connectedIps', []))
  const ipListUpdate = ref([])
  const selectedIpsForWrite = ref([])
  const ipListAdapt = ref([])
  const isGetIpList = ref(loadFromLocalStorage('isGetIpList', true))
  const ipStatus = ref(loadFromLocalStorage('ipStatus', {}))
  // 新增：自动查询IP的标志位（用于禁用手动查询按钮）
  const isAutoQueryingIp = ref(false)
  const moduleReadingStatus = ref({
    BalanceData: false,
    ConfigParamSys: false,
    ConfigAlarm: false,
    ConfigSOX: false,
    VTConfig: false,
    Upgrade: false,
    Adapt: false,
    Control: false,
    VTShieldConfig: false,
    EventTime: false,
    PowerMap: false,
    PCS: false,
    refrigeration: false,
    dehum: false,
    fire: false
  })
  // 按最后一段数字升序
  function sortByLastOctet(arr) {
    return arr.slice().sort((a, b) => {
      const aNum = parseInt(a.split('.').pop(), 10)
      const bNum = parseInt(b.split('.').pop(), 10)
      return aNum - bNum
    })
  }
  // 设置指定模块的读取状态
  const setModuleReadingStatus = (module, status) => {
    if (moduleReadingStatus.value.hasOwnProperty(module)) {
      moduleReadingStatus.value[module] = status
    }
  }
  const getModuleReadingStatus = (module) => {
    return moduleReadingStatus.value[module]
  }
  // 更新查询到的设备列表
  const updateResponses = (devices) => {
    responses.value = devices
  }

  // 更新网卡接口列表
  const updateNetworkInterfaces = (interfaces) => {
    networkInterfaces.value = interfaces
  }

  // 更新 modbusClients 列表
  const updateModbusClients = () => {
    modbusClients.value = ipList.value.map((ip) => ({
      ModbusServerIP: ip,
      ModbusServerSum: 25,
      skills: []
    }))
  }
  // 更新IP列表
  const updateIpList = (newIps, replace = false) => {
    const prev = selectedIp.value
    if (replace) {
      // 清空旧IP的连接状态
      ipList.value.forEach((ip) => {
        setIpConnected(ip, false)
        setIpCommunicationActive(ip, false)
      })
      // 更新为新的IP列表
      ipList.value = sortByLastOctet(newIps)
      // 初始化新IP的状态
    } else {
      newIps.forEach((newIp) => {
        if (!ipList.value.includes(newIp)) {
          ipList.value.push(newIp)
          setIpConnected(newIp, false) // 初始化新IP的连接状态
        }
      })
      ipList.value = sortByLastOctet(ipList.value)
    }
    // 如果上次手动选择的IP存在于新列表中，则恢复选中状态
    if (prev && ipList.value.includes(prev)) {
      selectedIp.value = prev
    } else if (lastManualSelectedIp.value && ipList.value.includes(lastManualSelectedIp.value)) {
      selectedIp.value = lastManualSelectedIp.value
    } else {
      selectedIp.value = ipList.value[0] || ''
    }
  }
  const changeIp = (newIp) => {
    selectedIp.value = newIp
  }
  const addIp = (newIp) => {
    if (!ipList.value.includes(newIp)) {
      ipList.value.push(newIp)
    }
    ipList.value = sortByLastOctet(ipList.value)
  }
  const removeIp = (ipToRemove) => {
    ipList.value = ipList.value.filter((ip) => ip !== ipToRemove)
    if (selectedIp.value === ipToRemove) {
      selectedIp.value = ipList.value[0] || ''
    }
  }
  // 在关闭程序时清空存储的 IP 列表
  const clearIpList = () => {
    ipList.value = [...initialIpList] // 重置为初始值
    /* selectedIp.value = initialIpList[0] // 重置为默认选中的 IP */
    // 清除 localStorage 中的 IP 数据
    localStorage.removeItem('ipList')
  }
  // 新增智能选择方法
  const smartSelectIp = () => {
    // 如果最后一次手动选择的IP仍然在线，则优先恢复
    if (lastManualSelectedIp.value && connectedIps.value.includes(lastManualSelectedIp.value)) {
      selectedIp.value = lastManualSelectedIp.value
      return
    }

    // 否则自动选择第一个可用IP
    if (connectedIps.value.length > 0) {
      selectedIp.value = connectedIps.value[0]
    } else {
      selectedIp.value = 'Connect First'
    }
  }
  const setConnectionStatus = (ip, status) => {
    ipStatus.value[ip] = status
    if (status === 'success') {
      if (ip === lastManualSelectedIp.value) {
        selectedIp.value = ip
      }
      // 如果连接成功，添加该 IP 到 connectedIps 数组
      if (!connectedIps.value.includes(ip)) {
        connectedIps.value.push(ip)
        connectedIps.value = sortByLastOctet(connectedIps.value)
      }
    } else if (status === 'disconnected' || status === 'interrupted') {
      // 如果连接失败或断开，则从 connectedIps 中移除该 IP
      connectedIps.value = connectedIps.value.filter((connectedIp) => connectedIp !== ip)
      connectedIps.value = sortByLastOctet(connectedIps.value)
    }
    // 新增：如果是 “stopAllCommunication”，就直接 return，不再走自动选 IP
    if (status === 'stopAllCommunication' || status === 'startAllCommunication') {
      return
    }
    // 当断开后才触发智能选择（但可在此判断是否当前选中设备断开）
    // 如果断开的设备不是用户手动选中的，那么触发智能选择逻辑
    if (selectedIp.value === ip && ip !== lastManualSelectedIp.value) {
      smartSelectIp()
    }
  }
  // 新增函数：从 localStorage 中恢复上次手动选择的 IP
  const initLastManualSelectedIp = () => {
    const savedIp = localStorage.getItem('lastManualSelectedIp')
    if (savedIp) {
      lastManualSelectedIp.value = savedIp
    }
  }
  const manuallySelectIp = (ip) => {
    if (ipList.value.includes(ip)) {
      selectedIp.value = ip
      lastManualSelectedIp.value = ip // 记录手动选择的IP
      localStorage.setItem('lastManualSelectedIp', JSON.stringify(ip))
    }
  }
  const getConnectionStatus = (ip) => {
    /*   console.log('ipStatus:', ipStatus.value) */
    return ipStatus.value[ip] || '未连接' // 默认返回'unknown'状态
  }
  // 设置单个 IP 的连接状态
  const setIpConnected = (ip, status) => {
    isConnected.value[ip] = status
    // 可选：同步到 localStorage
    localStorage.setItem('isConnected', JSON.stringify(isConnected.value))
  }

  // 获取单个 IP 的连接状态
  const getIpConnected = (ip) => {
    return isConnected.value[ip] ?? false
  }

  // 设置单个 IP 的通讯状态
  const setIpCommunicationActive = (ip, status) => {
    isCommunicationActive.value[ip] = status
    localStorage.setItem('isCommunicationActive', JSON.stringify(isCommunicationActive.value))
  }

  // 获取单个 IP 的通讯状态
  const getIpCommunicationActive = (ip) => {
    return isCommunicationActive.value[ip] ?? false
  }
  const connectAll = () => {
    ipList.value.forEach((ip) => {
      if (ipStatus.value[ip] == 'success') {
        // 发送连接请求到主进程
        /* window.electron.ipcRenderer.send('connect-ip', ip) */
        setIpConnected(ip, true)
      }
    })
  }
  // 单个设备连接操作
  const connectIp = (ip) => {
    /*  console.log(ipStatus.value[ip]) */
    if (ipStatus.value[ip] == 'success') {
      setIpConnected(ip, true)
    }
  }
  const disconnectAll = () => {
    ipList.value.forEach((ip) => {
      if (ipStatus.value[ip] !== 'success') {
        setIpConnected(ip, false)
      }
    })
  }
  // 单个设备断开操作
  const disconnectIp = (ip) => {
    if (ipStatus.value[ip] !== 'success') {
      setIpConnected(ip, false)
    }
  }
  const startCommunicationAll = () => {
    ipList.value.forEach((ip) => {
      setIpCommunicationActive(ip, true)
    })
  }
  // 单个设备启动通讯
  const startCommunicationForIp = (ip) => {
    setIpCommunicationActive(ip, true)
  }

  const stopCommunicationAll = () => {
    ipList.value.forEach((ip) => {
      setIpCommunicationActive(ip, false)
    })
  }
  // 单个设备停止通讯
  const stopCommunicationForIp = (ip) => {
    setIpCommunicationActive(ip, false)
  }
  // 在组件卸载或浏览器关闭时重置 IP 列表
  onBeforeUnmount(() => {
    clearIpList()
  })
  const isImportSuccess = ref(false)
  const setImportSuccess = (status) => {
    isImportSuccess.value = status
  }
  /* initLastManualSelectedIp() */
  return {
    bmuConfig,
    setBMUConfig,
    selectedInterface,
    selectedInterfaceName,
    networkInterfaces,
    responses,
    modbusClients,
    selectedIp,
    ipList,
    selectedIpsForWrite,
    moduleReadingStatus,
    setModuleReadingStatus,
    getModuleReadingStatus,
    ipListUpdate,
    ipListAdapt,
    connectedIps, // 返回已连接的设备 IP 数组
    changeIp,
    addIp,
    removeIp,
    manuallySelectIp,
    ipStatus, // 添加连接状态
    setConnectionStatus,
    getConnectionStatus,
    updateIpList, //新增方法，用于更新ip列表
    updateResponses,
    updateNetworkInterfaces,
    updateModbusClients,
    isGetIpList,
    isCommunicationActive,
    isConnected,
    setIpConnected,
    getIpConnected,
    setIpCommunicationActive,
    getIpCommunicationActive,
    connectAll,
    disconnectAll,
    startCommunicationAll,
    stopCommunicationAll,
    connectIp,
    disconnectIp,
    startCommunicationForIp,
    stopCommunicationForIp,
    smartSelectIp,
    lastManualSelectedIp,
    initLastManualSelectedIp,
    retryCounts,
    setRetryCount,
    getRetryCount,
    recentRestartCount,
    setRecentRestartCount,
    getRecentRestartCount,
    isImportSuccess,
    setImportSuccess,
    isAutoQueryingIp // 自动查询IP标志位
    /*     smartUpdateIps,
    connectNewDevices */
  }
})
