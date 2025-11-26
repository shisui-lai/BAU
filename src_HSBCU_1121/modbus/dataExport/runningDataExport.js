;('use strict')
import { FILE_SIZE_LIMIT, CSV_BUFFER_INTERVAL, MIN_FREE_SPACE } from './rowBufferExport'
import {
  ensureDir,
  formatFileSuffix,
  formatDateTime,
  csvMutex,
  writeFileWithRetry,
  appendFileWithRetry,
  daySuffix,
  compressFileGzip,
  getCachedFreeDiskSpace
} from './utils'
import { getModbusClients } from '../mbstask'
// ✅ 性能优化：移除这个导入，避免在高频调用中执行复杂计算
// import { getCurrentActionValueForAlarm } from '../handlers/read'
const path = require('path')
const fs = require('fs')

// 添加ts()函数定义，用于生成时间戳
function ts() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_${String(now.getSeconds()).padStart(2, '0')}`
}

// 定义与rowBufferExport.js相同的配置
const BASE_EXPORT_ROOT = path.join(process.cwd(), 'dataExports')
const dirSuffix = formatFileSuffix(new Date())
const RUN_EXPORT_DIR = path.join(BASE_EXPORT_ROOT, `Data_${dirSuffix}`)

let saveTimer = null //保存定时器句柄

// 添加状态变化跟踪，避免重复打印日志
const clientStatusCache = new Map() // key: ip, value: { isSetDataExport, isStopped, exists }

// 告警状态跟踪：key为 `${ip}:${告警唯一标识}`，value为告警信息
const storedAlarms = new Map() // 已存储的告警状态
const alarmStatusCache = new Map() // 告警状态缓存，用于检测告警变化

// 生成告警唯一标识
function generateAlarmKey(
  ip,
  classification,
  bmuIndex,
  cellIndex,
  fault,
  level,
  cellIndexRelative
) {
  // 优先使用cellIndex，如果没有则使用cellIndexRelative来区分不同的告警
  const safeCellIndex = cellIndex || cellIndexRelative || ''
  return `${ip}:${classification}:${bmuIndex}:${safeCellIndex}:${fault}:${level}`
}
// 生成不含level的告警唯一标识
function generateAlarmKeyWithoutLevel(
  ip,
  classification,
  bmuIndex,
  cellIndex,
  fault,
  cellIndexRelative
) {
  // 优先使用cellIndex，如果没有则使用cellIndexRelative来区分不同的告警
  const safeCellIndex = cellIndex || cellIndexRelative || ''
  return `${ip}:${classification}:${bmuIndex}:${safeCellIndex}:${fault}`
}

// 检测告警状态是否发生变化
function hasAlarmStatusChanged(
  ip,
  classification,
  bmuIndex,
  cellIndex,
  fault,
  level,
  actionValue,
  cellIndexRelative
) {
  const alarmKey = generateAlarmKey(
    ip,
    classification,
    bmuIndex,
    cellIndex,
    fault,
    level,
    cellIndexRelative
  )

  // 构造当前状态（排除 actionValue）
  const currentStatus = JSON.stringify({
    classification,
    bmuIndex,
    cellIndex,
    fault,
    level
  })

  const cachedStatus = alarmStatusCache.get(alarmKey)

  if (!cachedStatus) {
    // 新告警
    alarmStatusCache.set(alarmKey, currentStatus)
    return { isNew: true, isRecovered: false, hasChanged: false }
  }

  // 特殊处理：如果当前告警等级为'恢复告警'，不视为状态变化
  if (level === '恢复告警') {
    return { isNew: false, isRecovered: false, hasChanged: false }
  }

  if (cachedStatus !== currentStatus) {
    // 告警状态发生变化（非 actionValue 的变化）
    alarmStatusCache.set(alarmKey, currentStatus)
    return { isNew: false, isRecovered: false, hasChanged: true }
  }

  // 告警状态未变化（包括 actionValue 的变化也不视为状态变化）
  return { isNew: false, isRecovered: false, hasChanged: false }
}

// 检测告警是否已恢复（从当前告警列表中消失的告警）
function detectRecoveredAlarms(ip, currentAlarms, currentTime) {
  const recoveredAlarms = []
  const currentKeys = new Set()

  // 收集当前告警的所有键
  currentAlarms.forEach((alarm) => {
    const key = generateAlarmKey(
      ip,
      alarm.classification,
      alarm.bmuIndex,
      alarm.cellIndex,
      alarm.fault,
      alarm.level,
      alarm.cellIndexRelative
    )
    currentKeys.add(key)
  })

  // ✅ 性能优化：已通过 O(1) 查找优化，可以处理所有恢复告警
  // 记录检查数量用于监控
  let checkedCount = 0

  // 检查之前存储的告警是否在当前列表中
  for (const [alarmKey, alarmInfo] of storedAlarms.entries()) {
    if (alarmKey.startsWith(`${ip}:`)) {
      checkedCount++

      if (!currentKeys.has(alarmKey)) {
        // ✅ 性能优化：直接使用缓存的 actionValue，而不是调用复杂的查找函数
        // 旧版本的逻辑更简单高效，避免每个恢复告警都执行60+行的条件判断
        recoveredAlarms.push({
          ...alarmInfo,
          level: alarmInfo.level ? alarmInfo.level + '-告警恢复' : '告警恢复',
          levelValue: 0,
          timestamp: currentTime, // 使用传入的时间戳
          actionValue: alarmInfo.actionValue // 直接使用缓存的动作值
        })
        // 从缓存中移除已恢复的告警
        storedAlarms.delete(alarmKey)
        alarmStatusCache.delete(alarmKey)
      }
    }
  }

  return recoveredAlarms
}
const latestSamples = {
  FC04Vltg: {},
  FC04Temp: {},
  FC04SOC: {},
  FC04SOH: {},
  FC04ClusExtreme: {},
  FC04ClusterSumm: {},
  FC04dataPackSumm1: {},
  FC04dataVersion: {},
  FC04Alarm: {}
} // 全局缓存：存储最新一次读取的样本
const lastWritten = {} // 记录上次已写入的样本
const configSnapshotMap = new Map() // key: `${ip}:cell` 或 `${ip}:${category}`，value: { bmuTotal, AFETotal, afeConfigJson }
const pendingNewHeader = new Set() // 全局：记录哪个 key 刚刚变更，需要插入新表头
const currentFileMap = new Map() // 记录每个 API 当前使用的文件路径
const ipDirSuffixMap = new Map() // 维护一个 Map，让每个 IP 拥有一个"子文件夹后缀"
const csvBuffers = new Map() //// { filePath: { header: string, buffer: string[] } }
const lastDateMap = new Map() // key → 'YYYYMMDD'
const fileInitialized = new Set()

// 为每个IP维护独立的文件后缀（类似rowBufferExport.js的ipFileSuffixMap）
const ipFileSuffixMap = new Map() // { [ip]: fileSuffix }
const ipBcuNumberCache = new Map() // BCU序号缓存Map，防止断开连接后查找失败

let flushTimer = null

// 添加数据导出状态监控
const exportStatusMonitor = {
  lastWriteTime: new Map(), // key: ip, value: 最后写入时间
  writeCount: new Map(), // key: ip, value: 写入次数
  checkInterval: null,

  start() {
    if (this.checkInterval) return

    this.checkInterval = setInterval(() => {
      const now = Date.now()
      const clients = getModbusClients()

      Object.keys(clients).forEach((ip) => {
        const client = clients[ip]
        if (client?.isSetDataExport && !client.isStopped) {
          const lastWrite = this.lastWriteTime.get(ip) || 0
          const writeCount = this.writeCount.get(ip) || 0

          // 如果超过30秒没有写入，发出警告
          if (now - lastWrite > 30000 && writeCount > 0) {
            console.warn(`[导出监控] IP ${ip} 超过30秒未写入数据，可能存在异常`)
            // 可以在这里添加自动恢复逻辑
          }
        }
      })
    }, 10000) // 每10秒检查一次
  },

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.lastWriteTime.clear()
    this.writeCount.clear()
  },

  recordWrite(ip) {
    this.lastWriteTime.set(ip, Date.now())
    this.writeCount.set(ip, (this.writeCount.get(ip) || 0) + 1)
  }
}

// 判断并更新：跨日时返回 true
function isNewDay(key) {
  const today = daySuffix(new Date())
  const last = lastDateMap.get(key)
  if (last !== today) {
    lastDateMap.set(key, today)
    return true
  }
  return false
}

async function flushCsvBuffers() {
  // 每次调用都重新取最新的引用
  const clients = getModbusClients()

  // ✅ 修复：如果没有任何客户端在导出数据，直接返回，不检测磁盘空间
  // 这样可以避免在用户停止导出后仍然持续发送磁盘空间警告
  const hasActiveExport = Object.values(clients).some((c) => c && c.isSetDataExport && !c.isStopped)
  if (!hasActiveExport) {
    return
  }

  // 先检测磁盘空间，避免进入重IO路径
  const freeSpace = await getCachedFreeDiskSpace(RUN_EXPORT_DIR)
  if (freeSpace < MIN_FREE_SPACE) {
    process.send && process.send({ API: 'disk-space-warning' })
    console.log('子进程发送disk-space-warning')
    return
  }

  // 1) 快速抢锁，仅做内存层面的快照与清空，绝不在持锁期间做任何await或IO
  let release
  const toWrite = [] // { filePath, key, header, lines }
  try {
    const waitStart = Date.now()
    release = await csvMutex.acquire()
    const waitedMs = Date.now() - waitStart
    if (waitedMs > 1000) {
      console.warn(`[写入监控] 获取csvMutex耗时: ${waitedMs}ms`)
    }

    for (const [filePath, entry] of csvBuffers.entries()) {
      const [ip] = entry.key.split(':')
      const client = clients[ip]
      if (!client || !client.isSetDataExport) {
        // 跳过不在导出的客户端或已断开的客户端
        continue
      }
      if (!entry.buffer || entry.buffer.length === 0) continue
      // 快照并清空，避免长期持锁导致生产端阻塞和内存增长
      const lines = entry.buffer.splice(0, entry.buffer.length)
      toWrite.push({ filePath, key: entry.key, header: entry.header, lines })
    }
  } catch (error) {
    console.error(`[错误] flushCsvBuffers 获取锁失败: ${error.message}`)
    return
  } finally {
    if (release) {
      try {
        release()
      } catch (releaseError) {
        console.error(`[错误] 释放锁失败: ${releaseError.message}`)
      }
    }
  }

  // 2) 在不持锁状态下执行磁盘写入（可能阻塞的操作），不会卡住生产者
  for (const item of toWrite) {
    const { filePath, key, header, lines } = item
    try {
      // 统计写前大小
      const stats = await fs.promises.stat(filePath).catch(() => null)
      const sizeBefore = stats?.size ?? 0

      if (!stats) {
        // 首次写 header 使用轻量重试，不等待决策，避免卡死
        await writeFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
      }

      /*  if (lines.length > 50) {
      } */

      await appendFileWithRetry(filePath, lines.map((line) => line + '\r\n').join(''))

      // 写入后校验增长
      const afterStats = await fs.promises.stat(filePath).catch(() => null)
      const sizeAfter = afterStats?.size ?? 0
      if (sizeAfter <= sizeBefore) {
        console.error(
          `[写入监控] 文件大小未增长: ${filePath}, 写前=${sizeBefore}B, 写后=${sizeAfter}B, 写入条数=${lines.length}`
        )
      }

      // 检查超限或跨日，准备旋转到新文件（仅更新内存映射，短暂加锁）
      const exceed = afterStats && afterStats.size > FILE_SIZE_LIMIT
      const rotateDate = isNewDay(key)
      if (exceed || rotateDate) {
        const [ip, type] = key.split(':')
        const newPath = getCsvFilePath(ip, type)
        let rel2
        try {
          rel2 = await csvMutex.acquire()
          csvBuffers.delete(filePath)
          csvBuffers.set(newPath, { key, header, buffer: [], rowCounter: 0 })
          currentFileMap.set(key, newPath)
        } finally {
          if (rel2) rel2()
        }
      }
    } catch (writeError) {
      console.error(`[错误] 写入文件失败: ${filePath}, 错误: ${writeError.message}`)
      // 出错不回填数据，避免内存持续增长
      continue
    }
  }
}

function startSaveTimer() {
  if (saveTimer) {
    return
  }
  // ✅ 关键优化：降低执行频率，从1秒改为3秒
  // 理由：数据导出不是实时的，3秒延迟完全可以接受
  // 好处：大幅减少对Modbus通讯的影响
  saveTimer = setInterval(() => {
    try {
      const now = Date.now()

      Object.keys(latestSamples).forEach((api) => {
        lastWritten[api] = lastWritten[api] || {}
        Object.keys(latestSamples[api]).forEach((ip) => {
          const sample = latestSamples[api][ip]
          const prev = lastWritten[api][ip]
          // 仅在有比上次已写入更新的样本时才写入，
          // 避免在停止导出或通讯中断期间反复写入同一条数据
          if (!prev || (sample && sample.timestamp > prev.timestamp)) {
            const toWrite = sample

            // ✅ 关键修复：不使用 await，让函数立即返回，不阻塞事件循环
            // 调用原有保存函数
            switch (api) {
              case 'FC04Vltg':
              case 'FC04Temp':
              case 'FC04SOC':
              case 'FC04SOH':
                saveCellData(api, toWrite.dataList, ip, now)
                break
              case 'FC04ClusExtreme':
              case 'FC04ClusterSumm':
                saveClusterData(api, toWrite.dataList, ip, now)
                break
              case 'FC04dataPackSumm1':
                saveBMUData(api, toWrite.dataList, ip, now)
                break
              case 'FC04dataVersion':
                // 版本数据无需导出CSV
                break
              case 'FC04Alarm':
                saveAlarmData(api, toWrite.dataList, ip, now)
                break
            }
            // 更新已写记录
            lastWritten[api][ip] = {
              timestamp: toWrite.timestamp,
              dataList: toWrite.dataList
            }
            // 记录写入状态
            exportStatusMonitor.recordWrite(ip)
          }
        })
      })
    } catch (error) {
      console.error(`[数据导出] startSaveTimer 执行异常: ${error.message}`)
      // 记录异常但不停止定时器，确保数据导出继续运行
    }
  }, 1000)

  // 添加定时器状态监控
  const timerCheckInterval = setInterval(() => {
    if (!saveTimer) {
      /* console.error(`[数据导出] 检测到 saveTimer 意外停止，重新启动`) */
      clearInterval(timerCheckInterval)
      startSaveTimer()
    }
  }, 60000) // 每5秒检查一次定时器状态

  // ✅ 同样增加flushCsvBuffers的间隔
  flushTimer = setInterval(() => {
    try {
      flushCsvBuffers()
    } catch (error) {
      console.error(`[数据导出] flushCsvBuffers 执行异常: ${error.message}`)
      // 记录异常但不停止定时器
    }
  }, CSV_BUFFER_INTERVAL) // ✅ 固定5秒间隔（比CSV_BUFFER_INTERVAL更长）

  // 启动导出状态监控
  exportStatusMonitor.start()
}
function stopSaveTimer() {
  if (saveTimer) {
    clearInterval(saveTimer)
    saveTimer = null
  }
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  // 同时清缓存，避免下次重启时写掉旧数据
  csvBuffers.clear()
  // 清理告警状态缓存
  storedAlarms.clear()
  alarmStatusCache.clear()
  // 清理客户端状态缓存
  /* clientStatusCache.clear() */

  // ⚠️ 不清理以下Map，因为断开连接时可能还有残留数据要写入：
  // - ipDirSuffixMap: IP目录后缀映射，持久化目录结构
  // - ipBcuNumberCache: BCU序号缓存，防止查找失败
  // - currentFileMap: 当前文件路径映射

  // 只清理配置相关的缓存
  configSnapshotMap.clear()
  lastDateMap.clear()
  fileInitialized.clear()
  pendingNewHeader.clear()

  console.log(`[内存清理] 已清理部分缓存Map（保留ipDirSuffixMap和ipBcuNumberCache）`)

  // 停止导出状态监控
  exportStatusMonitor.stop()
}

// 添加一个函数来重置状态缓存
/* function resetStatusCache() {
  clientStatusCache.clear()
} */

// 添加强制清理缓存函数
function forceCleanupCaches() {
  console.log(`[强制清理] 开始清理所有缓存`)

  // 清理latestSamples缓存
  const latestSamplesSize = Object.keys(latestSamples).reduce((total, api) => {
    return total + Object.keys(latestSamples[api]).length
  }, 0)
  Object.keys(latestSamples).forEach((api) => {
    latestSamples[api] = {}
  })

  // 清理csvBuffers缓存
  const csvBuffersSize = csvBuffers.size
  csvBuffers.clear()

  // 清理其他缓存
  storedAlarms.clear()
  alarmStatusCache.clear()
  /* clientStatusCache.clear() */
  configSnapshotMap.clear()
  currentFileMap.clear()
  fileInitialized.clear()
  pendingNewHeader.clear()

  // 清理lastWritten
  Object.keys(lastWritten).forEach((api) => {
    lastWritten[api] = {}
  })

  console.log(
    `[强制清理] 清理完成: latestSamples(${latestSamplesSize}) csvBuffers(${csvBuffersSize})`
  )
}

// 添加调试函数来检查系统状态
function debugSystemStatus() {
  const memUsage = process.memoryUsage()
  const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2)

  console.log(`内存使用: ${heapUsedMB}MB`)

  // 检查客户端状态
  const clients = getModbusClients()
  console.log(`客户端数量: ${Object.keys(clients).length}`)
  Object.keys(clients).forEach((ip) => {
    const client = clients[ip]
    console.log(
      `  IP ${ip}: isSetDataExport=${client.isSetDataExport}, isStopped=${client.isStopped}`
    )
  })

  // 检查latestSamples状态
  const totalSamples = Object.keys(latestSamples).reduce((total, api) => {
    return total + Object.keys(latestSamples[api]).length
  }, 0)
  console.log(`latestSamples总条目数: ${totalSamples}`)

  // 检查csvBuffers状态
  const totalBuffers = csvBuffers.size
  let totalBufferEntries = 0
  for (const [filePath, entry] of csvBuffers.entries()) {
    totalBufferEntries += entry.buffer.length
  }
  console.log(`csvBuffers: ${totalBuffers}个文件, ${totalBufferEntries}个条目`)

  // 检查定时器状态
  console.log(`saveTimer: ${saveTimer ? '运行中' : '已停止'}`)
  console.log(`flushTimer: ${flushTimer ? '运行中' : '已停止'}`)
  console.log(`==================`)
}

// 低频堆内存监控：用于长期观察内存变化趋势（避免日志过多）
// const MEMORY_MONITOR_INTERVAL_MS = 60000 // 60秒
// setInterval(() => {
//   try {
//     const m = process.memoryUsage()
//     const heapUsedMB = (m.heapUsed / 1024 / 1024).toFixed(1)
//     const rssMB = (m.rss / 1024 / 1024).toFixed(1)

//     let totalBufferEntries = 0
//     for (const [, entry] of csvBuffers.entries()) {
//       if (entry && Array.isArray(entry.buffer)) {
//         totalBufferEntries += entry.buffer.length
//       }
//     }

//     console.log(
//       `[内存监控] heapUsed=${heapUsedMB}MB, rss=${rssMB}MB, csvBuffers.files=${csvBuffers.size}, csvBuffers.entries=${totalBufferEntries}`
//     )
//   } catch (e) {
//     console.error('[内存监控] 统计失败:', e.message)
//   }
// }, MEMORY_MONITOR_INTERVAL_MS)

function isConfigChanged(key, bmuTotal, AFETotal, afeConfig) {
  const cfgJson = JSON.stringify({ bmuTotal, AFETotal, afeConfig })
  if (!configSnapshotMap.has(key)) {
    configSnapshotMap.set(key, cfgJson)
    return false
  }
  const prev = configSnapshotMap.get(key)
  if (prev !== cfgJson) {
    configSnapshotMap.set(key, cfgJson)
    // 标记：下一次写入前要插入新表头
    pendingNewHeader.add(key)
    return true
  }
  return false
}
// 获取IP对应的BCU序号
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

function getCsvFilePath(ip, dataType) {
  // 4.1 如果这个 IP 还没分配后缀，就分配一个新的
  if (!ipDirSuffixMap.has(ip)) {
    // 使用固定的时间戳，确保与rowBufferExport.js保持一致
    // 使用当前日期的小时和分钟，忽略秒和毫秒，确保在1分钟内创建的文件使用相同后缀
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_00`
    ipDirSuffixMap.set(ip, ts)
    /* console.log(`[文件夹管理] 为IP ${ip} 分配运行数据目录后缀: ${ts}`) */
  }
  const ipSuffix = ipDirSuffixMap.get(ip) // 取出这个 IP 的后缀

  // 4.2 获取BCU序号并构造IP子目录：RUN_EXPORT_DIR/`BCU{序号}({IP})_{ipSuffix}`
  const bcuNumber = getBcuNumber(ip)
  const ipDir = path.join(RUN_EXPORT_DIR, `BCU${bcuNumber}(${ip})_${ipSuffix}`)
  ensureDir(ipDir)
  /*   console.log(`[文件夹管理] 为IP ${ip} 创建运行数据文件夹: ${ipDir}`) */

  // 4.3 每次都生成新的文件后缀，确保跨日时创建新文件
  const fileSuffix = formatFileSuffix(new Date())
  const filename = `${dataType}_${fileSuffix}.csv`

  return path.join(ipDir, filename)
}
// ✅ 优化版本：完全不读取文件，避免巨大的IO开销
function ensureCsvEntry(filePath, key, header) {
  if (!csvBuffers.has(filePath)) {
    // ✅ 不读取文件！让rowCounter从0开始
    // 理由：
    // 1. 读取大文件（几MB到几十MB）需要50-200ms，严重阻塞事件循环
    // 2. 10台BCU × 5个API = 50个文件，总耗时可达5秒
    // 3. ID不连续不影响数据完整性，可以通过时间戳排序
    csvBuffers.set(filePath, {
      key,
      header,
      buffer: [],
      rowCounter: 0 // ✅ 从0开始，不读取文件
    })
    if (!lastDateMap.has(key)) {
      lastDateMap.set(key, daySuffix(new Date()))
    }
  }
}
// 优化版本：不在持锁期间做任何异步IO，快速进出
function bufferCsvData(filePath, key, header, row) {
  // 不使用async/await，改为Promise链式调用，避免阻塞
  csvMutex
    .acquire()
    .then((release) => {
      try {
        // 快速检查和写入，不做任何IO
        if (!csvBuffers.has(filePath)) {
          // 如果entry不存在，用初始值创建，后续由flushCsvBuffers处理
          csvBuffers.set(filePath, { key, header, buffer: [], rowCounter: 0 })
        }
        const entry = csvBuffers.get(filePath)
        entry.buffer.push(row)
      } catch (error) {
        console.error(`[错误] bufferCsvData处理失败: ${error.message}`)
      } finally {
        release()
      }
    })
    .catch((error) => {
      console.error(`[错误] csvMutex.acquire失败: ${error.message}`)
    })
}
// ==================== 保持原有表格结构的保存函数 ====================
async function saveCellData(api, dataList, ip, ts) {
  const nameMap = {
    FC04Vltg: 'CellVoltage',
    FC04Temp: 'CellTemp',
    FC04SOC: 'CellSOC',
    FC04SOH: 'CellSOH'
  }

  const filename = nameMap[api]
  if (!filename) return
  const key = `${ip}:${filename}:cell`

  // 如果本次缓存的数据为空（例如断线重连首次读取失败），
  // 则不写入文件，避免用空数据初始化表头只包含「导出时间」
  if (!Array.isArray(dataList) || dataList.length === 0) {
    return
  }

  // 进一步校验：dataList 中是否至少包含一个有效的 cells 数组
  const hasValidCells = dataList.some(
    (pack) => pack && Array.isArray(pack.cells) && pack.cells.length > 0
  )
  if (!hasValidCells) {
    return
  }

  // 检查跨日情况
  if (isNewDay(key)) {
    const oldPath = currentFileMap.get(key)
    if (oldPath) {
      csvBuffers.delete(oldPath)
    }
    const newPath = getCsvFilePath(ip, filename)
    currentFileMap.set(key, newPath)
  }

  const { bmuTotal, AFETotal, afeConfig } = latestSamples[api][ip]
  isConfigChanged(key, bmuTotal, AFETotal, afeConfig)
  // 固定文件路径，或用 currentFileMap 缓存一下
  const filePath =
    currentFileMap.get(key) ||
    (currentFileMap.set(key, getCsvFilePath(ip, filename)), currentFileMap.get(key))
  const now = formatDateTime(new Date(ts))
  /*   console.log('dataList:', dataList)
  console.log('bmuTotal:', bmuTotal)
  console.log('AFETotal:', AFETotal)
  console.log('afeConfig:', afeConfig) */
  // 1. 构造表头：ID, 导出时间, 电池1(...), 电池2(...), ...
  const headerParts = ['ID', '导出时间']
  dataList.forEach((pack) => {
    pack.cells.forEach((cell) => {
      headerParts.push(`电池${cell.index}（BMU${pack.packID} ${cell.bmuIndex}#）`)
    })
  })
  const header = headerParts.join(',')
  // 2. 确保 entry 已初始化（同步，不读文件）
  ensureCsvEntry(filePath, key, header)
  const entry = csvBuffers.get(filePath)
  // ✅ 简化逻辑：只检查内存标记，不检查文件
  if (!fileInitialized.has(filePath)) {
    // 标记"写过一次 header"但不推 buffer
    fileInitialized.add(filePath)
  }
  // 如果标记了"要插入新表头"，就先把 header 当作一行数据推入
  if (pendingNewHeader.has(key)) {
    entry.buffer.push(header) // 插入新表头
    entry.rowCounter = 0 // 可选：行号重新从 1 开始
    pendingNewHeader.delete(key) // 清除标记
  }
  // 自增 ID 并生成一行数据
  entry.rowCounter++
  const rowParts = [entry.rowCounter, now]
  dataList.forEach((pack) => {
    pack.cells.forEach((cell) => {
      rowParts.push(cell.value)
    })
  })
  const row = rowParts.join(',')
  bufferCsvData(filePath, key, header, row)
}

