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

const pcsRegisters = ref([])
const configPcsType = ref(null)
const selectedPcsType = ref(65535)
const hasUserSelection = ref(false)
let ipcListenerRegistered = false

const PCS_TYPE_OPTIONS = [
  { label: '无PCS', value: 65535 },
  { label: '星星pcs', value: 1 },
  { label: '双一力PCS-01', value: 2 },
  { label: '科华PCS', value: 3 }
]

const PCS_TYPE_KEY_MAP = {
  65535: 'none',
  1: 'xingxing_pcs',
  2: 'syl_pcs_01',
  3: 'kehua_pcs'
}

const currentPcsTypeKey = computed(() => {
  return PCS_TYPE_KEY_MAP[selectedPcsType.value] || 'xingxing_pcs'
})

const pcsTypeOptions = computed(() =>
  PCS_TYPE_OPTIONS.map((o) => ({
    ...o,
    label: te(`clusterConfigParam.dropdownOptions.PCS类型.${o.label}`)
      ? t(`clusterConfigParam.dropdownOptions.PCS类型.${o.label}`)
      : o.label
  }))
)

const PCS_STAR_SPEC = [
  { reg: 0, key: 'totalVoltage', label: '总电压(V)', type: 'u16', scale: 10 },
  { reg: 1, key: 'totalCurrent', label: '总电流(A)', type: 's16', scale: 10 },
  { reg: 2, key: 'soc', label: 'SOC(%)', type: 'u16', scale: 1 },
  { reg: 3, key: 'soh', label: 'SOH(%)', type: 'u16', scale: 1 },
  { reg: 4, key: 'soe', label: 'SOE(%)', type: 'u16', scale: 1 },
  { reg: 5, key: 'ratedTotalVoltage', label: '额定总压(V)', type: 'u16', scale: 10 },
  { reg: 6, key: 'ratedCapacity', label: '额定容量(Ah)', type: 'u16', scale: 10 },
  { reg: 7, key: 'remainingCapacity', label: '剩余容量(Ah)', type: 'u16', scale: 10 },
  { reg: 8, key: 'ratedEnergy', label: '额定电量(kWh)', type: 'u16', scale: 10 },
  { reg: 9, key: 'remainingEnergy', label: '剩余电量(kWh)', type: 'u16', scale: 10 },
  { reg: 10, key: 'maxDischargePower', label: '最大允许放电功率(kW)', type: 'u16', scale: 10 },
  { reg: 11, key: 'maxChargePower', label: '最大允许充电功率(kW)', type: 'u16', scale: 10 },
  {
    reg: 12,
    key: 'faultStatus',
    label: '故障状态',
    type: 'u16',
    scale: 1,
    map: { 0: '正常', 1: '一级报警', 2: '二级报警', 3: '三级报警' }
  },
  { reg: 13, key: 'maxChargeCellVoltage', label: '最大允许充电单体电压(mV)', type: 'u16', scale: 1 },
  { reg: 14, key: 'minDischargeCellVoltage', label: '最小允许放电单体电压(mV)', type: 'u16', scale: 1 },
  { reg: 15, key: 'maxChargeTotalVoltage', label: '最大允许充电总压(V)', type: 'u16', scale: 10 },
  { reg: 16, key: 'minDischargeTotalVoltage', label: '最小允许放电总压(V)', type: 'u16', scale: 10 },
  {
    reg: 17,
    key: 'bcuStateMachine',
    label: 'BCU状态机',
    type: 'u16',
    scale: 1,
    map: { 0: '初始化', 1: '待机', 2: '充电', 3: '放电' }
  },
  { reg: 18, key: 'chargeStatus', label: '充电状态', type: 'u16', scale: 1, map: { 0: '允许充电', 1: '禁止充电' } },
  { reg: 19, key: 'dischargeStatus', label: '放电状态', type: 'u16', scale: 1, map: { 0: '允许放电', 1: '禁止放电' } },
  { reg: 20, key: 'hvCloseStatus', label: '高压闭合状态', type: 'u16', scale: 1, map: { 0: '断开', 1: '闭合' } }
]

