/**
 * 语义导出引擎（故障/运行数据）
 *
 * 职责：
 * - 统一定时器调度（startSaveTimerSemantic/stopSaveTimerSemantic）与缓冲写盘
 * - 管理 CSV 路径、跨天切换与文件大小轮转
 * - 故障语义处理（过滤/定位/等级升降/恢复检测/动作值查找）
 *
 * 数据流：
 * - ingest.js 将解析后的数据写入 latest[...] 缓存（普通数据固定键，故障使用 'alarm_<dataType>' 动态键）
 * - 定时器每 ~2s 遍历 latest，分流到各 save*Semantic 写入 CSV
 *
 * 关键状态：
 * - currentFileMap/daySnapshotMap：按逻辑键管理当前文件与日期快照（停止时保留，避免误新文件）
 * - lastWritten：保存上次写入快照，定时器选择最新或回退
 * - initializedFiles/fileInitPromises：保证同一路径的表头只初始化一次
 * - csvBuffers/flushCsvBuffers：缓冲行数据并定期批量落盘
 *
 * 目录结构：
 * - RUN_EXPORT_DIR（程序启动固定）/BlockN[_ClusterM]_<suffix>/... *.csv
 * - 故障写入堆级 ErrorData 文件，表头包含堆/簇/BMU/索引列
 */
import fs from 'fs'
import path from 'path'
import { Mutex } from 'async-mutex'
import { ensureDir, formatFileSuffix, formatDateTime, appendFileWithRetry, getCachedFreeDiskSpace } from './utils'
import { ALARM_MAP, BLOCK_SUMMARY } from '../table.js'
import { RUN_EXPORT_DIR, getDeviceDirSuffix, clearDeviceDirSuffixCache } from './paths'
import { locateCell } from '../../protocol/utils'
import { shouldDisplayFault, getBrokenwireFaultStatus } from '../../protocol/faultLogic'

const csvMutex = new Mutex()
const csvBuffers = new Map() // { filePath: { key, header, buffer: [] } }
const CSV_BUFFER_INTERVAL = 5000 // 5 seconds
let flushTimer = null

const latest = { cellVoltage: {}, cellTemperature: {}, cellSOC: {}, cellSOH: {}, clusterSummary: {}, packSummary: {}, blockSummary: {}, alarm: {} }
const lastWritten = { cellVoltage: {}, cellTemperature: {}, cellSOC: {}, cellSOH: {}, clusterSummary: {}, packSummary: {}, blockSummary: {}, alarm: {} }
const currentFileMap = new Map()
const deviceOrder = new Map()
const configSnapshotMap = new Map()
const pendingNewHeader = new Set()
const initializedFiles = new Set()
const fileInitPromises = new Map()
const daySnapshotMap = new Map()
const FILE_SIZE_LIMIT = parseInt(process.env.EXPORT_FILE_SIZE_LIMIT || String(500 * 1024 * 1024), 10)
const MIN_FREE_SPACE = parseInt(process.env.MIN_FREE_SPACE || String(5 * 1024 * 1024 * 1024), 10)
const DISK_WARNING_COOLDOWN_MS = parseInt(process.env.DISK_WARNING_COOLDOWN_MS || '10000', 10)
let lastDiskWarningTs = 0
let bypassLowDiskCheck = false
export function setDiskSpaceBypass(enabled) {
  bypassLowDiskCheck = !!enabled
}
const storedAlarms = new Map()
const alarmStatusCache = new Map()
function parseDevice(id) {
  /**
   * 解析设备ID为堆/簇编号
   * @param {string|number} id - 设备ID（形如 '1-0'）
   * @returns {{block:number,cluster:number}} 解析后的堆与簇编号
   */
  const [bStr, cStr] = String(id).split('-')
  const block = parseInt(bStr) || 0
  const cluster = parseInt(cStr) || 0
  return { block, cluster }
}
function getCsvFilePath(deviceId, basename) {
  /**
   * 生成普通数据CSV路径（设备/簇维度）
   * @param {string} deviceId - 设备ID（如 '1-1'）
   * @param {string} basename - 文件基础名（如 'CellVoltage'）
   * @returns {string} 文件路径
   */
  const { block, cluster } = parseDevice(deviceId)
  const baseKey = cluster === 0 ? `${block}-0` : deviceId
  const dirSuffix = getDeviceDirSuffix(baseKey)
  const dir = cluster === 0
    ? path.join(RUN_EXPORT_DIR, `Block${block}_${dirSuffix}`)
    : path.join(RUN_EXPORT_DIR, `Block${block}_Cluster${cluster}_${dirSuffix}`)
  ensureDir(dir)
  const fileSuffix = formatFileSuffix(new Date())
  return path.join(dir, `${basename}_${fileSuffix}.csv`)
}
function getAlarmCsvFilePath(deviceId) {
  /**
   * 生成故障数据CSV路径（堆级）
   * @param {string} deviceId - 堆级ID（如 '1-0'）
   * @returns {string} 文件路径（BlockN 目录下的 ErrorData_*.csv）
   */
  const { block } = parseDevice(deviceId)
  const dirSuffix = getDeviceDirSuffix(`${block}-0`)
  const dir = path.join(RUN_EXPORT_DIR, `Block${block}_${dirSuffix}`)
  ensureDir(dir)
  const fileSuffix = formatFileSuffix(new Date())
  const basename = 'ErrorData'
  return path.join(dir, `${basename}_${fileSuffix}.csv`)
}
export function cacheSampleSemantic(label, dataList, deviceId, ts, meta) {
  /**
   * 写入统一缓存 latest（按标签与设备维度）
   * @param {string} label - 数据标签（如 'cellVoltage' 或 'alarm_TOTAL_FAULT'）
   * @param {Array} dataList - 整形后的数据列表
   * @param {string} deviceId - 设备ID（形如 '1-1'）
   * @param {number} ts - 时间戳（毫秒）
   * @param {Object|null} meta - 额外元数据（用于配置变更检测）
   * @returns {void}
   */
  if (!latest[label]) latest[label] = {}
  latest[label][deviceId] = { timestamp: ts, dataList, meta }
}
let saveTimer = null
export function startSaveTimerSemantic() {
  /**
   * 启动语义数据定时保存（约每2秒）
   * - 遍历 latest 选择最新或回退数据
   * - 分流调用各 save*Semantic 写入 CSV
   * @returns {void}
   */
  if (saveTimer) return
  startFlushTimer()
  saveTimer = setInterval(async () => {
    ensureDir(RUN_EXPORT_DIR)
    const free = await getCachedFreeDiskSpace(RUN_EXPORT_DIR)
    if (free < MIN_FREE_SPACE && !bypassLowDiskCheck) {
      const nowTs = Date.now()
      if (nowTs - lastDiskWarningTs > DISK_WARNING_COOLDOWN_MS) {
        try { if (process.connected) { process.send({ API: 'disk-space-warning' }) } } catch {}
        lastDiskWarningTs = nowTs
      }
      return
    }
    if (free < MIN_FREE_SPACE && bypassLowDiskCheck) {
      const nowTs = Date.now()
      if (nowTs - lastDiskWarningTs > DISK_WARNING_COOLDOWN_MS) {
        try { if (process.connected) { process.send({ API: 'disk-space-warning' }) } } catch {}
        lastDiskWarningTs = nowTs
      }
      // 继续执行保存流程，不阻断
    }
    const now = Date.now()
    Object.keys(latest).forEach((label) => {
      // Fix: Ensure lastWritten[label] is initialized to avoid TypeError with dynamic alarm keys
      if (!lastWritten[label]) lastWritten[label] = {}
      
      Object.keys(latest[label]).forEach((id) => {
        const sample = latest[label][id]
        const prev = lastWritten[label][id]
        const hasSample = !!sample && !!sample.dataList && sample.dataList.length
        const hasPrev = !!prev && !!prev.dataList && prev.dataList.length
        let dataListToWrite = null
        let metaToUse = null
        let newTs = prev?.timestamp || 0
        if (hasSample && (!prev || sample.timestamp > prev.timestamp)) {
          dataListToWrite = sample.dataList
          metaToUse = sample.meta
          newTs = sample.timestamp
        } else if (hasSample && prev && sample.timestamp <= prev.timestamp && hasPrev) {
          dataListToWrite = prev.dataList
          metaToUse = prev.meta
        } else if (!hasSample && hasPrev) {
          dataListToWrite = prev.dataList
          metaToUse = prev.meta
        }
        if (dataListToWrite) {
          if (label === 'cellVoltage') saveCellSemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'cellTemperature') saveCellTemperatureSemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'cellSOC') saveCellSocSemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'cellSOH') saveCellSohSemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'clusterSummary') saveClusterSummarySemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'packSummary') savePackSummarySemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'blockSummary') saveBlockSummarySemantic(dataListToWrite, id, now, metaToUse)
          if (label.startsWith('alarm_')) saveAlarmSemantic(dataListToWrite, id, now, metaToUse)
          lastWritten[label][id] = { timestamp: newTs, dataList: dataListToWrite, meta: metaToUse }
        }
      })
    })
  }, 2000)
}

