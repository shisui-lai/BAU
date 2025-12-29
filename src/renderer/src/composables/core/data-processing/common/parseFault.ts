/* ------------------------------------------------------------------ */
/*                    parseFault – 统一故障解析           */
/* ------------------------------------------------------------------ */
// ./src/renderer/src/composables/parseFault.ts 
import { markRaw, shallowRef, watch } from 'vue'
import { locateCell } from '../../../../../../protocol/utils'
import { useClusterStore } from '../../../../stores/device/clusterStore'

/* ---------- 全局电芯序号计算函数 ---------- */
function calculateGlobalCell(bmu: number, cellInBmu: number, cfg: any = {}) {
  if (!bmu || !cellInBmu) return null;

  const { afeCellCounts = [] } = cfg;
  const cellsPerBmu = afeCellCounts.reduce((total: number, count: number) => total + count, 0);

  return cellsPerBmu > 0 ? (bmu - 1) * cellsPerBmu + cellInBmu : null;
}

/* ---------- 掉线信息定位函数 ---------- */
function locateBrokenwire(label: string) {
  // 解析 BMU 编号
  const bmuMatch = label.match(/^BMU(\d+)/)
  const bmu = bmuMatch ? +bmuMatch[1] : null

  // 解析 AFE 编号
  const afeMatch = label.match(/AFE(\d+)/)
  const afe = afeMatch ? +afeMatch[1] : null

  // 解析 Cell/Temp 编号
  const cellMatch = label.match(/Cell(\d+)/)
  const tempMatch = label.match(/Temp(\d+)/)
  const cellInBmu = cellMatch ? +cellMatch[1] : (tempMatch ? +tempMatch[1] : null)

  return { bmu, afe, cellInBmu }
}

// cfg 对象实际上是 baseConfig，包含以下结构：
// interface BaseConfig {
//   totalCell: number;        // 电芯总数量
//   totalTemp: number;        // 温感总数量  
//   bmuTotal: number;         // BMU总数量
//   afePerBmu: number;        // BMU下AFE数量
//   afeCellCounts: number[];  // 每个AFE的电芯数量数组 [AFE1电芯数, AFE2电芯数, ...]
//   afeTempCounts: number[];  // 每个AFE的温度探头数量数组 [AFE1温度数, AFE2温度数, ...]
// }
/* ---------- 全局温度序号计算函数 ---------- */
function calculateGlobalTemp(bmu: number, tempInBmu: number, cfg: any = {}) {
  if (!bmu || !tempInBmu) return null;

  const { afeTempCounts = [] } = cfg;
  const tempsPerBmu = afeTempCounts.reduce((total: number, count: number) => total + count, 0);

  return tempsPerBmu > 0 ? (bmu - 1) * tempsPerBmu + tempInBmu : null;
}

