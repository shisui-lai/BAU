<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDiDoStatus } from '@/composables/core/data-processing/cluster/useDiDoStatus'

const { t } = useI18n()

// 温度标签翻译
const temperatureLabels = computed(() => ({
  bcuTemp: t('didoStatus.temperatureLabels.bcuTemp'),
  bPlusTemp: t('didoStatus.temperatureLabels.bPlusTemp'),
  bMinusTemp: t('didoStatus.temperatureLabels.bMinusTemp'),
  pPlusTemp: t('didoStatus.temperatureLabels.pPlusTemp'),
  pMinusTemp: t('didoStatus.temperatureLabels.pMinusTemp'),
  fuse1Temp: t('didoStatus.temperatureLabels.fuse1Temp'),
  fuse2Temp: t('didoStatus.temperatureLabels.fuse2Temp')
}))

// 信号名称翻译
const signalNames = computed(() => ({
  '主正接触器反馈': t('didoStatus.signalNames.主正接触器反馈'),
  '主负接触器反馈': t('didoStatus.signalNames.主负接触器反馈'),
  '预充接触器反馈': t('didoStatus.signalNames.预充接触器反馈'),
  '隔离开关反馈': t('didoStatus.signalNames.隔离开关反馈'),
  '断路器反馈': t('didoStatus.signalNames.断路器反馈'),
  '风扇反馈': t('didoStatus.signalNames.风扇反馈'),
  '直流供电KM反馈': t('didoStatus.signalNames.直流供电KM反馈'),
  '门禁反馈': t('didoStatus.signalNames.门禁反馈'),
  'SPD反馈': t('didoStatus.signalNames.SPD反馈'),
  '交流电压反馈': t('didoStatus.signalNames.交流电压反馈'),
  '烟感反馈': t('didoStatus.signalNames.烟感反馈'),
  '消防反馈': t('didoStatus.signalNames.消防反馈'),
  '温感反馈': t('didoStatus.signalNames.温感反馈'),
  '排风系统反馈': t('didoStatus.signalNames.排风系统反馈'),
  '辅助断路器反馈': t('didoStatus.signalNames.辅助断路器反馈'),
  '氢气探测器反馈': t('didoStatus.signalNames.氢气探测器反馈'),
  'MSD反馈': t('didoStatus.signalNames.MSD反馈'),
  '急停反馈': t('didoStatus.signalNames.急停反馈'),
  '柜体风机反馈': t('didoStatus.signalNames.柜体风机反馈'),
  '主正接触器高边驱动反馈': t('didoStatus.signalNames.主正接触器高边驱动反馈'),
  '主负接触器高边驱动反馈': t('didoStatus.signalNames.主负接触器高边驱动反馈'),
  '预充接触器高边驱动反馈': t('didoStatus.signalNames.预充接触器高边驱动反馈'),
  '绿灯高边驱动反馈': t('didoStatus.signalNames.绿灯高边驱动反馈'),
  '黄灯高边驱动反馈': t('didoStatus.signalNames.黄灯高边驱动反馈'),
  '红灯高边驱动反馈': t('didoStatus.signalNames.红灯高边驱动反馈'),
  '风扇高边驱动反馈': t('didoStatus.signalNames.风扇高边驱动反馈'),
  '主断分励脱扣高边驱动反馈故障': t('didoStatus.signalNames.主断分励脱扣高边驱动反馈故障'),
  '直流供电KM高边驱动反馈': t('didoStatus.signalNames.直流供电KM高边驱动反馈'),
  'pcs封波高边驱动反馈': t('didoStatus.signalNames.pcs封波高边驱动反馈'),
  '辅助断路器高边驱动反馈': t('didoStatus.signalNames.辅助断路器高边驱动反馈'),
  '排风系统高边驱动反馈': t('didoStatus.signalNames.排风系统高边驱动反馈'),
  '柜体风机高边驱动反馈': t('didoStatus.signalNames.柜体风机高边驱动反馈')
}))

// 使用composable获取数据
const { groupedDiDoStatus } = useDiDoStatus(temperatureLabels, signalNames)

/**
 * 获取状态样式类
 * @param {any} value - 状态值 (0, 1, true, false)
 * @returns {string} CSS类名
 */
