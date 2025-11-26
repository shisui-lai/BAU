# BCU 上位机 dataExport 功能实现详解（仅限运行数据/告警/原始帧，不含 eventExport）

> 目标：针对 `dataExport` 功能做彻底分析，覆盖采集缓存、定时落盘、CSV 结构、文件管理、异常处理与性能优化；并给出基于 MODBUS 与基于 MQTT 的实现差异与改造建议。
>
> 代码根路径：`d:/工作相关/09_高速上位机/BAU/src_HSBCU_1121/modbus/dataExport/`

---

## 架构与职责划分

```text
采集(read.js) ──► 缓存(cacheSample) ──► 定时器(startSaveTimer) ──► 写入行(bufferCsvData)
                                                │                     │
                                                │                     ├─► flushCsvBuffers 刷盘
                                                │                     └─► 文件轮转/跨日(getCsvFilePath)

原始帧：modbusClient 抓取 → 行拼接 → rowBufferExport.appendToCSV → 轮转压缩
配置一次性导出：configDataExport.exportConfigData（JSON，一次一写）
```

- 周期运行数据与告警导出：`runningDataExport.js`
- 原始 Modbus 帧导出：`rowBufferExport.js`（辅助排障，独立于周期数据）
- 文件与写入工具：`dataExport/utils.js`
- 配置一次性导出：`configDataExport.js`

---

## 周期运行数据导出（runningDataExport.js）

**核心常量与目录**
- 根目录：`dataExports`，子目录：`Data_{YYYYMMDD_hh_mm_ss}` `runningDataExport.js:27/29`
- 刷盘间隔：`CSV_BUFFER_INTERVAL`（来自 rowBufferExport）`runningDataExport.js:2`
- 最小可用空间：`MIN_FREE_SPACE`，文件大小阈值：`FILE_SIZE_LIMIT`（用于轮转）`runningDataExport.js:2`

**缓存入口**
- `cacheSample(api, dataList, ip, ts, bmuTotal, AFETotal, afeConfig)` 将最新样本按 API 与 IP 缓存 `runningDataExport.js:1194`
- 采集端调用示例：
  - 基础批量：`modbus/handlers/read.js:548/550`
  - 簇/Pack：`modbus/handlers/read.js:923–926`
  - 告警分类：`modbus/handlers/read.js:1404`

**定时器主循环**
- `startSaveTimer()` 每 1000ms 扫描 `latestSamples`，仅当样本时间戳较上次已写入更新时才写入 `runningDataExport.js:355/366/371`
- 写入分发：`switch(api)` 将不同 API 调用至对应保存函数 `runningDataExport.js:378–398`
- 状态监控与异常保护：写入异常不终止定时器，并记录 `runningDataExport.js:410`

**完整执行链路（逐步）**
- 开启导出：主进程向子进程发送 `startExportFromMain`，子进程置 `client.isSetDataExport=true` 并调用 `startSaveTimer()` `modbus/mbstask.js:423–431`。
- 采集缓存：各 `readModbusData_*` 函数采集成功后调用 `cacheSample(api, data, ip, ts, bmuTotal, AFETotal, afeConfig)` `modbus/handlers/read.js:548–551/923–931/1404`。
- 定时写入：定时器扫描 `latestSamples`，比较 `lastWritten[api][ip].timestamp`，仅写入更新的样本 `runningDataExport.js:367–375/400–405`。
- 构造表头：首次或配置参数变化（BMU/AFE数量）时，重新生成表头并插入一行 header `runningDataExport.js:571–581/738–742/793–797`。
- 缓冲行：不直接 IO，先通过 `bufferCsvData` 将行加入 `csvBuffers[filePath].buffer`，持锁范围仅限内存更新 `runningDataExport.js:650–668`。
- 刷盘与轮转：`flushCsvBuffers()` 获取快照、写入文件（首次写入时带 BOM + header），之后判断超限或跨日进行轮转并更新 `currentFileMap` `runningDataExport.js:312–320/331–343`。
- 状态监控：`exportStatusMonitor` 记录最近写入时间与次数，超 30s 未写入发警告 `runningDataExport.js:195–236`。

**目录与文件命名**
- 每 IP 独立子目录：`BCU{序号}({IP})_{ipSuffix}` `runningDataExport.js:618–621`
- `getCsvFilePath(ip, dataType)` 负责跨日与轮转后的新路径生成，确保目录存在 `runningDataExport.js:606–621`
- 跨日切换：检测 `isNewDay(key)`，更新 `currentFileMap` 并清理旧 buffer `runningDataExport.js:702–708`

