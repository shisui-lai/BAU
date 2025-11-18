<!-- 故障页面 - 使用 clusterStore 统一管理筛选状态 -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { parseFault, sortedAllFaults } from '../../../composables/core/data-processing/common/parseFault'
import { useClusterStore } from '../../../stores/device/clusterStore'
import { useI18n } from 'vue-i18n'
// PrimeVue组件已全部替换为原生HTML组件

// 类型声明
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        on: (channel: string, callback: (...args: any[]) => void) => void;
        removeListener: (channel: string, callback: (...args: any[]) => void) => void;
         removeAllListeners: (channel: string, callback: (...args: any[]) => void) => void;
      };
    };
  }
}

// 使用 clusterStore 管理筛选状态
const clusterStore = useClusterStore()

// 使用国际化
const { t, te, locale } = useI18n()

/* ---------- 分页状态 ---------- */
const first = ref(0)      // 当前偏移量
const pageSize = 200      // 每页条数（固定200条）

/* ---------- 手动排序状态 ---------- */
const sortOrder = ref<'none' | 'asc' | 'desc'>('none') // none: 无排序, asc: 轻微到严重, desc: 严重到轻微

/* ---------- MQTT 监听 ---------- */
const FAULT_CHANNELS = [
  //协议修改删除 - HARDWARE_FAULT不再使用，改为TOTAL_FAULT中的接触器详细故障
  // 'HARDWARE_FAULT',
  'TOTAL_FAULT',
  'OUTPUT_FAULT_MAP',
  'SAVED_FAULT_MAP',
  'FAULT_LEVEL1',
  'FAULT_LEVEL2',
  'CELL_OV_FAULT_LEVEL3',
  'CELL_UV_FAULT_LEVEL3',
  'CHG_OT_FAULT_LEVEL3',
  'CHG_UT_FAULT_LEVEL3',
  'DSG_OT_FAULT_LEVEL3',
  'DSG_UT_FAULT_LEVEL3',
  'SOC_OVER_FAULT_LEVEL3',
  'SOC_UNDER_FAULT_LEVEL3',
  // 堆故障频道
  'BLOCK_HARDWARE_FAULT',
  'BLOCK_TOTAL_FAULT',
  'BLOCK_ANALOG_FAULT_GRADE',
  // 簇通讯失联频道
  'BLOCK_COMM_LOST',
  // 掉线信息频道
  'BROKENWIRE'
]

// 防抖更新筛选选项，避免频繁计算
let updateTimer: ReturnType<typeof setTimeout> | null = null
function debouncedUpdateFilterOptions() {
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  updateTimer = setTimeout(() => {
    clusterStore.updateFaultOptions(sortedAllFaults.value)
    updateTimer = null
  }, 500)
}

function onFaultMsg(_e: unknown, msg: any) {
  parseFault(msg)
  debouncedUpdateFilterOptions()
}

// 确保监听器只注册一次
let attached = false

onMounted(() => {
    // 设置页面类型为独立页面，不显示导航栏的簇选择器
    clusterStore.setCurrentPageType('standalone')
  if (!attached) {
    FAULT_CHANNELS.forEach(ch =>
      window.electron.ipcRenderer.on(ch, onFaultMsg)
    )
    attached = true
    console.log('[debug] Fault listeners attached')
  }
  // 初始化筛选选项
  nextTick(() => {
    clusterStore.updateFaultOptions(sortedAllFaults.value)
  })
})

onBeforeUnmount(() => {
  // 清理定时器
  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }

  //清理防抖定时器
  if (resetPageTimer) {
    clearTimeout(resetPageTimer)
    resetPageTimer = null
  }

  // 清理监听器
  if (attached) {
    // 🚀 修复：使用正确的API清理监听器
    FAULT_CHANNELS.forEach(ch => {
      try {
        window.electron.ipcRenderer.removeAllListeners(ch, onFaultMsg)
      } catch (error) {
        console.warn(`清理监听器失败: ${ch}`, error)
      }
    })
    attached = false
    console.log('[debug] Fault listeners removed')
  }
})

/* ---------- 计算属性：为原始选项添加 label ---------- */
// 为堆选项添加 label（原生select需要显示文本）
const blockOptionsWithLabel = computed(() => {
  const blocks = clusterStore.availableBlocks as any[]
  return blocks.map(block => ({
    ...block,
    label: `堆${block.value}`  // 添加label
  }))
})

