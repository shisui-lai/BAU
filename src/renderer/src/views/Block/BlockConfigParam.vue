<!-- 堆配置参数页面 - 包含系统簇端电池配置、系统通讯设备配置、系统操作配置三类参数 -->
<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, onActivated, onDeactivated, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { scheduleAutoRead, cancelAutoRead, registerAutoReadFunction } from '@/composables/utils/useAutoReadScheduler'
import { useRetryLogic } from '@/composables/utils/useRetryLogic'
import { useRemoteControlCore, serializeParameterData, parseParameterReadResponse, parseParameterWriteResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useRawInputCache, isNumericType, validateNumericInput, validateIPv4 } from '@/composables/utils/useParameterInput'
import { useBlockStore } from '@/stores/device/blockStore'
import { BLOCK_BATT_PARAM_R, BLOCK_COMM_DEV_CFG_R, BLOCK_OPERATE_CFG_R, BLOCK_SOC_PARAM_R, BLOCK_PORT_CFG_R, BLOCK_COMMON_PARAM_R } from '../../../../main/table.js'
import { useBlockCommonParam } from '@/composables/core/data-processing/parameter-management/useBlockCommonParam'
import { DEFAULT_BLOCK_CONFIG_PARAMS } from '@/configs/parameterDefaults'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
// 下拉配置改为通过 useRemoteControlCore 内置函数处理（方案1）
import { useSystemConfigStore } from '@/stores/system/systemConfigStore'

const toastService = useToast()
const blockStore = useBlockStore()
const { t, locale, te } = useI18n()
const systemConfigStore = useSystemConfigStore()
const { triggerConfigReload } = systemConfigStore
let bcListenersRegistered = false

// 参数名称翻译函数
const getParameterTranslation = (label) => {
  if (locale.value === 'zh') return label
  return te(`blockConfigParamPage.parameters.${label}`) 
    ? t(`blockConfigParamPage.parameters.${label}`) 
    : label
}

// 备注翻译函数
const getRemarksTranslation = (remarks) => {
  if (!remarks) return ''
  // 检查是否有对应的翻译键
  if (te(`blockConfigParamPage.remarks.${remarks}`)) {
    return t(`blockConfigParamPage.remarks.${remarks}`)
  }
  // 如果没有翻译键，直接返回原始备注
  return remarks
}

// 下拉框选项翻译函数
const translateDropdownOptions = (options, parameterName) => {
  if (!options || !Array.isArray(options)) return options
  if (locale.value === 'zh') return options
  
  return options.map(option => ({
    ...option,
    label: te(`blockConfigParamPage.dropdowns.${parameterName}.${option.label}`) 
      ? t(`blockConfigParamPage.dropdowns.${parameterName}.${option.label}`) 
      : option.label
  }))
}

// 页面类型映射：本页为堆级可读写（默认显示堆选择器与下发多选）
const { addPageTypeMapping } = usePageTypeDetection()
addPageTypeMapping('/Block/BlockConfigParam', 'block')

// 默认设置为堆级页面（显示选择器）；具体在切换到SOC子视图时临时隐藏
blockStore.setCurrentPageType('block')

// 计算分类范围（按 class 聚合，过滤保留）
function getFieldByteSize(t) {
  if (typeof t === 'string' && t.startsWith('skip')) return Number(t.slice(4))
  // bits字段不占用独立字节空间
  if (t === 'bits' || t === 'bit') return 0
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
    parameterClasses: [{ name: t('blockConfigParamPage.parameterTypes.allParameters'), byteOffset: 0, byteLength: 0 }],
    noClassMode: true,
    writeWholeTable: true, // 整表下发，不分块
    // 统一下拉框配置入口（方案1）：指定数据类型与Topic
    dropdown: { dataType: 'block_remote_control', topicType: 'block_batt_param' },
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount) =>
      serializeParameterData(parameterDataFrame, BLOCK_BATT_PARAM_R, startByteOffset, registerCount, '[useBlockBattParam]', t('blockConfigParamPage.sections.batteryConfig'))
  }
}

// 堆系统基本配置参数（固定 b1）
const blockCommonParamHandler = useBlockCommonParam()
const commonConfig = {
  dataSource: {
    name: 'BLOCK_COMMON_PARAM',
    readTopicTemplate: 'bms/host/s2d/b1/block_common_param_r',
    writeTopicTemplate: 'bms/host/s2d/b1/block_common_param_w',
    dropdown: { dataType: 'block_remote_control', topicType: 'block_common_param' },
    parameterFields: BLOCK_COMMON_PARAM_R,
    parameterClasses: blockCommonParamHandler.getParameterClasses(),
    parameterSerializer: blockCommonParamHandler.serializeBlockCommonParamData,
    defaultAddress: { blockNumber: 1, clusterNumber: 0 }
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
      serializeParameterData(parameterDataFrame, BLOCK_COMM_DEV_CFG_R, startByteOffset, registerCount, '[useBlockCommDevCfg]', t('blockConfigParamPage.sections.commDevConfig'))
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
      serializeParameterData(parameterDataFrame, BLOCK_OPERATE_CFG_R, startByteOffset, registerCount, '[useBlockOperateCfg]', t('blockConfigParamPage.sections.operateConfig'))
  }
}