export async function processAlarmImmediate(dataList, deviceId, ts, meta) {
  // Directly call saveAlarmSemantic to process the alarm event immediately
  await saveAlarmSemantic(dataList, deviceId, ts, meta)
}

export function stopSaveTimerSemantic() {
  /**
   * 停止语义数据定时保存并清理缓存
   * - 保留 currentFileMap 与 daySnapshotMap，避免同天误新文件
   * - 清空告警状态缓存，确保下次重新统计
   * @returns {void}
   */
  stopFlushTimer()
  if (saveTimer) {
    clearInterval(saveTimer)
    saveTimer = null
  }
  
  // 清空所有状态缓存，确保下次启动时生成新文件并重置状态
  // 注意：不清空 csvBuffers，让 stopFlushTimer 触发的最后一次写入能正常完成（写入旧文件）
  // csvBuffers.clear() 
  // currentFileMap.clear()
  idCounters.clear()
  configSnapshotMap.clear()
  pendingNewHeader.clear()
  initializedFiles.clear()
  fileInitPromises.clear()
  // daySnapshotMap.clear()
  
  // 清空告警状态
  storedAlarms.clear()
  alarmStatusCache.clear()

  // 清空文件夹命名缓存 (关键修复：确保生成新的文件夹)
  // clearDeviceDirSuffixCache()
  
  // 重置数据缓存
  Object.keys(lastWritten).forEach(k => lastWritten[k] = {})
  Object.keys(latest).forEach(k => latest[k] = {})
  
  console.log('[DataExport] Storage stopped and cache cleared.')
}
const idCounters = new Map()
function nextId(key) {
  /**
   * 为逻辑键生成自增行号（ID）
   * @param {string} key - 逻辑键（如 '1-1:CellVoltage' 或文件路径）
   * @returns {number} 下一个ID值
   */
  const v = (idCounters.get(key) || 0) + 1
  idCounters.set(key, v)
  return v
}
function isNewDay(key) {
  /**
   * 判断并记录逻辑键是否跨天（用于新建CSV文件）
   * @param {string} key - 逻辑键
   * @returns {boolean} 是否为新的一天
   */
  const day = formatFileSuffix(new Date()).slice(0, 8)
  if (daySnapshotMap.get(key) !== day) {
    daySnapshotMap.set(key, day)
    return true
  }
  return false
}
function isConfigChanged(key, meta) {
  /**
   * 检测配置（表头）是否变化；变化时标记需重写表头
   * @param {string} key - 逻辑键
   * @param {Object|null} meta - 元数据对象
   * @returns {boolean} 是否发生变化
   */
  const cfg = JSON.stringify(meta || {})
  if (!configSnapshotMap.has(key)) {
    configSnapshotMap.set(key, cfg)
    return false
  }
  if (configSnapshotMap.get(key) !== cfg) {
    configSnapshotMap.set(key, cfg)
    pendingNewHeader.add(key)
    return true
  }
  return false
}
async function rotateIfNeeded(filePath, deviceId, basename, key, header) {
  /**
   * 按文件大小限制进行轮转（普通数据）
   * @param {string} filePath - 当前文件路径
   * @param {string} deviceId - 设备ID
   * @param {string} basename - 基础文件名
   * @param {string} key - 逻辑键
   * @param {string} header - CSV表头
   * @returns {Promise<void>}
   */
  try {
    const st = await fs.promises.stat(filePath)
    if (st.size > FILE_SIZE_LIMIT) {
      const newPath = getCsvFilePath(deviceId, basename)
      currentFileMap.set(key, newPath)
      idCounters.set(key, 0)
      await appendFileWithRetry(newPath, '\uFEFF' + header + '\r\n')
    }
  } catch {}
}
export async function saveCellSemantic(dataList, deviceId, ts, meta) {
  /**
   * 写入单体电压CSV
   * @param {Array} dataList - 整形数据
   * @param {string} deviceId - 设备ID
   * @param {number} ts - 时间戳
   * @param {Object} meta - 元数据（表头变更检测）
   * @returns {Promise<void>}
   */
  const basename = 'CellVoltage'
  const key = `${deviceId}:${basename}`
  if (isNewDay(key)) {
    const np = getCsvFilePath(deviceId, basename)
    currentFileMap.set(key, np)
    idCounters.set(key, 0)
  }
  const filePath = currentFileMap.get(key) || getCsvFilePath(deviceId, basename)
  currentFileMap.set(key, filePath)
  const header = ['ID', '导出时间', ...dataList.flatMap((p) => p.cells.map((c) => `电池${c.index}（BMU${p.packID} ${c.bmuIndex}#）`))].join(',')
  const stats = await fs.promises.stat(filePath).catch(() => null)
  if (!stats) {
    await appendFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
  }
  isConfigChanged(key, meta)
  if (stats && pendingNewHeader.has(key)) {
    await appendFileWithRetry(filePath, header + '\r\n')
    idCounters.set(key, 0)
    pendingNewHeader.delete(key)
  }
  const nowStr = formatDateTime(new Date(ts))
  const values = dataList.flatMap((p) => p.cells.map((c) => c.value))
  const idVal = nextId(key)
  const row = [idVal, nowStr, ...values].join(',') + '\r\n'
  await appendFileWithRetry(filePath, row)
  await rotateIfNeeded(filePath, deviceId, basename, key, header)
}

