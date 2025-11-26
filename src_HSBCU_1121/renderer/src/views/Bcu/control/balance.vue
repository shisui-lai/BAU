<template>
  <div class="card section">
    <h5>{{ t('balanceControl.title') }}</h5>
    <div style="display: flex; gap: 1rem">
      <!--     <div>
        <label for="balance.balanceEnabel">均衡使能：</label>
        <Dropdown
          v-model="balance.balanceEnabel"
          :options="balance.balanceEnabelOption"
          optionLabel="label"
          optionValue="value"
        />
      </div> -->
      <div>
        <label for="balance.balanceMode">{{ t('balanceControl.balanceMode') }}：</label>
        <Dropdown
          v-model="balance.balanceMode"
          :options="translatedBalanceModeOption"
          optionLabel="label"
          optionValue="value"
        />
      </div>
      <div>
        <label for="balanceBMU">{{ t('balanceControl.selectBMU') }}：</label>
        <Dropdown
          v-model="balanceBMU"
          :options="balanceBMUOptions"
          optionLabel="label"
          optionValue="value"
        />
      </div>
      <div style="display: flex; gap: 1rem; align-items: center">
        <label>{{ t('balanceControl.cellSelectionMode') }}：</label>
        <Dropdown
          v-model="selectionMode"
          :options="translatedSelectionOptions"
          optionLabel="label"
          optionValue="value"
        />
        <Button
          :label="t('balanceControl.select')"
          :disabled="!canModify"
          @click="applySelection"
        />
        <Button
          :label="t('balanceControl.deselect')"
          :disabled="!canModify"
          @click="clearSelection"
        />
      </div>
      <div>
        <label for="balance.balanceTime">{{ t('balanceControl.balanceTime') }}：</label>
        <InputText v-model="balance.balanceTime" style="width: 5rem" /> s
      </div>
      <div style="display: flex; gap: 1rem; align-items: center">
        <Button @click="click(true)"
          ><strong>{{ t('balanceControl.startBalance') }}</strong>
        </Button>
        <Button @click="click(false)">
          <strong>{{ t('balanceControl.stopBalance') }}</strong>
        </Button>
        <div v-if="balanceTimer.remainingTime > 0" class="timer-panel">
          <span class="timer-text"
            >{{ t('balanceControl.remainingTime') }}:
            {{ formatTime(balanceTimer.remainingTime) }}</span
          >
          <!--  <Button @click="stopManual" severity="danger" label="强制停止" class="timer-button" /> -->

          <!--      <ProgressBar :value="(balanceTimer.remainingTime / balance.balanceTime) * 100">
            <div class="timer-content">
              <span class="timer-text">剩余时间: {{ formatTime(balanceTimer.remainingTime) }}</span>
              <Button @click="stopManual" severity="danger" label="强制停止" class="timer-button" />
            </div>
          </ProgressBar> -->
        </div>
      </div>
      <!--    {{ balanceBMUOptions }}
      {{ bmuConfig[ipStore.selectedIp].cellsPerBMU }} -->
    </div>

    <div style="margin-top: 1rem">
      <!-- 根据AFE配置动态生成表格 -->
      <div v-for="(afe, afeIndex) in afeConfig" :key="afe.afeID" class="afe-row">
        <!--  <div class="afe-header">
          <h6>AFE {{ afe.afeID }}</h6>
        </div> -->
        <div class="afe-cells">
          <div
            v-for="cellIndex in afe.vltgPerAFE"
            :key="`${afe.afeID}-${cellIndex}`"
            class="cell-item"
          >
            <span class="cell-number">{{ cellIndex }}#</span>
            <InputSwitch
              v-model="balance.cellStatus[getGlobalCellIndex(afeIndex, cellIndex - 1)]"
              @change="updateGlobalState"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useToast } from 'primevue/usetoast'
