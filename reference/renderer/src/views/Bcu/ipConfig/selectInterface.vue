<template>
<div class="card">
    <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem">
      <h5>{{ t('connect.queryConnection') }}</h5>
      <div style="display: flex; gap: 0.8rem; align-items: center">
        <label for="selectedInterface">{{ t('connect.selectPCNetworkCard') }}：</label>
        <Dropdown
          id="iface"
          v-model="selectedInterface"
          :options="interfaceOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="t('connect.selectPCNetworkCardPlaceholder')"
          @focus="fetchNetworkInterfaces"
        />
        <Button @click="queryDevices" :disabled="!selectedInterface || isQuerying"
          ><strong>{{ t('connect.queryDevice') }}</strong></Button
        >
        <div>
          <ButtonGroup>
            <Button
              :label="
                ipstore.ipList.some((ip) => ipstore.getIpConnected(ip))
                  ? t('connect.disconnectAll')
                  : t('connect.connectAll')
              "
              @click="toggleConnection"
              :severity="
                ipstore.ipList.some((ip) => ipstore.getIpConnected(ip)) ? 'secondary' : 'info'
              "
              :disabled="modbusClients.length === 0 || hasActiveCommunication || isQuerying"
            />
            <Button
              :label="
                (someCommunicating = ipstore.ipList.some((ip) =>
                  ipstore.getIpCommunicationActive(ip)
                )
                  ? t('connect.stop')
                  : t('connect.start'))
              "
              @click="toggleCommunication"
              :severity="
                (someCommunicating = ipstore.ipList.some((ip) =>
                  ipstore.getIpCommunicationActive(ip)
                )
                  ? 'secondary'
                  : 'info')
              "
              :disabled="modbusClients.length === 0 || !hasActiveConnection || isQuerying"
            />
          </ButtonGroup>
          <!--  {{ ipstore.isCommunicationActive }} -->
        </div>
        <div class="query-status-header">
            <span v-if="isQuerying">{{ t('connect.queryingDevices') }}</span>
            <span v-else> {{ t('connect.queryedDevice', { count: responses.length }) }}：</span>
          </div>
      </div>
      <div v-if="modbusClients.length > 0 || isQuerying">
        <div class="clients-list">
          <div
            v-if="!isQuerying"
            v-for="(client, index) in sortedModbusClients"
            :key="index"
            class="client-item"
          >
            <div class="client-row">
              <!-- BCU序号显示 -->
              <span>BCU{{ index + 1 }}：</span>
              <InputText
                v-model="client.ModbusServerIP"
                @input="validateIp(client.ModbusServerIP, index)"
                :readonly="true"
                placeholder="Enter Modbus IP"
              />
              <!--   {{ ipstore.getIpConnected(client.ModbusServerIP) }} -->
              <!-- {{ ipstore.isConnected[client.ModbusServerIP] }} -->
              <!--  {{ ipstore.getIpCommunicationActive(client.ModbusServerIP) }} -->
              <ButtonGroup>
                <Button
                  :label="
                    ipstore.getIpConnected(client.ModbusServerIP)
                      ? t('connect.disconnect')
                      : t('connect.connect')
                  "
                  @click="toggleConnectionForIp(client)"
                  :severity="ipstore.getIpConnected(client.ModbusServerIP) ? 'secondary' : 'info'"
                  :disabled="
                    modbusClients.length === 0 ||
                    ipstore.getIpCommunicationActive(client.ModbusServerIP)
                  "
                />
                <Button
                  :label="
                    ipstore.getIpCommunicationActive(client.ModbusServerIP)
                      ? t('connect.stop')
                      : t('connect.start')
                  "
                  @click="toggleCommunicationForIp(client)"
                  :severity="
                    ipstore.getIpCommunicationActive(client.ModbusServerIP) ? 'secondary' : 'info'
                  "
                  :disabled="
                    modbusClients.length === 0 || !ipstore.getIpConnected(client.ModbusServerIP)
                  "
                  style="margin-left: 0.2rem"
                />
              </ButtonGroup>
              <div v-if="ipstore.getConnectionStatus(client.ModbusServerIP)">
                <!-- {{ ipstore.getConnectionStatus(client.ModbusServerIP) }} -->
                <span v-if="errors[index]" class="error-message">{{ errors[index] }}</span>
                <!-- 显示连接状态 -->
                <span
                  v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'success'"
                  class="success-message"
                  >{{ t('connect.statusSuccess') }}</span
                >
                <span
                  v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'failed'"
                  class="error-message"
                  >{{ t('connect.statusFail') }}</span
                >
                <span
                  v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'disconnected'"
                  class="error-message"
                  >{{ t('connect.statusDisconnect') }}</span
                >
                <span
                  v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'interrupted'"
                  class="error-message"
                  >{{ t('connect.statusInterrupt') }}</span
                >
                <span
                  v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'connecting'"
                  class="info-message"
                  >{{ t('connect.statusConnecting') }}</span
                >
                <span
                  v-if="
                    ipstore.getConnectionStatus(client.ModbusServerIP) === 'startAllCommunication'
                  "
                  class="success-message"
                  >{{ t('connect.statusCommunicating') }}</span
                >
                <span
                  v-if="
                    ipstore.getConnectionStatus(client.ModbusServerIP) === 'stopAllCommunication'
                  "
                  class="info-message"
                  >{{ t('connect.statusStopCommunicate') }}.</span
                >
                <span
                  v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'reconnectting'"
                  class="info-message"
                  >{{ t('connect.statusConnecting') }}</span
                >
                <span
                  v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'terminated'"
                  class="error-message"
                  >{{ t('connect.statusTerminated') }}</span
                >
              </div>
            </div>
            <!--        {{ ipstore.getIpCommunicationActive(client.ModbusServerIP) }} -->
          </div>
        </div>
      </div>
    </div>
    <!-- 设备连接 -->
  <!--   {{ modbusClients }} -->
