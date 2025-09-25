<template>
  <div>
    <!-- 系统时间 & 时间记录 -->
    <div class="card p-4">
      <h5>{{ t('eventTime.title1') }}</h5>
      <div class="time-card-display">
        <!-- 实时时间 -->
        <div class="time-card">
          <div class="card-header">
            <i class="pi pi-history mr-2"></i>
            <span class="text-lg font-medium">{{ t('eventTime.title2') }}</span>
          </div>
          <div class="card-content">
            <span class="ml-2 text-xl cursor-pointer">
              {{ currentTime }}
            </span>
          </div>
        </div>
        <!-- 系统当前时间 -->
        <div class="time-card" v-if="realTime">
          <div class="card-header">
            <i class="pi pi-history mr-2"></i>
            <span class="text-lg font-medium">{{ t('eventTime.title3') }}</span>
          </div>
          <div class="card-content">
            <span class="ml-2 text-xl cursor-pointer">
              {{ realTime }}
            </span>
            <Button
              :label="t('eventTime.buttonLable1')"
              @click="syncTime"
              class="ml-2 p-button-sm p-button-success"
            />
          </div>
        </div>
        <!-- 系统启动次数 -->
        <div class="time-card" v-if="bootCount">
          <div class="card-header">
            <i class="pi pi-history mr-2"></i>
            <span class="text-lg font-medium">{{ t('eventTime.title4') }}</span>
          </div>
          <div class="card-content">
            <span class="ml-2 text-xl">{{ bootCount }}</span>
          </div>
        </div>
      </div>

      <!-- 时间记录分组 -->
      <div style="display: flex; flex-wrap: wrap; gap: 1rem">
        <div
          v-for="(record, idx) in sortedRecords"
          :key="idx"
          class="group-card"
          style="flex: 1; min-width: 300px"
        >
          <span class="text-lg font-medium">
            <i class="pi pi-clock mr-2"></i>
            {{ t(`eventTime.title5.第${idx + 1}次系统记录`) }}
          </span>
          <DataTable :value="record" class="p-datatable-sm mt-3" showGridlines>
            <Column :header="t('eventTime.tableTile1')">
              <template #body="{ data }">
                {{
                  locale === 'zh'
                    ? data.label
                    : $te(`eventTime.table1Parameters.${data.label}`)
                      ? t(`eventTime.table1Parameters.${data.label}`)
                      : data.label
                }}
              </template>
            </Column>
            <Column field="value" :header="t('eventTime.tableTile2')">
              <template #body="{ data }">
                <span
                  :class="{
                    'text-red-500': isInvalidTime(data.value),
                    'text-green-600':
                      (data.label.includes('运行时间') || data.label.includes('堆栈')) &&
                      formatTimeValue(data.value) !== data.value &&
                      data.value > 0,
                    'text-gray-400': data.value === 0
                  }"
                >
                  {{ formatTimeValue(data.value) }}
                </span>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>

    <!-- 事件记录读取 -->
    <div class="card readEvent p-4 mb-6">
      <h5>{{ t('eventTime.title6') }}</h5>
      <!-- 导出操作卡片 -->
      <div class="export-card mb-3 p-4 rounded-lg">
        <div class="flex align-items-center mb-4 gap-2">
          <div class="flex align-items-center gap-2 flex-shrink-0">
            <i class="pi pi-folder-open text-lg"></i>
            <span class="font-medium">{{ t('eventTime.exportPath') }}：</span>
            <div class="truncate text-sm cursor-pointer">
              {{ defaultDir }}
            </div>
            <div>
              <Button
                class="p-button-sm p-button-outlined ml-2"
                :label="t('eventTime.buttonLable2')"
                icon="pi pi-pencil"
                @click="chooseDefaultDir"
                style="min-width: 4rem"
              />
            </div>
          </div>
          <div v-if="exportStore.isExporting" class="flex align-items-center ml-auto w-full gap-4">
            <span>
              <span class="export-count">{{ exportStore.current }}</span>
              /
              <span class="export-count">{{ exportStore.total }}</span>
              <span class="export-count">{{ exportStore.percent }}%</span>
            </span>
            <div class="flex-1">
              <ProgressBar :value="exportStore.percent" :showValue="false" />
            </div>
            <Button
              label="取消导出"
              @click="cancelExport"
              class="p-button-danger"
              icon="pi pi-trash"
            />
          </div>
        </div>
        <div class="flex gap-8 align-items-center mt-2">
          <div class="flex align-items-center gap-3">
            <label>{{ t('eventTime.exportOffset') }}：</label>
            <InputText :value="offsetRead" style="width: 5rem" disabled />
            <label for="valueRead">{{ t('eventTime.exportNums') }}：</label>
            <InputText id="valueRead" v-model="valueRead" style="width: 5rem" />
            <Checkbox v-model="flagDownloadAll" inputId="downloadAll" binary />
            <label for="downloadAll">{{ t('eventTime.exportAll') }}</label>
            <Button
              :label="t('eventTime.buttonLable3')"
              @click="confirmExport"
              :disabled="!canExport"
              class="p-button-success"
              icon="pi pi-download"
            />
          </div>
          <div class="flex align-items-center gap-3">
            <label for="packageCount">{{ t('eventTime.deleteNums') }}：</label>
            <InputText id="numDelete" v-model="n" style="width: 5rem" :min="1" />
            <span class="font-medium">× 16 =</span>
            <InputText v-model="deleteCount" class="w-32 read-only-input" :disabled="true" />
            <Checkbox v-model="flagDeleteAll" inputId="deleteAll" binary />
            <label for="deleteAll" class="font-medium">{{ t('eventTime.deleteAll') }}</label>
            <Button
              :label="t('eventTime.buttonLable4')"
              @click="confirmDelete"
              :disabled="!flagDeleteAll && (!n || n <= 0)"
              class="p-button-danger"
              icon="pi pi-trash"
            />
          </div>
        </div>
      </div>
      <!-- 原有的事件数据表格 -->
      <div>
        <DataTable :value="eventData" showGridlines>
          <Column :header="t('eventTime.tableTile1')">
            <template #body="{ data }">
              {{
                locale === 'zh'
                  ? data.label
                  : $te(`eventTime.table2Parameters.${data.label}`)
                    ? t(`eventTime.table2Parameters.${data.label}`)
                    : data.label
              }}
            </template>
          </Column>
          <Column field="value" :header="t('eventTime.tableTile2')" />
          <Column field="unit" :header="t('eventTime.tableTile3')" />
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onBeforeMount, watch } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'
const { t, te, locale } = useI18n()
import { useExportStore } from '../../../../../stores/eventStore.js'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import ProgressBar from 'primevue/progressbar'
import InputText from 'primevue/inputtext'
const MODULE_NAME = 'EventTime'
// 新增：定义缓存 Key
const LS_EVENT_KEY = 'eventTime:events'
const LS_TIME_KEY = 'eventTime:times'
const toast = useToast()
const confirm = useConfirm()
const ipStore = useIpStore()
const exportStore = useExportStore()
// ---- 新增：默认导出目录 ----
const defaultDir = ref('')
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
const startReading = () => {
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}

