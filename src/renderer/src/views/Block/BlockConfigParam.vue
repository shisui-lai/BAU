<!-- 堆配置参数页面 - 包含系统簇端电池配置、系统通讯设备配置、系统操作配置三类参数 -->
<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, ref, computed  } from 'vue'
import { useRemoteControlCore, serializeParameterData, parseParameterReadResponse, parseParameterWriteResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useBlockStore } from '@/stores/device/blockStore'
import { BLOCK_BATT_PARAM_R, BLOCK_COMM_DEV_CFG_R, BLOCK_OPERATE_CFG_R } from '../../../../main/table.js'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Toast from 'primevue/toast'
import TabMenu from 'primevue/tabmenu'
// 下拉配置改为通过 useRemoteControlCore 内置函数处理（方案1）

const toastService = useToast()
const blockStore = useBlockStore()

// 声明为堆级遥调页面（显示堆选择器和下发多选）
const { addPageTypeMapping } = usePageTypeDetection()
addPageTypeMapping('/Block/BlockConfigParam', 'block')

// 确保页面类型正确设置
blockStore.setCurrentPageType('block')

// 计算分类范围（按 class 聚合，过滤保留）
function getFieldByteSize(t) {
  if (typeof t === 'string' && t.startsWith('skip')) return Number(t.slice(4))
  const map = { u8:1,s8:1,u16:2,s16:2,u32:4,s32:4,f32:4, ipv4:4 }
  return map[t] || 2
}

function buildParameterClasses(schema){
  const groups = new Map()
  let offset = 0
  for (const f of schema){
    const size = getFieldByteSize(f.type)
    const cls = f.class || ''
    if (cls && !/保留|预留|skip/i.test(cls)){
      if (!groups.has(cls)) groups.set(cls, { name: cls, byteOffset: offset, byteLength: 0 })
      const g = groups.get(cls)
      g.byteLength += size
    }
    offset += size
  }
  return Array.from(groups.values())
}

// 系统簇端电池配置参数 - 不分类，统一显示
const batteryConfig = {
  dataSource: {
    name: 'BLOCK_BATT_PARAM',
    readTopicTemplate: 'bms/host/s2d/b{block}/block_batt_param_r',
    writeTopicTemplate: 'bms/host/s2d/b{block}/block_batt_param_w',
    parameterFields: BLOCK_BATT_PARAM_R,
    parameterClasses: [{ name: '全部参数', byteOffset: 0, byteLength: 0 }],
    noClassMode: true,
    writeWholeTable: true, // 整表下发，不分块
    // 统一下拉框配置入口（方案1）：指定数据类型与Topic
    dropdown: { dataType: 'block_remote_control', topicType: 'block_batt_param' },
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount) =>
      serializeParameterData(parameterDataFrame, BLOCK_BATT_PARAM_R, startByteOffset, registerCount, '[useBlockBattParam]', '系统簇端电池配置')
  }
}

// 系统通讯设备配置参数
const commDevParamClasses = buildParameterClasses(BLOCK_COMM_DEV_CFG_R)
const commDevConfig = {
  dataSource: {
    name: 'BLOCK_COMM_DEV_CFG',
    readTopicTemplate: 'bms/host/s2d/b{block}/block_comm_dev_cfg_r',
    writeTopicTemplate: 'bms/host/s2d/b{block}/block_comm_dev_cfg_w',
    parameterFields: BLOCK_COMM_DEV_CFG_R,
    parameterClasses: commDevParamClasses,
    writeWholeTable: true, // 整表下发，不分块
    dropdown: { dataType: 'block_remote_control', topicType: 'block_comm_dev_cfg' },
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount) =>
      serializeParameterData(parameterDataFrame, BLOCK_COMM_DEV_CFG_R, startByteOffset, registerCount, '[useBlockCommDevCfg]', '系统通讯设备配置')
  }
}

// 系统操作配置参数
const operateParamClasses = buildParameterClasses(BLOCK_OPERATE_CFG_R)
const operateConfig = {
  dataSource: {
    name: 'BLOCK_OPERATE_CFG',
    readTopicTemplate: 'bms/host/s2d/b{block}/block_operate_cfg_r',
    writeTopicTemplate: 'bms/host/s2d/b{block}/block_operate_cfg_w',
    parameterFields: BLOCK_OPERATE_CFG_R,
    parameterClasses: operateParamClasses,
    writeWholeTable: true, // 整表下发，不分块
    dropdown: { dataType: 'block_remote_control', topicType: 'block_operate_cfg' },
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount) =>
      serializeParameterData(parameterDataFrame, BLOCK_OPERATE_CFG_R, startByteOffset, registerCount, '[useBlockOperateCfg]', '系统操作配置')
  }
}

