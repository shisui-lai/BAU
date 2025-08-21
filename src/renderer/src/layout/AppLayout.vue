<script setup>
import { computed, watch, ref, onMounted, provide } from 'vue'
import AppTopbar from './AppTopbar.vue'
import AppFooter from './AppFooter.vue'
import AppSidebar from './AppSidebar.vue'
import AppConfig from './AppConfig.vue'
import MqttConnection from '@/views/MqttConfig/MqttConnection.vue'
import { useLayout } from '@/layout/composables/layout'
import { useMqttStore } from '@/stores/communication/mqttStore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useSystemConfig } from '@/composables/core/data-processing/parameter-management/useSystemConfig'

const { layoutConfig, layoutState, isSidebarActive } = useLayout()
const mqttStore = useMqttStore()

// 初始化页面类型检测
const pageTypeDetection = usePageTypeDetection()

// 初始化系统配置管理（用于全局堆簇结构初始化）
const { systemConfig, isConfigLoaded, requestSystemConfig } = useSystemConfig()

// MQTT连接弹窗控制
const displayMqttDialog = ref(false)

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
    'p-ripple-disabled': layoutConfig.ripple.value === false
  }
})

const bindOutsideClickListener = () => {
  if (!outsideClickListener.value) {
    outsideClickListener.value = (event) => {
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
  switch (mqttStore.status) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    case 'reconnecting': return `重连中(${mqttStore.reconnect.currentAttempt}/${mqttStore.reconnect.maxAttempts})`
    case 'disconnected': return '未连接'
    case 'error': return '连接失败'
    default: return '未知状态'
  }
}

function getStatusIcon() {
  switch (mqttStore.status) {
    case 'connected': return 'pi pi-check-circle'
    case 'connecting': 
    case 'reconnecting': return 'pi pi-spin pi-spinner'
    case 'disconnected': return 'pi pi-times-circle'
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
      mqttStore.stopReconnect()
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
  // 如果从连接状态变为断开，可能需要显示弹窗
  if (oldStatus === 'connected' && (newStatus === 'disconnected' || newStatus === 'error')) {
    onMqttDisconnected()
  }
  
  // 如果MQTT连接成功，自动读取系统配置参数
  if (newStatus === 'connected' && oldStatus !== 'connected') {
    console.log('[AppLayout] MQTT连接成功，开始读取系统配置参数')
    // 延迟一下确保连接完全稳定
    setTimeout(() => {
      requestSystemConfig()
    }, 500)
  }
})

// 组件挂载时检查MQTT连接状态
onMounted(() => {
  checkMqttConnection()
  
  // 如果MQTT已经连接，立即读取系统配置
  if (mqttStore.isConnected) {
    console.log('[AppLayout] 应用启动时MQTT已连接，立即读取系统配置参数')
    setTimeout(() => {
      requestSystemConfig()
    }, 800) // 稍作延迟确保监听器就绪
  } else {
    console.log('[AppLayout] 应用启动时MQTT未连接，等待连接成功后自动读取配置')
  }
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
    <app-topbar />
    
    <div class="layout-sidebar">
      <app-sidebar></app-sidebar>
    </div>
    <div class="layout-main-container">
      <div class="layout-main">
        <router-view></router-view>
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
      header="MQTT服务器连接"
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

<style lang="scss" scoped>
/* 移除原有的右上角状态指示器样式，改为在AppSidebar中实现 */
</style>
