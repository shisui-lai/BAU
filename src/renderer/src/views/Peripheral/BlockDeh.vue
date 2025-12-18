<template>
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripheral.ref.type') }}：</label>
      <Dropdown
        v-model="selectedDehType"
        :options="dehTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripheral.ref.selectType')"
        class="w-20rem"
      />
    </div>

    <DataTable :value="pairedRows" showGridlines class="fixed-table">
      <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">{{ row.left?.label || '' }}</template>
      </Column>
      <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">{{ row.left ? formatValue(row.left.value) : '' }}</template>
      </Column>
      <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">{{ row.right?.label || '' }}</template>
      </Column>
      <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">{{ row.right ? formatValue(row.right.value) : '' }}</template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlockStore } from '@/stores/device/blockStore.js'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection.js'
import { DEH_SANHETONGFEI_FIELDS } from '../../../../main/table.js'

const { t } = useI18n()
const blockStore = useBlockStore()
usePageTypeDetection()

const selectedBlockId = computed(() => {
  const selected = blockStore.selectedBlockForView
  if (!selected) return null
  return Number(selected.replace('block', ''))
})

const dehData = ref([])
const selectedDehType = ref(1)
let ipcListenerRegistered = false
let visibilityCleanup = null

const dehTypeOptions = ref([
  { label: '三河同飞除湿空调', value: 1 }
])

const getFieldUnit = (field) => {
  if (field.label.includes('(') && field.label.includes(')')) {
    const match = field.label.match(/\(([^)]+)\)/)
    return match ? match[1] : ''
  }
  return ''
}

const getCurrentDehFields = () => {
  switch (selectedDehType.value) {
    case 1:
      return DEH_SANHETONGFEI_FIELDS
    default:
      return DEH_SANHETONGFEI_FIELDS
  }
}

const getTemplateData = () => {
  const fields = getCurrentDehFields()
  return fields.map(field => ({
    class: field.class,
    label: field.label,
    value: '---',
    key: field.key,
    unit: getFieldUnit(field),
    hide: field.hide === true
  }))
}

const parseRawData = (rawData) => {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return getTemplateData()
  const fields = getCurrentDehFields()
  return fields.map((field, index) => {
    if (index >= rawData.length) {
      return { class: field.class, label: field.label, value: '---', key: field.key, unit: getFieldUnit(field) }
    }
    let value = rawData[index]
    if (field.type === 's16' && value > 32767) value = value - 65536
    if (field.scale && field.scale !== 1) value = value / field.scale
    let displayValue = value
    if (field.map && field.map[value] !== undefined) displayValue = field.map[value]
    return { class: field.class, label: field.label, value: displayValue, rawValue: value, key: field.key, unit: getFieldUnit(field), hide: field.hide === true }
  })
}

const displayData = computed(() => dehData.value.length > 0 ? dehData.value : getTemplateData())

const leftData = computed(() => { const arr = (displayData.value || []).filter(el => el?.hide !== true); const half = Math.ceil(arr.length / 2); return arr.slice(0, half) })
const rightData = computed(() => { const arr = (displayData.value || []).filter(el => el?.hide !== true); const half = Math.ceil(arr.length / 2); return arr.slice(half) })
const pairedRows = computed(() => { const maxLen = Math.max(leftData.value.length, rightData.value.length); const rows = []; for (let i=0;i<maxLen;i++) rows.push({ left: leftData.value[i], right: rightData.value[i] }); return rows })

let lastDehUpdate = 0
const THROTTLE_MS = 200
const handleDehData = (event, msg) => {
  const now = Date.now()
  if (now - lastDehUpdate < THROTTLE_MS) return
  lastDehUpdate = now
  if (!msg || msg.dataType !== 'BLOCK_DEH' || msg.blockId !== selectedBlockId.value) return
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

const formatValue = (value) => {
  if (value === null || value === undefined || value === '---') return '---'
  if (typeof value === 'number') return value.toFixed(2)
  return String(value)
}

onMounted(() => {
  registerListener()
  const onVisibilityChange = () => {
    if (document.hidden) unregisterListener()
    else registerListener()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  visibilityCleanup = () => document.removeEventListener('visibilitychange', onVisibilityChange)
})
onUnmounted(() => {
  unregisterListener()
  if (visibilityCleanup) visibilityCleanup()
})
</script>

<style scoped>
.fixed-table .p-datatable-table { table-layout: fixed; }
.value-col { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
