// composables/parseBlockVersion.ts
import { markRaw, shallowRef, watch } from 'vue'
import { ensureBlockOption } from '../../device-selection/useBlockSelect'
import { BLOCK_VERSION } from '../../../../../../main/table.js'

/* ========== 数据存储层 ========== */
// 原始数据存储（非响应式，性能最优）
const rawBlockVersionData = markRaw(
  new Map<string, Map<string, any[]>>()
)

/* ========== 响应式更新层 ========== */
// 更新触发器
export const blockVersionTick = shallowRef(0)

// 响应式数据存储
export const blockVersionFrames = shallowRef(
  new Map<string, Map<string, any[]>>()
)

/* ========== 监听更新 ========== */
watch(
  blockVersionTick,
  () => {
    // 从原始数据复制到响应式存储
    const newFrames = new Map<string, Map<string, any[]>>()
    for (const [key, innerMap] of rawBlockVersionData.entries()) {
      newFrames.set(key, new Map(innerMap))
    }
    blockVersionFrames.value = newFrames
  },
  { immediate: true }
)

export function parseBlockVersion(msg: any) {
  const { blockId, data } = msg
  if (!data) return

  // 将数字blockId转换为字符串格式 'block1'
  const blockKey = `block${blockId}`
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureBlockOption(blockKey)

  const groupedData = groupBlockVersionByClass(data)
  const dataMap = new Map<string, any[]>()
  Object.entries(groupedData).forEach(([key, value]) => {
    dataMap.set(key, value)
  })

  // 存储到原始数据存储
  rawBlockVersionData.set(blockKey, dataMap)

  // 触发响应式更新
  blockVersionTick.value++
}

function groupBlockVersionByClass(data: any): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}
  
  for (const [key, value] of Object.entries(data)) {
    const fieldDef = BLOCK_VERSION.find(field => field.key === key)
    if (!fieldDef) continue
    
    // 过滤预留字段
    const keyLower = (fieldDef.key || '').toLowerCase()
    const labelLower = (fieldDef.label || '').toLowerCase()
    
    if (keyLower.includes('_reserve') ||
        keyLower.includes('reserve') ||
        keyLower.includes('skip') ||
        labelLower.includes('预留') ||
        labelLower.includes('保留') ||
        labelLower.includes('跳过')) {
      continue
    }
    
    const classKey = fieldDef.class
    if (!grouped[classKey]) {
      grouped[classKey] = []
    }
    
    grouped[classKey].push({
      key,
      label: fieldDef.label,
      value,
      unit: fieldDef.unit || '',
      remark: fieldDef.remarks || '',
      scale: fieldDef.scale || 1
    })
  }
  
  return grouped
}

export function getFieldScale(key: string): number {
  const fieldDef = BLOCK_VERSION.find(field => field.key === key)
  return fieldDef?.scale || 1
}

export function getFieldLabel(key: string): string {
  const fieldDef = BLOCK_VERSION.find(field => field.key === key)
  return fieldDef?.label || key
}

export function getFieldUnit(key: string): string {
  const fieldDef = BLOCK_VERSION.find(field => field.key === key)
  return fieldDef?.unit || ''
}

export function getFieldRemark(key: string): string {
  const fieldDef = BLOCK_VERSION.find(field => field.key === key)
  return fieldDef?.remarks || ''
}

export function pickBlockVersion(key: string, classes: string[]) {
  // 建立依赖关系
  blockVersionTick.value

  const frame = blockVersionFrames.value.get(key)
  if (!frame) return {}

  const result: Record<string, any[]> = {}
  for (const className of classes) {
    const classData = frame.get(className)
    if (classData) {
      result[className] = classData
    }
  }
  return result
}

export function getBlockVersionStatus(blockId: number): boolean {
  // 建立依赖关系
  blockVersionTick.value

  const blockKey = `block${blockId}`
  return blockVersionFrames.value.has(blockKey)
}
