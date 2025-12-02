import fs from 'fs'
import path from 'path'
import { ensureDir, formatFileSuffix, formatDateTime, appendFileWithRetry, getCachedFreeDiskSpace } from './utils'
import { ALARM_MAP, BLOCK_SUMMARY } from '../table.js'
import { RUN_EXPORT_DIR, getDeviceDirSuffix } from './paths'
const latest = { cellVoltage: {}, cellTemperature: {}, cellSOC: {}, cellSOH: {}, clusterSummary: {}, packSummary: {}, blockSummary: {} }
const lastWritten = { cellVoltage: {}, cellTemperature: {}, cellSOC: {}, cellSOH: {}, clusterSummary: {}, packSummary: {}, blockSummary: {} }
const currentFileMap = new Map()
const deviceOrder = new Map()
const configSnapshotMap = new Map()
const pendingNewHeader = new Set()
const daySnapshotMap = new Map()
const FILE_SIZE_LIMIT = parseInt(process.env.EXPORT_FILE_SIZE_LIMIT || String(500 * 1024 * 1024), 10)
const MIN_FREE_SPACE = parseInt(process.env.MIN_FREE_SPACE || String(5 * 1024 * 1024 * 1024), 10)
const DISK_WARNING_COOLDOWN_MS = parseInt(process.env.DISK_WARNING_COOLDOWN_MS || '10000', 10)
let lastDiskWarningTs = 0
let bypassLowDiskCheck = false
export function setDiskSpaceBypass(enabled) {
  bypassLowDiskCheck = !!enabled
}
function parseDevice(id) {
  const [bStr, cStr] = String(id).split('-')
  const block = parseInt(bStr) || 0
  const cluster = parseInt(cStr) || 0
  return { block, cluster }
}
function getCsvFilePath(deviceId, basename) {
  const { block, cluster } = parseDevice(deviceId)
  const dirSuffix = getDeviceDirSuffix(deviceId)
  const dir = path.join(RUN_EXPORT_DIR, `Block${block}_Cluster${cluster}_${dirSuffix}`)
  ensureDir(dir)
  const fileSuffix = formatFileSuffix(new Date())
  return path.join(dir, `${basename}_${fileSuffix}.csv`)
}
export function cacheSampleSemantic(label, dataList, deviceId, ts, meta) {
  if (!latest[label]) latest[label] = {}
  latest[label][deviceId] = { timestamp: ts, dataList, meta }
}
let saveTimer = null
export function startSaveTimerSemantic() {
  if (saveTimer) return
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
          lastWritten[label][id] = { timestamp: newTs, dataList: dataListToWrite, meta: metaToUse }
        }
      })
    })
  }, 2000)
}
export function stopSaveTimerSemantic() {
  if (saveTimer) {
    clearInterval(saveTimer)
    saveTimer = null
  }
}
const idCounters = new Map()
function nextId(key) {
  const v = (idCounters.get(key) || 0) + 1
  idCounters.set(key, v)
  return v
}
function isNewDay(key) {
  const day = formatFileSuffix(new Date()).slice(0, 8)
  if (daySnapshotMap.get(key) !== day) {
    daySnapshotMap.set(key, day)
    return true
  }
  return false
}
function isConfigChanged(key, meta) {
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
  const fields = BLOCK_SUMMARY.filter((f) => typeof f.type === 'string' && !f.type.startsWith('skip'))
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
// 监听来自主进程的磁盘空间决策（继续/停止）
try {
  process.on('message', (msg) => {
    if (msg && msg.API === 'disk-space-decision') {
      setDiskSpaceBypass(msg.decision === 'continue')
      try { console.log('[Semantic] disk-space-decision:', msg.decision) } catch {}
    }
  })
} catch {}
