<template>
  <div class="card">
    <div v-if="isLoading">
      <div class="w-full xl:w-6/12 p-4">
        <Skeleton class="mb-2"></Skeleton>
        <Skeleton width="10rem" class="mb-2"></Skeleton>
        <Skeleton width="5rem" class="mb-2"></Skeleton>
        <Skeleton height="2rem" class="mb-2"></Skeleton>
        <Skeleton width="10rem" height="4rem"></Skeleton>
      </div>
    </div>
    <div v-else class="gpio-tables-wrapper">
      <div v-for="(rows, bmu) in gpioData" :key="bmu" class="gpio-table-card">
        <DataTable :value="rows" showGridlines>
          <Column field="bmuIndex" header="BMU" style="width: 3rem"> </Column>
          <Column field="bmuAFEString" header="GPIO" style="width: 10rem"> </Column>
          <Column field="value" header="GPIO Voltage" style="width: 8rem"> </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, nextTick, watch } from 'vue'
import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Skeleton from 'primevue/skeleton'

const { selectedCluster } = useClusterSelect()

const gpioData = ref([])
const state = reactive({
  deviceData: {} // Cache by clusterKey
})
let isLoading = ref(true)

const handlerGpioData = (event, msg) => {
  // msg structure: { blockId, clusterId, dataType, data: result, ... }
  if (!msg || !msg.data) return
  
  const clusterKey = `${msg.blockId}-${msg.clusterId}`
  const parsedData = msg.data
  
  state.deviceData[clusterKey] = parsedData
  
  if (clusterKey === selectedCluster.value) {
    gpioData.value = parsedData
    isLoading.value = false
  }
}

const registerListener = () => {
  if (window.electron && window.electron.ipcRenderer) {
    window.electron.ipcRenderer.removeAllListeners('BMU_DEBUG')
    window.electron.ipcRenderer.on('BMU_DEBUG', handlerGpioData)
  }
}

watch(
  selectedCluster,
  (newCluster) => {
    const cached = state.deviceData[newCluster]
    if (cached) {
      gpioData.value = cached
      isLoading.value = false
    } else {
      gpioData.value = []
      isLoading.value = true
    }
  },
  { immediate: true }
)

onBeforeMount(async () => {
  await nextTick()
  registerListener()
})

onBeforeUnmount(() => {
  if (window.electron && window.electron.ipcRenderer) {
    window.electron.ipcRenderer.removeAllListeners('BMU_DEBUG')
  }
})
</script>

<style lang="less" scoped>
.gpio-tables-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem; // 表格之间的间距
  align-items: flex-start;
}
.gpio-table-card {
  flex: 0 0 300px; // 每个表格大约 260px 宽，可按需要调
}
</style>
