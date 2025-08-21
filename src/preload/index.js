import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

 


// IPC 管理类（简化版，仅用于演示）
/* ----------------- ① 全局 Subject 收原始帧 ----------------- */

class IpcManager {
  listeners = new Map()
  nextListenerId = 1

  registerListener(channel, callback) {
    const listenerId = this.nextListenerId++
    this.listeners.set(listenerId, { channel, callback })
    ipcRenderer.on(channel, (event, ...args) => {
      this.listeners.get(listenerId)?.callback(event, ...args)
    })
    return listenerId
  }

  unregisterListener(listenerId) {
    const listener = this.listeners.get(listenerId)
    if (listener) {
      // 注意：Electron 的 ipcRenderer 没有提供直接注销特定监听器的方法，
      // 所以这里我们只能通过移除整个 Map 条目来“模拟”注销。
      // 在实际应用中，你可能需要设计更复杂的逻辑来管理监听器的生命周期。
      ipcRenderer.removeAllListeners(listener.channel)
      this.listeners.delete(listenerId)
    }
  }

  unregisterAllListeners() {
    this.listeners.forEach((listener) => {
      ipcRenderer.removeAllListeners(listener.channel)
    })
    this.listeners.clear()
  }
}

// 创建 IpcManager 的单例
const ipcManager = new IpcManager()

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('ftpConfig', {
      // 同步接口：直接返回内置的 FTP 服务配置
      get: () => ipcRenderer.sendSync('ftp-config:get'),
      // （可选）监听 FTP 服务状态变化
      onReady: (cb) => ipcRenderer.on('ftp-config:ready', (_, cfg) => cb(cfg))
    })
    contextBridge.exposeInMainWorld('ftpControl', {
      start: (cfg) => ipcRenderer.invoke('ftp-start', cfg),
      stop: () => ipcRenderer.invoke('ftp-stop')
    })
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('electronAPI', {
      onUpdateCounter: (callback) =>
        ipcRenderer.on('update-counter', (_event, value) => callback(value)),
      counterValue: (value) => ipcRenderer.send('counter-value', value),

      /** 统一封装：向主进程发送 MQTT 发布请求
   *  @param {string} topic       完整 MQTT topic
   *  @param {string} payloadHex  纯十六进制字符串，例如 'ff00aa'
   *  @return Promise<boolean>    主进程 handle 回传的结果
   */
  mqttPublish: (topic, payloadHex) => {
    // console.log('[Preload] mqttPublish → main', topic, payloadHex)
    // 与主进程约定的 handle 名称保持一致
    return ipcRenderer.invoke('mqttPublish', topic, payloadHex)
  },

      ipc: {
        send: (channel, data) => ipcRenderer.send(channel, data),
        invoke: (channel, data) => ipcRenderer.invoke(channel, data),
        registerListener: (channel, callback) => ipcManager.registerListener(channel, callback),
        unregisterListener: (listenerId) => ipcManager.unregisterListener(listenerId),
        unregisterAllListeners: () => ipcManager.unregisterAllListeners()
      },

      filesystem: {
        getDirname: () => ipcRenderer.invoke('get-dirname') // 从主进程获取 __dirname
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI

  window.api = api
}
