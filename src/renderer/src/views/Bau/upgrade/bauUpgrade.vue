<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useUpgradeStore } from '@/stores/upgradeStore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { PAGE_PASSWORDS } from '@/configs/passwords'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import ProgressBar from 'primevue/progressbar'
import { useFtpFileManager } from '@/composables/core/data-processing/upgrade/useFtpFileManager.js'
import { useRemoteCommand } from '@/composables/core/data-processing/remote-control/useRemoteCommand'
import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockStore } from '@/stores/device/blockStore'

// 版本信息组件
import VersionInfo from './VersionInfo.vue'
import NewUploadPanel from './NewUploadPanel.vue'

const toast = useToast()
const router = useRouter()
const { t, te, locale } = useI18n()

// 簇选择器和堆选择器（用于升级结果查询）
const { selectedCluster } = useClusterSelect()
const { selectedBlock } = useBlockSelect()

// Store（用于获取系统拓扑信息和配置）
const clusterStore = useClusterStore()
const blockStore = useBlockStore()

// 遥控命令服务（用于升级结果查询）
const { 
  feedbackStatus, 
  startUpgradeResultPolling, 
  stopUpgradeResultPolling,
  handleFeedbackQueryResponse,
  startBauUpgradeResultPolling,
  stopBauUpgradeResultPolling,
  startBcuBmuUpgradeResultPolling,
  stopBcuBmuUpgradeResultPolling
} = useRemoteCommand({ selectorMode: 'cluster' })

// 翻译函数 - 参考Order.vue的实现方式
// 中文环境 (locale.value === 'zh')
// translateUpgradeType('BAU升级')  // 返回: 'BAU升级'
// translateUpgradeType('BCU升级')  // 
const translateUpgradeType = (type) => {
  return locale.value === 'zh' 
    ? type 
    : te(`deviceUpgrade.options.upgradeTypes.${type}`) 
      ? t(`deviceUpgrade.options.upgradeTypes.${type}`) 
      : type
}

const translateBmuUpgradeType = (type) => {
  return locale.value === 'zh' 
    ? type 
    : te(`deviceUpgrade.options.bmuUpgradeTypes.${type}`) 
      ? t(`deviceUpgrade.options.bmuUpgradeTypes.${type}`) 
      : type
}

const translateStatus = (status) => {
  const translationKey = `deviceUpgrade.status.${status}`
  return te(translationKey) 
    ? t(translationKey) 
    : status
}

// 根据升级类型启动对应的升级结果轮询
function startUpgradeResultPollingByType() {
  // 先停止所有轮询
  stopUpgradeResultPolling()
  stopBauUpgradeResultPolling()
  stopBcuBmuUpgradeResultPolling()

  // 清除之前的升级结果数据，确保只显示当前升级的结果
  feedbackStatus.bcu_bmu_upgrade_result.clear()
  feedbackStatus.bau_upgrade_result = null

  const upgradeType = selectedUpgrade.value

  // BAU升级 (0xA000) - 使用堆级轮询
  if (upgradeType === '0xA000') {
    if (selectedBlock.value) {
      // 从 selectedBlock (如 'block1') 提取堆号
      const blockId = Number(String(selectedBlock.value).replace('block', ''))
      if (blockId > 0) {
        startBauUpgradeResultPolling(() => blockId)
        console.log(`[升级结果轮询] 已启动BAU升级结果轮询，堆号: ${blockId}`)
      }
    } else {
      console.warn('[升级结果轮询] BAU升级需要选择堆，但当前未选择')
    }
  }
  // BCU/BMU升级 (0xA001/0xA002) - 同时启动BAU轮询和BCU/BMU多簇轮询
  else if (upgradeType === '0xA001' || upgradeType === '0xA002') {
    // 同时启动BAU结果轮询（堆级）
    if (selectedBlock.value) {
      const blockId = Number(String(selectedBlock.value).replace('block', ''))
      if (blockId > 0) {
        startBauUpgradeResultPolling(() => blockId)
        console.log(`[升级结果轮询] 已启动BAU升级结果轮询，堆号: ${blockId}`)
      }
    } else {
      console.warn('[升级结果轮询] BCU/BMU升级需要选择堆（用于BAU结果查询），但当前未选择')
    }
    
    // 启动BCU/BMU结果多簇轮询（根据用户勾选的簇）
    const clusterKeys = blockClusterKeys.value
    if (clusterKeys.length === 0) {
      console.warn('[升级结果轮询] 未勾选任何簇，无法启动BCU/BMU升级结果轮询')
    } else {
      startBcuBmuUpgradeResultPolling(clusterKeys)
      console.log(`[升级结果轮询] 已启动BCU/BMU升级结果多簇轮询，簇: ${clusterKeys.join(', ')}`)
    }
  }
}

// 密码保护相关
const showPasswordDialog = ref(false)
const isBlurred = ref(false)
const inputPwd = ref('')
const pwdError = ref(false)
const showCancelTip = ref(false)
const pwdConfirmed = ref(false)
const upgradeStore = useUpgradeStore()

// FTP文件管理功能
const {
  uploadedFiles,
  setupFileEventListeners,
  refreshFileList,
  cleanup
} = useFtpFileManager()

// 页面类型检测 - 设置为block类型以显示堆选择器
const { addPageTypeMapping } = usePageTypeDetection()
addPageTypeMapping('/Bau/upgrade/bauUpgrade', 'block')

// 从Store获取状态
const ftpHost = computed({
  get: () => upgradeStore.ftpConfig.host,
  set: (value) => upgradeStore.updateFtpConfig({ host: value })
})

const ftpPort = computed({
  get: () => upgradeStore.ftpConfig.port,
  set: (value) => upgradeStore.updateFtpConfig({ port: value })
})

const ftpUser = computed({
  get: () => upgradeStore.ftpConfig.user,
  set: (value) => upgradeStore.updateFtpConfig({ user: value })
})

const ftpPassword = computed({
  get: () => upgradeStore.ftpConfig.password,
  set: (value) => upgradeStore.updateFtpConfig({ password: value })
})

const ftpRoot = computed({
  get: () => upgradeStore.ftpConfig.root,
  set: (value) => upgradeStore.updateFtpConfig({ root: value })
})

const ftpServerRunning = computed(() => upgradeStore.ftpServerRunning)

// 升级文件
const updateFile = computed({
  get: () => upgradeStore.upgradeFile,
  set: (value) => upgradeStore.setUpgradeFile(value)
})
//1、原本样式 2、嵌入式设备样式
const uploadUiMode = ref(1)

