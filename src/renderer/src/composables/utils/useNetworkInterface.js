/**
 * 网络接口工具函数
 * 用于获取本机网络接口信息，特别是11网段的IP地址
 */

/**
 * 获取FTP服务器默认IP地址
 * 优先使用本机11网段的网卡IP，如果没有则使用默认值
 */
export function useDefaultFtpServerIp() {
  
  /**
   * 获取本机11网段的IP地址
   * @returns {Promise<string>} 返回IP地址字符串
   */
  const getDefault11SegmentIp = async () => {
    console.log('[FTP] 开始获取本机11网段IP地址')
    
    try {
      // 调用主进程获取所有网络接口
      const interfaces = await window.electronAPI.ipc.invoke('get-network-interfaces')
      console.log('[FTP] 获取到网络接口列表:', interfaces.length, '个')
      
      if (!interfaces || interfaces.length === 0) {
        console.log('[FTP] 未找到任何网络接口，使用默认IP')
        return '192.168.11.200'
      }
      
      // 筛选出11网段的IP地址
      const segment11Interfaces = interfaces.filter(iface => {
        const isSegment11 = iface.address && iface.address.startsWith('192.168.11.')
        if (isSegment11) {
          console.log('[FTP] 找到11网段网卡:', iface.displayName, iface.address)
        }
        return isSegment11
      })
      
      console.log('[FTP] 11网段网卡数量:', segment11Interfaces.length)
      
      if (segment11Interfaces.length === 0) {
        console.log('[FTP] 没有找到11网段网卡，使用默认IP: 192.168.11.200')
        return '192.168.11.200'
      }
      
      if (segment11Interfaces.length === 1) {
        const selectedIp = segment11Interfaces[0].address
        console.log('[FTP] 找到唯一11网段网卡，使用IP:', selectedIp)
        return selectedIp
      }
      
      // 多个11网段网卡时，选择第一个
      const selectedIp = segment11Interfaces[0].address
      console.log('[FTP] 找到多个11网段网卡，选择第一个:', selectedIp)
      console.log('[FTP] 其他可用网卡:', segment11Interfaces.slice(1).map(iface => iface.address))
      
      return selectedIp
      
    } catch (error) {
      console.error('[FTP] 获取网络接口失败:', error.message)
      console.log('[FTP] 网络接口获取异常，使用默认IP: 192.168.11.200')
      return '192.168.11.200'
    }
  }
  
  return {
    getDefault11SegmentIp
  }
}
