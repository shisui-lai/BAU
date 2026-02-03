<template>
  <div class="card">
    <DataTable :value="rows" showGridlines class="fixed-table">
      <Column :header="t('peripheral.fire.fieldName')" :headerStyle="{ width: '50%' }">
        <template #body="{ data: row }">{{ row.label }}</template>
      </Column>
      <Column :header="t('peripheral.fire.fieldValue')" :style="{ width: '50%' }" bodyClass="value-col">
        <template #body="{ data: row }">{{ row.value }}</template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlockStore } from '@/stores/device/blockStore.js'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection.js'
import { buildTemplateData, parseFieldTableData } from '@/composables/core/data-processing/common/useFieldTableParser'
import { FIRE_YIJIE_FIELDS } from '../../../../main/table.js'

const { t, te } = useI18n()
const blockStore = useBlockStore()
usePageTypeDetection()

const selectedBlockId = computed(() => {
  const selected = blockStore.selectedBlockForView
  if (!selected) return null
  return Number(selected.replace('block', ''))
})

const fireData = ref([])
let ipcListenerRegistered = false

const FIRE_TYPE_KEY = 'yijie'

const getTemplateData = () => {
  return buildTemplateData(FIRE_YIJIE_FIELDS)
}

const parseRawData = (rawData) => {
  return parseFieldTableData(rawData, FIRE_YIJIE_FIELDS)
}

const displayData = computed(() => (fireData.value.length > 0 ? fireData.value : getTemplateData()))

const translateLabel = (field) => {
  if (!field) return ''
  const i18nKey = `peripheral.fire.${FIRE_TYPE_KEY}.fields.${field.key}`
  return te(i18nKey) ? t(i18nKey) : field.label || ''
}

const formatValue = (field) => {
  if (!field) return '---'
  const value = field.value
  if (value === null || value === undefined || value === '---') return '---'
  return String(value)
}

const rows = computed(() => {
  const arr = (displayData.value || []).filter((el) => el?.hide !== true)
  return arr.map((el) => ({
    label: translateLabel(el),
    value: formatValue(el)
  }))
})

const handleFireData = (event, msg) => {
  if (!msg || msg.dataType !== 'BLOCK_FIRE_DEV' || msg.blockId !== selectedBlockId.value) return
  const raw = Array.isArray(msg.data) ? msg.data : []
  fireData.value = parseRawData(raw)
}

const registerListener = () => {
  if (ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeAllListeners('BLOCK_FIRE_DEV')
  window.electron.ipcRenderer.on('BLOCK_FIRE_DEV', handleFireData)
  ipcListenerRegistered = true
}

const unregisterListener = () => {
  if (!ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeListener('BLOCK_FIRE_DEV', handleFireData)
  ipcListenerRegistered = false
}

onMounted(() => {
  registerListener()
})
onUnmounted(() => {
  unregisterListener()
})
</script>

<style scoped>
.fixed-table .p-datatable-table {
  table-layout: fixed;
}
.value-col {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
