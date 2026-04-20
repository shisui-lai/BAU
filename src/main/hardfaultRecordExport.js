// 文件作用：MQTT 子进程内完成 HardFault 读取指令下发、应答校验、生成与示例一致的 TXT 并 IPC 通知渲染进程
/**
 * HardFault 事件
 * 文件作用：与 eventRecordExport 类似，在 MQTT 子进程内维护「正在读取」状态、下发 0xFF、在收到
 * bms/bau/d2s/bM/hardfault_record_r 应答后校验、写 TXT 到用户选定目录，并通过 IPC 通知渲染进程。
 */

const fs = require('fs')
const path = require('path')

import {
  formatHardfaultExportedTime,
  getHardfaultReserved5LogLines
} from '../protocol/hardfaultTimeBcd.js'

// ========== 状态（仅子进程） ==========
/** 每次成功 publish 后入队一条保存目录；收到应答时 shift，与请求顺序对应，支持连续多次下发 0xFF */
const pendingHardfaultSaveDirs = []
let hardfaultReadingBlockId = null
/** @type {ReturnType<typeof setTimeout>|null} */
let hardfaultResponseTimeout = null

/** 自最后一次成功下发起，等待 BAU 应答的最长时间（毫秒） */
const HARDFAULT_RESPONSE_TIMEOUT_MS = 60000

function clearHardfaultTimeout() {
  if (hardfaultResponseTimeout) {
    clearTimeout(hardfaultResponseTimeout)
    hardfaultResponseTimeout = null
  }
}

/** 仍有未应答请求时滚动刷新超时（从最后一次下发起算） */
function scheduleHardfaultTimeout(blockId) {
  clearHardfaultTimeout()
  hardfaultResponseTimeout = setTimeout(() => {
    if (pendingHardfaultSaveDirs.length === 0) return
    const n = pendingHardfaultSaveDirs.length
    pendingHardfaultSaveDirs.length = 0
    try {
      process.send({
        type: 'hardfaultReadError',
        data: {
          blockId: hardfaultReadingBlockId ?? blockId,
          error: `读取超时，未收到 BAU 应答（${n} 次请求）`
        }
      })
    } catch (e) {
      console.error('[MQTT Child] hardfaultReadError(超时) IPC 发送失败:', e)
    }
  }, HARDFAULT_RESPONSE_TIMEOUT_MS)
}

/**
 * 供 mqtt.js 判断：是否有尚未收到应答的下发（与 event_record_r 的 isReadingEvent 类似，但允许多次入队）
 */
export function getHardfaultReadingState() {
  return {
    isReadingHardfault: pendingHardfaultSaveDirs.length > 0,
    hardfaultReadingBlockId
  }
}

/**
 * Modbus CRC16（与 eventRecordExport / 渲染端 composable 一致）
 */
function computeCRC16(data) {
  let crc = 0xffff
  for (let b of data) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      if (crc & 0x0001) {
        crc = (crc >>> 1) ^ 0xa001
      } else {
        crc = crc >>> 1
      }
    }
  }
  return crc
}

/**
 * 单条记录是否有效：EventType===10000 且 CRC16 通过（与 useHardfaultRecord 一致）
 */
function isValidHardfaultRecord(record) {
  try {
    if (!record || !record.baseConfig) return false
    const eventType = Number(record.baseConfig.EventType || 0)
    if (eventType !== 10000) return false
    const rawBuffer = record.rawBuffer
    if (!rawBuffer || rawBuffer.length !== 256) return false
    const dataForCrc = rawBuffer.slice(0, 254)
    const expectedCrc = rawBuffer.readUInt16LE(254)
    const actualCrc = computeCRC16(Array.from(dataForCrc))
    return actualCrc === expectedCrc
  } catch {
    return false
  }
}

/**
 * 从 rawBuffer 偏移 104 起按小端 u32 输出调用栈（与 table.js HARD_FAULT_RECORD_R 中 Call Stack 定义一致）
 * @param {Buffer} rawBuffer - 单条 256 字节记录
 * @param {number} stackDepth - StackDepth 字段，最大 16
 */
