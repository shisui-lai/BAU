<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'
import { pickCluster } from '@/composables/core/data-processing/cluster/parseClusterSummary'
import { parseClusterSummary } from '@/composables/core/data-processing/cluster/parseClusterSummary'
import { useFactoryCalibParam } from '@/composables/core/data-processing/parameter-management/useFactoryCalibParam'
import { PAGE_PASSWORDS } from '@/configs/passwords'
import { useRouter } from 'vue-router'

// 只保留 PrimeVue 的 Dialog 组件，其余使用原生HTML组件
import Dialog from 'primevue/dialog'

const toast = useToast()
const router = useRouter()
const { t } = useI18n()

// 密码保护相关
const showPasswordDialog = ref(false)
const inputPwd = ref('')
const pwdError = ref(false)
const showCancelTip = ref(false)
const { selectedCluster } = useClusterSelect()

// 使用出厂校正参数处理器
const factoryCalibParamHandler = useFactoryCalibParam()

// 组件内部数据
const factoryCalibData = ref({})
const isDataReady = ref(false) // 数据就绪状态

// 参考modbus的变量命名
const inputK = ref(1) // 默认k值
const inputB = ref(0) // 默认b值
const storedX1 = ref('') // 存储第一个显示值
const storedX2 = ref('') // 存储第二个显示值
const calY1 = ref('') // 第一个实测值
const calY2 = ref('') // 第二个实测值

// 校准类型选项 - 固定选项，不依赖数据
const kbOptions = computed(() => [
  { label: t('analogCalibration.kb.currentChargeSmall'), k: 1, b: 0, raw: 'currentChargeSmall' },
  { label: t('analogCalibration.kb.currentDischargeSmall'), k: 1, b: 0, raw: 'currentDischargeSmall' },
  { label: t('analogCalibration.kb.currentChargeLarge'), k: 1, b: 0, raw: 'currentChargeLarge' },
  { label: t('analogCalibration.kb.currentDischargeLarge'), k: 1, b: 0, raw: 'currentDischargeLarge' },
  { label: t('analogCalibration.kb.prechargeVoltage'), k: 1, b: 0, raw: 'preChargeVoltage' },
  { label: t('analogCalibration.kb.clusterVoltage'), k: 1, b: 0, raw: 'clusterVoltage' }
])

// 下拉框选中的校准类型（默认选择第一个）
const selectedKBLabel = ref('')

// 根据下拉框选项获得对应的 kb 对象
const selectedKB = computed(() =>
  kbOptions.value.find((option) => option.label === selectedKBLabel.value)
)

// 当前显示的校准数据集 - 单行工作台模式，始终显示选中的数据
const calibrationDataSet = computed(() => {
  const selected = selectedKB.value || kbOptions.value[0]

  // 从出厂校正参数中获取实际的KB值
  const actualKB = getActualKBValues(selected.raw)

  return [{
    ...selected,
    kValue: actualKB.k,
    bValue: actualKB.b
  }]
})

// 从出厂校正参数中获取实际KB值
const getActualKBValues = (calibrationType) => {
  if (!factoryCalibData.value || Object.keys(factoryCalibData.value).length === 0) {
    return { k: '', b: '' }
  }

  // 根据校准类型查找对应的KB值
  let kKey = '', bKey = ''

  switch (calibrationType) {
    case 'currentChargeSmall':
      kKey = 'currentChargeSmallRangeK'
      bKey = 'currentChargeSmallRangeB'
      break
    case 'currentDischargeSmall':
      kKey = 'currentDischargeSmallRangeK'
      bKey = 'currentDischargeSmallRangeB'
      break
    case 'currentChargeLarge':
      kKey = 'currentChargeLargeRangeK'
      bKey = 'currentChargeLargeRangeB'
      break
    case 'currentDischargeLarge':
      kKey = 'currentDischargeLargeRangeK'
      bKey = 'currentDischargeLargeRangeB'
      break
    case 'preChargeVoltage':
      kKey = 'preChargeVoltageK'
      bKey = 'preChargeVoltageB'
      break
    case 'clusterVoltage':
      kKey = 'clusterVoltageK'
      bKey = 'clusterVoltageB'
      break
    default:
      return { k: '', b: '' }
  }

  // 从扁平化数据中获取KB值（MQTT层parseByTable已经除以scale）
  const rawK = factoryCalibData.value[kKey]
  const rawB = factoryCalibData.value[bKey]

  // 直接使用，不需要再除以scale（parseByTable已经处理过）
  // parseByTable: base[key] = rawVal / (fld.scale ?? 1)
  // 例如：设备存储1234，scale=1000，parseByTable返回1.234
  let k = '', b = ''

  // 确保即使是0值也能正确显示
  if (rawK !== undefined && rawK !== null) {
    k = rawK.toFixed(3)  // 直接使用，不需要再除以1000
  }

  if (rawB !== undefined && rawB !== null) {
    b = rawB.toFixed(1)  // 直接使用，不需要再除以10
  }

  return { k, b }
}

