<!-- src/components/ShieldModule.vue -->
<template>
  <div class="card">
    <!-- 温度滤波设置 -->
    <div class="gap">
      <h5>温度滤波</h5>
      <div class="tvShield1">
        <label>下设模式</label>
        <Dropdown
          v-model="tempShieldMode"
          :options="shieldModeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="选择滤波模式"
        />

        <div class="range-controls">
          <div>
            <label>BMU编号：</label>
            <InputText
              v-model="tempShieldBMU"
              class="setInput"
              :disabled="tempShieldMode !== 'partial'"
            />
          </div>
          <div>
            <label>温度编号：</label>
            <InputText
              v-model="tempShieldCell"
              class="setInput"
              :disabled="tempShieldMode !== 'partial'"
            />
          </div>
        </div>
        <!-- 温度滤波范围设置 -->
        <!--           <div class="range-controls">
            <div style="display: flex; gap: 0.5rem">
              <div>
                <label>起始BMU：</label>
                <InputText
                  v-model="tempRangeStart.bmu"
                  mode="decimal"
                  class="setInput"
                  :disabled="tempShieldMode !== 'range'"
                />
              </div>
              <div>
                <label class="param-label">起始Temp：</label>
                <InputText
                  v-model="tempRangeStart.cell"
                  mode="decimal"
                  class="setInput"
                  :disabled="tempShieldMode !== 'range'"
                />
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem">
              <div>
                <label>终止BMU：</label>
                <InputText
                  v-model="tempRangeEnd.bmu"
                  class="setInput"
                  :disabled="tempShieldMode !== 'range'"
                />
              </div>
              <div>
                <label class="param-label">终止Temp：</label>
                <InputText
                  v-model="tempRangeEnd.cell"
                  class="setInput"
                  :disabled="tempShieldMode !== 'range'"
                />
              </div>
            </div>
          </div> -->
        <div style="display: flex; gap: 1rem">
          <div class="shield-status">
            <label>下设值：</label>
            <ToggleButton v-model="tempShieldValue" onLabel="1" offLabel="0" style="width: 5rem" />
          </div>
          <Button @click="handleShieldOperation('temperature')" :disabled="isTempProcessing">
            {{ isTempProcessing ? `处理中 (${tempProgress}%)` : '下设' }}
          </Button>
        </div>
      </div>
      <!-- 电压滤波设置 -->
      <div style="margin-top: 3rem">
        <h5>电压滤波</h5>
        <div class="tvShield1">
          <label>下设模式</label>
          <Dropdown
            v-model="voltShieldMode"
            :options="shieldModeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择滤波模式"
          />

          <div class="range-controls">
            <div>
              <label>BMU编号：</label>
              <InputText
                v-model="voltShieldBMU"
                class="setInput"
                :disabled="voltShieldMode !== 'partial'"
              />
            </div>
            <div>
              <label>电池编号：</label>
              <InputText
                v-model="voltShieldCell"
                class="setInput"
                :disabled="voltShieldMode !== 'partial'"
              />
            </div>
          </div>
          <!--      <div class="range-controls">
              <div style="display: flex; gap: 0.5rem">
                <div>
                  <label>起始BMU：</label>
                  <InputText
                    v-model="voltRangeStart.bmu"
                    class="setInput"
                    :disabled="voltShieldMode !== 'range'"
                  />
                </div>
                <div>
                  <label class="param-label">起始Cell：</label>
                  <InputText
                    v-model="voltRangeStart.cell"
                    class="setInput"
                    :disabled="voltShieldMode !== 'range'"
                  />
                </div>
              </div>

              <div style="display: flex; gap: 0.5rem">
                <div>
                  <label>终止BMU：</label>
                  <InputText
                    v-model="voltRangeEnd.bmu"
                    class="setInput"
                    :disabled="voltShieldMode !== 'range'"
                  />
                </div>
                <div>
                  <label class="param-label">终止Cell：</label>
                  <InputText
                    v-model="voltRangeEnd.cell"
                    class="setInput"
                    :disabled="voltShieldMode !== 'range'"
                  />
                </div>
              </div>
            </div> -->
          <div style="display: flex; gap: 1rem">
            <div class="shield-status">
              <label>下设值：</label>
              <ToggleButton
                v-model="voltShieldValue"
                onLabel="1"
                offLabel="0"
                style="width: 5rem"
              />
            </div>
            <Button @click="handleShieldOperation('voltage')" :disabled="isVoltProcessing">
              {{ isVoltProcessing ? `处理中 (${voltProgress}%)` : '下设' }}
            </Button>
          </div>
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
            :severity="showTempShield ? 'primary' : 'secondary'"
            label="温度滤波"
            @click="
              () => {
                showTempShield = true
                showVoltShield = false
              }
            "
          />
          <Button
            :severity="showVoltShield ? 'primary' : 'secondary'"
            label="电压滤波"
            @click="
              () => {
                showVoltShield = true
                showTempShield = false
              }
            "
          />
        </ButtonGroup>
        <div style="margin-left: 0.3rem">
          <Dropdown
            v-model="selectedBMUF"
            :options="bmuOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择BMU"
          />
        </div>
      </div>
      <div>
        <div>
          <!-- 温度滤波显示 -->
          <DataTable :value="[currentShieldTempData]" v-show="showTempShield" class="shield-table">
            <Column>
              <template #body="{ data }">
                <div v-if="data.element.length === 0" class="no-data">无数据</div>
                <div v-else class="shield-grid" :style="shieldGridStyleT">
                  <div v-for="(item, index) in data.element" :key="index" class="shield-cell">
                    <div class="cell-content">
                      <div class="cell-index">#{{ index + 1 }}</div>
                      {{ item.value === '-' ? '-' : item.value ? '1' : '0' }}
                    </div>
                  </div>
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
        <div>
          <!-- 电压滤波显示 -->
          <DataTable :value="[currentShieldVoltData]" v-show="showVoltShield" class="shield-table">
            <Column>
              <template #body="{ data }">
                <div v-if="data.element.length === 0" class="no-data">无数据</div>
                <div v-else class="shield-grid" :style="shieldGridStyleV">
                  <div v-for="(item, index) in data.element" :key="index" class="shield-cell">
                    <div class="cell-content">
                      <div class="cell-index">#{{ index + 1 }}</div>
                      <div class="cell-status">
                        {{ item.value === '-' ? '-' : item.value ? '1' : '0' }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeMount, onBeforeUnmount, reactive } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useVtSetStore } from '../../../../../stores/vtSetStore.js'
