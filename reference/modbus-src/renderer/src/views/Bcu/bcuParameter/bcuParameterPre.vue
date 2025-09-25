<script setup>
import { ref, onBeforeMount, onBeforeUnmount, computed, nextTick } from 'vue'
import Papa from 'papaparse'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useModuleDataStore } from '../../../../../stores/paramImportStore.js'
import bcuParamChild from './bcuParamChild.vue'
const moduleData = useModuleDataStore()
import { useToast } from 'primevue/usetoast'
const toast = useToast()
const ipStore = useIpStore() // 获取 Pinia store
const { moduleReadingStatus } = storeToRefs(ipStore)
/* import { useWriteAllImported } from './useWriteAllImported'
const { writeAllImportedAcross } = useWriteAllImported() */
import {
  getDropDownList,
  labels,
  mergeData,
  mergeDataConfig,
  initDataAlarmConfig,
  initDataSOXConfig,
  MODULE_A,
  MODULE_B,
  MODULE_C,
  flattenWithModule,
  exportSingleCsv,
  processValue,
  mergeRegisters,
  ipRelatedRegisters
} from './configData.js'
/* const expandedRows = ref([]) */
// 三个页面对应的路由路径
const pages = [
  '/Bcu/bcuParameter', // A 页
  '/Bcu/bcuParameter/alarmConfig', // B 页
  '/Bcu/bcuParameter/SOXConfig' // C 页
]
const router = useRouter()
const viewRef = ref(null)
let listenerId = ref(null)
const isBMUNumConfig = ref(true)
const isSysConfig = ref(false)
const isCellVTFilterConfig = ref(false)
const isDelayConfig = ref(false)
const isEquipTConfig = ref(false)
const isBaudRateConfig = ref(false)
const isCurrentSensorConfig = ref(false)
const isBatteryConfig = ref(false)
const isBalanceConfig = ref(false)
const isIVCalibParam = ref(false)
const isFactroyParam = ref(false)
const DataBCUConfig1 = computed(() => moduleData.getModuleData(MODULE_A, ipStore.selectedIp))
const isModuleReading = computed(() => moduleReadingStatus.value[MODULE_A])
/* const isEventParam = ref(false) */
/* const isTimeParam = ref(false) */
const buttonLabel = computed(() => (isModuleReading.value ? '停止读取' : '开始读取'))
const handleClick = () => {
  if (isModuleReading.value) {
    stopReading()
  } else {
    startReading()
  }
}
function filteredBy(classification) {
  return DataBCUConfig1.value.filter((g) => g.classification === classification)
}
const childRef = ref(null)
const tabs = [
  { key: 'BMUNumConfig', label: 'BMU/AFE数量配置' },
  { key: 'SysConfig', label: '系统及设备类型配置' },
  { key: 'CellVTFilterConfig', label: '单体温度电压滤波配置' },
  { key: 'DelayConfig', label: '延时配置' },
  { key: 'EquipTConfig', label: '设备温度配置' },
  { key: 'BaudRateConfig', label: '波特率配置' },
  { key: 'CurrentSensorConfig', label: '电流传感器配置' },
  { key: 'BatteryConfig', label: '电池参数配置' },
  { key: 'BalanceConfig', label: '均衡参数配置' },
  { key: 'FactroyParam', label: '设备出厂信息' }
  /* …其他分类… */
]
const activeKey = ref(tabs[0].key)
const filteredData = computed(() => {
  return DataBCUConfig1.value.filter((item) => {
    if (isBMUNumConfig.value && item.classification === 'BMU/AFE数量配置') return true
    if (isSysConfig.value && item.classification === '系统及设备类型配置') return true
    if (isCellVTFilterConfig.value && item.classification === '单体温度电压滤波配置') return true
    if (isDelayConfig.value && item.classification === '延时配置') return true
    if (isEquipTConfig.value && item.classification === '设备温度配置') return true
    if (isBaudRateConfig.value && item.classification === '波特率配置') return true
    if (isCurrentSensorConfig.value && item.classification === '电流传感器配置') return true
    if (isBatteryConfig.value && item.classification === '电池参数配置') return true
    if (isBalanceConfig.value && item.classification === '均衡参数配置') return true
    //  if (isIVCalibParam.value && item.classification === '电流电压校准参数') return true
    if (isFactroyParam.value && item.classification === '设备出厂信息') return true
    //   if (isTimeParam.value && item.classification === '系统时间记录') return true
    return false
  })
})
const startReading = () => {
  clearAllEdits()
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_A
  })
  ipStore.setModuleReadingStatus(MODULE_A, true)
}