/* ---------- FAULT_LEVEL2动态翻译处理函数 ---------- */
function normalizeFaultLevel2Label(label: string): string {
  // 处理BMU相关故障标签，保留所有定位信息，只翻译故障类型
  if (label.startsWith('BMU') && !label.includes('第') && !label.includes('节')) {
    if (label.includes('插件') && label.includes('过温')) {
      // 插件过温故障：保留BMU编号和插件编号，只翻译故障类型
      // BMU1 插件1过温 -> BMU1 Plug1 Overtemperature
      // BMU5 插件2过温 -> BMU5 Plug2 Overtemperature
      const bmuMatch = label.match(/^BMU(\d+)/)
      const plugMatch = label.match(/插件(\d+)/)
      if (bmuMatch && plugMatch) {
        return `BMU${bmuMatch[1]} Plug${plugMatch[1]} Overtemperature`
      }
    } else if (label.includes('单体电池过压')) {
      // 单体电池过压：保留BMU编号，翻译故障类型
      // BMU1 单体电池过压 -> BMU1 Cell Overvoltage
      const bmuMatch = label.match(/^BMU(\d+)/)
      if (bmuMatch) {
        return `BMU${bmuMatch[1]} Cell Overvoltage`
      }
    } else if (label.includes('单体电池欠压')) {
      // 单体电池欠压：保留BMU编号，翻译故障类型
      // BMU1 单体电池欠压 -> BMU1 Cell Undervoltage
      const bmuMatch = label.match(/^BMU(\d+)/)
      if (bmuMatch) {
        return `BMU${bmuMatch[1]} Cell Undervoltage`
      }
    } else if (label.includes('单体SOC过高')) {
      // 单体SOC过高：保留BMU编号，翻译故障类型
      // BMU1 单体SOC过高 -> BMU1 High Cell SOC
      const bmuMatch = label.match(/^BMU(\d+)/)
      if (bmuMatch) {
        return `BMU${bmuMatch[1]} High Cell SOC`
      }
    } else if (label.includes('单体SOC过低')) {
      // 单体SOC过低：保留BMU编号，翻译故障类型
      // BMU1 单体SOC过低 -> BMU1 Low Cell SOC
      const bmuMatch = label.match(/^BMU(\d+)/)
      if (bmuMatch) {
        return `BMU${bmuMatch[1]} Low Cell SOC`
      }
    } else if (label.includes('BMU欠压')) {
      // BMU欠压：保留BMU编号，翻译故障类型
      // BMU1 BMU欠压 -> BMU1 BMU Undervoltage
      const bmuMatch = label.match(/^BMU(\d+)/)
      if (bmuMatch) {
        return `BMU${bmuMatch[1]} BMU Undervoltage`
      }
    } else if (label.includes('BMU过温')) {
      // BMU过温：保留BMU编号，翻译故障类型
      // BMU1 BMU过温 -> BMU1 BMU Overtemperature
      const bmuMatch = label.match(/^BMU(\d+)/)
      if (bmuMatch) {
        return `BMU${bmuMatch[1]} BMU Overtemperature`
      }
    } else if (label.includes('BMU过压')) {
      // BMU过压：保留BMU编号，翻译故障类型
      // BMU4 BMU过压 -> BMU4 BMU Overvoltage
      const bmuMatch = label.match(/^BMU(\d+)/)
      if (bmuMatch) {
        return `BMU${bmuMatch[1]} BMU Overvoltage`
      }
    } else if (label.includes('BMU欠温')) {
      // BMU欠温：保留BMU编号，翻译故障类型
      // BMU4 BMU欠温 -> BMU4 BMU Undertemperature
      const bmuMatch = label.match(/^BMU(\d+)/)
      if (bmuMatch) {
        return `BMU${bmuMatch[1]} BMU Undertemperature`
      }
    }
  }
  
  // 处理非BMU相关的故障（这些故障直接使用翻译文件中的键）
  if (label === '单体压差过大') {
    return '单体压差过大'
  }
  if (label === '单体温差过大') {
    return '单体温差过大'
  }
  if (label === 'SOC差异过大') {
    return 'SOC差异过大'
  }
  if (label === 'BMU压差') {
    return 'BMU压差'
  }
  if (label === '簇端过压') {
    return '簇端过压'
  }
  if (label === '簇端欠压') {
    return '簇端欠压'
  }
  if (label === '绝缘正对地') {
    return '绝缘正对地'
  }
  if (label === '绝缘负对地') {
    return '绝缘负对地'
  }
  if (label === '充电过流') {
    return '充电过流'
  }
  if (label === '放电过流') {
    return '放电过流'
  }
  if (label === 'RT1过温') {
    return 'RT1过温'
  }
  if (label === 'RT2过温') {
    return 'RT2过温'
  }
  if (label === 'RT3过温') {
    return 'RT3过温'
  }
  if (label === 'RT4过温') {
    return 'RT4过温'
  }
  if (label === 'RT5过温') {
    return 'RT5过温'
  }
  
  // 处理英文标签的情况
  if (label === 'BMU Undertemperature') {
    return 'BMU Undertemperature'
  }
  if (label === 'BMU Overtemperature') {
    return 'BMU Overtemperature'
  }
  if (label === 'BMU Overvoltage') {
    return 'BMU Overvoltage'
  }
  if (label === 'BMU Undervoltage') {
    return 'BMU Undervoltage'
  }
  
  // 其他情况保持原样
  return label
}

