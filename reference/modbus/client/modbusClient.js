;('use strict')
const ModbusRTU = require('modbus-serial')
const { exec } = require('child_process')
//import { performance } from 'perf_hooks'
import {
  MBS_STATE_INIT,
  MBS_STATE_IDLE,
  MBS_STATE_GOOD_CONNECT,
  MBS_STATE_FAIL_CONNECT,
  MBS_STATE_NEXT,
  MBS_STATE_GOOD_READ,
  MBS_STATE_FAIL_READ,
  MBS_STATE_WAIT_RECONNECT,
  mbsId,
  mbsPort,
  mbsTimeout
} from './stateCounts'
import { formatDateTime, parseModbusFrame, writeToLog } from '../dataExport/utils'
import {
  appendToCSV,
  getNextGlobalId,
  writeDebugLog,
  cleanupIpFileSuffix
} from '../dataExport/rowBufferExport'
import { memoryManager } from '../utils/memoryManager.js'
import { startSaveTimer, stopSaveTimer } from '../dataExport/runningDataExport'

// 这些变量需要在运行时从外部获取，所以先定义为null
let selectedInterface = null
let selectedInterfaceName = null
let modbusClients = {}
let isAdmin = false

// 设置这些变量的函数
function setContextVariables(interface_, interfaceName_, clients, admin) {
  selectedInterface = interface_
  selectedInterfaceName = interfaceName_
  modbusClients = clients
  isAdmin = admin
}

const DEFAULT_TCP_TIMEOUT = 5000 // ms

// Helper: connectTCP with explicit timeout
function connectWithTimeout(client, host, opts, timeout) {
  return Promise.race([
    client.connectTCP(host, opts),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TCP connect timeout')), timeout))
  ])
}

// 新增：每个IP一小时内重启次数统计
const restartHistoryMap = {} // { [ip]: [timestamp, ...] }
const RESTART_WINDOW = 60 * 60 * 1000 // 1小时

function getRecentRestartCount(ip) {
  const now = Date.now()
  if (!restartHistoryMap[ip]) return 0
  // 只保留1小时内的记录
  restartHistoryMap[ip] = restartHistoryMap[ip].filter((ts) => now - ts <= RESTART_WINDOW)
  return restartHistoryMap[ip].length
}

function recordRestart(ip) {
  const now = Date.now()
  if (!restartHistoryMap[ip]) restartHistoryMap[ip] = []
  restartHistoryMap[ip].push(now)
  // 清理过期
  restartHistoryMap[ip] = restartHistoryMap[ip].filter((ts) => now - ts <= RESTART_WINDOW)
}

function restartInterface(interfaceName, ip) {
  if (!isAdmin) {
    console.log('非管理员权限，跳过重启网卡操作')
    return
  }
  // 记录重启
  if (ip) recordRestart(ip)
  // 通知前端：即将重启网卡
  process.send({
    API: 'network-restart',
    interfaceName,
    status: 'restarting',
    ip,
    restartCount: ip ? getRecentRestartCount(ip) : 0
  })
  exec(`netsh interface set interface name="${interfaceName}" admin=disable`, (err) => {
    if (err) {
      console.error('网卡禁用失败:', err)
      process.send({
        API: 'network-restart',
        interfaceName,
        status: 'failed',
        error: err.message,
        ip,
        restartCount: ip ? getRecentRestartCount(ip) : 0
      })
      return
    }
    setTimeout(() => {
      exec(`netsh interface set interface name="${interfaceName}" admin=enable`, (err2) => {
        if (err2) {
          console.error('网卡启用失败:', err2)
          process.send({
            API: 'network-restart',
            interfaceName,
            status: 'failed',
            error: err2.message,
            ip,
            restartCount: ip ? getRecentRestartCount(ip) : 0
          })
        } else {
          console.log('网卡重启完成')
          process.send({
            API: 'network-restart',
            interfaceName,
            status: 'success',
            ip,
            restartCount: ip ? getRecentRestartCount(ip) : 0
          })
        }
      })
    }, 500)
  })
}

let globalLastRestartTime = 0
const MIN_RESTART_INTERVAL = 40000 // 最少 2分钟

