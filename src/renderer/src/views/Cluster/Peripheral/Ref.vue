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

const refRegisters = ref([])
const configCoolType = ref(null)
const selectedCoolType = ref(65535)
const hasUserSelection = ref(false)
let ipcListenerRegistered = false

const COOL_TYPE_OPTIONS = [
  { label: '无制冷设备', value: 65535 },
  { label: '科诺威水冷机', value: 1 },
  { label: '英维克-EMW50HFNC1A', value: 2 },
  { label: '埃森特交流空调', value: 3 },
  { label: '英维克-EMW-30-50-80', value: 4 },
  { label: '均能水冷机-1', value: 5 }
]

const COOL_TYPE_KEY_MAP = {
  65535: 'none',
  1: 'kno_water_cooler',
  2: 'envicool_emw50',
  3: 'essent_ac',
  4: 'envicool_emw_series',
  5: 'junneng_water_cooler'
}

const currentCoolTypeKey = computed(() => {
  return COOL_TYPE_KEY_MAP[selectedCoolType.value] || 'kno_water_cooler'
})

const displayCoolTypeKey = computed(() => {
  if (selectedCoolType.value === 65535) return 'envicool_emw50'
  return currentCoolTypeKey.value
})

const coolTypeOptions = computed(() =>
  COOL_TYPE_OPTIONS.map((o) => ({
    ...o,
    label: te(`clusterConfigParam.dropdownOptions.制冷设备类型.${o.label}`)
      ? t(`clusterConfigParam.dropdownOptions.制冷设备类型.${o.label}`)
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
  const regRaw = registers && reg >= 0 && reg < registers.length ? registers[reg] : undefined
  if (regRaw === undefined) return { ...field, value: '---', rawValue: undefined }

  if (Array.isArray(field.invalidRawValues) && field.invalidRawValues.includes(regRaw)) {
    return { ...field, value: '---', rawValue: undefined }
  }

  const byteMode = field.byte === 'high' ? 'high' : field.byte === 'low' ? 'low' : null
  const baseRaw = byteMode === 'low' ? regRaw & 0xff : byteMode === 'high' ? (regRaw >> 8) & 0xff : regRaw

  if (field.type === 'bits') {
    const bit = Number(field.bit || 0)
    const len = Number(field.len || 1)
    const mask = len >= 16 ? 0xffff : (1 << len) - 1
    const v = (baseRaw >> bit) & mask
    const mapped = field.map && field.map[v] !== undefined ? field.map[v] : v
    return { ...field, value: mapped, rawValue: v }
  }

  let value = baseRaw
  if (field.type === 's16') {
    value = regRaw > 32767 ? regRaw - 65536 : regRaw
  }

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

const KNO_W_SPEC = [
  { reg: 0, key: 'mode', label: '模式', type: 'u16', map: { 0: '待机', 1: '制冷', 2: '加热', 3: '自循环（只开启水泵）' } },
  { reg: 1, key: 'setTemp', label: '设定温度(℃)', type: 'u16', offset: -40 },
  { reg: 2, key: 'inletTemp', label: '进水温度(℃)', type: 'u16', offset: -40 },
  { reg: 3, key: 'outletTemp', label: '出水温度(℃)', type: 'u16', offset: -40 },
  { reg: 4, key: 'ambientTemp', label: '环境温度(℃)', type: 'u16', offset: -40 },
  { reg: 5, key: 'exhaustTemp', label: '排气温度(℃)', type: 'u16', offset: -40 },
  { reg: 6, key: 'inletPressure', label: '进水压力(Bar)', type: 'u16', scale: 10 },
  { reg: 7, key: 'outletPressure', label: '出水压力(Bar)', type: 'u16', scale: 10 },
  { reg: 8, key: 'suctionPressure', label: '吸气压力(Bar)', type: 'u16', scale: 10 },
  { reg: 9, key: 'dischargePressure', label: '排气压力(Bar)', type: 'u16', scale: 10 },
  { reg: 10, key: 'pumpSpeed', label: '水泵转速(%)', type: 'u16' },
  { reg: 11, key: 'fanSpeed', label: '风机转速(%)', type: 'u16' },
  { reg: 12, key: 'compressorSpeed', label: '压缩机转速', type: 'u16' },
  { reg: 13, key: 'heartbeat', label: '心跳', type: 'u16' },
  { reg: 14, key: 'softwareVersion', label: '软件版本', type: 'u16' },
  { reg: 15, key: 'alarmLevel', label: '故障等级', type: 'u16', map: { 0: '无故障', 1: '一级故障', 2: '二级故障', 3: '三级故障' } },
  { reg: 16, key: 'faultCode1_b0', label: '高压压力过高', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b1', label: '低压压力过低', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b2', label: '水泵故障', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b3', label: 'PTC过温故障', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b4', label: '风扇故障', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b5', label: '出水温度传感器故障', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b6', label: '进水温度传感器故障', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b7', label: '环境温度传感器故障', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b8', label: '高压压力开关故障', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b9', label: '进水压力传感器故障', type: 'bits', bit: 9, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b10', label: '出水压力传感器故障', type: 'bits', bit: 10, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b11', label: '高压压力传感器故障', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b12', label: '低压压力传感器故障', type: 'bits', bit: 12, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b13', label: '压缩机通信故障', type: 'bits', bit: 13, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b14', label: '压缩机控制器故障', type: 'bits', bit: 14, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 16, key: 'faultCode1_b15', label: 'BMS通信丢失故障', type: 'bits', bit: 15, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b0', label: '进水压力过低故障', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b1', label: '出水压力过高故障', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b2', label: '高压继电器1故障', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b3', label: '高压继电器2故障', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b4', label: 'ACDC1过压故障', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b5', label: 'ACDC1欠压故障', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b6', label: 'ACDC2欠压故障', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b7', label: 'ACDC2过压故障', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b8', label: '水阀故障', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b9', label: '排气温度传感器故障', type: 'bits', bit: 9, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b10', label: '水压差过低故障', type: 'bits', bit: 10, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b11', label: '水压差过高故障', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b12', label: '水阀通讯故障', type: 'bits', bit: 12, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b13', label: '预留', type: 'bits', bit: 13, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b14', label: '预留', type: 'bits', bit: 14, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 17, key: 'faultCode2_b15', label: '预留', type: 'bits', bit: 15, len: 1, map: { 0: '正常', 1: '故障' } },
]

const EVK_SPEC = [
  { reg: 0, key: 'cellMaxTemp', label: '电芯最大温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 1, key: 'cellMinTemp', label: '电芯最小温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 2, key: 'cellAvgTemp', label: '电芯平均温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 3, key: 'coolPoint', label: '制冷点(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 4, key: 'heatPoint', label: '加热点(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 5, key: 'coolHysteresis', label: '制冷回差(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 6, key: 'heatHysteresis', label: '加热回差(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 7, key: 'outletWaterTemp', label: '出水温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 8, key: 'returnWaterTemp', label: '回水温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 9, key: 'exhaustTemp', label: '排气温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 10, key: 'ambientTemp', label: '环境温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 11, key: 'inletPressure', label: '进水压力(Bar)', type: 'u16', scale: 100, invalidRawValues: [0x7fff] },
  { reg: 12, key: 'outletPressure', label: '出水压力(Bar)', type: 'u16', scale: 100, invalidRawValues: [0x7fff] },
  { reg: 13, key: 'outletHighTemp', label: '出水高温', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 14, key: 'outletLowTemp', label: '出水低温', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 15, key: 'outletTempSensorFault', label: '出水温感故障', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 16, key: 'returnTempSensorFault', label: '回水温感故障', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 17, key: 'inverterCommFault', label: '变频器通讯故障', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 18, key: 'highPressureLock', label: '系统高压锁定', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 19, key: 'lowPressureLock', label: '系统低压锁定', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 20, key: 'exhaustHighTempLock', label: '排气温度过高锁定', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 21, key: 'inverterOverCurrentLock', label: '变频器过流锁定', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 22, key: 'inverterOverTempLock', label: '变频器过温锁定', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 23, key: 'inverterOverVoltLock', label: '变频器过压锁定', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 24, key: 'inverterUnderVoltLock', label: '变频器欠压锁定', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 25, key: 'inverterPhaseLossLock', label: '变频器缺相锁定', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 26, key: 'inverterOtherFaultLock', label: '变频器其他故障锁定', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 27, key: 'waterSupplyAlarm', label: '补水告警', type: 'u16', map: { 0: '正常', 1: '缺水', 255: '告警未使能' } },
  { reg: 28, key: 'systemPressureHighAlarm', label: '系统压力过高告警', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 29, key: 'outletPressureHighAlarm', label: '出水压力过高告警', type: 'u16', map: { 0: '正常', 1: '告警', 255: '告警未使能' } },
  { reg: 30, key: 'pumpSpeed', label: '水泵当前转速(%)', type: 'u16', scale: 10, invalidRawValues: [0x7fff] },
  { reg: 31, key: 'pumpStatus', label: '水泵状态', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 32, key: 'heartbeat', label: '心跳', type: 'u16' },
  { reg: 33, key: 'compressorStatus', label: '压缩机状态', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 34, key: 'sysMode', label: '当前系统模式', type: 'u16', map: { 0: '停止', 1: '内循环', 2: '制冷', 3: '加热', 4: '全自动', 5: '补水' } },
  { reg: 35, key: 'switchStatus', label: '系统开关机', type: 'u16', map: { 0: '关机', 1: '开机' } }
]

const EVK_EMW_30_50_80_SPEC = [
  { reg: 0, key: 'cellMaxTemp', label: '电芯最大温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 1, key: 'cellMinTemp', label: '电芯最小温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 2, key: 'cellAvgTemp', label: '电芯平均温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 3, key: 'sysPowerSwitch', label: '系统开关机', type: 'u16', map: { 0: '关机', 1: '开机' } },
  {
    reg: 4,
    key: 'runMode',
    label: '运行模式',
    type: 'u16',
    map: { 0: '停止', 1: '自循环', 2: '制冷', 3: '加热', 4: '全自动' }
  },
  {
    reg: 5,
    key: 'tempControlSource',
    label: '控制温度选配',
    type: 'u16',
    map: { 0: '电芯平均温度', 1: '出水温度', 2: '回水温度', 3: '电芯权重温度' }
  },
  { reg: 6, key: 'coolPoint', label: '制冷点(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 7, key: 'heatPoint', label: '加热点(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 8, key: 'coolHysteresis', label: '制冷回差(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 9, key: 'heatHysteresis', label: '加热回差(℃)', type: 's16', scale: 10, invalidRawValues: [0x7ffe, 0x7fff] },
  { reg: 10, key: 'pumpGear', label: '水泵挡位选配', type: 'u16', map: { 0: '默认挡', 1: '一挡', 2: '二挡', 3: '三挡' } },
  { reg: 11, key: 'deviceId', label: '设备ID', type: 'u16' },
  { reg: 12, key: 'baudRate', label: '波特率', type: 'u16', map: { 2: '4800', 3: '9600', 4: '19200' } },
  { reg: 13, key: 'reserved1', label: '保留', type: 'u16' },
  {
    reg: 14,
    key: 'compressorGear',
    label: '压缩机挡位选择',
    type: 'u16',
    map: { 0: '默认挡', 1: '一挡', 2: '二挡', 3: '三挡' }
  },
  { reg: 15, key: 'reserved2', label: '保留', type: 'u16' },
  { reg: 16, key: 'silentModeEnable', label: '静音模式使能开关', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 17, key: 'silentModeOuterFanMax', label: '静音模式外风机转速上限(%)', type: 'u16' },
  { reg: 18, key: 'setPointResetAfterCommLost', label: '通信中断后制冷加热点复位', type: 'u16', map: { 0: '不复位', 1: '复位' } },
  { reg: 19, key: 'powerOnAutoStart', label: '来电自启动', type: 'u16', map: { 0: '开机', 1: '保持', 2: '关机' } },
  { reg: 20, key: 'outletWaterTemp', label: '出水温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7fff] },
  { reg: 21, key: 'returnWaterTemp', label: '回水温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7fff] },
  { reg: 22, key: 'exhaustTemp', label: '排气温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7fff] },
  { reg: 23, key: 'ambientTemp', label: '环境温度(℃)', type: 's16', scale: 10, invalidRawValues: [0x7fff] },
  { reg: 24, key: 'returnWaterPressure', label: '回水压力(Bar)', type: 'u16', scale: 100, invalidRawValues: [0x7fff] },
  { reg: 25, key: 'outletWaterPressure', label: '出水压力(Bar)', type: 'u16', scale: 100 },
  { reg: 26, key: 'outletHighTempAlarm', label: '出水高温', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 27, key: 'outletLowTempAlarm', label: '出水低温', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 28, key: 'outletTempSensorFault', label: '出水温感故障', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 29, key: 'returnTempSensorFault', label: '回水温感故障', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 30, key: 'waterPressureDiffLow', label: '出水回水压差低', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 31, key: 'compressorDriverCommFault', label: '压缩机驱动通信异常', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 32, key: 'sysHighPressureLock', label: '系统高压锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 33, key: 'sysLowPressureLock', label: '系统低压锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 34, key: 'exhaustOverTempLock', label: '排气过温锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 35, key: 'compressorDriverOverCurrentLock', label: '压缩机驱动过流锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 36, key: 'compressorDriverOverTempLock', label: '压缩机驱动过温锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 37, key: 'compressorDriverOverVoltageLock', label: '压缩机驱动过压锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 38, key: 'compressorDriverUnderVoltageLock', label: '压缩机驱动欠压锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 39, key: 'compressorDriverPhaseLossLock', label: '压缩机驱动缺相锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 40, key: 'compressorDriverOtherFaultLock', label: '压缩机驱动其他故障锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  {
    reg: 41,
    key: 'currentAlarmLevel',
    label: '当前告警最高等级',
    type: 'u16',
    map: { 0: '无告警', 1: '一级告警', 2: '二级告警', 3: '三级告警' }
  },
  { reg: 42, key: 'waterTankLowLevel', label: '补水箱低水位', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 43, key: 'waterShortageAlarm', label: '缺水告警', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 44, key: 'sysPressureHigh', label: '系统压力过高', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 45, key: 'outletPressureHigh', label: '出水压力过高', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 46, key: 'suctionTempSensorFault', label: '吸气温感故障', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 47, key: 'lowPressureFault', label: '低压压力故障', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 48, key: 'powerFault', label: '电源故障', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 49, key: 'powerPhaseLoss', label: '电源缺相', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 50, key: 'powerReversePhase', label: '电源逆相', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 51, key: 'powerOverVoltage', label: '电源过压', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 52, key: 'powerUnderVoltage', label: '电源欠压', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 53, key: 'compressorDriverOverVoltage', label: '压缩机驱动过压', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 54, key: 'compressorDriverUnderVoltage', label: '压缩机驱动欠压', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 55, key: 'compressorDriverPhaseLoss', label: '压缩机驱动缺相', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 56, key: 'pumpDriverCommFault', label: '水泵驱动通信异常', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 57, key: 'pumpDriverOverVoltage', label: '水泵驱动过压', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 58, key: 'pumpDriverUnderVoltage', label: '水泵驱动欠压', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 59, key: 'pumpDriverPhaseLoss', label: '水泵驱动缺相', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 60, key: 'pressureSensorFault', label: '出水回水压力传感器故障', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 61, key: 'tempSensorFault', label: '出水回水温度传感器故障', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 62, key: 'electricHeaterFaultLock', label: '电加热故障锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 63, key: 'condensationOverTempLock', label: '冷凝过温锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 64, key: 'pumpDriverOverVoltageLock', label: '水泵驱动过压锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 65, key: 'pumpDriverUnderVoltageLock', label: '水泵驱动欠压锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 66, key: 'pumpDriverOverTempLock', label: '水泵驱动过温锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 67, key: 'pumpDriverPhaseLossLock', label: '水泵驱动缺相锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 68, key: 'pumpDriverOverCurrentLock', label: '水泵驱动过流锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 69, key: 'pumpDriverOtherFaultLock', label: '水泵驱动其他故障锁定', type: 'u16', map: { 0: '正常', 1: '告警' } },
  { reg: 70, key: 'pumpRunningSpeed', label: '水泵运行转速(%)', type: 'u16', scale: 10 },
  { reg: 71, key: 'pumpOnOffStatus', label: '水泵启停状态', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 72, key: 'heartbeat', label: '心跳', type: 'u16' },
  { reg: 73, key: 'compressorOnOffStatus', label: '压缩机启停状态', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 74, key: 'softwareCode', label: '软件编码', type: 'u16' },
  { reg: 75, key: 'softwareVersion', label: '软件版本', type: 'u16' },
  { reg: 76, key: 'compressorTotalRunTimeLow', label: '压缩机总运行时间低字节', type: 'u16' },
  { reg: 77, key: 'compressorTotalRunTimeHigh', label: '压缩机总运行时间高字节', type: 'u16' },
  { reg: 78, key: 'compressorStartCountLow', label: '压缩机开启次数低字节', type: 'u16' },
  { reg: 79, key: 'compressorStartCountHigh', label: '压缩机开启次数高字节', type: 'u16' },
  { reg: 80, key: 'heaterTotalRunTimeLow', label: '电加热总运行时间低字节', type: 'u16' },
  { reg: 81, key: 'heaterTotalRunTimeHigh', label: '电加热总运行时间高字节', type: 'u16' },
  { reg: 82, key: 'heaterStartCountLow', label: '电加热开启次数低字节', type: 'u16' },
  { reg: 83, key: 'heaterStartCountHigh', label: '电加热开启次数高字节', type: 'u16' },
  { reg: 84, key: 'pumpTotalRunTimeLow', label: '水泵总运行时间低字节', type: 'u16' },
  { reg: 85, key: 'pumpTotalRunTimeHigh', label: '水泵总运行时间高字节', type: 'u16' },
  { reg: 86, key: 'pumpStartCountLow', label: '水泵开启次数低字节', type: 'u16' },
  { reg: 87, key: 'pumpStartCountHigh', label: '水泵开启次数高字节', type: 'u16' },
  { reg: 88, key: 'outerFanTotalRunTimeLow', label: '外风机总运行时间低字节', type: 'u16' },
  { reg: 89, key: 'outerFanTotalRunTimeHigh', label: '外风机总运行时间高字节', type: 'u16' },
  { reg: 90, key: 'outerFanStartCountLow', label: '外风机开启次数低字节', type: 'u16' },
  { reg: 91, key: 'outerFanStartCountHigh', label: '外风机开启次数高字节', type: 'u16' },
  {
    reg: 92,
    key: 'sysRunMode',
    label: '系统运行模式',
    type: 'u16',
    map: { 0: '停止', 1: '自循环', 2: '制冷', 3: '加热', 4: '全自动' }
  },
  { reg: 93, key: 'unitPowerStatus', label: '机组开关机状态', type: 'u16', map: { 0: '关机', 1: '开机' } },
  { reg: 94, key: 'heaterOnOffStatus', label: '电加热启停状态', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 95, key: 'outerFanSpeed', label: '外风机运行转速(%)', type: 'u16' },
  { reg: 96, key: 'compressorSpeed', label: '压缩机运行转速(%)', type: 'u16' }
]

const JUNNENG_WATER_CHILLER_1_SPEC = [
  { reg: 0, key: 'sysSwitch', label: '系统开关', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 1, key: 'autoModeEnable', label: '自动模式使能', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 2, key: 'tempControlMode', label: '温度控制方式', type: 'u16', map: { 0: '出水', 1: '进水', 2: '电芯' } },
  { reg: 3, key: 'workMode', label: '当前工作模式', type: 'u16', map: { 0: '自循环', 1: '制冷', 2: '制热' } },
  { reg: 4, key: 'coolTarget', label: '制冷目标设置值(℃)', type: 's16' },
  { reg: 5, key: 'coolDiff', label: '制冷回差(℃)', type: 's16' },
  { reg: 6, key: 'heatTarget', label: '制热目标设置值(℃)', type: 's16' },
  { reg: 7, key: 'heatDiff', label: '制热回差(℃)', type: 's16' },
  { reg: 8, key: 'bmsCellAvgTemp', label: 'BMS电芯平均温度(℃)', type: 's16' },
  { reg: 9, key: 'bmsCellMinTemp', label: 'BMS电芯最小温度(℃)', type: 's16' },
  { reg: 10, key: 'bmsCellMaxTemp', label: 'BMS电芯最高温度(℃)', type: 's16' },
  { reg: 11, key: 'reserve1', label: '预留1', type: 'u16' },
  { reg: 12, key: 'reserve2', label: '预留2', type: 'u16' },
  { reg: 13, key: 'reserve3', label: '预留3', type: 'u16' },
  { reg: 14, key: 'reserve4', label: '预留4', type: 'u16' },
  { reg: 15, key: 'reserve5', label: '预留5', type: 'u16' },
  { reg: 16, key: 'reserve6', label: '预留6', type: 'u16' },
  { reg: 17, key: 'reserve7', label: '预留7', type: 'u16' },
  { reg: 18, key: 'reserve8', label: '预留8', type: 'u16' },
  { reg: 19, key: 'reserve9', label: '预留9', type: 'u16' },
  { reg: 20, key: 'reserve10', label: '预留10', type: 'u16' },
  { reg: 21, key: 'switchStatus', label: '开关', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 22, key: 'autoModeEnableStatus', label: '自动模式使能', type: 'u16', map: { 0: '关闭', 1: '开启' } },
  { reg: 23, key: 'workModeStatus', label: '当前工作模式', type: 'u16', map: { 0: '自循环', 1: '制冷', 2: '制热' } },
  { reg: 24, key: 'ambientTemp', label: '环境温度(℃)', type: 's16' },
  { reg: 25, key: 'coolWaterTempSet', label: '制冷水温设置值(℃)', type: 's16' },
  { reg: 26, key: 'coolWaterTempDiff', label: '制冷水温回差(℃)', type: 's16' },
  { reg: 27, key: 'heatWaterTempSet', label: '制热水温设置值(℃)', type: 's16' },
  { reg: 28, key: 'heatWaterTempDiff', label: '制热水温回差(℃)', type: 's16' },
  { reg: 29, key: 'tempControlModeStatus', label: '温度控制方式', type: 'u16', map: { 0: '出水', 1: '进水', 2: '电芯' } },
  { reg: 30, key: 'reserve11', label: '预留11', type: 'u16' },
  { reg: 31, key: 'bmsActualTemp', label: 'BMS实际温度(℃)', type: 's16' },
  { reg: 32, key: 'inletTemp', label: '进水温度(℃)', type: 's16', scale: 10 },
  { reg: 33, key: 'outletTemp', label: '出水温度(℃)', type: 's16', scale: 10 },
  { reg: 34, key: 'inletPressure', label: '进水压力(Kpa)', type: 's16' },
  { reg: 35, key: 'outletPressure', label: '出水压力(Kpa)', type: 's16' },
  { reg: 36, key: 'compressor1ExhaustTemp', label: '压缩机1排气温度(℃)', type: 's16' },
  { reg: 37, key: 'compressor1SuctionTemp', label: '压缩机1吸气温度(℃)', type: 's16' },
  { reg: 38, key: 'compressor1ExhaustPressure', label: '压缩机1排气压力值(Kpa)', type: 's16' },
  { reg: 39, key: 'compressor1SuctionPressure', label: '压缩机1吸气压力(Kpa)', type: 's16' },
  { reg: 40, key: 'compressor1SaturationTemp', label: '压缩机1饱和温度(℃)', type: 's16' },
  { reg: 41, key: 'compressor1SuctionSuperheat', label: '压缩机1吸气过热度(℃)', type: 's16' },
  { reg: 42, key: 'compressor2ExhaustTemp', label: '压缩机2排气温度(℃)', type: 's16' },
  { reg: 43, key: 'compressor2SuctionTemp', label: '压缩机2吸气温度(℃)', type: 's16' },
  { reg: 44, key: 'compressor2ExhaustPressure', label: '压缩机2排气压力值(Kpa)', type: 's16' },
  { reg: 45, key: 'compressor2SuctionPressure', label: '压缩机2吸气压力(Kpa)', type: 's16' },
  { reg: 46, key: 'compressor2SaturationTemp', label: '压缩机2饱和温度(℃)', type: 's16' },
  { reg: 47, key: 'compressor2SuctionSuperheat', label: '压缩机2吸气过热度(℃)', type: 's16' },
  { reg: 48, key: 'pumpSpeedSet', label: '设置水泵速度(rpm)', type: 's16' },
  { reg: 49, key: 'pumpSpeedActual', label: '水泵实际速度(rpm)', type: 's16' },
  { reg: 50, key: 'pumpPowerActual', label: '水泵实际功率(W)', type: 's16' },
  { reg: 51, key: 'pumpStatus', label: '水泵状态', type: 's16', map: { 0: '关闭', 1: '开启' } },
  { reg: 52, key: 'ptcHeatSet', label: 'PTC加热设置', type: 's16', map: { 0: '关闭', 1: '开启' } },
  { reg: 53, key: 'ptcHeatStatus', label: 'PTC状态', type: 's16', map: { 0: '关闭', 1: '开启' } },
  { reg: 54, key: 'eev1StepsSet', label: '设置电子膨胀阀1步数', type: 's16' },
  { reg: 55, key: 'eev1StepsActual', label: '电子膨胀阀1实际步数', type: 's16' },
  { reg: 56, key: 'eev1Status', label: '电子膨胀阀1状态', type: 's16', map: { 0: '待机', 1: '关', 2: '开' } },
  { reg: 57, key: 'eev2StepsSet', label: '设置电子膨胀阀2步数', type: 's16' },
  { reg: 58, key: 'eev2StepsActual', label: '电子膨胀阀2实际步数', type: 's16' },
  { reg: 59, key: 'eev2Status', label: '电子膨胀阀2状态', type: 's16', map: { 0: '待机', 1: '关', 2: '开' } },
  { reg: 60, key: 'fanSpeedSet', label: '设置风扇速度(%)', type: 's16' },
  { reg: 61, key: 'fan1Speed', label: '风扇1实际速度(rpm)', type: 's16' },
  { reg: 62, key: 'fan2Speed', label: '风扇2实际速度(rpm)', type: 's16' },
  { reg: 63, key: 'fan3Speed', label: '风扇3实际速度(rpm)', type: 's16' },
  { reg: 64, key: 'fan4Speed', label: '风扇4实际速度(rpm)', type: 's16' },
  { reg: 65, key: 'fanFaultStatusFan', label: '风扇故障状态', type: 's16', map: { 0: '正常',1: '风机1故障', 17: '风机1和风机2故障' } },
  { reg: 66, key: 'crankcaseHeater1', label: '曲轴加热带1状态', type: 's16' },
  { reg: 67, key: 'compressor1SpeedSet', label: '设置压缩机1速度(HZ)', type: 's16' },
  { reg: 68, key: 'compressor1SpeedActual', label: '压缩机1实际速度(HZ)', type: 's16' },
  { reg: 69, key: 'compressor1Status_b0', label: '压缩机1状态-bit0 驱动器开/关机状态', type: 'bits', bit: 0, len: 1, map: { 0: '待机', 1: '运转' } },
  { reg: 69, key: 'compressor1Status_b1', label: '压缩机1状态-bit1 PFC开/关机状态', type: 'bits', bit: 1, len: 1, map: { 0: '关', 1: '开' } },
  { reg: 69, key: 'compressor1Status_b2', label: '压缩机1状态-bit2 IPM过热限频状态', type: 'bits', bit: 2, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 69, key: 'compressor1Status_b3', label: '压缩机1状态-bit3 IPM过热降频状态', type: 'bits', bit: 3, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 69, key: 'compressor1Status_b4', label: '压缩机1状态-bit4 压缩机电流降频状态', type: 'bits', bit: 4, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 69, key: 'compressor1Status_b5', label: '压缩机1状态-bit5 PFC电流降频状态', type: 'bits', bit: 5, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 69, key: 'compressor1Status_b6', label: '压缩机1状态-bit6 压缩机电流限频状态', type: 'bits', bit: 6, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 69, key: 'compressor1Status_b7', label: '压缩机1状态-bit7 PFC电流限频状态', type: 'bits', bit: 7, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 69, key: 'compressor1Status_b8', label: '压缩机1状态-bit8 交流低电压限频', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '限频' } },
  { reg: 69, key: 'compressor1Status_b9', label: '压缩机1状态-bit9 充电电路状态', type: 'bits', bit: 9, len: 1, map: { 0: '充电完成', 1: '未完成' } },
  { reg: 69, key: 'compressor1Status_b10', label: '压缩机1状态-bit10 弱磁状态', type: 'bits', bit: 10, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 70, key: 'compressor1Fault1_b0', label: '压缩机1故障码1-bit0 IPM模块硬件过流', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b1', label: '压缩机1故障码1-bit1 预留', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b2', label: '压缩机1故障码1-bit2 IPM模块过热', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b3', label: '压缩机1故障码1-bit3 PFC模块过热', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b4', label: '压缩机1故障码1-bit4 PFC瞬间过流', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b5', label: '压缩机1故障码1-bit5 预留', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b6', label: '压缩机1故障码1-bit6 压缩机失步保护', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b7', label: '压缩机1故障码1-bit7 直流母线过压', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b8', label: '压缩机1故障码1-bit8 直流母线欠压', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b9', label: '压缩机1故障码1-bit9 输出缺相', type: 'bits', bit: 9, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b10', label: '压缩机1故障码1-bit10 启动失败（低速过流）', type: 'bits', bit: 10, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b11', label: '压缩机1故障码1-bit11 型号错误', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b12', label: '压缩机1故障码1-bit12 瞬间过流', type: 'bits', bit: 12, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b13', label: '压缩机1故障码1-bit13 输入电压过高', type: 'bits', bit: 13, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b14', label: '压缩机1故障码1-bit14 输入电压过低', type: 'bits', bit: 14, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 70, key: 'compressor1Fault1_b15', label: '压缩机1故障码1-bit15 有效值过流', type: 'bits', bit: 15, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b0', label: '压缩机1故障码2-bit0 输入缺相', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b1', label: '压缩机1故障码2-bit1 Buck输出电压异常', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b2', label: '压缩机1故障码2-bit2 预留', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b3', label: '压缩机1故障码2-bit3 预留', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b4', label: '压缩机1故障码2-bit4 预留', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b5', label: '压缩机1故障码2-bit5 电流检测电路故障', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b6', label: '压缩机1故障码2-bit6 PFC模块硬件过流', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b7', label: '压缩机1故障码2-bit7 预留', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b8', label: '压缩机1故障码2-bit8 预留', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b9', label: '压缩机1故障码2-bit9 其他故障', type: 'bits', bit: 9, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b10', label: '压缩机1故障码2-bit10 芯片复位故障', type: 'bits', bit: 10, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b11', label: '压缩机1故障码2-bit11 存储芯片故障', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b12', label: '压缩机1故障码2-bit12 IPM温度检测电路故障', type: 'bits', bit: 12, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b13', label: '压缩机1故障码2-bit13 PFC温度检测电路故障', type: 'bits', bit: 13, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b14', label: '压缩机1故障码2-bit14 驱动器与上位机通讯故障', type: 'bits', bit: 14, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 71, key: 'compressor1Fault2_b15', label: '压缩机1故障码2-bit15 充电回路故障', type: 'bits', bit: 15, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 72, key: 'compressor1AcPhaseVoltage', label: '压缩机1交流相电压(V)', type: 's16' },
  { reg: 73, key: 'compressor1AcPhaseCurrent', label: '压缩机1交流相电流(A)', type: 's16' },
  { reg: 74, key: 'crankcaseHeater2', label: '曲轴加热带2状态', type: 's16' },
  { reg: 75, key: 'compressor2SpeedSet', label: '设置压缩机2速度(rpm)', type: 's16' },
  { reg: 76, key: 'compressor2SpeedActual', label: '压缩机2实际速度(rpm)', type: 's16' },
  { reg: 77, key: 'compressor2Status_b0', label: '压缩机2状态-bit0 驱动器开/关机状态', type: 'bits', bit: 0, len: 1, map: { 0: '待机', 1: '运转' } },
  { reg: 77, key: 'compressor2Status_b1', label: '压缩机2状态-bit1 PFC开/关机状态', type: 'bits', bit: 1, len: 1, map: { 0: '关', 1: '开' } },
  { reg: 77, key: 'compressor2Status_b2', label: '压缩机2状态-bit2 IPM过热限频状态', type: 'bits', bit: 2, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 77, key: 'compressor2Status_b3', label: '压缩机2状态-bit3 IPM过热降频状态', type: 'bits', bit: 3, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 77, key: 'compressor2Status_b4', label: '压缩机2状态-bit4 压缩机电流降频状态', type: 'bits', bit: 4, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 77, key: 'compressor2Status_b5', label: '压缩机2状态-bit5 PFC电流降频状态', type: 'bits', bit: 5, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 77, key: 'compressor2Status_b6', label: '压缩机2状态-bit6 压缩机电流限频状态', type: 'bits', bit: 6, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 77, key: 'compressor2Status_b7', label: '压缩机2状态-bit7 PFC电流限频状态', type: 'bits', bit: 7, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 77, key: 'compressor2Status_b8', label: '压缩机2状态-bit8 交流低电压限频', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '限频' } },
  { reg: 77, key: 'compressor2Status_b9', label: '压缩机2状态-bit9 充电电路状态', type: 'bits', bit: 9, len: 1, map: { 0: '充电完成', 1: '未完成' } },
  { reg: 77, key: 'compressor2Status_b10', label: '压缩机2状态-bit10 弱磁状态', type: 'bits', bit: 10, len: 1, map: { 0: '否', 1: '是' } },
  { reg: 78, key: 'compressor2Fault1_b0', label: '压缩机2故障码1-bit0 IPM模块硬件过流', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b1', label: '压缩机2故障码1-bit1 预留', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b2', label: '压缩机2故障码1-bit2 IPM模块过热', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b3', label: '压缩机2故障码1-bit3 PFC模块过热', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b4', label: '压缩机2故障码1-bit4 PFC瞬间过流', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b5', label: '压缩机2故障码1-bit5 预留', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b6', label: '压缩机2故障码1-bit6 压缩机失步保护', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b7', label: '压缩机2故障码1-bit7 直流母线过压', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b8', label: '压缩机2故障码1-bit8 直流母线欠压', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b9', label: '压缩机2故障码1-bit9 输出缺相', type: 'bits', bit: 9, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b10', label: '压缩机2故障码1-bit10 启动失败（低速过流）', type: 'bits', bit: 10, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b11', label: '压缩机2故障码1-bit11 型号错误', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b12', label: '压缩机2故障码1-bit12 瞬间过流', type: 'bits', bit: 12, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b13', label: '压缩机2故障码1-bit13 输入电压过高', type: 'bits', bit: 13, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b14', label: '压缩机2故障码1-bit14 输入电压过低', type: 'bits', bit: 14, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 78, key: 'compressor2Fault1_b15', label: '压缩机2故障码1-bit15 有效值过流', type: 'bits', bit: 15, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b0', label: '压缩机2故障码2-bit0 输入缺相', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b1', label: '压缩机2故障码2-bit1 Buck输出电压异常', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b2', label: '压缩机2故障码2-bit2 预留', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b3', label: '压缩机2故障码2-bit3 预留', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b4', label: '压缩机2故障码2-bit4 预留', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b5', label: '压缩机2故障码2-bit5 电流检测电路故障', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b6', label: '压缩机2故障码2-bit6 PFC模块硬件过流', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b7', label: '压缩机2故障码2-bit7 预留', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b8', label: '压缩机2故障码2-bit8 预留', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b9', label: '压缩机2故障码2-bit9 其他故障', type: 'bits', bit: 9, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b10', label: '压缩机2故障码2-bit10 芯片复位故障', type: 'bits', bit: 10, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b11', label: '压缩机2故障码2-bit11 存储芯片故障', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b12', label: '压缩机2故障码2-bit12 IPM温度检测电路故障', type: 'bits', bit: 12, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b13', label: '压缩机2故障码2-bit13 PFC温度检测电路故障', type: 'bits', bit: 13, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b14', label: '压缩机2故障码2-bit14 驱动器与上位机通讯故障', type: 'bits', bit: 14, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 79, key: 'compressor2Fault2_b15', label: '压缩机2故障码2-bit15 充电回路故障', type: 'bits', bit: 15, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 80, key: 'compressor2AcPhaseVoltage', label: '压缩机2交流相电压(V)', type: 's16' },
  { reg: 81, key: 'compressor2AcPhaseCurrent', label: '压缩机2交流相电流(A)', type: 's16' },
  { reg: 82, key: 'waterFillValveStatus', label: '补水电磁阀状态', type: 's16', map: { 0: '关闭', 1: '开启' } },
  { reg: 83, key: 'waterFillPumpStatus', label: '补水泵状态', type: 's16', map: { 0: '关闭', 1: '开启' } },
  { reg: 84, key: 'sensorStatus1_b0', label: '传感器状态1-bit0 排气压力1异常', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b1', label: '传感器状态1-bit1 吸气压力1异常', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b2', label: '传感器状态1-bit2 排气压力2异常', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b3', label: '传感器状态1-bit3 吸气压力2异常', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b4', label: '传感器状态1-bit4 进水压力异常', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b5', label: '传感器状态1-bit5 出水压力异常', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b6', label: '传感器状态1-bit6 排气温度1异常', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b7', label: '传感器状态1-bit7 吸气温度1异常', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b8', label: '传感器状态1-bit8 排气温度2异常', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b9', label: '传感器状态1-bit9 吸气温度2异常', type: 'bits', bit: 9, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b10', label: '传感器状态1-bit10 进水温度异常', type: 'bits', bit: 10, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b11', label: '传感器状态1-bit11 出水温度异常', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 84, key: 'sensorStatus1_b12', label: '传感器状态1-bit12 环境温度异常', type: 'bits', bit: 12, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 85, key: 'sensorStatus2', label: '传感器状态2', type: 's16' },
  { reg: 86, key: 'sysFault1_b0', label: '系统故障码1-bit0 环境温度异常', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b1', label: '系统故障码1-bit1 进水压力低', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b2', label: '系统故障码1-bit2 出水压力高', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b3', label: '系统故障码1-bit3 进出水压力低', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b4', label: '系统故障码1-bit4 进出水温差大', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b5', label: '系统故障码1-bit5 水泵通讯异常', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b6', label: '系统故障码1-bit6 水路有空气', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b7', label: '系统故障码1-bit7 加热器过温保护', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b8', label: '系统故障码1-bit8 加热器加热异常', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b9', label: '系统故障码1-bit9 加热继电器粘连', type: 'bits', bit: 9, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b10', label: '系统故障码1-bit10 水温过温保护', type: 'bits', bit: 10, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 86, key: 'sysFault1_b11', label: '系统故障码1-bit11 水温低温保护', type: 'bits', bit: 11, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b0', label: '系统故障码2-bit0 压缩机1通讯异常', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b1', label: '系统故障码2-bit1 压缩机1吸气压力低停机', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b2', label: '系统故障码2-bit2 压缩机1排气压力高停机', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b3', label: '系统故障码2-bit3 压缩机1排气温度高停机', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b4', label: '系统故障码2-bit4 压缩机1压比低停机', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b5', label: '系统故障码2-bit5 压缩机1压比高停机', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b6', label: '系统故障码2-bit6 压缩机1制冷剂不足停机', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b7', label: '系统故障码2-bit7 压缩机1过流', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b8', label: '系统故障码2-bit8 IPM模块过温度', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b14', label: '系统故障码2-bit14 压缩机其他故障', type: 'bits', bit: 14, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 87, key: 'sysFault2_b15', label: '系统故障码2-bit15 压机1累加故障3次停机', type: 'bits', bit: 15, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b0', label: '系统故障码3-bit0 压缩机2通讯异常', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b1', label: '系统故障码3-bit1 压缩机2吸气压力低停机', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b2', label: '系统故障码3-bit2 压缩机2排气压力高停机', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b3', label: '系统故障码3-bit3 压缩机2排气温度高停机', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b4', label: '系统故障码3-bit4 压缩机2压比低停机', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b5', label: '系统故障码3-bit5 压缩机2压比高停机', type: 'bits', bit: 5, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b6', label: '系统故障码3-bit6 压缩机2制冷剂不足停机', type: 'bits', bit: 6, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b7', label: '系统故障码3-bit7 压缩机2过流', type: 'bits', bit: 7, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b8', label: '系统故障码3-bit8 IPM模块过温度', type: 'bits', bit: 8, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b14', label: '系统故障码3-bit14 压缩机其他故障', type: 'bits', bit: 14, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 88, key: 'sysFault3_b15', label: '系统故障码3-bit15 压机2累加故障3次停机', type: 'bits', bit: 15, len: 1, map: { 0: '正常', 1: '异常' } },
  { reg: 89, key: 'sysFault4_b0', label: '系统故障码4-bit0 风扇总故障', type: 'bits', bit: 0, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 89, key: 'sysFault4_b1', label: '系统故障码4-bit1 风扇1故障', type: 'bits', bit: 1, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 89, key: 'sysFault4_b2', label: '系统故障码4-bit2 风扇2故障', type: 'bits', bit: 2, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 89, key: 'sysFault4_b3', label: '系统故障码4-bit3 风扇3故障', type: 'bits', bit: 3, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 89, key: 'sysFault4_b4', label: '系统故障码4-bit4 风扇4故障', type: 'bits', bit: 4, len: 1, map: { 0: '正常', 1: '故障' } },
  { reg: 90, key: 'reserve12', label: '预留12', type: 's16' },
  { reg: 91, key: 'reserve13', label: '预留13', type: 's16' },
  { reg: 92, key: 'reserve14', label: '预留14', type: 's16' },
  { reg: 93, key: 'reserve15', label: '预留15', type: 's16' },
  { reg: 94, key: 'reserve16', label: '预留16', type: 's16' },
  { reg: 95, key: 'reserve17', label: '预留17', type: 's16' },
  { reg: 96, key: 'reserve18', label: '预留18', type: 's16' },
  { reg: 97, key: 'reserve19', label: '预留19', type: 's16' },
  { reg: 98, key: 'reserve20', label: '预留20', type: 's16' },
  { reg: 99, key: 'reserve21', label: '预留21', type: 's16' },
  { reg: 100, key: 'reserve22', label: '预留22', type: 's16' }
]

const ESSENT_SPEC = [
  { reg: 0, key: 'unitRun', label: '机组运行状态', type: 'bits', byte: 'low', bit: 0, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'selfCheck', label: '自检状态', type: 'bits', byte: 'low', bit: 1, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'coolRun', label: '制冷运行状态', type: 'bits', byte: 'low', bit: 2, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'heatRun', label: '制热运行状态', type: 'bits', byte: 'low', bit: 3, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'innerFanRun', label: '内风机运行状态', type: 'bits', byte: 'low', bit: 4, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'outerFanRun', label: '外风机运行状态', type: 'bits', byte: 'low', bit: 5, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'dehumidifyRun', label: '除湿状态', type: 'bits', byte: 'low', bit: 6, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'hydrogenRun', label: '排氢运行状态', type: 'bits', byte: 'low', bit: 7, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'status2Reserved0', label: '预留', type: 'bits', byte: 'high', bit: 0, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'dryContactAlarmOutput', label: '干接点告警输出状态', type: 'bits', byte: 'high', bit: 1, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'status2Reserved2', label: '预留', type: 'bits', byte: 'high', bit: 2, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'status2Reserved3', label: '预留', type: 'bits', byte: 'high', bit: 3, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'status2Reserved4', label: '预留', type: 'bits', byte: 'high', bit: 4, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'status2Reserved5', label: '预留', type: 'bits', byte: 'high', bit: 5, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'status2Reserved6', label: '预留', type: 'bits', byte: 'high', bit: 6, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 0, key: 'status2Reserved7', label: '预留', type: 'bits', byte: 'high', bit: 7, len: 1, map: { 0: '停止', 1: '运行' } },
  { reg: 1, key: 'alarm1_b0', label: '回风温度传感器故障', type: 'bits', byte: 'low', bit: 0, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm1_b1', label: '冷凝盘管温度传感器故障', type: 'bits', byte: 'low', bit: 1, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm1_b2', label: '柜外温度传感器故障', type: 'bits', byte: 'low', bit: 2, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm1_b3', label: '湿度传感器故障', type: 'bits', byte: 'low', bit: 3, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm1_b4', label: '压缩机欠流告警', type: 'bits', byte: 'low', bit: 4, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm1_b5', label: '压缩机过流告警', type: 'bits', byte: 'low', bit: 5, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm1_b6', label: '加热器欠流告警', type: 'bits', byte: 'low', bit: 6, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm1_b7', label: '加热器过流告警', type: 'bits', byte: 'low', bit: 7, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm2_b0', label: '内风机告警', type: 'bits', byte: 'high', bit: 0, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm2_b1', label: '外风机告警', type: 'bits', byte: 'high', bit: 1, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm2_b2', label: '高压力告警', type: 'bits', byte: 'high', bit: 2, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm2_b3', label: '低压力告警', type: 'bits', byte: 'high', bit: 3, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm2_b4', label: '柜内高温告警', type: 'bits', byte: 'high', bit: 4, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm2_b5', label: '柜内低温告警', type: 'bits', byte: 'high', bit: 5, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm2_b6', label: '柜外高温告警', type: 'bits', byte: 'high', bit: 6, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 1, key: 'alarm2_b7', label: '柜外低温告警', type: 'bits', byte: 'high', bit: 7, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm3_b0', label: '预留', type: 'bits', byte: 'low', bit: 0, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm3_b1', label: '外部输入告警', type: 'bits', byte: 'low', bit: 1, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm3_b2', label: '预留', type: 'bits', byte: 'low', bit: 2, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm3_b3', label: '预留', type: 'bits', byte: 'low', bit: 3, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm3_b4', label: '蒸发盘管温度传感器故障', type: 'bits', byte: 'low', bit: 4, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm3_b5', label: '高湿告警', type: 'bits', byte: 'low', bit: 5, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm3_b6', label: '低电压告警', type: 'bits', byte: 'low', bit: 6, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm3_b7', label: '高电压告警', type: 'bits', byte: 'low', bit: 7, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm4_b0', label: '变频压缩机故障', type: 'bits', byte: 'high', bit: 0, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm4_b1', label: '预留', type: 'bits', byte: 'high', bit: 1, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm4_b2', label: '预留', type: 'bits', byte: 'high', bit: 2, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm4_b3', label: '蒸发器冻结告警', type: 'bits', byte: 'high', bit: 3, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm4_b4', label: '高压力频繁告警', type: 'bits', byte: 'high', bit: 4, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm4_b5', label: '低压力频繁告警', type: 'bits', byte: 'high', bit: 5, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm4_b6', label: '冷凝高温告警', type: 'bits', byte: 'high', bit: 6, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 2, key: 'alarm4_b7', label: '制冷剂泄漏告警', type: 'bits', byte: 'high', bit: 7, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm5_b0', label: '变频压缩机通信故障', type: 'bits', byte: 'low', bit: 0, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm5_b1', label: '预留', type: 'bits', byte: 'low', bit: 1, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm5_b2', label: '预留', type: 'bits', byte: 'low', bit: 2, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm5_b3', label: '预留', type: 'bits', byte: 'low', bit: 3, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm5_b4', label: '预留', type: 'bits', byte: 'low', bit: 4, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm5_b5', label: '预留', type: 'bits', byte: 'low', bit: 5, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm5_b6', label: '预留', type: 'bits', byte: 'low', bit: 6, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm5_b7', label: '预留', type: 'bits', byte: 'low', bit: 7, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm6_b0', label: '预留', type: 'bits', byte: 'high', bit: 0, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm6_b1', label: '预留', type: 'bits', byte: 'high', bit: 1, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm6_b2', label: '预留', type: 'bits', byte: 'high', bit: 2, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm6_b3', label: '预留', type: 'bits', byte: 'high', bit: 3, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm6_b4', label: '预留', type: 'bits', byte: 'high', bit: 4, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm6_b5', label: '预留', type: 'bits', byte: 'high', bit: 5, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm6_b6', label: '预留', type: 'bits', byte: 'high', bit: 6, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 3, key: 'alarm6_b7', label: '预留', type: 'bits', byte: 'high', bit: 7, len: 1, map: { 0: '无告警', 1: '有告警' } },
  { reg: 4, key: 'returnAirTemp', label: '回风温度(℃)', type: 's16', scale: 10 },
  { reg: 5, key: 'condenserCoilTemp', label: '冷凝盘管温度(℃)', type: 's16', scale: 10 },
  { reg: 6, key: 'compressorHeaterCurrent', label: '压缩机/加热器电流(A)', type: 'u16', scale: 100 },
  { reg: 7, key: 'innerFanCurrent', label: '内风机电流(A)', type: 'u16', scale: 100 },
  { reg: 8, key: 'outerFanCurrent', label: '外风机电流(A)', type: 'u16', scale: 100 },
  { reg: 9, key: 'supplyVoltage', label: '电源电压(V)', type: 'u16', scale: 10 },
  { reg: 10, key: 'ambientTemp', label: '柜外环境温度(℃)', type: 's16', scale: 10 },
  { reg: 11, key: 'humidity', label: '柜内湿度(%)', type: 'u16', scale: 10 },
  { reg: 12, key: 'evapCoilTemp', label: '蒸发盘管温度(℃)', type: 's16', scale: 10 },
  { reg: 13, key: 'innerFanRpm', label: '内风机转速(RPM)', type: 'u16' },
  { reg: 14, key: 'outerFanRpm', label: '外风机转速(RPM)', type: 'u16' },
  { reg: 15, key: 'inverterCompressorRpm', label: '变频压缩机转速(RPM)', type: 'u16' },
  { reg: 16, key: 'coolSetTemp', label: '制冷设定温度(℃)', type: 's16', scale: 10 },
  { reg: 17, key: 'coolDiffTemp', label: '制冷回差温度(℃)', type: 's16', scale: 10 },
  { reg: 18, key: 'heatStartTemp', label: '制热启动温度(℃)', type: 's16', scale: 10 },
  { reg: 19, key: 'heatStopDiff', label: '制热停止回差值(℃)', type: 's16', scale: 10 },
  { reg: 20, key: 'highTempAlarm', label: '高温告警温度值(℃)', type: 's16', scale: 10 },
  { reg: 21, key: 'lowTempAlarm', label: '低温告警温度值(℃)', type: 's16', scale: 10 },
  { reg: 22, key: 'dehumidifyStartHumidity', label: '除湿开启湿度值(%)', type: 'u16', scale: 10 },
  { reg: 23, key: 'dehumidifyStopDiff', label: '除湿停止回差(%)', type: 'u16', scale: 10 },
  { reg: 24, key: 'highHumidityAlarm', label: '高湿告警值(%)', type: 'u16', scale: 10 },
  { reg: 25, key: 'dehumidifyEnable', label: '除湿使能', type: 'u16', scale: 10 },
  { reg: 26, key: 'standbyInnerFanStatus', label: '待机模式内风机状态', type: 'u16', map: { 0: '停止', 1: '运行' } },
  { reg: 27, key: 'baudRate', label: '通信波特率', type: 'u16', map: { 0: '4800', 1: '9600', 2: '19200', 3: '38400' } },
  { reg: 28, key: 'externalAlarmOption', label: '外部告警选项', type: 'u16' },
  { reg: 29, key: 'hydrogenIntervalHour', label: '排氢间隔时间', type: 'u16' },
  { reg: 30, key: 'hydrogenWorkMinute', label: '排氢工作时间', type: 'u16' },
  { reg: 31, key: 'voltageAlarmHighLimit', label: '电压告警高限 (可选)', type: 'u16', scale: 10 },
  { reg: 32, key: 'voltageAlarmLowLimit', label: '电压告警低限 (可选)', type: 'u16', scale: 10 },
  { reg: 33, key: 'deviceAddress', label: '设备通信地址', type: 'u16' }
]

const SPEC_BY_TYPE = {
  1: KNO_W_SPEC,
  2: EVK_SPEC,
  3: ESSENT_SPEC,
  4: EVK_EMW_30_50_80_SPEC,
  5: JUNNENG_WATER_CHILLER_1_SPEC
}

const parsedFields = computed(() => {
  const spec = SPEC_BY_TYPE[selectedCoolType.value]
  if (!spec) {
    return EVK_SPEC.map((f) => ({ ...f, value: '---', rawValue: undefined }))
  }
  if (selectedCoolType.value === 65535) {
    return EVK_SPEC.map((f) => ({ ...f, value: '---', rawValue: undefined }))
  }
  return spec.map((f) => decodeField(f, refRegisters.value))
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
  const typeKey = displayCoolTypeKey.value
  const i18nKey = `cluster_peripheral.ref.${typeKey}.fields.${field.key}`
  return te(i18nKey) ? t(i18nKey) : field.label || ''
}

const formatValue = (field) => {
  if (!field || field.value === null || field.value === undefined || field.value === '---') return '---'
  if (field.map !== undefined && field.rawValue !== undefined) {
    const typeKey = displayCoolTypeKey.value
    const mapKey = `cluster_peripheral.ref.${typeKey}.valueMap.${field.key}.${field.rawValue}`
    return te(mapKey) ? t(mapKey) : String(field.value)
  }
  return String(field.value)
}

const handleRefData = (event, msg) => {
  const ids = selectedClusterIds.value
  if (!ids) return
  if (!msg || msg.dataType !== 'REF' || msg.blockId !== ids.blockId || msg.clusterId !== ids.clusterId) return
  refRegisters.value = Array.isArray(msg.data) ? msg.data : []
}

const handleSysBaseParam = (event, msg) => {
  const ids = selectedClusterIds.value
  if (!ids) return
  if (!msg || msg.dataType !== 'SYS_BASE_PARAM_R' || msg.blockId !== ids.blockId || msg.clusterId !== ids.clusterId) return
  const coolType = msg.data && typeof msg.data === 'object' ? msg.data.CoolDeviceType : undefined
  if (coolType === undefined || coolType === null) return
  configCoolType.value = coolType
}

const registerListener = () => {
  if (ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.on('REF', handleRefData)
  window.electron.ipcRenderer.on('SYS_BASE_PARAM_R', handleSysBaseParam)
  ipcListenerRegistered = true
}

const unregisterListener = () => {
  if (!ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeListener('REF', handleRefData)
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
    refRegisters.value = []
    configCoolType.value = null
    hasUserSelection.value = false
    selectedCoolType.value = 65535
    if (ids) requestSysBaseParam()
  },
  { immediate: true }
)

watch(
  () => configCoolType.value,
  (val) => {
    if (val === null || val === undefined) return
    const num = Number(val)
    const normalized = num === 1 || num === 2 || num === 3 || num === 4 || num === 5 ? num : 65535
    if (hasUserSelection.value) return
    selectedCoolType.value = normalized
    hasUserSelection.value = false
  }
)

watch(selectedCoolType, (newValue, oldValue) => {
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
      <label class="font-medium">{{ t('peripheral.ref.type') }}：</label>
      <Dropdown
        v-model="selectedCoolType"
        :options="coolTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('clusterConfigParam.dropdownOptions.制冷设备类型.无制冷设备')"
        class="w-20rem"
      />
    </div>

    <DataTable :value="pairedRows" showGridlines class="fixed-table">
      <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ row.left ? translateLabel(row.left) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
        <template #body="{ data: row }">
          {{ row.left ? formatValue(row.left) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.ref.fieldName')" :headerStyle="{ width: '25%' }">
        <template #body="{ data: row }">
          {{ row.right ? translateLabel(row.right) : '' }}
        </template>
      </Column>
      <Column :header="t('peripheral.ref.fieldValue')" :style="{ width: '25%' }" bodyClass="value-col">
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