const toast = useToast()
import { useVtSetStore } from '../../../../../stores/vtSetStore.js'
import InputSwitch from 'primevue/inputswitch'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const ipStore = useIpStore()
const balanceStore = useVtSetStore()
const { bmuConfig } = storeToRefs(ipStore)
const {
  isStopped,
  balance,
  balanceTimer,
  selectionMode,
  balanceBMUOptions,
  balanceBMU,
  balanceStatusMessage
} = storeToRefs(balanceStore)
const initAfeConfig = [
  { afeID: 1, vltgPerAFE: 12, tempPerAFE: 6 },
  { afeID: 2, vltgPerAFE: 12, tempPerAFE: 6 },
  { afeID: 3, vltgPerAFE: 12, tempPerAFE: 6 },
  { afeID: 4, vltgPerAFE: 12, tempPerAFE: 6 }
]
const translatedBalanceModeOption = computed(() =>
  balance.value.balanceModeOption.map((item) => ({
    value: item.value,
    label: t(item.key)
  }))
)
const translatedSelectionOptions = computed(() =>
  balance.value.selectionOptions.map((item) => ({
    value: item.value,
    label: t(item.key)
  }))
)
const canModify = computed(() => balance.value.cellStatus.length > 0)
const applySelection = () => {
  balanceStore.setAllBalance(false)
  balanceStore.setBalanceByMode(selectionMode.value, true)
}
const clearSelection = () => {
  balanceStore.setAllBalance(false)
}
// 状态同步检测
const updateGlobalState = () => {
  // 检查 cellStatus 是否存在且为数组
  const allEnabled = balance.value.cellStatus?.every(Boolean) ?? false
  balanceStore.$patch({ balance: { allEnabled } })
}
const afeConfig = computed(() => bmuConfig.value[ipStore.selectedIp]?.afeConfig ?? initAfeConfig)

// 计算全局单元格索引
const getGlobalCellIndex = (afeIndex, localCellIndex) => {
  let globalIndex = 0
  for (let i = 0; i < afeIndex; i++) {
    globalIndex += afeConfig.value[i].vltgPerAFE
  }
  globalIndex += localCellIndex
  return globalIndex
}

// 计算总单元格数
const totalCells = computed(() => {
  const cellsPerBMU = bmuConfig.value[ipStore.selectedIp]?.cellsPerBMU || 0
  const afeTotal = afeConfig.value.reduce((sum, afe) => sum + afe.vltgPerAFE, 0)
  //  console.log('totalCells computed - cellsPerBMU:', cellsPerBMU, 'afeTotal:', afeTotal)
  return afeTotal
})
// 单元状态管理
const initStatus = (force = false) => {
  if (!force && balance.value.cellStatus?.length > 0) {
    return
  }
  const total = totalCells.value
  balance.value.cellStatus = Array(total).fill(false)
}

// 监听afeConfig变化，重新初始化状态
watch(
  afeConfig,
  (newConfig, oldConfig) => {
    // 检查是否真的有变化
    const oldTotal = oldConfig?.reduce((sum, afe) => sum + afe.vltgPerAFE, 0) || 0
    const newTotal = newConfig?.reduce((sum, afe) => sum + afe.vltgPerAFE, 0) || 0

    // 只有当总cell数真正变化时才重新初始化
    if (oldTotal !== newTotal) {
      initStatus(true) // 强制重新初始化
    }
  },
  { immediate: true, deep: true }
)

// 新增寄存器转换函数 - 修改为新的地址计算方式
const convertCellsToRegisters = (cellStatus, bmuIndex) => {
  const registers = []
  const cellsPerBMU = bmuConfig.value[ipStore.selectedIp]?.cellsPerBMU || 0

  // 计算该BMU需要多少个寄存器来存储均衡标志
  const regsPerBMU = Math.ceil(cellsPerBMU / 16)

  for (let reg = 0; reg < regsPerBMU; reg++) {
    let regValue = 0
    for (let bit = 0; bit < 16; bit++) {
      const cellIndex = reg * 16 + bit
      if (cellIndex < cellStatus.length && cellStatus[cellIndex]) {
        regValue |= 1 << bit // 低位在前模式
      }
    }
    registers.push(regValue)
  }
  return registers
}
const formatTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const hh = hours.toString().padStart(2, '0')
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')

  return `${hh}:${mm}:${ss}`
}

