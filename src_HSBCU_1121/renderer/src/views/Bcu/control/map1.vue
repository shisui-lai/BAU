<template>
  <div class="card">
    <Dropdown
      v-model="showCharge"
      :options="isShowMapOptions"
      optionLabel="label"
      optionValue="value"
      placeholder="选择功率表"
      style="margin-bottom: 0.5rem"
    />

    <DataTable
      :value="displayedData"
      tableStyle="min-width: 20rem"
      class="center-table"
      showGridlines
      scrollable
      :fixedHeader="true"
    >
      <!-- 第一列：行标题 -->
      <Column
        v-if="dynamicColumns.length"
        :field="dynamicColumns[0].field"
        :header="dynamicColumns[0].header"
      />
      <!-- 其余列：根据colTitles动态渲染 -->
      <Column
        v-for="col in dynamicColumns.slice(1)"
        :key="col.field"
        :field="col.field"
        :header="col.header"
      />
    </DataTable>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onBeforeMount, onBeforeUnmount, computed } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'

const ipStore = useIpStore()
const MODULE_NAME = 'PowerMap'
const IPC_CHANNEL = 'update-FC04PowerMap'

// 存储每个IP的所有表格及标题数据
const DataPowerMap = reactive({})
const showCharge = ref(true)
const isShowMapOptions = [
  { label: '充电功率表', value: true },
  { label: '放电功率表', value: false }
]

// 接收到的当前IP对应的entry
const currentEntry = computed(() => {
  const ip = ipStore.selectedIp
  return (
    DataPowerMap[ip] || {
      chargeTable: [],
      dischargeTable: [],
      colTitlesChrg: [],
      rowTitlesChrg: [],
      colTitlesDis: [],
      rowTitlesDis: []
    }
  )
})

// 根据showCharge和entry，得到要渲染的数据和列定义
const displayedData = computed(() => {
  return showCharge.value ? currentEntry.value.chargeTable : currentEntry.value.dischargeTable
})

const dynamicColumns = computed(() => {
  const entry = currentEntry.value
  const isCh = showCharge.value
  // 先第一列为行标题
  const rowTitles = isCh ? entry.rowTitlesChrg : entry.rowTitlesDis
  const colTitles = isCh ? entry.colTitlesChrg : entry.colTitlesDis
  const cols = []
  // 第一列字段名 'rowTitle'
  cols.push({
    field: 'rowTitle',
    header: isCh ? '充电Map' : '放电Map'
  })
  // 接着列标题
  colTitles.forEach((title, idx) => {
    cols.push({ field: `C${idx + 1}`, header: title })
  })
  return cols
})

function onData(event, payload) {
  const deviceIp = payload.deviceIp || payload.ip
  if (!deviceIp) return
  const Arg = payload.Arg || {}

  DataPowerMap[deviceIp] = {
    chargeTable: Arg.chargeTable || [],
    dischargeTable: Arg.dischargeTable || [],
    colTitlesChrg: Arg.colTitlesChrg || [],
    rowTitlesChrg: Arg.rowTitlesChrg || [],
    colTitlesDis: Arg.colTitlesDis || [],
    rowTitlesDis: Arg.rowTitlesDis || []
  }
  localStorage.setItem(`${IPC_CHANNEL}-${deviceIp}`, JSON.stringify(DataPowerMap[deviceIp]))
}

function registerListener() {
  window.electron.ipcRenderer.removeAllListeners(IPC_CHANNEL)
  window.electron.ipcRenderer.on(IPC_CHANNEL, onData)
}

function startReading() {
  window.electron.ipcRenderer.send('start-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}

function stopReading() {
  window.electron.ipcRenderer.send('stop-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}

watch(
  () => ipStore.selectedIp,
  (newIp) => {
    const key = `${IPC_CHANNEL}-${newIp}`
    const cached = localStorage.getItem(key)
    if (cached) {
      DataPowerMap[newIp] = JSON.parse(cached)
    }
  },
  { immediate: true }
)

onBeforeMount(() => {
  registerListener()
  const key = `${IPC_CHANNEL}-${ipStore.selectedIp}`
  const cached = localStorage.getItem(key)
  if (cached) {
    DataPowerMap[ipStore.selectedIp] = JSON.parse(cached)
  }
  startReading()
})

onBeforeUnmount(() => {
  stopReading()
  window.electron.ipcRenderer.removeListener(IPC_CHANNEL, onData)
})
</script>

<style lang="less" scoped>
.center-table {
  text-align: center;
}
</style>
