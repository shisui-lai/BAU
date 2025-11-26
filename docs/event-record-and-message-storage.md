# 事件记录与报文存储功能（全流程）

- 目标：完整说明事件记录的读取、解析、缓存、CSV导出，以及原始报文与语义数据的落盘机制，帮助快速掌握这部分代码的工作原理与调用关系。
- 范围：渲染进程 UI → 主进程桥接 → MQTT 子进程请求/解析 → 并发读取与缓存 → CSV 生成与字段格式化 → CRC 校验 → IPC 进度/结果上报；同时覆盖原始报文与语义数据导出路径。

---

## 核心 Topic 与模块
- `bms/host/s2d/b{block}/event_record_flag_r`：读取事件记录标志位（存储百分比、写/删起始位置等），用于估算导出范围。
  - 解析：`src/protocol/utils.js:2666` → `parseEventRecordFlagRAW`
  - 字段定义：`src/main/table.js:3950` 起（`EVENT_RECORD_FLAG_R`）。
- `bms/host/s2d/b{block}/event_record_r`：读取事件记录数据（支持批量），请求载荷为小端序 `offset(2B) + count(2B)`。
  - 解析：`src/protocol/utils.js:2727` → `parseEventRecordRAW`（支持多条记录）。
  - 字段定义：`src/main/table.js:3976` 起（`EVENT_RECORD_R`，含时间、事件类型/参数、状态、故障、版本、CRC等）。
- `bms/host/s2d/b{block}/clear_event_record_num`：删除事件记录数量（`0xFFFF` 表示全部删除）。
  - 下发：渲染进程通过 IPC → 主进程 → 子进程发布 MQTT。

---

## 全流程数据流（从 UI 到 CSV）
1. 渲染端触发导出
   - 用户在“事件记录”页面点击“导出”，校验输入并计算导出参数：
     - `offsetRead = storedCount - 要读数量`（按“从末尾倒序读取”的常见需求，实际由 UI 控制）
     - 全量导出：`offsetRead=0, totalRead=storedCount`
   - 代码：`src/renderer/src/views/Bau/eventRecord/event.vue:624` → `confirmExport`
   - 发送 IPC：`start-reading-data-event`，包含 `blockId, offsetRead, totalRead`。
     - 代码：`src/renderer/src/views/Bau/eventRecord/event.vue:680-684`

2. 主进程桥接到子进程
   - 监听 `start-reading-data-event`，设置默认导出目录并转发到 MQTT 子进程（命令 `START_READ_EVENT`）。
   - 代码：`src/main/index.js:702-726`（默认导出目录 `DEFAULT_EXPORT_DIR` 定义于 `src/main/index.js:37`）

3. 子进程启动并发读取
   - 入口：收到 `START_READ_EVENT` 后调用 `startReadingEvent(blockId, offsetRead, totalRead, exportDir, client)`。
   - 代码：
     - 命令处理：`src/main/mqtt.js:1146-1166`
     - 并发读取实现：`src/main/eventRecordExport.js:258-441`
   - 并发策略：
     - 批量请求上限：`MAX_RECORDS_PER_REQUEST = 10`（每次最多 10 条记录）
     - 发送节拍：`SEND_INTERVAL_MS = 20ms`（约 50 请求/秒）
     - 进度心跳：每 100ms 通过 IPC 上报 `current/total`（`readEventProgress`）。
     - 代码：`src/main/eventRecordExport.js:296, 317, 321-370`
   - 请求载荷：小端序 `offset(2B) + count(2B)`。
     - 代码：`src/main/eventRecordExport.js:329-333`

4. 设备响应与解析
   - 子进程订阅 `event_record_r` 并解析：
     - Topic 路由：`src/main/mqtt.js:579`（`event_record_r: processEventRecordData`）
     - 解析包装器：`src/main/mqtt.js:312`（`withResponseCheck(hex => parseEventRecordRAW(hex))`）
     - 收到消息时构造统一响应对象（含多条记录）：`src/main/mqtt.js:1040-1056`
       - 结构示例：`{ RecordOffset, RecordCount, records[], baseConfig, data, rawRegisters, rawBuffer, result }`

5. 响应关联与缓存
   - 处理函数：`processEventRecordResponse(responseData, blockId, client)`。
     - 代码：`src/main/eventRecordExport.js:133-248`
   - 关键点：
     - 按设备返回的 `RecordOffset` 精确匹配请求等待器（Map 的 key 即为 `RecordOffset`）。
     - 缓存每条记录的 `baseConfig/data/rawRegisters/rawBuffer` 至 `eventRecordDataCache`（key=`RecordOffset`）。
     - 统计响应顺序（有序/乱序）以便诊断：`src/main/eventRecordExport.js:182-195`。

6. 读取完成/取消/错误的统一处理
   - 监控全部请求发送与所有响应到齐：`eventReadingSentCount === ceil(totalRead / MAX_RECORDS_PER_REQUEST)` 且 `eventReadingCompletedCount === totalRead`。
   - 完成/取消/错误统一收敛为 `stopReadingEvent`：
     - 代码：`src/main/eventRecordExport.js:399-441, 449-522`
   - 上报：
     - 进度：`readEventProgress` → `src/main/ipc/childBridge.js:37-44` → 渲染端 `update-readEventProgress`。
     - 完成：`readEventCompleted` → 渲染端 `export-completed`。
     - 取消：`readEventCanceled` → 渲染端 `export-canceled`。
     - 错误：`readEventError` → 渲染端 `readEventErrorFromMain`。

7. CSV 生成（含格式化与合并）
   - 入口：`generateEventRecordCSV(blockId, saveDir, recordCount)`。
   - 代码：`src/main/eventRecordExport.js:530-836`
   - 文件与目录：
     - 导出根：主进程默认 `EventExports`（`src/main/index.js:37`）；事件 CSV 实际落地在 `RAW_EXPORT_DIR`（`src/main/mqttExport/paths.js:3-6`）。
     - 命名：`EventRecords_block{blockId}_YYYY-MM-DD_HH-MM-SS.csv`。
   - 表头生成：基于 `EVENT_RECORD_R` 字段定义：
     - 跳过隐藏字段（`hide:true`）与 `type:'bit'` 的位字段（位字段不单独占列）。
     - 时间字段合并为单列“时间戳”（`Year/Month/Day/Week/Hour/Minute/Second` → `YYYY-M-D-HH:mm:ss`）。
     - 合并字段：
       - “簇汇总模拟量三级告警”按严重程度分三组列：严重/一般/轻微。
         - 代码：`src/main/eventRecordExport.js:581-586, 624-656`
       - “簇汇总硬件故障”、“堆硬件故障”按类合并为各自一列。
         - 代码：`src/main/eventRecordExport.js:575-578, 662-681`
     - 追加“CRC校验”列。
       - 代码：`src/main/eventRecordExport.js:690-692`
   - 行内容：
     - 排序：按 `recordIndex(=RecordOffset)` 升序写入。
     - 字段值格式化：`formatEventRecordField`（事件类型中文、参数语义、状态映射、故障位解析、十六进制显示、簇标志 10 位二进制等）。
       - 代码：`src/protocol/eventRecordFormatter.js:1722-1795`
     - 合并列值：跳过“无故障/空值/"/"”，按需要合并实际有意义的告警文本。
       - 代码：`src/main/eventRecordExport.js:765-806`
     - CSV 转义与 BOM：所有单元格双引号包裹并转义（`" → ""`），文件头写入 BOM 以兼容 Excel。
       - 代码：`src/main/eventRecordExport.js:560-563, 693-699, 821-824`

8. CRC16 校验（每行尾）
   - 算法：Modbus CRC16，原始寄存器前 127 个参与计算，第 128 个寄存器为期望值。
   - 代码：
     - CRC 计算：`src/main/eventRecordExport.js:32-45` → `computeCRC16`
     - 字节构造：`src/main/eventRecordExport.js:17-25` → `regsToBytes`
     - 校验：`src/main/eventRecordExport.js:52-77` → `validateEventRecordCRC`（返回“有效/无效”）。
   - 写入：每行追加一列 CRC 结果。
     - 代码：`src/main/eventRecordExport.js:826-829`

9. 渲染端进度/结果反馈
   - 进度条与 Toast：
     - 进度：`update-readEventProgress` → `exportStore.update(current, total)`。
       - 代码：`src/renderer/src/views/Bau/eventRecord/event.vue:791-793`
     - 成功/部分成功：`export-completed`（包含 `cachedCount/totalRequested/partial`）。
       - 代码：`src/renderer/src/views/Bau/eventRecord/event.vue:801-820`
     - 取消：`export-canceled`；错误：`readEventErrorFromMain`。
       - 代码：`src/renderer/src/views/Bau/eventRecord/event.vue:822-843`

---

## 事件记录标志位读取与导出参数估算
- 读取：`event_record_flag_r` → `parseEventRecordFlagRAW`。
  - 代码：`src/protocol/utils.js:2666-2709`
- 字段要点：
  - `StoragePercent`（0.1%）：存储使用百分比。
  - `WriteStartPos/DeleteStartPos/PendingDeleteCount`（`u32`）：写/删起始位置与待删数量。
  - `CRC16`（隐藏）：标志位区的校验值。
  - 定义：`src/main/table.js:3950-3969`。
- UI 估算示例：
  - 当用户输入导出数量 `n` 时，计算 `offsetRead = storedCount - n`（UI 中 `storedCount` 为当前记录总数的概念值）。
  - 实际导出参数以 UI 计算为准，子进程按此参数并发读取。

---

## 删除事件记录（命令下发与应答）
- 下发：
  - 主题：`bms/host/s2d/b{block}/clear_event_record_num`
  - 载荷：小端序 `deleteCount`；`0xFFFF` 表示全部删除。
  - 代码：`src/renderer/src/views/Bau/eventRecord/event.vue:747-766, 770`
- 应答显示：
  - 渲染端监听 `CLEAR_EVENT_RECORD_NUM`，区分成功/失败并弹出 Toast。
  - 代码：`src/renderer/src/views/Bau/eventRecord/event.vue:846-894`

---

## 字段语义格式化（人类可读）
- 事件类型映射：`EVENT_TYPE_MAP`（>100 项）。
  - 代码：`src/protocol/eventRecordFormatter.js:1-115`
- 事件参数格式化：`formatEventParam(eventType, paramIndex, paramValue, baseConfig)`。
  - 代码：`src/protocol/eventRecordFormatter.js:1593-1633`
- 故障位映射与位解析：`FAULT_BIT_MAPS` + `parseFaultBits`。
  - 代码：`src/protocol/eventRecordFormatter.js:137-230, 1722-1795`
- 状态/模式等枚举解析：`parseCommStatus/parseRemoteLocalScene/parseBCPControl/...`。
  - 代码示例：`src/protocol/eventRecordFormatter.js:450-465, 548-567, 604-619`

---

## 原始报文与语义数据存储
- 原始报文存储（可选开关 `rawExportEnabled`）：
  - 入站：在子进程消息处理器中记录收到的 MQTT 报文。
    - 代码：`src/main/mqtt.js:973` → `logAnyMessage({ topic, payloadHex, clientId, ts, direction })`
  - 出站：发布 MQTT 命令时记录报文。
    - 代码：`src/main/mqtt.js:1235`
  - 路径：`RAW_EXPORT_DIR` → `dataExports/Data_<会话后缀>/Raw_Messages_<会话后缀>/...`
    - 代码：`src/main/mqttExport/paths.js:3-6`
- 语义数据存储（实时采样的结构化 CSV）：
  - 定时器：`startSaveTimerSemantic` 启动，按照最新采样与配置快照写入。
    - 代码：`src/main/mqttExport/bauDataExport.js:28-61`
  - 单体电压/温度/SOC/SOH 等写入与旋转：
    - 代码：`src/main/mqttExport/bauDataExport.js:115-142`（示例：`saveCellSemantic`）
  - 文件写入带重试与占用对话框：
    - 代码：`src/main/mqttExport/utils.js:41-58`（`appendFileWithRetry` + IPC `save-excel`）
    - 主进程弹窗桥接：`src/main/ipc/childBridge.js:7-23`

---

## 关键函数清单（按职责）
- 读取控制与并发：
  - `startReadingEvent(blockId, offsetRead, totalRead, exportDir, client)`：并发调度与请求发送。
    - 代码：`src/main/eventRecordExport.js:258-441`
  - `processEventRecordResponse(responseData, blockId, client)`：关联响应 → 解析缓存。
    - 代码：`src/main/eventRecordExport.js:133-248`
  - `stopReadingEvent(blockId, wasCanceled, hasError)`：统一收敛，触发 CSV 或错误/取消通知。
    - 代码：`src/main/eventRecordExport.js:449-522`
- 解析：
  - `parseEventRecordFlagRAW(payload)`：事件记录标志位解析。
    - 代码：`src/protocol/utils.js:2666-2709`
  - `parseEventRecordRAW(payload)`：事件记录数据（批量）解析。
    - 代码：`src/protocol/utils.js:2727-2890`
- 格式化与校验：
  - `formatEventRecordField(fieldKey, value, baseConfig, fieldDef)`：字段语义化。
    - 代码：`src/protocol/eventRecordFormatter.js:1722-1795`
  - `validateEventRecordCRC(recordData)`：CRC16 有效性检查。
    - 代码：`src/main/eventRecordExport.js:52-77`
- 导出：
  - `generateEventRecordCSV(blockId, saveDir, recordCount)`：生成 CSV 文件。
    - 代码：`src/main/eventRecordExport.js:530-836`

---

## 常见问题与排查建议
- 响应关联失败（未找到等待器）：
  - 排查 `RecordOffset` 是否正确（设备返回值用于匹配）。
  - 观察顺序统计（`inOrder/outOfOrder`），设备可能乱序返回。
  - 代码参考：`src/main/eventRecordExport.js:182-195, 210-218`
- CSV 空行或缺列：
  - 检查记录 `baseConfig` 是否为空（解析失败会跳过）。
  - 代码参考：`src/main/eventRecordExport.js:710-716`
- CRC 校验“无效”：
  - 确认原始寄存器是否为 128 个完整值；校验只对前 127 个寄存器。
  - 代码参考：`src/main/eventRecordExport.js:52-77`
- 文件占用：
  - 事件 CSV 采用写流新建文件，通常不触发占用重试；语义数据 CSV 使用追加写入并带占用弹窗重试。
  - 代码参考：`src/main/mqttExport/utils.js:41-58, src/main/ipc/childBridge.js:7-23`

---

