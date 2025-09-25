<script setup>
// 系统基本配置参数页面 - 支持参数分类切换和分组下发
import { useToast } from 'primevue/usetoast'
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick, markRaw } from 'vue'
import { scheduleAutoRead, cancelAutoRead, registerAutoReadFunction } from '@/composables/utils/useAutoReadScheduler'
import { useRetryLogic } from '@/composables/utils/useRetryLogic'
import { SYS_BASE_PARAM_R, FACTORY_CALIB_PARAM_R } from '../../../../main/table.js'
import { useRemoteControlCore, serializeParameterData, createDefaultParameterData } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { useSysBaseParam } from '@/composables/core/data-processing/parameter-management/useSysBaseParam'
import { useFactoryCalibParam } from '@/composables/core/data-processing/parameter-management/useFactoryCalibParam'
import { BASE_PARAM_REMARKS, FACTORY_CALIB_PARAM_REMARKS } from '@/configs/ui/Remarks'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useSystemConfig } from '@/composables/core/data-processing/parameter-management/useSystemConfig'

import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

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
        byteOffset: 0,      // 起始字节偏移：寄存器0开始
        byteLength: 132,    // 字节长度：BMU配置 + 虚拟电池位移，总共66个u16寄存器 = 132字节
      },
      {
        name: '类型选择',
        byteOffset: 164,    // 起始字节偏移：跳过32字节预留 = 寄存器82开始
        byteLength: 20,     // 字节长度：10个类型选择参数，每个u16 = 20字节
        hiddenFields: ['SpecialFuncEnable']  // 隐藏特殊功能使能位配置寄存器，只显示解析出的bit位字段
      },
      {
        name: '基础设置',
        byteOffset: 186,    // 起始字节偏移：跳过4字节预留 = 寄存器93开始
        byteLength: 16      // 字节长度：8个基础设置参数，每个u16 = 16字节
      },
      {
        name: '空调阈值',
        byteOffset: 210,    // 起始字节偏移：跳过8字节预留 = 寄存器105开始
        byteLength: 12      // 字节长度：6个温度阈值参数，每个s16 = 12字节
      },
      {
        name: '通信设置',
        byteOffset: 230,    // 起始字节偏移：跳过8字节预留 = 寄存器115开始
        byteLength: 18      // 字节长度：9个通信参数，每个u16 = 18字节
      },
      {
        name: '电流传感器',
        byteOffset: 256,    // 起始字节偏移：跳过8字节预留 = 寄存器128开始
        byteLength: 8       // 字节长度：4个传感器参数，每个u16 = 8字节
      },
      {
        name: '电池信息',
        byteOffset: 268,    // 起始字节偏移：跳过4字节预留 = 寄存器134开始
        byteLength: 6       // 字节长度：3个电池信息参数，每个u16 = 6字节
      },
      {
        name: '簇额定参数',
        byteOffset: 274,    // 起始字节偏移：紧接电池信息，寄存器137开始
        byteLength: 16      // 字节长度：1个u16 + 3个u32 = 2+12 = 14字节
      },
      {
        name: '均衡参数',
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
} = useRemoteControlCore(systemBaseParamConfig, toastService)

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
} = useRemoteControlCore(factoryCalibParamConfig, toastService)

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
  const factoryClass = { name: '设备出厂信息' }
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
  if (isFactoryCalibMode.value) {
    const baseList = factoryCalibEnhancedParameterList.value
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
        label: '生产编码',  
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
        remarks: '格式：YYYYMMDDNNNN（12位数字）'  
      })
    }

    return filteredList
  }
  return systemEnhancedParameterList.value
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
      summary: 'IP地址格式错误',
      detail: `以下IP地址格式不正确，请修正后再下发：\n${ipv4Errors.join('\n')}`,
      life: 8000
    })
    return
  }

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
const isParameterDropdown = (parameterLabel) => {
  const result = isFactoryCalibMode.value
    ? factoryCalibIsParameterDropdown(parameterLabel)
    : systemIsParameterDropdown(parameterLabel)



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
const getParameterDropdownOptions = (parameterLabel) => {
  const options = isFactoryCalibMode.value
    ? factoryCalibGetParameterDropdownOptions(parameterLabel)
    : systemGetParameterDropdownOptions(parameterLabel)



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
  if (isFactoryCalibMode.value) {
    return FACTORY_CALIB_PARAM_REMARKS[parameterKey] || ''
  } else {
    return BASE_PARAM_REMARKS[parameterKey] || ''
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

  const parsedData = factoryCalibParamHandler.parseFactoryCalibParamReadResponse(mqttMessage)

  if (!parsedData) {
    return
  }

  factoryCalibHandleReceivedParameterData(parsedData)
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

  // 初始化出厂校正参数的默认值
  setTimeout(() => {
    const defaultFactoryData = factoryCalibParamHandler.createDefaultFactoryCalibParamData()

    // 模拟接收到的数据结构，触发默认值设置
    const mockFactoryData = {
      frameKey: '1-1',
      blockId: 1,
      clusterId: 1,
      data: defaultFactoryData,
      result: { success: true },
      dataSource: 'FACTORY_CALIB_PARAM'
    }

    // 调用数据处理函数设置默认值
    factoryCalibHandleReceivedParameterData(mockFactoryData)
  }, 100)

  // 使用全局调度器避免多页面并发读取
  scheduleAutoRead(allReadTopics, 600, 'BaseParam')
})

// keep-alive 激活时的处理
onActivated(() => {
  scheduleAutoRead(allReadTopics, 600, 'BaseParam')
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
    <Toast />
    
    <!-- 控制操作区域 -->
    <div class="control-area mb-4">
      <div class="control-left">
        <!-- 操作按钮组 -->
        <div class="button-group">
          <Button
            :label="isCurrentlyReading ? '停止读取' : '开始读取'"
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
            label="下发参数"
            @click="sendCurrentClassParameters"
            :disabled="isCurrentlyReading || !currentSelectedClass"
            severity="warning"
            size="small"
          />
        </div>
      </div>
    </div>

    <!-- 协议修改：参数分类切换标签（包含出厂校正参数） -->
    <div class="class-tabs mb-4">
      <Button
        v-for="parameterClass in allAvailableClasses"
        :key="parameterClass.name"
        :label="parameterClass.name"
        @click="switchToParameterClass(parameterClass.name)"
        :severity="currentSelectedClass?.name === parameterClass.name ? 'primary' : 'secondary'"
        :outlined="currentSelectedClass?.name !== parameterClass.name"
        size="small"
        class="class-tab-button"
      />
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
      <Column header="参数名称" style="width: 250px">
        <template #body="slotProps">
          <div>
            <div class="font-medium">{{ slotProps.data.label }}</div>
            <div class="text-xs text-gray-500">{{ slotProps.data.key }}</div>
          </div>
        </template>
      </Column>

      <!-- 参数值编辑列 -->
      <Column header="参数值" style="width: 200px">
        <template #body="slotProps">
          <!-- 下拉框参数 -->
          <Dropdown
            v-if="isParameterDropdown(slotProps.data.label)"
            :options="getParameterDropdownOptions(slotProps.data.label)"
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
            :model-value="slotProps.data.currentValue"
            @update:model-value="(inputValue) => updateParameterValue(slotProps.data.key, inputValue)"
            :disabled="isCurrentlyReading"
            size="small"
            :class="['w-full', getIPv4InputClass(slotProps.data.currentValue)]"
            placeholder="0.0.0.0"
          />

          <!-- hex16 类型输入框 -->
          <InputText
            v-else-if="slotProps.data.type === 'hex16'"
            :model-value="slotProps.data.currentValue"
            @update:model-value="(inputValue) => updateParameterValue(slotProps.data.key, inputValue)"
            :disabled="isCurrentlyReading"
            size="small"
            class="w-full"
          />

          <!-- 字符串类型输入框（如生产编码） -->
          <InputText
            v-else-if="slotProps.data.type === 'string'"
            :model-value="slotProps.data.currentValue"
            @update:model-value="(inputValue) => updateParameterValue(slotProps.data.key, inputValue)"
            :disabled="isCurrentlyReading"
            size="small"
            class="w-full"
            :placeholder="slotProps.data.key === 'productionCode' ? 'YYYYMMDDNNNN' : ''"
          />

          <!-- 普通数字输入框参数 -->
          <InputNumber
            v-else
            :model-value="getParameterInputValue(slotProps.data, slotProps.data.currentValue)"
            @update:model-value="(inputValue) => updateParameterValue(slotProps.data.key, setParameterInputValue(slotProps.data, inputValue))"
            :disabled="isCurrentlyReading"
            :step="slotProps.data.scale ? 1/slotProps.data.scale : 1"
            :min-fraction-digits="getParameterDecimalPlaces(slotProps.data)"
            :max-fraction-digits="getParameterDecimalPlaces(slotProps.data)"
            size="small"
            class="w-full"
          />
        </template>
      </Column>

      <!-- 参数单位列 -->
      <Column header="单位" style="width: 80px">
        <template #body="slotProps">
          <div class="text-gray-600">
            {{ slotProps.data.unit || '-' }}
          </div>
        </template>
      </Column>

      <!-- 参数备注列 -->
      <Column header="备注说明">
        <template #body="slotProps">
          <div class="text-sm text-gray-600 whitespace-pre-line">
            {{ getParameterRemarkText(slotProps.data.key) }}
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
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
  border-color: #e74c3c !important;
  background-color: #fdf2f2 !important;
}

.ipv4-invalid:focus {
  border-color: #e74c3c !important;
  box-shadow: 0 0 0 0.2rem rgba(231, 76, 60, 0.25) !important;
}
</style>

