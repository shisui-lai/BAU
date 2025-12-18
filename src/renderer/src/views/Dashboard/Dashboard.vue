<template>
  <div class="dashboard-container">
    <!-- 顶部标题栏 (Tech HUD Style) -->
    <div class="tech-header-container" ref="headerContainer">
      <canvas ref="headerCanvas" class="header-canvas"></canvas>
      
      <div class="header-content">
        <!-- 左侧翼：系统装饰/导航 -->
        <div class="hud-wing left-wing">
           <div class="wing-content">
              <!-- Company Logo Module -->
              <div class="logo-module">
                 <div class="logo-text">
                    <div class="logo-main">SYL</div>
                    <div class="logo-sub">A RISEN GROUP COMPANY</div>
                 </div>
              </div>
           </div>
        </div>
        
        <!-- 中控：标题 -->
        <div class="hud-center">
           <div class="title-box">
              <h1 class="main-title">东方日升电池管理系统</h1>
              <div class="sub-title">RISEN ENERGY STORAGE SYSTEM-BMS</div>
           </div>
        </div>
        
        <!-- 右侧翼：状态与时间 -->
        <div class="hud-wing right-wing">
           <div class="wing-content">
              <!-- SD卡状态模块 -->
              <div class="sd-status-module" :class="getSdSeverityClass()">
                 <div class="module-icon">
                    <i class="pi pi-sd-card"></i>
                 </div>
                 <div class="module-text">
                    <span class="label">SD卡</span>
                    <span class="value">{{ sdCardStatusText }}</span>
                 </div>
              </div>
              
              <!-- MQTT 状态模块 -->
              <div class="status-module" @click="handleStatusClick" :class="mqttStore.status">
                 <div class="module-icon">
                    <i :class="getStatusIcon()"></i>
                 </div>
                 <div class="module-text">
                    <span class="label">LINK STATUS</span>
                    <span class="value">{{ getStatusText() }}</span>
                 </div>
              </div>
              
              <!-- 时间模块 -->
              <div class="time-module">
                 <div class="time-main">{{ currentTime }}</div>
                 <div class="date-sub">{{ currentDate }}</div>
              </div>
           </div>
        </div>
      </div>
    </div>

    <!--主要内容区域 -->
    <div class="dashboard-content">
      <!-- 顶部关键指标 Grid (10个数据点) -->
      <div class="kpi-grid">
        <div class="kpi-card" v-for="(item, index) in kpiItems" :key="index" @click="handleCardClick(item)">
          <div class="kpi-icon">
            <i :class="item.icon"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-title">{{ item.title }}</div>
            <div class="kpi-value-group">
               <span class="kpi-value glow-text">{{ item.value }}</span>
               <span class="kpi-unit">{{ item.unit }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间核心展示区 (Split 50/50) -->
      <div class="main-section status-row-container">
        
        <!-- Left Column: Real-time Battery Status -->
        <div class="status-col left-col geo-structure-box">
           <canvas ref="panelCanvasLeft" class="panel-canvas"></canvas>
           <!-- 单个栏目标题（避免每个堆的标题绝对定位造成重叠） -->
           <div class="card-header">
             <h3>实时状态数据</h3>
           </div>
           <!-- 多堆容器：两列并排 -->
           <div class="blocks-container">
             <div class="block-status-item" 
                  v-for="block in displayBlocksForRealtime" 
                  :key="block.value" 
                  :class="{ placeholder: isPlaceholderRealtime(block) }"
                  @click="navigateToBlockInfo(block)">
               
               <div class="battery-display-area">
                 <!-- 高级电池模型（最左侧） -->
                 <div class="battery-model-3d">
                   <div class="battery-cap"></div>
                  <div class="battery-glass-body">
                    <!-- 液体 -->
                    <div class="battery-liquid" :style="{ height: getBlockSoc(block.value) + '%' }">
                       <div class="liquid-surface" v-if="getBlockSoc(block.value) > 0"></div>
                       <div class="liquid-bubbles" v-if="getBlockSoc(block.value) > 0"></div>
                    </div>
                    
                    <!-- 状态图标/文字 -->
                    <div class="battery-overlay-content">
                       <div class="soc-number">
                         <span class="val">{{ getBlockSoc(block.value) }}</span><span class="unit">%</span>
                       </div>
                       <div class="soc-label">SOC</div>
                       
                       <!-- 充放电状态指示 -->
                       <div class="power-status" v-if="getChargeDischargeState(block.value) !== 'idle'">
                          <i class="pi pi-angle-double-down charging-icon" v-if="getChargeDischargeState(block.value) === 'charging'"></i>
                          <i class="pi pi-angle-double-up discharging-icon" v-if="getChargeDischargeState(block.value) === 'discharging'"></i>
                         <span>{{ getChargeDischargeStateText(block.value) }}</span>
                        </div>
                     </div>
                   </div>
                   <!-- 堆标签（显示：堆1/堆2） -->
                   <div class="battery-block-label">{{ block.label }}</div>
                 </div>

                 <!-- 堆电压/电流参数（中间，靠电池模型右侧，稍增距离） -->
                 <div class="electrical-params">
                    <div class="param-card voltage-card">
                      <div class="param-header">
                        <i class="pi pi-bolt"></i>
                        <span class="param-label">堆电压</span>
                      </div>
                      <div class="param-value-box">
                         <span class="val">{{ getBlockVoltage(block.value) }}</span>
                         <span class="unit">V</span>
                      </div>
                      <div class="param-progress">
                        <div class="fill" v-if="parseFloat(getBlockVoltage(block.value)) > 0"></div>
                      </div>
                   </div>
                   <div class="param-card current-card">
                      <div class="param-header">
                        <i class="pi pi-chart-line"></i>
                        <span class="param-label">堆电流</span>
                      </div>
                      <div class="param-value-box">
                         <span class="val">{{ getBlockCurrent(block.value) }}</span>
                         <span class="unit">A</span>
                      </div>
                      <div class="param-progress">
                        <div class="fill" v-if="parseFloat(getBlockCurrent(block.value)) > 0"></div>
                      </div>
                   </div>
                </div>

                <!-- 状态圆环 (SOH & 故障状态)（最右侧） -->
                <div class="status-rings">
                   <div class="ring-item">
                     <div class="tech-ring" :style="{ '--percent': getBlockSoh(block.value) + '%' }">
                        <svg viewBox="0 0 36 36" class="circular-chart">
                          <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path class="circle" :stroke-dasharray="`${getBlockSoh(block.value)}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div class="ring-text">
                          <span class="val">{{ getBlockSoh(block.value) }}</span>
                          <span class="unit">%</span>
                        </div>
                     </div>
                     <div class="ring-label">SOH</div>
                   </div>
                   <div class="ring-item">
                     <div class="tech-ring" :style="{ '--percent': '100%' }">
                        <svg viewBox="0 0 36 36" class="circular-chart" :class="getFaultStatusClass(getBlockFaultStatus(block.value))">
                          <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path class="circle" stroke-dasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div class="ring-text">
                        <span class="val" style="font-size: 0.8rem; white-space: nowrap;">{{ getFaultStatusText(getBlockFaultStatus(block.value)) }}</span>
                        </div>
                     </div>
                     <div class="ring-label">堆故障状态</div>
                   </div>
                </div>
              </div>
           </div>
        </div>
        </div>

        <!-- Right Column: Placeholder -->
        <div class="status-col right-col geo-structure-box">
            <canvas ref="panelCanvasRight" class="panel-canvas"></canvas>
            <div class="card-header">
               <h3>待定功能区</h3>
            </div>
            <div class="placeholder-content">
               <span>Reserved Area</span>
            </div>
        </div>

      </div>
      
      <!-- 底部：电池簇状态监控 (按堆显示) -->
      <div class="bottom-section system-overview geo-structure-box">
         <canvas ref="panelCanvasBottom" class="panel-canvas"></canvas>
         <div class="card-header">
             <h3>电池簇状态监控</h3>
         </div>
         
         <div class="heaps-container">
            <div class="heap-section" v-for="block in availableBlocks" :key="block.value">
               <div class="heap-title">
                  <span class="heap-name">{{ block.label }}</span>
                  <span class="heap-info-text">
                     (配置簇数: {{ getBlockTotalClusters(block.value) }})
                  </span>
               </div>
               <div class="clusters-grid">
                  <div class="cluster-battery" 
                       v-for="(cluster, index) in getBlockClusterStates(block.value)" 
                       :key="cluster.id"
                       :class="cluster.status"
                       @click="navigateToClusterInfo(block.value, cluster.id)"
                  >
                     <!-- Scheme A: Holographic Energy Conduit -->
                     <div class="holo-conduit" :class="{ 
                        active: cluster.contactorClosed, 
                        charging: cluster.status === 'charging', 
                        discharging: cluster.status === 'discharging' 
                     }">
                        <!-- Busbar Connector (Horizontal Line) -->
                        <div class="busbar-connector"></div>

                        <!-- Upper Conduit (Busbar to Switch) -->
                        <div class="conduit-upper">
                           <div class="beam-core"></div>
                           <div class="flow-arrows" v-if="cluster.status === 'charging' || cluster.status === 'discharging'"></div>
                        </div>

                        <!-- Connection Joint (Pivot for Switch) -->
                        <div class="conduit-joint"></div>
                        
                        <!-- Mechanical Switch (Integrated) -->
                        <div class="mechanical-switch" :class="{ closed: cluster.contactorClosed }">
                           <!-- Removed terminals to prevent interference -->
                           <div class="switch-blade">
                              <div class="beam-core"></div>
                              <div class="flow-arrows" v-if="cluster.status === 'charging' || cluster.status === 'discharging'"></div>
                           </div>
                        </div>

                        <!-- Lower Conduit (Switch to Battery) -->
                        <div class="conduit-lower">
                           <div class="beam-core"></div>
                           <div class="flow-arrows" v-if="cluster.status === 'charging' || cluster.status === 'discharging'"></div>
                        </div>
                     </div>

                     <!-- Battery Model (Heap Style Scaled Down) -->
                     <div class="battery-cap"></div>
                     <div class="battery-glass-body">
                        <!-- Liquid with Wave & Bubbles -->
                        <div class="battery-liquid" :style="{ height: cluster.soc + '%' }">
                           <div class="liquid-surface" v-if="cluster.soc > 0"></div>
                           <div class="liquid-bubbles" v-if="cluster.soc > 0"></div>
                        </div>
                        
                        <!-- Overlay Info (V, A, SOC) -->
                        <div class="battery-overlay-content">
                           <div class="cluster-overlay-data">
                              <div class="data-row"><span class="val">{{ cluster.volt }}</span><span class="unit">V</span></div>
                              <div class="data-row"><span class="val">{{ cluster.curr }}</span><span class="unit">A</span></div>
                              <div class="soc-row"><span class="val">{{ cluster.soc }}</span><span class="unit">%</span></div>
                              
                              <div class="summary-row">
                                <span class="val">{{ cluster.vmax }}</span><span class="unit">V</span>
                                <span class="sep">|</span>
                                <span class="val">{{ cluster.vmin }}</span><span class="unit">V</span>
                              </div>
                              <div class="summary-row">
                                <span class="val">{{ cluster.tmax }}</span><span class="unit">℃</span>
                                <span class="sep">|</span>
                                <span class="val">{{ cluster.tmin }}</span><span class="unit">℃</span>
                              </div>
                               
                               <!-- Mini Power Status -->
                               <div class="power-status mini" v-if="cluster.status === 'charging' || cluster.status === 'discharging'">
                                  <i class="pi pi-angle-double-down charging-icon" v-if="cluster.status === 'charging'"></i>
                                  <i class="pi pi-angle-double-up discharging-icon" v-if="cluster.status === 'discharging'"></i>
                                  <span>{{ cluster.status === 'charging' ? '充电' : '放电' }}</span>
                               </div>
                           </div>
                        </div>
                     </div>
                     
                     <!-- Cluster Label -->
                     <div class="cluster-label-text">簇{{ cluster.id }}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useMqttStore } from '@/stores/communication/mqttStore'
