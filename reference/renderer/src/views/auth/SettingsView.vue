<template>
  <div class="settings-page p-4">
    <div class="settings-header flex items-center justify-between mb-4">
      <h2 class="text-2xl font-semibold">语言切换</h2>
      <langSelect />
      <Button icon="pi pi-times" class="p-button-text" @click="onClose" aria-label="关闭" />
    </div>
    <!-- 直接复用 AppConfig，但以 inline 模式渲染 -->
    <!-- <AppConfig inline /> -->
  </div>
</template>

<script setup>
import AppConfig from '@/layout/AppConfig.vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import langSelect from '../auth/langSelect.vue'
const router = useRouter()

function onClose() {
  router.back()
}
</script>

<style scoped>
.settings-page {
  max-width: 800px;
  margin: 0 auto;
}
.settings-header {
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
}
</style>
