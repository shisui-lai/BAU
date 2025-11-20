<script setup>  
import { ref, reactive, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated, watch } from 'vue'
import { throttle } from 'lodash'
import Dropdown  from 'primevue/dropdown'
import Button    from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import SystemAbstract from './SystemAbstract.vue'
import { useI18n } from 'vue-i18n'

import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'
const { clusterOptions, selectedCluster,
      ensureClusterOption, replaceClusterOptions } = useClusterSelect()
import cluster from './version.vue' 
import { pickCluster        } from '@/composables/core/data-processing/cluster/parseClusterSummary'
import { pickPack           } from '@/composables/core/data-processing/cluster/parsePackSummary'
import { parsePackSummary }    from '@/composables/core/data-processing/cluster/parsePackSummary'
import { parseClusterSummary }    from '@/composables/core/data-processing/cluster/parseClusterSummary'

const { t } = useI18n()

  function onPackSummary (_e, msg) {
    parsePackSummary(msg)
  }

  function onClusterSummary (_e, msg) {
    parseClusterSummary(msg)
  }

/* ────────── 常量 ────────── */
const DATA_TYPE_MAP = computed(() => ({
  CELL_VOLT: { label: t('batteryInfo.dataTypes.cellVolt'),  decimals: 3 },
  CELL_TEMP: { label: t('batteryInfo.dataTypes.cellTemp'),  decimals: 1 },
  CELL_SOC : { label: t('batteryInfo.dataTypes.cellSOC'),   decimals: 1 },
  CELL_SOH : { label: t('batteryInfo.dataTypes.cellSOH'),   decimals: 1 },
  BMU_VOLT:         { label: t('batteryInfo.dataTypes.bmuVolt'),     decimals: 1 },
  BMU_TEMP:         { label: t('batteryInfo.dataTypes.bmuTemp'),     decimals: 1 },
  BMU_PLUGIN_TEMP:  { label: t('batteryInfo.dataTypes.bmuPluginTemp'),     decimals: 1 },
  BMU_SOC:          { label: t('batteryInfo.dataTypes.bmuSOC'),      decimals: 1 },    // 协议修改新增
  BMU_PRODUCT_CODE: { label: t('batteryInfo.dataTypes.bmuProductCode'),   decimals: -1 },  // 协议修改新增
  // BMU_PLUGIN_TEMP2:  { label: '动力接插件温度2',     decimals: 1 }
  //decimals 保留小数位数，-1 表示不显示小数
}))

/* ────────── 限流配置 ────────── */
const THROTTLE_CONFIG = {
  CELL_DATA: 2000,      // 单体数据更新间隔：1000ms（每秒最多1次更新）
  CONFIG_UPDATE: 2000,  // 配置更新间隔：1000ms
  SUMMARY_DATA: 2000    // 概要数据更新间隔：1000ms
}

