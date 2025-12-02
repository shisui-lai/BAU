<!-- 故障页面 - 使用 clusterStore 统一管理筛选状态 -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { parseFault, sortedAllFaults } from '../../composables/core/data-processing/common/parseFault'
import { useClusterStore } from '../../stores/device/clusterStore'
import { useBlockStore } from '../../stores/device/blockStore'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'

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
// 使用 blockStore 获取全局堆配置
const blockStore = useBlockStore()

// 使用国际化
const { t, te, locale } = useI18n()

/* ---------- 分页状态 ---------- */
const first = ref(0)      // 当前偏移量
const pageSize = 200      // 每页条数（固定200条）

/* ---------- 手动排序状态 ---------- */
const sortOrder = ref<'none' | 'asc' | 'desc'>('none') // none: 无排序, asc: 轻微到严重, desc: 严重到轻微

/* ---------- BMU上限（仅故障页面使用） ---------- */
const bmuLimitByBlock = ref<Record<number, number>>({})

function onBattParamRead(_e: unknown, msg: any) {
  if (!msg || msg.dataType !== 'BLOCK_BATT_PARAM_R') return
  const blockId = Number(msg.blockId)
  let limit: number | undefined
  // 平铺对象形态
  if (msg.data && typeof msg.data === 'object' && !Array.isArray(msg.data)) {
    limit = Number(msg.data.BmuTotalNum)
  } else if (Array.isArray(msg.data)) {
    // 分组数组形态
    const battSection = msg.data.find((d: any) => d && d.class === '系统簇端电池配置参数')
    const item = battSection?.element?.find((e: any) => e && (e.key === 'BmuTotalNum' || e.label === 'BMU总数量'))
    limit = Number(item?.value)
  }
  if (!Number.isFinite(limit) || limit! <= 0 || isNaN(blockId)) {
    console.warn('[Fault.vue] BMU上限解析失败或无效:', { blockId, raw: msg.data, limit })
    return
  }
  const prev = bmuLimitByBlock.value[blockId]
  bmuLimitByBlock.value[blockId] = limit!
  console.log(`[Fault.vue] 更新BMU上限: 堆=${blockId}, 上限=${limit}, 旧值=${prev ?? '无'}`)
}

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
  'BLOCK_ANALOG_FAULT_GRADE', // 保留，但会特殊过滤只显示簇间故障
  // 簇通讯失联频道
  'BLOCK_COMM_LOST',
  // 掉线信息频道
  'BROKENWIRE'
  // 移除：CLU_ANALOG_FAULT_GRADE - 簇级故障等级不在故障页面显示，避免与故障总览重复
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
    window.electron.ipcRenderer.on('BLOCK_BATT_PARAM_R', onBattParamRead)
    attached = true
    console.log('[debug] Fault listeners attached')
  }
  // 初始化筛选选项
  nextTick(() => {
    clusterStore.updateFaultOptions(sortedAllFaults.value)
    // 主动读取各堆的BMU配置上限，避免仅写不读导致页面无上限信息
    requestBmuLimitRead()
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
    try {
      window.electron.ipcRenderer.removeAllListeners('BLOCK_BATT_PARAM_R', onBattParamRead)
    } catch {}
    attached = false
    console.log('[debug] Fault listeners removed')
  }
})

