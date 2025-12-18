// 该文件用于在子进程中处理 MQTT 消息的订阅、解析与转发（主→渲染），并提供发布与连接管理能力
import {
  PACK_SUMMARY,
  IO_STATUS_SCHEMA,
  /*HARDWARE_FAULT_SCHEMA,*/ FAULT_LEVEL2_SCHEMA,
  BROKENWIRE_SCHEMA,
  BALANCE_STATUS_SCHEMA
} from './packSchemaFactory'
const fs = require('fs')
const path = require('path')
import { OUT_FAULT_MAP, SAVED_FAULT_MAP, BLOCK_PCS } from './table.js'
import {
  processPackSummaryRAW,
  processIoStatusRAW,
  /*processHardwareFaultRAW,*/ processSecondFaultRAW,
  processThirdFaultRAW,
  processBrokenwireRAW,
  parseSysBaseParamRAW,
  processBalanceRAW,
  parseWriteResponse,
  parseClusterDnsParamRAW,
  parsePackDnsParamRAW,
  parseCellDnsParamRAW,
  parseRealTimeSaveRAW,
  parseSOXCfgParamRAW,
  parseSOCCfgParamRAW,
  parseSOHCfgParamRAW,
  createRemoteCommandParser,
  createQueryCommandParser,
  parseByTable,
  groupByClass,
  toBuf,
  dv,
  pick,
  parseBcuBmuUpgradeResultRAW,
  parseBauUpgradeResultRAW,
  parseBlockSummaryRAW,
  parseBlockVersionRAW,
  parseBlockSysAbstractRAW,
  processBlockIoStatusRAW,
  parseCluAnalogFaultLevelSumRAW,
  parseBlockAnalogFaultLevelRAW,
  parseBlockAnalogFaultGradeRAW,
  parseCluAnalogFaultGradeRAW,
  parseBlockCommonParamRAW,
  parseBlockTimeCfgRAW,
  parseBlockPortCfgRAW,
  parseBlockDnsParamRAW,
  parseBlockBattParamRAW,
  parseBlockCommDevCfgRAW,
  parseBlockOperateCfgRAW,
  parseBlockSocParamRAW,
  processBcuAdaptiveQueryResult,
  processBmuAdaptiveQueryResult,
  processCellVoltageRAW,
  processCellTemperatureRAW,
  processCellSocRAW,
  processCellSohRAW,
  parseFactoryCalibrationRAW,
  parseSysRunTimeRAW,
  parseEventRecordFlagRAW,
  parseEventRecordRAW
} from '../protocol/utils'
import {
  startReadingEvent,
  cancelReadingEvent,
  processEventRecordResponse,
  getEventReadingState
} from './eventRecordExport'
// 【限流优化】已注释掉限流机制，改为直接发送
// 原因：1) 速率计算已移到子进程，渲染进程负担已减轻
//       2) 限流器存在内存管理复杂度
//       3) 现代IPC通信能力足够处理高频消息
//       4) 简化架构，降低维护成本
// import { sendToParent, flushThrottlers, cancelThrottlers, setBackgroundMode } from '../protocol/ipcThrottler.js'
import mqtt from 'mqtt'
import { startSaveTimerSemantic, stopSaveTimerSemantic } from './mqttExport/bauDataExport'
// 原始报文两秒节拍写入

import {
  processCellVolt,
  processCellTemp,
  processCellSoc,
  processCellSoh,
  processClusterSummary,
  processPackSummary,
  processBlockSummary,
  processAlarmSemantic,
  processSysAbstract
} from './mqttExport/ingest'
import { logAnyMessage } from './mqttExport/mqttRawLogger'

import {
  BLOCK_COMMON_PARAM_R, //BAU通用参数配置
  BLOCK_BATT_PARAM_R, //系统堆电池配置参数
  BLOCK_COMM_DEV_CFG_R, //系统通讯设备配置参数
  BLOCK_OPERATE_CFG_R, //系统操作配置参数
  CELL_HEADER, //单体表头
  SYS_ABSTRACT, //系统概要
  CLUSTER_SUMMARY, //簇端汇总
  BLOCK_SUMMARY, //堆汇总信息
  //  CLUSTER_ALARM_PARAM, //簇端报警参数
  //  PACK_ALARM_PARAM, //包端报警参数
  //  CELL_ALARM_PARAM, //单体电芯报警参数

  //  IO_STATUS, //IO相关状态
  //协议修改删除 - HARDWARE_FAULT不再使用
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
  PACK_DNS_PARAM_R, // 包端告警阈值表
  CELL_DNS_PARAM_R, // 单体告警阈值表
  BLOCK_DNS_PARAM_R, // 堆端告警阈值表
  REAL_TIME_SAVE_R, // SOX实时保存数据表
  SOX_CFG_PARAM_R, // SOX算法配置参数表
  SOC_CFG_PARAM_R, // SOC算法配置参数表
  SOH_CFG_PARAM_R, // SOH算法配置参数表
  FACTORY_CALIB_PARAM_R, // 出厂校正参数表 //协议修改新增
  EVENT_RECORD_FLAG_R, // 事件记录标志位表
  EVENT_RECORD_R, // 事件记录数据表
  ERROR_CODES,
  BLOCK_HARDWARE_FAULT, // 堆硬件故障
  BLOCK_TOTAL_FAULT, // 堆总故障
  BLOCK_COMM_LOST, // 簇通讯失联
  DI_DO_TEMP_STATUS, // 协议修改新增 - DI/DO/温度状态
  EN_CLUSTER_HARDWARE_SUM
} from './table.js'

const util = require('util')

// 健康检查相关变量
let lastHeartbeatSent = 0
let lastMessageReceived = 0
let healthCheckTimer = null
let connectionQuality = 'good' // good, poor, bad
let parseErrorCount = 0

// 【数据速率统计】子进程内部计算
let dataRateAccumulator = 0 // 当前秒累计的原始MQTT数据量（字节）
let currentDataRate = 0 // 当前显示的数据速率 KB/s
let dataRateTimer = null // 速率计算定时器

// ========== 事件记录导出状态管理 ==========
let isReadingEvent = false // 是否正在读取事件记录
// 进度更新批次大小（用于事件记录进度更新）
const PROGRESS_BATCH = 100

/**
 * 重置健康检查相关数据
 *
 * 功能说明：
 * 在每次新的连接尝试前，清空所有旧的健康检查数据，
 * 避免使用历史数据导致的时间计算错误
 */
