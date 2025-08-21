/* ------------------------------------------------------------------ */
/*                    parseFault – 统一故障解析 - 内存优化版本            */
/* ------------------------------------------------------------------ */
// ./src/renderer/src/composables/parseFault.ts - 解决内存泄漏并统一告警等级
import { markRaw, shallowRef, watch } from 'vue'
import { locateCell } from '../../../../../../protocol/utils'

// 类型声明
type PerformanceMemory = {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
};

/* ---------- 统一告警等级配置 ---------- */
const LEVEL_CONFIG = {
  SEVERE: { txt: '严重', tag: 'severe' },
  MEDIUM: { txt: '一般', tag: 'medium' },
  MILD: { txt: '轻微', tag: 'mild' },
  NONE: { txt: '无', tag: 'none' }
}

// 等级映射数组（索引对应2-bit值）
const LEVEL_MAPPING = [
  LEVEL_CONFIG.NONE,   // 0
  LEVEL_CONFIG.SEVERE, // 1
  LEVEL_CONFIG.MEDIUM, // 2
  LEVEL_CONFIG.MILD    // 3
]

/* ---------- 类型 ---------- */
export interface FaultRecord {
  label    : string
  desc     : string          // 故障文本（去掉前缀）
  time     : string          // 格式化时间
  ts       : number          // 时间戳（排序用）
  levelTxt : string
  levelTag : string
  typeRank : number
  bmu      : number | null
  afe      : number | null
  cell     : number | null
}

/* ---------- 非响应式主仓库 ---------- */
const rawFaultData = markRaw(
  new Map<string, Map<string, FaultRecord>>()   // Map<clusterKey , Map<label , rec>>
)

// 添加数据清理机制
const MAX_FAULT_AGE = 24 * 60 * 60 * 1000 // 24小时
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5分钟清理一次

export const faultTick = shallowRef(0)

/* ---------- 节流机制 - 防止内存泄漏的关键 ---------- */
let lastUpdateTime = 0
const UPDATE_THROTTLE = 500 // 500ms内最多更新一次，平衡实时性和性能
let pendingUpdate = false

function throttledUpdate() {
  const now = Date.now()
  const elapsed = now - lastUpdateTime
  
  if (elapsed >= UPDATE_THROTTLE) {
    lastUpdateTime = now
    faultTick.value++
    pendingUpdate = false
    // console.log(`[节流更新] 触发UI更新, 间隔: ${elapsed}ms`)
  } else if (!pendingUpdate) {
    pendingUpdate = true
    const delay = UPDATE_THROTTLE - elapsed
    setTimeout(() => {
      if (pendingUpdate) {
        throttledUpdate()
      }
    }, delay)
    // console.log(`[节流更新] 延迟 ${delay}ms 后更新`)
  }
}

/* ---------- 缓存机制 - 避免重复计算 ---------- */
export const sortedAllFaults = shallowRef<FaultRecord[]>([])

