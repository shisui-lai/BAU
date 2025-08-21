<!-- 设备管理页面 - 堆系统基本配置参数的读取与下发 -->
<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, computed, ref, nextTick } from 'vue'
import { useRemoteControlCore, serializeParameterData, parseParameterReadResponse, parseParameterWriteResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { BLOCK_COMMON_PARAM_R, BLOCK_TIME_CFG_R, BLOCK_PORT_CFG_R } from '../../../../main/table.js'
import { useBlockCommonParam } from '@/composables/core/data-processing/parameter-management/useBlockCommonParam'
import { useSystemConfig } from '@/composables/core/data-processing/parameter-management/useSystemConfig'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import Toast from 'primevue/toast'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import { getDropdownConfig, isDropdownParameter } from '@/configs/ui/dropdownConfigs'

const toastService = useToast()

//  堆系统基本配置参数配置 - 表驱动
const blockCommonParamHandler = useBlockCommonParam()
// 获取系统配置管理实例，用于在配置下发成功后触发重新读取
const { triggerConfigReload, handleSystemConfigUpdate } = useSystemConfig()
const deviceManagementConfig = {
  dataSource: {
    name: 'BLOCK_COMMON_PARAM',  // 数据源名称标识
    // standalone：本页固定使用 b1。未来需要切堆时，仅需把页面类型改为 'block' 并将模板改回占位符形式
    readTopicTemplate: 'bms/host/s2d/b1/block_common_param_r',
    writeTopicTemplate: 'bms/host/s2d/b1/block_common_param_w',
    // 显式指定下拉命名空间，保证选项按堆遥调-通用配置加载
    dropdown: { dataType: 'block_remote_control', topicType: 'block_common_param' },
    // 下拉配置命名空间不强制指定，走核心默认（block 模式 → block_remote_control.block_common_param）
    // 字段定义直接引用协议表
    parameterFields: BLOCK_COMMON_PARAM_R,
    // 分类自动计算
    parameterClasses: blockCommonParamHandler.getParameterClasses(),
    // 序列化走通用能力
    parameterSerializer: blockCommonParamHandler.serializeBlockCommonParamData
  }
}

// ====== 设备时间设置（读/写分开两行） ======
function calcByteLength(fieldTable){
  const typeSize = { u8:1,s8:1,u16:2,s16:2,u32:4,s32:4,f32:4,ipv4:4 }
  let total = 0
  for(const f of fieldTable){
    if (typeof f.type === 'string' && f.type.startsWith('skip')) { total += Number(f.type.slice(4)); continue }
    const size = typeSize[f.type] || 2
    const count = f.count || 1
    total += size * count
  }
  return total
}

const blockTimeConfig = {
  dataSource: {
    name: 'BLOCK_TIME_CFG',
    readTopicTemplate: 'bms/host/s2d/b1/block_time_cfg_r',
    writeTopicTemplate: 'bms/host/s2d/b1/block_time_cfg_w',
    parameterFields: BLOCK_TIME_CFG_R,
    parameterClasses: [ { name: '系统时间配置', byteOffset: 0, byteLength: calcByteLength(BLOCK_TIME_CFG_R) } ],
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount) =>
      serializeParameterData(parameterDataFrame, BLOCK_TIME_CFG_R, startByteOffset, registerCount, '[useBlockTimeCfg]', '设备时间设置'),
    defaultAddress: { blockNumber: 1, clusterNumber: 0 }
  }
}

const blockPortConfig = {
  dataSource: {
    name: 'BLOCK_PORT_CFG',
    readTopicTemplate: 'bms/host/s2d/b1/block_port_cfg_r',
    writeTopicTemplate: 'bms/host/s2d/b1/block_port_cfg_w',
    parameterFields: BLOCK_PORT_CFG_R,
    parameterClasses: [ { name: '系统端口配置参数', byteOffset: 0, byteLength: calcByteLength(BLOCK_PORT_CFG_R) } ],
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount) =>
      serializeParameterData(parameterDataFrame, BLOCK_PORT_CFG_R, startByteOffset, registerCount, '[useBlockPortCfg]', '系统端口配置参数'),
    defaultAddress: { blockNumber: 1, clusterNumber: 0 }
  }
}

// 声明为独立页面：不显示顶部堆/簇选择；topic已在页面内写死为 b1
const pageType = usePageTypeDetection();
pageType.setPageType('standalone');

// 为堆模式提供默认地址，避免未选择堆时无法生成 key
deviceManagementConfig.dataSource.defaultAddress = { blockNumber: 1, clusterNumber: 0 }

