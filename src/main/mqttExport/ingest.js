import { cacheSampleSemantic } from './bauDataExport'
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

export function processClusterSummary({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  cacheSampleSemantic('clusterSummary', data || [], deviceId, Date.now(), baseConfig)
}

export function processPackSummary({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  cacheSampleSemantic('packSummary', data || [], deviceId, Date.now(), baseConfig)
}
export function processAlarmSemantic({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  const categories = []
  for (const group of (data || [])) {
    const cls = group && group.class ? group.class : ''
    const arr = []
    const elements = group && group.element ? group.element : []
    for (const el of elements) {
      const item = { fault: el.label, faultZh: el.label, level: (typeof el.value === 'object' && el.value && 'txt' in el.value) ? el.value.txt : '', actionValue: '', bmuIndex: (el.bmuIndex || el.bmu || ''), cellIndex: (el.cellIndex || el.cell || ''), cellIndexRelative: (el.cellIndexRelative || ''), timestamp: Date.now() }
      arr.push(item)
    }
    categories.push({ classification: cls, element: arr })
  }
  cacheSampleSemantic('alarm', categories, deviceId, Date.now(), baseConfig)
}

export function processBlockSummary({ topic, hex, blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  // utils.parseBlockSummaryRAW 返回 { error:false, data: baseConfig }
  // 因此优先使用 data 作为 baseConfig；若未来修正为返回 baseConfig，则仍兼容
  const bc = (data && typeof data === 'object' && Object.keys(data).length) ? data : baseConfig
  // 注意：block_summary 的表头是固定的（由 BLOCK_SUMMARY 定义），不应因数值变化而重复写入表头
  // 因此这里传入的 meta 设为 null，避免触发表头重写逻辑
  cacheSampleSemantic('blockSummary', bc ? [bc] : [], deviceId, Date.now(), null)
}