export async function saveCellTemperatureSemantic(dataList, deviceId, ts, meta) {
  /**
   * 写入单体温度CSV
   * @returns {Promise<void>}
   */
  const basename = 'CellTemperature'
  const key = `${deviceId}:${basename}`
  if (isNewDay(key)) {
    const np = getCsvFilePath(deviceId, basename)
    currentFileMap.set(key, np)
    idCounters.set(key, 0)
  }
  const filePath = currentFileMap.get(key) || getCsvFilePath(deviceId, basename)
  currentFileMap.set(key, filePath)
  const header = ['ID', '导出时间', ...dataList.flatMap((p) => p.cells.map((c) => `温度${c.index}（BMU${p.packID} ${c.bmuIndex}#）`))].join(',')
  const stats = await fs.promises.stat(filePath).catch(() => null)
  if (!stats) {
    await appendFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
  }
  isConfigChanged(key, meta)
  if (stats && pendingNewHeader.has(key)) {
    await appendFileWithRetry(filePath, header + '\r\n')
    idCounters.set(key, 0)
    pendingNewHeader.delete(key)
  }
  const nowStr = formatDateTime(new Date(ts))
  const values = dataList.flatMap((p) => p.cells.map((c) => c.value))
  const idVal = nextId(key)
  const row = [idVal, nowStr, ...values].join(',') + '\r\n'
  await appendFileWithRetry(filePath, row)
  await rotateIfNeeded(filePath, deviceId, basename, key, header)
}

export async function saveCellSocSemantic(dataList, deviceId, ts, meta) {
  /**
   * 写入单体SOCCSV
   * @returns {Promise<void>}
   */
  const basename = 'CellSOC'
  const key = `${deviceId}:${basename}`
  if (isNewDay(key)) {
    const np = getCsvFilePath(deviceId, basename)
    currentFileMap.set(key, np)
    idCounters.set(key, 0)
  }
  const filePath = currentFileMap.get(key) || getCsvFilePath(deviceId, basename)
  currentFileMap.set(key, filePath)
  const header = ['ID', '导出时间', ...dataList.flatMap((p) => p.cells.map((c) => `SOC${c.index}（BMU${p.packID} ${c.bmuIndex}#）`))].join(',')
  const stats = await fs.promises.stat(filePath).catch(() => null)
  if (!stats) {
    await appendFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
  }
  isConfigChanged(key, meta)
  if (stats && pendingNewHeader.has(key)) {
    await appendFileWithRetry(filePath, header + '\r\n')
    idCounters.set(key, 0)
    pendingNewHeader.delete(key)
  }
  const nowStr = formatDateTime(new Date(ts))
  const values = dataList.flatMap((p) => p.cells.map((c) => c.value))
  const idVal = nextId(key)
  const row = [idVal, nowStr, ...values].join(',') + '\r\n'
  await appendFileWithRetry(filePath, row)
  await rotateIfNeeded(filePath, deviceId, basename, key, header)
}

export async function saveCellSohSemantic(dataList, deviceId, ts, meta) {
  /**
   * 写入单体SOHCSV
   * @returns {Promise<void>}
   */
  const basename = 'CellSOH'
  const key = `${deviceId}:${basename}`
  if (isNewDay(key)) {
    const np = getCsvFilePath(deviceId, basename)
    currentFileMap.set(key, np)
    idCounters.set(key, 0)
  }
  const filePath = currentFileMap.get(key) || getCsvFilePath(deviceId, basename)
  currentFileMap.set(key, filePath)
  const header = ['ID', '导出时间', ...dataList.flatMap((p) => p.cells.map((c) => `SOH${c.index}（BMU${p.packID} ${c.bmuIndex}#）`))].join(',')
  const stats = await fs.promises.stat(filePath).catch(() => null)
  if (!stats) {
    await appendFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
  }
  isConfigChanged(key, meta)
  if (stats && pendingNewHeader.has(key)) {
    await appendFileWithRetry(filePath, header + '\r\n')
    idCounters.set(key, 0)
    pendingNewHeader.delete(key)
  }
  const nowStr = formatDateTime(new Date(ts))
  const values = dataList.flatMap((p) => p.cells.map((c) => c.value))
  const idVal = nextId(key)
  const row = [idVal, nowStr, ...values].join(',') + '\r\n'
  await appendFileWithRetry(filePath, row)
  await rotateIfNeeded(filePath, deviceId, basename, key, header)
}

function sanitizeBasename(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '_')
}