**写入缓冲与刷盘**
- 写入行：`bufferCsvData(filePath, key, header, row)` 将行追加到 `csvBuffers[filePath].buffer` `runningDataExport.js:655–663`
- 刷盘：`flushCsvBuffers()` 扫描所有 `csvBuffers`，将缓冲行通过 `appendFileWithRetry` 持久化，并在超限或跨日时轮转 `runningDataExport.js:279/320/331–343`
- 首次写入：若文件不存在则写入 `\uFEFF + header + \r\n`（含 BOM），随后批量追加行 `runningDataExport.js:312–315/320`
- 互斥：短暂持锁仅限于更新映射，实际 IO 使用原子 `appendFileWithRetry`，避免长锁 `runningDataExport.js:339/344`

**数据类型与表头**
- 单体/基础类：`FC04Vltg`、`FC04Temp`、`FC04SOC`、`FC04SOH` → 以 BMU/A FE 配置生成列头；第一行包含 BOM + 拼接后的 CSV 头 `runningDataExport.js:820–846`
- 簇与汇总：`FC04ClusExtreme`、`FC04ClusterSumm` → 安全文件名与表头生成、首行写头 `runningDataExport.js:768–789`
- BMU/Pack 汇总：`FC04dataPackSumm1` → 动态列头，保存至对应文件 `runningDataExport.js:729–749`
- 告警：`FC04Alarm` → 固定表头 `ID,导出时间,故障产生时间,告警,告警等级,动作值,BMU编号,Cell/Temp绝对索引,Cell/Temp相对索引` `runningDataExport.js:895–906`

**告警归并逻辑（O(1)）**
- 扁平化分类为列表，构建“无等级键”以 Map 直接查找历史，最多 3 次试探不同等级，避免 O(n²) `runningDataExport.js:939–1003`
- 升阶/降阶/恢复的事件合并与时间戳处理 `runningDataExport.js:1011–1152`
- 消失恢复检测：从当前列表缺失的旧告警写“已恢复” `runningDataExport.js:1156–1169`
- 按时间排序后写行 `runningDataExport.js:1171–1192`

**典型 CSV 行示例（告警）**
```csv
ID,导出时间,故障产生时间,告警,告警等级,动作值,BMU编号,Cell/Temp绝对索引,Cell/Temp相对索引
1,2025-11-21 10:00:01,2025-11-21 10:00:00,单体过压严重总故障,严重,4.200V,BMU3,Cell045,Cell5
```
（具体字段取自分类元素的 `fault/faultZh/level/actionValue/bmuIndex/cellIndex/cellIndexRelative`，由上游采集与 `assignActionValue` 填充 `modbus/handlers/read.js:954–1019`）

**磁盘空间与轮转**
- 写前检测缓存的可用空间：`getCachedFreeDiskSpace(RUN_EXPORT_DIR)` 不足则通知 `disk-space-warning` `runningDataExport.js:261–263`
- 超限/跨日轮转：更新 `currentFileMap` 并重置对应 `csvBuffers` 入口 `runningDataExport.js:331–343`

---

## 原始报文导出（rowBufferExport.js）

**定位与用途**
- 属于 `dataExport` 目录，但功能独立于周期运行数据；用于抓取 Modbus 请求/响应原始帧并落盘，辅助排障与审计。

**关键点**
- 常量：`FILE_SIZE_LIMIT=500MB`、`MIN_FREE_SPACE=1GB`、`CSV_BUFFER_INTERVAL=1000ms` `rowBufferExport.js:74–76`
- 路径：同 `Data_{suffix}` 下为每 IP 创建 `BCU{序号}({IP})_{ipSuffix}_frames` 子目录 `rowBufferExport.js:118–129`
- 写入：`appendToCSV(lines, ip)` 原子追加 + BOM 首行；检查轮转并在超限时 `.gz` 压缩、IP 后缀更新 `rowBufferExport.js:226/238–245/177–205`
- 队列处理与触发：由 `modbusClient` 内部的队列阈值与兜底定时触发 `modbus/client/modbusClient.js:233/239/278/251`

**执行链路（简版）**
- `modbusClient.attachRawFrameListeners()` 拦截 TCP 写/读，将 `request/response` 放入全局队列 `modbus/client/modbusClient.js:852–881`。
- 达阈/兜底定时触发 `processIpQueue(ip)`，批量格式化为 CSV 行并调用 `saveRawDataBatchStatic` → `appendToCSV(lines, ip)` `modbus/client/modbusClient.js:239–267/886–944`。
- `appendToCSV` 首次写入 BOM+HEADER，之后每次仅追加行；文件超限触发 gzip 压缩与 IP 后缀更新 `modbus/dataExport/rowBufferExport.js:225–276/177–205`。

---

## 工具与写入（dataExport/utils.js）

**写入重试与决策**
- `appendFileWithRetry(filePath, content)` 捕获 `EBUSY` 时发送 `save-excel`，等待前端 `save-excel-decision` 后重试 `dataExport/utils.js:185–208`

**通用**
- `formatFileSuffix(date)` 统一 `{YYYYMMDD_hh_mm_ss}` 后缀 `dataExport/utils.js:154–163`
- `ensureDir(dir)` 递归创建目录 `dataExport/utils.js:151–153`
- `parseModbusFrame(hex)` 辅助解析帧字段（用于原始帧 CSV）`dataExport/utils.js:140–150`

