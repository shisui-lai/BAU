<template>
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripherals.dehum1.selectLabel') }}：</label>
      <Dropdown
        v-model="selectedDehumType"
        :options="dehumTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripherals.dehum1.selectLabel')"
        class="w-20rem"
      />
    </div>
    <h5>{{ translateDehumType(displayData[0]?.dehumType) }}</h5>
    <div class="container">
      <div class="table-container">
        <DataTable :value="dehumData1 || []" showGridlines>
          <Column :header="t('eventTime.tableTile1')" headerStyle="width: 300px">
            <template #body="{ data: el }">
              {{ translateLabel(el.label, el.labelKey) }}
            </template>
          </Column>
          <Column :header="t('eventTime.tableTile2')">
            <template #body="{ data: el }">
              {{ translateValue(el.value) }}
            </template>
          </Column>
        </DataTable>
      </div>
      <div class="table-container">
        <DataTable :value="dehumData2 || []" showGridlines>
          <Column :header="t('eventTime.tableTile1')" headerStyle="width: 300px">
            <template #body="{ data: el }">
              {{ translateLabel(el.label, el.labelKey) }}
            </template>
          </Column>
          <Column :header="t('eventTime.tableTile2')">
            <template #body="{ data: el }">
              {{ translateValue(el.value) }}
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'
import Dropdown from 'primevue/dropdown'
const { t, locale, te } = useI18n()
const ipStore = useIpStore()
const dehumData = ref([]) //存储每个ipPCS数据
const selectedDehumType = ref(null) // 用户选择的除湿机型号
const realTimeDehumType = ref(null) // 实时读到的除湿机型号
const hasUserSelection = ref(false) // 用户是否进行了手动选择

const state = reactive({
  deviceData: {}
})

// 除湿机型号选项
const dehumTypeOptions = ref([
  {
    label: t('config.dropdown.dehumidifierType.type1'),
    value: 1
  },
  {
    label: t('config.dropdown.dehumidifierType.none'),
    value: 65535
  }
])

// 根据除湿机型号获取初始数据
const getInitDataByType = (dehumType) => {
  switch (dehumType) {
    case 1:
      return initDehumData
    default:
      return initDehumData
  }
}

// 计算显示数据：如果用户没有手动选择，自动跟随实时型号；如果用户手动选择了型号，显示对应数据
const displayData = computed(() => {
  // 如果用户没有进行手动选择，或者用户选择的型号与实时型号相同，显示实时数据
  if (!hasUserSelection.value || selectedDehumType.value === realTimeDehumType.value) {
    return dehumData.value
  } else {
    // 用户手动选择了与实时型号不同的型号，显示初始数据
    return getInitDataByType(selectedDehumType.value)
  }
})

const dehumData1 = computed(() => {
  return displayData.value[0]?.element?.slice(0, 16) || []
})
const dehumData2 = computed(() => {
  return displayData.value[0]?.element?.slice(16) || []
})

