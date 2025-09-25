<script setup>
import { ref, onBeforeMount, onBeforeUnmount, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
import Papa from 'papaparse'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useModuleDataStore } from '../../../../../stores/paramImportStore.js'
const moduleData = useModuleDataStore()
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import SOXConfigChild from './SOXConfigChild.vue'
import {
  initDataAlarmConfig,
  initDataBCUConfig1,
  mergeData,
  mergeDataConfig,
  MODULE_A,
  MODULE_B,
  MODULE_C,
  flattenWithModule,
  exportSingleCsv,
  mergeRegistersForSOX,
  floatRegisters,
  scaleFactors,
  singleSendLabels,
  processFloatWrite,
  writeImportedForData
} from './configData.js'
const toast = useToast()
let listenerId = ref(null)
const ipStore = useIpStore() // 获取 Pinia store
const { moduleReadingStatus } = storeToRefs(ipStore) // 解构为响应式引用
const isSOXConfig_RealTimePara = ref(true)
const isSOXConfig_CommonPara = ref(false)
const isSOXConfig_SOCPara = ref(false)
const isSOXConfig_SOHPara = ref(false)
const childRef = ref(null)
const tabs = computed(() => [
  { key: 'RealSOX', label: t('config.pageSOX.tabs.RealSOX') },
  { key: 'CommenSOX', label: t('config.pageSOX.tabs.CommenSOX') },
  { key: 'SOCConfig', label: t('config.pageSOX.tabs.SOCConfig') },
  { key: 'SOHConfig', label: t('config.pageSOX.tabs.SOHConfig') }
  /* …其他分类… */
])
const classificationMap = {
  实时保存的SOX数据: 'RealSOX',
  SOX通用参数: 'CommenSOX',
  SOC配置参数: 'SOCConfig',
  SOH配置参数: 'SOHConfig'
}
const activeKey = ref(tabs.value[0].key)
const DataSOXConfig = computed(() => moduleData.getModuleData(MODULE_C, ipStore.selectedIp))
// 这个 computed 只会在 rawConfig 或 locale.value 变时重新计算
/* const DataSOXConfig = computed(() => {
  return rawConfig.value.map((group) => ({
    ...group,
    element: group.element.map((el) => ({
      ...el,
      label:
        locale.value === 'zh'
          ? el.label
          : te(`config.pageSOX.label.${el.label}`)
            ? t(`config.pageSOX.label.${el.label}`)
            : el.label
    }))
  }))
}) */
const isModuleReading = computed(() => moduleReadingStatus.value[MODULE_C])
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
}
const filteredData = computed(() => {
  return DataSOXConfig.value.filter((item) => {
    if (isSOXConfig_RealTimePara.value && item.classification === '实时保存的SOX数据') return true
    if (isSOXConfig_CommonPara.value && item.classification === 'SOX通用参数') return true
    if (isSOXConfig_SOCPara.value && item.classification === 'SOC配置参数') return true
    if (isSOXConfig_SOHPara.value && item.classification === 'SOH配置参数') return true
    return false
  })
})
function filteredBy(tabKey) {
  // 找到对应的中文分类名
  const classification = Object.entries(classificationMap).find(([_, key]) => key === tabKey)?.[0]

  // 如果没有找到匹配项，返回空数组
  if (!classification) return []
  return DataSOXConfig.value.filter((g) => g.classification === classification)
}
const startReading = () => {
  clearAllEdits()
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_C
  })
  ipStore.setModuleReadingStatus(MODULE_C, true)
}

const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_C
  })
  ipStore.setModuleReadingStatus(MODULE_C, false)
}

// 事件监听器
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04ConfigSOX')
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    const newData = Arg.Arg
    const oldData = moduleData.getModuleData(MODULE_C, deviceIp)
    const merged = mergeData(oldData, newData)
    moduleData.setModuleData(MODULE_C, deviceIp, merged)
  }
  window.electron.ipcRenderer.on('update-FC04ConfigSOX', listenerId.value)
}
function clearAllEdits() {
  DataSOXConfig.value.forEach((group) =>
    group.element.forEach((el) => {
      el.displayValue = null
    })
  )
}
onBeforeMount(() => {
  registerListener() // 注册事件监听器
  startReading()
})

onBeforeUnmount(() => {
  // 注销所有事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04ConfigSOX', listenerId.value)
    listenerId.value = null
    //console.log('已注销事件监听器: update-FC04ConfigSOX')
  }
  stopReading()
  // 清空监听器ID数组
})

// 判断是否显示单独下发按钮
const shouldShowSingleButton = (element) => {
  return singleSendLabels.has(element.label)
}