const socParamClasses = buildParameterClasses(BLOCK_SOC_PARAM_R)
const socConfig = {
  dataSource: {
    name: 'BLOCK_SOC_PARAM',
    readTopicTemplate: 'bms/host/s2d/b{block}/block_soc_param_r',
    writeTopicTemplate: 'bms/host/s2d/b{block}/block_soc_param_w',
    parameterFields: BLOCK_SOC_PARAM_R,
    parameterClasses: socParamClasses,
    writeWholeTable: true,
    dropdown: { dataType: 'block_remote_control', topicType: 'block_soc_param' },
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount) =>
      serializeParameterData(parameterDataFrame, BLOCK_SOC_PARAM_R, startByteOffset, registerCount, '[useBlockSocParam]', t('blockConfigParamPage.sections.socConfig'))
  }
}

const portParamClasses = buildParameterClasses(BLOCK_PORT_CFG_R)
const portConfig = {
  dataSource: {
    name: 'BLOCK_PORT_CFG',
    readTopicTemplate: 'bms/host/s2d/b1/block_port_cfg_r',
    writeTopicTemplate: 'bms/host/s2d/b1/block_port_cfg_w',
    parameterFields: BLOCK_PORT_CFG_R,
    parameterClasses: portParamClasses,
    writeWholeTable: true,
    dropdown: { dataType: 'block_port_config', topicType: 'block_port_cfg' },
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount) =>
      serializeParameterData(parameterDataFrame, BLOCK_PORT_CFG_R, startByteOffset, registerCount, '[useBlockPortCfg]', t('blockConfigParamPage.sections.portConfig')),
    defaultAddress: { blockNumber: 1, clusterNumber: 0 }
  }
}

// ========== BlockConfigParam自动读取topic数组 ==========
const allReadTopics = ['BLOCK_COMMON_PARAM', 'BLOCK_BATT_PARAM', 'BLOCK_COMM_DEV_CFG', 'BLOCK_OPERATE_CFG', 'BLOCK_SOC_PARAM', 'BLOCK_PORT_CFG']

// 复用通用核心（block模式由usePageTypeDetection控制）
const {
  isCurrentlyReading: isReadingCommon,
  currentSelectedClass: currentCommonClass,
  currentClassParameterList: currentCommonParameterList,
  allAvailableClasses: allCommonClasses,
  switchToParameterClass: switchToCommonClass,
  startParameterReading: startCommonReading,
  stopParameterReading: stopCommonReading,
  sendParameterReadRequest: sendCommonReadRequest,
  sendCurrentClassParameters: sendCommonParameters,
  updateParameterValue: updateCommonParameterValue,
  getParameterInputValue: getCommonParameterInputValue,
  setParameterInputValue: setCommonParameterInputValue,
  getParameterDecimalPlaces: getCommonParameterDecimalPlaces,
  handleReceivedParameterData: handleCommonReceivedParameterData,
  handleParameterWriteResponse: handleCommonWriteResponse,
  handleParameterReadError: handleCommonReadError,
  isParameterDropdown: isCommonParameterDropdown,
  getParameterDropdownOptions: getCommonParameterDropdownOptions,
  updateDropdownParameterValue: updateCommonDropdownParameterValue,
  enhancedParameterList: commonEnhancedParameterList
} = useRemoteControlCore(commonConfig, toastService, {
  selectorMode: 'block',
  defaultData: DEFAULT_BLOCK_CONFIG_PARAMS
})

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
} = useRemoteControlCore(batteryConfig, toastService, {
  selectorMode: 'block',
  defaultData: DEFAULT_BLOCK_CONFIG_PARAMS // 性能优化：传递默认数据
})

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
} = useRemoteControlCore(commDevConfig, toastService, {
  selectorMode: 'block',
  defaultData: DEFAULT_BLOCK_CONFIG_PARAMS // 性能优化：传递默认数据
})

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
} = useRemoteControlCore(operateConfig, toastService, {
  selectorMode: 'block',
  defaultData: DEFAULT_BLOCK_CONFIG_PARAMS // 性能优化：传递默认数据
})

const {
  isCurrentlyReading: isReadingSoc,
  currentSelectedClass: currentSocClass,
  currentClassParameterList: currentSocParameterList,
  allAvailableClasses: allSocClasses,
  switchToParameterClass: switchToSocClass,
  startParameterReading: startSocReading,
  stopParameterReading: stopSocReading,
  sendCurrentClassParameters: sendSocParameters,
  updateParameterValue: updateSocParameterValue,
  getParameterInputValue: getSocParameterInputValue,
  setParameterInputValue: setSocParameterInputValue,
  getParameterDecimalPlaces: getSocParameterDecimalPlaces,
  handleReceivedParameterData: handleSocReceivedParameterData,
  handleParameterWriteResponse: handleSocWriteResponse,
  handleParameterReadError: handleSocReadError,
  sendParameterReadRequest: sendSocReadRequest,
  isParameterDropdown: isSocParameterDropdown,
  getParameterDropdownOptions: getSocParameterDropdownOptions,
  updateDropdownParameterValue: updateSocDropdownParameterValue,
  enhancedParameterList: socEnhancedParameterList
} = useRemoteControlCore(socConfig, toastService, {
  selectorMode: 'block',
  defaultData: DEFAULT_BLOCK_CONFIG_PARAMS
})

