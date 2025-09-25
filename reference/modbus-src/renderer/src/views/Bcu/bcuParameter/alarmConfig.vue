<script setup>
import { ref, onBeforeMount, onBeforeUnmount, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
import Papa from 'papaparse'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { storeToRefs } from 'pinia'
const ipStore = useIpStore() // 获取 Pinia store
import { useModuleDataStore } from '../../../../../stores/paramImportStore.js'
import alarmConfigChild from './alarmConfigChild.vue'
const moduleData = useModuleDataStore()
import { useToast } from 'primevue/usetoast'
import {
  initDataSOXConfig,
  initDataBCUConfig1,
  mergeData,
  mergeDataConfig,
  MODULE_A,
  MODULE_B,
  MODULE_C,
  flattenWithModule,
  exportSingleCsv,
  writeImportedForData
} from './configData.js'
const toast = useToast()
let listenerId = ref(null)
const { moduleReadingStatus } = storeToRefs(ipStore) // 解构为响应式引用
const isAlarmClusVConfig = ref(true)
const isAlarmClusIConfig = ref(false)
const isAlarmClusRConfig = ref(false)
const isAlarmClusTConfig = ref(false)
const isAlarmBMUVConfig = ref(false)
const isAlarmBMUTConfig = ref(false)
const isAlarmConnectorTConfig = ref(false)
const isAlarmCellVConfig = ref(false)
const isAlarmCellTConfig = ref(false)
const isAlarmCellSOCConfig = ref(false)

const childRef = ref(null)
const tabs = computed(() => [
  { key: 'ClusV', label: t('config.pageAlarm.tabs.ClusV') },
  { key: 'ClusI', label: t('config.pageAlarm.tabs.ClusI') },
  { key: 'ClusR', label: t('config.pageAlarm.tabs.ClusR') },
  { key: 'ClusT', label: t('config.pageAlarm.tabs.ClusT') },
  { key: 'BMUV', label: t('config.pageAlarm.tabs.BMUV') },
  { key: 'BMUT', label: t('config.pageAlarm.tabs.BMUT') },
  { key: 'PoleT', label: t('config.pageAlarm.tabs.PoleT') },
  { key: 'CellV', label: t('config.pageAlarm.tabs.CellV') },
  { key: 'CellT', label: t('config.pageAlarm.tabs.CellT') },
  { key: 'CellSOC', label: t('config.pageAlarm.tabs.CellSOC') }
  /* …其他分类… */
])
// 2. 创建分类键映射（中文分类名 -> tab key）
const classificationMap = {
  簇端电压告警: 'ClusV',
  电流告警: 'ClusI',
  绝缘电阻告警: 'ClusR',
  过温告警: 'ClusT',
  BMU电压告警: 'BMUV',
  BMU电路板温度告警: 'BMUT',
  动力接插件温度告警: 'PoleT',
  Cell电压告警: 'CellV',
  Cell温度告警: 'CellT',
  CellSOC告警: 'CellSOC'
}
const filteredData = computed(() => {
  return translatedConfig.value.filter((item) => {
    if (isAlarmClusVConfig.value && item.classification === '簇端电压告警') return true
    if (isAlarmClusIConfig.value && item.classification === '电流告警') return true
    if (isAlarmClusRConfig.value && item.classification === '绝缘电阻告警') return true
    if (isAlarmClusTConfig.value && item.classification === '过温告警') return true
    if (isAlarmBMUVConfig.value && item.classification === 'BMU电压告警') return true
    if (isAlarmBMUTConfig.value && item.classification === 'BMU电路板温度告警') return true
    if (isAlarmConnectorTConfig.value && item.classification === '动力接插件温度告警') return true
    if (isAlarmCellVConfig.value && item.classification === 'Cell电压告警') return true
    if (isAlarmCellTConfig.value && item.classification === 'Cell温度告警') return true
    if (isAlarmCellSOCConfig.value && item.classification === 'CellSOC告警') return true
    return false
  })
})
const activeKey = ref(tabs.value[0].key)
// 拿到当前 IP 下 B 模块数据（响应式）
const translatedConfig = computed(() => moduleData.getModuleData(MODULE_B, ipStore.selectedIp))
const isModuleReading = computed(() => moduleReadingStatus.value[MODULE_B])
// 按钮标签
const buttonLabel = computed(() =>
  isModuleReading.value ? t('powerMap.stopReading') : t('powerMap.startReading')
)
// 点击处理
const handleClick = () => {
  if (isModuleReading.value) {
    stopReading()
  } else {
    startReading()
  }
  // 直接修改 store 状态（推荐方式）
  /*  ipStore.toggleReadingStatus() */
}
function filteredBy(tabKey) {
  // 找到对应的中文分类名
  const classification = Object.entries(classificationMap).find(([_, key]) => key === tabKey)?.[0]

  // 如果没有找到匹配项，返回空数组
  if (!classification) return []
  return translatedConfig.value.filter((g) => g.classification === classification)
}

const startReading = () => {
  clearAllEdits()
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_B
  })
  ipStore.setModuleReadingStatus(MODULE_B, true)
}

