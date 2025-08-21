// 系统基本配置参数专用处理逻辑
// 包含：数据解析、序列化、错误处理等系统基本参数特有的功能
import { SYS_BASE_PARAM_R } from '../../../../../../main/table.js'
import { 
  serializeParameterData,
  createDefaultParameterData,
  parseParameterReadResponse,
  parseParameterWriteResponse
} from '../remote-control/useRemoteControlCore.js'

export function useSysBaseParam() {
    
  /**
   * 创建系统基本参数的默认数据对象
   * 根据SYS_BASE_PARAM_R表定义初始化所有参数的默认值
   * @returns {Object} 包含所有参数默认值的对象
   */
  const createDefaultSystemBaseParamData = () => {
    // 调用通用默认数据创建函数
    return createDefaultParameterData(SYS_BASE_PARAM_R, '[useSysBaseParam]')
  }
  
  // ================== MQTT消息解析功能 ==================
  
  /**
   * 解析系统基本参数读取响应消息
   * 处理从设备返回的读取数据，包括成功和错误情况
   * @param {Object} mqttMessage - MQTT消息对象
   * @returns {Object|null} 解析后的数据结构或null
   */
  const parseSystemBaseParamReadResponse = (mqttMessage) => {
    // 调用通用读取响应解析函数
    return parseParameterReadResponse(mqttMessage, '[useSysBaseParam]', '系统基本参数')
  }

  /**
   * 解析系统基本参数写入响应消息
   * 处理参数下发后设备返回的响应，包括成功和失败情况
   * @param {Object} mqttMessage - MQTT消息对象
   * @returns {Object} 解析后的响应结构
   */
  const parseSystemBaseParamWriteResponse = (mqttMessage) => {
    // 调用通用写入响应解析函数
    return parseParameterWriteResponse(mqttMessage, '[useSysBaseParam]', '系统基本参数')
  }

  // ================== 数据序列化功能 ==================

  /**
   * 序列化指定范围的系统基本参数数据
   * 将参数对象转换为可发送给设备的十六进制字符串
   * @param {Object} parameterDataFrame - 包含参数数据的对象
   * @param {number} startByteOffset - 起始字节偏移量
   * @param {number} registerCount - 寄存器数量（每个寄存器2字节）
   * @returns {string|null} 序列化后的十六进制字符串或null（失败时）
   */
  const serializeSystemBaseParamData = (parameterDataFrame, startByteOffset, registerCount) => {
    // 调用通用序列化函数
    const fieldDefinitionTable = SYS_BASE_PARAM_R    // 使用明确的变量名
    const logPrefix = '[useSysBaseParam]'            // 使用明确的变量名
    const dataTypeName = '系统基本参数'               // 使用明确的变量名
    
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
    createDefaultSystemBaseParamData,
    // 消息解析
    parseSystemBaseParamReadResponse,
    parseSystemBaseParamWriteResponse,
    // 数据序列化
    serializeSystemBaseParamData
  }
} 