// 验证KB值有效性
const isValidKB = computed(() => {
  return (
    inputK.value !== null && inputB.value !== null && !isNaN(inputK.value) && !isNaN(inputB.value)
  )
})

// 当前实时值是否有效
const currentIVValid = computed(() => {
  const value = currentIVValue.value
  // 检查是否不为'-'且不为null/undefined
  return value !== null && value !== undefined && value !== '-'
})

// 是否可以计算KB值（参考modbus实现，只检查数据完整性）
const canCalculate = computed(() => {
  // 检查所有值都已填写且不为空字符串
  const hasX1 = storedX1.value !== null && storedX1.value !== '' && storedX1.value !== undefined
  const hasX2 = storedX2.value !== null && storedX2.value !== '' && storedX2.value !== undefined
  const hasY1 = calY1.value !== null && calY1.value !== '' && calY1.value !== undefined
  const hasY2 = calY2.value !== null && calY2.value !== '' && calY2.value !== undefined

  // 移除显示值相等检查，只在计算时检查实测值差异（与modbus一致）
  return hasX1 && hasX2 && hasY1 && hasY2
})



// 根据选中的校准类型获取对应的实时数据字段名
const selectedIVKey = computed(() => {
  if (!selectedKB.value) return null
  const raw = selectedKB.value.raw

  // 直接使用raw字段进行匹配，避免语言依赖
  if (raw === 'currentChargeSmall' || raw === 'currentDischargeSmall' || 
      raw === 'currentChargeLarge' || raw === 'currentDischargeLarge') {
    return 'current'
  } else if (raw === 'clusterVoltage') {
    return 'clusterVoltage'
  } else if (raw === 'preChargeVoltage') {
    return 'preChargeVoltage'
  }
  return null
})

// 当前实时显示值
const currentIVValue = computed(() => {
  const realData = currentRealTimeData.value
  const key = selectedIVKey.value

  if (!realData || !key) return null

  const value = realData[key]

  if (value === null || value === undefined) return null

  // 根据类型添加单位，确保返回带单位的字符串
  if (key === 'current') {
    return value.toFixed(2) + 'A'
  } else if (key === 'clusterVoltage' || key === 'preChargeVoltage') {
    return value.toFixed(2) + 'V'
  }

  return value.toString()
})

// 获取当前实时值（用于显示）
const getCurrentRealTimeValue = () => {
  return currentIVValue.value
}

// 捕获显示值1
const captureX1 = () => {
  if (!currentIVValid.value) return
  // 根据选中的校准类型获取对应的实时值
  storedX1.value = getCurrentRealTimeValue()
  toast.add({
    severity: 'success',
    summary: t('analogCalibration.toasts.capture1Success'),
    detail: t('analogCalibration.toasts.capture1Success'),
    life: 2000
  })
}

// 捕获显示值2
const captureX2 = () => {
  if (!currentIVValid.value) return
  storedX2.value = getCurrentRealTimeValue()
  toast.add({
    severity: 'success',
    summary: t('analogCalibration.toasts.capture2Success'),
    detail: t('analogCalibration.toasts.capture2Success'),
    life: 2000
  })
}