const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_B
  })
  ipStore.setModuleReadingStatus(MODULE_B, false)
}
// 事件监听器
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04ConfigAlarm')
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    const newData = Arg.Arg
    // **2) 从 store 拿出“旧数据” + merge → 得到 merged**
    const oldData = moduleData.getModuleData(MODULE_B, deviceIp)
    const merged = mergeData(oldData, newData)
    // **3) 把 merged 通过 action 写回 store**
    moduleData.setModuleData(MODULE_B, deviceIp, merged)
  }
  window.electron.ipcRenderer.on('update-FC04ConfigAlarm', listenerId.value)
}
function clearAllEdits() {
  translatedConfig.value.forEach((group) =>
    group.element.forEach((el) => {
      el.displayValue = null
    })
  )
}
onBeforeMount(() => {
  registerListener() // 注册事件监听器
  startReading()
  /*  console.log(translatedConfig.value) */
})

onBeforeUnmount(() => {
  // 注销所有事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04ConfigAlarm', listenerId.value)
    listenerId.value = null
    //console.log('已注销事件监听器: update-FC04ConfigAlarm')
  }
  stopReading()
})
const sendWriteRequests = async () => {
  // 当前页面对应的告警分类
  // 通过英文分类获取中文分类
  const classification = Object.entries(classificationMap).find(
    ([key, value]) => value === activeKey.value
  )?.[0]
  if (!classification) return []
  // 只取当前分类
  const pageData = translatedConfig.value.filter((g) => g.classification === classification)

  // 1. 获取目标 IP 列表
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  toast.add({
    severity: 'info',
    summary: t('ivCalibration.toasts.writingDevices', { count: targets.length }),
    detail: targets.join('，'),
    life: 5000
  })
  const writeData = []
  let hasModified = false

  // 只处理当前显示的分类（过滤未激活的分类）
  pageData.forEach((group) => {
    group.element.forEach((element) => {
      // 获取最终要发送的值（优先使用编辑值）
      const finalValue = element.displayValue ?? element.value

      // 强制转换为数值类型
      const numericValue = Number(finalValue)

      writeData.push({
        address: element.address,
        value: numericValue,
        ip: ipStore.selectedIp
      })
      // 记录是否存在修改项
      if (element.displayValue !== null) hasModified = true
    })
  })

  // 2. 并行 invoke 每个 IP 的写请求
  const results = await Promise.all(
    targets.map(async (targetIp) => {
      const dataForThisIp = writeData.map((item) => ({
        address: item.address,
        value: item.value,
        ip: targetIp
      }))
      try {
        // invoke 会返回主进程 handle 的返回值：{ success, error, ip, requestId }
        const result = await window.electron.ipcRenderer.invoke(
          'write-modbus-registers',
          dataForThisIp
        )
        return { ip: targetIp, ...result }
      } catch (err) {
        return { ip: targetIp, success: false, error: err.message }
      }
    })
  )

  // 5. 一次性提示“完成” & “失败”
  const okList = results.filter((r) => r.success).map((r) => r.ip)
  const failList = results.filter((r) => !r.success).map((r) => r.ip)

  if (okList.length) {
    toast.add({
      severity: 'success',
      summary: t('ivCalibration.toasts.writeSuccess', { devices: okList.join('，') }),
      life: 5000
    })
  }
  if (failList.length) {
    toast.add({
      severity: 'error',
      summary: t('ivCalibration.toasts.writeFail', { devices: failList.join('，') }),
      life: 5000
    })
  }
  startReading()
  filteredData.value.forEach((g) => g.element.forEach((i) => (i.displayValue = null)))
}
async function writeAllImported() {
  const summary = [] // 汇总每个 tab 的结果
  const keysToWrite = tabs.value.map((t) => t.key)
  for (const key of keysToWrite) {
    // 找到该分类的中文名
    const classification = Object.entries(classificationMap).find(([_, v]) => v === key)?.[0]
    if (!classification) continue
    // 拿到该分类的数据
    const pageData = translatedConfig.value.filter((g) => g.classification === classification)
    // 直接调用静态写入方法
    const { ok = [], err = [] } = await writeImportedForData(pageData, ipStore, toast, t)
    const label = tabs.value.find((t) => t.key === key)?.label || key
    if (err.length === 0) {
      summary.push(`${label}`)
    } else {
      summary.push(
        `${label}：${ok.length} 成功，${err.length} 失败` +
          (err.length ? `（失败 IP: ${err.join('、')}）` : '')
      )
    }
  }

  // 最后一次性弹 Toast
  toast.add({
    severity: summary.some((s) => s.includes('失败')) ? 'warn' : 'success',
    summary: t('config.toast.writeSuccessThisPage'),
    detail: summary.join('；\n'),
    life: 8000
  })
}
defineExpose({ writeAllImported })
function translateData(data, page) {
  return data.map((group) => ({
    ...group,
    element: group.element.map((el) => ({
      ...el,
      label: locale.value === 'zh' ? el.label : t(`config.${page}.label.${el.label}`) || el.label
    }))
  }))
}
function readOnce(eventName, moduleName, initFn, mergeFn, page) {
  console.log(`readOnce start for ${eventName}`)
  return new Promise((resolve) => {
    // 先卸载旧 listener
    window.electron.ipcRenderer.removeAllListeners(eventName)
    //初始化数组，用于合并新数据
    let current = initFn()
    const listener = (_, Arg) => {
      if (!Arg?.Arg) return
      current = mergeFn(current, Arg.Arg)
      current = translateData(current, page)
      window.electron.ipcRenderer.send('stop-reading-data-params', { module: moduleName })
      ipStore.setModuleReadingStatus(moduleName, false)
      window.electron.ipcRenderer.removeListener(eventName, listener)
      resolve(current)
    }
    window.electron.ipcRenderer.on(eventName, listener)
    // 触发一次开始读取
    window.electron.ipcRenderer.send('start-reading-data-params', { module: moduleName })
    ipStore.setModuleReadingStatus(moduleName, true)
  })
}
async function exportAllModules() {
  console.log('exportAllModules start')
  const isConnectedForThisIp = ipStore.selectedIp !== 'Connect First'
  const isCommunictedForThisIp =
    ipStore.getConnectionStatus(ipStore.selectedIp) === 'startAllCommunication'
  // 离线标志，假设 ipStore.online 是个布尔
  if (!isConnectedForThisIp) {
    // 离线：用 initFn 拿初始模板数据
    toast.add({
      severity: 'warn',
      summary: t('config.toast.connectFirst'),
      life: 5000
    })
    return
  }
  if (isConnectedForThisIp && !isCommunictedForThisIp) {
    toast.add({
      severity: 'warn',
      summary: t('config.toast.communicationFirst'),
      life: 5000
    })
    return
  }
  const dataB = JSON.parse(JSON.stringify(translatedConfig.value))
  // 在线时再走 readOnce
  const [dataA, dataC] = await Promise.all([
    readOnce('update-FC04Config', MODULE_A, initDataBCUConfig1, mergeDataConfig, 'pageSysConfig'),
    readOnce('update-FC04ConfigSOX', MODULE_C, initDataSOXConfig, mergeData, 'pageSOX')
  ])

  const records = [
    ...flattenWithModule(MODULE_A, dataA),
    ...flattenWithModule(MODULE_B, dataB),
    ...flattenWithModule(MODULE_C, dataC)
  ]
  // 导出 CSV
  try {
    const savedPath = await exportSingleCsv(records)
    // 导出完成提示
    toast.add({
      severity: 'success',
      summary: t('powerMap.toast.exportSuccessSummary'),
      detail: t('powerMap.toast.exportSuccessDetail', { path: savedPath }),
      life: 5000
    })
  } catch (err) {
    if (err.message === '用户取消导出') {
      toast.add({
        severity: 'info',
        summary: t('config.toast.cancelExport'),
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: t('config.toast.failExport'),
        detail: err.message,
        life: 5000
      })
    }
  }
}

