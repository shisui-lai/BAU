// src/renderer/src/composables/useHardfaultRecord.js
// 文件作用：HardFault事件记录专用composable
// 功能：选目录、invoke 启动 MQTT 子进程读取（与事件记录流程类似）；写入 TXT 在子进程 hardfaultRecordExport 完成；
// 本页监听 hardfaultReadCompleted / hardfaultReadError；擦除仍走 mqttPublish + ERASE_HARDFAULT_RECORD_AREA
// 特点：独立模块，完全不影响现有event记录功能。代码简单，适合新人学习，后期易扩展
// 文件夹选择：必须与 event.vue 中「事件记录导出」一致，使用主进程已注册的
// choose-default-export-dir / set-default-export-dir / get-default-export-dir。
// 禁止使用 show-open-dialog：主进程里该通道写死为 openFile 且返回 fullPath，无 filePaths，会导致选目录后路径无法写入。

import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { ERROR_CODES } from '../../../main/table.js'
import {
  formatHardfaultExportedTime,
  getHardfaultReserved5LogLines
} from '../../../protocol/hardfaultTimeBcd.js'

/** 擦除固定 topic b1；读取下发在 MQTT 子进程 hardfaultRecordExport.startReadingHardfault 中完成 */
const HARDFAULT_ERASE_TOPIC = 'bms/host/s2d/b1/erase_hardfault_record_area'

/**
 * 将 u16 数值序列化为小端十六进制字符串（与 useRemoteCommand 中 u16 序列化一致）
 * @param {number} n - 例如控制字 574
 */
function u16ToLittleEndianHex(n) {
  const v = Number(n) & 0xffff
  const low = v & 0xff
  const high = (v >> 8) & 0xff
  return low.toString(16).padStart(2, '0') + high.toString(16).padStart(2, '0')
}

/**
 * Modbus CRC16计算函数（直接复制自 eventRecordExport.js 中的computeCRC16）
 * @param {number[]} data - 字节数组
 * @returns {number} CRC16值
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
 * HardFault记录验证（参考eventRecordExport.js的validateEventRecordCRC）
 * 预留：主进程转发解析结果并写 TXT 时调用
 * @param {Object} record - parseHardfaultRecordRAW返回的单条记录
 * @returns {boolean} 是否有效 (EventType===10000 && CRC通过)
 */
export function isValidHardfaultRecord(record) {
  try {
    if (!record || !record.baseConfig) return false

    // 事件类型必须为10000
    const eventType = Number(record.baseConfig.EventType || 0)
    if (eventType !== 10000) {
      console.warn(`[HardFault] 记录事件类型无效: ${eventType}，跳过`)
      return false
    }

    // CRC校验 - 使用parse后的rawBuffer或baseConfig中的CRC16字段
    const rawBuffer = record.rawBuffer
    if (!rawBuffer || rawBuffer.length !== 256) {
      console.warn('[HardFault] 记录数据长度无效，跳过')
      return false
    }

    // 前254字节用于CRC计算 (256-2=254字节数据 + 2字节CRC)
    const dataForCrc = rawBuffer.slice(0, 254)
    const expectedCrc = rawBuffer.readUInt16LE(254) // 最后2字节为CRC16 (小端)

    const actualCrc = computeCRC16(Array.from(dataForCrc))
    const isCrcValid = actualCrc === expectedCrc

    if (!isCrcValid) {
      console.warn(`[HardFault] CRC校验失败，期望:${expectedCrc.toString(16)}, 实际:${actualCrc.toString(16)}`)
    }

    return isCrcValid
  } catch (error) {
    console.error('[HardFault] 校验过程中出错:', error)
    return false
  }
}

/**
 * 从单条记录缓冲区读取小端 u32（与 Node Buffer.readUInt32LE 行为一致，便于渲染端独立生成 TXT）
 */
function readU32LEFromRecordBuf(buf, offset) {
  if (!buf || buf.length < offset + 4) return 0
  const b0 = buf[offset]
  const b1 = buf[offset + 1]
  const b2 = buf[offset + 2]
  const b3 = buf[offset + 3]
  return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0
}

