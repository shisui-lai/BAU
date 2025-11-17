// composables/parsePackSummary.ts
import { markRaw, shallowRef, watch } from 'vue'
import {
  ensureClusterOption,
  selectedCluster,
} from '../../device-selection/useClusterSelect'

/* ========== 数据存储层 ========== */
// 原始数据存储（非响应式，性能最优）
const rawPackData = markRaw(
  new Map<string, Map<string, any[]>>()
)

/* ========== 响应式更新层 ========== */
// 更新触发器
export const packSummaryTick = shallowRef(0)

// 响应式数据存储
export const packFrames = shallowRef(
  new Map<string, Map<string, any[]>>()
)

/* ========== 监听更新 ========== */
watch(
  packSummaryTick,
  () => {
    // 从原始数据复制到响应式存储
    const newFrames = new Map<string, Map<string, any[]>>()
    for (const [key, innerMap] of rawPackData.entries()) {
      newFrames.set(key, new Map(innerMap))
    }
    packFrames.value = newFrames
  },
  { immediate: true }
)

/* ========== 解析函数 ========== */
export function parsePackSummary(msg: any) {
  const key = `${msg.blockId}-${msg.clusterId}`
  
  if (!rawPackData.has(key))
    rawPackData.set(key, new Map<string, any[]>())

  const m = rawPackData.get(key)!
  msg.data.forEach((sec: any) => m.set(sec.class, sec.element))

  // 触发响应式更新
  packSummaryTick.value++

  /* 维护堆簇下拉 */
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureClusterOption(key)
  // 【已禁用】自动选择机制，改用智能选择逻辑
  // if (!selectedCluster.value) selectedCluster.value = key
}

/** ---- 页面取数保持原接口 ---- */
export const pickPack = (key: string, classes: string[]) => {
  // 建立依赖关系
  packSummaryTick.value
  
  return Array.from(packFrames.value.get(key)?.entries() || [])
    .filter(([cls]) => classes.includes(cls))
    .map(([cls, element]) => ({ class: cls, element }))
}
