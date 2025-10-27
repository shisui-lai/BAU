/**
 * 崩溃日志模块
 * 功能：捕获应用闪退错误，记录系统资源占用情况
 */

import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import os from 'os'

class CrashLogger {
  constructor() {
    // 日志存储目录
    this.logDir = path.join(app.getPath('userData'), 'crash-logs')
    // 确保日志目录存在
    this.ensureLogDirectory()
    // 启动系统资源监控
    this.startResourceMonitoring()
    // 当前系统资源信息
    this.currentResourceInfo = {}
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true })
        console.log(`[CrashLogger] 日志目录已创建: ${this.logDir}`)
      }
    } catch (error) {
      console.error('[CrashLogger] 创建日志目录失败:', error)
    }
  }

  /**
   * 启动系统资源监控
   * 每5秒采集一次系统资源信息
   */
  startResourceMonitoring() {
    // 立即采集一次
    this.collectResourceInfo()

    // 定期采集系统资源信息
    this.resourceMonitorInterval = setInterval(() => {
      this.collectResourceInfo()
    }, 5000) // 每5秒采集一次
  }

  /**
   * 采集系统资源信息
   */
  collectResourceInfo() {
    try {
      // CPU使用率（通过计算CPU空闲时间变化来估算）
      const cpus = os.cpus()
      const cpuUsage = this.calculateCPUUsage(cpus)

      // 内存信息
      const totalMemory = os.totalmem()
      const freeMemory = os.freemem()
      const usedMemory = totalMemory - freeMemory
      const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2)

      // 进程内存使用
      const processMemory = process.memoryUsage()

      this.currentResourceInfo = {
        timestamp: new Date().toISOString(),
        cpu: {
          usage: cpuUsage,
          cores: cpus.length,
          model: cpus[0].model
        },
        memory: {
          total: this.formatBytes(totalMemory),
          used: this.formatBytes(usedMemory),
          free: this.formatBytes(freeMemory),
          usagePercent: `${memoryUsagePercent}%`,
          totalBytes: totalMemory,
          usedBytes: usedMemory,
          freeBytes: freeMemory
        },
        process: {
          heapUsed: this.formatBytes(processMemory.heapUsed),
          heapTotal: this.formatBytes(processMemory.heapTotal),
          external: this.formatBytes(processMemory.external),
          rss: this.formatBytes(processMemory.rss),
          heapUsedBytes: processMemory.heapUsed,
          heapTotalBytes: processMemory.heapTotal,
          externalBytes: processMemory.external,
          rssBytes: processMemory.rss
        },
        uptime: {
          system: this.formatUptime(os.uptime()),
          process: this.formatUptime(process.uptime())
        }
      }
    } catch (error) {
      console.error('[CrashLogger] 采集系统资源信息失败:', error)
    }
  }

  /**
   * 计算CPU使用率
   */
  calculateCPUUsage(cpus) {
    if (!this.lastCpuInfo) {
      // 第一次采集，保存当前CPU信息
      this.lastCpuInfo = cpus.map(cpu => ({
        idle: cpu.times.idle,
        total: Object.values(cpu.times).reduce((acc, time) => acc + time, 0)
      }))
      return 'N/A' // 第一次无法计算
    }

    // 计算每个核心的使用率
    const cpuUsages = cpus.map((cpu, index) => {
      const lastInfo = this.lastCpuInfo[index]
      const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0)
      const idle = cpu.times.idle

      const totalDiff = total - lastInfo.total
      const idleDiff = idle - lastInfo.idle

      const usage = totalDiff === 0 ? 0 : ((1 - idleDiff / totalDiff) * 100)

      return usage
    })

    // 更新上次CPU信息
    this.lastCpuInfo = cpus.map(cpu => ({
      idle: cpu.times.idle,
      total: Object.values(cpu.times).reduce((acc, time) => acc + time, 0)
    }))

    // 计算平均使用率
    const avgUsage = cpuUsages.reduce((acc, usage) => acc + usage, 0) / cpuUsages.length

    return `${avgUsage.toFixed(2)}%`
  }

  /**
   * 格式化字节数
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * 格式化运行时间
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    const parts = []
    if (days > 0) parts.push(`${days}天`)
    if (hours > 0) parts.push(`${hours}小时`)
    if (minutes > 0) parts.push(`${minutes}分钟`)
    parts.push(`${secs}秒`)

    return parts.join('')
  }

  /**
   * 记录崩溃日志
   */
  logCrash(error, type = 'uncaughtException') {
    try {
      const timestamp = new Date()
      const filename = `crash-${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}_${String(timestamp.getHours()).padStart(2, '0')}-${String(timestamp.getMinutes()).padStart(2, '0')}-${String(timestamp.getSeconds()).padStart(2, '0')}.log`
      const logPath = path.join(this.logDir, filename)

      const crashInfo = {
        crashTime: timestamp.toISOString(),
        errorType: type,
        errorMessage: error?.message || String(error),
        errorStack: error?.stack || 'No stack trace available',
        errorCode: error?.code,
        errorErrno: error?.errno,
        errorSyscall: error?.syscall,
        systemInfo: {
          platform: process.platform,
          arch: process.arch,
          version: process.version,
          electronVersion: process.versions.electron,
          chromeVersion: process.versions.chrome,
          nodeVersion: process.versions.node,
          v8Version: process.versions.v8
        },
        resourceInfo: this.currentResourceInfo,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          cwd: process.cwd(),
          execPath: process.execPath,
          argv: process.argv
        }
      }

      // 生成日志内容
      const logContent = this.formatCrashLog(crashInfo)

      // 写入文件
      fs.writeFileSync(logPath, logContent, 'utf8')

      // 同时打印到控制台
      console.error('\n' + '='.repeat(80))
      console.error('[CrashLogger] 应用发生崩溃，日志已保存')
      console.error('[CrashLogger] 日志文件:', logPath)
      console.error('='.repeat(80))
      console.error(logContent)
      console.error('='.repeat(80) + '\n')

      // 清理旧日志（保留最近30个日志文件）
      this.cleanOldLogs(30)

      return logPath
    } catch (logError) {
      console.error('[CrashLogger] 记录崩溃日志失败:', logError)
      return null
    }
  }

  /**
   * 格式化崩溃日志
   */
  formatCrashLog(crashInfo) {
    return `
${'='.repeat(80)}
应用程序崩溃报告
${'='.repeat(80)}

【崩溃时间】
${crashInfo.crashTime}

【错误类型】
${crashInfo.errorType}

【错误信息】
${crashInfo.errorMessage}

【错误代码】
${crashInfo.errorCode || 'N/A'}

【错误堆栈】
${crashInfo.errorStack}

${'='.repeat(80)}
系统资源占用情况
${'='.repeat(80)}

【CPU信息】
- 使用率: ${crashInfo.resourceInfo.cpu?.usage || 'N/A'}
- 核心数: ${crashInfo.resourceInfo.cpu?.cores || 'N/A'}
- 型号: ${crashInfo.resourceInfo.cpu?.model || 'N/A'}

【内存信息】
- 总内存: ${crashInfo.resourceInfo.memory?.total || 'N/A'}
- 已使用: ${crashInfo.resourceInfo.memory?.used || 'N/A'}
- 空闲: ${crashInfo.resourceInfo.memory?.free || 'N/A'}
- 使用率: ${crashInfo.resourceInfo.memory?.usagePercent || 'N/A'}

【进程内存】
- 堆内存使用: ${crashInfo.resourceInfo.process?.heapUsed || 'N/A'}
- 堆内存总量: ${crashInfo.resourceInfo.process?.heapTotal || 'N/A'}
- 外部内存: ${crashInfo.resourceInfo.process?.external || 'N/A'}
- 常驻内存: ${crashInfo.resourceInfo.process?.rss || 'N/A'}

【运行时间】
- 系统运行时间: ${crashInfo.resourceInfo.uptime?.system || 'N/A'}
- 进程运行时间: ${crashInfo.resourceInfo.uptime?.process || 'N/A'}

${'='.repeat(80)}
系统环境信息
${'='.repeat(80)}

【操作系统】
- 平台: ${crashInfo.systemInfo.platform}
- 架构: ${crashInfo.systemInfo.arch}

【版本信息】
- Electron: ${crashInfo.systemInfo.electronVersion}
- Chrome: ${crashInfo.systemInfo.chromeVersion}
- Node.js: ${crashInfo.systemInfo.nodeVersion}
- V8: ${crashInfo.systemInfo.v8Version}

【运行环境】
- NODE_ENV: ${crashInfo.environment.nodeEnv || 'N/A'}
- 工作目录: ${crashInfo.environment.cwd}
- 执行路径: ${crashInfo.environment.execPath}

${'='.repeat(80)}
日志文件位置: ${this.logDir}
${'='.repeat(80)}
`
  }

  /**
   * 清理旧日志
   */
  cleanOldLogs(keepCount = 30) {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('crash-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          time: fs.statSync(path.join(this.logDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time) // 按时间倒序排序

      // 删除超过保留数量的文件
      if (files.length > keepCount) {
        const filesToDelete = files.slice(keepCount)
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path)
            console.log(`[CrashLogger] 已删除旧日志: ${file.name}`)
          } catch (error) {
            console.error(`[CrashLogger] 删除旧日志失败: ${file.name}`, error)
          }
        })
      }
    } catch (error) {
      console.error('[CrashLogger] 清理旧日志失败:', error)
    }
  }

  /**
   * 停止资源监控
   */
  stopResourceMonitoring() {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval)
      this.resourceMonitorInterval = null
    }
  }

  /**
   * 获取日志目录
   */
  getLogDirectory() {
    return this.logDir
  }

  /**
   * 获取当前资源信息
   */
  getCurrentResourceInfo() {
    return this.currentResourceInfo
  }

  /**
   * 记录应用退出日志（正常退出时使用）
   */
  logExit(reason = 'normal') {
    try {
      const timestamp = new Date()
      const filename = `exit-${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}_${String(timestamp.getHours()).padStart(2, '0')}-${String(timestamp.getMinutes()).padStart(2, '0')}-${String(timestamp.getSeconds()).padStart(2, '0')}.log`
      const logPath = path.join(this.logDir, filename)

      const exitInfo = {
        exitTime: timestamp.toISOString(),
        exitReason: reason,
        systemInfo: {
          platform: process.platform,
          arch: process.arch,
          version: process.version,
          electronVersion: process.versions.electron,
          chromeVersion: process.versions.chrome,
          nodeVersion: process.versions.node,
          v8Version: process.versions.v8
        },
        resourceInfo: this.currentResourceInfo,
        uptime: {
          system: this.formatUptime(os.uptime()),
          process: this.formatUptime(process.uptime())
        }
      }

      const logContent = this.formatExitLog(exitInfo)
      fs.writeFileSync(logPath, logContent, 'utf8')

      console.log('[CrashLogger] 应用退出日志已保存:', logPath)

      return logPath
    } catch (error) {
      console.error('[CrashLogger] 记录退出日志失败:', error)
      return null
    }
  }

  /**
   * 格式化退出日志
   */
  formatExitLog(exitInfo) {
    return `
${'='.repeat(80)}
应用程序退出记录
${'='.repeat(80)}

【退出时间】
${exitInfo.exitTime}

【退出原因】
${exitInfo.exitReason}

${'='.repeat(80)}
系统资源占用情况（退出时）
${'='.repeat(80)}

【CPU信息】
- 使用率: ${exitInfo.resourceInfo.cpu?.usage || 'N/A'}
- 核心数: ${exitInfo.resourceInfo.cpu?.cores || 'N/A'}
- 型号: ${exitInfo.resourceInfo.cpu?.model || 'N/A'}

【内存信息】
- 总内存: ${exitInfo.resourceInfo.memory?.total || 'N/A'}
- 已使用: ${exitInfo.resourceInfo.memory?.used || 'N/A'}
- 空闲: ${exitInfo.resourceInfo.memory?.free || 'N/A'}
- 使用率: ${exitInfo.resourceInfo.memory?.usagePercent || 'N/A'}

【进程内存】
- 堆内存使用: ${exitInfo.resourceInfo.process?.heapUsed || 'N/A'}
- 堆内存总量: ${exitInfo.resourceInfo.process?.heapTotal || 'N/A'}
- 外部内存: ${exitInfo.resourceInfo.process?.external || 'N/A'}
- 常驻内存: ${exitInfo.resourceInfo.process?.rss || 'N/A'}

【运行时间】
- 系统运行时间: ${exitInfo.uptime?.system || 'N/A'}
- 进程运行时间: ${exitInfo.uptime?.process || 'N/A'}

${'='.repeat(80)}
系统环境信息
${'='.repeat(80)}

【操作系统】
- 平台: ${exitInfo.systemInfo.platform}
- 架构: ${exitInfo.systemInfo.arch}

【版本信息】
- Electron: ${exitInfo.systemInfo.electronVersion}
- Chrome: ${exitInfo.systemInfo.chromeVersion}
- Node.js: ${exitInfo.systemInfo.nodeVersion}
- V8: ${exitInfo.systemInfo.v8Version}

${'='.repeat(80)}
日志文件位置: ${this.logDir}
${'='.repeat(80)}
`
  }
}

// 创建单例
const crashLogger = new CrashLogger()

// 导出单例
export default crashLogger