// 选择的升级文件状态
const selectedFileStatus = computed(() => {
  if (!updateFile.value) {
    return {
      exists: false,
      message: t('deviceUpgrade.messages.noFileSelected'),
      isValid: false,
      fileInfo: null
    }
  }

  const fileInfo = uploadedFiles.value.find(f => f.fileName === updateFile.value)

  if (!fileInfo) {
    return {
      exists: false,
      message: t('deviceUpgrade.messages.fileNotExists', [updateFile.value]),
      isValid: false,
      fileInfo: null
    }
  }

  return {
    exists: true,
    message: t('deviceUpgrade.messages.fileReady', [updateFile.value, fileInfo.sizeFormatted]),
    isValid: fileInfo.isValid,
    fileInfo
  }
})

// 升级参数
const selectedUpgrade = computed({
  get: () => upgradeStore.upgradeParams.type,
  set: (value) => {
    upgradeStore.updateUpgradeParams({ type: value })
    // 注意：不在升级类型改变时启动轮询，只在升级开始后才启动
    // 如果升级正在进行中，则重启轮询以匹配新的升级类型
    if (upgradeStore.upgradeStatus.isUpgrading) {
      startUpgradeResultPollingByType()
    }
  }
})

const bcuSelection1 = computed({
  get: () => upgradeStore.upgradeParams.bcuSelection1,
  set: (value) => upgradeStore.updateUpgradeParams({ bcuSelection1: value })
})

const bcuSelection2 = computed({
  get: () => upgradeStore.upgradeParams.bcuSelection2,
  set: (value) => upgradeStore.updateUpgradeParams({ bcuSelection2: value })
})

// 获取用户勾选的所有全局簇号
const selectedGlobalClusters = computed(() => {
  return [...bcuSelection1.value, ...bcuSelection2.value].sort((a, b) => a - b)
})

/**
 * 将全局簇号转换为 block-cluster 格式的簇键列表
 * @param {Array<number>} globalClusterIds - 全局簇号数组，如 [1, 2, 3, 4]
 * @param {Array} availableClusters - 从 clusterStore 获取的簇列表
 * @returns {Array<string>} block-cluster 格式的簇键列表，如 ['1-1', '1-2', '1-3', '2-1']
 */
function mapGlobalClustersToBlockClusters(globalClusterIds, availableClusters) {
  if (!globalClusterIds || globalClusterIds.length === 0) return []
  if (!availableClusters || availableClusters.length === 0) return []
  
  // 按全局簇号排序
  const sortedGlobalIds = [...globalClusterIds].sort((a, b) => a - b)
  
  // 从 availableClusters 中按顺序提取对应全局簇号的 block-cluster 键
  // availableClusters 已经是按 block 和 cluster 排序的，全局簇号就是顺序索引+1
  const result = []
  sortedGlobalIds.forEach(globalId => {
    // 全局簇号从1开始，数组索引从0开始
    const index = globalId - 1
    if (index >= 0 && index < availableClusters.length) {
      const cluster = availableClusters[index]
      if (cluster && cluster.value) {
        result.push(cluster.value) // cluster.value 格式为 '1-1', '2-1' 等
      }
    }
  })
  
  return result
}

// 将全局簇号转换为 block-cluster 格式
const blockClusterKeys = computed(() => {
  if (selectedGlobalClusters.value.length === 0) return []
  return mapGlobalClustersToBlockClusters(
    selectedGlobalClusters.value,
    clusterStore.availableClusters
  )
})

/**
 * 将 block-cluster 格式转换回全局簇号
 * @param {string} clusterKey - block-cluster 格式的簇键，如 '1-1', '2-3'
 * @param {Array} availableClusters - 可用簇列表
 * @returns {number|null} 全局簇号（1-20）或null
 */
function mapBlockClusterToGlobalCluster(clusterKey, availableClusters) {
  if (!clusterKey || !availableClusters || availableClusters.length === 0) {
    return null
  }

  // 在availableClusters中查找对应的索引
  const index = availableClusters.findIndex(cluster => cluster.value === clusterKey)

  // 全局簇号 = 索引 + 1（因为全局簇号从1开始）
  return index >= 0 ? index + 1 : null
}

/**
 * 获取簇的显示名称（用于升级结果显示）
 * @param {string} clusterKey - block-cluster 格式的簇键
 * @returns {string} 显示名称，如 '簇1', '簇2'
 */
function getClusterDisplayName(clusterKey) {
  const globalClusterId = mapBlockClusterToGlobalCluster(clusterKey, clusterStore.availableClusters)

  if (globalClusterId !== null) {
    console.log(`[升级结果显示] ${clusterKey} -> 簇${globalClusterId}`)
    return `簇${globalClusterId}`
  }

  // 回退到原始显示方式
  console.warn(`[升级结果显示] 无法映射 ${clusterKey}，使用原始显示`)
  return `堆${clusterKey}`
}

const bmuUpdateStyle = computed({
  get: () => upgradeStore.upgradeParams.bmuStyle,
  set: (value) => upgradeStore.updateUpgradeParams({ bmuStyle: value })
})

const bmuStartAddress = computed({
  get: () => upgradeStore.upgradeParams.bmuStartAddress,
  set: (value) => upgradeStore.updateUpgradeParams({ bmuStartAddress: value })
})

// BMU起始地址的16进制显示
const bmuStartAddressHex = computed({
  get: () => {
    const addr = upgradeStore.upgradeParams.bmuStartAddress
    return addr ? `0x${addr.toString(16).toUpperCase()}` : '0xB0'
  },
  set: (value) => {
    // 解析16进制字符串
    const hexValue = value.replace(/^0x/i, '')
    const numValue = parseInt(hexValue, 16)
    if (!isNaN(numValue) && numValue >= 0xB0 && numValue <= 0xCF) {
      upgradeStore.updateUpgradeParams({ bmuStartAddress: numValue })
    }
  }
})

const bmuDeviceCount = computed({
  get: () => upgradeStore.upgradeParams.bmuDeviceCount,
  set: (value) => upgradeStore.updateUpgradeParams({ bmuDeviceCount: value })
})

// 升级状态 (直接使用store中的状态)

// 选项配置
const upgradeOptions = [
  { label: 'BAU升级', value: '0xA000' },
  { label: 'BCU升级', value: '0xA001' },
  { label: 'BMU升级', value: '0xA002' }
]

const bmuUpgradeOptions = [
  { label: '单机常规升级', value: '0xC0A1' },
  { label: '单机强制升级', value: '0xC0B1' },
  { label: '广播常规升级', value: '0xC0A2' },
  { label: '广播强制升级', value: '0xC0B2' }
]

// 翻译后的选项配置
const translatedUpgradeOptions = computed(() => {
  return upgradeOptions.map(option => ({
    ...option,
    label: translateUpgradeType(option.label)
  }))
})

const translatedBmuUpgradeOptions = computed(() => {
  return bmuUpgradeOptions.map(option => ({
    ...option,
    label: translateBmuUpgradeType(option.label)
  }))
})