// 使用通用遥调核心功能（堆模式）
const {
  isCurrentlyReading,
  currentSelectedClass,
  currentClassParameterList,
  allAvailableClasses,
  switchToParameterClass,
  startParameterReading,
    // 单次读取（与簇页自动读取保持一致的触发方式）
    sendParameterReadRequest,
  stopParameterReading,
  sendCurrentClassParameters,
  updateParameterValue,
  getParameterInputValue,
  setParameterInputValue,
  getParameterDecimalPlaces,
  handleReceivedParameterData,
  handleParameterWriteResponse,
  handleParameterReadError,
  // 下拉框功能
  isParameterDropdown,
  getParameterDropdownOptions,
  updateDropdownParameterValue,
  enhancedParameterList
// 读取/下设按“堆”逻辑处理（只有 blockId）；顶部显示与否完全由 usePageTypeDetection 控制
} = useRemoteControlCore(deviceManagementConfig, toastService, { selectorMode: 'block' });

// 使用通用遥调核心功能（堆模式）- 设备时间设置
const {
  isCurrentlyReading: isReadingTime,
  sendParameterReadRequest: sendTimeReadRequest,
  sendCurrentClassParameters: sendTimeSetParameters,
  updateParameterValue: updateTimeParameterValue,
  handleReceivedParameterData: handleTimeReceivedParameterData,
  handleParameterWriteResponse: handleTimeWriteResponse,
  handleParameterReadError: handleTimeReadError
} = useRemoteControlCore(blockTimeConfig, toastService, { selectorMode: 'block' })

// 使用通用遥调核心功能（堆模式）- 系统端口配置参数
const {
  isCurrentlyReading: isReadingPort,
  currentClassParameterList: portCurrentClassParameterList,
  enhancedParameterList: portEnhancedParameterList,
  sendParameterReadRequest: sendPortReadRequest,
  sendCurrentClassParameters: sendPortSetParameters,
  updateParameterValue: updatePortParameterValue,
  getParameterInputValue: getPortParameterInputValue,
  handleReceivedParameterData: handlePortReceivedParameterData,
  handleParameterReadError: handlePortReadError,
  handleParameterWriteResponse: handlePortWriteResponse
} = useRemoteControlCore(blockPortConfig, toastService, { selectorMode: 'block' })

// 端口配置：默认选中第一个分类，避免未选中导致列表为空
try {
  if (!allAvailableClasses?.value?.length) {
    console.warn('[PortCfg] 无可用分类')
  } else if (!currentSelectedClass?.value) {
    switchToParameterClass(allAvailableClasses.value[0].name)
    console.log('[PortCfg] 默认选中分类:', allAvailableClasses.value[0].name)
  }
} catch (_) {}

// 端口配置下拉框支持函数
function getPortParameterDropdownOptions(parameterLabel) {
  return getDropdownConfig('block_port_config', 'block_port_cfg', parameterLabel)
}

function isPortParameterDropdown(parameterLabel) {
  return isDropdownParameter('block_port_config', 'block_port_cfg', parameterLabel)
}

function getPortDropdownDisplayValue(parameterLabel, currentValue) {
  const options = getPortParameterDropdownOptions(parameterLabel)
  if (!options || !Array.isArray(options)) return currentValue?.toString() || ''
  
  const option = options.find(opt => opt.value === currentValue)
  return option ? option.label : currentValue?.toString() || ''
}

function updatePortDropdownParameterValue(parameterKey, selectedOption) {
  if (!selectedOption || selectedOption.value === undefined) {
    console.warn(`[PortCfg] 下拉框参数 ${parameterKey} 选项无效:`, selectedOption)
    return
  }
  console.log(`[PortCfg] 更新下拉框参数: ${parameterKey} = ${selectedOption.label} (${selectedOption.value})`)
  updatePortParameterValue(parameterKey, selectedOption.value)
}

// UI调试：打印当前端口卡 class 与列表长度
try {
  console.log('[PortCfg][UI] defaultClass=', currentSelectedClass?.value?.name,
    'allClasses=', (allAvailableClasses?.value||[]).map(c=>c.name))
} catch(_){}

// 时间读取回显与设置数据
const timeReadback = ref({ Year:0, Month:0, Day:0, Hour:0, Minute:0, Second:0 })
const now = new Date()
const timeSetData = ref({
  Year: now.getFullYear(),
  Month: now.getMonth() + 1,
  Day: now.getDate(),
  Hour: now.getHours(),
  Minute: now.getMinutes(),
  Second: now.getSeconds()
})

// 动态电脑当前时间
const currentComputerTime = ref({
  Year: now.getFullYear(),
  Month: now.getMonth() + 1,
  Day: now.getDate(),
  Hour: now.getHours(),
  Minute: now.getMinutes(),
  Second: now.getSeconds()
})

// 定时器更新电脑当前时间
let timeUpdateInterval = null

// 更新电脑当前时间
function updateCurrentTime() {
  const now = new Date()
  currentComputerTime.value = {
    Year: now.getFullYear(),
    Month: now.getMonth() + 1,
    Day: now.getDate(),
    Hour: now.getHours(),
    Minute: now.getMinutes(),
    Second: now.getSeconds()
  }
}

// 读取电脑当前时间到设置时间
function loadCurrentTimeToSet() {
  timeSetData.value = { ...currentComputerTime.value }
}