function resetHealthCheckData() {
  lastHeartbeatSent = 0
  lastMessageReceived = 0
  connectionQuality = 'good'
  parseErrorCount = 0
  console.log('[MQTT Child] 健康检查数据已重置')
}

// 【诊断】速率计算统计
let lastRateCalculateTime = 0
let rateCalculateCallCount = 0

/**
 * 【数据速率】计算并发送速率到主进程
 *
 * 功能说明：
 * 1. 每秒执行一次，计算上一秒的速率（基于原始MQTT payload大小）
 * 2. 清零累加器，开始下一秒的统计
 * 3. 发送速率数据到主进程 → 转发到渲染进程 → 显示在UI
 */
function calculateAndSendDataRate() {
  const now = Date.now()
  rateCalculateCallCount++

  // 【诊断】计算实际时间间隔
  const actualInterval = lastRateCalculateTime ? now - lastRateCalculateTime : 1000
  lastRateCalculateTime = now

  // 计算上一秒的速率 (字节/秒 → KB/s)
  // 【修复精度丢失】使用toFixed(2)保留2位小数，避免小流量被四舍五入为0
  // 例如：0.05 KB/s 会显示为 "0.05" 而不是 "0.0"
  const rateKBps = parseFloat((dataRateAccumulator / 1024).toFixed(2))
  currentDataRate = rateKBps

  // 【诊断】检测异常情况并记录详细日志
  // 阈值说明：
  // - 速率>90: 正常40-60KB/s，90是1.5倍余量（检测监听器重复注册）
  // - 间隔>1500ms: 定时器应该1000ms，允许500ms波动
  // - 间隔<700ms: 定时器不应该提前超过300ms
  const isAbnormal = rateKBps > 100 || actualInterval > 1500 || actualInterval < 700
  if (isAbnormal) {
    console.warn(`[MQTT Child] ⚠️ 速率异常检测:`)
    console.warn(`  - 计算速率: ${rateKBps} KB/s ${rateKBps > 100 ? '(异常高)' : '(正常)'}`)
    console.warn(
      `  - 实际间隔: ${actualInterval}ms ${actualInterval > 1500 || actualInterval < 700 ? '(异常)' : '(正常)'}`
    )
    console.warn(`  - 累积字节: ${dataRateAccumulator} bytes`)
    console.warn(`  - 调用次数: ${rateCalculateCallCount}`)
    console.warn(`  - 监听器数: ${messageHandlerRegisteredCount}`)

    // 【关键诊断】如果监听器注册次数>1，说明有重复注册
    if (messageHandlerRegisteredCount > 1) {
      console.error(
        `[MQTT Child] 🚨 发现重复注册！监听器数=${messageHandlerRegisteredCount}，这会导致速率翻倍！`
      )
    }
  }

  // 发送速率数据到主进程
  process.send({
    type: 'data-rate-update',
    data: {
      rate: currentDataRate,
      timestamp: now,
      // 【诊断】附加诊断信息
      diagnostic: isAbnormal
        ? {
            actualInterval,
            accumulatedBytes: dataRateAccumulator,
            handlerCount: messageHandlerRegisteredCount
          }
        : undefined
    }
  })

  // 清零累加器，开始下一秒的统计
  dataRateAccumulator = 0
}

/**
 * 【数据速率】启动速率计算定时器
 */
function startDataRateCalculation() {
  if (dataRateTimer) return

  // 重置状态
  dataRateAccumulator = 0
  currentDataRate = 0

  // 每秒计算一次速率并发送
  dataRateTimer = setInterval(() => {
    calculateAndSendDataRate()
  }, 1000)

  console.log('[MQTT Child] 数据速率计算已启动')
}

/**
 * 【数据速率】停止速率计算定时器
 */
function stopDataRateCalculation() {
  if (dataRateTimer) {
    clearInterval(dataRateTimer)
    dataRateTimer = null
    dataRateAccumulator = 0
    currentDataRate = 0
    console.log('[MQTT Child] 数据速率计算已停止')
  }
}

//遥信错误码
function withResponseCheck(fn) {
  return (hex) => {
    const buf = Buffer.from(hex.replace(/\s+/g, ''), 'hex')
    if (buf.byteLength === 1) {
      const code = buf.readUInt8(0)
      //  修改：保持与成功响应相同的结构
      return {
        error: true,
        baseConfig: {}, // 空的baseConfig，保持结构一致
        data: {
          code,
          message: ERROR_CODES[code] || '未知错误'
        }
      }
    }
    const res = fn(hex)
    return { error: false, ...res }
  }
}

// 常规数据长度加data类型解析
export function parseConfigSection(
  hex,
  table,
  defaultClass = '配置' // 🆕 新参数
) {
  // 如果没有给第三个参数，就使用字符串 '配置' 作为默认分组名
  if (defaultClass === undefined) {
    defaultClass = '配置'
  }

  // ---------- 把十六进制字符串转成 DataView ----------
  var buf = toBuf(hex) // Buffer
  var view = dv(buf) // DataView

  // ---------- 1. 先读取 2 字节的 DataLength ----------
  var headResult = parseByTable(view, [{ key: 'DataLength', type: 'u16' }])
  var baseConfig = headResult.baseConfig
  var offset = headResult.nextOffset

  // ---------- 2. 按表定义解析正文 ----------
  var bodyResult = parseByTable(view, table, offset)
  var flat = bodyResult.baseConfig

  const dataArr = groupByClass(table, flat)
  return {
    baseConfig,
    data: dataArr
  }
}

const thirdL3 = (kind) => (hex) => processThirdFaultRAW(hex, kind)

const processBlockCommonParamData = withResponseCheck((buf) => parseBlockCommonParamRAW(buf))
const processSysAbstractData = (hex) => parseConfigSection(hex, SYS_ABSTRACT, '系统概要')
const processClusterSummaryData = (hex) => parseConfigSection(hex, CLUSTER_SUMMARY, '簇端概要')
const processBlockBattParamData = (hex) =>
  parseConfigSection(hex, BLOCK_BATT_PARAM_R, '电池堆配置参数(1/2)')
