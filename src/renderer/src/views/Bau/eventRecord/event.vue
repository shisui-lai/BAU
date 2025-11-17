<template>
  <div class="event-record-page">
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
          </div>
        </div>
        <!-- 系统启动次数 -->
        <div class="time-card" v-if="bootCount">
          <div class="card-header">
            <i class="pi pi-history mr-2"></i>
            <span class="text-lg font-medium">{{ t('eventTime.title4') }}</span>
          </div>
          <div class="card-content">
            <span class="ml-2 text-xl">{{ bootCount.value }}</span>
          </div>
        </div>
      </div>

      <!-- 时间记录分组 -->
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem">
        <div
          v-for="(record, idx) in sortedRecords"
          :key="idx"
          class="group-card"
          style="flex: 1; min-width: 300px"
        >
          <span class="text-lg font-medium">
            <i class="pi pi-clock mr-2"></i>
            {{ getRecordTitle(idx + 1) }}
          </span>
          <table class="lightweight-table mt-3" style="width: 100%">
            <thead>
              <tr>
                <th style="width: 200px">{{ t('eventTime.tableTile1') }}</th>
                <th>{{ t('eventTime.tableTile2') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, itemIdx) in record" :key="itemIdx" :class="{ 'striped': itemIdx % 2 === 1 }">
                <td>
                  {{
                    locale === 'zh'
                      ? item.label
                      : $te(`eventTime.table1Parameters.${item.label}`)
                        ? t(`eventTime.table1Parameters.${item.label}`)
                        : item.label
                  }}
                </td>
                <td>
                  <span
                    :class="getValueStyleClass(item.value, item.label)"
                  >
                    {{ formatTimeValue(item.value) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 事件记录读取 -->
    <div class="card readEvent p-4 mb-6">
      <h5>{{ t('eventTime.title6') }}</h5>
      <!-- 导出操作卡片 -->
      <div class="export-card mb-3 p-4 rounded-lg">
        <div class="flex align-items-center mb-4 gap-2 flex-wrap">
          <div class="flex align-items-center gap-2 flex-shrink-0">
            <i class="pi pi-folder-open text-lg"></i>
            <span class="font-medium">{{ t('eventTime.exportPath') }}：</span>
            <div class="truncate text-sm cursor-pointer" style="max-width: 300px;">
              {{ defaultDir }}
            </div>
            <div>
              <Button
                class="p-button-sm p-button-outlined ml-2"
                :label="t('eventTime.buttonLable2')"
                icon="pi pi-pencil"
                @click="chooseDefaultDir"
                :disabled="exportStore?.isExporting || false"
                style="min-width: 4rem"
              />
            </div>
          </div>
          <div v-if="exportStore?.isExporting" class="flex align-items-center gap-4" style="flex: 1; min-width: 0;">
            <span>
              <span class="export-count">{{ exportStore.current }}</span>
              /
              <span class="export-count">{{ exportStore.total }}</span>
              <span class="export-count">{{ exportStore.percent }}%</span>
            </span>
            <div class="flex-1" style="min-width: 0;">
              <ProgressBar :value="exportStore.percent" :showValue="false" />
            </div>
            <Button
              :label="t('eventTime.cancelExport')"
              @click="cancelExport"
              class="p-button-danger"
              icon="pi pi-trash"
            />
          </div>
        </div>
        <div class="flex flex-wrap gap-4 align-items-center mt-2">
          <div class="flex align-items-center gap-3 flex-wrap">
            <label>{{ t('eventTime.exportOffset') }}：</label>
            <InputText :value="offsetRead" style="width: 5rem" disabled />
            <label for="valueRead">{{ t('eventTime.exportNums') }}：</label>
            <InputText id="valueRead" v-model="valueRead" style="width: 5rem" />
            <Checkbox v-model="flagDownloadAll" inputId="downloadAll" binary />
            <label for="downloadAll">{{ t('eventTime.exportAll') }}</label>
            <Button
              :label="t('eventTime.buttonLable3')"
              @click="confirmExport"
              :disabled="!canExport || (exportStore?.isExporting || false)"
              class="p-button-success"
              icon="pi pi-download"
            />
          </div>
          <div class="flex align-items-center gap-3 flex-wrap">
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
      <!-- 事件数据表格 -->
      <div class="event-data-table-wrapper">
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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useBlockStore } from '@/stores/device/blockStore'
import { useEventStore } from '@/stores/eventStore'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressBar from 'primevue/progressbar'

const { t, te, locale } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const blockStore = useBlockStore()
const exportStore = useEventStore()

// 缓存Key
const LS_TIME_KEY = 'eventTime:times'
const LS_EVENT_KEY = 'eventTime:events'

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
const timeElements = ref([])
const eventData = ref([])

// ========== 导出相关变量 ==========
// 导出数量
const valueRead = ref(100)
// 是否导出全部
const flagDownloadAll = ref(false)
// 默认导出目录
const defaultDir = ref('')

// 计算属性：从事件记录标志位数据中获取存储数量
const storedCount = computed(() => {
  const countItem = eventData.value.find((item) => item.label === '事件记录存储数量')
  return parseInt(countItem?.value) || 0
})

// 计算属性：导出偏移量 = 总数 - 要读数量
const offsetRead = computed(() => {
  if (flagDownloadAll.value) {
    return 0
  }
  const readCount = parseInt(valueRead.value) || 0
  return Math.max(0, storedCount.value - readCount)
})

// 计算属性：是否可以导出
const canExport = computed(() => {
  // 如果实际事件记录数量为0，不允许导出
  if (storedCount.value === 0) return false
  // 全部导出时始终可用
  if (flagDownloadAll.value) return true
  const readCount = parseInt(valueRead.value)
  // 必须输入正整数，且不超过总存储数量
  return Number.isInteger(readCount) && readCount > 0 && readCount <= storedCount.value
})

// ========== 删除相关变量 ==========
// 删除包数（每个包16条记录）
const n = ref(1)
// 是否删除全部
const flagDeleteAll = ref(false)
// 计算属性：删除数量 = n * 16
const deleteCount = computed(() => {
  const num = parseInt(n.value) || 0
  return num * 16
})

// 计算属性（参考reference项目，返回对象而不是值）
const realTime = computed(() => {
  const result = timeElements.value.find((i) => i.label === '系统当前时间')
  return result?.value
})
const bootCount = computed(() => {
  // 返回对象而不是值，这样即使value为0，对象本身也是truthy，v-if可以正常工作
  const result = timeElements.value.find((i) => i.label === '系统启动次数')
  return result
})

// 时间分组（参考reference项目，使用slice方法直接按索引切片）
// 根据processSysRunTimeData函数和groupByClass的实现，element数组按schema顺序排列
// 顺序：系统当前时间(0)、系统启动次数(1)、第1次记录(2-7)、第2次记录(8-13)、第3次记录(14-19)
const timeGroups = computed(() => {
  if (timeElements.value.length < 20) return []
  // 直接按索引切片，与reference项目保持一致
  return [
    timeElements.value.slice(2, 8),   // 第1次记录：索引2-7（6个字段）
    timeElements.value.slice(8, 14),  // 第2次记录：索引8-13（6个字段）
    timeElements.value.slice(14, 20)  // 第3次记录：索引14-19（6个字段）
  ]
})

// 根据系统启动次数对记录进行排序（环形缓冲，参考reference项目）
// 算法说明：假设总记录数为 total = 3
// 如果启动次数 <= 3，直接从位置0开始顺序显示
// 如果启动次数 > 3，使用循环缓冲区逻辑，从最旧到最新排序
const sortedRecords = computed(() => {
  const total = 3
  // bootCount 返回的是对象，需要取 value 属性
  const bootNum = parseInt(bootCount.value?.value) || 0
  
  if (bootNum === 0) return []
  
  // 如果启动次数 <= 3，直接从位置0开始顺序显示
  if (bootNum <= total) {
    const rec = []
    for (let i = 0; i < bootNum; i++) {
      rec.push(timeGroups.value[i])
    }
    return rec
  }
  
  // 如果启动次数 > 3，使用循环缓冲区逻辑
  const rec = []
  // 计算最新记录的位置索引
  const newestIdx = (bootNum - 1) % total
  // 从最旧的记录开始（最新记录的下一个位置）
  const oldestIdx = (newestIdx + 1) % total
  
  // 从最旧到最新排序（显示3个记录）
  for (let i = 0; i < total; i++) {
    const idx = (oldestIdx + i) % total
    rec.push(timeGroups.value[idx])
  }
  
  return rec
})

// 辅助方法（参考reference项目）
// 检查是否为无效时间：2000-1-1-00:00:00 或 2000-0-0 格式
const isInvalidTime = (val) => {
  if (typeof val !== 'string') return false
  // 检查 reference 项目的格式：0000年00月第00周
  if (/0000年00月第00周/.test(val)) return true
  // 检查当前项目的格式：2000-1-1-00:00:00 或 2000-0-0
  if (/^2000-0?-?[01]-0?-?[01]/.test(val)) return true
  return false
}

const formatTimeValue = (val) => {
  // 参考reference项目：如果是数字且大于0，格式化为"xx 分钟"
  if (typeof val === 'number' && val > 0) {
    return `${val} 分钟`
  }
  return val
}

// 检查值是否为零或无效（用于样式类判断）
const isZeroOrInvalid = (val) => {
  if (val === 0 || val === '0' || val === '0.0Kb') return true
  if (typeof val === 'string' && /^0+\.?0*K?b?$/i.test(val)) return true
  return false
}

// 检查值是否大于零（用于样式类判断，支持字符串）
const isGreaterThanZero = (val) => {
  if (typeof val === 'number') return val > 0
  if (typeof val === 'string') {
    // 检查是否为数字字符串
    const num = parseFloat(val)
    if (!isNaN(num)) return num > 0
    // 检查是否为堆栈大小格式（如 '7.4Kb'）
    const kbMatch = val.match(/^([\d.]+)Kb$/i)
    if (kbMatch) {
      const kbValue = parseFloat(kbMatch[1])
      return !isNaN(kbValue) && kbValue > 0
    }
    // 检查是否为时间格式（如 '35分钟'）
    const timeMatch = val.match(/^(\d+)\s*分钟/)
    if (timeMatch) {
      const timeValue = parseInt(timeMatch[1])
      return !isNaN(timeValue) && timeValue > 0
    }
  }
  return false
}

// 获取值的样式类（确保所有字段都有可见的颜色）
const getValueStyleClass = (value, label) => {
  // 1. 无效时间：红色
  if (isInvalidTime(value)) {
    return 'text-red-500'
  }
  
  // 2. 运行时间或堆栈相关字段，且值大于0：白色（统一使用白色，不使用绿色）
  if ((label.includes('运行时间') || label.includes('堆栈')) && isGreaterThanZero(value)) {
    return 'text-default'
  }
  
  // 3. 零值或无效值：灰色
  if (isZeroOrInvalid(value)) {
    return 'text-gray-400'
  }
  
  // 4. 其他情况（有效时间等）：默认颜色（白色，在深色背景下可见）
  return 'text-default'
}

// 获取记录标题
const getRecordTitle = (index) => {
  const key = `第${index}次系统记录`
  return t(`eventTime.title5.${key}`)
}

// 获取当前选中的堆信息
const getCurrentBlockInfo = () => {
  const selectedBlock = blockStore.selectedBlockForView
  if (!selectedBlock) {
    return null
  }
  const blockNumber = Number(selectedBlock.replace('block', ''))
  return {
    blockKey: selectedBlock,
    blockNumber: blockNumber
  }
}

// 动态生成topic的函数
const buildTopic = (template) => {
  const blockInfo = getCurrentBlockInfo()
  if (!blockInfo) {
    throw new Error('请先选择堆')
  }
  return template.replace('{block}', blockInfo.blockNumber)
}

// 请求系统时间记录数据
const requestSysRunTime = async () => {
  try {
    const topic = buildTopic('bms/host/s2d/b{block}/sys_run_time_r')
    await window.electronAPI.mqttPublish(topic, 'ff')
  } catch (error) {
    console.error('[EventTime] 数据请求失败:', error)
    if (error.message !== '请先选择堆') {
      toast.add({
        severity: 'error',
        summary: '请求失败',
        detail: error.message,
        life: 3000
      })
    }
  }
}

// 请求事件记录标志位数据
const requestEventRecordFlag = async () => {
  try {
    const topic = buildTopic('bms/host/s2d/b{block}/event_record_flag_r')
    await window.electronAPI.mqttPublish(topic, 'ff')
  } catch (error) {
    console.error('[EventRecord] 事件记录标志位请求失败:', error)
    if (error.message !== '请先选择堆') {
      // 不显示错误提示，避免干扰用户
    }
  }
}

// 周期性读取定时器
let dataReadingTimer = null
let eventFlagReadingTimer = null

// 启动周期性读取（每秒一次）
const startPeriodicReading = () => {
  // 清理可能存在的旧定时器
  if (dataReadingTimer) {
    clearInterval(dataReadingTimer)
  }
  
  // 立即读取一次
  requestSysRunTime()
  
  // 设置定时器，每秒读取一次
  dataReadingTimer = setInterval(() => {
    requestSysRunTime()
  }, 1000)
}

// 停止周期性读取
const stopPeriodicReading = () => {
  if (dataReadingTimer) {
    clearInterval(dataReadingTimer)
    dataReadingTimer = null
  }
}

// 启动事件记录标志位周期性读取（每秒一次）
const startEventFlagPeriodicReading = () => {
  // 清理可能存在的旧定时器
  if (eventFlagReadingTimer) {
    clearInterval(eventFlagReadingTimer)
  }
  
  // 立即读取一次
  requestEventRecordFlag()
  
  // 设置定时器，每秒读取一次
  eventFlagReadingTimer = setInterval(() => {
    requestEventRecordFlag()
  }, 1000)
}

// 停止事件记录标志位周期性读取
const stopEventFlagPeriodicReading = () => {
  if (eventFlagReadingTimer) {
    clearInterval(eventFlagReadingTimer)
    eventFlagReadingTimer = null
  }
}

// IPC 事件监听
let listener = null
const registerListener = () => {
  if (listener) {
    window.electron.ipcRenderer.removeListener('SYS_RUN_TIME_R', listener)
  }

  listener = (_, mqttMessage) => {
    const { blockId, data } = mqttMessage
    
    // 检查是否是当前选中的堆
    const blockInfo = getCurrentBlockInfo()
    if (!blockInfo || blockInfo.blockNumber !== blockId) {
      return
    }
    
    // 提取时间记录数据
    if (data && Array.isArray(data)) {
      const timeRec = data.find(d => d.class === '系统时间记录')
      if (timeRec && timeRec.element) {
        timeElements.value = timeRec.element || []
      }
    }
  }
  
  window.electron.ipcRenderer.on('SYS_RUN_TIME_R', listener)
}

// 事件记录标志位 IPC 事件监听
let eventFlagListener = null
const registerEventFlagListener = () => {
  if (eventFlagListener) {
    window.electron.ipcRenderer.removeListener('EVENT_RECORD_FLAG_R', eventFlagListener)
  }

  eventFlagListener = (_, mqttMessage) => {
    const { blockId, data } = mqttMessage
    
    // 检查是否是当前选中的堆
    const blockInfo = getCurrentBlockInfo()
    if (!blockInfo || blockInfo.blockNumber !== blockId) {
      return
    }
    
    // 提取事件记录标志位数据
    if (data && Array.isArray(data)) {
      const eventFlagRec = data.find(d => d.class === '事件记录标志位')
      if (eventFlagRec && eventFlagRec.element) {
        // 转换数据格式：从 { label, value } 转换为 { label, value, unit }
        eventData.value = eventFlagRec.element.map(item => {
          // 如果已经有unit字段，直接返回；否则根据label添加unit
          if (item.unit !== undefined) {
            return item
          }
          
          // 根据label添加unit
          let unit = ''
          if (item.label.includes('存储数量')) {
            unit = '条'
          } else if (item.label.includes('存储百分比')) {
            unit = '%'
          }
          
          return {
            ...item,
            unit
          }
        })
      }
    }
  }
  
  window.electron.ipcRenderer.on('EVENT_RECORD_FLAG_R', eventFlagListener)
}

// ========== 导出相关函数 ==========

/**
 * 选择导出目录
 */
const chooseDefaultDir = async () => {
  try {
    const dir = await window.electronAPI.dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (dir && !dir.canceled && dir.filePaths && dir.filePaths.length > 0) {
      defaultDir.value = dir.filePaths[0]
      // 保存到localStorage
      try {
        localStorage.setItem('eventExport:defaultDir', defaultDir.value)
      } catch (e) {
        console.warn('[EventRecord] 保存导出目录失败', e)
      }
    }
  } catch (error) {
    console.error('[EventRecord] 选择导出目录失败:', error)
    toast.add({
      severity: 'error',
      summary: t('toast.common.executeFailed'),
      detail: error.message,
      life: 3000
    })
  }
}

/**
 * 确认导出
 */
const confirmExport = () => {
  const blockInfo = getCurrentBlockInfo()
  if (!blockInfo) {
    toast.add({
      severity: 'error',
      summary: t('toast.common.executeFailed'),
      detail: t('toast.remoteControl.selectTargetBlock'),
      life: 3000
    })
    return
  }

  // 校验输入
  if (!canExport.value) {
    if (storedCount.value === 0) {
      toast.add({
        severity: 'warn',
        summary: t('toast.common.executeFailed'),
        detail: t('eventTime.toast.enterExportZero'),
        life: 3000
      })
    } else if (!flagDownloadAll.value && (!valueRead.value || parseInt(valueRead.value) <= 0)) {
      toast.add({
        severity: 'warn',
        summary: t('toast.common.executeFailed'),
        detail: t('eventTime.toast.enterExportCount'),
        life: 3000
      })
    } else if (!flagDownloadAll.value && parseInt(valueRead.value) > storedCount.value) {
      toast.add({
        severity: 'error',
        summary: t('toast.common.executeFailed'),
        detail: t('eventTime.toast.exportCountTooBig', { total: storedCount.value }),
        life: 3000
      })
    }
    return
  }

  // 计算实际导出参数
  const offsetReadForSend = flagDownloadAll.value ? 0 : offsetRead.value
  const totalRead = flagDownloadAll.value ? storedCount.value : parseInt(valueRead.value)

  // 显示确认对话框
  confirm.require({
    message: flagDownloadAll.value
      ? t('eventTime.confirm.exportAllMessage')
      : t('eventTime.confirm.exportPartialMessage', { count: totalRead }),
    header: t('eventTime.confirm.exportHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('eventTime.confirm.yes'),
    rejectLabel: t('eventTime.confirm.no'),
    accept: () => {
      // 开始导出
      exportStore.start(totalRead)
      // 不再传递exportDir，由主进程使用DEFAULT_EXPORT_DIR
      window.electron.ipcRenderer.send('start-reading-data-event', {
        offsetRead: offsetReadForSend,
        totalRead: totalRead,
        blockId: blockInfo.blockNumber
      })
    }
  })
}

/**
 * 取消导出
 */
const cancelExport = () => {
  const blockInfo = getCurrentBlockInfo()
  if (blockInfo) {
    window.electron.ipcRenderer.send('cancel-export-event', {
      blockId: blockInfo.blockNumber
    })
  }
  exportStore.cancel()
  toast.add({
    severity: 'info',
    summary: t('toast.common.cancelOperation'),
    life: 2000
  })
}

// ========== 删除相关函数 ==========

/**
 * 确认删除
 */
const confirmDelete = () => {
  const blockInfo = getCurrentBlockInfo()
  if (!blockInfo) {
    toast.add({
      severity: 'error',
      summary: t('toast.common.executeFailed'),
      detail: t('toast.remoteControl.selectTargetBlock'),
      life: 3000
    })
    return
  }

  // 校验输入
  if (!flagDeleteAll.value && (!n.value || parseInt(n.value) <= 0)) {
    toast.add({
      severity: 'warn',
      summary: t('toast.common.executeFailed'),
      detail: t('eventTime.toast.enterDeleteCount'),
      life: 3000
    })
    return
  }

  // 显示确认对话框
  confirm.require({
    message: flagDeleteAll.value
      ? t('eventTime.confirm.deleteAllMessage')
      : t('eventTime.confirm.deletePartialMessage', { count: deleteCount.value }),
    header: t('eventTime.confirm.deleteHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('eventTime.confirm.delete'),
    rejectLabel: t('eventTime.confirm.cancel'),
    accept: async () => {
      try {
        // 构建删除命令的topic和payload
        const deleteTopic = `bms/host/s2d/b${blockInfo.blockNumber}/clear_event_record_num`
        
        // 将数字转换为小端序的十六进制字符串
        // 小端序：低字节在前，高字节在后
        // 例如：0xFFFF -> 'ffff', 16000 (0x3E80) -> '803e'
        const toHexLE = (value) => {
          const low = value & 0xFF
          const high = (value >> 8) & 0xFF
          return low.toString(16).padStart(2, '0') + high.toString(16).padStart(2, '0')
        }
        
        let deletePayloadHex
        if (flagDeleteAll.value) {
          // 全部删除：发送 0xFFFF (小端序: 'ffff')
          deletePayloadHex = toHexLE(0xFFFF)
        } else {
          // 部分删除：发送删除数量 (小端序)
          deletePayloadHex = toHexLE(deleteCount.value)
        }
        
        console.log(`[EventRecord] 发送删除事件记录命令: blockId=${blockInfo.blockNumber}, deleteCount=${flagDeleteAll.value ? 0xFFFF : deleteCount.value}, deleteAll=${flagDeleteAll.value}, topic=${deleteTopic}, payload=${deletePayloadHex}`)
        
        // 发送MQTT消息
        await window.electronAPI.mqttPublish(deleteTopic, deletePayloadHex)
        
        toast.add({
          severity: 'info',
          summary: t('eventTime.toast.deleteCmdSent'),
          life: 2000
        })
      } catch (error) {
        console.error('[EventRecord] 删除事件记录命令发送失败:', error)
        toast.add({
          severity: 'error',
          summary: t('toast.common.executeFailed'),
          detail: t('eventTime.toast.deleteCmdSendFailed'),
          life: 3000
        })
      }
    }
  })
}

// 监听导出进度更新
window.electron.ipcRenderer.on('update-readEventProgress', (_, { current, total }) => {
  exportStore.update(current, total)
})

// 监听导出开始
window.electron.ipcRenderer.on('export-started', (_, saveDir) => {
  console.log('[EventRecord] 导出开始，保存目录:', saveDir)
  // 可以在这里显示导出目录信息
})

// 监听导出完成
window.electron.ipcRenderer.on('export-completed', (_, data) => {
  console.log('[EventRecord] 导出完成:', data)
  exportStore.complete()
  if (data?.partial) {
    toast.add({
      severity: 'warn',
      summary: t('toast.common.executeSuccess'),
      detail: t('eventTime.toast.exportPartialSuccess', { success: data.cachedCount, total: data.totalRequested }),
      life: 3000
    })
  } else {
    toast.add({
      severity: 'success',
      summary: t('toast.common.executeSuccess'),
      detail: t('eventTime.toast.exportSuccess'),
      life: 3000
    })
  }
})

// 监听导出取消
window.electron.ipcRenderer.on('export-canceled', (_, data) => {
  console.log('[EventRecord] 导出取消:', data)
  exportStore.fail()
  toast.add({
    severity: 'warn',
    summary: t('toast.common.cancelOperation'),
    life: 2000
  })
})

// 监听导出错误
window.electron.ipcRenderer.on('readEventErrorFromMain', (_, data) => {
  console.error('[EventRecord] 导出失败:', data)
  exportStore.fail()
  toast.add({
    severity: 'error',
    summary: t('toast.common.executeFailed'),
    detail: data?.error || t('toast.common.unknownError'),
    life: 3000
  })
})

// 监听删除事件记录应答
window.electron.ipcRenderer.on('CLEAR_EVENT_RECORD_NUM', (_, msg) => {
  const { data, blockId, topic } = msg
  
  if (!data) {
    console.warn('[EventRecord] 删除事件记录应答数据为空')
    return
  }
  
  // 检查是否是来自BAU的应答（topic包含bms/bau/d2s）
  if (!topic || !topic.includes('bms/bau/d2s')) {
    return
  }
  
  // 获取设备显示名称
  const deviceName = blockId ? `堆${blockId}` : ''
  
  // 检查是否是错误应答
  if (data.error) {
    const errorMessage = data.message || t('toast.common.unknownError')
    toast.add({
      severity: 'error',
      summary: t('toast.common.executeFailed'),
      detail: `${deviceName}: ${t('eventTime.toast.deleteFailed')} - ${errorMessage}`,
      life: 6000
    })
    return
  }
  
  // 成功应答
  const isSuccess = data.success
  const codeHex = data.code ? `0x${data.code.toString(16).toUpperCase()}` : ''
  
  if (isSuccess) {
    toast.add({
      severity: 'success',
      summary: t('toast.common.executeSuccess'),
      detail: `${deviceName}: ${t('eventTime.toast.deleteSuccess')}${codeHex ? ` (${codeHex})` : ''}`,
      life: 4000
    })
  } else {
    const codeMessage = data.message || t('toast.common.unknownError')
    toast.add({
      severity: 'error',
      summary: t('toast.common.executeFailed'),
      detail: `${deviceName}: ${t('eventTime.toast.deleteFailed')} - ${codeMessage}${codeHex ? ` (${codeHex})` : ''}`,
      life: 6000
    })
  }
})

// 数据变更监听 - 缓存到localStorage
watch(
  timeElements,
  (newVal) => {
    try {
      localStorage.setItem(LS_TIME_KEY, JSON.stringify(newVal))
    } catch (e) {
      console.warn('[EventTime] localStorage保存失败', e)
    }
  },
  { deep: true }
)

watch(
  eventData,
  (newVal) => {
    try {
      localStorage.setItem(LS_EVENT_KEY, JSON.stringify(newVal))
    } catch (e) {
      console.warn('[EventTime] localStorage保存失败', e)
    }
  },
  { deep: true }
)

// 监听堆选择变化，自动请求数据
watch(
  () => blockStore.selectedBlockForView,
  (newBlock) => {
    if (newBlock) {
      // 延迟一下，确保堆选择已完成
      setTimeout(() => {
        startPeriodicReading()
        startEventFlagPeriodicReading()
      }, 100)
    } else {
      // 堆选择被清空时，停止周期性读取
      stopPeriodicReading()
      stopEventFlagPeriodicReading()
    }
  }
)

onMounted(async () => {
  // 恢复缓存
  try {
    const tm = JSON.parse(localStorage.getItem(LS_TIME_KEY))
    const ev = JSON.parse(localStorage.getItem(LS_EVENT_KEY))
    if (Array.isArray(tm)) {
      timeElements.value = tm
    }
    if (Array.isArray(ev)) {
      eventData.value = ev
    }
    // 恢复默认导出目录
    const savedDir = localStorage.getItem('eventExport:defaultDir')
    if (savedDir) {
      defaultDir.value = savedDir
    }
  } catch (e) {
    console.warn('[EventTime] localStorage数据解析失败', e)
  }
  
  updateTime()
  timer = setInterval(updateTime, 1000)
  
  // 注册IPC监听器
  registerListener()
  registerEventFlagListener()
  
  // 如果有选中的堆，启动周期性读取
  if (blockStore.selectedBlockForView) {
    setTimeout(() => {
      startPeriodicReading()
      startEventFlagPeriodicReading()
    }, 500)
  }
})

onBeforeUnmount(() => {
  clearInterval(timer)
  stopPeriodicReading()
  stopEventFlagPeriodicReading()
  if (listener) {
    window.electron.ipcRenderer.removeListener('SYS_RUN_TIME_R', listener)
    listener = null
  }
  if (eventFlagListener) {
    window.electron.ipcRenderer.removeListener('EVENT_RECORD_FLAG_R', eventFlagListener)
    eventFlagListener = null
  }
  // 清理导出相关的IPC监听器
  window.electron.ipcRenderer.removeAllListeners('export-started')
  window.electron.ipcRenderer.removeAllListeners('export-completed')
  window.electron.ipcRenderer.removeAllListeners('export-canceled')
  window.electron.ipcRenderer.removeAllListeners('readEventErrorFromMain')
  // 清理删除事件记录应答监听器
  window.electron.ipcRenderer.removeAllListeners('CLEAR_EVENT_RECORD_NUM')
  window.electron.ipcRenderer.removeAllListeners('update-readEventProgress')
})
</script>

<style lang="less" scoped>
/* 页面容器 - 防止内容溢出导致页面左移 */
.event-record-page {
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  /* 确保页面容器不会因为内容而扩展，防止滚动条出现/消失导致布局偏移 */
  position: relative;
}

/* 确保所有card容器都有正确的宽度约束 */
.event-record-page .card {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.time-card-display {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
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
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.lightweight-table {
  border-collapse: collapse;
  width: 100%;
  background-color: #1f2937; /* 深色背景 */
  color: #ffffff; /* 默认白色文字 */
  
  thead {
    background-color: #374151; /* 深灰色表头背景 */
    
    th {
      padding: 0.5rem;
      text-align: left;
      border: 1px solid #4b5563; /* 深色边框 */
      font-weight: 600;
      color: #ffffff; /* 白色文字 */
    }
  }
  
  tbody {
    tr {
      border-bottom: 1px solid #4b5563; /* 深色边框 */
      background-color: #1f2937; /* 深色背景 */
      
      &.striped {
        background-color: #374151; /* 稍微不同的深色，用于条纹效果 */
      }
      
      td {
        padding: 0.5rem;
        border: 1px solid #4b5563; /* 深色边框 */
        color: #ffffff; /* 默认白色文字 */
      }
    }
  }
}

.text-red-500 {
  color: #ef4444;
}

.text-green-600 {
  color: #16a34a;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-default {
  color: #ffffff; /* 白色，在深色背景下可见 */
}

/* 导出卡片样式 */
.export-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-width: 0; /* 防止flex子元素溢出 */
  width: 100%;
  box-sizing: border-box;
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

.btn {
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1.5;
  
  &.btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }
  
  &.btn-success {
    background-color: #10b981;
    color: white;
    border-color: #10b981;
    
    &:hover {
      background-color: #059669;
      border-color: #059669;
    }
  }
}

/* 事件数据表格容器 - 防止DataTable导致页面宽度变化 */
.event-data-table-wrapper {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  box-sizing: border-box;
}

/* 确保DataTable不会导致页面宽度变化 */
:deep(.p-datatable) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

:deep(.p-datatable-wrapper) {
  overflow-x: auto;
  max-width: 100%;
}
</style>