// 端口配置模型
// 基于 key 的响应式模型：getter 从最新的增强列表中取值，避免引用旧对象
const portModelCache = new Map()
function getPortModel(param){
  const key = param.key
  if (!portModelCache.has(key)) {
    portModelCache.set(key, computed({
      get: () => {
        const list = portEnhancedParameterList?.value || []
        const cur = list.find(p => p.key === key)
        return (cur?.currentValue ?? 0)
      },
      set: (val) => updatePortParameterValue(key, Number(val ?? 0))
    }))
  }
  return portModelCache.get(key)
}

// ====== 右侧卡片高度与左列对齐 ======
const leftColumnRef = ref(null)
const rightCardRef = ref(null)
function syncRightCardHeight() {
  try {
    const left = leftColumnRef.value
    const right = rightCardRef.value
    if (!left || !right) return
    const h = left.offsetHeight
    // 设置右侧卡片高度与左侧完全一致
    right.style.height = h + 'px'
    right.style.maxHeight = h + 'px'
    const content = right.querySelector('.table-content')
    if (content) {
      // 计算内容区域可用高度，减去标题栏高度和内边距
      const titleHeight = right.querySelector('.table-title')?.offsetHeight || 0
      const availableHeight = h - titleHeight - 32 // 32px为上下内边距
      content.style.height = availableHeight + 'px'
      content.style.overflow = 'auto' // 恢复滚动功能
    }
  } catch (_) {}
}

// ================== MQTT事件处理 ==================

/**
 * 处理堆系统基本配置参数读取响应
 * @param {Event} event - 事件对象
 * @param {Object} mqttMessage - MQTT消息数据
 */
function handleDeviceManagementReadEvent(event, mqttMessage) {
  if (mqttMessage.dataType !== 'BLOCK_COMMON_PARAM_R') return
  
  // 【新增】同时转发给useSystemConfig处理，确保堆簇结构能及时更新
  const configData = mqttMessage.data
  if (configData && !configData.error) {
    const config = {
      BlockCount: configData.BlockCount || 0,
      ClusterCount1: configData.ClusterCount1 || 0,
      ClusterCount2: configData.ClusterCount2 || 0
    }
    handleSystemConfigUpdate(config)
  }
  
  // 复用与配置参数页一致的解析流程
  const parsed = blockCommonParamHandler.parseBlockCommonParamReadResponse(mqttMessage)
  if (!parsed) return
  if (parsed.result?.error) {
    handleParameterReadError(parsed)
  } else if (parsed.data) {
    handleReceivedParameterData(parsed)
  }
}

/**
 * 处理堆系统基本配置参数写入应答
 * @param {Event} event - 事件对象  
 * @param {Object} mqttMessage - MQTT消息数据
 */
function handleDeviceManagementWriteEvent(event, mqttMessage) {
  if (mqttMessage.dataType !== 'BLOCK_COMMON_PARAM_W') return
  // 复用与配置参数页一致的解析流程
  const parsed = blockCommonParamHandler.parseBlockCommonParamWriteResponse
    ? blockCommonParamHandler.parseBlockCommonParamWriteResponse(mqttMessage)
    : mqttMessage
  // 为写入提示补充分类名称，避免出现"未知分类"
  if (currentSelectedClass?.value?.name) {
    parsed.className = currentSelectedClass.value.name
  } else if (!parsed.className) {
    parsed.className = '堆系统基本配置'
  }
  handleParameterWriteResponse(parsed)
  
  // 【新增】检查是否是堆系统基本配置的成功写入，如果是则触发系统配置重新读取
  const isSuccess = mqttMessage.data?.success || 
                   mqttMessage.result?.success || 
                   mqttMessage.success || 
                   (mqttMessage.data?.code === 224)  // 成功状态码
  
  if (isSuccess) {
    console.log('🔄 [配置下发] 堆系统基本配置下发成功，触发重新读取')
    // 调用 useSystemConfig 的重新读取方法
    triggerConfigReload()
  }
}

// ================== 页面生命周期 ==================