---

## 配置数据一次性导出（configDataExport.js）

**行为**
- `exportConfigData(deviceIp, dataType, data)` 仅导出一次，写入 `dataExports/ConfigData/{IP}_{Type}_{timestamp}.json` `configDataExport.js:21–29/38–45`
- 状态防重：`exportStatus` Map 记录已导出项目 `configDataExport.js:4–5/42–47`

---



## MODBUS 与 MQTT 的实现差异与改造建议

**差异概览**
- 数据来源：
  - MODBUS：上位机主动轮询寄存器，采集到结构化对象后 `cacheSample` 入缓存。
  - MQTT：设备主动发布消息，上位机订阅主题并回调处理；无需主动轮询。
- 触发机制：
  - MODBUS：`mbstask` 每秒调度读取 → `latestSamples` 更新时间戳 → 定时器写盘。
  - MQTT：消息到达即更新缓存；定时器逻辑保持一致（按时间戳去重写入）。
- 原始帧：
  - MODBUS：socket 拦截写/读构造帧行。
  - MQTT：可选做“原始消息日志”（主题/载荷/时间），复用 `appendFileWithRetry` 与轮转策略。

**改造建议（逐项）**
- 采集替换：
  - 建立 `onMqttMessage(topic, payload, clientId)` → 映射到现有 `api` 名称。
  - 构造 `dataList` 结构与现有 CSV 头一致（需要字段对齐，如 BMU/AFE 维度、簇汇总字段名、告警分类结构）。
  - 调用 `cacheSample(api, dataList, clientIdAsIp, Date.now(), bmuTotal, AFETotal, afeConfig)`。
- 告警逻辑保留：
  - 维持 O(1) Map 键策略与升/降级/恢复合并；仅输入来源变为 MQTT 消息。
- 文件与目录策略：
  - 仍以 `dataExports/Data_{suffix}/BCU{序号}({IP})_{ipSuffix}` 组织；MQTT 中 `IP` 可替换为设备标识（clientId）。
- 回退与重试：
  - 保留 `EBUSY` 决策与最小空间检查；MQTT 连接/会话保活与重连由上位层负责。
- 原始日志：
  - 如需保留原始消息日志，定义 `Raw_Messages_{fileSuffix}.csv`，列头：`ID,时间,主题,clientId,Payload(hex/JSON)`；复用 `appendFileWithRetry` 与 `checkFileRotation`。

**MQTT 适配参考实现（示意）**
```js
// mqttIngest.js（示例骨架）
import { cacheSample, startSaveTimer } from './modbus/dataExport/runningDataExport'

// 1) 启动定时器（与Modbus一致）
startSaveTimer()

// 2) 话题映射（建议沿用 FC04* 命名，便于直接复用保存函数）
const topicToApi = {
  'bcu/cell/vltg': 'FC04Vltg',
  'bcu/cell/temp': 'FC04Temp',
  'bcu/cell/soc': 'FC04SOC',
  'bcu/cell/soh': 'FC04SOH',
  'bcu/cluster/summ': 'FC04ClusterSumm',
  'bcu/cluster/extreme': 'FC04ClusExtreme',
  'bcu/pack/summ1': 'FC04dataPackSumm1',
  'bcu/alarm': 'FC04Alarm'
}

// 3) 将MQTT消息转为 dataList 结构（需与当前CSV头一致）
function toCellDataList(payload) {
  // 规范化为 [{ packID, cells: [{ index, bmuIndex, value }] }]
  // payload 示例应包含 pack/bmu/cell 三层索引
  return payload.packs.map((p) => ({
    packID: p.id,
    cells: p.cells.map((c) => ({ index: c.index, bmuIndex: c.bmuIndex, value: c.value }))
  }))
}

function onMqttMessage(topic, payload, clientId) {
  const api = topicToApi[topic]
  if (!api) return
  const ts = Date.now()
  let dataList
  switch (api) {
    case 'FC04Vltg':
    case 'FC04Temp':
    case 'FC04SOC':
    case 'FC04SOH':
      dataList = toCellDataList(payload)
      break
    case 'FC04ClusterSumm':
    case 'FC04ClusExtreme':
    case 'FC04dataPackSumm1':
      dataList = payload // 需构造成与 read.js 输出一致的 { classification, element:[{label,value,index?...}] }
      break
    case 'FC04Alarm':
      dataList = payload // 需构造成分类数组，元素带 bmuIndex/cellIndex/level 等
      break
  }
  // MQTT下的设备标识建议使用 clientId 替代 ip
  cacheSample(api, dataList, clientId, ts, payload.bmuTotal, payload.AFETotal, payload.afeConfig)
}
```