## 备忘与建议
- 批量请求上限与节拍可按实际设备性能调优（`MAX_RECORDS_PER_REQUEST`, `SEND_INTERVAL_MS`）。
- 如需将事件 CSV 与语义 CSV 统一到同一导出根，可在主进程将 `DEFAULT_EXPORT_DIR` 与 `RUN_EXPORT_DIR` 协调；当前实现分别管理。
- 若需时序图与字段表逐项说明，可在本文件追加附录章节并引用具体字段键与含义（参考 `src/main/table.js:3976`）。

---

## 快速定位索引（文件:行号）
- 子进程消息处理构造 `responseData`：`src/main/mqtt.js:1044-1056`
- 事件记录字段表定义起始：`src/main/table.js:3976`
- 事件标志位字段表：`src/main/table.js:3950-3969`
- 格式化核心：`src/protocol/eventRecordFormatter.js:1593-1795`
- 并发读取与 CSV 生成：`src/main/eventRecordExport.js:258-836`
- 原始报文落盘调用点：`src/main/mqtt.js:973, 1235`

> 以上行号基于当前代码库状态，若文件发生编辑，行号可能变化；可通过检索函数名快速定位。

---

## 讲解与分析（端到端数据流）

本节将“用代码解释代码”，把完整调用链与每一步的意图、数据结构、异常分支、性能考量讲清楚。所有说明都对应到具体实现文件与行号，便于你在 IDE 中打开对应位置验证。

### 从用户点击到 CSV 落地

- UI 位置：`src/renderer/src/views/Bau/eventRecord/event.vue`
  - 用户设置“导出数量/全部导出”，点击“导出”，触发 `confirmExport`（`event.vue:624-687`）。
  - 计算参数：
    - `storedCount` 从“事件记录标志位”获取已存条数（`event.vue:235-238`）。
    - `offsetRead` 当“部分导出”时，等于 `storedCount - valueRead`（`event.vue:241-247`）。
    - `totalRead` 当“全部导出”时为 `storedCount`，否则为用户输入值。
  - IPC 发送：`window.electron.ipcRenderer.send('start-reading-data-event', { offsetRead, totalRead, blockId })`（`event.vue:677-684`）。

- 主进程：`src/main/index.js`
  - 接收 `'start-reading-data-event'`（`index.js:702-726`）。
  - 使用默认目录 `DEFAULT_EXPORT_DIR` 并通知渲染端 `'export-started'`（`index.js:713-718`）。
  - 将指令转发至子进程（MQTT 任务）为 `cmd: 'START_READ_EVENT'`（`index.js:719-725`）。

- 子进程（MQTT）：`src/main/mqtt.js`
  - 在 `process.on('message')` 中接收 `START_READ_EVENT`（`mqtt.js:1145-1166`）。
  - 校验连接状态后调用事件导出模块的入口 `startReadingEvent`（`mqtt.js:1161-1164`）。
  - 之后消息循环里，当收到 `event_record_r` 响应时，构造 `responseData` 并调用 `processEventRecordResponse`（`mqtt.js:1040-1056`）。

- 事件导出模块：`src/main/eventRecordExport.js`
  - 入口：`startReadingEvent(blockId, offsetRead, totalRead, exportDir, client)`（`eventRecordExport.js:258`）。
  - 关键动作：
    - 初始化状态与缓存 Map：`eventRecordDataCache`（记录缓冲）、`eventRecordResponseWaiters`（等待器）、`mappingVerification`（映射验证）、`responseOrderStats`（响应顺序统计）。
    - 并行调度：以 `MAX_RECORDS_PER_REQUEST=10` 为批量，每 20ms 发送下一批请求，直到覆盖 `totalRead`（`eventRecordExport.js:316-368`）。
    - 为每条记录建立等待器，键为“设备记录偏移量”，即 `offset + i`（`eventRecordExport.js:336-347`）。
  - 响应处理：`processEventRecordResponse(responseData, blockId, client)`（`eventRecordExport.js:133`）：
    - 成功响应：`RecordCount` 条记录；每条记录优先使用 `record.RecordOffset` 作为实际偏移量，找到对应等待器并缓存（`eventRecordExport.js:199-241`）。
    - 错误响应：可能只有 1 字节错误码；若无法获取偏移量，按“队列首等待器”兜底拒绝，避免造成死等（`eventRecordExport.js:154-192`）。
    - 顺序统计：记录 `inOrder/outOfOrder`，协助分析设备是否乱序响应，进而评估并发参数（`eventRecordExport.js:175-188`）。
  - 完成收敛：当“请求批次数 == 已发送批次数”且“已完成记录数 == totalRead”，触发收尾（`eventRecordExport.js:387-406`），统一走 `stopReadingEvent`（`eventRecordExport.js:408-462`）。
  - 生成 CSV：`generateEventRecordCSV(blockId, saveDir, recordCount)`（`eventRecordExport.js:530`）：
    - 表头来源：`EVENT_RECORD_R`（`src/main/table.js:3976`）。
    - “时间戳”合并：将 `Year/Month/Day/Hour/Minute/Second` 合并为一列（`eventRecordExport.js:569-621`）。
    - “簇汇总模拟量三级告警”按严重度分组合并列（严重/一般/轻微）（`eventRecordExport.js:580-587, 625-655`）。
    - “簇/堆硬件故障”按类别合并列（`eventRecordExport.js:662-681`）。
    - 常规字段按定义顺序写入，所有文本做 CSV 引号转义（`eventRecordExport.js:809-823, 693-699`）。
    - 每行尾追加 `CRC校验`（`有效/无效`），算法用 Modbus CRC16：对前 127 寄存器字节计算，与第 128 寄存器比对（`eventRecordExport.js:826-829, 12-24, 26-47, 49-73, 92-121`）。

- 渲染端反馈：`exportStore` 更新进度与完成状态（`src/renderer/src/stores/eventStore.js:23-52`），弹 Toast 显示成功/部分成功/错误（`event.vue:801-843`）。

### 关键数据结构与理由

- 等待器 Map：`eventRecordResponseWaiters: Map<recordOffset, {resolve, reject, requestedRecordIndex}>`
  - 理由：设备“新协议”支持一次返回多条记录，每条记录自带偏移量；用设备偏移量做键，可消除乱序风险。
  - 异常兜底：错误响应只有 1 字节时无法获知偏移量，使用队首等待器兜底拒绝，避免内存泄漏与僵尸等待。

- 缓存 Map：`eventRecordDataCache: Map<recordOffset, parsedRecord>`
  - 写入时覆盖：重复响应以覆盖旧值，保证最终以最新响应为准；排序写出即可保持表行顺序。

- 统计：`mappingVerification[]` 与 `responseOrderStats`
  - 作用：开发期诊断请求/响应映射正确性与设备响应顺序，支持后续调参（批量大小与间隔）。

### 协议与解析（事件记录）

- 请求主题：`bms/host/s2d/b{block}/event_record_r`
- 请求载荷：`offset(LE u16) + count(LE u16)`；示例：读取偏移 990 起 20 条，载荷为 `0xDE03 0x1400`（十六进制 LE 写入）
- 响应主题：同名订阅；载荷（成功）：`len(2) + [RecordOffset(2) + RecordData(256)] * M`
- 解析入口：`parseEventRecordRAW`（`src/protocol/utils.js:2711-2746`）：
  - 错误响应（仅 1 字节）：返回 `{ error:true, baseConfig:{}, data:{ code, message } }`。
  - 成功响应：解析出 `baseConfig`（包含时间、事件类型/参数、状态、故障、版本、CRC）与 `records`（多条记录数组，每条含 `RecordOffset/rawRegisters/rawBuffer`）。
- 文本格式化：`formatEventRecordField`（`src/protocol/eventRecordFormatter.js:1731`）
  - 事件类型映射、参数按事件类型解释、10 位簇标志二进制化、故障位解析为中文串、十六进制字段输出 `0xFFFF` 形式、单位拼接与小数位策略。

### CSV 表头合并策略详解（为什么要“合并列”）

- 背景：事件记录中“簇汇总模拟量三级告警”与“硬件故障”类字段是多个寄存器的位域集合，如果逐寄存器展开会在 CSV 里占用大量列，且用户不关心“空/无故障”的列。
- 策略：
  - 按严重度分组，将 `Severe* / Moderate* / Mild*` 各自生成一列；值为该组中所有“非无故障”的故障文本合并（逗号分隔）。
  - 对“簇/堆硬件故障”，按类别生成列，值为该类别所有“非无故障”的文本合并。
- 好处：
  - 可读性更强：三列分别显示“严重/一般/轻微”，一眼看重点。
  - 列稳定：协议新增位不会破坏表结构，仍在同类列中合并显示。

### CRC 校验详解（如何判断“有效/无效”）

- 原始寄存器：每条事件记录包含 128 个 16 位寄存器；第 127 个用于校验计算，最后一个存储 CRC16。
- 算法：Modbus CRC16 多项式 `0xA001`，初始值 `0xFFFF`，逐位右移异或（实现见 `src/main/eventRecordExport.js:26-47`）。
- 步骤：
  1) 将前 127 寄存器按小端序转为字节序列（`regsToBytes`）。
  2) 计算 CRC16 与第 128 寄存器值比对。
  3) 相等为“有效”，否则为“无效”。
- 用途：CSV 最后一列提供可视化校验结果，便于排查设备侧记录损坏问题。

### 并发与性能（为什么这样调度）

- 发送频率：`SEND_INTERVAL_MS=20` → 理论 50 批次/秒；每批 `MAX_RECORDS_PER_REQUEST=10` → 峰值 500 记录/秒。
- 设计理由：
  - 避免设备端队列积压与超时，采用“短间隔 + 小批量”持续投递。
  - 解耦请求与响应：建立等待器 Map 后可以乱序接收，响应到达即落缓存，不阻塞后续投递。
- 完成判定：用“请求批次数 = ceil(totalRead / MAX_RECORDS_PER_REQUEST)”与“完成记录数 = totalRead”两条件合取。
- 进度更新：每 100ms 将 `eventRecordDataCache.size` 作为“当前已读条数”发到前端（`eventRecordExport.js:310-326`）。

### 异常分支与 UX 反馈

- MQTT 未连接：`mqtt.js` 侧在接收 `START_READ_EVENT` 时直接返回 `readEventError`（`mqtt.js:1149-1157`）。
- 设备错误响应（1 字节）：`processEventRecordResponse` 兜底拒绝第一个等待器，避免卡死；前端将收到 `readEventErrorFromMain` 并提示（`event.vue:834-843`）。
- 导出取消：前端发送 `cancel-export-event`（`event.vue:692-699`）→ 主进程转发到子进程（`index.js:728-737`）→ 子进程设置 `eventReadingCanceled=true`，统一在 `stopReadingEvent` 中发 `'export-canceled'`（`eventRecordExport.js:842-847, 432-443, 459-462`）。

---

## 报文存储与语义存储（代码与逻辑一体解释）

### 原始报文存储（入/出站）

- 调用点：
  - 入站（设备→上位机）：`src/main/mqtt.js:972-975` 在解析前记录收到的 MQTT payload 十六进制。
  - 出站（上位机→设备）：`src/main/mqtt.js:1230-1236` 在发布成功回调后记录发送的 payload。
- 行为：`src/main/mqttExport/mqttRawLogger.js`
  - 文件路径：`RAW_EXPORT_DIR/Raw_Messages_{SESSION_SUFFIX}.csv`（`paths.js:5-6`）。
  - 表头与 BOM：首次写入时追加 ` FEFF + ID,时间,方向,主题,设备,PayloadHex`（`mqttRawLogger.js:23-40, 45-57`）。
  - 写入串行化：`writeChain` 保证所有写任务按顺序执行，避免并发写入冲突（`mqttRawLogger.js:14-16, 71-84`）。
  - 轮转与压缩：超过 `500MB` 自动 `.gz` 压缩并删除原文件（`mqttRawLogger.js:18-26`; `utils.js:84-106`）。
  - 设备标签：将 `clientId=blockId-clusterId` 转中文“堆X/堆X簇Y”（`mqttRawLogger.js:58-65`）。

### 语义采集与缓存（Cell/Cluster/Pack/Block）

- 采集入口：`src/main/mqtt.js:1016-1036` 根据 `suffix` 分发到 `ingest.js` 对应处理函数。
- 采集逻辑：`src/main/mqttExport/ingest.js`
  - 单体电压/温度/SOC/SOH：按 BMU 聚合，计算总元素数与每 BMU 预期数一致才缓存（`ingest.js:2-29, 30-57, 58-85, 86-113`）。
  - 概要数据（簇/包/堆）：直接缓存（`ingest.js:114-135`）。
- 缓存接口：`cacheSampleSemantic(label, dataList, deviceId, ts, meta)`（`bauDataExport.js:28-31`）。

### 语义落盘与表头机制

- 周期写盘：定时器每 2s 检查 `latest` 与 `lastWritten`，选择“最新样本优先”写入（`bauDataExport.js:33-73, 74-92`）。
- 目录与文件名：`RUN_EXPORT_DIR/Data_{suffix}/Block{b}_Cluster{c}_{deviceSuffix}/{basename}_{timestamp}.csv`（`paths.js:3-6, 7-15`; `bauDataExport.js:12-23`）。
- 表头更新：当 `meta`（配置快照）变化时，追加新表头并重置 ID 计数，保证列与配置一致（机制在保存函数内；此处为总体说明，具体字段见 `src/main/table.js`）。
- 写入重试：`appendFileWithRetry` 捕获 `EBUSY` 发送 `save-excel`，等待用户决策后重试（`utils.js:24-43, 58-83`）。

---

## 示例走查（把一次“导出 20 条从偏移 990 起”的操作拆解）

- 条件：`storedCount=1010`，用户输入 `valueRead=20`，不勾选“全部导出”。
- 计算：`offsetRead=1010-20=990`，`totalRead=20`（`event.vue:241-247, 664-666`）。
- 调度：
  - 第 1 批：偏移 `990`，数量 `10` → 等待器键：`990..999`。
  - 第 2 批：偏移 `1000`，数量 `10` → 等待器键：`1000..1009`。
  - 每批之间 20ms（`eventRecordExport.js:316-368`）。
- 响应：设备按新协议返回 `RecordCount=10`，每条含 `RecordOffset`。即使乱序（例如先回 `995`、`990`），也能对应等待器，数据被缓存在 `eventRecordDataCache` 的键 995、990 下（`eventRecordExport.js:199-241`）。
- 完成：收到 20 条记录后触发 `stopReadingEvent` → 生成 CSV（`eventRecordExport.js:387-462, 530-836`）。
- 前端：显示进度 0→20，最终 Toast 成功或部分成功（`eventStore.js:23-52`; `event.vue:801-819`）。

---

## 常见问题与排查建议

