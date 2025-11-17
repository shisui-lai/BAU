// composables/parseBrokenwire.ts  
import { markRaw, shallowRef, watch } from 'vue'
import {
  ensureClusterOption,
  selectedCluster,
} from '../../device-selection/useClusterSelect'

/* ========== 数据存储层 ========== */
// 原始数据存储（非响应式，性能最优）
const rawBrokenwireData = markRaw(
  new Map<string, Map<string, any[]>>()
)

/* ========== 响应式更新层 ========== */
// 更新触发器
export const brokenwireTick = shallowRef(0)

// 响应式数据存储
export const brokenwireFrames = shallowRef(
  new Map<string, Map<string, any[]>>()
)

/* ========== 监听更新 ========== */
watch(
  brokenwireTick,
  () => {
    // 从原始数据复制到响应式存储
    const newFrames = new Map<string, Map<string, any[]>>()
    for (const [key, innerMap] of rawBrokenwireData.entries()) {
      newFrames.set(key, new Map(innerMap))
    }
    brokenwireFrames.value = newFrames
  },
  { immediate: true }
)

/* ========== 解析函数 ========== */
export function parseBrokenwire(msg: any) {
  const key = `${msg.blockId}-${msg.clusterId}`

  if (!rawBrokenwireData.has(key))
    rawBrokenwireData.set(key, new Map<string, any[]>())

  const m = rawBrokenwireData.get(key)!
  msg.data.forEach((sec: any) => m.set(sec.class, sec.element))

  // 触发响应式更新
  brokenwireTick.value++

  // 更新下拉
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureClusterOption(key)
  // 【已禁用】自动选择机制，改用智能选择逻辑
  // if (!selectedCluster.value) selectedCluster.value = key
}

// ④ ------------------- 页面取数接口 --------------
export const pickBrokenwire = (key: string, classes: string[]) => {
  // 建立依赖关系
  brokenwireTick.value
  
  return (Array.from(brokenwireFrames.value.get(key)?.entries() || []) as [string, any[]][])
    .filter(([cls]) => classes.includes(cls))
    .map(([cls, element]) => ({ class: cls, element }))
}
