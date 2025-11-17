<template>
  <div class="card">
    <div class="toolbar">
      <Dropdown
        v-model="showCharge"
        :options="isShowMapOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('powerMap.dropDownplaceholder1')"
      />
      <Button
        class="ml-2"
        :label="isModuleReading ? t('powerMap.stopReading') : t('powerMap.startReading')"
        :severity="isModuleReading ? 'danger' : 'success'"
        @click="toggleReading"
      />

      <Button
        class="ml-2"
        :label="t('powerMap.buttonLable1')"
        icon="pi pi-upload"
        @click="onExportCsv"
      />
      <input
        ref="fileInput"
        type="file"
        accept=".csv"
        style="display: none"
        @change="onFileChange"
      />
      <Button
        class="ml-2"
        :label="t('powerMap.buttonLable2')"
        icon="pi pi-download"
        @click="triggerImport"
        :disabled="isModuleReading"
      />
      <Button
        class="ml-2"
        :label="t('powerMap.buttonLable3')"
        icon="pi pi-save"
        @click="onWriteAll"
        :disabled="isModuleReading || !importValid"
      />
    </div>

    <!-- 行/列数 配置面板 -->
    <div class="rownum-panel">
      <label>{{ t('powerMap.label1') }}</label>
      <InputText
        v-model="displayedRowCount"
        type="number"
        min="1"
        max="16"
        :class="{ 'p-invalid': !isRowCountValid }"
        :disabled="isModuleReading"
        @focus="onRowCountFocus"
        @blur="onRowCountBlur"
      />
      <small v-if="!isRowCountValid" class="p-error">行数必须在1-16之间</small>

      <label>{{ t('powerMap.label2') }}</label>
      <InputText
        v-model="displayedColCount"
        type="number"
        min="1"
        max="16"
        :class="{ 'p-invalid': !isColCountValid }"
        :disabled="isModuleReading"
        @focus="onColCountFocus"
        @blur="onColCountBlur"
      />
      <small v-if="!isColCountValid" class="p-error">列数必须在1-16之间</small>

      <Button
        class="ml-2"
        :label="t('powerMap.buttonLable4')"
        icon="pi pi-download"
        @click="onSendRowNum"
        :disabled="!isRowCountValid || !isColCountValid"
      />
      <Button
        class="ml-2"
        :label="t('powerMap.buttonLable5')"
        icon="pi pi-download"
        @click="onSendMap"
      />
      <!-- 实时数据显示面板 -->
      <div class="realtime-panel">
        <div class="realtime-item">
          <label>{{ t('powerMap.realtimeData.cellTempMax1') }}：</label>
          <span class="realtime-value">{{ realtimeData.tempMax1 || '--' }}℃</span>
        </div>
        <div class="realtime-item">
          <label>{{ t('powerMap.realtimeData.cellTempMin1') }}：</label>
          <span class="realtime-value">{{ realtimeData.tempMin1 || '--' }}℃</span>
        </div>
        <div class="realtime-item">
          <label>{{ t('powerMap.realtimeData.clusterSOC') }}：</label>
          <span class="realtime-value">{{ realtimeData.clusterSOC || '--' }}%</span>
        </div>
        <div class="realtime-item">
          <label>{{ t('powerMap.realtimeData.chargeSOP') }}：</label>
          <span class="realtime-value">{{ realtimeData.chargeSOP || '--' }}%</span>
        </div>
        <div class="realtime-item">
          <label>{{ t('powerMap.realtimeData.dischargeSOP') }}：</label>
          <span class="realtime-value">{{ realtimeData.dischargeSOP || '--' }}%</span>
        </div>
      </div>
    </div>
    <DataTable
      :value="displayedData"
      tableStyle="min-width: 20rem"
      class="center-table"
      showGridlines
      scrollable
      dataKey="rowTitle"
      :fixedHeader="true"
    >
      <!-- 行标题这一列 -->
      <Column field="rowTitle">
        <template #body="{ data, index }">
          <span class="clickable-header" @click="onHeaderClick(true, index)">
            {{ data.rowTitle }}
          </span>
        </template>
      </Column>

      <!-- 数据列 -->
      <Column v-for="(col, idx) in dynamicColumns.slice(1)" :key="col.field" :field="col.field">
        <template #header>
          <span class="clickable-header" @click="onHeaderClick(false, idx)">
            {{ col.header }}
          </span>
        </template>
        <template #body="{ data, index }">
          <InputText
            v-model="data[col.field]"
            @change="onInlineEdit(data, col.field)"
            style="width: 100%"
            :disabled="isModuleReading"
            :class="{
              'highlight-sop-cell': index === highlightCell.row && idx === highlightCell.col
            }"
          />
          <!--      <span v-else>
            {{ data[col.field] }}
          </span> -->
        </template>
      </Column>
    </DataTable>
    <!-- 编辑弹窗 -->
    <Dialog
      v-model:visible="editor.visible"
      :header="currentTitle"
      modal
      :closable="false"
      style="width: 400px"
    >
      <div class="p-fluid flex align-items-center" style="gap: 0.5rem">
        <InputText v-model="editor.prevVal" style="width: 4rem" :disabled="editor.idx === 0" />
        <!-- 比较符2 -->
        <Dropdown
          v-model="editor.cmp2"
          :options="cmpOptions"
          optionLabel="label"
          optionValue="value"
          :disabled="editor.idx === 0"
        />
        <span>{{ editor.isRow ? 'T' : 'SOC' }}</span>
        <!-- 比较符1 -->
        <Dropdown
          v-model="editor.cmp1"
          :options="cmpOptions"
          optionLabel="label"
          optionValue="value"
        />

        <!-- 当前阈值 -->
        <InputText v-model="editor.val" style="width: 4rem" />
      </div>

      <template #footer>
        <Button label="取消" @click="editor.visible = false" class="p-button-text" />
        <Button label="确认下设" @click="onEditorConfirm" :disabled="editor.val === null" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeMount, onBeforeUnmount, h } from 'vue'
import Papa from 'papaparse'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore.js'
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { formatFileSuffix } from '../bcuParameter/configData.js'
import { initPowerMap } from './initPowerMap.js'
const toast = useToast()
const ipStore = useIpStore()
const { moduleReadingStatus } = storeToRefs(ipStore)
const MODULE_NAME = 'PowerMap'
const isModuleReading = computed(() => moduleReadingStatus.value[MODULE_NAME])
const IPC_CHANNEL = 'update-FC04PowerMap'
const fileInput = ref(null)
// —— 新增 —— 是否已导入合法 CSV
const importValid = ref(false)
// 比较符可选项（只允许 < 和 ≤）
const cmpOptions = [
  { label: '<', value: 2 },
  { label: '≤', value: 4 }
]

// 本地存储所有 IP 的数据
const DataPowerMap = reactive({})

// 界面切换充/放电
const showCharge = ref(true)
const isShowMapOptions = computed(() => [
  { label: t('powerMap.chargePowerTable'), value: true },
  { label: t('powerMap.dischargePowerTable'), value: false }
])

const isCharge = computed(() => showCharge.value)

