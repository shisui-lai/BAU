<script setup>
import { ref, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useIpStore } from '../../../../../stores/ipStore.js'
const ipStore = useIpStore()
const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const viewRef = ref(null)
const pageNames = ['BCU-Param', 'BCU-AlarmConfig', 'BCU-SOXConfig']

async function writeAllAcross() {
  window.__allPageRefs__ = window.__allPageRefs__ || {}
  for (const name of pageNames) {
    await router.push({ name })
    await nextTick()
    const inst = viewRef.value
    if (inst?.writeAllImported) {
      window.__allPageRefs__[name] = inst // 记录每个子页的ref
      await inst.writeAllImported()
    } else {
      console.warn(`页面 ${name} 没有 writeAllImported 方法`)
    }
  }
  toast.add({ severity: 'success', summary: t('config.toast.writeAllPagesSuccess'), life: 5000 })
}
</script>
<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" ref="viewRef">
      <template #global-actions>
        <Button
          :label="t('config.writeAll')"
          severity="success"
          @click="writeAllAcross"
          :disabled="!ipStore.isImportSuccess"
        />
      </template>
    </component>
  </router-view>
</template>