import { useBlockStore } from '@/stores/device/blockStore'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'
import { pickBlockSummary, parseBlockSummary, blockSummaryTick } from '@/composables/core/data-processing/block/parseBlockSummary'
import { pickCluster, parseClusterSummary, clusterSummaryTick } from '@/composables/core/data-processing/cluster/parseClusterSummary'
import { parseClusterSysAbstract, pickClusterSysAbstractValue, clusterSysAbstractTick, SYS_ABSTRACT_CLASSES, SYS_ABSTRACT_LABELS } from '@/composables/core/data-processing/cluster/parseClusterSysAbstract'
import { parseBlockVersion, pickBlockVersion } from '@/composables/core/data-processing/block/parseBlockVersion'
import { useSystemConfigStore } from '@/stores/system/systemConfigStore'

const router = useRouter()
const mqttStore = useMqttStore()
const blockStore = useBlockStore()
const clusterStore = useClusterStore()
const systemConfigStore = useSystemConfigStore()
const { selectedBlock } = useBlockSelect()

// 注入 Layout 提供的 MQTT 控制方法
const handleStatusClick = inject('handleStatusClick')
const getStatusIcon = inject('getStatusIcon')
const getStatusText = inject('getStatusText')

// 监听器处理函数
const handleBlockSummaryMessage = (event, data) => {
  if (data.dataType === 'BLOCK_SUMMARY') {
    parseBlockSummary(data)
  }
}

const handleClusterSummaryMessage = (event, data) => {
  if (data.dataType === 'CLUSTER_SUMMARY') {
    parseClusterSummary(data)
  }
}

const handleClusterSysAbstractMessage = (event, data) => {
  if (data.dataType === 'SYS_ABSTRACT') {
    parseClusterSysAbstract(data)
  }
}

const handleBlockVersionMessage = (event, data) => {
  // 版本信息（含SD卡状态）
  if (data && data.dataType === 'BLOCK_VER') {
    parseBlockVersion(data)
  }
}

// 时间显示
const currentTime = ref('')
const currentDate = ref('')
let timer = null

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', { hour12: false })
  currentDate.value = now.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  
  // 注册MQTT数据监听
  if (window.electron && window.electron.ipcRenderer) {
    window.electron.ipcRenderer.on('BLOCK_SUMMARY', handleBlockSummaryMessage)
    window.electron.ipcRenderer.on('CLUSTER_SUMMARY', handleClusterSummaryMessage)
    window.electron.ipcRenderer.on('BLOCK_VER', handleBlockVersionMessage)
    window.electron.ipcRenderer.on('SYS_ABSTRACT', handleClusterSysAbstractMessage)
  }

  // 确保选中一个堆
  // 注意：useBlockSelect内部使用了computed，直接修改ref值需要通过blockStore
  if (!blockStore.selectedBlockForView && blockStore.availableBlocks.length > 0) {
    blockStore.setSelectedBlockForView(`block${blockStore.availableBlocks[0].value}`)
  } else if (!blockStore.selectedBlockForView) {
     // 如果没有availableBlocks，默认设为block1
     blockStore.setSelectedBlockForView('block1')
  }

  // 立即触发一次更新，确保初始数据加载
  if (blockSummaryTick) blockSummaryTick.value++
  if (clusterSummaryTick) clusterSummaryTick.value++

  initHeaderCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', resizeCanvas)
  
  // 移除MQTT数据监听
  if (window.electron && window.electron.ipcRenderer) {
    window.electron.ipcRenderer.removeAllListeners('BLOCK_SUMMARY')
    window.electron.ipcRenderer.removeAllListeners('CLUSTER_SUMMARY')
    window.electron.ipcRenderer.removeAllListeners('BLOCK_VER')
    // 仅移除本页注册的 SYS_ABSTRACT 监听，避免影响其他页面
    window.electron.ipcRenderer.removeListener('SYS_ABSTRACT', handleClusterSysAbstractMessage)
  }
})

// ========== Header Canvas Animation ==========
const headerCanvas = ref(null)
const headerContainer = ref(null)
const panelCanvasLeft = ref(null)
const panelCanvasRight = ref(null)
const panelCanvasBottom = ref(null)

let ctx = null
let ctxLeft = null
let ctxRight = null
let ctxBottom = null
let animFrameId = null
let canvasW = 0
let canvasH = 0

// Animation state
let scanLineX = 0

const resizeCanvas = () => {
  // Header
  if (headerCanvas.value && headerContainer.value) {
    canvasW = headerContainer.value.clientWidth
    canvasH = headerContainer.value.clientHeight
    headerCanvas.value.width = canvasW
    headerCanvas.value.height = canvasH
  }
  
  // Panel Canvases
  if (panelCanvasLeft.value) {
    const rect = panelCanvasLeft.value.getBoundingClientRect()
    panelCanvasLeft.value.width = rect.width
    panelCanvasLeft.value.height = rect.height
    ctxLeft = panelCanvasLeft.value.getContext('2d')
  }
  if (panelCanvasRight.value) {
    const rect = panelCanvasRight.value.getBoundingClientRect()
    panelCanvasRight.value.width = rect.width
    panelCanvasRight.value.height = rect.height
    ctxRight = panelCanvasRight.value.getContext('2d')
  }
  if (panelCanvasBottom.value) {
    const rect = panelCanvasBottom.value.getBoundingClientRect()
    panelCanvasBottom.value.width = rect.width
    panelCanvasBottom.value.height = rect.height
    ctxBottom = panelCanvasBottom.value.getContext('2d')
  }
  
  // Update row edge classes for cluster busbars after layout
  updateClusterRowEdges()
}

const initHeaderCanvas = () => {
  if (headerCanvas.value) {
    ctx = headerCanvas.value.getContext('2d')
  }
  resizeCanvas()
  animateHeader()
}

// Assign row-first / row-last classes to cluster items per flex row
const updateClusterRowEdges = async () => {
  await nextTick()
  const containers = document.querySelectorAll('.bottom-section .clusters-grid')
  containers.forEach(container => {
    const items = Array.from(container.querySelectorAll('.cluster-battery'))
    // reset
    items.forEach(el => {
      el.classList.remove('row-first', 'row-last')
    })
    // group by top position (rows)
    const rows = []
    items.forEach(el => {
      const top = el.offsetTop
      const row = rows.find(r => Math.abs(r.top - top) < 2)
      if (row) row.items.push(el)
      else rows.push({ top, items: [el] })
    })
    rows.forEach(r => {
      if (r.items.length > 0) {
        r.items[0].classList.add('row-first')
        r.items[r.items.length - 1].classList.add('row-last')
      }
    })
  })
}

watch(clusterSummaryTick, async () => {
  await nextTick()
  resizeCanvas()
  updateClusterRowEdges()
})

