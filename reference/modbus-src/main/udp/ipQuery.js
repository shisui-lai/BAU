const dgram = require('dgram')
import { modbusTask } from '../index'
export const ipQueryHandler = (event, { selectedInterface, selectedInterfaceName }) => {
  modbusTask.send({ API: 'set-interface', selectedInterface, selectedInterfaceName })
  console.log('[UDP QUERY IP] handler fired, interface =', selectedInterface)
  const udpClient = dgram.createSocket('udp4') // 创建一个UDP客户端
  const broadcastMessage = Buffer.from([0xf1, 0x1f, 0x46, 0x42, 0x43, 0x55]) // 广播消息
  const BROADCAST_PORT = 40000 // 广播端口
  let socketClosed = false // 标记套接字状态
  // 配置 UDP 套接字
  udpClient.bind(30000, selectedInterface, () => {
    // 绑定套接字
    udpClient.setBroadcast(true)
    console.log('binding UDP socket success to', selectedInterface)

    udpClient.send(
      broadcastMessage, // 消息
      0, // 偏移量
      broadcastMessage.length, // 消息长度
      BROADCAST_PORT, // 目标端口
      '255.255.255.255', // 广播地址
      (err) => {
        if (err) {
          console.error('send UDP broadcast failed:', err.message)
          event.sender.send('udp-query-ip-result', { success: false, error: err.message })
          udpClient.close()
          socketClosed = true // 标记套接字为关闭状态?
          return
        }
        console.log('send UDP broadcast successfully', broadcastMessage)
      }
    )
  })
  const foundDevices = [] // 用于存储查询到的设备信息
  // 监听返回的消息?
  udpClient.on('message', (msg, rinfo) => {
    /*     console.log(`get the response from ${rinfo.address}:${rinfo.port}`)
     */ foundDevices.push({ ip: rinfo.address, port: rinfo.port, data: msg.toString('hex') })
  })
  // 设置超时时间，结束查询
  setTimeout(() => {
    if (!socketClosed) {
      udpClient.close() // 仅在套接字未关闭时调用
      socketClosed = true // 更新状态
      /*       console.log('UDP broadcast query finish success:', foundDevices)
       */ event.sender.send('udp-query-ip-result', { success: true, devices: foundDevices }) // 将结果发送给渲染进程
    }
  }, 1000) // 等待 1 秒钟

  // 捕获套接字错误
  udpClient.on('error', (err) => {
    console.error('UDP socket error:', err.message)
    if (!socketClosed) {
      udpClient.close()
      socketClosed = true // 更新状态
    }
    event.sender.send('udp-query-result', { success: false, error: err.message })
  })
}
export function queryOnlineIps() {
  return new Promise((resolve) => {
    const foundIps = []
    const dgram = require('dgram')
    const udpClient = dgram.createSocket('udp4')
    const broadcastMessage = Buffer.from([0xf1, 0x1f, 0x46, 0x42, 0x43, 0x55])
    udpClient.bind(30000, () => {
      udpClient.setBroadcast(true)
      udpClient.send(broadcastMessage, 0, broadcastMessage.length, 40000, '255.255.255.255')
    })
    udpClient.on('message', (msg, rinfo) => {
      foundIps.push(rinfo.address)
    })
    setTimeout(() => {
      udpClient.close()
      resolve(foundIps)
    }, 1000)
  })
}
