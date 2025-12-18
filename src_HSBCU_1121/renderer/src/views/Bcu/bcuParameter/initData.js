const initAlarmConfig = [
  {
    classification: '簇端电压告警',
    element: [
      {
        address: '0x3000',
        label: '簇端电压上限-轻微报警值',
        value: '1344.0',
        unit: 'V'
      },
      {
        address: '0x3001',
        label: '簇端电压上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3002',
        label: '簇端电压上限-轻微报警恢复值',
        value: '1305.6',
        unit: 'V'
      },
      {
        address: '0x3003',
        label: '簇端电压上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3004',
        label: '簇端电压上限-一般报警值',
        value: '1363.2',
        unit: 'V'
      },
      {
        address: '0x3005',
        label: '簇端电压上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3006',
        label: '簇端电压上限-一般报警恢复值',
        value: '1324.8',
        unit: 'V'
      },
      {
        address: '0x3007',
        label: '簇端电压上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3008',
        label: '簇端电压上限-严重报警值',
        value: '1382.4',
        unit: 'V'
      },
      {
        address: '0x3009',
        label: '簇端电压上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x300a',
        label: '簇端电压上限-严重报警恢复值',
        value: '1344.0',
        unit: 'V'
      },
      {
        address: '0x300b',
        label: '簇端电压上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x300c',
        label: '簇端电压下限-轻微报警值',
        value: '1113.6',
        unit: 'V'
      },
      {
        address: '0x300d',
        label: '簇端电压下限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x300e',
        label: '簇端电压下限-轻微报警恢复值',
        value: '1132.8',
        unit: 'V'
      },
      {
        address: '0x300f',
        label: '簇端电压下限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3010',
        label: '簇端电压下限-一般报警值',
        value: '1094.4',
        unit: 'V'
      },
      {
        address: '0x3011',
        label: '簇端电压下限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3012',
        label: '簇端电压下限-一般报警恢复值',
        value: '1113.6',
        unit: 'V'
      },
      {
        address: '0x3013',
        label: '簇端电压下限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3014',
        label: '簇端电压下限-严重报警值',
        value: '1075.2',
        unit: 'V'
      },
      {
        address: '0x3015',
        label: '簇端电压下限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3016',
        label: '簇端电压下限-严重报警恢复值',
        value: '1094.4',
        unit: 'V'
      },
      {
        address: '0x3017',
        label: '簇端电压下限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  },
  {
    classification: '电流告警',
    element: [
      {
        address: '0x3018',
        label: '充电电流上限-轻微报警值',
        value: '170.0',
        unit: 'A'
      },
      {
        address: '0x3019',
        label: '充电电流上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x301a',
        label: '充电电流上限-轻微报警恢复值',
        value: '140.0',
        unit: 'A'
      },
      {
        address: '0x301b',
        label: '充电电流上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x301c',
        label: '充电电流上限-一般报警值',
        value: '180.0',
        unit: 'A'
      },
      {
        address: '0x301d',
        label: '充电电流上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x301e',
        label: '充电电流上限-一般报警恢复值',
        value: '140.0',
        unit: 'A'
      },
      {
        address: '0x301f',
        label: '充电电流上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3020',
        label: '充电电流上限-严重报警值',
        value: '190.0',
        unit: 'A'
      },
      {
        address: '0x3021',
        label: '充电电流上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3022',
        label: '充电电流上限-严重报警恢复值',
        value: '140.0',
        unit: 'A'
      },
      {
        address: '0x3023',
        label: '充电电流上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3024',
        label: '放电电流上限-轻微报警值',
        value: '170.0',
        unit: 'A'
      },
      {
        address: '0x3025',
        label: '放电电流上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3026',
        label: '放电电流上限-轻微报警恢复值',
        value: '140.0',
        unit: 'A'
      },
      {
        address: '0x3027',
        label: '放电电流上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3028',
        label: '放电电流上限-一般报警值',
        value: '180.0',
        unit: 'A'
      },
      {
        address: '0x3029',
        label: '放电电流上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x302a',
        label: '放电电流上限-一般报警恢复值',
        value: '140.0',
        unit: 'A'
      },
      {
        address: '0x302b',
        label: '放电电流上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x302c',
        label: '放电电流上限-严重报警值',
        value: '190.0',
        unit: 'A'
      },
      {
        address: '0x302d',
        label: '放电电流上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x302e',
        label: '放电电流上限-严重报警恢复值',
        value: '140.0',
        unit: 'A'
      },
      {
        address: '0x302f',
        label: '放电电流上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  },
  {
    classification: '绝缘电阻告警',
    element: [
      {
        address: '0x3030',
        label: '绝缘电阻-轻微报警值',
        value: 1500,
        unit: 'kΩ'
      },
      {
        address: '0x3031',
        label: '绝缘电阻-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3032',
        label: '绝缘电阻-轻微报警恢复值',
        value: 1700,
        unit: 'kΩ'
      },
      {
        address: '0x3033',
        label: '绝缘电阻-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3034',
        label: '绝缘电阻-一般报警值',
        value: 1200,
        unit: 'kΩ'
      },
      {
        address: '0x3035',
        label: '绝缘电阻-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3036',
        label: '绝缘电阻-一般报警恢复值',
        value: 1400,
        unit: 'kΩ'
      },
      {
        address: '0x3037',
        label: '绝缘电阻-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3038',
        label: '绝缘电阻-严重报警值',
        value: 1000,
        unit: 'kΩ'
      },
      {
        address: '0x3039',
        label: '绝缘电阻-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x303a',
        label: '绝缘电阻-严重报警恢复值',
        value: 1200,
        unit: 'kΩ'
      },
      {
        address: '0x303b',
        label: '绝缘电阻-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  },
  {
    classification: '过温告警',
    element: [
      {
        address: '0x303c',
        label: '温度1过温-轻微报警值',
        value: '65.0',
        unit: '℃'
      },
      {
        address: '0x303d',
        label: '温度1过温-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x303e',
        label: '温度1过温-轻微报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x303f',
        label: '温度1过温-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3040',
        label: '温度1过温-一般报警值',
        value: '70.0',
        unit: '℃'
      },
      {
        address: '0x3041',
        label: '温度1过温-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3042',
        label: '温度1过温-一般报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x3043',
        label: '温度1过温-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3044',
        label: '温度1过温-严重报警值',
        value: '75.0',
        unit: '℃'
      },
      {
        address: '0x3045',
        label: '温度1过温-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3046',
        label: '温度1过温-严重报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x3047',
        label: '温度1过温-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3048',
        label: '温度2过温-轻微报警值',
        value: '65.0',
        unit: '℃'
      },
      {
        address: '0x3049',
        label: '温度2过温-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x304a',
        label: '温度2过温-轻微报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x304b',
        label: '温度2过温-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x304c',
        label: '温度2过温-一般报警值',
        value: '70.0',
        unit: '℃'
      },
      {
        address: '0x304d',
        label: '温度2过温-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x304e',
        label: '温度2过温-一般报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x304f',
        label: '温度2过温-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3050',
        label: '温度2过温-严重报警值',
        value: '75.0',
        unit: '℃'
      },
      {
        address: '0x3051',
        label: '温度2过温-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3052',
        label: '温度2过温-严重报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x3053',
        label: '温度2过温-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3054',
        label: '温度3过温-轻微报警值',
        value: '65.0',
        unit: '℃'
      },
      {
        address: '0x3055',
        label: '温度3过温-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3056',
        label: '温度3过温-轻微报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x3057',
        label: '温度3过温-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3058',
        label: '温度3过温-一般报警值',
        value: '70.0',
        unit: '℃'
      },
      {
        address: '0x3059',
        label: '温度3过温-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x305a',
        label: '温度3过温-一般报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x305b',
        label: '温度3过温-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x305c',
        label: '温度3过温-严重报警值',
        value: '75.0',
        unit: '℃'
      },
      {
        address: '0x305d',
        label: '温度3过温-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x305e',
        label: '温度3过温-严重报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x305f',
        label: '温度3过温-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3060',
        label: '温度4过温-轻微报警值',
        value: '65.0',
        unit: '℃'
      },
      {
        address: '0x3061',
        label: '温度4过温-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3062',
        label: '温度4过温-轻微报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x3063',
        label: '温度4过温-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3064',
        label: '温度4过温-一般报警值',
        value: '70.0',
        unit: '℃'
      },
      {
        address: '0x3065',
        label: '温度4过温-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3066',
        label: '温度4过温-一般报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x3067',
        label: '温度4过温-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3068',
        label: '温度4过温-严重报警值',
        value: '75.0',
        unit: '℃'
      },
      {
        address: '0x3069',
        label: '温度4过温-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x306a',
        label: '温度4过温-严重报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x306b',
        label: '温度4过温-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x306c',
        label: '温度5过温上限-轻微报警值',
        value: '55.0',
        unit: '℃'
      },
      {
        address: '0x306d',
        label: '温度5过温上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x306e',
        label: '温度5过温上限-轻微报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x306f',
        label: '温度5过温上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3070',
        label: '温度5过温上限-一般报警值',
        value: '60.0',
        unit: '℃'
      },
      {
        address: '0x3071',
        label: '温度5过温上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3072',
        label: '温度5过温上限-一般报警恢复值',
        value: '55.0',
        unit: '℃'
      },
      {
        address: '0x3073',
        label: '温度5过温上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3074',
        label: '温度5过温上限-严重报警值',
        value: '65.0',
        unit: '℃'
      },
      {
        address: '0x3075',
        label: '温度5过温上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3076',
        label: '温度5过温上限-严重报警恢复值',
        value: '60.0',
        unit: '℃'
      },
      {
        address: '0x3077',
        label: '温度5过温上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  },
  {
    classification: 'BMU电压告警',
    element: [
      {
        address: '0x3085',
        label: 'BMU电压上限-轻微报警值',
        value: '168.0',
        unit: 'V'
      },
      {
        address: '0x3086',
        label: 'BMU电压上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3087',
        label: 'BMU电压上限-轻微报警恢复值',
        value: '163.2',
        unit: 'V'
      },
      {
        address: '0x3088',
        label: 'BMU电压上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3089',
        label: 'BMU电压上限-一般报警值',
        value: '170.4',
        unit: 'V'
      },
      {
        address: '0x308a',
        label: 'BMU电压上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x308b',
        label: 'BMU电压上限-一般报警恢复值',
        value: '165.6',
        unit: 'V'
      },
      {
        address: '0x308c',
        label: 'BMU电压上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x308d',
        label: 'BMU电压上限-严重报警值',
        value: '172.8',
        unit: 'V'
      },
      {
        address: '0x308e',
        label: 'BMU电压上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x308f',
        label: 'BMU电压上限-严重报警恢复值',
        value: '168.0',
        unit: 'V'
      },
      {
        address: '0x3090',
        label: 'BMU电压上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3091',
        label: 'BMU电压下限-轻微报警值',
        value: '139.2',
        unit: 'V'
      },
      {
        address: '0x3092',
        label: 'BMU电压下限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3093',
        label: 'BMU电压下限-轻微报警恢复值',
        value: '141.6',
        unit: 'V'
      },
      {
        address: '0x3094',
        label: 'BMU电压下限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3095',
        label: 'BMU电压下限-一般报警值',
        value: '136.8',
        unit: 'V'
      },
      {
        address: '0x3096',
        label: 'BMU电压下限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3097',
        label: 'BMU电压下限-一般报警恢复值',
        value: '139.2',
        unit: 'V'
      },
      {
        address: '0x3098',
        label: 'BMU电压下限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3099',
        label: 'BMU电压下限-严重报警值',
        value: '134.4',
        unit: 'V'
      },
      {
        address: '0x309a',
        label: 'BMU电压下限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x309b',
        label: 'BMU电压下限-严重报警恢复值',
        value: '136.8',
        unit: 'V'
      },
      {
        address: '0x309c',
        label: 'BMU电压下限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x309d',
        label: 'BMU电压压差-轻微报警值',
        value: '7.2',
        unit: 'V'
      },
      {
        address: '0x309e',
        label: 'BMU电压压差-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x309f',
        label: 'BMU电压压差-轻微报警恢复值',
        value: '4.8',
        unit: 'V'
      },
      {
        address: '0x30a0',
        label: 'BMU电压压差-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30a1',
        label: 'BMU电压压差-一般报警值',
        value: '12.0',
        unit: 'V'
      },
      {
        address: '0x30a2',
        label: 'BMU电压压差-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30a3',
        label: 'BMU电压压差-一般报警恢复值',
        value: '9.6',
        unit: 'V'
      },
      {
        address: '0x30a4',
        label: 'BMU电压压差-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30a5',
        label: 'BMU电压压差-严重报警值',
        value: '16.8',
        unit: 'V'
      },
      {
        address: '0x30a6',
        label: 'BMU电压压差-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30a7',
        label: 'BMU电压压差-严重报警恢复值',
        value: '14.4',
        unit: 'V'
      },
      {
        address: '0x30a8',
        label: 'BMU电压压差-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  },
  {
    classification: 'BMU电路板温度告警',
    element: [
      {
        address: '0x30a9',
        label: 'BMU电路板温度上限-轻微报警值',
        value: '75.0',
        unit: '℃'
      },
      {
        address: '0x30aa',
        label: 'BMU电路板温度上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30ab',
        label: 'BMU电路板温度上限-轻微报警恢复值',
        value: '70.0',
        unit: '℃'
      },
      {
        address: '0x30ac',
        label: 'BMU电路板温度上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30ad',
        label: 'BMU电路板温度上限-一般报警值',
        value: '80.0',
        unit: '℃'
      },
      {
        address: '0x30ae',
        label: 'BMU电路板温度上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30af',
        label: 'BMU电路板温度上限-一般报警恢复值',
        value: '75.0',
        unit: '℃'
      },
      {
        address: '0x30b0',
        label: 'BMU电路板温度上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30b1',
        label: 'BMU电路板温度上限-严重报警值',
        value: '85.0',
        unit: '℃'
      },
      {
        address: '0x30b2',
        label: 'BMU电路板温度上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30b3',
        label: 'BMU电路板温度上限-严重报警恢复值',
        value: '80.0',
        unit: '℃'
      },
      {
        address: '0x30b4',
        label: 'BMU电路板温度上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30b5',
        label: 'BMU电路板温度下限-轻微报警值',
        value: '-25.0',
        unit: '℃'
      },
      {
        address: '0x30b6',
        label: 'BMU电路板温度下限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30b7',
        label: 'BMU电路板温度下限-轻微报警恢复值',
        value: '-20.0',
        unit: '℃'
      },
      {
        address: '0x30b8',
        label: 'BMU电路板温度下限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30b9',
        label: 'BMU电路板温度下限-一般报警值',
        value: '-30.0',
        unit: '℃'
      },
      {
        address: '0x30ba',
        label: 'BMU电路板温度下限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30bb',
        label: 'BMU电路板温度下限-一般报警恢复值',
        value: '-25.0',
        unit: '℃'
      },
      {
        address: '0x30bc',
        label: 'BMU电路板温度下限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30bd',
        label: 'BMU电路板温度下限-严重报警值',
        value: '-35.0',
        unit: '℃'
      },
      {
        address: '0x30be',
        label: 'BMU电路板温度下限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30bf',
        label: 'BMU电路板温度下限-严重报警恢复值',
        value: '-30.0',
        unit: '℃'
      },
      {
        address: '0x30c0',
        label: 'BMU电路板温度下限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30c1',
        label: 'BMU电路板温度温差-轻微报警值',
        value: '7.0',
        unit: '℃'
      },
      {
        address: '0x30c2',
        label: 'BMU电路板温度温差-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30c3',
        label: 'BMU电路板温度温差-轻微报警恢复值',
        value: '5.0',
        unit: '℃'
      },
      {
        address: '0x30c4',
        label: 'BMU电路板温度温差-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30c5',
        label: 'BMU电路板温度温差-一般报警值',
        value: '9.0',
        unit: '℃'
      },
      {
        address: '0x30c6',
        label: 'BMU电路板温度温差-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30c7',
        label: 'BMU电路板温度温差-一般报警恢复值',
        value: '7.0',
        unit: '℃'
      },
      {
        address: '0x30c8',
        label: 'BMU电路板温度温差-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30c9',
        label: 'BMU电路板温度温差-严重报警值',
        value: '11.0',
        unit: '℃'
      },
      {
        address: '0x30ca',
        label: 'BMU电路板温度温差-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30cb',
        label: 'BMU电路板温度温差-严重报警恢复值',
        value: '9.0',
        unit: '℃'
      },
      {
        address: '0x30cc',
        label: 'BMU电路板温度温差-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  },
  {
    classification: '动力接插件温度告警',
    element: [
      {
        address: '0x30cd',
        label: '动力接插件温度上限-轻微报警值',
        value: '65.0',
        unit: '℃'
      },
      {
        address: '0x30ce',
        label: '动力接插件温度上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30cf',
        label: '动力接插件温度上限-轻微报警恢复值',
        value: '60.0',
        unit: '℃'
      },
      {
        address: '0x30d0',
        label: '动力接插件温度上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30d1',
        label: '动力接插件温度上限-一般报警值',
        value: '70.0',
        unit: '℃'
      },
      {
        address: '0x30d2',
        label: '动力接插件温度上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30d3',
        label: '动力接插件温度上限-一般报警恢复值',
        value: '65.0',
        unit: '℃'
      },
      {
        address: '0x30d4',
        label: '动力接插件温度上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30d5',
        label: '动力接插件温度上限-严重报警值',
        value: '75.0',
        unit: '℃'
      },
      {
        address: '0x30d6',
        label: '动力接插件温度上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30d7',
        label: '动力接插件温度上限-严重报警恢复值',
        value: '70.0',
        unit: '℃'
      },
      {
        address: '0x30d8',
        label: '动力接插件温度上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  },
  {
    classification: 'Cell电压告警',
    element: [
      {
        address: '0x30e6',
        label: '单体电压上限-轻微报警值',
        value: 3550,
        unit: 'mV'
      },
      {
        address: '0x30e7',
        label: '单体电压上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30e8',
        label: '单体电压上限-轻微报警恢复值',
        value: 3500,
        unit: 'mV'
      },
      {
        address: '0x30e9',
        label: '单体电压上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30ea',
        label: '单体电压上限-一般报警值',
        value: 3600,
        unit: 'mV'
      },
      {
        address: '0x30eb',
        label: '单体电压上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30ec',
        label: '单体电压上限-一般报警恢复值',
        value: 3550,
        unit: 'mV'
      },
      {
        address: '0x30ed',
        label: '单体电压上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30ee',
        label: '单体电压上限-严重报警值',
        value: 3650,
        unit: 'mV'
      },
      {
        address: '0x30ef',
        label: '单体电压上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30f0',
        label: '单体电压上限-严重报警恢复值',
        value: 3600,
        unit: 'mV'
      },
      {
        address: '0x30f1',
        label: '单体电压上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30f2',
        label: '单体电压下限-轻微报警值',
        value: 2850,
        unit: 'mV'
      },
      {
        address: '0x30f3',
        label: '单体电压下限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30f4',
        label: '单体电压下限-轻微报警恢复值',
        value: 2950,
        unit: 'mV'
      },
      {
        address: '0x30f5',
        label: '单体电压下限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30f6',
        label: '单体电压下限-一般报警值',
        value: 2700,
        unit: 'mV'
      },
      {
        address: '0x30f7',
        label: '单体电压下限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30f8',
        label: '单体电压下限-一般报警恢复值',
        value: 2800,
        unit: 'mV'
      },
      {
        address: '0x30f9',
        label: '单体电压下限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30fa',
        label: '单体电压下限-严重报警值',
        value: 2600,
        unit: 'mV'
      },
      {
        address: '0x30fb',
        label: '单体电压下限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30fc',
        label: '单体电压下限-严重报警恢复值',
        value: 2700,
        unit: 'mV'
      },
      {
        address: '0x30fd',
        label: '单体电压下限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x30fe',
        label: '单体电压压差-轻微报警值',
        value: 350,
        unit: 'mV'
      },
      {
        address: '0x30ff',
        label: '单体电压压差-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3100',
        label: '单体电压压差-轻微报警恢复值',
        value: 300,
        unit: 'mV'
      },
      {
        address: '0x3101',
        label: '单体电压压差-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3102',
        label: '单体电压压差-一般报警值',
        value: 400,
        unit: 'mV'
      },
      {
        address: '0x3103',
        label: '单体电压压差-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3104',
        label: '单体电压压差-一般报警恢复值',
        value: 350,
        unit: 'mV'
      },
      {
        address: '0x3105',
        label: '单体电压压差-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3106',
        label: '单体电压压差-严重报警值',
        value: 500,
        unit: 'mV'
      },
      {
        address: '0x3107',
        label: '单体电压压差-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3108',
        label: '单体电压压差-严重报警恢复值',
        value: 400,
        unit: 'mV'
      },
      {
        address: '0x3109',
        label: '单体电压压差-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  },
  {
    classification: 'Cell温度告警',
    element: [
      {
        address: '0x310a',
        label: '充电单体温度上限-轻微报警值',
        value: '48.0',
        unit: '℃'
      },
      {
        address: '0x310b',
        label: '充电单体温度上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x310c',
        label: '充电单体温度上限-轻微报警恢复值',
        value: '45.0',
        unit: '℃'
      },
      {
        address: '0x310d',
        label: '充电单体温度上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x310e',
        label: '充电单体温度上限-一般报警值',
        value: '52.0',
        unit: '℃'
      },
      {
        address: '0x310f',
        label: '充电单体温度上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3110',
        label: '充电单体温度上限-一般报警恢复值',
        value: '48.0',
        unit: '℃'
      },
      {
        address: '0x3111',
        label: '充电单体温度上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3112',
        label: '充电单体温度上限-严重报警值',
        value: '55.0',
        unit: '℃'
      },
      {
        address: '0x3113',
        label: '充电单体温度上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3114',
        label: '充电单体温度上限-严重报警恢复值',
        value: '52.0',
        unit: '℃'
      },
      {
        address: '0x3115',
        label: '充电单体温度上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3116',
        label: '充电单体温度下限-轻微报警值',
        value: '10.0',
        unit: '℃'
      },
      {
        address: '0x3117',
        label: '充电单体温度下限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3118',
        label: '充电单体温度下限-轻微报警恢复值',
        value: '15.0',
        unit: '℃'
      },
      {
        address: '0x3119',
        label: '充电单体温度下限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x311a',
        label: '充电单体温度下限-一般报警值',
        value: '5.0',
        unit: '℃'
      },
      {
        address: '0x311b',
        label: '充电单体温度下限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x311c',
        label: '充电单体温度下限-一般报警恢复值',
        value: '10.0',
        unit: '℃'
      },
      {
        address: '0x311d',
        label: '充电单体温度下限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x311e',
        label: '充电单体温度下限-严重报警值',
        value: '0.0',
        unit: '℃'
      },
      {
        address: '0x311f',
        label: '充电单体温度下限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3120',
        label: '充电单体温度下限-严重报警恢复值',
        value: '5.0',
        unit: '℃'
      },
      {
        address: '0x3121',
        label: '充电单体温度下限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3122',
        label: '放电单体温度上限-轻微报警值',
        value: '45.0',
        unit: '℃'
      },
      {
        address: '0x3123',
        label: '放电单体温度上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3124',
        label: '放电单体温度上限-轻微报警恢复值',
        value: '40.0',
        unit: '℃'
      },
      {
        address: '0x3125',
        label: '放电单体温度上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3126',
        label: '放电单体温度上限-一般报警值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x3127',
        label: '放电单体温度上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3128',
        label: '放电单体温度上限-一般报警恢复值',
        value: '45.0',
        unit: '℃'
      },
      {
        address: '0x3129',
        label: '放电单体温度上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x312a',
        label: '放电单体温度上限-严重报警值',
        value: '55.0',
        unit: '℃'
      },
      {
        address: '0x312b',
        label: '放电单体温度上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x312c',
        label: '放电单体温度上限-严重报警恢复值',
        value: '50.0',
        unit: '℃'
      },
      {
        address: '0x312d',
        label: '放电单体温度上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x312e',
        label: '放电单体温度下限-轻微报警值',
        value: '-5.0',
        unit: '℃'
      },
      {
        address: '0x312f',
        label: '放电单体温度下限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3130',
        label: '放电单体温度下限-轻微报警恢复值',
        value: '0.0',
        unit: '℃'
      },
      {
        address: '0x3131',
        label: '放电单体温度下限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3132',
        label: '放电单体温度下限-一般报警值',
        value: '-10.0',
        unit: '℃'
      },
      {
        address: '0x3133',
        label: '放电单体温度下限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3134',
        label: '放电单体温度下限-一般报警恢复值',
        value: '-5.0',
        unit: '℃'
      },
      {
        address: '0x3135',
        label: '放电单体温度下限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3136',
        label: '放电单体温度下限-严重报警值',
        value: '-20.0',
        unit: '℃'
      },
      {
        address: '0x3137',
        label: '放电单体温度下限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3138',
        label: '放电单体温度下限-严重报警恢复值',
        value: '-15.0',
        unit: '℃'
      },
      {
        address: '0x3139',
        label: '放电单体温度下限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x313a',
        label: '单体温度温差-轻微报警值',
        value: '7.0',
        unit: '℃'
      },
      {
        address: '0x313b',
        label: '单体温度温差-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x313c',
        label: '单体温度温差-轻微报警恢复值',
        value: '5.0',
        unit: '℃'
      },
      {
        address: '0x313d',
        label: '单体温度温差-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x313e',
        label: '单体温度温差-一般报警值',
        value: '9.0',
        unit: '℃'
      },
      {
        address: '0x313f',
        label: '单体温度温差-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3140',
        label: '单体温度温差-一般报警恢复值',
        value: '7.0',
        unit: '℃'
      },
      {
        address: '0x3141',
        label: '单体温度温差-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3142',
        label: '单体温度温差-严重报警值',
        value: '11.0',
        unit: '℃'
      },
      {
        address: '0x3143',
        label: '单体温度温差-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3144',
        label: '单体温度温差-严重报警恢复值',
        value: '9.0',
        unit: '℃'
      },
      {
        address: '0x3145',
        label: '单体温度温差-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  },
  {
    classification: 'CellSOC告警',
    element: [
      {
        address: '0x3146',
        label: '单体soc上限-轻微报警值',
        value: '101.0',
        unit: '%'
      },
      {
        address: '0x3147',
        label: '单体soc上限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3148',
        label: '单体soc上限-轻微报警恢复值',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x3149',
        label: '单体soc上限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x314a',
        label: '单体soc上限-一般报警值',
        value: '101.0',
        unit: '%'
      },
      {
        address: '0x314b',
        label: '单体soc上限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x314c',
        label: '单体soc上限-一般报警恢复值',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x314d',
        label: '单体soc上限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x314e',
        label: '单体soc上限-严重报警值',
        value: '101.0',
        unit: '%'
      },
      {
        address: '0x314f',
        label: '单体soc上限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3150',
        label: '单体soc上限-严重报警恢复值',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x3151',
        label: '单体soc上限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3152',
        label: '单体soc下限-轻微报警值',
        value: '4.0',
        unit: '%'
      },
      {
        address: '0x3153',
        label: '单体soc下限-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3154',
        label: '单体soc下限-轻微报警恢复值',
        value: '6.0',
        unit: '%'
      },
      {
        address: '0x3155',
        label: '单体soc下限-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3156',
        label: '单体soc下限-一般报警值',
        value: '2.0',
        unit: '%'
      },
      {
        address: '0x3157',
        label: '单体soc下限-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3158',
        label: '单体soc下限-一般报警恢复值',
        value: '6.0',
        unit: '%'
      },
      {
        address: '0x3159',
        label: '单体soc下限-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x315a',
        label: '单体soc下限-严重报警值',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x315b',
        label: '单体soc下限-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x315c',
        label: '单体soc下限-严重报警恢复值',
        value: '6.0',
        unit: '%'
      },
      {
        address: '0x315d',
        label: '单体soc下限-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x315e',
        label: '单体soc差异-轻微报警值',
        value: '90.0',
        unit: '%'
      },
      {
        address: '0x315f',
        label: '单体soc差异-轻微报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3160',
        label: '单体soc差异-轻微报警恢复值',
        value: '85.0',
        unit: '%'
      },
      {
        address: '0x3161',
        label: '单体soc差异-轻微报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3162',
        label: '单体soc差异-一般报警值',
        value: '95.0',
        unit: '%'
      },
      {
        address: '0x3163',
        label: '单体soc差异-一般报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3164',
        label: '单体soc差异-一般报警恢复值',
        value: '90.0',
        unit: '%'
      },
      {
        address: '0x3165',
        label: '单体soc差异-一般报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3166',
        label: '单体soc差异-严重报警值',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x3167',
        label: '单体soc差异-严重报警滤波时间',
        value: 0,
        unit: 'ms'
      },
      {
        address: '0x3168',
        label: '单体soc差异-严重报警恢复值',
        value: '95.0',
        unit: '%'
      },
      {
        address: '0x3169',
        label: '单体soc差异-严重报警恢复滤波时间',
        value: 0,
        unit: 'ms'
      }
    ]
  }
]
const initSOXConfig = [
  {
    classification: '实时保存的SOX数据',
    element: [
      {
        address: '0x3200',
        label: '簇端显示SOC',
        value: '30.0',
        unit: '%'
      },
      {
        address: '0x3201',
        label: 'BMU1最大SOC',
        value: '32.0',
        unit: '%'
      },
      {
        address: '0x3202',
        label: 'BMU2最大SOC',
        value: '33.0',
        unit: '%'
      },
      {
        address: '0x3203',
        label: 'BMU3最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3204',
        label: 'BMU4最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3205',
        label: 'BMU5最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3206',
        label: 'BMU6最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3207',
        label: 'BMU7最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3208',
        label: 'BMU8最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3209',
        label: 'BMU9最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x320a',
        label: 'BMU10最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x320b',
        label: 'BMU11最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x320c',
        label: 'BMU12最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x320d',
        label: 'BMU13最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x320e',
        label: 'BMU14最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x320f',
        label: 'BMU15最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3210',
        label: 'BMU16最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3211',
        label: 'BMU17最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3212',
        label: 'BMU18最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3213',
        label: 'BMU19最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3214',
        label: 'BMU20最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3215',
        label: 'BMU21最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3216',
        label: 'BMU22最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3217',
        label: 'BMU23最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3218',
        label: 'BMU24最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3219',
        label: 'BMU25最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x321a',
        label: 'BMU26最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x321b',
        label: 'BMU27最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x321c',
        label: 'BMU28最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x321d',
        label: 'BMU29最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x321e',
        label: 'BMU30最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x321f',
        label: 'BMU31最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3220',
        label: 'BMU32最大SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3221',
        label: 'BMU1最小SOC',
        value: '30.0',
        unit: '%'
      },
      {
        address: '0x3222',
        label: 'BMU2最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3223',
        label: 'BMU3最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3224',
        label: 'BMU4最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3225',
        label: 'BMU5最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3226',
        label: 'BMU6最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3227',
        label: 'BMU7最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3228',
        label: 'BMU8最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3229',
        label: 'BMU9最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x322a',
        label: 'BMU10最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x322b',
        label: 'BMU11最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x322c',
        label: 'BMU12最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x322d',
        label: 'BMU13最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x322e',
        label: 'BMU14最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x322f',
        label: 'BMU15最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3230',
        label: 'BMU16最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3231',
        label: 'BMU17最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3232',
        label: 'BMU18最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3233',
        label: 'BMU19最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3234',
        label: 'BMU20最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3235',
        label: 'BMU21最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3236',
        label: 'BMU22最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3237',
        label: 'BMU23最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3238',
        label: 'BMU24最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3239',
        label: 'BMU25最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x323a',
        label: 'BMU26最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x323b',
        label: 'BMU27最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x323c',
        label: 'BMU28最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x323d',
        label: 'BMU29最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x323e',
        label: 'BMU30最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x323f',
        label: 'BMU31最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x3240',
        label: 'BMU32最小SOC',
        value: '0.0',
        unit: '%'
      },
      {
        address: '0x326f',
        label: '簇端SOE',
        value: '30.0',
        unit: '%'
      },
      {
        address: '0x3270',
        label: '充电效率',
        value: '100.00',
        unit: '%'
      },
      {
        address: '0x3271',
        label: '可用电量',
        value: '0.00',
        unit: 'kWh'
      },
      {
        address: '0x3272-0x3273',
        label: '累计充电电量',
        value: 0,
        unit: 'kWh'
      },
      {
        address: '0x3274-0x3275',
        label: '累计放电电量',
        value: 0,
        unit: 'kWh'
      },
      {
        address: '0x3276-0x3277',
        label: '累计充电容量',
        value: 0,
        unit: 'Ah'
      },
      {
        address: '0x3278-0x3279',
        label: '累计放电容量',
        value: 0,
        unit: 'Ah'
      },
      {
        address: '0x327E',
        label: '故障保护次数',
        value: 0,
        unit: '/'
      },
      {
        address: '0x327F',
        label: '电压越限次数',
        value: 0,
        unit: '/'
      },
      {
        address: '0x3280',
        label: '温度越限次数',
        value: 0,
        unit: '/'
      },
      {
        address: '0x3244',
        label: '前一次在线SOH',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x3245',
        label: '保存的历史10个SOH值-1',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x3246',
        label: '保存的历史10个SOH值-2',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x3247',
        label: '保存的历史10个SOH值-3',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x3248',
        label: '保存的历史10个SOH值-4',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x3249',
        label: '保存的历史10个SOH值-5',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x324a',
        label: '保存的历史10个SOH值-6',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x324b',
        label: '保存的历史10个SOH值-7',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x324c',
        label: '保存的历史10个SOH值-8',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x324d',
        label: '保存的历史10个SOH值-9',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x324e',
        label: '保存的历史10个SOH值-10',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x324f',
        label: '保存的10个历史工况权重值-1',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3250',
        label: '保存的10个历史工况权重值-2',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3251',
        label: '保存的10个历史工况权重值-3',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3252',
        label: '保存的10个历史工况权重值-4',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3253',
        label: '保存的10个历史工况权重值-5',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3254',
        label: '保存的10个历史工况权重值-6',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3255',
        label: '保存的10个历史工况权重值-7',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3256',
        label: '保存的10个历史工况权重值-8',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3257',
        label: '保存的10个历史工况权重值-9',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3258',
        label: '保存的10个历史工况权重值-10',
        value: 10,
        unit: '%'
      },
      {
        address: '0x3259',
        label: '保存的10个历史时间间隔-1',
        value: 1,
        unit: '/'
      },
      {
        address: '0x325a',
        label: '保存的10个历史时间间隔-2',
        value: 1,
        unit: '/'
      },
      {
        address: '0x325b',
        label: '保存的10个历史时间间隔-3',
        value: 1,
        unit: '/'
      },
      {
        address: '0x325c',
        label: '保存的10个历史时间间隔-4',
        value: 1,
        unit: '/'
      },
      {
        address: '0x325d',
        label: '保存的10个历史时间间隔-5',
        value: 1,
        unit: '/'
      },
      {
        address: '0x325e',
        label: '保存的10个历史时间间隔-6',
        value: 1,
        unit: '/'
      },
      {
        address: '0x325f',
        label: '保存的10个历史时间间隔-7',
        value: 1,
        unit: '/'
      },
      {
        address: '0x3260',
        label: '保存的10个历史时间间隔-8',
        value: 1,
        unit: '/'
      },
      {
        address: '0x3261',
        label: '保存的10个历史时间间隔-9',
        value: 1,
        unit: '/'
      },
      {
        address: '0x3262',
        label: '保存的10个历史时间间隔-10',
        value: 1,
        unit: '/'
      },
      {
        address: '0x3263',
        label: '前一次触发时间',
        value: 10965,
        unit: '/'
      },
      {
        address: '0x3264-0x3265',
        label: '循环次数',
        value: 0,
        unit: '/'
      },
      {
        address: '0x3266-0x3267',
        label: 'SOH计算-充电累积安时',
        value: '0.0',
        unit: 'Ah'
      },
      {
        address: '0x3268-0x3269',
        label: 'SOH计算-放电累积安时',
        value: '0.0',
        unit: 'Ah'
      },
      {
        address: '0x326A',
        label: 'SOH上电初始化标志位',
        value: 1,
        unit: '/'
      },
      {
        address: '0x326B',
        label: '存储的SOH当前更新容量',
        value: '290.0',
        unit: 'Ah'
      }
    ]
  },
  {
    classification: 'SOX通用参数',
    element: [
      {
        address: '0x5300',
        label: '有效电芯数量',
        value: 384,
        unit: '/'
      },
      {
        address: '0x5301',
        label: '电芯实际容量',
        value: '290.0',
        unit: 'Ah'
      },
      {
        address: '0x5302',
        label: '电芯额定容量',
        value: '280.0',
        unit: 'Ah'
      },
      {
        address: '0x5303',
        label: '电芯满电电压值',
        value: 3580,
        unit: 'mV'
      },
      {
        address: '0x5304',
        label: '电芯放空电压值',
        value: 2720,
        unit: 'mV'
      },
      {
        address: '0x5305',
        label: '电芯电流上限值',
        value: '1000.0',
        unit: 'A'
      },
      {
        address: '0x5306',
        label: '电芯电流下限值',
        value: '0.0',
        unit: 'A'
      },
      {
        address: '0x5307',
        label: '电芯温度上限值',
        value: '125.0',
        unit: '℃'
      },
      {
        address: '0x5308',
        label: '电芯温度下限值',
        value: '-40.0',
        unit: '℃'
      },
      {
        address: '0x5309',
        label: '电芯电压上限值',
        value: 4000,
        unit: 'mV'
      },
      {
        address: '0x530a',
        label: '电芯电压下限值',
        value: 2000,
        unit: 'mV'
      }
    ]
  },
  {
    classification: 'SOC配置参数',
    element: [
      {
        address: '0x530d',
        label: 'RackSOC SOC取值阈值上限值',
        value: '95.0',
        unit: '%'
      },
      {
        address: '0x530e',
        label: 'RackSOC SOC取值阈值下限值',
        value: '15.0',
        unit: '%'
      },
      {
        address: '0x530f',
        label: 'SOC低端校准上限电压',
        value: 3345,
        unit: 'mV'
      },
      {
        address: '0x5310',
        label: 'SOC高端校准下限电压',
        value: 3273,
        unit: 'mV'
      },
      {
        address: '0x5311',
        label: 'SOC静置校准温度',
        value: '10.0',
        unit: '℃'
      },
      {
        address: '0x5312-0x5313',
        label: 'SOC静置常温校准时间',
        value: '7200.0',
        unit: 's'
      },
      {
        address: '0x5314-0x5315',
        label: 'SOC静置低温校准时间',
        value: '14400.0',
        unit: 's'
      },
      {
        address: '0x5316',
        label: 'SOC静置校准电流触发阈值',
        value: '10.0',
        unit: 'A'
      },
      {
        address: '0x5317',
        label: 'SOC静置校准温度触发阈值',
        value: '-20.0',
        unit: '℃'
      },
      {
        address: '0x5318',
        label: '休眠唤醒校准时间与温度对应表_时间-20℃',
        value: 7200,
        unit: 's'
      },
      {
        address: '0x5319',
        label: '休眠唤醒校准时间与温度对应表_时间-10℃',
        value: 7200,
        unit: 's'
      },
      {
        address: '0x531a',
        label: '休眠唤醒校准时间与温度对应表_时间0℃',
        value: 7200,
        unit: 's'
      },
      {
        address: '0x531b',
        label: '休眠唤醒校准时间与温度对应表_时间10℃',
        value: 7200,
        unit: 's'
      },
      {
        address: '0x531c',
        label: '休眠唤醒校准时间与温度对应表_时间25℃',
        value: 7200,
        unit: 's'
      },
      {
        address: '0x531d',
        label: '休眠唤醒校准时间与温度对应表_时间45℃',
        value: 7200,
        unit: 's'
      },
      {
        address: '0x531e',
        label: '休眠唤醒校准时间与温度对应表_温度-20℃',
        value: '-20.0',
        unit: '℃'
      },
      {
        address: '0x531f',
        label: '休眠唤醒校准时间与温度对应表_温度-10℃',
        value: '-10.0',
        unit: '℃'
      },
      {
        address: '0x5320',
        label: '休眠唤醒校准时间与温度对应表_温度0℃',
        value: '0.0',
        unit: '℃'
      },
      {
        address: '0x5321',
        label: '休眠唤醒校准时间与温度对应表_温度10℃',
        value: '10.0',
        unit: '℃'
      },
      {
        address: '0x5322',
        label: '休眠唤醒校准时间与温度对应表_温度25℃',
        value: '25.0',
        unit: '℃'
      },
      {
        address: '0x5323',
        label: '休眠唤醒校准时间与温度对应表_温度45℃',
        value: '45.0',
        unit: '℃'
      },
      {
        address: '0x5324',
        label: '显示SOC与RackSOC差值范围',
        value: '20.0',
        unit: '%'
      },
      {
        address: '0x5325',
        label: '显示SOC追随真实SOC时间',
        value: '240.0',
        unit: 's'
      },
      {
        address: '0x5326',
        label: '簇欠压阈值',
        value: '1102.1',
        unit: 'mV'
      },
      {
        address: '0x5327',
        label: '簇过压阈值',
        value: '1355.5',
        unit: 'mV'
      },
      {
        address: '0x5328',
        label: 'SOH循环次数下发',
        value: 0,
        unit: 'mV'
      },
      {
        address: '0x5329',
        label: '充电OCV表（电压输入）-15%',
        value: 3207,
        unit: 'mV'
      },
      {
        address: '0x532a',
        label: '充电OCV表（电压输入）-20%',
        value: 3235,
        unit: 'mV'
      },
      {
        address: '0x532b',
        label: '充电OCV表（电压输入）-25%',
        value: 3254,
        unit: 'mV'
      },
      {
        address: '0x532c',
        label: '充电OCV表（电压输入）-30%',
        value: 3273,
        unit: 'mV'
      },
      {
        address: '0x532d',
        label: '充电OCV表（电压输入）-35%',
        value: 3287,
        unit: 'mV'
      },
      {
        address: '0x532e',
        label: '充电OCV表（电压输入）-40%',
        value: 3290,
        unit: 'mV'
      },
      {
        address: '0x532f',
        label: '充电OCV表（电压输入）-45%',
        value: 3290,
        unit: 'mV'
      },
      {
        address: '0x5330',
        label: '充电OCV表（电压输入）-50%',
        value: 3291,
        unit: 'mV'
      },
      {
        address: '0x5331',
        label: '充电OCV表（电压输入）-55%',
        value: 3292,
        unit: 'mV'
      },
      {
        address: '0x5332',
        label: '充电OCV表（电压输入）-60%',
        value: 3294,
        unit: 'mV'
      },
      {
        address: '0x5333',
        label: '充电OCV表（电压输入）-65%',
        value: 3312,
        unit: 'mV'
      },
      {
        address: '0x5334',
        label: '充电OCV表（电压输入）-70%',
        value: 3329,
        unit: 'mV'
      },
      {
        address: '0x5335',
        label: '充电OCV表（电压输入）-75%',
        value: 3329,
        unit: 'mV'
      },
      {
        address: '0x5336',
        label: '充电OCV表（电压输入）-80%',
        value: 3330,
        unit: 'mV'
      },
      {
        address: '0x5337',
        label: '充电OCV表（电压输入）-85%',
        value: 3330,
        unit: 'mV'
      },
      {
        address: '0x5338',
        label: '充电OCV表（电压输入）-90%',
        value: 3332,
        unit: 'mV'
      },
      {
        address: '0x5339',
        label: '充电OCV表（电压输入）-95%',
        value: 3333,
        unit: 'mV'
      },
      {
        address: '0x533a',
        label: '充电OCV表（电压输入）-100%',
        value: 3438,
        unit: 'mV'
      },
      {
        address: '0x533b',
        label: '放电OCV表（电压输入）-0%',
        value: 2722,
        unit: 'mV'
      },
      {
        address: '0x533c',
        label: '放电OCV表（电压输入）-5%',
        value: 3094,
        unit: 'mV'
      },
      {
        address: '0x533d',
        label: '放电OCV表（电压输入）-10%',
        value: 3201,
        unit: 'mV'
      },
      {
        address: '0x533e',
        label: '放电OCV表（电压输入）-15%',
        value: 3207,
        unit: 'mV'
      },
      {
        address: '0x533f',
        label: '放电OCV表（电压输入）-20%',
        value: 3235,
        unit: 'mV'
      },
      {
        address: '0x5340',
        label: '放电OCV表（电压输入）-25%',
        value: 3254,
        unit: 'mV'
      },
      {
        address: '0x5341',
        label: '放电OCV表（电压输入）-30%',
        value: 3273,
        unit: 'mV'
      },
      {
        address: '0x5342',
        label: '放电OCV表（电压输入）-35%',
        value: 3287,
        unit: 'mV'
      },
      {
        address: '0x5343',
        label: '放电OCV表（电压输入）-40%',
        value: 3290,
        unit: 'mV'
      },
      {
        address: '0x5344',
        label: '放电OCV表（电压输入）-45%',
        value: 3290,
        unit: 'mV'
      },
      {
        address: '0x5345',
        label: '放电OCV表（电压输入）-50%',
        value: 3291,
        unit: 'mV'
      },
      {
        address: '0x5346',
        label: '放电OCV表（电压输入）-55%',
        value: 3292,
        unit: 'mV'
      },
      {
        address: '0x5347',
        label: '放电OCV表（电压输入）-60%',
        value: 3294,
        unit: 'mV'
      },
      {
        address: '0x5348',
        label: '放电OCV表（电压输入）-65%',
        value: 3312,
        unit: 'mV'
      },
      {
        address: '0x5349',
        label: '放电OCV表（电压输入）-70%',
        value: 3329,
        unit: 'mV'
      },
      {
        address: '0x534a',
        label: '放电OCV表（电压输入）-75%',
        value: 3329,
        unit: 'mV'
      },
      {
        address: '0x534b',
        label: '放电OCV表（电压输入）-80%',
        value: 3330,
        unit: 'mV'
      },
      {
        address: '0x534c',
        label: '放电OCV表（电压输入）-85%',
        value: 3330,
        unit: 'mV'
      },
      {
        address: '0x534d',
        label: '放电OCV表（电压输入）-90%',
        value: 3332,
        unit: 'mV'
      },
      {
        address: '0x534e',
        label: '放电OCV表（电压输入）-95%',
        value: 3333,
        unit: 'mV'
      },
      {
        address: '0x534f',
        label: '放电OCV表（电压输入）-100%',
        value: 3438,
        unit: 'mV'
      },
      {
        address: '0x5350',
        label: '充电修正电压拐点表（97%）-1/10C',
        value: 3481,
        unit: 'mV'
      },
      {
        address: '0x5351',
        label: '充电修正电压拐点表（97%）-1/4C',
        value: 3500,
        unit: 'mV'
      },
      {
        address: '0x5352',
        label: '充电修正电压拐点表（97%）-1/2C',
        value: 3515,
        unit: 'mV'
      },
      {
        address: '0x5353',
        label: '充电修正电压拐点表（97%）-3/4C',
        value: 3530,
        unit: 'mV'
      },
      {
        address: '0x5354',
        label: '充电修正电压拐点表（97%）-1C',
        value: 3545,
        unit: 'mV'
      },
      {
        address: '0x5355',
        label: '充电修正电压拐点表（97%）-3/2C',
        value: 3545,
        unit: 'mV'
      },
      {
        address: '0x5356',
        label: '充电修正步长表（97%）-1/10C',
        value: 33,
        unit: 'mV'
      },
      {
        address: '0x5357',
        label: '充电修正步长表（97%）-1/4C',
        value: 26,
        unit: 'mV'
      },
      {
        address: '0x5358',
        label: '充电修正步长表（97%）-1/2C',
        value: 21,
        unit: 'mV'
      },
      {
        address: '0x5359',
        label: '充电修正步长表（97%）-3/4C',
        value: 16,
        unit: 'mV'
      },
      {
        address: '0x535a',
        label: '充电修正步长表（97%）-1C',
        value: 11,
        unit: 'mV'
      },
      {
        address: '0x535b',
        label: '充电修正步长表（97%）-3/2C',
        value: 11,
        unit: 'mV'
      },
      {
        address: '0x535c',
        label: '充电修正电流区间点-1/10C',
        value: '28.0',
        unit: 'A'
      },
      {
        address: '0x535d',
        label: '充电修正电流区间点-1/4C',
        value: '70.0',
        unit: 'A'
      },
      {
        address: '0x535e',
        label: '充电修正电流区间点-1/2C',
        value: '140.0',
        unit: 'A'
      },
      {
        address: '0x535f',
        label: '充电修正电流区间点-3/4C',
        value: '210.0',
        unit: 'A'
      },
      {
        address: '0x5360',
        label: '充电修正电流区间点-1C',
        value: '280.0',
        unit: 'A'
      },
      {
        address: '0x5361',
        label: '充电修正电流区间点-3/2C',
        value: '280.1',
        unit: 'A'
      },
      {
        address: '0x5362',
        label: '97%点追赶时间',
        value: '100.0',
        unit: 's'
      },
      {
        address: '0x5363',
        label: '充电修正电压拐点表（99%）-1/10C',
        value: 3518,
        unit: 'mV'
      },
      {
        address: '0x5364',
        label: '充电修正电压拐点表（99%）-1/4C',
        value: 3538,
        unit: 'mV'
      },
      {
        address: '0x5365',
        label: '充电修正电压拐点表（99%）-1/2C',
        value: 3544,
        unit: 'mV'
      },
      {
        address: '0x5366',
        label: '充电修正电压拐点表（99%）-3/4C',
        value: 3550,
        unit: 'mV'
      },
      {
        address: '0x5367',
        label: '充电修正电压拐点表（99%）-1C',
        value: 3560,
        unit: 'mV'
      },
      {
        address: '0x5368',
        label: '充电修正电压拐点表（99%）-3/2C',
        value: 3560,
        unit: 'mV'
      },
      {
        address: '0x5369',
        label: '充电修正步长表（99%）-1/10C',
        value: 62,
        unit: 'mV'
      },
      {
        address: '0x536a',
        label: '充电修正步长表（99%）-1/4C',
        value: 42,
        unit: 'mV'
      },
      {
        address: '0x536b',
        label: '充电修正步长表（99%）-1/2C',
        value: 36,
        unit: 'mV'
      },
      {
        address: '0x536c',
        label: '充电修正步长表（99%）-3/4C',
        value: 30,
        unit: 'mV'
      },
      {
        address: '0x536d',
        label: '充电修正步长表（99%）-1C',
        value: 20,
        unit: 'mV'
      },
      {
        address: '0x536e',
        label: '充电修正步长表（99%）-3/2C',
        value: 20,
        unit: 'mV'
      },
      {
        address: '0x536f',
        label: '99%点追赶时间',
        value: '100.0',
        unit: 's'
      },
      {
        address: '0x5370',
        label: '放电修正电压拐点_1/2C',
        value: 3025,
        unit: 'mV'
      },
      {
        address: '0x5371',
        label: '放电修正电压拐点_1/4C',
        value: 3092,
        unit: 'mV'
      },
      {
        address: '0x5372',
        label: '充放电修正电流_1/4C',
        value: '28.0',
        unit: 'A'
      },
      {
        address: '0x5373',
        label: '充放电修正电流_1/2C',
        value: '280.0',
        unit: 'A'
      },
      {
        address: '0x5374',
        label: '放电拐点真实SOC追赶时间',
        value: '100.0',
        unit: 's'
      }
    ]
  },
  {
    classification: 'SOH配置参数',
    element: [
      {
        address: '0x5379',
        label: 'SOH计算条件，温度下限',
        value: '20.0',
        unit: '℃'
      },
      {
        address: '0x537a',
        label: '最大最小soc差值',
        value: '20.0',
        unit: '%'
      },
      {
        address: '0x537b',
        label: '电池放电容量最大百分比值',
        value: '10.0',
        unit: '%'
      },
      {
        address: '0x537c',
        label: 'SOH校准上限值SOC值',
        value: '20.0',
        unit: '%'
      },
      {
        address: '0x537d',
        label: '电芯循环次数对应的SOH值-1',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x537e',
        label: '电芯循环次数对应的SOH值-2',
        value: '80.0',
        unit: '%'
      },
      {
        address: '0x537f',
        label: '电芯循环次数-1',
        value: 100,
        unit: '/'
      },
      {
        address: '0x5380',
        label: '电芯循环次数-2',
        value: 5000,
        unit: '/'
      },
      {
        address: '0x5381',
        label: 'SOC变化权重值-1',
        value: '1.0',
        unit: '/'
      },
      {
        address: '0x5382',
        label: 'SOC变化权重值-2',
        value: '1.3',
        unit: '/'
      },
      {
        address: '0x5383',
        label: 'SOC变化值-1',
        value: '80.0',
        unit: '%'
      },
      {
        address: '0x5384',
        label: 'SOC变化值-2',
        value: '100.0',
        unit: '%'
      },
      {
        address: '0x5385',
        label: '计算的SOH值范围上限-1',
        value: '115.0',
        unit: '%'
      },
      {
        address: '0x5386',
        label: '计算的SOH值范围下限-2',
        value: '80.0',
        unit: '%'
      },
      {
        address: '0x5387-0x5388',
        label: '时间间隔对应权重-1',
        value: '1.00',
        unit: '/'
      },
      {
        address: '0x5389-0x538a',
        label: '时间间隔对应权重-2',
        value: '1.00',
        unit: '/'
      },
      {
        address: '0x538B-0x538C',
        label: '时间间隔对应权重-3',
        value: '0.01',
        unit: '/'
      },
      {
        address: '0x538D-0x538E',
        label: '时间间隔对应权重-4',
        value: '0.01',
        unit: '/'
      },
      {
        address: '0x538f',
        label: 'SOH计算时间间隔-1',
        value: 0,
        unit: '/'
      },
      {
        address: '0x5390',
        label: 'SOH计算时间间隔-2',
        value: 7,
        unit: '/'
      },
      {
        address: '0x5391',
        label: 'SOH计算时间间隔-3',
        value: 90,
        unit: '/'
      },
      {
        address: '0x5392',
        label: 'SOH计算时间间隔-4',
        value: 65535,
        unit: '/'
      }
    ]
  }
]
const initBCUConfig = [
  {
    classification: 'BMU/AFE数量配置',
    element: [
      {
        id: 1,
        label: 'BMU总数量',
        value: 8,
        noteKey: 'note1',
        note: '1簇下最多支持32个BMU',
        address: '0x0000'
      },
      {
        id: 2,
        label: 'BMU下AFE数量',
        value: 4,
        noteKey: 'note2',
        note: '1个BMU下最多支持16个AFE',
        address: '0x0001'
      },
      {
        id: 3,
        label: 'AFE1下电池数量',
        value: 12,
        address: '0x0002'
      },
      {
        id: 4,
        label: 'AFE2下电池数量',
        value: 12,
        address: '0x0003'
      },
      {
        id: 5,
        label: 'AFE3下电池数量',
        value: 12,
        address: '0x0004'
      },
      {
        id: 6,
        label: 'AFE4下电池数量',
        value: 12,
        address: '0x0005'
      },
      {
        id: 7,
        label: 'AFE5下电池数量',
        value: 12,
        address: '0x0006'
      },
      {
        id: 8,
        label: 'AFE6下电池数量',
        value: 12,
        address: '0x0007'
      },
      {
        id: 9,
        label: 'AFE7下电池数量',
        value: 12,
        address: '0x0008'
      },
      {
        id: 10,
        label: 'AFE8下电池数量',
        value: 12,
        address: '0x0009'
      },
      {
        id: 11,
        label: 'AFE9下电池数量',
        value: 12,
        address: '0x000a'
      },
      {
        id: 12,
        label: 'AFE10下电池数量',
        value: 12,
        address: '0x000b'
      },
      {
        id: 13,
        label: 'AFE11下电池数量',
        value: 12,
        address: '0x000c'
      },
      {
        id: 14,
        label: 'AFE12下电池数量',
        value: 12,
        address: '0x000d'
      },
      {
        id: 15,
        label: 'AFE13下电池数量',
        value: 12,
        address: '0x000e'
      },
      {
        id: 16,
        label: 'AFE14下电池数量',
        value: 12,
        address: '0x000f'
      },
      {
        id: 17,
        label: 'AFE15下电池数量',
        value: 12,
        address: '0x0010'
      },
      {
        id: 18,
        label: 'AFE16下电池数量',
        value: 12,
        address: '0x0011'
      },
      {
        id: 19,
        label: 'AFE1下温度数量',
        value: 6,
        address: '0x0012'
      },
      {
        id: 20,
        label: 'AFE2下温度数量',
        value: 6,
        address: '0x0013'
      },
      {
        id: 21,
        label: 'AFE3下温度数量',
        value: 6,
        address: '0x0014'
      },
      {
        id: 22,
        label: 'AFE4下温度数量',
        value: 6,
        address: '0x0015'
      },
      {
        id: 23,
        label: 'AFE5下温度数量',
        value: 6,
        address: '0x0016'
      },
      {
        id: 24,
        label: 'AFE6下温度数量',
        value: 6,
        address: '0x0017'
      },
      {
        id: 25,
        label: 'AFE7下温度数量',
        value: 6,
        address: '0x0018'
      },
      {
        id: 26,
        label: 'AFE8下温度数量',
        value: 6,
        address: '0x0019'
      },
      {
        id: 27,
        label: 'AFE9下温度数量',
        value: 6,
        address: '0x001a'
      },
      {
        id: 28,
        label: 'AFE10下温度数量',
        value: 6,
        address: '0x001b'
      },
      {
        id: 29,
        label: 'AFE11下温度数量',
        value: 6,
        address: '0x001c'
      },
      {
        id: 30,
        label: 'AFE12下温度数量',
        value: 6,
        address: '0x001d'
      },
      {
        id: 31,
        label: 'AFE13下温度数量',
        value: 6,
        address: '0x001e'
      },
      {
        id: 32,
        label: 'AFE14下温度数量',
        value: 6,
        address: '0x001f'
      },
      {
        id: 33,
        label: 'AFE15下温度数量',
        value: 6,
        address: '0x0020'
      },
      {
        id: 34,
        label: 'AFE16下温度数量',
        value: 6,
        address: '0x0021'
      },
      {
        id: 35,
        label: 'AFE1的虚拟电池偏移位置1',
        value: 0,
        address: '0x0022'
      },
      {
        id: 36,
        label: 'AFE1的虚拟电池偏移位置2',
        value: 0,
        address: '0x0023'
      },
      {
        id: 36,
        label: 'AFE2的虚拟电池偏移位置1',
        value: 0,
        address: '0x0024'
      },
      {
        id: 37,
        label: 'AFE2的虚拟电池偏移位置2',
        value: 0,
        address: '0x0025'
      },
      {
        id: 37,
        label: 'AFE3的虚拟电池偏移位置1',
        value: 0,
        address: '0x0026'
      },
      {
        id: 38,
        label: 'AFE3的虚拟电池偏移位置2',
        value: 0,
        address: '0x0027'
      },
      {
        id: 38,
        label: 'AFE4的虚拟电池偏移位置1',
        value: 0,
        address: '0x0028'
      },
      {
        id: 39,
        label: 'AFE4的虚拟电池偏移位置2',
        value: 0,
        address: '0x0029'
      },
      {
        id: 39,
        label: 'AFE5的虚拟电池偏移位置1',
        value: 0,
        address: '0x002a'
      },
      {
        id: 40,
        label: 'AFE5的虚拟电池偏移位置2',
        value: 0,
        address: '0x002b'
      },
      {
        id: 40,
        label: 'AFE6的虚拟电池偏移位置1',
        value: 0,
        address: '0x002c'
      },
      {
        id: 41,
        label: 'AFE6的虚拟电池偏移位置2',
        value: 0,
        address: '0x002d'
      },
      {
        id: 41,
        label: 'AFE7的虚拟电池偏移位置1',
        value: 0,
        address: '0x002e'
      },
      {
        id: 42,
        label: 'AFE7的虚拟电池偏移位置2',
        value: 0,
        address: '0x002f'
      },
      {
        id: 42,
        label: 'AFE8的虚拟电池偏移位置1',
        value: 0,
        address: '0x0030'
      },
      {
        id: 43,
        label: 'AFE8的虚拟电池偏移位置2',
        value: 0,
        address: '0x0031'
      },
      {
        id: 43,
        label: 'AFE9的虚拟电池偏移位置1',
        value: 0,
        address: '0x0032'
      },
      {
        id: 44,
        label: 'AFE9的虚拟电池偏移位置2',
        value: 0,
        address: '0x0033'
      },
      {
        id: 44,
        label: 'AFE10的虚拟电池偏移位置1',
        value: 0,
        address: '0x0034'
      },
      {
        id: 45,
        label: 'AFE10的虚拟电池偏移位置2',
        value: 0,
        address: '0x0035'
      },
      {
        id: 45,
        label: 'AFE11的虚拟电池偏移位置1',
        value: 0,
        address: '0x0036'
      },
      {
        id: 46,
        label: 'AFE11的虚拟电池偏移位置2',
        value: 0,
        address: '0x0037'
      },
      {
        id: 46,
        label: 'AFE12的虚拟电池偏移位置1',
        value: 0,
        address: '0x0038'
      },
      {
        id: 47,
        label: 'AFE12的虚拟电池偏移位置2',
        value: 0,
        address: '0x0039'
      },
      {
        id: 47,
        label: 'AFE13的虚拟电池偏移位置1',
        value: 0,
        address: '0x003a'
      },
      {
        id: 48,
        label: 'AFE13的虚拟电池偏移位置2',
        value: 0,
        address: '0x003b'
      },
      {
        id: 48,
        label: 'AFE14的虚拟电池偏移位置1',
        value: 0,
        address: '0x003c'
      },
      {
        id: 49,
        label: 'AFE14的虚拟电池偏移位置2',
        value: 0,
        address: '0x003d'
      },
      {
        id: 49,
        label: 'AFE15的虚拟电池偏移位置1',
        value: 0,
        address: '0x003e'
      },
      {
        id: 50,
        label: 'AFE15的虚拟电池偏移位置2',
        value: 0,
        address: '0x003f'
      },
      {
        id: 50,
        label: 'AFE16的虚拟电池偏移位置1',
        value: 0,
        address: '0x0040'
      },
      {
        id: 51,
        label: 'AFE16的虚拟电池偏移位置2',
        value: 0,
        address: '0x0041'
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '系统及设备类型配置',
    element: [
      {
        id: 1,
        address: '0x0052',
        label: '事件记录模式',
        optionKey: 'eventLoggingMode',
        value1: '简约模式',
        value: 0,
        noteKey: 'note3'
      },
      {
        id: 2,
        address: '0x0053',
        label: '内测模式',
        optionKey: 'internalTestMode',
        value1: '关闭内测模式',
        value: 0,
        noteKey: 'note4'
      },
      {
        id: 3,
        address: '0x0054',
        label: '均衡模式',
        optionKey: 'balancingMode',
        value1: '手动均衡',
        value: 1,
        noteKey: 'note5'
      },
      {
        id: 4,
        address: '0x0055',
        label: '运维模式',
        optionKey: 'maintenanceMode',
        value1: '非运维模式',
        value: 4641,
        noteKey: 'note6'
      },
      {
        id: 5,
        address: '0x0056',
        label: 'PCS类型',
        optionKey: 'pcsType',
        value1: '无PCS',
        value: 65535,
        noteKey: 'note7'
      },
      {
        id: 6,
        address: '0x0057',
        label: '制冷设备类型',
        optionKey: 'refrigerationEquipmentType',
        value1: '无制冷设备',
        value: 65535,
        noteKey: 'note8'
      },
      {
        id: 7,
        address: '0x0058',
        label: '除湿机设备类型',
        optionKey: 'dehumidifierEquipmentType',
        value1: '无除湿机设备',
        value: 65535
      },
      {
        id: 8,
        address: '0x0059',
        label: '消防控制器类型',
        optionKey: 'fireControllerType',
        value1: '无消防控制器',
        value: 65535
      },
      {
        address: '0x005a',
        id: 100,
        label: '簇压模式',
        optionKey: 'clusterVoltageMode',
        value1: '单体电压累加模式',
        value: 1,
        isNum: false
      },
      {
        address: '0x005a',
        id: 101,
        label: 'BMU动力接插件温度',
        optionKey: 'powerConnector',
        value1: '存在',
        value: 1,
        isNum: false
      },
      {
        address: '0x005a',
        id: 102,
        label: 'BMU温度数据类型',
        optionKey: 'bmuTempDataType',
        value1: '高精度模式',
        value: 1,
        isNum: false
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '单体温度电压滤波配置',
    element: [
      {
        id: 103,
        address: '0x005d',
        label: '单体电压滤波差值',
        value: 0.05,
        unit: 'V'
      },
      {
        id: 9,
        address: '0x005e',
        label: '单体电压权重系数',
        value: '0.40'
      },
      {
        id: 10,
        address: '0x005f',
        label: '单体温度滤波差值',
        value: '10.0',
        unit: '℃'
      },
      {
        id: 11,
        address: '0x0060',
        label: '单体温度权重系数',
        value: '0.10'
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '延时配置',
    element: [
      {
        id: 12,
        address: '0x0061',
        label: '直流供电断开延时时间',
        value: 600,
        unit: 's'
      },
      {
        id: 13,
        address: '0x0062',
        label: '电芯静置时间',
        value: 10,
        unit: 'min'
      },
      {
        id: 14,
        address: '0x0063',
        label: '接触器范围值',
        value: '10.0',
        unit: 'V'
      },
      {
        id: 15,
        address: '0x0064',
        label: '接触器检测延时时间',
        value: 3,
        unit: 's'
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '设备温度配置',
    element: [
      {
        id: 16,
        address: '0x0069',
        label: '制冷设备-制冷开启温度',
        value: '25.0',
        unit: '℃'
      },
      {
        id: 17,
        address: '0x006a',
        label: '制冷设备-制冷关闭温度',
        value: '20.0',
        unit: '℃'
      },
      {
        id: 18,
        address: '0x006b',
        label: '制冷设备-制热开启温度',
        value: '10.0',
        unit: '℃'
      },
      {
        id: 19,
        address: '0x006c',
        label: '制冷设备-制热关闭温度',
        value: '15.0',
        unit: '℃'
      },
      {
        id: 20,
        address: '0x006d',
        label: '风扇开启温度',
        value: '30.0',
        unit: '℃'
      },
      {
        id: 21,
        address: '0x006e',
        label: '风扇停止温度',
        value: '25.0',
        unit: '℃'
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '波特率配置',
    element: [
      {
        id: 22,
        address: '0x0073',
        label: 'CAN1通讯速率/仲裁域速率',
        optionKey: 'can1CommRate',
        value1: '500k',
        value: 4,
        noteKey: 'note9'
      },
      {
        id: 23,
        address: '0x0074',
        label: 'CAN1数据域波特率',
        optionKey: 'can1DataBaudRate',
        value1: 'Invalid/Not Supported',
        value: 0,
        noteKey: 'note10'
      },
      {
        id: 24,
        address: '0x0075',
        label: 'CAN2通讯速率/仲裁域速率',
        optionKey: 'can2CommRate',
        value1: '250k',
        value: 3,
        noteKey: 'note11'
      },
      {
        id: 25,
        address: '0x0076',
        label: 'CAN2数据域波特率',
        optionKey: 'can2DataBaudRate',
        value1: 'Invalid/Not Supported',
        value: 0,
        noteKey: 'note12'
      },
      {
        id: 26,
        address: '0x0077',
        label: 'CAN3通讯速率/仲裁域速率',
        optionKey: 'can3CommRate',
        value1: '500k',
        value: 4,
        noteKey: 'note13'
      },
      {
        id: 27,
        address: '0x0078',
        label: 'CAN3数据域波特率',
        optionKey: 'can3DataBaudRate',
        value1: 'Invalid/Not Supported',
        value: 0,
        noteKey: 'note14'
      },
      {
        id: 28,
        address: '0x0079',
        label: 'RS485-1通讯速率',
        optionKey: 'rs485_1CommRate',
        value1: '9600',
        value: 3,
        noteKey: 'note15'
      },
      {
        id: 29,
        address: '0x007a',
        label: 'RS485-2通讯速率',
        optionKey: 'rs485_2CommRate',
        value1: '9600',
        value: 3
      },
      {
        id: 30,
        address: '0x007b',
        label: 'RS485-3通讯速率',
        optionKey: 'rs485_3CommRate',
        value1: '9600',
        value: 3
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '电流传感器配置',
    element: [
      {
        id: 31,
        address: '0x0080',
        label: '电流传感器类型',
        optionKey: 'currentSensorType',
        value1: 'LEM-CAB500-C/SP5-012',
        value: 0,
        noteKey: 'note16'
      },
      {
        id: 32,
        address: '0x0081',
        label: '电流传感器1量程',
        value: 100,
        unit: 'A'
      },
      {
        id: 33,
        address: '0x0082',
        label: '电流传感器2量程',
        value: 100,
        unit: 'A'
      },
      {
        id: 34,
        address: '0x0083',
        label: '电流传感器3量程',
        value: 100,
        unit: 'A'
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '电池参数配置',
    element: [
      {
        id: 35,
        address: '0x0086',
        label: '电池类型',
        optionKey: 'batteryType',
        value1: '磷酸铁锂电池',
        value: 0,
        noteKey: 'note17'
      },
      {
        id: 36,
        address: '0x0087',
        label: '电池型号',
        value: 0
      },
      {
        id: 37,
        address: '0x0088',
        label: '电池厂家',
        value: 0
      },
      {
        id: 38,
        address: '0x0089',
        label: '电池额定容量',
        value: 280,
        unit: 'Ah'
      },
      {
        id: 39,
        address: '0x008a',
        label: '簇校正电量',
        value: '344.06',
        unit: 'kWh'
      },
      {
        id: 40,
        address: '0x008c',
        label: '簇额定电量',
        value: '344.06',
        unit: 'kWh'
      },
      {
        id: 41,
        address: '0x008e',
        label: '簇额定功率',
        value: '100.00',
        unit: 'kW'
      },
      {
        id: 990,
        address: '0x0090',
        label: '额定电压',
        value: '1228.8',
        unit: 'V'
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '均衡参数配置',
    element: [
      {
        id: 42,
        address: '0x0094',
        label: '均衡开启时间',
        value: 3,
        unit: 's',
        noteKey: 'note18',
        note: '例：开启时间3s，停止1s,实际运行均衡3s停止1s，周期为4s'
      },
      {
        id: 43,
        address: '0x0095',
        label: '均衡关闭时间',
        value: 1,
        unit: 's'
      },
      {
        id: 44,
        address: '0x0096',
        label: '均衡模式选项',
        optionKey: 'balancingModeOptions',
        value1: '开路',
        value: 1,
        noteKey: 'note19'
      },
      {
        id: 45,
        address: '0x0097',
        label: '均衡启动单体电压上限',
        value: 3500,
        unit: 'mV'
      },
      {
        id: 46,
        address: '0x0098',
        label: '均衡启动单体电压下限',
        value: 3500,
        unit: 'mV'
      },
      {
        id: 47,
        address: '0x0099',
        label: '均衡启动电池温度上限',
        value: '40.0',
        unit: '℃'
      },
      {
        id: 48,
        address: '0x009a',
        label: '均衡启动电池温度下限',
        value: '10.0',
        unit: '℃'
      },
      {
        id: 49,
        address: '0x009b',
        label: '开路均衡最大时间',
        value: 1000,
        unit: 's'
      },
      {
        id: 50,
        address: '0x009c',
        label: '充电均衡阈值电压区间K值',
        optionKey: 'chargeBalanceThresholdK',
        value1: '1000mV',
        value: 1000,
        noteKey: 'note20'
      },
      {
        id: 51,
        address: '0x009d',
        label: '放电均衡阈值电压区间K值',
        optionKey: 'dischargeBalanceThresholdK',
        value1: '1000mV',
        value: 1000,
        noteKey: 'note21'
      },
      {
        id: 52,
        address: '0x009e',
        label: '开路,静置均衡阈值电压区间K值',
        optionKey: 'openCircuitBalanceThresholdK',
        value1: '1000mV',
        value: 1000,
        noteKey: 'note22'
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '电流电压校准参数',
    element: [],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  },
  {
    classification: '设备出厂信息',
    element: [
      {
        address: '0x5713-0x5716',
        label: '生产编码',
        value: '202501010000',
        noteKey: 'note23',
        note: '年月日编号'
      },
      {
        address: '0x5717',
        label: '本机ID',
        value: 232
      },
      {
        address: '0x5718-0x5719',
        label: '本机IP',
        value: '192.168.10.208',
        dataType: 'ip'
      },
      {
        address: '0x571A-0x571B',
        label: '子网掩码',
        value: '255.255.255.0',
        dataType: 'ip'
      },
      {
        address: '0x571C-0x571D',
        label: '默认网关',
        value: '192.168.10.1',
        dataType: 'ip'
      },
      {
        address: '0x571E-0x571F',
        label: '首选DNS',
        value: '8.8.8.8',
        dataType: 'ip'
      },
      {
        address: '0x5720-0x5721',
        label: '备用DNS',
        value: '8.8.4.4',
        dataType: 'ip'
      },
      {
        address: '0x5722',
        label: '端口',
        value: 0
      },
      {
        address: '0x5723',
        label: 'MAC地址',
        value: '0-0-0-0-0-0',
        noteKey: 'note24',
        note: '只读'
      }
    ],
    config: {
      bmuTotal: 8,
      afeTotal: 4,
      cellsPerBMU: 48
    }
  }
]
export { initAlarmConfig, initSOXConfig, initBCUConfig }
