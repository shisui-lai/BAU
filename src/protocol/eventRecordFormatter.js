/**
 * 事件记录字段格式化模块
 * 用于将事件记录的数字值转换为可读的中文文本
 */

/**
 * 事件类型映射表
 */
const EVENT_TYPE_MAP = {
  // 一、系统状态触发记录类型（100–115）
  100: '系统启动',
  101: '事件记录异常复位',
  102: '事件记录溢出清除',
  103: '存储器第一次使用参数复位',
  104: '堆系统状态切换',
  105: '远方就地场景切换',
  106: 'SD卡插卡状态',
  107: 'SD卡挂载状态',
  108: 'SD卡写入状态变化',
  109: 'BCU上电',
  110: 'BAU下电',
  111: 'BCU通讯状态变化',
  112: 'EMS通讯状态变化',
  113: 'PCS通讯状态变化',
  114: '水冷机通讯状态变化',
  115: 'I/O模块通讯状态变化',
  116: '电表通讯状态变化',
  117: '消防设备通讯状态变化',
  118: '堆总故障状态变化',
  // 119–149 预留
  // 二、下设控制触发记录类型（200–270）
  200: '下设接触器执行策略',
  201: '下设接触器独立执行',
  202: '下设绝缘电阻检测指令',
  203: '设置系统运行模式',
  204: '掉线检测功能使能',
  205: '强制消除BCU故障',
  206: '控制参数复位',
  207: '设置清除BCU事件记录数量',
  208: '复位BCU事件记录存储器',
  209: '接触器控制',
  210: '高低边控制',
  211: '其他IO控制',
  212: '强制OCV',
  213: '复位BCU',
  214: 'SOH权重校准',
  215: 'SOH强制校准',
  216: '上电SOH存储标志位复位',
  217: '复位可配置默认参数次数',
  218: '擦除可配置默认参数区',
  219: 'SOX-EKFSOC',
  220: 'SOX-EKF协方差',
  221: '强制复位指令',
  250: '下设堆接触器执行策略',
  251: '清除所有簇保留故障',
  252: '下设堆参数复位',
  253: '下设周期性绝缘检测指令',
  254: '下设接触器自检指令',
  255: '下设复位BAU',
  256: '手动启动/停止SD卡记录',
  257: '下设堆SOC',
  258: '下设簇SOC',
  259: 'BAU固件升级',
  260: 'BCU固件升级',
  261: 'BMU固件升级',
  262: 'BCU地址自适应',
  263: 'BMU地址自适应',
  264: '设置BAU时间',
  265: '重置BAU网卡',
  266: '清除堆保留故障',
  267: '设置BAU清除事件记录数量',
  268: '复位BAU事件记录存储器',
  269: '下设BCP控制',
  270: '堆绝缘检测控制',
  271: '堆接触器自检控制',
  272: '重新开始SD卡记录',
  273: '下设簇单体最大显示SOC',
  274: '下设簇单体最小显示SOC',
  275: '复位可配置默认参数次数',
  276: '擦除可配置默认参数区',
  
  // 三、参数下设事件记录类型（300–305）
  300: '系统基本参数下设',
  301: '报警参数下设',
  302: '实时保存数据下设',
  303: 'SOX算法配置参数下设',
  304: 'SOP配置参数下设',
  305: '出厂校正参数下设',
  // 四、配置与系统参数变化类（350–397）
  350: '分簇控制标志位',
  351: 'EMS通讯故障断接触器使能',
  352: '运维模式',
  353: '内测模式',
  354: '实时数据记录周期',
  355: '当前配置堆数',
  356: '当前配置簇数',
  357: 'BMU总数配置',
  358: 'BMU下AFE数量配置',
  359: 'AFE下电压数量配置',
  360: 'AFE下温感数量配置',
  361: '虚拟电池1配置',
  362: '虚拟电池2配置',
  363: '网卡1 IP地址变化',
  364: '网卡2 IP地址变化',
  365: 'MQTT配置参数变化',
  366: 'MQTT服务器PORT参数变化',
  367: '网卡1速度',
  368: '网卡2速度',
  369: 'PCS设备类型',
  370: 'PCS设备数量',
  371: '制冷设备类型',
  372: '制冷设备数量',
  373: '除湿空调设备类型',
  374: '除湿空调设备数量',
  375: 'I/O控制板设备类型',
  376: 'I/O控制板设备数量',
  377: 'I/O控制板设备IP基地址',
  378: 'I/O控制板设备网卡位置',
  379: '最小并簇数',
  380: '使能簇配置',
  381: '开路下堆电压为0使能',
  382: '是否存在BCP控制',
  383: '簇电压差值-严重报警值',
  384: '簇电压差值-严重报警滤波时间',
  385: '簇电压差值-严重报警恢复值',
  386: '簇电压差值-严重报警恢复滤波时间',
  387: '簇电流差值-严重报警值',
  388: '簇电流差值-严重报警滤波时间',
  389: '簇电流差值-严重报警恢复值',
  390: '簇电流差值-严重报警恢复滤波时间',
  391: '堆电流有效阈值',
  392: 'BlockSOC取值阈值下限',
  393: 'BlockSOC取值阈值上限',
  394: '显示SOC追赶真实SOC时间',
  395: '堆显示SOC与堆真实SOC差值范围',
  396: '充电OCV表-参数1',
  397: '充电OCV表-参数2',
  398: '充电OCV表-参数3',
  399: '充电OCV表-参数4',
  400: '充电OCV表-参数5',
  401: '充电OCV表-参数6',
  402: '充电OCV表-参数7',
  403: '充电OCV表-参数8',
  404: '充电OCV表-参数9',
  405: '充电OCV表-参数10',
  406: '充电OCV表-参数11',
  407: '充电OCV表-参数12',
  408: '充电OCV表-参数13',
  409: '充电OCV表-参数14',
  410: '充电OCV表-参数15',
  411: '充电OCV表-参数16',
  412: '充电OCV表-参数17',
  413: '充电OCV表-参数18',
  414: '充电OCV表-参数19',
  415: '充电OCV表-参数20',
  416: '充电OCV表-参数21',
  417: '单簇有效电芯串数',
  418: '电芯额定容量',
  419: '簇间SOC同步开关',
  420: '电表类型',
  421: '电表数量',
  422: '消防设备类型',
  423: '消防设备数量',
  424: '控温模式',
  425: '分段控温-簇编号起始1',
  426: '分段控温-簇编号结束1',
  427: '分段控温-簇编号起始2',
  428: '分段控温-簇编号结束2',
  429: '分段控温-簇编号起始3',
  430: '分段控温-簇编号结束3',
  431: '分段控温-簇编号起始4',
  432: '分段控温-簇编号结束4',
  433: '运行状态-启动制冷条件1-单体最大温度',
  434: '运行状态-启动制冷条件2-单体平均温度',
  435: '运行状态制冷-下设制冷温度值',
  436: '运行状态制冷-下设加热温度值',
  437: '运行状态制冷-下设控制模式',
  438: '运行状态-关闭制冷条件3-单体最大温度',
  439: '运行状态-关闭制冷条件4-单体平均温度',
  440: '非运行状态-启动制冷条件1-单体最大温度',
  441: '非运行状态-启动制冷条件2-单体平均温度',
  442: '非运行状态制冷-下设制冷温度值',
  443: '非运行状态制冷-下设加热温度值',
  444: '非运行状态制冷-下设控制模式',
  445: '非运行状态-关闭制冷条件3-单体最大温度',
  446: '非运行状态-关闭制冷条件4-单体平均温度',
  447: '运行状态-启动加热条件1-单体最小温度',
  448: '运行状态-启动加热条件2-单体平均温度',
  449: '运行状态加热-下设制冷温度值',
  450: '运行状态加热-下设加热温度值',
  451: '运行状态加热-下设控制模式',
  452: '运行状态-关闭加热条件3-单体最小温度',
  453: '运行状态-关闭加热条件4-单体平均温度',
  454: '非运行状态-启动加热条件1-单体最小温度',
  455: '非运行状态-启动加热条件2-单体平均温度',
  456: '非运行状态加热-下设制冷温度值',
  457: '非运行状态加热-下设加热温度值',
  458: '非运行状态加热-下设控制模式',
  459: '非运行状态-关闭加热条件3-单体最小温度',
  460: '非运行状态-关闭加热条件4-单体平均温度'
}

/**
 * 故障字段Bit映射表（基于111.txt文档452-627行）
 * 用于将故障寄存器的bit位映射到对应的故障名称
 */