const {
  isCurrentlyReading: isReadingPort,
  currentSelectedClass: currentPortClass,
  currentClassParameterList: currentPortParameterList,
  allAvailableClasses: allPortClasses,
  switchToParameterClass: switchToPortClass,
  startParameterReading: startPortReading,
  stopParameterReading: stopPortReading,
  sendParameterReadRequest: sendPortReadRequest,
  sendCurrentClassParameters: sendPortParameters,
  updateParameterValue: updatePortParameterValue,
  getParameterInputValue: getPortParameterInputValue,
  setParameterInputValue: setPortParameterInputValue,
  getParameterDecimalPlaces: getPortParameterDecimalPlaces,
  handleReceivedParameterData: handlePortReceivedParameterData,
  handleParameterWriteResponse: handlePortWriteResponse,
  handleParameterReadError: handlePortReadError,
  isParameterDropdown: isPortParameterDropdown,
  getParameterDropdownOptions: getPortParameterDropdownOptions,
  updateDropdownParameterValue: updatePortDropdownParameterValue,
  enhancedParameterList: portEnhancedParameterList
} = useRemoteControlCore(portConfig, toastService, {
  selectorMode: 'block',
  defaultData: DEFAULT_BLOCK_CONFIG_PARAMS
})

// ===== IPv4校验与带校验的下发（端口Tab） =====
// IPv4校验复用通用工具

function getIPv4InputClass(value) {
  if (!value || value === '0.0.0.0') return ''
  return validateIPv4(value) ? '' : 'ipv4-invalid'
}

function sendPortParametersWithValidation() {
  const ipv4Errors = []
  const list = portEnhancedParameterList?.value || []
  list.forEach(param => {
    if (param.type === 'ipv4') {
      const value = getPortParameterInputValue(param, param.currentValue)
      if (value && value !== '0.0.0.0' && !validateIPv4(String(value))) {
        ipv4Errors.push(`${param.label || param.key}: "${value}"`)
      }
    }
  })
  if (ipv4Errors.length > 0) {
    toastService.add({
      severity: 'error',
      summary: t('blockConfigParamPage.messages.ipFormatError'),
      detail: t('blockConfigParamPage.messages.ipFormatErrorDetail', [ipv4Errors.join('\n')]),
      life: 8000
    })
    return
  }
  sendPortParameters()
}

// ===== 原文缓存：复用 composable（跨Tab使用动态前缀） =====
function getCurrentDataSourceName(){
  return activeType.value === 'common' ? 'BLOCK_COMMON_PARAM'
    : activeType.value === 'batt' ? 'BLOCK_BATT_PARAM'
    : activeType.value === 'comm' ? 'BLOCK_COMM_DEV_CFG'
    : activeType.value === 'port' ? 'BLOCK_PORT_CFG'
    : activeType.value === 'operate' ? 'BLOCK_OPERATE_CFG'
    : 'BLOCK_SOC_PARAM'
}
const { setRawInput, getRawInput, getInputDisplay, clearByPrefix } = useRawInputCache(() => getCurrentDataSourceName())

// ===== 数值型校验：复用 composable =====

// ===== 统一“校验→同步写模型→下发”入口（覆盖所有Tab，包括端口的IPv4校验） =====
function sendParametersWithValidation(){
  // 当前Tab的增强列表
  const list = renderParameterList?.value || []
  const errors = []
  const numericUpdates = []

  // 逐项校验
  for (const p of list){
    if (!p || p.__static) continue
    // 下拉与簇位图跳过数值校验
    if (p.__inputType === 'dropdown') continue
    if (p.type === 'u16' && p.clusterRange) continue

    // IPv4 专用校验（端口Tab）
    if (p.type === 'ipv4'){
      const v = getInputValue(p, p.currentValue)
      if (v && v !== '0.0.0.0' && !validateIPv4(String(v))){
        errors.push(`${p.label || p.key}: "${v}"`)
      }
      continue
    }

    // 数值型参数统一校验
    if (isNumericType(p)){
      const raw = getRawInput(p)
      const src = raw !== undefined ? String(raw) : String(getInputValue(p, p.currentValue) ?? '')
      const res = validateNumericInput(p, src, { t, te })
      if (!res.valid){
        errors.push(`${p.label || p.key}: ${res.message}`)
        continue
      }
      // 写入值需走 setInputValue 做缩放
      const writeVal = setInputValue(p, res.value)
      numericUpdates.push({ key: p.key, value: writeVal })
    }
  }

  if (errors.length > 0){
    // IPv4错误使用本页文案；数值错误统一用remoteControl文案
    const summary = te('toast.remoteControl.parameterValidationFailed') ? t('toast.remoteControl.parameterValidationFailed') : t('blockConfigParamPage.messages.validationFailed')
    toastService.add({ severity: 'error', summary, detail: errors.join('\n'), life: 8000 })
    return
  }

  // 同步写模型（避免第一次下发旧值）
  for (const u of numericUpdates){
    updateValue(u.key, u.value, { immediate: true })
  }

  // 下发（按当前Tab）
  if (activeType.value === 'common') sendCommonParameters()
  else if (activeType.value === 'batt') sendBatteryParameters()
  else if (activeType.value === 'comm') sendCommDevParameters()
  else if (activeType.value === 'port') sendPortParameters() // IPv4已在前面校验
  else if (activeType.value === 'operate') sendOperateParameters()
  else sendSocParameters()
}