import { storeToRefs } from 'pinia'
const ipStore = useIpStore() // 获取 Pinia store
import { useToast } from 'primevue/usetoast'
const toast = useToast()
const vtSetStore = useVtSetStore() // 获取 Pinia store
const { moduleReadingStatus, bmuConfig, selectedIp } = storeToRefs(ipStore) // 解构为响应式引用
const {
  tempShieldMode,
  tempShieldBMU,
  tempShieldCell,
  tempShieldValue,
  voltShieldMode,
  voltShieldBMU,
  voltShieldCell,
  voltShieldValue,
  tempRangeStart,
  tempRangeEnd,
  voltRangeStart,
  voltRangeEnd
} = storeToRefs(vtSetStore)
const MODULE_NAME = 'VTShieldConfig'
const isModuleReading = computed(() => moduleReadingStatus.value[MODULE_NAME])
let listenerId2 = ref(null)
const initDataShield = [
  {
    classification: 'BMU1温度屏蔽',
    config: { bmuTotal: 5, cellsPerBMU: 24 },
    element: Array.from({ length: 24 }, () => ({ value: '-' }))
  },
  {
    classification: 'BMU1电压屏蔽',
    config: { bmuTotal: 5, cellsPerBMU: 48 },
    element: Array.from({ length: 48 }, () => ({ value: '-' }))
  }
]
const vtFilterData = ref([])
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
const startReading = () => {
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: 'VTConfig'
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}

const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: 'VTConfig'
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
const buttonLabel = computed(() => (isModuleReading.value ? '停止读取' : '开始读取'))
// 点击处理
const handleClick = () => {
  if (isModuleReading.value) {
    stopReading()
  } else {
    startReading()
  }
}
// 响应式状态
const showTempShield = ref(true)
const showVoltShield = ref(false)
const selectedBMUF = ref(1)
const totalBMUs = computed(() => {
  return bmuConfig.value[selectedIp.value]?.bmuTotal || 1
})
const bmuOptions = computed(() =>
  Array.from({ length: totalBMUs.value }, (_, i) => ({
    label: `BMU ${i + 1}`,
    value: i + 1
  }))
)
// 温度滤波状态
const isTempProcessing = ref(false)
const tempProgress = ref(0)

// 电压滤波状态
const isVoltProcessing = ref(false)
const voltProgress = ref(0)