const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
// 实时时间
const currentTime = ref('')
let timer = null
const updateTime = () => {
  currentTime.value = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// 主数据存储
const eventData = ref([])
const timeElements = ref([])

// 计算属性
const realTime = computed(() => timeElements.value.find((i) => i.label === '系统当前时间')?.value)
const bootCount = computed(() => timeElements.value.find((i) => i.label === '系统启动次数')?.value)

// 时间分组与排序
const timeGroups = computed(() => {
  if (timeElements.value.length < 20) return []
  return [
    timeElements.value.slice(2, 8),
    timeElements.value.slice(8, 14),
    timeElements.value.slice(14, 20)
  ]
})

const sortedRecords = computed(() => {
  const total = 3
  const bootNum = parseInt(bootCount.value) || 0
  const validCount = Math.min(total, bootNum)
  const rec = []
  for (let i = 0; i < validCount; i++) {
    let idx = (((bootNum - 1 - i) % total) + total) % total
    rec.push(timeGroups.value[idx])
  }
  return rec
})

const isInvalidTime = (val) => typeof val === 'string' && /0000年00月第00周/.test(val)
const formatTimeValue = (val) => (typeof val === 'number' ? `${val} 分钟` : val)

// BCD 与 ISO 周
const getISOWeek = (d) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
}
const toBCD = (num, digits = 2) => {
  let bcd = 0
  for (let i = 0; i < digits; i++) {
    const d = num % 10
    bcd |= d << (4 * i)
    num = Math.floor(num / 10)
  }
  return bcd
}