// 计算新的KB值（使用modbus的算法）
const calculateNewKB = () => {
  if (!canCalculate.value) {
    toast.add({
      severity: 'warn',
      summary: '数据不完整',
      detail: '请填写完整的校准点数据',
      life: 3000
    })
    return
  }

  const y1 = parseFloat(storedX1.value)  // 第一个点的显示值
  const y2 = parseFloat(storedX2.value)  // 第二个点的显示值
  const x1 = parseFloat(calY1.value)     // 第一个点的实测值
  const x2 = parseFloat(calY2.value)     // 第二个点的实测值

  // 输入验证
  if ([x1, x2, y1, y2].some((v) => isNaN(v))) {
    toast.add({
      severity: 'warn',
      summary: '数据格式错误',
      detail: '请输入有效的数字',
      life: 3000
    })
    return
  }

  try {

    // 支持相同显示值的校准逻辑
    const displayValueDiff = Math.abs(y1 - y2)
    const measuredValueDiff = Math.abs(x1 - x2)

    if (displayValueDiff < 0.0001) {
      // 显示值相同的情况：使用单点校准
      // 假设线性关系通过原点，k = x1/y1, b = 0
      if (Math.abs(y1) < 0.0001) {
        throw new Error('显示值为0时无法进行单点校准')
      }
      const k2 = x1 / y1
      const b2 = 0



      // 更新计算结果
      inputK.value = k2.toFixed(3)
      inputB.value = b2.toFixed(3)
    } else {
      // 显示值不同的情况：使用两点校准（modbus标准方式）
      // 检查实测值差异（防止计算异常）
      if (measuredValueDiff < 0.0001) {
        throw new Error(`实测值差异不足（|${x1}-${x2}| = ${measuredValueDiff} < 0.0001），请调整输入值`)
      }

      // 使用两点法校准公式：y = kx + b
      // k = (x2 - x1) / (y2 - y1)
      // b = x1 - k * y1
      const k2 = (x2 - x1) / (y2 - y1)
      const b2 = x1 - k2 * y1



      // 更新计算结果
      inputK.value = k2.toFixed(3)
      inputB.value = b2.toFixed(3)
    }


    toast.add({
      severity: 'success',
      summary: t('analogCalibration.toasts.calculateSuccess'),
      detail: `K=${inputK.value}, B=${inputB.value}`,
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('analogCalibration.toasts.calculateError'),
      detail: error.message,
      life: 3000
    })
  }
}

