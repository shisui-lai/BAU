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
import { useFtpFileManager } from '@/composables/core/data-processing/upgrade/useFtpFileManager.js'

const toast = useToast()
const router = useRouter()
const { t, te, locale } = useI18n()

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

// 密码保护相关
const showPasswordDialog = ref(false)
const inputPwd = ref('')
const pwdError = ref(false)
const showCancelTip = ref(false)
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
  set: (value) => upgradeStore.updateUpgradeParams({ type: value })
})

const bcuSelection1 = computed({
  get: () => upgradeStore.upgradeParams.bcuSelection1,
  set: (value) => upgradeStore.updateUpgradeParams({ bcuSelection1: value })
})

const bcuSelection2 = computed({
  get: () => upgradeStore.upgradeParams.bcuSelection2,
  set: (value) => upgradeStore.updateUpgradeParams({ bcuSelection2: value })
})

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

// 翻译后的升级状态文本
const translatedUpgradeStatusText = computed(() => {
  const status = upgradeStore.upgradeStatus.status
  if (!status) {
    return translateStatus('notStarted')
  }
  
  // 根据状态映射到翻译键
  const statusMap = {
    'sending': 'upgrading',
    'sent': 'upgrading', 
    'success': 'success',
    'error': 'error',
    'stopped': 'stopped'
  }
  
  const statusKey = statusMap[status] || status
  return translateStatus(statusKey)
})

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

// 全选1-10簇的状态（计算属性）
const isAllSelected1 = computed(() => {
  // 检查1-10簇是否全部被选中
  for (let i = 1; i <= 10; i++) {
    if (!bcuSelection1.value.includes(i)) {
      return false
    }
  }
  return true
})

