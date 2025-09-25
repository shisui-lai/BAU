;('use strict')
const cellDataCache = new Map()
const clusterDataCache = new Map()
const packDataCache = new Map()
import {
  MBS_STATE_INIT,
  MBS_STATE_IDLE,
  MBS_STATE_GOOD_CONNECT,
  MBS_STATE_FAIL_CONNECT,
  MBS_STATE_NEXT,
  MBS_STATE_GOOD_READ,
  MBS_STATE_FAIL_READ,
  mbsId,
  mbsPort,
  mbsTimeout
} from '../client/stateCounts'
import { cacheSample } from '../dataExport/runningDataExport'
import {
  delay,
  isTimeoutError,
  convertArrayWithMinMax_CellV,
  transReslCluExtrem,
  getData_PackSummNew,
  getData_ClusExtreme,
  getData_ClusterSummNew,
  getAlarmData2,
  convertDisconnectToAlarmFormat,
  flattenAndFormat,
  getAlarmData1,
  parseDIDOData,
  parseControlData,
  getArray_ConfigParamSys1,
  getArray_ConfigParamSys2,
  getEventTimeData,
  getArray_ConfigFactorycalib,
  getArray_ConfigTime,
  getArray_ConfigAlarmClus,
  getArray_ConfigAlarmBMU,
  getArray_ConfigAlarmCell1,
  getArray_ConfigAlarmCell2,
  getArray_AccumAh,
  getArray_ConfigSOX1,
  getArray_ConfigSOX2,
  getArray_ConfigSOX3,
  getUpgradeData,
  getAdaptData,
  getDisconnectArrayNum,
  getDisconnectArrayBMU,
  getDisconnectArrayCellVT,
  getDisconnectArrayAFE,
  getArray_Balance,
  getArray_Temp,
  getArray_Vltg,
  getShieldStatus,
  parseLimitGroups,
  parseRowNum,
  parsePCSData,
  parseRefrigerationData,
  parseDehumData,
  parseFireData,
  parseMergedFaultMap,
  parseTotalFault,
  parseDiDOStatus,
  getDisconnectDaisyChain
} from './utils'
import { configFaultAction } from './configFaultMap'
// 将 retryRead 改为返回 raw
async function retryRead(fn, mtclient) {
  // 清空前一次的缓存（避免旧数据干扰）
  mtclient._lastRequest = null
  mtclient._lastResponse = null

  const res = await fn()
  // 注意：这里假设 fn() 的实现会设置 mtclient._lastRequest / _lastResponse
  return {
    data: res.data,
    buffer: res.buffer,
    rawRequest: mtclient._lastRequest, // 返回请求报文
    rawResponse: mtclient._lastResponse // 返回响应报文
  }
}
////////////////////读取操作**********************/////
const readModbusData_cellData = async function (mtclient) {
  const vltgMap = {}
  const tempMap = {}
  const socMap = {}
  const ip = mtclient.mbsHost
  const ts = Date.now()
  // 使用对象管理各数据起始地址
  const baseAddr = { vltg: 0x0000, temp: 0x1000, soc: 0x2000, soh: 0x3000 }
  const allResults = { vltg: [], temp: [], soc: [], soh: [] }
  const bmuCount = mtclient.bmuTotal ?? 1
  // 每个 BMU 的单体/温度数量（由配置决定）
  const vltgAddressNum = mtclient.afeConfig?.reduce((sum, afe) => sum + afe.vltgPerAFE, 0) ?? 1
  const tempAddressNum = mtclient.afeConfig?.reduce((sum, afe) => sum + afe.tempPerAFE, 0) ?? 1
  if (typeof bmuCount !== 'number' || bmuCount <= 0) {
    throw new Error('BMU总数量未正确配置，请先读取系统参数')
  }
  if (mtclient.isStopped && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    // 一次性读取连续单体数据（按总数量）
    const totalVltg = bmuCount * vltgAddressNum
    const totalTemp = bmuCount * tempAddressNum
    const totalSOC = bmuCount * vltgAddressNum
    const totalSOH = bmuCount * vltgAddressNum

    async function readRegistersChunked(startAddr, totalCount) {
      const MAX_PER_READ = 120
      const aggregated = []
      let addr = startAddr
      let remaining = totalCount
      while (remaining > 0) {
        const count = Math.min(MAX_PER_READ, remaining)
        const { data } = await retryRead(
          () => mtclient.client.readInputRegisters(addr, count),
          mtclient
        )
        aggregated.push(...data)
        addr += count
        remaining -= count
      }
      return aggregated
    }

    const dataVltg = await readRegistersChunked(baseAddr.vltg, totalVltg)
    const dataTemp = await readRegistersChunked(baseAddr.temp, totalTemp)
    const dataSOC = await readRegistersChunked(baseAddr.soc, totalSOC)
    const dataSOH = await readRegistersChunked(baseAddr.soh, totalSOH)

    // 根据配置切片还原为每个 BMU 的数据块
    for (let packID = 1; packID <= bmuCount; packID++) {
      const idx = packID - 1
      const vStart = idx * vltgAddressNum
      const vEnd = vStart + vltgAddressNum
      const tStart = idx * tempAddressNum
      const tEnd = tStart + tempAddressNum

      const resultVltg = convertArrayWithMinMax_CellV(
        dataVltg.slice(vStart, vEnd),
        mtclient.afeConfig,
        'voltage'
      )
      const resultTemp = convertArrayWithMinMax_CellV(
        dataTemp.slice(tStart, tEnd),
        mtclient.afeConfig,
        'temp'
      )
      const resultSOC = convertArrayWithMinMax_CellV(
        dataSOC.slice(vStart, vEnd),
        mtclient.afeConfig,
        'soc'
      )
      const resultSOH = convertArrayWithMinMax_CellV(
        dataSOH.slice(vStart, vEnd),
        mtclient.afeConfig,
        'soh'
      )

      allResults.vltg.push({ packID, ...resultVltg })
      allResults.temp.push({ packID, ...resultTemp })
      allResults.soc.push({ packID, ...resultSOC })
      allResults.soh.push({ packID, ...resultSOH })
    }

    // 更新状态
    mtclient.mbsState = MBS_STATE_GOOD_READ
    mtclient.mbsStatus = 'success'
  } catch (e) {
    if (isTimeoutError(e) && mtclient.client.isOpen && !mtclient.isStopped) {
      console.warn(`IP ${mtclient.mbsHost} 发生短暂超时，继续后续读取`)
    } else {
      mtclient.mbsState = MBS_STATE_FAIL_READ
      console.error(`单体数据致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
    }
  }
  // 定义数据类型配置
  const dataTypes = [
    { key: 'vltg', source: allResults.vltg, map: vltgMap, includeTotalVoltage: true },
    { key: 'temp', source: allResults.temp, map: tempMap, includeTotalVoltage: false },
    { key: 'soc', source: allResults.soc, map: socMap, includeTotalVoltage: false },
    { key: 'soh', source: allResults.soh, map: null, includeTotalVoltage: false }
  ]

  // 处理所有数据类型的通用函数
  const processDataType = (dataType) => {
    const flatData = dataType.source
      .flatMap((pack) =>
        pack.afeGroups.map((afe) => ({
          packID: pack.packID,
          afeID: afe.afeID,
          afeIdx: afe.afeIdx,
          cells: afe.cells,
          ...(dataType.includeTotalVoltage && { totalVoltage: pack.totalVoltage })
        }))
      )
      .sort((a, b) => {
        if (a.packID !== b.packID) return a.packID - b.packID
        return a.afeID - b.afeID
      })

    let globalCounter = 0
    let currentPackID = null
    let bmuCellCounter = 0 // BMU内电池计数器
    let bmuTempCounter = 0 // BMU内温度计数器

    flatData.forEach((group) => {
      // 当切换到新的BMU时，重置BMU内计数器
      if (currentPackID !== group.packID) {
        currentPackID = group.packID
        bmuCellCounter = 0
        bmuTempCounter = 0
      }

      group.cells = group.cells.map((cell) => {
        globalCounter++

        // 根据数据类型确定使用哪个计数器
        const isTempData = dataType.key === 'temp'
        const bmuCounter = isTempData ? bmuTempCounter : bmuCellCounter

        // 只有有意义的单体才累加
        if (cell.value !== '---' && cell.value != null && cell.value !== '') {
          const result = {
            value: cell.value,
            index: String(globalCounter).padStart(3, '0'),
            bmuIndex: bmuCounter + 1 // BMU内索引从1开始
          }

          // 根据数据类型增加对应的计数器
          if (isTempData) {
            bmuTempCounter++
          } else {
            bmuCellCounter++
          }

          return result
        } else {
          // 空值单体保持空展示
          const result = {
            value: '---',
            index: String(globalCounter).padStart(3, '0'),
            bmuIndex: bmuCounter + 1 // BMU内索引从1开始
          }

          // 根据数据类型增加对应的计数器
          if (isTempData) {
            bmuTempCounter++
          } else {
            bmuCellCounter++
          }

          return result
        }
      })
    })

    // 填充对应的map
    if (dataType.map) {
      flatData.forEach((group) =>
        group.cells.forEach((cell) => {
          const idx = parseInt(cell.index, 10)
          dataType.map[idx] = cell.value
        })
      )
    }

    return flatData
  }

  // 处理所有数据类型
  const processedData = {}
  dataTypes.forEach((dataType) => {
    processedData[dataType.key] = processDataType(dataType)
  })

  const { vltg: flatVltg, temp: flatTemp, soc: flatSOC, soh: flatSOH } = processedData
  cellDataCache.set(mtclient.mbsHost, { vltgMap, tempMap, socMap })
  /*   console.log(ip, '开始读取cell参数') */
  /*   console.log(cellDataCache) */
  /*   console.log(flatVltg) */
  // 定义发送和缓存的数据类型配置
  const sendDataTypes = [
    { api: 'FC04Vltg', data: flatVltg },
    { api: 'FC04Temp', data: flatTemp },
    { api: 'FC04SOC', data: flatSOC },
    { api: 'FC04SOH', data: flatSOH }
  ]

  // 发送数据给主进程
  sendDataTypes.forEach(({ api, data }) => {
    process.send({
      API: api,
      Arg: data,
      deviceIp: ip
    })
  })

  // 缓存数据（如果需要导出）
  if (mtclient.isSetDataExport && !mtclient.isStopped) {
    sendDataTypes.forEach(({ api, data }) => {
      cacheSample(api, data, ip, ts, mtclient.bmuTotal, mtclient.AFETotal, mtclient.afeConfig)
    })

    // 如果客户端状态正常，清除状态缓存中的异常记录
    const currentStatus = {
      isSetDataExport: mtclient.isSetDataExport,
      isStopped: mtclient.isStopped
    }
    const previousStatus = readStatusCache.get(ip)
    if (
      previousStatus &&
      (previousStatus.isSetDataExport !== currentStatus.isSetDataExport ||
        previousStatus.isStopped !== currentStatus.isStopped)
    ) {
      console.log(`[数据缓存] IP ${ip} 客户端状态恢复正常`)
      readStatusCache.set(ip, currentStatus)
    }
  } else {
    // 检查状态是否发生变化
    const currentStatus = {
      isSetDataExport: mtclient.isSetDataExport,
      isStopped: mtclient.isStopped
    }
    const previousStatus = readStatusCache.get(ip)

    // 只在状态发生变化时打印日志
    if (
      !previousStatus ||
      previousStatus.isSetDataExport !== currentStatus.isSetDataExport ||
      previousStatus.isStopped !== currentStatus.isStopped
    ) {
      if (!mtclient.isSetDataExport) {
        console.warn(
          `[数据缓存] IP ${ip} 数据导出已停止 (isSetDataExport: ${mtclient.isSetDataExport})`
        )
      } else if (mtclient.isStopped) {
        console.warn(`[数据缓存] IP ${ip} 客户端已停止 (isStopped: ${mtclient.isStopped})`)
      }

      // 更新状态缓存
      readStatusCache.set(ip, currentStatus)
    }
  }
}

const readModbusData_packClusterData = async function (mtclient) {
  const clusterVMap = {}
  const clusterIMap = {}
  const clusterRMap = {}
  const rtMap = {}
  const bmuVMap = {}
  const bmuTMap = {}
  const pollTMap = {}
  const bmuSocMap = {}
  let ip = mtclient.mbsHost
  let currentAddrVltgSumm = 0x4000
  let currentAddrClusterSumm = 0x4100
  let currentAddrPackSumm1 = 0x4224
  let currentAddrPackBMUT = 0x4244
  let currentAddrPackPoleT = 0x4264
  let currentAddrBMUSOC = 0x42e4
  let currentAddrBMUVersion = 0x42a4
  let currentAddrAcuumAh = 0x3272
  const ts = Date.now()
  const bmuDataAddr = mtclient.bmuTotal
  const bmuVersionAddr = mtclient.bmuTotal * 2
  if (mtclient.isStopped && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const {
      data: dataClusExtreme,
      rawRequest: reqDataClusExtreme,
      rawResponse: resDataClusExtreme
    } = await retryRead(
      () => mtclient.client.readInputRegisters(currentAddrVltgSumm, 112),
      mtclient
    )
    /*  if (mtclient.isSetDataExport) {
      saveRawData('簇端极值', [{ rawReq: reqDataClusExtreme, rawRes: resDataClusExtreme }], ip, ts)
    } */
    //mtclient.rxCount++
    //await delay(1)
    //mtclient.txCount++
    const dataClusterSumm = await mtclient.client.readInputRegisters(currentAddrClusterSumm, 125) // 读取簇端汇总数据
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataClusterAcuumAh = await mtclient.client.readHoldingRegisters(currentAddrAcuumAh, 8) // 读取簇端汇总数据
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataPackSumm1 = await mtclient.client.readInputRegisters(
      currentAddrPackSumm1,
      bmuDataAddr
    )
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataPackSummBMUT = await mtclient.client.readInputRegisters(
      currentAddrPackBMUT,
      mtclient.bmuTotal
    ) // 读取Pack端汇总数据1
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataPackSummPoleT = await mtclient.client.readInputRegisters(
      currentAddrPackPoleT,
      mtclient.bmuTotal * 2
    )
    const dataBMUSOC = await mtclient.client.readInputRegisters(
      currentAddrBMUSOC,
      mtclient.bmuTotal
    )
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataBMUVersion = await mtclient.client.readInputRegisters(
      currentAddrBMUVersion,
      bmuVersionAddr
    ) // 读取BMU版本号

    // 读取BMU产品编码（起始地址0x4304，每个BMU占用7个寄存器，按120分批）
    const addrBMUProduct = 0x4304
    const totalBMUProductRegs = (mtclient.bmuTotal ?? 1) * 7
    const dataBMUProduct = await readRegistersChunked(
      mtclient,
      addrBMUProduct,
      totalBMUProductRegs,
      'Input Registers'
    )
    //await delay(1)
    //mtclient.rxCount++
    const dataClusExtremeNew = transReslCluExtrem(dataClusExtreme)
    const dataAccumAh = getArray_AccumAh(dataClusterAcuumAh.data)[0]
    const dataAccumAhForEx = getArray_AccumAh(dataClusterAcuumAh.data)[0]
    /* console.log(dataAccumAh[0]) */
    const dataClusterSummNew = [...dataClusterSumm.data, ...dataBMUVersion.data, ...dataBMUProduct]
    const new_dataClusterSummNew = getData_ClusterSummNew(dataClusterSummNew, mtclient.bmuTotal)
    new_dataClusterSummNew[1].element
      .filter((item) => item.hasOwnProperty('label1') && item.label1.includes('SOP')) // 过滤出有 label1 且 label1 包含 'SOP' 的元素
      .forEach((item) => {
        if (mtclient.sopRealtime.hasOwnProperty(item.label1)) {
          mtclient.sopRealtime[item.label1] = item.value
        }
      })
    const new_dataClusterSummNewForExport = getData_ClusterSummNew(
      dataClusterSummNew,
      mtclient.bmuTotal,
      true
    )
    dataAccumAhForEx.element = dataAccumAhForEx.element.map(({ label, value, unit, address }) => ({
      label: `${label}(${unit})`,
      value
    }))
    const targetElementForEx = JSON.parse(JSON.stringify(new_dataClusterSummNewForExport[1]))
    targetElementForEx.element = [
      ...(targetElementForEx.element || []),
      ...(dataAccumAhForEx.element || [])
    ]
    new_dataClusterSummNewForExport[1] = targetElementForEx
    const targetElement = JSON.parse(JSON.stringify(new_dataClusterSummNew[1]))
    // 获取需要插入的元素数据
    const dataToInsert = dataAccumAh?.element || []
    // 将元素插入到指定位置：第2个元素后面，index 为 1
    if (dataToInsert.length > 0) {
      targetElement.element.splice(2, 0, ...dataToInsert) // 2 是插入的目标索引，0 表示不删除任何元素
    }
    // 更新原始数组
    new_dataClusterSummNew[1] = targetElement
    const dataVersion = new_dataClusterSummNew.slice(2, 11)
    /* console.log(dataPackSummPoleT.data) */
    const new_dataPackSummNew = getData_PackSummNew(
      [
        ...dataPackSumm1.data,
        ...dataPackSummBMUT.data,
        ...dataPackSummPoleT.data,
        ...dataBMUSOC.data
      ],
      mtclient.bmuTotal
    )
    /* new_dataClusterSummNew.forEach((item) => {
      console.log(item)
    }) */
    new_dataPackSummNew.forEach(({ classification, element }) => {
      if (classification.includes('BMUVoltage')) {
        // BMU 电压
        element.forEach(({ label, value }) => {
          bmuVMap[label] = value
        })
      } else if (classification.includes('BMUTemp')) {
        // BMU 电路板温度
        element.forEach(({ label, value }) => {
          bmuTMap[label] = value
        })
      } else if (classification.includes('PoleTemp')) {
        // 动力接插件温度
        element.forEach(({ label, value }) => {
          pollTMap[label] = value
        })
      } else if (classification.includes('BMUSOC')) {
        // BMU SOC
        element.forEach(({ label, value }) => {
          bmuSocMap[label] = value
        })
      }
    })
    new_dataClusterSummNew[0].element.forEach(({ label, value }) => {
      if (label.includes('簇电压')) {
        clusterVMap[label] = value
      } else if (label.includes('簇电流')) {
        clusterIMap[label] = value
      } else if (label.includes('绝缘电阻')) {
        clusterRMap[label] = value
      } else if (label.includes('温度')) {
        rtMap[label] = value
      }
    })
    packDataCache.set(ip, { bmuVMap, bmuTMap, pollTMap, bmuSocMap })
    clusterDataCache.set(ip, { clusterVMap, clusterIMap, clusterRMap, rtMap })
    /*    new_dataClusterSummNew.forEach((item) => console.log(item.element)) */
    const new_dataClusExtremeNew = getData_ClusExtreme(dataClusExtremeNew)
    const new_dataClusExtremeNewForExport = getData_ClusExtreme(dataClusExtremeNew, true)
    const dataCluster = [...new_dataClusterSummNewForExport, ...new_dataClusExtremeNewForExport]
    mtclient.mbsState = MBS_STATE_GOOD_READ
    mtclient.mbsStatus = 'success'
    /*  new_dataClusExtremeNew.forEach((item) => {
      console.log(item)
    }) */

    /* setInterval(() => {
      dataCluster.forEach((item) => {
        console.log(item.element)
      })
    }, 10000) */
    const filteredElements = new_dataClusterSummNew[1].element.filter(
      (item) => !item.hasOwnProperty('label2')
    )
    new_dataClusterSummNew[1].element = filteredElements
    process.send({ API: 'FC04ClusExtreme', Arg: new_dataClusExtremeNew, deviceIp: ip })
    process.send({ API: 'FC04ClusterSumm', Arg: new_dataClusterSummNew, deviceIp: ip })
    process.send({ API: 'FC04dataPackSumm1', Arg: new_dataPackSummNew, deviceIp: ip })
    process.send({ API: 'FC04dataVersion', Arg: dataVersion, deviceIp: ip })
    if (mtclient.isSetDataExport && !mtclient.isStopped) {
      /* cacheSample('FC04ClusExtreme', new_dataClusExtremeNew, ip, ts) */
      cacheSample('FC04ClusterSumm', dataCluster, ip, ts)
      cacheSample(
        'FC04dataPackSumm1',
        new_dataPackSummNew,
        ip,
        ts,
        mtclient.bmuTotal,
        mtclient.AFETotal,
        mtclient.afeConfig
      )
    }
  } catch (e) {
    // 可恢复超时：端口仍打开且未停止 → 忽略，不触发重连
    if (isTimeoutError(e) && mtclient.client.isOpen && !mtclient.isStopped) {
      console.warn(`IP ${mtclient.mbsHost} 发生短暂超时，继续后续读取`)
      return // 或者在 retryRead 中 return，跳过本次重试
    }
    // 其他情况（端口关闭或非超时错误）视为致命，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`pack数据致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const previousAlarms = new Map()
// 添加全局缓存来跟踪告警的首次出现时间
const alarmFirstSeenTime = new Map() // key: `${ip}:${告警唯一标识}`, value: 首次出现时间戳

// 生成告警唯一标识（用于时间戳跟踪）
function generateAlarmKeyForTime(ip, classification, bmuIndex, cellIndex, fault, level) {
  return `${ip}:${classification}:${bmuIndex}:${cellIndex}:${fault}:${level}`
}

// 1. 定义一个可复用的赋值函数
function assignActionValue(elem, classification, ip) {
  const { vltgMap = {}, tempMap = {}, socMap = {} } = cellDataCache.get(ip) || {}
  const {
    clusterVMap = {},
    clusterIMap = {},
    clusterRMap = {},
    rtMap = {}
  } = clusterDataCache.get(ip) || {}
  const { bmuVMap = {}, bmuTMap = {}, pollTMap = {}, bmuSocMap = {} } = packDataCache.get(ip) || {}
  /* console.log('cellDataCache', cellDataCache.get(ip)) */
  // 先判断"单体"这一块
  if (classification === '单体电池过压' || classification === '单体电池欠压') {
    const cellNum = parseInt(elem.cellIndex.replace(/^Cell/, ''), 10)
    elem.actionValue = vltgMap[cellNum]
    return
  }
  if (
    classification === '充电单体过温' ||
    classification === '充电单体欠温' ||
    classification === '放电单体过温' ||
    classification === '放电单体欠温'
  ) {
    const cellNum = parseInt(elem.cellIndex.replace(/^Cell/, ''), 10)
    elem.actionValue = tempMap[cellNum]
    return
  }
  if (classification === '单体SOC过高' || classification === '单体SOC过低') {
    const cellNum = parseInt(elem.cellIndex.replace(/^Cell/, ''), 10)
    elem.actionValue = socMap[cellNum]
    return
  }

  // 再判断 new_dataAlarm1 那一批
  const fault = elem.fault
  const idx = elem.bmuIndex // 比如 "BMU3"
  if (fault === '簇端过压' || fault === '簇端欠压') {
    elem.actionValue = clusterVMap['簇电压']
  } else if (fault === '绝缘电阻正对地过高') {
    elem.actionValue = clusterRMap['绝缘电阻R+']
  } else if (fault === '绝缘电阻负对地过高') {
    elem.actionValue = clusterRMap['绝缘电阻R-']
  } else if (fault === '充电过流' || fault === '放电过流') {
    elem.actionValue = clusterIMap['簇电流']
  } else if (/RT([1-5])过温/.test(fault)) {
    const n = fault.match(/RT([1-5])过温/)[1]
    elem.actionValue = rtMap[`温度${n}`]
  } else if (fault === 'BMU过压' || fault === 'BMU欠压') {
    // 修复BMU欠压动作值获取问题
    // BMU电压数据的label格式是 "BMU1(V)", "BMU2(V)" 等
    // 需要从bmuIndex中提取数字部分，因为bmuIndex可能是"BMU1"格式
    const bmuNumber = idx.toString().replace(/^BMU/, '') // 提取数字部分
    const bmuKey = `BMU${bmuNumber}(V)`
    elem.actionValue = bmuVMap[bmuKey]
  } else if (fault === 'BMU过温' || fault === 'BMU欠温') {
    // BMU温度数据的label格式是 "BMU1(℃)", "BMU2(℃)" 等
    const bmuNumber = idx.toString().replace(/^BMU/, '') // 提取数字部分
    const bmuKey = `BMU${bmuNumber}(℃)`
    elem.actionValue = bmuTMap[bmuKey]
  } else if (fault === '1号动力接插件过温') {
    const bmuNumber = idx.toString().replace(/^BMU/, '') // 提取数字部分
    elem.actionValue = pollTMap[`BMU${bmuNumber}-1`]
  } else if (fault === '2号动力接插件过温') {
    const bmuNumber = idx.toString().replace(/^BMU/, '') // 提取数字部分
    elem.actionValue = pollTMap[`BMU${bmuNumber}-2`]
  }
}
const readModbusData_alarmData = async function (mtclient) {
  let ip = mtclient.mbsHost
  const ts = Date.now()
  const config = {
    bmuTotal: mtclient.bmuTotal || 5, // 实际BMU数量
    afeConfig: mtclient.afeConfig || [{ vltgPerAFE: 16, tempPerAFE: 8 }] // 示例配置
  }
  let currentAddrAlarm1 = 0xa009
  // 故障使能映射和保留映射地址
  const addressMap = {
    enableFaultMap: 0xd800,
    enableFaultMapNum: 20,
    enableReservedMap: 0xd820,
    enableReservedMapNum: 20
  }
  //1个寄存器2个字节，1个字节8bit可表示4个电池的故障等级，1个寄存器可表示8个单体的故障信息，
  //16个寄存器表示128节单体故障信息，即1个BMU的故障信息，一次读16*4=64个寄存器地址，
  //即一次读4个BMU(128节单体）的故障信息，需要读8次（512个寄存器），每次读完将寄存器地址+0x40
  //==========================================读取单体故障信息==================
  // 计算每个BMU的电压/温度总数
  const cellsPerBMU = config.afeConfig.reduce((sum, afe) => sum + afe.vltgPerAFE, 0)
  const tempsPerBMU = config.afeConfig.reduce((sum, afe) => sum + afe.tempPerAFE, 0)
  if (mtclient.isStopped && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  // 寄存器计算参数
  const regsPerCellBMU = Math.ceil(cellsPerBMU / 8) // 每个BMU电压相关寄存器数
  const regsPerTempBMU = Math.ceil(tempsPerBMU / 8) // 每个BMU温度相关寄存器数
  const faultTypes = [
    { name: 'CellVUp', addr: 0xa080, regsPerBMU: regsPerCellBMU },
    { name: 'CellVDown', addr: 0xa280, regsPerBMU: regsPerCellBMU },
    { name: 'ChrgCellTUp', addr: 0xa480, regsPerBMU: regsPerTempBMU },
    { name: 'ChrgCellTDown', addr: 0xa680, regsPerBMU: regsPerTempBMU },
    { name: 'DischrgCellTUp', addr: 0xa880, regsPerBMU: regsPerTempBMU },
    { name: 'DischrgCellTDown', addr: 0xaa80, regsPerBMU: regsPerTempBMU },
    { name: 'SOCUp', addr: 0xac80, regsPerBMU: regsPerCellBMU },
    { name: 'SOCDown', addr: 0xae80, regsPerBMU: regsPerCellBMU }
  ]

  /*   let allCombinedData = new Array(8 * 512).fill(0) // 初始化足够大的数组 */
  // 预分配固定大小的数组，避免动态扩展导致的内存问题
  const totalRegisters = 8 * 512 // 总寄存器数量
  let allCombinedData = new Array(totalRegisters).fill(0)

  // 遍历每个故障类型
  // 新的连续解析方式：按单体连续排列，而不是按BMU分段
  for (const fault of faultTypes) {
    // 计算该故障类型总共需要的寄存器数量（所有BMU的总和）
    const totalRegs = config.bmuTotal * fault.regsPerBMU

    // 计算该故障类型的数据块偏移
    const blockOffset = Math.floor((fault.addr - 0xa080) / 0x200) * 512

    // 分块读取该故障类型的所有寄存器（每次最多120个）
    const MAX_PER_READ = 120
    let currentAddr = fault.addr
    let remainingRegs = totalRegs
    let currentOffset = blockOffset

    try {
      while (remainingRegs > 0) {
        const count = Math.min(MAX_PER_READ, remainingRegs)

        //mtclient.txCount++
        const data = await mtclient.client.readInputRegisters(currentAddr, count)
        //await delay(1)
        //mtclient.rxCount++

        // 将读取的数据存储到连续位置
        data.data.forEach((val, idx) => {
          allCombinedData[currentOffset + idx] = val
        })

        // 更新地址和偏移
        currentAddr += count
        currentOffset += count
        remainingRegs -= count
      }
    } catch (e) {
      // 读取失败时，将对应位置填充为0
      Array.from({ length: totalRegs }).forEach((_, idx) => {
        allCombinedData[blockOffset + idx] = 0
      })

      // 可恢复超时：端口仍打开且未停止 → 忽略，不触发重连
      if (isTimeoutError(e) && mtclient.client.isOpen && !mtclient.isStopped) {
        console.warn(`IP ${mtclient.mbsHost} 发生短暂超时，继续后续读取`)
        continue // 或者在 retryRead 中 return，跳过本次重试
      }
      // 其他情况（端口关闭或非超时错误）视为致命，触发重连
      mtclient.mbsState = MBS_STATE_FAIL_READ
      console.error(`实时告警致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
    }
  }
  /*   console.log(allCombinedData) */
  // 添加时间戳并返回结果
  let processedData = getAlarmData2(allCombinedData, {
    bmuTotal: config.bmuTotal,
    cellsPerBMU,
    tempsPerBMU
  }).map((category) => ({
    ...category,
    element: category.element.map((item) => ({
      ...item,
      timestamp: Date.now()
    }))
  }))

  //==========================================读取VT/AFE掉线数据===============
  const disconnectData = await readModbusData_disconnectData(mtclient)
  const convertedDisconnect = convertDisconnectToAlarmFormat(disconnectData)
  /* convertedDisconnect.forEach((item) => console.log(item)) */

  //==========================================读取常规故障===============
  let new_dataAlarm1 = []
  try {
    //mtclient.txCount++
    const dataAlarm1 = await mtclient.client.readInputRegisters(currentAddrAlarm1, 55) // 读取报警1
    //await delay(1)
    //mtclient.rxCount++
    new_dataAlarm1 = getAlarmData1(dataAlarm1.data, mtclient.bmuTotal).map((category) => ({
      ...category,
      element: category.element.map((item) => ({
        ...item,
        timestamp: Date.now() // 添加检测时间戳
      }))
    }))
    mtclient.mbsState = MBS_STATE_GOOD_READ
    mtclient.mbsStatus = 'success'
  } catch (e) {
    // 可恢复超时：端口仍打开且未停止 → 忽略，不触发重连
    if (isTimeoutError(e) && mtclient.client.isOpen && !mtclient.isStopped) {
      console.warn(`IP ${mtclient.mbsHost} 发生短暂超时，继续后续读取`)
      return // 或者在 retryRead 中 return，跳过本次重试
    }
    // 其他情况（端口关闭或非超时错误）视为致命，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`实时告警致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }

  //==========================================读取故障使能和故障保留映射===============
  let faultMapAlarms = []
  try {
    // 读取故障使能和故障保留映射
    const enableFaultMapData = await mtclient.client.readInputRegisters(
      addressMap.enableFaultMap,
      addressMap.enableFaultMapNum
    )
    const enableReservedMapData = await mtclient.client.readInputRegisters(
      addressMap.enableReservedMap,
      addressMap.enableReservedMapNum
    )

    // 分别处理普通故障和保留故障
    // 首先解析普通故障
    const enabledFaults = []

    // 遍历普通故障使能映射
    for (let i = 0; i < enableFaultMapData.data.length; i++) {
      const enableValue = enableFaultMapData.data[i]

      for (let bit = 0; bit < 16; bit++) {
        const isEnabled = (enableValue & (1 << bit)) !== 0
        const faultKey = i * 16 + bit + 1

        // 只处理键值大于等于149且已使能的故障
        if (
          (faultKey === 25 || faultKey >= 149) &&
          isEnabled &&
          configFaultAction.faultsMap[faultKey]
        ) {
          enabledFaults.push({
            label: configFaultAction.faultsMap[faultKey],
            key: faultKey,
            isReserved: false
          })
        }
      }
    }

    // 遍历保留故障使能映射
    for (let i = 0; i < enableReservedMapData.data.length; i++) {
      const enableValue = enableReservedMapData.data[i]

      for (let bit = 0; bit < 16; bit++) {
        const isEnabled = (enableValue & (1 << bit)) !== 0
        const faultKey = i * 16 + bit + 1

        // 保留故障不需要限制键值范围，所有已使能的都处理
        if (isEnabled && configFaultAction.faultsMap[faultKey]) {
          enabledFaults.push({
            label: configFaultAction.faultsMap[faultKey],
            key: faultKey,
            isReserved: true
          })
        }
      }
    }

    // 将已使能的故障映射转换为告警格式
    faultMapAlarms = []

    enabledFaults.forEach((fault) => {
      // 获取故障名称
      let faultName = fault.label

      // 对于保留故障，在原始label前添加"Reserved"前缀
      if (fault.isReserved) {
        faultName = `Reserved${faultName}`
      }

      // 确定故障等级，根据命名规则判断
      let faultLevel = '严重' // 默认为一般
      if (fault.label.includes('Critical'))
        faultLevel = '严重' // 严重
      else if (fault.label.includes('Minor'))
        faultLevel = '轻微' // 轻微
      else if (fault.label.includes('General')) faultLevel = '一般' // 一般

      // 构建告警元素
      const alarmElement = {
        fault: faultName,
        level: faultLevel,
        timestamp: Date.now(),
        actionValue: '' // 实际值待后续补充
      }

      // 将告警添加到对应分类
      let classificationFound = false
      for (const category of faultMapAlarms) {
        // 根据故障类型确定分类
        if (
          (fault.label.includes('OT') && category.classification === '温度告警') ||
          (fault.label.includes('Feedback') && category.classification === 'DI/DO告警')
        ) {
          category.element.push(alarmElement)
          classificationFound = true
          break
        }
      }

      // 如果没有找到匹配的分类，则创建新分类
      if (!classificationFound) {
        let classification = '其他故障' // 默认分类
        faultMapAlarms.push({
          classification,
          element: [alarmElement]
        })
      }
    })
  } catch (e) {
    // 可恢复超时：端口仍打开且未停止 → 忽略，不触发重连
    if (isTimeoutError(e) && mtclient.client.isOpen && !mtclient.isStopped) {
      console.warn(`IP ${mtclient.mbsHost} 读取故障映射时发生短暂超时，继续后续读取`)
      // 出错时使用空数组，不影响其他告警处理
      faultMapAlarms = []
    } else {
      // 其他情况记录错误，但不触发致命错误，保持读取流程
      console.error(`读取故障映射错误 ${mtclient.mbsHost}: ${e.message}`)
      faultMapAlarms = []
    }
  }
  /*   faultMapAlarms.forEach((item) => console.log(item.element))
   */ // 合并所有告警数据
  const combinedAPIData = [
    ...convertedDisconnect,
    ...new_dataAlarm1,
    ...processedData,
    ...faultMapAlarms
  ]

  // 为所有告警分配动作值
  combinedAPIData.forEach((category) => {
    category.element.forEach((elem) => {
      assignActionValue(elem, category.classification, ip)
    })
  })

  // 处理告警时间戳：老告警保持首次时间戳，新告警使用最新时间戳
  const processedAlarms = []
  combinedAPIData.forEach((category) => {
    category.element.forEach((elem) => {
      const alarmKey = generateAlarmKeyForTime(
        ip,
        category.classification,
        elem.bmuIndex,
        elem.cellIndex,
        elem.fault,
        elem.level
      )

      if (!alarmFirstSeenTime.has(alarmKey)) {
        // 新告警：记录首次出现时间
        alarmFirstSeenTime.set(alarmKey, elem.timestamp)
        processedAlarms.push({
          ...elem,
          classification: category.classification,
          timestamp: elem.timestamp // 使用最新时间戳
        })
      } else {
        // 老告警：使用首次出现时间
        const firstSeenTime = alarmFirstSeenTime.get(alarmKey)
        processedAlarms.push({
          ...elem,
          classification: category.classification,
          timestamp: firstSeenTime // 使用首次时间戳
        })
      }
    })
  })

  // 将处理后的告警重新组织为 category.element 结构
  const processedAPIData = []
  const classificationGroups = {}

  processedAlarms.forEach((item) => {
    if (!classificationGroups[item.classification]) {
      classificationGroups[item.classification] = []
    }
    classificationGroups[item.classification].push(item)
  })

  Object.keys(classificationGroups).forEach((classification) => {
    processedAPIData.push({
      classification,
      element: classificationGroups[classification]
    })
  })

  // 更新缓存，供下次对比（只保存 key + elem + classification）
  const currentList = [] // 构造当前告警列表的 key 和原始元素一一映射
  processedAlarms.forEach((item) => {
    const key = `${item.classification}|${item.bmuIndex}|${item.cellIndex}||${item.fault}`
    currentList.push({ key, elem: item, classification: item.classification })
  })
  previousAlarms.set(ip, currentList)

  // 清理已消失的告警的时间戳缓存
  const currentKeys = new Set(
    processedAlarms.map((item) =>
      generateAlarmKeyForTime(
        ip,
        item.classification,
        item.bmuIndex,
        item.cellIndex,
        item.fault,
        item.level
      )
    )
  )

  // 清理不再存在的告警的时间戳缓存
  for (const [alarmKey] of alarmFirstSeenTime.entries()) {
    if (alarmKey.startsWith(`${ip}:`) && !currentKeys.has(alarmKey)) {
      alarmFirstSeenTime.delete(alarmKey)
    }
  }

  let flatAlarms = flattenAndFormat(processedAPIData)
  flatAlarms = flatAlarms.map((alarm, idx) => ({
    ...alarm,
    seqNo: idx + 1 // 这里就是序号字段
  }))
  process.send({ API: 'FC04Alarm', Arg: flatAlarms, deviceIp: ip })
  if (mtclient.isSetDataExport && !mtclient.isStopped) {
    // 传递完整的告警数据给存储模块，让存储模块自己判断哪些需要存储
    cacheSample('FC04Alarm', combinedAPIData, ip, ts)
  }
}
const readModbusData_DIDOData = async function (mtclient) {
  let ip = mtclient.mbsHost
  let currentAddrDIDO = 0xa000
  if (mtclient.isStopped && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const dataDIDO = await mtclient.client.readInputRegisters(currentAddrDIDO, 6)
    //await delay(1)
    //mtclient.rxCount++
    const dataDIDONew = parseDIDOData(dataDIDO.data, mtclient.bmuTotal)
    mtclient.mbsState = MBS_STATE_GOOD_READ
    mtclient.mbsStatus = '读取成功'
    process.send({ API: 'FC04DIDO', Arg: dataDIDONew, deviceIp: ip })
  } catch (e) {
    // 可恢复超时：端口仍打开且未停止 → 忽略，不触发重连
    if (isTimeoutError(e) && mtclient.client.isOpen && !mtclient.isStopped) {
      console.warn(`IP ${mtclient.mbsHost} 发生短暂超时，继续后续读取`)
      return // 或者在 retryRead 中 return，跳过本次重试
    }
    // 其他情况（端口关闭或非超时错误）视为致命，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`dido致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_controlData = async function (mtclient) {
  let ip = mtclient.mbsHost
  let currentAddrControl = 0xc01e
  let currentAddrSysRunMode = 0xc003
  if (mtclient.modules.Control.isStoppedParams === true && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const dataControl = await mtclient.client.readHoldingRegisters(currentAddrControl, 2)
    //await delay(1)
    //mtclient.rxCount++
    const dataSysRunMode = await mtclient.client.readHoldingRegisters(currentAddrSysRunMode, 1)
    const dataControlSum = [...dataControl.data, ...dataSysRunMode.data]
    const dataControlNew = parseControlData(dataControlSum)
    process.send({ API: 'FC04Control', Arg: dataControlNew, deviceIp: ip })
  } catch (e) {
    // 可恢复超时：端口仍打开且未停止 → 忽略，不触发重连
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.Control.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} 发生短暂超时，继续后续读取`)
      return // 或者在 retryRead 中 return，跳过本次重试
    }
    // 其他情况（端口关闭或非超时错误）视为致命，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`控制反馈致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}

//单独读取事件记录，事件信息：
const readModbusData_eventTimeData = async function (mtclient) {
  let ip = mtclient.mbsHost
  let currentAddrConfigEvent = 0x5730
  let currentAddrConfigSysTime = 0x5744
  if (mtclient.modules.EventTime.isStoppedParams === true && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const dataConfigEvent = await mtclient.client.readHoldingRegisters(currentAddrConfigEvent, 15)
    //mtclient.rxCount++
    //await delay(1)
    //mtclient.txCount++
    const dataConfigSysTime = await mtclient.client.readHoldingRegisters(
      currentAddrConfigSysTime,
      94
    )
    const dataConfigEventNew = getEventTimeData(dataConfigEvent.data)
    const dataConfigSysTimeNew = getArray_ConfigTime(dataConfigSysTime.data) //时间数据
    const dataConfigEventTime = [...dataConfigEventNew, ...dataConfigSysTimeNew]
    /* dataConfigEventTime.forEach((item) => console.log(item)) */
    process.send({ API: 'FC04EventData', Arg: dataConfigEventTime, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.EventTime.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} eventTime 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`事件记录致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
//单独读取BMU配置信息
const readModbusData_ConfigParamForBMU = async function (mtclient) {
  let ip = mtclient.mbsHost
  let currentAddrConfigParam = 0x0000
  let currentAddrConfigFactorycalib = 0x5700
  if (mtclient.isStopped && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const dataBMUConfig = await mtclient.client.readHoldingRegisters(currentAddrConfigParam, 66)
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataConfigFactorycalib_Event = await mtclient.client.readHoldingRegisters(
      currentAddrConfigFactorycalib,
      12
    )
    //await delay(1)
    //mtclient.rxCount++
    const dataBMUConfigNew = getArray_ConfigParamSys1(dataBMUConfig.data, mtclient) //BMU配置
    const dataConfigParamSys3New = getArray_ConfigFactorycalib(
      dataConfigFactorycalib_Event.data,
      true
    ) //电流电压校准参数，不包括事件记录数据
    const bmuTotalElement = dataBMUConfigNew[0].element.find((item) => item.label === 'BMU总数量')
    if (bmuTotalElement) {
      mtclient.bmuTotal = bmuTotalElement.value
    } else {
      console.error('配置中未找到BMU总数量')
      mtclient.bmuTotal = 5 // 或设置默认值
    }
    const AFETotalElement = dataBMUConfigNew[0].element.find(
      (item) => item.label === 'BMU下AFE数量'
    )
    if (AFETotalElement) {
      mtclient.AFETotal = AFETotalElement.value
    } else {
      console.error('配置中未找到AFE总数量')
      mtclient.AFETotal = 4 // 或设置默认值
    }
    const vltgTotalElement = dataBMUConfigNew[0].element.find(
      (item) => item.label === 'AFE1下电池数量'
    )
    if (vltgTotalElement) {
      mtclient.vltgTotal = vltgTotalElement.value
    } else {
      console.error('配置中未找到电压总数量')
      mtclient.vltgTotal = 12 // 或设置默认值
    }
    const tempTotalElement = dataBMUConfigNew[0].element.find(
      (item) => item.label === 'AFE1下温度数量'
    )
    if (tempTotalElement) {
      mtclient.tempTotal = tempTotalElement.value
    } else {
      console.error('配置中未找到温度总数量')
      mtclient.tempTotal = 6 // 或设置默认值
    }
    const dataBMUConfigNew1 = [...dataBMUConfigNew, ...dataConfigParamSys3New].map((item) => ({
      ...item, // 保留原有属性
      classification: item.classification,
      element: item.element || [], // 保留已有 element 或初始化空数组
      config: {
        // 新增平级 config 属性
        bmuTotal: mtclient.bmuTotal ?? 5,
        afeTotal: mtclient.AFETotal ?? 1,
        cellsPerBMU: mtclient.afeConfig?.reduce((sum, afe) => sum + afe.vltgPerAFE, 0) ?? 1,
        afeConfig: mtclient.afeConfig
      }
    }))
    /*  console.log(ip) */
    process.send({ API: 'FC04ConfigForBMU', Arg: dataBMUConfigNew1, deviceIp: ip })
  } catch (e) {
    if (isTimeoutError(e) && mtclient.client.isOpen && !mtclient.isStopped) {
      console.warn(`IP ${mtclient.mbsHost} FC04ConfigForBMU 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`BMU配置致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_ConfigParamSys = async function (mtclient) {
  let ip = mtclient.mbsHost
  let currentAddrConfigParamSys1 = 0x0000
  let currentAddrConfigParamSys2 = 0x0052
  let currentAddrConfigFactorycalib = 0x5700
  /*   let currentAddrConfigSysTime = 0x5744 */
  if (mtclient.modules.ConfigParamSys.isStoppedParams === true && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  /*   while (isReading) { */
  try {
    //mtclient.txCount++
    const dataConfigParamSys1 = await mtclient.client.readHoldingRegisters(
      currentAddrConfigParamSys1,
      66
    )
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataConfigParamSys2 = await mtclient.client.readHoldingRegisters(
      currentAddrConfigParamSys2,
      77
    )
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataConfigFactorycalib_Event = await mtclient.client.readHoldingRegisters(
      currentAddrConfigFactorycalib,
      63
    )
    //await delay(1)
    //mtclient.rxCount++
    /*   const dataConfigSysTime = await mtclient.client.readHoldingRegisters(
      currentAddrConfigSysTime,
      30
    ) */
    /*  console.log(dataConfigParamSys1.data) */
    const dataConfigParamSys1New = getArray_ConfigParamSys1(dataConfigParamSys1.data, mtclient)
    // 存储BMU总数量到mtclient
    const bmuTotalElement = dataConfigParamSys1New[0].element.find(
      (item) => item.label === 'BMU总数量'
    )
    if (bmuTotalElement) {
      mtclient.bmuTotal = bmuTotalElement.value
    } else {
      console.error('配置中未找到BMU总数量')
      mtclient.bmuTotal = 5 // 或设置默认值
    }
    const AFETotalElement = dataConfigParamSys1New[0].element.find(
      (item) => item.label === 'BMU下AFE数量'
    )
    if (AFETotalElement) {
      mtclient.AFETotal = AFETotalElement.value
    } else {
      console.error('配置中未找到AFE总数量')
      mtclient.AFETotal = 4 // 或设置默认值
    }
    const vltgTotalElement = dataConfigParamSys1New[0].element.find(
      (item) => item.label === 'AFE1下电池数量'
    )
    if (vltgTotalElement) {
      mtclient.vltgTotal = vltgTotalElement.value
    } else {
      console.error('配置中未找到电压总数量')
      mtclient.vltgTotal = 12 // 或设置默认值
    }
    const tempTotalElement = dataConfigParamSys1New[0].element.find(
      (item) => item.label === 'AFE1下温度数量'
    )
    if (tempTotalElement) {
      mtclient.tempTotal = tempTotalElement.value
    } else {
      console.error('配置中未找到温度总数量')
      mtclient.tempTotal = 6 // 或设置默认值
    }
    /*     console.log('dataConfigParamSys2:', dataConfigParamSys2.data) */
    const dataConfigParamSys2New = getArray_ConfigParamSys2(dataConfigParamSys2.data)
    const dataConfigParamSys3New = getArray_ConfigFactorycalib(
      dataConfigFactorycalib_Event.data,
      false
    )
    /*    const dataConfigSysTimeNew = getArray_ConfigTime(dataConfigSysTime.data) */
    /*    dataConfigParamSys3New.forEach((item) => console.log(item)) */
    const dataConfigParamSys = [
      ...dataConfigParamSys1New,
      ...dataConfigParamSys2New,
      ...dataConfigParamSys3New
    ].map((item) => ({
      ...item, // 保留原有属性
      classification: item.classification,
      element: item.element || [], // 保留已有 element 或初始化空数组
      config: {
        // 新增平级 config 属性
        bmuTotal: mtclient.bmuTotal ?? 5,
        afeTotal: mtclient.AFETotal ?? 1,
        cellsPerBMU: mtclient.afeConfig?.reduce((sum, afe) => sum + afe.vltgPerAFE, 0) ?? 1
      }
    }))
    /*   dataConfigParamSys.forEach((item) => {
      console.log(item)
    }) */
    /*     console.log(ip, '开始读取配置参数') */
    process.send({ API: 'FC04Config', Arg: dataConfigParamSys, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.ConfigParamSys.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04Config 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`配置参数致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}

const readModbusData_ConfigAlarm = async function (mtclient) {
  let ip = mtclient.mbsHost
  let currentAddrConfigAlarmCluster = 0x3000
  let currentAddrConfigAlarmBMU = 0x3085
  let currentAddrConfigAlarmCell1 = 0x30e6
  let currentAddrConfigAlarmCell2 = 0x315e
  if (mtclient.modules.ConfigAlarm.isStoppedParams === true && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const dataConfigAlarmClus = await mtclient.client.readHoldingRegisters(
      currentAddrConfigAlarmCluster,
      120
    )
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataConfigAlarmBMU = await mtclient.client.readHoldingRegisters(
      currentAddrConfigAlarmBMU,
      84
    )
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataConfigAlarmCell1 = await mtclient.client.readHoldingRegisters(
      currentAddrConfigAlarmCell1,
      120
    )
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataConfigAlarmCell2 = await mtclient.client.readHoldingRegisters(
      currentAddrConfigAlarmCell2,
      12
    )
    //await delay(1)
    //mtclient.rxCount++
    const dataConfigAlarmNew = getArray_ConfigAlarmClus(dataConfigAlarmClus.data)
    const dataConfigAlarmNew1 = getArray_ConfigAlarmBMU(dataConfigAlarmBMU.data)
    const dataConfigAlarmNew2 = getArray_ConfigAlarmCell1(dataConfigAlarmCell1.data)
    const dataConfigAlarmNew3 = getArray_ConfigAlarmCell2(dataConfigAlarmCell2.data)
    const mergedArray = [
      dataConfigAlarmNew2[0],
      dataConfigAlarmNew2[1],
      {
        classification: 'CellSOC告警',
        element: [...dataConfigAlarmNew2[2].element, ...dataConfigAlarmNew3[0].element]
      }
    ]
    const dataConfigAlarm = [...dataConfigAlarmNew, ...dataConfigAlarmNew1, ...mergedArray]

    /*   console.log(dataConfigAlarmNew[1].element) */
    process.send({ API: 'FC04ConfigAlarm', Arg: dataConfigAlarm, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      !mtclient.isStopped &&
      mtclient.modules.ConfigAlarm.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04ConfigAlarm 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`告警阈值致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}

const readModbusData_ConfigSOX = async function (mtclient) {
  let ip = mtclient.mbsHost
  let currentAddrConfigSOX1 = 0x3200
  let currentAddrConfigSOX1_1 = 0x326f
  let currentAddrConfigSOX2 = 0x5300
  let currentAddrConfigSOX3 = 0x5379
  if (mtclient.modules.ConfigSOX.isStoppedParams === true && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const dataConfigSOX1 = await mtclient.client.readHoldingRegisters(currentAddrConfigSOX1, 108)
    const dataConfigSOX1_1 = await mtclient.client.readHoldingRegisters(currentAddrConfigSOX1_1, 18)
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataConfigSOX2 = await mtclient.client.readHoldingRegisters(currentAddrConfigSOX2, 117)
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataConfigSOX3 = await mtclient.client.readHoldingRegisters(currentAddrConfigSOX3, 26)
    //await delay(1)
    //mtclient.rxCount++
    const dataConfigSOX1_1New = [...dataConfigSOX1.data, ...dataConfigSOX1_1.data]
    const dataConfigSOX1New = getArray_ConfigSOX1(dataConfigSOX1_1New)
    const dataConfigSOX2New = getArray_ConfigSOX2(dataConfigSOX2.data)
    const dataConfigSOX3New = getArray_ConfigSOX3(dataConfigSOX3.data)
    const dataConfigSOX = [...dataConfigSOX1New, ...dataConfigSOX2New, ...dataConfigSOX3New]
    /* dataConfigSOX1New.forEach((item) => {
      console.log(item)
    }) */
    process.send({ API: 'FC04ConfigSOX', Arg: dataConfigSOX, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.ConfigSOX.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04ConfigSOX 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`SOX参数致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}

/**
 * 分块读取寄存器的通用函数
 * @param {Object} mtclient - Modbus客户端
 * @param {number} startAddr - 起始地址
 * @param {number} totalCount - 总寄存器数量
 * @param {string} registerType - 寄存器类型 ('Input Registers' 或 'Holding Registers')
 * @returns {Array} 读取的数据数组
 */
async function readRegistersChunked(mtclient, startAddr, totalCount, registerType) {
  const MAX_PER_READ = 120
  const aggregated = []
  let addr = startAddr
  let remaining = totalCount

  while (remaining > 0) {
    const count = Math.min(MAX_PER_READ, remaining)
    let data
    if (registerType === 'Input Registers') {
      const result = await retryRead(
        () => mtclient.client.readInputRegisters(addr, count),
        mtclient
      )
      data = result.data
    } else {
      const result = await retryRead(
        () => mtclient.client.readHoldingRegisters(addr, count),
        mtclient
      )
      data = result.data
    }

    aggregated.push(...data)
    addr += count
    remaining -= count
  }
  return aggregated
}

/**
 * 读取单体校准和滤波值
 * @param {Object} mtclient - Modbus客户端
 * @param {Object} afeConfig - AFE配置
 * @returns {Object} 校准和滤波值数据
 */
async function readModbusData_vtSetData(mtclient) {
  try {
    const afeConfig = {
      bmuTotal: mtclient.bmuTotal || 5,
      cellsPerBMU: mtclient.afeConfig?.reduce((sum, afe) => sum + afe.vltgPerAFE, 0) || 48,
      tempsPerBMU: mtclient.afeConfig?.reduce((sum, afe) => sum + afe.tempPerAFE, 0) || 8
    }
    const { bmuTotal, cellsPerBMU, tempsPerBMU } = afeConfig
    const bmuCount = bmuTotal ?? 1
    const ip = mtclient.mbsHost

    // 调试信息：验证配置参数
    /*  console.log('[VT Set Data] 配置参数:', {
      bmuTotal,
      cellsPerBMU,
      tempsPerBMU,
      bmuCount
    }) */

    // 读取单体温度校准值 - 连续排布，每个寄存器代表一个单体温度
    const tempCaliRegsPerBMU = tempsPerBMU
    const totalTempCaliRegs = bmuCount * tempCaliRegsPerBMU
    const tempCaliData = await readRegistersChunked(
      mtclient,
      0x0100,
      totalTempCaliRegs,
      'Holding Registers'
    )

    // 读取单体电压校准值 - 连续排布，每个寄存器代表一个单体电压
    const vltgCaliRegsPerBMU = cellsPerBMU
    const totalVltgCaliRegs = bmuCount * vltgCaliRegsPerBMU
    const vltgCaliData = await readRegistersChunked(
      mtclient,
      0x1100,
      totalVltgCaliRegs,
      'Holding Registers'
    )

    // 读取单体温度滤波值 - 连续排布，按bit排布
    // 修正：按总bit数计算寄存器数量，而不是按BMU分段
    const totalTempBits = bmuCount * tempsPerBMU
    const totalTempFilterRegs = Math.ceil(totalTempBits / 16)

    // 调试信息：验证温度滤波值计算
    /*  console.log('[VT Set Data] 温度滤波值计算:', {
      totalTempBits,
      totalTempFilterRegs,
      expectedRegs: Math.ceil((bmuCount * tempsPerBMU) / 16)
    }) */

    const tempFilterData = await readRegistersChunked(
      mtclient,
      0x2100,
      totalTempFilterRegs,
      'Holding Registers'
    )

    // 读取单体电压滤波值 - 连续排布，按bit排布
    // 修正：按总bit数计算寄存器数量，而不是按BMU分段
    const totalVltgBits = bmuCount * cellsPerBMU
    const totalVltgFilterRegs = Math.ceil(totalVltgBits / 16)

    // 调试信息：验证电压滤波值计算
    /* console.log('[VT Set Data] 电压滤波值计算:', {
      totalVltgBits,
      totalVltgFilterRegs,
      expectedRegs: Math.ceil((bmuCount * cellsPerBMU) / 16)
    }) */

    const vltgFilterData = await readRegistersChunked(
      mtclient,
      0x2200,
      totalVltgFilterRegs,
      'Holding Registers'
    )

    // 构建原始数据结构 - 单体校准值
    const allElements = []

    // 按BMU分配元素
    for (let bmuIdx = 0; bmuIdx < bmuCount; bmuIdx++) {
      const tempStartIdx = bmuIdx * tempCaliRegsPerBMU
      const tempEndIdx = tempStartIdx + tempCaliRegsPerBMU
      const vltgStartIdx = bmuIdx * vltgCaliRegsPerBMU
      const vltgEndIdx = vltgStartIdx + vltgCaliRegsPerBMU

      // 温度数据
      const tempData = tempCaliData.slice(tempStartIdx, tempEndIdx)
      const tempElements = getArray_Temp(tempData)[0].element
      allElements.push(...tempElements)

      // 电压数据
      const vltgData = vltgCaliData.slice(vltgStartIdx, vltgEndIdx)
      const vltgElements = getArray_Vltg(vltgData)[0].element
      allElements.push(...vltgElements)
    }

    // 构建原始数据结构
    const resultArray = [
      {
        classification: '单体温度校准值',
        config: {
          bmuTotal: bmuCount,
          afeTotal: afeConfig.afeTotal ?? 1,
          cellsPerBMU: tempsPerBMU
        },
        element: []
      },
      {
        classification: '单体电压校准值',
        config: {
          bmuTotal: bmuCount,
          afeTotal: afeConfig.afeTotal ?? 1,
          cellsPerBMU: cellsPerBMU
        },
        element: []
      }
    ]

    // 按BMU分配元素到结果数组
    const elementsPerBMU = tempsPerBMU + cellsPerBMU
    for (let bmuIdx = 0; bmuIdx < bmuCount; bmuIdx++) {
      const baseIndex = bmuIdx * elementsPerBMU

      // 温度数据分配
      resultArray[0].element.push(
        ...allElements
          .slice(baseIndex, baseIndex + tempsPerBMU)
          .map((item) => ({ ...item, BMU: bmuIdx + 1 }))
      )

      // 电压数据分配
      resultArray[1].element.push(
        ...allElements
          .slice(baseIndex + tempsPerBMU, baseIndex + elementsPerBMU)
          .map((item) => ({ ...item, BMU: bmuIdx + 1 }))
      )
    }

    // 发送单体校准值数据
    process.send({
      API: 'FC04VtSetData',
      Arg: resultArray,
      deviceIp: ip
    })

    // 处理滤波值数据 - 使用原始的数据结构
    const tempShieldData = getShieldStatus(
      tempFilterData,
      '温度',
      bmuCount,
      tempsPerBMU,
      totalTempFilterRegs
    )

    const voltShieldData = getShieldStatus(
      vltgFilterData,
      '电压',
      bmuCount,
      cellsPerBMU,
      totalVltgFilterRegs
    )

    const VTShieldData = [...tempShieldData, ...voltShieldData]

    // 发送滤波值数据
    process.send({
      API: 'FC04VtFilterData',
      Arg: VTShieldData,
      deviceIp: ip
    })

    return {
      resultArray,
      VTShieldData
    }
  } catch (error) {
    console.error('读取单体校准和滤波值失败:', error)
    throw error
  }
}

const readModbusData_balanceData = async function (mtclient) {
  /*   console.log('进入均衡读取') */
  let ip = mtclient.mbsHost
  let currentAddrBalance = 0xd300
  let addrNum = mtclient.bmuTotal * 8
  const vltgAddressNum = mtclient.afeConfig?.reduce((sum, afe) => sum + afe.vltgPerAFE, 0) ?? 1
  // 初始化一个数组来存储所有的温度和电压数据
  if (mtclient.isStopped && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const dataBalance = await mtclient.client.readInputRegisters(currentAddrBalance, addrNum)
    //mtclient.rxCount++
    const dataBalanceNew = getArray_Balance(dataBalance.data, vltgAddressNum)
    /*     console.log('均衡参数：', dataBalanceNew[0].element)
     */ process.send({ API: 'FC04BalanceData', Arg: dataBalanceNew, deviceIp: ip })
  } catch (e) {
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`读取均衡参数时出错:`, e.message)
  }
}
const readModbusData_balanceDataForCell = async function (mtclient) {
  let ip = mtclient.mbsHost
  let currentAddrBalance = 0xd300
  // 新布局：单体连续存放，按总单体数计算寄存器数量（1寄存器=16节）
  const vltgAddressNum = mtclient.afeConfig?.reduce((sum, afe) => sum + afe.vltgPerAFE, 0) ?? 1
  const regsPerBMU = Math.ceil(vltgAddressNum / 16)
  const totalCells = (mtclient.bmuTotal ?? 1) * vltgAddressNum
  let addrNum = regsPerBMU * (mtclient.bmuTotal ?? 1)
  // 初始化一个数组来存储所有的温度和电压数据
  if (mtclient.isStopped && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const dataBalance = await mtclient.client.readInputRegisters(currentAddrBalance, addrNum)
    //await delay(1)
    //mtclient.rxCount++
    const dataBalanceNew = getArray_Balance(dataBalance.data, vltgAddressNum, regsPerBMU)
    /*  console.log('均衡参数：', dataBalanceNew[0].element) */
    process.send({ API: 'FC04BalanceDataForCell', Arg: dataBalanceNew, deviceIp: ip })
  } catch (e) {
    if (isTimeoutError(e) && mtclient.client.isOpen && !mtclient.isStopped) {
      console.warn(`IP ${mtclient.mbsHost} FC04BalanceDataForCell 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`均衡数据致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_disconnectData = async function (mtclient) {
  let ip = mtclient.mbsHost
  let currentAddrdisconnectNum = 0x4220
  let currentAddrdisconnect1 = 0xd000
  let currentAddrdisconnect2 = 0xd10c
  let currentAddrdisconnect3 = 0xd20c
  let currentAddrDaisyChain = 0x4200 // 单向菊花链断连位置的起始地址

  // 计算需要读取的寄存器数量
  const config = {
    bmuTotal: mtclient.bmuTotal || 5, // 实际BMU数量
    afeTotal: mtclient.AFETotal
  }

  // 获取每个BMU的电压和温度数量
  const cellsPerBMU = mtclient.afeConfig?.reduce((sum, afe) => sum + afe.vltgPerAFE, 0) ?? 1
  const tempsPerBMU = mtclient.afeConfig?.reduce((sum, afe) => sum + afe.tempPerAFE, 0) ?? 1

  // 新的连续bit排布方式：按总bit数计算寄存器数量
  const totalVoltBits = config.bmuTotal * cellsPerBMU
  const totalTempBits = config.bmuTotal * tempsPerBMU
  const voltRegisters = Math.ceil(totalVoltBits / 16)
  const tempRegisters = Math.ceil(totalTempBits / 16)

  // 基础状态寄存器数量（前12个寄存器为基础状态）
  const baseRegisters = 12

  // 计算总寄存器数量
  const phase1Registers = baseRegisters + voltRegisters
  const phase2Registers = tempRegisters

  // 初始化一个数组来存储所有的温度和电压数据
  if (mtclient.isStopped && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }

  try {
    //mtclient.txCount++
    const dataDisconnectNum = await mtclient.client.readInputRegisters(currentAddrdisconnectNum, 4)
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataDisconnectBMUCellV = await readRegistersChunked(
      mtclient,
      currentAddrdisconnect1,
      phase1Registers,
      'Input Registers'
    )
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataDisconnectCellT = await readRegistersChunked(
      mtclient,
      currentAddrdisconnect2,
      phase2Registers,
      'Input Registers'
    )
    //await delay(1)
    //mtclient.rxCount++
    //mtclient.txCount++
    const dataDisconnectAFE = await mtclient.client.readInputRegisters(
      currentAddrdisconnect3,
      config.bmuTotal
    )

    // 读取单向菊花链断连位置数据
    const dataDaisyChain = await mtclient.client.readInputRegisters(
      currentAddrDaisyChain,
      config.bmuTotal
    )

    //await delay(1)
    //mtclient.rxCount++
    /*     console.log('dataDisconnectBMUCellV is:', dataDisconnectBMUCellV) */
    const dataDisconnectNumNew = getDisconnectArrayNum(dataDisconnectNum.data)
    const dataDisconnectBMUNew = getDisconnectArrayBMU(
      dataDisconnectBMUCellV.slice(0, baseRegisters), // 前12个寄存器为基础状态
      config.bmuTotal
    )

    // 新的连续bit排布方式：传递总寄存器数量而不是按BMU分段
    const dataDisconnectCellVNew = getDisconnectArrayCellVT(
      dataDisconnectBMUCellV.slice(baseRegisters), // 从第13个寄存器开始是电压掉线数据
      '电压采集状态',
      cellsPerBMU,
      config.bmuTotal,
      voltRegisters // 传递总寄存器数量
    )
    const dataDisconnectCellTNew = getDisconnectArrayCellVT(
      dataDisconnectCellT,
      '温度采集状态',
      tempsPerBMU,
      config.bmuTotal,
      tempRegisters // 传递总寄存器数量
    )
    /*   console.log('dataDisconnectAFE is:', dataDisconnectAFE.data) */
    const dataDisconnectAFENew = getDisconnectArrayAFE(
      dataDisconnectAFE.data,
      mtclient.AFETotal,
      config.bmuTotal
    )

    // 解析单向菊花链断连位置数据
    const dataDaisyChainNew = getDisconnectDaisyChain(dataDaisyChain.data, config.bmuTotal)

    const dataDisconnectNew = [
      ...dataDisconnectNumNew,
      ...dataDisconnectAFENew,
      ...dataDisconnectBMUNew,
      ...dataDisconnectCellVNew,
      ...dataDisconnectCellTNew,
      ...dataDaisyChainNew // 添加单向菊花链断连位置数据
    ]
    process.send({ API: 'FC04DisconnectData', Arg: dataDisconnectNew, deviceIp: ip })
    return dataDisconnectNew
  } catch (e) {
    if (isTimeoutError(e) && mtclient.client.isOpen && !mtclient.isStopped) {
      console.warn(`IP ${mtclient.mbsHost} FC04DisconnectData 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`断线信息致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_upgradeData = async function (mtclient) {
  /*   console.log(mtclient.modules.Upgrade) */
  let ip = mtclient.mbsHost
  const currentAddrUpgrade = 0xcb00
  if (!mtclient.client.isOpen) {
    /* console.log(`读取升级反馈时端口关闭: ${mtclient.client.isOpen}`) */
    process.send({
      API: 'connection-status',
      ip: mtclient.mbsHost,
      success: false,
      error: 'interrupted'
    })
    mtclient.mbsState = MBS_STATE_INIT
  }
  try {
    //mtclient.txCount++
    const dataUpgrade = await mtclient.client.readHoldingRegisters(currentAddrUpgrade, 10)
    //await delay(1)
    //mtclient.rxCount++
    const dataUpgradeNew = getUpgradeData(dataUpgrade.data)
    /*     console.log(`IP ${ip} 读取升级数据:`, dataUpgradeNew[0])
     */ process.send({ API: 'FC04UpgradeData', Arg: dataUpgradeNew, deviceIp: ip })
    /*  console.log(dataUpgradeNew[0]) */
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.Upgrade.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04UpgradeData 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(
      `升级信息致命读取错误 ${mtclient.mbsHost}: ${e.message},端口是否打开: ${mtclient.client.isOpen},升级数据是否停止读取：${mtclient.modules.Upgrade.isStoppedParams}`
    )
  }
}
const readModbusData_adaptData = async function (mtclient) {
  let ip = mtclient.mbsHost
  const currentAddrAdapt = 0xc20f
  if (mtclient.modules.Adapt.isStoppedParams === true && !mtclient.client.isOpen) {
    //console.log(`主动终止读取循环 IP: ${mtclient.mbsHost}`)
    return
  }
  try {
    //mtclient.txCount++
    const dataAdapt = await mtclient.client.readHoldingRegisters(currentAddrAdapt, 4)
    //await delay(1)
    //mtclient.rxCount++
    const dataAdaptNew = getAdaptData(dataAdapt.data)
    /*     dataAdaptNew.forEach((item) => {
      console.log(item.element)
    }) */
    process.send({ API: 'FC04AdaptData', Arg: dataAdaptNew, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.Adapt.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04AdaptData 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`自适应致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_PowerMap = async function (mtclient) {
  if (mtclient.modules.PowerMap.isStoppedParams === true && !mtclient.client.isOpen) {
    return
  }
  /* console.log(mtclient.sopRealtime) */
  let ip = mtclient.mbsHost
  const baseAddr = {
    rowsChrg: 0x5400,
    socChrg: 0x5406,
    tempChrg: 0x5436,
    socDis: 0x5466,
    tempDis: 0x5496,
    mapChrg: 0x54c6,
    mapDischrg: 0x55c7
  }
  // 一次最多读 64 个寄存器，4 次可读完 256 个
  const BLOCK_LEN = 64
  const PASS_COUNT = 4
  const MAX_ROWNUM = 16
  const rowNum = await mtclient.client.readHoldingRegisters(baseAddr.rowsChrg, 4)
  // 2. 读取限制参数
  async function readLimit(addr, groups) {
    const resp = await mtclient.client.readHoldingRegisters(addr, groups * 3)
    return resp.data
  }
  const socChrgRaw = await readLimit(baseAddr.socChrg, MAX_ROWNUM)
  const tempChrgRaw = await readLimit(baseAddr.tempChrg, MAX_ROWNUM)
  const socDisRaw = await readLimit(baseAddr.socDis, MAX_ROWNUM)
  const tempDisRaw = await readLimit(baseAddr.tempDis, MAX_ROWNUM)
  /*  console.log('socChrgRaw', socChrgRaw, MAX_ROWNUM)
  console.log('tempChrgRaw', tempChrgRaw, MAX_ROWNUM)
  console.log('socDisRaw', socDisRaw, MAX_ROWNUM)
  console.log('tempDisRaw', tempDisRaw, MAX_ROWNUM) */
  const colTitlesChrg = parseLimitGroups(socChrgRaw, MAX_ROWNUM, false)
  const rowTitlesChrg = parseLimitGroups(tempChrgRaw, MAX_ROWNUM, true)
  const colTitlesDis = parseLimitGroups(socDisRaw, MAX_ROWNUM, false)
  const rowTitlesDis = parseLimitGroups(tempDisRaw, MAX_ROWNUM, true)
  /*  console.log(rowTitlesDis) */
  // 3. 读取功率表数据
  let rawChrg = []
  let rawDis = []
  for (let pass = 0; pass < PASS_COUNT; pass++) {
    const offset = BLOCK_LEN * pass
    try {
      // 充电功率一块
      const respChrg = await mtclient.client.readHoldingRegisters(
        baseAddr.mapChrg + offset,
        BLOCK_LEN
      )
      // 放电功率一块
      const respDis = await mtclient.client.readHoldingRegisters(
        baseAddr.mapDischrg + offset,
        BLOCK_LEN
      )

      rawChrg = rawChrg.concat(respChrg.data)
      rawDis = rawDis.concat(respDis.data)
    } catch (e) {
      // 超时可跳过本次，继续下一次读取
      if (
        isTimeoutError(e) &&
        mtclient.client.isOpen &&
        mtclient.modules.PowerMap.isStoppedParams === false
      ) {
        console.warn(`IP ${ip} FC04PowerMap 读取短暂超时，pass=${pass}，跳过本次`)
        continue
      }

      // 其他错误一律视作致命，标记状态并退出
      mtclient.mbsState = MBS_STATE_FAIL_READ
      console.error(`功率 Map 致命读取错误 ${ip}: ${e.message}`)
      return
    }
  }

  // 4. 解析功率表并附加行标题
  function parseToTable(raw, rows, cols, isChrg) {
    const formatted = raw.map((v) => (v / 1000).toFixed(2))
    const table = []
    for (let r = 0; r < rows; r++) {
      const rowObj = { rowTitle: isChrg ? rowTitles[r] : rowTitlesDisChrg[r] }
      for (let c = 0; c < cols; c++) {
        rowObj[`C${c + 1}`] = formatted[r * cols + c]
      }
      table.push(rowObj)
    }
    return table
  }
  // 注入外层作用域的 rowTitles
  const rowTitles = rowTitlesChrg // placeholder
  const rowTitlesDisChrg = rowTitlesDis
  const parsedChrg = parseToTable(rawChrg, MAX_ROWNUM, MAX_ROWNUM, true)
  const parsedDis = parseToTable(rawDis, MAX_ROWNUM, MAX_ROWNUM, false)
  /*  console.log({
    colTitlesChrg,
    rowTitlesChrg
  }) */
  // 一次性发给主进程
  process.send({
    API: 'FC04PowerMap',
    Arg: {
      sopRealtime: mtclient.sopRealtime,
      chargeTable: parsedChrg,
      dischargeTable: parsedDis,
      colTitlesChrg,
      rowTitlesChrg,
      colTitlesDis,
      rowTitlesDis,
      rawSocChrg: socChrgRaw,
      rawTempChrg: tempChrgRaw,
      rawSocDis: socDisRaw,
      rawTempDis: tempDisRaw,
      rowNum: parseRowNum(rowNum.data),
      rawMapChrg: rawChrg,
      rawMapDis: rawDis
    },
    deviceIp: ip
  })
}
const readModbusData_PCS = async function (mtclient) {
  if (mtclient.modules.PCS.isStoppedParams === true && !mtclient.client.isOpen) {
    return
  }
  let ip = mtclient.mbsHost
  const addressPCS = 0x4500
  const addressPSCConfig = 0x0056
  try {
    const pcsData = await mtclient.client.readInputRegisters(addressPCS, 21)
    const pcsType = await mtclient.client.readHoldingRegisters(addressPSCConfig, 1)
    const pcsDataSend = parsePCSData(pcsData.data, pcsType.data[0])
    process.send({ API: 'FC04PCSData', Arg: pcsDataSend, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.PCS.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04PCSData 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`PCS读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_refrigeration = async function (mtclient) {
  if (mtclient.modules.refrigeration.isStoppedParams === true && !mtclient.client.isOpen) {
    return
  }
  let ip = mtclient.mbsHost
  const addressRefrigeration = 0x4580
  const addressRefrigerationConfig = 0x0057
  try {
    const refrigerationData = await mtclient.client.readInputRegisters(addressRefrigeration, 36)
    const refrigerationType = await mtclient.client.readHoldingRegisters(
      addressRefrigerationConfig,
      1
    )
    const refrigerationDataSend = parseRefrigerationData(
      refrigerationData.data,
      refrigerationType.data[0]
    )
    process.send({ API: 'FC04RefrigerationData', Arg: refrigerationDataSend, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.refrigeration.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04RefrigerationData 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`Refrigeration读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_Dehum = async function (mtclient) {
  if (mtclient.modules.dehum.isStoppedParams === true && !mtclient.client.isOpen) {
    return
  }
  let ip = mtclient.mbsHost
  const addressDehum = 0x4600
  const addressDehumConfig = 0x0058
  try {
    const dehumData = await mtclient.client.readInputRegisters(addressDehum, 17)
    const dehumType = await mtclient.client.readHoldingRegisters(addressDehumConfig, 1)
    const dehumDataSend = parseDehumData(dehumData.data, dehumType.data[0])
    process.send({ API: 'FC04DehumData', Arg: dehumDataSend, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.dehum.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04DehumData 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`DehumData读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_Fire = async function (mtclient) {
  if (mtclient.modules.fire.isStoppedParams === true && !mtclient.client.isOpen) {
    return
  }
  let ip = mtclient.mbsHost
  const addressFire = 0x4680
  const addressFireConfig = 0x0059
  let addrFireDetectorNum = mtclient.bmuTotal * 7
  let addressFireNum = addrFireDetectorNum + 10
  try {
    const fireData = await mtclient.client.readInputRegisters(addressFire, addressFireNum)
    const fireType = await mtclient.client.readHoldingRegisters(addressFireConfig, 1)
    const fireDataSend = parseFireData(fireData.data, fireType.data[0], mtclient.bmuTotal)
    /*   console.log(fireData.data)
    fireDataSend[0].element.forEach((item) => {
      console.log(item)
    }) */
    process.send({ API: 'FC04FireData', Arg: fireDataSend, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.fire.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04FireData 读取短暂超时，继续后续读取`)
      return // 本次读取跳过，但保持连接状态
    }
    // 其它情况（非超时、端口已关、已手动停止或模块未激活）都视为致命错误，触发重连
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`FireData读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_FaultConfig = async function (mtclient) {
  if (mtclient.modules.FaultConfig.isStoppedParams === true && !mtclient.client.isOpen) {
    return
  }
  const ip = mtclient.mbsHost
  const addressMap = {
    enableFaultMap: 0xd800,
    enableFaultMapNum: 20,
    enableReservedMap: 0xd820,
    enableReservedMapNum: 20,
    totalFault: 0xd840,
    totalFaultNum: 12
  }

  try {
    // 读取所有数据
    const enableFaultMapData = await mtclient.client.readInputRegisters(
      addressMap.enableFaultMap,
      addressMap.enableFaultMapNum
    )
    const enableReservedMapData = await mtclient.client.readInputRegisters(
      addressMap.enableReservedMap,
      addressMap.enableReservedMapNum
    )
    const totalFaultData = await mtclient.client.readInputRegisters(
      addressMap.totalFault,
      addressMap.totalFaultNum
    )
    // 解析故障使能映射和故障保留映射，合并为同一组数据
    const parsedFaultMap = parseMergedFaultMap(
      enableFaultMapData.data,
      enableReservedMapData.data,
      configFaultAction.faultsMap
    )

    // 解析总故障
    const parsedTotalFault = parseTotalFault(totalFaultData.data)

    /*  console.log(parsedDiDOStatus) */
    // 构建最终结果
    const result = {
      faultMap: parsedFaultMap,
      totalFault: parsedTotalFault
    }

    process.send({ API: 'FC04FaultConfigData', Arg: result, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.FaultConfig.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04FaultConfig 读取短暂超时，继续后续读取`)
      return
    }
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`故障配置致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
const readModbusData_DIDOConfig = async function (mtclient) {
  if (mtclient.modules.DIDOConfig.isStoppedParams === true && !mtclient.client.isOpen) {
    return
  }
  const ip = mtclient.mbsHost
  const addressMap = {
    diDOStatus: 0xd860,
    diDONum: 22
  }

  try {
    const diDOStatusData = await mtclient.client.readInputRegisters(
      addressMap.diDOStatus,
      addressMap.diDONum
    )
    // 解析DI/DO状态
    const parsedDiDOStatus = parseDiDOStatus(diDOStatusData.data)
    /*  console.log(parsedDiDOStatus) */
    // 构建最终结果
    const result = {
      diDOStatus: parsedDiDOStatus
    }
    process.send({ API: 'FC04DIDOConfigData', Arg: result, deviceIp: ip })
  } catch (e) {
    if (
      isTimeoutError(e) &&
      mtclient.client.isOpen &&
      mtclient.modules.DIDOConfig.isStoppedParams === false
    ) {
      console.warn(`IP ${mtclient.mbsHost} FC04DIDOConfigData 读取短暂超时，继续后续读取`)
      return
    }
    mtclient.mbsState = MBS_STATE_FAIL_READ
    console.error(`DIDO配置致命读取错误 ${mtclient.mbsHost}: ${e.message}`)
  }
}
export {
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
}

// 清理read.js中的缓存
function cleanupReadCaches() {
  const beforeMemory = process.memoryUsage()

  // 清理告警缓存
  const previousAlarmsSize = previousAlarms.size
  previousAlarms.clear()

  // 清理告警时间戳缓存
  const alarmFirstSeenTimeSize = alarmFirstSeenTime.size
  alarmFirstSeenTime.clear()

  // 清理数据缓存
  const cellDataCacheSize = cellDataCache.size
  cellDataCache.clear()

  const clusterDataCacheSize = clusterDataCache.size
  clusterDataCache.clear()

  const packDataCacheSize = packDataCache.size
  packDataCache.clear()

  // 清理状态缓存
  const readStatusCacheSize = readStatusCache.size
  readStatusCache.clear()

  // 强制垃圾回收
  if (global.gc) {
    global.gc()
  }

  const afterMemory = process.memoryUsage()
  const freedMemory = beforeMemory.heapUsed - afterMemory.heapUsed

  console.log(`[read.js清理] 清理完成，释放内存: ${(freedMemory / 1024 / 1024).toFixed(2)}MB`)
  console.log(
    `[read.js清理] 清理的缓存项: 历史告警(${previousAlarmsSize}) 告警时间戳(${alarmFirstSeenTimeSize}) 单体数据(${cellDataCacheSize}) 簇数据(${clusterDataCacheSize}) 包数据(${packDataCacheSize}) 状态缓存(${readStatusCacheSize})`
  )

  return freedMemory
}

// 添加状态变化跟踪，避免重复打印日志
const readStatusCache = new Map() // key: ip, value: { isSetDataExport, isStopped }

// 导出清理函数
export { cleanupReadCaches }

// 添加一个函数来重置状态缓存
function resetReadStatusCache() {
  readStatusCache.clear()
  console.log('[数据缓存] 状态缓存已重置')
}

// 导出重置函数
export { resetReadStatusCache }
