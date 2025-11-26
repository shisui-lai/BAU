<template>
  <div class="card">
    <div class="gap">
      <!-- 温度校准部分 -->
      <h5>温度校准</h5>
      <!--        <span>当前 BMU 编号: {{ temperatureBMU }}</span> -->
      <div class="tvSet1">
        <label>下设模式</label>
        <Dropdown
          v-model="isTSetAll"
          :options="isTSetAllOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="选择校准方式"
        >
        </Dropdown>
        <div>
          <label for="temperatureBMU">BMU编号：</label>
          <InputText class="setInput" v-model="temperatureBMU" :disabled="isTSetAll" />
        </div>
        <div>
          <label for="temperatureCell">温度编号：</label>
          <InputText class="setInput" v-model="temperatureCell" :disabled="isTSetAll" />
        </div>
        <div>
          <label for="temperatureValue">校准值：</label>
          <InputText class="setInput" v-model="temperatureValue" placeholder="℃" />
        </div>
        <Button
          @click="sendTemperatureCalibrationRequest"
          :disabled="
            !isTSetAll
              ? !temperatureBMU || !temperatureCell || !temperatureValue
              : !temperatureValue
          "
        >
          下设
        </Button>
      </div>
      <!-- 电压校准部分 -->
      <div style="margin-top: 3rem">
        <h5>电压校准</h5>
        <div class="tvSet1">
          <label>下设模式</label>
          <Dropdown
            v-model="isVSetAll"
            :options="isVSetAllOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择校准方式"
          >
          </Dropdown>
          <div>
            <label for="voltageBMU">BMU编号：</label>
            <InputText class="setInput" v-model="voltageBMU" :disabled="isVSetAll" />
          </div>
          <div>
            <label for="voltageCell">电压编号：</label>
            <InputText class="setInput" v-model="voltageCell" :disabled="isVSetAll" />
          </div>
          <div>
            <label for="voltageValue">校准值：</label>
            <InputText class="setInput" v-model="voltageValue" placeholder="mV" />
          </div>
          <Button
            @click="sendVoltageCalibrationRequest"
            :disabled="!isVSetAll ? !voltageBMU || !voltageCell || !voltageValue : !voltageValue"
          >
            下设
          </Button>
        </div>
      </div>
    </div>
    <div class="gap">
      <div class="buttonGap">
        <ButtonGroup>
          <Button
            :label="buttonLabel"
            :severity="isModuleReading ? 'danger' : 'primary'"
            @click="handleClick"
          />
          <Button
            :severity="isTSet ? 'primary' : 'secondary'"
            label="温度校准"
            @click="
              () => {
                isTSet = true
                isVSet = false
              }
            "
          />
          <Button
            :severity="isVSet ? 'primary' : 'secondary'"
            label="电压校准"
            @click="
              () => {
                isVSet = true
                isTSet = false
              }
            "
          />
        </ButtonGroup>
        <div style="margin-left: 0.3rem">
          <Dropdown
            v-model="selectedBMU"
            :options="bmuOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择BMU"
          />
        </div>
      </div>
      <!-- BMU选择 -->
      <div>
        <!-- 表格显示 -->
        <DataTable :value="[currentBMUData]" v-show="isTSet">
          <Column>
            <template #body="slotProps">
              <div class="no-data" v-if="slotProps.data.element.length === 0">无数据</div>
              <div v-else class="dynamic-grid" :style="gridStyle">
                <div v-for="(item, index) in slotProps.data.element" :key="index" class="cell">
                  <div class="cell-content">
                    <div class="index-label">#{{ index + 1 }}</div>
                    <div class="value-display">{{ item.value }}</div>
                  </div>
                </div>
              </div>
            </template>
          </Column>
        </DataTable>
        <DataTable :value="[currentBMUData_Vltg]" v-show="isVSet">
          <Column>
            <template #body="slotProps">
              <div class="no-data" v-if="slotProps.data.element.length === 0">无数据</div>
              <div v-else class="dynamic-grid" :style="gridStyleV">
                <div v-for="(item, index) in slotProps.data.element" :key="index" class="cell">
                  <div class="cell-content">
                    <div class="index-label">#{{ index + 1 }}</div>
                    <div class="value-display">{{ item.value }}</div>
                  </div>
                </div>
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useVtSetStore } from '../../../../../stores/vtSetStore.js'
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
const toast = useToast()
const ipStore = useIpStore() // 获取 Pinia store
const vtSetStore = useVtSetStore() // 获取 Pinia store
const { moduleReadingStatus, bmuConfig, selectedIp } = storeToRefs(ipStore) // 解构为响应式引用
const {
  isTSetAll,
  isVSetAll,
  temperatureBMU,
  temperatureCell,
  temperatureValue,
  voltageBMU,
  voltageCell,
  voltageValue
} = storeToRefs(vtSetStore)
const selectedBMU = ref(1)
let listenerId1 = ref(null)
const isBMUTWritting = ref(false)
const isBMUVWritting = ref(false)
const initData = [
  {
    classification: '单体温度校准值',
    config: { bmuTotal: 1, afeTotal: 4, cellsPerBMU: 24 },
    element: Array.from({ length: 24 }, () => ({ value: '-', BMU: 1 }))
  },
  {
    classification: '单体电压校准值',
    config: { bmuTotal: 1, afeTotal: 4, cellsPerBMU: 48 },
    element: Array.from({ length: 48 }, () => ({ value: '-', BMU: 1 }))
  }
]
const vtSetData = ref([])
const isTSet = ref(true)
const isVSet = ref(false)
/* const isTSetAll = ref(false)
const isVSetAll = ref(false) */
const MODULE_NAME = 'VTConfig'
const isModuleReading = computed(() => moduleReadingStatus.value[MODULE_NAME])
// 按钮标签
const buttonLabel = computed(() => (isModuleReading.value ? '停止读取' : '开始读取'))
// 点击处理
const handleClick = () => {
  if (isModuleReading.value) {
    stopReading()
  } else {
    startReading()
  }
}
const isTSetAllOptions = [
  {
    label: '全部',
    value: true
  },
  {
    label: '单个',
    value: false
  }
]
const isVSetAllOptions = [
  {
    label: '全部',
    value: true
  },
  {
    label: '单个',
    value: false
  }
]
const totalBMUs = computed(() => {
  return bmuConfig.value[selectedIp.value]?.bmuTotal || 1
})
/* const selectedBMU = ref(1) // 当前选中的 BMU，默认为 BMU 1 */
// 生成符合 Dropdown 需要的数据结构
const bmuOptions = computed(() =>
  Array.from({ length: totalBMUs.value }, (_, index) => ({
    label: `BMU ${index + 1}`,
    value: index + 1
  }))
)
const props = defineProps({
  elements: {
    type: Array,
    default: () => []
  }
})
const gridStyle = computed(() => {
  const tempData = vtSetData.value[0] // 温度数据对象
  const cellsPerBMU = tempData.config?.cellsPerBMU || 48 // 动态获取，默认48防止错误
  // 温度视图
  const dynamicColumns = Math.ceil(Math.sqrt(cellsPerBMU))
  const clampedColumns = Math.min(Math.max(8, dynamicColumns), 8)
  return {
    gridTemplateColumns: `repeat(${clampedColumns}, 1fr)`
    // 可以添加其他温度视图专属样式
  }
})
const gridStyleV = computed(() => {
  const vltgData = vtSetData.value[1] // 电压数据对象
  const cellsPerBMU = vltgData.config?.cellsPerBMU || 48 // 动态获取
  // 温度视图
  const dynamicColumns = Math.ceil(Math.sqrt(cellsPerBMU))
  const clampedColumns = Math.min(Math.max(8, dynamicColumns), 8)
  return {
    gridTemplateColumns: `repeat(${clampedColumns}, 1fr)`
    // 可以添加其他温度视图专属样式
  }
})
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
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    /*     console.log(`切换到 IP: ${newIp}`)
     */ // 这里假设你通过 `state.deviceData` 来存储不同 IP 对应的数据
    vtSetData.value = state.deviceData[newIp]?.['update-FC04VtSetData'] || initData
    /* console.log('bmuTotal', vtSetData.value.bmuTotal) */
  },
  { immediate: true } // 初始时就触发一次
)
watch(isTSet, (newVal) => {
  if (newVal) {
    isVSet.value = false
  }
})

