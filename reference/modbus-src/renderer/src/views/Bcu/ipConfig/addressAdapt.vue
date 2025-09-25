<script setup>
import { ref, onMounted, onBeforeUnmount, computed, reactive, onBeforeMount, watch } from 'vue'
import selectInterface from './selectInterface.vue'
import { useConfirm } from 'primevue/useconfirm'
const confirm = useConfirm()
import { useIpStore } from '../../../../../stores/ipStore'
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
const { t, te, locale } = useI18n()
const toast = useToast()
const ipStore = useIpStore() // 获取 Pinia store
const statusTimer = ref(null)
let addressObj = ref({
  addressStart: '208',
  numBCU: ''
})
let addressBMUObj = ref({
  flagStart: '0x5BB5',
  addressStart: 'B0',
  numBMU: ''
})
const flagStartOptions = ref([
  { label: '启动', value: '0x5BB5' },
  { label: '停止', value: '0x1221' }
])
// 1. 新增：存放正在自适应的 IP 集合
const pendingAdaptIps = reactive(new Set())
let listenerId = ref(null)
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
const initBMUAdaptData = () => [
  {
    classification: 'BMU自适应反馈信息',
    element: [
      {
        label: 'BCU执行标识-状态',
        value: '-',
        row: '-'
      },
      {
        label: 'BCU执行标识-内容1',
        value: '-',
        row: '-'
      },
      {
        label: 'BCU执行标识-内容2',
        value: '-',
        row: '-'
      },
      {
        label: 'BCU执行标识-内容3',
        value: '-',
        row: '-'
      }
    ]
  }
]
const bmuAdaptData = ref(initBMUAdaptData())
const ipstore = useIpStore() // 获取 Pinia store
const { selectedInterface, ipList, responses, selectedIp, lastManualSelectedIp } =
  storeToRefs(ipstore) // 这里使用 storeToRefs
