// 通用遥调核心逻辑文件 - 提供遥调的通用功能（同时支持簇/堆两种模式）
import { ref, computed, markRaw, shallowRef, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockStore } from '@/stores/device/blockStore'
import { registerAutoReadFunction } from '@/composables/utils/useAutoReadScheduler'
import { getDropdownConfig, isDropdownParameter } from '@/configs/ui/dropdownConfigs'
import { ERROR_CODES } from '../../../../../../main/table.js'

/**
 * 通用遥调错误码映射

 */
export const UNIVERSAL_REMOTE_CONTROL_ERROR_CODES = ERROR_CODES

/**
 * 通用参数字段字节大小计算函数
 * 根据字段类型返回对应的字节数，适用于所有遥调数据类型
 * @param {string} fieldType - 字段类型 (如: 'u16', 's16', 'u32', 's32', 'skip4')
 * @returns {number} 字段占用的字节数
 */
export function getParameterFieldByteSize(fieldType) {
  const fieldTypeSizeMap = {
    'u8': 1,    // 无符号8位整数
    's8': 1,    // 有符号8位整数
    'u16': 2,   // 无符号16位整数
    's16': 2,   // 有符号16位整数
    'u32': 4,   // 无符号32位整数
    's32': 4,   // 有符号32位整数
          'f32': 4,   // 32位浮点数
      'ipv4': 4,  // IPv4 地址（4字节）
    'hex16': 2, // 十六进制16位整数（2字节）
    'bit': 0,   // bit字段不占用额外字节空间（从父字段提取）
    'bits': 0,  // bits字段不占用额外字节空间（从父字段提取）
    }
  
  // 处理跳过字段类型 (如: skip4, skip8, skip16)
  if (fieldType.startsWith('skip')) {
    const skipByteCount = parseInt(fieldType.replace('skip', ''))
    return isNaN(skipByteCount) ? 0 : skipByteCount
  }

  // 处理字符串类型 (如: str16, str20, str32)
  if (fieldType.startsWith('str')) {
    const strByteCount = parseInt(fieldType.replace('str', ''))
    return isNaN(strByteCount) ? 0 : strByteCount
  }

  return fieldTypeSizeMap[fieldType] || 2 // 默认2字节
}

/**
 * 通用参数值写入函数
 * 向缓冲区写入指定类型的参数值，适用于所有遥调数据类型
 * @param {DataView} dataView - 数据视图对象
 * @param {number} byteOffset - 写入位置的字节偏移
 * @param {string} valueType - 数值类型
 * @param {*} value - 要写入的值
 */
export function writeParameterFieldValue(dataView, byteOffset, valueType, value) {
  // IPv4: 接受点分字符串或数值，写4字节（小端序）
  if (valueType === 'ipv4') {
    let b0=0,b1=0,b2=0,b3=0
    if (typeof value === 'string') {
      const parts = value.trim().split('.')
      if (parts.length === 4) {
        b0 = Math.min(255, Math.max(0, Number(parts[0] ?? 0)))|0
        b1 = Math.min(255, Math.max(0, Number(parts[1] ?? 0)))|0
        b2 = Math.min(255, Math.max(0, Number(parts[2] ?? 0)))|0
        b3 = Math.min(255, Math.max(0, Number(parts[3] ?? 0)))|0
      }
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      const v = value >>> 0
      b0 = v & 0xFF
      b1 = (v >>> 8) & 0xFF
      b2 = (v >>> 16) & 0xFF
      b3 = (v >>> 24) & 0xFF
    }
    dataView.setUint8(byteOffset + 0, b0)
    dataView.setUint8(byteOffset + 1, b1)
    dataView.setUint8(byteOffset + 2, b2)
    dataView.setUint8(byteOffset + 3, b3)
          return
    }

    // IPv4: 接受字符串 "192.168.1.1"，转换为4字节网络序
    if (valueType === 'ipv4') {
      const ipString = String(value)
      const parts = ipString.split('.')
      if (parts.length === 4) {
        parts.forEach((part, index) => {
          const octet = parseInt(part, 10) || 0
          dataView.setUint8(byteOffset + index, Math.max(0, Math.min(255, octet)))
        })
      } else {
        // 默认IP: 0.0.0.0
        dataView.setUint32(byteOffset, 0, false) // 网络序（大端序）
      }
      return
    }



  const numericValue = Number(value) || 0

  // 根据字段类型写入对应格式的数据（使用小端序）
  switch (valueType) {
    case 'u8':
      dataView.setUint8(byteOffset, numericValue)
      break
    case 's8':
      dataView.setInt8(byteOffset, numericValue)
      break
    case 'u16':
      dataView.setUint16(byteOffset, numericValue, true) // true = 小端序
      break
    case 's16':
      dataView.setInt16(byteOffset, numericValue, true)
      break
    case 'u32':
      dataView.setUint32(byteOffset, numericValue, true)
      break
    case 's32':
      dataView.setInt32(byteOffset, numericValue, true)
      break
    case 'f32':
      dataView.setFloat32(byteOffset, numericValue, true)
      break
    case 'hex16':
      // 处理十六进制字符串输入（如 "0xE8" 或 "E8"）
      let hexValue = 0
      if (typeof value === 'string') {
        const cleanHex = value.replace(/^0x/i, '') // 移除 0x 前缀
        hexValue = parseInt(cleanHex, 16) || 0
      } else {
        hexValue = Number(value) || 0
      }
      dataView.setUint16(byteOffset, hexValue, true) // 小端序
      break

    default:
      // 处理字符串类型 (如: str16, str20, str32)
      if (valueType.startsWith('str')) {
        const strByteLength = parseInt(valueType.replace('str', ''))
        const stringValue = String(value || '')

        // 将字符串转换为ASCII字节并写入缓冲区
        for (let i = 0; i < strByteLength; i++) {
          const charCode = i < stringValue.length ? stringValue.charCodeAt(i) : 0
          dataView.setUint8(byteOffset + i, charCode)
        }
      } else {
        // 默认按16位无符号整数处理
        dataView.setUint16(byteOffset, numericValue, true)
      }
      break
  }
}

/**
 * 通用参数数据序列化函数
 * 将参数对象转换为可发送给设备的十六进制字符串，适用于所有遥调数据类型
 * @param {Object} parameterDataFrame - 包含参数数据的对象
 * @param {Array} fieldDefinitionTable - 字段定义表（如 SYS_BASE_PARAM_R）
 * @param {number} startByteOffset - 起始字节偏移量
 * @param {number} registerCount - 寄存器数量（每个寄存器2字节）
 * @param {string} logPrefix - 日志前缀（如 '[useSysBaseParam]'）
 * @param {string} dataTypeName - 数据类型名称（如 '系统基本参数'）
 * @returns {string|null} 序列化后的十六进制字符串或null（失败时）
 */
