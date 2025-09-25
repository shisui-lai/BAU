<script setup>
import { ref, watch, computed, onBeforeMount, reactive, onBeforeUnmount } from 'vue'
import { throttle } from 'lodash-es'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
const { locale, availableLocales, t } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useBalanceStore } from '../../../../../stores/balanceStore.js'
import { useVtSetStore } from '../../../../../stores/vtSetStore.js'
import { useViewStore } from '../../../../../stores/viewStore.js'
import { useBmuCountStore } from '../../../../../stores/bmuCountStore.js'
import clusterData from '../clusterData/clusterData.vue'
import { useIVCaliStore } from '../../../../../stores/ivCaliStore.js'
const ivCaliStore = useIVCaliStore()
const { ivData, kbData } = storeToRefs(ivCaliStore)
const balanceStore = useBalanceStore()
const balanceStoreFromVt = useVtSetStore()
const viewStore = useViewStore()
const bmuCountStore = useBmuCountStore()
const formatTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const hh = hours.toString().padStart(2, '0')
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')

  return `${hh}:${mm}:${ss}`
}
const pushCellDataV = throttle((newArr) => {
  cellVltg.value = newArr
}, 2000)
const pushCellDataT = throttle((newArr) => {
  cellTemp.value = newArr
}, 2000)
const pushCellDataSOC = throttle((newArr) => {
  cellSOC.value = newArr
}, 2000)
const pushCellDataSOH = throttle((newArr) => {
  cellSOH.value = newArr
}, 2000)
// 当前选中的 bmu 数据
const bmuData = computed(() => bmuCountStore.bmuCountData[ipStore.selectedIp] || {})
// 对应的中文标签
const labelMap = computed(() => ({
  bmuNum: t('clusterSummHome.bmuNum'),
  afeNum: t('clusterSummHome.afeNum'),
  cellNum: t('clusterSummHome.vNum'),
  tempNum: t('clusterSummHome.tNum')
}))
// 视图状态管理
const views = reactive({
  isCellVltg: {
    labelKey: 'cell.cellVoltage',
    event: 'update-FC04Vltg',
    type: 'cell',
    unit: 'V',
    filter: null
  },
  isCellTemp: {
    labelKey: 'cell.cellTemperature',
    event: 'update-FC04Temp',
    type: 'cell',
    unit: '℃',
    filter: null
  },
  isCellSOC: {
    labelKey: 'cell.cellSOC',
    event: 'update-FC04SOC',
    type: 'cell',
    unit: '%',
    filter: null
  },
  isCellSOH: {
    labelKey: 'cell.cellSOH',
    event: 'update-FC04SOH',
    type: 'cell',
    unit: '%',
    filter: null
  },
  isBMUVltg: {
    labelKey: 'bmu.bmuVoltage',
    event: 'update-FC04dataPackSumm1',
    type: 'bmu',
    filter: 'BMUVoltage',
    unit: 'V'
  },
  isBMUTemp: {
    labelKey: 'bmu.bmuTemperature',
    event: 'update-FC04dataPackSumm1',
    type: 'bmu',
    filter: 'BMUTemp',
    unit: '℃'
  },
  isPoleTemp: {
    labelKey: 'bmu.poleTemperature',
    event: 'update-FC04dataPackSumm1',
    type: 'bmu',
    filter: 'PoleTemp',
    unit: '℃'
  },
  isBMUSOC: {
    labelKey: 'bmu.bmuSOC',
    event: 'update-FC04dataPackSumm1',
    type: 'bmu',
    filter: 'BMUSOC',
    unit: '%'
  }
})

