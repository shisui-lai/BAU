<template>
  <Dialog
    v-if="showPwdDialog"
    v-model:visible="showPwdDialog"
    :header="t('password.header')"
    :modal="true"
    :closable="false"
  >
    <div>
      <InputText v-model="inputPwd" type="password" @keyup.enter="checkPwd" autofocus />
      <Button :label="t('password.confirm')" @click="checkPwd" style="margin-left: 0.5rem" />
      <Button
        :label="t('password.cancel')"
        @click="cancelPwd"
        style="margin-left: 0.5rem"
        severity="secondary"
      />
      <div v-if="pwdError" style="color: red; margin-top: 0.5rem">{{ t('password.error') }}</div>
    </div>
  </Dialog>
  <div v-if="cancelled" class="cancelled-tip">
    <i class="pi pi-info-circle" style="font-size: 2rem; color: #b0b0b0; margin-right: 0.5rem"></i>
    <span>{{ t('password.cancelTip') || '已取消操作，未进入升级页面' }}</span>
  </div>
  <div class="card update1" v-if="!showPwdDialog && !cancelled">
    <!--     {{ ipstore.selectedInterface }} -->
    <div class="control">
      <div class="section1">
        <div>
          <div
            style="display: flex; gap: 2rem; align-items: center; justify-content: space-between"
          >
            <h5>{{ t('upgrade.FTPTitle') }}</h5>
            <Button
              class="p-button-sm p-button-outlined"
              @click="toggleFtp"
              :label="t(`upgrade.FTPButton.${ftpButtonLabel}`)"
              :severity="ftpSeverity"
              :icon="ftpIcon"
              iconPos="left"
            />
          </div>

          <div class="input-row">
            <label for="FTPIp">{{ t('upgrade.FTPIp') }}：</label>
            <InputText v-model="ipstore.selectedInterface" id="FTPIp" class="flex-1" disabled />
            <!--  <span v-if="FTPIp && !isValidFTPIP" class="error-text">请输入有效IP </span> -->
          </div>
          <div class="input-row">
            <label for="FTPPort">{{ t('upgrade.FTPPort') }}：</label>
            <InputText v-model="FTPPort" id="FTPPort" class="flex-1" :disabled="ftpRunning" />
            <span v-if="FTPPort && !isValidFTPPort" class="error-text">
              ※ 端口号必须为1-65535之间的数字
            </span>
          </div>
          <div class="input-row">
            <label for="FTPUser">{{ t('upgrade.FTPUser') }}：</label>
            <InputText v-model="FTPUser" id="FTPUser" class="flex-1" disabled />
          </div>
          <div class="input-row">
            <label for="FTPPassword">{{ t('upgrade.FTPPassword') }}：</label>
            <InputText v-model="FTPPassword" id="FTPPassword" class="flex-1" disabled />
          </div>
          <div class="input-row">
            <label for="FTPPassword">{{ t('upgrade.FTPPath') }}：</label>
            <InputText v-model="defaultFTPDir" id="defaultFTPDir" readonly class="flex-1" />
            <Button
              class="p-button-sm p-button-outlined"
              :label="t('upgrade.FTPPathPlaceholder')"
              icon="pi pi-pencil"
              @click="chooseFTPDefaultDir"
              style="min-width: 4rem"
              :disabled="ftpRunning"
            />
          </div>
        </div>
        <h5>{{ t('upgrade.upgradeTitle') }}</h5>
        <div>
          <div class="input-row">
            <label for="upgradeOptions">{{ t('upgrade.upgradeStyle') }}：</label>
            <Dropdown
              v-model="selectedUpgrade"
              :options="localizedUpgradeOptions"
              optionLabel="label"
              optionValue="value"
              class="flex-1"
            >
            </Dropdown>
          </div>
          <div class="input-row">
            <label for="connectedIps" style="">{{ t('upgrade.upgradeSelectIp') }}：</label>
            <MultiSelect
              v-model="ipListUpdate"
              :options="formattedConnectedIps"
              filter
              optionLabel="label"
              optionValue="value"
              :placeholder="t('upgrade.upgradeSelectIpPlaceholder')"
              :maxSelectedLabels="0"
              selectionMode="multiple"
              class="flex-1"
            />
            <!-- <span v-if="ipListUpdate?.length === 0" class="error-text">※ 至少选择一个IP</span> -->
          </div>
          <div class="input-row">
            <label for="bcuUpdateNum">{{ t('upgrade.upgradeBCUNums') }}：</label>
            <InputText v-model="bcuUpdateNum" class="flex-1" disabled />
          </div>
          <div class="input-row">
            <label for="updateFile">{{ t('upgrade.upgradeFile') }}：</label>
            <InputText
              v-model="updateFile"
              id="updateFile"
              readonly
              .placeholder="t('upgrade.upgradeFilePlaceholder')"
              class="flex-1"
            />
            <Button
              :label="t('upgrade.upgradeFileButton')"
              icon="pi pi-folder-open"
              class="ml-2"
              @click="chooseFile"
            />
          </div>
        </div>
        <div>
          <div class="input-row">
            <label for="bmuUpgradeOptions">{{ t('upgrade.upgradeBMUStyle') }}：</label>
            <Dropdown
              v-model="bmuUpdateStyle"
              :options="localizedbmuUpgradeOptions"
              optionLabel="label"
              optionValue="value"
              :disabled="selectedUpgrade !== '0xa002'"
              class="flex-1"
            >
            </Dropdown>
          </div>
          <div class="input-row">
            <label for="bmuUpdateAddress">{{ t('upgrade.upgradeBMUStartAddress') }}：</label>
            <InputText
              v-model="bmuUpdateAddress"
              placeholder="0xB0-0xCF"
              pattern="^(0x[0-9a-fA-F]{1,4}|[0-9a-fA-F]{1,4})$"
              title="支持格式：0xB0 或 B0（1-4位十六进制）"
              :disabled="selectedUpgrade !== '0xa002'"
              class="flex-1"
            />
            <span v-if="bmuUpdateAddress && !isValidBMUAddress" class="error-text">
              ※ 必须为1-4位十六进制地址（如0xB0或B0）
            </span>
          </div>
          <div class="input-row">
            <label for="bmuUpdateNum">{{ t('upgrade.upgradeBMUNums') }}：</label>
            <InputText
              v-model="bmuUpdateNum"
              type="number"
              min="1"
              max="32"
              placeholder="1-32"
              :disabled="selectedUpgrade !== '0xa002'"
              class="flex-1"
            />
            <!-- BMU数量提示 -->
            <span v-if="bmuUpdateNum && !isValidBMUNumber" class="error-text">
              ※ 设备数量必须为1-32之间的整数
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end">
          <Button
            :label="
              (someCommunicating = ipstore.ipList.some((ip) => ipstore.getIpCommunicationActive(ip))
                ? t('connect.stop')
                : t('connect.start'))
            "
            @click="toggleCommunication"
            :severity="
              (someCommunicating = ipstore.ipList.some((ip) => ipstore.getIpCommunicationActive(ip))
                ? 'secondary'
                : 'info')
            "
            :icon="
              (someCommunicating = ipstore.ipList.some((ip) => ipstore.getIpCommunicationActive(ip))
                ? 'pi pi-stop'
                : 'pi pi-play')
            "
            :disabled="!hasActiveConnection"
          />
          <Button
            @click="startUpgradeProcess"
            :disabled="
              !canSendUpdate || upgradeState === UPGRADE_STATE.SENDING_INSTRUCTIONS /* ||
            (allCommunicating = ipstore.ipList.every((ip) => ipstore.getIpCommunicationActive(ip))) */
            "
            :class="{ 'disabled-button': !canSendUpdate }"
            :label="t(`upgrade.upgradeButtonText.${upgradeButtonText}`)"
            icon="pi pi-play"
          />
        </div>
        <!-- BMU Progress Bar -->
        <div
          v-if="selectedUpgrade === '0xa002' && upgradeState == UPGRADE_STATE.SENDING_INSTRUCTIONS"
          style="display: flex; flex-direction: column; gap: 0.5rem"
        >
          <label>{{ t('upgrade.upgradBMUProcess') }}：</label>
          <ProgressBar :value="parseInt(bmuProgress, 10)" />
        </div>
      </div>
      <!--       <div class="section">
        <div style="display: flex; flex-direction: column; gap: 1rem">
          <div>
            <h5>{{ t('upgrade.feadbackTitle') }}</h5>
            <div>
              <DataTable :value="upgradeData[0].element" showGridlines>
                <Column field="label" :header="t('upgrade.feadbackResult')"> </Column>
                <Column field="value" :header="t('upgrade.feadbackDisplaceValue')"> </Column>
                <Column field="row" :header="t('upgrade.feadbackRawValue')"> </Column>
              </DataTable>
            </div>
          </div>
        </div>
      </div> -->
      <div class="section">
        <div style="display: flex; flex-direction: column; gap: 0.5rem">
          <div
            style="display: flex; gap: 0.5rem; justify-content: space-between; align-items: center"
          >
            <h5>{{ t('upgrade.BCUBMUVersion') }}</h5>
            <!--   <Button
              :label="t('upgrade.versionRefreshButton')"
              icon="pi pi-refresh"
              @click="loadVersions"
              :loading="isLoadingVersions"
            /> -->
          </div>
          <div>
            <DataTable :value="pivotVersions.rows" showGridlines>
              <!-- 第一列：BCU IP -->
              <Column field="label" header="BCU/BMU" />
              <Column v-for="ip in pivotVersions.ips" :key="ip" :field="ip" :header="ip" />
            </DataTable>
          </div>
        </div>
      </div>
    </div>
    <!--     <div class="updateStat">
      <div class="status-list">
        <div v-for="ip in displayIps" :key="ip" class="status-item">
          <span class="ip-label">{{ ip }}：</span>
          <span :class="statusClass(ip)">{{ statusText(ip) }}</span>
          <span v-if="errorCodes[ip]" class="error-message">（错误：{{ errorCodes[ip] }}）</span>
        </div>
      </div>
    </div> -->
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeMount, onBeforeUnmount, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia' // 必须引入这个helper
import { useI18n } from 'vue-i18n'
const { t, te, locale } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useUpdateStore } from '../../../../../stores/updateStore.js'
import { CORRECT_PASSWORD1 } from '../control/pwd.js'
import { useToast } from 'primevue/usetoast'
const toast = useToast()
const ipstore = useIpStore() // 获取 Pinia store
const updateStore = useUpdateStore() // 获取 Pinia store
const showPwdDialog = ref(true)
const inputPwd = ref('')
const pwdError = ref(false)
// 1. 维护一个"FTP是否已启动"的状态
const ftpRunning = ref(false)
const defaultFTPDir = ref('')
let listenerId = ref(null)
// 1）下发复位后需要重读的 IP
const pendingReadAfterReboot = new Set()
// 2）复位后已经真实断连过一次的 IP
const sawDisconnect = new Set()
const initialErrors = reactive({})
const bcuDownloadStatus = reactive({})
// 存储每个设备上次已处理的错误码
const lastError = reactive({})
// 存储：{ [ip: string]: string }
const bcuVersions = reactive({})
const bmuVersions = reactive({})
// （1）新增：存放每 IP 的故障重试节流定时器
const retryDelayTimers = reactive({})
// 存放每个 IP 的"下载完成"超时定时器 ID
/* const downloadTimeouts = reactive({}) */
//定义升级状态常量
const retryCounts = reactive({}) // 每台设备已重试次数
const finalFailure = reactive({}) // 标记重试 3 次后仍失败的设备
// 所有待处理的 IP
const pendingIps = reactive(new Set())
const UPGRADE_STATE = {
  IDLE: 'idle',
  SENDING_INSTRUCTIONS: 'sendingInstructions', // 新增：发送指令阶段
  PROCESSING_RESULTS: 'processingResults', // 新增：处理结果阶段
  COMPLETED: 'completed',
  FAILED: 'failed'
}
const errorCodes = reactive({}) // 存储各IP的错误码// 用于追踪当前升级流程状态
const upgradeState = ref(UPGRADE_STATE.IDLE)
// 超时定时器（例：2分钟超时）
let upgradeTimer = null
// 存放每台设备上次处理过的 BMU 升级标志 row
let lastBmuFlag = reactive({})
// BMU Progress State
const bmuTotalPackages = ref(0)
const bmuCurrentPackage = ref(0)
const bmuProgress = computed(() => {
  if (bmuTotalPackages.value <= 0) return 0
  return ((bmuCurrentPackage.value + 1) / bmuTotalPackages.value) * 100
})
const UPGRADE_TIMEOUT_MS = 100000
// —— 新增：存放每个 IP 的 20s 中断倒计时定时器 ID
const interruptTimers = reactive({})
const showVersions = ref(false)
const isLoadingVersions = ref(false)
const refreshInterval = 2000 // 设置刷新频率为10秒
async function loadVersions() {
  if (isLoadingVersions.value) return
  isLoadingVersions.value = true
  showVersions.value = true

  // 1. 每次点击都新建一个待处理集合
  const needed = new Set(ipstore.ipList)

  // 2. 先卸载可能残留的旧监听
  window.electron.ipcRenderer.removeAllListeners('update-FC04dataVersion')

  // 3. 定义这次点击专用的监听器
  const versionListener = (event, Arg) => {
    if (!Arg?.Arg || !Arg.ip) return
    const deviceIp = Arg.ip
    if (!needed.has(deviceIp)) return
    const dataGroups = Arg.Arg
    // 找到 "版本号" 分组里 label 为 "BCU软件" 的那一项
    const versionGroup = dataGroups.find((g) => g.classification === '版本号')
    if (!versionGroup) return
    const bcuItem = versionGroup.element.find((i) => i.label === 'BCU软件版本')
    const bmuItem = dataGroups
      .flatMap((group) => group.element)
      .filter((item) => item.label.includes('-软件'))
    if (bcuItem && bcuItem.value != null) {
      bcuVersions[deviceIp] = bcuItem.value
    }
    if (bmuItem.length) {
      const arr = bmuItem.map((item) => ({
        label: item.label,
        version: item.value
      }))
      bmuVersions[deviceIp] = arr
      /* localStorage.setItem(`update-FC04dataVersion-${deviceIp}`, JSON.stringify(arr)) */
    }
    // 标记这一 IP 已经处理过
    needed.delete(deviceIp)
    // 如果所有 IP 都来了，就卸载监听，结束 loading
    if (needed.size === 0) {
      window.electron.ipcRenderer.removeListener('update-FC04dataVersion', versionListener)
      console.log('已注销FC04dataVersion')
      isLoadingVersions.value = false
    }
  }

  // 4. 注册新的监听器
  window.electron.ipcRenderer.on('update-FC04dataVersion', versionListener)
}
// 计算属性
const upgradeButtonText = computed(() => {
  switch (upgradeState.value) {
    case UPGRADE_STATE.SENDING_INSTRUCTIONS:
      return '下载中'
    case UPGRADE_STATE.PROCESSING_RESULTS:
      return '处理结果中'
    case UPGRADE_STATE.FAILED:
      return '升级失败，点击重试'
    default:
      return '开始升级'
  }
})

