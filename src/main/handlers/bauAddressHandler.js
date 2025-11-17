//UDP通信、数据包处理、网络剧接口管理
import dgram from 'dgram'
import os from 'os'
import path from 'path'
import fs from 'fs'
const tftp = require('tftp')

// 协议常量
const PC_PORT = 35000
const BAU_PORT = 39999
const BROADCAST_ADDRESS = '255.255.255.255'
const RESPONSE_TIMEOUT = 2000

// TFTP服务器相关
let tftpServer = null
let TFTP_ROOT = path.join(process.cwd(), 'upgrade-files')
const TFTP_DEFAULT_IP = '192.168.11.200'
const TFTP_DEFAULT_PORT = 69

// 强制升级循环发送相关
let forceUpgradeClient = null
let forceUpgradeInterval = null
let isForceUpgrading = false
let forceUpgradeEvent = null

// 功能码定义
const FUNCTION_CODES = {
  QUERY_IP1: 0xA001,
  SET_IP1: 0xA002,
  QUERY_IP2: 0xA003,
  SET_IP2: 0xA004,
  QUERY_MQTT: 0xA005,
  SET_MQTT: 0xA006,
  FORCE_UPGRADE: 0xAFFD,
  RESET_DEFAULT: 0xAFFE,
  RESET_DEVICE: 0xAFFF
}

/**
 * 创建BAU通信数据包
 *
 * 数据包结构说明：
 * - 总长度：22字节 (2字节功能码 + 20字节数据区)
 * - 字节序：功能码使用小端序，数据区根据类型使用大端或小端
 * - 用途：与BAU设备进行UDP通信的标准数据包格式
 *
 * @param {number} functionCode - 功能码，定义操作类型(查询/设置/复位)
 * @param {Object|null} data - 数据对象，设置操作时包含具体配置信息
 * @returns {Buffer} 22字节的二进制数据包
 */
const createPacket = (functionCode, data = null) => {
  // 分配22字节缓冲区：2字节功能码 + 20字节数据区(5个uint32)
  const buffer = Buffer.alloc(22)
  let offset = 0

  // 第1-2字节：功能码 (uint16_t, 小端序)
  // 小端序：低字节在前，高字节在后，适配x86架构
  buffer.writeUInt16LE(functionCode, offset)
  offset += 2

  // 第3-22字节：数据区，根据功能码填充不同内容
  switch (functionCode) {
    // IP查询操作：IP1和IP2查询使用相同的魔数标识
    case FUNCTION_CODES.QUERY_IP1:
    case FUNCTION_CODES.QUERY_IP2:
      // 写入IP查询魔数 0x46424155 (ASCII: "FBAU")，大端序
      // 大端序：高字节在前，网络字节序，便于设备识别
      buffer.writeUInt32BE(0x46424155, offset)
      break
    // IP设置操作：配置BAU设备的网络参数
    case FUNCTION_CODES.SET_IP1:
    case FUNCTION_CODES.SET_IP2:
      if (data) {
        // 第3-6字节：IP地址 (大端序uint32)
        // 将IP字符串转换为32位整数，如"192.168.1.100" -> 0xC0A80164
        buffer.writeUInt32BE(ipStringToIntBE(data.ipAddress), offset)
        offset += 4
        // 第7-10字节：子网掩码 (大端序uint32)
        buffer.writeUInt32BE(ipStringToIntBE(data.subnetMask), offset)
        offset += 4
        // 第11-14字节：默认网关 (大端序uint32)
        buffer.writeUInt32BE(ipStringToIntBE(data.gateway), offset)
        offset += 4
        // 第15-18字节：首选DNS服务器 (大端序uint32)
        buffer.writeUInt32BE(ipStringToIntBE(data.primaryDns), offset)
        offset += 4
        // 第19-22字节：备选DNS服务器 (大端序uint32)
        buffer.writeUInt32BE(ipStringToIntBE(data.secondaryDns), offset)
        return buffer // IP设置包完成，直接返回
      }
      break
    // MQTT查询操作：查询BAU设备的MQTT配置
    case FUNCTION_CODES.QUERY_MQTT:
      // 写入MQTT查询魔数 0xFAFBFCFD，大端序
      // 这个魔数用于标识MQTT相关操作
      buffer.writeUInt32BE(0xFAFBFCFD, offset)
      break

    // MQTT设置操作：配置BAU设备的MQTT服务器参数
    case FUNCTION_CODES.SET_MQTT:
      if (data) {
        // 第3-6字节：MQTT服务器IP地址 (大端序uint32)
        buffer.writeUInt32BE(ipStringToIntBE(data.serverIp), offset)
        offset += 4
        // 第7-10字节：MQTT服务器端口号 (大端序uint32)
        buffer.writeUInt32BE(data.port, offset)
        offset += 4
        // 第11-22字节：剩余字段填充0 (3个uint32，大端序)
        // MQTT设置只需要IP和端口，其余字段保留为0
        for (let i = 0; i < 3; i++) {
          buffer.writeUInt32BE(0, offset)
          offset += 4
        }
        return buffer // MQTT设置包完成，直接返回
      }
      break

    // 复位默认参数操作：将BAU设备恢复到出厂默认配置
    case FUNCTION_CODES.RESET_DEFAULT:
      // 写入复位魔数 0xFE424155，大端序
      // FE表示复位默认参数操作，424155是"BAU"的变形
      buffer.writeUInt32BE(0xFE424155, offset)
      break

    // 强制升级BAU操作：触发BAU设备升级流程
    case FUNCTION_CODES.FORCE_UPGRADE:
      // 写入强制升级魔数 0xFD424155，大端序
      // FD表示强制升级操作，424155是"BAU"的变形
      buffer.writeUInt32BE(0xFD424155, offset)
      offset += 4
      // 剩余4个备用uint32字段填充0 (16字节)，总共20字节数据区
      // 注意：buffer是22字节（2字节功能码 + 20字节数据区），offset从2开始
      // 已写入4字节魔数，剩余16字节需要填充4个uint32
      for (let i = 0; i < 4; i++) {
        buffer.writeUInt32BE(0, offset)
        offset += 4
      }
      return buffer // 强制升级包完成，直接返回
      break

    // 重启设备操作：重新启动BAU设备
    case FUNCTION_CODES.RESET_DEVICE:
      // 写入重启魔数 0xFF424155，大端序
      // FF表示重启设备操作，424155是"BAU"的变形
      buffer.writeUInt32BE(0xFF424155, offset)
      break
  }
  offset += 4

  // 剩余字段填充0 (备用字段，大端序)
  // 确保数据包总长度为22字节，未使用的字段填充0
  for (let i = 0; i < 4; i++) {
    buffer.writeUInt32BE(0, offset)
    offset += 4
  }

  return buffer
}

