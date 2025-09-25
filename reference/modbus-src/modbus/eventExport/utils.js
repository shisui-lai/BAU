;('use strict')
import {
  /* parseSysStatusNow, */
  parseConfig_eventRecod,
  parseConfig_internalTestModel,
  parseConfig_Balance,
  parseConfig_OperModel,
  parseConfig_PCSModel,
  parseConfig_CoolModel,
  parseConfig_LiqModel,
  parseConfig_CurrentSenser,
  parseAFEBMUStatus,
  parseConfig_Fire
} from '../handlers/utils'
import { configFaultAction } from '../handlers/configFaultMap'
// src/modbus/eventExport/eventState.js
const eventState = {
  currentReadingEventIp: null
}
function parseVoltage(raw) {
  // 无效值处理
  if (raw === 32766 || raw === 32767) {
    return `无效值(${raw})`
  }
  return (raw * 0.001).toFixed(3) + 'V'
}
function parseValue(raw, unit) {
  // 1) 先处理无效值（那些用 32766/67 表示空的寄存器）
  if (raw === 32766 || raw === 32767) return `无效值(${raw})`

  // 2) 如果是温度（℃），寄存器是 0.1℃/LSB
  if (unit === '℃') {
    // 无符号转有符号
    if (raw > 0x7fff) raw -= 0x10000
    return (raw * 0.1).toFixed(1) + '℃'
  }

  // 3) 如果是电压 (V) 或电流 (A)，同理看你硬件文档：
  //    电压通常也是 0.1V/LSB，电流看你的配置
  if (unit === 'V') {
    return (raw * 0.1).toFixed(1) + 'V'
  }
  if (unit === 'A') {
    return (raw * 0.1).toFixed(1) + 'A'
  }

  // 4) 如果是百分比 (%)，寄存器直接就是整数百分比
  if (unit === '%') {
    return (raw * 0.1).toFixed(1) + '%'
  }
  if (unit === 'kWh') {
    return (raw * 0.01).toFixed(2) + 'kWh'
  }
  if (unit === 'Ah') {
    return (raw * 0.01).toFixed(2) + 'Ah'
  }
  if (unit === 'kW') {
    return (raw * 0.1).toFixed(1) + 'kW'
  }
  // 5) 默认：原始返回字符串＋单位
  return raw + unit
}
function parseEfficiency(raw) {
  if (raw === 0x7ffe || raw === 0x7fff) return `无效值(${raw})`
  return (raw / 100).toFixed(2) + '%'
}
function parseNull() {
  return ''
}
function parseHex(raw) {
  // 确保 raw 是个十进制数
  const num = Number(raw)
  if (Number.isNaN(num)) return raw
  // 转成 16 进制并加上 0x 前缀，字母部分大写
  return '0x' + num.toString(16).toUpperCase()
}
function parseHexString(arr) {
  return arr.map((item) => parseHex(item)).join(',')
}
function faultClearFlag(raw) {
  const statusMap = {
    0: '无故障',
    1: '严重故障',
    2: '一般故障',
    3: '轻微故障',
    85: '故障产生',
    170: '故障恢复'
  }

  return statusMap.hasOwnProperty(raw) ? statusMap[raw] : `未知${raw}`
}
function bmuCellIndex(raw) {
  return ((raw >> 8) & 0xff) + '/' + (raw & 0xff)
}
function parseContactorAction(raw) {
  switch (raw) {
    case 0:
      return '无效（不执行）'
    case 1:
      return '设置BCU充电操作'
    case 2:
      return '设置BCU放电操作'
    case 3:
      return '设置BCU脱离母线'
    case 4:
      return '接触器自检'
    default:
      return `未知动作(${raw})`
  }
}
function parseContactorControl(raw) {
  const names = [
    '主正接触器控制',
    '预充接触器控制',
    '主负接触触器控制',
    '主断分励脱扣',
    '风扇控制',
    '直流供电KM控制'
  ]
  const parts = []
  for (let i = 0; i < names.length; i++) {
    const code = (raw >> (i * 2)) & 0x3
    let status
    if (code === 1) status = '断开'
    else if (code === 2) status = '闭合'
    else status = '无效'
    parts.push(`${names[i]}:${status}`)
  }
  // 如果所有都是“无效”，就只返回一个“无”
  return parts.every((p) => p.endsWith('无效')) ? '无' : parts.join(';')
}
function parseFaultClearAction(raw) {
  switch (raw) {
    case 0:
      return '清除所有故障'
    case 1:
      return '清除充电过流严重告警'
    case 2:
      return '清除放电过流严重告警'
    case 3:
      return '清除绝缘电阻严重告警'
    case 4:
      return '清除接触器黏连（氧化）'
    case 5:
      return '清除PCS通讯故障'
    case 65535:
      return '无效'
    default:
      return `未知动作(${raw})`
  }
}
function parseControlActions(raw) {
  const names = [
    '主正接触器控制',
    '预充接触器控制',
    '主负接触器控制',
    '主断分励脱扣',
    '风扇控制',
    '直流供电KM控制'
  ]
  const parts = names.map((label, idx) => {
    const bit = (raw >> idx) & 0x1
    return `${label}:${bit === 1 ? '闭合' : '断开'}`
  })
  return parts.every((p) => p.endsWith('断开')) ? '无' : parts.join(';')
}
function parseHLSideActions(raw) {
  const names = [
    ...Array.from({ length: 12 }, (_, i) => `高边${i + 1}`),
    ...Array.from({ length: 4 }, (_, i) => `低边${i + 1}`)
  ]
  // 如果 raw 全部为 0，直接返回 "无"
  if (raw === 0) {
    return `无${raw}`
  }
  const parts = names.map((label, idx) => {
    const bit = (raw >> idx) & 0x1
    return `${label}:${bit}`
  })
  return parts.join(';')
}
function parseDIDOActions(raw) {
  const names = ['DI1', 'DI2', '预留', '预留', '预留', '预留', '预留', '预留', '继电器1', '继电器2']
  if (raw === 0) {
    return `无${raw}`
  }
  const parts = names.map((label, idx) => {
    const bit = (raw >> idx) & 0x1
    return `${label}:${bit}`
  })
  return parts.join(';')
}
function formatParam(param) {
  // param = { label, value }
  if (param.label === '/') {
    return '/'
  }
  let text
  if (Array.isArray(param.value)) {
    // parseRegister 返回 [{ fault: '...' }, …]
    text = param.value.map((item) => item.fault || item.toString()).join(', ')
  } else {
    text = param.value != null ? param.value.toString() : ''
  }
  return `${param.label}:${text}`
}
function writeCsvRow(stream, row) {
  if (!stream) return // 如果已被关闭/置空，就跳过
  const line =
    row
      .map((cell) => {
        // 把 null/undefined 都当空字符串
        const s = (cell ?? '').toString().replace(/"/g, '""') // CSV 里双引号要成对转义
        return `"${s}"`
      })
      .join(',') + '\n'
  stream.write(line)
}
function parseContactorStates(raw) {
  // 2-bit 的状态映射表
  const stateMap = {
    0: '断开',
    1: '闭合',
    2: '故障'
  }

  // 从 raw 中提取对应两位并映射
  const mainPositive = (raw >> 0) & 0b11 // bit0-1
  const mainNegative = (raw >> 2) & 0b11 // bit2-3
  const preCharge = (raw >> 4) & 0b11 // bit4-5

  // 构造输出
  const parts = [
    `主正接触器:${stateMap[mainPositive] ?? `未知(${raw})`}`,
    `主负接触器:${stateMap[mainNegative] ?? `未知(${raw})`}`,
    `预充接触器:${stateMap[preCharge] ?? `未知(${raw})`}`
  ]

  return parts.join('; ')
}

function parseSysConfig1(raw, whichConfig) {
  const configsMap = {
    eventMode: {
      0: '简约模式',
      1: '详细模式'
    },
    testMode: {
      0: '关闭',
      1: 'V/T模式',
      2: 'IACP',
      3: 'DO'
    },
    balanceMode: {
      0: '自动均衡',
      1: '手动均衡'
    },
    maintenanceMode: {
      0: '运维模式',
      1: '非运维模式'
    },
    pcsStyle: {
      0: '无PCS',
      1: '星星PCS',
      2: '双一力PCS-01',
      3: '科华PCS'
    },
    refrigeration: {
      0: '无制冷设备',
      1: '柯诺威',
      2: '英维克',
      3: '埃森特交流空调'
    },
    dehumidifier: {
      0: '无除湿机',
      1: '除湿机-01',
      2: '除湿机-E-J-000113'
    },
    fireController: {
      0: '无消防设备',
      1: '三沃力源'
    },
    clusterVoltMode: {
      0: '高压采集模式',
      1: '单体电压累加模式'
    },
    portTEnable: {
      0: '不存在',
      1: '存在'
    },
    bmuTDataStyle: {
      0: '普通模式',
      1: '高精度模式'
    }
  }
  switch (whichConfig) {
    case 1: {
      const eventMode = raw & 0x03 // 提取 bit 0-1,0x03 = 00000011 (掩码，保留最低2位)
      const testMode = (raw >> 2) & 0x0f // 提取 bit 2-5
      const balanceMode = (raw >> 6) & 0x07 // 提取 bit 6-8
      const maintenanceMode = (raw >> 9) & 0x03 // 提取 bit 9-10
      const pcsStyle = (raw >> 11) & 0x1f //提取11-15
      const parts = [
        `事件记录模式:${configsMap.eventMode[eventMode] ?? `未知(${raw})`}`,
        `内测模式:${configsMap.testMode[testMode] ?? `未知(${raw})`}`,
        `均衡模式:${configsMap.balanceMode[balanceMode] ?? `未知(${raw})`}`,
        `运维模式:${configsMap.maintenanceMode[maintenanceMode] ?? `未知(${raw})`}`,
        `PCS类型:${configsMap.pcsStyle[pcsStyle] ?? `未知(${raw})`}`
      ]
      return parts.join(';')
    }
    case 2: {
      const refrigeration = raw & 0x1f // 提取 bit 0-4,
      const dehumidifier = (raw >> 5) & 0x1f // 提取 bit 5-9
      const fireController = (raw >> 10) & 0x1f // 提取 bit10-14
      const parts = [
        `制冷设备类型:${configsMap.refrigeration[refrigeration] ?? `未知(${raw})`}`,
        `除湿机设备类型:${configsMap.dehumidifier[dehumidifier] ?? `未知(${raw})`}`,
        `消防设备类型:${configsMap.fireController[fireController] ?? `未知(${raw})`}`
      ]
      return parts.join(';')
    }
    case 3: {
      const clusterVoltMode = raw & 0x07 // 提取 bit 0-2
      const portTEnable = (raw >> 3) & 0x01 // 提取 bit3
      const bmuTDataStyle = (raw >> 4) & 0x01 // 提取 bit4
      const parts = [
        `簇压模式:${configsMap.clusterVoltMode[clusterVoltMode] ?? `未知(${raw})`}`,
        `动力接插件:${configsMap.portTEnable[portTEnable] ?? `未知(${raw})`}`,
        `BMU温度数据类型:${configsMap.bmuTDataStyle[bmuTDataStyle] ?? `未知(${raw})`}`
      ]
      return parts.join(';')
    }
  }
}

function parseDiFeedbackForEvent(raw) {
  const parts = []
  for (let i = 1; i <= 11; i++) {
    const bit = (raw >> (i - 1)) & 0x1
    parts.push(`DI${i}:${bit}`)
  }
  return parts.join('; ')
}
function parseDoFeedbackForEvent(raw) {
  const parts = []
  // DO1…DO8 对应 bit0…bit7
  for (let i = 1; i <= 8; i++) {
    const bit = (raw >> (i - 1)) & 0x1
    parts.push(`DO${i}:${bit}`)
  }

  // 地址自适应反馈 对应 bit8
  const addrBit = (raw >> 8) & 0x1
  parts.push(`地址自适应反馈:${addrBit}`)

  return parts.join('; ')
}
function parseBitsString(raw, bits = 16) {
  const bin = raw.toString(2).padStart(bits, '0')
  return bin.split('').reverse().join('')
}
function parseRegisterForEvent(registerValue, faultList, registerNum, showNoFault = false) {
  const hits = []
  for (let i = 0; i < registerNum; i++) {
    if (((registerValue >> i) & 1) === 1) {
      hits.push(faultList[i])
    }
  }
  if (hits.length === 0) {
    return !showNoFault ? `无(${registerValue})` : ''
  }
  return hits.join(';')
}
function parseResetActions(raw) {
  // labels 对应 bit0~bit10
  const labels = [
    '复位系统基本参数', // bit0
    '复位电芯校准参数', // bit1
    '复位簇诊断参数', // bit2
    '复位pack诊断参数', // bit3
    '复位电芯诊断参数', // bit4
    '复位实时保存数据', // bit5
    '复位sox参数', // bit6
    '复位sop map', // bit7
    '复位出厂校准参数', // bit8
    '复位事件记录标志', // bit9
    '复位系统运行时间', // bit10
    '复位配置参数' //bit11
  ]

  // 0xFFFF (65535) 特殊无效
  if (raw === 0xffff) {
    return '无效'
  }

  const hits = []
  // 只扫描前 11 位
  for (let i = 0; i < labels.length; i++) {
    if (((raw >> i) & 1) === 1) {
      hits.push(labels[i])
    }
  }

  // 全都不执行
  if (hits.length === 0) {
    return '无'
  }

  // 返回所有要执行的复位动作
  return hits.join(';')
}
function regsToBytes(regs) {
  const bytes = []
  for (const reg of regs) {
    bytes.push(reg & 0xff) // 低字节
    bytes.push((reg >> 8) & 0xff) // 高字节
  }
  return bytes
}
function computeCRC16(data) {
  let crc = 0xffff
  for (let b of data) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      if (crc & 0x0001) {
        crc = (crc >>> 1) ^ 0xa001
      } else {
        crc = crc >>> 1
      }
    }
  }
  return crc
}
function formatDateTimeForEvent(date) {
  const year = date.getFullYear() // 返回完整的年份（4 位）&#8203;:contentReference[oaicite:0]{index=0}
  const month = (date.getMonth() + 1).toString().padStart(2, '0') // 月份 0–11，需要 +1&#8203;:contentReference[oaicite:1]{index=1}
  const day = date.getDate().toString().padStart(2, '0') // 当月第几天 1–31&#8203;:contentReference[oaicite:2]{index=2}
  const hour = date.getHours().toString().padStart(2, '0') // 0–23，补齐两位&#8203;:contentReference[oaicite:3]{index=3}
  const minute = date.getMinutes().toString().padStart(2, '0') // 0–59，补齐两位&#8203;:contentReference[oaicite:4]{index=4}
  const second = date.getSeconds().toString().padStart(2, '0') // 0–59，补齐两位&#8203;:contentReference[oaicite:5]{index=5}

  // 注意 month/day 保持不补零，hour/minute/second 补齐两位
  return `${year}年${month}月${day}日 ${hour}:${minute}:${second}`
}
function parseSysStatusNow(raw) {
  const map = {
    status: {
      0: '静置',
      1: '充电',
      2: '放电',
      3: '开路',
      4: '自检'
    },
    faultLevel: {
      0: '无故障',
      1: '严重',
      2: '一般',
      3: '轻微'
    }
  }
  const status = raw & 0x0f //bit0-3
  const faultLevel = (raw >> 4) & 0x03 //bit4-5
  const parts = [
    `系统状态:${map.status[status] ?? `未知(${raw})`}`,
    `系统模拟量故障等级:${map.faultLevel[faultLevel] ?? `未知(${raw})`}`
  ]
  return parts.join(',')
}
function generateEventTypeArray(params) {
  const config = []
  // ------------- 基础类型数组 -------------
  const batteryFaults = [
    '单体电池过压',
    '单体电池低压',
    '单体电池压差大',
    '单体电池充电过温',
    '单体电池充电低温',
    '单体电池放电过温',
    '单体电池放电低温',
    '单体电池温差大',
    'SOC高',
    'SOC低',
    'SOC差异',
    '电池包电压过高',
    '电池包电压过低',
    '电池包包间压差',
    '电池包温度过高',
    '电池包温度过低',
    '动力接插件-1过温',
    '动力接插件-2过温',
    '簇电压过压',
    '簇电压低压',
    '充电过流',
    '放电过流',
    '绝缘正对地故障',
    '绝缘负对地故障',
    '簇端温度1过温故障',
    '簇端温度2过温故障',
    '簇端温度3过温故障',
    '簇端温度4过温故障',
    '簇端温度5过温故障'
  ]
  batteryFaults.forEach((name, idx) => config.push({ index: idx + 1, name }))

  for (let i = 30; i <= 99; i++) config.push({ index: i, name: '预留' })

  const systemEvents = [
    '系统启动',
    '系统状态切换',
    'BMU/AFE配置数据变化',
    '电池/温度配置数据变化',
    '事件记录/内测模式切换',
    '事件记录异常复位',
    '事件记录溢出清除',
    '均衡/运维模式切换',
    'PCS/制冷设备类型切换',
    '电流传感器/除湿机类型切换',
    '存储器第一次使用参数复位',
    '消防传感器类型切换',
    'OCV更新'
  ]
  systemEvents.forEach((name, idx) => config.push({ index: 100 + idx, name }))
  for (let i = 113; i <= 149; i++) config.push({ index: i, name: '预留' })

  const driveFaults = [
    '高边驱动反馈故障',
    '接触器故障',
    '反馈信号故障',
    '通讯/采集失联类故障',
    'BMU参数配置错误位置',
    '硬件其他状态',
    '总故障位触发',
    '保留故障触发',
    'AFE失联',
    'BMU通讯故障',
    '单体电压采集断线',
    '单体温度采集断线',
    '故障触发-故障汇总',
    '保留故障触发-故障汇总'
  ]
  driveFaults.forEach((name, idx) => config.push({ index: 150 + idx, name }))
  for (let i = 164; i <= 199; i++) config.push({ index: i, name: '预留' })

  const controlCommands = [
    '下设接触器执行策略',
    '下设接触器独立执行',
    '下设绝缘电阻检测指令',
    '设置系统运行模式',
    '掉线检测功能使能',
    '强制消除BCU故障',
    '控制参数复位',
    '设置清除事件记录数量',
    '复位事件记录存储器',
    '设置均衡状态',
    '接触器控制',
    '高低边控制',
    '其他IO控制',
    'BCU自适应地址',
    'BMU自适应地址',
    '控制制冷设备',
    '控制PCS设备',
    '控制除湿机设备',
    'BCU升级控制',
    'BMU升级控制',
    '强制OCV',
    'BCU复位控制',
    'SOH权重校准',
    'SOH强制校准',
    '上电SOH存储标志位复位',
    '复位可配置默认参数次数',
    '擦除可配置默认参数区',
    '下设可配置默认参数',
    '均衡'
  ]
  controlCommands.forEach((name, idx) => config.push({ index: 200 + idx, name }))
  for (let i = 229; i <= 299; i++) config.push({ index: i, name: '预留' })

  const paramConfig = [
    '系统基本参数下设',
    '单体校准参数下设',
    '报警参数下设',
    '实时保存数据下设',
    'sox算法配置参数下设',
    'sop配置参数下设',
    '出厂校正参数下设',
    '系统当前时间下设',
    '配置参数下设'
  ]
  paramConfig.forEach((name, idx) => config.push({ index: 300 + idx, name }))
  for (let i = 309; i <= 399; i++) config.push({ index: i, name: '预留' })

  // ------------- 参数定义映射（示例，需补全至所有 index） -------------
  const paramMapping = {
    1: {
      param1: { label: '过压值', parse: parseVoltage },
      param2: {
        label: '故障等级',
        parse: faultClearFlag
      },
      param3: { label: 'BMU/电池编号', parse: bmuCellIndex },
      param4: { label: '系统单体电池编号', parse: (raw) => raw }
    },
    2: {
      param1: { label: '低压值', parse: parseVoltage },
      param2: {
        label: '故障等级',
        parse: faultClearFlag
      },
      param3: { label: 'BMU/电池编号', parse: bmuCellIndex },
      param4: { label: '系统单体电池编号', parse: (raw) => raw }
    },
    // … 将 3~399 的映射全部定义在这里 …
    3: {
      param1: { label: '压差值', parse: parseVoltage },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '最大电压单体编码', parse: (raw) => raw },
      param4: { label: '最小电压单体编码', parse: (raw) => raw }
    },
    4: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: 'BMU/电池编号', parse: bmuCellIndex },
      param4: { label: '系统单体温度编号', parse: (raw) => raw }
    },
    5: {
      param1: { label: '低温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: 'BMU/电池编号', parse: bmuCellIndex },
      param4: { label: '系统单体温度编号', parse: (raw) => raw }
    },
    6: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: 'BMU/电池编号', parse: bmuCellIndex },
      param4: { label: '系统单体温度编号', parse: (raw) => raw }
    },
    7: {
      param1: { label: '低温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: 'BMU/电池编号', parse: bmuCellIndex },
      param4: { label: '系统单体温度编号', parse: (raw) => raw }
    },
    8: {
      param1: { label: '温差值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '最大温度单体编码', parse: (raw) => raw },
      param4: { label: '最小温度单体编码', parse: (raw) => raw }
    },
    9: {
      param1: { label: 'SOC高值', parse: (raw) => parseValue(raw, '%') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: 'BMU/电池编号', parse: bmuCellIndex },
      param4: { label: '系统单体电池编号', parse: (raw) => raw }
    },
    10: {
      param1: { label: 'SOC低值', parse: (raw) => parseValue(raw, '%') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: 'BMU/电池编号', parse: bmuCellIndex },
      param4: { label: '系统单体电池编号', parse: (raw) => raw }
    },
    11: {
      param1: { label: 'SOC差异值', parse: (raw) => parseValue(raw, '%') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '最大soc单体编码', parse: (raw) => raw },
      param4: { label: '最小soc单体编码', parse: (raw) => raw }
    },
    12: {
      param1: { label: '包过压值', parse: (raw) => parseValue(raw, 'V') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '包编码', parse: (raw) => raw },
      param4: { label: '/', parse: parseNull }
    },
    13: {
      param1: { label: '包低压值', parse: (raw) => parseValue(raw, 'V') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '包编码', parse: (raw) => raw },
      param4: { label: '/', parse: parseNull }
    },
    14: {
      param1: { label: '包压差值', parse: (raw) => parseValue(raw, 'V') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '最大电压包编码', parse: (raw) => raw },
      param4: { label: '最小电压包编码', parse: (raw) => raw }
    },
    15: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '包编码', parse: (raw) => raw },
      param4: {
        label: '/',
        parse: parseNull
      }
    },
    16: {
      param1: { label: '低温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '包编码', parse: (raw) => raw },
      param4: {
        label: '/',
        parse: parseNull
      }
    },
    17: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '包编码', parse: (raw) => raw },
      param4: {
        label: '/',
        parse: parseNull
      }
    },
    18: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '包编码', parse: (raw) => raw },
      param4: {
        label: '/',
        parse: parseNull
      }
    },
    19: {
      param1: { label: '总电压过压值', parse: (raw) => parseValue(raw, 'V') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: {
        label: '/',
        parse: parseNull
      },
      param4: {
        label: '/',
        parse: parseNull
      }
    },
    20: {
      param1: { label: '总电压低压值', parse: (raw) => parseValue(raw, 'V') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    21: {
      param1: { label: '过流值', parse: (raw) => parseValue(raw, 'A') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    22: {
      param1: { label: '过流值', parse: (raw) => parseValue(raw, 'A') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    23: {
      param1: { label: '绝缘值', parse: (raw) => raw },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    24: {
      param1: { label: '绝缘值', parse: (raw) => raw },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    25: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: {
        label: '信号名称',
        parse: (raw) => configFaultAction.didoTMap.rtDataZh[raw] || `未知(${raw})`
      },
      param4: { label: '/', parse: parseNull }
    },
    26: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: {
        label: '信号名称',
        parse: (raw) => configFaultAction.didoTMap.rtDataZh[raw] || `未知(${raw})`
      },
      param4: { label: '/', parse: parseNull }
    },
    27: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: {
        label: '信号名称',
        parse: (raw) => configFaultAction.didoTMap.rtDataZh[raw] || `未知(${raw})`
      },
      param4: { label: '/', parse: parseNull }
    },
    28: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: {
        label: '信号名称',
        parse: (raw) => configFaultAction.didoTMap.rtDataZh[raw] || `未知(${raw})`
      },
      param4: { label: '/', parse: parseNull }
    },
    29: {
      param1: { label: '过温值', parse: (raw) => parseValue(raw, '℃') },
      param2: { label: '故障等级', parse: faultClearFlag },
      param3: {
        label: '信号名称',
        parse: (raw) => configFaultAction.didoTMap.rtDataZh[raw] || `未知(${raw})`
      },
      param4: { label: '/', parse: parseNull }
    },
    100: {
      param1: { label: '/', parse: parseNull },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    101: {
      param1: { label: '上一次系统状态', parse: parseSysStatusNow },
      param2: { label: '当前系统状态', parse: parseSysStatusNow },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    102: {
      param1: { label: '上一次BMU数量', parse: (raw) => raw },
      param2: { label: '当前BMU数量', parse: (raw) => raw },
      param3: { label: '上一次AFE数量', parse: (raw) => raw },
      param4: { label: '当前AFE数量', parse: (raw) => raw }
    },
    103: {
      param1: { label: '上一次电池数量', parse: (raw) => raw },
      param2: { label: '当前电池数量', parse: (raw) => raw },
      param3: { label: '上一次温度数量', parse: (raw) => raw },
      param4: { label: '当前温度数量', parse: (raw) => raw }
    },
    104: {
      param1: { label: '上一次模式', parse: parseConfig_eventRecod },
      param2: { label: '当前模式', parse: parseConfig_eventRecod },
      param3: { label: '上一次内测模式', parse: parseConfig_internalTestModel },
      param4: { label: '当前内测模式', parse: parseConfig_internalTestModel }
    },
    105: {
      param1: {
        label: '异常复位原因',
        parse: (raw) =>
          raw === 1 ? '事件版本不一致复位' : raw === 2 ? '索引信息异常复位' : `未知(${raw})`
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    106: {
      param1: { label: '清除事件数量', parse: (raw) => raw },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    107: {
      param1: { label: '上一次均衡模式', parse: parseConfig_Balance },
      param2: { label: '当前均衡模式', parse: parseConfig_Balance },
      param3: { label: '上一次运维模式', parse: parseConfig_OperModel },
      param4: { label: '当前运维模式', parse: parseConfig_OperModel }
    },
    108: {
      param1: { label: '上一次PCS设备类型', parse: parseConfig_PCSModel },
      param2: { label: '当前PCS设备类型', parse: parseConfig_PCSModel },
      param3: { label: '上一次制冷设备类型', parse: parseConfig_CoolModel },
      param4: { label: '当前制冷设备类型', parse: parseConfig_CoolModel }
    },
    109: {
      param1: { label: '上一次电流传感器类型', parse: parseConfig_CurrentSenser },
      param2: { label: '当前电流传感器类型', parse: parseConfig_CurrentSenser },
      param3: { label: '上一次除湿机设备类型', parse: parseConfig_LiqModel },
      param4: { label: '当前除湿机设备类型', parse: parseConfig_LiqModel }
    },
    110: {
      param1: { label: '/', parse: parseNull },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    111: {
      param1: { label: '上一次消防设备类型', parse: parseConfig_Fire },
      param2: { label: '当前消防设备类型', parse: parseConfig_Fire },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    112: {
      param1: { label: '上一次OCV次数', parse: (raw) => raw },
      param2: { label: '当前OCV次数', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    150: {
      param1: {
        label: '故障原因',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            [
              'DO1 高边驱动反馈故障',
              'DO2 高边驱动反馈故障',
              'DO3 高边驱动反馈故障',
              'DO4 高边驱动反馈故障',
              'DO5 高边驱动反馈故障',
              'DO6 高边驱动反馈故障',
              'DO7 高边驱动反馈故障',
              'DO8 高边驱动反馈故障'
            ],
            8
          )
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    151: {
      param1: {
        label: '故障原因',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            [
              '主正接触器反馈故障',
              '主负接触器反馈故障',
              '预充接触器反馈故障',
              '断路器反馈故障',
              'BMU DO/DI检测故障',
              '主正接触器故障',
              '主负接触器故障',
              '预充接触器故障',
              '主正接触器氧化',
              '主正接触器黏连',
              '主负接触器氧化',
              '主负接触器黏连',
              '预充接触器氧化',
              '预充接触器黏连',
              '接触器总故障位',
              '预留'
            ],
            16
          )
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    152: {
      param1: {
        label: '故障原因',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            [
              '主断分励脱扣高边驱动反馈故障',
              '直流供电KM控制高边驱动反馈故障',
              '门禁反馈故障',
              '急停反馈故障',
              'SPD反馈故障',
              '交流电压反馈故障',
              '烟感反馈故障',
              '消防释放信号故障',
              'MSD信号故障',
              '霍尔故障'
            ],
            10
          )
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    153: {
      param1: {
        label: '故障原因',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            [
              '无效数据故障位',
              '制冷设备通讯异常',
              'PCS通讯故障',
              '菊花链断连',
              '铁电存储器故障',
              'EEPROM存储器故障',
              'FLASH存储器故障',
              'BCU温感1故障',
              'BCU温感2故障',
              'BCU温感3故障',
              'BCU温感4故障',
              'BCU温感5故障',
              'BMU参数配置错误',
              'BCU参数配置错误',
              '除湿机通讯故障',
              '消防设备通讯故障'
            ],
            16
          )
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    154: {
      param1: {
        label: 'BMU1-16参数配置错误',
        parse: (raw) => parseBitsString(raw, 16)
      },
      param2: {
        label: 'BMU17-32参数配置错误',
        parse: (raw) => parseBitsString(raw, 16)
      },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    155: {
      param1: {
        label: '故障原因',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,

            [
              'CAN1通讯状态异常',
              'CAN2通讯状态异常',
              'CAN3通讯状态异常',
              '预留',
              'RS485-1通讯状态异常',
              'RS485-2通讯状态异常',
              'RS485-3通讯状态异常',
              '预留',
              'Ethernet1通讯状态异常',
              '主正接触器状态异常',
              '主负接触器状态异常'
            ],
            11
          )
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    156: {
      param1: {
        label: '故障原因',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            ['存在常规严重故障位', '存在硬件故障总故障位', '存在保留故障总故障位'],
            3
          )
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    157: {
      param1: {
        label: '故障原因',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            [
              '保留充电过流严重告警',
              '保留放电过流严重告警',
              '保留绝缘电阻严重告警',
              '保留接触器黏连氧化',
              '保留PCS通讯故障'
            ],
            5
          )
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    158: {
      param1: { label: 'BMU位置', parse: (raw) => raw },
      param2: {
        label: '失联AFE',
        parse: (raw) =>
          parseAFEBMUStatus(
            raw,
            Array.from({ length: 16 }, (_, i) => `AFE${i + 1}`)
          )
      },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    159: {
      param1: { label: 'BMU失联数量', parse: (raw) => raw },
      param2: {
        label: '失联BMU',
        parse: (raw) =>
          parseAFEBMUStatus(
            raw,
            Array.from({ length: 16 }, (_, i) => `BMU${i + 1}`)
          )
      },
      param3: {
        label: '失联BMU',
        parse: (raw) =>
          parseAFEBMUStatus(
            raw,
            Array.from({ length: 16 }, (_, i) => `BMU${i + 16}`)
          )
      },
      param4: { label: '/', parse: parseNull }
    },
    160: {
      param1: {
        label: '电压断线所在BMU(1-16)',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            Array.from({ length: 16 }, (_, i) => `BMU${i + 1}`),
            16
          )
      },
      param2: {
        label: '电压断线所在BMU(17-32)',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            Array.from({ length: 16 }, (_, i) => `BMU${i + 16}`),
            16
          )
      },
      param3: { label: '电压断线数量', parse: (raw) => raw },
      param4: { label: '/', parse: parseNull }
    },
    161: {
      param1: {
        label: '温度断线所在BMU(1-16)',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            Array.from({ length: 16 }, (_, i) => `BMU${i + 1}`),
            16
          )
      },
      param2: {
        label: '温度断线所在BMU(17-32)',
        parse: (raw) =>
          parseRegisterForEvent(
            raw,
            Array.from({ length: 16 }, (_, i) => `BMU${i + 16}`),
            16
          )
      },
      param3: { label: '温度断线数量', parse: (raw) => raw },
      param4: { label: '/', parse: parseNull }
    },
    162: {
      param1: { label: '故障类型', parse: (raw) => configFaultAction.faultsMapZh[raw] },
      param2: {
        label: '故障动作',
        parse: (raw) => (raw === 0 ? '复归' : raw === 1 ? '触发' : `无效值${raw}`)
      },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    163: {
      param1: { label: '故障类型', parse: (raw) => configFaultAction.faultsMapZh[raw] },
      param2: {
        label: '故障动作',
        parse: (raw) => (raw === 0 ? '复归' : raw === 1 ? '触发' : `无效值${raw}`)
      },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    200: {
      param1: { label: '接触器动作', parse: parseContactorAction },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    201: {
      param1: { label: '动作', parse: parseContactorControl },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    202: {
      param1: {
        label: '动作',
        parse: (raw) =>
          raw == 23477 ? '启动绝缘电阻检测' : raw == 4641 ? '关闭绝缘电阻检测' : `未知(${raw})`
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    203: {
      param1: {
        label: '设置模式',
        parse: (raw) => (raw == 23477 ? '测试模式' : raw == 4641 ? '正常模式' : `未知(${raw})`)
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    204: {
      param1: {
        label: '动作',
        parse: (raw) => (raw == 23477 ? '开启' : raw == 4641 ? '关闭' : `未知(${raw})`)
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    205: {
      param1: { label: '清除动作', parse: parseFaultClearAction },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    206: {
      param1: {
        label: '复位动作',
        parse: (raw) => parseResetActions(raw)
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    207: {
      param1: {
        label: '删除动作',
        parse: (raw) => (raw == 0 ? '不删除' : raw == 65535 ? '删除全部' : raw)
      },
      param2: { label: '实际删除数量', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    208: {
      param1: { label: '复位动作', parse: (raw) => (raw == 23477 ? '复位' : '不执行') },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    209: {
      param1: { label: 'BMU编号', parse: (raw) => raw },
      param2: { label: '均衡状态', parse: (raw) => (raw == 1 ? '开启均衡' : '关闭均衡') },
      param3: { label: '均衡时间', parse: (raw) => raw + 's' },
      param4: {
        label: '均衡类型',
        parse: (raw) => (raw == 0 ? '充电' : raw == 1 ? '放电' : '无效')
      }
    },
    210: {
      param1: { label: '控制动作', parse: parseControlActions },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    211: {
      param1: { label: '控制项', parse: parseHLSideActions },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    212: {
      param1: { label: '控制项', parse: parseDIDOActions },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    213: {
      param1: {
        label: '动作',
        parse: (raw) => (raw == 0 ? '开始自适应地址' : raw == 1 ? '结束自适应地址' : '无效')
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    214: {
      param1: {
        label: '动作',
        parse: (raw) => (raw == 0 ? '开始自适应地址' : raw == 1 ? '结束自适应地址' : '无效')
      },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    215: {
      param1: { label: '/', parse: parseNull },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    216: {
      param1: { label: '/', parse: parseNull },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    217: {
      param1: { label: '/', parse: parseNull },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    218: {
      param1: { label: '/', parse: parseNull },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    219: {
      param1: { label: '/', parse: parseNull },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    220: {
      param1: { label: '/', parse: (raw) => (raw == 23477 ? '执行' : '不执行') },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    221: {
      param1: { label: '/', parse: parseNull },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    222: {
      param1: { label: '/', parse: (raw) => (raw == 23477 ? '执行' : '不执行') },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    223: {
      param1: { label: '/', parse: (raw) => (raw == 23477 ? '执行' : '不执行') },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    224: {
      param1: { label: '/', parse: (raw) => (raw == 23477 ? '执行' : '不执行') },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    225: {
      param1: { label: '密码', parse: (raw) => raw },
      param2: { label: '/', parse: (raw) => (raw == 23477 ? '密码验证成功' : '密码验证失败') },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    226: {
      param1: { label: '密码', parse: (raw) => raw },
      param2: { label: '/', parse: (raw) => (raw == 23477 ? '密码验证成功' : '密码验证失败') },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    227: {
      param1: { label: '/', parse: parseNull },
      param2: { label: '/', parse: parseNull },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    228: {
      param1: {
        label: '均衡动作',
        parse: (raw) => {
          switch (raw) {
            case 0:
              return '被动均衡开启'
            case 1:
              return '被动均衡关闭'
            case 2:
              return '强制均衡开启'
            case 3:
              return '强制均衡结束'
          }
        }
      },
      param2: {
        label: '均衡电芯位置',
        parse: (raw, param1Raw) => {
          if (param1Raw === 0 || param1Raw === 2) {
            // 获取高字节和低字节
            const afePosition = (raw >> 8) & 0xff // 高字节，均衡开启 AFE 位置
            const cellPosition = raw & 0xff // 低字节，均衡开启电芯位置
            return `AFE位置: ${afePosition}, 电芯位置: ${cellPosition}`
          }
          return '/'
        }
      },
      param3: {
        label: '均衡电芯数量',
        parse: (raw, param1Raw) => {
          if (param1Raw === 0 || param1Raw === 2) {
            return raw
          }
          return '/'
        }
      },
      param4: {
        label: '均衡触发途径',
        parse: (raw) => {
          switch (raw) {
            case 0:
              return '上位机触发'
            case 1:
              return 'BCU策略'
            case 2:
              return 'BMU执行'
          }
        }
      }
    },
    300: {
      param1: { label: '起始地址', parse: parseHex },
      param2: { label: '寄存器长度', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    301: {
      param1: { label: '起始地址', parse: parseHex },
      param2: { label: '寄存器长度', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    302: {
      param1: { label: '起始地址', parse: parseHex },
      param2: { label: '寄存器长度', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    303: {
      param1: { label: '起始地址', parse: parseHex },
      param2: { label: '寄存器长度', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    304: {
      param1: { label: '起始地址', parse: parseHex },
      param2: { label: '寄存器长度', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    305: {
      param1: { label: '起始地址', parse: parseHex },
      param2: { label: '寄存器长度', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    306: {
      param1: { label: '起始地址', parse: parseHex },
      param2: { label: '寄存器长度', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    307: {
      param1: { label: '起始地址', parse: parseHex },
      param2: { label: '寄存器长度', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    },
    308: {
      param1: { label: '起始地址', parse: parseHex },
      param2: { label: '寄存器长度', parse: (raw) => raw },
      param3: { label: '/', parse: parseNull },
      param4: { label: '/', parse: parseNull }
    }
  }
  // 从 params 中拆解原始值
  const [evtIdx, raw1, raw2, raw3, raw4] = params
  // 查表并构建返回对象
  const eventTemplate = config.find((e) => e.index === evtIdx)
  if (!eventTemplate) return null
  const map = paramMapping[evtIdx] || {}
  // 赋值函数
  function buildParam(key, raw, raw1) {
    if (map[key]) {
      return { label: map[key].label, value: map[key].parse(raw, raw1) }
    }
    return { label: '/', value: '' }
  }
  // 返回包含解析值的新对象（不改原 config）
  return {
    ...eventTemplate,
    param1: buildParam('param1', raw1),
    param2: buildParam('param2', raw2, raw1),
    param3: buildParam('param3', raw3, raw1),
    param4: buildParam('param4', raw4)
  }
}
export {
  eventState,
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
}
