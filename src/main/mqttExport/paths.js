/**
 * 导出路径与目录后缀管理
 *
 * 概念：
 * - RUN_EXPORT_DIR：Data_<SESSION_SUFFIX>（程序启动时间戳），运行期间固定不变
 * - RAW_EXPORT_DIR：原始报文目录，跟随 RUN_EXPORT_DIR
 * - 设备目录后缀缓存：getDeviceDirSuffix(id) 使用 Map 记忆后缀，保证同会话目录一致
 *
 * 维护提示：
 * - 为保持与参考项目一致，停止存储时通常不清空 deviceDirSuffixMap（复用同一 Block 目录）
 */
import path from 'path'
import { formatFileSuffix } from './utils'
const BASE_EXPORT_ROOT = path.join(process.cwd(), 'dataExports')
export const SESSION_SUFFIX = formatFileSuffix(new Date())
export const RUN_EXPORT_DIR = path.join(BASE_EXPORT_ROOT, `Data_${SESSION_SUFFIX}`)
export const RAW_EXPORT_DIR = path.join(RUN_EXPORT_DIR, `Raw_Messages_${SESSION_SUFFIX}`)
const deviceDirSuffixMap = new Map()
/**
 * 获取设备目录后缀（带缓存）
 * @param {string} id - 设备逻辑ID（如 '1-0' 表示堆1簇0）
 * @returns {string} 目录后缀（形如 YYYYMMDD_HH_mm_ss）
 */
export function getDeviceDirSuffix(id) {
  if (!deviceDirSuffixMap.has(id)) {
    const now = new Date()
    const s = formatFileSuffix(now)
    deviceDirSuffixMap.set(id, s)
  }
  return deviceDirSuffixMap.get(id)
}

/**
 * 清空设备目录后缀缓存
 * @returns {void}
 */
export function clearDeviceDirSuffixCache() {
  deviceDirSuffixMap.clear()
}
