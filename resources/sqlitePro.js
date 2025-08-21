/* eslint-disable no-console, spaced-comment, func-call-spacing, no-spaced-func */

//==============================================================
// This is an example of polling (reading) Holding Registers
// on a regular scan interval with timeouts enabled.
// For robust behaviour, the next action is not activated
// until the previous action is completed (callback served).
//==============================================================

'use strict'

//==============================================================
// 创建一个空对象以存储 modbusTcpClient 实例，IP地址为键
let modbusClients = {}
class modbusTcpClient {
  constructor(mbsHost, mbsState, mbsStatus) {
    this.mbsHost = mbsHost
    this.mbsState = mbsState
    this.mbsStatus = mbsStatus
  }

  init() {
    this.client = new ModbusRTU()
  }
}

// create an empty modbus client
const ModbusRTU = require('modbus-serial')
// const client      = new ModbusRTU();

// let mbsStatus   = "Initializing...";    // holds a status of Modbus

// Modbus 'state' constants
const MBS_STATE_INIT = 'State init'
const MBS_STATE_IDLE = 'State idle'
const MBS_STATE_NEXT = 'State next'
const MBS_STATE_GOOD_READ = 'State good (read)'
const MBS_STATE_FAIL_READ = 'State fail (read)'
const MBS_STATE_GOOD_CONNECT = 'State good (port)'
const MBS_STATE_FAIL_CONNECT = 'State fail (port)'

// Modbus TCP configuration values
const mbsId = 1
const mbsPort = 502
// const mbsHost     = "192.168.10.100";
const mbsScan = 1000
const mbsTimeout = 5000
// let mbsState    = MBS_STATE_INIT;

//==============================================================
const connectClient = function (mtclient) {
  // close port (NOTE: important in order not to create multiple connections)
  mtclient.client.close(function () {
    console.log(mtclient.mbsStatus)
  })
  // set requests parameters
  mtclient.client.setID(mbsId)
  mtclient.client.setTimeout(mbsTimeout)
  // try to connect

  mtclient.client
    .connectTCP(mtclient.mbsHost, { port: mbsPort })
    .then(function () {
      mtclient.mbsState = MBS_STATE_GOOD_CONNECT
      mtclient.mbsStatus = 'Connected, wait for reading...'
      console.log(mtclient.mbsStatus)
    })
    .catch(function (e) {
      mtclient.mbsState = MBS_STATE_FAIL_CONNECT
      mtclient.mbsStatus = e.message
      console.log(e)
    })
}

//==============================================================
const readModbusData = function (mtclient) {
  // try to read data
  mtclient.client
    .readHoldingRegisters(0x200, 10)
    .then(function (data) {
      mtclient.mbsState = MBS_STATE_GOOD_READ
      mtclient.mbsStatus = 'success'
      console.log(data.buffer)
    })
    .catch(function (e) {
      mtclient.mbsState = MBS_STATE_FAIL_READ
      mtclient.mbsStatus = e.message
      console.log(e)
    })
}

//==============================================================
const runModbus = function (mtclient) {
  switch (mtclient.mbsState) {
    case MBS_STATE_INIT:
      mtclient.nextAction = connectClient
      break

    case MBS_STATE_NEXT:
      mtclient.nextAction = readModbusData
      break

    case MBS_STATE_GOOD_CONNECT:
      mtclient.nextAction = readModbusData
      break

    case MBS_STATE_FAIL_CONNECT:
      mtclient.nextAction = connectClient
      break

    case MBS_STATE_GOOD_READ:
      mtclient.nextAction = readModbusData
      break

    case MBS_STATE_FAIL_READ:
      if (mtclient.client.isOpen) {
        mtclient.mbsState = MBS_STATE_NEXT
      } else {
        mtclient.nextAction = connectClient
      }
      break

    default:
    // nothing to do, keep scanning until actionable case
  }

  console.log()
  console.log(mtclient.nextAction)

  // execute "next action" function if defined
  if (mtclient.nextAction !== undefined) {
    mtclient.nextAction(mtclient)
    mtclient.mbsState = MBS_STATE_IDLE
  }

  // set for next run
  // setTimeout(runModbus, mbsScan, modbusTcpC)
  // setTimeout(runModbus(modbusTcpC), 5000)
}
// runModbus()
const runmodbusLop = function (mtclients) {
  for (const ip in mtclients) {
    if (Object.prototype.hasOwnProperty.call(mtclients, ip)) {
      const client = mtclients[ip]
      // 在这里，您可以对client执行任何需要的操作
      // console.log(`Client at IP ${ip}:`, client)
      runModbus(client)
      // 假设您想要执行一些特定的客户端操作，比如检查状态或发送请求
      // client.someMethod(); // 替换为您实际想要调用的方法
    }
  }

  setTimeout(runmodbusLop, mbsScan, modbusClients)
}
//==============================================================
// const modbusTcpC = new modbusTcpClient('192.168.10.100', MBS_STATE_INIT, 'Initializing...')

// 定义一个函数来添加新的 modbusTcpClient 实例到对象中
function addModbusClient(ip) {
  const client = new modbusTcpClient(ip, MBS_STATE_INIT, 'Initializing...')
  client.init()
  modbusClients[ip] = client // 使用IP地址作为键存储客户端实例
  return client // 可选：返回新创建的客户端实例以便后续使用（但在这个例子中我们不需要它）
}

// 定义一个函数来根据IP地址移除并释放 modbusTcpClient 实例
function removeModbusClientByIp(ip) {
  if (modbusClients.hasOwnProperty(ip)) {
    const client = modbusClients[ip]
    // 假设 modbusTcpClient 类有一个 close 方法用于释放资源
    client.client.close() // 或 client.destroy()，具体取决于类实现
    delete modbusClients[ip] // 从对象中删除该客户端
  } else {
    console.error('Client with IP address not found.');
  }
}

// 使用示例，不直接使用变量来引用客户端实例
// addModbusClient('192.168.10.100');
// addModbusClient('192.168.10.101');

// ... 执行一些操作后，决定移除一个客户端
// removeModbusClientByIp('192.168.10.100');

process.on('exit', (code) => {
  console.log('exit')
  console.log(code)
})

process.on('message', (message) => {
  // console.log(`Message from parent: ${message}`)
  console.log(`Message from parent: ` + JSON.stringify(message))
  process.send('Hello from child process!')

  if (message && message.API === 'modbus-init') {
    console.log('Connecting to Modbus TCP')
    addModbusClient('192.168.10.100')
    runmodbusLop(modbusClients)
    setTimeout(removeModbusClientByIp, 10000, '192.168.10.100')
    console.log('Connecting to Modbus TCP 2')
  }

  if (message && message.API === 'modbus-read') {
    console.log('modbus-read')
  }
  if (message && message.API === 'modbus-exit') {
    process.exit(0)
  }
})
