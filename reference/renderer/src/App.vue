<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
import { useToast } from 'primevue/usetoast'
const toast = useToast()
import { useIpStore } from '../../stores/ipStore.js'
import { useIVCaliStore } from '../../stores/ivCaliStore.js'
import { useBalanceStore } from '../../stores/balanceStore.js'
import { useVtSetStore } from '../../stores/vtSetStore.js'
import { useExportStore } from '../../stores/eventStore.js'
import About from './views/help/about.vue'
const ipStore = useIpStore()
const ivCaliStore = useIVCaliStore()
const balanceStore = useBalanceStore()
const vtSetStore = useVtSetStore()
const exportStore = useExportStore()

// 监听均衡状态变化
import { watch } from 'vue'
watch(
  () => vtSetStore.isStopped,
  (newVal) => {
    if (newVal) {
      toast.add({
        severity: 'success',
        summary: t('balanceControl.setBalanceStopSuccess'),
        life: 20000
      })
      vtSetStore.isStopped = false // 重置状态
    }
  }
)

// 监听均衡状态消息
watch(
  () => vtSetStore.balanceStatusMessage,
  (newMessage) => {
    if (newMessage) {
      const isError = newMessage.includes('失败')
      toast.add({
        severity: isError ? 'error' : 'success',
        summary: newMessage,
        life: 20000
      })
      // 显示后清空消息，避免重复显示
      vtSetStore.balanceStatusMessage = ''
    }
  }
)
const showExcelDialog = ref(false)
let excelDialogResolve = null
const showAboutDialog = ref(false)
function handleConnectionStatus(
  event,
  { ip, success, error, errorType, retryCount, networkRestartCount }
) {
  if (success) {
    ipStore.setConnectionStatus(ip, 'success')
    ipStore.addIp(ip) // 设备连接时添加到 ipStore
    ipStore.connectIp(ip)
    /* ipStore.manuallySelectIp(ip) */
  } else if (!success && error === 'device_offline') {
    toast.add({
      severity: 'info',
      summary: `${ip}已离线，停止重连`,
      life: 20000
    })
    ipStore.setConnectionStatus(ip, 'device_offline')
  } else if (!success && error === 'reConnected') {
    ipStore.setConnectionStatus(ip, 'success')
    ipStore.addIp(ip) // 设备连接时添加到 ipStore
    ipStore.connectIp(ip)
    ipStore.setConnectionStatus(ip, 'startAllCommunication')
    ipStore.startCommunicationForIp(ip)
    /* ipStore.manuallySelectIp(ip) */
  } else if (!success && error === 'interrupted') {
    ipStore.setConnectionStatus(ip, 'interrupted')
    ipStore.stopCommunicationForIp(ip)
    ipStore.disconnectIp(ip)
    // 注意：不在这里显示Toast，因为配置错误时已经有专门的Toast通知了
  } else if (!success && error === 'disconnected') {
    ipStore.setConnectionStatus(ip, 'disconnected')
    ipStore.disconnectIp(ip)
  } else if (!success && error === 'startAllCommunication') {
    ipStore.setConnectionStatus(ip, 'startAllCommunication')
    ipStore.startCommunicationForIp(ip)
  } else if (!success && error === 'stopAllCommunication') {
    ipStore.setConnectionStatus(ip, 'stopAllCommunication')
    ipStore.stopCommunicationForIp(ip)
  } else if (!success && error === 'reconnectting') {
    ipStore.setConnectionStatus(ip, 'reconnectting')
    ipStore.setRetryCount(ip, retryCount)
  } else if (!success && error === 'failed') {
    ipStore.setConnectionStatus(ip, 'failed')
  } else if (!success && error && error.includes('网卡重启') && error.includes('次后仍无法连接')) {
    // 网卡重启3次后仍无法连接
    ipStore.setConnectionStatus(ip, 'terminated')
    toast.add({
      severity: 'warn',
      summary: '重连已终止',
      detail: `${ip}: ${error}`,
      life: 30000
    })
  } else if (!success && error && error.includes('重连') && error.includes('次后仍无法连接')) {
    // 重连20次后仍无法连接
    ipStore.setConnectionStatus(ip, 'terminated')
    toast.add({
      severity: 'warn',
      summary: '重连已终止',
      detail: `${ip}: ${error}`,
      life: 30000
    })
  } else if (!success && error === '自适应成功，停止重连') {
    // 自适应成功后停止旧IP重连
    ipStore.setConnectionStatus(ip, 'terminated')
    toast.add({
      severity: 'info',
      summary: 'IP地址变更',
      detail: `${ip}: 自适应成功，已停止重连旧IP`,
      life: 30000
    })
  } else if (!success && errorType === 'max_network_restarts_exceeded') {
    // 基于errorType的精确处理：网卡重启次数超限
    ipStore.setConnectionStatus(ip, 'terminated')
    toast.add({
      severity: 'warn',
      summary: '重连已终止',
      detail: `${ip}: 网卡重启${networkRestartCount || 3}次后仍无法连接，已停止重连`,
      life: 30000
    })
  } else if (!success && errorType === 'max_retries_exceeded') {
    // 基于errorType的精确处理：重连次数超限
    ipStore.setConnectionStatus(ip, 'terminated')
    toast.add({
      severity: 'warn',
      summary: '重连已终止',
      detail: `${ip}: 重连${retryCount || 20}次后仍无法连接，已停止重连`,
      life: 30000
    })
  } else if (!success && errorType === 'adaptive_success_terminated') {
    // 基于errorType的精确处理：自适应成功终止
    ipStore.setConnectionStatus(ip, 'terminated')
    toast.add({
      severity: 'info',
      summary: 'IP地址变更',
      detail: `${ip}: 自适应成功，已停止重连旧IP地址`,
      life: 30000
    })
  }
}
function handleNetworkRestart(event, { interfaceName, status, error, ip, restartCount }) {
  if (ip && typeof restartCount === 'number') {
    ipStore.setRecentRestartCount(ip, restartCount)
  }
  if (status === 'restarting') {
    toast.add({
      severity: 'info',
      summary: t('network.restart.restarting', { interfaceName }),
      life: 20000
    })
  } else if (status === 'success') {
    toast.add({
      severity: 'success',
      summary: t('network.restart.success', { interfaceName }),
      life: 20000
    })
  } else if (status === 'failed') {
    toast.add({
      severity: 'error',
      summary: t('network.restart.failed', { interfaceName, error }),
      life: 20000
    })
  }
}
function handleConfigForBMU(event, Arg) {
  if (!Arg?.Arg) return
  const deviceIp = Arg.ip
  const eventData = Arg.Arg

  // 处理配置数据
  const newData = eventData.configData
  if (newData[0]?.config) {
    ipStore.setBMUConfig(deviceIp, newData[0].config)
  }
  if (newData[1]?.element) {
    ivCaliStore.setKBData(
      deviceIp,
      newData[1].element.map((item) => item.value)
    )
  }

  // 处理IV校准实时数据
  if (eventData.ivRealTimeData) {
    ivCaliStore.setIVData(
      deviceIp,
      eventData.ivRealTimeData.current,
      eventData.ivRealTimeData.clusterVltg,
      eventData.ivRealTimeData.prechargeVltg
    )
  }
}