const sendCalibration = async () => {
  if (!isValidKB.value) {
    toast.add({
      severity: 'warn',
      summary: t('analogCalibration.errors.needCalculateKB'),
      detail: t('analogCalibration.errors.needCalculateKB'),
      life: 3000
    })
    return
  }

  if (!selectedCluster.value) {
    toast.add({
      severity: 'warn',
      summary: '设备未选择',
      detail: '请先选择要下设的设备',
      life: 3000
    })
    return
  }

  try {
    // 从selectedCluster.value解析blockId和clusterId
    const [blockId, clusterId] = selectedCluster.value.split('-')

    // 获取当前选中的校准类型
    const currentCalibType = selectedKB.value
    if (!currentCalibType) {
      throw new Error(t('analogCalibration.errors.noCalibType'))
    }

    // 验证输入值
    const kValue = parseFloat(inputK.value)
    const bValue = parseFloat(inputB.value)

    if (isNaN(kValue) || isNaN(bValue)) {
      throw new Error(t('analogCalibration.errors.invalidKB'))
    }

    // 检查数据是否就绪
    if (!isDataReady.value) {
      toast.add({
        severity: 'warn',
        summary: '数据未就绪',
        detail: t('analogCalibration.errors.noOriginalKB'),
        life: 3000
      })
      return
    }

    // 构造完整的电流电压校准参数数据对象
    // 使用设备实际值（不使用默认值）
    const calibrationData = {
      // 电流充电小量程校准 - 使用设备实际值
      currentChargeSmallRangeK: factoryCalibData.value.currentChargeSmallRangeK,
      currentChargeSmallRangeB: factoryCalibData.value.currentChargeSmallRangeB,
      // 电流放电小量程校准
      currentDischargeSmallRangeK: factoryCalibData.value.currentDischargeSmallRangeK,
      currentDischargeSmallRangeB: factoryCalibData.value.currentDischargeSmallRangeB,
      // 电流充电大量程校准
      currentChargeLargeRangeK: factoryCalibData.value.currentChargeLargeRangeK,
      currentChargeLargeRangeB: factoryCalibData.value.currentChargeLargeRangeB,
      // 电流放电大量程校准
      currentDischargeLargeRangeK: factoryCalibData.value.currentDischargeLargeRangeK,
      currentDischargeLargeRangeB: factoryCalibData.value.currentDischargeLargeRangeB,
      // 预充电压校准
      preChargeVoltageK: factoryCalibData.value.preChargeVoltageK,
      preChargeVoltageB: factoryCalibData.value.preChargeVoltageB,
      // 组端电压校准
      clusterVoltageK: factoryCalibData.value.clusterVoltageK,
      clusterVoltageB: factoryCalibData.value.clusterVoltageB,

      // 预留字段 - 使用设备实际值
      _reserve1: factoryCalibData.value._reserve1,
      _reserve2: factoryCalibData.value._reserve2,
      _reserve3: factoryCalibData.value._reserve3,
      _reserve4: factoryCalibData.value._reserve4,
      _reserve5: factoryCalibData.value._reserve5,
      _reserve6: factoryCalibData.value._reserve6,
      _reserve7: factoryCalibData.value._reserve7
    }

    // 根据选中的校准类型更新对应的K/B值
    // 注意：直接使用用户输入值，序列化函数会自动处理scale
    switch (currentCalibType.raw) {
      case 'currentChargeSmall':
        calibrationData.currentChargeSmallRangeK = kValue  // 直接使用用户输入值
        calibrationData.currentChargeSmallRangeB = bValue  // 直接使用用户输入值
        break
      case 'currentDischargeSmall':
        calibrationData.currentDischargeSmallRangeK = kValue
        calibrationData.currentDischargeSmallRangeB = bValue
        break
      case 'currentChargeLarge':
        calibrationData.currentChargeLargeRangeK = kValue
        calibrationData.currentChargeLargeRangeB = bValue
        break
      case 'currentDischargeLarge':
        calibrationData.currentDischargeLargeRangeK = kValue
        calibrationData.currentDischargeLargeRangeB = bValue
        break
      case 'preChargeVoltage':
        calibrationData.preChargeVoltageK = kValue
        calibrationData.preChargeVoltageB = bValue
        break
      case 'clusterVoltage':
        calibrationData.clusterVoltageK = kValue
        calibrationData.clusterVoltageB = bValue
        break
      default:
        throw new Error(t('analogCalibration.errors.unknownCalibType'))
    }

    console.log(`[IvCalibration] 下设数据构造完成:`)
    console.log(`  - 校准类型: ${currentCalibType.label}`)
    console.log(`  - 用户输入值: K=${kValue}, B=${bValue}`)
    console.log(`  - 完整校准数据:`, calibrationData)

    // 使用标准的参数序列化方法
    // 电流电压校准参数在表的开头，偏移为0，长度为38字节（19个寄存器）
    // 包含：6个KB值字段(12个寄存器) + 7个预留字段(7个寄存器) = 19个寄存器
    const startByteOffset = 0
    const registerCount = 19  // 19个寄存器（38字节）

    const serializedData = factoryCalibParamHandler.serializeFactoryCalibParamData(
      calibrationData,
      startByteOffset,
      registerCount
    )

    if (!serializedData) {
      throw new Error('参数数据序列化失败')
    }

    // 构建标准的MQTT payload：偏移量(2字节) + 数据长度(2字节) + 序列化数据
    const offsetBuffer = new ArrayBuffer(2)
    const lengthBuffer = new ArrayBuffer(2)
    const offsetDataView = new DataView(offsetBuffer)
    const lengthDataView = new DataView(lengthBuffer)

    offsetDataView.setUint16(0, startByteOffset, true)      // 偏移量（小端序）
    lengthDataView.setUint16(0, registerCount * 2, true)    // 数据长度（小端序）

    const offsetHexString = Array.from(new Uint8Array(offsetBuffer))
      .map(byte => byte.toString(16).padStart(2, '0')).join('')
    const lengthHexString = Array.from(new Uint8Array(lengthBuffer))
      .map(byte => byte.toString(16).padStart(2, '0')).join('')

    const finalPayload = offsetHexString + lengthHexString + serializedData

    console.log(`[IvCalibration] MQTT Payload构建完成，长度: ${finalPayload.length/2}字节`)

    // 发送MQTT下设命令
    const topic = `bms/host/s2d/b${blockId}/c${clusterId}/factory_calib_param_w`
    await window.electronAPI.mqttPublish(topic, finalPayload)

    toast.add({
      severity: 'success',
      summary: t('analogCalibration.toasts.sendSuccess'),
      detail: `${currentCalibType.label} ${t('analogCalibration.toasts.sendSuccess')}`,
      life: 3000
    })

    // 下设成功后清空输入框
    inputK.value = ''
    inputB.value = ''

    // 下设成功后自动读取一次验证
    setTimeout(() => {
      readFactoryCalibParam()
    }, 1000)

  } catch (error) {
    console.error('下设失败:', error)
    toast.add({
      severity: 'error',
      summary: '下设失败',
      detail: error.message || '下设过程中发生错误',
      life: 3000
    })
  }
}

