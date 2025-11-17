// composables/parseClusterSummary.ts
import { markRaw, shallowRef, watch } from 'vue'
import {
  ensureClusterOption,
  selectedCluster,
} from '../../device-selection/useClusterSelect'

/* ========== 数据存储层 ========== */
// 原始数据存储（非响应式，性能最优）
const rawClusterData = markRaw(
  new Map<string, Map<string, any[]>>()
)

/* ========== 响应式更新层 ========== */
// 更新触发器
export const clusterSummaryTick = shallowRef(0)

// 响应式数据存储
export const clusterFrames = shallowRef(
  new Map<string, Map<string, any[]>>()
)

/* ========== 监听更新 ========== */
watch(
  clusterSummaryTick,
  () => {
    // 从原始数据复制到响应式存储
    const newFrames = new Map<string, Map<string, any[]>>()
    for (const [key, innerMap] of rawClusterData.entries()) {
      newFrames.set(key, new Map(innerMap))
    }
    clusterFrames.value = newFrames
  },
  { immediate: true }
)

/* ========== 解析函数 ========== */
export function parseClusterSummary(msg: any) {
  const key = `${msg.blockId}-${msg.clusterId}`

  if (!rawClusterData.has(key))
    rawClusterData.set(key, new Map<string, any[]>())

  const m = rawClusterData.get(key)!
  msg.data.forEach((sec: any) => m.set(sec.class, sec.element))

  // 触发响应式更新
  clusterSummaryTick.value++

  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureClusterOption(key)
  // 【已禁用】自动选择机制，改用智能选择逻辑
  // if (!selectedCluster.value) selectedCluster.value = key
}

/** 页面侧取数  */
export function pickCluster(key: string, classes: string[]) {
  // 建立依赖关系
  clusterSummaryTick.value
  
  const m = clusterFrames.value.get(key)
  if (!m) return []

  
  const list = Array.from(m.entries()) as [string, any[]][]  
  return list
    .filter(([cls]) => classes.includes(cls))
    .map(([cls, element]) => ({ class: cls, element }))
}
