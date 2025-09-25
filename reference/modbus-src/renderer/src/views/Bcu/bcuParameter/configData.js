import { ref } from 'vue'
import { saveAs } from 'file-saver'
import { floatToRegisters } from '../../../../../modbus/handlers/utils.js'

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
    { labelKey: 'dropdown.balancingThresholdK.15mV', value: 100 },
    { labelKey: 'dropdown.balancingThresholdK.150mV', value: 1000 },
    { labelKey: 'dropdown.balancingThresholdK.20mV', value: 10000 }
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
  开路均衡阈值电压区间K值: 'balancingThresholdK',
  'Open Circuit Balancing Threshold Voltage Range K Value': 'balancingThresholdK',
  簇压模式使能配置: 'clusterVoltageMode',
  'Cluster Voltage Mode': 'clusterVoltageMode',
  动力接插件使能配置: 'powerConnector',
  'Power Connector': 'powerConnector',
  BMU温度数据类型使能配置: 'bmuTempDataType',
  'BMU Temperature Data Type': 'bmuTempDataType'
}

// 获取翻译后的下拉选项
const getTranslatedOptions = (optionKey, t) => {
  const options = optionsMap[optionKey]
  if (!options) return []

  return options.map((option) => ({
    ...option,
    label: t(`config.${option.labelKey}`),
    // 确保 value 是数值类型，与 el.displayValue 的类型保持一致
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
const generateRange = (start, end) => {
  let range = []
  for (let addr = start; addr <= end; addr++) {
    range.push(`0x${addr.toString(16).toUpperCase()}`)
  }
  return range
}
function getArray_ConfigParamSys1() {
  const basicConfig = {
    classification: 'BMU/AFE数量配置',
    element: []
  }
  basicConfig.element.push({
    id: 1,
    label: 'BMU总数量',
    value: '-',
    note: '1簇下最多支持32个BMU'
  })
  basicConfig.element.push({
    id: 2,
    label: 'BMU下AFE数量',
    value: '-',
    note: '1个BMU下最多支持16个AFE'
  })
  for (let i = 0; i < 16; i++) {
    basicConfig.element.push({
      id: i + 3,
      label: `AFE${i + 1}下电池数量`,
      value: '-'
    })
  }
  for (let i = 0; i < 16; i++) {
    basicConfig.element.push({
      id: i + 19,
      label: `AFE${i + 1}下温度数量`,
      value: '-'
    })
  }
  for (let i = 0; i < 16; i++) {
    basicConfig.element.push({
      id: i + 35,
      label: ` AFE${i + 1}的虚拟电池偏移位置1`,
      value: '-'
    }),
      basicConfig.element.push({
        id: i + 36,
        label: ` AFE${i + 1}的虚拟电池偏移位置2`,
        value: '-'
      })
  }
  let addressArray = generateRange(0x0000, 0x0041)
  /*   const writeValueArray = Array.from({ length: 69 }, () => '') */
  basicConfig.element.forEach((item, index) => {
    item.address = addressArray[index]
    /*  item.writeValue = writeValueArray[index] */
  })

  /*     console.log(basicConfig) */
  return [basicConfig]
}
function getArray_ConfigParamSys2() {
  const basicConfig = [
    {
      classification: '系统及设备类型配置',
      element: [
        {
          id: 1,
          address: '0x0052',
          label: '事件记录模式',
          value: '-',
          note: '0 简约模式,1 详细模式'
        },
        {
          id: 2,
          address: '0x0053',
          label: '内测模式',
          value: '-',
          note: '0：关闭内测模式,1：内测模式1（V、T）2：内测模式2（IACP）3：内存模式3（DO）'
        },
        {
          id: 3,
          address: '0x0054',
          label: '均衡模式',
          value: '-',
          note: '0:自动均衡,1:手动均衡'
        },
        {
          id: 4,
          address: '0x0055',
          label: '运维模式',
          value: '-',
          note: '0x5BB5:运维模式,0x1221:非运维模式（默认）'
        },
        {
          id: 5,
          address: '0x0056',
          label: 'PCS类型',
          value: '-',
          note: '0xFFFF:无PCS,1：星星PCS'
        },
        {
          id: 6,
          address: '0x0057',
          label: '制冷设备类型',
          value: '-',
          note: '0xFFFF：无制冷设备;1：柯诺威水冷机;2：英维克'
        },
        {
          id: 7,
          address: '0x0058',
          label: '除湿机设备类型',
          value: '-'
        },
        {
          id: 8,
          address: '0x0059',
          label: '消防控制器类型',
          value: '-'
        },
        {
          address: '0x005a',
          id: 100,
          label: '簇压模式使能配置',
          optionKey: 'clusterVoltageMode',
          value: '-'
        },
        {
          address: '0x005a',
          id: 101,
          label: '动力接插件使能配置',
          optionKey: 'powerConnector',
          value: '-'
        },
        {
          address: '0x005a',
          id: 102,
          label: 'BMU温度数据类型使能配置',
          optionKey: 'bmuTempDataType',
          value: '-'
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
          value: '-',
          unit: 'V'
        },
        {
          id: 9,
          address: '0x005e',
          label: '单体电压权重系数',
          value: '-'
        },
        {
          id: 10,
          address: '0x005f',
          label: '单体温度滤波差值',
          value: '-',
          unit: '℃'
        },
        {
          id: 11,
          address: '0x0060',
          label: '单体温度权重系数',
          value: '-'
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
          value: '-',
          unit: 's'
        },
        {
          id: 13,
          address: '0x0062',
          label: '电芯静置时间',
          value: '-',
          unit: 'min'
        },
        {
          id: 14,
          address: '0x0063',
          label: '接触器范围值',
          value: '-',
          unit: '分钟'
        },
        {
          id: 15,
          address: '0x0064',
          label: '接触器检测延时时间',
          value: '-',
          unit: '秒'
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
          value: '-',
          unit: '℃'
        },
        {
          id: 17,
          address: '0x006a',
          label: '制冷设备-制冷关闭温度',
          value: '-',
          unit: '℃'
        },
        {
          id: 18,
          address: '0x006b',
          label: '制冷设备-制热开启温度',
          value: '-',
          unit: '℃'
        },
        {
          id: 19,
          address: '0x006c',

          label: '制冷设备-制热关闭温度',
          value: '-',
          unit: '℃'
        },
        {
          id: 20,
          address: '0x006d',

          label: '风扇开启温度',
          value: '-',
          unit: '℃'
        },
        {
          id: 21,
          address: '0x006e',
          label: '风扇停止温度',
          value: '-',
          unit: '℃'
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
          value: '-',
          note: '0-50k，1-100k，2-125k，3-250k，4-500k，5-1M；默认值：4-500k'
        },
        {
          id: 23,
          address: '0x0074',
          label: 'CAN1数据域波特率',
          value: '-',
          note: '0-无效/不支持，1-250k，2-500k，3-800k，4-1M，5-2M，6-4M，7-5M，默认值：0-无效/不支持'
        },
        {
          id: 24,
          address: '0x0075',
          label: 'CAN2通讯速率/仲裁域速率',
          value: '-',
          note: '0-50k，1-100k，2-125k，3-250k，4-500k，5-1M；默认值：4-500K'
        },
        {
          id: 25,
          address: '0x0076',
          label: 'CAN2数据域波特率',
          value: '-',
          note: '0-无效/不支持，1-250k，2-500k，3-800k，4-1M，5-2M，6-4M，7-5M，默认值：0-无效/不支持'
        },
        {
          id: 26,
          address: '0x0077',
          label: 'CAN3通讯速率/仲裁域速率',
          value: '-',
          note: '0-50k，1-100k，2-125k，3-250k，4-500k，5-1M；默认值：4-500k'
        },
        {
          id: 27,
          address: '0x0078',
          label: 'CAN3数据域波特率',
          value: '-',
          note: '0-无效/不支持，1-250k，2-500k，3-800k，4-1M，5-2M，6-4M，7-5M，默认值：0-无效/不支持'
        },
        {
          id: 28,
          address: '0x0079',
          label: 'RS485-1通讯速率',
          value: '-',
          note: '0-1200， 1-2400，2-4800，3-9600，4-19200，5-38400，6-57600，7-115200'
        },
        {
          id: 29,
          address: '0x007a',
          label: 'RS485-2通讯速率',
          value: '-'
        },
        {
          id: 30,
          address: '0x007b',
          label: 'RS485-3通讯速率',
          value: '-'
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
          value: '-',
          note: '0x00：LEM-CAB500-C/SP5-012；0x01：LEM-DHAB-S/118；0x30：JC-JHAB-S/18；0xC0：CG-FL2C-200A/75mV'
        },
        {
          id: 32,
          address: '0x0081',
          label: '电流传感器1量程',
          value: '-',
          unit: 'A'
        },
        {
          id: 33,
          address: '0x0082',
          label: '电流传感器2量程',
          value: '-',
          unit: 'A'
        },
        {
          id: 34,
          address: '0x0083',
          label: '电流传感器3量程',
          value: '-',
          unit: 'A'
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
          value: '-',
          note: '0磷酸铁锂电池；1钛酸锂电池；2锰酸锂电池'
        },
        {
          id: 36,
          address: '0x0087',
          label: '电池型号',
          value: '-'
        },
        {
          id: 37,
          address: '0x0088',
          label: '电池厂家',
          value: '-'
        },
        {
          id: 38,
          address: '0x0089',
          label: '电池额定容量',
          value: '-',
          unit: 'Ah'
        },
        {
          id: 39,
          address: '0x008a',
          label: '簇校正电量',
          value: '-',
          unit: 'kWh'
        },
        {
          id: 40,
          address: '0x008c',
          label: '簇额定电量',
          value: '-',
          unit: 'kWh'
        },
        {
          id: 41,
          address: '0x008e',
          label: '簇额定功率',
          value: '-',
          unit: 'kW'
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
          value: '-',
          unit: 's',
          note: '例：开启时间3s，停止1s,实际运行均衡3s停止1s，周期为4s'
        },
        {
          id: 43,
          address: '0x0095',
          label: '均衡关闭时间',
          value: '-',
          unit: 's'
        },
        {
          id: 44,
          address: '0x0096',
          label: '均衡模式选项',
          value: '-',
          note: '0/1：不允许均衡；2/3：允许在开路状态下均衡；4/5：放电；6/7：放电、开路；8/9：充电；10/11：充电、开路；12/13：充电、放电；14/15：充电、放电、开路'
        },
        {
          id: 45,
          address: '0x0097',
          label: '均衡启动单体电压上限',
          value: '-',
          unit: 'mV'
        },
        {
          id: 46,
          address: '0x0098',
          label: '均衡启动单体电压下限',
          value: '-',
          unit: 'mV'
        },
        {
          id: 47,
          address: '0x0099',

          label: '均衡启动电池温度上限',
          value: '-',
          unit: '℃'
        },
        {
          id: 48,
          address: '0x009a',

          label: '均衡启动电池温度下限',
          value: '-',
          unit: '℃'
        },
        {
          id: 49,
          address: '0x009b',

          label: '开路均衡最大时间',
          value: '-',
          unit: 's'
        },
        {
          id: 50,
          address: '0x009c',
          label: '充电均衡阈值电压区间K值',
          value: '-',
          note: '10:2mv；100:15mv；1000:150mv；其他值：20mv'
        },
        {
          id: 51,
          address: '0x009d',
          label: '放电均衡阈值电压区间K值',
          value: '-',
          note: '10:2mv；100:15mv；1000:150mv；其他值：20mv'
        },
        {
          id: 52,
          address: '0x009e',
          label: '开路均衡阈值电压区间K值',
          value: '-',
          note: '10:2mv；100:15mv；1000:150mv；其他值：20mv'
        }
      ]
    }
  ]
  /*   const writeValueArray = Array.from({ length: 55 }, () => '')
  basicConfig.forEach((config) => {
    config.element.forEach((item, index) => {
      item.writeValue = writeValueArray[index]
    })
  }) */
  /*    console.log(basicConfig[0].element) */
  return basicConfig
}
function getArray_ConfigFactorycalib() {
  return [
    /*     {
      classification: '电流电压校准参数',
      element: [
        { address: '0x5700', label: '电流充电小量程校准K值', value: '1.000' },
        { address: '0x5701', label: '电流充电小量程校准B值', value: '1.0' },
        { address: '0x5702', label: '电流放电小量程校准K值', value: '1.000' },
        { address: '0x5703', label: '电流放电小量程校准B值', value: '111.0' },
        { address: '0x5704', label: '电流充电大量程校准K值', value: '1.000' },
        { address: '0x5705', label: '电流充电大量程校准B值', value: '0.0' },
        { address: '0x5706', label: '电流放电大量程校准K值', value: '1.000' },
        { address: '0x5707', label: '电流放电大量程校准B值', value: '0.0' },
        { address: '0x5708', label: '预充电压校准K值', value: '1.000' },
        { address: '0x5709', label: '预充电压校准B值', value: '0.0' },
        { address: '0x570A', label: '组端电压校准K值', value: '1.000' },
        { address: '0x570B', label: '组端电压校准B值', value: '0.0' }
      ]
    }, */
    {
      classification: '设备出厂信息',
      element: [
        { address: '0x5713-0x5716', label: '生产编码', value: '20-1-1-0' },
        { address: '0x5717', label: '本机ID', value: 232 },
        {
          address: '0x5718-0x5719',
          label: '本机IP',
          value: '192.168.10.208',
          dataType: 'ip'
        },
        { address: '0x571A-0x571B', label: '子网掩码', value: '255.255.255.0', dataType: 'ip' },
        { address: '0x571C-0x571D', label: '默认网关', value: '192.168.10.1', dataType: 'ip' },
        { address: '0x571E-0x571F', label: '首选DNS', value: '8.8.8.8', dataType: 'ip' },
        { address: '0x5720-0x5721', label: '备用DNS', value: '8.8.4.4', dataType: 'ip' },
        { address: '0x5722', label: '端口', value: 502 },
        { address: '0x5723', label: 'MAC地址', value: 0 }
        /*         { address: '0x5724', label: 'MAC地址2', value: 0 },
        { address: '0x5725', label: 'MAC地址3', value: 0 } */
      ]
    }
    /*     {
      classification: '事件记录标志位',
      element: [
        { address: '0x5730', label: '上一次事件记录版本号', value: '0000000' },
        { address: '0x5737', label: '事件记录存储数量', value: 14 },
        { address: '0x5738', label: '事件记录存储百分比', value: 0 },
        { address: '0x5739', label: '写事件记录开始位置', value: 14 },
        { address: '0x573B', label: '删除事件记录开始位置', value: 0 },
        { address: '0x573D', label: '等待删除事件记录数量', value: 0 }
      ]
    } */
  ]
}
function getArray_ConfigTime() {
  let basicArray = [
    {
      classification: '系统时间记录',
      element: []
    }
  ]
  let addressArray = [...generateRange(0x5744, 0x575f), '0x575a', '0x575c', '0x575e', '0x5760']
  let labelArray = [
    '系统当前时间-年',
    '系统当前时间-月',
    '系统当前时间-日',
    '系统当前时间-周',
    '系统当前时间-时',
    '系统当前时间-分',
    '系统当前时间-秒',
    '系统启动次数',
    '1-系统启动时间-年',
    '1-系统启动时间-月',
    '1-系统启动时间-日',
    '1-系统启动时间-周',
    '1-系统启动时间-时',
    '1-系统启动时间-分',
    '1-系统启动时间-秒',
    '1-系统停止时间-年',
    '1-系统停止时间-月',
    '1-系统停止时间-日',
    '1-系统停止时间-周',
    '1-系统停止时间-时',
    '1-系统停止时间-分',
    '1-系统停止时间-秒',
    '1-系统运行时间',
    '1-周期任务堆栈大小',
    '1-系统堆栈空间',
    '1-系统堆栈最小空间'
  ]
  let valueArray = Array.from({ length: 26 }, () => '-')
  for (let i = 0; i < 30; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    basicArray[0].element.push({ address, label, value })
  }
  return basicArray
}

function initDataBCUConfig1() {
  const data = [
    ...getArray_ConfigParamSys1(),
    ...getArray_ConfigParamSys2(),
    ...getArray_ConfigFactorycalib()
    /*  ...getArray_ConfigTime() */
  ]
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
        importedValue: '-'
      }
    })
  }))
}
/* const getDropDownList = (label, lang) => {
  switch (label) {
    case lang === 'zh' ? '事件记录模式' : 'Event Logging Mode':
      return [
        { label: '简约模式', value: 0 },
        { label: '详细模式', value: 1 }
      ]
    case lang === 'zh' ? '内测模式' : 'Internal Test Mode':
      return [
        {
          label: '关闭内测模式',
          value: 0
        },
        {
          label: '内测模式1（VT）',
          value: 1
        },
        {
          label: '内测模式2（IACP）',
          value: 2
        },
        {
          label: '内测模式3（DO）',
          value: 3
        }
      ]
    case lang === 'zh' ? '均衡模式' : 'Balancing Mode':
      return [
        { label: '自动均衡', value: 0 },
        { label: '手动均衡', value: 1 }
      ]
    case lang === 'zh' ? '运维模式' : 'Maintenance Mode':
      return [
        { label: '运维模式', value: 23477 },
        { label: '非运维模式', value: 4641 }
      ]
    case lang === 'zh' ? 'PCS类型' : 'PCS Type':
      return [
        { label: '无PCS', value: 65535 },
        { label: '星星PCS', value: 1 },
        { label: '双一力PCS-01', value: 2 },
        { label: '无', value: 0 }
      ]
    case lang === 'zh' ? '制冷设备类型' : 'Refrigeration Equipment Type':
      return [
        { label: '无制冷设备', value: 65535 },
        { label: '柯诺威水冷机', value: 1 },
        { label: '英维克', value: 2 },
        { label: '无', value: 0 }
      ]
    case lang === 'zh' ? '除湿机设备类型' : 'Dehumidifier Equipment Type':
      return [
        { label: '无除湿机设备', value: 65535 },
        { label: '除湿机1', value: 1 },
        { label: '除湿机2', value: 2 },
        { label: '无', value: 0 }
      ]
    case lang === 'zh' ? '消防控制器类型' : 'Fire Controller Type':
      return [
        { label: '无消防控制器', value: 65535 },
        { label: '三沃力源（sanvalor）', value: 1 },
        { label: '无', value: 0 }
      ]
    case lang === 'zh'
      ? 'CAN1通讯速率/仲裁域速率'
      : 'CAN1 Communication Rate/Arbitration Domain Rate':
      return [
        { label: '50k', value: 0 },
        { label: '100k', value: 1 },
        { label: '125k', value: 2 },
        { label: '250k', value: 3 },
        { label: '500k', value: 4 },
        { label: '1M', value: 5 }
      ]
    case lang === 'zh' ? 'CAN1数据域波特率' : 'CAN1 Data Domain Baud Rate':
      return [
        { label: '无效/不支持', value: 0 },
        { label: '250k', value: 1 },
        { label: '500k', value: 2 },
        { label: '800k', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 }
      ]
    case lang === 'zh'
      ? 'CAN2通讯速率/仲裁域速率'
      : 'CAN2 Communication Rate/Arbitration Domain Rate':
      return [
        { label: '50k', value: 0 },
        { label: '100k', value: 1 },
        { label: '125k', value: 2 },
        { label: '250k', value: 3 },
        { label: '500k', value: 4 },
        { label: '1M', value: 5 }
      ]
    case lang === 'zh' ? 'CAN2数据域波特率' : 'CAN2 Data Domain Baud Rate':
      return [
        { label: '无效/不支持', value: 0 },
        { label: '250k', value: 1 },
        { label: '500k', value: 2 },
        { label: '800k', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 }
      ]
    case lang === 'zh'
      ? 'CAN3通讯速率/仲裁域速率'
      : 'CAN3 Communication Rate/Arbitration Domain Rate':
      return [
        { label: '50k', value: 0 },
        { label: '100k', value: 1 },
        { label: '125k', value: 2 },
        { label: '250k', value: 3 },
        { label: '500k', value: 4 },
        { label: '1M', value: 5 }
      ]
    case lang === 'zh' ? 'CAN3数据域波特率' : 'CAN3 Data Domain Baud Rate':
      return [
        { label: '无效/不支持', value: 0 },
        { label: '250k', value: 1 },
        { label: '500k', value: 2 },
        { label: '800k', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 }
      ]
    case lang === 'zh' ? 'RS485-1通讯速率' : 'RS485-1 Communication Rate':
      return [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 }
      ]
    case lang === 'zh' ? 'RS485-2通讯速率' : 'RS485-2 Communication Rate':
      return [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 }
      ]
    case lang === 'zh' ? 'RS485-3通讯速率' : 'RS485-3 Communication Rate':
      return [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 }
      ]
    case lang === 'zh' ? '电流传感器类型' : 'Current Sensor Type':
      return [
        { label: 'LEM-CAB500-C/SP5-012', value: 0 },
        { label: 'LEM-DHAB-S/118', value: 1 },
        { label: 'JC-JHAB-S/18', value: 48 },
        { label: 'CG-FL2C-200A/75mV', value: 192 }
      ]
    case lang === 'zh' ? '电池类型' : 'Battery Type':
      return [
        { label: '磷酸铁锂电池', value: 0 },
        { label: '钛酸锂电池', value: 1 },
        { label: '锰酸锂电池 ', value: 2 }
      ]
    case lang === 'zh' ? '均衡模式选项' : 'Balancing Mode Option':
      return [
        { label: '不允许均衡', value: 0 },
        { label: '允许在开路状态下均衡', value: 2 },
        { label: '放电 ', value: 4 },
        { label: '放电、开路', value: 6 },
        { label: '充电', value: 8 },
        { label: '充电、开路', value: 10 },
        { label: '充电、放电', value: 12 },
        { label: '充电、放电、开路', value: 14 }
      ]
    case lang === 'zh'
      ? '充电均衡阈值电压区间K值'
      : 'Charging Balancing Threshold Voltage Range K Value':
      return [
        { label: '2mV', value: 10 },
        { label: '15mV', value: 100 },
        { label: '150mV', value: 1000 },
        { label: '20mV', value: 10000 }
      ]
    case lang === 'zh'
      ? '放电均衡阈值电压区间K值'
      : 'Discharging Balancing Threshold Voltage Range K Value':
      return [
        { label: '2mV', value: 10 },
        { label: '15mV', value: 100 },
        { label: '150mV', value: 1000 },
        { label: '20mV', value: 10000 }
      ]
    case lang === 'zh'
      ? '开路均衡阈值电压区间K值'
      : 'Open Circuit Balancing Threshold Voltage Range K Value':
      return [
        { label: '2mV', value: 10 },
        { label: '15mV', value: 100 },
        { label: '150mV', value: 1000 },
        { label: '20mV', value: 10000 }
      ]
    default:
      return []
  }
} */
const getDropDownList = (label) => {
  switch (label) {
    case '事件记录模式':
      return [
        { label: '简约模式', value: 0 },
        { label: '详细模式', value: 1 }
      ]
    case '内测模式':
      return [
        {
          label: '关闭内测模式',
          value: 0
        },
        {
          label: '内测模式1（V、T）',
          value: 1
        },
        {
          label: '内测模式2（IACP）',
          value: 2
        },
        {
          label: '内测模式3（DO）',
          value: 3
        }
      ]
    case '均衡模式':
      return [
        { label: '自动均衡', value: 0 },
        { label: '手动均衡', value: 1 }
      ]
    case '运维模式':
      return [
        { label: '运维模式', value: 23477 },
        { label: '非运维模式', value: 4641 }
      ]
    case 'PCS类型':
      return [
        { label: '无PCS', value: 65535 },
        { label: '星星PCS', value: 1 },
        { label: '双一力PCS-01', value: 2 },
        { label: '科华PCS', value: 3 },
        { label: '无', value: 0 }
      ]
    case '制冷设备类型':
      return [
        { label: '无制冷设备', value: 65535 },
        { label: '柯诺威水冷机', value: 1 },
        { label: '英维克', value: 2 },
        { label: '无', value: 0 }
      ]
    case '除湿机设备类型':
      return [
        { label: '无除湿机设备', value: 65535 },
        { label: '除湿机1', value: 1 },
        { label: '除湿机2', value: 2 },
        { label: '无', value: 0 }
      ]
    case '消防控制器类型':
      return [
        { label: '无消防控制器', value: 65535 },
        { label: '三沃力源（sanvalor）', value: 1 },
        { label: '无', value: 0 }
      ]
    case 'CAN1通讯速率/仲裁域速率':
      return [
        { label: '50k', value: 0 },
        { label: '100k', value: 1 },
        { label: '125k', value: 2 },
        { label: '250k', value: 3 },
        { label: '500k', value: 4 },
        { label: '1M', value: 5 }
      ]
    case 'CAN1数据域波特率':
      return [
        { label: '无效/不支持', value: 0 },
        { label: '250k', value: 1 },
        { label: '500k', value: 2 },
        { label: '800k', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 }
      ]
    case 'CAN2通讯速率/仲裁域速率':
      return [
        { label: '50k', value: 0 },
        { label: '100k', value: 1 },
        { label: '125k', value: 2 },
        { label: '250k', value: 3 },
        { label: '500k', value: 4 },
        { label: '1M', value: 5 }
      ]
    case 'CAN2数据域波特率':
      return [
        { label: '无效/不支持', value: 0 },
        { label: '250k', value: 1 },
        { label: '500k', value: 2 },
        { label: '800k', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 }
      ]
    case 'CAN3通讯速率/仲裁域速率':
      return [
        { label: '50k', value: 0 },
        { label: '100k', value: 1 },
        { label: '125k', value: 2 },
        { label: '250k', value: 3 },
        { label: '500k', value: 4 },
        { label: '1M', value: 5 }
      ]
    case 'CAN3数据域波特率':
      return [
        { label: '无效/不支持', value: 0 },
        { label: '250k', value: 1 },
        { label: '500k', value: 2 },
        { label: '800k', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 }
      ]
    case 'RS485-1通讯速率':
      return [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 }
      ]
    case 'RS485-2通讯速率':
      return [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 }
      ]
    case 'RS485-3通讯速率':
      return [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 }
      ]
    case '电流传感器类型':
      return [
        { label: 'LEM-CAB500-C/SP5-012', value: 0 },
        { label: 'LEM-DHAB-S/118', value: 1 },
        { label: 'JC-JHAB-S/18', value: 48 },
        { label: 'CG-FL2C-200A/75mV', value: 192 }
      ]
    case '电池类型':
      return [
        { label: '磷酸铁锂电池', value: 0 },
        { label: '钛酸锂电池', value: 1 },
        { label: '锰酸锂电池 ', value: 2 }
      ]
    case '均衡模式选项':
      return [
        { label: '不允许均衡', value: 0 },
        { label: '允许在开路状态下均衡', value: 2 },
        { label: '放电 ', value: 4 },
        { label: '放电、开路', value: 6 },
        { label: '充电', value: 8 },
        { label: '充电、开路', value: 10 },
        { label: '充电、放电', value: 12 },
        { label: '充电、放电、开路', value: 14 }
      ]
    case '充电均衡阈值电压区间K值':
      return [
        { label: '2mV', value: 10 },
        { label: '15mV', value: 100 },
        { label: '150mV', value: 1000 },
        { label: '20mV', value: 10000 }
      ]
    case '放电均衡阈值电压区间K值':
      return [
        { label: '2mV', value: 10 },
        { label: '15mV', value: 100 },
        { label: '150mV', value: 1000 },
        { label: '20mV', value: 10000 }
      ]
    case '开路均衡阈值电压区间K值':
      return [
        { label: '2mV', value: 10 },
        { label: '15mV', value: 100 },
        { label: '150mV', value: 1000 },
        { label: '20mV', value: 10000 }
      ]
    default:
      return []
  }
}
const getDropDownListEN = (label) => {
  switch (label) {
    case 'Event Logging Mode':
      return [
        { label: 'Simple Mode', value: 0 },
        { label: 'Detailed Mode', value: 1 }
      ]
    case 'Internal Test Mode':
      return [
        {
          label: 'Disable Internal Test Mode',
          value: 0
        },
        {
          label: 'Internal Test Mode 1 (VT)',
          value: 1
        },
        {
          label: 'Internal Test Mode 2 (IACP)',
          value: 2
        },
        {
          label: 'Internal Test Mode 3 (DO)',
          value: 3
        }
      ]
    case 'Balancing Mode':
      return [
        { label: 'Auto Balancing', value: 0 },
        { label: 'Manual Balancing', value: 1 }
      ]
    case 'Maintenance Mode':
      return [
        { label: 'Maintenance Mode', value: 23477 },
        { label: 'Non-Maintenance Mode', value: 4641 }
      ]
    case 'PCS Type':
      return [
        { label: 'No PCS', value: 65535 },
        { label: 'Star PCS', value: 1 },
        { label: 'Shuangyili PCS-01', value: 2 },
        { label: 'Kehua PCS', value: 3 },
        { label: 'None', value: 0 }
      ]
    case 'Refrigeration Equipment Type':
      return [
        { label: 'No Refrigeration Equipment', value: 65535 },
        { label: 'Kenuowei Water Cooler', value: 1 },
        { label: 'Envicool Water Cooler', value: 2 },
        { label: 'None', value: 0 }
      ]
    case 'Dehumidifier Equipment Type':
      return [
        { label: 'No Dehumidifier Equipment', value: 65535 },
        { label: 'Dehumidifier 1', value: 1 },
        { label: 'Dehumidifier 2', value: 2 },
        { label: 'None', value: 0 }
      ]
    case 'Fire Controller Type':
      return [
        { label: 'No Fire Controller', value: 65535 },
        { label: 'Sanvalor', value: 1 },
        { label: 'None', value: 0 }
      ]
    case 'CAN1 Communication Rate/Arbitration Domain Rate':
      return [
        { label: '50k', value: 0 },
        { label: '100k', value: 1 },
        { label: '125k', value: 2 },
        { label: '250k', value: 3 },
        { label: '500k', value: 4 },
        { label: '1M', value: 5 }
      ]
    case 'CAN1 Data Domain Baud Rate':
      return [
        { label: 'None', value: 0 },
        { label: '250k', value: 1 },
        { label: '500k', value: 2 },
        { label: '800k', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 }
      ]
    case 'CAN2 Communication Rate/Arbitration Domain Rate':
      return [
        { label: '50k', value: 0 },
        { label: '100k', value: 1 },
        { label: '125k', value: 2 },
        { label: '250k', value: 3 },
        { label: '500k', value: 4 },
        { label: '1M', value: 5 }
      ]
    case 'CAN2 Data Domain Baud Rate':
      return [
        { label: 'None', value: 0 },
        { label: '250k', value: 1 },
        { label: '500k', value: 2 },
        { label: '800k', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 }
      ]
    case 'CAN3 Communication Rate/Arbitration Domain Rate':
      return [
        { label: '50k', value: 0 },
        { label: '100k', value: 1 },
        { label: '125k', value: 2 },
        { label: '250k', value: 3 },
        { label: '500k', value: 4 },
        { label: '1M', value: 5 }
      ]
    case 'CAN3 Data Domain Baud Rate':
      return [
        { label: 'None', value: 0 },
        { label: '250k', value: 1 },
        { label: '500k', value: 2 },
        { label: '800k', value: 3 },
        { label: '1M', value: 4 },
        { label: '2M', value: 5 },
        { label: '4M', value: 6 },
        { label: '5M', value: 7 }
      ]
    case 'RS485-1 Communication Rate':
      return [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 }
      ]
    case 'RS485-2 Communication Rate':
      return [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 }
      ]
    case 'RS485-3 Communication Rate':
      return [
        { label: '1200', value: 0 },
        { label: '2400', value: 1 },
        { label: '4800', value: 2 },
        { label: '9600', value: 3 },
        { label: '19200', value: 4 },
        { label: '38400', value: 5 },
        { label: '57600', value: 6 },
        { label: '115200', value: 7 }
      ]
    case 'Current Sensor Type':
      return [
        { label: 'LEM-CAB500-C/SP5-012', value: 0 },
        { label: 'LEM-DHAB-S/118', value: 1 },
        { label: 'JC-JHAB-S/18', value: 48 },
        { label: 'CG-FL2C-200A/75mV', value: 192 }
      ]
    case 'Battery Type':
      return [
        { label: 'LiFePO4 Battery', value: 0 },
        { label: 'Lithium Titanate Battery', value: 1 },
        { label: 'Lithium Manganese Oxide Battery ', value: 2 }
      ]
    case 'Balancing Mode Options':
      return [
        { label: 'Balancing Not Allowed', value: 0 },
        { label: 'Balancing Allowed in Open Circuit State', value: 2 },
        { label: 'Discharging ', value: 4 },
        { label: 'Discharging, Open Circuit', value: 6 },
        { label: 'Charging', value: 8 },
        { label: 'Charging, Open Circuit', value: 10 },
        { label: 'Charging, Discharging', value: 12 },
        { label: 'Charging, Discharging, Open Circuit', value: 14 }
      ]
    case 'Charging Balancing Threshold Voltage Range K Value':
      return [
        { label: '2mV', value: 10 },
        { label: '15mV', value: 100 },
        { label: '150mV', value: 1000 },
        { label: '20mV', value: 10000 }
      ]
    case 'Discharging Balancing Threshold Voltage Range K Value':
      return [
        { label: '2mV', value: 10 },
        { label: '15mV', value: 100 },
        { label: '150mV', value: 1000 },
        { label: '20mV', value: 10000 }
      ]
    case 'Open Circuit Balancing Threshold Voltage Range K Value':
      return [
        { label: '2mV', value: 10 },
        { label: '15mV', value: 100 },
        { label: '150mV', value: 1000 },
        { label: '20mV', value: 10000 }
      ]
    default:
      return []
  }
}
const labels = [
  '事件记录模式',
  '内测模式',
  '均衡模式',
  '运维模式',
  'PCS类型',
  '制冷设备类型',
  '除湿机设备类型',
  '消防控制器类型',
  'CAN1通讯速率/仲裁域速率',
  'CAN1数据域波特率',
  'CAN2通讯速率/仲裁域速率',
  'CAN2数据域波特率',
  'CAN3通讯速率/仲裁域速率',
  'CAN3数据域波特率',
  'RS485-1通讯速率',
  'RS485-2通讯速率',
  'RS485-3通讯速率',
  '电流传感器类型',
  '电池类型',
  '均衡模式选项',
  '充电均衡阈值电压区间K值',
  '放电均衡阈值电压区间K值',
  '开路均衡阈值电压区间K值'
]
const labelsEN = [
  'Event Logging Mode',
  'Internal Test Mode',
  'Balancing Mode',
  'Maintenance Mode',
  'PCS Type',
  'Refrigeration Equipment Type',
  'Dehumidifier Equipment Type',
  'Fire Controller Type',
  'CAN1 Communication Rate/Arbitration Domain Rate',
  'CAN1 Data Domain Baud Rate',
  'CAN2 Communication Rate/Arbitration Domain Rate',
  'CAN2 Data Domain Baud Rate',
  'CAN3 Communication Rate/Arbitration Domain Rate',
  'CAN3 Data Domain Baud Rate',
  'RS485-1 Communication Rate',
  'RS485-2 Communication Rate',
  'RS485-3 Communication Rate',
  'urrent Sensor Type',
  'Battery Type',
  'Balancing Mode Options',
  'Charging Balancing Threshold Voltage Range K Value',
  'Discharging Balancing Threshold Voltage Range K Value',
  'Open Circuit Balancing Threshold Voltage Range K Value'
]
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
        const oldItem = oldGroup.element.find((i) => i.address === newItem.address)
        const displayValue = oldItem?.displayValue !== undefined ? oldItem.displayValue : null
        const importedValue = oldItem?.importedValue !== undefined ? oldItem.importedValue : '-'
        const isMACAddress = ['MAC地址'].includes(newItem.label)
        // 判断是否需要保留原始字符串值
        const keepOriginal = [
          '生产编码',
          '本机IP',
          '子网掩码',
          '默认网关',
          '首选DNS',
          '备用DNS',
          'MAC地址'
        ].some((s) => newItem.label?.includes(s))

        return {
          ...newItem,
          readOnly: isMACAddress || oldItem?.readOnly, // 保留或重新判断只读状态
          displayValue,
          value: newItem.value,
          importedValue: oldItem?.importedValue ?? '-'
        }
      })
    }
  })
}
function getArray_ConfigAlarmClus() {
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
    '主正接触器过温-轻微报警值',
    '主正接触器过温-轻微报警滤波时间',
    '主正接触器过温-轻微报警恢复值',
    '主正接触器过温-轻微报警恢复滤波时间',
    '主正接触器过温-一般报警值',
    '主正接触器过温-一般报警滤波时间',
    '主正接触器过温-一般报警恢复值',
    '主正接触器过温-一般报警恢复滤波时间',
    '主正接触器过温-严重报警值',
    '主正接触器过温-严重报警滤波时间',
    '主正接触器过温-严重报警恢复值',
    '主正接触器过温-严重报警恢复滤波时间',
    '主负接触器过温-轻微报警值',
    '主负接触器过温-轻微报警滤波时间',
    '主负接触器过温-轻微报警恢复值',
    '主负接触器过温-轻微报警恢复滤波时间',
    '主负接触器过温-一般报警值',
    '主负接触器过温-一般报警滤波时间',
    '主负接触器过温-一般报警恢复值',
    '主负接触器过温-一般报警恢复滤波时间',
    '主负接触器过温-严重报警值',
    '主负接触器过温-严重报警滤波时间',
    '主负接触器过温-严重报警恢复值',
    '主负接触器过温-严重报警恢复滤波时间',
    '预充接触器过温-轻微报警值',
    '预充接触器过温-轻微报警滤波时间',
    '预充接触器过温-轻微报警恢复值',
    '预充接触器过温-轻微报警恢复滤波时间',
    '预充接触器过温-一般报警值',
    '预充接触器过温-一般报警滤波时间',
    '预充接触器过温-一般报警恢复值',
    '预充接触器过温-一般报警恢复滤波时间',
    '预充接触器过温-严重报警值',
    '预充接触器过温-严重报警滤波时间',
    '预充接触器过温-严重报警恢复值',
    '预充接触器过温-严重报警恢复滤波时间',
    '风扇过温-轻微报警值',
    '风扇过温-轻微报警滤波时间',
    '风扇过温-轻微报警恢复值',
    '风扇过温-轻微报警恢复滤波时间',
    '风扇过温-一般报警值',
    '风扇过温-一般报警滤波时间',
    '风扇过温-一般报警恢复值',
    '风扇过温-一般报警恢复滤波时间',
    '风扇过温-严重报警值',
    '风扇过温-严重报警滤波时间',
    '风扇过温-严重报警恢复值',
    '风扇过温-严重报警恢复滤波时间',
    'BCU环境温度上限-轻微报警值',
    'BCU环境温度上限-轻微报警滤波时间',
    'BCU环境温度上限-轻微报警恢复值',
    'BCU环境温度上限-轻微报警恢复滤波时间',
    'BCU环境温度上限-一般报警值',
    'BCU环境温度上限-一般报警滤波时间',
    'BCU环境温度上限-一般报警恢复值',
    'BCU环境温度上限-一般报警恢复滤波时间',
    'BCU环境温度上限-严重报警值',
    'BCU环境温度上限-严重报警滤波时间',
    'BCU环境温度上限-严重报警恢复值',
    'BCU环境温度上限-严重报警恢复滤波时间'
  ]
  let valueArray = Array.from({ length: 120 }, () => '-')
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
    '',
    'A',
    '',
    'A',
    '',
    'A',
    '',
    'A',
    '',
    'A',
    '',
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
    '1KΩ',
    'ms',
    '1KΩ',
    'ms',
    '1KΩ',
    'ms',
    '1KΩ',
    'ms',
    '1KΩ',
    'ms',
    '1KΩ',
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
    /* let writeValue = writeValueArray[i] */
    if (i < 24) {
      basicArray[0].element.push({ address, label, value, unit })
    } else if (i >= 24 && i < 48) {
      basicArray[1].element.push({ address, label, value, unit })
    } else if (i >= 48 && i < 60) {
      basicArray[2].element.push({ address, label, value, unit })
    } else {
      basicArray[3].element.push({ address, label, value, unit })
    }
  }
  /*   console.log(basicArray[0].element.value) */
  return basicArray
}
function getArray_ConfigAlarmBMU() {
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
    'BMU电压压差-严重报警恢复滤波时间',
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
  let valueArray = Array.from({ length: 84 }, () => '-')
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
    /*   let writeValue = writeValueArray[i] */
    if (i < 36) {
      basicArray[0].element.push({ address, label, value, unit })
    } else if (i >= 36 && i < 72) {
      basicArray[1].element.push({ address, label, value, unit })
    } else if (i >= 72 && i < 84) {
      basicArray[2].element.push({ address, label, value, unit })
    } else {
      basicArray[3].element.push({ address, label, value, unit })
    }
  }
  return basicArray
}
function getArray_ConfigAlarmCell1() {
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
    '单体电压下限-一般报警值',
    '单体电压下限-一般报警恢复滤波时间',
    '单体电压下限-严重报警值',
    '单体电压下限-严重报警滤波时间',
    '单体电压下限-严重报警值',
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
  let valueArray = Array.from({ length: 120 }, () => '-')
  let unitArray = [
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
    'ms',
    '1mV',
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
  /*   const writeValueArray = Array.from({ length: 120 }, () => '')
   */ for (let i = 0; i < 120; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    /*     let writeValue = writeValueArray[i]
     */ if (i < 36) {
      basicArray[0].element.push({ address, label, value, unit })
    } else if (i >= 36 && i < 96) {
      basicArray[1].element.push({ address, label, value, unit })
    } else if (i >= 96 && i < 120) {
      basicArray[2].element.push({ address, label, value, unit })
    }
  }
  return basicArray
}
function getArray_ConfigAlarmCell2() {
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
  let valueArray = Array.from({ length: 12 }, () => '-')
  let unitArray = ['%', 'ms', '%', 'ms', '%', 'ms', '%', 'ms', '%', 'ms', '%', 'ms']
  /*   const writeValueArray = Array.from({ length: 12 }, () => '') */
  for (let i = 0; i < 12; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    /*    let writeValue = writeValueArray[i] */
    basicArray[0].element.push({ address, label, value, unit })
  }
  return basicArray
}
function initDataAlarmConfig() {
  const data = [
    ...getArray_ConfigAlarmClus(),
    ...getArray_ConfigAlarmBMU(),
    ...getArray_ConfigAlarmCell1(),
    ...getArray_ConfigAlarmCell2()
  ]
  return data.map((group) => ({
    ...group,
    hasInput: false, // 新增分类级别标记
    element: group.element.map((item) => ({
      ...item,
      displayValue: null, // 新增显示值属性
      value: item.value === '-' ? 0 : Number(item.value),
      importedValue: '-'
    }))
  }))
}
function getArray_ConfigSOX1() {
  let basicArray = [
    {
      classification: '实时保存的SOX数据',
      element: []
    }
  ]
  let addressArray = [
    ...generateRange(0x3200, 0x3202),
    '0x3230',
    '0x3231',
    '0x3232',
    '0x3233-0x3234',
    '0x3235-0x3236',
    '0x3237-0x3238',
    '0x3239-0x323A',
    '0x323F',
    '0x3240',
    '0x3241',
    ...generateRange(0x3206, 0x3225),
    '0x3226-0x3227',
    '0x3228-0x3229',
    '0x322a-0x322b',
    '0x322C'
  ]
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
  ]
  let valueArray = Array.from({ length: 49 }, () => '-')
  let unitArray = [
    '%',
    '%',
    '%',
    '%',
    '%',
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
    '/'
  ]
  /*  const writeValueArray = Array.from({ length: 49 }, () => '') */
  for (let i = 0; i < 49; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    /*  let writeValue = writeValueArray[i] */
    basicArray[0].element.push({ address, label, value, unit })
  }
  /*   console.log(valueArray) */
  return basicArray
}
function getArray_ConfigSOX2() {
  let basicArray = [
    {
      classification: 'sox算法配置参数 - 通用参数',
      element: []
    },
    {
      classification: 'soc算法配置参数',
      element: []
    }
  ]
  let addressArray = [
    ...generateRange(0x5300, 0x530a),
    ...generateRange(0x530d, 0x5312),
    /*  '0x5313', */
    '0x5314',
    /*   '0x5315', */
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
    '休眠唤醒校准时间与温度对应表_时间-1',
    '休眠唤醒校准时间与温度对应表_时间-2',
    '休眠唤醒校准时间与温度对应表_时间-3',
    '休眠唤醒校准时间与温度对应表_时间-4',
    '休眠唤醒校准时间与温度对应表_时间-5',
    '休眠唤醒校准时间与温度对应表_时间-6',
    '休眠唤醒校准时间与温度对应表_温度-1',
    '休眠唤醒校准时间与温度对应表_温度-2',
    '休眠唤醒校准时间与温度对应表_温度-3',
    '休眠唤醒校准时间与温度对应表_温度-4',
    '休眠唤醒校准时间与温度对应表_温度-5',
    '休眠唤醒校准时间与温度对应表_温度-6',
    '显示SOC与RackSOC差值范围',
    '显示SOC追随真实SOC时间',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '充电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '充电修正电压拐点表（97%）',
    '充电修正电压拐点表（97%）',
    '充电修正电压拐点表（97%）',
    '充电修正电压拐点表（97%）',
    '充电修正电压拐点表（97%）',
    '充电修正电压拐点表（97%）',
    '充电修正步长表',
    '充电修正步长表',
    '充电修正步长表',
    '充电修正步长表',
    '充电修正步长表',
    '充电修正步长表',
    '充电修正电流区间点',
    '充电修正电流区间点',
    '充电修正电流区间点',
    '充电修正电流区间点',
    '充电修正电流区间点',
    '充电修正电流区间点',
    '97%点追赶时间',
    '充电修正电压拐点表（99%）',
    '充电修正电压拐点表（99%）',
    '充电修正电压拐点表（99%）',
    '充电修正电压拐点表（99%）',
    '充电修正电压拐点表（99%）',
    '充电修正电压拐点表（99%）',
    '充电修正步长表',
    '充电修正步长表',
    '充电修正步长表',
    '充电修正步长表',
    '充电修正步长表',
    '充电修正步长表',
    '99%点追赶时间',
    '放电修正电压拐点_1/2C',
    '放电修正电压拐点_1/4C',
    '充放电修正电流_1/4C',
    '充放电修正电流_1/2C',
    '放电拐点真实SOC追赶时间'
  ]
  // 只需要对这三类 label 进行编号
  const targets = [
    '休眠唤醒校准时间与温度对应表_时间',
    '休眠唤醒校准时间与温度对应表_温度',
    '充电OCV表（电压输入）',
    '放电OCV表（电压输入）',
    '充电修正电压拐点表（97%）',
    '充电修正步长表',
    '充电修正电流区间点',
    '充电修正电压拐点表（99%）',
    '充电修正步长表'
  ]

  // 用一个对象来记录每类 label 已经出现了多少次
  const counter = {}

  // 遍历并生成新的数组
  const newLabelArray = labelArray.map((label) => {
    if (targets.includes(label)) {
      // 该 label 第几次出现
      counter[label] = (counter[label] || 0) + 1
      return `${label}-${counter[label]}`
    }
    // 不是目标 label，原样返回
    return label
  })
  /*     console.log(params.slice(30, 38))
  console.log(params.slice(30, 38).map((item) => parseFloat((item / 10).toFixed(1))))
  console.log((params[30] / 10).toFixed(1)) */
  let valueArray = Array.from({ length: 113 }, () => '-')
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
  /*   const writeValueArray = Array.from({ length: 113 }, () => '') */
  for (let i = 0; i < 113; i++) {
    let address = addressArray[i]
    let label = newLabelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    /*     let writeValue = writeValueArray[i] */
    if (i < 11) basicArray[0].element.push({ address, label, value, unit })
    else if (11 <= i < 113) basicArray[1].element.push({ address, label, value, unit })
  }
  return basicArray
}
function getArray_ConfigSOX3() {
  let basicArray = [
    {
      classification: 'soh算法配置参数',
      element: []
    }
  ]
  let addressArray = [
    ...generateRange(0x5379, 0x5387),
    /* '0x5388', */
    '0x5389',
    /*  '0x538A', */
    '0x538B',
    /* '0x538C', */
    '0x538D',
    /* '0x538E', */
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
  let valueArray = Array.from({ length: 22 }, () => '-')
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
  /*   const writeValueArray = Array.from({ length: 22 }, () => '') */
  for (let i = 0; i < 22; i++) {
    let address = addressArray[i]
    let label = labelArray[i]
    let value = valueArray[i]
    let unit = unitArray[i]
    /*     let writeValue = writeValueArray[i] */
    basicArray[0].element.push({ address, label, value, unit })
  }
  return basicArray
}
const initDataSOXConfig = () => {
  const data = [...getArray_ConfigSOX1(), ...getArray_ConfigSOX2(), ...getArray_ConfigSOX3()]
  return data.map((group) => ({
    ...group,
    hasInput: false,
    element: group.element.map((item) => ({
      ...item,
      displayValue: null,
      value: item.value === '-' ? 0 : Number(item.value),
      importedValue: '-'
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
        const oldItem = oldGroup.element.find((i) => i.address === newItem.address)

        // 保留有效编辑值
        const displayValue = oldItem?.displayValue !== undefined ? oldItem.displayValue : null
        const importedValue = oldItem?.importedValue !== undefined ? oldItem.importedValue : '-'
        return {
          ...newItem,
          displayValue,
          // 转换数值类型
          value: Number(newItem.value) || 0,
          importedValue
        }
      })
    }
  })
}
const DataBCUConfig1 = ref(initDataBCUConfig1())
const DataAlarmConfig = ref(initDataAlarmConfig())
const DataSOXConfig = ref(initDataSOXConfig())
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
      value: el.displayValue != null ? el.displayValue : el.value
    }))
  )
}
// —— 1.2 通用 CSV 导出器
function exportSingleCsv(rows) {
  // header
  const header = ['模块', '参数名', '值']
  // 每行 JSON.stringify 保证特殊字符安全
  const lines = rows.map((r) =>
    [r.module, r.label, r.value].map((v) => JSON.stringify(v)).join(',')
  )
  const csv = BOM + [header.join(','), ...lines].join('\r\n')
  const fileName = `AllModules_${formatFileSuffix(new Date())}.csv`
  // 2) 通过 IPC 调用主进程写盘
  return window.electron.ipcRenderer.invoke('exportParam-csv', {
    csv,
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
    const cluster = (valOf(elCluster) & 0x7) >>> 0
    const power = (valOf(elPower) & 0x1) >>> 0
    const bmuTemp = (valOf(elBmuTemp) & 0x1) >>> 0
    const combined = (cluster | (power << 3) | (bmuTemp << 4)) >>> 0
    writeData.push({ address: '0x005a', value: combined })
    seen.add('0x005a')
  }

  flatData.forEach((el) => {
    if (el.importedValue == null) return
    const [addr] = el.address.split('-')
    if (seen.has(addr)) return
    if (el.dataType === 'ip') {
      const { high, low } = processValue(el.importedValue, true)
      writeData.push({ address: addr, value: high })
      writeData.push({
        address: ipRelatedRegisters.get(addr).endAddr,
        value: low
      })
    } else {
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
export {
  initDataBCUConfig1,
  getDropDownList,
  getDropDownListEN,
  labels,
  labelsEN,
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
