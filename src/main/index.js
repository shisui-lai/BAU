import { app, Menu, shell, BrowserWindow, ipcMain, dialog, screen, session, powerMonitor } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
const { fork } = require('child_process')
import { processManager } from './handlers/processManager.js'
// FTP服务器功能将在下面通过require导入
import {
  // 网卡选择功能相关处理器 - 统一BAU操作方式
  handleGetNetworkInterfaces,
  handleQueryIpWithInterface,
  handleQueryMqttWithInterface,
  handleSetIpWithInterface,
  handleSetMqttWithInterface,
  handleResetDefaultWithInterface,
  handleResetDeviceWithInterface
} from './handlers/bauAddressHandler.js'//地址探测

let mainWindow
let quitting = false;
import forkPath1 from './mqtt.js?modulePath'

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

// ------------ 多语言偏好存储 ------------
let store
async function initStore() {
  const mod = await import('electron-store')
  const Store = mod.default
  store = new Store({ defaults: { locale: 'zh' } })
}


process.on('uncaughtException', (err) => {
  if (err?.message?.includes('Object has been destroyed')) return; // 静默
  console.error('[UNCAUGHT]', err);
});

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
      nodeIntegration: false
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
      // 执行清理操作

      // 如果是最后一个窗口则退出应用
      if (BrowserWindow.getAllWindows().length === 1) {
        app.exit(0) // 立即退出
      }
    }
  })
  // 打开开发者工具
  mainWindow.webContents.openDevTools()

  // 在开发环境中安装Vue DevTools
  if (is.dev) {
    try {
      const installExtension = require('electron-devtools-installer').default
      const { VUEJS3_DEVTOOLS } = require('electron-devtools-installer')

      installExtension(VUEJS3_DEVTOOLS)
        .then((name) => console.log(`[Main] Vue DevTools安装成功: ${name}`))
        .catch((err) => console.log('[Main] Vue DevTools安装失败:', err))
    } catch (error) {
      console.log('[Main] Vue DevTools模块未找到，跳过安装:', error.message)
    }
  }

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

}




// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
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

app.on('before-quit', async (e) => {
  quitting = true;
  if (processManager.isRunning()) {
    e.preventDefault();                   // 等子进程退出再 quit
    processManager.cleanupAsync().then(() => app.quit());
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
ipcMain.handle('bau-reset-default-with-interface', handleResetDefaultWithInterface)
ipcMain.handle('bau-reset-device-with-interface', handleResetDeviceWithInterface)

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