onMounted(() => {
  console.log('[DeviceManagement] 设备管理页面已挂载')
  
  // 启动电脑时间定时更新
  updateCurrentTime() // 立即更新一次
  timeUpdateInterval = setInterval(updateCurrentTime, 1000) // 每秒更新一次
  
  // 注册MQTT事件监听器（与簇遥调页面一致，使用 window.electron.ipcRenderer）
  const ipc = window.electron?.ipcRenderer
  if (ipc) {
    // 预清理，避免重复绑定
    ipc.removeAllListeners?.('BLOCK_COMMON_PARAM_R')
    ipc.removeAllListeners?.('BLOCK_COMMON_PARAM_W')
    ipc.removeAllListeners?.('BLOCK_TIME_CFG_R')
    ipc.removeAllListeners?.('BLOCK_TIME_CFG_W')
    ipc.removeAllListeners?.('BLOCK_PORT_CFG_R')
    ipc.removeAllListeners?.('BLOCK_PORT_CFG_W')

    console.log('[DeviceManagement] 注册监听: BLOCK_COMMON_PARAM_R / BLOCK_COMMON_PARAM_W')
    ipc.on('BLOCK_COMMON_PARAM_R', handleDeviceManagementReadEvent)
    ipc.on('BLOCK_COMMON_PARAM_W', handleDeviceManagementWriteEvent)
    // 时间与端口
    ipc.on('BLOCK_TIME_CFG_R', handleTimeReadEvent)
    ipc.on('BLOCK_TIME_CFG_W', handleTimeWriteEvent)
    ipc.on('BLOCK_PORT_CFG_R', handlePortReadEvent)
    ipc.on('BLOCK_PORT_CFG_W', handlePortWriteEvent)
  } else {
    console.warn('[DeviceManagement] 未检测到 window.electron.ipcRenderer，无法注册MQTT事件监听')
    console.warn('[DeviceManagement] window.electron =', window.electron)
  }

  // 自动读取一次（与簇遥调一致的体验）：监听器就绪后触发单次读取
  setTimeout(() => {
    try {
      console.log('[DeviceManagement] 自动执行一次读取')
      // 使用核心提供的单次读取方法（固定 b1 单topic）
      sendParameterReadRequest()
      // 同步触发时间与端口配置读取
      sendTimeReadRequest()
      sendPortReadRequest()
      // 同步右侧卡片高度到左列，并安装窗口 resize 监听
      nextTick(() => syncRightCardHeight())
      window.addEventListener('resize', syncRightCardHeight)
    } catch (e) {
      console.warn('[DeviceManagement] 自动读取触发失败:', e)
    }
  }, 600)
})

onUnmounted(() => {
  console.log('[DeviceManagement] 设备管理页面即将卸载')
  
  // 清理定时器
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
    timeUpdateInterval = null
  }
  
  // 清理MQTT事件监听器
  const ipc = window.electron?.ipcRenderer
  if (ipc) {
    console.log('[DeviceManagement] 取消监听: BLOCK_COMMON_PARAM_R / BLOCK_COMMON_PARAM_W')
    ipc.removeListener('BLOCK_COMMON_PARAM_R', handleDeviceManagementReadEvent)
    ipc.removeListener('BLOCK_COMMON_PARAM_W', handleDeviceManagementWriteEvent)
    ipc.removeListener('BLOCK_TIME_CFG_R', handleTimeReadEvent)
    ipc.removeListener('BLOCK_TIME_CFG_W', handleTimeWriteEvent)
    ipc.removeListener('BLOCK_PORT_CFG_R', handlePortReadEvent)
    ipc.removeListener('BLOCK_PORT_CFG_W', handlePortWriteEvent)
  }
  
  // 停止参数读取（如在轮询中）
  if (isCurrentlyReading.value) {
    stopParameterReading()
  }
  // 释放窗口监听
  window.removeEventListener('resize', syncRightCardHeight)
})

// ================== 辅助函数 ==================

/**
 * 判断参数是否已被修改
 * @param {Object} parameter - 参数对象
 * @returns {boolean} 是否已修改
 */
function isParameterModified(parameter) {
  return parameter.currentValue !== parameter.originalValue
}

/**
 * 获取参数的显示值
 * @param {Object} parameter - 参数对象
 * @returns {string} 显示值
 */
function getParameterDisplayValue(parameter) {
  if (isParameterDropdown(parameter)) {
    const options = getParameterDropdownOptions(parameter)
    const selectedOption = options.find(opt => opt.value === parameter.currentValue)
    return selectedOption ? selectedOption.label : String(parameter.currentValue)
  }
  return getParameterInputValue(parameter, parameter.currentValue)
}

/**
 * 更新参数值
 * @param {string} parameterKey - 参数键
 * @param {*} newValue - 新值
 */
function onParameterChange(parameterKey, newValue) {
  updateParameterValue(parameterKey, newValue)
}

console.log('[DeviceManagement] 设备管理页面配置已加载')

// ====== 设备时间：事件处理与UI交互 ======
function handleTimeReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_TIME_CFG_R') return
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockTimeCfg]', '设备时间设置')
  if (!parsed) return
  if (parsed.result?.error) return handleTimeReadError(parsed)
  timeReadback.value = { ...timeReadback.value, ...(parsed.data || {}) }
  handleTimeReceivedParameterData(parsed)
}

function handleTimeWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_TIME_CFG_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockTimeCfg]', '设备时间设置')
  // 补充分类名称，避免弹窗显示“未知分类”
  if (!parsed.className) parsed.className = '系统时间配置'
  handleTimeWriteResponse(parsed)
}

function onTimeSetFieldChange(key, val){
  timeSetData.value[key] = Number(val ?? 0)
}

function sendTimeSet(){
  // 将设置行的数据写入核心的编辑缓存并下发
  Object.entries(timeSetData.value).forEach(([k,v])=> updateTimeParameterValue(k, Number(v)))
  sendTimeSetParameters()
}

