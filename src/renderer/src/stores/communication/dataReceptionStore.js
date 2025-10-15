import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'

/**
 * 数据接收监控Store
 *
 * 功能：
 * 1. 监控MQTT数据接收状态，提供5秒超时检测
 * 2. 智能配置读取：首次接收数据时自动检查并触发系统配置读取
 *
 * 用途：在顶部导航栏显示数据接收状态指示器
 *
 * 状态说明：
 * - 等待数据：刚连接MQTT，还未收到任何数据
 * - 数据正常：正在正常接收数据（5秒内有数据）
 * - 接收超时：超过5秒未收到数据
 * - 连接断开：MQTT连接断开
 *
 * 智能配置读取机制：
 * - 解决时序问题：MQTT连接时设备未插上，配置读取失败
 * - 自动修复：首次接收数据时检查堆/簇配置，如缺失则自动重新读取
 * - 避免循环依赖：使用动态导入机制
 */
export const useDataReceptionStore = defineStore('dataReception', () => {
  // ========== 状态管理 ==========
  const lastDataTime = ref(0) // 初始化为0，表示从未接收过数据
  const isReceivingData = ref(false) // 初始状态为等待数据，只有接收到数据后才变为true
  const timeoutDuration = ref(5000) // 5秒超时，可配置
  const lastMessageType = ref('') // 最后接收的消息类型
  const currentTime = ref(Date.now()) // 用于触发响应式更新的当前时间
  const hasReceivedData = ref(false) // 标记是否曾经接收过数据

  // 【数据速率】状态变量（接收来自子进程的计算结果）
  const dataRate = ref(0) // 当前显示的数据速率 KB/s（由MQTT子进程计算并发送）

  let timeoutId = null
  let updateTimeId = null

  // ========== 计算属性 ==========
  const timeSinceLastData = computed(() => {
    // 如果从未接收过数据，返回0避免异常的时间计算
    if (!hasReceivedData.value || lastDataTime.value === 0) {
      return 0
    }
    return currentTime.value - lastDataTime.value
  })

  const receptionStatus = computed(() => {
    // 如果从未接收过数据，显示等待状态
    if (!hasReceivedData.value) {
      return 'waiting'
    }

    // 如果接收过数据，根据时间间隔判断状态
    if (timeSinceLastData.value < timeoutDuration.value) {
      return 'receiving' // 正常接收数据
    } else {
      return 'timeout' // 超时无数据
    }
  })

  const statusText = computed(() => {
    switch (receptionStatus.value) {
      case 'waiting':
        return '未通讯'
      case 'receiving':
        return '通讯正常'
      case 'timeout':
        return '通讯超时'
      default:
        return '状态未知'
    }
  })

  const statusIcon = computed(() => {
    switch (receptionStatus.value) {
      case 'waiting':
        return 'pi pi-circle' // 等待状态使用空心圆圈
      case 'receiving':
        return 'pi pi-circle-fill'
      case 'timeout':
        return 'pi pi-circle-fill' // 超时时使用相同的圆圈图标
      default:
        return 'pi pi-question-circle'
    }
  })

  const statusClass = computed(() => {
    switch (receptionStatus.value) {
      case 'waiting':
        return 'data-status-waiting'
      case 'receiving':
        return 'data-status-normal'
      case 'timeout':
        return 'data-status-timeout'
      default:
        return 'data-status-unknown'
    }
  })

  // 合并显示的计算属性
  const combinedStatusText = computed(() => {
    const status = statusText.value
    const rateText = `${dataRate.value} KB/s`
    return `${status} | ${rateText}`
  })

  const combinedStatusIcon = computed(() => {
    return 'pi pi-circle-fill' // 始终显示实心圆
  })

  const combinedStatusClass = computed(() => {
    switch (receptionStatus.value) {
      case 'receiving':
        return 'combined-status-normal'
      case 'timeout':
        return 'combined-status-timeout'
      default:
        return 'combined-status-unknown'
    }
  })

  // 【诊断】心跳接收统计
  let heartbeatReceivedCount = 0
  let lastHeartbeatLogTime = 0
  let heartbeatDelayWarningCount = 0

  // ========== 方法 ==========
  function markDataReceived(messageType = 'unknown') {
    const now = Date.now()
    const isFirstData = !hasReceivedData.value
    
    // 【诊断】统计心跳接收
    heartbeatReceivedCount++
    
    // 【诊断】检测心跳延迟
    // 阈值说明：考虑到throttle间隔2000ms，设置为5000ms（2.5倍余量）
    // 只有真正异常的延迟才会触发警告
    const timeSinceLastHeartbeat = lastDataTime.value ? now - lastDataTime.value : 0
    if (timeSinceLastHeartbeat > 5000 && lastDataTime.value > 0) {
      heartbeatDelayWarningCount++
      console.warn(`[DataReception] ⚠️ 心跳延迟 ${timeSinceLastHeartbeat}ms (类型: ${messageType})`)
      
      // 【关键诊断】连续延迟说明主线程被阻塞
      if (heartbeatDelayWarningCount > 3) {
        console.error(`[DataReception] 🚨 连续${heartbeatDelayWarningCount}次心跳延迟，渲染主线程可能被阻塞！`)
      }
    } else {
      heartbeatDelayWarningCount = 0 // 重置连续延迟计数
    }
    
    // 【诊断】每1秒输出统计（临时改为1秒，方便对比速率显示）
    // 用途：验证速率0KB/s时，实际是否真的无消息
    if (now - lastHeartbeatLogTime > 1000 && lastHeartbeatLogTime > 0) {
      const heartbeatsPerSecond = heartbeatReceivedCount / ((now - lastHeartbeatLogTime) / 1000)
      const currentRate = dataRate.value
      // console.log(`[DataReception] 📊 1秒统计: ${heartbeatsPerSecond.toFixed(1)} beats/s | 显示速率: ${currentRate} KB/s`)
      heartbeatReceivedCount = 0
      lastHeartbeatLogTime = now
    } else if (lastHeartbeatLogTime === 0) {
      lastHeartbeatLogTime = now
    }

    lastDataTime.value = now
    currentTime.value = now // 更新当前时间以触发响应式更新
    lastMessageType.value = messageType
    hasReceivedData.value = true // 标记已接收过数据
    isReceivingData.value = true

    if (isFirstData) {
      // 【智能配置读取】首次接收数据时，检查是否需要触发配置读取
      // 解决时序问题：MQTT连接时设备未插上，配置读取失败，现在设备插上后自动补充配置
      checkAndTriggerConfigRead()
    }

    resetTimeout()
  }

  // 【诊断】速率更新统计
  let rateUpdateCount = 0
  let lastRateUpdateTime = 0
  let rateUpdateDelayWarningCount = 0

  /**
   * 【数据速率】更新速率（接收来自MQTT子进程的计算结果）
   * 
   * 新架构说明：
   * - 速率计算已迁移到MQTT子进程（mqtt.js）
   * - 基于原始MQTT payload大小计算，避免序列化开销
   * - 渲染进程只负责接收和显示速率值
   * 
   * @param {number} rate - 速率值（KB/s）
   */
  function updateDataRate(rate) {
    const now = Date.now()
    rateUpdateCount++
    
    // 【诊断】检测速率更新延迟（理论上每1秒更新一次）
    // 阈值说明：速率计算在MQTT子进程，理论每1000ms，设置为3000ms（3倍余量）
    // 避免正常的事件循环波动导致误报
    const timeSinceLastUpdate = lastRateUpdateTime ? now - lastRateUpdateTime : 0
    if (timeSinceLastUpdate > 3000 && lastRateUpdateTime > 0) {
      rateUpdateDelayWarningCount++
      console.warn(`[DataReception] ⚠️ 速率更新延迟 ${timeSinceLastUpdate}ms (速率: ${rate} KB/s)`)
      
      // 【关键诊断】如果速率更新延迟但心跳正常，说明速率消息被阻塞
      if (rateUpdateDelayWarningCount > 3) {
        console.error(`[DataReception] 🚨 连续${rateUpdateDelayWarningCount}次速率更新延迟，可能是IPC或主线程阻塞！`)
        console.error(`  - 当前速率: ${rate} KB/s`)
        console.error(`  - 上次更新: ${timeSinceLastUpdate}ms 前`)
        console.error(`  - 建议检查: 主进程事件循环、渲染进程主线程`)
      }
    } else {
      rateUpdateDelayWarningCount = 0
    }
    
    lastRateUpdateTime = now
    dataRate.value = rate
  }

  /**
   * 【智能配置读取】检查并触发配置读取
   *
   * 功能：检查堆/簇配置是否存在，如不存在则自动触发配置读取
   * 时机：首次接收到设备数据时调用
   * 目的：解决MQTT连接时设备未插上导致的配置缺失问题
   */
  function checkAndTriggerConfigRead() {
    // 延迟检查，确保其他store已经初始化
    setTimeout(() => {
      try {
        // 动态导入store以避免循环依赖
        import('../device/blockStore.js').then(({ useBlockStore }) => {
          const blockStore = useBlockStore()

          // 检查是否已有堆配置
          if (!blockStore.availableBlocks || blockStore.availableBlocks.length === 0) {
            // 触发配置读取
            triggerSystemConfigRead()
          }
        })
      } catch (error) {
        console.warn('[DataReception] 配置检查失败:', error)
      }
    }, 500) // 延迟500ms确保其他组件已初始化
  }

  /**
   * 【智能配置读取】触发系统配置读取
   *
   * 功能：调用系统配置读取函数，发送MQTT配置读取请求
   * 实现：动态导入useSystemConfig避免循环依赖
   */
  function triggerSystemConfigRead() {
    try {
      // 动态导入配置管理composable
      import('../../composables/core/data-processing/parameter-management/useSystemConfig.js').then(({ useSystemConfig }) => {
        const { requestSystemConfig } = useSystemConfig()
        requestSystemConfig() // 发送MQTT配置读取请求：bms/host/s2d/b1/block_common_param_r
      })
    } catch (error) {
      console.error('[DataReception] 触发配置读取失败:', error)
    }
  }

  function resetTimeout() {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      if (isReceivingData.value) {
        isReceivingData.value = false
        console.log(`[DataReception] 数据接收超时 - 最后消息: ${lastMessageType.value}`)
      }
    }, timeoutDuration.value)
  }

  function startMonitoring() {
    console.log('[DataReception] 开始数据接收监控')
    resetTimeout()

    // 启动定时更新currentTime，确保UI能响应式更新
    updateTimeId = setInterval(() => {
      currentTime.value = Date.now()
    }, 1000) // 每秒更新一次

    // 【数据速率】不再需要本地计算定时器，等待子进程发送速率
  }

  function stopMonitoring() {
    console.log('[DataReception] 停止数据接收监控')
    clearTimeout(timeoutId)
    clearInterval(updateTimeId)

    // 重置为初始状态
    isReceivingData.value = false
    hasReceivedData.value = false
    lastDataTime.value = 0
    lastMessageType.value = ''

    // 【数据速率】重置速率状态
    dataRate.value = 0
  }

  function setTimeoutDuration(duration) {
    timeoutDuration.value = duration
    if (timeoutId) {
      resetTimeout() // 重新设置超时
    }
  }

  // ========== 返回接口 ==========
  return {
    // 状态
    lastDataTime: readonly(lastDataTime),
    isReceivingData: readonly(isReceivingData),
    timeoutDuration: readonly(timeoutDuration),
    lastMessageType: readonly(lastMessageType),

    // 【数据速率】速率状态
    dataRate: readonly(dataRate),

    // 计算属性
    timeSinceLastData,
    receptionStatus,
    statusText,
    statusIcon,
    statusClass,

    // 【合并显示】合并状态和速率
    combinedStatusText,
    combinedStatusIcon,
    combinedStatusClass,

    // 方法
    markDataReceived,
    updateDataRate,      // 【数据速率】导出更新函数，供外部调用
    startMonitoring,
    stopMonitoring,
    setTimeoutDuration
  }
})
