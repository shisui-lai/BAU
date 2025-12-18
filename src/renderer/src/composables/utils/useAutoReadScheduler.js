/**
 * 全局autoRead调度器
 * 解决多个页面同时触发autoReadMultiTopicOnce导致的性能问题
 */

let scheduled = false
let timeoutId = null
let pendingTopics = new Set()
let autoReadFunction = null

/**
 * 注册autoRead函数
 * @param {Function} fn - autoReadMultiTopicOnce函数
 */
export function registerAutoReadFunction(fn) {
  autoReadFunction = fn
}

/**
 * 统一调度自动读取请求，避免并发执行
 * @param {Array} topics - 要读取的topic列表
 * @param {number} delay - 延迟时间（毫秒）
 * @param {string} source - 调用来源（用于调试）
 */
export function scheduleAutoRead(topics, delay = 500, source = 'unknown') {
  // 将新的topics添加到待处理集合
  topics.forEach((topic) => pendingTopics.add(topic))

  // 如果已经有调度在等待，直接返回
  if (scheduled) {
    return
  }

  scheduled = true
  clearTimeout(timeoutId)

  timeoutId = setTimeout(() => {
    const allTopics = Array.from(pendingTopics)

    // 重置状态
    scheduled = false
    pendingTopics.clear()

    // 执行实际的读取操作
    if (allTopics.length > 0 && autoReadFunction) {
      try {
        autoReadFunction(allTopics)
      } catch (error) {
        console.error('[AutoReadScheduler] 执行autoRead失败:', error)
      }
    } else if (allTopics.length > 0) {
      console.warn('[AutoReadScheduler] autoRead函数未注册，跳过执行')
    }
  }, delay)
}

/**
 * 取消待处理的自动读取调度
 * @param {string} source - 取消来源（用于调试）
 */
export function cancelAutoRead(source = 'unknown') {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }

  scheduled = false
  pendingTopics.clear()
}

/**
 * 获取当前调度状态（用于调试）
 */
export function getSchedulerStatus() {
  return {
    scheduled,
    pendingTopicsCount: pendingTopics.size,
    pendingTopics: Array.from(pendingTopics)
  }
}
