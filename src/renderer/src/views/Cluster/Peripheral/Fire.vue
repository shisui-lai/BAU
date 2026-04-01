<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClusterStore } from '@/stores/device/clusterStore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Card from 'primevue/card'

const { t, te, locale } = useI18n()
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

const fireRegisters = ref([])
// BMU 数量：真实值由 SYS_BASE_PARAM_R 的 BmuTotalNum 下发；BCU 消防页无显式默认，未收到配置时为 0
const bmuTotalNum = ref(0)
const configFireType = ref(null)
const selectedFireType = ref(65535)
const hasUserSelection = ref(false)
let ipcListenerRegistered = false

// 消防控制器类型：65535=无，1=三沃力源
const FIRE_TYPE_OPTIONS = [
  { label: '无消防控制器', value: 65535 },
  { label: '三沃力源（sanvalor）', value: 1 }
]

const fireTypeOptions = computed(() =>
  FIRE_TYPE_OPTIONS.map((o) => ({
    ...o,
    label: te(`clusterConfigParam.dropdownOptions.消防控制器类型.${o.label}`)
      ? t(`clusterConfigParam.dropdownOptions.消防控制器类型.${o.label}`)
      : o.label
  }))
)

// ========== 动态表定义：packSchemaFactory 风格，按寄存器顺序编写便于核对协议 ==========
// FIRE_SECTION_*：用于 baseInfo/nestedInfo/detectorDetails 按 section 分组，不可删除
// DETECTOR_TEMPLATE：三沃力源探测器块模板（每探测器 7 个 reg），在 buildFireSchemaSanvalor 内使用

const FIRE_SECTION_BASE = 'base'
const FIRE_SECTION_NESTED = 'nested'
const FIRE_SECTION_DETECTOR = 'detector'

/**
 * 三沃力源（sanvalor）消防外设 schema 工厂：根据 bmuCount 动态生成表，按寄存器 0→1→2→… 顺序编写
 * 每条字段含 class，解析后按 class 分组显示到不同容器
 */
