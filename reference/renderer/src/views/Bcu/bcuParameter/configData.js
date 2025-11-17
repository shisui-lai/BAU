import { ref } from 'vue'
import { floatToRegisters } from '../../../../../modbus/handlers/utils.js'
import { initAlarmConfig, initSOXConfig, initBCUConfig } from './initData.js'
import ExcelJS from 'exceljs'
// 新增 optionsMap 配置
const optionsMap = {
  // 事件记录模式
  eventLoggingMode: [
    { labelKey: 'dropdown.eventLoggingMode.simple', value: 0 },
    { labelKey: 'dropdown.eventLoggingMode.detailed', value: 1 }
  ],

  // 内测模式
  internalTestMode: [
    { labelKey: 'dropdown.internalTestMode.disable', value: 0 },
    { labelKey: 'dropdown.internalTestMode.vt', value: 1 },
    { labelKey: 'dropdown.internalTestMode.iacp', value: 2 },
    { labelKey: 'dropdown.internalTestMode.do', value: 3 }
  ],

  // 均衡模式
  balancingMode: [
    { labelKey: 'dropdown.balancingMode.auto', value: 0 },
    { labelKey: 'dropdown.balancingMode.manual', value: 1 }
  ],

  // 运维模式
  maintenanceMode: [
    { labelKey: 'dropdown.maintenanceMode.enabled', value: 23477 },
    { labelKey: 'dropdown.maintenanceMode.disabled', value: 4641 }
  ],

  // PCS类型
  pcsType: [
    { labelKey: 'dropdown.pcsType.none', value: 65535 },
    { labelKey: 'dropdown.pcsType.star', value: 1 },
    { labelKey: 'dropdown.pcsType.shuangyili', value: 2 },
    { labelKey: 'dropdown.pcsType.kehua', value: 3 }
    //{ labelKey: 'dropdown.pcsType.none2', value: 0 }
  ],

  // 制冷设备类型
  refrigerationType: [
    { labelKey: 'dropdown.refrigerationType.none', value: 65535 },
    { labelKey: 'dropdown.refrigerationType.kenuowei', value: 1 },
    { labelKey: 'dropdown.refrigerationType.envicool', value: 2 },
    { labelKey: 'dropdown.refrigerationType.essent', value: 3 }
  ],

  // 除湿机设备类型
  dehumidifierType: [
    { labelKey: 'dropdown.dehumidifierType.none', value: 65535 },
    { labelKey: 'dropdown.dehumidifierType.type1', value: 1 },
    { labelKey: 'dropdown.dehumidifierType.type2', value: 2 }
    //{ labelKey: 'dropdown.dehumidifierType.none2', value: 0 }
  ],

  // 消防控制器类型
  fireControllerType: [
    { labelKey: 'dropdown.fireControllerType.none', value: 65535 },
    { labelKey: 'dropdown.fireControllerType.sanvalor', value: 1 }
    //{ labelKey: 'dropdown.fireControllerType.none2', value: 0 }
  ],

  // CAN通讯速率
  canRate: [
    { labelKey: 'dropdown.canRate.50k', value: 0 },
    { labelKey: 'dropdown.canRate.100k', value: 1 },
    { labelKey: 'dropdown.canRate.125k', value: 2 },
    { labelKey: 'dropdown.canRate.250k', value: 3 },
    { labelKey: 'dropdown.canRate.500k', value: 4 },
    { labelKey: 'dropdown.canRate.1M', value: 5 }
  ],

  // CAN数据域波特率
  canDataRate: [
    { labelKey: 'dropdown.canDataRate.invalid', value: 0 },
    { labelKey: 'dropdown.canDataRate.250k', value: 1 },
    { labelKey: 'dropdown.canDataRate.500k', value: 2 },
    { labelKey: 'dropdown.canDataRate.800k', value: 3 },
    { labelKey: 'dropdown.canDataRate.1M', value: 4 },
    { labelKey: 'dropdown.canDataRate.2M', value: 5 },
    { labelKey: 'dropdown.canDataRate.4M', value: 6 },
    { labelKey: 'dropdown.canDataRate.5M', value: 7 }
  ],

  // RS485通讯速率
  rs485Rate: [
    { labelKey: 'dropdown.rs485Rate.1200', value: 0 },
    { labelKey: 'dropdown.rs485Rate.2400', value: 1 },
    { labelKey: 'dropdown.rs485Rate.4800', value: 2 },
    { labelKey: 'dropdown.rs485Rate.9600', value: 3 },
    { labelKey: 'dropdown.rs485Rate.19200', value: 4 },
    { labelKey: 'dropdown.rs485Rate.38400', value: 5 },
    { labelKey: 'dropdown.rs485Rate.57600', value: 6 },
    { labelKey: 'dropdown.rs485Rate.115200', value: 7 }
  ],

  // 电流传感器类型
  currentSensorType: [
    { labelKey: 'dropdown.currentSensorType.lem1', value: 0 },
    { labelKey: 'dropdown.currentSensorType.lem2', value: 1 },
    { labelKey: 'dropdown.currentSensorType.jc', value: 48 },
    { labelKey: 'dropdown.currentSensorType.cg', value: 192 }
  ],

  // 电池类型
  batteryType: [
    { labelKey: 'dropdown.batteryType.lifepo4', value: 0 },
    { labelKey: 'dropdown.batteryType.titanate', value: 1 },
    { labelKey: 'dropdown.batteryType.manganese', value: 2 }
  ],

  // 均衡模式选项
  balancingModeOptions: [
    { labelKey: 'dropdown.balancingModeOptions.0', value: 0 },
    { labelKey: 'dropdown.balancingModeOptions.1', value: 1 },
    { labelKey: 'dropdown.balancingModeOptions.2', value: 2 },
    { labelKey: 'dropdown.balancingModeOptions.3', value: 3 },
    { labelKey: 'dropdown.balancingModeOptions.4', value: 4 },
    { labelKey: 'dropdown.balancingModeOptions.5', value: 5 },
    { labelKey: 'dropdown.balancingModeOptions.6', value: 6 },
    { labelKey: 'dropdown.balancingModeOptions.7', value: 7 },
    { labelKey: 'dropdown.balancingModeOptions.8', value: 8 },
    { labelKey: 'dropdown.balancingModeOptions.9', value: 9 },
    { labelKey: 'dropdown.balancingModeOptions.10', value: 10 },
    { labelKey: 'dropdown.balancingModeOptions.11', value: 11 },
    { labelKey: 'dropdown.balancingModeOptions.12', value: 12 },
    { labelKey: 'dropdown.balancingModeOptions.13', value: 13 },
    { labelKey: 'dropdown.balancingModeOptions.14', value: 14 },
    { labelKey: 'dropdown.balancingModeOptions.15', value: 15 }
  ],

  // 均衡阈值电压区间K值
  balancingThresholdK: [
    { labelKey: 'dropdown.balancingThresholdK.2mV', value: 10 },
    { labelKey: 'dropdown.balancingThresholdK.20mV', value: 20 },
    { labelKey: 'dropdown.balancingThresholdK.15mV', value: 100 },
    { labelKey: 'dropdown.balancingThresholdK.150mV', value: 1000 }
  ],
  // 特殊功能使能位配置 - 簇压模式 (bit0-2)
  clusterVoltageMode: [
    { labelKey: 'dropdown.clusterVoltageMode.highVoltageMode', value: 0 },
    { labelKey: 'dropdown.clusterVoltageMode.cellVoltageSumMode', value: 1 }
  ],

  // 特殊功能使能位配置 - 动力接插件 (bit3)
  powerConnector: [
    { labelKey: 'dropdown.powerConnector.notExist', value: 0 },
    { labelKey: 'dropdown.powerConnector.exist', value: 1 }
  ],

  // 特殊功能使能位配置 - BMU温度数据类型 (bit4)
  bmuTempDataType: [
    { labelKey: 'dropdown.bmuTempDataType.normalMode', value: 0 },
    { labelKey: 'dropdown.bmuTempDataType.highPrecisionMode', value: 1 }
  ],
  //禁止使能簇配置
  disableEnableCluster: [
    { labelKey: 'dropdown.disableEnableCluster.disable', value: 23477 },
    { labelKey: 'dropdown.disableEnableCluster.enable', value: 4641 }
  ]
}

