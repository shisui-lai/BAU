<template>
  <div class="locale-switcher">
    <select v-model="currentLocale" @change="changeLocale" class="locale-select">
      <option v-for="loc in locales" :key="loc" :value="loc">
        {{ loc }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, availableLocales } = useI18n()
const locales = ['zh', 'en'] // 明确指定可用语言
const currentLocale = ref(locale.value)

// 初始化语言
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

// 切换语言
const changeLocale = async () => {
  locale.value = currentLocale.value
  // 持久化
  if (window.electronAPI && window.electronAPI.setLocale) {
    await window.electronAPI.setLocale(currentLocale.value)
  } else {
    localStorage.setItem('locale', currentLocale.value)
  }
}

// 初始化
initLocale()
</script>

<style scoped>
.locale-switcher {
  display: inline-block;
}

.locale-select {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: #a0aec0;
  padding: 6px 10px;
  font-size: 14px;
  min-width: 70px;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a0aec0' stroke-width='2'><polyline points='6,9 12,15 18,9'></polyline></svg>");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
  padding-right: 28px;
}

.locale-select:hover {
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

.locale-select:focus {
  outline: none;
  border-color: #4f9cf9;
  color: #fff;
}

.locale-select option {
  background: #2d3748;
  color: #fff;
}
</style>
