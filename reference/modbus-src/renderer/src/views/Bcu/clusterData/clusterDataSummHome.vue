<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { idToKeyForClusterSummHome, valueMap, initDataClusterSumm } from './idToKey.js'
import { useI18n } from 'vue-i18n'
const { locale, t } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useIVCaliStore } from '../../../../../stores/ivCaliStore.js'
import { useBmuCountStore } from '../../../../../stores/bmuCountStore.js'
import { useLayout } from '../../../layout/composables/layout.js'
import cellDataNew from '../cellData/cellDataNew.vue'
// 用于显示加载指示器
const isLoading = ref(true) // 默认假设正在加载
const DataClusterSumm = ref(initDataClusterSumm())
let listenerIdSumm = ref(null) // 使用 ref 来存储事件监听器的 ID
const ipStore = useIpStore() // 获取 Pinia store
const ivCaliStore = useIVCaliStore()
const bmuCountStore = useBmuCountStore()
const { isDarkTheme } = useLayout() // 获取主题状态
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
const isIpValid = computed(() => {
  const ip = ipStore.selectedIp
  return ip && ip !== 'Connect First'
})

// 判断是否为重要元素
const isImportantItem = (id) => {
  return [1, 2, 3, 5, 6, 22, 23, 900, 901, 902, 903, 208].includes(id)
}

watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    // 如果该IP的数据已经存在，直接使用它
    if (state.deviceData[newIp]) {
      DataClusterSumm.value =
        state.deviceData[newIp]['update-FC04ClusterSumm'] || initDataClusterSumm()
      isLoading.value = false // 数据加载完成，停止加载指示器
    } else {
      // 该IP的数据尚未获取，保持加载指示器开启
      isLoading.value = true
    }
  },
  { immediate: true } // 初始时就触发一次
)
// 事件监听器
const registerListener = () => {
  // listener for 'update-FC04ClusterSumm'
  window.electron.ipcRenderer.removeAllListeners('update-FC04ClusterSumm')
  listenerIdSumm.value = (event, Arg) => {
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
    if (newData[0]?.element) {
      ivCaliStore.setIVData(
        deviceIp, // 新增IP参数
        newData[0].element[3].value,
        newData[0].element[2].value,
        newData[0].element[5].value
      )
      bmuCountStore.setBmuCountData(
        deviceIp,
        newData[0].element[13].value,
        newData[0].element[14].value,
        newData[0].element[15].value,
        newData[0].element[16].value
      )
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
        return oldItem ? { ...oldItem, value: newItem.value, unit: newItem.unit } : newItem
      })
    }
  })
}
// 要隐藏的元素 ID 列表
const hiddenIds = [14, 15, 16, 17]
// 分离系统总故障位和其他参数
// 系统总状态位 翻译映射：中文标签 -> i18n 键
const systemTotalBitsLabelToKey = {
  静止: 'idle',
  充电: 'charge',
  放电: 'discharge',
  禁充: 'forbidCharge',
  禁放: 'forbidDischarge',
  待机: 'standby',
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

const systemFaultItem = computed(() => {
  const raw = DataClusterSumm.value
  if (!raw || !raw[0] || !raw[0].element) return null

  // 在所有数据组中查找ID为208的项目
  let systemFault = null
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] && raw[i].element) {
      systemFault = raw[i].element.find((item) => item.id === 208)
      if (systemFault) {
        break
      }
    }
  }
  if (!systemFault) return null

  // 翻译处理
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

  // 增加本地化后的显示值
  const localized = translateSystemTotalBits(displayValue)
  return { ...systemFault, label, value: displayValue, localizedValue: localized }
})

const otherClusterSumm = computed(() => {
  const raw = DataClusterSumm.value
  if (!raw || !raw[0] || !raw[0].element) return []

  // 收集所有数据组的参数，排除隐藏的ID和系统总状态位(208)
  let allElements = []

  // 处理第一个数据组
  const filtered = raw[0].element.filter((item) => !hiddenIds.includes(item.id) && item.id !== 208)
  const totalVoltage = isIpValid.value ? bmuCountStore.totalVoltage[ipStore.selectedIp] : '-'
  const withVoltage = [
    ...filtered.slice(0, 7),
    { id: 999, label: '累加电压', value: totalVoltage, unit: 'V' },
    ...filtered.slice(7)
  ]
  allElements = [...allElements, ...withVoltage]

  // 只处理前2个数据组（簇端数据1和簇端数据2）
  for (let i = 1; i < Math.min(2, raw.length); i++) {
    if (raw[i] && raw[i].element) {
      const filteredElements = raw[i].element.filter((item) => item.id !== 208)
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
onBeforeMount(() => {
  // 先尝试从缓存中加载数据（根据 IP 做键值区分）
  const cacheKey = `clusterSumm-${ipStore.selectedIp}`
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    DataClusterSumm.value = JSON.parse(cachedData)
    isLoading.value = false
  }
  registerListener() // 注册事件监听器
})

onBeforeUnmount(() => {
  // 注销所有事件监听器
  window.electron.ipcRenderer.removeListener('update-FC04ClusterSumm', listenerIdSumm.value)
  listenerIdSumm.value = null
  // 清空监听器ID数组
})
</script>
<template>
  <div class="card">
    <!-- 系统总故障位单独渲染在第一行 -->
    <div v-if="systemFaultItem" class="system-fault-row">
      <div
        class="property-card system-fault-card"
        :class="{
          'important-item': isImportantItem(systemFaultItem.id),
          'normal-item': !isImportantItem(systemFaultItem.id),
          'dark-mode': isDarkTheme,
          'light-mode': !isDarkTheme
        }"
      >
        <div class="label">{{ systemFaultItem.label }}</div>
        <div class="value">
          {{ systemFaultItem.localizedValue || systemFaultItem.value }}
          <span v-if="systemFaultItem.unit"> {{ systemFaultItem.unit }}</span>
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
          'important-item': isImportantItem(item.id),
          'normal-item': !isImportantItem(item.id),
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
          {{ item.value }}<span v-if="item.unit"> {{ item.unit }}</span>
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
}

.system-fault-card {
  width: 100%;
  max-width: none;
  min-height: 5rem;
  padding: 1rem;
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

  // 鼠标悬停效果
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 0.5rem;
      padding: 2px;
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

// 发光动画 - 白天模式
@keyframes glow-light {
  from {
    box-shadow: 0 0 5px rgba(79, 70, 229, 0.5);
  }
  to {
    box-shadow:
      0 0 20px rgba(79, 70, 229, 0.8),
      0 0 30px rgba(79, 70, 229, 0.6);
  }
}

// 发光动画 - 夜间模式
@keyframes glow-dark {
  from {
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
  }
  to {
    box-shadow:
      0 0 20px rgba(59, 130, 246, 0.8),
      0 0 30px rgba(59, 130, 246, 0.6);
  }
}

// 根据主题模式应用不同的发光动画和渐变边框
.property-card.light-mode:hover::before {
  background: linear-gradient(45deg, #4f46e5, #06b6d4, #10b981, #f59e0b);
  animation: glow-light 2s ease-in-out infinite alternate;
}

.property-card.dark-mode:hover::before {
  background: linear-gradient(45deg, #3b82f6, #06b6d4, #10b981, #f59e0b);
  animation: glow-dark 2s ease-in-out infinite alternate;
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
