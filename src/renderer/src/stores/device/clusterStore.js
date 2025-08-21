// 全局簇选择状态管理 - 统一管理所有页面的簇选择状态
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useClusterStore = defineStore('cluster', () => {
  // ================== 基础状态 ==================
  
  // 所有可用的簇选项列表
  const availableClusters = ref([])
  
  // 当前选中的簇（用于查看数据）
  const selectedClusterForView = ref(null)
  
  // 选中的簇列表（用于批量下发）
  const selectedClustersForWrite = ref([])
  
  // 当前页面类型（用于控制导航栏显示）
  const currentPageType = ref('standalone') // 'cluster' | 'clusterread' | 'standalone'

  // ================== 故障筛选状态 ==================
  // 故障页面专用的筛选状态管理
  
  // 所有可用的堆选项列表（从故障数据中解析）
  const availableBlocks = ref([])
  
  // 所有可用的簇选项列表（从故障数据中解析，用于故障筛选）
  const availableFaultClusters = ref([])
  
  // 故障筛选模式：'all' | 'block' | 'cluster'
  const faultFilterMode = ref('all')
  
  // 故障筛选 - 选中的堆列表（多选）
  const selectedBlocksForFault = ref([])
  
  // 故障筛选 - 选中的簇列表（多选）
  const selectedClustersForFault = ref([])

  // ================== 计算属性 ==================
  
  // 是否显示簇选择器（查看用下拉框）
  const showClusterSelector = computed(() => {
    return currentPageType.value === 'cluster' || 
           currentPageType.value === 'clusterread'
  })
  
  // 是否显示下发多选框
  const showWriteSelector = computed(() => {
    return currentPageType.value === 'cluster' // 只有簇级遥调页面才需要下发功能
  })
  
  // 是否全选状态
  const isAllSelected = computed(() => {
    return availableClusters.value.length > 0 && 
           selectedClustersForWrite.value.length === availableClusters.value.length
  })
  
  // 全选按钮文本
  // const selectAllButtonText = computed(() => {
  //   return isAllSelected.value ? '清空' : '全选'
  // })

  // ================== 故障筛选计算属性 ==================
  
  // 故障筛选状态文本描述
  // const faultFilterStatusText = computed(() => {
  //   if (faultFilterMode.value === 'all') {
  //     return '显示全部故障（包括堆告警和簇故障）'
  //   }
    
  //   if (faultFilterMode.value === 'block') {
  //     if (selectedBlocksForFault.value.length === 0) {
  //       return '显示全部堆的故障（包括堆告警和簇故障）'
  //     }
  //     const blockNames = selectedBlocksForFault.value.map(b => `堆${b}`).join('、')
  //     return `显示 ${blockNames} 的故障（包括堆告警和簇故障）`
  //   }
    
  //   if (faultFilterMode.value === 'cluster') {
  //     if (selectedClustersForFault.value.length === 0) {
  //       return '显示全部簇的故障（不包括堆告警）'
  //     }
  //     const clusterNames = selectedClustersForFault.value
  //       .map(c => {
  //         const parts = c.split('-')
  //         return parts.length === 2 ? `堆${parts[0]}/簇${parts[1]}` : c
  //       })
  //       .join('、')
  //     return `显示 ${clusterNames} 的故障（不包括堆告警）`
  //   }
    
  //   return ''
  // })
  
  // 故障筛选 - 堆全选状态
  const isAllBlocksSelectedForFault = computed(() => {
    return availableBlocks.value.length > 0 && 
           selectedBlocksForFault.value.length === availableBlocks.value.length
  })
  
  // 故障筛选 - 簇全选状态
  const isAllClustersSelectedForFault = computed(() => {
    return availableFaultClusters.value.length > 0 && 
           selectedClustersForFault.value.length === availableFaultClusters.value.length
  })

  // ================== 簇选项管理 ==================
  
  /**
   * 确保簇选项存在，如果不存在则添加
   * 【已禁用】原动态发现机制，现在完全依靠配置驱动方式
   * @param {string} clusterKey - 簇键值，格式：'1-2'
   */
  function ensureClusterOption(clusterKey) {
    // 【已禁用】动态发现机制，现在完全依靠配置驱动方式
    // 此方法保留为兼容性接口，但不再执行实际的选项添加操作
    if (!clusterKey || typeof clusterKey !== 'string' || !isValidClusterKey(clusterKey)) {
      return
    }
    
    // 静默检查选项是否存在，不执行任何操作
    const exists = availableClusters.value.some(option => option.value === clusterKey)
    if (!exists) {
      // 静默忽略，依靠配置驱动的初始化
      return
    }
    
    // 【禁用】所有动态添加逻辑
    /*
    // 解析堆-簇信息
    const parts = clusterKey.split('-')
    const blockNum = parts[0]
    const clusterNum = parts[1]
    
    const newOption = {
      label: `堆${blockNum}/簇${clusterNum}`,
      value: clusterKey,
      block: parseInt(blockNum),
      cluster: parseInt(clusterNum)
    }
    
    // 插入到正确位置（保持排序）
    const insertIndex = availableClusters.value.findIndex(option => {
      const [existingBlock, existingCluster] = option.value.split('-').map(Number)
      const [newBlock, newCluster] = [newOption.block, newOption.cluster]
      
      if (newBlock !== existingBlock) {
        return newBlock < existingBlock
      }
      return newCluster < existingCluster
    })
    
    if (insertIndex === -1) {
      availableClusters.value.push(newOption)
    } else {
      availableClusters.value.splice(insertIndex, 0, newOption)
    }
    
    console.log('[clusterStore] ensureClusterOption: 备用机制添加了簇选项:', newOption)

    // 触发自动选择（仅在当前没有选择时）
    if (!selectedClusterForView.value) {
      scheduleAutoSelect()
    }
    */
  }

  /**
   * 替换所有簇选项
   * @param {Array} newOptions - 新的选项数组，格式：[{label, value}, ...]
   */
  function replaceClusterOptions(newOptions) {
    if (!Array.isArray(newOptions)) {
      console.warn('[clusterStore] replaceClusterOptions: newOptions must be array')
      return
    }
    
    const validOptions = newOptions.filter(option => {
      const isValid = option && 
                     typeof option.label === 'string' && 
                     typeof option.value === 'string' &&
                     isValidClusterKey(option.value)
      
      if (!isValid) {
        console.warn('[clusterStore] replaceClusterOptions: invalid option', option)
      }
      
      return isValid
    })
    
    // 为每个选项添加解析后的block和cluster信息
    const enrichedOptions = validOptions.map(option => {
      const parts = option.value.split('-')
      return {
        ...option,
        block: parseInt(parts[0]),
        cluster: parseInt(parts[1])
      }
    })
    
    // 排序
    enrichedOptions.sort((a, b) => {
      if (a.block !== b.block) {
        return a.block - b.block
      }
      return a.cluster - b.cluster
    })
    
    availableClusters.value = enrichedOptions
    // console.log('[clusterStore] replaceClusterOptions: replaced with', enrichedOptions.length, 'options')
  }

  /**
   * 清空所有簇选项
   */
  function clearClusterOptions() {
    availableClusters.value = []
    selectedClusterForView.value = null
    selectedClustersForWrite.value = []
    console.log('[clusterStore] clearClusterOptions: cleared')
  }

  // ================== 自动选择逻辑 ==================

  let autoSelectTimer = null

  /**
   * 智能选择最佳堆簇
   * @param {Array} clusters - 可用的堆簇列表
   * @returns {string} 最佳堆簇键值
   */
  function findBestCluster(clusters) {
    if (!clusters || clusters.length === 0) return null

    // 提取所有键值
    const clusterKeys = clusters.map(c => c.value || c)

    // 优先级1：查找 1-1
    if (clusterKeys.includes('1-1')) {
      return '1-1'
    }

    // 优先级2：查找 1-x（堆1的其他簇）
    const block1Clusters = clusterKeys.filter(key => key.startsWith('1-')).sort()
    if (block1Clusters.length > 0) {
      return block1Clusters[0]
    }

    // 优先级3：选择最小的堆簇号
    const sortedClusters = clusterKeys.sort()
    return sortedClusters[0]
  }

  /**
   * 延迟自动选择堆簇
   */
  function scheduleAutoSelect() {
    // 清除之前的定时器
    if (autoSelectTimer) {
      clearTimeout(autoSelectTimer)
    }

    // 100ms后进行智能选择
    autoSelectTimer = setTimeout(() => {
      if (!selectedClusterForView.value && availableClusters.value.length > 0) {
        const bestCluster = findBestCluster(availableClusters.value)
        if (bestCluster) {
          selectedClusterForView.value = bestCluster
          console.log(`[clusterStore] 自动选择设备: ${bestCluster}`)
        }
      }
      autoSelectTimer = null
    }, 100)
  }

  // ================== 选择管理 ==================

  /**
   * 设置当前查看的簇
   * @param {string|null} clusterKey - 簇键值或null
   */
  function setSelectedClusterForView(clusterKey) {
    selectedClusterForView.value = clusterKey
    console.log('[clusterStore] setSelectedClusterForView:', clusterKey)
  }

  /**
   * 设置批量下发的簇列表
   * @param {Array} clusterKeys - 簇键值数组
   */
  function setSelectedClustersForWrite(clusterKeys) {
    if (!Array.isArray(clusterKeys)) {
      console.warn('[clusterStore] setSelectedClustersForWrite: clusterKeys must be array')
      return
    }
    selectedClustersForWrite.value = [...clusterKeys]
    console.log('[clusterStore] setSelectedClustersForWrite:', clusterKeys)
  }

  /**
   * 切换全选状态
   */
  function toggleSelectAll() {
    if (isAllSelected.value) {
      selectedClustersForWrite.value = []
    } else {
      selectedClustersForWrite.value = availableClusters.value.map(option => option.value)
    }
    console.log('[clusterStore] toggleSelectAll:', selectedClustersForWrite.value.length, 'selected')
  }

  /**
   * 添加簇到批量下发列表
   * @param {string} clusterKey - 簇键值
   */
  function addClusterForWrite(clusterKey) {
    if (!clusterKey || selectedClustersForWrite.value.includes(clusterKey)) {
      return
    }
    selectedClustersForWrite.value.push(clusterKey)
    console.log('[clusterStore] addClusterForWrite:', clusterKey)
  }

  /**
   * 从批量下发列表中移除簇
   * @param {string} clusterKey - 簇键值
   */
  function removeClusterFromWrite(clusterKey) {
    const index = selectedClustersForWrite.value.indexOf(clusterKey)
    if (index > -1) {
      selectedClustersForWrite.value.splice(index, 1)
      console.log('[clusterStore] removeClusterFromWrite:', clusterKey)
    }
  }

  // ================== 故障筛选管理 ==================
  
  /**
   * 从故障数据中解析并更新堆和簇选项
   * @param {Array} faultData - 故障数据数组
   */
  function updateFaultOptions(faultData) {
    if (!Array.isArray(faultData)) {
      console.warn('[clusterStore] updateFaultOptions: faultData must be array')
      return
    }
    
    const blocks = new Set()
    const clusters = new Map()
    
    faultData.forEach(fault => {
      if (!fault.cluster) return
      
      const clusterStr = String(fault.cluster)
      
      // 处理堆-簇格式 "1-8"
      if (clusterStr.includes('-')) {
        const parts = clusterStr.split('-')
        if (parts.length === 2) {
          const blockNum = parseInt(parts[0])
          const clusterNum = parseInt(parts[1])
          
          if (!isNaN(blockNum) && !isNaN(clusterNum)) {
            blocks.add(blockNum)
            
            // 只有真正的簇故障（clusterNum > 0）才添加到簇选项中
            if (clusterNum > 0) {
              clusters.set(clusterStr, { block: blockNum, cluster: clusterNum })
            }
          }
        }
      } else {
        // 处理纯堆号格式 "1" (堆告警)
        const blockNum = parseInt(clusterStr)
        if (!isNaN(blockNum)) {
          blocks.add(blockNum)
        }
      }
    })
    
    // 更新堆选项
    availableBlocks.value = Array.from(blocks)
      .sort((a, b) => a - b)
      .map(block => ({
        label: `堆${block}`,
        value: block
      }))
    
    // 更新簇选项（故障专用）
    availableFaultClusters.value = Array.from(clusters.values())
      .sort((a, b) => {
        if (a.block !== b.block) return a.block - b.block
        return a.cluster - b.cluster
      })
      .map(item => ({
        label: `堆${item.block}/簇${item.cluster}`,
        value: `${item.block}-${item.cluster}`,
        block: item.block,
        cluster: item.cluster
      }))
    
    console.log('[clusterStore] updateFaultOptions: blocks:', availableBlocks.value.length, 'clusters:', availableFaultClusters.value.length)
  }
  
  /**
   * 设置故障筛选模式
   * @param {'all' | 'block' | 'cluster'} mode - 筛选模式
   */
  function setFaultFilterMode(mode) {
    if (!['all', 'block', 'cluster'].includes(mode)) {
      console.warn('[clusterStore] setFaultFilterMode: invalid mode', mode)
      return
    }
    faultFilterMode.value = mode
    console.log('[clusterStore] setFaultFilterMode:', mode)
  }
  
  /**
   * 设置故障筛选 - 选中的堆列表
   * @param {Array} blockNumbers - 堆号数组
   */
  function setSelectedBlocksForFault(blockNumbers) {
    if (!Array.isArray(blockNumbers)) {
      console.warn('[clusterStore] setSelectedBlocksForFault: blockNumbers must be array')
      return
    }
    selectedBlocksForFault.value = [...blockNumbers]
    console.log('[clusterStore] setSelectedBlocksForFault:', blockNumbers)
  }
  
  /**
   * 设置故障筛选 - 选中的簇列表
   * @param {Array} clusterKeys - 簇键值数组
   */
  function setSelectedClustersForFault(clusterKeys) {
    if (!Array.isArray(clusterKeys)) {
      console.warn('[clusterStore] setSelectedClustersForFault: clusterKeys must be array')
      return
    }
    selectedClustersForFault.value = [...clusterKeys]
    console.log('[clusterStore] setSelectedClustersForFault:', clusterKeys)
  }
  
  /**
   * 故障筛选 - 堆全选/清空切换
   */
  function toggleSelectAllBlocksForFault() {
    if (isAllBlocksSelectedForFault.value) {
      selectedBlocksForFault.value = []
    } else {
      selectedBlocksForFault.value = availableBlocks.value.map(option => option.value)
    }
    console.log('[clusterStore] toggleSelectAllBlocksForFault:', selectedBlocksForFault.value.length, 'selected')
  }
  
  /**
   * 故障筛选 - 簇全选/清空切换
   */
  function toggleSelectAllClustersForFault() {
    if (isAllClustersSelectedForFault.value) {
      selectedClustersForFault.value = []
    } else {
      selectedClustersForFault.value = availableFaultClusters.value.map(option => option.value)
    }
    console.log('[clusterStore] toggleSelectAllClustersForFault:', selectedClustersForFault.value.length, 'selected')
  }
  
  /**
   * 根据筛选条件过滤故障数据
   * @param {Array} allFaults - 所有故障数据
   * @returns {Array} 过滤后的故障数据
   */
  function filterFaultData(allFaults) {
    if (!Array.isArray(allFaults)) {
      return []
    }
    
    if (faultFilterMode.value === 'all') {
      return allFaults
    }
    
    return allFaults.filter(fault => {
      if (!fault.cluster) return false
      
      const clusterStr = String(fault.cluster)
      
      // 解析故障的堆-簇信息
      let blockNum = null
      let isClusterFault = false
      
      if (clusterStr.includes('-')) {
        // 簇故障格式 "1-8"
        const parts = clusterStr.split('-')
        if (parts.length === 2) {
          blockNum = parseInt(parts[0])
          isClusterFault = true
        }
      } else {
        // 堆告警格式 "1"
        blockNum = parseInt(clusterStr)
        isClusterFault = false
      }
      
      if (isNaN(blockNum)) return false
      
      if (faultFilterMode.value === 'block') {
        // 按堆筛选：包括堆告警和该堆下的所有簇故障
        return selectedBlocksForFault.value.length === 0 || 
               selectedBlocksForFault.value.includes(blockNum)
      }
      
      if (faultFilterMode.value === 'cluster') {
        // 按簇筛选：只包括指定的簇故障（不包括堆告警）
        return isClusterFault && 
               (selectedClustersForFault.value.length === 0 || 
                selectedClustersForFault.value.includes(clusterStr))
      }
      
      return true
    })
  }

  // ================== 页面类型管理 ==================
  
  /**
   * 设置当前页面类型
   * @param {'cluster' | 'clusterread' | 'standalone'} pageType - 页面类型
   */
  function setCurrentPageType(pageType) {
    if (!['cluster', 'clusterread', 'standalone'].includes(pageType)) {
      console.warn('[clusterStore] setCurrentPageType: invalid pageType', pageType)
      return
    }
    currentPageType.value = pageType
    console.log('[clusterStore] setCurrentPageType:', pageType)
  }

  // ================== 工具方法 ==================
  
  /**
   * 获取簇的显示名称
   * @param {string} clusterKey - 簇键值
   * @returns {string} 显示名称
   */
  function getClusterDisplayName(clusterKey) {
    const option = availableClusters.value.find(opt => opt.value === clusterKey)
    return option ? option.label : clusterKey
  }

  /**
   * 验证簇键值格式是否正确
   * @param {string} clusterKey - 簇键值
   * @returns {boolean} 是否有效
   */
  function isValidClusterKey(clusterKey) {
    if (!clusterKey || typeof clusterKey !== 'string') {
      return false
    }
    
    const parts = clusterKey.split('-')
    if (parts.length !== 2) {
      return false
    }
    
    const blockNum = parseInt(parts[0])
    const clusterNum = parseInt(parts[1])
    
    return !isNaN(blockNum) && !isNaN(clusterNum) && blockNum > 0 && clusterNum > 0
  }

  // ================== 系统配置驱动初始化 ==================
  
  /**
   * 根据系统配置参数初始化堆簇结构
   * @param {Object} config - 配置参数 {BlockCount, ClusterCount1, ClusterCount2}
   */
  function initializeFromSystemConfig(config) {
    const { BlockCount, ClusterCount1, ClusterCount2 } = config
    
    // 验证配置参数
    if (!BlockCount || BlockCount < 1) {
      console.warn('[clusterStore] 无效的堆数配置:', BlockCount)
      clearClusterOptions()
      return
    }
    
    // 清空现有选项
    clearClusterOptions()
    
    // 根据配置生成簇选项
    const newOptions = []
    
    // 第一堆的簇
    if (BlockCount >= 1 && ClusterCount1 > 0) {
      for (let cluster = 1; cluster <= ClusterCount1; cluster++) {
        newOptions.push({
          label: `堆1/簇${cluster}`,
          value: `1-${cluster}`,
          block: 1,
          cluster: cluster
        })
      }
    }
    
    // 第二堆的簇（如果存在）
    if (BlockCount >= 2 && ClusterCount2 > 0) {
      for (let cluster = 1; cluster <= ClusterCount2; cluster++) {
        newOptions.push({
          label: `堆2/簇${cluster}`,
          value: `2-${cluster}`,
          block: 2,
          cluster: cluster
        })
      }
    }
    
    // 排序并设置选项
    newOptions.sort((a, b) => {
      if (a.block !== b.block) {
        return a.block - b.block
      }
      return a.cluster - b.cluster
    })
    
    availableClusters.value = newOptions
    console.log('🔧 [簇配置] 生成选项:', newOptions.map(o => o.value))
    
    // 触发自动选择最佳簇
    if (newOptions.length > 0) {
      scheduleAutoSelect()
    }
  }

  // ================== 返回接口 ==================
  
  return {
    // ========== 原有状态（保持不变） ==========
    availableClusters,
    selectedClusterForView,
    selectedClustersForWrite,
    currentPageType,
    
    // ========== 原有计算属性（保持不变） ==========
    showClusterSelector,
    showWriteSelector,
    isAllSelected,
    // selectAllButtonText,
    
    // ========== 原有方法（保持不变） ==========
    ensureClusterOption,
    replaceClusterOptions,
    clearClusterOptions,
    setSelectedClusterForView,
    setSelectedClustersForWrite,
    toggleSelectAll,
    addClusterForWrite,
    removeClusterFromWrite,
    setCurrentPageType,
    getClusterDisplayName,
    isValidClusterKey,
    
    // ========== 新增：系统配置驱动初始化 ==========
    initializeFromSystemConfig,
    
    // ========== 新增：故障筛选状态 ==========
    availableBlocks,
    availableFaultClusters,
    faultFilterMode,
    selectedBlocksForFault,
    selectedClustersForFault,
    
    // ========== 新增：故障筛选计算属性 ==========
    // faultFilterStatusText,
    isAllBlocksSelectedForFault,
    isAllClustersSelectedForFault,
    
    // ========== 新增：故障筛选方法 ==========
    updateFaultOptions,
    setFaultFilterMode,
    setSelectedBlocksForFault,
    setSelectedClustersForFault,
    toggleSelectAllBlocksForFault,
    toggleSelectAllClustersForFault,
    filterFaultData
  }
}) 

