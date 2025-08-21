// composables/parseIoStatus.ts
import { reactive } from 'vue'
import {
  ensureClusterOption,
  selectedCluster,
} from '../../device-selection/useClusterSelect'

/* ---------- 类型声明 ---------- */
export interface IoElement {                    
  label: string
  value: unknown
}
export type IoSection = {                       
  class: string
  element: IoElement[]
}
export interface IoMsg {                        
  dataType: 'IO_STATUS'
  blockId: number
  clusterId: number
  data: IoSection[]
  tRecv: number
  tParsed: number
}

/* ---------- 全局缓存 Map ---------- */
export const ioFrames = reactive(
  new Map<string, Map<string, IoElement[]>>()   
)

export function parseIoStatus(msg: IoMsg) {     // 
  const key = `${msg.blockId}-${msg.clusterId}`

  if (!ioFrames.has(key))
    ioFrames.set(key, reactive(new Map<string, IoElement[]>()))

  /* 只保留包含 "反馈" 字样的条目 */
  const m = ioFrames.get(key)!
  msg.data.forEach(sec => {
    m.set(
      sec.class,
      sec.element.filter(it => it.label.includes('反馈'))
    )
  })

  /* 下拉簇同步 */
  // 【已禁用】动态发现机制，改用配置驱动方式  
  // ensureClusterOption(key)
  if (!selectedCluster.value) selectedCluster.value = key
}

export function pickIo(
  key: string,
  classes: string[] = []          // 默认空数组
): { class: string; element: IoElement[] }[] {

  const m = ioFrames.get(key)
  if (!m) return []

  // list 一定是 [cls , ele[]]
  const list = Array.from(m.entries()) as [string, IoElement[]][]

  /* ▲ 没传 classes ⇒ 返回全部  */
  if (classes.length === 0) {
    return list.map(([cls, element]) => ({ class: cls, element }))
  }

  /* ▲ 传了 classes ⇒ 按需过滤 */
  return list
    .filter(([cls]) => classes.includes(cls))
    .map(([cls, element]) => ({ class: cls, element }))
}