// 复用通用核心（block模式由usePageTypeDetection控制）
const {
  isCurrentlyReading: isReadingBattery,
  currentSelectedClass: currentBatteryClass,
  currentClassParameterList: currentBatteryParameterList,
  allAvailableClasses: allBatteryClasses,
  switchToParameterClass: switchToBatteryClass,
  startParameterReading: startBatteryReading,
  stopParameterReading: stopBatteryReading,
  sendCurrentClassParameters: sendBatteryParameters,
  updateParameterValue: updateBatteryParameterValue,
  getParameterInputValue: getBatteryParameterInputValue,
  setParameterInputValue: setBatteryParameterInputValue,
  getParameterDecimalPlaces: getBatteryParameterDecimalPlaces,
  handleReceivedParameterData: handleBatteryReceivedParameterData,
  handleParameterWriteResponse: handleBatteryWriteResponse,
  handleParameterReadError: handleBatteryReadError,
  sendParameterReadRequest: sendBatteryReadRequest,
  // 电池配置：下拉与增强列表（统一在一个实例中）
  isParameterDropdown: isBattParameterDropdown,
  getParameterDropdownOptions: getBattParameterDropdownOptions,
  updateDropdownParameterValue: updateBattDropdownParameterValue,
  enhancedParameterList: battEnhancedParameterList
} = useRemoteControlCore(batteryConfig, toastService, { selectorMode: 'block' })

const {
  isCurrentlyReading: isReadingCommDev,
  currentSelectedClass: currentCommDevClass,
  currentClassParameterList: currentCommDevParameterList,
  allAvailableClasses: allCommDevClasses,
  switchToParameterClass: switchToCommDevClass,
  startParameterReading: startCommDevReading,
  stopParameterReading: stopCommDevReading,
  sendCurrentClassParameters: sendCommDevParameters,
  updateParameterValue: updateCommDevParameterValue,
  getParameterInputValue: getCommDevParameterInputValue,
  setParameterInputValue: setCommDevParameterInputValue,
  getParameterDecimalPlaces: getCommDevParameterDecimalPlaces,
  handleReceivedParameterData: handleCommDevReceivedParameterData,
  handleParameterWriteResponse: handleCommDevWriteResponse,
  handleParameterReadError: handleCommDevReadError,
  sendParameterReadRequest: sendCommDevReadRequest,
  // 通讯设备配置：下拉与增强列表（统一在一个实例中）
  isParameterDropdown: isCommParameterDropdown,
  getParameterDropdownOptions: getCommParameterDropdownOptions,
  updateDropdownParameterValue: updateCommDropdownParameterValue,
  enhancedParameterList: commEnhancedParameterList
} = useRemoteControlCore(commDevConfig, toastService, { selectorMode: 'block' })

const {
  isCurrentlyReading: isReadingOperate,
  currentSelectedClass: currentOperateClass,
  currentClassParameterList: currentOperateParameterList,
  allAvailableClasses: allOperateClasses,
  switchToParameterClass: switchToOperateClass,
  startParameterReading: startOperateReading,
  stopParameterReading: stopOperateReading,
  sendCurrentClassParameters: sendOperateParameters,
  updateParameterValue: updateOperateParameterValue,
  getParameterInputValue: getOperateParameterInputValue,
  setParameterInputValue: setOperateParameterInputValue,
  getParameterDecimalPlaces: getOperateParameterDecimalPlaces,
  handleReceivedParameterData: handleOperateReceivedParameterData,
  handleParameterWriteResponse: handleOperateWriteResponse,
  handleParameterReadError: handleOperateReadError,
  sendParameterReadRequest: sendOperateReadRequest,
  // 操作配置：下拉与增强列表（统一在一个实例中）
  isParameterDropdown: isOperateParameterDropdown,
  getParameterDropdownOptions: getOperateParameterDropdownOptions,
  updateDropdownParameterValue: updateOperateDropdownParameterValue,
  enhancedParameterList: operateEnhancedParameterList
} = useRemoteControlCore(operateConfig, toastService, { selectorMode: 'block' })