// Draw a single Tech Panel (Armor Plate Style)
const drawTechPanel = (context, w, h, titleWidth = 220) => {
  if (!context) return
  
  context.clearRect(0, 0, w, h)
  
  const chamfer = 20
  const headerH = 32
  
  // 1. Background Body (Unified Geometric Shape)
  context.beginPath()
  context.moveTo(0, 0)
  context.lineTo(w, 0)
  context.lineTo(w, h - chamfer)
  context.lineTo(w - chamfer, h)
  context.lineTo(0, h)
  context.closePath()
  
  context.fillStyle = 'rgba(31, 41, 55, 0.9)' // Surface Card Color #1f2937
  context.fill()
  
  context.save()
    
    // --- TOP BORDER (With Separation) ---
    // Start after the Title Block to create "Distance"
    context.beginPath()
    context.moveTo(titleWidth + 30, 0) 
    context.lineTo(w, 0)
    context.lineWidth = 4
    context.strokeStyle = 'rgba(79, 172, 254, 0.8)'
    context.shadowColor = 'rgba(79, 172, 254, 0.3)' // Weaker glow
    context.shadowBlur = 5
    context.stroke()
    
    // --- UNIFIED BOTTOM BORDER (Enclosure) ---
   context.beginPath()
   context.moveTo(chamfer, h)
   context.lineTo(w - chamfer, h)
   context.lineWidth = 4
   context.strokeStyle = 'rgba(79, 172, 254, 0.8)'
   context.shadowColor = 'rgba(79, 172, 254, 0.3)' // Weaker glow
   context.shadowBlur = 5
   context.stroke()
   
   // --- LEFT BORDER ---
   // Top-Left Vertical (The "Left Grip" - Bold)
   context.beginPath()
   context.moveTo(0, 0)
   context.lineTo(0, headerH)
   context.lineWidth = 6
   context.strokeStyle = '#4facfe'
   context.lineCap = 'butt'
   context.stroke()
   
   // Rest of Left (Medium)
   context.beginPath()
   context.moveTo(0, headerH)
   context.lineTo(0, h)
   context.lineWidth = 2
   context.strokeStyle = 'rgba(79, 172, 254, 0.3)'
   context.stroke()
   
   // --- RIGHT BORDER ---
   // Top-Right Corner Cap
   context.beginPath()
   context.moveTo(w, 0)
   context.lineTo(w, 20)
   context.lineWidth = 3
   context.strokeStyle = 'rgba(79, 172, 254, 0.6)'
   context.stroke()
   
   // Rest of Right
   context.beginPath()
   context.moveTo(w, 20)
   context.lineTo(w, h - chamfer)
   context.lineWidth = 2
   context.strokeStyle = 'rgba(79, 172, 254, 0.3)'
   context.stroke()
   
   // --- CORNERS ---
  // Bottom Right Chamfer (Bold)
  context.beginPath()
  context.moveTo(w, h - chamfer)
  context.lineTo(w - chamfer, h)
  context.lineWidth = 3
  context.strokeStyle = '#4facfe'
  context.stroke()

  // Bottom Left Chamfer (If any, currently straight)
  // Just a reinforcement at the corner
  context.beginPath()
  context.moveTo(0, h - 20)
  context.lineTo(0, h)
  context.lineTo(20, h)
  context.lineWidth = 2
  context.strokeStyle = 'rgba(79, 172, 254, 0.5)'
  context.stroke()

  // --- DECORATIVE PROTRUSIONS (Blue Accents) ---
  // Left Side Protrusion (Geometric Accent)
  const leftDecorY = h * 0.45 // Position at 45% height
  const decorH = 80
  const decorW = 3
  
  context.beginPath()
  context.moveTo(0, leftDecorY)
  context.lineTo(decorW, leftDecorY + 5)
  context.lineTo(decorW, leftDecorY + decorH - 5)
  context.lineTo(0, leftDecorY + decorH)
  context.closePath()
  context.fillStyle = '#4facfe'
  context.shadowColor = 'rgba(79, 172, 254, 0.6)'
  context.shadowBlur = 8
  context.fill()
  
  // Right Side Protrusion (Geometric Accent)
  const rightDecorY = h * 0.45
  
  context.beginPath()
  context.moveTo(w, rightDecorY)
  context.lineTo(w - decorW, rightDecorY + 5)
  context.lineTo(w - decorW, rightDecorY + decorH - 5)
  context.lineTo(w, rightDecorY + decorH)
  context.closePath()
  context.fillStyle = '#4facfe'
  context.shadowColor = 'rgba(79, 172, 254, 0.6)'
  context.shadowBlur = 8
  context.fill()

  // Header Area Fill (To unify the geometry)
   context.beginPath()
   context.moveTo(0, 0)
   context.lineTo(titleWidth, 0)
   context.lineTo(titleWidth + 20, headerH)
   context.lineTo(0, headerH)
   context.closePath()
   
   const grad = context.createLinearGradient(0, 0, titleWidth, 0)
   grad.addColorStop(0, 'rgba(79, 172, 254, 0.15)')
   grad.addColorStop(1, 'rgba(79, 172, 254, 0.0)')
   context.fillStyle = grad
   context.fill()
   
   // Restore the Geometric Outline for the Header Block (Weaker Glow)
   context.lineWidth = 2
   context.strokeStyle = '#4facfe'
   context.shadowColor = 'rgba(79, 172, 254, 0.3)'
   context.shadowBlur = 5
   context.stroke()
   
   context.restore()
 }

const animateHeader = () => {
  // 1. Draw Header (Original Logic)
  if (ctx) {
    ctx.clearRect(0, 0, canvasW, canvasH)
    
    // Draw Bottom Border Line (Glowing)
    ctx.beginPath()
    ctx.moveTo(0, canvasH - 2)
    ctx.lineTo(canvasW, canvasH - 2)
    ctx.strokeStyle = 'rgba(79, 172, 254, 0.3)'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw Pulse moving along the bottom
    const pulseW = 200
    scanLineX = (scanLineX + 2) % (canvasW + pulseW)
    const drawX = scanLineX - pulseW
    
    const grad = ctx.createLinearGradient(drawX, 0, drawX + pulseW, 0)
    grad.addColorStop(0, 'rgba(79, 172, 254, 0)')
    grad.addColorStop(0.5, 'rgba(79, 172, 254, 1)')
    grad.addColorStop(1, 'rgba(79, 172, 254, 0)')
    
    ctx.beginPath()
    ctx.moveTo(drawX, canvasH - 2)
    ctx.lineTo(drawX + pulseW, canvasH - 2)
    ctx.strokeStyle = grad
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.shadowBlur = 10
    ctx.shadowColor = '#4facfe'
    ctx.stroke()
    ctx.shadowBlur = 0
    
    // Draw Top Decoration Lines (Simplified)
    ctx.beginPath()
    ctx.moveTo(0, 2)
    ctx.lineTo(canvasW * 0.3, 2)
    ctx.lineTo(canvasW * 0.35, canvasH)
    ctx.strokeStyle = 'rgba(79, 172, 254, 0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(canvasW, 2)
    ctx.lineTo(canvasW * 0.7, 2)
    ctx.lineTo(canvasW * 0.65, canvasH)
    ctx.stroke()
  }
  
  // 2. Draw Panels
  if (panelCanvasLeft.value && ctxLeft) {
    drawTechPanel(ctxLeft, panelCanvasLeft.value.width, panelCanvasLeft.value.height, 240)
  }
  if (panelCanvasRight.value && ctxRight) {
    drawTechPanel(ctxRight, panelCanvasRight.value.width, panelCanvasRight.value.height, 180)
  }
  if (panelCanvasBottom.value && ctxBottom) {
    // Bottom panel is wider, so we give it a wider title block
    drawTechPanel(ctxBottom, panelCanvasBottom.value.width, panelCanvasBottom.value.height, 300)
  }
  
  animFrameId = requestAnimationFrame(animateHeader)
}

// ========== 导航逻辑 ==========
const handleCardClick = (item) => {
  // 所有 KPI 卡片统一跳转到堆信息页面
  router.push({ name: 'BlockInfo' })
}

const navigateToBlockInfo = (block) => {
  // 若为占位（例如堆2不存在配置），不可点击
  if (isPlaceholderRealtime(block)) return
  // 同步选择所点击的堆
  const blkNum = parseBlockId(block.value)
  try {
    blockStore.setSelectedBlockForView(`block${blkNum}`)
  } catch {}
  // 跳转到堆信息页面
  router.push({ name: 'BlockInfo' })
}

const navigateToClusterInfo = (blockId, clusterId) => {
  // 跳转到电池信息页面（簇级），并同步选中簇
  const blkNum = parseBlockId(blockId)
  const clusterKey = `${blkNum}-${clusterId}`
  try {
    clusterStore.setSelectedClusterForView(clusterKey)
  } catch (e) {
    console.warn('setSelectedClusterForView failed:', e)
  }
  router.push({ path: '/Cluster/cellData', query: { block: blkNum, cluster: clusterId } })
}

// ========== 数据获取辅助 ==========

// 获取所有可用堆
const availableBlocks = computed(() => {
  // 如果没有数据，返回默认堆1
  if (!blockStore.availableBlocks || blockStore.availableBlocks.length === 0) {
    return [{ value: 1, label: '堆1' }]
  }
  return blockStore.availableBlocks
})

const parseBlockId = (val) => {
  const s = String(val)
  return s.startsWith('block') ? parseInt(s.replace('block', '')) : parseInt(s) || 1
}

const hasBlock2 = computed(() => {
  return availableBlocks.value.some(b => parseBlockId(b.value) === 2)
})

const displayBlocksForRealtime = computed(() => {
  const list = [...availableBlocks.value]
  if (!hasBlock2.value) {
    list.push({ value: 2, label: '堆2' })
  }
  return list
})

const isPlaceholderRealtime = (block) => {
  return parseBlockId(block.value) === 2 && !hasBlock2.value
}
const selectedBlockDisplayName = computed(() => {
  const block = availableBlocks.value.find(b => `block${b.value}` === selectedBlock.value || String(b.value) === String(selectedBlock.value))
  return block ? block.label : (selectedBlock.value || '未选择')
})

// 获取指定堆的Summary数据
const getBlockSummary = (blockId) => {
  // 强制依赖 tick
  if (blockSummaryTick.value) {}

  let key = String(blockId)
  // 如果blockId是数字或不带前缀的字符串，添加block前缀
  if (!key.startsWith('block')) {
    key = `block${key}`
  }
  
  // 建立响应式依赖
  const data = pickBlockSummary(key, ['堆基本信息', '状态信息', '最大最小值', 'PCS状态', '事件记录数据', '堆硬件故障'])
  
  // 调试日志：检查是否取到数据
  // if (data.length > 0) console.log('Dashboard getBlockSummary data:', key, data)
  
  const map = {}
  data.forEach(group => {
    group.element.forEach(item => {
      map[item.key] = item.value
    })
  })
  return map
}

// 获取当前选中堆的数据 (用于KPI和中间大电池)
const currentBlockData = computed(() => {
  return getBlockSummary(selectedBlock.value || 1)
})

const getValue = (map, key, defaultValue = 0) => {
  return map[key] !== undefined ? map[key] : defaultValue
}

