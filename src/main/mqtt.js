// 该文件用于在子进程中处理 MQTT 消息的订阅、解析与转发（主→渲染），并提供发布与连接管理能力
import { PACK_SUMMARY, IO_STATUS_SCHEMA, HARDWARE_FAULT_SCHEMA, FAULT_LEVEL2_SCHEMA, BROKENWIRE_SCHEMA, BALANCE_STATUS_SCHEMA
   } from './packSchemaFactory'
  import { processPackSummaryRAW ,processIoStatusRAW, processHardwareFaultRAW, processSecondFaultRAW, processThirdFaultRAW,
    processBrokenwireRAW, parseSysBaseParamRAW, processBalanceRAW, parseWriteResponse,
    parseClusterDnsParamRAW,parsePackDnsParamRAW,parseCellDnsParamRAW,
    parseRealTimeSaveRAW,parseSOXCfgParamRAW,parseSOCCfgParamRAW,parseSOHCfgParamRAW,
    createRemoteCommandParser, createQueryCommandParser, parseByTable,groupByClass, toBuf, dv, pick, g,
    parseBlockSummaryRAW, parseBlockVersionRAW, parseBlockSysAbstractRAW, processBlockIoStatusRAW,
    parseCluAnalogFaultLevelSumRAW, parseBlockAnalogFaultLevelRAW, parseBlockAnalogFaultGradeRAW,
    parseCluAnalogFaultGradeRAW, parseBlockCommonParamRAW, parseBlockTimeCfgRAW, parseBlockPortCfgRAW, parseBlockDnsParamRAW,
    parseBlockBattParamRAW, parseBlockCommDevCfgRAW, parseBlockOperateCfgRAW } from '../protocol/utils'
  import { sendToParent, flushThrottlers, cancelThrottlers } from '../protocol/ipcThrottler.js'
  import mqtt from 'mqtt'
  import { 
           BLOCK_COMMON_PARAM_R,//BAU通用参数配置
           BLOCK_BATT_PARAM_R, //系统堆电池配置参数
           BLOCK_COMM_DEV_CFG_R, //系统通讯设备配置参数
           BLOCK_OPERATE_CFG_R, //系统操作配置参数
           CELL_HEADER,//单体表头 
           SYS_ABSTRACT, //系统概要
           CLUSTER_SUMMARY, //簇端汇总
           BLOCK_SUMMARY, //堆汇总信息
          //  CLUSTER_ALARM_PARAM, //簇端报警参数
          //  PACK_ALARM_PARAM, //包端报警参数
          //  CELL_ALARM_PARAM, //单体电芯报警参数

          //  IO_STATUS, //IO相关状态
          //  HARDWARE_FAULT, 
           TOTAL_FAULT,
           FAULT_LEVEL1,
          //  FAULT_LEVEL2,
          //  FAULT_LEVEL3,
          //  FAULT_LEVEL3_TYPES,
          //  BROKENWIRE,
          //  BALANCE_STATUS,

           SYS_BASE_PARAM_R,
           CLUSTER_DNS_PARAM_R,
           PACK_DNS_PARAM_R,      // 包端告警阈值表
           CELL_DNS_PARAM_R,      // 单体告警阈值表
           BLOCK_DNS_PARAM_R,     // 堆端告警阈值表
           REAL_TIME_SAVE_R,        // SOX实时保存数据表
           SOX_CFG_PARAM_R,         // SOX算法配置参数表
           SOC_CFG_PARAM_R,         // SOC算法配置参数表
           SOH_CFG_PARAM_R,         // SOH算法配置参数表

           ERROR_CODES,
           BLOCK_HARDWARE_FAULT,    // 堆硬件故障
           BLOCK_TOTAL_FAULT,       // 堆总故障
        } from './table.js'

  const util = require('util');

  function processCellData(hex, res, tag='cell') {
    const buf  = toBuf(hex);
    const view = dv(buf);

    /*  解析表头 */
    const { baseConfig, nextOffset } = parseByTable(view, CELL_HEADER);

    // console.log(baseConfig)
    // console.log(`buf.byteLength = ${baseConfig.dataLength}, nextOffset = ${baseConfig.nextOffset}, expected total bytes = ${nextOffset + baseConfig.totalCell * 2}`);

    // 提取 & 删除 AFE-Cell/Temp 原始键
    const afeCellCounts = [], afeTempCounts = [];
    for (let i = 1; i <= 16; i++) {
      afeCellCounts.push(baseConfig[`afeCell${i}`]);
      afeTempCounts.push(baseConfig[`afeTemp${i}`]);
      delete baseConfig[`afeCell${i}`];
      delete baseConfig[`afeTemp${i}`];
    }
    Object.assign(baseConfig, { afeCellCounts, afeTempCounts });

    /*  解析 N 个寄存器 */
    const valueArr = [];
    for (let i = 0; i < baseConfig.totalCell; i++) {
      const raw = pick.u16(view, nextOffset + i * 2);
      valueArr.push((raw * res).toFixed(res < 0.01 ? 3 : 1) * 1);
    }

    /*  组装成 BMU-AFE-Cell 树 */
    const data = [];
    let idx = 0;
    for (let b = 1; b <= baseConfig.bmuTotal; b++) {
      for (let a = 1; a <= baseConfig.afePerBmu; a++) {
        const cellNum = afeCellCounts[a - 1] || 0;
        if (!cellNum) continue;
        data.push({
          bmuId  : b,
          afeId  : a,
          class: tag.toUpperCase(),
          element: Array.from({ length: cellNum }, (_, i) => ({
            label:`#${i+1}`, value: valueArr[idx + i] ?? '-'
          }))
        });
        idx += cellNum;
      }
    }

    const parsed = { baseConfig, data };
    // console.log(` 完整结构(${tag}):`, JSON.stringify(parsed, null, 2));
    return parsed;
  }

  function processTempData(hex, res) {
  const buf  = toBuf(hex);
  const view = dv(buf);
  const { baseConfig, nextOffset } = parseByTable(view, CELL_HEADER);

  // 提取 & 删除 AFE-Cell/Temp 原始键
  const afeCellCounts = [], afeTempCounts = [];
  for (let i = 1; i <= 16; i++) {
    afeCellCounts.push(baseConfig[`afeCell${i}`]);
    afeTempCounts.push(baseConfig[`afeTemp${i}`]);
    delete baseConfig[`afeCell${i}`];
    delete baseConfig[`afeTemp${i}`];
  }
  Object.assign(baseConfig, { afeCellCounts, afeTempCounts });

  // 使用 totalTemp 并加边界校验
  const totalCount = baseConfig.totalTemp;
  const remaining = view.byteLength - nextOffset;
  const maxCount = Math.floor(remaining / 2);
  const count = Math.min(totalCount, maxCount);

  const valueArr = [];
  for (let i = 0; i < count; i++) {
    const raw = pick.s16(view, nextOffset + i * 2);
    valueArr.push((raw * res).toFixed(res < 0.01 ? 3 : 1) * 1);
  }

  // 构建 BMU-AFE-Temp 树
  const data = [];
  let idx = 0;
  for (let b = 1; b <= baseConfig.bmuTotal; b++) {
    for (let a = 1; a <= baseConfig.afePerBmu; a++) {
      const tempNum = afeTempCounts[a - 1] || 0;  
      if (!tempNum) continue;
      data.push({
        bmuId : b,
        afeId : a,
        class : 'TEMP',
        element : Array.from({ length: tempNum }, (_, i) => ({
          label: `#${i+1}`, 
          value: valueArr[idx + i] ?? '-'
        }))
      });
      idx += tempNum;
    }
  }

  const parsed = { baseConfig, data };
  // console.log(`完整结构(temp):`, JSON.stringify(parsed, null, 2));
  return parsed;
}

  const processVoltageData   = hex => processCellData(hex, 0.001, 'volt'); // 电压 0.001 V
  const processTemperatureData = hex => processTempData(hex, 0.1); // 温度 0.1 ℃
  const processSocData         = hex => processCellData(hex, 0.1,   'soc');  // SOC 0.1 %
  const processSohData         = hex => processCellData(hex, 0.1,   'soh');  // SOH 0.1 %



  //遥信错误码