const processPackSummaryData = (hex) => processPackSummaryRAW(hex, PACK_SUMMARY, 'Pack端概要')
const processIoStatusData = (hex) => processIoStatusRAW(hex, IO_STATUS_SCHEMA, 'IO概要')
//协议修改删除 - 硬件故障不再使用，改为接触器详细故障等新结构
// const processHardwareFaultData = hex => processHardwareFaultRAW (hex, HARDWARE_FAULT_SCHEMA,  '硬件故障');
const processTotalFaultData = (hex) => parseConfigSection(hex, TOTAL_FAULT, '总/保留故障')
const processFaultLevel1Data = (hex) => parseConfigSection(hex, FAULT_LEVEL1, '常规一级故障')
//协议修改新增 - DI/DO/温度状态处理函数
const processDIDoTempStatusData = (hex) =>
  parseConfigSection(hex, DI_DO_TEMP_STATUS, 'DI/DO/温度状态')
//协议修改新增 - 故障map处理函数
const processOutFaultMapData = (hex) => parseConfigSection(hex, OUT_FAULT_MAP, '输出的故障map')

const processSavedFaultMapData = (hex) => parseConfigSection(hex, SAVED_FAULT_MAP, '保留故障map')
const processEnClusterHardwareSumData = (hex) =>
  parseConfigSection(hex, EN_CLUSTER_HARDWARE_SUM, '使能簇硬件故障汇总')

// 堆故障处理函数
const processBlockHardwareFaultData = (hex) =>
  parseConfigSection(hex, BLOCK_HARDWARE_FAULT, '堆硬件故障')
const processBlockTotalFaultData = (hex) => parseConfigSection(hex, BLOCK_TOTAL_FAULT, '堆总故障')
// 簇通讯失联处理函数
const processBlockCommLostData = (hex) => parseConfigSection(hex, BLOCK_COMM_LOST, '簇通讯失联')
const processFaultLevel2Data = (hex) =>
  processSecondFaultRAW(hex, FAULT_LEVEL2_SCHEMA, '常规二级故障')
const processBrokenWireData = (hex) => processBrokenwireRAW(hex, BROKENWIRE_SCHEMA, '掉线信息')
const processBalanceStatusData = (hex) => processBalanceRAW(hex, BALANCE_STATUS_SCHEMA, '均衡状态')
const processSysBaseParamData = withResponseCheck((buf) => parseSysBaseParamRAW(buf))
const processSysRunTimeData = withResponseCheck((hex) => parseSysRunTimeRAW(hex))
// const processClusterDnsParamData = withResponseCheck(hex => parseConfigSection(hex, CLUSTER_DNS_PARAM_R, '簇端告警阈值'));
// const processPackDnsParamData = withResponseCheck(hex => parseConfigSection(hex, PACK_DNS_PARAM_R, '包端告警阈值'));
// const processCellDnsParamData = withResponseCheck(hex => parseConfigSection(hex, CELL_DNS_PARAM_R, '单体告警阈值'));
const processClusterDnsParamData = withResponseCheck((buf) => parseClusterDnsParamRAW(buf))
const processPackDnsParamData = withResponseCheck((buf) => parsePackDnsParamRAW(buf))
const processCellDnsParamData = withResponseCheck((buf) => parseCellDnsParamRAW(buf))
const processBlockDnsParamData = withResponseCheck((buf) => parseBlockDnsParamRAW(buf))
const processRealTimeSaveData = withResponseCheck((buf) => parseRealTimeSaveRAW(buf))
const processSOXCfgParamData = withResponseCheck((buf) => parseSOXCfgParamRAW(buf))
const processSOCCfgParamData = withResponseCheck((buf) => parseSOCCfgParamRAW(buf))
const processSOHCfgParamData = withResponseCheck((buf) => parseSOHCfgParamRAW(buf))
const processFactoryCalibParamData = withResponseCheck((buf) =>
  parseFactoryCalibrationRAW(buf.toString('hex'))
) //协议修改新增
const processEventRecordFlagData = withResponseCheck((hex) => parseEventRecordFlagRAW(hex))
const processEventRecordData = withResponseCheck((hex) => parseEventRecordRAW(hex))

// PCS数据处理函数 - 只解析原始数据，不使用字段表
const processBlockPcsData = (hex) => {
  const buf = toBuf(hex)
  const view = dv(buf)

  if (buf.length < 206) {
    // 103个uint16 = 206字节
    console.warn('[processBlockPcsData] 数据长度不足:', buf.length)
    return { baseConfig: {}, data: [] }
  }

  // 解析103个原始uint16数据
  const rawData = []
  for (let i = 0; i < 103; i++) {
    rawData.push(view.getUint16(i * 2, true)) // 小端序
  }

  return {
    baseConfig: {
      dataLength: rawData[0],
      pcsAddress: rawData[1],
      commStatus: rawData[2]
    },
    data: rawData
  }
}

// 制冷设备数据处理函数 - 只解析原始数据，不使用字段表
const processBlockRefData = (hex) => {
  const buf = toBuf(hex)
  const view = dv(buf)

  if (buf.length < 206) {
    // 103个uint16 = 206字节
    console.warn('[processBlockRefData] 数据长度不足:', buf.length)
    return { baseConfig: {}, data: [] }
  }

  // 解析103个原始uint16数据
  const rawData = []
  for (let i = 0; i < 103; i++) {
    rawData.push(view.getUint16(i * 2, true)) // 小端序
  }

  return {
    baseConfig: {
      dataLength: rawData[0],
      refAddress: rawData[1],
      commStatus: rawData[2]
    },
    data: rawData
  }
}

// 除湿空调数据处理函数 - 只解析原始数据，不使用字段表
const processBlockDehData = (hex) => {
  const buf = toBuf(hex)
  const view = dv(buf)
  if (buf.length < 206) {
    console.warn('[processBlockDehData] 数据长度不足:', buf.length)
    return { baseConfig: {}, data: [] }
  }
  const rawData = []
  for (let i = 0; i < 103; i++) {
    rawData.push(view.getUint16(i * 2, true))
  }
  return {
    baseConfig: {
      dataLength: rawData[0],
      dehAddress: rawData[1],
      commStatus: rawData[2]
    },
    data: rawData
  }
}

/* ---------- 8 种三级故障：自动带入 kind ---------- */
const parseCellOv_L3 = thirdL3('cell_ov')
const parseCellUv_L3 = thirdL3('cell_uv')
const parseChgOt_L3 = thirdL3('chg_ot')
const parseChgUt_L3 = thirdL3('chg_ut')
const parseDsgOt_L3 = thirdL3('dsg_ot')
const parseDsgUt_L3 = thirdL3('dsg_ut')
const parseSocOver_L3 = thirdL3('soc_over')
const parseSocUnder_L3 = thirdL3('soc_under')