/* const stopManual = () => {
  balanceStore.stopBalance()
  clearInterval(balanceStore.balanceTimer.intervalId)
} */
// 修改点击事件处理
const click = async (openFlag) => {
  /*   if (!canSendBalance.value) {
    console.warn('参数不完整')
    return
  } */
  if (!openFlag) {
    balanceStore.clearBalanceTimer() // 清除定时器
  }
  isStopped.value = false // 重置状态
  const validCondition = balance.value.balanceTime >= 0 && balance.value.cellStatus.some(Boolean)

  if (!validCondition) {
    toast.add({ severity: 'warn', summary: '参数不完整', life: 3000 })
    return
  }
  const bmuIndex = parseInt(balanceBMU.value)

  // 新的地址计算方式：
  // 均衡控制指令：前96个寄存器，每个BMU占用3个连续寄存器
  const controlBaseAddress = 0xc080 + (bmuIndex - 1) * 3

  // 均衡标志：后256个寄存器，按bit连续排列
  const cellsPerBMU = bmuConfig.value[ipStore.selectedIp]?.cellsPerBMU || 0
  const flagBaseAddress = 0xc080 + 96 + Math.floor(((bmuIndex - 1) * cellsPerBMU) / 16)

  const writeData = [
    // 均衡使能
    {
      address: controlBaseAddress,
      value: openFlag ? 1 : 0,
      ip: ipStore.selectedIp
    },
    // 均衡时间（假设单位为0.1秒）
    {
      address: controlBaseAddress + 1,
      value: openFlag ? balance.value.balanceTime : 0,
      ip: ipStore.selectedIp
    },
    // 均衡模式
    {
      address: controlBaseAddress + 2,
      value: balance.value.balanceMode,
      ip: ipStore.selectedIp
    }
  ]

  // 添加cell状态寄存器 - 使用新的地址计算
  // 只有在开启均衡时才需要发送均衡标志
  if (openFlag) {
    const cellRegisters = convertCellsToRegisters(balance.value.cellStatus, bmuIndex)
    cellRegisters.forEach((value, index) => {
      writeData.push({
        address: flagBaseAddress + index,
        value: value,
        ip: ipStore.selectedIp
      })
    })
  }

  // 根据开启/关闭状态决定发送逻辑
  try {
    if (openFlag) {
      // 开启均衡：先发送均衡标志，再发送均衡控制指令

      // 第一批：发送均衡标志
      const flagPayload = writeData.slice(3).map((item) => ({
        ...item,
        ip: ipStore.selectedIp
      }))

      console.log(
        `[均衡标志] 发送到 ${ipStore.selectedIp}，BMU${bmuIndex}，地址: 0x${flagBaseAddress.toString(16).toUpperCase()}-0x${(flagBaseAddress + flagPayload.length - 1).toString(16).toUpperCase()}`
      )

      const flagResult = await window.electron.ipcRenderer.invoke(
        'write-modbus-registers',
        flagPayload
      )

      if (!flagResult.success) {
        throw new Error(`均衡标志发送失败: ${flagResult.error || '未知错误'}`)
      }

      // 第二批：发送均衡控制指令
      const controlPayload = writeData.slice(0, 3).map((item) => ({
        ...item,
        ip: ipStore.selectedIp
      }))

      console.log(
        `[均衡控制] 发送到 ${ipStore.selectedIp}，BMU${bmuIndex}，地址: 0x${controlBaseAddress.toString(16).toUpperCase()}-0x${(controlBaseAddress + 2).toString(16).toUpperCase()}`
      )

      const controlResult = await window.electron.ipcRenderer.invoke(
        'write-modbus-registers',
        controlPayload
      )

      if (!controlResult.success) {
        throw new Error(`均衡控制指令发送失败: ${controlResult.error || '未知错误'}`)
      }
    } else {
      // 关闭均衡：需要清零所有相关寄存器

      // 第一批：清零均衡标志寄存器
      const cellsPerBMU = bmuConfig.value[ipStore.selectedIp]?.cellsPerBMU || 0
      const regsPerBMU = Math.ceil(cellsPerBMU / 16)
      const flagPayload = []

      for (let i = 0; i < regsPerBMU; i++) {
        flagPayload.push({
          address: flagBaseAddress + i,
          value: 0, // 清零均衡标志
          ip: ipStore.selectedIp
        })
      }

      console.log(
        `[关闭均衡-清零标志] 发送到 ${ipStore.selectedIp}，BMU${bmuIndex}，地址: 0x${flagBaseAddress.toString(16).toUpperCase()}-0x${(flagBaseAddress + regsPerBMU - 1).toString(16).toUpperCase()}`
      )

      const flagResult = await window.electron.ipcRenderer.invoke(
        'write-modbus-registers',
        flagPayload
      )

      if (!flagResult.success) {
        throw new Error(`均衡标志清零失败: ${flagResult.error || '未知错误'}`)
      }

      // 第二批：清零均衡控制指令寄存器
      const controlPayload = [
        {
          address: controlBaseAddress,
          value: 0, // 均衡使能清零
          ip: ipStore.selectedIp
        },
        {
          address: controlBaseAddress + 1,
          value: 0, // 均衡时间清零
          ip: ipStore.selectedIp
        },
        {
          address: controlBaseAddress + 2,
          value: 0, // 均衡模式清零
          ip: ipStore.selectedIp
        }
      ]

      console.log(
        `[关闭均衡-清零控制] 发送到 ${ipStore.selectedIp}，BMU${bmuIndex}，地址: 0x${controlBaseAddress.toString(16).toUpperCase()}-0x${(controlBaseAddress + 2).toString(16).toUpperCase()}`
      )

      const controlResult = await window.electron.ipcRenderer.invoke(
        'write-modbus-registers',
        controlPayload
      )

      if (!controlResult.success) {
        throw new Error(`均衡控制指令清零失败: ${controlResult.error || '未知错误'}`)
      }
    }

    // 两批都成功
    toast.add({
      severity: 'success',
      summary: openFlag ? t('balanceControl.startSuccess') : t('balanceControl.stopSuccess'),
      life: 3000
    })

    // 若开启，启动倒计时
    if (openFlag) {
      balanceStore.startBalanceTimer(
        balance.value.balanceTime,
        balanceBMU.value,
        balance.value.cellStatus.map((status, idx) => (status ? idx : -1)).filter((i) => i !== -1)
      )
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'error',
      detail: `${t('balanceControl.writeFailed')}: ${err.message}`,
      life: 5000
    })
    console.error('均衡命令下发失败：', err)
  }
}
// 删除重复监听，已在App.vue中全局处理
</script>

