// 统一故障过滤与状态判断逻辑
// 该模块供渲染进程(parseFault.ts)与主进程(bauDataExport.js)共同使用，确保逻辑一致

/**
 * 判断是否应该显示该故障（过滤逻辑）
 * @param {string} dataType - 故障类型/Topic后缀 (如 TOTAL_FAULT, FAULT_LEVEL1)
 * @param {string} label - 故障标签/描述
 * @returns {boolean} 是否显示
 */
export function shouldDisplayFault(dataType, label) {
  // 1. 一级表完全不显示
  if (dataType.startsWith('FAULT_LEVEL1')) {
    return false
  }

  // 2. 二级表：过滤单体相关故障，保留BMU级故障
  if (dataType.startsWith('FAULT_LEVEL2')) {
    const cellFaultTypes = [
      '单体电池过压',
      '单体电池欠压',
      '充电单体过温',
      '充电单体欠温',
      '放电单体过温',
      '放电单体欠温',
      '单体SOC过高',
      '单体SOC过低'
    ]
    const isCellFault = cellFaultTypes.some((type) => label.includes(type))
    return !isCellFault // 单体故障不显示，BMU故障显示
  }

  // 3. 掉线信息：过滤一级掉线标志，保留可定位的掉线信息
  if (dataType === 'BROKENWIRE') {
    // 屏蔽一级掉线标志（只是代表该BMU下有单体电压/温度掉线，不够具体）
    if (label.includes('电压一级掉线') || label.includes('温度一级掉线')) {
      return false
    }
    // 允许以下掉线信息显示（都可以定位到具体位置）：
    // - BMU失联状态：BMU1 失联
    // - BMU插件温度掉线：BMU1 插件1温度掉线
    // - 二级掉线：BMU1 Cell1 电压二级掉线, BMU1 Temp1 温度二级掉线
    // - AFE失联：BMU1 AFE1 失联
    return true
  }

  // 4. 堆模拟量故障等级：只显示簇间压差和簇间电流差异故障
  if (dataType === 'BLOCK_ANALOG_FAULT_GRADE') {
    // 白名单：只允许这两个簇间故障显示
    const allowedFaults = ['簇间压差过大故障', '簇间电流差过大故障']
    return allowedFaults.some((fault) => label.includes(fault))
  }

  // 5. TOTAL_FAULT：屏蔽单体总故障、pack总故障、簇总故障1、簇总故障2
  if (dataType === 'TOTAL_FAULT') {
    // 检查故障标签是否属于被屏蔽的类别
    // 单体总故障
    if (
      label.includes('单体电压过压') ||
      label.includes('单体电压欠压') ||
      label.includes('单体充电过温') ||
      label.includes('单体充电欠温') ||
      label.includes('单体放电过温') ||
      label.includes('单体放电欠温') ||
      label.includes('单体SOC过高') ||
      label.includes('单体SOC过低')
    ) {
      return false
    }

    // pack总故障
    if (
      label.includes('pack电压过高') ||
      label.includes('pack电压过低') ||
      label.includes('pack温度过温') ||
      label.includes('pack温度欠温') ||
      label.includes('动力接插件过温')
    ) {
      return false
    }

    // 簇总故障1 - 已移除过滤，允许存储故障等级（支持升降级记录）
    /*
    if (label.includes('单体电池压差过大故障等级') || label.includes('单体电池温差过大故障等级') ||
        label.includes('SOC差异过大故障等级') || label.includes('BMU压差故障等级') ||
        label.includes('簇端过压故障等级') || label.includes('簇端欠压故障等级') ||
        label.includes('绝缘电阻正对地故障等级') || label.includes('绝缘电阻负对地故障等级')) {
      return false;
    }
    */

    // 簇总故障2
    if (
      label.includes('充电过流故障等级') ||
      label.includes('放电过流故障等级') ||
      label.includes('RT1过温故障等级') ||
      label.includes('RT2过温故障等级') ||
      label.includes('RT3过温故障等级') ||
      label.includes('RT4过温故障等级') ||
      label.includes('RT5过温故障等级')
    ) {
      return false
    }

    // 其他TOTAL_FAULT故障（如接触器故障等）正常显示
    return true
  }

  // 8. DI_DO_TEMP_STATUS: 过滤掉非故障的状态信息
  if (dataType === 'DI_DO_TEMP_STATUS') {
    const keywords = ['故障', '氧化', '黏连', 'Fault', 'Oxidation', 'Adhesion', 'Alarm', '报警']
    return keywords.some((k) => label.includes(k))
  }

  // 6. 过滤预留字段故障
  if (label.includes('预留') || label.includes('Reserved')) {
    return false
  }

  // 7. 其他故障类型（三级表、硬件故障等）正常显示
  return true
}

