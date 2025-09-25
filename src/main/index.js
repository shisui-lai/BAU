import { app, Menu, shell, BrowserWindow, ipcMain, dialog, screen, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
const { fork } = require('child_process')
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
let mqttChild;
let quitting = false;
import forkPath1 from './mqtt.js?modulePath'
// 启动MQTT子进程
console.log('[Main] 启动MQTT子进程...')
let mqttTask = fork(forkPath1);
console.log('[Main] MQTT子进程已启动，PID:', mqttTask.pid)

// 监听MQTT子进程错误
mqttTask.on('error', (error) => {
  console.error('[Main] MQTT子进程启动错误:', error)
})

mqttTask.on('exit', (code, signal) => {
  console.log('[Main] MQTT子进程退出，代码:', code, '信号:', signal)
  // 如果异常退出，可以考虑重启
  if (code !== 0) {
    console.log('[Main] MQTT子进程异常退出，考虑重启...')
  }
})

process.mqttChild = mqttTask

// 文件选择对话框
ipcMain.handle('show-open-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择升级文件',
    properties: ['openFile']
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

// 引入FTP服务器模块 - 在MQTT初始化之后
import * as ftpServerModule from './ftpServer.js'


process.on('uncaughtException', (err) => {
  if (err?.message?.includes('Object has been destroyed')) return; // 静默
  console.error('[UNCAUGHT]', err);
});

// app.whenReady().then(() => {
//   session.defaultSession.loadExtension(devtoolsPath, { allowFileAccess: true })
// })

app.whenReady().then(async () => {
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
      label: app.name,
      submenu: [
        {
          click: () => mainWindow.webContents.send('from-main', modbusClient),
          label: 'Increment'
        },
        {
          click: () => mainWindow.webContents.send('from-main', data),
          label: 'Decrement'
        }
      ]
    }
  ])
  /*   Menu.setApplicationMenu(menu) */

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 设置FTP服务器的主窗口引用
  ftpServerModule.setMainWindow(mainWindow)
  
  // 页面可见性状态管理
  let isPageVisible = true
  
  // 监听渲染进程的可见性变化
  ipcMain.on('page-visibility-change', (_e, visible) => {
    isPageVisible = visible
    
    // 通知MQTT子进程调整限流策略
    if (mqttTask && !mqttTask.killed) {
      mqttTask.send({ cmd: 'SET_BACKGROUND_MODE', isBackground: !visible })
    }
  })

  mainWindow.webContents.once('did-finish-load', () => {
    mqttTask.on('message', (msg) => {
      // if (msg.type === 'mqtt-message') {
        // console.log('主进程收到子进程的消息:', JSON.stringify(msg.data, null, 2));
        // console.log('主进程收到子进程的消息:', msg);//打印信息
        // console.log('数据类型：', msg.type);
        // console.log('详细数据',msg.data.data);
        // mainWindow.webContents.send('mqtt-message', msg.data);



        mainWindow.webContents.send(msg.type, msg.data)

      // 【数据接收监控】发送心跳信号到渲染进程
      // 功能：监控设备数据接收状态，支持5秒超时检测和数据速率统计
      // 只有在收到真正的设备业务数据时才发送心跳，排除连接状态等控制消息
      if (msg.data && typeof msg.data === 'object' && Object.keys(msg.data).length > 0 &&
          msg.type !== 'mqtt-connected' &&
          msg.type !== 'mqtt-disconnected' &&
          msg.type !== 'mqtt-connect-result' &&
          msg.type !== 'mqtt-disconnect-result' &&
          msg.type !== 'mqtt-test-result') {

        // 🚀 优化：使用原始MQTT payload大小，避免JSON序列化开销
        // payloadSize在msg.data中（来自MQTT子进程的原始payload字节长度）
        const dataSize = msg.data.payloadSize || JSON.stringify(msg.data).length

        // 发送心跳信号，包含数据大小用于速率统计
        mainWindow.webContents.send('mqtt-data-heartbeat', {
          timestamp: Date.now(),
          messageType: msg.type,
          dataSize: dataSize
        })
      }

      // // } else if (msg.type === 'mqtt-err') {
      //   // console.error('子进程错误:', msg.err);
      //   // mainWindow.webContents.send('mqtt-error', msg.err);
      // }
    });
  }
  )

    // MQTT发布消息
    ipcMain.handle('mqttPublish', (_e, topic, payloadHex) => {
      // mqttChild.send({ cmd: 'MQTT_PUBLISH', topic, payloadHex }); // Buffer 转换留给子进程
      if (mqttTask && !mqttTask.killed) {
        mqttTask.send({ cmd:'MQTT_PUBLISH', topic, payloadHex })
      } else {
        console.error('[Main] mqttTask undefined')
        return false           // 让渲染端走 catch，便于排查
      }
      // console.log('[Main] publish → child', topic, payloadHex)
      return true;                                                // 立即 resolve
    });

    // MQTT连接管理
    ipcMain.handle('mqtt-connect', async (_e, config) => {
      console.log('[Main] 🔗 收到MQTT连接请求:', config)

      return new Promise((resolve) => {
        if (!mqttTask || mqttTask.killed) {
          console.error('[Main] ❌ MQTT子进程未运行')
          resolve(false)
          return
        }

        try {
          // 发送连接指令到MQTT子进程
          console.log('[Main]  准备发送连接指令到MQTT子进程...')
          mqttTask.send({ cmd: 'MQTT_CONNECT', config })
          console.log('[Main]  已发送连接指令到MQTT子进程')
        } catch (error) {
          console.error('[Main]  发送连接指令失败:', error)
          resolve(false)
          return
        }

        let timeoutId = null

        // 监听连接结果（一次性）
        const handleResult = (message) => {
          console.log('[Main]  收到MQTT子进程消息:', message.type)
          if (message.type === 'mqtt-connect-result') {
            // console.log('[Main]  收到连接结果:', message.data)
            if (timeoutId) clearTimeout(timeoutId)
            mqttTask.removeListener('message', handleResult)
            resolve(message.data.success)
          }
        }

        mqttTask.on('message', handleResult)

        // 设置超时
        timeoutId = setTimeout(() => {
          console.error('[Main]  MQTT连接超时 (15秒)')
          mqttTask.removeListener('message', handleResult)
          resolve(false)
        }, 15000) // 15秒超时
      })
    })

    // MQTT断开连接
    ipcMain.handle('mqtt-disconnect', async (_e) => {
      return new Promise((resolve) => {
        if (!mqttTask || mqttTask.killed) {
          resolve(true)
          return
        }

        mqttTask.send({ cmd: 'MQTT_DISCONNECT' })

        const handleResult = (message) => {
          if (message.type === 'mqtt-disconnect-result') {
            mqttTask.removeListener('message', handleResult)
            resolve(message.data.success)
          }
        }

        mqttTask.on('message', handleResult)

        setTimeout(() => {
          mqttTask.removeListener('message', handleResult)
          resolve(true) // 断开连接总是成功
        }, 5000)
      })
    })

    // MQTT测试连接
    ipcMain.handle('mqtt-test-connection', async (_e, config) => {
      return new Promise((resolve) => {
        if (!mqttTask || mqttTask.killed) {
          resolve({ success: false, error: 'MQTT进程未运行' })
          return
        }

        mqttTask.send({ cmd: 'MQTT_TEST_CONNECTION', config })

        const handleResult = (message) => {
          if (message.type === 'mqtt-test-result') {
            mqttTask.removeListener('message', handleResult)
            resolve(message.data)
          }
        }

        mqttTask.on('message', handleResult)

        setTimeout(() => {
          mqttTask.removeListener('message', handleResult)
          resolve({ success: false, error: '测试超时' })
        }, 10000)
      })
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
  if (mqttTask && !mqttTask.killed) {     // ★判空判活
    e.preventDefault();                   // 等子进程退出再 quit
    mqttTask.once('exit', () => app.quit());
    mqttTask.kill();
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
