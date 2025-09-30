/**
 * MQTT子进程管理器
 * 
 * 【文件用途】
 * 解决上位机系统长时间运行后出现的MQTT子进程异常导致的通讯中断问题。
 * 原问题：子进程异常退出后，系统显示"重连中"但实际无法恢复，需要手动重启应用。
 * 
 * 【主要功能】
 * 1. 子进程生命周期管理：启动、监控、重启、清理
 * 2. 健康检查机制：10秒间隔心跳检测，及时发现异常
 * 3. 智能重启策略：频率限制、次数限制、渐进式重启
 * 4. 错误日志记录：详细记录异常信息，便于问题诊断
 * 5. 状态透明化：提供实时的进程状态和健康信息
 * 
 * 【解决的问题】
 * - 子进程异常退出导致的通讯中断
 * - 长时间运行后的系统卡顿
 * - 需要手动重启应用的问题
 * - 缺乏进程健康监控的问题
 * 
 * 【使用方法】
 * ```javascript
 * import { processManager } from './handlers/processManager.js'
 * 
 * // 初始化
 * processManager.initialize(forkPath1, mainWindow)
 * processManager.startMQTTProcess()
 * 
 * // 设置消息处理器
 * processManager.setMessageHandler((msg) => {
 *   // 处理消息
 * })
 * 
 * // 获取当前子进程（保持兼容性）
 * const mqttTask = processManager.getMQTTTask()
 * ```
 * 
 * 【注意事项】
 * 1. 该管理器会自动处理子进程异常，无需手动干预
 * 2. 最大自动重启次数为5次，超过后需要手动处理
 * 3. 重启间隔最少30秒，避免重启风暴
 * 4. 心跳超时阈值为20秒（2倍检查间隔）
 * 
 * 【维护要点】
 * - 定期检查错误日志，分析异常模式
 * - 根据实际运行情况调整重启策略参数
 * - 监控重启频率，如果频繁重启需要排查根本原因
 * 
 * @author 系统优化
 * @date 2024-12-26
 * @version 1.0.0
 */

const { fork } = require('child_process')

class MQTTProcessManager {
  constructor() {
    // 进程管理
    this.mqttTask = null
    this.forkPath = null
    this.mainWindow = null
    this.messageHandler = null
    
    // 重启策略
    this.restartCount = 0
    this.maxRestarts = 5
    this.lastRestartTime = 0
    this.minRestartInterval = 30000 // 30秒最小重启间隔
    
    // 健康检查
    this.healthCheckInterval = 10000 // 10秒健康检查间隔
    this.heartbeatTimeout = 20000 // 20秒心跳超时
    this.lastHeartbeat = 0
    this.healthCheckTimer = null
    
    // 状态管理
    this.isInitialized = false
    this.isStarting = false
    this.startTime = 0
    
    console.log('[ProcessManager] 进程管理器已创建')
  }

  /**
   * 初始化进程管理器
   * @param {string} forkPath - 子进程文件路径
   * @param {BrowserWindow} mainWindow - 主窗口实例
   */
  initialize(forkPath, mainWindow = null) {
    this.forkPath = forkPath
    this.mainWindow = mainWindow
    this.isInitialized = true
    console.log('[ProcessManager] 进程管理器已初始化')
  }

  /**
   * 启动MQTT子进程
   */
  startMQTTProcess() {
    if (!this.isInitialized) {
      console.error('[ProcessManager] 进程管理器未初始化')
      return false
    }

    if (this.isStarting) {
      console.warn('[ProcessManager] 子进程正在启动中，跳过重复启动')
      return false
    }

    this.isStarting = true
    this.startTime = Date.now()

    try {
      console.log('[ProcessManager] 正在启动MQTT子进程...')
      
      // 清理旧进程
      if (this.mqttTask && !this.mqttTask.killed) {
        this.mqttTask.kill('SIGTERM')
      }

      // 启动新进程
      this.mqttTask = fork(this.forkPath)
      console.log('[ProcessManager] MQTT子进程已启动，PID:', this.mqttTask.pid)

      // 设置进程监控
      this.setupProcessMonitoring()
      
      // 启动健康检查
      this.startHealthCheck()
      
      this.isStarting = false
      return true

    } catch (error) {
      console.error('[ProcessManager] 启动MQTT子进程失败:', error)
      this.logError('startup_failed', error)
      this.isStarting = false
      this.scheduleRestart('startup_failed')
      return false
    }
  }

