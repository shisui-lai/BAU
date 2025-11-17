<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import AppTopbar from './AppTopbar.vue'
import AppFooter from './AppFooter.vue'
import AppSidebar from './AppSidebar.vue'
import AppConfig from './AppConfig.vue'
import selectInterface from '@/views/Bcu/ipConfig/selectInterface.vue'
import { useLayout } from '@/layout/composables/layout'
const displayDialog = ref(false) // 控制弹窗显示

const { layoutConfig, layoutState, isSidebarActive } = useLayout()

const outsideClickListener = ref(null)

watch(isSidebarActive, (newVal) => {
  if (newVal) {
    bindOutsideClickListener()
  } else {
    unbindOutsideClickListener()
  }
  ;``
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
    document.removeEventListener('click', outsideClickListener)
    outsideClickListener.value = null
  }
}
const isOutsideClicked = (event) => {
  const sidebarEl = document.querySelector('.layout-sidebar')
  /* const topbarEl = document.querySelector('.layout-menu-button') */
  if (!sidebarEl) {
    return true // 默认返回 true，认为点击的是外部区域
  }
  return !(
    (sidebarEl.isSameNode(event.target) || sidebarEl.contains(event.target))
    /*   topbarEl.isSameNode(event.target) ||
    topbarEl.contains(event.target) */
  )
}
function onDialogHide() {
  sessionStorage.setItem('selectInterfaceShown', 'true')
}
// 在组件挂载时触发弹窗显示
onMounted(() => {
  const hasShown = sessionStorage.getItem('selectInterfaceShown')
  if (!hasShown) {
    // 延迟显示弹窗，让页面先完全加载，避免登录后卡顿
    setTimeout(() => {
      displayDialog.value = true
    }, 500) // 延迟1.5秒，给页面足够时间完成初始化
  }
})
</script>

<template>
  <div class="layout-wrapper" :class="containerClass">
    <app-topbar></app-topbar>
    <div class="layout-sidebar">
      <app-sidebar></app-sidebar>
    </div>
    <div class="layout-main-container">
      <div class="layout-main">
        <router-view></router-view>
      </div>
      <app-footer></app-footer>
    </div>
    <app-config></app-config>
    <div class="layout-mask"></div>
    <!-- Dialog 弹窗 -->
    <Dialog
      v-model:visible="displayDialog"
      :closable="true"
      :style="{ width: '60%' }"
      :modal="true"
      @hide="onDialogHide"
    >
      <selectInterface />
    </Dialog>
  </div>
  <Toast />
</template>

<style lang="less" scoped>
/* 为主内容区域添加底部内边距，为固定底部导航留出空间 */

/* ① 让 Dialog Header 相对定位，以便子元素绝对定位时参照它 */
:deep(.p-dialog .p-dialog-header) {
  display: flex !important;
  justify-content: flex-end !important;
  align-items: center !important;
  padding: 0.5rem !important;
}

:deep(.p-dialog .p-dialog-header .p-dialog-header-icons) {
  margin: 0 !important; /* 清除可能的外边距 */
  position: absolute !important;
  top: 0.5rem; /* 根据你的 header 高度调整 */
  right: 0.5rem; /* 离右边留 0.5rem，可自行改 */
  display: flex;
  align-items: center;
}
</style>