/**
 * IP字符串转整数 (小端序) 
 */
const ipStringToInt = (ipStr) => {
  if (!ipStr) return 0
  const parts = ipStr.split('.')
  return ((parseInt(parts[0]) & 0xFF) |
          ((parseInt(parts[1]) & 0xFF) << 8) |
          ((parseInt(parts[2]) & 0xFF) << 16) |
          ((parseInt(parts[3]) & 0xFF) << 24)) >>> 0
}

/**
 * IP字符串转整数 (大端序) - 用于设置操作
 */
const ipStringToIntBE = (ipStr) => {
  if (!ipStr) return 0
  const parts = ipStr.split('.')
  return (((parseInt(parts[0]) & 0xFF) << 24) |
          ((parseInt(parts[1]) & 0xFF) << 16) |
          ((parseInt(parts[2]) & 0xFF) << 8) |
          (parseInt(parts[3]) & 0xFF)) >>> 0  // 无符号右移确保正数
}

/**
 * 解析BAU响应数据
 */
const parseResponse = (buffer, functionCode) => {
  try {
    // console.log(`[BAU Parse] 开始解析响应，期望功能码: 0x${functionCode.toString(16)}, 数据长度: ${buffer.length}`)

    if (buffer.length < 4) {
      // console.log(`[BAU Parse] 数据长度不足: ${buffer.length} < 4`)
      return { success: false, error: '响应数据长度不足' }
    }

    let offset = 0

    // 读取功能码
    const responseFunctionCode = buffer.readUInt16BE(offset)
    offset += 2

    // 读取响应码
    const responseCode = buffer.readUInt16BE(offset)
    offset += 2

    // console.log(`[BAU Parse] 响应功能码: 0x${responseFunctionCode.toString(16)}, 响应码: 0x${responseCode.toString(16)}`)

    const result = {
      functionCode: responseFunctionCode,
      responseCode: responseCode,
      success: responseCode === 0xE000
    }

    if (!result.success) {
      result.error = `设备返回错误响应码: 0x${responseCode.toString(16)}`
      console.log(`[BAU Parse] 解析失败:`, result.error)
      return result
    }

    // 验证功能码是否匹配
    if (responseFunctionCode !== functionCode) {
      result.error = `功能码不匹配，期望: 0x${functionCode.toString(16)}, 实际: 0x${responseFunctionCode.toString(16)}`
      result.success = false
      console.log(`[BAU Parse] 功能码不匹配:`, result.error)
      return result
    }

    // 根据功能码解析不同的数据
    switch (functionCode) {
      case FUNCTION_CODES.QUERY_IP1:
      case FUNCTION_CODES.QUERY_IP2:
        // console.log(`[BAU Parse] 解析IP配置，数据长度: ${buffer.length}`)
        if (buffer.length >= 30) { // 至少需要30字节
          result.ipAddress = formatIpAddress(buffer.readUInt32BE(offset))
          offset += 4
          result.subnetMask = formatIpAddress(buffer.readUInt32BE(offset))
          offset += 4
          result.gateway = formatIpAddress(buffer.readUInt32BE(offset))
          offset += 4
          result.primaryDns = formatIpAddress(buffer.readUInt32BE(offset))
          offset += 4
          result.secondaryDns = formatIpAddress(buffer.readUInt32BE(offset))
          offset += 4
          // result.macAddress = formatMacAddress(buffer.readUInt32BE(offset))
          const macPart1 = buffer.readUInt32BE(offset)
          offset += 4
          const macPart2 = buffer.readUInt32BE(offset)
          offset += 4
          result.macAddress = formatMacAddressFromTwoUint32(macPart1, macPart2)

          // console.log(`[BAU Parse] IP配置解析完成:`, {
          //   ipAddress: result.ipAddress,
          //   subnetMask: result.subnetMask,
          //   gateway: result.gateway,
          //   macAddress: result.macAddress
          // })
        } else {
          console.log(`[BAU Parse] IP配置数据长度不足: ${buffer.length} < 30`)
          result.error = `IP配置数据长度不足: ${buffer.length} < 30`
          result.success = false
        }
        break

      case FUNCTION_CODES.QUERY_MQTT:
        if (buffer.length >= 20) { // 需要至少20字节：serverIp(4) + port(4) + 备用(12) + MAC(8)
          result.serverIp = formatIpAddress(buffer.readUInt32BE(offset))
          offset += 4
          result.port = buffer.readUInt32BE(offset)
          offset += 4
          // 跳过3个备用字段 (12字节)
          offset += 12
          // 读取MAC地址的两个uint32部分
          const macPart1 = buffer.readUInt32BE(offset)
          offset += 4
          const macPart2 = buffer.readUInt32BE(offset)
          offset += 4
          result.macAddress = formatMacAddressFromTwoUint32(macPart1, macPart2)

          // console.log(`[BAU Parse] MQTT配置解析完成:`, {
          //   serverIp: result.serverIp,
          //   port: result.port,
          //   macAddress: result.macAddress
          // })
        }
        break

      case FUNCTION_CODES.FORCE_UPGRADE:
        // 强制升级响应解析
        // 响应结构: 功能码(2) + 响应码(2) + 备用(20字节) + MAC地址(8字节) = 32字节
        // 与其他命令（QUERY_IP1/IP2、QUERY_MQTT）格式保持一致
        if (buffer.length >= 32) { // 至少需要32字节
          // 跳过5个备用uint32字段 (20字节)
          offset += 20
          // 读取MAC地址（2个uint32，与其他命令一致）
          const macPart1 = buffer.readUInt32BE(offset)
          offset += 4
          const macPart2 = buffer.readUInt32BE(offset)
          offset += 4
          result.macAddress = formatMacAddressFromTwoUint32(macPart1, macPart2)
        } else {
          console.log(`[BAU Parse] 强制升级响应数据长度不足: ${buffer.length} < 32`)
          result.error = `强制升级响应数据长度不足: ${buffer.length} < 32`
          result.success = false
        }
        break

      case FUNCTION_CODES.RESET_DEFAULT:
      case FUNCTION_CODES.RESET_DEVICE:
        // 复位操作只需要响应码
        break
    }

    // console.log(`[BAU Parse] 解析成功:`, result)
    return result
  } catch (error) {
    console.error('[BAU Parse] 解析异常:', error)
    return { success: false, error: `数据解析异常: ${error.message}` }
  }
}

