<script setup>
import { computed } from 'vue'
import { useDiDoStatus } from '@/composables/core/data-processing/cluster/useDiDoStatus'

// 使用composable获取数据
const { groupedDiDoStatus } = useDiDoStatus()

/**
 * 获取状态样式类
 * @param {number} value - 状态值 (0 或 1)
 * @returns {string} CSS类名
 */
const getStatusClass = (value) => {
  return value === 1 ? 'status-active' : 'status-inactive'
}

/**
 * 获取分类显示名称
 * 根据数据分类key返回友好的中文显示名称
 */
const getCategoryTitle = (category) => {
  const titleMap = {
    diSignal: 'DI信号状态',
    doDriveFeedback: 'DO反馈状态',
    rtData: 'RT数据状态'
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
        <span>暂无数据，请检查设备连接</span>
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
            <Column field="label" header="信号名称">
              <template #body="{ data }">{{ data.label }}</template>
            </Column>

            <!-- 状态/温度值列 -->
            <Column field="value" header="状态/值" sortable>
              <template #body="{ data }">
                <span v-if="category === 'rtData'">{{ data.value }}</span>
                <span v-else :class="getStatusClass(data.value)" class="status-badge">{{ data.value }}</span>
              </template>
            </Column>

            <!-- 空数据提示 -->
            <template #empty>
              <div class="p-4 text-center text-gray-500">该类别暂无数据</div>
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
}

.status-inactive {
  background-color: #6b7280;
  color: white;
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

