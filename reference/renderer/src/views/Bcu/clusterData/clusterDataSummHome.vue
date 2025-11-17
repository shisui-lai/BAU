<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed, nextTick } from 'vue'
import { idToKeyForClusterSummHome, valueMap, initDataClusterSumm } from './idToKey.js'
import { useI18n } from 'vue-i18n'
const { locale, t } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useBmuCountStore } from '../../../../../stores/bmuCountStore.js'
import { useLayout } from '../../../layout/composables/layout.js'
import cellDataNew from '../cellData/cellDataNew.vue'
// 用于显示加载指示器
const isLoading = ref(true) // 默认假设正在加载
const DataClusterSumm = ref(initDataClusterSumm)
let listenerIdSumm = ref(null) // 使用 ref 来存储事件监听器的 ID
const ipStore = useIpStore() // 获取 Pinia store
const bmuCountStore = useBmuCountStore()
const { isDarkTheme } = useLayout() // 获取主题状态
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
const isIpValid = computed(() => {
  const ip = ipStore.selectedIp
  return ip && ip !== 'Connect First'
})

// 判断是否为重要元素 - 已注释，所有参数使用普通样式
// const isImportantItem = (id) => {
//   return [1, 2, 3, 5, 6, 22, 23, 900, 901, 902, 903, 208].includes(id)
// }

watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    // 如果该IP的数据已经存在，直接使用它
    if (state.deviceData[newIp]) {
      DataClusterSumm.value =
        state.deviceData[newIp]['update-FC04ClusterSumm'] || initDataClusterSumm
      isLoading.value = false // 数据加载完成，停止加载指示器
    } else {
      // 该IP的数据尚未获取，设置为初始值并保持加载指示器开启
      DataClusterSumm.value = initDataClusterSumm
      isLoading.value = true
    }
  },
  { immediate: true } // 初始时就触发一次
)