const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data // [{ 参数名: 'XXX', 值: '123' }, …]
      applyImportedData(data)
    },
    error: (err) => {
      toast.add({
        severity: 'error',
        summary: t('config.toast.failImport'),
        detail: err.message,
        life: 3000
      })
    }
  })
  // 重置输入，方便下次导入同一文件
  e.target.value = ''
}

const applyImportedData = async (rows) => {
  const dataB = translateData(JSON.parse(JSON.stringify(translatedConfig.value)), 'pageAlarm')
  moduleData.setModuleData(MODULE_B, ipStore.selectedIp, dataB)
  const [rawA, rawC] = await Promise.all([
    readOnce('update-FC04Config', MODULE_A, initDataBCUConfig1, mergeDataConfig, 'pageSysConfig')
      .then((d) => {
        moduleData.setModuleData(MODULE_A, ipStore.selectedIp, d)
        return d
      })
      .catch(() => moduleData.getModuleData(MODULE_A, ipStore.selectedIp)),
    readOnce('update-FC04ConfigSOX', MODULE_C, initDataSOXConfig, mergeData, 'pageSOX')
      .then((d) => {
        moduleData.setModuleData(MODULE_C, ipStore.selectedIp, d)
        return d
      })
      .catch(() => moduleData.getModuleData(MODULE_C, ipStore.selectedIp))
  ])
  await nextTick() // 等待 DOM 更新
  // —— 2) 调用 pinia 的批量更新
  moduleData.updateImportedValues(
    rows.map(({ 模块, 参数名, 值 }) => ({
      模块,
      参数名,
      值: isNaN(Number(值)) ? 值 : Number(值)
    })),
    ipStore.selectedIp // ← 传入当前 ip
  )
  toast.add({
    severity: 'success',
    summary: t('vtSetShield.toast.importComplete'),
    detail: t('config.toast.importInfo', { length: rows.length }),
    life: 3000
  })
  ipStore.setImportSuccess(true)
}
</script>
<template>
  <div class="card">
    <div class="fixed-header">
      <div style="display: flex; justify-content: space-between">
        <ButtonGroup>
          <Button
            :label="buttonLabel"
            :severity="isModuleReading ? 'danger' : 'primary'"
            @click="handleClick"
          />
          <Button
            :label="t('config.pageSysConfig.button.buttonSend')"
            @click="sendWriteRequests"
            severity="secondary"
            :disabled="isModuleReading"
          />
        </ButtonGroup>
        <ButtonGroup style="display: flex; gap: 0.1rem">
          <Button
            :label="t('config.pageSysConfig.button.buttonExportParam')"
            icon="pi pi-upload"
            @click="exportAllModules"
            severity="warning"
          />
          <input
            ref="fileInput"
            type="file"
            accept=".csv"
            style="display: none"
            @change="handleFileChange"
          />
          <Button
            :label="t('config.pageSysConfig.button.buttonImportParam')"
            icon="pi pi-download"
            @click="$refs.fileInput.click()"
            severity="info"
          />
          <Button
            :label="t('config.pageSysConfig.button.buttonWriteParamThispage')"
            @click="writeAllImported"
            :disabled="!ipStore.isImportSuccess"
          />
          <slot name="global-actions"></slot>
        </ButtonGroup>
      </div>
      <div class="ButtonGroupAlarmPara">
        <ToggleButton
          v-for="t in tabs"
          :key="t.key + '-' + locale"
          :modelValue="activeKey === t.key"
          :onLabel="t.label"
          :offLabel="t.label"
          @change="
            (isOn) => {
              if (isOn) activeKey = t.key
            }
          "
          class="w-24"
        />
      </div>
    </div>
    <!--   <div class="table-container">
      <alarm-config-child
        v-show="isAlarmClusVConfig"
        ref="pageAlarmClusVConfig"
        :data="filteredBy('簇端电压告警')"
        :is-disabled="isModuleReading"
      />
      <alarm-config-child
        v-show="isAlarmClusIConfig"
        ref="pageAlarmClusIConfig"
        :data="filteredBy('电流告警')"
        :is-disabled="isModuleReading"
      />
      <alarm-config-child
        v-show="isAlarmClusRConfig"
        ref="pageAlarmClusRConfig"
        :data="filteredBy('绝缘电阻告警')"
        :is-disabled="isModuleReading"
      />
      <alarm-config-child
        v-show="isAlarmClusTConfig"
        ref="pageAlarmClusTConfig"
        :data="filteredBy('过温告警')"
        :is-disabled="isModuleReading"
      />
      <alarm-config-child
        v-show="isAlarmBMUVConfig"
        ref="pageAlarmBMUVConfig"
        :data="filteredBy('BMU电压告警')"
        :is-disabled="isModuleReading"
      />
      <alarm-config-child
        v-show="isAlarmBMUTConfig"
        ref="pageAlarmBMUTConfig"
        :data="filteredBy('BMU电路板温度告警')"
        :is-disabled="isModuleReading"
      />
      <alarm-config-child
        v-show="isAlarmConnectorTConfig"
        ref="pageAlarmConnectorTConfig"
        :data="filteredBy('动力接插件温度告警')"
        :is-disabled="isModuleReading"
      />
      <alarm-config-child
        v-show="isAlarmCellVConfig"
        ref="pageAlarmCellVConfig"
        :data="filteredBy('Cell电压告警')"
        :is-disabled="isModuleReading"
      />
      <alarm-config-child
        v-show="isAlarmCellTConfig"
        ref="pageAlarmCellTConfig"
        :data="filteredBy('Cell温度告警')"
        :is-disabled="isModuleReading"
      />
      <alarm-config-child
        v-show="isAlarmCellSOCConfig"
        ref="pageAlarmCellSOCConfig"
        :data="filteredBy('CellSOC告警')"
        :is-disabled="isModuleReading"
      />
    </div> -->
    <!-- 动态组件 -->
    <component
      :is="alarmConfigChild"
      ref="childRef"
      :data="filteredBy(activeKey)"
      :is-disabled="isModuleReading"
    />
  </div>
</template>

<style lang="less" scoped>
:deep(.center-table td),
:deep(.center-table th) {
  text-align: left !important;
}
.ButtonGroupAlarmPara {
  margin-bottom: 1rem;
  margin-top: 0.3rem;
}
.fixed-header {
  position: sticky;
  top: 40px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: 100%; /* 新增 */
  height: auto; /* 新增 */
}
</style>
