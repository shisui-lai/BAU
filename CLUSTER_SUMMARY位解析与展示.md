# CLUSTER_SUMMARY 位解析与页面展示方案（方案A）

## 背景与现状
- 后端通过 `parseConfigSection` 解析 `CLUSTER_SUMMARY` 并以 `CLUSTER_SUMMARY` 事件发送到前端。
- 之前“系统总状态位”按 `u32` 解析，页面显示旧参数，无法细分状态标签。
- 参考 BCU 上位机项目的做法：按位解析并以状态网格展示，激活高亮、悬停选中效果。

## 改动目标
- 将“系统总状态位”按 bit/bits（bit0~bit18）解析，保持与现有解析链路兼容。
- 在簇页面顶部新增状态网格，展示所有状态，激活项绿色渐变阴影，悬停同参考项目效果。

## 实施内容

### 1. 表驱动改造（src/main/table.js）
- 在 `CLUSTER_SUMMARY` 中，把原 `SysTotalStatus(u32)` 改为：
  - `SysTotalStatus_Word1(u16)`、`SysTotalStatus_Word2(u16)`。
  - 低 16 位（挂 `Word1`）定义为 16 个 `bit` 字段：
    - 静止(0)、充电(1)、放电(2)、禁充(3)、禁放(4)、待机(5)、告警(6)、故障(7)、充电功率锁存(8)、放电功率锁存(9)、充电指令(10)、充电指令完成(11)、放电指令(12)、放电指令完成(13)、脱离母线指令(14)、脱离母线指令完成(15)。
  - 高 16 位（挂 `Word2`）用 `bits`+`map`：
    - 运维模式：map {0: 非运维模式, 1: 运维模式}
    - 正常模式/测试模式：map {0: 正常模式, 1: 测试模式}
    - 初始化：map {0: 初始化完成, 1: 初始化中}
- 位字段仅依赖已解析的寄存器值，不推进偏移；两个 `u16` 共占 4 字节，保持整体数据对齐。

### 2. 前端展示（src/renderer/src/views/Cluster/cellData.vue）
- 在页面顶部新增展示区域：
  - 取数：`pickCluster(selectedCluster, ['系统信息'])`。
  - 计算：筛选上述标签；`bit`→布尔激活；`bits`→使用 `{raw, txt}` 的 `txt` 显示当前态。
  - 模板：网格化展示，激活项 `state-active`，未激活 `state-inactive`。
- 样式：新增 `.system-states-container/.states-grid/.state-item/.state-active/.state-inactive/.state-label`，实现绿色渐变阴影与鼠标悬停选中效果。

## 验证方法
- 接收 `CLUSTER_SUMMARY` 后检查“系统信息”组包含位字段；顶部状态网格按激活状态正确显示，`bits` 的当前态文案正确。
- 切换不同簇，状态区域随 `selectedCluster` 更新；其他簇信息卡片与版本信息不受影响。

## 参考
- 事件分发与解析：`src/main/mqtt.js`、`src/protocol/utils.js`。
- BCU 上位机状态展示：`src_HSBCU_1121/renderer/src/views/Bcu/clusterData/clusterDataSummHome.vue` 与位解析 `src_HSBCU_1121/modbus/handlers/utils.js`。

