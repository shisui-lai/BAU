import fs from 'fs'
import path from 'path'

const CHILD_DIR = path.join(process.cwd(), 'child-diagnostic-logs')

function ensureDir() {
  try {
    if (!fs.existsSync(CHILD_DIR)) fs.mkdirSync(CHILD_DIR, { recursive: true })
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

export function createChildLogFile() {
  ensureDir()
  const session = sessionStr()
  const file = path.join(CHILD_DIR, `mqtt-child-${session}.log`)
  try {
    const header = `${ts()} INFO child-session start {"cwd":${JSON.stringify(
      process.cwd()
    )},"argv":${JSON.stringify(process.argv)}}`
    fs.writeFileSync(file, header + '\n', 'utf8')
  } catch {}
  return file
}

export function appendChildLogLine(file, prefix, text) {
  if (!file) return
  const line = `${ts()} ${prefix} ${String(text || '')}`
  try {
    fs.promises.appendFile(file, line + '\n', { encoding: 'utf8' }).catch(() => {})
  } catch {}
}

export function appendChildStreamChunk(file, streamTag, buf) {
  if (!file || !buf) return
  try {
    const s = buf.toString('utf8')
    const parts = s.split(/\r?\n/)
    for (const p of parts) {
      if (!p) continue
      appendChildLogLine(file, streamTag, p)
    }
  } catch {}
}

export function getChildLogDir() {
  ensureDir()
  return CHILD_DIR
}