/* ────────── 内存缓存配置 ────────── */
// 只使用内存缓存，用于页面切换防闪烁，不进行localStorage持久化

  /* ────────── 响应式状态 ────────── */
  const clusterCache    = reactive({})       // 二维缓存：type → Map<clusterKey, matrix>
  // const clusterOptions  = ref([])            // 下拉选项
  // const selectedCluster = ref(null)          // 当前簇 key，如 "1-1"
  const activeView      = ref('CELL_VOLT')   // 当前数据类型按钮

  const dataTableRef = ref(null)             // DataTable引用（保留用于其他可能的操作）

  /* ────────── AFE配置缓存（用于检测配置变化）────────── */
  const afeConfigCache = reactive({})        // 存储每个簇的AFE配置：clusterKey → { afeCellCounts, afeTempCounts, bmuTotal, afePerBmu }

  /* ────────── 内存缓存管理 ────────── */
  
  // 清空内存缓存
  function clearMemoryCache() {
    try {
      // 清空内存缓存
      Object.keys(clusterCache).forEach(key => {
        delete clusterCache[key]
      })
      console.log('[内存缓存清空完成]')
    } catch (error) {
      console.error('[内存缓存清空失败]', error)
    }
  }

  /* ────────── AFE配置管理 ────────── */

  /**
   * 检查AFE配置是否发生变化
   * @param {string} clusterKey - 簇标识，如 "1-1"
   * @param {Object} newConfig - 新的配置对象 { afeCellCounts, afeTempCounts, bmuTotal, afePerBmu }
   * @returns {boolean} 是否发生变化
   */
  function hasAfeConfigChanged(clusterKey, newConfig) {
    const oldConfig = afeConfigCache[clusterKey]
    if (!oldConfig) {
      return true // 首次配置，认为有变化
    }

    // 比较关键配置参数
    const { afeCellCounts, afeTempCounts, bmuTotal, afePerBmu } = newConfig
    const {
      afeCellCounts: oldAfeCellCounts,
      afeTempCounts: oldAfeTempCounts,
      bmuTotal: oldBmuTotal,
      afePerBmu: oldAfePerBmu
    } = oldConfig

    // 比较基本参数
    if (bmuTotal !== oldBmuTotal || afePerBmu !== oldAfePerBmu) {
      return true
    }

    // 比较AFE电池数量数组
    if (!afeCellCounts || !oldAfeCellCounts ||
        afeCellCounts.length !== oldAfeCellCounts.length ||
        !afeCellCounts.every((count, index) => count === oldAfeCellCounts[index])) {
      return true
    }

    // 比较AFE温度数量数组
    if (!afeTempCounts || !oldAfeTempCounts ||
        afeTempCounts.length !== oldAfeTempCounts.length ||
        !afeTempCounts.every((count, index) => count === oldAfeTempCounts[index])) {
      return true
    }

    return false
  }

  /**
   * 清理指定簇的矩阵缓存
   * @param {string} clusterKey - 簇标识，如 "1-1"
   * @param {string} reason - 清理原因（用于日志）
   */
  function clearClusterMatrixCache(clusterKey, reason = '配置变化') {
    const MEASURE_TYPES = ['CELL_VOLT', 'CELL_TEMP', 'CELL_SOC', 'CELL_SOH']
    let clearedCount = 0

    MEASURE_TYPES.forEach(dataType => {
      const map = clusterCache[dataType]
      if (map instanceof Map && map.has(clusterKey)) {
        map.delete(clusterKey)
        clearedCount++
      }
    })

    if (clearedCount > 0) {
      console.log(`🧹 [矩阵缓存清理] 簇${clusterKey} 清理了${clearedCount}个数据类型的缓存 (原因: ${reason})`)
    }
  }

  /**
   * 更新AFE配置缓存
   * @param {string} clusterKey - 簇标识
   * @param {Object} config - 配置对象
   */
  function updateAfeConfigCache(clusterKey, config) {
    afeConfigCache[clusterKey] = {
      afeCellCounts: [...(config.afeCellCounts || [])],
      afeTempCounts: [...(config.afeTempCounts || [])],
      bmuTotal: config.bmuTotal,
      afePerBmu: config.afePerBmu,
      timestamp: Date.now()
    }
  }

  /* ────────── 限流处理器管理 ────────── */
  const throttledHandlers = new Map()        // 存储每个数据类型的throttled处理函数
  const updateTrigger = ref(0)               // 强制更新触发器（用于手动触发视图刷新）
  const isPageActive = ref(true)             // 页面是否处于活动状态

  // 性能统计
  const performanceStats = reactive({
    totalMessages: 0,        // 总消息数
    throttledMessages: 0,    // 被节流的消息数
    processedMessages: 0,    // 实际处理的消息数
    lastResetTime: Date.now()
  })

  // 为不同数据类型创建独立的throttled处理器
  function getThrottledHandler(dataType, clusterKey) {
    const key = `${dataType}-${clusterKey}`
    
    if (!throttledHandlers.has(key)) {
      // 根据数据类型选择合适的节流间隔
      let throttleMs = THROTTLE_CONFIG.CELL_DATA
      if (dataType === 'BLOCK_COMMON_PARAM_R') {
        throttleMs = THROTTLE_CONFIG.CONFIG_UPDATE
      } else if (dataType === 'PACK_SUMMARY' || dataType === 'CLUSTER_SUMMARY') {
        throttleMs = THROTTLE_CONFIG.SUMMARY_DATA
      }

      // 如果页面不活动，增加节流间隔以节省性能
      if (!isPageActive.value) {
        throttleMs = throttleMs * 2
      }

      // 创建throttled函数
      const throttled = throttle(
        (msg) => {
          processMessageInternal(msg)
          performanceStats.processedMessages++
          // 触发视图更新（仅针对单体数据，避免配置更新触发不必要的刷新）
          if (msg.dataType !== 'BLOCK_COMMON_PARAM_R') {
            updateTrigger.value++
          }
        },
        throttleMs,
        { 
          leading: true,   // 首次调用立即执行
          trailing: true   // 结束时执行最后一次
        }
      )

      throttledHandlers.set(key, throttled)
    }

    return throttledHandlers.get(key)
  }

  // 清理所有throttled处理器
  function cleanupThrottlers() {
    throttledHandlers.forEach(handler => {
      if (handler.cancel) {
        handler.cancel()
      }
    })
    throttledHandlers.clear()
  }

  // 刷新所有待处理的throttled调用
  function flushThrottlers() {
    throttledHandlers.forEach(handler => {
      if (handler.flush) {
        handler.flush()
      }
    })
  }

  // 获取性能统计信息
  function getPerformanceStats() {
    const elapsed = (Date.now() - performanceStats.lastResetTime) / 1000
    const throttleRate = performanceStats.totalMessages > 0 
      ? ((performanceStats.totalMessages - performanceStats.processedMessages) / performanceStats.totalMessages * 100).toFixed(1)
      : 0
    
    return {
      ...performanceStats,
      elapsedSeconds: elapsed.toFixed(1),
      messagesPerSecond: (performanceStats.totalMessages / elapsed).toFixed(1),
      processedPerSecond: (performanceStats.processedMessages / elapsed).toFixed(1),
      throttleRate: `${throttleRate}%`,
      activeHandlers: throttledHandlers.size
    }
  }

  // 重置性能统计
  function resetPerformanceStats() {
    performanceStats.totalMessages = 0
    performanceStats.throttledMessages = 0
    performanceStats.processedMessages = 0
    performanceStats.lastResetTime = Date.now()
  }

  /* ────────── MQTT / IPC 监听 ────────── */

  // ① 频道列表：后期待扩展可再加
const CELL_CHANNELS = [
  'CELL_VOLT',
  'CELL_TEMP',
  'CELL_SOC',
  'CELL_SOH',
]

function onCellMsg (_e, msg) { 
  handler(_e, msg) 
  if (msg.dataType === 'PACK_SUMMARY')       { parsePackSummary(msg); return }
  if (msg.dataType === 'CLUSTER_SUMMARY')    { parseClusterSummary(msg); return }
}  // 保留原 handler

