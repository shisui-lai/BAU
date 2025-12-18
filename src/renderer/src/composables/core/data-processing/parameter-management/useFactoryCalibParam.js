// 出厂校正参数专用处理逻辑
// 包含：数据解析、序列化、错误处理等出厂校正参数特有的功能
import { markRaw } from 'vue'
import { FACTORY_CALIB_PARAM_R } from '../../../../../../main/table.js'
import {
  serializeParameterData,
  createDefaultParameterData,
  parseParameterWriteResponse
} from '../remote-control/useRemoteControlCore.js'
// 注意：不需要导入parseFactoryCalibrationRAW，因为MQTT消息已经包含解析后的数据

export function useFactoryCalibParam() {
  /**
   * 创建出厂校正参数的默认数据对象
   * 根据FACTORY_CALIB_PARAM_R表定义初始化所有参数的默认值
   * @returns {Object} 包含所有参数默认值的对象
   */
  const createDefaultFactoryCalibParamData = () => {
    // 调用通用默认数据创建函数
    // 性能优化：使用markRaw避免Vue深度响应式跟踪
    return createDefaultParameterData(markRaw(FACTORY_CALIB_PARAM_R), '[useFactoryCalibParam]')
  }

  // ================== MQTT消息解析功能 ==================

  /**
   * 解析出厂校正参数读取响应消息
   * 处理从设备返回的读取数据，包括成功和错误情况
   * @param {Object} mqttMessage - MQTT消息对象
   * @returns {Object|null} 解析后的数据结构或null
   */
  const parseFactoryCalibParamReadResponse = (mqttMessage) => {
    try {
      const { blockId, clusterId, data } = mqttMessage
      const deviceFrameKey = `${blockId}-${clusterId}`

      // 验证数据格式
      if (!data || typeof data !== 'object') {
        return null
      }

      // 直接使用扁平化数据
      const flatData = { ...data }

      const result = {
        frameKey: deviceFrameKey,
        blockId: parseInt(blockId),
        clusterId: parseInt(clusterId),
        data: flatData,
        result: { success: true },
        dataSource: 'FACTORY_CALIB_PARAM'
      }

      return result
    } catch (error) {
      console.error('[useFactoryCalibParam] 解析出厂校正参数读取响应失败:', error)
      return null
    }
  }

  /**
   * 解析出厂校正参数写入响应消息
   * 处理设备返回的写入确认，包括成功和错误情况
   * @param {Object} mqttMessage - MQTT消息对象
   * @returns {Object|null} 解析后的数据结构或null
   */
  const parseFactoryCalibParamWriteResponse = (mqttMessage) => {
    // 调用通用写入响应解析函数
    return parseParameterWriteResponse(mqttMessage, '[useFactoryCalibParam]', '出厂校正参数')
  }

  // ================== 数据序列化功能 ==================

  /**
   * 序列化指定范围的出厂校正参数数据
   * 将参数对象转换为可发送给设备的十六进制字符串
   * @param {Object} parameterDataFrame - 包含参数数据的对象
   * @param {number} startByteOffset - 起始字节偏移量
   * @param {number} registerCount - 寄存器数量（每个寄存器2字节）
   * @returns {string|null} 序列化后的十六进制字符串或null（失败时）
   */
  const serializeFactoryCalibParamData = (parameterDataFrame, startByteOffset, registerCount) => {
    // 调用通用序列化函数
    const fieldDefinitionTable = FACTORY_CALIB_PARAM_R // 使用明确的变量名
    const logPrefix = '[useFactoryCalibParam]' // 使用明确的变量名
    const dataTypeName = '出厂校正参数' // 使用明确的变量名

    return serializeParameterData(
      parameterDataFrame,
      fieldDefinitionTable,
      startByteOffset,
      registerCount,
      logPrefix,
      dataTypeName
    )
  }

  // ================== 返回接口 ==================
  return {
    // 数据初始化
    createDefaultFactoryCalibParamData,
    // 消息解析
    parseFactoryCalibParamReadResponse,
    parseFactoryCalibParamWriteResponse,
    // 数据序列化
    serializeFactoryCalibParamData
  }
}
