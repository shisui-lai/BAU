<script setup>
import { ref, onMounted, onBeforeUnmount, computed, reactive, onBeforeMount, watch } from 'vue'
import selectInterface from './selectInterface.vue'
import { useConfirm } from 'primevue/useconfirm'
const confirm = useConfirm()
import { useIpStore } from '../../../../../stores/ipStore'
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
const { t, te, locale } = useI18n()
const toast = useToast()
const ipStore = useIpStore() // 获取 Pinia store
const statusTimer = ref(null)
let addressObj = ref({
  addressStart: '208',
  numBCU: ''
})
let addressBMUObj = ref({
  flagStart: '0x5BB5',
  addressStart: 'B0',
  numBMU: ''
})
const flagStartOptions = ref([
  { label: '启动', value: '0x5BB5' },
  { label: '停止', value: '0x1221' }
])
// 1. 新增：存放正在自适应的 IP 集合
const pendingAdaptIps = reactive(new Set())
let listenerId = ref(null)
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
const initBMUAdaptData = () => [
  {
    classification: 'BMU自适应反馈信息',
    element: [
      {
        label: 'BCU执行标识-状态',
        value: '-',
        row: '-'
      },
      {
        label: 'BCU执行标识-内容1',
        value: '-',
        row: '-'
      },
      {
        label: 'BCU执行标识-内容2',
        value: '-',
        row: '-'
      },
      {
        label: 'BCU执行标识-内容3',
        value: '-',
        row: '-'
      }
    ]
  }
]
const bmuAdaptData = ref(initBMUAdaptData())
const ipstore = useIpStore() // 获取 Pinia store
const { selectedInterface, ipList, responses, selectedIp, lastManualSelectedIp } =
  storeToRefs(ipstore) // 这里使用 storeToRefs
// 新增：存储多个BCU的自适应状态
const multiBCUStatus = ref({}) // key: ip, value: { status, failureReason, timestamp }
// 新增：存储BCU地址自适应的状态
const bcuAdaptStatus = ref({}) // key: ip, value: { status, error, timestamp }
// 新增：多选BCU的响应式变量
const selectedBCUs = ref([])
const MODULE_NAME = 'Adapt'
// 新增：防止重复弹出完成提示的标志位
const hasShownCompletionToast = ref(false)
// 新增：BCU自适应重试计数器
const bcuAdaptRetryCount = ref(0)
const MAX_RETRY_COUNT = 2 // 最大重试次数
// 新增：自动查询IP的重试计数器
const autoQueryRetryCount = ref(0)
const MAX_AUTO_QUERY_RETRY = 4 // 自动查询最大重试次数
const ipOptions = computed(() =>
  ipList.value.map((ip, index) => {
    const bcuLabel = `BCU${index + 1}` // 根据索引生成 BCU 标识
    return { label: `${bcuLabel} (${ip})`, value: ip }
  })
)
const startReading = () => {
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}
const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
const deviceMessages = ref([])
const addressAdaptResult = ref({ success: undefined, error: undefined }) // 确保初始化为一个对象
// 新增两个响应式变量，用来存储 adapt-error 与 adapt-progress 信息
const adaptError = ref(null)
const adaptProgress = ref(null)
/* const responses = ref([]) */
const getFullAddress = () => {
  return `192.168.10.${addressObj.value.addressStart}` //拼接前缀和用户输入
}
const isValidIpSuffix = (ipSuffix) => {
  const num = Number(ipSuffix)
  return !isNaN(num) && num >= 100 && num <= 255
}
const isValidNumBCU = (numBCU) => {
  return !isNaN(numBCU) && numBCU > 0
}
// 判断所有输入是否有效
const isFormValid = computed(() => {
  const { addressStart, numBCU } = addressObj.value
  return isValidIpSuffix(addressStart) && isValidNumBCU(numBCU)
})
const bmuValid = computed(() => {
  return (
    addressBMUObj.value.addressStart.length > 0 && // 十六进制地址验证
    Number(addressBMUObj.value.numBMU) > 0 && // 数字有效性验证
    selectedBCUs.value.length > 0 // 必须选择至少一个BCU
  )
})
// 计算属性：判断是否有BCU正在进行自适应
const hasActiveAdaptation = computed(() => {
  return (
    Object.keys(multiBCUStatus.value).length > 0 &&
    Object.values(multiBCUStatus.value).some(
      (status) =>
        status.status && !['BMU自适应地址成功', 'BMU自适应地址失败'].includes(status.status)
    )
  )
})

// 计算属性：判断是否有BCU地址自适应正在进行
const hasActiveBCUAdaptation = computed(() => {
  return (
    Object.keys(bcuAdaptStatus.value).length > 0 &&
    Object.values(bcuAdaptStatus.value).some(
      (status) =>
        status.status && !['BCU地址自适应成功', 'BCU地址自适应失败'].includes(status.status)
    )
  )
})

