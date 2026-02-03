<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClusterStore } from '@/stores/device/clusterStore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const { t, te } = useI18n()
const clusterStore = useClusterStore()
usePageTypeDetection()

const selectedClusterIds = computed(() => {
  const key = clusterStore.selectedClusterForView
  if (!key) return null
  const parts = String(key).split('-')
  if (parts.length !== 2) return null
  const blockId = Number(parts[0])
  const clusterId = Number(parts[1])
  if (!Number.isFinite(blockId) || !Number.isFinite(clusterId)) return null
  return { blockId, clusterId }
})

const dehumiRegisters = ref([])
const configDehumiType = ref(null)
const selectedDehumiType = ref(65535)
const hasUserSelection = ref(false)
let ipcListenerRegistered = false

const DEHUMI_TYPE_OPTIONS = [
  { label: '无除湿空调', value: 65535 },
  { label: '01-除湿机-1', value: 1 },
  { label: '02-除湿机-E-J-000113', value: 2 }
]

const DEHUMI_TYPE_KEY_MAP = {
  65535: 'none',
  1: 'cluster_deh_01',
  2: 'cluster_deh_ej000113'
}

const currentDehumiTypeKey = computed(() => {
  return DEHUMI_TYPE_KEY_MAP[selectedDehumiType.value] || 'cluster_deh_01'
})

const dehumiTypeOptions = computed(() =>
  DEHUMI_TYPE_OPTIONS.map((o) => ({
    ...o,
    label: te(`clusterConfigParam.dropdownOptions.除湿空调类型.${o.label}`)
      ? t(`clusterConfigParam.dropdownOptions.除湿空调类型.${o.label}`)
      : o.label
  }))
)

const getDecimalsByScale = (scale) => {
  if (!scale || scale === 1) return 0
  const s = String(scale)
  return s.length - 1
}

const decodeField = (field, registers) => {
  const reg = Number(field.reg)
  const raw = registers && reg >= 0 && reg < registers.length ? registers[reg] : undefined
  if (raw === undefined) return { ...field, value: '---', rawValue: undefined }

  if (field.type === 'bits') {
    const bit = Number(field.bit || 0)
    const len = Number(field.len || 1)
    const mask = len >= 16 ? 0xffff : (1 << len) - 1
    const v = (raw >> bit) & mask
    const mapped = field.map && field.map[v] !== undefined ? field.map[v] : v
    return { ...field, value: mapped, rawValue: v }
  }

  let value = raw
  if (field.type === 's16' && value > 32767) value = value - 65536
  if (field.scale && field.scale !== 1) value = value / field.scale
  if (typeof field.offset === 'number' && Number.isFinite(field.offset)) value = value + field.offset

  let displayValue = value
  if (field.map && field.map[value] !== undefined) displayValue = field.map[value]
  if (!field.map && typeof value === 'number') {
    const decimals = getDecimalsByScale(field.scale)
    displayValue = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()
  }

  return { ...field, value: displayValue, rawValue: value }
}

