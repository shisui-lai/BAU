<template>
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripherals.fire.selectLabel') }}：</label>
      <Dropdown
        v-model="selectedFireType"
        :options="fireTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripherals.fire.selectLabel')"
        class="w-20rem"
      />
    </div>
    <h5>{{ translateFireType(displayData[0]?.fireType) }}</h5>
    <div class="info-grid">
      <!-- 基础信息 -->
      <Card class="full-height-panel">
        <template #title>{{ t('peripherals.fire.baseInfo') }}</template>
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
      <!-- 嵌套信息 -->
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
      <!-- 探测器详情 -->
      <Card class="full-height-panel detector-details-card">
        <template #title>{{ t('peripherals.fire.detectorDetails') }}</template>
        <template #content>
          <DataTable
            :value="detectorDetails"
            size="small"
            :showGridlines="true"
            responsiveLayout="scroll"
          >
            <Column :header="t('peripherals.fire.title.title1')">
              <template #body="{ data: el }">
                {{ translateValue(el.id) }}
              </template>
            </Column>
            <Column :header="t('peripherals.fire.title.title2')">
              <template #body="{ data: el }">
                {{ translateValue(el.status) }}
              </template>
            </Column>
            <Column :header="t('peripherals.fire.title.title3')">
              <template #body="{ data: el }">
                {{ translateValue(el.alarm) }}
              </template>
            </Column>
            <Column :header="t('peripherals.fire.title.title4')">
              <template #body="{ data: el }">
                {{ translateValue(el.co) }}
              </template>
            </Column>
            <Column :header="t('peripherals.fire.title.title5')">
              <template #body="{ data: el }">
                {{ translateValue(el.temp) }}
              </template>
            </Column>
            <Column :header="t('peripherals.fire.title.title6')">
              <template #body="{ data: el }">
                {{ translateValue(el.smoke) }}
              </template>
            </Column>
            <Column header="VOC">
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
<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
// PrimeVue 组件
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
const ipStore = useIpStore()
const fireData = ref([]) //存储每个ipPCS数据
const selectedFireType = ref(null) // 用户选择的消防控制器型号
const realTimeFireType = ref(null) // 实时读到的消防控制器型号
const hasUserSelection = ref(false) // 用户是否进行了手动选择

const state = reactive({
  deviceData: {}
})

// 消防控制器型号选项
const fireTypeOptions = ref([
  {
    label: t('config.dropdown.fireControllerType.sanvalor'),
    value: 1
  },
  {
    label: t('config.dropdown.fireControllerType.none'),
    value: 65535
  }
])

// 根据消防控制器型号获取初始数据
const getInitDataByType = (fireType) => {
  switch (fireType) {
    case 1:
      return initFireData
    default:
      return initFireData
  }
}

// 计算显示数据：如果用户没有手动选择，自动跟随实时型号；如果用户手动选择了型号，显示对应数据
const displayData = computed(() => {
  // 如果用户没有进行手动选择，或者用户选择的型号与实时型号相同，显示实时数据
  if (!hasUserSelection.value || selectedFireType.value === realTimeFireType.value) {
    return fireData.value
  } else {
    // 用户手动选择了与实时型号不同的型号，显示初始数据
    return getInitDataByType(selectedFireType.value)
  }
})