/**
 * 格式化IP地址
 */
const formatIpAddress = (ipInt) => {
  if (!ipInt) return '0.0.0.0'

  return [
    (ipInt >>> 0) & 0xFF,
    (ipInt >>> 8) & 0xFF,
    (ipInt >>> 16) & 0xFF,
    (ipInt >>> 24) & 0xFF
  ].join('.')
}



const formatMacAddressFromTwoUint32 = (part1, part2) => {
  // 打印原始MAC值
  // console.log(`[MAC Debug] 原始MAC值 - part1: 0x${part1.toString(16).padStart(8, '0')}, part2: 0x${part2.toString(16).padStart(8, '0')}`)
  
  // 根据实际数据分析，MAC地址应该按照以下顺序排列：54:27:8d:a0:bd:c7
  // part1(0x2754a08d) -> 54:27:8d:a0, part2(0x0000c7bd) -> bd:c7
  const bytes = [
    (part1 >>> 16) & 0xFF,  // part1的第2字节 -> MAC第1字节 (54)
    (part1 >>> 24) & 0xFF,  // part1的第1字节 -> MAC第2字节 (27)
    (part1 >>> 0) & 0xFF,   // part1的第4字节 -> MAC第3字节 (8d)
    (part1 >>> 8) & 0xFF,   // part1的第3字节 -> MAC第4字节 (a0)
    (part2 >>> 0) & 0xFF,   // part2的第4字节 -> MAC第5字节 (bd)
    (part2 >>> 8) & 0xFF    // part2的第3字节 -> MAC第6字节 (c7)
  ]
  
  const macAddress = bytes.map(b => b.toString(16).padStart(2, '0')).join(':')
  
  // 打印解析的MAC值
  // console.log(`[MAC Debug] 解析的MAC地址: ${macAddress}`)
  // console.log(`[MAC Debug] 字节数组: [${bytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`)
  
  return macAddress
}