// 为簇选项添加 label（原生select需要显示文本）
const clusterOptionsWithLabel = computed(() => {
  const clusters = clusterStore.availableFaultClusters as any[]
  return clusters.map(cluster => ({
    ...cluster,
    label: cluster.value  // 使用value作为label
  }))
})

/* ---------- 筛选数据计算 ---------- */
const filteredFaults = computed(() => {
  let faults = clusterStore.filterFaultData(sortedAllFaults.value)

  // 手动排序：根据故障等级排序
  if (sortOrder.value !== 'none') {
    const severityOrder: Record<string, number> = { 'severe': 3, 'medium': 2, 'mild': 1, 'none': 0 }

    faults = [...faults].sort((a, b) => {
      const aLevel = severityOrder[a.levelTag] ?? 0
      const bLevel = severityOrder[b.levelTag] ?? 0

      if (sortOrder.value === 'desc') {
        return bLevel - aLevel // 严重到轻微
      } else {
        return aLevel - bLevel // 轻微到严重
      }
    })
  }

  return faults
})

/* ---------- 分页计算 ---------- */
const total = computed(() => filteredFaults.value.length)

const pageRows = computed(() => {
  const faults = filteredFaults.value
  const start = first.value
  const end = Math.min(start + pageSize, faults.length)
  return faults.slice(start, end)
})

function onPageChange(e: any) {
  first.value = e.first
}

/* ---------- 故障等级颜色映射 ---------- */
function getSeverityColor(levelTag: string): string {
  const severityColorMap: Record<string, string> = {
    'severe': 'danger',
    'medium': 'warning',
    'mild': 'info',
    'none': 'secondary'
  }
  return severityColorMap[levelTag] || 'secondary'
}

/* ---------- 手动排序函数 ---------- */
function toggleSort() {
  // 循环切换排序状态：无排序 → 严重到轻微 → 轻微到严重 → 无排序
  if (sortOrder.value === 'none') {
    sortOrder.value = 'desc' // 严重到轻微
  } else if (sortOrder.value === 'desc') {
    sortOrder.value = 'asc'  // 轻微到严重
  } else {
    sortOrder.value = 'none' // 无排序
  }
}

// 性能优化：使用防抖的watch，减少频繁重置
let resetPageTimer: ReturnType<typeof setTimeout> | null = null
watch([
  () => clusterStore.faultFilterMode,
  () => clusterStore.selectedBlocksForFault,
  () => clusterStore.selectedClustersForFault
], () => {
  // 防抖处理，避免快速连续的筛选条件变化
  if (resetPageTimer) {
    clearTimeout(resetPageTimer)
  }
  resetPageTimer = setTimeout(() => {
    first.value = 0
    resetPageTimer = null
  }, 50) // 减少到50ms防抖，提升响应速度
}, {
  deep: false, // 不进行深度监听，提升性能
  flush: 'post' // 在DOM更新后执行，避免阻塞渲染
})

/* ---------- 筛选操作方法 ---------- */
function setFilterMode(mode: 'all' | 'block' | 'cluster') {
  clusterStore.setFaultFilterMode(mode)
}

/* ---------- 掉线信息动态翻译函数 ---------- */
/**
 * 掉线信息动态翻译函数
 * 用于处理包含序号的掉线信息翻译，避免在JSON中预定义大量翻译条目
 * @param {string} desc - 原始掉线信息描述
 * @param {string} locale - 当前语言设置
 * @returns {string} 翻译后的描述
 */