// 统一的停止函数
function stopAllReading() {
  if (isReadingBattery.value) stopBatteryReading()
  if (isReadingCommDev.value) stopCommDevReading()
  if (isReadingOperate.value) stopOperateReading()
}

// 多Topic一次性自动读取函数
function autoReadMultiTopicOnce(topics) {
  console.log('[BlockConfigParam] 自动读取Topics:', topics)

  // 检查是否有选中的堆
  if (!blockStore.selectedBlockForView) {
    console.log('[BlockConfigParam] 等待堆选择器就绪...')
    return
  }

  // 遍历所有topics，发送读取请求
  topics.forEach(topic => {
    switch(topic) {
      case 'BLOCK_COMMON_PARAM':
        sendCommonReadRequest()
        break
      case 'BLOCK_BATT_PARAM':
        sendBatteryReadRequest()
        break
      case 'BLOCK_COMM_DEV_CFG':
        sendCommDevReadRequest()
        break
      case 'BLOCK_OPERATE_CFG':
        sendOperateReadRequest()
        break
      case 'BLOCK_SOC_PARAM':
        sendSocReadRequest()
        break
      case 'BLOCK_PORT_CFG':
        sendPortReadRequest()
        break
      default:
        console.warn('[BlockConfigParam] 未知的Topic:', topic)
    }
  })
}

// 重试逻辑
const retryLogic = useRetryLogic(toastService, stopAllReading)

// 带重试逻辑的读取函数
function startReadingWithRetry() {
  retryLogic.startRetry()
  startReading()
}

// 下拉相关函数已从各自实例解构，无需重复创建实例

// 方案：顶部Button导航，内容区始终是一张表（两层框架）

// 顶部导航（仅导航，无内容面板）
const topMenuItems = computed(() => [
  { label: t('blockConfigParamPage.sections.commonConfig'), key: 'common' },
  { label: t('blockConfigParamPage.sections.operateConfig'), key: 'operate' },
  { label: t('blockConfigParamPage.sections.portConfig'), key: 'port' },
  { label: t('blockConfigParamPage.sections.commDevConfig'), key: 'comm' },
  { label: t('blockConfigParamPage.sections.socConfig'), key: 'soc' },
  { label: t('blockConfigParamPage.sections.batteryConfig'), key: 'batt' }
])
const activeType = ref('common')

// 切换顶部菜单
function switchToTopMenu(menuKey) {
  activeType.value = menuKey
}

// 当前视图映射（不在切换时重新读取）
const currentIsReading = computed(() =>
  activeType.value === 'common' ? (isReadingCommon?.value ?? isReadingCommon)
  : activeType.value === 'batt' ? (isReadingBattery?.value ?? isReadingBattery)
  : activeType.value === 'comm' ? (isReadingCommDev?.value ?? isReadingCommDev)
  : activeType.value === 'port' ? (isReadingPort?.value ?? isReadingPort)
  : activeType.value === 'operate' ? (isReadingOperate?.value ?? isReadingOperate)
  : (isReadingSoc?.value ?? isReadingSoc)
)

const currentParameterList = computed(() =>
  activeType.value === 'common' ? (currentCommonParameterList?.value ?? [])
  : activeType.value === 'batt' ? (currentBatteryParameterList?.value ?? [])
  : activeType.value === 'comm' ? (currentCommDevParameterList?.value ?? [])
  : activeType.value === 'port' ? (currentPortParameterList?.value ?? [])
  : activeType.value === 'operate' ? (currentOperateParameterList?.value ?? [])
  : (currentSocParameterList?.value ?? [])
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
  if (activeType.value === 'port') {
    return list.filter(row => row && !(row.label || '').includes('预留') && !/^Reserved/i.test(String(row.key || '')) && !(row.class || '').includes('保留') && !(row.type || '').startsWith('skip'))
  }
  if (activeType.value === 'common') {
    return list.filter(row => row && !(row.label || '').includes('预留') && !/^Reserved/i.test(String(row.key || '')) && !(row.class || '').includes('保留') && !(row.type || '').startsWith('skip'))
  }
  if (activeType.value === 'soc') {
    return list.filter(row => row && !(row.label || '').includes('预留') && !/^Reserved/i.test(String(row.key || '')) && !(row.class || '').includes('保留') && !(row.type || '').startsWith('skip'))
  }
  return list
})