// 下拉框字段映射表
const dropdownKeys = {
  事件记录模式: 'eventLoggingMode',
  'Event Logging Mode': 'eventLoggingMode',
  内测模式: 'internalTestMode',
  'Internal Test Mode': 'internalTestMode',
  均衡模式: 'balancingMode',
  'Balancing Mode': 'balancingMode',
  运维模式: 'maintenanceMode',
  'Maintenance Mode': 'maintenanceMode',
  PCS类型: 'pcsType',
  'PCS Type': 'pcsType',
  制冷设备类型: 'refrigerationType',
  'Refrigeration Equipment Type': 'refrigerationType',
  除湿机设备类型: 'dehumidifierType',
  'Dehumidifier Equipment Type': 'dehumidifierType',
  消防控制器类型: 'fireControllerType',
  'Fire Controller Type': 'fireControllerType',
  'CAN1通讯速率/仲裁域速率': 'canRate',
  'CAN1 Communication Rate/Arbitration Domain Rate': 'canRate',
  CAN1数据域波特率: 'canDataRate',
  'CAN1 Data Domain Baud Rate': 'canDataRate',
  'CAN2通讯速率/仲裁域速率': 'canRate',
  'CAN2 Communication Rate/Arbitration Domain Rate': 'canRate',
  CAN2数据域波特率: 'canDataRate',
  'CAN2 Data Domain Baud Rate': 'canDataRate',
  'CAN3通讯速率/仲裁域速率': 'canRate',
  'CAN3 Communication Rate/Arbitration Domain Rate': 'canRate',
  CAN3数据域波特率: 'canDataRate',
  'CAN3 Data Domain Baud Rate': 'canDataRate',
  'RS485-1通讯速率': 'rs485Rate',
  'RS485-1 Communication Rate': 'rs485Rate',
  'RS485-2通讯速率': 'rs485Rate',
  'RS485-2 Communication Rate': 'rs485Rate',
  'RS485-3通讯速率': 'rs485Rate',
  'RS485-3 Communication Rate': 'rs485Rate',
  电流传感器类型: 'currentSensorType',
  'Current Sensor Type': 'currentSensorType',
  电池类型: 'batteryType',
  'Battery Type': 'batteryType',
  均衡模式选项: 'balancingModeOptions',
  'Balancing Mode Options': 'balancingModeOptions',
  充电均衡阈值电压区间K值: 'balancingThresholdK',
  'Charging Balancing Threshold Voltage Range K Value': 'balancingThresholdK',
  放电均衡阈值电压区间K值: 'balancingThresholdK',
  'Discharging Balancing Threshold Voltage Range K Value': 'balancingThresholdK',
  '开路,静置均衡阈值电压区间K值': 'balancingThresholdK',
  'Open Circuit Balancing Threshold Voltage Range K Value': 'balancingThresholdK',
  簇压模式: 'clusterVoltageMode',
  'Cluster Voltage Mode': 'clusterVoltageMode',
  BMU动力接插件温度: 'powerConnector',
  'Power Connector': 'powerConnector',
  BMU温度数据类型: 'bmuTempDataType',
  'BMU Temperature Data Type': 'bmuTempDataType',
  禁止使能簇配置: 'disableEnableCluster',
  'Disable Enable Cluster Config': 'disableEnableCluster'
}

