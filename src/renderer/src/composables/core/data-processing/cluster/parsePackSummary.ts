// composables/parsePackSummary.ts
import { reactive } from 'vue'
import {
  ensureClusterOption,
  selectedCluster,
} from '../../device-selection/useClusterSelect'

/** 全局缓存：Map<clusterKey , Map<class , element[]>> */
export const packFrames = reactive(new Map<string, Map<string, any[]>>())


export function parsePackSummary(msg: any) {
  const key = `${msg.blockId}-${msg.clusterId}`
  if (!packFrames.has(key)) packFrames.set(key, reactive(new Map()))
  const m = packFrames.get(key)!

  msg.data.forEach((sec: any) => m.set(sec.class, sec.element))

  /* 维护堆簇下拉 */
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureClusterOption(key)
  if (!selectedCluster.value) selectedCluster.value = key
}

/** ---- 页面取数保持原接口 ---- */
export const pickPack = (key: string, classes: string[]) =>
  Array.from(packFrames.get(key)?.entries() || [])
    .filter(([cls]) => classes.includes(cls))
    .map(([cls, element]) => ({ class: cls, element }))