const currentEntry = computed(() => {
  const ip = ipStore.selectedIp
  const realtimeData = DataPowerMap[ip]

  // 如果没有实时数据，使用初始值
  if (!realtimeData) {
    return initPowerMap
  }

  // 如果有实时数据，合并初始值和实时数据，实时数据优先
  return {
    // 使用初始值作为默认值
    ...initPowerMap,
    // 用实时数据覆盖初始值
    ...realtimeData,
    // 确保表格数据存在，如果实时数据中没有则使用初始值
    chargeTable: realtimeData.chargeTable || initPowerMap.chargeTable,
    dischargeTable: realtimeData.dischargeTable || initPowerMap.dischargeTable,
    colTitlesChrg: realtimeData.colTitlesChrg || initPowerMap.colTitlesChrg,
    rowTitlesChrg: realtimeData.rowTitlesChrg || initPowerMap.rowTitlesChrg,
    colTitlesDis: realtimeData.colTitlesDis || initPowerMap.colTitlesDis,
    rowTitlesDis: realtimeData.rowTitlesDis || initPowerMap.rowTitlesDis,
    rowNum: realtimeData.rowNum || initPowerMap.rowNum,
    rawSocChrg: realtimeData.rawSocChrg || initPowerMap.rawSocChrg,
    rawTempChrg: realtimeData.rawTempChrg || initPowerMap.rawTempChrg,
    rawSocDis: realtimeData.rawSocDis || initPowerMap.rawSocDis,
    rawTempDis: realtimeData.rawTempDis || initPowerMap.rawTempDis
  }
})

// 实时数据计算属性
const realtimeData = computed(() => {
  const ip = ipStore.selectedIp
  const data = DataPowerMap[ip]
  return (
    data?.realtimeData || {
      tempMax1: null,
      tempMin1: null,
      clusterSOC: null,
      chargeSOP: null,
      dischargeSOP: null
    }
  )
})
const highlightCell = computed(() => {
  const sop = currentEntry.value.sopRealtime || {}
  if (isCharge.value) {
    return {
      row: sop.chargSOPMapRow ?? +1,
      col: sop.chargSOPMapColumn ?? +1
    }
  } else {
    return {
      row: sop.dischargSOPMapRow ?? +1,
      col: sop.dischargSOPMapColumn ?? +1
    }
  }
})
// 行/列数计算
const rowNumChrg = computed(() => currentEntry.value.rowNum[0]?.value || 0)
const colNumChrg = computed(() => currentEntry.value.rowNum[1]?.value || 0)
const rowNumDis = computed(() => currentEntry.value.rowNum[2]?.value || 0)
const colNumDis = computed(() => currentEntry.value.rowNum[3]?.value || 0)
const currentRowCount = computed(() => (isCharge.value ? rowNumChrg.value : rowNumDis.value))
const currentColCount = computed(() => (isCharge.value ? colNumChrg.value : colNumDis.value))
// 编辑状态管理
const isRowCountEditing = ref(false)
const isColCountEditing = ref(false)
const editedRowCount = ref(1)
const editedColCount = ref(1)

// 显示值：编辑时显示编辑值，否则显示实时值
const displayedRowCount = computed({
  get() {
    return isRowCountEditing.value ? editedRowCount.value : currentRowCount.value
  },
  set(value) {
    if (isRowCountEditing.value) {
      editedRowCount.value = value
    }
  }
})

const displayedColCount = computed({
  get() {
    return isColCountEditing.value ? editedColCount.value : currentColCount.value
  },
  set(value) {
    if (isColCountEditing.value) {
      editedColCount.value = value
    }
  }
})

// 验证行列数有效性
const isRowCountValid = computed(() => {
  const rowCount = parseInt(displayedRowCount.value)
  return !isNaN(rowCount) && rowCount >= 1 && rowCount <= 16
})

const isColCountValid = computed(() => {
  const colCount = parseInt(displayedColCount.value)
  return !isNaN(colCount) && colCount >= 1 && colCount <= 16
})

// 监听当前行列数变化，同步到编辑值（仅在非编辑状态下）
watch(
  [currentRowCount, currentColCount],
  ([newRowCount, newColCount]) => {
    if (!isRowCountEditing.value) {
      editedRowCount.value = newRowCount
    }
    if (!isColCountEditing.value) {
      editedColCount.value = newColCount
    }
  },
  { immediate: true }
)

// 焦点事件处理
function onRowCountFocus() {
  // 只有在停止读取时才能编辑
  if (isModuleReading.value) {
    toast.add({
      severity: 'warn',
      summary: '无法编辑',
      detail: '请先停止读取后再编辑行列数',
      life: 3000
    })
    return
  }
  isRowCountEditing.value = true
  editedRowCount.value = currentRowCount.value
}

function onRowCountBlur() {
  isRowCountEditing.value = false
  // 如果编辑值无效，恢复到实时值
  if (!isRowCountValid.value) {
    editedRowCount.value = currentRowCount.value
  }
}

function onColCountFocus() {
  // 只有在停止读取时才能编辑
  if (isModuleReading.value) {
    toast.add({
      severity: 'warn',
      summary: '无法编辑',
      detail: '请先停止读取后再编辑行列数',
      life: 3000
    })
    return
  }
  isColCountEditing.value = true
  editedColCount.value = currentColCount.value
}

function onColCountBlur() {
  isColCountEditing.value = false
  // 如果编辑值无效，恢复到实时值
  if (!isColCountValid.value) {
    editedColCount.value = currentColCount.value
  }
}

// 下发行列数
async function onSendRowNum() {
  // 验证行列数范围
  const rowCount = parseInt(editedRowCount.value)
  const colCount = parseInt(editedColCount.value)

  if (isNaN(rowCount) || rowCount < 1 || rowCount > 16) {
    toast.add({
      severity: 'error',
      summary: '行数范围错误',
      detail: '行数必须在1-16之间',
      life: 5000
    })
    return
  }

  if (isNaN(colCount) || colCount < 1 || colCount > 16) {
    toast.add({
      severity: 'error',
      summary: '列数范围错误',
      detail: '列数必须在1-16之间',
      life: 5000
    })
    return
  }

  const ip = ipStore.selectedIp
  // 地址基址
  const base = isCharge.value ? 0x5400 : 0x5402
  const addrs = [base, base + 1]
  const values = [rowCount, colCount]
  const cmds = addrs.map((addr, i) => ({ address: `0x${addr.toString(16)}`, value: values[i], ip }))

  // 发送Modbus写入命令
  window.electron.ipcRenderer.invoke('write-modbus-registers', cmds)

  // 由于Modbus写入是异步的，我们直接显示成功提示
  // 如果实际写入失败，用户会在后续的读取中看到错误
  toast.add({
    severity: 'success',
    summary: '下设成功',
    detail: `行列数已成功设置为 ${rowCount}×${colCount}`,
    life: 3000
  })

  // 下发行列数后，退出编辑状态
  isRowCountEditing.value = false
  isColCountEditing.value = false

  // 自动开始读取
  if (!isModuleReading.value) {
    startReading()
  }
}
/* const displayedData = computed(() => {
  const e = currentEntry.value
  // 先取对的表
  const rows = isCharge.value ? e.chargeTable : e.dischargeTable
  const rowCount = currentRowCount.value
  const colCount = currentColCount.value

  // slice 行，再 map 列
  return rows.slice(0, rowCount).map((r) => {
    const item = { rowTitle: r.rowTitle }
    for (let i = 1; i <= colCount; i++) {
      item[`C${i}`] = r[`C${i}`]
    }
    return item
  })
}) */
// 1) 定义
const displayedData = ref([])

