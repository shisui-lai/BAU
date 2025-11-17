// composables/parseBlockSummary.ts
import { markRaw, shallowRef, watch } from 'vue'
import { ensureBlockOption } from '../../device-selection/useBlockSelect'
import { BLOCK_SUMMARY } from '../../../../../../main/table.js'

/* ========== 数据存储层 ========== */
// 原始数据存储（非响应式，性能最优）
const rawBlockSummaryData = markRaw(
  new Map<string, Map<string, any[]>>()
)

/* ========== 响应式更新层 ========== */
// 更新触发器
export const blockSummaryTick = shallowRef(0)

// 响应式数据存储
export const blockSummaryFrames = shallowRef(
  new Map<string, Map<string, any[]>>()
)

/* ========== 监听更新 ========== */
watch(
  blockSummaryTick,
  () => {
    // 从原始数据复制到响应式存储
    const newFrames = new Map<string, Map<string, any[]>>()
    for (const [key, innerMap] of rawBlockSummaryData.entries()) {
      newFrames.set(key, new Map(innerMap))
    }
    blockSummaryFrames.value = newFrames
  },
  { immediate: true }
)

/* ========== 解析函数 ========== */
export function parseBlockSummary(msg: any) {
  const key = `block${msg.blockId}` // 堆数据只按堆号标识，如 "block1", "block2"
  
  // console.log('[parseBlockSummary] 收到堆数据:', {
  //   blockId: msg.blockId,
  //   key: key,
  //   dataKeys: Object.keys(msg.data || {})
  // })

  if (!rawBlockSummaryData.has(key))
    rawBlockSummaryData.set(key, new Map<string, any[]>())

  const m = rawBlockSummaryData.get(key)!
  
  // 处理主进程发送的数据结构
  // msg.data 是一个对象，包含解析后的字段
  if (msg.data && typeof msg.data === 'object') {
    // 将对象转换为按类别分组的数据
    const groupedData = groupBlockDataByClass(msg.data)
    
    // 存储到缓存中
    Object.entries(groupedData).forEach(([className, elements]) => {
      m.set(className, elements)
    })
  }

  // 触发响应式更新
  blockSummaryTick.value++

  // 维护堆选项
  // console.log('[parseBlockSummary] 调用ensureBlockOption:', key)
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureBlockOption(key)
}

/** 将堆数据按类别分组 */
function groupBlockDataByClass(data: any): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}

  // 根据字段名将数据分配到不同类别
  Object.entries(data).forEach(([key, value]) => {
    // 从BLOCK_SUMMARY表中查找对应的字段定义
    const fieldDef = BLOCK_SUMMARY.find(item => item.key === key)
    
    if (fieldDef) {
      const className = fieldDef.class
      
      // 确保类别存在
      if (!grouped[className]) {
        grouped[className] = []
      }
      
      const item = {
        key: key,
        label: fieldDef.label,
        value: value,
        unit: fieldDef.unit || '',
        remark: fieldDef.remarks || '',
        scale: fieldDef.scale || 1
      }
      
      grouped[className].push(item)
    }
  })

  return grouped
}

/** 获取字段的scale信息 */
function getFieldScale(key: string): number {
  const field = BLOCK_SUMMARY.find(item => item.key === key)
  return field?.scale || 1
}

/** 获取字段显示名称 */
function getFieldLabel(key: string): string {
  const field = BLOCK_SUMMARY.find(item => item.key === key)
  return field?.label || key
}

/** 获取字段单位 */
function getFieldUnit(key: string): string {
  const field = BLOCK_SUMMARY.find(item => item.key === key)
  return field?.unit || ''
}

/** 获取字段备注 */
function getFieldRemark(key: string): string {
  const field = BLOCK_SUMMARY.find(item => item.key === key)
  return field?.remarks || ''
}

/** 页面侧取数 —— 与旧接口保持一致 */
export function pickBlockSummary(key: string, classes: string[]) {
  // 建立依赖关系
  blockSummaryTick.value
  
  const m = blockSummaryFrames.value.get(key)
  if (!m) return []

  const list = Array.from(m.entries()) as [string, any[]][]
  return list
    .filter(([cls]) => classes.includes(cls))
    .map(([cls, element]) => ({ class: cls, element }))
}

/** 获取堆的在线状态 */
export function getBlockStatus(blockId: number): boolean {
  const key = `block${blockId}`
  const m = blockSummaryFrames.value.get(key)
  if (!m) return false
  
  // 检查是否有基本数据来判断堆是否在线
  return m.has('堆基本信息') || m.has('状态信息')
}