// 同步时间到设备
const syncTime = async () => {
  const now = new Date()
  const base = 0x5744
  const comps = [
    toBCD(now.getFullYear() % 100),
    toBCD(now.getMonth() + 1),
    toBCD(now.getDate()),
    toBCD(getISOWeek(now)),
    toBCD(now.getHours()),
    toBCD(now.getMinutes()),
    toBCD(now.getSeconds())
  ]
  const writes = comps.map((v, i) => ({
    address: `0x${(base + i).toString(16).padStart(4, '0')}`,
    value: v,
    ip: ipStore.selectedIp
  }))
  // 发送 invoke
  try {
    const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', writes)
    if (!res.success) {
      throw new Error(res.error || '未知错误')
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('eventTime.toast.syncFailed', { error: err.message }),
      life: 3000
    })
    return
  }

  // 更新本地显示
  const fmt = (n) => n.toString().padStart(2, '0')
  const ts = `${now.getFullYear()}年${fmt(now.getMonth() + 1)}月${fmt(
    now.getDate()
  )}日${fmt(now.getHours())}时${fmt(now.getMinutes())}分${fmt(now.getSeconds())}秒`
  const rt = timeElements.value.find((i) => i.label === '系统当前时间')
  if (rt) rt.value = ts
  toast.add({
    severity: 'success',
    summary: t('eventTime.toast.syncSuccess'),
    life: 3000
  })
}

// 事件记录导出与删除
const valueRead = ref(null)
const flagDownloadAll = ref(false)
// 从本地缓存或接口中读取总事件数
const storedCount = computed(() => {
  const countItem = eventData.value.find((i) => i.label === '事件记录存储数量')
  return countItem?.value || 0
})
// 自动计算偏移量 = 总数 - 要读数量
const offsetRead = computed(() => {
  const y = parseInt(valueRead.value, 10) || 0
  return Math.max(0, storedCount.value - y)
})
const startExport = () => {
  stopReadingAll('all')
  stopReading()
  const offsetReadForSend = flagDownloadAll.value ? 0 : parseInt(offsetRead.value)
  const totalRead = flagDownloadAll.value ? storedCount.value : parseInt(valueRead.value)
  exportStore.start(totalRead)
  window.electron.ipcRenderer.send('start-reading-data-event', {
    offsetRead: offsetReadForSend,
    totalRead,
    ip: ipStore.selectedIp
  })
}

const n = ref(null)
// 新增：计算要删除的记录数（n * 16）
const deleteCount = computed(() => {
  const num = parseInt(n.value, 10)
  return isNaN(num) ? 0 : num * 16
})
const flagDeleteAll = ref(false)
// 2. 删除全部
const deleteAll = async () => {
  const addr = '0xc00c'
  const val = flagDeleteAll.value ? 0xffff : deleteCount.value
  const payload = [{ address: addr, value: val, ip: ipStore.selectedIp }]

  try {
    const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
    if (res.success) {
      toast.add({
        severity: 'success',
        summary: t('eventTime.toast.deleteCmdSent'),
        life: 3000
      })
    } else {
      throw new Error(res.error || '未知错误')
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: '错误',
      detail: `删除指令下发失败：${err.message}`,
      life: 3000
    })
  }
}
function confirmExport() {
  // 校验输入
  if (!canExport.value) {
    if (!flagDownloadAll.value && (!valueRead.value || parseInt(valueRead.value, 10) <= 0)) {
      toast.add({ severity: 'warn', summary: t('eventTime.toast.enterExportCount'), life: 3000 })
    } else if (!flagDownloadAll.value && parseInt(valueRead.value, 10) > storedCount.value) {
      toast.add({
        severity: 'error',
        summary: t('eventTime.toast.exportCountTooBig', { total: storedCount.value }),
        life: 3000
      })
    }
    return
  }
  // 确认对话框
  confirm.require({
    message: flagDownloadAll.value
      ? t('eventTime.confirm.exportAllMessage')
      : t('eventTime.confirm.exportPartialMessage', { count: valueRead.value }),
    header: t('eventTime.confirm.exportHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('eventTime.confirm.yes'),
    rejectLabel: t('eventTime.confirm.no'),
    accept: () => startExport()
  })
}
const canExport = computed(() => {
  // 全部导出时始终可用
  if (flagDownloadAll.value) return true
  const y = parseInt(valueRead.value, 10)
  // 必须输入正整数，且不超过总存储数量
  return Number.isInteger(y) && y > 0 && y <= storedCount.value
})
function confirmDelete() {
  confirm.require({
    message: flagDeleteAll.value
      ? t('eventTime.confirm.deleteAllMessage')
      : t('eventTime.confirm.deletePartialMessage', { count: deleteCount.value }),
    header: t('eventTime.confirm.deleteHeader'),
    icon: 'pi pi-trash',
    acceptLabel: t('eventTime.confirm.delete'),
    rejectLabel: t('eventTime.confirm.cancel'),
    accept: () => deleteAll()
  })
}

// IPC 事件监听
let listener = null
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04EventData')

  listener = (_, Arg) => {
    const ip = Arg.ip
    const data = Arg.Arg || []
    const eventRec = data.find((d) => d.classification === '事件记录标志位')
    const timeRec = data.find((d) => d.classification === '系统时间记录')
    if (ip === ipStore.selectedIp) {
      eventData.value = eventRec?.element || []
      timeElements.value = timeRec?.element || []
    }
  }
  window.electron.ipcRenderer.on('update-FC04EventData', listener)
}
// ---------- 2. 数据变更监听 ----------
watch(
  eventData,
  (newVal) => {
    localStorage.setItem(LS_EVENT_KEY, JSON.stringify(newVal))
  },
  { deep: true }
)