- 为什么 CSV 里某些列是“无故障”？
  - 因为合并列将组内所有“无故障/空”压缩为一个“无故障”；只有当组内存在实际故障位为 1 时才显示文本。

- 为什么“CRC校验=无效”？
  - 多见于设备侧写入过程中断或寄存器损坏；可在渲染端对比 `rawRegisters[127]` 与重新计算值，定位是否解析阶段出错（见 `eventRecordExport.js` CRC 计算实现）。

- 收到“参数错误”的导出失败？
  - 设备返回 1 字节错误码（`parseEventRecordRAW` 会封装为 `{error:true}`）；导出模块会拒绝一个等待器并继续其他记录。检查请求参数 `offsetRead/totalRead` 是否超范围或设备忙。必要时减小批量或增大间隔。

- 原始报文日志文件过大？
  - 达到 500MB 会自动 `.gz` 压缩；若磁盘紧张，建议缩短会话或关闭“原始报文导出”开关（`SET_EXPORT_ENABLE` 流程见 `src/main/index.js:673-678` 与 `src/main/mqtt.js:1132-1141`）。

---

以上讲解将每个“代码片段”与其“职责与数据”明确绑定，便于新同学在 IDE 中逐步跟踪。若你需要，我可以继续补充“系统时间记录（sys_run_time_r）”的解析链路与 UI 显示逻辑的分段讲解，或者把 CSV 表头合并策略用更多具体样例（含故障位触发）展开。

---

## 主进程 IPC 片段（index.js:702–726 完整代码 + 语法讲解）

下面给出主进程中对渲染端触发“事件记录导出”的 IPC 处理器的完整真实代码，并在其后进行逐行语法与逻辑讲解，确保无需跳转到源码即可理解。代码来源：`src/main/index.js:702-726`。

（该处纯代码已删除，改为上文分段讲解。）
    // 启动事件记录导出
    ipcMain.on('start-reading-data-event', (event, { offsetRead, totalRead, blockId }) => {
      const mqttTask = processManager.getMQTTTask()
      if (!mqttTask || mqttTask.killed) {
        mainWindow.webContents.send('readEventErrorFromMain', {
          blockId,
          error: 'MQTT进程未运行'
        })
        return
      }

      // 使用默认目录
      const saveDir = DEFAULT_EXPORT_DIR
      console.log(`[Main] 使用默认导出目录: ${saveDir}`)
      
      // 通知渲染进程：导出开始，显示目录
      event.sender.send('export-started', saveDir)

      mqttTask.send({
        cmd: 'START_READ_EVENT',
        offsetRead,
        totalRead,
        blockId,
        exportDir: saveDir
      })
    })

**逐行讲解**
- `ipcMain.on('start-reading-data-event', (event, { offsetRead, totalRead, blockId }) => { ... })`：注册同步 IPC 监听器。`ipcMain.on` 来自 Electron 主进程 API；第二个参数是回调函数，首参 `event` 为事件对象，次参通过“对象解构”语法取出渲染端传来的三个字段 `offsetRead/totalRead/blockId`。
- `const mqttTask = processManager.getMQTTTask()`：向进程管理器索取当前 MQTT 子进程引用。返回的是 Node.js `ChildProcess`。
- `if (!mqttTask || mqttTask.killed) { ... }`：判断子进程是否存在或已被杀死。若不正常，使用 `mainWindow.webContents.send` 回发错误到渲染端通道 `'readEventErrorFromMain'` 并 `return`。
- `const saveDir = DEFAULT_EXPORT_DIR`（`index.js:713`）：读取主进程的默认导出目录（定义处：`src/main/index.js:37`）。`const` 声明只读变量；常量名用全大写表示“约定为配置常量”。
- `console.log(
  \
  \`[Main] 使用默认导出目录: ${saveDir}\`
)`（`index.js:714`）：模板字符串语法（反引号包裹）+ `${...}` 插值，打印目录用于调试定位。
- `event.sender.send('export-started', saveDir)`（`index.js:717`）：通过事件对象上的 `sender`（即发送该 IPC 的渲染端 `WebContents`）回发一个通知消息，通道名 `'export-started'`，载荷是导出目录。渲染端据此展示“导出开始”及保存路径。
- `mqttTask.send({ cmd: 'START_READ_EVENT', offsetRead, totalRead, blockId, exportDir: saveDir })`（`index.js:719-725`）：向子进程发送一条 JSON 可序列化的消息，`cmd` 字段为命令名，附带读取参数与保存目录。Node 的父子进程 IPC 使用 `.send(...)`，在子进程通过 `process.on('message', ...)` 接收。

**重点讲解（index.js:713-718）**
- `index.js:713` `const saveDir = DEFAULT_EXPORT_DIR`：将默认导出目录赋值给局部变量 `saveDir`，便于后续统一传参。`DEFAULT_EXPORT_DIR` 在主进程启动阶段设为 `join(process.cwd(), 'EventExports')`（`src/main/index.js:37`）。
- `index.js:714` ``console.log(`[Main] 使用默认导出目录: ${saveDir}`)``：使用模板字符串打印目录，`[Main]` 前缀约定表明日志来自主进程，方便在控制台中过滤与定位。
- `index.js:716-718` `event.sender.send('export-started', saveDir)`：将“导出开始”事件主动通知给当前发起操作的渲染端（而不是广播给所有窗口）。`event.sender` 是 `WebContents`，`.send(channel, ...args)` 会在渲染端触发对应 `ipcRenderer.on('export-started', ...)` 的监听。

> 通过以上代码，渲染端点击“导出”→主进程确认子进程存在→立即告知渲染端“导出开始”与目录→将读取任务及目录参数下发至子进程并行处理，整个链路无阻塞、信息透明。

---

## 报文存储（mqttExport）关键代码与讲解（完整）

为满足“无需查看源码文件即可掌握报文存储”的需求，以下给出与原始报文/语义 CSV 落盘直接相关的三个文件的核心实现片段，连同逐行解释。

### 目录与会话后缀定义（`src/main/mqttExport/paths.js:1-15`）

```javascript
import path from 'path'
import { formatFileSuffix } from './utils'
const BASE_EXPORT_ROOT = path.join(process.cwd(), 'dataExports')
export const SESSION_SUFFIX = formatFileSuffix(new Date())
export const RUN_EXPORT_DIR = path.join(BASE_EXPORT_ROOT, `Data_${SESSION_SUFFIX}`)
export const RAW_EXPORT_DIR = path.join(RUN_EXPORT_DIR, `Raw_Messages_${SESSION_SUFFIX}`)
const deviceDirSuffixMap = new Map()
export function getDeviceDirSuffix(id) {
  if (!deviceDirSuffixMap.has(id)) {
    const now = new Date()
    const s = formatFileSuffix(now)
    deviceDirSuffixMap.set(id, s)
  }
  return deviceDirSuffixMap.get(id)
}

**讲解**
- `BASE_EXPORT_ROOT`：以进程工作目录为根，固定在 `dataExports` 下生成所有导出数据。
- `SESSION_SUFFIX`：会话后缀，形如 `YYYYMMDD_hh_mm_ss`，用于将同一运行会话的数据集中在独立目录下，避免相互污染。
- `RUN_EXPORT_DIR`：会话级数据目录，如 `dataExports/Data_20250101_10_05_30`。
- `RAW_EXPORT_DIR`：原始报文 CSV 的目录，如 `.../Raw_Messages_20250101_10_05_30`，便于按会话压缩/归档。
- `getDeviceDirSuffix(id)`：为设备（如 `block-cluster` 组合）生成稳定的目录后缀，避免持续追加写入时目录变化。

### 文件写入重试与压缩（`src/main/mqttExport/utils.js:41-75`）

```javascript
export async function appendFileWithRetry(filePath, content) {
  let appended = false
  while (!appended) {
    try {
      await fs.promises.appendFile(filePath, content, { encoding: 'utf8' })
      appended = true
    } catch (err) {
      if (err.code === 'EBUSY') {
        process.send && process.send({ API: 'save-excel', filePath })
        await waitForUserDecision()
      } else if (err.code === 'ENOENT') {
        try { ensureDir(path.dirname(filePath)) } catch {}
      } else {
        throw err
      }
    }
  }
}
export function compressFileGzip(filePath) {
  return new Promise((resolve, reject) => {
    const gzip = zlib.createGzip()
    const input = fs.createReadStream(filePath)
    const output = fs.createWriteStream(filePath + '.gz')
    input.pipe(gzip).pipe(output)
    output.on('finish', () => {
      fs.unlink(filePath, (err) => {
        if (err) return reject(err)
        resolve(filePath + '.gz')
      })
    })
    output.on('error', reject)
    input.on('error', reject)
    gzip.on('error', reject)
  })
}
```

**讲解**
- `appendFileWithRetry`：按“写入成功为止”循环尝试。遇到 `EBUSY`（文件被占用）时，向主进程发 IPC `API:'save-excel'` 请求弹窗，等待用户决策后再试；遇到 `ENOENT` 则先创建目录。其他错误直接抛出。此设计在语义 CSV 的高频追加场景下保证可靠性。
- `compressFileGzip`：使用 `zlib` 创建 Gzip 流，将原始 CSV 压缩为 `.gz`，完成后删除原文件，返回新文件路径。配合“文件大小阈值触发压缩”实现报文日志的自动归档。

### 原始报文写入（`src/main/mqttExport/mqttRawLogger.js:71-84`）

```javascript
```

**讲解**
- `getFile()`：根据 `RAW_EXPORT_DIR` 与 `SESSION_SUFFIX` 生成当前会话的原始报文 CSV 文件路径。
- `rotateIfNeeded(p)`：超过大小阈值（`500MB`）时触发压缩轮转（见上文 `compressFileGzip`）。
- `ensureGlobalHeader(p)`：首次写入时追加 BOM 与表头，避免 Excel 打开乱码并保证列名一致。
- `idVal = ++globalIdCounter`：全局自增 ID，便于后期定位报文顺序与关联。
- `formatDateTime(new Date(ts))`：将时间戳格式化为 `YYYY-MM-DD-HH:mm:ss`。
- `payloadText`：以 `"0x..."` 形式写入十六进制，并做 CSV 引号转义（`" → ""`）。
- `writeChain = writeChain.then(job)`：将写任务串行化，避免多线程/多进程并发导致文件写入冲突或乱序。

---

## 关键代码（完整）

为确保新同学可以“只看此文档即可完全理解并复现代码逻辑”，以下包含本功能相关的完整关键代码片段，均为当前仓库中的真实实现，无省略、无伪代码。每段代码前后均配有说明，帮助形成“数据流动 → 代码落点”的明确映射。

### 事件导出模块（逐段代码 + 讲解）

以下为 `src/main/eventRecordExport.js` 的关键职责拆解与“代码+讲解”版本，去除了大段纯代码，以更易读的片段逐步解释：

**CRC 工具：寄存器转字节与 CRC16 计算**（`src/main/eventRecordExport.js:427-455`）

```javascript
function regsToBytes(registers) {
  const bytes = []
  for (const reg of registers) {
    bytes.push(reg & 0xFF)
    bytes.push((reg >> 8) & 0xFF)
  }
  return bytes
}
function computeCRC16(data) {
  let crc = 0xffff
  for (let b of data) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      if (crc & 0x0001) {
        crc = (crc >>> 1) ^ 0xa001
      } else {
        crc = crc >>> 1
      }
    }
  }
  return crc
}
```

- 小端序拆字节，Modbus CRC16 算法，供后续校验使用。

**CRC 校验入口**（`src/main/eventRecordExport.js:462-487`）

```javascript
function validateEventRecordCRC(recordData) {
  try {
    const rawRegisters = recordData.rawRegisters
    if (!rawRegisters || !Array.isArray(rawRegisters) || rawRegisters.length !== 128) {
      return '无效'
    }
    const dataRegsForCrc = rawRegisters.slice(0, 127)
    const expectedCrc = rawRegisters[127]
    const actualCrc = computeCRC16(regsToBytes(dataRegsForCrc))
    return actualCrc === expectedCrc ? '有效' : '无效'
  } catch (error) {
    return '无效'
  }
}
```

- 入参保护+计算比对，返回“有效/无效”。

**响应处理（批量记录映射与缓存）**（摘取关键片段，`src/main/eventRecordExport.js:702-816`）

```javascript
export function processEventRecordResponse(responseData, blockId, client) {
  if (!isReadingEvent || eventReadingBlockId !== blockId) return
  const { RecordOffset, RecordCount, records, baseConfig, data, result, rawRegisters, rawBuffer } = responseData
  if (result?.error) {
    /* 错误分支：按 RecordOffset/RecordCount 关联或兜底队首等待器 */
  } else {
    const recordCount = RecordCount || (records ? records.length : 1)
    responseOrderStats.total++
    for (let i = 0; i < recordCount; i++) {
      const record = records && records[i] ? records[i] : null
      const recordOffset = record ? record.RecordOffset : (RecordOffset + i)
      const waiter = eventRecordResponseWaiters.get(recordOffset)
      if (!waiter) continue
      eventRecordResponseWaiters.delete(recordOffset)
      eventReadingCompletedCount++
      mappingVerification.push({ requestedRecordIndex: recordOffset, deviceRecordOffset: recordOffset })
      const recordBaseConfig = record ? record.baseConfig : baseConfig
      const recordData = record ? record.data : data
      const recordRawRegisters = record ? record.rawRegisters : rawRegisters
      const recordRawBuffer = record ? record.rawBuffer : rawBuffer
      eventRecordDataCache.set(recordOffset, { recordIndex: recordOffset, baseConfig: recordBaseConfig, data: recordData, rawRegisters: recordRawRegisters, rawBuffer: recordRawBuffer, deviceRecordOffset: recordOffset })
      waiter.resolve({ recordIndex: recordOffset, baseConfig: recordBaseConfig, data: recordData })
    }
  }
}
```

- 乱序安全：按每条记录自带的 `RecordOffset` 匹配等待器，缓存结果用于排序写出。
- 进度计数：每条记录处理成功后递增。

**并发读取调度**（摘取关键片段，`src/main/eventRecordExport.js:867-1010`）