// 修改状态颜色逻辑
const statusClass = (ip) => ({
  'status-waiting': upgradeState.value !== UPGRADE_STATE.SENDING_INSTRUCTIONS,
  'status-success':
    upgradeState.value === UPGRADE_STATE.SENDING_INSTRUCTIONS && bcuDownloadStatus[ip],
  'status-SENDING_INSTRUCTIONS':
    upgradeState.value === UPGRADE_STATE.SENDING_INSTRUCTIONS &&
    !bcuDownloadStatus[ip] &&
    !errorCodes[ip],
  'status-error': errorCodes[ip]
})

const statusText = (ip) => {
  if (errorCodes[ip]) return '升级失败'
  if (bcuDownloadStatus[ip]) return '下载完成'
  // 如果正在下载状态下且未完成，返回"正在下载"
  if (upgradeState.value === UPGRADE_STATE.SENDING_INSTRUCTIONS) return '正在下载'
  // 其他情况下，显示"等待升级"
  return '等待升级'
}
const hasActiveConnection = computed(() => {
  return ipstore.ipList.some((ip) => ipstore.getIpConnected(ip))
})
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
const initUpgradeData = () => [
  {
    classification: '升级反馈信息',
    element: [
      { label: '升级设备类型', value: '-', row: '-' },
      { label: '升级文件下载完成标志', value: '-', row: '-' }, // 新增关键字段
      { label: 'BMU升级标志', value: '-', row: '-' },
      { label: 'OTA文件下载错误码', value: '-', row: '-' },
      { label: 'BCU升级故障码', value: '-', row: '-' },
      { label: 'BMU升级故障码', value: '-', row: '-' },
      { label: 'BMU升级失败设备', value: '-', row: '-' },
      { label: 'BMU程序总包数', value: '-', row: '-' },
      { label: 'BMU下载当前包序号', value: '-', row: '-' }
    ]
  }
]
// 新增状态变量
const upgradeData = ref(initUpgradeData())
// 正确方式：使用 storeToRefs 保持响应式
const {
  upgradeOptions,
  selectedUpgrade,
  bcuUpdateNum,
  bmuUpgradeOptions,
  bmuUpdateStyle,
  bmuUpdateAddress,
  bmuUpdateNum,
  FTPIp,
  FTPPort,
  FTPUser,
  FTPPassword,
  updateFile
} = storeToRefs(updateStore) // 这里使用 storeToRefs
const { connectedIps, ipListUpdate, moduleReadingStatus } = storeToRefs(ipstore) // 这里使用 storeToRefs
const formattedConnectedIps = computed(() => {
  return connectedIps.value.map((ip, index) => ({
    label: `BCU${index + 1} (${ip})`,
    value: ip
  }))
})