<style lang="less" scoped>
.afe-row {
  margin-bottom: 0.8rem;
  border: 1px solid rgba(0, 234, 255, 0.2);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.afe-header {
  margin-bottom: 1rem;

  h6 {
    margin: 0;
    color: #00eaff;
    font-weight: 600;
    font-size: 1.1rem;
    text-shadow: 0 0 10px rgba(0, 234, 255, 0.3);
  }
}

.afe-cells {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.cell-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.8rem 0.6rem;
  border-radius: 8px;
  min-width: 70px;
  transition: all 0.3s ease;
  position: relative;
}

.timer-panel {
  min-width: 150px;
  display: flex;
  align-items: center;
  gap: 1rem;
  // 新增内容容器布局
  .timer-content {
    display: flex;
    align-items: center;
    min-width: 0; /* 关键：允许内容收缩 */
  }

  // 文字部分样式
  .timer-text {
    white-space: nowrap; /* 禁止换行 */
    overflow: hidden; /* 隐藏溢出内容 */
    text-overflow: ellipsis; /* 显示省略号 */
    flex-shrink: 1; /* 允许文本收缩 */
    min-width: 0; /* 关键：覆盖默认最小宽度 */
    font-weight: 500;
  }

  // 按钮样式调整
  .timer-button {
    flex-shrink: 0; /* 禁止按钮收缩 */
  }
}

.section {
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
}

/* 深色主题适配 */
</style>