// 计算属性：判断是否有任何自适应正在进行（包括自动查询IP）
const hasAnyActiveAdaptation = computed(() => {
  return hasActiveBCUAdaptation.value || hasActiveAdaptation.value || ipStore.isAutoQueryingIp
})

// 计算属性：获取所有BCU的状态统计
const statusSummary = computed(() => {
  const statuses = Object.values(multiBCUStatus.value)
  const success = statuses.filter((s) => s.status === 'BMU自适应地址成功').length
  const failed = statuses.filter((s) => s.status === 'BMU自适应地址失败').length
  const pending = statuses.filter(
    (s) => s.status && !['BMU自适应地址成功', 'BMU自适应地址失败'].includes(s.status)
  ).length
  const total = statuses.length

  return { success, failed, pending, total }
})

// 计算属性：生成BCU地址自适应表格数据
const bcuAdaptTableData = computed(() => {
  return ipList.value.map((ip, index) => {
    const bcuLabel = `BCU${index + 1}`
    const status = bcuAdaptStatus.value[ip]

    return {
      bcu: `${bcuLabel} (${ip})`,
      ip: ip,
      status: status?.status || '等待自适应',
      error: status?.error || '',
      timestamp: status?.timestamp || ''
    }
  })
})

// 计算属性：获取BCU地址自适应的状态统计
const bcuAdaptStatusSummary = computed(() => {
  const statuses = Object.values(bcuAdaptStatus.value)
  const success = statuses.filter((s) => s.status === 'BCU地址自适应成功').length
  const failed = statuses.filter((s) => s.status === 'BCU地址自适应失败').length
  const pending = statuses.filter((s) => s.status === 'BCU地址自适应进行中').length
  const total = statuses.length

  return { success, failed, pending, total }
})

// 计算属性：生成表格数据
const tableData = computed(() => {
  return ipList.value.map((ip, index) => {
    const bcuLabel = `BCU${index + 1}`
    const status = multiBCUStatus.value[ip]

    return {
      bcu: `${bcuLabel} (${ip})`,
      ip: ip,
      status: status?.status || '等待自适应',
      failureReason: status?.failureReason || '',
      timestamp: status?.timestamp || '',
      isSelected: selectedBCUs.value.includes(ip)
    }
  })
})
// 新增：加载状态
const isAdapting = ref(false)
// 新增计算属性获取状态值
const statusValue = computed(() => {
  const statusItem = bmuAdaptData.value[0]?.element?.find(
    (item) => item.label === 'BCU执行标识-状态'
  )
  return statusItem?.value || null
})
// 先注册一次"开始"提示
const startHandler = () => {
  if (bcuAdaptRetryCount.value === 0) {
    toast.add({
      severity: 'success',
      summary: '自适应开始',
      detail: t('addressAdapt.bcu.messageMap.toastStart'),
      life: 5000,
      closable: true
    })
  } else {
    toast.add({
      severity: 'warn',
      summary: '自适应重试中',
      detail: t('addressAdapt.bcu.messageMap.toastStart'),
      life: 5000,
      closable: true
    })
  }
}
function sendBCUAdaptConfirm() {
  confirm.require({
    message: t('addressAdapt.bcu.confirmMessage'),
    header: t('addressAdapt.bcu.confirmTitle'),
    accept: () => {
      // 用户主动触发时重置重试计数器
      bcuAdaptRetryCount.value = 0
      sendValue()
    },
    acceptLabel: t('password.confirm') || '确认',
    rejectLabel: t('password.cancel') || '取消'
  })
}

const sendValue = async () => {
  if (addressObj.value.numBCU < responses.value.length) {
    toast.add({
      severity: 'warn',
      summary: 'warnging',
      detail: t('addressAdapt.bcu.messageMap.toastNumFew', { count: responses.value.length }),
      life: 5000
    })
    return
  } else if (addressObj.value.numBCU > responses.value.length) {
    toast.add({
      severity: 'warn',
      summary: 'warning',
      detail: t('addressAdapt.bcu.messageMap.toastNumMore', { count: responses.value.length }),
      life: 5000
    })
    return
  }
  // 重置错误和进度信息
  adaptError.value = null
  adaptProgress.value = null
  // ✅ 修复：清空旧的BCU自适应状态，防止状态累积
  bcuAdaptStatus.value = {}
  // 注意：不在这里重置重试计数器，避免重试时被重置

  // 为所有在线BCU设置"进行中"状态
  ipList.value.forEach((ip) => {
    bcuAdaptStatus.value[ip] = {
      status: 'BCU地址自适应进行中',
      error: '',
      timestamp: new Date().toLocaleTimeString()
    }
  })

  // 先更新前端状态
  ipstore.stopCommunicationAll()
  ipstore.disconnectAll()

  // ✅ 关键修复：批量断开所有Modbus连接，并等待完成
  // console.log('🔌 正在断开所有Modbus连接...')
  try {
    const result = await window.electron.ipcRenderer.invoke('disconnect-all-modbus')
    //console.log(`✅ 所有Modbus连接已断开，共断开 ${result.disconnectedCount} 个连接`)

    // 额外等待200ms确保所有异步操作完全结束
    await new Promise((resolve) => setTimeout(resolve, 200))

    //console.log('✅ 准备开始BCU地址自适应')
  } catch (err) {
    //console.error('❌ 断开Modbus连接时出错:', err)
    toast.add({
      severity: 'error',
      summary: '错误',
      detail: '断开Modbus连接失败: ' + err.message,
      life: 5000
    })
    return
  }

  const fullAddress = getFullAddress()
  const numBCU = addressObj.value.numBCU
  //console.log('📡 开始BCU地址自适应...')
  window.electron.ipcRenderer.send('address-adapt', {
    addressStart: fullAddress,
    numBCU,
    selectedInterface: selectedInterface.value
  })
}
const failureReason = computed(() => {
  const item = bmuAdaptData.value[0].element.find((i) => i.label === 'BCU执行标识-内容3')
  return item ? item.value : ''
})
// 辅助函数：获取状态图标
const getStatusIcon = (status) => {
  if (status === 'BMU自适应地址成功') return 'pi pi-check-circle'
  if (status === 'BMU自适应地址失败') return 'pi pi-times-circle'
  if (status && !['BMU自适应地址成功', 'BMU自适应地址失败'].includes(status))
    return 'pi pi-spin pi-spinner'
  return 'pi pi-clock'
}

