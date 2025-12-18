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
let lastDiskWarningTs = 0
let bypassLowDiskCheck = false
export function setDiskSpaceBypassRaw(enabled) {
  bypassLowDiskCheck = !!enabled
}
let headerInitPromise = null
let headerInitPath = ''
let writeChain = Promise.resolve()
// 当前原始消息文件的时间后缀；压缩后会更新为新的时间戳以生成新文件名
let currentFileSuffix = SESSION_SUFFIX

function getDir() {
  const dir = RAW_EXPORT_DIR
  ensureDir(dir)
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
async function hasValidHeader(p) {
  try {
    const fd = await fs.promises.open(p, 'r')
    const buf = Buffer.alloc(1024)
    const { bytesRead } = await fd.read(buf, 0, 1024, 0)
    await fd.close()
    const head = buf.slice(0, bytesRead).toString('utf8')
    return head.startsWith('\uFEFF' + RAW_HEADER)
  } catch {
    return false
  }
}
/**
 * 按文件大小限制进行轮转与压缩
 * @param {string} p - 文件路径
 * @returns {Promise<void>}
 */
async function rotateIfNeeded(p) {
  try {
    const s = await fs.promises.stat(p)
    if (s.size >= FILE_SIZE_LIMIT) {
      await compressFileGzip(p)
      // 更新文件后缀，后续写入将使用新的文件名，避免与刚压缩的文件同名
      currentFileSuffix = new Date()
        ? (function () {
            const d = new Date()
            const pad = (n) => String(n).padStart(2, '0')
            return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`
          })()
        : SESSION_SUFFIX
      // 重置 header 初始化状态，让新文件能写入 BOM 表头
      headerInitPromise = null
      headerInitPath = ''
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
/**
 * 将单向原始消息记录到CSV
 * @param {{topic:string,payloadHex:string,clientId:string|number,ts:number}} params - 消息参数
 * @returns {Promise<void>}
 */
export async function logMessage({ topic, payloadHex, clientId, ts }) {
  let p = getFile()
  const job = async () => {
    const free = await getCachedFreeDiskSpace(getDir())
    if (free < MIN_FREE_SPACE && !bypassLowDiskCheck) {
      const nowTs = Date.now()
      if (nowTs - lastDiskWarningTs > DISK_WARNING_COOLDOWN_MS) {
        try {
          if (process.connected) {
            process.send({ API: 'disk-space-warning' })
          }
        } catch {}
        lastDiskWarningTs = nowTs
      }
      return
    }
    if (free < MIN_FREE_SPACE && bypassLowDiskCheck) {
      const nowTs = Date.now()
      if (nowTs - lastDiskWarningTs > DISK_WARNING_COOLDOWN_MS) {
        try {
          if (process.connected) {
            process.send({ API: 'disk-space-warning' })
          }
        } catch {}
        lastDiskWarningTs = nowTs
      }
      // 继续写入，不阻断
    }
    await rotateIfNeeded(p)
    // 轮转后重新计算目标文件路径
    p = getFile()
    const st = await fs.promises.stat(p).catch(() => null)
    if (st && st.size > 0) {
      const ok = await hasValidHeader(p)
      if (!ok) {
        await compressFileGzip(p)
        currentFileSuffix = (function () {
          const d = new Date()
          const pad = (n) => String(n).padStart(2, '0')
          return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`
        })()
        headerInitPromise = null
        headerInitPath = ''
        p = getFile()
      }
    }
    await ensureGlobalHeader(p)
    const idVal = ++globalIdCounter
    const tstr = formatDateTime(new Date(ts))
    const clientText = formatClientLabel(clientId)
    const payloadText = '"' + '0x' + String(payloadHex).toUpperCase().replace(/"/g, '""') + '"'
    const line = [idVal, tstr, '', topic, clientText, payloadText].join(',') + '\r\n'
    await appendFileWithRetry(p, line)
  }
  await (writeChain = writeChain.then(job))
}
/**
 * 将任意方向原始消息记录到CSV
 * @param {{topic:string,payloadHex:string,clientId:string|number,ts:number,direction:'s2d'|'d2s'|string}} params - 消息参数
 * @returns {Promise<void>}
 */
export async function logAnyMessage({ topic, payloadHex, clientId, ts, direction }) {
  let p = getFile()
  const job = async () => {
    const free = await getCachedFreeDiskSpace(getDir())
    if (free < MIN_FREE_SPACE && !bypassLowDiskCheck) {
      const nowTs = Date.now()
      if (nowTs - lastDiskWarningTs > DISK_WARNING_COOLDOWN_MS) {
        try {
          if (process.connected) {
            process.send({ API: 'disk-space-warning' })
          }
        } catch {}
        lastDiskWarningTs = nowTs
      }
      return
    }
    if (free < MIN_FREE_SPACE && bypassLowDiskCheck) {
      const nowTs = Date.now()
      if (nowTs - lastDiskWarningTs > DISK_WARNING_COOLDOWN_MS) {
        try {
          if (process.connected) {
            process.send({ API: 'disk-space-warning' })
          }
        } catch {}
        lastDiskWarningTs = nowTs
      }
      // 继续写入，不阻断
    }
    await rotateIfNeeded(p)
    // 轮转后重新计算目标文件路径
    p = getFile()
    const st = await fs.promises.stat(p).catch(() => null)
    if (st && st.size > 0) {
      const ok = await hasValidHeader(p)
      if (!ok) {
        await compressFileGzip(p)
        currentFileSuffix = (function () {
          const d = new Date()
          const pad = (n) => String(n).padStart(2, '0')
          return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`
        })()
        headerInitPromise = null
        headerInitPath = ''
        p = getFile()
      }
    }
    await ensureGlobalHeader(p)
    const idVal = ++globalIdCounter
    const tstr = formatDateTime(new Date(ts))
    const clientText = formatClientLabel(clientId)
    const payloadText = '"' + '0x' + String(payloadHex).toUpperCase().replace(/"/g, '""') + '"'
    const row =
      [idVal, tstr, formatDirectionText(direction), topic, clientText, payloadText].join(',') +
      '\r\n'
    await appendFileWithRetry(p, row)
  }
  await (writeChain = writeChain.then(job))
}
// 监听来自主进程的磁盘空间决策（继续/停止）
try {
  process.on('message', (msg) => {
    if (msg && msg.API === 'disk-space-decision') {
      setDiskSpaceBypassRaw(msg.decision === 'continue')
    }
  })
} catch {}