// 下拉相关函数已从各自实例解构，无需重复创建实例

// 方案：顶部TabMenu仅作导航，内容区始终是一张表（两层框架）

// 顶部导航（仅导航，无内容面板）
const topMenuItems = [
  { label: '系统簇端电池配置参数', key: 'batt' },
  { label: '系统通讯设备配置参数', key: 'comm' },
  { label: '系统操作配置参数', key: 'operate' }
]
const activeIndex = ref(0)
const activeType = computed(() => (topMenuItems[activeIndex.value]?.key || 'batt'))

// 当前视图映射（不在切换时重新读取）
const currentIsReading = computed(() =>
  activeType.value === 'batt' ? (isReadingBattery?.value ?? isReadingBattery)
  : activeType.value === 'comm' ? (isReadingCommDev?.value ?? isReadingCommDev)
  : (isReadingOperate?.value ?? isReadingOperate)
)

const currentParameterList = computed(() =>
  activeType.value === 'batt' ? (currentBatteryParameterList?.value ?? [])
  : activeType.value === 'comm' ? (currentCommDevParameterList?.value ?? [])
  : (currentOperateParameterList?.value ?? [])
)

// 统一过滤：
// - batt：隐藏 skip/保留 行
// - comm：隐藏 预留/Reserved* 行
const filteredParameterList = computed(() => {
  const list = currentParameterList.value || []
  if (activeType.value === 'batt') {
    return list.filter(row => row && !String(row.key || '').startsWith('_skip') && !(row.type || '').startsWith('skip') && !(row.class || '').includes('保留'))
  }
  if (activeType.value === 'comm') {
    return list.filter(row => row && !(row.label || '').includes('预留') && !/^Reserved/i.test(String(row.key || '')))
  }
  return list
})

// 渲染列表：直接复用核心的增强列表，保证默认选中与显示逻辑一致
const renderParameterList = computed(() => {
  const base = activeType.value === 'batt'
    ? (battEnhancedParameterList?.value || [])
    : activeType.value === 'comm'
      ? (commEnhancedParameterList?.value || [])
      : (operateEnhancedParameterList?.value || [])
  
  console.log(`[BlockConfigParam] renderParameterList - activeType: ${activeType.value}, base length: ${base.length}`, base)

  // 应用页面的过滤规则
  const filtered = (() => {
    if (activeType.value === 'batt') {
      return base.filter(row => row && !String(row.key || '').startsWith('_skip') && !(row.type || '').startsWith('skip') && !(row.class || '').includes('保留'))
    }
    if (activeType.value === 'comm') {
      return base.filter(row => row && !(row.label || '').includes('预留') && !/^Reserved/i.test(String(row.key || '')))
    }
    return base
  })()

  // 统一字段名，适配本页模板
  return filtered.map(p => ({
    ...p,
    __inputType: p.inputType === 'dropdown' ? 'dropdown' : 'input',
    __options: p.options || null
  }))
})

function updateDropdownValue(parameterKey, selectedOption){
  if (activeType.value === 'batt') return updateBattDropdownParameterValue(parameterKey, selectedOption)
  if (activeType.value === 'comm') return updateCommDropdownParameterValue(parameterKey, selectedOption)
  return updateOperateDropdownParameterValue(parameterKey, selectedOption)
}

const currentAllClasses = computed(() => {
  if (activeType.value === 'comm') return (allCommDevClasses?.value ?? allCommDevClasses ?? [])
  if (activeType.value === 'operate') return (allOperateClasses?.value ?? allOperateClasses ?? [])
  return [] // batt 无分类
})

const currentSelectedClass = computed(() => {
  if (activeType.value === 'comm') return (currentCommDevClass?.value ?? currentCommDevClass ?? null)
  if (activeType.value === 'operate') return (currentOperateClass?.value ?? currentOperateClass ?? null)
  return null
})

function startReading(){
  if (activeType.value === 'batt') startBatteryReading()
  else if (activeType.value === 'comm') startCommDevReading()
  else startOperateReading()
}

function stopReading(){
  if (activeType.value === 'batt') stopBatteryReading()
  else if (activeType.value === 'comm') stopCommDevReading()
  else stopOperateReading()
}

function sendParameters(){
  if (activeType.value === 'batt') sendBatteryParameters()
  else if (activeType.value === 'comm') sendCommDevParameters()
  else sendOperateParameters()
}