// 2) 监听必要的值，构造“干净”的行对象
watch(
  [
    () => currentEntry.value.chargeTable,
    () => currentEntry.value.dischargeTable,
    () => currentRowCount.value,
    () => currentColCount.value,
    showCharge
  ],
  () => {
    const src = isCharge.value ? currentEntry.value.chargeTable : currentEntry.value.dischargeTable

    const rows = src.slice(0, currentRowCount.value)
    const cols = currentColCount.value

    displayedData.value = rows.map((r) => {
      // 确保 rowTitle 始终有
      const obj = { rowTitle: r.rowTitle ?? '' }
      // 为每一列都填一个默认值（如果原始 r 没有，就空字符串）
      for (let i = 1; i <= cols; i++) {
        const key = `C${i}`
        obj[key] = r[key] != null ? r[key] : ''
      }
      return obj
    })
  },
  { immediate: true }
)

// 动态列定义
const dynamicColumns = computed(() => {
  const e = currentEntry.value
  const colTitles = isCharge.value ? e.colTitlesChrg : e.colTitlesDis
  const colCount = currentColCount.value

  // 第一列行标题
  const cols = [{ field: 'rowTitle', header: isCharge.value ? '充电Map' : '放电Map' }]

  // 只 slice 出需要显示的列标题
  colTitles.slice(0, colCount).forEach((h, idx) => {
    cols.push({ field: `C${idx + 1}`, header: h })
  })
  return cols
})

// 处理 IPC 数据
function onData(_, payload) {
  const ip = payload.deviceIp || payload.ip
  if (!ip) return
  const Arg = payload.Arg || {}
  DataPowerMap[ip] = {
    sopRealtime: Arg.sopRealtime,
    // 表格数据
    chargeTable: Arg.chargeTable || [],
    dischargeTable: Arg.dischargeTable || [],
    // 已格式化标题
    colTitlesChrg: Arg.colTitlesChrg || [],
    rowTitlesChrg: Arg.rowTitlesChrg || [],
    colTitlesDis: Arg.colTitlesDis || [],
    rowTitlesDis: Arg.rowTitlesDis || [],
    // **新增** 原始三元组
    rawSocChrg: Arg.rawSocChrg || [],
    rawTempChrg: Arg.rawTempChrg || [],
    rawSocDis: Arg.rawSocDis || [],
    rawTempDis: Arg.rawTempDis || [],
    rowNum: Arg.rowNum || [],
    // **新增** 实时数据
    realtimeData: Arg.realtimeData || {
      tempMax1: null,
      tempMin1: null,
      clusterSOC: null,
      chargeSOP: null,
      dischargeSOP: null
    }
  }
  /*   console.log(DataPowerMap) */
  localStorage.setItem(`${IPC_CHANNEL}-${ip}`, JSON.stringify(DataPowerMap[ip]))
}

// 注册 IPC
function registerListener() {
  window.electron.ipcRenderer.removeAllListeners(IPC_CHANNEL)
  window.electron.ipcRenderer.on(IPC_CHANNEL, onData)
}

