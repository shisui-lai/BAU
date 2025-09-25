<template>
  <div>
    <Dialog
      v-model:visible="displayDialog"
      header="地址自适应"
      :closable="false"
      :style="{ width: '50%' }"
    >
      <h5>查询并连接设备</h5>
      <!-- 查询设备 IP -->
      <div>
        <label for="selectedInterface">选择PC网卡:</label>
        <select v-model="selectedInterface">
          <option disabled value="">请选择PC网卡</option>
          <option v-for="iface in networkInterfaces" :key="iface.address" :value="iface.address">
            {{ iface.name }} - {{ iface.address }}
          </option>
        </select>

        <button @click="queryDevices" :disabled="!selectedInterface">查询设备</button>
      </div>

      <div v-if="responses.length">
        <ul>
          <li v-for="(response, index) in responses" :key="index">
            <b>IP:</b> {{ response.ip }}, <b>Port</b> {{ response.port }}, <b>Data</b>:
            {{ response.data }}
            <!--           <button @click="connectDevice(response.ip)" :disabled="!response.ip">连接</button>
 -->
          </li>
        </ul>
      </div>
      <hr />
      <!-- 设备连接 -->
      <div v-if="modbusClients.length > 0">
        <h5>设备连接</h5>
        <div v-for="(client, index) in modbusClients" :key="index" class="ipset1">
          <div style="display: flex; margin-top: 0.2rem; gap: 1rem">
            <InputText
              v-model="client.ModbusServerIP"
              @input="validateIp(client.ModbusServerIP, index)"
              :readonly="true"
              placeholder="Enter Modbus IP"
              style="
                width: 120px;
                height: 20px;
                border-color: black;
                background-color: #fff3;
                color: black;
                border-radius: 0.2rem;
              "
            />
            <ButtonGroup>
              <Button
                label="连接"
                @click="updateModbusClient(client)"
                severity="secondary"
                style="width: 55px; height: 20px; font-size: 13px"
                :disabled="
                  !client.ModbusServerIP ||
                  ipstore.getConnectionStatus(client.ModbusServerIP) === 'success' ||
                  isConnecting
                "
              />
              <Button
                label="断开连接"
                @click="disconnectModbusClient(client)"
                severity="secondary"
                :disabled="
                  ipstore.getConnectionStatus(client.ModbusServerIP) !== 'success' ||
                  isDisconnecting
                "
                style="width: 85px; height: 20px; font-size: 12px"
              />
            </ButtonGroup>
          </div>
          <div style="margin-left: 1rem" v-if="ipstore.getConnectionStatus(client.ModbusServerIP)">
            <span v-if="errors[index]" class="error-message">{{ errors[index] }}</span>
            <!-- 显示连接状态 -->
            <span
              v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'success'"
              class="success-message"
              >连接成功</span
            >
            <span
              v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'failed'"
              class="error-message"
              >连接失败</span
            >
            <span
              v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'disconnected'"
              class="error-message"
              >已断开连接</span
            >
            <span
              v-if="ipstore.getConnectionStatus(client.ModbusServerIP) === 'connecting'"
              class="info-message"
              >正在连接...</span
            >
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore'
const displayDialog = ref(false) // 控制弹窗的显示
const ipstore = useIpStore() // 获取 Pinia store
const networkInterfaces = ref([]) // 网络接口
const selectedInterface = ref(ipstore.selectedInterface) // 选择的接口
const responses = ref(ipstore.responses) // 查询到的设备
const modbusClients = ref(
  ipstore.ipList.map((ip) => ({ ModbusServerIP: ip, ModbusServerSum: 25, skills: [] })) // 确保 modbusClients 是对象数组
)
const isConnecting = ref(false) // 连接中状态
const isDisconnecting = ref(false) // 断开连接状态
const errors = ref([]) // 用于存储每个IP输入框的错误信息
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
// 查询设备 IP
const queryDevices = () => {
  ipstore.responses = [] // 清空响应
  ipstore.ipList = []
  window.electron.ipcRenderer.send('udp-query-ip', { selectedInterface: selectedInterface.value })

  window.electron.ipcRenderer.once('udp-query-ip-result', (event, result) => {
    if (result.success) {
      responses.value = result.devices // 存储查询到的设备
      ipstore.updateResponses(result.devices) // 更新 Pinia 中的响应设备
      ipstore.updateModbusClients() // 更新 modbusClients 列表
      updateIpList(result.devices) // 更新 IP 列表
    } else {
      console.error('Query failed:', result.error)
    }
  })
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

// 更新单个设备连接状态
const updateModbusClient = (client) => {
  window.electron.ipcRenderer.send('update-modbus-clients', [JSON.parse(JSON.stringify(client))]) // 发送单个客户端  )
}

// 断开单个设备连接
const disconnectModbusClient = (client) => {
  window.electron.ipcRenderer.send('disconnect', { ip: client.ModbusServerIP })
}
onMounted(() => {
  displayDialog.value = true // 打开弹窗
  fetchNetworkInterfaces()
  window.electron.ipcRenderer.on('connection-status', (event, { ip, success, error }) => {
    console.log('connection-status', ip, success, error)
    /*     console.log(currentDevice) */
    if (success === 'disconnected') {
      ipstore.setConnectionStatus(ip, 'disconnected')
      /*   ipstore.clearCurrentDevice() //设备断开时清除当前设备 */
      errors.value[ip] = '' // 断开连接时清除错误信息
    } else if (success) {
      ipstore.setConnectionStatus(ip, 'success')
      ipstore.setCurrentDevice(ip) // 设备连接时设置当前设备
      ipstore.addIp(ip) // 设备连接时添加到 ipstore
    } else {
      ipstore.setConnectionStatus(ip, 'failed')
      errors.value[ip] = error || '连接失败'
    }
  })
})
</script>
<style scoped>
.invalid {
  border-color: red;
}
.error-message {
  color: rgb(242, 183, 33);
  margin-top: 4px;
}
.info-message {
  color: blue;
}
.success-message {
  color: chartreuse;
}
</style>