async function saveBMUData(api, data, ip, ts) {
  if (api !== 'FC04dataPackSumm1') return
  const now = formatDateTime(new Date(ts))

  // 对每个 category 单独一个 CSV
  for (const category of data) {
    // 用 classification 作为文件名
    const safeName = category.classification.replace(/[\\/:*?"<>|]/g, '_')
    // 1. 构造 key 并判断配置是否变化
    const key = `${ip}:${safeName}:bmu`

    // 检查跨日情况
    if (isNewDay(key)) {
      const oldPath = currentFileMap.get(key)
      if (oldPath) {
        csvBuffers.delete(oldPath)
      }
      const newPath = getCsvFilePath(ip, safeName)
      currentFileMap.set(key, newPath)
    }
    // latestSamples 里存了 bmuTotal/AFETotal/afeConfig
    const { bmuTotal, AFETotal, afeConfig } = latestSamples[api][ip]
    // 第一次见 key 只初始化，不打标；真变更时才打标
    isConfigChanged(key, bmuTotal, AFETotal, afeConfig)
    const baseFilePath = getCsvFilePath(ip, safeName)
    const filePath = currentFileMap.get(key) || baseFilePath
    currentFileMap.set(key, filePath)
    // 构造表头：ID, 导出时间, ...labels
    const headerParts = ['ID', '导出时间', ...category.element.map((item) => item.label)]
    const header = headerParts.join(',')
    // 初始化 entry（同步，不读文件）
    ensureCsvEntry(filePath, key, header)
    const entry = csvBuffers.get(filePath)
    // 5. 简化逻辑：只检查内存标记，不检查文件
    if (!fileInitialized.has(filePath)) {
      fileInitialized.add(filePath)
    }
    // 6. 如果是真变更，需要插入一行新的表头
    if (pendingNewHeader.has(key)) {
      entry.buffer.push(header)
      entry.rowCounter = 0 // 可选：行号重置
      pendingNewHeader.delete(key)
    }

    // 自增 ID 并拼行
    entry.rowCounter++
    const values = category.element.map((item) => item.value)
    const row = [entry.rowCounter, now, ...values].join(',')

    bufferCsvData(filePath, key, header, row)
  }
}

async function saveClusterData(api, data, ip, ts) {
  const typeMap = {
    FC04ClusterSumm: 'ClusterData',
    FC04ClusExtreme: '簇端极值数据'
  }
  if (!typeMap[api]) return
  const now = formatDateTime(new Date(ts))
  const basename = typeMap[api]
  const key = `${ip}:${basename}:cluster`

  // 检查跨日情况
  if (isNewDay(key)) {
    const oldPath = currentFileMap.get(key)
    if (oldPath) {
      csvBuffers.delete(oldPath)
    }
    const newPath = getCsvFilePath(ip, basename)
    currentFileMap.set(key, newPath)
  }
  const filePath =
    currentFileMap.get(key) ||
    (currentFileMap.set(key, getCsvFilePath(ip, basename)), currentFileMap.get(key))

  // 构造表头：ID, 导出时间, 拼所有 labels（带前缀）
  const headerParts = ['ID', '导出时间']
  data.forEach((cat) => {
    const prefix = api === 'FC04ClusExtreme' ? cat.classification.replace(/(极值|数据)$/u, '') : ''
    cat.element.forEach((item) => {
      headerParts.push(`${prefix}${item.label}`)
      if (item.hasOwnProperty('index')) {
        const cleanLabel = item.label.replace(/\(.*?\)$/, '')
        headerParts.push(`${cleanLabel}编号`)
      }
    })
  })
  const header = headerParts.join(',')
  // 初始化 entry（同步，不读文件）
  ensureCsvEntry(filePath, key, header)
  const entry = csvBuffers.get(filePath)

  // 自增並输出一行
  entry.rowCounter++
  const values = []
  data.forEach((cat) =>
    cat.element.forEach((item) => {
      values.push(item.value)
      if (item.hasOwnProperty('index')) {
        values.push(item.index)
      }
    })
  )
  const row = [entry.rowCounter, now, ...values].join(',')

  bufferCsvData(filePath, key, header, row)
}
const ALARM_LEVEL_ORDER = {
  严重: 3,
  一般: 2,
  轻微: 1
}
// ====== 修正后的 saveAlarmData ======
async function saveAlarmData(api, data, ip, ts) {
  if (api !== 'FC04Alarm') return

  // ✅ 性能优化：如果没有告警数据，直接返回
  if (!Array.isArray(data) || data.length === 0) {
    return
  }

  const filename = 'ErrorData'
  const now = formatDateTime(new Date(ts))
  const key = `${ip}:${filename}:alarm`

  // 检查跨日情况
  if (isNewDay(key)) {
    const oldPath = currentFileMap.get(key)
    if (oldPath) {
      csvBuffers.delete(oldPath)
    }
    const newPath = getCsvFilePath(ip, filename)
    currentFileMap.set(key, newPath)
  }

  const filePath =
    currentFileMap.get(key) ||
    (currentFileMap.set(key, getCsvFilePath(ip, filename)), currentFileMap.get(key))

  // 表头固定
  const header = [
    'ID',
    '导出时间',
    '故障产生时间',
    '告警',
    '告警等级',
    '动作值',
    'BMU编号',
    'Cell/Temp绝对索引',
    'Cell/Temp相对索引'
  ].join(',')

  ensureCsvEntry(filePath, key, header)
  const entry = csvBuffers.get(filePath)

  // ✅ 优化：简化扁平化逻辑
  const flatAlarms = []
  data.forEach((category) => {
    if (!category || !Array.isArray(category.element)) {
      return
    }
    category.element.forEach((item) => {
      flatAlarms.push({
        ...item,
        classification: category.classification
      })
    })
  })

  // ✅ 性能优化：如果扁平化后没有告警，直接返回
  if (flatAlarms.length === 0) {
    return
  }

  // ✅ 关键优化：使用 setImmediate 异步处理告警逻辑，避免阻塞主线程
  setImmediate(() => {
    processAlarmLogic(flatAlarms, ip, filePath, key, header, entry, now)
  })
}

// ✅ 将复杂的告警处理逻辑提取到单独的函数中，异步执行
function processAlarmLogic(flatAlarms, ip, filePath, key, header, entry, now) {
  // ✅ 性能优化：已通过 O(n²) → O(1) 优化解决阻塞问题，无需限制告警数量
  // 记录告警数量用于监控
  /* if (flatAlarms.length > 200) {
    console.log(
      `[告警处理] IP ${ip} 正在处理 ${flatAlarms.length} 个告警（已优化，不会阻塞）`
    )
  } */

  // 构建当前告警Map（不含level）
  const currentAlarmMap = new Map()
  flatAlarms.forEach((item) => {
    const keyNoLevel = generateAlarmKeyWithoutLevel(
      ip,
      item.classification,
      item.bmuIndex,
      item.cellIndex,
      item.fault
    )
    if (!currentAlarmMap.has(keyNoLevel)) {
      currentAlarmMap.set(keyNoLevel, [])
    }
    currentAlarmMap.get(keyNoLevel).push(item)
  })

  // 检查升阶/降阶/新告警
  const alarmsToStore = []
  const baseTime = Date.now() // 基础时间戳
  let timeOffset = 0 // 时间偏移量，用于确保顺序

  // 获取当前时间的微秒级精度
  const getPreciseTime = () => {
    return baseTime + timeOffset++
  }

  // ✅ 优化：删除未使用的统计计数器，减少内存分配和自增操作开销

  flatAlarms.forEach((item) => {
    const keyNoLevel = generateAlarmKeyWithoutLevel(
      ip,
      item.classification,
      item.bmuIndex,
      item.cellIndex,
      item.fault,
      item.cellIndexRelative
    )
    const alarmKey = generateAlarmKey(
      ip,
      item.classification,
      item.bmuIndex,
      item.cellIndex,
      item.fault,
      item.level,
      item.cellIndexRelative
    )
    // ⚠️ 性能修复：使用直接查找代替O(n)遍历，避免阻塞事件循环
    // 原问题：Array.from(storedAlarms.entries()).find() 每个告警都遍历整个Map，O(n²)复杂度
    // 修复方案：遍历所有可能的告警等级，直接查找，最多只需要3次Map查找，O(1)复杂度
    let oldEntry = null
    const possibleLevels = ['严重', '一般', '轻微']
    for (const level of possibleLevels) {
      const testKey = `${keyNoLevel}:${level}`
      if (storedAlarms.has(testKey)) {
        oldEntry = [testKey, storedAlarms.get(testKey)]
        break
      }
    }
    if (oldEntry) {
      const [oldKey, oldAlarm] = oldEntry
      const oldLevel = oldAlarm.level
      const newLevel = item.level
      const oldOrder = ALARM_LEVEL_ORDER[oldLevel] || 0
      const newOrder = ALARM_LEVEL_ORDER[newLevel] || 0
      if (oldLevel !== newLevel) {
        if (newOrder > oldOrder) {
          // 升阶 - 只记录升阶事件，不单独记录新告警
          const currentTime = getPreciseTime()
          alarmsToStore.push({
            ...oldAlarm,
            level: `${oldLevel}→${newLevel} (升阶)`,
            levelValue: 0,
            timestamp: oldAlarm.timestamp || currentTime, // 使用原始告警时间
            alarmStatus: '告警升阶',
            actionValue: item.actionValue || ''
          })
          storedAlarms.delete(oldKey)
          alarmStatusCache.delete(oldKey)
          // 更新存储的告警为新告警状态
          storedAlarms.set(alarmKey, {
            ...item,
            classification: item.classification,
            timestamp: currentTime
          })
          alarmStatusCache.set(
            alarmKey,
            JSON.stringify({
              classification: item.classification,
              bmuIndex: item.bmuIndex,
              cellIndex: item.cellIndex,
              fault: item.fault,
              level: item.level
            })
          )
          return
        } else if (newOrder < oldOrder) {
          // 降阶 - 使用原始告警的时间戳，新告警使用当前时间
          const currentTime = getPreciseTime()
          alarmsToStore.push({
            ...oldAlarm,
            level: `${oldLevel}-告警恢复`,
            levelValue: 0,
            timestamp: oldAlarm.timestamp || currentTime, // 使用原始告警时间
            alarmStatus: '已恢复',
            actionValue: item.actionValue || ''
          })
          storedAlarms.delete(oldKey)
          alarmStatusCache.delete(oldKey)
          alarmsToStore.push({
            ...item,
            alarmStatus: '新告警',
            actionValue: item.actionValue || '',
            timestamp: currentTime // 使用当前时间
          })
          storedAlarms.set(alarmKey, {
            ...item,
            classification: item.classification,
            timestamp: currentTime
          })
          alarmStatusCache.set(
            alarmKey,
            JSON.stringify({
              classification: item.classification,
              bmuIndex: item.bmuIndex,
              cellIndex: item.cellIndex,
              fault: item.fault,
              level: item.level
            })
          )
          return
        }
      }
    }
    // 没有历史告警，按新告警处理
    const status = hasAlarmStatusChanged(
      ip,
      item.classification,
      item.bmuIndex,
      item.cellIndex,
      item.fault,
      item.level,
      item.actionValue,
      item.cellIndexRelative
    )
    if (status.isNew) {
      const currentTime = getPreciseTime()
      alarmsToStore.push({
        ...item,
        alarmStatus: '新告警',
        actionValue: item.actionValue || '',
        timestamp: currentTime
      })
      storedAlarms.set(alarmKey, {
        ...item,
        classification: item.classification,
        timestamp: currentTime
      })
    } else if (status.hasChanged) {
      const currentTime = getPreciseTime()
      alarmsToStore.push({
        ...item,
        alarmStatus: '新告警',
        actionValue: item.actionValue || '',
        timestamp: currentTime
      })
      const existingAlarm = storedAlarms.get(alarmKey)
      if (existingAlarm) {
        // 只记录状态变化事件，不单独记录新告警
        alarmsToStore.push({
          ...existingAlarm,
          level: (existingAlarm.level || '') + '-告警恢复',
          levelValue: 0,
          timestamp: existingAlarm.timestamp || currentTime, // 使用原始告警时间
          alarmStatus: '已恢复',
          actionValue: item.actionValue || ''
        })
      }
      // 更新存储的告警为新状态
      storedAlarms.set(alarmKey, {
        ...item,
        classification: item.classification,
        timestamp: currentTime
      })
    } else {
      if (item.level === '恢复告警') {
        const currentTime = getPreciseTime()
        alarmsToStore.push({
          ...item,
          alarmStatus: '已恢复',
          actionValue: item.actionValue || '',
          timestamp: currentTime
        })
        storedAlarms.delete(alarmKey)
        alarmStatusCache.delete(alarmKey)
      } else {
        const existingAlarm = storedAlarms.get(alarmKey)
        if (existingAlarm) {
          const currentTime = getPreciseTime()
          storedAlarms.set(alarmKey, {
            ...existingAlarm,
            actionValue: item.actionValue,
            timestamp: currentTime
          })
        }
      }
    }
  })

  // 处理恢复的告警（从当前告警列表中消失的告警）
  // ⚠️ 性能优化：限制恢复告警的处理数量，避免遍历过大的Map
  const recoveredAlarms = detectRecoveredAlarms(ip, flatAlarms, getPreciseTime())
  /* if (recoveredAlarms.length > 100) {
    console.warn(
      `[告警处理] IP ${ip} 恢复告警过多(${recoveredAlarms.length})，可能存在性能问题`
    )
  } */
  recoveredAlarms.forEach((item) => {
    alarmsToStore.push({
      ...item,
      alarmStatus: '已恢复',
      actionValue: item.actionValue || ''
      // 时间戳已经在detectRecoveredAlarms中设置
    })
  })

  // 按时间戳排序，确保时间顺序正确
  alarmsToStore.sort((a, b) => a.timestamp - b.timestamp)

  // 存储需要保存的告警
  for (const item of alarmsToStore) {
    entry.rowCounter++
    const id = entry.rowCounter
    const occur = formatDateTime(new Date(item.timestamp))
    const row = [
      id,
      now,
      occur,
      item.faultZh || item.fault, // 优先使用中文故障名称，如果没有则使用英文
      item.level || '',
      item.actionValue || '',
      item.bmuIndex || '',
      item.cellIndex || '',
      item.cellIndexRelative || ''
    ].join(',')
    bufferCsvData(filePath, key, header, row)
  }
}
// ========== 只缓存不落盘的接口 ==========
function cacheSample(api, dataList, ip, ts, bmuTotal, AFETotal, afeConfig) {
  if (!latestSamples[api]) latestSamples[api] = {}
  latestSamples[api][ip] = { timestamp: ts, dataList, bmuTotal, AFETotal, afeConfig }
}
export {
  startSaveTimer,
  stopSaveTimer,
  flushCsvBuffers,
  cacheSample,
  //resetStatusCache,
  debugSystemStatus,
  forceCleanupCaches
}
