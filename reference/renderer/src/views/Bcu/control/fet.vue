<script setup>
import {
  ref,
  watch,
  onMounted,
  computed,
  watchEffect,
  reactive,
  onBeforeMount,
  onBeforeUnmount,
  nextTick
} from 'vue'
import { usePendingValueStore } from '../../../../../stores/controlPendingValue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'
const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()
import didoControl from './didoControl.vue'
import dido from '../DIDO/dido.vue'
import { CORRECT_PASSWORD1 } from './pwd.js'
const store = usePendingValueStore() // 获取 Pinia store 实例
// 当 localPendingValue 变化时，更新 Pinia store 中的值
// 当控件的 pendingValue 发生变化时，更新 Pinia store
import { useIpStore } from '../../../../../stores/ipStore.js'
const ipStore = useIpStore() // 获取 Pinia store

// DIDO 数据管理 - 使用dido.vue的数据结构
const DataDIDO = ref([]) // 存储 DIDO 数据
let listenerId = ref(null)
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})

// BMU产品编码编辑相关数据 - 仅用于引用didoControl组件
const didoControlRef = ref(null)

// 初始化DIDO数据
const initDIDOData = () => [
  {
    classification: 'DI反馈',
    element: [
      { label: 'DI1', value: 0 },
      { label: 'DI2', value: 0 },
      { label: 'DI3', value: 0 },
      { label: 'DI4', value: 0 },
      { label: 'DI5', value: 0 },
      { label: 'DI6', value: 0 },
      { label: 'DI7', value: 0 },
      { label: 'DI8', value: 0 },
      { label: 'DI9', value: 0 },
      { label: 'DI10', value: 0 },
      { label: 'DI11', value: 0 },
      { label: 'BMU1 DI1', value: 0 },
      { label: 'BMU1 DI2', value: 0 },
      { label: 'BMU2 DI1', value: 0 },
      { label: 'BMU2 DI2', value: 0 }
    ]
  },
  {
    classification: 'DO反馈',
    element: [
      { label: 'DO1', value: 0 },
      { label: 'DO2', value: 0 },
      { label: 'DO3', value: 0 },
      { label: 'DO4', value: 0 },
      { label: 'DO5', value: 1 },
      { label: 'DO6', value: 0 },
      { label: 'DO7', value: 1 },
      { label: 'DO8', value: 0 }
    ]
  }
]

// 监听IP变化 - DIDO数据
watch(
  () => ipStore.selectedIp,
  (newIp) => {
    DataDIDO.value = state.deviceData[newIp]?.['update-FC04DIDO'] || initDIDOData()
  },
  { immediate: true }
)

// 获取状态样式类
const getStatusClass = (value) => {
  return value === 1 ? 'status-active' : 'status-inactive'
}

// 处理数据的计算属性 - 使用dido.vue的数据结构
const formatItem = (item) => {
  if (!item) return { label: '', value: '' }
  return {
    label: item.label,
    value: item.value === 0 ? 0 : item.value || '-' // 明确保留0值
  }
}

const processedData = computed(() => {
  // 安全获取数据源
  const diItems = DataDIDO.value.find((i) => i.classification === 'DI反馈')?.element || []
  const doItems = DataDIDO.value.find((i) => i.classification === 'DO反馈')?.element || []

  // 优化后的数据格式化
  const maxLength = Math.max(diItems.length, doItems.length)
  const result = []
  for (let i = 0; i < maxLength; i++) {
    const di = formatItem(diItems[i])
    const dO = formatItem(doItems[i])

    result.push({
      diParamLabel: di.label,
      diValue: di.value,
      doParamLabel: dO.label,
      doValue: dO.value
    })
  }
  return result
})

// DIDO事件监听器 - 使用dido.vue的事件处理逻辑
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04DIDO')
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (!state.deviceData[deviceIp]) {
      state.deviceData[deviceIp] = {}
    }
    // 存储数据
    state.deviceData[deviceIp][event] = Arg.Arg
    // 如果当前选择的 IP，更新数据
    if (deviceIp === ipStore.selectedIp) {
      DataDIDO.value = Arg.Arg
      localStorage.setItem(`update-FC04DIDO-${deviceIp}`, JSON.stringify(DataDIDO.value))
    }
  }
  window.electron.ipcRenderer.on('update-FC04DIDO', listenerId.value)
}

const MODULE_NAME = 'DIDO'
// 开始读取DIDO数据
const startReading = () => {
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}