// 监听连接状态变化，当设备断开连接时清除缓存数据
watch(
  () => ipStore.ipStatus,
  (newStatus, oldStatus) => {
    Object.keys(newStatus).forEach((ip) => {
      const status = newStatus[ip]
      const oldIpStatus = oldStatus?.[ip]

      // 只有状态从其他状态变为断开状态时才清除缓存
      if (
        (status === 'disconnected' || status === 'device_offline' || status === 'interrupted') &&
        oldIpStatus !== status
      ) {
        console.log(`设备 ${ip} 断开连接，清除缓存数据`)

        // 清除断开设备的缓存数据
        if (state.deviceData[ip]) {
          delete state.deviceData[ip]
        }
        // 清除localStorage中的缓存
        localStorage.removeItem(`clusterSumm-${ip}`)

        // 如果当前选中的IP断开了，重置为初始值
        if (ip === ipStore.selectedIp) {
          DataClusterSumm.value = initDataClusterSumm
          isLoading.value = true
        }
      }
    })
  },
  { deep: true }
)
// 事件监听器
const registerListener = () => {
  // listener for 'update-FC04ClusterSumm'
  window.electron.ipcRenderer.removeAllListeners('update-FC04ClusterSumm')
  listenerIdSumm.value = (event, Arg) => {
    /*   console.log('Arg', Arg) */
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    const newData = Arg.Arg
    state.deviceData[deviceIp] = state.deviceData[deviceIp] || {}
    state.deviceData[deviceIp][event] = mergeData(state.deviceData[deviceIp][event], newData)
    if (deviceIp === ipStore.selectedIp) {
      DataClusterSumm.value = mergeData(DataClusterSumm.value, newData)
      isLoading.value = false // 数据准备好
      // 更新缓存：将当前 IP 的数据存入 localStorage
      localStorage.setItem(`clusterSumm-${deviceIp}`, JSON.stringify(DataClusterSumm.value))
    }
    /*     console.log('newData', newData[0]) */
    if (newData[0]?.element) {
      // 查找 bmuCountStore 需要的参数
      const bmuCount = newData[0].element.find((item) => item.label === 'BMU总数量')?.value
      const afeCount = newData[0].element.find((item) => item.label === 'AFE总数量')?.value
      const batteryCount = newData[0].element.find((item) => item.label === '电池总数量')?.value
      const temperatureCount = newData[0].element.find((item) => item.label === '温度总数量')?.value

      bmuCountStore.setBmuCountData(deviceIp, bmuCount, afeCount, batteryCount, temperatureCount)
    }
  }
  window.electron.ipcRenderer.on('update-FC04ClusterSumm', listenerIdSumm.value)
}
// 故障等级颜色映射
const faultLevelColor = (val) => {
  switch (val) {
    case '无故障':
      return 'fault-level-none'
    case 'No Fault':
      return 'fault-level-none'
    case '严重':
      return 'fault-level-severe'
    case 'Critical':
      return 'fault-level-severe'
    case '一般':
      return 'fault-level-normal'
    case 'General':
      return 'fault-level-normal'
    case '轻微':
      return 'fault-level-minor'
    case 'Slight':
      return 'fault-level-minor'
    default:
      return ''
  }
}
// 3. 数据合并方法
const mergeData = (oldData, newData) => {
  return newData.map((newGroup) => {
    const oldGroup = oldData?.find((g) => g.classification === newGroup.classification)
    if (!oldGroup) return newGroup
    return {
      ...newGroup,
      element: newGroup.element.map((newItem) => {
        const oldItem = oldGroup.element.find((i) => i.label === newItem.label)
        return oldItem ? { ...oldItem, ...newItem } : newItem
      })
    }
  })
}
// 要隐藏的元素 ID 列表
const hiddenIds = [14, 15, 16, 17]
// 分离系统总故障位和其他参数
// 系统总状态位 翻译映射：中文标签 -> i18n 键
const systemTotalBitsLabelToKey = {
  静置: 'idle',
  充电: 'charge',
  放电: 'discharge',
  禁充: 'forbidCharge',
  禁放: 'forbidDischarge',
  禁充禁放: 'standby',
  告警: 'alarm',
  故障: 'fault',
  充电功率锁存: 'chargePowerLatch',
  放电功率锁存: 'dischargePowerLatch',
  充电指令: 'chargeCmd',
  充电指令完成: 'chargeCmdDone',
  放电指令: 'dischargeCmd',
  放电指令完成: 'dischargeCmdDone',
  脱离母线指令: 'busOffCmd',
  脱离母线指令完成: 'busOffCmdDone',
  运维模式: 'maintenance',
  非运维模式: 'nonMaintenance',
  内测模式: 'testMode',
  正常模式: 'normalMode',
  初始化中: 'initializing',
  初始化完成: 'initDone'
}

// 状态位定义已移至后端处理

// 将后端返回的逗号分隔字符串翻译为当前语言
const translateSystemTotalBits = (value) => {
  const text = value == null ? '' : String(value)
  if (!text) return ''
  // 中文环境直接原样返回（后端已为中文）
  if (locale.value === 'zh') return text
  // 非中文环境才做逐项翻译
  const parts = text
    .split(';') // 修改分隔符为分号，因为您提到的数据是用分号分隔的
    .map((s) => s.trim())
    .filter(Boolean)
  const translatedParts = parts.map((label) => {
    const key = systemTotalBitsLabelToKey[label]
    if (!key) {
      console.log(`未找到翻译键: "${label}"`)
      return label
    }
    const res = t(`clusterSummHome.systemTotalBits.${key}`)
    if (!res || res === `clusterSummHome.systemTotalBits.${key}`) {
      console.log(`翻译失败: ${key} -> ${res}`)
      return label
    }
    return res
  })
  return translatedParts.join('; ')
}