function translateBrokenwireFault(desc: string, locale: string): string {
  // 中文环境直接返回原始描述
  if (locale === 'zh') return desc
  
  // 解析掉线信息中的参数（BMU编号、AFE编号、Cell编号、Temp编号、插件编号）
  const bmuMatch = desc.match(/BMU(\d+)/)
  const afeMatch = desc.match(/AFE(\d+)/)
  const cellMatch = desc.match(/Cell(\d+)/)
  const tempMatch = desc.match(/Temp(\d+)/)
  const plugMatch = desc.match(/插件(\d+)/)
  
  // 根据掉线信息类型和参数生成英文翻译
  if (desc.includes('失联') && bmuMatch && afeMatch) {
    // BMU AFE失联模式：BMU1 AFE1 失联 → BMU1 AFE1 Disconnect
    return `BMU${bmuMatch[1]} AFE${afeMatch[1]} Disconnect`
  } else if (desc.includes('失联') && bmuMatch) {
    // BMU失联模式：BMU1 失联 → BMU1 Disconnect
    return `BMU${bmuMatch[1]} Disconnect`
  } else if (desc.includes('电压二级掉线') && bmuMatch && cellMatch) {
    // 电压二级掉线模式：BMU1 Cell1 电压二级掉线 → BMU1 Cell1 Voltage Secondary Disconnect
    return `BMU${bmuMatch[1]} Cell${cellMatch[1]} Voltage Secondary Disconnect`
  } else if (desc.includes('温度二级掉线') && bmuMatch && tempMatch) {
    // 温度二级掉线模式：BMU1 Temp1 温度二级掉线 → BMU1 Temp1 Temperature Secondary Disconnect
    return `BMU${bmuMatch[1]} Temp${tempMatch[1]} Temperature Secondary Disconnect`
  } else if (desc.includes('插件') && plugMatch) {
    // 插件温度掉线模式：BMU1 插件1温度掉线 → BMU1 Connector1 Temperature Disconnect
    if (bmuMatch) {
      return `BMU${bmuMatch[1]} Connector${plugMatch[1]} Temperature Disconnect`
    } else {
      return `Connector${plugMatch[1]} Temperature Disconnect`
    }
  } else if (desc === 'AFE失联') {
    // 简化的AFE失联：AFE失联 → AFE Disconnect
    return 'AFE Disconnect'
  } else if (desc === '电压掉线') {
    // 简化的电压掉线：电压掉线 → Voltage Disconnect
    return 'Voltage Disconnect'
  } else if (desc === '温度掉线') {
    // 简化的温度掉线：温度掉线 → Temperature Disconnect
    return 'Temperature Disconnect'
  } else if (desc === '插件温度掉线') {
    // 简化的插件温度掉线：插件温度掉线 → Connector Temperature Disconnect
    return 'Connector Temperature Disconnect'
  }
  
  // 如果无法识别模式，返回原始描述
  return desc
}

/* ---------- 二级故障动态翻译函数 ---------- */
/**
 * 二级故障动态翻译函数
 * 用于处理包含BMU编号的二级故障翻译，避免在JSON中预定义大量翻译条目
 * @param {string} desc - 原始故障描述
 * @param {string} locale - 当前语言设置
 * @returns {string} 翻译后的描述
 */
function translateFaultLevel2(desc: string, locale: string): string {
  // 中文环境直接返回原始描述
  if (locale === 'zh') return desc
  
  // 解析BMU编号和插件编号
  const bmuMatch = desc.match(/BMU(\d+)/)
  const plugMatch = desc.match(/插件(\d+)/)
  
  // BMU级故障翻译
  if (bmuMatch) {
    const bmuNum = bmuMatch[1]
    
    // 插件过温故障
    if (plugMatch && desc.includes('插件') && desc.includes('过温')) {
      return `BMU${bmuNum} Pack connector${plugMatch[1]} Overtemperature`
    }
    
    // BMU过压/欠压/过温/欠温
    if (desc.includes('BMU过压')) {
      return `BMU${bmuNum} BMU Overvoltage`
    } else if (desc.includes('BMU欠压')) {
      return `BMU${bmuNum} BMU Undervoltage`
    } else if (desc.includes('BMU过温')) {
      return `BMU${bmuNum} BMU Overtemperature`
    } else if (desc.includes('BMU欠温')) {
      return `BMU${bmuNum} BMU Undertemperature`
    }
  }
  
  // 非BMU级别的其他故障（不带编号）
  if (desc === '单体压差过大') {
    return 'Excessive Voltage Difference between cells'
  } else if (desc === '单体温差过大') {
    return 'Excessive Temperature Difference between cells'
  } else if (desc === 'SOC差异过大') {
    return 'Excessive SOC Difference between cells'
  } else if (desc === 'BMU压差') {
    return 'Excessive Voltage Difference between BMUs'
  } else if (desc === '簇端过压') {
    return 'Cluster Overvoltage'
  } else if (desc === '簇端欠压') {
    return 'Cluster Undervoltage'
  } else if (desc === '绝缘正对地') {
    return 'Lower Positive Insulation Resistance'
  } else if (desc === '绝缘负对地') {
    return 'Lower Negative Insulation Resistance'
  } else if (desc === '充电过流') {
    return 'Charge Over Current'
  } else if (desc === '放电过流') {
    return 'Discharge Over Current'
  } else if (desc === 'RT1过温') {
    return 'RT1 Overtemperature'
  } else if (desc === 'RT2过温') {
    return 'RT2 Overtemperature'
  } else if (desc === 'RT3过温') {
    return 'RT3 Overtemperature'
  } else if (desc === 'RT4过温') {
    return 'RT4 Overtemperature'
  } else if (desc === 'RT5过温') {
    return 'RT5 Overtemperature'
  }
  
  // 如果无法识别模式，返回原始描述
  return desc
}


