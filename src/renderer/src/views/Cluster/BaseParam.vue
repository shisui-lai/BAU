<script setup>
// 系统基本配置参数页面 - 支持参数分类切换和分组下发
import { useToast } from 'primevue/usetoast'
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { translateDropdownOptions } from '@/configs/ui/dropdownConfigs'
import { scheduleAutoRead, cancelAutoRead, registerAutoReadFunction } from '@/composables/utils/useAutoReadScheduler'
import { useRetryLogic } from '@/composables/utils/useRetryLogic'
import { SYS_BASE_PARAM_R, FACTORY_CALIB_PARAM_R } from '../../../../main/table.js'
import { useRemoteControlCore, serializeParameterData, createDefaultParameterData } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { useSysBaseParam } from '@/composables/core/data-processing/parameter-management/useSysBaseParam'
import { useFactoryCalibParam } from '@/composables/core/data-processing/parameter-management/useFactoryCalibParam'
import { BASE_PARAM_REMARKS, FACTORY_CALIB_PARAM_REMARKS } from '@/configs/ui/Remarks'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useSystemConfigStore } from '@/stores/system/systemConfigStore'
import { DEFAULT_BASE_PARAMS } from '@/configs/parameterDefaults'

import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useRawInputCache, isNumericType, validateNumericInput, validateIPv4 } from '@/composables/utils/useParameterInput'

const { t, locale, te } = useI18n()

// 直接使用label翻译函数
const getLabelTranslation = (label) => {
  if (locale.value === 'zh') return label
  return te(`config.clusterConfigParam.label.${label}`) 
    ? t(`config.clusterConfigParam.label.${label}`) 
    : label
}

// 备注翻译函数
const getRemarksTranslation = (remarks) => {
  if (locale.value === 'zh') return remarks
  return te(`config.clusterConfigParam.remarks.${remarks}`) 
    ? t(`config.clusterConfigParam.remarks.${remarks}`) 
    : remarks
}

// 出厂校正参数备注翻译函数
const getFactoryRemarksTranslation = (remarks) => {
  if (locale.value === 'zh') return remarks
  return te(`config.factoryCalibParam.remarks.${remarks}`) 
    ? t(`config.factoryCalibParam.remarks.${remarks}`) 
    : remarks
}

const toastService = useToast()

// 获取系统基本参数的专用处理功能
const systemBaseParamHandler = useSysBaseParam()

//使用标准的出厂校正参数处理功能
const factoryCalibParamHandler = useFactoryCalibParam()

// 【单实例模式】系统配置管理
const systemConfigStore = useSystemConfigStore()
const { requestSystemConfig } = systemConfigStore

// 简化状态管理：是否为出厂校正参数模式
const isFactoryCalibMode = ref(false)

//  系统基本参数配置 - 定义数据源和参数分类
const systemBaseParamConfig = {
  dataSource: {
    name: 'SYS_BASE_PARAM',                                             // 数据源名称标识
    readTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/sys_base_param_r',  // 读取MQTT主题模板
    writeTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/sys_base_param_w', // 写入MQTT主题模板
    parameterFields: SYS_BASE_PARAM_R,                                  // 参数字段定义表（159个字段）
    parameterSerializer: systemBaseParamHandler.serializeSystemBaseParamData, // 专用序列化函数
    // 下拉框配置
    dropdown: {
      dataType: 'cluster_remote_control',
      topicType: 'sys_base_param'
    },
    parameterClasses: [                                                 // 参数分类配置
      {
        name: 'BMU配置',
        nameKey: 'clusterConfigParam.parameterClasses.bmuAfeCountConfig',
        byteOffset: 0,
        byteLength: 132,
      },
      {
        name: '类型选择',
        nameKey: 'clusterConfigParam.parameterClasses.typeSystemDeviceConfig',
        byteOffset: 164,
        byteLength: 20,
        hiddenFields: ['SpecialFuncEnable']
      },
      {
        name: '基础设置',
        nameKey: 'clusterConfigParam.parameterClasses.basicFilterConfig',
        byteOffset: 186,
        byteLength: 8
      },
      {
        name: '延时配置',
        nameKey: 'clusterConfigParam.parameterClasses.delayConfig',
        byteOffset: 194,
        byteLength: 8
      },
      {
        name: '温控策略',
        nameKey: 'clusterConfigParam.parameterClasses.tempDeviceConfig',
        byteOffset: 210,
        byteLength: 46
      },
      {
        name: '电流传感器',
        nameKey: 'clusterConfigParam.parameterClasses.currentSensorConfig',
        byteOffset: 256,
        byteLength: 8
      },
      {
        name: '电池参数配置',
        nameKey: 'clusterConfigParam.parameterClasses.batteryParamConfig',
        byteOffset: 268,
        byteLength: 22
      },
      {
        name: '均衡参数',
        nameKey: 'clusterConfigParam.parameterClasses.balanceParams',
        byteOffset: 296,    // 起始字节偏移：跳过8字节预留 = 寄存器148开始
        byteLength: 22      // 字节长度：11个均衡参数，包含s16和u16 = 22字节
      }
    ]
  }
}

