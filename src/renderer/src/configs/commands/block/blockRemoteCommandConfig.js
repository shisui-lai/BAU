// 堆遥控命令配置文件 - 基于实际通信协议定义的堆级遥控命令
// 包含4个控制命令和1个状态查询命令

/**
 * 堆遥控命令配置
 * 基于实际通信协议定义
 */
export const blockRemoteCommandConfig = {
  // 1. 下设电池堆控制开关
  batt_stack_ctrl_switch: {
    id: 'batt_stack_ctrl_switch',
    name: '下设电池堆控制开关',
    topic: 'bms/host/s2d/b{block}/batt_stack_ctrl_switch',
    responseTopic: 'bms/bau/d2s/b{block}/batt_stack_ctrl_switch',
    dataType: 'u16', // 控制字2字节
    uiType: 'dropdown',
    needConfirm: true,
    confirmMessage: '确定要执行电池堆控制开关操作吗？',
    description: '控制电池堆接触器的吸合和脱离操作',
    options: [
      { label: '设置充电吸合操作', value: 1 },
      { label: '设置放电吸合操作', value: 2 },
      { label: '设置脱离母线操作', value: 3 }
    ]
  },

  // 2. 强制消除电池堆保留故障
  force_clear_save_fault: {
    id: 'force_clear_save_fault',
    name: '强制消除电池堆保留故障',
    topic: 'bms/host/s2d/b{block}/force_clear_save_fault',
    responseTopic: 'bms/bau/d2s/b{block}/force_clear_save_fault',
    dataType: 'u16', // 控制字2字节
    uiType: 'dropdown',
    needConfirm: true,
    confirmMessage: '确定要清除电池堆保留故障吗？',
    description: '清除电池堆的各种保留故障',
    options: [
      { label: '清除所有故障', value: 0 },
      { label: '清除充电过流严重告警', value: 1 },
      { label: '清除放电过流严重告警', value: 2 },
      { label: '清除绝缘电阻严重告警', value: 3 },
      { label: '清除接触器黏连（氧化）', value: 4 },
      { label: '清除PCS通讯故障', value: 5 }
    ]
  },

  // 3. 控制参数复位
  reset_block_param: {
    id: 'reset_block_param',
    name: '控制参数复位',
    topic: 'bms/host/s2d/b{block}/reset_block_param',
    responseTopic: 'bms/bau/d2s/b{block}/reset_block_param',
    dataType: 'u16', // 控制字2字节
    uiType: 'checkbox_group',
    needConfirm: true,
    confirmMessage: '确定要复位选中的控制参数吗？',
    description: '复位各种系统配置参数（位字段控制）',
    bitFields: [
      { label: '复位系统基本配置参数', bit: 0, value: 1 },
      { label: '复位系统簇端电池配置参数', bit: 1, value: 2 },
      { label: '复位系统端口配置参数', bit: 2, value: 4 },
      { label: '复位系统通讯设备配置参数', bit: 3, value: 8 },
      { label: '复位系统操作配置参数', bit: 4, value: 16 },
      { label: '复位系统堆告警安装参数', bit: 5, value: 32 },
      { label: '复位系统系统运行时间', bit: 6, value: 64 }
    ]
  },

  // 4. 下设周期性绝缘电阻检测指令
  period_ins_detect_en: {
    id: 'period_ins_detect_en',
    name: '下设周期性绝缘电阻检测指令',
    topic: 'bms/host/s2d/b{block}/period_ins_detect_en',
    responseTopic: 'bms/bau/d2s/b{block}/period_ins_detect_en',
    dataType: 'u16', // 控制字2字节
    uiType: 'dropdown',
    needConfirm: true,
    confirmMessage: '确定要执行周期性绝缘电阻检测操作吗？',
    description: '控制周期性绝缘电阻检测的启用和禁用',
    options: [
      { label: '开启周期性绝缘检测', value: 0 },
      { label: '关闭周期性绝缘检测', value: 1 }
    ]
  },

  // 5. 查询接触器执行策略结果（堆级反馈查询命令）
  get_batt_stack_ctrl_switch_result: {
    id: 'get_batt_stack_ctrl_switch_result',
    name: '查询接触器执行策略结果',
    topic: 'bms/host/s2d/b{block}/get_batt_stack_ctrl_switch_result',
    responseTopic: 'bms/bau/d2s/b{block}/get_batt_stack_ctrl_switch_result',
    dataType: 'u16', // 查询命令2字节
    uiType: 'hidden', // 隐藏类型，不在UI中显示
    isPollingCommand: true, // 标记为轮询查询命令
    value: 0xFF, // 固定查询值
    description: '周期性读取电池堆控制开关执行结果'
  }

}

// BAU应答码定义已统一使用全局ERROR_CODES (src/main/table.js)
import { ERROR_CODES } from '../../../../../main/table.js'

/**
 * 接触器执行策略结果定义
 */
export const CONTACTOR_EXECUTION_RESULTS = {
  0: '空闲',
  1: '执行中',
  2: '执行失败',
  3: '执行成功'
}

/**
 * 获取所有堆遥控命令
 * @returns {Array} 堆遥控命令数组
 */
export function getBlockRemoteCommands() {
  return Object.entries(blockRemoteCommandConfig).map(([id, config]) => ({
    id,
    ...config
  }))
}

/**
 * 根据UI类型分组获取堆遥控命令
 * @returns {Object} 按UI类型分组的命令对象
 */
export function getBlockRemoteCommandsByUIType() {
  const commands = getBlockRemoteCommands()
  const grouped = {
    dropdown: [],
    button: [],
    checkbox_group: [],
    multi_dropdown: []
  }

  commands.forEach(command => {
    if (grouped[command.uiType]) {
      grouped[command.uiType].push(command)
    }
  })

  return grouped
}

/**
 * 解析BAU应答码
 * @param {number} code - 应答码
 * @returns {string} 应答码含义
 */
export function parseBAUResponseCode(code) {
  return ERROR_CODES[code] || `未知应答码(0x${code.toString(16).toUpperCase()})`
}

/**
 * 解析接触器执行结果
 * @param {number} result - 执行结果代码
 * @returns {string} 执行结果含义
 */
export function parseContactorExecutionResult(result) {
  return CONTACTOR_EXECUTION_RESULTS[result] || `未知结果(${result})`
}

/**
 * 获取指定命令配置（与remoteCommandConfig.js保持接口一致）
 * @param {string} commandId - 命令ID
 * @returns {Object} 命令配置对象
 */
export function getBlockCommandConfig(commandId) {
  return blockRemoteCommandConfig[commandId]
}

/**
 * 获取所有堆遥控命令（与remoteCommandConfig.js保持接口一致）
 * @returns {Object} 所有命令配置
 */
export function getAllBlockCommands() {
  return getBlockRemoteCommands() // 复用现有函数
}