  /**
   * 设置进程监控
   */
  setupProcessMonitoring() {
    if (!this.mqttTask) return

    // 监听进程错误
    this.mqttTask.on('error', (error) => {
      console.error('[ProcessManager] MQTT子进程错误:', error)
      this.handleProcessError(error)
    })

    // 监听进程退出
    this.mqttTask.on('exit', (code, signal) => {
      console.log('[ProcessManager] MQTT子进程退出，代码:', code, '信号:', signal)
      if (code !== 0 && code !== null) {
        this.handleProcessCrash(code, signal)
      }
    })

    // 监听消息
    this.mqttTask.on('message', (msg) => {
      this.handleMessage(msg)
    })

    console.log('[ProcessManager] 进程监控已设置')
  }

  /**
   * 处理子进程消息
   * @param {Object} msg - 消息对象
   */
  handleMessage(msg) {
    // 处理心跳消息
    if (msg.type === 'heartbeat') {
      this.updateHeartbeat(msg.data)
      return
    }

    // 转发其他消息到外部处理器
    if (this.messageHandler) {
      this.messageHandler(msg)
    }
  }

  /**
   * 更新心跳时间戳
   * @param {Object} data - 心跳数据
   */
  updateHeartbeat(data) {
    this.lastHeartbeat = Date.now()
    console.log('[ProcessManager] 收到心跳，连接质量:', data.connectionQuality)
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    // 清理旧的定时器
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    this.lastHeartbeat = Date.now() // 初始化心跳时间

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.healthCheckInterval)