// ==================== 网卡选择功能 - 统一UDP通信方式 ====================

/**
 * 获取系统网络接口列表
 * 用于BAU地址探测的网卡选择功能，获取所有可用的IPv4网络接口
 * @returns {Array} 网络接口列表，包含name、address、mac、displayName等信息
 */
export const getNetworkInterfaces = () => {
  try {
    // 调用Node.js os模块获取系统所有网络接口信息
    const interfaces = os.networkInterfaces()
    const result = []

    // 遍历所有网络接口，筛选出可用于UDP通信的接口
    Object.keys(interfaces).forEach(name => {
      const interfaceList = interfaces[name]

      // 过滤条件：只处理IPv4接口，排除内部回环接口(127.0.0.1)
      // 内部接口无法用于与外部BAU设备通信
      interfaceList.forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          // 构造网络接口信息对象，供前端选择使用
          const interfaceInfo = {
            name: name,                    // 网卡名称，如"以太网"、"WLAN"
            address: iface.address,        // IP地址，如"192.168.1.100"
            mac: iface.mac,               // MAC地址，如"aa:bb:cc:dd:ee:ff"
            netmask: iface.netmask,       // 子网掩码，如"255.255.255.0"
            displayName: `${name} (${iface.address})` // 用户友好的显示名称
          }
          result.push(interfaceInfo)
        }
        // 跳过IPv6接口和内部回环接口
      })
    })

    return result
  } catch (error) {
    // 异常处理：如果获取网络接口失败，返回空数组
    // 前端会显示"无可用网络接口"的提示
    console.error('[BAU] 获取网络接口失败:', error)
    return []
  }
}

/**
 * 使用指定网卡发送带自定义数据的UDP广播（设置操作）
 * 统一的网卡选择设置操作函数，支持IP配置和MQTT配置的设置
 * @param {Object} event - IPC事件对象，用于发送响应结果
 * @param {Object} params - 参数对象
 * @param {number} params.functionCode - 功能码 (SET_IP1/SET_IP2/SET_MQTT)
 * @param {Object} params.data - 设置数据 (IP配置或MQTT配置)
 * @param {string} params.interfaceAddress - 网卡IP地址，绑定UDP套接字到指定网卡
 */
const sendBauCommandWithDataAndInterface = (event, { functionCode, data, interfaceAddress }) => {
  const bindAddress = interfaceAddress || '0.0.0.0'
  console.log('[BAU UDP SET] 使用网卡发送广播设置, functionCode =', functionCode.toString(16), ', 绑定地址:', bindAddress)

  const udpClient = dgram.createSocket('udp4')
  const packet = createPacket(functionCode, data)
  let socketClosed = false

  // 配置 UDP 套接字 - 绑定到指定网卡IP或0.0.0.0
  udpClient.bind(PC_PORT, bindAddress, () => {
    udpClient.setBroadcast(true)
    console.log('[BAU UDP SET] 绑定UDP套接字成功，端口:', PC_PORT, ', 绑定地址:', bindAddress)

    // 发送UDP广播包到BAU设备
    // 目标：255.255.255.255:39999 (全网广播)
    // 数据：22字节的设置命令包
    udpClient.send(
      packet,
      0,
      packet.length,
      BAU_PORT,
      BROADCAST_ADDRESS,
      (err) => {
        if (err) {
          // 发送失败：网络错误或权限问题
          console.error('[BAU UDP SET] 发送广播失败:', err.message)
          event.sender.send('bau-operation-result', { success: false, error: err.message })
          udpClient.close()
          socketClosed = true
          return
        }
        // 发送成功：记录发送的数据包内容和使用的网卡
        console.log('[BAU UDP SET] 发送设置广播成功:', packet.toString('hex'), ', 使用网卡:', bindAddress)
      }
    )
  })

  // 存储响应的设备列表
  const foundDevices = []

  // 监听UDP响应消息
  // BAU设备收到设置命令后会发送确认响应
  udpClient.on('message', (msg, rinfo) => {
    if (socketClosed) return  // 防止套接字关闭后继续处理消息

    // 记录收到的响应数据
    console.log(`[BAU UDP SET] 收到来自 ${rinfo.address}:${rinfo.port} 的响应:`, msg.toString('hex'))

    // 解析响应数据，验证设置是否成功
    const parsedData = parseResponse(msg, functionCode)
    foundDevices.push({
      ip: rinfo.address,        // 响应设备的IP地址
      port: rinfo.port,         // 响应设备的端口
      data: msg.toString('hex'), // 原始响应数据
      parsedData: parsedData    // 解析后的响应数据
    })
  })

  // 监听UDP套接字错误
  // 可能的错误：端口被占用、网络权限不足、网卡不可用等
  udpClient.on('error', (err) => {
    if (socketClosed) return
    console.error('[BAU UDP SET] UDP套接字错误:', err.message)
    event.sender.send('bau-operation-result', { success: false, error: err.message })
    udpClient.close()
    socketClosed = true
  })

  // 设置超时机制：2秒后自动结束操作
  // 设置操作通常很快完成，超时主要是为了避免无限等待
  setTimeout(() => {
    if (socketClosed) return
    console.log('[BAU UDP SET] 设置操作超时，关闭套接字')
    // 即使超时也返回成功，因为设置命令已经发送
    event.sender.send('bau-operation-result', { success: true, devices: foundDevices })
    udpClient.close()
    socketClosed = true
  }, RESPONSE_TIMEOUT)
}