// 定义按IP分组的队列管理
const ipQueues = new Map() // { [ip]: { queue: [], writing: false, lastProcessTime: 0 } }
const WRITE_THRESHOLD = 200 // 单个队列的写入阈值，避免内存堆积
const MAX_QUEUE_SIZE = 2000 // 降低单个队列的最大大小，从8000降低到2000
const PROCESS_INTERVAL = 2000 // 每个队列的处理间隔2秒，避免内存堆积

// 为每个IP维护独立的序号计数器
const ipFrameCounters = new Map() // { [ip]: counter }

// 获取IP特定的序号（每个IP从1开始）
function getNextIpId(ip) {
  if (!ipFrameCounters.has(ip)) {
    ipFrameCounters.set(ip, 0)
  }
  const currentValue = ipFrameCounters.get(ip)
  const newValue = currentValue + 1
  ipFrameCounters.set(ip, newValue)
  return newValue
}

// 获取或创建IP队列
function getOrCreateIpQueue(ip) {
  if (!ipQueues.has(ip)) {
    ipQueues.set(ip, {
      queue: [],
      writing: false,
      lastProcessTime: 0
    })
  }
  return ipQueues.get(ip)
}

// 清理IP队列（当IP断开连接时）
function cleanupIpQueue(ip) {
  if (ipQueues.has(ip)) {
    const ipQueue = ipQueues.get(ip)
    if (ipQueue.queue.length > 0) {
      console.log(`[队列管理] 清理IP ${ip} 的队列，剩余 ${ipQueue.queue.length} 条数据`)
      // 处理剩余数据
      processIpQueue(ip).catch((err) => {
        console.error(`[队列管理] 清理IP ${ip} 队列时出错:`, err)
      })
    }
    ipQueues.delete(ip)
  }
}

function addToGlobalQueue(frame) {
  const { mbsHost } = frame
  if (!mbsHost) {
    console.warn('[队列管理] 报文缺少mbsHost信息，跳过')
    return
  }

  const ipQueue = getOrCreateIpQueue(mbsHost)
  // 使用IP特定的序号，而不是全局序号
  const id = getNextIpId(mbsHost)

  // 检查队列大小，如果超过限制则丢弃最旧的数据
  if (ipQueue.queue.length >= MAX_QUEUE_SIZE) {
    console.warn(`[内存管理] IP ${mbsHost} 队列大小超过限制(${MAX_QUEUE_SIZE})，丢弃最旧的数据`)
    ipQueue.queue.splice(0, Math.floor(MAX_QUEUE_SIZE * 0.2)) // 丢弃20%的最旧数据
  }

  ipQueue.queue.push({ ...frame, id })

  // 检查是否需要处理队列
  if (ipQueue.queue.length >= WRITE_THRESHOLD && !ipQueue.writing) {
    processIpQueue(mbsHost)
  }
}

// 处理指定IP的队列
async function processIpQueue(ip) {
  const ipQueue = getOrCreateIpQueue(ip)
  if (ipQueue.writing || ipQueue.queue.length === 0) return

  ipQueue.writing = true
  try {
    // 限制单次处理的数量，防止内存峰值
    const batchSize = Math.min(WRITE_THRESHOLD, ipQueue.queue.length)
    const batch = ipQueue.queue.splice(0, batchSize)
    batch.sort((a, b) => a.id - b.id)

    //console.log(`[队列管理] 处理IP ${ip} 的队列，批量大小: ${batch.length}`)
    await modbusTcpClient.saveRawDataBatchStatic(batch, ip)

    ipQueue.lastProcessTime = Date.now()
  } catch (e) {
    console.error(`[报文导出] IP ${ip} 批量写入失败:`, e)

    // 写入失败时，清理部分数据防止内存堆积
    if (ipQueue.queue.length > MAX_QUEUE_SIZE * 0.8) {
      console.warn(`[内存管理] IP ${ip} 写入失败，清理队列数据防止内存堆积`)
      ipQueue.queue.splice(0, Math.floor(ipQueue.queue.length * 0.2))
    }
  } finally {
    ipQueue.writing = false
    // 立即触发下一次处理（如果还有数据）
    if (ipQueue.queue.length > 0) {
      setImmediate(() => processIpQueue(ip))
    }
  }
}