// 已移除升级状态显示相关计算属性，保留升级逻辑不变

// 升级执行结果（Map结构）
const bcuBmuUpgradeResultsMap = computed(() => {
  return feedbackStatus.bcu_bmu_upgrade_result // 已经是Map结构
})
const hasUpgradeResult = computed(() => bcuBmuUpgradeResultsMap.value && bcuBmuUpgradeResultsMap.value.size > 0)

// BAU升级执行结果
const bauUpgradeResult = computed(() => feedbackStatus.bau_upgrade_result)
const hasBauUpgradeResult = computed(() => bauUpgradeResult.value !== null)

// ================== 升级相关计算属性 ==================

// 计算属性
const canStartUpgrade = computed(() => upgradeStore.canStartUpgrade)

// 方法

// 验证16进制地址输入
const validateHexAddress = (event) => {
  const value = event.target.value
  // 允许0x前缀和16进制字符
  const hexPattern = /^0x[0-9A-Fa-f]*$/
  if (value && !hexPattern.test(value)) {
    // 如果输入不符合16进制格式，恢复到上一个有效值
    event.target.value = bmuStartAddressHex.value
  }
}

const chooseFtpDir = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('choose-default-FTP-dir')
    if (result.success) {
      ftpRoot.value = result.path
      toast.add({
        severity: 'success',
        summary: t('toast.deviceUpgrade.directorySelected'),
        detail: result.path,
        life: 3000
      })
    } else {
      toast.add({
        severity: 'warn',
        summary: t('toast.deviceUpgrade.noDirectorySelected'),
        life: 2000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('toast.deviceUpgrade.directorySelectionFailed'),
      detail: error.message,
      life: 5000
    })
  }
}

// 选择升级文件
const chooseFile = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('show-open-dialog')
    if (!result.canceled && result.fileName) {
      updateFile.value = result.fileName
      toast.add({
        severity: 'success',
        summary: t('toast.deviceUpgrade.fileSelected'),
        detail: result.fileName,
        life: 3000
      })
    }
  } catch (error) {
    console.error('选择文件失败:', error)
    toast.add({
      severity: 'error',
      summary: t('toast.deviceUpgrade.fileSelectionFailed'),
      detail: error.message,
      life: 5000
    })
  }
}

const toggleFtpServer = async () => {
  try {
    if (ftpServerRunning.value) {
      const result = await window.electron.ipcRenderer.invoke('ftp-stop')
      if (result.success) {
        upgradeStore.setFtpServerRunning(false)
        toast.add({
          severity: 'info',
          summary: t('toast.deviceUpgrade.ftpServerStopped'),
          detail: t('toast.deviceUpgrade.ftpServerStopped'),
          life: 3000
        })
      } else {
        toast.add({
          severity: 'error',
          summary: t('toast.deviceUpgrade.ftpStopFailed'),
          detail: result.message,
          life: 5000
        })
      }
    } else {
      const result = await window.electron.ipcRenderer.invoke('ftp-start', {
        host: ftpHost.value,
        port: ftpPort.value,
        user: ftpUser.value,
        pass: ftpPassword.value
      })
      if (result.success) {
        upgradeStore.setFtpServerRunning(true)
        toast.add({
          severity: 'success',
          summary: t('toast.deviceUpgrade.ftpServerStarted'),
          detail: t('toast.deviceUpgrade.serverAddress', { address: `${ftpHost.value}:${ftpPort.value}` }),
          life: 4000
        })
        // 🔥 FTP服务器启动后，刷新文件列表
        refreshFileList()
      } else {
        toast.add({
          severity: 'error',
          summary: t('toast.deviceUpgrade.ftpStartFailed'),
          detail: result.message,
          life: 6000
        })
      }
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('toast.deviceUpgrade.operationFailed'),
      detail: error.message,
      life: 5000
    })
  }
}

// 通用的簇选择切换函数
const toggleBcuSelection = (selectionArray, clusterId) => {
  const index = selectionArray.indexOf(clusterId)
  if (index > -1) {
    selectionArray.splice(index, 1)
  } else {
    selectionArray.push(clusterId)
  }
}

const toggleBcuSelection1 = (clusterId) => toggleBcuSelection(bcuSelection1.value, clusterId)
const toggleBcuSelection2 = (clusterId) => toggleBcuSelection(bcuSelection2.value, clusterId)

// ================== 簇配置限制逻辑 ==================

/**
 * 根据 store 中的配置数据计算簇的限制信息
 * 作用：确定总簇数和每个堆的簇数，用于限制用户选择
 */
const clusterLimits = computed(() => {
  // 从 clusterStore 获取可用簇列表
  const availableClusters = clusterStore.availableClusters

  // 如果没有配置数据，返回保守的默认值（0簇，避免误操作）
  if (!availableClusters || availableClusters.length === 0) {
    return {
      totalClusters: 0,     // 总簇数：默认0（保守）
      heap1Clusters: 0,     // 堆1簇数：默认0
      heap2Clusters: 0      // 堆2簇数：默认0
    }
  }

  // 统计每个堆的簇数
  let heap1Clusters = 0
  let heap2Clusters = 0

  availableClusters.forEach(cluster => {
    if (cluster.block === 1) {
      heap1Clusters++
    } else if (cluster.block === 2) {
      heap2Clusters++
    }
  })

  // 总簇数 = 堆1簇数 + 堆2簇数
  const totalClusters = heap1Clusters + heap2Clusters

  return { totalClusters, heap1Clusters, heap2Clusters }
})

/**
 * 判断指定的簇编号是否在有效范围内
 * @param {number} clusterNum - 簇编号（1-20）
 * @returns {boolean} - true表示可用，false表示超出配置范围
 *
 * 举例：如果系统配置总共12簇
 * - isClusterAvailable(5) 返回 true（5 <= 12）
 * - isClusterAvailable(15) 返回 false（15 > 12）
 */
const isClusterAvailable = (clusterNum) => {
  return clusterNum <= clusterLimits.value.totalClusters
}



// 全选1-10簇的状态（计算属性）
const isAllSelected1 = computed(() => {
  // 只检查可用的1-10簇是否全部被选中
  for (let i = 1; i <= 10; i++) {
    if (isClusterAvailable(i) && !bcuSelection1.value.includes(i)) {
      return false
    }
  }
  return true
})

// 全选11-20簇的状态（计算属性）
const isAllSelected2 = computed(() => {
  // 只检查可用的11-20簇是否全部被选中
  for (let i = 11; i <= 20; i++) {
    if (isClusterAvailable(i) && !bcuSelection2.value.includes(i)) {
      return false
    }
  }
  return true
})

