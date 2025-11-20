import { app, Menu, shell, BrowserWindow, ipcMain, dialog, screen, session, powerMonitor } from 'electron'
import { join, parse } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
const { fork } = require('child_process')
import { processManager } from './handlers/processManager.js'
import crashLogger from './crashLogger.js'
// FTP服务器功能将在下面通过require导入
import {
  // 网卡选择功能相关处理器 - 统一BAU操作方式
  handleGetNetworkInterfaces,
  handleQueryIpWithInterface,
  handleQueryMqttWithInterface,
  handleSetIpWithInterface,
  handleSetMqttWithInterface,
  handleResetDefaultWithInterface,
  handleResetDeviceWithInterface,
  handleForceUpgradeWithInterface,
  // TFTP和强制升级相关处理器
  startTftpServer,
  stopTftpServer,
  getTftpStatus,
  setTftpRoot,
  getTftpRoot,
  getTftpDefaultIp,
  startForceUpgrade,
  stopForceUpgrade,
  getForceUpgradeStatus
} from './handlers/bauAddressHandler.js'//地址探测

let mainWindow
let quitting = false;
import forkPath1 from './mqtt.js?modulePath'

// 默认导出目录
let DEFAULT_EXPORT_DIR = join(process.cwd(), 'EventExports')

// MQTT子进程将在createWindow函数中通过进程管理器启动
console.log('[Main] 准备使用进程管理器管理MQTT子进程...')

// 文件选择对话框
ipcMain.handle('show-open-dialog', async () => {
  // 获取FTP根目录作为默认路径
  const ftpRoot = ftpServerModule.getFtpRoot()
  
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择升级文件',
    properties: ['openFile'],
    defaultPath: ftpRoot  // 使用FTP根目录作为默认路径
  })

  if (!canceled && filePaths.length > 0) {
    const path = require('path')
    return {
      canceled: false,
      fullPath: filePaths[0],
      fileName: path.basename(filePaths[0])
    }
  }

  return { canceled: true }
})

// Dialog API - 通用对话框接口
ipcMain.handle('dialog:showOpenDialog', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow || BrowserWindow.getFocusedWindow(), {
    ...options,
    properties: options.properties || ['openFile']
  })
  return result
})

// 升级功能已简化，复用现有的mqttPublish接口，无需专门的IPC处理器

// IPC 通道：前端调用获取当前语言
ipcMain.handle('get-locale', () => {
  return store.get('locale')
})

// IPC 通道：前端调用设置新语言
ipcMain.handle('set-locale', (_event, locale) => {
  store.set('locale', locale)
})

// 引入FTP服务器模块 - 在MQTT初始化之后
import * as ftpServerModule from './ftpServer.js'


// ==================== 崩溃错误捕获系统 ====================
// 捕获主进程未捕获的异常
process.on('uncaughtException', (err) => {
  // 静默处理某些已知的无害错误
  if (err?.message?.includes('Object has been destroyed')) {
    console.warn('[UNCAUGHT] Object已销毁错误（已忽略）:', err.message)
    return
  }

  // 记录崩溃日志
  console.error('[UNCAUGHT EXCEPTION] 捕获到未处理的异常:', err)
  crashLogger.logCrash(err, 'uncaughtException')

  // 对于严重错误，可以选择退出应用
  // 注意：某些错误可能不需要退出，需要根据实际情况判断
  if (err?.code === 'ERR_ASSERTION' || err?.name === 'Error') {
    console.error('[UNCAUGHT EXCEPTION] 严重错误，应用将在3秒后退出...')
    setTimeout(() => {
      app.exit(1)
    }, 3000)
  }
})

// 捕获主进程未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION] 捕获到未处理的Promise拒绝:', reason)

  // 将Promise拒绝转换为Error对象以便记录
  const error = reason instanceof Error ? reason : new Error(String(reason))
  crashLogger.logCrash(error, 'unhandledRejection')
})

// 捕获多重Promise拒绝（已处理但又被拒绝的Promise）
process.on('rejectionHandled', (promise) => {
  console.warn('[REJECTION HANDLED] Promise拒绝已被延迟处理')
})

// 监听进程警告
process.on('warning', (warning) => {
  console.warn('[PROCESS WARNING]', warning.name, warning.message)
  console.warn('[PROCESS WARNING] Stack:', warning.stack)
})