function withResponseCheck(fn) {
  return hex => {
    const buf = Buffer.from(hex.replace(/\s+/g, ''), 'hex');
    if (buf.byteLength === 1) {
      const code = buf.readUInt8(0);
      // ✅ 修改：保持与成功响应相同的结构
      return {
        error: true,
        baseConfig: {},     // 空的baseConfig，保持结构一致
        data: {
          code,
          message: ERROR_CODES[code] || '未知错误'
        }
      };
    }
    const res = fn(hex);
    return { error: false, ...res };
  };
}


  // 常规数据长度加data类型解析
  export function parseConfigSection(
   hex,
   table,
   defaultClass = '配置'          // 🆕 新参数
 ) {
    // 如果没有给第三个参数，就使用字符串 '配置' 作为默认分组名
    if (defaultClass === undefined) {
      defaultClass = '配置';
    }
    // console.log(` 原始数据：`, hex);

    // ---------- 把十六进制字符串转成 DataView ----------
    var buf = toBuf(hex);   // Buffer
    var view = dv(buf);     // DataView
    // console.log('实际长度: ',   buf.length);
    // console.log('parseByTable end offset =', off, 'buffer byteLength=', view.byteLength)

    // ---------- 1. 先读取 2 字节的 DataLength ----------
    var headResult = parseByTable(view, [{ key: 'DataLength', type: 'u16' }]);
    var baseConfig = headResult.baseConfig;
    var offset     = headResult.nextOffset;

    // ---------- 2. 按表定义解析正文 ----------
    var bodyResult = parseByTable(view, table, offset);
    var flat       = bodyResult.baseConfig;

    // 添加hall相关字段的打印
    // if (flat.CANHallName !== undefined) {
    //   console.log('🔥🔥🔥 [HALL_DEBUG] Hall名称 🔥🔥🔥');
    //   console.log('解析前原始数据:', hex);
    //   console.log('解析后结果:', flat.CANHallName);
    // }
    // if (flat.CANHallSW !== undefined) {
    //   console.log('🔥🔥🔥 [HALL_DEBUG] Hall软件 🔥🔥🔥');
    //   console.log('解析前原始数据:', hex);
    //   console.log('解析后结果:', flat.CANHallSW);
    // }

    const dataArr = groupByClass(table, flat)
    return {
      baseConfig,
      data: dataArr
    }
  }



  const thirdL3 = (kind) => (hex) => processThirdFaultRAW(hex, kind);

  // 具体实现 
  // 堆通用配置参数读取：从 utils 中导入解析函数，并保持与 sys_base_param_r 一致
  const processBlockCommonParamData = withResponseCheck(buf => parseBlockCommonParamRAW(buf));
  const processSysAbstractData   = hex => parseConfigSection(hex, SYS_ABSTRACT,   '系统概要');
  const processClusterSummaryData   = hex => parseConfigSection(hex, CLUSTER_SUMMARY,   '簇端概要');
  const processBlockBattParamData = hex => parseConfigSection(hex, BLOCK_BATT_PARAM_R, '电池堆配置参数(1/2)');
  const processPackSummaryData   = hex => processPackSummaryRAW(hex, PACK_SUMMARY,   'Pack端概要');
  const processIoStatusData   = hex => processIoStatusRAW(hex, IO_STATUS_SCHEMA,   'IO概要');
  const processHardwareFaultData = hex => processHardwareFaultRAW (hex, HARDWARE_FAULT_SCHEMA,  '硬件故障');
  const processTotalFaultData    = hex => parseConfigSection(hex, TOTAL_FAULT,    '总/保留故障');
  const processFaultLevel1Data   = hex => parseConfigSection(hex, FAULT_LEVEL1,   '常规一级故障');
  
  // 堆故障处理函数
  const processBlockHardwareFaultData = hex => parseConfigSection(hex, BLOCK_HARDWARE_FAULT, '堆硬件故障');
  const processBlockTotalFaultData    = hex => parseConfigSection(hex, BLOCK_TOTAL_FAULT,    '堆总故障');
  const processFaultLevel2Data   = hex => processSecondFaultRAW(hex, FAULT_LEVEL2_SCHEMA,   '常规二级故障');
  const processBrokenWireData   = hex => processBrokenwireRAW(hex, BROKENWIRE_SCHEMA,   '掉线信息');
  const processBalanceStatusData = hex => processBalanceRAW(hex, BALANCE_STATUS_SCHEMA, '均衡状态');
  const processSysBaseParamData =  withResponseCheck(buf => parseSysBaseParamRAW(buf)); 
  // const processClusterDnsParamData = withResponseCheck(hex => parseConfigSection(hex, CLUSTER_DNS_PARAM_R, '簇端告警阈值'));
  // const processPackDnsParamData = withResponseCheck(hex => parseConfigSection(hex, PACK_DNS_PARAM_R, '包端告警阈值'));
  // const processCellDnsParamData = withResponseCheck(hex => parseConfigSection(hex, CELL_DNS_PARAM_R, '单体告警阈值'));
  const processClusterDnsParamData = withResponseCheck(buf => parseClusterDnsParamRAW(buf));
  const processPackDnsParamData = withResponseCheck(buf => parsePackDnsParamRAW(buf));
  const processCellDnsParamData = withResponseCheck(buf => parseCellDnsParamRAW(buf));
  const processBlockDnsParamData = withResponseCheck(buf => parseBlockDnsParamRAW(buf));
  const processRealTimeSaveData = withResponseCheck(buf => parseRealTimeSaveRAW(buf));
  const processSOXCfgParamData = withResponseCheck(buf => parseSOXCfgParamRAW(buf));
  const processSOCCfgParamData = withResponseCheck(buf => parseSOCCfgParamRAW(buf));
  const processSOHCfgParamData = withResponseCheck(buf => parseSOHCfgParamRAW(buf));

    /* ---------- 8 种三级故障：自动带入 kind ---------- */
  const parseCellOv_L3   = thirdL3('cell_ov');
  const parseCellUv_L3   = thirdL3('cell_uv');
  const parseChgOt_L3    = thirdL3('chg_ot');
  const parseChgUt_L3    = thirdL3('chg_ut');
  const parseDsgOt_L3    = thirdL3('dsg_ot');
  const parseDsgUt_L3    = thirdL3('dsg_ut');
  const parseSocOver_L3  = thirdL3('soc_over');
  const parseSocUnder_L3 = thirdL3('soc_under');

    // 加一个可选参数 maxArr ，默认只展开前 20 项
  function logCompact(tag, obj, maxArr = 300) {
    const util = require('util');
    const opts = {
      depth: null,
      colors: true,
      // 长数组只保留前 maxArr 项，剩余显示 “… (省略××项)”
      maxArrayLength: maxArr
    };
    console.groupCollapsed(tag);
    console.dir(obj, opts);
    console.groupEnd();
  }

  function forward(channel, payload) {
    // 频道 = dataType，例如 'PACK_SUMMARY'
    process.send({ type: channel, data: payload });   // 使用 Structured-Clone 传对象 :contentReference[oaicite:0]{index=0}
  }


  //通过topic找对应的解析函数
  const TOPIC_TABLE_MAP = {
    // //遥测
    cell_volt      : processVoltageData,
    cell_temp : processTemperatureData,
    cell_soc  : processSocData,
    cell_soh  : processSohData,
    sys_abstract   :  processSysAbstractData,
    cluster_summary:  processClusterSummaryData,
    pack_summary:  processPackSummaryRAW,

    // // //遥信
    io_status:  processIoStatusRAW,
    hardware_fault:  processHardwareFaultRAW  ,
    total_fault:  processTotalFaultData,
    fault_level1:  processFaultLevel1Data,
    fault_level2:  processSecondFaultRAW,
    
    // // 堆故障
    block_hardware_fault:  processBlockHardwareFaultData,
    block_total_fault:  processBlockTotalFaultData,

    // /* --- 8 个三级故障 topic ---------------------------------- */
    cell_ov_fault_level3   : parseCellOv_L3,
    cell_uv_fault_level3   : parseCellUv_L3,
    chg_ot_fault_level3    : parseChgOt_L3,
    chg_ut_fault_level3    : parseChgUt_L3,
    dsg_ot_fault_level3    : parseDsgOt_L3,
    dsg_ut_fault_level3    : parseDsgUt_L3,
    soc_over_fault_level3  : parseSocOver_L3,
    soc_under_fault_level3 : parseSocUnder_L3,

    
    // brokenwire:  processBrokenwireRAW,
    balance_status:  processBalanceRAW,

    //遥调
    sys_base_param_r:  processSysBaseParamData,
    sys_base_param_w:  parseWriteResponse,  // 写入响应处理


    cluster_dns_param_r:  processClusterDnsParamData,
    pack_dns_param_r:  processPackDnsParamData,
    cell_dns_param_r:  processCellDnsParamData,
    cluster_dns_param_w:  parseWriteResponse,
    pack_dns_param_w:  parseWriteResponse,
    cell_dns_param_w:  parseWriteResponse,

    // 堆端报警阈值
    block_fault_dns_r: processBlockDnsParamData,
    block_fault_dns_w: parseWriteResponse,

    // 系统堆电池配置参数
    block_batt_param_r: withResponseCheck(hex => parseBlockBattParamRAW(hex)),
    block_batt_param_w: parseWriteResponse,

    // 系统通讯设备配置参数
    block_comm_dev_cfg_r: withResponseCheck(hex => parseBlockCommDevCfgRAW(hex)),
    block_comm_dev_cfg_w: parseWriteResponse,

    // 系统操作配置参数
    block_operate_cfg_r: withResponseCheck(hex => parseBlockOperateCfgRAW(hex)),
    block_operate_cfg_w: parseWriteResponse,

    // SOX参数处理器
    real_time_save_r:  processRealTimeSaveData,
    sox_cfg_param_r:  processSOXCfgParamData,
    soc_cfg_param_r:  processSOCCfgParamData,
    soh_cfg_param_r:  processSOHCfgParamData,
    real_time_save_w:  parseWriteResponse,
    sox_cfg_param_w:  parseWriteResponse,
    soc_cfg_param_w:  parseWriteResponse,
    soh_cfg_param_w:  parseWriteResponse,

    // ========== 遥控命令响应处理器 ==========
    // 接触器控制 - BAU应答
    contactor_ctrl: createRemoteCommandParser('contactor_ctrl'),
    contactor_ctrl_indep: createRemoteCommandParser('contactor_ctrl_indep'),

    // 线路检测 - BAU应答
    insulation_detect_ctrl: createRemoteCommandParser('insulation_detect_ctrl'),

    // 系统控制 - BAU应答
    sys_mode_ctrl: createRemoteCommandParser('sys_mode_ctrl'),
    brokenwire_detect_en: createRemoteCommandParser('brokenwire_detect_en'),

    // 测试模式控制 - BAU应答
    hsd_lsd_ctrl_test: createRemoteCommandParser('hsd_lsd_ctrl_test'),

    // 故障控制 - BAU应答
    force_clear_bcu_fault: createRemoteCommandParser('force_clear_bcu_fault'),

    // 数据管理 - BAU应答
    reset_record_flash: createRemoteCommandParser('reset_record_flash'),

    // 校准控制 - BAU应答
    force_ocv_calib: createRemoteCommandParser('force_ocv_calib'),
    weight_calib: createRemoteCommandParser('weight_calib'),
    force_soh_calib: createRemoteCommandParser('force_soh_calib'),

    // 参数复位控制 - BAU应答
    restore_ctrl_param: createRemoteCommandParser('restore_ctrl_param'),

    // 反馈查询应答处理器 - BAU应答
    get_contactor_ctrl_result: createQueryCommandParser('get_contactor_ctrl_result'),
    get_insulation_detect_result: createQueryCommandParser('get_insulation_detect_result'),


    // 堆汇总信息
    block_summary: parseBlockSummaryRAW,
    // 堆版本信息
    block_ver: parseBlockVersionRAW,
    // 堆系统概要信息
    block_sys_abstract: parseBlockSysAbstractRAW,
    // 堆IO状态
    block_io_status: processBlockIoStatusRAW,

    // 簇模拟量故障三级汇总
    clu_analog_fault_level_sum: parseCluAnalogFaultLevelSumRAW,
    // 堆模拟量故障三级汇总
    block_analog_fault_level: parseBlockAnalogFaultLevelRAW,

    // 堆模拟量故障等级
    block_analog_fault_grade: parseBlockAnalogFaultGradeRAW,

    // 簇模拟量故障等级
    clu_analog_fault_grade: parseCluAnalogFaultGradeRAW,

    // 堆系统基本配置参数
    block_common_param_r: processBlockCommonParamData,
    block_common_param_w: parseWriteResponse,

    // 堆时间设置
    block_time_cfg_r:  withResponseCheck(hex => parseBlockTimeCfgRAW(hex)),
    block_time_cfg_w:  parseWriteResponse,

    // 堆系统端口配置参数
    block_port_cfg_r:  withResponseCheck(hex => parseBlockPortCfgRAW(hex)),
    block_port_cfg_w:  parseWriteResponse,

        // ========== 堆模式遥控命令响应处理 ==========
    // 电池堆控制开关 - BAU应答
    batt_stack_ctrl_switch: createRemoteCommandParser('batt_stack_ctrl_switch'),
    // 强制消除电池堆保留故障 - BAU应答
    force_clear_save_fault: createRemoteCommandParser('force_clear_save_fault'),
    // 控制参数复位 - BAU应答
    reset_block_param: createRemoteCommandParser('reset_block_param'),
    // 周期性绝缘电阻检测 - BAU应答
    period_ins_detect_en: createRemoteCommandParser('period_ins_detect_en'),
    // 堆模式反馈查询应答处理器 - BAU应答
    get_batt_stack_ctrl_switch_result: createQueryCommandParser('get_batt_stack_ctrl_switch_result'),

  }


  // 动态MQTT连接管理
  let client = null
  let currentConfig = null
  let isConnected = false

  // 动态连接函数
  function connectMqtt(config) {
    // console.log('[MQTT Child]  connectMqtt 函数开始执行')
    return new Promise((resolve, reject) => {
      try {
        // 如果已有连接，先断开
        if (client) {
          console.log('[MQTT Child] 断开现有连接...')
          client.end(true)
          client.removeAllListeners()
        }

        currentConfig = config
        const mqttUrl = `mqtt://${config.host}:${config.port}`
        
        // console.log(`[MQTT Child]  尝试连接到 ${mqttUrl}，客户端ID: ${config.clientId}`)
        
        client = mqtt.connect(mqttUrl, {
          username: config.username,
          password: config.password,
          clientId: config.clientId,
          keepalive: config.keepalive || 60,
          connectTimeout: 10000, // 10秒连接超时
          reconnectPeriod: 0 // 禁用自动重连，由前端控制
        })
        
        console.log('[MQTT Child]  MQTT客户端已创建，等待连接事件...')

        // 连接成功事件
        client.on('connect', () => {
          isConnected = true
          console.log(`[MQTT Child]  连接成功，客户端ID: ${config.clientId}`)
          
          // 订阅主题
          if (config.subscribeTopics && config.subscribeTopics.length > 0) {
            console.log(`[MQTT Child]  开始订阅 ${config.subscribeTopics.length} 个主题...`)
            config.subscribeTopics.forEach(topic => {
              client.subscribe(topic, (err) => {
                if (err) {
                  console.error(`[MQTT Child]  订阅主题失败: ${topic}`, err)
                } else {
                  console.log(`[MQTT Child]  订阅主题成功: ${topic}`)
                }
              })
            })
          }
          
          // 设置消息处理器
          setupMessageHandler()
          
          // 通知主进程连接成功
          process.send({ type: 'mqtt-connected', data: { clientId: config.clientId, host: config.host } })
          resolve(true)
        })

        // 连接错误事件
        client.on('error', (error) => {
          console.error('[MQTT Child]  连接错误:', error)
          isConnected = false
          process.send({ type: 'mqtt-error', data: { error: error.message } })
          reject(error)
        })

        // 连接超时处理
        setTimeout(() => {
          if (!isConnected) {
            console.error('[MQTT Child]  连接超时 (10秒)')
            if (client) {
              client.end(true)
              client.removeAllListeners()
            }
            reject(new Error('连接超时'))
          }
        }, 10000)

        // 连接关闭事件
        client.on('close', () => {
          if (isConnected) {
            isConnected = false
            console.log('[MQTT Child]  连接已关闭')
            process.send({ type: 'mqtt-disconnected', data: {} })
          }
        })

        // 离线事件
        client.on('offline', () => {
          console.log('[MQTT Child]  离线')
          process.send({ type: 'mqtt-offline', data: {} })
        })

      } catch (error) {
        console.error('[MQTT Child]  连接异常:', error)
        reject(error)
      }
    })
  }

  // 断开连接函数
  function disconnectMqtt() {
    return new Promise((resolve) => {
      if (client) {
        client.end(true, () => {
          client.removeAllListeners()
          client = null
          isConnected = false
          currentConfig = null
          console.log('[MQTT] 已断开连接')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  // 测试连接函数
  function testMqttConnection(config) {
    return new Promise((resolve) => {
      const testClient = mqtt.connect(`mqtt://${config.host}:${config.port}`, {
        username: config.username,
        password: config.password,
        clientId: config.clientId + '_test',
        keepalive: config.keepalive || 60,
        connectTimeout: 5000 // 5秒超时
      })

      const timeout = setTimeout(() => {
        testClient.end(true)
        resolve({ success: false, error: '连接超时' })
      }, 5000)

      testClient.on('connect', () => {
        clearTimeout(timeout)
        testClient.end(true)
        resolve({ success: true })
      })

      testClient.on('error', (error) => {
        clearTimeout(timeout)
        testClient.end(true)
        resolve({ success: false, error: error.message })
      })
    })
  }

  // 将原有的client.on('message')包装成函数，添加连接状态检查
  function setupMessageHandler() {
    if (!client) return
    
    client.on('message', (topic, payload) => {
      // 只有在连接状态下才处理消息
      if (!isConnected || !client) {
        return
      }
      
    const parts = topic.split('/')
    const suffix    = parts.at(-1)               // cell_volt / sys_abstract / …
    const blockId   = Number(parts[3].slice(1))  // b1 -> 1
    
    // 堆级数据没有簇号，簇级数据有簇号
    let clusterId = 0  // 默认值
    if (parts.length > 4 && parts[4].startsWith('c')) {
      clusterId = Number(parts[4].slice(1))  // c1 -> 1
    }
    
    const tRecv = performance.now(); //收到时间戳
    const dataType = suffix.toUpperCase();          
    const buf      = payload;
    const len      = buf.length;
    const hex      = buf.toString('hex');


     /*  读取 / 遥测 / 遥信：按 TOPIC_TABLE_MAP 常规解析 —— */
    const parseFun  = TOPIC_TABLE_MAP[suffix]
    if (!parseFun) {
      // console.warn(`[SKIP] 未注册解析表: ${suffix}`);
      return;                                        
    }                      


  let result;
  try {
    result = parseFun(hex)        // 只需传 hex
    // console.log(result)
  } catch (err) {
    console.error(
      `[PARSE_ERR] ${dataType} len=${len} topic=${topic}\n` +
      `hex=${hex.slice(0, 40)}...`,      // 打印前 20 Byte 
      err                                // 堆栈
    )
    // console.log(hex);
    return                               
  }

  const tParsed = performance.now(); 
  const { baseConfig, data } = result    

    const msg = {
      blockId, 
      clusterId,
      dataType: suffix.toUpperCase(),//转大写
      topic, 
      baseConfig, 
      data,
      tRecv,
      tParsed 
    }

    sendToParent(msg)
    // logCompact('[发送给主进程]', msg)   // 单进程调试输出
        if (result.error) {
          logCompact('[遥信 失败响应]', msg);
        }
      }) 
    } 

    /* --- 接收主进程指令 --- */
    process.on('message', (message) => {
      const { cmd, topic, payloadHex, config } = message
      
      // console.log('[MQTT Child]  收到主进程指令:', cmd)
      
      if (cmd === 'MQTT_CONNECT') {
        console.log('[MQTT Child]  开始处理连接请求...')
        // 连接MQTT服务器
        connectMqtt(config).then(success => {
          console.log('[MQTT Child]  连接完成，结果:', success)
          process.send({ type: 'mqtt-connect-result', data: { success } })
        }).catch(error => {
          console.error('[MQTT Child]  连接失败:', error)
          process.send({ type: 'mqtt-connect-result', data: { success: false, error: error.message } })
        })
        return
      }
      
      if (cmd === 'MQTT_DISCONNECT') {
        // 断开MQTT连接
        disconnectMqtt().then(() => {
          process.send({ type: 'mqtt-disconnect-result', data: { success: true } })
        })
        return
      }
      
      if (cmd === 'MQTT_TEST_CONNECTION') {
        // 测试MQTT连接
        testMqttConnection(config).then(result => {
          process.send({ type: 'mqtt-test-result', data: result })
        })
        return
      }
      
      // 原有的MQTT发布指令处理
      if (cmd === 'MQTT_PUBLISH') {
      // ① 把十六进制字符串转回 Buffer
      // const buf = Buffer.from(payloadHex, 'hex');
      
      console.log('[Child] publish MQTT', topic, payloadHex)
      // ② 真正发到 MQTT Broker
      // client.publish(topic, buf, (err) => {
      //   if (err) {
      //     process.send({ type:'mqtt-error', err: err.message });
      //   }
      // });
      const payloadBuf = Buffer.from(payloadHex, 'hex')
      client.publish(topic, payloadBuf)
    }
  });

  process.once('SIGINT',  cleanUp);
  process.once('exit',    cleanUp);
  process.once('SIGTERM', cleanUp);

  function cleanUp(){
    flushThrottlers   // lodash API，可立即发送队列中最后一帧:contentReference[oaicite:3]{index=3}
    cancelThrottlers(); 
    client.end(true);          // true = 强制清空离线队列
    client.removeAllListeners();
    process.removeAllListeners('message');
    clearInterval(memTimer);   // 内存采样定时器
  }

    // 内存采样
  const MB = 1024*1024;
  setInterval(()=>{
    const { rss, heapUsed, heapTotal } = process.memoryUsage();
    // console.log(`[MEM] rss ${(rss/MB).toFixed(1)} MB  heap ${(heapUsed/MB).toFixed(1)}/${(heapTotal/MB).toFixed(1)} MB`);
  }, 10_000);