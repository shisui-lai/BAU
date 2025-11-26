const dgram = require('dgram')
import { modbusTask } from '../index'
export const ipQueryHandler = (event, { selectedInterface, selectedInterfaceName }) => {
  modbusTask.send({ API: 'set-interface', selectedInterface, selectedInterfaceName })
  console.log('[UDP QUERY IP] handler fired, interface =', selectedInterface)

  const MAX_RETRIES = 3 // 最大重试次数
  const RETRY_DELAY = 800 // 重试延迟时间（毫秒）
  const QUERY_TIMEOUT = 1500 // 单次查询超时时间（毫秒）

  let retryCount = 0
  let foundDevices = [] // 用于存储查询到的设备信息

  const performQuery = () => {
    const udpClient = dgram.createSocket('udp4') // 创建一个UDP客户端
    const broadcastMessage = Buffer.from([0xf1, 0x1f, 0x46, 0x42, 0x43, 0x55]) // 广播消息
    const BROADCAST_PORT = 40000 // 广播端口
    let socketClosed = false // 标记套接字状态

    console.log(`[UDP QUERY IP] 尝试第 ${retryCount + 1} 次查询`)

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
            if (!socketClosed) {
              udpClient.close()
              socketClosed = true
            }
            handleQueryResult(false, err.message)
            return
          }
          console.log('send UDP broadcast successfully', broadcastMessage)
        }
      )
    })

    // 监听返回的消息
    udpClient.on('message', (msg, rinfo) => {
      console.log(`get the response from ${rinfo.address}:${rinfo.port}`)
      foundDevices.push({ ip: rinfo.address, port: rinfo.port, data: msg.toString('hex') })
    })

    // 设置超时时间，结束查询
    setTimeout(() => {
      if (!socketClosed) {
        udpClient.close() // 仅在套接字未关闭时调用
        socketClosed = true // 更新状态
        console.log(
          `[UDP QUERY IP] 第 ${retryCount + 1} 次查询完成，找到 ${foundDevices.length} 个设备`
        )

        // 检查是否找到设备
        if (foundDevices.length > 0) {
          // 找到设备，发送结果到渲染进程
          event.sender.send('udp-query-ip-result', { success: true, devices: foundDevices })
          
          // ✅ 新增：将查询到的在线IP列表发送到modbusTask子进程
          const onlineIps = foundDevices.map((device) => device.ip)
          modbusTask.send({
            API: 'update-online-ips',
            onlineIps: onlineIps
          })
          console.log(`[UDP QUERY IP] 已发送在线IP列表到modbusTask:`, onlineIps)
        } else {
          // 没有找到设备，检查是否需要重试
          if (retryCount < MAX_RETRIES - 1) {
            retryCount++
            console.log(
              `[UDP QUERY IP] 未找到设备，${RETRY_DELAY}ms后进行第 ${retryCount + 1} 次重试`
            )
            setTimeout(performQuery, RETRY_DELAY)
          } else {
            // 达到最大重试次数，发送空结果
            console.log('[UDP QUERY IP] 达到最大重试次数，未找到任何设备')
            event.sender.send('udp-query-ip-result', {
              success: true,
              devices: [],
              noDevicesFound: true,
              message: '未查询到任何设备，请检查网络连接'
            })
            
            // ✅ 新增：即使未找到设备，也发送空列表到modbusTask
            modbusTask.send({
              API: 'update-online-ips',
              onlineIps: []
            })
            console.log(`[UDP QUERY IP] 未找到设备，已发送空列表到modbusTask`)
          }
        }
      }
    }, QUERY_TIMEOUT) // 等待 2 秒钟

    // 捕获套接字错误
    udpClient.on('error', (err) => {
      console.error('UDP socket error:', err.message)
      if (!socketClosed) {
        udpClient.close()
        socketClosed = true // 更新状态
      }
      handleQueryResult(false, err.message)
    })
  }

  const handleQueryResult = (success, error) => {
    if (success) {
      event.sender.send('udp-query-ip-result', { success: true, devices: foundDevices })
    } else {
      event.sender.send('udp-query-ip-result', { success: false, error })
    }
  }

  // 开始第一次查询
  performQuery()
}
export function queryOnlineIps() {
  return new Promise((resolve) => {
    const MAX_RETRIES = 3 // 最大重试次数
    const RETRY_DELAY = 1000 // 重试延迟时间（毫秒）
    const QUERY_TIMEOUT = 2000 // 单次查询超时时间（毫秒）

    let retryCount = 0
    let foundIps = []

    const performQuery = () => {
      const dgram = require('dgram')
      const udpClient = dgram.createSocket('udp4')
      const broadcastMessage = Buffer.from([0xf1, 0x1f, 0x46, 0x42, 0x43, 0x55])

      console.log(`[queryOnlineIps] 尝试第 ${retryCount + 1} 次查询`)

      udpClient.bind(30000, () => {
        udpClient.setBroadcast(true)
        udpClient.send(broadcastMessage, 0, broadcastMessage.length, 40000, '255.255.255.255')
      })

      udpClient.on('message', (msg, rinfo) => {
        foundIps.push(rinfo.address)
        console.log(`[queryOnlineIps] 收到响应: ${rinfo.address}`)
      })

      setTimeout(() => {
        udpClient.close()
        console.log(
          `[queryOnlineIps] 第 ${retryCount + 1} 次查询完成，找到 ${foundIps.length} 个IP`
        )

        // 检查是否找到IP
        if (foundIps.length > 0) {
          // 找到IP，返回结果
          resolve(foundIps)
        } else {
          // 没有找到IP，检查是否需要重试
          if (retryCount < MAX_RETRIES - 1) {
            retryCount++
            console.log(
              `[queryOnlineIps] 未找到IP，${RETRY_DELAY}ms后进行第 ${retryCount + 1} 次重试`
            )
            setTimeout(performQuery, RETRY_DELAY)
          } else {
            // 达到最大重试次数，返回空结果
            console.log('[queryOnlineIps] 达到最大重试次数，未找到任何IP')
            resolve([])
          }
        }
      }, QUERY_TIMEOUT)
    }

    // 开始第一次查询
    performQuery()
  })
}
