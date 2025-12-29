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
    
    
    <div class="container">
      <div class="table-container">
        <h6>基本信息</h6>
        <div class="two-columns">
          <DataTable :value="leftBasicData" showGridlines class="fixed-table headerless">
            <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '50%' }">
              <template #body="{ data: el }">
                {{ el.label }}
              </template>
            </Column>
            <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '50%' }" bodyClass="value-col">
              <template #body="{ data: el }">
                {{ formatValue(el.value) }}
              </template>
            </Column>
          </DataTable>
          <DataTable :value="rightBasicData" showGridlines class="fixed-table headerless">
            <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '50%' }">
              <template #body="{ data: el }">
                {{ el.label }}
              </template>
            </Column>
            <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '50%' }" bodyClass="value-col">
              <template #body="{ data: el }">
                {{ formatValue(el.value) }}
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
      <div class="table-container">
        <h6>故障</h6>
        <div class="two-columns">
          <DataTable :value="leftFaultData" showGridlines class="fixed-table">
            <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '50%' }">
              <template #body="{ data: el }">
                {{ el.label }}
              </template>
            </Column>
            <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '50%' }" bodyClass="value-col">
              <template #body="{ data: el }">
                <span :class="{ 'fault-active': el.value === '故障' }">
                  {{ el.value }}
                </span>
              </template>
            </Column>
          </DataTable>
          <DataTable :value="rightFaultData" showGridlines class="fixed-table">
            <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '50%' }">
              <template #body="{ data: el }">
                {{ el.label }}
              </template>
            </Column>
            <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '50%' }" bodyClass="value-col">
              <template #body="{ data: el }">
                <span :class="{ 'fault-active': el.value === '故障' }">
                  {{ el.value }}
                </span>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlockStore } from '@/stores/device/blockStore.js'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection.js'
import { REF_SANHETONGFEI_FIELDS } from '../../../../main/table.js'

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

// 制冷设备数据状态
const refData = ref([]) // 存储解析后的制冷设备数据
const selectedRefType = ref(1) // 用户选择的制冷设备型号
let ipcListenerRegistered = false
let visibilityCleanup = null

// 制冷设备型号选项
const refTypeOptions = ref([
  { label: '三河同飞水冷机', value: 1 }
])

// 获取字段单位
const getFieldUnit = (field) => {
  if (field.label.includes('(') && field.label.includes(')')) {
    const match = field.label.match(/\(([^)]+)\)/)
    return match ? match[1] : ''
  }
  return ''
}

// 获取当前制冷设备型号的字段定义
const getCurrentRefFields = () => {
  switch (selectedRefType.value) {
    case 1:
      return REF_SANHETONGFEI_FIELDS
    default:
      return REF_SANHETONGFEI_FIELDS
  }
}

// 生成模板数据
const getTemplateData = () => {
  const fields = getCurrentRefFields()
  return fields.map(field => ({
    class: field.class,
    label: field.label,
    value: '---',
    key: field.key,
    unit: getFieldUnit(field),
    hide: field.hide === true
  }))
}

// 解析bit字段（根据父字段语义进行区分）
const parseBitField = (value, bitMap, parentKey) => {
  const result = []
  for (const [bitIndex, label] of Object.entries(bitMap)) {
    const bit = parseInt(bitIndex)
    const isSet = (value & (1 << bit)) !== 0
    let display
    if (parentKey === 'relayOutputStatus') {
      // 继电器输出：大多数位 1=运行,0=停机；报警输出位 1=正常,0=故障
      display = (label === '报警输出') ? (isSet ? '正常' : '故障') : (isSet ? '运行' : '停机')
    } else if (parentKey && parentKey.startsWith('faultStatus')) {
      // 故障状态：1=有故障，0=无故障（显示为“故障/无故障”）
      display = isSet ? '故障' : '无故障'
    } else {
      // 其它位字段的通用兜底
      display = isSet
        ? (label.includes('故障') || label.includes('报警') ? '故障' : '运行')
        : (label.includes('故障') || label.includes('报警') ? '正常' : '停机')
    }
    result.push({
      label,
      value: display,
      bitIndex: bit,
      rawValue: isSet ? 1 : 0
    })
  }
  return result
}

const getDecimalsByScale = (scale) => {
  if (!scale || scale === 1) return 0
  const s = String(scale)
  return s.length - 1
}