const cellVltg = ref([])
const cellTemp = ref([])
const cellSOC = ref([])
const cellSOH = ref([])
const DataPackSumm1 = ref([])
const ipStore = useIpStore()
const isIpValid = computed(() => {
  const ip = ipStore.selectedIp
  return ip && ip !== 'Connect First'
})
// 扁平化 pack → AFE 行
const displayData = computed(() => {
  if (currentView.value.type !== 'cell') {
    return []
  }
  // 不同视图复用同一个 map，以后如果要加其它 cell 视图只要加进去就行
  const map = {
    isCellVltg: cellVltg,
    isCellTemp: cellTemp,
    isCellSOC: cellSOC,
    isCellSOH: cellSOH
  }
  /* console.log(map) */
  // 直接读取子进程发过来的、已经是 [{packID,afeID,afeIdx,cells},…] 格式的数组
  const data = map[viewStore.activeView].value || []
  const raw = data
    .slice()
    .sort((a, b) => (a.packID !== b.packID ? a.packID - b.packID : a.afeID - b.afeID))
  const maxLen = Math.max(...raw.map((r) => r.cells.length))
  return raw.map((r) => ({
    ...r,
    cells: [
      ...r.cells,
      // 用 value:'-' index:'' 填满到 maxLen
      ...Array(maxLen - r.cells.length).fill({ value: '', index: '' })
    ]
  }))
})
// 每个 AFE 拥有的 cell 数量
const cellsPerAfe = computed(() => displayData.value[0]?.cells.length || 0)
const currentBalanceData = computed(() => balanceStore.balanceData[ipStore.selectedIp] || [])
// 在电压组件中添加计算函数
// 修改后的匹配函数
// 均衡高亮
function getCellBalanceInfo(packID, afeIdx, localIdx) {
  if (viewStore.activeView !== 'isCellVltg') return { balanced: false, mode: null }
  const entry = cellVltg.value.find((p) => p.packID === packID && p.afeIdx === afeIdx)
  if (!entry) return { balanced: false, mode: null }
  const cellIndex = entry.cells[localIdx]?.index
  if (!cellIndex) return { balanced: false, mode: null }
  const bmuList = balanceStore.balanceData[ipStore.selectedIp] || []
  const bmu = bmuList.find((p) => p.packID === packID) // 找到对应的BMU
  if (!bmu) return { balanced: false, mode: null }
  const cellInfo = bmu.cells.find((c) => c.index === cellIndex) // 找到对应的cell
  if (!cellInfo) {
    return { balanced: false, mode: null }
  }
  const current = ivData.value[ipStore.selectedIp]?.current || 0
  const mode = current > 0 ? 'charge' : 'discharge'
  return {
    balanced: cellInfo.value === 1,
    mode
  }
}
function getBalanceClass(packID, afeIdx, localIdx) {
  const info = getCellBalanceInfo(packID, afeIdx, localIdx)
  return {
    discharge: info.balanced && info.mode === 'discharge',
    charge: info.balanced && info.mode === 'charge'
  }
}

