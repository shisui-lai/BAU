// 国际化占位文件
// 当前系统暂不支持多语言，但已预留接口
// 未来可以使用 vue-i18n 实现国际化功能

import zhCN from '../locales/zh.json'
import enUS from '../locales/en.json'

// 简单的占位实现，直接返回中文
export function useI18n() {
  const locale = 'zh-CN' // 默认语言
  
  // 简单的翻译函数
  function t(key) {
    // 暂时直接返回中文文案
    const keys = key.split('.')
    let value = zhCN
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        return key // 如果找不到，返回key本身
      }
    }
    
    return value || key
  }
  
  return {
    locale,
    t,
    availableLocales: ['zh-CN', 'en-US']
  }
}

// 导出语言包供未来使用
export const messages = {
  'zh-CN': zhCN,
  'en-US': enUS
}

// TODO: 未来可以替换为真正的 vue-i18n 实现
// import { createI18n } from 'vue-i18n'
// 
// const i18n = createI18n({
//   locale: 'zh-CN',
//   fallbackLocale: 'en-US',
//   messages
// })
// 
// export default i18n