/* ---------- 故障翻译方法 ---------- */
function getFaultTranslation(data: any): string {
  if (!data || !data.desc) return data?.desc || ''
  
  const { desc, dataType } = data
  
  // 根据dataType确定翻译对象
  let topicKey = ''
  
  switch (dataType) {
    case 'TOTAL_FAULT':
      topicKey = 'totalFaults'
      break
    case 'OUTPUT_FAULT_MAP':
      topicKey = 'outputFaultMap'
      break
    case 'SAVED_FAULT_MAP':
      topicKey = 'savedFaultMap'
      break
    case 'FAULT_LEVEL1':
      topicKey = 'faultLevel1'
      break
    case 'FAULT_LEVEL2':
      // 二级故障使用动态翻译，避免在JSON中预定义大量翻译条目
      return translateFaultLevel2(desc, locale.value)
    // 三级故障精准匹配
    case 'CELL_OV_FAULT_LEVEL3':
    case 'CELL_UV_FAULT_LEVEL3':
    case 'CHG_OT_FAULT_LEVEL3':
    case 'CHG_UT_FAULT_LEVEL3':
    case 'DSG_OT_FAULT_LEVEL3':
    case 'DSG_UT_FAULT_LEVEL3':
    case 'SOC_OVER_FAULT_LEVEL3':
    case 'SOC_UNDER_FAULT_LEVEL3':
      topicKey = 'faultLevel3'
      break
    case 'BLOCK_HARDWARE_FAULT':
      topicKey = 'blockHardwareFault'
      break
    case 'BLOCK_TOTAL_FAULT':
      topicKey = 'blockTotalFault'
      break
    case 'BLOCK_ANALOG_FAULT_GRADE':
      topicKey = 'blockAnalogFaultGrade'
      break
    case 'BLOCK_COMM_LOST':
      topicKey = 'blockCommLost'
      break
    case 'BROKENWIRE':
      // 掉线信息使用动态翻译，避免在JSON中预定义大量翻译条目
      return translateBrokenwireFault(desc, locale.value)
    default:
      // 未知故障类型，返回原始描述
      return desc
  }
  
  // 尝试获取翻译
  const translationKey = `alarmInfoPage.${topicKey}.${desc}`
  if (te(translationKey)) {
    return t(translationKey)
  }
  
  // 如果没有找到翻译，返回原始描述
  return desc
}