function formatCallStackTxtLine(rawBuffer, stackDepth) {
  const maxFrames = 16
  let d = Math.floor(Number(stackDepth))
  if (!Number.isFinite(d) || d < 0) d = 0
  d = Math.min(d, maxFrames)
  const off = 104
  if (!rawBuffer || rawBuffer.length < off + 64) {
    return `Call Stack (depth=${d}):`
  }
  const parts = []
  for (let i = 0; i < d; i++) {
    const addr = rawBuffer.readUInt32LE(off + i * 4)
    parts.push(`0x${addr.toString(16).toUpperCase().padStart(8, '0')}`)
  }
  // 与用户示例一致：行末保留一个空格
  return `Call Stack (depth=${d}): ${parts.join(' ')} `
}

/**
 * 生成 TXT 正文（与渲染端 generateHardfaultTxt 格式一致，便于维护）
 */
function generateHardfaultTxt(validRecords) {
  const lines = []
  lines.push('========================================')
  lines.push(`  HardFault Records (${validRecords.length} valid)`)
  lines.push('========================================')
  lines.push('')

  validRecords.forEach((record, index) => {
    const bc = record.baseConfig || {}
    // 年月日时分秒为 BCD（见 table.js 注释），不可直接当十进制拼字符串
    const timeStr = formatHardfaultExportedTime(bc)
    const extraLines = getHardfaultReserved5LogLines(record.rawBuffer)

    lines.push(`[Record ${index + 1}]`)
    lines.push(`Software Ver: ${bc.SoftwareVersion || 'BAU-FC1.1.0-260416'}`)
    lines.push(`Time: ${timeStr}`)
    // 固件可将附加日志写入 Reserved5（偏移 168），导出时插在 Time 与寄存器之间（如无内容则不输出）
    extraLines.forEach((ln) => lines.push(ln))
    lines.push(
      `R0 : 0x${(bc.R0 || 0).toString(16).padStart(8, '0').toUpperCase()}  R1 : 0x${(bc.R1 || 0).toString(16).padStart(8, '0').toUpperCase()}  R2 : 0x${(bc.R2 || 0).toString(16).padStart(8, '0').toUpperCase()}  R3 : 0x${(bc.R3 || 0).toString(16).padStart(8, '0').toUpperCase()}`
    )
    lines.push(
      `R12: 0x${(bc.R12 || 0).toString(16).padStart(8, '0').toUpperCase()}  LR : 0x${(bc.LR || 0).toString(16).padStart(8, '0').toUpperCase()}  PC : 0x${(bc.PC || 0).toString(16).padStart(8, '0').toUpperCase()}  PSR: 0x${(bc.PSR || 0).toString(16).padStart(8, '0').toUpperCase()}`
    )
    lines.push(
      `SYSHNDCTRL: 0x${(bc.SYSHNDCTRL || 0).toString(16).padStart(8, '0').toUpperCase()}  MFSR: 0x${(bc.MFSR || 0).toString(16).padStart(2, '0').toUpperCase()}  MMAR: 0x${(bc.MMAR || 0).toString(16).padStart(8, '0').toUpperCase()}  BFSR: 0x${(bc.BFSR || 0).toString(16).padStart(2, '0').toUpperCase()}  BFAR: 0x${(bc.BFAR || 0).toString(16).padStart(8, '0').toUpperCase()}`
    )
    lines.push(
      `UFSR: 0x${(bc.UFSR || 0).toString(16).padStart(4, '0').toUpperCase()}  HFSR: 0x${(bc.HFSR || 0).toString(16).padStart(8, '0').toUpperCase()}  DFSR: 0x${(bc.DFSR || 0).toString(16).padStart(8, '0').toUpperCase()}  AFSR: 0x${(bc.AFSR || 0).toString(16).padStart(8, '0').toUpperCase()}`
    )
    const depth = bc.StackDepth != null ? bc.StackDepth : 0
    lines.push(formatCallStackTxtLine(record.rawBuffer, depth))
    lines.push('')
  })

  lines.push('========================================')
  return lines.join('\n')
}