// 渲染列表：直接复用核心的增强列表，保证默认选中与显示逻辑一致
const renderParameterList = computed(() => {
  const base = activeType.value === 'batt'
    ? (battEnhancedParameterList?.value || [])
    : activeType.value === 'comm'
      ? (commEnhancedParameterList?.value || [])
    : activeType.value === 'port'
      ? (portEnhancedParameterList?.value || [])
    : activeType.value === 'operate'
      ? (operateEnhancedParameterList?.value || [])
      : activeType.value === 'common'
        ? (commonEnhancedParameterList?.value || [])
      : (socEnhancedParameterList?.value || [])
  
  console.log(`[BlockConfigParam] renderParameterList - activeType: ${activeType.value}, base length: ${base.length}`, base)

  // 应用页面的过滤规则
  const filtered = (() => {
    if (activeType.value === 'batt') {
      return base.filter(row => row && !String(row.key || '').startsWith('_skip') && !(row.type || '').startsWith('skip') && !(row.class || '').includes('保留'))
    }
    if (activeType.value === 'comm') {
      return base.filter(row => row && !(row.label || '').includes('预留') && !/^Reserved/i.test(String(row.key || '')))
    }
    if (activeType.value === 'port') {
      return base.filter(row => row && !(row.label || '').includes('预留') && !/^Reserved/i.test(String(row.key || '')) && !(row.class || '').includes('保留') && !(row.type || '').startsWith('skip'))
    }
    if (activeType.value === 'common') {
      return base.filter(row => row && !(row.label || '').includes('预留') && !/^Reserved/i.test(String(row.key || '')) && !(row.class || '').includes('保留') && !(row.type || '').startsWith('skip'))
    }
    if (activeType.value === 'soc') {
      return base.filter(row => row && !(row.label || '').includes('预留') && !/^Reserved/i.test(String(row.key || '')) && !(row.class || '').includes('保留') && !(row.type || '').startsWith('skip'))
    }
    return base
  })()

  // 统一字段名，适配本页模板，并添加翻译
  const mapped = filtered.map(p => {
    const translatedParam = {
      ...p,
      label: getParameterTranslation(p.label || p.originalLabel),
      originalLabel: p.originalLabel || p.label,
      __inputType: (p.inputType === 'dropdown' || (Array.isArray(p.options) && p.options.length > 0)) ? 'dropdown' : 'input',
      __options: p.options || null
    }
    if (translatedParam.__inputType === 'dropdown' && translatedParam.__options) {
      translatedParam.__options = translateDropdownOptions(translatedParam.__options, p.originalLabel || p.label)
    }
    return translatedParam
  })

  if (activeType.value === 'port') {
    const staticItems = [
      { label: '网卡3 ip地址', key: 'Reserved_NIC3_IP', __static: true, value: '-' },
      { label: '网卡3 默认网关', key: 'Reserved_NIC3_GW', __static: true, value: '-' },
      { label: '网卡 ip地址', key: 'Reserved_NIC_IP', __static: true, value: '-' },
      { label: '网卡 默认网关', key: 'Reserved_NIC_GW', __static: true, value: '-' }
    ]
    const insertIndex = mapped.findIndex(p => p.key === 'MQTT_ServerIP' || p.label === 'MQTT服务器IP' || p.originalLabel === 'MQTT服务器IP')
    if (insertIndex >= 0) {
      mapped.splice(insertIndex, 0, ...staticItems)
    } else {
      mapped.push(...staticItems)
    }
  }

  return mapped
})

function updateDropdownValue(parameterKey, selectedOption){
  if (activeType.value === 'batt') return updateBattDropdownParameterValue(parameterKey, selectedOption)
  if (activeType.value === 'common') return updateCommonDropdownParameterValue(parameterKey, selectedOption)
  if (activeType.value === 'comm') return updateCommDropdownParameterValue(parameterKey, selectedOption)
  if (activeType.value === 'port') return updatePortDropdownParameterValue(parameterKey, selectedOption)
  if (activeType.value === 'operate') return updateOperateDropdownParameterValue(parameterKey, selectedOption)
  return updateSocDropdownParameterValue(parameterKey, selectedOption)
}

const currentAllClasses = computed(() => {
  if (activeType.value === 'common') return (allCommonClasses?.value ?? allCommonClasses ?? [])
  if (activeType.value === 'comm') return (allCommDevClasses?.value ?? allCommDevClasses ?? [])
  if (activeType.value === 'port') return (allPortClasses?.value ?? allPortClasses ?? [])
  if (activeType.value === 'operate') return (allOperateClasses?.value ?? allOperateClasses ?? [])
  if (activeType.value === 'soc') return (allSocClasses?.value ?? allSocClasses ?? [])
  return [] // batt 无分类
})

const currentSelectedClass = computed(() => {
  if (activeType.value === 'common') return (currentCommonClass?.value ?? currentCommonClass ?? null)
  if (activeType.value === 'comm') return (currentCommDevClass?.value ?? currentCommDevClass ?? null)
  if (activeType.value === 'port') return (currentPortClass?.value ?? currentPortClass ?? null)
  if (activeType.value === 'operate') return (currentOperateClass?.value ?? currentOperateClass ?? null)
  if (activeType.value === 'soc') return (currentSocClass?.value ?? currentSocClass ?? null)
  return null
})

function startReading(){
  if (activeType.value === 'common') startCommonReading()
  else if (activeType.value === 'batt') startBatteryReading()
  else if (activeType.value === 'comm') startCommDevReading()
  else if (activeType.value === 'port') startPortReading()
  else if (activeType.value === 'operate') startOperateReading()
  else startSocReading()
}

function stopReading(){
  if (activeType.value === 'common') stopCommonReading()
  else if (activeType.value === 'batt') stopBatteryReading()
  else if (activeType.value === 'comm') stopCommDevReading()
  else if (activeType.value === 'port') stopPortReading()
  else if (activeType.value === 'operate') stopOperateReading()
  else stopSocReading()
}

function sendParameters(){
  // 统一入口：包含数值型与端口IPv4校验
  sendParametersWithValidation()
}

function switchClass(name){
  if (activeType.value === 'common') switchToCommonClass(name)
  if (activeType.value === 'comm') switchToCommDevClass(name)
  else if (activeType.value === 'port') switchToPortClass(name)
  else if (activeType.value === 'operate') switchToOperateClass(name)
  else if (activeType.value === 'soc') switchToSocClass(name)
}