// 启停读取
function startReading() {
  window.electron.ipcRenderer.send('start-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}
function stopReading() {
  window.electron.ipcRenderer.send('stop-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
function toggleReading() {
  if (isModuleReading.value) {
    stopReading()
  } else {
    startReading()
  }
}
watch(
  () => ipStore.selectedIp,
  (ip) => {
    const cache = localStorage.getItem(`${IPC_CHANNEL}-${ip}`)
    if (cache) DataPowerMap[ip] = JSON.parse(cache)
  },
  { immediate: true }
)
// 移除对 importedEdit 的监听，因为不再需要处理行列数
onBeforeMount(() => {
  startReading()
  registerListener()
})
onBeforeUnmount(() => {
  if (isModuleReading.value) {
    stopReading()
  }
  window.electron.ipcRenderer.removeListener(IPC_CHANNEL, onData)
})
// track edits
const hasEdits = ref(false)
// 当输入框改变时，同步到 rawMap 并标记编辑
function onInlineEdit(rowData, field) {
  // 1. 标记已编辑
  hasEdits.value = true
  // 2. 找到当前 IP
  const ip = ipStore.selectedIp
  const entry = DataPowerMap[ip]
  if (!entry) return

  // 3. 根据 isCharge 拿到要修改的源数组
  const tableKey = isCharge.value ? 'chargeTable' : 'dischargeTable'
  const src = entry[tableKey]
  if (!Array.isArray(src)) return

  // 4. 找到这行在 displayedData 中的索引
  const rowIndex = displayedData.value.indexOf(rowData)
  if (rowIndex < 0 || rowIndex >= src.length) return

  // 5. 同步改动到原始数据
  src[rowIndex][field] = rowData[field]
}
// 辅助：根据 isCharge 参数获取 displayedData 的快照
function displayedDataFor(charge) {
  const src = charge ? currentEntry.value.chargeTable : currentEntry.value.dischargeTable
  const count = charge ? rowNumChrg.value : rowNumDis.value
  const cols = currentColCount.value
  return src.slice(0, count).map((r) => {
    const obj = { rowTitle: r.rowTitle }
    for (let i = 1; i <= cols; i++) {
      obj[`C${i}`] = r[`C${i}`] ?? ''
    }
    return obj
  })
}
async function onSendMap() {
  // 1. 校验功率表列值是否在0-1范围内
  const rows = displayedData.value
  const cols = currentColCount.value
  const invalidValues = []

  for (let r = 0; r < rows.length; r++) {
    for (let c = 1; c <= cols; c++) {
      const value = parseFloat(rows[r][`C${c}`] || '0')
      if (isNaN(value) || value < 0 || value > 1) {
        const rowTitle = rows[r].rowTitle || `第${r + 1}行`
        const colTitle = isCharge.value
          ? currentEntry.value.colTitlesChrg[c - 1] || `第${c}列`
          : currentEntry.value.colTitlesDis[c - 1] || `第${c}列`
        invalidValues.push(
          `${rowTitle} ${colTitle}: ${rows[r][`C${c}`]} (${isNaN(value) ? '非数字' : '超出0-1范围'})`
        )
      }
    }
  }

  if (invalidValues.length > 0) {
    toast.add({
      severity: 'error',
      summary: '功率表下设失败：数据校验不通过',
      detail: `以下数据超出0-1范围：\n${invalidValues.slice(0, 5).join('\n')}${invalidValues.length > 5 ? `\n... 还有${invalidValues.length - 5}个错误` : ''}`,
      life: 10000
    })
    return
  }

  // 2. 构造要写入的"每行命令"模板
  const firstRowAddr = isCharge.value ? 0x54c6 : 0x55c7
  const rowOffset = 0x10 // 每行跳 16 寄存器
  // 为 charge/discharge 分别构造 rows+baseAddr
  const tables = [
    {
      kind: 'charge',
      firstRowAddr: 0x54c6,
      rows: displayedDataFor(true) // 下方辅助函数
    },
    {
      kind: 'discharge',
      firstRowAddr: 0x55c7,
      rows: displayedDataFor(false)
    }
  ]
  // 2. 取目标 IP 列表
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]

  // 3. 提示“正在写入哪些设备”
  toast.add({
    severity: 'info',
    summary: t('powerMap.toast.writingDevices', { devices: targets.join('，') }),
    detail: targets.join('，'),
    life: 3000
  })

  // 5. 并行对每台 IP 执行：针对两张表，依次写寄存器
  const results = await Promise.all(
    targets.map(async (ip) => {
      try {
        for (const { rows, firstRowAddr } of tables) {
          for (let r = 0; r < rows.length; r++) {
            const base = firstRowAddr + r * rowOffset
            const cmds = []
            for (let c = 1; c <= cols; c++) {
              const rawVal = Math.round(parseFloat(rows[r][`C${c}`] || '0') * 1000)
              const addr = base + (c - 1)
              cmds.push({ address: `0x${addr.toString(16)}`, value: rawVal, ip })
            }
            // 一行一批下发
            await window.electron.ipcRenderer.invoke('write-modbus-registers', cmds)
          }
        }
        return { ip, success: true }
      } catch (err) {
        return { ip, success: false, error: err.message }
      }
    })
  )

  // 6. 区分成功/失败，Toast 反馈
  const ok = results.filter((r) => r.success).map((r) => r.ip)
  const fail = results.filter((r) => !r.success).map((r) => r.ip)

  if (ok.length) {
    toast.add({
      severity: 'success',
      summary: t('powerMap.toast.writeSuccess', { devices: ok.join('，') }),
      life: 3000
    })

    // 下设成功后自动读取数据
    setTimeout(() => {
      startReading()
    }, 100)
  }
  if (fail.length) {
    toast.add({
      severity: 'error',
      summary: t('powerMap.toast.writeFail', { devices: fail.join('，') }),
      life: 3000
    })
  }
  hasEdits.value = false
}
// —— 编辑器状态 ——
const editor = reactive({
  visible: false,
  isRow: false, // 是行标题还是列标题
  idx: 0, // 第几行/第几列
  cmp1: null,
  val: null,
  cmp2: null,
  prevVal: null,
  prevCmp2: null
})
// 当前要编辑的标题字符串 —— 一定要从格式化后的标题里取！
const currentTitle = computed(() => {
  if (!editor.visible) return ''
  const titles = editor.isRow
    ? isCharge.value
      ? currentEntry.value.rowTitlesChrg
      : currentEntry.value.rowTitlesDis
    : isCharge.value
      ? currentEntry.value.colTitlesChrg
      : currentEntry.value.colTitlesDis
  /*   console.log('[PowerMap] currentTitle:', titles, ' idx=', editor.idx) */
  return titles[editor.idx] || ''
})
function signed16(v) {
  return v & 0x8000 ? v - 0x10000 : v
}

// 校验整行/整列标题范围是否严格递增
function validateTitleBoundaries(isRow, currentIdx, newValue) {
  // 获取当前的原始数据数组
  const raw = isCharge.value
    ? isRow
      ? currentEntry.value.rawTempChrg
      : currentEntry.value.rawSocChrg
    : isRow
      ? currentEntry.value.rawTempDis
      : currentEntry.value.rawSocDis

  if (!raw || raw.length === 0) {
    return { valid: true }
  }

  const titleType = isRow
    ? isCharge.value
      ? '充电行标题(温度)'
      : '放电行标题(温度)'
    : isCharge.value
      ? '充电列标题(SOC)'
      : '放电列标题(SOC)'

  // 获取当前行列数，确定有效的标题数量
  const maxTitles = isRow
    ? isCharge.value
      ? rowNumChrg.value
      : rowNumDis.value
    : isCharge.value
      ? colNumChrg.value
      : colNumDis.value

  // 构建完整的序列（包含当前修改）
  const sequence = []
  for (let i = 0; i < Math.min(maxTitles, 16); i++) {
    const base = i * 3
    if (base + 1 < raw.length) {
      let value
      if (i === currentIdx) {
        // 使用新值
        value = newValue
      } else {
        // 使用现有值
        const rawVal = raw[base + 1]
        value = rawVal !== undefined && rawVal !== null ? signed16(rawVal) / 10 : null
      }

      if (value !== null) {
        sequence.push({ index: i, value: value })
      }
    }
  }

  // 检查序列是否严格递增
  for (let i = 0; i < sequence.length - 1; i++) {
    const current = sequence[i]
    const next = sequence[i + 1]

    if (current.value >= next.value) {
      // 找出具体的冲突位置
      let conflictDescription
      if (current.index === currentIdx) {
        conflictDescription = `当前设置的第${currentIdx + 1}个标题右边界值(${current.value})大于等于第${next.index + 1}个标题的右边界值(${next.value})`
      } else if (next.index === currentIdx) {
        conflictDescription = `当前设置的第${currentIdx + 1}个标题右边界值(${next.value})小于等于第${current.index + 1}个标题的右边界值(${current.value})`
      } else {
        conflictDescription = `第${current.index + 1}个标题的右边界值(${current.value})大于等于第${next.index + 1}个标题的右边界值(${next.value})`
      }

      return {
        valid: false,
        message: `${titleType}序列必须严格递增。${conflictDescription}，违反了递增规则。`
      }
    }
  }

  return { valid: true }
}

// 校验编辑器修改是否会导致标题范围无效
function validateTitleBoundariesWithModifications(isRow, modifications) {
  // 获取当前的原始数据数组
  const raw = isCharge.value
    ? isRow
      ? currentEntry.value.rawTempChrg
      : currentEntry.value.rawSocChrg
    : isRow
      ? currentEntry.value.rawTempDis
      : currentEntry.value.rawSocDis

  if (!raw || raw.length === 0) {
    return { valid: true }
  }

  const titleType = isRow
    ? isCharge.value
      ? '充电行标题(温度)'
      : '放电行标题(温度)'
    : isCharge.value
      ? '充电列标题(SOC)'
      : '放电列标题(SOC)'

  // 获取当前行列数，确定有效的标题数量
  const maxTitles = isRow
    ? isCharge.value
      ? rowNumChrg.value
      : rowNumDis.value
    : isCharge.value
      ? colNumChrg.value
      : colNumDis.value

  // 构建修改映射 - modifications中包含受影响标题的右边界值
  const rightBoundaryMap = new Map()
  modifications.forEach((mod) => {
    rightBoundaryMap.set(mod.index, mod.value)
  })

  // 构建完整的标题序列，检查每个标题的左右边界值
  const titleRanges = []
  for (let i = 0; i < Math.min(maxTitles, 16); i++) {
    const base = i * 3
    if (base + 1 < raw.length) {
      // 获取右边界值（可能被修改）
      let rightBoundary
      if (rightBoundaryMap.has(i)) {
        rightBoundary = rightBoundaryMap.get(i)
      } else {
        const rawVal = raw[base + 1]
        rightBoundary = rawVal !== undefined && rawVal !== null ? signed16(rawVal) / 10 : null
      }

      // 获取左边界值
      let leftBoundary
      if (i === 0) {
        // 第一个标题的左边界是固定的
        leftBoundary = isRow ? -40 : 0
      } else {
        // 当前标题的左边界 = 前一个标题的右边界（共享同一个值）
        leftBoundary = titleRanges[i - 1]?.rightBoundary ?? null
      }

      if (rightBoundary !== null && leftBoundary !== null) {
        titleRanges.push({
          index: i,
          leftBoundary,
          rightBoundary,
          isModified: rightBoundaryMap.has(i)
        })
      }
    }
  }

  // 检查每个标题的内部有效性（左边界 < 右边界）
  for (const title of titleRanges) {
    if (title.leftBoundary >= title.rightBoundary) {
      let errorDescription
      if (title.isModified) {
        errorDescription = `修改导致第${title.index + 1}个标题的左边界值(${title.leftBoundary})大于等于右边界值(${title.rightBoundary})`
      } else {
        // 这个标题本身没被修改，但右边界值受到了下一个标题修改的影响
        errorDescription = `第${title.index + 1}个标题的左值(${title.leftBoundary})大于等于了修改后的右值(${title.rightBoundary})`
      }

      return {
        valid: false,
        message: `${titleType}标题范围无效。${errorDescription}，标题范围必须是有效的。`
      }
    }
  }

  return { valid: true }
}

// 点击表头时弹出编辑器
function onHeaderClick(isRow, idx) {
  const raw = isCharge.value
    ? isRow
      ? currentEntry.value.rawTempChrg
      : currentEntry.value.rawSocChrg
    : isRow
      ? currentEntry.value.rawTempDis
      : currentEntry.value.rawSocDis
  /*   console.log(raw) */
  // 三元组起始偏移
  const base = idx * 3
  editor.isRow = isRow
  editor.idx = idx
  // 提取原始值
  editor.cmp1 = raw[base + 0]
  const rawVal = raw[base + 1]
  editor.val = signed16(rawVal) / 10
  editor.cmp2 = raw[base + 2]
  if (idx === 0) {
    // 行和列都使用 ≤
    editor.cmp2 = 4 // '≤'
  }
  // **新增：前一个阈值（只有 idx>0 才可编辑）**
  if (idx > 0) {
    const prevRawVal = raw[(idx - 1) * 3 + 1]
    const prevRawCmp2 = raw[(idx - 1) * 3 + 2]
    editor.prevVal = signed16(prevRawVal) / 10
    editor.prevCmp2 = prevRawCmp2
  } else {
    editor.prevVal = isRow ? -40 : 0
    editor.prevCmp2 = null
  }
  editor.visible = true
}

// 确认下设
async function onEditorConfirm() {
  const ip = ipStore.selectedIp
  const e = editor

  // 1. 校验数值范围（SOC和T参数以及比较符都是固定的，不需要校验）
  const titleType = e.isRow
    ? isCharge.value
      ? '充电行标题'
      : '放电行标题'
    : isCharge.value
      ? '充电列标题'
      : '放电列标题'

  // 校验数值范围：前一个值必须小于后一个值
  const prevNum = parseFloat(e.prevVal)
  const valNum = parseFloat(e.val)
  if (prevNum >= valNum) {
    toast.add({
      severity: 'error',
      summary: `范围错误：${titleType}第${e.idx + 1}个标题范围不正确`,
      detail: `前一个值(${e.prevVal})应小于后一个值(${e.val})`,
      life: 10000
    })
    return
  }

  // 2. 新增：校验整行/整列标题序列是否严格递增
  // 需要同时考虑当前值和前一个值的修改对整个序列的影响
  const modifications = [{ index: e.idx, value: valNum }]
  if (e.idx > 0) {
    // 当前标题的左值(e.prevVal)会自动成为上一个标题的右值
    // 需要检查这是否会导致上一个标题的左值 >= 右值
    modifications.push({ index: e.idx - 1, value: parseFloat(e.prevVal) })
  }

  const validationResult = validateTitleBoundariesWithModifications(e.isRow, modifications)
  if (!validationResult.valid) {
    toast.add({
      severity: 'error',
      summary: `序列校验失败：${titleType}范围必须严格递增`,
      detail: validationResult.message,
      life: 10000
    })
    return
  }

  try {
    // 2. 写寄存器：地址计算
    //    socChrg:0x5406, tempChrg:0x5436, socDis:0x5466, tempDis:0x5496
    const baseAddr = e.isRow ? (isCharge.value ? 0x5436 : 0x5496) : isCharge.value ? 0x5406 : 0x5466
    const cmds = []
    // 1) 如果 idx>0，需要先下发"上一个阈值"寄存器
    if (e.idx > 0) {
      const prevValAddr = baseAddr + (e.idx - 1) * 3 + 1
      const prevCmp2Addr = baseAddr + (e.idx - 1) * 3 + 2
      cmds.push(
        { address: `0x${prevValAddr.toString(16)}`, value: Math.round(e.prevVal * 10), ip },
        { address: `0x${prevCmp2Addr.toString(16)}`, value: e.prevCmp2, ip }
      )
    }
    // —— 然后写当前这一列的三个寄存器 ——
    const addr = baseAddr + e.idx * 3
    cmds.push(
      { address: `0x${addr.toString(16)}`, value: e.cmp1, ip },
      { address: `0x${(addr + 1).toString(16)}`, value: Math.round(e.val * 10), ip },
      { address: `0x${(addr + 2).toString(16)}`, value: e.cmp2, ip }
    )

    // 发送写寄存器 IPC：三个寄存器一次下设
    await window.electron.ipcRenderer.invoke('write-modbus-registers', cmds)

    // 3. 下设成功后关闭编辑器并自动读取数据
    editor.visible = false

    // 显示成功提示
    toast.add({
      severity: 'success',
      summary: `${titleType}下设成功`,
      detail: `已更新第${e.idx + 1}个标题`,
      life: 5000
    })

    // 自动触发数据读取
    setTimeout(() => {
      startReading()
    }, 100)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: `${titleType}下设失败`,
      detail: `错误信息：${error.message}`,
      life: 10000
    })
  }
}
async function onExportCsv() {
  const ip = ipStore.selectedIp
  const data = currentEntry.value

  // ——— 只导出实际行列数的充放功率表格数据 ———
  // 1. 充电功率表格 - 根据实际行列数截取
  const chargeRows = data.chargeTable.slice(0, currentRowCount.value)
  const chargeCols = data.colTitlesChrg.slice(0, currentColCount.value)
  const tableCh = chargeRows.map((r) => [
    "'" + r.rowTitle,
    ...chargeCols.map((_, idx) => r[`C${idx + 1}`])
  ])
  const csvTableCh = Papa.unparse([['rowTitle', ...chargeCols], ...tableCh])

  // 2. 放电功率表格 - 根据实际行列数截取
  const dischargeRows = data.dischargeTable.slice(0, currentRowCount.value)
  const dischargeCols = data.colTitlesDis.slice(0, currentColCount.value)
  const tableDis = dischargeRows.map((r) => [
    "'" + r.rowTitle,
    ...dischargeCols.map((_, idx) => r[`C${idx + 1}`])
  ])
  const csvTableDis = Papa.unparse([['rowTitle', ...dischargeCols], ...tableDis])

  // ——— 拼接表格数据区块，并加 BOM ———
  const sections = ['---TABLE-CHRG---', csvTableCh, '---TABLE-DISCHRG---', csvTableDis]
  const fullCsv = '\uFEFF' + sections.join('\n') + '\n'

  // ——— 通过 IPC 导出 ———
  const fileName = `PowerMap_${ip}_${formatFileSuffix(new Date())}.csv`
  try {
    const savedPath = await window.electron.ipcRenderer.invoke('exportParam-csv-powerMap', {
      csv: fullCsv,
      fileName
    })
    toast.add({
      severity: 'success',
      summary: t('powerMap.toast.exportSuccessSummary'),
      detail: t('powerMap.toast.exportSuccessDetail', { path: savedPath }),
      life: 10000
    })
  } catch (err) {
    if (err.message.includes('用户取消导出')) {
      toast.add({
        severity: 'info',
        summary: t('powerMap.toast.exportCanceled'),
        life: 3000
      })
    } else {
      // 其它错误只给英文 key 或本地化 key，不显示 err.message
      toast.add({
        severity: 'error',
        summary: t('powerMap.toast.exportError', { error: err.message }),
        life: 10000
      })
    }
  }
}

// 点击“导入配置”按钮
function triggerImport() {
  importValid.value = false
  fileInput.value.value = null
  fileInput.value.click()
}
async function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const text = await file.text()

  // 1) 按行拆分（兼容 Windows/Mac/Linux）
  const lines = text.split(/\r?\n/)

  const blocks = {
    'TABLE-CHRG': [],
    'TABLE-DISCHRG': []
  }
  let current = null

  for (let raw of lines) {
    const line = raw.trim()
    if (line.startsWith('---TABLE-CHRG---')) {
      current = 'TABLE-CHRG'
      continue
    }
    if (line.startsWith('---TABLE-DISCHRG---')) {
      current = 'TABLE-DISCHRG'
      continue
    }
    // 非 marker 行，且我们正处于一个区块，就收集
    if (current && line) {
      blocks[current].push(line)
    }
  }

  // 2) 校验必需区块都存在
  for (const key of Object.keys(blocks)) {
    if (!blocks[key].length) {
      toast.add({
        severity: 'error',
        summary: t('powerMap.toast.csvMissingBlock', { block: key }),
        life: 10000
      })
      importValid.value = false
      return
    }
  }

  // 3) 解析表格数据：注意 Excel 导出的文件用制表符分隔
  const opts = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    // 如果 header.trim() 之后是空，就给它一个基于索引的唯一名字
    transformHeader: (h, idx) => {
      const t = h.trim()
      return t.length > 0 ? t : `_col${idx}`
    }
  }

  const parsedChrg = Papa.parse(blocks['TABLE-CHRG'].join('\n'), opts)
  const parsedDis = Papa.parse(blocks['TABLE-DISCHRG'].join('\n'), opts)

  // 4) 校验表格数据：至少一行，每行首列字符串，其余列数字且在0-1范围内
  const checkTableBlock = (lines, key) => {
    const rows = lines.map((l) => l.split(/\t|,/))
    if (rows.length < 2) {
      toast.add({
        severity: 'error',
        summary: t('powerMap.toast.csvTableNeedHeader', { block: key }),
        life: 10000
      })
      return false
    }
    // 跳过 rows[0] (表头)
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i]
      // 强制转换首列为字符串，并移除可能的单引号前缀
      let firstCol = String(cols[0])
      if (firstCol.startsWith("'")) {
        firstCol = firstCol.slice(1)
      }

      // 检查首列是否为空
      if (firstCol.trim() === '') {
        toast.add({
          severity: 'error',
          summary: t('powerMap.toast.csvTableRowFormat', { block: key, line: i + 1 }),
          detail: `第${i + 1}行首列为空`,
          life: 8000
        })
        return false
      }

      // 检查其他列是否为数字且在0-1范围内
      const invalidCols = []

      for (let j = 1; j < cols.length; j++) {
        const num = Number(cols[j])

        if (isNaN(num) || num < 0 || num > 1) {
          invalidCols.push(`第${j + 1}列：${cols[j]}（${isNaN(num) ? '非数字' : '超出0-1范围'}）`)
        }
      }

      if (invalidCols.length > 0) {
        toast.add({
          severity: 'error',
          summary: `TABLE-${key} 区块第 ${i + 1} 行格式错误`,
          detail: `第${i + 1}行数据错误：${invalidCols.join('；')}`,
          life: 8000
        })
        return false
      }
    }
    return true
  }

  if (
    !checkTableBlock(blocks['TABLE-CHRG'], 'TABLE-CHRG') ||
    !checkTableBlock(blocks['TABLE-DISCHRG'], 'TABLE-DISCHRG')
  ) {
    importValid.value = false
    return
  }

  // 5) 过滤空列函数
  function stripEmptyCols(rows) {
    return rows.map((row) => {
      const o = {}
      Object.entries(row).forEach(([k, v]) => {
        if (k && !k.startsWith('_')) o[k] = v
      })
      return o
    })
  }

  // 6) 校验行列标题格式
  const rawChrg = stripEmptyCols(parsedChrg.data)
  const fieldsCh = parsedChrg.meta.fields.filter((f) => f && !f.startsWith('_col'))
  const rawDis = stripEmptyCols(parsedDis.data)
  const fieldsDis = parsedDis.meta.fields.filter((f) => f && !f.startsWith('_'))

  // 校验列标题格式（SOC）- 只校验前12列
  const colTitlesChrg = fieldsCh.slice(1)
  const colTitlesDis = fieldsDis.slice(1)
  if (
    !validateHeaders(colTitlesChrg, false, '充电列标题', 12) ||
    !validateHeaders(colTitlesDis, false, '放电列标题', 12)
  ) {
    importValid.value = false
    return
  }

  // 校验行标题格式（T）- 充电表格校验前11行，放电表格校验前14行
  const rowTitlesChrg = rawChrg.map((r) => r.rowTitle)
  const rowTitlesDis = rawDis.map((r) => r.rowTitle)
  if (
    !validateHeaders(rowTitlesChrg, true, '充电行标题', 11) ||
    !validateHeaders(rowTitlesDis, true, '放电行标题', 14)
  ) {
    importValid.value = false
    return
  }

  // 7) 全部校验通过，调用 applyImportedCsv
  applyImportedCsv({
    charge: { data: rawChrg, fields: fieldsCh },
    discharge: { data: rawDis, fields: fieldsDis }
  })
  importValid.value = true
  toast.add({ severity: 'success', summary: t('powerMap.toast.importSuccess'), life: 10000 })
}
// 移除 importedEdit，因为不再需要处理行列数

