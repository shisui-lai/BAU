// 本文件：堆级「堆IO状态」页面数据 composable — 消费 block_io_status 与 block_di_do_flexcfg_remap 的 IPC 数据并组装展示行
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { BLOCK_IO_STATUS } from '../../../../../../main/table.js'

export const blockIOFrames = reactive(new Map<string, Map<string, any[]>>())

/** 每一项 IO 的 field key → DIDO 附录中的「硬件 DI 通道编号」 */
const IO_ITEM_KEY_TO_HW_DI_CHANNEL: Record<string, number> = {
  di1Feedback: 1,
  di2Feedback: 2,
  di3Feedback: 3,
  di4Feedback: 4,
  di5Feedback: 5,
  di6Feedback: 6,
  di00Status: 9,
  di01Status: 10,
  di02Status: 11,
  di03Status: 12,
  di04Status: 13,
  di05Status: 14,
  di06Status: 15,
  di07Status: 16,
  di10Status: 17,
  di11Status: 18,
  di12Status: 19,
  di13Status: 20,
  di14Status: 21,
  di15Status: 22,
  di16Status: 23,
  di17Status: 24
}

/** 每一项 IO 的 field key → DIDO 附录中的「硬件 DO 通道编号」 */
const IO_ITEM_KEY_TO_HW_DO_CHANNEL: Record<string, number> = {
  do1Status: 1,
  do2Status: 2,
  do00Status: 9,
  do01Status: 10,
  do02Status: 11,
  do03Status: 12,
  do04Status: 13,
  do05Status: 14,
  do06Status: 15,
  do07Status: 16,
  do10Status: 17,
  do11Status: 18,
  do12Status: 19,
  do13Status: 20,
  do14Status: 21,
  do15Status: 22,
  do16Status: 23,
  do17Status: 24
}

/** 硬件 DI 通道编号 → 界面展示名（与 DIDO 附录一致，含预留） */
const HW_DI_CHANNEL_LABEL: Record<number, string> = {
  1: 'DI 1',
  2: 'DI 2',
  3: 'DI 3',
  4: 'DI 4',
  5: 'DI 5',
  6: 'DI 6',
  7: '预留',
  8: '预留',
  9: 'DI0.0',
  10: 'DI0.1',
  11: 'DI0.2',
  12: 'DI0.3',
  13: 'DI0.4',
  14: 'DI0.5',
  15: 'DI0.6',
  16: 'DI0.7',
  17: 'DI1.0',
  18: 'DI1.1',
  19: 'DI1.2',
  20: 'DI1.3',
  21: 'DI1.4',
  22: 'DI1.5',
  23: 'DI1.6',
  24: 'DI1.7'
}
for (let h = 25; h <= 32; h++) HW_DI_CHANNEL_LABEL[h] = '预留'

/** 硬件 DO 通道编号 → 界面展示名 */
const HW_DO_CHANNEL_LABEL: Record<number, string> = {
  1: 'DO 1',
  2: 'DO 2',
  3: '预留',
  4: '预留',
  5: '预留',
  6: '预留',
  7: '预留',
  8: '预留',
  9: 'DO0.0',
  10: 'DO0.1',
  11: 'DO0.2',
  12: 'DO0.3',
  13: 'DO0.4',
  14: 'DO0.5',
  15: 'DO0.6',
  16: 'DO0.7',
  17: 'DO1.0',
  18: 'DO1.1',
  19: 'DO1.2',
  20: 'DO1.3',
  21: 'DO1.4',
  22: 'DO1.5',
  23: 'DO1.6',
  24: 'DO1.7'
}
for (let h = 25; h <= 32; h++) HW_DO_CHANNEL_LABEL[h] = '预留'

export type BlockFlexChannelMaps = {
  /** 硬件通道号 → 信号名编号（DI，1–15 有效） */
  diByHwChannel: Map<number, number>
  /** 硬件通道号 → 信号名编号（DO，1–9 有效） */
  doByHwChannel: Map<number, number>
}

/** 按 blockKey（如 block1）缓存 flex 映射，独立于 block_io_status 帧 */
export const blockIOFlexMaps = reactive(new Map<string, BlockFlexChannelMaps>())

function resolveBlockKey(selectedBlock?: any): string {
  // 说明：block_io_status 目前仅按 b1 上报。
  // 因此堆IO页面无论切换到哪个堆（例如 b2），都只能展示 b1 的数据。
  // 这里强制始终返回 block1，避免切堆后取不到 block2 的缓存而显示空数据。
  return 'block1'
}