function switchClass(name){
  if (activeType.value === 'comm') switchToCommDevClass(name)
  else if (activeType.value === 'operate') switchToOperateClass(name)
}

// 输入/小数位/更新统一封装
function getInputValue(row, val){
  return activeType.value === 'batt' ? getBatteryParameterInputValue(row, val)
    : activeType.value === 'comm' ? getCommDevParameterInputValue(row, val)
    : getOperateParameterInputValue(row, val)
}

function setInputValue(row, val){
  return activeType.value === 'batt' ? setBatteryParameterInputValue(row, val)
    : activeType.value === 'comm' ? setCommDevParameterInputValue(row, val)
    : setOperateParameterInputValue(row, val)
}

function updateValue(key, val){
  return activeType.value === 'batt' ? updateBatteryParameterValue(key, val)
    : activeType.value === 'comm' ? updateCommDevParameterValue(key, val)
    : updateOperateParameterValue(key, val)
}

function getDecimalPlaces(row){
  return activeType.value === 'batt' ? getBatteryParameterDecimalPlaces(row)
    : activeType.value === 'comm' ? getCommDevParameterDecimalPlaces(row)
    : getOperateParameterDecimalPlaces(row)
}


// 事件处理
function handleBatteryReadEvent(event, mqttMessage){
  console.log('[BlockConfigParam] 收到电池配置读取事件:', mqttMessage)
  if (mqttMessage.dataType !== 'BLOCK_BATT_PARAM_R') return
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockBattParam]', '系统簇端电池配置')
  if (!parsed) return
  if (parsed.result?.error) return handleBatteryReadError(parsed)
  console.log('[BlockConfigParam] 处理电池配置数据前，增强列表长度:', battEnhancedParameterList?.value?.length || 0)
  handleBatteryReceivedParameterData(parsed)
  console.log('[BlockConfigParam] 处理电池配置数据后，增强列表长度:', battEnhancedParameterList?.value?.length || 0)
}

function handleBatteryWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_BATT_PARAM_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockBattParam]', '系统簇端电池配置')
  if (!parsed.className) parsed.className = '系统簇端电池配置'
  handleBatteryWriteResponse(parsed)
}

function handleCommDevReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_COMM_DEV_CFG_R') return
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockCommDevCfg]', '系统通讯设备配置')
  if (!parsed) return
  if (parsed.result?.error) return handleCommDevReadError(parsed)
  handleCommDevReceivedParameterData(parsed)
}

function handleCommDevWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_COMM_DEV_CFG_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockCommDevCfg]', '系统通讯设备配置')
  if (!parsed.className) parsed.className = '系统通讯设备配置'
  handleCommDevWriteResponse(parsed)
}

function handleOperateReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_OPERATE_CFG_R') return
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockOperateCfg]', '系统操作配置')
  if (!parsed) return
  if (parsed.result?.error) return handleOperateReadError(parsed)
  handleOperateReceivedParameterData(parsed)
}

function handleOperateWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_OPERATE_CFG_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockOperateCfg]', '系统操作配置')
  if (!parsed.className) parsed.className = '系统操作配置'
  handleOperateWriteResponse(parsed)
}