// 同理，当电压开为 true 时，自动把温度关为 false
watch(isVSet, (newVal) => {
  if (newVal) {
    isTSet.value = false
  }
})
// 事件监听器
const registerListener1 = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04VtSetData')
  listenerId1.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (!state.deviceData[deviceIp]) {
      state.deviceData[deviceIp] = {}
    }
    // 存储数据
    state.deviceData[deviceIp][event] = Arg.Arg
    // 如果当前选择的 IP，更新数据
    if (deviceIp === ipStore.selectedIp) {
      vtSetData.value = Arg.Arg
    }
  }
  window.electron.ipcRenderer.on('update-FC04VtSetData', listenerId1.value)
}

onBeforeMount(() => {
  startReading()
  registerListener1() // 注册事件监听器
})

onBeforeUnmount(() => {
  // 注销所有事件监听器
  if (listenerId1.value) {
    window.electron.ipcRenderer.removeListener('update-FC04VtSetData', listenerId1.value)
    listenerId1.value = null
    console.log('已注销事件监听器: update-FC04VtSetData')
  }
  stopReading()
})
// 当前选中 BMU 的温度校准数据
// 修改后的计算属性
const currentBMUData = computed(() => {
  if (!vtSetData.value || vtSetData.value.length === 0) {
    return { classification: '无数据', element: [] }
  }

  const tempData = vtSetData.value[0] // 温度数据对象
  const cellsPerBMU = tempData.config?.cellsPerBMU || 48 // 动态获取，默认48防止错误
  const startIndex = (selectedBMU.value - 1) * cellsPerBMU
  const bmuElements = tempData.element.slice(startIndex, startIndex + cellsPerBMU)

  return {
    classification: tempData.classification,
    element: bmuElements
  }
})
// 当前选中 BMU 的温度校准数据
const currentBMUData_Vltg = computed(() => {
  if (!vtSetData.value || vtSetData.value.length < 2) {
    return { classification: '无数据', element: [] }
  }

  const vltgData = vtSetData.value[1] // 电压数据对象
  const cellsPerBMU = vltgData.config?.cellsPerBMU || 48 // 动态获取
  const startIndex = (selectedBMU.value - 1) * cellsPerBMU
  const bmuElements = vltgData.element.slice(startIndex, startIndex + cellsPerBMU)

  return {
    classification: vltgData.classification,
    element: bmuElements
  }
})
// 计算温度寄存器地址
const calculateTemperatureRegisterAddress = () => {
  // 从数据中获取实际配置
  const cellsPerBMU = vtSetData.value[0]?.config?.cellsPerBMU || 48
  const baseAddrTemperature = 0x0100
  const registerAddress =
    baseAddrTemperature +
    (temperatureBMU.value - 1) * 0x80 + // 地址间隔
    ((temperatureCell.value - 1) % cellsPerBMU) // 确保不越界
  return registerAddress
}