const FAULT_BIT_MAPS = {
  // 簇汇总模拟量三级告警
  ClusterAnalogAlarm_Severe1: [
    '单体压差上限告警',
    '单体温差上限告警',
    '单体SOC差异过大告警',
    '电池包间压差过大告警',
    '簇电压上限告警',
    '簇电压下限告警',
    '簇绝缘电阻R+下限告警',
    '簇绝缘电阻R-下限告警',
    '簇充电电流上限告警',
    '簇放电电流上限告警',
    'BCU RT1过温告警',
    'BCU RT2过温告警',
    'BCU RT3过温告警',
    'BCU RT4过温告警',
    'BCU RT5过温告警',
    '铜排过温告警'
  ],
  ClusterAnalogAlarm_Severe2: [
    '电池包电压上限告警',
    '电池包电压下限告警',
    '电池包温度上限告警',
    '电池包温度下限告警',
    '电池包动力接插件正极温度上限告警',
    '电池包动力接插件负极温度上限告警',
    '单体电压上限告警',
    '单体电压下限告警',
    '充电单体温度上限告警',
    '充电单体温度下限告警',
    '放电单体温度上限告警',
    '放电单体温度下限告警',
    '单体SOC上限告警',
    '单体SOC下限告警',
    'BMU动力接插件温差过大告警',
    '簇端动力接插件温差过大告警'
  ],
  ClusterAnalogAlarm_Moderate1: [
    '单体压差上限告警',
    '单体温差上限告警',
    '单体SOC差异过大告警',
    '电池包间压差过大告警',
    '簇电压上限告警',
    '簇电压下限告警',
    '簇绝缘电阻R+下限告警',
    '簇绝缘电阻R-下限告警',
    '簇充电电流上限告警',
    '簇放电电流上限告警',
    'BCU RT1过温告警',
    'BCU RT2过温告警',
    'BCU RT3过温告警',
    'BCU RT4过温告警',
    'BCU RT5过温告警',
    '铜排过温告警'
  ],
  ClusterAnalogAlarm_Moderate2: [
    '电池包电压上限告警',
    '电池包电压下限告警',
    '电池包温度上限告警',
    '电池包温度下限告警',
    '电池包动力接插件正极温度上限告警',
    '电池包动力接插件负极温度上限告警',
    '单体电压上限告警',
    '单体电压下限告警',
    '充电单体温度上限告警',
    '充电单体温度下限告警',
    '放电单体温度上限告警',
    '放电单体温度下限告警',
    '单体SOC上限告警',
    '单体SOC下限告警',
    'BMU动力接插件温差过大告警',
    '簇端动力接插件温差过大告警'
  ],
  ClusterAnalogAlarm_Mild1: [
    '单体压差上限告警',
    '单体温差上限告警',
    '单体SOC差异过大告警',
    '电池包间压差过大告警',
    '簇电压上限告警',
    '簇电压下限告警',
    '簇绝缘电阻R+下限告警',
    '簇绝缘电阻R-下限告警',
    '簇充电电流上限告警',
    '簇放电电流上限告警',
    'BCU RT1过温告警',
    'BCU RT2过温告警',
    'BCU RT3过温告警',
    'BCU RT4过温告警',
    'BCU RT5过温告警',
    '铜排过温告警'
  ],
  ClusterAnalogAlarm_Mild2: [
    '电池包电压上限告警',
    '电池包电压下限告警',
    '电池包温度上限告警',
    '电池包温度下限告警',
    '电池包动力接插件正极温度上限告警',
    '电池包动力接插件负极温度上限告警',
    '单体电压上限告警',
    '单体电压下限告警',
    '充电单体温度上限告警',
    '充电单体温度下限告警',
    '放电单体温度上限告警',
    '放电单体温度下限告警',
    '单体SOC上限告警',
    '单体SOC下限告警',
    'BMU动力接插件温差过大告警',
    '簇端动力接插件温差过大告警'
  ],

  // 簇汇总硬件故障
  ClusterHardwareFault_Word1: [
    '主正接触器反馈故障',
    '主正高边驱动反馈故障',
    '主正氧化',
    '主正黏连',
    '主正接触器故障汇总',
    '主负接触器反馈故障',
    '主负高边驱动反馈故障',
    '主负氧化',
    '主负黏连',
    '主负接触器故障汇总',
    '预充接触器反馈故障',
    '预充高边驱动反馈故障',
    '预充氧化',
    '预充黏连',
    '预充接触器故障汇总',
    '汇总的故障'
  ],
  ClusterHardwareFault_Word2: [
    '隔离开关反馈故障',
    '断路器反馈故障',
    '风扇反馈故障',
    '直流供电KM反馈故障',
    '门禁反馈故障',
    'SPD反馈故障',
    '交流电压反馈故障',
    '烟感反馈故障',
    '消防释放信号',
    '温感反馈故障',
    '排风系统反馈故障',
    '辅助断路器反馈故障',
    '氢气探测器反馈故障',
    'MSD反馈故障',
    '急停反馈故障',
    '柜体风机反馈故障'
  ],
  ClusterHardwareFault_Word3: [
    '预留', // Bit0 原主正高边驱动反馈故障
    '预留', // Bit1 原主负高边驱动反馈故障
    '预留', // Bit2 原预充高边驱动反馈故障
    '红灯高边驱动反馈故障', // Bit3
    '黄灯高边驱动反馈故障', // Bit4
    '绿灯高边驱动反馈故障', // Bit5
    '风机高边驱动反馈故障', // Bit6
    '主断分励高边驱动反馈故障', // Bit7
    '直流供电KM高边驱动反馈故障', // Bit8
    'pcs封波高边驱动反馈故障', // Bit9
    '辅助断路器控制高边驱动反馈故障', // Bit10
    '排风系统控制高边驱动反馈故障', // Bit11
    '柜体风机高边反馈故障', // Bit12
    '熔断器反馈故障', // Bit13
    '预留', // Bit14
    '预留' // Bit15
  ],

  ClusterHardwareFault_Word4: [
    '制冷设备通信故障', // Bit0
    'PCS设备通信故障', // Bit1
    '除湿机通信故障', // Bit2
    '消防设备通信故障', // Bit3
    'BMU通信故障', // Bit4
    'CAN霍尔通信故障', // Bit5
    'BCU内网通讯故障', // Bit6
    '菊花链通信故障', // Bit7
    'AFE通信故障', // Bit8
    '预留', // Bit9
    '预留', // Bit10
    '预留', // Bit11
    '预留', // Bit12
    '预留', // Bit13
    '预留', // Bit14
    '预留' // Bit15
  ],

  ClusterHardwareFault_Word5: [
    'bcu环境传感器故障', // Bit0 (table.js中是小写)
    'B+传感器故障', // Bit1
    'B-传感器故障', // Bit2
    'P+传感器故障', // Bit3
    'P-传感器故障', // Bit4
    '熔断器1传感器故障', // Bit5
    '熔断器2传感器故障', // Bit6
    '预留', // Bit7
    '预留', // Bit8
    '预留', // Bit9
    '预留', // Bit10
    '预留', // Bit11
    '预留', // Bit12
    '预留', // Bit13
    '预留', // Bit14
    '预留' // Bit15
  ],

  ClusterHardwareFault_Word6: [
    '霍尔故障', // Bit0
    '存在无效数据', // Bit1
    '铁电存储器故障', // Bit2
    'eeprom存储器故障', // Bit3 (table.js中是小写)
    'flash存储器故障', // Bit4 (table.js中是小写)
    '电压采集断线', // Bit5
    '温度采集断线', // Bit6
    '保留故障', // Bit7
    '预留', // Bit8
    '预留', // Bit9
    '预留', // Bit10
    '预留', // Bit11
    '预留', // Bit12
    '预留', // Bit13
    '预留', // Bit14
    '预留' // Bit15
  ],

  // 堆硬件故障
  StackHardwareFault_Word1: [
    '消防报警',
    '消防故障',
    '急停信号',
    '消防释放',
    '直流浪涌告警',
    '门禁故障',
    '交流浪涌告警',
    '熔断器故障',
    '水浸故障',
    '微粒子监测1故障',
    '微粒子监测2故障',
    '电池仓温湿度故障',
    'UPS反馈故障',
    '预留',
    '预留',
    '预留'
  ],
  StackHardwareFault_Word2: [
    '铁电存储器故障',
    '制冷设备通讯故障',
    'PCS通讯故障',
    '除湿空调通讯故障',
    'I/O控制板通讯故障',
    'BCU通讯故障',
    'EMS通讯故障',
    '电表设备通讯故障',
    '消防设备通讯故障',
    '簇间压差严重故障',
    '簇间电流差严重故障',
    '预留',
    '预留',
    '预留',
    '预留',
    '堆保留故障'
  ]
}

/**
 * 辅助函数：解析空值
 */
function parseNull() {
  return '/'
}

function parsePassword(raw) {
  return `密码:${String(raw)}`
}

/**
 * 辅助函数：解析堆序号
 */