onMounted(() => {
  const mountStartTime = performance.now()
  
  // 不再从localStorage恢复缓存，只使用内存缓存防闪烁

  // 先清理可能存在的旧监听器（防止快速切换导致的残留）
  CELL_CHANNELS.forEach(ch => {
    window.electron.ipcRenderer.removeAllListeners(ch)
  })
  window.electron.ipcRenderer.removeAllListeners('PACK_SUMMARY')
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_SUMMARY')

  CELL_CHANNELS.forEach(ch => {
    window.electron.ipcRenderer.on(ch, onCellMsg)
  })
  window.electron.ipcRenderer.on('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.on('CLUSTER_SUMMARY', onClusterSummary)
  // window.electron.ipcRenderer.on('SYS_ABSTRACT',    handler)     

  // 重置性能统计
  resetPerformanceStats()
  
  const mountTime = (performance.now() - mountStartTime).toFixed(2)
  console.log(` cellData 页面加载完成: ${mountTime}ms`)

  // 将调试函数挂载到window对象（仅在开发环境）
  if (import.meta.env.DEV) {
    window.__cellDataDebug = {
      // 性能统计
      getStats: getPerformanceStats,
      resetStats: resetPerformanceStats,
      flushAll: flushThrottlers,
      getHandlerCount: () => throttledHandlers.size,
      getConfig: () => THROTTLE_CONFIG,
      setPageActive: (active) => { isPageActive.value = active },
      // 内存缓存管理
      clearCache: clearMemoryCache,
      getCacheSize: () => {
        let total = 0
        Object.keys(DATA_TYPE_MAP.value).forEach(dataType => {
          const map = clusterCache[dataType]
          if (map instanceof Map) total += map.size
        })
        return total
      },
      getCacheInfo: () => {
        const info = {}
        Object.keys(DATA_TYPE_MAP.value).forEach(dataType => {
          const map = clusterCache[dataType]
          if (map instanceof Map) {
            info[dataType] = {
              clusters: map.size,
              keys: Array.from(map.keys())
            }
          }
        })
        return info
      }
    }
  }
})

onBeforeUnmount(() => {
  CELL_CHANNELS.forEach(ch => {
    window.electron.ipcRenderer.removeAllListeners(ch, onCellMsg)
  })
  window.electron.ipcRenderer.removeAllListeners('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_SUMMARY', onClusterSummary)
  // window.electron.ipcRenderer.removeAllListeners('SYS_ABSTRACT',    handler)
  
  // 刷新所有待处理的更新
  flushThrottlers()
  
  // 清理所有节流处理器，释放内存
  cleanupThrottlers()
})

// 页面激活时的处理（从其他页面切回）
onActivated(() => {
  isPageActive.value = true
  console.log('[页面激活] 页面已激活，使用内存缓存防闪烁')
})

// 页面停用时的处理（切换到其他页面）
onDeactivated(() => {
  isPageActive.value = false
  
  // 刷新所有待处理的更新，确保最新数据被保存到内存缓存
  flushThrottlers()
  
  console.log('📤 离开页面，内存缓存已更新')
})

// 【堆簇切换监听】监听堆簇选择变化
watch(selectedCluster, (newCluster, oldCluster) => {
  if (newCluster && newCluster !== oldCluster) {
    const startTime = performance.now()
    
    // 不再保存到localStorage，簇选择状态由全局store管理
    
    // 检查当前数据类型是否有该堆簇的缓存数据
    const currentMap = clusterCache[activeView.value]
    const hasCache = currentMap instanceof Map && currentMap.has(newCluster)
    const rows = hasCache ? currentMap.get(newCluster).length : 0
    
    if (hasCache) {
      updateTrigger.value++
      const switchTime = (performance.now() - startTime).toFixed(2)
      console.log(`🔀 堆簇切换: ${oldCluster || '无'} → ${newCluster} [${activeView.value}] ${rows}行 ${switchTime}ms`)
    } else {
      console.log(`🔀 堆簇切换: ${oldCluster || '无'} → ${newCluster} [${activeView.value}] ⏳ 等待数据`)
    }
  }
})

// 【数据类型切换监听】监听数据类型切换
watch(activeView, (newView, oldView) => {
  if (newView !== oldView) {
    const startTime = performance.now()
    
    // 检查是否有该类型的缓存数据
    const currentMap = clusterCache[newView]
    const hasCache = currentMap instanceof Map && selectedCluster.value && currentMap.has(selectedCluster.value)
    const rows = hasCache ? currentMap.get(selectedCluster.value).length : 0
    
    const switchTime = (performance.now() - startTime).toFixed(2)
    const cluster = selectedCluster.value || '未选择'
    const status = hasCache ? `${rows}行` : '⏳ 等待数据'
    // console.log(`📊 数据类型切换: ${oldView || '无'} → ${newView} [${cluster}] ${status} ${switchTime}ms`)
  }
})


  // onMounted(() => {
  //   // console.log('%c[连接成功] 渲染进程监听 mqtt-message', 'color:green')
  //   window.electron.ipcRenderer.on('mqtt-message', handler)
  //   // logCount('mounted')
  // })
  // onBeforeUnmount(() =>{
  //   window.electron.ipcRenderer.removeAllListeners('mqtt-message', handler)
  //   // logCount('beforeUnmount')
  // })
 
   //单体数据
  /* ==========  消息处理 - 内部实现（无限流）========== */
  function processMessageInternal(msg) {
    // console.log('[processMessageInternal] 处理消息', msg.dataType)

    /*  堆簇数量帧：只更新下拉 */
    if (msg.dataType === 'BLOCK_COMMON_PARAM_R') {
      buildClusterOptions(msg)
      return
    }

    // 关联下拉：只对于 CELL_* 或 SYS_ABSTRACT
    if (msg.clusterId != null &&
      (msg.dataType?.startsWith('CELL_') || msg.dataType === 'SYS_ABSTRACT')) {
      const clusterKey = `${msg.blockId}-${msg.clusterId}`
      // 【已禁用】动态发现机制，改用配置驱动方式
      // ensureClusterOption(clusterKey)
    }

    // 若是概要，不走 CELL_* 矩阵流程
    if (msg.dataType === 'SYS_ABSTRACT') return

    // 非 CELL_* 不处理
    const MEASURE_TYPES = ['CELL_VOLT', 'CELL_TEMP', 'CELL_SOC', 'CELL_SOH']
    if (!MEASURE_TYPES.includes(msg.dataType)) return

    const clusterKey = `${msg.blockId}-${msg.clusterId}`
    const cfg = DATA_TYPE_MAP.value[msg.dataType]

    // 检查AFE配置是否发生变化
    if (msg.baseConfig) {
      const newConfig = {
        afeCellCounts: msg.baseConfig.afeCellCounts,
        afeTempCounts: msg.baseConfig.afeTempCounts,
        bmuTotal: msg.baseConfig.bmuTotal,
        afePerBmu: msg.baseConfig.afePerBmu
      }

      // 如果配置发生变化，清理该簇的所有矩阵缓存
      if (hasAfeConfigChanged(clusterKey, newConfig)) {
        clearClusterMatrixCache(clusterKey, 'AFE配置变化')
        updateAfeConfigCache(clusterKey, newConfig)
      }
    }

    /*  如果首见该簇或缓存已被清理 → 创建空矩阵 */
    if (!clusterCache[msg.dataType]) clusterCache[msg.dataType] = new Map()
    if (!clusterCache[msg.dataType].has(clusterKey)) {
      if (!msg.baseConfig) {
        console.error('缺少 baseConfig，无法建矩阵')
        return
      }
      /* ➊ 选对计数数组：CELL_TEMP 用温感，其他用电芯 */
      const counts = msg.dataType === 'CELL_TEMP'
        ? msg.baseConfig.afeTempCounts
        : msg.baseConfig.afeCellCounts

      const m = buildEmptyMatrix({
        bmuTotal     : msg.baseConfig.bmuTotal,
        afePerBmu    : msg.baseConfig.afePerBmu,
        afeCellCounts : counts
      })
      clusterCache[msg.dataType].set(clusterKey, m)
      console.log(`🔧 [矩阵重建] 簇${clusterKey} ${msg.dataType} 创建新矩阵 ${m.length}行`)
    }

    /*  写入数据 */
    fillMatrix(clusterCache[msg.dataType].get(clusterKey), msg)
  }

  /* ==========  消息处理 - 限流入口  ========== */
  function handler (_e, msg) {
    // console.log('[handler] 收到原始 msg ↓↓↓')
    // console.log(JSON.stringify(msg, null, 2))

    // 统计消息数
    performanceStats.totalMessages++

    // 生成节流键
    const clusterKey = msg.clusterId != null 
      ? `${msg.blockId}-${msg.clusterId}` 
      : `${msg.blockId}-0`

    // 使用节流处理器
    const throttledHandler = getThrottledHandler(msg.dataType, clusterKey)
    throttledHandler(msg)
  }




  /* ---------- 生成/追加下拉 ---------- */
  function buildClusterOptions (msg) {
    const kv = Object.fromEntries(
      msg.data?.[0]?.element?.map(e => [e.label.replace(/\s/g, ''), e.value]) || []
    )
    const blockCnt = +kv['堆总数'] || 0
    const opts = []
    for (let b = 1; b <= blockCnt; b++) {
      const clusterCnt = +kv[`${b === 1 ? '第一' : '第二'}堆簇数`] || 0
      for (let c = 1; c <= clusterCnt; c++) {
        opts.push({ label: `${t('cluster.block')}${b}/${t('cluster.cluster')}${c}`, value: `${b}-${c}` })
      }
    }

    // 比较选项，只有在真正变化时才更新，避免循环触发
    const currentValues = clusterOptions.value.map(o => o.value).sort().join(',')
    const newValues = opts.map(o => o.value).sort().join(',')
    
    if (currentValues !== newValues) {
      replaceClusterOptions(opts)
    }
  }

  /* ---------- 创建空矩阵 ---------- */
  function buildEmptyMatrix (base) {
    const rows = []
    const { bmuTotal, afePerBmu, afeCellCounts } = base
    for (let b = 1; b <= bmuTotal; b++) {
      for (let a = 1; a <= afePerBmu; a++) {
        const cols = afeCellCounts[(a - 1) % afePerBmu] || 0
        if (cols === 0) continue // 跳过无效 AFE
        rows.push({
          rowIdx: (b - 1) * afePerBmu + (a - 1),
          bmuLabel: `BMU${b}-AFE${a}`,
          cells: Array(cols).fill('--')
        })
      }
    }
    return rows
  }

  /* ---------- 写入矩阵 ---------- */
  function fillMatrix (matrix, msg) {
    const { afePerBmu } = msg.baseConfig
    msg.data.forEach(group => {
      const rowIdx = (group.bmuId - 1) * afePerBmu + (group.afeId - 1)
      const row = matrix.find(r => r.rowIdx === rowIdx)
      if (!row) return
      group.element.forEach(({ label, value }) => {
        const col = +label.replace('#', '') - 1
        if (col >= 0 && col < row.cells.length) {
          row.cells[col] = value           // 保留原始数值
        }
      })
    })
  }

  /* ---------- 计算表格行列 ---------- */
  const matrixRows = computed(() => {
    const startTime = performance.now()
    // 依赖 updateTrigger 来触发重新计算
    updateTrigger.value
    
    const map = clusterCache[activeView.value]
    const rows = map?.get(selectedCluster.value) || []
    
    const computeTime = (performance.now() - startTime).toFixed(2)
    // console.log(`[🔄 matrixRows] 簇=${selectedCluster.value} | 类型=${activeView.value} | 行数=${rows.length} | 耗时=${computeTime}ms`)
    
    return rows
  })

  const cellsPerAfe = computed(() => matrixRows.value[0]?.cells.length || 0)

  const maxCols = computed(() =>
    Math.max(...matrixRows.value.map(r => r.cells.length), 0)
  )
  const displayCols = computed(() => Array.from({ length: maxCols.value }, (_, i) => i + 1))

  // 获取当前簇的baseConfig
  const currentBaseConfig = computed(() => {
    return afeConfigCache[selectedCluster.value] || {};
  })

  // 计算全局索引（根据数据类型选择电芯或温度）
  function calculateGlobalIndex(rowData, colIndex) {
    const baseConfig = currentBaseConfig.value;
    const isTemp = activeView.value === 'CELL_TEMP';

    // 根据数据类型选择对应的计数数组
    const countsArray = isTemp ? baseConfig.afeTempCounts : baseConfig.afeCellCounts;

    if (!countsArray || !baseConfig.afePerBmu) {
      return colIndex; // 如果没有配置信息，返回列索引
    }

    // 从rowData中解析BMU和AFE信息
    const bmuId = Math.floor(rowData.rowIdx / baseConfig.afePerBmu) + 1;
    const afeId = (rowData.rowIdx % baseConfig.afePerBmu) + 1;

    // 检查当前AFE是否有这么多电芯/温度探头
    const currentAfeCount = countsArray[afeId - 1] || 0;
    if (colIndex > currentAfeCount) {
      return ''; // 超出当前AFE数量，不显示索引
    }

    let globalIndex = 0;

    // 1. 累计前面BMU的所有电芯/温度探头
    for (let b = 1; b < bmuId; b++) {
      for (let a = 1; a <= baseConfig.afePerBmu; a++) {
        globalIndex += countsArray[a - 1] || 0;
      }
    }

    // 2. 累计当前BMU中前面AFE的电芯/温度探头
    for (let a = 1; a < afeId; a++) {
      globalIndex += countsArray[a - 1] || 0;
    }

    // 3. 加上当前AFE内的索引
    return globalIndex + colIndex;
  }

  // 为了保持向后兼容，保留原函数名
  const calculateGlobalCellIndex = calculateGlobalIndex;

  function formatCell(v){          //  模板内按需格式化
    // 处理占位符
    if (v === '--' || v === '-' || v === '---') return '---'
    
    // 转换为数字
    const numValue = Number(v)
    
    // 检查 NaN 值（当 v 为 '---' 等非数字字符串时会产生 NaN）
    if (isNaN(numValue)) {
      return '---'
    }
    
    // 检查无效值（这些值是32767或1000经过分辨率计算后的结果）
    if (numValue === 32.767 || numValue === 3276.7) {
      return '---'
    }
    
    // 正常格式化
    return numValue.toFixed(DATA_TYPE_MAP.value[activeView.value].decimals)
  }


  //簇端数据
  // 当前页面需要展示的三类数据
  const NEED = ['系统信息', '温度信息', '电池信息']

  // ①　原始提取（如果别处要用）
  const filteredClusterSections = computed(() =>
    pickCluster(selectedCluster.value, NEED))

  // 系统状态映射
  const SYSTEM_STATUS_MAP = computed(() => ({
    0: t('batteryInfo.systemStatus.idle'),
    1: t('batteryInfo.systemStatus.charge'), 
    2: t('batteryInfo.systemStatus.discharge'),
    3: t('batteryInfo.systemStatus.open'),
    4: t('batteryInfo.systemStatus.contactorSelfTest')
  }))

  // 故障等级映射
  const FAULT_LEVEL_MAP = computed(() => ({
    0: t('batteryInfo.faultLevel.noFault'),
    1: t('batteryInfo.faultLevel.critical'),
    2: t('batteryInfo.faultLevel.general'), 
    3: t('batteryInfo.faultLevel.minor')
  }))

  const FIELD_ORDER = computed(() => [
    t('batteryInfo.clusterInfo.afeNum'), t('batteryInfo.clusterInfo.cellNum'), t('batteryInfo.clusterInfo.tempSensorNum'), t('batteryInfo.clusterInfo.systemStatus'), t('batteryInfo.clusterInfo.faultLevel'),
    t('batteryInfo.clusterInfo.clusterVoltage'), t('batteryInfo.clusterInfo.prechargeVoltage'), t('batteryInfo.clusterInfo.clusterCurrent'),
    t('batteryInfo.clusterInfo.insulationRPlus'), t('batteryInfo.clusterInfo.insulationRMinus'),
    t('batteryInfo.clusterInfo.temperature1'), t('batteryInfo.clusterInfo.temperature2'), t('batteryInfo.clusterInfo.temperature3'), t('batteryInfo.clusterInfo.temperature4'), t('batteryInfo.clusterInfo.temperature5'),
    t('batteryInfo.clusterInfo.clusterSOC'), t('batteryInfo.clusterInfo.clusterSOH'), t('batteryInfo.clusterInfo.clusterSOE'),
    t('batteryInfo.clusterInfo.maxChargePower'), t('batteryInfo.clusterInfo.maxDischargePower'),
    t('batteryInfo.clusterInfo.singleChargeEnergy'), t('batteryInfo.clusterInfo.singleDischargeEnergy'),
    t('batteryInfo.clusterInfo.singleChargeCapacity'), t('batteryInfo.clusterInfo.singleDischargeCapacity')
  ]);

  // 服务器发送的原始中文标签到翻译后标签的映射
  const LABEL_MAPPING = computed(() => ({
    'AFE 数': t('batteryInfo.clusterInfo.afeNum'),
    '电芯数': t('batteryInfo.clusterInfo.cellNum'),
    '温感数': t('batteryInfo.clusterInfo.tempSensorNum'),
    '系统状态': t('batteryInfo.clusterInfo.systemStatus'),
    '故障等级': t('batteryInfo.clusterInfo.faultLevel'),
    '簇电压': t('batteryInfo.clusterInfo.clusterVoltage'),
    '预充电压': t('batteryInfo.clusterInfo.prechargeVoltage'),
    '簇电流': t('batteryInfo.clusterInfo.clusterCurrent'),
    '绝缘 R+': t('batteryInfo.clusterInfo.insulationRPlus'),
    '绝缘 R-': t('batteryInfo.clusterInfo.insulationRMinus'),
    '温度1': t('batteryInfo.clusterInfo.temperature1'),
    '温度2': t('batteryInfo.clusterInfo.temperature2'),
    '温度3': t('batteryInfo.clusterInfo.temperature3'),
    '温度4': t('batteryInfo.clusterInfo.temperature4'),
    '温度5': t('batteryInfo.clusterInfo.temperature5'),
    '簇SOC': t('batteryInfo.clusterInfo.clusterSOC'),
    '簇SOH': t('batteryInfo.clusterInfo.clusterSOH'),
    '簇SOE': t('batteryInfo.clusterInfo.clusterSOE'),
    '最大允充功率': t('batteryInfo.clusterInfo.maxChargePower'),
    '最大允放功率': t('batteryInfo.clusterInfo.maxDischargePower'),
    '单次充电电量': t('batteryInfo.clusterInfo.singleChargeEnergy'),
    '单次放电电量': t('batteryInfo.clusterInfo.singleDischargeEnergy'),
    '单次充电容量': t('batteryInfo.clusterInfo.singleChargeCapacity'),
    '单次放电容量': t('batteryInfo.clusterInfo.singleDischargeCapacity')
  }));

  // 反向映射：翻译后标签到原始中文标签的映射
  const REVERSE_LABEL_MAPPING = computed(() => {
    const reverse = {}
    Object.keys(LABEL_MAPPING.value).forEach(key => {
      reverse[LABEL_MAPPING.value[key]] = key
    })
    return reverse
  });

  // 单位映射
  const UNIT_MAP = computed(() => ({
    [t('batteryInfo.clusterInfo.afeNum')]: '',
    [t('batteryInfo.clusterInfo.cellNum')]: '',
    [t('batteryInfo.clusterInfo.tempSensorNum')]: '',
    [t('batteryInfo.clusterInfo.systemStatus')]: '',
    [t('batteryInfo.clusterInfo.faultLevel')]: '',
    [t('batteryInfo.clusterInfo.clusterVoltage')]: t('batteryInfo.units.voltage'),
    [t('batteryInfo.clusterInfo.prechargeVoltage')]: t('batteryInfo.units.voltage'),
    [t('batteryInfo.clusterInfo.clusterCurrent')]: t('batteryInfo.units.current'),
    [t('batteryInfo.clusterInfo.insulationRPlus')]: t('batteryInfo.units.resistance'),
    [t('batteryInfo.clusterInfo.insulationRMinus')]: t('batteryInfo.units.resistance'),
    [t('batteryInfo.clusterInfo.temperature1')]: t('batteryInfo.units.temperature'),
    [t('batteryInfo.clusterInfo.temperature2')]: t('batteryInfo.units.temperature'),
    [t('batteryInfo.clusterInfo.temperature3')]: t('batteryInfo.units.temperature'),
    [t('batteryInfo.clusterInfo.temperature4')]: t('batteryInfo.units.temperature'),
    [t('batteryInfo.clusterInfo.temperature5')]: t('batteryInfo.units.temperature'),
    [t('batteryInfo.clusterInfo.clusterSOC')]: t('batteryInfo.units.percentage'),
    [t('batteryInfo.clusterInfo.clusterSOH')]: t('batteryInfo.units.percentage'),
    [t('batteryInfo.clusterInfo.clusterSOE')]: t('batteryInfo.units.percentage'),
    [t('batteryInfo.clusterInfo.maxChargePower')]: t('batteryInfo.units.power'),
    [t('batteryInfo.clusterInfo.maxDischargePower')]: t('batteryInfo.units.power'),
    [t('batteryInfo.clusterInfo.singleChargeEnergy')]: t('batteryInfo.units.energy'),
    [t('batteryInfo.clusterInfo.singleDischargeEnergy')]: t('batteryInfo.units.energy'),
    [t('batteryInfo.clusterInfo.singleChargeCapacity')]: t('batteryInfo.units.capacity'),
    [t('batteryInfo.clusterInfo.singleDischargeCapacity')]: t('batteryInfo.units.capacity')
  }));

  const flatElems = computed(() => 
    // 每个 block.element 里已经是 {label,value}
    filteredClusterSections.value.flatMap(sec =>
      sec.element.filter(e =>
        ![
          '充电SOP', '放电SOP', '充电SOP标识', '放电SOP标识',
          '充电SOP-X', '充电SOP-Y', '放电SOP-X', '放电SOP-Y'
        ].some(sub => e.label.startsWith(sub))
      )
    )
  );

  const orderedElems = computed(() => {
    const elemMap = new Map()
    flatElems.value.forEach(e => {
      elemMap.set(e.label, e)
    })
    
    return FIELD_ORDER.value.map(fieldLabel => {
      // 通过反向映射找到对应的中文标签
      const originalLabel = REVERSE_LABEL_MAPPING.value[fieldLabel]
      
      if (!originalLabel) {
        console.warn(`[orderedElems] 未找到对应的原始标签: ${fieldLabel}`)
        return { label: fieldLabel, value: '–' }
      }
      
      // 尝试多种匹配方式（使用 O(1) 的 Map 查找）
      let found = elemMap.get(originalLabel)
      
      // 如果直接匹配失败，尝试带单位的匹配
      if (!found) {
        const unit = UNIT_MAP.value[fieldLabel]
        if (unit) {
          found = elemMap.get(`${originalLabel}(${unit})`)
        }
      }
      
      // 如果还是没找到，返回默认值
      if (!found) {
        // console.warn(`[orderedElems] 未找到数据: ${originalLabel} -> ${fieldLabel}`)
        return { label: fieldLabel, value: '–' }
      }
      
      // 对系统状态和故障等级进行文本映射
      let displayValue = found.value
      if (fieldLabel === t('batteryInfo.clusterInfo.systemStatus') && SYSTEM_STATUS_MAP.value[found.value] !== undefined) {
        displayValue = SYSTEM_STATUS_MAP.value[found.value]
      } else if (fieldLabel === t('batteryInfo.clusterInfo.faultLevel') && FAULT_LEVEL_MAP.value[found.value] !== undefined) {
        displayValue = FAULT_LEVEL_MAP.value[found.value]
      }
      
      // 返回纯标签名（不带单位），单位会在模板中通过UNIT_MAP添加
      return { label: fieldLabel, value: displayValue }
    })
  });



  //BMU数据
  const NEED_FIELDS = computed(() => {
    if (activeView.value === 'BMU_VOLT') return ['BMU电压'];
    if (activeView.value === 'BMU_TEMP') return ['BMU电路板温度'];
    if (activeView.value === 'BMU_PLUGIN_TEMP') return ['动力接插件温度1', '动力接插件温度2'];
    if (activeView.value === 'BMU_SOC') return ['BMU SOC'];
    if (activeView.value === 'BMU_PRODUCT_CODE') return ['BMU产品编码'];
    // if (activeView.value === 'BMU_PLUGIN_TEMP2') return ['动力接插件温度2'];
    return [];
  });

  // 标签转换函数
  function transformPluginLabel(originalLabel, pluginNumber, bmuIndex) {
    // 从原标签中提取BMU编号：BMU1 插件1温度(℃) → BMU1
    const bmuMatch = originalLabel.match(/^BMU(\d+)/)
    if (!bmuMatch) return originalLabel

    const bmuNumber = parseInt(bmuMatch[1])

    // 计算全局编号：(BMU编号-1)*2 + 插件编号
    const globalIndex = (bmuNumber - 1) * 2 + pluginNumber

    // 生成新标签：BMU1-1(℃) #1
    return `BMU${bmuNumber}-${pluginNumber}(℃) #${globalIndex}`
  }

  // BMU标签转换函数
  function transformBMULabel(originalLabel, dataType) {
    // 从原标签中提取BMU编号：BMU1 SOC(%) → BMU1 SOC(%)
    const bmuMatch = originalLabel.match(/^BMU(\d+)/)
    if (bmuMatch) {
      const bmuNumber = bmuMatch[1]
      if (dataType === 'BMU_SOC') {
        return `BMU${bmuNumber} ${t('batteryInfo.bmuData.bmuSOC')}`
      } else if (dataType === 'BMU_PRODUCT_CODE') {
        return `BMU${bmuNumber} ${t('batteryInfo.bmuData.bmuProductCode')}`
      } else if (dataType === 'BMU_VOLT') {
        return `BMU${bmuNumber} ${t('batteryInfo.bmuData.bmuVoltage')}`
      } else if (dataType === 'BMU_TEMP') {
        return `BMU${bmuNumber} ${t('batteryInfo.bmuData.bmuBoardTemp')}`
      }
    }
    return originalLabel
  }

  const bmuRows = computed(() => {
    if (!['BMU_VOLT', 'BMU_TEMP', 'BMU_PLUGIN_TEMP', 'BMU_SOC', 'BMU_PRODUCT_CODE'].includes(activeView.value)) {
      return [];
    }
    const secs = pickPack(selectedCluster.value, NEED_FIELDS.value) || []
    // 对于动力接插件温度，需要重新排序：插件1温度一排，插件2温度一排
    if (activeView.value === 'BMU_PLUGIN_TEMP') {
      // 使用原始中文标签查找数据，因为服务器发送的是中文标签
      const plugin1Data = secs.find(sec => sec.class === '动力接插件温度1')?.element || []
      const plugin2Data = secs.find(sec => sec.class === '动力接插件温度2')?.element || []

      // 重新排序：按BMU编号交替显示插件1和插件2
      const reorderedData = []
      const maxLength = Math.max(plugin1Data.length, plugin2Data.length)

      for (let i = 0; i < maxLength; i++) {
        if (plugin1Data[i]) {
          // 转换插件1标签：BMU1 插件1温度(℃) → BMU1-1(℃) #1
          const transformedItem = {
            ...plugin1Data[i],
            label: transformPluginLabel(plugin1Data[i].label, 1, i + 1)
          }
          reorderedData.push(transformedItem)
        }
        if (plugin2Data[i]) {
          // 转换插件2标签：BMU6 插件2温度(℃) → BMU6-2(℃) #12
          const transformedItem = {
            ...plugin2Data[i],
            label: transformPluginLabel(plugin2Data[i].label, 2, i + 1)
          }
          reorderedData.push(transformedItem)
        }
      }

      return reorderedData
    }

    // 对于BMU_SOC、BMU_PRODUCT_CODE、BMU_VOLT、BMU_TEMP，需要转换标签
    if (['BMU_SOC', 'BMU_PRODUCT_CODE', 'BMU_VOLT', 'BMU_TEMP'].includes(activeView.value)) {
      return secs.flatMap(sec => 
        sec.element.map(item => ({
          ...item,
          label: transformBMULabel(item.label, activeView.value)
        }))
      )
    }

    // 其他情况保持原有逻辑
    return secs.flatMap(sec => sec.element)
  });
  </script>

<template>
  <div class="card flex flex-col h-full p-3 gap-1">
    <!-- ▼▼ 簇端信息卡片布局：替换原DataTable ▼▼ -->
    <div class="cluster-info-container">
      <!-- 上方分隔线 -->
      <div class="cluster-divider"></div>
      
      <!-- 第一排卡片 -->
      <div class="cluster-info-row">
        <div v-for="e in orderedElems.slice(0, Math.ceil(orderedElems.length / 2))"
             :key="e.label"
             class="cluster-info-card">
          <div class="cluster-card-label">{{ e.label }}</div>
          <div class="cluster-card-value">{{ e.value }}{{ UNIT_MAP[e.label] }}</div>
        </div>
      </div>
      
      <!-- 中间分隔线 -->
      <div class="cluster-divider"></div>
      
      <!-- 第二排卡片 -->
      <div class="cluster-info-row">
        <div v-for="e in orderedElems.slice(Math.ceil(orderedElems.length / 2))"
             :key="e.label"
             class="cluster-info-card">
          <div class="cluster-card-label">{{ e.label }}</div>
          <div class="cluster-card-value">{{ e.value }}{{ UNIT_MAP[e.label] }}</div>
        </div>
      </div>
      
      <!-- 下方分隔线 -->
      <div class="cluster-divider"></div>
    </div>

    <!-- ▼▼ 数据类型切换按钮 ▼▼ -->
    <div class="flex gap-1">
      <Button v-for="(cfg,key) in DATA_TYPE_MAP"
              :key="key"
              :label="cfg.label"
              :class="{ 'p-button-outlined': activeView !== key }"
              @click="activeView = key" />
    </div>
    
    <!-- ▼▼ BMU 表卡片 ▼▼ -->
    <SystemAbstract v-if="['CELL_VOLT','CELL_TEMP','CELL_SOC','CELL_SOH','BMU_VOLT','BMU_TEMP','BMU_PLUGIN_TEMP','BMU_SOC','BMU_PRODUCT_CODE'].includes(activeView)"
                    :activeView="activeView"
                    :selectedCluster="selectedCluster" />

    <!-- ▼▼ 单体数据表（完整渲染，无内部滚动）▼▼ -->
    <DataTable v-if="['CELL_VOLT','CELL_TEMP','CELL_SOC','CELL_SOH'].includes(activeView)"
               ref="dataTableRef"
               :value="matrixRows"
               showGridlines
               style="width:auto"
               class="centered-table"
               :pt="{
                 thead: { style: 'text-align: center;' },
                 header: { style: 'text-align: center; justify-content: center;' }
               }">

        <!-- 冻结 BMU-AFE 列 -->
        <Column frozen
                :header="t('batteryInfo.table.bmuAfe')"
                style="width:120px"
                headerStyle="white-space: nowrap; text-align: center;"
                bodyStyle="text-align: center;">
          <template #body="{ data }">{{ data.bmuLabel }}</template>
        </Column>

        <!-- 动态 Cell 列 -->
        <Column v-for="col in displayCols"
                :key="col"
                :header="col"
                :field="`cells[${col-1}]`"
                style="width:90px"
                headerStyle="text-align: center;"
                bodyStyle="text-align: center;">
          <template #body="{ data }">
            <span class="cell-content">
              {{ formatCell(data.cells[col-1]) }}<template v-if="data.cells[col-1] !== '--'"> #{{ calculateGlobalCellIndex(data, col) }}</template>
            </span>
          </template>
        </Column>
      </DataTable>

    <div v-if="['BMU_VOLT','BMU_TEMP','BMU_PLUGIN_TEMP','BMU_SOC','BMU_PRODUCT_CODE'].includes(activeView)"
         class="card-grid">
      <div v-for="e in bmuRows"
           :key="e.label"
           class="card">
        <div class="card-label">{{ e.label }}</div>
        <div class="card-value">{{ e.value }}</div>
      </div>
    </div>
  </div>
