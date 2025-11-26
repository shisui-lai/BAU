<template>
  <div class="card">
    <div><balance /></div>
    <div class="card">
      <div class="note-text">注：1开启均衡，0未开启均衡</div>
      <!-- 所有 BMU 数据渲染 -->
      <div v-if="DataBalance.length" class="bmu-container">
        <div v-for="(bmu, index) in DataBalance" :key="index" class="bmu-section">
          <!-- BMU 标题 -->
          <div class="bmu-header">
            <h3>{{ bmu.classification }}</h3>
            <!-- 新增均衡信息显示区域 -->
            <div class="balance-info">
              <span>均衡类型：{{ balanceModeText }}</span>
              <!-- 判断当前 BMU 是否为正在均衡的 BMU -->
              <span v-if="balanceTimer.activeBMU === index + 1"> 倒计时：{{ formattedTime }} </span>
            </div>
            <Tag :severity="getBMUStatus(bmu.element)">
              {{ getBMUStatusText(bmu.element) }}
            </Tag>
          </div>

          <!-- 数据表格 -->
          <div class="bmu-table">
            <div
              v-for="(row, rowIndex) in getBMURows(bmu.element)"
              :key="rowIndex"
              class="property-row"
            >
              <div v-for="cell in row" :key="cell.label" class="property-item">
                <div class="value-box" :class="{ active: cell.value === 1 }">
                  <div class="label">{{ cell.label }}</div>
                  <div class="value">{{ cell.value }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 无数据状态 -->
      <div v-else class="empty-state">
        <ProgressSpinner v-if="loading" />
        <span v-else>暂无均衡数据</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useVtSetStore } from '../../../../../stores/vtSetStore.js'
import balance from '../control/balance.vue'
const DataBalance = ref([])
let listenerId = ref(null)
const selectedBMU = ref(0)
const loading = ref(true)
// 获取父组件提供的 selectedIp
const ipStore = useIpStore() // 获取 Pinia store
const balanceStore = useVtSetStore()
const { balance: balanceData, balanceTimer } = balanceStore
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
const MODULE_NAME = 'BalanceData'
const startReading = () => {
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}

const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    /*     console.log(`切换到 IP: ${newIp}`) */
    // 这里假设你通过 `state.deviceData` 来存储不同 IP 对应的数据
    DataBalance.value = state.deviceData[newIp]?.['update-FC04BalanceData'] || []
    /*     console.log('更新后的 DataBalance:', DataBalance) // 打印 DataPackSumm1 数据
     */
  },
  { immediate: true } // 初始时就触发一次
)
const bmuOptions = computed(() => {
  return DataBalance.value.map((bmu, index) => ({
    label: bmu.classification,
    value: index
  }))
})
// 新增计算属性：均衡模式文字（例如：充电/放电）
const balanceModeText = computed(() => {
  const mode = balanceData.balanceMode
  return mode === '0x0001' ? '放电' : '充电'
})
// 计算倒计时时间格式（mm:ss）
const formattedTime = computed(() => {
  const seconds = balanceTimer.remainingTime || 0
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})
// 事件监听器
const registerListener = () => {
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (!state.deviceData[deviceIp]) {
      state.deviceData[deviceIp] = {}
    }
    // 存储数据
    state.deviceData[deviceIp][event] = Arg.Arg
    // 如果当前选择的 IP，更新数据
    if (deviceIp === ipStore.selectedIp) {
      DataBalance.value = Arg.Arg
      localStorage.setItem(`update-FC04BalanceData-${deviceIp}`, JSON.stringify(DataBalance.value))
    }
  }
  window.electron.ipcRenderer.on('update-FC04BalanceData', listenerId.value)
}

onBeforeMount(() => {
  const cacheKey = `update-FC04BalanceData-${ipStore.selectedIp}`
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    DataBalance.value = JSON.parse(cachedData)
    loading.value = false
  }
  registerListener() // 注册事件监听器
  startReading()
})

onBeforeUnmount(() => {
  stopReading()
  // 注销所有事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04BalanceData', listenerId.value)
    listenerId.value = null
    //console.log('已注销事件监听器: update-FC04BalanceData')
  } // 清空监听器ID数组
})
// 获取选中 BMU 的数据
const selectedBMUData = computed(() => DataBalance.value[selectedBMU.value]?.element || [])
// 将 BMU 数据分成 6 行 8 列
// 计算行列布局
const getBMURows = (elements) => {
  const rows = []
  for (let i = 0; i < elements.length; i += 8) {
    rows.push(elements.slice(i, i + 8))
  }
  return rows
}

// BMU 整体状态计算
const getBMUStatus = (elements) => {
  if (elements.some((e) => typeof e.value === 'number')) {
    const allActive = elements.every((e) => e.value === 1)
    return allActive ? 'success' : 'danger'
  }
  return 'warning'
}

const getBMUStatusText = (elements) => {
  if (elements.some((e) => typeof e.value === 'number')) {
    const activeCount = elements.filter((e) => e.value === 1).length
    return `已开启 ${activeCount}/${elements.length}`
  }
  return '状态未知'
}
</script>

<style lang="less" scoped>
.bmu-container {
  margin: 1rem;
}

.bmu-section {
  margin-bottom: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.bmu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;

  h3 {
    margin: 0;
    font-size: 1.1rem;
  }
}

.property-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem;
}

.property-item {
  flex: 1 1 calc(12.5% - 0.5rem); /* 每行8项 */
  min-width: 100px;
}

.value-box {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  text-align: center;
  transition: all 0.2s;

  &.active {
    border-color: #34d399;
    background-color: #ecfdf5;
  }

  .label {
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .value {
    font-weight: 600;
    font-size: 1.1rem;
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6b7280;
}

.note-text {
  color: #6b7280;
  font-size: 0.9rem;
}
</style>
