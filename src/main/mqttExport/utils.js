/**
 * 文件与时间工具函数
 *
 * 提供：
 * - 目录与文件：ensureDir、appendFileWithRetry（处理 EBUSY/ENOENT，确保父目录与重试）
 * - 时间格式：formatFileSuffix、formatDateTime（用于目录/文件命名与导出时间）
 * - 压缩：compressFileGzip（原始报文/大文件轮转时使用）
 * - 磁盘空间：getCachedFreeDiskSpace（WMIC 读取磁盘剩余空间，带缓存与检查间隔）
 */
import fs from 'fs'
import zlib from 'zlib'
import path from 'path'
import { exec } from 'child_process'
let waitingForDecision = null
let decisionMessageHandler = null
/**
 * 确保目录存在（递归创建）
 * @param {string} dir - 目录路径
 * @returns {void}
 */
export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
/**
 * 生成用于文件/目录命名的时间后缀
 * @param {Date} date - 时间对象
 * @returns {string} 形如 YYYYMMDD_HH_mm_ss 的字符串
 */
export function formatFileSuffix(date) {
  const pad2 = (n) => String(n).padStart(2, '0')
  const YYYY = date.getFullYear()
  const MM = pad2(date.getMonth() + 1)
  const DD = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const mm = pad2(date.getMinutes())
  const ss = pad2(date.getSeconds())
  return `${YYYY}${MM}${DD}_${hh}_${mm}_${ss}`
}
/**
 * 格式化导出时间字符串
 * @param {Date} date - 时间对象
 * @returns {string} 形如 YYYY-MM-DD-HH:MM:SS 的字符串
 */