// 数据处理（处理原始MQTT数据）
const handleFactoryCalibUpdate = (_event, mqttMessage) => {
  const { blockId, clusterId, data } = mqttMessage

  // 验证数据格式
  if (!data || typeof data !== 'object') {
    console.warn('[Calibration] 接收到无效的MQTT数据:', mqttMessage)
    return
  }

  const deviceFrameKey = `${blockId}-${clusterId}`
  const expectedFrameKey = selectedCluster.value

  if (deviceFrameKey === expectedFrameKey) {
    // 数据已经在MQTT层解析完成，直接使用
    const parsedData = { data: data }

    if (parsedData && parsedData.data) {
      // 定义电流电压校准参数的字段列表
      const calibrationKeys = [
        'currentChargeSmallRangeK', 'currentChargeSmallRangeB',
        'currentDischargeSmallRangeK', 'currentDischargeSmallRangeB',
        'currentChargeLargeRangeK', 'currentChargeLargeRangeB',
        'currentDischargeLargeRangeK', 'currentDischargeLargeRangeB',
        'preChargeVoltageK', 'preChargeVoltageB',
        'clusterVoltageK', 'clusterVoltageB'
      ]

      // 过滤出电流电压校准参数
      const calibrationData = {}
      calibrationKeys.forEach(key => {
        if (parsedData.data[key] !== undefined) {
          calibrationData[key] = parsedData.data[key]
        }
      })

      // 同时检查预留字段
      for (let i = 1; i <= 7; i++) {
        const reserveKey = `_reserve${i}`
        if (parsedData.data[reserveKey] !== undefined) {
          calibrationData[reserveKey] = parsedData.data[reserveKey]
        }
      }

      factoryCalibData.value = calibrationData
      isDataReady.value = true // 数据加载完成
    } else {
      factoryCalibData.value = {}
      isDataReady.value = false // 数据未就绪
    }
  }
}

// 使用computed来响应式获取实时数据
const currentRealTimeData = computed(() => {
  if (!selectedCluster.value) {
    return { current: null, clusterVoltage: null, preChargeVoltage: null }
  }

  // 使用pickCluster获取系统信息
  const clusterData = pickCluster(selectedCluster.value, ['系统信息'])

  if (!clusterData.length) {
    return { current: null, clusterVoltage: null, preChargeVoltage: null }
  }

  const systemInfo = clusterData.find(section => section.class === '系统信息')
  if (!systemInfo || !systemInfo.element) {
    return { current: null, clusterVoltage: null, preChargeVoltage: null }
  }

  // 查找簇电流、簇电压、预充电压
  let current = null, clusterVoltage = null, preChargeVoltage = null

  // 中文标签到字段名的映射（数据解析层始终使用中文标签）
  const LABEL_TO_FIELD_MAP = {
    '簇电流(A)': 'current',
    '簇电压(V)': 'clusterVoltage', 
    '预充电压(V)': 'preChargeVoltage'
  }

  systemInfo.element.forEach(item => {
    const fieldName = LABEL_TO_FIELD_MAP[item.label]
    if (fieldName && item.value !== '-') {
      const value = parseFloat(item.value)
      if (fieldName === 'current') {
        current = value
      } else if (fieldName === 'clusterVoltage') {
        clusterVoltage = value
      } else if (fieldName === 'preChargeVoltage') {
        preChargeVoltage = value
      }
    }
  })

  return { current, clusterVoltage, preChargeVoltage }
})

// CLUSTER_SUMMARY事件处理函数
const onClusterSummary = (_e, msg) => {
  parseClusterSummary(msg)
}

