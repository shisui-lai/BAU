// 参数翻译工具函数 - 参考modbus上位机的translateData实现
import { useI18n } from 'vue-i18n'

/**
 * 创建参数翻译器
 * 用于翻译参数配置页面的参数名称和备注信息
 * @returns {Function} translateParameterData函数
 */
export function createParameterTranslator() {
  const { t, locale, te } = useI18n()
  
  /**
   * 翻译参数数据
   * @param {Array|Object} data - 要翻译的数据
   * @param {string} pageType - 页面类型，用于构建翻译键
   * @returns {Array|Object} 翻译后的数据
   */
  return function translateParameterData(data, pageType) {
    if (!data) return data
    
    // 处理数组数据
    if (Array.isArray(data)) {
      return data.map((item) => translateItem(item, pageType))
    }
    
    // 处理单个对象
    return translateItem(data, pageType)
  }
  
  /**
   * 翻译单个数据项
   * @param {Object} item - 数据项
   * @param {string} pageType - 页面类型
   * @returns {Object} 翻译后的数据项
   */
  function translateItem(item, pageType) {
    if (!item || typeof item !== 'object') return item
    
    const translatedItem = { ...item }
    
    // 保存原始标签，用于下拉框检测
    if (item.label && typeof item.label === 'string') {
      translatedItem.originalLabel = item.label
    }
    
    // 翻译label字段（参数名称）
    if (item.label && typeof item.label === 'string') {
      translatedItem.label = translateLabel(item.label, pageType)
    }
    
    // 翻译remarks字段（备注信息）
    if (item.remarks && typeof item.remarks === 'string') {
      translatedItem.remarks = translateRemarks(item.remarks, pageType)
    }
    
    // 处理嵌套的element数组（如modbus格式的分组数据）
    if (item.element && Array.isArray(item.element)) {
      translatedItem.element = item.element.map((el) => translateItem(el, pageType))
    }
    
    return translatedItem
  }
  
  /**
   * 翻译标签
   * @param {string} label - 原始标签
   * @param {string} pageType - 页面类型
   * @returns {string} 翻译后的标签
   */
  function translateLabel(label, pageType) {
    // 如果是中文，直接返回
    if (locale.value === 'zh') {
      return label
    }
    
    // 尝试翻译
    const translationKey = `config.${pageType}.label.${label}`
    if (te(translationKey)) {
      return t(translationKey)
    }
    
    // 翻译失败，返回原始标签
    return label
  }
  
  /**
   * 翻译备注信息
   * @param {string} remarks - 原始备注
   * @param {string} pageType - 页面类型
   * @returns {string} 翻译后的备注
   */
  function translateRemarks(remarks, pageType) {
    // 如果是中文，直接返回
    if (locale.value === 'zh') {
      return remarks
    }
    
    // 尝试翻译
    const translationKey = `config.${pageType}.remarks.${remarks}`
    if (te(translationKey)) {
      return t(translationKey)
    }
    
    // 翻译失败，返回原始备注
    return remarks
  }
}

/**
 * 创建备注翻译器
 * 专门用于翻译参数备注信息
 * @param {string} pageType - 页面类型
 * @returns {Function} 备注翻译函数
 */
export function createRemarksTranslator(pageType) {
  const { t, locale, te } = useI18n()
  
  return function translateRemarks(remarks) {
    if (!remarks || typeof remarks !== 'string') return remarks
    
    // 如果是中文，直接返回
    if (locale.value === 'zh') {
      return remarks
    }
    
    // 尝试翻译
    const translationKey = `config.${pageType}.remarks.${remarks}`
    
    if (te(translationKey)) {
      return t(translationKey)
    }
    
    // 翻译失败，返回原始备注
    return remarks
  }
}
