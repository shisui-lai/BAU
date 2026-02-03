import { BrowserWindow, screen } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
let aboutWin = null
function openAboutWindow() {
  if (aboutWin && !aboutWin.isDestroyed()) {
    aboutWin.focus()
    return
  }
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  aboutWin = new BrowserWindow({
    width,
    height,
    title: '关于',
    autoHideMenuBar: true,
    menuBarVisible: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.js'), // 在 preload 里暴露 ipcRenderer
      nodeIntegration: false
    }
  })
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    aboutWin.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/about`)
  } else {
    // 打包后：index.html 其实在 app.asar/dist/renderer/index.html
    // 这时 __dirname = …/app.asar/dist/main
    // ../renderer/index.html 刚好指向 app.asar/dist/renderer/index.html
    aboutWin.loadFile(join(__dirname, '../renderer/index.html'), { hash: '#/about' })
  }
  aboutWin.on('closed', () => {
    aboutWin = null
  })
}
export { aboutWin, openAboutWindow }
