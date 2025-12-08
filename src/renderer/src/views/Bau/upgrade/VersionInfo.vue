<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Dropdown from 'primevue/dropdown'
import { parseBlockVersion, pickBlockVersion } from '@/composables/core/data-processing/block/parseBlockVersion'
import { parseClusterSummary, pickCluster } from '@/composables/core/data-processing/cluster/parseClusterSummary'
import { parsePackSummary, pickPack } from '@/composables/core/data-processing/cluster/parsePackSummary'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'

const { t } = useI18n()

// Store和选择器
const clusterStore = useClusterStore()
const { selectedBlock } = useBlockSelect()

// 格式化版本值的辅助函数
const formatVersionValue = (value, scale = 1) => {
  if (value === null || value === undefined) return '–'

  // 对于字符串类型，直接返回（不要trim，因为版本号可能包含空格）
  if (typeof value === 'string') {
    return value || '–'
  }

  // 对于数字类型，根据scale处理
  if (typeof value === 'number') {
    if (scale === 1) {
      return value.toString()
    } else {
      const decimalPlaces = Math.log10(scale)
      return (value / scale).toFixed(decimalPlaces)
    }
  }

  return String(value) || '–'
}

// BAU版本信息 - 根据当前选择的堆获取
const bauVersionInfo = computed(() => {
  const currentBlock = selectedBlock.value
  if (!currentBlock) {
    return { 'BAU软件版本号': '–' }
  }

  const data = pickBlockVersion(currentBlock, ['版本信息'])

  if (data['版本信息'] && data['版本信息'].length > 0) {
    const dataMap = {}
    data['版本信息'].forEach(item => {
      dataMap[item.label] = formatVersionValue(item.value, item.scale)
    })
    return dataMap
  }

  return { 'BAU软件版本号': '–' }
})

// 簇版本信息选择相关
const selectedClusterForVersion = ref('')

// 可用簇选项 - 显示所有堆簇选项，包含"全部簇"选项
const availableClusterOptions = computed(() => {
  const clusters = clusterStore.availableClusters.map(cluster => ({
    label: cluster.label,
    value: cluster.value
  }))

  return [
    { label: t('deviceUpgrade.version.allClusters', '全部簇'), value: 'all' },  // 全部簇选项
    ...clusters
  ]
})

// 响应式计算选中簇的版本信息 - 使用computed确保响应式更新
const selectedClusterVersions = computed(() => {
  if (!selectedClusterForVersion.value) {
    return null
  }

  const clusterKey = selectedClusterForVersion.value

  // 处理"全部簇"选项
  if (clusterKey === 'all') {
    return getAllClustersVersions()
  }

  // 处理单个簇
  const cluster = clusterStore.availableClusters.find(c => c.value === clusterKey)
  if (!cluster) {
    return null
  }

  return getSingleClusterVersions(clusterKey, cluster)
})

// 获取单个簇版本信息
function getSingleClusterVersions(clusterKey, cluster) {
  // 获取BCU版本信息 - 在computed中调用pickCluster建立响应式依赖
  const clusterData = pickCluster(clusterKey, ['版本信息'])
  let bcuVersion = '–'

  if (clusterData.length > 0) {
    const versionGroup = clusterData[0]
    const bcuSoftwareItem = versionGroup.element.find(item => item.label === 'BCU软件版本号')
    if (bcuSoftwareItem) {
      bcuVersion = formatVersionValue(bcuSoftwareItem.value)
    }
  }

  // 获取BMU版本信息 - 在computed中调用pickPack建立响应式依赖
  const packData = pickPack(clusterKey, ['BMU版本信息'])
  const bmuVersions = []

  if (packData.length > 0) {
    const bmuGroup = packData[0]
    const bmuItems = bmuGroup.element.filter(item =>
      item.label.includes('软件版本') && !item.label.includes('BOOT')
    )

    bmuItems.forEach(item => {
      bmuVersions.push({
        label: item.label.replace('软件版本', ''),
        version: formatVersionValue(item.value)
      })
    })
  }

  return {
    type: 'single',
    clusterLabel: cluster.label,
    bcuVersion,
    bmuVersions
  }
}

