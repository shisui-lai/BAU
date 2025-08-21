// 堆选择composable - 管理堆级数据的选择状态
import { computed } from 'vue'
import { useBlockStore } from '@/stores/device/blockStore'

/**
 * 堆选择composable
 * 管理堆级数据的选择状态，包括堆选项和当前选中的堆
 */
export function useBlockSelect() {
  const blockStore = useBlockStore()
  
  // 为了向后兼容，提供响应式引用
  const blockOptions = computed(() => blockStore.availableBlocks)
  const selectedBlock = computed({
    get: () => blockStore.selectedBlockForView,
    set: (value) => blockStore.setSelectedBlockForView(value)
  })
  
  return {
    blockOptions,
    selectedBlock,
    selectedBlocksForWrite: computed(() => blockStore.selectedBlocksForWrite),
    isAllSelected: computed(() => blockStore.isAllSelected),
    ensureBlockOption: blockStore.ensureBlockOption,
    replaceBlockOptions: blockStore.replaceBlockOptions,
    setSelectedBlocksForWrite: blockStore.setSelectedBlocksForWrite,
    selectAllBlocks: blockStore.selectAllBlocks,
    clearSelectedBlocks: blockStore.clearSelectedBlocks,
  }
}

// 为了向后兼容，保持原有的导出方式
export const blockOptions = computed(() => {
  const blockStore = useBlockStore()
  return blockStore.availableBlocks
})

export const selectedBlock = computed({
  get: () => {
    const blockStore = useBlockStore()
    return blockStore.selectedBlockForView
  },
  set: (value) => {
    const blockStore = useBlockStore()
    blockStore.setSelectedBlockForView(value)
  }
})

export function ensureBlockOption(key) {
  const blockStore = useBlockStore()
  blockStore.ensureBlockOption(key)
}

export function replaceBlockOptions(opts) {
  const blockStore = useBlockStore()
  blockStore.replaceBlockOptions(opts)
} 
