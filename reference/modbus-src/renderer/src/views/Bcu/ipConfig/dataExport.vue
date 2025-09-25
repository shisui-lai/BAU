<template>
  <div style="display: flex; align-items: center; gap: 0.5rem">
    <MultiSelect
      id="export-dropdown"
      :key="`export-${ipStore.selectedIp}-${selectedExports.length}`"
      v-model="selectedExports"
      :options="exportOptions"
      optionLabel="label"
      optionValue="value"
      @change="onExportsChange"
      filter
      style="width: 12rem; font-size: 1rem"
      :placeholder="t('export.dataBuffer')"
    >
    </MultiSelect>
  </div>
  <ConfirmDialog />
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore'
const ipStore = useIpStore()
import { useConfirm } from 'primevue/useconfirm'
const confirm = useConfirm()
const diskWarningActive = ref(false)
function handleDiskSpaceWarning() {
  console.log('处理磁盘空间不足')
  if (diskWarningActive.value) return
  diskWarningActive.value = true

  confirm.require({
    message: '磁盘空间不足，是否停止导出？',
    header: '磁盘空间告警',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '是',
    rejectLabel: '否',
    accept: async () => {
      await disableDataExport()
      await disableBufferExport()
      await initStatus(ipStore.selectedIp)
      diskWarningActive.value = false
    },
    reject: () => {
      diskWarningActive.value = false
      // 用户选择否，不做处理
    }
  })

  // 10秒后自动停止导出，但不关闭弹窗
  setTimeout(async () => {
    if (diskWarningActive.value) {
      console.log('10秒超时，自动停止导出但保持弹窗显示')
      await disableDataExport()
      await disableBufferExport()
      await initStatus(ipStore.selectedIp)
      // 不设置 diskWarningActive.value = false，保持弹窗显示
    }
  }, 10000)
}
// 下拉选项
const exportOptions = computed(() => [
  { label: t('export.enabelData'), value: 'data' },
  { label: t('export.enabelBuffer'), value: 'buffer' }
])

// 当前选中的导出类型
const selectedExports = ref([])

// 本地状态
const isSetDataExport = ref(false)
const isSetBufferExport = ref(false)

// 定期状态同步
let statusSyncInterval = null
let connectionCheckInterval = null
const SYNC_INTERVAL = 10000 // 3秒同步一次
const CONNECTION_CHECK_INTERVAL = 1000 // 1秒检查一次连接状态

// 启动定期状态同步
function startStatusSync(ip) {
  // 清除之前的定时器
  if (statusSyncInterval) {
    clearInterval(statusSyncInterval)
    statusSyncInterval = null
  }

  // 立即同步一次
  initStatus(ip)

  // 启动定期同步
  statusSyncInterval = setInterval(async () => {
    if (ip && ip !== 'Connect First' && ipStore.getIpConnected(ip)) {
      await initStatus(ip)
    }
  }, SYNC_INTERVAL)
}

// 停止定期状态同步
function stopStatusSync() {
  if (statusSyncInterval) {
    clearInterval(statusSyncInterval)
    statusSyncInterval = null
  }
}

// 启动连接状态检查
function startConnectionCheck() {
  // 清除之前的定时器
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval)
    connectionCheckInterval = null
  }

  let lastConnectionState = false

  connectionCheckInterval = setInterval(() => {
    const currentIp = ipStore.selectedIp
    if (currentIp && currentIp !== 'Connect First') {
      const isConnected = ipStore.getIpConnected(currentIp)

      // 如果连接状态发生变化
      if (isConnected !== lastConnectionState) {
        if (isConnected) {
          // 连接成功，启动状态同步
          startStatusSync(currentIp)
        } else {
          // 连接断开，停止状态同步并重置状态
          stopStatusSync()
          isSetDataExport.value = false
          isSetBufferExport.value = false
          selectedExports.value = []
        }

        lastConnectionState = isConnected
      }
    }
  }, CONNECTION_CHECK_INTERVAL)
}

// 停止连接状态检查
function stopConnectionCheck() {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval)
    connectionCheckInterval = null
  }
}