/**
 * 使用指定网卡发送UDP广播查询并收集响应
 *
 * 查询流程说明：
 * 1. 绑定UDP套接字到指定网卡
 * 2. 发送查询广播包到255.255.255.255:39999
 * 3. 监听BAU设备的响应数据
 * 4. 解析响应并返回结果给前端
 * 5. 超时后自动关闭连接
 *
 * 支持的操作类型：
 * - IP1/IP2配置查询：获取当前网络配置
 * - MQTT配置查询：获取当前MQTT服务器配置
 * - 设备复位操作：恢复默认配置或重启设备
 *
 * @param {Object} event - IPC事件对象，用于发送响应结果
 * @param {Object} params - 参数对象
 * @param {number} params.functionCode - 功能码 (QUERY_IP1/QUERY_IP2/QUERY_MQTT/RESET_DEFAULT/RESET_DEVICE)
 * @param {string} params.interfaceAddress - 网卡IP地址，绑定UDP套接字到指定网卡
 */
const sendBauCommandWithInterface = (event, { functionCode, interfaceAddress }) => {
  const bindAddress = interfaceAddress || '0.0.0.0'
  console.log('[BAU UDP] 使用网卡发送广播查询, functionCode =', functionCode.toString(16), ', 绑定地址:', bindAddress)

  // 创建UDP4套接字，用于IPv4通信
  const udpClient = dgram.createSocket('udp4')
  // 创建查询数据包，不包含设置数据
  const broadcastMessage = createPacket(functionCode)
  let socketClosed = false

  // 配置 UDP 套接字 - 绑定到指定网卡IP或0.0.0.0
  udpClient.bind(PC_PORT, bindAddress, () => {
    udpClient.setBroadcast(true)
    // 启用广播功能，广播包会被发送到整个局域网段
    console.log('[BAU UDP] 绑定UDP套接字成功，端口:', PC_PORT, ', 绑定地址:', bindAddress)

    udpClient.send(
      broadcastMessage,        // 要发送的数据
      0,                      // 数据偏移
      broadcastMessage.length, // 数据长度
      BAU_PORT,               // 目标端口39999
      BROADCAST_ADDRESS,      // 广播地址 (255.255.255.255)
      (err) => {
        if (err) {
          console.error('[BAU UDP] 发送广播失败:', err.message)
          event.sender.send('bau-operation-result', { success: false, error: err.message })
          udpClient.close()
          socketClosed = true
          return
        }
        console.log('[BAU UDP] 发送广播成功:', broadcastMessage.toString('hex'), ', 使用网卡:', bindAddress)
      }
    )
  })

  const foundDevices = []

  // 监听返回的消息
  udpClient.on('message', (msg, rinfo) => {
    console.log(`[BAU UDP] 收到来自 ${rinfo.address}:${rinfo.port} 的响应:`, msg.toString('hex'))
    console.log(`[BAU UDP] 响应长度: ${msg.length} 字节`)

    const parsedData = parseResponse(msg, functionCode)
    console.log(`[BAU UDP] 解析结果:`, parsedData)

    foundDevices.push({
      ip: rinfo.address,
      port: rinfo.port,
      data: msg.toString('hex'),
      parsedData: parsedData,
      functionCode: functionCode
    })
  })

  // 设置超时时间，结束查询
  setTimeout(() => {
    if (!socketClosed) {
      udpClient.close()
      socketClosed = true
      console.log('BAU UDP broadcast query finish:', foundDevices)
      event.sender.send('bau-operation-result', {
        success: true,
        devices: foundDevices,
        functionCode: functionCode
      })
    }
  }, RESPONSE_TIMEOUT)

  // 捕获套接字错误
  udpClient.on('error', (err) => {
    console.error('BAU UDP socket error:', err.message)
    if (!socketClosed) {
      udpClient.close()
      socketClosed = true
    }
    event.sender.send('bau-operation-result', { success: false, error: err.message })
  })
}



// ==================== 网卡选择功能的IPC处理器 ====================
// 所有BAU操作统一使用网卡选择方式，替代原有的0.0.0.0全网广播

/**
 * 获取网络接口列表的IPC处理器
 * 用于前端获取系统可用的网络接口，供用户选择
 */
export const handleGetNetworkInterfaces = (event) => {
  const interfaces = getNetworkInterfaces()
  return interfaces
}

/**
 * 支持网卡选择的IP配置查询处理器
 * 处理IP1和IP2配置的查询请求，通过指定网卡发送UDP广播
 */
