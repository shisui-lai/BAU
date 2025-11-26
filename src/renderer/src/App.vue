<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import About from './views/help/about.vue'

const { locale, t } = useI18n()
const showAboutDialog = ref(false)
const showExcelDialog = ref(false)

const onExcelDialogRetry = () => {
  showExcelDialog.value = false
  if (window.electronAPI) window.electronAPI.ipcRenderer.send('save-excel-decision', 'retry')
}
const onExcelDialogCancel = () => {
  showExcelDialog.value = false
  if (window.electronAPI) window.electronAPI.ipcRenderer.send('save-excel-decision', 'cancel')
}

// 监听主进程发送的语言切换事件
const handleSetLocale = (_event, lang) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}

// 处理显示About对话框
const handleShowAboutDialog = () => {
  showAboutDialog.value = true
}

onMounted(() => {
  // 监听主进程发送的语言切换事件
  if (window.electronAPI) {
    window.electronAPI.ipcRenderer.on('set-locale', handleSetLocale)
    window.electronAPI.ipcRenderer.on('show-about-dialog', handleShowAboutDialog)
    window.electronAPI.ipcRenderer.on('show-save-excel-dialog', () => { showExcelDialog.value = true })
  }
})

onBeforeUnmount(() => {
  // 清理事件监听器
  if (window.electronAPI) {
    window.electronAPI.ipcRenderer.removeListener('set-locale', handleSetLocale)
    window.electronAPI.ipcRenderer.removeListener('show-about-dialog', handleShowAboutDialog)
    window.electronAPI.ipcRenderer.removeListener('show-save-excel-dialog', () => {})
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



