<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import { useBlockStore } from '@/stores/device/blockStore'
// import { ERROR_CODES } from '../../../../../main/table.js' // 已移除硬编码错误代码
import { useI18n } from 'vue-i18n'

const toast = useToast()
const blockStore = useBlockStore()
const { t, te, locale } = useI18n()

// BCU参数
const bcuParams = ref({
  bcuStartAddr: 'D0',
  bcuTotalAddrCount: '1'
})

// BMU参数
const bmuParams = ref({
  bmuStartAddr: 'B0',
  bmuTotalAddrCount: '1'
})

// 簇选择相关 - 动态生成选项
const clusterOptions = computed(() => [
  { label: t('addressAdaptive.options.clusters.allClusters'), value: '0xFF' },
  ...Array.from({ length: 20 }, (_, i) => ({
    label: t('addressAdaptive.options.clusters.cluster', [i + 1]),
    value: `0x${(i + 1).toString(16).padStart(2, '0').toUpperCase()}`
  }))
])

// 当前选中的簇
const selectedCluster = ref('0xFF') // 默认选择全部簇
// 记录上次发送的BMU自适应命令的簇值，用于读取时保持一致
const lastSentCluster = ref(null)

// 结果显示字段配置
const bcuResultFields = computed(() => [
  { key: 'bcuAddr', label: t('addressAdaptive.labels.bcuAddress'), alwaysShow: true },
  { key: 'errorContent', label: t('addressAdaptive.labels.errorContent'), showOnError: true },
  { key: 'errorDetail', label: t('addressAdaptive.labels.errorDetail'), showOnError: true }
])

const bmuResultFields = computed(() => [
  { key: 'bmuAddr', label: t('addressAdaptive.labels.bmuAddress'), showOnError: true },
  { key: 'errorContent', label: t('addressAdaptive.labels.errorContent'), showOnError: true },
  { key: 'errorDetail', label: t('addressAdaptive.labels.errorDetail'), showOnError: true }
])

// 状态管理
const bcuStatus = ref({ isExecuting: false, queryCount: 0, maxQueryCount: 30, queryTimer: null })
const bmuStatus = ref({ isExecuting: false, queryCount: 0, maxQueryCount: 30, queryTimer: null })
const bcuResult = ref(null)
// BMU结果改为数组，支持多个簇的结果显示
const bmuResults = ref([])

// 计算属性
const canExecuteBcu = computed(() => {
  const count = parseInt(bcuParams.value.bcuTotalAddrCount)
  return !bcuStatus.value.isExecuting &&
         bcuParams.value.bcuStartAddr.trim() !== '' &&
         bcuParams.value.bcuTotalAddrCount.trim() !== '' &&
         count >= 1
})

const canExecuteBmu = computed(() => {
  const count = parseInt(bmuParams.value.bmuTotalAddrCount)
  return !bmuStatus.value.isExecuting &&
         bmuParams.value.bmuStartAddr.trim() !== '' &&
         bmuParams.value.bmuTotalAddrCount.trim() !== '' &&
         count >= 1 &&
         selectedCluster.value // 确保选择了簇
})

// 获取当前选中的堆信息
const getCurrentBlockInfo = () => {
  const selectedBlock = blockStore.selectedBlockForView
  if (!selectedBlock) {
    return null
  }

  // 解析堆号：'block1' → 1
  const blockNumber = Number(selectedBlock.replace('block', ''))
  return {
    blockKey: selectedBlock,
    blockNumber: blockNumber
  }
}

// 动态生成topic的函数
const buildTopic = (template) => {
  const blockInfo = getCurrentBlockInfo()
  if (!blockInfo) {
    throw new Error(t('addressAdaptive.messages.selectBlockFirst'))
  }

  // 替换堆号占位符
  return template.replace('{block}', blockInfo.blockNumber)
}

// 状态图标获取
const getStatusIcon = (result) => {
  if (!result) return 'pi pi-times-circle text-gray-400'

  if (result.success) {
    return 'pi pi-check-circle text-green-600'
  } else if (result.status === 0xC1) {
    return 'pi pi-spin pi-spinner text-blue-600'
  } else if (result.status === 0xC3) {
    return 'pi pi-times-circle text-red-600'
  } else {
    return 'pi pi-times-circle text-gray-400'
  }
}

/**
 * 通用参数序列化函数
 */
