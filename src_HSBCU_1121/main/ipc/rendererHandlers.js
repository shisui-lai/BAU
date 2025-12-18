;('use strict')
import { app, ipcMain, dialog } from 'electron'
import { join, basename, parse } from 'path'
const { FtpSrv } = require('ftp-srv')
const os = require('os')
const fs = require('fs')
import { aboutWin } from '../createWindow/createAboutWindow'
import { ipQueryHandler } from '../udp/ipQuery'
import { addressAdaptHandler } from '../udp/addressAdapt'
import { startForceUpgrade, stopForceUpgrade, getUpgradeStatus } from '../udp/forceUpgrade.js'
import {
  startTftpServer,
  stopTftpServer,
  getTftpStatus,
  setTftpRoot,
  getTftpRoot
} from '../tftp/tftpServer.js'
// 创建一个对象变量
let modbusClient = []
let ftpServer = null
let DEFAULT_EXPORT_DIR = join(process.cwd(), 'EventExports')
let FTP_ROOT = join(process.cwd(), 'upgrade-files')
let TFTP_ROOT = join(process.cwd(), 'upgrade-files')

// 添加modbusTask状态变量
let modbusTaskRestartCount = 0
const MAX_RESTART_ATTEMPTS = 3

// 导出函数用于更新重启计数
export function updateModbusTaskRestartCount(count) {
  modbusTaskRestartCount = count
}

export function getModbusTaskRestartCount() {
  return modbusTaskRestartCount
}