/* ---------- 掉线信息故障状态判断函数 ---------- */
function getBrokenwireFaultStatus(label: string, value: boolean, dataType: string): boolean {
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
  const isConnectionLoss = connectionLossFields.some(field => label.includes(field))
  if (isConnectionLoss) {
    return !value // 反转逻辑：false表示失联（故障），true表示正常
  }

  // 检查是否为采集掉线类型
  const isCollectionOffline = collectionOfflineFields.some(field => label.includes(field))
  if (isCollectionOffline) {
    return value // 正向逻辑：true表示掉线（故障），false表示正常
  }

  // 默认情况：如果无法识别字段类型，使用反转逻辑（保持向后兼容）
  // console.warn(`[parseFault] 未识别的掉线字段类型: ${label}，使用默认反转逻辑`)
  return !value
}

// 类型声明
type PerformanceMemory = {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
};

/* ---------- 统一告警等级配置 ---------- */
const LEVEL_CONFIG = {
  SEVERE: { txt: 'batteryInfo.faultLevel.critical', tag: 'severe' },  // 使用完整翻译键路径
  MEDIUM: { txt: 'batteryInfo.faultLevel.general', tag: 'medium' },  // 使用完整翻译键路径
  MILD: { txt: 'batteryInfo.faultLevel.minor', tag: 'mild' },         // 使用完整翻译键路径
  NONE: { txt: '-', tag: 'none' }
}

/* ---------- 高性能故障等级判断（带缓存） ---------- */
// 等级判断缓存 - 避免重复的字符串匹配操作
const faultLevelCache = new Map<string, typeof LEVEL_CONFIG.SEVERE>()

function getFaultLevelFromLabel(label: string): typeof LEVEL_CONFIG.SEVERE {
  // 构建缓存键
  const cacheKey = label

  // 缓存命中，直接返回
  if (faultLevelCache.has(cacheKey)) {
    return faultLevelCache.get(cacheKey)!
  }

  // 性能优化：使用更高效的匹配策略
  let level: typeof LEVEL_CONFIG.SEVERE

  // 优先匹配最常见的模式，减少不必要的字符串操作
  // if (label.indexOf('严重') !== -1) {
  //   level = LEVEL_CONFIG.SEVERE
  // } else if (label.indexOf('一般') !== -1) {
  //   level = LEVEL_CONFIG.MEDIUM
  // } else if (label.indexOf('轻微') !== -1) {
  //   level = LEVEL_CONFIG.MILD
  // } else {
    // 默认情况：没有等级关键词的故障，保持原有逻辑（默认为严重）
    level = LEVEL_CONFIG.NONE
  // }

  // 缓存结果，避免重复计算
  faultLevelCache.set(cacheKey, level)

  // 防止缓存无限增长，当缓存超过1000条时清理一半
  if (faultLevelCache.size > 1000) {
    const entries = Array.from(faultLevelCache.entries())
    faultLevelCache.clear()
    // 保留最近的500条
    entries.slice(-500).forEach(([key, value]) => {
      faultLevelCache.set(key, value)
    })
  }

  return level
}



// 等级映射数组（索引对应2-bit值）
const LEVEL_MAPPING = [
  LEVEL_CONFIG.NONE,   // 0
  LEVEL_CONFIG.SEVERE, // 1
  LEVEL_CONFIG.MEDIUM, // 2
  LEVEL_CONFIG.MILD    // 3
]

/* ---------- 类型 ---------- */
// 定义故障等级标签的联合类型
export type FaultLevelTag = 'severe' | 'medium' | 'mild' | 'none'

export interface FaultRecord {
  label    : string
  desc     : string          // 故障文本（去掉前缀）
  time     : string          // 格式化时间
  ts       : number          // 时间戳（排序用）
  levelTxt : string
  levelTag : FaultLevelTag   // 使用精确的联合类型替代string
  bmu      : number | null
  afe      : number | null
  cell     : number | null
  globalCell: number | null  // 全局电芯序号
  globalTemp: number | null  // 全局温度序号
  dataType : string          // MQTT频道类型，用于确定翻译对象
}

/* ---------- 非响应式主仓库 ---------- */
const rawFaultData = markRaw(
  new Map<string, Map<string, FaultRecord>>()   // Map<clusterKey , Map<label , rec>>
)

export const faultTick = shallowRef(0)

