# BAU 上位机：Raw 原始报文导出导致 IPC 背压 / RSS 暴涨问题排查总结

## 1. 背景与系统结构

项目形态：Electron + Vue（渲染进程 UI）+ 主进程（Electron main）+ MQTT 子进程（Node child process）。

核心数据链路（简化）：

1. MQTT 子进程连接 Broker，订阅大量 Topic。
2. 子进程收到消息后：
   - 解析 payload（转 hex 并解析为业务结构）
   - 通过 `process.send()` 将结构化数据推送给主进程/渲染进程显示
   - （可选）语义数据导出：缓存 latest，并由定时器刷盘 CSV
   - （可选）原始报文导出（Raw）：将 `topic + payloadHex + 时间 + 方向` 追加写入 Raw CSV
3. UI 顶部有“存储使能”开关：`enableSemantic` / `enableRaw`，通过 IPC 控制子进程导出开关。

## 2. 问题现象（用户侧观测）

在“开启原始报文导出（Raw）”且数据量较大（多簇、多 Topic 高频）时，出现：

- 上位机运行一段时间后，内存（以 child 的 `rssMB` 为主）持续上涨，出现阶跃式暴涨至 800MB / 1.4GB / 1.6GB 等级。
- UI 体感卡顿、甚至崩溃；MQTT 连接出现不稳定（重连、离线等）。
- 即使某些业务数据仍能“看起来是最新”（例如遥调读取、簇参数读取），也不能反证系统没有拥塞。

在“关闭 Raw 原始报文导出”后：

- 两台电脑 overnight 运行（整晚）均稳定：rssMB 正常、程序不崩溃、通信流畅。

## 3. 需求与约束（本次讨论明确的目标）

### 3.1 用户最终目标

- **长期稳定运行**
- **通信始终正常**
- **Raw 原始报文必须全量写入 CSV，并且随时可查看 CSV 来复盘问题**

### 3.2 明确约束

- 不接受“暂停/减速接收”（不希望通过 `pause/resume` 等方式把压力推回上游）
- MQTT 协议先不考虑可靠性增强：默认 QoS0（不讨论 QoS1/2 的端到端补齐能力）

> 注：在纯工程物理约束上，“全量不丢 + 不暂停/不降速 + 长期稳定”成立的必要条件是：原始数据产生速率 ≤ 系统可持续落盘速率（磁盘吞吐 + 代码实现开销）。若长期/峰值超过写盘能力，数据只能在内存/OS 缓冲/上游排队，最终会出现延迟、丢失、或内存上涨等问题，只是爆点位置不同。

## 4. 我们新增/使用的诊断日志（子进程打印）

以下日志均以 `[ChildLog]` 前缀输出，集中用于判断：事件循环是否被阻塞、raw/semantic 是否堆积、IPC 是否背压、RSS 是否异常。

### 4.1 `mem-sample`

定期采样（约每 30 秒），输出：

- `rssMB/heapUsedMB/heapTotalMB/externalMB`
- `semantic`：语义导出缓存与刷盘耗时（csvBufferBytesApprox、flush.lastMs/maxMsRecent 等）
- `rawWrite`：raw 写盘统计（pendingJobs/pendingBytesApprox/lastJobMs/maxQueueDelayMsRecent 等）
- `eventExport`：事件记录导出状态

意义：

- **rssMB**：进程驻留集（含 native 内存），是本问题最关键的“爆涨”观测指标。
- **rawWrite.pendingJobs / lastQueueDelayMs / maxQueueDelayMsRecent**：raw 写盘是否堆积、排队是否变长，是判断“写盘跟不上”最直接的指标。

### 4.2 `ipc-send-stats`

约每 5 秒统计一次 IPC 发送窗口：

- `attempts`：窗口内 `process.send` 次数
- `falseCount/falsePct`：`process.send()` 返回 false 的次数/比例（背压信号）
- `payloadKBps`：窗口内累计 payload 大小折算的吞吐（仅用于趋势）
- `backlog`：轻量快照，含 `ipcLastDrainMs/rawPendingJobs/csvBufferBytesApprox` 等

意义：