const MODULE_NAME = 'Adapt'
const ipOptions = computed(() =>
  ipList.value.map((ip, index) => {
    const bcuLabel = `BCU${index + 1}` // 根据索引生成 BCU 标识
    return { label: `${bcuLabel} (${ip})`, value: ip }
  })
)
const startReading = () => {
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}
const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
const deviceMessages = ref([])
const addressAdaptResult = ref({ success: undefined, error: undefined }) // 确保初始化为一个对象
// 新增两个响应式变量，用来存储 adapt-error 与 adapt-progress 信息
const adaptError = ref(null)
const adaptProgress = ref(null)
/* const responses = ref([]) */
const getFullAddress = () => {
  return `192.168.10.${addressObj.value.addressStart}` //拼接前缀和用户输入
}
const isValidIpSuffix = (ipSuffix) => {
  const num = Number(ipSuffix)
  return !isNaN(num) && num >= 100 && num <= 255
}
const isValidNumBCU = (numBCU) => {
  return !isNaN(numBCU) && numBCU > 0
}
// 判断所有输入是否有效
const isFormValid = computed(() => {
  const { addressStart, numBCU } = addressObj.value
  return isValidIpSuffix(addressStart) && isValidNumBCU(numBCU)
})
const bmuValid = computed(() => {
  return (
    addressBMUObj.value.addressStart.length > 0 && // 十六进制地址验证
    Number(addressBMUObj.value.numBMU) > 0 && // 数字有效性验证
    selectedIp.value // 必须选择至少一个IP
  )
})
// 新增响应式状态
const showStatus = ref(false)
const currentStatus = ref('')
// 新增计算属性获取状态值
const statusValue = computed(() => {
  const statusItem = bmuAdaptData.value[0]?.element?.find(
    (item) => item.label === 'BCU执行标识-状态'
  )
  return statusItem?.value || null
})
// 先注册一次“开始”提示
const startHandler = () => {
  toast.add({
    severity: 'info',
    summary: 'Start',
    detail: t('addressAdapt.bcu.messageMap.toastStart'),
    life: 3000
  })
  window.electron.ipcRenderer.removeListener('bcu adapt start', startHandler)
}
function sendBCUAdaptConfirm() {
  confirm.require({
    message: t('addressAdapt.bcu.confirmMessage'),
    header: t('addressAdapt.bcu.confirmTitle'),
    accept: () => {
      sendValue()
    },
    acceptLabel: t('password.confirm') || '确认', // 确保这里有合适的文本
    rejectLabel: t('password.cancel') || '取消' // 确保这里有文本
  })
}
const sendValue = () => {
  if (addressObj.value.numBCU < responses.value.length) {
    toast.add({
      severity: 'warn',
      summary: 'warnging',
      detail: t('addressAdapt.bcu.messageMap.toastNumFew', { count: responses.value.length }),
      life: 5000
    })
    return
  } else if (addressObj.value.numBCU > responses.value.length) {
    toast.add({
      severity: 'warn',
      summary: 'warning',
      detail: t('addressAdapt.bcu.messageMap.toastNumMore', { count: responses.value.length }),
      life: 5000
    })
    return
  }
  // 重置错误和进度信息
  adaptError.value = null
  adaptProgress.value = null
  ipList.value.forEach((ip) => window.electron.ipcRenderer.send('disconnect', { ip }))
  ipstore.stopCommunicationAll()
  ipstore.disconnectAll()

  const fullAddress = getFullAddress()
  const numBCU = addressObj.value.numBCU
  console.log({
    addressStart: fullAddress,
    numBCU,
    selectedInterface: selectedInterface.value
  })
  window.electron.ipcRenderer.send('address-adapt', {
    addressStart: fullAddress,
    numBCU,
    selectedInterface: selectedInterface.value
  })
}
const failureReason = computed(() => {
  const item = bmuAdaptData.value[0].element.find((i) => i.label === 'BCU执行标识-内容3')
  return item ? item.value : ''
})
const sendBMUValue = async () => {
  bmuAdaptData.value = initBMUAdaptData()
  showStatus.value = true // 点击后显示状态
  currentStatus.value = '' // 重置状态
  if (statusTimer.value) {
    clearTimeout(statusTimer.value)
  }
  // 设置3秒后自动隐藏
  statusTimer.value = setTimeout(() => {
    showStatus.value = false
  }, 10000)
  const writeData = [
    {
      address: 0xc20c,
      value: 0x5bb5,
      ip: selectedIp.value
    },
    {
      address: 0xc20d,
      value: parseInt(addressBMUObj.value.addressStart, 16),
      ip: selectedIp.value
    },
    {
      address: 0xc20e,
      value: parseInt(addressBMUObj.value.numBMU, 16),
      ip: selectedIp.value
    }
  ]
  /*   console.log('BMU值', writeData) */
  try {
    // invoke 模式自动管理 listener
    const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', writeData)

    if (res.success) {
      toast.add({
        severity: 'info',
        summary: 'Reminder',
        detail: t('addressAdapt.bmu.messageMap.toastStart'),
        life: 3000
      })
      // 延迟 1s 后把 IP 加入待适配列表
      setTimeout(() => pendingAdaptIps.add(selectedIp.value), 1000)
    } else {
      throw new Error(res.error || '未知错误')
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: '写入失败',
      detail: err.message,
      life: 5000
    })
  }
}
// 监听数据变化（假设数据更新会触发响应）
/* watch(
  bmuAdaptData,
  (newVal) => {
    if (showStatus.value) {
      const statusItem = newVal[0]?.element?.find((item) => item.label === 'BCU执行标识-状态')
      currentStatus.value = statusItem?.value || '等待响应...'
    }
  },
  { deep: true }
) */
// 定义响应式数组，存储所有地址的自适应反馈
const addressResults = ref([])
onMounted(() => {
  window.electron.ipcRenderer.once('bcu adapt start', startHandler)
  window.electron.ipcRenderer.once('device-message', (event, data) => {
    deviceMessages.value.push(data)
    console.log(deviceMessages.value)
  })
  window.electron.ipcRenderer.on('address-adapt-result', (event, result) => {
    console.log('收到address-adapt-result，result:', result)
    if (result.success) {
      toast.add({
        severity: 'success',
        summary: '自适应成功',
        detail: `成功分配 ${result.assigned} 台设备${result.error ? `，${result.error}` : ''}`,
        life: 5000
      })
      adaptError.value = null // 确保成功时不显示错误信息
    } else {
      toast.add({
        severity: 'error',
        summary: '自适应失败',
        detail: result.error,
        life: 10000
      })
    }
  })
  // 监听 adapt-error 反馈
  window.electron.ipcRenderer.on('adapt-error', (event, errorData) => {
    adaptError.value = errorData
    // 你也可以将错误数据添加到 addressResults，便于统一显示
    addressResults.value.push({
      address: '-',
      status: 'failed',
      error: errorData.error || 'unknown error'
    })
    toast.add({
      severity: 'error',
      summary: 'error',
      detail: errorData.error || 'unknown error',
      life: 10000
    })
    console.log('收到 adapt-error:', errorData)
  })

  // 监听 adapt-progress 反馈
  window.electron.ipcRenderer.on('adapt-progress', (event, progressData) => {
    adaptProgress.value = progressData
    // 这里可以对进度信息进行展示，比如更新进度条或在页面上显示当前设备、已分配地址等信息
    console.log('收到 adapt-progress:', progressData)
  })
})
const mergeData = (oldData, newData) => {
  return newData.map((newGroup) => {
    const oldGroup = oldData?.find((g) => g.classification === newGroup.classification)
    if (!oldGroup) return newGroup

    return {
      ...newGroup,
      element: newGroup.element.map((newItem) => {
        const oldItem = oldGroup.element.find((i) => i.label === newItem.label)
        return oldItem ? { ...oldItem, value: newItem.value, row: newItem.row } : newItem
      })
    }
  })
}
watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    // 如果该IP的数据已经存在，直接使用它
    if (state.deviceData[newIp]) {
      bmuAdaptData.value = state.deviceData[newIp]['update-FC04AdaptData'] || initBMUAdaptData()
    }
    /*   ipstore.manuallySelectIp(newIp) */
  },
  { immediate: true } // 初始时就触发一次
)
// 监听 ipList 变化，一旦长度 > 0，就清掉之前那条“自适应地址成功”提示
watch(selectedIp, (newList) => {
  if (newList.length > 1) {
    toast.removeAllGroups()
    toast.removeAllGroups()
    // 或者 toast.clear(key) 如果你给那条 toast 指定了 key\
    adaptProgress.value = null
  }
})
// 事件监听器
const registerListener = () => {
  const channel = 'update-FC04AdaptData'
  console.log('注册事件监听器: channel')
  // listener for 'update-FC04ClusterSumm'
  window.electron.ipcRenderer.removeAllListeners(channel) // 移除设备消息监听
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    /* console.log('pendingAdaptIps:', pendingAdaptIps) */
    if (!pendingAdaptIps.has(deviceIp)) return
    const newData = Arg.Arg
    // 拿到最新的状态字段

    const statusItem = newData[0].element.find((i) => i.label === 'BCU执行标识-状态')
    const status = statusItem?.value
    console.log('收到update-FC04AdaptData:', status, pendingAdaptIps)
    // 如果检测到“成功”或“失败”——终态，一定删除
    if (status === 'BMU自适应地址成功' || status === 'BMU自适应地址失败') {
      // ← 在这里移除
      pendingAdaptIps.delete(deviceIp)
    }
    // 拿旧数据，合并
    const old = state.deviceData[deviceIp]?.[channel] || initBMUAdaptData()
    const merged = mergeData(old, newData)
    // 更新到 state.deviceData
    state.deviceData[deviceIp] = {
      ...(state.deviceData[deviceIp] || {}),
      [channel]: merged
    }

    if (deviceIp === ipStore.selectedIp) {
      bmuAdaptData.value = merged
    }
    /*  console.log(bmuAdaptData.value) */
  }
  window.electron.ipcRenderer.on('update-FC04AdaptData', listenerId.value)
}
onBeforeMount(() => {
  startReading()
  registerListener() // 注册事件监听器
})
// 组件销毁时移除事件监听
onBeforeUnmount(() => {
  stopReading()
  if (statusTimer.value) {
    clearTimeout(statusTimer.value)
  }
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04AdaptData', listenerId.value)
    listenerId.value = null
    //console.log('已注销事件监听器: update-FC04AdaptData')
  }
  window.electron.ipcRenderer.removeAllListeners('device-message') // 移除设备消息监听
  window.electron.ipcRenderer.removeAllListeners('address-adapt-result') // 移除自适应地址结果监听
  window.electron.ipcRenderer.removeAllListeners('adapt-error')
  window.electron.ipcRenderer.removeAllListeners('adapt-progress')
  window.electron.ipcRenderer.removeAllListeners('bcu adapt start')
})
</script>
<template>
  <div class="card">
    <div class="sectionIp"><selectInterface /></div>
    <div class="sectionDisplay">
      <div class="card">
        <!--  {{ ipStore.getModuleReadingStatus(MODULE_NAME) }} -->
        <h5>{{ t('addressAdapt.bcu.title') }}</h5>
        <div style="display: flex; align-items: center; margin-bottom: 1rem">
          <label for addressObj.addressStart>{{ t('addressAdapt.bcu.addressStart') }}：</label>
          <InputText
            v-model="addressObj.addressStart"
            :placeholder="t('addressAdapt.bcu.addressStartPlaceholder')"
            class="flex-1"
          />
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 1rem">
          <label for addressObj.numBCU>{{ t('addressAdapt.bcu.bcuNum') }}：</label>
          <InputText
            v-model="addressObj.numBCU"
            class="flex-1"
            :placeholder="t('addressAdapt.bcu.bcuNumPlaceholder')"
          />
        </div>
        <div style="display: flex; gap: 2rem; align-items: center">
          <Button
            :label="t('addressAdapt.bcu.startButton')"
            @click="sendBCUAdaptConfirm"
            :disabled="!isFormValid"
            icon="pi pi-play"
          />
          <div>
            <!--      <DataTable
              :value="addressResults"
              responsiveLayout="scroll"
              v-if="addressResults.length > 0"
            >
              <Column field="address" header="地址"></Column>
              <Column field="status" header="状态">
                <template #body="slotProps">
                  <span
                    :class="{
                      'text-success': slotProps.data.status === '成功',
                      'text-error': slotProps.data.status === '失败'
                    }"
                  >
                    {{ slotProps.data.status }}
                  </span>
                </template>
              </Column>
              <Column field="error" header="错误信息"></Column>
            </DataTable>
            <div v-else class="no-results">等待自适应结果……</div> -->
            <!-- 显示 adapt-error 与 adapt-progress 信息 -->
            <div v-if="adaptError">
              <strong>{{ t('addressAdapt.bcu.error') }}:</strong> {{ adaptError.error }}
            </div>
            <div v-if="adaptProgress">
              {{ t('addressAdapt.bcu.currentAdpapted', { count: adaptProgress.current }) }} /
              {{ adaptProgress.total
              }}<!-- ，当前设备: {{ adaptProgress.currentDevice }} -->
            </div>
          </div>
        </div>

        <!-- <div style="display: flex; flex-direction: column">
                      <div v-for="(msg, index) in deviceMessages" :key="index" style="margin-top: 0.3rem">
              <strong>{{ msg.type }}:</strong> {{ msg.message }}
            </div>
            <div v-if="addressAdaptResult.success !== undefined" style="margin-top: 0.3rem">
              <span
                >BCU自适应地址
                {{ addressAdaptResult.success ? '成功' : '失败' }},重新查询ip并连接</span
              >
              <p v-if="addressAdaptResult.error">{{ addressAdaptResult.error }}</p>
            </div> 
        </div>-->
      </div>
      <div class="card">
        <h5>{{ t('addressAdapt.bmu.title') }}</h5>
        <!--  {{ lastManualSelectedIp }} -->
        <div style="display: flex; align-items: center; margin-bottom: 1rem">
          <label for="ipList">{{ t('addressAdapt.bmu.bcuSelect') }}：</label>
          <Dropdown
            v-model="selectedIp"
            :options="ipOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('addressAdapt.bmu.bcuSelectPlaceholder')"
            class="flex-1"
          />
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 1rem">
          <label for addressBMUObj.addressStart>{{ t('addressAdapt.bmu.addressStart') }}：</label>
          <InputText
            v-model="addressBMUObj.addressStart"
            :placeholder="t('addressAdapt.bmu.addressStartPlaceholder')"
            class="flex-1"
          />
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 1rem">
          <label for addressBMUObj.numBMU>{{ t('addressAdapt.bmu.bmuNum') }}：</label>
          <InputText
            v-model="addressBMUObj.numBMU"
            :placeholder="t('addressAdapt.bmu.bmuNumPlaceholder')"
            class="flex-1"
          />
        </div>
        <div style="display: flex; gap: 2rem; align-items: center">
          <Button
            :label="t('addressAdapt.bmu.startButton')"
            @click="sendBMUValue"
            :disabled="!bmuValid"
            icon="pi pi-play"
          />
          <!-- 新增状态显示 -->
          <div v-if="showStatus" style="display: flex; align-items: center">
            <span>{{
              locale === 'zh'
                ? statusValue
                : te(`addressAdapt.bmu.messageMap.${statusValue}`)
                  ? t(`addressAdapt.bmu.messageMap.${statusValue}`)
                  : statusValue
            }}</span>
            <div v-if="statusValue === 'BMU自适应地址失败'">
              --{{
                locale === 'zh'
                  ? failureReason
                  : te(`addressAdapt.bmu.messageMap.${failureReason}`)
                    ? t(`addressAdapt.bmu.messageMap.${failureReason}`)
                    : failureReason
              }}
            </div>
          </div>
        </div>
        <!--         <DataTable :value="bmuAdaptData[0].element" showGridlines>
          <Column field="label" header="BMU自适应结果"> </Column>
          <Column field="value" header="实时值"> </Column>
          <Column field="row" header="原始值"> </Column>
        </DataTable> -->
      </div>
    </div>
  </div>
</template>
<style>
.sectionIp {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
  border: 1px solid #bdbdbd;
}
.sectionDisplay {
  margin-top: 3rem;
  display: flex;
  gap: 1rem;
  width: 100%;
}
/* 2. 给三个子块分别设置 flex 比例 1 : 1 : 2 */
.sectionDisplay > div:nth-child(1) {
  flex: 1; /* 占 1 份 */
  min-width: 0; /* 防止内部内容撑破布局 */
}

.sectionDisplay > div:nth-child(2) {
  flex: 1; /* 占 1 份 */
  min-width: 0;
}

.section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
}
.error-text {
  color: #ff4444;
  font-size: 0.8rem;
  margin: 0.2rem 0;
}
.status-display {
  margin-top: 0.5rem;
  animation: fadeIn 0.3s ease-in;
}

.text-success {
  color: green;
}
.text-error {
  color: red;
}

.no-results {
  font-style: italic;
  color: #888;
}
</style>
