;('use strict')
import { modbusTcpClient, setContextVariables } from './client/modbusClient'
import {
  MBS_STATE_INIT,
  MBS_STATE_IDLE,
  MBS_STATE_GOOD_CONNECT,
  MBS_STATE_FAIL_CONNECT,
  MBS_STATE_NEXT,
  MBS_STATE_GOOD_READ,
  MBS_STATE_FAIL_READ,
  mbsId,
  mbsPort,
  mbsTimeout
} from './client/stateCounts'
import { runModbus } from './scheduler/runLoop'
import { startSaveTimer, stopSaveTimer } from './dataExport/runningDataExport'
import { startReadingEvent, stopReadingEvent } from './eventExport/eventExport'
import { write } from './handlers/write'
import { eventState } from './eventExport/utils'

let modbusClients = {}
let selectedInterface = null
let selectedInterfaceName = null
let isAdmin = false
const savedModules = {}

// 初始化上下文变量
function initializeContext() {
  setContextVariables(selectedInterface, selectedInterfaceName, modbusClients, isAdmin)
}

function getModbusClients() {
  return modbusClients
}
let statsTimer = null

function startStatsEmitter(interval = 1000, delay = 20) {
  /*  console.log(Object.keys(modbusClients)) */
  if (statsTimer) return
  statsTimer = setInterval(() => {
    setTimeout(() => {
      Object.values(modbusClients).forEach((client) => {
        if (!client) return
        process.send({
          API: 'modbus-stats',
          ip: client.mbsHost,
          tx: client.txCount,
          rx: client.rxCount
        })
      })
    }, delay)
  }, interval)
}