const MODULE_NAME = 'Upgrade'
// 计算一份带翻译 label 的下拉数据
const localizedUpgradeOptions = computed(() =>
  upgradeOptions.value.map((opt) => ({
    value: opt.value,
    label: t(opt.key)
  }))
)
const localizedbmuUpgradeOptions = computed(() =>
  bmuUpgradeOptions.value.map((opt) => ({
    value: opt.value,
    label: t(opt.key)
  }))
)
// 专用于存储每个设备的BCU下载状态（true 表示"升级文件下载完成标志"为5bb5）
const snapshotIps = ref([])
const startReading = () => {
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_NAME
  })
  ipstore.setModuleReadingStatus(MODULE_NAME, true)
}

const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_NAME
  })
  ipstore.setModuleReadingStatus(MODULE_NAME, false)
}
// 确保 ipListUpdate 是解包后的原始数组
// 计算属性控制按钮状态
// 在 script setup 中添加以下验证逻辑
const isValidFTPPort = computed(() => {
  const port = parseInt(FTPPort.value, 10)
  return !isNaN(port) && port >= 1 && port <= 65535
})

const isValidBMUAddress = computed(() => {
  const input = bmuUpdateAddress.value.trim()

  // 允许两种格式：
  // 1. 0x开头 + 1-4位十六进制 (0xB0)
  // 2. 直接1-4位十六进制 (B0)
  return /^(0x[0-9a-fA-F]{1,4}|[0-9a-fA-F]{1,4})$/.test(input)
})
const isValidBMUNumber = computed(() => {
  const num = parseInt(bmuUpdateNum.value, 10)
  return !isNaN(num) && num >= 1 && num <= 32
})

const isValidFTPIP = computed(() =>
  /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(
    ipstore.selectedInterface
  )
)
const canSendUpdate = computed(() => {
  const bcuValid =
    ipListUpdate.value?.length > 0 &&
    ipstore.selectedInterface &&
    FTPPort.value &&
    FTPUser.value?.trim().length >= 1 && // 非空账号
    FTPPassword.value?.trim().length >= 1 && // 非空密码
    updateFile.value?.trim().length > 0 // 有效文件路径
  const bmuValid = bmuUpdateStyle.value != null && bmuUpdateAddress.value && bmuUpdateNum.value
  return bcuValid && bmuValid
})
const stopReadingAll = (targetIp = 'all') => {
  window.electron.ipcRenderer.send('stop-reading-data', {
    action: 'stop',
    targetIp: targetIp
  })
}
const startReadingAll = (targetIp = 'all') => {
  window.electron.ipcRenderer.send('start-reading-data', {
    action: 'start',
    targetIp: targetIp
  })
}
const toggleCommunication = () => {
  // 检查是否有任一IP处于通讯状态
  if (ipstore.ipList.some((ip) => ipstore.getIpCommunicationActive(ip))) {
    // 如果至少1个 IP启动通讯，则全部停止通讯
    ipstore.stopCommunicationAll() // 更新所有 IP 的通讯状态为 false
    stopReadingAll('all') // 执行停止通讯的逻辑
  } else {
    // 如果全部IP 未启动通讯，则全部启动通讯
    ipstore.startCommunicationAll() // 更新所有 IP 的通讯状态为 true
    startReadingAll('all') // 通讯开始时，执行开始通讯的逻辑
  }
}
// 重置所有升级流程相关状态（用于结束后恢复）
const resetUpgradeProcess = ({ clearInitial = false } = {}) => {
  upgradeState.value = UPGRADE_STATE.IDLE
  // 清除所有下载超时定时器
  // 把每个已知 IP 的 errorCodes、lastError、bcuDownloadStatus 全部清空
  for (const ip of Object.keys(errorCodes)) {
    errorCodes[ip] = null
    lastError[ip] = null
    bcuDownloadStatus[ip] = false
    if (clearInitial) initialErrors[ip] = null
  }
  for (const ip of Object.keys(lastBmuFlag)) {
    delete lastBmuFlag[ip]
  }
  // 进度条也重置
  bmuTotalPackages.value = 0
  bmuCurrentPackage.value = 0
  if (upgradeTimer) clearTimeout(upgradeTimer)
}
// 3. 文案计算
const ftpButtonLabel = computed(() => (ftpRunning.value ? '关闭FTP' : '启动FTP'))
// 根据状态返回不同的 severity
const ftpSeverity = computed(() => (ftpRunning.value ? 'danger' : 'success'))

