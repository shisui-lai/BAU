<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore'
/* import { useModbusStore } from '../../../../../stores/modbusStore' */
// 定义 modbusClients 数组作为响应式数据
const ipstore = useIpStore()
const modbusClients = ref(
  ipstore.ipList.map((ip) => ({ ModbusServerIP: ip, ModbusServerSum: 25, skills: [] })) // 确保 modbusClients 是对象数组
)
const statuses = reactive({}) // 用于存储每个IP的连接状态
const errors = ref([]) // 用于存储每个IP输入框的错误信息
const isConnecting = ref(false) //连接中状态
const isDisconnecting = ref(false) //断开中状态
const currentDevice = ipstore.currentDevice //读取当前设备
// 用于存储输入的 IP 地址和数量
const ipPrefix = ref('192.168.10.208') // IP 地址的首地址
const ipCount = ref(1) // 地址数量
const isGetIpList = ref(false)
watch(
  modbusClients,
  (newClients) => {
    // 更新 ipList 数据，不再使用 modbusStore
    ipstore.ipList = newClients.map((client) => client.ModbusServerIP)
    console.log('Updated ipList:', ipstore.ipList)
  },
  { deep: true }
)
// 验证 IP 地址的格式和范围
const validateIp = (ip, index) => {
  const ipRegex = /^(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])){3}$/
  if (!ipRegex.test(ip)) {
    errors.value[index] = 'IP 地址格式无效 (应为 0.0.0.0 - 255.255.255.255)'
  } else {
    errors.value[index] = ''
  }
}
// 检查是否存在错误
const hasErrors = computed(() => {
  return errors.value.some((error) => error !== '')
})
// 根据输入的 IP 地址首地址和数量生成 IP 列表
// 根据输入的 IP 地址首地址和数量生成 IP 列表
const generateIpList = () => {
  const ipList = []
  const prefix = ipPrefix.value
  const count = parseInt(ipCount.value)

  // 提取IP的最后一段数字
  const ipParts = prefix.split('.') // 将IP地址拆分成数组
  const lastOctet = parseInt(ipParts.pop()) // 获取最后一段数字并删除

  if (count > 0 && count <= 255) {
    for (let i = 0; i < count; i++) {
      const newIp = `${ipParts.join('.')}.${lastOctet + i}` // 拼接递增后的IP地址
      // 检查该 IP 地址是否已经在 modbusClients 中
      const ipExists = modbusClients.value.some((client) => client.ModbusServerIP === newIp)

      if (!ipExists) {
        ipList.push({ ModbusServerIP: newIp, ModbusServerSum: 25, skills: [] })
      }
    }
    isGetIpList.value = true
  } else {
    errors.value[0] = '地址数量应在1到255之间'
  }

  modbusClients.value = [...modbusClients.value, ...ipList]
  // 更新 ipstore 中的 ipList
  modbusClients.value.forEach((client) => {
    if (client.ModbusServerIP) {
      ipstore.addIp(client.ModbusServerIP) // 只有合法 IP 被添加到 ipstore
      ipstore.changeIp(client.ModbusServerIP) // 更改当前选中的 IP
    }
  })
}
// 连接所有ip
const updateModbusClientsAll = () => {
  const modbusClientsData = modbusClients.value.filter((client) => {
    // 验证 IP 地址格式
    const ipRegex =
      /^(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])){3}$/
    return ipRegex.test(client.ModbusServerIP) // 只有有效的 IP 才会通过过滤
  })

  // 发送更新的合法 IP 到主进程
  window.electron.ipcRenderer.send(
    'update-modbus-clients',
    JSON.parse(JSON.stringify(modbusClientsData))
  )

  // 更新全局状态
  modbusClients.value.forEach((client) => {
    if (client.ModbusServerIP) {
      ipstore.addIp(client.ModbusServerIP) // 只有合法 IP 被添加到 ipstore
      ipstore.changeIp(client.ModbusServerIP)
    }
  })

  console.log(modbusClients.value)
  console.log('Updated ipList:', ipstore.ipList)
}
//断开所有通讯
const disconnectAll = () => {
  modbusClients.value.forEach((client) => {
    if (client.ModbusServerIP) {
      window.electron.ipcRenderer.send('disconnect', { ip: client.ModbusServerIP })
      statuses[client.ModbusServerIP] = 'disconnected' // 显式更新状态
      errors.value[client.ModbusServerIP] = '' // 清空错误信息
    }
  })
  Object.keys(statuses).forEach((ip) => {
    statuses[ip] = 'failed '
    errors.value[ip] = '连接失败'
  })
  console.log('所有连接已断开')
}

// 连接单个 IP
const updateModbusClient = (client) => {
  // 验证 IP 地址格式
  const ipRegex = /^(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])){3}$/
  if (ipRegex.test(client.ModbusServerIP)) {
    // 设置连接状态为 "connecting"
    /*   ipstore.setConnectionStatus(client.ModbusServerIP, 'connecting') */
    // 发送当前客户端的 IP 到主进程
    window.electron.ipcRenderer.send(
      'update-modbus-clients',
      [JSON.parse(JSON.stringify(client))] // 发送单个客户端
    )

    // 更新 ipstore
    ipstore.addIp(client.ModbusServerIP)
    ipstore.changeIp(client.ModbusServerIP)
  } else {
    errors.value[client.ModbusServerIP] = 'IP 地址格式无效'
  }
}