// 出厂校正参数独立配置
const factoryCalibParamConfig = {
  dataSource: {
    name: 'FACTORY_CALIB_PARAM',
    readTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/factory_calib_param_r',
    writeTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/factory_calib_param_w',
    parameterFields: FACTORY_CALIB_PARAM_R,
    // 使用标准的序列化函数
    parameterSerializer: factoryCalibParamHandler.serializeFactoryCalibParamData,
    parameterClasses: [
      {
        name: '设备出厂信息',
        nameKey: 'clusterConfigParam.parameterClasses.deviceFactoryInfo',
        byteOffset: 38,       // 设备出厂信息从第38字节开始
        byteLength: 56        // 28个字段 * 2字节 = 56字节
      }
    ]
  }
}

// ========== BaseParam自动读取topic数组 ==========
const allReadTopics = ['SYS_BASE_PARAM', 'FACTORY_CALIB_PARAM'];

// 使用通用遥调核心功能 - 系统基本参数
const {
  isCurrentlyReading: systemIsCurrentlyReading,
  selectedCluster,
  clusterOptions,
  currentSelectedClass: systemCurrentSelectedClass,
  currentClassParameterList: systemCurrentClassParameterList,
  allAvailableClasses: systemAllAvailableClasses,
  switchToParameterClass: systemSwitchToParameterClass,
  stopParameterReading: systemStopParameterReading,
  startMultiTopicReading: systemStartMultiTopicReading, // 新增多topic读取
  autoReadMultiTopicOnce, // 新增一次性自动读取
  sendCurrentClassParameters: systemSendCurrentClassParameters,
  updateParameterValue: systemUpdateParameterValue,
  getParameterInputValue: systemGetParameterInputValue,
  setParameterInputValue: systemSetParameterInputValue,
  getParameterDecimalPlaces: systemGetParameterDecimalPlaces,
  handleReceivedParameterData,
  handleParameterWriteResponse,
  handleParameterReadError,
  // 下拉框功能
  isParameterDropdown: systemIsParameterDropdown,
  getParameterDropdownOptions: systemGetParameterDropdownOptions,
  updateDropdownParameterValue: systemUpdateDropdownParameterValue,
  enhancedParameterList: systemEnhancedParameterList
} = useRemoteControlCore(systemBaseParamConfig, toastService, {
  defaultData: DEFAULT_BASE_PARAMS // 性能优化后重新启用
})

// 使用通用遥调核心功能 - 出厂校正参数（独立实例）
const {
  isCurrentlyReading: isFactoryCalibReading,
  selectedCluster: factoryCalibSelectedCluster,
  clusterOptions: factoryCalibClusterOptions,
  currentSelectedClass: factoryCalibCurrentSelectedClass,
  currentClassParameterList: factoryCalibCurrentClassParameterList,
  allAvailableClasses: factoryCalibAllAvailableClasses,
  switchToParameterClass: factoryCalibSwitchToParameterClass,
  stopParameterReading: factoryCalibStopParameterReading,
  startMultiTopicReading: factoryCalibStartMultiTopicReading, // 新增多topic读取
  autoReadMultiTopicOnce: factoryCalibAutoReadMultiTopicOnce,
  sendCurrentClassParameters: factoryCalibSendCurrentClassParameters,
  updateParameterValue: factoryCalibUpdateParameterValue,
  getParameterInputValue: factoryCalibGetParameterInputValue,
  setParameterInputValue: factoryCalibSetParameterValue,
  getParameterDecimalPlaces: factoryCalibGetParameterDecimalPlaces,
  handleReceivedParameterData: factoryCalibHandleReceivedParameterData,
  handleParameterWriteResponse: factoryCalibHandleParameterWriteResponse,
  // 下拉框功能
  isParameterDropdown: factoryCalibIsParameterDropdown,
  getParameterDropdownOptions: factoryCalibGetParameterDropdownOptions,
  updateDropdownParameterValue: factoryCalibUpdateDropdownParameterValue,
  enhancedParameterList: factoryCalibEnhancedParameterList
} = useRemoteControlCore(factoryCalibParamConfig, toastService, {
  defaultData: DEFAULT_BASE_PARAMS // 性能优化后重新启用
})

