## 数据源与主题
- 极值来源：`bms/bau/d2s/b{堆号}/c{簇号}/sys_abstract`
- 解析路由：`src/main/mqtt.js:423` → `processSysAbstractData`；解析表：`src/main/table.js:57–191`（含值与编号标签）

## 目标与约束
- 不新建文件；把“电池与 BMU 极值”写入现有簇信息 CSV（`ClusterData_*.csv`）
- 在该文件新增表头列（值列 + 对应编号列），并与现有 `cluster_summary` 字段共同写入同一行

## 现状（簇信息 CSV）
- 现有写入入口：`src/main/mqttExport/bauDataExport.js:425–570` `saveClusterSummarySemantic(...)`
  - 构造表头：`ID, 导出时间, 系统总状态位, ...filteredElements(labels)`
  - 行内容：合成“系统总状态位” + 逐项写值；`ID` 使用 `nextId(key)`（`222–231`）

## 合并策略
- 语义缓存：新增 `sysAbstract` 缓存（设备簇维度），与 `clusterSummary` 同步更新（`src/main/mqttExport/ingest.js`）
- 表头构成（一次性固定，全量极值列）：
  - 现有 `ClusterData` 列（含“系统总状态位”与其它簇信息）
  - 极值值列：取自 `SYS_ABSTRACT` 表中各概要段的值标签（最大/最小/平均/极差）
  - 极值编号列：取自 `SYS_ABSTRACT` 表中对应“编号”标签（如“单体最大电压编号1”等）
- 行写入：
  - 先写 `ClusterData` 值（保持当前逻辑）
  - 再写极值值列：从最新 `sysAbstract` 数据中按标签查找对应元素的 `value`；缺失则写 `/`
  - 对应编号列：查找同组编号元素的 `value`；无编号或缺失写 `/`
- 元数据/表头变更：
  - 将 `saveClusterSummarySemantic` 的 `header` 扩展为“簇信息列 + 全量极值列”，构成固定超集，避免频繁表头重写
  - `isConfigChanged(key, meta)`：合并 `clusterSummary.meta` 与 `sysAbstract.meta`（或直接使用固定表头，不触发变更）
- 文件与行号：沿用当前 `ClusterData` 的轮转与跨日逻辑（`265–283,233–245`），`ID` 不变

## 实施步骤
1. 新增解析缓存：在 `src/main/mqttExport/ingest.js` 增加 `processSysAbstract({ topic, blockId, clusterId, baseConfig, data })` → `cacheSampleSemantic('sysAbstract', data, deviceId, Date.now(), baseConfig)`
2. 扩展簇信息写入：修改 `saveClusterSummarySemantic(...)`
  - 预计算“极值标签对”（值标签 ↔ 编号标签）列表（依据 `SYS_ABSTRACT` 表的 label）
  - 构建扩展表头：现有簇信息列 + 极值值列 + 对应编号列
  - 在写行时合并 `latest['sysAbstract'][deviceId]` 的值与编号；缺失用 `/`
3. 定时器分流：无需新增文件；保持对 `clusterSummary` 的分流，函数内部自行合并 `sysAbstract`
4. 验证：
  - 检查 CSV 首次写入的扩展表头是否完整稳定
  - 采样窗口内 `clusterSummary` 与 `sysAbstract` 均到达时，行内极值与编号正确对应
  - 缺失极值时列保持 `/`，不影响表头稳定性与 `ID` 连续性

## 关键点确认
- 极值只来源于 `sys_abstract`，不从 `cell_volt/cell_temp` 计算
- 列名与前端展示标签一致，保持中文原始标签（渲染层已映射显示：`src/renderer/src/views/Cluster/SystemAbstract.vue:238–299`）
- 写入目标文件为现有 `ClusterData_*.csv`，新增列作为文件尾部拓展

请确认该合并写入方案；确认后我将按上述步骤在本项目中扩展簇信息 CSV 的表头与写入逻辑，并保持前端展示不变。