// 定时器，防止低流量时报文滞留
setInterval(() => {
  const now = Date.now()
  for (const [ip, ipQueue] of ipQueues.entries()) {
    if (
      ipQueue.queue.length > 0 &&
      !ipQueue.writing &&
      now - ipQueue.lastProcessTime > PROCESS_INTERVAL
    ) {
      processIpQueue(ip)
    }
  }
}, 1000)

// 增加内存清理函数
function cleanupMemory() {
  let totalCleaned = 0
  for (const [ip, ipQueue] of ipQueues.entries()) {
    if (ipQueue.queue.length > MAX_QUEUE_SIZE * 0.9) {
      const toClean = Math.floor(ipQueue.queue.length * 0.2)
      ipQueue.queue.splice(0, toClean)
      totalCleaned += toClean
      console.warn(`[内存管理] 主动清理IP ${ip} 队列，清理 ${toClean} 条数据`)
    }
  }

  if (totalCleaned > 0) {
    console.log(`[内存管理] 总共清理了 ${totalCleaned} 条队列数据`)
    // 强制垃圾回收
    if (global.gc) {
      global.gc()
    }
  }
}

// 增加紧急内存清理机制
function emergencyCleanup() {
  const usage = process.memoryUsage()
  const ratio = usage.heapUsed / usage.heapTotal

  if (ratio > 0.9) {
    console.warn(`[紧急内存清理] 内存使用率过高: ${(ratio * 100).toFixed(1)}%，立即清理队列`)

    let totalCleaned = 0
    for (const [ip, ipQueue] of ipQueues.entries()) {
      if (ipQueue.queue.length > 0) {
        const toDelete = Math.floor(ipQueue.queue.length * 0.3)
        ipQueue.queue.splice(0, toDelete)
        totalCleaned += toDelete
        console.log(`[紧急内存清理] IP ${ip} 已清理 ${toDelete} 条队列数据`)
      }
    }

    if (totalCleaned > 0) {
      console.log(`[紧急内存清理] 总共清理了 ${totalCleaned} 条队列数据`)
    }

    // 强制垃圾回收
    if (global.gc) {
      global.gc()
    }
  }
}

// 注册内存清理回调
// memoryManager.addCleanupCallback(async () => {
//   let totalCleaned = 0
//   for (const [ip, ipQueue] of ipQueues.entries()) {
//     if (ipQueue.queue.length > MAX_QUEUE_SIZE * 0.7) {
//       const toClean = Math.floor(ipQueue.queue.length * 0.15)
//       ipQueue.queue.splice(0, toClean)
//       totalCleaned += toClean
//       console.log(`[内存管理] 清理IP ${ip} 队列，清理 ${toClean} 条数据`)
//     }
//   }

//   if (totalCleaned > 0) {
//     console.log(`[内存管理] 总共清理了 ${totalCleaned} 条队列数据`)
//   }

//   // 执行紧急清理
//   emergencyCleanup()
// })

// 定期内存清理，减少频率
// setInterval(cleanupMemory, 120000) // 每120秒检查一次

// 增加紧急清理定时器
// setInterval(emergencyCleanup, 60000) // 每60秒检查一次