// 常量定义
const TEMP_SHIELD_BASE = 0x2100
const VOLT_SHIELD_BASE = 0x2200
const BITS_PER_REGISTER = 16
// 滤波数据处理
const currentShieldTempData = computed(() => {
  if (!vtFilterData.value.length) return { classification: '', element: [] }

  // 在温度屏蔽数据中查找当前BMU对应的条目 (前5项是温度)
  const target = vtFilterData.value.find(
    (item) => item.classification === `BMU${selectedBMUF.value}温度屏蔽`
  )

  return target || { classification: '', element: [] }
})

const currentShieldVoltData = computed(() => {
  if (!vtFilterData.value.length) return { classification: '', element: [] }

  // 在电压屏蔽数据中查找当前BMU对应的条目 (后5项是电压)
  const target = vtFilterData.value.find(
    (item) => item.classification === `BMU${selectedBMUF.value}电压屏蔽`
  )

  return target || { classification: '', element: [] }
})

// 修改后的gridStyle计算属性
const shieldGridStyleT = computed(() => {
  const type = showTempShield.value ? 'temperature' : 'voltage'
  const config =
    type === 'temperature' ? currentShieldTempData.value.config : currentShieldVoltData.value.config

  const cellsPerBMU = config?.cellsPerBMU || 24

  // 动态计算列数（每行至少4列，最多8列）
  const dynamicColumns = Math.ceil(Math.sqrt(cellsPerBMU))
  const clampedColumns = Math.min(Math.max(8, dynamicColumns), 8)

  return { gridTemplateColumns: `repeat(${clampedColumns}, 1fr)` }
})
const shieldGridStyleV = computed(() => {
  const type = showTempShield.value ? 'temperature' : 'voltage'
  const config =
    type === 'temperature' ? currentShieldTempData.value.config : currentShieldVoltData.value.config

  const cellsPerBMU = config?.cellsPerBMU || 24

  // 动态计算列数（每行至少4列，最多8列）
  const dynamicColumns = Math.ceil(Math.sqrt(cellsPerBMU))
  const clampedColumns = Math.min(Math.max(8, dynamicColumns), 8)

  return { gridTemplateColumns: `repeat(${clampedColumns}, 1fr)` }
})
watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    /*     console.log(`切换到 IP: ${newIp}`)
     */ // 这里假设你通过 `state.deviceData` 来存储不同 IP 对应的数据
    vtFilterData.value = state.deviceData[newIp]?.['update-FC04VtFilterData'] || initDataShield
  },
  { immediate: true } // 初始时就触发一次
)
watch(showTempShield, (newVal) => {
  if (newVal) {
    showVoltShield.value = false
  }
})

// 同理，当电压开为 true 时，自动把温度关为 false
watch(showVoltShield, (newVal) => {
  if (newVal) {
    showTempShield.value = false
  }
})
const registerListener2 = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04VtFilterData')
  listenerId2.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (!state.deviceData[deviceIp]) {
      state.deviceData[deviceIp] = {}
    }
    // 存储数据
    state.deviceData[deviceIp][event] = Arg.Arg
    // 如果当前选择的 IP，更新数据
    if (deviceIp === ipStore.selectedIp) {
      vtFilterData.value = Arg.Arg
    }
  }
  window.electron.ipcRenderer.on('update-FC04VtFilterData', listenerId2.value)
}
onBeforeMount(() => {
  startReading()
  registerListener2() // 注册事件监听器
})
onBeforeUnmount(() => {
  // 注销所有事件监听器
  if (listenerId2.value) {
    window.electron.ipcRenderer.removeListener('update-FC04VtFilterData', listenerId2.value)
    listenerId2.value = null
    console.log('已注销事件监听器: update-FC04VtFilterData')
  }
  stopReading()
})
// 计算属性
const shieldModeOptions = computed(() => [
  { label: '全部', value: 'all' },
  { label: '单个', value: 'partial' }
  /*   { label: '批量', value: 'range' } */
])