```javascript
const MAX_RECORDS_PER_REQUEST = 10
return new Promise((resolve, reject) => {
  let sendIndex = 0
  let progressTimer = setInterval(() => {
    const current = eventRecordDataCache.size
    process.send({ type: 'readEventProgress', data: { blockId, current, total: eventReadingTotal } })
  }, 100)
  const sendRequest = (offset, count) => {
    const recordTopic = `bms/host/s2d/b${blockId}/event_record_r`
    const payload = Buffer.alloc(4)
    payload.writeUInt16LE(offset, 0)
    payload.writeUInt16LE(count, 2)
    for (let i = 0; i < count; i++) {
      const recordIndex = offset + i
      eventRecordResponseWaiters.set(recordIndex, { resolve: () => {}, reject: () => {}, requestedRecordIndex: recordIndex })
    }
    client.publish(recordTopic, payload, (err) => { if (err) { /* 清理等待器 */ } else { eventReadingSentCount++ } })
  }
  const scheduleNextSend = () => {
    if (sendIndex < totalRead) {
      const currentOffset = offsetRead + sendIndex
      const remaining = totalRead - sendIndex
      const count = Math.min(remaining, MAX_RECORDS_PER_REQUEST)
      sendRequest(currentOffset, count)
      sendIndex += count
      if (sendIndex < totalRead) setTimeout(scheduleNextSend, SEND_INTERVAL_MS)
    }
  }
  scheduleNextSend()
}).then(() => stopReadingEvent(blockId, eventReadingCanceled, eventReadingError))
```

- 批量与节拍：每批最多 10 条，每 20ms 调度下一批。
- 等待器建模+进度心跳：避免阻塞，实时上报。

**完成/取消收敛与 CSV 生成**（摘取关键片段，`src/main/eventRecordExport.js:1018-1091, 1099-1164`）

```javascript
function stopReadingEvent(blockId, wasCanceled = false, hasError = false) {
  eventRecordResponseWaiters.clear()
  isReadingEvent = false
  const savedBlockId = eventReadingBlockId
  if (wasCanceled) {
    process.send({ type: 'readEventCanceled', data: { blockId: savedBlockId, saveDir: currentSaveDir } })
  } else {
    const cachedCount = eventRecordDataCache.size
    const isPartial = cachedCount < eventReadingTotal
    try { generateEventRecordCSV(savedBlockId, currentSaveDir, cachedCount) } catch {}
    process.send({ type: 'readEventCompleted', data: { blockId: savedBlockId, saveDir: currentSaveDir, cachedCount, totalRequested: eventReadingTotal, partial: isPartial } })
  }
}
function generateEventRecordCSV(blockId, saveDir, recordCount) {
  if (recordCount === 0) return
  const now = new Date()
  const dateOnly = now.toISOString().split('T')[0]
  const eventFolderPath = RAW_EXPORT_DIR
  fs.mkdirSync(eventFolderPath, { recursive: true })
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const filename = `EventRecords_block${blockId}_${dateOnly}_${hours}-${minutes}-${seconds}.csv`
  const outputFile = path.join(eventFolderPath, filename)
  const csvStream = fs.createWriteStream(outputFile, { encoding: 'utf8', flags: 'w' })
  csvStream.write('\uFEFF')
  const csvHeaders = ['ID']
  const csvFieldKeys = []
  const csvFieldDefs = []
  csvHeaders.push('CRC校验')
  const escapedHeaders = csvHeaders.map(h => `"${h.replace(/\"/g, '""')}"`)
  csvStream.write(escapedHeaders.join(',') + '\n')
  const sortedRecords = Array.from(eventRecordDataCache.entries()).sort((a, b) => a[0] - b[0])
  let rowIndex = 1
  for (const [recordIndex, recordData] of sortedRecords) {
    const baseConfig = recordData.baseConfig || {}
    if (!baseConfig || Object.keys(baseConfig).length === 0) continue
    const row = [rowIndex++]
    for (let i = 0; i < csvFieldKeys.length; i++) {
      const fieldKey = csvFieldKeys[i]
      const fieldDef = csvFieldDefs[i]
      const value = baseConfig[fieldKey]
      let cellValue = formatEventRecordField(fieldKey, value, baseConfig, fieldDef)
      const escapedValue = String(cellValue).replace(/\"/g, '""')
      row.push(`"${escapedValue}"`)
    }
    const crcValidationResult = validateEventRecordCRC(recordData)
    row.push(`"${crcValidationResult}"`)
    csvStream.write(row.join(',') + '\n')
  }
  csvStream.end()
}
```

- 完成/取消统一出口 + CSV 写入细节。

