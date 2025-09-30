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
         removeAllListeners: (channel: string, callback: (...args: any[]) => void) => void;
      };
    };
  }
}

// 使用 clusterStore 管理筛选状态
const clusterStore = useClusterStore()

/* ---------- 分页状态 ---------- */
const first = ref(0)      // 当前偏移量
const rows = ref(30)     // 每页条数

/* ---------- 手动排序状态 ---------- */
const sortOrder = ref<'none' | 'asc' | 'desc'>('none') // none: 无排序, asc: 轻微到严重, desc: 严重到轻微

/* ---------- MQTT 监听 ---------- */
const FAULT_CHANNELS = [
  //协议修改删除 - HARDWARE_FAULT不再使用，改为TOTAL_FAULT中的接触器详细故障
  // 'HARDWARE_FAULT',
  'TOTAL_FAULT',
  'OUTPUT_FAULT_MAP',
  'SAVED_FAULT_MAP',
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
  'BLOCK_TOTAL_FAULT',
  'BLOCK_ANALOG_FAULT_GRADE',
  // 簇通讯失联频道
  'BLOCK_COMM_LOST',
  // 掉线信息频道
  'BROKENWIRE'
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
    // 🚀 修复：使用正确的API清理监听器
    FAULT_CHANNELS.forEach(ch => {
      try {
        window.electron.ipcRenderer.removeAllListeners(ch, onFaultMsg)
      } catch (error) {
        console.warn(`清理监听器失败: ${ch}`, error)
      }
    })
    attached = false
    console.log('[debug] Fault listeners removed')
  }
})

/* ---------- 筛选数据计算 ---------- */
const filteredFaults = computed(() => {
  let faults = clusterStore.filterFaultData(sortedAllFaults.value)

  // 手动排序：根据故障等级排序
  if (sortOrder.value !== 'none') {
    const severityOrder: Record<string, number> = { 'severe': 3, 'medium': 2, 'mild': 1, 'none': 0 }

    faults = [...faults].sort((a, b) => {
      const aLevel = severityOrder[a.levelTag] ?? 0
      const bLevel = severityOrder[b.levelTag] ?? 0

      if (sortOrder.value === 'desc') {
        return bLevel - aLevel // 严重到轻微
      } else {
        return aLevel - bLevel // 轻微到严重
      }
    })
  }

  return faults
})

/* ---------- 分页计算 ---------- */
const total = computed(() => filteredFaults.value.length)

const pageRows = computed(() => {
  const faults = filteredFaults.value
  const start = first.value
  const end = Math.min(start + rows.value, faults.length)
  return faults.slice(start, end)
})

function onPageChange(e: any) {
  first.value = e.first
  rows.value = e.rows
}

/* ---------- 故障等级颜色映射 ---------- */
function getSeverityColor(levelTag: string): string {
  const severityColorMap: Record<string, string> = {
    'severe': 'danger',
    'medium': 'warning',
    'mild': 'info',
    'none': 'secondary'
  }
  return severityColorMap[levelTag] || 'secondary'
}

/* ---------- 手动排序函数 ---------- */
function toggleSort() {
  // 循环切换排序状态：无排序 → 严重到轻微 → 轻微到严重 → 无排序
  if (sortOrder.value === 'none') {
    sortOrder.value = 'desc' // 严重到轻微
  } else if (sortOrder.value === 'desc') {
    sortOrder.value = 'asc'  // 轻微到严重
  } else {
    sortOrder.value = 'none' // 无排序
  }
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
      <!--  统一的故障数据表格 -->
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
        class="fault-table-unified"
        :emptyMessage="total === 0 ? '暂无符合条件的故障' : '暂无故障'"
        stripedRows
        responsiveLayout="scroll"
      >
        <!-- 统一的表格头部 - 包含筛选功能 -->
        <template #header>
          <div class="unified-header">
            <!-- 蓝色标题区域 -->
            <div class="header-title-blue">
              <h3 class="title-text">故障筛选与统计</h3>
            </div>

            <!-- 白色筛选控制区域 -->
            <div class="filter-content-white">
              <!-- 单行布局：按钮 + 下拉框 + 统计 -->
              <div class="flex align-items-center justify-content-start gap-5">
                <!-- 左侧：筛选按钮和下拉框组合 -->
                <div class="flex align-items-center gap-3 mr-auto">
                  <div class="flex gap-2">
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

                  <!-- 紧跟按钮的下拉框 -->
                  <div class="flex-shrink-0" v-if="clusterStore.faultFilterMode !== 'all'">
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

                <!-- 右侧：故障统计信息 -->
                <div class="fault-count-badge">
                  <i class="pi pi-info-circle mr-1"></i>
                  <span>当前共 {{ total }} 条故障</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        


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
      <Column header="Cell" style="width:100px;text-align:center">
        <template #body="{ data }">
          {{ data.cell === null || data.cell === 0 ? '-' : data.cell }}
        </template>
      </Column>
      <Column header="全局序号" style="width:120px;text-align:center">
        <template #body="{ data }">
          {{
            data.globalTemp !== null && data.globalTemp !== 0 ? data.globalTemp :
            data.globalCell !== null && data.globalCell !== 0 ? data.globalCell :
            '-'
          }}
        </template>
      </Column>
      <Column style="width:120px;text-align:center">
        <template #header>
          <div class="flex align-items-center justify-content-center gap-1 cursor-pointer" @click="toggleSort">
            <span>故障等级</span>
            <i
              :class="{
                'pi pi-sort': sortOrder === 'none',
                'pi pi-sort-amount-down': sortOrder === 'desc',
                'pi pi-sort-amount-up': sortOrder === 'asc'
              }"
              class="text-sm"
            ></i>
          </div>
        </template>
        <template #body="{ data }">
          <Tag
            :value="data.levelTxt"
            :severity="getSeverityColor(data.levelTag)"
          />
        </template>
      </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