// 新增：校验行列标题格式
function validateHeaders(titles, isRow, titleType, maxCount = 16) {
  const expectedParam = isRow ? 'T' : 'SOC'
  const allowedOperators = ['<', '≤']

  // 只校验指定范围内的标题
  const checkCount = Math.min(titles.length, maxCount)

  for (let i = 0; i < checkCount; i++) {
    let title = titles[i].trim()

    // 跳过空标题
    if (!title) continue

    // 移除可能存在的单引号前缀
    if (title.startsWith("'")) {
      title = title.slice(1)
    }

    // 校验格式：数字 比较符 参数 比较符 数字（支持负数）
    const match = title.match(/^(-?\d+(?:\.\d+)?)([<>=≤≥]+)([A-Z]+)([<>=≤≥]+)(-?\d+(?:\.\d+)?)$/)

    if (!match) {
      toast.add({
        severity: 'error',
        summary: `格式错误：${titleType}第${i + 1}个标题格式错误`,
        detail: `出错值：${titles[i]}，正确格式应为：数字${isRow ? '<T<数字' : '≤SOC<数字'}`,
        life: 10000
      })
      return false
    }

    const [, prevVal, cmp2, param, cmp1, val] = match

    // 校验参数类型
    if (param !== expectedParam) {
      toast.add({
        severity: 'error',
        summary: `参数错误：${titleType}第${i + 1}个标题参数应为${expectedParam}`,
        detail: `出错值：${titles[i]}，当前参数：${param}，应为：${expectedParam}`,
        life: 10000
      })
      return false
    }

    // 校验比较符
    if (!allowedOperators.includes(cmp1) || !allowedOperators.includes(cmp2)) {
      toast.add({
        severity: 'error',
        summary: `比较符错误：${titleType}第${i + 1}个标题比较符不正确`,
        detail: `出错值：${titles[i]}，只允许使用 < 或 ≤，当前使用：${cmp1}, ${cmp2}`,
        life: 10000
      })
      return false
    }

    // 校验数值范围
    const prevNum = parseFloat(prevVal)
    const valNum = parseFloat(val)

    if (prevNum >= valNum) {
      toast.add({
        severity: 'error',
        summary: `范围错误：${titleType}第${i + 1}个标题范围不正确`,
        detail: `出错值：${titles[i]}，前一个值(${prevVal})应小于后一个值(${val})`,
        life: 10000
      })
      return false
    }
  }

  return true
}

