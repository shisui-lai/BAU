;('use strict')
import { configFaultAction } from './configFaultMap'
// 通用延迟函数（单位：毫秒）
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function isTimeoutError(err) {
  return err && typeof err.message === 'string' && /(timeout|timed out)/i.test(err.message)
}
//==============================寄存器数据处理函数================================
const processParams_Res10_signed = (params, param1, param2) => {
  return params.slice(param1, param2).map((item) => {
    if (item > 32767) {
      item -= 65536
    }
    return (item / 10).toFixed(1)
  })
}
const processParams_Res10 = (params, param1, param2) => {
  return params.slice(param1, param2).map((item) => {
    const value = item > 0x7fff ? -(0x10000 - item) : item
    return (value / 10).toFixed(1)
  })
}
const processParams_Res10_Even = (params, param1, param2) => {
  return params.slice(param1, param2).map((item, index) => {
    if (index % 2 === 0) {
      if (item > 32767) {
        item -= 65536
      }
      return (item / 10).toFixed(1)
    } else {
      return item
    }
  })
}

function convertToAscii_ClusterSummNew(registers, versionFlag) {
  if (!Array.isArray(registers)) {
    registers = registers !== undefined ? [registers] : []
  }
  let result = []

  // 遍历每个寄存器的十进制数
  registers.forEach((reg) => {
    if (reg === 0) {
      result.push('0') // 用 0 替换
      return
    }
    // 🔥 新增：确保处理的是16位数字
    if (typeof reg !== 'number' || reg < 0 || reg > 0xffff) {
      //console.error('无效寄存器值:', reg)
      return
    }
    // 将十进制数转换为16位二进制
    let binaryStr = reg.toString(2).padStart(16, '0') // 转为16位二进制

    // 提取高字节和低字节
    let highByte = binaryStr.slice(0, 8) // 高字节
    let lowByte = binaryStr.slice(8, 16) // 低字节

    // 交换高字节和低字节
    let swappedBinaryStr
    if (versionFlag) {
      swappedBinaryStr = highByte + lowByte
    } else swappedBinaryStr = lowByte + highByte
    // 转换为对应的ASCII字符
    const firstCharCode = parseInt(swappedBinaryStr.slice(0, 8), 2)
    const secondCharCode = parseInt(swappedBinaryStr.slice(8, 16), 2) // 检查字符是否有效，如果不是有效的 ASCII 字符，替换为 '0'
    result.push(
      isValidAscii(firstCharCode) ? String.fromCharCode(firstCharCode) : ' ',
      isValidAscii(secondCharCode) ? String.fromCharCode(secondCharCode) : ' '
    )
  })

  // 返回组合后的字符串
  return result.join('')
  function isValidAscii(code) {
    return code >= 32 && code <= 126
  }
}

// 专门用于解析BMU产品编码为14个字节显示的函数
function convertBMUProductCodeToBytes(registers) {
  if (!Array.isArray(registers)) {
    registers = registers !== undefined ? [registers] : []
  }

  let hexValues = []

  // 遍历每个寄存器的十进制数
  registers.forEach((reg, index) => {
    if (reg === 0) {
      hexValues.push('0000')
      return
    }

    // 确保处理的是16位数字
    if (typeof reg !== 'number' || reg < 0 || reg > 0xffff) {
      hexValues.push('0000')
      return
    }

    // 直接将十进制数转换为4位十六进制
    const hexStr = reg.toString(16).padStart(4, '0').toUpperCase()
    hexValues.push(hexStr)
  })

  // 第一个寄存器前加上0x，后续寄存器直接跟在后面
  if (hexValues.length > 0) {
    return '0x' + hexValues.join('')
  }

  return '0x0000000000000000000000000000'
}

function regNumComb_Config(reg1Value, reg2Value) {
  const combinedValue = ((reg2Value << 16) | reg1Value) >>> 0
  return combinedValue
}

function transToUnsigned(inputValue, type = 'unsigned', res = 0.1, scale = 1) {
  const invalidMark = '-'
  // 参数有效性验证
  if (
    typeof inputValue !== 'number' ||
    !Number.isInteger(inputValue) ||
    inputValue < 0x0000 ||
    inputValue > 0xffff
  ) {
    return invalidMark
  }

  // 无符号数据处理 (0x0000 ~ 0xFFFF)
  if (type === 'unsigned') {
    return inputValue === 0x7fff ? invalidMark : (inputValue * res).toFixed(scale)
  }

  // 有符号数据处理 (-32768 ~ 32767)
  if (type === 'signed') {
    // 特殊无效值标记
    if (inputValue === 0x7ffe || inputValue === 0x7fff) return invalidMark

    // 二进制补码转换（处理超过32767的正数转负数）
    const signedValue =
      inputValue > 0x7fff
        ? (inputValue - 0x10000) * res // 转换为负数
        : inputValue * res

    return signedValue.toFixed(scale)
  }

  return invalidMark
}

/////////////////////////CellData处理函数/////////////////////
function convertArrayWithMinMax_CellV(data, afeConfig, type = 'voltage') {
  const configMap = {
    voltage: { field: 'vltgPerAFE', prefix: 'v', resolution: 0.001, signed: false },
    temp: { field: 'tempPerAFE', prefix: 't', resolution: 0.1, signed: true },
    soc: { field: 'vltgPerAFE', prefix: 'soc', resolution: 0.1, signed: false },
    soh: { field: 'vltgPerAFE', prefix: 'soh', resolution: 0.1, signed: false }
  }
  const { field, resolution, signed } = configMap[type] || configMap.voltage

  let globalCounter = 0
  const afeGroups = []
  let totalVoltage = 0

  // 先累积所有有效单体到 flatList，用于分配索引
  const flatList = []
  afeConfig.forEach((afe, packIdx) => {
    for (let i = 0; i < (afe[field] || 0); i++) {
      flatList.push({ packIdx, afeIdx: afe.afeID - 1, localIdx: i })
    }
  })

  // 转换并附带 index
  afeConfig.forEach((afe, packIdx) => {
    const cells = []
    for (let i = 0; i < (afe[field] || 0); i++) {
      const raw = data[globalCounter] ?? 0
      let displayValue = '---'
      let numericValue = NaN
      // ② 先判断是否为"无效值"标志
      if (raw !== 32766 && raw !== 32767) {
        // 如果不是无效码，才做 signed/unsigned 转换
        const num = signed ? (raw << 16) >> 16 : raw
        // ③ 生成最终要显示的小数字符串（保留位数取决于 resolution）
        displayValue = (num * resolution).toFixed(resolution < 0.1 ? 3 : 1)
        // ④ 保留一个数值型变量，用于累加
        numericValue = parseFloat(displayValue)
      }
      // ⑤ 只有当 numericValue 不是 NaN 时，才把它累加到 totalVoltage
      if (!isNaN(numericValue)) {
        totalVoltage += numericValue
      }
      // 找到在 flatList 中的全局位置
      const pos = flatList.findIndex(
        (o) => o.packIdx === packIdx && o.afeIdx === afe.afeID - 1 && o.localIdx === i
      )
      const index = pos >= 0 ? String(pos + 1).padStart(3, '0') : ''

      cells.push({ value: displayValue, index })
      globalCounter++
    }
    afeGroups.push({ packID: packIdx + 1, afeID: afe.afeID, afeIdx: packIdx, cells })
  })

  return { afeGroups, totalVoltage: Number(totalVoltage.toFixed(1)) }
}
/////////////////////////PackData处理函数/////////////////////
function transReslCluExtrem(arr) {
  /*   console.log('transReslCluExtrem处理前arr：', arr) */
  const indices = [...Array.from({ length: 47 }, (_, i) => 16 + i * 2)].concat([
    29, 61, 77, 93, 109
  ])

  // 第一轮遍历：处理非indices元素的无效值
  arr.forEach((value, index) => {
    if (!indices.includes(index) && value === 32767) {
      arr[index] = '--'
    }
  })

  // 第二轮遍历：处理indices元素的转换逻辑
  indices.forEach((index) => {
    const value = arr[index]

    // 有符号转换：处理16位有符号数
    const signedValue =
      value > 32767 ? value - 65536 : value === 32767 || value === 32766 ? '-' : value
    arr[index] = signedValue
  })

  /*  console.log('处理后arr：', arr) */
  return arr
}

function getData_PackSummNew(params, bmuCount) {
  // 生成动态BMU数据
  const generateBMUElements = (startIndex, entriesPerBMU, labelFormatter) => {
    const elements = []

    for (let i = 1; i <= bmuCount; i++) {
      for (let j = 0; j < entriesPerBMU; j++) {
        const paramIndex = startIndex + (i - 1) * entriesPerBMU + j
        const rawValue = params[paramIndex]

        const convertedValue = transToUnsigned(rawValue, 'signed', 0.1)

        elements.push({
          id: (i - 1) * entriesPerBMU + j + 1,
          label: labelFormatter(i, j),
          value: convertedValue
        })
      }
    }
    return elements
  }
  /*   console.log('接收到的数据：', params) */
  return [
    {
      classification: 'BMUVoltage',
      element: Array.from({ length: bmuCount }, (_, i) => ({
        id: i + 1,
        label: `BMU${i + 1}(V)`,
        value: transToUnsigned(params[i], 'unsigned', 0.1)
      }))
    },
    {
      classification: 'BMUTemp',
      element: Array.from({ length: bmuCount }, (_, i) => ({
        id: i + 1,
        label: `BMU${i + 1}(℃)`,
        value: transToUnsigned(params[bmuCount + i], 'signed', 0.1)
      }))
    },
    {
      classification: 'ImpetusTemp',
      element: generateBMUElements(
        2 * bmuCount, // startIndex
        2, // entriesPerBMU
        (bmuNum, entry) => `BMU${bmuNum}-${entry + 1}(℃)`
      ).map((item, index) => ({
        ...item,
        index: index + 1 // 添加全局索引号，从1开始
      }))
    },
    {
      classification: 'BMUSOC',
      element: Array.from({ length: bmuCount }, (_, i) => ({
        id: i + 1,
        label: `BMU${i + 1}(%)`,
        value: transToUnsigned(params[4 * bmuCount + i], 'unsigned', 0.1)
      }))
    }
  ]
}
// 处理函数
const processExtremValueArray = (valueArray) => {
  /*   console.log('processExtremValueArray接收：', valueArray) */
  // 一共7组，每组14个数据
  return Array.from({ length: 7 }, (_, groupIndex) => {
    const start = groupIndex * 14
    // 根据不同组、不同索引进行数据转换
    const group = valueArray.slice(start, start + 14).map((value, indexInGroup) => {
      if ([0, 2, 4, 6, 8, 10, 12, 13].includes(indexInGroup)) {
        // 第一组使用 0.001，保留三位小数，其它组使用 0.1，保留一位小数
        return groupIndex === 0
          ? Number((value * 0.001).toFixed(3))
          : Number((value * 0.1).toFixed(1))
      } else {
        return value
      }
    })

    const paired = Array.from({ length: 6 }, (_, pairIndex) => {
      const base = pairIndex * 2
      return `${group[base]} #${group[base + 1]}`
    })

    // 生成每组8个元素，其中最后两个为第13和第14个数据
    const groupResult = [...paired, group[12], group[13]]
    return groupResult
  }).flat()
}

// 在getData_ClusExtreme中使用
function getData_ClusExtreme(params, withPrefix = false) {
  /*  console.log(params) */
  let SummData = []
  let classificationArray = [
    '单体电压极值',
    '单体温度极值',
    'BMU电压极值',
    'BMU温度极值',
    '单体SOC极值',
    '单体SOH极值',
    '动力接插件温度极值'
  ]
  const baseLabels = [
    '最大值1',
    '最大值2',
    '最大值3',
    '最小值1',
    '最小值2',
    '最小值3',
    '平均值',
    '极差值'
  ]
  const unitArray = ['(V)', '(℃)', '(V)', '(℃)', '(%)', '(%)', '(℃)']
  let valueArray = [
    ...params.slice(0, 14),
    ...params.slice(16, 30),
    ...params.slice(32, 46),
    ...params.slice(48, 62),
    ...params.slice(64, 78),
    ...params.slice(80, 94),
    ...params.slice(96, 110)
  ]
  const processedValueArray = processExtremValueArray(valueArray)
  classificationArray.forEach((classification, i) => {
    let localId = 1
    const prefix = withPrefix ? classification.replace(/极值$/, '') : ''
    const unit = withPrefix ? unitArray[i] : ''
    const item = { classification, element: [] }
    const start = i * baseLabels.length
    baseLabels.forEach((label, idx) => {
      const fullLabel = withPrefix ? `${prefix}${label}${unit}` : label
      const raw = processedValueArray[start + idx]
      const el = { label: fullLabel, id: localId++ }
      if (withPrefix && typeof raw === 'string') {
        const [valPart, idxPart] = raw.split('#')
        el.value = Number.isNaN(Number(valPart)) ? valPart : Number(valPart)
        el.index = Number(idxPart)
      } else {
        el.value = raw
      }
      item.element.push(el)
    })
    SummData.push(item)
  })
  return SummData
}

function parseFault_CanHallFault(params46) {
  // 将十进制值转为二进制字符串，确保是 8 位
  const binaryString = params46.toString(2).padStart(16, '0')

  // 获取 Bit0 (故障指示)
  const faultIndicator = binaryString[0] === '1'
  // 如果 Bit0 是 0，则表示无故障，直接返回 "无故障"
  if (!faultIndicator) {
    return '无故障' // 返回 "无故障" 信息
  }
  // 获取 Bit1 到 Bit7 对应的故障信息
  const faultInfoBits = binaryString.slice(1, 10) // Bit1 - Bit7
  const faultInfo = []

  const faultMapping = [
    { bit: 1, message: '存储错误-0x40' },
    { bit: 2, message: '过流检测' },
    { bit: 3, message: '通量间的振荡时间未超过20ms' },
    { bit: 4, message: '时钟源' },
    { bit: 5, message: '电源电压超过范围' },
    { bit: 6, message: '硬件默认ADC通道' },
    { bit: 7, message: '新数据不可用' },
    { bit: 8, message: '硬件默认DAC阈值' },
    { bit: 9, message: '硬件默认参考电压' }
  ]

  // 遍历 Bit1 到 Bit7，检查对应的位是否为 1
  faultMapping.forEach((fault, index) => {
    if (faultInfoBits[index] === '1') {
      faultInfo.push(fault.message)
    }
  })

  return faultInfo.join(',') // 故障信息列表
}

function parseSysStatus(raw) {
  if (raw === 0) return '系统正常'
  else return '系统重启'
}

function parseSysStatusWithStates(raw) {
  // 定义所有可能的系统状态
  const allSysStates = [
    { value: 0, label: '系统正常', key: 'normal', isActive: raw === 0, displayLabel: '系统正常' },
    { value: 1, label: '系统重启', key: 'restart', isActive: raw === 1, displayLabel: '系统重启' }
  ]

  const activeStates = allSysStates.filter((state) => state.isActive)

  return {
    allStates: allSysStates,
    activeStates: activeStates,
    displayValue:
      activeStates.length > 0 ? activeStates.map((s) => s.displayLabel).join(';') : '无状态'
  }
}
function parseDisableEnableCluster(raw) {
  // 定义所有可能的系统状态
  const allSysStates = [
    { value: 4641, label: '启用', key: 'enable', isActive: raw === 4641, displayLabel: '启用' },
    { value: 23477, label: '禁止', key: 'disable', isActive: raw === 23477, displayLabel: '禁止' }
  ]

  const activeStates = allSysStates.filter((state) => state.isActive)

  return {
    allStates: allSysStates,
    activeStates: activeStates,
    displayValue:
      activeStates.length > 0 ? activeStates.map((s) => s.displayLabel).join(';') : '无状态'
  }
}
function parseSysStatusNow(params3) {
  switch (params3) {
    case 0:
      return '静置'
    case 1:
      return '充电'
    case 2:
      return '放电'
    case 3:
      return '开路'
    case 4:
      return '接触器自检'
    default:
      return `未知${params3}` // 添加默认值处理
  }
}
function parseSysStatusPCS(param) {
  switch (param) {
    case 0:
      return '初始化'
    case 1:
      return '待机'
    case 2:
      return '充电'
    case 3:
      return '放电'
    default:
      return `未知${param}` // 添加默认值处理
  }
}
function parseSysStatusPCSSYL(param) {
  switch (param) {
    case 0:
      return '初始化'
    case 1:
      return '停机'
    case 2:
      return '待机'
    case 3:
      return '充电'
    case 4:
      return '放电'
    case 5:
      return '故障'
    default:
      return `未知${param}` // 添加默认值处理
  }
}
function paraseAllowChrgPCS(param, status) {
  switch (param) {
    case 0:
      return status === 'charge' ? '允许充电' : '允许放电'
    case 1:
      return status === 'charge' ? '禁止充电' : '禁止放电'
    default:
      return `未知${param}` // 添加默认值处理
  }
}
function paraseHighVoltStsPCS(param, status) {
  switch (param) {
    case 0:
      return status === 'star' ? '断开' : '闭合'
    case 1:
      return status === 'star' ? '闭合' : '断开'
    default:
      return `未知${param}` // 添加默认值处理
  }
}
function paraseAlarmPCSSYL(param, status) {
  switch (param) {
    case 0:
      return status === 'alarm' ? '无告警' : '正常'
    case 1:
      return (status === 'alarm' ? '有一级或二级报警' : '有三级报警')
    default:
      return `未知${param}` // 添加默认值处理
  }
}
function parseSysAlarmLevel(param) {
  switch (param) {
    case 0:
      return '无故障'
    case 1:
      return '严重'
    case 2:
      return '一般'
    case 3:
      return '轻微'
  }
}
function parsePCSAlarmLevel(param) {
  switch (param) {
    case 0:
      return '正常'
    case 1:
      return '轻微'
    case 2:
      return '中度'
    case 3:
      return '严重'
  }
}
const generateBMUVersionElements = (params, bmuCount) => {
  const elements = []
  for (let i = 1; i <= bmuCount; i++) {
    const baseIndex = 125 + (i - 1) * 2
    elements.push(
      {
        id: elements.length + 1,
        label: `BMU-${i}-软件版本号`,
        value: params[baseIndex]?.toString(16) || '-'
      },
      {
        id: elements.length + 1,
        label: `BMU-${i}-BOOT版本号`,
        value: convertToAscii_ClusterSummNew(params[baseIndex + 1], 1)
      }
    )
  }
  return elements
}
function getData_ClusterSummNew(params, bmuCount, withUnit) {
  // 生成BMU版本信息
  const baseData = [
    {
      classification: '簇端数据1',
      element: [
        (() => {
          const register1 = params[15]
          const register2 = params[16]
          const rawValue = (register2 << 16) | register1
          // 解析所有状态位
          const statesData = parseSystemTotalFaultBitsWithStates(register1, register2)

          return {
            id: 208,
            label: '系统总状态位',
            value: parseSystemTotalFaultBits(register1, register2),
            rawValue: rawValue,
            register1: register1,
            register2: register2,
            statesData: statesData
          }
        })(),
        (() => {
          const rawValue = params[51]
          const statesData = parseSysStatusWithStates(rawValue)

          return {
            id: 998,
            label: '系统状态',
            value: parseSysStatus(rawValue),
            rawValue: rawValue,
            statesData: statesData
          }
        })(),
        (() => {
          const rawValue = params[125 + bmuCount * 2 + bmuCount * 7]
          const statesData = parseDisableEnableCluster(rawValue)

          return {
            id: 1000,
            label: '簇模式',
            value: parseConfig_DisableEnableCluster(rawValue),
            rawValue: rawValue,
            statesData: statesData
          }
        })(),
        { id: 1, label: '当前状态', value: parseSysStatusNow(params[3]) },
        { id: 2, label: '模拟量故障总等级', value: parseSysAlarmLevel(params[4]) },
        { id: 3, label: '簇电压', value: (params[5] / 10).toFixed(1), unit: 'V' },
        {
          id: 5,
          label: '簇电流',
          value: transToUnsigned(params[7], 'signed', 0.1),
          unit: 'A'
        },
        {
          id: 6,
          label: '簇SOC',
          value: transToUnsigned(params[19], 'unsigned', 0.1),
          unit: '%'
        },
        { id: 4, label: '预充电压', value: (params[6] / 10).toFixed(1), unit: 'V' },
        { id: 7, label: '绝缘电阻R+', value: params[8].toString(), unit: 'kΩ' },
        { id: 8, label: '绝缘电阻R-', value: params[9].toString(), unit: 'kΩ' },
        {
          id: 9,
          label: '温度1',
          value: transToUnsigned(params[10], 'signed', 0.1),
          unit: '℃'
        },
        {
          id: 10,
          label: '温度2',
          value: transToUnsigned(params[11], 'signed', 0.1),
          unit: '℃'
        },
        {
          id: 11,
          label: '温度3',
          value: transToUnsigned(params[12], 'signed', 0.1),
          unit: '℃'
        },
        {
          id: 12,
          label: '温度4',
          value: transToUnsigned(params[13], 'signed', 0.1),
          unit: '℃'
        },
        {
          id: 13,
          label: '温度5',
          value: transToUnsigned(params[14], 'signed', 0.1),
          unit: '℃'
        },
        { id: 14, label: 'BMU总数量', value: bmuCount },
        { id: 15, label: 'AFE总数量', value: params[0] },
        { id: 16, label: '电池总数量', value: params[1] },
        { id: 17, label: '温度总数量', value: params[2] }
      ]
    },
    {
      classification: '簇端数据2',
      element: [
        {
          id: 22,
          label: '最大允充',
          value: (regNumComb_Config(params[30], params[31]) / 10).toFixed(1),
          unit: 'kW'
        },
        {
          id: 23,
          label: '最大允放',
          value: (regNumComb_Config(params[32], params[33]) / 10).toFixed(1),
          unit: 'kW'
        },
        {
          id: 18,
          label: '簇SOH',
          value: transToUnsigned(params[20], 'unsigned', 0.1),
          unit: '%'
        },
        {
          id: 19,
          label: '簇SOE',
          value: transToUnsigned(params[21], 'unsigned', 0.1),
          unit: '%'
        },
        {
          id: 205,
          label: '充电SOP有效校验标识',
          label1: 'chargSOPVerif',
          label2: '',
          value: params[22]
        },
        {
          id: 20,
          label: '充电SOP',
          label1: 'chargSOP',
          value: transToUnsigned(params[23], 'unsigned', 0.1),
          unit: '%'
        },
        {
          id: 200,
          label: '充电SOP-MAP表坐标列',
          label1: 'chargSOPMapColumn',
          label2: '',
          value: params[24]
        },
        {
          id: 201,
          label: '充电SOP-MAP表坐标行',
          label1: 'chargSOPMapRow',
          label2: '',
          value: params[25]
        },
        {
          id: 202,
          label: '放电SOP有效校验标识',
          label1: 'dischargSOPVerif',
          label2: '',
          value: params[26]
        },
        {
          id: 21,
          label: '放电SOP',
          label1: 'dischargSOP',
          value: transToUnsigned(params[27], 'unsigned', 0.1),
          unit: '%'
        },
        {
          id: 203,
          label: '放电SOP-MAP表坐标列',
          label1: 'dischargSOPMapColumn',
          label2: '',
          value: params[28]
        },
        {
          id: 204,
          label: '放电SOP-MAP表坐标行',
          label2: '',
          label1: 'dischargSOPMapRow',
          value: params[29]
        },
        {
          id: 24,
          label: '单次充电电量',
          value: (regNumComb_Config(params[34], params[35]) / 100).toFixed(2),
          unit: 'kWh'
        },
        {
          id: 25,
          label: '单次放电电量',
          value: (regNumComb_Config(params[36], params[37]) / 100).toFixed(2),
          unit: 'kWh'
        },
        {
          id: 26,
          label: '单次充电容量',
          value: (regNumComb_Config(params[38], params[39]) / 100).toFixed(2),
          unit: 'Ah'
        },
        {
          id: 27,
          label: '单次放电容量',
          value: (regNumComb_Config(params[40], params[41]) / 100).toFixed(2),
          unit: 'Ah'
        },
        {
          id: 206,
          label: '簇真实SOC',
          value: transToUnsigned(params[42], 'unsigned', 0.1),
          unit: '%'
        },
        {
          id: 207,
          label: 'OCV执行次数',
          value: params[43],
          unit: ''
        }
      ]
    },
    {
      classification: 'CAN霍尔传感器信息',
      element: [
        {
          id: 28,
          label: 'LEM/SP5状态信息',
          value: parseFault_CanHallFault(params[46])
        },
        { id: 29, label: '传感器名称', value: params[47].toString(16) },
        { id: 30, label: '软件版本', value: params[48].toString(16) }
      ]
    },
    {
      classification: '堆栈空间信息',
      element: [
        {
          id: 31,
          label: '周期任务堆栈大小',
          value: (regNumComb_Config(params[52], params[53]) / 1024).toFixed(2),
          unit: 'KB'
        },
        {
          id: 32,
          label: '系统堆栈空间',
          value: (regNumComb_Config(params[54], params[55]) / 1024).toFixed(2),
          unit: 'KB'
        },
        {
          id: 33,
          label: '系统堆栈最小空间',
          value: (regNumComb_Config(params[56], params[57]) / 1024).toFixed(2),
          unit: 'KB'
        },
        {
          id: 209,
          label: '可配置默认参数剩余次数',
          value: params[58]
        }
      ]
    }
  ]
  if (withUnit) {
    baseData.forEach((group) => {
      group.element.forEach((el) => {
        if (el.unit) {
          el.label = `${el.label}(${el.unit})`
        }
      })
    })
  }
  const bcuVersionElements = [
    {
      id: 34,
      label: 'BCU产品编码',
      value: convertToAscii_ClusterSummNew(params.slice(62, 69))
    },
    {
      id: 35,
      label: 'BCU硬件版本',
      value: convertToAscii_ClusterSummNew(params.slice(69, 76))
    },
    {
      id: 36,
      label: 'BCU软件版本',
      value: convertToAscii_ClusterSummNew(params.slice(76, 83))
    },
    {
      id: 37,
      label: 'BCU-BOOT版本',
      value: convertToAscii_ClusterSummNew(params.slice(83, 90))
    },
    {
      id: 38,
      label: 'BCU-BAU协议版本',
      value: convertToAscii_ClusterSummNew(params.slice(90, 97))
    },
    {
      id: 39,
      label: 'BCU-BMU协议版本',
      value: convertToAscii_ClusterSummNew(params.slice(97, 104))
    },
    {
      id: 40,
      label: 'BCU事件记录版本',
      value: convertToAscii_ClusterSummNew(params.slice(104, 111))
    },
    {
      id: 41,
      label: 'BCU-SOX算法版本',
      value: convertToAscii_ClusterSummNew(params.slice(111, 118))
    },
    {
      id: 42,
      label: 'BCU默认参数版本号',
      value: convertToAscii_ClusterSummNew(params.slice(118, 125))
    }
  ]
  const bmuVersionElements = generateBMUVersionElements(params, bmuCount)
  // 4. 追加 BMU 产品编码（每个BMU占用7个寄存器，拼接为字符串）
  const bmuProductElements = []
  try {
    const productRegsPerBMU = 7
    const totalProductRegs = productRegsPerBMU * bmuCount
    if (params.length >= totalProductRegs) {
      const productStartIndex = params.length - totalProductRegs - 1
      for (let i = 0; i < bmuCount; i++) {
        const start = productStartIndex + i * productRegsPerBMU
        const end = start + productRegsPerBMU
        const sliceRegs = params.slice(start, end)
        const codeStr = convertBMUProductCodeToBytes(sliceRegs)
        bmuProductElements.push({
          id: bmuVersionElements.length + i + 1,
          label: `BMU-${i + 1}-产品编码`,
          value: codeStr
        })
      }
    }
  } catch {}

  // 合并到一个"版本号"分类
  const allVersionElements = [...bcuVersionElements, ...bmuVersionElements, ...bmuProductElements]
  const versionData = {
    classification: '版本号',
    element: allVersionElements
  }
  return [...baseData, versionData]
}