// 断开单个通讯
const disconnectModbusClient = (client) => {
  if (client.ModbusServerIP) {
    window.electron.ipcRenderer.send('disconnect', { ip: client.ModbusServerIP })
    // 设置连接状态为 "disconnected"
    ipstore.setConnectionStatus(client.ModbusServerIP, 'disconnected')
    errors.value[client.ModbusServerIP] = '' // 清空错误信息
  }
}

onMounted(() => {
  window.electron.ipcRenderer.on('connection-status', (event, { ip, success, error }) => {
    console.log('connection-status', ip, success, error)
    console.log(currentDevice)
    if (success === 'disconnected') {
      ipstore.setConnectionStatus(ip, 'disconnected')
      ipstore.clearCurrentDevice() //设备断开时清除当前设备
      errors.value[ip] = '断开连接' // 断开连接时清除错误信息
    } else if (success) {
      ipstore.setConnectionStatus(ip, 'success')
      ipstore.setCurrentDevice(ip) // 设备连接时设置当前设备
      ipstore.addIp(ip) // 设备连接时添加到 ipstore
    } else {
      ipstore.setConnectionStatus(ip, 'failed')
      errors.value[ip] = error || '连接失败'
    }
  })
  console.log('Updated ipList:', ipstore.ipList)
})
</script>
<template>
  <div class="client-ip-entry">
    <h5>设备连接</h5>
    <!-- 输入IP前缀和数量 -->
    <div>
      <label for="ipPrefix">IP首地址:</label>
      <InputText
        id="ipPrefix"
        v-model="ipPrefix"
        placeholder="输入IP地址"
        style="width: 120px; margin-bottom: 10px; margin-left: 1rem; margin-right: 1rem"
      />
      <label for="ipCount">地址数量:</label>
      <InputText
        id="ipCount"
        v-model="ipCount"
        placeholder="输入数量，如：5"
        style="margin-left: 1rem; width: 5rem"
      />
      <Button
        label="生成IP列表"
        @click="generateIpList"
        severity="secondary"
        style="color: red; margin-left: 0.5rem; margin-bottom: 0.8rem"
      />
      <div style="margin-bottom: 1rem">
        <ButtonGroup>
          <Button
            label="全部连接"
            @click="updateModbusClientsAll"
            :disabled="!isGetIpList"
            severity="secondary"
          />
          <Button
            label="全部断开"
            @click="disconnectAll"
            :disabled="!isGetIpList"
            severity="secondary"
          />
        </ButtonGroup>
        <!--         <span style="margin-bottom: 2rem">需先生成Ip列表</span>
 -->
      </div>
    </div>

    <div v-for="(client, index) in modbusClients" :key="index" class="ipset1">
      <div style="display: flex; margin-top: 0.2rem; gap: 1rem">
        <div style="margin-left: -5rem">
          <InputText
            v-model="client.ModbusServerIP"
            @input="validateIp(client.ModbusServerIP, index)"
            :readonly="true"
            placeholder="Enter Modbus IP"
            :class="{ invalid: errors[index] }"
            style="
              width: 120px;
              height: 20px;
              border-color: black;
              background-color: #fff3;
              color: black;
              border-radius: 0.2rem;
              margin-left: 5.3rem;
            "
          />
        </div>
        <div style="margin-left: 0.3rem">
          <ButtonGroup>
            <Button
              label="连接"
              @click="updateModbusClient(client)"
              severity="secondary"
              style="
                width: 55px;
                height: 20px;
                font-size: 13px;
                background-color: #fff3;
                color: black;
                border-radius: 0.2rem;
                border: black solid 1px;
              "
              :disabled="
                ipstore.getConnectionStatus(client.ModbusServerIP) === 'success' ||
                isConnecting ||
                hasErrors
              "
            />
            <Button
              label="断开连接"
              @click="disconnectModbusClient(client)"
              severity="secondary"
              :disabled="
                ipstore.getConnectionStatus(client.ModbusServerIP) !== 'success' || isDisconnecting
              "
              style="
                width: 85px;
                height: 20px;
                font-size: 12px;
                background-color: #fff3;
                border: black solid 1px;
                color: black;
                border-radius: 0.2rem;
                left: 0.3rem;
              "
            />
          </ButtonGroup>
        </div>
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
</template>
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
.ipset1 {
  display: flex;
  flex-direction: column;
  position: relative;
}
.inputIp {
  margin-left: 1rem;
}
.status-container {
  position: absolute; /* 使连接状态容器固定 */
  bottom: -1.7rem; /*距离底部一定距离，可以调整 */
  left: 0.3rem; /* 可以调整这个值来改变位置 */
  width: calc(100% - 0.6rem); /* 确保状态消息容器宽度适配父容器 */
}
</style>