```javascript
/**
 * 事件记录导出功能模块
 * 负责事件记录的读取、缓存、CSV生成等功能
 */

const fs = require('fs')
const path = require('path')
import { EVENT_RECORD_R } from './table.js'
import { formatEventRecordField } from '../protocol/eventRecordFormatter'
import { RAW_EXPORT_DIR } from './mqttExport/paths.js'

/**
 * 将寄存器数组转换为字节数组（用于CRC计算）
 * @param {number[]} registers - 寄存器数组（每个元素为16位无符号整数）
 * @returns {number[]} 字节数组
 */
function regsToBytes(registers) {
  const bytes = []
  for (const reg of registers) {
    // 小端序：低字节在前，高字节在后
    bytes.push(reg & 0xFF)        // 低字节
    bytes.push((reg >> 8) & 0xFF) // 高字节
  }
  return bytes
}

/**
 * 计算CRC16校验值（Modbus CRC16算法）
 * @param {number[]} data - 字节数组
 * @returns {number} CRC16校验值
 */
function computeCRC16(data) {
  let crc = 0xffff
  for (let b of data) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      if (crc & 0x0001) {
        crc = (crc >>> 1) ^ 0xa001
      } else {
        crc = crc >>> 1
      }
    }
  }
  return crc
}

/**
 * 验证事件记录的CRC校验
 * @param {Object} recordData - 事件记录数据对象
 * @returns {string} 校验结果："有效" 或 "无效"
 */
function validateEventRecordCRC(recordData) {
  try {
    // 获取原始寄存器数据
    const rawRegisters = recordData.rawRegisters
    if (!rawRegisters || !Array.isArray(rawRegisters) || rawRegisters.length !== 128) {
      console.warn('[CRC校验] 原始寄存器数据无效，无法进行CRC校验')
      return '无效'
    }

    // 前127个寄存器用于CRC计算
    const dataRegsForCrc = rawRegisters.slice(0, 127)
    // 第128个寄存器存储CRC值
    const expectedCrc = rawRegisters[127]

    // 计算实际CRC值
    const actualCrc = computeCRC16(regsToBytes(dataRegsForCrc))

    // 比较CRC值
    const crcOk = actualCrc === expectedCrc

    return crcOk ? '有效' : '无效'
  } catch (error) {
    console.error('[CRC校验] CRC校验过程中发生错误:', error)
    return '无效'
  }
}

// 事件记录读取状态变量
let isReadingEvent = false
let eventReadingBlockId = null   // 当前读取的堆ID
let eventReadingOffset = 0       // 读取偏移量（起始偏移量）
let eventReadingTotal = 0         // 总记录数
let eventReadingCurrent = 0      // 当前已读取记录数
let eventReadingCanceled = false // 是否已取消
let eventReadingError = false    // 是否已发送错误通知（避免重复发送）
let eventRecordDataCache = new Map() // 缓存已读取的事件记录数据（key: recordIndex=请求偏移量, value: parsedData）
let currentSaveDir = ''          // 当前保存目录

// 事件记录读取等待机制：使用Promise等待响应
// key: recordIndex（请求偏移量，即offsetRead + sendIndex）
// value: { resolve, reject, requestedRecordIndex }
let eventRecordResponseWaiters = new Map()

// 进度更新批次大小
const PROGRESS_BATCH = 100

// 并行发送配置
const SEND_INTERVAL_MS = 20 // 发送间隔（毫秒），20ms = 50 req/s
let eventReadingSentCount = 0 // 已发送请求数量
let eventReadingCompletedCount = 0 // 已完成请求数量（成功或失败）

// 映射关系验证：记录请求recordIndex和对应的设备RecordOffset
let mappingVerification = [] // 存储映射关系：{ requestedRecordIndex, deviceRecordOffset }


// 响应顺序检测：用于判断设备是否按顺序响应
let lastReceivedRecordOffset = null // 上一个收到的RecordOffset
let responseOrderStats = {
  total: 0,
  inOrder: 0,
  outOfOrder: 0,
  firstResponse: true
} // 响应顺序统计

/**
 * 处理事件记录数据响应
 * 
 * 字段说明：
 * - 请求topic: bms/host/s2d/b${blockId}/event_record_r (发布)
 * - 请求payload: 2字节uint16_t，表示要读取的事件记录偏移量（0~N），小端序
 * - 响应topic: bms/host/s2d/b${blockId}/event_record_r (订阅)
 * - 响应格式: 数据长度(2字节) + 事件记录偏移量(2字节) + 事件记录数据(128 * 2字节 = 256字节) = 260字节
 * - RecordOffset: 设备返回的字段，在响应的第2-3字节（小端序），表示设备内部的实际记录索引
 * - recordIndex: 代码中使用的变量，表示请求偏移量（offsetRead + sendIndex），用于标识和匹配请求与响应
 * 
 * 匹配策略：使用设备返回的RecordOffset直接匹配对应的请求等待器
 * 
 * @param {Object} responseData - 响应数据对象，包含RecordOffset, baseConfig, data, result等
 * @param {number} blockId - 堆ID
 * @param {Object} client - MQTT客户端（未使用，保留以兼容接口）
 */
export function processEventRecordResponse(responseData, blockId, client) {
  if (!isReadingEvent || eventReadingBlockId !== blockId) {
    return
  }

  const { RecordOffset, RecordCount, records, baseConfig, data, result, rawRegisters, rawBuffer } = responseData

  if (result?.error) {
    // 错误响应：批量请求错误
    // 注意：错误响应时，RecordOffset可能是undefined（因为baseConfig是空对象）
    // 错误响应是1字节错误码，无法确定具体是哪个请求出错
    // 策略：如果RecordOffset有效，使用它；否则，错误可能影响最近的请求或所有未完成的请求
    
    if (RecordOffset !== undefined && !isNaN(RecordOffset) && RecordCount !== undefined) {
      // RecordOffset和RecordCount都有效，按原逻辑处理
      const recordCount = RecordCount || 1
      for (let i = 0; i < recordCount; i++) {
        const currentOffset = RecordOffset + i
        const waiter = eventRecordResponseWaiters.get(currentOffset)
        if (waiter) {
          eventRecordResponseWaiters.delete(currentOffset)
          eventReadingCompletedCount++
          waiter.reject(new Error(data?.message || `参数错误 (code: ${data?.code})`))
        } else {
          // 如果没有找到等待器，说明可能是延迟响应或RecordOffset不匹配
          console.warn(`[MQTT Child] 事件记录读取错误，但未找到对应的等待器: RecordOffset=${currentOffset}, error=${data?.message || `code: ${data?.code}`}`)
        }
      }
    } else {
      // RecordOffset无效，错误响应可能对应最近的请求
      // 由于无法确定具体是哪个请求，我们尝试处理第一个等待的记录
      // 注意：这可能导致部分记录无法正确处理，但至少不会导致NaN错误
      const firstWaiterKey = eventRecordResponseWaiters.keys().next().value
      if (firstWaiterKey !== undefined) {
        const waiter = eventRecordResponseWaiters.get(firstWaiterKey)
        if (waiter) {
          eventRecordResponseWaiters.delete(firstWaiterKey)
          eventReadingCompletedCount++
          waiter.reject(new Error(data?.message || `参数错误 (code: ${data?.code})`))
          console.warn(`[MQTT Child] 事件记录读取错误，RecordOffset无效，已处理第一个等待的记录: recordIndex=${firstWaiterKey}, error=${data?.message || `code: ${data?.code}`}`)
        }
      } else {
        console.warn(`[MQTT Child] 事件记录读取错误，但未找到任何等待器: error=${data?.message || `code: ${data?.code}`}`)
      }
    }
  } else {
    // 成功响应：处理多条记录
    const recordCount = RecordCount || (records ? records.length : 1)
    
    // 检测响应顺序（用于判断设备是否按顺序响应）- 使用第一条记录的偏移量
    responseOrderStats.total++
    if (responseOrderStats.firstResponse) {
      responseOrderStats.firstResponse = false
      lastReceivedRecordOffset = RecordOffset
      responseOrderStats.inOrder++
    } else {
      if (RecordOffset > lastReceivedRecordOffset) {
        responseOrderStats.inOrder++
      } else {
        responseOrderStats.outOfOrder++
      }
      lastReceivedRecordOffset = RecordOffset
    }
    
    // 处理每条记录
    for (let i = 0; i < recordCount; i++) {
      // 【关键修复】新协议中每条记录都有自己的偏移量，应该使用记录中的RecordOffset，而不是计算值
      const record = records && records[i] ? records[i] : null
      const recordOffset = record ? record.RecordOffset : (RecordOffset + i)  // 优先使用记录中的偏移量
      const currentOffset = recordOffset  // 使用记录的实际偏移量
      
      // 如果records数组存在，使用数组中的数据；否则使用向后兼容的单条记录数据
      const recordBaseConfig = record ? record.baseConfig : baseConfig
      const recordData = record ? record.data : data
      const recordRawRegisters = record ? record.rawRegisters : rawRegisters
      const recordRawBuffer = record ? record.rawBuffer : rawBuffer
      
      // 查找对应的等待器（使用记录的实际偏移量）
      const waiter = eventRecordResponseWaiters.get(currentOffset)
      
      // 如果找不到等待器，记录警告（但不影响功能）
      if (!waiter) {
        // 延迟响应或RecordOffset不匹配，静默处理
        continue
      }
      
      // 找到对应的等待器，处理该条记录
      eventRecordResponseWaiters.delete(currentOffset)
      eventReadingCompletedCount++
      
      // 记录映射关系验证
      mappingVerification.push({
        requestedRecordIndex: currentOffset, // 请求的recordIndex
        deviceRecordOffset: currentOffset     // 设备返回的RecordOffset
      })

      // 检查缓存是否已存在（覆盖旧数据，不影响功能）
      if (eventRecordDataCache.has(currentOffset)) {
        // RecordOffset已存在，覆盖旧数据（可能是重复响应）
      }

      // 缓存数据（使用RecordOffset作为key）
      eventRecordDataCache.set(currentOffset, {
        recordIndex: currentOffset, // 使用RecordOffset作为recordIndex
        baseConfig: recordBaseConfig,
        data: recordData,
        rawRegisters: recordRawRegisters,
        rawBuffer: recordRawBuffer,
        deviceRecordOffset: currentOffset
      })

      // 通知等待的Promise
      waiter.resolve({ recordIndex: currentOffset, baseConfig: recordBaseConfig, data: recordData })
    }
  }
}

/**
 * 开始读取事件记录
 * @param {number} blockId - 堆ID
 * @param {number} offsetRead - 读取偏移量
 * @param {number} totalRead - 总记录数
 * @param {string} exportDir - 导出目录路径
 * @param {Object} client - MQTT客户端
 */
export async function startReadingEvent(blockId, offsetRead, totalRead, exportDir, client) {
  if (isReadingEvent) {
    console.warn('[MQTT Child] 事件记录读取已在进行中，忽略新请求')
    return
  }

  if (!client) {
    throw new Error('MQTT客户端未初始化')
  }

  isReadingEvent = true
  eventReadingBlockId = blockId
  eventReadingOffset = offsetRead
  eventReadingTotal = totalRead
  eventReadingCurrent = 0
  eventReadingCanceled = false
  eventReadingError = false  // 重置错误标志
  eventReadingSentCount = 0  // 重置已发送数量
  eventReadingCompletedCount = 0  // 重置已完成数量
  eventRecordDataCache.clear()
  eventRecordResponseWaiters.clear() // 清空等待器
  currentSaveDir = exportDir || ''

  // 重置映射关系验证
  mappingVerification = []
  
  // 重置响应顺序统计
  lastReceivedRecordOffset = null
  responseOrderStats = {
    total: 0,
    inOrder: 0,
    outOfOrder: 0,
    firstResponse: true
  }


  // 并行发送模式：间隔20ms发送请求，不等待响应
  // 批量请求配置：每次最多10条记录
  const MAX_RECORDS_PER_REQUEST = 10
  
  return new Promise((resolve, reject) => {
    let sendIndex = 0 // 当前发送索引（记录数）
    let sendTimer = null // 发送定时器

    // 进度更新定时器
    let progressTimer = null
    const updateProgress = () => {
      if (!isReadingEvent) return
      const current = eventRecordDataCache.size
      process.send({
        type: 'readEventProgress',
        data: {
          blockId,
          current: current,
          total: eventReadingTotal
        }
      })
    }
    // 每100ms更新一次进度
    progressTimer = setInterval(updateProgress, 100)

    // 批量发送请求的函数（每次最多4条记录）
    
    const sendRequest = (offset, count) => {
      if (eventReadingCanceled || !isReadingEvent) {
        return
      }

      // 读取事件记录数据（payload为偏移量值 + 数量）
      const recordTopic = `bms/host/s2d/b${blockId}/event_record_r`
      // 根据协议：event_record_r的请求payload是偏移量值(2字节uint16_t) + 读取事件记录数量(2字节uint16_t)
      const payload = Buffer.alloc(4)
      payload.writeUInt16LE(offset, 0)   // 偏移量
      payload.writeUInt16LE(count, 2)    // 数量
      const recordPayloadHex = payload.toString('hex')

      // 为本次请求的每条记录创建等待器
      for (let i = 0; i < count; i++) {
        const recordIndex = offset + i
        eventRecordResponseWaiters.set(recordIndex, {
          resolve: (data) => {
            // 注意：resolve时，等待器可能已经被processEventRecordResponse删除
            // 这里不需要再次删除，因为processEventRecordResponse已经处理了
          },
          reject: (error) => {
            // 注意：reject时，等待器可能已经被processEventRecordResponse删除
            // 这里不需要再次删除，因为processEventRecordResponse已经处理了
          },
          requestedRecordIndex: recordIndex // 保存请求的recordIndex，用于调试
        })
      }

      // 发布读取请求（不等待响应）
      const payloadBuf = Buffer.from(recordPayloadHex, 'hex')
      client.publish(recordTopic, payloadBuf, (err) => {
        if (err) {
          // 发布失败，清理所有等待器
          console.error(`[MQTT Child] 发布读取请求失败: offset=${offset}, count=${count}, error=${err.message}`)
          for (let i = 0; i < count; i++) {
            const recordIndex = offset + i
            const waiter = eventRecordResponseWaiters.get(recordIndex)
            if (waiter) {
              eventRecordResponseWaiters.delete(recordIndex)
              eventReadingCompletedCount++
              waiter.reject(err)
            }
          }
        } else {
          // 发送成功（注意：这里只计数请求数，不是记录数）
          eventReadingSentCount++
        }
      })
    }

    // 开始发送请求（间隔20ms，批量发送，每批最多4条）
    const scheduleNextSend = () => {
      if (eventReadingCanceled || !isReadingEvent) {
        clearInterval(progressTimer)
        resolve()
        return
      }

      if (sendIndex < totalRead) {
        // 计算本次请求的偏移量和数量
        const currentOffset = offsetRead + sendIndex
        const remaining = totalRead - sendIndex
        const count = Math.min(remaining, MAX_RECORDS_PER_REQUEST)
        
        sendRequest(currentOffset, count)
        sendIndex += count  // 增加已发送的记录数

        // 如果还有更多请求要发送，安排下一个
        if (sendIndex < totalRead) {
          sendTimer = setTimeout(scheduleNextSend, SEND_INTERVAL_MS)
        }
      }
    }

    // 开始发送第一个请求
    scheduleNextSend()

    // 监听取消信号和完成状态（统一处理）
    const monitorInterval = setInterval(() => {
      // 检查是否已取消
      if (eventReadingCanceled || !isReadingEvent) {
        clearInterval(monitorInterval)
        clearInterval(progressTimer)
        if (sendTimer) clearTimeout(sendTimer)
        resolve()
        return
      }

      // 检查是否所有请求都已发送且所有响应都已收到
      // 注意：eventReadingSentCount 现在是请求数，eventReadingCompletedCount 是记录数
      const expectedRequestCount = Math.ceil(totalRead / MAX_RECORDS_PER_REQUEST)
      if (eventReadingSentCount === expectedRequestCount && eventReadingCompletedCount === totalRead) {
        clearInterval(monitorInterval)
        clearInterval(progressTimer)
        if (sendTimer) clearTimeout(sendTimer)
        
        resolve()
        return
      }
    }, 100)
  }).then(() => {
    // 统一处理完成/取消通知
    stopReadingEvent(blockId, eventReadingCanceled, eventReadingError)
  }).catch((error) => {
    // 致命错误处理
    eventReadingError = true
    console.error('[MQTT Child] 事件记录读取致命错误:', error)
    process.send({
      type: 'readEventError',
      data: {
        blockId,
        error: error.message || '未知错误',
        cachedCount: eventRecordDataCache.size,
        totalRequested: eventReadingTotal,
        failedAt: eventReadingCurrent
      }
    })
    stopReadingEvent(blockId, eventReadingCanceled, eventReadingError)
  })
}

/**
 * 停止读取事件记录（统一处理完成/取消）
 * @param {number} blockId - 堆ID
 * @param {boolean} wasCanceled - 是否被取消
 * @param {boolean} hasError - 是否已发送错误通知（避免重复发送）
 */
// stopReadingEvent 的完整实现已移除，详见上文“完成/取消收敛（片段）”逐行讲解。

/**
 * 生成事件记录CSV文件
 * @param {number} blockId - 堆ID
 * @param {string} saveDir - 保存目录
 * @param {number} recordCount - 记录数量
 */
function generateEventRecordCSV(blockId, saveDir, recordCount) {
  if (recordCount === 0) {
    console.warn(`[MQTT Child] CSV生成跳过: recordCount=${recordCount}`)
    return
  }

  // 创建日期文件夹
  const now = new Date()
  const dateOnly = now.toISOString().split('T')[0] // YYYY-MM-DD
  const eventFolderPath = RAW_EXPORT_DIR

  // 确保目录存在
  try {
    fs.mkdirSync(eventFolderPath, { recursive: true })
  } catch (err) {
    console.error(`[MQTT Child] 创建目录失败: ${eventFolderPath}`, err)
    throw err
  }

  // 生成文件名：b1_YYYY-MM-DD_HH-MM-SS.csv
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const timestamp = `${dateOnly}_${hours}-${minutes}-${seconds}`
  const filename = `EventRecords_block${blockId}_${timestamp}.csv`
  const outputFile = path.join(eventFolderPath, filename)

  // 创建写入流
  const csvStream = fs.createWriteStream(outputFile, { encoding: 'utf8', flags: 'w' })

  // 写入BOM（支持Excel正确识别UTF-8）
  csvStream.write('\uFEFF')

  // 从EVENT_RECORD_R表定义生成表头
  // 规则：跳过hide: true的字段，跳过bit类型字段（它们不单独占列）
  const csvHeaders = ['ID']
  const csvFieldKeys = [] // 保存字段key，用于数据行提取
  const csvFieldDefs = [] // 保存字段定义，用于格式化

  // 时间字段列表（需要合并为一个时间戳字段）
  const timeFields = ['Year', 'Month', 'Day', 'Week', 'Hour', 'Minute', 'Second']
  let timeFieldsProcessed = false // 标记是否已处理时间字段

  // 需要合并的字段类别（参考reference项目，将相同class的字段合并为一个表头）
  // 注意：簇汇总模拟量三级告警需要按严重程度分开显示（严重/一般/轻微）
  const mergeableClasses = [
    '簇汇总硬件故障',
    '堆硬件故障'
  ]

  // 簇汇总模拟量三级告警的特殊合并规则：按严重程度分组
  // key: 合并后的表头名称, value: 匹配的字段key前缀
  const clusterAnalogAlarmMergeGroups = {
    '严重故障': ['ClusterAnalogAlarm_Severe1', 'ClusterAnalogAlarm_Severe2'],
    '一般故障': ['ClusterAnalogAlarm_Moderate1', 'ClusterAnalogAlarm_Moderate2'],
    '轻微故障': ['ClusterAnalogAlarm_Mild1', 'ClusterAnalogAlarm_Mild2']
  }

  // 用于跟踪需要合并的class：{ class: [field1, field2, ...] }
  const mergeableFieldsMap = new Map()

  // 用于跟踪簇汇总模拟量三级告警的合并组：{ groupName: [field1, field2, ...] }
  const clusterAnalogAlarmFieldsMap = new Map()

  // 用于跟踪已经添加到表头的class，避免重复添加
  const addedClasses = new Set()

  // 用于跟踪已经添加到表头的簇汇总模拟量三级告警组，避免重复添加
  const addedClusterAnalogAlarmGroups = new Set()

  for (const field of EVENT_RECORD_R) {
    // 跳过隐藏字段
    if (field.hide === true) {
      continue
    }

    // 跳过bit类型字段（它们依赖父寄存器，不单独占列）
    if (field.type === 'bit') {
      continue
    }

    // 处理时间字段：跳过单个时间字段，添加合并后的时间戳字段
    if (timeFields.includes(field.key)) {
      // 只在遇到第一个时间字段（Year）时添加时间戳列
      if (!timeFieldsProcessed && field.key === 'Year') {
        csvHeaders.push('时间戳')
        csvFieldKeys.push('Timestamp') // 使用特殊key标识时间戳
        csvFieldDefs.push({ key: 'Timestamp', label: '时间戳', isMerged: false }) // 虚拟字段定义
        timeFieldsProcessed = true
      }
      // 跳过其他时间字段（Month, Day, Week, Hour, Minute, Second）
      continue
    }

    // 检查是否是簇汇总模拟量三级告警字段（需要按严重程度分组合并）
    if (field.class === '簇汇总模拟量三级告警') {
      // 查找该字段属于哪个合并组
      let matchedGroup = null
      for (const [groupName, keyPrefixes] of Object.entries(clusterAnalogAlarmMergeGroups)) {
        if (keyPrefixes.includes(field.key)) {
          matchedGroup = groupName
          break
        }
      }

      if (matchedGroup) {
        // 将字段添加到对应的合并组
        if (!clusterAnalogAlarmFieldsMap.has(matchedGroup)) {
          clusterAnalogAlarmFieldsMap.set(matchedGroup, [])
        }
        clusterAnalogAlarmFieldsMap.get(matchedGroup).push(field)

        // 只在第一次遇到该组时添加表头
        if (!addedClusterAnalogAlarmGroups.has(matchedGroup)) {
          csvHeaders.push(matchedGroup) // 使用组名称作为表头（如"严重故障"）
          csvFieldKeys.push(`Merged_ClusterAnalogAlarm_${matchedGroup}`) // 使用特殊key标识合并字段
          csvFieldDefs.push({
            key: `Merged_ClusterAnalogAlarm_${matchedGroup}`,
            label: matchedGroup,
            class: field.class,
            mergeGroup: matchedGroup,
            isMerged: true, // 标记为合并字段
            isClusterAnalogAlarm: true // 标记为簇汇总模拟量三级告警
          })
          addedClusterAnalogAlarmGroups.add(matchedGroup)
        }
      } else {
        // 如果字段key不匹配任何合并组，按普通字段处理
        csvHeaders.push(field.label)
        csvFieldKeys.push(field.key)
        csvFieldDefs.push({ ...field, isMerged: false })
      }
    } else if (field.class && mergeableClasses.includes(field.class)) {
      // 其他需要合并的class（簇汇总硬件故障、堆硬件故障）
      // 将字段添加到合并映射中
      if (!mergeableFieldsMap.has(field.class)) {
        mergeableFieldsMap.set(field.class, [])
      }
      mergeableFieldsMap.get(field.class).push(field)

      // 只在第一次遇到该class时添加表头
      if (!addedClasses.has(field.class)) {
        csvHeaders.push(field.class) // 使用class名称作为表头
        csvFieldKeys.push(`Merged_${field.class}`) // 使用特殊key标识合并字段
        csvFieldDefs.push({
          key: `Merged_${field.class}`,
          label: field.class,
          class: field.class,
          isMerged: true // 标记为合并字段
        })
        addedClasses.add(field.class)
      }
    } else {
      // 普通字段：直接添加
      csvHeaders.push(field.label)
      csvFieldKeys.push(field.key)
      csvFieldDefs.push({ ...field, isMerged: false }) // 标记为非合并字段
    }
  }

  // 添加CRC校验列到表头末尾
  csvHeaders.push('CRC校验')

  // 写入表头（表头也需要CSV转义，以防label中包含逗号或引号）
  const escapedHeaders = csvHeaders.map(header => {
    const escaped = header.replace(/"/g, '""')
    return `"${escaped}"`
  })
  csvStream.write(escapedHeaders.join(',') + '\n')

  // 按recordIndex排序，写入数据行
  const sortedRecords = Array.from(eventRecordDataCache.entries())
    .sort((a, b) => a[0] - b[0]) // 按recordIndex排序

  let rowIndex = 1
  let skippedCount = 0
  let writtenCount = 0
  for (const [recordIndex, recordData] of sortedRecords) {
    const baseConfig = recordData.baseConfig || {}

    // 如果baseConfig为空，跳过
    if (!baseConfig || Object.keys(baseConfig).length === 0) {
      console.warn(`[CSV生成] 记录 ${recordIndex} 没有解析数据，跳过`)
      skippedCount++
      continue
    }

    writtenCount++

    // 生成CSV行：ID + 按字段顺序提取的值
    const row = [rowIndex++] // ID从1开始

    // 按照csvFieldKeys的顺序，从baseConfig中提取字段值并格式化
    for (let i = 0; i < csvFieldKeys.length; i++) {
      const fieldKey = csvFieldKeys[i]
      const fieldDef = csvFieldDefs[i]

      // 处理时间戳字段（合并时间字段）
      if (fieldKey === 'Timestamp') {
        const year = baseConfig.Year
        const month = baseConfig.Month
        const day = baseConfig.Day
        const hour = baseConfig.Hour
        const minute = baseConfig.Minute
        const second = baseConfig.Second

        // 格式化时间戳：YYYY-M-D-HH:mm:ss
        // 注意：Year, Month, Day, Hour, Minute, Second 在parseEventRecordRAW中已经BCD解码
        if (year !== undefined && month !== undefined && day !== undefined &&
            hour !== undefined && minute !== undefined && second !== undefined) {
          // 确保时分秒是两位数
          const pad2 = (num) => String(num).padStart(2, '0')
          const timestamp = `${year}-${month}-${day}-${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
          const escapedValue = timestamp.replace(/"/g, '""')
          row.push(`"${escapedValue}"`)
        } else {
          // 如果时间字段不完整，使用"/"占位
          row.push('"/"')
        }
        continue
      }

      // 处理合并字段（参考reference项目，将同类字段合并）
      if (fieldDef.isMerged) {
        let mergedFields = []

        // 判断是簇汇总模拟量三级告警还是其他合并字段
        if (fieldDef.isClusterAnalogAlarm && fieldDef.mergeGroup) {
          // 簇汇总模拟量三级告警：按严重程度分组
          mergedFields = clusterAnalogAlarmFieldsMap.get(fieldDef.mergeGroup) || []
        } else if (fieldDef.class) {
          // 其他合并字段（簇汇总硬件故障、堆硬件故障）
          mergedFields = mergeableFieldsMap.get(fieldDef.class) || []
        }

        const mergedValues = []

        // 遍历该组下的所有字段，收集格式化后的值
        for (const field of mergedFields) {
          const value = baseConfig[field.key]
          if (value === undefined || value === null) {
            continue // 跳过空值
          }

          // 格式化字段值
          let cellValue = formatEventRecordField(field.key, value, baseConfig, field)

          // 确保cellValue是字符串类型
          if (typeof cellValue !== 'string') {
            cellValue = String(cellValue)
          }

          // 过滤掉"无故障"、空字符串和"/"
          // 参考reference项目：只有所有字段都无故障时，才显示"无故障"
          // 如果至少有一个字段有故障信息，就合并所有非"无故障"的值
          if (cellValue && cellValue.trim() !== '' &&
              cellValue !== '无故障' && cellValue !== '/' &&
              cellValue !== '"/"') {
            mergedValues.push(cellValue)
          }
        }

        // 合并逻辑：如果所有字段都是"无故障"或空，显示"无故障"；否则合并所有非"无故障"的值
        let mergedCellValue
        if (mergedValues.length === 0) {
          // 所有字段都无故障或为空，显示"无故障"
          mergedCellValue = '无故障'
        } else {
          // 至少有一个字段有故障信息，用逗号连接所有故障信息
          // 参考reference项目：使用join(',')连接
          mergedCellValue = mergedValues.join(',')
        }

        // CSV转义
        const escapedValue = mergedCellValue.replace(/"/g, '""')
        row.push(`"${escapedValue}"`)
        continue
      }

      // 普通字段：直接处理
      const value = baseConfig[fieldKey]

      // 使用格式化函数处理字段值
      let cellValue = formatEventRecordField(fieldKey, value, baseConfig, fieldDef)

      // 确保cellValue是字符串类型（防止formatEventRecordField返回非字符串）
      if (typeof cellValue !== 'string') {
        console.warn(`[CSV生成] 记录${recordIndex} ${fieldKey}: formatEventRecordField返回了非字符串类型，值=${cellValue}，类型=${typeof cellValue}，已转换为字符串`)
        cellValue = String(cellValue)
      }

      // CSV转义：将双引号转义为两个双引号，然后用双引号包裹（参考reference项目）
      const escapedValue = cellValue.replace(/"/g, '""')
      row.push(`"${escapedValue}"`)
    }

    // 添加CRC校验结果到行末尾
    const crcValidationResult = validateEventRecordCRC(recordData)
    row.push(`"${crcValidationResult}"`)

    // 写入CSV行
    csvStream.write(row.join(',') + '\n')
  }

    // 关闭流
    csvStream.end()
  }