    console.log('[ProcessManager] 健康检查已启动，间隔:', this.healthCheckInterval, 'ms')
  }

  /**
   * 执行健康检查
   *
   * 功能说明：
   * 1. 检查子进程心跳是否超时（超过20秒未响应）
   * 2. 向子进程发送健康检查请求
   * 3. 如果发送失败或超时，触发进程重启
   *
   * 这是检测子进程异常的核心机制，能够及时发现：
   * - 子进程卡死（不响应心跳）
   * - 子进程崩溃（发送失败）
   * - 通讯异常（消息无法传递）
   */
  performHealthCheck() {
    const now = Date.now()

    // 检查心跳超时 - 如果超过heartbeatTimeout(20秒)未收到心跳，认为子进程异常
    const timeSinceLastHeartbeat = now - this.lastHeartbeat
    if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
      console.warn('[ProcessManager] 子进程心跳超时，最后心跳:', timeSinceLastHeartbeat, 'ms前')
      this.restartProcess('heartbeat_timeout')
      return
    }

    // 发送健康检查请求 - 主动向子进程发送检查命令，要求响应心跳
    if (this.mqttTask && !this.mqttTask.killed) {
      try {
        this.mqttTask.send({ cmd: 'HEALTH_CHECK', timestamp: now })
      } catch (error) {
        console.error('[ProcessManager] 发送健康检查失败:', error)
        this.restartProcess('health_check_failed')
      }
    }
  }

  /**
   * 处理进程错误
   * @param {Error} error - 错误对象
   */
  handleProcessError(error) {
    this.logError('process_error', error)
    this.scheduleRestart('process_error')
  }

  /**
   * 处理进程崩溃
   * @param {number} code - 退出代码
   * @param {string} signal - 退出信号
   */
  handleProcessCrash(code, signal) {
    this.logError('process_crash', { code, signal })
    this.scheduleRestart('process_crash')
  }

  /**
   * 安排重启
   * @param {string} reason - 重启原因
   *
   * 智能重启策略说明：
   * 1. 频率限制：30秒内最多重启1次，避免重启风暴
   * 2. 次数限制：最多自动重启5次，超过后需要人工干预
   * 3. 延迟重启：如果重启过于频繁，会延迟到满足间隔要求
   *
   * 这个策略能够：
   * - 防止系统在短时间内反复重启消耗资源
   * - 避免无限重启循环导致系统不稳定
   * - 在多次重启失败后及时通知用户需要人工处理
   */
  scheduleRestart(reason = 'unknown') {
    const now = Date.now()

    // 检查重启频率限制 - 确保两次重启间隔至少30秒
    if (now - this.lastRestartTime < this.minRestartInterval) {
      const waitTime = this.minRestartInterval - (now - this.lastRestartTime)
      console.warn('[ProcessManager] 重启过于频繁，延迟重启:', waitTime, 'ms')
      setTimeout(() => this.scheduleRestart(reason), waitTime)
      return
    }

    // 检查最大重启次数 - 超过5次后停止自动重启，需要人工干预
    if (this.restartCount >= this.maxRestarts) {
      console.error('[ProcessManager] 达到最大重启次数，停止自动重启')
      this.notifyRestartFailure()
      return
    }

    this.restartProcess(reason)
  }

  /**
   * 重启进程
   * @param {string} reason - 重启原因
   */
  restartProcess(reason) {
    console.log(`[ProcessManager] 重启MQTT子进程，原因: ${reason}`)
    
    // 清理旧进程
    this.cleanup(false)
    
    // 更新重启统计
    this.restartCount++
    this.lastRestartTime = Date.now()
    
    // 延迟重启，给系统恢复时间
    setTimeout(() => {
      this.startMQTTProcess()
    }, 2000)
  }

  /**
   * 记录错误日志
   * @param {string} type - 错误类型
   * @param {Error|Object} error - 错误信息
   */
  logError(type, error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: type,
      error: error.message || error,
      stack: error.stack,
      processInfo: {
        pid: this.mqttTask?.pid,
        restartCount: this.restartCount,
        uptime: this.startTime ? Date.now() - this.startTime : 0
      }
    }
    
    console.error('[ProcessManager] 错误日志:', JSON.stringify(errorLog, null, 2))
    // TODO: 可以在这里添加错误日志持久化到文件
  }

  /**
   * 通知重启失败
   */
  notifyRestartFailure() {
    const failureInfo = {
      restartCount: this.restartCount,
      maxRestarts: this.maxRestarts,
      lastError: '达到最大重启次数'
    }

    // 通知主窗口
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('mqtt-restart-failed', failureInfo)
    }

    console.error('[ProcessManager] MQTT子进程重启失败，需要手动处理')
  }

  /**
   * 设置消息处理器
   * @param {Function} handler - 消息处理函数
   */
  setMessageHandler(handler) {
    this.messageHandler = handler
  }

  /**
   * 获取当前MQTT子进程（保持兼容性）
   * @returns {ChildProcess|null}
   */
  getMQTTTask() {
    return this.mqttTask
  }

  /**
   * 检查进程是否运行中
   * @returns {boolean}
   */
  isRunning() {
    return this.mqttTask && !this.mqttTask.killed
  }

  /**
   * 获取进程状态
   * @returns {Object}
   */
  getStatus() {
    return {
      isRunning: this.isRunning(),
      pid: this.mqttTask?.pid,
      restartCount: this.restartCount,
      maxRestarts: this.maxRestarts,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.startTime ? Date.now() - this.startTime : 0
    }
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  getStats() {
    const now = Date.now()
    return {
      ...this.getStatus(),
      timeSinceLastHeartbeat: now - this.lastHeartbeat,
      timeSinceLastRestart: now - this.lastRestartTime,
      healthCheckInterval: this.healthCheckInterval,
      heartbeatTimeout: this.heartbeatTimeout
    }
  }

  /**
   * 清理资源
   * @param {boolean} stopHealthCheck - 是否停止健康检查
   */
  cleanup(stopHealthCheck = true) {
    console.log('[ProcessManager] 清理进程资源')
    
    // 停止健康检查
    if (stopHealthCheck && this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
    
    // 终止子进程
    if (this.mqttTask && !this.mqttTask.killed) {
      this.mqttTask.kill('SIGTERM')
    }
  }

  /**
   * 完全清理并返回Promise（用于应用退出）
   * @returns {Promise}
   */
  async cleanupAsync() {
    return new Promise((resolve) => {
      if (!this.isRunning()) {
        resolve()
        return
      }

      // 设置超时，确保不会无限等待
      const timeout = setTimeout(() => {
        console.warn('[ProcessManager] 清理超时，强制退出')
        resolve()
      }, 5000)

      // 监听进程退出
      this.mqttTask.once('exit', () => {
        clearTimeout(timeout)
        resolve()
      })

      // 清理资源
      this.cleanup()
    })
  }
}

// 导出单例实例
export const processManager = new MQTTProcessManager()