</div>
</template>
<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore'
import { useToast } from 'primevue/usetoast'
const ipstore = useIpStore() // 获取 Pinia store
const toast = useToast() // 获取 toast 实例
const networkInterfaces = ref([]) // 网络接口
const selectedInterface = ref(ipstore.selectedInterface) // 选择的接口
const selectedInterfaceName = ref(ipstore.selectedInterfaceName) // 选择的接口
const responses = ref(ipstore.responses) // 查询到的设备
const modbusClients = ref(
  ipstore.ipList.map((ip) => ({ ModbusServerIP: ip, ModbusServerSum: 25, skills: [] })) // 确保 modbusClients 是对象数组
)
const errors = ref([]) // 用于存储每个IP输入框的错误信息
const isGetIpList = ref(ipstore.isGetIpList) // 是否获取 IP 列表
const isQuerying = ref(false) // 添加查询状态管理
const startReading = (targetIp = 'all') => {
  window.electron.ipcRenderer.send('start-reading-data', {
    action: 'start',
    targetIp: targetIp
  })
}

const stopReading = (targetIp = 'all') => {
  window.electron.ipcRenderer.send('stop-reading-data', {
    action: 'stop',
    targetIp: targetIp
  })
}
const hasActiveCommunication = computed(() => {
  return ipstore.ipList.some((ip) => ipstore.getIpCommunicationActive(ip))
})
const hasActiveConnection = computed(() => {
  return ipstore.ipList.some((ip) => ipstore.getIpConnected(ip))
})

// 切换通讯状态(全部)
const toggleCommunication = () => {
  // 检查是否有任一IP处于通讯状态
  const someCommunicating = ipstore.ipList.some((ip) => ipstore.getIpCommunicationActive(ip))
  if (someCommunicating) {
    // 如果至少1个 IP启动通讯，则只停止正在通讯的IP
    const communicatingIps = ipstore.ipList.filter((ip) => ipstore.getIpCommunicationActive(ip))
    communicatingIps.forEach((ip) => {
      ipstore.stopCommunicationForIp(ip) // 只更新正在通讯IP的通讯状态为 false
      stopReading(ip) // 只为正在通讯的IP发送停止通讯事件
    })
  } else {
    // 如果全部IP 未启动通讯，则只对已连接的IP启动通讯
    const connectedIps = ipstore.ipList.filter((ip) => ipstore.getIpConnected(ip))
    connectedIps.forEach((ip) => {
      ipstore.startCommunicationForIp(ip) // 只更新已连接IP的通讯状态为 true
      startReading(ip) // 只为已连接的IP发送开始通讯事件
    })
  }
}

