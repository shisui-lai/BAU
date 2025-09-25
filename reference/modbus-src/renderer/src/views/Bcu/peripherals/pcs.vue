<template>
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripherals.pcs.selectLabel') }}：</label>
      <Dropdown
        v-model="selectedPcsType"
        :options="pcsTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripherals.pcs.selectLabel')"
        class="w-20rem"
      />
    </div>
    <!--     {{ displayData }} -->
    <h5>{{ translatePCS(displayData[0]?.pcsType) }}</h5>
    <DataTable :value="displayData[0]?.element || []" showGridlines>
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
</template>

<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'
const { t, te, locale } = useI18n()
const ipStore = useIpStore()
const pcsData = ref([]) //存储每个ipPCS数据
const selectedPcsType = ref(null) // 用户选择的PCS型号
const realTimePcsType = ref(null) // 实时读到的PCS型号
const hasUserSelection = ref(false) // 用户是否进行了手动选择

const state = reactive({
  deviceData: {}
})

// 初始数据定义
const initPCSDataStar = [
  {
    classification: 'PCS数据',
    pcsType: '星星PCS',
    pcsTypeRaw: 1,
    element: [
      {
        label: '总电压(V)',
        value: '900.1',
        labelKey: 'starPCSLabel1'
      },
      {
        label: '总电流(A)',
        value: '-',
        labelKey: 'starPCSLabel2'
      },
      {
        label: 'SOC(%)',
        value: 30,
        labelKey: 'starPCSLabel3'
      },
      {
        label: 'SOH(%)',
        value: 100,
        labelKey: 'starPCSLabel4'
      },
      {
        label: 'SOE(%)',
        value: 30,
        labelKey: 'starPCSLabel5'
      },
      {
        label: '额定总压(V)',
        value: '0.0',
        labelKey: 'starPCSLabel6'
      },
      {
        label: '额定容量(Ah)',
        value: '280.0',
        labelKey: 'starPCSLabel7'
      },
      {
        label: '剩余容量(Ah)',
        value: '84.0',
        labelKey: 'starPCSLabel8'
      },
      {
        label: '额定电量(kWh)',
        value: '0.0',
        labelKey: 'starPCSLabel9'
      },
      {
        label: '剩余电量(kWh)',
        value: '0.0',
        labelKey: 'starPCSLabel10'
      },
      {
        label: '最大允许放电功率(kW)',
        value: '0.0',
        labelKey: 'starPCSLabel11'
      },
      {
        label: '最大允许充电功率(kW)',
        value: '0.0',
        labelKey: 'starPCSLabel12'
      },
      {
        label: '故障状态',
        value: '严重',
        labelKey: 'starPCSLabel13'
      },
      {
        label: '最大允许充电单体电压(mV)',
        value: 3600,
        labelKey: 'starPCSLabel14'
      },
      {
        label: '最小允许放电单体电压(mV)',
        value: 2650,
        labelKey: 'starPCSLabel15'
      },
      {
        label: '最大允许充电总压(V)',
        value: '888.0',
        labelKey: 'starPCSLabel16'
      },
      {
        label: '最小允许放电总压(V)',
        value: '547.2',
        labelKey: 'starPCSLabel17'
      },
      {
        label: 'BCU状态机',
        value: '初始化',
        labelKey: 'starPCSLabel18'
      },
      {
        label: '充电状态',
        value: '禁止充电',
        labelKey: 'starPCSLabel19'
      },
      {
        label: '放电状态',
        value: '禁止充电',
        labelKey: 'starPCSLabel20'
      },
      {
        label: '高压闭合状态',
        value: '断开',
        labelKey: 'starPCSLabel21'
      }
    ]
  }
]