// 可选：图标也切换一下
const ftpIcon = computed(() => (ftpRunning.value ? 'pi pi-stop' : 'pi pi-play'))
// 4. 切换启动/停止
async function toggleFtp() {
  if (ftpRunning.value) {
    // 停止
    const res = await window.electron.ipcRenderer.invoke('ftp-stop')
    if (res.success) {
      toast.add({ severity: 'success', summary: t('upgrade.toast.ftpStop'), life: 3000 })
      ftpRunning.value = false
    } else {
      toast.add({
        severity: 'error',
        summary: t('upgrade.toast.ftpStopFailed'),
        detail: res.message,
        life: 10000
      })
    }
  } else {
    // 启动
    const res = await window.electron.ipcRenderer.invoke('ftp-start', {
      host: ipstore.selectedInterface,
      port: parseInt(FTPPort.value),
      user: FTPUser.value,
      pass: FTPPassword.value
    })
    if (res.success) {
      toast.add({ severity: 'success', summary: t('upgrade.toast.ftpStart'), life: 10000 })
      ftpRunning.value = true
    } else {
      toast.add({
        severity: 'error',
        summary: t('upgrade.toast.ftpStartFailed'),
        detail: res.message,
        life: 10000
      })
    }
  }
}
async function chooseFTPDefaultDir() {
  const dir = await window.electron.ipcRenderer.invoke('choose-default-FTP-dir')
  if (dir) {
    defaultFTPDir.value = dir
    window.electron.ipcRenderer.send('set-default-FTP-dir', dir)
    toast.add({
      severity: 'success',
      summary: 'change file path successfully',
      detail: t('upgrade.toast.filePathChanged', { path: dir }),
      life: 3000
    })
  }
}
const displayIps = computed(() =>
  // 只要正在升级或刚升级完，且真实 connectedIps 为空，就用 snapshotIps
  connectedIps.value.length === 0 ? snapshotIps.value : connectedIps.value
)
async function chooseFile() {
  const res = await window.electron.ipcRenderer.invoke('show-open-dialog')
  if (res.canceled) return
  // 把完整路径（或只要文件名）赋给 updateFile
  updateFile.value = res.fileName
  // 如果你想把 fullPath 一并保存，另写一个值也行：
  // selectedFullPath.value = res.fullPath;
}
const startUpgradeProcess = () => {
  /*   initNewSession() */
  snapshotIps.value = [...connectedIps.value]
  if (ipstore.ipList.some((ip) => ipstore.getIpCommunicationActive(ip))) {
    toast.add({ severity: 'warn', summary: t('upgrade.toast.warnStop'), life: 3000 })
    return
  }
  if (!ftpRunning.value) {
    toast.add({ severity: 'warn', summary: t('upgrade.toast.warnStartFTP'), life: 3000 })
  }
  // 1) 记录初始 errorCodes，
  ipListUpdate.value.forEach((ip) => {
    initialErrors[ip] = errorCodes[ip] || null
    lastError[ip] = null // 保证 lastError 从 null 开始
  })
  resetUpgradeProcess({ clearInitial: false }) // 2.2 仅重置 状态，不清 initialErrors
  setTimeout(() => {
    // 这里再清一遍 lastBmuFlag
    for (const ip of Object.keys(lastBmuFlag)) {
      delete lastBmuFlag[ip]
    }
    bmuTotalPackages.value = 0
    bmuCurrentPackage.value = 0
  }, 500)

  upgradeState.value = UPGRADE_STATE.SENDING_INSTRUCTIONS
  toast.add({ severity: 'info', summary: t('upgrade.toast.infoStartUpgrade'), life: 20000 })
  setTimeout(() => sendUpdateRequest(), 200)
  /*   stopReadingAll('all') */

  /*   sendUpdateBMURequest() */
  // -------- 新增：为每个 IP 启动 10 秒"下载完成"超时检测 --------
  /*  ipListUpdate.value.forEach((ip) => {
    // 如果 10 秒内还没收到"完成标志"，就当作超时故障
    const scheduleTimeout = () => {
      downloadTimeouts[ip] = setTimeout(() => {
        // 只要既没成功也没标记永久失败，就触发超时重试
        if (!bcuDownloadStatus[ip] && !finalFailure[ip]) {
          // 先清理自己
          clearTimeout(downloadTimeouts[ip])
          delete downloadTimeouts[ip]

          // 累加重试次数
          retryCounts[ip] = (retryCounts[ip] || 0) + 1
          if (retryCounts[ip] <= 3) {
            toast.add({
              severity: 'warn',
              summary: `超时重试第 ${retryCounts[ip]} 次`,
              detail: `${ip} 下载超时，重新下发升级指令`,
              life: 4000
            }) // 发送指令
            resendUpgradeToIps([ip])
            // 重发之后，重新启动这台设备的新一轮超时检测
            scheduleTimeout()
          } else {
            // 第 3 次重试之后依旧失败
            finalFailure[ip] = true
            pendingIps.delete(ip)
                  toast.add({
              severity: 'error',
              summary: `最终失败`,
              detail: `${ip} 超时重试 3 次后仍未完成`,
              life: 6000
            })
          }
          // 每次发生重试或标记失败，都尝试推进下一个阶段
          checkAllProcessed()
        }
      }, 10000)
    }
    // 启动第一次
    scheduleTimeout()
  }) */

  // 设置超时定时器（例如10s内未全部完成则视为升级异常）
  upgradeTimer = setTimeout(() => {
    if (upgradeState.value === UPGRADE_STATE.SENDING_INSTRUCTIONS) {
      upgradeState.value = UPGRADE_STATE.FAILED
      toast.add({
        severity: 'error',
        summary: 'Time out',
        detail: t('upgrade.toast.warnUpgradeTimeOut'),
        life: 5000
      })
    }
    resetUpgradeProcess({ clearInitial: true })
  }, UPGRADE_TIMEOUT_MS)
  window.electron.ipcRenderer.once('write-modbus-response', (_, result) => {
    console.log('发送升级指令成功', result)
    if (result.success) {
      toast.add({
        severity: 'success',
        summary: 'info',
        detail: t('upgrade.toast.infoIssueUpgrade'),
        life: 5000
      })
      /* alert('参数写入成功') */
    }
  })
}
async function resendUpgradeToIps(ips) {
  /*  console.log('重发升级请求的 IP 列表:', ips) // 添加日志 */
  if (!ips.length) return
  // （1）BCU 部分
  const selectedIPs = ips
  const ipParts = ipstore.selectedInterface.split('.')
  const ip1 = `0x${parseInt(ipParts[1], 10).toString(16).padStart(2, '0')}${parseInt(ipParts[0], 10).toString(16).padStart(2, '0')}`
  const ip2 = `0x${parseInt(ipParts[3], 10).toString(16).padStart(2, '0')}${parseInt(ipParts[2], 10).toString(16).padStart(2, '0')}`

  let writeData = [
    { address: 0xca00, value: selectedUpgrade.value, ip: selectedIPs },
    { address: 0xca01, value: selectedIPs.length, ip: selectedIPs },
    // … IP1、IP2、FTP 端口 …
    {
      address: 0xca02,
      value: ip1,
      ip: selectedIPs //要写入的值对应的IP
    }, // IP 第一部分
    {
      address: 0xca03,
      value: ip2,
      ip: selectedIPs //要写入的值对应的IP
    }, // IP 第二部分
    {
      address: 0xca04,
      value: FTPPort.value,
      ip: selectedIPs //要写入的值对应的IP
    }, // FTP端口
    ...convertToAsciiRegisters(FTPUser.value, '0xca05', 16, selectedIPs),
    ...convertToAsciiRegisters(FTPPassword.value, '0xca15', 16, selectedIPs),
    ...convertToAsciiRegisters(updateFile.value, '0xca25', 32, selectedIPs),
    {
      address: 0xca45,
      value: parseInt(bmuUpdateStyle.value, 16), // 直接转换十六进制字符串
      ip: selectedIPs
    },
    // 起始地址 (0xca45)
    {
      address: 0xca46,
      value: parseInt(bmuUpdateAddress.value, 16), // 转换十六进制地址
      ip: selectedIPs
    },
    // 设备数量 (0xca46)
    {
      address: 0xca47,
      value: parseInt(bmuUpdateNum.value, 10), // 十进制转十六进制值
      ip: selectedIPs
    }
  ]

  try {
    await window.electron.ipcRenderer.invoke('write-modbus-registers', writeData)
    console.log(`${new Date().toLocaleString()} — 已重发升级请求`, writeData)
  } catch (err) {
    console.error('重发升级请求失败：', err)
    toast.add({
      severity: 'error',
      summary: 'error',
      detail: t('upgrade.toast.errorResendFailed', { error: err.message }),
      life: 5000
    })
  }
  // （2）BMU 部分
  /*   const bmuData = [
    { address: 0xca45, value: parseInt(bmuUpdateStyle.value, 16), ip: selectedIPs },
    { address: 0xca46, value: parseInt(bmuUpdateAddress.value, 16), ip: selectedIPs },
    { address: 0xca47, value: parseInt(bmuUpdateNum.value, 10), ip: selectedIPs }
  ]
  window.electron.ipcRenderer.send('write-modbus-registers', bmuData) */
}
const sendUpdateRequest = async () => {
  // 确保ipListUpdate是数组
  if (!Array.isArray(ipListUpdate.value)) {
    console.error('IP列表格式错误:', ipListUpdate.value)
    return
  }
  const selectedIPs = [...ipListUpdate.value] // 使用展开运算符
  const bcuCount = selectedIPs.length // 获取选择的BCU数量
  // 将用户输入的IP地址、端口、账号和密码转换为16进制格式
  const ipParts = ipstore.selectedInterface.split('.')
  const ip1 = `0x${parseInt(ipParts[1], 10).toString(16).padStart(2, '0')}${parseInt(ipParts[0], 10).toString(16).padStart(2, '0')}`
  const ip2 = `0x${parseInt(ipParts[3], 10).toString(16).padStart(2, '0')}${parseInt(ipParts[2], 10).toString(16).padStart(2, '0')}`
  // 构造写入数据
  let writeData = [
    {
      address: 0xca00,
      value: selectedUpgrade.value,
      ip: selectedIPs //要写入的值对应的IP
    }, // 升级类型（BCU升级或BMU升级）
    // 新增BCU数量寄存器
    {
      address: 0xca01,
      value: bcuCount,
      ip: selectedIPs
    },
    {
      address: 0xca02,
      value: ip1,
      ip: selectedIPs //要写入的值对应的IP
    }, // IP 第一部分
    {
      address: 0xca03,
      value: ip2,
      ip: selectedIPs //要写入的值对应的IP
    }, // IP 第二部分
    {
      address: 0xca04,
      value: FTPPort.value,
      ip: selectedIPs //要写入的值对应的IP
    }, // FTP端口
    ...convertToAsciiRegisters(FTPUser.value, '0xca05', 16, selectedIPs), // 转换FTP账号
    ...convertToAsciiRegisters(FTPPassword.value, '0xca15', 16, selectedIPs), // 转换FTP密码
    ...convertToAsciiRegisters(updateFile.value, '0xca25', 32, selectedIPs), // 转换升级文件名
    {
      address: 0xca45,
      value: parseInt(bmuUpdateStyle.value, 16), // 直接转换十六进制字符串
      ip: selectedIPs
    },
    // 起始地址 (0xca45)
    {
      address: 0xca46,
      value: parseInt(bmuUpdateAddress.value, 16), // 转换十六进制地址
      ip: selectedIPs
    },
    // 设备数量 (0xca46)
    {
      address: 0xca47,
      value: parseInt(bmuUpdateNum.value, 10), // 十进制转十六进制值
      ip: selectedIPs
    }
  ]
  try {
    await window.electron.ipcRenderer.invoke('write-modbus-registers', writeData)
    console.log(`${new Date().toLocaleString()} — 已发送升级请求`, writeData)
    // 初始化重试/状态
    pendingIps.clear()
    selectedIPs.forEach((ip) => {
      pendingIps.add(ip)
      retryCounts[ip] = 0
      finalFailure[ip] = false
    })
  } catch (err) {
    console.error('发送升级请求失败：', err)
    toast.add({
      severity: 'error',
      summary: 'error',
      detail: t('upgrade.toast.errorResendFailed', { error: err.message }),
      life: 5000
    })
  }
}