// ========== 核心 KPI 数据（多堆拼接显示） ==========
const kpiItems = computed(() => {
  const blocks = (availableBlocks.value && availableBlocks.value.length > 0)
    ? availableBlocks.value
    : [{ value: 'block1', label: '堆1', block: 1 }]
  
  const statusMap = {0: '静置', 1: '充电', 2: '放电', 3: '开路', 4: '自检'}
  
  const formatBlocks = (getter) => {
  const SEP = '  ' // 使用适中的EM空格增加堆间距
    if (blocks.length <= 1) {
      const m = getBlockSummary(blocks[0].value)
      return getter(m, blocks[0])
    }
    return blocks.map(b => {
      const m = getBlockSummary(b.value)
      return `${b.label}：${getter(m, b)}`
    }).join(SEP) // 使用更宽的分隔符，配合CSS white-space: pre
  }
  
  const statusText = formatBlocks((m) => {
    const s = getValue(m, 'bauWorkingMode', 0)
    return statusMap[s] || '未知'
  })
  
  const totalCharge = formatBlocks((m) => (getValue(m, 'totalChargeEnergy') / 1).toFixed(0))
  const totalDischarge = formatBlocks((m) => (getValue(m, 'totalDischargeEnergy') / 1).toFixed(0))
  const faultText = formatBlocks((m) => (getValue(m, 'stackFaultStatus', 0) > 0 ? '故障' : '正常'))
  const volt = formatBlocks((m) => (getValue(m, 'stackVoltage')).toFixed(1))
  const curr = formatBlocks((m) => (getValue(m, 'stackCurrent')).toFixed(1))
  const power = formatBlocks((m) => {
    const v = (getValue(m, 'stackVoltage')).toFixed(1)
    const c = (getValue(m, 'stackCurrent')).toFixed(1)
    return ((parseFloat(v) * parseFloat(c)) / 1000).toFixed(2)
  })
  const socVal = formatBlocks((m) => (getValue(m, 'stackSOC')).toFixed(1))
  const maxChargeP = formatBlocks((m) => (getValue(m, 'maxAllowableChargePower') / 1).toFixed(1))
  const maxDischargeP = formatBlocks((m) => (getValue(m, 'maxAllowableDischargePower') / 1).toFixed(1))
  const insResPlus = formatBlocks((m) => String(getValue(m, 'insulationResistanceRPlus', 0)))
  const insResMinus = formatBlocks((m) => String(getValue(m, 'insulationResistanceRMinus', 0)))
  
  return [
    { title: '堆运行状态', value: statusText, unit: '', icon: 'pi pi-cog', route: '/block/status' },
    { title: '累计充电量(kWh)', value: totalCharge, unit: '', icon: 'pi pi-bolt', route: '/block/energy' },
    { title: '累计放电量(kWh)', value: totalDischarge, unit: '', icon: 'pi pi-bolt', route: '/block/energy' },
    { title: '堆故障状态', value: faultText, unit: '', icon: 'pi pi-exclamation-triangle', route: '/block/fault' },
    { title: '堆电压(V)', value: volt, unit: '', icon: 'pi pi-server', route: '/block/monitor' },
    { title: '堆电流(A)', value: curr, unit: '', icon: 'pi pi-server', route: '/block/monitor' },
    { title: '堆实时功率(kW)', value: power, unit: '', icon: 'pi pi-chart-line', route: '/block/monitor' },
    { title: '堆SOC(%)', value: socVal, unit: '', icon: 'pi pi-percentage', route: '/block/monitor' },
    { title: '允许充电功率(kW)', value: maxChargeP, unit: '', icon: 'pi pi-arrow-down', route: '/block/param' },
    { title: '允许放电功率(kW)', value: maxDischargeP, unit: '', icon: 'pi pi-arrow-up', route: '/block/param' },
    { title: '绝缘电阻+(kΩ)', value: insResPlus, unit: '', icon: 'pi pi-shield', route: '/block/monitor' },
    { title: '绝缘电阻-(kΩ)', value: insResMinus, unit: '', icon: 'pi pi-shield', route: '/block/monitor' }
  ]
})

// ========== 中间大电池数据 (多堆支持) ==========

const getBlockSoc = (blockId) => {
  const map = getBlockSummary(blockId)
  const val = getValue(map, 'stackSOC', 0)
  return (val).toFixed(1)
}

const getBlockSoh = (blockId) => {
  const map = getBlockSummary(blockId)
  const val = getValue(map, 'stackSOH', 100)
  return (val).toFixed(1)
}

const getBlockFaultStatus = (blockId) => {
  const map = getBlockSummary(blockId)
  return parseInt(getValue(map, 'stackFaultStatus', 0))
}

const getBlockVoltage = (blockId) => {
  const map = getBlockSummary(blockId)
  return parseFloat(getValue(map, 'stackVoltage', 0)).toFixed(1)
}

const getBlockCurrent = (blockId) => {
  const map = getBlockSummary(blockId)
  return parseFloat(getValue(map, 'stackCurrent', 0)).toFixed(1)
}

const getFaultStatusText = (level) => {
  if (level === 0) return '无故障'
  if (level === 1) return '轻微故障'
  if (level === 2) return '一般故障'
  return '严重故障'
}

const getFaultStatusClass = (level) => {
  if (level === 0) return 'status-normal'
  if (level === 1) return 'status-minor'
  if (level === 2) return 'status-general'
  return 'status-critical'
}

const getChargeDischargeState = (blockId) => {
  const map = getBlockSummary(blockId)
  const curr = getValue(map, 'stackCurrent', 0)
  if (parseFloat(curr) > 1) return 'charging'
  if (parseFloat(curr) < -1) return 'discharging'
  return 'idle'
}

const getChargeDischargeStateText = (blockId) => {
  const state = getChargeDischargeState(blockId)
  if (state === 'charging') return '充电中'
  if (state === 'discharging') return '放电中'
  return '静置'
}

// ========== SD卡状态（版本信息） ==========
const getVersionValueByLabel = (blockKey, label) => {
  const data = pickBlockVersion(blockKey, ['版本信息'])
  const items = data['版本信息'] || []
  for (const item of items) {
    if (item.label === label) {
      // 处理scale
      if (item.scale && item.scale !== 1 && typeof item.value === 'number') {
        const places = Math.log10(item.scale)
        return (item.value / item.scale).toFixed(places)
      }
      return item.value?.toString?.() ?? item.value
    }
  }
  return ''
}

const sdCardRawStatus = computed(() => {
  const current = selectedBlock.value || (blockStore.availableBlocks[0] ? `block${blockStore.availableBlocks[0].value}` : 'block1')
  return getVersionValueByLabel(current, 'SD卡状态') || ''
})

const sdCardStatusText = computed(() => {
  const status = (sdCardRawStatus.value || '').replace(/\s*(GB|MB|KB)$/, '')
  switch (status) {
    case '0': return 'SD卡路径不存在'
    case '1': return '写成功'
    case '2': return '写失败'
    default:  return status || '未知'
  }
})

const getSdSeverityClass = () => {
  const s = (sdCardRawStatus.value || '').trim()
  if (s === '1') return 'ok'
  if (s === '2') return 'error'
  if (s === '0') return 'warn'
  return 'info'
}

const getSocHue = (soc) => {
  // 0% -> 0 (Red), 100% -> 120 (Green)
  // Hue rotate base is usually red/green. Let's assume green (120) is full.
  // If base color is green, we rotate back to red.
  // Actually simpler: 
  // Low SOC = Red, High SOC = Green.
  // In CSS filter hue-rotate, if base is Green (#52c41a ~ 100deg hue in HSL), 
  // 0 soc should be Red (0deg). So rotate -100deg.
  // Let's just return a hue value for HSL usage or rotation.
  // Simplified: 0 -> 0 (Red), 50 -> 30 (Orange), 100 -> 120 (Green).
  return (soc * 1.2).toFixed(0) 
}

// 充放电状态 (用于动画) - Deprecated single block version, keeping for safety if referenced elsewhere but template uses new ones
const chargeDischargeState = computed(() => {
  const curr = getValue(currentBlockData.value, 'stackCurrent', 0)
  if (curr > 10) return 'charging' 
  if (curr < -10) return 'discharging'
  return 'idle'
})

// ========== 底部簇列表数据 ==========

const getBlockTotalClusters = (blockId) => {
  const map = getBlockSummary(blockId)
  let count = getValue(map, 'totalClusters', 0)
  
  // 统一数据源：优先使用系统配置
  try {
    const idStr = String(blockId)
    const blkNum = idStr.startsWith('block') ? parseInt(idStr.replace('block', '')) : parseInt(idStr) || 1
    const cfg = systemConfigStore.systemConfig
    
    if (cfg) {
      if (blkNum === 1 && typeof cfg.ClusterCount1 === 'number' && cfg.ClusterCount1 > 0) {
        count = cfg.ClusterCount1
      } else if (blkNum === 2 && typeof cfg.ClusterCount2 === 'number' && cfg.ClusterCount2 > 0) {
        count = cfg.ClusterCount2
      }
    }
  } catch (e) {
    console.warn('Error reading system config for total clusters:', e)
  }
  
  // 如果最终count为0 (既没配置也没数据)，则显示0 (原逻辑是20)
  return count || 0
}

const getBlockOnlineClusters = (blockId) => {
  const map = getBlockSummary(blockId)
  return getValue(map, 'onlineClusters', 0)
}

