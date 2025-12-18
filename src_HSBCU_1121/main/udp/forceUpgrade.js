const dgram = require('dgram')

let udpClient = null
let sendInterval = null
let isUpgrading = false

/**
 * 开始发送强制升级指令
 * @param {object} event - IPC事件对象
 * @param {string} targetIp - 目标BCU的IP地址（可选，不提供则广播）
 * @param {string} localInterface - 本地网卡IP地址
 * @returns {Promise<void>}
 */
function startForceUpgrade(event, { targetIp, localInterface }) {
  return new Promise((resolve, reject) => {
    // 如果已经在升级中，先停止
    if (isUpgrading) {
      stopForceUpgrade()
    }

    /* console.log('[Force Upgrade] 开始发送强制升级指令')
    console.log('[Force Upgrade] 目标IP:', targetIp || '广播')
    console.log('[Force Upgrade] 本地接口:', localInterface) */

    // 创建 UDP 客户端
    udpClient = dgram.createSocket('udp4')
    isUpgrading = true

    const LOCAL_PORT = 30001 // 本地端口
    const TARGET_PORT = 40000 // 目标端口
    const TARGET_IP = targetIp || '255.255.255.255' // 如果没有指定目标IP，则广播

    // 构造强制升级指令
    // byte1-byte2: 0xAFFD
    // byte3-byte6: 0xFD424155
    const upgradeCommand = Buffer.from([0xaf, 0xfd, 0xfd, 0x42, 0x41, 0x55])

    // 绑定本地端口和接口，bind是异步的，绑定完成后才会行回调函数
    udpClient.bind(LOCAL_PORT, localInterface, () => {
      if (!targetIp) {
        // 如果是广播模式，设置广播标志
        udpClient.setBroadcast(true)
      }
      console.log(`[Force Upgrade] UDP客户端已绑定到 ${localInterface}:${LOCAL_PORT}`)

      // 发送第一条指令
      sendUpgradeCommand()

      // 每100ms发送一次指令
      sendInterval = setInterval(() => {
        sendUpgradeCommand()
      }, 100)

      resolve()
    })

    // 发送升级指令的函数
    function sendUpgradeCommand() {
      if (!udpClient || !isUpgrading) return

      udpClient.send(upgradeCommand, 0, upgradeCommand.length, TARGET_PORT, TARGET_IP, (err) => {
        if (err) {
          console.error('[Force Upgrade] 发送指令失败:', err.message)
          // 发送错误时立即停止升级
          stopForceUpgrade()
          // 只发送一次错误通知
          event.sender.send('force-upgrade-error', {
            error: err.message
          })
        } else {
          // console.log('[Force Upgrade] 已发送指令到', TARGET_IP)
          event.sender.send('force-upgrade-sending', {
            timestamp: Date.now()
          })
        }
      })
    }

    // 监听 BCU 的响应，注册是同步的，所以不会错过任何响应，异步触发消息回调函数
    udpClient.on('message', (msg, rinfo) => {
      console.log(`[Force Upgrade] 收到来自 ${rinfo.address}:${rinfo.port} 的响应`)
      console.log('[Force Upgrade] 响应数据:', msg.toString('hex'))

      // 检查响应格式
      // byte1-byte2: 0xAFFD 或 0xAFFE
      // byte3: 当前地址（需转换为十进制）
      // byte4-byte9: MAC地址
      // byte10: 响应码
      if (msg.length >= 9 && msg[0] === 0xaf && msg[1] === 0xfd) {
        // 0xAFFD: 升级指令响应
        const currentAddress = msg[2] // 当前地址（十进制）
        const macAddress = msg.subarray(3, 9).toString('hex').toUpperCase()
        const formattedMac = macAddress.match(/.{1,2}/g).join(':')
        const responseCode = msg[9]

        /*   console.log('[Force Upgrade] 0xAFFD - 当前地址:', currentAddress)
        console.log('[Force Upgrade] 0xAFFD - MAC地址:', formattedMac)
        console.log('[Force Upgrade] 0xAFFD - 响应码:', responseCode.toString(16)) */

        if (responseCode === 0xe0) {
          // 成功
          //console.log('[Force Upgrade] BCU响应：升级指令执行成功')
          event.sender.send('force-upgrade-progress', {
            ip: rinfo.address,
            mac: formattedMac,
            address: currentAddress,
            message: '等待下载文件...'
          })
          // 停止发送指令，但保持UDP监听以接收后续升级进度
          stopSendingCommand()
        } else if (responseCode === 0xe1) {
          // 错误
          console.log('[Force Upgrade] BCU响应：未知错误')
          event.sender.send('force-upgrade-failed', {
            ip: rinfo.address,
            mac: formattedMac,
            address: currentAddress,
            message: '升级指令执行失败：未知错误'
          })
          // 停止发送指令
          stopForceUpgrade()
        } else {
          console.warn('[Force Upgrade] 未知的响应码:', responseCode.toString(16))
        }
      } else if (msg.length >= 9 && msg[0] === 0xaf && msg[1] === 0xfe) {
        // 0xAFFE: 升级进度状态反馈
        const currentAddress = msg[2] // 当前地址（十进制）
        const macAddress = msg.subarray(3, 9).toString('hex').toUpperCase()
        const formattedMac = macAddress.match(/.{1,2}/g).join(':')
        const responseCode = msg[9]

        /*    console.log('[Force Upgrade] 0xAFFE - 当前地址:', currentAddress)
        console.log('[Force Upgrade] 0xAFFE - MAC地址:', formattedMac)
        console.log('[Force Upgrade] 0xAFFE - 响应码:', responseCode.toString(16)) */

        switch (responseCode) {
          case 0x00:
            //console.log('[Force Upgrade] 升级文件下载中')
            event.sender.send('force-upgrade-progress', {
              ip: rinfo.address,
              mac: formattedMac,
              address: currentAddress,
              message: '升级文件下载中'
            })
            break
          case 0x01:
            // console.log('[Force Upgrade] 升级文件下载完成')
            event.sender.send('force-upgrade-progress', {
              ip: rinfo.address,
              mac: formattedMac,
              address: currentAddress,
              message: '升级文件下载完成，请等待BCU升级完成'
            })
            break
          case 0x02:
            // console.log('[Force Upgrade] 程序升级完成')
            event.sender.send('force-upgrade-success', {
              ip: rinfo.address,
              mac: formattedMac,
              address: currentAddress,
              message: '程序升级完成，请等待BCU重启'
            })
            stopForceUpgrade()
            break
          case 0xa1:
            //console.log('[Force Upgrade] 升级文件下载错误')
            event.sender.send('force-upgrade-failed', {
              ip: rinfo.address,
              mac: formattedMac,
              address: currentAddress,
              message: '升级文件下载错误，请检查是否有其他10网段的ip，并删除这些ip'
            })
            stopForceUpgrade()
            break
          case 0xa2:
            // console.log('[Force Upgrade] 升级错误')
            event.sender.send('force-upgrade-failed', {
              ip: rinfo.address,
              mac: formattedMac,
              address: currentAddress,
              message: '程序升级错误'
            })
            stopForceUpgrade()
            break
          default:
            console.warn('[Force Upgrade] 未知的 0xAFFE 响应码:', responseCode.toString(16))
        }
      } else {
        console.warn('[Force Upgrade] 收到未知格式的响应:', msg.toString('hex'))
      }
    })

    // 监听错误
    udpClient.on('error', (err) => {
      console.error('[Force Upgrade] UDP客户端错误:', err)
      event.sender.send('force-upgrade-error', {
        error: err.message
      })
      stopForceUpgrade()
    })
  })
}

/**
 * 停止发送升级指令，但保持UDP监听
 */
function stopSendingCommand() {
  //console.log('[Force Upgrade] 停止发送升级指令，保持UDP监听')

  // 清除定时器
  if (sendInterval) {
    clearInterval(sendInterval)
    sendInterval = null
  }

  // 不关闭UDP客户端，继续监听后续的升级进度响应
}

/**
 * 停止强制升级并关闭UDP客户端
 */
function stopForceUpgrade() {
  console.log('[Force Upgrade] 完全停止强制升级')

  // 清除定时器
  if (sendInterval) {
    clearInterval(sendInterval)
    sendInterval = null
  }

  // 关闭 UDP 客户端
  if (udpClient) {
    try {
      udpClient.close()
    } catch (err) {
      console.error('[Force Upgrade] 关闭UDP客户端失败:', err)
    }
    udpClient = null
  }

  isUpgrading = false
}

/**
 * 获取升级状态
 * @returns {{isUpgrading: boolean}}
 */
function getUpgradeStatus() {
  return { isUpgrading }
}

export { startForceUpgrade, stopForceUpgrade, getUpgradeStatus }