/**
 * 将 block_di_do_flexcfg_remap 解析结果（groupByClass 数组）转为「硬件通道 → 信号名编号」查找表。
 * 同一通道若出现多条映射，后以 DEVICE 上报顺序覆盖前一条（与 MQTT 帧内顺序一致）。
 */
export function buildFlexChannelMapsFromGrouped(grouped: any): BlockFlexChannelMaps {
  const diByHwChannel = new Map<number, number>()
  const doByHwChannel = new Map<number, number>()
  if (!Array.isArray(grouped)) {
    return { diByHwChannel, doByHwChannel }
  }
  for (const section of grouped) {
    const isDi = section.class === 'DI配置映射'
    const isDo = section.class === 'DO配置映射'
    if (!isDi && !isDo) continue
    for (const el of section.element || []) {
      const raw = Number(el.value)
      if (!Number.isFinite(raw)) continue
      const u = raw & 0xffff
      const nameId = u & 0xff
      const ch = (u >> 8) & 0xff
      if (ch < 1 || ch > 32) continue
      if (isDi) diByHwChannel.set(ch, nameId)
      else doByHwChannel.set(ch, nameId)
    }
  }
  return { diByHwChannel, doByHwChannel }
}

export function parseBlockFlexCfg(msg: any) {
  const { blockId, data } = msg || {}
  if (data == null || blockId == null) return
  const blockKey = `block${blockId}`
  const maps = buildFlexChannelMapsFromGrouped(data)
  blockIOFlexMaps.set(blockKey, maps)
}

export function parseBlockIO(msg: any) {
  const { blockId, data } = msg
  if (!data) return

  const blockKey = `block${blockId}`

  const groupedData = groupBlockIOByClass(data)

  const dataMap = new Map<string, any[]>()
  Object.entries(groupedData).forEach(([key, value]) => {
    dataMap.set(key, value)
  })
  blockIOFrames.set(blockKey, dataMap)
}

function groupBlockIOByClass(data: any): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}

  if (Array.isArray(data)) {
    for (const section of data) {
      const classKey = section.class
      if (!grouped[classKey]) {
        grouped[classKey] = []
      }

      for (const element of section.element) {
        const fieldDef = BLOCK_IO_STATUS.find((field) => field.label === element.label)
        if (!fieldDef) continue

        const keyLower = (fieldDef.key || '').toLowerCase()
        const labelLower = (fieldDef.label || '').toLowerCase()

        if (
          keyLower.includes('_reserve') ||
          keyLower.includes('reserve') ||
          keyLower.includes('skip') ||
          labelLower.includes('预留') ||
          labelLower.includes('保留') ||
          labelLower.includes('跳过')
        ) {
          continue
        }

        if (fieldDef.type === 'bit' || (fieldDef.type === 'u16' && fieldDef.class === 'I/O心跳')) {
          grouped[classKey].push({
            key: fieldDef.key,
            label: fieldDef.label,
            value: element.value,
            unit: (fieldDef as any).unit || '',
            remark: (fieldDef as any).remarks || '',
            scale: (fieldDef as any).scale || 1,
            type: fieldDef.type,
            bitsOf: (fieldDef as any).bitsOf,
            bit: (fieldDef as any).bit,
            class: fieldDef.class
          })
        }
      }
    }
  } else {
    for (const [key, value] of Object.entries(data)) {
      const fieldDef = BLOCK_IO_STATUS.find((field) => field.key === key)
      if (!fieldDef) continue

      const keyLower = (fieldDef.key || '').toLowerCase()
      const labelLower = (fieldDef.label || '').toLowerCase()

      if (
        keyLower.includes('_reserve') ||
        keyLower.includes('reserve') ||
        keyLower.includes('skip') ||
        labelLower.includes('预留') ||
        labelLower.includes('保留') ||
        labelLower.includes('跳过')
      ) {
        continue
      }

      const classKey = fieldDef.class
      if (!grouped[classKey]) {
        grouped[classKey] = []
      }

      if (fieldDef.type === 'bit' || (fieldDef.type === 'u16' && fieldDef.class === 'I/O心跳')) {
        grouped[classKey].push({
          key,
          label: fieldDef.label,
          value,
          unit: (fieldDef as any).unit || '',
          remark: (fieldDef as any).remarks || '',
          scale: (fieldDef as any).scale || 1,
          type: fieldDef.type,
          bitsOf: (fieldDef as any).bitsOf,
          bit: (fieldDef as any).bit,
          class: fieldDef.class
        })
      }
    }
  }

  return grouped
}

