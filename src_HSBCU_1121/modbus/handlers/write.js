;('use strict')
import {
  generateRange,
  generateRange_even,
  generateRange_odd,
  normalizeAddress,
  createAddressItem
} from './utils.js'
const write = (message, modbusClients) => {
  /*   process.send({ type: 'write-ack', requestId: message.requestId }) */
  /* console.log('收到主进程发送数据', message.data.length, message.data) */
  const writeData = message.data
  // 判断是否为升级功能写入（保持原逻辑）
  const firstAddress = writeData[0].address
  const isShieldAll = writeData[0].shieldStyle
  const isUpgradeWrite =
    firstAddress === 51712 ||
    firstAddress === 51781 ||
    firstAddress === 49676 ||
    firstAddress === 256 ||
    firstAddress === 384 ||
    firstAddress === 512 ||
    firstAddress === 640 ||
    firstAddress === 768 ||
    firstAddress === 4352 ||
    firstAddress === 4480 ||
    firstAddress === 4608 ||
    firstAddress === 4736 ||
    firstAddress === 4864 ||
    (firstAddress === 8448 && isShieldAll === 'all') ||
    (firstAddress === 8704 && isShieldAll === 'all') ||
    firstAddress === 51952 /* 保持原有判断逻辑不变 */
  const adjustAddresses_divide10 = [
    '0x005f', //单体温度滤波差值
    '0x0063',
    ...generateRange(0x0069, 0x006e),
    '0x0090',
    '0x0099',
    '0x009a',
    ...generateRange_even(0x3000, 0x302f),
    ...generateRange_even(0x303c, 0x3077),
    ...generateRange_odd(0x3085, 0x30d8),
    ...generateRange_even(0x310a, 0x3168),
    ...generateRange(0x3200, 0x3240),
    ...generateRange(0x3244, 0x324e),
    // 注意：0x3266-0x3269 是32位float寄存器，不应用缩放
    '0x326b',
    '0x326f',
    '0x5301',
    '0x5302',
    ...generateRange(0x5305, 0x5308),
    '0x530d',
    '0x530e',
    ...generateRange(0x5311, 0x5317),
    ...generateRange(0x531e, 0x5327),
    ...generateRange(0x535c, 0x5362),
    '0x536f',
    ...generateRange(0x5372, 0x5374),
    ...generateRange(0x5379, 0x537e),
    ...generateRange(0x5381, 0x5386),
    ...generateRange_odd(0x5700, 0x570b)
  ]
  const adjustAddresses_divide100 = [
    '0x005e', //单体电压权重系数
    '0x0060',
    ...generateRange(0x008a, 0x008f),
    '0x3270',
    '0x3271',
    ...generateRange(0x5387, 0x538e)
  ]
  const adjustAddresses_divide1000 = ['0x005d', ...generateRange_even(0x5700, 0x570b)]
  // 生成连续地址数据（修改关键部分）
  const adjustedWriteData = []
  const addresses = writeData
    .map((item) => {
      const addr = item.address
      return typeof addr === 'string'
        ? parseInt(addr.startsWith('0x') ? addr : `0x${addr}`, 16)
        : addr
    })
    .sort((a, b) => a - b)

  // 生成完整的地址范围（关键修改）
  if (addresses.length > 0) {
    let prevAddress = addresses[0]
    adjustedWriteData.push(createAddressItem(prevAddress, writeData))

    addresses.slice(1).forEach((currentAddress) => {
      // 填充所有中间地址
      for (let addr = prevAddress + 1; addr < currentAddress; addr++) {
        adjustedWriteData.push({
          address: normalizeAddress(addr),
          value: 0,
          ip: writeData[0].ip // 假设使用第一个数据的IP
        })
      }
      adjustedWriteData.push(createAddressItem(currentAddress, writeData))
      prevAddress = currentAddress
    })
  }

  // 数值转换处理（保持原逻辑）
  adjustedWriteData.forEach((item) => {
    let v = Number(item.value)
    // 缩放逻辑不变……
    if (adjustAddresses_divide10.includes(item.address)) v *= 10
    else if (adjustAddresses_divide100.includes(item.address)) v *= 100
    else if (adjustAddresses_divide1000.includes(item.address)) v *= 1000

    // 负数补码
    if (v < 0) v = 65536 - (-v % 65536)

    // 调试日志
    /*       console.log(`地址处理详情：
        原始地址: 0x${parseInt(addrNum).toString(16).padStart(4, '0')}
        原始值: ${originalValue}
        调整后值: ${finalValue}
        转换步骤: ${originalValue} → ${finalValue}
      `) */

    // 先四舍五入，再截断到 0–65535
    const rounded = Math.round(v)
    item.value = ((rounded % 65536) + 65536) % 65536
  })

  // 统一批量写入逻辑（新增核心逻辑）
  const batchWrite = async (client, ip) => {
    try {
      const sortedData = adjustedWriteData.sort(
        (a, b) => parseInt(a.address, 16) - parseInt(b.address, 16)
      )

      const startAddress = parseInt(sortedData[0].address, 16)
      const values = sortedData.map((item) => {
        if (item.value < 0 || item.value > 65535) {
          throw new Error(`无效寄存器值: ${item.value} (地址: ${item.address})`)
        }
        return item.value
      })
      /* console.log(startAddress, values) */
      await client.writeRegisters(startAddress, values)
      console.log(`批量写入成功到 ${ip}`, startAddress, values)
      return true
    } catch (e) {
      console.error(`批量写入失败到 ${ip}:`, e.message, '端口打开？', client.isOpen)
      return false
    }
  }

  // 根据升级类型处理客户端（优化后的逻辑）
  const handleClient = async (client, ip) => {
    if (isUpgradeWrite) {
      if ([51712, 51780].includes(firstAddress)) client.isUpgrade = true
      else if (firstAddress === 49676) client.isBMUAdapt = true
    }

    const success = await batchWrite(client.client, ip)
    process.send({
      type: 'write-response-from-mbs',
      ip: client.mbsHost,
      requestId: message.requestId,
      success
      /*         error: success ? undefined : `批量写入失败` */
    })
  }

  // 执行写入（优化后的IP处理）
  const clients = new Set()
  /*     if (isUpgradeWrite) {
      writeData.forEach((item) => {
        const ips = Array.isArray(item.ip) ? item.ip : [item.ip]
        ips.forEach((ip) => clients.add(ip))
      })
    } else {
      clients.add(writeData[0].ip)
    } */
  writeData.forEach((item) => {
    const ips = Array.isArray(item.ip) ? item.ip : [item.ip]
    ips.forEach((ip) => clients.add(ip))
  })

  Array.from(clients).forEach(async (ip) => {
    const client = modbusClients[ip]
    if (!client) {
      console.error(`找不到Modbus客户端: ${ip}`)
      process.send({
        type: 'write-response-from-mbs',
        ip,
        requestId: message.requestId,
        success: false,
        error: '客户端未找到'
      })
      return
    }
    await handleClient(client, ip)
  })
}
export { write }
