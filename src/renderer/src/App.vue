<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// 监听主进程发送的语言切换事件
const handleSetLocale = (_event, lang) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}

onMounted(() => {
  // 监听主进程发送的语言切换事件
  if (window.electronAPI) {
    window.electronAPI.ipcRenderer.on('set-locale', handleSetLocale)
  }
})

onBeforeUnmount(() => {
  // 清理事件监听器
  if (window.electronAPI) {
    window.electronAPI.ipcRenderer.removeListener('set-locale', handleSetLocale)
  }
})

  // import { useClusterListener } from '@/composables/useClusterListener.js'
  // import { usePackListener } from '@/composables/usePackListener.js'
  // import { IOListener  } from '@/composables/IOListener.js'
  // import { FaultListener  } from '@/composables/FaultListener.js'
  // import { Listener } from '@/composables/Listener'
  // Listener()  

  // useClusterListener()
  // usePackListener()  
  // IOListener()
  // FaultListener()
  // import { useCentralBus } from '@/composables/useCentralBus'

  // useCentralBus()  

</script>

<template>
  <router-view />
  <!-- Toast组件已移至AppLayout.vue，避免双Toast问题 -->
  <ConfirmDialog />
</template>

<style scoped></style>