// 获取翻译后的下拉选项
const getTranslatedOptions = (optionKey, t) => {
  const options = optionsMap[optionKey]
  if (!options) return []

  return options.map((option) => ({
    ...option,
    label: t(`config.${option.labelKey}`),
    value: Number(option.value)
  }))
}

// 判断是否为下拉框字段
const isDropdownField = (el) => {
  return dropdownKeys.hasOwnProperty(el.label)
}

// 获取下拉框选项键
const getDropdownKey = (label) => {
  return dropdownKeys[label]
}

const BOM = '\uFEFF'
const MODULE_A = 'ConfigParamSys'
const MODULE_B = 'ConfigAlarm'
const MODULE_C = 'ConfigSOX'
function initDataBCUConfig1() {
  const data = initBCUConfig
  return data.map((group) => ({
    ...group,
    hasInput: false, // 新增分类级别标记
    element: group.element.map((item) => {
      // 区分需要保持原值的字段
      const keepOriginal = [
        '生产编码',
        '本机IP',
        '子网掩码',
        '默认网关',
        '首选DNS',
        '备用DNS',
        'MAC地址'
      ].some((s) => item.label?.includes?.(s)) // 新增空值保护
      const isMACAddress = ['MAC地址'].includes(item.label)
      return {
        ...item,
        displayValue: null,
        readOnly: isMACAddress,
        value: item.value === '-' ? 0 : keepOriginal ? item.value : Number(item.value) || 0, // 仅数值类字段转换
        importedValue: null
      }
    })
  }))
}
// 修改合并数据逻辑，保留用户输入
const mergeDataConfig = (oldData, newData) => {
  return newData.map((newGroup) => {
    const oldGroup = oldData?.find((g) => g.classification === newGroup.classification) || {
      element: [],
      hasInput: false
    }

    return {
      ...newGroup,
      hasInput: oldGroup.hasInput,
      element: newGroup.element.map((newItem) => {
        // 使用label来匹配，因为有些参数（如0x005a的三个参数）共享同一个address
        const oldItem = oldGroup.element.find((i) => i.label === newItem.label)
        const displayValue = oldItem?.displayValue !== undefined ? oldItem.displayValue : null
        const importedValue = oldItem?.importedValue !== undefined ? oldItem.importedValue : null
        const isMACAddress = ['MAC地址'].includes(newItem.label)

        // 特殊处理0x005a的三个参数：如果有importedValue，则保留importedValue作为显示值
        const isSpecial005aParam =
          newItem.address === '0x005a' &&
          ['簇压模式', 'BMU动力接插件温度', 'BMU温度数据类型'].includes(newItem.label)

        let finalValue = newItem.value
        let finalDisplayValue = displayValue
        if (isSpecial005aParam && importedValue !== null && importedValue !== undefined) {
          // 对于0x005a的特殊参数，如果有导入值，则使用导入值而不是实时读取的值
          finalValue = importedValue
          finalDisplayValue = importedValue  // 同时设置displayValue
        }

        return {
          ...newItem,
          readOnly: isMACAddress || oldItem?.readOnly, // 保留或重新判断只读状态
          displayValue: finalDisplayValue,
          value: finalValue,
          importedValue: oldItem?.importedValue ?? null
        }
      })
    }
  })
}
function initDataAlarmConfig() {
  const data = initAlarmConfig
  return data.map((group) => ({
    ...group,
    hasInput: false, // 新增分类级别标记
    element: group.element.map((item) => ({
      ...item,
      displayValue: null, // 新增显示值属性
      value: item.value === '-' ? 0 : Number(item.value),
      importedValue: null
    }))
  }))
}
const initDataSOXConfig = () => {
  const data = initSOXConfig
  return data.map((group) => ({
    ...group,
    hasInput: false,
    element: group.element.map((item) => ({
      ...item,
      displayValue: null,
      value: item.value === '-' ? 0 : Number(item.value),
      importedValue: null
    }))
  }))
}
const mergeData = (oldData, newData) => {
  return newData.map((newGroup) => {
    const oldGroup = oldData?.find((g) => g.classification === newGroup.classification) || {
      element: [],
      hasInput: false
    }

    return {
      ...newGroup,
      hasInput: oldGroup.hasInput,
      element: newGroup.element.map((newItem) => {
        // 使用label来匹配，因为有些参数（如0x005a的三个参数）共享同一个address
        const oldItem = oldGroup.element.find((i) => i.label === newItem.label)

        // 保留有效编辑值
        const displayValue = oldItem?.displayValue !== undefined ? oldItem.displayValue : null
        const importedValue = oldItem?.importedValue !== undefined ? oldItem.importedValue : null
        return {
          ...newItem,
          displayValue,
          // 转换数值类型
          value: Number(newItem.value) || 0,
          importedValue: importedValue !== undefined ? importedValue : null
        }
      })
    }
  })
}
const DataBCUConfig1 = ref(initBCUConfig)
const DataAlarmConfig = ref(initAlarmConfig)
const DataSOXConfig = ref(initSOXConfig)
function formatFileSuffix(date) {
  const pad2 = (n) => String(n).padStart(2, '0')
  const YYYY = date.getFullYear()
  const MM = pad2(date.getMonth() + 1)
  const DD = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const mm = pad2(date.getMinutes())
  const ss = pad2(date.getSeconds())
  return `${YYYY}${MM}${DD}_${hh}_${mm}_${ss}`
}
function flattenWithModule(moduleName, groups) {
  return groups.flatMap((g) =>
    g.element.map((el) => ({
      module: moduleName,
      label: el.label,
      value: el.displayValue != null ? el.displayValue : el.value,
      note: el.note || '' // 添加note属性，如果没有则设为空字符串
    }))
  )
}
// —— 1.2 通用 Excel 导出器
async function exportSingleCsv(rows, ip = '') {
  // 创建工作簿
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('参数配置')

  // 设置列
  worksheet.columns = [
    { header: '模块', key: 'module', width: 20 },
    { header: '参数名', key: 'label', width: 40 },
    { header: '值', key: 'value', width: 20 },
    { header: '备注', key: 'note', width: 50 }
  ]

  // 添加数据行
  rows.forEach((r) => {
    worksheet.addRow({
      module: r.module,
      label: r.label,
      value: r.value,
      note: r.note || ''
    })
  })

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  }

  // 生成 buffer
  const buffer = await workbook.xlsx.writeBuffer()
  // 文件名中包含IP地址（如果提供）
  const ipSuffix = ip ? `_${ip.replace(/\./g, '-')}` : ''
  const fileName = `BCU_Sys_Config${ipSuffix}_${formatFileSuffix(new Date())}.xlsx`

  // 通过 IPC 调用主进程写盘
  return window.electron.ipcRenderer.invoke('exportParam-excel', {
    buffer: Array.from(new Uint8Array(buffer)),
    fileName
  })
}
// 数值拆分函数 (兼容32位数值和IP地址)
const processValue = (value, isIP = false) => {
  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)

  if (isIP) {
    const segments = value.toString().split('.').map(Number) // 强制转为字符串
    if (segments.length !== 4 || segments.some((s) => s < 0 || s > 255)) {
      throw new Error('Invalid octet value')
    }
    // 大端序写入
    segments.forEach((s, i) => view.setUint8(i, s))
    // 小端序读取高低位（兼容Modbus协议）
    return {
      high: view.getUint16(0, true), // 读取前两字节并反转
      low: view.getUint16(2, true) // 读取后两字节并反转
    }
  } else {
    // 数值类型保持原逻辑
    view.setUint32(0, value, true)
    return {
      high: view.getUint16(0, false),
      low: view.getUint16(2, false)
    }
  }
}
const mergeRegisters = new Map([
  ['0x008a', '0x008b'], // 簇校正电量
  ['0x008c', '0x008d'], // 簇额定电量
  ['0x008e', '0x008f'] // 簇额定功率
])