**MQTT 细节注意事项**
- 数据结构对齐：务必保证 `element/label/value/index` 等字段名与现有保存函数一致，否则列头或行值错位。
- 时间戳策略：保留“样本时间戳增量才写入”的策略，避免重复写同一数据。
- 分设备目录：用 `clientId` 替代 IP；`getBcuNumber` 可改为按 `clientId` 的排序或维度映射。
- 告警合并：保证分类与唯一键构造不变（`classification/bmuIndex/cellIndex/fault/level`），否则升/降级与恢复判断失效。
- 原始日志：若需要消息日志，定义新模块但保持 `.gz` 轮转与空间检查策略一致。

---

## 数据来源与结构（BCU/Modbus 现状）

**采集入口与数据结构**
- 基础单体数据：`readModbusData_cellData` 生成 `flatVltg/flatTemp/flatSOC/flatSOH`，每项为数组列表，形如：
```js
// 每台设备（IP）对应的样本 dataList 结构
[
  {
    packID: 1,
    cells: [
      { value: 3.987, index: '001', bmuIndex: 1 },
      { value: 3.992, index: '002', bmuIndex: 1 },
      // ...
    ]
  },
  // ... 更多 pack
]
```
（来源：栈式解析并填充 `index/bmuIndex/value`，随后经 `sendDataTypes` 分发与缓存 `modbus/handlers/read.js:480–514/527–551`）

- 簇端极值与汇总：`readModbusData_packClusterData` 输出 `new_dataClusExtremeNew/new_dataClusterSummNew/new_dataPackSummNew` 三组结构，并发送与缓存：
```js
// 以分类/元素形式组织，元素带 label/value/index(可选)
[
  { classification: '簇端极值数据', element: [ { label: '最高单体电压(V)', value: 4.200, index: 45 }, ... ] },
  { classification: '簇端极值数据', element: [ { label: '最低单体电压(V)', value: 3.123, index: 12 }, ... ] }
]
```
（保存时按 `classification` 前缀拼接列头，并在存在 `index` 时追加“编号”列 `runningDataExport.js:831–843/849–859`；采集与发送路径 `modbus/handlers/read.js:913–931/918–921/923–931`）

- BMU/Pack 汇总：`FC04dataPackSumm1` 以 `classification/element[{label,value}]` 输出并缓存，保存时每个分类各一个 CSV 文件，列头为元素 label `runningDataExport.js:782–804`。

- 告警分类：`readModbusData_alarmData` 将多源告警整合为 `processedAPIData` 分类数组，并缓存至 `FC04Alarm` `modbus/handlers/read.js:1359–1404`。

**动作值分配（告警）**
- 基于缓存的单体/簇/包汇总映射，为不同分类补充动作值，如“簇端过压→簇电压”、“充放电过流→簇电流”、“绝缘电阻低→R+/R-” `modbus/handlers/read.js:954–1019`。

**目录组织与命名**
- 运行数据：`RUN_EXPORT_DIR = dataExports/Data_{YYYYMMDD_hh_mm_ss}`，每 IP 独立子目录 `BCU{序号}({IP})_{ipSuffix}`，文件名 `{DataType}_{fileSuffix}.csv` `runningDataExport.js:27/29/618–627`。
- 原始帧：同路径下 `..._frames/Raw_Frames_{fileSuffix}.csv` `rowBufferExport.js:118–129/128–129`。

---

## 启停与异常流程（运维角度）

- 开启：主进程发送 `startExportFromMain` → 客户端标记导出 → 调用 `startSaveTimer()` `modbus/mbstask.js:423–431`。
- 停止：主进程发送 `stopExportFromMain` → 取消标记 → `stopSaveTimer()` 清理缓存与监控（保留部分映射以防残留写入路径丢失）`modbus/mbstask.js:432–441/437–469`。
- 磁盘空间不足：`flushCsvBuffers` 检测 `MIN_FREE_SPACE`，触发 `disk-space-warning` 并跳过写入 `runningDataExport.js:261–265`。
- 写入占用：`appendFileWithRetry` 捕获 `EBUSY`，前端交互决策后继续 `dataExport/utils.js:185–208`。
- 清理：提供 `forceCleanupCaches()` 手动清空各缓存以释放内存 `runningDataExport.js:476–509`。

---

## 迁移建议的代码变更清单（MQTT 版）

- 新增：`mqttIngest` 层，将消息转为现有 `api` 与 `dataList` 并调用 `cacheSample`。
- 修改：`getBcuNumber` 支持按 `clientId` 计算序号（替代 IP）；或直接用 `clientId` 命名子目录。
- 复用：`runningDataExport.js` 的 `startSaveTimer/flushCsvBuffers/save*Data` 全部复用；无需改动表头生成逻辑，只需保证数据字段对齐。
- 扩展：原始日志可选新增 `Raw_Messages` 模块（复用 `rowBufferExport.js` 写入与轮转策略）。
- 注意：
  - 一定要填充 `bmuTotal/AFETotal/afeConfig`，否则表头不会反映真实拓扑；并会导致 `isConfigChanged` 无法正确插入新表头。
  - 保持分类/元素的 `label/value/index` 命名一致；任何字段名差异都需要在保存函数内同步调整。
  - 处理高并发消息：`cacheSample` 只保留“最新样本”，避免频繁写盘；必要时加批处理窗口以降低 IO 压力。