</script>
<template>
  <div class="card">
    <div class="fault-page">
      <!--  统一的故障数据表格 -->
      <div class="fault-table-unified">
        <!-- 统一的表格头部 - 包含筛选功能 -->
          <div class="unified-header">
            <!-- 蓝色标题区域 -->
            <div class="header-title-blue">
              <h3 class="title-text">{{ t('alarmInfoPage.sections.title') }}</h3>
            </div>

            <!-- 白色筛选控制区域 -->
            <div class="filter-content-white">
              <!-- 单行布局：按钮 + 下拉框 + 统计 -->
              <div class="flex align-items-center justify-content-start gap-5">
                <!-- 左侧：筛选按钮和下拉框组合 -->
                <div class="flex align-items-center gap-3 mr-auto">
                  <div class="flex gap-2">
                    <button
                      @click="setFilterMode('all')"
                      :class="['btn', 'filter-button-small', clusterStore.faultFilterMode === 'all' ? 'btn-primary' : 'btn-secondary']"
                    >
                      {{ t('alarmInfoPage.buttons.allFaults') }}
                    </button>
                    <button
                      @click="setFilterMode('block')"
                      :class="['btn', 'filter-button-small', clusterStore.faultFilterMode === 'block' ? 'btn-primary' : 'btn-secondary']"
                    >
                      {{ t('alarmInfoPage.buttons.filterByBlock') }}
                    </button>
                    <button
                      @click="setFilterMode('cluster')"
                      :class="['btn', 'filter-button-small', clusterStore.faultFilterMode === 'cluster' ? 'btn-primary' : 'btn-secondary']"
                    >
                      {{ t('alarmInfoPage.buttons.filterByCluster') }}
                    </button>
                  </div>

                  <!-- 紧跟按钮的复选框组 -->
                  <div class="flex-shrink-0" v-if="clusterStore.faultFilterMode !== 'all'">
                    <!-- 堆筛选 -->
                    <div v-if="clusterStore.faultFilterMode === 'block'" class="checkbox-group">
                      <!-- 全选/取消全选控件 -->
                      <label class="checkbox-item select-all-item">
                        <input
                          type="checkbox"
                          :checked="clusterStore.isAllBlocksSelectedForFault"
                          @change="clusterStore.toggleSelectAllBlocksForFault"
                          class="native-checkbox"
                        />
                        <span class="checkbox-label select-all-label">{{ t('alarmInfoPage.buttons.selectAll') }}</span>
                      </label>
                      <!-- 分隔线 -->
                      <div class="checkbox-divider"></div>
                      <!-- 堆选项 -->
                      <label 
                        v-for="(option, index) in blockOptionsWithLabel"
                        :key="index"
                        class="checkbox-item"
                      >
                        <input
                          type="checkbox"
                          :value="option.value"
                          v-model="clusterStore.selectedBlocksForFault"
                          class="native-checkbox"
                        />
                        <span class="checkbox-label">{{ option.label }}</span>
                      </label>
                    </div>

                    <!-- 簇筛选 -->
                    <div v-if="clusterStore.faultFilterMode === 'cluster'" class="checkbox-group">
                      <!-- 全选/取消全选控件 -->
                      <label class="checkbox-item select-all-item">
                        <input
                          type="checkbox"
                          :checked="clusterStore.isAllClustersSelectedForFault"
                          @change="clusterStore.toggleSelectAllClustersForFault"
                          class="native-checkbox"
                        />
                        <span class="checkbox-label select-all-label">{{ t('alarmInfoPage.buttons.selectAll') }}</span>
                      </label>
                      <!-- 分隔线 -->
                      <div class="checkbox-divider"></div>
                      <!-- 簇选项 -->
                      <label 
                        v-for="(option, index) in clusterOptionsWithLabel"
                        :key="index"
                        class="checkbox-item"
                      >
                        <input
                          type="checkbox"
                          :value="option.value"
                          v-model="clusterStore.selectedClustersForFault"
                          class="native-checkbox"
                        />
                        <span class="checkbox-label">{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- 右侧：故障统计信息 -->
                <div class="fault-count-badge">
                  <i class="pi pi-info-circle mr-1"></i>
                  <span>{{ t('alarmInfoPage.sections.faultStatistics', { total }) }}</span>
                </div>
              </div>
            </div>
          </div>
        
        <!-- 原生表格 -->
        <div class="table-wrapper">
          <table class="native-table">
            <thead>
              <tr>
                <th class="text-center" style="width:80px">{{ t('alarmInfoPage.table.headers.sequence') }}</th>
                <th style="min-width:160px">{{ t('alarmInfoPage.table.headers.occurrenceTime') }}</th>
                <th style="min-width:260px">{{ t('alarmInfoPage.table.headers.faultDescription') }}</th>
                <th class="text-center" style="width:110px">{{ t('alarmInfoPage.table.headers.blockClusterNumber') }}</th>
                <th class="text-center" style="width:120px">{{ t('alarmInfoPage.table.headers.bmuNumber') }}</th>
                <th class="text-center" style="width:100px">{{ t('alarmInfoPage.table.headers.cell') }}</th>
                <th class="text-center" style="width:120px">{{ t('alarmInfoPage.table.headers.globalSequence') }}</th>
                <th class="text-center" style="width:120px">
                  <div class="flex align-items-center justify-content-center gap-1 cursor-pointer" @click="toggleSort">
                    <span>{{ t('alarmInfoPage.table.headers.faultLevel') }}</span>
                    <i
                      :class="{
                        'pi pi-sort': sortOrder === 'none',
                        'pi pi-sort-amount-down': sortOrder === 'desc',
                        'pi pi-sort-amount-up': sortOrder === 'asc'
                      }"
                      class="text-sm"
                    ></i>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pageRows.length === 0">
                <td colspan="8" class="empty-message">
                  {{ total === 0 ? t('alarmInfoPage.messages.noFilteredFaults') : t('alarmInfoPage.messages.noFaults') }}
                </td>
              </tr>
              <tr v-for="(data, index) in pageRows" :key="`${data.cluster}-${data.label}-${data.ts}`">
                <td class="text-center">{{ first + index + 1 }}</td>
                <td>{{ data.time }}</td>
                <td>{{ getFaultTranslation(data) }}</td>
                <td class="text-center">
                  {{ data.cluster.endsWith('-0') ? data.cluster.split('-')[0] : data.cluster }}
                </td>
                <td class="text-center">
                  {{ data.bmu === null || data.bmu === 0 ? '-' : data.bmu }}
                </td>
                <td class="text-center">
                  {{ data.cell === null || data.cell === 0 ? '-' : data.cell }}
                </td>
                <td class="text-center">
                  {{
                    data.globalTemp !== null && data.globalTemp !== 0 ? data.globalTemp :
                    data.globalCell !== null && data.globalCell !== 0 ? data.globalCell :
                    '-'
                  }}
                </td>
                <td class="text-center">
                  <span
                    :class="['native-tag', `tag-${getSeverityColor(data.levelTag)}`]"
                  >
                    {{ t(data.levelTxt) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 原生分页器 -->
        <div class="native-paginator">
          <div class="paginator-left">
            <span class="paginator-info">
              {{ first + 1 }} - {{ Math.min(first + pageSize, total) }} / {{ total }}
            </span>
          </div>
          <div class="paginator-center">
            <button
              class="btn btn-secondary paginator-btn"
              @click="first = 0"
              :disabled="first === 0"
            >
              <i class="pi pi-angle-double-left"></i>
            </button>
            <button
              class="btn btn-secondary paginator-btn"
              @click="first = Math.max(0, first - pageSize)"
              :disabled="first === 0"
            >
              <i class="pi pi-angle-left"></i>
            </button>
            <span class="paginator-pages">
              {{ Math.floor(first / pageSize) + 1 }} / {{ Math.ceil(total / pageSize) || 1 }}
            </span>
            <button
              class="btn btn-secondary paginator-btn"
              @click="first = Math.min(total - pageSize, first + pageSize)"
              :disabled="first + pageSize >= total"
            >
              <i class="pi pi-angle-right"></i>
            </button>
            <button
              class="btn btn-secondary paginator-btn"
              @click="first = Math.floor((total - 1) / pageSize) * pageSize"
              :disabled="first + pageSize >= total"
            >
              <i class="pi pi-angle-double-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 页面整体布局 */
.fault-page {
  padding: 3px;
}

/* 统一表格容器样式 */
.fault-table-unified {
  background: var(--surface-card);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--surface-border);
  overflow: hidden;
}

/* 表格包装器 */
.table-wrapper {
  overflow-x: auto;
}

/* 原生表格样式 */
.native-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--surface-card);
  font-size: 12px;
}