class modbusTcpClient {
  constructor(mbsHost) {
    this.mbsHost = mbsHost
    this.mbsState = MBS_STATE_INIT
    this.mbsStatus = 'Initializing...'
    this.heartbeatTimer = null //心跳定时器句柄
    this.client = new ModbusRTU() // 创建实例
    this.isListenersAttached = false // 标志：是否已附加收发监听器
    this._lastRequest = null // 缓存最后一次请求报文
    this._lastResponse = null // 缓存最后一次响应报文
    this._origPortWrite = null
    this.hasNotifiedBusy = false // 新增：是否已通知过文件占用
    this.txCount = 0 // 新增：发送帧计数器
    this.rxCount = 0 // 新增：接收帧计数器
    this.isConnecting = false // 标志位：防止多次连接
    this.skip = false // 新增：用于标记是否跳过该客户端
    // 添加状态锁
    this.isProcessing = false
    this.isStopped = true // 控制是否停止读取全部数据
    this.isReading = false
    this.isUpgrade = false // 新增：用于标记是否升级
    this.isBMUAdapt = false // 新增：用于标记是否BMU地址自适应
    this.isReadingEvent = false // 新增：用于标记是否读取事件
    // 新增重连时间戳记录
    this.lastConnectAttempt = 0
    this.retryCount = 0
    this.networkRestartCount = 0 // 网卡重启次数计数器
    this.maxRetries = 10000// 默认最大重试次数
    this.maxNetworkRestarts = 3 // 最大网卡重启次数
    this.baseReconnectInterval = 3000 // 基础重连间隔
    this.isTerminated = false // 标记是否已终止重连
    this.autoReconnectTimeout = null
    this.connectionVerified = false
    this.currentReconnectInterval = this.baseReconnectInterval
    this.reconnectMultiplier = 1.2 // 退避系数
    this.healthCheckTimer = null // 连接健康检查定时器
    this.healthCheckInterval = 30000 // 30秒检查一次
    this.lastHealthCheck = 0 // 上次健康检查时间
    this.bmuTotal
    this.AFETotal
    this.afeConfig
    this.sopRealtime = {
      chargSOPVerif: null,
      chargSOP: null,
      chargSOPMapRow: null,
      chargSOPMapColumn: null,
      dischargSOPVerif: null,
      dischargSOP: null,
      dischargSOPMapRow: null,
      dischargSOPMapColumn: null
    }
    // PowerMap实时数据存储
    this.powerMapRealtimeData = {
      tempMax1: null,
      tempMin1: null,
      clusterSOC: null,
      chargeSOP: null,
      dischargeSOP: null
    }
    this.ivRealTimeData = {
      current: null,
      clusterVltg: null,
      prechargeVltg: null
    }
    this.bmuProductCodes = []
    this.versionData = []
    this.isSetDataExport = true
    this.isSetBufferExport = true
    this.modules = {
      BalanceData: { isStoppedParams: true },
      ConfigParamSys: { isStoppedParams: true },
      ConfigAlarm: { isStoppedParams: true },
      ConfigSOX: { isStoppedParams: true },
      VTConfig: { isStoppedParams: true },
      Upgrade: { isStoppedParams: true },
      Adapt: { isStoppedParams: true },
      Control: { isStoppedParams: true },
      EventTime: { isStoppedParams: true },
      PowerMap: { isStoppedParams: true },
      PCS: { isStoppedParams: true },
      refrigeration: { isStoppedParams: true },
      dehum: { isStoppedParams: true },
      fire: { isStoppedParams: true },
      FaultConfig: { isStoppedParams: true },
      DIDOConfig: { isStoppedParams: true }
    }
  }

  init() {
    this.client.close((err) => {
      if (err) {
        console.error('关闭连接时发生错误:', err.message)
      } else {
        console.log('关闭连接成功')
      }
    })
    this.client.setID(mbsId)
    this.client.setTimeout(mbsTimeout)
  }