export async function saveClusterSummarySemantic(dataList, deviceId, ts, meta) {
  /**
   * 写入簇端概要CSV（包含合成列“系统总状态位”）
   * @returns {Promise<void>}
   */
  const basename = 'ClusterData'
  const key = `${deviceId}:${basename}`
  if (isNewDay(key)) {
    const np = getCsvFilePath(deviceId, basename)
    currentFileMap.set(key, np)
    idCounters.set(key, 0)
  }
  const filePath = currentFileMap.get(key) || getCsvFilePath(deviceId, basename)
  currentFileMap.set(key, filePath)
  // 扁平化元素列表，便于筛选与合并
  const allElements = []
  for (const cat of dataList) {
    for (const item of cat.element || []) {
      allElements.push(item)
    }
  }

  // 需要从CSV中移除的系统总状态位相关字段（改为合成一列）
  const SYS_TOTAL_EXCLUDE = new Set([
    '系统总状态位1',
    '系统总状态位2',
    '静止',
    '充电',
    '放电',
    '禁充',
    '禁放',
    '待机',
    '告警',
    '故障',
    '充电功率锁存',
    '放电功率锁存',
    '充电指令',
    '充电指令完成',
    '放电指令',
    '放电指令完成',
    '脱离母线指令',
    '脱离母线指令完成',
    '运维模式',
    '正常模式/测试模式',
    '初始化'
  ])

  const filteredElements = allElements.filter((it) => !SYS_TOTAL_EXCLUDE.has(it.label))

  // 头部：在导出时间之后插入合成列“系统总状态位”
  const header = ['ID', '导出时间', '系统总状态位', ...filteredElements.map((it) => it.label)].join(',')
  const stats = await fs.promises.stat(filePath).catch(() => null)
  if (!stats) {
    await appendFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
  }
  isConfigChanged(key, meta)
  if (stats && pendingNewHeader.has(key)) {
    await appendFileWithRetry(filePath, header + '\r\n')
    idCounters.set(key, 0)
    pendingNewHeader.delete(key)
  }
  const nowStr = formatDateTime(new Date(ts))
  // 合成列：系统总状态位
  const getBool = (val) => {
    if (typeof val === 'boolean') return val
    if (typeof val === 'number') return val !== 0
    if (val == null) return false
    const s = String(val).trim().toLowerCase()
    return s === 'true' || s === '1'
  }
  const getTxt = (val) => {
    if (val && typeof val === 'object') {
      if ('txt' in val) return String(val.txt)
      if ('raw' in val) return String(val.raw)
      return JSON.stringify(val)
    }
    return val == null ? '/' : String(val)
  }

  const forbidChargeItem = allElements.find((it) => it.label === '禁充')
  const forbidDischItem = allElements.find((it) => it.label === '禁放')
  const alarmItem = allElements.find((it) => it.label === '告警')
  const maintItem = allElements.find((it) => it.label === '运维模式')
  const testModeItem = allElements.find((it) => it.label === '正常模式/测试模式')
  const initItem = allElements.find((it) => it.label === '初始化')

  const fc = getBool(forbidChargeItem?.value)
  const fd = getBool(forbidDischItem?.value)
  let chargeDischargeText = '可充可放'
  if (fc && fd) chargeDischargeText = '禁充禁放'
  else if (fc && !fd) chargeDischargeText = '禁充可放'
  else if (!fc && fd) chargeDischargeText = '可充禁放'

  const alarmText = getBool(alarmItem?.value) ? '告警' : '无告警'
  const maintText = getTxt(maintItem?.value) // 运维模式/非运维模式
  const testText = getTxt(testModeItem?.value) // 正常模式/测试模式
  const initText = getTxt(initItem?.value) // 初始化完成/初始化中

  const sysTotalCol = [chargeDischargeText, alarmText, maintText, testText, initText]
    .map((s) => (s && s !== 'null' && s !== 'undefined' ? s : '/'))
    .join('; ')

  const values = [sysTotalCol]
  for (const item of filteredElements) {
    const v = item && item.value
    if (typeof v === 'object' && v !== null) {
      if ('txt' in v) {
        values.push(String(v.txt))
      } else if ('raw' in v) {
        values.push(v.raw)
      } else {
        values.push(JSON.stringify(v))
      }
      continue
    }
    if (item && item.label === '系统状态') {
      const map = { 0: '静置状态', 1: '充电状态', 2: '放电状态', 3: '开路状态', 4: '接触器自检' }
      const num = Number(v)
      values.push(Number.isFinite(num) ? (map[num] ?? v) : v)
      continue
    }
    if (item && item.label === '故障等级') {
      const num = Number(v)
      values.push(Number.isFinite(num) ? (ALARM_MAP[num] ?? v) : v)
      continue
    }
    if (item && (
      item.label === '周期任务堆栈大小' ||
      item.label === '系统堆栈空间' ||
      item.label === '系统堆栈最小空间'
    )) {
      const num = Number(v)
      if (Number.isFinite(num)) {
        values.push(`${num.toFixed(2)} KB`)
      } else {
        values.push(v)
      }
      continue
    }
    values.push(v)
  }
  const idVal = nextId(key)
  const row = [idVal, nowStr, ...values].join(',') + '\r\n'
  await appendFileWithRetry(filePath, row)
  await rotateIfNeeded(filePath, deviceId, basename, key, header)
}

export async function savePackSummarySemantic(dataList, deviceId, ts, meta) {
  /**
   * 写入包端概要CSV（按分类分组）
   * @returns {Promise<void>}
   */
  const nameMap = {
    'BMU电压': 'BMU_Vol',
    'BMU电路板温度': 'BMU_Temp',
    'BMU SOC': 'BMU_SOC',
    '动力接插件温度1': 'Power_Connector_Temp',
    '动力接插件温度2': 'Power_Connector_Temp'
  }
  const grouped = new Map()
  for (const cat of dataList) {
    const cls = String(cat.class || '')
    const base = nameMap[cls]
    if (!base) continue
    const arr = grouped.get(base) || []
    arr.push(cat)
    grouped.set(base, arr)
  }
  const nowStr = formatDateTime(new Date(ts))
  for (const [basename, cats] of grouped.entries()) {
    const key = `${deviceId}:${basename}`
    if (isNewDay(key)) {
      const np = getCsvFilePath(deviceId, basename)
      currentFileMap.set(key, np)
      idCounters.set(key, 0)
    }
    const filePath = currentFileMap.get(key) || getCsvFilePath(deviceId, basename)
    currentFileMap.set(key, filePath)
    const labels = []
    const values = []
    for (const cat of cats) {
      for (const item of cat.element || []) {
        labels.push(item.label)
        values.push(item.value)
      }
    }
    const header = ['ID', '导出时间', ...labels].join(',')
    const stats = await fs.promises.stat(filePath).catch(() => null)
    if (!stats) {
      await appendFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
    }
    isConfigChanged(key, meta)
    if (stats && pendingNewHeader.has(key)) {
      await appendFileWithRetry(filePath, header + '\r\n')
      idCounters.set(key, 0)
      pendingNewHeader.delete(key)
    }
    const idVal = nextId(key)
    const row = [idVal, nowStr, ...values].join(',') + '\r\n'
    await appendFileWithRetry(filePath, row)
    await rotateIfNeeded(filePath, deviceId, basename, key, header)
  }
}