// 切换全选1-10簇
const toggleSelectAll1 = () => {
  if (isAllSelected1.value) {
    // 如果已经全选，则清空
    bcuSelection1.value = []
  } else {
    // 否则全选1-10簇中可用的簇（根据系统配置限制）
    const availableClusters = []
    for (let i = 1; i <= 10; i++) {
      if (isClusterAvailable(i)) {
        availableClusters.push(i)
      }
    }
    bcuSelection1.value = availableClusters
  }
}

// 切换全选11-20簇
const toggleSelectAll2 = () => {
  if (isAllSelected2.value) {
    // 如果已经全选，则清空
    bcuSelection2.value = []
  } else {
    // 否则全选11-20簇中可用的簇（根据系统配置限制）
    const availableClusters = []
    for (let i = 11; i <= 20; i++) {
      if (isClusterAvailable(i)) {
        availableClusters.push(i)
      }
    }
    bcuSelection2.value = availableClusters
  }
}

const startUpgrade = async () => {
  try {
    await upgradeStore.startUpgrade()
    
    // 升级启动后，确保轮询已启动
    startUpgradeResultPollingByType()
    
    toast.add({
      severity: 'success',
      summary: t('toast.deviceUpgrade.upgradeStarted'),
      detail: t('toast.deviceUpgrade.upgradeInstructionSent'),
      life: 4000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('toast.deviceUpgrade.upgradeFailed'),
      detail: error.message,
      life: 6000
    })
  }
}

const stopUpgrade = async () => {
  try {
    await upgradeStore.stopUpgrade()
    
    // 停止升级时，停止升级结果轮询
    stopUpgradeResultPolling()
    stopBauUpgradeResultPolling()
    stopBcuBmuUpgradeResultPolling()
    
    toast.add({
      severity: 'info',
      summary: t('toast.deviceUpgrade.upgradeStopped'),
      detail: t('toast.deviceUpgrade.upgradeOperationCancelled'),
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('toast.deviceUpgrade.operationFailed'),
      detail: error.message,
      life: 5000
    })
  }
}



// 监听升级应答结果 - 使用正确的MQTT事件名称
const handleUpgradeResponse = (_, mqttMessage) => {
  console.log('[Upgrade] 收到升级应答MQTT消息:', mqttMessage)

  // createRemoteCommandParser返回的数据结构: { error, commandType: 'remote_command', topic: 'upgrade', timestamp, data: { code, message, success } }
  if (mqttMessage && mqttMessage.data) {
    const { success, message, code } = mqttMessage.data

    console.log('[Upgrade] 升级应答解析结果:', { success, message, code, topic: mqttMessage.topic })

    if (success) {
      upgradeStore.setUpgradeStatus('success', t('deviceUpgrade.status.success'))
      toast.add({
        severity: 'success',
        summary: t('toast.deviceUpgrade.upgradeSuccess'),
        detail: t('deviceUpgrade.status.success'),
        life: 5000
      })
    } else {
      // 翻译错误消息
      const translatedMessage = code ? t(`toast.errorCodes.0x${code.toString(16).toUpperCase()}`) || message : message
      upgradeStore.setUpgradeStatus('error', translatedMessage)
      toast.add({
        severity: 'error',
        summary: t('toast.deviceUpgrade.upgradeFailed'),
        detail: translatedMessage,
        life: 8000
      })
    }
  } else {
    console.warn('[Upgrade] 升级应答数据格式异常:', mqttMessage)
    upgradeStore.setUpgradeStatus('error', t('toast.deviceUpgrade.upgradeResponseDataError'))
    toast.add({
      severity: 'error',
      summary: t('toast.deviceUpgrade.upgradeFailed'),
      detail: t('toast.deviceUpgrade.upgradeResponseDataError'),
      life: 8000
    })
  }
}

// 监听FTP服务器状态变化，自动刷新文件列表
watch(ftpServerRunning, async (newValue) => {
  if (newValue) {
    // FTP服务器启动时刷新文件列表
    await refreshFileList()
  }
})

// 初始化
// 密码验证函数
const checkPwd = () => {
  pwdError.value = false
  if (inputPwd.value === PAGE_PASSWORDS.UPGRADE) {
    pwdConfirmed.value = true
    showPasswordDialog.value = false
    isBlurred.value = false
    sessionStorage.setItem('upgradePagePassword', 'ok')
    pwdError.value = false
    // 验证通过后初始化页面
    initializePage()
  } else {
    pwdError.value = true
  }
}

// 取消密码输入
const cancelPwd = () => {
  showPasswordDialog.value = false
  if (pwdConfirmed.value) {
    pwdConfirmed.value = false
    return
  }
  showCancelTip.value = true
  isBlurred.value = true
  setTimeout(() => {
    router.go(-1)
  }, 500)
}

// 处理升级结果MQTT应答
function handleUpgradeResultResponse(_e, msg) {
  // 消息结构：{ blockId, clusterId, dataType, topic, data, ... }
  // dataType 在 msg 对象上，不在 msg.data 上
  if (msg && msg.dataType) {
    const dataType = msg.dataType.toLowerCase()
    
    // 处理BCU/BMU升级结果
    if (dataType === 'get_bcu_bmu_upgrade_result') {
      if (handleFeedbackQueryResponse) {
        // handleFeedbackQueryResponse 期望 responseData.data 和 responseData.topic 存在
        handleFeedbackQueryResponse('get_bcu_bmu_upgrade_result', { 
          data: msg.data,
          topic: msg.topic,
          blockId: msg.blockId,
          clusterId: msg.clusterId
        })
      }
    }
    
    // 处理BAU升级结果
    if (dataType === 'get_bau_upgrade_result') {
      if (handleFeedbackQueryResponse) {
        // parseBauUpgradeResultRAW返回的结构: { error, commandType, topic, data: {...} }
        // msg.data 是完整的解析结果对象，真正的数据在 msg.data.data
        handleFeedbackQueryResponse('get_bau_upgrade_result', { data: msg.data?.data || msg.data })
      }
    }
  } else {
    console.warn('[bauUpgrade.vue] ⚠️ 升级结果查询应答格式异常 - msg:', msg)
  }
}

// 初始化页面函数
const initializePage = async () => {
  try {
    console.log('[升级页面] 开始初始化页面')

    // 动态设置FTP服务器默认IP
    const { useDefaultFtpServerIp } = await import('@/composables/utils/useNetworkInterface.js')
    const { getDefault11SegmentIp } = useDefaultFtpServerIp()
    const defaultIp = await getDefault11SegmentIp()

    console.log('[升级页面] 设置FTP服务器默认IP:', defaultIp)
    upgradeStore.updateFtpConfig({ host: defaultIp })

    // 初始化FTP文件管理功能
    setupFileEventListeners()

    // 自动刷新一次
    await refreshFileList()

    // 获取FTP根目录
    const result = await window.electron.ipcRenderer.invoke('get-ftp-root')
    if (result.success) {
      upgradeStore.updateFtpConfig({ root: result.path })
    }

    // 查询FTP服务器状态
    const statusResult = await window.electron.ipcRenderer.invoke('ftp-status')
    if (statusResult.success) {
      upgradeStore.setFtpServerRunning(statusResult.isRunning)

      // 如果FTP服务器正在运行，刷新文件列表
      if (statusResult.isRunning) {
        await refreshFileList()
      }
    }

    console.log('[升级页面] 页面初始化完成')
    // 注意：不在页面初始化时启动轮询，只在升级开始后才启动
    // startUpgradeResultPollingByType()  // 已移除，改为在 startUpgrade 时启动
  } catch (error) {
    console.error('[升级页面] 页面初始化失败:', error)
  }
}

