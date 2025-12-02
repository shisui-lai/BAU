/**
 * 事件记录导出功能模块
 * 负责事件记录的读取、缓存、CSV生成等功能
 */

const fs = require('fs')
const path = require('path')
import { EVENT_RECORD_R } from './table.js'
import { formatEventRecordField } from '../protocol/eventRecordFormatter'
import { RAW_EXPORT_DIR } from './mqttExport/paths.js'

/**
 * 将寄存器数组转换为字节数组（用于CRC计算）
 * @param {number[]} registers - 寄存器数组（每个元素为16位无符号整数）
 * @returns {number[]} 字节数组
 */
function regsToBytes(registers) {
  const bytes = []
  for (const reg of registers) {
    // 小端序：低字节在前，高字节在后
    bytes.push(reg & 0xFF)        // 低字节
    bytes.push((reg >> 8) & 0xFF) // 高字节
  }
  return bytes
}

/**
 * 计算CRC16校验值（Modbus CRC16算法）
 * @param {number[]} data - 字节数组
 * @returns {number} CRC16校验值
 */
function computeCRC16(data) {
  let crc = 0xffff
  for (let b of data) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      if (crc & 0x0001) {
        crc = (crc >>> 1) ^ 0xa001
      } else {
        crc = crc >>> 1
      }
    }
  }
  return crc
}

/**
 * 验证事件记录的CRC校验
 * @param {Object} recordData - 事件记录数据对象
 * @returns {string} 校验结果："有效" 或 "无效"
 */
function validateEventRecordCRC(recordData) {
  try {
    // 获取原始寄存器数据
    const rawRegisters = recordData.rawRegisters
    if (!rawRegisters || !Array.isArray(rawRegisters) || rawRegisters.length !== 128) {
      console.warn('[CRC校验] 原始寄存器数据无效，无法进行CRC校验')
      return '无效'
    }

    // 前127个寄存器用于CRC计算
    const dataRegsForCrc = rawRegisters.slice(0, 127)
    // 第128个寄存器存储CRC值
    const expectedCrc = rawRegisters[127]

    // 计算实际CRC值
    const actualCrc = computeCRC16(regsToBytes(dataRegsForCrc))

    // 比较CRC值
    const crcOk = actualCrc === expectedCrc

    return crcOk ? '有效' : '无效'
  } catch (error) {
    console.error('[CRC校验] CRC校验过程中发生错误:', error)
    return '无效'
  }
}

// 事件记录读取状态变量
let isReadingEvent = false
let eventReadingBlockId = null   // 当前读取的堆ID
let eventReadingOffset = 0       // 读取偏移量（起始偏移量）
let eventReadingTotal = 0         // 总记录数
let eventReadingCurrent = 0      // 当前已读取记录数
let eventReadingCanceled = false // 是否已取消
let eventReadingError = false    // 是否已发送错误通知（避免重复发送）
let eventRecordDataCache = new Map() // 缓存已读取的事件记录数据（key: recordIndex=请求偏移量, value: parsedData）
let currentSaveDir = ''          // 当前保存目录

// 事件记录读取等待机制：使用Promise等待响应
// key: recordIndex（请求偏移量，即offsetRead + sendIndex）
// value: { resolve, reject, requestedRecordIndex }
let eventRecordResponseWaiters = new Map()

// 进度更新批次大小
const PROGRESS_BATCH = 100

// 并行发送配置
const SEND_INTERVAL_MS = 20 // 发送间隔（毫秒），20ms = 50 req/s
let eventReadingSentCount = 0 // 已发送请求数量
let eventReadingCompletedCount = 0 // 已完成请求数量（成功或失败）

// 映射关系验证：记录请求recordIndex和对应的设备RecordOffset
let mappingVerification = [] // 存储映射关系：{ requestedRecordIndex, deviceRecordOffset }


// 响应顺序检测：用于判断设备是否按顺序响应
let lastReceivedRecordOffset = null // 上一个收到的RecordOffset
let responseOrderStats = {
  total: 0,
  inOrder: 0,
  outOfOrder: 0,
  firstResponse: true
} // 响应顺序统计

/**
 * 处理事件记录数据响应
 * 
 * 字段说明：
 * - 请求topic: bms/host/s2d/b${blockId}/event_record_r (发布)
 * - 请求payload: 2字节uint16_t，表示要读取的事件记录偏移量（0~N），小端序
 * - 响应topic: bms/host/s2d/b${blockId}/event_record_r (订阅)
 * - 响应格式: 数据长度(2字节) + 事件记录偏移量(2字节) + 事件记录数据(128 * 2字节 = 256字节) = 260字节
 * - RecordOffset: 设备返回的字段，在响应的第2-3字节（小端序），表示设备内部的实际记录索引
 * - recordIndex: 代码中使用的变量，表示请求偏移量（offsetRead + sendIndex），用于标识和匹配请求与响应
 * 
 * 匹配策略：使用设备返回的RecordOffset直接匹配对应的请求等待器
 * 
 * @param {Object} responseData - 响应数据对象，包含RecordOffset, baseConfig, data, result等
 * @param {number} blockId - 堆ID
 * @param {Object} client - MQTT客户端（未使用，保留以兼容接口）
 */
