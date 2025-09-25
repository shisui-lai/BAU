<template>
  <div>
    <div class="locale-switcher">
      <select v-model="currentLocale" @change="changeLocale">
        <option v-for="loc in locales" :key="loc" :value="loc">
          {{ loc }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
const { locale, availableLocales, t } = useI18n()
const locales = availableLocales.value // e.g. ['zh', 'en', 'ja']
const currentLocale = ref(locale.value)
// 同步外部持久化（localStorage 或 Electron）
// 页面加载时，尝试读取上次设置
const initLocale = async () => {
  let saved = null
  // Electron 环境
  if (window.electronAPI && window.electronAPI.getLocale) {
    saved = await window.electronAPI.getLocale()
  } else {
    saved = localStorage.getItem('locale')
  }
  if (saved && locales.includes(saved)) {
    locale.value = saved
    currentLocale.value = saved
  }
}
initLocale()
const changeLocale = async () => {
  locale.value = currentLocale.value
  // 持久化
  if (window.electronAPI && window.electronAPI.setLocale) {
    await window.electronAPI.setLocale(currentLocale.value)
  } else {
    localStorage.setItem('locale', currentLocale.value)
  }
}
</script>

<style lang="less" scoped></style>
