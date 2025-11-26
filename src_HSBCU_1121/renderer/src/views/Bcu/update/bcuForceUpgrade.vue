<template>
  <div class="card force-upgrade">
    <div class="control">
      <!-- 左侧：TFTP 服务器配置部分 -->
      <div class="section1">
        <div class="section-header">
          <h5 class="section-title">{{ t('forceUpgrade.tftpServerConfig') }}</h5>
          <Button
            class="p-button-sm"
            @click="toggleTftp"
            :label="tftpRunning ? t('forceUpgrade.stopTftp') : t('forceUpgrade.startTftp')"
            :severity="tftpRunning ? 'danger' : 'success'"
            :icon="tftpRunning ? 'pi pi-stop' : 'pi pi-play'"
            iconPos="left"
            :disabled="isUpgrading"
          />
        </div>

        <div class="input-row">
          <label for="tftpIp">{{ t('forceUpgrade.tftpIp') }}：</label>
          <InputText v-model="tftpIp" id="tftpIp" class="flex-1" :disabled="tftpRunning || isUpgrading" />
        </div>

        <div class="input-row">
          <label for="tftpPort">{{ t('forceUpgrade.tftpPort') }}：</label>
          <InputText v-model="tftpPort" id="tftpPort" class="flex-1" :disabled="tftpRunning" />
        </div>

        <div class="input-row">
          <label for="upgradeFile">{{ t('forceUpgrade.upgradeFile') }}：</label>
          <InputText
            v-model="upgradeFileName"
            id="upgradeFile"
            readonly
            :placeholder="t('forceUpgrade.upgradeFilePlaceholder')"
            class="flex-1"
          />
          <Button
            icon="pi pi-folder-open"
            class="p-button-sm p-button-outlined"
            @click="selectUpgradeFile"
            :disabled="tftpRunning || isUpgrading"
            v-tooltip.top="t('forceUpgrade.selectFile')"
          />
        </div>

       <!--  <div class="input-row" v-if="upgradeFileDir">
          <label>{{ t('forceUpgrade.tftpRoot') }}：</label>
          <span class="file-path">{{ upgradeFileDir }}</span>
        </div> -->
        <div class="action-bar">
          <Button
            :label="isUpgrading ? t('forceUpgrade.stopUpgrade') : t('forceUpgrade.startUpgrade')"
            @click="toggleForceUpgrade"
            :severity="isUpgrading ? 'danger' : 'success'"
            :icon="isUpgrading ? 'pi pi-stop' : 'pi pi-send'"
            :disabled="!canStartUpgrade"
            class="p-button-sm"
          />
        </div>
        <!-- 操作说明提示框 -->
        <div class="guide-box">
          <div class="guide-title">
            <i class="pi pi-info-circle"></i>
            <span>{{ t('forceUpgrade.operationGuide.title') }}</span>
          </div>
          <div class="guide-steps">
            <div class="guide-step">1. {{ t('forceUpgrade.operationGuide.step2') }}</div>
            <div class="guide-step">2. {{ t('forceUpgrade.operationGuide.step1') }}</div>
            <div class="guide-step">3. {{ t('forceUpgrade.operationGuide.step3') }}</div>
            <div class="guide-step">4. {{ t('forceUpgrade.operationGuide.step4') }}</div>
            <div class="guide-step">5. {{ t('forceUpgrade.operationGuide.step41') }}</div>
            <div class="guide-step">6. {{ t('forceUpgrade.operationGuide.step5') }}</div>  
            <div class="guide-step">7. {{ t('forceUpgrade.operationGuide.step6') }}</div>
          </div>
        </div>

        <!-- 发送指令计数 - 仅在发送中显示 -->
        <div v-if="isUpgrading" class="sending-status">
          <ProgressBar mode="indeterminate" style="height: 0.5rem" />
          <div class="sending-info">
            <span>{{ t('forceUpgrade.sendingInfo') }}</span>
            <span class="command-count">{{ t('forceUpgrade.commandCount', { count: commandCount }) }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：日志面板 -->
      <div class="section">
        <div class="section-header">
          <h5 class="section-title">{{ t('forceUpgrade.log.title') }}</h5>
          <Button
            :label="t('forceUpgrade.log.clear')"
            icon="pi pi-trash"
            class="p-button-sm p-button-text"
            @click="clearLogs"
          />
        </div>
        <div class="log-panel">
          <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="`log-${log.type}`">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="logs.length === 0" class="no-logs">
            <i class="pi pi-inbox"></i>
            <span>{{ t('forceUpgrade.log.noLogs') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeMount, onBeforeUnmount } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const ipstore = useIpStore()
const toast = useToast()

// TFTP 服务器相关
const tftpRunning = ref(false)
const tftpIp = ref('192.168.10.200')
const tftpPort = ref('69')
const upgradeFileName = ref('')
const upgradeFileDir = ref('')

// 强制升级相关
const isUpgrading = ref(false)
const commandCount = ref(0)
const logs = ref([])

// IPC 监听器 ID
let forceUpgradeSuccessListener = null
let forceUpgradeFailedListener = null
let forceUpgradeErrorListener = null
let forceUpgradeSendingListener = null
let forceUpgradeProgressListener = null

// 是否可以开始升级
const canStartUpgrade = computed(() => {
  return tftpRunning.value && upgradeFileName.value && tftpIp.value
})

// 添加日志
function addLog(message, type = 'info') {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  logs.value.unshift({
    time,
    message,
    type
  })
  
  // 限制日志数量
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

// 清空日志
function clearLogs() {
  logs.value = []
  addLog(t('forceUpgrade.log.cleared'), 'info')
}

// 选择升级文件
async function selectUpgradeFile() {
  try {
    const result = await window.electron.ipcRenderer.invoke('select-tftp-upgrade-file')
    
    if (!result.canceled) {
      if (result.error) {
        // 文件名不符合要求
        addLog(t('forceUpgrade.log.fileSelectFailed', { message: result.message }), 'error')
        toast.add({
          severity: 'error',
          summary: t('forceUpgrade.toast.fileNameError'),
          detail: result.message,
          life: 5000
        })
        upgradeFileName.value = ''
        upgradeFileDir.value = ''
      } else if (result.success) {
        // 文件选择成功
        upgradeFileName.value = result.fileName
        upgradeFileDir.value = result.fileDir
        
        addLog(t('forceUpgrade.log.fileSelected', { fileName: result.fileName }), 'success')
        addLog(t('forceUpgrade.log.rootSet', { dir: result.fileDir }), 'info')
        toast.add({
          severity: 'success',
          summary: t('forceUpgrade.toast.fileSelectSuccess'),
          detail: t('forceUpgrade.toast.fileSelectedDetail', { fileName: result.fileName }),
          life: 5000
        })
      }
    }
  } catch (err) {
    console.error('选择文件失败:', err)
    addLog(t('forceUpgrade.log.fileSelectFailed', { message: err.message }), 'error')
    toast.add({
      severity: 'error',
      summary: t('forceUpgrade.toast.fileSelectFailed'),
      detail: err.message,
      life: 5000
    })
  }
}

// 切换 TFTP 服务器
async function toggleTftp() {
  console.log(tftpRunning.value)
  if (tftpRunning.value) {
    // 停止 TFTP
    const res = await window.electron.ipcRenderer.invoke('tftp-stop')
    if (res.success) {
      tftpRunning.value = false
      addLog(t('forceUpgrade.log.tftpStopped'), 'info')
      toast.add({
        severity: 'success',
        summary: t('forceUpgrade.toast.tftpStopped'),
        life: 5000
      })
    } else {
      addLog(t('forceUpgrade.log.tftpStopFailed', { message: res.message }), 'error')
      toast.add({
        severity: 'error',
        summary: t('forceUpgrade.toast.tftpStopFailed'),
        detail: res.message,
        life: 5000
      })
    }
  } else {
    // 验证网卡IP
    if (tftpIp.value !== '192.168.10.200') {
      toast.add({
        severity: 'error',
        summary: t('forceUpgrade.toast.tftpIpError'),
        detail: t('forceUpgrade.toast.tftpIpRequired'),
        life: 5000
      })
      addLog(t('forceUpgrade.log.tftpStartFailed', { message: t('forceUpgrade.toast.tftpIpRequired') }), 'error')
      return
    }

    // 启动 TFTP
    const res = await window.electron.ipcRenderer.invoke('tftp-start', {
      host: tftpIp.value,
      port: parseInt(tftpPort.value)
    })
    
    if (res.success) {
      tftpRunning.value = true
      addLog(t('forceUpgrade.log.tftpStarted', { host: tftpIp.value, port: tftpPort.value }), 'success')
      toast.add({
        severity: 'success',
        summary: t('forceUpgrade.toast.tftpStarted'),
        detail: res.message,
        life: 5000
      })
    } else {
      addLog(t('forceUpgrade.log.tftpStartFailed', { message: res.message }), 'error')
      toast.add({
        severity: 'error',
        summary: t('forceUpgrade.toast.tftpStartFailed'),
        detail: res.message,
        life: 5000
      })
    }
  }
}

// 切换强制升级
function toggleForceUpgrade() {
  if (isUpgrading.value) {
    stopForceUpgrade()
  } else {
    startForceUpgrade()
  }
}

// 开始强制升级
function startForceUpgrade() {
  if (!tftpRunning.value) {
    toast.add({
      severity: 'error',
      summary: t('forceUpgrade.toast.cannotStart'),
      detail: t('forceUpgrade.toast.startTftpFirst'),
      life: 5000
    })
    return
  }

  if (!upgradeFileName.value) {
    toast.add({
      severity: 'error',
      summary: t('forceUpgrade.toast.cannotStart'),
      detail: t('forceUpgrade.toast.selectFileFirst'),
      life: 5000
    })
    return
  }

  isUpgrading.value = true
  commandCount.value = 0

  addLog(t('forceUpgrade.log.sendingBroadcast'), 'info')

  // 广播模式，不指定目标IP
  window.electron.ipcRenderer.send('start-force-upgrade', {
    targetIp: null,  // 广播
    localInterface: tftpIp.value
  })
}

// 停止强制升级
function stopForceUpgrade() {
  window.electron.ipcRenderer.send('stop-force-upgrade')
  isUpgrading.value = false
  addLog(t('forceUpgrade.log.upgradeStopped'), 'warning')
}

// 处理升级成功
function handleUpgradeSuccess(event, data) {
  console.log('升级成功:', data)
  isUpgrading.value = false
  
  const logMsg = `${data.ip} (${data.mac}): ${data.message}`
  addLog(logMsg, 'success')
  
  toast.add({
    severity: 'success',
    summary: t('forceUpgrade.toast.upgradeSuccess'),
    detail: `${data.ip}: ${data.message}`,
    life: 5000
  })
}

// 处理升级失败
function handleUpgradeFailed(event, data) {
  console.log('升级失败:', data)
  isUpgrading.value = false
  
  const logMsg = `${data.ip} (${data.mac}): ${data.message}`
  addLog(logMsg, 'error')
  
  toast.add({
    severity: 'error',
    summary: t('forceUpgrade.toast.upgradeFailed'),
    detail: `${data.ip}: ${data.message}`,
    life: 5000
  })
}

// 处理升级错误
function handleUpgradeError(event, data) {
  console.error('升级错误:', data)
  isUpgrading.value = false
  
  addLog(t('forceUpgrade.log.upgradeError', { error: data.error }), 'error')
  
  toast.add({
    severity: 'error',
    summary: t('forceUpgrade.toast.upgradeError'),
    detail: data.error,
    life: 5000
  })
}

// 处理升级进度
function handleUpgradeProgress(event, data) {
  console.log('升级进度:', data)
  
  const logMsg = `${data.ip} (${data.mac}): ${data.message}`
  addLog(logMsg, 'info')
  
  // 进度通知使用较短的显示时间
  toast.add({
    severity: 'info',
    summary: t('forceUpgrade.toast.upgradeProgress'),
    detail: `${data.ip}: ${data.message}`,
    life: 3000
  })
}

// 处理正在发送指令
function handleUpgradeSending() {
  commandCount.value++
}

// 组件挂载时注册监听器
onBeforeMount(async () => {
  // 获取 TFTP 状态
  const status = await window.electron.ipcRenderer.invoke('tftp-status')
  tftpRunning.value = status.running

  // 注册 IPC 监听器
  forceUpgradeSuccessListener = window.electronAPI.ipc.registerListener(
    'force-upgrade-success',
    handleUpgradeSuccess
  )
  
  forceUpgradeFailedListener = window.electronAPI.ipc.registerListener(
    'force-upgrade-failed',
    handleUpgradeFailed
  )
  
  forceUpgradeErrorListener = window.electronAPI.ipc.registerListener(
    'force-upgrade-error',
    handleUpgradeError
  )
  
  forceUpgradeSendingListener = window.electronAPI.ipc.registerListener(
    'force-upgrade-sending',
    handleUpgradeSending
  )
  
  forceUpgradeProgressListener = window.electronAPI.ipc.registerListener(
    'force-upgrade-progress',
    handleUpgradeProgress
  )

  addLog(t('forceUpgrade.log.moduleLoaded'), 'info')
})

// 组件卸载时清理
onBeforeUnmount(() => {
  // 如果正在升级，先停止
  if (isUpgrading.value) {
    stopForceUpgrade()
  }

  // 注销监听器
  if (forceUpgradeSuccessListener) {
    window.electronAPI.ipc.unregisterListener(forceUpgradeSuccessListener)
  }
  if (forceUpgradeFailedListener) {
    window.electronAPI.ipc.unregisterListener(forceUpgradeFailedListener)
  }
  if (forceUpgradeErrorListener) {
    window.electronAPI.ipc.unregisterListener(forceUpgradeErrorListener)
  }
  if (forceUpgradeSendingListener) {
    window.electronAPI.ipc.unregisterListener(forceUpgradeSendingListener)
  }
  if (forceUpgradeProgressListener) {
    window.electronAPI.ipc.unregisterListener(forceUpgradeProgressListener)
  }
})
</script>

<style scoped>
.force-upgrade {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
}

.control {
  display: flex;
  gap: 1.5rem;
  flex-wrap: nowrap;
  align-items: stretch;
  flex-direction: row; /* 固定为横向排列 */
}

/* 通用区块样式 */
.section,
.section1 {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
}

.section1 {
  min-width: 35rem;
}

.section:hover,
.section1:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 区块标题 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--surface-border);
  margin-bottom: 0.5rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 输入行 */
.input-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.input-row label {
  white-space: nowrap;
  min-width: 120px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.input-row .flex-1 {
  flex: 1;
  min-width: 0;
}

.file-path {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
}

/* 操作指南 */
.guide-box {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #667eea30;
}

.guide-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-color);
  margin-bottom: 0.75rem;
}

.guide-title i {
  color: #667eea;
  font-size: 1.1rem;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.guide-step {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  padding-left: 0.5rem;
  line-height: 1.5;
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--surface-border);
}

/* 发送状态 */
.sending-status {
  margin-top: 1rem;
}

.sending-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: 6px;
  font-size: 0.875rem;
}