export function processEventRecordResponse(responseData, blockId, client) {
  if (!isReadingEvent || eventReadingBlockId !== blockId) {
    return
  }

  const { RecordOffset, RecordCount, records, baseConfig, data, result, rawRegisters, rawBuffer } = responseData

  if (result?.error) {
    // 错误响应：批量请求错误
    // 注意：错误响应时，RecordOffset可能是undefined（因为baseConfig是空对象）
    // 错误响应是1字节错误码，无法确定具体是哪个请求出错
    // 策略：如果RecordOffset有效，使用它；否则，错误可能影响最近的请求或所有未完成的请求
    
    if (RecordOffset !== undefined && !isNaN(RecordOffset) && RecordCount !== undefined) {
      // RecordOffset和RecordCount都有效，按原逻辑处理
      const recordCount = RecordCount || 1
      for (let i = 0; i < recordCount; i++) {
        const currentOffset = RecordOffset + i
        const waiter = eventRecordResponseWaiters.get(currentOffset)
        if (waiter) {
          eventRecordResponseWaiters.delete(currentOffset)
          eventReadingCompletedCount++
          waiter.reject(new Error(data?.message || `参数错误 (code: ${data?.code})`))
        } else {
          // 如果没有找到等待器，说明可能是延迟响应或RecordOffset不匹配
          console.warn(`[MQTT Child] 事件记录读取错误，但未找到对应的等待器: RecordOffset=${currentOffset}, error=${data?.message || `code: ${data?.code}`}`)
        }
      }
    } else {
      // RecordOffset无效，错误响应可能对应最近的请求
      // 由于无法确定具体是哪个请求，我们尝试处理第一个等待的记录
      // 注意：这可能导致部分记录无法正确处理，但至少不会导致NaN错误
      const firstWaiterKey = eventRecordResponseWaiters.keys().next().value
      if (firstWaiterKey !== undefined) {
        const waiter = eventRecordResponseWaiters.get(firstWaiterKey)
        if (waiter) {
          eventRecordResponseWaiters.delete(firstWaiterKey)
          eventReadingCompletedCount++
          waiter.reject(new Error(data?.message || `参数错误 (code: ${data?.code})`))
          console.warn(`[MQTT Child] 事件记录读取错误，RecordOffset无效，已处理第一个等待的记录: recordIndex=${firstWaiterKey}, error=${data?.message || `code: ${data?.code}`}`)
        }
      } else {
        console.warn(`[MQTT Child] 事件记录读取错误，但未找到任何等待器: error=${data?.message || `code: ${data?.code}`}`)
      }
    }
  } else {
    // 成功响应：处理多条记录
    const recordCount = RecordCount || (records ? records.length : 1)
    
    // 检测响应顺序（用于判断设备是否按顺序响应）- 使用第一条记录的偏移量
    responseOrderStats.total++
    if (responseOrderStats.firstResponse) {
      responseOrderStats.firstResponse = false
      lastReceivedRecordOffset = RecordOffset
      responseOrderStats.inOrder++
    } else {
      if (RecordOffset > lastReceivedRecordOffset) {
        responseOrderStats.inOrder++
      } else {
        responseOrderStats.outOfOrder++
      }
      lastReceivedRecordOffset = RecordOffset
    }
    
    // 处理每条记录
    for (let i = 0; i < recordCount; i++) {
      // 【关键修复】新协议中每条记录都有自己的偏移量，应该使用记录中的RecordOffset，而不是计算值
      const record = records && records[i] ? records[i] : null
      const recordOffset = record ? record.RecordOffset : (RecordOffset + i)  // 优先使用记录中的偏移量
      const currentOffset = recordOffset  // 使用记录的实际偏移量
      
      // 如果records数组存在，使用数组中的数据；否则使用向后兼容的单条记录数据
      const recordBaseConfig = record ? record.baseConfig : baseConfig
      const recordData = record ? record.data : data
      const recordRawRegisters = record ? record.rawRegisters : rawRegisters
      const recordRawBuffer = record ? record.rawBuffer : rawBuffer
      
      // 查找对应的等待器（使用记录的实际偏移量）
      const waiter = eventRecordResponseWaiters.get(currentOffset)
      
      // 如果找不到等待器，记录警告（但不影响功能）
      if (!waiter) {
        // 延迟响应或RecordOffset不匹配，静默处理
        continue
      }
      
      // 找到对应的等待器，处理该条记录
      eventRecordResponseWaiters.delete(currentOffset)
      eventReadingCompletedCount++
      
      // 记录映射关系验证
      mappingVerification.push({
        requestedRecordIndex: currentOffset, // 请求的recordIndex
        deviceRecordOffset: currentOffset     // 设备返回的RecordOffset
      })

      // 检查缓存是否已存在（覆盖旧数据，不影响功能）
      if (eventRecordDataCache.has(currentOffset)) {
        // RecordOffset已存在，覆盖旧数据（可能是重复响应）
      }

      // 缓存数据（使用RecordOffset作为key）
      eventRecordDataCache.set(currentOffset, {
        recordIndex: currentOffset, // 使用RecordOffset作为recordIndex
        baseConfig: recordBaseConfig,
        data: recordData,
        rawRegisters: recordRawRegisters,
        rawBuffer: recordRawBuffer,
        deviceRecordOffset: currentOffset
      })

      // 通知等待的Promise
      waiter.resolve({ recordIndex: currentOffset, baseConfig: recordBaseConfig, data: recordData })
    }
  }
}

