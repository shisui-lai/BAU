<script setup>
import { useLayout } from '@/layout/composables/layout'
import { computed, reactive, onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIpStore } from '../../../stores/ipStore.js'
const { t } = useI18n()
const ipStore = useIpStore()
const { layoutConfig } = useLayout()
const modbusStats = reactive({})
const logoUrl = computed(() => {
  return `layout/images/${layoutConfig.darkTheme.value ? 'logo-white' : 'logo-dark'}.svg`
})
const version = ref('')
onMounted(async () => {
  const v = await window.electron.ipcRenderer.invoke('get-app-version')
  version.value = v
  window.electron.ipcRenderer.on('update-modbus-stats', (event, { ip, tx, rx }) => {
    modbusStats[ip] = { tx, rx }
  })
})
onBeforeUnmount(() => {
  window.electron.ipcRenderer.removeAllListeners('update-modbus-stats')
})
const getCommStateSeverity = (status, ip) => {
  if (status === 'startAllCommunication') {
    const count = ipStore.getRecentRestartCount(ip)
    if (count > 2) return 'signal-bad'
    if (count > 0 && count <= 2) return 'signal-good'
    return 'signal-best'
  }
  switch (status) {
    case 'success':
      return 'success'
    case 'interrupted':
      return 'interrupted'
    case 'disconnected':
      return 'disconnected'
    case 'reconnectting':
      return 'reconnectting'
    case 'failed':
      return 'failed'
    case 'device_offline':
      return 'offline'
    default:
      return 'unknown'
  }
}
// 辅助函数：根据状态码返回相应的中文说明
function getStatusText(status, retryCount, ip) {
  if (status === 'startAllCommunication') {
    const count = ipStore.getRecentRestartCount(ip)
    if (count > 2) return t('topBar.signalBad')
    if (count > 0 && count <= 2) return t('topBar.signalGood')
    return t('topBar.signalBest')
  }
  switch (status) {
    case 'success':
      return t('topBar.connected')
    case 'interrupted':
      return t('topBar.interrupt')
    case 'disconnected':
      return t('topBar.disconnected')
    case 'stopAllCommunication':
      return t('topBar.stopped')
    case 'reconnectting':
      return retryCount ? t('topBar.reconnectting') + `(${retryCount})` : t('topBar.reconnectting')
    case 'failed':
      return t('topBar.failed')
    case 'device_offline':
      return t('topBar.offline')
    case 'terminated':
      return t('topBar.terminated')
    default:
      return status
  }
}
// 新增辅助函数：提取最后一个字段作为 IP 显示
function getIpLastSegment(ip) {
  return ip.split('.').pop()
}
</script>

<template>
  <div class="layout-footer">
    <div class="footer-section left">
      <span class="version-info">v{{ version }}</span>
      <span class="footer-divider">|</span>
      <div class="ip-status-container">
        <div v-for="ip in ipStore.ipList" :key="ip" class="ip-status">
          <span class="ip-label">{{ getIpLastSegment(ip) }}</span>
          <span
            class="status-text"
            :class="getCommStateSeverity(ipStore.getConnectionStatus(ip), ip)"
            >{{
              getStatusText(ipStore.getConnectionStatus(ip), ipStore.getRetryCount(ip), ip)
            }}</span
          >
        </div>
      </div>
    </div>
    <div class="footer-section right">
      <span class="stats">
        <i>
          {{ t('topBar.request') }}: {{ modbusStats[ipStore.selectedIp]?.tx || 0 }} |
          {{ t('topBar.response') }}: {{ modbusStats[ipStore.selectedIp]?.rx || 0 }}
        </i>
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--surface-card);
  border-top: 1px solid var(--surface-border);
  padding: 0.2rem 1.1rem 0.2rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  font-size: 0.98rem;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);

  .footer-section {
    display: flex;
    align-items: center;
    min-width: 0;
    &.left {
      flex: 1;
      justify-content: flex-start;
      align-items: center;
      .version-info {
        margin-right: 0.5rem;
      }
      .footer-divider {
        color: #bbb;
        margin-right: 0.5rem;
        font-size: 1.1em;
        user-select: none;
      }
      .ip-status-container {
        margin-left: 0;
      }
    }
    &.right {
      flex: 1;
      justify-content: flex-end;
      text-align: right;
      .stats {
        font-size: 0.93em;
        font-variant-numeric: tabular-nums;
        color: #888;
        white-space: nowrap;
      }
    }
  }
}

.version-info {
  color: #888;
  font-size: 1.1rem;
  font-weight: 500;
  margin-left: 0.2rem;
}

.footer-divider {
  color: #bbb;
  margin-right: 0.5rem;
  font-size: 1.1em;
  user-select: none;
}

.ip-status-container {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  justify-content: flex-start;
}
.ip-status {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  background: rgba(6, 213, 232, 0.05);
  border-radius: 6px;
  padding: 0.1rem 0.1rem 0.1rem 0.1rem;
  margin-right: 0.2rem;
}
.ip-label {
  margin-right: 0.2rem;
  font-size: 0.95em;
  font-weight: 500;
}
.status-text {
  padding: 1px 1px;
  border-radius: 4px;
  font-size: 0.8em;
  margin-left: 0.1rem;
  min-width: 40px;
  text-align: center;
}

/* 状态文本背景色（可选，已在你原有样式定义） */
.status-text.signal-best {
  background: rgb(16, 185, 61) !important;
  color: #fff !important;
}
.status-text.signal-good {
  background: #b6e388 !important;
  color: #333 !important;
}
.status-text.signal-bad {
  background: #ffb300 !important;
  color: #fff !important;
}
.status-text.success {
  background: #1976d2;
  color: #fff;
}
.status-text.interrupted,
.status-text.disconnected {
  background: #bdbdbd;
  color: #fff;
}
.status-text.reconnectting {
  background: #a259d9;
  color: #fff;
}
.status-text.failed {
  background: #e53935;
  color: #fff;
}
.status-text.offline {
  background: #222;
  color: #fff;
}
.status-text.unknown {
  background: #eee;
  color: #333;
}

@media (max-width: 900px) {
  .layout-footer {
    flex-direction: column;
    align-items: stretch;
    .footer-section {
      justify-content: center !important;
      margin-bottom: 0.2rem;
    }
    .right {
      margin-bottom: 0;
    }
  }
}
</style>