// 停止读取DIDO数据
const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
const DEVICE_CONFIG = computed(() => ({
  C000: {
    label: t('deviceControl.C000.label'),
    options: [
      { label: t('deviceControl.C000.options.invalid'), value: 0 },
      { label: t('deviceControl.C000.options.chargeOperation'), value: 1 },
      { label: t('deviceControl.C000.options.dischargeOperation'), value: 2 },
      { label: t('deviceControl.C000.options.disconnectBus'), value: 3 },
      { label: t('deviceControl.C000.options.selfTest'), value: 4 }
    ]
  },
  C002: {
    label: t('deviceControl.C002.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C002.options.startTest'), value: 0x5bb5 },
      { label: t('deviceControl.C002.options.stopTest'), value: 0x1221 }
    ]
  },
  C003: {
    label: t('deviceControl.C003.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C003.options.testMode'), value: 0x5bb5 },
      { label: t('deviceControl.C003.options.normalMode'), value: 0x1221 }
    ]
  },
  C004: {
    label: t('deviceControl.C004.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C004.options.enable'), value: 0x5bb5 },
      { label: t('deviceControl.C004.options.disable'), value: 0x1221 }
    ]
  },
  C00A: {
    label: t('deviceControl.C00A.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C00A.options.clearAllFaults'), value: 0x0000 },
      { label: t('deviceControl.C00A.options.clearChargingFault'), value: 0x0001 },
      { label: t('deviceControl.C00A.options.clearDischargingFault'), value: 0x0002 },
      { label: t('deviceControl.C00A.options.clearInsulationFault'), value: 0x0003 },
      { label: t('deviceControl.C00A.options.clearContactorFault'), value: 0x0004 },
      { label: t('deviceControl.C00A.options.clearPCSCommFault'), value: 0x0005 }
    ]
  },
  C00B: {
    label: t('deviceControl.C00B.label'),
    class1: t('deviceControl.C00B.C00BLabelBasic'),
    class2: t('deviceControl.C00B.C00BLabelFactory'),
    bitwise: true,
    options: [
      { label: t('deviceControl.C00B.options.systemParams'), bit: 0 },
      { label: t('deviceControl.C00B.options.cellCalibration'), bit: 1 },
      { label: t('deviceControl.C00B.options.clusterDiagnosis'), bit: 2 },
      { label: t('deviceControl.C00B.options.packDiagnosis'), bit: 3 },
      { label: t('deviceControl.C00B.options.cellDiagnosis'), bit: 4 },
      { label: t('deviceControl.C00B.options.saveRealTimeData'), bit: 5 },
      { label: t('deviceControl.C00B.options.soxParams'), bit: 6 },
      { label: t('deviceControl.C00B.options.sopMap'), bit: 7 },
      { label: t('deviceControl.C00B.options.factoryCalibration'), bit: 8 },
      { label: t('deviceControl.C00B.options.eventRecordFlag'), bit: 9 },
      { label: t('deviceControl.C00B.options.systemRuntime'), bit: 10 },
      { label: t('deviceControl.C00B.options.configParam'), bit: 11 }
    ]
  },
  C00D: {
    label: t('deviceControl.C00D.label'),
    bitwise: false,
    options: [{ label: t('deviceControl.C00D.options.reset'), value: 0x5bb5 }]
  },
  C00E: {
    label: t('deviceControl.C00E.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C00E.options.start'), value: 0x5bb5 },
      { label: t('deviceControl.C00E.options.stop'), value: 0x1221 }
    ]
  },
  C00F: {
    label: t('deviceControl.C00F.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C00F.options.start'), value: 0x5bb5 },
      { label: t('deviceControl.C00F.options.stop'), value: 0x1221 }
    ]
  },
  C010: {
    label: t('deviceControl.C010.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C010.options.start'), value: 0x5bb5 },
      { label: t('deviceControl.C010.options.stop'), value: 0x1221 }
    ]
  },
  C011: {
    label: t('deviceControl.C011.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C011.options.start'), value: 0x5bb5 },
      { label: t('deviceControl.C011.options.stop'), value: 0x1221 }
    ]
  },
  C012: {
    label: t('deviceControl.C012.label'),
    bitwise: false,
    inputType: 'number',
    defaultValue: 0
  },
  C013: {
    label: t('deviceControl.C013.label'),
    bitwise: false,
    inputType: 'number',
    defaultValue: 0
  },
  CAF1: {
    label: t('deviceControl.CAF1.label'),
    bitwise: false,
    inputType: 'number',
    defaultValue: 0
  },
  D000: {
    label: t('deviceControl.bmuNumber'),
    bitwise: false,
    inputType: 'number',
    defaultValue: 1,
    min: 1,
    max: 32
  },
  D001: {
    label: t('deviceControl.productCode'),
    bitwise: false,
    inputType: 'hex-array',
    defaultValue: ['0000', '0000', '0000', '0000', '0000', '0000', '0000'],
    registers: 7
  }
}))
const buildControlArray = (config) => {
  const arr = []
  Object.entries(config).forEach(([addr, conf]) => {
    if (addr === 'C00B') {
      // 拆分bit0~bit7和bit8~bit10
      const firstGroup = conf.options.filter((opt) => opt.bit >= 0 && opt.bit <= 7 && opt.bit !== 5)
      const secondGroup = conf.options.filter((opt) => opt.bit >= 8 || opt.bit === 5)
      arr.push({
        address: `0x${addr.toLowerCase()}`,
        classification: conf.class1,
        element: [
          {
            label: t('deviceControl.C00B.C00BLabelBasic'),
            writeValue: t('deviceControl.C000.options.invalid'),
            pendingValue: [],
            options: firstGroup,
            bitwise: true
          }
        ]
      })
      arr.push({
        address: `0x${addr.toLowerCase()}`,
        classification: conf.class2,
        element: [
          {
            label: t('deviceControl.C00B.C00BLabelFactory'),
            writeValue: t('deviceControl.C000.options.invalid'),
            pendingValue: [],
            options: secondGroup,
            bitwise: true
          }
        ]
      })
    } else if (addr === 'D001') {
      // 特殊处理D001：创建组合控件，包含BMU编号和7个产品编码输入框
      const d000Config = config.D000
      const d001Config = conf
      arr.push({
        address: '0xd000-0xd007',
        classification: t('deviceControl.bmuAndProductCode'),
        element: [
          {
            label: d000Config.label,
            writeValue: '',
            pendingValue: d000Config.defaultValue,
            inputType: d000Config.inputType,
            min: d000Config.min,
            max: d000Config.max
          },
          {
            label: d001Config.label,
            writeValue: '',
            pendingValue: d001Config.defaultValue,
            inputType: d001Config.inputType,
            registers: d001Config.registers
          }
        ]
      })
    } else if (addr === 'D000') {
      // D000已经在D001中处理，跳过单独处理
      return
    } else {
      // 其它项保持不变
      const defaultValue = conf.bitwise
        ? []
        : (() => {
            switch (addr) {
              case 'C000':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C000.options.chargeOperation')
                )?.value
              case 'C002':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C002.options.stopTest')
                )?.value
              case 'C003':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C003.options.testMode')
                )?.value
              case 'C004':
                return conf.options.find((o) => o.label === t('deviceControl.C004.options.enable'))
                  ?.value
              case 'C00A':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C00A.options.clearAllFaults')
                )?.value
              case 'C00C':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C00B.options.systemParams')
                )?.value
              case 'C00D':
                return conf.options.find((o) => o.label === t('deviceControl.C00D.options.reset'))
                  ?.value
              case 'C00E':
                return conf.options.find((o) => o.label === t('deviceControl.C00E.options.start'))
                  ?.value
              case 'C00F':
                return conf.options.find((o) => o.label === t('deviceControl.C00F.options.start'))
                  ?.value
              case 'C010':
                return conf.options.find((o) => o.label === t('deviceControl.C010.options.start'))
                  ?.value
              case 'C011':
                return conf.options.find((o) => o.label === t('deviceControl.C011.options.start'))
                  ?.value
              case 'C012':
                return conf.inputType === 'number' ? conf.defaultValue : 0
              case 'C013':
                return conf.inputType === 'number' ? conf.defaultValue : 0
              case 'CAF1':
                return conf.inputType === 'number' ? conf.defaultValue : 0
            }
          })()
      arr.push({
        address: `0x${addr.toLowerCase()}`,
        classification: conf.label,
        element: [
          {
            label: conf.label,
            writeValue: t('deviceControl.C000.options.invalid'),
            pendingValue: defaultValue,
            options: conf.options,
            bitwise: conf.bitwise || false,
            inputType: conf.inputType,
            min: conf.min,
            max: conf.max
          }
        ]
      })
    }
  })
  return arr
}
// 改为响应式引用
const controlArray = ref([])
// 使用 watchEffect 响应语言变化
watchEffect(() => {
  // 每次语言变化或设备配置变化时重建数组
  controlArray.value = buildControlArray(DEVICE_CONFIG.value)
})
const readingParam = async () => {
  try {
    const value = await window.electron.ipcRenderer.invoke('read-control-registers', {
      ip: ipStore.selectedIp
    })
    /* console.log('返回的控制参数', value) */
    const BASE_ADDR_C = 0xc000

    controlArray.value.forEach((row) => {
      // 跳过D000-D007组合寄存器，不需要读取
      if (row.address === '0xd000-0xd007') {
        return
      }

      // 处理普通寄存器
      const addrInt = parseInt(row.address, 16)
      let offset, baseAddr

      if (addrInt >= 0xc000 && addrInt < 0xd000) {
        baseAddr = BASE_ADDR_C
        offset = addrInt - baseAddr
      } else {
        return
      }

      if (offset < 0 || offset >= value.length) return
      const regVal = value[offset]
      const el = row.element[0]

      if (el.bitwise) {
        if (regVal === 0) {
          el.pendingValue = []
        } else {
          const selectedBits = []
          el.options.forEach((opt) => {
            // opt.bit 是一个数字，表示第几位
            if (((regVal >> opt.bit) & 1) === 1) {
              selectedBits.push(opt.bit)
            }
          })
          el.pendingValue = selectedBits
        }
      } else {
        if (el.options) {
          const matchedOption = el.options.find((opt) => opt.value === regVal)

          if (matchedOption) {
            el.pendingValue = regVal
          } else {
            const invalidOpt = el.options.find((opt) => opt.label === '无效')
            if (invalidOpt) {
              el.pendingValue = invalidOpt.value
            } else {
              el.pendingValue = null
            }
          }
        } else {
          // 对于没有选项的输入框类型，直接使用寄存器值
          el.pendingValue = regVal
        }
      }
    })
  } catch (e) {
    console.error(e)
  }
}
// 位运算处理器（
const bitwiseHandler = (selectedOptions) => {
  return selectedOptions.reduce((acc, cur) => acc | (1 << cur), 0)
}
// 组合寄存器发送处理
const sendCombinedRegisters = async (row) => {
  const d000Element = row.element[0] // BMU编号
  const d001Element = row.element[1] // 产品编码

  // 验证BMU编号
  const bmuNumber = d000Element.pendingValue
  if (bmuNumber === null || bmuNumber === undefined || bmuNumber < 1 || bmuNumber > 32) {
    toast.add({
      severity: 'error',
      summary: '参数错误',
      detail: t('deviceControl.bmuNumberRange'),
      life: 3000
    })
    return
  }

  // 验证产品编码
  const productCodes = d001Element.pendingValue
  if (!Array.isArray(productCodes) || productCodes.length !== 7) {
    toast.add({
      severity: 'error',
      summary: '参数错误',
      detail: t('deviceControl.productCodeCount'),
      life: 3000
    })
    return
  }

  // 验证每个产品编码是否为有效的16进制字符串
  for (let i = 0; i < productCodes.length; i++) {
    const code = productCodes[i]
    // 不允许空值，必须有输入
    if (code === '' || code === null || code === undefined) {
      toast.add({
        severity: 'error',
        summary: '参数错误',
        detail: `第${i + 1}个产品编码不能为空`,
        life: 3000
      })
      return
    }
    // 验证16进制格式
    if (!/^[0-9A-Fa-f]{1,4}$/i.test(code)) {
      toast.add({
        severity: 'error',
        summary: '参数错误',
        detail: `第${i + 1}${t('deviceControl.productCodeFormat')}`,
        life: 3000
      })
      return
    }
  }

  // 准备发送数据：8个寄存器的值
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]

  const registerValues = [bmuNumber - 1] // D000: BMU编号（下发值比输入值小1）
  productCodes.forEach((code) => {
    // 直接解析16进制数（已经验证过不为空）
    const numValue = parseInt(code, 16)
    registerValues.push(numValue) // D001-D007: 产品编码
  })

  // 构建发送负载
  const payload = targets.flatMap((ip) =>
    registerValues.map((value, index) => ({
      address: `0xd00${index.toString(16)}`,
      value: value,
      ip: ip
    }))
  )

  try {
    toast.add({
      severity: 'info',
      summary: `${t('deviceControl.writingBmuAndProduct')}${targets.length}个设备`,
      detail: targets.join('，'),
      life: 5000
    })

    const results = await Promise.all(
      targets.map(async (ip) => {
        const ipPayload = registerValues.map((value, index) => ({
          address: `0xd00${index.toString(16)}`,
          value: value,
          ip: ip
        }))
        try {
          const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', ipPayload)
          return { ip, ...res }
        } catch (err) {
          return { ip, success: false, error: err.message }
        }
      })
    )

    // 处理结果
    const okList = results.filter((r) => r.success).map((r) => r.ip)
    const failList = results.filter((r) => !r.success).map((r) => r.ip)

    if (okList.length) {
      toast.add({
        severity: 'success',
        summary: t('deviceControl.bmuProductWriteSuccess'),
        detail: okList.join('，'),
        life: 5000
      })
    }
    if (failList.length) {
      toast.add({
        severity: 'error',
        summary: t('deviceControl.bmuProductWriteFail'),
        detail: failList.join('，'),
        life: 5000
      })
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'BMU编号和产品编码写入失败',
      detail: err.message,
      life: 5000
    })
  }
}