// 地址计算逻辑
const calculateShieldAddress = (type, bmu, cell) => {
  const base = type === 'temperature' ? TEMP_SHIELD_BASE : VOLT_SHIELD_BASE // 明确base值
  const config =
    type === 'temperature'
      ? currentShieldTempData.value?.config || { cellsPerBMU: 24 }
      : currentShieldVoltData.value?.config || { cellsPerBMU: 24 }
  const cellsPerBMU = Number(config.cellsPerBMU) || 24
  const registersPerBMU = 8
  const registerOffset = Math.floor((Number(cell) - 1) / 16) // 每个寄存器16个cell
  const bitPosition = (cell - 1) % 16

  return {
    registerAddr: base + (bmu - 1) * registersPerBMU + registerOffset,
    bitMask: 1 << bitPosition
  }
}
// 新增寄存器值合并方法
const mergeRegisterValue = (currentValue, bitMask, enable) => {
  return enable
    ? currentValue | bitMask // 置位操作
    : currentValue & ~bitMask // 清除位操作
}
// 生成合并后的请求数据
// 重构生成请求逻辑
const generateShieldRequests = (type) => {
  const config =
    type === 'temperature' ? currentShieldTempData.value.config : currentShieldVoltData.value.config
  const cellsPerBMU = config?.cellsPerBMU || 24
  const registersPerBMU = 8
  /*   const totalBMUs = config?.bmuTotal || 5 */
  const isTemp = type === 'temperature'
  const value = isTemp ? tempShieldValue.value : voltShieldValue.value
  const mode = isTemp ? tempShieldMode.value : voltShieldMode.value
  const base = isTemp ? TEMP_SHIELD_BASE : VOLT_SHIELD_BASE
  const requests = []

  // 根据模式生成请求
  switch (mode) {
    case 'all':
      // 批量模式直接设置全1/全0
      for (let bmu = 1; bmu <= totalBMUs.value; bmu++) {
        for (let reg = 0; reg < registersPerBMU; reg++) {
          requests.push({
            address: base + (bmu - 1) * registersPerBMU + reg,
            value: value ? 0xffff : 0x0000,
            shieldStyle: 'all'
          })
        }
      }
      console.log('all requests: ', requests)
      break

    case 'range': {
      const range = isTemp
        ? { start: tempRangeStart.value, end: tempRangeEnd.value }
        : { start: voltRangeStart.value, end: voltRangeEnd.value }
      // 范围模式需要逐寄存器处理
      const registerMap = getRegisterValuesForRange(type, range.start, range.end)
      // 生成最终请求
      registerMap.forEach((val, addr) => {
        requests.push({ address: addr, value: val, shieldStyle: 'range' })
      })
      break
    }

    default: {
      // 单个/部分模式
      const bmu = isTemp ? tempShieldBMU.value : voltShieldBMU.value
      const cell = isTemp ? tempShieldCell.value : voltShieldCell.value
      const { registerAddr, bitMask } = calculateShieldAddress(type, bmu, cell)
      const current = getCurrentRegisterValue(type, registerAddr)
      const newVal = mergeRegisterValue(current, bitMask, value)
      requests.push({
        address: registerAddr,
        value: newVal,
        shieldStyle: 'single'
      })
    }
  }
  /*   console.log(requests) */
  return requests
}
// 新增函数：根据类型、BMU和寄存器地址获取当前寄存器的值
const getCurrentRegisterValue = (type, registerAddr) => {
  let currentValue = 0
  const bmu = Math.floor((registerAddr - (type === 'temperature' ? 0x2100 : 0x2200)) / 8) + 1

  // 获取对应分类数据
  const classification = `BMU${bmu}${type === 'temperature' ? '温度' : '电压'}屏蔽`
  const data = vtFilterData.value.find((item) => item.classification === classification)

  if (!data) return 0

  // 遍历该BMU所有cell计算寄存器值
  data.element.forEach((cellData, cellIndex) => {
    const cell = cellIndex + 1
    const addrInfo = calculateShieldAddress(type, bmu, cell)

    if (addrInfo && addrInfo.registerAddr === registerAddr) {
      if (cellData.value) {
        currentValue |= addrInfo.bitMask
      }
    }
  })

  return currentValue
}
// 针对单次写入，直接获取当前 BMU 对应的寄存器值
const getCurrentRegisterValueForCell = (type, bmu, cell) => {
  const addrInfo = calculateShieldAddress(type, bmu, cell)
  if (!addrInfo) return 0
  // 假设 vtFilterData 中的数据已分 BMU 存储，可以直接定位对应 BMU 的数据
  const data =
    type === 'temperature'
      ? vtFilterData.value.find((item) => item.classification === `BMU${bmu}温度屏蔽`)
      : vtFilterData.value.find((item) => item.classification === `BMU${bmu}电压屏蔽`)
  if (!data) return 0

  // 遍历该 BMU 内的 cell，只计算目标寄存器地址的值
  let value = 0
  data.element.forEach((cellData, index) => {
    const currentCell = index + 1
    const currentAddr = calculateShieldAddress(type, bmu, currentCell)
    if (currentAddr && currentAddr.registerAddr === addrInfo.registerAddr && cellData.value) {
      value |= currentAddr.bitMask
    }
  })
  return value
}
// 批量写入时，根据输入范围仅遍历需要的 BMU 和 cell
const getRegisterValuesForRange = (type, startRange, endRange) => {
  // 假设 startRange 和 endRange 分别是 { bmu, cell }
  const registerMap = new Map()
  const maxCells = currentMaxCells(type)
  const startBMU = Math.min(startRange.bmu, endRange.bmu)
  const endBMU = Math.max(startRange.bmu, endRange.bmu)

  for (let bmu = startBMU; bmu <= endBMU; bmu++) {
    // 针对每个 BMU，只遍历该 BMU 内需要处理的 cell 范围
    let startCell = bmu === startRange.bmu ? startRange.cell : 1
    let endCell = bmu === endRange.bmu ? Math.min(endRange.cell, maxCells) : maxCells
    for (let cell = startCell; cell <= endCell; cell++) {
      const addrInfo = calculateShieldAddress(type, bmu, cell)
      if (!addrInfo) continue
      const regAddr = addrInfo.registerAddr
      // 只计算当前 BMU 的数据（可直接从该 BMU 的数据中提取）
      const currentVal = registerMap.has(regAddr)
        ? registerMap.get(regAddr)
        : getCurrentRegisterValueForCell(type, bmu, cell)
      const newVal = mergeRegisterValue(
        currentVal,
        addrInfo.bitMask,
        type === 'temperature' ? tempShieldValue.value : voltShieldValue.value
      )
      registerMap.set(regAddr, newVal)
    }
  }
  return registerMap
}