function stopStatsEmitter() {
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
}
let runLoopCount = 0
let pollTimer = null
let isPolling = false
function startPolling() {
  if (isPolling) return
  isPolling = true
  runLoopCount++
  console.log('Modbus 轮询次数：', runLoopCount)
  const delay = 1000
  console.log('✅ 已启动 Modbus 轮询')
  // 开启一个定时器，并保存 ID
  pollTimer = setInterval(async () => {
    const ips = Object.keys(modbusClients)
    for (const ip of ips) {
      const client = modbusClients[ip]
      if (client && !client.skip && client.mbsState !== MBS_STATE_IDLE) {
        // ✅ 关键修复：检查是否正在处理，防止并发
        /* if (client.isProcessing) {
          console.warn(`⚠️ [${ip}] 上一轮还在处理中，跳过本次调度`)
          continue
        } */
        try {
          await runModbus(client)
        } catch (e) {
          // ignore
        }
      }
    }
  }, delay)
}
function stopPolling() {
  if (pollTimer != null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  isPolling = false
  console.log('✅ 已停止 Modbus 轮询（无活动客户端）')
  stopStatsEmitter()
}
function addModbusClient(ip, force = false) {
  // 检查是否已存在该IP的客户端
  if (modbusClients[ip] && !force) {
    console.log(`客户端 ${ip} 已存在，无需重复创建`)
    return modbusClients[ip] // 返回现有实例
  }
  // 如果强制且已有客户端，先销毁旧实例
  if (modbusClients[ip] && force) {
    console.log(`强制重建客户端 ${ip}，先断开旧连接`)
    modbusClients[ip].forceDisconnect()
    savedModules[ip] = modbusClients[ip].modules
    delete modbusClients[ip]
  }
  const oldModules = savedModules[ip]
  const client = new modbusTcpClient(ip)
  if (oldModules) {
    client.modules = oldModules
    delete savedModules[ip]
  }
  client.init()
  modbusClients[ip] = client // 使用IP地址作为键存储客户端实例
  console.log('新增客户端：', client.mbsHost)
  /*   console.log('重新连接后', client.modules) */
  startPolling()
  client
    .connect(true)
    .then(() => {
      client.txCount = 0
      client.rxCount = 0
    })
    .catch((err) => {
      console.error(`立即连接 ${ip} 失败:`, err)
    })
  startStatsEmitter()
  return client // 可选：返回新创建的客户端实例以便后续使用（但在这个例子中我们不需要它）
}
process.on('message', async (message) => {
  if (message.type === 'set-admin-status') {
    isAdmin = !!message.isAdmin
    console.log('收到管理员状态:', isAdmin)
    initializeContext() // 更新上下文变量，确保 modbusClient.js 中的 isAdmin 也被更新
    return
  }
  switch (message.API) {
    case 'update-online-ips':
      {
        // ✅ 新增：根据查询到的在线IP列表，终止不在列表中的IP的重连
        const onlineIps = message.onlineIps || []
        console.log(`[MBSTASK] 收到在线IP列表:`, onlineIps)
        
        // 遍历所有客户端，终止不在在线列表中的IP的重连
        Object.keys(modbusClients).forEach((ip) => {
          const client = modbusClients[ip]
          if (!client) return
          
          // 如果该IP不在在线列表中，且正在重连中（未连接成功）
          if (!onlineIps.includes(ip) && client.mbsState !== MBS_STATE_GOOD_CONNECT) {
            console.log(`[MBSTASK] IP ${ip} 不在查询结果中，终止其重连`)
            
            // 终止重连
            client.isTerminated = true
            client.skip = true
            client.mbsState = MBS_STATE_FAIL_CONNECT
            
            // 清除重连定时器
            if (client.autoReconnectTimeout) {
              clearTimeout(client.autoReconnectTimeout)
              client.autoReconnectTimeout = null
            }
            
            // 停止心跳和健康检查
            client.stopHeartbeat()
            client.stopHealthCheck()
            
            // 通知前端该IP重连已终止
            process.send({
              API: 'connection-status',
              ip: ip,
              success: false,
              error: '不在查询结果中，已停止重连',
              errorType: 'not_in_query_result'
            })
            
            console.log(`[MBSTASK] 已终止 IP ${ip} 的重连`)
          }
        })
      }
      break
    case 'set-interface':
      {
        selectedInterface = message.selectedInterface
        selectedInterfaceName = message.selectedInterfaceName
        initializeContext() // 更新上下文变量
      }
      break
    case 'modbus-init-batch':
      {
        console.log('Connecting to Modbus TCP')
        message.clients.forEach((c) => {
          addModbusClient(c.ModbusServerIP, true)
        })
        initializeContext() // 更新上下文变量
      }
      break
    case 'forceReconnect':
      {
        message.ips.forEach((ip) => {
          const client = modbusClients[ip]
          if (client) {
            // 强制销毁旧连接
            client.forceDisconnect()
            // 创建新客户端实例
            modbusClients[ip] = new modbusTcpClient(ip)
            modbusClients[ip].init()
            console.log(`已重置客户端: ${ip}`)
          }
        })
        return
      }
      break
    case 'modbus-disconnect':
      {
        const ip = message.client.ModbusServerIP
        /*  console.log('Disconnecting from Modbus TCP') */
        const client = modbusClients[ip]
        if (client) {
          savedModules[ip] = client.modules
          client.forceDisconnect()
          delete modbusClients[ip] // 移出连接池
          // 如果所有客户端都断开了，也可选择停止轮询
          if (Object.keys(modbusClients).length === 0) {
            stopPolling()
            console.log('✅ 已停止 Modbus 轮询（无活动客户端）')
          }
          process.send({
            API: 'connection-status',
            ip: message.client.ModbusServerIP,
            success: false,
            error: 'disconnected' // 附加错误信息
          })
        }
        /* removeModbusClientByIp(message.client.ModbusServerIP) */
      }
      break
    case 'modbus-disconnect-all':
      {
        // 批量断开所有Modbus连接
        const ips = message.ips || []
        console.log(`[MBSTASK] 批量断开所有连接，共 ${ips.length} 个IP`)
        
        ips.forEach((ip) => {
          const client = modbusClients[ip]
          if (client) {
            savedModules[ip] = client.modules
            client.forceDisconnect()
            delete modbusClients[ip]
            
            // 发送设备状态更新到渲染进程
            process.send({
              API: 'connection-status',
              ip: ip,
              success: false,
              error: 'disconnected' // 附加错误信息
            })
            
            console.log(`[MBSTASK] 已断开连接: ${ip}`)
          }
        })
        
        // 停止轮询
        if (Object.keys(modbusClients).length === 0) {
          stopPolling()
          console.log('✅ 已停止 Modbus 轮询（所有客户端已断开）')
        }
        
        console.log(`[MBSTASK] 批量断开完成`)
      }
      break
    case 'start-all':
      {
        const targetIp = message.targetIp
        console.log('[MBSTASK] 收到 start-all 消息, targetIp:', targetIp)
        
        // 遍历所有客户端
        Object.keys(modbusClients).forEach((ip) => {
          // 如果指定了 targetIp 且不是 'all'，只处理该IP
          if (targetIp !== 'all' && ip !== targetIp) {
            return
          }
          
          const client = modbusClients[ip]
          if (client) {
            console.log(`[MBSTASK] start client: ${ip}`)
            client.isStopped = false // 启动读取全部数据
            client.mbsState = MBS_STATE_NEXT // 手动触发读取状态
            console.log(`客户端 ${client.mbsHost} 开始读取全部数据`)
            // 立即触发一次读取，确保不需要等待定时器
            runModbus(client).catch((e) => {
              console.error(`[${client.mbsHost}] 启动读取失败:`, e)
            })
            process.send({
              API: 'connection-status',
              ip: ip,
              success: false,
              error: 'startAllCommunication'
            })
          }
        })
      }
      break
    case 'stop-all':
      {
        const targetIp = message.targetIp
        console.log('[MBSTASK] 收到 stop-all 消息, targetIp:', targetIp)
        
        // 遍历所有客户端
        Object.keys(modbusClients).forEach((ip) => {
          // 如果指定了 targetIp 且不是 'all'，只处理该IP
          if (targetIp !== 'all' && ip !== targetIp) {
            return
          }
          
          const client = modbusClients[ip]
          if (client) {
            client.isStopped = true // 停止读取全部
            console.log(`客户端 ${client.mbsHost} 停止读取全部数据`)
            process.send({
              API: 'connection-status',
              ip: ip,
              success: false,
              error: 'stopAllCommunication'
            })
          }
        })
      }
      break
    case 'start':
      {
        const client = modbusClients[message.client.ModbusServerIP]
        console.log('start client:',client.mbsHost)
        if (client) {
          client.isStopped = false // 启动读取全部数据
          client.mbsState = MBS_STATE_NEXT // 手动触发读取状态
          /*           await runModbus(client) // 立即触发处理
           */ console.log(`客户端 ${client.mbsHost} 开始读取全部数据`)
          process.send({
            API: 'connection-status',
            ip: message.client.ModbusServerIP,
            success: false,
            error: 'startAllCommunication' // 附加错误信息
          })
        }
      }
      break
    case 'stop':
      {
        const client = modbusClients[message.client.ModbusServerIP]
        if (client) {
          client.isStopped = true // 停止读取全部
          console.log(`客户端 ${client.mbsHost} 停止读取全部数据`)
          process.send({
            API: 'connection-status',
            ip: message.client.ModbusServerIP,
            success: false,
            error: 'stopAllCommunication' // 附加错误信息
          })
        }
      }
      break

    case 'startReadParams':
      {
        const module = message.module
        const client = modbusClients[message.client.ModbusServerIP]
        if (!client || !client.modules) {
          //console.error('客户端未初始化，无法读取参数')
          return
        }
        if (client.modules[module]) {
          client.modules[module].isStoppedParams = false // 启动读取参数
          /*  client.mbsState = MBS_STATE_NEXT // 手动触发读取状态 */
          /* console.log(`客户端 ${client.mbsHost} ${module} 开始读取`) */
        }
      }
      break
    case 'stopReadParams':
      {
        const module = message.module
        const client = modbusClients[message.client.ModbusServerIP]
        if (!client || !client.modules) {
          //console.error('客户端未初始化，无法读取参数')
          return
        }
        if (client.modules[module]) {
          client.modules[module].isStoppedParams = true // 停止读取参数
          /* console.log(`客户端 ${client.mbsHost} ${module} 停止读取`) */
        }
      }
      break
    case 'startReadEvent':
      {
        /* console.log(message.data) */
        // 获取对应的客户端实例
        const { offsetRead, totalRead, ip, saveDir } = message.data
        eventState.currentReadingEventIp = ip
        const clientWrapper = modbusClients[ip]
        // 如果客户端已连接，开始读取，否则连接客户端
        if (clientWrapper?.client?.isOpen) {
          startReadingEvent(clientWrapper, totalRead || 0, offsetRead || 0, saveDir)
        } else {
          console.error(`Client for IP ${ip} not open`)
          // 可选：先尝试打开连接，再调用 startReadingEvent
        }
      }
      break
    case 'cancelExportEvent':
      {
        const { ip } = message.data
        const clientWrapper = modbusClients[ip]
        stopReadingEvent(clientWrapper, modbusClients, true)
      }
      break
    case 'startExportFromMain':
      {
        const client = modbusClients[message.client.ModbusServerIP]
        if (client) {
          client.isSetDataExport = true //控制每个client数据是否写入缓存
        }
        //console.log('startExportFromMain,isSetDataExport:', client.isSetDataExport)
        startSaveTimer()
      }
      break
    case 'stopExportFromMain':
      {
        const client = modbusClients[message.client.ModbusServerIP]
        if (client) {
          client.isSetDataExport = false //控制每个client数据是否写入缓存
        }
        /*   console.log('stopExportFromMain,isSetDataExport:', client.isSetDataExport) */
        stopSaveTimer()
      }
      break
    case 'startBufferExportFromMain':
      {
        const client = modbusClients[message.client.ModbusServerIP]
        if (client) {
          client.isSetBufferExport = true //控制每个client数据是否写入缓存
        }
        //console.log('收到startBufferExportFromMain,isSetBufferExport:', client.isSetBufferExport)
        client.enableDataExport()
      }
      break
    case 'stopBufferExportFromMain':
      {
        const client = modbusClients[message.client.ModbusServerIP]
        if (client) {
          client.isSetBufferExport = false //控制每个client数据是否写入缓存
        }
      }
      break
    case 'read-control-registers-fromMain':
      {
        const { ip, requestId } = message
        const client = modbusClients[ip]
        if (client) {
          try {
            const data = await client.client.readHoldingRegisters(0xc000, 17)
            process.send({ API: 'control-registersValue', data: data.data, requestId: requestId })
          } catch (e) {
            console.log(e)
          }
        }
      }
      break
    case 'read-soc-params-fromMain':
      {
        const { ip, requestId } = message
        const client = modbusClients[ip]
        if (client) {
          try {
            // 第一帧：读取0x3200开始的2个寄存器（簇显示SOC和单体最大SOC）
            const data1 = await client.client.readHoldingRegisters(0x3200, 2)
            // 第二帧：读取0x3221开始的1个寄存器（单体最小SOC）
            const data2 = await client.client.readHoldingRegisters(0x3221, 1)

            // 将读取到的值除以10，保留一位小数
            const processedFrame1 = data1.data.map(value => Math.round((value / 10) * 10) / 10)
            const processedFrame2 = data2.data.map(value => Math.round((value / 10) * 10) / 10)

            process.send({
              API: 'soc-params-value',
              data: {
                frame1: processedFrame1, // [簇显示SOC, 单体最大SOC] - 已除以10
                frame2: processedFrame2 // [单体最小SOC] - 已除以10
              },
              requestId: requestId
            })
          } catch (e) {
            console.log('读取SOC参数失败:', e)
            process.send({
              API: 'soc-params-value',
              data: null,
              error: e.message,
              requestId: requestId
            })
          }
        }
      }
      break
    case 'get-export-status-fromMain':
      {
        /*  console.log('[WORKER] 收到 get-export-status-fromMain', message) */
        const { ip, requestId } = message
        const client = modbusClients[ip]
        if (client) {
          process.send({
            API: 'get-export-status-fromMbs',
            data: {
              dataExport: client.isSetDataExport,
              bufferExport: client.isSetBufferExport
            },
            requestId: requestId
          })
        }
      }
      break
    case 'write-modbus-registers from main':
      {
        /*  console.log('收到write-modbus-registers from main') */
        write(message, modbusClients)
      }
      break
    case 'app-quit':
      {
        console.log('收到主进程退出通知，开始清理流式写入器...')
        // 所有清理完毕，告诉主进程可以退出了
        process.send({ type: 'app-quit-done' })
        // 然后自己退出
        process.exit(0)
      }
      break
  }
})
export { selectedInterface, selectedInterfaceName, modbusClients, getModbusClients, isAdmin }