// 发送逻辑统一处理
const sendWriteRequest = async (address, value) => {
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  toast.add({
    severity: 'info',
    summary: t('deviceControl.writeInProgress', { count: targets.length }),
    detail: targets.join('，'),
    life: 5000
  })
  // 2. 并行 invoke 每个 IP
  const results = await Promise.all(
    targets.map(async (ip) => {
      const payload = [{ address, value, ip }]
      try {
        // invoke 会自动管理 listener，返回主进程 handle 的结果
        const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
        return { ip, ...res }
      } catch (err) {
        return { ip, success: false, error: err.message }
      }
    })
  )

  // 3. 统一处理所有响应
  // 5. 一次性提示“完成” & “失败”
  const okList = results.filter((r) => r.success).map((r) => r.ip)
  const failList = results.filter((r) => !r.success).map((r) => r.ip)

  if (okList.length) {
    toast.add({
      severity: 'success',
      summary: t('deviceControl.writeComplete'),
      detail: okList.join('，'),
      life: 5000
    })
  }
  if (failList.length) {
    toast.add({
      severity: 'error',
      summary: t('deviceControl.writeFail'),
      detail: failList.join('，'),
      life: 5000
    })
  }
}

const showPwdDialog = ref(false)
const inputPwd = ref('')
const pwdError = ref(false)
const pendingSendRow = ref(null)
const cancelled = ref(false)
function cancelPwd() {
  showPwdDialog.value = false
  cancelled.value = true
}