/**
 * 开始读取事件记录
 * @param {number} blockId - 堆ID
 * @param {number} offsetRead - 读取偏移量
 * @param {number} totalRead - 总记录数
 * @param {string} exportDir - 导出目录路径
 * @param {Object} client - MQTT客户端
 */
export async function startReadingEvent(blockId, offsetRead, totalRead, exportDir, client) {
  if (isReadingEvent) {
    console.warn('[MQTT Child] 事件记录读取已在进行中，忽略新请求')
    return
  }

  if (!client) {
    throw new Error('MQTT客户端未初始化')
  }

  isReadingEvent = true
  eventReadingBlockId = blockId
  eventReadingOffset = offsetRead
  eventReadingTotal = totalRead
  eventReadingCurrent = 0
  eventReadingCanceled = false
  eventReadingError = false  // 重置错误标志
  eventReadingSentCount = 0  // 重置已发送数量
  eventReadingCompletedCount = 0  // 重置已完成数量
  eventRecordDataCache.clear()
  eventRecordResponseWaiters.clear() // 清空等待器
  currentSaveDir = exportDir || ''

  // 重置映射关系验证
  mappingVerification = []
  
  // 重置响应顺序统计
  lastReceivedRecordOffset = null
  responseOrderStats = {
    total: 0,
    inOrder: 0,
    outOfOrder: 0,
    firstResponse: true
  }


  // 并行发送模式：间隔20ms发送请求，不等待响应
  // 批量请求配置：每次最多10条记录
  const MAX_RECORDS_PER_REQUEST = 10
  
  return new Promise((resolve, reject) => {
    let sendIndex = 0 // 当前发送索引（记录数）
    let sendTimer = null // 发送定时器

    // 进度更新定时器
    let progressTimer = null
    const updateProgress = () => {
      if (!isReadingEvent) return
      const current = eventRecordDataCache.size
      process.send({
        type: 'readEventProgress',
        data: {
          blockId,
          current: current,
          total: eventReadingTotal
        }
      })
    }
    // 每100ms更新一次进度
    progressTimer = setInterval(updateProgress, 100)

    // 批量发送请求的函数（每次最多4条记录）
    
    const sendRequest = (offset, count) => {
      if (eventReadingCanceled || !isReadingEvent) {
        return
      }

      // 读取事件记录数据（payload为偏移量值 + 数量）
      const recordTopic = `bms/host/s2d/b${blockId}/event_record_r`
      // 根据协议：event_record_r的请求payload是偏移量值(2字节uint16_t) + 读取事件记录数量(2字节uint16_t)
      const payload = Buffer.alloc(4)
      payload.writeUInt16LE(offset, 0)   // 偏移量
      payload.writeUInt16LE(count, 2)    // 数量
      const recordPayloadHex = payload.toString('hex')

      // 为本次请求的每条记录创建等待器
      for (let i = 0; i < count; i++) {
        const recordIndex = offset + i
        eventRecordResponseWaiters.set(recordIndex, {
          resolve: (data) => {
            // 注意：resolve时，等待器可能已经被processEventRecordResponse删除
            // 这里不需要再次删除，因为processEventRecordResponse已经处理了
          },
          reject: (error) => {
            // 注意：reject时，等待器可能已经被processEventRecordResponse删除
            // 这里不需要再次删除，因为processEventRecordResponse已经处理了
          },
          requestedRecordIndex: recordIndex // 保存请求的recordIndex，用于调试
        })
      }

      // 发布读取请求（不等待响应）
      const payloadBuf = Buffer.from(recordPayloadHex, 'hex')
      client.publish(recordTopic, payloadBuf, (err) => {
        if (err) {
          // 发布失败，清理所有等待器
          console.error(`[MQTT Child] 发布读取请求失败: offset=${offset}, count=${count}, error=${err.message}`)
          for (let i = 0; i < count; i++) {
            const recordIndex = offset + i
            const waiter = eventRecordResponseWaiters.get(recordIndex)
            if (waiter) {
              eventRecordResponseWaiters.delete(recordIndex)
              eventReadingCompletedCount++
              waiter.reject(err)
            }
          }
        } else {
          // 发送成功（注意：这里只计数请求数，不是记录数）
          eventReadingSentCount++
        }
      })
    }

    // 开始发送请求（间隔20ms，批量发送，每批最多4条）
    const scheduleNextSend = () => {
      if (eventReadingCanceled || !isReadingEvent) {
        clearInterval(progressTimer)
        resolve()
        return
      }

      if (sendIndex < totalRead) {
        // 计算本次请求的偏移量和数量
        const currentOffset = offsetRead + sendIndex
        const remaining = totalRead - sendIndex
        const count = Math.min(remaining, MAX_RECORDS_PER_REQUEST)
        
        sendRequest(currentOffset, count)
        sendIndex += count  // 增加已发送的记录数

        // 如果还有更多请求要发送，安排下一个
        if (sendIndex < totalRead) {
          sendTimer = setTimeout(scheduleNextSend, SEND_INTERVAL_MS)
        }
      }
    }

    // 开始发送第一个请求
    scheduleNextSend()

    // 监听取消信号和完成状态（统一处理）
    const monitorInterval = setInterval(() => {
      // 检查是否已取消
      if (eventReadingCanceled || !isReadingEvent) {
        clearInterval(monitorInterval)
        clearInterval(progressTimer)
        if (sendTimer) clearTimeout(sendTimer)
        resolve()
        return
      }

      // 检查是否所有请求都已发送且所有响应都已收到
      // 注意：eventReadingSentCount 现在是请求数，eventReadingCompletedCount 是记录数
      const expectedRequestCount = Math.ceil(totalRead / MAX_RECORDS_PER_REQUEST)
      if (eventReadingSentCount === expectedRequestCount && eventReadingCompletedCount === totalRead) {
        clearInterval(monitorInterval)
        clearInterval(progressTimer)
        if (sendTimer) clearTimeout(sendTimer)
        
        resolve()
        return
      }
    }, 100)
  }).then(() => {
    // 统一处理完成/取消通知
    stopReadingEvent(blockId, eventReadingCanceled, eventReadingError)
  }).catch((error) => {
    // 致命错误处理
    eventReadingError = true
    console.error('[MQTT Child] 事件记录读取致命错误:', error)
    process.send({
      type: 'readEventError',
      data: {
        blockId,
        error: error.message || '未知错误',
        cachedCount: eventRecordDataCache.size,
        totalRequested: eventReadingTotal,
        failedAt: eventReadingCurrent
      }
    })
    stopReadingEvent(blockId, eventReadingCanceled, eventReadingError)
  })
}

