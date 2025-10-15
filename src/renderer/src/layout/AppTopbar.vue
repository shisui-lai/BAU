<script setup>
import { computed } from 'vue'
import { useLayout } from '@/layout/composables/layout'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockStore } from '@/stores/device/blockStore'
import { useDataReceptionStore } from '@/stores/communication/dataReceptionStore'
import { useMqttStore } from '@/stores/communication/mqttStore'
import  Dropdown  from 'primevue/dropdown'
import  MultiSelect  from 'primevue/multiselect'

const { onMenuToggle, onTopBarMenuButton } = useLayout()

// 获取簇选择store
const clusterStore = useClusterStore()

// 获取堆选择store
const blockStore = useBlockStore()

// 【数据接收监控】获取数据接收监控store
// 功能：监控MQTT数据接收状态，提供5秒超时检测和智能配置读取
const dataReceptionStore = useDataReceptionStore()

// 获取MQTT连接store
const mqttStore = useMqttStore()

// 版本信息
const version = 'test-v0.2.0 10.15'



// 【合并显示】合并状态和速率的计算属性
const combinedDisplayText = computed(() => {
  if (!mqttStore.isConnected) {
    return '未连接 | 0 KB/s'
  }
  return dataReceptionStore.combinedStatusText
})

const combinedDisplayIcon = computed(() => {
  if (!mqttStore.isConnected) {
    return 'pi pi-circle-fill'
  }
  return dataReceptionStore.combinedStatusIcon
})

const combinedDisplayClass = computed(() => {
  if (!mqttStore.isConnected) {
    return 'combined-status-disconnected'
  }
  return dataReceptionStore.combinedStatusClass
})


</script>

<template>
  <div class="layout-topbar">
    <!-- 左侧按钮及 logo 部分 -->
    <div class="left-section">
      <button class="p-link layout-menu-button layout-topbar-button" @click="onMenuToggle()">
        <i class="pi pi-bars"></i>
      </button>
      
      <!-- 簇选择器区域 - 根据页面类型显示 -->
      <div class="cluster-selector-area" v-if="clusterStore.showClusterSelector">
        <!-- 查看簇单选下拉 -->
        <div class="cluster-view-selector">
          <Dropdown
            v-model="clusterStore.selectedClusterForView"
            :options="clusterStore.availableClusters"
            optionLabel="label"
            optionValue="value"
            placeholder="选择查看簇"
            class="cluster-view-dropdown"
            :disabled="clusterStore.availableClusters.length === 0"
          />
        </div>
        
        <!-- 批量下发多选框 -->
        <div class="cluster-write-selector" v-if="clusterStore.showWriteSelector">
          <MultiSelect
            v-model="clusterStore.selectedClustersForWrite"
            :options="clusterStore.availableClusters"
            optionLabel="label"
            optionValue="value"
            placeholder="选择下发目标"
            class="cluster-write-multiselect"
            :disabled="clusterStore.availableClusters.length === 0"
            :selectedItemsLabel="`{0} items selected`"
            :maxSelectedLabels="0"
          />
        </div>
      </div>
      
      <!-- 堆选择器区域 - 根据页面类型显示 -->
      <div class="block-selector-area" v-if="blockStore.showBlockSelector">
        <!-- 查看堆单选下拉 -->
        <div class="block-view-selector">
          <Dropdown
            v-model="blockStore.selectedBlockForView"
            :options="blockStore.availableBlocks"
            optionLabel="label"
            optionValue="value"
            placeholder="选择查看堆"
            class="block-view-dropdown"
            :disabled="blockStore.availableBlocks.length === 0"
          />
        </div>
        
        <!-- 批量下发多选框 -->
        <div class="block-write-selector" v-if="blockStore.showWriteSelector">
          <MultiSelect
            v-model="blockStore.selectedBlocksForWrite"
            :options="blockStore.availableBlocks"
            optionLabel="label"
            optionValue="value"
            placeholder="选择下发目标"
            class="block-write-multiselect"
            :disabled="blockStore.availableBlocks.length === 0"
            :selectedItemsLabel="`{0} items selected`"
            :maxSelectedLabels="0"
          />
        </div>
      </div>
    </div>

    <!-- 右侧：请求/接收帧、其它信息及菜单按钮 -->
    <div class="right-section">
      <!-- 版本信息 -->
      <div class="version-info">
        <i>{{ version }}</i>
      </div>

      <!-- 【合并显示】通信状态和数据速率 -->
      <div
        class="combined-status-indicator"
        :class="combinedDisplayClass"
      >
        <i :class="combinedDisplayIcon"></i>
        <span class="combined-status-text">{{ combinedDisplayText }}</span>
      </div>

      <!-- 菜单按钮 -->
      <button
        class="p-link layout-topbar-menu-button layout-topbar-button"
        @click="onTopBarMenuButton()"
      >
        <i class="pi pi-ellipsis-v"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 整体顶部导航栏 */
