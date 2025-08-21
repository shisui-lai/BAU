// global.d.ts
export {}

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        on(channel:string, listener:(event:any, msg:any)=>void): void
        removeListener(channel:string, listener:(event:any, msg:any)=>void): void
        /* 如果还有 invoke/send 等方法，也在这补充 */
      }
    }
  }
}
