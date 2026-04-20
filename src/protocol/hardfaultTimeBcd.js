// 文件作用：HardFault 记录时间与预留区文本的格式转换（BCD 时间 → 常见日期字符串；Reserved5 → 可打印日志行），供主进程导出与渲染端 composable 共用

/**
 * 单字节 BCD → 十进制（每半个字节为 0–9）
 * @param {number} byteVal 0–255
 * @returns {number|null} 合法为 0–99，非法半字节则 null
 */
function bcdByte(byteVal) {
  const x = Number(byteVal) & 0xff
  const hi = (x >> 4) & 0x0f
  const lo = x & 0x0f
  if (hi > 9 || lo > 9) return null
  return hi * 10 + lo
}

/**
 * 年字段 u16（小端）：协议为 BCD。常见两种——仅低字节为年后两位(0x26→26→2000+26)；或高、低字节各两位 BCD(0x20,0x26→2026)
 */
function decodeYearFromBcdU16(yearU16) {
  const n = Number(yearU16)
  if (!Number.isFinite(n)) return null
  const v = Math.trunc(n) & 0xffff
  // 若上层已得到自然年（例如 2026），直接使用
  if (v >= 2000 && v <= 2099) return v
  const lo = v & 0xff
  const hi = (v >> 8) & 0xff
  const bLo = bcdByte(lo)
  if (hi === 0 || hi === 0xff) {
    if (bLo === null) return null
    return 2000 + bLo
  }
  const bHi = bcdByte(hi)
  if (bHi === null || bLo === null) return null
  return bHi * 100 + bLo
}

/**
 * 月/日/时/分/秒：u16 小端，协议标注为 BCD；实测以低字节 BCD 为准（高字节常为 0）
 */
function decodeBcdU16LowByte(u16) {
  const n = Number(u16)
  if (!Number.isFinite(n)) return null
  const lo = Math.trunc(n) & 0xff
  const b = bcdByte(lo)
  return b !== null ? b : lo
}

function pad2(n) {
  return String(Math.max(0, Math.min(99, n))).padStart(2, '0')
}

/**
 * 将 baseConfig 中年月日时分秒转为 `YYYY-MM-DD HH:mm:ss`（与固件 BCD 约定一致）
 * @param {Record<string, unknown>} bc - parseHardfaultRecordRAW 单条 baseConfig
 * @returns {string}
 */
export function formatHardfaultExportedTime(bc) {
  const y = decodeYearFromBcdU16(bc.Year)
  const year = y != null && y > 0 ? y : 2026
  const month = decodeBcdU16LowByte(bc.Month) ?? 1
  const day = decodeBcdU16LowByte(bc.Day) ?? 1
  const hour = decodeBcdU16LowByte(bc.Hour) ?? 0
  const minute = decodeBcdU16LowByte(bc.Minute) ?? 0
  const second = decodeBcdU16LowByte(bc.Second) ?? 0
  return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
}

/** Reserved5 起始偏移与长度（与 table.js HARD_FAULT_RECORD_R 一致），止于 CRC16 之前 */
const RESERVED5_OFF = 168
const RESERVED5_LEN = 86

/**
 * 从单条 256 字节 raw 中解析预留区 ASCII 日志行（如 [CAN Task]），插在 Time 与 R 寄存器之间
 * @param {Buffer|Uint8Array} rawBuffer
 * @returns {string[]}
 */
export function getHardfaultReserved5LogLines(rawBuffer) {
  if (!rawBuffer || rawBuffer.length < RESERVED5_OFF + RESERVED5_LEN) return []
  const slice =
    typeof rawBuffer.subarray === 'function'
      ? rawBuffer.subarray(RESERVED5_OFF, RESERVED5_OFF + RESERVED5_LEN)
      : new Uint8Array(rawBuffer).subarray(RESERVED5_OFF, RESERVED5_OFF + RESERVED5_LEN)
  let s = ''
  for (let i = 0; i < slice.length; i++) {
    const c = slice[i]
    if (c === 0) continue
    if (c === 10 || c === 13) s += String.fromCharCode(c)
    else if (c >= 32 && c <= 126) s += String.fromCharCode(c)
  }
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}
