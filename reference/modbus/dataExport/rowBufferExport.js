;('use strict')
const path = require('path')
const fs = require('fs')
import {
  formatDateTime,
  parseModbusFrame,
  writeToLog,
  formatFileSuffix,
  ensureDir,
  compressFileGzip
} from './utils'
import { Mutex } from 'async-mutex'
import { getModbusClients } from '../mbstask'
import { appendFileWithRetry } from './utils'

// 创建互斥锁
const csvMutex = new Mutex()

// 共享的IP目录后缀Map（与runningDataExport.js保持一致）
const ipDirSuffixMap = new Map()

// BCU序号缓存Map，防止断开连接后查找失败
const ipBcuNumberCache = new Map()

// 导出ipDirSuffixMap，让runningDataExport.js可以导入使用
export { ipDirSuffixMap }

// 共享的BCU序号获取函数
function getBcuNumber(ip) {
  // 先从缓存中获取
  if (ipBcuNumberCache.has(ip)) {
    return ipBcuNumberCache.get(ip)
  }
  
  const clients = getModbusClients()
  const ipList = Object.keys(clients).sort() // 按IP地址排序
  const bcuIndex = ipList.indexOf(ip)
  const bcuNumber = bcuIndex >= 0 ? bcuIndex + 1 : 1
  
  // 缓存BCU序号
  if (bcuIndex >= 0) {
    ipBcuNumberCache.set(ip, bcuNumber)
  }
  
  return bcuNumber
}

// 共享的IP目录后缀获取函数
function getIpDirSuffix(ip) {
  // 如果这个 IP 还没分配后缀，就分配一个新的
  if (!ipDirSuffixMap.has(ip)) {
    // 使用固定的时间戳，确保与runningDataExport.js保持一致
    // 使用当前日期的小时和分钟，忽略秒和毫秒，确保在1分钟内创建的文件使用相同后缀
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_00`
    ipDirSuffixMap.set(ip, ts)
    console.log(`[文件夹管理] 为IP ${ip} 分配目录后缀: ${ts}`)
  }
  return ipDirSuffixMap.get(ip) // 取出这个 IP 的后缀
}

const FILE_BASE = 'Raw_Frames'
let currentFileSuffix = formatFileSuffix(new Date()) // ← 在模块加载时生成一次
let currentFileIndex = 0
let rawFrameCounter = 0
let globalRawFrameCounter = 0

// 为每个IP维护独立的序号计数器
const ipFrameCounters = new Map() // { [ip]: counter }

// 为每个IP维护独立的文件后缀
const ipFileSuffixMap = new Map() // { [ip]: fileSuffix }

const FILE_SIZE_LIMIT = 0.5 * 1024 * 1024 * 1024 // 500 MB
const MIN_FREE_SPACE = 1 * 1024 * 1024 * 1024 // 1GB
const CSV_BUFFER_INTERVAL = 1000 // 缓冲刷盘间隔1秒，避免内存堆积
const HEADER =
  [
    'ID',
    '时间',
    '源地址',
    '目标地址',
    '传输方向',
    '原始报文',
    '事务标识符',
    '协议标识符',
    '后面字节长度',
    '单元标识符',
    '功能码',
    '起始地址',
    '寄存器数量',
    '字节计数',
    // 最多 125 个寄存器
    ...Array.from({ length: 125 }, (_, i) => `Data${i + 1}`)
  ].join(',') + '\r\n'

const BOM_HEADER = '\uFEFF' + HEADER
const BASE_EXPORT_ROOT = path.join(process.cwd(), 'dataExports')
const dirSuffix = formatFileSuffix(new Date())
const RUN_EXPORT_DIR = path.join(BASE_EXPORT_ROOT, `Data_${dirSuffix}`)
const DEBUG_LOG_FILE = path.join(BASE_EXPORT_ROOT, 'debug_write.log')
// 按IP获取文件路径，为报文创建独立的文件夹
function getCurrentFilePathForIp(ip) {
  const bcuNumber = getBcuNumber(ip)
  // 为报文创建独立的文件夹，使用frames后缀区分
  let ipSuffix
  if (!ipDirSuffixMap.has(ip)) {
    // 使用固定的时间戳，确保与runningDataExport.js保持一致
    // 使用当前日期的小时和分钟，忽略秒和毫秒，确保在1分钟内创建的文件使用相同后缀
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_00`
    ipDirSuffixMap.set(ip, ts)
    //console.log(`[文件夹管理] 为IP ${ip} 分配报文目录后缀: ${ts}`)
  }
  ipSuffix = ipDirSuffixMap.get(ip)

  // 为报文创建独立的文件夹，加上frames后缀区分
  const ipDir = path.join(RUN_EXPORT_DIR, `BCU${bcuNumber}(${ip})_${ipSuffix}_frames`)
  ensureDir(ipDir) // 确保IP目录存在

  // 使用IP特定的文件后缀，而不是全局的currentFileSuffix
  let fileSuffix = ipFileSuffixMap.get(ip)
  if (!fileSuffix) {
    fileSuffix = formatFileSuffix(new Date())
    ipFileSuffixMap.set(ip, fileSuffix)
  }

  const filename = `${FILE_BASE}_${fileSuffix}.csv`
  return path.join(ipDir, filename)
}