.command-count {
  font-weight: 600;
  color: #3b82f6;
}

/* 日志面板 */
.log-panel {
  flex: 1;
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 0.75rem;
}

.log-panel::-webkit-scrollbar {
  width: 8px;
}

.log-panel::-webkit-scrollbar-track {
  background: var(--surface-ground);
  border-radius: 4px;
}

.log-panel::-webkit-scrollbar-thumb {
  background: var(--surface-border);
  border-radius: 4px;
}

.log-panel::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-secondary);
}

.log-entry {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  line-height: 1.5;
  transition: background-color 0.15s ease;
}

.log-entry:hover {
  background: var(--surface-hover);
}

.log-time {
  min-width: 75px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 500;
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  color: var(--text-color);
  word-break: break-word;
}

/* 日志类型样式 */
.log-success {
  border-left: 3px solid #22c55e;
}

.log-success .log-time {
  color: #22c55e;
}

.log-error {
  border-left: 3px solid #ef4444;
}

.log-error .log-time {
  color: #ef4444;
}

.log-warning {
  border-left: 3px solid #f59e0b;
}

.log-warning .log-time {
  color: #f59e0b;
}

.log-info {
  border-left: 3px solid #3b82f6;
}

.log-info .log-time {
  color: #3b82f6;
}

.no-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--text-color-secondary);
}