// 定期清理过期数据
function cleanupOldFaults() {
  const now = Date.now()
  let cleanedCount = 0
  
  for (const [clusterKey, faultMap] of rawFaultData.entries()) {
    for (const [label, record] of faultMap.entries()) {
      if (now - record.ts > MAX_FAULT_AGE) {
        faultMap.delete(label)
        cleanedCount++
      }
    }
    // 如果集群为空，删除整个集群
    if (faultMap.size === 0) {
      rawFaultData.delete(clusterKey)
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[cleanup] 清理了 ${cleanedCount} 条过期故障记录`)
    throttledUpdate() // 使用节流更新
  }
}

// 启动定期清理
let cleanupTimer: NodeJS.Timeout | null = null

function startCleanupTimer() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
  }
  cleanupTimer = setInterval(cleanupOldFaults, CLEANUP_INTERVAL)
}

function stopCleanupTimer() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

/* ---------- 响应式更新 - 使用缓存避免重复计算 ---------- */
watch(
  faultTick,
  () => {
    // 注释掉调试用的内存监控，减少性能开销
    // const perf = window.performance as Performance & { memory?: PerformanceMemory };
    // const mem0 = perf.memory?.usedJSHeapSize ?? 0;
    const startTime = performance.now();
    
    const arr: (FaultRecord & { cluster: string })[] = []
    for (const [cluster, faultMap] of rawFaultData.entries()) {
      for (const record of faultMap.values()) {
        arr.push({ ...record, cluster })
      }
    }
    
    // 排序并缓存结果
    arr.sort(sortFaults).reverse()
    sortedAllFaults.value = arr;
    
    // 简化日志，只保留关键信息
    // console.log(
    //   `[故障更新] 耗时: ${(performance.now() - startTime).toFixed(2)}ms | ` +
    //   `故障数: ${arr.length}`
    // );
  },
  { immediate: true }
);

/* ---------- 对外接口 - 直接返回缓存结果 ---------- */
export function useAllFaults() {
  return () => {
    faultTick.value // 建立依赖关系
    return sortedAllFaults.value // 直接返回缓存的结果，避免重复计算
  }
}

/* ---------- 排序逻辑 ---------- */
function sortFaults (a: FaultRecord & { cluster: string },
                     b: typeof a) {

  if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank
  const [ablock, acluster] = a.cluster.split('-').map(Number)
  const [bblock, bcluster] = b.cluster.split('-').map(Number)
  if (ablock !== bblock)   return ablock   - bblock
  if (acluster !== bcluster) return acluster - bcluster

  const num = (s?: string) => Number(s?.match(/\d+/)?.[0] ?? Infinity)
  const cmp = num(a.bmu?.toString()) - num(b.bmu?.toString())
  if (cmp) return cmp
  const cmp2 = num(a.afe?.toString()) - num(b.afe?.toString())
  if (cmp2) return cmp2
  return num(a.cell?.toString()) - num(b.cell?.toString())
}

/* ---------- 解析 MQTT 消息 ---------- */
export function parseFault (msg: any) {
  const { blockId, clusterId, dataType } = msg
  const key = `${blockId}-${clusterId}`

  if (!rawFaultData.has(key))
    rawFaultData.set(key, new Map<string, FaultRecord>())

  const map   = rawFaultData.get(key)!
  const rank  = dataType.startsWith('FAULT_LEVEL3') ? 3 :
                dataType.startsWith('FAULT_LEVEL2') ? 2 :
                dataType.startsWith('FAULT_LEVEL1') ? 1 :
                dataType.startsWith('BLOCK_') ? 3 : 0  // 堆故障按三级故障处理（严重故障）
  const now   = Date.now()
  const tsStr = new Date(now).toLocaleString()

  msg.data.forEach((sec: any) => {
    sec.element.forEach(({ label, value }: any) => {
      /* ---------- ① Bool 字段 ---------- */
      if (typeof value === 'boolean') {
        if (value) {
          const { bmu, afe, cellInBmu } = locateCell(label, msg.baseConfig||{})
          map.set(label, {
            label,
            desc : label.replace(/^BMU\d+\s*第\s*\d+\s*节\s*/, ''),
            time : tsStr,
            ts   : now,
            levelTxt: LEVEL_CONFIG.SEVERE.txt,  // 统一使用"严重"
            levelTag: LEVEL_CONFIG.SEVERE.tag,
            typeRank: rank,
            bmu, afe, cell: cellInBmu
          })
        } else {
          // 只有当故障确实存在时才删除（故障恢复）
          if (map.has(label)) {
            map.delete(label)          // 故障恢复
            if (map.size === 0) {
              rawFaultData.delete(key); // 清理空集群
            }
          }
        }
        return
      }

      /* ---------- ② 2-bit 等级字段 ---------- */
      if (value && typeof value === 'object' && 'raw' in value) {
        const code = value.raw & 0b11
        if (code === 0) {
          // 只有当故障确实存在时才删除（故障恢复）
          if (map.has(label)) {
            map.delete(label)
            if (map.size === 0) {
              rawFaultData.delete(key); // 清理空集群
            }
          }
          return
        }
        if (typeof value === 'number') {
          // 直接忽略：既不写 Map，也不删 Map
          return
        }
        const { bmu, afe, cellInBmu } = locateCell(label, msg.baseConfig||{})
        const level = LEVEL_MAPPING[code] || LEVEL_CONFIG.SEVERE // 默认严重
        map.set(label, {
          label,
          desc : label.replace(/^BMU\d+\s*第\s*\d+\s*节\s*/, ''),
          time : tsStr,
          ts   : now,
          levelTxt: level.txt,  // 统一使用配置的等级文本
          levelTag: level.tag,
          typeRank: rank,
          bmu, afe, cell: cellInBmu
        })
      }
    })
  })
  
  // 使用节流更新替代直接更新，防止内存泄漏
  throttledUpdate()
}

// 启动清理定时器
startCleanupTimer()

/* ---------- 调试工具（生产环境可移除） ---------- */
export function logMemoryUsage(tag: string) {
  const perf = window.performance as Performance & { memory?: PerformanceMemory }
  if (perf.memory) {
    console.log(
      `[Memory ${tag}] ` +
      `Used: ${(perf.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB | ` +
      `Total: ${(perf.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB | ` +
      `Raw数据大小: ${rawFaultData.size} clusters, ` +
      `总故障数: ${Array.from(rawFaultData.values()).reduce((sum, m) => sum + m.size, 0)}`
    )
  }
}