function handleBalanceData(event, Arg) {
  if (!Arg?.Arg) return
  const deviceIp = Arg.ip
  const mode = vtSetStore.balance.balanceMode === '0x0001' ? 'discharge' : 'charge'
  balanceStore.updateBalanceData(deviceIp, Arg.Arg, mode)
}

function handleExportProgress(event, { current, total }) {
  if (!exportStore.isExporting) exportStore.start(total)
  exportStore.update(current)
}
const handleSetLocale = (_event, lang) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}
const handleSaveDecision = async () => {
  showExcelDialog.value = true
  // 返回 Promise，主进程等待
  return new Promise((resolve) => {
    excelDialogResolve = resolve
  })
}
const onExcelDialogRetry = () => {
  showExcelDialog.value = false
  window.electron.ipcRenderer.send('save-excel-decision', 'retry')
  if (excelDialogResolve) excelDialogResolve('retry')
}
const onExcelDialogCancel = () => {
  showExcelDialog.value = false
  window.electron.ipcRenderer.send('save-excel-decision', 'cancel')
  if (excelDialogResolve) excelDialogResolve('cancel')
}
const handleShowAboutDialog = () => {
  showAboutDialog.value = true
}

// 处理BMU配置恢复
/* function handleConfigRecovered(event, { deviceIp, recoveryMessages, details }) {
  console.log(`设备 ${deviceIp} 配置已恢复正常:`, recoveryMessages)
  console.log('恢复详情:', details)

  // 使用PrimeVue的toast显示恢复通知
  toast.add({
    severity: 'success',
    summary: 'BMU配置已恢复正常',
    detail: `设备 ${deviceIp}: ${recoveryMessages}`,
    life: 8000 // 显示8秒
  })
} */