---

## 附：关键函数代码片段（摘录）

```js
// 定时器写盘与分发（runningDataExport.js:355）
saveTimer = setInterval(() => {
  const now = Date.now()
  Object.keys(latestSamples).forEach((api) => {
    lastWritten[api] = lastWritten[api] || {}
    Object.keys(latestSamples[api]).forEach((ip) => {
      const sample = latestSamples[api][ip]
      const prev = lastWritten[api][ip]
      if (!prev || (sample && sample.timestamp > prev.timestamp)) {
        switch (api) { /* ...保存函数分发... */ }
        lastWritten[api][ip] = { timestamp: sample.timestamp, dataList: sample.dataList }
        exportStatusMonitor.recordWrite(ip)
      }
    })
  })
}, 1000)
```

```js
// 首次写入时带BOM与表头；之后批量追加（runningDataExport.js:312–320）
if (!stats) {
  await writeFileWithRetry(filePath, '\uFEFF' + header + '\r\n')
}
await appendFileWithRetry(filePath, lines.map((line) => line + '\r\n').join(''))
```

```js
// 配置变化时插入新表头（runningDataExport.js:571–581/738–742）
function isConfigChanged(key, bmuTotal, AFETotal, afeConfig) {
  const cfgJson = JSON.stringify({ bmuTotal, AFETotal, afeConfig })
  if (configSnapshotMap.get(key) !== cfgJson) {
    configSnapshotMap.set(key, cfgJson)
    pendingNewHeader.add(key)
    return true
  }
  return false
}
// 在下一次写入行前将 header 推入 buffer 并重置行号
if (pendingNewHeader.has(key)) {
  entry.buffer.push(header)
  entry.rowCounter = 0
  pendingNewHeader.delete(key)
}
```

---

## 验证与测试用例（dataExport 专用）

1) 周期数据落盘
- 启动 `startExportFromMain`，经 `mbstask` 将 `isSetDataExport=true` 并 `startSaveTimer()`；等待数个周期。
- 断言：`dataExports/Data_{suffix}/BCU{n}({ip})_{ipSuffix}` 下出现各 API 的 CSV；每次仅在样本时间戳更新时写入。
- 代码路径：`modbus/mbstask.js:423` → `modbus/dataExport/runningDataExport.js:355`。

2) 告警合并正确性
- 模拟同一告警的等级升降与恢复，检查 `ErrorData_*.csv` 是否生成对应条目，ID 自增、时间顺序正确，`动作值/BMU/Cell索引` 合理。
- 代码路径：`modbus/dataExport/runningDataExport.js:939/1011/1156/1174`。

3) 轮转与跨日
- 降低 `FILE_SIZE_LIMIT` 触发轮转；或跨日切换。
- 断言：更新 `currentFileMap` 且新文件开始写入；旧 buffer 清理；（原始帧）生成 `.gz` 压缩文件。
- 代码路径：`modbus/dataExport/runningDataExport.js:331–343`、`modbus/dataExport/rowBufferExport.js:177–205`。

4) 写入重试（EBUSY）
- 人为占用 CSV 文件句柄；观察是否发送 `save-excel` 并等待前端决策后继续写入。
- 代码路径：`modbus/dataExport/utils.js:185–208`。

---

## 代码参考与行号（dataExport 范围）

- 周期运行数据导出：`modbus/dataExport/runningDataExport.js:2/27/29/355/366/378/606/618/655/279/320/331/343/702/706/729/768/820/869/939/1011/1156/1174/1194`
- 原始帧导出：`modbus/dataExport/rowBufferExport.js:74–101/118–129/177–205/226–276`
- 工具与写入：`modbus/dataExport/utils.js:151–163/185–208/140–150`
- 配置一次性导出：`modbus/dataExport/configDataExport.js:21–29/38–47`
- 采集入口（供参考）：`modbus/handlers/read.js:548/923/1404`

---

## 结语

本文仅围绕 `dataExport` 功能（运行数据/告警/原始帧/一次性配置）展开，给出完整的实现链路与代码行号，并明确了与 `eventExport` 的边界。按“采集替换 + 结构对齐 + 定时写盘”的原则，即可将该功能无偏差迁移到 BAU(MQTT) 上位机。

---

## 6.9 实时数据导出（一步一步讲清楚）

### 6.9.1 实时运行数据导出（按 IP 和数据类型分别保存）

1) 启用导出与定时器

