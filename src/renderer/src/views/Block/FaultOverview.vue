<!-- 故障总览页面组件 -->
<template>
  <div class="card">
  <div class="fault-overview">
    <div class="loading-indicator" v-if="isLoading">
      <i class="pi pi-spin pi-spinner"></i>
      <span>正在加载故障数据...</span>
    </div>
    
    <div v-else>
        <Accordion class="fault-accordion" multiple :activeIndex="[0]">
        <!-- 堆级故障面板 -->
          <AccordionTab header="堆故障总览" class="block-fault-panel">
          <div class="fault-cards">
              <!-- Card: 故障最高等级总览 -->
            <div class="fault-card level-overview">
                <div class="fault-grid">
                  <!-- 指示灯说明 - 左上角 -->
                  <div class="indicator-legend">
                    <div class="legend-item">
                      <div class="indicator-light severe"></div>
                      <span>严重</span>
              </div>
                    <div class="legend-item">
                      <div class="indicator-light general"></div>
                      <span>一般</span>
                </div>
                    <div class="legend-item">
                      <div class="indicator-light minor"></div>
                      <span>轻微</span>
                </div>
                    <div class="legend-item">
                      <div class="indicator-light normal"></div>
                      <span>正常</span>
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
            </div>
          </div>
        </AccordionTab>
        
        <!-- 簇级故障面板 -->
        <AccordionTab 
          v-for="cluster in clusterData" 
          :key="cluster.id"
            :header="`簇${cluster.id}故障总览`"
          class="cluster-fault-panel"
        >
          <div class="fault-cards">
              <!-- Card: 故障最高等级总览 -->
            <div class="fault-card level-overview">
                <div class="fault-grid">
                  <!-- 指示灯说明 - 左上角 -->
                  <div class="indicator-legend">
                    <div class="legend-item">
                      <div class="indicator-light severe"></div>
                      <span>严重</span>
              </div>
                    <div class="legend-item">
                      <div class="indicator-light general"></div>
                      <span>一般</span>
                </div>
                    <div class="legend-item">
                      <div class="indicator-light minor"></div>
                      <span>轻微</span>
                </div>
                    <div class="legend-item">
                      <div class="indicator-light normal"></div>
                      <span>正常</span>
              </div>
            </div>
            
                  <!-- 故障项网格 -->
                  <div class="fault-items-grid">
                    <div v-for="fault in cluster.overview" :key="fault.name" 
                         class="fault-indicator">
                      <div :class="['indicator-light', fault.color]"></div>
                      <span class="fault-name">{{ fault.name }}</span>
                </div>
                </div>
              </div>
            </div>
          </div>
        </AccordionTab>
      </Accordion>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useFaultOverview } from '../../composables/core/data-processing/common/useFaultOverview'
import { useBlockSelect } from '../../composables/core/device-selection/useBlockSelect'
import { useBlockStore } from '../../stores/device/blockStore'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'


// 使用堆选择composable
const { blockOptions, selectedBlock } = useBlockSelect()

// 使用堆store
const blockStore = useBlockStore()

const {
  blockGradeData,
  clusterGradeData,
  processedBlockGradeOverview: blockGradeOverview,
  processedClusterData: clusterData
} = useFaultOverview()

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
    window.electron.ipcRenderer.removeListener(topic, handleFaultData)
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
    console.log(`[FaultOverview] 忽略非当前堆的数据: 当前堆${currentBlockId}, 数据堆${msg.blockId}`)
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
  background-color: white;
  min-height: 100vh;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #7f8c8d;
  font-size: 16px;
}

.loading-indicator i {
  margin-right: 8px;
  font-size: 18px;
}

/* 手风琴样式优化 - 贴合主题 */
.fault-accordion {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  background: white;
  margin: 0;
}

/* 手风琴头部样式 */
:deep(.p-accordion .p-accordion-header) {
  background: #f8f9fa;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  margin: 0;
  transition: all 0.2s ease;
}

:deep(.p-accordion .p-accordion-header:last-child) {
  border-bottom: none;
}

:deep(.p-accordion .p-accordion-header a) {
  padding: 16px 20px;
  font-weight: 600;
  color: #374151;
  background: transparent;
  border: none;
  border-radius: 0;
  transition: all 0.2s ease;
}

:deep(.p-accordion .p-accordion-header:hover) {
  background: #e9ecef;
}

:deep(.p-accordion .p-accordion-header:hover a) {
  background: transparent;
  color: #1f2937;
}

:deep(.p-accordion .p-accordion-header.p-highlight) {
  background: #007ad9;
}

:deep(.p-accordion .p-accordion-header.p-highlight a) {
  color: white;
  background: transparent;
}

/* 手风琴内容样式 */
:deep(.p-accordion .p-accordion-content) {
  border: none;
  background: transparent;
  padding: 0;
}

/* 卡片容器样式 - 单列显示 */
.fault-cards {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  background: white;
  height: 100%;
}

.fault-grid {
  position: relative;
  padding: 16px;
  min-height: 200px;
}

/* 指示灯说明 - 左上角 */
.indicator-legend {
  position: absolute;
  top: 8px;
  left: 16px;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  border: 1px solid #e9ecef;
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
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
  padding-top: 25px; /* 压缩为左上角的指示灯说明留出的空间 */
}

.fault-indicator {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.fault-indicator:hover {
  background: #e9ecef;
  transform: translateY(-1px);
}

.indicator-light {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-right: 8px;
  border: 2px solid #ffffff;
  box-shadow: 0 0 4px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}

.indicator-light.severe {
  background-color: #ff0000;
}

.indicator-light.general {
  background-color: #ff8c00;
}

.indicator-light.minor {
  background-color: #ffd700;
}

.indicator-light.normal {
  background-color: #0bdf0b;
}

.indicator-light.inactive {
  background-color: #6c757d;
  opacity: 0.3;
  box-shadow: none;
}

.fault-name {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  flex: 1;
}

.fault-card {
  border: 1px solid #e1e8ed;
  border-radius: 0;
  padding: 0;
  background: white;
  box-shadow: none;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.fault-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card-subtitle {
  margin: 0;
  font-size: 14px;
  color: #7f8c8d;
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
    top: 6px;
    left: 12px;
  }
  
  .legend-item {
    padding: 0px 6px !important;
    font-size: 11px;
    gap: 1px;
  }
  
  .legend-item .indicator-light {
    width: 6px;
    height: 6px;
  }
  
  .fault-items-grid {
    padding-top: 25px;
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