// 将字符串转换为 ASCII 格式并填充寄存器，清除多余寄存器
const convertToAsciiRegisters = (str, startAddress, maxLength, targetIps) => {
  const asciiArray = Array.from(str).map((char) => char.charCodeAt(0))
  const registers = []
  const selectedIPs = Array.isArray(targetIps) ? targetIps : []

  // 每个寄存器存储 2 字节数据
  for (let i = 0; i < asciiArray.length; i += 2) {
    let value = asciiArray[i]
    if (i + 1 < asciiArray.length) {
      value = (asciiArray[i + 1] << 8) + value
    }
    registers.push({ address: startAddress++, value, ip: selectedIPs })
  }

  // 填充剩余的寄存器为0
  const remainingRegisters = maxLength - registers.length
  for (let i = 0; i < remainingRegisters; i++) {
    registers.push({
      address: startAddress++,
      value: 0,
      ip: selectedIPs //要写入的值对应的IP
    })
  }

  return registers
}

const sendUpdateBMURequest = () => {
  // 构造符合Modbus协议的数据包
  const selectedIPs = Object.values(ipListUpdate.value) // 关键转换
  const writeData = [
    // BMU升级类型 (0xca44)
    {
      address: 0xca45,
      value: parseInt(bmuUpdateStyle.value, 16), // 直接转换十六进制字符串
      ip: selectedIPs
    },
    // 起始地址 (0xca45)
    {
      address: 0xca46,
      value: parseInt(bmuUpdateAddress.value, 16), // 转换十六进制地址
      ip: selectedIPs
    },
    // 设备数量 (0xca46)
    {
      address: 0xca47,
      value: parseInt(bmuUpdateNum.value, 10), // 十进制转十六进制值
      ip: selectedIPs
    }
  ]

  // 发送到主进程（实际发送数值）
  window.electron.ipcRenderer.send('write-modbus-registers', writeData)

  // 调试信息（显示十六进制格式）
  console.log(
    '已发送BMU升级请求:',
    writeData.map((item) => ({
      address: `0x${item.address.toString(16).padStart(4, '0')}`,
      value: `0x${item.value.toString(16).padStart(4, '0')}`,
      ip: item.ip
    }))
  )
}
// 检查是否所有设备都处理完毕
const checkAllProcessed = () => {
  if (upgradeState.value !== UPGRADE_STATE.SENDING_INSTRUCTIONS) return
  /* console.log('检查所有设备是否处理完毕', errorCodes.value) */
  // 只有当没有待处理 IP 时，才算"所有流程走完"
  if (pendingIps.size === 0) {
    // 如果选择的是0xa003下载类型，则直接完成升级，不调用复位指令
    if (selectedUpgrade.value === '0xa003') {
      // 显示总体成功提示
      const successIPs = ipListUpdate.value.filter((ip) => bcuDownloadStatus[ip] && !errorCodes[ip])
      if (successIPs.length > 0) {
        toast.add({
          severity: 'success',
          summary: t('upgrade.toast.upgradeCompleted'),
          detail: t('upgrade.toast.allDevicesDownloaded', {
            count: successIPs.length,
            ips: successIPs.join(', ')
          }),
          life: 10000
        })
      }

      // 处理失败设备提示（与sendResetCommand中的逻辑保持一致）
      const permanentFail = ipListUpdate.value.filter((ip) => finalFailure[ip])
      if (permanentFail.length > 0) {
        const errorDetails = permanentFail
          .map((ip) => {
            const code = errorCodes[ip] // e.g. "文件头部CRC校验错误"
            // 如果是中文环境，直接用原文；否则尝试去翻译表里查 key
            const msg =
              locale.value === 'zh'
                ? code
                : te(`upgrade.toast.errorBCUUpgradeFailed.${code}`)
                  ? t(`upgrade.toast.errorBCUUpgradeFailed.${code}`)
                  : code
            return `${ip}（${msg}）`
          })
          .join('，')

        toast.add({
          severity: 'error',
          summary: t('upgrade.toast.partialFailSummary'),
          detail: t('upgrade.toast.partialFailDetail', {
            count: permanentFail.length,
            details: errorDetails
          }),
          life: 20000
        })
      }

      upgradeState.value = UPGRADE_STATE.COMPLETED
      setTimeout(() => {
        resetUpgradeProcess({ clearInitial: true })
      }, 2000)
    } else {
      upgradeState.value = UPGRADE_STATE.PROCESSING_RESULTS
      setTimeout(sendResetCommand, 500)
    }
  }
}
const mergeData = (oldData, newData) => {
  return newData.map((newGroup) => {
    // 如果是"升级反馈信息"分组，直接用新数据全量覆盖，避免旧标志残留
    if (newGroup.classification === '升级反馈信息') {
      return newGroup
    }

    // 其他分组仍做合并
    const oldGroup = oldData?.find((g) => g.classification === newGroup.classification) || {
      element: []
    }
    return {
      ...newGroup,
      element: newGroup.element.map((newItem) => {
        const oldItem = oldGroup.element.find((i) => i.label === newItem.label)
        return oldItem ? { ...oldItem, ...newItem } : { ...newItem }
      })
    }
  })
}
watch(
  () => ipstore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    // 如果该IP的数据已经存在，直接使用它
    if (state.deviceData[newIp]) {
      upgradeData.value = state.deviceData[newIp]['update-FC04UpgradeData'] || initUpgradeData()
    }
  },
  { immediate: true } // 初始时就触发一次
)
// 新增状态跟踪
// 当 ipListUpdate 变化时保证不会混入上次的状态（仅当处于空闲阶段允许修改）
watch(
  ipListUpdate,
  (newVal) => {
    if (
      upgradeState.value === UPGRADE_STATE.IDLE ||
      upgradeState.value === UPGRADE_STATE.COMPLETED
    ) {
      const safeList = Array.isArray(newVal) ? newVal : []
      // 重置下载状态，仅影响空闲状态下
      for (const ip of safeList) {
        bcuDownloadStatus[ip] = false
      }
      bcuUpdateNum.value = safeList.length
    }
  },
  { deep: true, immediate: true }
)
watch(
  connectedIps,
  (newList) => {
    // 过滤掉 ipListUpdate 中不在新 connectedIps 内的数据// 只有在 空闲（idle）或 已完成（completed）阶段，才同步清理 ipListUpdate
    if (
      upgradeState.value === UPGRADE_STATE.IDLE ||
      upgradeState.value === UPGRADE_STATE.COMPLETED
    ) {
      ipListUpdate.value = ipListUpdate.value.filter((ip) => newList.includes(ip))
    }
  },
  { immediate: true }
)
let upgradeSessionId = 0
let sessionTimestamps = {} // { [sessionId]: timestamp }
// 调用位置：startUpgradeProcess() 最开头
function initNewSession() {
  // 1) 增 Session ID，记录开始时间
  upgradeSessionId += 1
  sessionTimestamps[upgradeSessionId] = Date.now()

  // 2) 清所有 per‐IP 状态
  ipListUpdate.value.forEach((ip) => {
    bcuDownloadStatus[ip] = false
    errorCodes[ip] = null
    lastError[ip] = null
    finalFailure[ip] = false
    delete lastBmuFlag[ip]
    pendingIps.delete(ip)
  })

  // 3) 清进度条
  bmuTotalPackages.value = 0
  bmuCurrentPackage.value = 0

  // 4) 清 UI 数据
  upgradeData.value = initUpgradeData()

  // 5) 取消所有旧定时器
  if (upgradeTimer) clearTimeout(upgradeTimer)
  Object.values(retryDelayTimers).forEach(clearTimeout)
  Object.values(interruptTimers).forEach(clearTimeout)
}
// 在设备状态更新时主动清除定时器
const registerListener = () => {
  // 移除之前可能存在的监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04UpgradeData', listenerId.value)
  }
  // listener for 'update-FC04ClusterSumm'
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    // 如果不是我们正在升级的设备，就直接跳过
    /* console.log('pendingIps：', pendingIps) */
    if (!pendingIps.has(deviceIp)) return
    const newData = Arg.Arg
    // 强制创建响应式对象
    if (!state.deviceData[deviceIp]) {
      state.deviceData[deviceIp] = reactive({})
    }
    // 深度合并数据
    const mergedData = mergeData(upgradeData.value, newData)
    state.deviceData[deviceIp][event] = JSON.parse(JSON.stringify(mergedData))

    if (deviceIp === ipstore.selectedIp) {
      upgradeData.value = mergedData
    }
    /* console.log('upgradeData:', upgradeData.value) */
    // Extract BMU package info
    const allItems = newData.flatMap((group) => group.element)
    const totalItem = allItems.find((e) => e.label === 'BMU程序总包数')
    const currentItem = allItems.find((e) => e.label === 'BMU下载当前包序号')
    if (totalItem && currentItem) {
      const newTotal = parseInt(totalItem.row || 0, 10)
      const newCurrent = parseInt(currentItem.row || 0, 10)

      // ★ 2. 只在 newTotal>0 时设置总包数
      if (newTotal > 0) {
        bmuTotalPackages.value = newTotal
      }
      // ★ 3. 仅当 newCurrent 不比上一次小的时候才更新
      if (newCurrent >= bmuCurrentPackage.value) {
        bmuCurrentPackage.value = newCurrent
      }
    }
    /*     console.log('deviceIp:', deviceIp, 'ipstore.selectedIp:', ipstore.selectedIp) // 调试：检 */
    const errorGroup = newData.find((g) => g.classification === '升级反馈信息')
    if (!errorGroup || !Array.isArray(errorGroup.element)) return

    const errorItem = errorGroup?.element.find((e) => e.label === 'OTA文件下载错误码')

    const rawVal = errorItem?.row?.toString(16).toLowerCase() || ''
    const newError = rawVal !== '0' ? errorItem.value || '未知错误' : null
    // 更新错误码
    errorCodes[deviceIp] = newError
    /*     console.log(errorCodes) */
    // 调用 handleSingleError 方法处理错误
    handleSingleError(deviceIp)
    // —— 先清除掉可能存在的中断重连定时器 ——
    if (interruptTimers[deviceIp]) {
      clearTimeout(interruptTimers[deviceIp])
      delete interruptTimers[deviceIp]
    }
    // BCU 逻辑：看"升级文件下载完成标志"
    if (selectedUpgrade.value === '0xa001' || selectedUpgrade.value === '0xa003') {
      const bcuFlag = errorGroup.element.find((e) => e.label === '升级文件下载完成标志')
      if (bcuFlag && String(bcuFlag.row).toLowerCase() === '5bb5') {
        bcuDownloadStatus[deviceIp] = true
        errorCodes[deviceIp] = null
        pendingIps.delete(deviceIp)
      }
      return checkAllProcessed()
    }
    // BMU 逻辑：看"BMU升级标志"，根据选中的 bmuUpdateStyle.value 决定完成或失败
    if (selectedUpgrade.value === '0xa002') {
      // 哪个 raw 表示对当前 style 的完成
      const style = bmuUpdateStyle.value.toLowerCase()
      if (style === '0xc0b1' || style === '0xc0b2') {
        const dlFlag = errorGroup.element.find((e) => e.label === '升级文件下载完成标志')
        if (dlFlag && String(dlFlag.row).toLowerCase() === '5bb5') {
          toast.add({
            severity: 'success',
            summary: t('upgrade.toast.infoBMUUpgradeStart'),
            life: 10000
          })
          // 标记该 IP 已处理完
          pendingIps.delete(deviceIp)
          // 如果所有待升级设备都完成，则统一开始重新读取数据并重置状态
          if (pendingIps.size === 0) {
            startReadingAll('all')
            upgradeState.value = UPGRADE_STATE.COMPLETED
            return resetUpgradeProcess({ clearInitial: true })
          }
        }
        // 未达到 5bb5，则继续等下一条数据
        return
      }
      const bmuFlag = errorGroup.element.find((e) => e.label === 'BMU升级标志')
      if (!bmuFlag) return
      const got = bmuFlag.row.toLowerCase()
      if (lastBmuFlag[deviceIp] === got) return
      lastBmuFlag[deviceIp] = got
      // 完成 & 失败映射表
      const finishInfo = {
        '0xb0a1': '单机升级完成',
        '0xb0b1': '单机升级失败',
        '0xb0a2': '广播升级完成',
        '0xb0b2': '广播升级失败',
        '0xb0a3': '强制单机升级完成',
        '0xb0b3': '强制单机升级失败',
        '0xb0a4': '强制广播升级完成',
        '0xb0b4': '强制广播升级失败'
      }
      const mappingDone = {
        '0xc0a1': '0xb0a1',
        '0xc0b1': '0xb0a3',
        '0xc0a2': '0xb0a2',
        '0xc0b2': '0xb0a4'
      }
      const targetDone = mappingDone[style]

      // 成功
      if (`0x${got}` === targetDone) {
        toast.add({
          severity: 'success',
          summary:
            `${deviceIp}` + t(`upgrade.toast.infoBMUUpgradeResult.${finishInfo[targetDone]}`),
          life: 5000
        })
        pendingIps.delete(deviceIp)
        // 如果所有待升级设备都完成，则统一开始重新读取数据并重置状态
        if (pendingIps.size === 0) {
          startReadingAll('all')
          upgradeState.value = UPGRADE_STATE.COMPLETED
          return resetUpgradeProcess({ clearInitial: true })
        }
      }
      // 失败
      // 2）失败判断：BMU升级故障码
      const bmuError = errorGroup.element.find((e) => e.label === 'BMU升级故障码')
      if (bmuError && bmuError.value !== '无故障') {
        // 直接把这个故障码展示到状态栏并弹错误
        errorCodes[deviceIp] = bmuError.value
        if (bmuError.value === 'BMU应答数量过少' || bmuError.value === 'BMU应答数量过多') {
          toast.add({
            severity: 'error',
            summary: `${deviceIp}` + t('upgrade.toast.infoBMUUpgradeFailed'),
            detail:
              t(`upgrade.toast.errorBMUUpgradeFailed.${bmuError.value}`) +
              t('upgrade.toast.errorBMUUpgradeFailed.warnWait30s'),
            life: 30000
          })
        } else {
          toast.add({
            severity: 'error',
            summary: `${deviceIp}` + t('upgrade.toast.infoBMUUpgradeFailed'),
            detail: t(`upgrade.toast.errorBMUUpgradeFailed.${bmuError.value}`),
            life: 6000
          })
        }
        pendingIps.delete(deviceIp)
        upgradeState.value = UPGRADE_STATE.COMPLETED
        return resetUpgradeProcess({ clearInitial: true })
      }
      // 正在执行或未知状态，都不推进到 BCU 的复位阶段
      return
    }
  }
  window.electron.ipcRenderer.on('update-FC04UpgradeData', listenerId.value)
} // 等待所有这些 IP 都到货
const pivotVersions = computed(() => {
  // 1. 所有 IP 列
  const ips = displayIps.value

  // 2. 计算最大的 BMU 数量
  const maxBmuCount = showVersions.value
    ? Math.max(0, ...ips.map((ip) => (bmuVersions[ip] || []).length))
    : 5

  // 3. 构造行数据
  const rows = []

  // 行头：BCU（IP 本身）
  /*   rows.push({
    label: 'BCU',
    ...Object.fromEntries(ips.map((ip) => [ip, ip]))
  }) */

  // 行头：BCU版本
  rows.push({
    label: 'BCU',
    ...Object.fromEntries(ips.map((ip) => [ip, showVersions.value ? bcuVersions[ip] || '-' : '-']))
  })

  // 行头：BMU1版本…BMUn版本（动态 n）
  for (let i = 0; i < maxBmuCount; i++) {
    rows.push({
      label: `BMU${i + 1}`,
      ...Object.fromEntries(
        ips.map((ip) => {
          const arr = bmuVersions[ip] || []
          return [
            ip,
            showVersions.value ? (arr[i]?.version ?? '—') : '-' // 未加载前都是 '-'
          ]
        })
      )
    })
  }

  return { ips, rows }
})