function getAlarmData2(
  data,
  config = {
    bmuTotal: 32,
    cellsPerBMU: 128,
    tempsPerBMU: 32
  }
) {
  // 故障类型配置
  const faultConfigs = [
    { name: '单体电池过压', addr: 0xa080, cells: config.cellsPerBMU },
    { name: '单体电池欠压', addr: 0xa280, cells: config.cellsPerBMU },
    { name: '充电单体过温', addr: 0xa480, cells: config.tempsPerBMU },
    { name: '充电单体欠温', addr: 0xa680, cells: config.tempsPerBMU },
    { name: '放电单体过温', addr: 0xa880, cells: config.tempsPerBMU },
    { name: '放电单体欠温', addr: 0xaa80, cells: config.tempsPerBMU },
    { name: '单体SOC过高', addr: 0xac80, cells: config.cellsPerBMU },
    { name: '单体SOC过低', addr: 0xae80, cells: config.cellsPerBMU }
  ]
  return faultConfigs.reduce((result, { name, addr, cells }, faultIndex) => {
    // 计算该故障类型总共的单体数量
    const totalCells = config.bmuTotal * cells
    
    // 计算需要的寄存器数量（每8个单体占用1个寄存器）
    const totalRegs = Math.ceil(totalCells / 8)

    // 计算该故障类型在数据数组中的起始偏移量
    const blockOffset = faultIndex * 512

    // 遍历所有寄存器，按单体连续解析
    for (let regIdx = 0; regIdx < totalRegs; regIdx++) {
      const dataIndex = blockOffset + regIdx
      if (dataIndex >= data.length) {
        console.warn(`地址溢出: ${name} 寄存器[${dataIndex}]`)
        continue
      }

      const regValue = data[dataIndex] || 0

      // 按位解析（从低位到高位，每2个bit代表一个单体）
      for (let bitPos = 0; bitPos <= 14; bitPos += 2) {
        // 计算全局连续序号（从寄存器索引和bit位置直接计算）
        const globalCellNum = regIdx * 8 + bitPos / 2 + 1

        // 检查是否超出总单体数量
        if (globalCellNum > totalCells) break

        // 根据全局序号反推BMU编号和该BMU内的单体编号
        const bmu = Math.floor((globalCellNum - 1) / cells) + 1
        const localCellNum = ((globalCellNum - 1) % cells) + 1

        // 提取2位bit值（0-3）
        const bits = (regValue >> bitPos) & 0x03
        if (bits === 0) continue // 无故障跳过

        result.push({
          classification: name,
          element: [
            {
              fault: name,
              level: alarmLevels[bits],
              levelValue: bits,
              bmuIndex: `BMU${bmu}`,
              cellIndex:
                name === '单体电池过压' ||
                name === '单体电池欠压' ||
                name === '单体SOC过高' ||
                name === '单体SOC过低'
                  ? `Cell${globalCellNum}`
                  : `Temp${globalCellNum}`,
              cellIndexRelative:
                name === '单体电池过压' ||
                name === '单体电池欠压' ||
                name === '单体SOC过高' ||
                name === '单体SOC过低'
                  ? `BMU${bmu}-Cell${localCellNum}`
                  : `BMU${bmu}-Temp${localCellNum}`,
              bitRange: `${bitPos + 1}-${bitPos}`
            }
          ]
        })
      }
    }
    return result
  }, [])
}
// 分类名称映射（支持模糊匹配）
function mapDisconnectCategory(orig) {
  /*   console.log(orig) */
  if (orig.includes('BMU连接状态')) {
    return '通讯故障-BMU失联'
  } else if (orig.includes('电压采集状态')) {
    return '通讯故障-电压采集掉线'
  } else if (orig.includes('温度采集状态')) {
    return '通讯故障-温度采集掉线'
  } else if (orig.includes('AFE通讯')) {
    return '通讯故障-AFE失联'
  } else if (orig.includes('动力接插件-1')) {
    return '通讯故障-动力接插件1掉线'
  } else if (orig.includes('动力接插件-2')) {
    return '通讯故障-动力接插件2掉线'
  } else {
    return orig // 其他未定义分类保持原样
  }
}
// 清洗分类：去掉末尾的 " BMU<number>"，再做映射
function cleanClassification(orig) {
  // 去掉末尾形如 " BMU1"、" BMU12" 的后缀
  const base = orig.replace(/\s*BMU\d+$/, '')
  return mapDisconnectCategory(base)
}
// 提取BMU编号（兼容不同格式）
function extractBMU(label) {
  const match = label.match(/BMU\d+/)
  return match ? match[0] : '未知BMU'
}