</template>

  <style scoped>
  .card {
    /* 使用全局card样式，不覆盖margin-left */
    background: var(--surface-card);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    /* 保持原有的flex布局 */
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1rem;
    gap: 0.5rem;
  }

  /* ====== 簇端信息卡片网格布局 ====== */
  .cluster-info-container {
    display: flex;
    flex-direction: column;
    gap: 6px; /* 减少容器内各元素间距 */
    padding: 2px 0; /* 进一步减少上下内边距 */
    width: 100%;
  }

  .cluster-info-row {
    display: grid; /* 恢复grid布局 */
    grid-template-columns: repeat(12, 1fr); /* 固定12列 */
    gap: 6px; /* 减少卡片间距 */
    justify-content: center; /* 让卡片整体居中 */
    padding: 0 12px; /* 左右对称的内边距 */
  }

  /* 在小屏幕下改用flex换行布局 */
  @media (max-width: 1400px) {
    .cluster-info-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
    }
  }

  .cluster-divider {
    height: 1px;
    background-color: var(--surface-border); /* 使用主题边框色 */
    margin: 0 8px; /* 减少分隔线左右边距 */
  }

  .cluster-info-card {
    background: var(--surface-card); /* 使用主题卡片背景 */
    border: 1px solid var(--surface-border); /* 使用主题边框色 */
    border-radius: 6px;
    padding: 4px 6px; /* 增加左右内边距，为左对齐文字提供空间 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start; /* 改为左对齐 */
    gap: 2px; /* 进一步减少标签和数值间距 */
    min-height: 35px; /* 进一步减少最小高度让卡片更矮 */
    min-width: 100px; /* 确保卡片有足够宽度 */
  }

  /* 在小屏幕下保持固定大小 */
  @media (max-width: 1400px) {
    .cluster-info-card {
      flex: 0 0 auto; /* 不拉伸，保持固定大小 */
      width: 120px; /* 固定宽度 */
    }
  }

  .cluster-card-label {
    font-size: 0.85rem; /* 进一步增大标签字体 */
    color: var(--text-color-secondary); /* 使用主题次要文字颜色 */
    text-align: left; /* 左对齐 */
    line-height: 1.1;
    font-weight: 500;
  }

  .cluster-card-value {
    font-size: 1rem; /* 增大数值字体 */
    font-weight: 600;
    color: var(--text-color); /* 使用主题主要文字颜色 */
    text-align: left; /* 左对齐 */
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  /* DataTable完整渲染，无内部滚动 */
  :deep(.p-datatable-wrapper) {
    overflow: visible; /* 允许内容完整显示 */
  }

  :deep(.p-datatable-table) {
    width: 100%;
    min-width: max-content; /* 保持表格最小宽度 */
  }

  /* 确保表格头部和主体都完整显示 */
  :deep(.p-datatable-scrollable-header),
  :deep(.p-datatable-scrollable-body) {
    overflow: visible;
  }

  /* 表头居中显示 - 参考reference成功案例 */
  .centered-table :deep(.p-datatable-thead th) {
    text-align: center !important;
    vertical-align: middle !important;
  }

  /* 确保表头内容居中 */
  .centered-table :deep(.p-column-header) {
    text-align: center !important;
  }

  .centered-table :deep(.p-column-header-content) {
    justify-content: center !important;
    text-align: center !important;
  }

  /* 数据单元格居中显示 - 参考reference成功案例 */
  .centered-table :deep(.p-datatable-tbody td) {
    text-align: center !important;
    vertical-align: middle !important;
    padding: 4px 8px; /* 适当的内边距 */
    font-size: 0.95rem; /* 稍微减小字体以适应更多内容 */
  }

  /* 确保冻结列不换行并居中显示 */
  .centered-table :deep(.p-datatable-tbody td.p-frozen-column) {
    white-space: nowrap;
    text-align: center !important; /* 行首（BMU-AFE列）居中 */
  }

  /* 优化单元格内容显示 */
  .cell-content {
    display: inline-block;
    width: 100%;
    text-align: center; /* 单体数据内容居中 */
    word-wrap: break-word; /* 允许长单词换行 */
    white-space: normal; /* 允许正常换行 */
    font-family: 'Consolas', 'Monaco', monospace; /* 使用等宽字体，数字对齐更好 */
  }
  
  /* ====== 卡片网格容器 ====== */
  .card-grid{
      display: grid;                            /* 启用 CSS Grid 布局（自动排成行列） */
      grid-template-columns: repeat(            /* 定义列宽与列数 */
          auto-fill,                            /* 自动填充：一行能塞多少列就塞多少列 */
          minmax(75px, 1fr)                    /* 每列最小 100px，最大占 1fr（平均分）*/
      );
      gap: 30px;                              /* 网格之间的水平 + 垂直间距（总槽距） */
      grid-auto-flow: dense;                    /* 开启"密集模式" → 小卡片会去填空洞 */
      padding-left: 20px;
  }

  /* ====== 单张卡片主体 ====== */
  .card-grid .card{
      min-width: 80px;                          /* 卡片最窄物理宽度；列宽 < 80px 就会换行 */
      background: var(--surface-card);          /* 使用主题卡片背景色 */
      border: 1px solid var(--surface-border);  /* 使用主题边框色 */
      border-radius: 6px;                       /* 圆角半径；0 = 方角，>8px = 更圆 */
      padding: .5rem .3rem;                     /* 内边距：上下 8px，左右 5px（.5rem≈8px） */
      display: flex;                            /* 启用 Flex → 纵向排列文字 */
      flex-direction: column;                   /* column = 上下垂直堆叠 label 和 value */
      justify-content: center;                  /* 让两行文字在卡片内部垂直居中 */
      gap: .2rem;                               /* label 与 value 的间距（≈3px） */
  }
  .card-grid .card:hover{ background: var(--surface-hover); }  /* 悬浮时使用主题悬停色 */

  /* ====== 文本层级 ====== */
  .card-label{
      font-size: .95rem;                        /* 字号 ~15px；改小更紧凑，改大更醒目 */
      color: var(--text-color-secondary);       /* 使用主题次要文字颜色 */
      line-height: 1.2;                         /* 行高；<=1.2 能缩小卡片高度 */
  }
  .card-value{
      font-size: 1.2rem;                        /* 数值字号 ~19px；决定卡片高度主要因素 */
      font-weight: 600;                         /* 半粗体，更突出主数值 */
      font-variant-numeric: tabular-nums;       /* 数字等宽对齐，便于比对 */
      color: var(--text-color);                 /* 使用主题主要文字颜色 */
  }
</style>