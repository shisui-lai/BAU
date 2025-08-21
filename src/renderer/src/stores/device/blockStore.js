// 全局堆选择状态管理 - 统一管理所有页面的堆选择状态
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBlockStore = defineStore('block', () => {
  // ================== 基础状态 ==================
  
  // 所有可用的堆选项列表
  const availableBlocks = ref([])
  
  // 当前选中的堆（用于查看数据）
  const selectedBlockForView = ref(null)
  
  // 选中的堆列表（用于批量下发）
  const selectedBlocksForWrite = ref([])
  
  // 当前页面类型（用于控制导航栏显示）
  const currentPageType = ref('standalone') // 'block' | 'blockread' | 'standalone'

  // ================== 计算属性 ==================
  
  // 是否显示堆选择器（查看用下拉框）
  const showBlockSelector = computed(() => {
    return currentPageType.value === 'block' || 
           currentPageType.value === 'blockread'
  })
  
  // 是否显示下发多选框
  const showWriteSelector = computed(() => {
    return currentPageType.value === 'block' // 只有堆级遥调页面才需要下发功能
  })
  
  // 是否全选状态
  const isAllSelected = computed(() => {
    return availableBlocks.value.length > 0 && 
           selectedBlocksForWrite.value.length === availableBlocks.value.length
  })

  // ================== 堆选项管理 ==================
  
  /**
   * 确保堆选项存在，如果不存在则添加
   * 【已禁用】原动态发现机制，现在完全依靠配置驱动方式
   * @param {string} blockKey - 堆键值，格式：'block1', 'block2'
   */
  function ensureBlockOption(blockKey) {
    // 【已禁用】动态发现机制，现在完全依靠配置驱动方式
    // 此方法保留为兼容性接口，但不再执行实际的选项添加操作
    if (!blockKey || typeof blockKey !== 'string' || !isValidBlockKey(blockKey)) {
      return
    }
    
    // 静默检查选项是否存在，不执行任何操作
    const exists = availableBlocks.value.some(option => option.value === blockKey)
    if (!exists) {
      // 静默忽略，依靠配置驱动的初始化
      return
    }
    
    // 【禁用】所有动态添加逻辑
    /*
    // 解析堆号
    const blockNum = blockKey.replace('block', '')
    
    const newOption = {
      label: `堆${blockNum}`,
      value: blockKey,
      block: parseInt(blockNum)
    }
    
    // 插入到正确位置（保持排序）
    const insertIndex = availableBlocks.value.findIndex(option => {
      const existingBlock = option.block
      const newBlock = newOption.block
      return newBlock < existingBlock
    })
    
    if (insertIndex === -1) {
      availableBlocks.value.push(newOption)
    } else {
      availableBlocks.value.splice(insertIndex, 0, newOption)
    }
    
    console.log('[blockStore] ensureBlockOption: 备用机制添加了堆选项:', newOption)

    // 触发自动选择（仅在当前没有选择时）
    if (!selectedBlockForView.value) {
      scheduleAutoSelect()
    }
    */
  }

  /**
   * 替换所有堆选项
   * @param {Array} newOptions - 新的选项数组，格式：[{label, value}, ...]
   */
  function replaceBlockOptions(newOptions) {
    if (!Array.isArray(newOptions)) {
      console.warn('[blockStore] replaceBlockOptions: newOptions must be array')
      return
    }
    
    const validOptions = newOptions.filter(option => {
      const isValid = option && 
                     typeof option.label === 'string' && 
                     typeof option.value === 'string' &&
                     isValidBlockKey(option.value)
      
      if (!isValid) {
        console.warn('[blockStore] replaceBlockOptions: invalid option', option)
      }
      
      return isValid
    })
    
    // 为每个选项添加解析后的block信息
    const enrichedOptions = validOptions.map(option => {
      const blockNum = option.value.replace('block', '')
      return {
        ...option,
        block: parseInt(blockNum)
      }
    })
    
    // 排序
    enrichedOptions.sort((a, b) => a.block - b.block)
    
    availableBlocks.value = enrichedOptions
    console.log('[blockStore] replaceBlockOptions: replaced with', enrichedOptions.length, 'options')
  }

  /**
   * 清空所有堆选项
   */
  function clearBlockOptions() {
    availableBlocks.value = []
    selectedBlockForView.value = null
    selectedBlocksForWrite.value = []
    console.log('[blockStore] clearBlockOptions: cleared')
  }

  // ================== 自动选择逻辑 ==================

  let autoSelectTimer = null

  /**
   * 智能选择最佳堆
   * @param {Array} blocks - 可用的堆列表
   * @returns {string} 最佳堆键值
   */
  function findBestBlock(blocks) {
    if (!blocks || blocks.length === 0) return null

    // 提取所有键值
    const blockKeys = blocks.map(b => b.value || b)

    // 优先级1：查找 block1
    if (blockKeys.includes('block1')) {
      return 'block1'
    }

    // 优先级2：选择最小的堆号
    const sortedBlocks = blockKeys.sort()
    return sortedBlocks[0]
  }

  /**
   * 延迟自动选择堆
   */
  function scheduleAutoSelect() {
    // 清除之前的定时器
    if (autoSelectTimer) {
      clearTimeout(autoSelectTimer)
    }

    // 100ms后进行智能选择
    autoSelectTimer = setTimeout(() => {
      if (!selectedBlockForView.value && availableBlocks.value.length > 0) {
        const bestBlock = findBestBlock(availableBlocks.value)
        if (bestBlock) {
          selectedBlockForView.value = bestBlock
          console.log(`[blockStore] 自动选择堆: ${bestBlock}`)
        }
      }
      autoSelectTimer = null
    }, 100)
  }

  // ================== 选择管理 ==================

  /**
   * 设置当前查看的堆
   * @param {string|null} blockKey - 堆键值或null
   */
  function setSelectedBlockForView(blockKey) {
    selectedBlockForView.value = blockKey
    console.log('[blockStore] setSelectedBlockForView:', blockKey)
  }

  /**
   * 设置选中的下发目标堆列表
   * @param {Array} blockKeys - 堆键值数组
   */
  function setSelectedBlocksForWrite(blockKeys) {
    if (!Array.isArray(blockKeys)) {
      console.warn('[blockStore] setSelectedBlocksForWrite: blockKeys must be array')
      return
    }
    selectedBlocksForWrite.value = blockKeys
    console.log('[blockStore] setSelectedBlocksForWrite:', blockKeys)
  }

  /**
   * 全选所有堆
   */
  function selectAllBlocks() {
    selectedBlocksForWrite.value = availableBlocks.value.map(option => option.value)
    console.log('[blockStore] selectAllBlocks: selected all blocks')
  }

  /**
   * 清空所有选中的堆
   */
  function clearSelectedBlocks() {
    selectedBlocksForWrite.value = []
    console.log('[blockStore] clearSelectedBlocks: cleared all selections')
  }

  // ================== 页面类型管理 ==================
  
  /**
   * 设置当前页面类型
   * @param {'block' | 'blockread' | 'standalone'} pageType - 页面类型
   */
  function setCurrentPageType(pageType) {
    if (!['block', 'blockread', 'standalone'].includes(pageType)) {
      console.warn('[blockStore] setCurrentPageType: invalid pageType', pageType)
      return
    }
    currentPageType.value = pageType
    console.log('[blockStore] setCurrentPageType:', pageType)
  }

  // ================== 工具方法 ==================
  
  /**
   * 获取堆的显示名称
   * @param {string} blockKey - 堆键值
   * @returns {string} 显示名称
   */
  function getBlockDisplayName(blockKey) {
    const option = availableBlocks.value.find(opt => opt.value === blockKey)
    return option ? option.label : blockKey
  }

  /**
   * 验证堆键值格式是否正确
   * @param {string} blockKey - 堆键值
   * @returns {boolean} 是否有效
   */
  function isValidBlockKey(blockKey) {
    if (!blockKey || typeof blockKey !== 'string') {
      return false
    }
    
    if (!blockKey.startsWith('block')) {
      return false
    }
    
    const blockNum = parseInt(blockKey.replace('block', ''))
    return !isNaN(blockNum) && blockNum > 0
  }

  // ================== 系统配置驱动初始化 ==================
  
  /**
   * 根据系统配置参数初始化堆结构
   * @param {Object} config - 配置参数 {BlockCount}
   */
  function initializeFromSystemConfig(config) {
    const { BlockCount } = config
    
    // 验证配置参数
    if (!BlockCount || BlockCount < 1) {
      console.warn('[blockStore] 无效的堆数配置:', BlockCount)
      clearBlockOptions()
      return
    }
    
    // 清空现有选项
    clearBlockOptions()
    
    // 根据配置生成堆选项
    const newOptions = []
    
    for (let block = 1; block <= BlockCount; block++) {
      newOptions.push({
        label: `堆${block}`,
        value: `block${block}`,
        block: block
      })
    }
    
    // 排序并设置选项
    newOptions.sort((a, b) => a.block - b.block)
    
    availableBlocks.value = newOptions
    console.log('🔧 [堆配置] 生成选项:', newOptions.map(o => o.value))
    
    // 触发自动选择最佳堆
    if (newOptions.length > 0) {
      scheduleAutoSelect()
    }
  }

  // ================== 返回接口 ==================
  
  return {
    // ========== 状态 ==========
    availableBlocks,
    selectedBlockForView,
    selectedBlocksForWrite,
    currentPageType,
    
    // ========== 计算属性 ==========
    showBlockSelector,
    showWriteSelector,
    isAllSelected,
    
    // ========== 方法 ==========
    ensureBlockOption,
    replaceBlockOptions,
    clearBlockOptions,
    setSelectedBlockForView,
    setSelectedBlocksForWrite,
    selectAllBlocks,
    clearSelectedBlocks,
    setCurrentPageType,
    getBlockDisplayName,
    isValidBlockKey,
    
    // ========== 新增：系统配置驱动初始化 ==========
    initializeFromSystemConfig
  }
}) 