// 提取电池/AFE编号（优化数字提取逻辑）
function extractCell(label) {
  const matchAFE = label.match(/AFE(\d+)/)
  if (matchAFE) {
    return `AFE${matchAFE[1]}`
  }
  const matchCell = label.match(/#(\d+)/)
  if (matchCell) {
    return `Cell${matchCell[1]}`
  }
}

// 提取单体数字编号
function extractCellNumber(label) {
  const matchCell = label.match(/#(\d+)/)
  if (matchCell) {
    return parseInt(matchCell[1], 10)
  }
  return null
}

// 提取BMU数字编号
function extractBMUNumber(label) {
  const match = label.match(/BMU(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

// 计算绝对位置
function calculateAbsolutePosition(bmuNumber, localCellNumber, classification, config) {
  if (!bmuNumber || !localCellNumber || !config) {
    return null
  }

  // 根据分类确定每个BMU的单体数量
  let cellsPerBMU
  if (classification.includes('电压') || classification.includes('SOC')) {
    cellsPerBMU = config.cellsPerBMU || 48 // 默认电压/SOC单体数量
  } else if (classification.includes('温度')) {
    cellsPerBMU = config.tempsPerBMU || 8 // 默认温度单体数量
  } else {
    return null // 其他类型不计算绝对位置
  }

  // 计算绝对位置：(BMU编号-1) * 每BMU单体数 + 本地单体编号
  return (bmuNumber - 1) * cellsPerBMU + localCellNumber
}
function convertDisconnectToAlarmFormat(disconnectData, config) {
  /* disconnectData.forEach((item) => console.log(item)) */
  // 空值校验
  if (!disconnectData || !Array.isArray(disconnectData)) {
    /* console.warn('掉线数据为空或格式错误') */
    return []
  }

  return disconnectData
    .map((category) => ({
      classification: cleanClassification(category.classification),
      element: category.element
        .map((item) => {
          // 扩展故障判断条件：
          // 1. 包含"掉线"和"掉线"的传统故障
          // 2. 单向菊花链断连位置故障（值不为"正常"且标签包含"断连位置"）
          const isFault =
            item.value === '掉线' || (item.value !== '正常' && item.label.includes('断连位置'))
          // 构建故障名称
          let faultName = cleanClassification(category.classification)

          // 对于单向菊花链断连位置故障，加上具体位置信息
          if (
            isFault &&
            item.value !== '正常' &&
            item.value !== '掉线' &&
            item.label.includes('断连位置')
          ) {
            // 确定是正向还是反向断连
            const direction = item.label.includes('正向') ? '正向' : '反向'
            faultName = `${faultName}-${direction}${item.value}`
          }

          const bmuIndex = extractBMU(item.label)
          const cellIndex = extractCell(item.label)

          // 提取数字编号用于绝对位置计算
          const bmuNumber = extractBMUNumber(item.label)
          const localCellNumber = extractCellNumber(item.label)

          // 计算绝对位置
          const absolutePosition = calculateAbsolutePosition(
            bmuNumber,
            localCellNumber,
            category.classification,
            config
          )

          const result = {
            fault: faultName,
            level: isFault ? '严重' : '无故障',
            levelValue: isFault ? 1 : 0,
            bmuIndex: bmuIndex,
            timestamp: Date.now()
          }

          // 只有当存在Cell信息时才添加Cell相关的索引属性
          if (cellIndex) {
            result.cellIndexRelative = `${bmuIndex}-${cellIndex}`

            // 只为有单体编号的项添加绝对位置
            if (absolutePosition !== null) {
              result.cellIndex = `Cell${absolutePosition}`
            }
          }

          return result
        })
        .filter((item) => item.levelValue !== 0) // 仅保留故障项
    }))
    .filter((category) => category.element.length > 0)
}
function flattenAndFormat(alarmCategories) {
  return alarmCategories.flatMap((category) =>
    category.element.map((item) => {
      const ts = item.timestamp
      const d = new Date(ts)
      const formattedTime =
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
        `${String(d.getDate()).padStart(2, '0')} ` +
        `${String(d.getHours()).padStart(2, '0')}:` +
        `${String(d.getMinutes()).padStart(2, '0')}:` +
        `${String(d.getSeconds()).padStart(2, '0')}`

      return {
        classification: category.classification,
        fault: item.fault,
        faultZh: item.faultZh || item.fault, // 优先使用中文名称，如果没有则使用英文名称
        bmuIndex: item.bmuIndex,
        cellIndexRelative: item.cellIndexRelative,
        cellIndex: item.cellIndex,
        level: item.level,
        actionValue: item.actionValue,
        timestamp: ts,
        formattedTime
      }
    })
  )
}
function parseRegister(registerValue, faultList, registerNum, noShowNoFault = true) {
  const errorList = []
  for (let i = 0; i < registerNum; i++) {
    const bitStatus = (registerValue >> i) & 1 // 获取第i个bit位的值
    if (bitStatus === 1) {
      errorList.push({ /*  bit: startBMU + i, */ fault: faultList[i] })
    }
    if (errorList.length === 0 && !noShowNoFault) {
      return [{ fault: '无' }]
    }
  }
  return errorList
}
function parseRegisterForHwelse(registerValue, faultList, registerNum) {
  const errorList = []
  for (let i = 0; i < registerNum; i++) {
    const bitStatus = (registerValue >> i) & 1 // 获取第i个bit位的值
    if (bitStatus === 1) {
      // 故障位为1时，添加故障信息
      if (i < 10) {
        errorList.push({ label: faultList[i], value: '异常' })
      } else {
        errorList.push({ label: faultList[i], value: '闭合' })
      }
    } else {
      // 故障位为0时，添加正常信息
      if (i < 10) {
        errorList.push({ label: faultList[i], value: '正常' })
      } else {
        errorList.push({ label: faultList[i], value: '断开' })
      }
    }
  }
  return errorList.filter((item) => item.label !== '预留')
}

function parseAFEBMUStatus(registerValue, afeList) {
  const lost = []
  for (let i = 0; i < afeList.length; i++) {
    const bit = (registerValue >> i) & 1
    if (bit === 0) {
      // 0 表示失联
      lost.push([afeList[i]])
    }
  }
  // 如果一个都没失联，就返回"无"
  return lost.length > 0 ? lost.join(';') : `无(${registerValue})`
}
const alarmLevels = {
  0: '无故障',
  1: '严重',
  2: '一般',
  3: '轻微'
}
function parse2bitRegister(registerValue, startBMU, faultList) {
  const errorList = []
  for (let i = 0; i < 8; i++) {
    const bitStatus = (registerValue >> (i * 2)) & 3 // 每两位表示一个报警等级
    /*         const reversedBitStatus = ((bitStatus >> 1) & 1) | ((bitStatus & 1) << 1) // 反转2-bit顺序
     */
    if (bitStatus !== 0) {
      errorList.push({
        /*     bit: startBMU + i, */
        fault: faultList[i],
        level: alarmLevels[bitStatus]
      })
    }
  }
  return errorList
}
function parse2bitRegisterForEvent(raw, faultList) {
  const results = []

  for (let i = 0; i < 7; i++) {
    // 每 2 位是一个报警等级（0-3）
    const level = (raw >> (i * 2)) & 0x03
    if (level !== 0) {
      results.push(`${faultList[i]}${alarmLevels[level]}`)
    }
  }

  // 如果全是 0，则返回一个占位
  if (results.length === 0) {
    return `无(${raw})`
  }

  // 用分号+空格拼接
  return results.join('; ')
}
// 统一错误分类函数
function categorizeError(classification, errorList) {
  if (errorList.length > 0) {
    return { classification, element: errorList }
  }
  return null
}
// 解析硬件故障（0xA009 - 0xA014）
function parseHardwareFaults(params, bmuTotal) {
  const errorMap = []

  // 高边驱动反馈故障 (0xA009)
  /*  const regA009 = params[0] // 0xA009寄存器
  const highSideFaults = [
    'DO1 高边驱动反馈故障',
    'DO2 高边驱动反馈故障',
    'DO3 高边驱动反馈故障',
    'DO4 高边驱动反馈故障',
    'DO5 高边驱动反馈故障',
    'DO6 高边驱动反馈故障',
    'DO7 高边驱动反馈故障',
    'DO8 高边驱动反馈故障'
  ]
  const highSideFaultList = parseRegister(regA009, highSideFaults, 8, true)
  const categorizedHighSideFaults = categorizeError(
    '硬件故障-高边驱动反馈故障',
    highSideFaultList
  )
  if (categorizedHighSideFaults) errorMap.push(categorizedHighSideFaults) */

  // 接触器故障 (0xA00A)
  /*  const regA00A = params[1] // 0xA00A寄存器
  const contactorFaults = [
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
  ]
  const contactorFaultList = parseRegister(regA00A, contactorFaults, 16, true)
  const categorizedContactorFaults = categorizeError(
    '硬件故障-接触器故障',
    contactorFaultList
  )
  if (categorizedContactorFaults) errorMap.push(categorizedContactorFaults) */

  // 反馈信号故障 (0xA00B)
  /*   const regA00B = params[2] // 0xA00B寄存器
  const communicationFaults = [
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
  ]
  const communicationFaultList = parseRegister(regA00B, communicationFaults, 10, true)
  const categorizedCommunicationFaults = categorizeError(
    '硬件故障-反馈信号故障',
    communicationFaultList
  )
  if (categorizedCommunicationFaults) errorMap.push(categorizedCommunicationFaults) */

  // 通讯/采集失联类故障 (0xA00C)
  /*   const regA00C = params[3] // 0xA00C寄存器
  const feedbackFaults = [
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
  ]
  const feedbackFaultList = parseRegister(regA00C, feedbackFaults, 16, true)
  const categorizedFeedbackFaults = categorizeError(
    '硬件故障-通讯/采集失联类故障 ',
    feedbackFaultList
  )
  if (categorizedFeedbackFaults) errorMap.push(categorizedFeedbackFaults) */
  //BMU参数配置错误位置1(0xA00D)
  /*  const regA00D = params[4] // 0xA00D寄存器
  const maxBMUInA00D = Math.min(bmuTotal, 16)
  const bmuConfigFaults1 = Array.from({ length: maxBMUInA00D }, (_, i) => `BMU${i + 1}参数配置错误`)
  const bmuConfigFaults1List = parseRegister(regA00D, bmuConfigFaults1, maxBMUInA00D, true)
  const categorizedBmuConfigFaults1 = categorizeError(
    '硬件故障-BMU参数配置错误位置1',
    bmuConfigFaults1List
  )
  if (categorizedBmuConfigFaults1) errorMap.push(categorizedBmuConfigFaults1)

  // BMU参数配置错误位置2(0xA00E)
  if (bmuTotal > 16) {
    const regA00E = params[5]
    const validBMUs = Math.min(bmuTotal - 16, 16)
    const bmuConfigFaults2 = Array.from({ length: validBMUs }, (_, i) => `BMU${17 + i}参数配置错误`)
    const bmuConfigFaults2List = parseRegister(regA00E, bmuConfigFaults2, validBMUs, true)
    const categorizedBmuConfigFaults2 = categorizeError(
      '硬件故障-BMU参数配置错误位置2',
      bmuConfigFaults2List
    )
    if (categorizedBmuConfigFaults2) errorMap.push(categorizedBmuConfigFaults2)
  } */

  // 其他故障 (0xA00F)
  const regA00F = params[6]
  const hwelseFaults = [
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
  ]
  const hwelseFaultList = parseRegister(regA00F, hwelseFaults, 11, true)
  const categorizedHwelseFaults = categorizeError('硬件故障-其他故障', hwelseFaultList)
  if (categorizedHwelseFaults) errorMap.push(categorizedHwelseFaults)
  //总故障0xA010
  /* const regA010 = params[7]
  const allFaults = ['存在常规严重故障位', '存在硬件故障总故障位', '存在保留故障总故障位']
  const allFaultList = parseRegister(regA010, 0, allFaults, 3)
  const categorizedAllFaults = categorizeError('总故障', allFaultList)
  if (categorizedAllFaults) errorMap.push(categorizedAllFaults) */
  //保留故障0xA011
  /*  const regA011 = params[8]
  const reservedFaults = [
    '保留充电过流严重告警',
    '保留放电过流严重告警',
    '保留绝缘电阻严重告警',
    '保留接触器黏连氧化',
    '保留PCS通讯故障'
  ]
  const reservedFaultList = parseRegister(regA011, reservedFaults, 5, true)
  const categorizedReservedFaults = categorizeError('保留故障', reservedFaultList)
  if (categorizedReservedFaults) errorMap.push(categorizedReservedFaults)
  const regA012 = params[9]
  const faultsA012 = [
    '单体总故障-单体电压过压',
    '单体总故障-单体电压欠压',
    '单体总故障-单体充电过温',
    '单体总故障-单体充电欠温',
    '单体总故障-单体放电过温',
    '单体总故障-单体放电欠温',
    '单体总故障-单体soc过高',
    '单体总故障-单体soc过低'
  ]
  const faultListA012 = parse2bitRegister(regA012, 1, faultsA012)
  const categorizedFaultsA012 = categorizeError('单体总故障', faultListA012)
  if (categorizedFaultsA012) errorMap.push(categorizedFaultsA012)
  const regA013 = params[10]
  const faultsA013 = [
    'pack总故障-pack电压过压',
    'pack总故障-pack电压过低',
    'pack总故障-pack温度过温',
    'pack总故障-pack温度欠温',
    'pack总故障-1号动力接插件过温',
    'pack总故障-2号动力接插件过温'
  ]
  const faultListA013 = parse2bitRegister(regA013, 1, faultsA013)
  const categorizedFaultsA013 = categorizeError('pack总故障', faultListA013)
  if (categorizedFaultsA013) errorMap.push(categorizedFaultsA013) */
  //常规故障0xA014
  const regA014 = params[11]
  const normalFaults1 = [
    '存在单电池过压故障',
    '存在单电池欠压故障',
    '存在充电单体电池过温故障',
    '存在充电单体电池欠温故障',
    '存在放电单体电池过温故障',
    '存在放电单体电池欠温故障',
    '存在单体电池SOC过高故障',
    '存在单体电池SOC过低故障',
    '存在BMU过压故障',
    '存在BMU欠压故障',
    '存在BMU过温故障',
    '存在BMU欠温故障',
    '存在其他故障',
    '存在动力接插件过温故障'
  ]
  const normalFaults1List = parseRegister(regA014, normalFaults1, 14, true)
  const categorizednormalFaults1 = categorizeError('常规故障1-0xA014', normalFaults1List)
  if (categorizednormalFaults1) errorMap.push(categorizednormalFaults1)
  return errorMap
}
//解析常规故障二级0xA016_0xA025
function parseAlarmA016_A025_D000_D00b(params) {
  const registers = [...params.slice(13, 29), ...params.slice(55, 67)]
  /*     console.log(registers) */
  const errorMapA016_A025_D000_D00b = []
  // 定义故障分类
  const faultCategories = [
    '单体电池过压',
    '单体电池过压',
    '单体电池欠压',
    '单体电池欠压',
    '充电单体电池过温',
    '充电单体电池过温',
    '充电单体电池欠温',
    '充电单体电池欠温',
    '放电单体电池过温',
    '放电单体电池过温',
    '放电单体电池欠温',
    '放电单体电池欠温',
    '单体电池SOC过高',
    '单体电池SOC过高',
    '单体电池SOC过低',
    '单体电池SOC过低',
    'BMU失联',
    'BMU失联',
    'BMU-1号动力接插件温度掉线',
    'BMU-1号动力接插件温度掉线',
    'BMU-2号动力接插件温度掉线',
    'BMU-2号动力接插件温度掉线',
    '预留',
    '预留',
    '电压采集掉线',
    '电压采集掉线',
    '温度采集掉线',
    '温度采集掉线'
  ]
  // 每个寄存器的数据对应一个故障类别
  registers.forEach((reg, index) => {
    const category = faultCategories[index] // 当前的故障类别
    const elements = []

    // 遍历16位（每个bit对应一个BMU的故障信息）
    for (let i = 0; i < 16; i++) {
      const bitStatus = (reg >> i) & 1 // 获取当前bit位的状态 (0 或 1)
      if (bitStatus === 1) {
        // 如果是故障，添加该故障到元素列表
        elements.push({
          /*    bit: i, */
          fault: `BMU${i + 1}-存在${category}`,
          bmuIndex: `BMU${i + 1}`
        })
      }
    }

    // 如果该类别有故障信息，加入到返回的数据中
    if (elements.length > 0) {
      errorMapA016_A025_D000_D00b.push({
        classification: `常规故障二级-${category}`,
        element: elements
      })
    }
  })

  return errorMapA016_A025_D000_D00b
}
// BMU动态解析函数（2bit模式）
function parseBMU2BitFault(params, baseIndex, faultType, bmuTotal) {
  const errorMap = []

  // 固定每个故障类型占用4个寄存器（无论BMU总数多少）
  const regsPerBMUType = 4

  for (let regOffset = 0; regOffset < regsPerBMUType; regOffset++) {
    const regIndex = baseIndex + regOffset
    if (regIndex >= params.length) break

    const registerValue = params[regIndex]
    // 当前寄存器处理的起始BMU编号（1-based）
    const startBMU = regOffset * 8 + 1

    for (let bmuOffset = 0; bmuOffset < 8; bmuOffset++) {
      const currentBMU = startBMU + bmuOffset
      // 核心约束：不超过实际BMU总数
      if (currentBMU > bmuTotal) break

      // 每个BMU占用2bit（从低位开始：bit0-1对应第一个BMU）
      const bitShift = bmuOffset * 2
      const bitStatus = (registerValue >> bitShift) & 0x03

      if (bitStatus !== 0) {
        errorMap.push({
          classification: `常规故障二级-${faultType}`,
          element: [
            {
              fault: faultType,
              level: alarmLevels[bitStatus],
              bmuIndex: `BMU${currentBMU}`,
              bitRange: `${bitShift}-${bitShift + 1}`
            }
          ]
        })
      }
    }
  }
  return errorMap
}
// 解析其他故障0xA03E_0xA03F
function parseOtherFaults(params) {
  const errorMap = []
  // 解析寄存器数据
  const regA03E = params[24] // 0xA03E寄存器 (0xa03e - 0xa026 = 24)
  const faultsA03E = [
    '单体电池压差过大',
    '单体电池温差过大',
    'SOC差异过大',
    'BMU压差过大',
    '簇端过压',
    '簇端欠压',
    '绝缘电阻正对地过低',
    '绝缘电阻负对地过低'
  ]
  const faultListA03E = parse2bitRegister(regA03E, 1, faultsA03E)
  if (faultListA03E.length > 0) {
    errorMap.push({
      classification: '常规故障二级-簇端故障汇总1',
      element: faultListA03E
    })
  }

  const regA03F = params[25] // 0xA03F寄存器 (0xa03f - 0xa026 = 25)
  const faultsA03F = [
    '充电过流',
    '放电过流',
    'RT1过温',
    'RT2过温',
    'RT3过温',
    'RT4过温',
    'RT5过温',
    '预留'
  ]
  const faultListA03F = parse2bitRegister(regA03F, 1, faultsA03F)
  if (faultListA03F.length > 0) {
    errorMap.push({
      classification: '常规故障二级-簇端故障汇总2',
      element: faultListA03F
    })
  }
  return errorMap
}
function getAlarmData1(params, bmuTotal) {
  /* console.log('getAlarmData1_params:', params) */
  const errorMap = [
    // 移除 parseHardwareFaults 和 parseAlarmA016_A025_D000_D00b 的解析
    // 调整 parseBMU2BitFault 的索引，因为起始地址从 0xa009 改为 0xa026，索引需要减去 29
    ...parseBMU2BitFault(params, 0, 'BMU过压', bmuTotal), // 原索引 29 -> 0
    ...parseBMU2BitFault(params, 4, 'BMU欠压', bmuTotal), // 原索引 33 -> 4
    ...parseBMU2BitFault(params, 8, 'BMU过温', bmuTotal), // 原索引 37 -> 8
    ...parseBMU2BitFault(params, 12, 'BMU欠温', bmuTotal), // 原索引 41 -> 12
    ...parseBMU2BitFault(params, 16, '1号动力接插件过温', bmuTotal), // 原索引 44 -> 15
    ...parseBMU2BitFault(params, 20, '2号动力接插件过温', bmuTotal), // 原索引 48 -> 19
    ...parseOtherFaults(params)
  ]
  /*   console.log(errorMap) */
  return errorMap
}

function parseDIDOData(params, bmuNum) {
  const result = []
  const regA000 = params[0]
  const regA001 = params[1]
  const regA002 = params[2]
  const regA004 = params[4]
  const regA006 = params[6]
  // 读取主 DI 数据
  const diElement = []
  for (let i = 0; i < 11; i++) {
    diElement.push({
      label: `DI${i + 1}`,
      value: (regA000 >> i) & 1
    })
  }

  // 重构BMU DI数据处理逻辑
  const bmuDIElements = []
  for (let bmuIndex = 0; bmuIndex < bmuNum; bmuIndex++) {
    // 按BMU顺序处理DI1/DI2/DI3
    const bmuId = bmuIndex + 1
    bmuDIElements.push(
      {
        label: `BMU${bmuId} DI1`,
        value: (regA002 >> bmuIndex) & 1
      },
      {
        label: `BMU${bmuId} DI2`,
        value: (regA004 >> bmuIndex) & 1
      },
      {
        label: `BMU${bmuId} DI3`,
        value: (regA006 >> bmuIndex) & 1
      }
    )
  }

  // 合并主DI和BMU DI数据
  result.push({
    classification: 'DI反馈',
    element: diElement.concat(bmuDIElements)
  })

  // DO反馈数据不变
  const doElement = []
  for (let i = 0; i < 8; i++) {
    doElement.push({
      label: `DO${i + 1}`,
      value: (regA001 >> i) & 1
    })
  }
  result.push({
    classification: 'DO反馈',
    element: doElement
  })

  return result
}
function parseControlData(params) {
  let array = []
  array.push(
    {
      classification: '控制信息执行结果',
      element: [{ label: '接触器执行策略结果', value: parseConfig_FetControlResult(params[0]) }]
    },
    {
      classification: '控制信息执行结果',
      element: [
        { label: '绝缘电阻检测执行结果', value: parseConfig_InsulationDetectionResult(params[1]) }
      ]
    },
    {
      classification: '系统运行模式',
      element: [{ label: '系统运行模式', value: paraseData_SysRunMode(params[2]) }]
    }
  )
  return array
}
function getArray_ConfigParamSys1(params, mtclient) {
  const basicConfig = {
    classification: 'BMU/AFE数量配置',
    element: []
  }
  basicConfig.element.push({
    id: 1,
    label: 'BMU总数量',
    value: params[0],
    noteKey: 'note1',
    note: '1簇下最多支持32个BMU',
    min: 0,
    max: 32
  })
  basicConfig.element.push({
    id: 2,
    label: 'BMU下AFE数量',
    value: params[1],
    noteKey: 'note2',
    note: '1个BMU下最多支持16个AFE',
    min: 0,
    max: 16
  })
  for (let i = 0; i < 16; i++) {
    basicConfig.element.push({
      id: i + 3,
      label: `AFE${i + 1}下电池数量`,
      value: params[2 + i],
      min: 0,
      max: 16
    })
  }
  for (let i = 0; i < 16; i++) {
    basicConfig.element.push({
      id: i + 19,
      label: `AFE${i + 1}下温度数量`,
      value: params[18 + i],
      min: 0,
      max: 16
    })
  }
  for (let i = 0; i < 16; i++) {
    basicConfig.element.push({
      id: i + 35,
      label: `AFE${i + 1}的虚拟电池偏移位置1`,
      value: params[34 + 2 * i],
      min: 0,
      max: 16
    }),
      basicConfig.element.push({
        id: i + 36,
        label: `AFE${i + 1}的虚拟电池偏移位置2`,
        value: params[35 + 2 * i],
        min: 0,
        max: 16
      })
  }
  let addressArray = generateRange(0x0000, 0x0041)
  /*   const writeValueArray = Array.from({ length: 69 }, () => '') */
  basicConfig.element.forEach((item, index) => {
    item.address = addressArray[index]
    /*    item.writeValue = writeValueArray[index] */
  })
  // 新增：提取AFE配置信息
  const afeConfig = []
  for (let i = 0; i < params[1]; i++) {
    // 根据实际AFE最大数量调整
    const vltgPerAFE = params[2 + i] // 对应"AFEx下电池数量"
    const tempPerAFE = params[18 + i] // 对应"AFEx下温度数量"

    if (vltgPerAFE > 0 || tempPerAFE > 0) {
      // 过滤无效AFE
      afeConfig.push({
        afeID: i + 1,
        vltgPerAFE: vltgPerAFE,
        tempPerAFE: tempPerAFE
      })
    }
  }
  // 将配置保存到mtclient
  mtclient.afeConfig = afeConfig
  mtclient.AFETotal = params[1] // 实际有效的AFE总数
  /*   console.log('AFE配置信息,AFE数量：', mtclient.afeConfig, mtclient.AFETotal) */
  return [basicConfig]
}
function parseConfig_eventRecod(params) {
  if (params === 0) return '简约模式'
  else if (params === 1) return '详细模式'
}
function parseConfig_internalTestModel(params) {
  switch (params) {
    case 0:
      return '关闭内测模式'
    case 1:
      return '内测模式1（VT）'
    case 2:
      return '内测模式2（IACP）'
    case 3:
      return '内测模式3（DO）'
    default:
      return `未知(${params})`
  }
}
function parseConfig_balanceModel(params) {
  if (params === 0) return '自动均衡'
  else if (params === 1) return '手动均衡'
}
function parseConfig_OperModel(params) {
  // 确保 params 是数字类型进行处理
  /*  const hexValue =
    typeof params === 'number' ? params.toString(16) : parseInt(params, 16).toString(16) */
  switch (params) {
    case 23477:
      return '运维模式'
    case 4641:
      return '非运维模式'
    default:
      return `未知模式(${params})`
  }
}
function parseConfig_DisableEnableCluster(params) {
  // 确保 params 是数字类型进行处理
  /*  const hexValue =
    typeof params === 'number' ? params.toString(16) : parseInt(params, 16).toString(16) */
  switch (params) {
    case 23477:
      return '禁止'
    case 4641:
      return '启用'
    default:
      return `未知模式(${params})`
  }
}
function parseConfig_PCSModel(params) {
  /*   const hexValue =
    typeof params === 'number' ? params.toString(16) : parseInt(params, 16).toString(16) */
  switch (params) {
    case 65535:
      return '无PCS'
    case 1:
      return '星星PCS'
    case 2:
      return '双一力PCS-01'
    case 3:
      return '科华PCS'
    default:
      return `未知模式(${params})`
  }
}
function parseConfig_CoolModel(params) {
  /*   const hexValue =
    typeof params === 'number' ? params.toString(16) : parseInt(params, 16).toString(16) */
  switch (params) {
    case 65535:
      return '无制冷设备'
    case 1:
      return '柯诺威水冷机'
    case 2:
      return '英维克水冷机'
    case 3:
      return '埃森特交流空调'
    default:
      return `未知模式(${params})`
  }
}
function parseConfig_LiqModel(params) {
  /*   const hexValue =
    typeof params === 'number' ? params.toString(16) : parseInt(params, 16).toString(16) */
  switch (params) {
    case 65535:
      return '无除湿机设备'
    case 1:
      return '除湿机-01'
    case 2:
      return '除湿机-E-J-000113'
    default:
      return `未知模式(${params})`
  }
}

function parseConfig_Fire(params) {
  /*   const hexValue =
    typeof params === 'number' ? params.toString(16) : parseInt(params, 16).toString(16) */
  switch (params) {
    case 65535:
      return '无消防控制器'
    case 1:
      return '三沃力源（sanvalor）'
    default:
      return `未知模式(${params})`
  }
}
// 解析特殊功能使能位配置 - 簇压模式 (bit0-2)
function parseConfig_ClusterVoltageMode(params) {
  const clusterMode = params & 0x07 // 取低3位 (bit0-2)
  switch (clusterMode) {
    case 0:
      return '高压采集模式（默认）'
    case 1:
      return '单体电压累加模式'
    default:
      return `未知模式(${clusterMode})`
  }
}

// 解析特殊功能使能位配置 - 动力接插件 (bit3)
function parseConfig_PowerConnector(params) {
  const powerConnector = (params >> 3) & 0x01 // 取第3位 (bit3)
  switch (powerConnector) {
    case 0:
      return '不存在'
    case 1:
      return '存在'
    default:
      return `未知状态(${powerConnector})`
  }
}

// 解析特殊功能使能位配置 - BMU温度数据类型 (bit4)
function parseConfig_BMUTempDataType(params) {
  const tempDataType = (params >> 4) & 0x01 // 取第4位 (bit4)
  switch (tempDataType) {
    case 0:
      return '普通模式'
    case 1:
      return '高精度模式'
    default:
      return `未知模式(${tempDataType})`
  }
}
function parseConfig_FetControlResult(params) {
  switch (params) {
    case 0:
      return '执行中'
    case 1:
      return '执行失败'
    case 2:
      return '执行成功'
    default:
      return `未知模式(${params})`
  }
}

function parseConfig_InsulationDetectionResult(params) {
  switch (params) {
    case 0:
      return '空闲'
    case 1:
      return '检测中'
    case 2:
      return '检测完成'
    default:
      return `未知模式(${params})`
  }
}
function paraseData_SysRunMode(param) {
  switch (param) {
    case 23477:
      return '测试模式'
    case 4641:
      return '正常模式'
    default:
      return '正常模式'
  }
}

function parseConfig_CANSpeed(params) {
  switch (params) {
    case 0:
      return '50k'
    case 1:
      return '100k'
    case 2:
      return '125k'
    case 3:
      return '250k'
    case 4:
      return '500k'
    case 5:
      return '1M'
    default:
      return `未知模式(${params})`
  }
}

function parseConfig_CANBaudRate(params) {
  switch (params) {
    case 0:
      return 'Invalid/Not Supported'
    case 1:
      return '250k'
    case 2:
      return '500k'
    case 3:
      return '800k'
    case 4:
      return '1M'
    case 5:
      return '2M'
    case 6:
      return '4M'
    case 7:
      return '5M'
    default:
      return `未知模式(${params})`
  }
}
function parseConfig_485Speed(params) {
  switch (params) {
    case 0:
      return '1200'
    case 1:
      return '2400'
    case 2:
      return '4800'
    case 3:
      return '9600'
    case 4:
      return '19200'
    case 5:
      return '38400'
    case 6:
      return '57600'
    case 7:
      return '115200'
    default:
      return `未知模式(${params})`
  }
}
function parseConfig_CurrentSenser(params) {
  switch (params) {
    case 0:
      return 'LEM-CAB500-C/SP5-012'
    case 1:
      return 'LEM-DHAB-S/118'
    case 48:
      return 'JC-JHAB-S/18'
    case 192:
      return 'CG-FL2C-200A/75mV'
    default:
      return `未知类型(${params})`
  }
}

function parseConfig_CellType(params) {
  switch (params) {
    case 0:
      return '磷酸铁锂电池'
    case 1:
      return '钛酸锂电池'
    case 2:
      return '锰酸锂电池'
    default:
      return `未知类型(${params})`
  }
}

function parseConfig_Balance(params) {
  switch (params) {
    case 0:
      return '禁止自动均衡'
    case 1:
      return '开路'
    case 2:
      return '静置'
    case 3:
      return '放电'
    case 4:
      return '充电'
    case 5:
      return '开路静置'
    case 6:
      return '开路放电'
    case 7:
      return '开路充电'
    case 8:
      return '静置放电'
    case 9:
      return '静置充电'
    case 10:
      return '放电充电'
    case 11:
      return '开路、静置、放电'
    case 12:
      return '开路、静置、充电'
    case 13:
      return '开路、充电、放电'
    case 14:
      return '静置、充电、放电'
    case 15:
      return '开路、静置、放电、充电'
    default:
      return `未知状态(${params})` // 如果传入的值超出0-15范围
  }
}

function parseConfig_BalanceK(params) {
  switch (params) {
    case 10:
      return '2mV'
    case 100:
      return '15mV'
    case 1000:
      return '1000mV'
    default:
      return '20mV'
  }
}
function getArray_ConfigParamSys2(params) {
  const basicConfig = [
    {
      classification: '系统及设备类型配置',
      element: [
        {
          id: 1,
          address: '0x0052',
          label: '事件记录模式',
          optionKey: 'eventLoggingMode',
          value1: parseConfig_eventRecod(params[0]),
          value: params[0],
          noteKey: 'note3',
          note: '0 简约模式,1 详细模式'
        },
        {
          id: 2,
          address: '0x0053',
          label: '内测模式',
          optionKey: 'internalTestMode',
          value1: parseConfig_internalTestModel(params[1]),
          value: params[1],
          noteKey: 'note4',
          note: '0：关闭内测模式,1：内测模式1（V、T）2：内测模式2（IACP）3：内测模式3（DO）'
        },
        {
          id: 3,
          address: '0x0054',
          label: '均衡模式',
          optionKey: 'balancingMode',
          value1: parseConfig_balanceModel(params[2]),
          value: params[2],
          noteKey: 'note5',
          note: '0:自动均衡,1:手动均衡'
        },
        {
          id: 4,
          address: '0x0055',
          label: '运维模式',
          optionKey: 'maintenanceMode',
          value1: parseConfig_OperModel(params[3]),
          value: params[3],
          noteKey: 'note6',
          note: '0x5BB5:运维模式,0x1221:非运维模式（默认）'
        },
        {
          id: 5,
          address: '0x0056',
          label: 'PCS类型',
          optionKey: 'pcsType',
          value1: parseConfig_PCSModel(params[4]),
          value: params[4],
          noteKey: 'note7',
          note: '0xFFFF:无PCS,1：星星PCS,2：双一力PCS-01,3：科华PCS'
        },
        {
          id: 6,
          address: '0x0057',
          label: '制冷设备类型',
          optionKey: 'refrigerationEquipmentType',
          value1: parseConfig_CoolModel(params[5]),
          value: params[5],
          noteKey: 'note8',
          note: '0xFFFF：无制冷设备;1：柯诺威水冷机;2：英维克;3：埃森特交流空调'
        },
        {
          id: 7,
          address: '0x0058',
          label: '除湿机设备类型',
          optionKey: 'dehumidifierEquipmentType',
          value1: parseConfig_LiqModel(params[6]),
          value: params[6],
          noteKey: 'note25',
          note: '0xFFFF：无除湿机设备;1：除湿机-01;2：除湿机-E-J-000113'
        },
        {
          id: 8,
          address: '0x0059',
          label: '消防控制器类型',
          optionKey: 'fireControllerType',
          value1: parseConfig_Fire(params[7]),
          value: params[7],
          noteKey: 'note26',
          note: '0xFFFF：无消防控制器;1：三沃力源'
        },
        {
          address: '0x005a',
          id: 100,
          label: '簇压模式',
          optionKey: 'clusterVoltageMode',
          value1: parseConfig_ClusterVoltageMode(params[8]),
          value: params[8] & 0x07,
          isNum: false,
          noteKey: 'note27',
          note: '0:高压采集模式（默认）,1:单体电压累加模式'
        },
        {
          address: '0x005a',
          id: 101,
          label: 'BMU动力接插件温度',
          optionKey: 'powerConnector',
          value1: parseConfig_PowerConnector(params[8]),
          value: (params[8] >> 3) & 0x01,
          isNum: false,
          noteKey: 'note28',
          note: '0:不存在,1:存在'
        },
        {
          address: '0x005a',
          id: 102,
          label: 'BMU温度数据类型',
          optionKey: 'bmuTempDataType',
          value1: parseConfig_BMUTempDataType(params[8]),
          value: (params[8] >> 4) & 0x01,
          isNum: false,
          noteKey: 'note29',
          note: '0:普通模式,1:高精度模式'
        },
        {
          address: '0x005b',
          id: 222,
          label: '禁止使能簇配置',
          optionKey: 'disableEnableCluster',
          value1: parseConfig_DisableEnableCluster(params[9]),
          value: params[9],
          isNum: false,
          noteKey: 'note30',
          note: '0x5BB5:禁止,0x1221:启用（默认）,禁止状态下，下设闭合接触器不执行'
        }
      ]
    },
    {
      classification: '单体温度电压滤波配置',
      element: [
        {
          id: 103,
          address: '0x005d',
          label: '单体电压滤波差值',
          value: (params[11] / 1000).toFixed(3),
          unit: 'V',
          min: 0,
          max: 65.535
        },
        {
          id: 9,
          address: '0x005e',
          label: '单体电压权重系数',
          value: (params[12] / 100).toFixed(2),
          min: 0,
          max: 655.35
        },
        {
          id: 10,
          address: '0x005f',
          label: '单体温度滤波差值',
          value: (params[13] / 10).toFixed(1),
          unit: '℃',
          min: -40,
          max: 125
        },
        {
          id: 11,
          address: '0x0060',
          label: '单体温度权重系数',
          value: (params[14] / 100).toFixed(2),
          min: 0,
          max: 655.35
        }
      ]
    },
    {
      classification: '延时配置',
      element: [
        {
          id: 12,
          address: '0x0061',
          label: '直流供电断开延时时间',
          value: params[15],
          unit: 's',
          min: 0,
          max: 65535
        },
        {
          id: 13,
          address: '0x0062',
          label: '电芯静置时间',
          value: params[16],
          unit: 'min',
          min: 0,
          max: 65535
        },
        {
          id: 14,
          address: '0x0063',
          label: '接触器范围值',
          value: (params[17] / 10).toFixed(1),
          unit: 'V',
          min: 0,
          max: 6553.5
        },
        {
          id: 15,
          address: '0x0064',
          label: '接触器检测延时时间',
          value: params[18],
          unit: 's',
          min: 0,
          max: 65535
        }
      ]
    },
    {
      classification: '设备温度配置',
      element: [
        {
          id: 16,
          address: '0x0069',
          label: '制冷设备-制冷开启温度',
          value: (modbusToSigned16(params[23]) / 10).toFixed(1),
          unit: '℃',
          min: -40,
          max: 125
        },
        {
          id: 17,
          address: '0x006a',
          label: '制冷设备-制冷关闭温度',
          value: (modbusToSigned16(params[24]) / 10).toFixed(1),
          unit: '℃',
          min: -40,
          max: 125
        },
        {
          id: 18,
          address: '0x006b',
          label: '制冷设备-制热开启温度',
          value: (modbusToSigned16(params[25]) / 10).toFixed(1),
          unit: '℃',
          min: -40,
          max: 125
        },
        {
          id: 19,
          address: '0x006c',

          label: '制冷设备-制热关闭温度',
          value: (modbusToSigned16(params[26]) / 10).toFixed(1),
          unit: '℃',
          min: -40,
          max: 125
        },
        {
          id: 20,
          address: '0x006d',

          label: '风扇开启温度',
          value: (modbusToSigned16(params[27]) / 10).toFixed(1),
          unit: '℃',
          min: -40,
          max: 125
        },
        {
          id: 21,
          address: '0x006e',

          label: '风扇停止温度',
          value: (modbusToSigned16(params[28]) / 10).toFixed(1),
          unit: '℃',
          min: -40,
          max: 125
        }
      ]
    },
    {
      classification: '波特率配置',
      element: [
        {
          id: 22,
          address: '0x0073',
          label: 'CAN1通讯速率/仲裁域速率',
          optionKey: 'can1CommRate',
          value1: parseConfig_CANSpeed(params[33]),
          value: params[33],
          noteKey: 'note9',
          note: '0-50k，1-100k，2-125k，3-250k，4-500k，5-1M；Default：4-500k'
        },
        {
          id: 23,
          address: '0x0074',
          label: 'CAN1数据域波特率',
          optionKey: 'can1DataBaudRate',
          value1: parseConfig_CANBaudRate(params[34]),
          value: params[34],
          noteKey: 'note10',
          note: '0-Invalid，1-250k，2-500k，3-800k，4-1M，5-2M，6-4M，7-5M，Default：0-Invalid'
        },
        {
          id: 24,
          address: '0x0075',
          label: 'CAN2通讯速率/仲裁域速率',
          optionKey: 'can2CommRate',
          value1: parseConfig_CANSpeed(params[35]),
          value: params[35],
          noteKey: 'note11',
          note: '0-50k，1-100k，2-125k，3-250k，4-500k，5-1M；Default：4-500k'
        },
        {
          id: 25,
          address: '0x0076',
          label: 'CAN2数据域波特率',
          optionKey: 'can2DataBaudRate',
          value1: parseConfig_CANBaudRate(params[36]),
          value: params[36],
          noteKey: 'note12',
          note: '0-Invalid，1-250k，2-500k，3-800k，4-1M，5-2M，6-4M，7-5M，Default：0-Invalid'
        },
        {
          id: 26,
          address: '0x0077',
          label: 'CAN3通讯速率/仲裁域速率',
          optionKey: 'can3CommRate',
          value1: parseConfig_CANSpeed(params[37]),
          value: params[37],
          noteKey: 'note13',
          note: '0-50k，1-100k，2-125k，3-250k，4-500k，5-1M；Default：4-500k'
        },
        {
          id: 27,
          address: '0x0078',
          label: 'CAN3数据域波特率',
          optionKey: 'can3DataBaudRate',
          value1: parseConfig_CANBaudRate(params[38]),
          value: params[38],
          noteKey: 'note14',
          note: '0-Invalid，1-250k，2-500k，3-800k，4-1M，5-2M，6-4M，7-5M，Default：0-Invalid'
        },
        {
          id: 28,
          address: '0x0079',
          label: 'RS485-1通讯速率',
          optionKey: 'rs485_1CommRate',
          value1: parseConfig_485Speed(params[39]),
          value: params[39],
          noteKey: 'note15',
          note: '0-1200， 1-2400，2-4800，3-9600，4-19200，5-38400，6-57600，7-115200'
        },
        {
          id: 29,
          address: '0x007a',
          label: 'RS485-2通讯速率',
          optionKey: 'rs485_2CommRate',
          value1: parseConfig_485Speed(params[40]),
          value: params[40]
        },
        {
          id: 30,
          address: '0x007b',
          label: 'RS485-3通讯速率',
          optionKey: 'rs485_3CommRate',
          value1: parseConfig_485Speed(params[41]),
          value: params[41]
        }
      ]
    },

    {
      classification: '电流传感器配置',
      element: [
        {
          id: 31,
          address: '0x0080',
          label: '电流传感器类型',
          optionKey: 'currentSensorType',
          value1: parseConfig_CurrentSenser(params[46]),
          value: params[46],
          noteKey: 'note16',
          note: '0x00：LEM-CAB500-C/SP5-012；0x01：LEM-DHAB-S/118；0x30：JC-JHAB-S/18；0xC0：CG-FL2C-200A/75mV'
        },
        {
          id: 32,
          address: '0x0081',
          label: '电流传感器1量程',
          value: params[47],
          unit: 'A',
          min: 0,
          max: 65535
        },
        {
          id: 33,
          address: '0x0082',
          label: '电流传感器2量程',
          value: params[48],
          unit: 'A',
          min: 0,
          max:65535
        },
        {
          id: 34,
          address: '0x0083',
          label: '电流传感器3量程',
          value: params[49],
          unit: 'A',
          min: 0,
          max: 65535
        }
      ]
    },
    {
      classification: '电池参数配置',
      element: [
        {
          id: 35,
          address: '0x0086',
          label: '电池类型',
          optionKey: 'batteryType',
          value1: parseConfig_CellType(params[52]),
          value: params[52],
          noteKey: 'note17',
          note: '0磷酸铁锂电池；1钛酸锂电池；2锰酸锂电池'
        },
        {
          id: 36,
          address: '0x0087',
          label: '电池型号',
          value: params[53],
          min: 0,
          max: 65535
        },
        {
          id: 37,
          address: '0x0088',
          label: '电池厂家',
          value: params[54],
          min: 0,
          max: 65535
        },
        {
          id: 38,
          address: '0x0089',
          label: '电池额定容量',
          value: params[55],
          unit: 'Ah',
          min: 0,
          max: 65535
        },
        {
          id: 39,
          address: '0x008a',
          label: '簇校正电量',
          value: (regNumComb_Config(params[56], params[57]) / 100).toFixed(2),
          unit: 'kWh',
          min: 0,
          max: 42949672.95
        },
        {
          id: 40,
          address: '0x008c',
          label: '簇额定电量',
          value: (regNumComb_Config(params[58], params[59]) / 100).toFixed(2),
          unit: 'kWh',
          min: 0,
          max: 42949672.95
        },
        {
          id: 41,
          address: '0x008e',
          label: '簇额定功率',
          value: (regNumComb_Config(params[60], params[61]) / 100).toFixed(2),
          unit: 'kW',
          min: 0,
          max: 42949672.95
        },
        {
          id: 990,
          address: '0x0090',
          label: '额定电压',
          value: (modbusToSigned16(params[62]) / 10).toFixed(1),
          unit: 'V',
          min: 0,
          max: 6553.5
        }
      ]
    },
    {
      classification: '均衡参数配置',
      element: [
        {
          id: 42,
          address: '0x0094',
          label: '均衡开启时间',
          value: params[66],
          unit: 's',
          noteKey: 'note18',
          note: '例：开启时间3s，停止1s,实际运行均衡3s停止1s，周期为4s',
          min: 0,
          max: 65535
        },
        {
          id: 43,
          address: '0x0095',
          label: '均衡关闭时间',
          value: params[67],
          unit: 's',
          min: 0,
          max: 65535
        },
        {
          id: 44,
          address: '0x0096',
          label: '均衡模式选项',
          optionKey: 'balancingModeOptions',
          value1: parseConfig_Balance(params[68]),
          value: params[68],
          noteKey: 'note19',
          note: '0:禁止自动均衡 1:开路 2:静置 3:放电 4:充电 5:开路、静置 6:开路、放电 7:开路、充电 8:静置、放电9:静置、充电 10:放电、充电 11:开路、静置、放电 12:开路、静置、充电13:开路、充电、放电 14:静置、充电、放电 15:开路、静置、放电、充电'
        },
        {
          id: 45,
          address: '0x0097',
          label: '均衡启动单体电压上限',
          value: params[69],
          unit: 'mV',
          min: 0,
          max: 5000
        },
        {
          id: 46,
          address: '0x0098',
          label: '均衡启动单体电压下限',
          value: params[70],
          unit: 'mV',
          min: 0,
          max: 65535
        },
        {
          id: 47,
          address: '0x0099',

          label: '均衡启动电池温度上限',
          value: (modbusToSigned16(params[71]) / 10).toFixed(1),
          unit: '℃',
          min: -40,
          max: 125
        },
        {
          id: 48,
          address: '0x009a',

          label: '均衡启动电池温度下限',
          value: (modbusToSigned16(params[72]) / 10).toFixed(1),
          unit: '℃',
          min: -40,
          max: 125
        },
        {
          id: 49,
          address: '0x009b',

          label: '开路均衡最大时间',
          value: params[73],
          unit: 's',
          min: 0,
          max: 65535
        },
        {
          id: 50,
          address: '0x009c',
          label: '充电均衡阈值电压区间K值',
          optionKey: 'chargeBalanceThresholdK',
          value1: parseConfig_BalanceK(params[74]),
          value: params[74],
          noteKey: 'note20',
          note: '10:2mV；100:15mV；1000:150mV；else：20mV'
        },
        {
          id: 51,
          address: '0x009d',
          label: '放电均衡阈值电压区间K值',
          optionKey: 'dischargeBalanceThresholdK',
          value1: parseConfig_BalanceK(params[75]),
          value: params[75],
          noteKey: 'note21',
          note: '10:2mV；100:15mV；1000:150mV；else：20mV'
        },
        {
          id: 52,
          address: '0x009e',
          label: '开路,静置均衡阈值电压区间K值',
          optionKey: 'openCircuitBalanceThresholdK',
          value1: parseConfig_BalanceK(params[76]),
          value: params[76],
          noteKey: 'note22',
          note: '10:2mV；100:15mV；1000:150mV；else：20mV'
        }
      ]
    }
  ]
  /* const writeValueArray = Array.from({ length: 55 }, () => '') */
  /*   basicConfig.forEach((config) => {
    config.element.forEach((item, index) => {
      item.writeValue = writeValueArray[index]
    })
  }) */
  /*    console.log(basicConfig[0].element) */
  return basicConfig
}

function transToIpv4(param1, param2) {
  const byte1 = (param1 >> 8) & 0xff
  const byte2 = param1 & 0xff // 低字节 C0 -> 192
  const byte3 = (param2 >> 8) & 0xff // 高字节 D0 -> 208
  const byte4 = param2 & 0xff // 低字节 0A -> 10
  const ip = `${byte2}.${byte1}.${byte4}.${byte3}`
  return ip
}
function transToMac(param1, param2, param3) {
  /* console.log(param1, param2, param3) */
  const byte1 = (param1 >> 8) & 0xff
  const byte2 = param1 & 0xff // 低字节 C0 -> 192
  const byte3 = (param2 >> 8) & 0xff // 高字节 D0 -> 208
  const byte4 = param2 & 0xff // 低字节 0A -> 10
  const byte5 = (param3 >> 8) & 0xff // 高字节 D0 -> 208
  const byte6 = param3 & 0xff // 低字节 0A -> 10
  const mac = `${byte2}-${byte1}-${byte4}-${byte3}-${byte6}-${byte5}`
  return mac
}
function getEventTimeData(params) {
  let basicArray = []
  // 动态添加第三组结构
  basicArray.push({ classification: '事件记录标志位', element: [] })
  let group2_addresses = ['0x5730', '0x5737', '0x5738', '0x5739', '0x573B', '0x573D']
  let group2_labels = [
    '事件记录版本号',
    '事件记录存储数量',
    '事件记录存储百分比',
    '写事件记录开始位置',
    '删除事件记录开始位置',
    '等待删除事件记录数量'
  ]
  // 对应的值计算（沿用原来逻辑，此处下标依据原有定义）
  let group2_value1 = convertToAscii_ClusterSummNew(params.slice(0, 7))
  let group2_value2 = params[7]
  let group2_value3 = (params[8] / 100).toFixed(2)
  let group2_value4 = regNumComb_Config(params[9], params[10])
  let group2_value5 = regNumComb_Config(params[11], params[12])
  let group2_value6 = regNumComb_Config(params[13], params[14])
  let group2_values = [
    group2_value1,
    group2_value2,
    group2_value3,
    group2_value4,
    group2_value5,
    group2_value6
  ]
  let group2_unit = ['', '条', '%', '', '', '', '']

  for (let i = 0; i < group2_addresses.length; i++) {
    basicArray[0].element.push({
      address: group2_addresses[i],
      label: group2_labels[i],
      value: group2_values[i],
      unit: group2_unit[i]
    })
  }

  return basicArray
}

function getArray_ConfigFactorycalib(params, excludeIpFlags = false) {
  // 分组：0：电流电压校准参数；1：设备出厂信息；2：事件记录标志位
  let basicArray = [
    {
      classification: '电流电压校准参数',
      element: []
    },
    {
      classification: '设备出厂信息',
      element: []
    }
  ]

  // ----------------------- 第一组：电流电压校准参数 -----------------------
  // 使用寄存器地址 0x5700 - 0x570B，共12个寄存器
  let group0_addresses = generateRange(0x5700, 0x570b)
  let group0_labels = [
    '电流充电小量程校准K值',
    '电流充电小量程校准B值',
    '电流放电小量程校准K值',
    '电流放电小量程校准B值',
    '电流充电大量程校准K值',
    '电流充电大量程校准B值',
    '电流放电大量程校准K值',
    '电流放电大量程校准B值',
    '预充电压校准K值',
    '预充电压校准B值',
    '组端电压校准K值',
    '组端电压校准B值'
  ]
  let group0_values = [
    (modbusToSigned16(params[0]) / 1000).toFixed(3),
    (modbusToSigned16(params[1]) / 10).toFixed(1),
    (modbusToSigned16(params[2]) / 1000).toFixed(3),
    (modbusToSigned16(params[3]) / 10).toFixed(1),
    (modbusToSigned16(params[4]) / 1000).toFixed(3),
    (modbusToSigned16(params[5]) / 10).toFixed(1),
    (modbusToSigned16(params[6]) / 1000).toFixed(3),
    (modbusToSigned16(params[7]) / 10).toFixed(1),
    (modbusToSigned16(params[8]) / 1000).toFixed(3),
    (modbusToSigned16(params[9]) / 10).toFixed(1),
    (modbusToSigned16(params[10]) / 1000).toFixed(3),
    (modbusToSigned16(params[11]) / 10).toFixed(1)
  ]
  let minArray = Array.from({ length: 12 }, (_, i) => {
      if (i % 2 === 0) {
        return -32.767
      } else {
        return -327.67
      }
    })
  let maxArray = Array.from({ length: 12 }, (_, i) => {
      if (i % 2 === 0) {
        return 32.767
      } else {
        return 327.67
      }
    })
  if (excludeIpFlags) {
    for (let i = 0; i < group0_addresses.length; i++) {
      basicArray[0].element.push({
        address: group0_addresses[i],
        label: group0_labels[i],
        value: group0_values[i],
        min: minArray[i],
        max: maxArray[i]
      })
    }
  }

  // ----------------------- 第二组：设备出厂信息 -----------------------
  // 修改前，原始数据是分散在多个寄存器中，
  // 现要求合并：
  // 1. 生产编码：原来占4个寄存器（寄存器地址 0x5713-0x5716）分别代表年、月、日、编号，合并成一个字符串（例如 "2020-05-15-001"）
  // 2. 本机IP：占2个寄存器（寄存器地址 0x5718 和 0x5719），解析为 IPv4 地址
  // 3. 子网掩码、默认网关、首选DNS、备用DNS：原寄存器地址 0x571A、0x571C、0x571E、0x5720，采用与 IP 相同的解析方式，
  //    合并成一个整体字符串（例如 "255.255.255.0/192.168.1.1/8.8.8.8/8.8.4.4"）
  // 其余保持一对一映射。
  //
  // 根据原来的 valueArray 规划，参数数组 params 对应下标约定如下（下标仅供示例，实际请依据定义确定）：
  // - params[19] ~ params[22]：生产编码年、月、日、编号
  // - params[23]：本机ID
  // - params[24], params[25]：本机IP（2个寄存器，通过 transToIpv4 合并）
  // - params[26], params[27]：子网掩码
  // - params[28], params[29]：默认网关
  // - params[30], params[31]：首选DNS
  // - params[32], params[33]：备用DNS
  // - params[34]：端口
  // - params[35], params[36], params[37]：MAC地址（3个寄存器，依次存储）
  //
  // 同时定义对应的地址显示（合并后以地址范围形式展示）
  if (!excludeIpFlags) {
    const [p1, p2, p3, p4] = params.slice(19, 23).map(String)
    const codeStr =
      p1.padStart(4, '0') + p2.padStart(2, '0') + p3.padStart(2, '0') + p4.padStart(4, '0')
    const productionCode = codeStr
    let deviceID = params[23]
    let deviceIP = transToIpv4(params[24], params[25])
    let subnetMask = transToIpv4(params[26], params[27])
    let gateway = transToIpv4(params[28], params[29])
    let primaryDNS = transToIpv4(params[30], params[31])
    let secondaryDNS = transToIpv4(params[32], params[33])
    /* let networkInfo = [subnetMask, gateway, primaryDNS, secondaryDNS].join('/') */
    let port = params[34]
    /*   let mac1 = params[35]
  let mac2 = params[36]
  let mac3 = params[37] */
    let mac = transToMac(params[35], params[36], params[37])
    /*   console.log(mac) */
    // 新的设备出厂信息组共8个元素
    let group1_addresses = [
      '0x5713-0x5716', // 生产编码（合并4个寄存器）
      '0x5717', // 本机ID
      '0x5718-0x5719', // 本机IP（合并2个寄存器）
      '0x571A-0x571B', // 子网掩码
      '0x571C-0x571D', // 默认网关
      '0x571E-0x571F', // 首选DNS
      '0x5720-0x5721', // 备用DNS
      '0x5722', // 端口
      '0x5723' // MAC地址1
      /*    '0x5724', // MAC地址2
    '0x5725' // MAC地址3 */
    ]
    let group1_labels = [
      '生产编码',
      '本机ID',
      '本机IP',
      '子网掩码',
      '默认网关',
      '首选DNS',
      '备用DNS',
      '端口',
      'MAC地址'
      /*     'MAC地址2',
    'MAC地址3' */
    ]
    let group1_values = [
      productionCode,
      deviceID,
      deviceIP,
      subnetMask,
      gateway,
      primaryDNS,
      secondaryDNS,
      port,
      mac
      /*     mac2,
    mac3 */
    ]
    const ipLabels = ['本机IP', '子网掩码', '默认网关', '首选DNS', '备用DNS']
    for (let i = 0; i < group1_addresses.length; i++) {
      const item = {
        address: group1_addresses[i],
        label: group1_labels[i],
        value: group1_values[i]
      }

      if (ipLabels.includes(group1_labels[i])) {
        item.dataType = 'ip'
      }
      if (item.label === '生产编码') {
        item.noteKey = 'note23'
        item.note = '年月日编号'
      }
      if (item.label.includes('MAC地址')) {
        item.noteKey = 'note24'
        item.note = '只读'
      }
      basicArray[1].element.push(item)
    }
  }
  return basicArray
}
function formatSystemTime(params) {
  // 修正后的BCD解码函数（处理十进制寄存器值）
  const parseBCD = (decimalValue) => {
    let bcd = decimalValue
    let result = 0
    let multiplier = 1
    while (bcd > 0) {
      const digit = bcd % 16
      result += digit * multiplier
      multiplier *= 10
      bcd = Math.floor(bcd / 16)
    }
    return result
  }

  // 参数校验
  if (!Array.isArray(params) || params.length < 7) {
    throw new Error('需要包含7个时间参数')
  }

  // 解析并校验各时间组件
  const components = params.slice(0, 7).map((decimalValue, index) => {
    if (index === 3) return 0 // 跳过周数
    if (index === 0) {
      // 年份：2 位 BCD → 20xx
      return 2000 + parseBCD(decimalValue)
    }
    const value = parseBCD(decimalValue)
    const validationRules = [
      null,
      { min: 1, max: 12, fix: true }, // 月
      { min: 1, max: 31, fix: true }, // 日
      { min: 1, max: 53, fix: false }, // 周（不输出）
      { min: 0, max: 23, fix: true }, // 时
      { min: 0, max: 59, fix: true }, // 分
      { min: 0, max: 59, fix: true } // 秒
    ]
    const rule = validationRules[index]
    if (rule?.fix) {
      return Math.max(rule.min, Math.min(value, rule.max))
    }
    return value
  })

  // 解构：忽略周索引
  const [year, month, day, , hour, minute, second] = components

  // 补零函数：仅用于时分秒
  const pad2 = (num) => num.toString().padStart(2, '0')

  // 返回 YYYY-M-D HH:mm:ss
  return `${year}-${month}-${day}-${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
}

// 辅助函数：将分钟转换为 "xx天xx小时"
function convertMinutesToDayHour(minutes) {
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return `${days}d${hours}h${minutes % 60}min`
}
function getArray_ConfigTime(params) {
  let basicArray = [
    {
      classification: '系统时间记录',
      element: []
    }
  ]
  let addressArray = [
    '0x5744',
    '0x574b',
    '0x574c',
    '0x5753',
    '0x575a',
    '0x575c',
    '0x575e',
    '0x5760',
    '0x576c',
    '0x5773',
    '0x577a',
    '0x577c',
    '0x577e',
    '0x5780',
    '0x578c',
    '0x5793',
    '0x579a',
    '0x579c',
    '0x579e',
    '0x57a0'
  ]
  let labelArray = [
    '系统当前时间',
    '系统启动次数',
    '系统启动时间',
    '系统停止时间',
    '系统运行时间',
    '周期任务堆栈大小',
    '系统堆栈空间',
    '系统堆栈最小空间',
    '系统启动时间',
    '系统停止时间',
    '系统运行时间',
    '周期任务堆栈大小',
    '系统堆栈空间',
    '系统堆栈最小空间',
    '系统启动时间',
    '系统停止时间',
    '系统运行时间',
    '周期任务堆栈大小',
    '系统堆栈空间',
    '系统堆栈最小空间'
  ]
  let valueArray = [
    formatSystemTime(params.slice(0, 7)),
    params[7],
    formatSystemTime(params.slice(8, 15)),
    formatSystemTime(params.slice(15, 22)),
    convertMinutesToDayHour(regNumComb_Config(params[22], params[23])),
    `${regNumComb_Config(params[24], params[25]) / 1000}Kb`,
    `${regNumComb_Config(params[26], params[27]) / 1000}Kb`,
    `${regNumComb_Config(params[28], params[29]) / 1000}Kb`,
    formatSystemTime(params.slice(40, 47)),
    formatSystemTime(params.slice(47, 54)),
    convertMinutesToDayHour(regNumComb_Config(params[54], params[55])),
    `${regNumComb_Config(params[56], params[57]) / 1000}Kb`,
    `${regNumComb_Config(params[58], params[59]) / 1000}Kb`,
    `${regNumComb_Config(params[60], params[61]) / 1000}Kb`,
    formatSystemTime(params.slice(72, 79)),
    formatSystemTime(params.slice(79, 86)),
    convertMinutesToDayHour(regNumComb_Config(params[86], params[87])),
    `${regNumComb_Config(params[88], params[89]) / 1000}Kb`,
    `${regNumComb_Config(params[90], params[91]) / 1000}Kb`,
    `${regNumComb_Config(params[92], params[93]) / 1000}Kb`
  ]
  for (let i = 0; i < 20; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    basicArray[0].element.push({ address, label, value })
  }
  /* console.log(formatSystemTime(params.slice(0, 7))) */
  /* console.log(basicArray[0]) */
  return basicArray
}

function getArray_ConfigAlarmClus(params) {
  let basicArray = [
    {
      classification: '簇端电压告警',
      element: []
    },
    {
      classification: '电流告警',
      element: []
    },
    {
      classification: '绝缘电阻告警',
      element: []
    },
    {
      classification: '过温告警',
      element: []
    }
  ]
  let addressArray = generateRange(0x3000, 0x3077)
  let labelArray = [
    '簇端电压上限-轻微报警值',
    '簇端电压上限-轻微报警滤波时间',
    '簇端电压上限-轻微报警恢复值',
    '簇端电压上限-轻微报警恢复滤波时间',
    '簇端电压上限-一般报警值',
    '簇端电压上限-一般报警滤波时间',
    '簇端电压上限-一般报警恢复值',
    '簇端电压上限-一般报警恢复滤波时间',
    '簇端电压上限-严重报警值',
    '簇端电压上限-严重报警滤波时间',
    '簇端电压上限-严重报警恢复值',
    '簇端电压上限-严重报警恢复滤波时间',
    '簇端电压下限-轻微报警值',
    '簇端电压下限-轻微报警滤波时间',
    '簇端电压下限-轻微报警恢复值',
    '簇端电压下限-轻微报警恢复滤波时间',
    '簇端电压下限-一般报警值',
    '簇端电压下限-一般报警滤波时间',
    '簇端电压下限-一般报警恢复值',
    '簇端电压下限-一般报警恢复滤波时间',
    '簇端电压下限-严重报警值',
    '簇端电压下限-严重报警滤波时间',
    '簇端电压下限-严重报警恢复值',
    '簇端电压下限-严重报警恢复滤波时间',
    '充电电流上限-轻微报警值',
    '充电电流上限-轻微报警滤波时间',
    '充电电流上限-轻微报警恢复值',
    '充电电流上限-轻微报警恢复滤波时间',
    '充电电流上限-一般报警值',
    '充电电流上限-一般报警滤波时间',
    '充电电流上限-一般报警恢复值',
    '充电电流上限-一般报警恢复滤波时间',
    '充电电流上限-严重报警值',
    '充电电流上限-严重报警滤波时间',
    '充电电流上限-严重报警恢复值',
    '充电电流上限-严重报警恢复滤波时间',
    '放电电流上限-轻微报警值',
    '放电电流上限-轻微报警滤波时间',
    '放电电流上限-轻微报警恢复值',
    '放电电流上限-轻微报警恢复滤波时间',
    '放电电流上限-一般报警值',
    '放电电流上限-一般报警滤波时间',
    '放电电流上限-一般报警恢复值',
    '放电电流上限-一般报警恢复滤波时间',
    '放电电流上限-严重报警值',
    '放电电流上限-严重报警滤波时间',
    '放电电流上限-严重报警恢复值',
    '放电电流上限-严重报警恢复滤波时间',
    '绝缘电阻-轻微报警值',
    '绝缘电阻-轻微报警滤波时间',
    '绝缘电阻-轻微报警恢复值',
    '绝缘电阻-轻微报警恢复滤波时间',
    '绝缘电阻-一般报警值',
    '绝缘电阻-一般报警滤波时间',
    '绝缘电阻-一般报警恢复值',
    '绝缘电阻-一般报警恢复滤波时间',
    '绝缘电阻-严重报警值',
    '绝缘电阻-严重报警滤波时间',
    '绝缘电阻-严重报警恢复值',
    '绝缘电阻-严重报警恢复滤波时间',
    '温度1过温-轻微报警值',
    '温度1过温-轻微报警滤波时间',
    '温度1过温-轻微报警恢复值',
    '温度1过温-轻微报警恢复滤波时间',
    '温度1过温-一般报警值',
    '温度1过温-一般报警滤波时间',
    '温度1过温-一般报警恢复值',
    '温度1过温-一般报警恢复滤波时间',
    '温度1过温-严重报警值',
    '温度1过温-严重报警滤波时间',
    '温度1过温-严重报警恢复值',
    '温度1过温-严重报警恢复滤波时间',
    '温度2过温-轻微报警值',
    '温度2过温-轻微报警滤波时间',
    '温度2过温-轻微报警恢复值',
    '温度2过温-轻微报警恢复滤波时间',
    '温度2过温-一般报警值',
    '温度2过温-一般报警滤波时间',
    '温度2过温-一般报警恢复值',
    '温度2过温-一般报警恢复滤波时间',
    '温度2过温-严重报警值',
    '温度2过温-严重报警滤波时间',
    '温度2过温-严重报警恢复值',
    '温度2过温-严重报警恢复滤波时间',
    '温度3过温-轻微报警值',
    '温度3过温-轻微报警滤波时间',
    '温度3过温-轻微报警恢复值',
    '温度3过温-轻微报警恢复滤波时间',
    '温度3过温-一般报警值',
    '温度3过温-一般报警滤波时间',
    '温度3过温-一般报警恢复值',
    '温度3过温-一般报警恢复滤波时间',
    '温度3过温-严重报警值',
    '温度3过温-严重报警滤波时间',
    '温度3过温-严重报警恢复值',
    '温度3过温-严重报警恢复滤波时间',
    '温度4过温-轻微报警值',
    '温度4过温-轻微报警滤波时间',
    '温度4过温-轻微报警恢复值',
    '温度4过温-轻微报警恢复滤波时间',
    '温度4过温-一般报警值',
    '温度4过温-一般报警滤波时间',
    '温度4过温-一般报警恢复值',
    '温度4过温-一般报警恢复滤波时间',
    '温度4过温-严重报警值',
    '温度4过温-严重报警滤波时间',
    '温度4过温-严重报警恢复值',
    '温度4过温-严重报警恢复滤波时间',
    '温度5过温上限-轻微报警值',
    '温度5过温上限-轻微报警滤波时间',
    '温度5过温上限-轻微报警恢复值',
    '温度5过温上限-轻微报警恢复滤波时间',
    '温度5过温上限-一般报警值',
    '温度5过温上限-一般报警滤波时间',
    '温度5过温上限-一般报警恢复值',
    '温度5过温上限-一般报警恢复滤波时间',
    '温度5过温上限-严重报警值',
    '温度5过温上限-严重报警滤波时间',
    '温度5过温上限-严重报警恢复值',
    '温度5过温上限-严重报警恢复滤波时间'
  ]
  let valueArray = [
    ...processParams_Res10_Even(params, 0, 48),
    ...params.slice(48, 60),
    ...processParams_Res10_Even(params, 60, 120)
  ]
  let unitArray = [
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'A',
    'ms',
    'kΩ',
    'ms',
    'kΩ',
    'ms',
    'kΩ',
    'ms',
    'kΩ',
    'ms',
    'kΩ',
    'ms',
    'kΩ',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms'
  ]
  /*   const writeValueArray = Array.from({ length: 120 }, () => '') */
  for (let i = 0; i < 120; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    /*     let writeValue = writeValueArray[i] */
     // 根据索引确定 min 和 max 值
     let min, max
     if (i < 60) {
       // 索引 0-59 的元素
       if (i % 2 === 0) {
         // 偶数索引：min=0, max=32767
         min = 0
         max = 32767
       } else {
         // 奇数索引：min=0, max=65535
         min = 0
         max = 65535
       }
     } else if (i >= 60 && i < 120) {
       // 索引 60-119 的元素，每4个为一组
       const groupIndex = (i - 60) % 4
       switch (groupIndex) {
         case 0: // 第1个：min=-40, max=125
           min = -40
           max = 125
           break
         case 1: // 第2个：min=0, max=65535
           min = 0
           max = 65535
           break
         case 2: // 第3个：min=0, max=165
           min = 0
           max = 165
           break
         case 3: // 第4个：min=0, max=65535
           min = 0
           max = 65535
           break
       }
     }
    if (i < 24) {
      basicArray[0].element.push({ address, label, value, unit,min, max })
    } else if (i >= 24 && i < 48) {
      basicArray[1].element.push({ address, label, value, unit,min, max })
    } else if (i >= 48 && i < 60) {
      basicArray[2].element.push({ address, label, value, unit,min, max })
    } else {
      basicArray[3].element.push({ address, label, value, unit,min, max })
    }
  }
  /*   console.log(basicArray[0].element.value) */
  return basicArray
}
function getArray_ConfigAlarmBMU(params) {
  let basicArray = [
    {
      classification: 'BMU电压告警',
      element: []
    },
    {
      classification: 'BMU电路板温度告警',
      element: []
    },
    {
      classification: '动力接插件温度告警',
      element: []
    }
  ]
  let addressArray = generateRange(0x3085, 0x30d8)
  let labelArray = [
    'BMU电压上限-轻微报警值',
    'BMU电压上限-轻微报警滤波时间',
    'BMU电压上限-轻微报警恢复值',
    'BMU电压上限-轻微报警恢复滤波时间',
    'BMU电压上限-一般报警值',
    'BMU电压上限-一般报警滤波时间',
    'BMU电压上限-一般报警恢复值',
    'BMU电压上限-一般报警恢复滤波时间',
    'BMU电压上限-严重报警值',
    'BMU电压上限-严重报警滤波时间',
    'BMU电压上限-严重报警恢复值',
    'BMU电压上限-严重报警恢复滤波时间',
    'BMU电压下限-轻微报警值',
    'BMU电压下限-轻微报警滤波时间',
    'BMU电压下限-轻微报警恢复值',
    'BMU电压下限-轻微报警恢复滤波时间',
    'BMU电压下限-一般报警值',
    'BMU电压下限-一般报警滤波时间',
    'BMU电压下限-一般报警恢复值',
    'BMU电压下限-一般报警恢复滤波时间',
    'BMU电压下限-严重报警值',
    'BMU电压下限-严重报警滤波时间',
    'BMU电压下限-严重报警恢复值',
    'BMU电压下限-严重报警恢复滤波时间',
    'BMU电压压差-轻微报警值',
    'BMU电压压差-轻微报警滤波时间',
    'BMU电压压差-轻微报警恢复值',
    'BMU电压压差-轻微报警恢复滤波时间',
    'BMU电压压差-一般报警值',
    'BMU电压压差-一般报警滤波时间',
    'BMU电压压差-一般报警恢复值',
    'BMU电压压差-一般报警恢复滤波时间',
    'BMU电压压差-严重报警值',
    'BMU电压压差-严重报警滤波时间',
    'BMU电压压差-严重报警恢复值',
    'BMU电压压差-严重报警恢复滤波时间',
    'BMU电路板温度上限-轻微报警值',
    'BMU电路板温度上限-轻微报警滤波时间',
    'BMU电路板温度上限-轻微报警恢复值',
    'BMU电路板温度上限-轻微报警恢复滤波时间',
    'BMU电路板温度上限-一般报警值',
    'BMU电路板温度上限-一般报警滤波时间',
    'BMU电路板温度上限-一般报警恢复值',
    'BMU电路板温度上限-一般报警恢复滤波时间',
    'BMU电路板温度上限-严重报警值',
    'BMU电路板温度上限-严重报警滤波时间',
    'BMU电路板温度上限-严重报警恢复值',
    'BMU电路板温度上限-严重报警恢复滤波时间',
    'BMU电路板温度下限-轻微报警值',
    'BMU电路板温度下限-轻微报警滤波时间',
    'BMU电路板温度下限-轻微报警恢复值',
    'BMU电路板温度下限-轻微报警恢复滤波时间',
    'BMU电路板温度下限-一般报警值',
    'BMU电路板温度下限-一般报警滤波时间',
    'BMU电路板温度下限-一般报警恢复值',
    'BMU电路板温度下限-一般报警恢复滤波时间',
    'BMU电路板温度下限-严重报警值',
    'BMU电路板温度下限-严重报警滤波时间',
    'BMU电路板温度下限-严重报警恢复值',
    'BMU电路板温度下限-严重报警恢复滤波时间',
    'BMU电路板温度温差-轻微报警值',
    'BMU电路板温度温差-轻微报警滤波时间',
    'BMU电路板温度温差-轻微报警恢复值',
    'BMU电路板温度温差-轻微报警恢复滤波时间',
    'BMU电路板温度温差-一般报警值',
    'BMU电路板温度温差-一般报警滤波时间',
    'BMU电路板温度温差-一般报警恢复值',
    'BMU电路板温度温差-一般报警恢复滤波时间',
    'BMU电路板温度温差-严重报警值',
    'BMU电路板温度温差-严重报警滤波时间',
    'BMU电路板温度温差-严重报警恢复值',
    'BMU电路板温度温差-严重报警恢复滤波时间',
    '动力接插件温度上限-轻微报警值',
    '动力接插件温度上限-轻微报警滤波时间',
    '动力接插件温度上限-轻微报警恢复值',
    '动力接插件温度上限-轻微报警恢复滤波时间',
    '动力接插件温度上限-一般报警值',
    '动力接插件温度上限-一般报警滤波时间',
    '动力接插件温度上限-一般报警恢复值',
    '动力接插件温度上限-一般报警恢复滤波时间',
    '动力接插件温度上限-严重报警值',
    '动力接插件温度上限-严重报警滤波时间',
    '动力接插件温度上限-严重报警恢复值',
    '动力接插件温度上限-严重报警恢复滤波时间'
  ]
  let valueArray = processParams_Res10_Even(params, 0, 84)
  let unitArray = [
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    'V',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms'
  ]
  /*   const writeValueArray = Array.from({ length: 84 }, () => '') */
  for (let i = 0; i < 84; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    /*     let writeValue = writeValueArray[i] */
    // 根据索引确定 min 和 max 值
    let min, max
    if (i < 36) {
      // 索引 0-35 的元素
      if (i % 2 === 0) {
        // 偶数索引：min=0, max=3276.7
        min = 0
        max = 3276.7
      } else {
        // 奇数索引：min=0, max=65535
        min = 0
        max = 65535
      }
    } else if (i >= 36 && i < 84) {
      // 索引 36-83 的元素
      if (i % 2 === 0) {
        // 偶数索引：min=-40, max=125
        min = -40
        max = 125
      } else {
        // 奇数索引：min=0, max=65535
        min = 0
        max = 65535
      }
    }
    
    // 构建基础对象
    let elementObj = { address, label, value, unit, min, max }
    
    // 为特定参数添加note属性
    if (i === 60) {
      // BMU电路板温度温差-轻微报警值
      elementObj.note = '该告警预留，目前未使用'
    }
    
    if (i < 36) {
      basicArray[0].element.push(elementObj)
    } else if (i >= 36 && i < 72) {
      basicArray[1].element.push(elementObj)
    } else if (i >= 72 && i < 84) {
      basicArray[2].element.push(elementObj)
    } else {
      basicArray[3].element.push(elementObj)
    }
  }
  return basicArray
}
function getArray_ConfigAlarmCell1(params) {
  let basicArray = [
    {
      classification: 'Cell电压告警',
      element: []
    },
    {
      classification: 'Cell温度告警',
      element: []
    },
    {
      classification: 'CellSOC告警',
      element: []
    }
  ]
  let addressArray = generateRange(0x30e6, 0x315d)
  let labelArray = [
    '单体电压上限-轻微报警值',
    '单体电压上限-轻微报警滤波时间',
    '单体电压上限-轻微报警恢复值',
    '单体电压上限-轻微报警恢复滤波时间',
    '单体电压上限-一般报警值',
    '单体电压上限-一般报警滤波时间',
    '单体电压上限-一般报警恢复值',
    '单体电压上限-一般报警恢复滤波时间',
    '单体电压上限-严重报警值',
    '单体电压上限-严重报警滤波时间',
    '单体电压上限-严重报警恢复值',
    '单体电压上限-严重报警恢复滤波时间',
    '单体电压下限-轻微报警值',
    '单体电压下限-轻微报警滤波时间',
    '单体电压下限-轻微报警恢复值',
    '单体电压下限-轻微报警恢复滤波时间',
    '单体电压下限-一般报警值',
    '单体电压下限-一般报警滤波时间',
    '单体电压下限-一般报警恢复值',
    '单体电压下限-一般报警恢复滤波时间',
    '单体电压下限-严重报警值',
    '单体电压下限-严重报警滤波时间',
    '单体电压下限-严重报警恢复值',
    '单体电压下限-严重报警恢复滤波时间',
    '单体电压压差-轻微报警值',
    '单体电压压差-轻微报警滤波时间',
    '单体电压压差-轻微报警恢复值',
    '单体电压压差-轻微报警恢复滤波时间',
    '单体电压压差-一般报警值',
    '单体电压压差-一般报警滤波时间',
    '单体电压压差-一般报警恢复值',
    '单体电压压差-一般报警恢复滤波时间',
    '单体电压压差-严重报警值',
    '单体电压压差-严重报警滤波时间',
    '单体电压压差-严重报警恢复值',
    '单体电压压差-严重报警恢复滤波时间',
    '充电单体温度上限-轻微报警值',
    '充电单体温度上限-轻微报警滤波时间',
    '充电单体温度上限-轻微报警恢复值',
    '充电单体温度上限-轻微报警恢复滤波时间',
    '充电单体温度上限-一般报警值',
    '充电单体温度上限-一般报警滤波时间',
    '充电单体温度上限-一般报警恢复值',
    '充电单体温度上限-一般报警恢复滤波时间',
    '充电单体温度上限-严重报警值',
    '充电单体温度上限-严重报警滤波时间',
    '充电单体温度上限-严重报警恢复值',
    '充电单体温度上限-严重报警恢复滤波时间',
    '充电单体温度下限-轻微报警值',
    '充电单体温度下限-轻微报警滤波时间',
    '充电单体温度下限-轻微报警恢复值',
    '充电单体温度下限-轻微报警恢复滤波时间',
    '充电单体温度下限-一般报警值',
    '充电单体温度下限-一般报警滤波时间',
    '充电单体温度下限-一般报警恢复值',
    '充电单体温度下限-一般报警恢复滤波时间',
    '充电单体温度下限-严重报警值',
    '充电单体温度下限-严重报警滤波时间',
    '充电单体温度下限-严重报警恢复值',
    '充电单体温度下限-严重报警恢复滤波时间',
    '放电单体温度上限-轻微报警值',
    '放电单体温度上限-轻微报警滤波时间',
    '放电单体温度上限-轻微报警恢复值',
    '放电单体温度上限-轻微报警恢复滤波时间',
    '放电单体温度上限-一般报警值',
    '放电单体温度上限-一般报警滤波时间',
    '放电单体温度上限-一般报警恢复值',
    '放电单体温度上限-一般报警恢复滤波时间',
    '放电单体温度上限-严重报警值',
    '放电单体温度上限-严重报警滤波时间',
    '放电单体温度上限-严重报警恢复值',
    '放电单体温度上限-严重报警恢复滤波时间',
    '放电单体温度下限-轻微报警值',
    '放电单体温度下限-轻微报警滤波时间',
    '放电单体温度下限-轻微报警恢复值',
    '放电单体温度下限-轻微报警恢复滤波时间',
    '放电单体温度下限-一般报警值',
    '放电单体温度下限-一般报警滤波时间',
    '放电单体温度下限-一般报警恢复值',
    '放电单体温度下限-一般报警恢复滤波时间',
    '放电单体温度下限-严重报警值',
    '放电单体温度下限-严重报警滤波时间',
    '放电单体温度下限-严重报警恢复值',
    '放电单体温度下限-严重报警恢复滤波时间',
    '单体温度温差-轻微报警值',
    '单体温度温差-轻微报警滤波时间',
    '单体温度温差-轻微报警恢复值',
    '单体温度温差-轻微报警恢复滤波时间',
    '单体温度温差-一般报警值',
    '单体温度温差-一般报警滤波时间',
    '单体温度温差-一般报警恢复值',
    '单体温度温差-一般报警恢复滤波时间',
    '单体温度温差-严重报警值',
    '单体温度温差-严重报警滤波时间',
    '单体温度温差-严重报警恢复值',
    '单体温度温差-严重报警恢复滤波时间',
    '单体soc上限-轻微报警值',
    '单体soc上限-轻微报警滤波时间',
    '单体soc上限-轻微报警恢复值',
    '单体soc上限-轻微报警恢复滤波时间',
    '单体soc上限-一般报警值',
    '单体soc上限-一般报警滤波时间',
    '单体soc上限-一般报警恢复值',
    '单体soc上限-一般报警恢复滤波时间',
    '单体soc上限-严重报警值',
    '单体soc上限-严重报警滤波时间',
    '单体soc上限-严重报警恢复值',
    '单体soc上限-严重报警恢复滤波时间',
    '单体soc下限-轻微报警值',
    '单体soc下限-轻微报警滤波时间',
    '单体soc下限-轻微报警恢复值',
    '单体soc下限-轻微报警恢复滤波时间',
    '单体soc下限-一般报警值',
    '单体soc下限-一般报警滤波时间',
    '单体soc下限-一般报警恢复值',
    '单体soc下限-一般报警恢复滤波时间',
    '单体soc下限-严重报警值',
    '单体soc下限-严重报警滤波时间',
    '单体soc下限-严重报警恢复值',
    '单体soc下限-严重报警恢复滤波时间'
  ]
  let valueArray = [...params.slice(0, 36), ...processParams_Res10_Even(params, 36, 120)]
  let unitArray = [
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    'mV',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '℃',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms',
    '%',
    'ms'
  ]
  /*   const writeValueArray = Array.from({ length: 120 }, () => '') */
  for (let i = 0; i < 120; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    /*     let writeValue = writeValueArray[i] */
    // 根据索引确定 min 和 max 值
    let min, max
    if (i < 36) {
      // 索引 0-35 的元素
      if (i % 2 === 0) {
        // 偶数索引：min=0, max=5000
        min = 0
        max = 5000
      } else {
        // 奇数索引：min=0, max=65535
        min = 0
        max = 65535
      }
    } else if (i >= 36 && i < 84) {
      // 索引 36-83 的元素
      if (i % 2 === 0) {
        // 偶数索引：min=-40, max=125
        min = -40
        max = 125
      } else {
        // 奇数索引：min=0, max=65535
        min = 0
        max = 65535
      }
    } else if (i >= 84 && i < 96) {
      // 索引 84-95 的元素
      if (i % 2 === 0) {
        // 偶数索引：min=0, max=165.0
        min = 0
        max = 165.0
      } else {
        // 奇数索引：min=0, max=65535
        min = 0
        max = 65535
      }
    } else {
      // 索引 96-119 的元素
      if (i % 2 === 0) {
        // 偶数索引：min=0, max=100.0
        min = 0
        max = 110.0
      } else {
        // 奇数索引：min=0, max=65535
        min = 0
        max = 65535
      }
    }

    if (i < 36) {
      basicArray[0].element.push({ address, label, value, unit,min, max })
    } else if (i >= 36 && i < 96) {
      basicArray[1].element.push({ address, label, value, unit,min, max })
    } else if (i >= 96 && i < 120) {
      basicArray[2].element.push({ address, label, value, unit,min, max })
    }
  }
  return basicArray
}
function getArray_ConfigAlarmCell2(params) {
  let basicArray = [
    {
      classification: 'CellSOC告警',
      element: []
    }
  ]
  let addressArray = generateRange(0x315e, 0x3169)
  let labelArray = [
    '单体soc差异-轻微报警值',
    '单体soc差异-轻微报警滤波时间',
    '单体soc差异-轻微报警恢复值',
    '单体soc差异-轻微报警恢复滤波时间',
    '单体soc差异-一般报警值',
    '单体soc差异-一般报警滤波时间',
    '单体soc差异-一般报警恢复值',
    '单体soc差异-一般报警恢复滤波时间',
    '单体soc差异-严重报警值',
    '单体soc差异-严重报警滤波时间',
    '单体soc差异-严重报警恢复值',
    '单体soc差异-严重报警恢复滤波时间'
  ]
  let valueArray = processParams_Res10_Even(params, 0, 12)
  let unitArray = ['%', 'ms', '%', 'ms', '%', 'ms', '%', 'ms', '%', 'ms', '%', 'ms']
  /*   const writeValueArray = Array.from({ length: 12 }, () => '') */
  for (let i = 0; i < 12; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    /*     let writeValue = writeValueArray[i] */
        // 根据索引确定 min 和 max 值
        let min, max
        if (i < 12) {
          // 索引 0-47 的元素
          if (i % 2 === 0) {
            // 偶数索引：min=0, max=100
            min = 0
            max = 110
          } else {
            // 奇数索引：min=0, max=65535
            min = 0
            max = 65535
          }
        }
    basicArray[0].element.push({ address, label, value, unit,min, max })
  }
  return basicArray
}
function regNumComb_SOXConfig(reg1Value, reg2Value) {
  if (typeof reg1Value !== 'number' || typeof reg2Value !== 'number') {
    throw new Error('reg1Value 和 reg2Value 必须是数字')
  }

  // 小端模式：reg1是低16位，reg2是高16位
  // 组合为32位无符号整数
  const combinedValue = ((reg2Value << 16) | reg1Value) >>> 0
  return combinedValue
}
function regNumComb_Float(reg1Value, reg2Value) {
  if (typeof reg1Value !== 'number' || typeof reg2Value !== 'number') {
    throw new Error('reg1Value 和 reg2Value 必须是数字')
  }

  // 创建 4 字节缓冲区
  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)

  // 小端字节交换模式：reg2在前(高16位)，reg1在后(低16位)
  // 每个寄存器内部保持大端序
  view.setUint16(0, reg2Value, false) // reg2放在前面（高16位），大端序
  view.setUint16(2, reg1Value, false) // reg1放在后面（低16位），大端序

  // 读取为 IEEE 754 单精度浮点数（大端序）
  return view.getFloat32(0, false) // false = 大端序
}

// 反向函数：将32位float拆解为两个16位寄存器值（使用小端字节交换模式）
function floatToRegisters(floatValue) {
  if (typeof floatValue !== 'number') {
    throw new Error('floatValue 必须是数字')
  }

  // 创建 4 字节缓冲区
  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)

  // 将float写入缓冲区（使用大端序）
  view.setFloat32(0, floatValue, false)

  // 小端字节交换模式：reg2在前(offset 0)，reg1在后(offset 2)
  // 每个寄存器内部保持大端序
  return {
    reg1: view.getUint16(2, false), // reg1从offset 2读取（低16位）
    reg2: view.getUint16(0, false) // reg2从offset 0读取（高16位）
  }
}

function getArray_AccumAh(params) {
  let basicArray = [
    {
      classification: '实时保存的SOX数据',
      element: []
    }
  ]
  let addressArray = [
    '0x3272',
    /*    '0x3234', */
    '0x3274',
    /*  '0x3236', */
    '0x3276',
    /*  '0x3238', */
    '0x3278'
  ]
  let idArray = [900, 901, 902, 903]
  let labelArray = [
    '累计充电电量',
    '累计放电电量',
    '累计充电容量',
    '累计放电容量',
    '故障保护次数',
    '电压越限次数',
    '温度越限次数'
  ]
  let valueArray = [
    regNumComb_SOXConfig(params[0], params[1]), //累计充电电量
    regNumComb_SOXConfig(params[2], params[3]), //累计放电电量
    regNumComb_SOXConfig(params[4], params[5]), //累计充电容量
    regNumComb_SOXConfig(params[6], params[7]) //累计放电容量
  ]
  let unitArray = ['kWh', 'kWh', 'Ah', 'Ah']
  /*   const writeValueArray = Array.from({ length: 49 }, () => '') */
  for (let i = 0; i < 4; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    let id = idArray[i]
    /*  let writeValue = writeValueArray[i] */
    basicArray[0].element.push({ id, address, label, value, unit })
  }
  /*   console.log(valueArray) */
  return basicArray
}

function getArray_ConfigSOX1(params) {
  let basicArray = [
    {
      classification: '实时保存的SOX数据',
      element: []
    }
  ]
  let addressArray = [
    '0x3200', //簇端显示SOC
    ...generateRange(0x3201, 0x3220), //32个bmu最大soc
    ...generateRange(0x3221, 0x3240), //32个bmu最小soc
    '0x326f', //簇端SOE
    '0x3270', //充电效率
    '0x3271', //可用电量
    '0x3272-0x3273', //累计充电电量
    '0x3274-0x3275', //累计放电电量
    '0x3276-0x3277', //累计充电容量
    '0x3278-0x3279', //累计放电容量
    '0x327E', //故障保护次数
    '0x327F', //电压越限次数
    '0x3280', //温度越限次数
    ...generateRange(0x3244, 0x3263), //前一次在线SOH--前一次触发时间32个参数
    '0x3264-0x3265', //循环次数
    '0x3266-0x3267', //SOH计算-充电累积安时
    '0x3268-0x3269', //SOH计算-放电累积安时
    '0x326A', //SOH上电初始化标志位
    '0x326B' //存储的SOH当前更新容量
  ] //112
  let labelArray = [
    '簇端显示SOC',
    ...Array.from({ length: 32 }, (_, index) => `BMU${index + 1}最大SOC`),
    ...Array.from({ length: 32 }, (_, index) => `BMU${index + 1}最小SOC`),
    '簇端SOE',
    '充电效率',
    '可用电量',
    '累计充电电量',
    '累计放电电量',
    '累计充电容量',
    '累计放电容量',
    '故障保护次数',
    '电压越限次数',
    '温度越限次数',
    '前一次在线SOH',
    ...Array.from({ length: 10 }, (_, index) => `保存的历史10个SOH值-${index + 1}`),
    ...Array.from({ length: 10 }, (_, index) => `保存的10个历史工况权重值-${index + 1}`),
    ...Array.from({ length: 10 }, (_, index) => `保存的10个历史时间间隔-${index + 1}`),
    '前一次触发时间',
    '循环次数',
    'SOH计算-充电累积安时',
    'SOH计算-放电累积安时',
    'SOH上电初始化标志位',
    '存储的SOH当前更新容量'
  ] //112
  let valueArray = [
    ...processParams_Res10(params, 0, 65), //65个参数
    (params[108] / 10).toFixed(1), //SOE
    (params[109] / 100).toFixed(2), //充电效率
    (params[110] / 100).toFixed(2), //可用电量
    regNumComb_SOXConfig(params[111], params[112]), //累计充电电量
    regNumComb_SOXConfig(params[113], params[114]), //累计放电电量
    regNumComb_SOXConfig(params[115], params[116]), //累计充电容量
    regNumComb_SOXConfig(params[117], params[118]), //累计放电容量
    params[123], //故障保护次数
    params[124], //电压越限次数
    params[125], //温度越限次数
    (params[68] / 10).toFixed(1), //前一次在线soh
    ...processParams_Res10(params, 69, 79), //保存的历史10个SOH值
    ...params.slice(79, 100), //保存的10个历史工况权重值、时间间隔、前一次触发时间
    regNumComb_SOXConfig(params[100], params[101]), //循环次数
    regNumComb_Float(params[102], params[103]).toFixed(1), //SOH计算-充电累积安时
    regNumComb_Float(params[104], params[105]).toFixed(1), //SOH计算-放电累积安时
    params[106], //SOH上电初始化标志位
    (params[107] / 10).toFixed(1) //存储的SOH当前更新容量
  ] //112
  let unitArray = [
    ...Array.from({ length: 67 }, () => '%'),
    'kWh',
    'kWh',
    'kWh',
    'Ah',
    'Ah',
    '/',
    '/',
    '/',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '%',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/',
    'Ah',
    'Ah',
    '/',
    'Ah'
  ]
  let minArray = Array.from({ length: 112 }, () => 0)
  let maxArray = [
    ...Array.from({ length: 65 }, () => 100.0),
    100.0,
    100.0,
    655.35,
    ...Array.from({ length: 4 }, () => 4294967295),
    ...Array.from({ length: 3 }, () => 65535),
    ...Array.from({ length: 11 }, () => 100.0),
    ...Array.from({ length: 10 }, () => 13),
    ...Array.from({ length: 11 }, () => 65535),
    4294967295, //  循环次数

    ...Array.from({ length: 2 }, () => 429496729.5),
    1,
    6553.5,
  ]
  /*   const writeValueArray = Array.from({ length: 49 }, () => '') */
  for (let i = 0; i < 112; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    let min = minArray[i]
    let max = maxArray[i]
    /*  let writeValue = writeValueArray[i] */
    // 为后面的37个参数(索引75-111)添加不允许编辑的属性
    let readonly = i >= 75
    basicArray[0].element.push({ address, label, value, unit, readonly, min, max })
  }
  /*   console.log(valueArray) */
  return basicArray
}
function getArray_ConfigSOX2(params) {
  /*  console.log(params) */
  let basicArray = [
    {
      classification: 'SOX通用参数',
      element: []
    },
    {
      classification: 'SOC配置参数',
      element: []
    }
  ]
  let addressArray = [
    ...generateRange(0x5300, 0x530a),
    ...generateRange(0x530d, 0x5311),
    '0x5312-0x5313',
    '0x5314-0x5315',
    ...generateRange(0x5316, 0x5374)
  ]
  let labelArray = [
    '有效电芯数量',
    '电芯实际容量',
    '电芯额定容量',
    '电芯满电电压值',
    '电芯放空电压值',
    '电芯电流上限值',
    '电芯电流下限值',
    '电芯温度上限值',
    '电芯温度下限值',
    '电芯电压上限值',
    '电芯电压下限值',
    'RackSOC SOC取值阈值上限值',
    'RackSOC SOC取值阈值下限值',
    'SOC低端校准上限电压',
    'SOC高端校准下限电压',
    'SOC静置校准温度',
    'SOC静置常温校准时间',
    'SOC静置低温校准时间',
    'SOC静置校准电流触发阈值',
    'SOC静置校准温度触发阈值',
    '休眠唤醒校准时间与温度对应表_时间-20℃',
    '休眠唤醒校准时间与温度对应表_时间-10℃',
    '休眠唤醒校准时间与温度对应表_时间0℃',
    '休眠唤醒校准时间与温度对应表_时间10℃',
    '休眠唤醒校准时间与温度对应表_时间25℃',
    '休眠唤醒校准时间与温度对应表_时间45℃',
    '休眠唤醒校准时间与温度对应表_温度-20℃',
    '休眠唤醒校准时间与温度对应表_温度-10℃',
    '休眠唤醒校准时间与温度对应表_温度0℃',
    '休眠唤醒校准时间与温度对应表_温度10℃',
    '休眠唤醒校准时间与温度对应表_温度25℃',
    '休眠唤醒校准时间与温度对应表_温度45℃',
    '显示SOC与RackSOC差值范围',
    '显示SOC追随真实SOC时间',
    '簇欠压阈值',
    '簇过压阈值',
    'SOH循环次数下发',
    '充电OCV表（电压输入）-15%',
    '充电OCV表（电压输入）-20%',
    '充电OCV表（电压输入）-25%',
    '充电OCV表（电压输入）-30%',
    '充电OCV表（电压输入）-35%',
    '充电OCV表（电压输入）-40%',
    '充电OCV表（电压输入）-45%',
    '充电OCV表（电压输入）-50%',
    '充电OCV表（电压输入）-55%',
    '充电OCV表（电压输入）-60%',
    '充电OCV表（电压输入）-65%',
    '充电OCV表（电压输入）-70%',
    '充电OCV表（电压输入）-75%',
    '充电OCV表（电压输入）-80%',
    '充电OCV表（电压输入）-85%',
    '充电OCV表（电压输入）-90%',
    '充电OCV表（电压输入）-95%',
    '充电OCV表（电压输入）-100%',
    '放电OCV表（电压输入）-0%',
    '放电OCV表（电压输入）-5%',
    '放电OCV表（电压输入）-10%',
    '放电OCV表（电压输入）-15%',
    '放电OCV表（电压输入）-20%',
    '放电OCV表（电压输入）-25%',
    '放电OCV表（电压输入）-30%',
    '放电OCV表（电压输入）-35%',
    '放电OCV表（电压输入）-40%',
    '放电OCV表（电压输入）-45%',
    '放电OCV表（电压输入）-50%',
    '放电OCV表（电压输入）-55%',
    '放电OCV表（电压输入）-60%',
    '放电OCV表（电压输入）-65%',
    '放电OCV表（电压输入）-70%',
    '放电OCV表（电压输入）-75%',
    '放电OCV表（电压输入）-80%',
    '放电OCV表（电压输入）-85%',
    '放电OCV表（电压输入）-90%',
    '放电OCV表（电压输入）-95%',
    '放电OCV表（电压输入）-100%',
    '充电修正电压拐点表（97%）-1/10C',
    '充电修正电压拐点表（97%）-1/4C',
    '充电修正电压拐点表（97%）-1/2C',
    '充电修正电压拐点表（97%）-3/4C',
    '充电修正电压拐点表（97%）-1C',
    '充电修正电压拐点表（97%）-3/2C',
    '充电修正步长表（97%）-1/10C',
    '充电修正步长表（97%）-1/4C',
    '充电修正步长表（97%）-1/2C',
    '充电修正步长表（97%）-3/4C',
    '充电修正步长表（97%）-1C',
    '充电修正步长表（97%）-3/2C',
    '充电修正电流区间点-1/10C',
    '充电修正电流区间点-1/4C',
    '充电修正电流区间点-1/2C',
    '充电修正电流区间点-3/4C',
    '充电修正电流区间点-1C',
    '充电修正电流区间点-3/2C',
    '97%点追赶时间',
    '充电修正电压拐点表（99%）-1/10C',
    '充电修正电压拐点表（99%）-1/4C',
    '充电修正电压拐点表（99%）-1/2C',
    '充电修正电压拐点表（99%）-3/4C',
    '充电修正电压拐点表（99%）-1C',
    '充电修正电压拐点表（99%）-3/2C',
    '充电修正步长表（99%）-1/10C',
    '充电修正步长表（99%）-1/4C',
    '充电修正步长表（99%）-1/2C',
    '充电修正步长表（99%）-3/4C',
    '充电修正步长表（99%）-1C',
    '充电修正步长表（99%）-3/2C',
    '99%点追赶时间',
    '放电修正电压拐点_1/2C',
    '放电修正电压拐点_1/4C',
    '充放电修正电流_1/4C',
    '充放电修正电流_1/2C',
    '放电拐点真实SOC追赶时间'
  ]

  /*     console.log(params.slice(30, 38))
  console.log(params.slice(30, 38).map((item) => parseFloat((item / 10).toFixed(1))))
  console.log((params[30] / 10).toFixed(1)) */
  let valueArray = [
    params[0],
    (params[1] / 10).toFixed(1),
    (params[2] / 10).toFixed(1),
    params[3],
    params[4],
    ...processParams_Res10(params, 5, 9),
    params[9],
    params[10],

    (params[13] / 10).toFixed(1),
    (params[14] / 10).toFixed(1),
    params[15],
    params[16],
    (modbusToSigned16(params[17]) / 10).toFixed(1), //SOC静置校准温度
    (regNumComb_SOXConfig(params[18], params[19]) / 10).toFixed(1),
    (regNumComb_SOXConfig(params[20], params[21]) / 10).toFixed(1),
    (modbusToSigned16(params[22]) / 10).toFixed(1),
    (modbusToSigned16(params[23]) / 10).toFixed(1), //SOC静置校准温度触发阈值

    ...params.slice(24, 30), //休眠唤醒校准时间与温度对应表_时间
    ...processParams_Res10_signed(params, 30, 36), //休眠唤醒校准时间与温度对应表_温度
    (params[36] / 10).toFixed(1), //显示SOC与RackSOC差值范围
    (params[37] / 10).toFixed(1), //显示SOC追随真实SOC时间
    (params[38] / 10).toFixed(1), //簇欠压阈值
    (params[39] / 10).toFixed(1), //簇过压阈值
    params[40], //SOH循环次数下发
    ...params.slice(41, 92), //充电OCV表（电压输入）*18
    ...processParams_Res10_signed(params, 92, 98), //充电修正电流区间点*6
    (params[98] / 10).toFixed(1), //97%点追赶时间
    ...params.slice(99, 111),
    (params[111] / 10).toFixed(1),
    params[112],
    params[113],
    ...processParams_Res10(params, 114, 117)
  ]
  let unitArray = [
    '/',
    'Ah',
    'Ah',
    'mV',
    'mV',
    'A',
    'A',
    '℃',
    '℃',
    'mV',
    'mV',
    '%',
    '%',
    'mV',
    'mV',
    '℃',
    's',
    's',
    'A',
    '℃',
    's',
    's',
    's',
    's',
    's',
    's',
    '℃',
    '℃',
    '℃',
    '℃',
    '℃',
    '℃',
    '%',
    's',
    'V',
    'V',
    '/',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'A',
    'A',
    'A',
    'A',
    'A',
    'A',
    's',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    'mV',
    's',
    'mV',
    'mV',
    'A',
    'A',
    's'
  ]
  let minArray = [
    ...Array.from({ length: 5 }, () => 0),
    ...Array.from({ length: 2 }, () => -3276.7),
    ...Array.from({ length: 2 }, () => -40),
    ...Array.from({ length: 2 }, () => 0),
    ...Array.from({ length: 4 }, () => 0),
    -40,
    0, //SOC静置常温校准时间
    0, //SOC静置低温校准时间
    -3276.7, //SOC静置校准电流触发阈值
    -40, //SOC静置校准温度触发阈值
    ...Array.from({ length: 6 }, () => 0),
    ...Array.from({ length: 6 }, () => -40),
    ...Array.from({ length: 56 }, () => 0), //显示SOC与RackSOC差值范围-充电修正步长表*6
    ...Array.from({ length: 6 }, () => -3276.7), //充电修正电流区间点*6
    ...Array.from({ length: 16 }, () => 0), //97%点追赶时间-放电修正电压拐点-0.25C
    ...Array.from({ length: 2 }, () => -3276.7),
    0
  ]
  let maxArray = [
    65535,
    ...Array.from({ length: 2 }, () => 6553.5),
    ...Array.from({ length: 2 }, () => 5000),
    ...Array.from({ length: 2 }, () => 3276.7),
    ...Array.from({ length: 2 }, () => 125),
    ...Array.from({ length: 2 }, () => 5000),
    ...Array.from({ length: 2 }, () => 6553.5),
    ...Array.from({ length: 2 }, () => 5000),
    125,
    429496729.5, //SOC静置常温校准时间
    429496729.5, //SOC静置低温校准时间
    3276.7, //SOC静置校准电流触发阈值
    125, //SOC静置校准温度触发阈值
    ...Array.from({ length: 6 }, () => 65535),
    ...Array.from({ length: 6 }, () => 125),
    100, //显示SOC与RackSOC差值范围
    ...Array.from({ length: 3 }, () => 6553.5),
    65535,
    ...Array.from({ length: 51 }, () => 5000),
    ...Array.from({ length: 6 }, () => 3276.7), //充电修正电流区间点*6
    6553.5,
    ...Array.from({ length: 12 }, () => 5000),
    6553.5,
    ...Array.from({ length: 2 }, () => 5000),
    ...Array.from({ length: 2 }, () => 3276.7),
    6553.5,
  ]
  /*  const writeValueArray = Array.from({ length: 113 }, () => '') */
  for (let i = 0; i < 113; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    let min = minArray[i]
    let max = maxArray[i]
    /*     let writeValue = writeValueArray[i] */
    if (i < 11) basicArray[0].element.push({ address, label, value, unit, min, max })
    else if (11 <= i < 113) basicArray[1].element.push({ address, label, value, unit, min, max })
  }
  return basicArray
}
function getArray_ConfigSOX3(params) {
  let basicArray = [
    {
      classification: 'SOH配置参数',
      element: []
    }
  ]
  let addressArray = [
    ...generateRange(0x5379, 0x5386),
    '0x5387-0x5388',
    '0x5389-0x538a',
    '0x538B-0x538C',
    '0x538D-0x538E',
    ...generateRange(0x538f, 0x5393)
  ]
  let labelArray = [
    'SOH计算条件，温度下限',
    '最大最小soc差值',
    '电池放电容量最大百分比值',
    'SOH校准上限值SOC值',
    '电芯循环次数对应的SOH值-1',
    '电芯循环次数对应的SOH值-2',
    '电芯循环次数-1',
    '电芯循环次数-2',
    'SOC变化权重值-1',
    'SOC变化权重值-2',
    'SOC变化值-1',
    'SOC变化值-2',
    '计算的SOH值范围上限-1',
    '计算的SOH值范围下限-2',
    '时间间隔对应权重-1',
    '时间间隔对应权重-2',
    '时间间隔对应权重-3',
    '时间间隔对应权重-4',
    'SOH计算时间间隔-1',
    'SOH计算时间间隔-2',
    'SOH计算时间间隔-3',
    'SOH计算时间间隔-4'
  ]
  let valueArray = [
    ...processParams_Res10_signed(params, 0, 1),
    ...processParams_Res10(params, 1, 6),
    params[6],
    params[7],
    ...processParams_Res10(params, 8, 14),
    (regNumComb_SOXConfig(params[14], params[15]) / 100).toFixed(2),
    (regNumComb_SOXConfig(params[16], params[17]) / 100).toFixed(2),
    (regNumComb_SOXConfig(params[18], params[19]) / 100).toFixed(2),
    (regNumComb_SOXConfig(params[20], params[21]) / 100).toFixed(2),
    ...params.slice(22, 26)
  ]
  let unitArray = [
    '℃',
    '%',
    '%',
    '%',
    '%',
    '%',
    '/',
    '/',
    '/',
    '/',
    '%',
    '%',
    '%',
    '%',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/',
    '/'
  ]
  let minArray = [-40, ...Array.from({ length: 26 }, () => 0)]
  let maxArray = [
    125,
    ...Array.from({ length: 5 }, () => 100.0),
    ...Array.from({ length: 2 }, () => 65535),
    ...Array.from({ length: 2 }, () => 6553.5),
    ...Array.from({ length: 2 }, () => 100.0),
    ...Array.from({ length: 2 }, () => 120.0),
    ...Array.from({ length: 4 }, () => 42949672.95),
    ...Array.from({ length: 9 }, () => 65535)
  ]
  /*   const writeValueArray = Array.from({ length: 22 }, () => '') */
  for (let i = 0; i < 22; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    let min = minArray[i]
    let max = maxArray[i]
    /* let writeValue = writeValueArray[i] */
    basicArray[0].element.push({ address, label, value, unit, min, max })
  }
  return basicArray
}
function getUpgradeData(params) {
  let upgradeData = [
    {
      classification: '升级反馈信息',
      element: [
        {
          label: '升级设备类型',
          value: parseConfig('upgradeStyle', params[0]),
          row: params[0].toString(16)
        },
        {
          label: '升级文件下载完成标志',
          value: parseConfig('upgradeBCUFinishFlag', params[1]),
          row: params[1].toString(16)
        },
        {
          label: 'BMU升级标志',
          value: parseConfig('finishInfo', params[2]),
          row: params[2].toString(16)
        },
        {
          label: 'OTA文件下载错误码',
          value: parseConfig('OTAFault', params[3]),
          row: params[3].toString(16)
        },
        {
          label: 'BCU升级故障码',
          value: parseConfig('BCUUpgradeFault', params[4]),
          row: params[4].toString(16)
        },
        {
          label: 'BMU升级故障码',
          value: parseConfig('BMUUpgradeFault', params[5]),
          row: params[5].toString(16)
        },
        {
          label: 'BMU升级失败设备',
          value: parseConfig('BMUUpgradeFaultDevice', params[6]),
          row: params[6].toString(16)
        },
        {
          label: 'BMU程序总包数',
          value: params[8],
          row: params[8]
        },
        {
          label: 'BMU下载当前包序号',
          value: params[9],
          row: params[9]
        }
      ]
    }
  ]

  return upgradeData
}
function getAdaptData(params) {
  /*   console.log(params) */
  let adaptData = [
    {
      classification: 'BMU自适应反馈信息',
      element: [
        {
          label: 'BCU执行标识-状态',
          value: parseConfig('BMUAdaptStatus', params[0]),
          row: params[0].toString(16)
        },
        {
          label: 'BCU执行标识-内容1',
          value: parseConfig('BMUAdaptProgress1', params[1]),
          row: params[1].toString(16)
        },
        {
          label: 'BCU执行标识-内容2',
          value: params[2].toString(16),
          row: params[2].toString(16)
        },
        {
          label: 'BCU执行标识-内容3',
          value: parseConfig('BMUAdaptProgress3', params[3]),
          row: params[3].toString(16)
        }
      ]
    }
  ]
  /*   adaptData.forEach((item) => {
    console.log(item.element)
  }) */
  return adaptData
}
const upgradeDataParsers = {
  upgradeStyle: {
    mapping: {
      '0xa001': 'BCU升级',
      '0xa002': 'BMU升级'
    },
    default: '无效'
  },
  upgradeBCUFinishFlag: {
    mapping: {
      '0x5bb5': '下载完成'
    },
    default: '无效'
  },
  finishInfo: {
    mapping: {
      '0x0000': '无效',
      '0x5bb5': '升级执行中……',
      '0xb0a1': '单机升级完成',
      '0xb0b1': '单机升级失败',
      '0xb0a2': '广播升级完成',
      '0xb0b2': '广播升级失败',
      '0xb0a3': '强制单机升级完成',
      '0xb0b3': '强制单机升级失败',
      '0xb0a4': '强制广播升级完成',
      '0xb0b4': '强制广播升级失败'
    },
    default: '未知状态'
  },
  OTAFault: {
    mapping: {
      '0x0000': '无故障',
      '0x0001': '服务器名称无效',
      '0x0002': '连接服务器失败,请检查所选ip网卡网段是否与BCU一致',
      '0x0003': '登录服务器失败',
      '0x0004': '打开文件失败',
      '0x0005': '读取文件失败',
      '0x0006': '服务器端终止',
      '0x0007': '文件头部CRC校验错误',
      '0x0008': '文件类型不匹配',
      '0x0009': '文件大小超限',
      '0x000a': 'FLASH擦除失败',
      '0x000b': 'FLASH编程错误',
      '0x000c': 'FLASH读取错误',
      '0x000d': 'OTA文件CRC32校验错误',
      '0x000e': '系统状态错误',
      '0x000f': '文件写入次数过多'
    },
    default: '未知错误'
  },
  BCUUpgradeFault: {
    mapping: {
      '0x0000': '无故障'
    },
    default: '未知错误'
  },
  BMUUpgradeFault: {
    mapping: {
      '0x0000': '无故障',
      '0x0001': 'BMU应答数量过多',
      '0x0002': 'BMU应答数量过少',
      '0x0003': '存在BMU应答升级失败',
      '0x0004': '地址错误',
      '0x0005': '地址超限',
      '0x0006': '请求升级帧应答超时',
      '0x0007': 'Pack开始帧应答超时',
      '0x0008': 'Pack结束帧应答超时',
      '0x0009': '退出帧应答超时',
      '0x000a': '完成帧应答超时',
      '0x000b': '包开始-应答包错误',
      '0x000c': '包结束-应答包错误',
      '0x000d': '完成-应答包错误'
    },
    default: '未知错误'
  },
  BMUUpgradeFaultDevice: {
    parse: (input) => {
      const binaryStr = input.toString(2).padStart(16, '0')
      const failedBMUs = []
      for (let i = 0; i < 16; i++) {
        const bitPos = 15 - i
        if (binaryStr[bitPos] === '1') {
          failedBMUs.push(`BMU${i + 1}`)
        }
      }
      return failedBMUs.length ? `${failedBMUs.join('，')}升级失败` : '无故障设备'
    },
    default: '未知错误'
  },
  BMUAdaptStatus: {
    mapping: {
      '0x0000': '未启动',
      '0x00c1': 'BMU自适应地址已启动',
      '0x00c2': 'BMU自适应地址成功',
      '0x00c3': 'BMU自适应地址失败'
    },
    default: '未知状态'
  },
  BMUAdaptProgress1: {
    mapping: {
      '0x0000': '未启动',
      '0xa11a': '地址自适应启动失败',
      '0xc11c': '地址分配准备失败',
      '0xc22c': '地址分配失败'
    },
    default: '未知错误'
  },
  BMUAdaptProgress2: {
    mapping: {},
    default: '未知错误'
  },
  BMUAdaptProgress3: {
    mapping: {
      '0x0000': '未启动',
      '0x00c1': '应答超时',
      '0x00c2': '应答帧过多',
      '0x00c3': '地址分配超限'
    },
    default: '未知错误'
  }
}
function parseConfig(type, input) {
  const parser = upgradeDataParsers[type]
  if (!parser) return '未知配置类型'

  // 转换输入值为十进制数值
  const numValue = Number(input)
  if (isNaN(numValue)) return parser.default

  // 生成带0x前缀的十六进制键（关键修复）
  const hexKey = '0x' + numValue.toString(16).toLowerCase().padStart(4, '0')
  // 特殊处理动态解析类型
  if (typeof parser.parse === 'function') {
    try {
      return parser.parse(numValue) || parser.default
    } catch {
      return parser.default
    }
  }

  // 直接匹配十六进制键
  return parser.mapping[hexKey.toLowerCase()] || parser.default
}
// 处理基础BMU状态
function getDisconnectArrayNum(params) {
  let array = []
  array.push({
    classification: '失联信息',
    element: [
      { label: 'BMU失联数量', value: params[0] },
      { label: 'AFE失联数量', value: params[1] },
      { label: '电芯电压断线数量', value: params[2] },
      { label: '电芯温度断线数量', value: params[3] }
    ]
  })
  return array
}
function getDisconnectArrayBMU(params, bmuTotal) {
  const result = []

  // BMU失联状态（寄存器0-1）
  const processStatus = (regData, startBMU, prefix) => {
    const element = []
    for (let bit = 0; bit < 16; bit++) {
      const bmuId = startBMU + bit + 1
      if (bmuId > bmuTotal) break
      element.push({
        label: `BMU${bmuId}`,
        value: (regData >> bit) & 1 ? '正常' : '掉线'
      })
    }
    return element
  }

  // BMU失联状态
  result.push({
    classification: 'BMU连接状态',
    element: [...processStatus(params[0], 0, ''), ...processStatus(params[1], 16, '')].slice(
      0,
      bmuTotal
    )
  })

  // 动力接插件温度掉线状态（寄存器2-5）
  result.push({
    classification: '动力接插件-1',
    element: processStatus(params[2], 0).slice(0, Math.min(bmuTotal, 16))
  })

  // BMU-1号动力接插件温度掉线状态-2：寄存器3，对应BMU17-32（当BMU总数超过16时）
  if (bmuTotal > 16) {
    result.push({
      classification: '动力接插件-1',
      element: processStatus(params[3], 16).slice(0, Math.min(bmuTotal - 16, 16))
    })
  }

  // BMU-2号动力接插件温度掉线状态-1：寄存器4，对应BMU1-16
  result.push({
    classification: '动力接插件-2',
    element: processStatus(params[4], 0).slice(0, Math.min(bmuTotal, 16))
  })

  // BMU-2号动力接插件温度掉线状态-2：寄存器5，对应BMU17-32（当BMU总数超过16时）
  if (bmuTotal > 16) {
    result.push({
      classification: '动力接插件-2',
      element: processStatus(params[5], 16).slice(0, Math.min(bmuTotal - 16, 16))
    })
  }

  return result
}

// 通用掉线状态处理
function getDisconnectArrayCellVT(params, classification, cellsPerBMU, bmuTotal, totalRegisters) {
  const result = []

  // 新的连续bit排布解析逻辑
  for (let bmuIdx = 0; bmuIdx < bmuTotal; bmuIdx++) {
    const element = []
    const startBit = bmuIdx * cellsPerBMU
    const endBit = startBit + cellsPerBMU - 1

    for (let regIdx = 0; regIdx < totalRegisters; regIdx++) {
      const regData = params[regIdx] || 0
      const regStartBit = regIdx * 16

      for (let bit = 0; bit < 16; bit++) {
        const globalBit = regStartBit + bit
        if (globalBit >= startBit && globalBit <= endBit) {
          const localCellId = globalBit - startBit + 1
          if (localCellId <= cellsPerBMU) {
            element.push({
              label: `BMU${bmuIdx + 1}-#${localCellId}`,
              value: (regData >> bit) & 1 ? '掉线' : '正常'
            })
          }
        }
      }
    }

    result.push({
      classification: `${classification} BMU${bmuIdx + 1}`,
      element: element
    })
  }

  return result
}

