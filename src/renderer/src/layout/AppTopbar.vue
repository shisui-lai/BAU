<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useLayout } from '@/layout/composables/layout'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockStore } from '@/stores/device/blockStore'
import { useDataReceptionStore } from '@/stores/communication/dataReceptionStore'
import { useMqttStore } from '@/stores/communication/mqttStore'
import  Dropdown  from 'primevue/dropdown'
import  MultiSelect  from 'primevue/multiselect'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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





// 【格式化选项】在组件层面处理翻译
const formattedClusterOptions = computed(() => {
  return clusterStore.availableClusters.map(option => ({
    ...option,
    label: t('cluster.blockCluster', [option.block, option.cluster])
  }))
})

const formattedBlockOptions = computed(() => {
  return blockStore.availableBlocks.map(option => ({
    ...option,
    label: `${t('cluster.block')}${option.block}`
  }))
})

// 【合并显示】合并状态和速率的计算属性
const combinedDisplayText = computed(() => {
  if (!mqttStore.isConnected) {
    return `${t('topBar.disconnected')} | 0 ${t('topBar.dataRate')}`
  }
  
  // 在组件层面处理翻译
  const statusMap = {
    'waiting': t('topBar.status.disconnected'),
    'receiving': t('topBar.status.normal'),
    'timeout': t('topBar.status.timeout'),
    'unknown': t('topBar.status.unknown')
  }
  
  const status = statusMap[dataReceptionStore.receptionStatus] || t('topBar.status.unknown')
  return `${status} | ${dataReceptionStore.dataRate} ${t('topBar.dataRate')}`
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

// 多选框选中项标签模板 - 为簇选择器
const clusterSelectedItemsLabel = computed(() => {
  const count = clusterStore.selectedClustersForWrite?.length || 0
  if (count === 0) return ''
  return t('topBar.selectedItems', [count])
})

// 多选框选中项标签模板 - 为堆选择器
const blockSelectedItemsLabel = computed(() => {
  const count = blockStore.selectedBlocksForWrite?.length || 0
  if (count === 0) return ''
  return t('topBar.selectedItems', [count])
})

const storageOptions = computed(() => [
  { label: t('topBar.export.enableSemantic'), value: 'semantic' },
  { label: t('topBar.export.enableRaw'), value: 'raw' }
])
const storageEnabled = ref([])
function sendExportConfig() {
  const semantic = storageEnabled.value.includes('semantic')
  const raw = storageEnabled.value.includes('raw')
  window.electron?.ipcRenderer?.send('set-export-config', { semantic, raw })
}
watch(storageEnabled, () => {
  sendExportConfig()
})
watch(() => mqttStore.isConnected, (val) => {
  if (val) {
    sendExportConfig()
  }
})

// 监听清理事件：磁盘不足时用户选择停止或倒计时结束，统一取消勾选
function handleClearStorageEnabled() {
  storageEnabled.value = []
  sendExportConfig()
}
onMounted(() => {
  window.addEventListener('clear-storage-enabled', handleClearStorageEnabled)
})
onUnmounted(() => {
  window.removeEventListener('clear-storage-enabled', handleClearStorageEnabled)
})


</script>

<template>
  <div class="layout-topbar">
    <!-- 左侧按钮及 logo 部分 -->
    <div class="left-section">
      <button class="p-link layout-menu-button layout-topbar-button" @click="onMenuToggle()">
        <i class="pi pi-bars"></i>
      </button>

      <!-- 首页按钮 -->
      <button class="p-link layout-topbar-button home-button" @click="$router.push('/dashboard')" title="返回首页">
        <i class="pi pi-th-large"></i>
      </button>
      
      <!-- 簇选择器区域 - 根据页面类型显示 -->
      <div class="cluster-selector-area" v-if="clusterStore.showClusterSelector">
        <!-- 查看簇单选下拉 -->
        <div class="cluster-view-selector">
          <Dropdown
            v-model="clusterStore.selectedClusterForView"
            :options="formattedClusterOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('topBar.selectClusterView')"
            class="cluster-view-dropdown"
            :disabled="clusterStore.availableClusters.length === 0"
          />
        </div>
        
        <!-- 批量下发多选框 -->
        <div class="cluster-write-selector" v-if="clusterStore.showWriteSelector">
          <MultiSelect
            v-model="clusterStore.selectedClustersForWrite"
            :options="formattedClusterOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('topBar.selectClusterWrite')"
            class="cluster-write-multiselect"
            :disabled="clusterStore.availableClusters.length === 0"
            :selectedItemsLabel="clusterSelectedItemsLabel"
            :maxSelectedLabels="0"
          />
        </div>
      </div>

      <!-- 存储使能多选框（位于簇选择器与下发选择之后，靠左排布） -->
      <div class="storage-enable-area">
        <MultiSelect
          v-model="storageEnabled"
          :options="storageOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="t('topBar.storageEnable')"
          class="cluster-write-multiselect"
          :maxSelectedLabels="0"
        />
      </div>
      
      <!-- 堆选择器区域 - 根据页面类型显示 -->
      <div class="block-selector-area" v-if="blockStore.showBlockSelector">
        <!-- 查看堆单选下拉 -->
        <div class="block-view-selector">
          <Dropdown
            v-model="blockStore.selectedBlockForView"
            :options="formattedBlockOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('topBar.selectBlockView')"
            class="block-view-dropdown"
            :disabled="blockStore.availableBlocks.length === 0"
          />
        </div>
        
        <!-- 批量下发多选框 -->
        <div class="block-write-selector" v-if="blockStore.showWriteSelector">
          <MultiSelect
            v-model="blockStore.selectedBlocksForWrite"
            :options="formattedBlockOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('topBar.selectBlockWrite')"
            class="block-write-multiselect"
            :disabled="blockStore.availableBlocks.length === 0"
            :selectedItemsLabel="blockSelectedItemsLabel"
            :maxSelectedLabels="0"
          />
        </div>
      </div>
    </div>

    <!-- 右侧：请求/接收帧、其它信息及菜单按钮 -->
    <div class="right-section">
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

/* 首页按钮样式 */
.home-button {
  margin-left: 0.5rem;
}

/* 簇选择器区域 */
.cluster-selector-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  flex-wrap: wrap;
}

/* 堆选择器区域 */
.block-selector-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  flex-wrap: wrap;
}

/* 查看簇选择器 */
.cluster-view-selector {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.cluster-view-dropdown {
  min-width: 8rem;
  width: auto;
  font-size: 1rem;
}

/* 查看堆选择器 */
.block-view-selector {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.block-view-dropdown {
  min-width: 8rem;
  width: auto;
  font-size: 1rem;
}

/* 下发目标选择器 */
.cluster-write-selector {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.cluster-write-multiselect {
  min-width: 10rem;
  width: auto;
  font-size: 1rem;
}

/* 堆下发目标选择器 */
.block-write-selector {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.block-write-multiselect {
  min-width: 8rem;
  width: auto;
  font-size: 1rem;
}

/* 存储使能区域样式（与选择器保持一致间距与对齐） */
.storage-enable-area {
  display: flex;
  align-items: center;
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
  width: 100%;
  min-width: fit-content;
}

/* 确保下拉框和多选框内容自适应 */
:deep(.p-dropdown .p-dropdown-label),
:deep(.p-multiselect .p-multiselect-label) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

  /* 小屏幕时调整选择器最小宽度 */
  .cluster-view-dropdown,
  .block-view-dropdown {
    min-width: 6rem;
  }

  .cluster-write-multiselect,
  .block-write-multiselect {
    min-width: 8rem;
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
