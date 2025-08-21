/**
 * 遥控命令组合式API - 支持簇/堆双模式
 * 包含所有遥控命令相关的业务逻辑和Vue组合式API
 */
import { ref, reactive, computed } from 'vue'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockStore } from '@/stores/device/blockStore'
import { getCommandConfig, getAllCommands } from '@/configs/commands/cluster/remoteCommandConfig'
import { getBlockCommandConfig, getAllBlockCommands } from '@/configs/commands/block/blockRemoteCommandConfig'

// ========== 全局状态管理 ==========
// 简化的状态管理
const selectedValues = reactive({}) // 下拉框选中值
const bitFieldValues = reactive({}) // bit位控制的值
const executingCommands = ref(new Set()) // 正在执行的命令集合

// 前置条件执行状态管理
const isExecutingPreCondition = ref(false)
const currentPreConditionTopic = ref('')

// 弹窗状态管理
const showBitFieldDialog = ref(false) // bit位控制弹窗
const showConfirmDialog = ref(false) // 确认对话框
const currentBitFieldCommand = ref(null) // 当前bit位控制命令
const confirmMessage = ref('') // 确认消息
const pendingCommand = ref(null) // 待执行命令

// 反馈状态数据
const feedbackStatus = reactive({
  contactor_ctrl_result: '-', // 接触器执行策略结果
  insulation_detect_result: '-', // 绝缘电阻检测执行结果
  batt_stack_ctrl_switch_result: '-' // 堆接触器执行策略结果
})

// 反馈查询定时器相关状态
const feedbackPollingActive = ref(false)
let feedbackPollingTimer = null

// 复选框状态管理
const checkboxStates = reactive({
  // 测试模式接触器控制复选框状态
  contactor_ctrl_test: {},
  // 独立执行接触器控制复选框状态
  contactor_standalone_ctrl: {}
})

// ========== 计算属性工厂函数 ==========
/**
 * 创建簇模式计算属性的工厂函数
 * @param {Function} getAllCommandsFunc - 获取所有命令的函数
 */
function createClusterComputedProperties(getAllCommandsFunc) {
  /**
   * 所有遥控命令
   */
  const allRemoteCommands = computed(() => {
    return getAllCommandsFunc()
  })

  /**
   * 控制信息表格数据 - 排除测试模式和独立执行中的控制项
   */
  const controlCommandTableData = computed(() => {
    return getAllCommandsFunc().filter(cmd => {
      // 排除所有checkbox_bitfield类型的命令（这些在测试模式区域处理）
      if (cmd.type === 'checkbox_bitfield') {
        return false
      }

      // 排除查询类型的命令（这些是自动轮询的，不需要在控制信息中显示）
      if (cmd.type === 'query') {
        return false
      }

      // 排除测试模式和独立执行相关的命令
      const excludeIds = [
        'contactor_standalone_ctrl',
        'contactor_ctrl_test',
        'hsd_ctrl_test',
        'lsd_ctrl_test',
        'io_ctrl_test'
        // 注意：contactor_ctrl（下设接触器执行策略）应该在控制信息表格中显示
        // 注意：restore_basic_param和restore_factory_param（参数复位控制）应该在控制信息表格中显示
      ]
      return !excludeIds.includes(cmd.id)
    })
  })

  /**
   * 测试模式接触器控制数据
   */
  const testModeContactorData = computed(() => {
    return getAllCommandsFunc().filter(cmd => cmd.id === 'contactor_ctrl_test')
  })

  /**
   * 测试模式其他控制数据
   */
  const testModeOtherData = computed(() => {
    return getAllCommandsFunc().filter(cmd =>
      ['hsd_ctrl_test', 'lsd_ctrl_test', 'io_ctrl_test'].includes(cmd.id)
    )
  })

  /**
   * 接触器独立执行数据
   */
  const contactorIndependentData = computed(() => {
    return getAllCommandsFunc().filter(cmd => cmd.id === 'contactor_standalone_ctrl')
  })

  /**
   * 反馈状态表格数据
   */
  const feedbackStatusData = computed(() => {
    return [
      {
        id: 'contactor_ctrl_result',
        name: '接触器执行策略结果',
        value: feedbackStatus.contactor_ctrl_result,
        severity: getStatusSeverity(feedbackStatus.contactor_ctrl_result)
      },
      {
        id: 'insulation_detect_result',
        name: '绝缘电阻检测执行结果',
        value: feedbackStatus.insulation_detect_result,
        severity: getStatusSeverity(feedbackStatus.insulation_detect_result)
      }
    ]
  })

  return {
    allRemoteCommands,
    controlCommandTableData,
    testModeContactorData,
    testModeOtherData,
    contactorIndependentData,
    feedbackStatusData
  }
}

/**
 * 创建堆模式计算属性的工厂函数
 * @param {Function} getAllCommandsFunc - 获取所有命令的函数
 */
function createBlockComputedProperties(getAllCommandsFunc) {
  /**
   * 所有遥控命令
   */
  const allRemoteCommands = computed(() => {
    return getAllCommandsFunc()
  })

  /**
   * 控制信息表格数据 - 显示所有可控制的命令
   */
  const controlCommandTableData = computed(() => {
    return getAllCommandsFunc().filter(cmd => {
      // 排除隐藏类型的命令（如查询命令）
      return cmd.uiType !== 'hidden'
    })
  })

  /**
   * 反馈状态表格数据
   */
  const feedbackStatusData = computed(() => {
    return [
      {
        id: 'batt_stack_ctrl_switch_result',
        name: '堆接触器执行策略结果',
        value: feedbackStatus.batt_stack_ctrl_switch_result,
        severity: getStatusSeverity(feedbackStatus.batt_stack_ctrl_switch_result)
      }
    ]
  })

  return {
    allRemoteCommands,
    controlCommandTableData,
    feedbackStatusData
  }
}

