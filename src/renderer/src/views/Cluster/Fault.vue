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

  //清理防抖定时器
  if (resetPageTimer) {
    clearTimeout(resetPageTimer)
    resetPageTimer = null
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
// 性能优化：使用缓存的computed
const filteredFaults = computed(() => {
  return clusterStore.filterFaultData(sortedAllFaults.value)
})

/* ---------- 分页计算 ---------- */
// 性能优化：使用shallowRef避免深度响应式
const total = computed(() => filteredFaults.value.length)

// 性能优化：使用nextTick延迟分页计算，避免阻塞UI
const pageRows = computed(() => {
  const faults = filteredFaults.value
  const start = first.value
  const end = Math.min(start + rows.value, faults.length)

  // 避免重复访问filteredFaults.value
  return faults.slice(start, end)
})

function onPageChange(e: any) {
  first.value = e.first
  rows.value = e.rows
}

// 性能优化：使用防抖的watch，减少频繁重置
let resetPageTimer: ReturnType<typeof setTimeout> | null = null
watch([
  () => clusterStore.faultFilterMode,
  () => clusterStore.selectedBlocksForFault,
  () => clusterStore.selectedClustersForFault
], () => {
  // 防抖处理，避免快速连续的筛选条件变化
  if (resetPageTimer) {
    clearTimeout(resetPageTimer)
  }
  resetPageTimer = setTimeout(() => {
    first.value = 0
    resetPageTimer = null
  }, 50) // 减少到50ms防抖，提升响应速度
}, {
  deep: false, // 不进行深度监听，提升性能
  flush: 'post' // 在DOM更新后执行，避免阻塞渲染
})

/* ---------- 筛选操作方法 ---------- */
function setFilterMode(mode: 'all' | 'block' | 'cluster') {
  clusterStore.setFaultFilterMode(mode)
}

</script>
<template>
  <div class="card">
    <div class="fault-page">
      <!--  筛选控制面板 -->
      <Panel header="故障筛选与统计"
             :class="['filter-panel', 'mb-2', { 'filter-panel-compact': clusterStore.faultFilterMode === 'all' }]"
             :toggleable="false">
        <div class="filter-content">
        <!-- 筛选模式选择 -->
        <div class="filter-section mb-2">
          <div class="flex items-center justify-between">
            <div class="filter-buttons flex gap-2">
              <Button
                label="全部故障"
                :severity="clusterStore.faultFilterMode === 'all' ? 'primary' : 'secondary'"
                :outlined="clusterStore.faultFilterMode !== 'all'"
                @click="setFilterMode('all')"
                class="filter-button-small"
              />
              <Button
                label="按堆筛选"
                :severity="clusterStore.faultFilterMode === 'block' ? 'primary' : 'secondary'"
                :outlined="clusterStore.faultFilterMode !== 'block'"
                @click="setFilterMode('block')"
                class="filter-button-small"
              />
              <Button
                label="按簇筛选"
                :severity="clusterStore.faultFilterMode === 'cluster' ? 'primary' : 'secondary'"
                :outlined="clusterStore.faultFilterMode !== 'cluster'"
                @click="setFilterMode('cluster')"
                class="filter-button-small"
              />
            </div>
            <!-- 故障统计信息 -->
            <div class="fault-count-badge">
              <i class="pi pi-info-circle mr-1"></i>
              <span>当前共 {{ total }} 条故障</span>
            </div>
          </div>
        </div>

        <!-- 筛选选项 -->
        <div class="filter-options" v-if="clusterStore.faultFilterMode !== 'all'">
          <!-- 堆筛选 -->
          <MultiSelect
            v-if="clusterStore.faultFilterMode === 'block'"
            v-model="clusterStore.selectedBlocksForFault"
            :options="clusterStore.availableBlocks"
            optionLabel="label"
            optionValue="value"
            placeholder="请选择要查看的堆"
            class="filter-multiselect-compact"
          />

          <!-- 簇筛选 -->
          <MultiSelect
            v-if="clusterStore.faultFilterMode === 'cluster'"
            v-model="clusterStore.selectedClustersForFault"
            :options="clusterStore.availableFaultClusters"
            optionLabel="label"
            optionValue="value"
            placeholder="请选择要查看的簇"
            class="filter-multiselect-compact"
          />
        </div>


      </div>
    </Panel>

    <!--  故障数据表格 -->
    <Card class="fault-table-card">
      <template #content>
        <DataTable
          :value="pageRows"
          paginator
          lazy
          :totalRecords="total"
          :rows="rows"
          :rowsPerPageOptions="[30, 100, 200]"
          :first="first"
          @page="onPageChange"
          :dataKey="(item: any) => `${item.cluster}-${item.label}-${item.ts}`"
          class="fault-table"
          :emptyMessage="total === 0 ? '暂无符合条件的故障' : '暂无故障'"
          stripedRows
          responsiveLayout="scroll"
        >
        


        <!-- 序号列 -->
        <Column header="序号" style="width:80px;text-align:center">
          <template #body="{ index }">
            {{ first + index + 1 }}
          </template>
        </Column>
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
      </template>
    </Card>
    </div>
  </div>
</template>

<style scoped>
/* 页面整体布局 */
.fault-page {
  padding: 3px;
}

/* 筛选面板样式 */
.filter-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.filter-content {
  padding: 4px 0;
}

.filter-section {
  margin-bottom: 0;
}

.filter-label {
  min-width: 80px;
  color: #374151;
  font-size: 14px;
}

.filter-buttons {
  gap: 6px;
}

.filter-button-small {
  padding: 4px 10px !important;
  font-size: 12px !important;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-weight: 500;
  height: 28px;
}

.filter-button-small:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/*  故障统计徽章样式 */
.fault-count-badge {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #7e91b3;
  color: #698ea2;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 16px;
  margin-left: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(14, 165, 233, 0.1);
  transition: all 0.2s ease;
}

.fault-count-badge:hover {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(14, 165, 233, 0.15);
}

.filter-options {
  border-top: 1px solid #f3f4f6;
  padding-top: 6px;
  margin-bottom: 4px;
}

.filter-multiselect-compact {
  width: 200px;
  height: 28px;
}



/*  全部故障模式的紧凑样式 */
.filter-panel-compact :deep(.p-panel-content) {
  padding: 8px 20px !important;
}

/*  表格卡片样式 */
.fault-table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.fault-table {
  border-radius: 0;
}

/*  深度样式优化 */
:deep(.p-panel-header) {
  background: #007ad9;
  color: white;
  border-radius: 12px 12px 0 0;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 14px;
}

:deep(.p-panel-content) {
  padding: 12px 20px;
  border-radius: 0 0 12px 12px;
}

:deep(.p-card-content) {
  padding: 0;
}

:deep(.p-datatable) {
  border: none;
  border-radius: 0;
}

:deep(.p-datatable-header) {
  display: none; /* 隐藏原有的header，使用我们自定义的筛选面板 */
}

:deep(.p-datatable-thead > tr > th) {
  background: #f8fafc;
  border-bottom: 2px solid #e5e7eb;
  color: #374151;
  font-weight: 600;
  font-size: 12px;
  padding: 8px 6px;
}

:deep(.p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

:deep(.p-datatable-tbody > tr:hover) {
  background: #f0f9ff !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:deep(.p-datatable-tbody > tr > td) {
  padding: 6px 6px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  line-height: 1.4;
}

/* 确保最后一行也有边框 */
:deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: 2px solid #e5e7eb;
}

:deep(.p-paginator) {
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  border-radius: 0;
  padding: 12px 16px;
}

/*  多选框样式优化 */
:deep(.filter-multiselect-compact.p-multiselect) {
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  transition: all 0.2s ease;
  height: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
}

:deep(.filter-multiselect-compact.p-multiselect .p-multiselect-label) {
  padding: 0 6px;
  line-height: 28px;
  font-size: 12px;
  display: flex;
  align-items: center;
  height: 100%;
}

:deep(.filter-multiselect-compact.p-multiselect .p-multiselect-trigger) {
  height: 100%;
  display: flex;
  align-items: center;
}

:deep(.filter-multiselect-compact.p-multiselect:hover) {
  border-color: #9ca3af;
}

:deep(.filter-multiselect-compact.p-multiselect.p-focus) {
  border-color: #007ad9;
  box-shadow: 0 0 0 2px rgba(0, 122, 217, 0.1);
}

:deep(.p-multiselect-panel) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/*  下拉面板内选项样式优化 */
:deep(.p-multiselect-header) {
  padding: 6px 8px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 11px;
}

:deep(.p-multiselect-items) {
  padding: 4px 0;
}

:deep(.p-multiselect-item) {
  padding: 4px 8px;
  margin: 0 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 11px;
  line-height: 1.3;
}

:deep(.p-multiselect-item:hover) {
  background: #f3f4f6;
}

:deep(.p-multiselect-item.p-highlight) {
  background: #dbeafe;
  color: #1d4ed8;
}



/*  标签样式优化 */
:deep(.p-tag) {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

/*  响应式优化 */
@media (max-width: 768px) {
  .fault-page {
    padding: 8px;
  }

  .filter-content {
    padding: 12px 0;
  }

  .filter-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .filter-buttons {
    flex-wrap: wrap;
  }
}
</style>
