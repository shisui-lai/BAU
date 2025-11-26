import fs from 'fs'
import path from 'path'
import { appendFileWithRetry, ensureDir, compressFileGzip, formatDateTime } from './utils'
import { RAW_EXPORT_DIR, SESSION_SUFFIX } from './paths'

const RAW_HEADER = ['ID', '时间', '方向', '主题', '设备', 'PayloadHex'].join(',')

let globalIdCounter = 0
const FILE_SIZE_LIMIT = 500 * 1024 * 1024
let headerInitPromise = null
let headerInitPath = ''
let writeChain = Promise.resolve()

function getDir() {
  const dir = RAW_EXPORT_DIR
  ensureDir(dir)
  return dir
}
function getFile() {
  return path.join(getDir(), `Raw_Messages_${SESSION_SUFFIX}.csv`)
}
async function rotateIfNeeded(p) {
  try {
    const s = await fs.promises.stat(p)
    if (s.size >= FILE_SIZE_LIMIT) {
      await compressFileGzip(p)
    }
  } catch {}
}

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

export async function logMessage({ topic, payloadHex, clientId, ts }) {
  const p = getFile()
  const job = async () => {
    await rotateIfNeeded(p)
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

export async function logAnyMessage({ topic, payloadHex, clientId, ts, direction }) {
  const p = getFile()
  const job = async () => {
    await rotateIfNeeded(p)
    await ensureGlobalHeader(p)
    const idVal = ++globalIdCounter
    const tstr = formatDateTime(new Date(ts))
    const clientText = formatClientLabel(clientId)
    const payloadText = '"' + '0x' + String(payloadHex).toUpperCase().replace(/"/g, '""') + '"'
    const row = [idVal, tstr, formatDirectionText(direction), topic, clientText, payloadText].join(',') + '\r\n'
    await appendFileWithRetry(p, row)
  }
  await (writeChain = writeChain.then(job))
}
