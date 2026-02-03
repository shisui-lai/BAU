/**
 * 原始 MQTT 报文记录（CSV）
 *
 * 职责：
 * - 在 RAW_EXPORT_DIR 下按会话后缀生成 Raw_Messages_<suffix>.csv
 * - 超过大小限制自动轮转并 gzip 压缩，更新后缀以生成新文件
 * - 表头一次性初始化（hasValidHeader/ensureGlobalHeader），写入采用串行链保证顺序
 *
 * 维护提示：
 * - currentFileSuffix 在轮转后更新，避免文件名冲突；磁盘空间不足时发送警告消息
 */
import fs from 'fs'
import path from 'path'
import {
  appendFileWithRetry,
  ensureDir,
  compressFileGzip,
  formatDateTime,
  getCachedFreeDiskSpace
} from './utils'
import { RAW_EXPORT_DIR, SESSION_SUFFIX } from './paths'

const RAW_HEADER = ['ID', '时间', '方向', '主题', '设备', 'PayloadHex'].join(',')

let globalIdCounter = 0
const FILE_SIZE_LIMIT = 500 * 1024 * 1024
const MIN_FREE_SPACE = parseInt(process.env.MIN_FREE_SPACE || String(5 * 1024 * 1024 * 1024), 10)
const DISK_WARNING_COOLDOWN_MS = parseInt(process.env.DISK_WARNING_COOLDOWN_MS || '10000', 10)
const CSV_BUFFER_INTERVAL = parseInt(process.env.RAW_CSV_BUFFER_INTERVAL_MS || '1000', 10)
const CSV_BUFFER_MAX_BYTES = parseInt(
  process.env.RAW_CSV_MAX_BUFFER_BYTES || String(5 * 1024 * 1024),
  10
)
let lastDiskWarningTs = 0
let bypassLowDiskCheck = false
let totalWriteCount = 0
let lastWriteMeta = null
const rotatingFiles = new Set()
// 诊断：待写入的 CSV 行数
let pendingJobs = 0
// 诊断：排队任务的近似字节数（用于观察写盘积压趋势，非严格值）
let pendingBytesApprox = 0
// 诊断：最近一次 raw flush 的执行耗时（毫秒）
let lastJobMs = 0
// 诊断：最近 10 分钟窗口内，raw flush 的最大耗时（毫秒）
let maxJobMsRecent = 0
let maxJobMsTs = 0
// 诊断：最近一次 raw flush 从最早入队到开始执行的排队延迟（毫秒）
let lastQueueDelayMs = 0
// 诊断：最近 10 分钟窗口内，排队延迟最大值（毫秒）
let maxQueueDelayMsRecent = 0
let maxQueueDelayMsTs = 0
export function setDiskSpaceBypassRaw(enabled) {
  bypassLowDiskCheck = !!enabled
}
let headerInitPromise = null
let headerInitPath = ''
// 当前原始消息文件的时间后缀；压缩后会更新为新的时间戳以生成新文件名
let currentFileSuffix = SESSION_SUFFIX

let rawDirEnsured = false
function getDir() {
  const dir = RAW_EXPORT_DIR
  if (!rawDirEnsured) {
    ensureDir(dir)
    rawDirEnsured = true
  }
  return dir
}
/**
 * 获取当前原始报文CSV文件路径
 * @returns {string} 文件绝对路径
 */
function getFile() {
  return path.join(getDir(), `Raw_Messages_${currentFileSuffix}.csv`)
}
/**
 * 判断文件是否已包含有效表头（含 BOM）
 * @param {string} p - 文件路径
 * @returns {Promise<boolean>} 是否包含有效表头
 */

/**
 * 按文件大小限制进行轮转与压缩
 * @param {string} p - 文件路径
 * @returns {Promise<void>}
 */