/* ---------- 节流机制 - 防止内存泄漏的关键 ---------- */
let lastUpdateTime = 0
const UPDATE_THROTTLE = 1000 // 1秒更新，使用增量更新优化
let pendingUpdate = false

function throttledUpdate() {
  const now = Date.now()
  const elapsed = now - lastUpdateTime

  if (elapsed >= UPDATE_THROTTLE) {
    lastUpdateTime = now
    faultTick.value++
    pendingUpdate = false
  } else if (!pendingUpdate) {
    pendingUpdate = true
    const delay = UPDATE_THROTTLE - elapsed
    setTimeout(() => {
      if (pendingUpdate) {
        throttledUpdate()
      }
    }, delay)
  }
}

/* ---------- 缓存机制 - 避免重复计算 ---------- */
export const sortedAllFaults = shallowRef<FaultRecord[]>([])

// 增量更新优化：避免每次都重新排序所有数据
let lastDataHash = ''
let sortedCache: (FaultRecord & { cluster: string })[] = []
const clusterMutationCounter = new Map<string, number>()



// 定期清理过期数据

/* ---------- 响应式更新 - 使用分层级指纹检测 ---------- */
watch(
  faultTick,
  () => {
    // 分层级指纹 - 按故障等级统计数量
    const dataFingerprint = Array.from(rawFaultData.entries())
      .map(([cluster, faultMap]) => {
        const counts = { severe: 0, medium: 0, mild: 0, none: 0 }
        for (const fault of faultMap.values()) {
          const level = fault.levelTag || 'mild'
          counts[level as keyof typeof counts]++
        }
        const mc = clusterMutationCounter.get(cluster) ?? 0
        return `${cluster}:${counts.severe}-${counts.medium}-${counts.mild}-${counts.none}-${mc}`
      })
      .join('|')

    // 如果数据没有变化，直接使用缓存，避免重复处理
    if (dataFingerprint === lastDataHash && sortedCache.length > 0) {
      sortedAllFaults.value = sortedCache
      return
    }

    // 数据有变化，重新处理
    const arr: (FaultRecord & { cluster: string })[] = []
    for (const [cluster, faultMap] of rawFaultData.entries()) {
      for (const record of faultMap.values()) {
        arr.push({ ...record, cluster })
      }
    }

    lastDataHash = dataFingerprint
    sortedCache = arr
    sortedAllFaults.value = arr
  },
  { immediate: true }
);

/* ---------- 对外接口 - 直接返回缓存结果 ---------- */
export function useAllFaults() {
  return () => {
    faultTick.value // 建立依赖关系
    return sortedAllFaults.value // 直接返回缓存的结果
  }
}

/* ---------- 排序逻辑 ---------- */

// 故障严重程度排序映射表 - 用于确保严重故障优先显示
// 注意：由于最终会执行 .reverse()，所以严重故障使用较大数值
// 如果性能消耗过大，可以删除下面的 SEVERITY_ORDER 和相关排序逻辑
const SEVERITY_ORDER: Record<FaultLevelTag, number> = { 'severe': 3, 'medium': 2, 'mild': 1, 'none': 0 }

function sortFaults (a: FaultRecord & { cluster: string },
                     b: typeof a) {

  // ========== 故障严重程度排序 (可删除部分 - 开始) ==========
  // 优先按故障严重程度排序：严重 → 一般 → 轻微
  // 注意：由于最终会执行 .reverse()，所以这里使用升序排序
  // 如果性能消耗过大，删除下面4行代码即可恢复原有排序
  const aSeverity = SEVERITY_ORDER[a.levelTag] ?? 0
  const bSeverity = SEVERITY_ORDER[b.levelTag] ?? 0
  if (aSeverity !== bSeverity) return aSeverity - bSeverity
  // ========== 故障严重程度排序 (可删除部分 - 结束) ==========

  // 原有排序逻辑保持不变
  const [ablock, acluster] = a.cluster.split('-').map(Number)
  const [bblock, bcluster] = b.cluster.split('-').map(Number)
  if (ablock !== bblock)   return ablock   - bblock
  if (acluster !== bcluster) return acluster - bcluster

  const num = (s?: string) => Number(s?.match(/\d+/)?.[0] ?? Infinity)
  const cmp = num(a.bmu?.toString()) - num(b.bmu?.toString())
  if (cmp) return cmp
  const cmp2 = num(a.afe?.toString()) - num(b.afe?.toString())
  if (cmp2) return cmp2
  return num(a.cell?.toString()) - num(b.cell?.toString())
}