//切换通讯状态（单个）
const toggleCommunicationForIp = (client) => {
  const ip = client.ModbusServerIP
  if (!ipstore.getIpCommunicationActive(ip)) {
    ipstore.startCommunicationForIp(ip)
    startReading(ip) // 启动单个设备读取
  } else {
    ipstore.stopCommunicationForIp(ip)
    stopReading(ip) // 停止单个设备读取
  }
}
// 切换连接状态(全部)
const toggleConnection = () => {
  // 检查是否存在至少一个 IP 尚未连接
  const someConnected = ipstore.ipList.some((ip) => ipstore.getIpConnected(ip))
  if (someConnected) {
    stopReading('all')
    ipstore.stopCommunicationAll()
    /*   await new Promise((resolve) => setTimeout(resolve, 2000)) */
    // 否则，全部断开连接
    ipstore.disconnectAll() // 更新所有 IP 的连接状态为 false
    disconnectAll() // 执行断开连接的逻辑（例如发送 ipcRenderer 消息）
  } else {
    // 如果存在未连接的 IP，则全部尝试连接
    ipstore.connectAll() // 更新所有 IP 的连接状态为 true
    updateModbusClientsAll() // 更新 modbusClients 列表（如果需要）
    /*     const initial=[]
    const manual=[]
    modbusClients.value.forEach((c) => {
      const status=ipstore.getConnectionStatus(c.ModbusServerIP)
    }) */
  }
}
//切换连接状态（单个）
const toggleConnectionForIp = (client) => {
  const ip = client.ModbusServerIP

  if (!ipstore.getIpConnected(ip)) {
    ipstore.connectIp(ip)
    updateModbusClient(client)
  } else {
    stopReading(ip)
    /*   ipstore.stopCommunicationForIp(ip)
    await new Promise((resolve) => setTimeout(resolve, 2000)) */
    ipstore.disconnectIp(ip)
    disconnectModbusClient(client)
  }
}
const interfaceOptions = computed(() =>
  networkInterfaces.value.map((iface) => ({
    label: `${iface.name} – ${iface.address}`,
    value: iface.address
  }))
)
// 获取网络接口
const fetchNetworkInterfaces = async () => {
  networkInterfaces.value = await window.electron.ipcRenderer.invoke('get-network-interfaces')
}
watch(
  modbusClients,
  (newClients) => {
    // 更新 ipList 数据，不再使用 modbusStore
    ipstore.ipList = newClients.map((client) => client.ModbusServerIP)
    console.log('Updated ipList:', ipstore.ipList)
  },
  { deep: true }
)
watch(
  () => selectedInterface.value,
  (newInterface) => {
    ipstore.selectedInterface = newInterface
  },
  { immediate: true } // 初始时就触发一次
)
// 监听 address 的变化，顺便把 name 更新到另一个 ref 上
watch(selectedInterface, (addr) => {
  const iface = networkInterfaces.value.find((i) => i.address === addr)
  selectedInterfaceName.value = iface ? iface.name : ''
})
// 查询设备 IP
const queryDevices = () => {
  // 防止重复查询
  if (isQuerying.value) {
    console.log('查询正在进行中，请稍候...')
    return
  }

  isQuerying.value = true // 开始查询
  ipstore.responses = [] // 清空响应
  ipstore.ipList = []
  console.log('selectedInterface:', selectedInterface.value)

  // 添加错误处理
  try {
    window.electron.ipcRenderer.send('udp-query-ip', {
      selectedInterface: selectedInterface.value,
      selectedInterfaceName: selectedInterfaceName.value
    })

    window.electron.ipcRenderer.once('udp-query-ip-result', (event, result) => {
      isQuerying.value = false // 查询结束
      if (result.success) {
        responses.value = result.devices // 存储查询到的设备
        ipstore.updateResponses(result.devices) // 更新 Pinia 中的响应设备
        ipstore.updateModbusClients() // 更新 modbusClients 列表
        updateIpList(result.devices) // 更新 IP 列表
        isGetIpList.value = true

        // 检查是否未查询到设备
        if (result.noDevicesFound) {
          // 显示提示信息
          showNoDevicesMessage()
        }
      } else {
        console.error('Query failed:', result.error)
      }
    })

    // 添加超时处理（后端会自动重试3次，每次2秒，总共最多6秒）
    setTimeout(() => {
      if (isQuerying.value) {
        isQuerying.value = false
        if (responses.value.length === 0) {
          console.warn('UDP查询超时，可能没有设备响应')
        }
      }
    }, 6000) // 延长超时时间到8秒，给后端重试留出足够时间
  } catch (error) {
    isQuerying.value = false
    console.error('查询设备时发生错误:', error)
  }
}

