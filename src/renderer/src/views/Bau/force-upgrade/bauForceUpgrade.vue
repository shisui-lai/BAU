<template>
  <div class="card force-upgrade">
    <div class="control">
      <!-- 左侧：TFTP 服务器配置部分 -->
      <div class="section1">
        <div class="section-header">
          <h5 class="section-title">{{ t('forceUpgrade.tftpServerConfig', 'TFTP服务器配置') }}</h5>
          <Button
            class="p-button-sm"
            @click="toggleTftp"
            :label="tftpRunning ? t('forceUpgrade.stopTftp', '停止TFTP') : t('forceUpgrade.startTftp', '启动TFTP')"
            :severity="tftpRunning ? 'danger' : 'success'"
            :icon="tftpRunning ? 'pi pi-stop' : 'pi pi-play'"
            iconPos="left"
            :disabled="isUpgrading"
          />
        </div>

        <div class="input-row">
          <label for="tftpIp">{{ t('forceUpgrade.tftpIp', 'TFTP服务器IP') }}：</label>
          <InputText 
            v-model="tftpIp" 
            id="tftpIp" 
            class="flex-1" 
            :disabled="true"
            :placeholder="t('forceUpgrade.tftpIpPlaceholder', '192.168.11.200')"
            readonly
          />
        </div>

        <div class="input-row">
          <label for="tftpPort">{{ t('forceUpgrade.tftpPort', 'TFTP端口') }}：</label>
          <InputText 
            v-model="tftpPort" 
            id="tftpPort" 
            class="flex-1" 
            :disabled="tftpRunning || isUpgrading"
            :placeholder="'69'"
          />
        </div>

        <div class="input-row">
          <label for="upgradeFile">{{ t('forceUpgrade.upgradeFile', '升级文件') }}：</label>
          <InputText
            v-model="upgradeFileName"
            id="upgradeFile"
            readonly
            :placeholder="t('forceUpgrade.upgradeFilePlaceholder', '请选择升级文件')"
            class="flex-1"
          />
          <Button
            icon="pi pi-folder-open"
            class="p-button-sm p-button-outlined"
            @click="selectUpgradeFile"
            :disabled="tftpRunning || isUpgrading"
            v-tooltip.top="t('forceUpgrade.selectFile', '选择文件')"
          />
        </div>

        <div class="action-bar">
          <Button
            :label="isUpgrading ? t('forceUpgrade.stopUpgrade', '停止升级') : t('forceUpgrade.startUpgrade', '开始升级')"
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
            <span>{{ t('forceUpgrade.operationGuide.title', '操作说明') }}</span>
          </div>
          <div class="guide-steps">
            <div class="guide-step">1. {{ t('forceUpgrade.operationGuide.step1', 'TFTP服务器IP固定为192.168.11.200') }}</div>
            <div class="guide-step">2. {{ t('forceUpgrade.operationGuide.step2', '选择升级文件') }}</div>
            <div class="guide-step">3. {{ t('forceUpgrade.operationGuide.step3', '启动TFTP服务器') }}</div>
            <div class="guide-step">4. {{ t('forceUpgrade.operationGuide.step4', '点击"开始升级"按钮发送强制升级指令') }}</div>
            <div class="guide-step">5. {{ t('forceUpgrade.operationGuide.step5', '等待BAU设备响应并从TFTP服务器下载升级文件') }}</div>
            <div class="guide-step">6. {{ t('forceUpgrade.operationGuide.step6', '设备完成升级并重启') }}</div>
          </div>
        </div>

        <!-- 发送指令计数 - 仅在发送中显示 -->
        <div v-if="isUpgrading" class="sending-status">
          <ProgressBar mode="indeterminate" style="height: 0.5rem" />
          <div class="sending-info">
            <span>{{ t('forceUpgrade.sendingInfo', '正在发送升级指令...') }}</span>
            <span class="command-count">{{ commandCount }} {{ t('forceUpgrade.times', '次') }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：日志面板 -->
      <div class="section">
        <div class="section-header">
          <h5 class="section-title">{{ t('forceUpgrade.log.title', '操作日志') }}</h5>
          <Button
            :label="t('forceUpgrade.log.clear', '清空')"
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
            <span>{{ t('forceUpgrade.log.noLogs', '暂无日志') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeMount, onBeforeUnmount } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ProgressBar from 'primevue/progressbar'

const { t } = useI18n()
const toast = useToast()

// TFTP 服务器相关
const tftpRunning = ref(false)
// TFTP IP地址固定为192.168.11.200，不可修改
const TFTP_FIXED_IP = '192.168.11.200'
const tftpIp = ref(TFTP_FIXED_IP) // 固定值，仅用于显示
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
// 参考reference项目：不检查isUpgrading状态，确保停止按钮始终可用
const canStartUpgrade = computed(() => {
  return tftpRunning.value && upgradeFileName.value
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
  addLog(t('forceUpgrade.log.cleared', '日志已清空'), 'info')
}

// 选择升级文件
async function selectUpgradeFile() {
  try {
    const result = await window.electronAPI.ipc.invoke('select-tftp-upgrade-file')
    
    if (!result.canceled) {
      if (result.error) {
        addLog(t('forceUpgrade.log.fileSelectFailed', { message: result.message }, `文件选择失败: ${result.message}`), 'error')
        toast.add({
          severity: 'error',
          summary: t('forceUpgrade.toast.fileNameError', '文件名错误'),
          detail: result.message,
          life: 5000
        })
        upgradeFileName.value = ''
        upgradeFileDir.value = ''
      } else if (result.success) {
        upgradeFileName.value = result.fileName
        upgradeFileDir.value = result.fileDir
        
        addLog(t('forceUpgrade.log.fileSelected', { fileName: result.fileName }, `已选择文件: ${result.fileName}`), 'success')
        addLog(t('forceUpgrade.log.rootSet', { dir: result.fileDir }, `TFTP根目录: ${result.fileDir}`), 'info')
        toast.add({
          severity: 'success',
          summary: t('forceUpgrade.toast.fileSelectSuccess', '文件选择成功'),
          detail: t('forceUpgrade.toast.fileSelectedDetail', { fileName: result.fileName }, `已选择: ${result.fileName}`),
          life: 5000
        })
      }
    }
  } catch (err) {
    console.error('选择文件失败:', err)
    addLog(t('forceUpgrade.log.fileSelectFailed', { message: err.message }, `文件选择失败: ${err.message}`), 'error')
    toast.add({
      severity: 'error',
      summary: t('forceUpgrade.toast.fileSelectFailed', '文件选择失败'),
      detail: err.message,
      life: 5000
    })
  }
}

// 切换 TFTP 服务器
async function toggleTftp() {
  if (tftpRunning.value) {
    // 停止 TFTP
    const res = await window.electronAPI.ipc.invoke('tftp-stop')
    if (res.success) {
      tftpRunning.value = false
      addLog(t('forceUpgrade.log.tftpStopped', 'TFTP服务器已停止'), 'info')
      toast.add({
        severity: 'success',
        summary: t('forceUpgrade.toast.tftpStopped', 'TFTP已停止'),
        life: 5000
      })
    } else {
      addLog(t('forceUpgrade.log.tftpStopFailed', { message: res.message }, `TFTP停止失败: ${res.message}`), 'error')
      toast.add({
        severity: 'error',
        summary: t('forceUpgrade.toast.tftpStopFailed', 'TFTP停止失败'),
        detail: res.message,
        life: 5000
      })
    }
  } else {
    // 启动 TFTP（使用固定的IP地址）
    const res = await window.electronAPI.ipc.invoke('tftp-start', {
      host: TFTP_FIXED_IP,
      port: parseInt(tftpPort.value) || 69
    })
    
    if (res.success) {
      tftpRunning.value = true
      addLog(t('forceUpgrade.log.tftpStarted', { host: TFTP_FIXED_IP, port: tftpPort.value }, `TFTP服务器已启动: ${TFTP_FIXED_IP}:${tftpPort.value}`), 'success')
      toast.add({
        severity: 'success',
        summary: t('forceUpgrade.toast.tftpStarted', 'TFTP已启动'),
        detail: res.message,
        life: 5000
      })
    } else {
      addLog(t('forceUpgrade.log.tftpStartFailed', { message: res.message }, `TFTP启动失败: ${res.message}`), 'error')
      toast.add({
        severity: 'error',
        summary: t('forceUpgrade.toast.tftpStartFailed', 'TFTP启动失败'),
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
      summary: t('forceUpgrade.toast.cannotStart', '无法开始'),
      detail: t('forceUpgrade.toast.startTftpFirst', '请先启动TFTP服务器'),
      life: 5000
    })
    return
  }

  if (!upgradeFileName.value) {
    toast.add({
      severity: 'error',
      summary: t('forceUpgrade.toast.cannotStart', '无法开始'),
      detail: t('forceUpgrade.toast.selectFileFirst', '请先选择升级文件'),
      life: 5000
    })
    return
  }

  isUpgrading.value = true
  commandCount.value = 0

  addLog(t('forceUpgrade.log.sendingBroadcast', '开始发送强制升级广播指令...'), 'info')

  // 广播模式，使用固定的TFTP IP作为本地接口
  // 使用electronAPI的send方法
  window.electronAPI.ipc.send('start-force-upgrade', {
    interfaceAddress: TFTP_FIXED_IP
  })
}

// 停止强制升级
function stopForceUpgrade() {
  window.electronAPI.ipc.send('stop-force-upgrade')
  // 参考reference项目：立即在前端设置状态，不等待后端通知
  isUpgrading.value = false
  commandCount.value = 0
  addLog(t('forceUpgrade.log.upgradeStopped', '已停止升级'), 'warning')
}

// 处理升级成功（完成）
function handleUpgradeSuccess(event, data) {
  console.log('升级成功:', data)
  isUpgrading.value = false
  commandCount.value = 0
  
  const logMsg = `${data.ip}${data.mac ? ' (' + data.mac + ')' : ''}: ${data.message || t('forceUpgrade.log.upgradeSuccess', '升级完成')}`
  addLog(logMsg, 'success')
  
  toast.add({
    severity: 'success',
    summary: t('forceUpgrade.toast.upgradeSuccess', '升级成功'),
    detail: `${data.ip}: ${data.message || '升级完成'}`,
    life: 5000
  })
}

// 处理升级失败
function handleUpgradeFailed(event, data) {
  console.log('升级失败:', data)
  isUpgrading.value = false
  commandCount.value = 0
  
  const logMsg = `${data.ip}${data.mac ? ' (' + data.mac + ')' : ''}: ${data.message || t('forceUpgrade.log.upgradeFailed', '升级失败')}`
  addLog(logMsg, 'error')
  
  toast.add({
    severity: 'error',
    summary: t('forceUpgrade.toast.upgradeFailed', '升级失败'),
    detail: `${data.ip}: ${data.message || '升级失败'}`,
    life: 5000
  })
}

// 处理升级错误
function handleUpgradeError(event, data) {
  console.error('升级错误:', data)
  isUpgrading.value = false
  commandCount.value = 0
  
  addLog(t('forceUpgrade.log.upgradeError', { error: data.error }, `升级错误: ${data.error}`), 'error')
  
  toast.add({
    severity: 'error',
    summary: t('forceUpgrade.toast.upgradeError', '升级错误'),
    detail: data.error,
    life: 5000
  })
}

// 处理升级进度
function handleUpgradeProgress(event, data) {
  console.log('升级进度:', data)
  
  const logMsg = `${data.ip}${data.mac ? ' (' + data.mac + ')' : ''}: ${data.message || '升级进度更新'}`
  addLog(logMsg, 'info')
  
  toast.add({
    severity: 'info',
    summary: t('forceUpgrade.toast.upgradeProgress', '升级进度'),
    detail: `${data.ip}: ${data.message || '进度更新'}`,
    life: 3000
  })
}

// 处理正在发送指令
function handleUpgradeSending(event, data) {
  commandCount.value++
}

// 组件挂载时
onBeforeMount(async () => {
  // 获取 TFTP 状态
  const status = await window.electronAPI.ipc.invoke('tftp-status')
  tftpRunning.value = status.running

  // TFTP IP固定为192.168.11.200，无需从后端获取
  tftpIp.value = TFTP_FIXED_IP

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

  addLog(t('forceUpgrade.log.moduleLoaded', '强制升级模块已加载'), 'info')
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

/* 操作指南 */
.guide-box {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #667eea30;
  margin-top: 1rem;
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
  margin-top: 1rem;
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

/* 响应式设计 */
@media (max-width: 1400px) {
  .control {
    flex-direction: column;
  }

  .section1 {
    min-width: 0;
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