/* 页面整体布局 */
.fault-page {
  padding: 3px;
}

/* 统一表格样式 */
.fault-table-unified {
  background: var(--surface-card);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--surface-border);
  overflow: hidden;
}

/* 统一头部样式 */
.unified-header {
  overflow: hidden;
}

/* 蓝色标题区域 */
.header-title-blue {
  background: var(--primary-color);
  color: var(--primary-color-text);
  padding: 14px 20px;
  margin: 0;
}

.title-text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color-text);
}

/* 白色筛选区域 */
.filter-content-white {
  background: var(--surface-card);
  padding: 8px 20px;
  border-bottom: 1px solid var(--surface-border);
}

/* 单行布局 */

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
  background: linear-gradient(135deg, var(--blue-50) 0%, var(--blue-100) 100%);
  border: 1px solid var(--blue-500);
  color: var(--blue-700);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 16px;
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

/* 下拉框区域 */
.filter-dropdown {
  flex-shrink: 0;
}

.filter-multiselect-compact {
  width: 180px;
  height: 28px;
}



/*  深度样式优化 */
:deep(.fault-table-unified) {
  border: none;
  border-radius: 12px;
}

:deep(.fault-table-unified .p-datatable-header) {
  background: transparent;
  border: none;
  border-radius: 12px 12px 0 0;
  padding: 0;
}

/* 确保蓝色标题区域的圆角 */
.header-title-blue {
  border-radius: 12px 12px 0 0;
}

:deep(.fault-table-unified .p-datatable-wrapper) {
  border-radius: 0 0 12px 12px;
}

:deep(.p-datatable-thead > tr > th) {
  background: var(--surface-section);
  border-bottom: 2px solid var(--surface-border);
  color: var(--text-color);
  font-weight: 600;
  font-size: 12px;
  padding: 6px 6px;
}

:deep(.p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

:deep(.p-datatable-tbody > tr:hover) {
  background: var(--surface-hover) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:deep(.p-datatable-tbody > tr > td) {
  padding: 6px 6px;
  border-bottom: 1px solid var(--surface-border);
  font-size: 12px;
  line-height: 1.4;
}

/* 确保最后一行也有边框 */
:deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: 2px solid var(--surface-border);

/* 手动排序按钮样式 */
.cursor-pointer {
  cursor: pointer;
  user-select: none;
}

.cursor-pointer:hover {
  background-color: var(--surface-hover);
  border-radius: 4px;
  padding: 2px 4px;
}
}

:deep(.p-paginator) {
  background: var(--surface-section);
  border-top: 1px solid var(--surface-border);
  border-radius: 0;
  padding: 12px 16px;
}

/*  多选框样式优化 */
:deep(.filter-multiselect-compact.p-multiselect) {
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--surface-border);
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
  border-color: var(--surface-400);
}

:deep(.filter-multiselect-compact.p-multiselect.p-focus) {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
}

:deep(.p-multiselect-panel) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/*  下拉面板内选项样式优化 */
:deep(.p-multiselect-header) {
  padding: 6px 8px;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-section);
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
  background: var(--surface-hover);
}

:deep(.p-multiselect-item.p-highlight) {
  background: var(--blue-100);
  color: var(--blue-700);
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



  .filter-buttons {
    flex-wrap: wrap;
  }
}
</style>
