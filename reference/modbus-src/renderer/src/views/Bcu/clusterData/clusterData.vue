<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useViewStore } from '../../../../../stores/viewStore.js'
import { initSummData, idToKeyForExtremeValue } from './idToKey.js'
import { throttle } from 'lodash-es'
const viewStore = useViewStore()
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()
const viewMapping = reactive({
  isCellVltg: ['单体电压极值'],
  isCellTemp: ['单体温度极值'],
  isCellSOC: ['单体SOC极值'],
  isCellSOH: ['单体SOH极值'],
  isBMUVltg: ['BMU电压极值'],
  isBMUTemp: ['BMU温度极值'],
  isPoleTemp: ['极柱温度极值']
  // Note: BMU SOC data is now handled in cellDataNew.vue via FC04dataPackSumm1
  // isBMUSOC: ['BMU SOC极值']
})
const SummData = ref(initSummData()) //用于存储簇端极值
const translatedSummData = computed(() => {
  return SummData.value.map((group) => ({
    classification: group.classification,
    element: group.element.map((item) => ({
      ...item,
      label: locale.value === 'zh' ? item.label : t(idToKeyForExtremeValue[item.id])
    }))
  }))
})
let listenerId = ref(null) // 使用 ref 来存储事件监听器的 ID
const ipStore = useIpStore() // 获取 Pinia store
const pushClusterData = throttle((newArr) => {
  SummData.value = newArr
}, 2000)
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
watch(
  () => ipStore.selectedIp,
  (newIp) => {
    SummData.value = state.deviceData[newIp]?.['update-FC04ClusExtreme'] || initSummData()
  },
  { immediate: true } // 初始时就触发一次
)
// 事件监听器
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04ClusExtreme')
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    const newData = Arg.Arg
    // 存储数据
    state.deviceData[deviceIp] = state.deviceData[deviceIp] || {}
    state.deviceData[deviceIp][event] = mergeData(state.deviceData[deviceIp][event], newData)
    // 如果当前选择的 IP，更新数据
    if (deviceIp === ipStore.selectedIp) {
      pushClusterData(mergeData(SummData.value, newData))
      localStorage.setItem(`update-FC04ClusExtreme-${deviceIp}`, JSON.stringify(SummData.value))
    }
  }
  window.electron.ipcRenderer.on('update-FC04ClusExtreme', listenerId.value)
}
const mergeData = (oldData, newData) => {
  return newData.map((newGroup) => {
    const oldGroup = oldData?.find((g) => g.classification === newGroup.classification)
    if (!oldGroup) return newGroup

    return {
      ...newGroup,
      element: newGroup.element.map((newItem) => {
        const oldItem = oldGroup.element.find((i) => i.label === newItem.label)
        return oldItem ? { ...oldItem, value: newItem.value } : newItem
      })
    }
  })
}
const viewConfigs = [
  {
    key: 'isCellVltg',
    filterFn: (item) => viewMapping.isCellVltg.includes(item.classification),
    tableProps: {}
  },
  {
    key: 'isCellTemp',
    filterFn: (item) => viewMapping.isCellTemp.includes(item.classification),
    tableProps: { tableStyle: 'min-width: 10rem' }
  },
  {
    key: 'isCellSOC',
    filterFn: (item) => viewMapping.isCellSOC.includes(item.classification),
    tableProps: { tableStyle: 'min-width: 10rem' }
  },
  {
    key: 'isCellSOH',
    filterFn: (item) => viewMapping.isCellSOH.includes(item.classification),
    tableProps: { tableStyle: 'min-width: 10rem' }
  },
  {
    key: 'isBMUVltg',
    filterFn: (item) => viewMapping.isBMUVltg.includes(item.classification),
    tableProps: { tableStyle: 'min-width: 10rem' }
  },
  {
    key: 'isBMUTemp',
    filterFn: (item) => viewMapping.isBMUTemp.includes(item.classification),
    tableProps: { tableStyle: 'min-width: 10rem' }
  },
  {
    key: 'isPoleTemp',
    filterFn: (item) => viewMapping.isPoleTemp.includes(item.classification),
    tableProps: { tableStyle: 'min-width: 10rem' }
  }
  // Note: BMU SOC data is now handled in cellDataNew.vue via FC04dataPackSumm1
  // {
  //   key: 'isBMUSOC',
  //   filterFn: (item) => viewMapping.isBMUSOC.includes(item.classification),
  //   tableProps: { tableStyle: 'min-width: 10rem' }
  // }
]
onBeforeMount(() => {
  const cacheKey = `update-FC04ClusExtreme-${ipStore.selectedIp}`
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    SummData.value = JSON.parse(cachedData)
  }
  registerListener() // 注册事件监听器
})
onBeforeUnmount(() => {
  // 注销所有事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04ClusExtreme', listenerId.value)
    listenerId = null
  }

  // 清空监听器ID数组
})
</script>
<template>
  <div class="fixed-container">
    <div v-for="cfg in viewConfigs" :key="cfg.key" v-show="viewStore.activeView === cfg.key">
      <DataTable
        :value="translatedSummData.filter(cfg.filterFn)"
        class="custom-datatable"
        v-bind="cfg.tableProps"
      >
        <Column>
          <template #body="{ data }">
            <div v-if="data.element?.length" class="property-row">
              <div v-for="item in data.element" :key="item.id" class="value2">
                <div class="label">{{ item.label }}</div>
                <div class="value-content">{{ item.value }}</div>
              </div>
            </div>
            <div v-else>
              <p>没有数据</p>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style lang="less" scoped>
/* 完整路径选择器 */
:deep(.custom-datatable) .p-datatable-wrapper table thead tr th {
  padding: 0rem 0rem;
  border: 0 !important;
}
:deep(.custom-datatable) .p-datatable-wrapper table tbody tr td {
  padding: 0rem 0rem;
  border: 0 !important;
}
.property-row {
  display: flex;
  gap: 0.5rem; // 列间距
}
.label {
  position: absolute; /* 使得 label 能相对于 value 定位 */
  left: 0.4rem; /* 距离左边一定的空间 */
  padding-right: 0.3rem; /* 给 label 增加一点空间 */
  white-space: nowrap;
  font-weight: 600;
}
.value2 {
  width: fit-content;
  min-width: 7rem;
  height: fit-content;
  min-height: 2.9rem; // 高度根据内容调整
  text-align: left;
  display: inline-block;
  position: relative; // 使得内部的绝对定位元素相对于 value 进行定位
  padding: 0rem 0.2rem;
  border-radius: 3px; // 圆角
  border: 1.4px solid #b9c1c6db; // 自定义边框颜色
}
.value-content {
  margin-top: 1.5rem; /* 给 value 留出空间，避免和 label 重叠 */
  white-space: nowrap;
}
</style>