export function serializeParameterData(parameterDataFrame, fieldDefinitionTable, startByteOffset, registerCount, logPrefix, dataTypeName) {
  if (!parameterDataFrame) {
    console.warn(`${logPrefix} 序列化失败：参数数据为空`)
    return null
  }
  
  try {
    // 创建用于存储序列化数据的缓冲区
    const totalByteLength = registerCount * 2 // 每个寄存器占2字节
    const serializationBuffer = new ArrayBuffer(totalByteLength)
    const bufferDataView = new DataView(serializationBuffer)
    let currentBufferOffset = 0
    const endByteOffset = startByteOffset + totalByteLength
    let debugSkipFilledBytes = 0
    const debugSkipSegments = []
    // 遍历参数表定义，找到目标范围内的字段
    let fieldByteOffset = 0
    let matchedParameterFields = []
    let skippedFields = []
    let includedFields = []
    
    for (let fieldIndex = 0; fieldIndex < fieldDefinitionTable.length; fieldIndex++) {
      const parameterField = fieldDefinitionTable[fieldIndex]
      const fieldElementCount = parameterField.count || 1
      const singleFieldByteSize = getParameterFieldByteSize(parameterField.type)
      const totalFieldByteSize = fieldElementCount * singleFieldByteSize
      // 检查当前字段是否在目标序列化范围内
      if (fieldByteOffset + totalFieldByteSize <= startByteOffset) {
        // 字段完全在目标范围之前，跳过
        skippedFields.push(`${parameterField.key}(${fieldByteOffset}-${fieldByteOffset + totalFieldByteSize - 1})`)
        // 只有非bits字段才累加字节偏移
        if (parameterField.type !== 'bits' && parameterField.type !== 'bit') {
          fieldByteOffset += totalFieldByteSize
        }
        continue
      }
      if (fieldByteOffset >= startByteOffset + totalByteLength) {
        // 字段完全在目标范围之后，停止遍历
        break
      }
      
      // 字段与目标范围有重叠，需要处理
      if (parameterField.type.startsWith('skip')) {
        // 处理跳过字段（数据对齐用的占位字段）
        const skipByteCount = totalFieldByteSize
        // 在目标范围内填充零字节
        let filledHere = 0
        for (let byteIndex = 0; byteIndex < skipByteCount; byteIndex++) {
          const absoluteBytePosition = fieldByteOffset + byteIndex
          if (absoluteBytePosition >= startByteOffset &&
              absoluteBytePosition < endByteOffset &&
              currentBufferOffset < serializationBuffer.byteLength) {
            bufferDataView.setUint8(currentBufferOffset, 0)
            currentBufferOffset++
            filledHere++
          }
        }
        if (filledHere > 0) {
          debugSkipFilledBytes += filledHere
          debugSkipSegments.push({
            fieldKey: parameterField.key || '(skip)',
            start: Math.max(fieldByteOffset, startByteOffset),
            bytes: filledHere
          })
        }
        fieldByteOffset += skipByteCount
        continue
      }
      
      const parameterKey = parameterField.key
      if (!parameterKey) {
        // 只有非bits字段才累加字节偏移
        if (parameterField.type !== 'bits' && parameterField.type !== 'bit') {
          fieldByteOffset += totalFieldByteSize
        }
        continue
      }

      // 跳过bits字段的独立序列化，它们的值已经合并到父字段中
      if (parameterField.type === 'bits' || parameterField.type === 'bit') {
        continue
      }
      // 处理实际的参数字段
      if (fieldElementCount > 1) {
        // 数组类型参数
        const parameterArray = parameterDataFrame[parameterKey] || []
        for (let elementIndex = 0; elementIndex < fieldElementCount; elementIndex++) {
          const elementByteOffset = fieldByteOffset + elementIndex * singleFieldByteSize
          if (elementByteOffset >= startByteOffset &&
              elementByteOffset + singleFieldByteSize <= startByteOffset + totalByteLength &&
              currentBufferOffset + singleFieldByteSize <= serializationBuffer.byteLength) {
            const elementValue = parameterArray[elementIndex] || 0
            // 序列化时需要反向缩放，将UI显示值转换为设备原始值
            const deviceValue = parameterField.scale && parameterField.scale > 1
              ? Math.round(elementValue * parameterField.scale)
              : elementValue
            writeParameterFieldValue(bufferDataView, currentBufferOffset, parameterField.type, deviceValue)
            currentBufferOffset += singleFieldByteSize
            matchedParameterFields.push(`${parameterKey}[${elementIndex}]=${elementValue}`)
            includedFields.push(`${parameterKey}[${elementIndex}]`)
          }
        }
      } else {
        // 单值类型参数
        if (fieldByteOffset >= startByteOffset &&
            fieldByteOffset + singleFieldByteSize <= startByteOffset + totalByteLength &&
            currentBufferOffset + singleFieldByteSize <= serializationBuffer.byteLength) {

          let parameterValue = parameterDataFrame[parameterKey] || 0

          // 特殊处理：如果当前字段有bits子字段，需要合并bits值
          const bitsFields = fieldDefinitionTable.filter(field =>
            field.bitsOf === parameterKey && (field.type === 'bit' || field.type === 'bits')
          )

          if (bitsFields.length > 0) {

            // 从bits字段重新构建父字段的值
            let reconstructedValue = 0

            for (const bitsField of bitsFields) {
              const bitsKey = bitsField.key
              const bitsValue = parameterDataFrame[bitsKey]

              if (bitsValue !== undefined && bitsValue !== null) {
                let rawValue

                // 处理不同的bits值格式
                if (typeof bitsValue === 'object' && bitsValue.raw !== undefined) {
                  // 格式: {raw: 1, txt: "存在"}
                  rawValue = bitsValue.raw
                } else if (typeof bitsValue === 'number') {
                  // 格式: 1
                  rawValue = bitsValue
                } else if (typeof bitsValue === 'boolean') {
                  // 格式: true/false
                  rawValue = bitsValue ? 1 : 0
                } else {
                  // 其他格式，尝试转换为数字
                  rawValue = Number(bitsValue) || 0
                }

                // 将bits值设置到对应的bit位置
                const bitPosition = bitsField.bit || 0
                const bitLength = bitsField.len || 1
                const bitMask = ((1 << bitLength) - 1) << bitPosition

                // 清除目标位置的原有值，然后设置新值
                reconstructedValue = (reconstructedValue & ~bitMask) | ((rawValue & ((1 << bitLength) - 1)) << bitPosition)

                console.log(`${logPrefix} 设置 ${bitsKey}=${rawValue} 到bit${bitPosition}(len=${bitLength}), 当前值: 0x${reconstructedValue.toString(16)}`)
              }
            }

            parameterValue = reconstructedValue
            console.log(`${logPrefix} ${parameterKey} 最终合并值: ${parameterValue} (0x${parameterValue.toString(16)})`)
          }

          // 序列化时需要反向缩放，将UI显示值转换为设备原始值
          const deviceValue = parameterField.scale && parameterField.scale > 1
            ? Math.round(parameterValue * parameterField.scale)
            : parameterValue
          writeParameterFieldValue(bufferDataView, currentBufferOffset, parameterField.type, deviceValue)
          currentBufferOffset += singleFieldByteSize
          matchedParameterFields.push(`${parameterKey}=${parameterValue}`)
        }
      }

      // 只有非bits字段才累加字节偏移
      if (parameterField.type !== 'bits' && parameterField.type !== 'bit') {
        fieldByteOffset += totalFieldByteSize
      }
    }
    
    // 将缓冲区转换为十六进制字符串
    const resultHexString = Array.from(new Uint8Array(serializationBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
    // 序列化调试：统计写入情况（包括 skip 填充与尾部自动 0）
    return resultHexString
    
  } catch (error) {
    console.error(`${logPrefix} ${dataTypeName}序列化失败:`, error)
    return null
  }
}

/**
 * 通用默认参数数据创建函数
 * 根据字段定义表初始化所有参数的默认值，适用于所有遥调数据类型
 * @param {Array} fieldDefinitionTable - 字段定义表（如 SYS_BASE_PARAM_R）
 * @param {string} logPrefix - 日志前缀（如 '[useSysBaseParam]'）
 * @returns {Object} 包含所有参数默认值的对象
 */
export function createDefaultParameterData(fieldDefinitionTable, logPrefix) {
  const defaultParameterData = {}

  // 遍历参数表定义
  for (const parameterField of fieldDefinitionTable) {
    // 跳过无效键或以 `_skip` 开头的字段（这些是数据对齐用的占位字段）
    if (parameterField.key && !parameterField.key.startsWith('_skip')) {
      // 判断是否为数组类型参数
      if (parameterField.count && parameterField.count > 1) {
        // 数组类型参数：创建指定长度的零值数组（保持原有逻辑，避免影响数据解析）
        defaultParameterData[parameterField.key] = new Array(parameterField.count).fill(0)
      } else {
        // 单值类型参数：根据类型设置合适的默认值
        if (parameterField.type === 'ipv4') {
          // IPv4 类型使用字符串格式
          defaultParameterData[parameterField.key] = '0.0.0.0'
        } else if (parameterField.type === 'hex16') {
          // hex16 类型使用字符串格式
          defaultParameterData[parameterField.key] = '0'
        } else if (parameterField.defaultValue !== undefined) {
          // 使用表定义中的默认值
          defaultParameterData[parameterField.key] = parameterField.defaultValue
        } else {
          // 其他类型使用数字0
          defaultParameterData[parameterField.key] = 0
        }
      }
    }
  }

  return defaultParameterData
}

/**
 * 通用参数读取响应解析函数
 * 处理从设备返回的读取数据，包括成功和错误情况，适用于所有遥调数据类型
 * @param {Object} mqttMessage - MQTT消息对象
 * @param {string} logPrefix - 日志前缀（如 '[useSysBaseParam]'）
 * @param {string} dataTypeName - 数据类型名称（如 '系统基本参数'）
 * @returns {Object|null} 解析后的数据结构或null
 */
export function parseParameterReadResponse(mqttMessage, logPrefix, dataTypeName) {
  const { blockId, clusterId, data } = mqttMessage
  
  if (!data) {
    console.warn(`${logPrefix} 收到空的读取响应数据`, mqttMessage)
    return null
  }
  
  const deviceFrameKey = `${blockId}-${clusterId}`
  
  // 检查是否为错误响应（错误响应包含错误代码）
  if (data.code !== undefined) {
    // 统一使用主码表文本（优先设备自带 message）
    const code = Number(data.code)
    const errorDescription = data.message || ERROR_CODES[code] || '未知错误'
    console.error(`${logPrefix} ${dataTypeName}读取错误 ${deviceFrameKey}:`, errorDescription, `(错误代码: 0x${data.code.toString(16).toUpperCase()})`)
    return {
      frameKey: deviceFrameKey,
      blockId,
      clusterId,
      result: {
        error: true,
        code: data.code,
        message: data.message || errorDescription,
        type: 'read'
      }
    }
  }
  
  // 计算实际参数数量：如果data是数组（分类结构），则统计所有分类中的参数总数
  // 对于出厂校正参数，排除"预留"分类的参数
  const paramCount = Array.isArray(data)
    ? data.reduce((total, section) => {
        // 跳过预留分类的参数统计
        if (section.class === '预留') return total
        return total + (section.element ? section.element.length : 0)
      }, 0)
    : Object.keys(data).length

  // console.log(`${logPrefix} 成功解析${dataTypeName}读取数据 ${deviceFrameKey}`, paramCount, '个参数')
  
  return {
    frameKey: deviceFrameKey,
    blockId,
    clusterId,
    data
  }
}

/**
 * 通用参数写入响应解析函数
 * 处理参数下发后设备返回的响应，包括成功和失败情况，适用于所有遥调数据类型
 * @param {Object} mqttMessage - MQTT消息对象
 * @param {string} logPrefix - 日志前缀（如 '[useSysBaseParam]'）
 * @param {string} dataTypeName - 数据类型名称（如 '系统基本参数'）
 * @returns {Object} 解析后的响应结构
 */
export function parseParameterWriteResponse(mqttMessage, logPrefix, dataTypeName) {
  const { blockId, clusterId, data } = mqttMessage
  const deviceFrameKey = `${blockId}-${clusterId}`
  
  console.log(`${logPrefix} 解析${dataTypeName}写入响应 ${deviceFrameKey}:`, data)
  
  // 检查写入是否成功
  if (data && data.code !== undefined) {
    const code = Number(data.code)
    const isWriteSuccessful = code === 0xE0
    const responseDescription = data.message || ERROR_CODES[code] || '未知错误'
    
    return {
      frameKey: deviceFrameKey,
      blockId,
      clusterId,
      result: {
        success: isWriteSuccessful,
        error: !isWriteSuccessful,
        code: data.code,
        message: data.message || responseDescription
      }
    }
  }
  
  // 如果没有明确的错误代码，视为成功
  return {
    frameKey: deviceFrameKey,
    blockId,
    clusterId,
    result: {
      success: true,
      error: false
    }
  }
}

/**
 * 通用遥调核心功能 - 所有遥调页面的基础功能提供者
 * @param {Object} remoteControlConfig - 遥调配置对象，包含数据源、参数分类、序列化函数等配置
 * @param {Object} toastService - PrimeVue toast消息服务，用于用户提示
 * @param {Object} options - 选项配置
 * @param {string} options.selectorMode - 选择器模式：'cluster' | 'block'
 * @param {Object} options.defaultData - 默认数据配置（可选）
 * @returns {Object} 遥调核心功能对象，包含状态数据和操作函数
 */
export function useRemoteControlCore(remoteControlConfig, toastService, options = {}) {
  // 解构选项配置，保持向后兼容
  const { selectorMode = 'cluster', defaultData = null } = options
  
  // 添加翻译功能
  const { t, te } = useI18n()
  
  // 翻译参数分类名称的函数
  function translateParameterClassName(className, classConfiguration = null) {
    if (!className) return className
    
    // 如果提供了classConfiguration且有nameKey，直接使用nameKey翻译
    if (classConfiguration && classConfiguration.nameKey) {
      return t(classConfiguration.nameKey)
    }
    
    // 尝试从各个页面的parameterClasses中查找翻译
    const possiblePaths = [
      'clusterConfigParam.parameterClasses',
      'clusterAlarmThreshold.parameterClasses', 
      'clusterSOXParam.parameterClasses',
      'clusterCalibration.parameterClasses',
      'blockConfigParam.parameterClasses',
      'blockAlarmThresholdPage.parameterClasses'
    ]
    
    for (const path of possiblePaths) {
      const fullPath = `${path}.${className}`
      if (te(fullPath)) {
        return t(fullPath)
      }
    }
    
    // 如果找不到翻译，返回原始名称
    return className
  }

  // ========== 方案一：参数表预分组优化 ==========
  // 在函数初始化时就对参数表进行预分组，避免运行时重复filter操作
  // ========== 性能优化：一次性预分组参数字段 ==========
  const preGroupedParameterFields = (() => {
    const allFields = remoteControlConfig.dataSource.parameterFields || []
    const groupedByClass = {}

    // 按分类预先分组所有参数（一次性计算，避免computed开销）
    allFields.forEach(field => {
      const className = field.class
      if (!groupedByClass[className]) {
        groupedByClass[className] = []
      }
      // 将参数字段标记为非响应式，减少Vue跟踪开销
      groupedByClass[className].push(markRaw(field))
    })

    // 将整个结果标记为非响应式，避免Vue深度跟踪
    return markRaw({
      allFields: markRaw(allFields),
      groupedByClass: markRaw(groupedByClass),
      totalCount: allFields.length
    })
  })()
  
  
  // 选择器适配：根据模式读取不同的全局选择状态
  let selectedKeyRef
  let optionsRef
  let ensureOption
  let getWriteTargetsRef
  let getDisplayNameFunc

  if (selectorMode === 'cluster') {
    const { clusterOptions, ensureClusterOption, selectedCluster } = useClusterSelect()
    const clusterStore = useClusterStore()
    selectedKeyRef = selectedCluster
    optionsRef = clusterOptions
    ensureOption = ensureClusterOption
    getWriteTargetsRef = computed(() => clusterStore.selectedClustersForWrite)
    getDisplayNameFunc = clusterStore.getClusterDisplayName
  } else {
    const { blockOptions, ensureBlockOption, selectedBlock } = useBlockSelect()
    const blockStore = useBlockStore()
    selectedKeyRef = selectedBlock
    optionsRef = blockOptions
    ensureOption = ensureBlockOption
    getWriteTargetsRef = computed(() => blockStore.selectedBlocksForWrite)
    getDisplayNameFunc = blockKey => blockStore.getBlockDisplayName(blockKey)
  }

  // 模板是否需要设备选择（检测是否包含 {block}/{cluster} 占位符）
  function templateNeedsDevice(template) {
    if (!template || typeof template !== 'string') return false
    return template.includes('{block}') || template.includes('{cluster}')
  }

  // 抽象：从选择键解析出设备地址（blockNumber, clusterNumber）
  function getSelectedAddress() {
    // 如果未选择，尝试使用 dataSource.defaultAddress 作为回退
    const defaultAddress = remoteControlConfig?.dataSource?.defaultAddress
    if (!selectedKeyRef || typeof selectedKeyRef.value === 'undefined' || selectedKeyRef.value === null || selectedKeyRef.value === '') {
      if (defaultAddress && typeof defaultAddress.blockNumber === 'number') {
        return { blockNumber: defaultAddress.blockNumber, clusterNumber: defaultAddress.clusterNumber ?? (selectorMode === 'cluster' ? 1 : 0) }
      }
      return null
    }
    const key = selectedKeyRef.value
    if (!key) return null
    if (selectorMode === 'cluster') {
      const parts = String(key).split('-')
      if (parts.length !== 2) return null
      const ids = { blockNumber: Number(parts[0]), clusterNumber: Number(parts[1]) }
      return ids
    }
    // block 模式：key 形如 'block1'
    const blockNumber = Number(String(key).replace('block', ''))
    const ids = { blockNumber, clusterNumber: 0 }
    return ids
  }

  // 抽象：内部使用的设备键（用于 map 存储、frameKey 等）
  function deviceKeyBuilder(ids) {
    return selectorMode === 'cluster'
      ? `${ids.blockNumber}-${ids.clusterNumber}`
      : `${ids.blockNumber}`
  }

  // 抽象：构造 MQTT 主题
  function topicBuilder(template, ids, dataType) {
    let t = template || ''
    if (t.includes('{block}')) t = t.replace('{block}', String(ids.blockNumber))
    if (t.includes('{cluster}')) {
      if (selectorMode === 'cluster') t = t.replace('{cluster}', String(ids.clusterNumber))
      else t = t.replace('{cluster}', '0') // 堆模式无簇
    }
    if (dataType && t.includes('{dataType}')) t = t.replace('{dataType}', dataType)
    return t
  }

  // 抽象：将入站数据标准化为 { frameKey, blockId, clusterId, data }
  function normalizeReadData(incoming) {
    if (!incoming) return incoming
    // 始终以 blockId/clusterId 重新计算 frameKey，忽略入站的 frameKey，保证存取键一致
    const blockId = incoming.blockId
    const clusterId = incoming.clusterId ?? 0
    const frameKey = clusterId && clusterId > 0 ? `${blockId}-${clusterId}` : String(blockId)
    return { frameKey, blockId, clusterId, data: incoming.data }
  }
  
  // 数据存储 - 分别存储原始数据和用户编辑数据，按数据源名称分组
  // 使用shallowRef减少深度响应式跟踪，提升性能
  const originalDataMap = shallowRef({})        // 存储从设备读取的原始数据，作为数据基准，不会被用户编辑影响
  const editableDataMap = shallowRef({})        // 存储用户编辑的数据，支持修改和回滚，实际显示在界面上的数据
  
  // 读取状态管理 - 控制数据读取的开关和定时器
  const isCurrentlyReading = ref(false)  // 是否正在进行数据读取，用于控制按钮状态和防止重复操作
  const readingIntervalTimer = ref(null) // 定时读取的计时器引用，用于每2秒自动读取数据
  let isFirstReadAfterStart = false      // 标记是否是开始读取后的第一次，用于控制首次读取成功弹窗
  let isFirstErrorAfterStart = false     // 标记是否是开始读取后的第一次错误，用于控制首次错误弹窗

  // 批量更新优化 - 减少频繁的响应式触发
  let pendingUpdates = new Map()         // 待处理的参数更新
  let updateScheduled = false            // 是否已安排更新

  // 性能优化：参数列表计算缓存和版本号管理
  const parameterListCache = new Map()  // 缓存计算结果
  let lastCacheKey = null               // 上次缓存的键

  // 数据版本号管理（替代JSON.stringify）
  const dataVersionMap = ref({})

  // 监听数据变化，更新版本号
  watch([originalDataMap, editableDataMap], () => {
    Object.keys(originalDataMap.value).forEach(key => {
      dataVersionMap.value[key] = (dataVersionMap.value[key] || 0) + 1
    })
    Object.keys(editableDataMap.value).forEach(key => {
      dataVersionMap.value[key] = (dataVersionMap.value[key] || 0) + 1
    })
  }, { deep: true })
  
  // 是否启用无分类模式：当页面希望“整表显示，不按class分组”时使用
  const noClassMode = remoteControlConfig?.dataSource?.noClassMode === true

  // 预计算整表长度（用于无分类模式与整表下发）
  const totalTableByteLengthForAllFields = computed(() => {
    return preGroupedParameterFields.allFields.reduce((sum, field) => {
      const count = field.count || 1
      return sum + (getParameterFieldByteSize(field.type) * count)
    }, 0)
  })

  // 当前选中的参数分类 - 控制页面显示哪个分类的参数
  const currentSelectedClass = ref(
    remoteControlConfig.dataSource.parameterClasses[0]
      || (noClassMode ? { name: '全部参数', byteOffset: 0, byteLength: totalTableByteLengthForAllFields.value } : null)
  )
  // 分类示例: {name: "空调阈值", byteOffset: 210, byteLength: 12}
  
  
  
  // ========== 性能优化：预计算所有分类的默认值缓存 ==========
  const precomputedClassDefaults = (() => {
    if (!defaultData) return {}

    const result = {}
    const allFields = remoteControlConfig.dataSource.parameterFields || []

    // 一次性预计算所有分类的默认值，避免运行时重复计算
    allFields.forEach(field => {
      const className = field.class
      if (!result[className]) {
        result[className] = {}
      }
      if (defaultData[field.key] !== undefined) {
        result[className][field.key] = defaultData[field.key]
      }
    })

    return markRaw(result) // 标记为非响应式，避免Vue跟踪开销
  })()

  // ========== 性能优化：分类级默认值计算（简化为查表操作） ==========
  const currentClassDefaults = computed(() => {
    if (!currentSelectedClass.value) return {}
    // 直接查表获取预计算的默认值，避免运行时计算开销
    return precomputedClassDefaults[currentSelectedClass.value.name] || {}
  })

    //  获取当前分类下的所有参数列表 - 核心数据处理逻辑
    // 作用：根据当前选中的分类，筛选并组合参数定义、当前值、原始值等信息
    // 返回：包含完整参数信息的数组，供表格组件使用
  const currentClassParameterList = computed(() => {
    if (!currentSelectedClass.value) return [] // 如果没有选中分类，返回空数组

    const dataSourceName = remoteControlConfig.dataSource.name // 如 "SYS_BASE_PARAM"

    // 根据当前选择构建存储键（簇: 1-1；堆: 1）
    const ids = getSelectedAddress()
    const currentKey = ids
      ? deviceKeyBuilder(ids)
      : (selectorMode === 'cluster' ? '1-1' : '1')
    const clusterDataKey = `${dataSourceName}_${currentKey}`

    // 性能优化：使用版本号构建缓存键，避免JSON.stringify
    const className = currentSelectedClass.value.name
    const dataVersion = dataVersionMap.value[clusterDataKey] || 0
    const hiddenFieldsHash = (currentSelectedClass.value.hiddenFields || []).join(',')
    const fullCacheKey = `${dataSourceName}_${currentKey}_${className}_${hiddenFieldsHash}_v${dataVersion}`

    // 获取当前簇的原始数据和编辑数据
    const originalData = originalDataMap.value[clusterDataKey] || {}
    const editableData = editableDataMap.value[clusterDataKey] || {}

    // 如果缓存存在且有效，直接返回缓存结果
    if (parameterListCache.has(fullCacheKey) && lastCacheKey === fullCacheKey) {
      return parameterListCache.get(fullCacheKey)
    }

    // 清理旧缓存（保持缓存大小合理）
    if (parameterListCache.size > 10) {
      parameterListCache.clear()
    }

    
    // 使用预分组的参数数据，避免运行时filter操作
    const startTime = performance.now()
    let classFields
    if (noClassMode) {
      // 无分类模式：使用所有未隐藏的字段
      classFields = preGroupedParameterFields.allFields.filter(field => field.hide !== true)
    } else {
      // 有分类模式：直接使用预分组的结果
      const className = currentSelectedClass.value.name
      classFields = preGroupedParameterFields.groupedByClass[className] || []

      // 应用分类级别的隐藏字段过滤
      if (currentSelectedClass.value.hiddenFields?.length > 0) {
        classFields = classFields.filter(field =>
          !currentSelectedClass.value.hiddenFields.includes(field.key) && field.hide !== true
        )
      } else {
        classFields = classFields.filter(field => field.hide !== true)
      }
    }

    const filterTime = performance.now()
    // console.log(`[优化验证] ${dataSourceName} 分类"${currentSelectedClass.value?.name}"参数筛选: ${classFields.length}个参数, 耗时${(filterTime - startTime).toFixed(2)}ms`)

    // 为每个参数添加当前值和原始值
    // 性能优化：只返回渲染必需的字段，避免...parameterField全量复制
    const result = classFields.map(parameterField => ({
      key: parameterField.key,
      label: parameterField.label,
      unit: parameterField.unit || '',
      scale: parameterField.scale || 1,
      type: parameterField.type || 'number',
      class: parameterField.class || '',
      clusterRange: parameterField.clusterRange, // 修复：添加clusterRange属性，用于簇使能配置
      remarks: parameterField.remarks || '',     // 添加remarks属性
      // 当前值：优先使用用户编辑的数据，否则使用原始数据；避免 undefined 回落为 0 导致“01/0”现象
      currentValue: (editableData[parameterField.key] !== undefined
        ? editableData[parameterField.key]
        : (originalData[parameterField.key] !== undefined
          ? originalData[parameterField.key]
          : (currentClassDefaults.value[parameterField.key] !== undefined
            ? currentClassDefaults.value[parameterField.key]
            : null))),
      // 原始值：从设备读取的未修改数据
      originalValue: originalData[parameterField.key] ?? null
      }))

    // 缓存计算结果
    parameterListCache.set(fullCacheKey, result)
    lastCacheKey = fullCacheKey

    return result
  })
  
  const allAvailableClasses = computed(() => {
    return remoteControlConfig.dataSource.parameterClasses || []
    // 获取所有可用的参数分类列表,提供分类切换按钮的数据源 如 ["BMU配置", "空调阈值", "通信设置" ...]
  })
    
  /**
   * 切换到指定的参数分类
   * 作用：用户点击分类按钮时，切换显示不同分类的参数
   * @param {string} className - 要切换到的分类名称，如 "空调阈值"
   */
  function switchToParameterClass(className) {
    // 在所有分类中查找目标分类
    const targetClass = allAvailableClasses.value.find(classItem => classItem.name === className)
    if (targetClass) {
      currentSelectedClass.value = targetClass // 更新当前选中分类
      // console.log(`[RemoteControlCore] 切换到参数分类: ${className}`)

      // 调试：输出调用栈，找出是谁触发了分类切换
      // console.log(`[调试] 分类切换调用栈:`)
      // console.trace()
    }
  }
  
  // ================== 数据读取功能 ==================
  // ========== 单topic读取逻辑（兼容BaseParam页面） ==========
  function startParameterReading() {
    const needDevice = templateNeedsDevice(remoteControlConfig.dataSource.readTopicTemplate)
    const ids = getSelectedAddress()
    if (needDevice && !ids) {
      toastService.add({
        severity: 'warn',
        summary: t('toast.remoteControl.noDeviceDetected'),
        detail: t('toast.remoteControl.selectDeviceFirst'),
        life: 3000
      })
     
      return
    }
    isCurrentlyReading.value = true // 设置读取状态为true，按钮变为"停止读取"
    isFirstReadAfterStart = true    // 标记这是开始读取后的第一次
    isFirstErrorAfterStart = true   // 标记这是开始读取后的第一次错误
    if (ids) {
      // console.log(`[RemoteControlCore] 开始单topic读取参数数据: b${ids.blockNumber}${selectorMode==='cluster'?`-c${ids.clusterNumber}`:''}`)
    } else {
      // console.log('[RemoteControlCore] 开始单topic读取参数数据: standalone 固定topic')
    }
    // 立即发送一次读取请求，不等待定时器（无参调用，使用当前分类）
    sendParameterReadRequest()
    // 设置定时读取（每2秒一次），保持数据实时更新
    readingIntervalTimer.value = setInterval(sendParameterReadRequest, 2000)
  }

  // ========== 修正：支持单topic和多topic读取 ==========
  function sendParameterReadRequest(topic) {
    const readTemplate = remoteControlConfig.dataSource.readTopicTemplate
    const needDevice = templateNeedsDevice(readTemplate)
    const ids = needDevice ? getSelectedAddress() : null
    if (needDevice && !ids) return

    // 构建MQTT主题
    let mqttTopic = readTemplate

    if (topic) {
      mqttTopic = topicBuilder(mqttTopic, ids, topic)
      // console.log(`[RemoteControlCore] 多topic读取: ${topic} → ${mqttTopic}`)
    } else if (mqttTopic.includes('{dataType}') && remoteControlConfig.dataSource.getDataType) {
      const currentClassName = currentSelectedClass.value?.name || ''
      const dataType = remoteControlConfig.dataSource.getDataType(currentClassName)
      mqttTopic = topicBuilder(mqttTopic, ids, dataType)
      // console.log(`[RemoteControlCore] 单topic读取: ${dataType} (分类: ${currentClassName}) → ${mqttTopic}`)
    } else {
      mqttTopic = needDevice ? topicBuilder(mqttTopic, ids) : mqttTopic
    }
    // console.log(`[RemoteControlCore] 发送读取请求到: ${mqttTopic}`)
    window.electronAPI.mqttPublish(mqttTopic, 'ff')
      .catch(error => console.error('[RemoteControlCore] 读取请求发送失败:', error))
  }





  // ========== 新增：一次性多topic自动读取（不改变UI状态） ==========
  function autoReadMultiTopicOnce(topics) {
    const needDevice = templateNeedsDevice(remoteControlConfig.dataSource.readTopicTemplate)
    const ids = needDevice ? getSelectedAddress() : null
    if (needDevice && !ids) {
      // console.log('[RemoteControlCore] 自动读取跳过：未选择设备')
      return
    }

    // console.log(`[RemoteControlCore] 自动读取开始: ${topics.join(', ')}`)

    // 不改变isCurrentlyReading状态，保持UI按钮状态不变
    // 只读取一次，不启动定时器
    topics.forEach((topic, index) => {
      setTimeout(() => {
        // console.log(`[RemoteControlCore] 自动读取topic[${index}]: ${topic}`)
        sendParameterReadRequest(topic)
      }, index * 200) // 错开200ms，避免并发冲突
    })

    // console.log('[RemoteControlCore] 自动读取请求已发送')
  }

  // ========== 多topic并发读取方法 ==========
  function startMultiTopicReading(topics) {
    const ids = getSelectedAddress()
    if (!ids) {
      toastService.add({
        severity: 'warn',
        summary: t('toast.remoteControl.selectDevice'),
        detail: t('toast.remoteControl.selectDeviceToRead'),
        life: 3000
      })
      return
    }

    // console.log(`[RemoteControlCore] 开始多topic读取: ${topics.join(', ')}`)
    isCurrentlyReading.value = true;
    isFirstReadAfterStart = true;
    isFirstErrorAfterStart = true;

    // 先清除可能存在的定时器
    if (readingIntervalTimer.value) {
      clearInterval(readingIntervalTimer.value);
      readingIntervalTimer.value = null;
    }

    // 立即读取一次所有topic
    topics.forEach((topic, index) => {
      // console.log(`[RemoteControlCore] 立即读取topic[${index}]: ${topic}`)
      sendParameterReadRequest(topic);
    });

    // 设置定时读取（每2秒一次）
    readingIntervalTimer.value = setInterval(() => {
      topics.forEach((topic, index) => {
        // console.log(`[RemoteControlCore] 定时读取topic[${index}]: ${topic}`)
        sendParameterReadRequest(topic);
      });
    }, 2000);
  }

  function stopParameterReading() {
    // console.log('[RemoteControlCore] 停止读取参数数据')

    // 清除定时器
    if (readingIntervalTimer.value) {
      clearInterval(readingIntervalTimer.value)
      readingIntervalTimer.value = null
      console.log('[RemoteControlCore] 定时器已清除')
    }

    // 重置状态
    isCurrentlyReading.value = false // 设置读取状态为false，按钮变为"开始读取"
    isFirstReadAfterStart = false    // 停止时重置首次读取标记
    isFirstErrorAfterStart = false   // 停止时重置首次错误标记

    // console.log('[RemoteControlCore] 读取状态已重置')
  }

  
  // ================== 参数编辑功能 ==================
  
  /**
   * 更新指定参数的值
   * 作用：用户在输入框中修改参数值时调用，更新editableDataMap中的数据
   * @param {string} parameterKey - 参数的唯一标识键，如 "coolingStartTemp"
   * @param {*} newParameterValue - 参数的新值，如 280（对应28.0℃，已经经过scale处理）
   * @param {Object} options - 更新选项，支持 { immediate: true } 强制同步更新
   */
  function updateParameterValue(parameterKey, newParameterValue, options = {}) {
    const dataSourceName = remoteControlConfig.dataSource.name // 获取数据源名称
    const ids = getSelectedAddress()
    const currentKey = ids ? deviceKeyBuilder(ids) : (selectorMode === 'cluster' ? '1-1' : '1')
    const clusterDataKey = `${dataSourceName}_${currentKey}`

    //  关键场景使用同步更新，避免时序问题
    const needsImmediateUpdate = options.immediate ||
      dataSourceName === 'BLOCK_TIME_CFG' ||           // 设备时间设置
      dataSourceName === 'BLOCK_PORT_CFG' ||           // 端口配置（IP地址等）
      dataSourceName === 'BLOCK_COMMON_PARAM'          // 堆系统基本配置

    if (needsImmediateUpdate) {
      // 确保数据结构存在
      if (!editableDataMap.value[clusterDataKey]) {
        editableDataMap.value[clusterDataKey] = {}
      }

      // 同步更新，立即生效
      editableDataMap.value = {
        ...editableDataMap.value,
        [clusterDataKey]: {
          ...editableDataMap.value[clusterDataKey],
          [parameterKey]: newParameterValue
        }
      }

      return
    }

    // 其他场景继续使用异步批量更新（保持性能优化）

    // 将更新添加到待处理队列
    const updateKey = `${clusterDataKey}:${parameterKey}`
    pendingUpdates.set(updateKey, { clusterDataKey, parameterKey, newParameterValue })

    // 如果还没有安排更新，则在下一个tick中批量处理
    if (!updateScheduled) {
      updateScheduled = true
      nextTick(() => {
        // 批量应用所有待处理的更新
        const updatedClusters = new Map()

        pendingUpdates.forEach(({ clusterDataKey, parameterKey, newParameterValue }) => {
          if (!updatedClusters.has(clusterDataKey)) {
            updatedClusters.set(clusterDataKey, { ...editableDataMap.value[clusterDataKey] || {} })
          }
          updatedClusters.get(clusterDataKey)[parameterKey] = newParameterValue
        })

        // 一次性更新所有修改的簇数据
        const newEditableDataMap = { ...editableDataMap.value }
        updatedClusters.forEach((data, key) => {
          newEditableDataMap[key] = data
        })
        editableDataMap.value = newEditableDataMap

        // 清理状态
        pendingUpdates.clear()
        updateScheduled = false
      })
    }

    // console.log(`[RemoteControlCore] 参数更新 (设备${currentKey}): ${parameterKey} = ${newParameterValue}`)
  }
  
  
  /**
   * 获取用于输入框的参数值（考虑缩放）
   * 作用：将内部存储的原始数值转换为输入框显示的数值
   * @param {Object} parameterDefinition - 参数定义对象，包含scale缩放系数
   * @param {*} parameterValue - 内部存储的参数值
   * @returns {number} 适用于输入框显示的数值
   *
   * 示例：
   * - 内部存储: 350, scale: 10 -> 输入框显示: 35.0
   * - 内部存储: 3500, scale: 1000 -> 输入框显示: 3.500
   */
      function getParameterInputValue(parameterDefinition, parameterValue) {
      if (parameterValue === undefined || parameterValue === null) return 0

      // IPv4类型直接返回字符串，不转换为数值
      if (parameterDefinition.type === 'ipv4') {
        return parameterValue
      }

      // hex16类型直接返回字符串，不转换为数值
      if (parameterDefinition.type === 'hex16') {
        return parameterValue
      }

      // u16类型：处理簇使能配置（有 clusterRange 属性）
      if (parameterDefinition.type === 'u16' && parameterDefinition.clusterRange) {
        // 如果参数值已经是对象格式（包含enabledClusters），直接返回数组
        if (parameterValue && typeof parameterValue === 'object' && parameterValue.enabledClusters) {
          return parameterValue.enabledClusters
        }
        
        // 如果是数值格式，转换为簇使能数组
        const bitValue = Number(parameterValue) || 0
        const enabledClusters = []
        const [startCluster, endCluster] = parameterDefinition.clusterRange
        
        for (let i = 0; i < (endCluster - startCluster + 1); i++) {
          if (bitValue & (1 << i)) {
            const clusterNum = startCluster + i
            if (clusterNum <= endCluster) {
              enabledClusters.push(clusterNum)
            }
          }
        }
        return enabledClusters
      }

      // bits类型：处理位段数据
      if (parameterDefinition.type === 'bits') {
        if (parameterValue && typeof parameterValue === 'object' && parameterValue.raw !== undefined) {
          return parameterValue.raw
        }
        return Number(parameterValue) || 0
      }

      // 如果有缩放系数，进行缩放计算
    // if (parameterDefinition.scale && parameterDefinition.scale > 1) {
    //   const scaledValue = Number(parameterValue) / parameterDefinition.scale
    //   const decimalPlaces = getParameterDecimalPlaces(parameterDefinition)
    //   return Number(scaledValue.toFixed(decimalPlaces)) // 保留正确的小数位数
    // }

    return Number(parameterValue)
  }

  /**
   * 获取参数的小数位数（根据缩放系数自动计算）
   * 作用：根据参数的缩放系数自动确定应该显示几位小数
   * @param {Object} parameterDefinition - 参数定义对象
   * @returns {number} 应该显示的小数位数
   * 
   * 计算规则：
   * - scale=1: 0位小数 (整数)
   * - scale=10: 1位小数 (35.0)
   * - scale=100: 2位小数 (3.50)
   * - scale=1000: 3位小数 (3.500)
   */
  function getParameterDecimalPlaces(parameterDefinition) {
    if (!parameterDefinition.scale || parameterDefinition.scale === 1) return 0
    
    // 根据缩放系数计算小数位数
    // 将scale转为字符串，长度减1就是小数位数
    const scaleStr = parameterDefinition.scale.toString()
    return scaleStr.length - 1
  }
  
  /**
   * 设置输入框的值并转换为存储格式（考虑缩放）
   * 作用：将用户在输入框中输入的数值转换为内部存储格式
   * @param {Object} parameterDefinition - 参数定义对象，包含scale缩放系数
   * @param {number} inputValue - 用户在输入框中输入的数值
   * @returns {number} 转换后的内部存储数值
   *
   * 示例：
   * - 用户输入: 35.0, scale: 10 -> 内部存储: 350
   * - 用户输入: 3.500, scale: 1000 -> 内部存储: 3500
   */
      function setParameterInputValue(parameterDefinition, inputValue) {
      // IPv4类型直接返回字符串，不转换为数值
      if (parameterDefinition.type === 'ipv4') {
        return inputValue
      }

      // u16类型：处理簇使能配置（有 clusterRange 属性）
      if (parameterDefinition.type === 'u16' && parameterDefinition.clusterRange) {
        if (Array.isArray(inputValue)) {
          let bitValue = 0
          const [startCluster, endCluster] = parameterDefinition.clusterRange
          
          inputValue.forEach(clusterNum => {
            const bitIndex = clusterNum - startCluster // 相对于起始簇的偏移
            if (bitIndex >= 0 && bitIndex < (endCluster - startCluster + 1)) {
              bitValue |= (1 << bitIndex)
            }
          })
          return bitValue
        }
        return Number(inputValue) || 0
      }

      // bits类型：处理位段数据
      if (parameterDefinition.type === 'bits') {
        return Number(inputValue) || 0
      }

      // parseByTable已经进行了缩放处理，这里直接返回用户输入值，不再进行反向缩放
      return Number(inputValue)
  }
  
  // ================== 参数下发功能 ==================

  /**
   * 下发当前分类的所有参数到设备 - 支持批量下发
   * 作用：将用户编辑的参数打包序列化后发送给选中的所有设备
   */
  async function sendCurrentClassParameters() {
    // 参数检查：确保有选中的分类
    if (!currentSelectedClass.value) {
      toastService.add({
        severity: 'warn',
        summary: t('toast.remoteControl.selectParameterClass'),
        detail: t('toast.remoteControl.selectParameterClassFirst'),
        life: 3000
      })
      return
    }
    
    // 参数检查：读取期间不允许下发，防止数据冲突
    if (isCurrentlyReading.value) {
      toastService.add({ 
        severity: 'warn', 
        summary: t('toast.remoteControl.readingInProgress'), 
        detail: t('toast.remoteControl.stopReadingFirst'),
        life: 3000 
      })
      return
    }
    
    const clusterStore = useClusterStore() // 仍用于 toast 中获取显示名（簇模式）
    // 获取批量下发的目标集合（根据模式切换）
    let targetKeys = getWriteTargetsRef.value || []
    // 如果写入模板不包含 {block}/{cluster}，说明是固定topic（standalone），无需选择目标
    const writeTemplate = remoteControlConfig.dataSource.writeTopicTemplate
    const needDeviceForWrite = templateNeedsDevice(writeTemplate)
    if (!needDeviceForWrite) {
      targetKeys = ['__standalone__']
    }
    if (needDeviceForWrite && targetKeys.length === 0) {
      toastService.add({
        severity: 'warn',
        summary: t('toast.remoteControl.selectTarget'),
        detail: selectorMode === 'cluster' ? t('toast.remoteControl.selectTargetCluster') : t('toast.remoteControl.selectTargetBlock'),
        life: 3000
      })
      return
    }

    try {
      const dataSourceName = remoteControlConfig.dataSource.name
      const classConfiguration = currentSelectedClass.value
      const writeWholeTable = remoteControlConfig?.dataSource?.writeWholeTable === true
      // 显示正在下发状态
      toastService.add({
        severity: 'info',
        summary: t('toast.remoteControl.batchSendingParameters'),
        detail: t('toast.remoteControl.sendingToTargets', { className: translateParameterClassName(classConfiguration.name, classConfiguration), count: targetKeys.length }),
        life: 3000
      })
      
      //根据当前选中的簇获取数据进行下发
      const ids = getSelectedAddress()
      const currentKey = ids ? deviceKeyBuilder(ids) : 'unknown'
      const clusterDataKey = `${dataSourceName}_${currentKey}`
      
      // 获取当前分类对应的Topic和参数表
      let topicParameterFields = preGroupedParameterFields.allFields
      
      // 如果配置了getDataType函数，说明是多Topic架构，需要特殊处理
      if (remoteControlConfig.dataSource.getDataType) {
        const currentDataType = remoteControlConfig.dataSource.getDataType(classConfiguration.name)
        // console.log(`[RemoteControlCore] 检测到多Topic架构，当前分类属于: ${currentDataType}`)
        
        // 对于告警阈值，需要从useAlarmThreshold获取对应Topic的参数表
        if (dataSourceName === 'ALARM_THRESHOLD') {
          // 通过序列化函数的签名可以判断这是告警阈值
          // 需要从全局参数表中筛选出属于当前Topic的参数
          const allFields = preGroupedParameterFields.allFields
          topicParameterFields = allFields.filter(field => {
            // 简单的Topic判断逻辑 - 可以根据实际情况优化
            if (currentDataType === 'cluster_dns_param') {
              return ['簇端电压', '电流', '绝缘电阻', '簇端温度'].includes(field.class)
            } else if (currentDataType === 'pack_dns_param') {
              return ['BMU电压', 'BMU温度', '接插件温度'].includes(field.class)
            } else if (currentDataType === 'cell_dns_param') {
              return ['单体电压', '单体温度', '单体SOC', '单体SOH'].includes(field.class)
            }
            return false
          })
          // console.log(`[RemoteControlCore] 筛选出${currentDataType}的参数字段数量: ${topicParameterFields.length}`)
        }
      }
      
      // 第1步：收集需要下发的参数数据
      const parameterDataFrame = {}
      if (writeWholeTable) {
        // 整表下发：遍历所有字段，尽量用可用的数据填充
        topicParameterFields
          .forEach(field => {
            if (!field || !field.key || field.key.startsWith('_skip')) return
            const editableData = editableDataMap.value[clusterDataKey] || {}
            const originalData = originalDataMap.value[clusterDataKey] || {}
            let finalValue = editableData[field.key]
            if (finalValue === undefined) finalValue = originalData[field.key]
            if (finalValue === undefined && field.class === classConfiguration.name) {
              const uiParameter = currentClassParameterList.value.find(p => p.key === field.key)
              if (uiParameter && uiParameter.currentValue !== undefined) {
                finalValue = uiParameter.currentValue
              }
            }
            if (finalValue !== undefined) {
              parameterDataFrame[field.key] = finalValue
            }
          })
      } else {
        // 按分类下发：仅收集当前分类
        topicParameterFields
          .filter(field => field.class === classConfiguration.name)
          .forEach(field => {
            const editableData = editableDataMap.value[clusterDataKey] || {}
            const originalData = originalDataMap.value[clusterDataKey] || {}
            let finalValue = editableData[field.key] !== undefined
              ? editableData[field.key]
              : originalData[field.key]
            if (finalValue === undefined) {
              const uiParameter = currentClassParameterList.value.find(p => p.key === field.key)
              if (uiParameter && uiParameter.currentValue !== undefined) {
                finalValue = uiParameter.currentValue
                console.log(`[ParameterFallback] 使用UI层数据 ${field.label || field.key}: ${finalValue}`)
              }
            }
            parameterDataFrame[field.key] = finalValue
          })
      }
      
      console.log(`\n=== 收集到的参数数据 (设备${currentKey}) ===`)
      console.log(`参数数据框架:`, parameterDataFrame)
      console.log(`参数数量: ${Object.keys(parameterDataFrame).length}`)

      // 第2步：序列化参数数据
      let startByteOffset
      let registerCount
      if (writeWholeTable) {
        // 计算整个表的字节长度
        const totalTableByteLength = preGroupedParameterFields.allFields
          .reduce((sum, field) => {
            const count = field.count || 1
            return sum + (getParameterFieldByteSize(field.type) * count)
          }, 0)
        startByteOffset = 0
        registerCount = Math.ceil(totalTableByteLength / 2)
      } else {
        registerCount = Math.ceil(classConfiguration.byteLength / 2)
        startByteOffset = classConfiguration.byteOffset
      }

      const serializedHexData = remoteControlConfig.dataSource.parameterSerializer(
        parameterDataFrame,
        startByteOffset,
        registerCount,
        classConfiguration.name  // 传递分类名称
      )
      
      if (!serializedHexData) {
        throw new Error('参数数据序列化失败')
      }
      
      // 第3步：构建MQTT payload
      const offsetBuffer = new ArrayBuffer(2)
      const lengthBuffer = new ArrayBuffer(2)
      const offsetDataView = new DataView(offsetBuffer)
      const lengthDataView = new DataView(lengthBuffer)

      offsetDataView.setUint16(0, startByteOffset, true)
      lengthDataView.setUint16(0, registerCount * 2, true)

      const offsetHexString = Array.from(new Uint8Array(offsetBuffer))
        .map(byte => byte.toString(16).padStart(2, '0')).join('')
      const lengthHexString = Array.from(new Uint8Array(lengthBuffer))
        .map(byte => byte.toString(16).padStart(2, '0')).join('')

      const finalPayload = offsetHexString + lengthHexString + serializedHexData

      
  
      // 第4步：批量发送MQTT消息到所有选中的簇
      const sendPromises = targetKeys.map(async (deviceKey) => {
        try {
          // 映射 deviceKey → ids
          let ids
          if (!needDeviceForWrite) {
            ids = null
          } else if (selectorMode === 'cluster') {
            const parts = String(deviceKey).split('-')
            ids = { blockNumber: Number(parts[0]), clusterNumber: Number(parts[1]) }
          } else {
            const blockNumber = Number(String(deviceKey).replace('block', ''))
            ids = { blockNumber, clusterNumber: 0 }
          }
          let writeTopicPath = needDeviceForWrite
            ? topicBuilder(writeTemplate, ids)
            : writeTemplate
          
          // 如果模板包含{dataType}占位符，并且配置了getDataType函数，则进行动态替换
          if (writeTopicPath.includes('{dataType}') && remoteControlConfig.dataSource.getDataType) {
            const currentClassName = classConfiguration.name
            const dataType = remoteControlConfig.dataSource.getDataType(currentClassName)
            writeTopicPath = topicBuilder(writeTopicPath, ids, dataType)
            console.log(`[RemoteControlCore] 下发动态dataType: ${dataType} (分类: ${currentClassName})`)
          }
          
          // console.log(`[RemoteControlCore] 发送到MQTT主题: ${writeTopicPath}`)
          
          // 发送MQTT消息
          await window.electronAPI.mqttPublish(writeTopicPath, finalPayload)
          
          // console.log(`[RemoteControlCore] 目标 ${deviceKey} 消息发送成功，等待设备应答...`)
          return { cluster: deviceKey, status: 'sent', error: null }
        } catch (error) {
          console.error(`[RemoteControlCore] 目标 ${deviceKey} 下设失败:`, error)
          
          // 立即显示发送失败的错误
          const displayName = selectorMode === 'cluster'
            ? (() => {
                const [b, c] = String(deviceKey).split('-').map(n => Number(n))
                return t('toast.remoteControl.deviceName.cluster', { blockId: b, clusterId: c })
              })()
            : (() => {
                const b = Number(deviceKey)
                return t('toast.remoteControl.deviceName.block', { blockId: b })
              })()
          toastService.add({
            severity: 'error',
            summary: t('toast.remoteControl.sendFailed'),
            detail: t('toast.remoteControl.sendFailedDetail', { device: displayName, error: error.message }),
            life: 5000
          })
          
          return { cluster: deviceKey, status: 'failed', error: error.message }
        }
      })
      
      // 等待所有MQTT发送完成
      const results = await Promise.allSettled(sendPromises)
      
      // 统计MQTT发送结果
      const successfulSends = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 'sent'
      )
      const failedSends = results.filter(result => 
        result.status === 'rejected' || result.value.status === 'failed'
      )
      
      // console.log(`[RemoteControlCore] MQTT发送完成 - 成功: ${successfulSends.length}, 失败: ${failedSends.length}`)
      
      // 只有所有MQTT都发送失败时才显示批量失败提示
      if (failedSends.length > 0 && successfulSends.length === 0) {
        toastService.add({
          severity: 'error',
          summary: t('toast.remoteControl.batchSendFailed'),
          detail: t('toast.remoteControl.allTargetsFailed', { count: targetKeys.length }),
          life: 5000
        })
      }
      
      // 设备应答将通过现有的handleParameterWriteResponse函数处理
      
    } catch (error) {
      console.error('[RemoteControlCore] 批量下发失败:', error)
      toastService.add({
        severity: 'error',
        summary: t('toast.remoteControl.batchSendFailed'),
        detail: error.message,
        life: 5000
      })
    }
  }
  
  // ================== 数据处理功能 ==================
  
  /**
   * 处理从设备读取的参数数据
   * 作用：当收到设备返回的参数数据时，更新本地数据存储并刷新界面
   * @param {Object} receivedData - 接收到的数据对象，格式: {frameKey, data}
   */
  function handleReceivedParameterData(receivedData) {
    const normalized = normalizeReadData(receivedData)
    // 调试日志移除（保留接口位置便于后续排查）
    const { frameKey, data } = normalized  // 簇: "1-1"，堆: "1"
    const dataSourceName = remoteControlConfig.dataSource.name // "SYS_BASE_PARAM"
    
    // 确保集群选项中包含当前frameKey
    if (selectorMode === 'cluster') {
      ensureOption(frameKey)
    } else {
      // 堆模式：仅向堆下拉注入（'block1'），frameKey 用于内部存储，不作为下拉键
      ensureOption(`block${normalized.blockId}`)
    }
    
    // 同时按数据源和簇进行区分
    const clusterDataKey = `${dataSourceName}_${frameKey}` // "SYS_BASE_PARAM_1-1"
    
    // 初始化数据存储结构
    if (!originalDataMap.value[clusterDataKey]) {
      originalDataMap.value[clusterDataKey] = {}
    }
    if (!editableDataMap.value[clusterDataKey]) {
      editableDataMap.value[clusterDataKey] = {}
    }
    


    // 更新原始数据
    // originalDataMap.value[clusterDataKey] = {
    //   ...originalDataMap.value[clusterDataKey],
    //   ...data
    // }

    const newData = { 
      ...originalDataMap.value[clusterDataKey], 
      ...data 
    }
    originalDataMap.value = {
      ...originalDataMap.value,
      [clusterDataKey]: newData
    }

    // 读取设备数据时，强制更新所有参数值，确保界面显示设备实际值
    // 确保 editableDataMap 中存在对应的键
    if (!editableDataMap.value[clusterDataKey]) {
      editableDataMap.value = {
        ...editableDataMap.value,
        [clusterDataKey]: {}
      }
    }
    
    // 更新编辑数据 - 使用设备读取的最新值覆盖所有参数
    const updatedEditableData = { 
      ...editableDataMap.value[clusterDataKey],
      ...data  // 直接用设备数据覆盖，确保显示设备实际值
    }
    
    editableDataMap.value = {
      ...editableDataMap.value,
      [clusterDataKey]: updatedEditableData
    }
    
    // 只在首次读取成功时显示弹窗，避免连续读取时的弹窗轰炸
    if (isFirstReadAfterStart) {
      isFirstReadAfterStart = false  // 重置标记，后续读取不再弹窗
      const clusterStore = useClusterStore()
      // 优化显示：簇模式使用 "堆X/簇Y"，堆模式使用 "堆X"
      const displayName = selectorMode === 'cluster'
        ? (() => {
            const [b, c] = String(frameKey).split('-').map(n => Number(n))
            return t('toast.remoteControl.deviceName.cluster', { blockId: b, clusterId: c })
          })()
        : (() => {
            const b = Number(frameKey)
            return t('toast.remoteControl.deviceName.block', { blockId: b })
          })()
      // 计算实际参数数量：如果data是数组（分类结构），则统计所有分类中的参数总数
      // 对于出厂校正参数，排除"预留"分类的参数
      const paramCount = Array.isArray(data)
        ? data.reduce((total, section) => {
            // 跳过预留分类的参数统计
            if (section.class === '预留') return total
            return total + (section.element ? section.element.length : 0)
          }, 0)
        : Object.keys(data).length

      toastService.add({
        severity: 'success',
        summary: t('toast.remoteControl.startReadingParameters'),
        detail: t('toast.remoteControl.readSuccessDetail', { device: displayName, count: paramCount }),
        life: 4000
      })
    }
  }
  
  // 事件去重管理 - 防止重复弹窗
  const processedWriteEvents = new Map() // 存储已处理的事件，格式: eventId -> timestamp

  /**
   * 处理参数下发响应
   * 作用：当设备返回参数写入结果时，显示相应的成功或失败提示
   */
  /**
   * 处理参数下发响应
   * 作用：当设备返回参数写入结果时，显示相应的成功或失败提示
   */
  function handleParameterWriteResponse(responseData) {
    // ================== 事件去重检查 ==================
    const deviceFrameKey = responseData.frameKey || (
      responseData.blockId !== undefined
        ? (responseData.clusterId && responseData.clusterId > 0
            ? `${responseData.blockId}-${responseData.clusterId}`
            : String(responseData.blockId))
        : undefined
    )
    const actualClassName = responseData.className || responseData.dataType || '未知分类'
    
    // 尝试从当前配置中查找对应的classConfiguration
    const classConfiguration = remoteControlConfig.dataSource.parameterClasses?.find(
      cls => cls.name === actualClassName || cls.nameKey?.includes(actualClassName)
    )
    const resultType = responseData.result?.success ? 'success' : 'error'
    const resultCode = responseData.result?.code || 'unknown'

    // 生成事件唯一标识：设备+分类+结果类型+结果码
    const eventId = `${deviceFrameKey}-${actualClassName}-${resultType}-${resultCode}`
    const currentTime = Date.now()

    // 检查是否在1秒内已处理过相同事件
    if (processedWriteEvents.has(eventId)) {
      const lastProcessTime = processedWriteEvents.get(eventId)
      if (currentTime - lastProcessTime < 1000) { // 1秒内的重复事件
        console.log(`[事件去重] 忽略重复的写入响应事件: ${eventId}`)
        return
      }
    }

    // 记录当前事件处理时间
    processedWriteEvents.set(eventId, currentTime)

    // 清理5秒前的旧事件记录，避免内存泄漏
    for (const [id, timestamp] of processedWriteEvents.entries()) {
      if (currentTime - timestamp > 5000) {
        processedWriteEvents.delete(id)
      }
    }

    // ================== 原有簇级处理逻辑 ==================
    const clusterStore = useClusterStore()
    const clusterDisplayName = selectorMode === 'cluster'
      ? (() => {
          const [b, c] = String(deviceFrameKey).split('-').map(n => Number(n))
          return t('toast.remoteControl.deviceName.cluster', { blockId: b, clusterId: c })
        })()
      : (() => {
          const b = Number(responseData.blockId)
          return t('toast.remoteControl.deviceName.block', { blockId: b })
        })()

    console.log(`[事件处理] 处理写入响应事件: ${eventId}`)

    // 检查是否下发成功
    if (responseData.result?.success) {
      toastService.add({
        severity: 'success',
        summary: t('toast.remoteControl.parameterSendSuccess'),
        detail: t('toast.remoteControl.parameterWriteSuccess', { device: clusterDisplayName, className: translateParameterClassName(actualClassName, classConfiguration), code: `0x${responseData.result.code.toString(16).toUpperCase()}` }),
        life: 4000
      })
    } else if (responseData.result?.error) {
      const errorCodeMap = {
        0xE1: t('toast.errorCodes.0xE1'),       // 通用失败
        0xE2: t('toast.errorCodes.0xE2'),       // 设备响应超时
        0xE3: t('toast.errorCodes.0xE3'),       // 设备正在处理其他请求
        0xE4: t('toast.errorCodes.0xE4'),        // 参数格式或数值错误
        0xE5: t('toast.errorCodes.0xE5'),
        0xE6: t('toast.errorCodes.0xE6'),
      }
      const errorCode = Number(responseData.result.code)
      const errorDescription = responseData.result.message || ERROR_CODES[errorCode] || t('toast.common.unknownError')
      toastService.add({
        severity: 'error',
        summary: t('toast.remoteControl.parameterSendFailed'),
        detail: t('toast.remoteControl.parameterWriteFailed', { device: clusterDisplayName, error: errorDescription, code: errorCode?.toString(16).toUpperCase() || 'Unknown' }),
        life: 6000
      })
    }
  }
  
  /**
   * 处理读取过程中的错误
   * 作用：当读取参数发生错误时，停止读取并显示错误信息
   * @param {Object} errorData - 错误数据对象
   */
  function handleParameterReadError(errorData) {
    // console.log('handleParameterReadError called', parsedReadData);
    const dataSourceName = remoteControlConfig.dataSource.name
    // 打印调用堆栈和响应内容
    console.log('[DEBUG-toast] handleParameterReadError called:', JSON.stringify(errorData), new Error().stack)
    // 如果是读取错误，自动停止继续读取
    if (errorData.result?.type === 'read') {
      stopParameterReading()
    }
    // 错误代码映射（与写入错误使用相同的映射）
    const errorCode = Number(errorData.result?.code)
    const errorDescription = errorData.result?.message || ERROR_CODES[errorCode] || '未知错误'
    
    // 只在首次错误时显示弹窗，避免连续错误时的弹窗轰炸
    if (isFirstErrorAfterStart) {
      isFirstErrorAfterStart = false  // 重置标记，后续错误不再弹窗
      toastService.add({
        severity: 'error',
        summary: t('toast.remoteControl.operationFailed'),
        detail: t('toast.remoteControl.operationFailedDetail', { source: dataSourceName, error: errorDescription, code: errorCode?.toString(16).toUpperCase() || 'Unknown' }),
        life: 5000
      })
    } else {
      // 后续错误只记录到控制台，不显示弹窗
      console.warn(`[错误去重] ${dataSourceName}: ${errorDescription} (错误代码: 0x${errorCode?.toString(16).toUpperCase() || 'Unknown'})`)
    }
  }

  // ========== 下拉框支持功能 ==========
  // 下拉配置的数据类型/主题类型，允许页面通过 config 覆盖
  const DROPDOWN_DATA_TYPE = remoteControlConfig?.dataSource?.dropdown?.dataType
    || (selectorMode === 'block' ? 'block_remote_control' : 'cluster_remote_control')

  // 下拉框配置缓存 - 避免重复查找配置，提升性能
  const dropdownConfigCache = new Map()

  function getDropdownTopicType() {
    // 优先页面显式指定
    const explicit = remoteControlConfig?.dataSource?.dropdown?.topicType
    if (explicit) return explicit
    // 其次使用分类自带 dataType（适用于多Topic页面）
    if (currentSelectedClass.value?.dataType) return currentSelectedClass.value.dataType
    // 最后根据模式给默认
    return selectorMode === 'block' ? 'block_common_param' : 'sys_base_param'
  }

  /**
   * 判断参数是否需要使用下拉框 - 优化版本，使用缓存
   * @param {string} parameterLabel - 参数中文名称
   * @returns {boolean} 是否需要下拉框
   */
  function isParameterDropdown(parameterLabel) {
    // 构建缓存键
    const topicType = getDropdownTopicType()
    const cacheKey = `${DROPDOWN_DATA_TYPE}_${topicType}_${parameterLabel}`

    // 检查缓存
    if (!dropdownConfigCache.has(cacheKey)) {
      const isDropdown = isDropdownParameter(DROPDOWN_DATA_TYPE, topicType, parameterLabel)
      const config = getDropdownConfig(DROPDOWN_DATA_TYPE, topicType, parameterLabel)

      // 同时缓存选项数据，避免重复查找
      let options = []
      if (isDropdown && config) {
        if (config.options && Array.isArray(config.options)) {
          options = config.options
        } else if (Array.isArray(config)) {
          options = config
        }
      }

      // 缓存结果
      dropdownConfigCache.set(cacheKey, { isDropdown, options })
    }

    return dropdownConfigCache.get(cacheKey).isDropdown
  }

  /**
   * 获取参数的下拉框选项列表 - 优化版本，使用缓存
   * @param {string} parameterLabel - 参数中文名称
   * @returns {Array} 下拉框选项数组
   */
  function getParameterDropdownOptions(parameterLabel) {
    // 构建缓存键
    const topicType = getDropdownTopicType()
    const cacheKey = `${DROPDOWN_DATA_TYPE}_${topicType}_${parameterLabel}`

    // 确保缓存已构建
    if (!dropdownConfigCache.has(cacheKey)) {
      isParameterDropdown(parameterLabel) // 触发缓存构建
    }

    const cached = dropdownConfigCache.get(cacheKey)
    if (!cached || !cached.isDropdown) {
      console.warn(`[RemoteControlCore] 未找到参数 ${parameterLabel} 的下拉框配置`)
      return []
    }

    return cached.options || []
  }

  /**
   * 获取下拉框参数的显示值
   * @param {string} parameterLabel - 参数中文名称
   * @param {*} actualValue - 实际值
   * @returns {string} 显示标签
   */
  function getDropdownDisplayValue(parameterLabel, actualValue) {
    // 使用已经翻译过的下拉框选项
    const options = getParameterDropdownOptions(parameterLabel)
    
    if (!options || options.length === 0) {
      return actualValue?.toString() || ''
    }

    // 查找匹配的选项
    for (const option of options) {
      if (option.matchValues !== undefined) {
        if (option.matchValues === 'other') {
          // 特殊处理"other"类型：除了明确指定的值外，其他所有值都匹配
          const explicitValues = options
            .filter(opt => opt.value !== 'other' && opt.matchValues === undefined)
            .map(opt => Number(opt.value))

          if (!explicitValues.includes(Number(actualValue))) {
            return option.label
          }
        } else if (Array.isArray(option.matchValues)) {
          if (option.matchValues.includes(actualValue)) {
            return option.label
          }
        } else if (option.matchValues === actualValue) {
          return option.label
        }
      } else if (option.value === actualValue) {
        return option.label
      }
    }

    return actualValue?.toString() || ''
  }

  /**
   * 更新下拉框参数值
   * @param {string} parameterKey - 参数英文key（用于实际更新）
   * @param {Object} selectedOption - 选中的选项 {label, value}
   */
  function updateDropdownParameterValue(parameterKey, selectedOption) {
    if (!selectedOption || selectedOption.value === undefined) {
      console.warn(`[RemoteControlCore] 下拉框参数 ${parameterKey} 选项无效:`, selectedOption)
      return
    }

    // console.log(`[RemoteControlCore] 更新下拉框参数: ${parameterKey} = ${selectedOption.label} (${selectedOption.value})`)
    updateParameterValue(parameterKey, selectedOption.value)
  }

  /**
   * 使用默认值初始化参数列表
   * @param {Array} fields - 参数字段定义
   * @param {Object} defaults - 默认值配置
   * @returns {Array} 初始化后的参数列表
   */
  function initializeWithDefaults(fields, defaults) {
    return fields.map(field => ({
      ...field,
      currentValue: defaults[field.key] !== undefined ?
        defaults[field.key] :
        getDefaultValueByType(field.type),
      hasDefaultValue: defaults[field.key] !== undefined
    }))
  }

  /**
   * 根据字段类型获取默认值
   * @param {string} type - 字段类型
   * @returns {number} 默认值
   */
  function getDefaultValueByType(type) {
    switch (type) {
      case 'u8':
      case 'u16':
      case 'u32':
        return 0
      case 's8':
      case 's16':
      case 's32':
        return 0
      case 'f32':
        return 0.0
      default:
        return 0
    }
  }

  /**
   * 增强的参数列表 - 包含下拉框信息
   * 为每个参数添加输入类型、选项列表、显示值等信息
   */
  const enhancedParameterList = computed(() => {
    return currentClassParameterList.value.map(parameter => {
      // 使用中文名称（label）进行下拉框匹配
      const isDropdown = isParameterDropdown(parameter.label)

      if (isDropdown) {
        const options = getParameterDropdownOptions(parameter.label) || []


        // 如果参数值为undefined且有可用选项，设置为第一个选项的值作为默认值
        // 这样可以确保下拉框有合理的显示值，同时支持正常的下发操作
        if ((parameter.currentValue === undefined || parameter.currentValue === null) && options.length > 0) {
          parameter.currentValue = options[0].value
        }

        const displayValue = getDropdownDisplayValue(parameter.label, parameter.currentValue)
        // const selectedOption = options.find(opt => opt.value === parameter.currentValue)
        const selectedOption = options.find(opt => {
          // 对bits字段特殊处理：提取raw值进行比较
          const compareValue = typeof parameter.currentValue === 'object' && parameter.currentValue?.raw !== undefined
            ? parameter.currentValue.raw
            : parameter.currentValue

          // 如果有matchValues，使用matchValues匹配
          if (opt.matchValues !== undefined) {
            if (opt.matchValues === 'other') {
              // 特殊处理"other"类型：除了明确指定的值外，其他所有值都匹配
              const explicitValues = options
                .filter(option => option.value !== 'other' && option.matchValues === undefined)
                .map(option => Number(option.value))

              return !explicitValues.includes(Number(compareValue))
            } else if (Array.isArray(opt.matchValues)) {
              return opt.matchValues.includes(compareValue)
            } else {
              return opt.matchValues === compareValue
            }
          }
          // 否则使用原来的value匹配
          return opt.value === compareValue
        })


        return {
          ...parameter,
          inputType: 'dropdown',
          options: options,
          displayValue: displayValue,
          selectedOption: selectedOption || { label: displayValue, value: parameter.currentValue }
        }
      } else {
        // 无下拉的数值型参数：在无数据时显示0，保持与其他页面一致
        if (parameter.currentValue === undefined) {
          parameter.currentValue = 0
        }
        return {
          ...parameter,
          inputType: 'input',
          displayValue: getParameterInputValue(parameter, parameter.currentValue)
        }
      }
    })
  })

  // ================== 返回接口 - 提供给页面使用的所有功能 ==================

  // 注册autoRead函数到全局调度器
  registerAutoReadFunction(autoReadMultiTopicOnce)

  return {
    // 状态数据 - 响应式数据，页面可以直接使用
    originalDataMap,         // 原始数据存储，只读
    editableDataMap,         // 编辑数据存储，可修改
    isCurrentlyReading,      // 读取状态，控制按钮显示
    // 以下两个仅在簇模式下有意义；堆模式请从 blockStore 使用对应的 selectedBlockForView/availableBlocks
    ...(selectorMode === 'cluster' ? { selectedCluster: selectedKeyRef, clusterOptions: optionsRef } : {}),
    
    // 当前状态 - 计算属性，自动响应数据变化
    currentSelectedClass,    // 当前选中的参数分类
    currentClassParameterList, // 当前分类的参数列表，供表格显示
    allAvailableClasses,     // 所有可用分类，供分类按钮使用
    
    // 操作功能 - 用户交互函数
    switchToParameterClass,  // 切换参数分类
    startParameterReading,   // 开始读取数据（单topic）
    sendParameterReadRequest,
    stopParameterReading,    // 停止读取数据
    sendCurrentClassParameters, // 下发当前分类参数
    updateParameterValue,    // 更新参数值
    getParameterInputValue,  // 获取输入框值
    setParameterInputValue,  // 设置输入框值
    getParameterDecimalPlaces, // 获取小数位数
    startMultiTopicReading, // 新增：多topic并发读取方法
    autoReadMultiTopicOnce, // 新增：一次性自动读取方法

    // 下拉框功能 - 支持参数下拉框选择
    isParameterDropdown,         // 判断参数是否需要下拉框
    getParameterDropdownOptions, // 获取参数下拉框选项
    getDropdownDisplayValue,     // 获取下拉框显示值
    updateDropdownParameterValue, // 更新下拉框参数值
    enhancedParameterList,       // 增强的参数列表（包含下拉框信息）

    // 数据处理 - MQTT事件处理函数
    handleReceivedParameterData,  // 处理接收数据
    handleParameterWriteResponse, // 处理写入响应
    handleParameterReadError,     // 处理读取错误

    // 默认值支持 - 新增功能
    initializeWithDefaults,       // 使用默认值初始化参数列表
    getDefaultValueByType         // 根据类型获取默认值
  }
}