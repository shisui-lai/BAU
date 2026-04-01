// MQTT连接状态管理Store
import { defineStore } from 'pinia'
import { useUpgradeStore } from '@/stores/upgradeStore'

// 生成SYL_开头的8位随机ClientID
function generateClientId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'SYL_'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const useMqttStore = defineStore('mqtt', {
  state: () => ({
    // 连接状态
    status: 'disconnected', // disconnected, connecting, connected, error, reconnecting, offline

    // 连接配置
    config: {
      host: '',
      port: 1883,
      username: 'admin1',
      password: 'public',
      clientId: generateClientId(),
      keepalive: 30,
      subscribeTopics: ['bms/bau/d2s/+/+/#']
    },

    // 历史连接配置列表
    savedConfigs: JSON.parse(localStorage.getItem('mqtt_saved_configs') || '[]'),

    // 错误信息
    error: null,

    // 重连相关（简化版，主要用于手动断开控制）
    reconnect: {
      timer: null // 仅保留timer用于手动断开时清理
    },

    // 自动重连配置（已禁用 - 由mqtt.js的reconnectPeriod机制处理）
    autoReconnect: {
      enabled: false, // 禁用前端自动重连，避免与mqtt.js冲突
      timer: null, // 重连定时器（保留用于兼容性）
      attempt: 0, // 当前重连尝试次数
      interval: 5000 // 固定重连间隔（5秒）
    },

    // 连接统计
    stats: {
      connectedAt: null,
      disconnectedAt: null,
      reconnectCount: 0,
      lastError: null,
      lastStatusChange: null
    },

    // IPC事件监听器状态
    ipcListenersSetup: false,

    // 断开原因跟踪
    disconnectReason: 'unknown' // 'manual', 'server'
  }),

  getters: {
    isConnected: (state) => state.status === 'connected',
    isConnecting: (state) => state.status === 'connecting',
    isReconnecting: (state) => state.status === 'reconnecting',
    hasError: (state) => state.status === 'error',
    canConnect: (state) => state.config.host && state.config.host.trim() !== '',

    // 格式化连接状态文本 - 返回状态键，由组件使用i18n翻译
    statusText: (state) => {
      switch (state.status) {
        case 'connected':
          return 'mqtt.status.connected'
        case 'connecting':
          return 'mqtt.status.connecting'
        case 'reconnecting':
          return 'mqtt.status.reconnecting'
        case 'disconnected':
          return 'mqtt.status.disconnected'
        case 'offline':
          return 'mqtt.status.disconnected' // 掉线状态也显示为断开
        case 'error':
          return 'mqtt.status.error'
        default:
          return 'mqtt.status.disconnected'
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
        (config) => config.host === configToSave.host && config.port === configToSave.port
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

    // 发起连接 - 简化版本
    async connect() {
      if (!this.canConnect) {
        this.status = 'error'
        this.error = '请填写MQTT服务器地址'
        return false
      }

      this.status = 'connecting'
      this.error = null

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
          this.saveConfig() // 自动保存成功的连接配置
          return true
        } else {
          this.status = 'error'
          this.error = '连接失败'
          return false
        }
      } catch (error) {
        this.status = 'error'
        this.error = error.message
        return false
      }
    },

    // 断开连接
    async disconnect() {
      console.log('[MQTT Store] 手动断开连接')
      this.status = 'disconnected'
      this.disconnectReason = 'manual' // 标记为手动断开
      this.stats.disconnectedAt = new Date().toISOString()

      //  手动断开时停止自动重连
      this.stopAutoReconnect()

      try {
        await window.electron.ipcRenderer.invoke('mqtt-disconnect')
        console.log('[MQTT Store] 手动断开完成')

        // 同步关闭FTP服务器，避免网络切换后FTP仍使用旧会话参数导致升级失败
        // 设计为“手动断开MQTT -> 强制停止FTP”，后续由用户手动重新启动FTP
        try {
          const ftpStopResult = await window.electron.ipcRenderer.invoke('ftp-stop')
          console.log('[MQTT Store] 断开MQTT后自动停止FTP结果:', ftpStopResult)
        } catch (ftpError) {
          // FTP可能本来就未启动，这里只记录日志，不影响MQTT断开流程
          console.warn('[MQTT Store] 自动停止FTP失败（可忽略）:', ftpError?.message || ftpError)
        } finally {
          // 无论ftp-stop返回成功/失败，都主动同步升级页按钮状态，避免界面残留“运行中”
          const upgradeStore = useUpgradeStore()
          upgradeStore.setFtpServerRunning(false)
        }
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

        const result = await window.electron.ipcRenderer.invoke(
          'mqtt-test-connection',
          cleanTestConfig
        )

        return result
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    // 设置连接成功状态
    setConnected() {
      this.status = 'connected'
      this.disconnectReason = 'unknown' // 重置断开原因
      this.error = null
      this.stats.connectedAt = new Date().toISOString()

      //  连接成功时重置自动重连状态
      this.resetAutoReconnect()

      console.log('[MQTT Store] 连接成功')
    },

    // 生成新的客户端ID
    generateNewClientId() {
      this.config.clientId = generateClientId()
    },

    // 设置IPC事件监听器
    setupIpcListeners() {
      if (this.ipcListenersSetup || !window.electron?.ipcRenderer) {
        return
      }

      console.log('[MQTT Store] 设置IPC事件监听器')

      // 监听MQTT连接成功事件
      window.electron.ipcRenderer.on('mqtt-connected', (_, data) => {
        console.log('[MQTT Store] 收到连接成功事件:', data)

        // 更新配置信息，确保clientId和port信息是最新的
        if (data.clientId) {
          this.config.clientId = data.clientId
        }
        if (data.host) {
          this.config.host = data.host
        }
        if (data.port) {
          this.config.port = data.port
        }

        this.setConnected()
        this.stats.lastStatusChange = Date.now()
      })

      // 监听MQTT连接断开事件
      window.electron.ipcRenderer.on('mqtt-disconnected', (_, data) => {
        console.log('[MQTT Store] 服务器断开连接:', data)
        this.status = 'offline'

        //  只有在非手动断开时才设置为'server'，保护手动断开状态
        if (this.disconnectReason !== 'manual') {
          this.disconnectReason = 'server'
        }
        this.stats.disconnectedAt = new Date().toISOString()
        this.stats.lastStatusChange = Date.now()

        // 前端自动重连已禁用 - mqtt.js会自动处理重连（reconnectPeriod: 5000）
        // 避免前后端重连机制冲突导致进程崩溃
        // if (this.autoReconnect.enabled && this.disconnectReason === 'server') {
        //   console.log('[MQTT Store] 检测到服务器断开，启动自动重连')
        //   this.startAutoReconnect()
        // }
      })

      // 监听MQTT离线事件
      window.electron.ipcRenderer.on('mqtt-offline', (_, data) => {
        console.log('[MQTT Store] 服务器离线:', data)
        this.status = 'offline'

        //  只有在非手动断开时才设置为'server'，保护手动断开状态
        if (this.disconnectReason !== 'manual') {
          this.disconnectReason = 'server'
        }

        this.stats.disconnectedAt = new Date().toISOString()
        this.stats.lastStatusChange = Date.now()

        // 前端自动重连已禁用 - mqtt.js会自动处理重连（reconnectPeriod: 5000）
        // 避免前后端重连机制冲突导致进程崩溃
        // if (this.autoReconnect.enabled && this.disconnectReason === 'server') {
        //   console.log('[MQTT Store] 检测到服务器离线，启动自动重连')
        //   this.startAutoReconnect()
        // }
      })

      // 监听MQTT重连事件 - 简化版
      window.electron.ipcRenderer.on('mqtt-reconnecting', (_, data) => {
        console.log('[MQTT Store] 开始重连:', data)
        this.status = 'reconnecting'
        this.stats.lastStatusChange = Date.now()
      })

      // MQTT错误事件 - 重连过程中的错误是正常现象，只记录日志
      window.electron.ipcRenderer.on('mqtt-error', (_, data) => {
        console.log('[MQTT Store] MQTT错误（重连过程中正常）:', data.error)
        // 不改变状态，让mqtt.js自动处理
      })

      this.ipcListenersSetup = true
    },

    //  启动自动重连
    startAutoReconnect() {
      // 清理现有的重连定时器
      this.stopAutoReconnect()

      console.log(
        `[MQTT Store] 将在 ${this.autoReconnect.interval}ms 后尝试第 ${this.autoReconnect.attempt + 1} 次重连`
      )

      this.autoReconnect.timer = setTimeout(async () => {
        this.autoReconnect.attempt++
        console.log(`[MQTT Store] 开始第 ${this.autoReconnect.attempt} 次自动重连尝试`)

        const success = await this.connect()

        if (!success) {
          // 重连失败，继续尝试（无限重连）
          console.log(`[MQTT Store] 第 ${this.autoReconnect.attempt} 次重连失败，将继续尝试`)
          this.startAutoReconnect()
        } else {
          // 重连成功，重置计数器
          console.log(`[MQTT Store] 第 ${this.autoReconnect.attempt} 次重连成功`)
          this.resetAutoReconnect()
        }
      }, this.autoReconnect.interval)
    },

    // 停止自动重连
    stopAutoReconnect() {
      if (this.autoReconnect.timer) {
        clearTimeout(this.autoReconnect.timer)
        this.autoReconnect.timer = null
        console.log('[MQTT Store] 已停止自动重连')
      }
    },

    // 重置自动重连状态
    resetAutoReconnect() {
      this.stopAutoReconnect()
      this.autoReconnect.attempt = 0
      console.log('[MQTT Store] 自动重连状态已重置')
    },

    // 初始化store（在组件挂载时调用）
    initialize() {
      this.setupIpcListeners()
    }
  }
})