// 新增：累加所有 pack.totalVoltage
const totalVoltage = computed(() => {
  // 用 Map 去重：key=packID, value=totalVoltage
  const packVoltMap = new Map()
  for (const row of cellVltg.value) {
    // row.packID, row.totalVoltage
    if (!packVoltMap.has(row.packID) && typeof row.totalVoltage === 'number') {
      packVoltMap.set(row.packID, row.totalVoltage)
    }
  }
  // 求和并保留三位小数
  const sum = [...packVoltMap.values()].reduce((acc, v) => acc + v, 0)
  return sum.toFixed(1)
})
watch(
  totalVoltage,
  (newVal) => {
    if (!isIpValid.value) return
    bmuCountStore.setTotalVoltage(ipStore.selectedIp, newVal)
  },
  { immediate: true } // 初始时就触发一次
)
// 视图切换处理
const handleToggle = (key) => {
  /*   manualCollapsed.value = false */
  viewStore.setActiveView(key)
  // 新增：切换视图时主动更新BMU数据
  if (views[key].type === 'bmu') {
    const ip = ipStore.selectedIp
    const eventName = views[key].event
    const filter = views[key].filter

    if (state.deviceData[ip]?.[eventName]) {
      DataPackSumm1.value = state.deviceData[ip][eventName].filter(
        (item) => item?.classification === filter
      )
    } else {
      DataPackSumm1.value = []
    }
  }
}
// 生成列头 [1,2,3…]
const columnFields = computed(() => Array.from({ length: cellsPerAfe.value }, (_, i) => i + 1))
// 计算全局单体序号
function getGlobalCellNumber(packID, afeIdx, localIdx, cellData) {
  const data = displayData.value
  // 每包有多少个 AFE
  const afesPerPack = data.filter((d) => d.packID === packID).length
  // 每个 AFE 有多少个 cell
  const cellsPerAfe = data.find((d) => d.packID === packID)?.cells.length || 0
  const globalIndex = (packID - 1) * afesPerPack * cellsPerAfe + afeIdx * cellsPerAfe + localIdx
  const num = cellData.length ? globalIndex + 1 : ''
  return String(num).padStart(3, '0')
}
// 设备数据存储
const state = reactive({ deviceData: {} })
let listenerIds = ref([])
// 改进的监听器注册函数
function registerListener(eventName) {
  // 如果已注册该事件，则不重复注册
  window.electron.ipcRenderer.removeAllListeners(eventName)

  const handler = (event, { ip, Arg }) => {
    if (!Array.isArray(Arg)) return // 直接要求批量数组

    // 初始化数据结构：针对每个 IP，确保对应事件的数据为数组
    if (!state.deviceData[ip]) state.deviceData[ip] = {}
    // 初始化存储数组
    state.deviceData[ip][eventName] = []
    /* console.log(state) */
    // 只处理 cell 视图：批量 map 生成展示用结构
    if (eventName !== 'update-FC04dataPackSumm1' && ip === ipStore.selectedIp) {
      // 更新当前IP数据，同时写入缓存

      switch (eventName) {
        case 'update-FC04Vltg':
          const rawV = Array.isArray(Arg) ? Arg : []
          // 直接赋值，不再做任何扁平化
          pushCellDataV(rawV)
          localStorage.setItem(`update-FC04Vltg-${ip}`, JSON.stringify(cellVltg.value))
          break
        case 'update-FC04Temp':
          const rawT = Array.isArray(Arg) ? Arg : []
          pushCellDataT(rawT)
          localStorage.setItem(`update-FC04Temp-${ip}`, JSON.stringify(cellTemp.value))
          break
        case 'update-FC04SOC':
          const rawSOC = Array.isArray(Arg) ? Arg : []
          pushCellDataSOC(rawSOC)
          localStorage.setItem(`update-FC04SOC-${ip}`, JSON.stringify(cellSOC.value))
          break
        case 'update-FC04SOH':
          const rawSOH = Array.isArray(Arg) ? Arg : []
          pushCellDataSOH(rawSOH)
          localStorage.setItem(`update-FC04SOH-${ip}`, JSON.stringify(cellSOH.value))
          break
        case 'update-FC04dataPackSumm1':
          // 存储原始数据
          state.deviceData[ip][eventName] = Object.values(Arg).filter(Boolean)

          // 仅当当前视图是BMU类型时更新数据
          if (currentView.value.type === 'bmu' && ip === ipStore.selectedIp) {
            DataPackSumm1.value = state.deviceData[ip][eventName].filter(
              (item) => item?.classification === currentView.value.filter
            )
            localStorage.setItem(
              `update-FC04dataPackSumm1-${ip}`,
              JSON.stringify(DataPackSumm1.value)
            )
          }
          break
      }
    } else {
      // —— 仅 BMU summary 事件 ——
      const summary = Object.values(Arg).filter(Boolean)
      state.deviceData[ip][eventName] = summary
      if (ip === ipStore.selectedIp) {
        DataPackSumm1.value = summary.filter(
          (item) => item.classification === views[viewStore.activeView].filter
        )
      }
    }
  }

  window.electron.ipcRenderer.on(eventName, handler)
  listenerIds.value.push({ eventName, handler })
}

