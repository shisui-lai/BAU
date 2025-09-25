<template>
  <div>
    <button @click="startQuery" :disabled="loading">开始查询设备</button>
    <p v-if="loading">正在查询中...</p>
    <ul v-if="!loading && devices.length > 0">
      <li v-for="(device, index) in devices" :key="index">
        设备 IP: {{ device.ip }} 数据: {{ device.data }}
      </li>
    </ul>
    <p v-if="!loading && error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
const devices = ref([]) // 存储查询到的设备
const loading = ref(false) // 查询状态
const error = ref(null) // 错误信息

// 开始查询设备
const startQuery = () => {
  loading.value = true
  error.value = null
  devices.value = []

  // 向主进程发送 UDP 查询请求
  window.electron.ipcRenderer.send('udp-query-ip')
}

// 监听主进程发送回来的结果
const handleQueryResult = (event, result) => {
  loading.value = false

  if (result.success) {
    devices.value = result.devices
  } else {
    error.value = `查询失败: ${result.error}`
  }
}

// 在组件挂载时注册监听器
onMounted(() => {
  window.electron.ipcRenderer.on('udp-query-result', handleQueryResult)
})

// 在组件销毁时移除监听器
onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('udp-query-result', handleQueryResult)
})
</script>

<style scoped>
.error {
  color: red;
}
</style>
