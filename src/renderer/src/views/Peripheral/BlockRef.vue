<template>
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripheral.ref.type') }}：</label>
      <Dropdown
        v-model="selectedRefType"
        :options="refTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripheral.ref.selectType')"
        class="w-20rem"
        
      />
    </div>
    
    
    <div
      v-for="(deviceDisplay, index) in deviceDisplayList"
      :key="index"
      class="container"
    >
      <DataTable :value="pairedRows(deviceDisplay)" showGridlines class="fixed-table">
        <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '25%' }">
          <template #body="{ data: row }">{{ row.left ? translateLabel(row.left) : '' }}</template>
        </Column>
        <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
          <template #body="{ data: row }">
            <span v-if="row.left" :class="{ 'fault-active': isFault(row.left) }">
              {{ formatValue(row.left) }}
            </span>
          </template>
        </Column>
        <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '25%' }">
          <template #body="{ data: row }">{{ row.right ? translateLabel(row.right) : '' }}</template>
        </Column>
        <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
          <template #body="{ data: row }">
            <span v-if="row.right" :class="{ 'fault-active': isFault(row.right) }">
              {{ formatValue(row.right) }}
            </span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlockStore } from '@/stores/device/blockStore.js'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection.js'
// 参考簇外设：进入页面自动读取堆“系统外围设备配置参数”并选择制冷设备类型
import { parseParameterReadResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { buildTemplateData, countWordsForFields, parseFieldTableData } from '@/composables/core/data-processing/common/useFieldTableParser'
import { REF_SANHETONGFEI_FIELDS, REF_YINGWEIKE_0513_FIELDS, REF_YINGWEIKE_70513_FIELDS, REF_KENUOWEI1_FIELDS, REF_KENUOWEI2_FIELDS, REF_JUNNENG_FIELDS } from '../../../../main/table.js'

const { t, te } = useI18n()

// 使用堆store
const blockStore = useBlockStore()

// 使用页面类型自动检测
usePageTypeDetection()

// 从堆store获取选中的堆ID
const selectedBlockId = computed(() => {
  const selected = blockStore.selectedBlockForView
  if (!selected) return null
  // 解析堆号：'block1' → 1
  return Number(selected.replace('block', ''))
})

const refDevices = ref([])
const refData = ref([])
const selectedRefType = ref(0)
const coolingDeviceCount = ref(1)
const configRefType = ref(null)
const hasUserSelection = ref(false)
const isSyncingFromConfig = ref(false)
let ipcListenerRegistered = false

const REF_TYPE_KEY_MAP = {
  0: 'none',
  1: 'sanhetongfei',
  2: 'yingweike0513',
  3: 'yingweike70513',
  4: 'kenuowei1',
  5: 'kenuowei2',
  6: 'junneng'
}

const currentRefTypeKey = computed(() => {
  return REF_TYPE_KEY_MAP[selectedRefType.value] || 'none'
})

const displayRefTypeKey = computed(() => {
  if (selectedRefType.value === 0) return 'sanhetongfei'
  return currentRefTypeKey.value
})

const refTypeOptions = computed(() => [
  { label: t('peripheral.ref.types.none'), value: 0 },
  { label: t('peripheral.ref.types.sanhetongfei'), value: 1 },
  { label: t('peripheral.ref.types.yingweike0513'), value: 2 },
  { label: t('peripheral.ref.types.yingweike70513'), value: 3 },
  { label: t('peripheral.ref.types.kenuowei1'), value: 4 },
  { label: t('peripheral.ref.types.kenuowei2'), value: 5 },
  { label: t('peripheral.ref.types.junneng'), value: 6 }
])

// 获取当前制冷设备型号的字段定义
const getCurrentRefFields = () => {
  switch (selectedRefType.value) {
    case 0:
    case 1:
      return REF_SANHETONGFEI_FIELDS
    case 2:
      return REF_YINGWEIKE_0513_FIELDS
    case 3:
      return REF_YINGWEIKE_70513_FIELDS
    case 4:
      return REF_KENUOWEI1_FIELDS
    case 5:
      return REF_KENUOWEI2_FIELDS
    case 6:
      return REF_JUNNENG_FIELDS
    default:
      return REF_SANHETONGFEI_FIELDS
  }
}

// 生成模板数据
const getTemplateData = () => {
  return buildTemplateData(getCurrentRefFields())
}

const getWordsPerDevice = () => {
  return countWordsForFields(getCurrentRefFields())
}

// 解析原始数据
const parseRawData = (rawData) => {
  return parseFieldTableData(rawData, getCurrentRefFields())
}

const deviceDisplayList = computed(() => {
  if (refDevices.value.length > 0) return refDevices.value
  const count = coolingDeviceCount.value && coolingDeviceCount.value > 0 ? coolingDeviceCount.value : 1
  const list = []
  for (let i = 0; i < count; i++) {
    list.push(getTemplateData())
  }
  return list
})

const pairedRows = (deviceDisplay) => {
  const arr = (deviceDisplay || []).filter(el => el?.hide !== true)
  const half = Math.ceil(arr.length / 2)
  const left = arr.slice(0, half)
  const right = arr.slice(half)
  const maxLen = Math.max(left.length, right.length)
  const rows = []
  for (let i = 0; i < maxLen; i++) {
    rows.push({ left: left[i], right: right[i] })
  }
  return rows
}

const handleRefData = (event, msg) => {
  if (!msg || msg.dataType !== 'BLOCK_REF' || msg.blockId !== selectedBlockId.value) return
  // 逻辑注释：当配置为“无制冷设备”时，仅展示模板结构，不更新实时数据
  if (selectedRefType.value === 0) return
  const raw = Array.isArray(msg.data) ? msg.data : []
  const wordsPerDevice = getWordsPerDevice()
  if (!wordsPerDevice) {
    refDevices.value = []
    return
  }
  const configuredCount = coolingDeviceCount.value && coolingDeviceCount.value > 0 ? coolingDeviceCount.value : 1
  const maxByLength = wordsPerDevice > 0 ? Math.floor(raw.length / wordsPerDevice) : 0
  const deviceCount = maxByLength > 0 ? Math.min(configuredCount, maxByLength) : 1
  const devices = []
  if (deviceCount === 1) {
    devices.push(parseRawData(raw))
  } else {
    for (let i = 0; i < deviceCount; i++) {
      const start = i * wordsPerDevice
      const end = start + wordsPerDevice
      const segment = raw.slice(start, end)
      devices.push(parseRawData(segment))
    }
  }
  refDevices.value = devices
  refData.value = devices[0] || []
}

// 注册IPC监听器
const registerListener = () => {
  if (ipcListenerRegistered || !window.electron?.ipcRenderer) {
    return
  }

  window.electron.ipcRenderer.removeAllListeners('BLOCK_REF')
  window.electron.ipcRenderer.on('BLOCK_REF', handleRefData)
  ipcListenerRegistered = true
}

// 注销IPC监听器
const unregisterListener = () => {
  if (!ipcListenerRegistered || !window.electron?.ipcRenderer) {
    return
  }

  window.electron.ipcRenderer.removeListener('BLOCK_REF', handleRefData)
  ipcListenerRegistered = false
}

// 逻辑注释：从堆“系统外围设备配置参数”中同步制冷设备类型（CoolingDeviceType）
const requestBlockCommDevCfg = () => {
  const blockId = selectedBlockId.value
  if (!blockId) return
  const topic = `bms/host/s2d/b${blockId}/block_comm_dev_cfg_r`
  window.electronAPI?.mqttPublish?.(topic, 'ff').catch(() => {})
}

const handleBlockCommDevCfg = (event, msg) => {
  if (!msg || msg.dataType !== 'BLOCK_COMM_DEV_CFG_R' || msg.blockId !== selectedBlockId.value) return
  const parsed = parseParameterReadResponse(msg, '[BlockPeripheral][CommDevCfg]', '系统外围设备配置参数')
  const data = parsed?.data || {}
  const coolingType = typeof data.CoolingDeviceType === 'number' ? data.CoolingDeviceType : null
  if (coolingType === null || Number.isNaN(coolingType)) return
  const normalized = coolingType >= 1 && coolingType <= 6 ? coolingType : 0
  configRefType.value = normalized
  const countRaw = typeof data.CoolingDeviceCount === 'number' ? data.CoolingDeviceCount : null
  if (countRaw === null || Number.isNaN(countRaw)) {
    coolingDeviceCount.value = 1
  } else {
    const num = Number(countRaw)
    coolingDeviceCount.value = num > 0 ? num : 1
  }
}

const registerCommDevListener = () => {
  const ipc = window.electron?.ipcRenderer
  if (!ipc) return
  ipc.on('BLOCK_COMM_DEV_CFG_R', handleBlockCommDevCfg)
}

const unregisterCommDevListener = () => {
  const ipc = window.electron?.ipcRenderer
  if (!ipc) return
  ipc.removeListener('BLOCK_COMM_DEV_CFG_R', handleBlockCommDevCfg)
}

const translateLabel = (el) => {
  if (!el) return ''
  if (el.parentKey !== undefined && el.bitIndex !== undefined) {
    if (el.parentKey === 'relayOutputStatus') {
      const commonKey = `peripheral.ref.common.bits.relayOutputStatus.${el.bitIndex}`
      if (te(commonKey)) return t(commonKey)
    }
    const typeKey = displayRefTypeKey.value
    const bitKeyTyped = `peripheral.ref.${typeKey}.bits.${el.parentKey}.${el.bitIndex}`
    if (te(bitKeyTyped)) return t(bitKeyTyped)
    if (el.key) {
      const fieldKeyTyped = `peripheral.ref.${typeKey}.fields.${el.key}`
      if (te(fieldKeyTyped)) return t(fieldKeyTyped)
    }
    return el.label || ''
  }
  if (el.key) {
    const typeKey = displayRefTypeKey.value
    const fieldKeyTyped = `peripheral.ref.${typeKey}.fields.${el.key}`
    return te(fieldKeyTyped) ? t(fieldKeyTyped) : (el.label || '')
  }
  return ''
}

// 格式化显示值
const formatValue = (el) => {
  if (!el) return '---'
  const value = el.value
  if (value === null || value === undefined || value === '---') return '---'

  if (el.key && el.map !== undefined && el.rawValue !== undefined) {
    const typeKey = displayRefTypeKey.value
    const mapKeyTyped = `peripheral.ref.${typeKey}.valueMap.${el.key}.${el.rawValue}`
    return te(mapKeyTyped) ? t(mapKeyTyped) : String(value)
  }

  return String(value)
}

const isFault = (el) => {
  if (!el) return false
  if (el.parentKey && el.parentKey.startsWith('faultStatus')) return el.rawValue === 1
  return false
}

// 生命周期钩子
onMounted(() => {
  registerListener()
  registerCommDevListener()
  // 页面加载时主动拉取一次堆侧系统外围设备配置
  requestBlockCommDevCfg()
})

onUnmounted(() => {
  unregisterListener()
  unregisterCommDevListener()
})

watch(
  () => selectedBlockId.value,
  (id) => {
    refDevices.value = []
    refData.value = []
    configRefType.value = null
    hasUserSelection.value = false
    selectedRefType.value = 0
    coolingDeviceCount.value = 1
    if (id) {
      requestBlockCommDevCfg()
    }
  }
)

watch(
  () => configRefType.value,
  (type) => {
    if (type === null || type === undefined) return
    if (hasUserSelection.value) return
    isSyncingFromConfig.value = true
    selectedRefType.value = type
    isSyncingFromConfig.value = false
  }
)

watch(
  () => selectedRefType.value,
  (type, oldType) => {
    if (type !== oldType && !isSyncingFromConfig.value) {
      hasUserSelection.value = true
    }
    if (type !== oldType && oldType !== null && oldType !== undefined) {
      refData.value = []
      refDevices.value = []
    }
  }
)
</script>

<style scoped>
.container {
  width: 100%;
  display: block;
}

.status-active {
  color: #28a745;
  font-weight: 600;
}

.status-inactive {
  color: #6c757d;
}

.fault-active {
  color: #dc3545;
  font-weight: 600;
}

.fixed-table .p-datatable-table {
  table-layout: fixed;
}
.fixed-table {
  width: 100%;
}
.value-col {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