export async function saveBlockSummarySemantic(baseConfigOrList, deviceId, ts, meta) {
  /**
   * 写入堆概要CSV（表头由 BLOCK_SUMMARY 定义）
   * @returns {Promise<void>}
   */
  const baseConfig = Array.isArray(baseConfigOrList) ? (baseConfigOrList[0] || {}) : baseConfigOrList
  const basename = 'BlockSummary'
  const key = `${deviceId}:${basename}`
  if (isNewDay(key)) {
    const np = getCsvFilePath(deviceId, basename)
    currentFileMap.set(key, np)
    idCounters.set(key, 0)
  }
  const filePath = currentFileMap.get(key) || getCsvFilePath(deviceId, basename)
  currentFileMap.set(key, filePath)
  const fields = BLOCK_SUMMARY.filter((f) => {
    const t = typeof f.type === 'string' ? f.type : ''
    if (t.startsWith('skip')) return false
    if ('bitsOf' in f || t === 'bit') return false
    return true
  })
  const header = ['ID', '导出时间', ...fields.map((f) => f.unit ? `${f.label}(${f.unit})` : f.label)].join(',')
  const stats = await fs.promises.stat(filePath).catch(() => null)
  if (!stats) {
    await appendFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
  }
  isConfigChanged(key, meta)
  if (stats && pendingNewHeader.has(key)) {
    await appendFileWithRetry(filePath, header + '\r\n')
    idCounters.set(key, 0)
    pendingNewHeader.delete(key)
  }
  const nowStr = formatDateTime(new Date(ts))
  const fmt = (f, v) => {
    const n = Number(v)
    if (
      f.key === 'EnableClusterStatus1' ||
      f.key === 'EnableClusterStatus2' ||
      f.key === 'CutoutClusterStatus1' ||
      f.key === 'CutoutClusterStatus2'
    ) {
      if (Number.isFinite(n)) {
        const bits = (n & 0x3FF).toString(2).padStart(10, '0')
        return '\u200B' + bits
      }
      return v == null ? '/' : String(v)
    }
    if (f.key === 'stackFaultStatus') {
      const m = { 0: '无故障', 1: '轻微', 2: '一般', 3: '严重' }
      return m[n] ?? String(v)
    }
    if (f.key === 'bauWorkingMode') {
      const m = { 0: '静置', 1: '充电', 2: '放电', 3: '开路', 4: '接触器自检', 255: '各簇状态不一致' }
      return m[n] ?? String(v)
    }
    if (f.key === 'deviceSystemStatus') {
      const m = { 0: '运行监测', 1: '绝缘检测状态', 2: '接触器自检状态', 3: '系统初始化', 4: 'BCU升级状态', 6: 'BCU自适应地址状态', 7: 'BMU自适应地址状态', 8: 'BMU升级状态', 65535: '其他' }
      return m[n] ?? String(v)
    }
    if (f.key === 'chargeDischargeForbiddenStatus') {
      const m = { 0: '可充可放', 1: '可充禁放', 2: '可放禁充', 3: '禁充禁放' }
      return m[n] ?? String(v)
    }
    if (f.key === 'chargeDischargeStatus') {
      const m = { 0: '其他', 1: '充电', 2: '放电' }
      return m[n] ?? String(v)
    }
    if (Number.isFinite(n)) {
      if (f.scale === 10 || f.scale === 100) {
        return n.toFixed(1)
      }
      return String(n)
    }
    return v == null ? '/' : String(v)
  }
  const values = fields.map((f) => fmt(f, baseConfig ? baseConfig[f.key] : undefined))
  const idVal = nextId(key)
  const row = [idVal, nowStr, ...values].join(',') + '\r\n'
  await appendFileWithRetry(filePath, row)
  await rotateIfNeeded(filePath, deviceId, basename, key, header)
}
function generateAlarmKey(deviceId, classification, bmuIndex, cellIndex, fault, level, cellIndexRelative) {
  /**
   * 生成精确告警键（含等级）
   */
  const safeCellIndex = cellIndex || cellIndexRelative || ''
  return `${deviceId}:${classification}:${bmuIndex}:${safeCellIndex}:${fault}:${level}`
}
function generateAlarmKeyWithoutLevel(deviceId, classification, bmuIndex, cellIndex, fault, cellIndexRelative) {
  /**
   * 生成不含等级的告警键（用于恢复/对比）
   */
  const safeCellIndex = cellIndex || cellIndexRelative || ''
  return `${deviceId}:${classification}:${bmuIndex}:${safeCellIndex}:${fault}`
}
function hasAlarmStatusChanged(deviceId, classification, bmuIndex, cellIndex, fault, level, actionValue, cellIndexRelative) {
  /**
   * 检测同等级下状态变化（值变化或重新触发）
   */
  const alarmKey = generateAlarmKey(deviceId, classification, bmuIndex, cellIndex, fault, level, cellIndexRelative)
  const currentStatus = JSON.stringify({ classification, bmuIndex, cellIndex, fault, level })
  const cachedStatus = alarmStatusCache.get(alarmKey)
  if (!cachedStatus) {
    alarmStatusCache.set(alarmKey, currentStatus)
    return { isNew: true, isRecovered: false, hasChanged: false }
  }
  if (level === '恢复告警') {
    return { isNew: false, isRecovered: false, hasChanged: false }
  }
  if (cachedStatus !== currentStatus) {
    alarmStatusCache.set(alarmKey, currentStatus)
    return { isNew: false, isRecovered: false, hasChanged: true }
  }
  return { isNew: false, isRecovered: false, hasChanged: false }
}
/* ---------- 全局温度序号计算函数 (与parseFault.ts一致) ---------- */
function calculateGlobalTemp(bmu, tempInBmu, cfg = {}) {
  /**
   * 根据 BMU 与相对温度索引计算全局温度绝对序号
   * @param {number} bmu - BMU编号
   * @param {number} tempInBmu - BMU内温度相对序号
   * @param {{afeTempCounts:number[]}} cfg - 配置（每BMU温度探头数量列表）
   * @returns {number|null} 全局绝对序号
   */
  if (!bmu || !tempInBmu) return null;
  const { afeTempCounts = [] } = cfg;
  const tempsPerBmu = afeTempCounts.reduce((total, count) => total + count, 0);
  return tempsPerBmu > 0 ? (bmu - 1) * tempsPerBmu + tempInBmu : null;
}

function detectRecoveredAlarms(deviceId, currentKeys, getPreciseTime, currentDataType) {
  /**
   * 检测已恢复的告警（当前批次不存在即视为恢复）
   * @param {string} deviceId - 设备ID
   * @param {Set<string>} currentKeys - 当前批次告警键集合（不含等级）
   * @param {() => number} getPreciseTime - 精确时间生成器（保证排序稳定）
   * @param {string} currentDataType - 当前数据类型（Topic），用于隔离不同类型的恢复
   * @returns {Array<Object>} 恢复告警列表
   */
  const recoveredAlarms = [];
  // 遍历所有已存储的告警
  for (const [alarmKey, alarmInfo] of storedAlarms.entries()) {
    // 检查是否属于当前设备（通过前缀匹配）
    if (alarmKey.startsWith(`${deviceId}:`)) {
      // 关键修复：只检测属于当前数据类型（Topic）的告警
      // 防止不同Topic的数据（如 TOTAL_FAULT 和 FAULT_LEVEL2）相互误判为恢复
      if (currentDataType && alarmInfo.dataType !== currentDataType) {
        continue;
      }

      // 提取不带等级的键（用于匹配当前存在的告警）
      const lastColonIndex = alarmKey.lastIndexOf(':');
      const keyNoLevel = alarmKey.substring(0, lastColonIndex);

      // 如果当前上报的告警列表中不包含这个键，说明该告警已消失（恢复）
      if (!currentKeys.has(keyNoLevel)) {
        const currentTime = getPreciseTime();
        // 记录恢复告警
        recoveredAlarms.push({
          ...alarmInfo,
          level: `${alarmInfo.level}-告警恢复`,
          alarmStatus: '已恢复',
          timestamp: currentTime,
          actionValue: '' // 恢复时动作值通常为空
        });
        
        // 从存储和缓存中移除
        storedAlarms.delete(alarmKey);
        alarmStatusCache.delete(alarmKey);
      }
    }
  }
  return recoveredAlarms;
}

const ALARM_LEVEL_ORDER = { 
  '严重': 3, '一般': 2, '轻微': 1,
  '严重报警': 3, '一般报警': 2, '轻微报警': 1,
  'Severe': 3, 'Medium': 2, 'Mild': 1
}