// 拉取后端状态
async function fetchExportStatus(ip) {
  if (!ip || ip === 'Connect First') {
    return { dataExport: false, bufferExport: false }
  }

  // 检查IP是否已连接
  if (!ipStore.getIpConnected(ip)) {
    console.warn(`IP ${ip} 未连接，返回默认状态`)
    return { dataExport: false, bufferExport: false }
  }

  try {
    // 首先检查modbusTask状态
    const status = await window.electron.ipcRenderer.invoke('check-modbus-task-status')
    if (!status.alive) {
      console.warn('ModbusTask子进程不可用，返回默认状态')
      return { dataExport: false, bufferExport: false }
    }

    const { dataExport, bufferExport } = await window.electron.ipcRenderer.invoke(
      'get-export-status',
      { ip }
    )
    return { dataExport, bufferExport }
  } catch (error) {
    console.error('获取导出状态失败:', error)
    // 如果是子进程断开连接的错误，返回默认状态而不是抛出错误
    if (
      error.message.includes('子进程连接已断开') ||
      error.message.includes('IPC通道关闭') ||
      error.message.includes('子进程已退出') ||
      error.message.includes('获取导出状态超时')
    ) {
      return { dataExport: false, bufferExport: false }
    }
    // 其他错误仍然抛出
    throw error
  }
}

// 初始化：根据后端状态更新本地与下拉
async function initStatus(ip) {
  try {
    const { dataExport, bufferExport } = await fetchExportStatus(ip)
    isSetDataExport.value = dataExport
    isSetBufferExport.value = bufferExport
    const arr = []
    if (dataExport) arr.push('data')
    if (bufferExport) arr.push('buffer')

    // 强制更新 selectedExports
    selectedExports.value = []
    await nextTick()
    selectedExports.value = arr

    // 强制触发响应性更新
    await nextTick()
  } catch (error) {
    console.error(`[状态初始化] IP ${ip} 状态同步失败:`, error)
    // 同步失败时保持当前状态，不重置
  }
}

// 监听 IP 切换或首次加载
watch(
  () => ipStore.selectedIp,
  (ip) => {
    // 停止之前的同步和连接检查
    stopStatusSync()
    stopConnectionCheck()

    // 启动连接状态检查
    startConnectionCheck()

    // 如果IP有效且已连接，立即启动状态同步
    if (ip && ip !== 'Connect First' && ipStore.getIpConnected(ip)) {
      startStatusSync(ip)
    } else {
      // 如果IP无效或没有连接，设置默认状态
      isSetDataExport.value = false
      isSetBufferExport.value = false
      selectedExports.value = []
    }
  },
  { immediate: true }
)

// 打开/关闭函数
function enableDataExport() {
  window.electron.ipcRenderer.send('startExport')
  // 立即设置本地状态，定期同步会自动同步后端状态
  isSetDataExport.value = true
}
function disableDataExport() {
  window.electron.ipcRenderer.send('stopExport')
  // 立即设置本地状态，定期同步会自动同步后端状态
  isSetDataExport.value = false
}
function enableBufferExport() {
  window.electron.ipcRenderer.send('startBufferExport')
  // 立即设置本地状态，定期同步会自动同步后端状态
  isSetBufferExport.value = true
}
function disableBufferExport() {
  window.electron.ipcRenderer.send('stopBufferExport')
  // 立即设置本地状态，定期同步会自动同步后端状态
  isSetBufferExport.value = false
}

// 保存上一次选中项
let prevSelection = []

// 选项变更处理
const onExportsChange = (e) => {
  const curr = selectedExports.value
  const added = curr.filter((x) => !prevSelection.includes(x))
  const removed = prevSelection.filter((x) => !curr.includes(x))

  // 数据导出
  if (added.includes('data')) enableDataExport()
  if (removed.includes('data')) disableDataExport()
  // 报文导出
  if (added.includes('buffer')) enableBufferExport()
  if (removed.includes('buffer')) disableBufferExport()

  // 更新 prev
  prevSelection = [...curr]
}

// 同步 prevSelection 为初始状态
watch(
  selectedExports,
  (val) => {
    prevSelection = [...val]
  },
  { immediate: true }
)
onMounted(() => {
  window.electron.ipcRenderer.on('disk-space-warning', handleDiskSpaceWarning)

  // 初始化时检查当前IP状态
  const currentIp = ipStore.selectedIp

  // 启动连接状态检查
  startConnectionCheck()

  if (!currentIp || currentIp === 'Connect First' || !ipStore.getIpConnected(currentIp)) {
    // 如果当前IP无效或未连接，设置默认状态
    isSetDataExport.value = false
    isSetBufferExport.value = false
    selectedExports.value = []
  } else {
    // 如果IP有效且已连接，立即同步状态
    startStatusSync(currentIp)
  }
})
onUnmounted(() => {
  // 清理定时器
  stopStatusSync()
  stopConnectionCheck()

  // 清理事件监听器
  window.electron.ipcRenderer.removeListener('disk-space-warning', handleDiskSpaceWarning)
})
</script>

<style scoped lang="less"></style>
