import { ref, computed, watch, onBeforeMount, onBeforeUnmount } from 'vue'
import { useBlockStore } from '@/stores/device/blockStore'
import { useClusterStore } from '@/stores/device/clusterStore'

/**
 * DI/DO状态数据处理 Composable
 * 
 * 功能：
 * 1. 监听MQTT的 di_do_temp_status topic数据
 * 2. 解析并格式化DI/DO状态和RT温度数据
 * 3. 提供分组后的数据供UI展示
 * 
 * 数据来源：bms/bau/d2s/bM/cN/di_do_temp_status
 * 数据格式：按class分组的对象，每个class包含多个信号状态
 */
export function useDiDoStatus(temperatureLabels = ref({}), signalNames = ref({})) {
  const blockStore = useBlockStore()
  const clusterStore = useClusterStore()

  // 原始数据存储
  const rawData = ref({ baseConfig: {}, data: [] })
  
  // 当前选中的堆和簇ID（从store的selectedBlock和selectedCluster计算得出）
  const currentBlockId = computed(() => {
    const selected = blockStore.selectedBlockForView
    if (!selected || typeof selected !== 'string') return 0
    // selectedBlock格式可能是 'block1' 或 '1'
    const match = selected.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  })
  
  const currentClusterId = computed(() => {
    const selected = clusterStore.selectedClusterForView
    if (!selected || typeof selected !== 'string') return 0
    // selectedCluster格式是 'blockId-clusterId'，例如 '1-1'
    const parts = selected.split('-')
    return parts.length === 2 ? parseInt(parts[1]) : 0
  })
  
  // IPC监听器引用
  let listenerId = null

  /**
   * 解析bit位状态
   * 将按class分组的数据转换为前端展示需要的数组格式
   */
  const parseBitSignals = (classData) => {
    if (!classData || classData.length === 0) return []
    
    const result = []
    
    // classData是一个数组，包含该class下的所有字段
    for (const item of classData) {
      // 跳过隐藏字段和非bit类型字段
      if (item.hide || !item.label) continue
      
      // 获取翻译后的信号名称，如果没有翻译则使用原始名称
      const translatedLabel = signalNames.value[item.label] || item.label
      
      result.push({
        label: translatedLabel,
        value: item.value || 0
      })
    }
    
    return result
  }

  /**
   * 解析RT温度数据（对齐modbus）
   * - 将编码映射为温度名称
   * - 始终按固定顺序输出（即使未上报，填占位）
   */
  const parseRTData = (dataArray, temperatureLabels = {}) => {
    const NAME_MAP = {
      1: temperatureLabels.bcuTemp || 'BCU温度',
      2: temperatureLabels.bPlusTemp || 'B+温度',
      3: temperatureLabels.bMinusTemp || 'B-温度',
      4: temperatureLabels.pPlusTemp || 'P+温度',
      5: temperatureLabels.pMinusTemp || 'P-温度',
      6: temperatureLabels.fuse1Temp || '熔断器1温度',
      7: temperatureLabels.fuse2Temp || '熔断器2温度'
    }

    const ORDER = [
      temperatureLabels.bPlusTemp || 'B+温度',
      temperatureLabels.bMinusTemp || 'B-温度', 
      temperatureLabels.pPlusTemp || 'P+温度',
      temperatureLabels.pMinusTemp || 'P-温度',
      temperatureLabels.bcuTemp || 'BCU温度'
    ]

    // 收集设备上报的 nameCode -> temperature
    const codeToTemp = {}
    const rtClasses = ['RT1温度信息', 'RT2温度信息', 'RT3温度信息', 'RT4温度信息', 'RT5温度信息']
    for (let i = 0; i < rtClasses.length; i++) {
      const rtClass = dataArray.find(group => group.class === rtClasses[i])
      if (!rtClass || !rtClass.element) continue
      let nameCode = 0
      let temp = null
      for (const item of rtClass.element) {
        if (item.label && item.label.includes('温度信号名称')) nameCode = item.value || 0
        if (item.label && item.label.includes('温度数据')) temp = item.value
      }
      if (nameCode && temp !== null && temp !== undefined) {
        codeToTemp[nameCode] = temp
      }
    }

    // 产出固定顺序的行；缺失显示为 '-'
    const rows = ORDER.map(name => ({ label: name, value: '-℃' }))
    for (const [codeStr, temp] of Object.entries(codeToTemp)) {
      const code = Number(codeStr)
      const name = NAME_MAP[code]
      if (!name) continue
      const idx = rows.findIndex(r => r.label === name)
      const show = (temp === null || temp === undefined || temp === '') ? '-℃' : `${temp}℃`
      if (idx !== -1) rows[idx].value = show
      else rows.push({ label: name, value: show })
    }

    return rows
  }

  /**
   * 分组的DI/DO状态数据（计算属性）
   * 将原始数据转换为前端展示需要的分组格式
   */
  const groupedDiDoStatus = computed(() => {
    if (!rawData.value.data || rawData.value.data.length === 0) {
      return {}
    }

    const grouped = {}
    const data = rawData.value.data

    // 1. 处理DI信号状态（合并DI信号状态-1到DI信号状态-4），屏蔽预留
    const diClasses = ['DI信号状态-1', 'DI信号状态-2', 'DI信号状态-3', 'DI信号状态-4']
    let diSignals = []
    for (const className of diClasses) {
      const classData = data.find(group => group.class === className)
      if (classData && classData.element) {
        const filtered = classData.element.filter(it => it.label && !String(it.label).includes('预留') && !String(it.label).toLowerCase().includes('reserved'))
        diSignals = diSignals.concat(parseBitSignals(filtered))
      }
    }
    if (diSignals.length > 0) {
      grouped.diSignal = diSignals
    }

    // 2. 处理DO驱动反馈状态（合并DO驱动反馈状态-1到DO驱动反馈状态-4），屏蔽预留
    const doDriveClasses = ['DO驱动反馈状态-1', 'DO驱动反馈状态-2', 'DO驱动反馈状态-3', 'DO驱动反馈状态-4']
    let doDriveSignals = []
    for (const className of doDriveClasses) {
      const classData = data.find(group => group.class === className)
      if (classData && classData.element) {
        const filtered = classData.element.filter(it => it.label && !String(it.label).includes('预留') && !String(it.label).toLowerCase().includes('reserved'))
        doDriveSignals = doDriveSignals.concat(parseBitSignals(filtered))
      }
    }
    if (doDriveSignals.length > 0) {
      grouped.doDriveFeedback = doDriveSignals
    }

    // 3. 处理RT温度数据（固定顺序，缺失显示为占位）
    const rtData = parseRTData(data, temperatureLabels.value)
    if (rtData.length > 0) {
      grouped.rtData = rtData
    }

    return grouped
  })

  /**
   * 注册IPC监听器
   * 监听来自主进程的 DI_DO_TEMP_STATUS 数据
   */
  const registerListener = () => {
    // 移除旧的监听器
    if (listenerId) {
      window.electron.ipcRenderer.removeListener('DI_DO_TEMP_STATUS', listenerId)
    }

    listenerId = (event, msg) => {
      if (!msg) return

      const { blockId, clusterId, dataType, baseConfig, data } = msg

      // 只处理当前选中的堆和簇的数据
      if (blockId === currentBlockId.value && 
          clusterId === currentClusterId.value) {
        
        rawData.value = {
          baseConfig: baseConfig || {},
          data: data || []
        }

        // 缓存数据到localStorage
        const cacheKey = `di_do_status_b${blockId}_c${clusterId}`
        try {
          localStorage.setItem(cacheKey, JSON.stringify(rawData.value))
        } catch (e) {
          console.warn('缓存DI/DO状态数据失败:', e)
        }
      }
    }

    window.electron.ipcRenderer.on('DI_DO_TEMP_STATUS', listenerId)
    console.log('[useDiDoStatus] 已注册IPC监听器: DI_DO_TEMP_STATUS')
  }

  /**
   * 从缓存加载数据
   */
  const loadFromCache = () => {
    const blockId = currentBlockId.value
    const clusterId = currentClusterId.value
    const cacheKey = `di_do_status_b${blockId}_c${clusterId}`
    
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        rawData.value = JSON.parse(cached)
        console.log('[useDiDoStatus] 从缓存加载数据:', cacheKey)
      }
    } catch (e) {
      console.warn('加载DI/DO状态缓存失败:', e)
    }
  }

  /**
   * 监听设备选择变化
   */
  watch(
    () => [currentBlockId.value, currentClusterId.value],
    () => {
      // 设备切换时，重新加载缓存
      loadFromCache()
    },
    { immediate: false }
  )

  /**
   * 组件挂载时初始化
   */
  onBeforeMount(() => {
    loadFromCache()
    registerListener()
  })

  /**
   * 组件卸载时清理
   */
  onBeforeUnmount(() => {
    if (listenerId) {
      window.electron.ipcRenderer.removeListener('DI_DO_TEMP_STATUS', listenerId)
      listenerId = null
      console.log('[useDiDoStatus] 已移除IPC监听器')
    }
  })

  return {
    rawData: computed(() => rawData.value),
    groupedDiDoStatus,
  }
}