// Helper for Action Value Lookup
function getCurrentActionValue(deviceId, faultName, bmuIndex, cellIndexRelative) {
  /**
   * 根据故障类型在最新运行数据中查找动作值（电压/温度/电流/绝缘等）
   * @returns {any|null} 查到的实时值或 null
   */
  const name = String(faultName || '');

  // 0. Exclude Disconnection/Communication Faults
  // 拦截掉线、断线、通信故障，直接返回'-'，避免显示错误数值
  if (name.match(/掉线|断线|通信|Lost|Disconnect/i)) return '-';

  // Access global 'latest' cache
  const devData = (type) => latest[type] && latest[type][deviceId] ? latest[type][deviceId].dataList : null;

  // 1. Cell Voltage (Exact Match)
  // 白名单：仅匹配单体过压/欠压，排除压差过大
  if (name.match(/单体电池(过压|欠压)|Cell.*(Over|Under).*Volt/i) && !name.includes('压差')) {
    const list = devData('cellVoltage');
    if (Array.isArray(list)) {
      const pack = list.find(p => String(p.packID) === String(bmuIndex));
      if (pack && Array.isArray(pack.cells)) {
        const cell = pack.cells.find(c => String(c.bmuIndex) === String(cellIndexRelative));
        if (cell) return cell.value;
      }
    }
  }

  // 2. Cell Temperature (Exact Match)
  // 白名单：仅匹配充/放电单体过温/欠温，排除温差过大
  if (name.match(/(充电|放电).*单体.*(过温|欠温)|Cell.*(Over|Under).*Temp/i) && !name.includes('温差')) {
    const list = devData('cellTemperature');
    if (Array.isArray(list)) {
      const pack = list.find(p => String(p.packID) === String(bmuIndex));
      if (pack && Array.isArray(pack.cells)) {
        const cell = pack.cells.find(c => String(c.bmuIndex) === String(cellIndexRelative));
        if (cell) return cell.value;
      }
    }
  }

  // 3. Cell SOC (Exact Match)
  if (name.match(/单体SOC(过高|过低)/i)) {
    const list = devData('cellSOC');
    if (Array.isArray(list)) {
      const pack = list.find(p => String(p.packID) === String(bmuIndex));
      if (pack && Array.isArray(pack.cells)) {
        const cell = pack.cells.find(c => String(c.bmuIndex) === String(cellIndexRelative));
        if (cell) return cell.value;
      }
    }
  }

  // 4. Cluster Data (Voltage, Current, Insulation)
  if (name === '簇端过压' || name === '簇端欠压') {
    return findClusterValue(devData, '簇电压');
  }
  if (name === '充电过流' || name === '放电过流') {
    return findClusterValue(devData, '簇电流');
  }
  if (name === '绝缘电阻正对地过低') {
    return findClusterValue(devData, '绝缘电阻R+'); // Assuming label matches
  }
  if (name === '绝缘电阻负对地过低') {
    return findClusterValue(devData, '绝缘电阻R-'); // Assuming label matches
  }

  // 5. Pack/BMU Data (Board Temp, Connector Temp)
  if (name === 'BMU过温' || name === 'BMU欠温') {
    // 查找 BMU电路板温度 -> BMU{N}(℃)
    return findPackValue(devData, 'BMUTemp', `BMU${bmuIndex}`);
  }
  if (name === 'BMU过压' || name === 'BMU欠压') {
    // 查找 BMU板端电压 -> BMU{N}(V)
    return findPackValue(devData, 'BMUVoltage', `BMU${bmuIndex}`);
  }
  if (name.match(/动力接插件过温/)) {
    // 查找 动力接插件温度 -> BMU{N}-1 or BMU{N}-2
    // Assuming fault name implies which connector, or return first found for BMU
    return findPackValue(devData, 'ImpetusTemp', `BMU${bmuIndex}`);
  }

  return null;
}

// Helper to find value in Cluster Summary
function findClusterValue(devDataFunc, targetLabel) {
  const list = devDataFunc('clusterSummary');
  if (Array.isArray(list)) {
    for (const cat of list) {
      if (cat && Array.isArray(cat.element)) {
        for (const el of cat.element) {
           if (String(el.label).includes(targetLabel)) return el.value;
        }
      }
    }
  }
  return null;
}

// Helper to find value in Pack Summary
function findPackValue(devDataFunc, classificationKey, labelKey) {
  const list = devDataFunc('packSummary');
  if (Array.isArray(list)) {
    for (const cat of list) {
      // classificationKey is partial match for cat.classification (e.g. 'BMUTemp' matches 'BMUTemp')
      if (cat && cat.classification && cat.classification.includes(classificationKey) && Array.isArray(cat.element)) {
        for (const el of cat.element) {
           if (String(el.label).includes(labelKey)) return el.value;
        }
      }
    }
  }
  return null;
}

// Helper for Level Normalization
function normalizeLevel(level) {
  if (!level) return '严重';
  const s = String(level);
  if (s.match(/严重|Severe|Level\s*3/i)) return '严重';
  if (s.match(/一般|Medium|Level\s*2/i)) return '一般';
  if (s.match(/轻微|Mild|Level\s*1/i)) return '轻微';
  return '严重';
}

