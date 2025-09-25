<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, inject } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
const DataPackSumm1 = ref([])
let listenerId = ref(null)
// 获取父组件提供的 selectedIp
const ipStore = useIpStore() // 获取 Pinia store
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    DataPackSumm1.value = state.deviceData[newIp]?.['update-FC04dataPackSumm1'] || []
  },
  { immediate: true } // 初始时就触发一次
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
      DataPackSumm1.value = Arg.Arg
    }
  }
  window.electron.ipcRenderer.on('update-FC04dataPackSumm1', listenerId.value)
}

onBeforeMount(() => {
  registerListener() // 注册事件监听器
})

onBeforeUnmount(() => {
  // 注销所有事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04dataPackSumm1', listenerId.value)
    listenerId.value = null
    //console.log('已注销事件监听器: update-FC04dataPackSumm1')
  }

  // 清空监听器ID数组
})
</script>
<template>
  <div>
    <DataTable
      :value="DataPackSumm1.filter((item) => item?.classification === 'BMU失联信息')"
      dataKey="id"
      tableStyle="min-width: 10rem"
      class="center-table"
      showGridlines
    >
      <Column>
        <template #body="slotProps">
          <!--           <div class="classification">
            <b>{{ slotProps.data.classification }}</b>
          </div> -->
          <!-- 两行布局 -->
          <div
            class="property-row"
            v-if="slotProps.data.element && slotProps.data.element.length > 0"
          >
            <div v-for="item in slotProps.data.element" :key="item.id" class="property-item">
              <div class="value">
                <div class="label">{{ item.label }}</div>
                <div class="value-content">{{ item.value }}</div>
              </div>
            </div>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style lang="less" scoped>
.property-row {
  display: flex;
  align-items: left;
}

.property-item {
  width: 100px; /* 每个属性的宽度 */
  text-align: center;
  margin-right: 0.1px; /* 每个属性之间的间距 */
}
.label {
  position: absolute; /* 使得 label 能相对于 value 定位 */
  top: 0rem; /* 距离顶部一定的空间 */
  left: 0.4rem; /* 距离左边一定的空间 */
  font-size: 0.75rem;
  font-weight: bold;
  padding-right: 0.3rem; /* 给 label 增加一点空间 */
}

.value {
  width: 98px; /* 固定宽度 */
  height: auto; /* 高度根据内容调整 */
  max-height: 100px; /* 最大高度 */
  display: inline-block;
  position: relative; /* 使得内部的绝对定位元素相对于 value 进行定位 */
  padding: 0rem 1rem;
  border-radius: 3px; // 圆角
  border: 1.4px solid #b9c1c6db; /* 自定义边框颜色 */
}
.value-content {
  margin-top: 1.1rem; /* 给 value 留出空间，避免和 label 重叠 */
}
.classification {
  margin-bottom: 1rem;
}
</style>