const systemFaultItems = computed(() => {
  const raw = DataClusterSumm.value
  if (!raw || !raw[0] || !raw[0].element) return []

  // 在所有数据组中查找ID为208和998的项目
  const systemFaults = []
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] && raw[i].element) {
      // 查找 id 为 208 的项目
      const fault208 = raw[i].element.find((item) => item.id === 208)
      if (fault208 && !systemFaults.find((item) => item.id === 208)) {
        systemFaults.push(fault208)
      }
      // 查找 id 为 998 的项目
      const fault998 = raw[i].element.find((item) => item.id === 998)
      if (fault998 && !systemFaults.find((item) => item.id === 998)) {
        systemFaults.push(fault998)
      }
      // 查找 id 为 1000 的项目
      const fault999 = raw[i].element.find((item) => item.id === 1000)
      if (fault999 && !systemFaults.find((item) => item.id === 1000)) {
        systemFaults.push(fault999)
      }
    }
  }

  // 处理翻译和本地化
  return systemFaults.map((systemFault) => {
    const labelKey = idToKeyForClusterSummHome[systemFault.id]
    const label =
      locale.value === 'zh' ? systemFault.label : labelKey ? t(labelKey) : systemFault.label

    let vkey = valueMap[systemFault.id]?.[systemFault.value]
    if (!vkey) {
      vkey = valueMap[systemFault.id]?.['*']
    }
    const displayValue =
      locale.value === 'zh'
        ? systemFault.value
        : vkey
          ? t(vkey, { val: systemFault.value })
          : systemFault.value

    // 对于ID为208、998和1000的项目，使用后端处理好的状态数据
    if (systemFault.id === 208 || systemFault.id === 998 || systemFault.id === 1000) {
      const statesData = systemFault.statesData || {
        allStates: [],
        activeStates: [],
        displayValue: '无状态'
      }

      // 处理国际化显示标签
      const allStatesWithI18n = statesData.allStates.map((state) => ({
        ...state,
        displayLabel:
          locale.value === 'zh'
            ? state.displayLabel
            : systemFault.id === 208
              ? t(`clusterSummHome.systemTotalBits.${state.key}`)
              : systemFault.id === 998
                ? t(`clusterSummHome.sysStatus.${state.key}`)
                : systemFault.id === 1000
                  ? t(`clusterSummHome.disableEnableClusterMap.${state.key}`)
                  : t(`clusterSummHome.sysStatus.${state.key}`)
      }))

      return {
        ...systemFault,
        label,
        value: displayValue,
        allStates: allStatesWithI18n,
        activeStates: allStatesWithI18n.filter((s) => s.isActive)
      }
    } else {
      // 对于其他项目，保持原有处理方式
      const localized = translateSystemTotalBits(displayValue)
      return { ...systemFault, label, value: displayValue, localizedValue: localized }
    }
  })
})

const otherClusterSumm = computed(() => {
  const raw = DataClusterSumm.value
  if (!raw || !raw[0] || !raw[0].element) return []

  // 收集所有数据组的参数，排除隐藏的ID和系统总状态位(208)
  let allElements = []

  // 处理第一个数据组
  const filtered = raw[0].element.filter(
    (item) => !hiddenIds.includes(item.id) && item.id !== 208 && item.id !== 998 && item.id !== 1000
  )
  const totalVoltage = isIpValid.value ? bmuCountStore.totalVoltage[ipStore.selectedIp] : null
  const withVoltage = [
    ...filtered.slice(0, 6),
    { id: 999, label: '累加电压', value: totalVoltage, unit: totalVoltage !== null ? 'V' : '' },
    ...filtered.slice(6)
  ]
  allElements = [...allElements, ...withVoltage]

  // 只处理前2个数据组（簇端数据1和簇端数据2）
  for (let i = 1; i < Math.min(2, raw.length); i++) {
    if (raw[i] && raw[i].element) {
      const filteredElements = raw[i].element.filter(
        (item) => item.id !== 208 && item.id !== 998 && item.id !== 1000
      )
      allElements = [...allElements, ...filteredElements]
    }
  }

  // 注入 key 并翻译
  return allElements.map((item) => {
    // 1) 先做 label 的翻译
    const labelKey = idToKeyForClusterSummHome[item.id]
    const label = locale.value === 'zh' ? item.label : labelKey ? t(labelKey) : item.label

    // 2. value 翻译，带默认
    let vkey = valueMap[item.id]?.[item.value]
    if (!vkey) {
      vkey = valueMap[item.id]?.['*']
    }
    const displayValue =
      locale.value === 'zh' ? item.value : vkey ? t(vkey, { val: item.value }) : item.value

    return { ...item, label, value: displayValue }
  })
})
onBeforeMount(async () => {
  // 先尝试从缓存中加载数据（根据 IP 做键值区分）
  const cacheKey = `clusterSumm-${ipStore.selectedIp}`
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    DataClusterSumm.value = JSON.parse(cachedData)
    isLoading.value = false
  }

  // 使用 nextTick 确保 DOM 更新后再注册事件监听器，避免阻塞页面渲染
  await nextTick()
  registerListener() // 注册事件监听器
})