const buildFireSchemaSanvalor = (bmuCount) => {
  const n = Math.min(Math.max(0, bmuCount ?? 0), 16)

  /** 探测器详情模板：每个探测器 7 个寄存器，起始偏移 10 + i*7（仅三沃力源使用） */
  const detectorTemplate = [
    { reg: 0, key: 'index', label: '探测器编号', type: 'u16' },
    { reg: 1, key: 'status', label: '状态', type: 'u16', map: { 0: '正常', 1: '探测器掉线', 2: '传感器故障' } },
    { reg: 2, key: 'alarm', label: '报警等级', type: 'u16', map: { 0: '正常', 1: '一级预警', 2: '二级预警', 3: '一级报警', 4: '二级报警' } },
    { reg: 3, key: 'co', label: '一氧化碳浓度(ppm)', type: 'u16' },
    { reg: 4, key: 'temp', label: '温度数据(℃)', type: 'u16', offset: -40 },
    { reg: 5, key: 'smoke', label: '烟雾数据(db/m)', type: 'u16', scale: 1000, decimals: 2 },
    { reg: 6, key: 'voc', label: 'VOC', type: 'u16', map: { 0: '正常', 1: 'voc报警' } }
  ]

  return [
    /* reg 0：最高报警等级 */
    {
      section: FIRE_SECTION_BASE,
      class: 'base',
      reg: 0,
      key: 'alarmLevel',
      label: '最高报警等级',
      labelKey: 'fireLabel1',
      type: 'u16',
      map: { 0: '正常', 1: '一级预警', 2: '二级预警', 3: '一级报警', 4: '二级报警' }
    },

    /* reg 1：探测器状态（位域，按 BMU 数量展开） */
    ...Array.from({ length: n }, (_, i) => ({
      section: FIRE_SECTION_NESTED,
      class: 'detectorStatus',
      classLabel: '探测器状态',
      classLabelKey: 'fireLabel2',
      reg: 1,
      type: 'bits',
      bit: i,
      len: 1,
      label: `${i + 1}号探测器状态`,
      map: { 0: '正常', 1: '故障' }
    })),

    /* reg 2：灭火器故障状态（位域） */
    ...Array.from({ length: n }, (_, i) => ({
      section: FIRE_SECTION_NESTED,
      class: 'extinguisherFault',
      classLabel: '灭火器故障状态',
      classLabelKey: 'fireLabel3',
      reg: 2,
      type: 'bits',
      bit: i,
      len: 1,
      label: `${i + 1}号灭火器状态`,
      map: { 0: '正常', 1: '故障' }
    })),

    /* reg 3：灭火器启动状态（位域） */
    ...Array.from({ length: n }, (_, i) => ({
      section: FIRE_SECTION_NESTED,
      class: 'extinguisherStart',
      classLabel: '灭火器启动状态',
      classLabelKey: 'fireLabel4',
      reg: 3,
      type: 'bits',
      bit: i,
      len: 1,
      label: `${i + 1}号灭火器状态`,
      map: { 0: '正常', 1: '已启动' }
    })),

    /* reg 4：按键状态（位域，固定 2 项） */
    {
      section: FIRE_SECTION_NESTED,
      class: 'keyStatus',
      classLabel: '按键状态',
      classLabelKey: 'fireLabel5',
      reg: 4,
      type: 'bits',
      bit: 0,
      len: 1,
      label: '紧急启动开关状态',
      map: { 0: '正常', 1: '按下' }
    },
    {
      section: FIRE_SECTION_NESTED,
      class: 'keyStatus',
      classLabel: '按键状态',
      classLabelKey: 'fireLabel5',
      reg: 4,
      type: 'bits',
      bit: 1,
      len: 1,
      label: '紧急停止开关状态',
      map: { 0: '正常', 1: '按下' }
    },

    /* reg 5：显示器状态 */
    {
      section: FIRE_SECTION_BASE,
      class: 'base',
      reg: 5,
      key: 'displayStatus',
      label: '显示器状态',
      labelKey: 'fireLabel6',
      type: 'u16',
      map: { 0: '正常', 1: '故障' }
    },

    /* reg 6：探测器灭火器启动命令（位域） */
    ...Array.from({ length: n }, (_, i) => ({
      section: FIRE_SECTION_NESTED,
      class: 'startCommand',
      classLabel: '探测器灭火器启动命令',
      classLabelKey: 'fireLabel7',
      reg: 6,
      type: 'bits',
      bit: i,
      len: 1,
      label: `${i + 1}号探测器`,
      map: { 0: '取消启动', 1: '启动' }
    })),

    /* reg 7：禁止报警功能及启动 */
    {
      section: FIRE_SECTION_BASE,
      class: 'base',
      reg: 7,
      key: 'forbidAlarm',
      label: '禁止报警功能及启动',
      labelKey: 'fireLabel8',
      type: 'u16',
      map: { 0: '不禁止', 1: '禁止' }
    },

    /* reg 8：禁止灭火自动启动功能 */
    {
      section: FIRE_SECTION_BASE,
      class: 'base',
      reg: 8,
      key: 'forbidFire',
      label: '禁止灭火自动启动功能',
      labelKey: 'fireLabel9',
      type: 'u16',
      map: { 0: '不禁止', 1: '禁止' }
    },

    /* reg 9：复位系统预警、报警信息 */
    {
      section: FIRE_SECTION_BASE,
      class: 'base',
      reg: 9,
      key: 'resetAlarm',
      label: '复位系统预警、报警信息',
      labelKey: 'fireLabel10',
      type: 'u16',
      map: { 0: '正常', 1: '复位系统预警、报警状态' }
    },

    /* reg 10+：探测器详情（每个探测器 7 个 reg，起始 10 + i*7） */
    ...Array.from({ length: n }, (_, i) =>
      detectorTemplate.map((f) => ({
        section: FIRE_SECTION_DETECTOR,
        class: 'detectorDetails',
        detectorIndex: i + 1,
        reg: 10 + i * 7 + Number(f.reg),
        key: f.key,
        label: f.label,
        type: f.type,
        scale: f.scale,
        offset: f.offset,
        map: f.map,
        decimals: f.decimals
      }))
    ).flat()
  ]
}

/**
 * 按消防型号选表：根据 selectedFireType 调用对应外设的 schema 工厂（与 Pcs/Ref/Dehumi 一致）
 * 新增消防型号时，在此增加映射即可
 */
