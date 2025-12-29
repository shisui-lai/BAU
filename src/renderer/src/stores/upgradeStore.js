// 升级状态管理Store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { serializeParameterData } from '../composables/core/data-processing/remote-control/useRemoteControlCore.js'
import { UPGRADE_PARAM_FIELDS } from '../../../main/table.js'

export const useUpgradeStore = defineStore('upgrade', () => {
  // 国际化
  const { t } = useI18n()

  // 状态
  const ftpServerRunning = ref(false)
  const ftpConfig = ref({
    host: '192.168.11.200',
    port: 21,
    user: 'admin',
    password: 'admin',
    root: ''
  })

  const upgradeFile = ref('')
  const upgradeParams = ref({
    type: '0xA000', // 默认BAU升级
    bcuSelection1: [],
    bcuSelection2: [],
    bmuStyle: '0x0000',
    bmuStartAddress: 0, // 默认为0，只有BMU升级时才设置为0xB0
    bmuDeviceCount: 0 // 默认为0，只有BMU升级时才设置为1
  })

  const upgradeStatus = ref({
    isUpgrading: false,
    status: null,
    message: '',
    lastUpdate: null
  })

  // 计算属性
  const canStartUpgrade = computed(() => {
    return (
      ftpServerRunning.value &&
      upgradeFile.value &&
      upgradeParams.value.type &&
      !upgradeStatus.value.isUpgrading
    )
  })

  const upgradeStatusText = computed(() => {
    if (!upgradeStatus.value.status) return '未开始'
    return upgradeStatus.value.message || '未知状态'
  })

  // 方法
  const setFtpServerRunning = (running) => {
    ftpServerRunning.value = running
  }

  const updateFtpConfig = (config) => {
    // 当FTP服务器正在运行时，不允许修改服务器相关参数
    if (ftpServerRunning.value) {
      const blockedKeys = ['host', 'port', 'user', 'password']
      const hasBlocked = Object.keys(config || {}).some((k) => blockedKeys.includes(k))
      if (hasBlocked) {
        return
      }
    }
    ftpConfig.value = { ...ftpConfig.value, ...config }
  }

  const setUpgradeFile = (file) => {
    upgradeFile.value = file
    // 当用户主动重新选择文件时，重置升级状态，防止因未收到应答而导致按钮死锁
    if (upgradeStatus.value.isUpgrading) {
      console.log('[Upgrade] 用户更换文件，强制重置升级状态')
      setUpgradeStatus('idle', t('toast.deviceUpgrade.fileSelected'))
    }
  }

  const updateUpgradeParams = (params) => {
    upgradeParams.value = { ...upgradeParams.value, ...params }
  }

  const setUpgradeStatus = (status, message = '') => {
    // 只有在发送中和已发送状态时才算正在升级
    const activeUpgradeStates = ['sending', 'sent']

    upgradeStatus.value = {
      isUpgrading: activeUpgradeStates.includes(status),
      status,
      message,
      lastUpdate: new Date()
    }
  }

  const startUpgrade = async () => {
    try {
      setUpgradeStatus('sending', t('toast.deviceUpgrade.sendingUpgradeInstruction'))

      // 构建升级参数对象
      const upgradeParamData = buildUpgradeParamData()

      // 使用遥调序列化函数
      const payloadHex = serializeUpgradeParams(upgradeParamData)

      if (!payloadHex) {
        throw new Error(t('toast.deviceUpgrade.upgradeParameterSerializationFailed'))
      }

      // 获取目标设备列表 - 暂时默认为设备1，后续可扩展为用户选择
      const targetDevices = [1] // TODO: 从界面获取用户选择的设备

      console.log('[Upgrade] 升级参数序列化完成，长度:', payloadHex.length)
      console.log('[Upgrade] 目标设备:', targetDevices)

      // 向所有目标设备发送升级指令 (复用遥控逻辑)
      const sendPromises = targetDevices.map(async (deviceId) => {
        const topic = `bms/host/s2d/b${deviceId}/upgrade`
        console.log(`[Upgrade] 发送升级指令到设备 b${deviceId}:`, topic)

        // 复用现有的mqttPublish接口
        return window.electronAPI.mqttPublish(topic, payloadHex)
      })

      // 等待所有发送完成
      await Promise.all(sendPromises)

      setUpgradeStatus('sent', t('toast.deviceUpgrade.upgradeInstructionSentSuccess'))

      return {
        success: true,
        message: t('toast.deviceUpgrade.upgradeInstructionSentSuccessWithCount', {
          count: targetDevices.length
        })
      }
    } catch (error) {
      console.error('[Upgrade] 升级指令发送失败:', error)
      setUpgradeStatus('error', error.message)
      throw error
    }
  }

  const stopUpgrade = async () => {
    try {
      // 停止升级，直接重置状态以允许重新开始
      setUpgradeStatus('stopped', t('toast.deviceUpgrade.upgradeInterrupted'))
      return { success: true, message: t('toast.deviceUpgrade.upgradeInterrupted') }
    } catch (error) {
      setUpgradeStatus('error', error.message)
      throw error
    }
  }

  const buildUpgradeParamData = () => {
    try {
      const upgradeType = upgradeParams.value.type || '0xA000'

      // 构建升级参数对象 (复用遥调逻辑)
      const upgradeParamData = {
        upgradeType: parseInt(upgradeType, 16) || 0,
        ftpServerIP: ftpConfig.value.host || '0.0.0.0', // 字符串格式，序列化函数会处理
        ftpPort: ftpConfig.value.port || 21,
        ftpUser: ftpConfig.value.user || '',
        ftpPassword: ftpConfig.value.password || '',
        upgradeFile: upgradeFile.value || '',
        bcuSelection1: 0,
        bcuSelection2: 0,
        bmuStyle: 0,
        bmuStartAddress: 0,
        bmuDeviceCount: 0
      }

      // 根据升级类型填充特定数据
      if (upgradeType === '0xA000') {
        // BAU升级：BCU和BMU相关字段保持为0
        console.log('[Upgrade] BAU升级模式，BCU和BMU字段保持为0')
      } else if (upgradeType === '0xA001') {
        // BCU升级：填充簇选择，BMU相关为0
        upgradeParamData.bcuSelection1 = buildClusterSelection(
          upgradeParams.value.bcuSelection1 || []
        )
        upgradeParamData.bcuSelection2 = buildClusterSelection(
          upgradeParams.value.bcuSelection2 || []
        )
        console.log('[Upgrade] BCU升级模式，填充簇选择状态')
      } else if (upgradeType === '0xA002') {
        // BMU升级：需要BCU选择状态来指定对哪一簇的BMU进行升级
        upgradeParamData.bcuSelection1 = buildClusterSelection(
          upgradeParams.value.bcuSelection1 || []
        )
        upgradeParamData.bcuSelection2 = buildClusterSelection(
          upgradeParams.value.bcuSelection2 || []
        )
        upgradeParamData.bmuStyle = parseInt(upgradeParams.value.bmuStyle || '0', 16) || 0
        upgradeParamData.bmuStartAddress = upgradeParams.value.bmuStartAddress || 0xb0
        upgradeParamData.bmuDeviceCount = upgradeParams.value.bmuDeviceCount || 1
        console.log('[Upgrade] BMU升级模式，填充所有升级参数（包括簇选择状态）')
      }

      // 调试输出
      console.log('[Upgrade] 升级类型:', upgradeType)
      console.log('[Upgrade] 升级参数对象:', upgradeParamData)

      return upgradeParamData
    } catch (error) {
      console.error('[Upgrade] 构建升级参数失败:', error)
      // 返回默认参数对象作为安全回退
      return {
        upgradeType: 0,
        ftpServerIP: '0.0.0.0',
        ftpPort: 21,
        ftpUser: '',
        ftpPassword: '',
        upgradeFile: '',
        bcuSelection1: 0,
        bcuSelection2: 0,
        bmuStyle: 0,
        bmuStartAddress: 0,
        bmuDeviceCount: 0
      }
    }
  }

  // 字符串转ASCII字节数组的功能现在由序列化函数内部处理

  const buildClusterSelection = (selection) => {
    let result = 0
    selection.forEach((clusterId) => {
      const bitIndex = (clusterId - 1) % 10
      result |= 1 << bitIndex
    })
    return result
  }

  // 升级参数序列化函数 (复用遥调逻辑)
  const serializeUpgradeParams = (upgradeParamData) => {
    return serializeParameterData(
      upgradeParamData, // 升级参数对象
      UPGRADE_PARAM_FIELDS, // 升级字段定义表
      0, // 起始偏移为0
      73, // 73个寄存器
      '[Upgrade]', // 日志前缀
      '升级参数' // 数据类型名称
    )
  }

  return {
    // 状态
    ftpServerRunning,
    ftpConfig,
    upgradeFile,
    upgradeParams,
    upgradeStatus,

    // 计算属性
    canStartUpgrade,
    upgradeStatusText,

    // 方法
    setFtpServerRunning,
    updateFtpConfig,
    setUpgradeFile,
    updateUpgradeParams,
    setUpgradeStatus,
    startUpgrade,
    stopUpgrade
  }
})