onBeforeUnmount(() => {
  // 注销所有事件监听器
  window.electron.ipcRenderer.removeAllListeners('update-FC04ClusterSumm', listenerIdSumm.value)
  listenerIdSumm.value = null
  // 清空监听器ID数组
})
</script>
<template>
  <div class="card">
    <!-- 系统总故障位单独渲染在第一行 -->
    <div v-if="systemFaultItems.length > 0" class="system-fault-row">
      <div
        v-for="item in systemFaultItems"
        :key="item.id"
        class="property-card system-fault-card"
        :class="{
          'normal-item': true,
          'dark-mode': isDarkTheme,
          'light-mode': !isDarkTheme
        }"
      >
        <div class="label">{{ item.label }}</div>
        <div class="value">
          <!-- ID为208、998和1000的特殊渲染方式：显示所有状态并高亮激活状态 -->
          <div
            v-if="item.id === 208 || item.id === 998 || item.id === 1000"
            class="system-states-container"
          >
            <div class="states-grid">
              <div
                v-for="state in item.allStates"
                :key="`${state.bit || state.value}-${state.key}`"
                class="state-item"
                :class="{
                  'state-active': state.isActive,
                  'state-inactive': !state.isActive
                }"
              >
                <span class="state-label">{{ state.displayLabel }}</span>
              </div>
            </div>
          </div>
          <!-- 其他项目的原有渲染方式 -->
          <div v-else>
            <span v-if="item.value !== null">{{ item.localizedValue || item.value }}</span>
            <span v-if="item.value !== null && item.unit"> {{ item.unit }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 其他参数渲染 -->
    <div class="properties-grid">
      <div
        v-for="item in otherClusterSumm"
        :key="item.id"
        class="property-card"
        :class="{
          'normal-item': true,
          'dark-mode': isDarkTheme,
          'light-mode': !isDarkTheme
        }"
      >
        <div class="label">{{ item.label }}</div>
        <div
          class="value"
          :class="
            item.label === '模拟量故障总等级' || item.label === 'Failure Level'
              ? faultLevelColor(item.value)
              : ''
          "
        >
          <span v-if="item.value !== null && item.value !== undefined">{{ item.value }}</span>
          <span v-if="item.value !== null && item.value !== undefined && item.unit">
            {{ item.unit }}</span
          >
        </div>
      </div>
    </div>
    <div class="mt-4 cell-scroll-wrapper">
      <cellDataNew />
    </div>
  </div>
</template>

<style lang="less" scoped>
/* 系统总故障位单独行样式 */
.system-fault-row {
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: 7fr 1.5fr 1.5fr; /* 208参数占6/10宽度，998和1000各占2/10宽度 */
  gap: 0.75rem;
}

.system-fault-card {
  width: 100%;
  max-width: none;
  min-height: 8rem;
  padding: 1rem;
}

/* 为id为208的参数提供更多高度以显示2行状态 */
.system-fault-card:first-child {
  min-height: 7rem;
}

.states-container {
  width: 100%;
}

.states-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 1rem;
}

.state-item {
  display: flex;
  align-items: center;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: fit-content;
}

.state-item.state-active {
  background-color: #dcfce7;
  border-color: #16a34a;
  color: #166534;
  font-weight: 600;
}

.state-item.state-inactive {
  background-color: #f9fafb;
  border-color: #d1d5db;
  color: #6b7280;
}

.state-label {
  white-space: nowrap;
  font-weight: 500;
}

/* 暗色主题样式 */

.dark-mode .state-item {
  border-color: #374151;
}

.dark-mode .state-item.state-active {
  background-color: #064e3b;
  border-color: #10b981;
  color: #6ee7b7;
}

