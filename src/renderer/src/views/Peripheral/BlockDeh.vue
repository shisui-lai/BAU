<template>
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripheral.deh.type') }}：</label>
      <Dropdown
        v-model="selectedDehType"
        :options="dehTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripheral.deh.selectType')"
        class="w-20rem"
      />
    </div>

    <DataTable :value="pairedRows" showGridlines class="fixed-table">
      <Column :header="t('peripheral.deh.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">{{ row.left ? translateLabel(row.left) : '' }}</template>
      </Column>
      <Column :header="t('peripheral.deh.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          <span v-if="row.left" :class="{ 'fault-active': isFaultValue(row.left) }">
            {{ formatValue(row.left) }}
          </span>
        </template>
      </Column>
      <Column :header="t('peripheral.deh.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">{{ row.right ? translateLabel(row.right) : '' }}</template>
      </Column>
      <Column :header="t('peripheral.deh.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
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
import { parseParameterReadResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { buildTemplateData, countWordsForFields, parseFieldTableData } from '@/composables/core/data-processing/common/useFieldTableParser'
import { DEH_SANHETONGFEI_FIELDS, DEH_YINGWEIKE_U3EC_FIELDS, DEH_EJ000113_FIELDS } from '../../../../main/table.js'

const { t, te } = useI18n()
const blockStore = useBlockStore()
usePageTypeDetection()

const faultOnText = computed(() => t('faultOverview.hardwareLegend.faultOn'))

const selectedBlockId = computed(() => {
  const selected = blockStore.selectedBlockForView
  if (!selected) return null
  return Number(selected.replace('block', ''))
})

const dehData = ref([])
// 默认“无除湿空调”，进入页面后从堆配置自动同步具体型号
const selectedDehType = ref(0)
let ipcListenerRegistered = false

const DEH_TYPE_KEY_MAP = {
  0: 'none',
  1: 'sanhetongfei',
  2: 'yingweikeU3EC',
  3: 'ej000113'
}

const currentDehTypeKey = computed(() => {
  return DEH_TYPE_KEY_MAP[selectedDehType.value] || 'none'
})

const displayDehTypeKey = computed(() => {
  if (selectedDehType.value === 0) return 'sanhetongfei'
  return currentDehTypeKey.value
})

const dehTypeOptions = computed(() => [
  { label: t('peripheral.deh.types.none'), value: 0 },
  { label: t('peripheral.deh.types.sanhetongfei'), value: 1 },
  { label: t('peripheral.deh.types.yingweikeU3EC'), value: 2 },
  { label: t('peripheral.deh.types.ej000113'), value: 3 }
])

const getCurrentDehFields = () => {
  switch (selectedDehType.value) {
    case 0:
    case 1:
      return DEH_SANHETONGFEI_FIELDS
    case 2:
      return DEH_YINGWEIKE_U3EC_FIELDS
    case 3:
      return DEH_EJ000113_FIELDS
    default:
      return DEH_SANHETONGFEI_FIELDS
  }
}

const getWordsPerDevice = () => {
  return countWordsForFields(getCurrentDehFields())
}

const getTemplateData = () => {
  return buildTemplateData(getCurrentDehFields())
}

const parseRawData = (rawData) => {
  return parseFieldTableData(rawData, getCurrentDehFields())
}

const displayData = computed(() => dehData.value.length > 0 ? dehData.value : getTemplateData())

// 文字为“故障”或者“有故障”时显示红色
const isFaultTextMatched = (v) => {
  return v === faultOnText.value || v === '故障'
}

const isFaultValue = (field) => {
  const v = formatValue(field)
  if (!v || v === '---') return false
  return isFaultTextMatched(v)
}

const leftData = computed(() => { const arr = (displayData.value || []).filter(el => el?.hide !== true); const half = Math.ceil(arr.length / 2); return arr.slice(0, half) })
const rightData = computed(() => { const arr = (displayData.value || []).filter(el => el?.hide !== true); const half = Math.ceil(arr.length / 2); return arr.slice(half) })
const pairedRows = computed(() => { const maxLen = Math.max(leftData.value.length, rightData.value.length); const rows = []; for (let i=0;i<maxLen;i++) rows.push({ left: leftData.value[i], right: rightData.value[i] }); return rows })

const handleDehData = (event, msg) => {
  if (!msg || msg.dataType !== 'BLOCK_DEH' || msg.blockId !== selectedBlockId.value) return
  // 逻辑注释：当配置为“无除湿空调”时，仅展示模板结构，不更新实时数据
  if (selectedDehType.value === 0) return
  if (getWordsPerDevice() <= 0) return
  dehData.value = parseRawData(msg.data)
}

const registerListener = () => {
  if (ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeAllListeners('BLOCK_DEH')
  window.electron.ipcRenderer.on('BLOCK_DEH', handleDehData)
  ipcListenerRegistered = true
}
const unregisterListener = () => {
  if (!ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeListener('BLOCK_DEH', handleDehData)
  ipcListenerRegistered = false
}

// 逻辑注释：从堆“系统外围设备配置参数”中同步除湿空调类型（DehumidifierType）
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
  const dehType = typeof data.DehumidifierType === 'number' ? data.DehumidifierType : null
  if (dehType === null || Number.isNaN(dehType)) return
  const normalized = dehType >= 1 && dehType <= 3 ? dehType : 0
  selectedDehType.value = normalized
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
  const typeKey = displayDehTypeKey.value
  const fieldKeyTyped = `peripheral.deh.${typeKey}.fields.${field.key}`
  return te(fieldKeyTyped) ? t(fieldKeyTyped) : field.label || ''
}

const formatValue = (field) => {
  if (!field || field.value === null || field.value === undefined || field.value === '---') return '---'
  if (field.map !== undefined && field.rawValue !== undefined) {
    const typeKey = displayDehTypeKey.value
    const mapKeyTyped = `peripheral.deh.${typeKey}.valueMap.${field.key}.${field.rawValue}`
    return te(mapKeyTyped) ? t(mapKeyTyped) : String(field.value)
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
    dehData.value = []
    selectedDehType.value = 0
    if (id) {
      requestBlockCommDevCfg()
    }
  }
)

watch(
  () => selectedDehType.value,
  (type, oldType) => {
    if (type !== oldType && oldType !== null && oldType !== undefined) {
      dehData.value = []
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