/* ---------- 筛选数据计算 ---------- */
const filteredFaults = computed(() => {
  // 计算用于展示的故障列表：
  // 1) 先按堆/簇筛选（clusterStore.filterFaultData）
  // 2) 再依据 BMU 上限对“有BMU序号的定位型故障”进行过滤（仅显示层，不修改存储）
  let faults = clusterStore.filterFaultData(sortedAllFaults.value)

  // 应用BMU上限过滤（仅显示层，不改存储）
  const before = faults.length
  faults = faults.filter(f => {
    const hasBmu = typeof f.bmu === 'number' && Number.isFinite(f.bmu as number)
    if (!hasBmu) return true
    // 从 cluster 解析堆号
    const clusterStr = String(f.cluster || '')
    const parts = clusterStr.split('-')
    const blockId = Number(parts[0])
    const limit = bmuLimitByBlock.value[blockId]
    if (!Number.isFinite(limit)) return true
    return (f.bmu as number) <= limit
  })
  const after = faults.length
  if (after !== before) {
    console.log(`[Fault.vue] 应用BMU上限过滤: ${before} -> ${after}`)
  }

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

// 主动请求BMU上限读取（按当前堆配置）
function requestBmuLimitRead() {
  try {
    const blocks = Array.isArray(blockStore.availableBlocks) ? blockStore.availableBlocks : []
    blocks.forEach(opt => {
      const blockId = Number((opt as any).block || String((opt as any).value).replace('block', ''))
      if (!Number.isFinite(blockId) || blockId <= 0) return
      const topic = `bms/host/s2d/b${blockId}/block_batt_param_r`
      ;(window as any).electronAPI?.mqttPublish?.(topic, 'ff')
      console.log(`[Fault.vue] 请求BMU上限读取: ${topic}`)
    })
  } catch (e) {
    console.warn('[Fault.vue] 请求BMU上限读取失败:', e)
  }
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
      <DataTable
        :value="pageRows"
        paginator
        lazy
        :totalRecords="total"
        :rows="pageSize"
        :first="first"
        @page="onPageChange"
        :dataKey="(item: any) => `${item.cluster}-${item.label}-${item.ts}`"
        class="fault-table-unified"
        :emptyMessage="total === 0 ? t('alarmInfoPage.messages.noFilteredFaults') : t('alarmInfoPage.messages.noFaults')"
        stripedRows
        responsiveLayout="scroll"
      >
        <!-- 统一的表格头部 - 包含筛选功能 -->
        <template #header>
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
                    <Button
                      :label="t('alarmInfoPage.buttons.allFaults')"
                      :severity="clusterStore.faultFilterMode === 'all' ? 'primary' : 'secondary'"
                      :outlined="clusterStore.faultFilterMode !== 'all'"
                      @click="setFilterMode('all')"
                      class="filter-button-small"
                    />
                    <Button
                      :label="t('alarmInfoPage.buttons.filterByBlock')"
                      :severity="clusterStore.faultFilterMode === 'block' ? 'primary' : 'secondary'"
                      :outlined="clusterStore.faultFilterMode !== 'block'"
                      @click="setFilterMode('block')"
                      class="filter-button-small"
                    />
                    <Button
                      :label="t('alarmInfoPage.buttons.filterByCluster')"
                      :severity="clusterStore.faultFilterMode === 'cluster' ? 'primary' : 'secondary'"
                      :outlined="clusterStore.faultFilterMode !== 'cluster'"
                      @click="setFilterMode('cluster')"
                      class="filter-button-small"
                    />
                  </div>

                  <!-- 紧跟按钮的下拉框 -->
                  <div class="flex-shrink-0" v-if="clusterStore.faultFilterMode !== 'all'">
                    <!-- 堆筛选 -->
                    <MultiSelect
                      v-if="clusterStore.faultFilterMode === 'block'"
                      v-model="clusterStore.selectedBlocksForFault"
                      :options="blockStore.availableBlocks"
                      optionLabel="label"
                      optionValue="value"
                      :placeholder="t('alarmInfoPage.placeholders.selectBlocks')"
                      class="filter-multiselect-compact"
                    />

                    <!-- 簇筛选 -->
                    <MultiSelect
                      v-if="clusterStore.faultFilterMode === 'cluster'"
                      v-model="clusterStore.selectedClustersForFault"
                      :options="clusterStore.availableClusters"
                      optionLabel="label"
                      optionValue="value"
                      :placeholder="t('alarmInfoPage.placeholders.selectClusters')"
                      class="filter-multiselect-compact"
                    />
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
        </template>
        


        <!-- 序号列 -->
        <Column :header="t('alarmInfoPage.table.headers.sequence')" headerClass="text-center" bodyClass="text-center" style="width:80px">
          <template #body="{ index }">
            {{ first + index + 1 }}
          </template>
        </Column>
        <Column field="time" :header="t('alarmInfoPage.table.headers.occurrenceTime')" style="min-width:160px" />
        <Column :header="t('alarmInfoPage.table.headers.faultDescription')" style="min-width:260px">
          <template #body="{ data }">
            {{
              getFaultTranslation(data)
            }}
          </template>
        </Column>
      <Column :header="t('alarmInfoPage.table.headers.blockClusterNumber')" headerClass="text-center" bodyClass="text-center" style="width:110px">
        <template #body="{ data }">
          {{ data.cluster.endsWith('-0') ? data.cluster.split('-')[0] : data.cluster }}
        </template>
      </Column>
        <Column field="bmu" :header="t('alarmInfoPage.table.headers.bmuNumber')" headerClass="text-center" bodyClass="text-center" style="width:120px" >
          <template #body="{ data }">
            {{ data.bmu === null || data.bmu === 0 ? '-' : data.bmu }}
          </template>
        </Column>
      <Column :header="t('alarmInfoPage.table.headers.cell')" headerClass="text-center" bodyClass="text-center" style="width:100px">
        <template #body="{ data }">
          {{ data.cell === null || data.cell === 0 ? '-' : data.cell }}
        </template>
      </Column>
      <Column :header="t('alarmInfoPage.table.headers.globalSequence')" headerClass="text-center" bodyClass="text-center" style="width:120px">
        <template #body="{ data }">
          {{
            data.globalTemp !== null && data.globalTemp !== 0 ? data.globalTemp :
            data.globalCell !== null && data.globalCell !== 0 ? data.globalCell :
            '-'
          }}
        </template>
      </Column>
      <Column headerClass="text-center" bodyClass="p-0" style="width:120px">
        <template #header>
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
        </template>
        <template #body="{ data }">
          <div class="cell-center">
            <Tag
              :value="data.levelTxt === '-' ? '-' : t(data.levelTxt)"
              :severity="getSeverityColor(data.levelTag)"
            />
          </div>
        </template>
      </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
/* 页面整体布局 */
.fault-page {
  padding: 3px;
}

/* 统一表格样式 */
.fault-table-unified {
  background: var(--surface-card);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--surface-border);
  overflow: hidden;
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

.filter-button-small {
  padding: 4px 10px !important;
  font-size: 12px !important;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-weight: 500;
  height: 28px;
}

.filter-button-small:hover {
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

.filter-multiselect-compact {
  width: 180px;
  height: 28px;
}



/*  深度样式优化 */
:deep(.fault-table-unified) {
  border: none;
  border-radius: 12px;
}

:deep(.fault-table-unified .p-datatable-header) {
  background: transparent;
  border: none;
  border-radius: 12px 12px 0 0;
  padding: 0;
}

/* 确保蓝色标题区域的圆角 */
.header-title-blue {
  border-radius: 12px 12px 0 0;
}

:deep(.fault-table-unified .p-datatable-wrapper) {
  border-radius: 0 0 12px 12px;
}

:deep(.p-datatable-thead > tr > th) {
  background: var(--surface-section);
  border-bottom: 2px solid var(--surface-border);
  color: var(--text-color);
  font-weight: 600;
  font-size: 12px;
  padding: 6px 6px;
}

:deep(.p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

:deep(.p-datatable-tbody > tr:hover) {
  background: var(--surface-hover) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:deep(.p-datatable-tbody > tr > td) {
  padding: 6px 6px;
  border-bottom: 1px solid var(--surface-border);
  font-size: 12px;
  line-height: 1.4;
}

/* 确保最后一行也有边框 */
:deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: 2px solid var(--surface-border);
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

/* 单元格居中样式 - 用于flex元素如Tag组件 */
.cell-center {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

:deep(.p-paginator) {
  background: var(--surface-section);
  border-top: 1px solid var(--surface-border);
  border-radius: 0;
  padding: 12px 16px;
}

/*  多选框样式优化 */
:deep(.filter-multiselect-compact.p-multiselect) {
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--surface-border);
  transition: all 0.2s ease;
  height: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
}

:deep(.filter-multiselect-compact.p-multiselect .p-multiselect-label) {
  padding: 0 6px;
  line-height: 28px;
  font-size: 12px;
  display: flex;
  align-items: center;
  height: 100%;
}

:deep(.filter-multiselect-compact.p-multiselect .p-multiselect-trigger) {
  height: 100%;
  display: flex;
  align-items: center;
}

:deep(.filter-multiselect-compact.p-multiselect:hover) {
  border-color: var(--surface-400);
}

:deep(.filter-multiselect-compact.p-multiselect.p-focus) {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
}

:deep(.p-multiselect-panel) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/*  下拉面板内选项样式优化 */
:deep(.p-multiselect-header) {
  padding: 6px 8px;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-section);
  font-size: 11px;
}

:deep(.p-multiselect-items) {
  padding: 4px 0;
}

:deep(.p-multiselect-item) {
  padding: 4px 8px;
  margin: 0 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 11px;
  line-height: 1.3;
}

:deep(.p-multiselect-item:hover) {
  background: var(--surface-hover);
}

:deep(.p-multiselect-item.p-highlight) {
  background: var(--blue-100);
  color: var(--blue-700);
}

/*  标签样式优化 */
:deep(.p-tag) {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 让使用了 headerClass="text-center" 的列，表头真正水平居中 */
:deep(.p-datatable .p-datatable-thead > tr > th.text-center .p-column-header-content) {
  justify-content: center;
}

/* 保底：表头文本居中 */
:deep(.p-datatable .p-datatable-thead > tr > th.text-center) {
  text-align: center;
}

/* 让使用了 bodyClass="text-center" 的列，单元格文本水平居中 */
:deep(.p-datatable .p-datatable-tbody > tr > td.text-center) {
  text-align: center;
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