// 输入/小数位/更新统一封装
function getInputValue(row, val){
  return activeType.value === 'common' ? getCommonParameterInputValue(row, val)
    : activeType.value === 'batt' ? getBatteryParameterInputValue(row, val)
    : activeType.value === 'comm' ? getCommDevParameterInputValue(row, val)
    : activeType.value === 'port' ? getPortParameterInputValue(row, val)
    : activeType.value === 'operate' ? getOperateParameterInputValue(row, val)
    : getSocParameterInputValue(row, val)
}

function setInputValue(row, val){
  return activeType.value === 'common' ? setCommonParameterInputValue(row, val)
    : activeType.value === 'batt' ? setBatteryParameterInputValue(row, val)
    : activeType.value === 'comm' ? setCommDevParameterInputValue(row, val)
    : activeType.value === 'port' ? setPortParameterInputValue(row, val)
    : activeType.value === 'operate' ? setOperateParameterInputValue(row, val)
    : setSocParameterInputValue(row, val)
}

function updateValue(key, val, options){
  return activeType.value === 'common' ? updateCommonParameterValue(key, val, options)
    : activeType.value === 'batt' ? updateBatteryParameterValue(key, val, options)
    : activeType.value === 'comm' ? updateCommDevParameterValue(key, val, options)
    : activeType.value === 'port' ? updatePortParameterValue(key, val, options)
    : activeType.value === 'operate' ? updateOperateParameterValue(key, val, options)
    : updateSocParameterValue(key, val, options)
}

function getDecimalPlaces(row){
  return activeType.value === 'common' ? getCommonParameterDecimalPlaces(row)
    : activeType.value === 'batt' ? getBatteryParameterDecimalPlaces(row)
    : activeType.value === 'comm' ? getCommDevParameterDecimalPlaces(row)
    : activeType.value === 'port' ? getPortParameterDecimalPlaces(row)
    : activeType.value === 'operate' ? getOperateParameterDecimalPlaces(row)
    : getSocParameterDecimalPlaces(row)
}


// 事件处理
function handleBatteryReadEvent(event, mqttMessage){
  console.log('[BlockConfigParam] 收到电池配置读取事件:', mqttMessage)
  if (mqttMessage.dataType !== 'BLOCK_BATT_PARAM_R') return

  // 标记收到响应，停止超时检查
  retryLogic.markResponse()
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockBattParam]', t('blockConfigParamPage.sections.batteryConfig'))
  if (!parsed) return
  if (parsed.result?.error) return handleBatteryReadError(parsed)
  console.log('[BlockConfigParam] 处理电池配置数据前，增强列表长度:', battEnhancedParameterList?.value?.length || 0)
  handleBatteryReceivedParameterData(parsed)
  console.log('[BlockConfigParam] 处理电池配置数据后，增强列表长度:', battEnhancedParameterList?.value?.length || 0)
  clearByPrefix('BLOCK_BATT_PARAM')
}

function handleBatteryWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_BATT_PARAM_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockBattParam]', t('blockConfigParamPage.sections.batteryConfig'))
  if (!parsed.className) parsed.className = t('blockConfigParamPage.sections.batteryConfig')
  handleBatteryWriteResponse(parsed)
}

function handleCommDevReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_COMM_DEV_CFG_R') return

  // 标记收到响应，停止超时检查
  retryLogic.markResponse()
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockCommDevCfg]', t('blockConfigParamPage.sections.commDevConfig'))
  if (!parsed) return
  if (parsed.result?.error) return handleCommDevReadError(parsed)
  handleCommDevReceivedParameterData(parsed)
  clearByPrefix('BLOCK_COMM_DEV_CFG')
}

function handleCommDevWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_COMM_DEV_CFG_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockCommDevCfg]', t('blockConfigParamPage.sections.commDevConfig'))
  if (!parsed.className) parsed.className = t('blockConfigParamPage.sections.commDevConfig')
  handleCommDevWriteResponse(parsed)
}

function handleOperateReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_OPERATE_CFG_R') return

  // 标记收到响应，停止超时检查
  retryLogic.markResponse()
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockOperateCfg]', t('blockConfigParamPage.sections.operateConfig'))
  if (!parsed) return
  if (parsed.result?.error) return handleOperateReadError(parsed)
  handleOperateReceivedParameterData(parsed)
  clearByPrefix('BLOCK_OPERATE_CFG')
}

function handleOperateWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_OPERATE_CFG_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockOperateCfg]', t('blockConfigParamPage.sections.operateConfig'))
  if (!parsed.className) parsed.className = t('blockConfigParamPage.sections.operateConfig')
  handleOperateWriteResponse(parsed)
}

function handleSocReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_SOC_PARAM_R') return
  retryLogic.markResponse()
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockSocParam]', t('blockConfigParamPage.sections.socConfig'))
  if (!parsed) return
  if (parsed.result?.error) return handleSocReadError(parsed)
  handleSocReceivedParameterData(parsed)
  clearByPrefix('BLOCK_SOC_PARAM')
}

function handleSocWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_SOC_PARAM_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockSocParam]', t('blockConfigParamPage.sections.socConfig'))
  if (!parsed.className) parsed.className = t('blockConfigParamPage.sections.socConfig')
  handleSocWriteResponse(parsed)
}

function handleCommonReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_COMMON_PARAM_R') return
  retryLogic.markResponse()
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockCommonParam]', t('blockConfigParamPage.sections.commonConfig'))
  if (!parsed) return
  if (parsed.result?.error) return handleCommonReadError(parsed)
  handleCommonReceivedParameterData(parsed)
  clearByPrefix('BLOCK_COMMON_PARAM')
}

function handleCommonWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_COMMON_PARAM_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockCommonParam]', t('blockConfigParamPage.sections.commonConfig'))
  if (!parsed.className) parsed.className = t('blockConfigParamPage.sections.commonConfig')
  handleCommonWriteResponse(parsed)
  const isSuccess = parsed?.result?.success === true || (mqttMessage.data?.code === 0xE0) || (mqttMessage.data?.code === 224)
  if (isSuccess) {
    triggerConfigReload(1500)
  }
}

function handlePortReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_PORT_CFG_R') return
  retryLogic.markResponse()
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockPortCfg]', t('blockConfigParamPage.sections.portConfig'))
  if (!parsed) return
  if (parsed.result?.error) return handlePortReadError(parsed)
  handlePortReceivedParameterData(parsed)
  clearByPrefix('BLOCK_PORT_CFG')
}

function handlePortWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_PORT_CFG_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockPortCfg]', t('blockConfigParamPage.sections.portConfig'))
  if (!parsed.className) parsed.className = t('blockConfigParamPage.sections.portConfig')
  handlePortWriteResponse(parsed)
}

onMounted(() => {
  // 注册全局autoRead函数
  registerAutoReadFunction(autoReadMultiTopicOnce)

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

    ipc.removeAllListeners?.('BLOCK_SOC_PARAM_R')
    ipc.removeAllListeners?.('BLOCK_SOC_PARAM_W')
    ipc.on('BLOCK_SOC_PARAM_R', handleSocReadEvent)
    ipc.on('BLOCK_SOC_PARAM_W', handleSocWriteEvent)

    ipc.removeAllListeners?.('BLOCK_PORT_CFG_R')
    ipc.removeAllListeners?.('BLOCK_PORT_CFG_W')
    ipc.on('BLOCK_PORT_CFG_R', handlePortReadEvent)
    ipc.on('BLOCK_PORT_CFG_W', handlePortWriteEvent)

    if (!bcListenersRegistered) {
      ipc.removeListener?.('BLOCK_COMMON_PARAM_R', handleCommonReadEvent)
      ipc.removeAllListeners?.('BLOCK_COMMON_PARAM_W')
      ipc.on('BLOCK_COMMON_PARAM_R', handleCommonReadEvent)
      ipc.on('BLOCK_COMMON_PARAM_W', handleCommonWriteEvent)
      bcListenersRegistered = true
    }
  }

  // 首次挂载：根据当前Tab决定是否隐藏堆选择器
  if (activeType.value === 'soc' || activeType.value === 'port' || activeType.value === 'common') {
    blockStore.setCurrentPageType('standalone')
    blockStore.setSelectedBlockForView('block1')
    blockStore.setSelectedBlocksForWrite(['block1'])
  } else {
    blockStore.setCurrentPageType('block')
  }

  // 默认选中第一个分类
  // 簇端电池配置参数不分类，直接显示所有参数
  if (allCommDevClasses?.value?.length && !currentCommDevClass?.value){
    switchToCommDevClass(allCommDevClasses.value[0].name)
  }
  if (allOperateClasses?.value?.length && !currentOperateClass?.value){
    switchToOperateClass(allOperateClasses.value[0].name)
  }
  if (allSocClasses?.value?.length && !currentSocClass?.value){
    switchToSocClass(allSocClasses.value[0].name)
  }
  if (allPortClasses?.value?.length && !currentPortClass?.value){
    switchToPortClass(allPortClasses.value[0].name)
  }
  if (allCommonClasses?.value?.length && !currentCommonClass?.value){
    switchToCommonClass(allCommonClasses.value[0].name)
  }

  // 使用全局调度器避免多页面并发读取
  scheduleAutoRead(allReadTopics, 500, 'BlockConfigParam')
})

// keep-alive 激活时的处理
onActivated(() => {
  if (activeType.value === 'soc' || activeType.value === 'port' || activeType.value === 'common') {
    blockStore.setCurrentPageType('standalone')
    blockStore.setSelectedBlockForView('block1')
    blockStore.setSelectedBlocksForWrite(['block1'])
  } else {
    blockStore.setCurrentPageType('block')
  }
  scheduleAutoRead(allReadTopics, 500, 'BlockConfigParam')
})

// 当顶部菜单切换到“系统堆SOC配置参数”时：隐藏堆选择器与下发多选，并锁定到堆1
watch(activeType, (val) => {
  if (val === 'soc') {
    blockStore.setCurrentPageType('standalone')
    blockStore.setSelectedBlockForView('block1')
    blockStore.setSelectedBlocksForWrite(['block1'])
  } else if (val === 'port') {
    blockStore.setCurrentPageType('standalone')
    blockStore.setSelectedBlockForView('block1')
    blockStore.setSelectedBlocksForWrite(['block1'])
  } else if (val === 'common') {
    blockStore.setCurrentPageType('standalone')
    blockStore.setSelectedBlockForView('block1')
    blockStore.setSelectedBlocksForWrite(['block1'])
  } else {
    blockStore.setCurrentPageType('block')
  }
})