function checkPwdAndSend() {
  if (inputPwd.value === CORRECT_PASSWORD1) {
    showPwdDialog.value = false
    pwdError.value = false
    sessionStorage.setItem('fetPagePassword', 'ok')
    if (pendingSendRow.value) {
      actuallySendRow(pendingSendRow.value)
      pendingSendRow.value = null
    }
  } else {
    pwdError.value = true
  }
}
let isConfirmDialogActive = ref(false)
function actuallySendRow(row) {
  if (isConfirmDialogActive.value) return // 防止多次弹窗
  isConfirmDialogActive.value = true
  confirm.require({
    message: t('deviceControl.confirmMessage', { name: row.classification }),
    header: t('deviceControl.confirmHeader'),
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      if (row.address === '0xd000-0xd007') {
        // 特殊处理组合寄存器：发送8个寄存器的值
        sendCombinedRegisters(row)
      } else {
        // 普通寄存器处理
        row.element.forEach((el) => {
          if (el.pendingValue === null || el.pendingValue === undefined) return
          const value = el.bitwise ? bitwiseHandler(el.pendingValue) : el.pendingValue
          sendWriteRequest(row.address, value)
        })
      }
      isConfirmDialogActive.value = false
    },
    reject: () => {
      isConfirmDialogActive.value = false
    },
    acceptLabel: t('password.confirm') || '确认', // 确保这里有合适的文本
    rejectLabel: t('password.cancel') || '取消', // 确保这里有合适的文本
    onHide: () => {
      isConfirmDialogActive.value = false
    }
  })
}
const onSendButtonClick = (row) => {
  // 对C00A、C00B、C011、C012、C013、CAF1加密码校验
  if (
    (row.address === '0xc00a' ||
      row.address === '0xc00b' ||
      row.address === '0xc012' ||
      row.address === '0xc013' ||
      row.address === '0xcaf1') &&
    sessionStorage.getItem('fetPagePassword') !== 'ok'
  ) {
    showPwdDialog.value = true
    inputPwd.value = ''
    pwdError.value = false
    pendingSendRow.value = row
    return
  }
  actuallySendRow(row)
}
// 状态持久化
const pendingStates = computed(() =>
  controlArray.value.flatMap((row) =>
    row.element.map((el) => ({
      classification: row.classification,
      label: el.label,
      value: el.pendingValue
    }))
  )
)
watch(pendingStates, (newVal) => {
  newVal.forEach(({ classification, label, value }) => {
    if (value) store.setPendingValue(classification, label, value)
  })
})
// 独立执行下拉选项，computed以响应语言变化
const indepOptions = computed(() => [
  { label: t('deviceControl.indepOptions.invalid'), value: 0b00 },
  { label: t('deviceControl.indepOptions.disconnect'), value: 0b01 },
  { label: t('deviceControl.indepOptions.connect'), value: 0b10 }
])

