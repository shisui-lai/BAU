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

// 故障严重程度排序映射表 - 用于确保严重故障优先显示
// 注意：由于最终会执行 .reverse()，所以严重故障使用较大数值
// 如果性能消耗过大，可以删除下面的 SEVERITY_ORDER 和相关排序逻辑
const SEVERITY_ORDER = { 'severe': 3, 'medium': 2, 'mild': 1 } as const

function sortFaults (a: FaultRecord & { cluster: string },
                     b: typeof a) {

  // ========== 故障严重程度排序 (可删除部分 - 开始) ==========
  // 优先按故障严重程度排序：严重 → 一般 → 轻微
  // 注意：由于最终会执行 .reverse()，所以这里使用升序排序
  // 如果性能消耗过大，删除下面4行代码即可恢复原有排序
  const aSeverity = SEVERITY_ORDER[a.levelTag as keyof typeof SEVERITY_ORDER] || 0
  const bSeverity = SEVERITY_ORDER[b.levelTag as keyof typeof SEVERITY_ORDER] || 0
  if (aSeverity !== bSeverity) return aSeverity - bSeverity
  // ========== 故障严重程度排序 (可删除部分 - 结束) ==========

  // 原有排序逻辑保持不变
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
                dataType.startsWith('BLOCK_') ? 3 :      // 堆故障按三级故障处理（严重故障）
                dataType === 'HARDWARE_FAULT' ? 3 :      // 硬件故障按二级处理
                dataType === 'TOTAL_FAULT' ? 3 :         // 总故障按一级处理
                0  // 其他未知类型默认最低优先级
  const now   = Date.now()
  const tsStr = new Date(now).toLocaleString()

  msg.data.forEach((sec: any) => {
    sec.element.forEach(({ label, value }: any) => {
      /* ---------- ① Bool 字段 ---------- */
      if (typeof value === 'boolean') {
        if (value) {
          const { bmu, afe, cellInBmu } = locateCell(label, msg.baseConfig||{})

          // 检查故障是否已存在，保持首次发生时间
          const existingRecord = map.get(label)

          if (existingRecord) {
            // 故障已存在，只更新必要字段，保持原始时间
            map.set(label, {
              ...existingRecord,
              // 保持原始时间：time 和 ts 不更新
              levelTxt: LEVEL_CONFIG.SEVERE.txt,  // 可能需要更新等级
              levelTag: LEVEL_CONFIG.SEVERE.tag,
              typeRank: rank,  // 可能需要更新优先级
              // 其他字段保持不变
            })
          } else {
            // 故障首次出现，记录完整信息包括首次发生时间
            map.set(label, {
              label,
              desc : label.replace(/^BMU\d+\s*第\s*\d+\s*节\s*/, ''),
              time : tsStr,  //  只在首次出现时记录时间
              ts   : now,    //  只在首次出现时记录时间戳
              levelTxt: LEVEL_CONFIG.SEVERE.txt,
              levelTag: LEVEL_CONFIG.SEVERE.tag,
              typeRank: rank,
              bmu, afe, cell: cellInBmu
            })
          }
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

        //检查故障是否已存在，保持首次发生时间
        const existingRecord = map.get(label)

        if (existingRecord) {
          // 故障已存在，只更新必要字段，保持原始时间
          map.set(label, {
            ...existingRecord,
            // 保持原始时间：time 和 ts 不更新
            levelTxt: level.txt,  // 更新等级文本（可能变化）
            levelTag: level.tag,  // 更新等级标签（可能变化）
            typeRank: rank,       // 更新优先级（可能变化）
            // 其他字段保持不变
          })
        } else {
          // 故障首次出现，记录完整信息包括首次发生时间
          map.set(label, {
            label,
            desc : label.replace(/^BMU\d+\s*第\s*\d+\s*节\s*/, ''),
            time : tsStr,  // 只在首次出现时记录时间
            ts   : now,    // 只在首次出现时记录时间戳
            levelTxt: level.txt,
            levelTag: level.tag,
            typeRank: rank,
            bmu, afe, cell: cellInBmu
          })
        }
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