- `falsePct` 高说明 IPC 写缓冲经常“忙/满”，但不等于完全堵死。
- **当出现 `falsePct` 长期接近 100%，且 `ipcLastDrainMs` 长期 null**，通常意味着进入失控态（队列无法消化）。

### 4.3 `ipc-backpressure`

当 `process.send()` 返回 false 时，冷却后打印一条包含：

- `suffix/len/sendMs`
- 当前 `rssMB/heapUsedMB`
- `backlog`（含 raw/semantic/IPC 状态）

意义：

- 用于定位“哪个 Topic 后缀在高压下频繁触发背压”。

### 4.4 `event-loop-lag` 与 `lag-detail`

每秒 tick 监控事件循环延迟：

- `delayMs`：tick 延迟，>200ms 记录，>1000ms 记录详细快照 `lag-detail`

意义：

- **当 delayMs 进入秒级/十秒级时，说明子进程事件循环被严重阻塞**（通常来自同步 IO/大量 GC/过重计算/系统调用），这是从“轻度拥塞”走向“失控”最可靠的预警信号之一。

## 5. 关键日志样本与结论（A/B 对比）

### 5.1 关闭 Raw 后 overnight 稳定（强对比证据）

日志：

- `src/main/mqtt-child-20260114_15_24_12.log`
- `src/main/mqtt-child-20260114_17_39_26.log`

共同特征：

- `mem-sample.rawWrite.totalWriteCount = 0`，`pendingJobs = 0`（Raw 写盘完全未发生）
- `rssMB` 长期稳定在 ~100–150MB（不同机器略有差异），无 800MB/1.4GB 阶跃暴涨
- `event-loop-lag` 极少且仅 200–700ms 级别，没有十秒级卡顿
- `ipc-send-stats.falsePct` 仍存在（30–60% 常见），但没有出现 90–100% 长期失控窗口

结论：

- **关闭 Raw 后系统可长期稳定运行**，说明 Raw 导出链路是触发/放大失控态的关键条件之一。

### 5.2 开启 Raw 时的典型失控链路（历史故障日志总结）

在历史故障窗口（开启 Raw、数据量高）中，观察到典型组合：

1. `rawWrite.pendingJobs/pendingBytesApprox` 快速增长，`rawLastQueueDelayMs/maxQueueDelayMsRecent` 进入秒级/十秒级
2. `event-loop-lag` 进入秒级/十秒级（甚至几十秒）
3. IPC `falsePct` 逐渐推高到 100%（或长期高位），`ipcLastDrainMs` 长期缺失
4. `rssMB` 阶跃式暴涨（主要是 native 内存占用，heapUsed 未必同比例增长）
5. MQTT 连接质量下降，出现 reconnect/offline 等

结论：

- **主因更符合：Raw CSV 写盘链路堆积/阻塞导致子进程事件循环不可用 → IPC 背压失控 → RSS 暴涨。**
- 渲染/主进程消费能力不足会放大背压，但从日志组合看更像“次因/阈值因素”，不是触发链路的起点。


## 7. 现阶段已做的改动（用于稳定性验证）

### 7.1 存储使能默认策略

目标：每次启动默认只开启语义数据存储（semantic），Raw 默认关闭，且不持久化到 localStorage。

实现位置：

- `src/renderer/src/layout/AppTopbar.vue`：`storageEnabled` 默认 `['semantic']`，并移除了 localStorage 读写（watch 中不再 `setItem`）。

这保证：

- 每次重启上位机都不会因为旧 localStorage 导致 raw 自动开启
- 用户当次手动勾选 raw 仅影响当次运行，重启恢复默认（semantic 开、raw 关）

## 8. 关键代码路径（用于外部 AI/同事快速定位）

### 8.1 Raw 原始报文导出（当前 BAU 实现）

