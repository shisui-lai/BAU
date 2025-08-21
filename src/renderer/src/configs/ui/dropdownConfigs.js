/**
 * 下拉框配置文件
 * 按数据类型分类管理所有需要下拉框的参数配置
 */

export const DROPDOWN_CONFIGS = {
  // ========== 簇遥调数据配置 ==========
  cluster_remote_control: {
    // 系统基本参数
    sys_base_param: {
      // 使用中文参数名称作为key，更直观易维护
      '事件记录模式': [
        { label: '简约模式', value: 0 },
        { label: '详细模式', value: 1 }
      ],
      '内测模式': [
        { label: '关闭内测模式', value: 0 },
        { label: '内测模式（V、T）', value: 1 },
        { label: '内测模式2（IACP）', value: 2},
        { label: '内测模式3（DO）', value: 3},

      ],
      '均衡模式': [
        { label: '自动均衡', value: 0 },
        { label: '手动均衡', value: 1 }
      ],
      '运维模式': [
        { label: '运维模式', value: 23477 },
        { label: '非运维模式', value: 4641 },
      ],
      'PCS类型': [
        { label: '无PCS', value: 65535 },
        { label: '星星pcs', value: 1 },
        { label: '双一力PCS-01', value: 2 },
        { label: '科华PCS', value: 3 },
      ],
      '制冷设备类型': [
        { label: '无制冷设备', value: 65535 },
        { label: '科诺威水冷机', value: 1 },
        { label: '英维克', value: 2 },
        { label: '埃森特交流空调', value: 3 },
      ],
      '除湿机设备类型': [
        { label: '无除湿机设备', value: 65535 },
        { label: '除湿机-01', value: 1 },
      ],
      '消防控制器类型': [
        { label: '无消防控制器', value: 65535 },
        { label: '三沃力源（sanvalor）', value: 1 }
      ],
      

      'CAN1通讯速率/仲裁域速率': [
        { label: '500K', value: 4 },
        { label: '50K', value: 0 },
        { label: '100K', value: 1 },
        { label: '125K', value: 2 },
        { label: '250K', value: 3 },
        { label: '1M', value: 5 },        
      ],
      'CAN1数据域波特率': [
        { label: '无效/不支持', value: 0 },
        { label: '250K', value: 1 },
        { label: '500K', value: 2 },
        { label: '800K', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 },  
      ],
      'CAN2通讯速率/仲裁域速率': [
        { label: '500K', value: 4 },
        { label: '50K', value: 0 },
        { label: '100K', value: 1 },
        { label: '125K', value: 2 },
        { label: '250K', value: 3 },
        { label: '1M', value: 5 },        
      ],
      'CAN2数据域波特率': [
        { label: '无效/不支持', value: 0 },
        { label: '250K', value: 1 },
        { label: '500K', value: 2 },
        { label: '800K', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 },  
      ],
      'CAN3通讯速率/仲裁域速率': [
        { label: '500K', value: 4 },
        { label: '50K', value: 0 },
        { label: '100K', value: 1 },
        { label: '125K', value: 2 },
        { label: '250K', value: 3 },
        { label: '1M', value: 5 },        
      ],
      'CAN3数据域波特率': [
        { label: '无效/不支持', value: 0 },
        { label: '250K', value: 1 },
        { label: '500K', value: 2 },
        { label: '800K', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 },  
      ],
      'RS485-1 波特率': [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 },         
      ],
      'RS485-2 波特率': [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 },         
      ],
      'RS485-3 波特率': [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 },         
      ],

      '电流传感器类型': [
        { label: 'LEM-CAB500-C/SP5-012', value: 0 },
        { label: 'LEM-DHAB-5/118', value: 1 },
        { label: 'JC-JHAB-5/18', value: 48 },
        { label: 'QY-PL2C-200A/75mV', value: 192 },
      ],


      '电池类型': [
        { label: '磷酸铁锂电池', value: 0 },
        { label: '钛酸锂电池', value: 1 },
        { label: '锰酸锂电池', value: 2 }
      ],


      '均衡模式选项': {
        options: [
          { label: '不允许均衡', value: 0, matchValues: [0, 1] },
          { label: '允许在开路状态下均衡', value: 2, matchValues: [2, 3] },
          { label: '放电', value: 4, matchValues: [4, 5] },
          { label: '放电、开路', value: 6, matchValues: [6, 7] },
          { label: '充电', value: 8, matchValues: [8, 9] },
          { label: '充电、开路', value: 10, matchValues: [10, 11] },
          { label: '充电、放电', value: 12, matchValues: [12, 13] },
          { label: '充电、放电、开路', value: 14, matchValues: [14, 15] }
        ]
      },
      '充电均衡阈值电压区间K值': {
        options: [
          { label: '2mv', value: 10 },
          { label: '15mv', value: 100 },
          { label: '150mv', value: 1000 },
          { label: '20mv', value: '20', matchValues: 'other' }
        ]
      },
    },
  },

  // ========== 簇遥控数据配置（预留） ==========
  cluster_remote_command: {
    // 未来的簇遥控参数配置
    command_param: {
      '控制模式': [
        { label: '手动控制', value: 0 },
        { label: '自动控制', value: 1 },
        { label: '远程控制', value: 2 }
      ]
    }
  },

  // ========== 堆遥调数据配置（预留） ==========
  block_remote_control: {
    // 系统堆通用配置参数（BLOCK_COMMON_PARAM）
    block_common_param: {
      '远方就地模式': [
        { label: '远方', value: 0 },
        { label: '就地', value: 1 }
      ],
      '分簇控制标志位': [
        { label: '统一控制', value: 0 },
        { label: '分簇控制', value: 1 }
      ],
      'EMS通讯故障断接触器使能': [
        { label: '不使能', value: 0 },
        { label: '使能', value: 1 }
      ],
      '运维模式': [
        { label: '非运维模式', value: 0 },
        { label: '运维模式', value: 1 }
      ],
      '内测模式': [
        { label: '关闭', value: 0 },
        { label: '开启', value: 1 }
      ]
    },

    // ========== 本页面：堆配置参数 三类topic ==========
    // 1) 系统簇端电池配置参数（当前暂未有下拉项，可按需补充）
    block_batt_param: {
      // 暂无
    },
    
    // 2) 系统通讯设备配置参数
    block_comm_dev_cfg: {
      'PCS类型': [
        { label: '无PCS', value: 0 },
        { label: '双一力PCS', value: 1 }
      ],
      '制冷设备类型': [
        { label: '无制冷设备', value: 0 },
        { label: '三河同飞', value: 1 }
      ],
      '除湿空调类型': [
        { label: '无除湿空调', value: 0 },
        { label: '三河同飞', value: 1 }
      ],
      'I/O控制板类型': [
        { label: '无I/O控制板', value: 0 },
        { label: '英美讯', value: 1 }
      ]
    },

    // 3) 系统操作配置参数
    block_operate_cfg: {
      '全部开路时堆电压是否为0': [
        { label: '不开启', value: 0 },
        { label: '开启', value: 1 }
      ],
      '静置时堆SOC是否追随平均SOC': [
        { label: '不开启', value: 0 },
        { label: '开启', value: 1 }
      ],
      '是否存在BCP控制': [
        { label: '不存在', value: 0 },
        { label: '存在', value: 1 }
      ]
    }
  },

  // ========== 堆端口配置数据配置 ==========
  block_port_config: {
    block_port_cfg: {
      'CAN1通讯速率/仲裁域速率': [
        { label: '50K', value: 0 },
        { label: '100K', value: 1 },
        { label: '125K', value: 2 },
        { label: '250K', value: 3 },
        { label: '默认 500K', value: 4 },
        { label: '1M', value: 5 }
      ],
      'CAN1数据域波特率': [
        { label: '无效/不支持', value: 0 },
        { label: '250K', value: 1 },
        { label: '500K', value: 2 },
        { label: '800K', value: 3 },
        { label: '1M', value: 4 }
      ],
      'CAN2通讯速率/仲裁域速率': [
        { label: '50K', value: 0 },
        { label: '100K', value: 1 },
        { label: '125K', value: 2 },
        { label: '250K', value: 3 },
        { label: '默认 500K', value: 4 },
        { label: '1M', value: 5 }
      ],
      'CAN2数据域波特率': [
        { label: '无效/不支持', value: 0 },
        { label: '250K', value: 1 },
        { label: '500K', value: 2 },
        { label: '800K', value: 3 },
        { label: '1M', value: 4 }
      ],
      'CAN3通讯速率/仲裁域速率': [
        { label: '50K', value: 0 },
        { label: '100K', value: 1 },
        { label: '125K', value: 2 },
        { label: '250K', value: 3 },
        { label: '默认 500K', value: 4 },
        { label: '1M', value: 5 }
      ],
      'CAN3数据域波特率': [
        { label: '无效/不支持', value: 0 },
        { label: '250K', value: 1 },
        { label: '500K', value: 2 },
        { label: '800K', value: 3 },
        { label: '1M', value: 4 }
      ],
      'RS485-1通讯速率': [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 },
      ],
      'RS485-2通讯速率': [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 },
      ],
      'RS485-3通讯速率': [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 },
      ],
      'RS485-4通讯速率': [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 },
      ],
      'RS485-5通讯速率': [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 },
      ],
      'RS485-6通讯速率': [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 },
      ],
      '网卡1速度': [
        { label: '100M', value: 0 },
        { label: '10M', value: 1 }
      ],
      '网卡2速度': [
        { label: '100M', value: 0 },
        { label: '10M', value: 1 }
      ],
    }
  },

  // ========== 堆遥控数据配置（预留） ==========
  block_remote_command: {
    // 未来的堆遥控参数配置
  }
}