// 处理BMU配置修正
function handleConfigCorrected(event, { deviceIp, warnings, details }) {
  console.warn(`设备 ${deviceIp} 配置已修正:`, warnings)
  console.warn('修正详情:', details)

  // 使用PrimeVue的toast显示修正通知
  toast.add({
    severity: 'warn',
    summary: 'BMU配置已修正',
    detail: `设备 ${deviceIp}: ${warnings}`,
    life: 10000 // 显示10秒
  })
}

// 处理BMU配置错误
function handleConfigError(event, { deviceIp, error, details }) {
  console.error(`设备 ${deviceIp} 配置错误:`, error)
  console.error('配置详情:', details)

  // 使用PrimeVue的toast显示错误通知
  toast.add({
    severity: 'error',
    summary: 'BMU配置错误',
    detail: `设备 ${deviceIp}: ${error}`,
    life: 30000 // 显示15秒
  })
}
onMounted(() => {
  // 2. 用同样的引用去注册
  window.electron.ipcRenderer.on('connection-status', handleConnectionStatus)
  window.electron.ipcRenderer.on('update-FC04ConfigForBMU', handleConfigForBMU)
  window.electron.ipcRenderer.on('update-FC04BalanceDataForCell', handleBalanceData)
  window.electron.ipcRenderer.on('update-readEventProgress', handleExportProgress)
  /* window.electron.ipcRenderer.on('Network-Restart', handleNetworkRestart) */
  window.electron.ipcRenderer.on('set-locale', handleSetLocale)
  window.electron.ipcRenderer.on('show-save-excel-dialog', handleSaveDecision)
  window.electron.ipcRenderer.on('show-about-dialog', handleShowAboutDialog)
  window.electron.ipcRenderer.on('config-error', handleConfigError)
  window.electron.ipcRenderer.on('config-corrected', handleConfigCorrected)
  //window.electron.ipcRenderer.on('config-recovered', handleConfigRecovered)

  // 预加载网络接口，减少首次弹窗时的等待时间
  window.electron.ipcRenderer.invoke('get-network-interfaces').catch((error) => {
    console.warn('预加载网络接口失败:', error)
  })
})

onBeforeUnmount(() => {
  // 3. 卸载时，成对地移除
  window.electron.ipcRenderer.removeListener('connection-status', handleConnectionStatus)
  window.electron.ipcRenderer.removeListener('update-FC04ConfigForBMU', handleConfigForBMU)
  window.electron.ipcRenderer.removeListener('update-FC04BalanceDataForCell', handleBalanceData)
  window.electron.ipcRenderer.removeListener('update-readEventProgress', handleExportProgress)
  /* window.electron.ipcRenderer.removeListener('Network-Restart', handleNetworkRestart) */
  window.electron.ipcRenderer.removeListener('set-locale', handleSetLocale)
  window.electron.ipcRenderer.removeListener('show-save-excel-dialog', handleSaveDecision)
  window.electron.ipcRenderer.removeListener('show-about-dialog', handleShowAboutDialog)
  window.electron.ipcRenderer.removeListener('config-error', handleConfigError)
  window.electron.ipcRenderer.removeListener('config-corrected', handleConfigCorrected)
  //window.electron.ipcRenderer.removeListener('config-recovered', handleConfigRecovered)
})
</script>

<template>
  <router-view />
  <Dialog v-model:visible="showExcelDialog" header="文件被占用" :modal="true" :closable="false">
    <span>导出文件正在被打开，请关闭后重试。</span>
    <template #footer>
      <Button label="重试" @click="onExcelDialogRetry" />
      <Button label="取消" @click="onExcelDialogCancel" class="p-button-secondary" />
    </template>
  </Dialog>
  <Dialog
    v-model:visible="showAboutDialog"
    :header="t('about.about')"
    :modal="true"
    :closable="true"
    :style="{ width: '600px' }"
  >
    <About />
  </Dialog>
</template>

<style scoped></style>