const getBlockClusterStates = (blockId) => {
  // 强制依赖 tick
  if (clusterSummaryTick.value) {}
  if (clusterSysAbstractTick.value) {}

  // 统一堆ID格式：用于堆汇总与簇详情分别取数
  const idStr = String(blockId)
  const blkNum = idStr.startsWith('block') ? parseInt(idStr.replace('block', '')) : parseInt(idStr) || 1
  const blockSummaryKey = `block${blkNum}`

  const map = getBlockSummary(blockSummaryKey)
  // 修改默认值为0，未读取到配置时不显示
  let count = parseInt(getValue(map, 'totalClusters', 0)) || 0
  // 优先采用系统配置中的簇数量（按堆区分）
  try {
    const cfg = systemConfigStore.systemConfig
    if (cfg) {
      if (blkNum === 1 && typeof cfg.ClusterCount1 === 'number' && cfg.ClusterCount1 > 0) {
        count = cfg.ClusterCount1
      } else if (blkNum === 2 && typeof cfg.ClusterCount2 === 'number' && cfg.ClusterCount2 > 0) {
        count = cfg.ClusterCount2
      }
    }
  } catch {}
  const enable1 = getValue(map, 'EnableClusterStatus1', 0)
  const enable2 = getValue(map, 'EnableClusterStatus2', 0)
  const cutout1 = getValue(map, 'CutoutClusterStatus1', 0)
  const cutout2 = getValue(map, 'CutoutClusterStatus2', 0)
  
  const states = []
  
  for (let i = 0; i < count; i++) {
    // 状态判定
    let isEnabled = false
    let isCutout = false
    if (i < 10) {
      isEnabled = (enable1 & (1 << i)) !== 0
      isCutout = (cutout1 & (1 << i)) !== 0
    } else if (i < 20) {
      isEnabled = (enable2 & (1 << (i - 10))) !== 0
      isCutout = (cutout2 & (1 << (i - 10))) !== 0
    }

    // 统一初始化数据
    let status = 'disconnected'
    let contactorClosed = false
    let volt = '0.0'
    let curr = '0.0'
    let soc = '0.0'
    
    // 始终读取数据，不依赖 Enable 状态
    const clusterKey = `${blkNum}-${i + 1}`
    const NEED_CLASSES = ['系统信息', '电池信息', '温度信息']
    let clusterData = []
    
    try {
      clusterData = pickCluster(clusterKey, NEED_CLASSES) || []
      
      // 添加调试日志：当没有数据时，打印当前的key和尝试的结果
      if ((!clusterData || clusterData.length === 0) && i === 0) { // 仅打印第一个簇，避免日志刷屏
         console.log(`[Dashboard] No data for key: ${clusterKey}`)
         // 尝试打印所有缓存的 key 以便排查
         if (window.clusterDebug !== true) { // 避免重复打印
            import('@/composables/core/data-processing/cluster/parseClusterSummary').then(module => {
              if (module.clusterFrames && module.clusterFrames.value) {
                console.log('[Dashboard] Available keys in cache:', Array.from(module.clusterFrames.value.keys()))
              }
            })
            window.clusterDebug = true
         }
      }
    } catch (e) {
      console.warn('Error picking cluster data:', clusterKey, e)
    }
    
    let clusterCurr = 0
    let clusterVolt = 0
    let clusterSoc = 0
    // 单体概要（SYS_ABSTRACT）
    const fmt = (v, d) => {
      if (v === '–' || v === '--' || v == null) return '–'
      const n = Number(v)
      return Number.isFinite(n) ? n.toFixed(d) : '–'
    }
    const vmaxRaw = pickClusterSysAbstractValue(clusterKey, SYS_ABSTRACT_CLASSES.CELL_VOLT, SYS_ABSTRACT_LABELS.MAX_CELL_VOLT_1)
    const vminRaw = pickClusterSysAbstractValue(clusterKey, SYS_ABSTRACT_CLASSES.CELL_VOLT, SYS_ABSTRACT_LABELS.MIN_CELL_VOLT_1)
    const tmaxRaw = pickClusterSysAbstractValue(clusterKey, SYS_ABSTRACT_CLASSES.CELL_TEMP, SYS_ABSTRACT_LABELS.MAX_CELL_TEMP_1)
    const tminRaw = pickClusterSysAbstractValue(clusterKey, SYS_ABSTRACT_CLASSES.CELL_TEMP, SYS_ABSTRACT_LABELS.MIN_CELL_TEMP_1)
    const vmax = fmt(vmaxRaw, 3)
    const vmin = fmt(vminRaw, 3)
    const tmax = fmt(tmaxRaw, 1)
    const tmin = fmt(tminRaw, 1)
    
    // 状态位
    let isCharge = false
    let isDisch = false
    let isIdle = false
    let sysCurrentStatus = null // 仅使用 SysCurrentStatus (系统状态)
    
    if (clusterData && clusterData.length > 0) {
      clusterData.forEach(group => {
        if (group && group.element) {
          group.element.forEach(item => {
            if (item.key === 'ClusterCurrent') clusterCurr = item.value
            if (item.key === 'ClusterVolt') clusterVolt = item.value
            if (item.key === 'ClusterSOC') clusterSoc = item.value
            
            // 仅读取 SysCurrentStatus (系统状态)
            if (item.key === 'SysCurrentStatus') sysCurrentStatus = Number(item.value)
          })
        }
      })
      
      // 逻辑判定：严格依据 SysCurrentStatus
      if (sysCurrentStatus !== null) {
          // 0:静置, 1:充电, 2:放电, 3:断开, 4:接触器自检
          if (sysCurrentStatus === 1) isCharge = true
          else if (sysCurrentStatus === 2) isDisch = true
          else if (sysCurrentStatus === 0) isIdle = true
          // 其他状态 (如 3:断开, 4:自检) 视为断开，isCharge/isDisch/isIdle 保持 false
      }
      
      volt = (clusterVolt).toFixed(1)
      curr = (clusterCurr).toFixed(1)
      soc = (clusterSoc).toFixed(1)
    }

    // 状态判定逻辑
    if (isCutout) {
      status = 'disconnected'
      contactorClosed = false
    } else {
      if (isCharge) {
        status = 'charging'
        contactorClosed = true
      } else if (isDisch) {
        status = 'discharging'
        contactorClosed = true
      } else if (isIdle) {
        status = 'connected' // 静置
        contactorClosed = true
      } else {
        // 如果没有任何状态位，视为断开
        status = 'disconnected'
        contactorClosed = false
      }
    }

    // 统一推入状态数组，确保每个索引都有对应的模型显示
    states.push({
      id: i + 1,
      status,
      contactorClosed,
      volt,
      curr,
      soc,
      vmax,
      vmin,
      tmax,
      tmin
    })
  }
  return states
}

</script>

<style scoped lang="scss">
:global(.layout-wrapper.layout-fullscreen .layout-main-container) {
  margin-left: 0 !important;
  padding: 0 !important;
  margin-top: 0 !important;
}

