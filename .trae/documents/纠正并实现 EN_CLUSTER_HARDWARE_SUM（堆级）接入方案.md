## 目标与约束
- 数据格式：严格为 `[u16 DataLength] + [10×u16]`
- 处理流程：完全复用 `BLOCK_ANALOG_FAULT_GRADE` 的解析与页面呈现流程（仅字段不同、值为0/1）
- 展示：仅在堆级故障页签显示；颜色映射 0→normal、1→severe
- 语言：中英文环境均正常显示（提供i18n键与映射）

## 回滚与位置调整
- 先恢复误加的动态schema与簇级相关改动（packSchemaFactory / utils / FaultOverview / useFaultOverview 的簇合并），不做任何动态簇数量解析。
- 正确位置：在 `src/main/table.js` 定义静态点表，在 `src/protocol/utils.js` 通过通用解析函数处理，在 `src/main/mqtt.js` 增加映射，在 `FaultOverview.vue` 与 `useFaultOverview.js` 以与 `BLOCK_ANALOG_FAULT_GRADE` 相同的管线合并处理。

## 正确实现步骤
### 1) 点表（table.js）
- 新增 `EN_CLUSTER_HARDWARE_SUM`：10 个寄存器，每寄存器 2 字节（u16），按你提供的位定义：
  1. 接触器故障字1（含主正/主负/预充反馈/高边/氧化/黏连/汇总/总汇总）
  2. 接触器故障字2（预留）
  3. 反馈故障字1（隔离开关、断路器、风扇、直流供电KM、门禁、SPD、交流电压、烟感、消防释放、温感、排风系统、辅助断路器、氢气探测器、MSD、急停、预留）
  4. 反馈故障字2（预留）
  5. 高边故障字1（主正/主负/预充/红灯/黄灯/绿灯/风机/主断分励/直流供电KM/PCS封波/辅助断路器控制/排风系统控制、bit12-15预留）
  6. 高边故障字2（预留）
  7. 通讯故障（制冷、PCS、除湿机、消防、BMU、CAN霍尔、BCU、菊花链、AFE、bit9-15预留）
  8. 温度传感器故障（BCU环境、B+、B-、P+、P-、熔断器1、熔断器2、bit7-15预留）
  9. 其他故障字1（霍尔、无效数据、FRAM、EEPROM、Flash、电压采集断线、温度采集断线、保留故障、bit8-15预留）
  10. 其他故障字2（BMU设备通讯、单体电池掉线、单体温度探头掉线、BMU1/2插件温度断线、AFE通讯失联、BCU通讯故障、bit7-15预留）

### 2) 解析（utils.js）
- 新增 `processEnClusterHardwareSumData = hex => parseConfigSection(hex, EN_CLUSTER_HARDWARE_SUM, '堆硬件故障汇总')`
- 输出数据结构与 `BLOCK_ANALOG_FAULT_GRADE` 相同（数组分组），方便前端复用相同处理逻辑。

### 3) MQTT映射（mqtt.js）
- 在 `TOPIC_TABLE_MAP` 增加：`en_cluster_hardware_sum: processEnClusterHardwareSumData`
- 渲染层收到 `dataType: 'EN_CLUSTER_HARDWARE_SUM'`，与现有大写约定一致。

### 4) 前端接入（FaultOverview + useFaultOverview）
- `FaultOverview.vue`
  - 订阅并处理 `EN_CLUSTER_HARDWARE_SUM`，仅当堆号匹配当前选择时注入。
- `useFaultOverview.js`
  - 新增 `blockHardwareSumData` 并与 `blockGradeData` 合并到同一 `processedBlockGradeOverview` 列表中；
  - 颜色映射：`1→severe`、`0→normal`；值为 boolean 时转 0/1；
  - 名称映射：
    - 为每个故障位提供 i18n 键，若未配置键则回退使用 label 文本（保证中英文环境均能显示）。

### 5) i18n（双语）
- 在 `faultOverview.faultNames` 下新增英文键值对：
  - 如：`mainPosContactorFeedbackFault`、`mainPosHighSideFeedbackFault`、`contactorFaultSummary`、`isolationSwitchFeedbackFault` 等，对应中文翻译。
- 在合并逻辑中将表字段/label映射到上述键，`t()` 翻译；若键不存在则显示 label。

### 6) 验证
- 使用一段模拟payload（`DataLength=20` + 10 个 u16）校验解析输出分组与位值；
- UI在堆级页签显示：与 `BLOCK_ANALOG_FAULT_GRADE` 同一网格并列显示，颜色与0/1一致；
- 切堆清空并接收新堆数据，英文环境下显示为英文翻译。

## 待你确认的细节
1. i18n 键的命名是否接受按英文语义（示例上面列出），还是希望直接用中文 label 作为显示（英文环境也展示中文）？
2. 堆级页面中是否要求将“硬件汇总”与“模拟量等级”混排在同一网格（推荐）还是分两组显示？
3. 是否需要在 UI 上额外标识这些是“0/1故障”（例如不展示一般/轻微等图例，仅保留正常/严重两种）？

## 执行
- 收到你的确认后：回滚误加代码 → 按上述方案新增表/解析/映射 → 接入页面与 i18n → 验证。