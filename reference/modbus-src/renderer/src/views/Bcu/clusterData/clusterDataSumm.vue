<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, onMounted } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
const DataClusterSumm = ref([])
const expandedRows = ref([])
let listenerId = ref(null) // 使用 ref 来存储事件监听器的 ID
const ipStore = useIpStore() // 获取 Pinia store
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
const expandAll = () => {
  expandedRows.value = DataClusterSumm.value.reduce((acc, p) => (acc[p.id] = true) && acc, {})
}
const collapseAll = () => {
  expandedRows.value = {}
}
watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    /*  console.log(`切换到 IP: ${newIp}`) */
    // 更新显示的数据
    DataClusterSumm.value = state.deviceData[newIp]?.['update-FC04ClusterSumm'] || []
    expandedRows.value = {}
    // 初始化展开的行
    DataClusterSumm.value.forEach((row) => {
      expandedRows.value[row.id] = true
    })
  }
)
// 事件监听器
const registerListener = () => {
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
      DataClusterSumm.value = Arg.Arg
      DataClusterSumm.value.forEach((row) => {
        expandedRows.value[row.id] = true
      })
    }
  }
  window.electron.ipcRenderer.on('update-FC04ClusterSumm', listenerId.value)
}

onBeforeMount(() => {
  registerListener() // 注册事件监听器
})
onBeforeUnmount(() => {
  // 注销所有事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04ClusterSumm', listenerId.value)
    listenerId.value = null
  }

  // 清空监听器ID数组
})

/* onMounted(() => {
  watch(
    () => DataClusterSumm.value, // 监听 DataClusterSumm 的变化
    (newValue) => {
      console.log('DataClusterSumm 更新:', newValue)
    },
    { immediate: true } // 立即触发回调
  )
}) */
</script>

<template>
  <div class="card">
    <DataTable
      v-model:expandedRows="expandedRows"
      :value="DataClusterSumm"
      dataKey="id"
      tableStyle="min-width: 10rem"
      class="center-table"
      showGridlines
    >
      <template #header>
        <ButtonGroup>
          <Button label="展开" @click="expandAll" severity="secondary" />
          <Button label="折叠" @click="collapseAll" severity="secondary" />
        </ButtonGroup>
      </template>
      <!--       <Column :expander="true" headerStyle="width: 3rem" /> -->
      <Column field="classification">
        <template #body="slotProps">
          <b>{{ slotProps.data.classification }}</b>
        </template></Column
      >
      <template #expansion="slotProps">
        <!-- 两行布局 -->
        <div class="property-row">
          <div v-for="item in slotProps.data.element" :key="item.id" class="property-item">
            {{ item.label }}
          </div>
        </div>
        <div class="property-row">
          <div v-for="item in slotProps.data.element" :key="item.id" class="property-item">
            {{ item.value }}
          </div>
        </div>
      </template>
    </DataTable>
  </div>
</template>
<style lang="less" scoped>
/* 表格样式 */
.card {
  margin-left: 0px; /* 负的 margin 让 card 向左偏移 */
}
.center-table {
  border: 1px solid #ccc; /* 给整个表格加外部边框 */
  border-collapse: collapse; /* 合并相邻单元格边框 */
}

.center-table td,
.center-table th {
  border: 1px solid #ccc; /* 单元格网格线 */
}
.property-row {
  display: flex;
  align-items: left;
  margin-bottom: 1rem; /* 行间距 */
}

.property-item {
  width: 150px; /* 每个属性的宽度 */
  text-align: center;
  margin-right: 1px; /* 每个属性之间的间距 */
}
</style>
