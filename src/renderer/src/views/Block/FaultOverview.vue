<!-- 故障总览页面组件 -->
<template>
  <div class="card">
    <div class="fault-overview">
      <div class="loading-indicator" v-if="isLoading">
        <i class="pi pi-spin pi-spinner"></i>
        <span>{{ t('faultOverview.loading') }}</span>
      </div>
      
      <div v-else>
        <!-- 使用标签页代替手风琴 -->
        <TabView class="fault-tabs">
          <!-- 堆级故障标签页 -->
          <TabPanel :header="t('faultOverview.blockFaultOverview')">
            <div class="fault-content">
              <!-- 指示灯说明 -->
              <div class="indicator-legend">
                <div class="selector-inline">
                  <span>选择堆：</span>
                  <Dropdown
                    v-model="selectedBlock"
                    :options="blockOptions"
                    optionLabel="label"
                    optionValue="value"
                  />
                </div>
                <div class="legend-item">
                  <div class="indicator-light severe"></div>
                  <span>{{ t('faultOverview.indicatorLegend.severe') }}</span>
                </div>
                <div class="legend-item">
                  <div class="indicator-light general"></div>
                  <span>{{ t('faultOverview.indicatorLegend.general') }}</span>
                </div>
                <div class="legend-item">
                  <div class="indicator-light minor"></div>
                  <span>{{ t('faultOverview.indicatorLegend.minor') }}</span>
                </div>
                <div class="legend-item">
                  <div class="indicator-light normal"></div>
                  <span>{{ t('faultOverview.indicatorLegend.normal') }}</span>
                </div>
              </div>
              
              <!-- 故障项网格 -->
              <div class="fault-items-grid">
                <div v-for="fault in blockGradeOverview" :key="fault.name" 
                     class="fault-indicator">
                  <div :class="['indicator-light', fault.color]"></div>
                  <span class="fault-name">{{ fault.name }}</span>
                </div>
              </div>
            </div>
          </TabPanel>
          
          <!-- 簇级故障标签页：单页签，通过下拉切换选中簇 -->
          <TabPanel :header="t('faultOverview.clusterFaultOverviewTab')">
            <div class="fault-content">
              <div class="indicator-legend">
                <div class="selector-inline">
                  <span>{{ t('faultOverview.selectCluster') }}：</span>
                  <Dropdown
                    v-model="selectedClusterKey"
                    :options="clusterOptions"
                    optionLabel="label"
                    optionValue="value"
                    :placeholder="t('faultOverview.selectCluster')"
                  />
                </div>
                <div class="legend-item">
                  <div class="indicator-light severe"></div>
                  <span>{{ t('faultOverview.indicatorLegend.severe') }}</span>
                </div>
                <div class="legend-item">
                  <div class="indicator-light general"></div>
                  <span>{{ t('faultOverview.indicatorLegend.general') }}</span>
                </div>
                <div class="legend-item">
                  <div class="indicator-light minor"></div>
                  <span>{{ t('faultOverview.indicatorLegend.minor') }}</span>
                </div>
                <div class="legend-item">
                  <div class="indicator-light normal"></div>
                  <span>{{ t('faultOverview.indicatorLegend.normal') }}</span>
                </div>
              </div>

              <div class="fault-items-grid">
                <div v-for="fault in selectedClusterOverview" :key="fault.name" 
                     class="fault-indicator">
                  <div :class="['indicator-light', fault.color]"></div>
                  <span class="fault-name">{{ fault.name }}</span>
                </div>
              </div>
            </div>
          </TabPanel>
        </TabView>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFaultOverview } from '../../composables/core/data-processing/common/useFaultOverview'
import { useBlockSelect } from '../../composables/core/device-selection/useBlockSelect'
import { useBlockStore } from '../../stores/device/blockStore'
import { useClusterStore } from '../../stores/device/clusterStore'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Dropdown from 'primevue/dropdown'

const { t } = useI18n()