// 辅助函数：获取状态颜色
const getStatusColor = (status) => {
  if (status === 'BMU自适应地址成功') return '#28a745'
  if (status === 'BMU自适应地址失败') return '#dc3545'
  if (status && !['BMU自适应地址成功', 'BMU自适应地址失败'].includes(status)) return '#ffc107'
  return '#007bff'
}

// 辅助函数：获取状态样式类
const getStatusClass = (status) => {
  // 移除颜色类名，使用默认样式
  return ''
}

const sendBMUValue = async () => {
  // 检查所选 IP 是否都在通讯状态
  const notCommunicatingIps = selectedBCUs.value.filter(
    (ip) => !ipStore.getIpCommunicationActive(ip)
  )

  if (notCommunicatingIps.length > 0) {
    const ipLabels = notCommunicatingIps
      .map((ip) => {
        const index = ipList.value.indexOf(ip)
        return `BCU${index + 1} (${ip})`
      })
      .join('、')

    toast.add({
      severity: 'error',
      summary: '通讯状态检查失败',
      detail: `以下设备未通讯，请先开始通讯：${ipLabels}`,
      life: 5000
    })
    return
  }

  bmuAdaptData.value = initBMUAdaptData()
  // 清空多BCU状态
  multiBCUStatus.value = {}
  // 清空pendingAdaptIps，准备接收新的IP地址
  pendingAdaptIps.clear()
  // 重置完成提示标志位
  hasShownCompletionToast.value = false

  // 将选中的BCU IP地址添加到pendingAdaptIps集合中
  selectedBCUs.value.forEach((ip) => {
    pendingAdaptIps.add(ip)
  })

  isAdapting.value = true // 开始加载状态

  if (statusTimer.value) {
    clearTimeout(statusTimer.value)
  }
  // 移除自动隐藏逻辑，让状态持久显示

  // 为每个选中的BCU准备写入数据
  const writeDataArray = selectedBCUs.value.map((ip) => [
    {
      address: 0xc20c,
      value: 0x5bb5,
      ip: ip
    },
    {
      address: 0xc20d,
      value: parseInt(addressBMUObj.value.addressStart, 16),
      ip: ip
    },
    {
      address: 0xc20e,
      value: parseInt(addressBMUObj.value.numBMU, 16),
      ip: ip
    }
  ])

  try {
    // 并发发送所有BCU的写入请求
    const promises = writeDataArray.map((writeData) =>
      window.electron.ipcRenderer.invoke('write-modbus-registers', writeData)
    )

    const results = await Promise.all(promises)

    // 检查所有结果
    const successCount = results.filter((res) => res.success).length
    const failedCount = results.length - successCount

    if (successCount > 0) {
      toast.add({
        severity: 'info',
        summary: 'Reminder',
        detail: t('addressAdapt.bmu.messageMap.toastStart'),
        life: 3000
      })

      // 延迟 1s 后把所有成功的IP加入待适配列表
      setTimeout(() => {
        selectedBCUs.value.forEach((ip) => {
          const result = results.find((_, index) => writeDataArray[index][0].ip === ip)
          if (result && result.success) {
            pendingAdaptIps.add(ip)
          }
        })
      }, 1000)
    }

    if (failedCount > 0) {
      toast.add({
        severity: 'warn',
        summary: '部分失败',
        detail: `${failedCount} 个BCU写入失败`,
        life: 5000
      })
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: '写入失败',
      detail: err.message,
      life: 5000
    })
  } finally {
    isAdapting.value = false // 结束加载状态
  }
}
// 定义响应式数组，存储所有地址的自适应反馈
const addressResults = ref([])
onMounted(() => {
  window.electron.ipcRenderer.on('bcu adapt start', startHandler)
  window.electron.ipcRenderer.once('device-message', (event, data) => {
    deviceMessages.value.push(data)
  })
  window.electron.ipcRenderer.on('address-adapt-result', (event, result) => {
    if (result.success) {
      adaptError.value = null // 确保成功时不显示错误信息

      // BCU地址自适应成功后，清空pendingAdaptIps，因为IP地址已经改变
      pendingAdaptIps.clear()

      // ✅ 修复：自适应成功后，自动查询新的IP列表
      //console.log('🔄 BCU地址自适应成功，设备正在重启，将在10秒后自动刷新IP列表...')

      // 🔒 设置自动查询IP标志位，禁用按钮
      ipStore.isAutoQueryingIp = true

      // 提示用户设备正在重启
      toast.add({
        severity: 'info',
        summary: '设备重启中',
        detail: '自适应成功，设备正在重启，将在10秒后自动刷新IP列表...',
        life: 10000
      })

      // 先清空旧的IP列表、响应数据和状态
      ipStore.responses = []
      ipStore.ipList = []
      bcuAdaptStatus.value = {} // 同时清空状态，避免显示混乱

      // 🔄 自动查询IP的函数（支持重试）
      const autoQueryIpWithRetry = (assignedCount) => {
        //console.log('📡 开始查询新的IP列表...', `第 ${autoQueryRetryCount.value + 1} 次尝试`)

        // 发送UDP查询请求
        window.electron.ipcRenderer.send('udp-query-ip', {
          selectedInterface: selectedInterface.value
        })

        // 监听查询结果，只监听一次
        window.electron.ipcRenderer.once('udp-query-ip-result', (event, queryResult) => {
          if (queryResult.success) {
            //console.log('✅ IP列表刷新成功，发现', queryResult.devices.length, '个设备')

            // 重置重试计数器
            autoQueryRetryCount.value = 0

            // 更新IP列表
            ipStore.updateResponses(queryResult.devices)
            ipStore.updateModbusClients()
            const newIps = queryResult.devices.map((device) => device.ip)
            ipStore.updateIpList(newIps, true) // 使用replace=true完全替换旧IP列表

            // ✅ 关键修复：清空旧IP的状态，防止状态累积
            bcuAdaptStatus.value = {}

            // 现在使用新的IP列表更新状态
            newIps.forEach((ip) => {
              bcuAdaptStatus.value[ip] = {
                status: 'BCU地址自适应成功',
                error: '',
                timestamp: new Date().toLocaleTimeString()
              }
            })

            // 显示成功提示
            toast.add({
              severity: 'success',
              summary: '自适应成功',
              detail: `成功分配 ${assignedCount} 台设备，已自动刷新IP列表`,
              life: 5000
            })

            // ✅ 查询成功，清除自动查询标志位，允许再次点击按钮
            ipStore.isAutoQueryingIp = false
          } else {
            console.error('❌ IP列表刷新失败:', queryResult.error)

            // 检查是否可以重试
            if (autoQueryRetryCount.value < MAX_AUTO_QUERY_RETRY - 1) {
              autoQueryRetryCount.value++
              console.log(`🔄 自动查询失败，3秒后进行第 ${autoQueryRetryCount.value + 1} 次重试...`)

              // 3秒后重试
              setTimeout(() => {
                autoQueryIpWithRetry(assignedCount)
              }, 3000)
            } else {
              // 重试次数用尽，提示用户手动查询
              console.error(`❌ 自动查询已重试 ${MAX_AUTO_QUERY_RETRY} 次，全部失败`)
              autoQueryRetryCount.value = 0 // 重置重试计数器

              // IP刷新失败时，明确提示自动查询失败，需要手动查询
              toast.add({
                severity: 'warn',
                summary: '自适应成功',
                detail: `成功分配 ${assignedCount} 台设备，但自动查询IP失败（已重试${MAX_AUTO_QUERY_RETRY}次），请手动查询`,
                life: 6000
              })

              // ✅ 查询失败，也清除自动查询标志位
              ipStore.isAutoQueryingIp = false
            }
          }
        })
      }

      // ⏱️ 延迟10秒后开始首次查询，等待设备重启完成
      autoQueryRetryCount.value = 0 // 重置重试计数器
      setTimeout(() => {
        autoQueryIpWithRetry(result.assigned)
      }, 10000) // 延迟10秒

      // 设置查询超时（10秒重启等待 + 8秒查询超时 = 18秒）
      /*  setTimeout(() => {
        if (ipStore.isAutoQueryingIp) {
          // 超时后清除标志位，允许再次点击按钮
          ipStore.isAutoQueryingIp = false
          toast.add({
            severity: 'warn',
            summary: '提示',
            detail: 'IP列表刷新超时，请手动点击查询按钮',
            life: 5000
          })
        }
      }, 18000) */
    } else {
      // 检查是否可以重试
      if (bcuAdaptRetryCount.value < MAX_RETRY_COUNT) {
        bcuAdaptRetryCount.value++
        toast.add({
          severity: 'warn',
          summary: '自适应失败，正在重试',
          detail: `第 ${bcuAdaptRetryCount.value} 次重试中... (${result.error})`,
          life: 3000
        })
        // 延迟1秒后重试
        setTimeout(() => {
          sendValue()
        }, 1000)
        return
      }

      // 重试次数用尽，报告最终失败
      toast.add({
        severity: 'error',
        summary: '自适应失败',
        detail: result.error,
        life: 5000
      })

      // 更新BCU自适应失败状态 - 为所有在线BCU更新状态
      ipList.value.forEach((ip) => {
        bcuAdaptStatus.value[ip] = {
          status: 'BCU地址自适应失败',
          error: result.error || '未知错误',
          timestamp: new Date().toLocaleTimeString()
        }
      })

      // 如果result中有devices字段，也更新对应的设备状态
      if (result.devices && Array.isArray(result.devices)) {
        result.devices.forEach((device) => {
          if (device.ip) {
            bcuAdaptStatus.value[device.ip] = {
              status: 'BCU地址自适应失败',
              error: result.error || '未知错误',
              timestamp: new Date().toLocaleTimeString()
            }
          }
        })
      }

      // 重置重试计数器
      bcuAdaptRetryCount.value = 0
    }
  })
  // 监听 adapt-error 反馈
  window.electron.ipcRenderer.on('adapt-error', (event, errorData) => {
    adaptError.value = errorData

    // 检查是否可以重试
    // if (bcuAdaptRetryCount.value < MAX_RETRY_COUNT) {
    //   bcuAdaptRetryCount.value++
    //   toast.add({
    //     severity: 'warn',
    //     summary: '自适应失败，正在重试',
    //     detail: `第 ${bcuAdaptRetryCount.value} 次重试中... (${errorData.error || 'unknown error'})`,
    //     life: 3000
    //   })
    //   // 延迟1秒后重试
    //   setTimeout(() => {
    //     sendValue()
    //   }, 1000)
    //   return
    // }

    // 重试次数用尽，报告最终失败
    // 更新BCU自适应失败状态
    ipList.value.forEach((ip) => {
      bcuAdaptStatus.value[ip] = {
        status: 'BCU地址自适应失败',
        error: errorData.error || 'unknown error',
        timestamp: new Date().toLocaleTimeString()
      }
    })

    // 你也可以将错误数据添加到 addressResults，便于统一显示
    addressResults.value.push({
      address: '-',
      status: 'failed',
      error: errorData.error || 'unknown error'
    })
    toast.add({
      severity: 'error',
      summary: 'error',
      detail: errorData.error || 'unknown error',
      life: 5000
    })

    // 重置重试计数器
    //bcuAdaptRetryCount.value = 0
  })

  // 监听 adapt-progress 反馈
  window.electron.ipcRenderer.on('adapt-progress', (event, progressData) => {
    adaptProgress.value = progressData

    // 更新BCU自适应进度状态
    if (progressData.currentDevice) {
      bcuAdaptStatus.value[progressData.currentDevice] = {
        status: 'BCU地址自适应进行中',
        error: '',
        timestamp: new Date().toLocaleTimeString()
      }
    }
  })
})
const mergeData = (oldData, newData) => {
  return newData.map((newGroup) => {
    const oldGroup = oldData?.find((g) => g.classification === newGroup.classification)
    if (!oldGroup) return newGroup

    return {
      ...newGroup,
      element: newGroup.element.map((newItem) => {
        const oldItem = oldGroup.element.find((i) => i.label === newItem.label)
        return oldItem ? { ...oldItem, value: newItem.value, row: newItem.row } : newItem
      })
    }
  })
}
watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    // 如果该IP的数据已经存在，直接使用它
    if (state.deviceData[newIp]) {
      bmuAdaptData.value = state.deviceData[newIp]['update-FC04AdaptData'] || initBMUAdaptData()
    }
    /*   ipstore.manuallySelectIp(newIp) */
  },
  { immediate: true } // 初始时就触发一次
)
// 监听 ipList 变化，一旦长度 > 0，就清掉之前那条“自适应地址成功”提示
// 事件监听器
const registerListener = () => {
  const channel = 'update-FC04AdaptData'
  // listener for 'update-FC04ClusterSumm'
  /*  window.electron.ipcRenderer.removeAllListeners(channel) */ // 移除设备消息监听
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (!pendingAdaptIps.has(deviceIp)) return
    const newData = Arg.Arg
    // 拿到最新的状态字段
    /* console.log('收到 update-FC04AdaptData:', newData) */
    const statusItem = newData[0].element.find((i) => i.label === 'BCU执行标识-状态')
    const status = statusItem?.value
    const failureReasonItem = newData[0].element.find((i) => i.label === 'BCU执行标识-内容3')
    const failureReason = failureReasonItem?.value || ''

    // 更新多BCU状态
    multiBCUStatus.value[deviceIp] = {
      status,
      failureReason,
      timestamp: new Date().toLocaleTimeString()
    }

    // 如果检测到"成功"或"失败"——终态，一定删除
    if (status === 'BMU自适应地址成功' || status === 'BMU自适应地址失败') {
      // ← 在这里移除
      pendingAdaptIps.delete(deviceIp)

      // 检查是否所有BCU都完成了自适应
      if (
        pendingAdaptIps.size === 0 &&
        Object.keys(multiBCUStatus.value).length > 0 &&
        !hasShownCompletionToast.value
      ) {
        const successCount = Object.values(multiBCUStatus.value).filter(
          (s) => s.status === 'BMU自适应地址成功'
        ).length
        const failedCount = Object.values(multiBCUStatus.value).filter(
          (s) => s.status === 'BMU自适应地址失败'
        ).length

        // 设置标志位，防止重复弹出
        hasShownCompletionToast.value = true

        toast.add({
          severity: successCount > 0 ? 'success' : 'error',
          summary: t('addressAdapt.bmu.completeTitle'),
          detail: t('addressAdapt.bmu.completeMessage', {
            success: successCount,
            failed: failedCount,
            total: successCount + failedCount
          }),
          life: 5000
        })
      }
    }
    // 拿旧数据，合并
    const old = state.deviceData[deviceIp]?.[channel] || initBMUAdaptData()
    const merged = mergeData(old, newData)
    // 更新到 state.deviceData
    state.deviceData[deviceIp] = {
      ...(state.deviceData[deviceIp] || {}),
      [channel]: merged
    }

    if (deviceIp === ipStore.selectedIp) {
      bmuAdaptData.value = merged
    }
  }
  window.electron.ipcRenderer.on('update-FC04AdaptData', listenerId.value)
}
onBeforeMount(() => {
  startReading()
  registerListener() // 注册事件监听器
})
// 组件销毁时移除事件监听
onBeforeUnmount(() => {
  stopReading()
  if (statusTimer.value) {
    clearTimeout(statusTimer.value)
  }
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04AdaptData', listenerId.value)
    listenerId.value = null
  }
  window.electron.ipcRenderer.removeAllListeners('device-message') // 移除设备消息监听
  window.electron.ipcRenderer.removeAllListeners('address-adapt-result') // 移除自适应地址结果监听
  window.electron.ipcRenderer.removeAllListeners('adapt-error')
  window.electron.ipcRenderer.removeAllListeners('adapt-progress')
  window.electron.ipcRenderer.removeAllListeners('bcu adapt start')
})
</script>
<template>
  <!--   <ConfirmDialog /> -->
  <div class="card">
    <div><selectInterface /></div>
    <div class="sectionDisplay">
      <div class="card">
        <!--  {{ ipStore.getModuleReadingStatus(MODULE_NAME) }} -->
        <h5>{{ t('addressAdapt.bcu.title') }}</h5>
        <div style="display: flex; align-items: center; margin-bottom: 1rem">
          <label for addressObj.addressStart>{{ t('addressAdapt.bcu.addressStart') }}：</label>
          <InputText
            v-model="addressObj.addressStart"
            :placeholder="t('addressAdapt.bcu.addressStartPlaceholder')"
            class="flex-1"
          />
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 1rem">
          <label for addressObj.numBCU>{{ t('addressAdapt.bcu.bcuNum') }}：</label>
          <InputText
            v-model="addressObj.numBCU"
            class="flex-1"
            :placeholder="t('addressAdapt.bcu.bcuNumPlaceholder')"
          />
        </div>
        <div class="button-and-stats-container">
          <Button
            :label="t('addressAdapt.bcu.startButton')"
            @click="sendBCUAdaptConfirm"
            :disabled="!isFormValid || hasAnyActiveAdaptation"
            icon="pi pi-play"
            class="start-button"
          />

          <!-- BCU地址自适应状态统计信息 -->
          <div v-if="bcuAdaptStatusSummary.total > 0" class="status-summary">
            <div class="summary-item total">
              <span class="summary-label">{{ t('addressAdapt.bcu.statusLabels.total') }}:</span>
              <span class="summary-value">{{ bcuAdaptStatusSummary.total }}</span>
            </div>
            <div class="summary-item success">
              <span class="summary-label">{{ t('addressAdapt.bcu.statusLabels.success') }}:</span>
              <span class="summary-value">{{ bcuAdaptStatusSummary.success }}</span>
            </div>
            <div class="summary-item failed">
              <span class="summary-label">{{ t('addressAdapt.bcu.statusLabels.failed') }}:</span>
              <span class="summary-value">{{ bcuAdaptStatusSummary.failed }}</span>
            </div>
            <div class="summary-item pending">
              <span class="summary-label">{{ t('addressAdapt.bcu.statusLabels.pending') }}:</span>
              <span class="summary-value">{{ bcuAdaptStatusSummary.pending }}</span>
            </div>
          </div>

          <div>
            <!-- 显示 adapt-error 与 adapt-progress 信息 -->
            <div v-if="adaptError">
              <strong>{{ t('addressAdapt.bcu.error') }}:</strong> {{ adaptError.error }}
            </div>
            <div v-if="adaptProgress">
              {{ t('addressAdapt.bcu.currentAdpapted', { count: adaptProgress.current }) }} /
              {{ adaptProgress.total
              }}<!-- ，当前设备: {{ adaptProgress.currentDevice }} -->
            </div>
          </div>
        </div>
        <!-- BCU地址自适应状态表格 -->
        <div class="adaptation-table-container">
          <DataTable
            :value="bcuAdaptTableData"
            responsiveLayout="scroll"
            :showGridlines="true"
            :scrollable="true"
            scrollHeight="300px"
          >
            <Column field="bcu" :header="t('addressAdapt.bcu.tableHeaders.bcu')">
              <template #body="slotProps">
                <span>{{ slotProps.data.bcu }}</span>
              </template>
            </Column>

            <Column field="status" :header="t('addressAdapt.bcu.tableHeaders.status')">
              <template #body="slotProps">
                <span>{{
                  locale === 'zh'
                    ? slotProps.data.status
                    : te(`addressAdapt.bcu.messageMap.${slotProps.data.status}`)
                      ? t(`addressAdapt.bcu.messageMap.${slotProps.data.status}`)
                      : slotProps.data.status
                }}</span>
              </template>
            </Column>

            <Column field="error" :header="t('addressAdapt.bcu.tableHeaders.error')">
              <template #body="slotProps">
                <div
                  v-if="slotProps.data.error && slotProps.data.status === 'BCU地址自适应失败'"
                  class="failure-reason-cell"
                >
                  <span>{{
                    locale === 'zh'
                      ? slotProps.data.error
                      : te(`addressAdapt.bcu.messageMap.${slotProps.data.error}`)
                        ? t(`addressAdapt.bcu.messageMap.${slotProps.data.error}`)
                        : slotProps.data.error
                  }}</span>
                </div>
                <span v-else class="no-failure-reason">-</span>
              </template>
            </Column>

            <Column field="timestamp" :header="t('addressAdapt.bcu.tableHeaders.timestamp')">
              <template #body="slotProps">
                <span v-if="slotProps.data.timestamp" class="timestamp">{{
                  slotProps.data.timestamp
                }}</span>
                <span v-else class="no-timestamp">-</span>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
      <div class="card">
        <h5>{{ t('addressAdapt.bmu.title') }}</h5>
        <!--  {{ lastManualSelectedIp }} -->
        <div style="display: flex; align-items: center; margin-bottom: 1rem">
          <label for="ipList">{{ t('addressAdapt.bmu.bcuSelect') }}：</label>
          <MultiSelect
            v-model="selectedBCUs"
            :options="ipOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('addressAdapt.bmu.bcuSelectPlaceholder')"
            class="flex-1"
            :maxSelectedLabels="3"
            selectedItemsLabel="{0} BCU已选择"
          />
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 1rem; gap: 1rem">
          <div style="display: flex; align-items: center; flex: 1; gap: 0.5rem">
            <label for addressBMUObj.addressStart>{{ t('addressAdapt.bmu.addressStart') }}：</label>
            <InputText
              v-model="addressBMUObj.addressStart"
              :placeholder="t('addressAdapt.bmu.addressStartPlaceholder')"
              style="flex: 1"
            />
          </div>
          <div style="display: flex; align-items: center; flex: 1; gap: 0.5rem">
            <label for addressBMUObj.numBMU>{{ t('addressAdapt.bmu.bmuNum') }}：</label>
            <InputText
              v-model="addressBMUObj.numBMU"
              :placeholder="t('addressAdapt.bmu.bmuNumPlaceholder')"
              style="flex: 1"
            />
          </div>
        </div>
        <div class="button-and-stats-container">
          <Button
            :label="isAdapting ? '自适应中...' : t('addressAdapt.bmu.startButton')"
            @click="sendBMUValue"
            :disabled="!bmuValid || isAdapting || hasAnyActiveAdaptation"
            :icon="isAdapting ? 'pi pi-spin pi-spinner' : 'pi pi-play'"
            :loading="isAdapting"
            severity="primary"
            class="start-button"
          />

          <!-- 状态统计信息 -->
          <div v-if="statusSummary.total > 0 && !isAdapting" class="status-summary">
            <div class="summary-item total">
              <span class="summary-label">{{ t('addressAdapt.bmu.statusLabels.total') }}:</span>
              <span class="summary-value">{{ statusSummary.total }}</span>
            </div>
            <div class="summary-item success">
              <span class="summary-label">{{ t('addressAdapt.bmu.statusLabels.success') }}:</span>
              <span class="summary-value">{{ statusSummary.success }}</span>
            </div>
            <div class="summary-item failed">
              <span class="summary-label">{{ t('addressAdapt.bmu.statusLabels.failed') }}:</span>
              <span class="summary-value">{{ statusSummary.failed }}</span>
            </div>
            <div class="summary-item pending">
              <span class="summary-label">{{ t('addressAdapt.bmu.statusLabels.pending') }}:</span>
              <span class="summary-value">{{ statusSummary.pending }}</span>
            </div>
          </div>
        </div>

        <!-- BMU自适应状态表格 -->
        <div class="adaptation-table-container">
          <DataTable
            :value="tableData"
            responsiveLayout="scroll"
            :showGridlines="true"
            :scrollable="true"
            scrollHeight="300px"
          >
            <Column field="bcu" :header="t('addressAdapt.bmu.tableHeaders.bcu')">
              <template #body="slotProps">
                <span>{{ slotProps.data.bcu }}</span>
                <!--  <span v-if="slotProps.data.isSelected" class="selected-badge">已选择</span> -->
              </template>
            </Column>

            <Column field="status" :header="t('addressAdapt.bmu.tableHeaders.status')">
              <template #body="slotProps">
                <!--  <i :class="getStatusIcon(slotProps.data.status)" :style="{ color: getStatusColor(slotProps.data.status) }"></i> -->
                <span>{{
                  locale === 'zh'
                    ? slotProps.data.status
                    : te(`addressAdapt.bmu.messageMap.${slotProps.data.status}`)
                      ? t(`addressAdapt.bmu.messageMap.${slotProps.data.status}`)
                      : slotProps.data.status
                }}</span>
              </template>
            </Column>

            <Column
              field="failureReason"
              :header="t('addressAdapt.bmu.tableHeaders.failureReason')"
            >
              <template #body="slotProps">
                <div
                  v-if="
                    slotProps.data.failureReason && slotProps.data.status === 'BMU自适应地址失败'
                  "
                  class="failure-reason-cell"
                >
                  <span>{{
                    locale === 'zh'
                      ? slotProps.data.failureReason
                      : te(`addressAdapt.bmu.messageMap.${slotProps.data.failureReason}`)
                        ? t(`addressAdapt.bmu.messageMap.${slotProps.data.failureReason}`)
                        : slotProps.data.failureReason
                  }}</span>
                </div>
                <span v-else class="no-failure-reason">-</span>
              </template>
            </Column>

            <Column field="timestamp" :header="t('addressAdapt.bmu.tableHeaders.timestamp')">
              <template #body="slotProps">
                <span v-if="slotProps.data.timestamp" class="timestamp">{{
                  slotProps.data.timestamp
                }}</span>
                <span v-else class="no-timestamp">-</span>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