const DEHUMI_01_SPEC = [
  { reg: 0, key: 'atomizationModuleFault', label: '雾化模块状态', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'atomizationWorkStatus', label: '雾化工作状态', type: 'bits', bit: 1, len: 1, map: { 0: '关闭', 1: '开启' } },
  { reg: 0, key: 'faultCircuitStatus', label: '故障回路状态', type: 'bits', bit: 2, len: 1, map: { 0: '关闭', 1: '开启' } },
  { reg: 0, key: 'humidityCircuitStatus', label: '控湿回路状态', type: 'bits', bit: 3, len: 1, map: { 0: '停止', 1: '开启' } },
  { reg: 0, key: 'tempCircuitStatus', label: '控温回路状态', type: 'bits', bit: 4, len: 1, map: { 0: '停止', 1: '开启' } },
  { reg: 0, key: 'tempControlMode', label: '控温方式', type: 'bits', bit: 5, len: 1, map: { 0: '降温', 1: '升温' } },
  { reg: 0, key: 'fanModuleFault', label: '风机模块回路状态', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'dehumidifyModuleFault', label: '除湿模块回路状态', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'humiditySensorFault', label: '湿度传感器状态', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'externalTempSensorFault', label: '外部温度传感器状态', type: 'bits', bit: 9, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'internalTempSensorFault', label: '内部温度传感器状态', type: 'bits', bit: 10, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'defrostStatus', label: '化霜状态', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '正在化霜' } },
  { reg: 0, key: 'humidityManualSwitch', label: '控湿手动开关', type: 'bits', bit: 12, len: 1, map: { 0: '正常', 1: '手动开' } },
  { reg: 0, key: 'tempManualSwitch', label: '控温手动开关', type: 'bits', bit: 13, len: 1, map: { 0: '正常', 1: '手动开' } },
  { reg: 0, key: 'highTempAlarm', label: '高温告警', type: 'bits', bit: 14, len: 1, map: { 0: '正常', 1: '告警' } },
  { reg: 0, key: 'dewPointLoopStatus', label: '露点温度回路工作状态', type: 'bits', bit: 15, len: 1, map: { 0: '关闭', 1: '开启' } },

  { reg: 1, key: 'internalTemp', label: '内部温度值(℃)', type: 's16', scale: 10 },
  { reg: 2, key: 'ambientTemp', label: '环境温度值(℃)', type: 's16', scale: 10 },
  { reg: 3, key: 'ambientHumidity', label: '环境湿度值(%RH)', type: 'u16', scale: 10 },
  { reg: 4, key: 'internalTemp2', label: '内部温度值2(℃)', type: 's16', scale: 10 },
  { reg: 5, key: 'dewPointTemp', label: '露点温度(℃)', type: 's16', scale: 10 },
  { reg: 6, key: 'reserved30006', label: '备用3', type: 'u16' },
  { reg: 7, key: 'reserved30007', label: '备用4', type: 'u16' },
  { reg: 8, key: 'reserved30008', label: '备用5', type: 'u16' },
  { reg: 9, key: 'tempStart', label: '控温开启值(℃)', type: 'u16', scale: 10 },
  { reg: 10, key: 'tempStop', label: '控温停止值(℃)', type: 'u16', scale: 10 },
  { reg: 11, key: 'humidityStart', label: '控湿开启值(%RH)', type: 'u16', scale: 10 },
  { reg: 12, key: 'humidityStop', label: '控湿停止值(%RH)', type: 'u16', scale: 10 },
  { reg: 13, key: 'tempAlarmHigh', label: '温度报警上限值(℃)', type: 'u16', scale: 10 },
  { reg: 14, key: 'tempAlarmLow', label: '温度报警下限值(℃)', type: 'u16', scale: 10 },
  { reg: 15, key: 'dewPointStart', label: '露点温度启动值(℃)', type: 'u16', scale: 10 },
  { reg: 16, key: 'dewPointDiff', label: '露点温度回差值(℃)', type: 'u16', scale: 10 }
]