// 捕获渲染进程崩溃（最常见的闪退原因！）
app.on('render-process-gone', (event, webContents, details) => {
  console.error('[RENDER PROCESS GONE] 渲染进程崩溃!', details)
  
  const error = new Error(`渲染进程崩溃: ${details.reason}`)
  error.exitCode = details.exitCode
  error.reason = details.reason
  
  crashLogger.logCrash(error, 'render-process-gone')
  
  // 如果是主窗口崩溃，尝试重新加载
  if (mainWindow && webContents === mainWindow.webContents) {
    console.error('[RENDER PROCESS GONE] 主窗口崩溃，尝试重新加载...')
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload()
      }
    }, 1000)
  }
})

// 捕获子进程崩溃（包括GPU进程等）
app.on('child-process-gone', (event, details) => {
  console.error('[CHILD PROCESS GONE] 子进程崩溃!', details)
  
  const error = new Error(`子进程崩溃: ${details.type} - ${details.reason}`)
  error.exitCode = details.exitCode
  error.reason = details.reason
  error.processType = details.type
  error.serviceName = details.serviceName || 'unknown'
  
  crashLogger.logCrash(error, 'child-process-gone')
  
  // GPU进程崩溃时的特殊处理
  if (details.type === 'GPU') {
    console.error('[CHILD PROCESS GONE] GPU进程崩溃，可能需要禁用硬件加速')
  }
})

// ==================== Windows系统级别终止信号监听 ====================
// 捕获Windows系统强制终止应用的情况
// 这些信号可能来自：任务管理器、系统关机、资源不足、防病毒软件等

// SIGTERM - 系统请求终止（最常见）
process.on('SIGTERM', () => {
  console.error('[SIGTERM] 收到系统终止信号！应用即将被强制关闭')
  
  const error = new Error('应用被系统强制终止 (SIGTERM)')
  error.signal = 'SIGTERM'
  error.source = 'Windows系统或任务管理器'
  
  // 使用同步方式立即记录日志，因为进程即将被强制终止
  crashLogger.logCrash(error, 'system-sigterm')
  
  // 尝试清理资源
  crashLogger.stopResourceMonitoring()
  
  console.error('[SIGTERM] 日志已记录，进程即将退出')
  process.exit(0)
})

// SIGINT - 中断信号（Ctrl+C，或系统中断）
process.on('SIGINT', () => {
  console.error('[SIGINT] 收到中断信号！')
  
  const error = new Error('应用被中断 (SIGINT)')
  error.signal = 'SIGINT'
  error.source = 'Ctrl+C或系统中断'
  
  crashLogger.logCrash(error, 'system-sigint')
  crashLogger.stopResourceMonitoring()
  
  console.error('[SIGINT] 日志已记录，进程即将退出')
  process.exit(0)
})

// SIGBREAK - Windows特有的中断信号（Ctrl+Break）
if (process.platform === 'win32') {
  process.on('SIGBREAK', () => {
    console.error('[SIGBREAK] 收到Windows中断信号！')
    
    const error = new Error('应用被中断 (SIGBREAK - Windows)')
    error.signal = 'SIGBREAK'
    error.source = 'Windows Ctrl+Break'
    
    crashLogger.logCrash(error, 'system-sigbreak')
    crashLogger.stopResourceMonitoring()
    
    console.error('[SIGBREAK] 日志已记录，进程即将退出')
    process.exit(0)
  })
}

// SIGHUP - 挂起信号（终端关闭、SSH断开等）
process.on('SIGHUP', () => {
  console.error('[SIGHUP] 收到挂起信号！')
  
  const error = new Error('应用收到挂起信号 (SIGHUP)')
  error.signal = 'SIGHUP'
  error.source = '终端关闭或连接断开'
  
  crashLogger.logCrash(error, 'system-sighup')
  crashLogger.stopResourceMonitoring()
  
  console.error('[SIGHUP] 日志已记录，进程即将退出')
  process.exit(0)
})