// 故障名称翻译映射 - 按照其他页面的模式
const FAULT_NAMES_MAP = computed(() => ({
    'ClusterInterVoltageDiffFaultGrade': t('faultOverview.faultNames.clusterInterVoltageDiffFaultGrade'),
    'ClusterInterCurrentDiffFaultGrade': t('faultOverview.faultNames.clusterInterCurrentDiffFaultGrade'),
    'CellVoltageDiffFaultGrade': t('faultOverview.faultNames.cellVoltageDiffFaultGrade'),
    'CellTempDiffFaultGrade': t('faultOverview.faultNames.cellTempDiffFaultGrade'),
    'CellSocDiffFaultGrade': t('faultOverview.faultNames.cellSocDiffFaultGrade'),
    'PackVoltageDiffFaultGrade': t('faultOverview.faultNames.packVoltageDiffFaultGrade'),
    'ClusterVoltageOverFaultGrade': t('faultOverview.faultNames.clusterVoltageOverFaultGrade'),
    'ClusterVoltageUnderFaultGrade': t('faultOverview.faultNames.clusterVoltageUnderFaultGrade'),
    'InsulationResistancePosFaultGrade': t('faultOverview.faultNames.insulationResistancePosFaultGrade'),
    'InsulationResistanceNegFaultGrade': t('faultOverview.faultNames.insulationResistanceNegFaultGrade'),
    'ChargeOvercurrentFaultGrade': t('faultOverview.faultNames.chargeOvercurrentFaultGrade'),
    'DischargeOvercurrentFaultGrade': t('faultOverview.faultNames.dischargeOvercurrentFaultGrade'),
    'BcuRt1OvertempFaultGrade': t('faultOverview.faultNames.bcuRt1OvertempFaultGrade'),
    'BcuRt2OvertempFaultGrade': t('faultOverview.faultNames.bcuRt2OvertempFaultGrade'),
    'BcuRt3OvertempFaultGrade': t('faultOverview.faultNames.bcuRt3OvertempFaultGrade'),
    'BcuRt4OvertempFaultGrade': t('faultOverview.faultNames.bcuRt4OvertempFaultGrade'),
    'BcuRt5OvertempFaultGrade': t('faultOverview.faultNames.bcuRt5OvertempFaultGrade'),
    'PackOvervoltageFaultGrade': t('faultOverview.faultNames.packOvervoltageFaultGrade'),
    'PackUndervoltageFaultGrade': t('faultOverview.faultNames.packUndervoltageFaultGrade'),
    'PackOvertempFaultGrade': t('faultOverview.faultNames.packOvertempFaultGrade'),
    'PackUndertempFaultGrade': t('faultOverview.faultNames.packUndertempFaultGrade'),
    'PackPowerConnectorPosOvertempFaultGrade': t('faultOverview.faultNames.packPowerConnectorPosOvertempFaultGrade'),
    'PackPowerConnectorNegOvertempFaultGrade': t('faultOverview.faultNames.packPowerConnectorNegOvertempFaultGrade'),
    'CellOvervoltageFaultGrade': t('faultOverview.faultNames.cellOvervoltageFaultGrade'),
    'CellUndervoltageFaultGrade': t('faultOverview.faultNames.cellUndervoltageFaultGrade'),
    'CellChargeOvertempFaultGrade': t('faultOverview.faultNames.cellChargeOvertempFaultGrade'),
    'CellChargeUndertempFaultGrade': t('faultOverview.faultNames.cellChargeUndertempFaultGrade'),
    'CellDischargeOvertempFaultGrade': t('faultOverview.faultNames.cellDischargeOvertempFaultGrade'),
    'CellDischargeUndertempFaultGrade': t('faultOverview.faultNames.cellDischargeUndertempFaultGrade'),
    'CellSocTooHighFaultGrade': t('faultOverview.faultNames.cellSocTooHighFaultGrade'),
    'CellSocTooLowFaultGrade': t('faultOverview.faultNames.cellSocTooLowFaultGrade')
  }))

// 使用堆选择composable
const { blockOptions, selectedBlock } = useBlockSelect()

// 使用堆store
const blockStore = useBlockStore()
// 使用簇store（用于全局堆簇配置驱动下拉）
const clusterStore = useClusterStore()

const {
  blockGradeData,
  clusterGradeData,
  processedBlockGradeOverview: rawBlockGradeOverview,
  processedClusterData: rawClusterData
} = useFaultOverview()

// 处理后的数据 - 应用翻译
const blockGradeOverview = computed(() => {
  return rawBlockGradeOverview.value.map(fault => ({
    ...fault,
    name: FAULT_NAMES_MAP.value[fault.name] || fault.name
  }))
})