// 将查询到的设备 IP 加入到 ipstore.ipList
const updateIpList = (devices) => {
  const newIpList = devices.map((device) => device.ip)
  newIpList.forEach((ip) => {
    if (!ipstore.ipList.includes(ip)) {
      ipstore.ipList.push(ip)
    }
  })
  generateIpList() // 更新 modbusClients 列表
}

// 生成 modbusClients 列表
const generateIpList = () => {
  modbusClients.value = ipstore.ipList.map((ip) => ({
    ModbusServerIP: ip,
    ModbusServerSum: 25,
    skills: []
  }))
}
// 验证 IP 地址格式
const validateIp = (ip, index) => {
  const ipRegex = /^(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])){3}$/
  if (!ipRegex.test(ip)) {
    errors.value[index] = 'IP 地址格式无效 (应为 0.0.0.0 - 255.255.255.255)'
  } else {
    errors.value[index] = ''
  }
}

// 发送更新的 modbusClients 到主进程
const updateModbusClientsAll = () => {
  // 发送更新的合法 IP 到主进程
  window.electron.ipcRenderer.send(
    'update-modbus-clients',
    JSON.parse(JSON.stringify(modbusClients.value))
  )
  /*   console.log(modbusClients.value)
  console.log('Updated ipList:', ipstore.ipList) */
}

const disconnectAll = () => {
  modbusClients.value.forEach((client) => {
    window.electron.ipcRenderer.send('disconnect', { ip: client.ModbusServerIP })
  })
  errors.value = {} // 清空错误信息
}

// 更新单个设备连接状态
const updateModbusClient = (client) => {
  try {
    window.electron.ipcRenderer.send('update-modbus-clients', [JSON.parse(JSON.stringify(client))]) // 发送单个客户端  )
  } catch (error) {
    console.error('更新Modbus客户端时发生错误:', error)
    // 可以在这里添加用户提示
  }
}

// 断开单个设备连接
const disconnectModbusClient = (client) => {
  try {
    window.electron.ipcRenderer.send('disconnect', { ip: client.ModbusServerIP })
  } catch (error) {
    console.error('断开Modbus客户端时发生错误:', error)
  }
}
const sortedModbusClients = computed(() => {
  return [...modbusClients.value].sort((a, b) => {
    const aSuffix = parseInt(a.ModbusServerIP.split('.').pop())
    const bSuffix = parseInt(b.ModbusServerIP.split('.').pop())
    return aSuffix - bSuffix
  })
})

// 显示未查询到设备的提示信息
const showNoDevicesMessage = () => {
  toast.add({
    severity: 'warn',
    summary: '查询结果',
    detail: '未查询到任何设备，请检查网络连接',
    life: 5000
  })
}
onMounted(() => {
  fetchNetworkInterfaces()

  // 监听modbusTask错误
  window.electron.ipcRenderer.on('modbus-task-error', (event, errorData) => {
    console.error('ModbusTask错误:', errorData.error)
    // 可以在这里显示用户友好的错误提示
  })
})
</script>
<style scoped>
/* 让 clients-list 里的每个 client-item 垂直排列，并且间距为 1rem */
.clients-list {
  display: flex;
  flex-direction: column; /* 先纵向填满，再换列 */
  flex-wrap: wrap; /* 超过 max-height 自动换列 */
  max-height: 350px; /* 定义"满列"的高度 */
  row-gap: 0.2rem; /* 每行（纵向）间距 */
  column-gap: 1rem; /* 每列（横向）间距，保持固定 */
  align-content: flex-start; /* 确保所有列都从顶部开始对齐 */
  align-items: flex-start; /* 确保每列内的项目都从顶部对齐 */
}
.query-status-header {
  min-height: 2.5rem; /* 与client-item保持相同的高度 */
  display: flex;
  align-items: center; /* 垂直居中对齐 */
  font-weight: bold; /* 标题加粗显示 */
  margin-bottom: 0.5rem; /* 与设备列表保持适当间距 */
}
.client-item {
  border-radius: 4px;
  margin-top: 1rem;
  min-height: 2.5rem; /* 确保每个设备项有最小高度，保持对齐 */
  display: flex;
  align-items: center; /* 垂直居中对齐 */
}
.client-row {
  display: flex;
  gap: 0.5rem; /* 输入框、按钮、状态之间水平间隔 1rem */
  align-items: center;
}
.invalid {
  border-color: red;
  font-weight: bolder;
}
.error-message {
  color: rgb(242, 183, 33);
  font-weight: bolder;
}
.info-message {
  color: red;
  font-weight: bolder;
}
.success-message {
  color: green;
  font-weight: bolder;
}
</style>