// 独立执行控制项，computed以响应语言变化
const independentControls = computed(() => [
  { key: 'mainPos', label: t('deviceControl.mainPos'), shift: 0 },
  { key: 'preCharge', label: t('deviceControl.preCharge'), shift: 2 },
  { key: 'mainNeg', label: t('deviceControl.mainNeg'), shift: 4 },
  { key: 'tripCoil', label: t('deviceControl.tripCoil'), shift: 6 },
  { key: 'fan', label: t('deviceControl.fan'), shift: 8 },
  { key: 'dcKM', label: t('deviceControl.dcKM'), shift: 10 }
])

// pending值单独管理，key为控制项key
const indepPending = reactive({
  mainPos: 0,
  preCharge: 0,
  mainNeg: 0,
  tripCoil: 0,
  fan: 0,
  dcKM: 0
})

// 3. 点击“执行”时，遍历所有 pending，合并成一个寄存器值并下发
const onExecuteIndependent = async () => {
  let value = 0
  independentControls.value.forEach((item) => {
    value |= indepPending[item.key] << item.shift
  })
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  const payload = targets.flatMap((ip) => [
    { address: '0xC000', value: 0, ip },
    { address: '0xC001', value, ip }
  ])
  try {
    console.log(payload)
    const result = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
    if (result.success || (Array.isArray(result) && result.every((r) => r.success))) {
      toast.add({
        severity: 'success',
        summary: t('deviceControl.independentCommandSuccess'),
        detail: targets.join('，'),
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: t('deviceControl.independentCommandFail'),
        detail: targets.join('，'),
        life: 3000
      })
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('deviceControl.independentCommandFail'),
      detail: err.message,
      life: 3000
    })
  }
}
onMounted(async () => {
  await nextTick()

  watchEffect(() => {
    controlArray.value.forEach((row) => {
      row.element.forEach(async (el) => {
        const savedPendingValue = await store.getPendingValue(row.classification, el.label)
        if (savedPendingValue !== null) {
          el.pendingValue = savedPendingValue
        }
      })
    })
  })
})

onBeforeMount(() => {
  const cacheKey = `update-FC04DIDO-${ipStore.selectedIp}`
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    DataDIDO.value = JSON.parse(cachedData)
  }
  registerListener() // 注册事件监听器
  startReading()
})

onBeforeUnmount(() => {
  // 注销事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04DIDO', listenerId.value)
    listenerId.value = null
  }
  stopReading()
})
const indepTableData = computed(() =>
  independentControls.value.map((ctrl) => ({
    key: ctrl.key,
    label: ctrl.label,
    value: indepPending[ctrl.key]
  }))
)

// 按钮禁用状态检查函数
const isButtonDisabled = (data) => {
  // 特殊处理组合寄存器（BMU编号+产品编码）
  if (data.address === '0xd000-0xd007') {
    const bmuElement = data.element[0] // BMU编号
    const productCodeElement = data.element[1] // 产品编码

    // 检查BMU编号是否有值
    const bmuValid =
      bmuElement.pendingValue !== null &&
      bmuElement.pendingValue !== undefined &&
      bmuElement.pendingValue !== ''

    // 检查所有产品编码是否都有值且格式正确
    const productCodesValid =
      Array.isArray(productCodeElement.pendingValue) &&
      productCodeElement.pendingValue.length === 7 &&
      productCodeElement.pendingValue.every(
        (code) => code !== '' && /^[0-9A-Fa-f]{1,4}$/i.test(code)
      )

    // 只有当BMU编号和所有产品编码都有效时才启用按钮
    return !(bmuValid && productCodesValid)
  }

  // 其他普通参数的验证逻辑
  return !data.element.some((el) => {
    if (el.bitwise) {
      return el.pendingValue?.length > 0
    } else if (el.options) {
      return el.pendingValue !== null
    } else {
      return el.pendingValue !== null && el.pendingValue !== undefined
    }
  })
}