const translateFireType = (fireType) => {
  return locale.value === 'zh'
    ? fireType
    : te(`peripherals.fire.${fireType}`)
      ? t(`peripherals.fire.${fireType}`)
      : fireType || '无消防控制器' // 默认值
}
const translateValue = (value) => {
  return locale.value === 'zh'
    ? value
    : te(`peripherals.fire.values.${value}`)
      ? t(`peripherals.fire.values.${value}`)
      : value || '无效值' // 默认值
}
const translateBaseLabel = (label, labelKey) => {
  return locale.value === 'zh'
    ? label
    : te(`peripherals.fire.labels.${labelKey}`)
      ? t(`peripherals.fire.labels.${labelKey}`)
      : label || '无效值' // 默认值
}
const translateLabel = (label) => {
  return locale.value === 'zh'
    ? label
    : te(`peripherals.fire.labels.${label}`)
      ? t(`peripherals.fire.labels.${label}`)
      : label || '无效值' // 默认值
}
const initFireData = [
  {
    classification: '消防数据',
    fireType: '三沃力源（sanvalor）',
    fireTypeRaw: 1,
    element: [
      {
        label: '最高报警等级',
        value: '正常',
        labelKey: 'fireLabel1'
      },
      {
        label: '探测器状态',
        value: [
          {
            label: '1号探测器状态',
            value: '正常'
          },
          {
            label: '2号探测器状态',
            value: '正常'
          },
          {
            label: '3号探测器状态',
            value: '正常'
          },
          {
            label: '4号探测器状态',
            value: '正常'
          },
          {
            label: '5号探测器状态',
            value: '正常'
          },
          {
            label: '6号探测器状态',
            value: '正常'
          },
          {
            label: '7号探测器状态',
            value: '正常'
          },
          {
            label: '8号探测器状态',
            value: '正常'
          }
        ],
        labelKey: 'fireLabel2'
      },
      {
        label: '灭火器故障状态',
        value: [
          {
            label: '1号灭火器状态',
            value: '故障'
          },
          {
            label: '2号灭火器状态',
            value: '故障'
          },
          {
            label: '3号灭火器状态',
            value: '正常'
          },
          {
            label: '4号灭火器状态',
            value: '正常'
          },
          {
            label: '5号灭火器状态',
            value: '正常'
          },
          {
            label: '6号灭火器状态',
            value: '正常'
          },
          {
            label: '7号灭火器状态',
            value: '正常'
          },
          {
            label: '8号灭火器状态',
            value: '正常'
          }
        ],
        labelKey: 'fireLabel3'
      },
      {
        label: '灭火器启动状态',
        value: [
          {
            label: '1号灭火器状态',
            value: '已启动'
          },
          {
            label: '2号灭火器状态',
            value: '已启动'
          },
          {
            label: '3号灭火器状态',
            value: '正常'
          },
          {
            label: '4号灭火器状态',
            value: '正常'
          },
          {
            label: '5号灭火器状态',
            value: '正常'
          },
          {
            label: '6号灭火器状态',
            value: '正常'
          },
          {
            label: '7号灭火器状态',
            value: '正常'
          },
          {
            label: '8号灭火器状态',
            value: '正常'
          }
        ],
        labelKey: 'fireLabel4'
      },
      {
        label: '按键状态',
        value: [
          {
            label: '紧急启动开关状态',
            value: '按下'
          },
          {
            label: '紧急停止开关状态',
            value: '按下'
          }
        ],
        labelKey: 'fireLabel5'
      },
      {
        label: '显示器状态',
        value: '正常',
        labelKey: 'fireLabel6'
      },
      {
        label: '探测器灭火器启动命令',
        value: [
          {
            label: '1号探测器状态',
            value: '取消启动'
          },
          {
            label: '2号探测器状态',
            value: '取消启动'
          },
          {
            label: '3号探测器状态',
            value: '启动'
          },
          {
            label: '4号探测器状态',
            value: '启动'
          },
          {
            label: '5号探测器状态',
            value: '启动'
          },
          {
            label: '6号探测器状态',
            value: '启动'
          },
          {
            label: '7号探测器状态',
            value: '启动'
          },
          {
            label: '8号探测器状态',
            value: '启动'
          }
        ],
        labelKey: 'fireLabel7'
      },
      {
        label: '禁止报警功能及启动',
        value: '禁止',
        labelKey: 'fireLabel8'
      },
      {
        label: '禁止灭火自动启动功能',
        value: '禁止',
        labelKey: 'fireLabel9'
      },
      {
        label: '复位系统预警、报警信息',
        value: '复位系统预警、报警状态',
        labelKey: 'fireLabel10'
      },
      {
        label: '探测器1',
        value: 1,
        labelKey: 'fireLabel11'
      },
      {
        label: '探测器1 状态',
        value: '正常',
        labelKey: 'fireLabel12'
      },
      {
        label: '探测器1 报警等级',
        value: '一级预警',
        labelKey: 'fireLabel13'
      },
      {
        label: '探测器1 一氧化碳数据(ppm)',
        value: 22,
        labelKey: 'fireLabel14'
      },
      {
        label: '探测器1 温度数据(℃)',
        value: -7,
        labelKey: 'fireLabel15'
      },
      {
        label: '探测器1 烟雾数据(db/m)',
        value: '0.02',
        labelKey: 'fireLabel16'
      },
      {
        label: '探测器1 Voc数据',
        value: 'voc报警',
        labelKey: 'fireLabel17'
      },
      {
        label: '探测器2',
        value: 2,
        labelKey: 'fireLabel18'
      },
      {
        label: '探测器2 状态',
        value: '正常',
        labelKey: 'fireLabel19'
      },
      {
        label: '探测器2 报警等级',
        value: '正常',
        labelKey: 'fireLabel20'
      },
      {
        label: '探测器2 一氧化碳数据(ppm)',
        value: 1000,
        labelKey: 'fireLabel21'
      },
      {
        label: '探测器2 温度数据(℃)',
        value: 20,
        labelKey: 'fireLabel22'
      },
      {
        label: '探测器2 烟雾数据(db/m)',
        value: '0.01',
        labelKey: 'fireLabel23'
      },
      {
        label: '探测器2 Voc数据',
        value: '正常',
        labelKey: 'fireLabel24'
      },
      {
        label: '探测器3',
        value: 3,
        labelKey: 'fireLabel25'
      },
      {
        label: '探测器3 状态',
        value: '正常',
        labelKey: 'fireLabel26'
      },
      {
        label: '探测器3 报警等级',
        value: '正常',
        labelKey: 'fireLabel27'
      },
      {
        label: '探测器3 一氧化碳数据(ppm)',
        value: 1000,
        labelKey: 'fireLabel28'
      },
      {
        label: '探测器3 温度数据(℃)',
        value: 20,
        labelKey: 'fireLabel29'
      },
      {
        label: '探测器3 烟雾数据(db/m)',
        value: '0.01',
        labelKey: 'fireLabel30'
      },
      {
        label: '探测器3 Voc数据',
        value: '正常',
        labelKey: 'fireLabel31'
      },
      {
        label: '探测器4',
        value: 4,
        labelKey: 'fireLabel32'
      },
      {
        label: '探测器4 状态',
        value: '正常',
        labelKey: 'fireLabel33'
      },
      {
        label: '探测器4 报警等级',
        value: '正常',
        labelKey: 'fireLabel34'
      },
      {
        label: '探测器4 一氧化碳数据(ppm)',
        value: 1000,
        labelKey: 'fireLabel35'
      },
      {
        label: '探测器4 温度数据(℃)',
        value: 20,
        labelKey: 'fireLabel36'
      },
      {
        label: '探测器4 烟雾数据(db/m)',
        value: '0.01',
        labelKey: 'fireLabel37'
      },
      {
        label: '探测器4 Voc数据',
        value: 'voc报警',
        labelKey: 'fireLabel38'
      },
      {
        label: '探测器5',
        value: 5,
        labelKey: 'fireLabel39'
      },
      {
        label: '探测器5 状态',
        value: '正常',
        labelKey: 'fireLabel40'
      },
      {
        label: '探测器5 报警等级',
        value: '正常',
        labelKey: 'fireLabel41'
      },
      {
        label: '探测器5 一氧化碳数据(ppm)',
        value: 1000,
        labelKey: 'fireLabel42'
      },
      {
        label: '探测器5 温度数据(℃)',
        value: 20,
        labelKey: 'fireLabel43'
      },
      {
        label: '探测器5 烟雾数据(db/m)',
        value: '0.01',
        labelKey: 'fireLabel44'
      },
      {
        label: '探测器5 Voc数据',
        value: '正常',
        labelKey: 'fireLabel45'
      },
      {
        label: '探测器6',
        value: 6,
        labelKey: 'fireLabel46'
      },
      {
        label: '探测器6 状态',
        value: '正常',
        labelKey: 'fireLabel47'
      },
      {
        label: '探测器6 报警等级',
        value: '正常',
        labelKey: 'fireLabel48'
      },
      {
        label: '探测器6 一氧化碳数据(ppm)',
        value: 1000,
        labelKey: 'fireLabel49'
      },
      {
        label: '探测器6 温度数据(℃)',
        value: 20,
        labelKey: 'fireLabel50'
      },
      {
        label: '探测器6 烟雾数据(db/m)',
        value: '0.00',
        labelKey: 'fireLabel51'
      },
      {
        label: '探测器6 Voc数据',
        value: '正常',
        labelKey: 'fireLabel52'
      },
      {
        label: '探测器7',
        value: 7,
        labelKey: 'fireLabel53'
      },
      {
        label: '探测器7 状态',
        value: '正常',
        labelKey: 'fireLabel54'
      },
      {
        label: '探测器7 报警等级',
        value: '正常',
        labelKey: 'fireLabel55'
      },
      {
        label: '探测器7 一氧化碳数据(ppm)',
        value: 1000,
        labelKey: 'fireLabel56'
      },
      {
        label: '探测器7 温度数据(℃)',
        value: 20,
        labelKey: 'fireLabel57'
      },
      {
        label: '探测器7 烟雾数据(db/m)',
        value: '0.00',
        labelKey: 'fireLabel58'
      },
      {
        label: '探测器7 Voc数据',
        value: '正常',
        labelKey: 'fireLabel59'
      },
      {
        label: '探测器8',
        value: 8,
        labelKey: 'fireLabel60'
      },
      {
        label: '探测器8 状态',
        value: '正常',
        labelKey: 'fireLabel61'
      },
      {
        label: '探测器8 报警等级',
        value: '正常',
        labelKey: 'fireLabel62'
      },
      {
        label: '探测器8 一氧化碳数据(ppm)',
        value: 1000,
        labelKey: 'fireLabel63'
      },
      {
        label: '探测器8 温度数据(℃)',
        value: 20,
        labelKey: 'fireLabel64'
      },
      {
        label: '探测器8 烟雾数据(db/m)',
        value: '0.00',
        labelKey: 'fireLabel65'
      },
      {
        label: '探测器8 Voc数据',
        value: '正常',
        labelKey: 'fireLabel66'
      }
    ]
  }
]
const MODULE_NAME = 'fire'
// 启停读取
function startReading() {
  window.electron.ipcRenderer.send('start-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}
function stopReading() {
  window.electron.ipcRenderer.send('stop-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
const handleFireData = (event, Arg) => {
  //console.log(Arg)
  if (!Arg?.Arg) return
  const deviceIp = Arg.ip
  if (!state.deviceData[deviceIp]) {
    state.deviceData[deviceIp] = {}
  }
  state.deviceData[deviceIp][event] = Arg.Arg
  // 以事件名和IP为key存储
  const storageKey = `fireData-${deviceIp}`
  sessionStorage.setItem(storageKey, JSON.stringify(Arg.Arg))
  if (deviceIp === ipStore.selectedIp) {
    fireData.value = Arg.Arg
    // 更新实时消防控制器型号
    if (fireData.value && fireData.value[0]) {
      const newRealTimeType = fireData.value[0].fireTypeRaw
      realTimeFireType.value = newRealTimeType
      // 如果用户没有进行手动选择，自动跟随实时型号
      if (!hasUserSelection.value) {
        selectedFireType.value = newRealTimeType
      }
    }
  }
  //console.log(fireData.value)
}
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04FireData')
  window.electron.ipcRenderer.on('update-FC04FireData', handleFireData)
}
onBeforeMount(() => {
  const storageKey = `fireData-${ipStore.selectedIp}`
  const cache = sessionStorage.getItem(storageKey)
  if (cache) {
    fireData.value = JSON.parse(cache)
    // 设置实时消防控制器型号
    if (fireData.value && fireData.value[0]) {
      realTimeFireType.value = fireData.value[0].fireTypeRaw
      // 页面加载时，强制重置为实时型号，并清除用户选择标记
      selectedFireType.value = realTimeFireType.value
      hasUserSelection.value = false
    }
  } else {
    fireData.value = initFireData
    realTimeFireType.value = 1
    // 页面加载时，强制重置为实时型号，并清除用户选择标记
    selectedFireType.value = 1
    hasUserSelection.value = false
  }
  startReading()
  registerListener()
})
onBeforeUnmount(() => {
  stopReading()
  window.electron.ipcRenderer.removeListener('update-FC04FireData', handleFireData)
})
watch(
  () => ipStore.selectedIp,
  (newIp) => {
    const storageKey = `fireData-${newIp}`
    const cache = sessionStorage.getItem(storageKey)
    if (cache) {
      fireData.value = JSON.parse(cache)
      // 更新实时消防控制器型号
      if (fireData.value && fireData.value[0]) {
        realTimeFireType.value = fireData.value[0].fireTypeRaw
        // IP切换时，强制重置为实时型号，并清除用户选择标记
        selectedFireType.value = realTimeFireType.value
        hasUserSelection.value = false
      }
    } else {
      fireData.value = state.deviceData[newIp]?.['update-FC04FireData'] || initFireData
      realTimeFireType.value = fireData.value[0]?.fireTypeRaw || 1
      // IP切换时，强制重置为实时型号，并清除用户选择标记
      selectedFireType.value = realTimeFireType.value
      hasUserSelection.value = false
    }
  },
  { immediate: true }
)
// 监听用户手动选择消防控制器型号
watch(selectedFireType, (newValue, oldValue) => {
  // 如果用户手动选择了不同的型号，标记为用户选择
  if (newValue !== oldValue && oldValue !== null) {
    hasUserSelection.value = true
  }
})

// PrimeVue数据分组
const baseInfo = computed(() =>
  (displayData.value[0]?.element || []).filter(
    (e) => typeof e.value !== 'object' && !/^探测器\d+/.test(e.label)
  )
)
const nestedInfo = computed(() =>
  (displayData.value[0]?.element || []).filter((e) => Array.isArray(e.value))
)
const detectorDetails = computed(() => {
  // 以"探测器X"开头的分组
  const details = {}
  for (const e of displayData.value[0]?.element || []) {
    const match = e.label.match(/^探测器(\d+)/)
    if (match) {
      const idx = match[1]
      if (!details[idx]) details[idx] = { id: idx }
      if (e.label === `探测器${idx}`) details[idx].index = e.value
      else if (e.label.endsWith('状态')) details[idx].status = e.value
      else if (e.label.endsWith('报警等级')) details[idx].alarm = e.value
      else if (e.label.endsWith('一氧化碳数据(ppm)')) details[idx].co = e.value
      else if (e.label.endsWith('温度数据(℃)')) details[idx].temp = e.value
      else if (e.label.endsWith('烟雾数据(db/m)')) details[idx].smoke = e.value
      else if (e.label.endsWith('Voc数据')) details[idx].voc = e.value
    }
  }
  // 转数组
  return Object.entries(details).map(([k, v]) => ({ id: k, ...v }))
})
</script>

<style lang="less" scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  grid-auto-rows: 1fr; /* 确保所有行等高 */
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
/* 让探测器详情容器横跨所有列，宽度撑满 */
.detector-details-card {
  grid-column: 1 / -1;
}
:deep(.p-card) {
  border: 1.5px solid #5c5c5c !important; // 更粗且更亮的边框
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.122); // 可选：增加阴影提升立体感
}
</style>