// 处理AFE通讯状态异常
function getDisconnectArrayAFE(params, afeTotal, bmuTotal) {
  const result = []

  for (let bmuIdx = 0; bmuIdx < bmuTotal; bmuIdx++) {
    const element = []
    const regData = params[bmuIdx] || 0

    for (let bit = 0; bit < afeTotal; bit++) {
      element.push({
        label: `BMU${bmuIdx + 1}-AFE${bit + 1}`,
        value: (regData >> bit) & 1 ? '正常' : '掉线'
      })
    }

    result.push({
      classification: `AFE通讯BMU${bmuIdx + 1}`,
      element: element
    })
  }

  return result
}

// 解析单向菊花链断连位置数据
function getDisconnectDaisyChain(params, bmuTotal) {
  const result = []

  for (let bmuIdx = 0; bmuIdx < bmuTotal; bmuIdx++) {
    const regData = params[bmuIdx] || 0
    const forwardDisconnect = regData & 0xff // 低8位为正向断连位置
    const reverseDisconnect = (regData >> 8) & 0xff // 高8位为反向断连位置

    const element = [
      {
        label: `BMU${bmuIdx + 1}-正向断连位置`,
        value: forwardDisconnect === 0 ? '正常' : `${forwardDisconnect}#`
      },
      {
        label: `BMU${bmuIdx + 1}-反向断连位置`,
        value: reverseDisconnect === 0 ? '正常' : `${reverseDisconnect}#`
      }
    ]

    result.push({
      classification: `单向菊花链断连BMU${bmuIdx + 1}`,
      element: element
    })
  }

  return result
}

