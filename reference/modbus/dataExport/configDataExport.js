const fs = require('fs').promises
const path = require('path')

// 导出状态跟踪，确保每个设备只导出一次
const exportStatus = new Map()

/**
 * 导出配置数据到文件（只导出一次）
 * @param {string} deviceIp - 设备IP地址
 * @param {string} dataType - 数据类型 ('ConfigParamSys', 'ConfigAlarm', 'ConfigSOX')
 * @param {Array} data - 要导出的数据
 */
async function exportConfigData(deviceIp, dataType, data) {
  try {
    // 检查是否已经导出过
    const exportKey = `${deviceIp}_${dataType}`
    if (exportStatus.has(exportKey)) {
      return // 已经导出过，直接返回
    }

    // 确保导出目录存在
    const exportDir = path.join(process.cwd(), 'dataExports', 'ConfigData')
    await fs.mkdir(exportDir, { recursive: true })

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = `${deviceIp}_${dataType}_${timestamp}.json`
    const filePath = path.join(exportDir, fileName)

    // 准备导出数据
    const exportData = {
      deviceIp,
      dataType,
      exportTime: new Date().toISOString(),
      data
    }

    // 写入文件
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8')

    // 标记为已导出
    exportStatus.set(exportKey, {
      exportTime: new Date().toISOString(),
      filePath
    })

    console.log(`[配置导出] 成功导出 ${deviceIp} 的 ${dataType} 数据到: ${filePath}`)
  } catch (error) {
    console.error(`[配置导出] 导出 ${deviceIp} 的 ${dataType} 数据失败:`, error)
  }
}

/**
 * 重置导出状态（用于测试或重新导出）
 * @param {string} deviceIp - 设备IP地址（可选，不提供则重置所有）
 * @param {string} dataType - 数据类型（可选）
 */
function resetExportStatus(deviceIp = null, dataType = null) {
  if (deviceIp && dataType) {
    const exportKey = `${deviceIp}_${dataType}`
    exportStatus.delete(exportKey)
    console.log(`[配置导出] 重置 ${deviceIp} 的 ${dataType} 导出状态`)
  } else if (deviceIp) {
    // 重置指定设备的所有导出状态
    for (const key of exportStatus.keys()) {
      if (key.startsWith(`${deviceIp}_`)) {
        exportStatus.delete(key)
      }
    }
    console.log(`[配置导出] 重置 ${deviceIp} 的所有导出状态`)
  } else {
    // 重置所有导出状态
    exportStatus.clear()
    console.log(`[配置导出] 重置所有导出状态`)
  }
}

/**
 * 获取导出状态
 */
function getExportStatus() {
  return Array.from(exportStatus.entries()).map(([key, value]) => ({
    key,
    ...value
  }))
}

export { exportConfigData, resetExportStatus, getExportStatus }