function requestTimeRead(){
  sendTimeReadRequest()
}

// ====== 端口配置：事件处理 ======
function handlePortReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_PORT_CFG_R') return
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockPortCfg]', '系统端口配置参数')
  if (!parsed) return
  if (parsed.result?.error) return handlePortReadError(parsed)
  handlePortReceivedParameterData(parsed)
}

function handlePortWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_PORT_CFG_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockPortCfg]', '系统端口配置参数')
  // 补充分类名称，避免弹窗显示“未知分类”
  if (!parsed.className) parsed.className = '系统端口配置参数'
  handlePortWriteResponse(parsed)
}

// ========== 运行模式/结构参数的便捷引用：按key获取 ==========
function useParamRef(key) {
  return computed(() => {
    const list = enhancedParameterList.value || []
    return list.find(p => p.key === key) || { key, currentValue: 0, options: [] }
  })
}

const pRemoteLocalMode = useParamRef('RemoteLocalMode')
const pSplitClusterFlag = useParamRef('SplitClusterFlag')
const pEMSDisconnect    = useParamRef('EMSCommFaultDisconnectEnable')
const pMaintainMode     = useParamRef('MaintainMode')
const pInternalTestMode = useParamRef('InternalTestMode')
const pBlockCount       = useParamRef('BlockCount')
const pClusterCount1    = useParamRef('ClusterCount1')
const pClusterCount2    = useParamRef('ClusterCount2')

function findOption(options, value) {
  return (options || []).find(o => o.value === value) || { label: String(value), value }
}

// ====== 绑定模型封装：避免 undefined 与手动 @change ======
function useDropdownModel(paramRef, key) {
  return computed({
    get: () => {
      const val = paramRef.value?.currentValue
      if (val !== undefined) return val
      // 如果还没有值，且存在配置选项，则默认取第一个
      const opts = optionsForLabel(paramRef.value?.label)
      return (opts && opts.length > 0) ? opts[0].value : 0
    },
    set: (val) => {
      const opt = findOption(paramRef.value?.options || [], val)
      updateDropdownParameterValue(key, opt)
    }
  })
}

function useNumberModel(paramRef, key) {
  return computed({
    get: () => (paramRef.value?.currentValue ?? 0),
    set: (val) => updateParameterValue(key, Number(val ?? 0))
  })
}

// 下拉模型
const mdlRemoteLocalMode = useDropdownModel(pRemoteLocalMode, 'RemoteLocalMode')
const mdlSplitClusterFlag = useDropdownModel(pSplitClusterFlag, 'SplitClusterFlag')
const mdlEMSDisconnect    = useDropdownModel(pEMSDisconnect, 'EMSCommFaultDisconnectEnable')
const mdlMaintainMode     = useDropdownModel(pMaintainMode, 'MaintainMode')
const mdlInternalTestMode = useDropdownModel(pInternalTestMode, 'InternalTestMode')

// 数字模型
const mdlBlockCount    = useNumberModel(pBlockCount, 'BlockCount')
const mdlClusterCount1 = useNumberModel(pClusterCount1, 'ClusterCount1')
const mdlClusterCount2 = useNumberModel(pClusterCount2, 'ClusterCount2')

// 统一获取选项：优先核心生成，其次直接从配置拉取
function optionsForLabel(label){
  // 从核心获取（enhancedParameterList 生成的 options）
  const list = enhancedParameterList.value || []
  const hit = list.find(p => p.label === label)
  if (hit && Array.isArray(hit.options) && hit.options.length > 0) return hit.options
  // 从配置直接获取（保证首屏也有选项）
  const conf = getDropdownConfig('block_remote_control','block_common_param', label)
  if (!conf) return []
  if (Array.isArray(conf)) return conf
  if (conf.options && Array.isArray(conf.options)) return conf.options
  return []
}
</script>

