// composables/useBlockIO.ts
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { reactive } from 'vue'
import { ensureBlockOption } from '../../device-selection/useBlockSelect'
import { BLOCK_IO_STATUS } from '../../../../../../main/table.js'

export const blockIOFrames = reactive(new Map<string, Map<string, any[]>>())

export function parseBlockIO(msg: any) {
  const { blockId, data } = msg
  if (!data) return

  // console.log('[parseBlockIO] 开始解析堆IO数据:', { blockId, data })

  // 将数字blockId转换为字符串格式 'block1'
  const blockKey = `block${blockId}`
  // 【已禁用】动态发现机制，改用配置驱动方式
  // ensureBlockOption(blockKey)
  
  const groupedData = groupBlockIOByClass(data)
  // console.log('[parseBlockIO] 分组后的数据:', groupedData)
  
  const dataMap = new Map<string, any[]>()
  Object.entries(groupedData).forEach(([key, value]) => {
    dataMap.set(key, value)
  })
  // 使用blockKey作为存储键，确保与pickBlockIO调用时的格式一致
  blockIOFrames.set(blockKey, dataMap)
  // console.log('[parseBlockIO] 数据已存储到blockIOFrames:', blockKey)
}

function groupBlockIOByClass(data: any): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}
  
  // 处理groupByClass返回的数据结构
  if (Array.isArray(data)) {
    // 数据是groupByClass的返回格式
    for (const section of data) {
      const classKey = section.class
      if (!grouped[classKey]) {
        grouped[classKey] = []
      }
      
      for (const element of section.element) {
        // 从BLOCK_IO_STATUS中找到对应的字段定义
        const fieldDef = BLOCK_IO_STATUS.find(field => field.label === element.label)
        if (!fieldDef) continue
        
        // 只过滤预留字段，保留所有其他数据
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
        
        // 过滤掉寄存器状态项（只保留位级解析项）
        if (fieldDef.type === 'bit') {
          grouped[classKey].push({
            key: fieldDef.key,
            label: fieldDef.label,
            value: element.value,
            unit: fieldDef.unit || '',
            remark: fieldDef.remarks || '',
            scale: fieldDef.scale || 1,
            type: fieldDef.type,
            bitsOf: fieldDef.bitsOf,
            bit: fieldDef.bit
          })
        }
      }
    }
  } else {
    // 数据是原始解析格式
    for (const [key, value] of Object.entries(data)) {
      const fieldDef = BLOCK_IO_STATUS.find(field => field.key === key)
      if (!fieldDef) continue
      
      // 只过滤预留字段，保留所有其他数据
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
      
      // 过滤掉寄存器状态项（只保留位级解析项）
      if (fieldDef.type === 'bit') {
        grouped[classKey].push({
          key,
          label: fieldDef.label,
          value,
          unit: fieldDef.unit || '',
          remark: fieldDef.remarks || '',
          scale: fieldDef.scale || 1,
          type: fieldDef.type,
          bitsOf: fieldDef.bitsOf,
          bit: fieldDef.bit
        })
      }
    }
  }
  
  return grouped
}

export function pickBlockIO(key: string, classes: string[]) {
  const frame = blockIOFrames.get(key)
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

export function getBlockIOStatus(blockId: number): boolean {
  const blockKey = `block${blockId}`
  return blockIOFrames.has(blockKey)
}

export function useBlockIO() {
  const blockIOData = ref(null)
  const isLoading = ref(false)

  // 监听MQTT数据
  const handleBlockIOMessage = (event, data) => {
    // console.log('[useBlockIO] 收到BLOCK_IO_STATUS消息:', data)
    parseBlockIO(data)
  }

  // 格式化数据 - 系统DI
  const systemDI = computed(() => {
    const data = pickBlockIO('block1', ['系统DI输入状态'])
    const result = data['系统DI输入状态'] || []
    // console.log('[useBlockIO] systemDI computed:', result)
    return result
  })

  // 格式化数据 - 系统DO
  const systemDO = computed(() => {
    const data = pickBlockIO('block1', ['系统DO输出状态'])
    return data['系统DO输出状态'] || []
  })

  // 格式化数据 - I/O控制板DI
  const ioControlDI = computed(() => {
    const data = pickBlockIO('block1', ['I/O控制板-DI'])
    return data['I/O控制板-DI'] || []
  })

  // 格式化数据 - I/O控制板DO
  const ioControlDO = computed(() => {
    const data = pickBlockIO('block1', ['I/O控制板-DO'])
    return data['I/O控制板-DO'] || []
  })

  // 获取IO状态显示文本
  const getIOStatusText = (value: any) => {
    if (value === 1 || value === true) return '激活'
    if (value === 0 || value === false) return '未激活'
    return '未知'
  }

  // 获取IO状态严重程度
  const getIOStatusSeverity = (value: any) => {
    if (value === 1 || value === true) return 'success'
    if (value === 0 || value === false) return 'info'
    return 'warning'
  }

  // 生命周期管理
  onMounted(() => {
    (window as any).electron.ipcRenderer.on('BLOCK_IO_STATUS', handleBlockIOMessage)
  })

  onUnmounted(() => {
    (window as any).electron.ipcRenderer.removeListener('BLOCK_IO_STATUS', handleBlockIOMessage)
  })

  return {
    blockIOData,
    systemDI,
    systemDO,
    ioControlDI,
    ioControlDO,
    isLoading,
    getIOStatusText,
    getIOStatusSeverity
  }
} 
