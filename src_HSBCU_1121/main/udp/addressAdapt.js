const dgram = require('dgram')
export const addressAdaptHandler = (event, { addressStart, numBCU, selectedInterface }) => {
  {
    console.log('addressAdaptHandler', addressStart, numBCU, selectedInterface)
    event.sender.send('bcu adapt start')
    const numBCUs = parseInt(numBCU, 10) // 确保 numBCUs 是数字类型
    let udpClient_forAdapt = dgram.createSocket('udp4')
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
    // 新增：bind重试相关配置
    let bindRetryCount = 0
    const MAX_BIND_RETRY = 3 // 最大重试次数
    const BIND_RETRY_DELAY = 10000 // 重试延迟（毫秒）
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

    // 广播UDP消息，带错误处理和重试机制
    function sendBroadcast(state, retryCount = 0) {
      const MAX_SEND_RETRY = 3 // 发送最大重试次数
      const SEND_RETRY_DELAY = 1000 // 发送重试延迟（毫秒）

      return new Promise((resolve, reject) => {
        if (socketClosed) return reject(new Error('Socket closed'))

        // 构造消息
        let message
        if (state === 'A33A') {
          // 采用最终确认报文 A33C 计算逻辑
          const finalAddress = calculateCurrentAddress()
          const remainingBCU = numBCUs - totalAssigned
          const assignedBCU = totalAssigned
          message = Buffer.from([
            0xa3, // 指令字节1
            0x3a, // 指令字节2
            addressTrans(finalAddress), // 当前分配地址（转换后的值）
            remainingBCU, // 待分配数量
            assignedBCU, // 已分配数量
            numBCUs // 总设备数量
          ])
          console.log(`发送 A33C 报文: ${message.toString('hex')}`)
        } else {
          // 对于 A11A、C11C、C22C 使用通用报文模板
          message = createMessage(state, totalAssigned)
          console.log(`发送 ${state} 报文: ${message.toString('hex')}`)
        }

        // 发送消息
        udpClient_forAdapt.send(
          message,
          0,
          message.length,
          BROADCAST_PORT,
          '255.255.255.255',
          (err) => {
            if (err) {
              console.error(`❌ 发送 ${state} 报文失败: ${err.message}`)

              // 如果是地址不可用错误且还有重试机会
              if (err.code === 'EADDRNOTAVAIL' && retryCount < MAX_SEND_RETRY) {
                console.warn(
                  `⚠️ 发送失败，${SEND_RETRY_DELAY}ms后进行第 ${retryCount + 1} 次重试...`
                )
                setTimeout(() => {
                  sendBroadcast(state, retryCount + 1)
                    .then(resolve)
                    .catch(reject)
                }, SEND_RETRY_DELAY)
              } else {
                // 重试次数用尽或其他错误
                if (retryCount >= MAX_SEND_RETRY) {
                  console.error(`❌ 发送 ${state} 报文失败，已重试 ${MAX_SEND_RETRY} 次`)
                  return reject(new Error(`发送失败（已重试${MAX_SEND_RETRY}次）: ${err.message}`))
                }
                return reject(err)
              }
            } else {
              // 发送成功
              if (retryCount > 0) {
                console.log(`✅ 经过 ${retryCount} 次重试后发送成功`)
              }
              sendToRenderer('device-message', {
                type: 'send',
                state,
                message: message.toString('hex')
              })
              resolve()
            }
          }
        )
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
              success: totalAssigned === numBCUs, //只有全部分配成功才算成功
              assigned: totalAssigned,
              error:
                totalAssigned === 0
                  ? '没有设备响应，请检查连接'
                  : totalAssigned < numBCUs
                    ? `已分配 ${totalAssigned} 台设备，${numBCUs - totalAssigned} 台设备未响应`
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

    // 处理接收到的UDP消息（独立函数，便于重新绑定）
    const handleMessage = (msg, rinfo) => {
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
    }

    // 处理UDP套接字错误（独立函数，便于重新绑定）
    const handleError = (err) => {
      console.error(`❌ UDP错误: ${err.code} - ${err.message}`)

      // 如果是bind相关错误且还有重试机会
      if (
        (err.code === 'EADDRNOTAVAIL' || err.code === 'EADDRINUSE') &&
        bindRetryCount < MAX_BIND_RETRY
      ) {
        bindRetryCount++
        console.warn(`⚠️ Bind失败，${BIND_RETRY_DELAY}ms后进行第 ${bindRetryCount} 次重试...`)

        // 清理当前socket
        try {
          udpClient_forAdapt.removeAllListeners()
          if (!socketClosed) {
            udpClient_forAdapt.close()
          }
        } catch (e) {
          console.warn('关闭旧socket时出错:', e.message)
        }

        // 延迟后重新创建socket并重试
        setTimeout(() => {
          udpClient_forAdapt = dgram.createSocket('udp4')
          socketClosed = false
          tryBind()
        }, BIND_RETRY_DELAY)
        return
      }

      // 重试次数用尽或其他错误
      if (bindRetryCount >= MAX_BIND_RETRY) {
        console.error(`❌ UDP套接字绑定失败，已重试 ${MAX_BIND_RETRY} 次`)
        sendToRenderer('adapt-error', {
          state: currentState,
          error: `无法绑定到 ${LOCAL_IP}:${LOCAL_PORT}，已重试${MAX_BIND_RETRY}次: ${err.message}，请重新自适应`
        })
      } else {
        sendToRenderer('adapt-error', {
          state: currentState,
          error: err.message
        })
      }
      cleanup()
    }

    // 带重试机制的bind函数
    const tryBind = () => {
      // 绑定事件处理器
      udpClient_forAdapt.on('message', handleMessage)
      udpClient_forAdapt.on('error', handleError)

      try {
        udpClient_forAdapt.bind(LOCAL_PORT, LOCAL_IP, () => {
          // bind成功
          udpClient_forAdapt.setBroadcast(true)
          console.log(`✅ UDP套接字成功绑定到 ${LOCAL_IP}:${LOCAL_PORT}`)
          if (bindRetryCount > 0) {
            console.log(`📊 经过 ${bindRetryCount} 次重试后成功绑定`)
          }
          processState()
        })
      } catch (err) {
        console.error(`❌ Bind调用异常: ${err.message}`)
        handleError(err)
      }
    }

    // 启动UDP客户端并绑定套接字
    tryBind()
  }
}