onMounted(async () => {
  // 预清理，避免重复绑定（与其他页面保持一致）
  window.electron.ipcRenderer.removeAllListeners?.('UPGRADE')
  window.electron.ipcRenderer.removeAllListeners?.('GET_BCU_BMU_UPGRADE_RESULT')
  window.electron.ipcRenderer.removeAllListeners?.('GET_BAU_UPGRADE_RESULT')

  // 监听升级应答结果和升级结果查询应答（与其他页面保持一致）
  window.electron.ipcRenderer.on('UPGRADE', handleUpgradeResponse)
  window.electron.ipcRenderer.on('GET_BCU_BMU_UPGRADE_RESULT', handleUpgradeResultResponse)
  window.electron.ipcRenderer.on('GET_BAU_UPGRADE_RESULT', handleUpgradeResultResponse)
  
  // 密码保护检查
  if (sessionStorage.getItem('upgradePagePassword') !== 'ok') {
    showPasswordDialog.value = true
    isBlurred.value = true
    return
  }

  // 密码已验证，直接初始化
  await initializePage()
})

// 清理
onUnmounted(() => {
  // 停止所有升级结果轮询
  stopUpgradeResultPolling() // 停止单簇轮询
  stopBauUpgradeResultPolling() // 停止BAU升级结果轮询
  stopBcuBmuUpgradeResultPolling() // 停止BCU/BMU多簇轮询

  // 彻底清理所有监听器
  window.electron.ipcRenderer.removeAllListeners?.('UPGRADE')
  window.electron.ipcRenderer.removeAllListeners?.('GET_BCU_BMU_UPGRADE_RESULT')
  window.electron.ipcRenderer.removeAllListeners?.('GET_BAU_UPGRADE_RESULT')

  cleanup() // 清理FTP文件管理功能
})
</script>

