import fs from 'fs'
import path from 'path'
import os from 'os'
import { shell } from 'electron'

const state = {
  enabled: process.env.BAU_LOG_ENABLED !== 'false',
  level: String(process.env.BAU_LOG_LEVEL || 'INFO').toUpperCase(),
  dir: '',
  file: '',
  session: ''
}

const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }

function ensureDir(d) {
  try {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
  } catch {}
}

function ts() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const padMs = (n) => String(n).padStart(3, '0')
  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  const ms = padMs(d.getMilliseconds())
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${ms}`
}

function sessionStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`
}

function shouldLog(lvl) {
  return state.enabled && levels[lvl] >= levels[state.level]
}

function serialize(obj) {
  try {
    if (obj === undefined || obj === null) return ''
    if (typeof obj === 'string') return obj
    return JSON.stringify(obj)
  } catch {
    return String(obj)
  }
}

async function write(line) {
  try {
    await fs.promises.appendFile(state.file, line + '\n', { encoding: 'utf8' })
  } catch {}
}

function log(lvl, tag, msg, meta) {
  if (!shouldLog(lvl)) return
  const line = `${ts()} ${lvl} ${String(tag || '')} ${serialize(msg)} ${serialize(meta)}`
  write(line)
}

function getProcessSnapshot() {
  const m = process.memoryUsage()
  const toMB = (n) => Number((Number(n || 0) / (1024 * 1024)).toFixed(1))
  return {
    rssMB: toMB(m.rss),
    heapUsedMB: toMB(m.heapUsed),
    heapTotalMB: toMB(m.heapTotal),
    externalMB: toMB(m.external),
    uptimeSec: Math.floor(process.uptime()),
    pid: process.pid
  }
}

function getSystemSnapshot() {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  const pct = Number(((used / total) * 100).toFixed(2))
  return {
    cpuCores: os.cpus().length,
    platform: process.platform,
    arch: process.arch,
    memTotalMB: Math.round(total / (1024 * 1024)),
    memFreeMB: Math.round(free / (1024 * 1024)),
    memUsedMB: Math.round(used / (1024 * 1024)),
    memUsagePercent: pct
  }
}

export const diagLogger = {
  init() {
    if (!state.enabled) return
    state.dir = path.join(process.cwd(), 'diagnostic-logs')
    ensureDir(state.dir)
    state.session = sessionStr()
    state.file = path.join(state.dir, `app-${state.session}.log`)
    log('INFO', 'logger-init', 'ready', { dir: state.dir, file: state.file, level: state.level })
    log('INFO', 'session-start', 'env', { cwd: process.cwd(), argv: process.argv })
    log('INFO', 'snapshot', 'start', { system: getSystemSnapshot(), process: getProcessSnapshot() })
  },
  setLevel(lvl) {
    const up = String(lvl || '').toUpperCase()
    if (up in levels) state.level = up
  },
  enable(flag) {
    state.enabled = !!flag
  },
  debug(tag, msg, meta) {
    log('DEBUG', tag, msg, meta)
  },
  info(tag, msg, meta) {
    log('INFO', tag, msg, meta)
  },
  warn(tag, msg, meta) {
    log('WARN', tag, msg, meta)
  },
  error(tag, msg, meta) {
    log('ERROR', tag, msg, meta)
  },
  snapshot(tag, extra) {
    log('INFO', tag || 'snapshot', 'process', { process: getProcessSnapshot(), extra })
  },
  crash(tag, err, extra) {
    const meta = {
      message: err && err.message,
      stack: err && err.stack,
      code: err && err.code,
      system: getSystemSnapshot(),
      process: getProcessSnapshot(),
      extra
    }
    log('ERROR', tag || 'crash', 'caught', meta)
  },
  getLogDir() {
    return state.dir
  },
  getCurrentFile() {
    return state.file
  },
  async getRecentLines(maxBytes = 1024 * 1024) {
    try {
      const st = await fs.promises.stat(state.file).catch(() => null)
      if (!st) return []
      const size = st.size
      const start = Math.max(0, size - maxBytes)
      const fd = await fs.promises.open(state.file, 'r')
      const buf = Buffer.alloc(size - start)
      await fd.read(buf, 0, buf.length, start)
      await fd.close()
      const text = buf.toString('utf8')
      const lines = text.split(/\r?\n/)
      return lines.slice(-1000)
    } catch {
      return []
    }
  },
  async openDir() {
    try {
      ensureDir(state.dir)
      await shell.openPath(state.dir)
    } catch {}
  }
}