// SOC参数下设功能
const socParams = reactive({
  clusterSOC: {
    address: '0x3200',
    value: 30,
    enabled: false
  },
  maxCellSOC: {
    address: '0x3201',
    value: 30,
    enabled: false
  },
  minCellSOC: {
    address: '0x3221',
    value: 30,
    enabled: false
  }
})

// 使能选项
const enableOptions = computed(() => [
  { label: t('deviceControl.socParams.enable'), value: true },
  { label: t('deviceControl.socParams.disable'), value: false }
])

// SOC参数表格数据
const socTableData = computed(() => [
  {
    key: 'clusterSOC',
    label: t('deviceControl.socParams.clusterSOC'),
    value: socParams.clusterSOC.value,
    enabled: socParams.clusterSOC.enabled
  },
  {
    key: 'maxCellSOC',
    label: t('deviceControl.socParams.maxCellSOC'),
    value: socParams.maxCellSOC.value,
    enabled: socParams.maxCellSOC.enabled
  },
  {
    key: 'minCellSOC',
    label: t('deviceControl.socParams.minCellSOC'),
    value: socParams.minCellSOC.value,
    enabled: socParams.minCellSOC.enabled
  }
])

// SOC参数下设按钮禁用状态
const isSocSendDisabled = computed(() => {
  // 至少有一个参数被使能才能下设
  return !Object.values(socParams).some((param) => param.enabled)
})

// 读取SOC参数实时值
const readSOCParams = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('read-soc-params', {
      ip: ipStore.selectedIp
    })

    if (result && result.frame1 && result.frame2) {
      // frame1: [簇显示SOC, 单体最大SOC]
      socParams.clusterSOC.value = result.frame1[0]
      socParams.maxCellSOC.value = result.frame1[1]
      // frame2: [单体最小SOC]
      socParams.minCellSOC.value = result.frame2[0]

      toast.add({
        severity: 'success',
        summary: t('deviceControl.socParams.readSuccess'),
        detail: `${t('deviceControl.socParams.clusterSOC')}: ${result.frame1[0]}%, ${t('deviceControl.socParams.maxCellSOC')}: ${result.frame1[1]}%, ${t('deviceControl.socParams.minCellSOC')}: ${result.frame2[0]}%`,
        life: 5000
      })
    } else if (result && result.error) {
      toast.add({
        severity: 'error',
        summary: t('deviceControl.socParams.readFail'),
        detail: result.error,
        life: 3000
      })
    }
  } catch (error) {
    console.error('读取SOC参数失败:', error)
    toast.add({
      severity: 'error',
      summary: t('deviceControl.socParams.readFail'),
      detail: error.message || '读取失败',
      life: 3000
    })
  }
}

// SOC参数下设
const onSendSOCParams = async () => {
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]

  // 只收集使能的参数
  const enabledParams = Object.entries(socParams)
    .filter(([key, param]) => param.enabled)
    .map(([key, param]) => {
      // 将字符串转换为数字
      const numValue = param.value === null || param.value === '' ? null : Number(param.value)
      return {
        address: param.address,
        value: numValue,
        label: t(`deviceControl.socParams.${key}`)
      }
    })

  if (enabledParams.length === 0) {
    toast.add({
      severity: 'warn',
      summary: t('deviceControl.socParams.noParamEnabled'),
      detail: t('deviceControl.socParams.pleaseEnableParam'),
      life: 3000
    })
    return
  }

  // 验证参数值范围
  for (const param of enabledParams) {
    if (
      param.value === null ||
      param.value === undefined ||
      isNaN(param.value) ||
      param.value < 0 ||
      param.value > 100
    ) {
      toast.add({
        severity: 'error',
        summary: t('deviceControl.socParams.invalidValue'),
        detail: `${param.label}: ${t('deviceControl.socParams.valueRange')}`,
        life: 3000
      })
      return
    }
  }

  try {
    // 对每个使能的参数分别发送指令
    const allResults = []
    for (const param of enabledParams) {
      // 对每个目标设备发送当前参数
      const results = await Promise.all(
        targets.map(async (ip) => {
          const payload = [
            {
              address: param.address,
              value: param.value,
              ip: ip
            }
          ]
          try {
            const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
            return { ip, param: param.label, ...res }
          } catch (err) {
            return { ip, param: param.label, success: false, error: err.message }
          }
        })
      )
      allResults.push(...results)

      // 每个参数发送后延迟一小段时间
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // 处理所有结果，只在最后弹出一次
    const successResults = allResults.filter((r) => r.success)
    const failResults = allResults.filter((r) => !r.success)

    // 构建结果汇总信息
    let resultMessage = ''

    if (successResults.length > 0) {
      // 按IP分组显示成功结果
      const successByIp = {}
      successResults.forEach((r) => {
        if (!successByIp[r.ip]) {
          successByIp[r.ip] = []
        }
        successByIp[r.ip].push(r.param)
      })

      const successDetails = Object.entries(successByIp)
        .map(([ip, params]) => `${ip}: ${params.join(', ')}`)
        .join('\n')
      resultMessage += `${t('deviceControl.socParams.sendSuccess')}\n${successDetails}`
    }

    if (failResults.length > 0) {
      // 按IP分组显示失败结果
      const failByIp = {}
      failResults.forEach((r) => {
        if (!failByIp[r.ip]) {
          failByIp[r.ip] = []
        }
        failByIp[r.ip].push(r.param)
      })

      const failDetails = Object.entries(failByIp)
        .map(([ip, params]) => `${ip}: ${params.join(', ')}`)
        .join('\n')

      if (resultMessage) resultMessage += '\n\n'
      resultMessage += `${t('deviceControl.socParams.sendFail')}\n${failDetails}`
    }

    // 只弹出一次结果
    toast.add({
      severity: failResults.length === 0 ? 'success' : failResults.length === allResults.length ? 'error' : 'warn',
      summary: t('deviceControl.socParams.sendComplete'),
      detail: resultMessage,
      life: 6000
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('deviceControl.socParams.sendFail'),
      detail: err.message,
      life: 5000
    })
  }
}