// 新增：将格式化的标题转换为原始数据格式
function convertTitlesToRaw(titles, isRow) {
  const CMP_MAP = ['>', '=', '<', '≥', '≤']
  const raw = []

  for (let i = 0; i < 16; i++) {
    if (i < titles.length) {
      const title = titles[i]
      // 解析标题格式，例如 "0<=SOC<20" 或 "-40<T<=-20"
      const match = title.match(/^(\d+(?:\.\d+)?)([<>=≤≥]+)(?:T|SOC)([<>=≤≥]+)(\d+(?:\.\d+)?)$/)

      if (match) {
        const [, prevVal, cmp2, cmp1, val] = match
        const rawVal = Math.round(parseFloat(val) * 10)
        const rawPrevVal = Math.round(parseFloat(prevVal) * 10)

        // 转换为有符号16位
        const signedVal = rawVal < 0 ? rawVal + 65536 : rawVal
        const signedPrevVal = rawPrevVal < 0 ? rawPrevVal + 65536 : rawPrevVal

        raw[i * 3] = CMP_MAP.indexOf(cmp1)
        raw[i * 3 + 1] = signedVal
        raw[i * 3 + 2] = CMP_MAP.indexOf(cmp2)

        // 如果不是第一行/列，还需要设置前一个值
        if (i > 0) {
          raw[(i - 1) * 3 + 1] = signedPrevVal
          raw[(i - 1) * 3 + 2] = CMP_MAP.indexOf(cmp2)
        }
      } else {
        // 如果解析失败，使用默认值
        raw[i * 3] = 0
        raw[i * 3 + 1] = 0
        raw[i * 3 + 2] = 0
      }
    } else {
      // 填充空值
      raw[i * 3] = 0
      raw[i * 3 + 1] = 0
      raw[i * 3 + 2] = 0
    }
  }

  return raw
}

