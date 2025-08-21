// composables/parseClusterSummary.ts
import { reactive } from 'vue'
import {
  ensureClusterOption,
  selectedCluster,
} from '../../device-selection/useClusterSelect'

export const clusterFrames = reactive(
  new Map<string, Map<string, any[]>>()
)

export function parseClusterSummary(msg: any) {
  const key = `${msg.blockId}-${msg.clusterId}`

  if (!clusterFrames.has(key))
    clusterFrames.set(key, reactive(new Map<string, any[]>()))

  const m = clusterFrames.get(key)!
  msg.data.forEach((sec: any) => m.set(sec.class, sec.element))

  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureClusterOption(key)
  if (!selectedCluster.value) selectedCluster.value = key
}

/** 页面侧取数  */
export function pickCluster(key: string, classes: string[]) {
  const m = clusterFrames.get(key)
  if (!m) return []

  
  const list = Array.from(m.entries()) as [string, any[]][]  
  return list
    .filter(([cls]) => classes.includes(cls))
    .map(([cls, element]) => ({ class: cls, element }))
}