const sendResetCommand = async () => {
  /* console.log('进入了发送复位指令') */
  //console.log(bcuDownloadStatus, errorCodes)
  if (upgradeState.value !== UPGRADE_STATE.PROCESSING_RESULTS) return
  // 用 processedSet 判断哪些 IP 是"已处理"的
  const all = ipListUpdate.value
  // 成功：下载完成且无错误
  const successIPs = all.filter((ip) => bcuDownloadStatus[ip] && !errorCodes[ip])
  successIPs.forEach((ip) => pendingReadAfterReboot.add(ip))
  /*   // 失败：有错误码
  const failedIPs = all.filter((ip) => errorCodes[ip]) */
  // 永久失败（重试 3 次仍有错），仅用于提示
  const permanentFail = all.filter((ip) => finalFailure[ip])
  console.log('successIPs:', successIPs, 'permanentFail:', permanentFail)
  if (successIPs.length > 0) {
    const writeData = [{ address: 0xcaf0, value: 0x5bb5, ip: successIPs }]
    try {
      await window.electron.ipcRenderer.invoke('write-modbus-registers', writeData)
      toast.add({
        severity: 'success',
        summary: t('upgrade.toast.fileDownloadSuccess'),
        detail: t('upgrade.toast.readyForReset', {
          count: successIPs.length,
          ips: successIPs.join('\n')
        }),
        life: 20000
      })
      // 10s 后重新开始读取
      /*   setTimeout(() => startReadingAll('all'), 10000) */
    } catch (err) {
      console.error('复位指令下发失败：', err)
      toast.add({
        severity: 'error',
        summary: 'error',
        detail: t('upgrade.toast.restFaied') + `：${err.message}`,
        life: 5000
      })
    }
  }
  // 处理失败设备提示
  if (permanentFail.length > 0) {
    const errorDetails = permanentFail
      .map((ip) => {
        const code = errorCodes[ip] // e.g. "文件头部CRC校验错误"
        // 如果是中文环境，直接用原文；否则尝试去翻译表里查 key
        const msg =
          locale.value === 'zh'
            ? code
            : te(`upgrade.toast.errorBCUUpgradeFailed.${code}`)
              ? t(`upgrade.toast.errorBCUUpgradeFailed.${code}`)
              : code
        return `${ip}（${msg}）`
      })
      .join('，')

    toast.add({
      severity: 'error',
      summary: t('upgrade.toast.partialFailSummary'),
      detail: t('upgrade.toast.partialFailDetail', {
        count: permanentFail.length,
        details: errorDetails
      }),
      life: 20000
    })
  }
  // 最终状态处理
  upgradeState.value = UPGRADE_STATE.COMPLETED
  setTimeout(() => {
    resetUpgradeProcess({ clearInitial: true })
  }, 2000)
}
const handleSingleError = (deviceIp) => {
  /*   console.log('错误ip', deviceIp) */
  // 清除之前的定时器（如果存在）
  if (upgradeState.value !== UPGRADE_STATE.SENDING_INSTRUCTIONS) return
  // 获取当前最新状态
  const currentError = errorCodes[deviceIp]
  const isDownloaded = bcuDownloadStatus[deviceIp]
  // （2）先清理下载超时定时器，避免超时重发与故障重发并行
  /*   if (downloadTimeouts[deviceIp]) {
    clearTimeout(downloadTimeouts[deviceIp])
    delete downloadTimeouts[deviceIp]
  } */
  // —— 一次性跳过"升级前遗留"的那一次旧错误 ——
  if (initialErrors[deviceIp] != null && currentError === initialErrors[deviceIp]) {
    // 清除标记，下次同码就不再走这一分支
    initialErrors[deviceIp] = null
    return
  }
  //// 同码去重，但仅第一次去重，后续我们在重试后会手动清空 lastError
  if (currentError && currentError === lastError[deviceIp]) {
    return
  }
  // 更新已处理标记，让后续任何同样的码都暂时免重入
  lastError[deviceIp] = currentError
  // 立即处理完成状态
  if (isDownloaded) {
    lastError[deviceIp] = null
    return checkAllProcessed()
  }
  // 只有在有新错误时报 5 秒后再判断
  if (currentError) {
    retryDelayTimers[deviceIp] = setTimeout(() => {
      const stillError = errorCodes[deviceIp]
      const stillNotDownloaded = !bcuDownloadStatus[deviceIp]

      if (stillError && stillNotDownloaded) {
        // 如果上一次的重试还没执行完，先取消掉它
        if (retryDelayTimers[deviceIp]) {
          clearTimeout(retryDelayTimers[deviceIp])
        }
        // 5 秒后错误依旧：决定重试或最终失败
        retryCounts[deviceIp] = (retryCounts[deviceIp] || 0) + 1

        if (retryCounts[deviceIp] <= 3) {
          // ≤3 次内，重发升级指令
          toast.add({
            severity: 'warn',
            summary: t('upgrade.toast.retrySummary', {
              n: retryCounts[deviceIp],
              ip: deviceIp
            }),
            detail:
              locale.value === 'zh'
                ? stillError
                : te(`upgrade.toast.errorBCUUpgradeFailed.${stillError}`)
                  ? t(`upgrade.toast.errorBCUUpgradeFailed.${stillError}`)
                  : stillError,
            life: 4000
          })
          resendUpgradeToIps([deviceIp])
          lastError[deviceIp] = null
        } else {
          // 重试 3 次后仍失败，标记为最终故障
          finalFailure[deviceIp] = true
          pendingIps.delete(deviceIp) // 新增此行
          /*     toast.add({
            severity: 'error',
            summary: '最终失败',
            detail: `${deviceIp} 重试 3 次后仍有错误码 ${stillError}`,
            life: 6000
          }) */
        }
      } else {
        // 5 秒内错误已消失，清理状态
        errorCodes[deviceIp] = null
        lastError[deviceIp] = null
      }
      // 清理本次定时器引用，允许下次调度
      delete retryDelayTimers[deviceIp]

      // 无论哪种情况，都尝试推进下一个阶段
      checkAllProcessed()
    }, 10000)
  }
}
// —— 6. 监听"通讯中断"，中止升级
function handleConnectionInterrupted(event, { ip, success, error }) {
  // 只关心"interrupted"错误，并且当前确实在发送升级指令阶段
  if (
    !success &&
    error === 'interrupted' &&
    upgradeState.value === UPGRADE_STATE.SENDING_INSTRUCTIONS
  ) {
    // 清理旧定时器
    if (interruptTimers[ip]) {
      clearTimeout(interruptTimers[ip])
    }
    // 先给个 warn 提示，让用户知道正在等待重连
    toast.add({
      severity: 'warn',
      summary: t('upgrade.toast.disconnected', { ip }),
      life: 5000
    })
    // 启动 20s 倒计时：到期后如果还未重连，则终止升级
    interruptTimers[ip] = setTimeout(() => {
      if (interruptTimers[ip]) {
        toast.add({
          severity: 'error',
          summary: t('upgrade.toast.interruptedSummary'),
          detail: t('upgrade.toast.interruptedDetail', { ip, time: 40 }),
          life: 8000
        })
        resetUpgradeProcess({ clearInitial: true })
        delete interruptTimers[ip]
      }
    }, 40000)
  }
}
function handleConnectionResumed(event, { ip, success, error }) {
  const reconnected = success === true
  if (reconnected && interruptTimers[ip]) {
    clearTimeout(interruptTimers[ip])
    delete interruptTimers[ip]
    toast.add({
      severity: 'success',
      summary: t('upgrade.toast.reconnectedSummary', { ip }),
      detail: t('upgrade.toast.reconnectedDetail'),
      life: 5000
    })
    // —— 新增：重连后，重新对该设备下发升级指令 ——
    if (
      upgradeState.value === UPGRADE_STATE.SENDING_INSTRUCTIONS &&
      pendingIps.has(ip) &&
      !bcuDownloadStatus[ip]
    ) {
      toast.add({
        severity: 'info',
        summary: t('upgrade.toast.resendCommandSummary', { ip }),
        detail: t('upgrade.toast.resendCommandDetail'),
        life: 4000
      })
      resendUpgradeToIps([ip])
    }
  }
}
// 监听断连、重连
function handleConnectionStatus(_, { ip, success, error }) {
  // 1）断连时，如果是我们关注的设备，记录一次断连
  if (!success && error === 'interrupted') {
    if (pendingReadAfterReboot.has(ip)) {
      sawDisconnect.add(ip)
    }
  }

  // 2）重连时，只有既在 pendingReadAfterReboot 又曾 sawDisconnect，才触发重读
  if (success && pendingReadAfterReboot.has(ip) && sawDisconnect.has(ip)) {
    window.electron.ipcRenderer.send('start-reading-data', {
      action: 'start',
      targetIp: ip
    })
    // 清理标记，避免重复
    pendingReadAfterReboot.delete(ip)
    sawDisconnect.delete(ip)
  }
}
window.electron.ipcRenderer.on('connection-status', handleConnectionStatus)
window.electron.ipcRenderer.on('connection-status', (e, msg) => {
  handleConnectionInterrupted(e, msg)
  handleConnectionResumed(e, msg)
})
// 页面挂载后读取内置 FTP 配置