<template>
  <div class="card device-management-container">
    <!-- 指令下发风格的卡片：运行模式 + 结构信息 + 操作按钮 -->
    <div class="table-container order-like-card" v-if="false">
      <h2 class="table-title">堆系统基本配置</h2>
      <div class="table-content">
        <div class="form-grid">
          <div class="form-row">
            <label>远方就地模式</label>
            <Dropdown
              v-model="mdlRemoteLocalMode"
              :options="optionsForLabel('远方就地模式')"
              optionLabel="label"
              optionValue="value"
              :disabled="isCurrentlyReading"
              class="w-full"
            />
    </div>
          <div class="form-row">
            <label>分簇控制标志位</label>
            <Dropdown
              v-model="mdlSplitClusterFlag"
              :options="optionsForLabel('分簇控制标志位')"
              optionLabel="label"
              optionValue="value"
              :disabled="isCurrentlyReading"
              class="w-full"
          />
        </div>
          <div class="form-row">
            <label>EMS通讯故障断接触器使能</label>
            <Dropdown
              v-model="mdlEMSDisconnect"
              :options="optionsForLabel('EMS通讯故障断接触器使能')"
              optionLabel="label"
              optionValue="value"
              :disabled="isCurrentlyReading"
              class="w-full"
          />
        </div>
          <div class="form-row">
            <label>运维模式</label>
            <Dropdown
              v-model="mdlMaintainMode"
              :options="optionsForLabel('运维模式')"
              optionLabel="label"
              optionValue="value"
              :disabled="isCurrentlyReading"
              class="w-full"
            />
      </div>
          <div class="form-row">
            <label>内测模式</label>
              <Dropdown
              v-model="mdlInternalTestMode"
              :options="optionsForLabel('内测模式')"
                optionLabel="label"
                optionValue="value"
                :disabled="isCurrentlyReading"
              class="w-full"
              />
            </div>

          <Divider />

          <div class="form-row">
            <label>当前堆数</label>
            <InputNumber v-model="mdlBlockCount" :min="0" :useGrouping="false" :disabled="isCurrentlyReading" class="w-full" />
          </div>
          <div class="form-row">
            <label>第一堆下簇数</label>
            <InputNumber v-model="mdlClusterCount1" :min="0" :useGrouping="false" :disabled="isCurrentlyReading" class="w-full" />
          </div>
          <div class="form-row">
            <label>第二堆下簇数</label>
            <InputNumber v-model="mdlClusterCount2" :min="0" :useGrouping="false" :disabled="isCurrentlyReading" class="w-full" />
          </div>

          <div class="button-row">
            <Button :label="isCurrentlyReading ? '停止读取' : '开始读取'" :icon="isCurrentlyReading ? 'pi pi-stop' : 'pi pi-play'" :severity="isCurrentlyReading ? 'danger' : 'success'" @click="isCurrentlyReading ? stopParameterReading() : startParameterReading()" size="small" />
            <Button label="下发参数" icon="pi pi-upload" severity="warning" @click="sendCurrentClassParameters" :disabled="isCurrentlyReading" size="small" />
          </div>
        </div>
      </div>
    </div>

    <!-- 页面两列布局：左列（基本配置+时间），右列（端口配置） -->
    <div class="two-col" style="align-items: start;">
      <div class="left-col" ref="leftColumnRef">
        <!-- 堆系统基本配置（移入左列） -->
        <div class="table-container order-like-card basic-card">
          <h2 class="table-title">堆系统基本配置</h2>
          <div class="table-content">
            <div class="form-grid">
              <div class="form-row">
                <label>远方就地模式</label>
                <Dropdown
                  v-model="mdlRemoteLocalMode"
                  :options="optionsForLabel('远方就地模式')"
                  optionLabel="label"
                  optionValue="value"
                  :disabled="isCurrentlyReading"
                  class="w-full"
                />
              </div>
              <div class="form-row">
                <label>分簇控制标志位</label>
                <Dropdown
                  v-model="mdlSplitClusterFlag"
                  :options="optionsForLabel('分簇控制标志位')"
                  optionLabel="label"
                  optionValue="value"
                  :disabled="isCurrentlyReading"
                  class="w-full"
                />
              </div>
              <div class="form-row">
                <label>EMS通讯故障断接触器使能</label>
                <Dropdown
                  v-model="mdlEMSDisconnect"
                  :options="optionsForLabel('EMS通讯故障断接触器使能')"
                  optionLabel="label"
                  optionValue="value"
                  :disabled="isCurrentlyReading"
                  class="w-full"
                />
              </div>
              <div class="form-row">
                <label>运维模式</label>
                <Dropdown
                  v-model="mdlMaintainMode"
                  :options="optionsForLabel('运维模式')"
                  optionLabel="label"
                  optionValue="value"
                  :disabled="isCurrentlyReading"
                  class="w-full"
                />
              </div>
              <div class="form-row">
                <label>内测模式</label>
                <Dropdown
                  v-model="mdlInternalTestMode"
                  :options="optionsForLabel('内测模式')"
                  optionLabel="label"
                  optionValue="value"
                  :disabled="isCurrentlyReading"
                  class="w-full"
                />
              </div>

              <!-- 用伪行占位让 Divider 跨整行，而不破坏 .form-grid 两列对齐 -->
              <div class="form-row full-row">
                <Divider class="section-divider" />
              </div>

              <!-- 恢复与上方相同的两列对齐：左侧中文与上方下拉保持同一列，右侧输入保持同一列 -->
              <div class="form-row">
                <label>当前堆数</label>
                <div class="input-cell"><InputNumber v-model="mdlBlockCount" :min="0" :useGrouping="false" :disabled="isCurrentlyReading" /></div>
              </div>
              <div class="form-row">
                <label>第一堆下簇数</label>
                <div class="input-cell"><InputNumber v-model="mdlClusterCount1" :min="0" :useGrouping="false" :disabled="isCurrentlyReading" /></div>
              </div>
              <div class="form-row">
                <label>第二堆下簇数</label>
                <div class="input-cell"><InputNumber v-model="mdlClusterCount2" :min="0" :useGrouping="false" :disabled="isCurrentlyReading" /></div>
              </div>

              <div class="button-row">
                <Button :label="isCurrentlyReading ? '停止读取' : '开始读取'" :icon="isCurrentlyReading ? 'pi pi-stop' : 'pi pi-play'" :severity="isCurrentlyReading ? 'danger' : 'success'" @click="isCurrentlyReading ? stopParameterReading() : startParameterReading()" size="small" />
                <Button label="下发参数" icon="pi pi-upload" severity="warning" @click="sendCurrentClassParameters" :disabled="isCurrentlyReading" size="small" />
              </div>
            </div>
          </div>
        </div>
        <!-- 设备时间（三个时间块：当前设备时间 + 电脑实时时间 + 设置时间） -->
        <div class="table-container order-like-card dm-card time-card">
          <h2 class="table-title">设备时间设置</h2>
          <div class="table-content">
            <div class="time-grid">
              <!-- 设备当前时间块 -->
              <div class="time-block">
                <div class="time-title">设备当前时间</div>
                <div class="time-line">
                  <InputNumber class="time-input" v-model="timeReadback.Year" :useGrouping="false" disabled />
                  <span>年</span>
                  <InputNumber class="time-input" v-model="timeReadback.Month" :useGrouping="false" disabled />
                  <span>月</span>
                  <InputNumber class="time-input" v-model="timeReadback.Day" :useGrouping="false" disabled />
                  <span>日</span>
                  <InputNumber class="time-input" v-model="timeReadback.Hour" :useGrouping="false" disabled />
                  <span>时</span>
                  <InputNumber class="time-input" v-model="timeReadback.Minute" :useGrouping="false" disabled />
                  <span>分</span>
                  <InputNumber class="time-input" v-model="timeReadback.Second" :useGrouping="false" disabled />
                  <span>秒</span>
                  <div class="spacer"></div>
                  <Button label="读取" size="small" @click="requestTimeRead" />
                </div>
              </div>

              <!-- 电脑实时时间块 -->
              <div class="time-block">
                <div class="time-title">电脑当前时间</div>
                <div class="time-line">
                  <InputNumber class="time-input current-time" v-model="currentComputerTime.Year" :useGrouping="false" disabled />
                  <span>年</span>
                  <InputNumber class="time-input current-time" v-model="currentComputerTime.Month" :useGrouping="false" disabled />
                  <span>月</span>
                  <InputNumber class="time-input current-time" v-model="currentComputerTime.Day" :useGrouping="false" disabled />
                  <span>日</span>
                  <InputNumber class="time-input current-time" v-model="currentComputerTime.Hour" :useGrouping="false" disabled />
                  <span>时</span>
                  <InputNumber class="time-input current-time" v-model="currentComputerTime.Minute" :useGrouping="false" disabled />
                  <span>分</span>
                  <InputNumber class="time-input current-time" v-model="currentComputerTime.Second" :useGrouping="false" disabled />
                  <span>秒</span>
                  <div class="spacer"></div>
                  <span class="live-indicator">● 实时</span>
                </div>
              </div>

              <!-- 时间设置块 -->
              <div class="time-block">
                <div class="time-title">设置时间</div>
                <div class="time-line">
                  <InputNumber class="time-input" v-model="timeSetData.Year" :useGrouping="false" />
                  <span>年</span>
                  <InputNumber class="time-input" v-model="timeSetData.Month" :useGrouping="false" />
                  <span>月</span>
                  <InputNumber class="time-input" v-model="timeSetData.Day" :useGrouping="false" />
                  <span>日</span>
                  <InputNumber class="time-input" v-model="timeSetData.Hour" :useGrouping="false" />
                  <span>时</span>
                  <InputNumber class="time-input" v-model="timeSetData.Minute" :useGrouping="false" />
                  <span>分</span>
                  <InputNumber class="time-input" v-model="timeSetData.Second" :useGrouping="false" />
                  <span>秒</span>
                  <div class="spacer"></div>
                  <Button label="读取当前" size="small" severity="info" @click="loadCurrentTimeToSet" class="sync-btn" />
                  <Button label="设置" size="small" severity="warning" @click="sendTimeSet" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="right-col">
        <!-- 系统端口配置参数卡片（简化：表驱动渲染全部数值字段） -->
        <div class="table-container order-like-card dm-card port-card" ref="rightCardRef">
          <h2 class="table-title">系统端口配置参数</h2>
          <div class="table-content">
            <div class="button-row left compact">
              <Button label="读取" icon="pi pi-download" size="small" @click="sendPortReadRequest" />
              <Button label="设置" icon="pi pi-upload" size="small" severity="warning" @click="sendPortSetParameters" />
            </div>
            <div class="port-grid">
              <div
                v-for="p in portEnhancedParameterList"
                :key="p.key"
                class="port-row two-col-item"
              >
                <div class="port-col">
                  <label class="port-field-label">{{ p.label || p.key }}</label>
                  <!-- IPv4地址字段：使用文本输入框 -->
                  <template v-if="p.type === 'ipv4'">
                    <InputText
                      class="port-field-input"
                      :modelValue="getPortModel(p).value"
                      @update:modelValue="val => (getPortModel(p).value = String(val ?? '0.0.0.0'))"
                      placeholder="0.0.0.0"
                    />
                  </template>
                  <!-- 通讯速率字段：使用下拉框 -->
                  <template v-else-if="isPortParameterDropdown(p.label)">
                    <Dropdown
                      class="port-field-input"
                      :options="getPortParameterDropdownOptions(p.label)"
                      optionLabel="label"
                      :modelValue="getPortParameterDropdownOptions(p.label)?.find(opt => opt.value === getPortModel(p).value)"
                      @update:modelValue="val => updatePortDropdownParameterValue(p.key, val)"
                      placeholder="请选择"
                    />
                  </template>
                  <!-- 其他字段：使用数值输入框 -->
                  <template v-else>
                    <InputNumber class="port-field-input" :useGrouping="false" :modelValue="getPortModel(p).value" @update:modelValue="val => (getPortModel(p).value = Number(val ?? 0))" />
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Toast />
  </div>