// 获取所有簇版本信息
function getAllClustersVersions() {
  const allClusters = clusterStore.availableClusters
  const allVersions = []

  allClusters.forEach(cluster => {
    const clusterKey = cluster.value

    // 获取BCU版本信息
    const clusterData = pickCluster(clusterKey, ['版本信息'])
    let bcuVersion = '–'

    if (clusterData.length > 0) {
      const versionGroup = clusterData[0]
      const bcuSoftwareItem = versionGroup.element.find(item => item.label === 'BCU软件版本号')
      if (bcuSoftwareItem) {
        bcuVersion = formatVersionValue(bcuSoftwareItem.value)
      }
    }

    // 获取BMU版本信息
    const packData = pickPack(clusterKey, ['BMU版本信息'])
    const bmuVersions = []

    if (packData.length > 0) {
      const bmuGroup = packData[0]
      const bmuItems = bmuGroup.element.filter(item =>
        item.label.includes('软件版本') && !item.label.includes('BOOT')
      )

      bmuItems.forEach(item => {
        bmuVersions.push({
          label: item.label.replace('软件版本', ''),
          version: formatVersionValue(item.value)
        })
      })
    }

    allVersions.push({
      clusterLabel: cluster.label,
      clusterValue: cluster.value,
      bcuVersion,
      bmuVersions
    })
  })

  return {
    type: 'all',
    allVersions
  }
}

// 版本信息MQTT事件处理函数
const handleBlockVersionMessage = (event, data) => {
  parseBlockVersion(data)  // BAU版本信息
}

const onPackSummary = (_e, msg) => {
  parsePackSummary(msg)    // BMU版本信息
}

const onClusterSummary = (_e, msg) => {
  parseClusterSummary(msg) // BCU版本信息
}

// 生命周期管理
onMounted(() => {
  // 清理可能存在的旧监听器
  window.electron.ipcRenderer.removeAllListeners?.('BLOCK_VER')
  window.electron.ipcRenderer.removeAllListeners?.('PACK_SUMMARY')
  window.electron.ipcRenderer.removeAllListeners?.('CLUSTER_SUMMARY')

  // 监听版本信息MQTT事件（实现响应式更新）
  window.electron.ipcRenderer.on('BLOCK_VER', handleBlockVersionMessage)      // BAU版本
  window.electron.ipcRenderer.on('PACK_SUMMARY', onPackSummary)               // BMU版本
  window.electron.ipcRenderer.on('CLUSTER_SUMMARY', onClusterSummary)         // BCU版本
})

onUnmounted(() => {
  // 清理版本信息MQTT事件监听器
  window.electron.ipcRenderer.removeAllListeners?.('BLOCK_VER')
  window.electron.ipcRenderer.removeAllListeners?.('PACK_SUMMARY')
  window.electron.ipcRenderer.removeAllListeners?.('CLUSTER_SUMMARY')
})
</script>