// 单个参数下发：sendSingleParameter（支持多 IP）
const sendSingleParameter = async (element) => {
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  toast.add({
    severity: 'info',
    summary: t('ivCalibration.toasts.writingDevices', { count: targets.length }),
    detail: targets.join('，'),
    life: 5000
  })
  // 为每个 IP 初始化写入队列
  const writeDataPerIp = {}
  targets.forEach((ip) => (writeDataPerIp[ip] = []))

  const [startAddr] = element.address.split('-')
  const finalVal = element.displayValue ?? element.value

  // 32位float寄存器处理
  if (floatRegisters.has(startAddr)) {
    const paired = floatRegisters.get(startAddr)
    if (isNaN(finalVal)) {
      toast.add({
        severity: 'warn',
        summary: '提示信息',
        detail: `${element.label} 必须为数字`,
        life: 3000
      })
      return
    }

    const result = processFloatWrite(startAddr, parseFloat(finalVal), paired)
    if (result.success) {
      targets.forEach((ip) => {
        writeDataPerIp[ip].push(...result.registers)
      })
    } else {
      toast.add({
        severity: 'error',
        summary: '错误',
        detail: `${element.label} 处理失败: ${result.error}`,
        life: 3000
      })
      return
    }
  }
  // 普通合并寄存器处理
  else if (mergeRegistersForSOX.has(startAddr)) {
    const paired = mergeRegistersForSOX.get(startAddr)
    if (isNaN(finalVal)) {
      toast.add({
        severity: 'warn',
        summary: '提示信息',
        detail: `${element.label} 必须为数字`,
        life: 3000
      })
      return
    }
    const scale = scaleFactors.get(startAddr) || 1
    const scaled = Math.round(parseFloat(finalVal) * scale)
    const high = (scaled >>> 16) & 0xffff
    const low = scaled & 0xffff

    targets.forEach((ip) => {
      writeDataPerIp[ip].push(
        { address: startAddr, value: +(low / scale).toFixed(2) },
        { address: paired, value: +(high / scale).toFixed(2) }
      )
    })
  }
  // 普通寄存器处理
  else {
    const num = Number(finalVal)
    if (isNaN(num)) {
      toast.add({
        severity: 'warn',
        summary: '提示信息',
        detail: `${element.label} 必须为数字`,
        life: 3000
      })
      return
    }
    targets.forEach((ip) => {
      writeDataPerIp[ip].push({ address: element.address, value: num })
    })
  }
  // 并行 invoke 每个 IP
  const results = await Promise.all(
    targets.map(async (ip) => {
      const payload = writeDataPerIp[ip].map((item) => ({ ...item, ip }))
      /*     console.log(payload) */
      try {
        const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
        return { ip, res }
      } catch (err) {
        return { ip, res: { success: false, error: err.message } }
      }
    })
  )

  // 5. 一次性提示“完成” & “失败”
  const okList = results.filter((r) => r.res.success).map((r) => r.ip)
  const failList = results.filter((r) => !r.res.success).map((r) => r.ip)

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
  // 清理显示值
  DataSOXConfig.value.forEach((g) => g.element.forEach((i) => (i.displayValue = null)))

  // 如果至少有一个成功，则执行 startReading，且只执行一次
  if (okList.length) {
    startReading()
  }
}