```js
// 子进程接收主进程开启导出指令（modbus/mbstask.js:423–431）
case 'startExportFromMain': {
  const client = modbusClients[message.client.ModbusServerIP]
  if (client) {
    client.isSetDataExport = true
  }
  startSaveTimer()
  break
}
```

2) 采集时把“最新数据”放入内存缓存

```js
// 采集单体数据后缓存（modbus/handlers/read.js:548–551）
if (mtclient.isSetDataExport && !mtclient.isStopped) {
  sendDataTypes.forEach(({ api, data }) => {
    cacheSample(api, data, ip, ts, mtclient.bmuTotal, mtclient.AFETotal, mtclient.afeConfig)
  })
}

// 采集簇端/汇总后缓存（modbus/handlers/read.js:923–931）
cacheSample('FC04ClusterSumm', dataCluster, ip, ts)
cacheSample('FC04dataPackSumm1', new_dataPackSummNew, ip, ts, mtclient.bmuTotal, mtclient.AFETotal, mtclient.afeConfig)

// 整理后的告警分类缓存（modbus/handlers/read.js:1404）
cacheSample('FC04Alarm', processedAPIData, ip, ts)
```

3) 定时器每次只写“比上次更新的样本”

```js
// 每1秒检查一次（modbus/dataExport/runningDataExport.js:355）
Object.keys(latestSamples).forEach((api) => {
  lastWritten[api] = lastWritten[api] || {}
  Object.keys(latestSamples[api]).forEach((ip) => {
    const sample = latestSamples[api][ip]
    const prev = lastWritten[api][ip]
    if (!prev || (sample && sample.timestamp > prev.timestamp)) {
      switch (api) {
        case 'FC04Vltg':
        case 'FC04Temp':
        case 'FC04SOC':
        case 'FC04SOH':
          saveCellData(api, sample.dataList, ip, Date.now())
          break
        case 'FC04ClusExtreme':
        case 'FC04ClusterSumm':
          saveClusterData(api, sample.dataList, ip, Date.now())
          break
        case 'FC04dataPackSumm1':
          saveBMUData(api, sample.dataList, ip, Date.now())
          break
        case 'FC04Alarm':
          saveAlarmData(api, sample.dataList, ip, Date.now())
          break
      }
      lastWritten[api][ip] = { timestamp: sample.timestamp, dataList: sample.dataList }
    }
  })
})
```

4) 为每个 BCU(IP) 建独立文件夹并生成文件名

```js
// 目录 和 文件名（modbus/dataExport/runningDataExport.js:606–627）
const bcuNumber = getBcuNumber(ip)
const ipDir = path.join(RUN_EXPORT_DIR, `BCU${bcuNumber}(${ip})_${ipSuffix}`)
const filename = `${dataType}_${formatFileSuffix(new Date())}.csv`
const filePath = path.join(ipDir, filename)
```

5) 生成表头并写入数据（单体/BMU/簇端/告警各自不同）

```js
// 单体（CellVoltage/CellTemp/SOC/SOH）（modbus/dataExport/runningDataExport.js:721–752）
const headerParts = ['ID','导出时间']
dataList.forEach(pack => {
  pack.cells.forEach(cell => {
    headerParts.push(`电池${cell.index}（BMU${pack.packID} ${cell.bmuIndex}#）`)
  })
})
const header = headerParts.join(',')
ensureCsvEntry(filePath, key, header)
entry.rowCounter++
const rowParts = [entry.rowCounter, now]
dataList.forEach(pack => pack.cells.forEach(cell => rowParts.push(cell.value)))
const row = rowParts.join(',')
bufferCsvData(filePath, key, header, row)

// 簇端极值/簇汇总（modbus/dataExport/runningDataExport.js:831–861）
const headerParts2 = ['ID','导出时间']
data.forEach(cat => {
  const prefix = api==='FC04ClusExtreme'?cat.classification.replace(/(极值|数据)$/u,''):''
  cat.element.forEach(item => {
    headerParts2.push(`${prefix}${item.label}`)
    if (item.hasOwnProperty('index')) {
      const cleanLabel = item.label.replace(/\(.*?\)$/,'')
      headerParts2.push(`${cleanLabel}编号`)
    }
  })
})
const header2 = headerParts2.join(',')
ensureCsvEntry(filePath, key, header2)
entry.rowCounter++
const values = []
data.forEach(cat => cat.element.forEach(item => { values.push(item.value); if (item.index!==undefined) values.push(item.index) }))
const row2 = [entry.rowCounter, now, ...values].join(',')
bufferCsvData(filePath, key, header2, row2)

// BMU/Pack 汇总（modbus/dataExport/runningDataExport.js:782–804）
const headerParts3 = ['ID','导出时间', ...category.element.map(item => item.label)]
const header3 = headerParts3.join(',')
ensureCsvEntry(filePath, key, header3)
entry.rowCounter++
const values3 = category.element.map(item => item.value)
const row3 = [entry.rowCounter, now, ...values3].join(',')
bufferCsvData(filePath, key, header3, row3)

