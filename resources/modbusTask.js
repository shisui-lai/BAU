var modbus = require('modbus-stream')

// 创建一个全局变量来存储 connection 对象
global.connection = null
global.counter = 0

function modbusRead() {
  // console.log('Modbus TCP Task')
  global.counter++
  global.connection.readInputRegisters(
    { address: 0x200, quantity: 10, extra: { unitId: 1 } },
    (err, res) => {
      // if (err) throw err
      // if (err) console.log(`2 ${err}`)

      console.log(`Counter:${global.counter} error:${err} res:${res}`) // response
      // console.log(res) // response
    }
  )
}

export default function modbusInit() {
  console.log('Connecting to Modbus TCP')
  modbus.tcp.connect(502, '192.168.10.208', { debug: 'automaton-2454' }, (err, connection) => {
    // if (err) throw err
    if (err) {
      console.log(`1 ${err}`)
      return
    }

    // 将 connection 对象赋值给全局变量
    global.connection = connection
    setInterval(modbusRead, 200)
    connection.on('error', (data) => {
      console.log(`Event 'error' occurred with arguments: ${data}`)
    })
  })

  console.log('Connecting to Modbus TCP 2')
}

function modbusRun() {
  console.log('Connecting to Modbus TCP')
  modbus.tcp.connect(502, '192.168.10.208', { debug: 'automaton-2454' }, (err, connection) => {
    // if (err) throw err
    if (err) {
      console.log(`1 ${err}`)
      return
    }

    // 将 connection 对象赋值给全局变量
    global.connection = connection

    connection.on('error', (data) => {
      console.log(`Event 'error' occurred with arguments: ${data}`)
    })
  })

  setInterval(modbusRead, 20)
  console.log('Connecting to Modbus TCP 2')
}

// 命名导出
// export ModbusServerIP = '192.168.10.102'
