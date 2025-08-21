<script setup>
import { useLayout } from '@/layout/composables/layout'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockStore } from '@/stores/device/blockStore'
import  Dropdown  from 'primevue/dropdown'
import  MultiSelect  from 'primevue/multiselect'

const { onMenuToggle, onTopBarMenuButton } = useLayout()

// 获取簇选择store
const clusterStore = useClusterStore()

// 获取堆选择store
const blockStore = useBlockStore()

// 版本信息
const version = 'v1.0.0'
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
      <button
        class="p-link layout-topbar-menu-button layout-topbar-button"
        @click="onTopBarMenuButton()"
      >
        <i class="pi pi-ellipsis-v"></i>
      </button>
      <div class="version-info">
        <i>{{ version }}</i>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 整体顶部导航栏 */
.layout-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  min-height: 4rem;
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
  gap: 0.75rem;
  padding: 0.5rem 0;
}

/* 堆选择器区域 */
.block-selector-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

/* 查看簇选择器 */
.cluster-view-selector {
  display: flex;
  align-items: center;
}

.cluster-view-dropdown {
  width: 10rem;
  font-size: 0.875rem;
}

/* 查看堆选择器 */
.block-view-selector {
  display: flex;
  align-items: center;
}

.block-view-dropdown {
  width: 10rem;
  font-size: 0.875rem;
}

/* 下发目标选择器 */
.cluster-write-selector {
  display: flex;
  align-items: center;
}

.cluster-write-multiselect {
  width: 12rem;
  font-size: 0.875rem;
}

/* 堆下发目标选择器 */
.block-write-selector {
  display: flex;
  align-items: center;
}

.block-write-multiselect {
  width: 10rem;
  font-size: 0.875rem;
}

/* 菜单按钮样式 */
.layout-menu-button {
  display: inline-flex;
  width: 3rem;
  height: 3rem;
}

.layout-topbar-menu-button {
  display: inline-flex;
  width: 3rem;
  height: 3rem;
}

.layout-topbar-button {
  background-color: rgba(255, 255, 255, 0.2);
  color: var(--text-color);
  padding: 0;
  margin: 0;
  min-width: 3rem;
  height: 3rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
}

.layout-topbar-button:enabled:hover {
  background-color: rgba(255, 255, 255, 0.3);
  color: var(--text-color);
}

.layout-topbar-button:focus {
  outline: 0 none;
  outline-offset: 0;
  box-shadow: var(--focus-ring);
}

.layout-topbar-button i {
  font-size: 1.25rem;
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
  font-size: 0.75rem;
  color: #666;
  margin-left: 1rem;
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