const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_A
  })
  ipStore.setModuleReadingStatus(MODULE_A, false)
}

// 事件监听器
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04Config')
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    const newData = Arg.Arg
    // 存储数据
    // 在 state 里合并增量
    const oldData = moduleData.getModuleData(MODULE_A, deviceIp)
    const merged = mergeDataConfig(oldData, newData)
    moduleData.setModuleData(MODULE_A, deviceIp, merged)
    /* console.log(oldData) */
    /* console.log(DataBCUConfig1.value) */
  }
  window.electron.ipcRenderer.on('update-FC04Config', listenerId.value)
}

function clearAllEdits() {
  DataBCUConfig1.value.forEach((group) =>
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
  stopReading()
  // 注销所有事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04Config', listenerId.value)
    listenerId.value = null
    console.log('已注销事件监听器: update-FC04Config')
  }
})

// 批量下发 sendWriteRequests （支持多 IP）
// 批量下发 sendWriteRequestsToSelectedIps （支持多 IP）
const sendWriteRequestForIps = async () => {
  const currentLabel = tabs.find((t) => t.key === activeKey.value).label

  // 只取当前分类
  const pageData = DataBCUConfig1.value.filter((g) => g.classification === currentLabel)

  // 1. 获取目标 IP 列表
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  // 2. 一次性提示“正在写入”
  toast.add({
    severity: 'info',
    summary: `以下 ${targets.length} 台设备正在写入，请稍后：`,
    detail: targets.join('，'),
    life: 5000
  })
  const writeData = []
  let hasModified = false
  const processedAddrs = new Set()
  let hasError = false // 新增错误标志
  // 定义需要过滤的MAC地址标签
  const macAddressLabels = new Set(['MAC地址'])
  pageData.forEach((group) => {
    group.element.forEach((element) => {
      if (macAddressLabels.has(element.label)) {
        console.log(`过滤只读字段: ${element.label}`)
        return
      }
      const [startAddr] = element.address.split('-')
      if (processedAddrs.has(startAddr)) return
      // 处理生产编码
      if (element.label === '生产编码' && element.address === '0x5713-0x5716') {
        // 新增校验结果存储
        let isValid = true
        const inputValue = String(element.displayValue ?? element.value).replace(/-/g, '')
        if (!/^\d{12}$/.test(inputValue)) {
          toast.add({
            severity: 'warn',
            summary: '提示信息',
            detail: '生产编码必须为12位数字',
            life: 3000
          })
          /*    alert('生产编码必须为12位数字') */
          isValid = false
          hasError = true
        }
        if (isValid) {
          // 拆分四部分
          const part1 = parseInt(inputValue.substring(0, 4), 10)
          const part2 = parseInt(inputValue.substring(4, 6), 10)
          const part3 = parseInt(inputValue.substring(6, 8), 10)
          const part4 = parseInt(inputValue.substring(8, 12), 10)

          // 添加四个寄存器的写入请求
          const addresses = ['0x5713', '0x5714', '0x5715', '0x5716']
          const values = [part1, part2, part3, part4]
          addresses.forEach((addr, index) => {
            writeData.push({ address: addr, value: values[index], ip: ipStore.selectedIp })
            processedAddrs.add(addr)
          })

          hasModified = true
        }
      }
      // IP相关寄存器处理
      else if (ipRelatedRegisters.has(startAddr)) {
        const { endAddr, type } = ipRelatedRegisters.get(startAddr)
        const finalValue = element.displayValue ?? element.value

        try {
          const { high, low } = processValue(finalValue, true)

          writeData.push(
            { address: startAddr, value: high, ip: ipStore.selectedIp },
            { address: endAddr, value: low, ip: ipStore.selectedIp }
          )

          processedAddrs.add(startAddr)
          processedAddrs.add(endAddr)
          if (element.displayValue !== null) hasModified = true
        } catch (e) {
          console.error(`[${type}] 数据转换失败:`, e.message)
          toast.add({
            severity: 'warn',
            summary: '提示信息',
            detail: `${element.label} 格式错误: ${e.message}`,
            life: 3000
          })
          /*  alert(`${element.label} 格式错误: ${e.message}`) */
          hasError = true
          return
        }
      }
      // 普通合并寄存器处理
      else if (mergeRegisters.has(startAddr)) {
        const pairedAddr = mergeRegisters.get(startAddr)
        const finalValue = element.displayValue ?? element.value

        // 数值格式校验
        if (isNaN(finalValue)) {
          toast.add({
            severity: 'warn',
            summary: '提示信息',
            detail: `${element.label} 必须为数字`,
            life: 3000
          })
          /*    alert(`${element.label} 必须为数字`) */
          hasError = true
          return
        }

        // 转换为浮点数并处理小数点
        const numericValue = parseFloat(finalValue)

        // 计算原始整数值（放大100倍）
        const scaledValue = Math.round(numericValue * 100)

        // 32位无符号整数范围校验
        if (scaledValue < 0 || scaledValue > 4294967295) {
          const maxDisplayValue = (4294967295 / 100).toFixed(2)
          toast.add({
            severity: 'warn',
            summary: '提示信息',
            detail: `${element.label} 取值范围为0-${maxDisplayValue}`,
            life: 3000
          })
          /* alert(`${element.label} 取值范围为0-${maxDisplayValue}`) */
          hasError = true
          return
        }

        // 分解为两个16位寄存器值
        const high = (scaledValue >>> 16) & 0xffff // 高16位
        const low = scaledValue & 0xffff // 低16位

        // 生成最终发送值（保留两位小数）
        writeData.push(
          {
            address: startAddr,
            value: +(low / 100).toFixed(2), // 转换为带小数格式
            ip: ipStore.selectedIp
          },
          {
            address: pairedAddr,
            value: +(high / 100).toFixed(2), // 示例值：65535 → 655.35
            ip: ipStore.selectedIp
          }
        )

        processedAddrs.add(startAddr)
        processedAddrs.add(pairedAddr)
        if (element.displayValue !== null) hasModified = true
      }
      // 普通16位寄存器
      else {
        const finalValue = element.displayValue ?? element.value
        const numericValue = Number(finalValue)

        if (isNaN(numericValue)) {
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

        writeData.push({
          address: startAddr,
          value: numericValue,
          ip: ipStore.selectedIp
        })

        if (element.displayValue !== null) hasModified = true
      }
    })
  })
  if (hasError) {
    console.log('存在错误输入，取消发送')
    return
  }
  // 如果没有修改项但需要发送所有参数，可以移除此判断

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
      summary: `写入完成：`,
      detail: okList.join('，'),
      life: 5000
    })
  }
  if (failList.length) {
    toast.add({
      severity: 'error',
      summary: `以下设备写入失败：`,
      detail: failList.join('，'),
      life: 5000
    })
  }
  // 5. 结束后重置 displayValue 并重启读取
  startReading()
  filteredData.value.forEach((g) => g.element.forEach((i) => (i.displayValue = null)))
}
// 批量写入所有分类的导入值
async function writeAllImported() {
  const keysToWrite = tabs.map((t) => t.key).filter((k) => k !== 'FactroyParam')
  const summary = []
  for (const key of keysToWrite) {
    // 切到目标页面
    activeKey.value = key
    // 等待 <component> 切换完毕，childRef 指向新的实例
    await nextTick()

    const inst = childRef.value
    if (inst?.writeImported) {
      // 我们约定 writeImported 返回 { ok: string[], err: string[] }
      const { ok = [], err = [] } = await inst.writeImported()

      const label = tabs.find((t) => t.key === key)?.label || key
      if (err.length === 0) {
        summary.push(`${label}`)
      } else {
        summary.push(
          `${label}：${ok.length} 成功，${err.length} 失败` + `（失败 IP: ${err.join('、')}）`
        )
      }
    } else {
      summary.push(`${key}：writeImported 方法未实现`)
    }
  }

  // 最后一次性弹 Toast
  toast.add({
    severity: summary.some((s) => s.includes('失败')) ? 'warn' : 'success',
    summary: '当前页面导入值写入完成',
    detail: summary.join('；\n'),
    life: 10000
  })
}
defineExpose({ writeAllImported })
function readOnce(eventName, moduleName, initFn, mergeFn) {
  console.log(`readOnce start for ${eventName}`)
  return new Promise((resolve) => {
    // 先卸载旧 listener
    window.electron.ipcRenderer.removeAllListeners(eventName)
    //初始化数组，用于合并新数据
    let current = initFn()
    const listener = (_, Arg) => {
      if (!Arg?.Arg) return
      current = mergeFn(current, Arg.Arg)
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
  const isConnectedForThisIp = ipStore.selectedIp !== '请先连接设备'
  const isCommunictedForThisIp =
    ipStore.getConnectionStatus(ipStore.selectedIp) === 'startAllCommunication'
  // 离线标志，假设 ipStore.online 是个布尔
  if (!isConnectedForThisIp) {
    // 离线：用 initFn 拿初始模板数据
    toast.add({
      severity: 'warn',
      summary: '设备离线',
      detail: '设备未连接,请先连接设备',
      life: 5000
    })
    return
  }
  if (isConnectedForThisIp && !isCommunictedForThisIp) {
    toast.add({
      severity: 'warn',
      summary: '设备未通讯',
      detail: '设备未通讯，请先开始通讯',
      life: 5000
    })
    return
  }
  const dataA = JSON.parse(JSON.stringify(DataBCUConfig1.value))
  // 在线时再走 readOnce
  const [dataB, dataC] = await Promise.all([
    readOnce('update-FC04ConfigAlarm', MODULE_B, initDataAlarmConfig, mergeData),
    readOnce('update-FC04ConfigSOX', MODULE_C, initDataSOXConfig, mergeData)
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
      summary: '导出完成',
      detail: `已保存到：${savedPath}`,
      life: 5000
    })
  } catch (err) {
    if (err.message === '用户取消导出') {
      toast.add({
        severity: 'info',
        summary: '已取消导出',
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: '导出失败',
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
      toast.add({ severity: 'error', summary: '导入失败', detail: err.message, life: 3000 })
    }
  })
  // 重置输入，方便下次导入同一文件
  e.target.value = ''
}
const applyImportedData = async (rows) => {
  const [rawB, rawC] = await Promise.all([
    readOnce('update-FC04ConfigAlarm', MODULE_B, initDataAlarmConfig, mergeData)
      .then((d) => {
        moduleData.setModuleData(MODULE_B, ipStore.selectedIp, d)
        return d
      })
      .catch(() => moduleData.getModuleData(MODULE_B, ipStore.selectedIp)),
    readOnce('update-FC04ConfigSOX', MODULE_C, initDataSOXConfig, mergeData)
      .then((d) => {
        moduleData.setModuleData(MODULE_C, ipStore.selectedIp, d)
        return d
      })
      .catch(() => moduleData.getModuleData(MODULE_C, ipStore.selectedIp))
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
    summary: '导入完成',
    detail: `共导入 ${rows.length} 条`,
    life: 3000
  })
}
</script>
<template>
  <div class="card">
    <div class="fixed-header">
      <div style="display: flex; justify-content: space-between">
        <ButtonGroup>
          <Button
            :label="buttonLabel"
            :severity="isModuleReading ? 'danger' : 'success'"
            @click="handleClick"
          />
          <Button
            label="发送参数"
            @click="sendWriteRequestForIps"
            :disabled="isModuleReading"
            severity="primary"
          />
        </ButtonGroup>
        <ButtonGroup style="display: flex; gap: 0.1rem">
          <Button
            label="导出参数"
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
            label="导入参数"
            icon="pi pi-download"
            @click="$refs.fileInput.click()"
            severity="info"
          />
          <Button label="写入当前页导入值" severity="success" @click="writeAllImported" />
          <slot name="global-actions"></slot>
        </ButtonGroup>
      </div>
      <div class="ButtonGroupBCUPara">
        <ToggleButton
          v-for="t in tabs"
          :key="t.key"
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
      :is="bcuParamChild"
      ref="childRef"
      :data="filteredBy(tabs.find((t) => t.key === activeKey).label)"
      :is-disabled="isModuleReading"
    />
  </div>
</template>

<style lang="less" scoped>
:deep(.center-table td),
:deep(.center-table th) {
  text-align: left !important;
}
.ButtonGroupBCUPara {
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

.value-container {
  position: relative;
  min-height: 36px;
}

.value-overlay {
  position: absolute;
  left: 2rem;
  top: 0;
  padding: 0.5rem;
  pointer-events: none; /* 禁止交互事件穿透 */
  color: red; /* 绿色原始值 */
}

/* 编辑状态样式 */
.editing :deep(.p-inputtext) {
  color: #f44336 !important; /* 红色文字 */
  background: rgba(244, 67, 54, 0.1); /* 浅红背景 */
}
.original :deep(.p-inputtext) {
  border-color: transparent !important;
  background: transparent !important;
}
</style>