/**
 * 取消读取事件记录
 * @param {number} blockId - 堆ID
 */
// cancelReadingEvent 详解已在“完成/取消收敛”片段讲解，此处移除完整函数代码。

/**
 * 获取事件记录读取状态
 */
// getEventReadingState 详解已在状态章节讲解，此处移除完整函数代码。
```

说明要点：
- 并发策略参数在模块内可调：`MAX_RECORDS_PER_REQUEST`、`SEND_INTERVAL_MS`。
- 响应关联严格使用设备返回的 `RecordOffset` 与等待器 Map 的键匹配，避免乱序导致的错配。
- CSV 表头基于 `EVENT_RECORD_R` 定义动态生成，时间字段合并为 `Timestamp`，位类字段合并按严重程度或类别分组。
- 每行末尾追加 `CRC校验` 字段，调用 `validateEventRecordCRC` 对 127 个寄存器进行 Modbus CRC16 校验并与第 128 个寄存器比对。

### 事件字段格式化（逐段代码 + 讲解）

以下为 `src/protocol/eventRecordFormatter.js` 的“代码片段 + 逐行讲解”版。

**位故障解析**（`src/protocol/eventRecordFormatter.js:1623-1646`）

```javascript
function parseFaultBits(registerValue, faultMap) {
  if (!faultMap || faultMap.length !== 16) return String(registerValue)
  const faults = []
  for (let i = 0; i < 16; i++) {
    if ((registerValue & (1 << i)) !== 0) {
      const faultName = faultMap[i]
      if (faultName && !faultName.includes('预留')) faults.push(faultName)
    }
  }
  return faults.length > 0 ? faults.join(',') : '无故障'
}
```

- 位运算：`(registerValue & (1 << i))` 检查第 i 位是否为 1。
- 过滤规则：忽略包含“预留”的位名，仅输出有效故障。

**统一格式化入口（关键分支）**（摘取片段，`src/protocol/eventRecordFormatter.js:1670-1754`）

```javascript
export function formatEventRecordField(fieldKey, value, baseConfig, fieldDef) {
  if (value === undefined || value === null || value === '') return '/'
  if (typeof value === 'object') return value.txt !== undefined ? String(value.txt) : JSON.stringify(value)
  if (fieldKey === 'EventType') {
    const eventType = Number(value)
    return EVENT_TYPE_MAP[eventType] !== undefined ? EVENT_TYPE_MAP[eventType] : `未知事件(${eventType})`
  }
  if (fieldKey === 'Param1' || fieldKey === 'Param2' || fieldKey === 'Param3' || fieldKey === 'Param4') {
    const eventType = Number(baseConfig.EventType || 0)
    const paramIndex = fieldKey === 'Param1' ? 1 : fieldKey === 'Param2' ? 2 : fieldKey === 'Param3' ? 3 : 4
    return formatEventParam(eventType, paramIndex, value, baseConfig)
  }
  if (fieldKey.startsWith('EnableClusterFlag') || fieldKey.startsWith('ExitClusterFlag')) {
    const numValue = Number(value)
    if (numValue < 0 || numValue > 1023) return String(value)
    return numValue.toString(2).padStart(10, '0')
  }
  if (/* 状态字段集合 */) {
    const result = formatStatusField(fieldKey, value)
    return typeof result === 'string' ? result : String(result)
  }
  if (fieldKey.startsWith('ClusterAnalogAlarm_') || fieldKey.startsWith('ClusterHardwareFault_') || fieldKey.startsWith('StackHardwareFault_')) {
    const faultMap = FAULT_BIT_MAPS[fieldKey]
    if (faultMap) {
      const result = parseFaultBits(Number(value), faultMap)
      return typeof result === 'string' ? result : String(result)
    }
  }
  if (fieldDef && (fieldDef.type === 'hex' || fieldDef.type === 'hex16')) {
    const numValue = Number(value)
    if (numValue === 0) return '--'
    return '0x' + numValue.toString(16).padStart(4, '0').toUpperCase()
  }
  if (fieldDef && fieldDef.unit) {
    const numValue = Number(value)
    if (isNaN(numValue) || !isFinite(numValue)) return String(value)
    if (typeof value === 'string' && /V|A|℃|%|kW|kWh|Ah|kΩ/.test(value)) return value
    return fieldDef.scale === 10 ? numValue.toFixed(1) + fieldDef.unit : String(numValue) + fieldDef.unit
  }
  const finalValue = String(value)
  return finalValue === 'null' || finalValue === 'undefined' ? '/' : finalValue
}
```

- 按键分类：事件类型、参数、状态、位故障、十六进制、带单位、默认字符串。
- 边界与健壮：统一空值占位 `/`；对象值优先 `txt`，否则 JSON 字符串。

（纯代码已移除，改为片段讲解与路标引用。）

说明要点：
- 故障类字段按位解析，过滤“预留”位，只汇总有效故障文本；无故障统一返回“无故障”。
- 使能簇与退并簇标志位按 10 位二进制字符串输出，便于直观查看每簇状态。
- 十六进制字段统一输出为 `0xFFFF` 形式，0 值用 `--` 以区分“无效值”。
- 带单位字段在解析阶段已完成缩放，格式化阶段仅负责单位拼接与小数位处理。

### 原始报文存储（逐段代码 + 讲解）

以下为 `src/main/mqttExport/mqttRawLogger.js` 的“片段 + 逐行讲解”版，负责将入/出站 MQTT 报文落盘为 CSV，并支持文件大小上限自动 Gzip 压缩与写链串行化，避免竞争写入。

```javascript
// 此处纯代码已移除，改为片段讲解：详见下文“片段 1/2/3”。
```

说明要点：
- 全局写链 `writeChain` 将并发写入串行化，避免 `appendFile` 的竞争条件。
- 首次写入文件自动追加 BOM 与表头，保证 Excel 打开不乱码。
- 超过大小上限自动压缩并轮转至新文件，避免单个 CSV 过大。

片段 1：目录与文件、表头初始化与轮转
```javascript
const RAW_HEADER = ['ID','时间','方向','主题','设备','PayloadHex'].join(',')
function getFile() { ensureDir(RAW_EXPORT_DIR); return path.join(RAW_EXPORT_DIR, `Raw_Messages_${SESSION_SUFFIX}.csv`) }
async function rotateIfNeeded(p) { try { const s = await fs.promises.stat(p); if (s.size >= 500*1024*1024) await compressFileGzip(p) } catch {} }
async function ensureGlobalHeader(p) { if (headerInitPromise && headerInitPath === p) return headerInitPromise; headerInitPath = p; headerInitPromise = (async () => { const st = await fs.promises.stat(p).catch(() => null); if (!st || st.size === 0) await appendFileWithRetry(p, '\uFEFF' + RAW_HEADER + '\r\n') })(); return headerInitPromise }
```
- 首次写入写 BOM 与表头；超过大小限制自动压缩轮转。

片段 2：方向与设备标签
```javascript
function formatClientLabel(clientId) { const [bStr,cStr] = String(clientId).split('-'); const b = parseInt(bStr)||0; const c = parseInt(cStr)||0; return c===0?`堆${b}`:`堆${b}簇${c}` }
function formatDirectionText(dir) { if (dir==='s2d') return '上位机->BAU'; if (dir==='d2s') return 'BAU->上位机'; return String(dir||'') }
```
- 渲染友好：设备维度与方向中文化，便于日志审阅。

片段 3：核心写入（并发串行化）
```javascript
let globalIdCounter = 0; let writeChain = Promise.resolve()
export async function logAnyMessage({ topic, payloadHex, clientId, ts, direction }) {
  const p = getFile(); const job = async () => {
    await rotateIfNeeded(p); await ensureGlobalHeader(p)
    const idVal = ++globalIdCounter; const tstr = formatDateTime(new Date(ts)); const clientText = formatClientLabel(clientId)
    const payloadText = '"' + '0x' + String(payloadHex).toUpperCase().replace(/\"/g, '\"\"') + '"'
    const row = [idVal, tstr, formatDirectionText(direction), topic, clientText, payloadText].join(',') + '\r\n'
    await appendFileWithRetry(p, row)
  }; await (writeChain = writeChain.then(job))
}
```
- 写链串行：避免 `appendFile` 并发导致的乱序与竞争。
- 负载统一：十六进制转大写并做 CSV 引号转义。

### 语义数据采集与落盘（逐段代码 + 讲解）

以下为 `src/main/mqttExport/ingest.js` 的“片段 + 逐行讲解”版，覆盖单体采样与概要数据缓存逻辑。

片段 1：`processCellVolt`（单体电压采样聚合与校验）
```javascript
export function processCellVolt({ blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  const packs = new Map()
  let globalIndex = 0
  for (const group of (data || [])) {
    const bmuId = group?.bmuId ? group.bmuId : 1
    let pack = packs.get(bmuId); if (!pack) { pack = { packID: bmuId, cells: [] }; packs.set(bmuId, pack) }
    const elements = group?.element || []
    for (const el of elements) { const val = el.value; globalIndex++; pack.cells.push({ index: String(globalIndex).padStart(3, '0'), bmuIndex: pack.cells.length + 1, value: val }) }
  }
  const dataList = Array.from(packs.values())
  const total = dataList.reduce((s, p) => s + p.cells.length, 0)
  const expectedTotal = baseConfig?.totalCell || 0
  const perBmu = baseConfig?.afePerBmu || 0
  const counts = baseConfig?.afeCellCounts || []
  let perBmuExpected = 0; for (let a = 0; a < perBmu; a++) perBmuExpected += counts[a] || 0
  const perBmuOk = dataList.every((p) => p.cells.length === perBmuExpected)
  if (total === expectedTotal && perBmuOk) cacheSampleSemantic('cellVoltage', dataList, deviceId, Date.now(), baseConfig)
}
```
- 设备维度：`deviceId = blockId-clusterId` 用于落盘分组。
- 聚合：按 BMU 聚集为 `packs`，并为每个 cell 生成自增 `index` 与 `bmuIndex`。
- 双重一致性：校验总数与“每 BMU 期望数”一致，避免半帧污染。
- 缓存：一致则 `cacheSampleSemantic('cellVoltage', ...)`，供定时落盘。

片段 2：`processCellTemp`（单体温度采样）
```javascript
export function processCellTemp({ blockId, clusterId, baseConfig, data }) {
  const deviceId = `${blockId}-${clusterId || 0}`
  const packs = new Map(); let globalIndex = 0
  for (const group of (data || [])) {
    const bmuId = group?.bmuId ? group.bmuId : 1
    let pack = packs.get(bmuId); if (!pack) { pack = { packID: bmuId, cells: [] }; packs.set(bmuId, pack) }
    const elements = group?.element || []
    for (const el of elements) { const val = el.value; globalIndex++; pack.cells.push({ index: String(globalIndex).padStart(3, '0'), bmuIndex: pack.cells.length + 1, value: val }) }
  }
  const dataList = Array.from(packs.values())
  const total = dataList.reduce((s, p) => s + p.cells.length, 0)
  const expectedTotal = baseConfig?.totalTemp || 0
  const perBmu = baseConfig?.afePerBmu || 0
  const counts = baseConfig?.afeTempCounts || []
  let perBmuExpected = 0; for (let a = 0; a < perBmu; a++) perBmuExpected += counts[a] || 0
  const perBmuOk = dataList.every((p) => p.cells.length === perBmuExpected)
  if (total === expectedTotal && perBmuOk) cacheSampleSemantic('cellTemperature', dataList, deviceId, Date.now(), baseConfig)
}
```
- 差异点：温度的期望总数与每 BMU 计数来自 `totalTemp/afeTempCounts`。

片段 3/4：`processCellSoc` 与 `processCellSoh`
```javascript
export function processCellSoc({ blockId, clusterId, baseConfig, data }) { /* 同电压流程，label='cellSOC'，expectedTotal=baseConfig.totalCell, counts=afeCellCounts */ }
export function processCellSoh({ blockId, clusterId, baseConfig, data }) { /* 同电压流程，label='cellSOH'，expectedTotal=baseConfig.totalCell, counts=afeCellCounts */ }
```
- 说明：SOC/SOH 走电压同款校验路径，仅 `label` 不同。

片段 5/6/7：概要数据直传
```javascript
export function processClusterSummary({ blockId, clusterId, baseConfig, data }) { const deviceId = `${blockId}-${clusterId || 0}`; cacheSampleSemantic('clusterSummary', data || [], deviceId, Date.now(), baseConfig) }
export function processPackSummary({ blockId, clusterId, baseConfig, data }) { const deviceId = `${blockId}-${clusterId || 0}`; cacheSampleSemantic('packSummary', data || [], deviceId, Date.now(), baseConfig) }
export function processBlockSummary({ blockId, clusterId, baseConfig, data }) { const deviceId = `${blockId}-${clusterId || 0}`; const bc = (data && typeof data === 'object' && Object.keys(data).length) ? data : baseConfig; cacheSampleSemantic('blockSummary', bc ? [bc] : [], deviceId, Date.now(), null) }
```
- `blockSummary`：元数据 `meta=null`，避免表头重写（块概要表头固定）。

说明要点：
- 单体采样：先 BMU 聚合、双重一致性校验，通过才缓存。
- 概要数据：直接缓存，落盘模块统一写入并处理表头变动。

### 语义数据落盘（关键函数）

以下为 `src/main/mqttExport/bauDataExport.js` 的“片段 + 讲解”版，覆盖缓存接口、定时落盘与文件路径生成。

片段 1：缓存接口 `cacheSampleSemantic`
```javascript
export function cacheSampleSemantic(label, dataList, deviceId, ts, meta) {
  if (!latest[label]) latest[label] = {}
  latest[label][deviceId] = { timestamp: ts, dataList, meta }
}
```
- 缓存模型：`latest[label][deviceId]` 保存“最新采样 + meta 快照”。
- 用途：被 `ingest.js` 调用，定时器统一消费落盘。

片段 2：定时器主循环（决策写入数据与表头）
```javascript
let saveTimer = null
export function startSaveTimerSemantic() {
  if (saveTimer) return
  saveTimer = setInterval(async () => {
    const now = Date.now()
    Object.keys(latest).forEach((label) => {
      Object.keys(latest[label]).forEach((id) => {
        const sample = latest[label][id]
        const prev = lastWritten[label][id]
        const hasSample = !!sample?.dataList?.length
        const hasPrev = !!prev?.dataList?.length
        let dataListToWrite = null, metaToUse = null, newTs = prev?.timestamp || 0
        if (hasSample && (!prev || sample.timestamp > prev.timestamp)) { dataListToWrite = sample.dataList; metaToUse = sample.meta; newTs = sample.timestamp }
        else if (hasSample && prev && sample.timestamp <= prev.timestamp && hasPrev) { dataListToWrite = prev.dataList; metaToUse = prev.meta }
        else if (!hasSample && hasPrev) { dataListToWrite = prev.dataList; metaToUse = prev.meta }
        if (dataListToWrite) {
          if (label === 'cellVoltage') saveCellSemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'cellTemperature') saveCellTemperatureSemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'cellSOC') saveCellSocSemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'cellSOH') saveCellSohSemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'clusterSummary') saveClusterSummarySemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'packSummary') savePackSummarySemantic(dataListToWrite, id, now, metaToUse)
          if (label === 'blockSummary') saveBlockSummarySemantic(dataListToWrite, id, now, metaToUse)
          lastWritten[label][id] = { timestamp: newTs, dataList: dataListToWrite, meta: metaToUse }
        }
      })
    })
  }, 2000)
}
export function stopSaveTimerSemantic() { if (saveTimer) { clearInterval(saveTimer); saveTimer = null } }
```
- 写入选择：新采样优先；若新采样时间戳不大于前次则回退；若无新采样则使用前次有效采样。
- 标签派发：按 `label` 调用对应保存函数（电压/温度/SOC/SOH/概要）。
- 快照更新：`lastWritten[label][id]` 记录上次写入的样本与时间戳用于比较与回退。

片段 3：按设备维度生成 CSV 路径
```javascript
function getCsvFilePath(deviceId, basename) {
  const { block, cluster } = parseDevice(deviceId)
  const dirSuffix = getDeviceDirSuffix(deviceId)
  const dir = path.join(RUN_EXPORT_DIR, `Block${block}_Cluster${cluster}_${dirSuffix}`)
  ensureDir(dir)
  const fileSuffix = formatFileSuffix(new Date())
  return path.join(dir, `${basename}_${fileSuffix}.csv`)
}
```
- 目录命名：`Block{B}_Cluster{C}_{设备后缀}`，按设备分隔便于查阅。
- 文件命名：`{basename}_{时间后缀}.csv`，避免覆盖与便于分片。

说明要点：
- `latest` 作为最新采样缓存，`lastWritten` 作为最后一次落盘快照；定时器按“新采样优先，可回退到上次有效采样”的策略写入。
- 支持“配置变更触发表头重写”的机制：当 `meta` 快照字符串化后发生变化，在下次写入前追加一行新表头并重置 ID 计数器。
- 文件轮转与目录命名基于 `RUN_EXPORT_DIR` 和设备维度后缀，保证一天内每设备形成独立目录与多文件分片。

### 路径与文件工具（逐段代码 + 讲解）

片段 1：导出目录与会话后缀（`paths.js`）
```javascript
export const SESSION_SUFFIX = formatFileSuffix(new Date())
export const RUN_EXPORT_DIR = path.join(process.cwd(), 'dataExports', `Data_${SESSION_SUFFIX}`)
export const RAW_EXPORT_DIR = path.join(RUN_EXPORT_DIR, `Raw_Messages_${SESSION_SUFFIX}`)
const deviceDirSuffixMap = new Map()
export function getDeviceDirSuffix(id) { if (!deviceDirSuffixMap.has(id)) deviceDirSuffixMap.set(id, formatFileSuffix(new Date())); return deviceDirSuffixMap.get(id) }
```
- 会话分隔：用 `SESSION_SUFFIX` 把当次运行的所有数据归到独立目录。
- 设备维度后缀：`getDeviceDirSuffix(id)` 保证每设备目录稳定，便于多文件分片。

片段 2：文件追加重试与压缩（`utils.js`）
```javascript
export async function appendFileWithRetry(filePath, content) {
  let appended = false
  while (!appended) {
    try { await fs.promises.appendFile(filePath, content, { encoding: 'utf8' }); appended = true }
    catch (err) {
      if (err.code === 'EBUSY') { process.send && process.send({ API: 'save-excel', filePath }); await waitForUserDecision() }
      else if (err.code === 'ENOENT') { try { ensureDir(path.dirname(filePath)) } catch {} }
      else { throw err }
    }
  }
}
export function compressFileGzip(filePath) {
  return new Promise((resolve, reject) => {
    const gzip = zlib.createGzip(); const input = fs.createReadStream(filePath); const output = fs.createWriteStream(filePath + '.gz')
    input.pipe(gzip).pipe(output)
    output.on('finish', () => { fs.unlink(filePath, (err) => { if (err) return reject(err); resolve(filePath + '.gz') }) })
    output.on('error', reject); input.on('error', reject); gzip.on('error', reject)
  })
}
```
- `EBUSY`：弹窗询问用户并等待决策；`ENOENT`：先创建目录再尝试写入。
- 压缩：流式管道生成 `.gz` 并删除原文件，防止过大文件积累。

片段 3：时间格式工具（`utils.js`）
```javascript
export function formatFileSuffix(date) { /* YYYYMMDD_hh_mm_ss */ }
export function formatDateTime(date) { /* YYYY-MM-DD-HH:mm:ss */ }
```
- 文件后缀与人类可读时间字符串用于目录/文件命名与 CSV 列。

说明要点：
- `appendFileWithRetry` 捕获 `EBUSY` 并通过 IPC 向主进程请求用户决策，避免文件占用导致写入失败。
- `compressFileGzip` 采用管道压缩并在完成后删除原文件，生成 `.gz` 文件。

### IPC 桥接（逐段代码 + 讲解）

以下为 `src/main/ipc/childBridge.js` 的“片段 + 讲解”版，覆盖占用弹窗与事件导出消息转发。

片段 1：文件占用弹窗决策链
```javascript
if (msg.API === 'save-excel') {
  if (busyDialogShowing) return; busyDialogShowing = true
  try {
    mainWindow.webContents.send('show-save-excel-dialog')
    ipcMain.once('save-excel-decision', (_e, decision) => {
      const t = processManager.getMQTTTask(); if (t && !t.killed) t.send({ API: 'save-excel-decision', decision })
      busyDialogShowing = false
    })
  } catch { busyDialogShowing = false }
  return
}
```
- 作用：向渲染端弹窗请求用户确认，收到决定后回发给子进程以继续/放弃写入。

片段 2：导出进度/完成/错误/取消转发
```javascript
if (msg.type === 'readEventProgress') { setImmediate(() => mainWindow.webContents.send('update-readEventProgress', msg.data)); return }
if (msg.type === 'readEventCompleted') { setImmediate(() => mainWindow.webContents.send('export-completed', msg.data)); return }
if (msg.type === 'readEventError') { setImmediate(() => mainWindow.webContents.send('readEventErrorFromMain', msg.data)); return }
if (msg.type === 'readEventCanceled') { setImmediate(() => mainWindow.webContents.send('export-canceled', msg.data)); return }
```
- 使用 `setImmediate`：避免阻塞当前事件循环，保证 UI 流畅。

片段 3：默认业务转发与心跳
```javascript
setImmediate(() => mainWindow.webContents.send(msg.type, msg.data))
if (msg.data && typeof msg.data === 'object' && Object.keys(msg.data).length > 0 && !['mqtt-connected','mqtt-disconnected','mqtt-connect-result','mqtt-disconnect-result','mqtt-test-result','data-rate-update','heartbeat'].includes(msg.type)) {
  setImmediate(() => mainWindow.webContents.send('mqtt-data-heartbeat', { timestamp: Date.now(), messageType: msg.type }))
}
```
- 心跳：仅对业务数据发送摘要心跳，便于渲染端做数据健康监控。

### 字段表定义（事件标志位与事件数据）

以下为 `src/main/table.js` 中与事件导出相关的字段表片段，供理解 CSV 表头生成与格式化依据。

```javascript
// 事件记录标志位字段（event_record_flag_r）
{ class: '事件记录标志位', key: 'StoragePercent', label: '事件记录存储百分比', type: 'u16', scale: 100 },
{ class: '事件记录标志位', key: 'WriteStartPos', label: '写事件记录开始位置', type: 'u32', scale: 1 },
{ class: '事件记录标志位', key: 'DeleteStartPos', label: '删除事件记录开始位置', type: 'u32', scale: 1 },
{ class: '事件记录标志位', key: 'PendingDeleteCount', label: '等待删除事件记录数量', type: 'u32', scale: 1 },
{ class: '事件记录标志位', key: 'CRC16', label: 'CRC16', type: 'u16', scale: 1, hide: true }
```

- `StoragePercent` 单位 0.1%，用于 UI 估算导出数量与进度。
- `WriteStartPos/DeleteStartPos/PendingDeleteCount` 为删除/写入起点与待删条数诊断依据。
- `CRC16` 隐藏列，用于标志区完整性校验，不参与 CSV 表头。

```javascript
// 事件记录数据字段（event_record_r）—— 时间、事件、状态、故障、版本、CRC
export const EVENT_RECORD_R = [
  { class: '事件记录数据', key: 'Year', label: '年', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Month', label: '月', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Day', label: '日', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Week', label: '周', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Hour', label: '时', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Minute', label: '分', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Second', label: '秒', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'EventType', label: '事件类型', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Param1', label: '参数1', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Param2', label: '参数2', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Param3', label: '参数3', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Param4', label: '参数4', type: 'u16', scale: 1 },
  // ...（簇汇总模拟量三级告警、簇/堆硬件故障等，详见源码）
]
```

- 时间字段在 CSV 中合并为 `Timestamp` 一列：`YYYY-M-D-HH:mm:ss`。
- `EventType` 用映射表转为汉字事件名；`Param1..4` 按事件类型语义化。
- 告警/故障位域不逐寄存器铺开，按类别/严重度合并列输出合并文本。

### MQTT 子进程调用片段（事件响应构造与转发）

以下为 `src/main/mqtt.js` 中的关键片段，展示事件记录响应的统一构造与调用导出处理函数。

```javascript
// withResponseCheck：统一失败响应结构
function withResponseCheck(fn) {
  return hex => {
    const buf = Buffer.from(hex.replace(/\s+/g, ''), 'hex');
    if (buf.byteLength === 1) {
      const code = buf.readUInt8(0);
      //  修改：保持与成功响应相同的结构
      return {
        error: true,
        baseConfig: {},     // 空的baseConfig，保持结构一致
        data: {
          code,
          message: ERROR_CODES[code] || '未知错误'
        }
      };
    }
    const res = fn(hex);
    return { error: false, ...res };
  };
}