function parseBlockId(raw) {
  const blockIdMap = { 1: '第1堆', 2: '第2堆' }
  return blockIdMap[raw] !== undefined ? blockIdMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析簇序号
 */
function parseClusterId(raw) {
  if (raw === 0xff) return '全部簇'
  if (raw >= 1 && raw <= 20) return `第${raw}簇`
  return `${raw}(未定义)`
}

/**
 * 辅助函数：解析系统状态
 */
function parseSysStatus(raw) {
  const statusMap = { 0: '静置', 1: '充电', 2: '放电', 3: '开路', 4: '自检' }
  return statusMap[raw] !== undefined ? statusMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析插卡状态
 */
function parseCardStatus(raw) {
  const statusMap = { 0: '未插卡', 1: '已插卡' }
  return statusMap[raw] !== undefined ? statusMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析挂载状态
 */
function parseMountStatus(raw) {
  const statusMap = { 0: '卸载', 1: '挂载' }
  return statusMap[raw] !== undefined ? statusMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析写入状态
 */
function parseWriteStatus(raw) {
  const statusMap = { 0: 'SD卡路径不存在', 1: '写成功', 2: '写失败' }
  return statusMap[raw] !== undefined ? statusMap[raw] : `${raw}(未定义)`
}
function parseWriteFailReason(raw) {
  if (raw === 0) return '/'
  const reasonMap = { 1: 'CMD13错误', 2: 'CMD8错误', 3: '心跳超时', 4: '写数据错误' }
  const reason = reasonMap[raw] !== undefined ? reasonMap[raw] : `${raw}(未定义)`
  return `错误原因:${reason}`
}

/**
 * 辅助函数：解析通讯状态
 */
function parseCommStatus(raw) {
  const statusMap = { 0: '通讯正常', 1: '通讯失联' }
  return statusMap[raw] !== undefined ? statusMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析远方就地场景
 */
function parseRemoteLocalScene(raw) {
  const sceneMap = { 0: '远方', 1: '就地' }
  return sceneMap[raw] !== undefined ? sceneMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析接触器执行策略
 */
function parseContactorAction(raw) {
  const actionMap = {
    0: '无效（不执行）',
    1: '设置充电吸合',
    2: '设置放电吸合',
    3: '设置脱离母线',
    4: '接触器自检'
  }
  return actionMap[raw] !== undefined ? actionMap[raw] : `未知(${raw})`
}

/**
 * 辅助函数：解析强制消除故障类型（用于事件205/251）
 */
function parseFaultClearAction(raw) {
  if (raw === 0xffff) return '无效'
  const actionMap = {
    0: '清除所有故障',
    1: '清除充电过流严重告警',
    2: '清除放电过流严重告警',
    3: '清除绝缘电阻严重告警',
    4: '清除接触器黏连（氧化）',
    5: '清除PCS通讯故障'
  }
  return actionMap[raw] !== undefined ? actionMap[raw] : `未知(${raw})`
}

/**
 * 辅助函数：解析保留故障类型（按位域解析，用于事件266 清除堆保留故障）
 * 位域定义：
 *   Bit0: 接触器/隔离开关故障
 *   Bit1-15: 预留
 */
function parseReservedFaultClearAction(raw) {
  if (raw === 0xffff) return '无效'
  const names = ['接触器/隔离开关故障']
  const parts = []
  for (let i = 0; i < names.length; i++) {
    const bit = (raw >> i) & 0x1
    if (bit === 1) {
      parts.push(`清除${names[i]}`)
    }
  }
  return parts.length > 0 ? parts.join(';') : '不执行'
}

/**
 * 辅助函数：解析BCU事件删除数量
 */
function parseBCUEventDeleteCount(raw) {
  if (raw === 0x0000) return '不删除'
  if (raw === 0xffff) return '删除全部'
  return `删除指定数量(${raw})条`
}

/**
 * 辅助函数：解析模式设置
 */
function parseModeSetting(raw) {
  if (raw === 0x5bb5) return '测试模式'
  if (raw === 0x1221) return '正常模式'
  return `未知(${raw})`
}

/**
 * 辅助函数：解析掉线检测功能使能
 */
function parseOfflineDetectEnable(raw) {
  if (raw === 0x5bb5) return '开启（默认）'
  if (raw === 0x1221) return '关闭'
  return `未知(${raw})`
}

/**
 * 辅助函数：解析绝缘检测启停
 */
function parseInsulationDetect(raw) {
  if (raw === 0x5bb5) return '启动绝缘电阻检测'
  if (raw === 0x1221) return '停止绝缘电阻检测'
  return `未知(${raw})`
}

/**
 * 辅助函数：解析执行复位指令
 */
function parseResetAction(raw) {
  if (raw === 0x5bb5) return '执行'
  return '不执行'
}

/**
 * 辅助函数：解析可配置默认参数复位动作（十进制574执行）
 */
function parseConfigDefaultParamResetAction(raw) {
  return raw === 574 ? '复位' : '不执行'
}

/**
 * 辅助函数：解析BAU固件升级类型
 */
function parseBAUFirmwareUpgradeType(raw) {
  if (raw === 1) return 'BAU APP'
  if (raw === 2) return 'BAU CFG'
  return `${raw}(未定义)`
}

/**
 * 辅助函数：解析BCU固件升级类型
 */
function parseBCUFirmwareUpgradeType(raw) {
  if (raw === 1) return 'BCU APP'
  if (raw === 2) return 'BCU CFG'
  return `${raw}(未定义)`
}

/**
 * 辅助函数：解析接触器自检指令
 */
function parseContactorSelfTest(raw) {
  const statusMap = { 0: '关闭接触器自检指令', 1: '开启接触器自检指令' }
  return statusMap[raw] !== undefined ? statusMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析周期性绝缘检测指令
 */
function parsePeriodicInsulationDetect(raw) {
  const statusMap = { 0: '关闭周期性绝缘检测指令', 1: '开启周期性绝缘检测指令' }
  return statusMap[raw] !== undefined ? statusMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析BCP控制
 */
function parseBCPControl(raw) {
  const controlMap = { 0: 'BCP断开', 1: 'BCP吸合' }
  return controlMap[raw] !== undefined ? controlMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析堆绝缘检测控制动作
 */
function parseStackInsulationControl(raw) {
  const controlMap = {
    1: '启动',
    2: '正常停止',
    3: '超时停止'
  }
  return controlMap[raw] !== undefined ? controlMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析堆接触器自检控制动作
 */
function parseStackContactorSelfTestControl(raw) {
  const controlMap = {
    1: '启动',
    2: '正常停止',
    3: '超时停止'
  }
  return controlMap[raw] !== undefined ? controlMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析使能状态
 */
function parseEnableStatus(raw) {
  const statusMap = { 0: '不使能', 1: '使能' }
  return statusMap[raw] !== undefined ? statusMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析运维模式
 */
function parseOperMode(raw) {
  const modeMap = { 0: '非运维模式', 1: '运维模式' }
  return modeMap[raw] !== undefined ? modeMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析分簇控制标志
 */
function parseClusterControlFlag(raw) {
  const flagMap = { 0: '统一控制', 1: '分簇控制' }
  return flagMap[raw] !== undefined ? flagMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析网卡速度
 */
function parseNetworkSpeed(raw) {
  const speedMap = { 0: '100M', 1: '10M' }
  return speedMap[raw] !== undefined ? speedMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析网卡序号
 */
function parseNetworkCard(raw) {
  const cardMap = { 0: '网卡1', 1: '网卡2' }
  return cardMap[raw] !== undefined ? cardMap[raw] : `${raw}(未定义)`
}

function toIPv4From16(high16, low16) {
  const h = Number(high16) >>> 0
  const l = Number(low16) >>> 0
  const b1 = (h >> 8) & 0xff
  const b2 = h & 0xff
  const b3 = (l >> 8) & 0xff
  const b4 = l & 0xff
  return `${b4}.${b3}.${b2}.${b1}`
}

/**
 * 辅助函数：解析BMU编号
 */
function parseBMUId(raw) {
  if (raw >= 1 && raw <= 16) return `第${raw}BMU`
  return `${raw}(未定义)`
}

function parseAFEId(raw) {
  if (raw >= 1 && raw <= 16) return `第${raw}AFE`
  return `${raw}(未定义)`
}

/**
 * 辅助函数：解析脱离母线原因
 */
function parseDisconnectReason(raw) {
  const reasonMap = {
    1: '模拟量严重/硬件告警/保留告警',
    2: '降功率失败',
    3: '在线簇数小于最小并簇数',
    4: '烟感急停',
    5: '模式切换',
    6: 'EMS断开',
    7: '初始上电断开',
    8: 'EMS与BAU通讯异常',
    9: '运行中各簇状态不一致',
    10: '退出接触器自检',
    11: '启动接触器自检',
    12: '停止接触器自检',
    13: '无故障且0功率',
    14: '一般故障且0功率',
    15: '单簇切出失败冗余处理'
  }
  return reasonMap[raw] !== undefined ? reasonMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析接触器控制位域（209）
 */
function parseContactorControl(raw) {
  const names = [
    '主正接触器',
    '预充接触器',
    '主负接触器',
    '主断分励脱扣',
    '风扇控制',
    '直流供电KM控制'
  ]
  const parts = []
  for (let i = 0; i < names.length; i++) {
    const bit = (raw >> i) & 0x1
    if (bit === 1) {
      parts.push(`${names[i]}:闭合`)
    } else {
      parts.push(`${names[i]}:断开`)
    }
  }
  return parts.join(';')
}

/**
 * 辅助函数：解析高低边控制位域（210）
 */
function parseHLSideControl(raw) {
  const parts = []
  // 高边1-12 (bit 0-11)
  for (let i = 0; i < 12; i++) {
    const bit = (raw >> i) & 0x1
    parts.push(`高边${i + 1}:${bit}`)
  }
  // 低边1-4 (bit 12-15)
  for (let i = 12; i < 16; i++) {
    const bit = (raw >> i) & 0x1
    parts.push(`低边${i - 11}:${bit}`)
  }
  return parts.length > 0 ? parts.join(';') : '无'
}

/**
 * 辅助函数：解析其他IO控制位域（211）
 */
function parseDIDOControl(raw) {
  const parts = []
  const names = ['DI1', 'DI2']
  for (let i = 0; i < 2; i++) {
    const bit = (raw >> i) & 0x1
    parts.push(`${names[i]}:${bit}`)
  }
  // 继电器1-2 (bit 8-9)
  for (let i = 8; i < 10; i++) {
    const bit = (raw >> i) & 0x1
    parts.push(`继电器${i - 7}:${bit}`)
  }
  return parts.length > 0 ? parts.join(';') : '无'
}

/**
 * 辅助函数：解析控制参数复位位域（206）
 */
function parseResetControlParams(raw) {
  if (raw === 0xffff) return '无效'
  const names = [
    '系统基本参数',
    '电芯校准参数',
    '簇诊断参数',
    'pack诊断参数',
    '电芯诊断参数',
    '实时保存数据',
    'sox参数',
    'sop map',
    '出厂校准参数',
    '事件记录标志',
    '系统运行时间',
    '配置参数(硬件/故障映射配置)'
  ]
  const parts = []
  for (let i = 0; i < names.length; i++) {
    const bit = (raw >> i) & 0x1
    if (bit === 1) {
      parts.push(`复位${names[i]}`)
    }
  }
  return parts.length > 0 ? parts.join(';') : '不执行'
}

/**
 * 辅助函数：解析堆参数复位位域（252）
 */
function parseStackResetParams(raw) {
  if (raw === 0xffff) return '无效'
  const names = [
    '系统基本配置',
    '簇端电池配置',
    '端口配置',
    '通讯设备配置',
    '操作配置',
    '堆告警安装',
    '系统堆SOC配置参数',
    '事件记录标志',
    '系统运行时间',
    '复位系统水冷机配置参数',
    '复位系统配置化映射参数'
  ]
  const parts = []
  for (let i = 0; i < names.length; i++) {
    const bit = (raw >> i) & 0x1
    if (bit === 1) {
      parts.push(`${names[i]}:复位`)
    }
  }
  return parts.length > 0 ? parts.join(';') : '不执行'
}

/**
 * 辅助函数：解析接触器独立执行位域（201）
 */
function parseContactorIndependent(raw) {
  const names = ['主正', '预充', '主负', '分励脱扣', '风扇', '直流KM']
  const parts = []
  for (let i = 0; i < names.length; i++) {
    const code = (raw >> (i * 2)) & 0x3
    let status
    if (code === 1) status = '断开'
    else if (code === 2) status = '闭合'
    else status = '无效'
    if (status !== '无效') {
      parts.push(`${names[i]}:${status}`)
    }
  }
  return parts.length > 0 ? parts.join(';') : '无'
}

/**
 * 辅助函数：解析簇选中状态
 */
function parseClusterSelection(raw) {
  if (raw === 0x3ff) {
    // 根据上下文判断是第1-10簇还是第11-20簇
    // 这里暂时返回通用格式
    return '全部簇使能'
  }
  return String(raw)
}

/**
 * 辅助函数：解析十六进制值
 */
function parseHex(raw) {
  return '0x' + Number(raw).toString(16).toUpperCase().padStart(4, '0')
}

function parseEKFSOCValue(raw) {
  const v = Number(raw)
  if (!isFinite(v)) return String(raw)
  return (v / 10).toFixed(1) + '%'
}

function parseEKFCovariance(raw) {
  const v = Number(raw)
  if (!isFinite(v)) return String(raw)
  return (v * 0.001).toFixed(3)
}

/**
 * 辅助函数：解析IP地址（高16位+低16位）
 */
function parseIPAddress(high16, low16) {
  const ip = ((high16 << 16) | low16) >>> 0
  const a = (ip >>> 24) & 0xff
  const b = (ip >>> 16) & 0xff
  const c = (ip >>> 8) & 0xff
  const d = ip & 0xff
  return `${a}.${b}.${c}.${d}`
}

/**
 * 辅助函数：解析PCS设备类型
 */
function parsePCSType(raw) {
  const typeMap = { 0: '无PCS', 1: '双一力pcs(RS485)', 2: '禾望PCS', 3: '科华PCS' ,4: '迈格瑞能PCS', 5: '盛宏PCS', 6: '双一力PCS(CAN)'}
  return typeMap[raw] !== undefined ? typeMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析制冷设备类型
 */
function parseCoolType(raw) {
  const typeMap = { 0: '无制冷设备', 1: '三河同飞', 2: '英维克0513', 3: '英维克70513', 4: '柯诺威1', 5: '柯诺威2', 6: '均能' }
  return typeMap[raw] !== undefined ? typeMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析除湿空调设备类型
 */
function parseDehumidType(raw) {
  const typeMap = { 0: '无除湿空调', 1: '三河同飞', 2: '英维克U3-EC', 3: 'E-J000113' }
  return typeMap[raw] !== undefined ? typeMap[raw] : `${raw}(未定义)`
}

/**
 * 辅助函数：解析I/O控制板设备类型
 * 0: 无I/O控制板, 1: 艾莫讯
 */
function parseIOControlBoardType(raw) {
  const typeMap = { 0: '无I/O控制板', 1: '艾莫讯' }
  return typeMap[raw] !== undefined ? typeMap[raw] : `${raw}(未定义)`
}

function parseMeterType(raw) {
  const typeMap = { 0: '无电表', 1: '安科瑞DTSD1352' }
  return typeMap[raw] !== undefined ? typeMap[raw] : `${raw}(未定义)`
}

function parseFireDeviceType(raw) {
  const typeMap = { 0: '无消防设备', 1: '翼捷' }
  return typeMap[raw] !== undefined ? typeMap[raw] : `${raw}(未定义)`
}

function parseTempControlMode(raw) {
  return String(raw)
}

/**
 * 事件参数映射表（参考reference项目实现方式）
 * 直接定义每个事件类型的参数解析函数，使用{label, parse}格式
 */
const EVENT_PARAM_MAPPING = {
  // 一、系统状态触发记录类型（100–115）
  100: {
    // 系统启动
    param1: { label: '/', parse: parseNull },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  101: {
    // 事件记录异常复位
    param1: {
      label: '复位原因',
      parse: (raw) =>
        raw === 1 ? '事件版本不一致复位' : raw === 2 ? '索引信息异常复位' : `未知(${raw})`
    },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  102: {
    // 事件记录溢出清除
    param1: { label: '清除事件数量', parse: (raw) => raw },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  103: {
    // 存储器第一次使用参数复位
    param1: { label: '/', parse: parseNull },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  104: {
    // 堆系统状态切换
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次系统状态', parse: (raw) => `上一次:${parseSysStatus(raw)}` },
    param3: { label: '当前系统状态', parse: (raw) => `当前:${parseSysStatus(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  105: {
    // 远方就地场景切换
    param1: { label: '上一次场景', parse: (raw) => `上一次:${parseRemoteLocalScene(raw)}` },
    param2: { label: '当前场景', parse: (raw) => `当前:${parseRemoteLocalScene(raw)}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  106: {
    // SD卡插卡状态
    param1: { label: '上一次插卡状态', parse: (raw) => `上一次:${parseCardStatus(raw)}` },
    param2: { label: '当前插卡状态', parse: (raw) => `当前:${parseCardStatus(raw)}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  107: {
    // SD卡挂载状态
    param1: { label: '上一次挂载状态', parse: (raw) => `上一次:${parseMountStatus(raw)}` },
    param2: { label: '当前挂载状态', parse: (raw) => `当前:${parseMountStatus(raw)}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  108: {
    // SD卡写入状态变化
    param1: { label: '上一次写入状态', parse: (raw) => `上一次:${parseWriteStatus(raw)}` },
    param2: { label: '当前写入状态', parse: (raw) => `当前:${parseWriteStatus(raw)}` },
    param3: { label: '写失败原因', parse: parseWriteFailReason },
    param4: { label: '/', parse: parseNull }
  },
  109: {
    // BCU复位
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  110: {
    // BAU下电
    param1: { label: '/', parse: parseNull },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  111: {
    // BCU通讯状态变化
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '上一次通讯状态', parse: (raw) => `上一次:${parseCommStatus(raw)}` },
    param4: { label: '当前通讯状态', parse: (raw) => `当前:${parseCommStatus(raw)}` }
  },
  112: {
    // EMS通讯状态变化
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次通讯状态', parse: (raw) => `上一次:${parseCommStatus(raw)}` },
    param3: { label: '当前通讯状态', parse: (raw) => `当前:${parseCommStatus(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  113: {
    // PCS通讯状态变化 - 同112
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次通讯状态', parse: (raw) => `上一次:${parseCommStatus(raw)}` },
    param3: { label: '当前通讯状态', parse: (raw) => `当前:${parseCommStatus(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  114: {
    // 水冷机通讯状态变化 - 同112
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次通讯状态', parse: (raw) => `上一次:${parseCommStatus(raw)}` },
    param3: { label: '当前通讯状态', parse: (raw) => `当前:${parseCommStatus(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  115: {
    // I/O模块通讯状态变化 - 同112
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次通讯状态', parse: (raw) => `上一次:${parseCommStatus(raw)}` },
    param3: { label: '当前通讯状态', parse: (raw) => `当前:${parseCommStatus(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  116: {
    // 电表通讯状态变化 - 同112
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次通讯状态', parse: (raw) => `上一次:${parseCommStatus(raw)}` },
    param3: { label: '当前通讯状态', parse: (raw) => `当前:${parseCommStatus(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  117: {
    // 消防设备通讯状态变化 - 同112
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次通讯状态', parse: (raw) => `上一次:${parseCommStatus(raw)}` },
    param3: { label: '当前通讯状态', parse: (raw) => `当前:${parseCommStatus(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  118: {
    // 堆总故障状态变化
    param1: { label: '堆序号', parse: parseBlockId },
    param2: {
      label: '上一次堆总故障',
      parse: (raw) => {
        const map = { 0: '无故障', 1: '轻微故障', 2: '一般故障', 3: '严重故障' }
        return `上一次:${map[raw] !== undefined ? map[raw] : `${raw}(未定义)`}`
      }
    },
    param3: {
      label: '当前堆总故障',
      parse: (raw) => {
        const map = { 0: '无故障', 1: '轻微故障', 2: '一般故障', 3: '严重故障' }
        return `当前:${map[raw] !== undefined ? map[raw] : `${raw}(未定义)`}`
      }
    },
    param4: { label: '/', parse: parseNull }
  },

  // 二、下设控制触发记录类型（200–270）
  200: {
    // 下设接触器执行策略
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '执行策略', parse: parseContactorAction },
    param4: { label: '/', parse: parseNull }
  },
  201: {
    // 下设接触器独立执行
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '位域', parse: parseContactorIndependent },
    param4: { label: '/', parse: parseNull }
  },
  202: {
    // 下设绝缘电阻检测指令
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parseInsulationDetect },
    param4: { label: '/', parse: parseNull }
  },
  203: {
    // 设置系统运行模式
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '设置模式', parse: parseModeSetting },
    param4: { label: '/', parse: parseNull }
  },
  204: {
    // 掉线检测功能使能
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parseOfflineDetectEnable },
    param4: { label: '/', parse: parseNull }
  },
  205: {
    // 强制消除BCU故障
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '清除动作', parse: parseFaultClearAction },
    param4: { label: '/', parse: parseNull }
  },
  206: {
    // 控制参数复位
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '位标志', parse: parseResetControlParams },
    param4: { label: '/', parse: parseNull }
  },
  207: {
    // 设置清除BCU事件记录数量
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '删除动作', parse: parseBCUEventDeleteCount },
    param4: { label: '/', parse: parseNull }
  },
  208: {
    // 复位BCU事件记录存储器
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '复位动作', parse: parseResetAction },
    param4: { label: '/', parse: parseNull }
  },
  209: {
    // 接触器控制
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '控制位域', parse: parseContactorControl },
    param4: { label: '/', parse: parseNull }
  },
  210: {
    // 高低边控制
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '控制位域', parse: parseHLSideControl },
    param4: { label: '/', parse: parseNull }
  },
  211: {
    // 其他IO控制
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '控制位域', parse: parseDIDOControl },
    param4: { label: '/', parse: parseNull }
  },
  212: {
    // 强制OCV
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parseResetAction },
    param4: { label: '/', parse: parseNull }
  },
  213: {
    // 复位BCU
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parseResetAction },
    param4: { label: '/', parse: parseNull }
  },
  214: {
    // SOH权重校准
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parseResetAction },
    param4: { label: '/', parse: parseNull }
  },
  215: {
    // SOH强制校准
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parseResetAction },
    param4: { label: '/', parse: parseNull }
  },
  216: {
    // 上电SOH存储标志位复位
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parseResetAction },
    param4: { label: '/', parse: parseNull }
  },
  217: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parsePassword },
    param4: { label: '/', parse: parseNull }
  },
  218: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parsePassword },
    param4: { label: '/', parse: parseNull }
  },
  219: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '设定值', parse: parseEKFSOCValue },
    param4: { label: '/', parse: parseNull }
  },
  220: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '设定值', parse: parseEKFCovariance },
    param4: { label: '/', parse: parseNull }
  },
  221: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '动作', parse: parsePassword },
    param4: { label: '/', parse: parseNull }
  },
  250: {
    // 下设堆接触器执行策略
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '执行策略', parse: parseContactorAction },
    param4: {
      label: '脱离原因',
      parse: (raw, baseConfig) => {
        // 只有当参数3=3（设置脱离母线）时才解析参数4
        const param3Value = Number(baseConfig?.Param3)
        if (param3Value === 3) {
          return parseDisconnectReason(raw)
        }
        return '/' // 其他情况返回空
      }
    }
  },
  251: {
    // 清除所有簇保留故障
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '清除动作', parse: parseFaultClearAction },
    param4: { label: '/', parse: parseNull }
  },
  252: {
    // 下设堆参数复位
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '位标志', parse: parseStackResetParams },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  253: {
    // 下设周期性绝缘检测指令
    param1: { label: '堆序号', parse: parseBlockId },
    param2: {
      label: '上一次周期性绝缘检测指令',
      parse: (raw) => `上一次:${parsePeriodicInsulationDetect(raw)}`
    },
    param3: {
      label: '当前周期性绝缘检测指令',
      parse: (raw) => `当前:${parsePeriodicInsulationDetect(raw)}`
    },
    param4: { label: '/', parse: parseNull }
  },
  254: {
    // 下设接触器自检指令
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${parseContactorSelfTest(raw)}` },
    param3: { label: '当前', parse: (raw) => `当前:${parseContactorSelfTest(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  255: {
    // 下设复位BAU
    param1: { label: '/', parse: parseNull },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  256: {
    // 手动启动/停止SD卡记录
    param1: {
      label: '动作',
      parse: (raw) =>
        raw === 1 ? '手动停止SD卡记录' : raw === 2 ? '手动重新开始SD卡记录' : `未知(${raw})`
    },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  257: {
    // 下设堆SOC
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次SOC', parse: (raw) => `上一次SOC值:${raw}` },
    param3: { label: '设置SOC', parse: (raw) => `设置SOC值:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  258: {
    // 下设簇SOC
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '上一次SOC', parse: (raw) => `上一次SOC值:${raw}` },
    param4: { label: '设置SOC', parse: (raw) => `设置SOC值:${raw}` }
  },
  259: {
    // BAU固件升级
    param1: { label: 'BAU升级类型', parse: parseBAUFirmwareUpgradeType },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  260: {
    // BCU固件升级
    param1: {
      label: '簇选中状态1',
      parse: (raw) => {
        const numValue = Number(raw)
        // 确保值在有效范围内（0-1023）
        if (numValue < 0 || numValue > 1023) {
          return String(raw)
        }
        // 转换为10位二进制字符串，前面补0，再反转，让左侧代表第一簇
        return numValue.toString(2).padStart(10, '0').split('').reverse().join('')
      }
    },
    param2: {
      label: '簇选中状态2',
      parse: (raw) => {
        const numValue = Number(raw)
        // 确保值在有效范围内（0-1023）
        if (numValue < 0 || numValue > 1023) {
          return String(raw)
        }
        // 转换为10位二进制字符串，前面补0，再反转，让左侧代表第一簇
        return numValue.toString(2).padStart(10, '0').split('').reverse().join('')
      }
    },
    param3: { label: 'BCU升级类型', parse: parseBCUFirmwareUpgradeType },
    param4: { label: '/', parse: parseNull }
  },
  261: {
    // BMU固件升级
    param1: {
      label: '簇选中状态1',
      parse: (raw) => {
        const numValue = Number(raw)
        // 确保值在有效范围内（0-1023）
        if (numValue < 0 || numValue > 1023) {
          return String(raw)
        }
        // 转换为10位二进制字符串，前面补0，再反转，让左侧代表第一簇
        return numValue.toString(2).padStart(10, '0').split('').reverse().join('')
      }
    },
    param2: {
      label: '簇选中状态2',
      parse: (raw) => {
        const numValue = Number(raw)
        // 确保值在有效范围内（0-1023）
        if (numValue < 0 || numValue > 1023) {
          return String(raw)
        }
        // 转换为10位二进制字符串，前面补0，再反转，让左侧代表第一簇
        return numValue.toString(2).padStart(10, '0').split('').reverse().join('')
      }
    },
    param3: { label: 'BMU升级类型', parse: (raw) => raw },
    param4: {
      label: '起始地址/数量',
      parse: (raw) => {
        const startAddr = (raw >> 8) & 0xff
        const count = raw & 0xff
        return `起始地址:${startAddr}, 数量:${count}`
      }
    }
  },
  262: {
    // BCU地址自适应
    param1: { label: '起始地址', parse: (raw) => raw },
    param2: { label: '分配数量', parse: (raw) => raw },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  263: {
    // BMU地址自适应
    param1: { label: '簇序号', parse: parseClusterId },
    param2: { label: '起始地址', parse: (raw) => raw },
    param3: { label: '分配数量', parse: (raw) => raw },
    param4: { label: '/', parse: parseNull }
  },
  264: {
    // 设置BAU时间
    param1: {
      label: '设置时间',
      parse: (raw, record) => {
        const year = raw
        const p2 = Number(record.Param2 || 0)
        const month = (p2 >> 8) & 0xff
        const day = p2 & 0xff
        const hour = Number(record.Param3 || 0)
        const p4 = Number(record.Param4 || 0)
        const minute = (p4 >> 8) & 0xff
        const second = p4 & 0xff
        return `${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
      }
    },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  265: {
    // 重置BAU网卡
    param1: { label: '网卡序号', parse: parseNetworkCard },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  266: {
    // 清除堆保留故障
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '保留故障类型', parse: parseReservedFaultClearAction },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  267: {
    // 设置BAU清除事件记录数量
    param1: { label: '删除设定', parse: parseBCUEventDeleteCount },
    param2: { label: '实际删除数量', parse: (raw) => raw },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  268: {
    // 复位BAU事件记录存储器
    param1: { label: '复位动作', parse: parseResetAction },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  269: {
    // 下设BCP控制
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: 'BCP控制', parse: parseBCPControl },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  270: {
    // 堆绝缘检测控制
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '控制动作', parse: parseStackInsulationControl },
    param4: { label: '/', parse: parseNull }
  },
  271: {
    // 堆接触器自检控制
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '控制动作', parse: parseStackContactorSelfTestControl },
    param4: { label: '/', parse: parseNull }
  },
  272: {
    param1: { label: '/', parse: parseNull },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  273: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '上一次SOC', parse: (raw) => `上一次SOC值:${raw}` },
    param4: { label: '设置SOC', parse: (raw) => `设置SOC值:${raw}` }
  },
  274: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: { label: '上一次SOC', parse: (raw) => `上一次SOC值:${raw}` },
    param4: { label: '设置SOC', parse: (raw) => `设置SOC值:${raw}` }
  },
  275: {
    param1: { label: '动作', parse: parseConfigDefaultParamResetAction },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  276: {
    param1: { label: '动作', parse: parseConfigDefaultParamResetAction },
    param2: { label: '/', parse: parseNull },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },

  // 三、参数下设事件记录类型（300–305）
  300: {
    // 系统基本参数下设
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: {
      label: '起始地址',
      parse: (raw) => `寄存器起始地址:${'0x' + raw.toString(16).toUpperCase()}`
    },
    param4: { label: '寄存器长度', parse: (raw) => `寄存器数量:${raw}` }
  },
  301: {
    // 报警参数下设
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: {
      label: '起始地址',
      parse: (raw) => `寄存器起始地址:${'0x' + raw.toString(16).toUpperCase()}`
    },
    param4: { label: '寄存器长度', parse: (raw) => `寄存器数量:${raw}` }
  },
  302: {
    // 实时保存数据下设
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: {
      label: '起始地址',
      parse: (raw) => `寄存器起始地址:${'0x' + raw.toString(16).toUpperCase()}`
    },
    param4: { label: '寄存器长度', parse: (raw) => `寄存器数量:${raw}` }
  },
  303: {
    // SOX算法配置参数下设
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: {
      label: '起始地址',
      parse: (raw) => `寄存器起始地址:${'0x' + raw.toString(16).toUpperCase()}`
    },
    param4: { label: '寄存器长度', parse: (raw) => `寄存器数量:${raw}` }
  },
  304: {
    // SOP配置参数下设
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: {
      label: '起始地址',
      parse: (raw) => `寄存器起始地址:${'0x' + raw.toString(16).toUpperCase()}`
    },
    param4: { label: '寄存器长度', parse: (raw) => `寄存器数量:${raw}` }
  },
  305: {
    // 出厂校正参数下设
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '簇序号', parse: parseClusterId },
    param3: {
      label: '起始地址',
      parse: (raw) => `寄存器起始地址:${'0x' + raw.toString(16).toUpperCase()}`
    },
    param4: { label: '寄存器长度', parse: (raw) => `寄存器数量:${raw}` }
  },

  // 四、配置与系统参数变化类（350–397）
  350: {
    // 分簇控制标志位
    param1: { label: '上一次分簇标志', parse: (raw) => `上一次:${parseClusterControlFlag(raw)}` },
    param2: { label: '当前分簇标志', parse: (raw) => `当前:${parseClusterControlFlag(raw)}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  351: {
    // EMS通讯故障断接触器使能
    param1: { label: '上一次', parse: (raw) => `上一次:${parseEnableStatus(raw)}` },
    param2: { label: '当前', parse: (raw) => `当前:${parseEnableStatus(raw)}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  352: {
    // 运维模式
    param1: { label: '上一次', parse: (raw) => `上一次:${parseOperMode(raw)}` },
    param2: { label: '当前', parse: (raw) => `当前:${parseOperMode(raw)}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  353: {
    // 内测模式
    param1: { label: '上一次内测模式', parse: (raw) => `上一次:${raw}` },
    param2: { label: '当前内测模式', parse: (raw) => `当前:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  354: {
    // 实时数据记录周期
    param1: { label: '上一次周期', parse: (raw) => `上一次:${raw}` },
    param2: { label: '当前周期', parse: (raw) => `当前:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  355: {
    // 当前配置堆数
    param1: { label: '上一次堆数', parse: (raw) => `上一次:${raw}` },
    param2: { label: '当前堆数', parse: (raw) => `当前:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  356: {
    // 当前配置簇数
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次簇数', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前簇数', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  357: {
    // BMU总数配置
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次参数', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前参数', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  358: {
    // BMU下AFE数量配置
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次参数', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前参数', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  359: {
    // AFE下电压数量配置
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: 'AFE编号', parse: parseAFEId },
    param3: { label: '上一次参数', parse: (raw) => `上一次:${raw}` },
    param4: { label: '当前参数', parse: (raw) => `当前:${raw}` }
  },
  360: {
    // AFE下温感数量配置
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: 'AFE编号', parse: parseAFEId },
    param3: { label: '上一次参数', parse: (raw) => `上一次:${raw}` },
    param4: { label: '当前参数', parse: (raw) => `当前:${raw}` }
  },
  361: {
    // 虚拟电池1配置
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: 'BMU编号', parse: parseBMUId },
    param3: { label: '上一次参数', parse: (raw) => `上一次:${raw}` },
    param4: { label: '当前参数', parse: (raw) => `当前:${raw}` }
  },
  362: {
    // 虚拟电池2配置
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: 'BMU编号', parse: parseBMUId },
    param3: { label: '上一次参数', parse: (raw) => `上一次:${raw}` },
    param4: { label: '当前参数', parse: (raw) => `当前:${raw}` }
  },
  363: {
    // 网卡1 IP地址变化
    param1: {
      label: '上次IP',
      parse: (high16, baseConfig) => `上一次IP:${toIPv4From16(high16, Number(baseConfig.Param2))}`
    },
    param2: { label: '/', parse: parseNull },
    param3: {
      label: '当前IP',
      parse: (high16, baseConfig) => `当前IP:${toIPv4From16(high16, Number(baseConfig.Param4))}`
    },
    param4: { label: '/', parse: parseNull }
  },
  364: {
    // 网卡2 IP地址变化
    param1: {
      label: '上次IP',
      parse: (high16, baseConfig) => `上一次IP:${toIPv4From16(high16, Number(baseConfig.Param2))}`
    },
    param2: { label: '/', parse: parseNull },
    param3: {
      label: '当前IP',
      parse: (high16, baseConfig) => `当前IP:${toIPv4From16(high16, Number(baseConfig.Param4))}`
    },
    param4: { label: '/', parse: parseNull }
  },
  365: {
    // MQTT配置参数变化
    param1: {
      label: '上次服务器地址',
      parse: (high16, baseConfig) =>
        `上次服务器地址:${toIPv4From16(high16, Number(baseConfig.Param2))}`
    },
    param2: { label: '/', parse: parseNull },
    param3: {
      label: '当前服务器地址',
      parse: (high16, baseConfig) =>
        `当前服务器地址:${toIPv4From16(high16, Number(baseConfig.Param4))}`
    },
    param4: { label: '/', parse: parseNull }
  },
  366: {
    // MQTT服务器PORT参数变化
    param1: { label: '上一次端口', parse: (raw) => `上一次:${raw}` },
    param2: { label: '当前端口', parse: (raw) => `当前:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  367: {
    // 网卡1速度
    param1: { label: '上一次速度', parse: (raw) => `上一次:${parseNetworkSpeed(raw)}` },
    param2: { label: '当前速度', parse: (raw) => `当前:${parseNetworkSpeed(raw)}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  368: {
    // 网卡2速度
    param1: { label: '上一次速度', parse: (raw) => `上一次:${parseNetworkSpeed(raw)}` },
    param2: { label: '当前速度', parse: (raw) => `当前:${parseNetworkSpeed(raw)}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  369: {
    // PCS设备类型
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次类型', parse: (raw) => `上一次:${parsePCSType(raw)}` },
    param3: { label: '当前类型', parse: (raw) => `当前:${parsePCSType(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  370: {
    // PCS设备数量
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次数量', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前数量', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  371: {
    // 制冷设备类型
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次类型', parse: (raw) => `上一次:${parseCoolType(raw)}` },
    param3: { label: '当前类型', parse: (raw) => `当前:${parseCoolType(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  372: {
    // 制冷设备数量
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次数量', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前数量', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  373: {
    // 除湿空调设备类型
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次类型', parse: (raw) => `上一次:${parseDehumidType(raw)}` },
    param3: { label: '当前类型', parse: (raw) => `当前:${parseDehumidType(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  374: {
    // 除湿空调设备数量
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次数量', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前数量', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  375: {
    // I/O控制板设备类型
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次类型', parse: (raw) => `上一次:${parseIOControlBoardType(raw)}` },
    param3: { label: '当前类型', parse: (raw) => `当前:${parseIOControlBoardType(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  376: {
    // I/O控制板设备数量
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次数量', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前数量', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  377: {
    // I/O控制板设备IP基地址
    param1: {
      label: '上一次IP基地址',
      parse: (high16, baseConfig) =>
        `上一次IP基地址:${toIPv4From16(high16, Number(baseConfig.Param2))}`
    },
    param2: { label: '/', parse: parseNull },
    param3: {
      label: '当前IP基地址',
      parse: (high16, baseConfig) =>
        `当前IP基地址:${toIPv4From16(high16, Number(baseConfig.Param4))}`
    },
    param4: { label: '/', parse: parseNull }
  },
  378: {
    // I/O控制板设备网卡位置
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次位置', parse: (raw) => `上一次:${parseNetworkCard(raw)}` },
    param3: { label: '当前位置', parse: (raw) => `当前:${parseNetworkCard(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  379: {
    // 最小并簇数
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次最小并簇数', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前最小并簇数', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  380: {
    // 使能簇配置
    param1: { label: '堆序号', parse: parseBlockId },
    param2: {
      label: '使能簇配置1',
      parse: (raw) => {
        const numValue = Number(raw)
        if (numValue < 0 || numValue > 1023) {
          return `使能簇配置1:${raw}`
        }
        const bits = numValue.toString(2).padStart(10, '0')
        return `使能簇配置1:${bits.split('').reverse().join('')}`
      }
    },
    param3: {
      label: '使能簇配置2',
      parse: (raw) => {
        const numValue = Number(raw)
        if (numValue < 0 || numValue > 1023) {
          return `使能簇配置2:${raw}`
        }
        const bits = numValue.toString(2).padStart(10, '0')
        return `使能簇配置2:${bits.split('').reverse().join('')}`
      }
    },
    param4: { label: '/', parse: parseNull }
  },
  381: {
    // 开路下堆电压为0使能
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次状态', parse: (raw) => `上一次:${parseEnableStatus(raw)}` },
    param3: { label: '当前状态', parse: (raw) => `当前:${parseEnableStatus(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  382: {
    // 是否存在BCP控制
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次配置', parse: (raw) => `上一次:${parseEnableStatus(raw)}` },
    param3: { label: '当前配置', parse: (raw) => `当前:${parseEnableStatus(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  383: {
    // 簇电压差值-严重报警值
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次配置', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前配置', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  384: {
    // 簇电压差值-严重报警滤波时间
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次配置', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前配置', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  385: {
    // 簇电压差值-严重报警恢复值
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次配置', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前配置', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  386: {
    // 簇电压差值-严重报警恢复滤波时间
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次配置', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前配置', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  387: {
    // 簇电流差值-严重报警值
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次配置', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前配置', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  388: {
    // 簇电流差值-严重报警滤波时间
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次配置', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前配置', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  389: {
    // 簇电流差值-严重报警恢复值
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次配置', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前配置', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  390: {
    // 簇电流差值-严重报警恢复滤波时间
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次配置', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前配置', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  391: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  392: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  393: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  394: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  395: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  396: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  397: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  398: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  399: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  400: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  401: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  402: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  403: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  404: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  405: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  406: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  407: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  408: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  409: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  410: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  411: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  412: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  413: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  414: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  415: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  416: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  417: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  418: {
    param1: { label: '上一次配置参数', parse: (raw) => `上一次配置参数:${raw}` },
    param2: { label: '当前配置参数', parse: (raw) => `当前配置参数:${raw}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  419: {
    param1: { label: '上一次使能状态', parse: (raw) => `上一次使能状态:${parseEnableStatus(raw)}` },
    param2: { label: '当前使能状态', parse: (raw) => `当前使能状态:${parseEnableStatus(raw)}` },
    param3: { label: '/', parse: parseNull },
    param4: { label: '/', parse: parseNull }
  },
  420: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次电表类型', parse: (raw) => `上一次:${parseMeterType(raw)}` },
    param3: { label: '当前电表类型', parse: (raw) => `当前:${parseMeterType(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  421: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次电表数量', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前电表数量', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  422: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次消防设备类型', parse: (raw) => `上一次:${parseFireDeviceType(raw)}` },
    param3: { label: '当前消防设备类型', parse: (raw) => `当前:${parseFireDeviceType(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  423: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次消防设备数量', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前消防设备数量', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  424: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次控温模式', parse: (raw) => `上一次:${parseTempControlMode(raw)}` },
    param3: { label: '当前控温模式', parse: (raw) => `当前:${parseTempControlMode(raw)}` },
    param4: { label: '/', parse: parseNull }
  },
  425: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  426: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  427: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  428: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  429: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  430: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  431: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  432: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  433: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  434: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  435: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  436: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  437: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  438: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  439: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  440: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  441: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  442: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  443: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  444: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  445: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  446: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  447: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  448: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  449: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  450: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  451: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  452: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  453: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  454: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  455: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  456: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  457: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  458: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  459: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  },
  460: {
    param1: { label: '堆序号', parse: parseBlockId },
    param2: { label: '上一次', parse: (raw) => `上一次:${raw}` },
    param3: { label: '当前', parse: (raw) => `当前:${raw}` },
    param4: { label: '/', parse: parseNull }
  }
}

/**
 * 格式化事件参数（参考reference项目实现方式）
 * @param {number} eventType - 事件类型
 * @param {number} paramIndex - 参数索引（1-4）
 * @param {number} paramValue - 参数值
 * @param {Object} baseConfig - 完整的baseConfig对象（用于获取其他参数）
 * @returns {string} 格式化后的参数文本
 */
function formatEventParam(eventType, paramIndex, paramValue, baseConfig) {
  // 空值占位：统一使用"/"代替空值
  if (paramValue === undefined || paramValue === null || paramValue === '') {
    return '/'
  }

  const value = Number(paramValue)

  // 获取事件参数映射
  const eventMapping = EVENT_PARAM_MAPPING[eventType]
  if (!eventMapping) {
    // 如果没有定义，返回原始值
    return String(value)
  }

  // 根据参数索引获取对应的参数定义（param1, param2, param3, param4）
  const paramKey = `param${paramIndex}`
  const paramDef = eventMapping[paramKey]
  if (!paramDef) {
    // 如果参数没有定义，返回原始值
    return String(value)
  }

  // 直接调用parse函数，确保返回字符串
  try {
    // 检查parse函数是否需要baseConfig参数（通过函数参数长度判断）
    const result =
      paramDef.parse.length > 1 ? paramDef.parse(value, baseConfig) : paramDef.parse(value)
    return typeof result === 'string' ? result : String(result)
  } catch (error) {
    console.warn(
      `[formatEventParam] parse函数执行错误: eventType=${eventType}, paramIndex=${paramIndex}, value=${value}, error=${error.message}`
    )
    return String(value)
  }
}

/**
 * 格式化状态字段
 * @param {string} fieldKey - 字段key
 * @param {number} value - 字段值
 * @returns {string} 格式化后的文本
 */
function formatStatusField(fieldKey, value) {
  if (value === undefined || value === null) {
    return '/' // 与 formatEventRecordField 的空值处理保持一致
  }

  const numValue = Number(value)

  switch (fieldKey) {
    case 'StackRunStatus': // 堆运行状态
      return parseSysStatus(numValue)

    case 'StackChargeDischargeStatus': // 堆允充允放状态
      const chargeDischargeMap = { 0: '可充可放', 1: '可充禁放', 2: '可放禁充', 3: '禁充禁放' }
      return chargeDischargeMap[numValue] !== undefined
        ? chargeDischargeMap[numValue]
        : `${numValue}(未定义)`

    case 'RemoteLocalScene': // 远方就地场景
      return parseRemoteLocalScene(numValue)

    case 'ClusterControlMode': // 分簇控制模式
      const clusterControlMap = { 0: '统一控制', 1: '分簇控制' }
      return clusterControlMap[numValue] !== undefined
        ? clusterControlMap[numValue]
        : `${numValue}(未定义)`

    case 'StackTotalFault': // 堆总故障
      const stackTotalFaultMap = { 0: '无故障', 1: '轻微故障', 2: '一般故障', 3: '严重故障' }
      return stackTotalFaultMap[numValue] !== undefined
        ? stackTotalFaultMap[numValue]
        : `${numValue}(未定义)`

    case 'EMSCommStatus': // EMS通讯状态
      const emsCommMap = { 0: '通讯正常', 1: '通讯失联' }
      return emsCommMap[numValue] !== undefined ? emsCommMap[numValue] : `${numValue}(未定义)`

    case 'PCSCommStatus': // PCS通讯状态
      const pcsCommMap = { 0: '通讯正常', 1: '通讯失联' }
      return pcsCommMap[numValue] !== undefined ? pcsCommMap[numValue] : `${numValue}(未定义)`

    case 'CoolingMachineCommStatus': // 水冷机通讯状态
      const coolingMachineCommMap = { 0: '通讯正常', 1: '通讯异常', 2: '预留', 3: '未配置' }
      const machineStatuses = []
      for (let i = 0; i < 4; i++) {
        const raw = (numValue >> (i * 2)) & 0x03
        const txt =
          coolingMachineCommMap[raw] !== undefined ? coolingMachineCommMap[raw] : `${raw}(未定义)`
        machineStatuses.push(`水冷机${i + 1}:${txt}`)
      }
      return machineStatuses.join('，')

    case 'IOModuleCommStatus': // I/O模块通讯状态
      const ioModuleCommMap = { 0: '通讯正常', 1: '通讯失联' }
      return ioModuleCommMap[numValue] !== undefined
        ? ioModuleCommMap[numValue]
        : `${numValue}(未定义)`

    case 'DehumidifierCommStatus': // 除湿机通讯状态
      const dehumidifierCommMap = { 0: '通讯正常', 1: '通讯失联' }
      return dehumidifierCommMap[numValue] !== undefined
        ? dehumidifierCommMap[numValue]
        : `${numValue}(未定义)`

    case 'SDCardStatus': // SD卡状态
      const sdCardStatusMap = { 0: 'SD卡路径不存在', 1: '写成功', 2: '写失败' }
      return sdCardStatusMap[numValue] !== undefined
        ? sdCardStatusMap[numValue]
        : `${numValue}(未定义)`

    default:
      return String(value)
  }
}

/**
 * 按bit解析故障字段
 * @param {number} registerValue - 寄存器值（u16）
 * @param {Array<string>} faultMap - bit映射数组（16个元素）
 * @returns {string} 故障文本描述，多个故障用逗号分隔，无故障返回"无故障"
 */
function parseFaultBits(registerValue, faultMap) {
  if (!faultMap || faultMap.length !== 16) {
    return String(registerValue)
  }

  const faults = []
  for (let i = 0; i < 16; i++) {
    // 检查第i位是否为1
    if ((registerValue & (1 << i)) !== 0) {
      const faultName = faultMap[i]
      // 跳过预留字段（名称包含"预留"）
      if (faultName && !faultName.includes('预留')) {
        faults.push(faultName)
      }
    }
  }

  // 如果没有故障，返回"无故障"
  return faults.length > 0 ? faults.join(',') : '无故障'
}

/**
 * 格式化事件记录字段值
 * @param {string} fieldKey - 字段key
 * @param {*} value - 字段值
 * @param {Object} baseConfig - 完整的baseConfig对象
 * @param {Object} fieldDef - 字段定义（从EVENT_RECORD_R中获取）
 * @returns {string} 格式化后的文本
 */
export function formatEventRecordField(fieldKey, value, baseConfig, fieldDef) {
  // 空值占位：统一使用"/"代替空值
  if (value === undefined || value === null || value === '') {
    return '/'
  }

  // 处理对象类型（map字段）
  if (typeof value === 'object') {
    if (value.txt !== undefined) {
      return String(value.txt)
    }
    return JSON.stringify(value)
  }

  // 事件类型字段：转换为事件名称
  if (fieldKey === 'EventType') {
    const eventType = Number(value)
    return EVENT_TYPE_MAP[eventType] !== undefined
      ? EVENT_TYPE_MAP[eventType]
      : `未知事件(${eventType})`
  }

  // 事件参数字段：根据事件类型格式化
  if (
    fieldKey === 'Param1' ||
    fieldKey === 'Param2' ||
    fieldKey === 'Param3' ||
    fieldKey === 'Param4'
  ) {
    const eventType = Number(baseConfig.EventType || 0)
    const paramIndex =
      fieldKey === 'Param1' ? 1 : fieldKey === 'Param2' ? 2 : fieldKey === 'Param3' ? 3 : 4
    return formatEventParam(eventType, paramIndex, value, baseConfig)
  }

  // 簇标志字段：按10位二进制显示（使能簇标志和退并簇标志）
  if (
    fieldKey === 'EnableClusterFlag1' ||
    fieldKey === 'EnableClusterFlag2' ||
    fieldKey === 'ExitClusterFlag1' ||
    fieldKey === 'ExitClusterFlag2'
  ) {
    const numValue = Number(value)
    // 确保值在有效范围内（0-1023）
    if (numValue < 0 || numValue > 1023) {
      return String(value)
    }
    const bits = numValue.toString(2).padStart(10, '0')
    return bits.split('').reverse().join('')
  }

  // 状态字段：使用状态映射
  if (
    fieldKey === 'StackRunStatus' ||
    fieldKey === 'StackChargeDischargeStatus' ||
    fieldKey === 'RemoteLocalScene' ||
    fieldKey === 'ClusterControlMode' ||
    fieldKey === 'StackTotalFault' ||
    fieldKey === 'EMSCommStatus' ||
    fieldKey === 'PCSCommStatus' ||
    fieldKey === 'CoolingMachineCommStatus' ||
    fieldKey === 'IOModuleCommStatus' ||
    fieldKey === 'DehumidifierCommStatus' ||
    fieldKey === 'SDCardStatus'
  ) {
    const result = formatStatusField(fieldKey, value)
    // 确保返回字符串
    return typeof result === 'string' ? result : String(result)
  }

  // 故障字段：按bit解析故障
  if (
    fieldKey.startsWith('ClusterAnalogAlarm_') ||
    fieldKey.startsWith('ClusterHardwareFault_') ||
    fieldKey.startsWith('StackHardwareFault_')
  ) {
    const faultMap = FAULT_BIT_MAPS[fieldKey]
    if (faultMap) {
      const result = parseFaultBits(Number(value), faultMap)
      // 确保返回字符串
      return typeof result === 'string' ? result : String(result)
    }
    // 如果faultMap不存在，继续执行到默认返回
  }

  // 特殊字段：SOX算法版本号和退并簇算法版本号按10进制显示
  if (fieldKey === 'SOXAlgorithmVersion' || fieldKey === 'ClusterExitMergeAlgorithmVersion') {
    const numValue = parseInt(value, 16) // value是HEX字符串，需要转为10进制
    return String(numValue)
  }

  // 十六进制字段：转换为0x格式
  if (fieldDef && (fieldDef.type === 'hex' || fieldDef.type === 'hex16')) {
    const numValue = Number(value)
    if (numValue === 0) return '--'
    const result = '0x' + numValue.toString(16).padStart(4, '0').toUpperCase()
    return typeof result === 'string' ? result : String(result)
  }

  // 带单位的字段：从fieldDef.unit读取单位并添加（scale已经在parseByTable中处理了）
  // 注意：这里只是添加单位显示，实际的scale转换已经在解析时完成
  if (fieldDef && fieldDef.unit) {
    const numValue = Number(value)

    // 如果值不是有效数字，直接返回字符串
    if (isNaN(numValue) || !isFinite(numValue)) {
      return String(value)
    }

    // 如果值已经是字符串且包含单位，直接返回
    if (
      typeof value === 'string' &&
      (value.includes('V') ||
        value.includes('A') ||
        value.includes('℃') ||
        value.includes('%') ||
        value.includes('kW') ||
        value.includes('kWh') ||
        value.includes('Ah') ||
        value.includes('kΩ'))
    ) {
      return value
    }

    // 根据scale决定是否添加小数位：
    // scale: 10 (对应0.1单位) -> 保留一位小数 (如: 30.0%)
    // scale: 1000, scale: 1 或其他 -> 不添加小数位
    if (fieldDef.scale === 10) {
      // scale为10的字段，使用toFixed(1)保留一位小数
      return numValue.toFixed(1) + fieldDef.unit
    } else {
      // 其他scale的字段，直接转换为字符串（不添加小数位）
      return String(numValue) + fieldDef.unit
    }
  }

  // 默认返回字符串（确保所有情况都返回字符串）
  const finalValue = String(value)
  // 如果最终值是'null'或'undefined'，返回"/"占位
  if (finalValue === 'null' || finalValue === 'undefined') {
    return '/'
  }
  return finalValue
}