- Raw 触发点：`src/main/mqtt.js`（MQTT message handler 中，rawExportEnabled 为 true 时调用 `logAnyMessage`）
- Raw 写盘实现：`src/main/mqttExport/mqttRawLogger.js`
  - 采用 `writeChain = writeChain.then(job)` 串行 Promise 链排队
  - 每条消息都会 enqueue 一个 job
  - 包含目录确保、轮转、gzip 压缩、磁盘空间检查、CSV 追加写入
  - 诊断字段：`pendingJobs/pendingBytesApprox/lastQueueDelayMs/maxQueueDelayMsRecent/lastJobMs/maxJobMsRecent`

### 8.2 IPC 发送与背压诊断（child → main/renderer）

- `src/main/mqtt.js` 中所有解析后的消息通过 `process.send({ type, data: msg })` 推送
- `ipc-send-stats` 与 `ipc-backpressure` 的统计/打印也在 `src/main/mqtt.js`

### 8.3 语义数据导出（非 Raw）

- 入口：`src/main/mqttExport/ingest.js`（cache latest）
- 写盘：`src/main/mqttExport/bauDataExport.js`（定时器刷盘）

### 8.4 主进程转发“存储使能”到 child

- `src/main/index.js`：监听 `set-export-config`，转发 `cmd:'SET_EXPORT_ENABLE'` 给 mqtt 子进程

## 9. BCU 参考工程（src_HSBCU_1121）中可借鉴点

BCU 参考实现对“原始报文导出”做了以下关键优化（但 BCU 会丢数据以防内存炸）：

- 在 socket 拦截处用 `setImmediate` 避免阻塞当前收发回调
- 按 IP 分队列，达到阈值批量刷盘
- 设置 `MAX_QUEUE_SIZE`，超限丢弃最旧数据，避免内存无限增长

相关路径（参考工程）：

- `src_HSBCU_1121/modbus/client/modbusClient.js`
- `src_HSBCU_1121/modbus/dataExport/rowBufferExport.js`
- `src_HSBCU_1121/BCU_事件记录存储实现.md`（对实现做了文档化说明）

## 10. 当前结论与后续推荐方向（供外部 AI 二次分析）

### 10.1 当前最可靠结论

- Raw CSV 导出链路（在 mqtt 子进程事件循环内串行排队写盘）是触发/放大失控态的关键因素。
- 失控态典型特征：raw 写盘堆积（pendingJobs/queueDelay）、event-loop-lag 秒级、IPC falsePct 长期高/100%、RSS 阶跃暴涨。
- 关闭 Raw 后 overnight 稳定，证实 Raw 是关键条件。

### 10.2 与用户需求的矛盾点（必须明确）

用户要求：

- 全量 raw 写 CSV（可随时查看）
- 通信始终正常
- 不允许暂停/减速接收
- QoS0

工程事实：

- 若存在任何时间窗口：raw 数据产生速率 > 可持续落盘速率，则在“不丢 + 不降速”的约束下，系统只能通过“内存/OS 缓冲堆积”来吸收差额，最终仍会出现 RSS 上涨或其他形式的失控。

### 10.3 推荐的解决思路（满足“尽量全量 + 通信不被 raw 拖死”）

1. **raw 写盘与 mqtt child 解耦**
   - 建议独立 raw-recorder 进程专门写 CSV，mqtt child 只负责解析与 IPC。
   - raw 数据可由 mqtt child 复制转发给 raw-recorder（保证与 UI 接收一致），或 raw-recorder 自己作为第二客户端订阅（会重复连接）。

2. **Raw 写盘改为批量写（短周期 flush）**
   - 仍然输出 CSV、仍然可随时查看，但将“每条 append”改为“例如 100–200ms 或 1–4MB 批量 flush”
   - 大幅减少系统调用次数与 JS 字符串分配/GC 抖动，显著降低 event-loop-lag 风险

3. **避免同步目录检查/压缩阻塞热路径**
   - 目录创建/文件打开应在启用 raw 时一次性完成
   - gzip 压缩应移至后台/离线，不应与高频写盘同一路径抢资源

> 注：在严格“全量 + QoS0 + 不降速”的要求下，最终仍需靠“把落盘吞吐做大”覆盖峰值（更快磁盘/独立盘/更少膨胀/更少开销）。否则系统无法在理论上保证永不堆积。

## 11. 关键代码片段（用于快速复核）