export function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const H = pad(date.getHours())
  const M = pad(date.getMinutes())
  const S = pad(date.getSeconds())
  return `${y}-${m}-${d}-${H}:${M}:${S}`
}
function waitForUserDecision() {
  if (waitingForDecision) return waitingForDecision
  waitingForDecision = new Promise((resolve) => {
    decisionMessageHandler = (msg) => {
      if (msg && msg.API === 'save-excel-decision') {
        try {
          process.off('message', decisionMessageHandler)
        } catch {}
        decisionMessageHandler = null
        waitingForDecision = null
        resolve(msg.decision)
      }
    }
    process.on('message', decisionMessageHandler)
  })
  return waitingForDecision
}
export function isWaitingForUserDecision() {
  return !!waitingForDecision
}
const diag = {
  wait: { active: false, sessionId: '', startedTs: 0, lastDecision: '' },
  io: { lastErrorCode: '', filePath: '', ts: 0, sentSaveExcel: false },
  raw: { skippedCount: 0, lastSkipReason: '', lastTs: 0, lastRotateTs: 0, lastNewFile: '' },
  semantic: { skippedCount: 0, lastClearedCount: 0, lastTs: 0 },
  exportCfg: { raw: false, semantic: false, lastUpdateTs: 0 },
  disk: { lastFreeSpace: Number.MAX_SAFE_INTEGER, belowThreshold: false, lastWarningTs: 0 },
  mqtt: { connected: false, reconnecting: false, lastMsgTs: 0, lastError: '', lastUpdateTs: 0 },
  resource: { rssMB: 0, heapUsedMB: 0, heapTotalMB: 0, lastUpdateTs: 0 },
  event: { reading: false, sent: 0, done: 0, error: false, lastUpdateTs: 0 }
}
export function markWaitStarted(filePath) {
  diag.wait.active = true
  diag.wait.sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  diag.wait.startedTs = Date.now()
  diag.io.filePath = String(filePath || '')
}
export function markIoError(code, filePath) {
  diag.io.lastErrorCode = String(code || '')
  diag.io.filePath = String(filePath || '')
  diag.io.ts = Date.now()
}
export function markRawSkipped(reason) {
  diag.raw.skippedCount++
  diag.raw.lastSkipReason = String(reason || '')
  diag.raw.lastTs = Date.now()
}
export function markRawRotate(newFilePath) {
  diag.raw.lastRotateTs = Date.now()
  diag.raw.lastNewFile = String(newFilePath || '')
}
export function markSemanticSkipped() {
  diag.semantic.skippedCount++
  diag.semantic.lastTs = Date.now()
}
export function markSemanticCleared(count) {
  diag.semantic.lastClearedCount = Number(count || 0)
  diag.semantic.lastTs = Date.now()
}
export function updateExportEnabled(raw, semantic) {
  diag.exportCfg.raw = !!raw
  diag.exportCfg.semantic = !!semantic
  diag.exportCfg.lastUpdateTs = Date.now()
}
export function updateFreeSpace(space, below) {
  diag.disk.lastFreeSpace = Number(space)
  diag.disk.belowThreshold = !!below
  diag.disk.lastWarningTs = Date.now()
}
export function updateMqttStatus(connected, reconnecting, lastMsgTs, lastError) {
  diag.mqtt.connected = !!connected
  diag.mqtt.reconnecting = !!reconnecting
  diag.mqtt.lastMsgTs = Number(lastMsgTs || 0)
  diag.mqtt.lastError = String(lastError || '')
  diag.mqtt.lastUpdateTs = Date.now()
}
export function updateResource(rssBytes, heapUsedBytes, heapTotalBytes) {
  const MB = 1024 * 1024
  diag.resource.rssMB = Number((Number(rssBytes || 0) / MB).toFixed(1))
  diag.resource.heapUsedMB = Number((Number(heapUsedBytes || 0) / MB).toFixed(1))
  diag.resource.heapTotalMB = Number((Number(heapTotalBytes || 0) / MB).toFixed(1))
  diag.resource.lastUpdateTs = Date.now()
}
export function markEventStatus(reading, sentCount, doneCount, errorFlag) {
  diag.event.reading = !!reading
  diag.event.sent = Number(sentCount || 0)
  diag.event.done = Number(doneCount || 0)
  diag.event.error = !!errorFlag
  diag.event.lastUpdateTs = Date.now()
}
export function getDiagnosticsSnapshot() {
  return {
    wait: diag.wait,
    io: diag.io,
    raw: diag.raw,
    semantic: diag.semantic,
    exportCfg: diag.exportCfg,
    disk: diag.disk,
    mqtt: diag.mqtt,
    resource: diag.resource,
    event: diag.event
  }
}
export function formatCrashSummary(type, info) {
  const ts = new Date().toISOString()
  const s = getDiagnosticsSnapshot()
  const parts = []
  parts.push(`ts=${ts}`)
  parts.push(`type=${String(type || '')}`)
  parts.push(`code=${String(info || '')}`)
  parts.push(
    `wait={active:${s.wait.active},decision:${s.wait.lastDecision},session:${s.wait.sessionId},ts:${s.wait.startedTs}}`
  )
  parts.push(
    `io={code:${s.io.lastErrorCode},path:${s.io.filePath},ts:${s.io.ts},sent:${s.io.sentSaveExcel}}`
  )
  parts.push(
    `raw={skipped:${s.raw.skippedCount},reason:${s.raw.lastSkipReason},ts:${s.raw.lastTs},rotateTs:${s.raw.lastRotateTs},new:${s.raw.lastNewFile}}`
  )
  parts.push(
    `semantic={skipped:${s.semantic.skippedCount},cleared:${s.semantic.lastClearedCount},ts:${s.semantic.lastTs}}`
  )
  parts.push(
    `cfg={raw:${s.exportCfg.raw},semantic:${s.exportCfg.semantic},ts:${s.exportCfg.lastUpdateTs}}`
  )
  parts.push(
    `disk={free:${s.disk.lastFreeSpace},below:${s.disk.belowThreshold},ts:${s.disk.lastWarningTs}}`
  )
  parts.push(
    `mqtt={connected:${s.mqtt.connected},reconnecting:${s.mqtt.reconnecting},lastMsgTs:${s.mqtt.lastMsgTs},err:${s.mqtt.lastError}}`
  )
  parts.push(
    `res={rssMB:${s.resource.rssMB},heapMB:${s.resource.heapUsedMB}/${s.resource.heapTotalMB}}`
  )
  parts.push(
    `event={reading:${s.event.reading},sent:${s.event.sent},done:${s.event.done},error:${s.event.error}}`
  )
  return `[CRASH_SUMMARY] ${parts.join(' ')}`
}
/**
 * 追加写入文件（带重试与父目录创建）
 * @param {string} filePath - 目标文件路径
 * @param {string} content - 写入内容
 * @returns {Promise<void>}
 */
