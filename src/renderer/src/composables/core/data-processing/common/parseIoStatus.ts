// composables/parseIoStatus.ts
import { markRaw, shallowRef, watch } from 'vue'
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

/* ========== 数据存储层 ========== */
// 原始数据存储（非响应式，性能最优）
const rawIoData = markRaw(
  new Map<string, Map<string, IoElement[]>>()
)

/* ========== 响应式更新层 ========== */
// 更新触发器
export const ioStatusTick = shallowRef(0)

// 响应式数据存储
export const ioFrames = shallowRef(
  new Map<string, Map<string, IoElement[]>>()
)

/* ========== 监听更新 ========== */
watch(
  ioStatusTick,
  () => {
    // 从原始数据复制到响应式存储
    const newFrames = new Map<string, Map<string, IoElement[]>>()
    for (const [key, innerMap] of rawIoData.entries()) {
      newFrames.set(key, new Map(innerMap))
    }
    ioFrames.value = newFrames
  },
  { immediate: true }
)

/* ========== 解析函数 ========== */
export function parseIoStatus(msg: IoMsg) {
  const key = `${msg.blockId}-${msg.clusterId}`

  if (!rawIoData.has(key))
    rawIoData.set(key, new Map<string, IoElement[]>())

  /* 只保留包含 "反馈" 字样的条目 */
  const m = rawIoData.get(key)!
  msg.data.forEach(sec => {
    m.set(
      sec.class,
      sec.element.filter(it => it.label.includes('反馈'))
    )
  })

  // 触发响应式更新
  ioStatusTick.value++

  /* 下拉簇同步 */
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureClusterOption(key)
  // 【已禁用】自动选择机制，改用智能选择逻辑
  // if (!selectedCluster.value) selectedCluster.value = key
}

export function pickIo(
  key: string,
  classes: string[] = []          // 默认空数组
): { class: string; element: IoElement[] }[] {
  // 建立依赖关系
  ioStatusTick.value

  const m = ioFrames.value.get(key)
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