.native-table thead th {
  padding: 6px 6px;
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
  background-color: var(--surface-section);
  border-bottom: 2px solid var(--surface-border);
  font-size: 12px;
  line-height: 1.4;
}

.native-table thead th.text-center {
  text-align: center;
}

.native-table tbody tr {
  transition: all 0.2s ease;
}

.native-table tbody tr:hover {
  background: var(--surface-hover) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.native-table tbody tr:not(:last-child) td {
  border-bottom: 1px solid var(--surface-border);
}

.native-table tbody tr:last-child td {
  border-bottom: 2px solid var(--surface-border);
}

.native-table tbody td {
  padding: 6px 6px;
  color: var(--text-color);
  vertical-align: middle;
  font-size: 12px;
  line-height: 1.4;
}

.native-table tbody td.text-center {
  text-align: center;
}

.native-table tbody td.empty-message {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 2rem 1rem;
}

/* 统一头部样式 */
.unified-header {
  overflow: hidden;
}

/* 蓝色标题区域 */
.header-title-blue {
  background: var(--primary-color);
  color: var(--primary-color-text);
  padding: 14px 20px;
  margin: 0;
}

.title-text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color-text);
}

/* 白色筛选区域 */
.filter-content-white {
  background: var(--surface-card);
  padding: 8px 20px;
  border-bottom: 1px solid var(--surface-border);
}

/* 单行布局 */

.filter-buttons {
  gap: 6px;
}

