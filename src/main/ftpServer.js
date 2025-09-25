// FTP服务器实现
const FtpSrv = require('ftp-srv')
const fs = require('fs')
const path = require('path')
const net = require('net')
const { ipcMain } = require('electron')

let ftpServer = null
let FTP_ROOT = path.join(process.cwd(), 'upgrade-files')
let mainWindow = null

// 检查端口是否被占用
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(port, (err) => {
      if (err) {
        resolve(true) // 端口被占用
      } else {
        server.once('close', () => resolve(false)) // 端口可用
        server.close()
      }
    })
    server.on('error', () => resolve(true)) // 端口被占用
  })
} 

// 确保升级文件目录存在
if (!fs.existsSync(FTP_ROOT)) {
  fs.mkdirSync(FTP_ROOT, { recursive: true })
}

// 设置主窗口引用
function setMainWindow(window) {
  mainWindow = window
}

// 通知前端文件事件
function notifyFileEvent(eventType, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ftp-file-event', {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    })
  }
}

// 获取文件详细信息
function getFileInfo(filePath, fileName) {
  try {
    const stats = fs.statSync(filePath)
    return {
      fileName,
      filePath,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      isValid: validateUpgradeFile(filePath),
      lastModified: stats.mtime.toISOString(),
      uploadTime: new Date().toISOString()
    }
  } catch (error) {
    return {
      fileName,
      filePath,
      size: 0,
      sizeFormatted: '0 B',
      isValid: false,
      error: error.message,
      uploadTime: new Date().toISOString()
    }
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 验证升级文件
function validateUpgradeFile(filePath) {
  try {
    const stats = fs.statSync(filePath)
    const fileName = path.basename(filePath)

    // 基础验证
    if (stats.size === 0) return false
    if (stats.size > 100 * 1024 * 1024) return false // 限制100MB

    // 文件扩展名验证
    const validExtensions = ['.bin', '.hex', '.fw', '.img', '.dat', '.pkg']
    const ext = path.extname(fileName).toLowerCase()
    if (!validExtensions.includes(ext)) return false

    return true
  } catch (error) {
    return false
  }
}

// 🔥 为连接设置文件事件监听
function setupConnectionFileEvents(connection) {

  // 文件上传事件
  connection.on('STOR', (error, fileName) => {
    if (error) {
      console.error(`[FTP] 文件上传失败: ${fileName}`, error)
      notifyFileEvent('upload-failed', {
        fileName,
        error: error.message,
        timestamp: new Date().toISOString()
      })
      return
    }

    console.log(`[FTP] 文件上传成功: ${fileName}`)

    // 等待文件写入完成后再获取信息
    setTimeout(() => {
      const filePath = path.join(FTP_ROOT, fileName)
      const fileInfo = getFileInfo(filePath, fileName)

      // 添加上传成功标记和详细信息
      const enhancedFileInfo = {
        ...fileInfo,
        uploadMethod: 'FTP',
        uploadSuccess: true,
        deviceAccessible: true, // 标记设备可以访问此文件
        mqttReady: true, // 标记可以通过MQTT指令下载
        uploadTimestamp: new Date().toISOString()
      }

      console.log(`[FTP] 文件信息获取完成: ${fileName}, 大小: ${enhancedFileInfo.sizeFormatted}, 有效: ${enhancedFileInfo.isValid}`)

      // 通知前端
      notifyFileEvent('file-uploaded', enhancedFileInfo)

      // 如果文件有效，发送额外的就绪通知
      if (enhancedFileInfo.isValid) {
        setTimeout(() => {
          notifyFileEvent('file-ready-for-device', {
            fileName,
            message: `文件 "${fileName}" 已就绪，设备可通过MQTT指令下载升级`,
            fileInfo: enhancedFileInfo
          })
        }, 500)
      }
    }, 100) // 等待100ms确保文件写入完成
  })

  // 文件下载事件
  connection.on('RETR', (error, filePath) => {
    if (error) {
      console.error(`[FTP] 文件下载失败: ${filePath}`, error)
      return
    }

    const fileName = path.basename(filePath)
    console.log(`[FTP] 文件下载: ${fileName}`)

    notifyFileEvent('file-downloaded', {
      fileName,
      filePath,
      timestamp: new Date().toISOString()
    })
  })

  // 文件重命名事件
  connection.on('RNTO', (error, fileName) => {
    if (error) {
      console.error(`[FTP] 文件重命名失败: ${fileName}`, error)
      return
    }

    console.log(`[FTP] 文件重命名: ${fileName}`)
    notifyFileEvent('file-renamed', {
      fileName,
      timestamp: new Date().toISOString()
    })
  })
}

// 启动FTP服务器
ipcMain.handle('ftp-start', async (_, { host, port, user, pass }) => {
  try {
    console.log(`[FTP] 尝试启动FTP服务器: ${host}:${port}`)

    // 检查端口是否被占用
    const portInUse = await checkPortInUse(port)
    if (portInUse && !ftpServer) {
      console.log(`[FTP] 端口 ${port} 被其他程序占用`)
      return { success: false, message: `端口 ${port} 被占用，请检查是否有其他FTP服务器在运行` }
    }

    // 如果当前进程已有FTP服务器在运行，先关闭
    if (ftpServer) {
      console.log(`[FTP] 服务器已在运行，先关闭现有服务器`)
      try {
        await ftpServer.close()
        ftpServer = null
        console.log(`[FTP] 已关闭现有服务器`)
        // 等待端口释放
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (closeError) {
        console.error(`[FTP] 关闭现有服务器失败:`, closeError.message)
        ftpServer = null // 强制清理状态
      }
    }

    console.log(`[FTP] 开始启动FTP服务器: ${host}:${port}`)

    ftpServer = new FtpSrv({
      url: `ftp://0.0.0.0:${port}`,
      pasv_url: host,
      pasv_min: 20000,
      pasv_max: 21000,
      anonymous: false,
      greeting: '欢迎使用BAU升级FTP服务器\r\n'
    })

    // 用户认证
    ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
      console.log(`[FTP] 登录尝试: ${username}`)

      if (username !== user || password !== pass) {
        console.log(`[FTP] 登录失败: 凭证错误`)
        return reject(new Error('凭证错误'))
      }

      console.log(`[FTP] 登录成功: ${username}`)

      //  为每个连接添加文件事件监听
      setupConnectionFileEvents(connection)

      return resolve({ root: FTP_ROOT, cwd: '/' })
    })

    // 文件下载优化处理
    ftpServer.on('client-error', ({ connection, context, error }) => {
      console.log(`[FTP] 客户端错误:`, error.message)
    })

    await ftpServer.listen()

    console.log(`[FTP] 服务器启动成功: ${host}:${port}`)
    return { success: true, message: 'FTP服务器启动成功' }

  } catch (error) {
    console.error(`[FTP] 启动失败:`, error.message)
    // 清理状态
    ftpServer = null
    return { success: false, message: `启动失败: ${error.message}` }
  }
})

// 停止FTP服务器
ipcMain.handle('ftp-stop', async () => {
  try {
    if (!ftpServer) {
      return { success: false, message: 'FTP服务器未运行' }
    }

    console.log(`[FTP] 停止FTP服务器`)
    await ftpServer.close()
    ftpServer = null

    console.log(`[FTP] 服务器停止成功`)
    return { success: true, message: 'FTP服务器停止成功' }

  } catch (error) {
    console.error(`[FTP] 停止失败:`, error.message)
    // 确保状态清理
    ftpServer = null
    return { success: false, message: `停止失败: ${error.message}` }
  }
})

// 查询FTP服务器状态
ipcMain.handle('ftp-status', async () => {
  const isRunning = ftpServer !== null
  return { 
    success: true, 
    isRunning,
    message: isRunning ? 'FTP服务器运行中' : 'FTP服务器未运行'
  }
})

// 选择FTP根目录
ipcMain.handle('choose-default-FTP-dir', async () => {
  const { dialog } = require('electron')
  
  const result = await dialog.showOpenDialog({
    title: '选择FTP根目录',
    properties: ['openDirectory']
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    FTP_ROOT = result.filePaths[0]
    console.log(`[FTP] 根目录已更改为: ${FTP_ROOT}`)
    return { success: true, path: FTP_ROOT }
  }
  
  return { success: false, message: '未选择目录' }
})

// 获取FTP根目录
ipcMain.handle('get-ftp-root', async () => {
  return { success: true, path: FTP_ROOT }
})

//  获取FTP文件列表
ipcMain.handle('ftp-get-files', async () => {
  try {
    const files = fs.readdirSync(FTP_ROOT)
    const fileList = files.map(fileName => {
      const filePath = path.join(FTP_ROOT, fileName)
      return getFileInfo(filePath, fileName)
    })

    return { success: true, files: fileList }
  } catch (error) {
    console.error('[FTP] 获取文件列表失败:', error)
    return { success: false, message: error.message, files: [] }
  }
})

//  删除FTP文件
ipcMain.handle('ftp-delete-file', async (_, fileName) => {
  try {
    const filePath = path.join(FTP_ROOT, fileName)
    fs.unlinkSync(filePath)

    console.log(`[FTP] 文件删除成功: ${fileName}`)
    notifyFileEvent('file-deleted', { fileName })
    return { success: true, message: '文件删除成功' }
  } catch (error) {
    console.error(`[FTP] 文件删除失败: ${fileName}`, error)
    return { success: false, message: error.message }
  }
})

//  验证FTP文件
ipcMain.handle('ftp-validate-file', async (_, fileName) => {
  try {
    const filePath = path.join(FTP_ROOT, fileName)
    const isValid = validateUpgradeFile(filePath)
    const fileInfo = getFileInfo(filePath, fileName)

    return {
      success: true,
      isValid,
      fileInfo,
      message: isValid ? '文件验证通过' : '文件验证失败'
    }
  } catch (error) {
    console.error(`[FTP] 文件验证失败: ${fileName}`, error)
    return { success: false, message: error.message, isValid: false }
  }
})

export {
  ftpServer as getFtpServer,
  FTP_ROOT as getFtpRoot,
  setMainWindow
}

// 为了兼容性，也保留CommonJS导出
module.exports = {
  getFtpServer: () => ftpServer,
  getFtpRoot: () => FTP_ROOT,
  setMainWindow
}