const ipRelatedRegisters = new Map([
  ['0x5718', { endAddr: '0x5719', type: 'ip' }], // 本机IP
  ['0x571A', { endAddr: '0x571B', type: 'mask' }],
  ['0x571C', { endAddr: '0x571D', type: 'gateway' }],
  ['0x571E', { endAddr: '0x571F', type: 'dns1' }],
  ['0x5720', { endAddr: '0x5721', type: 'dns2' }] // 子网掩码 // 默认网关 // 首选DNS // 首选DNS
])
// 定义寄存器组对应的缩放系数
const mergeRegistersForSOX = new Map([
  ['0x3264', '0x3265'],
  ['0x3266', '0x3267'],
  ['0x3268', '0x3269'],
  ['0x3272', '0x3273'],
  ['0x3274', '0x3275'],
  ['0x3276', '0x3277'],
  ['0x3278', '0x3279'],
  ['0x5312', '0x5313'],
  ['0x5314', '0x5315'],
  ['0x5387', '0x5388'],
  ['0x5389', '0x538a'],
  ['0x538b', '0x538c'],
  ['0x538d', '0x538e']
])
// 32位float寄存器映射（需要特殊处理）
const floatRegisters = new Map([
  ['0x3266', '0x3267'], // SOH计算-充电累积安时
  ['0x3268', '0x3269'] // SOH计算-放电累积安时
])