// 监听系统电源事件（休眠、睡眠、关机等）
powerMonitor.on('shutdown', (e) => {
  console.error('[POWER] 系统正在关机！')
  
  // 阻止立即关机，给我们时间记录日志
  e.preventDefault()
  
  const error = new Error('系统关机导致应用终止')
  error.signal = 'shutdown'
  error.source = 'Windows系统关机'
  
  // 同步记录日志
  crashLogger.logCrash(error, 'system-shutdown')
  crashLogger.stopResourceMonitoring()
  
  console.error('[POWER] 关机日志已记录')
  
  // 立即退出，让系统继续关机流程
  setTimeout(() => {
    app.exit(0)
  }, 100)
})

// 监听系统休眠/睡眠
powerMonitor.on('suspend', () => {
  console.warn('[POWER] 系统正在进入休眠/睡眠状态')
  
  const error = new Error('系统休眠前记录状态')
  error.signal = 'suspend'
  error.source = 'Windows系统休眠/睡眠'
  
  // 记录休眠前的状态（不退出应用）
  crashLogger.logCrash(error, 'system-suspend')
})

// 监听系统从休眠/睡眠恢复
powerMonitor.on('resume', () => {
  console.log('[POWER] 系统已从休眠/睡眠恢复')
})

// 监听系统锁定（用户注销/锁屏）
powerMonitor.on('lock-screen', () => {
  console.log('[POWER] 系统已锁定（用户锁屏/注销）')
})

// 监听系统解锁
powerMonitor.on('unlock-screen', () => {
  console.log('[POWER] 系统已解锁')
})
// ====================================================================

// ------------ 多语言偏好存储 ------------
let store
async function initStore() {
  const mod = await import('electron-store')
  const Store = mod.default
  store = new Store({ defaults: { locale: 'zh' } })
}

// ==================== 硬件加速优化（Linux环境） ====================
// 在Linux环境下启用GPU硬件加速的命令行参数
if (process.platform === 'linux') {
  // 启用GPU光栅化
  app.commandLine.appendSwitch('enable-gpu-rasterization')
  // 启用零拷贝（减少CPU-GPU数据传输开销）
  app.commandLine.appendSwitch('enable-zero-copy')
  // 使用原生GPU内存缓冲区
  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers')
  // 忽略GPU黑名单（某些GPU可能被默认禁用）
  app.commandLine.appendSwitch('ignore-gpu-blacklist')
  // 启用GPU合成（提升渲染性能）
  app.commandLine.appendSwitch('enable-gpu-compositing')
  
  console.log('[Main] Linux环境：已启用GPU硬件加速优化')
}
// ======================================================================

// app.whenReady().then(() => {
//   session.defaultSession.loadExtension(devtoolsPath, { allowFileAccess: true })
// })

app.whenReady().then(async () => {
  // 初始化多语言存储
  await initStore()
  
  try {                                   // ★改
    const devtoolsPath = join(process.resourcesPath, 'extensions', 'vue-devtools'); // ★示例
    await session.defaultSession.loadExtension(devtoolsPath, { allowFileAccess: true });
  } catch (e) {
    console.warn('[DevTools] skip:', e.message);
  }
});

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width,
    height,
    show: false,
    icon: join(__dirname, '../../resources/icon.ico'),
    // autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      webSecurity: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      // 明确启用硬件加速（默认为true，但显式声明更清晰）
      hardwareAcceleration: true
    }
  })
  mainWindow.on('close', (event) => {
    if (quitting) return;
    // 阻止默认关闭行为
    event.preventDefault()

    // 显示系统原生确认对话框
    const result = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['确定退出', '取消'],
      title: '确认关闭',
      message: '即将退出应用程序',
      detail: '未保存的数据可能会丢失，确定要退出吗？',
      cancelId: 1, // 按ESC时对应取消按钮
      defaultId: 0 // 默认选中确定按钮
    })

    // 用户确认退出
    if (result === 0) {
      // 设置退出标志，避免重复弹窗
      quitting = true
      
      // 使用 app.quit() 触发 before-quit 事件，以便记录退出日志
      // 不要使用 app.exit(0)，那会跳过 before-quit 事件
      app.quit()
    }
  })

  // ==================== 窗口级别的崩溃监听 ====================
  // 监听窗口无响应事件（渲染进程卡死）
  mainWindow.on('unresponsive', () => {
    console.error('[WINDOW UNRESPONSIVE] 主窗口无响应')
    
    const error = new Error('主窗口无响应（渲染进程可能卡死）')
    crashLogger.logCrash(error, 'window-unresponsive')
    
    // 显示对话框询问用户是否等待或重启
    const result = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['等待', '重新加载', '退出'],
      title: '窗口无响应',
      message: '应用程序无响应',
      detail: '渲染进程可能已卡死，您可以选择等待、重新加载或退出应用。',
      defaultId: 0,
      cancelId: 0
    })
    
    if (result === 1) {
      // 重新加载
      console.log('[WINDOW UNRESPONSIVE] 用户选择重新加载窗口')
      mainWindow.reload()
    } else if (result === 2) {
      // 退出应用
      console.log('[WINDOW UNRESPONSIVE] 用户选择退出应用')
      app.exit(0)
    }
  })

  // 监听窗口恢复响应事件
  mainWindow.on('responsive', () => {
    console.log('[WINDOW RESPONSIVE] 主窗口已恢复响应')
  })

  // 监听渲染进程崩溃（已废弃，但保留以兼容旧版本Electron）
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('[WEBCONTENTS CRASHED] 渲染进程崩溃（已废弃的事件）', { killed })
  })

  // 监听渲染进程销毁事件
  mainWindow.webContents.on('destroyed', () => {
    console.warn('[WEBCONTENTS DESTROYED] 渲染进程已销毁')
  })
  // =======================================================
  
  // 打开开发者工具
 /*  mainWindow.webContents.openDevTools() */

  // 在开发环境中安装Vue DevTools