// 告警（modbus/dataExport/runningDataExport.js:895–934 + 937–1192）
const headerAlarm = ['ID','导出时间','故障产生时间','告警','告警等级','动作值','BMU编号','Cell/Temp绝对索引','Cell/Temp相对索引'].join(',')
ensureCsvEntry(filePath, key, headerAlarm)
entry.rowCounter++
const occur = formatDateTime(new Date(item.timestamp))
const rowAlarm = [entry.rowCounter, now, occur, item.faultZh || item.fault, item.level || '', item.actionValue || '', item.bmuIndex || '', item.cellIndex || '', item.cellIndexRelative || ''].join(',')
bufferCsvData(filePath, key, headerAlarm, rowAlarm)
```

6) 表头更新（当 BMU/AFE 拓扑变化）

```js
// 检测并标记（modbus/dataExport/runningDataExport.js:571–581）
const changed = isConfigChanged(key, bmuTotal, AFETotal, afeConfig)
// 下一次写行前插入新的 header 并重置行号（modbus/dataExport/runningDataExport.js:738–742/793–797）
if (pendingNewHeader.has(key)) { entry.buffer.push(header); entry.rowCounter = 0; pendingNewHeader.delete(key) }
```

7) 批量刷盘、跨日/超限轮转、空间检查

```js
// 刷盘（modbus/dataExport/runningDataExport.js:304–353）
const stats = await fs.promises.stat(filePath).catch(() => null)
if (!stats) { await writeFileWithRetry(filePath, '\uFEFF' + header + '\r\n') }
await appendFileWithRetry(filePath, lines.map(line => line + '\r\n').join(''))

// 跨日/超限轮转（modbus/dataExport/runningDataExport.js:331–343）
const exceed = afterStats && afterStats.size > FILE_SIZE_LIMIT
const rotateDate = isNewDay(key)
if (exceed || rotateDate) { const newPath = getCsvFilePath(ip, type) }

// 磁盘空间检查（modbus/dataExport/runningDataExport.js:261–265）
const freeSpace = await getCachedFreeDiskSpace(RUN_EXPORT_DIR)
if (freeSpace < MIN_FREE_SPACE) { process.send({ API: 'disk-space-warning' }); return }
```

### 6.9.2 实时报文数据导出（按 IP 队列批量写入）

1) 报文拦截

```js
// 拦截TCP写/读（modbus/client/modbusClient.js:852–881）
this._origPortWrite = socket.write.bind(socket)
socket.write = (buffer, ...args) => { addToGlobalQueue({ type:'request', buffer:Buffer.from(buffer), ts:Date.now(), mbsHost:this.mbsHost }); return this._origPortWrite(buffer, ...args) }
socket.on('data', (data) => { addToGlobalQueue({ type:'response', buffer:Buffer.from(data), ts:Date.now(), mbsHost:this.mbsHost }) })
```

2) 队列管理与触发

```js
// 阈值触发/兜底定时（modbus/client/modbusClient.js:233/239/278）
if (ipQueue.queue.length >= WRITE_THRESHOLD && !ipQueue.writing) { processIpQueue(mbsHost) }
setImmediate(() => processIpQueue(ip))
```

3) 批量落盘

```js
// 批量格式化为CSV并写入（modbus/client/modbusClient.js:886–944）
const lines = batch.map(({ type, buffer, ts, id, mbsHost }) => { return cols.join(',') }).join('\r\n')
await appendToCSV(lines, ip)
```

4) 文件管理与压缩

```js
// 按IP建独立frames目录，首次写入带BOM（modbus/dataExport/rowBufferExport.js:118–129/97–101/225–276）
const ipDir = path.join(RUN_EXPORT_DIR, `BCU${bcuNumber}(${ip})_${ipSuffix}_frames`)
const filename = `Raw_Frames_${fileSuffix}.csv`
await appendFileWithRetry(filePath, BOM_HEADER)
await appendFileWithRetry(filePath, dataToWrite)

