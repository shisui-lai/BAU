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
          {{ row.left?.label || '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.pcs.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          {{ row.left ? formatValue(row.left.value) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.pcs.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ row.right?.label || '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.pcs.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          {{ row.right ? formatValue(row.right.value) : '' }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlockStore } from '@/stores/device/blockStore.js'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection.js'
import { PCS_SHUANGYILI_FIELDS } from '../../../../main/table.js'

const { t } = useI18n()

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
const pcsData = ref([]) // 存储解析后的PCS数据
const selectedPcsType = ref(1) // 用户选择的PCS型号
let ipcListenerRegistered = false
let visibilityCleanup = null

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

// PCS型号选项
const pcsTypeOptions = ref([
  { label: '双一力PCS', value: 1 }
])

// 获取字段单位
const getFieldUnit = (field) => {
  if (field.label.includes('(') && field.label.includes(')')) {
    const match = field.label.match(/\(([^)]+)\)/)
    return match ? match[1] : ''
  }
  return ''
}

// 获取当前PCS型号的字段定义
const getCurrentPcsFields = () => {
  switch (selectedPcsType.value) {
    case 1:
      return PCS_SHUANGYILI_FIELDS
    default:
      return PCS_SHUANGYILI_FIELDS
  }
}

// 生成模板数据
const getTemplateData = () => {
  const fields = getCurrentPcsFields()
  return fields.map(field => ({
    class: field.class,
    label: field.label,
    value: '---',
    key: field.key,
    unit: getFieldUnit(field),
    hide: field.hide === true
  }))
}

// 解析原始数据
const parseRawData = (rawData) => {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return getTemplateData()
  }

  const fields = getCurrentPcsFields()
  return fields.map((field, index) => {
    if (index >= rawData.length) {
      return {
        class: field.class,
        label: field.label,
        value: '---',
        key: field.key,
        unit: getFieldUnit(field),
        hide: field.hide === true
      }
    }

    let value = rawData[index]

    // 处理有符号16位整数
    if (field.type === 's16' && value > 32767) {
      value = value - 65536
    }

    // 应用缩放因子
    if (field.scale && field.scale !== 1) {
      value = value / field.scale
    }

    // 应用映射
    let displayValue = value
    if (field.map && field.map[value] !== undefined) {
      displayValue = field.map[value]
    }

    return {
      class: field.class,
      label: field.label,
      value: displayValue,
      rawValue: value,
      key: field.key,
      unit: getFieldUnit(field),
      hide: field.hide === true
    }
  })
}

// 显示数据
const displayData = computed(() => {
  return pcsData.value.length > 0 ? pcsData.value : getTemplateData()
})

// 处理PCS数据消息
let lastPcsUpdate = 0
const THROTTLE_MS = 200
const handlePcsData = (event, msg) => {
  const now = Date.now()
  if (now - lastPcsUpdate < THROTTLE_MS) {
    return
  }
  lastPcsUpdate = now
  if (!msg || msg.dataType !== 'BLOCK_PCS' || msg.blockId !== selectedBlockId.value) {
    return
  }

  // 解析并存储数据
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

// 获取当前PCS型号名称（未使用）

// 格式化显示值
const formatValue = (value) => {
  if (value === null || value === undefined || value === '---') {
    return '---'
  }

  if (typeof value === 'number') {
    return value.toFixed(2)
  }

  return String(value)
}

// 生命周期钩子
onMounted(() => {
  registerListener()
  const onVisibilityChange = () => {
    if (document.hidden) {
      unregisterListener()
    } else {
      registerListener()
    }
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
.fixed-table .p-datatable-table {
  table-layout: fixed;
}
.value-col {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>