watch(
  timeElements,
  (newVal) => {
    localStorage.setItem(LS_TIME_KEY, JSON.stringify(newVal))
  },
  { deep: true }
)
async function chooseDefaultDir() {
  const dir = await window.electron.ipcRenderer.invoke('choose-default-export-dir')
  if (dir) {
    defaultDir.value = dir
    window.electron.ipcRenderer.send('set-default-export-dir', dir)
    toast.add({
      severity: 'success',
      summary: t('eventTime.toast.settingSuccess'),
      detail: t('eventTime.toast.defaultExportDir', { dir }),
      life: 3000
    })
  }
}
function cancelExport() {
  window.electron.ipcRenderer.send('cancelExport', { ip: ipStore.selectedIp })
}
onBeforeMount(() => {
  startReading()
  registerListener()
})
onMounted(async () => {
  const dir = await window.electron.ipcRenderer.invoke('get-default-export-dir')
  defaultDir.value = dir
  // 恢复缓存
  try {
    const ev = JSON.parse(localStorage.getItem(LS_EVENT_KEY))
    const tm = JSON.parse(localStorage.getItem(LS_TIME_KEY))
    if (Array.isArray(ev)) eventData.value = ev
    if (Array.isArray(tm)) timeElements.value = tm
  } catch (e) {
    console.warn('localStorage 数据解析失败', e)
  }
  updateTime()
  timer = setInterval(updateTime, 1000)
  // 监听导出开始
})
window.electron.ipcRenderer.on('export-started', (_, saveDir) => {
  toast.add({
    severity: 'info',
    summary: t('eventTime.toast.exportStart'),
    detail: t('eventTime.toast.exportStartDir', { dir: saveDir }),
    life: 3000
  })
})

// 监听导出完成
window.electron.ipcRenderer.on('export-completed', (_, saveDir) => {
  toast.add({
    severity: 'success',
    summary: t('eventTime.toast.exportComplete', { dir: saveDir }),
    life: 5000
  })
  startReadingAll()
  startReading()
})
window.electron.ipcRenderer.on('export-canceled', (_, saveDir) => {
  exportStore.fail()
  toast.add({
    severity: 'warn',
    summary: t('eventTime.toast.exportAborted', { dir: saveDir }),
    life: 5000
  })
  startReadingAll()
})
window.electron.ipcRenderer.on('readEventErrorFromMain', (_, { deviceIp, error }) => {
  toast.add({
    severity: 'error',
    summary: t('eventTime.toast.exportError', { ip: deviceIp }),
    detail: t('eventTime.toast.exportErrorDetail', { error }),
    life: 5000
  })
  exportStore.fail()
})
onBeforeUnmount(() => {
  clearInterval(timer)
  stopReading()
  if (listener) {
    window.electron.ipcRenderer.removeListener('update-FC04EventData', listener)
    listener = null
  }
  window.electron.ipcRenderer.removeAllListeners('export-started')
  window.electron.ipcRenderer.removeAllListeners('export-completed')
  window.electron.ipcRenderer.removeAllListeners('export-canceled')
  window.electron.ipcRenderer.removeAllListeners('readEventErrorFromMain')
})
</script>

<style lang="less" scoped>
.time-card-display {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
.time-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: #e5e7eb solid 1px;
  .card-header {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid #ebeef5;
  }

  .card-content {
    display: flex;
    align-items: center;
    padding: 1rem;
    justify-content: space-between;
  }
}

.group-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  .group-title {
    padding-bottom: 0.5rem;
  }
}
/* 导出卡片样式 */
.export-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.read-only-input .p-inputnumber-input {
  background: transparent;
  border: none;
  cursor: default;
}
.export-count {
  display: inline-block;
  width: 3.3rem;
  text-align: right; /* 右对齐，让多位数往左挤 */
}
</style>