// ========== 核心业务函数 ==========


/**
 * 执行前置条件命令
 * @param {Object} preCondition - 前置条件配置 {topic, value}
 * @param {Array} selectedClusters - 选中的设备列表
 */
async function executePreConditionCommand(preCondition, selectedClusters) {
  try {
    const { topic, value } = preCondition

    // 设置前置条件执行标记
    isExecutingPreCondition.value = true
    currentPreConditionTopic.value = topic

    // 序列化前置条件命令值
    let payload
    if (typeof value === 'number') {
      // 假设前置条件都是u16类型（根据接触器执行策略的配置）
      const lowByte = value & 0xFF
      const highByte = (value >> 8) & 0xFF
      payload = lowByte.toString(16).padStart(2, '0') + highByte.toString(16).padStart(2, '0')
    } else {
      payload = value.toString()
    }

    console.log(`[前置条件] 执行前置条件命令:`, {
      topic,
      value,
      payload,
      targetDevices: selectedClusters.length
    })

    // 向所有选中设备发送前置条件命令
    const promises = selectedClusters.map(async (clusterKey) => {
      const [blockId, clusterId] = clusterKey.split('-').map(Number)
      const fullTopic = `bms/host/s2d/b${blockId}/c${clusterId}/${topic}`

      console.log(`[前置条件] 发送到设备 B${blockId}/C${clusterId}:`, fullTopic, payload)
      return window.electronAPI.mqttPublish(fullTopic, payload)
    })

    await Promise.all(promises)

    return { success: true }
  } catch (error) {
    console.error('[前置条件] 执行失败:', error)
    // 确保出错时也清除标记
    isExecutingPreCondition.value = false
    currentPreConditionTopic.value = ''
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 创建执行遥控命令函数（支持双模式）
 * @param {string} selectorMode - 选择器模式 ('cluster' | 'block')
 * @param {Object} store - 对应的store实例
 * @param {Function} getCommandConfigFunc - 获取命令配置的函数
 * @returns {Function} 执行遥控命令的函数
 */
function createExecuteRemoteCommand(selectorMode, store, getCommandConfigFunc) {
  return async function executeRemoteCommand(commandId, value = null) {
    try {
      const config = getCommandConfigFunc(commandId)
      if (!config) {
        throw new Error(`未找到命令配置: ${commandId}`)
      }

      // 根据模式获取选中的设备
      const selectedDevices = selectorMode === 'cluster' 
        ? store.selectedClustersForWrite 
        : store.selectedBlocksForWrite

      if (!selectedDevices || selectedDevices.length === 0) {
        return {
          success: false,
          error: '请先在导航栏选择要下发的目标设备'
        }
      }

      // 检查是否需要执行前置条件
      if (config.requiresPreCondition && config.preConditionCommand) {
        console.log(`[前置条件] ${config.name} 需要先执行前置条件:`, config.preConditionCommand)

        // 先执行前置条件命令
        const preResult = await executePreConditionCommand(config.preConditionCommand, selectedDevices)
        if (!preResult.success) {
          return {
            success: false,
            error: `前置条件执行失败: ${preResult.error}`
          }
        }

        // 等待一小段时间确保前置条件生效
        await new Promise(resolve => setTimeout(resolve, 300))
        console.log(`[前置条件] 前置条件执行成功，继续执行主命令`)
      }

    // 添加到执行中状态
    executingCommands.value.add(commandId)

    // 确定命令值
    let commandValue = value
    // 兼容不同配置格式：type（簇模式）和uiType（堆模式）
    const configType = config.type || config.uiType
    if (configType === 'button') {
      // 按钮类型使用配置中的默认值
      commandValue = config.defaultValue || config.value || 1
    }

      console.log(`[遥控命令] 开始执行命令: ${config.name}`, {
        commandId,
        value: commandValue,
        targets: selectedDevices
      })

    // 数据序列化
    let payload = ''
    if (config.dataType === 'u8') {
      // 对于0xFF这样的单字节值，直接转换为ff而不是00ff
      payload = commandValue.toString(16).toLowerCase()
      console.log(`[序列化] u8类型序列化结果:`, {
        原始值: commandValue,
        十六进制: payload,
        字节长度: Math.ceil(payload.length / 2)
      })
    } else if (config.dataType === 'u16') {
      // 小端序
      const lowByte = commandValue & 0xFF
      const highByte = (commandValue >> 8) & 0xFF
      payload = lowByte.toString(16).padStart(2, '0') + highByte.toString(16).padStart(2, '0')
      console.log(`[序列化] u16类型序列化结果:`, {
        原始值: commandValue,
        二进制: commandValue.toString(2).padStart(16, '0'),
        低字节: lowByte,
        高字节: highByte,
        十六进制: payload,
        字节长度: payload.length / 2
      })
    } else {
      throw new Error(`不支持的数据类型: ${config.dataType}`)
    }

      // 向所有选中的设备发送命令
      const promises = selectedDevices.map(async (deviceKey) => {
        let topic, logInfo
        
        if (selectorMode === 'cluster') {
          // 簇模式：解析 "1-1" 格式
          const [blockId, clusterId] = deviceKey.split('-').map(Number)
          topic = `bms/host/s2d/b${blockId}/c${clusterId}/${config.topic}`
          logInfo = `堆${blockId}/簇${clusterId}`
        } else {
          // 堆模式：解析 "block1" 格式或直接使用数字
          const blockNumber = typeof deviceKey === 'string' && deviceKey.startsWith('block') 
            ? Number(deviceKey.replace('block', ''))
            : Number(deviceKey)
          topic = config.topic.replace('{block}', blockNumber)
          logInfo = `堆${blockNumber}`
        }

        console.log(`[MQTT发送] 向设备 ${logInfo} 发送命令:`, {
          topic,
          payload,
          command: config.name
        })

        // 发送MQTT消息
        await window.electronAPI.mqttPublish(topic, payload)
        console.log(`[MQTT发送] 命令发送成功: ${logInfo}`)
        return deviceKey
      })

      // 等待所有命令发送完成
      const results = await Promise.allSettled(promises)
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length

      console.log(`[RemoteCommand] 批量命令发送完成: ${commandId}，成功: ${successCount}，失败: ${failCount}`)

      // 返回结果供组件处理Toast
      return {
        success: true,
        successCount,
        failCount,
        commandName: config.name
      }

    } catch (error) {
      console.error('[RemoteCommand] 命令执行失败:', error)
      return {
        success: false,
        error: error.message
      }
    } finally {
      // 清除前置条件执行标记
      isExecutingPreCondition.value = false
      currentPreConditionTopic.value = ''
      executingCommands.value.delete(commandId)

      setTimeout(() => {
        isExecutingPreCondition.value = false
        currentPreConditionTopic.value = ''
        console.log('[前置条件] 延迟清除前置条件标记')
      }, 2000)
    }
  }
}


/**
 * 处理多选下拉框命令
 * @param {string} commandId - 命令ID
 * @param {Array} selectedOptions - 选中的选项值数组
 */
async function handleMultiselectCommand(commandId, selectedOptions) {
  if (!selectedOptions || selectedOptions.length === 0) {
    return {
      success: false,
      error: '请至少选择一个控制项'
    }
  }

  const config = getCommandConfig(commandId)
  if (!config) return { success: false, error: '未找到命令配置' }

  try {
    // 添加到执行中状态
    executingCommands.value.add(commandId)

    // 计算选中选项的组合值（按位或运算）
    const combinedValue = selectedOptions.reduce((acc, value) => acc | value, 0)

    console.log(`[多选命令] ${config.name} 选中选项:`, {
      selectedOptions,
      combinedValue: combinedValue,
      binaryValue: combinedValue.toString(2).padStart(16, '0')
    })

    // 如果需要确认，显示确认对话框
    if (config.confirmRequired) {
      confirmMessage.value = config.confirmMessage || '确定要执行此操作吗？'
      pendingCommand.value = { commandId, value: combinedValue }
      showConfirmDialog.value = true
      return { success: true, showDialog: true }
    } else {
      // 直接执行命令
      const result = await executeRemoteCommand(commandId, combinedValue)
      return result
    }

  } catch (error) {
    console.error('[多选命令] 执行失败:', error)
    return {
      success: false,
      error: error.message
    }
  } finally {
    // 移除执行中状态
    executingCommands.value.delete(commandId)
  }
}

/**
 * 处理复选框组命令
 * @param {string} commandId - 命令ID
 * @param {Array} selectedOptions - 选中的选项值数组
 */
async function handleCheckboxGroupCommand(commandId, selectedOptions) {
  if (!selectedOptions || selectedOptions.length === 0) {
    return {
      success: false,
      error: '请至少选择一个控制项'
    }
  }

  const config = getCommandConfig(commandId)
  if (!config) return { success: false, error: '未找到命令配置' }

  try {
    // 添加到执行中状态
    executingCommands.value.add(commandId)

    // 计算选中选项的组合值（按位或运算）
    const combinedValue = selectedOptions.reduce((acc, value) => acc | value, 0)

    console.log(`[复选框组命令] ${config.name} 选中选项:`, {
      selectedOptions,
      combinedValue: combinedValue,
      binaryValue: combinedValue.toString(2).padStart(16, '0')
    })

    // 如果需要确认，显示确认对话框
    if (config.confirmRequired) {
      confirmMessage.value = config.confirmMessage || '确定要执行此操作吗？'
      pendingCommand.value = { commandId, value: combinedValue }
      showConfirmDialog.value = true
      return { success: true, showDialog: true }
    } else {
      // 直接执行命令
      const result = await executeRemoteCommand(commandId, combinedValue)
      return result
    }

  } catch (error) {
    console.error('[复选框组命令] 执行失败:', error)
    return {
      success: false,
      error: error.message
    }
  } finally {
    // 移除执行中状态
    executingCommands.value.delete(commandId)
  }
}

// ========== Bit位字段处理函数 ==========

/**
 * 获取bit位字段的值
 * @param {string} commandId - 命令ID
 * @param {Object} field - 字段配置
 * @returns {number} 字段值
 */
function getBitFieldValue(commandId, field) {
  if (!bitFieldValues[commandId]) {
    bitFieldValues[commandId] = {}
  }
  return bitFieldValues[commandId][field.name] || 0
}

/**
 * 设置bit位字段的值
 * @param {string} commandId - 命令ID
 * @param {Object} field - 字段配置
 * @param {number} value - 要设置的值
 */
function setBitFieldValue(commandId, field, value) {
  if (!bitFieldValues[commandId]) {
    bitFieldValues[commandId] = {}
  }
  bitFieldValues[commandId][field.name] = value
  console.log(`[BitField] 设置 ${commandId}.${field.name} = ${value}`)
}

/**
 * 获取单个bit位的值（用于复选框）
 * @param {string} commandId - 命令ID
 * @param {number} bit - bit位
 * @returns {boolean} bit位值
 */
function getBitValue(commandId, bit) {
  if (!bitFieldValues[commandId]) {
    bitFieldValues[commandId] = {}
  }
  return bitFieldValues[commandId][`bit${bit}`] || false
}

/**
 * 设置单个bit位的值（用于复选框）
 * @param {string} commandId - 命令ID
 * @param {number} bit - bit位
 * @param {boolean} value - 要设置的值
 */
function setBitValue(commandId, bit, value) {
  if (!bitFieldValues[commandId]) {
    bitFieldValues[commandId] = {}
  }
  bitFieldValues[commandId][`bit${bit}`] = value
  console.log(`[BitField] 设置 ${commandId}.bit${bit} = ${value}`)
}

/**
 * 检查是否有bit位字段设置了值
 * @param {string} commandId - 命令ID
 * @returns {boolean} 是否有值
 */
function hasBitFieldValue(commandId) {
  if (!bitFieldValues[commandId]) return false
  return Object.values(bitFieldValues[commandId]).some(value => value !== 0 && value !== false)
}

/**
 * 获取bit位字段的组合值
 * @param {string} commandId - 命令ID
 * @param {Object} commandConfig - 命令配置
 * @returns {number} 组合后的值
 */
function getBitFieldCombinedValue(commandId, commandConfig) {
  if (!bitFieldValues[commandId]) return 0

  let combinedValue = 0
  const values = bitFieldValues[commandId]

  commandConfig.bitFields.forEach(field => {
    if (field.options) {
      // 多位字段（如2位控制）
      const fieldValue = values[field.name] || 0
      combinedValue |= (fieldValue << field.startBit)
    } else {
      // 单bit字段（复选框）
      const bitValue = values[`bit${field.bit}`] || false
      if (bitValue) {
        combinedValue |= (1 << field.bit)
      }
    }
  })

  return combinedValue
}

// ========== 命令执行和对话框处理 ==========

/**
 * 处理命令执行（带确认对话框）
 * @param {string} commandId - 命令ID
 * @param {*} value - 命令值
 */
async function handleCommandExecution(commandId, value = null) {
  const config = getCommandConfig(commandId)
  if (!config) return { success: false, error: '未找到命令配置' }

  // 如果是bitfield类型，显示bit位控制弹窗
  if (config.type === 'bitfield') {
    currentBitFieldCommand.value = config
    showBitFieldDialog.value = true
    return { success: true, showDialog: true }
  }

  // 如果需要确认，显示确认对话框
  if (config.confirmRequired) {
    confirmMessage.value = config.confirmMessage || '确定要执行此命令吗？'
    pendingCommand.value = { commandId, value }
    showConfirmDialog.value = true
    return { success: true, showDialog: true }
  } else {
    // 直接执行命令
    const result = await executeRemoteCommand(commandId, value)
    return result
  }
}

/**
 * 确认bit位控制命令
 */
function confirmBitFieldCommand() {
  if (!currentBitFieldCommand.value) return

  const commandId = currentBitFieldCommand.value.id
  const value = getBitFieldCombinedValue(commandId, currentBitFieldCommand.value)

  showBitFieldDialog.value = false

  // 如果需要确认，显示确认对话框
  if (currentBitFieldCommand.value.confirmRequired) {
    confirmMessage.value = currentBitFieldCommand.value.confirmMessage || '确定要执行此命令吗？'
    pendingCommand.value = { commandId, value }
    showConfirmDialog.value = true
  } else {
    executeRemoteCommand(commandId, value)
  }
}

/**
 * 确认执行命令
 */
async function executeConfirmedCommand() {
  if (!pendingCommand.value) return

  const { commandId, value } = pendingCommand.value
  showConfirmDialog.value = false
  pendingCommand.value = null

  const result = await executeRemoteCommand(commandId, value)
  return result
}

/**
 * 处理复选框bit位控制
 * @param {string} commandId - 命令ID
 * @param {Object} commandConfig - 命令配置
 */
async function handleCheckboxBitFieldControl(commandId, commandConfig) {
  try {
    let combinedValue = 0

    // 检查是否是多下拉框类型
    if (commandConfig.type === 'multi_dropdown' && commandConfig.dropdowns) {
      // 处理多下拉框类型
      commandConfig.dropdowns.forEach(dropdown => {
        const stateKey = `${commandId}_${dropdown.name}`
        const selectedValue = selectedValues[stateKey] || 0

        // 将选择的值按照bit位置放入最终值中
        combinedValue |= (selectedValue << dropdown.bitStart)
      })

      console.log(`[多下拉框控制] ${commandConfig.name} 选择状态:`, {
        dropdownStates: commandConfig.dropdowns.map(dropdown => ({
          name: dropdown.name,
          value: selectedValues[`${commandId}_${dropdown.name}`] || 0,
          bitStart: dropdown.bitStart
        })),
        combinedValue,
        hexValue: '0x' + combinedValue.toString(16).padStart(4, '0').toUpperCase()
      })
    } else {
      // 处理原有的复选框bit位类型
      const selectedBits = checkboxStates[commandId] || {}
      //关键：bit位转换为数值
      Object.keys(selectedBits).forEach(bitIndex => {
        if (selectedBits[bitIndex]) {
          combinedValue |= (1 << parseInt(bitIndex))
        }
      })

      console.log(`[复选框bit位控制] ${commandConfig.name} 选中bit位:`, {
        selectedBits,
        combinedValue: combinedValue,
        binaryValue: combinedValue.toString(2).padStart(16, '0')
      })

      if (combinedValue === 0) {
        return {
          success: false,
          error: '请至少选择一个控制项'
        }
      }
    }

    // 检查是否需要确认
    if (commandConfig.needConfirm) {
      // 设置待执行命令和确认消息
      pendingCommand.value = {
        commandId,
        value: combinedValue,
        commandConfig
      }
      confirmMessage.value = commandConfig.confirmMessage || `确定要执行 ${commandConfig.name} 吗？`
      showConfirmDialog.value = true
      
      return {
        success: true,
        message: '等待用户确认'
      }
    }

    // 添加到执行中状态
    executingCommands.value.add(commandId)

    // 执行命令
    const result = await executeRemoteCommand(commandId, combinedValue)
    return result

  } catch (error) {
    console.error('[复选框bit位控制] 执行失败:', error)
    return {
      success: false,
      error: error.message
    }
  } finally {
    // 移除执行中状态
    executingCommands.value.delete(commandId)
  }
}

// ========== 工具函数 ==========

/**
 * 解析接触器执行策略结果
 * @param {number} value - 已解析的数值 (0, 1, 2)
 * @returns {string} 状态文本
 */
function parseContactorCtrlResult(value) {
  switch (value) {
    case 0:
      return '执行中'
    case 1:
      return '执行失败'
    case 2:
      return '执行成功'
    default:
      return `未知状态(${value})`
  }
}

/**
 * 解析绝缘电阻检测执行结果
 * @param {number} value - 已解析的数值 (0, 1, 2)
 * @returns {string} 状态文本
 */
function parseInsulationDetectResult(value) {
  switch (value) {
    case 0:
      return '空闲'
    case 1:
      return '检测中'
    case 2:
      return '检测完成'
    default:
      return `未知状态(${value})`
  }
}

/**
 * 解析接触器执行策略结果
 * @param {number} value - 已解析的数值 (0, 1, 2, 3)
 * @returns {string} 状态文本
 */
function parseBattStackCtrlSwitchResult(value) {
  switch (value) {
    case 0:
      return '空闲'
    case 1:
      return '执行中'
    case 2:
      return '执行失败'
    case 3:
      return '执行成功'
    default:
      return `未知状态(${value})`
  }
}


/**
 * 获取选中的复选框数量
 * @param {string} commandId - 命令ID
 * @returns {number} 选中的复选框数量
 */
function getSelectedCheckboxCount(commandId) {
  const selectedBits = checkboxStates[commandId] || {}
  return Object.values(selectedBits).filter(Boolean).length
}

/**
 * 获取状态标签的严重性等级
 * @param {string} statusValue - 状态值
 * @returns {string} 严重性等级
 */
function getStatusSeverity(statusValue) {
  switch (statusValue) {
    case '执行成功':
    case '检测完成':
    case '成功':
      return 'success'
    case '执行失败':
    case '失败':
    case '参数错误':
    case '设备忙':
    case '不支持':
    case '超时':
      return 'danger'
    case '无应答':
      return 'warning'
    default:
      return 'info'
  }
}

/**
 * 初始化复选框状态
 */
function initializeCheckboxStates() {
  // 检查是否在簇模式（通过检查是否有testModeContactorData来判断）
  try {
    // 尝试访问簇模式特有的计算属性
    if (typeof testModeContactorData !== 'undefined' && testModeContactorData.value) {
  // 初始化测试模式接触器控制复选框状态
  const testModeCommands = testModeContactorData.value
  testModeCommands.forEach(command => {
    if (command.bitFields) {
      checkboxStates[command.id] = {}
      command.bitFields.forEach(bitField => {
        checkboxStates[command.id][bitField.bit] = false
      })
    }
  })
    }

    if (typeof contactorIndependentData !== 'undefined' && contactorIndependentData.value) {
  // 初始化独立执行接触器控制下拉框状态
  const independentCommands = contactorIndependentData.value
  independentCommands.forEach(command => {
    if (command.dropdowns) {
      // 为多下拉框类型初始化状态
      command.dropdowns.forEach(dropdown => {
        const stateKey = `${command.id}_${dropdown.name}`
        selectedValues[stateKey] = 0 // 默认选择"无效"
      })
    } else if (command.bitFields) {
      // 保持原有的bitFields兼容性（如果有其他命令使用）
      checkboxStates[command.id] = {}
      command.bitFields.forEach(bitField => {
        checkboxStates[command.id][bitField.bit] = false
      })
    }
  })
    }

    if (typeof testModeContactorData !== 'undefined' && typeof testModeOtherData !== 'undefined' 
        && testModeContactorData.value && testModeOtherData.value) {
  // 初始化复选框组的选中值
  const allTestCommands = [...testModeContactorData.value, ...testModeOtherData.value]
  allTestCommands.forEach(command => {
    if (command.type === 'checkbox_group') {
      selectedValues[command.id] = []
    }
  })
    }

    if (typeof controlCommandTableData !== 'undefined' && controlCommandTableData.value) {
  // 初始化控制信息表格中的复选框组和下拉框选中值
  const allControlCommands = controlCommandTableData.value
  allControlCommands.forEach(command => {
    if (command.uiType === 'checkbox_group' && command.bitFields) {
      // 为复选框组类型初始化复选框状态
      checkboxStates[command.id] = {}
      command.bitFields.forEach(bitField => {
        checkboxStates[command.id][bitField.bit] = false
      })
    }
  })

  // 初始化下拉框默认选中第一个选项
  allControlCommands.forEach(command => {
    if (command.uiType === 'dropdown' && command.options && command.options.length > 0) {
      selectedValues[command.id] = command.options[0].value
    }
  })
    }

  console.log('[RemoteCommand] 复选框状态初始化完成')
  } catch (error) {
    console.log('[RemoteCommand] 跳过簇模式特有的状态初始化（堆模式）')
  }
}

// ========== 反馈状态查询功能 ==========

/**
 * 执行单个反馈查询命令（针对当前选择的设备）
 * @param {string} commandId - 查询命令ID
 * @param {string} targetCluster - 目标设备（格式：'1-1'）
 */
async function executeFeedbackQuery(commandId, targetCluster) {
  try {
    const config = getCommandConfig(commandId)
    if (!config || !config.isPollingCommand) {
      console.warn(`[反馈查询] 无效的查询命令: ${commandId}`)
      return
    }

    if (!targetCluster) {
      console.warn(`[反馈查询] 未指定目标设备: ${commandId}`)
      return
    }

    // 解析目标设备
    const [blockId, clusterId] = targetCluster.split('-').map(Number)
    const topic = `bms/host/s2d/b${blockId}/c${clusterId}/${config.topic}`

    // 数据序列化 - 与现有遥调逻辑保持一致
    let payload = ''
    if (config.dataType === 'u8') {
      payload = config.value.toString(16).padStart(2, '0')
      // console.log(`[反馈查询] u8类型序列化结果:`, {
      //   原始值: config.value,
      //   十六进制: payload,
      //   字节长度: payload.length / 2
      // })
    } else {
      throw new Error(`[反馈查询] 不支持的数据类型: ${config.dataType}`)
    }

    // console.log(`[反馈查询] 向设备 堆${blockId}/簇${clusterId} 发送查询:`, {
    //   topic,
    //   payload,
    //   command: config.name
    // })

    // 发送MQTT消息
    await window.electronAPI.mqttPublish(topic, payload)
    // console.log(`[反馈查询] 查询命令发送成功: 堆${blockId}/簇${clusterId}`)

  } catch (error) {
    console.error(`[反馈查询] 查询命令执行失败 ${commandId}:`, error)
  }
}

/**
 * 执行所有反馈状态查询（针对当前选择的设备）
 * @param {string} targetDevice - 目标设备（簇模式：'1-1'，堆模式：'1'）
 * @param {string} mode - 模式：'cluster' 或 'block'
 */
async function queryAllFeedbackStatus(targetDevice, mode = 'cluster') {
  if (!feedbackPollingActive.value) return

  if (!targetDevice) {
    console.warn('[反馈查询] 未选择目标设备，跳过查询')
    return
  }

  try {
    if (mode === 'cluster') {
      // 簇模式：查询接触器执行策略结果和绝缘电阻检测结果
      await executeFeedbackQuery('get_contactor_ctrl_result', targetDevice)

    // 稍微延迟后查询绝缘电阻检测结果，避免同时发送
    setTimeout(async () => {
      if (feedbackPollingActive.value) {
          await executeFeedbackQuery('get_insulation_detect_result', targetDevice)
      }
    }, 100)
    } else {
      // 堆模式：查询电池堆控制开关执行结果
      await executeFeedbackQuery('get_batt_stack_ctrl_switch_result', targetDevice)
    }
  } catch (error) {
    console.error('[反馈查询] 批量查询失败:', error)
  }
}

/**
 * 启动反馈状态定时查询
 * @param {function} getTargetDevice - 获取目标设备的函数
 * @param {string} mode - 模式：'cluster' 或 'block'
 */
function startFeedbackPolling(getTargetDevice, mode = 'cluster') {
  if (feedbackPollingActive.value) {
    console.log('[反馈查询] 定时查询已在运行中')
    return
  }

  feedbackPollingActive.value = true

  // 立即执行一次查询
  const targetDevice = getTargetDevice()
  queryAllFeedbackStatus(targetDevice, mode)

  // 启动定时器，每3秒查询一次
  feedbackPollingTimer = setInterval(() => {
    const currentTarget = getTargetDevice()
    queryAllFeedbackStatus(currentTarget, mode)
  }, 3000)

  console.log(`[反馈查询] 定时查询已启动，模式：${mode}，间隔3秒`)
}

/**
 * 停止反馈状态定时查询
 */
function stopFeedbackPolling() {
  if (!feedbackPollingActive.value) {
    console.log('[反馈查询] 定时查询未在运行')
    return
  }

  feedbackPollingActive.value = false

  if (feedbackPollingTimer) {
    clearInterval(feedbackPollingTimer)
    feedbackPollingTimer = null
  }

  console.log('[反馈查询] 定时查询已停止')
}

/**
 * 处理反馈查询的应答数据
 * @param {string} commandId - 命令ID
 * @param {Object} responseData - 应答数据
 */
function handleFeedbackQueryResponse(commandId, responseData) {
  if (!responseData || responseData.error) {
    console.warn(`[反馈查询] 查询失败 ${commandId}:`, responseData?.message || '无应答')
    return
  }

  try {
    // 解析应答数据 - 优先使用value字段（查询应答的状态数据）
    const dataValue = responseData.data?.value || responseData.value || 0

    switch (commandId) {
      case 'get_contactor_ctrl_result':
        feedbackStatus.contactor_ctrl_result = parseContactorCtrlResult(dataValue)
        console.log(`[反馈查询] 接触器执行策略结果: ${feedbackStatus.contactor_ctrl_result} (原始值: ${dataValue})`)
        break

      case 'get_insulation_detect_result':
        feedbackStatus.insulation_detect_result = parseInsulationDetectResult(dataValue)
        console.log(`[反馈查询] 绝缘电阻检测执行结果: ${feedbackStatus.insulation_detect_result} (原始值: ${dataValue})`)
        break

      case 'get_batt_stack_ctrl_switch_result':
        console.log(`[反馈查询] 堆接触器执行策略结果 - 原始数据值: ${dataValue} (类型: ${typeof dataValue})`)
        feedbackStatus.batt_stack_ctrl_switch_result = parseBattStackCtrlSwitchResult(dataValue)
        console.log(`[反馈查询] 堆接触器执行策略结果: ${feedbackStatus.batt_stack_ctrl_switch_result} (原始值: ${dataValue})`)
        break

      default:
        console.warn(`[反馈查询] 未知的查询命令: ${commandId}`)
    }
  } catch (error) {
    console.error(`[反馈查询] 处理应答数据失败 ${commandId}:`, error)
  }
}

// ========== 事件监听管理 ==========

/**
 * 启动遥控命令服务（初始化状态）
 */
function startRemoteCommandListeners() {
  // 初始化复选框状态
  initializeCheckboxStates()
  console.log(`[RemoteCommand] 遥控命令服务已启动`)
}

/**
 * 停止遥控命令服务
 */
function stopRemoteCommandListeners() {
  console.log(`[RemoteCommand] 遥控命令服务已停止`)
}

// ========== Vue组合式API ==========

/**
 * 遥控命令组合式API
 * 为Vue组件提供响应式状态和方法
 */
export function useRemoteCommand(options = {}) {
  // 选择模式：cluster | block（默认 cluster，兼容旧页面）
  const selectorMode = options.selectorMode === 'block' ? 'block' : 'cluster'
  
  // 根据模式选择对应的store和配置函数
  let store, getCommandConfigFunc, getAllCommandsFunc
  if (selectorMode === 'cluster') {
    store = useClusterStore()
    getCommandConfigFunc = getCommandConfig
    getAllCommandsFunc = getAllCommands
  } else {
    store = useBlockStore()
    getCommandConfigFunc = getBlockCommandConfig
    getAllCommandsFunc = getAllBlockCommands
  }
  
  // 创建对应模式的executeRemoteCommand函数
  const executeRemoteCommand = createExecuteRemoteCommand(selectorMode, store, getCommandConfigFunc)
  
  // 创建对应模式的计算属性
  const computedProps = selectorMode === 'cluster' 
    ? createClusterComputedProperties(getAllCommandsFunc)
    : createBlockComputedProperties(getAllCommandsFunc)
  
  // 创建适配当前模式的反馈轮询函数
  const adaptedStartFeedbackPolling = (getTargetDevice) => {
    if (feedbackPollingActive.value) {
      console.log('[反馈查询] 定时查询已在运行中')
      return
    }

    feedbackPollingActive.value = true

    // 立即执行一次查询
    const targetDevice = getTargetDevice()
    adaptedQueryAllFeedbackStatus(targetDevice)

    // 启动定时器，每3秒查询一次
    feedbackPollingTimer = setInterval(() => {
      const currentTarget = getTargetDevice()
      adaptedQueryAllFeedbackStatus(currentTarget)
    }, 3000)

    console.log(`[反馈查询] 定时查询已启动，模式：${selectorMode}，间隔3秒`)
  }
  
  // 创建适配当前模式的反馈查询函数
  const adaptedExecuteFeedbackQuery = async (commandId, targetDevice) => {
    try {
      const config = getCommandConfigFunc(commandId)
      if (!config) {
        console.warn(`[反馈查询] 未找到查询命令配置: ${commandId}`)
        return
      }

      if (!targetDevice) {
        console.warn(`[反馈查询] 未指定目标设备: ${commandId}`)
        return
      }

      let topic, payload
      
      if (selectorMode === 'cluster') {
        // 簇模式：解析目标设备格式 '1-1' 
        const [blockId, clusterId] = targetDevice.split('-').map(Number)
        topic = `bms/host/s2d/b${blockId}/c${clusterId}/${config.topic}`
      } else {
        // 堆模式：解析目标设备格式 'block1' 或 '1'
        const blockId = typeof targetDevice === 'string' && targetDevice.startsWith('block') 
          ? Number(targetDevice.replace('block', ''))
          : Number(targetDevice)
        topic = config.topic.replace('{block}', blockId)
      }

      // 数据序列化
      if (config.dataType === 'u8') {
        const value = config.value || 0xFF
        payload = value.toString(16).toLowerCase()
      } else if (config.dataType === 'u16') {
        const value = config.value || 0xFF
        payload = value.toString(16).toLowerCase()
      } else {
        throw new Error(`[反馈查询] 不支持的数据类型: ${config.dataType}`)
      }

      // 发送MQTT消息
      await window.electronAPI.mqttPublish(topic, payload)
      
    } catch (error) {
      console.error(`[反馈查询] 查询命令执行失败 ${commandId}:`, error)
    }
  }
  
  // 创建适配当前模式的批量反馈查询函数
  const adaptedQueryAllFeedbackStatus = async (targetDevice) => {
    if (!feedbackPollingActive.value) return

    if (!targetDevice) {
      console.warn('[反馈查询] 未选择目标设备，跳过查询')
      return
    }

    try {
      if (selectorMode === 'cluster') {
        // 簇模式：查询接触器执行策略结果和绝缘电阻检测结果
        await adaptedExecuteFeedbackQuery('get_contactor_ctrl_result', targetDevice)

        // 稍微延迟后查询绝缘电阻检测结果，避免同时发送
        setTimeout(async () => {
          if (feedbackPollingActive.value) {
            await adaptedExecuteFeedbackQuery('get_insulation_detect_result', targetDevice)
          }
        }, 100)
              } else {
          // 堆模式：查询接触器执行策略结果
          await adaptedExecuteFeedbackQuery('get_batt_stack_ctrl_switch_result', targetDevice)
        }
    } catch (error) {
      console.error('[反馈查询] 批量查询失败:', error)
    }
  }
  
  // 创建适配当前模式的命令执行函数
  const adaptedHandleCommandExecution = async (commandId, value = null) => {
    const config = getCommandConfigFunc(commandId)
    if (!config) return { success: false, error: '未找到命令配置' }

    // 如果是checkbox_group类型，显示bit位控制弹窗
    if (config.uiType === 'checkbox_group') {
      currentBitFieldCommand.value = config
      showBitFieldDialog.value = true
      return { success: true, showDialog: true }
    }

    // 检查是否需要确认（适配不同的属性名）
    const needsConfirm = config.needConfirm || config.confirmRequired
    if (needsConfirm) {
      confirmMessage.value = config.confirmMessage || '确定要执行此命令吗？'
      pendingCommand.value = { commandId, value }
      showConfirmDialog.value = true
      return { success: true, showDialog: true }
    } else {
      // 直接执行命令
      const result = await executeRemoteCommand(commandId, value)
      return result
    }
  }
  
  // 创建适配当前模式的确认位字段命令函数
  const adaptedConfirmBitFieldCommand = async () => {
    if (!currentBitFieldCommand.value) return

    const commandId = currentBitFieldCommand.value.id
    const value = getBitFieldCombinedValue(commandId, currentBitFieldCommand.value)

    showBitFieldDialog.value = false

    // 检查是否需要确认（适配不同的属性名）
    const needsConfirm = currentBitFieldCommand.value.needConfirm || currentBitFieldCommand.value.confirmRequired
    if (needsConfirm) {
      confirmMessage.value = currentBitFieldCommand.value.confirmMessage || '确定要执行此命令吗？'
      pendingCommand.value = { commandId, value }
      showConfirmDialog.value = true
    } else {
      const result = await executeRemoteCommand(commandId, value)
      return result
    }
  }
  
  // 创建适配当前模式的确认命令执行函数
  const adaptedExecuteConfirmedCommand = async () => {
    if (!pendingCommand.value) return

    const { commandId, value } = pendingCommand.value
    showConfirmDialog.value = false
    pendingCommand.value = null

    const result = await executeRemoteCommand(commandId, value)
    return result
  }
  
  return {
    // 响应式状态
    selectedValues,
    bitFieldValues,
    executingCommands,
    showBitFieldDialog,
    showConfirmDialog,
    currentBitFieldCommand,
    confirmMessage,
    pendingCommand,
    feedbackStatus,
    feedbackPollingActive,
    checkboxStates,
    
    // 前置条件执行状态
    isExecutingPreCondition,
    currentPreConditionTopic,

    // 计算属性
    ...computedProps,

    // 方法
    executeRemoteCommand,
    handleMultiselectCommand,
    handleCheckboxGroupCommand,
    handleCommandExecution: adaptedHandleCommandExecution,
    confirmBitFieldCommand: adaptedConfirmBitFieldCommand,
    executeConfirmedCommand: adaptedExecuteConfirmedCommand,
    handleCheckboxBitFieldControl,
    getBitFieldValue,
    setBitFieldValue,
    getBitValue,
    setBitValue,
    hasBitFieldValue,
    getBitFieldCombinedValue,
    getStatusSeverity,
    initializeCheckboxStates,
    executeFeedbackQuery: adaptedExecuteFeedbackQuery,
    queryAllFeedbackStatus: adaptedQueryAllFeedbackStatus,
    startFeedbackPolling: adaptedStartFeedbackPolling,
    stopFeedbackPolling,
    handleFeedbackQueryResponse,
    startRemoteCommandListeners,
    stopRemoteCommandListeners
  }
}

// 创建默认的executeRemoteCommand函数（簇模式，向后兼容）
const defaultExecuteRemoteCommand = createExecuteRemoteCommand(
  'cluster',
  useClusterStore(),
  getCommandConfig
)

// 为全局函数提供默认的executeRemoteCommand实现
const executeRemoteCommand = defaultExecuteRemoteCommand

// 导出单独的函数供其他模块使用
export {
  defaultExecuteRemoteCommand as executeRemoteCommand,
  startRemoteCommandListeners,
  stopRemoteCommandListeners,
  startFeedbackPolling,
  stopFeedbackPolling,
  handleFeedbackQueryResponse,
  initializeCheckboxStates
}