const initPCSDataSyl = [
  {
    classification: 'PCS数据',
    pcsType: '双一力PCS-01',
    pcsTypeRaw: 2,
    element: [
      {
        label: '总电压(V)',
        value: '900.1',
        labelKey: 'SYLPCSLabel1'
      },
      {
        label: '电池组充/放电总电流(A)',
        value: '-',
        labelKey: 'SYLPCSLabel2'
      },
      {
        label: 'SOC(%)',
        value: 30,
        labelKey: 'SYLPCSLabel3'
      },
      {
        label: 'SOH(%)',
        value: 100,
        labelKey: 'SYLPCSLabel4'
      },
      {
        label: 'SOE(%)',
        value: 30,
        labelKey: 'SYLPCSLabel5'
      },
      {
        label: '额定电压(V)',
        value: '0.0',
        labelKey: 'SYLPCSLabel6'
      },
      {
        label: '额定电流(A)',
        value: '140.0',
        labelKey: 'SYLPCSLabel7'
      },
      {
        label: '额定容量(Ah)',
        value: 280,
        labelKey: 'SYLPCSLabel8'
      },
      {
        label: '放电截止电压(V)',
        value: '888.0',
        labelKey: 'SYLPCSLabel9'
      },
      {
        label: '充电截止电压(V)',
        value: '888.0',
        labelKey: 'SYLPCSLabel10'
      },
      {
        label: '最大放电电流(A)',
        value: '0.0',
        labelKey: 'SYLPCSLabel11'
      },
      {
        label: '最大充电电流(A)',
        value: '0.0',
        labelKey: 'SYLPCSLabel12'
      },
      {
        label: '最大允许放电功率(kW)',
        value: '0.0',
        labelKey: 'SYLPCSLabel13'
      },
      {
        label: '最大允许充电功率(kW)',
        value: '0.0',
        labelKey: 'SYLPCSLabel14'
      },
      {
        label: '总告警',
        value: '无告警',
        labelKey: 'SYLPCSLabel15'
      },
      {
        label: '总故障',
        value: '有一级或二级报警',
        labelKey: 'SYLPCSLabel16'
      },
      {
        label: '高压断开状态',
        value: '断开',
        labelKey: 'SYLPCSLabel17'
      },
      {
        label: '充电状态',
        value: '禁止充电',
        labelKey: 'SYLPCSLabel18'
      },
      {
        label: '放电状态',
        value: '禁止充电',
        labelKey: 'SYLPCSLabel19'
      },
      {
        label: 'BMS状态机',
        value: '初始化',
        labelKey: 'SYLPCSLabel20'
      },
      {
        label: 'BMS心跳',
        value: 14,
        labelKey: 'SYLPCSLabel21'
      }
    ]
  }
]

const initPCSDataKehua = [
  {
    classification: 'PCS数据',
    pcsType: '科华PCS',
    pcsTypeRaw: 3,
    element: [
      {
        label: 'BMS系统状态',
        value: '禁止充电',
        labelKey: 'keHuaPCSLabel1'
      },
      {
        label: 'BMS心跳',
        value: 2,
        labelKey: 'keHuaPCSLabel2'
      },
      {
        label: '保留',
        value: 32766,
        labelKey: 'keHuaPCSLabel3'
      },
      {
        label: '电池电压(V)',
        value: '3.0',
        labelKey: 'keHuaPCSLabel4'
      },
      {
        label: '电池电流(A)',
        value: -1990,
        labelKey: 'keHuaPCSLabel5'
      },
      {
        label: 'SOC(%)',
        value: '3.0',
        labelKey: 'keHuaPCSLabel6'
      },
      {
        label: 'SOH(%)',
        value: '0.0',
        labelKey: 'keHuaPCSLabel7'
      },
      {
        label: '最大允许充电电流(A)',
        value: '280.0',
        labelKey: 'keHuaPCSLabel8'
      },
      {
        label: '最大允许放电电流(A)',
        value: '84.0',
        labelKey: 'keHuaPCSLabel9'
      },
      {
        label: '最大允许充电电压(V)',
        value: '0.0',
        labelKey: 'keHuaPCSLabel10'
      },
      {
        label: '最大允许放电电压(V)',
        value: '0.0',
        labelKey: 'keHuaPCSLabel11'
      },
      {
        label: '可用充电电量(kWh)',
        value: '0.0',
        labelKey: 'keHuaPCSLabel12'
      },
      {
        label: '可用放电电量(kWh)',
        value: '0.0',
        labelKey: 'keHuaPCSLabel13'
      }
    ]
  }
]

// PCS型号选项
const pcsTypeOptions = ref([
  {
    label: t('config.dropdown.pcsType.star'),
    value: 1
  },
  {
    label: t('config.dropdown.pcsType.shuangyili'),
    value: 2
  },
  {
    label: t('config.dropdown.pcsType.kehua'),
    value: 3
  },
  {
    label: t('config.dropdown.pcsType.none'),
    value: 65535
  }
])

// 根据PCS型号获取初始数据
const getInitDataByType = (pcsType) => {
  switch (pcsType) {
    case 1:
      return initPCSDataStar
    case 2:
      return initPCSDataSyl
    case 3:
      return initPCSDataKehua
    case 65535:
      return initPCSDataStar
    default:
      return initPCSDataStar
  }
}

// 计算显示数据：如果用户没有手动选择，自动跟随实时型号；如果用户手动选择了型号，显示对应数据
const displayData = computed(() => {
  // 如果用户没有进行手动选择，或者用户选择的型号与实时型号相同，显示实时数据
  if (!hasUserSelection.value || selectedPcsType.value === realTimePcsType.value) {
    return pcsData.value
  } else {
    // 用户手动选择了与实时型号不同的型号，显示初始数据
    return getInitDataByType(selectedPcsType.value)
  }
})