// 加一个可选参数 maxArr ，默认只展开前 20 项
function logCompact(tag, obj, maxArr = 300) {
  const util = require('util')
  const opts = {
    depth: null,
    colors: true,
    // 长数组只保留前 maxArr 项，剩余显示 “… (省略××项)”
    maxArrayLength: maxArr
  }
  console.groupCollapsed(tag)
  console.dir(obj, opts)
  console.groupEnd()
}

//通过topic找对应的解析函数
const TOPIC_TABLE_MAP = {
  // //遥测 - 使用utils.js中的标准化解析函数
  cell_volt: processCellVoltageRAW,
  cell_temp: processCellTemperatureRAW,
  cell_soc: processCellSocRAW,
  cell_soh: processCellSohRAW,
  sys_abstract: processSysAbstractData,
  cluster_summary: processClusterSummaryData,
  pack_summary: processPackSummaryRAW,

  // // //遥信
  io_status: processIoStatusRAW,
  //协议修改删除 - hardware_fault不再使用
  // hardware_fault:  processHardwareFaultRAW  ,
  total_fault: processTotalFaultData,
  //协议修改新增 - DI/DO/温度状态
  di_do_temp_status: processDIDoTempStatusData,
  //协议修改新增 - 故障map
  output_fault_map: processOutFaultMapData,
  saved_fault_map: processSavedFaultMapData,
  en_cluster_hardware_sum: processEnClusterHardwareSumData,
  fault_level1: processFaultLevel1Data,
  fault_level2: processSecondFaultRAW,

  // // 堆故障
  block_hardware_fault: processBlockHardwareFaultData,
  block_total_fault: processBlockTotalFaultData,

  // /* --- 8 个三级故障 topic ---------------------------------- */
  cell_ov_fault_level3: parseCellOv_L3,
  cell_uv_fault_level3: parseCellUv_L3,
  chg_ot_fault_level3: parseChgOt_L3,
  chg_ut_fault_level3: parseChgUt_L3,
  dsg_ot_fault_level3: parseDsgOt_L3,
  dsg_ut_fault_level3: parseDsgUt_L3,
  soc_over_fault_level3: parseSocOver_L3,
  soc_under_fault_level3: parseSocUnder_L3,

  brokenwire: processBrokenwireRAW,
  balance_status: processBalanceRAW,

  //遥调
  sys_base_param_r: processSysBaseParamData,
  sys_base_param_w: parseWriteResponse, // 写入响应处理

  cluster_dns_param_r: processClusterDnsParamData,
  pack_dns_param_r: processPackDnsParamData,
  cell_dns_param_r: processCellDnsParamData,
  cluster_dns_param_w: parseWriteResponse,
  pack_dns_param_w: parseWriteResponse,
  cell_dns_param_w: parseWriteResponse,

  // 堆端报警阈值
  block_fault_dns_r: processBlockDnsParamData,
  block_fault_dns_w: parseWriteResponse,

  // 系统堆电池配置参数
  block_batt_param_r: withResponseCheck((hex) => parseBlockBattParamRAW(hex)),
  block_batt_param_w: parseWriteResponse,

  // 系统通讯设备配置参数
  block_comm_dev_cfg_r: withResponseCheck((hex) => parseBlockCommDevCfgRAW(hex)),
  block_comm_dev_cfg_w: parseWriteResponse,

  // 系统操作配置参数
  block_operate_cfg_r: withResponseCheck((hex) => parseBlockOperateCfgRAW(hex)),
  block_operate_cfg_w: parseWriteResponse,

  // 系统堆SOC配置参数
  block_soc_param_r: withResponseCheck((hex) => parseBlockSocParamRAW(hex)),
  block_soc_param_w: parseWriteResponse,

  // 堆PCS数据
  block_pcs: processBlockPcsData,

  // 堆制冷设备数据
  block_ref: processBlockRefData,

  // 堆除湿空调数据
  block_deh: processBlockDehData,

  // SOX参数处理器
  real_time_save_r: processRealTimeSaveData,
  sox_cfg_param_r: processSOXCfgParamData,
  soc_cfg_param_r: processSOCCfgParamData,
  soh_cfg_param_r: processSOHCfgParamData,
  factory_calib_param_r: processFactoryCalibParamData, //协议修改新增
  real_time_save_w: parseWriteResponse,
  sox_cfg_param_w: parseWriteResponse,
  soc_cfg_param_w: parseWriteResponse,
  soh_cfg_param_w: parseWriteResponse,
  factory_calib_param_w: parseWriteResponse, //协议修改新增

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
  contactor_ctrl_test: createRemoteCommandParser('contactor_ctrl_test'),
  hsd_lsd_ctrl_test: createRemoteCommandParser('hsd_lsd_ctrl_test'),
  io_ctrl_test: createRemoteCommandParser('io_ctrl_test'),

  // 故障控制 - BAU应答
  force_clear_bcu_fault: createRemoteCommandParser('force_clear_bcu_fault'),

  // 数据管理 - BAU应答
  reset_record_flash: createRemoteCommandParser('reset_record_flash'),

  // 校准控制 - BAU应答
  force_ocv_calib: createRemoteCommandParser('force_ocv_calib'),
  weight_calib: createRemoteCommandParser('weight_calib'),
  force_soh_calib: createRemoteCommandParser('force_soh_calib'),
  soh_nvm_flag_reset: createRemoteCommandParser('soh_nvm_flag_reset'),

  // 参数复位控制 - BAU应答
  restore_ctrl_param: createRemoteCommandParser('restore_ctrl_param'),

  // 反馈查询应答处理器 - BAU应答
  get_contactor_ctrl_result: createQueryCommandParser('get_contactor_ctrl_result'),
  get_insulation_detect_result: createQueryCommandParser('get_insulation_detect_result'),
  get_sys_run_mode: createQueryCommandParser('get_sys_run_mode'),
  get_bcu_bmu_upgrade_result: parseBcuBmuUpgradeResultRAW,
  get_bau_upgrade_result: parseBauUpgradeResultRAW,

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
  block_time_cfg_r: withResponseCheck((hex) => parseBlockTimeCfgRAW(hex)),
  block_time_cfg_w: parseWriteResponse,

  // 系统时间记录
  sys_run_time_r: processSysRunTimeData,

  // 事件记录标志位
  event_record_flag_r: processEventRecordFlagData,

  // 事件记录数据
  event_record_r: processEventRecordData,

  // 堆系统端口配置参数
  block_port_cfg_r: withResponseCheck((hex) => parseBlockPortCfgRAW(hex)),
  block_port_cfg_w: parseWriteResponse,

  // ========== 堆模式遥控命令响应处理 ==========
  // 电池堆控制开关 - BAU应答
  batt_stack_ctrl_switch: createRemoteCommandParser('batt_stack_ctrl_switch'),
  // 强制消除电池堆保留故障 - BAU应答
  force_clear_save_fault: createRemoteCommandParser('force_clear_save_fault'),
  // 控制参数复位 - BAU应答
  reset_block_param: createRemoteCommandParser('reset_block_param'),
  // 周期性绝缘电阻检测 - BAU应答
  period_ins_detect_en: createRemoteCommandParser('period_ins_detect_en'),
  // 下设接触器自检指令 - BAU应答
  contactor_selftest_en: createRemoteCommandParser('contactor_selftest_en'),
  // 下设重启BAU指令 - BAU应答
  reset_bau: createRemoteCommandParser('reset_bau'),
  // 下设手动控制SD卡记录 - BAU应答
  manual_ctrl_sd_record: createRemoteCommandParser('manual_ctrl_sd_record'),
  // 下设堆SOC - BAU应答
  set_block_soc: createRemoteCommandParser('set_block_soc'),
  // 堆模式反馈查询应答处理器 - BAU应答
  get_batt_stack_ctrl_switch_result: createQueryCommandParser('get_batt_stack_ctrl_switch_result'),
  // 升级应答处理器 - BAU应答
  upgrade: createRemoteCommandParser('upgrade'),

  // BCU地址自适应查询结果
  get_bcu_adaptive_addr_result: processBcuAdaptiveQueryResult,
  // BMU地址自适应查询结果
  get_bmu_adaptive_addr_result: processBmuAdaptiveQueryResult,

  // 簇通讯失联信息
  block_comm_lost: processBlockCommLostData,

  // BCU地址自适应 - BAU应答
  bcu_adaptive_addr: createRemoteCommandParser('bcu_adaptive_addr'),

  // BMU地址自适应 - BAU应答
  bmu_adaptive_addr: createRemoteCommandParser('bmu_adaptive_addr'),

  // 删除事件记录 - BAU应答
  clear_event_record_num: createRemoteCommandParser('clear_event_record_num')
}