export function pickBlockIO(key: string, classes: string[]) {
  const frame = blockIOFrames.get(key)
  if (!frame) return {}

  const result: Record<string, any[]> = {}
  for (const className of classes) {
    const classData = frame.get(className)
    if (classData) {
      result[className] = classData
    }
  }
  return result
}

export function getBlockIOStatus(blockId: number): boolean {
  const blockKey = `block${blockId}`
  return blockIOFrames.has(blockKey)
}

export function useBlockIO(selectedBlock?: any) {
  const blockIOData = ref(null)
  const isLoading = ref(false)
  const { t } = useI18n()

  const blockKey = computed(() => resolveBlockKey(selectedBlock))

  const handleBlockIOMessage = (_event: any, payload: any) => {
    parseBlockIO(payload)
  }

  const handleFlexcfgMessage = (_event: any, payload: any) => {
    parseBlockFlexCfg(payload)
  }

  const systemDI = computed(() => {
    const data = pickBlockIO(blockKey.value, ['系统DI输入状态'])
    return data['系统DI输入状态'] || []
  })

  const systemDO = computed(() => {
    const data = pickBlockIO(blockKey.value, ['系统DO输出状态'])
    return data['系统DO输出状态'] || []
  })

  const ioControlDI = computed(() => {
    const data = pickBlockIO(blockKey.value, ['I/O控制板-DI'])
    return data['I/O控制板-DI'] || []
  })

  const ioControlDO = computed(() => {
    const data = pickBlockIO(blockKey.value, ['I/O控制板-DO'])
    return data['I/O控制板-DO'] || []
  })

  const ioHeartbeat = computed(() => {
    const data = pickBlockIO(blockKey.value, ['I/O心跳'])
    return data['I/O心跳'] || []
  })

  /**
   * 副标题：仅当已收到 block_di_do_flexcfg_remap 且该硬件通道有有效信号编号时显示「信号名 · 通道」；
   * 未上报映射表、或该通道未配置/有效编号为 0 时返回空串（页面上不显示该行副标题）。
   */
  const flexCaptionForItem = (item: any) => {
    const key = item?.key
    if (!key) return ''

    const maps = blockIOFlexMaps.get(blockKey.value)
    // 整表未上报：不显示副标题
    if (!maps) return ''

    let hw = 0
    let isDo = false
    if (IO_ITEM_KEY_TO_HW_DI_CHANNEL[key] != null) {
      hw = IO_ITEM_KEY_TO_HW_DI_CHANNEL[key]
    } else if (IO_ITEM_KEY_TO_HW_DO_CHANNEL[key] != null) {
      hw = IO_ITEM_KEY_TO_HW_DO_CHANNEL[key]
      isDo = true
    } else {
      return ''
    }

    const nameId = isDo ? maps.doByHwChannel.get(hw) : maps.diByHwChannel.get(hw)

    // 该通道未出现在映射表、或信号编号为 0：不显示副标题
    if (nameId == null || nameId === 0) return ''

    const chLabel = isDo ? HW_DO_CHANNEL_LABEL[hw] || `CH ${hw}` : HW_DI_CHANNEL_LABEL[hw] || `CH ${hw}`
    const sigPath = isDo ? `blockIOStatusPage.flexSignals.do.${nameId}` : `blockIOStatusPage.flexSignals.di.${nameId}`
    const sigName = t(sigPath)
    return t('blockIOStatusPage.messages.flexMapLine', { signal: sigName, channel: chLabel })
  }

  const getIOStatusText = (value: any) => {
    if (value === 1 || value === true) return '激活'
    if (value === 0 || value === false) return '未激活'
    return '未知'
  }

  const getIOStatusSeverity = (value: any) => {
    if (value === 1 || value === true) return 'success'
    if (value === 0 || value === false) return 'info'
    return 'warning'
  }

  onMounted(() => {
    const ipc = (window as any).electron?.ipcRenderer
    if (!ipc) return
    ipc.on('BLOCK_IO_STATUS', handleBlockIOMessage)
    ipc.on('BLOCK_DI_DO_FLEXCFG_REMAP', handleFlexcfgMessage)
  })

  onUnmounted(() => {
    const ipc = (window as any).electron?.ipcRenderer
    if (!ipc) return
    ipc.removeListener('BLOCK_IO_STATUS', handleBlockIOMessage)
    ipc.removeListener('BLOCK_DI_DO_FLEXCFG_REMAP', handleFlexcfgMessage)
  })

  return {
    blockIOData,
    systemDI,
    systemDO,
    ioControlDI,
    ioControlDO,
    ioHeartbeat,
    isLoading,
    getIOStatusText,
    getIOStatusSeverity,
    flexCaptionForItem
  }
}