/**
 * 停止读取事件记录（统一处理完成/取消）
 * @param {number} blockId - 堆ID
 * @param {boolean} wasCanceled - 是否被取消
 * @param {boolean} hasError - 是否已发送错误通知（避免重复发送）
 */
function stopReadingEvent(blockId, wasCanceled = false, hasError = false) {
  if (!isReadingEvent) {
    return
  }

  // 清理所有等待器
  eventRecordResponseWaiters.clear()

  isReadingEvent = false
  const savedBlockId = eventReadingBlockId
  eventReadingBlockId = null

  // 区分：如果是主动取消，就发 cancel；否则发 completed
  if (wasCanceled) {
    process.send({
      type: 'readEventCanceled',
      data: {
        blockId: savedBlockId,
        saveDir: currentSaveDir
      }
    })
  } else {
    // 更新最终成功读取的记录数
    const cachedCount = eventRecordDataCache.size
    eventReadingCurrent = cachedCount

    // 检查是否有成功缓存的数据
    if (cachedCount === 0) {
      // 没有成功读取任何数据
      // 如果已经在catch块中发送了错误通知（hasError=true），就不应该再发送
      if (!hasError) {
        console.error(`[MQTT Child] 事件记录读取失败: 未成功读取任何数据 (请求${eventReadingTotal}条，成功0条)`)
        process.send({
          type: 'readEventError',
          data: {
            blockId: savedBlockId,
            error: `未成功读取任何事件记录数据（请求${eventReadingTotal}条，成功0条）`,
            cachedCount: 0,
            totalRequested: eventReadingTotal,
            failedAt: 0
          }
        })
      }
      // 如果hasError=true，说明已经在catch块中发送了错误通知，这里不需要再发送
    } else {
      // 有成功缓存的数据，生成CSV文件
      // 即使hasError=true（catch块中发送了错误），如果有缓存数据，也应该生成CSV
      // 因为部分数据已成功读取
      const isPartial = cachedCount < eventReadingTotal
      if (isPartial) {
        console.warn(`[MQTT Child] 事件记录读取部分成功: blockId=${savedBlockId}, 缓存数据=${cachedCount}/${eventReadingTotal}`)
      }

      // 生成CSV文件
      try {
        generateEventRecordCSV(savedBlockId, currentSaveDir, cachedCount)
      } catch (csvError) {
        console.error(`[MQTT Child] CSV文件生成失败: ${csvError.message}`, csvError)
        // CSV生成失败不影响完成通知的发送
      }

      process.send({
        type: 'readEventCompleted',
        data: {
          blockId: savedBlockId,
          saveDir: currentSaveDir,
          cachedCount: cachedCount,
          totalRequested: eventReadingTotal,
          partial: isPartial
        }
      })
    }
  }
}