.dark-mode .state-item.state-inactive {
  background-color: #1f2937;
  border-color: #374151;
  color: #9ca3af;
}

.dark-mode .state-bit {
  background-color: #6b7280;
}

.dark-mode .state-item.state-active .state-bit {
  background-color: #10b981;
}

.properties-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.75rem;
}

.property-card {
  border-radius: 0.5rem;
  padding: 0.75rem;
  text-align: left;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  min-height: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  // 鼠标悬停效果 - 简约科技感
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 0.5rem;
      padding: 1px;
      mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      mask-composite: exclude;
    }
  }
}

// 重要元素样式 - 白天模式
.important-item.light-mode {
  background: #86b8e7;
  color: #374151;
  border: 1px solid #bab8e2;
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);

  .label {
    color: #6b7280;
    font-weight: 700;
  }

  .value {
    font-weight: 600;
  }

  &:hover {
    box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
    border-color: #06b6d4;

    &::before {
      background: linear-gradient(45deg, #4f46e5, #06b6d4, #10b981, #f59e0b);
    }
  }
}

// 重要元素样式 - 夜间模式
.important-item.dark-mode {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
  border: 1px solid rgb(20, 79, 173);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);

  .label {
    color: #93c5fd;
    font-weight: 700;
  }

  .value {
    font-weight: 600;
  }

  &:hover {
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
    border-color: #06b6d4;

    &::before {
      background: linear-gradient(45deg, #3b82f6, #06b6d4, #10b981, #f59e0b);
    }
  }
}

// 普通元素样式 - 白天模式
.normal-item.light-mode {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #374151;

  .label {
    color: #6b7280;
    font-weight: 600;
  }

  .value {
    font-weight: 500;
  }

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

// 普通元素样式 - 夜间模式
.normal-item.dark-mode {
  background: #1f2937;
  border: 1px solid #374151;
  color: #d1d5db;

  .label {
    color: #9ca3af;
    font-weight: 600;
  }

  .value {
    font-weight: 500;
  }

  &:hover {
    background: #374151;
    border-color: #4b5563;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.property-card .label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.5rem;
  line-height: 1.2;
  flex-shrink: 0;
}

.property-card .value {
  word-break: break-word;
  line-height: 1.3;
  flex-grow: 1;
  display: flex;
  align-items: center;
  min-height: 1.5rem;
}

// 简约科技感发光动画 - 白天模式
@keyframes tech-glow-light {
  0% {
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
  }
  100% {
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
  }
}

// 简约科技感发光动画 - 夜间模式
@keyframes tech-glow-dark {
  0% {
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  }
  50% {
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
  }
  100% {
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  }
}

// 简约科技感渐变边框和发光效果
.property-card.light-mode:hover::before {
  background: linear-gradient(135deg, #3b82f6, #22c55e);
  animation: tech-glow-light 3s ease-in-out infinite;
}

.property-card.dark-mode:hover::before {
  background: linear-gradient(135deg, #22c55e, #06b6d4);
  animation: tech-glow-dark 3s ease-in-out infinite;
}

.cell-scroll-wrapper {
  max-width: 100%; /* 不超过父容器宽度 */
  overflow-x: auto; /* 内容超出时展示横向滚动条 */
  overflow-y: hidden; /* 可选：隐藏垂直滚动条 */
}
.fault-level-none {
  color: #16a34a;
  font-weight: bold;
}
.fault-level-severe {
  color: #e11d48;
  font-weight: bold;
}
.fault-level-normal {
  color: #f59e42;
  font-weight: bold;
}
.fault-level-minor {
  color: #fbbf24;
  font-weight: bold;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .properties-grid {
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  }
}

@media (max-width: 768px) {
  .properties-grid {
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 1rem;
  }

  .property-card {
    min-height: 5rem;
    padding: 1rem;
  }

  .system-fault-card {
    min-height: 6rem;
    padding: 1.25rem;
  }
}

@media (max-width: 480px) {
  .properties-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .property-card {
    min-height: 4.5rem;
    padding: 0.875rem;
  }
}
</style>
