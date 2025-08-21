/**
 * 遥控命令配置文件
 * 定义所有遥控命令的静态配置信息
 * 特点：每个命令操作单个寄存器，发送单个数值到设备
 */

// 遥控命令配置 - 扁平化结构，便于通过命令ID直接查找
export const REMOTE_COMMANDS = {
  // ========== 接触器控制 ==========
  contactor_ctrl: {
    name: '下设接触器执行策略',
    topic: 'contactor_ctrl',
    dataType: 'u16',
    type: 'dropdown',
    confirmRequired: true,
    confirmMessage: '确定要执行接触器策略设置吗？',
    options: [
      { label: '设置BCU充电操作', value: 1 },
      { label: '设置BCU放电操作', value: 2 },
      { label: '设置BCU脱离母线', value: 3 },
      { label: '接触器自检', value: 4 }
    ]
  },



  // ========== 绝缘检测 ==========
  line_detection_ctrl: {
    name: '下设绝缘电阻检测指令',
    topic: 'insulation_detect_ctrl',
    dataType: 'u16',
    type: 'dropdown',
    confirmRequired: true,
    confirmMessage: '确定要执行绝缘电阻检测吗？',
    options: [
      { label: '启动绝缘电阻检测', value: 0x5BB5 },
      { label: '关闭绝缘电阻检测', value: 0x1221 }
    ]
  },

  // ========== 系统控制 ==========
  system_mode_ctrl: {
    name: '设置系统运行模式',
    topic: 'sys_mode_ctrl',
    dataType: 'u16',
    type: 'dropdown',
    confirmRequired: true,
    confirmMessage: '确定要切换系统运行模式吗？',
    options: [
      { label: '测试模式', value: 0x5BB5 },
      { label: '正常模式', value: 0x1221 }
    ]
  },

  line_detection_enable_ctrl: {
    name: '掉线检测功能使能',
    topic: 'brokenwire_detect_en',
    dataType: 'u16',
    type: 'dropdown',
    confirmRequired: true,
    confirmMessage: '确定要修改掉线检测功能使能状态吗？',
    options: [
      { label: '开启（默认）', value: 0x5BB5 },
      { label: '关闭', value: 0x1221 }
    ]
  },

  // ========== 测试模式控制 - 统一bit位控制 ==========
  contactor_ctrl_test: {
    name: '接触器控制',
    topic: 'contactor_ctrl_test',
    dataType: 'u16',
    type: 'checkbox_group',
    confirmRequired: true,
    confirmMessage: '确定要执行测试模式接触器控制吗？',
    options: [
      { label: '主正接触器控制', value: 1, bit: 0 },
      { label: '预充接触器控制', value: 2, bit: 1 },
      { label: '主负接触器控制', value: 4, bit: 2 },
      { label: '主断分励脱扣', value: 8, bit: 3 },
      { label: '风扇控制', value: 16, bit: 4 },
      { label: '直流供电KM控制', value: 32, bit: 5 }
    ]
  },

  hsd_ctrl_test: {
    name: '高边控制',
    topic: 'hsd_lsd_ctrl_test',
    dataType: 'u16',
    type: 'checkbox_group',
    confirmRequired: true,
    confirmMessage: '确定要执行高边控制吗？',
    options: [
      { label: '高边1', value: 1, bit: 0 },
      { label: '高边2', value: 2, bit: 1 },
      { label: '高边3', value: 4, bit: 2 },
      { label: '高边4', value: 8, bit: 3 },
      { label: '高边5', value: 16, bit: 4 },
      { label: '高边6', value: 32, bit: 5 },
      { label: '高边7', value: 64, bit: 6 },
      { label: '高边8', value: 128, bit: 7 },
      { label: '高边9', value: 256, bit: 8 },
      { label: '高边10', value: 512, bit: 9 },
      { label: '高边11', value: 1024, bit: 10 },
      { label: '高边12', value: 2048, bit: 11 }
    ]
  },

  lsd_ctrl_test: {
    name: '低边控制',
    topic: 'hsd_lsd_ctrl_test',
    dataType: 'u16',
    type: 'checkbox_group',
    confirmRequired: true,
    confirmMessage: '确定要执行低边控制吗？',
    options: [
      { label: '低边1', value: 4096, bit: 12 },
      { label: '低边2', value: 8192, bit: 13 },
      { label: '低边3', value: 16384, bit: 14 },
      { label: '低边4', value: 32768, bit: 15 }
    ]
  },

  io_ctrl_test: {
    name: '其他IO控制',
    topic: 'io_ctrl_test',
    dataType: 'u16',
    type: 'checkbox_group',
    confirmRequired: true,
    confirmMessage: '确定要执行其他IO控制吗？',
    options: [
      { label: 'DI1', value: 1, bit: 0 },
      { label: 'DI2', value: 2, bit: 1 },
      { label: '继电器1', value: 256, bit: 8 },
      { label: '继电器2', value: 512, bit: 9 }
    ]
  },

  // ========== 接触器独立控制 ==========
  contactor_standalone_ctrl: {
    name: '',
    topic: 'contactor_ctrl_indep',
    dataType: 'u16',
    type: 'multi_dropdown',
    confirmRequired: true,
    confirmMessage: '确定要执行接触器独立控制吗？',
    requiresPreCondition: true, // 需要前置条件
    preConditionCommand: { topic: 'contactor_ctrl', value: 0 }, // 先设置执行策略为0
    dropdowns: [
      {
        name: '主正接触器控制',
        bitStart: 0,
        bitEnd: 1,
        options: [
          { label: '无效', value: 0 }, // 00
          { label: '闭合', value: 2 }, // 10
          { label: '断开', value: 1 } // 01
        ]
      },
      {
        name: '预充接触器控制',
        bitStart: 2,
        bitEnd: 3,
        options: [
          { label: '无效', value: 0 }, // 00
          { label: '闭合', value: 2 }, // 10
          { label: '断开', value: 1 } // 01
        ]
      },
      {
        name: '主负接触器控制',
        bitStart: 4,
        bitEnd: 5,
        options: [
          { label: '无效', value: 0 }, // 00
          { label: '闭合', value: 2 }, // 10
          { label: '断开', value: 1 } // 01
        ]
      },
      {
        name: '主断分励脱扣',
        bitStart: 6,
        bitEnd: 7,
        options: [
          { label: '无效', value: 0 }, // 00
          { label: '闭合', value: 2 }, // 10
          { label: '断开', value: 1 } // 01
        ]
      },
      {
        name: '风扇控制',
        bitStart: 8,
        bitEnd: 9,
        options: [
          { label: '无效', value: 0 }, // 00
          { label: '闭合', value: 2 }, // 10
          { label: '断开', value: 1 } // 01
        ]
      },
      {
        name: '直流供电KM控制',
        bitStart: 10,
        bitEnd: 11,
        options: [
          { label: '无效', value: 0 }, // 00
          { label: '闭合', value: 2 }, // 10
          { label: '断开', value: 1 } // 01
        ]
      }
    ]
  },

  // ========== 故障控制 ==========
  fault_clear_ctrl: {
    name: '强制消除BCU故障',
    topic: 'force_clear_bcu_fault',
    dataType: 'u16',
    type: 'dropdown',
    confirmRequired: true,
    confirmMessage: '确定要清除故障吗？',
    options: [
      { label: '清除所有故障', value: 0 },
      { label: '清除充电过流严重告警', value: 1 },
      { label: '清除放电过流严重告警', value: 2 },
      { label: '清除绝缘电阻严重告警', value: 3 },
      { label: '清除接触器黏连（氧化）', value: 4 },
      { label: '清除PCS通讯故障', value: 5 }
    ]
  },

  // ========== 参数复位控制 ==========
  restore_basic_param: {
    name: '基本参数复位',
    topic: 'restore_ctrl_param',
    dataType: 'u16',
    type: 'checkbox_group',
    confirmRequired: true,
    confirmMessage: '确定要复位选中的基本参数吗？',
    options: [
      { label: '复位系统基本参数', value: 1, bit: 0 },
      { label: '复位电芯校准参数', value: 2, bit: 1 },
      { label: '复位簇诊断参数', value: 4, bit: 2 },
      { label: '复位pack诊断参数', value: 8, bit: 3 },
      { label: '复位电芯诊断参数', value: 16, bit: 4 },
      { label: '复位sox参数', value: 64, bit: 6 },
      { label: '复位sop map', value: 128, bit: 7 }
    ]
  },

  restore_factory_param: {
    name: '出厂参数复位',
    topic: 'restore_ctrl_param',
    dataType: 'u16',
    type: 'checkbox_group',
    confirmRequired: true,
    confirmMessage: '⚠️ 警告：出厂参数复位是高风险操作！确定要复位选中的出厂参数吗？',
    options: [
      { label: '复位实时保存数据', value: 32, bit: 5 },
      { label: '复位出厂校准参数', value: 256, bit: 8 },
      { label: '复位事件记录标志', value: 512, bit: 9 },
      { label: '复位系统运行时间', value: 1024, bit: 10 }
    ]
  },

  // ========== 数据管理 ==========
  param_reset_ctrl: {
    name: '控制参数复位',
    topic: 'restore_ctrl_param',
    dataType: 'u16',
    type: 'checkbox_bitfield',
    confirmRequired: true,
    confirmMessage: '确定要复位选中的参数吗？',
    bitFields: [
      { name: '复位系统基本参数', bit: 0 },
      { name: '复位电芯校准参数', bit: 1 },
      { name: '复位簇诊断参数', bit: 2 },
      { name: '复位pack诊断参数', bit: 3 },
      { name: '复位电芯诊断参数', bit: 4 },
      { name: '复位实时保存数据', bit: 5 },
      { name: '复位sox参数', bit: 6 },
      { name: '复位sop map', bit: 7 },
      { name: '复位出厂校准参数', bit: 8 },
      { name: '复位事件记录标志', bit: 9 },
      { name: '复位系统运行时间', bit: 10 }
    ]
  },



  position_reset_ctrl: {
    name: '复位事件记录存储器',
    topic: 'reset_record_flash',
    dataType: 'u16',
    type: 'dropdown',
    confirmRequired: true,
    confirmMessage: '确定要复位事件记录存储器吗？',
    options: [
      { label: '复位', value: 0x5BB5 },
      { label: '不执行', value: 0x0000 }
    ]
  },


  ocv_calibration_ctrl: {
    name: '强制OCV校准',
    topic: 'force_ocv_calib',
    dataType: 'u16',
    type: 'dropdown',
    confirmRequired: true,
    confirmMessage: '确定要执行OCV校准吗？',
    options: [
      { label: '启动', value: 0x5BB5 },
      { label: '关闭', value: 0x1221 }
    ]
  },



  weight_calibration_ctrl: {
    name: '权重校准信号',
    topic: 'weight_calib',
    dataType: 'u16',
    type: 'dropdown',
    confirmRequired: true,
    confirmMessage: '确定要执行权重校准吗？',
    options: [
      { label: '启动', value: 0x5BB5 },
      { label: '关闭', value: 0x1221 }
    ]
  },


  soh_forced_ctrl: {
    name: 'SOH强制校准信号',
    topic: 'force_soh_calib',
    dataType: 'u16',
    type: 'dropdown',
    confirmRequired: true,
    confirmMessage: '确定要执行SOH强制校准吗？',
    options: [
      { label: '启动', value: 0x5BB5 },
      { label: '关闭', value: 0x1221 }
    ]
  },

  // ========== 反馈状态查询命令 ==========
  get_contactor_ctrl_result: {
    name: '查询接触器执行策略结果',
    topic: 'get_contactor_ctrl_result',
    dataType: 'u8',
    type: 'query',
    confirmRequired: false,
    value: 0xFF,
    isPollingCommand: true // 标记为轮询命令
  },

  get_insulation_detect_result: {
    name: '查询绝缘电阻检测执行结果',
    topic: 'get_insulation_detect_result',
    dataType: 'u8',
    type: 'query',
    confirmRequired: false,
    value: 0xFF,
    isPollingCommand: true // 标记为轮询命令
  }
}

// ========== 工具函数 ==========

/**
 * 根据命令ID获取命令配置
 * @param {string} commandId - 命令ID
 * @returns {Object|null} 命令配置对象或null
 */
export function getCommandConfig(commandId) {
  return REMOTE_COMMANDS[commandId] || null
}

/**
 * 获取所有遥控命令列表
 * @returns {Array} 所有命令列表，包含id
 */
export function getAllCommands() {
  return Object.entries(REMOTE_COMMANDS).map(([id, config]) => ({ id, ...config }))
}



/**
 * 验证命令值是否有效
 * @param {string} commandId - 命令ID
 * @param {*} value - 要验证的值
 * @returns {boolean} 是否有效
 */
export function isValidCommandValue(commandId, value) {
  const config = getCommandConfig(commandId)
  if (!config) return false
  
  // 按钮类型命令不需要验证值
  if (config.type === 'button') return true
  
  // 检查值是否在选项列表中
  if (config.options && Array.isArray(config.options)) {
    return config.options.some(option => option.value === value)
  }
  
  return false
}