const PCS_SYL_SPEC = [
  { reg: 0, key: 'totalVoltage', label: '总电压(V)', type: 'u16', scale: 10 },
  { reg: 1, key: 'totalCurrent', label: '电池组充/放电总电流(A)', type: 's16', scale: 10 },
  { reg: 2, key: 'soc', label: 'SOC(%)', type: 'u16', scale: 1 },
  { reg: 3, key: 'soh', label: 'SOH(%)', type: 'u16', scale: 1 },
  { reg: 4, key: 'soe', label: 'SOE(%)', type: 'u16', scale: 1 },
  { reg: 5, key: 'ratedVoltage', label: '额定电压(V)', type: 'u16', scale: 10 },
  { reg: 6, key: 'ratedCurrent', label: '额定电流(A)', type: 'u16', scale: 10 },
  { reg: 7, key: 'ratedCapacity', label: '额定容量(Ah)', type: 'u16', scale: 1 },
  { reg: 8, key: 'dischargeEndVoltage', label: '放电截止电压(V)', type: 'u16', scale: 10 },
  { reg: 9, key: 'chargeEndVoltage', label: '充电截止电压(V)', type: 'u16', scale: 10 },
  { reg: 10, key: 'maxDischargeCurrent', label: '最大放电电流(A)', type: 'u16', scale: 10 },
  { reg: 11, key: 'maxChargeCurrent', label: '最大充电电流(A)', type: 'u16', scale: 10 },
  { reg: 12, key: 'maxDischargePower', label: '最大允许放电功率(kW)', type: 'u16', scale: 10 },
  { reg: 13, key: 'maxChargePower', label: '最大允许充电功率(kW)', type: 'u16', scale: 10 },
  { reg: 14, key: 'totalAlarm', label: '总告警', type: 'u16', scale: 1, map: { 0: '无告警', 1: '有一级或二级报警' } },
  { reg: 15, key: 'totalFault', label: '总故障', type: 'u16', scale: 1, map: { 0: '正常', 1: '有三级报警' } },
  { reg: 16, key: 'hvDisconnectStatus', label: '高压断开状态', type: 'u16', scale: 1, map: { 0: '闭合', 1: '断开' } },
  { reg: 17, key: 'chargeStatus', label: '充电状态', type: 'u16', scale: 1, map: { 0: '允许充电', 1: '禁止充电' } },
  { reg: 18, key: 'dischargeStatus', label: '放电状态', type: 'u16', scale: 1, map: { 0: '允许放电', 1: '禁止放电' } },
  { reg: 19, key: 'bmsStateMachine', label: 'BMS状态机', type: 'u16', scale: 1, map: { 0: '初始化', 1: '停机', 2: '待机', 3: '充电', 4: '放电', 5: '故障' } },
  { reg: 20, key: 'bmsHeartbeat', label: 'BMS心跳', type: 'u16', scale: 1 }
]

const PCS_KEHUA_SPEC = [
  { reg: 0, key: 'batteryVoltage', label: '电池电压(V)', type: 'u16', scale: 10 },
  {
    reg: 1,
    key: 'pcsRunState',
    label: 'PCS状态字',
    type: 'bits',
    bit: 0,
    len: 4,
    map: { 0: '停机', 1: '备用', 2: '故障', 3: '充电', 4: '放电', 5: '充电降额', 6: '放电降额' }
  },
  { reg: 1, key: 'acStatus', label: '交流电状态', type: 'bits', bit: 4, len: 1, map: { 0: '无交流电', 1: '有交流电' } },
  {
    reg: 2,
    key: 'bmsSystemState',
    label: 'BMS系统状态',
    type: 'bits',
    bit: 4,
    len: 3,
    map: { 0: 'Initial', 1: 'Normal', 2: 'Charge disabled', 3: 'Discharge disabled', 4: 'Alarm', 5: 'Fault', 6: 'Standby', 7: 'Reserved' }
  },
  { reg: 2, key: 'bmsHeartbeat', label: 'BMS心跳', type: 'bits', bit: 12, len: 4 },
  { reg: 4, key: 'batteryVoltage', label: '电池电压(V)', type: 'u16', scale: 10 },
  { reg: 5, key: 'batteryCurrent', label: '电池电流(A)', type: 'u16', scale: 10, offset: -2000 },
  { reg: 6, key: 'soc', label: 'SOC(%)', type: 'u16', scale: 10 },
  { reg: 7, key: 'soh', label: 'SOH(%)', type: 'u16', scale: 10 },
  { reg: 8, key: 'maxChargeCurrent', label: '最大允许充电电流(A)', type: 'u16', scale: 10 },
  { reg: 9, key: 'maxDischargeCurrent', label: '最大允许放电电流(A)', type: 'u16', scale: 10 },
  { reg: 10, key: 'maxChargeVoltage', label: '最大允许充电电压(V)', type: 'u16', scale: 10 },
  { reg: 11, key: 'maxDischargeVoltage', label: '最大允许放电电压(V)', type: 'u16', scale: 10 },
  { reg: 12, key: 'availableChargeEnergy', label: '可用充电电量(kWh)', type: 'u16', scale: 10 },
  { reg: 13, key: 'availableDischargeEnergy', label: '可用放电电量(kWh)', type: 'u16', scale: 10 }
]

