// 系统配置参数监听和管理 - 用于统一管理堆簇结构配置
import { ref, onMounted, onUnmounted } from 'vue'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockStore } from '@/stores/device/blockStore'
import { useMqttStore } from '@/stores/communication/mqttStore'

/**
 * 系统配置监听和管理composable
 * 作用：监听堆系统基本配置参数(BLOCK_COMMON_PARAM_R)的变化，
 *      并根据配置参数(BlockCount、ClusterCount1、ClusterCount2)
 *      自动初始化堆簇结构到全局store中
 */
export function useSystemConfig() {
  const clusterStore = useClusterStore()
  const blockStore = useBlockStore()
  const mqttStore = useMqttStore()
  
  // 当前系统配置状态
  const systemConfig = ref(null)
  const isConfigLoaded = ref(false)
  
  /**
   * 处理系统配置更新
   * @param {Object} config - 系统配置参数
   */
  function handleSystemConfigUpdate(config) {
    console.log('🔧 [配置更新] 系统配置:', `${config.BlockCount}堆, 第一堆${config.ClusterCount1}簇, 第二堆${config.ClusterCount2}簇`)
    
    // 验证配置参数的有效性
    const { BlockCount, ClusterCount1, ClusterCount2 } = config
    
    if (typeof BlockCount !== 'number' || BlockCount < 0) {
      console.warn('[useSystemConfig] 无效的BlockCount:', BlockCount)
      return
    }
    
    if (typeof ClusterCount1 !== 'number' || ClusterCount1 < 0) {
      console.warn('[useSystemConfig] 无效的ClusterCount1:', ClusterCount1)
      return
    }
    
    if (typeof ClusterCount2 !== 'number' || ClusterCount2 < 0) {
      console.warn('[useSystemConfig] 无效的ClusterCount2:', ClusterCount2)
      return
    }
    
    // 更新配置状态
    systemConfig.value = { ...config }
    isConfigLoaded.value = true
    
    try {
      // 更新簇store和堆store
      clusterStore.initializeFromSystemConfig(config)
      blockStore.initializeFromSystemConfig(config)
      
    } catch (error) {
      console.error('[useSystemConfig] 更新store时发生错误:', error)
    }
  }
  
  /**
   * 公开的重新读取配置方法（供其他组件调用）
   * 用于在配置参数下发成功后主动触发配置重新读取
   * @param {number} delay - 延迟时间（毫秒），默认1500ms
   */
  function triggerConfigReload(delay = 1500) {
    console.log('🔄 [useSystemConfig] 收到配置更新触发请求，准备重新读取配置...')
    setTimeout(() => {
      console.log('🔄 [useSystemConfig] 开始重新读取系统配置参数...')
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
      console.warn('[useSystemConfig] 配置数据解析失败:', configData)
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
   * 请求读取系统配置参数
   * 发送MQTT消息到堆系统基本配置参数读取主题
   */
  function requestSystemConfig() {
    // 检查MQTT连接状态
    if (!mqttStore.isConnected) {
      console.warn('[useSystemConfig] MQTT未连接，无法请求系统配置参数')
      return false
    }
    
    // 使用固定的b1堆来读取系统配置（与设备管理页面保持一致）
    const mqttTopic = 'bms/host/s2d/b1/block_common_param_r'
    
    // 发送读取请求（消息内容为'ff'）
    if (window.electronAPI?.mqttPublish) {
      window.electronAPI.mqttPublish(mqttTopic, 'ff')
        .catch(error => {
          console.error('[useSystemConfig] 系统配置读取请求发送失败:', error)
        })
      return true
    } else {
      console.warn('[useSystemConfig] electronAPI.mqttPublish 不可用，无法请求系统配置')
      return false
    }
  }
  
  // 生命周期管理
  onMounted(() => {
    // 注册MQTT事件监听器
    const ipc = window.electron?.ipcRenderer
    if (ipc) {
      ipc.on('BLOCK_COMMON_PARAM_R', handleConfigReadEvent)
    } else {
      console.warn('[useSystemConfig] 无法获取 ipcRenderer，监听器注册失败')
    }
  })
  
  onUnmounted(() => {
    // 清理MQTT事件监听器
    const ipc = window.electron?.ipcRenderer
    if (ipc) {
      ipc.removeListener('BLOCK_COMMON_PARAM_R', handleConfigReadEvent)
    }
  })
  
  return {
    // ========== 状态 ==========
    systemConfig,       // 当前系统配置参数
    isConfigLoaded,     // 配置是否已加载
    
    // ========== 方法 ==========
    handleSystemConfigUpdate,  // 手动更新系统配置
    requestSystemConfig,       // 主动请求读取系统配置
    triggerConfigReload,       // 触发配置重新读取（供其他组件调用）
  }
}