const sendWriteRequests = async () => {
  // 通过英文分类获取中文分类
  const classification = Object.entries(classificationMap).find(
    ([key, value]) => value === activeKey.value
  )?.[0]
  if (!classification) return []
  // 只取当前分类
  const pageData = DataSOXConfig.value.filter((g) => g.classification === classification)

  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  // 2. 一次性提示“正在写入”
  toast.add({
    severity: 'info',
    summary: t('ivCalibration.toasts.writingDevices', { count: targets.length }),
    detail: targets.join('，'),
    life: 5000
  })
  const writeData = []
  let hasModified = false
  let hasError = false // 新增错误标志
  const processedAddrs = new Set()
  // 只处理当前显示的分类（过滤未激活的分类）
  pageData.forEach((group) => {
    group.element.forEach((element) => {
      if (shouldShowSingleButton(element)) {
        return
      }
      const [startAddr] = element.address.split('-')
      // 32位float寄存器处理
      if (floatRegisters.has(startAddr)) {
        const pairedAddr = floatRegisters.get(startAddr)
        const finalValue = element.displayValue ?? element.value

        // 数值格式校验
        if (isNaN(finalValue)) {
          toast.add({
            severity: 'warn',
            summary: '提示信息',
            detail: `${element.label} 必须为数字`,
            life: 3000
          })
          hasError = true
          return
        }

        const result = processFloatWrite(startAddr, parseFloat(finalValue), pairedAddr)
        if (result.success) {
          result.registers.forEach((reg) => {
            writeData.push({
              address: reg.address,
              value: reg.value,
              ip: ipStore.selectedIp
            })
          })
          processedAddrs.add(startAddr)
          processedAddrs.add(pairedAddr)
          if (element.displayValue !== null) hasModified = true
        } else {
          toast.add({
            severity: 'error',
            summary: '错误',
            detail: `${element.label} 处理失败: ${result.error}`,
            life: 3000
          })
          hasError = true
          return
        }
      }
      // 普通合并寄存器处理
      else if (mergeRegistersForSOX.has(startAddr)) {
        const pairedAddr = mergeRegistersForSOX.get(startAddr)
        const finalValue = element.displayValue ?? element.value

        // 数值格式校验
        if (isNaN(finalValue)) {
          toast.add({
            severity: 'warn',
            summary: '提示信息',
            detail: `${element.label} 必须为数字`,
            life: 3000
          })
          /* alert(`${element.label} 必须为数字`) */
          hasError = true
          return
        }

        // 获取缩放系数
        const scale = scaleFactors.get(startAddr) || 1

        // 转换为浮点数并处理小数点
        const numericValue = parseFloat(finalValue)

        // 计算原始整数值（根据系数放大）
        const scaledValue = Math.round(numericValue * scale)

        // 32位无符号整数范围校验
        const maxValue = 4294967295
        if (scaledValue < 0 || scaledValue > maxValue) {
          const maxDisplayValue = (maxValue / scale).toFixed(2)
          toast.add({
            severity: 'warn',
            summary: '提示信息',
            detail: `${element.label} 取值范围为0-${maxDisplayValue}`,
            life: 3000
          })
          /*   alert(`${element.label} 取值范围为0-${maxDisplayValue}`) */
          hasError = true
          return
        }

        // 分解为两个16位寄存器值
        const high = (scaledValue >>> 16) & 0xffff // 高16位
        const low = scaledValue & 0xffff // 低16位

        // 生成最终发送值（根据系数缩小）
        writeData.push(
          {
            address: startAddr,
            value: +(low / scale).toFixed(2), // 转换为带小数格式
            ip: ipStore.selectedIp
          },
          {
            address: pairedAddr,
            value: +(high / scale).toFixed(2), // 示例：scale=10时，65535 → 6553.50
            ip: ipStore.selectedIp
          }
        )

        processedAddrs.add(startAddr)
        processedAddrs.add(pairedAddr)
        if (element.displayValue !== null) hasModified = true
      }
      // 获取最终要发送的值（优先使用编辑值）
      else {
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
      }
    })
  })

  // 如果存在输入超出范围或格式错误，则不发送任何数据，允许用户继续修改
  if (hasError) {
    console.log('存在错误输入，取消发送')
    return
  }
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
  /*   console.log(results) */
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
  const dataC = JSON.parse(JSON.stringify(DataSOXConfig.value))
  // 在线时再走 readOnce
  const [dataA, dataB] = await Promise.all([
    readOnce('update-FC04Config', MODULE_A, initDataBCUConfig1, mergeDataConfig, 'pageSysConfig'),
    readOnce('update-FC04ConfigAlarm', MODULE_B, initDataAlarmConfig, mergeData, 'pageAlarm')
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
  const dataC = translateData(JSON.parse(JSON.stringify(DataSOXConfig.value)), 'pageSOX')
  moduleData.setModuleData(MODULE_C, ipStore.selectedIp, dataC)
  const [rawA, rawB] = await Promise.all([
    readOnce('update-FC04Config', MODULE_A, initDataBCUConfig1, mergeDataConfig, 'pageSysConfig')
      .then((d) => {
        moduleData.setModuleData(MODULE_A, ipStore.selectedIp, d)
        return d
      })
      .catch(() => moduleData.getModuleData(MODULE_A, ipStore.selectedIp)),
    readOnce('update-FC04ConfigAlarm', MODULE_B, initDataAlarmConfig, mergeData, 'pageAlarm')
      .then((d) => {
        moduleData.setModuleData(MODULE_B, ipStore.selectedIp, d)
        return d
      })
      .catch(() => moduleData.getModuleData(MODULE_B, ipStore.selectedIp))
  ])
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
async function writeAllImported() {
  const keysToWrite = tabs.value.map((t) => t.key).filter((k) => k !== 'RealSOX')
  const summary = []
  for (const key of keysToWrite) {
    // 找到该分类的中文名
    const classification = Object.entries(classificationMap).find(([_, v]) => v === key)?.[0]
    if (!classification) continue
    // 拿到该分类的数据
    const pageData = DataSOXConfig.value.filter((g) => g.classification === classification)
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
</script>
<template>
  <div class="card">
    <div class="fixed-header">
      <div style="display: flex; gap: 0.5rem; justify-content: space-between">
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
      <div class="ButtonGroupSOXPara">
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
    <component
      :is="SOXConfigChild"
      ref="childRef"
      :data="filteredBy(activeKey)"
      :is-disabled="isModuleReading"
      @send-single="sendSingleParameter"
    />
  </div>
</template>

<style lang="less" scoped>
:deep(.center-table td),
:deep(.center-table th) {
  text-align: left !important;
}
.ButtonGroupSOXPara {
  margin-bottom: 1rem;
  margin-top: 0.3rem;
}
.card-SOXConfig {
  margin-left: 3rem;
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
