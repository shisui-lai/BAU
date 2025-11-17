;('use strict')

// 内存管理工具
class MemoryManager {
  constructor() {
    this.memoryThreshold = 0.85 // 大幅提高内存使用率阈值，从75%提高到85%，减少清理频率
    this.cleanupInterval = 60000 // 大幅增加清理间隔，从30秒增加到60秒，减少清理频率
    this.lastCleanup = Date.now()
    this.cleanupCallbacks = []

    // 启动内存监控
    // this.startMonitoring()
  }

  // 添加清理回调函数
  addCleanupCallback(callback) {
    this.cleanupCallbacks.push(callback)
  }

  // 获取内存使用情况
  getMemoryUsage() {
    const usage = process.memoryUsage()
    return {
      rss: usage.rss, // 常驻内存
      heapTotal: usage.heapTotal, // 堆内存总量
      heapUsed: usage.heapUsed, // 已使用的堆内存
      external: usage.external, // 外部内存
      arrayBuffers: usage.arrayBuffers || 0 // 数组缓冲区
    }
  }

  // 获取内存使用率
  getMemoryUsageRatio() {
    const usage = this.getMemoryUsage()
    return usage.heapUsed / usage.heapTotal
  }

  // 检查是否需要清理
  shouldCleanup() {
    const ratio = this.getMemoryUsageRatio()
    const timeSinceLastCleanup = Date.now() - this.lastCleanup

    return ratio > this.memoryThreshold || timeSinceLastCleanup > this.cleanupInterval
  }

  // 执行内存清理
  async performCleanup() {
    console.log('[内存管理] 开始执行内存清理...')

    const beforeUsage = this.getMemoryUsage()

    // 执行所有注册的清理回调
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback()
      } catch (error) {
        console.error('[内存管理] 清理回调执行失败:', error)
      }
    }

    // 强制垃圾回收
    if (global.gc) {
      global.gc()
    }

    const afterUsage = this.getMemoryUsage()
    const freedMemory = beforeUsage.heapUsed - afterUsage.heapUsed

    console.log(`[内存管理] 清理完成，释放内存: ${(freedMemory / 1024 / 1024).toFixed(2)} MB`)
    console.log(
      `[内存管理] 当前内存使用: ${(afterUsage.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(afterUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
    )

    this.lastCleanup = Date.now()
  }

  // 紧急内存清理（更激进的清理）
  async performEmergencyCleanup() {
    console.log('[内存管理] 开始执行紧急内存清理...')

    const beforeUsage = this.getMemoryUsage()

    // 执行所有注册的清理回调
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback()
      } catch (error) {
        console.error('[内存管理] 紧急清理回调执行失败:', error)
      }
    }

    // 强制垃圾回收
    if (global.gc) {
      global.gc()
    }

    const afterUsage = this.getMemoryUsage()
    const freedMemory = beforeUsage.heapUsed - afterUsage.heapUsed

    console.log(`[内存管理] 紧急清理完成，释放内存: ${(freedMemory / 1024 / 1024).toFixed(2)} MB`)
    console.log(
      `[内存管理] 当前内存使用: ${(afterUsage.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(afterUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
    )

    this.lastCleanup = Date.now()
  }

  // 启动内存监控
  startMonitoring() {
    // setInterval(() => {
    //   if (this.shouldCleanup()) {
    //     this.performCleanup()
    //   }
    // }, 20000) // 从10秒增加到20秒，大幅减少检查频率
    // // 定期输出内存使用情况
    // setInterval(() => {
    //   const usage = this.getMemoryUsage()
    //   const ratio = this.getMemoryUsageRatio()
    //   if (ratio > 0.8) {
    //     // 从0.7提高到0.8，减少警告频率
    //     // 只在内存使用率超过80%时输出
    //     console.log(
    //       `[内存监控] 内存使用率: ${(ratio * 100).toFixed(1)}% (${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB)`
    //     )
    //   }
    //   // 紧急清理：当内存使用率超过90%时立即清理
    //   if (ratio > 0.9) {
    //     console.warn(`[紧急内存清理] 内存使用率过高: ${(ratio * 100).toFixed(1)}%，立即执行清理`)
    //     this.performEmergencyCleanup()
    //   }
    // }, 120000) // 从60秒增加到120秒，大幅减少监控频率
    // // 增加更频繁的紧急检查
    // setInterval(() => {
    //   const usage = this.getMemoryUsage()
    //   const ratio = this.getMemoryUsageRatio()
    //   if (ratio > 0.95) {
    //     // 当内存使用率超过95%时，强制清理
    //     console.error(`[强制内存清理] 内存使用率严重过高: ${(ratio * 100).toFixed(1)}%，强制清理`)
    //     this.performEmergencyCleanup()
    //     // 强制垃圾回收
    //     if (global.gc) {
    //       global.gc()
    //     }
    //   }
    // }, 60000) // 从30秒增加到60秒，减少检查频率
  }

  // 手动触发清理
  async forceCleanup() {
    console.log('[内存管理] 手动触发内存清理')
    await this.performCleanup()
  }
}

// 创建全局内存管理器实例
const memoryManager = new MemoryManager()

export { memoryManager, MemoryManager }
