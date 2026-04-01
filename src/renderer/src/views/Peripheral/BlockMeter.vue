<template>
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripheral.meter.type') }}：</label>
      <Dropdown
        v-model="selectedMeterType"
        :options="meterTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripheral.meter.selectType')"
        class="w-20rem"
      />
    </div>

    <DataTable :value="pairedRows" showGridlines class="fixed-table">
      <Column :header="t('peripheral.meter.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ row.left ? translateLabel(row.left) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.meter.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          <span v-if="row.left" :class="{ 'fault-active': isFaultValue(row.left) }">
            {{ formatValue(row.left) }}
          </span>
        </template>
      </Column>
      <Column :header="t('peripheral.meter.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ row.right ? translateLabel(row.right) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.meter.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          <span v-if="row.right" :class="{ 'fault-active': isFaultValue(row.right) }">
            {{ formatValue(row.right) }}
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlockStore } from '@/stores/device/blockStore.js'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection.js'
import { METER_DTSD1352_FIELDS } from '../../../../main/table.js'
import { parseParameterReadResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { buildTemplateData, countWordsForFields, parseFieldTableData } from '@/composables/core/data-processing/common/useFieldTableParser'

const { t, te } = useI18n()
const blockStore = useBlockStore()
usePageTypeDetection()

const faultOnText = computed(() => t('faultOverview.hardwareLegend.faultOn'))

const selectedBlockId = computed(() => {
  const selected = blockStore.selectedBlockForView
  if (!selected) return null
  return Number(selected.replace('block', ''))
})

const meterData = ref([])
// 默认“无电表”，进入页面后从堆配置自动同步具体型号
const selectedMeterType = ref(0)
let ipcListenerRegistered = false

const meterTypeOptions = computed(() => [
  { label: t('peripheral.meter.types.none'), value: 0 },
  { label: t('peripheral.meter.types.dtsd1352'), value: 1 }
])

const METER_TYPE_KEY_MAP = {
  0: 'none',
  1: 'dtsd1352'
}

const currentMeterTypeKey = computed(() => {
  return METER_TYPE_KEY_MAP[selectedMeterType.value] || 'dtsd1352'
})

const displayMeterTypeKey = computed(() => {
  if (selectedMeterType.value === 0) return 'dtsd1352'
  return currentMeterTypeKey.value
})

const getCurrentMeterFields = () => {
  switch (selectedMeterType.value) {
    case 0:
    case 1:
      return METER_DTSD1352_FIELDS
    default:
      return METER_DTSD1352_FIELDS
  }
}

const getWordsPerDevice = () => {
  return countWordsForFields(getCurrentMeterFields())
}

const getTemplateData = () => {
  return buildTemplateData(getCurrentMeterFields())
}

const parseRawData = (rawData) => {
  return parseFieldTableData(rawData, getCurrentMeterFields())
}

const displayData = computed(() => (meterData.value.length > 0 ? meterData.value : getTemplateData()))

// 文字为“故障”或者“有故障”时显示红色
const isFaultTextMatched = (v) => {
  return v === faultOnText.value || v === '故障'
}

const isFaultValue = (field) => {
  const v = formatValue(field)
  if (!v || v === '---') return false
  return isFaultTextMatched(v)
}

const leftData = computed(() => {
  const arr = (displayData.value || []).filter(el => el?.hide !== true)
  const half = Math.ceil(arr.length / 2)
  return arr.slice(0, half)
})

const rightData = computed(() => {
  const arr = (displayData.value || []).filter(el => el?.hide !== true)
  const half = Math.ceil(arr.length / 2)
  return arr.slice(half)
})

const pairedRows = computed(() => {
  const maxLen = Math.max(leftData.value.length, rightData.value.length)
  const rows = []
  for (let i = 0; i < maxLen; i++) {
    rows.push({ left: leftData.value[i], right: rightData.value[i] })
  }
  return rows
})

const handleMeterData = (event, msg) => {
  if (!msg || msg.dataType !== 'BLOCK_METER' || msg.blockId !== selectedBlockId.value) return
  // 逻辑注释：无电表时只展示模板结构，不更新实时数值
  if (selectedMeterType.value === 0) return
  if (getWordsPerDevice() <= 0) return
  meterData.value = parseRawData(msg.data)
}

const registerListener = () => {
  if (ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeAllListeners('BLOCK_METER')
  window.electron.ipcRenderer.on('BLOCK_METER', handleMeterData)
  ipcListenerRegistered = true
}

const unregisterListener = () => {
  if (!ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeListener('BLOCK_METER', handleMeterData)
  ipcListenerRegistered = false
}

// 逻辑注释：从堆“系统外围设备配置参数”中同步电表类型（MeterType）
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
  const meterType = typeof data.MeterType === 'number' ? data.MeterType : null
  if (meterType === null || Number.isNaN(meterType)) return
  const normalized = meterType === 1 ? 1 : 0
  selectedMeterType.value = normalized
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

const translateLabel = (field) => {
  if (!field) return ''
  const typeKey = displayMeterTypeKey.value
  const fieldKey = `peripheral.meter.${typeKey}.fields.${field.key}`
  return te(fieldKey) ? t(fieldKey) : field.label || ''
}

const formatValue = (field) => {
  if (!field || field.value === null || field.value === undefined || field.value === '---') return '---'
  if (field.map !== undefined && field.rawValue !== undefined) {
    const typeKey = displayMeterTypeKey.value
    const mapKey = `peripheral.meter.${typeKey}.valueMap.${field.key}.${field.rawValue}`
    return te(mapKey) ? t(mapKey) : String(field.value)
  }
  return String(field.value)
}

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
    meterData.value = []
    selectedMeterType.value = 0
    if (id) {
      requestBlockCommDevCfg()
    }
  }
)

watch(
  () => selectedMeterType.value,
  (type, oldType) => {
    if (type !== oldType && oldType !== null && oldType !== undefined) {
      meterData.value = []
    }
  }
)
</script>

<style scoped>
.fixed-table .p-datatable-table { table-layout: fixed; }
.value-col { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fault-active {
  color: #dc3545;
  font-weight: 600;
}
</style>