/**
 * 获取指定参数的下拉框配置
 * @param {string} dataType - 数据类型 (如: cluster_remote_control)
 * @param {string} topicType - 主题类型 (如: sys_base_param)
 * @param {string} parameterKey - 参数名称
 * @returns {Array|null} 下拉框选项数组或null
 */
export function getDropdownConfig(dataType, topicType, parameterKey) {
  try {
    const config = DROPDOWN_CONFIGS[dataType]?.[topicType]?.[parameterKey]
    return config || null
  } catch (error) {
    console.warn(`[DropdownConfig] 获取配置失败: ${dataType}.${topicType}.${parameterKey}`, error)
    return null
  }
}

/**
 * 检查参数是否需要下拉框
 * @param {string} dataType - 数据类型
 * @param {string} topicType - 主题类型  
 * @param {string} parameterKey - 参数名称
 * @returns {boolean} 是否需要下拉框
 */
export function isDropdownParameter(dataType, topicType, parameterKey) {
  const config = getDropdownConfig(dataType, topicType, parameterKey)
  if (!config) return false
  // return config !== null && Array.isArray(config) && config.length > 0
   // 支持新格式 { options: [...] }
  if (config.options && Array.isArray(config.options)) {
    return config.options.length > 0
  }
  
  // 兼容旧格式 [...]
  return Array.isArray(config) && config.length > 0
}