function getArray_Balance(params, cellNum, registersPerBMU = 8) {
  let balanceArray = []

  // 每个 BMU 占用的寄存器数量可能为固定8，或按实际单体数动态计算
  const cellsPerRegister = 16
  const maxCellsPerBMU = cellNum // 每个 BMU最多需要 48 个电芯状态
  const registersForCells = Math.ceil(maxCellsPerBMU / cellsPerRegister)
  // 硬件连续布局时，分组步长应为 registersForCells；
  // 兼容旧逻辑时则为固定 8。优先使用传入的 registersPerBMU。
  const groupStep = registersPerBMU || registersForCells

  // 按组进行分组
  for (let i = 0; i < params.length; i += groupStep) {
    const packID = Math.floor(i / registersPerBMU) + 1
    const packOffset = (packID - 1) * maxCellsPerBMU
    const bmuData = params.slice(i, i + groupStep) // 提取当前 BMU 的寄存器数据
    const bmuElements = []

    // 遍历前 3 个寄存器（最多 48 个电芯）
    for (let regIndex = 0; regIndex < registersForCells; regIndex++) {
      const registerValue = bmuData[regIndex]

      // 遍历当前寄存器的 16 位
      for (let bitIndex = 0; bitIndex < cellsPerRegister; bitIndex++) {
        const localIndex = regIndex * cellsPerRegister + bitIndex + 1 // 电芯编号
        if (localIndex > maxCellsPerBMU) break // 超过 48 个电芯时停止
        const continuousIndex = packOffset + localIndex
        const isBalanced = (registerValue >> bitIndex) & 1 // 提取对应位的值
        bmuElements.push({
          index: String(continuousIndex).padStart(3, '0'),
          value: isBalanced
        })
      }
    }

    // 将当前 BMU 的数据存入结果数组
    balanceArray.push({
      packID,
      cells: bmuElements
    })
  }
  return balanceArray
}
function modbusToSigned16(value) {
  // 处理16位有符号整数转换
  return value > 32767 ? value - 65536 : value
}
function getArray_Temp(params) {
  let tempArray = [
    {
      classification: '单体温度校准值',
      element: []
    }
  ]

  params.forEach((value) => {
    const finalValue = !isNaN(value) ? (modbusToSigned16(value) * 0.1).toFixed(1) : '-'
    tempArray[0].element.push({ value: finalValue })
  })
  return tempArray
}
function getArray_Vltg(params) {
  let vltgArray = [
    {
      classification: '单体电压校准值',
      element: []
    }
  ]
  // 同样假设params是数组，将数据插入到element数组
  params.forEach((value) => {
    const numericValue = Number(value)
    const finalValue = !isNaN(numericValue) ? modbusToSigned16(numericValue) : '-'
    vltgArray[0].element.push({ value: finalValue })
  })
  return vltgArray
}
// 改进后的数据解析函数

