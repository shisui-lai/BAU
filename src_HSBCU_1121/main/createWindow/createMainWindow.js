;('use strict')
import { BrowserWindow, app, dialog, screen, Menu } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { openAboutWindow } from './createAboutWindow'
import { bcuMessageHandler } from '../ipc/childBridge'
import { modbusTask } from '../index'
let mainWindow
let mainWindowActive = true
const menu = Menu.buildFromTemplate([
  /*    {
      label: '文件',
      submenu: [
        {
          label: '打开',
          accelerator: 'Ctrl+O',
          click: () => {
            // 处理打开操作
          }
        },
        {
          label: '退出',
          accelerator: 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' }
      ]
    }, */
  {
    label: 'language',
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
      // 可继续添加更多语言
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'Console',
        click: () => {
          mainWindow.webContents.openDevTools()
          // 显示关于窗口
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
          /*  openAboutWindow() */
          mainWindow.webContents.send('show-about-dialog')
        }
      }
    ]
  }
])
function createMainWindow() {
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
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })
  Menu.setApplicationMenu(menu)
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/login`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '#/login'
    })
  }
  mainWindow.on('close', (event) => {
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
      if (modbusTask) {
        modbusTask.removeAllListeners()
        modbusTask.kill('SIGTERM')
      }

      // 如果是最后一个窗口则退出应用
      if (BrowserWindow.getAllWindows().length === 1) {
        app.exit(0) // 立即退出
      }
    }
  })
  mainWindow.on('closed', () => {
    mainWindowActive = false
    // 清理 modbusTask 相关资源
    if (modbusTask) {
      modbusTask.removeListener('message', bcuMessageHandler)
      console.log('modbusTask is killed')
      if (typeof modbusTask.kill === 'function') {
        modbusTask.kill('SIGTERM')
      }
    }
  })
}
export { mainWindow, mainWindowActive, createMainWindow }