/**
 * 开始读取：下发 0xFF；每次点击独立入队，不必等上一次应答（与事件记录批量不同，数据量小）
 */
export function startReadingHardfault(exportDir, blockId, client) {
  if (!client) {
    throw new Error('MQTT客户端未初始化')
  }

  try {
    console.log(
      `[ChildLog] hardfault-start {"block":${blockId},"dir":${JSON.stringify(exportDir || '')},"pending":${pendingHardfaultSaveDirs.length}}`
    )
  } catch {}

  hardfaultReadingBlockId = blockId
  const saveDir = exportDir || ''

  const topic = `bms/host/s2d/b${blockId}/hardfault_record_r`
  const payloadBuf = Buffer.from('ff', 'hex')

  client.publish(topic, payloadBuf, (err) => {
    if (err) {
      console.error('[MQTT Child] HardFault 下发失败:', err)
      try {
        process.send({
          type: 'hardfaultReadError',
          data: {
            blockId,
            error: err.message || 'MQTT 发布失败'
          }
        })
      } catch (e) {
        console.error('[MQTT Child] hardfaultReadError IPC 发送失败:', e)
      }
      return
    }
    pendingHardfaultSaveDirs.push(saveDir)
    scheduleHardfaultTimeout(blockId)
  })
}

/**
 * 处理 parseHardfaultRecordRAW / withResponseCheck 的完整 result（与 processEventRecordResponse 接收解析结果类似）
 * @param {object} result - parse 函数返回值，含 error、records、data、baseConfig
 */
export function processHardfaultRecordResponse(result, blockId) {
  if (hardfaultReadingBlockId !== blockId) {
    return
  }
  if (pendingHardfaultSaveDirs.length === 0) {
    return
  }

  const saveDir = pendingHardfaultSaveDirs.shift()
  if (pendingHardfaultSaveDirs.length === 0) {
    clearHardfaultTimeout()
  } else {
    scheduleHardfaultTimeout(blockId)
  }

  // 1 字节错误码（与 withResponseCheck 一致）
  if (result.error) {
    const code = result.data?.code
    const message = result.data?.message || '未知错误'
    try {
      process.send({
        type: 'hardfaultReadError',
        data: {
          blockId,
          code,
          message
        }
      })
    } catch (e) {
      console.error('[MQTT Child] hardfaultReadError IPC 发送失败:', e)
    }
    return
  }

  const records = result.records || []
  const validRecords = records.filter((r) => isValidHardfaultRecord(r))

  if (validRecords.length === 0) {
    try {
      process.send({
        type: 'hardfaultReadError',
        data: {
          blockId,
          error: '没有通过校验的有效 HardFault 记录'
        }
      })
    } catch (e) {
      console.error('[MQTT Child] hardfaultReadError IPC 发送失败:', e)
    }
    return
  }

  try {
    if (!saveDir) {
      throw new Error('保存目录为空')
    }
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true })
    }
    const now = new Date()
    const timeStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')
    const fileName = `hardfault_record_${timeStr}.txt`
    const filePath = path.join(saveDir, fileName)
    const txt = generateHardfaultTxt(validRecords)
    fs.writeFileSync(filePath, txt, 'utf8')
    console.log(`[MQTT Child] HardFault TXT 已写入: ${filePath}, 有效条数=${validRecords.length}`)

    process.send({
      type: 'hardfaultReadCompleted',
      data: {
        blockId,
        filePath,
        fileName,
        validCount: validRecords.length
      }
    })
  } catch (e) {
    console.error('[MQTT Child] HardFault 写文件失败:', e)
    try {
      process.send({
        type: 'hardfaultReadError',
        data: {
          blockId,
          error: e?.message || String(e)
        }
      })
    } catch (err) {
      console.error('[MQTT Child] hardfaultReadError IPC 发送失败:', err)
    }
  }
}