// 关键修复：在BaseParam.vue内部实现设备选择状态同步
// 监听系统基本参数的设备选择状态变化，同步到出厂校正参数
watch([selectedCluster, clusterOptions], ([newSelectedCluster]) => {
  // 同步设备选择状态到出厂校正参数实例
  if (newSelectedCluster !== factoryCalibSelectedCluster.value) {
    factoryCalibSelectedCluster.value = newSelectedCluster
  }
}, { immediate: true })

// 切簇自动读取：轻量一次性读取，避免并发轮询下的重复请求
let clusterSwitchDebounceTimer = null
watch(selectedCluster, (newVal, oldVal) => {
  if (!newVal || newVal === oldVal) return
  // 正在轮询时不触发一次性读取，避免并发
  if ((systemIsCurrentlyReading?.value) || (isFactoryCalibReading?.value)) return
  clearTimeout(clusterSwitchDebounceTimer)
  clusterSwitchDebounceTimer = setTimeout(() => {
    if (isFactoryCalibMode.value) {
      // 出厂校正模式：只读该topic
      factoryCalibAutoReadMultiTopicOnce(['FACTORY_CALIB_PARAM'])
    } else {
      // 系统参数模式：触发两类一次性读取
      autoReadMultiTopicOnce(allReadTopics)
    }
  }, 300)
})

// 统一重试逻辑
const retryLogic = useRetryLogic(toastService, () => {
  if (isFactoryCalibMode.value) {
    factoryCalibStopParameterReading()
  } else {
    systemStopParameterReading()
  }
})

// 原文缓存：根据模式与分类区分前缀
const cachePrefix = () => `${isFactoryCalibMode.value ? 'FACTORY_CALIB_PARAM' : 'SYS_BASE_PARAM'}:${currentSelectedClass.value?.name || ''}`
const { setRawInput, getRawInput, getInputDisplay, clearByPrefix } = useRawInputCache(cachePrefix)

// 使用通用composable提供的 validateIPv4

// 获取IPv4输入框的CSS类
function getIPv4InputClass(value) {
  if (!value || value === '0.0.0.0') return ''
  return validateIPv4(value) ? '' : 'ipv4-invalid'
}

// 切换到出厂校正参数模式
function switchToFactoryCalibMode() {
  isFactoryCalibMode.value = true

  // 直接切换到设备出厂信息分类
  setTimeout(() => {
    factoryCalibSwitchToParameterClass('设备出厂信息')
    factoryCalibAutoReadMultiTopicOnce(['FACTORY_CALIB_PARAM'])
  }, 200)
}

// 切换回系统参数模式
function switchToSystemMode() {
  isFactoryCalibMode.value = false
}

//协议修改新增 - 扩展的参数分类列表（包含出厂校正参数）
const allAvailableClasses = computed(() => {
  const systemClasses = systemAllAvailableClasses.value
  const factoryClass = { 
    name: '设备出厂信息',
    nameKey: 'clusterConfigParam.parameterClasses.deviceFactoryInfo'
  }
  return [...systemClasses, factoryClass]
})

//协议修改新增 - 统一的参数切换函数
const switchToParameterClass = (className) => {
  if (className === '设备出厂信息') {
    switchToFactoryCalibMode()
  } else {
    switchToSystemMode()
    // 使用原始的系统切换函数
    systemSwitchToParameterClass(className)
  }
}



// 带重试逻辑的多topic读取函数
function startMultiTopicReadingWithRetry() {
  retryLogic.startRetry()
  if (isFactoryCalibMode.value) {
    factoryCalibStartMultiTopicReading(allReadTopics)
  } else {
    systemStartMultiTopicReading(allReadTopics)
  }
}