// 全选11-20簇的状态（计算属性）
const isAllSelected2 = computed(() => {
  // 检查11-20簇是否全部被选中
  for (let i = 11; i <= 20; i++) {
    if (!bcuSelection2.value.includes(i)) {
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
    // 否则全选1-10簇
    bcuSelection1.value = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }
}

// 切换全选11-20簇
const toggleSelectAll2 = () => {
  if (isAllSelected2.value) {
    // 如果已经全选，则清空
    bcuSelection2.value = []
  } else {
    // 否则全选11-20簇
    bcuSelection2.value = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  }
}

const startUpgrade = async () => {
  try {
    await upgradeStore.startUpgrade()
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
    showPasswordDialog.value = false
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
  showCancelTip.value = true
  // 返回上一页
  setTimeout(() => {
    router.go(-1)
  }, 500)
}

// 初始化页面函数
const initializePage = async () => {
  try {
    // 预清理，避免重复绑定
    window.electron.ipcRenderer.removeAllListeners?.('UPGRADE')

    // 监听升级应答结果 - 使用正确的MQTT事件名称
    window.electron.ipcRenderer.on('UPGRADE', handleUpgradeResponse)

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
  } catch (error) {
    console.error('页面初始化失败:', error)
  }
}

onMounted(async () => {
  // 密码保护检查
  if (sessionStorage.getItem('upgradePagePassword') !== 'ok') {
    showPasswordDialog.value = true
    return
  }

  // 密码已验证，直接初始化
  await initializePage()
})

// 清理
onUnmounted(() => {
  // 彻底清理所有监听器
  window.electron.ipcRenderer.removeAllListeners?.('UPGRADE')
  cleanup() // 清理FTP文件管理功能
})
</script>

<!-- BAU设备升级界面 -->
<template>
  <div class="card">
    <div class="upgrade-container">
      <!-- 左右布局：左侧(FTP配置+文件状态) + 右侧(设备升级) -->
      <div class="grid">
        <!-- 左侧：FTP配置 + 文件状态 -->
        <div class="col-7">
          <!-- FTP服务器配置卡片 -->
          <div class="content-card">
            <h3>{{ t('deviceUpgrade.sections.ftpServer') }}</h3>
            <div class="card-content">
              <div class="flex align-items-center mb-3 gap-3">
                <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.serverIP') }}</label>
                <InputText v-model="ftpHost" :placeholder="t('deviceUpgrade.placeholders.serverIP')" class="flex-1" />
              </div>
              <div class="flex align-items-center mb-3 gap-3">
                <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.port') }}</label>
                <InputText v-model="ftpPort" :placeholder="t('deviceUpgrade.placeholders.port')" class="flex-1" />
              </div>
              <div class="flex align-items-center mb-3 gap-3">
                <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.username') }}</label>
                <InputText v-model="ftpUser" :placeholder="t('deviceUpgrade.placeholders.username')" class="flex-1" />
              </div>
              <div class="flex align-items-center mb-3 gap-3">
                <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.password') }}</label>
                <InputText v-model="ftpPassword" type="password" :placeholder="t('deviceUpgrade.placeholders.password')" class="flex-1" />
              </div>
              <div class="flex align-items-center mb-3 gap-3">
                <label class="w-6rem font-semibold text-sm">{{ t('deviceUpgrade.labels.rootDirectory') }}</label>
                <div class="flex gap-2 flex-1">
                  <InputText v-model="ftpRoot" readonly class="flex-1" />
                  <Button :label="t('deviceUpgrade.buttons.selectDirectory')" @click="chooseFtpDir" />
                </div>
              </div>
              <div class="flex justify-content-end mb-1">
                <Button
                  :label="ftpServerRunning ? t('deviceUpgrade.buttons.stopFTP') : t('deviceUpgrade.buttons.startFTP')"
                  :severity="ftpServerRunning ? 'danger' : 'success'"
                  @click="toggleFtpServer"
                />
              </div>

              <!-- 文件升级状态 -->
              <div class="cluster-selection-section">
                <h4>{{ t('deviceUpgrade.sections.fileUpgradeStatus') }}</h4>
                <div class="flex align-items-center mb-3 gap-3">
                  <label class="w-8rem font-semibold text-sm">{{ t('deviceUpgrade.labels.fileName') }}</label>
                  <div class="flex-1 p-2 border-1 border-round" :class="!ftpServerRunning ? 'file-status-disabled' : 'file-status-enabled'">
                    <span class="text-sm">
                      {{ !ftpServerRunning ? t('deviceUpgrade.messages.pleaseStartFTP') : (updateFile || t('deviceUpgrade.messages.noFileSelected')) }}
                    </span>
                  </div>
                </div>
                <div class="flex align-items-center mb-3 gap-3">
                  <label class="w-8rem font-semibold text-sm">{{ t('deviceUpgrade.labels.status') }}</label>
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
                <div class="flex align-items-center mb-3 gap-3">
                  <label class="w-8rem font-semibold text-sm">{{ t('deviceUpgrade.labels.size') }}</label>
                  <div class="flex-1 p-2 border-1 border-round" :class="!ftpServerRunning ? 'file-status-disabled' : 'file-status-enabled'">
                    <span class="text-sm">
                      {{ !ftpServerRunning ? '-' : (selectedFileStatus.exists && selectedFileStatus.fileInfo ? selectedFileStatus.fileInfo.sizeFormatted : '-') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>

        <!-- 右侧：设备升级 -->
        <div class="col-5">
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
                          :disabled="selectedUpgrade === '0xA000'"
                        />
                        <label>{{ i }}</label>
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
                          :disabled="selectedUpgrade === '0xA000'"
                        />
                        <label>{{ i+10 }}</label>
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
                <Button
                  :label="t('deviceUpgrade.buttons.stopUpgrade')"
                  severity="danger"
                  @click="stopUpgrade"
                  :disabled="!upgradeStore.upgradeStatus.isUpgrading"
                  size="small"
                />
              </div>

              <!-- 升级状态 -->
              <div class="upgrade-status">
                <p>{{ t('deviceUpgrade.labels.status') }} {{ translatedUpgradeStatusText }}</p>
                <p v-if="upgradeStore.upgradeStatus.lastUpdate">
                  {{ t('deviceUpgrade.messages.lastUpdate') }} {{ upgradeStore.upgradeStatus.lastUpdate.toLocaleString() }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 密码保护对话框 -->
  <Dialog
    v-model:visible="showPasswordDialog"
    :closable="false"
    :modal="true"
    :header="t('password.header')"
    :style="{ width: '25rem' }"
  >
    <div class="flex flex-column gap-3">
      <InputText v-model="inputPwd" type="password" @keyup.enter="checkPwd" autofocus />
      <Button :label="t('password.confirm')" @click="checkPwd" style="margin-right: 0.5rem" />
      <Button :label="t('password.cancel')" severity="secondary" @click="cancelPwd" />
      <div v-if="pwdError" style="color: red; margin-top: 0.5rem">{{ t('deviceUpgrade.messages.passwordError') }}</div>
    </div>
  </Dialog>

  <!-- 取消提示 -->
  <Dialog v-model:visible="showCancelTip" :closable="false" :modal="true" :style="{ width: '20rem' }">
    <span>{{ t('deviceUpgrade.messages.operationCancelled') }}</span>
  </Dialog>
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

.col-7 {
  flex: 7;
  display: flex;
  flex-direction: column;
}

.col-5 {
  flex: 5;
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

.upgrade-status {
  padding: 8px;
  background: var(--surface-section);
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
  margin-top: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.upgrade-status p {
  margin: 4px 0;
  font-size: 0.9rem;
  color: var(--text-color);
}

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
</style>