// 超限压缩并更新后缀（modbus/dataExport/rowBufferExport.js:177–205）
if (stats.size >= FILE_SIZE_LIMIT) { compressFileGzip(filePath); ipFileSuffixMap.set(ip, formatFileSuffix(new Date())) }
```

5) 并发与安全

```js
// 写入采用互斥锁与原子追加，避免并发冲突（modbus/dataExport/rowBufferExport.js:12/226–276）
const csvMutex = new Mutex()
await appendFileWithRetry(filePath, data)
```

---

## MQTT 上位机如何新增 dataExport（一步一步）

1) 保留“缓存 + 定时写盘”的总流程（直接复用 `runningDataExport.js`）
2) 新增 MQTT 消息适配层，把消息转成“语义型标签” + `dataList` 格式：

```js
import { cacheSample, startSaveTimer } from '../modbus/dataExport/runningDataExport'
startSaveTimer()
const topicToLabel = { 'bau/cell/vltg':'cellVoltage', 'bau/cell/temp':'cellTemp', 'bau/cell/soc':'cellSOC', 'bau/cell/soh':'cellSOH', 'bau/cluster/summ':'clusterSumm', 'bau/cluster/extreme':'clusterExtreme', 'bau/pack/summ1':'packSumm1', 'bau/alarm':'alarm' }
function onMqttMessage(topic, payload, clientId) {
  const label = topicToLabel[topic]
  if (!label) return
  const ts = Date.now()
  const dataList = buildDataListForLabel(label, payload)
  cacheSampleSemantic(label, dataList, clientId, ts, payload.bmuTotal, payload.AFETotal, payload.afeConfig)
}
```

3) 注意事项：
- 字段名必须与保存函数一致（`element/label/value/index/bmuIndex` 等）。
- 需要提供 `bmuTotal/AFETotal/afeConfig`，否则表头不正确。
- 目录的 IP 可以替换为 `clientId`，同时调整序号逻辑。
- 告警分类与唯一键构造保持一致，才能识别升/降级与恢复。

4) 可选：新增“原始消息日志”模块（仿 `rowBufferExport.js`），把 `topic/clientId/payload` 按 CSV 记录，并应用同样的轮转与压缩策略。

---

## 不使用 FC04* 标签的实现方案（推荐）

- 背景：BCU 的 `FC04*` 命名源于 Modbus 功能码 04；MQTT 架构没有功能码的概念。为了让 BAU 代码更语义化，建议全程使用“语义型标签”（如 `cellVoltage/clusterSumm/alarm`），内部不出现任何 FC04 字样。
- 做法：业务层以语义型标签写入缓存；导出定时器扫描语义型缓存并调用对应保存函数，无需 FC04。

```js
// bauDataExport.js（语义型路由骨架）
import { startSaveTimer as _noopStart } from '../modbus/dataExport/runningDataExport'
import { formatDateTime } from '../modbus/dataExport/utils'
import { ensureDir, appendFileWithRetry, daySuffix } from '../modbus/dataExport/utils'
import fs from 'fs'
import path from 'path'

const latestSamplesSem = { cellVoltage:{}, cellTemp:{}, cellSOC:{}, cellSOH:{}, clusterSumm:{}, clusterExtreme:{}, packSumm1:{}, alarm:{} }
const lastWrittenSem = {}

export function cacheSampleSemantic(label, dataList, deviceId, ts, bmuTotal, AFETotal, afeConfig) {
  if (!latestSamplesSem[label]) latestSamplesSem[label] = {}
  latestSamplesSem[label][deviceId] = { timestamp: ts, dataList, bmuTotal, AFETotal, afeConfig }
}

export function startSaveTimerSemantic() {
  setInterval(() => {
    const now = Date.now()
    Object.keys(latestSamplesSem).forEach((label) => {
      lastWrittenSem[label] = lastWrittenSem[label] || {}
      Object.keys(latestSamplesSem[label]).forEach((id) => {
        const sample = latestSamplesSem[label][id]
        const prev = lastWrittenSem[label][id]
        if (!prev || (sample && sample.timestamp > prev.timestamp)) {
          saveByLabel(label, sample.dataList, id, now, sample)
          lastWrittenSem[label][id] = { timestamp: sample.timestamp, dataList: sample.dataList }
        }
      })
    })
  }, 1000)
}

function saveByLabel(label, dataList, id, ts, meta) {
  switch (label) {
    case 'cellVoltage':
    case 'cellTemp':
    case 'cellSOC':
    case 'cellSOH':
      return saveCellSem(label, dataList, id, ts)
    case 'clusterSumm':
    case 'clusterExtreme':
      return saveClusterSem(label, dataList, id, ts)
    case 'packSumm1':
      return savePackSummSem(dataList, id, ts)
    case 'alarm':
      return saveAlarmSem(dataList, id, ts)
  }
}
```

> 说明：以上为语义型路由骨架，内部不出现任何 FC04 字样；保存函数可参照 `runningDataExport.js` 的表头与行拼接方式实现，目录、轮转与刷盘策略保持一致。

## 验证清单（更容易看懂）

- 周期数据是否写入：启动导出后，查看 `dataExports/Data_.../BCU...` 目录下是否出现 `CellVoltage/CellTemp/SOC/SOH/ClusterData/簇端极值数据/...` 文件，并且每隔一段时间“ID 自增、导出时间变化”。
- 告警是否正确合并：制造同一故障的等级变化，检查 `ErrorData_*.csv` 中是否出现“升阶/恢复”记录，时间顺序正确。
- 报文是否落盘：查看 `..._frames/Raw_Frames_...csv` 是否增加，超 500MB 是否出现 `.gz` 压缩文件。
- 跨日与空间：跨天后是否新建文件；磁盘空间不足是否弹出告警并停止写入。