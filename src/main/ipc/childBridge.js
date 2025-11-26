import { ipcMain } from 'electron'

export function createMessageHandler(processManager, mainWindow) {
  let busyDialogShowing = false
  let pendingSetImmediateCount = 0

  return (msg) => {
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
      return
    }

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
        mainWindow.webContents.send('export-canceled', msg.data)
        pendingSetImmediateCount--
      })
      return
    }

    // 默认转发
    pendingSetImmediateCount++
    setImmediate(() => {
      mainWindow.webContents.send(msg.type, msg.data)
      pendingSetImmediateCount--
    })

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
    }
  }
}