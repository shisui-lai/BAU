// idToKey.js
export const initDataClusterSumm = [
  {
    classification: '簇端数据1',
    element: [
      {
        id: 208,
        label: '系统总状态位',
        value: null,
        rawValue: null,
        register1: null,
        register2: null,
        statesData: {
          allStates: [
            {
              bit: 0,
              label: '静置',
              key: 'idle',
              isActive: false,
              displayLabel: '静置'
            },
            {
              bit: 1,
              label: '充电',
              key: 'charge',
              isActive: false,
              displayLabel: '充电'
            },
            {
              bit: 2,
              label: '放电',
              key: 'discharge',
              isActive: false,
              displayLabel: '放电'
            },
            {
              bit: 3,
              label: '禁充',
              key: 'forbidCharge',
              isActive: false,
              displayLabel: '禁充'
            },
            {
              bit: 4,
              label: '禁放',
              key: 'forbidDischarge',
              isActive: false,
              displayLabel: '禁放'
            },
            {
              bit: 5,
              label: '禁充禁放',
              key: 'standby',
              isActive: false,
              displayLabel: '禁充禁放'
            },
            {
              bit: 6,
              label: '告警',
              key: 'alarm',
              isActive: false,
              displayLabel: '告警'
            },
            {
              bit: 7,
              label: '故障',
              key: 'fault',
              isActive: false,
              displayLabel: '故障'
            },
            {
              bit: 8,
              label: '充电功率锁存',
              key: 'chargePowerLatch',
              isActive: false,
              displayLabel: '充电功率锁存'
            },
            {
              bit: 9,
              label: '放电功率锁存',
              key: 'dischargePowerLatch',
              isActive: false,
              displayLabel: '放电功率锁存'
            },
            {
              bit: 10,
              label: '充电指令',
              key: 'chargeCmd',
              isActive: false,
              displayLabel: '充电指令'
            },
            {
              bit: 11,
              label: '充电指令完成',
              key: 'chargeCmdDone',
              isActive: false,
              displayLabel: '充电指令完成'
            },
            {
              bit: 12,
              label: '放电指令',
              key: 'dischargeCmd',
              isActive: false,
              displayLabel: '放电指令'
            },
            {
              bit: 13,
              label: '放电指令完成',
              key: 'dischargeCmdDone',
              isActive: false,
              displayLabel: '放电指令完成'
            },
            {
              bit: 14,
              label: '脱离母线指令',
              key: 'busOffCmd',
              isActive: false,
              displayLabel: '脱离母线指令'
            },
            {
              bit: 15,
              label: '脱离母线指令完成',
              key: 'busOffCmdDone',
              isActive: false,
              displayLabel: '脱离母线指令完成'
            },
            {
              bit: 16,
              label: '非运维模式',
              key: 'nonMaintenance',
              isActive: false,
              displayLabel: '非运维模式'
            },
            {
              bit: 16,
              label: '运维模式',
              key: 'maintenance',
              isActive: false,
              displayLabel: '运维模式'
            },
            {
              bit: 17,
              label: '正常模式',
              key: 'normalMode',
              isActive: false,
              displayLabel: '正常模式'
            },
            {
              bit: 17,
              label: '内测模式',
              key: 'testMode',
              isActive: false,
              displayLabel: '内测模式'
            },
            {
              bit: 18,
              label: '初始化完成',
              key: 'initDone',
              isActive: false,
              displayLabel: '初始化完成'
            },
            {
              bit: 18,
              label: '初始化中',
              key: 'initializing',
              isActive: false,
              displayLabel: '初始化中'
            }
          ],
          activeStates: [],
          displayValue: null
        }
      },
      {
        id: 998,
        label: '系统状态',
        value: null,
        rawValue: null,
        statesData: {
          allStates: [
            {
              value: 0,
              label: '系统正常',
              key: 'normal',
              isActive: false,
              displayLabel: '系统正常'
            },
            {
              value: 1,
              label: '系统重启',
              key: 'restart',
              isActive: false,
              displayLabel: '系统重启'
            }
          ],
          activeStates: [],
          displayValue: null
        }
      },
      {
        id: 1000,
        label: '簇模式',
        value: null,
        rawValue: null,
        statesData: {
          allStates: [
            {
              value: 4641,
              label: '启用',
              key: 'enable',
              isActive: false,
              displayLabel: '启用'
            },
            {
              value: 23477,
              label: '禁止',
              key: 'disable',
              isActive: false,
              displayLabel: '禁止'
            }
          ],
          activeStates: [],
          displayValue: null
        }
      },
      {
        id: 1,
        label: '当前状态',
        value: null
      },
      {
        id: 2,
        label: '模拟量故障总等级',
        value: null
      },
      {
        id: 3,
        label: '簇电压',
        value: null,
        unit: 'V'
      },
      {
        id: 5,
        label: '簇电流',
        value: null,
        unit: 'A'
      },
      {
        id: 6,
        label: '簇SOC',
        value: null,
        unit: '%'
      },
      {
        id: 4,
        label: '预充电压',
        value: null,
        unit: 'V'
      },
      {
        id: 7,
        label: '绝缘电阻R+',
        value: null,
        unit: 'kΩ'
      },
      {
        id: 8,
        label: '绝缘电阻R-',
        value: null,
        unit: 'kΩ'
      },
      {
        id: 9,
        label: '温度1',
        value: null,
        unit: '℃'
      },
      {
        id: 10,
        label: '温度2',
        value: null,
        unit: '℃'
      },
      {
        id: 11,
        label: '温度3',
        value: null,
        unit: '℃'
      },
      {
        id: 12,
        label: '温度4',
        value: null,
        unit: '℃'
      },
      {
        id: 13,
        label: '温度5',
        value: null,
        unit: '℃'
      },
      {
        id: 14,
        label: 'BMU总数量',
        value: null
      },
      {
        id: 15,
        label: 'AFE总数量',
        value: null
      },
      {
        id: 16,
        label: '电池总数量',
        value: null
      },
      {
        id: 17,
        label: '温度总数量',
        value: null
      }
    ]
  },
  {
    classification: '簇端数据2',
    element: [
      {
        id: 22,
        label: '最大允充',
        value: null,
        unit: 'kW'
      },
      {
        id: 23,
        label: '最大允放',
        value: null,
        unit: 'kW'
      },
      {
        id: 900,
        address: '0x3272',
        label: '累计充电电量',
        value: null,
        unit: 'kWh'
      },
      {
        id: 901,
        address: '0x3274',
        label: '累计放电电量',
        value: null,
        unit: 'kWh'
      },
      {
        id: 902,
        address: '0x3276',
        label: '累计充电容量',
        value: null,
        unit: 'Ah'
      },
      {
        id: 903,
        address: '0x3278',
        label: '累计放电容量',
        value: null,
        unit: 'Ah'
      },
      {
        id: 18,
        label: '簇SOH',
        value: null,
        unit: '%'
      },
      {
        id: 19,
        label: '簇SOE',
        value: null,
        unit: '%'
      },
      {
        id: 20,
        label: '充电SOP',
        label1: 'chargSOP',
        value: null,
        unit: '%'
      },
      {
        id: 21,
        label: '放电SOP',
        label1: 'dischargSOP',
        value: null,
        unit: '%'
      },
      {
        id: 24,
        label: '单次充电电量',
        value: null,
        unit: 'kWh'
      },
      {
        id: 25,
        label: '单次放电电量',
        value: null,
        unit: 'kWh'
      },
      {
        id: 26,
        label: '单次充电容量',
        value: null,
        unit: 'Ah'
      },
      {
        id: 27,
        label: '单次放电容量',
        value: null,
        unit: 'Ah'
      },
      {
        id: 206,
        label: '簇真实SOC',
        value: null,
        unit: '%'
      },
      {
        id: 207,
        label: 'OCV执行次数',
        value: null,
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
        value: null
      },
      {
        id: 29,
        label: '传感器名称',
        value: null
      },
      {
        id: 30,
        label: '软件版本',
        value: null
      }
    ]
  },
  {
    classification: '堆栈空间信息',
    element: [
      {
        id: 31,
        label: '周期任务堆栈大小',
        value: null,
        unit: 'KB'
      },
      {
        id: 32,
        label: '系统堆栈空间',
        value: null,
        unit: 'KB'
      },
      {
        id: 33,
        label: '系统堆栈最小空间',
        value: null,
        unit: 'KB'
      },
      {
        id: 209,
        label: '可配置默认参数剩余次数',
        value: null
      }
    ]
  },
  {
    classification: '版本号',
    element: [
      {
        id: 34,
        label: 'BCU产品编码',
        value: null
      },
      {
        id: 35,
        label: 'BCU硬件版本',
        value: null
      },
      {
        id: 36,
        label: 'BCU软件版本',
        value: null
      },
      {
        id: 37,
        label: 'BCU-BOOT版本',
        value: null
      },
      {
        id: 38,
        label: 'BCU-BAU协议版本',
        value: null
      },
      {
        id: 39,
        label: 'BCU-BMU协议版本',
        value: null
      },
      {
        id: 40,
        label: 'BCU事件记录版本',
        value: null
      },
      {
        id: 41,
        label: 'BCU-SOX算法版本',
        value: null
      },
      {
        id: 42,
        label: 'BCU默认参数版本号',
        value: null
      },
      {
        id: 1,
        label: 'BMU-1-软件版本号',
        value: null
      },
      {
        id: 1,
        label: 'BMU-1-BOOT版本号',
        value: null
      },
      {
        id: 3,
        label: 'BMU-2-软件版本号',
        value: null
      },
      {
        id: 3,
        label: 'BMU-2-BOOT版本号',
        value: null
      },
      {
        id: 5,
        label: 'BMU-3-软件版本号',
        value: null
      },
      {
        id: 5,
        label: 'BMU-3-BOOT版本号',
        value: null
      },
      {
        id: 7,
        label: 'BMU-4-软件版本号',
        value: null
      },
      {
        id: 7,
        label: 'BMU-4-BOOT版本号',
        value: null
      },
      {
        id: 9,
        label: 'BMU-5-软件版本号',
        value: null
      },
      {
        id: 9,
        label: 'BMU-5-BOOT版本号',
        value: null
      },
      {
        id: 11,
        label: 'BMU-1-产品编码',
        value: null
      },
      {
        id: 12,
        label: 'BMU-2-产品编码',
        value: null
      },
      {
        id: 13,
        label: 'BMU-3-产品编码',
        value: null
      },
      {
        id: 14,
        label: 'BMU-4-产品编码',
        value: null
      },
      {
        id: 15,
        label: 'BMU-5-产品编码',
        value: null
      }
    ]
  }
]
export const initSummData = [
  {
    classification: '单体电压极值',
    element: [
      {
        label: '最大值1',
        id: 1,
        value: 'NaN #0'
      },
      {
        label: '最大值2',
        id: 2,
        value: 'NaN #0'
      },
      {
        label: '最大值3',
        id: 3,
        value: 'NaN #0'
      },
      {
        label: '最小值1',
        id: 4,
        value: 'NaN #0'
      },
      {
        label: '最小值2',
        id: 5,
        value: 'NaN #0'
      },
      {
        label: '最小值3',
        id: 6,
        value: 'NaN #0'
      },
      {
        label: '平均值',
        id: 7,
        value: 0
      },
      {
        label: '极差值',
        id: 8,
        value: 0
      }
    ]
  },
  {
    classification: '单体温度极值',
    element: [
      {
        label: '最大值1',
        id: 1,
        value: 'NaN #0'
      },
      {
        label: '最大值2',
        id: 2,
        value: 'NaN #0'
      },
      {
        label: '最大值3',
        id: 3,
        value: 'NaN #0'
      },
      {
        label: '最小值1',
        id: 4,
        value: 'NaN #0'
      },
      {
        label: '最小值2',
        id: 5,
        value: 'NaN #0'
      },
      {
        label: '最小值3',
        id: 6,
        value: 'NaN #0'
      },
      {
        label: '平均值',
        id: 7,
        value: 0
      },
      {
        label: '极差值',
        id: 8,
        value: 0
      }
    ]
  },
  {
    classification: 'BMU电压极值',
    element: [
      {
        label: '最大值1',
        id: 1,
        value: 'NaN #0'
      },
      {
        label: '最大值2',
        id: 2,
        value: 'NaN #0'
      },
      {
        label: '最大值3',
        id: 3,
        value: 'NaN #0'
      },
      {
        label: '最小值1',
        id: 4,
        value: 'NaN #0'
      },
      {
        label: '最小值2',
        id: 5,
        value: 'NaN #0'
      },
      {
        label: '最小值3',
        id: 6,
        value: 'NaN #0'
      },
      {
        label: '平均值',
        id: 7,
        value: 0
      },
      {
        label: '极差值',
        id: 8,
        value: 0
      }
    ]
  },
  {
    classification: 'BMU温度极值',
    element: [
      {
        label: '最大值1',
        id: 1,
        value: 'NaN #0'
      },
      {
        label: '最大值2',
        id: 2,
        value: 'NaN #0'
      },
      {
        label: '最大值3',
        id: 3,
        value: 'NaN #0'
      },
      {
        label: '最小值1',
        id: 4,
        value: 'NaN #0'
      },
      {
        label: '最小值2',
        id: 5,
        value: 'NaN #0'
      },
      {
        label: '最小值3',
        id: 6,
        value: 'NaN #0'
      },
      {
        label: '平均值',
        id: 7,
        value: 0
      },
      {
        label: '极差值',
        id: 8,
        value: 0
      }
    ]
  },
  {
    classification: '单体SOC极值',
    element: [
      {
        label: '最大值1',
        id: 1,
        value: '0 #251'
      },
      {
        label: '最大值2',
        id: 2,
        value: '0 #252'
      },
      {
        label: '最大值3',
        id: 3,
        value: '0 #253'
      },
      {
        label: '最小值1',
        id: 4,
        value: '0 #251'
      },
      {
        label: '最小值2',
        id: 5,
        value: '0 #252'
      },
      {
        label: '最小值3',
        id: 6,
        value: '0 #253'
      },
      {
        label: '平均值',
        id: 7,
        value: 0
      },
      {
        label: '极差值',
        id: 8,
        value: 0
      }
    ]
  },
  {
    classification: '单体SOH极值',
    element: [
      {
        label: '最大值1',
        id: 1,
        value: '100 #1'
      },
      {
        label: '最大值2',
        id: 2,
        value: '100 #2'
      },
      {
        label: '最大值3',
        id: 3,
        value: '100 #3'
      },
      {
        label: '最小值1',
        id: 4,
        value: '100 #1'
      },
      {
        label: '最小值2',
        id: 5,
        value: '100 #2'
      },
      {
        label: '最小值3',
        id: 6,
        value: '100 #3'
      },
      {
        label: '平均值',
        id: 7,
        value: 100
      },
      {
        label: '极差值',
        id: 8,
        value: 0
      }
    ]
  },
  {
    classification: '动力接插件温度极值',
    element: [
      {
        label: '最大值1',
        id: 1,
        value: 'NaN #0'
      },
      {
        label: '最大值2',
        id: 2,
        value: 'NaN #0'
      },
      {
        label: '最大值3',
        id: 3,
        value: 'NaN #0'
      },
      {
        label: '最小值1',
        id: 4,
        value: 'NaN #0'
      },
      {
        label: '最小值2',
        id: 5,
        value: 'NaN #0'
      },
      {
        label: '最小值3',
        id: 6,
        value: 'NaN #0'
      },
      {
        label: '平均值',
        id: 7,
        value: 0
      },
      {
        label: '极差值',
        id: 8,
        value: 0
      }
    ]
  }
]
export const initDataVersionSumm = [
  {
    classification: 'CAN霍尔传感器信息',
    element: [
      {
        id: 28,
        label: 'LEM/SP5状态信息',
        value: '无故障'
      },
      {
        id: 29,
        label: '传感器名称',
        value: '0'
      },
      {
        id: 30,
        label: '软件版本',
        value: '0'
      }
    ]
  },
  {
    classification: '堆栈空间信息',
    element: [
      {
        id: 31,
        label: '周期任务堆栈大小',
        value: '1.81',
        unit: 'KB'
      },
      {
        id: 32,
        label: '系统堆栈空间',
        value: '95.38',
        unit: 'KB'
      },
      {
        id: 33,
        label: '系统堆栈最小空间',
        value: '52.71',
        unit: 'KB'
      },
      {
        id: 209,
        label: '可配置默认参数剩余次数',
        value: 47
      }
    ]
  },
  {
    classification: '版本号',
    element: [
      {
        id: 34,
        label: 'BCU产品编码',
        value: 'BCUF060202-E0'
      },
      {
        id: 35,
        label: 'BCU硬件版本',
        value: 'HV1.1.0-220830'
      },
      {
        id: 36,
        label: 'BCU软件版本',
        value: 'CF.HS01-250912'
      },
      {
        id: 37,
        label: 'BCU-BOOT版本',
        value: 'CHS-BOOT-V1.3 '
      },
      {
        id: 38,
        label: 'BCU-BAU协议版本',
        value: 'BCU-HS-V00.09 '
      },
      {
        id: 39,
        label: 'BCU-BMU协议版本',
        value: 'BMU-PRO-V0.19 '
      },
      {
        id: 40,
        label: 'BCU事件记录版本',
        value: 'EVE.0.1-250507'
      },
      {
        id: 41,
        label: 'BCU-SOX算法版本',
        value: '    SOX-V00301'
      },
      {
        id: 42,
        label: 'BCU默认参数版本号',
        value: '00000000000000'
      },
      {
        id: 1,
        label: 'BMU-1-软件版本号',
        value: '0'
      },
      {
        id: 1,
        label: 'BMU-1-BOOT版本号',
        value: '0'
      },
      {
        id: 3,
        label: 'BMU-2-软件版本号',
        value: '0'
      },
      {
        id: 3,
        label: 'BMU-2-BOOT版本号',
        value: '0'
      },
      {
        id: 5,
        label: 'BMU-3-软件版本号',
        value: '0'
      },
      {
        id: 5,
        label: 'BMU-3-BOOT版本号',
        value: '0'
      },
      {
        id: 7,
        label: 'BMU-4-软件版本号',
        value: '0'
      },
      {
        id: 7,
        label: 'BMU-4-BOOT版本号',
        value: '0'
      },
      {
        id: 9,
        label: 'BMU-5-软件版本号',
        value: '0'
      },
      {
        id: 9,
        label: 'BMU-5-BOOT版本号',
        value: '0'
      },
      {
        id: 11,
        label: 'BMU-6-软件版本号',
        value: '0'
      },
      {
        id: 11,
        label: 'BMU-6-BOOT版本号',
        value: '0'
      },
      {
        id: 13,
        label: 'BMU-7-软件版本号',
        value: '0'
      },
      {
        id: 13,
        label: 'BMU-7-BOOT版本号',
        value: '0'
      },
      {
        id: 15,
        label: 'BMU-8-软件版本号',
        value: '0'
      },
      {
        id: 15,
        label: 'BMU-8-BOOT版本号',
        value: '0'
      },
      {
        id: 17,
        label: 'BMU-1-产品编码',
        value: '0000000'
      },
      {
        id: 18,
        label: 'BMU-2-产品编码',
        value: '0000000'
      },
      {
        id: 19,
        label: 'BMU-3-产品编码',
        value: '0000000'
      },
      {
        id: 20,
        label: 'BMU-4-产品编码',
        value: '0000000'
      },
      {
        id: 21,
        label: 'BMU-5-产品编码',
        value: '0000000'
      },
      {
        id: 22,
        label: 'BMU-6-产品编码',
        value: '0000000'
      },
      {
        id: 23,
        label: 'BMU-7-产品编码',
        value: '0000000'
      },
      {
        id: 24,
        label: 'BMU-8-产品编码',
        value: '0000000'
      }
    ]
  }
]
export const idToKeyForClusterSummHome = {
  0: 'clusterSummHome.unknown',
  1: 'clusterSummHome.currentState',
  2: 'clusterSummHome.totalFaultLevel',
  3: 'clusterSummHome.clusterVoltage',
  4: 'clusterSummHome.prechargeVoltage',
  5: 'clusterSummHome.clusterCurrent',
  6: 'clusterSummHome.clusterSOC',
  7: 'clusterSummHome.insulationResistanceR+',
  8: 'clusterSummHome.insulationResistanceR-',
  9: 'clusterSummHome.temperature1',
  10: 'clusterSummHome.temperature2',
  11: 'clusterSummHome.temperature3',
  12: 'clusterSummHome.temperature4',
  13: 'clusterSummHome.temperature5',
  18: 'clusterSummHome.clusterSOH',
  19: 'clusterSummHome.clusterSOE',
  20: 'clusterSummHome.chargeSOP',
  21: 'clusterSummHome.dischargeSOP',
  22: 'clusterSummHome.maxChargePower',
  23: 'clusterSummHome.maxDischargePower',
  24: 'clusterSummHome.singleChargeEnengy',
  25: 'clusterSummHome.singleDischargeEnengy',
  26: 'clusterSummHome.singleChargeCapacity',
  27: 'clusterSummHome.singleDischargeCapacity',
  206: 'clusterSummHome.clusterRealSOC',
  207: 'clusterSummHome.OCVExecutionTimes',
  900: 'clusterSummHome.cumulativeChargeEnengy',
  901: 'clusterSummHome.cumulativeDischargeEnengy',
  902: 'clusterSummHome.cumulativeChargeCapacity',
  903: 'clusterSummHome.cumulativeDischargeCapacity',
  998: 'clusterSummHome.systemStatus',
  999: 'clusterSummHome.cumulativeVoltage',
  1000: 'clusterSummHome.disableEnableCluster',
  208: 'clusterSummHome.systemTotalStatus'
}
export const idToKeyForExtremeValue = {
  1: 'extremeValue.maximumValue1',
  2: 'extremeValue.maximumValue2',
  3: 'extremeValue.maximumValue3',
  4: 'extremeValue.minimumValue1',
  5: 'extremeValue.minimumValue2',
  6: 'extremeValue.minimumValue3',
  7: 'extremeValue.averageValue',
  8: 'extremeValue.rangeValue'
}
// 针对某些 field（id）它的 value 也需要翻译，声明一个 valueMap：
export const valueMap = {
  1: {
    静置: 'clusterSummHome.currentStateMap.standby',
    充电: 'clusterSummHome.currentStateMap.charge',
    放电: 'clusterSummHome.currentStateMap.discharge',
    开路: 'clusterSummHome.currentStateMap.open',
    接触器自检: 'clusterSummHome.currentStateMap.self-test',
    '*': 'clusterSummHome.currentStateMap.unknown'
  },
  2: {
    无故障: 'clusterSummHome.totalFaultLevelMap.none',
    严重: 'clusterSummHome.totalFaultLevelMap.major',
    一般: 'clusterSummHome.totalFaultLevelMap.general',
    轻微: 'clusterSummHome.totalFaultLevelMap.minor',
    '*': 'clusterSummHome.totalFaultLevelMap.unknown'
  },
  998: {
    系统正常: 'clusterSummHome.systemStatusMap.normal',
    系统重启: 'clusterSummHome.systemStatusMap.restart',
    '*': 'clusterSummHome.systemStatusMap.unknown'
  },
  1000: {
    启用: 'clusterSummHome.disableEnableClusterMap.enable',
    禁止: 'clusterSummHome.disableEnableClusterMap.disable',
    '*': 'clusterSummHome.disableEnableClusterMap.unknown'
  }
  // …如果有更多需要翻译 value 的字段，都放这里…
}