// IP切换处理（添加数组验证）
watch(
  () => ipStore.selectedIp,
  (newIp) => {
    const initData = (key) => {
      const data = state.deviceData[newIp]?.[views[key].event] || []
      return Array.isArray(data) ? [...data] : []
    }

    cellVltg.value = initData('isCellVltg')
    cellTemp.value = initData('isCellTemp')
    cellSOC.value = initData('isCellSOC')
    cellSOH.value = initData('isCellSOH')
    DataPackSumm1.value = initData(viewStore.activeView)
    // 修改：根据当前视图类型初始化数据
    if (currentView.value.type === 'bmu') {
      DataPackSumm1.value = (state.deviceData[newIp]?.[currentView.value.event] || []).filter(
        (item) => item?.classification === currentView.value.filter
      )
    } else {
      DataPackSumm1.value = initData(viewStore.activeView)
    }
  }
)
// 组件挂载处理
onBeforeMount(() => {
  Object.values(views).forEach((view) => {
    const cacheKey = `${view.event}-${ipStore.selectedIp}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      // 同步到对应的响应式变量和 state.deviceData
      switch (view.event) {
        case 'update-FC04Vltg':
          cellVltg.value = parsed
          if (!state.deviceData[ipStore.selectedIp]) {
            state.deviceData[ipStore.selectedIp] = {}
          }
          state.deviceData[ipStore.selectedIp][view.event] = parsed
          break
        case 'update-FC04Temp':
          cellTemp.value = parsed
          if (!state.deviceData[ipStore.selectedIp]) {
            state.deviceData[ipStore.selectedIp] = {}
          }
          state.deviceData[ipStore.selectedIp][view.event] = parsed
          break
        case 'update-FC04SOC':
          cellSOC.value = parsed
          if (!state.deviceData[ipStore.selectedIp]) {
            state.deviceData[ipStore.selectedIp] = {}
          }
          state.deviceData[ipStore.selectedIp][view.event] = parsed
          break
        case 'update-FC04SOH':
          cellSOH.value = parsed
          if (!state.deviceData[ipStore.selectedIp]) {
            state.deviceData[ipStore.selectedIp] = {}
          }
          state.deviceData[ipStore.selectedIp][view.event] = parsed
          break
        case 'update-FC04dataPackSumm1':
          DataPackSumm1.value = parsed
          if (!state.deviceData[ipStore.selectedIp]) {
            state.deviceData[ipStore.selectedIp] = {}
          }
          state.deviceData[ipStore.selectedIp][view.event] = parsed
          break
      }
    }
    registerListener(view.event)
  })
})
// 组件卸载处理
onBeforeUnmount(() => {
  listenerIds.value.forEach(({ eventName, handler }) => {
    window.electron.ipcRenderer.removeListener(eventName, handler)
  })
  listenerIds.value = []
})
// 当前视图配置
const currentView = computed(() => views[viewStore.activeView])
</script>

<template>
  <div>
    <!--   {{ ivData[ipStore.selectedIp].current }} -->
    <!--     {{ cellVltg }} -->
    <!--   {{ balanceStore.balanceData[ipStore.selectedIp] }} -->
    <div class="toolbar">
      <!--   {{ currentBalanceData }} -->
      <div class="btn-container">
        <div v-for="(view, key) in views" :key="key" class="btn-group">
          <ToggleButton
            :modelValue="viewStore.activeView === key"
            :onLabel="t(view.labelKey)"
            :offLabel="t(view.labelKey)"
            @change="handleToggle(key)"
          />
        </div>
      </div>
    </div>

    <div>
      <!-- 极值数据显示 - 所有视图都显示 -->
      <div class="data-group">
        <div><clusterData :key="viewStore.activeView" /></div>
        <div v-for="(value, key) in labelMap" :key="key" class="property-item">
          <div class="valueBMU">
            <div class="label">{{ value }}</div>
            <div class="value-content">{{ bmuData[key] }}</div>
          </div>
        </div>
        <div v-if="viewStore.activeView == 'isCellVltg'" class="balance-status-indicator">
          <span class="status-square"></span>
          <span>{{ t('cell.balanceModeDis') }}</span>
          <span class="status-squareForCharge"></span>
          <span>{{ t('cell.balanceModeChrg') }}</span>
          <span class="timer-text"
            >{{ t('cell.balanceTime') }}:
            {{ formatTime(balanceStoreFromVt.balanceTimer.remainingTime) }}</span
          >
        </div>
      </div>

      <!-- 单体数据表格 - 只在cell类型视图显示 -->
      <template v-if="currentView.type === 'cell'">
        <DataTable
          :value="displayData"
          showGridlines
          style="margin-top: 1rem; width: 100%"
          class="centered-table"
          :pt="{
            thead: { style: 'text-align: center;' },
            header: { style: 'text-align: center; justify-content: center;' }
          }"
        >
          <!-- BMU-AFE 列 -->
          <Column
            :header="t('cell.BMUAFENum')"
            headerStyle="white-space: nowrap; text-align: center;"
            bodyStyle="text-align: center;"
          >
            <template #body="{ data }">
              <strong v-if="data.afeID === 1"> BMU{{ data.packID }}-{{ data.afeID }} </strong>
              <span v-else> BMU{{ data.packID }}-{{ data.afeID }} </span>
            </template>
          </Column>
          <!-- 始终可见的嵌套表 -->
          <!-- 按单体序号渲染列 -->
          <Column
            v-for="col in columnFields"
            :key="col"
            :header="col"
            :style="{ width: `${100 / columnFields.length}%` }"
            headerStyle="text-align: center;"
            bodyStyle="text-align: center;"
          >
            <template #body="{ data }">
              <div class="voltage-cell" :class="getBalanceClass(data.packID, data.afeIdx, col - 1)">
                <template v-if="data.cells[col - 1]?.value">
                  <div style="font-variant-numeric: tabular-nums">
                    {{ data.cells[col - 1].value }} #{{ data.cells[col - 1].index }}
                  </div>
                </template>
              </div>
            </template>
          </Column>
        </DataTable>
      </template>

      <!-- BMU数据显示 -->
      <template v-else>
        <DataTable
          :value="DataPackSumm1"
          showGridlines
          v-if="DataPackSumm1.length > 0"
          style="margin-top: 1rem; width: 100%"
        >
          <Column>
            <template #body="slotProps">
              <div
                class="property-row"
                v-if="slotProps.data.element && slotProps.data.element.length > 0"
              >
                <div v-for="item in slotProps.data.element" :key="item.id">
                  <div class="value">
                    <div class="label">{{ item.label }}</div>
                    <div class="value-content">{{ item.value }}</div>
                  </div>
                </div>
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </div>
  </div>
</template>

<style scoped>
.centered-table :deep(.p-datatable-thead th) {
  text-align: center !important;
  vertical-align: middle !important;
}

.centered-table :deep(.p-datatable-tbody td) {
  text-align: center !important;
  vertical-align: middle !important;
}

/* 确保表头内容居中 */
.centered-table :deep(.p-column-header) {
  text-align: center !important;
}

.centered-table :deep(.p-column-header-content) {
  justify-content: center !important;
  text-align: center !important;
}
.toolbar {
  display: flex;
  width: 100%; /* 整条真正拉满视口 */
  overflow-x: visible; /* 超出也能横向滚动 */
}
.btn-container {
  display: flex;
  gap: 0.5rem;
}
.btn-wrapper {
  max-height: 3rem;
}
.data-group {
  width: 100%;
  align-items: center;
  flex-wrap: nowrap;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto; /* 如果这一块也要滚动，自己加 */
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
}
/* 添加 Grid 布局样式 */
.property-row {
  display: flex;
  flex-wrap: wrap; /* 允许换行 */
  gap: 0.5rem 1rem; /* 纵向行距 0.5rem，横向列距 1rem */
  margin-bottom: 1rem;
}
.value {
  flex: 0 1 auto; /* 紧贴内容且可收缩 */
  min-width: 4rem; /* 每个格子最小 4rem */
  padding: 0.25rem 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.value-content {
  margin-top: 0.3rem; /* 给 value 留出空间，避免和 label 重叠 */
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* 添加 !important 确保覆盖默认样式 */
.voltage-cell.discharge {
  background-color: rgb(28, 199, 28);
  border-radius: 5px;
}
.voltage-cell.charge {
  background-color: rgb(13, 145, 189);
  border-radius: 5px;
}
.balance-status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.5rem;
}

.status-square {
  width: 50px;
  height: 20px;
  background-color: rgb(28, 199, 28); /* 网页5的绿色方案 */
  border-radius: 6px;
}
.status-squareForCharge {
  width: 50px;
  height: 20px;
  background-color: rgb(13, 145, 189); /* 网页5的绿色方案 */
  border-radius: 6px;
}
.property-item {
  width: fit-content; /* 每个属性的宽度 */
}
.valueBMU {
  width: fit-content;
  min-width: 5rem;
  height: 2.9rem; /* 高度根据内容调整 */
  text-align: left;
  display: inline-block;
  position: relative;
  padding: 0rem 0.1rem;
  border-radius: 3px;
  border: 1px solid #e0e0e0;
}
.label {
  text-align: left;
  white-space: nowrap;
  font-weight: 600;
}
</style>