// 事件记录数据处理器（解析器包装）
const processEventRecordData = withResponseCheck(hex => parseEventRecordRAW(hex));

// 收到消息后构造响应对象并调用处理函数
if (suffix === 'event_record_r') {
  const eventState = getEventReadingState()
  if (eventState.isReadingEvent && eventState.eventReadingBlockId === blockId) {
    // 构建响应数据对象（支持多条记录）
    const responseData = {
      RecordOffset: baseConfig?.RecordOffset,  // 起始偏移量（第一条记录的偏移量）
      RecordCount: baseConfig?.RecordCount,    // 记录数量
      records: result.records || [],           // 多条记录数组
      baseConfig,                              // 基础配置
      data,                                    // 第一条记录的数据
      result: result.error ? { error: true, code: data?.code, message: data?.message } : null,
      rawRegisters: result.rawRegisters,       // 第一条记录的原始寄存器
      rawBuffer: result.rawBuffer             // 第一条记录的原始buffer
    }
    
    // 调用事件记录导出模块的处理函数
    processEventRecordResponse(responseData, blockId, client)
    
    return // 事件记录数据已处理，不再继续常规解析流程
  }
}
```

- 失败响应对齐：错误仅 1 字节时包装为与成功同构的对象，避免调用方分支复杂化。
- `processEventRecordResponse` 所需字段：`RecordOffset/RecordCount/records/baseConfig/data/result/rawRegisters/rawBuffer` 按统一对象传入。
- 条件分发：仅当正在导出且堆 ID 匹配时处理，避免干扰其他业务订阅。

### 渲染端交互与导出触发

以下为 `src/renderer/src/views/Bau/eventRecord/event.vue` 的核心交互代码片段，覆盖事件标志位请求、导出参数计算与确认、取消导出、删除事件记录命令下发，以及导出进度/完成/错误的 IPC 监听。

```javascript
// 请求事件记录标志位数据（每秒）
const requestEventRecordFlag = async () => {
  try {
    const topic = buildTopic('bms/host/s2d/b{block}/event_record_flag_r')
    await window.electronAPI.mqttPublish(topic, 'ff')
  } catch (error) {
    console.error('[EventRecord] 事件记录标志位请求失败:', error)
  }
}