.no-logs i {
  font-size: 2.5rem;
  opacity: 0.5;
}

.no-logs span {
  font-size: 0.9rem;
  font-style: italic;
}

/* 响应式设计 - 固定为并排布局 */
@media (max-width: 1400px) {
  /* 保持并排布局，通过调整宽度和滚动来处理小屏幕 */
  .section1 {
    min-width: 30rem;
    flex: 0 0 auto;
  }

  .section {
    flex: 1;
    min-width: 25rem;
  }

  .control {
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .force-upgrade {
    padding: 1rem;
  }

  .section,
  .section1 {
    padding: 1rem;
  }

  /* 在小屏幕上仍然保持并排，但允许横向滚动 */
  .control {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .section1 {
    min-width: 28rem;
    flex: 0 0 auto;
  }

  .section {
    min-width: 22rem;
    flex: 1;
  }

  .input-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .input-row label {
    min-width: auto;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .guide-step {
    font-size: 0.8rem;
  }

  .log-panel {
    min-height: 300px;
  }
}

/* 动画效果 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.log-entry {
  animation: slideIn 0.2s ease-out;
}

/* 改进焦点样式 */
.input-row :deep(.p-inputtext:focus) {
  box-shadow: 0 0 0 2px var(--surface-card), 0 0 0 4px var(--primary-color);
}

/* 进度条样式优化 */
.sending-status :deep(.p-progressbar) {
  border-radius: 4px;
  overflow: hidden;
}

.sending-status :deep(.p-progressbar-value) {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
}
</style>

