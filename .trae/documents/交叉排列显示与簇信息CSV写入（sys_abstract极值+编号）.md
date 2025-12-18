## 问题与根因
- 平均电压出现约 93.2（应为 ~3.2）：源于用“标签→值”的全局映射，存在同名标签被后到的类别覆盖。
- 冲突示例：`平均电压(V)` 在“单体电压概要”与“BMU电压概要”中同时存在，写值时被 BMU 覆盖；`温度极差(℃)`同样在多类中重复。
- 现状代码：在 `saveClusterSummarySemantic` 中用 `saMap.set(label, value)`（src/main/mqttExport/bauDataExport.js:551–554），随后按标签取值，导致跨类覆盖。

## 修改目标
- 不改页面，仅修正 `ClusterData` CSV 的取值逻辑：按“类别→标签”的二维映射获取值，确保“值↔编号”严格对应、类别不混淆。

## 实施方案（仅改写 CSV 逻辑）
1. 按类别构建映射
- 从 `sys_abstract` 的分组数据构建 `saMapByClass: Map<class, Map<label, value>>`，遍历每个 group（含 `class`），为该类创建子映射并填入 `label→value`。

2. 保持交叉表头不变
- 交叉表头已按类别顺序生成（先最大值与编号，再最小值与编号，最后平均与极差），继续使用当前 `classesOrder + buildClassColumns(cls)` 的表头构造。

3. 按类别取值写行
- 在写行时，替换当前“全局标签取值”为“类别限定标签取值”：
  - 对于每个 `cls`，先取 `clsMap = saMapByClass.get(cls)`；
  - 值列：从 `clsMap.get(valueLabel)` 取值（对象含 `txt` 时写 `txt`）；
  - 编号列：从 `clsMap.get(numberLabel)` 取值；
  - 平均/极差：从 `clsMap.get(avgLabel/rangeLabel)` 取值；
  - 缺失写 `/`。

4. 其他保持不变
- `ID/导出时间/系统总状态位` 保持在最前；簇信息列保持原顺序；文件轮转/跨日与表头签名（`__headerSig`）继续使用。

## 代码定位
- 修改位置：`saveClusterSummarySemantic`（src/main/mqttExport/bauDataExport.js:544–606）
- 现有冲突点：`saMap` 的构建与使用（src/main/mqttExport/bauDataExport.js:551–554）

## 验证
- 导出若干行 CSV：单体电压的“平均电压(V)”回到 ~3.2，BMU 电压平均在其类别中显示为 ~90+；温度极差在各自类别与单位一致。
- 值与编号严格一一对应，交叉顺序与参考项目一致。

确认后我将按上述步骤在该函数中改为“按类别隔离的标签映射”，并进行导出校核。