const DEHUMI_02_SPEC = [
  { reg: 0, key: 'humidityCircuitStatus', label: '控湿回路状态', type: 'bits', bit: 0, len: 1, map: { 0: '停止', 1: '开启' } },
  { reg: 0, key: 'tempCircuitStatus', label: '控温回路状态', type: 'bits', bit: 1, len: 1, map: { 0: '停止', 1: '开启' } },
  { reg: 0, key: 'tempControlMode', label: '控温方式', type: 'bits', bit: 2, len: 1, map: { 0: '降温', 1: '升温' } },
  { reg: 0, key: 'fanModuleFault', label: '风机模块回路状态', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'dehumidifyModuleFault', label: '除湿模块回路状态', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'humiditySensorFault', label: '湿度传感器状态', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'externalTempSensorFault', label: '外部温度传感器状态', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 0, key: 'reservedStatusBit7', label: '预留', type: 'bits', bit: 7, len: 1, map: { 0: 0, 1: 1 } },
  { reg: 0, key: 'defrostStatus', label: '化霜状态', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '正在化霜' } },
  { reg: 0, key: 'humidityManualSwitch', label: '控湿手工开关', type: 'bits', bit: 9, len: 1, map: { 0: '自动', 1: '手动开' } },
  { reg: 0, key: 'tempManualSwitch', label: '控温手动开关', type: 'bits', bit: 10, len: 1, map: { 0: '自动', 1: '手动开' } },
  { reg: 0, key: 'highTempAlarm', label: '高温告警', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '告警' } },
  { reg: 0, key: 'dewPointLoopStatus', label: '露点温度回路工作状态', type: 'bits', bit: 12, len: 1, map: { 0: '关闭', 1: '开启' } },
  { reg: 0, key: 'reservedStatusBit13', label: '预留', type: 'bits', bit: 13, len: 1, map: { 0: 0, 1: 1 } },
  { reg: 0, key: 'reservedStatusBit14', label: '预留', type: 'bits', bit: 14, len: 1, map: { 0: 0, 1: 1 } },
  { reg: 0, key: 'reservedStatusBit15', label: '预留', type: 'bits', bit: 15, len: 1, map: { 0: 0, 1: 1 } },

  { reg: 1, key: 'ambientTemp', label: '环境温度值(℃)', type: 's16', scale: 10 },
  { reg: 2, key: 'ambientHumidity', label: '环境湿度值(%RH)', type: 'u16', scale: 10 },
  { reg: 3, key: 'reserved2', label: '备用2', type: 'u16' },
  { reg: 4, key: 'dewPointTempWorkState', label: '露点温度回路工作状态(℃)', type: 's16', scale: 10 },
  { reg: 5, key: 'reserved3', label: '备用3', type: 'u16' },
  { reg: 6, key: 'reserved4', label: '备用4', type: 'u16' },
  { reg: 7, key: 'reserved5', label: '备用5', type: 'u16' },
  { reg: 8, key: 'tempStart', label: '控温开启值(℃)', type: 'u16', scale: 10 },
  { reg: 9, key: 'tempStop', label: '控温停止值(℃)', type: 'u16', scale: 10 },
  { reg: 10, key: 'humidityStart', label: '控湿开启值(%RH)', type: 'u16', scale: 10 },
  { reg: 11, key: 'humidityStop', label: '控湿关闭值(%RH)', type: 'u16', scale: 10 },
  { reg: 12, key: 'highTempAlarmHigh', label: '高温报警上限值(℃)', type: 'u16', scale: 10 },
  { reg: 13, key: 'highTempAlarmLow', label: '高温报警下限值(℃)', type: 'u16', scale: 10 },
  { reg: 14, key: 'dewPointStart', label: '露点温度启动值(℃)', type: 'u16', scale: 10 },
  { reg: 15, key: 'dewPointDiff', label: '露点温度回差值(℃)', type: 'u16', scale: 10 }
]

const SPEC_BY_TYPE = {
  1: DEHUMI_01_SPEC,
  2: DEHUMI_02_SPEC
}

const parsedFields = computed(() => {
  const spec = SPEC_BY_TYPE[selectedDehumiType.value]
  if (!spec) {
    return DEHUMI_01_SPEC.map((f) => ({ ...f, value: '---', rawValue: undefined }))
  }
  if (selectedDehumiType.value === 65535) {
    return DEHUMI_01_SPEC.map((f) => ({ ...f, value: '---', rawValue: undefined }))
  }
  return spec.map((f) => decodeField(f, dehumiRegisters.value))
})

const leftData = computed(() => {
  const arr = parsedFields.value || []
  const half = Math.ceil(arr.length / 2)
  return arr.slice(0, half)
})
const rightData = computed(() => {
  const arr = parsedFields.value || []
  const half = Math.ceil(arr.length / 2)
  return arr.slice(half)
})
const pairedRows = computed(() => {
  const maxLen = Math.max(leftData.value.length, rightData.value.length)
  const rows = []
  for (let i = 0; i < maxLen; i++) rows.push({ left: leftData.value[i], right: rightData.value[i] })
  return rows
})

