;('use strict')
import {
  MBS_STATE_INIT,
  MBS_STATE_IDLE,
  MBS_STATE_GOOD_CONNECT,
  MBS_STATE_FAIL_CONNECT,
  MBS_STATE_NEXT,
  MBS_STATE_GOOD_READ,
  MBS_STATE_FAIL_READ,
  MBS_STATE_WAIT_RECONNECT,
  mbsId,
  mbsPort,
  mbsTimeout
} from '../client/stateCounts'
import {
  readModbusData_cellData,
  readModbusData_packClusterData,
  readModbusData_alarmData,
  readModbusData_DIDOData,
  readModbusData_controlData,
  readModbusData_eventTimeData,
  readModbusData_ConfigParamForBMU,
  readModbusData_ConfigParamSys,
  readModbusData_ConfigAlarm,
  readModbusData_ConfigSOX,
  readModbusData_vtSetData,
  readModbusData_balanceData,
  readModbusData_balanceDataForCell,
  readModbusData_disconnectData,
  readModbusData_upgradeData,
  readModbusData_adaptData,
  readModbusData_PowerMap,
  readModbusData_PCS,
  readModbusData_refrigeration,
  readModbusData_Dehum,
  readModbusData_Fire,
  readModbusData_FaultConfig,
  readModbusData_DIDOConfig
} from '../handlers/read'
import { eventState } from '../eventExport/utils'
// 新增公共读取方法
const executeReadOperations = async (mtclient) => {
  /* console.log('进入读取循环', mtclient.isStopped) */

  // 检查连接状态和验证状态
  if (!mtclient.client.isOpen || !mtclient.connectionVerified) {
    /* console.error(
      `[${mtclient.mbsHost}]连接无效 (isOpen: ${mtclient.client.isOpen}, verified: ${mtclient.connectionVerified})`
    ) */
    // 重置连接验证状态，触发重连
    mtclient.connectionVerified = false
    mtclient.mbsState = MBS_STATE_FAIL_READ
    /* throw new Error('连接无效或未验证') */
  }
  try {
    if (!mtclient.isStopped) {
      await readModbusData_ConfigParamForBMU(mtclient)
      //sendTRxCount(mtclient)
      await readModbusData_cellData(mtclient)
      //sendTRxCount(mtclient)
      await readModbusData_packClusterData(mtclient)
      //sendTRxCount(mtclient)
      await readModbusData_DIDOData(mtclient)
      //sendTRxCount(mtclient)
      await readModbusData_disconnectData(mtclient)
      //sendTRxCount(mtclient)
      await readModbusData_alarmData(mtclient)
      //sendTRxCount(mtclient)
      await readModbusData_balanceDataForCell(mtclient)
      //sendTRxCount(mtclient)
    }
    // 打印当前哪个模块处于激活状态
    /*   logActiveModules(mtclient) */

    // 修改配置参数读取逻辑（独立模块控制）
    if (shouldReadConfigParams(mtclient)) {
      /*       await executeModuleRead(mtclient, 'BalanceData', readModbusData_balanceData)
      //sendTRxCount(mtclient) */
      await executeModuleRead(mtclient, 'ConfigParamSys', readModbusData_ConfigParamSys)
      //sendTRxCount(mtclient)
      await executeModuleRead(mtclient, 'ConfigAlarm', readModbusData_ConfigAlarm)
      //sendTRxCount(mtclient)
      await executeModuleRead(mtclient, 'ConfigSOX', readModbusData_ConfigSOX)
      //sendTRxCount(mtclient)
      await executeModuleRead(mtclient, 'VTConfig', readModbusData_vtSetData)
      //sendTRxCount(mtclient)
      await executeModuleRead(mtclient, 'Adapt', readModbusData_adaptData)
      //sendTRxCount(mtclient)
      await executeModuleRead(mtclient, 'Control', readModbusData_controlData)
      //sendTRxCount(mtclient)
      await executeModuleRead(mtclient, 'Upgrade', readModbusData_upgradeData)
      //sendTRxCount(mtclient)
      await executeModuleRead(mtclient, 'EventTime', readModbusData_eventTimeData)
      await executeModuleRead(mtclient, 'PowerMap', readModbusData_PowerMap)
      await executeModuleRead(mtclient, 'PCS', readModbusData_PCS)
      await executeModuleRead(mtclient, 'refrigeration', readModbusData_refrigeration)
      await executeModuleRead(mtclient, 'dehum', readModbusData_Dehum)
      ;(await executeModuleRead(mtclient, 'fire', readModbusData_Fire),
        await executeModuleRead(mtclient, 'FaultConfig', readModbusData_FaultConfig),
        await executeModuleRead(mtclient, 'DIDOConfig', readModbusData_DIDOConfig))
    }
  } catch (e) {
    console.error('[读取操作失败]', e)
    mtclient.mbsState = MBS_STATE_FAIL_READ
    mtclient.mbsStatus = `读取失败: ${e.message}`
    throw e
  }
}
const logActiveModules = (client) => {
  const active = Object.entries(client.modules)
    .filter(([, m]) => !m.isStoppedParams)
    .map(([name]) => name)
  console.log(`IP ${client.mbsHost} 当前激活模块：`, active.length > 0 ? active.join(', ') : '无')
}
const shouldReadConfigParams = (mtclient) => {
  // 如果任意模块处于激活状态，则允许读取
  return Object.values(mtclient.modules).some((module) => !module.isStoppedParams)
}

