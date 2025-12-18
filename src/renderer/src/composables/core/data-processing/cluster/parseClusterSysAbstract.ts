// composables/parseClusterSysAbstract.ts
import { ref } from 'vue'

/* ========== 响应式缓存结构 ========== */
// 数据结构: { [key: string]: { [class: string]: any[] } }
const sysAbstractCache = ref<Record<string, Record<string, any[]>>>({})

// 外部依赖触发器（用于页面计算建立依赖）
export const clusterSysAbstractTick = ref(0)

/* ========== 常量：类名与标签 ========== */
export const SYS_ABSTRACT_CLASSES = {
  CELL_VOLT: '单体电压概要',
  CELL_TEMP: '单体温度概要'
}

export const SYS_ABSTRACT_LABELS = {
  MAX_CELL_VOLT_1: '单体最大电压1(V)',
  MIN_CELL_VOLT_1: '单体最小电压1(V)',
  MAX_CELL_TEMP_1: '单体最大温度1(℃)',
  MIN_CELL_TEMP_1: '单体最小温度1(℃)'
}

/* ========== 解析函数 ========== */
export function parseClusterSysAbstract(msg: any) {
  if (!msg || msg.dataType !== 'SYS_ABSTRACT') return

  const key = `${msg.blockId}-${msg.clusterId}`

  // 将每个分组类名映射到对应的 element 列表（数组浅拷贝，确保响应式）
  const newData: Record<string, any[]> = {}
  msg.data.forEach((sec: any) => {
    if (!sec || !sec.class || !Array.isArray(sec.element)) return
    newData[sec.class] = [...sec.element]
  })

  // 替换根对象，确保引用身份变化，触发响应式更新
  sysAbstractCache.value = { ...sysAbstractCache.value, [key]: newData }

  // 兼容触发器（供页面建立依赖）
  try { clusterSysAbstractTick.value++ } catch {}
}

/* ========== 取数接口 ========== */
/** 返回指定簇键下，给定类名集合的 element 列表映射 */
export function pickClusterSysAbstract(key: string, classes: string[]) {
  const data = sysAbstractCache.value[key]
  if (!data) return {}

  const result: Record<string, any[]> = {}
  for (const cls of classes) {
    if (data[cls]) {
      result[cls] = data[cls]
    }
  }
  return result
}

/** 按类名+原始标签取单个值；找不到返回 '–' */
export function pickClusterSysAbstractValue(key: string, className: string, label: string) {
  const data = sysAbstractCache.value[key]?.[className]
  if (!data) return '–'
  const found = data.find((e: any) => e?.label === label || e?.key === label)
  return found && found.value != null ? found.value : '–'
}

