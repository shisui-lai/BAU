// composables/parseBrokenwire.ts  

import { reactive } from 'vue'
import {
  ensureClusterOption,
  selectedCluster,
} from '../../device-selection/useClusterSelect'


export const brokenwireFrames = reactive(
  new Map<string, Map<string, any[]>>()  // key = "1-1" , val = Map<class , element[]>
)

// ------------------- 解析入口 ----------------
export function parseBrokenwire (msg: any) {
  const key = `${msg.blockId}-${msg.clusterId}`

  if (!brokenwireFrames.has(key))
    brokenwireFrames.set(key, reactive(new Map<string, any[]>()))

  const m = brokenwireFrames.get(key)!     

  // 写入：同一个 Map 引用，保持响应式
  msg.data.forEach((sec: any) => m.set(sec.class, sec.element))

  // 更新下拉
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureClusterOption(key)
  if (!selectedCluster.value) selectedCluster.value = key
}

// ④ ------------------- 页面取数接口 --------------
export const pickBrokenwire = (key: string, classes: string[]) =>
  // *** 给 Array.from 明确断言 -> [string, any[]] ***
  (Array.from(brokenwireFrames.get(key)?.entries() || []) as [string, any[]][])
    .filter(([cls]) => classes.includes(cls))
    .map(([cls, element]) => ({ class: cls, element }))