/*   if (is.dev) {
    try {
      const installExtension = require('electron-devtools-installer').default
      const { VUEJS3_DEVTOOLS } = require('electron-devtools-installer')

      installExtension(VUEJS3_DEVTOOLS)
        .then((name) => console.log(`[Main] Vue DevTools安装成功: ${name}`))
        .catch((err) => console.log('[Main] Vue DevTools安装失败:', err))
    } catch (error) {
      console.log('[Main] Vue DevTools模块未找到，跳过安装:', error.message)
    }
  } */

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const menu = Menu.buildFromTemplate([
    {
      label: 'Language',
      submenu: [
        {
          label: '中文',
          click: () => {
            mainWindow.webContents.send('set-locale', 'zh')
          }
        },
        {
          label: 'English',
          click: () => {
            mainWindow.webContents.send('set-locale', 'en')
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Console',
          click: () => {
            mainWindow.webContents.openDevTools()
          }
        }
      ]
    },
    {
      label: 'Info',
      submenu: [
        {
          label: 'About',
          click: () => {
            mainWindow.webContents.send('show-about-dialog')
          }
        }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 设置进程管理器的主窗口引用并启动MQTT子进程
  processManager.initialize(forkPath1, mainWindow)
  processManager.startMQTTProcess()

  // 获取当前子进程引用（保持兼容性）
  const mqttTask = processManager.getMQTTTask()
  process.mqttChild = mqttTask

  // 设置FTP服务器的主窗口引用
  ftpServerModule.setMainWindow(mainWindow)
  
  // 页面可见性状态管理
  let isPageVisible = true
  
  // 监听渲染进程的可见性变化 - 已禁用后台节流
  ipcMain.on('page-visibility-change', (_e, visible) => {
    isPageVisible = visible

    // 通知MQTT子进程调整限流策略 - 已禁用
    // const currentTask = processManager.getMQTTTask()
    // if (currentTask && !currentTask.killed) {
    //   currentTask.send({ cmd: 'SET_BACKGROUND_MODE', isBackground: !visible })
    // }
  })

  // 【诊断】主进程消息处理统计
  let mainProcessMessageCount = 0
  let mainProcessLastLogTime = Date.now()
  let pendingSetImmediateCount = 0

  mainWindow.webContents.once('did-finish-load', () => {
    // 设置进程管理器的消息处理器
    // 功能：接收来自MQTT子进程的所有消息，进行分类处理
    processManager.setMessageHandler((msg) => {
      mainProcessMessageCount++
      
      // 【诊断】每1秒输出一次统计信息（临时改为1秒，方便对比速率显示）
      // 用途：验证速率0KB/s时，主进程是否真的无消息
      const now = Date.now()
      if (now - mainProcessLastLogTime > 1000) {
        const messagesPerSecond = mainProcessMessageCount / ((now - mainProcessLastLogTime) / 1000)
        // console.log(`[Main Process] 📊 1秒统计: ${messagesPerSecond.toFixed(1)} msg/s, 待处理: ${pendingSetImmediateCount}`)
        
        // 【关键诊断】如果消息速率过高或待处理队列过长，发出警告
        // 阈值说明：根据用户实际负载（200+ beats/s），调整为300 msg/s和100队列长度
        // if (messagesPerSecond > 300) {
        //   console.warn(`[Main Process] ⚠️ 消息速率过高 (${messagesPerSecond.toFixed(1)} msg/s)，可能导致事件循环拥堵`)
        // }
        // if (pendingSetImmediateCount > 100) {
        //   console.warn(`[Main Process] ⚠️ setImmediate队列过长 (${pendingSetImmediateCount})，可能导致UI更新延迟`)
        // }
        
        mainProcessMessageCount = 0
        mainProcessLastLogTime = now
      }
      
      // 过滤心跳消息 - 心跳消息已在processManager中处理，不需要转发到渲染进程
      // 这样可以避免渲染进程收到大量无用的心跳消息
      if (msg.type === 'heartbeat') {
        return
      }

      // 【数据速率】直接转发速率更新消息到渲染进程
      // 新架构：速率在MQTT子进程中计算，主进程只负责转发
      if (msg.type === 'data-rate-update') {
        pendingSetImmediateCount++
        setImmediate(() => {
          mainWindow.webContents.send('data-rate-update', msg.data)
          pendingSetImmediateCount--
        })
        return
      }

      // ========== 事件记录导出相关消息处理 ==========
      if (msg.type === 'readEventProgress') {
        pendingSetImmediateCount++
        setImmediate(() => {
          mainWindow.webContents.send('update-readEventProgress', msg.data)
          pendingSetImmediateCount--
        })
        return
      }

      if (msg.type === 'readEventCompleted') {
        pendingSetImmediateCount++
        setImmediate(() => {
          // 传递saveDir和data对象（保持blockId格式）
          mainWindow.webContents.send('export-completed', msg.data)
          pendingSetImmediateCount--
        })
        return
      }

      if (msg.type === 'readEventError') {
        pendingSetImmediateCount++
        setImmediate(() => {
          mainWindow.webContents.send('readEventErrorFromMain', msg.data)
          pendingSetImmediateCount--
        })
        return
      }

      if (msg.type === 'readEventCanceled') {
        pendingSetImmediateCount++
        setImmediate(() => {
          // 转发取消通知到渲染进程
          mainWindow.webContents.send('export-canceled', msg.data)
          pendingSetImmediateCount--
        })
        return
      }

      // 转发其他消息到渲染进程
      pendingSetImmediateCount++
      setImmediate(() => {
        mainWindow.webContents.send(msg.type, msg.data)
        pendingSetImmediateCount--
      })

      // 【数据接收监控】发送心跳信号到渲染进程（仅用于通讯状态监控，不再包含速率数据）
      // 功能：监控设备数据接收状态，支持5秒超时检测
      // 只有在收到真正的设备业务数据时才发送心跳，排除连接状态等控制消息
      if (msg.data && typeof msg.data === 'object' && Object.keys(msg.data).length > 0 &&
          msg.type !== 'mqtt-connected' &&
          msg.type !== 'mqtt-disconnected' &&
          msg.type !== 'mqtt-connect-result' &&
          msg.type !== 'mqtt-disconnect-result' &&
          msg.type !== 'mqtt-test-result' &&
          msg.type !== 'data-rate-update' &&
          msg.type !== 'heartbeat') {

        // 异步发送心跳信号（不再包含dataSize，速率由子进程独立计算）
        pendingSetImmediateCount++
        setImmediate(() => {
          mainWindow.webContents.send('mqtt-data-heartbeat', {
            timestamp: Date.now(),
            messageType: msg.type
          })
          pendingSetImmediateCount--
        })
      }
    });
  }
  )

    // MQTT发布消息
    ipcMain.handle('mqttPublish', (_e, topic, payloadHex) => {
      const currentTask = processManager.getMQTTTask()
      if (currentTask && !currentTask.killed) {
        currentTask.send({ cmd:'MQTT_PUBLISH', topic, payloadHex })
      } else {
        console.error('[Main] MQTT子进程未运行')
        return false           // 让渲染端走 catch，便于排查
      }
      // console.log('[Main] publish → child', topic, payloadHex)
      return true;                                                // 立即 resolve
    });

    // MQTT连接管理
    ipcMain.handle('mqtt-connect', async (_e, config) => {
      console.log('[Main] 🔗 收到MQTT连接请求:', config)

      return new Promise((resolve) => {
        const currentTask = processManager.getMQTTTask()
        if (!currentTask || currentTask.killed) {
          console.error('[Main] ❌ MQTT子进程未运行')
          resolve(false)
          return
        }

        try {
          // 发送连接指令到MQTT子进程
          console.log('[Main]  准备发送连接指令到MQTT子进程...')
          currentTask.send({ cmd: 'MQTT_CONNECT', config })
          console.log('[Main]  已发送连接指令到MQTT子进程')
        } catch (error) {
          console.error('[Main]  发送连接指令失败:', error)
          resolve(false)
          return
        }

        let timeoutId = null
        let firstResponseReceived = false

        // 监听连接结果（一次性）
        const handleResult = (message) => {
          console.log('[Main]  收到MQTT子进程消息:', message.type)
          if (message.type === 'mqtt-connect-result') {
            // 标记已收到首次响应
            if (!firstResponseReceived) {
              firstResponseReceived = true
              if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
              }
            }
            
            currentTask.removeListener('message', handleResult)
            
            // 无论成功或失败，都返回结果
            // 失败时mqtt.js会自动重连，不需要前端再次请求
            resolve(message.data.success)
          }
        }

        currentTask.on('message', handleResult)

        // 只为首次连接尝试设置超时（略大于mqtt.js的connectTimeout）
        // mqtt.js connectTimeout是10秒，我们设置12秒
        // 如果超时，说明首次连接失败，但mqtt.js会继续自动重连
        timeoutId = setTimeout(() => {
          console.warn('[Main]  首次连接超时 (12秒)，mqtt.js将继续自动重连')
          currentTask.removeListener('message', handleResult)
          
          // 返回false表示首次连接未成功
          // 但不影响mqtt.js后台的自动重连
          resolve(false)
        }, 12000) // 12秒超时，与mqtt.js的connectTimeout(10秒)协调
      })
    })

    // MQTT断开连接
    ipcMain.handle('mqtt-disconnect', async (_e) => {
      return new Promise((resolve) => {
        const currentTask = processManager.getMQTTTask()
        if (!currentTask || currentTask.killed) {
          resolve(true)
          return
        }

        currentTask.send({ cmd: 'MQTT_DISCONNECT' })

        const handleResult = (message) => {
          if (message.type === 'mqtt-disconnect-result') {
            currentTask.removeListener('message', handleResult)
            resolve(message.data.success)
          }
        }

        currentTask.on('message', handleResult)

        setTimeout(() => {
          currentTask.removeListener('message', handleResult)
          resolve(true) // 断开连接总是成功
        }, 5000)
      })
    })

    // MQTT测试连接
    ipcMain.handle('mqtt-test-connection', async (_e, config) => {
      return new Promise((resolve) => {
        const currentTask = processManager.getMQTTTask()
        if (!currentTask || currentTask.killed) {
          resolve({ success: false, error: 'MQTT进程未运行' })
          return
        }

        currentTask.send({ cmd: 'MQTT_TEST_CONNECTION', config })

        const handleResult = (message) => {
          if (message.type === 'mqtt-test-result') {
            currentTask.removeListener('message', handleResult)
            resolve(message.data)
          }
        }

        currentTask.on('message', handleResult)

        setTimeout(() => {
          currentTask.removeListener('message', handleResult)
          resolve({ success: false, error: '测试超时' })
        }, 10000)
      })
    })

    // 添加进程管理相关的IPC处理器
    // 这些接口允许渲染进程查询和控制MQTT子进程状态

    // 获取进程基本状态 - 返回运行状态、PID、重启次数等基本信息
    ipcMain.handle('get-process-status', async () => {
      return processManager.getStatus()
    })

    // 手动重启MQTT进程 - 允许用户在界面上手动触发重启
    ipcMain.handle('restart-mqtt-process', async () => {
      processManager.restartProcess('manual')
      return { success: true }
    })

    // 获取详细统计信息 - 返回心跳时间、连接质量等详细监控数据
    ipcMain.handle('get-process-stats', async () => {
      return processManager.getStats()
    })

    // ========== 事件记录导出相关IPC处理 ==========
    
    // 启动事件记录导出
    ipcMain.on('start-reading-data-event', (event, { offsetRead, totalRead, blockId }) => {
      const mqttTask = processManager.getMQTTTask()
      if (!mqttTask || mqttTask.killed) {
        mainWindow.webContents.send('readEventErrorFromMain', {
          blockId,
          error: 'MQTT进程未运行'
        })
        return
      }

      // 使用默认目录
      const saveDir = DEFAULT_EXPORT_DIR
      console.log(`[Main] 使用默认导出目录: ${saveDir}`)
      
      // 通知渲染进程：导出开始，显示目录
      event.sender.send('export-started', saveDir)

      mqttTask.send({
        cmd: 'START_READ_EVENT',
        offsetRead,
        totalRead,
        blockId,
        exportDir: saveDir
      })
    })

    // 取消事件记录导出
    ipcMain.on('cancel-export-event', (event, { blockId }) => {
      const mqttTask = processManager.getMQTTTask()
      if (mqttTask && !mqttTask.killed) {
        mqttTask.send({
          cmd: 'CANCEL_READ_EVENT',
          blockId
        })
      }
    })

    // ========== 导出目录管理 ==========
    
    // 获取默认导出目录
    ipcMain.handle('get-default-export-dir', () => {
      return DEFAULT_EXPORT_DIR
    })

    // 选择默认导出目录
    ipcMain.handle('choose-default-export-dir', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        defaultPath: DEFAULT_EXPORT_DIR
      })
      if (!canceled && filePaths && filePaths.length > 0) {
        DEFAULT_EXPORT_DIR = filePaths[0]
        // 创建目录（如果不是根目录）
        const isRoot = parse(DEFAULT_EXPORT_DIR).root === DEFAULT_EXPORT_DIR
        if (!isRoot) {
          try {
            const fs = require('fs')
            fs.mkdirSync(DEFAULT_EXPORT_DIR, { recursive: true })
          } catch (err) {
            console.error(`创建导出目录 "${DEFAULT_EXPORT_DIR}" 失败：`, err)
            if (err.code !== 'EPERM') {
              throw err
            }
          }
        }
        return DEFAULT_EXPORT_DIR
      }
      return null
    })

    // 设置默认导出目录
    ipcMain.on('set-default-export-dir', (event, dir) => {
      DEFAULT_EXPORT_DIR = dir
      const isRoot = parse(dir).root === dir
      if (!isRoot) {
        try {
          const fs = require('fs')
          fs.mkdirSync(DEFAULT_EXPORT_DIR, { recursive: true })
        } catch (err) {
          console.error(`创建导出目录 "${DEFAULT_EXPORT_DIR}" 失败：`, err)
          if (err.code !== 'EPERM') {
            throw err
          }
        }
      }
      event.sender.send('export-dir-updated', DEFAULT_EXPORT_DIR)
    })

}




// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // 日志系统自检
  console.log('[Main] 崩溃日志系统已启动')
  console.log('[Main] 日志目录:', crashLogger.getLogDirectory())
  console.log('[Main] 系统资源监控已启动（每5秒采集一次）')
  
  createWindow()
  /*   createPopupWindow() */
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  /*  ipcMain.on('ping', () => console.log('pong')) */

  ipcMain.on('counter-value', (_event, value) => {
    console.log(value) // will print value to Node console
  })
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

    
    let exitLogRecorded = false;
app.on('before-quit', async (e) => {
  // 只记录一次退出日志
  if (!exitLogRecorded) {
    exitLogRecorded = true;
    
    console.log('[Main] 正在记录退出日志...')
    
    // 记录退出日志（同步写入，确保退出前完成）
    const logPath = crashLogger.logExit('用户手动退出应用')
    if (logPath) {
      console.log('[Main] ✅ 退出日志已保存:', logPath)
    }
    
    // 停止资源监控
    crashLogger.stopResourceMonitoring()
    console.log('[Main] 已停止系统资源监控')
  }
  
  // 处理子进程清理
  if (processManager.isRunning() && !quitting) {
    quitting = true;
    e.preventDefault();                   // 等子进程退出再 quit
    console.log('[Main] 等待子进程清理完成...')
    processManager.cleanupAsync().then(() => {
      console.log('[Main] 子进程清理完成，应用即将退出')
      app.quit();
    });
  }
});



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})



