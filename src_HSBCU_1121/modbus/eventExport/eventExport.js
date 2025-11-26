;('use strict')
const path = require('path')
const fs = require('fs')
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
} from '../client/stateCounts'
import {
  parseVoltage,
  parseValue,
  parseEfficiency,
  parseHex,
  parseHexString,
  formatParam,
  writeCsvRow,
  parseContactorStates,
  parseDiFeedbackForEvent,
  parseDoFeedbackForEvent,
  parseRegisterForEvent,
  regsToBytes,
  computeCRC16,
  formatDateTimeForEvent,
  generateEventTypeArray,
  parseSysConfig1,
  parseSysStatusNow
} from './utils'
import {
  formatSystemTime,
  regNumComb_Config,
  /* parseSysStatusNow, */
  parseSysAlarmLevel,
  parseConfig_eventRecod,
  parseConfig_internalTestModel,
  parseConfig_OperModel,
  parseConfig_PCSModel,
  parseConfig_CoolModel,
  parseConfig_LiqModel,
  transToIpv4,
  transToMac,
  convertToAscii_ClusterSummNew,
  parse2bitRegisterForEvent,
  parseSystemTotalFaultBits,
  parseFaultLevels
} from '../handlers/utils'
import { eventState } from './utils'
import { modbusClients } from '../mbstask'
import { formatFileSuffix } from '../dataExport/utils'
// CSV 文件路径（可根据需要改成动态命名，比如带时间戳）
let csvStream = null
let currentSaveDir = ''
async function startReadingEvent(mtclient, totalRead, offsetRead, saveDir) {
  if (mtclient.isReadingEvent) return // 已在读取中，则直接返回
  mtclient.isReadingEvent = true
  currentSaveDir = saveDir
  const PROGRESS_BATCH = 100
  const now = new Date()
  // 格式例子：2025-04-23_15-30-05
  const dateOnly = now.toISOString().split('T')[0]
  // 2. 用 dateOnly 去生成文件夹名
  const eventFolderName = `Event_${dateOnly}` // 例如 "Event_2025-04-23"
  const eventFolderPath = path.join(saveDir, eventFolderName)
  fs.mkdirSync(eventFolderPath, { recursive: true })
  const tsForFile = formatFileSuffix(now)
  fs.mkdirSync(eventFolderPath, { recursive: true })
  // 1️⃣ 打开（或重置）CSV 写入流
  const filename = `${mtclient.mbsHost}_${tsForFile}.csv`
  const outputFile = path.join(eventFolderPath, filename)
  csvStream = fs.createWriteStream(outputFile, { encoding: 'utf8', flags: 'w' })
  console.log(`Writing to new CSV file: ${outputFile}`)
  // 可选：写入第一行表头，用寄存器索引0~127或自定义字段名
  // 新表头：ID,ExportTime,R0...R127
  const headers = [
    'ID',
    //'导出时间',
    '时间戳',
    '事件类型',
    '参数1',
    '参数2',
    '参数3',
    '参数4',
    '系统状态',
    '系统总状态位', //增 2025年9月5日11:20:01
    '单体总故障', //增
    'pack总故障', //增
    '簇总故障', //增
    '总电压',
    '预充电压', //增
    '总电流',
    '簇显示SOC',
    '簇SOH',
    '簇SOE',
    '充电最大允许功率', //增
    '放电最大允许功率', //增
    '充电效率',
    '单次充电电量',
    '单次放电电量',
    '累计充电电量',
    '累计放电电量',
    '簇真实SOC',
    '充电SOP',
    '放电SOP',
    '单次充电容量',
    '单次放电容量',
    '累计充电容量',
    '累计放电容量',
    '电压越限次数',
    '温度越限次数',
    '故障保护次数',
    '绝缘电阻+',
    '绝缘电阻-',
    '最高单体电压数据',
    '最高单体电压编号',
    '最低单体电压数据',
    '最低单体电压编号',
    '单体平均电压', //增
    '最高单体温度数据',
    '最高单体温度编号',
    '最低单体温度数据',
    '最低单体温度编号',
    '单体平均温度', //增
    '最高单体soc数据',
    '最高单体soc编号',
    '最低单体soc数据',
    '最低单体soc编号',
    '单体平均SOC', //增
    '最高电池包电压数据',
    '最高电池包电压编号',
    '最低电池包电压数据',
    '最低电池包电压编号',
    '包平均电压', //增
    '最高动力接插件温度数据', //增
    '最高动力接插件温度编号', //增
    '最低动力接插件温度数据', //增
    '最低动力接插件温度编号', //增
    '动力接插件平均温度', //增
    '接触器状态',
    '系统DI输入状态',
    '系统高边驱动状态',
    '配置1',
    '配置2',
    '特殊功能使能位配置',
    '本机IP',
    '本机MAC地址',
    '事件记录版本号',
    'BOOT版本号',
    '软件版本号',
    '硬件版本号',
    'SOX算法版本号',
    'BCU默认参数版本号',
    'CRC16',
    'CRC校验结果'
  ]
  // 写入 BOM
  csvStream.write('\uFEFF')
  csvStream.write(headers + '\n')
  const MAX_POLLS = 100 // 最大轮询次数上限
  const POLL_INTERVAL = 1 // 每次轮询间隔 20ms

  try {
    for (let i = offsetRead; i < totalRead + offsetRead; i++) {
      // 如果收到停止信号或连接关闭，则中断循环
      if (!mtclient.isReadingEvent || !mtclient.client.isOpen) {
        console.log(`Aborting read loop at i=${i}`)
        break
      }

      // 1️⃣ 向寄存器 0x6000 写入索引 i
      //mtclient.txCount++
      await mtclient.client.writeRegister(0x6000, i)
      // 2️⃣ 轮询寄存器 0x6001，直到其值等于 i 或达到最大轮询次数
      let completeVal = null
      let polls = 0
      do {
        if (!mtclient.isReadingEvent) break
        //mtclient.txCount++
        const resp = await mtclient.client.readHoldingRegisters(0x6001, 1)
        //mtclient.rxCount++
        completeVal = resp.data[0]
        polls++
        /* await delay(POLL_INTERVAL) */
      } while (completeVal !== i && polls < MAX_POLLS)

      if (completeVal !== i) {
        console.warn(`Record ${i} did not complete within ${MAX_POLLS} polls`)
        continue // 本条超时，可选择继续或终止
      }
      // 3️⃣ 读取该条记录的 128 个寄存器数据
      //mtclient.txCount++
      const data1 = await mtclient.client.readHoldingRegisters(0x6002, 120)
      //await delay(10)
      //mtclient.rxCount++
      //mtclient.txCount++
      const data2 = await mtclient.client.readHoldingRegisters(0x607a, 8)
      //mtclient.rxCount++
      //await delay(10)
      const record = [...data1.data, ...data2.data]
      // 2️⃣ 将这一行写入 CSV
      // —— 3. 拼接行：ID, 导出时间, R0...R127 ——
      //const nowRow = new Date()
      //const exportTime = formatDateTimeForEvent(nowRow) // e.g. "2025/4/24 14:08:21"
      // 2.2 将寄存器 0-6 传给 formatSystemTime，得到格式化的时间戳
      const timestamp = formatSystemTime(record.slice(0, 7))
      // 取到原始五个值以后：
      const event = generateEventTypeArray([
        record[7],
        record[8],
        record[9],
        record[10],
        record[11]
      ]) || {
        name: `未知事件(${record[7]})`,
        param1: { label: '/', value: '' },
        param2: { label: '/', value: '' },
        param3: { label: '/', value: '' },
        param4: { label: '/', value: '' }
      }
      // 在写 row 之前，替换原 raw 值：
      const param1Str = formatParam(event.param1)
      const param2Str = formatParam(event.param2)
      const param3Str = formatParam(event.param3)
      const param4Str = formatParam(event.param4)
      // 2.4 合并 22-23、24-25
      const maxPowerCharge = regNumComb_Config(record[26], record[27]) //充电最大允许功率
      const maxPowerDischarge = regNumComb_Config(record[28], record[29]) //放电最大允许功率

      const chargeEnergySingle = regNumComb_Config(record[31], record[32]) //单次充电电量
      const dischargeEnergySingle = regNumComb_Config(record[33], record[34]) //单次放电电量
      const chargeEnergyAccum = regNumComb_Config(record[35], record[36]) + 'kWh' //累计充电电量
      const dischargeEnergyAccum = regNumComb_Config(record[37], record[38]) + 'kWh' //累计放电电量

      const chargeAhSingle = regNumComb_Config(record[42], record[43])
      const dischargeAhSingle = regNumComb_Config(record[44], record[45])
      const chargeAhAccum = regNumComb_Config(record[46], record[47]) + 'Ah'
      const dischargeAhAccum = regNumComb_Config(record[48], record[49]) + 'Ah'
      const row = [
        i + 1, // ID，从1开始
        // exportTime, 导出时间
        timestamp, // 时间戳
        event.name,
        param1Str,
        param2Str,
        param3Str,
        param4Str,
        parseSysStatusNow(record[12]),
        parseSystemTotalFaultBits(record[13], record[14]),
        parseFaultLevels(record[15], 'cellFaultEvent', true),
        parseFaultLevels(record[16], 'packFaultEvent', true),
        [
          parseFaultLevels(record[17], 'clusterFault1Event', true),
          parseFaultLevels(record[18], 'clusterFault2Event', true)
        ]
          .filter((item) => item) // 过滤掉空值
          .join(','), // 使用逗号连接剩余的非空元素
        parseValue(record[20], 'V'), //总电压
        parseValue(record[21], 'V'), //预充电压
        parseValue(record[22], 'A'), //总电流
        parseValue(record[23], '%'), //簇显示SOC
        parseValue(record[24], '%'), //簇SOH
        parseValue(record[25], '%'), //SOE
        parseValue(maxPowerCharge, 'kW'),
        parseValue(maxPowerDischarge, 'kW'),
        parseEfficiency(record[30]), //充电效率
        parseValue(chargeEnergySingle, 'kWh'), //单次充电电量
        parseValue(dischargeEnergySingle, 'kWh'), //单次放电电量
        chargeEnergyAccum, //累计充电电量
        dischargeEnergyAccum, //累计放电电量

        parseValue(record[39], '%'), //簇真实SOC
        parseValue(record[40], '%'), //充电SOP
        parseValue(record[41], '%'), //放电SOP

        parseValue(chargeAhSingle, 'Ah'), //单次充电容量
        parseValue(dischargeAhSingle, 'Ah'), //单次放电容量

        chargeAhAccum, //累计充电容量
        dischargeAhAccum, //累计放电容量

        record[50], //电压越限次数
        record[51], //温度越限次数
        record[52], //故障保护次数
        record[53], //绝缘电阻+
        record[54], //绝缘电阻-

        parseVoltage(record[55]), //最高单体电压数据
        record[56], //最高单体电压编号
        parseVoltage(record[57]), //最低单体电压数据
        record[58], //最低单体电压编号
        parseVoltage(record[59]), //单体平均电压

        parseValue(record[60], '℃'), //最高单体温度数据
        record[61], //最高单体温度编号
        parseValue(record[62], '℃'), //最低单体温度数据
        record[63], //最低单体温度编号
        parseValue(record[64], '℃'), //单体平均温度

        parseValue(record[65], '%'), //最高单体SOC数据
        record[66], //最高单体SOC编号
        parseValue(record[67], '%'), //最低单体SOC数据
        record[68], //最低单体SOC编号
        parseValue(record[69], '%'), //单体平均SOC

        parseValue(record[70], 'V'), //最高电池包电压数据
        record[71], //最高电池包电压编号
        parseValue(record[72], 'V'), //最低电池包电压数据
        record[73], //最低电池包电压编号
        parseValue(record[74], 'V'), //包平均电压

        parseValue(record[75], '℃'), //最高动力接插件温度数据
        record[76], //最高动力接插件温度编号
        parseValue(record[77], '℃'), //最低动力接插件温度数据
        record[78], //最低动力接插件温度编号
        parseValue(record[79], '℃'), //动力接插件平均温度

        parseContactorStates(record[80]), //接触器状态
        parseDiFeedbackForEvent(record[81]), //系统DI输入状态
        parseDoFeedbackForEvent(record[82]), //系统高边驱动状态

        parseSysConfig1(record[83], 1), //配置1
        parseSysConfig1(record[84], 2), //配置2
        parseSysConfig1(record[85], 3), //特殊功能使能位配置

        transToIpv4(record[86], record[87]), //ip
        transToMac(record[88], record[89], record[90]), //本机MAC地址
        convertToAscii_ClusterSummNew(record.slice(91, 98)), //事件记录版本号
        convertToAscii_ClusterSummNew(record.slice(98, 105)), //BOOT版本号
        convertToAscii_ClusterSummNew(record.slice(105, 112)), //软件版本号
        convertToAscii_ClusterSummNew(record.slice(112, 119)), //硬件版本号
        parseHex(record[119]), //SOX算法版本号
        convertToAscii_ClusterSummNew(record.slice(120, 127)), //默认参数版本号
        record[127] //CRC
      ]
      const rowForParamWrite = [
        i + 1, // ID，从1开始
        //exportTime,  导出时间
        timestamp, // 时间戳 0-6
        event.name, //事件类型7
        param1Str, //起始地址8
        param2Str, //寄存器长度9
        param3Str, //10
        param4Str, //11
        parseHex(record[12]),
        parseHexString(record.slice(13, 15)),
        parseHex(record[15]),
        parseHex(record[16]),
        parseHexString(record.slice(17, 20)),
        ...record.slice(20, 26).map((item) => parseHex(item)),
        parseHexString(record.slice(26, 28)),
        parseHexString(record.slice(28, 30)),
        parseHex(record[30]),

        parseHexString(record.slice(31, 33)),
        parseHexString(record.slice(33, 35)),
        parseHexString(record.slice(35, 37)),
        parseHexString(record.slice(37, 39)),
        ...record.slice(39, 42).map((item) => parseHex(item)),
        parseHexString(record.slice(42, 44)),
        parseHexString(record.slice(44, 46)),
        parseHexString(record.slice(46, 48)),
        parseHexString(record.slice(48, 50)),
        ...record.slice(50, 86).map((item) => parseHex(item)),
        parseHexString(record.slice(86, 88)),
        parseHexString(record.slice(88, 91)),
        parseHexString(record.slice(91, 98)),
        parseHexString(record.slice(98, 105)),
        parseHexString(record.slice(105, 112)),
        parseHexString(record.slice(112, 119)),
        parseHex(record[119]),
        parseHexString(record.slice(120, 127)),
        parseHex(record[127])
      ]
      const dataRegsForCrc = record.slice(0, 127)
      const expectedCrc = record[127]
      const actualCrc = computeCRC16(regsToBytes(dataRegsForCrc))
      const crcOk = actualCrc === expectedCrc

      // ===== 写入 CSV =====
      if (record[7] >= 300) {
        rowForParamWrite.push(crcOk ? '通过' : '不通过')
        writeCsvRow(csvStream, rowForParamWrite)
      } else {
        row.push(crcOk ? '通过' : '不通过')
        writeCsvRow(csvStream, row)
      }
      /*  console.log(`IP ${ip} record ${i}:`, record) */
      // ===== 新增：发送进度 =====
      if (i % PROGRESS_BATCH == 0 || i === offsetRead + totalRead - 1) {
        process.send({
          API: 'readEventProgress',
          deviceIp: mtclient.mbsHost,
          current: i + 1 - offsetRead,
          total: totalRead
        })
      }
    }
  } catch (err) {
    mtclient.mbsState = MBS_STATE_FAIL_READ
    //console.error(`Error during event read loop: ${err.message}`)
    process.send({
      API: 'readEventError',
      deviceIp: mtclient.mbsHost,
      error: err.message
    })
  } finally {
    stopReadingEvent(mtclient, false)
  }
}
function stopReadingEvent(mtclient, allClients, wasCanceled = false) {
  if (mtclient.isReadingEvent) {
    mtclient.isReadingEvent = false
    eventState.currentReadingEventIp = null
    // 区分：如果是主动取消，就发 cancel；否则发 completed
    if (wasCanceled) {
      process.send({ API: 'readEventCanceled', currentSaveDir })
      console.log('Event read canceled by user')
    } else {
      process.send({ API: 'readEventCompleted', currentSaveDir })
      console.log('Event read completed')
    }
  }
  // 停掉“其他”心跳
  Object.entries(modbusClients).forEach(([ip, client]) => {
    if (ip !== mtclient.mbsHost) {
      client.stopHeartbeat()
    }
  })
  // 关闭 CSV 写入流
  if (csvStream) {
    csvStream.end(() => console.log('CSV file closed.'))
    csvStream = null
  }
}
export { startReadingEvent, stopReadingEvent }
