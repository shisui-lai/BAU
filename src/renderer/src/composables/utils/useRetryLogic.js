/**
 * 重试逻辑组合式函数
 * 用于检测设备通讯超时，在指定时间内没有收到任何响应时显示超时提示
 */

export function useRetryLogic(toastService, stopFunction = null, options = {}) {
  const {
    timeout = 10000, // 默认6秒超时
    message = '设备无响应，请检查设备连接状态'
  } = options
  
  // 状态变量
  let hasResponse = false
  let timeoutId = null
  
  /**
   * 开始重试检查
   * 启动超时计时器，如果在指定时间内没有收到响应则显示超时提示
   */
  function startRetry() {
    hasResponse = false
    clearTimeout(timeoutId)
    
    // console.log('[useRetryLogic] 开始超时检查，超时时间:', timeout + 'ms')
    
    timeoutId = setTimeout(() => {
      if (!hasResponse) {
        console.log('[useRetryLogic] 检测到超时，显示提示并停止读取')

        // 显示超时提示
        toastService.add({
          severity: 'error',
          summary: '读取超时',
          detail: message,
          life: 5000
        })

        // 停止读取操作
        if (stopFunction && typeof stopFunction === 'function') {
          // console.log('[useRetryLogic] 调用停止函数')
          stopFunction()
        } else {
          console.warn('[useRetryLogic] 未提供停止函数，无法自动停止读取')
        }
      }
    }, timeout)
  }
  
  /**
   * 标记已收到响应
   * 停止超时检查，清除计时器
   */
  function markResponse() {
    if (!hasResponse) {
      console.log('[useRetryLogic] 收到响应，停止超时检查')
      hasResponse = true
      clearTimeout(timeoutId)
    }
  }
  
  /**
   * 清理资源
   * 页面卸载时调用，清除计时器和重置状态
   */
  function cleanup() {
    // console.log('[useRetryLogic] 清理资源')
    clearTimeout(timeoutId)
    hasResponse = false
    timeoutId = null
  }
  
  return {
    startRetry,
    markResponse,
    cleanup
  }
}
