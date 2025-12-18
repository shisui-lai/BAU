;('use strict')
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')
const { exec } = require('child_process')
const { Mutex } = require('async-mutex') // 引入async-mutex库
const csvMutex = new Mutex()
let lastDiskCheckTime = 0
let lastDiskFreeSpace = Number.MAX_SAFE_INTEGER
const DISK_CHECK_INTERVAL = 60000 // 10秒检测一次
async function getCachedFreeDiskSpace(targetPath = process.cwd()) {
  const now = Date.now()
  const date = new Date(now)
  if (now - lastDiskCheckTime > DISK_CHECK_INTERVAL) {
    lastDiskFreeSpace = await getFreeDiskSpace(targetPath)
    /*   console.log(`${date}--${lastDiskFreeSpace}`) */
    lastDiskCheckTime = now
  }
  return lastDiskFreeSpace
}
function getFreeDiskSpace(targetPath = process.cwd()) {
  return new Promise((resolve) => {
    // 自动获取盘符（如 D:）
    const absPath = path.resolve(targetPath)
    const driveLetter = absPath.slice(0, 2) // 例如 D:
    exec(
      `wmic logicaldisk where DeviceID="${driveLetter}" get FreeSpace /value`,
      { encoding: 'utf8' },
      (err, stdout) => {
        if (err) {
          console.log('[磁盘检测] wmic命令出错:', err)
          resolve(Number.MAX_SAFE_INTEGER)
          return
        }
        const match = stdout.match(/FreeSpace=(\d+)/)
        if (match) {
          return resolve(parseInt(match[1], 10))
        } else {
          console.log('[磁盘检测] wmic输出无法解析:', stdout)
          resolve(Number.MAX_SAFE_INTEGER)
        }
      }
    )
  })
}
// 首次写入不等待用户决策的轻量重试版本（用于表头写入）
async function writeFileWithRetry(filePath, content) {
  let attempts = 0
  while (true) {
    try {
      // 使用 append 以便与后续 appendFileWithRetry 一致
      await fs.promises.appendFile(filePath, content, { encoding: 'utf8' })
      return
    } catch (err) {
      if (err.code === 'EBUSY') {
        // 轻量退避重试，不触发等待决策，避免阻塞持锁区
        attempts++
        const delayMs = Math.min(1000, 100 * attempts)
        await new Promise((r) => setTimeout(r, delayMs))
        continue
      }
      if (err.code === 'ENOENT') {
        // 目录不存在时尝试创建后重试
        try {
          ensureDir(path.dirname(filePath))
        } catch {}
        continue
      }
      throw err
    }
  }
}
function compressFileGzip(filePath) {
  return new Promise((resolve, reject) => {
    const gzip = zlib.createGzip() //
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
function formatDateTime(date, includeMs = false) {
  const pad = (n) => String(n).padStart(2, '0')
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  if (!includeMs) {
    return `${datePart}-${timePart}`
  }
  // 包含毫秒，格式：YYYY-MM-DD-HH:mm:ss.SSS
  const ms = pad(date.getMilliseconds(), 3)
  return `${datePart}-${timePart}.${ms}`
}
// Helper: 按 4 字符切 data
const splitData = (h) => {
  const arr = []
  for (let i = 0; i < h.length; i += 4) {
    arr.push(h.slice(i, i + 4))
  }
  return arr
}
function parseModbusFrame(hex) {
  const transactionID = hex.slice(0, 4)
  const protocol = hex.slice(4, 8)
  const length = hex.slice(8, 12)
  const unitID = hex.slice(12, 14)
  const func = hex.slice(14, 16)
  let addr = '/',
    qty = '/',
    byteCount = '/',
    dataFields = []
  // 读保持寄存器 03/04
  if (func === '03' || func === '04') {
    // 请求帧长度
    if (hex.length === 24) {
      addr = hex.slice(16, 20)
      qty = hex.slice(20, 24)
    } else {
      // 响应帧：byteCount 在功能码后 1 byte
      byteCount = hex.slice(16, 18)
      const dataHex = hex.slice(18, hex.length)
      dataFields = splitData(dataHex)
    }
  }
  // 写多个寄存器 0x10
  else if (func === '10') {
    // 请求帧最小长度 = 1+1+2+2+1+ N*2 +2 ≥ 10 bytes => hex ≥20 chars
    // 这里用 hex 长度 > 20 判断带数据的请求
    if (hex.length > 24) {
      addr = hex.slice(16, 20)
      qty = hex.slice(20, 24)
      byteCount = hex.slice(24, 26)
      const dataHex = hex.slice(26, hex.length)
      dataFields = splitData(dataHex)
    } else {
      // 从站回应，只回地址+数量
      addr = hex.slice(16, 20)
      qty = hex.slice(20, 24)
    }
  }
  /*   //console.log(dataHex.length, dataHex) */
  return { transactionID, protocol, length, unitID, func, addr, qty, byteCount, dataFields }
}
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
function formatFileSuffix(date) {
  const pad2 = (n) => String(n).padStart(2, '0')
  const YYYY = date.getFullYear()
  const MM = pad2(date.getMonth() + 1)
  const DD = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const mm = pad2(date.getMinutes())
  const ss = pad2(date.getSeconds())
  return `${YYYY}${MM}${DD}_${hh}_${mm}_${ss}`
}
let waitingForDecision = null
function waitForUserDecision() {
  // 如果已经有一个“正在等待”的 Promise，就复用它
  if (waitingForDecision) {
    return waitingForDecision
  }
  // 否则，新建一个 Promise 去监听一次“save-excel-decision”
  waitingForDecision = new Promise((resolve) => {
    function onMessage(msg) {
      if (msg && msg.API === 'save-excel-decision') {
        // 1）拿到决策后，先把它设回 null，允许下次重新创建
        waitingForDecision = null
        // 2）解除本次监听（once 会自动解绑，无需手动 remove）
        // 3）resolve 决策值
        resolve(msg.decision)
      }
    }
    process.once('message', onMessage)
  })
  return waitingForDecision
}
async function appendFileWithRetry(filePath, content) {
  let appended = false
  while (!appended) {
    try {
      await fs.promises.appendFile(filePath, content, { encoding: 'utf8' })
      appended = true
    } catch (err) {
      if (err.code === 'EBUSY') {
        const t0 = Date.now()
        process.send({ API: 'save-excel', filePath })
        console.warn(
          `[${formatDateTime(new Date(), true)}] [写入监控] EBUSY 触发，开始等待决策: ${filePath}`
        )
        await waitForUserDecision()
        const elapsed = Date.now() - t0
        console.warn(
          `[${formatDateTime(new Date(), true)}] [写入监控] 决策返回，耗时 ${elapsed}ms: ${filePath}`
        )
      } else {
        throw err
      }
    }
  }
}
// 辅助：把 Date 转成 'YYYYMMDD'
function daySuffix(date) {
  const pad2 = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
}
// 获取当前时间
function getFormattedDate() {
  const now = new Date()
  return now.toISOString().replace('T', ' ').substring(0, 19) // 格式化为 'YYYY-MM-DD HH:mm:ss'
}
// 写入日志
function writeToLog(logMessage) {
  const logFilePath = path.join(__dirname, 'debug_log.txt') // 日志文件路径
  const formattedMessage = `[${getFormattedDate()}] ${logMessage}\n`
  fs.appendFileSync(logFilePath, formattedMessage, 'utf8') // 将日志追加到文件
}
export {
  csvMutex,
  formatDateTime,
  parseModbusFrame,
  ensureDir,
  formatFileSuffix,
  waitForUserDecision,
  appendFileWithRetry,
  daySuffix,
  compressFileGzip,
  getCachedFreeDiskSpace,
  writeToLog,
  writeFileWithRetry
}
