## 实施确认
- 按前述“全局簇序 + 使能簇状态1/2 位域”方案执行，目标是为每簇 `ClusterData_*.csv` 新增一列显示该簇是否使能。
- 代码改动将加入必要的 `//` 注释，尤其在位域计算、表头扩展与缓存读取处，便于后期维护。

## 变更要点（MQTT 导出）
- 文件：`src/main/mqttExport/bauDataExport.js`
- 函数：`saveClusterSummarySemantic`（`425–721`）
- 改动：
  1. `parseDevice(deviceId)` 解析 `{ block, cluster }`（在函数开头加入）。
  2. 读取 `latest.blockSummary[deviceId].dataList[0]` 以获取 `BlockCount`、`ClusterCount1..6` 与 `EnableClusterStatus1/2`（带注释）。
  3. 计算全局簇序并从位域取 bit：
     - `globalIndex = sum(ClusterCount1..(block-1)) + cluster`
     - `globalIndex≤10 → Status1[(globalIndex-1)]`；`11–20 → Status2[(globalIndex-11)]`；否则 `/`（带注释解释位序）。
  4. 表头插入 `簇使能状态`，位置位于 `导出时间` 与 `系统总状态位` 之间；行值在 `sysTotalCol` 前插入 `enableText`（带注释）。
  5. 保持 `__headerSig` 逻辑以触发表头重写与 `ID` 重置。

## 边界与一致性
- 容错：数值缺失/越界输出 `/`；若 `BlockCount` 与 `ClusterCount*` 不全，按当前簇的相对位域推断失败时亦输出 `/`。
- 风格：列名中文、不改动原列顺序；注释围绕三处关键逻辑编写。

## 验证
- 1 堆 8 簇：校验 `Status1` 前 8 位与 CSV 一致。
- 2 堆 12 簇：校验 `Status1` 前 10 位 + `Status2` 前 2 位与 CSV 一致。
- 轮转/重写：新文件与重写后的文件头均含新列。