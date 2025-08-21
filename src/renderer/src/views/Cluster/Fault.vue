<!-- 故障页面 - 使用 clusterStore 统一管理筛选状态 -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { parseFault, sortedAllFaults } from '../../composables/core/data-processing/common/parseFault'
import { useClusterStore } from '../../stores/device/clusterStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'

// 类型声明
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        on: (channel: string, callback: (...args: any[]) => void) => void;
        removeListener: (channel: string, callback: (...args: any[]) => void) => void;
      };
    };
  }
}

// 使用 clusterStore 管理筛选状态
const clusterStore = useClusterStore()

/* ---------- 分页状态 ---------- */
const first = ref(0)      // 当前偏移量
const rows = ref(30)     // 每页条数

/* ---------- MQTT 监听 ---------- */
const FAULT_CHANNELS = [
  'HARDWARE_FAULT',
  'TOTAL_FAULT',
  'FAULT_LEVEL1',
  'FAULT_LEVEL2',
  'CELL_OV_FAULT_LEVEL3',
  'CELL_UV_FAULT_LEVEL3',
  'CHG_OT_FAULT_LEVEL3',
  'CHG_UT_FAULT_LEVEL3',
  'DSG_OT_FAULT_LEVEL3',
  'DSG_UT_FAULT_LEVEL3',
  'SOC_OVER_FAULT_LEVEL3',
  'SOC_UNDER_FAULT_LEVEL3',
  // 堆故障频道
  'BLOCK_HARDWARE_FAULT',
  'BLOCK_TOTAL_FAULT'
]

// 防抖更新筛选选项，避免频繁计算
let updateTimer: ReturnType<typeof setTimeout> | null = null
function debouncedUpdateFilterOptions() {
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  updateTimer = setTimeout(() => {
    clusterStore.updateFaultOptions(sortedAllFaults.value)
    updateTimer = null
  }, 500)
}

function onFaultMsg(_e: unknown, msg: any) {
  parseFault(msg)
  debouncedUpdateFilterOptions()
}

// 确保监听器只注册一次
let attached = false

onMounted(() => {
    // 设置页面类型为独立页面，不显示导航栏的簇选择器
    clusterStore.setCurrentPageType('standalone')
  if (!attached) {
    FAULT_CHANNELS.forEach(ch =>
      window.electron.ipcRenderer.on(ch, onFaultMsg)
    )
    attached = true
    console.log('[debug] Fault listeners attached')
  }
  // 初始化筛选选项
  nextTick(() => {
    clusterStore.updateFaultOptions(sortedAllFaults.value)
  })
})

onBeforeUnmount(() => {
  // 清理定时器
  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }
  
  // 清理监听器
  if (attached) {
    FAULT_CHANNELS.forEach(ch =>
      window.electron.ipcRenderer.removeListener(ch, onFaultMsg)
    )
    attached = false
    console.log('[debug] Fault listeners removed')
  }
})

/* ---------- 筛选数据计算 ---------- */
// 使用 clusterStore 过滤故障数据
const filteredFaults = computed(() => {
  return clusterStore.filterFaultData(sortedAllFaults.value)
})

/* ---------- 分页计算 ---------- */
const total = computed(() => filteredFaults.value.length)

const pageRows = computed(() => {
  const start = first.value
  const end = Math.min(start + rows.value, total.value)
  return filteredFaults.value.slice(start, end)
})

function onPageChange(e: any) {
  first.value = e.first
  rows.value = e.rows
}

// 当筛选条件改变时重置分页
watch([
  () => clusterStore.faultFilterMode,
  () => clusterStore.selectedBlocksForFault,
  () => clusterStore.selectedClustersForFault
], () => {
  first.value = 0
})

/* ---------- 筛选操作方法 ---------- */
function setFilterMode(mode: 'all' | 'block' | 'cluster') {
  clusterStore.setFaultFilterMode(mode)
}

