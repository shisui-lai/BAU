<script setup>
// 系统基本配置参数页面 - 支持参数分类切换和分组下发
import { useToast } from 'primevue/usetoast'
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { translateDropdownOptions } from '@/configs/ui/dropdownConfigs'
import { scheduleAutoRead, cancelAutoRead, registerAutoReadFunction } from '@/composables/utils/useAutoReadScheduler'
import { useRetryLogic } from '@/composables/utils/useRetryLogic'
import { SYS_BASE_PARAM_R, FACTORY_CALIB_PARAM_R } from '../../../../../main/table.js'
import { useRemoteControlCore, serializeParameterData, createDefaultParameterData } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { useSysBaseParam } from '@/composables/core/data-processing/parameter-management/useSysBaseParam'
import { useFactoryCalibParam } from '@/composables/core/data-processing/parameter-management/useFactoryCalibParam'
import { BASE_PARAM_REMARKS, FACTORY_CALIB_PARAM_REMARKS } from '@/configs/ui/Remarks'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useSystemConfig } from '@/composables/core/data-processing/parameter-management/useSystemConfig'
import { DEFAULT_BASE_PARAMS } from '@/configs/parameterDefaults'

// 已移除 PrimeVue 组件导入，使用原生 HTML 元素

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

// 系统配置管理
const { requestSystemConfig } = useSystemConfig()

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
        nameKey: 'clusterConfigParam.parameterClasses.bmuConfig',
        byteOffset: 0,      // 起始字节偏移：寄存器0开始
        byteLength: 132,    // 字节长度：BMU配置 + 虚拟电池位移，总共66个u16寄存器 = 132字节
      },
      {
        name: '类型选择',
        nameKey: 'clusterConfigParam.parameterClasses.typeSelection',
        byteOffset: 164,    // 起始字节偏移：跳过32字节预留 = 寄存器82开始
        byteLength: 20,     // 字节长度：10个类型选择参数，每个u16 = 20字节
        hiddenFields: ['SpecialFuncEnable']  // 隐藏特殊功能使能位配置寄存器，只显示解析出的bit位字段
      },
      {
        name: '基础设置',
        nameKey: 'clusterConfigParam.parameterClasses.basicSettings',
        byteOffset: 186,    // 起始字节偏移：跳过4字节预留 = 寄存器93开始
        byteLength: 16      // 字节长度：8个基础设置参数，每个u16 = 16字节
      },
      {
        name: '空调阈值',
        nameKey: 'clusterConfigParam.parameterClasses.airConditioningThreshold',
        byteOffset: 210,    // 起始字节偏移：跳过8字节预留 = 寄存器105开始
        byteLength: 12      // 字节长度：6个温度阈值参数，每个s16 = 12字节
      },
      {
        name: '通信设置',
        nameKey: 'clusterConfigParam.parameterClasses.communicationSettings',
        byteOffset: 230,    // 起始字节偏移：跳过8字节预留 = 寄存器115开始
        byteLength: 18      // 字节长度：9个通信参数，每个u16 = 18字节
      },
      {
        name: '电流传感器',
        nameKey: 'clusterConfigParam.parameterClasses.currentSensor',
        byteOffset: 256,    // 起始字节偏移：跳过8字节预留 = 寄存器128开始
        byteLength: 8       // 字节长度：4个传感器参数，每个u16 = 8字节
      },
      {
        name: '电池信息',
        nameKey: 'clusterConfigParam.parameterClasses.batteryInfo',
        byteOffset: 268,    // 起始字节偏移：跳过4字节预留 = 寄存器134开始
        byteLength: 6       // 字节长度：3个电池信息参数，每个u16 = 6字节
      },
      {
        name: '簇额定参数',
        nameKey: 'clusterConfigParam.parameterClasses.clusterRatedParams',
        byteOffset: 274,    // 起始字节偏移：紧接电池信息，寄存器137开始
        byteLength: 16      // 字节长度：1个u16 + 3个u32 = 2+12 = 14字节
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

// 统一重试逻辑
const retryLogic = useRetryLogic(toastService, () => {
  if (isFactoryCalibMode.value) {
    factoryCalibStopParameterReading()
  } else {
    systemStopParameterReading()
  }
})

// IPv4格式验证函数
function validateIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false

  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  if (!ipRegex.test(ip)) return false

  const parts = ip.split('.')
  return parts.every(part => {
    const num = parseInt(part, 10)
    return num >= 0 && num <= 255
  })
}

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

