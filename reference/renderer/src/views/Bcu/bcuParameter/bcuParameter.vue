<script setup>
import { ref, onBeforeMount, onBeforeUnmount, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
import { useConfirm } from 'primevue/useconfirm'
const confirm = useConfirm()
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
  mergeData,
  mergeDataConfig,
  initDataBCUConfig1,
  initDataAlarmConfig,
  initDataSOXConfig,
  MODULE_A,
  MODULE_B,
  MODULE_C,
  flattenWithModule,
  exportSingleCsv,
  processValue,
  mergeRegisters,
  ipRelatedRegisters,
  writeImportedForData,
  validateRange,
  validateAndReadExcel,
  validateCSVHeaders
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
const isExporting = ref(false) // 导出进行中状态
const isImporting = ref(false) // 导入进行中状态
const DataBCUConfig1 = computed(() => moduleData.getModuleData(MODULE_A, ipStore.selectedIp))
const isModuleReading = computed(() => moduleReadingStatus.value[MODULE_A])
/* const isEventParam = ref(false) */
/* const isTimeParam = ref(false) */
const buttonLabel = computed(() =>
  isModuleReading.value ? t('powerMap.stopReading') : t('powerMap.startReading')
)
const handleClick = () => {
  if (isModuleReading.value) {
    stopReading()
  } else {
    startReading()
  }
}
function filteredBy(tabKey) {
  // 找到对应的中文分类名
  const classification = Object.entries(classificationMap).find(([_, key]) => key === tabKey)?.[0]

  // 如果没有找到匹配项，返回空数组
  if (!classification) return []

  return DataBCUConfig1.value.filter((g) => g.classification === classification)
}
const childRef = ref(null)
const tabs = computed(() => [
  { key: 'BMUNumConfig', label: t('config.pageSysConfig.tabs.BMUNumConfig') },
  { key: 'SysConfig', label: t('config.pageSysConfig.tabs.SysConfig') },
  { key: 'CellVTFilterConfig', label: t('config.pageSysConfig.tabs.CellVTFilterConfig') },
  { key: 'DelayConfig', label: t('config.pageSysConfig.tabs.DelayConfig') },
  { key: 'EquipTConfig', label: t('config.pageSysConfig.tabs.EquipTConfig') },
  { key: 'BaudRateConfig', label: t('config.pageSysConfig.tabs.BaudRateConfig') },
  { key: 'CurrentSensorConfig', label: t('config.pageSysConfig.tabs.CurrentSensorConfig') },
  { key: 'BatteryConfig', label: t('config.pageSysConfig.tabs.BatteryConfig') },
  { key: 'BalanceConfig', label: t('config.pageSysConfig.tabs.BalanceConfig') },
  { key: 'FactroyParam', label: t('config.pageSysConfig.tabs.FactroyParam') }
])
// 2. 创建分类键映射（中文分类名 -> tab key）
const classificationMap = {
  'BMU/AFE数量配置': 'BMUNumConfig',
  系统及设备类型配置: 'SysConfig',
  单体温度电压滤波配置: 'CellVTFilterConfig',
  延时配置: 'DelayConfig',
  设备温度配置: 'EquipTConfig',
  波特率配置: 'BaudRateConfig',
  电流传感器配置: 'CurrentSensorConfig',
  电池参数配置: 'BatteryConfig',
  均衡参数配置: 'BalanceConfig',
  设备出厂信息: 'FactroyParam'
}
const activeKey = ref(tabs.value[0].key)
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
    const oldData = moduleData.getModuleData(MODULE_A, deviceIp)
    const merged = mergeDataConfig(oldData, newData)
    moduleData.setModuleData(MODULE_A, deviceIp, merged)
    /* console.log(oldData) */
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
    //console.log('已注销事件监听器: update-FC04Config')
  }
})