  async connect(manual = false) {
    const host = this.mbsHost

    // —— 新增：看一下 modbusClients 里是否还有这个实例 ——
    if (!modbusClients[host]) {
      console.log(`[${host}] 已不在 modbusClients 中，跳过连接`)
      return
    }

    // 检查是否已终止重连
    if (this.isTerminated) {
      console.log(`[${host}] 重连已终止，跳过连接`)
      return
    }

    if (this.isConnecting || this.skip) return

    // 优化连接检查逻辑，避免不必要的重连
    if (this.mbsState === MBS_STATE_GOOD_CONNECT && this.client.isOpen && this.connectionVerified) {
      console.log(`已有活跃连接${this.mbsHost}:${this.mbsState}，无需重连`)
      return
    }

    // 如果正在健康检查中，等待检查完成
    if (this.healthCheckTimer && this.isProcessing) {
      console.log(`[${this.mbsHost}] 正在处理中，延迟连接`)
      return
    }
    this.isConnecting = true
    /* console.log(
      manual
        ? `[${this.mbsHost}] 手动连接…`
        : `[${this.mbsHost}] 发起第 ${this.retryCount + 1} 次自动重连`
    ) */
    // 统一通知前端：开始连接
    process.send({
      API: 'connection-status',
      ip: this.mbsHost,
      success: false,
      error: 'reconnectting',
      retryCount: this.retryCount // 新增
    })
    try {
      // 强制关闭旧连接（如果存在）
      if (this.client.isOpen) {
        await this.cleanupConnection()
        this.client = new ModbusRTU() // 创建新实例
        this.init()
      }
      await connectWithTimeout(this.client, this.mbsHost, { port: mbsPort }, DEFAULT_TCP_TIMEOUT)
      if (!this.client.isOpen) throw new Error('TCP 端口未打开')

      // 新增：验证Modbus通信是否真正可用
      await this.verifyModbusConnection()

      await this.finalizeConnectSuccess()
    } catch (e) {
      this.handleConnectError(e)
    } finally {
      this.isConnecting = false // 清除连接标志
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) {
      // 已经在心跳了，就别再重建了
      return
    }
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.client.readHoldingRegisters(0x0000, 1)
      } catch (e) {
        console.warn(`[${this.mbsHost}] 心跳失败，尝试重连：`, e.message)
        // 心跳失败，触发一次 reconnect
        this.mbsState = MBS_STATE_INIT
        this.connect().catch(() => {})
      }
    }, 30000)
  }

  // 新增：停止并清理心跳
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 启动连接健康检查
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck()
    }, this.healthCheckInterval)

    //console.log(`[${this.mbsHost}] 已启动连接健康检查，间隔: ${this.healthCheckInterval}ms`)
  }

  // 停止连接健康检查
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
      //console.log(`[${this.mbsHost}] 已停止连接健康检查`)
    }
  }

  // 执行连接健康检查
  async performHealthCheck() {
    // 如果连接未验证或客户端未打开，跳过检查
    if (!this.connectionVerified || !this.client.isOpen) {
      return
    }

    // 如果正在连接中，跳过健康检查
    if (this.isConnecting) {
      return
    }

    try {
      this.lastHealthCheck = Date.now()
      // 使用轻量级的寄存器读取进行健康检查
      await this.client.readHoldingRegisters(0x0000, 1)
      // 检查成功，连接健康
    } catch (error) {
      //console.warn(`[${this.mbsHost}] 连接健康检查失败: ${error.message}`)

      // 只有在连接确实有问题时才触发重连
      // 检查是否是真正的连接问题，而不是临时的网络波动
      if (this.client.isOpen && this.connectionVerified) {
        // 先停止健康检查，避免重复触发
        this.stopHealthCheck()

        // 标记连接为未验证并触发重连
        this.connectionVerified = false
        this.mbsState = MBS_STATE_FAIL_READ

        // 通知前端连接中断
        process.send({
          API: 'connection-status',
          ip: this.mbsHost,
          success: false,
          error: 'health_check_failed',
          errorType: 'health_check_failed'
        })
      }
    }
  }

  // 新增：验证Modbus连接是否真正可用
  async verifyModbusConnection() {
    //console.log(`[${this.mbsHost}] 开始验证Modbus连接...`)
    try {
      // 设置更短的超时时间进行快速验证
      const originalTimeout = this.client.getTimeout()
      this.client.setTimeout(3000) // 3秒验证超时

      // 尝试读取一个寄存器来验证通信
      // 使用通用的寄存器地址，大多数设备都支持
      const result = await this.client.readHoldingRegisters(0x0000, 1)

      // 恢复原来的超时设置
      this.client.setTimeout(originalTimeout)

      //console.log(`[${this.mbsHost}] Modbus连接验证成功`)
      return true
    } catch (error) {
      //console.error(`[${this.mbsHost}] Modbus连接验证失败:`, error.message)
      throw new Error(`Modbus验证失败: ${error.message}`)
    }
  }

  async cleanupConnection() {
    const port = this.client._port
    if (port) {
      port.removeAllListeners('data')
      if (this._origPortWrite) {
        port.write = this._origPortWrite // 恢复原始写入方法
      }
    }
    // —— 新增这一行 ——
    this.isListenersAttached = false
    this.connectionVerified = false // 重置连接验证状态
    this.stopHealthCheck() // 停止健康检查

    // ⚠️ 不调用stopSaveTimer()，因为：
    // 1. 单个BCU断开不应该停止所有BCU的数据导出
    // 2. stopSaveTimer是全局操作，会清空所有Map和停止所有定时器
    // 3. 其他BCU可能还在正常通讯，需要继续导出数据
    //console.log(`[${this.mbsHost}] 清理连接`)

    await this.client.close()
  }

  async finalizeConnectSuccess() {
    this.retryCount = 0
    this.networkRestartCount = 0 // 连接成功后重置网卡重启计数器
    this.isTerminated = false // 重置终止标记
    this.currentReconnectInterval = this.baseReconnectInterval
    this.skip = false
    this.mbsState = MBS_STATE_GOOD_CONNECT
    this.mbsStatus = 'Connected'
    this.connectionVerified = true
    console.log(`[${this.mbsHost}] Connected.`,'isStopped:',this.isStopped)

    // 清除之前的自动重连定时器
    if (this.autoReconnectTimeout) {
      clearTimeout(this.autoReconnectTimeout)
      this.autoReconnectTimeout = null
    }

    // 启动连接健康检查
    this.startHealthCheck()

    // —— 真正稳定后，再算成功 ——
    // 只有在数据导出被启用时才重新启动数据写入
    if (this.isSetDataExport) {
      //console.log(`[${this.mbsHost}] 连接成功，重新启动数据写入`)
      startSaveTimer()
    } else {
      console.log(`[${this.mbsHost}] 连接成功，但数据导出已被手动停止，不启动数据写入`)
    }
    this.enableDataExport()
    process.send({ API: 'connection-status', ip: this.mbsHost, success: true })
    if (!this.isStopped) {
      // 如果之前已经在通讯模式，则发送继续通讯的事件
      process.send({
        API: 'connection-status',
        ip: this.mbsHost,
        success: false,
        error: 'reConnected'
      })
    } else {
      // 否则发送正常的连接成功事件
      process.send({ API: 'connection-status', ip: this.mbsHost, success: true })
    }
  }

  handleConnectError(e) {
    this.retryCount++
    this.connectionVerified = false // 连接失败时重置验证状态

    // 调试信息：显示当前权限状态
    /* console.log(
      `[${this.mbsHost}] 重连失败调试信息 - 重连次数: ${this.retryCount}, isAdmin: ${isAdmin}, selectedInterfaceName: "${selectedInterfaceName}"`
    ) */

    // 区分不同类型的错误，调整重连策略
    let errorType = 'connection_failed'
    if (e.message.includes('Modbus验证失败')) {
      errorType = 'modbus_verification_failed'
      //console.log(`[${this.mbsHost}] TCP连接成功但Modbus验证失败，可能设备离线或协议不匹配`)
    } else if (e.message.includes('TCP connect timeout') || e.message.includes('ECONNREFUSED')) {
      errorType = 'tcp_connection_failed'
      console.log(`[${this.mbsHost}] TCP连接失败，设备可能真正离线`)
    }

    // 根据错误类型调整重连间隔
    if (errorType === 'modbus_verification_failed') {
      // Modbus验证失败时，使用更长的重连间隔
      this.currentReconnectInterval = Math.min(
        this.currentReconnectInterval * 1.5,
        60000 // 最长1分钟
      )
    } else {
      this.currentReconnectInterval = Math.min(
        this.currentReconnectInterval * this.reconnectMultiplier,
        30000
      )
    }

    process.send({
      API: 'connection-status',
      ip: this.mbsHost,
      success: false,
      error: e.message,
      errorType: errorType,
      retryCount: this.retryCount
    })

    // 新的重连策略：尝试重启网卡但不重置重连次数
    if (isAdmin) {
      // 有重启网卡权限：每8次重连失败后尝试重启网卡（最多3次）
      if (this.retryCount > 8 && this.networkRestartCount < this.maxNetworkRestarts) {
        const now = Date.now()
        if (now - globalLastRestartTime >= MIN_RESTART_INTERVAL) {
          this.networkRestartCount++
          console.log(
            `[${this.mbsHost}] 连续 ${this.retryCount} 次重连失败，` +
              `第 ${this.networkRestartCount} 次重启网卡 ${selectedInterfaceName}`
          )
          restartInterface(selectedInterfaceName, this.mbsHost)
          globalLastRestartTime = now

          // ✅ 不再重置重连计数器，让重连次数持续累积
          // this.retryCount = 0  // 已删除
          this.currentReconnectInterval = this.baseReconnectInterval
        } else {
          console.log(
            `[${this.mbsHost}] 达到重连阈值，但距离上次重启仅 ${Math.floor((now - globalLastRestartTime) / 1000)}s，` +
              `跳过本次重启`
          )
        }
      }
    }

    // 统一的重连终止条件：只根据重连次数判断
    if (this.retryCount >= this.maxRetries) {
      this.isTerminated = true
      this.skip = true
      this.mbsState = MBS_STATE_FAIL_CONNECT
      console.log(`[${this.mbsHost}] 已重连 ${this.maxRetries} 次仍无法连接，停止重连`)
      process.send({
        API: 'connection-status',
        ip: this.mbsHost,
        success: false,
        error: `重连${this.maxRetries}次后仍无法连接`,
        errorType: 'max_retries_exceeded',
        retryCount: this.retryCount
      })
      return
    }

    // 继续重连
    /* console.log(
      `[${this.mbsHost}] 将在 ${this.currentReconnectInterval}ms 后重试连接 (错误类型: ${errorType}, 重连次数: ${this.retryCount}/${this.maxRetries})`
    ) */
    clearTimeout(this.autoReconnectTimeout)
    this.autoReconnectTimeout = setTimeout(
      () => this.connect().catch(() => {}),
      this.currentReconnectInterval
    )
  }

  async forceDisconnect() {
    this.isStopped = true // 停止所有读取
    this.skip = true // 跳过后续操作
    if (this.autoReconnectTimeout) {
      clearTimeout(this.autoReconnectTimeout)
      this.autoReconnectTimeout = null
    }
    this.stopHeartbeat()
    this.stopHealthCheck() // 停止健康检查
    
    // ✅ 关键修复：先处理剩余队列数据，再删除client
    // 确保在client被删除前，队列中的数据能正确写入到对应的BCU文件夹
    console.log(`[${this.mbsHost}] 断开连接前先处理剩余队列数据`)
    cleanupIpQueue(this.mbsHost)
    
    // 然后再清理连接（会删除client和清空Map）
    await this.cleanupConnection()

    // ⚠️ 不清理文件后缀，让下次重连时继续使用相同的文件夹
    // cleanupIpFileSuffix(this.mbsHost)  // 注释掉，防止重新创建文件夹

    // 清空缓冲区
    // 新增：断开时重置重启次数
    if (restartHistoryMap[this.mbsHost]) restartHistoryMap[this.mbsHost] = []
    // 新增：断开后发送重置后的次数
    process.send({
      API: 'network-restart',
      interfaceName: selectedInterfaceName,
      status: 'disconnected',
      ip: this.mbsHost,
      restartCount: 0
    })
    console.log(`强制关闭连接: ${this.mbsHost}`)
  }

  // 修改attachRawFrameListeners，采集报文直接push到全局rawFrameQueue
  attachRawFrameListeners() {
    if (this.isListenersAttached || !this.client._port) return
    const socket =
      this.client._port && this.client._port._client
        ? this.client._port._client
        : this.client.socket

    if (!socket) return
    // 拦截所有写操作
    this._origPortWrite = socket.write.bind(socket)
    socket.write = (buffer, ...args) => {
      this.txCount++
      if (this.isSetBufferExport) {
        // ✅ 使用setImmediate推迟到下一个事件循环，不阻塞当前写操作
        setImmediate(() => {
          addToGlobalQueue({
            type: 'request',
            buffer: Buffer.from(buffer),
            ts: Date.now(),
            mbsHost: this.mbsHost
          })
        })
      }
      return this._origPortWrite(buffer, ...args)
    }
    socket.on('data', (data) => {
      this.rxCount++
      if (this.isSetBufferExport) {
        // ✅ 使用setImmediate推迟到下一个事件循环，不阻塞接收处理
        setImmediate(() => {
          addToGlobalQueue({
            type: 'response',
            buffer: Buffer.from(data),
            ts: Date.now(),
            mbsHost: this.mbsHost
          })
        })
      }
    })
    this.isListenersAttached = true
  }

  // 静态方法：按IP批量写入
  static async saveRawDataBatchStatic(batch, ip) {
    if (!batch || batch.length === 0) return

    // 确保IP参数存在
    if (!ip) {
      console.error('[报文导出] 缺少IP参数，无法保存数据')
      return
    }

    // 复用原有saveRawDataBatch的内容，但selectedInterface等需从batch项获取mbsHost
    const lines = batch
      .map(({ type, buffer, ts, id, mbsHost }) => {
        const time = formatDateTime(new Date(ts), 'includeMs')
        const source = type === 'request' ? selectedInterface : mbsHost
        const destination = type === 'request' ? mbsHost : selectedInterface
        const api = type === 'request' ? 'PC-->BCU' : 'BCU-->PC'
        const hex = buffer.toString('hex')
        const hexToShow = "'" + hex
        const p = parseModbusFrame(hex)
        const transactionID = '0x' + p.transactionID
        const protocol = '0x' + p.protocol
        const length = parseInt(p.length, 16)
        const unitID = '0x' + p.unitID
        const func = '0x' + p.func
        const addrDec = p.addr === '/' ? '/' : '0x' + p.addr
        const qtyDec = p.qty === '/' ? '/' : parseInt(p.qty, 16)
        const bcDec = p.byteCount === '/' ? '/' : parseInt(p.byteCount, 16)
        const MAX_DATA_FIELDS = 125
        const trimmed = p.dataFields.slice(0, MAX_DATA_FIELDS)
        const paddingCount = Math.max(0, MAX_DATA_FIELDS - trimmed.length)
        const dataFields = trimmed.map((h) => '0x' + h).concat(Array(paddingCount).fill(''))
        const cols = [
          id,
          time,
          source,
          destination,
          api,
          hexToShow,
          transactionID,
          protocol,
          length,
          unitID,
          func,
          addrDec,
          qtyDec,
          bcDec,
          ...dataFields
        ]
        return cols.join(',')
      })
      .join('\r\n')

    try {
      // 使用IP特定的保存方法
      await appendToCSV(lines, ip)
    } catch (err) {
      console.error(`[报文导出] IP ${ip} 写入CSV异常:`, err)
    }
  }

  detachRawFrameListeners() {
    const port = this.client._port
    // 1) 恢复原始 write
    if (!port || !this.isListenersAttached) return
    if (this._origPortWrite) {
      const socket = port._client || this._client_socket
      socket.write = this._origPortWrite
      this._origPortWrite = null
    }
    // 2) 移除所有 data 事件监听
    if (port._client) {
      port._client.removeAllListeners('data')
    } else if (this._client_socket) {
      this.client.socket.removeAllListeners('data')
    }
  }

  enableDataExport() {
    this.attachRawFrameListeners()
  }

  static resetRestartCount(ip) {
    if (restartHistoryMap[ip]) restartHistoryMap[ip] = []
    // 新增：断开后发送重置后的次数
    process.send({
      API: 'network-restart',
      interfaceName: selectedInterfaceName,
      status: 'disconnected',
      ip: ip,
      restartCount: 0
    })
  }

  // 新增：终止指定IP的重连（用于自适应成功后停止旧IP重连）
  static terminateReconnection(ip) {
    const client = modbusClients[ip]
    if (client) {
      client.isTerminated = true
      client.skip = true

      // 清除重连定时器
      if (client.autoReconnectTimeout) {
        clearTimeout(client.autoReconnectTimeout)
        client.autoReconnectTimeout = null
      }

      console.log(`[${ip}] 自适应成功，终止旧IP的重连`)

      // 通知前端该IP重连已终止
      process.send({
        API: 'connection-status',
        ip: ip,
        success: false,
        error: '自适应成功，停止重连',
        errorType: 'adaptive_success_terminated'
      })
    }
  }

  // 新增：重新启用指定IP的重连（如果需要的话）
  static enableReconnection(ip) {
    const client = modbusClients[ip]
    if (client) {
      client.isTerminated = false
      client.skip = false
      client.retryCount = 0
      client.networkRestartCount = 0
      client.currentReconnectInterval = client.baseReconnectInterval

      console.log(`[${ip}] 重新启用重连功能`)
    }
  }
}

export { modbusTcpClient, setContextVariables }

// 定时推送所有IP的restartCount，20分钟一次
setInterval(
  () => {
    Object.keys(restartHistoryMap).forEach((ip) => {
      process.send({
        API: 'network-restart',
        interfaceName: selectedInterfaceName,
        status: 'refresh',
        ip,
        restartCount: 0
      })
    })
  },
  60 * 60 * 1000
) // 20分钟推送一次