async function rotateIfNeeded(p, incomingBytes = 0) {
  try {
    const s = await fs.promises.stat(p)
    if (s.size + Number(incomingBytes || 0) >= FILE_SIZE_LIMIT) {
      if (rotatingFiles.has(p)) {
        return
      }
      rotatingFiles.add(p)
      const oldPath = p
      currentFileSuffix = (function () {
        const d = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
          d.getHours()
        )}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`
      })()
      headerInitPromise = null
      headerInitPath = ''
      compressFileGzip(oldPath)
        .then((gzPath) => {
          rotatingFiles.delete(oldPath)
        })
        .catch((err) => {
          rotatingFiles.delete(oldPath)
          try {
            console.error(
              `[ChildLog] raw-rotate error {"path":${JSON.stringify(
                oldPath
              )},"error":${JSON.stringify(err && err.message)}}`
            )
          } catch {}
        })
    }
  } catch {}
}
/**
 * 确保全局原始报文文件写入表头（只初始化一次）
 * @param {string} p - 文件路径
 * @returns {Promise<void>}
 */
async function ensureGlobalHeader(p) {
  if (headerInitPromise && headerInitPath === p) return headerInitPromise
  headerInitPath = p
  headerInitPromise = (async () => {
    const st = await fs.promises.stat(p).catch(() => null)
    if (!st || st.size === 0) {
      await appendFileWithRetry(p, '\uFEFF' + RAW_HEADER + '\r\n')
    }
  })()
  return headerInitPromise
}

function formatClientLabel(clientId) {
  const [bStr, cStr] = String(clientId).split('-')
  const b = parseInt(bStr) || 0
  const c = parseInt(cStr) || 0
  return c === 0 ? `堆${b}` : `堆${b}簇${c}`
}

function formatDirectionText(dir) {
  if (dir === 's2d') return '上位机->BAU'
  if (dir === 'd2s') return 'BAU->上位机'
  return String(dir || '')
}

function recordWrite(p, idVal, bytes) {
  totalWriteCount += 1
  lastWriteMeta = {
    path: p,
    id: idVal,
    bytes,
    ts: Date.now()
  }
}

function estimateRowBytes(topic, payloadHex) {
  return String(topic || '').length + String(payloadHex || '').length + 64
}

function updateMaxWindow(ms, now, getTs, setTs, getMax, setMax) {
  const prevTs = getTs()
  if (!prevTs || now - prevTs > 10 * 60 * 1000) {
    setMax(ms)
    setTs(now)
    return
  }
  if (ms > getMax()) {
    setMax(ms)
    setTs(now)
  }
}

function recordWriteBatch(p, lastIdVal, lastBytes, count) {
  totalWriteCount += count
  lastWriteMeta = {
    path: p,
    id: lastIdVal,
    bytes: lastBytes,
    ts: Date.now()
  }
}

export function getRawWriteStats() {
  return {
    totalWriteCount,
    lastWrite: lastWriteMeta,
    // 诊断：写盘是否“堆积”，以及单次写盘是否变慢
    pendingJobs,
    pendingBytesApprox,
    rotatingFilesCount: rotatingFiles.size,
    lastJobMs,
    maxJobMsRecent,
    lastQueueDelayMs,
    maxQueueDelayMsRecent
  }
}

let csvBuffer = []
let csvBufferBytes = 0
let csvBufferTimer = null
let csvFlushRunning = false
let csvOldestEnqueuedAt = 0
let rateTimer = null
let rateWindowStartTs = 0
let rateProduceBytesWin = 0
let rateProduceRowsWin = 0
let rateWriteBytesWin = 0
let rateWriteRowsWin = 0
let rateFlushCountWin = 0

function ensureRateTimer() {
  if (rateTimer) return
  rateWindowStartTs = Date.now()
  rateTimer = setInterval(() => {
    const now = Date.now()
    const intervalMs = now - rateWindowStartTs
    const backlogBytes = csvBufferBytes
    const backlogLines = csvBuffer.length
    const produceBps = intervalMs ? (rateProduceBytesWin * 1000) / intervalMs : 0
    const writeBps = intervalMs ? (rateWriteBytesWin * 1000) / intervalMs : 0
    const produceRps = intervalMs ? (rateProduceRowsWin * 1000) / intervalMs : 0
    const writeRps = intervalMs ? (rateWriteRowsWin * 1000) / intervalMs : 0
    try {
      if (rateProduceBytesWin > 0 || rateWriteBytesWin > 0 || backlogBytes > 0 || pendingJobs > 0) {
        console.log(
          `[ChildLog] raw-rate ${JSON.stringify({
            intervalMs,
            produceBps: Number(produceBps.toFixed(2)),
            writeBps: Number(writeBps.toFixed(2)),
            growthBps: Number((produceBps - writeBps).toFixed(2)),
            produceRps: Number(produceRps.toFixed(2)),
            writeRps: Number(writeRps.toFixed(2)),
            backlogBytes,
            backlogLines,
            flushCount: rateFlushCountWin,
            pendingJobs,
            pendingBytesApprox,
            lastJobMs,
            maxJobMsRecent,
            lastQueueDelayMs,
            maxQueueDelayMsRecent
          })}`
        )
      }
    } catch {}
    rateWindowStartTs = now
    rateProduceBytesWin = 0
    rateProduceRowsWin = 0
    rateWriteBytesWin = 0
    rateWriteRowsWin = 0
    rateFlushCountWin = 0
  }, 5000)
}

function updateDiskWarning() {
  const nowTs = Date.now()
  if (nowTs - lastDiskWarningTs > DISK_WARNING_COOLDOWN_MS) {
    try {
      if (process.connected) {
        process.send({ API: 'disk-space-warning' })
      }
    } catch {}
    lastDiskWarningTs = nowTs
  }
}

function enqueueCsvLine(entry) {
  ensureRateTimer()
  const enqueuedAt = entry.enqueuedAt || Date.now()
  if (!csvOldestEnqueuedAt) csvOldestEnqueuedAt = enqueuedAt
  csvBuffer.push(entry)
  csvBufferBytes += entry.bytes
  pendingJobs += 1
  pendingBytesApprox += entry.approxBytes
  if (!csvBufferTimer) {
    csvBufferTimer = setTimeout(() => {
      flushCsvBuffer().catch(() => {})
    }, CSV_BUFFER_INTERVAL)
  }
  if (csvBufferBytes >= CSV_BUFFER_MAX_BYTES) {
    clearTimeout(csvBufferTimer)
    csvBufferTimer = setTimeout(() => {
      flushCsvBuffer().catch(() => {})
    }, 0)
  }
}

async function flushCsvBuffer() {
  if (csvFlushRunning) return
  if (csvBufferTimer) {
    clearTimeout(csvBufferTimer)
    csvBufferTimer = null
  }
  if (csvBuffer.length === 0) return

  csvFlushRunning = true
  const batch = csvBuffer
  const batchBytes = csvBufferBytes
  const batchOldestEnqueuedAt = csvOldestEnqueuedAt
  csvBuffer = []
  csvBufferBytes = 0
  csvOldestEnqueuedAt = 0

  const startedAt = Date.now()
  const queueDelayMs = batchOldestEnqueuedAt ? startedAt - batchOldestEnqueuedAt : 0
  lastQueueDelayMs = queueDelayMs
  updateMaxWindow(
    queueDelayMs,
    startedAt,
    () => maxQueueDelayMsTs,
    (v) => (maxQueueDelayMsTs = v),
    () => maxQueueDelayMsRecent,
    (v) => (maxQueueDelayMsRecent = v)
  )

  const batchCount = batch.length
  let approxBytesSum = 0
  for (const it of batch) approxBytesSum += it.approxBytes

  try {
    const free = await getCachedFreeDiskSpace(getDir())
    if (free < MIN_FREE_SPACE && !bypassLowDiskCheck) {
      updateDiskWarning()
      return
    }
    if (free < MIN_FREE_SPACE && bypassLowDiskCheck) {
      updateDiskWarning()
    }

    let p = getFile()
    await rotateIfNeeded(p, batchBytes)
    p = getFile()
    await ensureGlobalHeader(p)
    const chunk = batch.map((x) => x.line).join('')
    await appendFileWithRetry(p, chunk)
    const last = batch[batch.length - 1]
    recordWriteBatch(p, last.idVal, last.bytes, batchCount)
    ensureRateTimer()
    rateWriteBytesWin += Buffer.byteLength(chunk, 'utf8')
    rateWriteRowsWin += batchCount
    rateFlushCountWin += 1
  } finally {
    const endedAt = Date.now()
    const jobMs = endedAt - startedAt
    lastJobMs = jobMs
    updateMaxWindow(
      jobMs,
      endedAt,
      () => maxJobMsTs,
      (v) => (maxJobMsTs = v),
      () => maxJobMsRecent,
      (v) => (maxJobMsRecent = v)
    )

    pendingJobs -= batchCount
    pendingBytesApprox -= approxBytesSum
    if (pendingJobs < 0) pendingJobs = 0
    if (pendingBytesApprox < 0) pendingBytesApprox = 0
    csvFlushRunning = false
    if (csvBuffer.length > 0 && !csvBufferTimer) {
      csvBufferTimer = setTimeout(() => {
        flushCsvBuffer().catch(() => {})
      }, 0)
    }
  }
}

/**
 * 将单向原始消息记录到CSV
 * @param {{topic:string,payloadHex:string,clientId:string|number,ts:number}} params - 消息参数
 * @returns {Promise<void>}
 */
export async function logMessage({ topic, payloadHex, clientId, ts }) {
  const idVal = ++globalIdCounter
  const tstr = formatDateTime(new Date(ts))
  const clientText = formatClientLabel(clientId)
  const payloadText = '"' + '0x' + String(payloadHex).toUpperCase().replace(/"/g, '""') + '"'
  const line = [idVal, tstr, '', topic, clientText, payloadText].join(',') + '\r\n'
  const bytes = Buffer.byteLength(line, 'utf8')
  ensureRateTimer()
  rateProduceBytesWin += bytes
  rateProduceRowsWin += 1
  enqueueCsvLine({
    idVal,
    line,
    bytes,
    approxBytes: estimateRowBytes(topic, payloadHex),
    enqueuedAt: Date.now()
  })
}
/**
 * 将任意方向原始消息记录到CSV
 * @param {{topic:string,payloadHex:string,clientId:string|number,ts:number,direction:'s2d'|'d2s'|string}} params - 消息参数
 * @returns {Promise<void>}
 */
export async function logAnyMessage({ topic, payloadHex, clientId, ts, direction }) {
  const idVal = ++globalIdCounter
  const tstr = formatDateTime(new Date(ts))
  const clientText = formatClientLabel(clientId)
  const payloadText = '"' + '0x' + String(payloadHex).toUpperCase().replace(/"/g, '""') + '"'
  const row =
    [idVal, tstr, formatDirectionText(direction), topic, clientText, payloadText].join(',') + '\r\n'
  const bytes = Buffer.byteLength(row, 'utf8')
  ensureRateTimer()
  rateProduceBytesWin += bytes
  rateProduceRowsWin += 1
  enqueueCsvLine({
    idVal,
    line: row,
    bytes,
    approxBytes: estimateRowBytes(topic, payloadHex),
    enqueuedAt: Date.now()
  })
}
// 监听来自主进程的磁盘空间决策（继续/停止）
try {
  process.on('message', (msg) => {
    if (msg && msg.API === 'disk-space-decision') {
      setDiskSpaceBypassRaw(msg.decision === 'continue')
    }
  })
} catch {}
