// 簇选择composable - 兼容原有API，内部使用全局clusterStore
import { computed } from 'vue'
import { useClusterStore } from '@/stores/device/clusterStore'

/**
 * 簇选择composable 
 * 内部使用全局clusterStore，但保持原有API不变
 * 这样可以确保现有代码无需修改即可使用新的全局状态管理
 */
export function useClusterSelect() {
  const clusterStore = useClusterStore()
  
  // 提供原有的响应式引用
  const clusterOptions = computed(() => clusterStore.availableClusters)
  const selectedCluster = computed({
    get: () => clusterStore.selectedClusterForView,
    set: (value) => clusterStore.setSelectedClusterForView(value)
  })
  
  return {
    clusterOptions,
    selectedCluster,
    ensureClusterOption: clusterStore.ensureClusterOption,
    replaceClusterOptions: clusterStore.replaceClusterOptions,
  }
}

// 保持原有的导出方式
export const clusterOptions = computed(() => {
  const clusterStore = useClusterStore()
  return clusterStore.availableClusters
})

export const selectedCluster = computed({
  get: () => {
    const clusterStore = useClusterStore()
    return clusterStore.selectedClusterForView
  },
  set: (value) => {
    const clusterStore = useClusterStore()
    clusterStore.setSelectedClusterForView(value)
  }
})

export function ensureClusterOption(key) {
  const clusterStore = useClusterStore()
  clusterStore.ensureClusterOption(key)
}

export function replaceClusterOptions(opts) {
  const clusterStore = useClusterStore()
  clusterStore.replaceClusterOptions(opts)
} 