</template>

<style scoped>
/* 设备管理页面容器 */
.device-management-container {
  padding: 12px;
  max-height: calc(100vh - 78px);
  overflow: hidden;
}

.dm-card { border: 1px solid #e9ecef; }

.form-grid {
  display: grid;
  grid-template-columns: 200px 1fr; /* 左中文标签、右输入框 */
  gap: 12px 16px;
}

.form-row { display: contents; }
.full-row { grid-column: 1 / -1; display: block; }

.w-full { width: 100%; }
.ml-2 { margin-left: 8px; }
.input-cell { width: 100%; }
.input-cell :deep(.p-inputnumber) { width: 100%; }
.input-cell :deep(.p-inputnumber) { width: 100%; }

.time-grid { display: flex; flex-direction: column; gap: 8px; }
.time-block { display: flex; flex-direction: column; gap: 6px; }
.time-title { color: #4d5965; font-weight: 500; }
.time-line { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.time-input { width: 52px; }
.time-input :deep(input) { 
  width: 100% !important; 
  text-align: left !important;
}
.time-actions { display: flex; justify-content: flex-start; }
.time-actions.right { justify-content: flex-end; }
.time-line .spacer { flex: 1 1 auto; }

/* 电脑实时时间特殊样式 */
.time-input.current-time :deep(.p-inputnumber-input) {
  background: #f8f9fa;
  border: 1px solid #7c94a6;
  color: #70818f;
  font-weight: 600;
  text-align: left;
  box-shadow: 0 0 0 1px rgba(0, 122, 217, 0.1);
}

.live-indicator {
  color: #4caf50;
  font-weight: 600;
  font-size: 0.85rem;
  animation: pulse 2s infinite;
  display: flex;
  align-items: center;
  gap: 4px;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

.sync-btn {
  margin-right: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-bar {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  .form-grid { grid-template-columns: 1fr; }
  
  .read-controls, .write-controls {
    justify-content: center;
  }
  
  .param-title {
    font-size: 1.5rem;
  }
}

/* 指令下发风格卡片样式复用 */
.table-container.order-like-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  background: white;
}
.order-like-card .table-title {
  background: #007ad9;
  color: #ffffff;
  padding: 12px 20px;
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
}
.order-like-card .table-content { padding: 16px 20px 12px; }
.basic-card { min-height: 320px; }
.time-card { min-height: 200px; padding-bottom: 8px; }
.port-card .table-content { padding-top: 8px; }
/* .port-card 高度由JavaScript动态设置 */
.section-divider { margin: 8px 0 6px; border-top: 1px solid #e2e8f0; opacity: 1; }

.form-row > label { color: #4d5965; font-weight: 500; }
.form-row > .w-full { max-width: 520px; }
.form-grid { display: grid; grid-template-columns: 200px 1fr; gap: 10px 16px; }

.button-row { display: flex; justify-content: flex-end; gap: 8px; padding-top: 6px; grid-column: 1 / -1; }
.button-row.left { justify-content: flex-start; }
.button-row.compact { padding-top: 0; margin-bottom: 6px; }

/* 新增两列布局 */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
.left-col, .right-col { display: flex; flex-direction: column; gap: 6px; }

/* 端口表单布局 */
.port-grid { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 10px 16px; 
  padding-right: 6px; 
}
.two-col-item { display: block; }
.port-col { display: flex; flex-direction: column; gap: 6px; border: 1px solid #e9ecef; border-radius: 8px; padding: 10px; background: #fff; }
.port-field-label { color: #4d5965; font-weight: 500; }
.port-field-input { width: 100%; }

@media (max-width: 1200px) {
  .two-col { grid-template-columns: 1fr; }
}

</style>