const clusterData = computed(() => {
  return rawClusterData.value.map(cluster => ({
    ...cluster,
    overview: cluster.overview.map(fault => ({
      ...fault,
      name: FAULT_NAMES_MAP.value[fault.name] || fault.name
    }))
  }))
})

// 页面内簇选择（仅添加下拉框，不改样式）：与标签页联动
const activeClusterIndex = ref(0)
// 下拉选中键（统一使用全局配置的复合键，如 '2-3'）
const selectedClusterKey = ref(null)
// 页面内部仍保留簇号用于渲染数据（与 useFaultOverview 保持兼容）
const selectedClusterId = ref(null)
// 簇下拉选项改为系统配置驱动，展示所有堆簇
const clusterOptions = computed(() => {
  return clusterStore.availableClusters.map(opt => ({
    label: t('cluster.blockCluster', [opt.block, opt.cluster]),
    value: opt.value // 'block-cluster' 键，例如 '2-3'
  }))
})
const selectedClusterOverview = computed(() => {
  const cid = selectedClusterId.value
  const found = clusterData.value.find(c => c.id === cid)
  return found ? found.overview : []
})
// 当全局配置下拉选择变化时，解析并同步到页面的堆选择与簇编号
watch(selectedClusterKey, (key) => {
  if (!key) return
  const [bStr, cStr] = String(key).split('-')
  const b = parseInt(bStr)
  const c = parseInt(cStr)
  if (!isNaN(b)) {
    selectedBlock.value = `block${b}`
  }
  if (!isNaN(c)) {
    selectedClusterId.value = c
  }
})

// 当当前堆的簇数据更新时，如果尚未选择具体簇，默认选择该堆的第一个簇的总览
watch(clusterData, (newVal) => {
  if (newVal && newVal.length) {
    const idx = Math.min(activeClusterIndex.value, newVal.length - 1)
    if (selectedClusterId.value == null) {
      selectedClusterId.value = newVal[idx].id
    }
  } else {
    selectedClusterId.value = null
    activeClusterIndex.value = 0
  }
})
watch(selectedClusterId, (val) => {
  const idx = clusterData.value.findIndex(c => c.id === val)
  if (idx >= 0) activeClusterIndex.value = idx
})

// 加载状态
const isLoading = computed(() => {
  // 改为：只有在明确收到数据后才显示内容，否则显示默认状态
  // 这样可以避免长时间等待
  return false // 直接显示内容，不等待MQTT数据
})

// 监听堆选择变化
const handleBlockChange = () => {
  console.log('[FaultOverview] 堆选择变化:', selectedBlock.value)
  
  // 堆选择变化时，清空当前数据，等待新堆的数据
  blockGradeData.value = {}
  clusterGradeData.value = {}
}

// MQTT数据订阅
const subscribeToMqttTopics = () => {
  // 监听四个故障相关的topic
  const faultTopics = [
    // 'BLOCK_ANALOG_FAULT_LEVEL',
    'BLOCK_ANALOG_FAULT_GRADE', 
    // 'CLU_ANALOG_FAULT_LEVEL_SUM',
    'CLU_ANALOG_FAULT_GRADE'
  ]
  
  faultTopics.forEach(topic => {
    window.electron.ipcRenderer.on(topic, handleFaultData)
  })
  
  console.log('已订阅MQTT故障总览主题:', faultTopics)
}

const unsubscribeFromMqttTopics = () => {
  const faultTopics = [
    // 'BLOCK_ANALOG_FAULT_LEVEL',
    'BLOCK_ANALOG_FAULT_GRADE', 
    // 'CLU_ANALOG_FAULT_LEVEL_SUM',
    'CLU_ANALOG_FAULT_GRADE'
  ]
  
  faultTopics.forEach(topic => {
    window.electron.ipcRenderer.removeAllListeners(topic, handleFaultData)
  })
  
  console.log('已取消订阅MQTT故障主题')
}