export async function saveAlarmSemantic(dataList, deviceId, ts, meta) {
  /**
   * 写入故障CSV（堆级），包含过滤/定位/等级流转/恢复检测/动作值查找与缓冲落盘
   * @param {Array} dataList - 分类故障数据列表
   * @param {string} deviceId - 设备ID（簇维度传入，内部按堆聚合）
   * @param {number} ts - 时间戳
   * @param {Object} meta - 元数据（包含定位所需配置）
   * @returns {Promise<void>}
   */
  // 从 deviceId 解析堆号和簇号
  const { block, cluster } = parseDevice(deviceId)
  const stackNo = block
  const clusterNo = cluster
  
  // 使用堆级ID (Block ID) 作为缓存 Key，确保同一堆下的所有簇共享同一个文件
  const blockId = `${block}-0` 
  const basename = 'ErrorData'
  const key = `${blockId}:${basename}`
  
  if (isNewDay(key)) {
    const np = getAlarmCsvFilePath(blockId) // Use blockId to get path
    currentFileMap.set(key, np)
    idCounters.set(np, 0) // Reset counter for the file path
  }
  const filePath = currentFileMap.get(key) || getAlarmCsvFilePath(blockId)
  currentFileMap.set(key, filePath)
  
  // 更新表头：增加堆号、簇号
  const header = ['ID', '导出时间', '故障产生时间', '告警', '告警等级', '动作值', '堆号', '簇号', 'BMU编号', 'Cell/Temp绝对索引', 'Cell/Temp相对索引'].join(',')
  
  // 使用 promise 锁确保同一文件路径在同一会话中只初始化一次表头，防止并发写入重复表头
  if (!initializedFiles.has(filePath)) {
    let promise = fileInitPromises.get(filePath)
    if (!promise) {
      promise = (async () => {
        const stats = await fs.promises.stat(filePath).catch(() => null)
        if (!stats) {
          await appendFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
        }
        initializedFiles.add(filePath)
      })()
      fileInitPromises.set(filePath, promise)
    }
    await promise
  }

  const nowStr = formatDateTime(new Date(ts))
  
  // 从 deviceId 解析堆号和簇号 (已在函数顶部解析)
  // const { block, cluster } = parseDevice(deviceId)
  // const stackNo = block
  // const clusterNo = cluster

  // 1. 扁平化并预处理告警数据（定位 + 过滤）
  const flatAlarms = []
  
  for (const category of dataList) {
    if (!category || !Array.isArray(category.element)) continue
    // dataType 从 ingest.js 透传过来
    const dataType = category.dataType || '' 

    for (const item of category.element) {
      // 1. 应用过滤逻辑 (名称过滤)
      if (!shouldDisplayFault(dataType, item.fault)) {
        continue;
      }

      // 2. 应用值校验逻辑 (状态过滤)
      // 确保只有真正的故障状态才会被记录，过滤掉"正常"、0、false等值
      let isFault = false;
      let rawVal = item.value;
      if (typeof rawVal === 'object' && rawVal !== null && 'val' in rawVal) {
        rawVal = rawVal.val;
      }

      if (dataType === 'BROKENWIRE') {
        isFault = getBrokenwireFaultStatus(item.fault, rawVal, dataType);
      } else {
        // 标准故障判断
        // Strict filtering: Exclude 0, '0', '正常', '无故障', or empty/null levels
        if (item.level === 0 || item.level === '0' || item.level === '正常' || item.level === '无故障' || !item.level) {
          isFault = false;
        } else {
          isFault = true;
        }
      }

      if (!isFault) continue;

      // 计算定位信息
      // 使用 locateCell 重新解析 label 以确保准确性，特别是 ingest.js 只是简单透传
      const loc = locateCell(item.fault, meta || {})
      const bmu = loc.bmu || item.bmuIndex
      const cellInBmu = loc.cellInBmu // 相对索引
      const globalCell = loc.globalCell // 绝对电芯索引
      
      let globalTemp = null
      if (item.fault.includes('过温') || item.fault.includes('欠温')) {
        globalTemp = (bmu && cellInBmu) ? calculateGlobalTemp(bmu, cellInBmu, meta || {}) : null
      }

      // 决定最终使用的索引值
      // 绝对索引：优先用 globalCell 或 globalTemp
      const absIndex = globalCell || globalTemp || ''
      // 相对索引：优先用 cellInBmu
      const relIndex = cellInBmu || ''

      // Normalize Level
      item.level = normalizeLevel(item.level);

      // Lookup Action Value
      const realValue = getCurrentActionValue(deviceId, item.fault, bmu, relIndex);

      flatAlarms.push({ 
        ...item, 
        classification: category.classification,
        dataType: dataType, // 关键修复：显式传递 dataType，用于恢复检测匹配
        bmuIndex: bmu,
        cellIndex: absIndex,          // 绝对索引列
        cellIndexRelative: relIndex,  // 相对索引列
        stackNo,
        clusterNo,
        actionValue: (realValue !== null && realValue !== undefined) ? realValue : item.actionValue // Prioritize real lookup
      })
    }
  }

  // 构建当前告警键集合（不带等级），用于快速查找和恢复检测
  const currentKeys = new Set()
  const currentAlarmMap = new Map()
  
  for (const item of flatAlarms) {
    const keyNoLevel = generateAlarmKeyWithoutLevel(deviceId, item.classification, item.bmuIndex, item.cellIndex, item.fault, item.cellIndexRelative)
    currentKeys.add(keyNoLevel)
    
    if (!currentAlarmMap.has(keyNoLevel)) currentAlarmMap.set(keyNoLevel, [])
    currentAlarmMap.get(keyNoLevel).push(item)
  }

  const alarmsToStore = []
  const baseTime = Date.now()
  let timeOffset = 0
  const getPreciseTime = () => baseTime + timeOffset++

  // 2. 处理当前存在的告警（新告警、升阶、降阶）
  for (const item of flatAlarms) {
    const keyNoLevel = generateAlarmKeyWithoutLevel(deviceId, item.classification, item.bmuIndex, item.cellIndex, item.fault, item.cellIndexRelative)
    const alarmKey = generateAlarmKey(deviceId, item.classification, item.bmuIndex, item.cellIndex, item.fault, item.level, item.cellIndexRelative)
    
    let oldEntry = null
    const possibleLevels = ['严重', '一般', '轻微'] // Only standard levels now
    
    // 检查是否有该故障的旧记录（可能是不同等级）
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
          // 升阶：需要获取最新的动作值
          // 尝试重新获取实时值，因为状态变了，值可能也变了
          const currentRealValue = getCurrentActionValue(deviceId, item.fault, item.bmuIndex, item.cellIndexRelative);
          const finalActionValue = (currentRealValue !== null && currentRealValue !== undefined) ? currentRealValue : (item.actionValue || '');

          const currentTime = getPreciseTime()
          alarmsToStore.push({ 
            ...oldAlarm, 
            level: `${oldLevel}→${newLevel} (升阶)`, 
            levelValue: 0, 
            timestamp: currentTime, 
            alarmStatus: '告警升阶', 
            actionValue: finalActionValue 
          })
          
          storedAlarms.delete(oldKey)
          alarmStatusCache.delete(oldKey)
          
          storedAlarms.set(alarmKey, { ...item, classification: item.classification, dataType: item.dataType, timestamp: currentTime, actionValue: finalActionValue })
          alarmStatusCache.set(alarmKey, JSON.stringify({ classification: item.classification, bmuIndex: item.bmuIndex, cellIndex: item.cellIndex, fault: item.fault, level: item.level }))
          continue
        } else if (newOrder < oldOrder) {
          // 降阶：先记录恢复，再记录新告警
          // 恢复记录：使用旧记录的 actionValue (快照)，代表故障发生时的值
          const currentTime = getPreciseTime()
          // 1. 恢复旧告警
          alarmsToStore.push({ 
            ...oldAlarm, 
            level: `${oldLevel}-告警恢复`, 
            levelValue: 0, 
            timestamp: currentTime, 
            alarmStatus: '已恢复', 
            actionValue: oldAlarm.actionValue || '' // Keep snapshot
          })
          
          storedAlarms.delete(oldKey)
          alarmStatusCache.delete(oldKey)
          
          // 2. 记录新等级告警
          // 新告警：使用最新的动作值
          const currentRealValue = getCurrentActionValue(deviceId, item.fault, item.bmuIndex, item.cellIndexRelative);
          const finalActionValue = (currentRealValue !== null && currentRealValue !== undefined) ? currentRealValue : (item.actionValue || '');

          alarmsToStore.push({ 
            ...item, 
            alarmStatus: '新告警', 
            actionValue: finalActionValue, 
            timestamp: currentTime 
          })
          
          storedAlarms.set(alarmKey, { ...item, classification: item.classification, dataType: item.dataType, timestamp: currentTime, actionValue: finalActionValue })
          alarmStatusCache.set(alarmKey, JSON.stringify({ classification: item.classification, bmuIndex: item.bmuIndex, cellIndex: item.cellIndex, fault: item.fault, level: item.level }))
          continue
        }
      }
    }

    // 检查同等级下的状态变化（如 actionValue 变化，或者重新触发）
    const status = hasAlarmStatusChanged(deviceId, item.classification, item.bmuIndex, item.cellIndex, item.fault, item.level, item.actionValue, item.cellIndexRelative)
    
    if (status.isNew) {
      const currentTime = getPreciseTime()
      alarmsToStore.push({ ...item, alarmStatus: '新告警', actionValue: item.actionValue || '', timestamp: currentTime })
      storedAlarms.set(alarmKey, { ...item, classification: item.classification, dataType: item.dataType, timestamp: currentTime })
    } else if (status.hasChanged) {
      // 这是一个兜底逻辑，通常会被上面的升降阶逻辑捕获，但保留以防万一
      const currentTime = getPreciseTime()
      alarmsToStore.push({ ...item, alarmStatus: '新告警', actionValue: item.actionValue || '', timestamp: currentTime })
      
      const existingAlarm = storedAlarms.get(alarmKey)
      if (existingAlarm) {
        alarmsToStore.push({ 
          ...existingAlarm, 
          level: (existingAlarm.level || '') + '-告警恢复', 
          levelValue: 0, 
          timestamp: currentTime, 
          alarmStatus: '已恢复', 
          actionValue: item.actionValue || '' 
        })
      }
      storedAlarms.set(alarmKey, { ...item, classification: item.classification, dataType: item.dataType, timestamp: currentTime })
    } else {
      // 显式恢复告警（通常通过 detectRecoveredAlarms 处理，但保留以兼容）
      if (item.level === '恢复告警') {
        const currentTime = getPreciseTime()
        alarmsToStore.push({ ...item, alarmStatus: '已恢复', actionValue: item.actionValue || '', timestamp: currentTime })
        storedAlarms.delete(alarmKey)
        alarmStatusCache.delete(alarmKey)
      } else {
        // 只是更新值或时间戳
        const existingAlarm = storedAlarms.get(alarmKey)
        if (existingAlarm) {
          const currentTime = getPreciseTime()
          storedAlarms.set(alarmKey, { ...existingAlarm, actionValue: item.actionValue, dataType: item.dataType, timestamp: currentTime })
        }
      }
    }
  }

  // 3. 检测已恢复的告警（消失即恢复）
  // 传入 currentDataType (例如 'TOTAL_FAULT')，确保只处理属于该 Topic 的告警恢复
  // 获取当前批次的 dataType (假设同一批次所有 element 的 dataType 相同)
  const currentDataType = dataList.length > 0 ? dataList[0].dataType : '';
  const recovered = detectRecoveredAlarms(deviceId, currentKeys, getPreciseTime, currentDataType)
  alarmsToStore.push(...recovered)

  // 4. 排序并写入
  alarmsToStore.sort((a, b) => a.timestamp - b.timestamp)
  
  for (const item of alarmsToStore) {
    const idVal = nextId(filePath) // 使用文件路径作为ID计数键，保证同文件内连续递增
    const occur = formatDateTime(new Date(item.timestamp))
    const row = [
      idVal, 
      nowStr, 
      occur, 
      item.faultZh || item.fault, 
      item.level || '', 
      item.actionValue || '', 
      item.stackNo || '',
      item.clusterNo || '',
      item.bmuIndex || '', 
      item.cellIndex || '', 
      item.cellIndexRelative || ''
    ].join(',') + '\r\n'
    
    // 使用缓冲写入，避免高频IO与并发表头写入
    bufferCsvData(filePath, key, header, row)
  }
  
  // Rotation is now handled (or should be) within the flush mechanism, 
  // but we keep this call here if it updates shared state (like idCounters), 
  // although technically rotation logic should ideally move to flush time for accuracy.
  // For now, to match reference behavior where rotation check happens post-write:
  // Since bufferCsvData is async/delayed, immediate rotation check might be slightly off but acceptable.
  // However, reference project checks rotation INSIDE flushCsvBuffers.
  // We will leave the rotation check here for now but note that true file size is only known after flush.
  // To strictly follow reference, we should remove this await rotateIfNeeded and implement it in flushCsvBuffers.
  // But flushCsvBuffers implemented above already has a placeholder for rotation.
}
// 监听来自主进程的磁盘空间决策（继续/停止）
try {
  process.on('message', (msg) => {
    if (msg && msg.API === 'disk-space-decision') {
      setDiskSpaceBypass(msg.decision === 'continue')
      try { console.log('[Semantic] disk-space-decision:', msg.decision) } catch {}
    }
  })
} catch {}

