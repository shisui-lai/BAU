const dgram = require('dgram')
export const addressAdaptHandler = (event, { addressStart, numBCU, selectedInterface }) => {
  {
    event.sender.send('bcu adapt start')
    console.log('接收到渲染进程发来的 address-adapt 请求', addressStart, numBCU, selectedInterface)
    const numBCUs = parseInt(numBCU, 10) // 确保 numBCUs 是数字类型
    const udpClient_forAdapt = dgram.createSocket('udp4')
    const LOCAL_PORT = 30000 // 本地端口
    const BROADCAST_PORT = 40000 // 广播端口
    const LOCAL_IP = selectedInterface // 本地IP
    const TIMEOUT = 2000 // 超时时间1秒
    let totalAssigned = 0 // 已分配地址数
    let currentState = 'A11A' // 初始状态
    // C22C 状态下，记录本轮是否收到响应。每次进入 C22C时初始化为 0
    let currentC22CResponses = 0
    let devicesResponded = new Map() // 存储已响应的设备
    let socketClosed = false // 标志socket是否已关闭
    let stateTimer = null
    let isProcessing = false
    const RESPONSE_CODES = {
      e0: '成功',
      e1: '参数错误'
    }
    function sendToRenderer(messageType, messageContent) {
      event.sender.send(messageType, messageContent)
    }

    // 工具函数：将IP地址的最后一段转换为十六进制数值
    function addressTrans(param) {
      const lastPart = param.split('.').pop()
      const hexValue = parseInt(lastPart, 10).toString(16).toUpperCase()
      return parseInt(hexValue, 16) // 确保返回的是数值
    }
    // 动态计算设备地址，基于 addressStart 和 totalAssigned
    function calculateCurrentAddress() {
      const addressStartLastPart = parseInt(addressStart.split('.').pop(), 10) // 获取地址最后一段数字
      return `${addressStart.split('.').slice(0, -1).join('.')}.${addressStartLastPart + totalAssigned}`
    }

    // 消息模板生成
    function createMessage(state, totalAssigned) {
      const currentAddress = calculateCurrentAddress()
      const baseAddress = addressTrans(currentAddress)
      const remaining = numBCUs - totalAssigned
      const stateMap = {
        A11A: [0xa1, 0x1a, baseAddress, remaining, totalAssigned, numBCUs],
        C11C: [0xc1, 0x1c, baseAddress, remaining, totalAssigned, numBCUs],
        C22C: [0xc2, 0x2c, baseAddress, remaining, totalAssigned, numBCUs],
        A33A: [0xa3, 0x3a, baseAddress, remaining, totalAssigned, numBCUs]
      }
      return Buffer.from(stateMap[state])
    }

    // 广播UDP消息
    // 带错误处理的广播发送
    // 广播UDP消息，带错误处理
    function sendBroadcast(state) {
      return new Promise((resolve, reject) => {
        if (socketClosed) return reject('Socket closed')

        // 对于 A33A 状态，单独构造报文
        if (state === 'A33A') {
          // 采用最终确认报文 A33C 计算逻辑：
          // finalAddress: 当前分配地址
          // remaining = numBCUs - totalAssigned - 1; assigned = totalAssigned + 1
          const finalAddress = calculateCurrentAddress()
          const remainingBCU = numBCUs - totalAssigned
          const assignedBCU = totalAssigned
          const message = Buffer.from([
            0xa3, // 指令字节1
            0x3a, // 指令字节2
            addressTrans(finalAddress), // 当前分配地址（转换后的值）
            remainingBCU, // 待分配数量
            assignedBCU, // 已分配数量
            numBCUs // 总设备数量
          ])
          console.log(`发送 A33C 报文: ${message.toString('hex')}`)
          udpClient_forAdapt.send(
            message,
            0,
            message.length,
            BROADCAST_PORT,
            '255.255.255.255',
            (err) => {
              if (err) return reject(err)
              sendToRenderer('device-message', {
                type: 'send',
                state,
                message: message.toString('hex')
              })
              resolve()
            }
          )
        } else {
          // 对于 A11A、C11C、C22C 使用通用报文模板
          const message = createMessage(state, totalAssigned)
          console.log(`发送 ${state} 报文: ${message.toString('hex')}`)
          udpClient_forAdapt.send(
            message,
            0,
            message.length,
            BROADCAST_PORT,
            '255.255.255.255',
            (err) => {
              if (err) return reject(err)
              sendToRenderer('device-message', {
                type: 'send',
                state,
                message: message.toString('hex')
              })
              resolve()
            }
          )
        }
      })
    }

    // 新增响应解析器
    function parseResponse(msg) {
      try {
        if (!Buffer.isBuffer(msg)) return null
        if (msg.length < 10) return null
        const state = msg.subarray(0, 2).toString('hex').toUpperCase() // 状态码
        const address = msg[2] // 地址
        const mac = msg.subarray(3, 9).toString('hex').toUpperCase() // MAC 地址
        const code = msg[9].toString(16).padStart(2, '0').toUpperCase() // 响应码
        return {
          state,
          address,
          mac,
          code
        }
      } catch (e) {
        return null
      }
    }

    // 状态超时处理器
    function handleTimeout() {
      const errorMap = {
        A11A: '初始化响应超时',
        C11C: '准备阶段超时',
        C22C: `地址分配超时 (${totalAssigned + 1}/${numBCUs})`,
        A33A: '最终确认超时'
      }

      const error = errorMap[currentState] || '未知状态超时'
      console.warn(error)
      // 超时立即进入 A33A 状态，终止流程
      currentState = 'A33A'
      sendToRenderer('adapt-error', {
        state: currentState,
        error: error,
        progress: totalAssigned
      })
      processState()
    }
    // 清理函数：关闭套接字
    // 清理函数
    function cleanup() {
      if (!socketClosed) {
        clearTimeout(stateTimer)
        udpClient_forAdapt.close()
        socketClosed = true
        console.log('UDP连接已关闭')
      }
    }

    // 改进的状态处理器
    async function processState() {
      if (isProcessing) return
      isProcessing = true
      console.log(`当前状态：${currentState}`)
      if (socketClosed) {
        isProcessing = false
        return
      }
      try {
        await sendBroadcast(currentState)
        clearTimeout(stateTimer)
        switch (currentState) {
          case 'A11A':
            stateTimer = setTimeout(() => {
              if (devicesResponded.size > 0) {
                currentState = 'C11C'
                processState()
              } else {
                handleTimeout()
              }
            }, TIMEOUT)
            break

          case 'C11C':
            stateTimer = setTimeout(() => {
              if (devicesResponded.size > 0) {
                currentState = 'C22C'
                // 进入 C22C 前，重置本状态下的响应计数
                currentC22CResponses = 0
                processState()
              } else {
                handleTimeout()
              }
            }, TIMEOUT)
            break

          case 'C22C':
            stateTimer = setTimeout(() => {
              // 如果定时器触发，说明没有收到有效响应
              handleTimeout()
            }, TIMEOUT)
            break

          case 'A33A':
            await sendBroadcast('A33A')
            console.log('自适应完成totalAssigned和numBCU', totalAssigned, numBCUs)
            const result = {
              success: totalAssigned > 0, // 修改：只要至少有一台设备成功分配地址就认为是成功的
              assigned: totalAssigned,
              error:
                totalAssigned === 0
                  ? '没有设备响应，请检查连接'
                  : totalAssigned < numBCUs
                    ? `成功分配 ${totalAssigned} 台设备，${numBCUs - totalAssigned} 台设备未响应`
                    : totalAssigned > numBCUs
                      ? `响应数量为${totalAssigned}，超过输入数量${numBCUs}`
                      : ''
            }
            console.log('result', result)
            sendToRenderer('address-adapt-result', result)
            cleanup()

            // 新增：延迟一段时间确保UDP套接字完全清理
            setTimeout(() => {
              console.log('自适应流程完全结束，可以安全进行后续操作')
            }, 1000)
            break
        }
      } catch (err) {
        sendToRenderer('adapt-error', {
          state: currentState,
          error: err.message
        })
        cleanup()
      }
      isProcessing = false
    }

    // 启动UDP客户端并绑定套接字
    udpClient_forAdapt.bind(LOCAL_PORT, LOCAL_IP, () => {
      udpClient_forAdapt.setBroadcast(true)
      console.log(`UDP套接字绑定到 ${LOCAL_IP}:${LOCAL_PORT}`)
      processState()
    })

    // 处理接收到的UDP消息
    // 增强响应处理
    udpClient_forAdapt.on('message', (msg, rinfo) => {
      const res = parseResponse(msg)
      if (!res) return

      console.log(`收到来自 ${rinfo.address} 的响应:`, res)

      // 记录设备响应
      if (!devicesResponded.has(rinfo.address)) {
        devicesResponded.set(rinfo.address, {
          code: res.code,
          mac: res.mac,
          timestamp: Date.now()
        })
      }

      // 错误码处理
      if (res.code !== 'e0') {
        sendToRenderer('device-error', {
          ip: rinfo.address,
          code: res.code,
          message: RESPONSE_CODES[res.code] || '未知错误'
        })
      }
      // C22C 阶段处理逻辑
      if (currentState === 'C22C' && res.code === 'E0') {
        totalAssigned++
        clearTimeout(stateTimer) // 确保定时器被清除
        sendToRenderer('adapt-progress', {
          current: totalAssigned,
          total: numBCUs,
          currentDevice: rinfo.address
        })
        console.log(`C22C 阶段响应有效，已分配数更新为：${totalAssigned}`)
        if (totalAssigned < numBCUs) {
          processState()
          // 实时更新进度
        } else {
          currentState = 'A33A'
          processState()
        }
      }
    })

    // 处理UDP套接字错误
    // 错误处理
    udpClient_forAdapt.on('error', (err) => {
      sendToRenderer('adapt-error', {
        state: currentState,
        error: err.message
      })
      cleanup()
    })
  }
}