// 统一的当前选择类
const currentSelectedClass = computed(() => {
  if (isFactoryCalibMode.value) {
    return factoryCalibCurrentSelectedClass.value
  }
  return systemCurrentSelectedClass.value
})


// 统一的增强参数列表（包含下拉框信息）
const enhancedParameterList = computed(() => {
  let baseList
  
  if (isFactoryCalibMode.value) {
    baseList = factoryCalibEnhancedParameterList.value
    // 查找本机ID字段并打印其值
    const localIdField = baseList.find(item => item.key === 'localId')
    // 过滤掉4个原始生产编码字段
    const filteredList = baseList.filter(item =>
      !['productionCode1', 'productionCode2', 'productionCode3', 'productionCode4'].includes(item.key)
    )

    // 查找4个生产编码字段的数据（从原始列表中查找）
    const p1Field = baseList.find(item => item.key === 'productionCode1')
    const p2Field = baseList.find(item => item.key === 'productionCode2')
    const p3Field = baseList.find(item => item.key === 'productionCode3')
    const p4Field = baseList.find(item => item.key === 'productionCode4')

    if (p1Field) {
      // 合并生产代码
      const p1 = Number(p1Field.currentValue) || 0
      const p2 = Number(p2Field?.currentValue) || 0
      const p3 = Number(p3Field?.currentValue) || 0
      const p4 = Number(p4Field?.currentValue) || 0

      // 合并4个生产编码寄存器为显示格式（不带分隔符）
      const productionCode = `${String(p1).padStart(4, '0')}${String(p2).padStart(2, '0')}${String(p3).padStart(2, '0')}${String(p4).padStart(4, '0')}`

      // 在第一个位置插入合并的生产编码字段
      filteredList.unshift({
        key: 'productionCode',
        label: t('clusterConfigParam.productionCode.label'),  
        unit: '',
        scale: 1,
        type: 'string',  
        class: '设备出厂信息',
        currentValue: productionCode,
        originalValue: productionCode,
        inputType: 'input',
        isDropdown: false,
        options: null,
        displayValue: productionCode,
        remarks: t('clusterConfigParam.productionCode.format')  
      })
    }

    baseList = filteredList
  } else {
    baseList = systemEnhancedParameterList.value
  }
  
  // 应用参数翻译和下拉框选项翻译
  return baseList.map(param => {
    // 保存原始标签用于下拉框检测
    const originalLabel = param.originalLabel || param.label
    
    // 检查是否为下拉框参数（使用原始标签）
    const isDropdown = isParameterDropdown({ originalLabel, label: originalLabel })
    
    const translatedParam = {
      ...param,
      label: getLabelTranslation(param.label || param.originalLabel),
      originalLabel: originalLabel // 确保originalLabel存在
    }
    
    // 如果是下拉框参数，需要翻译选项
    if (isDropdown) {
      const options = getParameterDropdownOptions({ originalLabel, label: originalLabel })
      if (options && Array.isArray(options)) {
        translatedParam.inputType = 'dropdown'
        
        translatedParam.options = translateDropdownOptions(options, originalLabel, t, te, locale.value)
        
        // 更新selectedOption的label为翻译后的标签
        if (translatedParam.selectedOption) {
          const translatedSelectedOption = translatedParam.options.find(opt => opt.value === translatedParam.selectedOption.value)
          if (translatedSelectedOption) {
            translatedParam.selectedOption = {
              ...translatedParam.selectedOption,
              label: translatedSelectedOption.label
            }
          }
        }
        
      }
    }
    
    return translatedParam
  })
})

// 统一的读取状态
const isCurrentlyReading = computed(() => {
  if (isFactoryCalibMode.value) {
    return isFactoryCalibReading.value
  }
  return systemIsCurrentlyReading.value
})

