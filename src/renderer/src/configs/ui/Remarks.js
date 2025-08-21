// BaseParam参数备注配置 - 根据通信协议添加备注信息
export const BASE_PARAM_REMARKS = {
  // BMU配置类备注
  'BmuTotalNum': '最多支持32个BMU',
  'AfeNumInBmu': '1个BMU下最多支持16个AFE',
  'afeCell1': '单个AFE下电池数量可以为空，但BMU下总电池数不能超过128',
  // 'afeCell2': '单个AFE下电池数量可以为空，但BMU下总电池数不能超过128',
  // 'afeCell3': '单个AFE下电池数量可以为空，但BMU下总电池数不能超过128',
  // 'afeCell4': '单个AFE下电池数量可以为空，但BMU下总电池数不能超过128',
  // 'afeTemp1': '备有缓1：afe1的温度测量输入点；备有缓2：afe2的温度测量输入点；备有缓3：afe3的温度测量输入点；备有缓4：afe4的温度测量输入点',
  
  // 类型选择备注
  'EventRecordMode': '0x00 简约模式\n0x01 详细模式',
  'TestMode': '0: 关闭内测模式；1: 内测模式1（V、T）2: 内测模式2（IACP）3: 内测模式3（DO）',
  'InternalMode': '0:自动均衡\n1:手动均衡',
  'RunMode': '0x5BB5运维模式\n0x1221非运维模式（默认）',
  'PcsType': '0xFFFF：无PCS；1：星星PCS；2：双一力PCS-01；3：科华PCS',
  'CoolDeviceType': '0xFFFF：无制冷设备；1：柯诺威水冷机；2：英维克；3：埃森特交流空调',
  'DehumidifyType': '0xFFFF：无除湿机设备；1：除湿机-01',
  'FireCtrlType': '0xFFFF：无消防控制器；1：三沃力源（sanvalor）',
  
  // 基础设置备注
  // 'cellVoltFilterDiff': '0.001V',
  // 'cellVoltWeight': '0.01',
  // 'cellTempFilterDiff': '0.1℃',
  // 'cellTempWeight': '0.01',
  // 'dcPowerOffDelay': '秒',
  // 'cellRestTime': '0.1分',
  // 'contactorValue': '0.1V',
  // 'contactorDetectDelay': '秒',
  
  // 温度控制备注
  // 'coolingStartTemp': '开启时间：停止时间',
  // 'coolingStopTemp': '0/1：不允许均衡\n2/3：允许在开机下均衡\n4/5：允许\n6/7：允许、开路\n8/9：允许\n10/11：允许、开路\n12/13：允许、关路\n14/15：允许、关闭、开路',
  
  // 通信设置备注
  'can1ComRate': '0-50k；1-100k；2-125k；3-250k；4-500k；5-1M，默认：4-500k',
  'can1DataBaud': '0-无效/不支持；1-250k；2-500k；3-800k；4-1M；5-2M；6-4M；7-5M，默认：0-无效/不支持',
  'can2ComRate': '0-50k；1-100k；2-125k；3-250k；4-500k；5-1M，默认：4-500k',
  'can2DataBaud': '0-无效/不支持；1-250k；2-500k；3-800k；4-1M；5-2M；6-4M；7-5M，默认：0-无效/不支持',
  'can3ComRate': '0-50k；1-100k；2-125k；3-250k；4-500k；5-1M，默认：4-500k',
  'can3DataBaud': '0-无效/不支持；1-250k；2-500k；3-800k；4-1M；5-2M；6-4M；7-5M，默认：0-无效/不支持',
  'rs4851Baud': '0-1200；1-2400；2-4800；3-9600；4-19200；5-38400；6-57600；7-115200',
  'rs4852Baud': '0-1200；1-2400；2-4800；3-9600；4-19200；5-38400；6-57600；7-115200',
  'rs4853Baud': '0-1200；1-2400；2-4800；3-9600；4-19200；5-38400；6-57600；7-115200',
  
  // 传感器与电池备注
  'currentSensorType': '0x00：LEM-CAB500-C/SP5-012\n0x01：LEM-DHAB-5/118\n0x30：JC-JHAB-5/18\n0xC0：QY-PL2C-200A/75mV',
  // 'sensor1Range': '1A',
  // 'sensor2Range': '1A', 
  // 'sensor3Range': '1A',
  'batteryType': '1：磷酸铁锂电池；2：钛酸锂电池, 3：锰酸锂电池',
  'batteryModel': '',
  'batteryVendor': '',
  // 'ratedCapacity': '1Ah',
  // 'clusterCalibEnergy': '0.01kW',
  // 'clusterRatedEnergy': '0.01kW',
  // 'clusterRatedPower': '0.01kW',
  
  // 均衡参数备注
  'balanceStartTime': '开启时间停止时间',
  'balanceStopTime': '停止时间/n例开启时间3，停止1；实际运行均衡3停止1，周期为4S；',
  'balanceModeOption': '0/1：不允许均衡\n2/3：允许在开路状态下均衡\n4/5：放电\n6/7：放电、开路\n8/9：充电\n10/11：充电、开路\n12/13：充电、放电\n14/15：充电、放电、开路',
  'balanceVoltMax': '',
  'balanceVoltMin': '',
  'chargeBalanceK': '10:2mv；100:15mv；1000:150mv；其他值：20mv',
  'dischargeBalanceK': '同上',
  'openBalanceK': '同上',
}