本节直接粘贴关键代码（而不是仅写路径），便于外部 AI 在无代码库上下文时直接分析。

### 11.1 MQTT 子进程：IPC 背压统计与 backlog 快照（新增诊断）

文件：`src/main/mqtt.js`

```js
const DIAG_COOLDOWN_MS = 10_000
const SLOW_MESSAGE_THRESHOLD_MS = 200
let lastSlowMessageTs = 0
let lastIpcBackpressureTs = 0
let ipcSendReturnFalseCount = 0
let lastIpcSendReturnFalseTs = 0
let lastIpcDrainTs = 0
let ipcDiagHooked = false
let ipcSendAttemptCountWin = 0
let ipcSendFalseCountWin = 0
let ipcSendPayloadBytesWin = 0
let lastIpcSendStatsTs = 0
let lastIpcDrainLogTs = 0
const IPC_SEND_STATS_INTERVAL_MS = 5000

function maybeLogIpcSendStats(now) {
  if (!lastIpcSendStatsTs) lastIpcSendStatsTs = now
  const elapsedMs = now - lastIpcSendStatsTs
  if (elapsedMs < IPC_SEND_STATS_INTERVAL_MS) return
  const attempts = ipcSendAttemptCountWin
  const falseCount = ipcSendFalseCountWin
  const bytes = ipcSendPayloadBytesWin
  ipcSendAttemptCountWin = 0
  ipcSendFalseCountWin = 0
  ipcSendPayloadBytesWin = 0
  lastIpcSendStatsTs = now
  try {
    const mu = process.memoryUsage()
    const toMB = (n) => Number((Number(n || 0) / (1024 * 1024)).toFixed(1))
    const ipcBufferSize =
      process && process.channel && typeof process.channel.bufferSize === 'number'
        ? process.channel.bufferSize
        : null
    const falsePct = attempts ? Number(((falseCount / attempts) * 100).toFixed(2)) : 0
    const kbps = elapsedMs ? Number(((bytes / 1024) * (1000 / elapsedMs)).toFixed(2)) : 0
    console.log(
      `[ChildLog] ipc-send-stats ${JSON.stringify({
        intervalMs: elapsedMs,
        attempts,
        falseCount,
        falsePct,
        payloadKBps: kbps,
        ipcBufferSize,
        rssMB: toMB(mu.rss),
        heapUsedMB: toMB(mu.heapUsed),
        externalMB: toMB(mu.external),
        backlog: getBacklogLite()
      })}`
    )
  } catch {}
}

function ensureIpcDiagHooks() {
  if (ipcDiagHooked) return
  ipcDiagHooked = true
  try {
    const ch = process && process.channel
    if (ch && typeof ch.on === 'function') {
      ch.on('drain', () => {
        const now = Date.now()
        lastIpcDrainTs = now
        if (!lastIpcDrainLogTs || now - lastIpcDrainLogTs > IPC_SEND_STATS_INTERVAL_MS) {
          lastIpcDrainLogTs = now
          try {
            const mu = process.memoryUsage()
            const toMB = (n) => Number((Number(n || 0) / (1024 * 1024)).toFixed(1))
            const ipcBufferSize =
              process && process.channel && typeof process.channel.bufferSize === 'number'
                ? process.channel.bufferSize
                : null
            console.log(
              `[ChildLog] ipc-drain ${JSON.stringify({
                ipcBufferSize,
                rssMB: toMB(mu.rss),
                heapUsedMB: toMB(mu.heapUsed),
                externalMB: toMB(mu.external),
                backlog: getBacklogLite()
              })}`
            )
          } catch {}
        }
      })
    }
  } catch {}
}

function getBacklogLite() {
  const now = Date.now()
  try {
    ensureIpcDiagHooks()
  } catch {}
  let raw = null
  try {
    raw = getRawWriteStats()
  } catch {}
  let semantic = null
  try {
    semantic = getSemanticExportStats()
  } catch {}
  let socketReadable = null
  let socketWritable = null
  try {
    const stream = client && client.stream
    socketReadable = stream && typeof stream.readableLength === 'number' ? stream.readableLength : null
    socketWritable = stream && typeof stream.writableLength === 'number' ? stream.writableLength : null
  } catch {}
  return {
    sinceLastMsgMs: lastMessageReceived ? now - lastMessageReceived : null,
    handlerRegisteredCount: messageHandlerRegisteredCount,
    parseErrorCount,
    rateAccBytes: dataRateAccumulator,
    ipcConnected: typeof process?.connected === 'boolean' ? process.connected : null,
    ipcBufferSize:
      process && process.channel && typeof process.channel.bufferSize === 'number'
        ? process.channel.bufferSize
        : null,
    ipcSendReturnFalseCount,
    ipcLastSendFalseMs: lastIpcSendReturnFalseTs ? now - lastIpcSendReturnFalseTs : null,
    ipcLastDrainMs: lastIpcDrainTs ? now - lastIpcDrainTs : null,
    rawPendingJobs: raw && typeof raw.pendingJobs === 'number' ? raw.pendingJobs : null,
    rawPendingBytesApprox:
      raw && typeof raw.pendingBytesApprox === 'number' ? raw.pendingBytesApprox : null,
    rawLastJobMs: raw && typeof raw.lastJobMs === 'number' ? raw.lastJobMs : null,
    rawLastQueueDelayMs:
      raw && typeof raw.lastQueueDelayMs === 'number' ? raw.lastQueueDelayMs : null,
    csvBufferBytesApprox:
      semantic && typeof semantic.csvBufferBytesApprox === 'number'
        ? semantic.csvBufferBytesApprox
        : null,
    socketReadable,
    socketWritable
  }
}
```

