// composables/parsePackSummary.ts
import { ref } from 'vue'
import {
  ensureClusterOption,
  selectedCluster,
} from '../../device-selection/useClusterSelect'

/* ========== 简化的响应式存储 ========== */
// 使用简单的响应式对象存储，类似SystemAbstract的模式
// 数据结构: { [key: string]: { [class: string]: any[] } }
const packCache = ref<Record<string, Record<string, any[]>>>({})

/* ========== 解析函数 ========== */
export function parsePackSummary(msg: any) {
  const key = `${msg.blockId}-${msg.clusterId}`

  // 直接覆盖更新，创建新的对象引用（类似SystemAbstract模式）
  const newData: Record<string, any[]> = {}

  msg.data.forEach((sec: any) => {
    // 创建新的数组引用，确保响应式更新
    newData[sec.class] = [...sec.element]
  })

  // 直接赋值，触发响应式更新
  packCache.value[key] = newData

  /* 维护堆簇下拉 */
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureClusterOption(key)
  // 【已禁用】自动选择机制，改用智能选择逻辑
  // if (!selectedCluster.value) selectedCluster.value = key
}

/** 页面侧取数  */
export const pickPack = (key: string, classes: string[]) => {
  // 从简化的缓存中获取数据
  const packData = packCache.value[key]
  if (!packData) return []

  // 过滤并返回指定类别的数据
  return Object.entries(packData)
    .filter(([cls]) => classes.includes(cls))
    .map(([cls, element]) => ({ class: cls, element }))
}

/* ========== 兼容性导出 ========== */
// 为了保持向后兼容，提供Map结构的兼容性接口
import { computed } from 'vue'

// 将普通对象转换为Map结构，保持API兼容性
export const packFrames = computed(() => {
  const mapResult = new Map<string, Map<string, any[]>>()

  for (const [key, packData] of Object.entries(packCache.value)) {
    const innerMap = new Map<string, any[]>()
    for (const [cls, element] of Object.entries(packData)) {
      innerMap.set(cls, element)
    }
    mapResult.set(key, innerMap)
  }

  return mapResult
})

// 兼容性导出，但不再使用
export const packSummaryTick = ref(0)