// BAU地址探测网卡选择功能IPC事件注册
ipcMain.handle('get-network-interfaces', handleGetNetworkInterfaces)
ipcMain.handle('bau-query-ip-with-interface', handleQueryIpWithInterface)
ipcMain.handle('bau-query-mqtt-with-interface', handleQueryMqttWithInterface)
ipcMain.handle('bau-set-ip-with-interface', handleSetIpWithInterface)
ipcMain.handle('bau-set-mqtt-with-interface', handleSetMqttWithInterface)
ipcMain.handle('bau-force-upgrade-with-interface', handleForceUpgradeWithInterface)
ipcMain.handle('bau-reset-default-with-interface', handleResetDefaultWithInterface)
ipcMain.handle('bau-reset-device-with-interface', handleResetDeviceWithInterface)

// TFTP服务器相关IPC事件注册
ipcMain.handle('tftp-start', async (_, { host, port }) => {
  return await startTftpServer(host, port)
})

ipcMain.handle('tftp-stop', async () => {
  return await stopTftpServer()
})

ipcMain.handle('tftp-status', () => {
  return getTftpStatus()
})

ipcMain.handle('get-tftp-root', () => {
  return getTftpRoot()
})

ipcMain.handle('get-tftp-default-ip', () => {
  return getTftpDefaultIp()
})