// 统一校验并下发（IPv4 + 数值）
const sendParametersWithValidation = () => {
  // 与堆报警阈值页面一致：使用已翻译的增强参数列表，确保英文模式下错误明细显示英文标签
  const list = enhancedParameterList.value || []
  const errors = []
  const numericUpdates = []

  for (const p of list) {
    if (!p) continue
    // 下拉框、字符串、hex16不走数值校验
    if (p.inputType === 'dropdown' || p.type === 'string' || p.type === 'hex16') continue
    // IPv4校验：使用原文缓存或现值
    if (p.type === 'ipv4') {
      const v = getRawInput(p) ?? getParameterInputValue(p, p.currentValue)
      if (v && v !== '0.0.0.0' && !validateIPv4(String(v))) {
        errors.push(`${p.label || p.key}: "${v}"`)
      } else {
        // 校验通过后同步写模型，再下发
        const writeVal = setParameterInputValue(p, v)
        updateParameterValue(p.key, writeVal, { immediate: true })
      }
      continue
    }
    // 簇使能位（u16 + clusterRange）不按数值校验
    if (p.type === 'u16' && p.clusterRange) continue

    if (isNumericType(p)) {
      const raw = getRawInput(p)
      const src = raw !== undefined ? String(raw) : String(getParameterInputValue(p, p.currentValue) ?? '')
      const res = validateNumericInput(p, src, { t, te })
      if (!res.valid) {
        errors.push(`${p.label || p.key}: ${res.message}`)
        continue
      }
      const writeVal = setParameterInputValue(p, res.value)
      numericUpdates.push({ key: p.key, value: writeVal })
    }
  }

  if (errors.length > 0) {
    const summary = t('clusterConfigParam.messages.validationFailed')
    toastService.add({ severity: 'error', summary, detail: errors.join('\n'), life: 8000 })
    return
  }

  // 先同步写入模型，避免两次点击
  for (const u of numericUpdates) {
    updateParameterValue(u.key, u.value, { immediate: true })
  }

  // 调用原始下发
  if (isFactoryCalibMode.value) {
    factoryCalibSendCurrentClassParameters()
  } else {
    systemSendCurrentClassParameters()
  }
}

// 统一的停止读取函数
const stopParameterReading = () => {
  if (isFactoryCalibMode.value) {
    factoryCalibStopParameterReading()
  } else {
    systemStopParameterReading()
  }
  cancelAutoRead('BaseParam')
  if (clusterSwitchDebounceTimer) {
    clearTimeout(clusterSwitchDebounceTimer)
    clusterSwitchDebounceTimer = null
  }
}

//协议修改新增 - 统一的下拉框判断函数
const isParameterDropdown = (parameter) => {
  // 优先使用原始标签进行下拉框检测，确保与配置键一致
  const labelToCheck = parameter?.originalLabel || parameter?.label || parameter
  
  const result = isFactoryCalibMode.value
    ? factoryCalibIsParameterDropdown(labelToCheck)
    : systemIsParameterDropdown(labelToCheck)

  return result
}

//协议修改新增 - 统一的参数值更新函数
const updateParameterValue = (parameterKey, value, options) => {
  if (isFactoryCalibMode.value) {
    // 特殊处理：生产编码的拆分逻辑
    if (parameterKey === 'productionCode') {
      // 将合并的生产编码拆分为4个寄存器值（支持带分隔符或不带分隔符）
      const codeStr = String(value).replace(/[-]/g, '') // 移除分隔符

      if (codeStr.length === 12 && /^\d{12}$/.test(codeStr)) {
        const p1 = parseInt(codeStr.substring(0, 4)) || 0  // 年份
        const p2 = parseInt(codeStr.substring(4, 6)) || 0  // 月份
        const p3 = parseInt(codeStr.substring(6, 8)) || 0  // 日期
        const p4 = parseInt(codeStr.substring(8, 12)) || 0 // 编号

        // 分别更新4个寄存器
        factoryCalibUpdateParameterValue('productionCode1', p1)
        factoryCalibUpdateParameterValue('productionCode2', p2)
        factoryCalibUpdateParameterValue('productionCode3', p3)
        factoryCalibUpdateParameterValue('productionCode4', p4)
      } else if (codeStr === '' || codeStr === '0') {
        // 允许清空或设置为0
        factoryCalibUpdateParameterValue('productionCode1', 0)
        factoryCalibUpdateParameterValue('productionCode2', 0)
        factoryCalibUpdateParameterValue('productionCode3', 0)
        factoryCalibUpdateParameterValue('productionCode4', 0)
      }
      return
    }
    // 其他出厂校正参数的常规处理
    factoryCalibUpdateParameterValue(parameterKey, value, options)
  } else {
    systemUpdateParameterValue(parameterKey, value, options)
  }
}