/* 原生按钮样式 */
.btn {
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-600);
  border-color: var(--primary-600);
}

.btn-secondary {
  background-color: var(--surface-100);
  color: var(--text-color);
  border-color: var(--surface-300);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--surface-200);
}

.filter-button-small {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-weight: 500;
  height: 28px;
}

.filter-button-small:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/*  故障统计徽章样式 */
.fault-count-badge {
  background: linear-gradient(135deg, var(--blue-50) 0%, var(--blue-100) 100%);
  border: 1px solid var(--blue-500);
  color: var(--blue-700);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(14, 165, 233, 0.1);
  transition: all 0.2s ease;
}

.fault-count-badge:hover {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(14, 165, 233, 0.15);
}

/* 下拉框区域 */
.filter-dropdown {
  flex-shrink: 0;
}

/* 复选框组样式 */
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  width: 250px;              /* 固定宽度 */
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 8px;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-0);
  white-space: nowrap;
  flex-shrink: 0;            /* 防止被压缩 */
}

/* 隐藏滚动条但保持滚动功能 */
.checkbox-group::-webkit-scrollbar {
  height: 6px;
}

.checkbox-group::-webkit-scrollbar-track {
  background: transparent;
}

.checkbox-group::-webkit-scrollbar-thumb {
  background: var(--surface-300);
  border-radius: 3px;
}

.checkbox-group::-webkit-scrollbar-thumb:hover {
  background: var(--surface-400);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  padding: 0;
  border-radius: 4px;
  transition: all 0.2s;
  white-space: nowrap;
}

.checkbox-item:hover {
  background-color: var(--surface-hover);
}

/* 全选控件样式 */
.select-all-item {
  font-weight: 600;
  border-right: 1px solid var(--surface-border);
  padding-right: 8px;
  margin-right: 0;
}

.select-all-label {
  font-weight: 600;
  color: var(--primary-color);
}

/* 分隔线样式 */
.checkbox-divider {
  width: 1px;
  height: 16px;
  background-color: var(--surface-border);
  margin: 0 4px;
  flex-shrink: 0;
}

/* 原生复选框样式 */
.native-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--primary-color);
  flex-shrink: 0;
}

.checkbox-label {
  font-size: 12px;
  color: var(--text-color);
  white-space: nowrap;
  line-height: 1;
}

/* 原生标签样式 */
.native-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.tag-danger {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #f87171;
}

.tag-warning {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
}

.tag-info {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #60a5fa;
}

.tag-secondary {
  background-color: #f3f4f6;
  color: #4b5563;
  border: 1px solid #d1d5db;
}



/* 确保蓝色标题区域的圆角 */
.header-title-blue {
  border-radius: 12px 12px 0 0;
}

/* 原生分页器样式 */
.native-paginator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--surface-section);
  border-top: 1px solid var(--surface-border);
  border-radius: 0 0 12px 12px;
}

.paginator-left,
.paginator-right {
  flex: 1;
}

.paginator-center {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.paginator-info {
  font-size: 0.875rem;
  color: var(--text-color);
}

.paginator-btn {
  padding: 0.25rem 0.5rem;
  min-width: 32px;
  height: 32px;
  font-size: 0.875rem;
}

.paginator-pages {
  font-size: 0.875rem;
  color: var(--text-color);
  min-width: 60px;
  text-align: center;
}

.paginator-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-0);
  color: var(--text-color);
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
}

.paginator-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
}

.paginator-right {
  display: flex;
  justify-content: flex-end;
}

/* 手动排序按钮样式 */
.cursor-pointer {
  cursor: pointer;
  user-select: none;
}

.cursor-pointer:hover {
  background-color: var(--surface-hover);
  border-radius: 4px;
  padding: 2px 4px;
}

/* 工具类 */
.flex {
  display: flex;
}

.align-items-center {
  align-items: center;
}

.justify-content-start {
  justify-content: flex-start;
}

.justify-content-center {
  justify-content: center;
}

.gap-1 {
  gap: 0.25rem;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.gap-5 {
  gap: 1.25rem;
}

.mr-auto {
  margin-right: auto;
}

.mr-1 {
  margin-right: 0.25rem;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

.text-sm {
  font-size: 0.875rem;
}


/*  响应式优化 */
@media (max-width: 768px) {
  .fault-page {
    padding: 8px;
  }



  .filter-buttons {
    flex-wrap: wrap;
  }
}
</style>