// 动态MQTT连接管理
let client = null
let currentConfig = null
let isConnected = false
let isConnecting = false // 新增：连接中标志，防止重复连接
let isBackgroundMode = false // 后台模式标识
let semanticExportEnabled = false
let rawExportEnabled = false

// 动态连接函数
function connectMqtt(config) {
  // console.log('[MQTT Child]  connectMqtt 函数开始执行')
  return new Promise((resolve, reject) => {
    try {
      // 【关键1】如果正在连接中，拒绝新的连接请求
      if (isConnecting) {
        console.warn('[MQTT Child] ⚠️ 已有连接正在进行中，忽略重复请求')
        reject(new Error('连接正在进行中'))
        return
      }

      // 【关键2】如果mqtt.js正在自动重连，拒绝手动连接请求
      if (client && client.reconnecting) {
        console.warn('[MQTT Child] ⚠️ MQTT正在自动重连中，忽略手动连接请求')
        reject(new Error('正在自动重连中'))
        return
      }

      // 标记为连接中
      isConnecting = true

      // 如果已有连接，先断开（只在真正需要重新配置时）
      if (client) {
        console.log('[MQTT Child] 断开现有连接以重新配置...')
        try {
          client.removeAllListeners()
          client.end(true)
        } catch (e) {
          console.error('[MQTT Child] 断开连接时出错:', e.message)
        }
        client = null
      }

      // 停止旧的健康检查并重置所有健康数据
      stopHealthCheck()
      resetHealthCheckData()

      currentConfig = config
      const mqttUrl = `mqtt://${config.host}:${config.port}`

      // console.log(`[MQTT Child]  尝试连接到 ${mqttUrl}，客户端ID: ${config.clientId}`)

      client = mqtt.connect(mqttUrl, {
        username: config.username,
        password: config.password,
        clientId: config.clientId,
        keepalive: config.keepalive || 30,
        connectTimeout: 10000, // 10秒连接超时
        reconnectPeriod: 5000, // 5秒重连间隔，启用自动重连
        clean: false // 保持会话持久化，确保设备重连后消息路由正常
      })

      console.log('[MQTT Child]  MQTT客户端已创建，等待连接事件...')

      // 【关键3】立即注册error监听器，防止任何error事件导致进程崩溃
      // 这个监听器会一直存在，即使重连也不会被移除
      client.on('error', (error) => {
        console.log('[MQTT Child] MQTT错误（将自动重连）:', error.message)
        isConnected = false
        // 不reject Promise，让mqtt.js的reconnectPeriod机制自动处理重连
        // 通知主进程连接错误
        process.send({
          type: 'mqtt-connect-error',
          data: { error: error.message }
        })
      })

      // 连接成功事件
      client.on('connect', () => {
        isConnected = true
        isConnecting = false // 【关键】连接成功，清除连接中标志
        console.log(`[MQTT Child]  连接成功，客户端ID: ${config.clientId}`)

        // 订阅主题
        if (config.subscribeTopics && config.subscribeTopics.length > 0) {
          console.log(`[MQTT Child]  开始订阅 ${config.subscribeTopics.length} 个主题...`)
          config.subscribeTopics.forEach((topic) => {
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

        if (semanticExportEnabled) {
          startSaveTimerSemantic()
        }

        // 启动健康检查
        startHealthCheck()

        // 【数据速率】启动速率计算
        startDataRateCalculation()

        // 通知主进程连接成功
        process.send({
          type: 'mqtt-connected',
          data: { clientId: config.clientId, host: config.host, port: config.port }
        })
        resolve(true)
      })

      // 连接关闭事件
      client.on('close', () => {
        if (isConnected) {
          isConnected = false
          console.log('[MQTT Child]  连接已关闭')
          // 停止健康检查 - 连接断开后不再发送心跳
          stopHealthCheck()
          // 【数据速率】停止速率计算
          stopDataRateCalculation()
          stopSaveTimerSemantic()
          process.send({ type: 'mqtt-disconnected', data: {} })
        }
      })

      // 离线事件
      client.on('offline', () => {
        console.log('[MQTT Child]  离线')
        isConnected = false
        // 离线时停止健康检查，等待重连成功后再启动
        stopHealthCheck()
        // 【数据速率】停止速率计算
        stopDataRateCalculation()
        stopSaveTimerSemantic()
        process.send({ type: 'mqtt-offline', data: {} })
      })

      // 重连事件
      client.on('reconnect', () => {
        console.log('[MQTT Child]  正在自动重连...')
        // 重连时重置健康检查数据，准备新的连接
        resetHealthCheckData()
        process.send({ type: 'mqtt-reconnecting', data: {} })
      })
    } catch (error) {
      console.error('[MQTT Child]  连接异常:', error)
      isConnecting = false // 【关键】异常时也要清除连接标志
      reject(error)
    }
  })
}

// 断开连接函数
function disconnectMqtt() {
  return new Promise((resolve) => {
    if (!client) {
      resolve()
      return
    }

    console.log('[MQTT Child] 开始断开连接...')

    // 【关键1】先停止健康检查
    stopHealthCheck()

    // 【关键2】先更新状态标志
    isConnecting = false
    isConnected = false

    // 【关键3】禁用自动重连，防止断开后继续重连
    try {
      if (client.options) {
        client.options.reconnectPeriod = 0
        console.log('[MQTT Child] 已禁用自动重连')
      }
    } catch (e) {
      console.warn('[MQTT Child] 禁用重连时出错:', e.message)
    }

    // 【关键4】在移除监听器前，先添加一个兜底的error监听器
    // 防止pending的连接尝试触发error事件时进程崩溃
    const safetyErrorHandler = (error) => {
      console.log('[MQTT Child] 断开期间的error事件（已安全处理）:', error.message)
      // 不做任何操作，只是防止崩溃
    }

    try {
      client.on('error', safetyErrorHandler)
    } catch (e) {
      console.warn('[MQTT Child] 添加兜底error监听器失败:', e.message)
    }

    // 【关键5】设置超时保护，防止callback不执行导致Promise挂起
    let resolved = false
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn('[MQTT Child] 断开连接超时，强制清理')
        resolved = true

        // 延迟清理，给pending连接一些时间完成
        setTimeout(() => {
          if (client) {
            try {
              client.removeAllListeners()
            } catch (e) {}
          }
          client = null
          currentConfig = null
        }, 1000) // 1秒后清理

        resolve()
      }
    }, 3000) // 3秒超时（增加到3秒，给更多时间）

    try {
      // 强制断开连接
      client.end(true, () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutId)

          // 延迟移除监听器，确保所有pending的error都被处理
          setTimeout(() => {
            if (client) {
              try {
                client.removeAllListeners()
              } catch (e) {
                console.warn('[MQTT Child] 移除监听器时出错:', e.message)
              }
            }
            client = null
            currentConfig = null
            console.log('[MQTT] 已完全清理连接')
          }, 500) // 500ms后清理，给pending error时间

          console.log('[MQTT] 已断开连接')
          resolve()
        }
      })
    } catch (error) {
      console.error('[MQTT Child] 断开连接时出错:', error)
      if (!resolved) {
        resolved = true
        clearTimeout(timeoutId)

        // 同样延迟清理
        setTimeout(() => {
          if (client) {
            try {
              client.removeAllListeners()
            } catch (e) {}
          }
          client = null
          currentConfig = null
        }, 500)

        resolve()
      }
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
      keepalive: config.keepalive || 30,
      connectTimeout: 5000, // 5秒超时
      clean: true // 测试连接使用clean session，避免影响正式连接
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

// 【诊断】消息处理器引用，用于防止重复注册
let messageHandlerRef = null
let messageHandlerRegisteredCount = 0 // 【诊断】监听器注册次数计数

// 将原有的client.on('message')包装成函数，添加连接状态检查
function setupMessageHandler() {
  if (!client) return

  // 【修复+诊断】移除旧的消息处理器，防止重复注册导致速率翻倍
  if (messageHandlerRef) {
    try {
      client.removeListener('message', messageHandlerRef)
      console.log('[MQTT Child] 🔧 已移除旧的消息处理器，防止重复注册')
    } catch (e) {
      console.warn('[MQTT Child] ⚠️ 移除旧处理器失败:', e.message)
    }
  }

  // 【诊断】记录监听器注册次数
  messageHandlerRegisteredCount++
  const currentCount = messageHandlerRegisteredCount
  console.log(`[MQTT Child] 📊 消息处理器注册次数: ${currentCount}`)

  // 创建新的消息处理器并保存引用
  messageHandlerRef = (topic, payload) => {
    if (!isConnected || !client) {
      return
    }

    const parts = topic.split('/')
    const suffix = parts.at(-1) // cell_volt / sys_abstract / …
    const blockId = Number(parts[3].slice(1)) // b1 -> 1

    // 堆级数据没有簇号，簇级数据有簇号
    let clusterId = 0 // 默认值
    if (parts.length > 4 && parts[4].startsWith('c')) {
      clusterId = Number(parts[4].slice(1)) // c1 -> 1
    }

    const tRecv = performance.now()
    const dataType = suffix.toUpperCase()
    const buf = payload
    const len = buf.length
    const hex = buf.toString('hex')
    const direction = parts[2] || ''
    const cid = `${blockId}-${clusterId || 0}`
    try {
      if (rawExportEnabled) {
        logAnyMessage({ topic, payloadHex: hex, clientId: cid, ts: Date.now(), direction })
      }
    } catch {}

    // 【数据速率】累加原始MQTT payload大小（所有接收到的数据，不管是否被限流）
    dataRateAccumulator += len

    /*  读取 / 遥测 / 遥信：按 TOPIC_TABLE_MAP 常规解析 —— */
    const parseFun = TOPIC_TABLE_MAP[suffix]
    if (!parseFun) {
      return
    }

    let result
    try {
      result = parseFun(hex) // 只需传 hex
    } catch (err) {
      console.error(
        `[PARSE_ERR] ${dataType} len=${len} topic=${topic}\n` + `hex=${hex.slice(0, 40)}...`, // 打印前 20 Byte
        err // 堆栈
      )
      // 增加解析错误计数
      parseErrorCount++
      // console.log(hex);
      return
    }

    const tParsed = performance.now()
    const { baseConfig, data } = result

    const msg = {
      blockId,
      clusterId,
      dataType: suffix.toUpperCase(), //转大写
      topic,
      baseConfig,
      data,
      tRecv,
      tParsed
      // ⚠️ 移除 payloadSize，不再在msg中传递，速率由子进程独立计算
    }

    if (suffix === 'cell_volt') {
      processCellVolt({ topic, hex, blockId, clusterId, baseConfig, data })
    }
    if (suffix === 'cell_temp') {
      processCellTemp({ topic, hex, blockId, clusterId, baseConfig, data })
    }
    if (suffix === 'cell_soc') {
      processCellSoc({ topic, hex, blockId, clusterId, baseConfig, data })
    }
    if (suffix === 'cell_soh') {
      processCellSoh({ topic, hex, blockId, clusterId, baseConfig, data })
    }
    if (suffix === 'cluster_summary') {
      processClusterSummary({ topic, hex, blockId, clusterId, baseConfig, data })
    }
    if (suffix === 'sys_abstract') {
      processSysAbstract({ topic, hex, blockId, clusterId, baseConfig, data })
    }
    if (suffix === 'pack_summary') {
      processPackSummary({ topic, hex, blockId, clusterId, baseConfig, data })
    }
    if (suffix === 'block_summary') {
      processBlockSummary({ topic, hex, blockId, clusterId, baseConfig, data })
    }
    if (
      suffix === 'fault_level1' ||
      suffix === 'fault_level2' ||
      suffix === 'total_fault' ||
      suffix === 'en_cluster_hardware_sum' ||
      suffix === 'di_do_temp_status' ||
      suffix === 'block_hardware_fault' ||
      suffix === 'block_total_fault' ||
      suffix === 'brokenwire' ||
      // Level 3 故障补全
      suffix === 'cell_ov_fault_level3' ||
      suffix === 'cell_uv_fault_level3' ||
      suffix === 'chg_ot_fault_level3' ||
      suffix === 'chg_ut_fault_level3' ||
      suffix === 'dsg_ot_fault_level3' ||
      suffix === 'dsg_ut_fault_level3' ||
      suffix === 'soc_over_fault_level3' ||
      suffix === 'soc_under_fault_level3' ||
      // 其他故障补全
      suffix === 'block_comm_lost' ||
      suffix === 'output_fault_map' ||
      suffix === 'saved_fault_map' ||
      suffix === 'block_analog_fault_level' ||
      suffix === 'block_analog_fault_grade' ||
      suffix === 'clu_analog_fault_grade'
    ) {
      processAlarmSemantic({ topic, hex, blockId, clusterId, baseConfig, data })
    }

    // ========== 事件记录数据特殊处理 ==========
    // 如果正在读取事件记录，且这是对应的事件记录数据，则处理响应
    if (suffix === 'event_record_r') {
      const eventState = getEventReadingState()
      if (eventState.isReadingEvent && eventState.eventReadingBlockId === blockId) {
        // 构建响应数据对象（支持多条记录）
        const responseData = {
          RecordOffset: baseConfig?.RecordOffset, // 起始偏移量（第一条记录的偏移量）
          RecordCount: baseConfig?.RecordCount, // 记录数量
          records: result.records || [], // 多条记录数组
          baseConfig, // 基础配置
          data, // 第一条记录的数据
          result: result.error ? { error: true, code: data?.code, message: data?.message } : null,
          rawRegisters: result.rawRegisters, // 第一条记录的原始寄存器
          rawBuffer: result.rawBuffer // 第一条记录的原始buffer
        }

        // 调用事件记录导出模块的处理函数
        processEventRecordResponse(responseData, blockId, client)

        return // 事件记录数据已处理，不再继续常规解析流程
      }
    }

    // 【限流优化】直接发送，不再使用限流器
    // 优势：1) 架构简化，避免限流器内存管理复杂度
    //       2) 数据实时性更好，无300ms延迟
    //       3) 渲染进程负担已减轻（速率计算在子进程）
    process.send({ type: msg.dataType, data: msg })

    // 更新最后消息接收时间
    lastMessageReceived = Date.now()
    // logCompact('[发送给主进程]', msg)   // 单进程调试输出
    if (result.error && suffix !== 'event_record_r') {
      logCompact('[遥信 失败响应]', msg)
    }
  }

  // 【修复】注册新的消息处理器
  client.on('message', messageHandlerRef)
  console.log(`[MQTT Child] ✅ 已注册消息处理器 #${currentCount}`)
}

/* --- 接收主进程指令 --- */
process.on('message', (message) => {
  const { cmd, topic, payloadHex, config, type, data, isBackground } = message

  // 设置后台模式 - 已禁用，保留接口兼容性
  if (cmd === 'SET_BACKGROUND_MODE') {
    // isBackgroundMode = isBackground
    // setBackgroundMode(isBackground) // 同步到限流器
    // 已禁用后台节流，不执行任何操作
    return
  }

  // 不再需要响应 HEALTH_CHECK 命令
  // 改为子进程在连接成功后主动发送心跳
  // 简化架构：子进程自主管理，不被动响应
  /* if (cmd === 'HEALTH_CHECK') {
        // 旧逻辑已移除
        return
      } */

  // console.log('[MQTT Child]  收到主进程指令:', cmd)

  if (cmd === 'MQTT_CONNECT') {
    console.log('[MQTT Child]  开始处理连接请求...')
    // 连接MQTT服务器
    connectMqtt(config)
      .then((success) => {
        console.log('[MQTT Child]  连接完成，结果:', success)
        process.send({ type: 'mqtt-connect-result', data: { success } })
      })
      .catch((error) => {
        console.error('[MQTT Child]  连接失败:', error)
        process.send({
          type: 'mqtt-connect-result',
          data: { success: false, error: error.message }
        })
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
    testMqttConnection(config).then((result) => {
      process.send({ type: 'mqtt-test-result', data: result })
    })
    return
  }

  if (cmd === 'SET_EXPORT_ENABLE') {
    const prevSemantic = semanticExportEnabled
    semanticExportEnabled = !!message.semantic
    rawExportEnabled = !!message.raw
    if (semanticExportEnabled && !prevSemantic) {
      startSaveTimerSemantic()
    }
    if (!semanticExportEnabled && prevSemantic) {
      stopSaveTimerSemantic()
    }
    return
  }

  // ========== 事件记录导出功能 ==========
  if (cmd === 'START_READ_EVENT') {
    const { offsetRead, totalRead, blockId, exportDir } = message

    if (!client || !isConnected) {
      console.error('[MQTT Child] MQTT未连接，无法读取事件记录')
      process.send({
        type: 'readEventError',
        data: {
          blockId,
          error: 'MQTT未连接'
        }
      })
      return
    }

    // 开始读取（使用事件记录导出模块）
    startReadingEvent(blockId, offsetRead, totalRead, exportDir || '', client).catch((error) => {
      console.error('[MQTT Child] 事件记录读取异常:', error)
    })
    return
  }

  if (cmd === 'CANCEL_READ_EVENT') {
    const { blockId } = message
    cancelReadingEvent(blockId)
    return
  }

  // 升级功能已简化，复用现有的MQTT_PUBLISH逻辑

  // 原有的MQTT发布指令处理
  if (cmd === 'MQTT_PUBLISH') {
    // 【安全防护】检查client和连接状态，防止空指针异常
    if (!client) {
      console.warn('[MQTT Child] 发布失败：MQTT客户端未初始化')
      // 尝试发送错误消息，使用try-catch避免IPC通道关闭时的错误
      try {
        if (process.connected) {
          process.send({
            type: 'mqtt-error',
            data: { error: 'MQTT客户端未初始化，无法发布消息' }
          })
        }
      } catch (e) {
        // IPC通道可能已关闭，忽略错误
      }
      return
    }

    if (!isConnected) {
      console.warn('[MQTT Child] 发布失败：MQTT未连接')
      try {
        if (process.connected) {
          process.send({
            type: 'mqtt-error',
            data: { error: 'MQTT未连接，无法发布消息' }
          })
        }
      } catch (e) {
        // IPC通道可能已关闭，忽略错误
      }
      return
    }

    try {
      // ① 把十六进制字符串转回 Buffer
      const payloadBuf = Buffer.from(payloadHex, 'hex')

      // ② 真正发到 MQTT Broker
      console.log('[Child] publish MQTT', topic, payloadHex)
      client.publish(topic, payloadBuf, (err) => {
        if (err) {
          console.error('[MQTT Child] 发布消息失败:', err.message)
          try {
            if (process.connected) {
              process.send({ type: 'mqtt-error', data: { error: err.message } })
            }
          } catch (e) {
            // IPC通道可能已关闭，忽略错误
          }
        }
      })
      try {
        const parts = String(topic).split('/')
        const blockId = Number(parts[3]?.slice(1)) || 0
        const clusterId =
          parts.length > 4 && parts[4]?.startsWith('c') ? Number(parts[4].slice(1)) : 0
        const cid = `${blockId}-${clusterId || 0}`
        if (rawExportEnabled) {
          logAnyMessage({
            topic,
            payloadHex: payloadHex,
            clientId: cid,
            ts: Date.now(),
            direction: 's2d'
          })
        }
      } catch {}
    } catch (error) {
      // 【关键修复】捕获所有异常，防止进程崩溃
      console.error('[MQTT Child] 发布消息时发生异常:', error.message)
      try {
        if (process.connected) {
          process.send({
            type: 'mqtt-error',
            data: { error: `发布失败: ${error.message}` }
          })
        }
      } catch (e) {
        // IPC通道可能已关闭，忽略错误
      }
    }
  }
})

// ========== 事件记录导出功能已移至 eventRecordExport.js ==========

process.once('SIGINT', cleanUp)
process.once('exit', cleanUp)
process.once('SIGTERM', cleanUp)

function cleanUp() {
  // flushThrottlers   // 节流器已删除
  // cancelThrottlers(); // 节流器已删除
  client.end(true) // true = 强制清空离线队列
  client.removeAllListeners()
  process.removeAllListeners('message')
  clearInterval(memTimer) // 内存采样定时器
  stopHealthCheck() // 停止健康检查
  stopDataRateCalculation() // 【数据速率】停止速率计算
}

// 健康检查相关函数
/**
 * 启动健康检查机制
 *
 * 功能说明：
 * 1. 每10秒主动发送心跳到主进程
 * 2. 实时评估MQTT连接质量
 * 3. 提供子进程健康状态监控
 *
 * 这个机制确保主进程能够：
 * - 及时了解子进程运行状态
 * - 检测MQTT连接质量变化
 * - 在子进程异常时快速发现并重启
 */
function startHealthCheck() {
  if (healthCheckTimer) return

  // 初始化时间戳 - 设置基准时间，避免启动时的误报
  lastMessageReceived = Date.now()
  lastHeartbeatSent = Date.now()

  healthCheckTimer = setInterval(() => {
    // 只有在MQTT连接成功后才执行健康检查
    if (!isConnected) {
      console.log('[MQTT Child] 未连接，跳过健康检查')
      return
    }

    const now = Date.now()

    // 评估连接质量 - 根据消息接收情况动态评估连接状态
    updateConnectionQuality()

    // 定期发送心跳 - 主动向主进程报告子进程状态
    console.log('[MQTT Child] 定时心跳，连接质量:', connectionQuality)
    process.send({
      type: 'heartbeat',
      data: {
        timestamp: now, // 心跳时间戳
        isConnected, // MQTT连接状态
        connectionQuality, // 连接质量评估
        parseErrorCount, // 解析错误计数
        lastMessageReceived // 最后消息时间
      }
    })
    lastHeartbeatSent = now
  }, 10000) // 每10秒发送一次心跳

  console.log('[MQTT Child] 健康检查已启动')
}

/**
 * 更新连接质量评估
 *
 * 评估标准：
 * - good: 15秒内有消息接收，连接正常
 * - poor: 15-30秒无消息，连接质量下降
 * - bad: 超过30秒无消息，连接可能异常
 *
 * 这个评估帮助主进程了解MQTT连接的实际质量，
 * 而不仅仅是连接状态的true/false
 */
function updateConnectionQuality() {
  const now = Date.now()
  const timeSinceLastMessage = now - lastMessageReceived

  console.log('[MQTT Child] 更新连接质量，距离上次消息:', timeSinceLastMessage, 'ms')

  if (timeSinceLastMessage > 30000) {
    // 30秒无消息 - 连接可能异常
    connectionQuality = 'bad'
  } else if (timeSinceLastMessage > 15000) {
    // 15秒无消息 - 连接质量下降
    connectionQuality = 'poor'
  } else {
    // 15秒内有消息 - 连接正常
    connectionQuality = 'good'
  }

  console.log('[MQTT Child] 连接质量更新为:', connectionQuality)
}

function stopHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
    console.log('[MQTT Child] 健康检查已停止')
  }
}

// 内存采样
const MB = 1024 * 1024
const memTimer = setInterval(() => {
  const { rss, heapUsed, heapTotal } = process.memoryUsage()
  // console.log(`[MEM] rss ${(rss/MB).toFixed(1)} MB  heap ${(heapUsed/MB).toFixed(1)}/${(heapTotal/MB).toFixed(1)} MB`);
}, 10_000)
