import path from 'path'
import { formatFileSuffix } from './utils'
const BASE_EXPORT_ROOT = path.join(process.cwd(), 'dataExports')
export const SESSION_SUFFIX = formatFileSuffix(new Date())
export const RUN_EXPORT_DIR = path.join(BASE_EXPORT_ROOT, `Data_${SESSION_SUFFIX}`)
export const RAW_EXPORT_DIR = path.join(RUN_EXPORT_DIR, `Raw_Messages_${SESSION_SUFFIX}`)
const deviceDirSuffixMap = new Map()
export function getDeviceDirSuffix(id) {
  if (!deviceDirSuffixMap.has(id)) {
    const now = new Date()
    const s = formatFileSuffix(now)
    deviceDirSuffixMap.set(id, s)
  }
  return deviceDirSuffixMap.get(id)
}
