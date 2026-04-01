# BAU 多设备接入（aX设备号）协议改造设计说明

## 背景与目标
- 实际生产环境中，一个 MQTT 服务器（如 11.200）可能同时接入多台 BAU 设备。
- 现有 Topic 仅包含堆号（bM）、簇号（cN）与数据类型后缀，无法区分不同设备来源。
- 新协议在 d2s 路径中引入设备号段 aX：
  - 旧：`bms/bau/d2s/bM/cN/<suffix>`
  - 新：`bms/bau/d2s/aX/bM/cN/<suffix>`，其中 `aX` 表示第几台设备（范围 1–10）。
- 目标：在同时接入多台设备时，能够清晰区分不同设备的数据，并支持按设备下发参数与控制指令。

## 现状总览（代码结构与关键点）
- 主进程子进程消息处理（MQTT 收/发与解析）：[mqtt.js](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqtt.js)
  - 消息处理器中按分段解析 blockId 与 clusterId：
    - 解析位置与示例：[mqtt.js:L1024-L1050](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqtt.js#L1024-L1050)
    - 解析后分派至各解析函数与语义处理器：[mqtt.js:L1057-L1142](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqtt.js#L1057-L1142)
  - 发布命令时，从 Topic 反向解析 block/cluster 用于原始报文日志的 clientId：[mqtt.js:L1340-L1353](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqtt.js#L1340-L1353)
- 语义采样缓存与落盘：
  - 采样入口（单体电压/温度/SOC/SOH/概要等）：[ingest.js](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqttExport/ingest.js)
    - 目前缓存键 deviceId 使用 `${blockId}-${clusterId}`（不含设备维度）：
      - 单体电压：[ingest.js:L15-L55](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqttExport/ingest.js#L15-L55)
      - 系统概要/包端概要：[ingest.js:L186-L200](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqttExport/ingest.js#L186-L200)
- 渲染进程解析与状态缓存：
  - 故障解析使用 `${blockId}-${clusterId}` 作为 key：[parseFault.ts:L534-L807](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/common/parseFault.ts#L534-L807)
  - 包概要缓存 key 同上：[parsePackSummary.ts:L13-L36](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/cluster/parsePackSummary.ts#L13-L36)
  - 遥控命令主题构造器支持 `{block}`/`{cluster}` 占位符：[useRemoteControlCore.js:L672-L689](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/remote-control/useRemoteControlCore.js#L672-L689)
  - 命令配置示例（当前无设备维度）：
    - 簇级命令配置：[remoteCommandConfig.js](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/configs/commands/cluster/remoteCommandConfig.js)
    - 堆级命令配置（含 s2d/d2s）：[blockRemoteCommandConfig.js:L70-L239](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/configs/commands/block/blockRemoteCommandConfig.js#L70-L239)
- MQTT 订阅主题来源（默认订阅）
  - 前端 Store 默认：`bms/bau/d2s/+/+/#`：[mqttStore.js:L20-L28](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/stores/communication/mqttStore.js#L20-L28)
- 原始报文存储使用 `clientId = block-cluster` 生成分类文本（无设备维度）：
  - 格式化函数：[mqttRawLogger.js:L109-L118](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqttExport/mqttRawLogger.js#L109-L118)
  - 任意方向日志接口（写 CSV）：[event-record-and-message-storage.md:1628-1640](file:///d:/工作相关/09_高速上位机/BAU/docs/event-record-and-message-storage.md#L1628-L1640)
- 事件记录导出（仅按堆号下发/解析）：
  - s2d 读取请求 Topic：`bms/host/s2d/b{block}/event_record_r`：[eventRecordExport.js:L331-L338](file:///d:/工作相关/09_高速上位机/BAU/src/main/eventRecordExport.js#L331-L338)
  - 响应处理仅按堆号匹配等待器：[eventRecordExport.js:L132-L155](file:///d:/工作相关/09_高速上位机/BAU/src/main/eventRecordExport.js#L132-L155)

## 变更需求细化
- 新增设备维度 aX，并且需要：
  - 接收侧（d2s）能识别并区分不同设备数据。
  - 发送侧（s2d）能选择目标设备进行参数/指令下设。
  - 数据缓存、CSV 落盘、UI 显示与选择器都应按设备维度隔离。
  - 兼容旧 Topic（没有 aX 段）以平滑过渡。

## 推荐改造方案（向后兼容 + 影响面清晰）

### 1. 解析层（主进程子进程）
- 目标：避免基于固定下标的解析，统一从 Topic 中定位 `aX/bM/cN` 三段（允许缺失）。
- 做法：用稳健的解析策略（regex 或遍历分段）提取：
  - `deviceId = a(\d+)`（缺失时默认 1 或 0；建议 1）
  - `blockId  = b(\d+)`
  - `clusterId= c(\d+)`（缺失时 0）
- 将 `deviceId` 注入消息对象 `msg` 并贯穿转发：
  - 参考入口与分派位置：[mqtt.js:L1024-L1142](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqtt.js#L1024-L1142)
- 原始报文日志的 `clientId` 建议扩展为三元：`a-b-c`（如 `1-1-0`），消除跨设备碰撞。

### 2. 订阅层（前端 Store → 子进程）
- 默认订阅主题应覆盖新旧两种结构：
  - 新：`bms/bau/d2s/+/+/+/#`（匹配 `aX/bM/cN/...` 或 `aX/bM/...`）
  - 旧：`bms/bau/d2s/+/+/#`（匹配 `bM/cN/...` 或 `bM/...`）
- 采用并行订阅或统一订阅 `bms/bau/d2s/#` 再由解析器判定（推荐并行明确匹配，便于性能与过滤）。
  - 配置来源：[mqttStore.js:L20-L28](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/stores/communication/mqttStore.js#L20-L28)

### 3. 语义缓存与键设计
- 现有键：`${blockId}-${clusterId}`，在多设备情形下会互相覆盖。
- 建议统一三元键：`${deviceId}-${blockId}-${clusterId}`：
  - 采样入口变更位置：[ingest.js:L15-L55](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqttExport/ingest.js#L15-L55)、[ingest.js:L186-L200](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqttExport/ingest.js#L186-L200)
  - 故障/概要等渲染端缓存：
    - 故障解析：[parseFault.ts:L534-L807](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/common/parseFault.ts#L534-L807)
    - 包概要缓存：[parsePackSummary.ts:L13-L36](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/cluster/parsePackSummary.ts#L13-L36)
- 原始报文 CSV 的“设备标签”应包含设备维度：
  - 格式化文本扩展（示例：“设备1 堆1簇0”或“设备1 堆1”）：[mqttRawLogger.js:L109-L118](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqttExport/mqttRawLogger.js#L109-L118)

### 4. 遥控命令（s2d）主题模板与 UI 选择
- 现状：模板仅支持 `{block}` 与 `{cluster}`。
- 建议：在主题构造器中增加 `{device}` 占位符，并在所有命令配置中引入 `a{device}` 段：
  - 主题构造器：支持 `{device}` → `[useRemoteControlCore.js:L672-L689](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/remote-control/useRemoteControlCore.js#L672-L689)`
  - 命令配置示例调整：
    - 堆级：`bms/host/s2d/a{device}/b{block}/...`
    - 簇级：`bms/host/s2d/a{device}/b{block}/c{cluster}/...`
    - 参考：[blockRemoteCommandConfig.js:L70-L239](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/configs/commands/block/blockRemoteCommandConfig.js#L70-L239)、[remoteCommandConfig.js](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/configs/commands/cluster/remoteCommandConfig.js)
- UI：新增上菜单栏设备选择器（与堆簇选择器并列），默认选择为 1，范围 1–10，用于选择不同设备以下发指令；与堆/簇选择解耦。
- 反馈解析：从响应 Topic 中同时解析 `aX/bM/cN`，并以三元键存储反馈状态。
  - 受影响位置（示例）：[useRemoteCommand.js:L1525-L1705](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/remote-control/useRemoteCommand.js#L1525-L1705)

### 5. 事件记录导出（可选增强）
- 现状：仅使用 `b{block}` 维度，若多设备同堆号将产生混淆。
- 建议：读取请求与响应路由引入 `a{device}`：
  - 请求：`bms/host/s2d/a{device}/b{block}/event_record_r`
  - 响应解析与等待器：在状态机中加入设备维度的过滤（例如 `eventReadingDeviceId`）。
  - 导出目录结构（新增一层设备目录，保持现有文件夹与文件结构不变）：在默认事件导出目录下按设备维度创建子目录 `a{device}`，其内保留原有目录与文件命名不变。
    - 示例：`<DEFAULT_EXPORT_DIR>/a1/<原有结构与文件>`、`<DEFAULT_EXPORT_DIR>/a2/<原有结构与文件>`
  - 参考位置：
    - 发布请求：[eventRecordExport.js:L331-L338](file:///d:/工作相关/09_高速上位机/BAU/src/main/eventRecordExport.js#L331-L338)
    - 响应处理入口与状态变量：[eventRecordExport.js:L79-L114](file:///d:/工作相关/09_高速上位机/BAU/src/main/eventRecordExport.js#L79-L114)、[eventRecordExport.js:L132-L155](file:///d:/工作相关/09_高速上位机/BAU/src/main/eventRecordExport.js#L132-L155)

## 改造工作量与难度评估
- 难度：中等（逻辑一致性与维度贯穿为主），无复杂算法。
- 影响面：主进程子进程消息解析、前端主题模板与选择器、语义缓存键、原始报文标识、少量 CSV 命名与可视化。
- 工作量估算（含联调与回归）：约 1–2 人日（取决于命令配置与页面数量）。
- 风险与回滚：
  - 风险点：键变更导致旧缓存/页面依赖需要同步调整；事件记录导出若不加设备维度可能出现数据交叉。
  - 建议分阶段上线：先接收侧与缓存键改造，后逐步替换命令配置模板与 UI；保留旧订阅与旧主题模板一段时间实现灰度。

## 详细改造清单（按模块）
- 主进程子进程（接收/转发）：
  - Topic 解析：改为从字符串模式提取 `aX/bM/cN`，并兼容缺失。
  - `msg` 增加 `deviceId` 字段，所有分派函数参数补充。
  - 原始报文日志 `clientId` 扩展为三元（或结构体存储）。
  - 参考：[mqtt.js:L1024-L1142](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqtt.js#L1024-L1142)、[mqtt.js:L1340-L1353](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqtt.js#L1340-L1353)
- 语义采样缓存与落盘：
  - `ingest.js` 中 `deviceId` 改为三元键；落盘目录/文件头可添加设备维度标识。
  - 参考：[ingest.js:L15-L55](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqttExport/ingest.js#L15-L55)、[ingest.js:L186-L200](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqttExport/ingest.js#L186-L200)
- 渲染端缓存与解析：
  - 故障与概要解析模块的 key 改为三元键。
  - 参考：[parseFault.ts:L534-L807](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/common/parseFault.ts#L534-L807)、[parsePackSummary.ts:L13-L36](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/cluster/parsePackSummary.ts#L13-L36)
- 命令主题构造与 UI：
  - `topicBuilder` 增 `{device}` 占位；所有命令配置引入 `a{device}`。
  - 设备选择器（1–10）加入并存储于状态（Pinia/Vue），默认 1。
  - 参考：[useRemoteControlCore.js:L672-L689](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/composables/core/data-processing/remote-control/useRemoteControlCore.js#L672-L689)、[blockRemoteCommandConfig.js:L70-L239](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/configs/commands/block/blockRemoteCommandConfig.js#L70-L239)
- 订阅主题：
  - 默认订阅添加三段匹配 `bms/bau/d2s/+/+/+/#`，保留旧匹配，实现兼容。
  - 参考：[mqttStore.js:L20-L28](file:///d:/工作相关/09_高速上位机/BAU/src/renderer/src/stores/communication/mqttStore.js#L20-L28)
- 事件记录导出（可选）：
  - Topic 引入设备维度；状态机增加 `eventReadingDeviceId`，避免跨设备混淆。
  - 导出目录结构：默认事件导出目录下增加设备号子目录 `a{device}`，其内沿用当前的文件夹与文件结构（不改动文件名与表头）。
  - 参考：[eventRecordExport.js:L331-L338](file:///d:/工作相关/09_高速上位机/BAU/src/main/eventRecordExport.js#L331-L338)、[eventRecordExport.js:L132-L155](file:///d:/工作相关/09_高速上位机/BAU/src/main/eventRecordExport.js#L132-L155)

## 测试与验证建议
- 场景覆盖：
  - 同一服务器同时接入两台设备（a1 与 a2），每台含多个堆与簇。
  - 订阅同时接受新旧 Topic（确保兼容）。
  - 语义缓存与页面显示不互相覆盖；设备切换能正确展示对应数据。
  - 下设命令选择指定设备，响应与状态仅影响该设备。
  - 原始报文与 CSV 中的设备标签正确分离。
  - 事件记录导出在引入设备维度后按设备隔离（如启用）。
- 指标与日志：
  - 检查 `parseErrorCount`（[mqtt.js:L144](file:///d:/工作相关/09_高速上位机/BAU/src/main/mqtt.js#L144)）是否异常增加。
  - 检查 `RAW_EXPORT_DIR` 下 CSV 划分是否按设备维度新增。
  - 检查 UI 的设备选择器与命令主题是否正确拼接 `a{device}`。

## 需求确认
- 事件记录存储：在默认事件导出目录下新增一层设备目录 `a{device}`，子目录内保持当前的文件夹与文件结构不变（不更改文件名与表头）。
- 设备选择器：默认选择设备号为 1；在上菜单栏新增设备选择器，与堆簇选择器并列，支持选择设备号 1–10，用于对不同设备下发指令。

## 结论
- 最优解是采用“解析层稳健提取 + 全链路引入设备维度（三元键）+ 订阅与命令模板兼容化”的方案。
- 改造难度中等，主要是确保所有缓存键与主题构造、反馈解析一致引入设备维度，避免跨设备数据覆盖。
- 具备良好向后兼容性：旧设备未上报 `aX` 时，解析器设置默认设备号（建议 1），系统仍可运行；新设备按 `aX` 维度完全隔离数据与控制。

---

### 附：示例 Topic（新协议）
```text
// 数据上报（d2s）
bms/bau/d2s/a1/b1/c1/cell_volt
bms/bau/d2s/a2/b1/c1/sys_abstract
bms/bau/d2s/a1/b2/block_summary         // 堆级无簇

// 指令下设（s2d）
bms/host/s2d/a1/b1/c1/contactor_ctrl
bms/host/s2d/a2/b1/get_bau_upgrade_result
```






目前出现一个问题，在当前实际生产中，可能有多个BAU同时接到一个服务器下，比如说11.200，此时我连接到该服务器，没办法区分不同BAU的信息，所以现在修改了通讯协议中的topic格式。

比如单体电压之前的格式为：bms/bau/d2s/bM/cN/cell_volt

现在修改后为：

bms/bau/d2s/aX/bM/cN/cell_volt

新增了一个aX字段来表示是第几台设备上传的信息。

所以我需要修改目前的框架，确保在多台设备同时接入一个服务器时，我可以进行区分以及选择不同设备，对不同设备进行参数指令下设。 mqtt.js 1057-1142 相当于除了堆号簇号及事件名称，现在还需要解析一个不同的设备号，范围为1-10，现在请帮我分析，如果我需要实际生产中满足以上需求，你认为怎么修改是最优解？修改该功能是否困难？先进行全面分析，编写一个md文档来说明该需求及代码情况。不进行修改。
1、事件存储中我需要他们多一层目录，不要修改当前存储文件夹及文件的结构，增加一层目录来存放多个设备导致的当前文件夹

2、设备选择器默认选择为1，但是需要新增类似于上菜单栏中的堆簇选择器，可以选择不同的设备以给不同设备下发指令

现在根据我的需求修改md文档对应部分，确认现有需求，如果你有任何问题可以先询问我

1、我不希望覆盖新旧两种结构，现在先只匹配新结构，把旧结构注释掉，但是不要删除

2、选择器范围不应该一直为1-10，应该和堆簇选择保持一致，如果收到了对应的设备号，就把对应设备号加进去

3、我不希望在同一的主题构造器插入a{device}，我希望能够在构造命令的地方直接逐个进行修改，这样后期维护代码更直观

4、注释掉旧订阅

5、把所有的数据视图修改为三元键并且为每个页面读取显示接入设备选择器

完成以上修改，随后我会查看效果