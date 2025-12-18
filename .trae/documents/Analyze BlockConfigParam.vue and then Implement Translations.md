我已经收集了处理您请求所需的信息。

**1. "堆信息" 页面翻译：**
您希望添加以下英文翻译：
*   `使能簇状态1` -> `Enable Cluster Status 1`
*   `使能簇状态2` -> `Enable Cluster Status 2`
*   `切出簇状态1` -> `Cut-out Cluster Status 1`
*   `切出簇状态2` -> `Cut-out Cluster Status 2`

这些字段在 `src/renderer/src/views/Block/BlockInfo.vue` 中使用。我需要在 `src/renderer/src/locales/en.json` 的 `config.blockInfoPage.parameters` 下添加它们。

**2. "堆遥调参数" 页面翻译：**
您提到以下翻译缺失：
*   `系统端口配置参数` -> `System Port Configuration Parameters`
*   `堆系统基本配置` -> `Block System Basic Configuration`

我发现 `src/renderer/src/views/Block/DeviceManagement.vue` 中使用了这些配置。为了确保准确性，我还需要检查 `src/renderer/src/views/Block/BlockConfigParam.vue`（这可能就是您说的“堆遥调参数”页面），确认它是否使用了相同的翻译键。

**更新后的计划：**
1.  读取 `src/renderer/src/views/Block/BlockConfigParam.vue`，确认它如何处理“系统端口配置参数”和“堆系统基本配置”的翻译。
2.  在 `src/renderer/src/locales/en.json` 中添加“使能/切出簇状态”的翻译（位于 `blockInfoPage.parameters` 下）。
3.  在 `src/renderer/src/locales/en.json` 中修复或添加“系统端口配置参数”和“堆系统基本配置”的翻译。
4.  同时检查 `src/renderer/src/locales/zh.json` 以确保一致性。
