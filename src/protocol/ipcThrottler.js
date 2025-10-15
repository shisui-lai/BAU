// ipcThrottler.js  ----- 发送到主进程的通用限速器（优化版）
import { throttle } from 'lodash'

/*  统一节流窗口（毫秒）——随项目需要修改 */
export const THROTTLE_MS = 300     // 每键 300ms 允许 1 帧
const BACKGROUND_THROTTLE_MS = 300  // 后台时每键 300ms 允许 1 帧

/* 检查页面是否在后台 */
let isBackground = false

// 导出设置后台模式的函数，供主进程调用
export function setBackgroundMode(background) {
  isBackground = background
}

function isPageInBackground() {
  return isBackground
}

/* 【优化1】Map<key, {fn, lastUsed}> - 记录每个throttle的最后使用时间 */
const throttlers = new Map()

/* 【优化2】定期清理机制配置 */
const CLEANUP_INTERVAL = 60000      // 每60秒清理一次
const INACTIVE_THRESHOLD = 300000   // 5分钟未使用的throttle将被清理
const MAX_THROTTLERS = 500          // 最多保留500个throttle实例

/* 【优化3】清理定时器 */
let cleanupTimer = null

/* 生成唯一键：dataType-block-cluster，可按需改成 topic 等 */
function makeKey(msg){
  const b = msg.blockId   ?? 'x'
  const c = msg.clusterId ?? 'x'
  return `${msg.dataType}-${b}-${c}`
  // return `${b}-${c}`
}

/**
 * 【优化4】定期清理不活跃的throttle实例
 * 
 * 策略：
 * 1. 清理超过INACTIVE_THRESHOLD时间未使用的实例
 * 2. 如果总数超过MAX_THROTTLERS，清理最旧的实例
 * 3. 释放内部定时器，避免内存泄漏
 */
function cleanupInactiveThrottlers() {
  const now = Date.now()
  const entries = Array.from(throttlers.entries())
  
  // 统计清理前的状态
  const beforeCount = entries.length
  
  // 按最后使用时间排序
  entries.sort((a, b) => b[1].lastUsed - a[1].lastUsed)
  
  let cleanedCount = 0
  
  // 策略1：清理超过5分钟未使用的
  for (const [key, item] of entries) {
    if (now - item.lastUsed > INACTIVE_THRESHOLD) {
      item.fn.cancel() // 取消内部定时器
      throttlers.delete(key)
      cleanedCount++
    }
  }
  
  // 策略2：如果总数超过限制，清理最旧的
  if (throttlers.size > MAX_THROTTLERS) {
    const toRemove = throttlers.size - MAX_THROTTLERS
    const sortedByAge = Array.from(throttlers.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
    
    for (let i = 0; i < toRemove; i++) {
      const [key, item] = sortedByAge[i]
      item.fn.cancel()
      throttlers.delete(key)
      cleanedCount++
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[IPC Throttler] 清理完成: ${beforeCount} → ${throttlers.size} (清理了${cleanedCount}个不活跃实例)`)
  }
}

/**
 * 【优化5】启动定期清理机制
 */
function startCleanup() {
  if (cleanupTimer) return
  
  cleanupTimer = setInterval(() => {
    cleanupInactiveThrottlers()
  }, CLEANUP_INTERVAL)
  
  console.log('[IPC Throttler] 自动清理机制已启动')
}

/**
 * 【优化6】停止清理机制
 */
function stopCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
    console.log('[IPC Throttler] 自动清理机制已停止')
  }
}

// 自动启动清理机制
startCleanup()

/* —— 核心出口（优化版） —— */
export function sendToParent(msg){
  const key = makeKey(msg)
  const now = Date.now()

  // 动态选择限流间隔
  const currentThrottleMs = isPageInBackground() ? BACKGROUND_THROTTLE_MS : THROTTLE_MS

  /* 【优化7】首次遇到该键时，创建独立 throttle 实例并记录元信息 */
  if (!throttlers.has(key)){
    const fn = throttle(
      m => {
        process.send({ type: m.dataType, data: m })
      },
      currentThrottleMs,
      { leading:true, trailing:true }      // 首尾各保留
    )
    fn._throttleMs = currentThrottleMs
    throttlers.set(key, {
      fn,
      lastUsed: now,
      createdAt: now
    })
  } else {
    // 【优化8】更新最后使用时间
    const item = throttlers.get(key)
    item.lastUsed = now
    
    // 如果限流间隔改变，需要重新创建throttle函数
    if (item.fn._throttleMs !== currentThrottleMs) {
      item.fn.cancel() // 取消现有的
      const newFn = throttle(
        m => {
          process.send({ type: m.dataType, data: m })
        },
        currentThrottleMs,
        { leading:true, trailing:true }
      )
      newFn._throttleMs = currentThrottleMs
      item.fn = newFn
    }
  }
  
  // 调用throttle函数
  throttlers.get(key).fn(msg)
}

/* 【优化9】进程退出时可调用，立刻把所有队列中的"最后一帧"刷出 */
export function flushThrottlers(){
  throttlers.forEach(item => item.fn.flush())
}

/* 【优化10】取消所有throttle并清空Map */
export function cancelThrottlers() {
  throttlers.forEach(item => item.fn.cancel())   // ⬅️ 关键：kill internal setTimeout
  throttlers.clear()
  stopCleanup() // 停止清理定时器
  console.log('[IPC Throttler] 所有throttle已取消并清空')
}

/* 【优化11】导出清理函数，供外部手动触发 */
export function manualCleanup() {
  cleanupInactiveThrottlers()
}

/* 【优化12】获取当前throttler统计信息（用于调试） */
export function getThrottlerStats() {
  return {
    total: throttlers.size,
    maxAllowed: MAX_THROTTLERS,
    cleanupInterval: CLEANUP_INTERVAL,
    inactiveThreshold: INACTIVE_THRESHOLD
  }
}