const initDehumData = [
  {
    classification: '除湿机数据',
    dehumType: '无除湿机设备',
    dehumTypeRaw: 1,
    element: [
      {
        label: '雾化模块状态',
        value: '正常',
        labelKey: 'dehum1Label1'
      },
      {
        label: '雾化工作状态',
        value: '关闭',
        labelKey: 'dehum1Label2'
      },
      {
        label: '故障回路状态',
        value: '关闭',
        labelKey: 'dehum1Label3'
      },
      {
        label: '控湿回路状态',
        value: '停止',
        labelKey: 'dehum1Label4'
      },
      {
        label: '控温回路状态',
        value: '停止',
        labelKey: 'dehum1Label5'
      },
      {
        label: '控温方式',
        value: '降温',
        labelKey: 'dehum1Label6'
      },
      {
        label: '风机模块回路状态',
        value: '正常',
        labelKey: 'dehum1Label7'
      },
      {
        label: '除湿模块回路状态',
        value: '正常',
        labelKey: 'dehum1Label8'
      },
      {
        label: '湿度传感器状态',
        value: '正常',
        labelKey: 'dehum1Label9'
      },
      {
        label: '外部温度传感器状态',
        value: '正常',
        labelKey: 'dehum1Label10'
      },
      {
        label: '内部温度传感器状态',
        value: '正常',
        labelKey: 'dehum1Label11'
      },
      {
        label: '化霜状态',
        value: '正常',
        labelKey: 'dehum1Label12'
      },
      {
        label: '控湿手动开关',
        value: '正常',
        labelKey: 'dehum1Label13'
      },
      {
        label: '控温手动开关',
        value: '正常',
        labelKey: 'dehum1Label14'
      },
      {
        label: '高温告警',
        value: '正常',
        labelKey: 'dehum1Label15'
      },
      {
        label: '露点温度回路工作状态',
        value: '关闭',
        labelKey: 'dehum1Label16'
      },
      {
        label: '内部温度值(℃)',
        value: '0.0',
        labelKey: 'dehum1Label17'
      },
      {
        label: '环境温度值(℃)',
        value: '0.0',
        labelKey: 'dehum1Label18'
      },
      {
        label: '环境湿度值(%RH)',
        value: '0.0',
        labelKey: 'dehum1Label19'
      },
      {
        label: '内部温度值2(℃)',
        value: '0.0',
        labelKey: 'dehum1Label20'
      },
      {
        label: '露点温度(℃)',
        value: '0.0',
        labelKey: 'dehum1Label21'
      },
      {
        label: '备用3',
        value: 0,
        labelKey: 'dehum1Label22'
      },
      {
        label: '备用4',
        value: 0,
        labelKey: 'dehum1Label23'
      },
      {
        label: '备用5',
        value: 0,
        labelKey: 'dehum1Label24'
      },
      {
        label: '控温开启值(℃)',
        value: '0.0',
        labelKey: 'dehum1Label25'
      },
      {
        label: '控温停止值(℃)',
        value: '0.0',
        labelKey: 'dehum1Label26'
      },
      {
        label: '控湿开启值(%RH)',
        value: '0.0',
        labelKey: 'dehum1Label27'
      },
      {
        label: '控湿停止值(%RH)',
        value: '0.0',
        labelKey: 'dehum1Label28'
      },
      {
        label: '温度报警上限值(℃)',
        value: '0.0',
        labelKey: 'dehum1Label29'
      },
      {
        label: '温度报警下限值(℃)',
        value: '0.0',
        labelKey: 'dehum1Label30'
      },
      {
        label: '露点温度启动值(℃)',
        value: '0.0',
        labelKey: 'dehum1Label31'
      },
      {
        label: '露点温度回差值(℃)',
        labelKey: 'dehum1Label32'
      }
    ]
  }
]
const MODULE_NAME = 'dehum'
// 启停读取
function startReading() {
  window.electron.ipcRenderer.send('start-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}
function stopReading() {
  window.electron.ipcRenderer.send('stop-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
const handleDehumData = (event, Arg) => {
  //console.log(Arg)
  if (!Arg?.Arg) return
  const deviceIp = Arg.ip
  if (!state.deviceData[deviceIp]) {
    state.deviceData[deviceIp] = {}
  }
  state.deviceData[deviceIp][event] = Arg.Arg
  // 以事件名和IP为key存储
  const storageKey = `dehumData-${deviceIp}`
  sessionStorage.setItem(storageKey, JSON.stringify(Arg.Arg))
  if (deviceIp === ipStore.selectedIp) {
    dehumData.value = Arg.Arg
    // 更新实时除湿机型号
    if (dehumData.value && dehumData.value[0]) {
      const newRealTimeType = dehumData.value[0].dehumTypeRaw
      realTimeDehumType.value = newRealTimeType
      // 如果用户没有进行手动选择，自动跟随实时型号
      if (!hasUserSelection.value) {
        selectedDehumType.value = newRealTimeType
      }
    }
  }
  //console.log(dehumData.value)
}
const translateDehumType = (dehumType) => {
  return locale.value === 'zh'
    ? dehumType
    : te(`peripherals.dehum1.${dehumType}`)
      ? t(`peripherals.dehum1.${dehumType}`)
      : dehumType
}
const translateLabel = (label, labelKey) => {
  return locale.value === 'zh'
    ? label
    : te(`peripherals.dehum1.labels.${labelKey}`)
      ? t(`peripherals.dehum1.labels.${labelKey}`)
      : label
}
const translateValue = (value) => {
  return locale.value === 'zh'
    ? value
    : te(`peripherals.dehum1.values.${value}`)
      ? t(`peripherals.dehum1.values.${value}`)
      : value
}
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04DehumData')
  window.electron.ipcRenderer.on('update-FC04DehumData', handleDehumData)
}
onBeforeMount(() => {
  const storageKey = `dehumData-${ipStore.selectedIp}`
  const cache = sessionStorage.getItem(storageKey)
  if (cache) {
    dehumData.value = JSON.parse(cache)
    // 设置实时除湿机型号
    if (dehumData.value && dehumData.value[0]) {
      realTimeDehumType.value = dehumData.value[0].dehumTypeRaw
      // 页面加载时，强制重置为实时型号，并清除用户选择标记
      selectedDehumType.value = realTimeDehumType.value
      hasUserSelection.value = false
    }
  } else {
    dehumData.value = initDehumData
    realTimeDehumType.value = 65535
    // 页面加载时，强制重置为实时型号，并清除用户选择标记
    selectedDehumType.value = 65535
    hasUserSelection.value = false
  }
  startReading()
  registerListener()
})
onBeforeUnmount(() => {
  stopReading()
  window.electron.ipcRenderer.removeListener('update-FC04DehumData', handleDehumData)
})
watch(
  () => ipStore.selectedIp,
  (newIp) => {
    const storageKey = `dehumData-${newIp}`
    const cache = sessionStorage.getItem(storageKey)
    if (cache) {
      dehumData.value = JSON.parse(cache)
      // 更新实时除湿机型号
      if (dehumData.value && dehumData.value[0]) {
        realTimeDehumType.value = dehumData.value[0].dehumTypeRaw
        // IP切换时，强制重置为实时型号，并清除用户选择标记
        selectedDehumType.value = realTimeDehumType.value
        hasUserSelection.value = false
      }
    } else {
      dehumData.value = state.deviceData[newIp]?.['update-FC04DehumData'] || initDehumData
      realTimeDehumType.value = dehumData.value[0]?.dehumTypeRaw || 65535
      // IP切换时，强制重置为实时型号，并清除用户选择标记
      selectedDehumType.value = realTimeDehumType.value
      hasUserSelection.value = false
    }
  },
  { immediate: true }
)

// 监听用户手动选择除湿机型号
watch(selectedDehumType, (newValue, oldValue) => {
  // 如果用户手动选择了不同的型号，标记为用户选择
  if (newValue !== oldValue && oldValue !== null) {
    hasUserSelection.value = true
  }
})
</script>

<style lang="less" scoped>
.container {
  display: flex;
  gap: 1rem;
  width: 100%;
}
.table-container {
  flex-grow: 1; /* 让表格自动扩展，占满剩余空间 */
  min-width: 48%; /* 保证每个表格至少占用30%的宽度 */
}
</style>
