// 堆系统基本配置参数专用处理逻辑
// 用途：为堆级设备管理页提供默认值创建、读取/写入解析与序列化能力，并自动计算分类偏移
import { BLOCK_COMMON_PARAM_R } from '../../../../../../main/table.js'
import {
  serializeParameterData,
  createDefaultParameterData,
  parseParameterReadResponse,
  parseParameterWriteResponse
} from '../remote-control/useRemoteControlCore.js'

// 计算每个分类在整张表内的 byteOffset/byteLength（按字段顺序）
function computeParameterClassesByTable(fieldTable) {
  const typeByteMap = { u8: 1, s8: 1, u16: 2, s16: 2, u32: 4, s32: 4, f32: 4 }
  let offset = 0
  const classRanges = []
  const classIndex = new Map()

  for (const field of fieldTable) {
    // 处理 skipN：预留字段在真实载荷中占位，必须推进分组 end 与全局 offset
    if (field.type && String(field.type).startsWith('skip')) {
      const skipBytes = parseInt(String(field.type).replace('skip', '')) || 0

      const className = field.class || '系统基本配置'
      if (!classIndex.has(className)) {
        classIndex.set(className, classRanges.length)
        classRanges.push({ name: className, start: offset, end: offset })
      }
      const idx = classIndex.get(className)
      classRanges[idx].end = offset + skipBytes

      offset += skipBytes
      continue
    }

    const size = typeByteMap[field.type] || 2
    const count = field.count || 1
    const bytes = size * count

    const className = field.class || '系统基本配置'
    if (!classIndex.has(className)) {
      classIndex.set(className, classRanges.length)
      classRanges.push({ name: className, start: offset, end: offset })
    }
    const idx = classIndex.get(className)
    classRanges[idx].end = offset + bytes
    offset += bytes
  }

  return classRanges.map(r => ({ name: r.name, byteOffset: r.start, byteLength: r.end - r.start }))
}

export function useBlockCommonParam() {
  const createDefaultBlockCommonParamData = () => createDefaultParameterData(BLOCK_COMMON_PARAM_R, '[useBlockCommonParam]')

  const parseBlockCommonParamReadResponse = (mqttMessage) =>
    parseParameterReadResponse(mqttMessage, '[useBlockCommonParam]', '堆系统基本配置')

  const parseBlockCommonParamWriteResponse = (mqttMessage) =>
    parseParameterWriteResponse(mqttMessage, '[useBlockCommonParam]', '堆系统基本配置')

  const serializeBlockCommonParamData = (parameterDataFrame, startByteOffset, registerCount) =>
    serializeParameterData(
      parameterDataFrame,
      BLOCK_COMMON_PARAM_R,
      startByteOffset,
      registerCount,
      '[useBlockCommonParam]',
      '堆系统基本配置'
    )

  const getParameterClasses = () => computeParameterClassesByTable(BLOCK_COMMON_PARAM_R)

  return {
    createDefaultBlockCommonParamData,
    parseBlockCommonParamReadResponse,
    parseBlockCommonParamWriteResponse,
    serializeBlockCommonParamData,
    getParameterClasses
  }
}


