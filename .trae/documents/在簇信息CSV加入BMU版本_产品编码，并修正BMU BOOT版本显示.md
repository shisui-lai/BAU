## 目标
- 在 `ClusterData_*.csv` 的“极值列”之前，新增 BMU 信息三列：软件版本、BOOT 版本、产品编码（按 BMU 1..n 依次排列）。
- 不修改通用 `str2` 解析；新增一个专用解析类型用于 BOOT 两字节字符串的字节序修正，使页面与CSV均显示正确的 `09`。

## 新增解析类型（不改现有 str2）
- 类型命名：`boot_str2_le`
- 语义：两字节 ASCII（设备报文为小端），解析时交换字节顺序为可读字符串；空值显示为 `--`。
- 实现位置：`src/protocol/utils.js`
  - 在 `parseByTable` 与 `parseByTableWithSkip` 中各增加一个分支：
    - 读取 `b0=view.getUint8(off)`, `b1=view.getUint8(off+1)`；
    - 交换顺序 `ascii.decode([b1,b0])` 并过滤 `\0`；
    - 推进偏移 `off += 2`；
    - `shouldStore` 为真时写入结果。
- 使用方式：仅 `Bmu{i}BootVer` 使用该类型；其它 `str2` 字段不受影响。

## 绑定到 PACK_SUMMARY
- 文件：`src/main/packSchemaFactory.ts`
  - 将 `Bmu{i}BootVer` 字段的 `type: 'str2'` 替换为 `type: 'boot_str2_le'`。
  - 保持 `Bmu{i}SwVer: 'hex'` 与 `Bmu{i}ProductCode: 'str14'` 不变。
- 解析入口：`processPackSummaryRAW(hex)` 已使用 `parseByTableWithSkip`，新类型会被识别并正确解析；页面与导出将同步显示为 `09`。

## CSV 列插入（极值前）
- 文件：`src/main/mqttExport/bauDataExport.js` 的 `saveClusterSummarySemantic`
- 表头：在现有“簇信息列（filteredElements）”之后、“极值列”之前追加：
  - `BMU{i} 软件版本`, `BMU{i} BOOT版本`, `BMU{i} 产品编码`（i=1..bmuTotal）
- 行值：从 `latest['packSummary'][deviceId]` 取最近一帧：
  - 根据 `baseConfig.bmuTotal` 决定 BMU 数量；
  - 构建类别内 `label→value` 映射：`BMU版本信息`（软件/BOOT）与 `BMU产品编码`；
  - 逐 BMU依序写入三列；缺失写 `/`。
- 保持 `__headerSig` 变更检测，首次写入新表头后行号重置一次，后续稳定。

## 页面联动
- 页面无需修改：渲染层消费的是解析后的分组数据；新类型生效后，`BMU{i} BOOT版本`都会以正确的 `09` 显示。

## 验证
- 采集 `pack_summary` 与 `cluster_summary`：
  - `ClusterData_*.csv` 表头顺序：簇信息→BMU三列→极值交叉列；
  - `BMU{i} BOOT版本` 显示 `09`；
  - 软件版本显示十六进制（或 `--`），产品编码为 14 字符 ASCII；
  - 交叉极值列与类别前缀保持不变。

## 兼容性与风险控制
- 新增类型只作用于 BOOT 字段，不影响其它 `str2` 使用处；
- 解析入口不变，代码最小侵入；
- CSV 写入层按新增列插入，旧数据不丢失，列签名控制防止频繁重写。

确认后我将：
1) 在 `utils.js` 增加 `boot_str2_le` 分支；
2) 将 `packSchemaFactory.ts` 的 BOOT 字段切换到新类型；
3) 在 `bauDataExport.js` 插入 BMU 信息列并写值；
4) 运行导出验证。