const getStatusClass = (value) => {
  // 统一处理布尔值和数字值
  const isActive = value === 1 || value === true || value === '1' || value === 'true'
  return isActive ? 'status-active' : 'status-inactive'
}

/**
 * 格式化状态值显示
 * @param {any} value - 原始状态值
 * @returns {string} 格式化后的显示值
 */
const formatStatusValue = (value) => {
  // 统一将true/false转换为1/0显示
  if (value === true || value === 'true') return '1'
  if (value === false || value === 'false') return '0'
  return String(value)
}

/**
 * 获取分类显示名称
 * 根据数据分类key返回友好的显示名称
 */
const getCategoryTitle = (category) => {
  const titleMap = {
    diSignal: t('didoStatus.categories.diSignal'),
    doDriveFeedback: t('didoStatus.categories.doDriveFeedback'),
    rtData: t('didoStatus.categories.rtData')
  }
  return titleMap[category] || category
}

/**
 * 判断是否有数据
 */
const hasData = computed(() => {
  return Object.keys(groupedDiDoStatus.value).length > 0
})
</script>

<template>
  <div class="dido-status-container">
    <div class="card">
      
      <!-- 无数据提示 -->
      <div v-if="!hasData" class="no-data-message">
        <i class="pi pi-info-circle"></i>
        <span>{{ t('didoStatus.noDataMessage') }}</span>
      </div>

      <!-- 数据表格容器 -->
      <div v-else class="dido-tables-container">
        <div
          v-for="(signals, category) in groupedDiDoStatus"
          :key="category"
          class="dido-table-section"
        >
          <DataTable 
            :value="signals" 
            showGridlines 
            class="centered-table"
          >
            <!-- 表格标题 -->
            <template #header>
              <div class="table-header">
                <span class="table-title">{{ getCategoryTitle(category) }}</span>
              </div>
            </template>

            <!-- 信号名称列 -->
            <Column field="label" :header="t('didoStatus.signalName')">
              <template #body="{ data }">{{ data.label }}</template>
            </Column>

            <!-- 状态/温度值列 -->
            <Column field="value" :header="t('didoStatus.statusValue')" sortable>
              <template #body="{ data }">
                <span v-if="category === 'rtData'">{{ data.value }}</span>
                <span v-else :class="getStatusClass(data.value)" class="status-badge">{{ formatStatusValue(data.value) }}</span>
              </template>
            </Column>

            <!-- 空数据提示 -->
            <template #empty>
              <div class="p-4 text-center text-gray-500">{{ t('didoStatus.noDataForCategory') }}</div>
            </template>
          </DataTable>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dido-status-container {
  width: 100%;
  height: auto;
}

.card {
  h5 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
  }
}

/* 无数据提示 */
.no-data-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--text-color-secondary);
  font-size: 1rem;

  i {
    margin-right: 0.5rem;
    font-size: 1.5rem;
  }
}

/* 表格容器 - 网格布局 */
.dido-tables-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.dido-table-section {
  margin-bottom: 0;
}

/* 表格标题 */
.table-header {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;

  .table-title {
    font-weight: 600;
    font-size: 1rem;
    color: var(--primary-color);
  }
}

/* 状态徽章样式 */
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.status-active {
  background-color: #10b981;
  color: white;
  border: 1px solid #059669;
}

.status-inactive {
  background-color: #6b7280;
  color: white;
  border: 1px solid #4b5563;
}

/* 温度值样式 */
.temperature-value {
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.95rem;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dido-tables-container {
    grid-template-columns: 1fr;
  }
}

/* 大屏保持3列 */
@media (min-width: 1400px) {
  .dido-tables-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 表格内部样式优化 */
:deep(.p-datatable) {
  .p-datatable-thead > tr > th {
    background-color: var(--surface-section);
    color: var(--text-color);
    font-weight: 600;
  }

  /* 默认左对齐，与modbus一致 */

  .p-column-title { white-space: nowrap; }
}

/* 去除表格内部滚动，使用外层布局自适应 */
:deep(.p-datatable-wrapper) {
  overflow: visible;
}
</style>