/**
 * 生成事件记录CSV文件
 * @param {number} blockId - 堆ID
 * @param {string} saveDir - 保存目录
 * @param {number} recordCount - 记录数量
 */
function generateEventRecordCSV(blockId, saveDir, recordCount) {
  if (recordCount === 0) {
    console.warn(`[MQTT Child] CSV生成跳过: recordCount=${recordCount}`)
    return
  }

  // 创建日期文件夹
  const now = new Date()
  const dateOnly = now.toISOString().split('T')[0] // YYYY-MM-DD
  // 优先使用调用方传入的保存目录；若未提供则回落到原有RAW_EXPORT_DIR
  const baseDir = (typeof saveDir === 'string' && saveDir.trim().length > 0) ? saveDir : RAW_EXPORT_DIR
  const eventFolderPath = path.join(baseDir, `Event_${dateOnly}`)

  // 确保目录存在
  try {
    fs.mkdirSync(eventFolderPath, { recursive: true })
  } catch (err) {
    console.error(`[MQTT Child] 创建目录失败: ${eventFolderPath}`, err)
    throw err
  }

  // 生成文件名：b1_YYYY-MM-DD_HH-MM-SS.csv
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const timestamp = `${dateOnly}_${hours}-${minutes}-${seconds}`
  const filename = `EventRecords_block${blockId}_${timestamp}.csv`
  const outputFile = path.join(eventFolderPath, filename)
  console.log(`[事件记录导出] 写入CSV: ${outputFile}`)

  // 创建写入流
  const csvStream = fs.createWriteStream(outputFile, { encoding: 'utf8', flags: 'w' })

  // 写入BOM（支持Excel正确识别UTF-8）
  csvStream.write('\uFEFF')

  // 从EVENT_RECORD_R表定义生成表头
  // 规则：跳过hide: true的字段，跳过bit类型字段（它们不单独占列）
  const csvHeaders = ['ID']
  const csvFieldKeys = [] // 保存字段key，用于数据行提取
  const csvFieldDefs = [] // 保存字段定义，用于格式化
  // 额外：建立字段到原始寄存器索引的映射，用于 300–305 特殊处理时按原始寄存器值输出
  const fieldRawIndexMap = new Map()
  {
    let regIndex = 0
    for (const field of EVENT_RECORD_R) {
      // bit字段不占用新的寄存器索引（依附于父寄存器），但我们也不需要映射它们
      if (field.type === 'bit') {
        continue
      }
      // 记录非bit字段在原始寄存器序列中的索引
      fieldRawIndexMap.set(field.key, regIndex)
      regIndex++
    }
  }

  // 时间字段列表（需要合并为一个时间戳字段）
  const timeFields = ['Year', 'Month', 'Day', 'Week', 'Hour', 'Minute', 'Second']
  let timeFieldsProcessed = false // 标记是否已处理时间字段

  // 需要合并的字段类别（参考reference项目，将相同class的字段合并为一个表头）
  // 注意：簇汇总模拟量三级告警需要按严重程度分开显示（严重/一般/轻微）
  const mergeableClasses = [
    '簇汇总硬件故障',
    '堆硬件故障'
  ]

  // 簇汇总模拟量三级告警的特殊合并规则：按严重程度分组
  // key: 合并后的表头名称, value: 匹配的字段key前缀
  const clusterAnalogAlarmMergeGroups = {
    '严重故障': ['ClusterAnalogAlarm_Severe1', 'ClusterAnalogAlarm_Severe2'],
    '一般故障': ['ClusterAnalogAlarm_Moderate1', 'ClusterAnalogAlarm_Moderate2'],
    '轻微故障': ['ClusterAnalogAlarm_Mild1', 'ClusterAnalogAlarm_Mild2']
  }

  // 用于跟踪需要合并的class：{ class: [field1, field2, ...] }
  const mergeableFieldsMap = new Map()

  // 用于跟踪簇汇总模拟量三级告警的合并组：{ groupName: [field1, field2, ...] }
  const clusterAnalogAlarmFieldsMap = new Map()

  // 用于跟踪已经添加到表头的class，避免重复添加
  const addedClasses = new Set()

  // 用于跟踪已经添加到表头的簇汇总模拟量三级告警组，避免重复添加
  const addedClusterAnalogAlarmGroups = new Set()

  for (const field of EVENT_RECORD_R) {
    // 跳过隐藏字段
    if (field.hide === true) {
      continue
    }

    // 跳过bit类型字段（它们依赖父寄存器，不单独占列）
    if (field.type === 'bit') {
      continue
    }

    // 处理时间字段：跳过单个时间字段，添加合并后的时间戳字段
    if (timeFields.includes(field.key)) {
      // 只在遇到第一个时间字段（Year）时添加时间戳列
      if (!timeFieldsProcessed && field.key === 'Year') {
        csvHeaders.push('时间戳')
        csvFieldKeys.push('Timestamp') // 使用特殊key标识时间戳
        csvFieldDefs.push({ key: 'Timestamp', label: '时间戳', isMerged: false }) // 虚拟字段定义
        timeFieldsProcessed = true
      }
      // 跳过其他时间字段（Month, Day, Week, Hour, Minute, Second）
      continue
    }

    // 检查是否是簇汇总模拟量三级告警字段（需要按严重程度分组合并）
    if (field.class === '簇汇总模拟量三级告警') {
      // 查找该字段属于哪个合并组
      let matchedGroup = null
      for (const [groupName, keyPrefixes] of Object.entries(clusterAnalogAlarmMergeGroups)) {
        if (keyPrefixes.includes(field.key)) {
          matchedGroup = groupName
          break
        }
      }

      if (matchedGroup) {
        // 将字段添加到对应的合并组
        if (!clusterAnalogAlarmFieldsMap.has(matchedGroup)) {
          clusterAnalogAlarmFieldsMap.set(matchedGroup, [])
        }
        clusterAnalogAlarmFieldsMap.get(matchedGroup).push(field)

        // 只在第一次遇到该组时添加表头
        if (!addedClusterAnalogAlarmGroups.has(matchedGroup)) {
          csvHeaders.push(matchedGroup) // 使用组名称作为表头（如"严重故障"）
          csvFieldKeys.push(`Merged_ClusterAnalogAlarm_${matchedGroup}`) // 使用特殊key标识合并字段
          csvFieldDefs.push({
            key: `Merged_ClusterAnalogAlarm_${matchedGroup}`,
            label: matchedGroup,
            class: field.class,
            mergeGroup: matchedGroup,
            isMerged: true, // 标记为合并字段
            isClusterAnalogAlarm: true // 标记为簇汇总模拟量三级告警
          })
          addedClusterAnalogAlarmGroups.add(matchedGroup)
        }
      } else {
        // 如果字段key不匹配任何合并组，按普通字段处理
        csvHeaders.push(field.label)
        csvFieldKeys.push(field.key)
        csvFieldDefs.push({ ...field, isMerged: false })
      }
    } else if (field.class && mergeableClasses.includes(field.class)) {
      // 其他需要合并的class（簇汇总硬件故障、堆硬件故障）
      // 将字段添加到合并映射中
      if (!mergeableFieldsMap.has(field.class)) {
        mergeableFieldsMap.set(field.class, [])
      }
      mergeableFieldsMap.get(field.class).push(field)

      // 只在第一次遇到该class时添加表头
      if (!addedClasses.has(field.class)) {
        csvHeaders.push(field.class) // 使用class名称作为表头
        csvFieldKeys.push(`Merged_${field.class}`) // 使用特殊key标识合并字段
        csvFieldDefs.push({
          key: `Merged_${field.class}`,
          label: field.class,
          class: field.class,
          isMerged: true // 标记为合并字段
        })
        addedClasses.add(field.class)
      }
    } else {
      // 普通字段：直接添加
      csvHeaders.push(field.label)
      csvFieldKeys.push(field.key)
      csvFieldDefs.push({ ...field, isMerged: false }) // 标记为非合并字段
    }
  }

  // 添加CRC校验列到表头末尾
  csvHeaders.push('CRC校验')

  // 写入表头（表头也需要CSV转义，以防label中包含逗号或引号）
  const escapedHeaders = csvHeaders.map(header => {
    const escaped = header.replace(/"/g, '""')
    return `"${escaped}"`
  })
  csvStream.write(escapedHeaders.join(',') + '\n')

  // 按recordIndex排序，写入数据行
  const sortedRecords = Array.from(eventRecordDataCache.entries())
    .sort((a, b) => a[0] - b[0]) // 按recordIndex排序

  let rowIndex = 1
  let skippedCount = 0
  let writtenCount = 0
  for (const [recordIndex, recordData] of sortedRecords) {
    const baseConfig = recordData.baseConfig || {}
    const rawRegisters = Array.isArray(recordData.rawRegisters) ? recordData.rawRegisters : []

    // 如果baseConfig为空，跳过
    if (!baseConfig || Object.keys(baseConfig).length === 0) {
      console.warn(`[CSV生成] 记录 ${recordIndex} 没有解析数据，跳过`)
      skippedCount++
      continue
    }

    writtenCount++

    // 生成CSV行：ID + 按字段顺序提取的值
    const row = [rowIndex++] // ID从1开始

    // 按照csvFieldKeys的顺序，从baseConfig中提取字段值并格式化
    for (let i = 0; i < csvFieldKeys.length; i++) {
      const fieldKey = csvFieldKeys[i]
      const fieldDef = csvFieldDefs[i]
      const eventType = Number(baseConfig.EventType || 0)
      // 标记：是否已处理过 Param4（后续字段为“Param1-4之后”）
      // 通过遍历时判断当前字段是否已经超过 Param4
      // 注意：我们不能依赖索引位置，因为表头可能包含合并字段，所以以key判断
      // 这里通过闭包变量在循环内维护
      if (i === 0) {
        // 在每行开始时初始化标志
        var afterParam4 = false
      }

      // 处理时间戳字段（合并时间字段）
      if (fieldKey === 'Timestamp') {
        const year = baseConfig.Year
        const month = baseConfig.Month
        const day = baseConfig.Day
        const hour = baseConfig.Hour
        const minute = baseConfig.Minute
        const second = baseConfig.Second

        // 格式化时间戳：YYYY-M-D-HH:mm:ss
        // 注意：Year, Month, Day, Hour, Minute, Second 在parseEventRecordRAW中已经BCD解码
        if (year !== undefined && month !== undefined && day !== undefined &&
            hour !== undefined && minute !== undefined && second !== undefined) {
          // 确保时分秒是两位数
          const pad2 = (num) => String(num).padStart(2, '0')
          const timestamp = `${year}-${month}-${day}-${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
          const escapedValue = timestamp.replace(/"/g, '""')
          row.push(`"${escapedValue}"`)
        } else {
          // 如果时间字段不完整，使用"/"占位
          row.push('"/"')
        }
        continue
      }

      // 特殊处理：当事件类型为 300–305 且当前字段位于 Param4 之后
      if (eventType >= 300 && eventType <= 305 && afterParam4) {
        // 如果是合并字段（如簇汇总模拟量三级告警、簇/堆硬件故障），改为输出对应原始寄存器的十六进制快照
        if (fieldDef.isMerged) {
          let mergedFields = []
          if (fieldDef.isClusterAnalogAlarm && fieldDef.mergeGroup) {
            mergedFields = clusterAnalogAlarmFieldsMap.get(fieldDef.mergeGroup) || []
          } else if (fieldDef.class) {
            mergedFields = mergeableFieldsMap.get(fieldDef.class) || []
          }
          const parts = []
          for (const f of mergedFields) {
            const idx = fieldRawIndexMap.get(f.key)
            if (idx === undefined) continue
            const v = rawRegisters[idx]
            if (typeof v === 'number') {
              parts.push('0x' + v.toString(16).toUpperCase().padStart(4, '0'))
            }
          }
          const mergedCellValue = parts.length > 0 ? parts.join(',') : '无'
          const escapedValue = mergedCellValue.replace(/"/g, '""')
          row.push(`"${escapedValue}"`)
          continue
        }
        // 普通字段：改为输出该字段对应寄存器的原始十六进制值
        const idx = fieldRawIndexMap.get(fieldKey)
        if (idx !== undefined && rawRegisters[idx] !== undefined) {
          const hexVal = '0x' + Number(rawRegisters[idx]).toString(16).toUpperCase().padStart(4, '0')
          const escapedValue = hexVal.replace(/"/g, '""')
          row.push(`"${escapedValue}"`)
        } else {
          row.push('"/"')
        }
        continue
      }

      // 处理合并字段（参考reference项目，将同类字段合并）
      if (fieldDef.isMerged) {
        let mergedFields = []

        // 判断是簇汇总模拟量三级告警还是其他合并字段
        if (fieldDef.isClusterAnalogAlarm && fieldDef.mergeGroup) {
          // 簇汇总模拟量三级告警：按严重程度分组
          mergedFields = clusterAnalogAlarmFieldsMap.get(fieldDef.mergeGroup) || []
        } else if (fieldDef.class) {
          // 其他合并字段（簇汇总硬件故障、堆硬件故障）
          mergedFields = mergeableFieldsMap.get(fieldDef.class) || []
        }

        const mergedValues = []

        // 遍历该组下的所有字段，收集格式化后的值
        for (const field of mergedFields) {
          const value = baseConfig[field.key]
          if (value === undefined || value === null) {
            continue // 跳过空值
          }

          // 格式化字段值
          let cellValue = formatEventRecordField(field.key, value, baseConfig, field)

          // 确保cellValue是字符串类型
          if (typeof cellValue !== 'string') {
            cellValue = String(cellValue)
          }

          // 过滤掉"无故障"、空字符串和"/"
          // 参考reference项目：只有所有字段都无故障时，才显示"无故障"
          // 如果至少有一个字段有故障信息，就合并所有非"无故障"的值
          if (cellValue && cellValue.trim() !== '' &&
              cellValue !== '无故障' && cellValue !== '/' &&
              cellValue !== '"/"') {
            mergedValues.push(cellValue)
          }
        }

        // 合并逻辑：如果所有字段都是"无故障"或空，显示"无故障"；否则合并所有非"无故障"的值
        let mergedCellValue
        if (mergedValues.length === 0) {
          // 所有字段都无故障或为空，显示"无故障"
          mergedCellValue = '无故障'
        } else {
          // 至少有一个字段有故障信息，用逗号连接所有故障信息
          // 参考reference项目：使用join(',')连接
          mergedCellValue = mergedValues.join(',')
        }

        // CSV转义
        const escapedValue = mergedCellValue.replace(/"/g, '""')
        row.push(`"${escapedValue}"`)
        continue
      }

      // 普通字段：直接处理
      const value = baseConfig[fieldKey]

      // 使用格式化函数处理字段值
      let cellValue = formatEventRecordField(fieldKey, value, baseConfig, fieldDef)

      // 确保cellValue是字符串类型（防止formatEventRecordField返回非字符串）
      if (typeof cellValue !== 'string') {
        console.warn(`[CSV生成] 记录${recordIndex} ${fieldKey}: formatEventRecordField返回了非字符串类型，值=${cellValue}，类型=${typeof cellValue}，已转换为字符串`)
        cellValue = String(cellValue)
      }

      if (
        fieldKey === 'EnableClusterFlag1' ||
        fieldKey === 'EnableClusterFlag2' ||
        fieldKey === 'ExitClusterFlag1' ||
        fieldKey === 'ExitClusterFlag2'
      ) {
        const bits = String(cellValue)
        if (/^[01]{10}$/.test(bits)) {
          const zwsPrefixed = '\u200B' + bits
          const escapedValue = zwsPrefixed.replace(/"/g, '""')
          row.push(`"${escapedValue}"`)
        } else {
          const escapedValue = bits.replace(/"/g, '""')
          row.push(`"${escapedValue}"`)
        }
      } else {
        const escapedValue = cellValue.replace(/"/g, '""')
        row.push(`"${escapedValue}"`)
      }

      // 更新标志：当本次处理的是 Param4，后续字段进入“Param1-4之后”阶段
      if (fieldKey === 'Param4') {
        afterParam4 = true
      }
    }

    // 添加CRC校验结果到行末尾
    const crcValidationResult = validateEventRecordCRC(recordData)
    row.push(`"${crcValidationResult}"`)

    // 写入CSV行
    csvStream.write(row.join(',') + '\n')
  }

    // 关闭流
    csvStream.end()
  }

/**
 * 取消读取事件记录
 * @param {number} blockId - 堆ID
 */
export function cancelReadingEvent(blockId) {
  if (isReadingEvent && eventReadingBlockId === blockId) {
    eventReadingCanceled = true
    // 不在这里发送通知，由stopReadingEvent统一处理
  }
}

/**
 * 获取事件记录读取状态
 */
export function getEventReadingState() {
  return {
    isReadingEvent,
    eventReadingBlockId,
    eventReadingOffset,
    eventReadingTotal,
    eventReadingCurrent,
    eventReadingCanceled,
    eventReadingError
  }
}