/**
 * 掉线信息故障状态判断函数
 * @param {string} label
 * @param {boolean} value
 * @param {string} dataType
 * @returns {boolean} 是否为故障状态
 */
export function getBrokenwireFaultStatus(label, value, dataType) {
  // 非掉线信息类型，使用原有逻辑
  if (dataType !== 'BROKENWIRE') {
    return value
  }

  // 失联状态类型：1正常 0失联 - 需要反转逻辑
  const connectionLossFields = [
    'BMU失联状态',
    'BMU-1号动力接插件温度掉线状态',
    'BMU-2号动力接插件温度掉线状态',
    'AFE通讯失联'
  ]

  // 采集掉线类型：0正常 1掉线 - 正向逻辑
  const collectionOfflineFields = [
    '电压采集掉线信息',
    '温度采集掉线信息',
    '电压一级掉线',
    '温度一级掉线',
    '电压二级掉线',
    '温度二级掉线'
  ]

  // 检查是否为失联状态类型
  const isConnectionLoss = connectionLossFields.some((field) => label.includes(field))
  if (isConnectionLoss) {
    return !value // 反转逻辑：false表示失联（故障），true表示正常
  }

  // 检查是否为采集掉线类型
  const isCollectionOffline = collectionOfflineFields.some((field) => label.includes(field))
  if (isCollectionOffline) {
    return value // 正向逻辑：true表示掉线（故障），false表示正常
  }

  // 默认情况：如果无法识别字段类型，使用反转逻辑（保持向后兼容）
  return !value
}

/* ---------- 统一告警等级配置 (Backend Version) ---------- */
// 直接使用中文，便于 CSV 导出
export const LEVEL_CONFIG = {
  SEVERE: { txt: '严重', tag: 'severe' },
  MEDIUM: { txt: '一般', tag: 'medium' },
  MILD: { txt: '轻微', tag: 'mild' },
  NONE: { txt: '', tag: 'none' } // 空字符串表示无等级
}

// 等级判断缓存
const faultLevelCache = new Map()

/**
 * 根据故障标签获取故障等级
 * 复刻自 src/renderer/src/composables/core/data-processing/common/parseFault.ts
 * @param {string} label
 * @returns {object} LEVEL_CONFIG item
 */
export function getFaultLevelFromLabel(label) {
  // 构建缓存键
  const cacheKey = label

  // 缓存命中，直接返回
  if (faultLevelCache.has(cacheKey)) {
    return faultLevelCache.get(cacheKey)
  }

  // 性能优化：使用更高效的匹配策略
  let level

  // 优先匹配最常见的模式
  // 启用名称匹配逻辑，确保布尔型故障也有等级
  if (label.indexOf('严重') !== -1) {
    level = LEVEL_CONFIG.SEVERE
  } else if (label.indexOf('一般') !== -1) {
    level = LEVEL_CONFIG.MEDIUM
  } else if (label.indexOf('轻微') !== -1) {
    level = LEVEL_CONFIG.MILD
  } else {
    // 默认情况：没有等级关键词的故障，默认为严重
    // 这与前端 parseFault.ts 对 2-bit 值的默认处理一致 (LEVEL_MAPPING[code] || SEVERE)
    // 也能解决用户反馈的“告警等级”为空的问题
    level = LEVEL_CONFIG.SEVERE
  }

  // 缓存结果
  faultLevelCache.set(cacheKey, level)

  // 防止缓存无限增长
  if (faultLevelCache.size > 1000) {
    const entries = Array.from(faultLevelCache.entries())
    faultLevelCache.clear()
    entries.slice(-500).forEach(([key, value]) => {
      faultLevelCache.set(key, value)
    })
  }

  return level
}

// 等级映射数组（索引对应2-bit值）
export const LEVEL_MAPPING = [
  LEVEL_CONFIG.NONE, // 0
  LEVEL_CONFIG.SEVERE, // 1
  LEVEL_CONFIG.MEDIUM, // 2
  LEVEL_CONFIG.MILD // 3
]