// 批量下发 sendWriteRequests （支持多 IP）
// 批量下发 sendWriteRequestsToSelectedIps （支持多 IP）
const sendWriteRequestForIps = async () => {
  // 通过英文分类获取中文分类
  const classification = Object.entries(classificationMap).find(
    ([key, value]) => value === activeKey.value
  )?.[0]
  if (!classification) return []
  // 只取当前分类
  const pageData = DataBCUConfig1.value.filter((g) => g.classification === classification)
  // 1. 获取目标 IP 列表
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
  // 1. 判断本次写入是否包含IP类型
  const hasIp = pageData.some((group) => group.element.some((element) => element.dataType === 'ip'))

  if (hasIp) {
    confirm.require({
      message: t('config.confirm.confirmMessage'),
      header: t('config.confirm.confirmTitle'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        doWriteRequestForIps(pageData, targets)
      },
      acceptLabel: t('password.confirm') || '确认', // 确保这里有合适的文本
      rejectLabel: t('password.cancel') || '取消' // 确保这里有文本
    })
  } else {
    doWriteRequestForIps(pageData, targets)
  }
}
async function doWriteRequestForIps(pageData, targets) {
  const writeData = []
  let hasModified = false
  const processedAddrs = new Set()
  let hasError = false // 新增错误标志
  // 定义需要过滤的MAC地址标签
  const macAddressLabels = new Set(['MAC地址', 'MAC Address'])
  pageData.forEach((group) => {
    group.element.forEach((element) => {
      if (macAddressLabels.has(element.label)) {
        console.log(`过滤只读字段: ${element.label}`)
        return
      }

      // 校验编辑值是否在min和max范围内
      if (element.displayValue !== null && element.displayValue !== undefined) {
        const editValue = Number(element.displayValue)
        if (!isNaN(editValue)) {
          // 检查是否有min和max定义
          if (element.min !== undefined && element.max !== undefined) {
            if (editValue < element.min || editValue > element.max) {
              toast.add({
                severity: 'warn',
                summary: '参数范围错误',
                detail: `${element.label} 取值范围为 ${element.min}-${element.max}，当前值: ${editValue}`,
                life: 3000
              })
              hasError = true
              return
            }
          }
        }
      }

      const [startAddr] = element.address.split('-')
      // 特殊功能位组合：0x005a（三个下拉共用一个寄存器）
      if (startAddr === '0x005a' && !processedAddrs.has('0x005a')) {
        const all005a = pageData
          .flatMap((g) => g.element)
          .filter((el) => (el.address || '').split('-')[0] === '0x005a')
        const findById = (id) => all005a.find((e) => e.id === id)
        const elCluster = findById(100) // 簇压模式 (bit0-2)
        const elPower = findById(101) // 动力接插件 (bit3)
        const elBmuTemp = findById(102) // BMU温度数据类型 (bit4)
        const valOf = (el) => Number(el?.displayValue ?? el?.value ?? 0)
        const cluster = (valOf(elCluster) & 0x7) >>> 0
        const power = (valOf(elPower) & 0x1) >>> 0
        const bmuTemp = (valOf(elBmuTemp) & 0x1) >>> 0
        const combined = (cluster | (power << 3) | (bmuTemp << 4)) >>> 0

        writeData.push({ address: '0x005a', value: combined, ip: ipStore.selectedIp })
        processedAddrs.add('0x005a')
        if (
          (elCluster && elCluster.displayValue !== null) ||
          (elPower && elPower.displayValue !== null) ||
          (elBmuTemp && elBmuTemp.displayValue !== null)
        )
          hasModified = true
        return
      }
      if (processedAddrs.has(startAddr)) return
      // 处理生产编码
      if (element.address === '0x5713-0x5716') {
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

      // 检查是否包含网络相关参数
      const hasNetworkParams = dataForThisIp.some((item) => ipRelatedRegisters.has(item.address))

      try {
        // invoke 会返回主进程 handle 的返回值：{ success, error, ip, requestId }
        const result = await window.electron.ipcRenderer.invoke(
          'write-modbus-registers',
          dataForThisIp
        )

        // 如果包含网络参数且下发成功，则发送复位指令
        if (hasNetworkParams && result.success) {
          try {
            const resetResult = await window.electron.ipcRenderer.invoke('write-modbus-registers', [
              { address: '0xCAF0', value: 0x5bb5, ip: targetIp }
            ])
            console.log(`设备复位指令发送${resetResult.success ? '成功' : '失败'}: ${targetIp}`)
          } catch (resetErr) {
            console.error(`设备复位指令发送失败: ${targetIp}`, resetErr)
          }
        }

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
  // 5. 结束后重置 displayValue 并重启读取
  startReading()
  filteredData.value.forEach((g) =>
    g.element.forEach((i) => {
      i.displayValue = null
      i.importedValue = null
    })
  )
}
// 批量写入所有分类的导入值
async function writeAllImported() {
  const keysToWrite = tabs.value.map((t) => t.key).filter((k) => k !== 'FactroyParam')
  const summary = []
  for (const key of keysToWrite) {
    const classification = Object.entries(classificationMap).find(([_, v]) => v === key)?.[0]
    if (!classification) continue
    // 拿到该分类的数据
    const pageData = DataBCUConfig1.value.filter((g) => g.classification === classification)
    // 直接调用静态写入方法
    const { ok = [], err = [] } = await writeImportedForData(pageData, ipStore, toast, t)
    const label = tabs.value.find((t) => t.key === key)?.label || key
    if (err.length === 0) {
      summary.push(`${label}`)
    } else {
      summary.push(
        `${label}：${ok.length} 成功，${err.length} 失败` + `（失败 IP: ${err.join('、')}）`
      )
    }
  }

  // 最后一次性弹 Toast
  toast.add({
    severity: summary.some((s) => s.includes('失败')) ? 'warn' : 'success',
    summary: t('config.toast.writeSuccessThisPage'),
    detail: summary.join('；\n'),
    life: 10000
  })
}

// 清空导入值函数
const clearImportedValues = () => {
  moduleData.clearImportedValues(ipStore.selectedIp)
  ipStore.setImportSuccess(false)
  toast.add({
    severity: 'success',
    summary: '清空成功',
    detail: '所有导入值已清空',
    life: 3000
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
  if (isExporting.value) return // 防止重复点击
  isExporting.value = true
  
  try {
    console.log('exportAllModules start')
    
    // 使用当前选中的 IP
    const exportIp = ipStore.selectedIp
    
    console.log('导出IP:', exportIp, '(当前选中IP)')
    
    const isConnectedForThisIp = exportIp !== 'Connect First'
    const isCommunictedForThisIp =
      ipStore.getConnectionStatus(exportIp) === 'startAllCommunication'
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
    
    // 使用 exportIp 获取数据
    const dataA = translateData(
      JSON.parse(JSON.stringify(moduleData.getModuleData(MODULE_A, exportIp))), 
      'pageSysConfig'
    )
    // 读取最新数据后，从 store 中获取指定 IP 的数据
    await Promise.all([
      readOnce('update-FC04ConfigAlarm', MODULE_B, initDataAlarmConfig, mergeData, 'pageAlarm'),
      readOnce('update-FC04ConfigSOX', MODULE_C, initDataSOXConfig, mergeData, 'pageSOX')
    ])
    
    // 从 store 中获取指定 IP 的数据
    const dataB = moduleData.getModuleData(MODULE_B, exportIp) || initDataAlarmConfig()
    const dataC = moduleData.getModuleData(MODULE_C, exportIp) || initDataSOXConfig()
    const records = [
      ...flattenWithModule(MODULE_A, dataA),
      ...flattenWithModule(MODULE_B, dataB),
      ...flattenWithModule(MODULE_C, dataC)
    ]
    // 导出 Excel
    try {
      const savedPath = await exportSingleCsv(records, exportIp)
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
  } finally {
    isExporting.value = false
  }
}

const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  if (isImporting.value) return // 防止重复点击
  isImporting.value = true

  try {
    // 使用公共方法读取Excel文件
    await validateAndReadExcel(
      file,
      // 成功回调：解析Excel数据
      ({ headers, rows }) => {
        // 验证列标题
        const headerValidation = validateCSVHeaders(headers)
        if (!headerValidation.valid) {
          toast.add({
            severity: 'error',
            summary: 'Excel格式错误',
            detail: headerValidation.message,
            life: 8000
          })
          return
        }

        // 将行数据转换为对象数组
        const data = rows.map((row) => {
          const obj = {}
          headers.forEach((header, index) => {
            obj[header] = row[index] || ''
          })
          return obj
        })

        applyImportedData(data)
      },
      // 失败回调：显示错误提示
      (error) => {
        toast.add({
          severity: 'error',
          summary: error.summary,
          detail: error.detail,
          life: 8000
        })
      }
    )
  } finally {
    isImporting.value = false
    // 重置输入，方便下次导入同一文件
    e.target.value = ''
  }
}
const applyImportedData = async (rows) => {
  // 确保模块A的数据存在于store中（初始化或使用现有数据）
  const existingDataA = moduleData.getModuleData(MODULE_A, ipStore.selectedIp)
  if (!existingDataA) {
    const dataA = translateData(JSON.parse(JSON.stringify(DataBCUConfig1.value)), 'pageSysConfig')
    moduleData.setModuleData(MODULE_A, ipStore.selectedIp, dataA)
  }
  const [rawB, rawC] = await Promise.all([
    readOnce('update-FC04ConfigAlarm', MODULE_B, initDataAlarmConfig, mergeData, 'pageAlarm')
      .then((d) => {
        moduleData.setModuleData(MODULE_B, ipStore.selectedIp, d)
        return d
      })
      .catch(() => moduleData.getModuleData(MODULE_B, ipStore.selectedIp)),
    readOnce('update-FC04ConfigSOX', MODULE_C, initDataSOXConfig, mergeData, 'pageSOX')
      .then((d) => {
        moduleData.setModuleData(MODULE_C, ipStore.selectedIp, d)
        return d
      })
      .catch(() => moduleData.getModuleData(MODULE_C, ipStore.selectedIp))
  ])
  // —— 2) 先清空导入值，然后调用 pinia 的批量更新
  moduleData.clearImportedValues(ipStore.selectedIp)

  const mappedRows = rows.map(({ 模块, 参数名, 值 }) => ({
    模块,
    参数名,
    值: isNaN(Number(值)) ? 值 : Number(值)
  }))

  // 获取导入统计信息
  const importStats = moduleData.updateImportedValues(mappedRows, ipStore.selectedIp)

  // —— 2.5) 导入后进行范围校验 ——
  let hasRangeError = false
  const allModules = [
    { module: MODULE_A, data: moduleData.getModuleData(MODULE_A, ipStore.selectedIp) },
    { module: MODULE_B, data: moduleData.getModuleData(MODULE_B, ipStore.selectedIp) },
    { module: MODULE_C, data: moduleData.getModuleData(MODULE_C, ipStore.selectedIp) }
  ]

  for (const { data } of allModules) {
    for (const group of data) {
      for (const element of group.element) {
        if (
          element.importedValue !== null &&
          element.importedValue !== undefined &&
          element.importedValue !== '' &&
          element.importedValue !== '-' &&
          element.dataType !== 'ip'
        ) {
          const validation = validateRange(element, element.importedValue, t)
          if (!validation.valid) {
            toast.add({
              severity: 'warn',
              summary: '导入参数范围错误',
              detail: validation.message,
              life: 15000
            })
            hasRangeError = true
          }
        }
      }
    }
  }

  if (hasRangeError) {
    toast.add({
      severity: 'error',
      summary: t('config.toast.importError'),
      detail: '部分导入参数超出范围，请修改后重新导入',
      life: 5000
    })
    // 清空导入值，让用户重新导入
    moduleData.clearImportedValues(ipStore.selectedIp)
    ipStore.setImportSuccess(false)
    return
  }

  // 根据导入结果显示不同的提示
  const hasErrors = importStats.notFound > 0 || importStats.moduleNotFound > 0

  if (hasErrors) {
    // 有错误：显示警告
    let detail = `导入统计：\n${importStats.summary}`
    if (importStats.notFoundParams.length > 0) {
      detail += `\n\n未找到的参数（前10个）：\n${importStats.notFoundParams.join('\n')}`
    }

    toast.add({
      severity: 'warn',
      summary: '导入完成（部分失败）',
      detail: detail,
      life: 15000
    })
  } else {
    // 全部成功：显示成功
    toast.add({
      severity: 'success',
      summary: t('vtSetShield.toast.importComplete'),
      detail: `导入统计：${importStats.summary}`,
      life: 8000
    })
  }

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
            :severity="isModuleReading ? 'danger' : 'success'"
            @click="handleClick"
          />
          <Button
            :label="t('config.pageSysConfig.button.buttonSend')"
            @click="sendWriteRequestForIps"
            :disabled="isModuleReading"
            severity="primary"
          />
        </ButtonGroup>
        <ButtonGroup style="display: flex; gap: 0.1rem">
          <Button
            :label="t('config.pageSysConfig.button.buttonExportParam')"
            icon="pi pi-upload"
            @click="exportAllModules"
            :disabled="isExporting || isImporting"
            :loading="isExporting"
            severity="warning"
          />
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls"
            style="display: none"
            @change="handleFileChange"
          />
          <Button
            :label="t('config.pageSysConfig.button.buttonImportParam')"
            icon="pi pi-download"
            @click="$refs.fileInput.click()"
            :disabled="isExporting || isImporting"
            :loading="isImporting"
            severity="info"
          />
          <Button
            :label="t('config.pageSysConfig.button.buttonClearImportedValues')"
            icon="pi pi-trash"
            @click="clearImportedValues"
            severity="secondary"
            :disabled="!ipStore.isImportSuccess"
          />
          <Button
            :label="t('config.pageSysConfig.button.buttonWriteParamThispage')"
            @click="writeAllImported"
            :disabled="!ipStore.isImportSuccess"
          />
          <slot name="global-actions"></slot>
        </ButtonGroup>
      </div>
      <div class="ButtonGroupBCUPara">
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
      :is="bcuParamChild"
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