### 11.2 MQTT 子进程：事件循环延迟与内存采样（新增诊断）

文件：`src/main/mqtt.js`

```js
function startEventLoopLagMonitor() {
  if (eventLoopLagTimer) return
  lastEventLoopTick = Date.now()
  eventLoopLagTimer = setInterval(() => {
    const now = Date.now()
    const delay = now - lastEventLoopTick - 1000
    lastEventLoopTick = now
    if (delay > 200) {
      try {
        const mu = process.memoryUsage()
        const toMB = (n) => Number((Number(n || 0) / (1024 * 1024)).toFixed(1))
        const backlog = getBacklogLite()
        console.log(
          `[ChildLog] event-loop-lag ${JSON.stringify({
            delayMs: delay,
            rssMB: toMB(mu.rss),
            heapUsedMB: toMB(mu.heapUsed),
            externalMB: toMB(mu.external),
            ...backlog
          })}`
        )
        if (delay > 1000) {
          const cooldownMs = 10_000
          if (!lastLagDetailTs || now - lastLagDetailTs > cooldownMs) {
            lastLagDetailTs = now
            console.log(
              `[ChildLog] lag-detail ${JSON.stringify({
                delayMs: delay,
                rssMB: toMB(mu.rss),
                heapUsedMB: toMB(mu.heapUsed),
                externalMB: toMB(mu.external),
                backlog,
                detail: getLagDetailSnapshot()
              })}`
            )
          }
        }
      } catch {}
    }
  }, 1000)
}

function startMemorySampling() {
  if (memSampleTimer) return
  memSampleTimer = setInterval(() => {
    try {
      const mu = process.memoryUsage()
      const toMB = (n) => Number((Number(n || 0) / (1024 * 1024)).toFixed(1))
      let semantic = null
      let eventStats = null
      let system = null
      try {
        semantic = getSemanticExportStats()
      } catch {}
      try {
        eventStats = getEventExportStats()
      } catch {}
      let rawWrite = null
      try {
        rawWrite = getRawWriteStats()
      } catch {}
      let handles = null
      try {
        const activeHandles = process._getActiveHandles ? process._getActiveHandles() : null
        const activeRequests = process._getActiveRequests ? process._getActiveRequests() : null
        handles = {
          activeHandles:
            activeHandles && Array.isArray(activeHandles) ? activeHandles.length : null,
          activeRequests:
            activeRequests && Array.isArray(activeRequests) ? activeRequests.length : null
        }
      } catch {}
      const payload = {
        rssMB: toMB(mu.rss),
        heapUsedMB: toMB(mu.heapUsed),
        heapTotalMB: toMB(mu.heapTotal),
        externalMB: toMB(mu.external),
        system,
        semantic,
        eventExport: eventStats,
        rawWrite,
        handles
      }
      console.log(`[ChildLog] mem-sample ${JSON.stringify(payload)}`)
    } catch {}
  }, 30000)
}
```