onBeforeMount(() => {
  // 清除所有历史数据
  window.electron.ipcRenderer.removeListener('connection-status', handleConnectionInterrupted)
  resetUpgradeProcess({ clearInitial: true }) // 清除可能存在的残留状态
  /* registerVersionListener() */
  registerListener()
  startReading()
  // 初始化状态为idle
})
onMounted(async () => {
  if (sessionStorage.getItem('updatePassword') === 'ok') {
    showPwdDialog.value = false
  } else {
    showPwdDialog.value = true
  }
  const res = await window.electron.ipcRenderer.invoke('ftp-status')
  ftpRunning.value = res.running
  const dir = await window.electron.ipcRenderer.invoke('get-default-FTP-dir')
  defaultFTPDir.value = dir
  loadVersions() // 初次加载数据
  setInterval(() => {
    if (!isLoadingVersions.value) {
      loadVersions() // 每隔一定时间刷新一次
    }
  }, refreshInterval)
})
function checkPwd() {
  if (inputPwd.value === CORRECT_PASSWORD1) {
    showPwdDialog.value = false
    pwdError.value = false
    sessionStorage.setItem('updatePassword', 'ok')
  } else {
    pwdError.value = true
  }
}
onBeforeUnmount(() => {
  stopReading()
  resetUpgradeProcess({ clearInitial: true }) // 清除可能存在的残留状态

  /* startReadingAll() */
  // 注销所有事件监听器
  window.electron.ipcRenderer.removeAllListeners('update-FC04dataVersion')
  window.electron.ipcRenderer.removeAllListeners('update-FC04UpgradeData')
})
const cancelled = ref(false)
function cancelPwd() {
  showPwdDialog.value = false
  cancelled.value = true
}
</script>
<style lang="less" scoped>
.update1 {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}
.control {
  display: flex;
  gap: 1rem;
  width: 100%;
}
/* 2. 给三个子块分别设置 flex 比例 1 : 1 : 2 */
.control > div:nth-child(1) {
  flex: 1; /* 占 1 份 */
  min-width: 0; /* 防止内部内容撑破布局 */
}