// 改进的解析函数 - 修正为连续排布方式
function getShieldStatus(registers, type, bmuTotal, elementsPerBMU, totalRegs) {
  return Array.from({ length: bmuTotal }, (_, bmuIdx) => {
    const elements = []

    // 修正：按总bit数连续排布，而不是按BMU分段
    // 计算该BMU的bit范围
    const startBit = bmuIdx * elementsPerBMU
    const endBit = startBit + elementsPerBMU - 1

    // 计算该BMU对应的寄存器范围
    const startReg = Math.floor(startBit / 16)
    const endReg = Math.floor(endBit / 16)

    // 遍历该BMU对应的所有寄存器
    for (let reg = startReg; reg <= endReg; reg++) {
      if (reg >= totalRegs) break

      const regValue = registers[reg] || 0
      const regStartBit = reg * 16

      // 解析该寄存器中属于当前BMU的bit
      for (let bit = 0; bit <= 15; bit++) {
        const globalBit = regStartBit + bit

        // 检查该bit是否属于当前BMU
        if (globalBit >= startBit && globalBit <= endBit) {
          const localBit = globalBit - startBit
          if (localBit < elementsPerBMU) {
            elements[localBit] = { value: !!(regValue & (1 << bit)) }
          }
        }
      }
    }

    // 补全缺失元素（未配置的默认为不屏蔽）
    while (elements.length < elementsPerBMU) {
      elements.push({ value: false })
    }

    return {
      classification: `BMU${bmuIdx + 1}${type}屏蔽`,
      config: {
        bmuTotal: bmuTotal,
        cellsPerBMU: elementsPerBMU
      },
      element: elements.slice(0, elementsPerBMU)
    }
  })
}
// 用一个函数来生成连续的寄存器地址
const generateRange = (start, end) => {
  const range = []
  for (let addr = start; addr <= end; addr++) {
    // 关键修复：补足4位十六进制，前导零填充
    const hexString = addr
      .toString(16) // 转换为十六进制字符串
      .padStart(4, '0') // 补足4位前导零
    // 转换为大写字母

    range.push(`0x${hexString}`)
  }
  /* console.log('generateRange', range) */
  return range
}
const generateRange_even = (start, end) => {
  let range = []
  for (let addr = start; addr <= end; addr++) {
    if (addr % 2 === 0) {
      // 关键修复：补足4位十六进制，前导零填充
      const hexString = addr
        .toString(16) // 转换为十六进制字符串
        .padStart(4, '0') // 补足4位前导零
      // 转换为大写字母

      range.push(`0x${hexString}`)
    }
  }
  return range
}
const generateRange_odd = (start, end) => {
  let range = []
  for (let addr = start; addr <= end; addr++) {
    if (addr % 2 !== 0) {
      // 关键修复：补足4位十六进制，前导零填充
      const hexString = addr
        .toString(16) // 转换为十六进制字符串
        .padStart(4, '0') // 补足4位前导零
      // 转换为大写字母

      range.push(`0x${hexString}`)
    }
  }
  return range
}
// 在数据处理的最前端增加地址标准化处理
function normalizeAddress(address) {
  // 统一处理数字和字符串类型
  let numValue

  if (typeof address === 'string') {
    numValue = parseInt(address.replace(/^0x/i, ''), 16)
  } else if (typeof address === 'number') {
    numValue = address
  } else {
    throw new Error(`非法地址类型: ${typeof address}`)
  }

  // 范围校验
  if (numValue < 0 || numValue > 65535) {
    throw new Error(`地址超出范围: ${numValue}`)
  }

  // 生成4位补零地址
  return `0x${numValue.toString(16).padStart(4, '0')}`
}