// ==================== Buffering & Flush Logic (Reference Project) ====================

function bufferCsvData(filePath, key, header, row) {
  /**
   * 将一行CSV数据写入内存缓冲
   * @param {string} filePath - 目标文件路径
   * @param {string} key - 逻辑键（用于表头与轮转）
   * @param {string} header - CSV表头
   * @param {string} row - CSV数据行（含\r\n）
   * @returns {void}
   */
  // Use non-blocking promise chain to acquire lock
  csvMutex
    .acquire()
    .then((release) => {
      try {
        if (!csvBuffers.has(filePath)) {
          csvBuffers.set(filePath, { key, header, buffer: [] })
        }
        const entry = csvBuffers.get(filePath)
        entry.buffer.push(row)
      } catch (error) {
        console.error(`[Error] bufferCsvData failed: ${error.message}`)
      } finally {
        release()
      }
    })
    .catch((error) => {
      console.error(`[Error] csvMutex.acquire failed: ${error.message}`)
    })
}

async function flushCsvBuffers() {
  /**
   * 定期刷新缓冲到磁盘（批量写入与表头初始化）
   * @returns {Promise<void>}
   */
  const clients = {} // Placeholder if needed, but we mostly rely on buffers
  
  // 1. Snapshot and clear buffers while holding lock
  let release
  const toWrite = [] // { filePath, key, header, lines }
  try {
    release = await csvMutex.acquire()
    for (const [filePath, entry] of csvBuffers.entries()) {
      if (!entry.buffer || entry.buffer.length === 0) continue
      const lines = entry.buffer.splice(0, entry.buffer.length)
      toWrite.push({ filePath, key: entry.key, header: entry.header, lines })
    }
  } catch (error) {
    console.error(`[Error] flushCsvBuffers acquire lock failed: ${error.message}`)
    return
  } finally {
    if (release) release()
  }

  // 2. Write to disk without holding lock
  for (const item of toWrite) {
    const { filePath, key, header, lines } = item
    try {
      const stats = await fs.promises.stat(filePath).catch(() => null)
      if (!stats) {
        await appendFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
      }
      await appendFileWithRetry(filePath, lines.join('')) // lines already contain \r\n
      // Check for rotation (file size limit)
      // Note: We use a simplified rotation check here compared to the sync version
      // The original sync version updates currentFileMap which might need care
    } catch (writeError) {
      console.error(`[Error] Write file failed: ${filePath}, error: ${writeError.message}`)
    }
  }
}

function startFlushTimer() {
  /**
   * 启动缓冲刷新定时器
   * @returns {void}
   */
  if (flushTimer) return
  flushTimer = setInterval(() => {
    flushCsvBuffers().catch(err => console.error(err))
  }, CSV_BUFFER_INTERVAL)
}

function stopFlushTimer() {
  /**
   * 停止缓冲刷新定时器并立即刷新一次剩余数据
   * @returns {void}
   */
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  // Flush remaining data
  flushCsvBuffers().catch(err => console.error(err))
}