/**
 * 从 rawBuffer 偏移 104 起输出 Call Stack 行（与 main/hardfaultRecordExport.js、table.js 定义一致）
 */
function formatCallStackTxtLine(rawBuffer, stackDepth) {
  const off = 104
  const maxFrames = 16
  let d = Math.floor(Number(stackDepth))
  if (!Number.isFinite(d) || d < 0) d = 0
  d = Math.min(d, maxFrames)
  if (!rawBuffer || rawBuffer.length < off + 64) {
    return `Call Stack (depth=${d}):`
  }
  const parts = []
  for (let i = 0; i < d; i++) {
    const addr = readU32LEFromRecordBuf(rawBuffer, off + i * 4)
    parts.push(`0x${addr.toString(16).toUpperCase().padStart(8, '0')}`)
  }
  return `Call Stack (depth=${d}): ${parts.join(' ')} `
}

/**
 * 生成HardFault TXT导出内容（与主进程 hardfaultRecordExport 及用户示例格式对齐）
 * @param {Array} validRecords - 有效记录数组
 * @returns {string} TXT内容
 */
export function generateHardfaultTxt(validRecords) {
  const lines = []

  lines.push('========================================')
  lines.push(`  HardFault Records (${validRecords.length} valid)`)
  lines.push('========================================')
  lines.push('')

  validRecords.forEach((record, index) => {
    const bc = record.baseConfig || {}
    const timeStr = formatHardfaultExportedTime(bc)
    const extraLines = getHardfaultReserved5LogLines(record.rawBuffer)

    lines.push(`[Record ${index + 1}]`)
    lines.push(`Software Ver: ${bc.SoftwareVersion || 'BAU-FC1.1.0-260416'}`)
    lines.push(`Time: ${timeStr}`)
    extraLines.forEach((ln) => lines.push(ln))
    lines.push(`R0 : 0x${(bc.R0 || 0).toString(16).padStart(8, '0').toUpperCase()}  R1 : 0x${(bc.R1 || 0).toString(16).padStart(8, '0').toUpperCase()}  R2 : 0x${(bc.R2 || 0).toString(16).padStart(8, '0').toUpperCase()}  R3 : 0x${(bc.R3 || 0).toString(16).padStart(8, '0').toUpperCase()}`)
    lines.push(`R12: 0x${(bc.R12 || 0).toString(16).padStart(8, '0').toUpperCase()}  LR : 0x${(bc.LR || 0).toString(16).padStart(8, '0').toUpperCase()}  PC : 0x${(bc.PC || 0).toString(16).padStart(8, '0').toUpperCase()}  PSR: 0x${(bc.PSR || 0).toString(16).padStart(8, '0').toUpperCase()}`)
    lines.push(`SYSHNDCTRL: 0x${(bc.SYSHNDCTRL || 0).toString(16).padStart(8, '0').toUpperCase()}  MFSR: 0x${(bc.MFSR || 0).toString(16).padStart(2, '0').toUpperCase()}  MMAR: 0x${(bc.MMAR || 0).toString(16).padStart(8, '0').toUpperCase()}  BFSR: 0x${(bc.BFSR || 0).toString(16).padStart(2, '0').toUpperCase()}  BFAR: 0x${(bc.BFAR || 0).toString(16).padStart(8, '0').toUpperCase()}`)
    lines.push(`UFSR: 0x${(bc.UFSR || 0).toString(16).padStart(4, '0').toUpperCase()}  HFSR: 0x${(bc.HFSR || 0).toString(16).padStart(8, '0').toUpperCase()}  DFSR: 0x${(bc.DFSR || 0).toString(16).padStart(8, '0').toUpperCase()}  AFSR: 0x${(bc.AFSR || 0).toString(16).padStart(8, '0').toUpperCase()}`)

    const depth = bc.StackDepth != null ? bc.StackDepth : 0
    lines.push(formatCallStackTxtLine(record.rawBuffer, depth))
    lines.push('')
  })

  lines.push('========================================')
  return lines.join('\n')
}