function applyImportedCsv({ charge, discharge }) {
  const ip = ipStore.selectedIp

  // 1. 充电表格处理
  const colTitlesChrg = charge.fields.slice(1)
  const chargeTable = charge.data.map((r) => {
    const title = r.rowTitle.startsWith("'") ? r.rowTitle.slice(1) : r.rowTitle
    const row = { rowTitle: title }
    colTitlesChrg.forEach((h, idx) => {
      row[`C${idx + 1}`] = r[h]
    })
    return row
  })

  // 2. 放电表格处理
  const colTitlesDis = discharge.fields.slice(1)
  const dischargeTable = discharge.data.map((r) => {
    const title = r.rowTitle.startsWith("'") ? r.rowTitle.slice(1) : r.rowTitle
    const row = { rowTitle: title }
    colTitlesDis.forEach((h, idx) => {
      row[`C${idx + 1}`] = r[h]
    })
    return row
  })

  // 3. 将格式化的标题转换为原始数据
  const rowTitlesChrg = chargeTable.map((r) => r.rowTitle)
  const rowTitlesDis = dischargeTable.map((r) => r.rowTitle)

  const rawSocChrg = convertTitlesToRaw(colTitlesChrg, false)
  const rawTempChrg = convertTitlesToRaw(rowTitlesChrg, true)
  const rawSocDis = convertTitlesToRaw(colTitlesDis, false)
  const rawTempDis = convertTitlesToRaw(rowTitlesDis, true)

  // 4. 更新 DataPowerMap，包含表格数据和原始标题数据
  DataPowerMap[ip] = {
    ...currentEntry.value,
    colTitlesChrg,
    rowTitlesChrg,
    chargeTable,
    rawSocChrg,
    rawTempChrg,
    colTitlesDis,
    rowTitlesDis,
    dischargeTable,
    rawSocDis,
    rawTempDis
  }
  localStorage.setItem(`${IPC_CHANNEL}-${ip}`, JSON.stringify(DataPowerMap[ip]))
}
// --- 修改方法 onWriteAll，写入表格数据和行列表头数据 ---
async function onWriteAll() {
  if (!importValid.value) {
    toast.add({ severity: 'warn', summary: t('powerMap.toast.importValidWarn'), life: 3000 })
    return
  }
  const ip = ipStore.selectedIp
  const data = currentEntry.value
  const targets = ipStore.selectedIpsForWrite.length ? ipStore.selectedIpsForWrite : [ip]

  toast.add({ severity: 'info', summary: t('powerMap.toast.writeConfigStart'), life: 3000 })
  const results = await Promise.all(
    targets.map(async (ip) => {
      try {
        // 1. 先写入行列表头数据
        await writeHeaders(data, ip)
        // 2. 再写入充放功率表格数据
        await onSendMap()
        return { ip, success: true }
      } catch (err) {
        return { ip, success: false, error: err.message }
      }
    })
  )

  // Toast 成果
  const ok = results.filter((r) => r.success).map((r) => r.ip)
  const fail = results.filter((r) => !r.success).map((r) => r.ip)
  if (ok.length)
    toast.add({
      severity: 'success',
      summary: t('powerMap.toast.writeSuccess', { devices: ok.join('，') }),
      life: 10000
    })
  if (fail.length)
    toast.add({
      severity: 'error',
      summary: t('powerMap.toast.writeFail', { devices: fail.join('，') }),
      life: 10000
    })
}

// 新增：写入行列表头数据的函数
async function writeHeaders(data, ip) {
  const MAX_ROWNUM = 16

  // 1. 写入充电列标题（SOC）- 地址 0x5406
  const socChrgCmds = []
  for (let i = 0; i < MAX_ROWNUM; i++) {
    const baseAddr = 0x5406 + i * 3
    const rawData = data.rawSocChrg || []
    if (rawData[i * 3] !== undefined) {
      socChrgCmds.push(
        { address: `0x${baseAddr.toString(16)}`, value: rawData[i * 3], ip },
        { address: `0x${(baseAddr + 1).toString(16)}`, value: rawData[i * 3 + 1], ip },
        { address: `0x${(baseAddr + 2).toString(16)}`, value: rawData[i * 3 + 2], ip }
      )
    }
  }

  // 2. 写入充电行标题（温度）- 地址 0x5436
  const tempChrgCmds = []
  for (let i = 0; i < MAX_ROWNUM; i++) {
    const baseAddr = 0x5436 + i * 3
    const rawData = data.rawTempChrg || []
    if (rawData[i * 3] !== undefined) {
      tempChrgCmds.push(
        { address: `0x${baseAddr.toString(16)}`, value: rawData[i * 3], ip },
        { address: `0x${(baseAddr + 1).toString(16)}`, value: rawData[i * 3 + 1], ip },
        { address: `0x${(baseAddr + 2).toString(16)}`, value: rawData[i * 3 + 2], ip }
      )
    }
  }

  // 3. 写入放电列标题（SOC）- 地址 0x5466
  const socDisCmds = []
  for (let i = 0; i < MAX_ROWNUM; i++) {
    const baseAddr = 0x5466 + i * 3
    const rawData = data.rawSocDis || []
    if (rawData[i * 3] !== undefined) {
      socDisCmds.push(
        { address: `0x${baseAddr.toString(16)}`, value: rawData[i * 3], ip },
        { address: `0x${(baseAddr + 1).toString(16)}`, value: rawData[i * 3 + 1], ip },
        { address: `0x${(baseAddr + 2).toString(16)}`, value: rawData[i * 3 + 2], ip }
      )
    }
  }

  // 4. 写入放电行标题（温度）- 地址 0x5496
  const tempDisCmds = []
  for (let i = 0; i < MAX_ROWNUM; i++) {
    const baseAddr = 0x5496 + i * 3
    const rawData = data.rawTempDis || []
    if (rawData[i * 3] !== undefined) {
      tempDisCmds.push(
        { address: `0x${baseAddr.toString(16)}`, value: rawData[i * 3], ip },
        { address: `0x${(baseAddr + 1).toString(16)}`, value: rawData[i * 3 + 1], ip },
        { address: `0x${(baseAddr + 2).toString(16)}`, value: rawData[i * 3 + 2], ip }
      )
    }
  }

  // 批量写入所有标题数据
  if (socChrgCmds.length > 0) {
    await window.electron.ipcRenderer.invoke('write-modbus-registers', socChrgCmds)
  }
  if (tempChrgCmds.length > 0) {
    await window.electron.ipcRenderer.invoke('write-modbus-registers', tempChrgCmds)
  }
  if (socDisCmds.length > 0) {
    await window.electron.ipcRenderer.invoke('write-modbus-registers', socDisCmds)
  }
  if (tempDisCmds.length > 0) {
    await window.electron.ipcRenderer.invoke('write-modbus-registers', tempDisCmds)
  }
}
</script>