<!-- BAU设备升级界面 -->
<template>
  <div class="page-wrapper">
    <div class="card" v-if="!showPasswordDialog">
    <div class="upgrade-container">
      <!-- 左右布局：左侧(FTP配置+版本信息) + 右侧(设备升级) -->
      <div class="grid">
        <!-- 左侧：FTP配置 + 版本信息 -->
        <div class="col-6">
          <!-- FTP服务器配置卡片 -->
          <div class="content-card">
            <h3>{{ t('deviceUpgrade.sections.ftpServer') }}</h3>
            <div class="card-content">
              <!-- 两列固定等分：第一行服务器IP(左) + 端口(右)，第二行用户名(左) + 密码(右) -->
              <div v-if="uploadUiMode === 1" class="ftp-two-col">
                <div class="ftp-field">
                  <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.serverIP') }}</label>
                  <InputText v-model="ftpHost" :placeholder="t('deviceUpgrade.placeholders.serverIP')" class="flex-1" :disabled="ftpServerRunning" />
                </div>
                <div class="ftp-field">
                  <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.port') }}</label>
                  <InputText v-model="ftpPort" :placeholder="t('deviceUpgrade.placeholders.port')" class="flex-1" :disabled="ftpServerRunning" />
                </div>
                <div class="ftp-field">
                  <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.username') }}</label>
                  <InputText v-model="ftpUser" :placeholder="t('deviceUpgrade.placeholders.username')" class="flex-1" :disabled="ftpServerRunning" />
                </div>
                <div class="ftp-field">
                  <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.password') }}</label>
                  <InputText v-model="ftpPassword" type="password" :placeholder="t('deviceUpgrade.placeholders.password')" class="flex-1" :disabled="ftpServerRunning" />
                </div>
              </div>
              <div v-if="uploadUiMode === 1" class="flex align-items-center mb-3 compact-gap">
                <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.rootDirectory') }}</label>
                <div class="ftp-root-row">
                  <InputText v-model="ftpRoot" readonly class="ftp-root-input" />
                  <Button :label="t('deviceUpgrade.buttons.selectDirectory')" @click="chooseFtpDir" :disabled="ftpServerRunning" />
                  <Button
                    :label="ftpServerRunning ? t('deviceUpgrade.buttons.stopFTP') : t('deviceUpgrade.buttons.startFTP')"
                    :severity="ftpServerRunning ? 'danger' : 'success'"
                    @click="toggleFtpServer"
                  />
                </div>
              </div>

              <!-- 文件升级状态：一行展示 文件名 / 状态 / 大小 -->
              <div v-if="uploadUiMode === 1" class="cluster-selection-section">
                <h4>{{ t('deviceUpgrade.sections.fileUpgradeStatus') }}</h4>
                <div class="file-status-row">
                  <!-- 文件名 -->
                  <div class="status-item">
                    <label class="status-label font-semibold text-sm">{{ t('deviceUpgrade.labels.fileName') }}</label>
                    <div class="flex-1 p-2 border-1 border-round" :class="!ftpServerRunning ? 'file-status-disabled' : 'file-status-enabled'">
                      <span class="text-sm">
                        {{ !ftpServerRunning ? t('deviceUpgrade.messages.pleaseStartFTP') : (updateFile || t('deviceUpgrade.messages.noFileSelected')) }}
                      </span>
                    </div>
                  </div>
                  <!-- 状态 -->
                  <div class="status-item">
                    <label class="status-label font-semibold text-sm">{{ t('deviceUpgrade.labels.status') }}</label>
                    <div class="flex-1 p-2 border-1 border-round flex align-items-center gap-2" :class="!ftpServerRunning ? 'file-status-disabled' : 'file-status-enabled'">
                      <template v-if="!ftpServerRunning">
                        <span class="text-sm">-</span>
                      </template>
                      <template v-else>
                        <i :class="selectedFileStatus.exists ? 'pi pi-check-circle text-green-600' : 'pi pi-exclamation-triangle text-orange-600'"></i>
                        <span class="text-sm" :class="selectedFileStatus.exists ? 'text-green-700' : 'text-orange-700'">
                          {{ selectedFileStatus.exists ? translateStatus('ready') : translateStatus('notFound') }}
                        </span>
                        <Tag
                          v-if="selectedFileStatus.exists && selectedFileStatus.fileInfo"
                          :value="selectedFileStatus.isValid ? translateStatus('valid') : translateStatus('invalid')"
                          :severity="selectedFileStatus.isValid ? 'success' : 'warning'"
                          class="text-xs"
                        />
                      </template>
                    </div>
                  </div>
                  <!-- 大小 -->
                  <div class="status-item">
                    <label class="status-label font-semibold text-sm">{{ t('deviceUpgrade.labels.size') }}</label>
                    <div class="flex-1 p-2 border-1 border-round" :class="!ftpServerRunning ? 'file-status-disabled' : 'file-status-enabled'">
                      <span class="text-sm">
                        {{ !ftpServerRunning ? '-' : (selectedFileStatus.exists && selectedFileStatus.fileInfo ? selectedFileStatus.fileInfo.sizeFormatted : '-') }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <NewUploadPanel v-else-if="uploadUiMode === 2" />

              <!-- 版本信息 -->
              <div class="cluster-selection-section version-info-fill">
                <h4>{{ t('deviceUpgrade.sections.versionInfo') }}</h4>
                <VersionInfo />
              </div>
            </div>
          </div>

        </div>

        <!-- 右侧：设备升级 -->
        <div class="col-6">
          <div class="content-card">
            <h3>{{ t('deviceUpgrade.sections.deviceUpgrade') }}</h3>
            <div class="card-content">
              <!-- 升级文件选择 -->
              <div class="flex align-items-center mb-3 gap-3">
                <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.upgradeFile') }}</label>
                <div class="flex gap-2 flex-1">
                  <InputText v-model="updateFile" readonly :placeholder="t('deviceUpgrade.placeholders.selectUpgradeFile')" class="flex-1" />
                  <Button :label="t('deviceUpgrade.buttons.selectFile')" @click="chooseFile" />
                </div>
              </div>

              <!-- 升级类型 -->
              <div class="flex align-items-center mb-3 gap-3">
                <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.upgradeType') }}</label>
                <Dropdown
                  v-model="selectedUpgrade"
                  :options="translatedUpgradeOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="t('deviceUpgrade.placeholders.selectUpgradeType')"
                  class="flex-1"
                />
              </div>

              <!-- 簇选择 - 始终显示，但根据升级类型控制是否可选 -->
              <div class="cluster-selection-section">
                <h4>{{ t('deviceUpgrade.sections.clusterSelection') }}</h4>

                <!-- 配置状态提示 -->
                <div class="cluster-config-info mb-3" v-if="clusterLimits.totalClusters > 0">
                  <i class="pi pi-info-circle mr-2 text-blue-500"></i>
                  <span class="text-sm text-gray-600">
                    {{ clusterLimits.heap2Clusters > 0
                      ? t('deviceUpgrade.messages.clusterCurrentConfigTwoHeaps', [
                          clusterLimits.totalClusters,
                          clusterLimits.heap1Clusters,
                          clusterLimits.heap2Clusters
                        ])
                      : t('deviceUpgrade.messages.clusterCurrentConfigOneHeap', [
                          clusterLimits.totalClusters,
                          clusterLimits.heap1Clusters
                        ])
                    }}
                  </span>
                </div>

                <div class="cluster-selection-compact">
                  <!-- 第1-10簇 -->
                  <div class="cluster-row">
                    <div class="cluster-label-column">
                      <span class="cluster-row-label">{{ t('deviceUpgrade.cluster.cluster1to10') }}</span>
                      <!-- 全选按钮 -->
                      <div class="cluster-checkbox-compact">
                        <Checkbox
                          :modelValue="isAllSelected1"
                          @update:modelValue="toggleSelectAll1"
                          :binary="true"
                          :disabled="selectedUpgrade === '0xA000'"
                        />
                        <label>{{ t('deviceUpgrade.buttons.selectAll') }}</label>
                      </div>
                    </div>
                    <div class="cluster-checkboxes-compact">
                      <div v-for="i in 10" :key="i" class="cluster-checkbox-compact">
                        <Checkbox
                          :modelValue="bcuSelection1.includes(i)"
                          @update:modelValue="toggleBcuSelection1(i)"
                          :binary="true"
                          :disabled="selectedUpgrade === '0xA000' || !isClusterAvailable(i)"
                        />
                        <label :class="{ 'text-gray-400': !isClusterAvailable(i) }">
                          {{ i }}
                        </label>
                      </div>
                    </div>
                  </div>
                  <!-- 第11-20簇 -->
                  <div class="cluster-row">
                    <div class="cluster-label-column">
                      <span class="cluster-row-label">{{ t('deviceUpgrade.cluster.cluster11to20') }}</span>
                      <!-- 全选按钮 -->
                      <div class="cluster-checkbox-compact">
                        <Checkbox
                          :modelValue="isAllSelected2"
                          @update:modelValue="toggleSelectAll2"
                          :binary="true"
                          :disabled="selectedUpgrade === '0xA000'"
                        />
                        <label>{{ t('deviceUpgrade.buttons.selectAll') }}</label>
                      </div>
                    </div>
                    <div class="cluster-checkboxes-compact">
                      <div v-for="i in 10" :key="i+10" class="cluster-checkbox-compact">
                        <Checkbox
                          :modelValue="bcuSelection2.includes(i+10)"
                          @update:modelValue="toggleBcuSelection2(i+10)"
                          :binary="true"
                          :disabled="selectedUpgrade === '0xA000' || !isClusterAvailable(i+10)"
                        />
                        <label :class="{ 'text-gray-400': !isClusterAvailable(i+10) }">
                          {{ i+10 }}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- BMU升级参数 - 始终显示，但根据升级类型控制是否可选 -->
              <div class="bmu-params-section">
                <h4>{{ t('deviceUpgrade.sections.bmuUpgradeParams') }}</h4>
                <div class="flex align-items-center mb-3 gap-3">
                  <label class="w-8rem font-semibold text-sm">{{ t('deviceUpgrade.labels.bmuUpgradeType') }}</label>
                  <Dropdown
                    v-model="bmuUpdateStyle"
                    :options="translatedBmuUpgradeOptions"
                    optionLabel="label"
                    optionValue="value"
                    :placeholder="t('deviceUpgrade.placeholders.selectBMUUpgradeType')"
                    class="flex-1"
                    :disabled="selectedUpgrade !== '0xA002'"
                  />
                </div>
                <div class="flex align-items-center mb-3 gap-3">
                  <label class="w-8rem font-semibold text-sm">{{ t('deviceUpgrade.labels.bmuStartAddress') }}</label>
                  <InputText
                    v-model="bmuStartAddressHex"
                    :placeholder="t('deviceUpgrade.placeholders.bmuStartAddress')"
                    @input="validateHexAddress"
                    class="flex-1"
                    :disabled="selectedUpgrade !== '0xA002'"
                  />
                </div>
                <div class="flex align-items-center mb-3 gap-3">
                  <label class="w-8rem font-semibold text-sm">{{ t('deviceUpgrade.labels.bmuDeviceCount') }}</label>
                  <InputNumber
                    v-model="bmuDeviceCount"
                    :min="1"
                    :max="32"
                    class="flex-1"
                    :disabled="selectedUpgrade !== '0xA002'"
                  />
                </div>
              </div>

              <!-- 升级操作 -->
              <div class="section-divider"></div>
              <div class="flex gap-2 mb-3">
                <Button
                  :label="t('deviceUpgrade.buttons.startUpgrade')"
                  severity="success"
                  @click="startUpgrade"
                  :disabled="!canStartUpgrade"
                  size="small"
                />
              </div>

              <!-- 升级状态已移除，根据需求不在设备升级卡片内显示 -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 升级执行结果独立Card -->
    <div class="card" style="margin-top: 1rem;">
      <div class="content-card">
        <h3>{{ t('deviceUpgrade.sections.upgradeExecutionResult', '升级执行结果') }}</h3>
        <div class="card-content">
          <!-- BAU升级执行结果详情 -->
          <div class="upgrade-result-section">
            <h4>{{ t('deviceUpgrade.sections.bauUpgradeResult', 'BAU升级执行结果') }}</h4>
            <div v-if="hasBauUpgradeResult" class="result-grid">
              <!-- BAU升级时显示：OTA错误码和BAU故障码 -->
              <template v-if="selectedUpgrade === '0xA000'">
                <div class="result-item">
                  <label>{{ t('deviceUpgrade.result.otaErrorCode', 'OTA下载错误码') }}：</label>
                  <span>{{ bauUpgradeResult.otaErrorCode }}</span>
                </div>
                <div class="result-item">
                  <label>{{ t('deviceUpgrade.result.bauFaultCode', 'BAU升级故障码') }}：</label>
                  <span>{{ bauUpgradeResult.bauFaultCode }}</span>
                </div>
              </template>
              <!-- BCU/BMU升级时只显示：OTA错误码 -->
              <template v-else-if="selectedUpgrade === '0xA001' || selectedUpgrade === '0xA002'">
                <div class="result-item">
                  <label>{{ t('deviceUpgrade.result.otaErrorCode', 'OTA下载错误码') }}：</label>
                  <span>{{ bauUpgradeResult.otaErrorCode }}</span>
                </div>
              </template>
            </div>
            <div v-else class="result-empty">
              <span class="text-sm text-color-secondary">{{ t('deviceUpgrade.messages.noBauUpgradeResult', '暂无BAU升级结果，请先启动BAU升级') }}</span>
            </div>
          </div>

          <div class="result-divider"></div>

          <!-- BCU/BMU升级执行结果详情 -->
          <div class="upgrade-result-section">
            <h4>{{ t('deviceUpgrade.sections.upgradeResult', 'BCU/BMU升级执行结果') }}</h4>
            
            <!-- 遍历Map显示每个簇的结果 -->
            <div 
              v-for="[clusterKey, result] in bcuBmuUpgradeResultsMap" 
              :key="clusterKey"
              class="cluster-result-card"
              style="margin-bottom: 16px; padding: 12px; border: 1px solid var(--surface-border); border-radius: 4px;"
            >
              <h5 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                {{ getClusterDisplayName(clusterKey) }}升级结果
              </h5>
              
              <div class="result-grid">
                <!-- BCU升级时显示：升级文件下载完成标志 -->
                <div v-if="selectedUpgrade === '0xA001'" class="result-item">
                  <label>{{ t('deviceUpgrade.result.downloadCompleteFlag', '下载完成标志') }}：</label>
                  <span>{{ result.downloadCompleteFlag }}</span>
                </div>
                
                <!-- BMU升级时显示：升级文件下载完成标志 -->
                <div v-if="selectedUpgrade === '0xA002'" class="result-item">
                  <label>{{ t('deviceUpgrade.result.downloadCompleteFlag', '下载完成标志') }}：</label>
                  <span>{{ result.downloadCompleteFlag }}</span>
                </div>
                
                <!-- BCU升级时显示：OTA文件下载错误码 -->
                <div v-if="selectedUpgrade === '0xA001'" class="result-item">
                  <label>{{ t('deviceUpgrade.result.otaErrorCode', 'OTA下载错误码') }}：</label>
                  <span>{{ result.otaErrorCode }}</span>
                </div>
                
                <!-- BMU升级时显示：OTA文件下载错误码 -->
                <div v-if="selectedUpgrade === '0xA002'" class="result-item">
                  <label>{{ t('deviceUpgrade.result.otaErrorCode', 'OTA下载错误码') }}：</label>
                  <span>{{ result.otaErrorCode }}</span>
                </div>
                
                <!-- BCU升级时显示：BCU升级故障码 -->
                <div v-if="selectedUpgrade === '0xA001'" class="result-item">
                  <label>{{ t('deviceUpgrade.result.bcuFaultCode', 'BCU升级故障码') }}：</label>
                  <span>{{ result.bcuFaultCode }}</span>
                </div>
                
                <!-- BMU升级时显示：BMU升级故障码 -->
                <div v-if="selectedUpgrade === '0xA002'" class="result-item">
                  <label>{{ t('deviceUpgrade.result.bmuFaultCode', 'BMU升级故障码') }}：</label>
                  <span>{{ result.bmuFaultCode }}</span>
                </div>
                
                <!-- BMU升级时显示：BMU升级失败设备标识 -->
                <div v-if="selectedUpgrade === '0xA002' && result.bmuFailedDevices && result.bmuFailedDevices.length > 0" class="result-item">
                  <label>{{ t('deviceUpgrade.result.bmuFailedDevices', 'BMU升级失败设备') }}：</label>
                  <span>{{ result.bmuFailedDevices.join(', ') }}</span>
                </div>
                
                <!-- BMU升级时显示：下载进度 -->
                <div v-if="selectedUpgrade === '0xA002' && result.totalPackets > 0" class="result-item" style="width: 100%;">
                  <label>{{ t('deviceUpgrade.result.progress', '下载进度') }}：</label>
                  <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                    <ProgressBar 
                      :value="Math.round((result.currentPacket / result.totalPackets) * 100)" 
                      :showValue="false"
                      style="flex: 0 1 auto; min-width: 200px; max-width: 400px; height: 16px;"
                    />
                    <span style="font-weight: 500; white-space: nowrap; font-size: 12px; color: var(--text-color);">
                      {{ result.currentPacket }} / {{ result.totalPackets }} ({{ Math.round((result.currentPacket / result.totalPackets) * 100) }}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="!hasUpgradeResult" class="result-empty">
              <span class="text-sm text-color-secondary">{{ t('deviceUpgrade.messages.noUpgradeResult', '暂无升级结果，请先启动BCU/BMU升级') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 密码保护对话框 -->
  <Dialog
    v-model:visible="showPasswordDialog"
    :closable="true"
    :modal="false"
    :header="t('password.header')"
    :style="{ width: '25rem' }"
    @hide="cancelPwd"
  >
    <div class="flex flex-column gap-3">
      <InputText v-model="inputPwd" type="password" @keyup.enter="checkPwd" autofocus />
      <Button :label="t('password.confirm')" @click="checkPwd" style="margin-right: 0.5rem" />
      <Button :label="t('password.cancel')" severity="danger" class="cancel-large" @click="cancelPwd" />
      <div v-if="pwdError" style="color: red; margin-top: 0.5rem">{{ t('deviceUpgrade.messages.passwordError') }}</div>
    </div>
  </Dialog>

    <!-- 取消提示 -->
    <Dialog v-model:visible="showCancelTip" :closable="false" :modal="false" :style="{ width: '20rem' }">
      <span>{{ t('deviceUpgrade.messages.operationCancelled') }}</span>
    </Dialog>
  </div>
</template>

<style scoped>
.card {
  padding: 10px;
  background: var(--surface-ground);
}

/* 网格布局 - 确保左右两列高度一致 */
.grid {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.col-6 {
  flex: 6;
  display: flex;
  flex-direction: column;
}

.content-card {
  background: var(--surface-card);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--surface-border);
  margin-bottom: 2px;
  overflow: hidden;
  flex: 1;
}

.content-card h3 {
  background: var(--primary-color);
  color: var(--primary-color-text);
  padding: 12px 20px;
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
  border-radius: 12px 12px 0 0;
}

.card-content {
  padding: 12px;
}

.section-divider {
  margin: 12px 0;
  border-top: 1px solid var(--surface-border);
}

/* 参数配置区域通用样式 */
.cluster-selection-section,
.bmu-params-section {
  margin: 12px 0;
  padding: 12px;
  background: var(--surface-section);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  border-left: 4px solid var(--primary-color);
}

.version-info-fill {
  display: block;
}

.cluster-selection-section h4,
.bmu-params-section h4 {
  margin: 0 0 16px 0;
  color: var(--text-color);
  font-size: 16px;
  font-weight: 600;
}

/* 紧凑型簇选择样式 */
.cluster-selection-compact {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cluster-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* 标签列 - 包含文字和全选按钮 */
.cluster-label-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 80px;
  flex-shrink: 0;
}

.cluster-row-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.cluster-checkboxes-compact {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  flex: 1;
}

.cluster-checkbox-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  transition: all 0.2s ease;
  min-height: 28px;
}

.cluster-checkbox-compact:hover {
  border-color: var(--primary-color);
  background: var(--surface-hover);
}

.cluster-checkbox-compact label {
  font-size: 12px;
  cursor: pointer;
  color: var(--text-color);
  font-weight: 500;
}

/* 升级状态样式已移除 */

/* 禁用状态样式 */
.cluster-checkbox-compact:has(input:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--surface-section);
}

.cluster-checkbox-compact:has(input:disabled):hover {
  border-color: var(--surface-border);
  background: var(--surface-section);
}

/* 文件升级状态区域样式优化 */
.file-status-disabled {
  background: var(--surface-section) !important;
  border-color: var(--surface-border) !important;
}

.file-status-disabled .text-sm {
  color: var(--text-color-secondary) !important;
}

.file-status-enabled {
  background: var(--surface-card) !important;
  border-color: var(--surface-border) !important;
}

.file-status-enabled .text-sm {
  color: var(--text-color) !important;
}

/* 升级结果展示区域 */
.upgrade-result-section {
  margin-top: 12px;
  padding: 8px 0;
  background: transparent;
  border: none;
}

.upgrade-result-section h4 {
  margin: 0 0 12px 0;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 600;
}

.result-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.result-item label {
  min-width: 100px;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.result-item span {
  color: var(--text-color);
  flex: 1;
}

.result-empty {
  padding: 16px 0;
  text-align: center;
  color: var(--text-color-secondary);
}

/* 版本信息相关样式已移动到 VersionInfo.vue 组件中 */

/* 原版本信息样式保留（用于升级结果等其他地方） */
.version-section {
  margin-top: 16px;
  padding: 12px;
  background: var(--surface-section);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  border-left: 4px solid var(--primary-color);
}

.version-section:first-child {
  margin-top: 0;
}

.version-section h4 {
  margin: 0 0 12px 0;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 600;
}

.version-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px; /* 适当增大字体，避免过小 */
}

.version-item label {
  min-width: 100px;
  font-weight: 500;
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

.version-item span {
  color: var(--text-color);
  flex: 1;
  word-break: break-all;
}

.version-empty {
  padding: 16px 0;
  text-align: center;
  color: var(--text-color-secondary);
}

.cancel-large {
  font-size: 0.95rem;
  padding: 0.6rem 1rem;
}


/* FTP双列布局 */
.ftp-two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  align-items: center;
  margin-bottom: 12px;
}

.ftp-field {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.ftp-field > label {
  width: 4.75rem !important;
  flex-shrink: 0;
}

.ftp-field :deep(.p-inputtext) {
  width: 100%;
}

@media (max-width: 768px) {
  .ftp-two-col { grid-template-columns: 1fr; }
}

/* 根目录与按钮同一行，缩小根目录宽度 */
.ftp-root-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
  flex-wrap: nowrap;
}

.ftp-root-input :deep(input) {
  width: 100%;
}

.ftp-root-input {
  flex: 0 1 420px; /* 进一步缩小显示宽度，约420px */
  min-width: 200px; /* 保证在较窄时仍可展示 */
}

/* 保持按钮文字不换行，维持原视觉尺寸 */
.ftp-root-row :deep(.p-button) {
  white-space: nowrap;
  min-width: 96px; /* 防止中文标签换行 */
}

/* 文件升级状态：三列紧凑布局 */
.file-status-row {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr; /* 文件名列适当更宽，后两列等分 */
  gap: 12px 12px; /* 列间距适当缩小，为文件名让出空间 */
  align-items: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px; /* 让标签更贴近其对应显示框 */
  min-width: 0;
}

.status-label {
  min-width: auto; /* 取消固定最小宽度，贴近显示框 */
  width: auto;
  white-space: nowrap;
}

.result-divider {
  border-top: 1px solid var(--surface-border);
  margin: 10px 0;
}

.compact-gap {
  gap: 5px;
}

.compact-gap > label {
  width: 4.75rem !important;
  flex-shrink: 0;
}

/* 缩小标签固定宽度（仅限本组件） */
/* 恢复标签宽度为原有类，不再强制重写 */
</style>