export const handleQueryIpWithInterface = (event, params) => {
  sendBauCommandWithInterface(event, {
    functionCode: params.functionCode,
    interfaceAddress: params.interfaceAddress
  })
}

/**
 * 支持网卡选择的MQTT配置查询处理器
 * 处理MQTT配置的查询请求，通过指定网卡发送UDP广播
 */
export const handleQueryMqttWithInterface = (event, params) => {
  sendBauCommandWithInterface(event, {
    functionCode: FUNCTION_CODES.QUERY_MQTT,
    interfaceAddress: params.interfaceAddress
  })
}

/**
 * 支持网卡选择的IP配置设置处理器
 * 处理IP1和IP2配置的设置请求，通过指定网卡发送UDP广播
 */
export const handleSetIpWithInterface = (event, params) => {
  sendBauCommandWithDataAndInterface(event, {
    functionCode: params.functionCode,
    data: params.data,
    interfaceAddress: params.interfaceAddress
  })
}

/**
 * 支持网卡选择的MQTT配置设置处理器
 * 处理MQTT配置的设置请求，通过指定网卡发送UDP广播
 */
export const handleSetMqttWithInterface = (event, params) => {
  sendBauCommandWithDataAndInterface(event, {
    functionCode: FUNCTION_CODES.SET_MQTT,
    data: params.data,
    interfaceAddress: params.interfaceAddress
  })
}

/**
 * 支持网卡选择的复位默认参数处理器
 * 处理设备复位到默认参数的请求，通过指定网卡发送UDP广播
 */
export const handleResetDefaultWithInterface = (event, params) => {
  sendBauCommandWithInterface(event, {
    functionCode: FUNCTION_CODES.RESET_DEFAULT,
    interfaceAddress: params.interfaceAddress
  })
}

/**
 * 支持网卡选择的重启设备处理器
 * 处理设备重启的请求，通过指定网卡发送UDP广播
 */
export const handleResetDeviceWithInterface = (event, params) => {
  sendBauCommandWithInterface(event, {
    functionCode: FUNCTION_CODES.RESET_DEVICE,
    interfaceAddress: params.interfaceAddress
  })
}

/**
 * 开始强制升级（循环发送UDP指令）
 * 每100ms发送一次22字节的强制升级命令包，直到收到设备响应
 */
