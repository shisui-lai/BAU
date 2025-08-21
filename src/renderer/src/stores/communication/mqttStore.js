// MQTT连接状态管理Store
import { defineStore } from 'pinia'

// 生成SYL_开头的8位随机ClientID
function generateClientId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'SYL_'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 重连配置 - 更合理的参数
const RECONNECT_CONFIG = {
  maxAttempts: 3,        // 最大重连次数（降低到3次）
  baseDelay: 2000,       // 基础延迟2秒（增加到2秒）
  maxDelay: 10000,       // 最大延迟10秒（降低到10秒）
  backoffFactor: 2       // 指数退避因子
}

export const useMqttStore = defineStore('mqtt', {
  state: () => ({
    // 连接状态
    status: 'disconnected', // disconnected, connecting, connected, error, reconnecting
    
    // 连接配置
    config: {
      host: '',
      port: 1883,
      username: 'admin1',
      password: 'public',
      clientId: generateClientId(),
      keepalive: 60,
      subscribeTopics: ['bms/bau/d2s/+/+/#']
    },
    
    // 历史连接配置列表
    savedConfigs: JSON.parse(localStorage.getItem('mqtt_saved_configs') || '[]'),
    
    // 错误信息
    error: null,
    
    // 重连相关
    reconnect: {
      isEnabled: true,
      currentAttempt: 0,
      maxAttempts: RECONNECT_CONFIG.maxAttempts,
      nextDelay: RECONNECT_CONFIG.baseDelay,
      timer: null
    },
    
    // 连接统计
    stats: {
      connectedAt: null,
      disconnectedAt: null,
      reconnectCount: 0,
      lastError: null
    }
  }),
  
  getters: {
    isConnected: (state) => state.status === 'connected',
    isConnecting: (state) => state.status === 'connecting',
    isReconnecting: (state) => state.status === 'reconnecting',
    hasError: (state) => state.status === 'error',
    canConnect: (state) => state.config.host && state.config.host.trim() !== '',
    
    // 格式化连接状态文本
    statusText: (state) => {
      switch (state.status) {
        case 'connected': return '已连接'
        case 'connecting': return '连接中...'
        case 'reconnecting': return `重连中... (${state.reconnect.currentAttempt}/${state.reconnect.maxAttempts})`
        case 'disconnected': return '已断开'
        case 'error': return '连接失败'
        default: return '未知状态'
      }
    },
    
    // 获取连接配置用于显示
    connectionInfo: (state) => {
      if (!state.isConnected) return null
      return {
        host: state.config.host,
        port: state.config.port,
        clientId: state.config.clientId,
        connectedAt: state.stats.connectedAt
      }
    }
  },
  
  actions: {
    // 更新连接配置
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig }
      // 如果没有设置ClientID或需要重新生成
      if (!this.config.clientId || newConfig.regenerateClientId) {
        this.config.clientId = generateClientId()
      }
    },
    
    // 保存配置到历史记录
    saveConfig(name = null) {
      const configToSave = {
        name: name || `${this.config.host}:${this.config.port}`,
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        savedAt: new Date().toISOString()
      }
      
      // 检查是否已存在相同配置
      const existingIndex = this.savedConfigs.findIndex(
        config => config.host === configToSave.host && config.port === configToSave.port
      )
      
      if (existingIndex >= 0) {
        // 更新现有配置
        this.savedConfigs[existingIndex] = configToSave
      } else {
        // 添加新配置
        this.savedConfigs.unshift(configToSave)
        // 最多保存10个历史配置
        if (this.savedConfigs.length > 10) {
          this.savedConfigs = this.savedConfigs.slice(0, 10)
        }
      }
      
      // 保存到localStorage
      localStorage.setItem('mqtt_saved_configs', JSON.stringify(this.savedConfigs))
    },
    
    // 加载历史配置
    loadConfig(config) {
      this.updateConfig({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        regenerateClientId: true // 每次连接都生成新的ClientID
      })
    },
    
    // 删除历史配置
    deleteConfig(index) {
      this.savedConfigs.splice(index, 1)
      localStorage.setItem('mqtt_saved_configs', JSON.stringify(this.savedConfigs))
    },
    
    // 发起连接 - 修复版本：添加isReconnect参数
    async connect(isReconnect = false) {
      if (!this.canConnect) {
        this.setError('请填写MQTT服务器地址')
        return false
      }
      
      this.status = 'connecting'
      this.error = null
      
      // 只有首次连接时才重置重连计数，重连时保持计数
      if (!isReconnect) {
        this.reconnect.currentAttempt = 0
      }
      
      try {
        // 创建纯净的配置对象，避免Vue响应式代理导致序列化问题
        const cleanConfig = {
          host: String(this.config.host),
          port: Number(this.config.port),
          username: String(this.config.username),
          password: String(this.config.password),
          clientId: String(this.config.clientId),
          keepalive: Number(this.config.keepalive),
          subscribeTopics: [...this.config.subscribeTopics] // 创建新数组
        }
        
        console.log('[MQTT Store] 发送连接配置:', cleanConfig)
        
        // 通过IPC发送连接请求到主进程
        const success = await window.electron.ipcRenderer.invoke('mqtt-connect', cleanConfig)
        
        if (success) {
          this.setConnected()
          // 只有首次连接成功时才保存配置
          if (!isReconnect) {
            this.saveConfig() // 自动保存成功的连接配置
          }
          return true
        } else {
          this.setError('连接失败')
          return false
        }
      } catch (error) {
        this.setError(error.message)
        return false
      }
    },
    
    // 断开连接
    async disconnect() {
      this.stopReconnect()
      this.status = 'disconnected'
      this.stats.disconnectedAt = new Date().toISOString()
      
      try {
        await window.electron.ipcRenderer.invoke('mqtt-disconnect')
      } catch (error) {
        console.error('断开连接时出错:', error)
      }
    },
    
    // 测试连接
    async testConnection(testConfig = null) {
      const configToTest = testConfig || this.config
      
      try {
        // 创建纯净的测试配置对象
        const cleanTestConfig = {
          host: String(configToTest.host),
          port: Number(configToTest.port),
          username: String(configToTest.username),
          password: String(configToTest.password),
          clientId: generateClientId(), // 测试用临时ID
          keepalive: Number(configToTest.keepalive)
        }
        
        const result = await window.electron.ipcRenderer.invoke('mqtt-test-connection', cleanTestConfig)
        
        return result
      } catch (error) {
        return { success: false, error: error.message }
      }
    },
    
    // 设置连接成功状态
    setConnected() {
      this.status = 'connected'
      this.error = null
      this.stats.connectedAt = new Date().toISOString()
      this.reconnect.currentAttempt = 0
      this.reconnect.nextDelay = RECONNECT_CONFIG.baseDelay
      console.log('[MQTT Store] 连接成功')
    },
    
    // 设置错误状态
    setError(errorMessage) {
      this.status = 'error'
      this.error = errorMessage
      this.stats.lastError = {
        message: errorMessage,
        timestamp: new Date().toISOString()
      }
      console.error('[MQTT Store] 连接错误:', errorMessage)
      
      // 如果启用重连，开始重连
      if (this.reconnect.isEnabled && this.reconnect.currentAttempt < this.reconnect.maxAttempts) {
        this.startReconnect()
      }
    },
    
    // 设置断开连接状态
    setDisconnected() {
      this.status = 'disconnected'
      this.stats.disconnectedAt = new Date().toISOString()
      console.log('[MQTT Store] 连接断开')
      
      // 如果启用重连，开始重连
      if (this.reconnect.isEnabled && this.reconnect.currentAttempt < this.reconnect.maxAttempts) {
        this.startReconnect()
      }
    },
    
    // 开始重连 - 修复版本：调用connect时传入isReconnect=true
    startReconnect() {
      if (this.reconnect.timer) {
        clearTimeout(this.reconnect.timer)
      }
      
      this.reconnect.currentAttempt++
      this.status = 'reconnecting'
      this.stats.reconnectCount++
      
      // 检查是否达到最大重连次数
      if (this.reconnect.currentAttempt > this.reconnect.maxAttempts) {
        this.stopReconnect()
        this.setError(`重连失败，已达到最大重连次数 (${this.reconnect.maxAttempts})，请检查网络连接和服务器配置`)
        return
      }
      
      console.log(`[MQTT Store] 开始第${this.reconnect.currentAttempt}次重连，延迟${this.reconnect.nextDelay}ms`)
      
      this.reconnect.timer = setTimeout(async () => {
        // 检查重连是否被用户取消
        if (!this.reconnect.isEnabled) {
          return
        }
        
        // 关键修复：传入isReconnect=true，避免重置计数器
        const success = await this.connect(true)
        
        if (!success) {
          // 重连失败，增加延迟时间
          this.reconnect.nextDelay = Math.min(
            this.reconnect.nextDelay * RECONNECT_CONFIG.backoffFactor,
            RECONNECT_CONFIG.maxDelay
          )
          
          // 如果达到最大重连次数，停止重连
          if (this.reconnect.currentAttempt >= this.reconnect.maxAttempts) {
            this.stopReconnect()
            this.setError(`重连失败，已达到最大重连次数 (${this.reconnect.maxAttempts})，请检查网络连接和服务器配置`)
          }
        } else {
          // 重连成功，重置重连参数
          this.reconnect.currentAttempt = 0
          this.reconnect.nextDelay = RECONNECT_CONFIG.baseDelay
          this.reconnect.isEnabled = true
        }
      }, this.reconnect.nextDelay)
    },
    
    // 停止重连
    stopReconnect() {
      if (this.reconnect.timer) {
        clearTimeout(this.reconnect.timer)
        this.reconnect.timer = null
      }
      this.reconnect.isEnabled = false
      
      // 如果当前是重连状态，改为断开状态
      if (this.status === 'reconnecting') {
        this.status = 'disconnected'
        console.log('[MQTT Store] 用户取消重连')
      }
    },
    
    // 启用重连
    enableReconnect() {
      this.reconnect.isEnabled = true
      this.reconnect.currentAttempt = 0
      this.reconnect.nextDelay = RECONNECT_CONFIG.baseDelay
    },
    
    // 重置重连状态
    resetReconnect() {
      this.stopReconnect()
      this.reconnect.currentAttempt = 0
      this.reconnect.nextDelay = RECONNECT_CONFIG.baseDelay
      this.reconnect.isEnabled = true
    },
    
    // 生成新的客户端ID
    generateNewClientId() {
      this.config.clientId = generateClientId()
    }
  }
}) 