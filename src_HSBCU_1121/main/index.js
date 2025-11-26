;('use strict')
import { app, dialog, BrowserWindow, ipcMain } from 'electron'
const fs = require('fs')
const { fork, spawn } = require('child_process')
import mbPath from '../modbus/mbstask.js?modulePath'

// 增加内存限制参数，防止内存溢出
let modbusTask = null
let modbusTaskRestartCount = 0
const MAX_RESTART_ATTEMPTS = 3

function createModbusTask() {
  modbusTask = fork(mbPath, [], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    execArgv: [
      '--max-old-space-size=4096', // 设置堆内存限制为4GB
      '--max-semi-space-size=256', // 降低新生代内存限制，从512MB降到256MB
      '--gc-interval=50', // 更频繁的垃圾回收，从100降到50
      '--expose-gc', // 暴露垃圾回收接口
      '--optimize-for-size', // 优化内存使用
      '--inspect=9229' // 启用调试器，端口9229
    ]
  })

  // 监听子进程的标准输出和错误输出
  modbusTask.stdout.on('data', (data) => {
    console.log(`[Modbus Process] ${data.toString().trim()}`)
  })

  modbusTask.stderr.on('data', (data) => {
    console.error(`[Modbus Process Error] ${data.toString().trim()}`)
  })

  // 监听子进程退出事件
  modbusTask.on('exit', (code, signal) => {
    console.warn(`ModbusTask子进程退出，代码: ${code}, 信号: ${signal}`)

    // 如果不是正常退出且重启次数未超过限制，则尝试重启
    if (code !== 0 && modbusTaskRestartCount < MAX_RESTART_ATTEMPTS) {
      modbusTaskRestartCount++
      console.log(`尝试重启ModbusTask子进程 (第${modbusTaskRestartCount}次)`)

      setTimeout(() => {
        try {
          // 在重启前清理IPC处理器，避免重复注册
          ipcMain.removeHandler('write-modbus-registers')
          ipcMain.removeHandler('get-export-status')
          ipcMain.removeHandler('read-control-registers')
          ipcMain.removeHandler('check-modbus-task-status')
          ipcMain.removeHandler('update-modbus-task-restart-count')
          ipcMain.removeHandler('get-memory-usage')
          ipcMain.removeHandler('force-gc')

          createModbusTask()
          // 重新注册IPC处理器
          registerRendererIpc(modbusTask)
          initChildProcess(mainWindow)
          // 同步更新重启计数
          updateModbusTaskRestartCount(modbusTaskRestartCount)
          console.log('ModbusTask子进程重启成功')
        } catch (error) {
          console.error('ModbusTask子进程重启失败:', error)
        }
      }, 2000) // 延迟2秒重启
    } else if (modbusTaskRestartCount >= MAX_RESTART_ATTEMPTS) {
      console.error('ModbusTask子进程重启次数超过限制，停止重启')
      dialog.showErrorBox('系统错误', 'ModbusTask子进程异常退出且无法重启，请重启应用程序')
    }
  })

  return modbusTask
}

// 初始化modbusTask
modbusTask = createModbusTask()

import { createMainWindow, mainWindow } from './createWindow/createMainWindow'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { DEFAULT_EXPORT_DIR, FTP_ROOT } from './ipc/rendererHandlers.js'
import { registerRendererIpc, updateModbusTaskRestartCount } from './ipc/rendererHandlers.js'
import { initChildProcess } from './ipc/childBridge.js'

// ------------ 多语言偏好存储 ------------
// 延迟加载 electron-store
let store
async function initStore() {
  const mod = await import('electron-store')
  const Store = mod.default
  store = new Store({ 
    defaults: { 
      locale: 'zh',
      layoutConfig: {
        ripple: true,
        darkTheme: true,
        inputStyle: 'outlined',
        menuMode: 'static',
        theme: 'lara-dark-cyan',
        scale: 10
      }
    } 
  })
}

// IPC 通道：前端调用获取当前语言
ipcMain.handle('get-locale', () => {
  return store.get('locale')
})

// IPC 通道：前端调用设置新语言
ipcMain.handle('set-locale', (_event, locale) => {
  store.set('locale', locale)
})

// ------------ 主题配置存储 ------------
// IPC 通道：获取布局配置
ipcMain.handle('get-layout-config', () => {
  return store.get('layoutConfig')
})

// IPC 通道：保存布局配置
ipcMain.handle('set-layout-config', (_event, config) => {
  store.set('layoutConfig', config)
  return { success: true }
})
app.whenReady().then(async () => {
  const isElevated = (await import('is-elevated')).default
  const elevated = await isElevated()
  if (!elevated) {
    const response = await dialog.showMessageBox({
      type: 'question',
      buttons: ['是', '否'],
      defaultId: 0,
      message: '是否启用网络保持功能？'
    })

    if (response.response === 0) {
      try {
        // 以管理员身份重启
        const exePath = app.getPath('exe')
        const psCmd = `Start-Process -FilePath "${exePath}" -Verb RunAs`
        modbusTask.send({ type: 'set-admin-status', isAdmin: true })
        // 启动管理员权限进程
        const powerShell = spawn('powershell.exe', ['-Command', psCmd], {
          detached: true,
          stdio: 'ignore',
          shell: true
        })
        // 等待子进程启动后退出当前进程
        setTimeout(() => {
          app.quit()
          process.exit(0)
        }, 500)
        return
      } catch (err) {
        console.error('权限提升失败:', err)
        dialog.showErrorBox(
          '权限错误',
          '无法以管理员身份运行，请通过右键菜单选择"以管理员身份运行"'
        )
        app.quit()
        return
      }
    } else {
      // 以普通权限继续
      modbusTask.send({ type: 'set-admin-status', isAdmin: false })
    }
  } else {
    // 已是管理员，直接发送
    modbusTask.send({ type: 'set-admin-status', isAdmin: true })
  }
  fs.mkdirSync(DEFAULT_EXPORT_DIR, { recursive: true })
  fs.mkdirSync(FTP_ROOT, { recursive: true })
  createMainWindow()
  await initStore()
  electronApp.setAppUserModelId('com.electron')
  registerRendererIpc(modbusTask)
  initChildProcess(mainWindow)
})
app.on('browser-window-created', (_, window) => {
  optimizer.watchWindowShortcuts(window)
})
app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})
app.on('before-quit', (event) => {
  // 阻止默认退出行为（由我们自己的逻辑控制退出）
  event.preventDefault()
  // 先向子进程发退出通知
  if (modbusTask && !modbusTask.killed) {
    modbusTask.kill()
    modbusTask.send({ type: 'app-quit' })
  }
  process.exit(0)
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    process.exit(0)
  }
})
export { modbusTask }