// 解析原始数据
const parseRawData = (rawData) => {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return getTemplateData()
  }

  const fields = getCurrentRefFields()
  return fields.map((field, index) => {
    if (index >= rawData.length) {
      return {
        class: field.class,
        label: field.label,
        value: '---',
        key: field.key,
        unit: getFieldUnit(field)
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
    
    // 处理bit字段
    if (field.type === 'bit' && field.bitMap) {
      return {
        class: field.class,
        label: field.label,
        value: rawData[index], // 保存原始值用于bit解析
        rawValue: rawData[index],
        key: field.key,
        type: 'bit',
        bitMap: field.bitMap,
        bitData: parseBitField(rawData[index], field.bitMap, field.key)
      }
    }
    
    // 应用映射
    let displayValue = value
    if (field.map && field.map[value] !== undefined) {
      displayValue = field.map[value]
    }
    if (!field.map && typeof value === 'number') {
      const decimals = getDecimalsByScale(field.scale)
      displayValue = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()
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
  return refData.value.length > 0 ? refData.value : getTemplateData()
})

// 基本信息数据（排除bit字段和故障状态）
const basicData = computed(() => {
  return displayData.value.filter(item =>
    item.type !== 'bit' &&
    !item.key.includes('faultStatus') &&
    item.key !== 'relayOutputStatus' &&
    item.hide !== true
  )
})

// 继电器输出状态数据
const relayOutputData = computed(() => {
  const relayItem = displayData.value.find(item => item.key === 'relayOutputStatus')
  if (relayItem && relayItem.bitData) return relayItem.bitData
  // 无实时数据时，按字段定义生成占位项
  const field = getCurrentRefFields().find(f => f.key === 'relayOutputStatus')
  if (field?.bitMap) {
    return Object.values(field.bitMap).map(label => ({ label, value: '---' }))
  }
  return []
})

// 故障状态分组数据
const faultStatusGroups = computed(() => {
  const groups = []
  const faultItems = displayData.value.filter(item => item.key.includes('faultStatus'))

  faultItems.forEach(item => {
    if (item.bitData) {
      groups.push({
        title: item.label,
        data: item.bitData
      })
    }
  })

  return groups
})

const basicMerged = computed(() => {
  const base = basicData.value.map(el => ({ label: el.label, value: el.value }))
  const relay = relayOutputData.value.map(el => ({ label: el.label, value: el.value }))
  return [...base, ...relay]
})

const leftBasicData = computed(() => {
  const arr = basicMerged.value || []
  const half = Math.ceil(arr.length / 2)
  return arr.slice(0, half)
})

const rightBasicData = computed(() => {
  const arr = basicMerged.value || []
  const half = Math.ceil(arr.length / 2)
  return arr.slice(half)
})

const flatFaults = computed(() => {
  const res = []
  if (faultStatusGroups.value.length) {
    faultStatusGroups.value.forEach(g => {
      g.data.forEach(el => res.push({ label: el.label, value: el.value }))
    })
    return res
  }
  // 无实时数据时，按字段定义生成占位故障项
  const defs = getCurrentRefFields().filter(f => f.type === 'bit' && f.key.includes('faultStatus'))
  defs.forEach(f => {
    if (f.bitMap) {
      Object.values(f.bitMap).forEach(label => {
        res.push({ label, value: '---' })
      })
    }
  })
  return res
})

const leftFaultData = computed(() => {
  const arr = flatFaults.value || []
  const half = Math.ceil(arr.length / 2)
  return arr.slice(0, half)
})

const rightFaultData = computed(() => {
  const arr = flatFaults.value || []
  const half = Math.ceil(arr.length / 2)
  return arr.slice(half)
})

// 处理制冷设备数据消息
let lastRefUpdate = 0
const THROTTLE_MS = 200
const handleRefData = (event, msg) => {
  const now = Date.now()
  if (now - lastRefUpdate < THROTTLE_MS) {
    return
  }
  lastRefUpdate = now
  if (!msg || msg.dataType !== 'BLOCK_REF' || msg.blockId !== selectedBlockId.value) {
    return
  }

  // 解析并存储数据
  refData.value = parseRawData(msg.data)
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

// 型号切换未做特殊处理（当前未使用）

// 格式化显示值
const formatValue = (value) => {
  if (value === null || value === undefined || value === '---') {
    return '---'
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
.container {
  display: flex;
  gap: 1rem;
  width: 100%;
  flex-wrap: wrap; /* 允许表格换行 */
}

.table-container {
  flex-grow: 1; /* 让表格自动扩展，占满剩余空间 */
  min-width: 30%; /* 保证每个表格至少占用30%的宽度 */
  margin-bottom: 1rem;
}

.table-container h6 {
  margin-bottom: 0.5rem;
  color: #ffffff;
  font-weight: 600;
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
.headerless :deep(.p-datatable-thead) {
  display: none;
}
/* 补齐隐藏表头后的首行上边框，避免首行网格线被遮挡 */
.headerless :deep(.p-datatable-tbody > tr:first-child td) {
  border-top: 1px solid var(--surface-border, #4b5563);
}
.value-col {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
.two-columns {
  display: flex;
  gap: 16px;
}
.two-columns > :deep(.p-datatable) {
  flex: 1;
}
