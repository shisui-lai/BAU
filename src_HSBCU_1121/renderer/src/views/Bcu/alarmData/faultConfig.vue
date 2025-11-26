<script setup>
import { ref, computed, onBeforeMount, onBeforeUnmount, watch, shallowRef } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()
const ipStore = useIpStore()
import { initFaultConfigData } from './initData.js'
// 分页参数
const page = ref(1)
const pageSize = 200

// 故障配置数据
const faultConfigData = shallowRef(initFaultConfigData)
/*   faultMap: [],
  totalFault: {}
}) */

// 当前选中的数据类型
const selectedDataType = ref('totalFault')

// 数据类型选项
const dataTypeOptions = computed(() => [
  { label: t('alarm.options.totalFault'), value: 'totalFault' },
  { label: t('alarm.options.faultMap'), value: 'faultMap' }
])

// 模块名称
const MODULE_NAME = 'FaultConfig'

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

// 事件监听器
const listener = (event, data) => {
  if (data.ip !== ipStore.selectedIp) return

  faultConfigData.value = data.Arg
  localStorage.setItem(`update-FC04FaultConfigData-${data.ip}`, JSON.stringify(data.Arg))
}

// 注册事件监听器
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04FaultConfigData')
  window.electron.ipcRenderer.on('update-FC04FaultConfigData', listener)
}

// 当前选中的数据
const currentData = computed(() => {
  const data = faultConfigData.value[selectedDataType.value]
  if (selectedDataType.value === 'faultMap') {
    return data || []
  } else if (selectedDataType.value === 'totalFault') {
    // 将总故障对象转换为数组
    const result = []
    if (data) {
      Object.keys(data).forEach((key) => {
        if (Array.isArray(data[key])) {
          data[key].forEach((item) => {
            result.push({
              ...item,
              category: key
            })
          })
        }
      })
    }
    return result
  }
  return []
})

// 总记录数
const total = computed(() => currentData.value.length)

// 分页回调
function onPageChange(event) {
  page.value = event.page + 1
}

// 获取状态样式类
const getStatusClass = (value) => {
  return value === 1 ? 'status-active' : 'status-inactive'
}

// 获取故障级别样式类
const getFaultLevelClass = (level) => {
  switch (level) {
    case 'Critical':
      return 'level-critical'
    case 'General':
      return 'level-general'
    case 'Minor':
      return 'level-minor'
    default:
      return ''
  }
}

// 获取故障类别标题
const getFaultCategoryTitle = (category) => {
  const titles = {
    contactor: '接触器故障',
    invalidValue1: '无效值标志',
    cellFault: '单体故障',
    packFault: 'Pack故障',
    clusterFault: '簇故障'
  }
  return titles[category] || category
}

// 分组的总故障数据
const groupedTotalFaults = computed(() => {
  const data = faultConfigData.value.totalFault
  if (!data) return {}

  const grouped = {}

  // 处理各个故障类别
  Object.keys(data).forEach((key) => {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      // 将clusterFault1和clusterFault2合并为clusterFault
      if (key === 'clusterFault1' || key === 'clusterFault2') {
        if (!grouped.clusterFault) {
          grouped.clusterFault = []
        }
        grouped.clusterFault.push(...data[key])
      } else {
        grouped[key] = data[key]
      }
    }
  })

  return grouped
})

onBeforeMount(() => {
  // 先加载缓存
  const key = `update-FC04FaultConfigData-${ipStore.selectedIp}`
  const cached = localStorage.getItem(key)
  if (cached) {
    faultConfigData.value = JSON.parse(cached)
  }

  registerListener()
  startReading()
})

onBeforeUnmount(() => {
  stopReading()
  window.electron.ipcRenderer.removeListener('update-FC04FaultConfigData', listener)
})