//协议修改新增 - 统一的参数输入值获取函数
const getParameterInputValue = (param, currentValue) => {
  if (isFactoryCalibMode.value) {
    return factoryCalibGetParameterInputValue(param, currentValue)
  } else {
    return systemGetParameterInputValue(param, currentValue)
  }
}

//协议修改新增 - 统一的参数输入值设置函数
const setParameterInputValue = (param, inputValue) => {
  if (isFactoryCalibMode.value) {
    return factoryCalibSetParameterValue(param, inputValue)
  } else {
    return systemSetParameterInputValue(param, inputValue)
  }
}

//协议修改新增 - 统一的参数小数位数获取函数
const getParameterDecimalPlaces = (param) => {
  if (isFactoryCalibMode.value) {
    return factoryCalibGetParameterDecimalPlaces(param)
  } else {
    return systemGetParameterDecimalPlaces(param)
  }
}

//协议修改新增 - 统一的下拉框选项获取函数
const getParameterDropdownOptions = (parameter) => {
  // 优先使用原始标签获取选项，确保与配置键一致
  const labelToCheck = parameter?.originalLabel || parameter?.label || parameter
  
  const options = isFactoryCalibMode.value
    ? factoryCalibGetParameterDropdownOptions(labelToCheck)
    : systemGetParameterDropdownOptions(labelToCheck)

  // 直接返回原始选项，避免重复翻译
  return options
}

//协议修改新增 - 统一的下拉框参数更新函数
const updateDropdownParameterValue = (param, value) => {
  if (isFactoryCalibMode.value) {
    factoryCalibUpdateDropdownParameterValue(param.key, param.options.find(opt => opt.value === value))
  } else {
    systemUpdateDropdownParameterValue(param.key, param.options.find(opt => opt.value === value))
  }
}

//协议修改新增 - 统一的参数备注函数
const getParameterRemarkText = (parameterKey) => {
  let remarks = ''
  if (isFactoryCalibMode.value) {
    remarks = FACTORY_CALIB_PARAM_REMARKS[parameterKey] || ''
    // 出厂校正参数使用专门的翻译器
    return getFactoryRemarksTranslation(remarks)
  } else {
    remarks = BASE_PARAM_REMARKS[parameterKey] || ''
    // 系统基本参数使用默认翻译器
    return getRemarksTranslation(remarks)
  }
}



// ================== MQTT事件处理 ==================

// 统一的MQTT事件处理
function handleSystemReadEvent(event, mqttMessage) {
  retryLogic.markResponse()
  const parsedReadData = systemBaseParamHandler.parseSystemBaseParamReadResponse(mqttMessage)
  if (!parsedReadData) return
  if (parsedReadData.result?.error) {
    handleParameterReadError(parsedReadData)
    return
  }
  if (parsedReadData.data) {
    handleReceivedParameterData(parsedReadData)
    // 读取成功后清理当前分类的原文缓存以显示设备值
    clearByPrefix(cachePrefix())
  }
}

function handleSystemWriteEvent(event, mqttMessage) {
  const parsedWriteData = systemBaseParamHandler.parseSystemBaseParamWriteResponse(mqttMessage)
  if (parsedWriteData && systemCurrentSelectedClass.value) {
    parsedWriteData.className = systemCurrentSelectedClass.value.name
  }
  handleParameterWriteResponse(parsedWriteData)
}

function handleFactoryReadEvent(event, mqttMessage) {
  retryLogic.markResponse()

  const parsedReadData = factoryCalibParamHandler.parseFactoryCalibParamReadResponse(mqttMessage)
  if (!parsedReadData) return
  if (parsedReadData.result?.error) {
    handleParameterReadError({
      ...mqttMessage,
      ...parsedReadData
    })
    return
  }
  if (parsedReadData.data) {
    factoryCalibHandleReceivedParameterData({
      ...mqttMessage,
      ...parsedReadData
    })
    clearByPrefix(cachePrefix())
  }
}