const getFireSchemaByType = (type, bmuCount) => {
  if (type === 65535) return buildFireSchemaSanvalor(bmuCount) // 无消防：仍用三沃力源结构展示，值为 ---
  if (type === 1) return buildFireSchemaSanvalor(bmuCount)
  return null
}

// ========== 通用解析函数（与 BlockFire 的 parseFieldTableData 思路一致） ==========
// 区别：BlockFire 用 useFieldTableParser 按顺序消费 rawData；簇级消防 schema 用 reg 显式指定位置，
// 同一 reg 可有多条（bits 位域），reg 不连续（detector 10+i*7），故需 decodeField 按 reg 读取

/**
 * 单字段解析：支持 u16/s16、scale、offset、map、bits
 * 从 registers[field.reg] 读取原始值，按 type/map 转成展示用 value
 */
const decodeField = (field, registers, baseOffset = 0) => {
  const reg = Number(field.reg) + baseOffset
  const regRaw = registers && reg >= 0 && reg < registers.length ? registers[reg] : undefined
  if (regRaw === undefined) return { ...field, value: '---', rawValue: undefined }

  if (field.type === 'bits') {
    const bit = Number(field.bit || 0)
    const len = Number(field.len || 1)
    const mask = len >= 16 ? 0xffff : (1 << len) - 1
    const v = (regRaw >> bit) & mask
    const mapped = field.map && field.map[v] !== undefined ? field.map[v] : v
    return { ...field, value: mapped, rawValue: v }
  }

  let value = regRaw
  if (field.type === 's16' && value > 32767) value = value - 65536
  if (field.scale && field.scale !== 1) value = value / field.scale
  if (typeof field.offset === 'number' && Number.isFinite(field.offset)) value = value + field.offset

  let displayValue = value
  if (field.map) {
    displayValue = field.map[value] !== undefined ? field.map[value] : '---'
  } else if (typeof value === 'number') {
    const decimals = field.decimals !== undefined ? field.decimals : (field.scale && field.scale !== 1 ? String(field.scale).length - 1 : 0)
    displayValue = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()
  }

  return { ...field, value: displayValue, rawValue: value }
}

/**
 * 无数据时的默认 value（与 baseInfo/nestedInfo/detectorDetails 原逻辑一致）
 */
const getDefaultValue = (field) => {
  if (field.section === FIRE_SECTION_BASE) {
    if (['alarmLevel', 'displayStatus', 'resetAlarm'].includes(field.key)) return '正常'
    if (['forbidAlarm', 'forbidFire'].includes(field.key)) return '不禁止'
  }
  if (field.section === FIRE_SECTION_DETECTOR) {
    if (field.key === 'index') return field.detectorIndex ?? 1
    if (['status', 'alarm', 'voc'].includes(field.key)) return '正常'
    if (['co', 'temp'].includes(field.key)) return 0
    if (field.key === 'smoke') return '0.00'
  }
  if (field.section === FIRE_SECTION_NESTED) {
    return field.map && field.map[0] !== undefined ? field.map[0] : '正常'
  }
  return '---'
}

/**
 * 一次性解析 schema + fireRegisters，得到带 value 的字段数组（与 BlockFire 的 parseRawData 思路一致）
 * 后续 baseInfo/nestedInfo/detectorDetails 只需按 section/class 分组，不再调用 decodeField
 */
const parseFireSchemaData = (schema, registers) => {
  const hasData = registers && registers.length >= 10
  return schema.map((f) => {
    if (hasData) return decodeField(f, registers)
    return { ...f, value: getDefaultValue(f), rawValue: undefined }
  })
}

// ========== 计算属性：先解析得带 value 数组，再按 class 分组（与 BlockFire 流程一致） ==========

const bmuCount = computed(() => Math.min(Math.max(0, bmuTotalNum.value ?? 0), 16))

const fireSchema = computed(() => getFireSchemaByType(selectedFireType.value, bmuCount.value))

/** 解析后的字段数组（含 value），供 baseInfo/nestedInfo/detectorDetails 按 class 分组使用 */
const parsedFireFields = computed(() => parseFireSchemaData(fireSchema.value, fireRegisters.value))

/** 基本信息：从 parsedFireFields 中取 section=base，只做筛选与映射 */
const baseInfo = computed(() =>
  parsedFireFields.value
    .filter((f) => f.section === FIRE_SECTION_BASE)
    .map((f) => ({ label: f.label, value: f.value, labelKey: f.labelKey }))
)