// 简化的16进制输入验证函数
const validateHexInput = (event, pendingValueArray, index) => {
  let input = event.target.value.toUpperCase()

  // 允许完全为空
  if (input === '') {
    pendingValueArray[index] = ''
    return
  }

  // 只允许16进制字符
  const hexRegex = /^[0-9A-F]*$/
  if (hexRegex.test(input)) {
    // 限制为最多4位16进制字符（2个字节）
    const truncatedHex = input.slice(0, 4)
    pendingValueArray[index] = truncatedHex
    event.target.value = truncatedHex
  } else {
    // 无效输入，恢复之前的值
    event.target.value = pendingValueArray[index]
  }
}
</script>

<template>
  <Dialog
    v-if="showPwdDialog"
    v-model:visible="showPwdDialog"
    :header="t('password.header') || '请输入密码'"
    :modal="true"
    :closable="false"
  >
    <div>
      <InputText v-model="inputPwd" type="password" @keyup.enter="checkPwdAndSend" autofocus />
      <Button
        :label="t('password.confirm') || '确定'"
        @click="checkPwdAndSend"
        style="margin-left: 0.5rem"
      />
      <Button
        :label="t('password.cancel') || '取消'"
        @click="cancelPwd"
        style="margin-left: 0.5rem"
        severity="secondary"
      />
      <div v-if="pwdError" style="color: red">{{ t('password.error') || '密码错误' }}</div>
    </div>
  </Dialog>
  <div class="card control">
    <div class="section control-main">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <h5>{{ t('deviceControl.controlInfo') }}</h5>
        <Button :label="t('deviceControl.paramRead')" @click="readingParam()" />
      </div>

      <DataTable :value="controlArray" showGridlines>
        <Column :header="t('deviceControl.deviceControl')">
          <template #body="{ data }">
            <div v-for="(el, index) in data.element" :key="index" class="param-container">
              <span class="param-label">{{ el.label }}</span>
              <div class="param-input">
                <!-- 动态组件选择（网页3的组件优化） -->
                <MultiSelect
                  v-if="el.bitwise"
                  v-model="el.pendingValue"
                  :options="el.options"
                  optionLabel="label"
                  optionValue="bit"
                  filter
                  :placeholder="t('deviceControl.selectReset')"
                  :maxSelectedLabels="0"
                  selectedItemsLabel="Selected {0} items"
                />
                <Dropdown
                  v-else-if="el.options"
                  v-model="el.pendingValue"
                  :options="el.options"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="t('deviceControl.selectAction')"
                />
                <div v-else-if="el.inputType === 'hex-array'" class="hex-input-group">
                  <InputText
                    v-for="(hexValue, index) in el.pendingValue"
                    :key="index"
                    v-model="el.pendingValue[index]"
                    :placeholder="'0000'"
                    maxlength="4"
                    class="hex-input"
                    @input="validateHexInput($event, el.pendingValue, index)"
                  />
                </div>
                <InputNumber
                  v-else
                  v-model="el.pendingValue"
                  :placeholder="t('deviceControl.inputValue')"
                  :min="el.min"
                  :max="el.max"
                  :useGrouping="false"
                />
              </div>
            </div>
          </template>
        </Column>
        <Column :header="t('deviceControl.operation')">
          <template #body="{ data }">
            <Button
              :label="t('deviceControl.send')"
              @click="onSendButtonClick(data)"
              :disabled="isButtonDisabled(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <div class="section dido-control">
      <div>
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <h5>{{ t('deviceControl.indepOptions.title') }}</h5>
            <Button
              :label="t('deviceControl.indepOptions.execute')"
              icon="pi pi-play"
              @click="onExecuteIndependent"
            />
          </div>
          <DataTable :value="indepTableData" showGridlines>
            <Column field="label" :header="t('deviceControl.indepOptions.contactor')" />
            <Column :header="t('deviceControl.indepOptions.action')">
              <template #body="{ data }">
                <Dropdown
                  v-model="indepPending[data.key]"
                  :options="indepOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="请选择"
                  class="indep-dropdown"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
      <didoControl ref="didoControlRef" />
    </div>
    <!-- 新增：接触器独立执行 -->

    <div class="section indep-control">
      <!-- DI信号状态显示 -->
      <div>
        <h5>{{ t('didoFeadback.title') }}</h5>
        <DataTable :value="processedData" scrollable scrollHeight="600px" showGridlines>
          <!-- DI参数列 -->
          <Column :header="t('didoFeadback.header1')">
            <template #body="{ data }">
              <span>{{ data.diParamLabel }}</span>
            </template>
          </Column>
          <!-- DI状态列 -->
          <Column :header="t('didoFeadback.header2')">
            <template #body="{ data }">
              <Tag
                v-if="data.diValue !== '-' && data.diValue != null && data.diValue !== ''"
                :value="data.diValue.toString()"
              />
            </template>
          </Column>
          <!-- DO参数列 -->
          <Column :header="t('didoFeadback.header3')">
            <template #body="{ data }">
              <span>{{ data.doParamLabel }}</span>
            </template>
          </Column>
          <!-- DO状态列 -->
          <Column :header="t('didoFeadback.header4')">
            <template #body="{ data }">
              <Tag
                v-if="data.doValue !== '-' && data.doValue != null && data.doValue !== ''"
                :value="data.doValue.toString()"
              />
            </template>
          </Column>
          <template #empty>
            <div class="p-4 text-center text-gray-500">暂无数据</div>
          </template>
        </DataTable>
      </div>

      <!-- SOC参数下设 -->
      <div style="margin-top: 1.5rem">
        <div style="display: flex; justify-content: space-between; align-items: center">
          <h5>{{ t('deviceControl.socParams.title') }}</h5>
          <div style="display: flex; gap: 0.5rem;margin-bottom: 0.5rem;">
            <Button
              :label="t('deviceControl.socParams.read')"
              icon="pi pi-refresh"
              @click="readSOCParams"
              severity="secondary"
            />
            <Button
              :label="t('deviceControl.socParams.send')"
              icon="pi pi-send"
              @click="onSendSOCParams"
              :disabled="isSocSendDisabled"
            />
          </div>
        </div>
        <DataTable :value="socTableData" showGridlines>
          <Column field="label" :header="t('deviceControl.socParams.paramName')" />
          <Column :header="t('deviceControl.socParams.paramValue')">
            <template #body="{ data }">
              <div class="soc-input-wrapper">
                <InputText
                  v-model="socParams[data.key].value"
                  class="soc-input"
                />
                <span >%</span>
              </div>
            </template>
          </Column>
          <Column :header="t('deviceControl.socParams.enableStatus')">
            <template #body="{ data }">
              <Dropdown
                v-model="socParams[data.key].enabled"
                :options="enableOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('deviceControl.socParams.selectEnable')"
                class="enable-dropdown"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.control {
  display: grid;
  grid-template-columns: 1.6fr 1.4fr 1.1fr;
  grid-template-rows: auto auto;
  gap: 0.5rem;
  padding: 1rem;
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
.indep-control h5 {
  margin-bottom: 0.5rem;
}
.indep-dropdown {
  width: 90px;
}

/* SOC参数下设样式 */
.soc-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.soc-input {
  width: 50px;
}

.soc-unit {
  font-size: 0.875rem;
  color: #666;
}

.enable-dropdown {
  width: 90px;
}

/* 参数容器样式 - 两端对齐 */
.param-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0;
}