</script>
<template>
  <div class="card">
    <DataTable
      :value="pageRows"
      paginator
      lazy
      :totalRecords="total"
      :rows="rows"
      :rowsPerPageOptions="[30, 100, 200]"
      :first="first"         
      @page="onPageChange"   
      dataKey="label"         
        class="fault-table"
        :emptyMessage="total === 0 ? '暂无符合条件的故障' : '暂无故障'"
    >
      <template #header>
        <div class="table-header-content">
          <!-- 筛选控制区域 -->
          <div class="filter-controls">
            <!-- 筛选模式选择 -->
            <div class="flex items-center gap-2">
              <div class="flex gap-1">
                <Button
                  label="全部故障"
                  :outlined="clusterStore.faultFilterMode !== 'all'"
                  size="small"
                  @click="setFilterMode('all')"
                  class="filter-button"
                />
                <Button
                  label="按堆筛选"
                  :outlined="clusterStore.faultFilterMode !== 'block'"
                  size="small"
                  @click="setFilterMode('block')"
                  class="filter-button"
                />
                <Button
                  label="按簇筛选"
                  :outlined="clusterStore.faultFilterMode !== 'cluster'"
                  size="small"
                  @click="setFilterMode('cluster')"
                  class="filter-button"
                />
              </div>

              <!-- 堆筛选 -->
              <MultiSelect
                v-if="clusterStore.faultFilterMode === 'block'"
                v-model="clusterStore.selectedBlocksForFault"
                :options="clusterStore.availableBlocks"
                optionLabel="label"
                optionValue="value"
                placeholder="请选择要查看的堆"
                class="w-48"
              />

              <!-- 簇筛选 -->
              <MultiSelect
                v-if="clusterStore.faultFilterMode === 'cluster'"
                v-model="clusterStore.selectedClustersForFault"
                :options="clusterStore.availableFaultClusters"
                optionLabel="label"
                optionValue="value"
                placeholder="请选择要查看的簇"
                class="w-48"
              />
            </div>
          </div>
          
        </div>
          <div class="fault-summary-bar p-2 bg-gray-50 border-b flex justify-between">
            <div>
              <span class="font-medium">共 {{ total }} 条故障</span>
            </div>
          </div>
      </template>
        


        <Column field="time" header="发生时间" style="min-width:160px" />
        <Column field="desc" header="故障" style="min-width:260px" />
      <Column header="堆/簇号" style="width:110px;text-align:center">
        <template #body="{ data }">
          {{ data.cluster.endsWith('-0') ? data.cluster.split('-')[0] : data.cluster }}
        </template>
      </Column>
        <Column field="bmu" header="BMU 编号" style="width:120px;text-align:center" >
          <template #body="{ data }">
            {{ data.bmu === null || data.bmu === 0 ? '-' : data.bmu }}
          </template>
        </Column>
      <Column header="AFE" style="width:90px;text-align:center">
        <template #body="{ data }">
          {{ data.afe === null || data.afe === 0 ? '-' : data.afe }}
        </template>
      </Column>
      <Column header="Cell" style="width:100px;text-align:center">
        <template #body="{ data }">
          {{ data.cell === null || data.cell === 0 ? '-' : data.cell }}
        </template>
      </Column>
      <Column header="故障等级" style="width:120px;text-align:center">
        <template #body="{ data }">
          <Tag
            :value="data.levelTxt"
            :severity="{
              severe: 'danger',
              medium: 'warning',
                mild: 'info'
            }[data.levelTag] || 'secondary'"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.card {
  /* 使用全局card样式，不覆盖margin-left */
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  /* 确保高度正确 */
  height: 100%;
}

.fault-table {
  height: 100%;
}

.table-header-content {
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.filter-controls {
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.filter-button {
  padding: 4px 10px !important;
  font-size: 12px !important;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.header-with-count {
  text-align: center;
}

.fault-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: normal;
  margin-bottom: 4px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 2px;
}

:deep(.p-datatable-wrapper) { 
  height: calc(100% - 80px);
}

:deep(.p-datatable-table) {
  table-layout: fixed;
}

/* 优化表格样式 */
:deep(.p-datatable-header) {
  padding: 0;
  background: transparent;
  border: none;
}

:deep(.p-paginator) {
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  border-radius: 0 0 8px 8px;
}

/* 多选框样式优化 */
:deep(.p-multiselect) {
  font-size: 12px;
}

:deep(.p-multiselect-panel) {
  border-radius: 6px;
  border: 1px solid #d1d5db;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

:deep(.p-multiselect-header) {
  padding: 6px 10px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

:deep(.p-multiselect-items) {
  padding: 2px 0;
}

:deep(.p-multiselect-item) {
  padding: 6px 10px;
  margin: 0 2px;
  border-radius: 3px;
  transition: all 0.2s ease;
  font-size: 12px;
}

:deep(.p-multiselect-item:hover) {
  background: #f3f4f6;
}

:deep(.p-multiselect-item.p-highlight) {
  background: #dbeafe;
  color: #1d4ed8;
}
</style>
