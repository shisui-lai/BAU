// 系统配置管理 Pinia Store - 单实例模式
// 解决 useSystemConfig 多实例导致的状态隔离问题
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockStore } from '@/stores/device/blockStore'
import { useMqttStore } from '@/stores/communication/mqttStore'

/**
 * 系统配置管理 Store
 * 作用：监听堆系统基本配置参数(BLOCK_COMMON_PARAM_R)的变化，
 *      并根据配置参数(BlockCount、ClusterCount1、ClusterCount2)
 *      自动初始化堆簇结构到全局store中
 *
 * 【智能暂停机制】：
 * 解决设备管理页面参数选择被30秒自动读取覆盖的问题
 */
export const useSystemConfigStore = defineStore('systemConfig', () => {
  // ========== 状态管理 ==========
  const systemConfig = ref(null)
  const isConfigLoaded = ref(false)

  // ========== 定时器管理（全局唯一） ==========
  let periodicReadTimer = null
  const PERIODIC_READ_INTERVAL = 30000 // 30秒（固定值）

  // 【智能暂停机制】定时器暂停状态管理
  let isPeriodicReadPaused = false // 标记定时器是否被暂停
  let pauseRequestCount = 0 // 暂停请求计数器，支持多个页面同时请求暂停

  // ========== IPC事件监听管理 ==========
  let ipcListenerRegistered = false // 防止重复注册IPC监听器

  /**
   * 处理系统配置更新
   * @param {Object} config - 系统配置参数
   */
  function handleSystemConfigUpdate(config) {
    // 验证配置参数的有效性
    const { BlockCount, ClusterCount1, ClusterCount2 } = config

    if (typeof BlockCount !== 'number' || BlockCount < 0) {
      console.warn('[SystemConfigStore] 无效的BlockCount:', BlockCount)
      return
    }

    if (typeof ClusterCount1 !== 'number' || ClusterCount1 < 0) {
      console.warn('[SystemConfigStore] 无效的ClusterCount1:', ClusterCount1)
      return
    }

    if (typeof ClusterCount2 !== 'number' || ClusterCount2 < 0) {
      console.warn('[SystemConfigStore] 无效的ClusterCount2:', ClusterCount2)
      return
    }

    // 更新配置状态
    systemConfig.value = { ...config }
    isConfigLoaded.value = true

    try {
      // 更新簇store和堆store
      const clusterStore = useClusterStore()
      const blockStore = useBlockStore()

      clusterStore.initializeFromSystemConfig(config)
      blockStore.initializeFromSystemConfig(config)
    } catch (error) {
      console.error('[SystemConfigStore] 更新store时发生错误:', error)
    }
  }

  /**
   * 请求读取系统配置参数
   * 发送MQTT消息到堆系统基本配置参数读取主题
   */
  function requestSystemConfig() {
    const mqttStore = useMqttStore()

    // 检查MQTT连接状态
    if (!mqttStore.isConnected) {
      console.warn('[SystemConfigStore] MQTT未连接，无法请求系统配置参数')
      return false
    }

    // 使用固定的b1堆来读取系统配置（与设备管理页面保持一致）
    const mqttTopic = 'bms/host/s2d/b1/block_common_param_r'

    // 发送读取请求（消息内容为'ff'）
    if (window.electronAPI?.mqttPublish) {
      window.electronAPI.mqttPublish(mqttTopic, 'ff').catch((error) => {
        console.error('[SystemConfigStore] 系统配置读取请求发送失败:', error)
      })
      return true
    } else {
      console.warn('[SystemConfigStore] electronAPI.mqttPublish 不可用，无法请求系统配置')
      return false
    }
  }

  /**
   * 公开的重新读取配置方法（供其他组件调用）
   * 用于在配置参数下发成功后主动触发配置重新读取
   * @param {number} delay - 延迟时间（毫秒），默认1500ms
   */
  function triggerConfigReload(delay = 1500) {
    setTimeout(() => {
      requestSystemConfig()
    }, delay)
  }

  /**
   * 处理堆系统基本配置参数读取事件
   * @param {Event} event - IPC事件对象
   * @param {Object} mqttMessage - MQTT消息对象
   */
  function handleConfigReadEvent(event, mqttMessage) {
    // 只处理堆系统基本配置参数消息
    if (mqttMessage.dataType !== 'BLOCK_COMMON_PARAM_R') {
      return
    }

    // 解析配置数据
    const configData = mqttMessage.data
    if (!configData || configData.error) {
      console.warn('[SystemConfigStore] 配置数据解析失败:', configData)
      return
    }

    // 提取关键配置参数
    const config = {
      BlockCount: configData.BlockCount || 0,
      ClusterCount1: configData.ClusterCount1 || 0,
      ClusterCount2: configData.ClusterCount2 || 0
    }

    // 更新系统配置
    handleSystemConfigUpdate(config)
  }

  /**
   * 启动周期性读取配置
   * 注意：如果当前处于暂停状态，将不会启动定时器
   */
  function startPeriodicRead() {
    // 【智能暂停机制】如果当前被暂停，则不启动定时器
    if (isPeriodicReadPaused) {
      console.log('[SystemConfigStore] 定时器被暂停，跳过启动')
      return
    }

    // 如果定时器已存在，先清理
    if (periodicReadTimer) {
      clearInterval(periodicReadTimer)
    }

    // 设置周期性读取
    periodicReadTimer = setInterval(() => {
      // 【智能暂停机制】在定时器回调中再次检查暂停状态
      if (isPeriodicReadPaused) {
        console.log('[SystemConfigStore] 定时器执行时检测到暂停状态，跳过本次读取')
        return
      }

      // 检查 MQTT 连接状态
      const mqttStore = useMqttStore()
      if (mqttStore.isConnected) {
        requestSystemConfig()
      }
    }, PERIODIC_READ_INTERVAL)

    console.log('[SystemConfigStore] 周期性读取定时器已启动')
  }

  /**
   * 停止周期性读取配置
   */
  function stopPeriodicRead() {
    if (periodicReadTimer) {
      clearInterval(periodicReadTimer)
      periodicReadTimer = null
    }
    console.log('[SystemConfigStore] 周期性读取定时器已停止')
  }

  /**
   * 【智能暂停机制】暂停周期性读取
   * 用于设备管理页面等需要避免自动读取干扰的场景
   * 支持多个页面同时请求暂停（使用引用计数）
   *
   * 使用场景：
   * - 设备管理页面：避免30秒自动读取覆盖用户的参数选择
   * - 其他需要用户专注编辑的页面
   *
   * @param {string} requestSource - 请求暂停的来源标识，用于调试
   */
  function pausePeriodicRead(requestSource = 'unknown') {
    pauseRequestCount++

    if (!isPeriodicReadPaused) {
      isPeriodicReadPaused = true

      // 立即停止当前定时器，但不重置暂停状态
      if (periodicReadTimer) {
        clearInterval(periodicReadTimer)
        periodicReadTimer = null
      }

      console.log(`[SystemConfigStore] 周期性读取已暂停 - 请求来源: ${requestSource}`)
    } else {
      console.log(`[SystemConfigStore] 周期性读取已处于暂停状态 - 新请求来源: ${requestSource}`)
    }

    console.log(`[SystemConfigStore] 当前暂停请求计数: ${pauseRequestCount}`)
  }

  /**
   * 【智能暂停机制】恢复周期性读取
   * 与 pausePeriodicRead 配对使用，支持引用计数
   * 只有当所有暂停请求都被恢复后，才真正恢复定时器
   *
   * @param {string} requestSource - 请求恢复的来源标识，用于调试
   */
  function resumePeriodicRead(requestSource = 'unknown') {
    if (pauseRequestCount > 0) {
      pauseRequestCount--
    }

    console.log(
      `[SystemConfigStore] 收到恢复请求 - 来源: ${requestSource}, 剩余暂停请求: ${pauseRequestCount}`
    )

    // 只有当所有暂停请求都被恢复后，才真正恢复定时器
    if (pauseRequestCount === 0 && isPeriodicReadPaused) {
      isPeriodicReadPaused = false

      // 重新启动定时器
      startPeriodicRead()

      console.log(`[SystemConfigStore] 周期性读取已恢复 - 恢复来源: ${requestSource}`)
    } else if (pauseRequestCount > 0) {
      console.log(`[SystemConfigStore] 仍有 ${pauseRequestCount} 个暂停请求，保持暂停状态`)
    }
  }

  /**
   * 初始化系统配置管理
   * 注册IPC监听器并启动定时器
   */
  function initialize() {
    // 防止重复注册IPC监听器
    if (ipcListenerRegistered) {
      console.log('[SystemConfigStore] IPC监听器已注册，跳过重复注册')
      return
    }

    // 注册MQTT事件监听器
    const ipc = window.electron?.ipcRenderer
    if (ipc) {
      ipc.on('BLOCK_COMMON_PARAM_R', handleConfigReadEvent)
      ipcListenerRegistered = true
      console.log('[SystemConfigStore] IPC监听器注册成功')
    } else {
      console.warn('[SystemConfigStore] 无法获取 ipcRenderer，监听器注册失败')
    }

    // 启动周期性读取（延迟启动，避免与启动时的读取冲突）
    setTimeout(() => {
      startPeriodicRead()
    }, 5000) // 延迟5秒启动
  }

  /**
   * 清理系统配置管理
   * 移除IPC监听器并停止定时器
   */
  function cleanup() {
    // 清理MQTT事件监听器
    const ipc = window.electron?.ipcRenderer
    if (ipc && ipcListenerRegistered) {
      ipc.removeListener('BLOCK_COMMON_PARAM_R', handleConfigReadEvent)
      ipcListenerRegistered = false
      console.log('[SystemConfigStore] IPC监听器已清理')
    }

    // 停止周期性读取
    stopPeriodicRead()
  }

  return {
    // ========== 状态 ==========
    systemConfig,
    isConfigLoaded,

    // ========== 基础方法 ==========
    handleSystemConfigUpdate,
    requestSystemConfig,
    triggerConfigReload,
    handleConfigReadEvent,

    // ========== 定时器管理 ==========
    startPeriodicRead,
    stopPeriodicRead,

    // ========== 【智能暂停机制】==========
    pausePeriodicRead,
    resumePeriodicRead,

    // ========== 生命周期管理 ==========
    initialize,
    cleanup
  }
})