.sectionIp {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
}
.sectionDisplay {
  margin-top: 3rem;
  display: flex;
  gap: 1rem;
  width: 100%;
}
/* 2. 给三个子块分别设置 flex 比例 1 : 1 : 2 */
.sectionDisplay > div:nth-child(1) {
  flex: 1; /* 占 1 份 */
  min-width: 0; /* 防止内部内容撑破布局 */
}

.sectionDisplay > div:nth-child(2) {
  flex: 1; /* 占 1 份 */
  min-width: 0;
}

.section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
}
.error-text {
  color: #ff4444;
  font-size: 0.8rem;
  margin: 0.2rem 0;
}
.status-display {
  margin-top: 0.5rem;
  animation: fadeIn 0.3s ease-in;
}

/* 移除自定义字体颜色样式，使用默认样式 */

.no-results {
  font-style: italic;
  color: #888;
}

/* 按钮和统计信息容器样式 */
.button-and-stats-container {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin: 1rem 0;
}

.start-button {
  flex-shrink: 0;
}

/* 状态统计样式 */
.status-summary {
  display: flex;
  gap: 1rem;
  align-items: center;
  border-radius: 0.5rem;
  border: 1px solid #ffffff88;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

/* .summary-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
} */

.summary-label {
  font-weight: bold;
}

.summary-value {
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  min-width: 1.5rem;
  text-align: center;
}

/* 总计样式 */
/* .summary-item.total .summary-value {
  color: #495057;
} */

/* 成功样式 */
.summary-item.success .summary-value {
  color: #28a745;
  font-weight: bold;
}

.summary-item.success .summary-label {
  color: #28a745;
  font-weight: bold;
}

/* 失败样式 */
.summary-item.failed .summary-value {
  color: #dc3545;
}

.summary-item.failed .summary-label {
  color: #dc3545;
}

/* 进行中样式 */
.summary-item.pending .summary-value {
  color: #ffc107;
}

.summary-item.pending .summary-label {
  color: #ffc107;
}

/* 表格容器样式 */
.adaptation-table-container {
  margin-top: 1rem;
}

/* BCU单元格样式 */
.bcu-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
/* 失败原因单元格样式 */
.failure-reason-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