const MODULE_NAME = 'PCS'

// 启停读取
function startReading() {
  window.electron.ipcRenderer.send('start-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}

function stopReading() {
  window.electron.ipcRenderer.send('stop-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}

// 处理PCS型号选择变化
/* const handlePcsTypeChange = () => {
  // 如果用户选择了型号，更新显示
  if (selectedPcsType.value) {
    console.log('用户选择PCS型号:', selectedPcsType.value)
  }
} */

const handlePCSData = (event, Arg) => {
  if (!Arg?.Arg) return
  const deviceIp = Arg.ip
  if (!state.deviceData[deviceIp]) {
    state.deviceData[deviceIp] = {}
  }
  state.deviceData[deviceIp][event] = Arg.Arg
  // 以事件名和IP为key存储
  const storageKey = `pcsData-${deviceIp}`
  sessionStorage.setItem(storageKey, JSON.stringify(Arg.Arg))
  if (deviceIp === ipStore.selectedIp) {
    pcsData.value = Arg.Arg
    /* console.log(pcsData.value) */
    // 更新实时PCS型号
    if (pcsData.value && pcsData.value[0]) {
      const newRealTimeType = pcsData.value[0].pcsTypeRaw
      realTimePcsType.value = newRealTimeType
      // 如果用户没有进行手动选择，自动跟随实时型号
      if (!hasUserSelection.value) {
        selectedPcsType.value = newRealTimeType
      }
    }
  }
}

const translateLabel = (label, labelKey) => {
  return locale.value === 'zh'
    ? label
    : te(`peripherals.pcs.labels.${labelKey}`)
      ? t(`peripherals.pcs.labels.${labelKey}`)
      : label || '无效值' // 默认值
}

const translateValue = (value) => {
  return locale.value === 'zh'
    ? value
    : te(`peripherals.pcs.values.${value}`)
      ? t(`peripherals.pcs.values.${value}`)
      : value || '无效值' // 默认值
}

const translatePCS = (pcsType) => {
  return locale.value === 'zh'
    ? pcsType
    : te(`peripherals.pcs.${pcsType}`)
      ? t(`peripherals.pcs.${pcsType}`)
      : pcsType || '无效值' // 默认值
}

const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04PCSData')
  window.electron.ipcRenderer.on('update-FC04PCSData', handlePCSData)
}

onBeforeMount(() => {
  const storageKey = `pcsData-${ipStore.selectedIp}`
  const cache = sessionStorage.getItem(storageKey)
  if (cache) {
    pcsData.value = JSON.parse(cache)
    // 设置实时PCS型号
    if (pcsData.value && pcsData.value[0]) {
      realTimePcsType.value = pcsData.value[0].pcsTypeRaw
      // 页面加载时，强制重置为实时型号，并清除用户选择标记
      selectedPcsType.value = realTimePcsType.value
      hasUserSelection.value = false
    }
  } else {
    // 如果没有缓存数据，使用默认的星星PCS初始数据
    pcsData.value = initPCSDataStar
    realTimePcsType.value = 1
    // 页面加载时，强制重置为实时型号，并清除用户选择标记
    selectedPcsType.value = 1
    hasUserSelection.value = false
  }
  startReading()
  registerListener()
})

onBeforeUnmount(() => {
  stopReading()
  window.electron.ipcRenderer.removeListener('update-FC04PCSData', handlePCSData)
})

watch(
  () => ipStore.selectedIp,
  (newIp) => {
    const storageKey = `pcsData-${newIp}`
    const cache = sessionStorage.getItem(storageKey)
    if (cache) {
      pcsData.value = JSON.parse(cache)
      // 更新实时PCS型号
      if (pcsData.value && pcsData.value[0]) {
        realTimePcsType.value = pcsData.value[0].pcsTypeRaw
        // IP切换时，强制重置为实时型号，并清除用户选择标记
        selectedPcsType.value = realTimePcsType.value
        hasUserSelection.value = false
      }
    } else {
      pcsData.value = state.deviceData[newIp]?.['update-FC04PCSData'] || initPCSDataStar
      realTimePcsType.value = pcsData.value[0]?.pcsTypeRaw || 1
      // IP切换时，强制重置为实时型号，并清除用户选择标记
      selectedPcsType.value = realTimePcsType.value
      hasUserSelection.value = false
    }
  },
  { immediate: true }
)

// 监听用户手动选择PCS型号
watch(selectedPcsType, (newValue, oldValue) => {
  // 如果用户手动选择了不同的型号，标记为用户选择
  if (newValue !== oldValue && oldValue !== null) {
    hasUserSelection.value = true
  }
})
</script>

<style lang="less" scoped></style>