const serializeAdaptiveParams = (type, params, clusterNumber = null) => {
  const startFlag = 0x5BB5 // 固定启动标志

  if (type === 'bcu') {
    // BCU: 3个u16寄存器
    const bcuStartAddr = parseInt(params.bcuStartAddr || 'D0', 16)
    const totalAddrCount = parseInt(params.bcuTotalAddrCount || 1)

    const buffer = new ArrayBuffer(6)
    const view = new DataView(buffer)
    view.setUint16(0, startFlag, true) // 小端序
    view.setUint16(2, bcuStartAddr, true)
    view.setUint16(4, totalAddrCount, true)

    const bytes = new Uint8Array(buffer)
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

  } else if (type === 'bmu') {
    // BMU: 4个u16寄存器
    const cluster = parseInt(clusterNumber || '0xFF', 16)
    const bmuStartAddr = parseInt(params.bmuStartAddr || 'B0', 16)
    const totalAddrCount = parseInt(params.bmuTotalAddrCount || 1)

    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setUint16(0, cluster, true) // 小端序
    view.setUint16(2, startFlag, true)
    view.setUint16(4, bmuStartAddr, true)
    view.setUint16(6, totalAddrCount, true)

    const bytes = new Uint8Array(buffer)
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  return null
}



/**
 * 处理遥控命令应答（参考Order.vue）
 */
function handleRemoteCommandResponseWithToast(msg) {
  // 参考Order.vue的数据解构方式
  const { dataType, data, blockId, clusterId, topic } = msg

  if (!data) {
    console.warn(`[AddressAdaptive] 遥控命令应答数据为空: ${dataType}`)
    return
  }

  // 检查是否是来自BAU的应答（topic包含bms/bau/d2s）
  if (!topic || !topic.includes('bms/bau/d2s')) {
    return
  }

  // 统一处理dataType，转换为小写
  const commandType = dataType ? dataType.toLowerCase() : 'unknown'

  // 获取设备显示名称
  const deviceName = t('toast.remoteControl.deviceName.block', { blockId })

  // 获取命令显示名称
  const commandNameMap = {
    'bcu_adaptive_addr': t('toast.bauAddressDetection.bcuAdaptive'),
    'bmu_adaptive_addr': t('toast.bauAddressDetection.bmuAdaptive')
  }

  const commandName = commandNameMap[commandType] || commandType

  // 检查是否是错误应答
  if (data.error) {
    toast.add({
      severity: 'error',
      summary: t('toast.bauAddressDetection.remoteCommandFailed'),
      detail: `${deviceName}: ${commandName} ${t('toast.bauAddressDetection.executionFailed')} - ${data.message || t('toast.bauAddressDetection.unknownError')}`,
      life: 6000
    })
    return
  }

  // 检查应答码
  if (data.code !== undefined) {
    const isSuccess = data.code === 0xE0

    const statusText = t(`toast.errorCodes.0x${data.code.toString(16).toUpperCase()}`) || t('toast.bauAddressDetection.unknownStatus')
    const errorCodeHex = `0x${data.code.toString(16).toUpperCase()}`

    if (isSuccess) {
      toast.add({
        severity: 'success',
      summary: t('toast.bauAddressDetection.remoteCommandSuccess'),
      detail: `${deviceName}: ${commandName} ${t('toast.bauAddressDetection.successfullySet')} (${t('toast.bauAddressDetection.responseCode')}: ${errorCodeHex})`,
        life: 4000
      })

      // 根据命令类型开始相应的查询
      if (commandType === 'bcu_adaptive_addr') {
        bcuStatus.value.isExecuting = false
        bcuStatus.value.queryCount = 0
        startBcuPeriodicQuery()
      } else if (commandType === 'bmu_adaptive_addr') {
        bmuStatus.value.isExecuting = false
        bmuStatus.value.queryCount = 0
        startBmuPeriodicQuery()
      }

    } else {
      toast.add({
        severity: 'error',
      summary: t('toast.bauAddressDetection.remoteCommandFailed'),
      detail: `${deviceName}: ${commandName} ${statusText} (${t('toast.bauAddressDetection.responseCode')}: ${errorCodeHex})`,
        life: 6000
      })

      // 失败时停止执行状态
      if (commandType === 'bcu_adaptive_addr') {
        bcuStatus.value.isExecuting = false
      } else if (commandType === 'bmu_adaptive_addr') {
        bmuStatus.value.isExecuting = false
      }
    }
  } else {
    console.log(`[AddressAdaptive] 遥控命令应答:`, { commandType, data, blockId, clusterId })
  }
}

/**
 * 获取状态文本的翻译
 */
const getStatusText = (status) => {
  // 确保翻译函数可用
  if (typeof t !== 'function') {
    console.warn('[AddressAdaptive] Translation function not available')
    return t('toast.bauAddressDetection.translationError', 'Translation Error')
  }
  
  switch (status) {
    case 0x00:
      return t('addressAdaptive.statuses.notStarted')
    case 0xC1:
      return t('addressAdaptive.statuses.executing')
    case 0xC2:
      return t('addressAdaptive.statuses.success')
    case 0xC3:
      return t('addressAdaptive.statuses.failed')
    default:
      return `${t('addressAdaptive.statuses.unknown')}(0x${status.toString(16).toUpperCase()})`
  }
}

/**
 * 动态获取状态文本的翻译（响应语言变化）
 */
const getDynamicStatusText = (result) => {
  if (!result) {
    return t('addressAdaptive.statuses.waiting')
  }
  
  // 确保翻译函数可用
  if (typeof t !== 'function') {
    console.warn('[AddressAdaptive] Translation function not available')
    return t('toast.bauAddressDetection.translationError', 'Translation Error')
  }
  
  // 根据状态码动态获取翻译
  switch (result.status) {
    case 0x00:
      return t('addressAdaptive.statuses.notStarted')
    case 0xC1:
      return t('addressAdaptive.statuses.executing')
    case 0xC2:
      return t('addressAdaptive.statuses.success')
    case 0xC3:
      return t('addressAdaptive.statuses.failed')
    default:
      return `${t('addressAdaptive.statuses.unknown')}(0x${result.status.toString(16).toUpperCase()})`
  }
}

/**
 * 专门解析地址自适应结果
 * 支持BCU（4寄存器）和BMU（5寄存器）两种格式
 */
const parseAdaptive4Registers = (data, type) => {
  if (!data) return null

  const status = data.register1 || data.status || 0x00
  // BMU类型使用新的currentCluster字段，BCU类型不需要解析簇号信息
  // 簇号0是无效的，应该过滤掉
  const currentCluster = type === 'bmu' ? (data.currentCluster && data.currentCluster > 0 ? data.currentCluster : null) : null

  let success = false
  let statusText = ''
  let deviceAddr = '--'
  let errorContent = '--'
  let errorDetail = '--'
  let showDetails = false

  const deviceType = type === 'bcu' ? 'BCU' : 'BMU'

  switch (status) {
    case 0x00:
      statusText = getStatusText(status)
      break
    case 0xC1:
      statusText = getStatusText(status)
      showDetails = true
      // 执行中时，寄存器2-4都是0且无意义
      break
    case 0xC2:
      success = true
      statusText = getStatusText(status)
      showDetails = true
      // 成功时，寄存器2-4都是0且无意义
      // 成功时不显示具体的地址信息，因为寄存器2-4无意义
      break
    case 0xC3:
      success = false
      statusText = getStatusText(status)
      showDetails = true

      // 只有失败时，寄存器2-4才有意义
      // 寄存器2：错误内容码
      if (data.register2 !== undefined) {
        const getErrorContentText = (code) => {
          switch (code) {
            case 0x0000:
              return t('addressAdaptive.errorCodes.notStarted')
            case 0xA11A:
              return t('addressAdaptive.errorCodes.startFailed')
            case 0xC11C:
              return t('addressAdaptive.errorCodes.prepareFailed')
            case 0xC22C:
              return t('addressAdaptive.errorCodes.allocationFailed')
            default:
              return `${t('toast.bauAddressDetection.unknownError')}(0x${code.toString(16).toUpperCase()})`
          }
        }
        errorContent = getErrorContentText(data.register2)
      }

      // 寄存器3：设备地址（BCU地址或BMU地址）
      if (data.register3 !== undefined) {
        deviceAddr = `0x${data.register3.toString(16).toUpperCase()}`
      }

      // 寄存器4：错误详情码
      if (data.register4 !== undefined) {
        const getErrorDetailText = (code) => {
          switch (code) {
            case 0x00:
              return t('addressAdaptive.errorCodes.notStarted')
            case 0xC1:
              return t('addressAdaptive.errorCodes.timeout')
            case 0xC2:
              return t('addressAdaptive.errorCodes.tooManyFrames')
            case 0xC3:
              return t('addressAdaptive.errorCodes.allocationLimit')
            default:
              return `${t('toast.bauAddressDetection.unknownError')}(0x${code.toString(16).toUpperCase()})`
          }
        }
        errorDetail = getErrorDetailText(data.register4)
      }
      break
    default:
      statusText = `${t('addressAdaptive.statuses.unknown')}(0x${status.toString(16).toUpperCase()})`
  }

  const result = {
    success,
    statusText, // 保留原始状态文本，用于调试
    errorContent,
    errorDetail,
    showDetails,
    status,
    currentCluster,
    isComplete: status === 0xC2 || status === 0xC3 // 成功或失败时停止轮询
  }

  // 根据类型设置对应的地址字段
  if (type === 'bcu') {
    result.bcuAddr = deviceAddr
  } else {
    result.bmuAddr = deviceAddr
  }

  return result
}

/**
 * 启动BCU地址自适应
 */
const startBcuAdaptive = async () => {
  try {
    bcuStatus.value.isExecuting = true
    bcuResult.value = null

    // 获取当前选中的堆信息
    const blockInfo = getCurrentBlockInfo()
    if (!blockInfo) {
      throw new Error(t('addressAdaptive.messages.selectBlockFirst'))
    }

    // 序列化参数
    const serializedParams = serializeAdaptiveParams('bcu', bcuParams.value)
    console.log('[AddressAdaptive] BCU序列化参数:', serializedParams)

    // 动态生成topic
    const topic = buildTopic('bms/host/s2d/b{block}/bcu_adaptive_addr')
    await window.electronAPI.mqttPublish(topic, serializedParams)

    // 立即显示下发toast
    toast.add({
      severity: 'info',
      summary: t('toast.bauAddressDetection.bcuAdaptive'),
      detail: t('toast.bauAddressDetection.commandSent', [blockInfo.blockNumber]),
      life: 3000
    })

    console.log(`[AddressAdaptive] BCU地址自适应指令已下发到堆${blockInfo.blockNumber}，等待应答...`)

  } catch (error) {
    console.error('[AddressAdaptive] BCU地址自适应下发失败:', error)
    bcuStatus.value.isExecuting = false
    toast.add({
      severity: 'error',
      summary: t('toast.bauAddressDetection.sendFailed'),
      detail: error.message || t('toast.bauAddressDetection.commandSendFailed'),
      life: 5000
    })
  }
}

/**
 * 启动BMU地址自适应
 */
const startBmuAdaptive = async () => {
  try {
    bmuStatus.value.isExecuting = true
    bmuResults.value = [] // 清空之前的结果

    // 获取当前选中的堆信息
    const blockInfo = getCurrentBlockInfo()
    if (!blockInfo) {
      throw new Error(t('addressAdaptive.messages.selectBlockFirst'))
    }

    // 记录发送的簇值，用于后续读取
    lastSentCluster.value = selectedCluster.value

    // 序列化参数
    const serializedParams = serializeAdaptiveParams('bmu', bmuParams.value, selectedCluster.value)
    console.log('[AddressAdaptive] BMU序列化参数:', serializedParams, '簇:', selectedCluster.value)

    // 动态生成topic
    const topic = buildTopic('bms/host/s2d/b{block}/bmu_adaptive_addr')
    await window.electronAPI.mqttPublish(topic, serializedParams)

    // 获取显示文本
    const selectedOption = clusterOptions.value.find(opt => opt.value === selectedCluster.value)
    const clusterText = selectedOption ? selectedOption.label : selectedCluster.value

    // 立即显示下发toast
    toast.add({
      severity: 'info',
      summary: t('toast.bauAddressDetection.bmuAdaptive'),
      detail: t('toast.bauAddressDetection.commandSent', [blockInfo.blockNumber]),
      life: 3000
    })

    console.log(`[AddressAdaptive] 堆${blockInfo.blockNumber}的${clusterText}BMU地址自适应指令已下发，等待应答...`)

  } catch (error) {
    console.error('[AddressAdaptive] BMU地址自适应下发失败:', error)
    bmuStatus.value.isExecuting = false
    toast.add({
      severity: 'error',
      summary: t('toast.bauAddressDetection.sendFailed'),
      detail: error.message || t('toast.bauAddressDetection.commandSendFailed'),
      life: 5000
    })
  }
}

// 遥控命令应答处理函数（参考Order.vue）
function onRemoteCommandResponse(_e, msg) {
  handleRemoteCommandResponseWithToast(msg)
}

/**
 * 查询BCU执行结果
 */
const queryBcuResult = async () => {
  try {
    const topic = buildTopic('bms/host/s2d/b{block}/get_bcu_adaptive_addr_result')
    await window.electronAPI.mqttPublish(topic, 'FF')
  } catch (error) {
    console.error('[AddressAdaptive] BCU查询失败:', error)
  }
}

/**
 * 查询BMU执行结果 - 根据上次发送的命令决定查询参数
 */
const queryBmuResult = async () => {
  try {
    // 使用上次发送的簇值进行查询，确保读取命令与发送命令一致
    const queryCluster = lastSentCluster.value || selectedCluster.value
    const clusterHex = queryCluster.replace('0x', '')
    const topic = buildTopic('bms/host/s2d/b{block}/get_bmu_adaptive_addr_result')
    await window.electronAPI.mqttPublish(topic, clusterHex)
    console.log('[AddressAdaptive] BMU查询参数:', clusterHex)
  } catch (error) {
    console.error('[AddressAdaptive] BMU查询失败:', error)
  }
}

/**
 * 开始BCU周期性查询（每秒一次，共30次）
 */
const startBcuPeriodicQuery = () => {
  // 清理可能存在的旧定时器
  if (bcuStatus.value.queryTimer) {
    clearInterval(bcuStatus.value.queryTimer)
  }

  // 立即执行第一次查询
  queryBcuResult()
  bcuStatus.value.queryCount = 1

  // 设置定时器，每秒查询一次
  bcuStatus.value.queryTimer = setInterval(() => {
    if (bcuStatus.value.queryCount >= bcuStatus.value.maxQueryCount) {
      // 达到最大查询次数，停止查询
      clearInterval(bcuStatus.value.queryTimer)
      bcuStatus.value.queryTimer = null
      console.log('[AddressAdaptive] BCU查询已完成，共查询30次')
      return
    }

    queryBcuResult()
    bcuStatus.value.queryCount++
  }, 1000) // 每秒查询一次
}

/**
 * 开始BMU周期性查询（每秒一次，共30次）
 */
const startBmuPeriodicQuery = () => {
  // 清理可能存在的旧定时器
  if (bmuStatus.value.queryTimer) {
    clearInterval(bmuStatus.value.queryTimer)
  }

  // 立即执行第一次查询
  queryBmuResult()
  bmuStatus.value.queryCount = 1

  // 设置定时器，每秒查询一次
  bmuStatus.value.queryTimer = setInterval(() => {
    if (bmuStatus.value.queryCount >= bmuStatus.value.maxQueryCount) {
      // 达到最大查询次数，停止查询
      clearInterval(bmuStatus.value.queryTimer)
      bmuStatus.value.queryTimer = null
      console.log('[AddressAdaptive] BMU查询已完成，共查询30次')
      return
    }

    queryBmuResult()
    bmuStatus.value.queryCount++
  }, 1000) // 每秒查询一次
}

/**
 * 处理BCU查询结果 - 参考Order.vue的处理方式
 */
const handleBcuQueryResult = (_e, msg) => {
  // 参考Order.vue，解构事件消息
  const { data } = msg

  if (!data) {
    console.warn('[AddressAdaptive] BCU查询应答数据为空')
    return
  }

  // 检查主进程解析是否成功
  if (data.success === false) {
    console.warn('[AddressAdaptive] BCU查询主进程解析失败:', data.message)
    // 主进程解析失败，但仍然尝试解析4寄存器（如果有原始数据）
    if (data.register1 !== undefined) {
      const adaptiveResult = parseAdaptive4Registers(data, 'bcu')
      if (adaptiveResult) {
        bcuResult.value = adaptiveResult
      }
    }
    return
  }

  // 主进程解析成功，直接使用4寄存器解析
  const adaptiveResult = parseAdaptive4Registers(data, 'bcu')
  if (adaptiveResult) {
    bcuResult.value = adaptiveResult

    // 检查是否完成，如果完成则停止查询并重置按钮状态
    if (adaptiveResult.isComplete) {
      if (bcuStatus.value.queryTimer) {
        clearInterval(bcuStatus.value.queryTimer)
        bcuStatus.value.queryTimer = null
      }
      console.log('[AddressAdaptive] BCU查询完成，停止周期性查询')
    }
  }
}

/**
 * 处理BMU查询结果 - 支持多个簇结果显示
 */
const handleBmuQueryResult = (_e, msg) => {
  // 解构事件消息
  const { data } = msg

  if (!data) {
    console.warn('[AddressAdaptive] BMU查询应答数据为空')
    return
  }

  // 检查主进程解析是否成功
  if (data.success === false) {
    console.warn('[AddressAdaptive] BMU查询主进程解析失败:', data.message)
    // 主进程解析失败，但仍然尝试解析4寄存器
    if (data.register1 !== undefined) {
      const adaptiveResult = parseAdaptive4Registers(data, 'bmu')
      if (adaptiveResult) {
        console.log('[AddressAdaptive] 主进程解析失败，使用原始数据解析结果:', adaptiveResult)
        updateBmuResults(adaptiveResult)
      }
    }
    return
  }

  // 检查是否有多簇结果
  if (data.allResults && Array.isArray(data.allResults)) {
    console.log('[AddressAdaptive] 处理多簇BMU结果:', data.allResults.length, '个簇')

    // 处理每个簇的结果
    data.allResults.forEach(clusterResult => {
      const adaptiveData = {
        currentCluster: clusterResult.currentCluster,
        register1: clusterResult.status,
        register2: clusterResult.content1,
        register3: clusterResult.content2,
        register4: clusterResult.content3
      }

      const adaptiveResult = parseAdaptive4Registers(adaptiveData, 'bmu')
      if (adaptiveResult) {
        updateBmuResults(adaptiveResult)

        // 检查是否完成，如果完成则停止查询并重置按钮状态
        if (adaptiveResult.isComplete) {
          if (bmuStatus.value.queryTimer) {
            clearInterval(bmuStatus.value.queryTimer)
            bmuStatus.value.queryTimer = null
          }
          console.log('[AddressAdaptive] BMU查询完成，停止周期性查询')
        }
      }
    })
  } else {
    // 单簇结果处理
    const adaptiveResult = parseAdaptive4Registers(data, 'bmu')
    if (adaptiveResult) {
      updateBmuResults(adaptiveResult)

      // 检查是否完成，如果完成则停止查询并重置按钮状态
      if (adaptiveResult.isComplete) {
        if (bmuStatus.value.queryTimer) {
          clearInterval(bmuStatus.value.queryTimer)
          bmuStatus.value.queryTimer = null
        }
        console.log('[AddressAdaptive] BMU查询完成，停止周期性查询')
      }
    }
  }
}

/**
 * 更新BMU结果 - 支持多簇结果管理
 */
const updateBmuResults = (newResult) => {
  if (!newResult) {
    return
  }
  
  // 如果没有有效的簇信息或簇号为0，不添加到结果中
  if (newResult.currentCluster === undefined || newResult.currentCluster === null || newResult.currentCluster === 0) {
    // console.warn('[AddressAdaptive] BMU结果缺少有效簇信息，跳过添加:', newResult)
    return
  }

  // 查找是否已存在该簇的结果
  const existingIndex = bmuResults.value.findIndex(
    result => result.currentCluster === newResult.currentCluster
  )

  if (existingIndex >= 0) {
    // 更新现有簇的结果
    bmuResults.value[existingIndex] = newResult
  } else {
    // 添加新簇的结果
    bmuResults.value.push(newResult)
  }

  // 按簇号排序
  bmuResults.value.sort((a, b) => (a.currentCluster || 0) - (b.currentCluster || 0))
}

onMounted(() => {
  const ipc = window.electron?.ipcRenderer
  if (ipc) {
    // 预清理，避免重复绑定
    ipc.removeAllListeners?.('BCU_ADAPTIVE_ADDR')
    ipc.removeAllListeners?.('BMU_ADAPTIVE_ADDR')
    ipc.removeAllListeners?.('GET_BCU_ADAPTIVE_ADDR_RESULT')
    ipc.removeAllListeners?.('GET_BMU_ADAPTIVE_ADDR_RESULT')

    // 注册MQTT事件监听器
    // 下发应答监听
    ipc.on('BCU_ADAPTIVE_ADDR', onRemoteCommandResponse)
    ipc.on('BMU_ADAPTIVE_ADDR', onRemoteCommandResponse)

    // 查询结果监听
    ipc.on('GET_BCU_ADAPTIVE_ADDR_RESULT', handleBcuQueryResult)
    ipc.on('GET_BMU_ADAPTIVE_ADDR_RESULT', handleBmuQueryResult)

    console.log('[AddressAdaptive] 地址自适应页面已挂载，监听器已注册')
  } else {
    console.error('[AddressAdaptive] window.electron.ipcRenderer不可用')
  }
})

onUnmounted(() => {
  // 清理定时器
  if (bcuStatus.value.queryTimer) {
    clearInterval(bcuStatus.value.queryTimer)
    bcuStatus.value.queryTimer = null
  }
  if (bmuStatus.value.queryTimer) {
    clearInterval(bmuStatus.value.queryTimer)
    bmuStatus.value.queryTimer = null
  }

  // 移除事件监听器
  const ipc = window.electron?.ipcRenderer
  if (ipc) {
    ipc.removeAllListeners?.('BCU_ADAPTIVE_ADDR')
    ipc.removeAllListeners?.('BMU_ADAPTIVE_ADDR')
    ipc.removeAllListeners?.('GET_BCU_ADAPTIVE_ADDR_RESULT')
    ipc.removeAllListeners?.('GET_BMU_ADAPTIVE_ADDR_RESULT')
  }

  console.log('[AddressAdaptive] 地址自适应页面已卸载，定时器和监听器已清理')
})
</script>

<template>
  <div class="card">
    <!-- 功能区域 -->
      <div class="content-grid">
        <!-- BCU地址自适应 -->
        <div class="adaptive-card">
          <h2 class="adaptive-title">
            <i class="pi pi-cog"></i>
            <span>{{ t('addressAdaptive.sections.bcuTitle') }}</span>
          </h2>
          <div class="adaptive-content">
            <div class="config-section">
              <div class="form-row">
                <label>{{ t('addressAdaptive.labels.startAddress') }}：</label>
                <InputText
                  v-model="bcuParams.bcuStartAddr"
                  :placeholder="t('addressAdaptive.placeholders.startAddress')"
                />
              </div>
              <div class="form-row">
                <label>{{ t('addressAdaptive.labels.deviceCount') }}：</label>
                <InputText
                  v-model="bcuParams.bcuTotalAddrCount"
                  :placeholder="t('addressAdaptive.placeholders.deviceCount')"
                />
              </div>
              <div class="button-row">
                <Button
                  :label="t('addressAdaptive.labels.startBcuAdaptive')"
                  @click="startBcuAdaptive"
                  :disabled="!canExecuteBcu"
                  :loading="bcuStatus.isExecuting"
                  icon="pi pi-play"
                  class="config-button"
                />
              </div>
            </div>

            <!-- 结果区域 -->
            <div class="result-section">
              <div class="result-header">
                <i class="pi pi-info-circle"></i>
                <span class="result-title">{{ t('addressAdaptive.labels.executionResult') }}</span>
              </div>
              <div class="result-content">
                <div class="status-row">
                  <i :class="getStatusIcon(bcuResult)"></i>
                  <span class="status-text">{{ getDynamicStatusText(bcuResult) }}</span>
                </div>
                <div class="result-details">
                  <div
                    v-for="field in bcuResultFields"
                    :key="field.key"
                    v-show="field.alwaysShow || (field.showOnError && !bcuResult?.success)"
                    class="detail-item"
                  >
                    <span class="detail-label">{{ field.label }}:</span>
                    <span class="detail-value">{{ bcuResult?.[field.key] || '--' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BMU地址自适应 -->
        <div class="adaptive-card">
          <h2 class="adaptive-title">
            <i class="pi pi-sitemap"></i>
            <span>{{ t('addressAdaptive.sections.bmuTitle') }}</span>
          </h2>
          <div class="adaptive-content">
            <div class="config-section">
              <div class="form-row">
                <label>{{ t('addressAdaptive.labels.selectCluster') }}：</label>
                <Dropdown
                  v-model="selectedCluster"
                  :options="clusterOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="t('addressAdaptive.placeholders.selectCluster')"
                  class="cluster-dropdown"
                />
              </div>
              <div class="form-row">
                <label>{{ t('addressAdaptive.labels.startAddress') }}：</label>
                <InputText
                  v-model="bmuParams.bmuStartAddr"
                  :placeholder="t('addressAdaptive.placeholders.bmuStartAddress')"
                />
              </div>
              <div class="form-row">
                <label>{{ t('addressAdaptive.labels.deviceCount') }}：</label>
                <InputText
                  v-model="bmuParams.bmuTotalAddrCount"
                  :placeholder="t('addressAdaptive.placeholders.deviceCount')"
                />
              </div>
              <div class="button-row">
                <Button
                  :label="t('addressAdaptive.labels.startBmuAdaptive')"
                  @click="startBmuAdaptive"
                  :disabled="!canExecuteBmu"
                  :loading="bmuStatus.isExecuting"
                  icon="pi pi-play"
                  class="config-button"
                />
              </div>
            </div>

            <!-- 结果区域 - 支持多个簇结果显示 -->
            <div class="result-section">
              <div class="result-header">
                <i class="pi pi-info-circle"></i>
                <span class="result-title">{{ t('addressAdaptive.labels.executionResult') }}</span>
              </div>
              <div class="result-content">
                <!-- 无结果时的占位显示 -->
                <div v-if="bmuResults.length === 0" class="no-results">
                  <div class="status-row">
                    <i class="pi pi-times-circle text-gray-400"></i>
                    <span class="status-text">{{ t('addressAdaptive.statuses.waiting') }}</span>
                  </div>
                  <div class="result-details">
                    <div
                      v-for="field in bmuResultFields"
                      :key="field.key"
                      class="detail-item"
                    >
                      <span class="detail-label">{{ field.label }}:</span>
                      <span class="detail-value">--</span>
                    </div>
                  </div>
                </div>

                <!-- 多个簇结果显示 -->
                <div v-else class="multiple-results">
                  <div
                    v-for="result in bmuResults"
                    :key="result.currentCluster || t('toast.bauAddressDetection.unknown', 'unknown')"
                    class="cluster-result"
                  >
                    <div class="cluster-result-header">
                      <span class="cluster-number">{{ t('addressAdaptive.options.clusters.cluster', [result.currentCluster !== undefined ? result.currentCluster : '?']) }}</span>
                      <div class="status-row">
                        <i :class="getStatusIcon(result)"></i>
                        <span class="status-text">{{ getDynamicStatusText(result) }}</span>
                      </div>
                    </div>
                    <div v-if="result.showDetails" class="result-details">
                      <div
                        v-for="field in bmuResultFields"
                        :key="field.key"
                        v-show="field.alwaysShow || (field.showOnError && !result.success)"
                        class="detail-item"
                      >
                        <span class="detail-label">{{ field.label }}:</span>
                        <span class="detail-value">{{ result[field.key] || '--' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

</template>

<style scoped>
/* 主卡片 */
.card {
  padding: 12px;
  background: var(--surface-ground);
}

/* 内容网格 */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* 地址自适应专用卡片样式 - 避免与其他页面冲突 */
.adaptive-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--surface-border);
  background: var(--surface-card);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.adaptive-card .adaptive-title {
  background: var(--primary-color);
  color: var(--primary-color-text);
  padding: 12px 20px;
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.adaptive-card .adaptive-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 配置区域 */
.config-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.form-row label {
  min-width: 80px;
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.9rem;
}

.form-row .p-inputtext {
  flex: 1;
}

.button-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--surface-border);
}

.config-button {
  flex: 1;
}

/* 结果区域 */
.result-section {
  padding: 1rem;
  background: var(--surface-section);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  margin-top: 1rem;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.status-text {
  font-size: 0.95rem;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.result-title {
  font-size: 0.95rem;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.detail-label {
  min-width: 70px;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.detail-value {
  flex: 1;
  color: var(--text-color);
  word-break: break-all;
}



/* 簇选择下拉框样式 */
.cluster-dropdown {
  flex: 1;
}

/* 多个簇结果显示样式 */
.multiple-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cluster-result {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 0.75rem;
  background: var(--surface-card);
}

.cluster-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.cluster-number {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 0.9rem;
}

.no-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 颜色样式 */
.text-green-600 {
  color: var(--green-500);
}

.text-blue-600 {
  color: var(--blue-500);
}

.text-red-600 {
  color: var(--red-500);
}

.text-gray-400 {
  color: var(--text-color-secondary);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .form-row label {
    min-width: auto;
  }

  .button-row {
    flex-direction: column;
  }

  .detail-item {
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-label {
    min-width: auto;
    font-weight: 600;
  }
}
</style>