<style lang="less" scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.realtime-panel {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  flex-wrap: wrap;
}
.realtime-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  min-width: fit-content;
}
.realtime-item label {
  font-weight: 500;
  white-space: nowrap;
  font-size: 0.9rem;
}
.realtime-value {
  color: #007bff;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  text-align: center;
  white-space: nowrap;
  min-width: 3rem;
}
.rownum-panel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.rownum-panel label {
  white-space: nowrap;
  font-size: 0.9rem;
}
.rownum-panel .p-inputtext {
  min-width: 4rem;
  max-width: 6rem;
}
.rownum-panel small {
  width: 100%;
  font-size: 0.85rem;
}
.center-table {
  text-align: center;
}
.clickable-header {
  cursor: pointer;
  text-decoration: underline;
  color: var(--primary-color);
}
.highlight-sop-cell {
  background-color: #ffe066 !important;
  border: 2px solid #ff9800 !important;
  color: #000 !important;
  font-weight: bold;
}

/* 优化列值完整显示 */
.center-table .p-datatable-table {
  table-layout: auto;
  min-width: max-content;
}

.center-table .p-datatable-tbody > tr > td {
  padding: 0.25rem;
  white-space: nowrap;
  min-width: 4rem;
}

.center-table .p-datatable-thead > tr > th {
  padding: 0.25rem;
  white-space: nowrap;
  min-width: 4rem;
  font-size: 0.9rem;
}

/* 输入框样式优化 */
.center-table .p-inputtext {
  width: 100%;
  min-width: 3.5rem;
  border: none;
  background: transparent;
  text-align: center;
  padding: 0.25rem;
}

/* ========== 响应式优化（不修改原有样式）========== */
/* 确保按钮和下拉框文字不换行 */
.toolbar :deep(.p-button) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar :deep(.p-dropdown) {
  min-width: fit-content;
}

/* Dialog 表单支持自适应 */
:deep(.p-dialog .p-fluid) {
  flex-wrap: wrap;
}

:deep(.p-dialog .p-fluid .p-inputtext),
:deep(.p-dialog .p-fluid .p-dropdown) {
  min-width: 3rem;
  flex-shrink: 0;
}

/* 表格容器防止溢出 */
.center-table {
  overflow-x: auto;
  max-width: 100%;
}

.center-table :deep(.p-datatable-wrapper) {
  overflow-x: auto;
}

/* 高缩放比例优化 - 125% */
@media (min-resolution: 120dpi) and (max-resolution: 144dpi) {
  .realtime-item label {
    font-size: 0.85rem;
  }
  
  .realtime-value {
    font-size: 0.9rem;
    min-width: 2.5rem;
  }
  
  .rownum-panel label {
    font-size: 0.85rem;
  }
  
  .center-table .p-datatable-thead > tr > th {
    font-size: 0.85rem;
    min-width: 3.5rem;
  }
}

/* 高缩放比例优化 - 150% */
@media (min-resolution: 145dpi) and (max-resolution: 168dpi) {
  .toolbar {
    gap: 0.4rem;
  }
  
  .toolbar :deep(.p-button) {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
  }
  
  .toolbar :deep(.p-dropdown) {
    font-size: 0.85rem;
  }
  
  .realtime-panel {
    gap: 0.75rem;
  }
  
  .realtime-item label {
    font-size: 0.8rem;
  }
  
  .realtime-value {
    font-size: 0.85rem;
    min-width: 2.5rem;
    padding: 0.2rem 0.4rem;
  }
  
  .rownum-panel {
    gap: 0.4rem;
  }
  
  .rownum-panel label {
    font-size: 0.8rem;
  }
  
  .rownum-panel .p-inputtext {
    min-width: 3.5rem;
    max-width: 5rem;
  }
  
  .center-table .p-datatable-thead > tr > th,
  .center-table .p-datatable-tbody > tr > td {
    min-width: 3.5rem;
    font-size: 0.85rem;
  }
  
  .center-table .p-inputtext {
    min-width: 3rem;
    font-size: 0.85rem;
  }
}

/* 超高缩放比例优化 - 175%+ */
@media (min-resolution: 169dpi) {
  .toolbar {
    gap: 0.35rem;
    margin-bottom: 0.4rem;
  }
  
  .toolbar :deep(.p-button) {
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
  }
  
  .toolbar :deep(.p-dropdown) {
    min-width: 7rem;
    font-size: 0.8rem;
  }
  
  .realtime-panel {
    gap: 0.5rem;
    padding: 0.75rem;
  }
  
  .realtime-item {
    gap: 0.4rem;
  }
  
  .realtime-item label {
    font-size: 0.75rem;
  }
  
  .realtime-value {
    font-size: 0.8rem;
    min-width: 2rem;
    padding: 0.2rem 0.3rem;
  }
  
  .rownum-panel {
    gap: 0.35rem;
  }
  
  .rownum-panel label {
    font-size: 0.75rem;
  }
  
  .rownum-panel .p-inputtext {
    min-width: 3rem;
    max-width: 4.5rem;
    font-size: 0.85rem;
  }
  
  .rownum-panel small {
    font-size: 0.75rem;
  }
  
  .center-table .p-datatable-thead > tr > th {
    font-size: 0.8rem;
    min-width: 3rem;
    padding: 0.2rem;
  }
  
  .center-table .p-datatable-tbody > tr > td {
    min-width: 3rem;
    padding: 0.2rem;
  }
  
  .center-table .p-inputtext {
    min-width: 2.5rem;
    font-size: 0.8rem;
  }
}

/* 响应式屏幕宽度调整 */
@media (max-width: 1400px) {
  .toolbar :deep(.p-button) {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
  }
  
  .realtime-panel {
    gap: 0.75rem;
  }
  
  .realtime-item label {
    font-size: 0.85rem;
  }
}

/* 小屏幕调整 */
@media (max-width: 1200px) {
  .toolbar {
    gap: 0.4rem;
  }
  
  .realtime-panel {
    gap: 0.5rem;
    padding: 0.75rem;
  }
  
  .rownum-panel {
    gap: 0.4rem;
  }
}

/* 高DPI屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 1.5), (min-resolution: 144dpi) {
  .center-table .p-datatable-thead > tr > th,
  .center-table .p-datatable-tbody > tr > td {
    border-width: 0.5px;
  }
}
</style>
