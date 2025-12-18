import { modbusTask } from '../index.js'
import { mainWindowActive } from '../createWindow/createMainWindow.js'
import { queryOnlineIps } from '../udp/ipQuery.js'
let busyDialogShowing = false
export const bcuMessageHandler = (mainWindow, message) => {
  if (!mainWindowActive) return
  if (
    message &&
    [
      /* API列表 */
      'FC04Vltg',
      'FC04Temp',
      'FC04SOC',
      'FC04SOH',
      'FC04ClusExtreme',
      'FC04ClusterSumm',
      'FC04dataPackSumm1',
      'FC04dataVersion',
      'FC04Alarm',
      'FC04DIDO',
      'FC04Config',
      'FC04ConfigAlarm',
      'FC04ConfigSOX',
      'FC04Control',
      'FC04VtSetData',
      'FC04BalanceData',
      'FC04DisconnectData',
      'FC04EventData',
      'FC04UpgradeData',
      'FC04AdaptData',
      'FC04VtFilterData',
      'FC04Control',
      'FC04ConfigForBMU',
      'FC04BalanceDataForCell',
      'FC04PowerMap',
      'FC04PCSData',
      'FC04RefrigerationData',
      'FC04DehumData',
      'FC04FireData',
      'FC04FaultConfigData',
      'FC04DIDOConfigData'
    ].includes(message.API)
  ) {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send(`update-${message.API}`, {
      Arg: message.Arg,
      ip: message.deviceIp
    })
  }
}
export function initChildProcess(mainWindow) {
  modbusTask.on('message', async (message) => {
    bcuMessageHandler(mainWindow, message)
    switch (message.API) {
      case 'disk-space-warning': {
        console.log('主进程收到disk-space-warning')
        mainWindow.webContents.send('disk-space-warning')
        break
      }
      case 'query-online-ips': {
        const ips = await queryOnlineIps()
        console.log('主进程收到query-online-ips，返回的ips:', ips, message.ip)
        // 把结果发回子进程
        modbusTask.send({
          API: 'online-ips-result',
          requestIp: message.ip,
          ips
        })
        break
      }
      case 'connection-status':
        {
          // 转发给渲染进程连接状态
          const { ip, success, error, retryCount } = message
          /*  console.log('主进程接收到connection事件', message) */
          mainWindow.webContents.send('connection-status', { ip, success, error, retryCount })
        }
        break
      case 'save-excel':
        {
          /*  if (busyDialogShowing) return
          busyDialogShowing = true
          await dialog.showMessageBox({
            type: 'warning',
            buttons: ['已关闭文件'],
            defaultId: 0,
            cancelId: 1,
            title: '文件被占用',
            message: `导出文件正在被打开。\n请关闭”`
          })
          modbusTask.send({ API: 'save-excel-decision', decision: 'retry' })
          busyDialogShowing = false */
          if (busyDialogShowing) return
          busyDialogShowing = true
          mainWindow.webContents.send('show-save-excel-dialog')
          // 等待渲染进程返回结果
          const { ipcMain } = require('electron')
          const decision = await new Promise((resolve) => {
            ipcMain.once('save-excel-decision', (_event, userDecision) => {
              resolve(userDecision)
            })
          })
          // 把结果发回子进程
          modbusTask.send({ API: 'save-excel-decision', decision })
          busyDialogShowing = false // 用户做出决策后，允许下次弹窗
        }
        break
      case 'network-restart':
        // 完成时通知渲染进程
        const { interfaceName, status, error, ip, restartCount } = message
        mainWindow.webContents.send('Network-Restart', {
          interfaceName,
          status,
          error,
          ip,
          restartCount
        })
        modbusTask.send({
          API: 'network-restart',
          interfaceName,
          status,
          error,
          ip,
          restartCount
        })
        break
      case 'readEventCompleted':
        // 完成时通知渲染进程
        mainWindow.webContents.send('export-completed', message.currentSaveDir)
        break
      case 'readEventCanceled':
        {
          // 取消时通知渲染进程
          mainWindow.webContents.send('export-canceled', message.currentSaveDir)
        }
        break
      case 'readEventError':
        {
          // 转发给所有渲染进程窗口（或特定窗口）
          mainWindow.webContents.send('readEventErrorFromMain', {
            deviceIp: message.deviceIp,
            error: message.error
          })
        }
        break
      case 'readEventProgress': {
        /*       console.log('接收到事件modbus-stats', message) */
        mainWindow.webContents.send('update-readEventProgress', {
          ip: message.deviceIp,
          current: message.current,
          total: message.total
        })
      }
      case 'modbus-stats': {
        /* console.log('接收到事件modbus-stats', message) */
        mainWindow.webContents.send('update-modbus-stats', {
          ip: message.ip,
          tx: message.tx,
          rx: message.rx
        })
        break
      }
      case 'config-error': {
        // 处理BMU配置错误，通知前端
        console.log('主进程收到config-error:', message)
        mainWindow.webContents.send('config-error', {
          deviceIp: message.deviceIp,
          error: message.error,
          details: message.details
        })
        break
      }
      case 'config-corrected': {
        // 处理BMU配置修正，通知前端
        console.log('主进程收到config-corrected:', message)
        mainWindow.webContents.send('config-corrected', {
          deviceIp: message.deviceIp,
          warnings: message.warnings,
          details: message.details
        })
        break
      }
      case 'config-recovered': {
        // 处理BMU配置恢复，通知前端
        console.log('主进程收到config-recovered:', message)
        mainWindow.webContents.send('config-recovered', {
          deviceIp: message.deviceIp,
          recoveryMessages: message.recoveryMessages,
          details: message.details
        })
        break
      }
    }
    // …其它通用转发
  })
}
