<template>
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripheral.pcs.type') }}：</label>
      <Dropdown
        v-model="selectedPcsType"
        :options="pcsTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripheral.pcs.selectType')"
        class="w-20rem"
        
      />
    </div>
    
    <DataTable :value="pairedRows" showGridlines class="fixed-table">
      <Column :header="t('peripheral.pcs.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ translateLabel(row.left) }}
        </template>
      </Column>
      <Column :header="t('peripheral.pcs.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          {{ row.left ? formatValue(row.left) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.pcs.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ translateLabel(row.right) }}
        </template>
      </Column>
      <Column :header="t('peripheral.pcs.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          {{ row.right ? formatValue(row.right) : '' }}
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
// 参考簇PCS实现：从堆侧配置中自动选择PCS类型
import { parseParameterReadResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { buildTemplateData, parseFieldTableData } from '@/composables/core/data-processing/common/useFieldTableParser'
import { PCS_SHUANGYILI_FIELDS, PCS_HEWANG_FIELDS, PCS_KEHUA_BLOCK_FIELDS, PCS_MAIGERUINENG_FIELDS, PCS_SHENGHONG_FIELDS } from '../../../../main/table.js'

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

// PCS数据状态
const pcsData = ref([])
// 默认无PCS，进入页面时再通过堆配置自动同步具体类型
const selectedPcsType = ref(0)
const configPcsType = ref(null)
const hasUserSelection = ref(false)
let ipcListenerRegistered = false

const PCS_TYPE_KEY_MAP = {
  0: 'none',
  1: 'shuangyili',
  2: 'hewang',
  3: 'kehua',
  4: 'maigereneng',
  5: 'shenghong',
  6: 'shuangyili_can'
}

const currentPcsTypeKey = computed(() => {
  return PCS_TYPE_KEY_MAP[selectedPcsType.value] || 'none'
})

const displayPcsTypeKey = computed(() => {
  if (selectedPcsType.value === 0) return 'shuangyili'
  return currentPcsTypeKey.value
})

// 数据按两列均分，并在一个表格中按行配对显示
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

const pcsTypeOptions = computed(() => [
  { label: t('peripheral.pcs.types.none'), value: 0 },
  { label: t('peripheral.pcs.types.shuangyili'), value: 1 },
  { label: t('peripheral.pcs.types.hewang'), value: 2 },
  { label: t('peripheral.pcs.types.kehua'), value: 3 },
  { label: t('peripheral.pcs.types.maigereneng'), value: 4 },
  { label: t('peripheral.pcs.types.shenghong'), value: 5 },
  { label: t('peripheral.pcs.types.shuangyili_can'), value: 6 }
])

// 获取当前PCS型号的字段定义
const getCurrentPcsFields = () => {
  switch (selectedPcsType.value) {
    // 无PCS或未识别类型时，沿用默认字段表结构以便展示模板
    case 0:
    case 1:
    case 6:
      return PCS_SHUANGYILI_FIELDS
    case 2:
      return PCS_HEWANG_FIELDS
    case 3:
      return PCS_KEHUA_BLOCK_FIELDS
    case 4:
      return PCS_MAIGERUINENG_FIELDS
    case 5:
      return PCS_SHENGHONG_FIELDS
    default:
      return PCS_SHUANGYILI_FIELDS
  }
}

// 生成模板数据
const getTemplateData = () => {
  return buildTemplateData(getCurrentPcsFields())
}

// 解析原始数据
const parseRawData = (rawData) => {
  return parseFieldTableData(rawData, getCurrentPcsFields())
}

const displayData = computed(() => pcsData.value.length > 0 ? pcsData.value : getTemplateData())

const handlePcsData = (event, msg) => {
  if (!msg || msg.dataType !== 'BLOCK_PCS' || msg.blockId !== selectedBlockId.value) return
  // 逻辑注释：当配置为“无PCS”时，仅展示模板结构，不接收实时数据
  if (selectedPcsType.value === 0) return
  pcsData.value = parseRawData(msg.data)
}

// 注册IPC监听器
const registerListener = () => {
  if (ipcListenerRegistered || !window.electron?.ipcRenderer) {
    return
  }

  window.electron.ipcRenderer.removeAllListeners('BLOCK_PCS')
  window.electron.ipcRenderer.on('BLOCK_PCS', handlePcsData)
  ipcListenerRegistered = true
}

// 注销IPC监听器
const unregisterListener = () => {
  if (!ipcListenerRegistered || !window.electron?.ipcRenderer) {
    return
  }

  window.electron.ipcRenderer.removeListener('BLOCK_PCS', handlePcsData)
  ipcListenerRegistered = false
}

// 逻辑注释：从堆遥调“系统外围设备配置参数”中同步PCS类型（PcsType）
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
  const pcsType = typeof data.PcsType === 'number' ? data.PcsType : null
  if (pcsType === null || Number.isNaN(pcsType)) return
  configPcsType.value = pcsType
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
  const key = field.key
  const typeKey = displayPcsTypeKey.value
  const typePath = `peripheral.pcs.${typeKey}.fields.${key}`
  return te(typePath) ? t(typePath) : field.label || ''
}

const formatValue = (field) => {
  if (!field || field.value === null || field.value === undefined || field.value === '---') {
    return '---'
  }
  if (field.map !== undefined && field.rawValue !== undefined) {
    const typeKey = displayPcsTypeKey.value
    const mapKey = `peripheral.pcs.${typeKey}.valueMap.${field.key}.${field.rawValue}`
    return te(mapKey) ? t(mapKey) : String(field.value)
  }
  return String(field.value)
}

onMounted(() => {
  registerListener()
  registerCommDevListener()
  // 初次进入页面时主动请求堆外围设备配置
  requestBlockCommDevCfg()
})

onUnmounted(() => {
  unregisterListener()
  unregisterCommDevListener()
})

// 逻辑注释：堆选择变化时，重置状态并重新请求对应堆的外围设备配置
watch(
  () => selectedBlockId.value,
  (id) => {
    pcsData.value = []
    configPcsType.value = null
    hasUserSelection.value = false
    selectedPcsType.value = 0
    if (id) requestBlockCommDevCfg()
  }
)

// 逻辑注释：在未手动切换前，根据堆配置自动选择PCS类型
watch(
  () => configPcsType.value,
  (val) => {
    if (val === null || val === undefined) return
    const num = Number(val)
    const normalized = num >= 0 && num <= 6 ? num : 0
    if (hasUserSelection.value) return
    selectedPcsType.value = normalized
  }
)

watch(selectedPcsType, (newValue, oldValue) => {
  if (newValue !== oldValue && oldValue !== null && oldValue !== undefined) {
    hasUserSelection.value = true
  }
})

watch(
  () => selectedPcsType.value,
  (type, oldType) => {
    if (type !== oldType && oldType !== null && oldType !== undefined) {
      pcsData.value = []
    }
  }
)
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