export async function appendFileWithRetry(filePath, content) {
  let appended = false
  while (!appended) {
    try {
      await fs.promises.appendFile(filePath, content, { encoding: 'utf8' })
      appended = true
    } catch (err) {
      if (err.code === 'EBUSY') {
        if (!isWaitingForUserDecision()) {
          markWaitStarted(filePath)
          markIoError('EBUSY', filePath)
          if (process.send) {
            process.send({ API: 'save-excel', filePath })
            diag.io.sentSaveExcel = true
          }
        }
        const decision = await waitForUserDecision()
        if (decision === 'cancel') {
          return
        }
      } else if (err.code === 'ENOENT') {
        try {
          ensureDir(path.dirname(filePath))
        } catch {}
      } else {
        markIoError(err.code || 'UNKNOWN', filePath)
        throw err
      }
    }
  }
}
/**
 * 使用 gzip 压缩文件并删除原文件
 * @param {string} filePath - 目标文件路径
 * @returns {Promise<string>} 压缩后的 .gz 文件路径
 */
export function compressFileGzip(filePath) {
  return new Promise((resolve, reject) => {
    const gzip = zlib.createGzip()
    const input = fs.createReadStream(filePath)
    const output = fs.createWriteStream(filePath + '.gz')
    input.pipe(gzip).pipe(output)
    output.on('finish', () => {
      fs.unlink(filePath, (err) => {
        if (err) return reject(err)
        resolve(filePath + '.gz')
      })
    })
    output.on('error', reject)
    input.on('error', reject)
    gzip.on('error', reject)
  })
}
let lastDiskCheckTime = 0
let lastDiskFreeSpace = Number.MAX_SAFE_INTEGER
const DISK_CHECK_INTERVAL = parseInt(process.env.DISK_CHECK_INTERVAL_MS || '60000', 10)
/**
 * 读取指定盘的剩余空间（WMIC），返回字节数
 * @param {string} [targetPath=process.cwd()] - 目标路径（用于推断盘符）
 * @returns {Promise<number>} 剩余空间字节数
 */
export function getFreeDiskSpace(targetPath = process.cwd()) {
  return new Promise((resolve) => {
    const absPath = path.resolve(targetPath)
    const driveLetter = absPath.slice(0, 2)
    exec(
      `wmic logicaldisk where DeviceID="${driveLetter}" get FreeSpace /value`,
      { encoding: 'utf8' },
      (err, stdout) => {
        if (err) {
          resolve(Number.MAX_SAFE_INTEGER)
          return
        }
        const match = stdout.match(/FreeSpace=(\d+)/)
        if (match) {
          resolve(parseInt(match[1], 10))
        } else {
          resolve(Number.MAX_SAFE_INTEGER)
        }
      }
    )
  })
}
/**
 * 带缓存的剩余空间读取（按间隔更新）
 * @param {string} [targetPath=process.cwd()] - 目标路径（用于推断盘符）
 * @returns {Promise<number>} 剩余空间字节数（可能是缓存值）
 */
export async function getCachedFreeDiskSpace(targetPath = process.cwd()) {
  const now = Date.now()
  if (now - lastDiskCheckTime > DISK_CHECK_INTERVAL) {
    lastDiskFreeSpace = await getFreeDiskSpace(targetPath)
    lastDiskCheckTime = now
  }
  return lastDiskFreeSpace
}
export function getDiagnosticsForTestOnly() {
  return diag
}
