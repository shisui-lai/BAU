<template>
  <div class="card">
    <div v-if="!DataDisconnect.length" class="empty-state">
      <ProgressSpinner />
    </div>
    <div class="bmu-grid" v-else>
      <div v-for="(bmu, index) in bmuOptions" :key="index" class="bmu-card">
        <div class="card-header">
          <div>
            {{
              locale === 'zh'
                ? bmu.label
                : te(`disconnect.classification.${bmu.label}`)
                  ? t(`disconnect.classification.${bmu.label}`)
                  : bmu.label
            }}
          </div>
          <tag v-if="index > 0" :severity="getStatusSeverity(bmu.element)">
            {{ getStatusText(bmu.element) }}
          </tag>
        </div>
        <div class="card-content">
          <div
            v-for="item in DataDisconnect[index]?.element || []"
            :key="item.label"
            class="data-item"
          >
            <span
              >{{
                locale === 'zh'
                  ? item.label
                  : te(`disconnect.label.${item.label}`)
                    ? t(`disconnect.label.${item.label}`)
                    : item.label
              }}
              ：</span
            >
            <span
              :class="{
                'text-red-600': item.value === '掉线'
              }"
            >
              {{
                locale === 'zh'
                  ? item.value
                  : te(`disconnect.value.${item.value}`)
                    ? t(`disconnect.value.${item.value}`)
                    : item.value
              }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'
const { t, te, locale } = useI18n()
const DataDisconnect = ref([])
let listenerId = ref(null)
const selectedBMU = ref(0)
// 获取父组件提供的 selectedIp
const ipStore = useIpStore() // 获取 Pinia store
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    /*     console.log(`切换到 IP: ${newIp}`)
     */ // 这里假设你通过 `state.deviceData` 来存储不同 IP 对应的数据
    DataDisconnect.value = state.deviceData[newIp]?.['update-FC04DisconnectData'] || []
    /*     console.log('更新后的 DataDisconnect:', DataDisconnect) // 打印 DataPackSumm1 数据
     */
  },
  { immediate: true } // 初始时就触发一次
)
const bmuOptions = computed(() => {
  return DataDisconnect.value.map((bmu, index) => ({
    label: bmu.classification,
    element: bmu.element, // 添加 element 到 options
    isFirstCategory: index === 0 // 标记第一个分类
  }))
})
// 状态判断方法
const getStatusSeverity = (elements) => {
  // 第一个分类直接返回空
  if (elements.some((e) => typeof e.value === 'number')) return ''

  const allNormal = elements.every((e) => e.value === '正常')
  return allNormal ? 'success' : 'danger'
}

const getStatusText = (elements) => {
  // 第一个分类不显示文字
  if (elements.some((e) => typeof e.value === 'number')) return ''

  const allNormal = elements.every((e) => e.value === '正常')
  return allNormal ? t('disconnect.normal') : t('disconnect.disconnect')
}
// 事件监听器
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04DisconnectData')
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
      DataDisconnect.value = Arg.Arg
      localStorage.setItem(
        `update-FC04DisconnectData-${deviceIp}`,
        JSON.stringify(DataDisconnect.value)
      )
    }
  }
  window.electron.ipcRenderer.on('update-FC04DisconnectData', listenerId.value)
}

onBeforeMount(() => {
  const cacheKey = `update-FC04DisconnectData-${ipStore.selectedIp}`
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    DataDisconnect.value = JSON.parse(cachedData)
  }
  registerListener() // 注册事件监听器
})

onBeforeUnmount(() => {
  // 注销所有事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04DisconnectData', listenerId.value)
    listenerId.value = null
    //console.log('已注销事件监听器: update-FC04DisconnectData')
  } // 清空监听器ID数组
})
// 获取选中 BMU 的数据
const selectedBMUData = computed(() => DataDisconnect.value[selectedBMU.value]?.element || [])
function getBMURows(data) {
  const rows = []
  for (let i = 0; i < data.length; i += 8) {
    rows.push(data.slice(i, i + 8))
  }
  return rows
}
</script>

<style lang="less" scoped>
.bmu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
}

.bmu-card {
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
  border: 1px solid #bdbdbd;
  .card-header {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    gap: 1rem;
  }

  .card-content {
    padding: 1rem;
    .data-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
    }
  }
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
</style>