/*
================== 堆数据功能使用说明 ==================

当需要添加堆数据功能时，可以参考以下代码模式：

1. 在状态部分添加堆相关状态：
   // 堆数据查看状态
   const selectedBlockForView = ref(null)        // 当前查看的堆
   const availableBlocksForView = ref([])        // 可选的堆列表

2. 添加对应的计算属性：
   // 是否显示堆选择器
   const showBlockSelector = computed(() => {
     return currentPageType.value === 'block' // 堆级页面
   })

3. 添加堆管理方法：
   function setSelectedBlockForView(blockNumber) {
     selectedBlockForView.value = blockNumber
   }
   
   function updateBlockOptions(blockData) {
     // 解析堆数据，更新 availableBlocksForView
   }

4. 在返回接口中导出：
   return {
     // ... 现有接口
     selectedBlockForView,
     availableBlocksForView,
     showBlockSelector,
     setSelectedBlockForView,
     updateBlockOptions
   }

使用示例：
// 在堆数据页面中
const clusterStore = useClusterStore()
clusterStore.updateBlockOptions(blockDataArray)
clusterStore.setSelectedBlockForView(1) // 选择堆1

注意事项：
- 堆数据不分簇，所以不需要考虑簇级筛选
- 堆告警功能已在故障筛选中预留，但暂时注释掉
- 保持与现有簇功能的一致性和兼容性
*/ 