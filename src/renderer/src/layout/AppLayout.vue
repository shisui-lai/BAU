<script setup>
import { computed, watch, ref, onMounted, provide, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppTopbar from './AppTopbar.vue'
import AppFooter from './AppFooter.vue'
import AppSidebar from './AppSidebar.vue'
import AppConfig from './AppConfig.vue'
import MqttConnection from '@/views/MqttConfig/MqttConnection.vue'
import { useLayout } from '@/layout/composables/layout'
import { useMqttStore } from '@/stores/communication/mqttStore'
import { useDataReceptionStore } from '@/stores/communication/dataReceptionStore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useSystemConfigStore } from '@/stores/system/systemConfigStore'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { layoutConfig, layoutState, isSidebarActive } = useLayout()
const mqttStore = useMqttStore()
const { t } = useI18n()

// 判断是否为全屏模式（不显示顶部栏和侧边栏）
const isFullScreen = computed(() => route.meta.fullScreen)

// 【数据接收监控】初始化数据接收监控store
// 功能：监控MQTT数据接收状态，提供5秒超时检测和智能配置读取
const dataReceptionStore = useDataReceptionStore()
const toast = useToast()

// 初始化页面类型检测
const pageTypeDetection = usePageTypeDetection()

// 【单实例模式】初始化系统配置管理（用于全局堆簇结构初始化）
// 使用 Pinia store 解决多实例状态隔离问题
const systemConfigStore = useSystemConfigStore()
const { systemConfig, isConfigLoaded, requestSystemConfig } = systemConfigStore

// MQTT连接弹窗控制
const displayMqttDialog = ref(false)

// 数据接收监控相关状态
let hasShownTimeoutToast = false

const outsideClickListener = ref(null)

watch(isSidebarActive, (newVal) => {
  if (newVal) {
    bindOutsideClickListener()
  } else {
    unbindOutsideClickListener()
  }
})

const containerClass = computed(() => {
  return {
    'layout-theme-light': layoutConfig.darkTheme.value === 'light',
    'layout-theme-dark': layoutConfig.darkTheme.value === 'dark',
    'layout-overlay': layoutConfig.menuMode.value === 'overlay',
    'layout-static': layoutConfig.menuMode.value === 'static',
    'layout-static-inactive':
      layoutState.staticMenuDesktopInactive.value && layoutConfig.menuMode.value === 'static',
    'layout-overlay-active': layoutState.overlayMenuActive.value,
    'layout-mobile-active': layoutState.staticMenuMobileActive.value,
    'p-ripple-disabled': layoutConfig.ripple.value === false,
    'layout-fullscreen': isFullScreen.value
  }
})

const bindOutsideClickListener = () => {
  if (!outsideClickListener.value) {
    outsideClickListener.value = (event) => {
      // 检查点击目标是否是Toast关闭按钮，如果是则不处理
      if (event.target?.closest?.('.p-toast-close-button')) {
        return
      }

      if (isOutsideClicked(event)) {
        layoutState.overlayMenuActive.value = false
        layoutState.staticMenuMobileActive.value = false
        layoutState.menuHoverActive.value = false
      }
    }
    document.addEventListener('click', outsideClickListener.value)
  }
}

const unbindOutsideClickListener = () => {
  if (outsideClickListener.value) {
    document.removeEventListener('click', outsideClickListener.value)
    outsideClickListener.value = null
  }
}

const isOutsideClicked = (event) => {
  const sidebarEl = document.querySelector('.layout-sidebar')
  if (!sidebarEl) {
    return true
  }
  return !(
    (sidebarEl.isSameNode(event.target) || sidebarEl.contains(event.target))
  )
}

// MQTT状态相关方法
function getStatusText() {
  // 使用store中的statusText getter，它已经包含了正确的状态映射
  return t(mqttStore.statusText)
}

function getStatusIcon() {
  switch (mqttStore.status) {
    case 'connected': return 'pi pi-check-circle'
    case 'connecting':
    case 'reconnecting': return 'pi pi-spin pi-spinner'
    case 'disconnected': return 'pi pi-times-circle'
    case 'offline': return 'pi pi-times-circle'
    case 'error': return 'pi pi-exclamation-triangle'
    default: return 'pi pi-question-circle'
  }
}

// MQTT连接相关方法
function onMqttDialogHide() {
  // 如果连接成功，记录状态
  if (mqttStore.isConnected) {
    sessionStorage.setItem('mqttConnectionShown', 'true')
  }
  console.log('[AppLayout] MQTT配置弹窗已关闭，可通过侧边栏底部状态按钮重新打开')
}

function onMqttConnected() {
  displayMqttDialog.value = false
  sessionStorage.setItem('mqttConnectionShown', 'true')
}

function onMqttDisconnected() {
  // 连接断开时可能需要重新显示弹窗
  const autoShowOnDisconnect = localStorage.getItem('mqtt_auto_show_on_disconnect')
  if (autoShowOnDisconnect !== 'false') {
    displayMqttDialog.value = true
  }
}

// 处理状态指示器点击事件
function handleStatusClick() {
  if (mqttStore.status === 'connecting' || mqttStore.status === 'reconnecting') {
    // 如果正在连接或重连，显示确认对话框
    if (confirm('正在连接中，是否要取消连接并重新配置？')) {
      mqttStore.disconnect()
      displayMqttDialog.value = true
    }
  } else {
    // 其他状态直接打开配置弹窗
    displayMqttDialog.value = true
  }
}

// 断开连接功能
async function handleDisconnect() {
  if (confirm('确定要断开MQTT连接吗？')) {
    await mqttStore.disconnect()
  }
}

// 检查MQTT连接状态
function checkMqttConnection() {
  const hasShown = sessionStorage.getItem('mqttConnectionShown')
  
  // 如果没有显示过弹窗，或者当前未连接，则显示弹窗
  if (!hasShown || !mqttStore.isConnected) {
    displayMqttDialog.value = true
  }
}

// 监听MQTT连接状态变化
watch(() => mqttStore.status, (newStatus, oldStatus) => {
  // 只有手动断开才显示弹窗，服务器掉线不显示弹窗
  if (oldStatus === 'connected' && (newStatus === 'disconnected' || newStatus === 'offline' || newStatus === 'error')) {
    // 检查断开原因，只有手动断开才显示弹窗
    if (mqttStore.disconnectReason === 'manual') {
      onMqttDisconnected()
    } else {
      console.log('[AppLayout] 服务器断开连接，不显示弹窗，等待自动重连')
    }
  }

  // 如果MQTT连接成功，自动读取系统配置参数
  if (newStatus === 'connected' && oldStatus !== 'connected') {
    console.log('[AppLayout] MQTT连接成功，开始读取系统配置参数')
    // 减少延迟，快速读取配置
    setTimeout(() => {
      requestSystemConfig()
    }, 100) // 从500ms减少到100ms
  }
})

// 【数据接收监控】处理心跳信号（仅用于通讯状态监控）
// 功能：接收主进程发送的心跳信号，更新数据接收状态
// 速率计算已迁移到MQTT子进程，此处不再处理速率
function handleDataHeartbeat(event, heartbeat) {
  dataReceptionStore.markDataReceived(heartbeat.messageType)
}

// 【数据速率】处理速率更新（接收来自MQTT子进程的计算结果）
// 新架构：速率在MQTT子进程计算，渲染进程只负责显示
function handleDataRateUpdate(event, rateData) {
  dataReceptionStore.updateDataRate(rateData.rate)
}

// 监听数据接收状态变化 - 已移除toast提示，只保留状态更新
watch(
  () => dataReceptionStore.isReceivingData,
  (newValue, oldValue) => {
    // 从正常变为超时
    if (oldValue === true && newValue === false) {
      hasShownTimeoutToast = true
      // 不再显示toast通知，只更新状态
    }
    // 从超时恢复为正常
    else if (oldValue === false && newValue === true) {
      hasShownTimeoutToast = false
      // 不再显示toast通知，只更新状态
    }
  }
)

// 组件挂载时检查MQTT连接状态
onMounted(() => {
  const appLayoutStart = performance.now()
  // 【MQTT状态监听】初始化MQTT store的IPC事件监听器
  // 功能：监听来自主进程的MQTT连接状态变化事件，实现实时状态检测
  mqttStore.initialize()
  console.log('[AppLayout] MQTT状态监听已初始化')

  // 【单实例模式】初始化系统配置管理
  // 注册IPC监听器并启动30秒定时器
  systemConfigStore.initialize()
  console.log('[AppLayout] 系统配置管理已初始化')

  checkMqttConnection()

  // 如果MQTT已经连接，立即读取系统配置
  if (mqttStore.isConnected) {
    console.log('[AppLayout] 应用启动时MQTT已连接，立即读取系统配置参数')
    setTimeout(() => {
      requestSystemConfig()
    }, 200) // 从800ms减少到200ms
  } else {
    console.log('[AppLayout] 应用启动时MQTT未连接，等待连接成功后自动读取配置')
  }

  // 【数据接收监控】初始化数据接收监控
  // 监听主进程发送的心跳信号，启动5秒超时检测和智能配置读取机制
  window.electron.ipcRenderer.on('mqtt-data-heartbeat', handleDataHeartbeat)
  dataReceptionStore.startMonitoring()
  console.log('[AppLayout] 数据接收监控已启动')

  // 【数据速率】监听来自MQTT子进程的速率更新
  // 新架构：速率在子进程计算，渲染进程只负责显示
  window.electron.ipcRenderer.on('data-rate-update', handleDataRateUpdate)
  console.log('[AppLayout] 数据速率监听已启动')
  window.electron.ipcRenderer.on('crash-summary', (_event, line) => {
    if (line) console.error(line)
  })

  // 监听页面可见性变化，优化后台性能
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

// 组件卸载时清理资源
onUnmounted(() => {
  // 【单实例模式】清理系统配置管理
  systemConfigStore.cleanup()
  console.log('[AppLayout] 系统配置管理已清理')

  // 清理数据接收监控
  window.electron.ipcRenderer.removeAllListeners('mqtt-data-heartbeat')
  window.electron.ipcRenderer.removeAllListeners('data-rate-update')
  window.electron.ipcRenderer.removeAllListeners('crash-summary')
  dataReceptionStore.stopMonitoring()

  // 清理页面可见性监听
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  console.log('[AppLayout] 所有资源已清理')
})

// 处理页面可见性变化 - 已禁用后台节流
function handleVisibilityChange() {
  const isVisible = !document.hidden

  // 通知主进程调整MQTT限流策略 - 已禁用
  // if (window.electron?.ipcRenderer) {
  //   window.electron.ipcRenderer.send('page-visibility-change', isVisible)
  // }
}

// 清理资源
onUnmounted(() => {
  // 【数据接收监控】清理数据接收监控
  // 移除心跳监听器，停止超时检测
  window.electron.ipcRenderer.removeAllListeners('mqtt-data-heartbeat')
  dataReceptionStore.stopMonitoring()
  console.log('[AppLayout] 数据接收监控已停止')

  // 【数据速率】清理速率监听器
  window.electron.ipcRenderer.removeAllListeners('data-rate-update')
  window.electron.ipcRenderer.removeAllListeners('crash-summary')
  console.log('[AppLayout] 数据速率监听已停止')

  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 提供依赖注入给子组件使用
provide('handleStatusClick', handleStatusClick)
provide('handleDisconnect', handleDisconnect)
provide('getStatusIcon', getStatusIcon)
provide('getStatusText', getStatusText)

// 向子组件传递MQTT状态控制方法
defineExpose({
  handleStatusClick,
  handleDisconnect,
  mqttStore,
  getStatusIcon,
  getStatusText
})
</script>

<template>
  <div class="layout-wrapper" :class="containerClass">
    <!-- 移除MQTT状态传递，现在由侧边栏直接使用 -->
    <app-topbar v-if="!isFullScreen" />
    
    <div class="layout-sidebar" v-if="!isFullScreen">
      <app-sidebar></app-sidebar>
    </div>
    <div class="layout-main-container">
      <div class="layout-main">
        <!-- 为参数管理页面和电池信息页面启用keep-alive，避免频繁mount/unmount -->
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <keep-alive include="SOXParam,BaseParam,AlarmThreshold,cellData">
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </div>
    </div>
    <app-config></app-config>
    <div class="layout-mask"></div>
    
    <!-- MQTT连接配置弹窗 -->
    <Dialog
      v-model:visible="displayMqttDialog"
      :closable="true"
      :style="{ width: '90%', maxWidth: '900px' }"
      :modal="true"
      :header="t('mqtt.title')"
      @hide="onMqttDialogHide"
    >
      <MqttConnection 
        @connected="onMqttConnected"
        @disconnected="onMqttDisconnected"
      />
    </Dialog>
  </div>
  <Toast />
</template>

<style lang="scss">
/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style lang="scss" scoped>
/* 移除原有的右上角状态指示器样式，改为在AppSidebar中实现 */
</style>
