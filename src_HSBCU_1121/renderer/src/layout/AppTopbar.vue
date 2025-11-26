<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
import { useLayout } from '@/layout/composables/layout'
import { useRouter } from 'vue-router'
import { useIpStore } from '../../../stores/ipStore.js'
import selectIp from '@/views/Bcu/ipConfig/selectIp.vue'
import dataExport from '@/views/Bcu/ipConfig/dataExport.vue'
const ipStore = useIpStore() // 获取 Pinia store
const { layoutConfig, onMenuToggle } = useLayout()
const outsideClickListener = ref(null)
const topbarMenuActive = ref(false)
const router = useRouter()
const commstate = ref(null)
const ipcHandle = () => window.electron.ipcRenderer.send('ping')
const currentTime = ref(new Date().toLocaleString())
let timerId = null
function updateTime() {
  currentTime.value = new Date().toLocaleString()
  if ('visibility: visible;' == commstate.value) {
    commstate.value = 'visibility: hidden;'
  } else {
    commstate.value = 'visibility: visible;'
  }
  // toast.add({ severity: 'info', summary: 'Row Group Expanded', detail: 'Value: ' + currentTime.value, life: 3000 });
  // window.electron.ipcRenderer.send('ping');

  ipcHandle()
}

function startTimer() {
  if (timerId == null) {
    timerId = setInterval(updateTime, 5000)
  }
}

function stopTimer() {
  if (timerId != null) {
    clearInterval(timerId)
    timerId = null
  }
}

onMounted(() => {
  bindOutsideClickListener()
  startTimer()
})

onBeforeUnmount(() => {
  unbindOutsideClickListener()
  stopTimer()
})

const logoUrl = computed(() => {
  return `./layout/images/${layoutConfig.darkTheme.value ? 'logo-white' : 'logo-dark'}.svg`
  // return layoutConfig.darkTheme.value ? '/layout/images/logo-white.svg' : '/layout/images/logo-dark.svg';
  // return layoutConfig.darkTheme.value ? logowhite : logodark;
})

const onTopBarMenuButton = () => {
  topbarMenuActive.value = !topbarMenuActive.value
}
const onSettingsClick = () => {
  topbarMenuActive.value = false
  router.push('/documentation')
}
const topbarMenuClasses = computed(() => {
  return {
    'layout-topbar-menu-mobile-active': topbarMenuActive.value
  }
})

const bindOutsideClickListener = () => {
  if (!outsideClickListener.value) {
    outsideClickListener.value = (event) => {
      if (isOutsideClicked(event)) {
        topbarMenuActive.value = false
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
  if (!topbarMenuActive.value) return

  const sidebarEl = document.querySelector('.layout-topbar-menu')
  const topbarEl = document.querySelector('.layout-topbar-menu-button')

  return !(
    sidebarEl.isSameNode(event.target) ||
    sidebarEl.contains(event.target) ||
    topbarEl.isSameNode(event.target) ||
    topbarEl.contains(event.target)
  )
}

const formattedConnectedIps = computed(() => {
  return ipStore.connectedIps.map((ip, index) => ({
    label: `BCU${index + 1} (${ip})`,
    value: ip
  }))
})
</script>

<template>
  <div class="layout-topbar">
    <!-- 左侧按钮及 logo 部分 -->
    <div class="left-section">
      <button class="p-link layout-menu-button layout-topbar-button" @click="onMenuToggle()">
        <i class="pi pi-bars"></i>
      </button>
      <div class="input-container">
        <selectIp />
      </div>
      <div>
        <MultiSelect
          v-model="ipStore.selectedIpsForWrite"
          :options="formattedConnectedIps"
          optionLabel="label"
          optionValue="value"
          :placeholder="t('topBar.placeholder')"
          :maxSelectedLabels="0"
          filter
          style="width: 12rem; font-size: 1rem"
        />
      </div>
      <dataExport />
      <!--     <langSelect /> -->
    </div>
  </div>
</template>

<style scoped>
/* 整体顶部导航栏 */
.layout-topbar1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
}

/* 左侧区域：菜单按钮和输入框 */
.left-section {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.custom-multiselect .p-multiselect-header .p-checkbox::after {
  content: '全选'; /* 在复选框后插入“全选”文字 */
  margin-left: 0.5rem; /* 与复选框保持一定间距 */
  font-size: 0.875rem; /* 可根据需要调整字体大小 */
  color: #333; /* 可根据主题调整颜色 */
}

/* 按钮样式：避免默认按钮边框、背景，并添加点击效果 */
.p-link {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1.2rem;
}

.p-link:focus {
  outline: none;
}
</style>