/* ---------- 故障过滤逻辑 ---------- */
function shouldDisplayFault(dataType: string, label: string): boolean {
  // 1. 一级表完全不显示
  if (dataType.startsWith('FAULT_LEVEL1')) {
    return false
  }

  // 2. 二级表：过滤单体相关故障，保留BMU级故障
  if (dataType.startsWith('FAULT_LEVEL2')) {
    const cellFaultTypes = [
      '单体电池过压', '单体电池欠压',
      '充电单体过温', '充电单体欠温',
      '放电单体过温', '放电单体欠温',
      '单体SOC过高', '单体SOC过低'
    ]
    const isCellFault = cellFaultTypes.some(type => label.includes(type))
    return !isCellFault  // 单体故障不显示，BMU故障显示
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
    const allowedFaults = [
      '簇间压差过大故障',
      '簇间电流差过大故障'
    ];
    return allowedFaults.some(fault => label.includes(fault));
  }

  // 5. TOTAL_FAULT：屏蔽单体总故障、pack总故障、簇总故障1、簇总故障2
  if (dataType === 'TOTAL_FAULT') {
    // 检查故障标签是否属于被屏蔽的类别
    // 单体总故障
    if (label.includes('单体电压过压') || label.includes('单体电压欠压') ||
        label.includes('单体充电过温') || label.includes('单体充电欠温') ||
        label.includes('单体放电过温') || label.includes('单体放电欠温') ||
        label.includes('单体SOC过高') || label.includes('单体SOC过低')) {
      return false;
    }

    // pack总故障
    if (label.includes('pack电压过高') || label.includes('pack电压过低') ||
        label.includes('pack温度过温') || label.includes('pack温度欠温') ||
        label.includes('动力接插件过温')) {
      return false;
    }

    // 簇总故障1
    if (label.includes('单体电池压差过大故障等级') || label.includes('单体电池温差过大故障等级') ||
        label.includes('SOC差异过大故障等级') || label.includes('BMU压差故障等级') ||
        label.includes('簇端过压故障等级') || label.includes('簇端欠压故障等级') ||
        label.includes('绝缘电阻正对地故障等级') || label.includes('绝缘电阻负对地故障等级')) {
      return false;
    }

    // 簇总故障2
    if (label.includes('充电过流故障等级') || label.includes('放电过流故障等级') ||
        label.includes('RT1过温故障等级') || label.includes('RT2过温故障等级') ||
        label.includes('RT3过温故障等级') || label.includes('RT4过温故障等级') ||
        label.includes('RT5过温故障等级')) {
      return false;
    }

    // 其他TOTAL_FAULT故障（如接触器故障等）正常显示
    return true;
  }

  // 6. 过滤预留字段故障
  if (label.includes('预留') || label.includes('Reserved')) {
    return false
  }

  // 7. 其他故障类型（三级表、硬件故障等）正常显示
  return true
}