// 模块化读取执行器
const executeModuleRead = async (client, moduleName, readFunc) => {
  if (!client.modules[moduleName]?.isStoppedParams) {
    // 检查模块状态
    await readFunc(client)
  }
}
const runModbus = async function (mtclient) {
  /*   console.log(mtclient.mbsState) */
  // 在状态处理前先检测连接
  /*   if (mtclient.mbsState === MBS_STATE_GOOD_CONNECT && !mtclient.isStopped) {
    const isAlive = await mtclient.checkConnection()
    if (!isAlive) mtclient.mbsState = MBS_STATE_INIT
  } */
  mtclient.nextAction = null // ← 先清掉上一次的
  /*  console.log('读取事件记录的ip', eventState.currentReadingEventIp) */
  // 只有在“有人在导出事件”且“自己不是那个IP”时，才只打心跳，跳过状态机
  if (eventState.currentReadingEventIp && mtclient.mbsHost !== eventState.currentReadingEventIp) {
    /*     console.log(
      `🚨 心跳分支，currentReadingEventIp="${eventState.currentReadingEventIp}" (${eventState.currentReadingEventIp.length}),`,
      `mbsHost="${mtclient.mbsHost}" (${mtclient.mbsHost.length})`
    ) */
    mtclient.startHeartbeat()
    return
  }
  if (mtclient.skip) {
    console.log(`跳过连接失败的IP：${mtclient.ModbusServerIP}`)
    return
  }
  /*  console.log(mtclient.mbsHost, mtclient.client.isOpen) */
  switch (mtclient.mbsState) {
    case MBS_STATE_INIT:
      mtclient.nextAction = () => mtclient.connect(false) // 将 connect 包装为函数
      break

    case MBS_STATE_NEXT:
      mtclient.nextAction = async () => {
        await executeReadOperations(mtclient)
      }
      break
    case MBS_STATE_GOOD_CONNECT:
      if (mtclient.isStopped && !shouldReadConfigParams(mtclient)) {
        mtclient.mbsState = MBS_STATE_IDLE
        console.log(`${mtclient.mbsHost} 等待读取`)
        mtclient.nextAction = null // 清除待执行动作
        await new Promise((resolve) => process.nextTick(resolve)) // 确保状态同步
        return // 直接返回，阻止后续代码执行
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        mtclient.mbsState = MBS_STATE_NEXT
      }

      break
    case MBS_STATE_FAIL_CONNECT:
      if (mtclient.isStopped) {
        console.log(`人工停止，不再重试: ${mtclient.mbsHost}`)
        return
      }
      process.send({
        API: 'connection-status',
        ip: mtclient.mbsHost,
        success: false,
        error: 'failed'
      })
      console.log(`连接失败，等待重试: ${mtclient.mbsHost}`)
      mtclient.nextAction = () => mtclient.connect(false)
      mtclient.mbsState = MBS_STATE_INIT // 允许继续重试
      break

    case MBS_STATE_GOOD_READ:
      mtclient.nextAction = async () => {
        await executeReadOperations(mtclient)
      }
      break

    case MBS_STATE_FAIL_READ:
      /* console.log('进入读取错误case', mtclient.mbsHost) */
      await mtclient.cleanupConnection()
      process.send({
        API: 'connection-status',
        ip: mtclient.mbsHost,
        success: false,
        error: 'interrupted'
      })

      // 添加延迟以避免立即重连循环
      const readFailDelay = Math.min(mtclient.currentReconnectInterval || 3000, 10000)
      //console.log(`[${mtclient.mbsHost}] 读取失败，将在 ${readFailDelay}ms 后重试连接`)

      // 使用延迟重连而不是立即重连
      mtclient.nextAction = null // 清除立即执行的动作
      setTimeout(() => {
        if (!mtclient.skip && mtclient.mbsState === MBS_STATE_FAIL_READ) {
          mtclient.mbsState = MBS_STATE_INIT
          mtclient.connect(false).catch(() => {})
        }
      }, readFailDelay)
      break
    case MBS_STATE_IDLE:
      console.log('进入MBS_STATE_IDLE参数读取等待;')
      mtclient.nextAction = null
      break
    default:
  }

  // execute "next action" function if defined
  /*  if (mtclient.nextAction && !mtclient.isProcessing) {
    mtclient.isProcessing = true
    mtclient
      .nextAction()
      .catch((e) => console.error('执行操作失败:', e))
      .finally(() => {
        mtclient.isProcessing = false
      })
  } */

  if (mtclient.nextAction) {
    try {
      // 标记处理中
      mtclient.isProcessing = true
      await mtclient.nextAction()
    } catch (e) {
      console.error('执行操作失败:', e)
    } finally {
      mtclient.isProcessing = false
    }
  }
  /* scheduleNextRun(mtclient) */
}
export { runModbus }
