// ipcThrottler.js  ----- 发送到主进程的通用限速器
import { throttle } from 'lodash'

/*  统一节流窗口（毫秒）——随项目需要修改 */
export const THROTTLE_MS = 1000     // 每键 0.5 s 允许 1 帧

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

  /* 首次遇到该键时，创建独立 throttle 实例 */
  if (!throttlers.has(key)){
    // const fn = throttle(
    //   m => process.send({ type:'mqtt-message', data:m }),
       const fn = throttle(
  m => {
    // console.log('[throttle] SENT', makeKey(m), m.dataType, Date.now())
    process.send({ type: m.dataType, data: m })
  },
      THROTTLE_MS,
      { leading:true, trailing:true }      // 首尾各保留
    )
    throttlers.set(key, fn)
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