/* ---------- 解析 MQTT 消息 ---------- */
export function parseFault (msg: any) {
  //  console.log(msg)
  const { blockId, clusterId, dataType } = msg
  const key = `${blockId}-${clusterId}`

  if (!rawFaultData.has(key))
    rawFaultData.set(key, new Map<string, FaultRecord>())

  const map   = rawFaultData.get(key)!
  const now   = Date.now()
  const tsStr = new Date(now).toLocaleString()

  msg.data.forEach((sec: any) => {
    sec.element.forEach(({ label, value }: any) => {
      /* ---------- ① Bool 字段 ---------- */
      if (typeof value === 'boolean') {
        // 根据字段类型判断故障逻辑
        const isFault = getBrokenwireFaultStatus(label, value, dataType)
        if (isFault) {
          // 应用故障过滤逻辑
          if (!shouldDisplayFault(dataType, label)) {
            return  // 不需要显示的故障直接跳过
          }

          // 根据数据类型选择合适的定位函数
          let bmu, afe, cellInBmu, globalCell, globalTemp

          if (dataType === 'BROKENWIRE') {
            // 掉线信息：根据掉线类型决定是否计算全局序号
            const result = locateBrokenwire(label)
            bmu = result.bmu
            afe = result.afe
            cellInBmu = result.cellInBmu

            // 电压二级掉线：显示全局电芯序号
            if (label.includes('Cell') && label.includes('电压二级掉线')) {
              globalCell = (bmu && cellInBmu) ? calculateGlobalCell(bmu, cellInBmu, msg.baseConfig||{}) : null
              globalTemp = null
            }
            // 温度二级掉线：显示全局温度序号
            else if (label.includes('Temp') && label.includes('温度二级掉线')) {
              globalTemp = (bmu && cellInBmu) ? calculateGlobalTemp(bmu, cellInBmu, msg.baseConfig||{}) : null
              globalCell = null
            }
            // 其他掉线故障：不显示全局序号（BMU失联、AFE失联、插件掉线等）
            else {
              globalCell = null
              globalTemp = null
            }
          } else {
            // 其他故障：使用locateCell解析位置信息
            const result = locateCell(label, msg.baseConfig||{})
            bmu = result.bmu
            afe = result.afe
            cellInBmu = result.cellInBmu
            globalCell = result.globalCell

            // 判断是否为温度故障，计算全局温度序号
            if (label.includes('过温') || label.includes('欠温')) {
              globalTemp = (bmu && cellInBmu) ? calculateGlobalTemp(bmu, cellInBmu, msg.baseConfig||{}) : null
            } else {
              globalTemp = null
            }
          }

          // 生成故障描述，简化掉线信息名称
          let desc = label
          if (dataType === 'BROKENWIRE') {
            // 简化掉线信息的描述
            if (label.includes('AFE') && label.includes('失联')) {
              desc = 'AFE失联'
            } else if (label.includes('插件') && label.includes('温度掉线')) {
              // BMU2 插件1温度掉线 → 插件1温度掉线
              const plugMatch = label.match(/插件(\d+)温度掉线/)
              desc = plugMatch ? `插件${plugMatch[1]}温度掉线` : '插件温度掉线'
            } else if (label.includes('Cell') && label.includes('电压二级掉线')) {
              desc = '电压掉线'
            } else if (label.includes('Temp') && label.includes('温度二级掉线')) {
              desc = '温度掉线'
            } else if (label.includes('失联')) {
              // BMU失联等其他失联保持原样
              desc = label
            } else {
              desc = label
            }
          } else {
            // 其他故障类型保持原有逻辑
            desc = label.replace(/^BMU\d+\s*第\s*\d+\s*节\s*/, '')
          }
          
          // FAULT_LEVEL2的动态翻译在Fault.vue的getFaultTranslation中处理

          // 检查故障是否已存在，保持首次发生时间
          const existingRecord = map.get(label)

          // 根据故障名称判断等级（修复：不再硬编码为严重）
          const faultLevel = getFaultLevelFromLabel(label)

          if (existingRecord) {
            // 故障已存在，只更新必要字段，保持原始时间
            map.set(label, {
              ...existingRecord,
              // 保持原始时间：time 和 ts 不更新
              levelTxt: faultLevel.txt,  // 根据故障名称判断等级
              levelTag: faultLevel.tag as FaultLevelTag,
              // 其他字段保持不变
            })
          } else {
            // 故障首次出现，记录完整信息包括首次发生时间
            map.set(label, {
              label,
              desc,
              time : tsStr,  //  只在首次出现时记录时间
              ts   : now,    //  只在首次出现时记录时间戳
              levelTxt: faultLevel.txt,  // 根据故障名称判断等级
              levelTag: faultLevel.tag as FaultLevelTag,
              bmu, afe, cell: cellInBmu,
              globalCell,  // 全局电芯序号
              globalTemp,  // 全局温度序号
              dataType     // MQTT频道类型
            })
            clusterMutationCounter.set(key, (clusterMutationCounter.get(key) ?? 0) + 1)
          }
        } else {
          // 只有当故障确实存在时才删除（故障恢复）
          if (map.has(label)) {    
            map.delete(label)          // 故障恢复
            clusterMutationCounter.set(key, (clusterMutationCounter.get(key) ?? 0) + 1)
            if (map.size === 0) {
              rawFaultData.delete(key); // 清理空集群
              clusterMutationCounter.delete(key)
            }
          }
        }
        return
      }

      /* ---------- ② 2-bit 等级字段 ---------- */
      if (value && typeof value === 'object' && 'raw' in value) {
        const code = value.raw & 0b11
        if (code === 0) {
          // 只有当故障确实存在时才删除（故障恢复）
          if (map.has(label)) {
            map.delete(label)
            clusterMutationCounter.set(key, (clusterMutationCounter.get(key) ?? 0) + 1)
            if (map.size === 0) {
              rawFaultData.delete(key); // 清理空集群
              clusterMutationCounter.delete(key)
            }
          }
          return
        }
        if (typeof value === 'number') {
          // 直接忽略：既不写 Map，也不删 Map
          return
        }

        // 应用故障过滤逻辑
        if (!shouldDisplayFault(dataType, label)) {
          return  // 不需要显示的故障直接跳过
        }

        // 根据数据类型选择合适的定位函数
        let bmu, afe, cellInBmu, globalCell, globalTemp

        if (dataType === 'BROKENWIRE') {
          // 掉线信息：根据掉线类型决定是否计算全局序号
          const result = locateBrokenwire(label)
          bmu = result.bmu
          afe = result.afe
          cellInBmu = result.cellInBmu

          // 电压二级掉线：显示全局电芯序号
          if (label.includes('Cell') && label.includes('电压二级掉线')) {
            globalCell = (bmu && cellInBmu) ? calculateGlobalCell(bmu, cellInBmu, msg.baseConfig||{}) : null
            globalTemp = null
          }
          // 温度二级掉线：显示全局温度序号
          else if (label.includes('Temp') && label.includes('温度二级掉线')) {
            globalTemp = (bmu && cellInBmu) ? calculateGlobalTemp(bmu, cellInBmu, msg.baseConfig||{}) : null
            globalCell = null
          }
          // 其他掉线故障：不显示全局序号（BMU失联、AFE失联、插件掉线等）
          else {
            globalCell = null
            globalTemp = null
          }
        } else {
          // 其他故障：使用locateCell解析位置信息
          const result = locateCell(label, msg.baseConfig||{})
          bmu = result.bmu
          afe = result.afe
          cellInBmu = result.cellInBmu
          globalCell = result.globalCell

          // 判断是否为温度故障，计算全局温度序号
          if (label.includes('过温') || label.includes('欠温')) {
            globalTemp = (bmu && cellInBmu) ? calculateGlobalTemp(bmu, cellInBmu, msg.baseConfig||{}) : null
          } else {
            globalTemp = null
          }
        }

        const level = LEVEL_MAPPING[code] || LEVEL_CONFIG.SEVERE // 默认严重

        // 生成故障描述，简化掉线信息名称
        let desc = label
        if (dataType === 'BROKENWIRE') {
          // 简化掉线信息的描述
          if (label.includes('AFE') && label.includes('失联')) {
            desc = 'AFE失联'
          } else if (label.includes('插件') && label.includes('温度掉线')) {
            // BMU2 插件1温度掉线 → 插件1温度掉线
            const plugMatch = label.match(/插件(\d+)温度掉线/)
            desc = plugMatch ? `插件${plugMatch[1]}温度掉线` : '插件温度掉线'
          } else if (label.includes('Cell') && label.includes('电压二级掉线')) {
            desc = '电压掉线'
          } else if (label.includes('Temp') && label.includes('温度二级掉线')) {
            desc = '温度掉线'
          } else if (label.includes('失联')) {
            // BMU失联等其他失联保持原样
            desc = label
          } else {
            desc = label
          }
        } else {
          // 其他故障类型保持原有逻辑
          desc = label.replace(/^BMU\d+\s*第\s*\d+\s*节\s*/, '')
        }
        

        //检查故障是否已存在，保持首次发生时间
        const existingRecord = map.get(label)

        if (existingRecord) {
          // 故障已存在，检查等级是否变化
          const oldLevel = existingRecord.levelTag
          const newLevel = level.tag as FaultLevelTag
          const isLevelChanged = oldLevel !== newLevel

          map.set(label, {
            ...existingRecord,
            // 2-bit字段：等级变化时更新时间，否则保持原时间
            time: isLevelChanged ? tsStr : existingRecord.time,
            ts: isLevelChanged ? now : existingRecord.ts,
            levelTxt: level.txt,  // 更新等级文本（可能变化）
            levelTag: newLevel,   // 更新等级标签（可能变化）
            // 其他字段保持不变
          })
        } else {
          // 故障首次出现，记录完整信息包括首次发生时间
          map.set(label, {
            label,
            desc,
            time : tsStr,  // 只在首次出现时记录时间
            ts   : now,    // 只在首次出现时记录时间戳
            levelTxt: level.txt,
            levelTag: level.tag as FaultLevelTag,
            bmu, afe, cell: cellInBmu,
            globalCell,  // 全局电芯序号
            globalTemp,  // 全局温度序号
            dataType     // MQTT频道类型
          })
          clusterMutationCounter.set(key, (clusterMutationCounter.get(key) ?? 0) + 1)
        }
      }
    })
  })

  // 使用节流更新替代直接更新，防止内存泄漏
  throttledUpdate()
}


