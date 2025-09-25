<script setup>
import { ref, computed, watch, onBeforeMount, onBeforeUnmount, reactive } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'
import DIDORTData from '../alarmData/DIDORTData.vue'
const { t } = useI18n()
const initDIDOData = () => [
  {
    classification: 'DI反馈',
    element: [
      { label: 'DI1', value: 0 },
      { label: 'DI2', value: 0 },
      { label: 'DI3', value: 0 },
      { label: 'DI4', value: 0 },
      { label: 'DI5', value: 0 },
      { label: 'DI6', value: 0 },
      { label: 'DI7', value: 0 },
      { label: 'DI8', value: 0 },
      { label: 'DI9', value: 0 },
      { label: 'DI10', value: 0 },
      { label: 'DI11', value: 0 },
      { label: 'BMU1 DI1', value: 0 },
      { label: 'BMU1 DI2', value: 0 },
      { label: 'BMU2 DI1', value: 0 },
      { label: 'BMU2 DI2', value: 0 }
    ]
  },
  {
    classification: 'DO反馈',
    element: [
      { label: 'DO1', value: 0 },
      { label: 'DO2', value: 0 },
      { label: 'DO3', value: 0 },
      { label: 'DO4', value: 0 },
      { label: 'DO5', value: 1 },
      { label: 'DO6', value: 0 },
      { label: 'DO7', value: 1 },
      { label: 'DO8', value: 0 }
    ]
  }
]
const DataDIDO = ref([]) // 存储 DIDO 数据
let listenerId = ref(null)
const ipStore = useIpStore() // 获取 Pinia store
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})

watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    DataDIDO.value = state.deviceData[newIp]?.['update-FC04DIDO'] || initDIDOData()
  },
  { immediate: true } // 初始时就触发一次
)

// 事件监听器
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04DIDO')
  listenerId.value = (event, Arg) => {
    /*  console.log('Received Arg:', Arg) // 打印接收到的 Arg 数据 */
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (!state.deviceData[deviceIp]) {
      state.deviceData[deviceIp] = {}
    }
    // 存储数据
    state.deviceData[deviceIp][event] = Arg.Arg
    // 如果当前选择的 IP，更新数据
    if (deviceIp === ipStore.selectedIp) {
      DataDIDO.value = Arg.Arg
      localStorage.setItem(`update-FC04DIDO-${deviceIp}`, JSON.stringify(DataDIDO.value))
    }
  }
  window.electron.ipcRenderer.on('update-FC04DIDO', listenerId.value)
}
// 处理数据的计算属性
const formatItem = (item) => {
  if (!item) return { label: '', value: '' }
  return {
    label: item.label,
    value: item.value === 0 ? 0 : item.value || '-' // 明确保留0值
  }
}
const processedData = computed(() => {
  // 安全获取数据源
  const diItems = DataDIDO.value.find((i) => i.classification === 'DI反馈')?.element || []
  const doItems = DataDIDO.value.find((i) => i.classification === 'DO反馈')?.element || []
  /*   console.log('doItems:', doItems) */
  // 优化后的数据格式化
  const maxLength = Math.max(diItems.length, doItems.length)
  const result = []
  for (let i = 0; i < maxLength; i++) {
    const di = formatItem(diItems[i])
    const dO = formatItem(doItems[i])

    result.push({
      diParamLabel: di.label,
      diValue: di.value,
      doParamLabel: dO.label,
      doValue: dO.value
    })
  }
  return result
})
onBeforeMount(() => {
  const cacheKey = `update-FC04DIDO-${ipStore.selectedIp}`
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    DataDIDO.value = JSON.parse(cachedData)
    console.log('已缓存数据: update-FC04DIDO')
  }
  registerListener() // 注册事件监听器
})
/* onMounted(() => {
  // 注册事件监听器
  nextTick(() => {
    console.log(DataDIDO.value)
  }) //
}) */
onBeforeUnmount(() => {
  // 注销事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04DIDO', listenerId.value)
    listenerId.value = null
    //console.log('已注销事件监听器: update-FC04DIDO')
  }
})
</script>

<template>
  <div class="dido-container">
    <!-- 新增的DI/DO/RT数据组件 -->
    <DIDORTData />
    <!-- 原有的DI/DO反馈数据 -->
    <div class="card">
      <h5>{{ t('didoFeadback.title') }}</h5>
      <DataTable :value="processedData" scrollable scrollHeight="550px" showGridlines>
        <!-- DI参数列 -->
        <Column :header="t('didoFeadback.header1')">
          <template #body="{ data }">
            <span>{{ data.diParamLabel }}</span>
          </template>
        </Column>
        <!-- DI状态列 -->
        <Column :header="t('didoFeadback.header2')">
          <template #body="{ data }">
            <Tag
              v-if="data.diValue !== '-' && data.diValue != null && data.diValue !== ''"
              :value="data.diValue.toString()"
            />
          </template>
        </Column>
        <!-- DO参数列 -->
        <Column :header="t('didoFeadback.header3')">
          <template #body="{ data }">
            <span>{{ data.doParamLabel }}</span>
          </template>
        </Column>

        <!-- DO状态列 -->
        <Column :header="t('didoFeadback.header4')">
          <template #body="{ data }">
            <Tag
              v-if="data.doValue !== '-' && data.doValue != null && data.doValue !== ''"
              :value="data.doValue.toString()"
            />
          </template>
        </Column>
        <template #empty>
          <div class="p-4 text-center text-gray-500">暂无数据</div>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.dido-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 新增样式确保0值可见 */
:deep(.p-column-title) {
  white-space: nowrap !important;
}
:deep(.p-tag) {
  width: 60px;
  justify-content: center;
  padding: 0.25rem 0.5rem;
}
</style>