const scaleFactors = new Map([
  ['0x3264', 1],
  ['0x3265', 1],
  ['0x3272', 1],
  ['0x3273', 1],
  ['0x3274', 1],
  ['0x3275', 1],
  ['0x3276', 1],
  ['0x3277', 1],
  ['0x3278', 1],
  ['0x3279', 1],

  ['0x3266', 10],
  ['0x3267', 10],
  ['0x3268', 10],
  ['0x3269', 10],
  ['0x5312', 10],
  ['0x5313', 10],
  ['0x5314', 10],
  ['0x5315', 10],

  ['0x5387', 100],
  ['0x5388', 100],
  ['0x5389', 100],
  ['0x538a', 100],
  ['0x538b', 100],
  ['0x538c', 100],
  ['0x538d', 100],
  ['0x538e', 100]
])
// 需要单独下设的参数列表
const singleSendLabels = new Set([
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
  '温度越限次数'
])
// 处理32位float写入的函数
function processFloatWrite(startAddr, floatValue, pairedAddr) {
  try {
    // 使用floatToRegisters函数拆解为两个16位寄存器
    const { reg1, reg2 } = floatToRegisters(floatValue, false) // 使用小端序，与读取时一致

    return {
      success: true,
      registers: [
        { address: startAddr, value: reg1 },
        { address: pairedAddr, value: reg2 }
      ]
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

export async function writeImportedForData(data, ipStore, toast, t) {
  const flatData = data.flatMap((group) => group.element)
  const totalCount = flatData.length
  const importedEntries = flatData.filter(
    (el) =>
      el.importedValue !== null &&
      el.importedValue !== undefined &&
      el.importedValue !== '' &&
      el.importedValue !== '-'
  )

  if (importedEntries.length === 0) {
    toast.add({
      severity: 'warn',
      summary: t('balanceControl.writeFailed'),
      detail: t('config.toast.importFirst'),
      life: 5000
    })
    return { ok: [], err: [] }
  }
  if (importedEntries.length < totalCount) {
    toast.add({
      severity: 'warn',
      summary: t('balanceControl.writeFailed'),
      detail: t('config.toast.emptyImport'),
      life: 5000
    })
    return { ok: [], err: [] }
  }
  const writeData = []
  const seen = new Set()

  // 特殊：0x005a 三项合并（id:100/101/102）
  const all005a = flatData.filter((el) => (el.address || '').split('-')[0] === '0x005a')
  if (all005a.length) {
    const findById = (id) => all005a.find((e) => e.id === id)
    const elCluster = findById(100)
    const elPower = findById(101)
    const elBmuTemp = findById(102)
    const valOf = (el) => Number(el?.importedValue ?? el?.value ?? 0)
    // 直接使用导入的值，不需要位操作，因为导入的值已经是分离的值
    const cluster = valOf(elCluster)
    const power = valOf(elPower)
    const bmuTemp = valOf(elBmuTemp)
    const combined = (cluster | (power << 3) | (bmuTemp << 4)) >>> 0
    writeData.push({ address: '0x005a', value: combined })
    seen.add('0x005a')
  }

  flatData.forEach((el) => {
    if (el.importedValue == null) return
    const [addr] = el.address.split('-')
    if (seen.has(addr)) return
    
    if (el.dataType === 'ip') {
      // IP地址类型，拆分成两个16位寄存器
      const { high, low } = processValue(el.importedValue, true)
      writeData.push({ address: addr, value: high })
      writeData.push({
        address: ipRelatedRegisters.get(addr).endAddr,
        value: low
      })
    } else if (mergeRegistersForSOX.has(addr)) {
      // SOX 32位合并寄存器（如 SOC静置常温/低温校准时间）
      // 复用页面编辑时的计算逻辑（与 SOXConfig.vue 的 sendSingleParameter 一致）
      const paired = mergeRegistersForSOX.get(addr)
      const scale = scaleFactors.get(addr) || 1
      const scaled = Math.round(parseFloat(el.importedValue) * scale)
      const high = (scaled >>> 16) & 0xffff
      const low = scaled & 0xffff
      
      // 写入两个寄存器（与页面编辑时一致：除以scale后写入）
      writeData.push({ address: addr, value: +(low / scale).toFixed(2) })
      writeData.push({ address: paired, value: +(high / scale).toFixed(2) })
    } else if (mergeRegisters.has(addr)) {
      // 其他32位合并寄存器
      const paired = mergeRegisters.get(addr)
      const raw = Number(el.importedValue)
      const { high, low } = processValue(raw, false)
      
      writeData.push({ address: addr, value: low })
      writeData.push({ address: paired, value: high })
    } else {
      // 普通16位寄存器
      writeData.push({ address: addr, value: +el.importedValue })
    }
    seen.add(addr)
  })

  if (!writeData.length) return
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  const results = await Promise.all(
    targets.map((ip) =>
      window.electron.ipcRenderer.invoke(
        'write-modbus-registers',
        writeData.map((r) => ({ ...r, ip }))
      )
    )
  )
  const ok = results.filter((r) => r.success).map((r) => r.ip)
  const err = results.filter((r) => !r.success).map((r) => r.ip)
  // 清空 importedValue
  flatData.forEach((el) => (el.importedValue = null))
  return { ok, err }
}

// 通用范围校验函数
export function validateRange(element, value, t) {
  // 如果没有定义min或max，跳过校验
  if (element.min === undefined || element.max === undefined) {
    return { valid: true }
  }

  const numValue = Number(value)
  if (isNaN(numValue)) {
    return {
      valid: false,
      message: `${element.label} 必须为数字`
    }
  }

  if (numValue < element.min || numValue > element.max) {
    return {
      valid: false,
      message: `${element.label} 取值范围为 ${element.min}-${element.max}，当前值: ${numValue}`
    }
  }

  return { valid: true }
}

/**
 * 验证文件是否为有效的UTF-8编码
 * @param {Uint8Array} bytes - 文件的字节数组
 * @returns {boolean} - 是否为有效的UTF-8编码
 */
export function isValidUTF8(bytes) {
  let i = 0
  while (i < bytes.length) {
    // UTF-8 BOM检测（可选的字节顺序标记）
    if (i === 0 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      i += 3
      continue
    }

    // ASCII字符 (0x00-0x7F) - 单字节
    if (bytes[i] <= 0x7f) {
      i++
      continue
    }

    // 2字节序列 (0xC0-0xDF)
    // 格式: 110xxxxx 10xxxxxx
    if (bytes[i] >= 0xc0 && bytes[i] <= 0xdf) {
      if (i + 1 >= bytes.length || (bytes[i + 1] & 0xc0) !== 0x80) return false
      i += 2
      continue
    }

    // 3字节序列 (0xE0-0xEF) - 中文通常使用这种格式
    // 格式: 1110xxxx 10xxxxxx 10xxxxxx
    if (bytes[i] >= 0xe0 && bytes[i] <= 0xef) {
      if (
        i + 2 >= bytes.length ||
        (bytes[i + 1] & 0xc0) !== 0x80 ||
        (bytes[i + 2] & 0xc0) !== 0x80
      )
        return false
      i += 3
      continue
    }

    // 4字节序列 (0xF0-0xF7) - emoji等扩展字符
    // 格式: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
    if (bytes[i] >= 0xf0 && bytes[i] <= 0xf7) {
      if (
        i + 3 >= bytes.length ||
        (bytes[i + 1] & 0xc0) !== 0x80 ||
        (bytes[i + 2] & 0xc0) !== 0x80 ||
        (bytes[i + 3] & 0xc0) !== 0x80
      )
        return false
      i += 4
      continue
    }

    // 无效的UTF-8字节序列
    return false
  }
  return true
}

/**
 * 验证CSV列标题是否正确
 * @param {Array} headers - CSV文件的列标题数组
 * @returns {Object} - {valid: boolean, message: string}
 */
export function validateCSVHeaders(headers) {
  // 必需的列
  const requiredColumns = ['模块', '参数名', '值']
  // 可选的列
  const optionalColumns = ['备注', '单位']

  // 检查是否有列标题
  if (!headers || headers.length === 0) {
    return {
      valid: false,
      message: 'CSV文件为空或格式错误'
    }
  }

  // 检查必需的列是否都存在
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col))

  if (missingColumns.length > 0) {
    return {
      valid: false,
      message: `CSV文件缺少必需的列：${missingColumns.join('、')}\n必需列：${requiredColumns.join('、')}\n当前列：${headers.join('、')}`
    }
  }

  // 检查是否有未知的列
  const allValidColumns = [...requiredColumns, ...optionalColumns]
  const unknownColumns = headers.filter((col) => !allValidColumns.includes(col))

  if (unknownColumns.length > 0) {
    console.warn('CSV包含未知的列:', unknownColumns.join('、'))
  }

  return {
    valid: true,
    message: ''
  }
}

/**
 * 验证CSV文件编码并读取
 * @param {File} file - 要读取的文件
 * @param {Function} onSuccess - 成功回调，参数为解析后的文本
 * @param {Function} onError - 失败回调，参数为错误信息对象 {summary, detail}
 */
export function validateAndReadCSV(file, onSuccess, onError) {
  // 先读取文件的原始字节来验证编码
  const arrayBufferReader = new FileReader()

  arrayBufferReader.onload = (event) => {
    const buffer = event.target.result
    const bytes = new Uint8Array(buffer)

    // 验证是否为UTF-8编码
    if (!isValidUTF8(bytes)) {
      onError({
        summary: '文件编码错误',
        detail:
          '检测到非UTF-8编码。请使用UTF-8编码保存CSV文件。\n建议：用记事本打开CSV，另存为时选择"UTF-8"编码。'
      })
      return
    }

    // UTF-8验证通过，读取文本内容
    const textReader = new FileReader()
    textReader.onload = (textEvent) => {
      const text = textEvent.target.result

      // 额外检查：是否有替换字符（表示解码失败）
      if (/[\uFFFD]/.test(text)) {
        onError({
          summary: '文件编码错误',
          detail: '文件包含无法解码的字符，请确认使用UTF-8编码保存。'
        })
        return
      }

      // 验证通过，返回文本内容
      onSuccess(text)
    }

    textReader.onerror = () => {
      onError({
        summary: '文件读取失败',
        detail: '无法读取文件内容'
      })
    }

    textReader.readAsText(file, 'UTF-8')
  }

  arrayBufferReader.onerror = () => {
    onError({
      summary: '文件读取失败',
      detail: '无法读取文件'
    })
  }

  arrayBufferReader.readAsArrayBuffer(file)
}

/**
 * 读取并解析 Excel 文件
 * @param {File} file - 要读取的 Excel 文件
 * @param {Function} onSuccess - 成功回调，参数为解析后的数据对象 {headers, rows}
 * @param {Function} onError - 失败回调，参数为错误信息对象 {summary, detail}
 */
export async function validateAndReadExcel(file, onSuccess, onError) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)

    // 获取第一个工作表
    const worksheet = workbook.worksheets[0]
    
    if (!worksheet) {
      onError({
        summary: '文件读取失败',
        detail: 'Excel文件为空或没有工作表'
      })
      return
    }

    // 读取所有行
    const rows = []
    let headers = []

    worksheet.eachRow((row, rowNumber) => {
      const rowData = []
      row.eachCell({ includeEmpty: true }, (cell) => {
        // 获取单元格的值
        let value = cell.value
        
        // 处理富文本
        if (value && typeof value === 'object' && value.richText) {
          value = value.richText.map((t) => t.text).join('')
        }
        
        rowData.push(value?.toString() || '')
      })

      if (rowNumber === 1) {
        headers = rowData
      } else {
        rows.push(rowData)
      }
    })

    // 调用成功回调
    onSuccess({ headers, rows })
  } catch (error) {
    onError({
      summary: '文件解析失败',
      detail: `无法解析Excel文件: ${error.message}`
    })
  }
}

export {
  initDataBCUConfig1,
  mergeDataConfig,
  initDataSOXConfig,
  initDataAlarmConfig,
  mergeData,
  DataAlarmConfig,
  DataSOXConfig,
  DataBCUConfig1,
  MODULE_A,
  MODULE_B,
  MODULE_C,
  BOM,
  formatFileSuffix,
  flattenWithModule,
  exportSingleCsv,
  processValue,
  mergeRegisters,
  ipRelatedRegisters,
  mergeRegistersForSOX,
  floatRegisters,
  scaleFactors,
  singleSendLabels,
  processFloatWrite,
  // 新增的 optionsMap 相关导出
  optionsMap,
  dropdownKeys,
  getTranslatedOptions,
  isDropdownField,
  getDropdownKey
}