ipcMain.on('set-tftp-root', (event, dir) => {
  setTftpRoot(dir)
})

// TFTP升级文件选择（使用dialog选择文件）
// 参考reference项目：直接在IPC处理器中处理所有逻辑，返回标准格式
ipcMain.handle('select-tftp-upgrade-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择TFTP升级文件',
    defaultPath: getTftpRoot(),
    properties: ['openFile'],
    filters: [
      { name: '升级文件', extensions: ['pkg', 'bin', 'hex', 'fw'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  
  if (canceled || !filePaths.length) {
    return { canceled: true }
  }
  
  const fullPath = filePaths[0]
  const path = require('path')
  const fileName = path.basename(fullPath)
  const fileDir = path.dirname(fullPath)
  
  try {
    // 设置TFTP根目录为文件所在目录
    setTftpRoot(fileDir)
    
    return {
      canceled: false,
      fullPath,
      fileName,
      fileDir,
      success: true
    }
  } catch (error) {
    return {
      canceled: false,
      fullPath,
      fileName,
      error: true,
      message: `文件处理失败: ${error.message}`
    }
  }
})

// 强制升级相关IPC事件注册
ipcMain.on('start-force-upgrade', (event, { interfaceAddress }) => {
  startForceUpgrade(event, { interfaceAddress })
})

// 参考reference项目：不传递event，前端已经立即更新状态
ipcMain.on('stop-force-upgrade', () => {
  stopForceUpgrade()
})

ipcMain.handle('get-force-upgrade-status', () => {
  return getForceUpgradeStatus()
})


// 系统资源和崩溃日志相关IPC事件注册
// 获取当前系统资源占用情况
ipcMain.handle('get-system-resource', async () => {
  return crashLogger.getCurrentResourceInfo()
})

// 获取崩溃日志目录
ipcMain.handle('get-crash-log-directory', async () => {
  return crashLogger.getLogDirectory()
})

// 打开崩溃日志目录
ipcMain.handle('open-crash-log-directory', async () => {
  const logDir = crashLogger.getLogDirectory()
  shell.openPath(logDir)
  return { success: true, path: logDir }
})

// 手动触发测试崩溃日志（仅用于测试）
ipcMain.handle('test-crash-log', async (_e, testType = 'test') => {
  try {
    const testError = new Error(`这是一个测试崩溃日志 - 类型: ${testType}`)
    testError.code = 'TEST_ERROR'
    const logPath = crashLogger.logCrash(testError, `test-${testType}`)
    return { success: true, logPath, message: '测试日志已生成' }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 获取应用版本信息 - About对话框使用
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})


// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