/* ---------- 根据系统配置清理无效堆簇的故障数据 ---------- */
/**
 * 根据系统配置清理无效堆簇的故障数据
 * @param {Array} validClusters - 有效的簇选项列表
 */
function cleanupInvalidClusterFaults(validClusters: Array<{value: string}>) {
  // 构建有效堆簇的 Set
  const validKeys = new Set(validClusters.map(c => c.value))
  const validBlockKeys = new Set(
    validClusters.map(c => {
      const [block] = c.value.split('-').map(Number)
      return `${block}-0` // 堆告警格式
    })
  )
  
  let cleanedCount = 0
  // 遍历 rawFaultData，删除无效堆簇的数据
  for (const [clusterKey, faultMap] of rawFaultData.entries()) {
    // 检查是否为有效堆簇
    if (!validKeys.has(clusterKey) && !validBlockKeys.has(clusterKey)) {
      cleanedCount += faultMap.size
      rawFaultData.delete(clusterKey) // 删除整个堆簇的故障数据
      clusterMutationCounter.delete(clusterKey)
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 [parseFault] 清理了 ${cleanedCount} 个无效堆簇的故障数据`)
    // 强制清除缓存，确保下次更新时重新计算
    lastDataHash = ''  // 清除缓存指纹
    sortedCache = []   // 清除缓存数据
    throttledUpdate()  // 触发响应式更新
  }
}

// 监听 clusterStore 的 availableClusters 变化
const clusterStore = useClusterStore()
watch(
  () => clusterStore.availableClusters,
  (newClusters: Array<{value: string}>, oldClusters?: Array<{value: string}>) => {
    // 只在配置真正变化时清理（避免初始化时误清理）
    if (newClusters && newClusters.length > 0) {
      // 检查是否真的有变化（通过长度或内容比较）
      const hasChanged = !oldClusters || 
                        oldClusters.length !== newClusters.length ||
                        !oldClusters.every((old, idx) => 
                          newClusters[idx]?.value === old.value
                        )
      
      if (hasChanged) {
        cleanupInvalidClusterFaults(newClusters)
      }
  } else if (newClusters && newClusters.length === 0) {
    // 如果配置变为空，清理所有故障数据
    rawFaultData.clear()
    clusterMutationCounter.clear()
    throttledUpdate()
  }
},
{ deep: true }
)

/* ---------- 调试工具（生产环境可移除） ---------- */
export function logMemoryUsage(tag: string) {
  const perf = window.performance as Performance & { memory?: PerformanceMemory }
  if (perf.memory) {
    console.log(
      `[Memory ${tag}] ` +
      `Used: ${(perf.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB | ` +
      `Total: ${(perf.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB | ` +
      `Raw数据大小: ${rawFaultData.size} clusters, ` +
      `总故障数: ${Array.from(rawFaultData.values()).reduce((sum, m) => sum + m.size, 0)}`
    )
  }
}
