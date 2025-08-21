// src/renderer/src/composables/useAlarmThreshold.js
import { result } from 'lodash-es'
import { CLUSTER_DNS_PARAM_R, PACK_DNS_PARAM_R, CELL_DNS_PARAM_R } from '../../../../../../main/table.js'
import {
  serializeParameterData,
  createDefaultParameterData,
  parseParameterReadResponse,
  parseParameterWriteResponse
} from '../remote-control/useRemoteControlCore.js'

// 定义每个Topic对应的参数表
const TOPIC_CONFIG = {
  'cluster_dns_param': {
    paramFields: CLUSTER_DNS_PARAM_R,
    name: '簇端报警参数'
  },
  'pack_dns_param': {
    paramFields: PACK_DNS_PARAM_R,
    name: '包端报警参数'
  },
  'cell_dns_param': {
    paramFields: CELL_DNS_PARAM_R,
    name: '单体报警参数'
  }
}

// 根据参数分类确定所属的Topic
function getTopicByClassName(className) {
  // 检查簇端参数
  const isClusterParam = CLUSTER_DNS_PARAM_R.some(param => param.class === className)
  if (isClusterParam) return 'cluster_dns_param'
  
  // 检查包端参数
  const isPackParam = PACK_DNS_PARAM_R.some(param => param.class === className)
  if (isPackParam) return 'pack_dns_param'
  
  // 检查单体参数
  const isCellParam = CELL_DNS_PARAM_R.some(param => param.class === className)
  if (isCellParam) return 'cell_dns_param'
  
  // 默认返回簇端
  console.warn(`[useAlarmThreshold] 未找到分类 ${className} 对应的Topic，默认使用cluster_dns_param`)
  return 'cluster_dns_param'
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

export function useAlarmThreshold() {
  // 合并所有参数表（仅用于页面显示）
  const ALL_ALARM_PARAM_R = [
    ...CLUSTER_DNS_PARAM_R,
    ...PACK_DNS_PARAM_R,
    ...CELL_DNS_PARAM_R
  ]

  const createDefaultAlarmThresholdData = () => createDefaultParameterData(ALL_ALARM_PARAM_R, '[useAlarmThreshold]')

  const parseAlarmThresholdReadResponse = (mqttMessage) => parseParameterReadResponse(mqttMessage, '[useAlarmThreshold]', '告警阈值')
  console.log('test',parseAlarmThresholdReadResponse)
  const parseAlarmThresholdWriteResponse = (mqttMessage) => parseParameterWriteResponse(mqttMessage, '[useAlarmThreshold]', '告警阈值')

  /**
   * 序列化告警阈值数据 - 按Topic分别处理
   * @param {Object} parameterDataFrame - 包含参数数据的对象
   * @param {string} currentClassName - 当前选中的分类名称
   * @param {number} startByteOffset - 起始字节偏移量（在该分类的Topic内）
   * @param {number} registerCount - 寄存器数量
   * @returns {string|null} 序列化后的十六进制字符串或null（失败时）
   */
  const serializeAlarmThresholdData = (parameterDataFrame, currentClassName, startByteOffset = 0, registerCount = 0) => {
    if (!currentClassName) {
      console.error('[useAlarmThreshold] 缺少currentClassName参数')
      return null
    }
    
    // 1. 确定当前分类属于哪个Topic
    const topicType = getTopicByClassName(currentClassName)
    const config = TOPIC_CONFIG[topicType]
    
    console.log(`[useAlarmThreshold] 分类"${currentClassName}" 属于Topic: ${topicType}`)
    
    // 2. 使用该Topic对应的参数表进行序列化
    return serializeParameterData(
      parameterDataFrame,
      config.paramFields,           // 使用特定Topic的参数表
      startByteOffset,              // 在该Topic内的字节偏移
      registerCount,                // 寄存器数量
      '[useAlarmThreshold]',
      `告警阈值-${config.name}`
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
    createDefaultAlarmThresholdData,
    parseAlarmThresholdReadResponse,
    parseAlarmThresholdWriteResponse,
    serializeAlarmThresholdData,
    getClassInfo,
    getTopicByClassName,
    TOPIC_CONFIG,
    ALL_ALARM_PARAM_R
  }
} 

