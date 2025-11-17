<script setup>
import { ref, computed, watch, onBeforeMount, onBeforeUnmount, reactive } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const ipStore = useIpStore()
import { initDIDOConfigData } from './initData.js'
// 故障配置数据
const DIDORTData = ref(initDIDOConfigData)

// 事件监听器ID
let listenerId = ref(null)

// 监听IP变化
watch(
  () => ipStore.selectedIp,
  (newIp) => {
    if (newIp) {
      // 从localStorage加载缓存数据
      const key = `update-FC04DIDOConfigData-${newIp}`
      const cached = localStorage.getItem(key)
      if (cached) {
        DIDORTData.value = JSON.parse(cached)
      } else {
        DIDORTData.value = initDIDOConfigData
      }
    }
  },
  { immediate: true }
)
// 获取状态样式类
const getStatusClass = (value) => {
  return value === 1 ? 'status-active' : 'status-inactive'
}

// 分组的DI/DO状态数据
const groupedDiDOStatus = computed(() => {
  const data = DIDORTData.value.diDOStatus
  if (!data) return {}

  const grouped = {}

  // 处理各个信号类别
  Object.keys(data).forEach((key) => {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      // 将diSignal1和diSignal2合并为diSignal
      if (key === 'diSignal1' || key === 'diSignal2') {
        if (!grouped.diSignal) {
          grouped.diSignal = []
        }
        grouped.diSignal.push(...data[key])
      } else {
        grouped[key] = data[key]
      }
    }
  })

  return grouped
})

// 事件监听器
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04DIDOConfigData')
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (deviceIp === ipStore.selectedIp) {
      DIDORTData.value = Arg.Arg
      // 缓存数据
      const key = `update-FC04DIDOConfigData-${deviceIp}`
      localStorage.setItem(key, JSON.stringify(DIDORTData.value))
    }
  }
  window.electron.ipcRenderer.on('update-FC04DIDOConfigData', listenerId.value)
}
const MODULE_NAME = 'DIDOConfig'
// 开始读取数据
const startReading = () => {
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}

// 停止读取数据
const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}

onBeforeMount(() => {
  // 先加载缓存
  const key = `update-FC04DIDOConfigData-${ipStore.selectedIp}`
  const cached = localStorage.getItem(key)
  if (cached) {
    DIDORTData.value = JSON.parse(cached)
  } else {
    DIDORTData.value = initDIDOConfigData
  }

  registerListener()
  startReading()
})

onBeforeUnmount(() => {
  // 注销事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04DIDOConfigData', listenerId.value)
    listenerId.value = null
  }
  stopReading()
})
</script>

<template>
  <div class="card">
    <div class="dido-tables-container">
      <div
        v-for="(signals, category) in groupedDiDOStatus"
        :key="category"
        class="dido-table-section"
      >
        <DataTable :value="signals" showGridlines class="centered-table">
          <template #header>
            <div style="text-align: left">
              <span v-if="category === 'diSignal'">
                {{ t('alarm.didoTMap.titles.diSignalStatus') }}
              </span>
              <span v-else-if="category === 'doSignal1'">
                {{ t('alarm.didoTMap.titles.doSignalStatus') }}
              </span>
              <span v-else-if="category === 'rtData'">
                {{ t('alarm.didoTMap.titles.rtDataStatus') }}
              </span>
            </div>
          </template>
          <Column field="label" :header="t('alarm.didoTMap.titles.signalName')">
            <template #body="{ data }">
              <span v-if="category === 'rtData'">
                {{ t(`alarm.didoTMap.${data.signalName}`, data.signalName) }}
              </span>
              <span v-else>
                {{ t(`alarm.didoTMap.${data.label}`, data.label) }}
              </span>
            </template>
          </Column>
          <Column field="value" :header="t('alarm.didoTMap.titles.value')" sortable>
            <template #body="{ data }">
              <span v-if="category === 'rtData'"> {{ data.temperature }}℃ </span>
              <span v-else :class="getStatusClass(data.value)">
                {{ data.value }}
              </span>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 表格式渲染样式 */
.dido-tables-container {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.dido-table-section {
  margin-bottom: 0;
}

/* 状态样式 */
.status-active {
  background-color: #10b981;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-inactive {
  background-color: #6b7280;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dido-tables-container {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1200px) {
  .dido-tables-container {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }
}
</style>