.dashboard-container {
  width: 100%;
  height: auto;
  min-height: 100vh;
  background-color: var(--surface-ground);
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Header - Tech HUD Style */
.tech-header-container {
  height: 80px;
  position: relative;
  width: 100%;
  flex-shrink: 0;
  z-index: 10;
  /* Dark background for the whole strip */
  background: linear-gradient(to bottom, #0d1623 0%, rgba(13, 22, 35, 0.8) 100%);
}

.header-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 1;
}

.header-content {
  position: relative;
  z-index: 2;
  width: 100%; height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

/* Wings */
.hud-wing {
  flex: 1;
  height: 100%;
  position: relative;
}

.wing-content {
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.left-wing .wing-content { justify-content: flex-start; }
.right-wing .wing-content { justify-content: flex-end; gap: 20px; }

/* Center */
.hud-center {
  flex: 0 0 auto;
  min-width: 400px;
  height: 100%;
  display: flex;
  justify-content: center;
  background: rgba(13, 22, 35, 0.5);
  clip-path: polygon(0 0, 100% 0, 85% 100%, 15% 100%);
  position: relative;
  
  /* Top accent */
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 100%; height: 2px;
    background: #4facfe;
    box-shadow: 0 0 10px #4facfe;
  }
}

.title-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 10px;
}

.main-title {
  font-size: 2rem;
  font-weight: bold;
  color: #fff;
  letter-spacing: 2px;
  margin: 0;
  text-shadow: 0 0 10px rgba(79, 172, 254, 0.5);
}

.sub-title {
  font-size: 0.7rem;
  color: #4facfe;
  letter-spacing: 4px;
  opacity: 0.7;
  margin-top: 4px;
}

/* Modules (Slanted) */
.status-module, .time-module {
  background: rgba(16, 33, 58, 0.8);
  border: 1px solid rgba(79, 172, 254, 0.3);
  transform: skewX(-20deg);
  padding: 5px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 140px;
  height: 50px;
  transition: all 0.3s;
  cursor: default;
  position: relative;
  
  &:hover {
    background: rgba(79, 172, 254, 0.1);
    border-color: #4facfe;
    box-shadow: 0 0 15px rgba(79, 172, 254, 0.2);
  }
}

.status-module {
  cursor: pointer;
  &.connected { border-color: #52c41a; box-shadow: 0 0 5px rgba(82, 196, 26, 0.2); }
  &.disconnected { border-color: #ff4d4f; }
}

/* SD卡状态模块（右上角） */
.sd-status-module {
  background: rgba(16, 33, 58, 0.8);
  border: 1px solid rgba(79, 172, 254, 0.3);
  transform: skewX(-20deg);
  padding: 5px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 130px;
  height: 50px;
  transition: all 0.3s;
  
  &.ok { border-color: #52c41a; box-shadow: 0 0 5px rgba(82, 196, 26, 0.2); }
  &.warn { border-color: #faad14; box-shadow: 0 0 5px rgba(250, 173, 20, 0.2); }
  &.error { border-color: #ff4d4f; box-shadow: 0 0 5px rgba(255, 77, 79, 0.2); }
  &.info { border-color: rgba(79, 172, 254, 0.3); }
  
  /* 文本可读性增强 */
  .module-text {
    .label { font-size: 0.75rem; color: #fff; }
    .value { font-size: 1rem; font-weight: 700; color: #fff; }
  }
}

/* Un-skew content */
.module-icon, .module-text, .time-main, .date-sub, .system-indicator {
  transform: skewX(20deg);
}

.module-icon {
  font-size: 1.5rem;
  margin-right: 10px;
  color: inherit; /* Follow parent color */
}

.module-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  .label { font-size: 0.6rem; color: #aaa; }
  .value { font-size: 0.9rem; font-weight: bold; color: #fff; }
}

.time-module {
  flex-direction: column;
  align-items: flex-end; /* Align right inside the skewed box */
  min-width: 120px;
  
  .time-main {
    font-size: 1.2rem;
    font-weight: bold;
    color: #fff;
    font-family: 'Segoe UI', monospace;
  }
  .date-sub {
    font-size: 0.7rem;
    color: #4facfe;
  }
}

/* Logo Module (Left) */
.logo-module {
  background: linear-gradient(90deg, rgba(16, 33, 58, 0.95), rgba(16, 33, 58, 0.6));
  border-left: 4px solid #4facfe;
  border-bottom: 1px solid rgba(79, 172, 254, 0.3);
  transform: skewX(20deg); /* Reversed direction */
  padding: 8px 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 220px;
  height: 70px;
  margin-left: 20px;
  position: relative;
  transition: all 0.3s;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  
  /* Decorative corner */
  &::after {
     content: '';
     position: absolute;
     top: 0; right: 0; width: 10px; height: 10px;
     border-top: 2px solid #4facfe;
     border-right: 2px solid #4facfe;
     opacity: 0.9;
  }
  
  &:hover {
    box-shadow: 0 0 25px rgba(79, 172, 254, 0.2);
    background: linear-gradient(90deg, rgba(16, 33, 58, 1), rgba(16, 33, 58, 0.8));
    border-left-color: #fff;
  }
}

.logo-text {
  transform: skewX(-20deg); /* Counter-skew reversed */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.2;
}

.logo-main {
  font-size: 2.2rem;
  font-weight: 900;
  color: #fff;
  font-family: 'Segoe UI', sans-serif;
  letter-spacing: 3px;
  text-shadow: 0 0 15px rgba(79, 172, 254, 0.8);
  background: linear-gradient(to bottom, #ffffff, #dff6ff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 4px;
}

.logo-sub {
  font-size: 0.75rem;
  color: #a6d8ff;
  letter-spacing: 2px;
  font-weight: 700;
  opacity: 1;
  text-transform: uppercase;
  text-shadow: 0 0 5px rgba(0,0,0,0.5);
}


/* Content */
.dashboard-content {
  flex: 1;
  padding: 10px 20px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 15px; /* 增加间距 */
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 15px;
  height: 130px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.kpi-card {
  position: relative;
  background: rgba(16, 33, 58, 0.7);
  filter: drop-shadow(0 0 1px rgba(79, 172, 254, 0.3));
  clip-path: polygon(
    15px 0, 100% 0, 
    100% calc(100% - 15px), calc(100% - 15px) 100%, 
    0 100%, 0 15px
  );
  padding: 5px 15px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  
  /* Corner markers via background gradient on the SHARP corners (TR, BL) */
  background-image: 
    linear-gradient(to left, #4facfe 2px, transparent 2px),
    linear-gradient(to bottom, #4facfe 2px, transparent 2px),
    linear-gradient(to right, #4facfe 2px, transparent 2px),
    linear-gradient(to top, #4facfe 2px, transparent 2px);
  background-position: 
    top right, top right,
    bottom left, bottom left;
  background-size: 10px 10px;
  background-repeat: no-repeat;
  
  /* Pseudo-elements for wrapping border effect */
  &::before, &::after {
    content: '';
    position: absolute;
    background: #4facfe;
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    opacity: 0;
    box-shadow: 0 0 8px #4facfe;
  }

  /* Top Line */
  &::before {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0%;
    height: 2px;
  }
  
  /* Bottom Line */
  &::after {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0%;
    height: 2px;
  }

  /* We need two more for Left and Right to simulate wrapping.
     Since we can't add DOM elements easily, we'll use background-image manipulation on hover 
     OR we can use a trick with box-shadow if clip-path wasn't there.
     With clip-path, box-shadow is clipped. 
     Best approach with existing DOM: Use background gradients that expand.
  */
}

.kpi-card:hover {
  background: rgba(16, 33, 58, 0.9);
  filter: drop-shadow(0 0 8px rgba(79, 172, 254, 0.8)); /* Stronger glow around the whole shape */
  transform: translateY(-3px);
  
  /* Expand Top/Bottom Lines */
  &::before {
    width: 100%;
    opacity: 1;
    box-shadow: 0 0 12px #4facfe;
  }
  &::after {
    width: 100%;
    opacity: 1;
    box-shadow: 0 0 12px #4facfe;
  }
  
  /* Add Left/Right borders via background gradient animation */
  background-image: 
    linear-gradient(#4facfe, #4facfe), /* Left */
    linear-gradient(#4facfe, #4facfe), /* Right */
    linear-gradient(to left, #4facfe 2px, transparent 2px), /* Corner markers kept? No, override */
    linear-gradient(to bottom, #4facfe 2px, transparent 2px),
    linear-gradient(to right, #4facfe 2px, transparent 2px),
    linear-gradient(to top, #4facfe 2px, transparent 2px);
    
  background-size: 
    2px 100%, /* Left height */
    2px 100%, /* Right height */
    10px 10px, 10px 10px, 10px 10px, 10px 10px;
    
  background-position: 
    left center,
    right center,
    top right, top right,
    bottom left, bottom left;
    
  background-repeat: no-repeat;
}
  
  /* Remove old pseudo-elements logic */

  
  .kpi-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(79, 172, 254, 0.1);
    border: 1px solid rgba(79, 172, 254, 0.3);
    border-radius: 4px;
    color: #4facfe;
    font-size: 1.1rem;
    box-shadow: 0 0 8px rgba(79, 172, 254, 0.1);
  }

  .kpi-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex: 1;
    min-width: 0;
  }

  .kpi-title {
    font-size: 0.85rem;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }
  
  .kpi-value-container {
    display: flex;
    align-items: baseline;
    gap: 4px;
    width: 100%;
    
  .kpi-value {
    font-size: 1.3rem;
    font-weight: bold;
    color: #fff;
    font-family: 'Segoe UI', sans-serif;
    text-shadow: 0 0 8px rgba(79, 172, 254, 0.6);
    line-height: 1.2;
    white-space: pre; /* 保留空格用于多堆值的分隔 */
  }
    
    .kpi-unit {
      font-size: 0.75rem;
      color: #4facfe;
      opacity: 0.8;
    }
  }


/* Main Section */
.main-section {
  flex: 3;
  display: flex; /* 改为 Flex 布局支持多堆 */
  flex-direction: row;
  gap: 20px;
  min-height: 0;
  overflow: hidden; /* 保持单堆样式，不显示滚动条 */
  padding-bottom: 0;
}

/* Tech Border Box (Shared Style for other areas) */
.tech-border-box {
  position: relative;
  background: rgba(13, 22, 35, 0.6);
  border: 1px solid rgba(79, 172, 254, 0.2);
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(79, 172, 254, 0.05);
  backdrop-filter: blur(5px);
  
  /* Top accent */
  &::before {
    content: '';
    position: absolute;
    top: -1px; left: 0; width: 100%; height: 2px;
    background: linear-gradient(90deg, transparent, #4facfe, transparent);
    box-shadow: 0 0 10px #4facfe;
    z-index: 1;
  }

  /* Corner Accents */
  &::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    z-index: 1;
    background: 
      linear-gradient(135deg, #4facfe 4px, transparent 4px) 0 0,
      linear-gradient(-135deg, #4facfe 4px, transparent 4px) 100% 0,
      linear-gradient(45deg, #4facfe 4px, transparent 4px) 0 100%,
      linear-gradient(-45deg, #4facfe 4px, transparent 4px) 100% 100%;
    background-size: 8px 8px;
    background-repeat: no-repeat;
    opacity: 0.8;
  }
}

/* Geometric Structure Box (Panel Style - Canvas Based) */
.geo-structure-box {
  position: relative;
  z-index: 0;
  padding: 15px;
  overflow: visible;
  background: transparent;
  border: none;
  box-shadow: none; /* Canvas handles the shadow/glow */
}

.panel-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

/* Header - Positioned to match Canvas Title Area */
.geo-structure-box .card-header {
  position: absolute;
  top: 0;
  left: 0;
  height: 32px; /* Matches headerH in drawTechPanel */
  display: flex;
  align-items: center;
  z-index: 2;
  padding-left: 15px;
  width: 100%;
  pointer-events: none; /* Let clicks pass through if needed, but text selects */
  
  h3 {
    margin: 0;
    font-size: 1rem;
    color: #fff;
    font-weight: bold;
    letter-spacing: 1px;
    text-shadow: 0 0 5px rgba(79, 172, 254, 0.8);
    white-space: nowrap;
    position: relative;
    z-index: 1;
    pointer-events: auto;
  }
}

/* Clean up old deco elements that might interfere */
.header-deco-line {
  display: none;
}

/* Adjustments for content */
.geo-structure-box .battery-display-area,
.geo-structure-box .placeholder-content {
  margin-top: 5px; /* 整体上移 */
}

.status-row-container {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 240px; /* Ensure minimum height */
}

.status-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 15px;
  overflow: hidden;
}

.status-col.left-col { overflow: hidden; }

/* 多堆并排容器：固定两列 */
.blocks-container {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
  margin-top: 20px; /* 整体上移，减少与标题的间距 */
}

.placeholder-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(79, 172, 254, 0.3);
  margin-top: 10px;
  border-radius: 4px;
  color: rgba(79, 172, 254, 0.5);
  font-family: 'Segoe UI', sans-serif;
  letter-spacing: 1px;
}

.center-status-card {
  flex: 1; /* 均分空间 */
  min-width: 320px; /* 最小宽度 */
  cursor: pointer;
  transition: transform 0.3s;
  
  &:hover {
    border-color: rgba(79, 172, 254, 0.4);
    box-shadow: inset 0 0 30px rgba(79, 172, 254, 0.1);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 10px;
  
  .decoration-line {
    width: 4px;
    height: 16px;
    background: #4facfe;
    border-radius: 2px;
    box-shadow: 0 0 10px #4facfe;
  }
  
  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    letter-spacing: 1px;
    text-shadow: 0 0 5px rgba(0,0,0,0.5);
  }
}

/* 3D Battery Model */
.battery-display-area {
  flex: 1;
  display: flex;
  flex-direction: row; /* Ensure row layout */
  align-items: center;
  justify-content: flex-start; /* Move to left */
  gap: 10px; /* Integrated spacing for compact layout */
  padding: 0 0 10px 20px; /* 上边距减小，整体上移 */
  overflow: hidden; /* Prevent overflow triggering scrollbars */
}

/* Electrical Params (New) */
.electrical-params {
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 130px;
  margin-left: 8px; /* 与电池模型拉开一点距离 */
}

.param-card {
  background: rgba(13, 22, 35, 0.5);
  border-radius: 6px;
  padding: 10px 15px;
  position: relative;
  border-left: 3px solid transparent;
  transition: all 0.3s;
  
  &:hover {
    transform: translateX(5px);
    background: rgba(13, 22, 35, 0.8);
  }
}

.param-card.voltage-card {
  border-left-color: #00e5ff;
  background: linear-gradient(90deg, rgba(0, 229, 255, 0.05), transparent);
}

.param-card.current-card {
  border-left-color: #faad14;
  background: linear-gradient(90deg, rgba(250, 173, 20, 0.05), transparent);
}

.param-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  color: #fff; /* White text */
  font-size: 0.9rem; /* Increased size */
  font-weight: 500;
  
  i { font-size: 1rem; }
}

.voltage-card .param-header i { color: #00e5ff; }
.current-card .param-header i { color: #faad14; }

.param-value-box {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 5px;
  
  .val {
    font-size: 1.5rem;
    font-weight: bold;
    color: #fff;
    font-family: 'Segoe UI', sans-serif;
    letter-spacing: 0.5px;
  }
  
  .unit {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
  }
}

.param-progress {
  position: relative;
  height: 3px;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1.5px;
  overflow: hidden;
  
  .fill {
    position: absolute;
    left: 0;
    height: 100%;
    width: 100%;
    background: currentColor;
    box-shadow: 0 0 3px currentColor;
  }
}

.voltage-card .param-progress { color: #00e5ff; }
.current-card .param-progress { color: #faad14; }

@keyframes scan-bar {
  0% { width: 40%; opacity: 0.6; }
  100% { width: 70%; opacity: 1; }
}


.battery-model-3d {
  width: 100px; /* Reduced from 140px */
  height: 160px; /* Reduced from 240px */
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.battery-block-label {
  margin-top: 6px;
  font-size: 0.8rem;
  color: #fff;
  opacity: 0.85;
  text-align: center;
}

.battery-cap {
  width: 40px; /* Reduced from 60px */
  height: 10px; /* Reduced from 15px */
  background: #2a2f3a;
  border: 1px solid #555;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  box-shadow: inset 0 3px 3px rgba(255,255,255,0.1);
}

.battery-glass-body {
  width: 100%;
  flex: 1;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  background: rgba(0,0,0,0.3);
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 15px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.05);
  
  /* 玻璃反光 */
  &::after {
    content: '';
    position: absolute;
    top: 0; right: 8px; bottom: 0; width: 15px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
    pointer-events: none;
  }
}

.battery-liquid {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: #52c41a;
  transition: height 0.8s ease-in-out;
  box-shadow: 0 0 20px currentColor;
  opacity: 0.85;
  
  /* Wave Surface */
  .liquid-surface {
    position: absolute;
    top: -10px;
    left: 0;
    width: 200%;
    height: 20px;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 100' preserveAspectRatio='none'%3E%3Cpath d='M0,50 Q250,10 500,50 T1000,50 V100 H0 Z' fill='rgba(255,255,255,0.4)' /%3E%3C/svg%3E");
    background-size: 50% 100%;
    background-repeat: repeat-x;
    animation: wave-move 2s linear infinite;
  }
  
  /* 气泡动画 */
  .liquid-bubbles {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px);
    background-size: 10px 10px;
    opacity: 0.4;
    animation: bubbles-rise-anim 3s linear infinite;
    z-index: 2;
  }
}

@keyframes wave-move {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes bubbles-rise-anim {
  0% { background-position: 0 100%; }
  100% { background-position: 0 0; }
}

.battery-overlay-content {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.9);
  
  .soc-number {
    display: flex;
    align-items: baseline;
    .val { font-size: 1.8rem; font-weight: bold; font-family: 'Segoe UI'; } /* Reduced font size */
    .unit { font-size: 0.8rem; margin-left: 2px; opacity: 0.8; }
  }
  
  .soc-label {
    font-size: 0.7rem;
    opacity: 0.7;
    margin-bottom: 5px;
  }
  
  .power-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 0.7rem;
    background: rgba(0,0,0,0.4);
    padding: 2px 6px;
    border-radius: 8px;
    
    i { font-size: 1rem; animation: pulse 1s infinite; }
    .charging-icon { color: #4facfe; }
    .discharging-icon { color: #faad14; }
  }
}

/* Status Rings (SVG) */
.status-rings {
  display: flex;
  flex-direction: column; /* Keep vertical for SOH and Efficiency */
  gap: 15px;
  justify-content: center;
  /* margin-left: 15px; Removed spacing, handled by gap */
}

.ring-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tech-ring {
  width: 60px; /* Reduced from 70px */
  height: 60px;
  position: relative;
  
  .circular-chart {
    display: block;
    margin: 0 auto;
    max-width: 100%;
    max-height: 100%;
  }
  
  .circle-bg {
    fill: none;
    stroke: #1a1f2e;
    stroke-width: 3.8;
  }
  
  .circle {
    fill: none;
    stroke-width: 2.8;
    stroke-linecap: round;
    stroke: #52c41a; /* Default color */
    animation: progress 1s ease-out forwards;
    /* filter: drop-shadow(0 0 2px #52c41a); Reduced shadow */
  }
  
  .circular-chart.blue .circle {
    stroke: #1890ff;
    /* filter: drop-shadow(0 0 2px #1890ff); */
  }
  
  .ring-text {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    
    .val { font-size: 0.9rem; font-weight: bold; color: #fff; }
    .unit { font-size: 0.8rem; color: #ddd; }
  }
}

.ring-label {
  font-size: 0.9rem;
  color: #fff;
  letter-spacing: 1px;
  font-weight: 500;
  margin-top: 4px;
}

/* Ring Status Colors */
.circular-chart.status-normal .circle { stroke: #52c41a; }
.circular-chart.status-minor .circle { stroke: #faad14; }
.circular-chart.status-general .circle { stroke: #fa8c16; }
.circular-chart.status-critical .circle { stroke: #ff4d4f; animation: pulse-ring 1s infinite; }

@keyframes pulse-ring {
  0% { opacity: 1; stroke-width: 2.8; }
  50% { opacity: 0.8; stroke-width: 3.5; }
  100% { opacity: 1; stroke-width: 2.8; }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes move-down {
  0% { transform: translateY(-5px); opacity: 0; }
  50% { opacity: 1; transform: translateY(0); }
  100% { transform: translateY(5px); opacity: 0; }
}

@keyframes move-up {
  0% { transform: translateY(5px); opacity: 0; }
  50% { opacity: 1; transform: translateY(0); }
  100% { transform: translateY(-5px); opacity: 0; }
}

@keyframes flow-down {
  0% { background-position: 0 -20px; }
  100% { background-position: 0 0; }
}

@keyframes flow-up {
  0% { background-position: 0 0; }
  100% { background-position: 0 -20px; }
}

@keyframes spark-pulse {
  0% { opacity: 0.8; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
}

/* Bottom Section */
.bottom-section {
  flex: 0 0 auto;
  /* Tech border box applied via class */
  display: flex;
  flex-direction: column;
  min-height: auto;
  overflow: visible;
  padding-top: 35px; /* Increase padding to clear the header */
}

.heaps-container {
  flex: 0 0 auto;
  overflow: visible;
  display: flex;
  flex-direction: column; /* Stack stacks vertically */
  gap: 20px;
  padding-right: 5px;
  padding-top: 2px; /* Reduced top spacing above heap-title */
  
  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-track { background: #1a1f2e; }
  &::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
}

.heap-section {
  width: 100%;
  /* Removed individual card styling to unify into one container */
  display: flex;
  flex-direction: column;
}

.block-status-item.placeholder {
  opacity: 0.55;
  pointer-events: none; /* 占位不可点击 */
}

.heap-title {
  margin-bottom: 8px;
  font-size: 1rem;
  color: #4facfe;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(79, 172, 254, 0.2);
  padding-bottom: 4px;
  
  .heap-name {
    font-weight: bold;
    text-shadow: 0 0 5px rgba(79, 172, 254, 0.5);
  }
  
  .heap-info-text {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
  }
}


.clusters-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center; /* Center clusters */
  padding: 10px 0;
}

.cluster-battery {
  width: 75px;
  height: 140px;
  margin-top: 43px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  
  /* Busbar Logic for row edges (classes assigned via JS) */
  &.row-first .busbar-connector {
     left: 50%;
     right: -60px;
     border-top-left-radius: 4px;
     border-bottom-left-radius: 4px;
  }
  &.row-last .busbar-connector {
     left: -60px;
     right: 50%;
     border-top-right-radius: 4px;
     border-bottom-right-radius: 4px;
  }
  &.row-first.row-last .busbar-connector {
     left: 0;
     right: 0;
     border-top-left-radius: 4px;
     border-bottom-left-radius: 4px;
     border-top-right-radius: 4px;
     border-bottom-right-radius: 4px;
  }

  /* Disconnected State Opacity - Removed as requested */
  /* &.disconnected { opacity: 0.6; } */

  /* Scheme A: Dark Industrial Conduit Styles */
  .holo-conduit {
    position: absolute;
    top: -50px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 50px; /* Reduced from 60px to shorten lower tube */
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 5;
  }

  /* Busbar Logic - Matched to Conduit Texture */
  .busbar-connector {
    position: absolute;
    top: -4px;
    height: 8px;
    /* Vertical gradient for horizontal cylinder effect, matching tube colors */
    background: linear-gradient(180deg, #444 0%, #999 40%, #ccc 50%, #999 60%, #444 100%);
    border-top: 1px solid #333;
    border-bottom: 1px solid #333;
    box-shadow: 0 1px 2px rgba(0,0,0,0.5);
    z-index: 2; /* Above conduit */
    left: -65px; 
    right: -65px;
  }
  
  /* Upper Conduit Segment (Fixed) */
  .conduit-upper {
    width: 8px;
    height: 26px;
    
    /* Metal Texture Pipe */
    background: linear-gradient(90deg, #3a3a3a 0%, #666 42%, #5b5b5b 50%, #666 58%, #3a3a3a 100%);
    border-left: 1px solid #333;
    border-right: 1px solid #333;
    
    position: relative;
    overflow: hidden;
    margin-top: -2.3px;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    box-shadow: inset 0 0 1px rgba(0,0,0,0.3);
    z-index: 1; /* Below busbar (z-index 2) */
  }

  /* Connection Joint (Pivot) - Positioned at end of Upper Conduit */
  .conduit-joint {
    width: 10px; /* Kept original width, slightly wider than tube */
    height: 4px; /* Kept original height */
    background: linear-gradient(90deg, #333, #666, #333);
    border: 1px solid #222;
    border-radius: 1px;
    margin-top: -1px; /* Center on the junction */
    z-index: 11; /* Top layer */
    box-shadow: 0 1px 2px rgba(0,0,0,0.5);
    
    /* Rotation Removed - Static Joint */
    transform: none;
  }
  
  /* Lower Conduit Segment (Fixed) */
  .conduit-lower {
    flex: 1; /* Takes remaining space */
    width: 8px; /* Match Upper Conduit width */
    
    /* Metal Texture Pipe */
    background: linear-gradient(90deg, #3a3a3a 0%, #666 42%, #7a7a7a 50%, #666 58%, #3a3a3a 100%);
    border-left: 1px solid #333;
    border-right: 1px solid #333;
    
    position: relative;
    overflow: hidden;
    margin-top: 10px; /* Reduce gap to keep alignment with extended upper conduit */
    box-shadow: inset 0 0 1px rgba(0,0,0,0.3);
  }
  
  /* Removed old conduit-beam styles */

  /* Active/Charging State - Inner Glow for Upper/Lower Conduits */
  .holo-conduit.active .conduit-upper,
  .holo-conduit.active .conduit-lower {
    box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  /* Beam Core - The Energy (Silver/White) */
  .beam-core {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #fff;
    opacity: 0;
    transition: opacity 0.3s;
    filter: blur(3px);
  }

  .holo-conduit.active .beam-core {
    opacity: 0.1; /* Faint glow when connected */
  }

  .holo-conduit.charging .beam-core {
    background: #fff;
    box-shadow: 0 0 12px rgba(255, 255, 255, 1.0); /* Stronger glow */
    opacity: 0.8; /* Increased opacity */
  }

  .holo-conduit.discharging .beam-core {
    background: #fff;
    box-shadow: 0 0 12px rgba(255, 255, 255, 1.0); /* Stronger glow */
    opacity: 0.8; /* Increased opacity */
  }

  .flow-arrows {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-size: 100% 72px;
    background-repeat: repeat-y;
    z-index: 2;
    opacity: 1.0; /* Full opacity for arrows */
    mix-blend-mode: screen;
    filter: brightness(1.45) contrast(1.15) drop-shadow(0 0 4px rgba(255,255,255,1)) drop-shadow(0 0 1px rgba(0,0,0,0.35));
  }



  .holo-conduit.charging .flow-arrows {
    animation: flow-down 2s linear infinite;
    /* Down Arrows (Group of 3) */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 60' fill='white'%3E%3Cpath d='M4 5 L12 13 L20 5 L20 9 L12 17 L4 9 Z' /%3E%3Cpath d='M4 20 L12 28 L20 20 L20 24 L12 32 L4 24 Z' /%3E%3Cpath d='M4 35 L12 43 L20 35 L20 39 L12 47 L4 39 Z' /%3E%3C/svg%3E");
  }

  .holo-conduit.discharging .flow-arrows {
    animation: flow-up 2s linear infinite;
    /* Up Arrows (Group of 3) */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 60' fill='white'%3E%3Cpath d='M4 17 L12 9 L20 17 L20 13 L12 5 L4 13 Z' /%3E%3Cpath d='M4 32 L12 24 L20 32 L20 28 L12 20 L4 28 Z' /%3E%3Cpath d='M4 47 L12 39 L20 47 L20 43 L12 35 L4 43 Z' /%3E%3C/svg%3E");
  }

  /* Mechanical Switch Styles */
  .mechanical-switch {
    position: absolute;
    top: 24px; /* Adjusted to align with increased Upper Conduit length */
    left: 50%;
    transform: translateX(-50%);
    width: 16px;
    height: 16px;
    z-index: 10; /* Below joint */
    pointer-events: none;
  }

  .switch-blade {
    position: absolute;
    top: 0; /* Anchor to hinge point */
    left: 50%;
    width: 5px;
    height: 18px; /* Shortened blade length */
    background: #5b5b5b;
    border: 1px solid #333;
    border-radius: 1px;
    
    transform-origin: top center; /* Hinge at top */
    transform: translateX(-50%) rotate(-45deg); /* Open state */
    transition: transform 0.3s cubic-bezier(0.4, 2, 0.55, 0.44);
    box-shadow: none;
    overflow: hidden; /* Contain particles */
  }
  
  /* Particle Flow inside Switch */
  .switch-blade .beam-core {
    opacity: 0; /* Hidden by default */
  }
  
  /* Only show beam when closed or carefully managed? 
     Actually, if it's open, the beam inside the blade will rotate with it. 
     This is physically correct for a conductive blade carrying charge! 
     But usually charge only flows when closed. 
     So we hide it when open, show when closed/charging.
  */
  .mechanical-switch.closed .switch-blade .beam-core {
      opacity: 0.1; /* Match .holo-conduit.active .beam-core */
  }


  /* Sync Flow Animation Phase */
  .switch-blade .flow-arrows {
    background-position-y: -24px; /* Offset to match updated vertical position */
  }

  /* Charging/Discharging States for Switch Blade Particles */
  .holo-conduit.charging .mechanical-switch.closed .switch-blade .beam-core {
    background: #fff;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
    opacity: 0.4;
  }
  
  .holo-conduit.discharging .mechanical-switch.closed .switch-blade .beam-core {
    background: #fff;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
    opacity: 0.4;
  }
  
  /* Flow Arrows Animation for Switch */
  .holo-conduit.charging .mechanical-switch.closed .switch-blade .flow-arrows {
     animation: flow-down 1s linear infinite;
     background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 60' fill='white'%3E%3Cpath d='M4 5 L12 13 L20 5 L20 9 L12 17 L4 9 Z' /%3E%3Cpath d='M4 20 L12 28 L20 20 L20 24 L12 32 L4 24 Z' /%3E%3Cpath d='M4 35 L12 43 L20 35 L20 39 L12 47 L4 39 Z' /%3E%3C/svg%3E");
  }
  
  .holo-conduit.discharging .mechanical-switch.closed .switch-blade .flow-arrows {
     animation: flow-up 1s linear infinite;
     background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 60' fill='white'%3E%3Cpath d='M4 17 L12 9 L20 17 L20 13 L12 5 L4 13 Z' /%3E%3Cpath d='M4 32 L12 24 L20 32 L20 28 L12 20 L4 28 Z' /%3E%3Cpath d='M4 47 L12 39 L20 47 L20 43 L12 35 L4 43 Z' /%3E%3C/svg%3E");
  }

  /* Switch Handle (Insulator) */
  .switch-blade::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 3px; /* Increased from 5px */
    height: 3px;
    background: linear-gradient(to bottom, #333, #111);
    border: 1px solid #000;
    border-radius: 1px;
    z-index: 20;
  }
  
  .mechanical-switch.closed .switch-blade {
    width: 8px;
    transform: translateX(-50%) rotate(0deg); /* Closed - Aligns with tube */
    box-shadow: inset 0 0 2px rgba(0,0,0,0.5); /* Match tube shadow */
    border-color: #333; /* Match tube border */
  }

  /* Internal Info Overlay */
  .cluster-overlay-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    gap: 2px;
    padding-bottom: 6px;
    
    .data-row {
      font-size: 1rem; /* 与 SOC 一致 */
      font-weight: bold;
      color: #fff;
      text-shadow: 0 0 5px rgba(255, 255, 255, 0.25);
      line-height: 1.1;
      .val { margin-right: 2px; }
      .unit { font-size: 0.6rem; opacity: 0.7; }
    }
    
    .soc-row {
      margin-top: 0px;
      font-size: 1rem;
      font-weight: bold;
      color: #fff;
      text-shadow: 0 0 5px rgba(82, 196, 26, 0.8);
      .unit { font-size: 0.6rem; margin-left: 2px; }
    }
    
    .summary-row {
      margin-top: 2px;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.9);
      .val { margin: 0 1px; }
      .unit { font-size: 0.6rem; opacity: 0.7; margin-left: 0; }
      .sep { opacity: 0.5; margin: 0 4px; }
    }
    
    .power-status.mini {
       margin-top: 2px;
       font-size: 0.6rem;
       padding: 1px 4px;
       background: rgba(0,0,0,0.6);
       border-radius: 4px;
       
       i { font-size: 0.8rem; }
    }
  }

  .cluster-label-text {
    margin-top: 5px;
    font-size: 0.85rem;
    color: #a6b0c3;
    text-align: center;
  }
}

@keyframes flow-down {
  from { background-position: 0 -60px; }
  to { background-position: 0 0; }
}

@keyframes flow-up {
  from { background-position: 0 0; }
  to { background-position: 0 -60px; }
}

@keyframes pulse-red {
  0% { opacity: 0.6; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0.6; transform: scale(0.9); }
}

.chart-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  position: relative;
}

.mock-chart-line {
  width: 80%;
  height: 2px;
  background: #4facfe;
  position: relative;
  
  &::before, &::after {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    background: #4facfe;
    border-radius: 50%;
    top: -4px;
  }
  &::before { left: 0; }
  &::after { right: 0; }
}

.mock-bar-chart {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  height: 60%;
  
  .bar {
    width: 20px;
    background: linear-gradient(to top, #4facfe, #00f2fe);
    border-radius: 4px 4px 0 0;
    opacity: 0.8;
  }
}
  /* 调整布局，解决重叠 */
  :deep(.main-section) {
    display: flex !important;
  }
  
  :deep(.kpi-grid) {
    height: 110px !important;
  }
</style>