// 动态最大cell计算
const currentMaxCells = (type) => {
  const config =
    type === 'temperature' ? currentShieldTempData.value.config : currentShieldVoltData.value.config
  return config?.cellsPerBMU || 24
}
// 单次发送处理逻辑
const handleShieldOperation = async (type) => {
  const isTemp = type === 'temperature'
  const state = {
    processing: isTemp ? isTempProcessing : isVoltProcessing,
    progress: isTemp ? tempProgress : voltProgress
  }
  // 坐标要下发的目标 IP 列表
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]

  try {
    state.processing.value = true
    state.progress.value = 0

    // 生成不含 IP 的基础请求数组
    const baseRequests = generateShieldRequests(type)

    // 总共要发多少批（用于进度计算）
    let totalChunks = 0
    const perIpChunks = {} // 存放每个 IP 对应的 chunk 数组
    targets.forEach((ip) => {
      const ipReqs = baseRequests.map((req) => ({ ...req, ip }))
      const chunks = chunkArray(ipReqs, 123)
      perIpChunks[ip] = chunks
      totalChunks += chunks.length
    })

    // 逐 IP、逐 Chunk 发送
    let sentChunks = 0
    for (const ip of targets) {
      const chunks = perIpChunks[ip]
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx]
        window.electron.ipcRenderer.send('write-modbus-registers', chunk)
        await new Promise((resolve) => {
          window.electron.ipcRenderer.once('write-modbus-response', (_, result) => {
            if (!result.success) {
              console.error(`批量下发到 ${ip} 第 ${idx + 1} 批失败: ${result.error}`)
            }
            resolve()
          })
        })
        sentChunks++
        state.progress.value = Math.round((sentChunks / totalChunks) * 100)
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    // 全部批次结束后统一提示
    toast.add({
      severity: 'success',
      summary: '提示信息',
      detail: `所有设备${type === 'temperature' ? '温度' : '电压'}滤波下设完成`,
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '错误',
      detail: `${type === 'temperature' ? '温度' : '电压'}滤波下设过程中出错: ${error.message}`,
      life: 5000
    })
  } finally {
    state.processing.value = false
  }
}

// 数组分块工具函数
const chunkArray = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  )
// 修改后的批量写入函数（单次发送）
</script>
<style scoped>
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
.tvShield1 {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.buttonGap {
  margin: 1rem 1rem 1rem 1rem;
  display: flex;
}
.shield-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
/* 新增滤波数据显示样式 */

.shield-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
  text-align: center;
}

.shield-cell {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 5px;
  transition: transform 0.2s;
}
.shield-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cell-index {
  font-size: 0.8em;
  margin-bottom: 2px;
}
/* 
.cell-status {
  font-size: 1.1em;
  font-weight: 500;
} */

.cell-content {
  text-align: center;
}
.no-data {
  text-align: center;
  padding: 2rem;
}
.range-controls {
  display: flex;
  gap: 1rem;
}
.setInput {
  width: 5rem;
}
.param-label {
  display: inline-block;
  width: 5.8rem; /* 根据实际需要调节 */
  margin-right: 0.5rem;
}
</style>
