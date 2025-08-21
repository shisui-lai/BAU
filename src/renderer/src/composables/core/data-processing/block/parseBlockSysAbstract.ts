// composables/parseBlockSysAbstract.ts
import { reactive } from 'vue'
import { ensureBlockOption } from '../../device-selection/useBlockSelect'
import { BLOCK_SYS_ABSTRACT } from '../../../../../../main/table.js'

export const blockSysAbstractFrames = reactive(new Map<string, Map<string, any[]>>())

export function parseBlockSysAbstract(msg: any) {
  const { blockId, data } = msg
  if (!data) {
    return
  }

  // 将数字blockId转换为字符串格式 'block1'
  const blockKey = `block${blockId}`
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureBlockOption(blockKey)
  
  const groupedData = groupBlockSysAbstractByClass(data)
  const dataMap = new Map<string, any[]>()
  Object.entries(groupedData).forEach(([key, value]) => {
    dataMap.set(key, value)
  })
  // 使用blockKey作为存储键，确保与pickBlockSysAbstract调用时的格式一致
  blockSysAbstractFrames.set(blockKey, dataMap)
}

function groupBlockSysAbstractByClass(data: any): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}
  
  for (const [key, value] of Object.entries(data)) {
    const fieldDef = BLOCK_SYS_ABSTRACT.find(field => field.key === key)
    if (!fieldDef) continue
    
    // 过滤预留字段（只过滤显示，不忽略数据位置）
    const keyLower = (fieldDef.key || '').toLowerCase()
    const labelLower = (fieldDef.label || '').toLowerCase()
    
    const isReserved = keyLower.includes('_reserve') ||
                      keyLower.includes('reserve') ||
                      keyLower.includes('skip') ||
                      labelLower.includes('预留') ||
                      labelLower.includes('保留') ||
                      labelLower.includes('跳过')
    
    const classKey = fieldDef.class
    if (!classKey) continue // 如果class为undefined，跳过这个字段
    
    if (!grouped[classKey]) {
      grouped[classKey] = []
    }
    
    // 对于预留字段，仍然添加到数据结构中，但标记为隐藏
    grouped[classKey].push({
      key,
      label: fieldDef.label,
      value,
      unit: fieldDef.unit || '',
      remark: fieldDef.remarks || '',
      scale: fieldDef.scale || 1,
      hidden: isReserved // 标记预留字段为隐藏
    })
  }
  
  return grouped
}

export function getFieldScale(key: string): number {
  const fieldDef = BLOCK_SYS_ABSTRACT.find(field => field.key === key)
  return fieldDef?.scale || 1
}

export function getFieldLabel(key: string): string {
  const fieldDef = BLOCK_SYS_ABSTRACT.find(field => field.key === key)
  return fieldDef?.label || key
}

export function getFieldUnit(key: string): string {
  const fieldDef = BLOCK_SYS_ABSTRACT.find(field => field.key === key)
  return fieldDef?.unit || ''
}

export function getFieldRemark(key: string): string {
  const fieldDef = BLOCK_SYS_ABSTRACT.find(field => field.key === key)
  return fieldDef?.remarks || ''
}

export function pickBlockSysAbstract(key: string, classes: string[]) {
  const frame = blockSysAbstractFrames.get(key)
  
  if (!frame) {
    return {}
  }
  
  const result: Record<string, any[]> = {}
  for (const className of classes) {
    const classData = frame.get(className)
    if (classData) {
      result[className] = classData
    }
  }
  
  return result
}

export function getBlockSysAbstractStatus(blockId: number): boolean {
  const blockKey = `block${blockId}`
  return blockSysAbstractFrames.has(blockKey)
} 
