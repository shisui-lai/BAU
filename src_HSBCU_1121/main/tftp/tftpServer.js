const tftp = require('tftp')
const path = require('path')
const fs = require('fs')

let tftpServer = null
let TFTP_ROOT = path.join(process.cwd(), 'upgrade-files')

/**
 * 启动 TFTP 服务器
 * @param {string} host - 服务器IP地址，必须为 192.168.10.200
 * @param {number} port - 端口号，默认 69
 * @param {string} root - 根目录路径
 * @returns {Promise<{success: boolean, message?: string}>}
 */
function startTftpServer(host, port = 69, root = TFTP_ROOT) {
  return new Promise((resolve, reject) => {
    // 检查是否已经在运行
    if (tftpServer) {
      return resolve({ success: false, message: 'TFTP服务器已在运行' })
    }

    // 验证IP地址必须为 192.168.10.200
    if (host !== '192.168.10.200') {
      return resolve({
        success: false,
        message: 'TFTP服务器IP必须为192.168.10.200，请在设备连接页选择正确的网卡'
      })
    }

    // 确保根目录存在
    if (!fs.existsSync(root)) {
      try {
        fs.mkdirSync(root, { recursive: true })
      } catch (err) {
        return resolve({
          success: false,
          message: `创建TFTP根目录失败: ${err.message}`
        })
      }
    }

    // 验证升级文件是否存在
  /*   const upgradeFile = path.join(root, 'RS-BMU-BCU.pkg')
    if (!fs.existsSync(upgradeFile)) {
      console.warn(`[TFTP] 警告: 升级文件 RS-BMU-BCU.pkg 不存在于 ${root}`)
    } */

    try {
      // 创建 TFTP 服务器
      tftpServer = tftp.createServer({
        host: host,
        port: port,
        root: root,
        denyPUT: true // 禁止上传，仅允许下载
      })

      // 监听服务器错误
      tftpServer.on('error', (error) => {
        console.error('[TFTP] 服务器错误:', error)
        
        // 清理服务器实例
        tftpServer = null
        
        // 根据错误类型返回不同的错误信息
        let errorMessage = ''
        let errorCode = error.code || ''
        
        if (errorCode === 'EADDRNOTAVAIL') {
          // IP地址不可用
          errorMessage = `网卡IP地址 ${host} 不可用。请先将电脑网卡ip设置为 ${host}，然后再启动TFTP服务器。`
        } else if (errorCode === 'EADDRINUSE') {
          // 端口已被占用
          errorMessage = `端口 ${port} 已被占用，请关闭占用该端口的程序或更换端口。`
        } else if (errorCode === 'EACCES') {
          // 权限不足
          errorMessage = `权限不足，无法绑定端口 ${port}。请尝试使用管理员权限运行程序或使用大于1024的端口号。`
        } else {
          // 其他错误
          errorMessage = `TFTP服务器启动失败: ${error.message}`
        }
        
        resolve({
          success: false,
          message: errorMessage,
          errorCode: errorCode
        })
      })

      // 监听请求事件
      tftpServer.on('request', (req, res) => {
        console.log(
          `[TFTP] 收到${req.method}请求: ${req.file} 来自 ${req.stats.remoteAddress}:${req.stats.remotePort}`
        )
        
        // 记录请求的详细信息
        req.on('error', (error) => {
          console.error(`[TFTP] 请求错误 (${req.file}):`, error.message)
        })
        
        // 使用默认的请求处理器
        tftpServer.requestListener(req, res)
      })

      // 监听服务器启动成功
      tftpServer.on('listening', () => {
        console.log(`[TFTP] 服务器已启动: tftp://${host}:${port} (根目录: ${root})`)
        resolve({
          success: true,
          message: `TFTP服务器已启动在 ${host}:${port}`
        })
      })

      // 启动服务器
      tftpServer.listen()
    } catch (err) {
      tftpServer = null
      console.error('[TFTP] 启动失败:', err)
      resolve({
        success: false,
        message: `TFTP服务器启动失败: ${err.message}`
      })
    }
  })
}

/**
 * 停止 TFTP 服务器
 * @returns {Promise<{success: boolean, message?: string}>}
 */
function stopTftpServer() {
  return new Promise((resolve) => {
    console.log('[TFTP] 准备停止服务器', !!tftpServer)
    if (!tftpServer) {
      return resolve({ success: false, message: 'TFTP服务器未在运行' })
    }

    try {
      // 监听 close 事件
      tftpServer.once('close', () => {
        console.log('[TFTP] 服务器已停止')
        tftpServer = null
        resolve({ success: true, message: 'TFTP服务器已停止' })
      })
      
      // 调用 close() - 不接受回调参数
      tftpServer.close()
    } catch (err) {
      console.error('[TFTP] 停止失败:', err)
      tftpServer = null
      resolve({
        success: false,
        message: `TFTP服务器停止失败: ${err.message}`
      })
    }
  })
}

/**
 * 获取 TFTP 服务器状态
 * @returns {{running: boolean}}
 */
function getTftpStatus() {
  return { running: !!tftpServer }
}

/**
 * 设置 TFTP 根目录
 * @param {string} dir - 新的根目录路径
 */
function setTftpRoot(dir) {
  TFTP_ROOT = dir
  // 确保目录存在
  if (!fs.existsSync(TFTP_ROOT)) {
    try {
      fs.mkdirSync(TFTP_ROOT, { recursive: true })
    } catch (err) {
      console.error(`[TFTP] 创建根目录失败: ${err.message}`)
    }
  }
}

/**
 * 获取 TFTP 根目录
 * @returns {string}
 */
function getTftpRoot() {
  return TFTP_ROOT
}

export {
  startTftpServer,
  stopTftpServer,
  getTftpStatus,
  setTftpRoot,
  getTftpRoot
}

