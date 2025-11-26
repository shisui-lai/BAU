<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore.js'
import { initDataVersionSumm } from './idToKey.js'
const DataClusterSumm = ref(initDataVersionSumm)
const translateDataClusterSumm = computed(() => {
  return DataClusterSumm.value.map((group) => ({
    classification:
      locale.value === 'zh'
        ? group.classification
        : te(`version.classification.${group.classification}`)
          ? t(`version.classification.${group.classification}`)
          : group.classification,
    element: group.element.map((item) => {
      const label =
        locale.value === 'zh'
          ? item.label
          : te(`version.label.${item.label}`)
            ? t(`version.label.${item.label}`)
            : item.label
      const displayValue =
        locale.value === 'zh'
          ? item.value
          : te(`version.value.${item.value}`)
            ? t(`version.value.${item.value}`)
            : item.value
      return {
        ...item,
        label,
        value: displayValue
      }
    })
  }))
})
let listenerIdSumm = ref(null) // 使用 ref 来存储事件监听器的 ID
const ipStore = useIpStore() // 获取 Pinia store
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})

watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    // 如果该IP的数据已经存在，直接使用它
    if (state.deviceData[newIp]) {
      DataClusterSumm.value =
        state.deviceData[newIp]['update-FC04dataVersion'] || initDataVersionSumm
    }
  },
  { immediate: true } // 初始时就触发一次
)
// 事件监听器
const registerListener = () => {
  // 移除之前可能存在的监听器
  if (listenerIdSumm.value) {
    window.electron.ipcRenderer.removeListener('update-FC04dataVersion', listenerIdSumm.value)
  }

  listenerIdSumm.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    const newData = Arg.Arg
    state.deviceData[deviceIp] = state.deviceData[deviceIp] || {}
    state.deviceData[deviceIp][event] = mergeData(state.deviceData[deviceIp][event], newData)
    /*     console.log(newData) */
    if (deviceIp === ipStore.selectedIp) {
      DataClusterSumm.value = mergeData(DataClusterSumm.value, newData)
      localStorage.setItem(
        `update-FC04dataVersion-${deviceIp}`,
        JSON.stringify(DataClusterSumm.value)
      )
    }
  }
  window.electron.ipcRenderer.on('update-FC04dataVersion', listenerIdSumm.value)
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
onBeforeMount(() => {
  const cacheKey = `update-FC04dataVersion-${ipStore.selectedIp}`
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    DataClusterSumm.value = JSON.parse(cachedData)
  }
  registerListener() // 注册事件监听器
})
onBeforeUnmount(() => {
  // 注销所有事件监听器
  window.electron.ipcRenderer.removeListener('update-FC04dataVersion', listenerIdSumm.value)
  listenerIdSumm.value = null
  // 清空监听器ID数组
})
</script>
<template>
  <div class="card">
    <div
      v-for="group in translateDataClusterSumm"
      :key="group.classification"
      class="group-section"
    >
      <h5>{{ group.classification }}</h5>
      <div class="items-grid">
        <div v-for="item in group.element" :key="item.id + item.label" class="item-card">
          <div class="item-label">{{ item.label }}</div>
          <div class="item-value">
            {{ item.value }} <span v-if="item.unit">{{ item.unit }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.group-section + .group-section {
  margin-top: 2rem;
}
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.75rem;
}
.item-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 4rem;
}
.item-label {
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-value {
  word-break: break-word;
}
</style>