const translateLabel = (field) => {
  if (!field) return ''
  const typeKey = currentDehumiTypeKey.value
  const i18nKey = `cluster_peripheral.deh.${typeKey}.fields.${field.key}`
  return te(i18nKey) ? t(i18nKey) : field.label || ''
}

const formatValue = (field) => {
  if (!field || field.value === null || field.value === undefined || field.value === '---') return '---'
  if (field.map !== undefined && field.rawValue !== undefined) {
    const typeKey = currentDehumiTypeKey.value
    const mapKey = `cluster_peripheral.deh.${typeKey}.valueMap.${field.key}.${field.rawValue}`
    return te(mapKey) ? t(mapKey) : String(field.value)
  }
  return String(field.value)
}

const handleDehumiData = (event, msg) => {
  const ids = selectedClusterIds.value
  if (!ids) return
  if (!msg || msg.dataType !== 'DEHUMI' || msg.blockId !== ids.blockId || msg.clusterId !== ids.clusterId) return
  dehumiRegisters.value = Array.isArray(msg.data) ? msg.data : []
}

const handleSysBaseParam = (event, msg) => {
  const ids = selectedClusterIds.value
  if (!ids) return
  if (!msg || msg.dataType !== 'SYS_BASE_PARAM_R' || msg.blockId !== ids.blockId || msg.clusterId !== ids.clusterId) return
  const dehumiType = msg.data && typeof msg.data === 'object' ? msg.data.DehumidifyType : undefined
  if (dehumiType === undefined || dehumiType === null) return
  configDehumiType.value = dehumiType
}

const registerListener = () => {
  if (ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.on('DEHUMI', handleDehumiData)
  window.electron.ipcRenderer.on('SYS_BASE_PARAM_R', handleSysBaseParam)
  ipcListenerRegistered = true
}

const unregisterListener = () => {
  if (!ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeListener('DEHUMI', handleDehumiData)
  window.electron.ipcRenderer.removeListener('SYS_BASE_PARAM_R', handleSysBaseParam)
  ipcListenerRegistered = false
}

const requestSysBaseParam = () => {
  const ids = selectedClusterIds.value
  if (!ids) return
  const topic = `bms/host/s2d/b${ids.blockId}/c${ids.clusterId}/sys_base_param_r`
  if (window.electronAPI?.mqttPublish) {
    window.electronAPI.mqttPublish(topic, 'ff').catch(() => {})
  }
}

watch(
  () => selectedClusterIds.value,
  (ids) => {
    dehumiRegisters.value = []
    configDehumiType.value = null
    hasUserSelection.value = false
    selectedDehumiType.value = 65535
    if (ids) requestSysBaseParam()
  },
  { immediate: true }
)

watch(
  () => configDehumiType.value,
  (val) => {
    if (val === null || val === undefined) return
    const num = Number(val)
    const normalized = num === 1 || num === 2 ? num : 65535
    if (hasUserSelection.value) return
    selectedDehumiType.value = normalized
    hasUserSelection.value = false
  }
)

watch(selectedDehumiType, (newValue, oldValue) => {
  if (newValue !== oldValue && oldValue !== null && oldValue !== undefined) {
    hasUserSelection.value = true
  }
})

onMounted(() => {
  registerListener()
})

onUnmounted(() => {
  unregisterListener()
})
</script>

<template>
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripheral.deh.type') }}：</label>
      <Dropdown
        v-model="selectedDehumiType"
        :options="dehumiTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripheral.deh.selectType')"
        class="w-20rem"
      />
    </div>

    <DataTable :value="pairedRows" showGridlines class="fixed-table">
      <Column :header="t('peripheral.deh.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ row.left ? translateLabel(row.left) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.deh.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          {{ row.left ? formatValue(row.left) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.deh.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ row.right ? translateLabel(row.right) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.deh.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          {{ row.right ? formatValue(row.right) : '' }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

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