<template>
  <div class="version-info-container">
    <!-- BAU版本信息 - 只显示软件版本 -->
    <div class="version-section-inline">
      <div class="version-item-inline">
        <label>{{ t('deviceUpgrade.version.bauVersion', 'BAU版本') }}：</label>
        <span>{{ bauVersionInfo['BAU软件版本号'] }}</span>
      </div>
    </div>

    <!-- 簇版本信息选择器 -->
    <div class="version-section-inline">
      <h5>{{ t('deviceUpgrade.version.clusterVersions', '簇版本信息') }}</h5>
      <div class="flex align-items-center gap-2 mb-2">
        <Dropdown
          v-model="selectedClusterForVersion"
          :options="availableClusterOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="t('deviceUpgrade.version.selectCluster', '选择簇')"
          class="flex-1"
          style="min-width: 120px;"
        />
      </div>

      <!-- 固定高度的版本信息显示区域 -->
      <div class="cluster-version-display-fixed">
        <!-- 单个簇版本信息 -->
        <div v-if="selectedClusterVersions && selectedClusterVersions.type === 'single'" class="cluster-version-content">
          <!-- BCU版本 -->
          <div class="version-item-inline">
            <label>{{ selectedClusterVersions.clusterLabel }} BCU版本：</label>
            <span>{{ selectedClusterVersions.bcuVersion || '–' }}</span>
          </div>

          <!-- BMU版本列表 - 固定高度滚动区域 -->
          <div class="bmu-versions-container">
            <div v-if="selectedClusterVersions.bmuVersions && selectedClusterVersions.bmuVersions.length > 0" class="bmu-versions-grid">
              <div
                v-for="bmu in selectedClusterVersions.bmuVersions"
                :key="bmu.label"
                class="version-item-inline"
              >
                <label>{{ bmu.label }}：</label>
                <span>{{ bmu.version }}</span>
              </div>
            </div>
            <div v-else class="no-bmu-versions">
              <span class="text-xs text-color-secondary">{{ t('deviceUpgrade.version.noBmuVersions', '暂无BMU版本信息') }}</span>
            </div>
          </div>
        </div>

        <!-- 所有簇版本信息 -->
        <div v-else-if="selectedClusterVersions && selectedClusterVersions.type === 'all'" class="all-clusters-version-content">
          <div class="all-clusters-container">
            <div
              v-for="cluster in selectedClusterVersions.allVersions"
              :key="cluster.clusterValue"
              class="cluster-version-item"
            >
              <div class="cluster-header">
                <span class="cluster-name">{{ cluster.clusterLabel }}</span>
              </div>
              <div class="cluster-versions">
                <!-- BCU版本 -->
                <div class="version-item-compact">
                  <label>BCU：</label>
                  <span>{{ cluster.bcuVersion || '–' }}</span>
                </div>
                <!-- BMU版本 -->
                <div v-if="cluster.bmuVersions && cluster.bmuVersions.length > 0" class="bmu-versions-compact">
                  <div
                    v-for="bmu in cluster.bmuVersions"
                    :key="bmu.label"
                    class="version-item-compact"
                  >
                    <label>{{ bmu.label }}：</label>
                    <span>{{ bmu.version }}</span>
                  </div>
                </div>
                <div v-else class="no-bmu-compact">
                  <span class="text-xs text-color-secondary">{{ t('deviceUpgrade.version.noBmuVersions', '暂无BMU版本信息') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 未选择簇时的提示 -->
        <div v-else class="cluster-version-placeholder">
          <span class="text-xs text-color-secondary">{{ t('deviceUpgrade.version.selectClusterToView', '请选择簇查看版本信息') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 版本信息展示区域 - 内联版本（整合到FTP Card中） */
.version-info-container {
  display: block;
}

.version-section-inline {
  margin-top: 8px;
}

.version-section-inline:first-child {
  margin-top: 0;
}

.version-section-inline h5 {
  margin: 8px 0 4px 0;
  color: var(--text-color);
  font-size: 11px;
  font-weight: 600;
}

.version-item-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px; /* 放大版本号整体字号 */
}

.version-item-inline label {
  font-weight: 600;
  color: var(--text-color);
  min-width: 56px;
  font-size: 11px; /* 标签稍大，保持清晰 */
}

.version-item-inline span {
  color: var(--text-color);
  font-family: 'Courier New', monospace;
  font-size: 12px; /* 版本号放大 */
  word-break: break-all;
}

.no-bmu-versions {
  padding: 8px;
  text-align: center;
  color: var(--text-color-secondary);
  grid-column: 1 / -1;
  font-size: 9px;
}

/* 簇版本信息显示区域 - 固定高度版本 */
.cluster-version-display-fixed {
  margin-top: 8px;
  height: 195px;
  background: var(--surface-card);
  border-radius: 4px;
  border: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
}

.cluster-version-content {
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cluster-version-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
  font-size: 10px;
}

.bmu-versions-container {
  flex: 1;
  overflow-y: auto;
  margin-top: 8px;
}

.bmu-versions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
}

/* 滚动条样式 */
.bmu-versions-container::-webkit-scrollbar {
  width: 4px;
}

.bmu-versions-container::-webkit-scrollbar-track {
  background: var(--surface-ground);
  border-radius: 2px;
}

.bmu-versions-container::-webkit-scrollbar-thumb {
  background: var(--surface-border);
  border-radius: 2px;
}

.bmu-versions-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-secondary);
}

/* 全部簇版本信息样式 */
.all-clusters-version-content {
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.all-clusters-header {
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--surface-border);
}

.all-clusters-header span {
  color: var(--primary-color);
  font-weight: 600;
}

.all-clusters-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cluster-version-item {
  background: var(--surface-50);
  border-radius: 4px;
  padding: 6px;
  border: 1px solid var(--surface-border);
}

.cluster-header {
  margin-bottom: 4px;
}

.cluster-name {
  font-weight: 600;
  color: var(--text-color);
  font-size: 12px; /* 与其他版本号字号保持一致 */
}

.cluster-versions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.version-item-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px; /* 与单簇视图保持一致的字号 */
}

.version-item-compact label {
  font-weight: 600;
  color: var(--text-color);
  min-width: 30px;
  font-size: 11px; /* 与inline标签字号一致 */
}

.version-item-compact span {
  color: var(--text-color);
  font-family: 'Courier New', monospace;
  font-size: 12px; /* 与inline数值字号一致 */
  word-break: break-all;
}

.bmu-versions-compact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 8px;
}

.no-bmu-compact {
  margin-left: 8px;
  font-size: 8px;
  color: var(--text-color-secondary);
}

/* 全部簇容器滚动条样式 */
.all-clusters-container::-webkit-scrollbar {
  width: 4px;
}

.all-clusters-container::-webkit-scrollbar-track {
  background: var(--surface-ground);
  border-radius: 2px;
}

.all-clusters-container::-webkit-scrollbar-thumb {
  background: var(--surface-border);
  border-radius: 2px;
}

.all-clusters-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-secondary);
}
</style>