// 处理MQTT故障数据
const handleFaultData = (_e, msg) => {
  // console.log('收到故障数据:', msg.dataType, msg.data)
  
  // 自动添加堆选项
  if (msg.blockId) {
    const blockKey = `block${msg.blockId}`
    // 【已禁用】动态发现机制，改用配置驱动方式
    // blockStore.ensureBlockOption(blockKey)
  }
  
  // 只处理当前选中堆的数据
  const currentBlockId = selectedBlock.value ? parseInt(selectedBlock.value.replace('block', '')) : null
  if (currentBlockId && msg.blockId && msg.blockId !== currentBlockId) {
    // console.log(`[FaultOverview] 忽略非当前堆的数据: 当前堆${currentBlockId}, 数据堆${msg.blockId}`)
    return
  }
  
  switch(msg.dataType) {
    case 'BLOCK_ANALOG_FAULT_GRADE':
      // msg.data 是解析后的数据，包含 baseConfig
      blockGradeData.value = { data: msg.data }
      break
    case 'CLU_ANALOG_FAULT_GRADE':
      // msg.data 是解析后的数据，包含 baseConfig 和 clusterCount
      clusterGradeData.value = { 
        data: msg.data,
        baseConfig: { clusterCount: msg.baseConfig?.clusterCount || 0 }
      }
      break
  }
}

onMounted(() => {
  // 初始化堆选项（如果有的话）
  if (selectedBlock.value) {
    // 【已禁用】动态发现机制，改用配置驱动方式
    // blockStore.ensureBlockOption(selectedBlock.value)
  }
  
  // 订阅MQTT主题
  subscribeToMqttTopics()
  
  console.log('[FaultOverview] 组件挂载完成')
})

onUnmounted(() => {
  unsubscribeFromMqttTopics()
  console.log('[FaultOverview] 组件卸载')
})

// 监听堆选择变化
watch(selectedBlock, handleBlockChange)
</script>

<style scoped>
.fault-overview {
  max-width: 1400px;
  margin: 0 auto;
  background-color: var(--surface-ground);
  min-height: auto;
  height: auto;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-color-secondary);
  font-size: 16px;
}

.loading-indicator i {
  margin-right: 8px;
  font-size: 18px;
}

/* 标签页样式优化 */
.fault-tabs {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background: var(--surface-card);
}

:deep(.p-tabview .p-tabview-nav) {
  background: var(--surface-section);
  border-bottom: 1px solid var(--surface-border);
  padding: 0.5rem 1rem 0;
}

:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link) {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-color-secondary);
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  transition: all 0.2s ease;
  border-radius: 6px 6px 0 0;
  margin-right: 0.25rem;
}

:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link:hover) {
  background: var(--surface-hover);
  color: var(--text-color);
}

:deep(.p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link) {
  background: var(--surface-card);
  color: var(--primary-color);
  border-color: var(--surface-border);
  border-bottom-color: var(--surface-card);
}

:deep(.p-tabview .p-tabview-panels) {
  background: var(--surface-card);
  padding: 1.5rem;
  border: none;
}

/* 故障内容区域 */
.fault-content {
  position: relative;
  min-height: auto;
}

/* 指示灯说明 */
.indicator-legend {
  display: flex;
  gap: 12px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.selector-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--surface-card);
  border-radius: 4px;
  border: 1px solid var(--surface-border);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  backdrop-filter: blur(4px);
}

.legend-item .indicator-light {
  width: 10px;
  height: 10px;
  margin-right: 0;
}

/* 故障项网格 */
.fault-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.fault-indicator {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--surface-section);
  border: 1px solid var(--surface-border);
  transition: all 0.2s ease;
}

.fault-indicator:hover {
  background: var(--surface-hover);
  transform: translateY(-1px);
}

.indicator-light {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-right: 8px;
  border: 2px solid var(--surface-card);
  box-shadow: 0 0 4px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}

.indicator-light.severe {
  background-color: var(--red-500);
}

.indicator-light.general {
  background-color: var(--orange-500);
}

.indicator-light.minor {
  background-color: var(--yellow-500);
}

.indicator-light.normal {
  background-color: var(--green-500);
}

.indicator-light.inactive {
  background-color: var(--surface-500);
  opacity: 0.3;
  box-shadow: none;
}

.fault-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .fault-items-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  
  .fault-overview {
    max-width: 100%;
  }
  
  .indicator-legend {
    gap: 8px;
  }
  
  .legend-item {
    padding: 3px 8px;
    font-size: 12px;
    gap: 4px;
  }
  
  .legend-item .indicator-light {
    width: 8px;
    height: 8px;
  }
  
  :deep(.p-tabview .p-tabview-panels) {
    padding: 1rem;
  }
}

/* 动画效果 */
.fault-indicator {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 指示灯闪烁动画（当有严重故障时） */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.indicator-light.severe {
  animation: pulse 2s infinite;
}
</style> 