.param-label {
  flex-shrink: 0;
}

.param-input {
  display: flex;
  align-items: center;
  flex-shrink: 1;
  min-width: 0;
  overflow: visible;
}

/* 16进制输入框组 */
.hex-input-group {
  display: flex;
  gap: 0.125rem;
  align-items: flex-start;
  flex-wrap: wrap;
  max-width: 100%;
  width: 100%;
  overflow: hidden;
  justify-content: flex-start;
}

.hex-input {
  width: 45px !important;
  min-width: 45px;
  max-width: 45px;
  text-align: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

/* 状态样式 */
.status-active {
  background-color: #10b981;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-inactive {
  background-color: #6b7280;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* 表格样式 */
.centered-table {
  margin-top: 0.5rem;
}

/* Tag组件样式 */
:deep(.p-tag) {
  width: 60px;
  justify-content: center;
  padding: 0.25rem 0.5rem;
}

@media (max-width: 1200px) {
  .control {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(3, auto);
  }
  .indep-control {
    max-width: 100%;
    min-width: 0;
  }

  .hex-input-group {
    gap: 0.1rem;
  }

  .hex-input {
    width: 40px !important;
    min-width: 40px;
    max-width: 40px;
  }
}

@media (max-width: 900px) {
  .hex-input-group {
    gap: 0.08rem;
    justify-content: flex-start;
  }

  .hex-input {
    width: 38px !important;
    min-width: 38px;
    max-width: 38px;
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  .param-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .param-input {
    width: 100%;
    justify-content: flex-start;
  }

  .hex-input-group {
    gap: 0.06rem;
    width: 100%;
  }

  .hex-input {
    width: 36px !important;
    min-width: 36px;
    max-width: 36px;
    padding: 0.2rem 0.1rem;
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .hex-input-group {
    gap: 0.05rem;
  }

  .hex-input {
    width: 32px !important;
    min-width: 32px;
    max-width: 32px;
    font-size: 0.7rem;
  }
}
</style>
