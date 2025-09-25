// idToKey.js
export const initDataClusterSumm = () => [
  {
    classification: '簇端数据1',
    element: [
      /* { id: 1, label: '系统状态', value: parseSysStatus(params[51]) }, */
      { id: 1, label: '当前状态', value: '-' },
      { id: 2, label: '模拟量故障总等级', value: '-' },
      { id: 3, label: '簇电压', value: '-', unit: 'V' },
      { id: 5, label: '簇电流', value: '-', unit: 'A' },
      { id: 6, label: '簇SOC', value: '-', unit: '%' },
      { id: 4, label: '预充电压', value: '-', unit: 'V' },
      { id: 7, label: '绝缘电阻R+', value: '-', unit: 'kΩ' },
      { id: 8, label: '绝缘电阻R-', value: '-', unit: 'kΩ' },
      { id: 9, label: '温度1', value: '-', unit: '℃' },
      { id: 10, label: '温度2', value: '-', unit: '℃' },
      { id: 11, label: '温度3', value: '-', unit: '℃' },
      { id: 12, label: '温度4', value: '-', unit: '℃' },
      { id: 13, label: '温度5', value: '-', unit: '℃' },
      { id: 14, label: 'BMU总数量', value: '-' },
      { id: 15, label: 'AFE总数量', value: '-' },
      { id: 16, label: '电池总数量', value: '-' },
      { id: 17, label: '温度总数量', value: '-' }
    ]
  },
  {
    classification: '簇端数据2',
    element: [
      { id: 18, label: '簇SOH', value: '-', unit: '%' },
      { id: 19, label: '簇SOE', value: '-', unit: '%' },
      /*           { id: 17, label: '充电SOP有效校验标识', value: params[22] }, */
      { id: 20, label: '充电SOP', value: '-', unit: '%' },
      { id: 21, label: '放电SOP', value: '-', unit: '%' },
      {
        id: 22,
        label: '最大允充',
        value: '-',
        unit: 'kW'
      },
      {
        id: 23,
        label: '最大允放',
        value: '-',
        unit: 'kW'
      },
      {
        id: 900,
        label: '累计充电电量',
        value: '-',
        unit: 'kWh'
      },
      {
        id: 901,
        label: '累计放电电量',
        value: '-',
        unit: 'kWh'
      },
      {
        id: 902,
        label: '累计充电容量',
        value: '-',
        unit: 'Ah'
      },
      {
        id: 903,
        label: '累计放电容量',
        value: '-',
        unit: 'Ah'
      },
      {
        id: 24,
        label: '单次充电电量',
        value: '-',
        unit: 'kWh'
      },
      {
        id: 25,
        label: '单次放电电量',
        value: '-',
        unit: 'kWh'
      },
      {
        id: 26,
        label: '单次充电容量',
        value: '-',
        unit: 'Ah'
      },
      {
        id: 27,
        label: '单次放电容量',
        value: '-',
        unit: 'Ah'
      },
      {
        id: 206,
        label: '簇真实SOC',
        value: '-',
        unit: '%'
      },
      {
        id: 207,
        label: 'OCV执行次数',
        value: '-',
        unit: ''
      },
      {
        id: 208,
        label: '系统总状态位',
        value: '-'
      }
    ]
  }
]
export const initSummData = () => {
  const data = [
    {
      classification: '单体电压极值',
      element: [
        { label: '最大值1', value: '-' },
        {
          label: '最大值2',
          value: '-'
        },
        { label: '最大值3', value: '-' },
        { label: '平均值', value: '-' },
        { label: '最小值2', value: '-' },
        { label: '最小值3', value: '-' },
        { label: '最小值1', value: '-' },
        { label: '极差值', value: '-' }
      ]
    },
    {
      classification: '单体温度极值',
      element: [
        { label: '最大值1', value: '-' },
        {
          label: '最大值2',
          value: '-'
        },
        { label: '最大值3', value: '-' },
        { label: '平均值', value: '-' },
        { label: '最小值2', value: '-' },
        { label: '最小值3', value: '-' },
        { label: '最小值1', value: '-' },
        { label: '极差值', value: '-' }
      ]
    },
    {
      classification: 'BMU电压极值',
      element: [
        { label: '最大值1', value: '-' },
        {
          label: '最大值2',
          value: '-'
        },
        { label: '最大值3', value: '-' },
        { label: '平均值', value: '-' },
        { label: '最小值2', value: '-' },
        { label: '最小值3', value: '-' },
        { label: '最小值1', value: '-' },
        { label: '极差值', value: '-' }
      ]
    },
    {
      classification: 'BMU温度极值',
      element: [
        { label: '最大值1', value: '-' },
        {
          label: '最大值2',
          value: '-'
        },
        { label: '最大值3', value: '-' },
        { label: '平均值', value: '-' },
        { label: '最小值2', value: '-' },
        { label: '最小值3', value: '-' },
        { label: '最小值1', value: '-' },
        { label: '极差值', value: '-' }
      ]
    },
    {
      classification: '单体SOC极值',
      element: [
        { label: '最大值1', value: '-' },
        {
          label: '最大值2',
          value: '-'
        },
        { label: '最大值3', value: '-' },
        { label: '平均值', value: '-' },
        { label: '最小值2', value: '-' },
        { label: '最小值3', value: '-' },
        { label: '最小值1', value: '-' },
        { label: '极差值', value: '-' }
      ]
    },
    {
      classification: '单体SOH极值',
      element: [
        { label: '最大值1', value: '-' },
        {
          label: '最大值2',
          value: '-'
        },
        { label: '最大值3', value: '-' },
        { label: '平均值', value: '-' },
        { label: '最小值2', value: '-' },
        { label: '最小值3', value: '-' },
        { label: '最小值1', value: '-' },
        { label: '极差值', value: '-' }
      ]
    },
    {
      classification: '极柱温度极值',
      element: [
        { label: '最大值1', value: '-' },
        {
          label: '最大值2',
          value: '-'
        },
        { label: '最大值3', value: '-' },
        { label: '平均值', value: '-' },
        { label: '最小值2', value: '-' },
        { label: '最小值3', value: '-' },
        { label: '最小值1', value: '-' },
        { label: '极差值', value: '-' }
      ]
    }
  ]
  // 2. 用一个全局计数器给每个 element 注入唯一 id
  data.forEach((group) => {
    let idCounter = 1
    group.element.forEach((el) => {
      el.id = idCounter++
    })
  })
  return data
}
export const initDataVersionSumm = () => [
  {
    classification: 'CAN霍尔传感器信息',
    element: [
      { id: 34, label: 'LEM/SP5状态信息', value: '-' },
      { id: 35, label: '传感器名称', value: '-' },
      { id: 36, label: '软件版本', value: '-' }
    ]
  },
  {
    classification: '堆栈空间信息',
    element: [
      { id: 37, label: '周期任务堆栈大小', value: '-', unit: 'Kb' },
      { id: 38, label: '系统堆栈空间', value: '-', unit: 'Kb' },
      { id: 39, label: '系统堆栈最小空间', value: '-', unit: 'Kb' }
    ]
  },
  {
    classification: '版本号',
    element: [
      { id: 40, label: 'BCU产品编码', value: '-' },
      { id: 41, label: 'BCU硬件版本', value: '-' },
      { id: 42, label: 'BCU软件版本', value: '-' },
      { id: 43, label: 'BCU-BOOT版本', value: '-' },
      { id: 44, label: 'BCU-BAU协议版本', value: '-' },
      { id: 45, label: 'BCU-BMU协议版本', value: '-' },
      { id: 46, label: 'BCU事件记录版本', value: '-' },
      { id: 47, label: 'BCU-sox算法版本', value: '-' },
      { id: 1, label: 'BMU-1-软件版本号', value: '-' },
      { id: 1, label: 'BMU-1-BOOT版本号', value: '-' },
      { id: 3, label: 'BMU-2-软件版本号', value: '-' },
      { id: 3, label: 'BMU-2-BOOT版本号', value: '-' },
      { id: 5, label: 'BMU-3-软件版本号', value: '-' },
      { id: 5, label: 'BMU-3-BOOT版本号', value: '-' }
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
  999: 'clusterSummHome.cumulativeVoltage',
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
  }
  // …如果有更多需要翻译 value 的字段，都放这里…
}