export const startForceUpgrade = (event, { interfaceAddress }) => {
  return new Promise((resolve, reject) => {
    // 如果已经在升级中，先停止
    if (isForceUpgrading) {
      stopForceUpgrade()
    }

    console.log('[Force Upgrade] 开始发送强制升级指令')
    console.log('[Force Upgrade] 本地接口:', interfaceAddress)

    // 创建 UDP 客户端
    forceUpgradeClient = dgram.createSocket('udp4')
    isForceUpgrading = true
    forceUpgradeEvent = event

    const bindAddress = interfaceAddress || '0.0.0.0'

    // 构造22字节强制升级指令（使用createPacket函数）
    const upgradePacket = createPacket(FUNCTION_CODES.FORCE_UPGRADE)

    // 先注册错误监听器（在bind之前）
    forceUpgradeClient.on('error', (err) => {
      console.error('[Force Upgrade] UDP客户端错误:', err)
      if (forceUpgradeEvent && forceUpgradeEvent.sender) {
        forceUpgradeEvent.sender.send('force-upgrade-error', {
          error: err.message
        })
      }
      stopForceUpgrade()
    })

    // 绑定本地端口和接口
    forceUpgradeClient.bind(PC_PORT, bindAddress, () => {
      forceUpgradeClient.setBroadcast(true)
      console.log(`[Force Upgrade] UDP客户端已绑定到 ${bindAddress}:${PC_PORT}`)

      // 构造并打印数据包信息
      console.log(`[Force Upgrade] 升级数据包 (${upgradePacket.length}字节):`, upgradePacket.toString('hex'))
      console.log(`[Force Upgrade] 目标: ${BROADCAST_ADDRESS}:${BAU_PORT}`)
      
      // 发送第一条指令
      sendForceUpgradeCommand(upgradePacket)

      // 每100ms发送一次指令（参考reference项目）
      forceUpgradeInterval = setInterval(() => {
        sendForceUpgradeCommand(upgradePacket)
      }, 100)
      
      console.log('[Force Upgrade] 开始循环发送，间隔: 100ms')

      resolve()
    })

    // 发送升级指令的函数
    let sendCount = 0 // 发送计数器，用于控制日志频率
    function sendForceUpgradeCommand(packet) {
      if (!forceUpgradeClient || !isForceUpgrading) return

      sendCount++
      
      forceUpgradeClient.send(
        packet,
        0,
        packet.length,
        BAU_PORT,
        BROADCAST_ADDRESS,
        (err) => {
          if (err) {
            console.error('[Force Upgrade] 发送指令失败:', err.message)
            stopForceUpgrade()
            // 只发送一次错误通知
            if (forceUpgradeEvent && forceUpgradeEvent.sender) {
              forceUpgradeEvent.sender.send('force-upgrade-error', {
                error: err.message
              })
            }
          } else {
            // 每10次发送打印一次日志（避免日志过多）
            if (sendCount % 10 === 0 || sendCount === 1) {
              console.log(`[Force Upgrade] 已发送指令 ${sendCount} 次到 ${BROADCAST_ADDRESS}:${BAU_PORT}, 数据包:`, packet.toString('hex'))
            }
            
            // 通知前端正在发送
            if (forceUpgradeEvent && forceUpgradeEvent.sender) {
              forceUpgradeEvent.sender.send('force-upgrade-sending', {
                timestamp: Date.now()
              })
            }
          }
        }
      )
    }

    // 监听 BAU 的响应
    // 注意：BAU可能返回两种响应
    // 1. 0xAFFD - 强制升级命令响应（22字节格式，与其他命令相同）
    // 2. 可能还有进度反馈响应（需要根据实际协议调整）
    forceUpgradeClient.on('message', (msg, rinfo) => {
      console.log(`[Force Upgrade] 收到来自 ${rinfo.address}:${rinfo.port} 的响应`)
      console.log('[Force Upgrade] 响应长度:', msg.length, '数据:', msg.toString('hex'))

      // 检查是否是标准22字节响应格式（0xAFFD）
      if (msg.length >= 4) {
        const responseFunctionCode = msg.readUInt16BE(0)
        
        if (responseFunctionCode === FUNCTION_CODES.FORCE_UPGRADE) {
          // 解析标准32字节响应
          const parsedData = parseResponse(msg, FUNCTION_CODES.FORCE_UPGRADE)
          
          if (parsedData.success) {
            // 成功响应（响应码0xE000）
            console.log('[Force Upgrade] BAU响应：升级指令执行成功')
            
            // 发送成功事件
            if (forceUpgradeEvent && forceUpgradeEvent.sender) {
              forceUpgradeEvent.sender.send('force-upgrade-success', {
                ip: rinfo.address,
                mac: parsedData.macAddress || '未知',
                message: '升级指令执行成功'
              })
            }
            
            // 关闭UDP，结束操作（与其他BAU指令保持一致）
            stopForceUpgrade()
          } else {
            // 失败响应（响应码0xE001或其他错误码）
            console.log('[Force Upgrade] BAU响应：升级指令执行失败')
            if (forceUpgradeEvent && forceUpgradeEvent.sender) {
              forceUpgradeEvent.sender.send('force-upgrade-failed', {
                ip: rinfo.address,
                mac: parsedData.macAddress || '未知',
                message: parsedData.error || '升级指令执行失败'
              })
            }
            
            // 关闭UDP，结束操作
            stopForceUpgrade()
          }
        } else {
          // 可能是进度反馈或其他响应，暂时记录
          console.log(`[Force Upgrade] 收到其他响应，功能码: 0x${responseFunctionCode.toString(16)}`)
        }
      } else {
        console.warn('[Force Upgrade] 收到未知格式的响应，长度:', msg.length)
      }
    })

  })
}

/**
 * 停止发送升级指令，但保持UDP监听
 */
function stopSendingCommand() {
  console.log('[Force Upgrade] 停止发送升级指令，保持UDP监听')
  if (forceUpgradeInterval) {
    clearInterval(forceUpgradeInterval)
    forceUpgradeInterval = null
  }
}

/**
 * 停止强制升级并关闭UDP客户端
 * 参考reference项目：不发送通知到前端，前端已经立即更新状态
 */
export const stopForceUpgrade = () => {
  console.log('[Force Upgrade] 完全停止强制升级')

  // 清除定时器
  if (forceUpgradeInterval) {
    clearInterval(forceUpgradeInterval)
    forceUpgradeInterval = null
  }

  // 关闭 UDP 客户端
  if (forceUpgradeClient) {
    try {
      forceUpgradeClient.close()
    } catch (err) {
      console.error('[Force Upgrade] 关闭UDP客户端失败:', err)
    }
    forceUpgradeClient = null
  }

  isForceUpgrading = false
  forceUpgradeEvent = null
}

/**
 * 获取强制升级状态
 */
export const getForceUpgradeStatus = () => {
  return { isUpgrading: isForceUpgrading }
}

/**
 * 支持网卡选择的强制升级BAU处理器（新版本：循环发送）
 * 处理强制升级BAU的请求，通过指定网卡循环发送UDP广播
 */
export const handleForceUpgradeWithInterface = (event, params) => {
  startForceUpgrade(event, {
    interfaceAddress: params.interfaceAddress
  })
}

// ==================== TFTP服务器功能 ====================