### 11.3 MQTT 子进程：原始报文导出触发点（rawExportEnabled）与 IPC 统计更新

文件：`src/main/mqtt.js`

```js
messageHandlerRef = (topic, payload) => {
  if (!isConnected || !client) {
    return
  }
  const parts = topic.split('/')
  const suffix = parts.at(-1)
  const blockId = Number(parts[3].slice(1))

  let clusterId = 0
  if (parts.length > 4 && parts[4].startsWith('c')) {
    clusterId = Number(parts[4].slice(1))
  }

  const buf = payload
  const len = buf.length
  const hex = buf.toString('hex')
  const direction = parts[2] || ''
  const cid = `${blockId}-${clusterId || 0}`

  try {
    if (rawExportEnabled) {
      logAnyMessage({ topic, payloadHex: hex, clientId: cid, ts: Date.now(), direction })
    }
  } catch {}

  dataRateAccumulator += len

  const parseFun = TOPIC_TABLE_MAP[suffix]
  if (!parseFun) return

  // ... parseFun(hex) → result → msg ...

  let sendOk = null
  try {
    sendOk = process.send({ type: msg.dataType, data: msg })
  } catch {}

  try {
    const now = Date.now()
    ipcSendAttemptCountWin += 1
    ipcSendPayloadBytesWin += len
    if (sendOk === false) {
      ipcSendFalseCountWin += 1
    }
    maybeLogIpcSendStats(now)
  } catch {}
}
```

### 11.4 Raw 写盘实现（当前 BAU 实现：每条消息 enqueue 一个写盘 job）

文件：`src/main/mqttExport/mqttRawLogger.js`

```js
import fs from 'fs'
import path from 'path'
import {
  appendFileWithRetry,
  ensureDir,
  compressFileGzip,
  formatDateTime,
  getCachedFreeDiskSpace
} from './utils'
import { RAW_EXPORT_DIR, SESSION_SUFFIX } from './paths'

const RAW_HEADER = ['ID', '时间', '方向', '主题', '设备', 'PayloadHex'].join(',')

let globalIdCounter = 0
const FILE_SIZE_LIMIT = 500 * 1024 * 1024
const MIN_FREE_SPACE = parseInt(process.env.MIN_FREE_SPACE || String(5 * 1024 * 1024 * 1024), 10)
const DISK_WARNING_COOLDOWN_MS = parseInt(process.env.DISK_WARNING_COOLDOWN_MS || '10000', 10)
let lastDiskWarningTs = 0
let bypassLowDiskCheck = false
let totalWriteCount = 0
let lastWriteMeta = null
const rotatingFiles = new Set()
let pendingJobs = 0
let pendingBytesApprox = 0
let lastJobMs = 0
let maxJobMsRecent = 0
let maxJobMsTs = 0
let lastQueueDelayMs = 0
let maxQueueDelayMsRecent = 0
let maxQueueDelayMsTs = 0
let headerInitPromise = null
let headerInitPath = ''
let writeChain = Promise.resolve()
let currentFileSuffix = SESSION_SUFFIX

function getDir() {
  const dir = RAW_EXPORT_DIR
  ensureDir(dir)
  return dir
}
function getFile() {
  return path.join(getDir(), `Raw_Messages_${currentFileSuffix}.csv`)
}

async function rotateIfNeeded(p) {
  try {
    const s = await fs.promises.stat(p)
    if (s.size >= FILE_SIZE_LIMIT) {
      if (rotatingFiles.has(p)) return
      rotatingFiles.add(p)
      const oldPath = p
      currentFileSuffix = (function () {
        const d = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
          d.getHours()
        )}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`
      })()
      headerInitPromise = null
      headerInitPath = ''
      compressFileGzip(oldPath)
        .then(() => rotatingFiles.delete(oldPath))
        .catch(() => rotatingFiles.delete(oldPath))
    }
  } catch {}
}