function handleFactoryWriteEvent(event, mqttMessage) {
  // 使用通用解析函数处理写入响应，保证数据结构与系统参数一致
  const { blockId, clusterId, data } = mqttMessage
  const deviceFrameKey = `${blockId}-${clusterId}`
  
  const parsedWriteData = {
    frameKey: deviceFrameKey,
    blockId,
    clusterId,
    dataSource: 'FACTORY_CALIB_PARAM',
    result: {
      success: true,
      error: false
    }
  }
  
  // 检查写入是否成功
  if (data && data.code !== undefined) {
    const code = Number(data.code)
    const isWriteSuccessful = code === 0xE0
    parsedWriteData.result = {
      success: isWriteSuccessful,
      error: !isWriteSuccessful,
      code: data.code,
      message: data.message
    }
  }
  
  if (parsedWriteData && factoryCalibCurrentSelectedClass.value) {
    parsedWriteData.className = factoryCalibCurrentSelectedClass.value.name
  }
  factoryCalibHandleParameterWriteResponse(parsedWriteData)
}

onMounted(() => {
  // 注册autoRead函数到全局调度器
  registerAutoReadFunction((topics) => {
    if (isFactoryCalibMode.value) {
      factoryCalibAutoReadMultiTopicOnce(topics)
    } else {
      autoReadMultiTopicOnce(topics)
    }
  })

  // 先清理可能存在的旧监听器（防止快速切换导致的残留）
  window.electron.ipcRenderer.removeAllListeners('SYS_BASE_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('SYS_BASE_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('FACTORY_CALIB_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('FACTORY_CALIB_PARAM_W')

  // 注册事件监听器
  window.electron.ipcRenderer.on('SYS_BASE_PARAM_R', handleSystemReadEvent)
  window.electron.ipcRenderer.on('SYS_BASE_PARAM_W', handleSystemWriteEvent)
  window.electron.ipcRenderer.on('FACTORY_CALIB_PARAM_R', handleFactoryReadEvent)
  window.electron.ipcRenderer.on('FACTORY_CALIB_PARAM_W', handleFactoryWriteEvent)

  // 使用全局调度器避免多页面并发读取
  scheduleAutoRead(allReadTopics, 500, 'BaseParam')
})

// keep-alive 激活时的处理
onActivated(() => {
  scheduleAutoRead(allReadTopics, 500, 'BaseParam')
})

// keep-alive 失活时的处理
onDeactivated(() => {
  cancelAutoRead('BaseParam')
  systemStopParameterReading()
  factoryCalibStopParameterReading()
})

onUnmounted(() => {
  // 取消统一调度器的待处理请求
  cancelAutoRead('BaseParam')

  // 停止读取操作
  systemStopParameterReading()
  factoryCalibStopParameterReading()

  // 清理事件监听器
  window.electron.ipcRenderer.removeAllListeners('SYS_BASE_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('SYS_BASE_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('FACTORY_CALIB_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('FACTORY_CALIB_PARAM_W')

  // 清理切簇防抖定时器
  if (clusterSwitchDebounceTimer) {
    clearTimeout(clusterSwitchDebounceTimer)
    clusterSwitchDebounceTimer = null
  }

  // 清理重试逻辑资源
  retryLogic.cleanup()
})







</script>

<template>
  <div class="card">
    <!-- 固定表头区域 -->
    <div class="fixed-header">
      <!-- 操作按钮组 -->
      <div class="control-area mb-3">
        <div class="control-left">
          <div class="button-group">
            <Button
              :label="isCurrentlyReading ? t('clusterConfigParam.buttons.stopReading') : t('clusterConfigParam.buttons.startReading')"
              @click="() => {
                if (isCurrentlyReading) {
                  stopParameterReading()
                } else {
                  startMultiTopicReadingWithRetry()
                }
              }"
              :severity="isCurrentlyReading ? 'danger' : 'primary'"
              size="small"
            />
            <Button
              :label="t('clusterConfigParam.buttons.sendParameters')"
              @click="sendParametersWithValidation"
              :disabled="isCurrentlyReading || !currentSelectedClass"
              severity="warning"
              size="small"
            />
          </div>
        </div>
      </div>

      <!-- 参数分类切换标签（包含出厂校正参数） -->
      <div class="class-tabs">
          <Button
            v-for="parameterClass in allAvailableClasses"
            :key="parameterClass.name"
            :label="parameterClass.nameKey ? t(parameterClass.nameKey) : parameterClass.name"
            @click="switchToParameterClass(parameterClass.name)"
            :severity="currentSelectedClass?.name === parameterClass.name ? 'primary' : 'secondary'"
            :outlined="currentSelectedClass?.name !== parameterClass.name"
            size="small"
            class="class-tab-button"
          />
      </div>
    </div>
      <!-- 当前分类的参数数据表格 - 使用增强列表支持下拉框 -->
    <DataTable
      :value="enhancedParameterList"
      class="p-datatable-sm"
      :show-gridlines="true"
      scrollable
      tableStyle="min-width: 50rem"
    >
      <!-- 参数名称列 -->
      <Column :header="t('clusterConfigParam.table.parameterName')" style="width: 250px">
        <template #body="slotProps">
          <div class="font-medium">{{ slotProps.data.label }}</div>
        </template>
      </Column>

      <!-- 参数值编辑列 -->
      <Column :header="t('clusterConfigParam.table.parameterValue')" style="width: 200px">
        <template #body="slotProps">
          <!-- 下拉框参数 -->
          <Dropdown
            v-if="isParameterDropdown(slotProps.data)"
            :options="slotProps.data.options"
            optionLabel="label"
            optionValue="value"
            :model-value="slotProps.data.selectedOption?.value"
            @update:model-value="(value) => updateDropdownParameterValue(slotProps.data, value)"
            :disabled="isCurrentlyReading"
            size="small"
            class="w-full"
          />

          <!-- IPv4 地址输入框 -->
          <InputText
            v-else-if="slotProps.data.type === 'ipv4'"
            :model-value="getInputDisplay(slotProps.data, slotProps.data.currentValue, getParameterInputValue)"
            @update:model-value="(inputValue) => setRawInput(slotProps.data, inputValue)"
            :disabled="isCurrentlyReading"
            :class="['w-full', getIPv4InputClass(slotProps.data.currentValue)]"
            placeholder="0.0.0.0"
          />

          <!-- hex16 类型输入框 -->
          <InputText
            v-else-if="slotProps.data.type === 'hex16'"
            :model-value="slotProps.data.currentValue"
            @update:model-value="(inputValue) => updateParameterValue(slotProps.data.key, inputValue, { immediate: true })"
            :disabled="isCurrentlyReading"
            class="w-full"
          />

          <!-- 字符串类型输入框（如生产编码） -->
          <InputText
            v-else-if="slotProps.data.type === 'string'"
            :model-value="slotProps.data.currentValue"
            @update:model-value="(inputValue) => updateParameterValue(slotProps.data.key, inputValue, { immediate: true })"
            :disabled="isCurrentlyReading"
            class="w-full"
            :placeholder="slotProps.data.key === 'productionCode' ? t('clusterConfigParam.productionCode.placeholder') : ''"
          />

          <!-- 普通数字输入框参数 -->
          <InputText
            v-else
            :model-value="getInputDisplay(slotProps.data, slotProps.data.currentValue, getParameterInputValue)"
            @update:model-value="(v) => setRawInput(slotProps.data, v)"
            :disabled="isCurrentlyReading"
            class="w-full"
          />
        </template>
      </Column>

      <!-- 参数单位列 -->
      <Column :header="t('clusterConfigParam.table.unit')" style="width: 80px">
        <template #body="slotProps">
          <div>
            {{ slotProps.data.unit || '-' }}
          </div>
        </template>
      </Column>

      <!-- 参数备注列 -->
      <Column :header="t('clusterConfigParam.table.remarks')">
        <template #body="slotProps">
          <div class="text-sm whitespace-pre-line">
            {{ getParameterRemarkText(slotProps.data.key) }}
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
/* 固定表头样式 */
.fixed-header {
  position: sticky;
  top: 40px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--surface-card);
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
  margin-bottom: 1rem;
}

.control-area {
  display: flex;
  align-items: flex-start;
}

.control-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.cluster-dropdown {
  min-width: 200px;
}

.button-group {
  display: flex;
  gap: 8px;
}

.class-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.class-tab-button {
  min-width: 100px;
}

/* IPv4格式错误样式 */
.ipv4-invalid {
  border-color: var(--red-500) !important;
  background-color: var(--red-50) !important;
}

.ipv4-invalid:focus {
  border-color: var(--red-500) !important;
  box-shadow: 0 0 0 0.2rem rgba(239, 68, 68, 0.25) !important;
}
</style>