/** 主进程转发 MQTT 子进程消息时的 IPC 通道名（与 topic 后缀 erase_hardfault_record_area 的 toUpperCase 一致） */
const IPC_ERASE_HARDFAULT = 'ERASE_HARDFAULT_RECORD_AREA'
/** MQTT 子进程 hardfaultRecordExport 写 TXT 完成后发往主进程再转发渲染进程 */
const IPC_HARDFAULT_READ_COMPLETED = 'hardfaultReadCompleted'
/** 读取失败：错误码 / 超时 / 无有效记录 / 写盘失败 */
const IPC_HARDFAULT_READ_ERROR = 'hardfaultReadError'

export function useHardfaultRecord() {
  const { t } = useI18n()
  const toast = useToast()
  const exportDir = ref('')
  const validCount = ref(0)

  // 擦除存储区：弹窗校验密码为字符串「0574」（不在界面文案中展示具体密码）；下发控制字 574（u16 小端）
  const showErasePasswordDialog = ref(false)
  const erasePasswordInput = ref('')
  const erasePasswordError = ref(false)
  const isErasing = ref(false)

  // 与 event.vue 中 defaultDir 同步：主进程广播「导出目录已变更」时更新本卡片显示路径
  const onExportDirUpdated = (_, dir) => {
    if (dir) exportDir.value = dir
  }

  /**
   * MQTT 子进程已成功写 TXT（流程对齐事件记录：主进程/子进程落盘 → IPC 通知前端）
   */
  const onHardfaultReadCompleted = (_event, data) => {
    const n = data?.validCount ?? 0
    validCount.value = n
    toast.add({
      severity: 'success',
      summary: t('toast.common.executeSuccess'),
      detail: t('eventTime.hardfault.exportTxtSuccess', {
        fileName: data?.fileName || '',
        count: n
      }),
      life: 5000
    })
  }

  /**
   * 读取失败：单字节错误码 / 超时 / 校验无有效条数 / 写文件异常（与 readEventErrorFromMain 类似展示）
   */
  const onHardfaultReadError = (_event, data) => {
    let detail = data?.error || data?.message || t('toast.common.unknownError')
    if (data?.code !== undefined && data?.code !== null) {
      const code = data.code
      const codeHex = `0x${Number(code).toString(16).toUpperCase()}`
      const codeMsg =
        t(`toast.errorCodes.0x${Number(code).toString(16).toUpperCase()}`) ||
        ERROR_CODES[code] ||
        t('toast.blockRemoteCommand.unknownResponseCode', [Number(code).toString(16).toUpperCase()])
      detail = `${codeMsg} (${codeHex})`
    }
    toast.add({
      severity: 'error',
      summary: t('toast.common.executeFailed'),
      detail,
      life: 6000
    })
  }

  /**
   * 处理 BAU 对 erase_hardfault_record_area 的应答（1 字节应答码），弹出与堆遥控一致的 toast
   * 逻辑参考 BlockRemoteCommand.vue 中 handleRemoteCommandResponseWithToast
   */
  const onEraseHardfaultMqttResponse = (_event, msg) => {
    let dataType, data, blockId, topic
    if (msg?.data && msg.data.dataType) {
      dataType = msg.data.dataType
      data = msg.data.data
      blockId = msg.data.blockId
      topic = msg.data.topic
    } else {
      dataType = msg?.dataType
      data = msg?.data
      blockId = msg?.blockId
      topic = msg?.topic
    }
    if (!data) return
    const commandType = dataType ? String(dataType).toLowerCase() : ''
    if (commandType !== 'erase_hardfault_record_area') return
    if (!topic || !topic.includes('bms/bau/d2s')) return

    console.log('[HardFault] 收到 BAU 擦除存储区应答', { topic, blockId, data })

    const deviceName = t('toast.remoteControl.deviceName.block', { blockId })
    const commandName = t('blockRemoteCommandPage.commands.擦除hardfault事件记录存储区')

    if (data.error) {
      toast.add({
        severity: 'error',
        summary: t('toast.blockRemoteCommand.rcFailed'),
        detail: `${deviceName}: ${commandName} ${t('toast.blockRemoteCommand.executeFailed')} - ${data.message || t('blockRemoteCommandPage.statuses.unknown')}`,
        life: 6000
      })
      return
    }

    if (data.code !== undefined) {
      const isSuccess = data.code === 0xe0
      const codeHex = `0x${data.code.toString(16).toUpperCase()}`
      const codeMsg =
        t(`toast.errorCodes.0x${data.code.toString(16).toUpperCase()}`) ||
        ERROR_CODES[data.code] ||
        t('toast.blockRemoteCommand.unknownResponseCode', [data.code.toString(16).toUpperCase()])
      toast.add({
        severity: isSuccess ? 'success' : 'error',
        summary: isSuccess ? t('toast.blockRemoteCommand.rcSuccess') : t('toast.blockRemoteCommand.rcFailed'),
        detail: isSuccess
          ? `${deviceName}: ${commandName} ${t('toast.blockRemoteCommand.executeSuccess')} (${codeHex})`
          : `${deviceName}: ${commandName} ${codeMsg} (${codeHex})`,
        life: isSuccess ? 4000 : 6000
      })
    }
  }

  const openEraseHardfaultStorageDialog = () => {
    erasePasswordInput.value = ''
    erasePasswordError.value = false
    showErasePasswordDialog.value = true
  }

  const cancelEraseHardfaultStorage = () => {
    showErasePasswordDialog.value = false
    erasePasswordInput.value = ''
    erasePasswordError.value = false
  }

  /** 弹窗密码为「0574」；固定 topic b1 下发，不依赖堆遥控多选（与 blockRemoteCommandConfig 中固定 b1 一致） */
  const confirmEraseHardfaultStorage = async () => {
    if (String(erasePasswordInput.value).trim() !== '0574') {
      erasePasswordError.value = true
      return
    }
    erasePasswordError.value = false
    showErasePasswordDialog.value = false
    erasePasswordInput.value = ''
    isErasing.value = true
    try {
      const payloadHex = u16ToLittleEndianHex(574)
      if (!window.electronAPI?.mqttPublish) {
        throw new Error('mqttPublish 不可用')
      }
      // 与「读取」一致：便于在开发者工具中确认 topic / 载荷已发出（主进程 mqtt 子进程也会打 publish 日志）
      console.log('[HardFault] 准备下发擦除存储区命令', {
        topic: HARDFAULT_ERASE_TOPIC,
        payloadHex,
        controlWord: 574,
        note: 'u16 小端，等待 BAU 应答 topic: bms/bau/d2s/b1/erase_hardfault_record_area'
      })
      await window.electronAPI.mqttPublish(HARDFAULT_ERASE_TOPIC, payloadHex)
      console.log('[HardFault] 擦除命令已通过 mqttPublish 发出，等待 BAU 应答（IPC: ERASE_HARDFAULT_RECORD_AREA）')
      toast.add({
        severity: 'info',
        summary: t('toast.common.executeSuccess'),
        detail: t('eventTime.hardfault.eraseCmdSent'),
        life: 3000
      })
    } catch (e) {
      console.error('[HardFault] 擦除命令执行异常:', e)
      toast.add({
        severity: 'error',
        summary: t('toast.common.executeFailed'),
        detail: e?.message || String(e),
        life: 5000
      })
    } finally {
      isErasing.value = false
    }
  }

  // 读取：每次点击只负责 invoke 启动子进程下发一次 0xFF，不要求等应答才能再点（与 isErasing 互斥即可）
  const canRead = computed(() => !isErasing.value)
  const hasDir = computed(() => !!exportDir.value)

  // 选择文件夹（逻辑与 event.vue 的 chooseDefaultDir 一致：同一 IPC，便于与「事件记录导出」共用默认目录）
  const selectExportDir = async () => {
    try {
      const dir = await window.electron.ipcRenderer.invoke('choose-default-export-dir')
      if (dir) {
        exportDir.value = dir
        window.electron.ipcRenderer.send('set-default-export-dir', dir)
        console.log('[HardFault] 选择文件夹:', exportDir.value)
        toast.add({
          severity: 'success',
          summary: t('toast.common.executeSuccess'),
          detail: `导出目录已设置为: ${dir}`,
          life: 3000
        })
        return exportDir.value
      }
    } catch (error) {
      console.error('[HardFault] 选择文件夹失败:', error)
      toast.add({
        severity: 'error',
        summary: t('toast.common.executeFailed'),
        detail: error?.message || String(error),
        life: 3000
      })
    }
    return null
  }

  // 进入页面时拉取当前默认导出目录；并监听 export-dir-updated，与下方「事件记录导出」路径保持一致
  onMounted(async () => {
    try {
      const dir = await window.electron.ipcRenderer.invoke('get-default-export-dir')
      if (dir) exportDir.value = dir
    } catch (e) {
      console.warn('[HardFault] 获取默认导出目录失败:', e)
    }
    window.electron.ipcRenderer.on('export-dir-updated', onExportDirUpdated)
    window.electron.ipcRenderer.on(IPC_ERASE_HARDFAULT, onEraseHardfaultMqttResponse)
    window.electron.ipcRenderer.on(IPC_HARDFAULT_READ_COMPLETED, onHardfaultReadCompleted)
    window.electron.ipcRenderer.on(IPC_HARDFAULT_READ_ERROR, onHardfaultReadError)
  })

  onUnmounted(() => {
    window.electron.ipcRenderer.removeListener('export-dir-updated', onExportDirUpdated)
    window.electron.ipcRenderer.removeListener(IPC_ERASE_HARDFAULT, onEraseHardfaultMqttResponse)
    window.electron.ipcRenderer.removeListener(IPC_HARDFAULT_READ_COMPLETED, onHardfaultReadCompleted)
    window.electron.ipcRenderer.removeListener(IPC_HARDFAULT_READ_ERROR, onHardfaultReadError)
  })

  /**
   * 读取 HardFault：与事件记录类似，由主进程通知 MQTT 子进程 startReadingHardfault（置状态 + 下发 0xFF），
   * 应答在子进程解析、写 TXT 后通过 hardfaultReadCompleted / hardfaultReadError 通知本页。
   */
  const readHardfault = async () => {
    if (!exportDir.value) {
      const dir = await selectExportDir()
      if (!dir) {
        window.$message?.warning('请先选择保存文件夹')
        return
      }
    }

    try {
      if (!window.electronAPI?.ipc?.invoke) {
        throw new Error('ipc.invoke 不可用')
      }
      const res = await window.electronAPI.ipc.invoke('start-hardfault-read', {
        exportDir: exportDir.value,
        blockId: 1
      })
      if (!res?.success) {
        toast.add({
          severity: 'error',
          summary: t('toast.common.executeFailed'),
          detail: res?.error || t('toast.common.unknownError'),
          life: 5000
        })
        return
      }
      toast.add({
        severity: 'success',
        summary: t('toast.common.executeSuccess'),
        detail: t('eventTime.hardfault.readCmdSent'),
        life: 4000
      })
    } catch (error) {
      console.error('[HardFault] 启动读取失败:', error)
      toast.add({
        severity: 'error',
        summary: t('toast.common.executeFailed'),
        detail: error?.message || String(error),
        life: 5000
      })
    }
  }

  return reactive({
    exportDir,
    validCount,
    canRead,
    hasDir,
    selectExportDir,
    readHardfault,
    showErasePasswordDialog,
    erasePasswordInput,
    erasePasswordError,
    isErasing,
    openEraseHardfaultStorageDialog,
    confirmEraseHardfaultStorage,
    cancelEraseHardfaultStorage
  })
}