function getCurrentFilePath() {
  const filename = `${FILE_BASE}_${currentFileSuffix}.csv`
  return path.join(RUN_EXPORT_DIR, filename)
}

function getNextGlobalId() {
  // 保持原子递增但不立即分配
  return ++globalRawFrameCounter
}

// 清理IP的文件后缀缓存（当IP断开连接时调用）
function cleanupIpFileSuffix(ip) {
  if (ipFileSuffixMap.has(ip)) {
    ipFileSuffixMap.delete(ip)
    console.log(`[文件管理] 清理IP ${ip} 的文件后缀缓存`)
  }
}

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

// 添加文件大小监控函数
async function logFileSize(filePath, context = '') {
  try {
    const stats = await fs.promises.stat(filePath)
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
    const thresholdMB = (FILE_SIZE_LIMIT / 1024 / 1024).toFixed(2)
    console.log(
      `[文件监控] ${context} 文件大小: ${sizeMB}MB / ${thresholdMB}MB (${((stats.size / FILE_SIZE_LIMIT) * 100).toFixed(1)}%)`
    )
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`[文件监控] 获取文件大小失败: ${filePath}`, err)
    }
  }
}

async function checkFileRotation(filePath, ip = null) {
  try {
    const stats = await fs.promises.stat(filePath)
    if (stats.size >= FILE_SIZE_LIMIT) {
      console.log(
        `[文件轮转] 文件 ${filePath} 大小 ${(stats.size / 1024 / 1024).toFixed(2)}MB 超过阈值 ${(FILE_SIZE_LIMIT / 1024 / 1024).toFixed(2)}MB，开始压缩`
      )
      // 异步压缩不影响主线程
      compressFileGzip(filePath)
        .then(() => {
          console.log(`[文件轮转] 压缩完成：${filePath}.gz`)
        })
        .catch((err) => {
          console.error(`[文件轮转] 压缩失败：${filePath}`, err)
        })

      // 只更新特定IP的文件后缀，不影响其他IP
      if (ip) {
        const newFileSuffix = formatFileSuffix(new Date())
        ipFileSuffixMap.set(ip, newFileSuffix)
        console.log(`[文件轮转] IP ${ip} 文件后缀更新为: ${newFileSuffix}`)
      } else {
        // 兼容原有逻辑，更新全局后缀
        currentFileSuffix = formatFileSuffix(new Date())
      }

      rawFrameCounter = 0
      return true // 返回true表示发生了轮转
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      rawFrameCounter = 0
    } else {
      throw err
    }
  }
  return false // 返回false表示没有轮转
}

function writeDebugLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\r\n`
  try {
    fs.appendFileSync(DEBUG_LOG_FILE, line)
  } catch (e) {
    // 忽略日志写入异常
  }
}

// 优化版本：减少持锁时间，不在持锁期间做IO
async function appendToCSV(lines, ip = null) {
  ensureDir(RUN_EXPORT_DIR)

  // ✅ 1. 不持锁：确定文件路径
  let filePath
  if (ip) {
    filePath = getCurrentFilePathForIp(ip)
  } else {
    filePath = getCurrentFilePath()
  }

  // ✅ 2. 不持锁：检查文件轮转
  const rotationOccurred = await checkFileRotation(filePath, ip)
  if (rotationOccurred) {
    if (ip) {
      filePath = getCurrentFilePathForIp(ip)
    } else {
      filePath = getCurrentFilePath()
    }
  }

  // ✅ 3. 不持锁：检查是否需要表头
  let needHeader = false
  try {
    const stats = await fs.promises.stat(filePath)
    if (stats.size === 0) {
      needHeader = true
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      needHeader = true
    } else {
      console.error(`[CSV] ${ip ? `IP ${ip} ` : ''}检查文件失败:`, e)
      return
    }
  }

  // ✅ 4. 不持锁：执行实际的文件写入
  try {
    if (needHeader) {
      await appendFileWithRetry(filePath, BOM_HEADER)
    }
    const dataToWrite = lines + '\r\n'
    await appendFileWithRetry(filePath, dataToWrite)
  } catch (err) {
    console.error(`[CSV] ${ip ? `IP ${ip} ` : ''}写入失败:`, err)
  }
  
  // ✅ 完全移除了互斥锁，因为文件写入本身已经是原子操作
  // Node.js的fs操作在操作系统层面是安全的
}
export {
  appendToCSV,
  RUN_EXPORT_DIR,
  CSV_BUFFER_INTERVAL,
  FILE_SIZE_LIMIT,
  MIN_FREE_SPACE,
  getNextGlobalId,
  getNextIpId,
  getCurrentFilePath,
  getCurrentFilePathForIp,
  globalRawFrameCounter,
  writeDebugLog,
  logFileSize,
  cleanupIpFileSuffix
}