// 带IPv4验证的下发参数函数
const sendCurrentClassParameters = () => {
  // 验证所有IPv4字段格式
  const ipv4Errors = []

  // 获取当前参数列表
  const currentParameterList = isFactoryCalibMode.value
    ? factoryCalibEnhancedParameterList.value
    : systemEnhancedParameterList.value

  currentParameterList.forEach(param => {
    if (param.type === 'ipv4') {
      const value = param.currentValue

      // 检查IPv4格式（排除默认值0.0.0.0）
      if (value && value !== '0.0.0.0' && !validateIPv4(value)) {
        ipv4Errors.push(`${param.label || param.key}: "${value}"`)
      }
    }
  })

  // 如果有格式错误，显示错误信息并阻止下发
  if (ipv4Errors.length > 0) {
    toastService.add({
      severity: 'error',
      summary: t('clusterConfigParam.errors.ipFormatError'),
      detail: `${t('clusterConfigParam.errors.ipFormatErrorDetail')}\n${ipv4Errors.join('\n')}`,
      life: 8000
    })
    return
  }

  // 打印所有下拉框参数的值
/*   const dropdownParams = currentParameterList.filter(param => {
    const originalLabel = param.originalLabel || param.label
    return isParameterDropdown({ originalLabel, label: originalLabel })
  })
  
  if (dropdownParams.length > 0) {
    console.log('[BaseParamNative] 下发参数时所有下拉框的值:', {
      mode: isFactoryCalibMode.value ? '出厂校正参数' : '系统基本参数',
      currentClass: currentSelectedClass.value?.name,
      dropdownParams: dropdownParams.map(param => ({
        key: param.key,
        label: param.label,
        originalLabel: param.originalLabel,
        selectedOption: param.selectedOption,
        selectedValue: param.selectedOption?.value,
        selectedLabel: param.selectedOption?.label,
        currentValue: param.currentValue
      }))
    })
  } */

  // 格式验证通过，执行正常的参数下发
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
const updateParameterValue = (parameterKey, value) => {
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
    factoryCalibUpdateParameterValue(parameterKey, value)
  } else {
    systemUpdateParameterValue(parameterKey, value)
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
  // 原生 select 的 e.target.value 总是字符串，需要处理类型转换
  // 查找匹配的选项，支持字符串和数字类型的比较（与 PrimeVue Dropdown 行为一致）
  const selectedOption = param.options?.find(opt => {
    // 严格相等比较
    if (opt.value === value) return true
    // 字符串转换后比较（处理原生 select 返回字符串的情况）
    if (String(opt.value) === String(value)) return true
    return false
  })
  
  // 打印选中的下拉框值
/*   console.log('[BaseParamNative] 下拉框选中值:', {
    paramKey: param.key,
    paramLabel: param.label,
    rawValue: value,
    selectedOption: selectedOption,
    selectedValue: selectedOption?.value,
    selectedLabel: selectedOption?.label
  }) */
  
  if (isFactoryCalibMode.value) {
    factoryCalibUpdateDropdownParameterValue(param.key, selectedOption)
  } else {
    systemUpdateDropdownParameterValue(param.key, selectedOption)
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
            <button
              @click="() => {
                if (isCurrentlyReading) {
                  stopParameterReading()
                } else {
                  startMultiTopicReadingWithRetry()
                }
              }"
              :class="['btn', isCurrentlyReading ? 'btn-danger' : 'btn-primary']"
            >
              {{ isCurrentlyReading ? t('clusterConfigParam.buttons.stopReading') : t('clusterConfigParam.buttons.startReading') }}
            </button>
            <button
              @click="sendCurrentClassParameters"
              :disabled="isCurrentlyReading || !currentSelectedClass"
              class="btn btn-warning"
            >
              {{ t('clusterConfigParam.buttons.sendParameters') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 参数分类切换标签（包含出厂校正参数） -->
      <div class="class-tabs">
        <button
          v-for="parameterClass in allAvailableClasses"
          :key="parameterClass.name"
          @click="switchToParameterClass(parameterClass.name)"
          :class="[
            'btn',
            'class-tab-button',
            currentSelectedClass?.name === parameterClass.name ? 'btn-primary' : 'btn-secondary'
          ]"
        >
          {{ parameterClass.nameKey ? t(parameterClass.nameKey) : parameterClass.name }}
        </button>
      </div>
    </div>

    <!-- 原生HTML表格 -->
    <div class="table-container">
      <table class="native-table">
        <thead>
          <tr>
            <th style="width: 250px">{{ t('clusterConfigParam.table.parameterName') }}</th>
            <th style="width: 200px">{{ t('clusterConfigParam.table.parameterValue') }}</th>
            <th style="width: 80px">{{ t('clusterConfigParam.table.unit') }}</th>
            <th>{{ t('clusterConfigParam.table.remarks') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="param in enhancedParameterList" :key="param.key">
            <!-- 参数名称列 -->
            <td>
              <div class="font-medium">{{ param.label }}</div>
            </td>

            <!-- 参数值编辑列 -->
            <td>
              <!-- 下拉框参数 -->
              <select
                v-if="isParameterDropdown(param)"
                :value="param.selectedOption?.value"
                @change="(e) => updateDropdownParameterValue(param, e.target.value)"
                :disabled="isCurrentlyReading"
                class="input-control"
              >
                <option v-for="option in param.options" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>

              <!-- IPv4 地址输入框 -->
              <input
                v-else-if="param.type === 'ipv4'"
                type="text"
                :value="param.currentValue"
                @input="(e) => updateParameterValue(param.key, e.target.value)"
                :disabled="isCurrentlyReading"
                :class="['input-control', getIPv4InputClass(param.currentValue)]"
                placeholder="0.0.0.0"
              />

              <!-- hex16 类型输入框 -->
              <input
                v-else-if="param.type === 'hex16'"
                type="text"
                :value="param.currentValue"
                @input="(e) => updateParameterValue(param.key, e.target.value)"
                :disabled="isCurrentlyReading"
                class="input-control"
              />

              <!-- 字符串类型输入框（如生产编码） -->
              <input
                v-else-if="param.type === 'string'"
                type="text"
                :value="param.currentValue"
                @input="(e) => updateParameterValue(param.key, e.target.value)"
                :disabled="isCurrentlyReading"
                class="input-control"
                :placeholder="param.key === 'productionCode' ? t('clusterConfigParam.productionCode.placeholder') : ''"
              />

              <!-- 普通数字输入框参数 -->
              <input
                v-else
                type="number"
                :value="getParameterInputValue(param, param.currentValue)"
                @input="(e) => updateParameterValue(param.key, setParameterInputValue(param, parseFloat(e.target.value)))"
                :disabled="isCurrentlyReading"
                :step="param.scale ? 1/param.scale : 1"
                class="input-control"
              />
            </td>

            <!-- 参数单位列 -->
            <td>
              <div>{{ param.unit || '-' }}</div>
            </td>

            <!-- 参数备注列 -->
            <td>
              <div class="text-sm whitespace-pre-line">
                {{ getParameterRemarkText(param.key) }}
              </div>
            </td>
          </tr>
          <!-- 空数据提示 -->
          <tr v-if="!enhancedParameterList || enhancedParameterList.length === 0">
            <td colspan="4" class="empty-message">
              {{ t('clusterConfigParam.noData') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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

.btn-danger {
  background-color: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
  border-color: #bd2130;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
  border-color: #ffc107;
}

.btn-warning:hover:not(:disabled) {
  background-color: #e0a800;
  border-color: #d39e00;
}

/* 表格容器 */
.table-container {
  overflow-x: auto;
}

/* 原生表格样式 */
.native-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--surface-card);
  border: 1px solid var(--surface-border);
  font-size: 0.875rem;
}

.native-table thead th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
  background-color: var(--surface-section);
  border-bottom: 2px solid var(--surface-border);
  position: sticky;
  top: 0;
  z-index: 1;
}

.native-table tbody tr {
  transition: background-color 0.2s;
}

.native-table tbody tr:hover {
  background-color: var(--surface-hover);
}

.native-table tbody tr:not(:last-child) td {
  border-bottom: 1px solid var(--surface-border);
}

.native-table tbody td {
  padding: 0.75rem 1rem;
  color: var(--text-color);
  vertical-align: middle;
}

.native-table tbody td.empty-message {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 2rem 1rem;
}

/* 输入控件样式 */
.input-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-0);
  color: var(--text-color);
  font-size: 0.875rem;
  transition: all 0.2s;
  outline: none;
}

.input-control:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
}

.input-control:disabled {
  background-color: var(--surface-100);
  opacity: 0.6;
  cursor: not-allowed;
}

/* 下拉框特殊样式 */
select.input-control {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23495057' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
}

/* IPv4格式错误样式 */
.ipv4-invalid {
  border-color: #dc3545 !important;
  background-color: #fff5f5 !important;
}

.ipv4-invalid:focus {
  border-color: #dc3545 !important;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
}

/* 工具类 */
.font-medium {
  font-weight: 500;
}

.text-sm {
  font-size: 0.875rem;
}

.whitespace-pre-line {
  white-space: pre-line;
}

.mb-3 {
  margin-bottom: 1rem;
}
</style>