async function ensureGlobalHeader(p) {
  if (headerInitPromise && headerInitPath === p) return headerInitPromise
  headerInitPath = p
  headerInitPromise = (async () => {
    const st = await fs.promises.stat(p).catch(() => null)
    if (!st || st.size === 0) {
      await appendFileWithRetry(p, '\uFEFF' + RAW_HEADER + '\r\n')
    }
  })()
  return headerInitPromise
}

function estimateRowBytes(topic, payloadHex) {
  return String(topic || '').length + String(payloadHex || '').length + 64
}

export function getRawWriteStats() {
  return {
    totalWriteCount,
    lastWrite: lastWriteMeta,
    pendingJobs,
    pendingBytesApprox,
    rotatingFilesCount: rotatingFiles.size,
    lastJobMs,
    maxJobMsRecent,
    lastQueueDelayMs,
    maxQueueDelayMsRecent
  }
}

export async function logAnyMessage({ topic, payloadHex, clientId, ts, direction }) {
  let p = getFile()
  const enqueuedAt = Date.now()
  const approxBytes = estimateRowBytes(topic, payloadHex)
  pendingJobs += 1
  pendingBytesApprox += approxBytes
  const job = async () => {
    const startedAt = Date.now()
    const queueDelayMs = startedAt - enqueuedAt
    lastQueueDelayMs = queueDelayMs
    const free = await getCachedFreeDiskSpace(getDir())
    if (free < MIN_FREE_SPACE && !bypassLowDiskCheck) {
      const nowTs = Date.now()
      if (nowTs - lastDiskWarningTs > DISK_WARNING_COOLDOWN_MS) {
        try {
          if (process.connected) {
            process.send({ API: 'disk-space-warning' })
          }
        } catch {}
        lastDiskWarningTs = nowTs
      }
      return
    }
    try {
      await rotateIfNeeded(p)
      p = getFile()
      await ensureGlobalHeader(p)
      const idVal = ++globalIdCounter
      const tstr = formatDateTime(new Date(ts))
      const payloadText = '"' + '0x' + String(payloadHex).toUpperCase().replace(/"/g, '""') + '"'
      const row =
        [idVal, tstr, String(direction || ''), String(topic || ''), String(clientId || ''), payloadText].join(',') +
        '\r\n'
      totalWriteCount += 1
      lastWriteMeta = { path: p, id: idVal, bytes: row.length, ts: Date.now() }
      await appendFileWithRetry(p, row)
    } finally {
      const endedAt = Date.now()
      const jobMs = endedAt - startedAt
      lastJobMs = jobMs
      const resetWindow = !maxJobMsTs || endedAt - maxJobMsTs > 10 * 60 * 1000
      if (resetWindow) {
        maxJobMsRecent = jobMs
        maxJobMsTs = endedAt
      } else if (jobMs > maxJobMsRecent) {
        maxJobMsRecent = jobMs
        maxJobMsTs = endedAt
      }
      pendingJobs -= 1
      pendingBytesApprox -= approxBytes
      if (pendingJobs < 0) pendingJobs = 0
      if (pendingBytesApprox < 0) pendingBytesApprox = 0
    }
  }
  await (writeChain = writeChain.then(job))
}
```

### 11.5 UI 存储使能：默认仅 semantic，且不再持久化 localStorage

文件：`src/renderer/src/layout/AppTopbar.vue`

```js
const storageEnabled = ref(['semantic'])
function sendExportConfig() {
  const semantic = storageEnabled.value.includes('semantic')
  const raw = storageEnabled.value.includes('raw')
  window.electron?.ipcRenderer?.send('set-export-config', { semantic, raw })
}
watch(storageEnabled, () => {
  sendExportConfig()
})
```

### 11.6 主进程：把 UI 的存储使能转发给 MQTT 子进程

文件：`src/main/index.js`

```js
ipcMain.on('set-export-config', (_event, { semantic, raw }) => {
  const mqttTask = processManager.getMQTTTask()
  if (mqttTask && !mqttTask.killed) {
    mqttTask.send({ cmd: 'SET_EXPORT_ENABLE', semantic, raw })
  }
})
```

## 12. 如何量化“数据产生速率”与“可持续落盘速率”

### 12.1 我们能否 100% 确认“产生速率 > 可持续落盘速率”？

仅凭“结论性文字”无法直接百分百给出严格数学证明，但在故障窗口里出现以下组合时，可以非常高置信度判断“写盘端吞吐落后于输入端”：

1. `rawWrite.pendingJobs` 与 `rawWrite.pendingBytesApprox` 在持续增长（而非偶发尖峰后回落）
2. `rawWrite.lastQueueDelayMs/maxQueueDelayMsRecent` 持续抬升到秒级/十秒级
3. 同时出现 `event-loop-lag` 秒级与 IPC `falsePct` 长期高/100%

要得到“具体数值”（产生速率是多少、落盘速率是多少），需要做一次可复现的测量/计算。下面给出两种方式：仅用现有日志计算（推荐）与直接测文件增长（更直观）。

### 12.2 用现有日志计算速率（推荐：不改代码也能算）

#### A) 产生速率（Raw 需要写入的 CSV 字节/秒）

从 `[ChildLog] ipc-send-stats` 拿两个量：

- `payloadKBps`：MQTT payload 原始字节吞吐（KB/s）
- `attempts/intervalMs`：窗口内消息次数（可近似为每秒消息条数）

然后估算 Raw CSV 行的平均字节数：

- payload 从二进制转 hex：长度约变为 `2 * payloadBytes`
- 额外开销（CSV 字段、topic、时间、引号、逗号、换行等）：记为 `overheadBytes`（经验值通常 80–200 bytes/条，topic 越长越大）

估算公式：

```text
payloadBytesPerSec ≈ payloadKBps * 1024
msgPerSec ≈ attempts / (intervalMs / 1000)
rawBytesPerSec_produce ≈ payloadBytesPerSec * 2 + msgPerSec * overheadBytes
```

#### B) 可持续落盘速率（Raw 实际写入字节/秒）

从 `[ChildLog] mem-sample` 的 `rawWrite` 拿：

- `totalWriteCount`：累计写入行数
- `lastWrite.bytes`：最近一次写入行长度（近似每行字节数）

`mem-sample` 固定 30 秒一次，你可以在同一份日志里取相邻两条 `mem-sample`：

```text
deltaRows = totalWriteCount(t2) - totalWriteCount(t1)
sec = (t2 - t1) / 1000
rowsPerSec_consume ≈ deltaRows / sec
avgRowBytes ≈ lastWrite.bytes（或对多条取平均）
rawBytesPerSec_consume ≈ rowsPerSec_consume * avgRowBytes
```

对比：

- 若 `rawBytesPerSec_produce > rawBytesPerSec_consume`，并且 `pendingJobs/pendingBytesApprox` 同时在增长，则可以确认“写盘吞吐跟不上输入”。

### 12.3 直接测 Raw CSV 文件增长（最直观）

在 Raw 开启时，对当前 `Raw_Messages_*.csv` 每隔 10 秒记录一次文件大小（字节），计算差分：

```text
rawBytesPerSec_consume ≈ (size2 - size1) / (t2 - t1)
```

该方法的优点是完全不依赖代码统计字段；缺点是需要你知道当前写入的文件路径（Raw_Messages_*）。

### 12.4 建议输出给外部 AI 的“速率测量结果模板”

建议你最终在文档/提问中补充如下 6 个数字（用同一时间窗口统计）：

1. mqtt `payloadKBps`（来自 ipc-send-stats）
2. mqtt `attempts`、`intervalMs`（来自 ipc-send-stats）
3. `rawWrite.totalWriteCount(t1/t2)`（来自 mem-sample）
4. `rawWrite.lastWrite.bytes`（来自 mem-sample）
5. `rawWrite.pendingJobs/pendingBytesApprox` 的趋势（增长/回落）
6. Raw CSV 文件大小增长速率（可选，但最直观）
