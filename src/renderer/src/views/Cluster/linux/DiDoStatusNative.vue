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
          <!-- 表格标题 -->
          <div class="table-header">
            <span class="table-title">{{ getCategoryTitle(category) }}</span>
          </div>

          <!-- 原生HTML表格 -->
          <table class="native-table">
            <thead>
              <tr>
                <th>{{ t('didoStatus.signalName') }}</th>
                <th>{{ t('didoStatus.statusValue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(signal, index) in signals" :key="index">
                <td>{{ signal.label }}</td>
                <td>
                  <span v-if="category === 'rtData'" class="temperature-value">
                    {{ signal.value }}
                  </span>
                  <span 
                    v-else 
                    :class="getStatusClass(signal.value)" 
                    class="status-badge"
                  >
                    {{ formatStatusValue(signal.value) }}
                  </span>
                </td>
              </tr>
              <!-- 空数据提示 -->
              <tr v-if="!signals || signals.length === 0">
                <td colspan="2" class="empty-message">
                  {{ t('didoStatus.noDataForCategory') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dido-status-container {
  width: 100%;
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

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

/* 表格标题 */
.table-header {
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;

  .table-title {
    font-weight: 600;
    font-size: 1rem;
    color: var(--primary-color);
  }
}

/* 原生HTML表格样式 */
.native-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  overflow: hidden;

  thead th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-color);
    background-color: var(--surface-section);
    border-bottom: 1px solid var(--surface-border);
    font-size: 0.95rem;
  }

  tbody tr {
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--surface-hover);
    }

    &:not(:last-child) td {
      border-bottom: 1px solid var(--surface-border);
    }

    td {
      padding: 0.75rem 1rem;
      color: var(--text-color);
      font-size: 0.9rem;

      &.empty-message {
        text-align: center;
        color: var(--text-color-secondary);
        padding: 2rem 1rem;
      }
    }
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
</style>

