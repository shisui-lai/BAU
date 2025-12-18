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
    function onMessage(msg) {
      if (msg && msg.API === 'save-excel-decision') {
        waitingForDecision = null
        resolve(msg.decision)
      }
    }
    process.once('message', onMessage)
  })
  return waitingForDecision
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
        process.send && process.send({ API: 'save-excel', filePath })
        await waitForUserDecision()
      } else if (err.code === 'ENOENT') {
        try {
          ensureDir(path.dirname(filePath))
        } catch {}
      } else {
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
