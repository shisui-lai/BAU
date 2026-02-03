<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import About from './views/help/about.vue'

const { locale, t } = useI18n()
const showAboutDialog = ref(false)
const showExcelDialog = ref(false)
const confirm = useConfirm()
const toast = useToast()
const diskWarningActive = ref(false)
let autoStopTimer = null

const onExcelDialogRetry = () => {
  showExcelDialog.value = false
  if (window.electron?.ipcRenderer) window.electron.ipcRenderer.send('save-excel-decision', 'retry')
}
const onExcelDialogCancel = () => {
  showExcelDialog.value = false
  if (window.electron?.ipcRenderer) window.electron.ipcRenderer.send('save-excel-decision', 'cancel')
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
    window.electronAPI.ipcRenderer.on('disk-space-warning', () => {
      if (diskWarningActive.value) return
      diskWarningActive.value = true
      if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null }
      confirm.require({
        message: '检测到磁盘空间不足，是否停止导出？',
        header: '磁盘空间不足',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: '是',
        rejectLabel: '否',
        accept: async () => {
          if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null }
          try { window.electron?.ipcRenderer?.send('set-export-config', { semantic: false, raw: false }) } catch {}
          try { window.electron?.ipcRenderer?.send('disk-space-decision', 'stop') } catch {}
          try { window.dispatchEvent(new CustomEvent('clear-storage-enabled')) } catch {}
          diskWarningActive.value = false
          toast.add({ severity: 'warn', summary: '已停止导出', detail: '磁盘空间不足，已停止报文与语义导出', life: 5000 })
        },
        reject: () => {
          if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null }
          try { window.electron?.ipcRenderer?.send('disk-space-decision', 'continue') } catch {}
          diskWarningActive.value = false
        },
        onHide: () => {
          diskWarningActive.value = false
          if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null }
        }
      })
      autoStopTimer = setTimeout(async () => {
        if (diskWarningActive.value) {
          try { window.electron?.ipcRenderer?.send('set-export-config', { semantic: false, raw: false }) } catch {}
          try { window.electron?.ipcRenderer?.send('disk-space-decision', 'stop') } catch {}
          try { window.dispatchEvent(new CustomEvent('clear-storage-enabled')) } catch {}
          confirm.close()
          diskWarningActive.value = false
          autoStopTimer = null
          toast.add({ severity: 'warn', summary: '已自动停止导出', detail: '倒计时结束，已停止报文与语义导出', life: 5000 })
        }
      }, 10000)
    })
  }
})

onBeforeUnmount(() => {
  // 清理事件监听器
  if (window.electronAPI) {
    window.electronAPI.ipcRenderer.removeListener('set-locale', handleSetLocale)
    window.electronAPI.ipcRenderer.removeListener('show-about-dialog', handleShowAboutDialog)
    window.electronAPI.ipcRenderer.removeListener('show-save-excel-dialog', () => {})
    window.electronAPI.ipcRenderer.removeAllListeners('disk-space-warning')
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