watch(
  () => ipStore.selectedIp,
  (newIp) => {
    page.value = 1
    const key = `update-FC04FaultConfigData-${newIp}`
    const cached = localStorage.getItem(key)
    if (cached) {
      faultConfigData.value = JSON.parse(cached)
    } else {
      faultConfigData.value = initFaultConfigData
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="card">
    <div class="card-header">
      <div class="controls">
        <Dropdown
          v-model="selectedDataType"
          :options="dataTypeOptions"
          optionLabel="label"
          optionValue="value"
          class="data-type-dropdown"
        />
      </div>
    </div>

    <!-- 故障映射数据表格 -->
    <DataTable
      v-if="selectedDataType === 'faultMap'"
      :value="currentData"
      paginator
      :first="(page - 1) * pageSize"
      :rows="pageSize"
      :totalRecords="total"
      @page="onPageChange"
      showGridlines
      scrollable
      sortMode="multiple"
      class="centered-table"
    >
      <Column field="label" :header="t('alarm.totalNumbeOfFaults', { total: total })">
        <template #body="{ data }">
          {{ t(`configEnable.faultAction.dropdown.faultEvent.${data.label}`, data.label) }}
        </template>
      </Column>
      <Column field="enableValue" :header="t(`alarm.totalFaults.titles.enableStatus`)" sortable>
        <template #body="{ data }">
          <span :class="getStatusClass(data.enableValue)">
            {{ data.enableValue === 1 ? t(`alarm.levels.故障`) : t(`alarm.levels.无故障`) }}
          </span>
        </template>
      </Column>
      <Column field="reservedValue" :header="t(`alarm.totalFaults.titles.reservedStatus`)" sortable>
        <template #body="{ data }">
          <span :class="getStatusClass(data.reservedValue)">
            {{ data.reservedValue === 1 ? t(`alarm.levels.故障`) : t(`alarm.levels.无故障`) }}
          </span>
        </template>
      </Column>
    </DataTable>

    <!-- 总故障信息表格渲染 -->
    <div v-else-if="selectedDataType === 'totalFault'" class="fault-tables-container">
      <div
        v-for="(faults, category) in groupedTotalFaults"
        :key="category"
        class="fault-table-section"
      >
        <!--   <h5 class="table-section-title">
          {{ getFaultCategoryTitle(category) }} ({{ faults.length }} 项)
        </h5> -->
        <DataTable :value="faults" showGridlines class="centered-table">
          <Column field="label" :header="t(`alarm.totalFaults.titles.${category}`)">
            <template #body="{ data }">
              {{ t(`alarm.totalFaults.${data.label}`, data.label) }}
            </template>
          </Column>
          <Column field="value" :header="t('alarm.title7')" sortable>
            <template #body="{ data }">
              <span
                v-if="(data.value === '严重') | (data.value === '无效')"
                class="level-critical"
                >{{ t(`alarm.levels.${data.value}`) }}</span
              >
              <span v-else-if="data.value === '一般'" class="level-general">{{
                t(`alarm.levels.${data.value}`)
              }}</span>
              <span v-else-if="data.value === '轻微'" class="level-minor">{{
                t(`alarm.levels.${data.value}`)
              }}</span>
              <span
                v-else-if="data.value === '无故障' || data.value === '有效'"
                class="level-no-fault"
                >{{ t(`alarm.levels.${data.value}`) }}</span
              >
              <!-- hwelseFault 特殊值显示 -->
              <span
                v-else-if="data.value === '异常' || data.value === '断开'"
                class="level-hwelse-fault"
                >{{ t(`alarm.levels.${data.value}`) }}</span
              >
              <span
                v-else-if="data.value === '正常' || data.value === '闭合'"
                class="level-hwelse-normal"
                >{{ t(`alarm.levels.${data.value}`) }}</span
              >
              <span v-else>{{ data.value }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.data-type-dropdown {
  min-width: 200px;
}
/* 故障级别样式 */
.level-critical {
  background-color: #dc2626;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.level-general {
  background-color: #ea580c;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.level-minor {
  background-color: #f59e0b;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.level-no-fault {
  background-color: #16a34a;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* 状态样式 */
.status-active {
  background-color: #dc2626;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-inactive {
  background-color: #16a34a;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* hwelseFault 特殊样式 */
.level-hwelse-fault {
  background-color: #dc2626;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.level-hwelse-normal {
  background-color: #16a34a;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}
/* 表格式渲染样式 */
.fault-tables-container,
.dido-tables-container {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.fault-table-section,
.dido-table-section {
  margin-bottom: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .fault-tables-container,
  .dido-tables-container {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1200px) {
  .fault-tables-container,
  .dido-tables-container {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }
}
</style>