// 修改createAddressItem函数
function createAddressItem(rawAddress, originalData) {
  // 统一转换地址
  const address = normalizeAddress(rawAddress)
  const numAddress = parseInt(address, 16)

  // 查找原始数据（现在地址已经标准化）
  const originalItem = originalData.find(
    (item) => parseInt(normalizeAddress(item.address), 16) === numAddress
  )
  /* console.log(address) */
  return {
    address,
    value: originalItem ? originalItem.value : 0,
    ip: originalItem?.ip || originalData[0]?.ip || '0.0.0.0'
  }
}
const CMP_MAP = ['>', '=', '<', '≥', '≤']
function toSigned16(val) {
  return val > 32767 ? val - 65536 : val
}
function parseLimitGroups(raw, count, isRow) {
  const titles = []
  const unit = isRow ? 'T' : 'SOC'

  // 1. 先拆成 count 组 {cmp1, val, cmp2}
  const groups = []
  for (let i = 0; i < count; i++) {
    const idx = i * 3
    const cmp1 = CMP_MAP[raw[idx]] || ''
    const val = toSigned16(raw[idx + 1]) / 10
    const cmp2 = CMP_MAP[raw[idx + 2]] || ''
    groups.push({ cmp1, val, cmp2 })
  }

  // 2. 根据每组实际值来生成标题
  for (let i = 0; i < count; i++) {
    const { val, cmp1, cmp2 } = groups[i]

    // 如果这一组"阈值"本身就是 0（除第一组外都可判定为"无阈值"），
    // 我们就直接用 序号 i+1 作为标题
    if (i > 10 && val === 0) {
      titles.push(`${i + 1}`)
      continue
    }

    if (isRow) {
      // —— 行标题（温度）
      if (i === 0) {
        // 第一行：val cmp2 T
        titles.push(`-40${cmp2}${unit}${cmp1}${val}`)
      } else {
        // 中间行：上一组 val cmp1 T cmp2 val
        const prev = groups[i - 1]
        /*  titles.push(`${prev.val}${prev.cmp2}${unit}${cmp1}${val}`) */
        titles.push(`${prev.val}${cmp2}${unit}${cmp1}${val}`)
      }
    } else {
      // —— 列标题（SOC）
      if (i === 0) {
        // 第一列：0<=SOC cmp2 val
        titles.push(`0${cmp2}${unit}${cmp1}${val}`)
      } else {
        // 中间列：上一组 val cmp1 SOC cmp2 val
        const prev = groups[i - 1]
        /* titles.push(`${prev.val}${prev.cmp2}${unit}${cmp1}${val}`) */
        titles.push(`${prev.val}${cmp2}${unit}${cmp1}${val}`)
      }
    }
  }

  return titles
}
function parseRowNum(param) {
  const labels = ['充电功率表行数', '充电功率表列数', '放电功率表行数', '放电功率表列数']
  const baseAddr = 0x5400
  return param.map((value, idx) => ({
    label: labels[idx],
    value,
    address: baseAddr + idx
  }))
}
function parseKnwMode(param) {
  switch (param) {
    case 0:
      return '待机'
    case 1:
      return '制冷'
    case 2:
      return '加热'
    case 3:
      return '自循环'
  }
}
function parseKnwAlarmLevel(param) {
  switch (param) {
    case 0:
      return '无故障'
    case 1:
      return '一级故障'
    case 2:
      return '二级故障'
    case 3:
      return '三级故障'
  }
}
function parseKnwFaults(value, faultFlag1) {
  const faultMessages1 = [
    '高压压力过高',
    '低压压力过低',
    '水泵故障',
    'PTC过温故障',
    '风扇故障',
    '出水温度传感器故障',
    '进水温度传感器故障',
    '环境温度传感器故障',
    '高压压力开关故障',
    '进水压力传感器故障',
    '出水压力传感器故障',
    '高压压力传感器故障',
    '低压压力传感器故障',
    '压缩机通信故障',
    '压缩机控制器故障',
    'BMS通信丢失故障'
  ]
  const faultMessages2 = [
    '进水压力过低故障',
    '出水压力过高故障',
    '高压继电器1故障',
    '高压继电器2故障',
    'ACDC1过压故障',
    'ACDC1欠压故障',
    'ACDC2欠压故障',
    'ACDC2过压故障',
    '水阀故障',
    '排气温度传感器故障',
    '水压差过低故障',
    '水压差过高故障',
    '水阀通讯故障'
  ]
  // 将输入值转换为二进制字符串，确保它是16位
  const binaryValue = value.toString(2).padStart(16, '0')

  // 用于存储告警信息对象
  const alerts = []

  // 遍历每一位，检查是否有故障，并构造对象
  for (let i = 0; i < 16; i++) {
    alerts.push({
      label: faultFlag1 ? faultMessages1[i] : faultMessages2[i],
      value: binaryValue[15 - i] === '1' ? '故障' : '正常'
    })
  }

  return alerts
}
function parseEvkFault(value) {
  switch (value) {
    case 0:
      return '正常'
    case 1:
      return '告警'
    case 255:
      return '告警未使能'
    default:
      return `无效值${value}`
  }
}
function parseEvkFault1(value) {
  switch (value) {
    case 0:
      return '正常'
    case 1:
      return '缺水'
    case 255:
      return '告警未使能'
    default:
      return `无效值${value}`
  }
}
function parseEvkPumpStatus(value) {
  switch (value) {
    case 0:
      return '关闭'
    case 1:
      return '开启'
  }
}
function parseEvkSwitchStatus(value) {
  switch (value) {
    case 0:
      return '关机'
    case 1:
      return '开机'
  }
}
function parseEvkSysStatus(value) {
  switch (value) {
    case 0:
      return '停止'
    case 1:
      return '内循环'
    case 2:
      return '制冷'
    case 3:
      return '加热'
    case 4:
      return '全自动'
    case 5:
      return '补水'
  }
}
function parseDehumStatus(value) {
  const binaryValue = value.toString(2).padStart(16, '0')
  const status = []
  for (let i = 0; i < 16; i++) {
    status.push(binaryValue[i] === '1' ? 1 : 0)
  }
  return status
}
function parseKeHuaPCSData0(data, flag) {
  // 使用常量映射提高可读性和性能
  const STATUS_MAPS = {
    1: {
      mask: 0b111,
      shift: 4,
      values: ['初始化', '正常', '禁止充电', '禁止放电', '告警', '故障', '待机', '保留']
    },
    2: {
      mask: 0b1111,
      shift: 0,
      values: ['停止', '待机', '故障', '充电', '放电', '充电降额', '放电降额']
    },
    3: {
      mask: 0b1,
      shift: 4,
      values: ['无交流电', '有交流电']
    }
  }

  // flag === 0 的特殊情况
  if (flag === 0) {
    return (data >> 12) & 0b1111
  }

  const config = STATUS_MAPS[flag]
  if (!config) {
    return '无效值'
  }

  const value = (data >> config.shift) & config.mask
  return config.values[value] || '无效值'
}
function parseEssentData0(data, bitIndex) {
  const binaryData = data.toString(2).padStart(8, '0')

  // 根据bitIndex确定状态映射
  const isRunning = bitIndex <= 1
  const statusMap = isRunning
    ? { true: '运行', false: '停止' }
    : { true: '有告警', false: '无告警' }

  return Array.from({ length: 8 }, (_, i) =>
    binaryData[7 - i] === '1' ? statusMap.true : statusMap.false
  )
}
function parseEssentBaudRate(value) {
  switch (value) {
    case 0:
      return '4800'
    case 1:
      return '9600'
    case 2:
      return '19200'
    case 3:
      return '38400'
    default:
      return '无效值'
  }
}
function parsePCSData(data, type) {
  let basicArray = []
  basicArray.push({
    classification: 'PCS数据',
    pcsType: parseConfig_PCSModel(type),
    pcsTypeRaw: type,
    element: []
  })
  const labels = {
    starPCS: [
      '总电压(V)',
      '总电流(A)',
      'SOC(%)',
      'SOH(%)',
      'SOE(%)',
      '额定总压(V)',
      '额定容量(Ah)',
      '剩余容量(Ah)',
      '额定电量(kWh)',
      '剩余电量(kWh)',
      '最大允许放电功率(kW)',
      '最大允许充电功率(kW)',
      '故障状态',
      '最大允许充电单体电压(mV)',
      '最小允许放电单体电压(mV)',
      '最大允许充电总压(V)',
      '最小允许放电总压(V)',
      'BCU状态机',
      '充电状态',
      '放电状态',
      '高压闭合状态'
    ],
    SYLPCS: [
      '总电压(V)',
      '电池组充/放电总电流(A)',
      'SOC(%)',
      'SOH(%)',
      'SOE(%)',
      '额定电压(V)',
      '额定电流(A)',
      '额定容量(Ah)',
      '放电截止电压(V)',
      '充电截止电压(V)',
      '最大放电电流(A)',
      '最大充电电流(A)',
      '最大允许放电功率(kW)',
      '最大允许充电功率(kW)',
      '总告警',
      '总故障',
      '高压断开状态',
      '充电状态',
      '放电状态',
      'BMS状态机',
      'BMS心跳'
    ],
    keHuaPCS: [
      '电池电压(V)-PCS写入值',
      'PCS运行状态',
      '交流电状态',
      'BMS系统状态',
      'BMS心跳',
      '保留',
      '电池电压(V)',
      '电池电流(A)',
      'SOC(%)',
      'SOH(%)',
      '最大允许充电电流(A)',
      '最大允许放电电流(A)',
      '最大允许充电电压(V)',
      '最大允许放电电压(V)',
      '可用充电电量(kWh)',
      '可用放电电量(kWh)'
    ]
  }
  const values = {
    starPCS: [
      transToUnsigned(data[0], 'unsigned', 0.1), //总电压
      transToUnsigned(data[1], 'signed', 0.1), //总电流
      data[2].toString(), //SOC
      data[3].toString(), //SOH
      data[4].toString(), //SOE
      transToUnsigned(data[5], 'unsigned', 0.1),
      transToUnsigned(data[6], 'unsigned', 0.1),
      transToUnsigned(data[7], 'unsigned', 0.1),
      transToUnsigned(data[8], 'unsigned', 0.1),
      transToUnsigned(data[9], 'unsigned', 0.1),
      transToUnsigned(data[10], 'unsigned', 0.1),
      transToUnsigned(data[11], 'unsigned', 0.1),
      parsePCSAlarmLevel(data[12]),
      data[13].toString(),
      data[14].toString(),
      transToUnsigned(data[15], 'unsigned', 0.1),
      transToUnsigned(data[16], 'unsigned', 0.1),
      parseSysStatusPCS(data[17]),
      paraseAllowChrgPCS(data[18], 'charge'),
      paraseAllowChrgPCS(data[19], 'discharge'),
      paraseHighVoltStsPCS(data[20], 'star')
    ],
    SYLPCS: [
      transToUnsigned(data[0], 'unsigned', 0.1), //总电压
      transToUnsigned(data[1], 'signed', 0.1), //总电流
      data[2].toString(), //SOC
      data[3].toString(), //SOH
      data[4].toString(), //SOE
      transToUnsigned(data[5], 'unsigned', 0.1),
      transToUnsigned(data[6], 'unsigned', 0.1),
      data[7].toString(),
      transToUnsigned(data[8], 'unsigned', 0.1),
      transToUnsigned(data[9], 'unsigned', 0.1),
      transToUnsigned(data[10], 'unsigned', 0.1),
      transToUnsigned(data[11], 'unsigned', 0.1),
      transToUnsigned(data[12], 'unsigned', 0.1),
      transToUnsigned(data[13], 'unsigned', 0.1),
      paraseAlarmPCSSYL(data[14], 'alarm'),
      paraseAlarmPCSSYL(data[15], 'fault'),
      paraseHighVoltStsPCS(data[16], 'syl'),
      paraseAllowChrgPCS(data[17], 'charge'),
      paraseAllowChrgPCS(data[18], 'discharge'),
      parseSysStatusPCSSYL(data[19]),
      data[20]
    ],
    keHuaPCS: [
      transToUnsigned(data[0], 'unsigned', 0.1),
      parseKeHuaPCSData0(data[1], 2),
      parseKeHuaPCSData0(data[1], 3),
      parseKeHuaPCSData0(data[2], 1),
      parseKeHuaPCSData0(data[2], 0),
      data[3].toString(),
      transToUnsigned(data[4], 'unsigned', 0.1),
      (transToUnsigned(data[5], 'unsigned', 0.1) - 2000).toFixed(1),
      transToUnsigned(data[6], 'unsigned', 0.1),
      transToUnsigned(data[7], 'unsigned', 0.1),
      transToUnsigned(data[8], 'unsigned', 0.1),
      transToUnsigned(data[9], 'unsigned', 0.1),
      transToUnsigned(data[10], 'unsigned', 0.1),
      transToUnsigned(data[11], 'unsigned', 0.1),
      transToUnsigned(data[12], 'unsigned', 0.1),
      transToUnsigned(data[13], 'unsigned', 0.1)
    ]
  }
  const transKeyLabels = {
    starPCS: Array.from({ length: labels.starPCS.length }, (_, i) => `starPCSLabel${i + 1}`),
    SYLPCS: Array.from({ length: labels.SYLPCS.length }, (_, i) => `SYLPCSLabel${i + 1}`),
    keHuaPCS: Array.from({ length: labels.keHuaPCS.length }, (_, i) => `keHuaPCSLabel${i}`)
  }
  // Select the corresponding labels and values based on type
  let dataLabels, dataValues, keyLabels
  if (type === 65535) {
    // No PCS, return empty array
    dataLabels = labels.starPCS
    dataValues = values.starPCS
    keyLabels = transKeyLabels.starPCS
  } else if (type === 1) {
    dataLabels = labels.starPCS
    dataValues = values.starPCS
    keyLabels = transKeyLabels.starPCS
  } else if (type === 2) {
    dataLabels = labels.SYLPCS
    dataValues = values.SYLPCS
    keyLabels = transKeyLabels.SYLPCS
  } else if (type === 3) {
    dataLabels = labels.keHuaPCS
    dataValues = values.keHuaPCS
    keyLabels = transKeyLabels.keHuaPCS
  } else {
    dataLabels = labels.starPCS
    dataValues = values.starPCS
    keyLabels = transKeyLabels.starPCS
  }

  // Loop to add labels and values to the elements
  for (let i = 0; i < dataLabels.length; i++) {
    basicArray[0].element.push({
      label: dataLabels[i],
      value: dataValues[i],
      labelKey: keyLabels[i]
    })
  }

  return basicArray
}
function parseRefrigerationData(data, type) {
  let basicArray = []
  basicArray.push({
    classification: '制冷机数据',
    coolType: parseConfig_CoolModel(type),
    coolTypeRaw: type,
    element: []
  })
  const essentData0 = parseEssentData0(data[0], 0)
  const essentData1 = parseEssentData0(data[1], 1)
  const essentData2 = parseEssentData0(data[2], 2)
  const essentData3 = parseEssentData0(data[3], 3)
  const essentData4 = parseEssentData0(data[4], 4)
  const essentData5 = parseEssentData0(data[5], 5)
  const essentData6 = parseEssentData0(data[6], 6)
  // Check type and handle accordingly
  const labels = {
    knw: [
      '模式',
      '设定温度(℃)',
      '进水温度(℃)',
      '出水温度(℃)',
      '环境温度(℃)',
      '排气温度(℃)',
      '进水压力(Bar)',
      '出水压力(Bar)',
      '吸气压力(Bar)',
      '排气压力(Bar)',
      '水泵转速(%)',
      '风机转速(%)',
      '压缩机转速',
      '心跳',
      '软件版本',
      '故障等级',
      '故障码1',
      '故障码2',
      'CRC16'
    ],
    evk: [
      '电芯最大温度(℃)',
      '电芯最小温度(℃)',
      '电芯平均温度(℃)',
      '制冷点(℃)',
      '加热点(℃)',
      '制冷回差(℃)',
      '加热回差(℃)',
      '出水温度(℃)',
      '回水温度(℃)',
      '排气温度(℃)',
      '环境温度(℃)',
      '进水压力(Bar)',
      '出水压力(Bar)',
      '出水高温',
      '出水低温',
      '出水温感故障',
      '回水温感故障',
      '变频器通讯故障',
      '系统高压锁定',
      '系统低压锁定',
      '排气温度过高锁定',
      '变频器过流锁定',
      '变频器过温锁定',
      '变频器过压锁定',
      '变频器欠压锁定',
      '变频器缺相锁定',
      '变频器其他故障锁定',
      '补水告警',
      '系统压力过高告警',
      '出水压力过高告警',
      '水泵当前转速(%)',
      '水泵状态',
      '心跳',
      '压缩机状态',
      '当前系统模式',
      '系统开关机'
    ],
    Essent: [
      '机组运行状态',
      '自检状态',
      '制冷运行状态',
      '制热运行状态',
      '内风机运行状态',
      '外风机运行状态',
      '除湿状态',
      '排氢运行状态',
      '预留',
      '干接点告警输出状态',
      '预留',
      '预留',
      '预留',
      '预留',
      '预留',
      '预留',
      '回风温度传感器故障',
      '冷凝盘管温度传感器故障',
      '柜外温度传感器故障',
      '湿度传感器故障',
      '压缩机欠流告警',
      '压缩机过流告警',
      '加热器欠流告警',
      '加热器过流告警',
      '内风机告警',
      '外风机告警',
      '高压力告警',
      '低压力告警',
      '柜内高温告警',
      '柜内低温告警',
      '柜外高温告警',
      '柜外低温告警',
      '预留',
      '外部输入告警',
      '预留',
      '预留',
      '蒸发盘管温度传感器故障',
      '高湿告警',
      '低电压告警',
      '高电压告警',
      '变频压缩机故障',
      '预留',
      '预留',
      '蒸发器冻结告警',
      '高压力频繁告警',
      '低压力频繁告警',
      '冷凝高温告警',
      '制冷剂泄漏告警',
      '变频压缩机通信故障',
      '预留',
      '预留',
      '预留',
      '预留',
      '预留',
      '预留',
      '预留',
      '回风温度(℃)',
      '冷凝盘管温度(℃)',
      '压缩机/加热器电流(A)',
      '内风机电流(A)',
      '外风机电流(A)',
      '电源电压(V)',
      '柜外环境温度(℃)',
      '柜内湿度(%)',
      '蒸发盘管温度(℃)',
      '内风机转速(RPM)',
      '外风机转速(RPM)',
      '变频压缩机转速(RPM)',
      '制冷设定温度(℃)',
      '制冷回差温度(℃)',
      '制热启动温度(℃)',
      '制热停止回差值(℃)',
      '高温告警温度值(℃)',
      '低温告警温度值(℃)',
      '除湿开启湿度值(%)',
      '除湿停止回差(%)',
      ' 高湿告警值(%)',
      '除湿使能',
      '待机模式内风机状态',
      '通信波特率',
      '外部告警选项',
      '排氢间隔时间',
      '排氢工作时间',
      '电压告警高限 (可选)',
      '电压告警低限 (可选)',
      '设备通信地址'
    ]
  }
  const values = {
    knw: [
      parseKnwMode(data[0]), //
      data[1] - 40, //
      data[2] - 40, //
      data[3] - 40, //
      data[4] - 40, //
      data[5] - 40, //
      transToUnsigned(data[6], 'unsigned', 0.1),
      transToUnsigned(data[7], 'unsigned', 0.1),
      transToUnsigned(data[8], 'unsigned', 0.1),
      transToUnsigned(data[9], 'unsigned', 0.1),
      data[10],
      data[11],
      data[12],
      data[13],
      data[14], //软件版本
      parseKnwAlarmLevel(data[15]),
      parseKnwFaults(data[16], true),
      parseKnwFaults(data[17], false),
      data[18]
    ],
    evk: [
      ...Array.from({ length: 11 }, (_, index) => transToUnsigned(data[index], 'signed', 0.1)),
      transToUnsigned(data[11], 'unsigned', 0.01, 2),
      transToUnsigned(data[12], 'unsigned', 0.01, 2),
      ...data.slice(13, 27).map(parseEvkFault),
      parseEvkFault1(data[27]),
      parseEvkFault(data[28]),
      parseEvkFault(data[29]),
      transToUnsigned(data[30], 'unsigned', 0.1),
      parseEvkPumpStatus(data[31]),
      data[32],
      parseEvkPumpStatus(data[33]),
      parseEvkSysStatus(data[34]),
      parseEvkSwitchStatus(data[35])
    ],
    Essent: [
      ...essentData0,
      ...essentData1,
      ...essentData2,
      ...essentData3,
      ...essentData4,
      ...essentData5,
      ...essentData6,
      transToUnsigned(data[8], 'signed', 0.1), //回风温度
      transToUnsigned(data[9], 'signed', 0.1), //冷凝盘管温度
      transToUnsigned(data[10], 'unsigned', 0.01), //压缩机/加热器电流
      transToUnsigned(data[11], 'unsigned', 0.01), //内风机电流
      transToUnsigned(data[12], 'unsigned', 0.01), //外风机电流
      transToUnsigned(data[13], 'unsigned', 0.1), //电源电压
      transToUnsigned(data[14], 'signed', 0.1), //柜外环境温度
      transToUnsigned(data[15], 'unsigned', 0.1), //柜内湿度
      transToUnsigned(data[16], 'signed', 0.1), //蒸发盘管温度
      data[17], //内风机转速
      data[18], //外风机转速
      data[19], //变频压缩机转速
      transToUnsigned(data[20], 'signed', 0.1), //制冷设定温度
      transToUnsigned(data[21], 'signed', 0.1), //制冷回差温度
      transToUnsigned(data[22], 'signed', 0.1), //制热启动温度
      transToUnsigned(data[23], 'signed', 0.1), //制热停止回差值
      transToUnsigned(data[24], 'signed', 0.1), //高温告警温度值
      transToUnsigned(data[25], 'signed', 0.1), //低温告警温度值
      transToUnsigned(data[26], 'unsigned', 0.1), //除湿开启湿度值
      transToUnsigned(data[27], 'unsigned', 0.1), //除湿停止回差
      transToUnsigned(data[28], 'unsigned', 0.1), //高湿告警值
      transToUnsigned(data[26], 'unsigned', 0.1), //除湿使能
      data[30] === 0 ? '停止' : '运行', //待机模式内风机状态
      parseEssentBaudRate(data[31]), //通信波特率
      data[32], //外部告警选项
      data[33], //排氢间隔时间
      data[34], //排氢工作时间
      transToUnsigned(data[35], 'unsigned', 0.1), //电压告警高限 (可选)
      transToUnsigned(data[36], 'unsigned', 0.1), //电压告警低限 (可选)
      data[37] //设备通信地址
    ]
  }
  const transKeyLabels = {
    knw: Array.from({ length: labels.knw.length }, (_, i) => `knwLabel${i + 1}`),
    evk: Array.from({ length: labels.evk.length }, (_, i) => `evkLabel${i + 1}`),
    Essent: Array.from({ length: labels.Essent.length }, (_, i) => `EssentLabel${i + 1}`)
  }
  // Loop to add labels and values based on type
  let dataLabels, dataValues, keyLabels
  if (type === 65535) {
    // No refrigeration device, return empty array
    dataLabels = labels.evk
    dataValues = values.evk
    keyLabels = transKeyLabels.evk
  } else if (type === 1) {
    dataLabels = labels.knw
    dataValues = values.knw
    keyLabels = transKeyLabels.knw
  } else if (type === 2) {
    dataLabels = labels.evk
    dataValues = values.evk
    keyLabels = transKeyLabels.evk
  } else if (type === 3) {
    dataLabels = labels.Essent
    dataValues = values.Essent
    keyLabels = transKeyLabels.Essent
  } else {
    // If the type is 3 or other, you can decide what to do (currently returning empty)
    return basicArray // For now, returning an empty array for unsupported types
  }

  // Push elements to the basicArray based on the labels and values
  for (let i = 0; i < dataLabels.length; i++) {
    basicArray[0].element.push({
      label: dataLabels[i],
      value: dataValues[i],
      labelKey: keyLabels[i]
    })
  }
  return basicArray
}