// 计算电压寄存器地址
// 同理修改电压地址计算
const calculateVoltageRegisterAddress = () => {
  const cellsPerBMU = vtSetData.value[1]?.config?.cellsPerBMU || 48
  const baseAddrVoltage = 0x1100
  const registerAddress =
    baseAddrVoltage + (voltageBMU.value - 1) * 0x80 + ((voltageCell.value - 1) % cellsPerBMU)
  return registerAddress
}

// 发送温度校准请求
const sendTemperatureCalibrationRequest = async () => {
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  // 动态获取配置
  const config = vtSetData.value[0]?.config || { cellsPerBMU: 48 }
  const { bmuTotal, cellsPerBMU } = config
  isBMUTWritting.value = true
  /*   if (!temperatureValue.value) {
    alert('请输入校准值')
    return
  } */
  if (isTSetAll.value) {
    for (const ip of targets) {
      // 全部写入模式：每个BMU单独成批
      await processBMU(
        bmuTotal,
        (bmu) =>
          Array.from({ length: cellsPerBMU }, (_, cell) => ({
            address: 0x0100 + (bmu - 1) * 0x80 + cell,
            value: temperatureValue.value * 10,
            ip
          })),
        '温度'
      )
    }
    isBMUTWritting.value = false
  } else {
    const requestId = Date.now()
    const registerAddress = calculateTemperatureRegisterAddress()
    if (registerAddress !== null && temperatureValue.value !== null) {
      // 针对每个 IP 单独发送一次写请求
      const results = await Promise.all(
        targets.map(async (ip) => {
          const payload = [
            {
              address: registerAddress,
              value: temperatureValue.value * 10,
              ip
            }
          ]
          try {
            const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
            return { ip, ...res }
          } catch (err) {
            return { ip, success: false, error: err.message }
          }
        })
      )
      // 处理响应
      results.forEach(({ ip, success, error }) => {
        if (success) {
          toast.add({
            severity: 'success',
            summary: `IP ${ip}`,
            detail: '温度校准写入成功',
            life: 3000
          })
        } else {
          toast.add({
            severity: 'error',
            summary: `IP ${ip}`,
            detail: `写入失败：${error || '未知错误'}`,
            life: 5000
          })
        }
      })
    }
  }
  isBMUTWritting.value = false
}

