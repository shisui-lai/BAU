<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'
import { pickCluster } from '@/composables/core/data-processing/cluster/parseClusterSummary'
import { parseClusterSummary } from '@/composables/core/data-processing/cluster/parseClusterSummary'

import { useFactoryCalibParam } from '@/composables/core/data-processing/parameter-management/useFactoryCalibParam'

import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const toast = useToast()
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
const kbOptions = ref([
  { label: '电流充电小量程校准', k: 1, b: 0, raw: 'currentChargeSmall' },
  { label: '电流放电小量程校准', k: 1, b: 0, raw: 'currentDischargeSmall' },
  { label: '电流充电大量程校准', k: 1, b: 0, raw: 'currentChargeLarge' },
  { label: '电流放电大量程校准', k: 1, b: 0, raw: 'currentDischargeLarge' },
  { label: '预充电压校准', k: 1, b: 0, raw: 'preChargeVoltage' },
  { label: '组端电压校准', k: 1, b: 0, raw: 'clusterVoltage' }
])

// 下拉框选中的校准类型（默认选择第一个）
const selectedKBLabel = ref(kbOptions.value[0].label)

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

  // 从扁平化数据中获取原始KB值
  const rawK = factoryCalibData.value[kKey]
  const rawB = factoryCalibData.value[bKey]

  // 根据表定义，K值的scale是1000，B值的scale是10
  // 需要将原始值除以scale来得到实际显示值
  let k = '', b = ''

  // 确保即使是0值也能正确显示
  if (rawK !== undefined && rawK !== null) {
    k = (rawK / 1000).toFixed(3)  // K值scale为1000
  }

  if (rawB !== undefined && rawB !== null) {
    b = (rawB / 10).toFixed(1)    // B值scale为10
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
  const label = selectedKB.value.label

  if (label.includes('电流')) {
    return 'current'
  } else if (label.includes('组端电压')) {
    return 'clusterVoltage'
  } else if (label.includes('预充电压')) {
    return 'preChargeVoltage'
  }
  return null
})

// 当前实时显示值
const currentIVValue = computed(() => {
  const realData = currentRealTimeData.value
  const key = selectedIVKey.value

  if (!realData || !key) return '-'

  const value = realData[key]

  if (value === null || value === undefined) return '-'

  // 根据类型添加单位
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
    summary: '捕获成功',
    detail: '已捕获显示值1',
    life: 2000
  })
}

// 捕获显示值2
const captureX2 = () => {
  if (!currentIVValid.value) return
  storedX2.value = getCurrentRealTimeValue()
  toast.add({
    severity: 'success',
    summary: '捕获成功',
    detail: '已捕获显示值2',
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
      summary: '计算完成',
      detail: `K=${inputK.value}, B=${inputB.value}`,
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '计算错误',
      detail: error.message,
      life: 3000
    })
  }
}