function parseDehumData(data, type) {
  let basicArray = []
  basicArray.push({
    classification: '除湿机数据',
    dehumType: parseConfig_LiqModel(type),
    dehumTypeRaw: type,
    element: []
  })
  let labels = {
    dehum1: [
      '雾化模块状态',
      '雾化工作状态',
      '故障回路状态',
      '控湿回路状态',
      '控温回路状态',
      '控温方式',
      '风机模块回路状态',
      '除湿模块回路状态',
      '湿度传感器状态',
      '外部温度传感器状态',
      '内部温度传感器状态',
      '化霜状态',
      '控湿手动开关',
      '控温手动开关',
      '高温告警',
      '露点温度回路工作状态',
      '内部温度值(℃)',
      '环境温度值(℃)',
      '环境湿度值(%RH)',
      '内部温度值2(℃)',
      '露点温度(℃)',
      '备用3',
      '备用4',
      '备用5',
      '控温开启值(℃)',
      '控温停止值(℃)',
      '控湿开启值(%RH)',
      '控湿停止值(%RH)',
      '温度报警上限值(℃)',
      '温度报警下限值(℃)',
      '露点温度启动值(℃)',
      '露点温度回差值(℃)'
    ],
    dehum2: [
      '控湿回路状态',
      '控温回路状态',
      '控温方式',
      '风机模块回路状态',
      '除湿模块回路状态',
      '湿度传感器状态',
      '外部温度传感器状态',
      '备用',
      '化霜状态',
      '控湿手工开关',
      '控温手动开关',
      '高温告警',
      '露点温度回路工作状态',
      '环境温度值(℃)',
      '环境湿度值(%RH)',
      '备用2',
      '露点温度回路工作状态',
      '备用3',
      '备用4',
      '备用5',
      '控温开启值(℃)',
      '控温停止值(℃)',
      '控湿开启值(%RH)',
      '控湿关闭值(%RH)',
      '高温报警上限值(℃)',
      '高温报警下限值(℃)',
      '露点温度启动值(℃)',
      '露点温度回差值(℃)'
    ]
  }
  let dehumStatus = parseDehumStatus(data[0])
  let values = {
    dehum1: [
      dehumStatus[15] === 0 ? '正常' : 1 ? '故障' : '无效值',
      dehumStatus[14] === 0 ? '关闭' : 1 ? '开启' : '无效值',
      dehumStatus[13] === 0 ? '关闭' : 1 ? '开启' : '无效值',
      dehumStatus[12] === 0 ? '停止' : 1 ? '开启' : '无效值',
      dehumStatus[11] === 0 ? '停止' : 1 ? '开启' : '无效值',
      dehumStatus[10] === 0 ? '降温' : 1 ? '升温' : '无效值',
      dehumStatus[9] === 0 ? '正常' : 1 ? '故障' : '无效值',
      dehumStatus[8] === 0 ? '正常' : 1 ? '故障' : '无效值',
      dehumStatus[7] === 0 ? '正常' : 1 ? '故障' : '无效值',
      dehumStatus[6] === 0 ? '正常' : 1 ? '故障' : '无效值',
      dehumStatus[5] === 0 ? '正常' : 1 ? '故障' : '无效值',
      dehumStatus[4] === 0 ? '正常' : 1 ? '正在化霜' : '无效值',
      dehumStatus[3] === 0 ? '正常' : 1 ? '手动开' : '无效值',
      dehumStatus[2] === 0 ? '正常' : 1 ? '手动开' : '无效值',
      dehumStatus[1] === 0 ? '正常' : 1 ? '告警' : '无效值',
      dehumStatus[0] === 0 ? '关闭' : 1 ? '开启' : '无效值',
      transToUnsigned(data[1], 'signed', 0.1),
      transToUnsigned(data[2], 'signed', 0.1),
      transToUnsigned(data[3], 'unsigned', 0.1),
      transToUnsigned(data[4], 'signed', 0.1),
      transToUnsigned(data[5], 'signed', 0.1),
      data[6],
      data[7],
      data[8],
      ...Array.from({ length: 8 }, (_, i) => transToUnsigned(data[i + 9], 'unsigned', 0.1))
    ],
    dehum2: [
      data[0] === 0 ? '停止' : 1 ? '开启' : '无效值',
      data[1] === 0 ? '停止' : 1 ? '开启' : '无效值',
      data[2] === 0 ? '降温' : 1 ? '升温' : '无效值',
      data[3] === 0 ? '正常' : 1 ? '故障' : '无效值',
      data[4] === 0 ? '正常' : 1 ? '故障' : '无效值',
      data[5] === 0 ? '正常' : 1 ? '故障' : '无效值',
      data[6] === 0 ? '正常' : 1 ? '故障' : '无效值',
      data[7],
      data[8] === 0 ? '正常' : 1 ? '正在化霜' : '无效值',
      data[9] === 0 ? '自动' : 1 ? '手动开' : '无效值',
      data[10] === 0 ? '自动' : 1 ? '手动开' : '无效值',

      data[11] === 0 ? '正常' : 1 ? '告警' : '无效值',
      data[12] === 0 ? '关闭' : 1 ? '开启' : '无效值', //露点温度回路工作状态

      transToUnsigned(data[13], 'signed', 0.1),
      transToUnsigned(data[14], 'unsigned', 0.1),
      data[15],
      transToUnsigned(data[16], 'signed', 0.1),
      data[17],
      data[18],
      data[19],
      ...Array.from({ length: 8 }, (_, i) => transToUnsigned(data[i + 20], 'unsigned', 0.1))
    ]
  }
  let transKeyLabels = {
    dehum1: Array.from({ length: labels.dehum1.length }, (_, i) => `dehum1Label${i + 1}`),
    dehum2: Array.from({ length: labels.dehum2.length }, (_, i) => `dehum2Label${i + 1}`)
  }
  // Loop to add labels and values based on type
  let dataLabels, dataValues, keyLabels
  if (type === 65535) {
    // No refrigeration device, return empty array
    dataLabels = labels.dehum1
    dataValues = values.dehum1
    keyLabels = transKeyLabels.dehum1
  } else if (type === 1) {
    dataLabels = labels.dehum1
    dataValues = values.dehum1
    keyLabels = transKeyLabels.dehum1
  } else if (type === 2) {
    dataLabels = labels.dehum2
    dataValues = values.dehum2
    keyLabels = transKeyLabels.dehum2
  } else {
    // If the type is 3 or other, you can decide what to do (currently returning empty)
    return basicArray // For now, returning an empty array for unsupported types
  }

  // Push elements to the basicArray based on the labels and values
  for (let i = 0; i < dataLabels.length; i++) {
    basicArray[0].element.push({
      label: dataLabels[i],
      value: dataValues[i],
      labelKey: keyLabels[i]
    })
  }
  return basicArray
}
function parseFireData0(value) {
  switch (value) {
    case 0:
      return '正常'
    case 1:
      return '一级预警'
    case 2:
      return '二级预警'
    case 3:
      return '一级报警'
    case 4:
      return '二级报警'
    default:
      return `无效值${value}`
  }
}
function parseFireData1_(value, labelFlag, valueFlag, bmuNum) {
  let binaryValue = value.toString(2).padStart(16, '0')
  let array = []
  if (labelFlag === 2 && valueFlag === 3) {
    array.push(
      {
        label: '紧急启动开关状态',
        value: binaryValue[15] === '1' ? '按下' : '正常'
      },
      {
        label: '紧急停止开关状态',
        value: binaryValue[14] === '1' ? '按下' : '正常'
      }
    )
  } //探测器,取消启动已启动
  for (let i = 0; i < bmuNum; i++) {
    if (labelFlag === 1 && valueFlag === 1) {
      array.push({
        label: `${i + 1}号探测器状态`,
        value: binaryValue[15 - i] === '1' ? '故障' : '正常'
      })
    } //探测器,正常故障
    else if (labelFlag === 0 && valueFlag === 1) {
      array.push({
        label: `${i + 1}号灭火器状态`,
        value: binaryValue[15 - i] === '1' ? '故障' : '正常'
      })
    } //灭火器,正常故障
    else if (labelFlag === 0 && valueFlag === 0) {
      array.push({
        label: `${i + 1}号灭火器状态`,
        value: binaryValue[15 - i] === '1' ? '已启动' : '正常'
      })
    } //灭火器,正常已启动
    else if (labelFlag === 1 && valueFlag === 2) {
      array.push({
        label: `${i + 1}号探测器状态`,
        value: binaryValue[15 - i] === '1' ? '启动' : '取消启动'
      })
    } //探测器,取消启动已启动
  }
  return array
}
function paseFireDataDetectorStatus(value) {
  switch (value) {
    case 0:
      return '正常'
    case 1:
      return '探测器掉线'
    case 2:
      return '传感器故障'
    default:
      return value
  }
}
function parseFireData(data, type, bmuNum) {
  let basicArray = []
  basicArray.push({
    classification: '消防数据',
    fireType: parseConfig_Fire(type),
    fireTypeRaw: type,
    element: []
  })
  const labels = [
    '最高报警等级',
    '探测器状态',
    '灭火器故障状态',
    '灭火器启动状态',
    '按键状态',
    '显示器状态',
    '探测器灭火器启动命令',
    '禁止报警功能及启动',
    '禁止灭火自动启动功能',
    '复位系统预警、报警信息',
    ...Array.from({ length: bmuNum }, (_, i) => [
      `探测器${i + 1}`,
      `探测器${i + 1} 状态`,
      `探测器${i + 1} 报警等级`,
      `探测器${i + 1} 一氧化碳数据(ppm)`,
      `探测器${i + 1} 温度数据(℃)`,
      `探测器${i + 1} 烟雾数据(db/m)`,
      `探测器${i + 1} Voc数据`
    ]).flat()
  ]
  const labelsKey = Array.from({ length: labels.length }, (_, i) => `fireLabel${i + 1}`)

  const values = [
    parseFireData0(data[0]),
    parseFireData1_(data[1], 1, 1, bmuNum),
    parseFireData1_(data[2], 0, 1, bmuNum),
    parseFireData1_(data[3], 0, 0, bmuNum),
    parseFireData1_(data[4], 2, 3, bmuNum),
    data[5] === 1 ? '故障' : data[5] === 0 ? '正常' : '无效值',
    parseFireData1_(data[6], 1, 2, bmuNum),
    data[7] === 1 ? '禁止' : data[7] === 0 ? '不禁止' : '无效值',
    data[8] === 1 ? '禁止' : data[8] === 0 ? '不禁止' : '无效值',
    data[9] === 1 ? '复位系统预警、报警状态' : data[9],
    // For each detector, process its 7 data points
    ...Array.from({ length: bmuNum }, (_, i) => {
      const offset = 10 + i * 7 // Calculate offset for each detector

      return [
        data[offset],
        paseFireDataDetectorStatus(data[offset + 1]),
        parseFireData0(data[offset + 2]),
        data[offset + 3],
        data[offset + 4] - 40,
        transToUnsigned(data[offset + 5], 'unsigned', 0.001, 3),
        data[offset + 6] === 1 ? 'voc报警' : data[offset + 6] === 0 ? '正常' : data[offset + 6]
      ]
    }).flat() // Flatten the array of arrays into a single array
  ]
  /* console.log(labels)
  console.log(values) */
  // Flatten labels and values for the table
  labels.forEach((label, index) => {
    basicArray[0].element.push({
      label,
      value: values[index],
      labelKey: labelsKey[index]
    })
  })
  return basicArray
}
// 解析合并的故障映射数据（使能和保留）
function parseMergedFaultMap(enableData, reservedData, faultMap) {
  const result = []
  let bitIndex = 0

  for (let i = 0; i < enableData.length; i++) {
    const enableValue = enableData[i]
    const reservedValue = reservedData[i]

    for (let bit = 0; bit < 16; bit++) {
      const isEnabled = (enableValue & (1 << bit)) !== 0
      const isReserved = (reservedValue & (1 << bit)) !== 0
      const faultKey = bitIndex + 1

      if (faultMap[faultKey]) {
        result.push({
          label: faultMap[faultKey],
          enableValue: isEnabled ? 1 : 0,
          reservedValue: isReserved ? 1 : 0
        })
      }

      bitIndex++
    }
  }

  return result
}

// 解析总故障数据
function parseTotalFault(registerData) {
  const result = {
    contactor: [],
    invalidValue1: [],
    cellFault: [],
    packFault: [],
    clusterFault1: [],
    clusterFault2: [],
    hwelseFault: []
  }
  const hwelseFaults = [
    'CAN1通讯状态',
    'CAN2通讯状态',
    'CAN3通讯状态',
    '预留',
    'RS485-1通讯状态',
    'RS485-2通讯状态',
    'RS485-3通讯状态',
    '预留',
    '预留',
    'Ethernet1通讯状态',
    '预留',
    '主正接触器状态',
    '主负接触器状态'
  ]
  // 接触器详细故障 (寄存器0)
  if (registerData[0] !== undefined) {
    result.contactor = parseContactorFaults(registerData[0])
  }

  // 无效值标志-1 (寄存器1)
  if (registerData[1] !== undefined) {
    result.invalidValue1 = parseInvalidValueFaults(registerData[1], 'invalidValue1')
  }

  // 单体总故障 (寄存器8)
  if (registerData[8] !== undefined) {
    result.cellFault = parseFaultLevels(registerData[8], 'cellFault')
  }

  // pack总故障 (寄存器9)
  if (registerData[9] !== undefined) {
    result.packFault = parseFaultLevels(registerData[9], 'packFault')
  }

  // 簇总故障1 (寄存器10)
  if (registerData[10] !== undefined) {
    result.clusterFault1 = parseFaultLevels(registerData[10], 'clusterFault1')
  }

  // 簇总故障2 (寄存器11)
  if (registerData[11] !== undefined) {
    result.clusterFault2 = parseFaultLevels(registerData[11], 'clusterFault2')
  }

  // 硬件故障-其他故障 (寄存器12)
  if (registerData[12] !== undefined) {
    result.hwelseFault = parseRegisterForHwelse(registerData[12], hwelseFaults, 13)
  }

  return result
}

// 解析接触器故障
function parseContactorFaults(registerValue) {
  const result = []
  const contactorMap = configFaultAction.totalFaultsMap.contactor

  for (let bit = 0; bit < contactorMap.length; bit++) {
    result.push({
      label: contactorMap[bit],
      value: (registerValue & (1 << bit)) !== 0 ? '严重' : '无故障'
    })
  }

  return result.filter((item) => item.label !== 'reserved')
}

// 解析无效值故障
function parseInvalidValueFaults(registerValue, faultType) {
  const result = []
  const invalidValueMap = configFaultAction.totalFaultsMap[faultType]

  for (let bit = 0; bit < invalidValueMap.length; bit++) {
    result.push({
      label: invalidValueMap[bit],
      value: (registerValue & (1 << bit)) !== 0 ? '无效' : '有效'
    })
  }
  return result.filter((item) => item.label !== 'reserved')
}

// 解析故障级别 (2位表示一个故障的级别)
function parseFaultLevels(registerValue, faultType, eventFlag = false) {
  const result = []
  const faultMap = configFaultAction.totalFaultsMap[faultType]

  for (let i = 0; i < 8; i++) {
    const bitOffset = i * 2
    const levelBits = (registerValue >> bitOffset) & 0x03
    const faultName = faultMap.fault[i] || `fault${i + 1}`

    // 根据levelBits获取对应的故障级别，0表示无故障
    const level = faultMap.level[levelBits] || 'Unknown'

    if (levelBits !== 0) {
      // 有故障的情况
      if (eventFlag) {
        result.push(`${faultName}-${level}`)
      } else {
        // 返回对象形式的数组
        result.push({
          label: faultName,
          value: level
        })
      }
    } else {
      // 无故障的情况也要解析出来
      if (eventFlag) {
        // 如果是事件标记模式，不添加无故障条目，在最后统一处理
      } else {
        // 返回无故障的对象，使用faultMap.level[0]获取无故障的描述
        result.push({
          label: faultName,
          value: level
        })
      }
    }
  }
  // 如果 eventFlag 为 true，将数组元素组合成以,为分隔符的字符串
  // 如果 eventFlag 为 true，并且没有故障，返回 "无故障"
  if (eventFlag) {
    return result.length > 0 ? result.join(',') : '无故障'
  }
  return result.filter((item) => item.label !== 'reserved')
}

// 解析DI/DO状态
function parseDiDOStatus(registerData) {
  const result = {
    diSignal1: [],
    diSignal2: [],
    doSignal1: [],
    doControlSignal1: [],
    rtData: []
  }

  // DI信号状态-1 (寄存器0)
  if (registerData[0] !== undefined) {
    result.diSignal1 = parseSignalStatus(registerData[0], configFaultAction.didoTMap.diSignal1)
  }

  // DI信号状态-2 (寄存器1)
  if (registerData[1] !== undefined) {
    result.diSignal2 = parseSignalStatus(registerData[1], configFaultAction.didoTMap.diSignal2)
  }

  // DO驱动反馈状态-1 (寄存器4)
  if (registerData[4] !== undefined) {
    result.doSignal1 = parseSignalStatus(registerData[4], configFaultAction.didoTMap.doSignal1)
  }

  // DO控制状态-1 (寄存器8)
  /*  if (registerData[8] !== undefined) {
    result.doControlSignal1 = parseSignalStatus(
      registerData[8],
      configFaultAction.didoTMap.doControlSignal1
    )
  } */

  // RT温度信息 (寄存器12-21)
  for (let rtIndex = 1; rtIndex <= 5; rtIndex++) {
    const signalNameReg = 12 + (rtIndex - 1) * 2
    const tempDataReg = signalNameReg + 1

    if (registerData[signalNameReg] !== undefined && registerData[tempDataReg] !== undefined) {
      const signalName = configFaultAction.didoTMap.rtData[registerData[signalNameReg]] || 'unknown'
      // RT数据值是有符号16进制数字，需要乘以0.1保留一位小数
      const temperature = transToUnsigned(registerData[tempDataReg], 'signed', 0.1)

      result.rtData.push({
        rtIndex: rtIndex,
        signalName: signalName,
        temperature: temperature
      })
    }
  }

  return result
}

// 解析信号状态
function parseSignalStatus(registerValue, signalMap) {
  const result = []

  for (let bit = 0; bit < signalMap.length; bit++) {
    if (signalMap[bit] !== 'reversed') {
      const isActive = (registerValue & (1 << bit)) !== 0
      result.push({
        label: signalMap[bit],
        value: isActive ? 1 : 0
      })
    }
  }

  return result
}

// 解析系统总故障位
function parseSystemTotalFaultBits(register1, register2) {
  const activeStates = []

  // 将两个寄存器合并为一个32位值
  const combinedValue = (register2 << 16) | register1

  // bit0-bit15: 只有1有值时才解析
  const bit0_15Map = [
    { bit: 0, label: '静置' },
    { bit: 1, label: '充电' },
    { bit: 2, label: '放电' },
    { bit: 3, label: '禁充' },
    { bit: 4, label: '禁放' },
    { bit: 5, label: '禁充禁放' },
    { bit: 6, label: '告警' },
    { bit: 7, label: '故障' },
    { bit: 8, label: '充电功率锁存' },
    { bit: 9, label: '放电功率锁存' },
    { bit: 10, label: '充电指令' },
    { bit: 11, label: '充电指令完成' },
    { bit: 12, label: '放电指令' },
    { bit: 13, label: '放电指令完成' },
    { bit: 14, label: '脱离母线指令' },
    { bit: 15, label: '脱离母线指令完成' }
  ]

  // bit16-bit18: 0或1都有值
  const bit16_18Map = [
    { bit: 16, label: '运维模式', falseLabel: '非运维模式' },
    { bit: 17, label: '内测模式', falseLabel: '正常模式' },
    { bit: 18, label: '初始化中', falseLabel: '初始化完成' }
  ]

  // 解析bit0-bit15
  bit0_15Map.forEach(({ bit, label }) => {
    const isActive = (combinedValue & (1 << bit)) !== 0
    if (isActive) {
      activeStates.push(label)
    }
  })

  // 解析bit16-bit18
  bit16_18Map.forEach(({ bit, label, falseLabel }) => {
    const isActive = (combinedValue & (1 << bit)) !== 0
    activeStates.push(isActive ? label : falseLabel)
  })

  // 如果没有激活的状态，返回默认值
  if (activeStates.length === 0) {
    return '无状态'
  }

  // 返回用逗号分隔的状态字符串
  return activeStates.join(';')
}

// 解析系统总状态位，返回所有状态和激活状态
function parseSystemTotalFaultBitsWithStates(register1, register2) {
  const combinedValue = (register2 << 16) | register1

  // 定义所有可能的状态位
  const allSystemStates = [
    // bit0-bit15: 只有1有值时才解析
    { bit: 0, label: '静置', key: 'idle' },
    { bit: 1, label: '充电', key: 'charge' },
    { bit: 2, label: '放电', key: 'discharge' },
    { bit: 3, label: '禁充', key: 'forbidCharge' },
    { bit: 4, label: '禁放', key: 'forbidDischarge' },
    { bit: 5, label: '禁充禁放', key: 'standby' },
    { bit: 6, label: '告警', key: 'alarm' },
    { bit: 7, label: '故障', key: 'fault' },
    { bit: 8, label: '充电功率锁存', key: 'chargePowerLatch' },
    { bit: 9, label: '放电功率锁存', key: 'dischargePowerLatch' },
    { bit: 10, label: '充电指令', key: 'chargeCmd' },
    { bit: 11, label: '充电指令完成', key: 'chargeCmdDone' },
    { bit: 12, label: '放电指令', key: 'dischargeCmd' },
    { bit: 13, label: '放电指令完成', key: 'dischargeCmdDone' },
    { bit: 14, label: '脱离母线指令', key: 'busOffCmd' },
    { bit: 15, label: '脱离母线指令完成', key: 'busOffCmdDone' },
    // bit16-bit18: 0或1都有值
    {
      bit: 16,
      label: '运维模式',
      falseLabel: '非运维模式',
      key: 'maintenance',
      falseKey: 'nonMaintenance'
    },
    {
      bit: 17,
      label: '内测模式',
      falseLabel: '正常模式',
      key: 'testMode',
      falseKey: 'normalMode'
    },
    {
      bit: 18,
      label: '初始化中',
      falseLabel: '初始化完成',
      key: 'initializing',
      falseKey: 'initDone'
    }
  ]

  const allStatesDisplay = []
  const activeStates = []

  // bit0-bit15: 每个bit位显示1个状态（共16个状态），根据位值设置激活状态
  for (let bit = 0; bit <= 15; bit++) {
    const state = allSystemStates.find((s) => s.bit === bit)
    if (state) {
      const isActive = (combinedValue & (1 << bit)) !== 0
      const stateData = {
        bit: bit,
        label: state.label,
        key: state.key,
        isActive: isActive,
        displayLabel: state.label
      }
      allStatesDisplay.push(stateData)
      if (isActive) {
        activeStates.push(stateData)
      }
    }
  }

  // bit16-bit18: 每个bit位显示2个状态（0和1各一个，共6个状态）
  for (let bit = 16; bit <= 18; bit++) {
    const state = allSystemStates.find((s) => s.bit === bit)
    if (state) {
      const isActive = (combinedValue & (1 << bit)) !== 0

      // 添加bit位为0时的状态
      const falseStateData = {
        bit: bit,
        label: state.falseLabel,
        key: state.falseKey,
        isActive: !isActive,
        displayLabel: state.falseLabel
      }
      allStatesDisplay.push(falseStateData)
      if (!isActive) {
        activeStates.push(falseStateData)
      }

      // 添加bit位为1时的状态
      const trueStateData = {
        bit: bit,
        label: state.label,
        key: state.key,
        isActive: isActive,
        displayLabel: state.label
      }
      allStatesDisplay.push(trueStateData)
      if (isActive) {
        activeStates.push(trueStateData)
      }
    }
  }

  return {
    allStates: allStatesDisplay,
    activeStates: activeStates,
    displayValue:
      activeStates.length > 0 ? activeStates.map((s) => s.displayLabel).join(';') : '无状态'
  }
}

export {
  delay,
  isTimeoutError,
  convertToAscii_ClusterSummNew,
  convertBMUProductCodeToBytes,
  regNumComb_Config,
  convertArrayWithMinMax_CellV,
  transReslCluExtrem,
  getData_PackSummNew,
  getData_ClusExtreme,
  parseSysStatus,
  parseSysStatusNow,
  parseSysAlarmLevel,
  getData_ClusterSummNew,
  getAlarmData2,
  convertDisconnectToAlarmFormat,
  extractCellNumber,
  extractBMUNumber,
  calculateAbsolutePosition,
  flattenAndFormat,
  parseAFEBMUStatus,
  parse2bitRegisterForEvent,
  getAlarmData1,
  parseDIDOData,
  parseControlData,
  getArray_ConfigParamSys1,
  parseConfig_eventRecod,
  parseConfig_internalTestModel,
  parseConfig_OperModel,
  parseConfig_PCSModel,
  parseConfig_CoolModel,
  parseConfig_LiqModel,
  parseConfig_CurrentSenser,
  parseConfig_Balance,
  getArray_ConfigParamSys2,
  transToIpv4,
  transToMac,
  getEventTimeData,
  getArray_ConfigFactorycalib,
  formatSystemTime,
  getArray_ConfigTime,
  getArray_ConfigAlarmClus,
  getArray_ConfigAlarmBMU,
  getArray_ConfigAlarmCell1,
  getArray_ConfigAlarmCell2,
  getArray_AccumAh,
  getArray_ConfigSOX1,
  getArray_ConfigSOX2,
  getArray_ConfigSOX3,
  getUpgradeData,
  getAdaptData,
  getDisconnectArrayNum,
  getDisconnectArrayBMU,
  getDisconnectArrayCellVT,
  getDisconnectArrayAFE,
  getDisconnectDaisyChain,
  getArray_Balance,
  getArray_Temp,
  getArray_Vltg,
  getShieldStatus,
  generateRange,
  generateRange_even,
  generateRange_odd,
  normalizeAddress,
  createAddressItem,
  parseLimitGroups,
  parseRowNum,
  parsePCSData,
  parseRefrigerationData,
  parseDehumData,
  parseFireData,
  parseConfig_Fire,
  parseMergedFaultMap,
  parseTotalFault,
  parseDiDOStatus,
  parseSystemTotalFaultBits,
  parseSystemTotalFaultBitsWithStates,
  parseSysStatusWithStates,
  regNumComb_Float,
  floatToRegisters,
  parseFaultLevels
}