// 标志位结果监听 → 提取 "事件记录存储数量/百分比" 等元素，并补充单位
let eventFlagListener = null
const registerEventFlagListener = () => {
  if (eventFlagListener) {
    window.electron.ipcRenderer.removeListener('EVENT_RECORD_FLAG_R', eventFlagListener)
  }
  eventFlagListener = (_, mqttMessage) => {
    const { blockId, data } = mqttMessage
    const blockInfo = getCurrentBlockInfo()
    if (!blockInfo || blockInfo.blockNumber !== blockId) return
    if (data && Array.isArray(data)) {
      const eventFlagRec = data.find(d => d.class === '事件记录标志位')
      if (eventFlagRec && eventFlagRec.element) {
        eventData.value = eventFlagRec.element.map(item => {
          if (item.unit !== undefined) return item
          let unit = ''
          if (item.label.includes('存储数量')) unit = '条'
          else if (item.label.includes('存储百分比')) unit = '%'
          return { ...item, unit }
        })
      }
    }
  }
  window.electron.ipcRenderer.on('EVENT_RECORD_FLAG_R', eventFlagListener)
}

// 计算导出偏移与可导出性
const storedCount = computed(() => {
  const countItem = eventData.value.find((item) => item.label === '事件记录存储数量')
  return parseInt(countItem?.value) || 0
})
const offsetRead = computed(() => {
  if (flagDownloadAll.value) return 0
  const readCount = parseInt(valueRead.value) || 0
  return Math.max(0, storedCount.value - readCount)
})
const canExport = computed(() => {
  if (storedCount.value === 0) return false
  if (flagDownloadAll.value) return true
  const readCount = parseInt(valueRead.value)
  return Number.isInteger(readCount) && readCount > 0 && readCount <= storedCount.value
})

// 确认导出 → 发送 'start-reading-data-event'
const confirmExport = () => {
  const blockInfo = getCurrentBlockInfo()
  if (!blockInfo) {
    toast.add({ severity: 'error', summary: t('toast.common.executeFailed'), detail: t('toast.remoteControl.selectTargetBlock'), life: 3000 })
    return
  }
  if (!canExport.value) {
    // 根据具体校验提示不同文案
    return
  }
  const offsetReadForSend = flagDownloadAll.value ? 0 : offsetRead.value
  const totalRead = flagDownloadAll.value ? storedCount.value : parseInt(valueRead.value)
  confirm.require({
    message: flagDownloadAll.value ? t('eventTime.confirm.exportAllMessage') : t('eventTime.confirm.exportPartialMessage', { count: totalRead }),
    header: t('eventTime.confirm.exportHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('eventTime.confirm.yes'),
    rejectLabel: t('eventTime.confirm.no'),
    accept: () => {
      exportStore.start(totalRead)
      window.electron.ipcRenderer.send('start-reading-data-event', {
        offsetRead: offsetReadForSend,
        totalRead: totalRead,
        blockId: blockInfo.blockNumber
      })
    }
  })
}

// 取消导出 → 发送 'cancel-export-event'
const cancelExport = () => {
  const blockInfo = getCurrentBlockInfo()
  if (blockInfo) {
    window.electron.ipcRenderer.send('cancel-export-event', { blockId: blockInfo.blockNumber })
  }
  exportStore.cancel()
  toast.add({ severity: 'info', summary: t('toast.common.cancelOperation'), life: 2000 })
}

// 删除事件记录命令（全部或部分）
const confirmDelete = () => {
  const blockInfo = getCurrentBlockInfo()
  if (!blockInfo) return
  if (!flagDeleteAll.value && (!n.value || parseInt(n.value) <= 0)) return
  confirm.require({
    message: flagDeleteAll.value ? t('eventTime.confirm.deleteAllMessage') : t('eventTime.confirm.deletePartialMessage', { count: deleteCount.value }),
    header: t('eventTime.confirm.deleteHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('eventTime.confirm.delete'),
    rejectLabel: t('eventTime.confirm.cancel'),
    accept: async () => {
      try {
        const deleteTopic = `bms/host/s2d/b${blockInfo.blockNumber}/clear_event_record_num`
        const toHexLE = (value) => {
          const low = value & 0xFF
          const high = (value >> 8) & 0xFF
          return low.toString(16).padStart(2, '0') + high.toString(16).padStart(2, '0')
        }
        const deletePayloadHex = flagDeleteAll.value ? toHexLE(0xFFFF) : toHexLE(deleteCount.value)
        await window.electronAPI.mqttPublish(deleteTopic, deletePayloadHex)
      } catch (error) {
        console.error('[EventRecord] 删除事件记录命令发送失败:', error)
      }
    }
  })
}

// 导出进度/完成/取消/错误 IPC 监听
window.electron.ipcRenderer.on('update-readEventProgress', (_, { current, total }) => {
  exportStore.update(current, total)
})
window.electron.ipcRenderer.on('export-completed', (_, data) => {
  exportStore.complete()
})
window.electron.ipcRenderer.on('export-canceled', () => {
  exportStore.fail()
})
window.electron.ipcRenderer.on('readEventErrorFromMain', () => {
  exportStore.fail()
})
```

- 标志位请求：每秒发布 `event_record_flag_r`，渲染端监听 `EVENT_RECORD_FLAG_R` 并补齐单位。
- 参数计算：`storedCount/offsetRead/canExport` 三个 `computed` 保证 UI 有效性校验。
- 确认导出：弹确认框，`exportStore.start(totalRead)` 初始化进度，发送 `start-reading-data-event`。
- 取消导出：发送 `cancel-export-event` 并重置 Store。
- 进度/完成/取消/错误：分别更新 Store 状态以驱动进度条与按钮可用性。

### 主进程 IPC 处理器

以下为 `src/main/index.js` 中与事件导出和目录管理相关的 IPC 处理器完整代码片段，展示从渲染端发起到子进程执行的链路。

```javascript
// 启动事件记录导出
ipcMain.on('start-reading-data-event', (event, { offsetRead, totalRead, blockId }) => {
  const mqttTask = processManager.getMQTTTask()
  if (!mqttTask || mqttTask.killed) {
    mainWindow.webContents.send('readEventErrorFromMain', { blockId, error: 'MQTT进程未运行' })
    return
  }
  const saveDir = DEFAULT_EXPORT_DIR
  event.sender.send('export-started', saveDir)
  mqttTask.send({ cmd: 'START_READ_EVENT', offsetRead, totalRead, blockId, exportDir: saveDir })
})

// 取消事件记录导出
ipcMain.on('cancel-export-event', (event, { blockId }) => {
  const mqttTask = processManager.getMQTTTask()
  if (mqttTask && !mqttTask.killed) {
    mqttTask.send({ cmd: 'CANCEL_READ_EVENT', blockId })
  }
})

// 导出目录管理
ipcMain.handle('get-default-export-dir', () => DEFAULT_EXPORT_DIR)
ipcMain.handle('choose-default-export-dir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], defaultPath: DEFAULT_EXPORT_DIR })
  return canceled ? null : filePaths[0]
})
ipcMain.on('set-default-export-dir', (event, dir) => {
  DEFAULT_EXPORT_DIR = dir
  const isRoot = parse(dir).root === dir
  if (!isRoot) {
    try {
      const fs = require('fs')
      fs.mkdirSync(DEFAULT_EXPORT_DIR, { recursive: true })
    } catch (err) {
      if (err.code !== 'EPERM') throw err
    }
  }
  event.sender.send('export-dir-updated', dir)
})
```

- `'start-reading-data-event'`：确认子进程存在后以默认目录 `DEFAULT_EXPORT_DIR` 通知渲染端 `export-started` 并下发子进程命令。
- `'cancel-export-event'`：下发取消命令给子进程，渲染端由进度/完成监听作 UI 收敛。
- 目录管理：提供获取/选择/设置默认导出目录的 IPC 接口，设置时尝试创建目录并回发 `export-dir-updated`。

### 导出状态 Store

以下为 `src/renderer/src/stores/eventStore.js` 的完整实现，用于在导出过程中显示进度与控制按钮状态。

```javascript
import { defineStore } from 'pinia'
export const useEventStore = defineStore('event', {
  state: () => ({ isExporting: false, current: 0, total: 0 }),
  getters: { percent: (state) => { if (state.total === 0) return 0; return Math.floor((state.current / state.total) * 100) } },
  actions: {
    start(totalCount) { this.isExporting = true; this.current = 0; this.total = totalCount },
    update(currentIndex, totalCount = null) { this.current = currentIndex; if (totalCount !== null) { this.total = totalCount } if (this.current >= this.total && this.total > 0) { this.complete() } },
    complete() { this.isExporting = false },
    cancel() { this.isExporting = false; this.current = 0; this.total = 0 },
    fail() { this.isExporting = false; this.current = 0; this.total = 0 }
  }
})
```

- `percent` 计算：用于进度条显示，空总数保护返回 0。
- `start/update/complete/cancel/fail`：导出生命周期动作，串联 UI 与 IPC 回调。

---

## 数据流总结（端到端）

- 渲染端按选中堆计算 `offsetRead` 与 `totalRead`，发送 `start-reading-data-event`。
- 主进程接收并转发到子进程 `mqtt.js` 为 `START_READ_EVENT` 指令，携带保存目录与读取参数。
- 子进程在 `mqtt.js` 中根据订阅到的 `event_record_r` 消息，将解析结果包装为 `responseData` 交由 `eventRecordExport.js` 处理。
- `eventRecordExport.js` 建立等待器 Map，按 `RecordOffset` 精确匹配响应并缓存记录，完成后生成 CSV：
  - 表头根据 `EVENT_RECORD_R` 动态构建，时间字段合并为 `Timestamp`。
  - 簇汇总模拟量三级告警按严重程度分组合并，硬件故障按类别合并。
  - 每行末尾追加 `CRC校验` 用 `validateEventRecordCRC` 校验。
- 原始报文记录由 `mqttRawLogger.js` 在入/出站路径统一落盘，支持 BOM、轮转与压缩。
- 语义数据采集在 `ingest.js` 侧按 BMU 聚合并使用 `bauDataExport.js` 定时落盘至 `RUN_EXPORT_DIR`。
- 渲染端通过 `eventStore` 实时显示导出进度，并在完成/取消/错误时提示。
### 入/出站报文日志调用点

以下为 `src/main/mqtt.js` 中对原始报文记录的调用片段：

```javascript
// 入站（设备→上位机）
if (rawExportEnabled) {
  logAnyMessage({ topic, payloadHex: hex, clientId: cid, ts: Date.now(), direction })
}

// 出站（上位机→设备）
logAnyMessage({ topic, payloadHex: payloadHex, clientId: cid, ts: Date.now(), direction: 's2d' })
```

- 入站过滤：按开关 `rawExportEnabled` 决定是否记录大量入站报文，避免产生过多日志。
- 出站始终记录：用于复盘设备控制命令与响应的对应关系。

---

## 使用与扩展建议

- 并发参数调整：设备处理能力或网络状况变化时，可在 `startReadingEvent` 内调整 `MAX_RECORDS_PER_REQUEST` 与 `SEND_INTERVAL_MS`。
- CSV 列合并策略：如需新增合并类别，在 `mergeableClasses` 与对应 Map 中按现有模式扩展即可。
- 语义落盘定时器周期：当前为 `2000ms`，如需更实时或更低频写入，可调整 `startSaveTimerSemantic` 的间隔。
- 原始报文日志：若希望按主题拆分文件或增加更多字段（如 QoS、Retain），可在 `mqttRawLogger.js` 中扩展表头与行构造逻辑。

---

## 校验清单

- CRC 校验：对每行事件记录使用 `validateEventRecordCRC`，确保数据完整性；出现“无效”时可对比 `rawRegisters[127]` 与计算值。
- 长度一致性：`parseEventRecordRAW` 内部已对总长度与每条记录长度进行校验与告警日志输出。
- 进度与完成：通过 `childBridge` 的 IPC 转发在渲染端显示进度条与成功/部分成功状态。
- 文件占用：语义落盘追加写入采用重试与用户确认机制，避免误失败；事件 CSV 采用写流一次性生成，通常不会触发占用重试。

---

本节完整代码与说明使得事件记录导出与报文/语义存储的端到端流程与实现细节均一目了然，可作为开发与排查的权威参考。若后续协议字段新增或表结构调整，建议同步更新本文件对应代码片段以保持“文档即代码”的一致性。