// 工具函数：根据参数值获取显示文本，保证类型一致
export function getDisplayLabel(dataType, topicType, parameterKey, value) {
  const config = getDropdownConfig(dataType, topicType, parameterKey)
  if (!config) return ''
  
  // 遍历所有选项，检查是否有匹配的
  for (const option of config.options) {
    // 如果有matchValues字段，使用特殊匹配逻辑
    if (option.matchValues !== undefined) {
      if (option.matchValues === 'other') {
        // 特殊处理"other"类型：除了明确指定的值外，其他所有值都匹配
        const explicitValues = config.options
          .filter(opt => opt.value !== 'other' && opt.matchValues === undefined)
          .map(opt => Number(opt.value))
        
        if (!explicitValues.includes(Number(value))) {
          return option.label
        }
      } else if (Array.isArray(option.matchValues)) {
        // 数组匹配：检查value是否在matchValues数组中
        if (option.matchValues.includes(Number(value))) {
          return option.label
        }
      } else if (Number(option.matchValues) === Number(value)) {
        // 单个值匹配
        return option.label
      }
    } else {
      // 标准匹配：直接比较value
      if (Number(option.value) === Number(value)) {
        return option.label
      }
    }
  }
  
  console.warn(`[DropdownConfig] 参数 ${parameterKey} 的值 ${value} 不在选项列表中`)
  return ''
}

/**
 * 根据显示标签获取实际值
 * @param {string} dataType - 数据类型
 * @param {string} topicType - 主题类型
 * @param {string} parameterKey - 参数名称
 * @param {string} displayLabel - 显示标签
 * @returns {*} 实际值
 */
export function getActualValue(dataType, topicType, parameterKey, displayLabel) {
  const options = getDropdownConfig(dataType, topicType, parameterKey)
  if (!options) return displayLabel
  
  const option = options.find(opt => opt.label === displayLabel)
  if (!option) {
    console.warn(`[DropdownConfig] 参数 ${parameterKey} 的显示值 ${displayLabel} 不在选项列表中`)
    return displayLabel
  }
  
  return option.value
}