onMounted(() => {
  const ipc = window.electron?.ipcRenderer
  if (ipc){
    // 簇端电池配置参数
    ipc.removeAllListeners?.('BLOCK_BATT_PARAM_R')
    ipc.removeAllListeners?.('BLOCK_BATT_PARAM_W')
    ipc.on('BLOCK_BATT_PARAM_R', handleBatteryReadEvent)
    ipc.on('BLOCK_BATT_PARAM_W', handleBatteryWriteEvent)
    
    // 通讯设备配置参数
    ipc.removeAllListeners?.('BLOCK_COMM_DEV_CFG_R')
    ipc.removeAllListeners?.('BLOCK_COMM_DEV_CFG_W')
    ipc.on('BLOCK_COMM_DEV_CFG_R', handleCommDevReadEvent)
    ipc.on('BLOCK_COMM_DEV_CFG_W', handleCommDevWriteEvent)
    
    // 操作配置参数
    ipc.removeAllListeners?.('BLOCK_OPERATE_CFG_R')
    ipc.removeAllListeners?.('BLOCK_OPERATE_CFG_W')
    ipc.on('BLOCK_OPERATE_CFG_R', handleOperateReadEvent)
    ipc.on('BLOCK_OPERATE_CFG_W', handleOperateWriteEvent)
  }
  
  // 确保页面类型正确设置
  blockStore.setCurrentPageType('block')
  
     // 默认选中第一个分类，并自动读取一次
   // 簇端电池配置参数不分类，直接显示所有参数
   if (allCommDevClasses?.value?.length && !currentCommDevClass?.value){
     switchToCommDevClass(allCommDevClasses.value[0].name)
   }
   if (allOperateClasses?.value?.length && !currentOperateClass?.value){
     switchToOperateClass(allOperateClasses.value[0].name)
   }
  
  // 延迟读取，确保选择器已就绪
  setTimeout(() => {
    try { 
      // 检查是否有选中的堆
      if (blockStore.selectedBlockForView) {
        console.log('[BlockConfigParam] 自动执行一次读取')
        sendBatteryReadRequest()
        sendCommDevReadRequest()
        sendOperateReadRequest()
      } else {
        console.log('[BlockConfigParam] 等待堆选择器就绪...')
      }
    } catch(e){
      console.warn('[BlockConfigParam] 自动读取触发失败:', e)
    }
  }, 800)
})

onUnmounted(() => {
  const ipc = window.electron?.ipcRenderer
  if (ipc){
    // 簇端电池配置参数
    ipc.removeListener('BLOCK_BATT_PARAM_R', handleBatteryReadEvent)
    ipc.removeListener('BLOCK_BATT_PARAM_W', handleBatteryWriteEvent)
    
    // 通讯设备配置参数
    ipc.removeListener('BLOCK_COMM_DEV_CFG_R', handleCommDevReadEvent)
    ipc.removeListener('BLOCK_COMM_DEV_CFG_W', handleCommDevWriteEvent)
    
    // 操作配置参数
    ipc.removeListener('BLOCK_OPERATE_CFG_R', handleOperateReadEvent)
    ipc.removeListener('BLOCK_OPERATE_CFG_W', handleOperateWriteEvent)
  }
  
  // 停止所有读取
  if (isReadingBattery.value) stopBatteryReading()
  if (isReadingCommDev.value) stopCommDevReading()
  if (isReadingOperate.value) stopOperateReading()
})

// 备注（预留）
function getParameterRemarkText(){ return '' }

// 电池Tab备注过滤：只显示AFE1的备注，其他AFE项隐藏备注
function getBatteryRemarks(row){
  if (!row) return ''
  const key = row.key || ''
  if (/^Afe1(CellCount|TempCount)$/.test(key)) return row.remarks || ''
  if (/^Afe\d+(CellCount|TempCount)$/.test(key)) return ''
  return row.remarks || ''
}

// ============ 簇使能位配置（bits类型）辅助函数 ============

// 获取簇范围
function getClusterRange(parameterDefinition) {
  const [start, end] = parameterDefinition.clusterRange || [1, 10]
  const range = []
  for (let i = start; i <= end; i++) {
    range.push(i)
  }
  return range
}

// 判断指定簇是否使能
function isClusterEnabled(parameterDefinition, clusterNum) {
  const currentValue = getInputValue(parameterDefinition, parameterDefinition.currentValue)
  if (!Array.isArray(currentValue)) return false
  return currentValue.includes(clusterNum)
}

// 切换单个簇的使能状态
function toggleCluster(parameterDefinition, clusterNum, enabled) {
  const currentValue = getInputValue(parameterDefinition, parameterDefinition.currentValue)
  let newValue = Array.isArray(currentValue) ? [...currentValue] : []
  
  if (enabled) {
    if (!newValue.includes(clusterNum)) {
      newValue.push(clusterNum)
      newValue.sort((a, b) => a - b) // 保持排序
    }
  } else {
    newValue = newValue.filter(num => num !== clusterNum)
  }
  
  updateValue(parameterDefinition.key, setInputValue(parameterDefinition, newValue))
}

// 全选/清空所有簇 - 支持切换功能
function selectAllClusters(parameterDefinition) {
  const currentValue = getInputValue(parameterDefinition, parameterDefinition.currentValue)
  const currentEnabled = Array.isArray(currentValue) ? currentValue : []
  const allClusters = getClusterRange(parameterDefinition)
  
  // 如果当前所有簇都已选中，则清空选择；否则全选
  const isAllSelected = allClusters.every(clusterNum => currentEnabled.includes(clusterNum))
  const newValue = isAllSelected ? [] : allClusters
  
  updateValue(parameterDefinition.key, setInputValue(parameterDefinition, newValue))
}
</script>