.layout-topbar {
  position: fixed;
  height: 3.5rem;
  z-index: 997;
  left: 0;
  top: 0;
  width: 100%;
  padding: 0 0.4rem;
  background-color: var(--surface-card);
  transition: left 0.2s;
  display: flex;
  align-items: center;
  box-shadow:
    0px 3px 5px rgba(0, 0, 0, 0.02),
    0px 0px 2px rgba(0, 0, 0, 0.05),
    0px 1px 4px rgba(0, 0, 0, 0.08);
}

/* 左侧区域：菜单按钮和选择器 */
.left-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
}

/* 右侧区域：统计、菜单按钮和版本号 */
.right-section {
  display: flex;
  align-items: center;
}

/* 簇选择器区域 */
.cluster-selector-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

/* 堆选择器区域 */
.block-selector-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

/* 查看簇选择器 */
.cluster-view-selector {
  display: flex;
  align-items: center;
}

.cluster-view-dropdown {
  width: 10rem;
  font-size: 1rem;
}

/* 查看堆选择器 */
.block-view-selector {
  display: flex;
  align-items: center;
}

.block-view-dropdown {
  width: 10rem;
  font-size: 1rem;
}

/* 下发目标选择器 */
.cluster-write-selector {
  display: flex;
  align-items: center;
}

.cluster-write-multiselect {
  width: 12rem;
  font-size: 1rem;
}

/* 堆下发目标选择器 */
.block-write-selector {
  display: flex;
  align-items: center;
}

.block-write-multiselect {
  width: 10rem;
  font-size: 1rem;
}

/* 菜单按钮样式 - 参考modbus设计 */
.layout-menu-button {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  margin-left: 0rem;
}

.layout-topbar-menu-button {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
}

.layout-topbar-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  position: relative;
  left: 0rem;
  color: var(--text-color-secondary);
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
}

.layout-topbar-button:enabled:hover {
  color: var(--text-color);
  background-color: var(--surface-hover);
}

.layout-topbar-button:focus {
  outline: 0 none;
  outline-offset: 0;
  box-shadow: var(--focus-ring);
}

.layout-topbar-button i {
  font-size: 1.5rem;
}

.layout-topbar-button .layout-topbar-button-text {
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.5px;
  line-height: 1;
  margin-top: 0.25rem;
}

/* 版本信息 */
.version-info {
  font-size: 0.9rem;
  color: var(--text-color);
  margin-left: 0.5rem;
}

/* 下拉选择器和多选框样式 - 参考modbus设计 */
:deep(.p-dropdown),
:deep(.p-multiselect) {
  font-size: 1rem;
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

/* 数据接收状态指示器 */
.data-reception-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  user-select: none;
  margin-right: 0.5rem;
}





/* 【合并显示】通信状态和数据速率合并指示器 - 融入导航栏 */
.combined-status-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem; /* 比版本号小一个字号 */
  margin-left: 0.5rem;
  min-width: 120px; /* 固定宽度，容纳合并文本 */
}

.combined-status-text {
  font-family: 'Courier New', monospace; /* 使用等宽字体 */
  color: var(--text-color); /* 使用主题文字颜色 */
  font-weight: 500;
}

/* 正常状态（绿色圆圈） */
.combined-status-normal i {
  color: rgb(34, 197, 94); /* 绿色圆圈 */
}

/* 超时状态（红色圆圈） */
.combined-status-timeout i {
  color: rgb(239, 68, 68); /* 红色圆圈 */
}

/* 未连接状态（灰色圆圈） */
.combined-status-unknown i,
.combined-status-disconnected i {
  color: var(--text-color-secondary); /* 使用主题次要文字颜色 */
}

/* 响应式设计 */
@media (max-width: 768px) {
  .data-reception-indicator {
    padding: 0.375rem 0.5rem;
    font-size: 0.8rem;
  }



  .combined-status-indicator {
    padding: 0.2rem 0.4rem;
    font-size: 0.7rem;
    min-width: 100px; /* 小屏幕时的固定宽度 */
  }

  .combined-status-text {
    display: none; /* 小屏幕只显示图标 */
  }
}
</style>