const sendCalibration = async () => {
  if (!isValidKB.value) {
    toast.add({
      severity: 'warn',
      summary: '数据无效',
      detail: '请先计算有效的KB值',
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
      throw new Error('未选择校准类型')
    }

    // 验证输入值
    const kValue = parseFloat(inputK.value)
    const bValue = parseFloat(inputB.value)

    if (isNaN(kValue) || isNaN(bValue)) {
      throw new Error('K值和B值必须为有效数字')
    }

    // 检查数据是否就绪
    if (!isDataReady.value) {
      toast.add({
        severity: 'warn',
        summary: '数据未就绪',
        detail: '未读取到设备原始K/B值，请等待数据加载完成',
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
        throw new Error('未知的校准类型')
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
      summary: '下设成功',
      detail: `${currentCalibType.label} KB值已下设`,
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

  systemInfo.element.forEach(item => {
    if (item.label === '簇电流(A)' && item.value !== '-') {
      current = parseFloat(item.value)
    } else if (item.label === '簇电压(V)' && item.value !== '-') {
      clusterVoltage = parseFloat(item.value)
    } else if (item.label === '预充电压(V)' && item.value !== '-') {
      preChargeVoltage = parseFloat(item.value)
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
  if (!selectedCluster.value) {
    return
  }

  const [blockId, clusterId] = selectedCluster.value.split('-')

  window.electronAPI.mqttPublish(
    `bms/host/s2d/b${blockId}/c${clusterId}/factory_calib_param_r`,
    'ff'
  )
}

// 定时器管理
let readingTimer = null

// 启动周期读取
const startPeriodicReading = () => {
  // 立即读取一次
  readFactoryCalibParam()

  // 启动5秒周期读取
  readingTimer = setInterval(() => {
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
onMounted(() => {
  // 监听出厂校正参数数据
  window.electron.ipcRenderer.on('FACTORY_CALIB_PARAM_R', handleFactoryCalibUpdate)

  // 监听CLUSTER_SUMMARY数据（用于实时数据更新）
  window.electron.ipcRenderer.on('CLUSTER_SUMMARY', onClusterSummary)

  // 直接启动读取
  isDataReady.value = false
  startPeriodicReading()
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
  <div class="card">
    <!-- 校准类型选择区 -->
    <div class="mb-4">
      <label for="kb-select" class="form-label">选择校准量：</label>
      <Dropdown
        v-model="selectedKBLabel"
        :options="kbOptions"
        optionLabel="label"
        optionValue="label"
        placeholder="请选择校准类型"
        inputId="kb-select"
        class="w-100"
        :showClear="false"
      />
    </div>

      <!-- 数据展示区 -->
      <DataTable
        :value="calibrationDataSet"
        responsiveLayout="scroll"
        showGridlines
        class="p-datatable-sm"
      >
        <!-- 校准量类型列 -->
        <Column field="type" header="校准量" :style="{ width: '15%' }">
          <template #body="{ data }">
            <span class="font-semibold">{{ data.label }}</span>
          </template>
        </Column>

        <!-- 实时显示值列 -->
        <Column field="current" header="实时显示值" :style="{ width: '12%' }">
          <template #body>
            <span class="font-semibold text-primary">
              {{ currentIVValue || '-' }}
            </span>
          </template>
        </Column>

        <!-- 实测值输入列 -->
        <Column header="点1点2实测值" :style="{ width: '18%' }">
          <template #body>
            <div class="captured-values">
              <!-- 实测值1输入 -->
              <div class="input-item">
                <label for="calY1">实测值1：</label>
                <InputText v-model="calY1" style="width: 7rem" />
              </div>

              <!-- 实测值2输入 -->
              <div class="input-item">
                <label for="calY2">实测值2：</label>
                <InputText v-model="calY2" style="width: 7rem" />
              </div>
            </div>
          </template>
        </Column>

        <!-- 捕获值显示列 -->
        <Column header="点1点2显示值" :style="{ width: '18%' }">
          <template #body>
            <div class="captured-values">
              <div class="input-item">
                <label for="storedX1">显示值1</label>
                <InputText v-model="storedX1" disabled style="width: 7rem" />
                <Button
                  @click="captureX1"
                  :disabled="!currentIVValid"
                  label="捕获"
                />
              </div>
              <div class="input-item">
                <label for="storedX2">显示值2</label>
                <InputText v-model="storedX2" disabled style="width: 7rem" />
                <Button
                  @click="captureX2"
                  :disabled="!currentIVValid"
                  label="捕获"
                />
              </div>
            </div>
          </template>
        </Column>

        <!-- 原始KB值列 -->
        <Column header="原始KB值" :style="{ width: '15%' }">
          <template #body="{ data }">
            <div class="captured-values">
              <div class="input-item">
                <label for="originalK">K：</label>
                <InputText
                  :value="isDataReady ? getActualKBValues(data.raw).k : '加载中...'"
                  readonly
                  class="p-inputtext-sm"
                  style="width: 7rem"
                  :class="{ 'loading-text': !isDataReady }"
                />
              </div>
              <div class="input-item">
                <label for="originalB">B：</label>
                <InputText
                  :value="isDataReady ? getActualKBValues(data.raw).b : '加载中...'"
                  readonly
                  class="p-inputtext-sm"
                  style="width: 7rem"
                  :class="{ 'loading-text': !isDataReady }"
                />
              </div>
            </div>
          </template>
        </Column>

        <!-- 新KB值列 -->
        <Column header="新KB值" :style="{ width: '18%' }">
          <template #body>
            <div style="display: flex; align-items: center">
              <div class="captured-values">
                <div class="input-item">
                  <label for="inputK">K：</label>
                  <InputText v-model="inputK" style="width: 7rem" />
                </div>
                <div class="input-item">
                  <label for="inputB">B：</label>
                  <InputText v-model="inputB" style="width: 7rem" />
                </div>
              </div>
              <Button
                @click="calculateNewKB"
                label="计算新值"
                :disabled="!canCalculate"
                class="calculate-btn"
              />
            </div>
          </template>
        </Column>

        <!-- 操作列 -->
        <Column header="操作" :style="{ width: '10%' }">
          <template #body>
            <Button
              @click="sendCalibration"
              :disabled="!isValidKB || !isDataReady"
              size="small"
              severity="success"
              class="p-button-sm"
              :title="!isDataReady ? '等待设备数据加载中...' : ''"
            >
              下设
            </Button>
          </template>
        </Column>
      </DataTable>
  </div>
</template>


<style scoped>
.loading-text {
  color: #999 !important;
  font-style: italic;
}

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

.calculate-btn {
  margin-left: 0.5rem;
  white-space: nowrap;
}

.p-datatable-sm :deep(.p-datatable-tbody > tr > td) {
  padding: 0.5rem;
}

.p-datatable-sm :deep(.p-datatable-thead > tr > th) {
  padding: 0.75rem 0.5rem;
  font-size: 0.875rem;
}
</style>