// 读取出厂校正参数
const readFactoryCalibParam = () => {
  console.log('[Calibration Debug] readFactoryCalibParam 开始执行')
  console.log('[Calibration Debug] selectedCluster.value:', selectedCluster.value)
  
  if (!selectedCluster.value) {
    console.log('[Calibration Debug] selectedCluster.value 为空，无法发送MQTT请求')
    return
  }

  const [blockId, clusterId] = selectedCluster.value.split('-')
  const mqttTopic = `bms/host/s2d/b${blockId}/c${clusterId}/factory_calib_param_r`
  
  console.log('[Calibration Debug] 准备发送MQTT请求')
  console.log('[Calibration Debug] MQTT Topic:', mqttTopic)
  console.log('[Calibration Debug] MQTT Payload:', 'ff')

  window.electronAPI.mqttPublish(mqttTopic, 'ff')
  
  console.log('[Calibration Debug] MQTT请求已发送')
}

// 定时器管理
let readingTimer = null

// 启动周期读取
const startPeriodicReading = () => {
  console.log('[Calibration Debug] startPeriodicReading 开始执行')
  console.log('[Calibration Debug] selectedCluster.value:', selectedCluster.value)
  
  // 立即读取一次
  readFactoryCalibParam()

  // 启动5秒周期读取
  readingTimer = setInterval(() => {
    console.log('[Calibration Debug] 定时器触发，准备读取')
    readFactoryCalibParam()
  }, 5000)
}

// 停止周期读取
const stopPeriodicReading = () => {
  if (readingTimer) {
    clearInterval(readingTimer)
    readingTimer = null
  }
}

// 生命周期
// 密码验证函数
const checkPwd = () => {
  pwdError.value = false
  if (inputPwd.value === PAGE_PASSWORDS.CALIBRATION) {
    showPasswordDialog.value = false
    sessionStorage.setItem('calibrationPagePassword', 'ok')
    pwdError.value = false
    
    // 密码验证成功后，执行初始化逻辑
    console.log('[Calibration Debug] 密码验证成功，开始执行初始化逻辑')
    initializePage()
  } else {
    pwdError.value = true
  }
}

// 页面初始化逻辑（从onMounted中提取出来）
const initializePage = () => {
  // console.log('[Calibration Debug] initializePage 开始执行')
  
  // 监听出厂校正参数数据
  window.electron.ipcRenderer.on('FACTORY_CALIB_PARAM_R', handleFactoryCalibUpdate)

  // 监听CLUSTER_SUMMARY数据（用于实时数据更新）
  window.electron.ipcRenderer.on('CLUSTER_SUMMARY', onClusterSummary)

  // 直接启动读取
  isDataReady.value = false
  // console.log('[Calibration Debug] 准备启动周期读取')
  startPeriodicReading()
}

// 取消密码输入
const cancelPwd = () => {
  showPasswordDialog.value = false
  showCancelTip.value = true
  // 返回上一页
  setTimeout(() => {
    router.go(-1)
  }, 500)
}

onMounted(() => {
  // console.log('[Calibration Debug] onMounted 开始执行')
  
  // 初始化选中的校准类型
  selectedKBLabel.value = kbOptions.value[0].label
  console.log('[Calibration Debug] 初始化选中类型:', selectedKBLabel.value)
  
  // 密码保护检查
  const passwordStatus = sessionStorage.getItem('calibrationPagePassword')
  // console.log('[Calibration Debug] 密码状态:', passwordStatus)
  
  if (passwordStatus !== 'ok') {
    // console.log('[Calibration Debug] 密码验证未通过，显示密码对话框')
    showPasswordDialog.value = true
    return
  }

  // console.log('[Calibration Debug] 密码验证通过，继续执行')
  initializePage()
})

// keep-alive 激活时的处理
onActivated(() => {
  // 重置数据就绪状态
  isDataReady.value = false
  // 启动周期读取
  startPeriodicReading()
})

// keep-alive 失活时的处理
onDeactivated(() => {
  stopPeriodicReading()
})

onUnmounted(() => {
  stopPeriodicReading()

  // 清理事件监听器
  window.electron.ipcRenderer.removeAllListeners('FACTORY_CALIB_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_SUMMARY')
})
</script>