// keep-alive 失活时的处理
onDeactivated(() => {
  cancelAutoRead('BlockConfigParam')
  stopBatteryReading()
  stopCommDevReading()
  stopOperateReading()
  stopCommonReading()
})

onUnmounted(() => {
  // 取消统一调度器的待处理请求
  cancelAutoRead('BlockConfigParam')

  // 停止读取操作
  stopBatteryReading()
  stopCommDevReading()
  stopOperateReading()

  // 清理事件监听器
  const ipc = window.electron?.ipcRenderer
  if (ipc){
    // 簇端电池配置参数
    ipc.removeAllListeners('BLOCK_BATT_PARAM_R', handleBatteryReadEvent)
    ipc.removeAllListeners('BLOCK_BATT_PARAM_W', handleBatteryWriteEvent)

    // 通讯设备配置参数
    ipc.removeAllListeners('BLOCK_COMM_DEV_CFG_R', handleCommDevReadEvent)
    ipc.removeAllListeners('BLOCK_COMM_DEV_CFG_W', handleCommDevWriteEvent)

    // 操作配置参数
    ipc.removeAllListeners('BLOCK_OPERATE_CFG_R', handleOperateReadEvent)
    ipc.removeAllListeners('BLOCK_OPERATE_CFG_W', handleOperateWriteEvent)
    ipc.removeAllListeners('BLOCK_PORT_CFG_R', handlePortReadEvent)
    ipc.removeAllListeners('BLOCK_PORT_CFG_W', handlePortWriteEvent)
    ipc.removeListener?.('BLOCK_COMMON_PARAM_R', handleCommonReadEvent)
    ipc.removeListener?.('BLOCK_COMMON_PARAM_W', handleCommonWriteEvent)
    ipc.removeAllListeners?.('BLOCK_COMMON_PARAM_W')
    bcListenersRegistered = false
  }

  // 清理重试逻辑资源
  retryLogic.cleanup()
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
    <!-- Toast组件已移至AppLayout.vue，避免重复声明 -->

    <!-- 顶部导航（Button组件，仅作导航，不渲染内容面板） -->
    <div class="control-area mb-1" style="justify-content: flex-start; align-items:center; gap:8px;">
      <div class="class-tabs">
        <Button
          v-for="menuItem in topMenuItems"
          :key="menuItem.key"
          :label="menuItem.label"
          @click="switchToTopMenu(menuItem.key)"
          :severity="activeType === menuItem.key ? 'primary' : 'secondary'"
          :outlined="activeType !== menuItem.key"
          size="small"
          class="class-tab-button"
        />
      </div>
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
            <Button :label="currentIsReading ? t('blockConfigParamPage.buttons.stopReading') : t('blockConfigParamPage.buttons.startReading')" :severity="currentIsReading ? 'danger' : 'primary'" size="small" @click="currentIsReading ? stopReading() : startReadingWithRetry()" />
            <Button :label="t('blockConfigParamPage.buttons.sendParameters')" severity="warning" size="small" :disabled="currentIsReading" @click="sendParameters" />
          </div>
        </div>
      </template>
      <Column :header="t('blockConfigParamPage.table.parameterName')" style="width: 260px" :frozen="true">
        <template #body="{ data }">
          <div v-if="data" class="font-medium">{{ data.label }}</div>
        </template>
      </Column>
      <Column :header="t('blockConfigParamPage.table.parameterValue')" style="width: 220px">
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

          <InputText
            v-else-if="data && data.__static"
            :model-value="String(data.value ?? '-')"
            :disabled="currentIsReading"
            readonly
            size="small"
            class="w-full"
          />

          <!-- IPv4型参数 -->
          <InputText
            v-else-if="data && data.type === 'ipv4'"
            :model-value="getInputValue(data, data.currentValue)"
            @update:model-value="val => updateValue(data.key, setInputValue(data, val))"
            :disabled="currentIsReading"
            size="small"
            :class="['w-full', getIPv4InputClass(getInputValue(data, data.currentValue))]"
            :placeholder="t('blockConfigParamPage.placeholders.ipAddress')"
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
                :label="t('blockConfigParamPage.buttons.selectAll')" 
                size="small" 
                class="cluster-action-btn"
                :disabled="currentIsReading"
                @click="selectAllClusters(data)"
              />
            </div>
          </div>

          <!-- 数值型参数（文本控件以保留原文，校验在下发按钮） -->
          <InputText
            v-else-if="data"
            :model-value="getInputDisplay(data, data.currentValue, getInputValue)"
            @update:model-value="val => setRawInput(data, val)"
            :disabled="currentIsReading"
            size="small"
            class="w-full"
          />
        </template>
      </Column>
      <Column :header="t('blockConfigParamPage.table.unit')" style="width: 90px">
        <template #body="{ data }">
          <span v-if="data">{{ data.unit || '-' }}</span>
        </template>
      </Column>
      <Column :header="t('blockConfigParamPage.table.remarks')" style="width: 320px">
        <template #body="{ data }">
          <span v-if="data" class="text-sm whitespace-pre-line">{{ getRemarksTranslation(activeType==='batt' ? getBatteryRemarks(data) : (data.remarks || getParameterRemarkText())) }}</span>
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

/* IPv4 无效样式提示 */
.ipv4-invalid :deep(.p-inputtext) {
  border-color: var(--red-500);
}
</style>
