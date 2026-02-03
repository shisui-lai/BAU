import { ipcMain } from 'electron'
import { diagLogger } from '../diagnosticLogger.js'

export function createMessageHandler(processManager, mainWindow) {
  let busyDialogShowing = false
  let pendingSetImmediateCount = 0

  return (msg) => {
    if (msg.API === 'disk-space-warning') {
      try {
        mainWindow.webContents.send('disk-space-warning')
      } catch {}
      diagLogger.warn('forward-disk-space-warning', 'sent')
      return
    }
    if (msg.API === 'save-excel') {
      if (busyDialogShowing) return
      busyDialogShowing = true
      try {
        mainWindow.webContents.send('show-save-excel-dialog')
        ipcMain.once('save-excel-decision', (_event, decision) => {
          const currentTask = processManager.getMQTTTask()
          if (currentTask && !currentTask.killed) {
            currentTask.send({ API: 'save-excel-decision', decision })
          }
          busyDialogShowing = false
          diagLogger.info('save-excel-decision', decision)
        })
      } catch (e) {
        busyDialogShowing = false
      }
      return
    }

    if (msg.type === 'heartbeat') return

    if (msg.type === 'data-rate-update') {
      pendingSetImmediateCount++
      setImmediate(() => {
        mainWindow.webContents.send('data-rate-update', msg.data)
        pendingSetImmediateCount--
      })
      diagLogger.debug('forward-data-rate-update', '', { rate: msg?.data?.rate })
      return
    }

    if (msg.type === 'readEventProgress') {
      pendingSetImmediateCount++
      setImmediate(() => {
        mainWindow.webContents.send('update-readEventProgress', msg.data)
        pendingSetImmediateCount--
      })
      diagLogger.debug('forward-readEventProgress', '', { data: msg.data })
      return
    }

    if (msg.type === 'readEventCompleted') {
      pendingSetImmediateCount++
      setImmediate(() => {
        mainWindow.webContents.send('export-completed', msg.data)
        pendingSetImmediateCount--
      })
      diagLogger.info('forward-readEventCompleted', '', { data: msg.data })
      return
    }

    if (msg.type === 'readEventRecentFinal') {
      pendingSetImmediateCount++
      setImmediate(() => {
        mainWindow.webContents.send('readEventRecentFinal', msg.data)
        pendingSetImmediateCount--
      })
      diagLogger.info('forward-readEventRecentFinal', '', {
        count: Array.isArray(msg?.data?.rows) ? msg.data.rows.length : 0
      })
      return
    }

    if (msg.type === 'readEventError') {
      pendingSetImmediateCount++
      setImmediate(() => {
        mainWindow.webContents.send('readEventErrorFromMain', msg.data)
        pendingSetImmediateCount--
      })
      diagLogger.error('forward-readEventError', '', { data: msg.data })
      return
    }

    if (msg.type === 'readEventCanceled') {
      pendingSetImmediateCount++
      setImmediate(() => {
        mainWindow.webContents.send('export-canceled', msg.data)
        pendingSetImmediateCount--
      })
      diagLogger.warn('forward-readEventCanceled', '', { data: msg.data })
      return
    }

    // 默认转发
    pendingSetImmediateCount++
    setImmediate(() => {
      mainWindow.webContents.send(msg.type, msg.data)
      pendingSetImmediateCount--
    })
    if (msg.type === 'crash-summary') {
      diagLogger.error('forward-crash-summary', msg.data)
    }

    // 心跳透传（仅业务数据）
    if (
      msg.data &&
      typeof msg.data === 'object' &&
      Object.keys(msg.data).length > 0 &&
      msg.type !== 'mqtt-connected' &&
      msg.type !== 'mqtt-disconnected' &&
      msg.type !== 'mqtt-connect-result' &&
      msg.type !== 'mqtt-disconnect-result' &&
      msg.type !== 'mqtt-test-result' &&
      msg.type !== 'data-rate-update' &&
      msg.type !== 'heartbeat'
    ) {
      pendingSetImmediateCount++
      setImmediate(() => {
        mainWindow.webContents.send('mqtt-data-heartbeat', {
          timestamp: Date.now(),
          messageType: msg.type
        })
        pendingSetImmediateCount--
      })
      diagLogger.debug('forward-heartbeat', '', { type: msg.type })
    }
  }
}

// 渲染端磁盘空间决策：继续/停止
export function registerDiskSpaceDecisionForwarder(processManager) {
  ipcMain.on('disk-space-decision', (_event, decision) => {
    try {
      const currentTask = processManager.getMQTTTask()
      if (currentTask && !currentTask.killed) {
        currentTask.send({ API: 'disk-space-decision', decision })
      } else {
        // no child task available
      }
    } catch {}
    diagLogger.info('disk-space-decision', decision)
  })
}