<template>
  <div class="page-wrapper">
    <div class="card">
    <!-- 校准类型选择区 -->
    <div class="mb-4">
      <label for="kb-select" class="form-label">{{ t('analogCalibration.selectLabel') }}</label>
      <select v-model="selectedKBLabel" id="kb-select" class="native-select">
        <option v-for="option in kbOptions" :key="option.label" :value="option.label">
          {{ option.label }}
        </option>
      </select>
    </div>
    <!-- 数据展示表格 -->
    <table class="calibration-table">
      <thead>
        <tr>
          <th>{{ t('analogCalibration.table.col.type') }}</th>
          <th>{{ t('analogCalibration.table.col.current') }}</th>
          <th>{{ t('analogCalibration.table.col.measured') }}</th>
          <th>{{ t('analogCalibration.table.col.displayed') }}</th>
          <th>{{ t('analogCalibration.table.col.original') }}</th>
          <th>{{ t('analogCalibration.table.col.new') }}</th>
          <th>{{ t('analogCalibration.table.col.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <!-- 校准类型 -->
          <td>
            <span class="font-semibold">{{ calibrationDataSet[0].label }}</span>
          </td>
          
          <!-- 实时显示值 -->
          <td>
            <span class="font-semibold text-primary">{{ currentIVValue ?? '-' }}</span>
          </td>
          
          <!-- 实测值输入 -->
          <td>
            <div class="captured-values">
              <div class="input-item">
                <label for="calY1">{{ t('analogCalibration.table.measured1') }}</label>
                <input v-model="calY1" type="text" id="calY1" class="native-input" />
              </div>
              <div class="input-item">
                <label for="calY2">{{ t('analogCalibration.table.measured2') }}</label>
                <input v-model="calY2" type="text" id="calY2" class="native-input" />
              </div>
            </div>
          </td>
          
          <!-- 捕获值显示 -->
          <td>
            <div class="captured-values">
              <div class="input-item">
                <label for="storedX1">{{ t('analogCalibration.table.display1') }}</label>
                <input v-model="storedX1" type="text" id="storedX1" disabled class="native-input" />
                <button 
                  @click="captureX1" 
                  :disabled="!currentIVValid" 
                  class="native-button"
                >
                  {{ t('analogCalibration.table.capture') }}
                </button>
              </div>
              <div class="input-item">
                <label for="storedX2">{{ t('analogCalibration.table.display2') }}</label>
                <input v-model="storedX2" type="text" id="storedX2" disabled class="native-input" />
                <button 
                  @click="captureX2" 
                  :disabled="!currentIVValid" 
                  class="native-button"
                >
                  {{ t('analogCalibration.table.capture') }}
                </button>
              </div>
            </div>
          </td>
          
          <!-- 原始KB值 -->
          <td>
            <div class="captured-values">
              <div class="input-item">
                <label for="originalK">{{ t('analogCalibration.table.k') }}</label>
                <input 
                  :value="isDataReady ? getActualKBValues(calibrationDataSet[0].raw).k : t('analogCalibration.loading')"
                  type="text"
                  id="originalK"
                  readonly
                  class="native-input"
                  :class="{ 'loading-text': !isDataReady }"
                />
              </div>
              <div class="input-item">
                <label for="originalB">{{ t('analogCalibration.table.b') }}</label>
                <input 
                  :value="isDataReady ? getActualKBValues(calibrationDataSet[0].raw).b : t('analogCalibration.loading')"
                  type="text"
                  id="originalB"
                  readonly
                  class="native-input"
                  :class="{ 'loading-text': !isDataReady }"
                />
              </div>
            </div>
          </td>
          
          <!-- 新KB值 -->
          <td>
            <div class="kb-input-container">
              <div class="captured-values">
                <div class="input-item">
                  <label for="inputK">{{ t('analogCalibration.table.k') }}</label>
                  <input v-model="inputK" type="text" id="inputK" class="native-input" />
                </div>
                <div class="input-item">
                  <label for="inputB">{{ t('analogCalibration.table.b') }}</label>
                  <input v-model="inputB" type="text" id="inputB" class="native-input" />
                </div>
              </div>
              <button 
                @click="calculateNewKB" 
                :disabled="!canCalculate" 
                class="native-button calculate-btn"
              >
                {{ t('analogCalibration.table.calculateNew') }}
              </button>
            </div>
          </td>
          
          <!-- 操作按钮 -->
          <td>
            <button 
              @click="sendCalibration" 
              :disabled="!isValidKB || !isDataReady" 
              class="native-button send-btn"
              :title="!isDataReady ? '等待设备数据加载中...' : ''"
            >
              {{ t('analogCalibration.table.send') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 密码保护对话框 -->
  <Dialog
    v-model:visible="showPasswordDialog"
    :closable="false"
    :modal="true"
    :header="t('analogCalibration.password.title')"
    :style="{ width: '25rem' }"
  >
    <div class="dialog-body">
      <input 
        v-model="inputPwd" 
        type="password" 
        @keyup.enter="checkPwd" 
        autofocus 
        class="native-input dialog-password-input"
        :placeholder="t('analogCalibration.password.title')"
      />
      <div class="dialog-buttons">
        <button 
          @click="checkPwd" 
          class="native-button primary-btn"
        >
          {{ t('analogCalibration.password.confirm') }}
        </button>
        <button 
          @click="cancelPwd" 
          class="native-button secondary-btn"
        >
          {{ t('analogCalibration.password.cancel') }}
        </button>
      </div>
      <div v-if="pwdError" class="error-message">
        {{ t('analogCalibration.password.error') }}
      </div>
    </div>
  </Dialog>

  <!-- 取消提示 -->
  <Dialog v-model:visible="showCancelTip" :closable="false" :modal="true" :style="{ width: '20rem' }">
    <span>{{ t('analogCalibration.password.cancelTip') }}</span>
  </Dialog>
  </div>
</template>


<style scoped>
/* 通用样式 */
.loading-text {
  color: #999 !important;
  font-style: italic;
}

.font-semibold {
  font-weight: 600;
}

.text-primary {
  color: #3b82f6;
}

/* 表格样式 */
.calibration-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--surface-card);
  border: 1px solid var(--surface-border);
  font-size: 0.875rem;
}

.calibration-table thead th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
  background-color: var(--surface-section);
  border-bottom: 2px solid var(--surface-border);
}

.calibration-table tbody tr {
  transition: background-color 0.2s;
}

.calibration-table tbody tr:hover {
  background-color: var(--surface-hover);
}

.calibration-table tbody tr:not(:last-child) td {
  border-bottom: 1px solid var(--surface-border);
}

.calibration-table tbody td {
  padding: 0.75rem 1rem;
  color: var(--text-color);
  vertical-align: middle;
}

/* 输入值容器 */
.captured-values {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.captured-values .input-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.captured-values .input-item label {
  min-width: 4rem;
  font-size: 0.875rem;
  margin-bottom: 0;
}

/* KB输入容器 */
.kb-input-container {
  display: flex;
  align-items: center;
}

/* 原生输入框样式 */
.native-input {
  width: 7rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-0);
  color: var(--text-color);
  font-size: 0.875rem;
  transition: all 0.2s;
  outline: none;
}

.native-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
}

.native-input:disabled {
  background-color: var(--surface-100);
  opacity: 0.6;
  cursor: not-allowed;
}

/* 原生按钮样式 */
.native-button {
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
  white-space: nowrap;
}

.native-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 按钮变体 */
.native-button.primary-btn {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.native-button.primary-btn:hover:not(:disabled) {
  background-color: var(--primary-600);
  border-color: var(--primary-600);
}

.native-button.secondary-btn {
  background-color: var(--surface-100);
  color: var(--text-color);
  border-color: var(--surface-300);
}

.native-button.secondary-btn:hover:not(:disabled) {
  background-color: var(--surface-200);
}

.native-button.send-btn {
  background-color: #10b981;
  color: white;
  border-color: #10b981;
}

.native-button.send-btn:hover:not(:disabled) {
  background-color: #059669;
  border-color: #059669;
}

.calculate-btn {
  margin-left: 0.5rem;
  white-space: nowrap;
}

/* 原生下拉框样式 */
.native-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-0);
  color: var(--text-color);
  font-size: 0.875rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23495057' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
  transition: all 0.2s;
  outline: none;
}

.native-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
}

/* 工具类 */
.mb-4 {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.w-100 {
  width: 100%;
}

/* PrimeVue Dialog 内部样式 */
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dialog-password-input {
  width: 100%;
}

.dialog-buttons {
  display: flex;
  gap: 0.5rem;
}

.dialog-buttons button {
  flex: 1;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  text-align: center;
  margin-top: 0.5rem;
}
</style>
