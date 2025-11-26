import fs from 'fs'
import zlib from 'zlib'
import path from 'path'
let waitingForDecision = null
export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
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
        try { ensureDir(path.dirname(filePath)) } catch {}
      } else {
        throw err
      }
    }
  }
}
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