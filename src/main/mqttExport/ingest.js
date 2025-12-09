/**
 * MQTT 数据整形入口（语义缓存）
 *
 * 职责：
 * - 将各 Topic 解析后的数据整形为统一结构并写入 latest 缓存
 * - 普通数据使用固定键：cellVoltage/cellTemperature/cellSOC/cellSOH/clusterSummary/packSummary/blockSummary
 * - 故障数据使用动态键：'alarm_<dataType>'（如 TOTAL_FAULT/FAULT_LEVEL2），避免同周期覆盖
 *
 * 下游：
 * - 由 bauDataExport.js 的定时器统一消费 latest 并写入 CSV（约 2 秒一次）
 */
import { cacheSampleSemantic } from './bauDataExport'
import { getFaultLevelFromLabel } from '../../protocol/faultLogic'

/**
 * 处理单体电压数据并缓存到 latest
 * @param {{topic:string,hex:string,blockId:number,clusterId:number,baseConfig:Object,data:Array}} params - MQTT解析后的参数集合
 * @returns {void}
 * @example
 * processCellVolt({ topic, hex, blockId, clusterId, baseConfig, data })
 */
export function processCellVolt({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  const packs = new Map()
  let globalIndex = 0
  for (const group of (data || [])) {
    const bmuId = group && group.bmuId ? group.bmuId : 1
    let pack = packs.get(bmuId)
    if (!pack) { pack = { packID: bmuId, cells: [] }; packs.set(bmuId, pack) }
    const elements = group && group.element ? group.element : []
    for (const el of elements) {
      const val = el.value
      globalIndex++
      pack.cells.push({ index: String(globalIndex).padStart(3, '0'), bmuIndex: pack.cells.length + 1, value: val })
    }
  }
  const dataList = Array.from(packs.values())
  const total = dataList.reduce((s, p) => s + p.cells.length, 0)
  const expectedTotal = baseConfig && baseConfig.totalCell ? baseConfig.totalCell : 0
  const perBmu = baseConfig && baseConfig.afePerBmu ? baseConfig.afePerBmu : 0
  const counts = baseConfig && baseConfig.afeCellCounts ? baseConfig.afeCellCounts : []
  let perBmuExpected = 0
  for (let a = 0; a < perBmu; a++) perBmuExpected += counts[a] || 0
  const perBmuOk = dataList.every((p) => p.cells.length === perBmuExpected)
  if (total === expectedTotal && perBmuOk) {
    cacheSampleSemantic('cellVoltage', dataList, deviceId, Date.now(), baseConfig)
  }
}

/**
 * 处理单体温度数据并缓存到 latest
 * @param {{topic:string,hex:string,blockId:number,clusterId:number,baseConfig:Object,data:Array}} params - MQTT解析后的参数集合
 * @returns {void}
 */
export function processCellTemp({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  const packs = new Map()
  let globalIndex = 0
  for (const group of (data || [])) {
    const bmuId = group && group.bmuId ? group.bmuId : 1
    let pack = packs.get(bmuId)
    if (!pack) { pack = { packID: bmuId, cells: [] }; packs.set(bmuId, pack) }
    const elements = group && group.element ? group.element : []
    for (const el of elements) {
      const val = el.value
      globalIndex++
      pack.cells.push({ index: String(globalIndex).padStart(3, '0'), bmuIndex: pack.cells.length + 1, value: val })
    }
  }
  const dataList = Array.from(packs.values())
  const total = dataList.reduce((s, p) => s + p.cells.length, 0)
  const expectedTotal = baseConfig && baseConfig.totalTemp ? baseConfig.totalTemp : 0
  const perBmu = baseConfig && baseConfig.afePerBmu ? baseConfig.afePerBmu : 0
  const counts = baseConfig && baseConfig.afeTempCounts ? baseConfig.afeTempCounts : []
  let perBmuExpected = 0
  for (let a = 0; a < perBmu; a++) perBmuExpected += counts[a] || 0
  const perBmuOk = dataList.every((p) => p.cells.length === perBmuExpected)
  if (total === expectedTotal && perBmuOk) {
    cacheSampleSemantic('cellTemperature', dataList, deviceId, Date.now(), baseConfig)
  }
}

/**
 * 处理单体SOC数据并缓存到 latest
 * @param {{topic:string,hex:string,blockId:number,clusterId:number,baseConfig:Object,data:Array}} params - MQTT解析后的参数集合
 * @returns {void}
 */
export function processCellSoc({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  const packs = new Map()
  let globalIndex = 0
  for (const group of (data || [])) {
    const bmuId = group && group.bmuId ? group.bmuId : 1
    let pack = packs.get(bmuId)
    if (!pack) { pack = { packID: bmuId, cells: [] }; packs.set(bmuId, pack) }
    const elements = group && group.element ? group.element : []
    for (const el of elements) {
      const val = el.value
      globalIndex++
      pack.cells.push({ index: String(globalIndex).padStart(3, '0'), bmuIndex: pack.cells.length + 1, value: val })
    }
  }
  const dataList = Array.from(packs.values())
  const total = dataList.reduce((s, p) => s + p.cells.length, 0)
  const expectedTotal = baseConfig && baseConfig.totalCell ? baseConfig.totalCell : 0
  const perBmu = baseConfig && baseConfig.afePerBmu ? baseConfig.afePerBmu : 0
  const counts = baseConfig && baseConfig.afeCellCounts ? baseConfig.afeCellCounts : []
  let perBmuExpected = 0
  for (let a = 0; a < perBmu; a++) perBmuExpected += counts[a] || 0
  const perBmuOk = dataList.every((p) => p.cells.length === perBmuExpected)
  if (total === expectedTotal && perBmuOk) {
    cacheSampleSemantic('cellSOC', dataList, deviceId, Date.now(), baseConfig)
  }
}

/**
 * 处理单体SOH数据并缓存到 latest
 * @param {{topic:string,hex:string,blockId:number,clusterId:number,baseConfig:Object,data:Array}} params - MQTT解析后的参数集合
 * @returns {void}
 */
export function processCellSoh({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  const packs = new Map()
  let globalIndex = 0
  for (const group of (data || [])) {
    const bmuId = group && group.bmuId ? group.bmuId : 1
    let pack = packs.get(bmuId)
    if (!pack) { pack = { packID: bmuId, cells: [] }; packs.set(bmuId, pack) }
    const elements = group && group.element ? group.element : []
    for (const el of elements) {
      const val = el.value
      globalIndex++
      pack.cells.push({ index: String(globalIndex).padStart(3, '0'), bmuIndex: pack.cells.length + 1, value: val })
    }
  }
  const dataList = Array.from(packs.values())
  const total = dataList.reduce((s, p) => s + p.cells.length, 0)
  const expectedTotal = baseConfig && baseConfig.totalCell ? baseConfig.totalCell : 0
  const perBmu = baseConfig && baseConfig.afePerBmu ? baseConfig.afePerBmu : 0
  const counts = baseConfig && baseConfig.afeCellCounts ? baseConfig.afeCellCounts : []
  let perBmuExpected = 0
  for (let a = 0; a < perBmu; a++) perBmuExpected += counts[a] || 0
  const perBmuOk = dataList.every((p) => p.cells.length === perBmuExpected)
  if (total === expectedTotal && perBmuOk) {
    cacheSampleSemantic('cellSOH', dataList, deviceId, Date.now(), baseConfig)
  }
}

/**
 * 处理簇端概要数据并缓存到 latest
 * @param {{topic:string,hex:string,blockId:number,clusterId:number,baseConfig:Object,data:Array}} params - MQTT解析后的参数集合
 * @returns {void}
 */
export function processClusterSummary({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  cacheSampleSemantic('clusterSummary', data || [], deviceId, Date.now(), baseConfig)
}

/**
 * 处理包端概要数据并缓存到 latest
 * @param {{topic:string,hex:string,blockId:number,clusterId:number,baseConfig:Object,data:Array}} params - MQTT解析后的参数集合
 * @returns {void}
 */
export function processPackSummary({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  cacheSampleSemantic('packSummary', data || [], deviceId, Date.now(), baseConfig)
}
/**
 * 处理故障类数据并缓存到 latest（动态键分流，避免不同Topic在采样窗口内覆盖）
 * @param {{topic:string,hex:string,blockId:number,clusterId:number,baseConfig:Object,data:Array}} params - MQTT解析后的参数集合
 * @returns {void}
 */
export function processAlarmSemantic({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  const parts = topic.split('/')
  const dataType = parts[parts.length - 1].toUpperCase()
  
  const categories = []
  for (const group of (data || [])) {
    const cls = group && group.class ? group.class : ''
    const arr = []
    const elements = group && group.element ? group.element : []
    for (const el of elements) {
      // 1. Determine Level
      let level = ''
      if (typeof el.value === 'object' && el.value && 'txt' in el.value) {
        level = el.value.txt
      } else if (typeof el.value === 'boolean' && el.value) {
        // For boolean faults (triggered), use label to determine level
        const levelConfig = getFaultLevelFromLabel(el.label)
        level = levelConfig ? levelConfig.txt : ''
      }
      
      // 2. Determine Action Value
      let actionValue = ''
      if (typeof el.value === 'object' && el.value && 'raw' in el.value) {
        actionValue = el.value.raw
      } else {
        actionValue = el.value
      }

      const item = { 
        fault: el.label, 
        faultZh: el.label, 
        level: level, 
        actionValue: actionValue, 
        bmuIndex: (el.bmuIndex || el.bmu || ''), 
        cellIndex: (el.cellIndex || el.cell || ''), 
        cellIndexRelative: (el.cellIndexRelative || ''), 
        timestamp: Date.now(), 
        value: el.value 
      }
      arr.push(item)
    }
    categories.push({ classification: cls, dataType, element: arr })
  }
  // Use cached processing for alarms, handled by the timer (Reference Project Architecture)
  // Fix: Use dynamic key to prevent overwriting different alarm topics (e.g. TOTAL_FAULT vs FAULT_LEVEL2)
  cacheSampleSemantic('alarm_' + dataType, categories, deviceId, Date.now(), baseConfig)
}

/**
 * 处理堆概要数据并缓存到 latest（表头固定，传入 meta=null 避免重复表头）
 * @param {{topic:string,hex:string,blockId:number,clusterId:number,baseConfig:Object,data:Object}} params - MQTT解析后的参数集合
 * @returns {void}
 */
export function processBlockSummary({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  // utils.parseBlockSummaryRAW 返回 { error:false, data: baseConfig }
  // 因此优先使用 data 作为 baseConfig；若未来修正为返回 baseConfig，则仍兼容
  const bc = (data && typeof data === 'object' && Object.keys(data).length) ? data : baseConfig
  // 注意：block_summary 的表头是固定的（由 BLOCK_SUMMARY 定义），不应因数值变化而重复写入表头
  // 因此这里传入的 meta 设为 null，避免触发表头重写逻辑
  cacheSampleSemantic('blockSummary', bc ? [bc] : [], deviceId, Date.now(), null)
}
