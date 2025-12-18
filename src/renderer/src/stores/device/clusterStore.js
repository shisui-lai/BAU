// 全局簇选择状态管理 - 统一管理所有页面的簇选择状态
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

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
    return currentPageType.value === 'cluster' || currentPageType.value === 'clusterread'
  })

  // 是否显示下发多选框
  const showWriteSelector = computed(() => {
    return currentPageType.value === 'cluster' // 只有簇级遥调页面才需要下发功能
  })

  // 是否全选状态
  const isAllSelected = computed(() => {
    return (
      availableClusters.value.length > 0 &&
      selectedClustersForWrite.value.length === availableClusters.value.length
    )
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
    return (
      availableBlocks.value.length > 0 &&
      selectedBlocksForFault.value.length === availableBlocks.value.length
    )
  })

  // 故障筛选 - 簇全选状态
  const isAllClustersSelectedForFault = computed(() => {
    return (
      availableFaultClusters.value.length > 0 &&
      selectedClustersForFault.value.length === availableFaultClusters.value.length
    )
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
    const exists = availableClusters.value.some((option) => option.value === clusterKey)
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

    const validOptions = newOptions.filter((option) => {
      const isValid = option && typeof option.value === 'string' && isValidClusterKey(option.value)

      if (!isValid) {
        console.warn('[clusterStore] replaceClusterOptions: invalid option', option)
      }

      return isValid
    })

    // 为每个选项添加解析后的block和cluster信息
    const enrichedOptions = validOptions.map((option) => {
      const parts = option.value.split('-')
      const block = parseInt(parts[0])
      const cluster = parseInt(parts[1])
      return {
        ...option,
        block: block,
        cluster: cluster
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
    const oldSelected = selectedClusterForView.value
    availableClusters.value = []
    selectedClusterForView.value = null
    selectedClustersForWrite.value = []
    // console.log('🧹 [簇清理] 清空所有选项，之前选中:', oldSelected)
  }

  // ================== 自动选择逻辑 ==================

  let autoSelectTimer = null

  /**
   * 智能选择最佳堆簇
   * @param {Array} clusters - 可用的堆簇列表
   * @returns {string} 最佳堆簇键值
   */
  function findBestCluster(clusters) {
    if (!clusters || clusters.length === 0) {
      return null
    }

    // 提取所有键值
    const clusterKeys = clusters.map((c) => c.value || c)

    // 优先级1：查找 1-1
    if (clusterKeys.includes('1-1')) {
      return '1-1'
    }

    // 优先级2：查找 1-x（堆1的其他簇）
    const block1Clusters = clusterKeys.filter((key) => key.startsWith('1-')).sort()
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

    // 50ms后进行智能选择（减少延时）
    autoSelectTimer = setTimeout(() => {
      if (!selectedClusterForView.value && availableClusters.value.length > 0) {
        const bestCluster = findBestCluster(availableClusters.value)
        if (bestCluster) {
          selectedClusterForView.value = bestCluster
        } else {
        }
      } else {
        if (selectedClusterForView.value) {
        }
        if (availableClusters.value.length === 0) {
        }
      }
      autoSelectTimer = null
    }, 200)
  }

  // ================== 默认下发勾选（自动模式） ==================
  // 需求：在簇级遥调页面，如果未选择下发目标，则默认勾选当前查看簇；
  // 当用户在导航下拉切换当前簇时，若仍处于自动模式（未手动多选），则同步为新簇。

  // 记录“自动模式”下的上一次查看簇，用于判断是否应跟随切换
  let lastAutoViewCluster = null

  function isAutoWriteSelection() {
    const sel = selectedClustersForWrite.value
    return sel.length <= 1 && (sel.length === 0 || sel[0] === lastAutoViewCluster)
  }

  // 页面类型切换到簇级遥调时，初始化默认选择
  watch(currentPageType, (newType) => {
    if (newType === 'cluster') {
      // 若未选查看簇，尝试自动选择 1-1 或最小簇
      if (!selectedClusterForView.value && availableClusters.value.length > 0) {
        scheduleAutoSelect()
      }
      // 默认勾选当前查看簇（仅在未手动选择时）
      if (selectedClusterForView.value && selectedClustersForWrite.value.length === 0) {
        selectedClustersForWrite.value = [selectedClusterForView.value]
        lastAutoViewCluster = selectedClusterForView.value
      }
    }
  })

  // 当当前查看簇变化时，自动模式下同步下发勾选为新簇
  watch(selectedClusterForView, (newVal, oldVal) => {
    if (!newVal) return
    if (currentPageType.value !== 'cluster') return
    if (isAutoWriteSelection()) {
      selectedClustersForWrite.value = [newVal]
      lastAutoViewCluster = newVal
    }
  })

  // ================== 选择管理 ==================

  /**
   * 设置当前查看的簇
   * @param {string|null} clusterKey - 簇键值或null
   */
  function setSelectedClusterForView(clusterKey) {
    const oldValue = selectedClusterForView.value
    selectedClusterForView.value = clusterKey
    console.log('🔄 [簇选择] 设置选中簇:', {
      from: oldValue,
      to: clusterKey,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
        .split('\n')
        .slice(1, 6)
        .map((line) => line.trim())
    })
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
      selectedClustersForWrite.value = availableClusters.value.map((option) => option.value)
    }
    console.log(
      '[clusterStore] toggleSelectAll:',
      selectedClustersForWrite.value.length,
      'selected'
    )
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

    // 调试：检查输入数据
    console.log(`[故障筛选] updateFaultOptions 被调用，故障数量: ${faultData.length}`)
    if (faultData.length > 0) {
      const firstFault = faultData[0]
      console.log(`[故障筛选] 第一个故障的数据结构:`, {
        hasCluster: !!firstFault.cluster,
        clusterType: typeof firstFault.cluster,
        clusterValue: firstFault.cluster,
        clusterString: String(firstFault.cluster)
      })
    }

    const blocks = new Set()
    const clusters = new Map()

    faultData.forEach((fault) => {
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
      .map((block) => ({
        value: block,
        label: `堆${block}` // 添加 label 字段供 MultiSelect 使用
      }))

    // 更新簇选项（故障专用）
    availableFaultClusters.value = Array.from(clusters.values())
      .sort((a, b) => {
        if (a.block !== b.block) return a.block - b.block
        return a.cluster - b.cluster
      })
      .map((item) => ({
        value: `${item.block}-${item.cluster}`,
        label: `堆${item.block}/簇${item.cluster}`, // 添加 label 字段供 MultiSelect 使用
        block: item.block,
        cluster: item.cluster
      }))

    // 调试：检查解析结果
    console.log(`[故障筛选] 解析结果:`, {
      blocksCount: blocks.size,
      clustersCount: clusters.size,
      availableBlocks: availableBlocks.value.length,
      availableFaultClusters: availableFaultClusters.value.length,
      firstCluster: availableFaultClusters.value[0]
    })
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

    // 清理其他模式的选中状态，避免状态残留导致筛选混乱
    if (mode === 'block') {
      selectedClustersForFault.value = [] // 切换到按堆筛选时，清空簇选择
    } else if (mode === 'cluster') {
      selectedBlocksForFault.value = [] // 切换到按簇筛选时，清空堆选择
    } else if (mode === 'all') {
      selectedBlocksForFault.value = [] // 切换到显示全部时，清空所有选择
      selectedClustersForFault.value = []
    }

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
      selectedBlocksForFault.value = availableBlocks.value.map((option) => option.value)
    }
    console.log(
      '[clusterStore] toggleSelectAllBlocksForFault:',
      selectedBlocksForFault.value.length,
      'selected'
    )
  }

  /**
   * 故障筛选 - 簇全选/清空切换
   */
  function toggleSelectAllClustersForFault() {
    if (isAllClustersSelectedForFault.value) {
      selectedClustersForFault.value = []
    } else {
      selectedClustersForFault.value = availableFaultClusters.value.map((option) => option.value)
    }
    console.log(
      '[clusterStore] toggleSelectAllClustersForFault:',
      selectedClustersForFault.value.length,
      'selected'
    )
  }

  // 添加缓存机制
  let filterCache = {
    lastInput: null,
    lastMode: null,
    lastSelectedBlocks: null,
    lastSelectedClusters: null,
    lastResult: null
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

    // 检查缓存
    const currentMode = faultFilterMode.value
    const currentSelectedBlocks = JSON.stringify([...selectedBlocksForFault.value].sort())
    const currentSelectedClusters = JSON.stringify([...selectedClustersForFault.value].sort())
    const inputHash =
      allFaults.length +
      '_' +
      (allFaults[0]?.label || '') +
      '_' +
      (allFaults[allFaults.length - 1]?.label || '')

    if (
      filterCache.lastInput === inputHash &&
      filterCache.lastMode === currentMode &&
      filterCache.lastSelectedBlocks === currentSelectedBlocks &&
      filterCache.lastSelectedClusters === currentSelectedClusters &&
      filterCache.lastResult
    ) {
      // console.log('[性能优化] 使用缓存结果')
      return filterCache.lastResult
    }

    const filtered = allFaults.filter((fault) => {
      if (!fault.cluster) {
        return false
      }

      const clusterStr = String(fault.cluster).trim()

      // 解析故障的堆-簇信息
      let blockNum = null
      let clusterNum = null
      let isClusterFault = false

      if (clusterStr.includes('-')) {
        // 簇故障格式 "1-1", "2-1" 等，堆告警格式 "1-0", "2-0" 等
        const parts = clusterStr.split('-')
        if (parts.length === 2) {
          blockNum = parseInt(parts[0])
          clusterNum = parseInt(parts[1])
          // 簇号为0表示堆告警，不是簇故障
          isClusterFault = clusterNum > 0
        }
      } else {
        // 纯堆告警格式 "1", "2" 等
        blockNum = parseInt(clusterStr)
        clusterNum = null
        isClusterFault = false
      }

      if (isNaN(blockNum)) {
        return false
      }

      if (faultFilterMode.value === 'block') {
        // 按堆筛选：包括堆告警和该堆下的所有簇故障
        if (selectedBlocksForFault.value.length === 0) {
          return true
        }

        // 确保比较的是相同类型（都转为数字）
        const selectedBlocks = selectedBlocksForFault.value.map((b) => {
          if (typeof b === 'number') return b
          const s = String(b)
          return s.startsWith('block') ? parseInt(s.replace('block', '')) : parseInt(s)
        })
        const result = selectedBlocks.includes(blockNum)

        return result
      }

      if (faultFilterMode.value === 'cluster') {
        // 按簇筛选：只包括指定的簇故障（不包括堆告警）
        if (!isClusterFault) {
          return false // 排除堆告警
        }

        if (selectedClustersForFault.value.length === 0) {
          return true // 如果没有选中任何簇，显示所有簇故障
        }

        const selectedClusters = [...selectedClustersForFault.value]
        const isMatch = selectedClusters.includes(clusterStr)

        return isMatch
      }

      return true
    })

    // 性能优化：更新缓存
    filterCache.lastInput = inputHash
    filterCache.lastMode = currentMode
    filterCache.lastSelectedBlocks = currentSelectedBlocks
    filterCache.lastSelectedClusters = currentSelectedClusters
    filterCache.lastResult = filtered

    return filtered
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
    // console.log('[clusterStore] setCurrentPageType:', pageType)
  }

  // ================== 工具方法 ==================

  /**
   * 获取簇的显示名称
   * @param {string} clusterKey - 簇键值
   * @returns {string} 显示名称
   */
  function getClusterDisplayName(clusterKey) {
    const option = availableClusters.value.find((opt) => opt.value === clusterKey)
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

  // 保存上一次的配置，用于检测变化
  let lastSystemConfig = null

  /**
   * 检测系统配置是否发生变化
   * @param {Object} newConfig - 新的配置参数
   * @returns {boolean} 是否发生变化
   */
  function hasSystemConfigChanged(newConfig) {
    if (!lastSystemConfig) {
      return true // 首次配置，认为有变化
    }

    const { BlockCount, ClusterCount1, ClusterCount2 } = newConfig
    const {
      BlockCount: lastBlockCount,
      ClusterCount1: lastClusterCount1,
      ClusterCount2: lastClusterCount2
    } = lastSystemConfig

    return (
      BlockCount !== lastBlockCount ||
      ClusterCount1 !== lastClusterCount1 ||
      ClusterCount2 !== lastClusterCount2
    )
  }

  /**
   * 检查当前选中的簇是否仍然有效
   * @param {Array} newOptions - 新的簇选项列表
   * @returns {boolean} 当前选择是否有效
   */
  function isCurrentSelectionValid(newOptions) {
    if (!selectedClusterForView.value) {
      return false
    }

    return newOptions.some((option) => option.value === selectedClusterForView.value)
  }

  /**
   * 根据系统配置参数初始化堆簇结构
   * @param {Object} config - 配置参数 {BlockCount, ClusterCount1, ClusterCount2}
   */
  function initializeFromSystemConfig(config) {
    const { BlockCount, ClusterCount1, ClusterCount2 } = config

    // 验证配置参数
    if (!BlockCount || BlockCount < 1) {
      console.warn(' [簇配置] 无效的堆数配置:', BlockCount)
      clearClusterOptions()
      lastSystemConfig = null
      return
    }

    // 检测配置是否发生变化
    const configChanged = hasSystemConfigChanged(config)

    if (!configChanged) {
      return
    }

    console.log(
      `🔄 [簇配置] 配置更新: ${BlockCount}堆, 第1堆${ClusterCount1}簇, 第2堆${ClusterCount2}簇`
    )

    // 保存当前配置
    lastSystemConfig = { ...config }

    // 【关键修复】在清空之前先保存旧选项，用于后续比较
    const oldOptions = availableClusters.value.map((o) => o.value)

    // 根据配置生成簇选项
    const newOptions = []

    // 第一堆的簇
    if (BlockCount >= 1 && ClusterCount1 > 0) {
      for (let cluster = 1; cluster <= ClusterCount1; cluster++) {
        newOptions.push({
          value: `1-${cluster}`,
          block: 1,
          cluster: cluster,
          label: `堆1/簇${cluster}`
        })
      }
    }

    // 第二堆的簇（如果存在）
    if (BlockCount >= 2 && ClusterCount2 > 0) {
      for (let cluster = 1; cluster <= ClusterCount2; cluster++) {
        newOptions.push({
          value: `2-${cluster}`,
          block: 2,
          cluster: cluster,
          label: `堆2/簇${cluster}`
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

    // 比较新旧选项内容，只有内容变化时才更新
    const newOptionsValues = newOptions.map((o) => o.value)
    const isSame =
      oldOptions.length === newOptionsValues.length &&
      oldOptions.every((val, idx) => val === newOptionsValues[idx])

    // 只有内容变化时才更新，避免不必要的响应式更新导致闪烁
    if (!isSame) {
      // 清空现有选项（只有在需要更新时才清空）
      clearClusterOptions()

      // 先更新 availableClusters，确保响应式更新
      availableClusters.value = newOptions

      // 清理 selectedClustersForWrite 中的无效簇（在 availableClusters 更新后）
      const validClusterKeys = new Set(newOptions.map((opt) => opt.value))
      const beforeCleanCount = selectedClustersForWrite.value.length
      // 使用数组替换方式确保响应式更新
      const cleanedSelection = selectedClustersForWrite.value.filter((key) =>
        validClusterKeys.has(key)
      )
      selectedClustersForWrite.value = cleanedSelection
      const afterCleanCount = selectedClustersForWrite.value.length

      if (beforeCleanCount !== afterCleanCount) {
        console.log(`🧹 [簇配置] 清理了 ${beforeCleanCount - afterCleanCount} 个无效的批量下发选择`)
      }

      // 检查当前选择是否仍然有效
      const currentSelectionValid = isCurrentSelectionValid(newOptions)

      // 如果当前选择无效，触发重新选择
      if (!currentSelectionValid && newOptions.length > 0) {
        scheduleAutoSelect()
      }
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