.control > div:nth-child(2) {
  flex: 3; /* 占 1 份 */
  min-width: 0;
}

.control > div:nth-child(3) {
  flex: 2; /* 占 2 份，即 50% （合计 1+1+2 = 4 份） */
  min-width: 0;
}
.update {
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
  margin-left: 1rem;
  gap: 0.4rem;
}
.section {
  width: 100%;
  min-width: 35rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #bdbdbd;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
}
.section1 {
  width: fit-content;
  min-width: 35rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
  border: 1px solid #bdbdbd;
}
.updateStat {
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
  width: 100%;
  padding: 0.5rem;
}
.row-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
}
.input-row {
  display: flex;
  flex-wrap: nowrap; /* 不允许换行 */
  align-items: center;
  gap: 1rem; /* 项间距，让它们不挤一起 */
  margin: 0.5rem 0;
}
/* 1. 让 label 永远不拆行 */
.input-row label {
  white-space: nowrap;
}

/* 2. 让 PrimeVue 的 Button 上的文字不换行（假设是 .p-button） */
.input-row .p-button {
  white-space: nowrap;
}

/* 3. 让 InputText（.flex-1）能够缩到很窄：设置 min-width: 0 */
.input-row .flex-1 {
  flex: 1; /* 确保它会占据剩余空间 */
  min-width: 0; /* 关键：允许它比内容更窄，以便整体不换行 */
}
.error-text {
  color: #ff4444;
  font-size: 0.8rem;
  margin: 0.2rem 0;
}

.disabled-button {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 输入框错误状态 */
input:invalid {
  border-color: #ff4444;
  box-shadow: 0 0 3px rgba(255, 68, 68, 0.3);
}
.status-container {
  border: 1px solid #ddd;
  padding: 1.5rem;
  border-radius: 4px;
  min-width: 20rem;
  height: fit-content;
}

.status-list {
  display: flex; /* 改为 flex 布局 */
  flex-wrap: wrap; /* 自动换行 */
  gap: 0.5rem 0.1rem; /* 上下、左右间距 */
  margin-top: 0.5rem;
  max-height: none; /* 取消纵向滚动限制 */
}

.status-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.status-success {
  color: #28a745;
}
.status-warning {
  color: #ffc107;
}
.status-error {
  color: #dc3545;
}
.error-message {
  color: #dc3545;
}

.cancelled-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
  color: #888;
  font-size: 1.2rem;
  letter-spacing: 1px;
}
</style>