/** 嵌套信息：从 parsedFireFields 中取 section=nested，按 class 分组 */
const nestedInfo = computed(() => {
  const nested = parsedFireFields.value.filter((f) => f.section === FIRE_SECTION_NESTED)
  if (!nested.length) return []

  const groups = new Map()
  nested.forEach((f) => {
    const cls = f.class || 'default'
    if (!groups.has(cls)) {
      groups.set(cls, {
        label: f.classLabel || f.label,
        labelKey: f.classLabelKey || f.labelKey,
        value: []
      })
    }
    groups.get(cls).value.push({ label: f.label, value: f.value })
  })
  return Array.from(groups.values())
})

/** 探测器详情表：从 parsedFireFields 中取 section=detector，按 detectorIndex 聚合成行 */
const detectorDetails = computed(() => {
  const detectorFields = parsedFireFields.value.filter((f) => f.section === FIRE_SECTION_DETECTOR)
  const rowsMap = new Map()

  detectorFields.forEach((f) => {
    const id = f.detectorIndex || 1
    if (!rowsMap.has(id)) rowsMap.set(id, { id: String(id) })
    rowsMap.get(id)[f.key] = f.value
  })

  if (rowsMap.size === 0) {
    for (let i = 1; i <= bmuCount.value; i++) rowsMap.set(i, { id: String(i) })
  }

  return Array.from(rowsMap.values()).sort((a, b) => Number(a.id) - Number(b.id))
})

/** 消防类型展示文本（替代原 displayData，仅用于 h5 标题） */
const fireTypeDisplayText = computed(() =>
  selectedFireType.value === 1 ? '三沃力源（sanvalor）' : '无消防控制器'
)

// ========== 翻译 ==========
const translateFireType = (fireType) =>
  locale.value === 'zh'
    ? fireType
    : te(`cluster_peripheral.fire.fireType.${fireType}`)
      ? t(`cluster_peripheral.fire.fireType.${fireType}`)
      : fireType || t('cluster_peripheral.fire.noFire')
const translateValue = (value) =>
  locale.value === 'zh'
    ? value
    : te(`cluster_peripheral.fire.values.${value}`)
      ? t(`cluster_peripheral.fire.values.${value}`)
      : value ?? '---'
const translateBaseLabel = (label, labelKey) =>
  locale.value === 'zh'
    ? label
    : te(`cluster_peripheral.fire.labels.${labelKey}`)
      ? t(`cluster_peripheral.fire.labels.${labelKey}`)
      : label ?? '---'
const translateLabel = (label) =>
  locale.value === 'zh'
    ? label
    : te(`cluster_peripheral.fire.labels.${label}`)
      ? t(`cluster_peripheral.fire.labels.${label}`)
      : label ?? '---'

// ========== IPC 监听 ==========
const handleFireControllerData = (event, msg) => {
  const ids = selectedClusterIds.value
  if (!ids) return
  if (!msg || msg.dataType !== 'FIRE_CONTROLLER' || msg.blockId !== ids.blockId || msg.clusterId !== ids.clusterId)
    return
  fireRegisters.value = Array.isArray(msg.data) ? msg.data : []
}

const handleSysBaseParam = (event, msg) => {
  const ids = selectedClusterIds.value
  if (!ids) return
  if (
    !msg ||
    msg.dataType !== 'SYS_BASE_PARAM_R' ||
    msg.blockId !== ids.blockId ||
    msg.clusterId !== ids.clusterId
  )
    return
  const data = msg.data && typeof msg.data === 'object' ? msg.data : {}
  const bmu = data.BmuTotalNum
  const fireType = data.FireCtrlType
  if (bmu !== undefined && bmu !== null) {
    const n = Number(bmu)
    bmuTotalNum.value = Number.isFinite(n) && n >= 0 ? n : 0
  }
  if (fireType !== undefined && fireType !== null) {
    configFireType.value = Number(fireType)
    if (!hasUserSelection.value) {
      selectedFireType.value = fireType === 1 ? 1 : 65535
    }
  }
}