const getSpecByType = (type) => {
  if (type === 1) return PCS_STAR_SPEC
  if (type === 2) return PCS_SYL_SPEC
  if (type === 3) return PCS_KEHUA_SPEC
  if (type === 65535) return []
  return PCS_STAR_SPEC
}

const getDecimalsByScale = (scale) => {
  if (!scale || scale === 1) return 0
  const s = String(scale)
  return s.length - 1
}

const decodeField = (field, registers) => {
  const reg = Number(field.reg)
  const raw = registers && reg >= 0 && reg < registers.length ? registers[reg] : undefined
  if (raw === undefined) {
    return { ...field, value: '---', rawValue: undefined }
  }

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

const parsedFields = computed(() => {
  if (selectedPcsType.value === 65535) {
    return PCS_STAR_SPEC.map((f) => ({ ...f, value: '---', rawValue: undefined }))
  }
  const spec = getSpecByType(selectedPcsType.value)
  return spec.map((f) => decodeField(f, pcsRegisters.value))
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
  for (let i = 0; i < maxLen; i++) {
    rows.push({ left: leftData.value[i], right: rightData.value[i] })
  }
  return rows
})

const translateLabel = (field) => {
  if (!field) return ''
  const typeKey = currentPcsTypeKey.value
  const i18nKey = `cluster_peripheral.pcs.${typeKey}.fields.${field.key}`
  return te(i18nKey) ? t(i18nKey) : field.label || ''
}

const formatValue = (field) => {
  if (!field || field.value === null || field.value === undefined || field.value === '---') return '---'
  if (field.map !== undefined && field.rawValue !== undefined) {
    const typeKey = currentPcsTypeKey.value
    const mapKey = `cluster_peripheral.pcs.${typeKey}.valueMap.${field.key}.${field.rawValue}`
    return te(mapKey) ? t(mapKey) : String(field.value)
  }
  return String(field.value)
}

const handlePcsData = (event, msg) => {
  const ids = selectedClusterIds.value
  if (!ids) return
  if (!msg || msg.dataType !== 'PCS' || msg.blockId !== ids.blockId || msg.clusterId !== ids.clusterId) {
    return
  }
  pcsRegisters.value = Array.isArray(msg.data) ? msg.data : []
}

const handleSysBaseParam = (event, msg) => {
  const ids = selectedClusterIds.value
  if (!ids) return
  if (!msg || msg.dataType !== 'SYS_BASE_PARAM_R' || msg.blockId !== ids.blockId || msg.clusterId !== ids.clusterId) {
    return
  }
  const pcsType = msg.data && typeof msg.data === 'object' ? msg.data.PcsType : undefined
  if (pcsType === undefined || pcsType === null) return
  configPcsType.value = pcsType
}

const registerListener = () => {
  if (ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.on('PCS', handlePcsData)
  window.electron.ipcRenderer.on('SYS_BASE_PARAM_R', handleSysBaseParam)
  ipcListenerRegistered = true
}

const unregisterListener = () => {
  if (!ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeListener('PCS', handlePcsData)
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
    pcsRegisters.value = []
    configPcsType.value = null
    hasUserSelection.value = false
    selectedPcsType.value = 65535
    if (ids) requestSysBaseParam()
  },
  { immediate: true }
)

watch(
  () => configPcsType.value,
  (val) => {
    if (val === null || val === undefined) return
    const num = Number(val)
    const normalized = num === 1 || num === 2 || num === 3 ? num : 65535

    if (hasUserSelection.value) return

    selectedPcsType.value = normalized
    hasUserSelection.value = false
  }
)

watch(selectedPcsType, (newValue, oldValue) => {
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
          {{ row.left ? translateLabel(row.left) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.pcs.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          {{ row.left ? formatValue(row.left) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.pcs.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ row.right ? translateLabel(row.right) : '' }}
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
