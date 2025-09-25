// ipcThrottler.js  ----- 发送到主进程的通用限速器
import { throttle } from 'lodash'

/*  统一节流窗口（毫秒）——随项目需要修改 */
export const THROTTLE_MS = 300     // 每键 300ms 允许 1 帧
const BACKGROUND_THROTTLE_MS = 300  // 后台时每键 5s 允许 1 帧

/* 检查页面是否在后台 */
let isBackground = false

// 导出设置后台模式的函数，供主进程调用
export function setBackgroundMode(background) {
  isBackground = background
}

function isPageInBackground() {
  return isBackground
}

/* Map<key , throttleFn> */
const throttlers = new Map()

/* 生成唯一键：dataType-block-cluster，可按需改成 topic 等 */
function makeKey(msg){
  const b = msg.blockId   ?? 'x'
  const c = msg.clusterId ?? 'x'
  return `${msg.dataType}-${b}-${c}`
  // return `${b}-${c}`
}

/* —— 核心出口 —— */
export function sendToParent(msg){
  const key = makeKey(msg)

  // 动态选择限流间隔
  const currentThrottleMs = isPageInBackground() ? BACKGROUND_THROTTLE_MS : THROTTLE_MS

  /* 首次遇到该键时，创建独立 throttle 实例 */
  if (!throttlers.has(key)){
    const fn = throttle(
      m => {
        process.send({ type: m.dataType, data: m })
      },
      currentThrottleMs,
      { leading:true, trailing:true }      // 首尾各保留
    )
    throttlers.set(key, fn)
  }
  
  // 如果限流间隔改变，需要重新创建throttle函数
  const existingFn = throttlers.get(key)
  if (existingFn && existingFn._throttleMs !== currentThrottleMs) {
    existingFn.cancel() // 取消现有的
    const newFn = throttle(
      m => {
        process.send({ type: m.dataType, data: m })
      },
      currentThrottleMs,
      { leading:true, trailing:true }
    )
    newFn._throttleMs = currentThrottleMs // 标记当前限流间隔
    throttlers.set(key, newFn)
  }
  
  throttlers.get(key)(msg)
}

/* 进程退出时可调用，立刻把所有队列中的“最后一帧”刷出 */
export function flushThrottlers(){
  throttlers.forEach(fn => fn.flush())
}

export function cancelThrottlers() {
  throttlers.forEach(fn => fn.cancel());   // ⬅️ 关键：kill internal setTimeout :contentReference[oaicite:0]{index=0}
  throttlers.clear();
}