// 发送电压校准请求
const sendVoltageCalibrationRequest = async () => {
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  isBMUVWritting.value = true
  /*   if (!voltageValue.value) {
    alert('请输入校准值')
    return
  } */
  // 动态获取配置
  const config = vtSetData.value[1]?.config || { bmuTotal: 5, cellsPerBMU: 48 }
  const { bmuTotal, cellsPerBMU } = config
  if (isVSetAll.value) {
    for (const ip of targets) {
      await processBMU(
        bmuTotal,
        (bmu) =>
          Array.from({ length: cellsPerBMU }, (_, cell) => ({
            address: 0x1100 + (bmu - 1) * 0x80 + cell,
            value: voltageValue.value,
            ip
          })),
        '电压'
      )
    }

    isBMUVWritting.value = false
  } else {
    const requestId = Date.now()
    const registerAddress = calculateVoltageRegisterAddress()
    if (registerAddress !== null && voltageValue.value !== null) {
      const results = await Promise.all(
        targets.map(async (ip) => {
          const payload = [
            {
              address: registerAddress,
              value: voltageValue.value,
              ip
            }
          ]
          try {
            const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
            return { ip, ...res }
          } catch (err) {
            return { ip, success: false, error: err.message }
          }
        })
      )
      results.forEach(({ ip, success, error }) => {
        if (success) {
          toast.add({
            severity: 'success',
            summary: `IP ${ip}`,
            detail: '电压校准写入成功',
            life: 3000
          })
        } else {
          toast.add({
            severity: 'error',
            summary: `IP ${ip}`,
            detail: `写入失败：${error || '未知错误'}`,
            life: 5000
          })
        }
      })
    }
  }

  isBMUVWritting.value = false
}
// 改造BMU循环逻辑（遇到错误继续后续BMU）
const processBMU = async (bmuTotal, generateRequests, type) => {
  let successCount = 0
  toast.add({
    severity: 'warn',
    summary: '提示信息',
    detail: '正在写入，请稍后',
    life: 7000
  })
  for (let bmu = 1; bmu <= bmuTotal; bmu++) {
    try {
      const requests = generateRequests(bmu)
      await batchWriteRegisters(requests)
      successCount++
      console.log(`BMU${bmu} ${type}校准写入完成`)
    } catch (error) {
      console.error(`BMU${bmu} ${type}校准失败:`, error)
      // 不break，继续后续BMU
    }
    if (successCount === bmuTotal) {
      toast.add({
        severity: 'success',
        summary: '提示信息',
        detail: `所有${type}校准写入完成`,
        life: 3000
      })
    }
  }
}
// 增强版批量写入函数（带重试机制）
// 修改后的批量写入函数（去除回调依赖）
const batchWriteRegisters = async (requests, options = {}) => {
  const {
    batchSize = 123,
    retries = 2, // 降低重试次数
    delayBetweenBatches = 2, // 批次间隔时间
    timeout = 100 // 延长单次超时时间
  } = options
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)
    let batchOk = false

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // 这里一次性 invoke 整个 batch
        const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', batch)
        // 假设 res.success 表示整体批次成功
        if (res.success) {
          batchOk = true
          break
        } else {
          throw new Error(res.error || '批次写入失败')
        }
      } catch (err) {
        console.warn(`批次 ${i / batchSize + 1} 第${attempt}次重试：`, err.message)
        await new Promise((r) => setTimeout(r, timeout))
      }
    }

    if (!batchOk) {
      console.error(`批次 ${i / batchSize + 1} 最终失败`)
    }
    // 批次间隔
    await new Promise((r) => setTimeout(r, delayBetweenBatches))
  }
}
</script>
<style>
.gap {
  margin-bottom: 4rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid #dddddd74;
  padding: 1rem;
  height: fit-content;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
}
.buttonGap {
  margin: 1rem 1rem 1rem 1rem;
  display: flex;
}
.dynamic-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(8, 1fr);
  text-align: center;
}
.cell {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 5px;
  transition: transform 0.2s;
}
.cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.no-data {
  padding: 2rem;
  text-align: center;
}
.vtShow {
  padding: 1rem;
  margin-top: 1rem;
}
.vtset {
  display: flex;
  gap: 1rem;
}
.setInput {
  width: 5rem;
}
.tvSet1 {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.buttonSelect {
  display: flex;
  margin-top: 1rem;
  margin-left: 1rem;
}
.select {
  width: 70px;
  height: fit-content;
  margin-left: 1rem;
  /* background-color: #f1f5f9; */
}
.card-vtSet {
  margin-left: 3rem;
}
.form-group {
  display: grid;
  grid-template-columns: 100px 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 1rem;
}
.cell-content {
  text-align: center;
}

.index-label {
  font-size: 0.8rem;
  margin-bottom: 2px;
}
/* 
.value-display {
  font-size: 1.1em;
  font-weight: 500;
} */
.container {
  display: flex;
  flex-direction: column; /* 垂直排列 */
  gap: 1rem; /* 子元素间距 */
}
</style>