export function registerRendererIpc(modbusTask) {
  // --- 新增：pending 请求映射 ---
  const pending = new Map() // key: requestId, value: { resolve, reject }

  // **集中**注册一次 message/error 分发器
  modbusTask.on('message', (msg) => {
    if (msg.requestId && pending.has(msg.requestId)) {
      const { resolve } = pending.get(msg.requestId)
      resolve(msg.data ?? msg) // 有的消息直接在 msg.data
      pending.delete(msg.requestId)
    }
  })

  // 改进错误处理：当子进程异常时清理所有pending请求
  modbusTask.on('error', (err) => {
    console.error('ModbusTask子进程错误:', err)
    // 全部 reject，并清空
    for (const { reject } of pending.values()) {
      reject(new Error(`IPC通道关闭: ${err.message}`))
    }
    pending.clear()
  })

  // 新增：监听子进程退出事件
  modbusTask.on('exit', (code, signal) => {
    console.warn(`ModbusTask子进程退出，代码: ${code}, 信号: ${signal}`)
    // 清理所有pending请求
    for (const { reject } of pending.values()) {
      reject(new Error(`子进程已退出 (代码: ${code}, 信号: ${signal})`))
    }
    pending.clear()
  })

  // 新增：监听子进程断开连接事件
  modbusTask.on('disconnect', () => {
    console.warn('ModbusTask子进程断开连接')
    // 清理所有pending请求
    for (const { reject } of pending.values()) {
      reject(new Error('子进程连接已断开'))
    }
    pending.clear()
  })
  ipcMain.on('about-window-close', () => {
    console.log('about-window-close')
    if (aboutWin) aboutWin.close()
  })
  ipcMain.handle('write-modbus-registers', async (event, writeData) => {
    const requestId = writeData.requestId ?? Date.now() + Math.random()
    modbusTask.send({ API: 'write-modbus-registers from main', data: writeData, requestId })
    // 等待子进程响应
    const msg = await new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject })
    })
    return {
      ip: msg.ip,
      success: msg.success,
      error: msg.error
    }
  })

  ipcMain.on('start-reading-data', (event, { action, targetIp }) => {
    if (!modbusTask) {
      console.error('modbusTask is uninit')
      return
    }

    // 直接发送消息给子进程，让子进程处理所有客户端
    // 避免主进程和子进程的客户端列表不同步问题
    modbusTask.send({
      API: action === 'start' ? 'start-all' : 'stop-all',
      targetIp: targetIp
    })
  })
  ipcMain.on('force-reconnect-devices', (event, { ips }) => {
    modbusTask.send({
      API: 'forceReconnect',
      ips: ips
    })
  })
  ipcMain.on('start-reading-data-params', (event, { module }) => {
    /*     console.log('主进程读取配置参数客户端: ', modbusClient) */
    // 向子进程发送开始读取的信号
    if (modbusTask) {
      /* console.log(`开始参数读取${module}`) */

      modbusClient.forEach((client) => {
        if (!client) {
          console.error('客户端未初始化，无法读取参数')
          return
        }
        modbusTask.send({ API: 'startReadParams', client, module })
      })
    } else {
      console.error('modbusTask is uninit')
    }
  })
  ipcMain.on('stop-reading-data-params', (event, { module }) => {
    // 向子进程发送停止读取的信号
    if (modbusTask) {
      /*  console.log('send stop to modbusTask') */
      modbusClient.forEach((client) => {
        if (!client) {
          console.error('客户端未初始化，无法读取参数')
          return
        }
        modbusTask.send({ API: 'stopReadParams', client, module })
      })
    } else {
      console.error('modbusTask is uninit')
    }
  })
  ipcMain.on('set-default-export-dir', (event, dir) => {
    DEFAULT_EXPORT_DIR = dir
    // 在 Windows 上，parse(dir).root === 'D:\\' 当 dir === 'D:\\' 时
    const isRoot = parse(dir).root === dir
    if (!isRoot) {
      try {
        fs.mkdirSync(DEFAULT_EXPORT_DIR, { recursive: true })
      } catch (err) {
        console.error(`创建导出目录 "${DEFAULT_EXPORT_DIR}" 失败：`, err)
        // 如果错误码是 EPERM（根目录不允许创建），就忽略；否则重新抛出
        if (err.code !== 'EPERM') {
          throw err
        }
      }
    }
    event.sender.send('export-dir-updated', dir)
  })
  ipcMain.on('start-reading-data-event', (event, data) => {
    const { offsetRead, totalRead, ip } = data
    // 使用默认目录，无需弹窗
    const saveDir = DEFAULT_EXPORT_DIR

    console.log(`使用默认导出目录: ${saveDir}`)
    // 通知渲染进程：导出开始，显示目录
    event.sender.send('export-started', saveDir)

    // 发送给子进程
    modbusTask.send({
      API: 'startReadEvent',
      data: { offsetRead, totalRead, ip, saveDir }
    })
  })
  ipcMain.on('cancelExport', (event, data) => {
    const { ip } = data
    modbusTask.send({
      API: 'cancelExportEvent',
      data: { ip }
    })
  })
  ipcMain.handle('get-default-export-dir', () => DEFAULT_EXPORT_DIR)
  ipcMain.handle('choose-default-export-dir', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: DEFAULT_EXPORT_DIR
    })
    return canceled ? null : filePaths[0]
  })
  ipcMain.on('stop-reading-data', (event, { action, targetIp }) => {
    let clientsToProcess = []
    if (targetIp === 'all') {
      clientsToProcess = modbusClient // 全部设备
    } else {
      const client = modbusClient.find((c) => c.ModbusServerIP === targetIp)
      if (client) clientsToProcess.push(client) // 单个设备
    }
    // 向子进程发送停止读取的信号
    if (modbusTask) {
      /*  console.log('send stop to modbusTask') */
      clientsToProcess.forEach((client) => {
        modbusTask.send({ API: action, client })
      })
    } else {
      console.error('modbusTask is uninit')
    }
  })

  ipcMain.on('send-modbus-parameters', (event, parameters) => {
    /*  console.log('send modbus parameters to modbusTask, parameters: ', parameters) */
    modbusTask.send({ API: 'modbus-write', parameters })
  })
  ipcMain.on('update-modbus-clients', (event, updatedClients) => {
    /*     const newOnes = updatedClients.filter(
      (c) => !modbusClient.some((x) => x.ModbusServerIP === c.ModbusServerIP)
    )
    if (newOnes.length) {
      modbusClient.push(...newOnes)
      modbusTask.send({ API: 'modbus-init-batch', clients: newOnes })
    }
    console.log('Updated Modbus Clients:', modbusClient) */

    // 无论 newOnes 还是老 IP，都要发 batch
    modbusClient.push(
      ...updatedClients.filter(
        (c) => !modbusClient.some((x) => x.ModbusServerIP === c.ModbusServerIP)
      )
    )
    // 这里直接发
    modbusTask.send({ API: 'modbus-init-batch', clients: updatedClients })
    console.log('Updated Modbus Clients:', modbusClient)
  })
  ipcMain.on('disconnect', (event, { ip }) => {
    /*  console.log(`请求断开连接: ${ip}`) */
    modbusClient = modbusClient.filter((c) => c.ModbusServerIP !== ip) // 删除指定客户端
    /* console.log('断开后客户端列表', modbusClient) */
    modbusTask.send({ API: 'modbus-disconnect', client: { ModbusServerIP: ip } })
  })

  // 批量断开所有Modbus连接（用于自适应前）
  ipcMain.handle('disconnect-all-modbus', async (event) => {
    console.log('批量断开所有Modbus连接')
    const ips = modbusClient.map((c) => c.ModbusServerIP)
    modbusClient = [] // 清空客户端列表

    // 发送批量断开命令给子进程
    modbusTask.send({ API: 'modbus-disconnect-all', ips })

    // 等待一段时间确保所有连接都已断开
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log('所有Modbus连接已断开')
    return { success: true, disconnectedCount: ips.length }
  })

  ipcMain.handle('read-control-registers', (event, { ip }) => {
    const requestId = Date.now() + Math.random()
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject })
      modbusTask.send({ API: 'read-control-registers-fromMain', ip, requestId })
    })
  })

  ipcMain.handle('read-soc-params', (event, { ip }) => {
    const requestId = Date.now() + Math.random()
    return new Promise((resolve, reject) => {
      // 添加超时机制
      const timeout = setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId)
          reject(new Error('读取SOC参数超时'))
        }
      }, 5000) // 5秒超时

      pending.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeout)
          resolve(data)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })
      modbusTask.send({ API: 'read-soc-params-fromMain', ip, requestId })
    })
  })
  ipcMain.handle('get-export-status', (event, { ip }) => {
    const requestId = Date.now() + Math.random()
    // 返回一个 Promise，直接存到 pending 里
    return new Promise((resolve, reject) => {
      // 添加超时机制
      const timeout = setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId)
          reject(new Error('获取导出状态超时'))
        }
      }, 5000) // 5秒超时

      pending.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeout)
          resolve(data)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })

      // 检查modbusTask是否可用
      if (!modbusTask || modbusTask.killed) {
        clearTimeout(timeout)
        pending.delete(requestId)
        reject(new Error('ModbusTask子进程不可用'))
        return
      }

      modbusTask.send({ API: 'get-export-status-fromMain', ip, requestId })
    })
  })
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
  ipcMain.on('startExport', (event) => {
    modbusClient.forEach((client) => {
      modbusTask.send({ API: 'startExportFromMain', client })
    })
  })
  ipcMain.on('stopExport', (event) => {
    modbusClient.forEach((client) => {
      modbusTask.send({ API: 'stopExportFromMain', client })
    })
  })
  ipcMain.on('startBufferExport', (event) => {
    modbusClient.forEach((client) => {
      modbusTask.send({ API: 'startBufferExportFromMain', client })
    })
  })
  ipcMain.on('stopBufferExport', (event) => {
    modbusClient.forEach((client) => {
      modbusTask.send({ API: 'stopBufferExportFromMain', client })
    })
  })
  ipcMain.handle('ftp-start', async (_, { host, port, user, pass }) => {
    if (ftpServer) return { success: false, message: '已在运行' }

    ftpServer = new FtpSrv({
      url: `ftp://0.0.0.0:${port}`,
      pasv_url: host,
      pasv_min: 20000,
      pasv_max: 21000,
      anonymous: false,
      greeting: '欢迎使用自定义FTP 服务器\r\n'
    })
    // 全局监听：当客户端发起新连接时，可以检查并发数，并且可用于调试
    ftpServer.on('connection', (connection) => {
      /* console.log(`🔗 新连接: ${connection.ip}:${connection.socket.remotePort}`) */
    })
    /* console.log('ftpServer:', ftpServer) */
    // 登录验证逻辑
    ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
      // 1. 先把所有命令LOG监听绑上
      connection.on('command', (cmd) => {
        // 格式: cmd.command → 原始命令名, cmd.args → 参数
        /*  console.log(`[FTP][${connection.ip}] CMD -> ${cmd.command} ${cmd.args ?? ''}`) */
      })

      connection.on('STOR', (filePath) => {
        /*  console.log(`[FTP][${connection.ip}] STOR 开始上传: ${filePath}`) */
      })
      connection.on('RETR', (filePath) => {
        // `filePath` 在有时会是 null，只能靠上层命令日志来定位真实路径
        /*  console.log(`[FTP][${connection.ip}] RETR 回调, path = ${filePath}`) */
      })

      connection.on('PASV', ({ ip, port }) => {
        /* console.log(`[FTP][${connection.ip}] PASV 模式分配: ${ip}:${port}`) */
      })

      connection.on('client-error', ({ context, error }) => {
        /*  console.error(`[FTP][${connection.ip}] 客户端错误 (${context}) →`, error) */
      })

      connection.on('error', (err) => {
        /* console.error(`[FTP][${connection.ip}] 底层 socket 错误 →`, err) */
      })

      connection.on('close', () => {
        /*  console.log(`🔌 连接关闭: ${connection.ip}`) */
      })

      // 2. 校验用户名/密码
      if (username !== user || password !== pass) {
        console.warn(`[FTP] 登录失败: 无效凭证 (${username})`)
        return reject(new Error('凭证错误'))
      }

      /*  console.log(`🔑 用户登录成功: ${username} (${connection.ip})`) */
      // 3. 验证通过后，指明根目录
      return resolve({ root: FTP_ROOT, cwd: '/' })
    })
    // 简单的账号认证
    ftpServer.on('disconnect', ({ connection, id, newConnectionCount }) => {
      /*  console.log(
        `🔌 Client disconnected: ${connection.ip}, connectionId=${id}, remaining=${newConnectionCount}`
      ) */
    })
    ftpServer.on('client-error', ({ connection, context, error }) => {
      console.error(`❗ Client error on ${connection.ip} [${context}]:`, error)
    })
    ftpServer.on('server-error', ({ error }) => {
      console.error('🚨 FTP Server Error:', error)
    })
    // 4. 特殊处理 RETR：加 0–50ms 随机抖动，并打印“150 → 226”日志
    ftpServer.on('client:connection', (connection) => {
      // “client:connection” 事件里拿到的是完整的 FTPConnection
      connection.on('command', (cmd) => {
        // 检测 “BCU 有的固件会直接用 RETR <filename> 发送文件名”
        if (cmd.command === 'RETR') {
          const filename = (cmd.args || '').trim()
          const fullPath = path.join(FTP_ROOT, filename)

          // 把默认的 RETR 行为 Override
          connection.reply(150, '正在准备传输…') // 先发给客户端 “150” ，消费者可能需要
          /* console.log(`[FTP][${connection.ip}] 收到 RETR ${filename} → 先回复 150`) */

          // 随机 0–50ms 后再真正 open & stream
          const jitter = Math.floor(Math.random() * 50)
          setTimeout(() => {
            if (!fs.existsSync(fullPath)) {
              console.warn(`[FTP][${connection.ip}] 文件不存在: ${filename}`)
              // 550 错误码告诉客户端 “文件找不到”
              return connection.reply(550, 'File not found')
            }

            // 打开文件流
            const fileStream = fs.createReadStream(fullPath)
            fileStream.on('open', () => {
              /* console.log(`[FTP][${connection.ip}] 文件 ${filename} 已打开，开始发送数据`) */
              // 125 / 150 都表示 “开启数据连接”
              // 大部分固件看到 150 就开始收，125 也是合法。
              // 这里再发一次 125，保证客户端能收到一个“数据连接已打开”的提示
              connection.reply(125, '数据通道已打开，正在传输…')
            })
            fileStream.on('end', () => {
              /*               console.log(`[FTP][${connection.ip}] 文件 ${filename} 读取完毕，发送 226`)
               */ connection.reply(226, 'Transfer complete')
            })
            fileStream.on('error', (err) => {
              console.error(`[FTP][${connection.ip}] 读取文件出错: ${err.message}`)
              connection.reply(551, '读取文件出错')
            })

            // 真正 pipe 到客户端数据通道
            fileStream.pipe(connection.streaming)
          }, jitter)
        }
      })
    })

    try {
      await ftpServer.listen()
      ftpServer.server.maxConnections = 4096
      ftpServer.server.keepAliveTimeout = 20000 // 20 秒的 keep-alive
      console.log(`[FTP] 服务器已启动: ftp://${host}:${port} (根目录: ${FTP_ROOT})`)
      return { success: true }
    } catch (err) {
      ftpServer = null
      return { success: false, message: err.message }
    }
  })
  ipcMain.on('set-default-FTP-dir', (event, dir) => {
    FTP_ROOT = dir
    const isRoot = parse(dir).root === dir
    if (!isRoot) {
      try {
        fs.mkdirSync(FTP_ROOT, { recursive: true })
      } catch (err) {
        console.error(`创建导出目录 "${FTP_ROOT}" 失败：`, err)
        // 如果错误码是 EPERM（根目录不允许创建），就忽略；否则重新抛出
        if (err.code !== 'EPERM') {
          throw err
        }
      }
    }
  })
  ipcMain.handle('ftp-stop', async () => {
    if (!ftpServer) return { success: false, message: '未在运行' }
    await ftpServer.close()
    ftpServer = null
    return { success: true }
  })
  ipcMain.handle('ftp-status', () => {
    return { running: !!ftpServer }
  })
  // 新增：打开系统文件对话框，让用户选一个文件
  ipcMain.handle('show-open-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '选择升级文件',
      defaultPath: FTP_ROOT,
      properties: ['openFile']
    })
    if (canceled || !filePaths.length) {
      return { canceled: true }
    }
    const fullPath = filePaths[0]
    // 可选：把目标文件拷贝到 FTP_ROOT 下
    const fileName = basename(fullPath)
    const dst = join(FTP_ROOT, fileName)
    // 如果想自动拷贝到 upgrade-files 文件夹就解开下面注释：
    // await fs.promises.copyFile(fullPath, dst);
    return {
      canceled: false,
      fullPath,
      fileName
    }
  })
  ipcMain.handle('choose-default-FTP-dir', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: FTP_ROOT
    })
    return canceled ? null : filePaths[0]
  })
  ipcMain.handle('get-default-FTP-dir', () => FTP_ROOT)
  // 获取本机IP 地址
  // 获取所有可用网卡的列表
  ipcMain.handle('get-network-interfaces', () => {
    const interfaces = os.networkInterfaces()
    const result = []

    for (const name in interfaces) {
      for (const net of interfaces[name]) {
        // 只需要IPv4且非内部地址的网卡
        if (net.family === 'IPv4' && !net.internal) {
          result.push({ name, address: net.address })
        }
      }
    }
    return result
  })
  ipcMain.on('udp-query-ip', (event, { selectedInterface, selectedInterfaceName }) =>
    ipQueryHandler(event, { selectedInterface, selectedInterfaceName })
  )
  ipcMain.on('address-adapt', (event, { addressStart, numBCU, selectedInterface }) =>
    addressAdaptHandler(event, { addressStart, numBCU, selectedInterface })
  )
  ipcMain.handle('exportParam-csv', async (event, { csv, fileName }) => {
    // 弹出"保存为"对话框
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出参数为 CSV',
      defaultPath: fileName,
      filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
    })

    if (canceled || !filePath) {
      // 用户取消
      throw new Error('用户取消导出')
    }

    // 写入磁盘
    await fs.promises.writeFile(filePath, csv, 'utf8')

    // 返回最终保存路径
    return filePath
  })

  ipcMain.handle('exportParam-excel', async (event, { buffer, fileName }) => {
    // 弹出"保存为"对话框
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出参数为 Excel',
      defaultPath: fileName,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
    })

    if (canceled || !filePath) {
      // 用户取消
      throw new Error('用户取消导出')
    }

    // 将数组转换为 Buffer 并写入磁盘
    await fs.promises.writeFile(filePath, Buffer.from(buffer))

    // 返回最终保存路径
    return filePath
  })
  ipcMain.handle('exportParam-csv-powerMap', async (event, { csv, fileName }) => {
    // 弹出“保存为”对话框
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出参数为 CSV',
      defaultPath: fileName,
      filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
    })

    if (canceled || !filePath) {
      // 用户取消
      throw new Error('用户取消导出')
    }

    // 写入磁盘
    await fs.promises.writeFile(filePath, csv, 'utf8')

    // 返回最终保存路径
    return filePath
  })
  ipcMain.handle('exportParam-csv-ivCail', async (event, { csv, fileName }) => {
    // 弹出“保存为”对话框
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出参数为 CSV',
      defaultPath: fileName,
      filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
    })

    if (canceled || !filePath) {
      // 用户取消
      throw new Error('用户取消导出')
    }

    // 写入磁盘
    await fs.promises.writeFile(filePath, csv, 'utf8')

    // 返回最终保存路径
    return filePath
  })

  // 内存监控相关IPC
  ipcMain.handle('get-memory-usage', () => {
    const usage = process.memoryUsage()
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round((usage.arrayBuffers || 0) / 1024 / 1024), // MB
      usageRatio: Math.round((usage.heapUsed / usage.heapTotal) * 100) // 百分比
    }
  })

  ipcMain.handle('force-gc', () => {
    if (global.gc) {
      global.gc()
      return { success: true, message: '垃圾回收已执行' }
    } else {
      return { success: false, message: '垃圾回收不可用' }
    }
  })

  // 新增：检查modbusTask状态
  ipcMain.handle('check-modbus-task-status', () => {
    return {
      alive: !!(modbusTask && !modbusTask.killed),
      restartCount: modbusTaskRestartCount,
      maxRestartAttempts: MAX_RESTART_ATTEMPTS
    }
  })

  // 新增：更新modbusTask重启计数
  ipcMain.handle('update-modbus-task-restart-count', (event, count) => {
    modbusTaskRestartCount = count
    return { success: true }
  })

  // 新增：监听重启计数更新事件
  ipcMain.on('modbus-task-restart-count-updated', (event, count) => {
    modbusTaskRestartCount = count
    console.log(`ModbusTask重启计数已更新: ${count}`)
  })

  // ==================== TFTP 强制升级相关 IPC ====================

  // 启动 TFTP 服务器
  ipcMain.handle('tftp-start', async (_, { host, port }) => {
    return await startTftpServer(host, port, TFTP_ROOT)
  })

  // 停止 TFTP 服务器
  ipcMain.handle('tftp-stop', async () => {
    return await stopTftpServer()
  })

  // 获取 TFTP 服务器状态
  ipcMain.handle('tftp-status', () => {
    return getTftpStatus()
  })

  // 设置 TFTP 根目录
  ipcMain.on('set-default-TFTP-dir', (event, dir) => {
    TFTP_ROOT = dir
    setTftpRoot(dir)
    const isRoot = parse(dir).root === dir
    if (!isRoot) {
      try {
        fs.mkdirSync(TFTP_ROOT, { recursive: true })
      } catch (err) {
        console.error(`创建TFTP目录 "${TFTP_ROOT}" 失败：`, err)
        if (err.code !== 'EPERM') {
          throw err
        }
      }
    }
  })

  // 获取 TFTP 根目录
  ipcMain.handle('get-default-TFTP-dir', () => TFTP_ROOT)

  // 选择 TFTP 根目录
  ipcMain.handle('choose-default-TFTP-dir', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: TFTP_ROOT
    })
    return canceled ? null : filePaths[0]
  })

  // 选择升级文件（必须是RS-BMU-BCU.pkg）
  ipcMain.handle('select-tftp-upgrade-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '选择TFTP升级文件（必须为RS-BMU-BCU.pkg）',
      defaultPath: TFTP_ROOT,
      properties: ['openFile'],
      filters: [
        { name: 'BCU升级包', extensions: ['pkg', 'bin', 'hex'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    if (canceled || !filePaths.length) {
      return { canceled: true }
    }
    const fullPath = filePaths[0]
    const fileName = basename(fullPath)

    // 验证文件名必须为 RS-BMS-BCU.pkg
    if (fileName !== 'RS-BMS-BCU.pkg') {
      return {
        canceled: false,
        fullPath,
        fileName,
        error: true,
        message: '文件名必须为 RS-BMS-BCU.pkg'
      }
    }

    // 设置TFTP根目录为文件所在目录
    const fileDir = parse(fullPath).dir
    TFTP_ROOT = fileDir
    setTftpRoot(fileDir)

    return {
      canceled: false,
      fullPath,
      fileName,
      fileDir,
      success: true
    }
  })

  // 开始强制升级（发送 UDP 指令）
  ipcMain.on('start-force-upgrade', (event, { targetIp, localInterface }) => {
    startForceUpgrade(event, { targetIp, localInterface })
  })

  // 停止强制升级
  ipcMain.on('stop-force-upgrade', () => {
    stopForceUpgrade()
  })

  // 获取强制升级状态
  ipcMain.handle('get-force-upgrade-status', () => {
    return getUpgradeStatus()
  })
}
export { DEFAULT_EXPORT_DIR, FTP_ROOT }