<template>
  <div class="card">
    <Toast />

    <!-- 顶部导航（TabMenu，仅作导航，不渲染内容面板） -->
    <div class="control-area mb-1" style="justify-content: flex-start; align-items:center; gap:8px;">
      <TabMenu :model="topMenuItems" v-model:activeIndex="activeIndex" />
    </div>

    <!-- 二级分类（仅当当前类型存在多个分类时出现；电池类型无分类） -->
    <div v-if="(currentAllClasses?.length || 0) > 1" class="class-tabs mb-2">
      <Button v-for="cls in currentAllClasses" :key="cls.name" :label="cls.name" :severity="currentSelectedClass?.name === cls.name ? 'primary' : 'secondary'" :outlined="currentSelectedClass?.name !== cls.name" size="small" class="class-tab-button" @click="switchClass(cls.name)"/>
    </div>

    <!-- 单一表格（唯一内层容器） -->
    <DataTable :value="renderParameterList || []" class="p-datatable-sm" :scrollable="true" scroll-height="585px" :show-gridlines="true">
      <template #header>
        <div class="table-toolbar">
          <div class="toolbar-left">

            <div v-if="(currentAllClasses?.length || 0) > 1" class="class-tabs ml-2">
              <Button v-for="cls in currentAllClasses" :key="cls.name" :label="cls.name" :severity="currentSelectedClass?.name === cls.name ? 'primary' : 'secondary'" :outlined="currentSelectedClass?.name !== cls.name" size="small" class="class-tab-button" @click="switchClass(cls.name)"/>
            </div>
          </div>
          <div class="button-group">
            <Button :label="currentIsReading ? '停止读取' : '开始读取'" :severity="currentIsReading ? 'danger' : 'primary'" size="small" @click="currentIsReading ? stopReading() : startReading()" />
            <Button label="下发参数" severity="warning" size="small" :disabled="currentIsReading" @click="sendParameters" />
          </div>
        </div>
      </template>
      <Column header="参数名称" style="width: 260px" :frozen="true">
        <template #body="{ data }">
          <div v-if="data">
            <div class="font-medium">{{ data.label }}</div>
            <div class="text-xs text-gray-500">{{ data.key }}</div>
          </div>
        </template>
      </Column>
      <Column header="参数值" style="width: 220px">
        <template #body="{ data }">
          <!-- 下拉型参数：已在renderParameterList预计算，避免模板内调用函数引起递归更新 -->
          <Dropdown
            v-if="data?.__inputType==='dropdown'"
            :options="data?.__options || []"
            optionLabel="label"
            optionValue="value"
            :model-value="data?.selectedOption?.value ?? data?.currentValue"
            @update:model-value="(val) => updateDropdownValue(data.key, (data.__options||[]).find(o => (o.value === val)))"
            :disabled="currentIsReading"
            class="w-full"
            size="small"
          />

          <!-- IPv4型参数 -->
          <InputText
            v-else-if="data && data.type === 'ipv4'"
            :model-value="getInputValue(data, data.currentValue)"
            @update:model-value="val => updateValue(data.key, setInputValue(data, val))"
            :disabled="currentIsReading"
            size="small"
            class="w-full"
            placeholder="192.168.1.1"
          />

          <!-- 簇使能位配置参数 -->
          <div v-else-if="data && data.type === 'u16' && data.clusterRange" class="cluster-checkbox-container">
            <div class="cluster-checkboxes">
              <template v-for="clusterNum in getClusterRange(data)" :key="clusterNum">
                <label class="cluster-checkbox">
                  <input 
                    type="checkbox" 
                    :checked="isClusterEnabled(data, clusterNum)"
                    @change="toggleCluster(data, clusterNum, $event.target.checked)"
                    :disabled="currentIsReading"
                  />
                  <span class="cluster-number">{{ String(clusterNum).padStart(2, '0') }}</span>
                </label>
              </template>
            </div>
            <div class="cluster-actions">
              <Button 
                label="全选/清空" 
                size="small" 
                class="cluster-action-btn"
                :disabled="currentIsReading"
                @click="selectAllClusters(data)"
              />
            </div>
          </div>

          <!-- 数值型参数 -->
          <InputNumber
            v-else-if="data"
            :model-value="getInputValue(data, data.currentValue)"
            @update:model-value="val => updateValue(data.key, setInputValue(data, val))"
            :disabled="currentIsReading"
            :step="data.scale ? 1 / data.scale : 1"
            :min-fraction-digits="getDecimalPlaces(data)"
            :max-fraction-digits="getDecimalPlaces(data)"
            size="small"
            class="w-full"
          />
        </template>
      </Column>
      <Column header="单位" style="width: 90px">
        <template #body="{ data }">
          <span v-if="data" class="text-gray-600">{{ data.unit || '-' }}</span>
        </template>
      </Column>
      <Column header="备注说明" style="width: 320px">
        <template #body="{ data }">
          <span v-if="data" class="text-sm text-gray-600">{{ activeType==='batt' ? getBatteryRemarks(data) : (data.remarks || getParameterRemarkText()) }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.control-area{ display:flex; align-items:flex-start }
.button-group{ display:flex; gap:8px }
.class-tabs{ display:flex; flex-wrap:wrap; gap:8px }
.class-tab-button{ min-width:100px }

/* TabMenu容器：去掉整框，避免把所有Tab包成一个大框 */
:deep(.p-tabmenu){
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}
/* 去掉导航条线条，避免三Tab连成一体 */
:deep(.p-tabmenu .p-tabmenu-nav){
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}
/* 单个Tab之间的间距 */
:deep(.p-tabmenu .p-tabmenu-nav .p-tabmenuitem){
  margin-right: 8px;
}
/* 每个Tab自身有完整边框（四边一致），强制下边框颜色 */
:deep(.p-tabmenu .p-tabmenu-nav .p-tabmenuitem .p-menuitem-link){
  border: 1px solid var(--surface-border,#dee2e6) !important;
  border-bottom-color: var(--surface-border,#dee2e6) !important;
  background: var(--surface-card,#ffffff) !important;
  border-radius: 6px !important;
  box-shadow: none !important;
  position: relative; /* 供 ::after 制作底边线 */
}
/* 选中态：四边一致，仅改变颜色 */
:deep(.p-tabmenu .p-tabmenu-nav .p-tabmenuitem.p-highlight .p-menuitem-link){
  border-color: var(--primary-color,#3B82F6) !important;
  border-bottom-color: var(--primary-color,#3B82F6) !important;
  color: var(--primary-color-text,#ffffff) !important;
  background: var(--primary-color,#3B82F6) !important;
}

/* 强制底边线可见：用伪元素绘制，避免主题覆盖或边线合并 */
:deep(.p-tabmenu .p-tabmenu-nav .p-tabmenuitem .p-menuitem-link::after){
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: var(--surface-border,#dee2e6);
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  pointer-events: none;
}
:deep(.p-tabmenu .p-tabmenu-nav .p-tabmenuitem.p-highlight .p-menuitem-link::after){
  background: var(--primary-color,#3B82F6);
}

/* 顶部控制区不产生额外"容器线条" */
.control-area{ border: none; padding: 0 0 .5rem 0; margin-bottom: 20px; }
.class-tabs{ border: none; }

/* ============ 簇使能位配置样式 ============ */
.cluster-checkbox-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--surface-border, #dee2e6);
  border-radius: 4px;
  background: var(--surface-0, #ffffff);
}

.cluster-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 100%;
}

.cluster-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px solid var(--surface-border, #dee2e6);
  border-radius: 3px;
  background: var(--surface-50, #f8f9fa);
  cursor: pointer;
  font-size: 12px;
  min-width: 32px;
  justify-content: center;
  transition: all 0.2s;
}

.cluster-checkbox:hover {
  background: var(--surface-100, #e9ecef);
}

.cluster-checkbox input[type="checkbox"] {
  margin: 0;
  transform: scale(0.9);
}

.cluster-checkbox input[type="checkbox"]:checked + .cluster-number {
  color: var(--primary-color, #3B82F6);
  font-weight: 500;
}

.cluster-number {
  font-family: monospace;
  font-size: 11px;
  min-width: 16px;
  text-align: center;
}

.cluster-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-start;
}

.cluster-action-btn {
  font-size: 11px !important;
  padding: 4px 8px !important;
  height: auto !important;
}
</style>










