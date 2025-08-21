// src/renderer/src/composables/useSOXParam.js
import { 
  REAL_TIME_SAVE_R, 
  SOX_CFG_PARAM_R, 
  SOC_CFG_PARAM_R, 
  SOH_CFG_PARAM_R 
} from '../../../../../../main/table.js'
import {
  serializeParameterData,
  createDefaultParameterData,
  parseParameterReadResponse,
  parseParameterWriteResponse
} from '../remote-control/useRemoteControlCore.js'

// 定义每个Topic对应的参数表
const TOPIC_CONFIG = {
  'real_time_save': {
    paramFields: REAL_TIME_SAVE_R,
    name: '实时SOX数据'
  },
  'sox_cfg_param': {
    paramFields: SOX_CFG_PARAM_R,
    name: 'SOX通用参数'
  },
  'soc_cfg_param': {
    paramFields: SOC_CFG_PARAM_R,
    name: 'SOC算法参数'
  },
  'soh_cfg_param': {
    paramFields: SOH_CFG_PARAM_R,
    name: 'SOH算法参数'
  }
}

// 根据参数分类确定所属的Topic
function getTopicByClassName(className) {
  // 检查实时SOX数据
  const isRealTimeParam = REAL_TIME_SAVE_R.some(param => param.class === className)
  if (isRealTimeParam) return 'real_time_save'
  
  // 检查SOX通用参数
  const isSOXParam = SOX_CFG_PARAM_R.some(param => param.class === className)
  if (isSOXParam) return 'sox_cfg_param'
  
  // 检查SOC算法参数
  const isSOCParam = SOC_CFG_PARAM_R.some(param => param.class === className)
  if (isSOCParam) return 'soc_cfg_param'
  
  // 检查SOH算法参数
  const isSOHParam = SOH_CFG_PARAM_R.some(param => param.class === className)
  if (isSOHParam) return 'soh_cfg_param'
  
  // 默认返回SOX通用参数
  console.warn(`[useSOXParam] 未找到分类 ${className} 对应的Topic，默认使用sox_cfg_param`)
  return 'sox_cfg_param'
}

// 计算某个分类在其Topic内的字节偏移和长度
function calculateClassOffsetInTopic(className, topicType) {
  const config = TOPIC_CONFIG[topicType]
  if (!config) return { byteOffset: 0, byteLength: 0 }
  
  const paramFields = config.paramFields
  const classParams = paramFields.filter(p => p.class === className)
  if (classParams.length === 0) return { byteOffset: 0, byteLength: 0 }
  
  let totalOffset = 0
  let classStart = -1
  let classEnd = -1
  
  // 遍历该Topic的所有参数计算字节偏移
  for (const param of paramFields) {
    const typeByteMap = {
      'u8': 1, 's8': 1, 'u16': 2, 's16': 2,
      'u32': 4, 's32': 4, 'f32': 4
    }
    
    // 处理skip类型
    if (param.type && param.type.startsWith('skip')) {
      const skipBytes = parseInt(param.type.replace('skip', ''))
      totalOffset += skipBytes
      continue
    }
    
    const fieldSize = typeByteMap[param.type] || 2
    const count = param.count || 1
    const paramByteSize = fieldSize * count
    
    // 如果这个参数属于目标分类
    if (param.class === className) {
      if (classStart === -1) classStart = totalOffset
      classEnd = totalOffset + paramByteSize
    }
    
    totalOffset += paramByteSize
  }
  
  return {
    byteOffset: classStart === -1 ? 0 : classStart,
    byteLength: classStart === -1 ? 0 : (classEnd - classStart)
  }
}

export function useSOXParam() {
  // 过滤函数：过滤掉预留字段
  const filterReservedFields = (fields) => {
    return fields.filter(field => {
      const keyLower = (field.key || '').toLowerCase()
      const labelLower = (field.label || '').toLowerCase()

      // 过滤掉预留、保留、跳过等字段
      return !keyLower.includes('_reserve') &&
             !keyLower.includes('reserve') &&
             !keyLower.includes('skip') &&
             !labelLower.includes('预留') &&
             !labelLower.includes('保留') &&
             !labelLower.includes('跳过')
    })
  }

  // 合并所有参数表（仅用于页面显示），并过滤掉预留字段
  const ALL_SOX_PARAM_R = [
    ...filterReservedFields(REAL_TIME_SAVE_R),
    ...filterReservedFields(SOX_CFG_PARAM_R),
    ...filterReservedFields(SOC_CFG_PARAM_R),
    ...filterReservedFields(SOH_CFG_PARAM_R)
  ]

  const createDefaultSOXParamData = () => createDefaultParameterData(ALL_SOX_PARAM_R, '[useSOXParam]')

  const parseSOXParamReadResponse = (mqttMessage) => parseParameterReadResponse(mqttMessage, '[useSOXParam]', 'SOX参数')

  const parseSOXParamWriteResponse = (mqttMessage) => parseParameterWriteResponse(mqttMessage, '[useSOXParam]', 'SOX参数')

  /**
   * 序列化SOX参数数据 - 按Topic分别处理
   * @param {Object} parameterDataFrame - 包含参数数据的对象
   * @param {string} currentClassName - 当前选中的分类名称
   * @param {number} startByteOffset - 起始字节偏移量（在该分类的Topic内）
   * @param {number} registerCount - 寄存器数量
   * @returns {string|null} 序列化后的十六进制字符串或null（失败时）
   */
  const serializeSOXParamData = (parameterDataFrame, currentClassName, startByteOffset = 0, registerCount = 0) => {
    if (!currentClassName) {
      console.error('[useSOXParam] 缺少currentClassName参数')
      return null
    }
    
    // 1. 确定当前分类属于哪个Topic
    const topicType = getTopicByClassName(currentClassName)
    const config = TOPIC_CONFIG[topicType]
    
    console.log(`[useSOXParam] 分类"${currentClassName}" 属于Topic: ${topicType}`)
    
    // 2. 使用该Topic对应的参数表进行序列化
    return serializeParameterData(
      parameterDataFrame,
      config.paramFields,           // 使用特定Topic的参数表
      startByteOffset,              // 在该Topic内的字节偏移
      registerCount,                // 寄存器数量
      '[useSOXParam]',
      `SOX参数-${config.name}`
    )
  }

  // 获取分类信息（包含Topic和偏移信息）
  const getClassInfo = (className) => {
    const topicType = getTopicByClassName(className)
    const offsetInfo = calculateClassOffsetInTopic(className, topicType)
    
    return {
      topicType,
      dataType: topicType,
      byteOffset: offsetInfo.byteOffset,
      byteLength: offsetInfo.byteLength,
      ...offsetInfo
    }
  }

  return {
    createDefaultSOXParamData,
    parseSOXParamReadResponse,
    parseSOXParamWriteResponse,
    serializeSOXParamData,
    getClassInfo,
    getTopicByClassName,
    TOPIC_CONFIG,
    ALL_SOX_PARAM_R
  }
}