const registerListener = () => {
  if (ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.on('FIRE_CONTROLLER', handleFireControllerData)
  window.electron.ipcRenderer.on('SYS_BASE_PARAM_R', handleSysBaseParam)
  ipcListenerRegistered = true
}

const unregisterListener = () => {
  if (!ipcListenerRegistered || !window.electron?.ipcRenderer) return
  window.electron.ipcRenderer.removeListener('FIRE_CONTROLLER', handleFireControllerData)
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
    fireRegisters.value = []
    configFireType.value = null
    hasUserSelection.value = false
    selectedFireType.value = 65535
    bmuTotalNum.value = 0
    if (ids) requestSysBaseParam()
  },
  { immediate: true }
)

watch(
  () => configFireType.value,
  (val) => {
    if (val === null || val === undefined) return
    const normalized = val === 1 ? 1 : 65535
    if (hasUserSelection.value) return
    selectedFireType.value = normalized
  }
)

watch(selectedFireType, (newValue, oldValue) => {
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
      <label class="font-medium">{{ t('cluster_peripheral.fire.selectLabel') }}：</label>
      <Dropdown
        v-model="selectedFireType"
        :options="fireTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('cluster_peripheral.fire.selectLabel')"
        class="w-20rem"
      />
    </div>
    <h5>{{ translateFireType(fireTypeDisplayText) }}</h5>
    <div class="info-grid">
      <Card class="full-height-panel">
        <template #title>{{ t('cluster_peripheral.fire.baseInfo') }}</template>
        <template #content>
          <DataTable :value="baseInfo" size="small" :showGridlines="true" responsiveLayout="scroll">
            <Column :header="t('eventTime.tableTile1')">
              <template #body="{ data: el }">
                {{ translateBaseLabel(el.label, el.labelKey) }}
              </template>
            </Column>
            <Column :header="t('eventTime.tableTile2')">
              <template #body="{ data: el }">
                {{ translateValue(el.value) }}
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
      <div v-for="item in nestedInfo" :key="item.label" class="full-height-panel">
        <Card class="full-height-panel">
          <template #title>{{ translateBaseLabel(item.label, item.labelKey) }}</template>
          <template #content>
            <DataTable
              :value="item.value"
              size="small"
              :showGridlines="true"
              responsiveLayout="scroll"
            >
              <Column :header="t('eventTime.tableTile1')">
                <template #body="{ data: el }">
                  {{ translateLabel(el.label) }}
                </template>
              </Column>
              <Column :header="t('eventTime.tableTile2')">
                <template #body="{ data: el }">
                  {{ translateValue(el.value) }}
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>
      </div>
      <Card class="full-height-panel detector-details-card">
        <template #title>{{ t('cluster_peripheral.fire.detectorDetails') }}</template>
        <template #content>
          <DataTable
            :value="detectorDetails"
            size="small"
            :showGridlines="true"
            responsiveLayout="scroll"
          >
            <Column :header="t('cluster_peripheral.fire.title.title1')">
              <template #body="{ data: el }">
                {{ translateValue(el.id) }}
              </template>
            </Column>
            <Column :header="t('cluster_peripheral.fire.title.title2')">
              <template #body="{ data: el }">
                {{ translateValue(el.status) }}
              </template>
            </Column>
            <Column :header="t('cluster_peripheral.fire.title.title3')">
              <template #body="{ data: el }">
                {{ translateValue(el.alarm) }}
              </template>
            </Column>
            <Column :header="t('cluster_peripheral.fire.title.title4')">
              <template #body="{ data: el }">
                {{ translateValue(el.co) }}
              </template>
            </Column>
            <Column :header="t('cluster_peripheral.fire.title.title5')">
              <template #body="{ data: el }">
                {{ translateValue(el.temp) }}
              </template>
            </Column>
            <Column :header="t('cluster_peripheral.fire.title.title6')">
              <template #body="{ data: el }">
                {{ translateValue(el.smoke) }}
              </template>
            </Column>
            <Column :header="t('cluster_peripheral.fire.title.title7')">
              <template #body="{ data: el }">
                {{ translateValue(el.voc) }}
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>
  </div>
</template>

<style lang="less" scoped>
/* 与 BCU fireController 保持一致的网格布局 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  grid-auto-rows: 1fr;
  gap: 1.5em;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.full-height-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 320px;
  height: 100%;
  min-height: 0;
}

.detector-details-card {
  grid-column: 1 / -1;
}

:deep(.p-card) {
  border: 1.5px solid #5c5c5c !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.122);
}
</style>