/**
 * 启动 TFTP 服务器
 * @param {string} host - 服务器IP地址（已忽略，强制使用TFTP_DEFAULT_IP）
 * @param {number} port - 端口号，默认 69
 * @param {string} root - 根目录路径
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const startTftpServer = (host, port = TFTP_DEFAULT_PORT, root = TFTP_ROOT) => {
  return new Promise((resolve) => {
    // 检查是否已经在运行
    if (tftpServer) {
      return resolve({ success: false, message: 'TFTP服务器已在运行' })
    }

    // 强制使用固定的TFTP IP地址，忽略传入的host参数
    const tftpHost = TFTP_DEFAULT_IP

    // 确保根目录存在
    if (!fs.existsSync(root)) {
      try {
        fs.mkdirSync(root, { recursive: true })
      } catch (err) {
        return resolve({
          success: false,
          message: `创建TFTP根目录失败: ${err.message}`
        })
      }
    }

    try {
      // 创建 TFTP 服务器（固定使用TFTP_DEFAULT_IP）
      tftpServer = tftp.createServer({
        host: tftpHost,
        port: port,
        root: root,
        denyPUT: true // 禁止上传，仅允许下载
      })

      // 监听服务器错误
      tftpServer.on('error', (error) => {
        console.error('[TFTP] 服务器错误:', error)
        
        tftpServer = null
        
        let errorMessage = ''
        const errorCode = error.code || ''
        
        if (errorCode === 'EADDRNOTAVAIL') {
          errorMessage = `TFTP服务器启动失败，请检查本机IP是否为 ${tftpHost}。`
        } else if (errorCode === 'EADDRINUSE') {
          errorMessage = `端口 ${port} 已被占用，请关闭占用该端口的程序或更换端口。`
        } else if (errorCode === 'EACCES') {
          errorMessage = `权限不足，无法绑定端口 ${port}。请尝试使用管理员权限运行程序或使用大于1024的端口号。`
        } else {
          errorMessage = `TFTP服务器启动失败: ${error.message}`
        }
        
        resolve({
          success: false,
          message: errorMessage,
          errorCode: errorCode
        })
      })

      // 监听请求事件
      tftpServer.on('request', (req, res) => {
        console.log(
          `[TFTP] 收到${req.method}请求: ${req.file} 来自 ${req.stats.remoteAddress}:${req.stats.remotePort}`
        )
        
        req.on('error', (error) => {
          console.error(`[TFTP] 请求错误 (${req.file}):`, error.message)
        })
        
        tftpServer.requestListener(req, res)
      })

      // 监听服务器启动成功
      tftpServer.on('listening', () => {
        console.log(`[TFTP] 服务器已启动: tftp://${tftpHost}:${port} (根目录: ${root})`)
        resolve({
          success: true,
          message: `TFTP服务器已启动在 ${tftpHost}:${port}`
        })
      })

      // 启动服务器
      tftpServer.listen()
    } catch (err) {
      tftpServer = null
      console.error('[TFTP] 启动失败:', err)
      resolve({
        success: false,
        message: `TFTP服务器启动失败: ${err.message}`
      })
    }
  })
}

/**
 * 停止 TFTP 服务器
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const stopTftpServer = () => {
  return new Promise((resolve) => {
    console.log('[TFTP] 准备停止服务器', !!tftpServer)
    if (!tftpServer) {
      return resolve({ success: false, message: 'TFTP服务器未在运行' })
    }

    try {
      tftpServer.once('close', () => {
        console.log('[TFTP] 服务器已停止')
        tftpServer = null
        resolve({ success: true, message: 'TFTP服务器已停止' })
      })
      
      tftpServer.close()
    } catch (err) {
      console.error('[TFTP] 停止失败:', err)
      tftpServer = null
      resolve({
        success: false,
        message: `TFTP服务器停止失败: ${err.message}`
      })
    }
  })
}

/**
 * 获取 TFTP 服务器状态
 * @returns {{running: boolean}}
 */
export const getTftpStatus = () => {
  return { running: !!tftpServer }
}

/**
 * 设置 TFTP 根目录
 * @param {string} dir - 新的根目录路径
 */
export const setTftpRoot = (dir) => {
  TFTP_ROOT = dir
  if (!fs.existsSync(TFTP_ROOT)) {
    try {
      fs.mkdirSync(TFTP_ROOT, { recursive: true })
    } catch (err) {
      console.error(`[TFTP] 创建根目录失败: ${err.message}`)
    }
  }
}

/**
 * 获取 TFTP 根目录
 * @returns {string}
 */
export const getTftpRoot = () => {
  return TFTP_ROOT
}

/**
 * 获取TFTP默认IP
 * @returns {string}
 */
export const getTftpDefaultIp = () => {
  return TFTP_DEFAULT_IP
}

/**
 * TFTP文件选择处理器（需要在index.js中使用dialog实现）
 * 返回文件信息用于设置TFTP根目录
 */
export const handleSelectTftpUpgradeFile = async (filePath) => {
  try {
    const fileName = path.basename(filePath)
    const fileDir = path.dirname(filePath)
    
    // 设置TFTP根目录为文件所在目录
    setTftpRoot(fileDir)
    
    return {
      success: true,
      fileName: fileName,
      fileDir: fileDir,
      fullPath: filePath
    }
  } catch (error) {
    return {
      success: false,
      error: true,
      message: `文件处理失败: ${error.message}`
    }
  }
}


