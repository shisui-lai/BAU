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
        :label="isReading ? t('powerMap.stopReading') : t('powerMap.startReading')"
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
        :disabled="isReading"
      />
      <Button
        class="ml-2"
        :label="t('powerMap.buttonLable3')"
        icon="pi pi-save"
        @click="onWriteAll"
        :disabled="isReading || !importValid"
      />

      <Button
        class="ml-2"
        :label="t('powerMap.buttonLable4')"
        icon="pi pi-download"
        @click="onSendRowNum"
        :disabled="editedRowCount.length === 0 || editedColCount === 0"
      />
      <Button
        class="ml-2"
        :label="t('powerMap.buttonLable5')"
        icon="pi pi-download"
        @click="onSendMap"
      />
    </div>
    <!-- 行/列数 配置面板 -->
    <div class="rownum-panel">
      <label>{{ t('powerMap.label1') }}</label>
      <InputText :value="currentRowCount" disabled />

      <label>{{ t('powerMap.label2') }}</label>
      <InputText :value="currentColCount" disabled />

      <label>{{ t('powerMap.label3') }}</label>
      <InputText v-model="editedRowCount" />

      <label>{{ t('powerMap.label4') }}</label>
      <InputText v-model="editedColCount" />
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
            :disabled="isReading"
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
import { useToast } from 'primevue/usetoast'
import { formatFileSuffix } from '../bcuParameter/configData.js'
const toast = useToast()
const ipStore = useIpStore()
const MODULE_NAME = 'PowerMap'
const IPC_CHANNEL = 'update-FC04PowerMap'
const fileInput = ref(null)
// —— 新增 —— 是否已导入合法 CSV
const importValid = ref(false)
// 比较符可选项
const cmpOptions = [
  { label: '>', value: 0 },
  { label: '=', value: 1 },
  { label: '<', value: 2 },
  { label: '>=', value: 3 },
  { label: '<=', value: 4 }
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
  return (
    DataPowerMap[ip] || {
      chargeTable: [],
      dischargeTable: [],
      colTitlesChrg: [],
      rowTitlesChrg: [],
      colTitlesDis: [],
      rowTitlesDis: [],
      rowNum: [],
      // **新增** 存原始三元组便于回写
      rawSocChrg: [],
      rawTempChrg: [],
      rawSocDis: [],
      rawTempDis: []
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
// 编辑缓冲
const editedRowCount = ref(1)
const editedColCount = ref(1)

// 下发行列数
function onSendRowNum() {
  const ip = ipStore.selectedIp
  // 地址基址
  const base = isCharge.value ? 0x5400 : 0x5402
  const addrs = [base, base + 1]
  const values = [editedRowCount.value, editedColCount.value]
  const cmds = addrs.map((addr, i) => ({ address: `0x${addr.toString(16)}`, value: values[i], ip }))
  window.electron.ipcRenderer.invoke('write-modbus-registers', cmds)
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
    rowNum: Arg.rowNum || []
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
const isReading = ref(false)
function toggleReading() {
  isReading.value = !isReading.value
  if (isReading.value) {
    startReading()
  } else {
    stopReading()
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
watch(
  showCharge,
  (charge) => {
    if (charge) {
      // 切到充电
      if (importedEdit.charge.rows != null) {
        editedRowCount.value = importedEdit.charge.rows
        editedColCount.value = importedEdit.charge.cols
      }
    } else {
      // 切到放电
      if (importedEdit.discharge.rows != null) {
        editedRowCount.value = importedEdit.discharge.rows
        editedColCount.value = importedEdit.discharge.cols
      }
    }
  },
  { immediate: false }
)
onBeforeMount(() => {
  registerListener()
})
onBeforeUnmount(() => {
  isReading.value = false
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
  /*   if (!importValid.value) {
    toast.add({ severity: 'warn', summary: t('powerMap.toast.importValidWarn'), life: 3000 })
    return
  } */
  // 1. 构造要写入的“每行命令”模板
  const rows = displayedData.value
  const cols = currentColCount.value
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
    // 行和列要不同：
    editor.cmp2 = isRow
      ? 2 // '<'
      : 4 // '<='
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
  // 1. 先写寄存器：地址计算
  //    socChrg:0x5406, tempChrg:0x5436, socDis:0x5466, tempDis:0x5496
  const baseAddr = e.isRow ? (isCharge.value ? 0x5436 : 0x5496) : isCharge.value ? 0x5406 : 0x5466
  const cmds = []
  // 1) 如果 idx>0，需要先下发“上一个阈值”寄存器
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
  /* console.log(cmds) */
  // 发送写寄存器 IPC：三个寄存器一次下设
  await window.electron.ipcRenderer.invoke('write-modbus-registers', cmds)
  editor.visible = false
}
async function onExportCsv() {
  const ip = ipStore.selectedIp
  const data = currentEntry.value

  // ——— 1. 行列数区块 ———
  const headerRow = [
    ['type', 'label', 'value', 'address'],
    ...data.rowNum.map((r) => ['rowNum', r.label, r.value, r.address])
  ]
  const csv1 = Papa.unparse(headerRow)

  // ——— 2. 原始阈值区块 ———
  // 直接把四个原始数组 join 成一行
  const rawSocChLine = data.rawSocChrg.join(',')
  const rawTempChLine = data.rawTempChrg.join(',')
  const rawSocDisLine = data.rawSocDis.join(',')
  const rawTempDisLine = data.rawTempDis.join(',')

  // ——— 3. TABLE-CHRG ———
  const tableCh = data.chargeTable.map((r) => [
    "'" + r.rowTitle,
    ...data.colTitlesChrg.map((_, idx) => r[`C${idx + 1}`])
  ])
  const csvTableCh = Papa.unparse([['rowTitle', ...data.colTitlesChrg], ...tableCh])

  // ——— 4. TABLE-DISCHRG ———
  const tableDis = data.dischargeTable.map((r) => [
    "'" + r.rowTitle,
    ...data.colTitlesDis.map((_, idx) => r[`C${idx + 1}`])
  ])
  const csvTableDis = Papa.unparse([['rowTitle', ...data.colTitlesDis], ...tableDis])

  // ——— 5. 拼接所有区块，并加 BOM ———
  const sections = [
    '---ROWNUM---',
    csv1,
    '---RAWSOC-CHRG---',
    rawSocChLine,
    '---RAWTEMP-CHRG---',
    rawTempChLine,
    '---TABLE-CHRG---',
    csvTableCh,
    '---RAWSOC-DISCHRG---',
    rawSocDisLine,
    '---RAWTEMP-DISCHRG---',
    rawTempDisLine,
    '---TABLE-DISCHRG---',
    csvTableDis
  ]
  const fullCsv = '\uFEFF' + sections.join('\n') + '\n'

  // ——— 6. 通过 IPC 导出 ———
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
      life: 5000
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
        life: 5000
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
    ROWNUM: [],
    'RAWSOC-CHRG': [],
    'RAWTEMP-CHRG': [],
    'TABLE-CHRG': [],
    'RAWSOC-DISCHRG': [],
    'RAWTEMP-DISCHRG': [],
    'TABLE-DISCHRG': []
  }
  let current = null

  for (let raw of lines) {
    const line = raw.trim()
    if (line.startsWith('---ROWNUM---')) {
      current = 'ROWNUM'
      continue
    }
    if (line.startsWith('---RAWSOC-CHRG---')) {
      current = 'RAWSOC-CHRG'
      continue
    }
    if (line.startsWith('---RAWTEMP-CHRG---')) {
      current = 'RAWTEMP-CHRG'
      continue
    }
    if (line.startsWith('---TABLE-CHRG---')) {
      current = 'TABLE-CHRG'
      continue
    }
    if (line.startsWith('---RAWSOC-DISCHRG---')) {
      current = 'RAWSOC-DISCHRG'
      continue
    }
    if (line.startsWith('---RAWTEMP-DISCHRG---')) {
      current = 'RAWTEMP-DISCHRG'
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
  // 2) 校验所有必需区块都存在
  for (const key of Object.keys(blocks)) {
    if (!blocks[key].length) {
      toast.add({
        severity: 'error',
        summary: t('powerMap.toast.csvMissingBlock', { block: key }),
        life: 5000
      })
      importValid.value = false
      return
    }
  }
  // 3) 解析这三大块：注意 Excel 导出的文件用制表符分隔
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
  // 用结构同时拿到 data 和 fields
  const parsedRow = Papa.parse(blocks.ROWNUM.join('\n'), opts)
  const parsedChrg = Papa.parse(blocks['TABLE-CHRG'].join('\n'), opts)
  const parsedDis = Papa.parse(blocks['TABLE-DISCHRG'].join('\n'), opts)
  // 4) 校验 ROWNUM 块：至少一行，且 header 中必须出现这 4 个字段
  const need = ['type', 'label', 'value', 'address']
  const got = parsedRow.meta.fields.map((f) => f.trim().toLowerCase())
  const missing = need.filter((k) => !got.includes(k))
  if (!parsedRow.data.length || missing.length) {
    toast.add({
      severity: 'error',
      summary: t('powerMap.toast.csvRowNumMissingField', { fields: missing.join('、') }),
      life: 5000
    })
    importValid.value = false
    return
  }

  // 5) 校验原始四个数组——全数字
  const toNumArray = (str) => str.split(',').map((s) => Number(s))
  const rawSocChrg = toNumArray(blocks['RAWSOC-CHRG'][0])
  const rawTempChrg = toNumArray(blocks['RAWTEMP-CHRG'][0])
  const rawSocDis = toNumArray(blocks['RAWSOC-DISCHRG'][0])
  const rawTempDis = toNumArray(blocks['RAWTEMP-DISCHRG'][0])
  for (const [arr, name] of [
    [rawSocChrg, 'RAWSOC-CHRG'],
    [rawTempChrg, 'RAWTEMP-CHRG'],
    [rawSocDis, 'RAWSOC-DISCHRG'],
    [rawTempDis, 'RAWTEMP-DISCHRG']
  ]) {
    if (arr.some(isNaN)) {
      toast.add({
        severity: 'error',
        summary: t('powerMap.toast.csvNotNumberList', { block: name }),
        life: 5000
      })
      importValid.value = false
      return
    }
  }

  // 6) 校验 TABLE-CHRG / TABLE-DISCHRG：至少一行，每行首列字符串，其余列数字
  const checkTableBlock = (lines, key) => {
    const rows = lines.map((l) => l.split(/\t|,/))
    if (rows.length < 2) {
      toast.add({
        severity: 'error',
        summary: t('powerMap.toast.csvTableNeedHeader', { block: key }),
        life: 5000
      })
      return false
    }
    // 跳过 rows[0]
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i]
      // 首列非空字符，其它列全数字
      if (
        typeof cols[0] !== 'string' ||
        cols[0].trim() === '' ||
        cols.slice(1).some((c) => isNaN(Number(c)))
      ) {
        toast.add({
          severity: 'error',
          summary: t('powerMap.toast.csvTableRowFormat', { block: key, line: i + 1 }),
          life: 5000
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

  // // 4) 过滤空列函数
  function stripEmptyCols(rows) {
    return rows.map((row) => {
      const o = {}
      Object.entries(row).forEach(([k, v]) => {
        if (k && !k.startsWith('_')) o[k] = v
      })
      return o
    })
  }
  // 7) 全部校验通过，调用 applyImportedCsv
  //    并将原始四数组传入
  const rawRow = parsedRow.data
  const rawChrg = stripEmptyCols(parsedChrg.data)
  const fieldsCh = parsedChrg.meta.fields.filter((f) => f && !f.startsWith('_col'))
  const rawDis = stripEmptyCols(parsedDis.data)
  const fieldsDis = parsedDis.meta.fields.filter((f) => f && !f.startsWith('_'))

  // 6) 调用 applyImportedCsv，把解析好的三块都传进去
  applyImportedCsv({
    ROWNUM: rawRow,
    rawSocChrg,
    rawTempChrg,
    rawSocDis,
    rawTempDis,
    charge: { data: rawChrg, fields: fieldsCh },
    discharge: { data: rawDis, fields: fieldsDis }
  })
  importValid.value = true
  toast.add({ severity: 'success', summary: t('powerMap.toast.importSuccess'), life: 5000 })
}
const importedEdit = reactive({
  charge: { rows: null, cols: null },
  discharge: { rows: null, cols: null }
})
function applyImportedCsv({
  ROWNUM,
  rawSocChrg: importedSocChrg,
  rawTempChrg: importedTempChrg,
  rawSocDis: importedSocDis,
  rawTempDis: importedTempDis,
  charge,
  discharge
}) {
  /*   console.log({ ROWNUM, 'TABLE-CHRG': charge, 'TABLE-DISCHRG': discharge }) */
  const ip = ipStore.selectedIp
  // 1. 解析行列数
  const importedRowNums = ROWNUM.map((r) => ({
    label: r.label,
    value: r.value,
    address: r.address
  }))
  DataPowerMap[ip].rowNum = importedRowNums
  importedEdit.charge.rows = importedRowNums[0]?.value
  importedEdit.charge.cols = importedRowNums[1]?.value
  importedEdit.discharge.rows = importedRowNums[2]?.value
  importedEdit.discharge.cols = importedRowNums[3]?.value

  // 然后根据当前模式，给编辑框赋值
  if (isCharge.value) {
    editedRowCount.value = importedEdit.charge.rows
    editedColCount.value = importedEdit.charge.cols
  } else {
    editedRowCount.value = importedEdit.discharge.rows
    editedColCount.value = importedEdit.discharge.cols
  }
  // 2. 充电表格（注意 key 用 'TABLE-CHRG'）
  const colTitlesChrg = charge.fields.slice(1)
  const chargeTable = charge.data.map((r) => {
    const title = r.rowTitle.startsWith("'") ? r.rowTitle.slice(1) : r.rowTitle
    const row = { rowTitle: title }
    colTitlesChrg.forEach((h, idx) => {
      row[`C${idx + 1}`] = r[h]
    })
    return row
  })

  // 3) 放电同理
  const colTitlesDis = discharge.fields.slice(1)
  const dischargeTable = discharge.data.map((r) => {
    const title = r.rowTitle.startsWith("'") ? r.rowTitle.slice(1) : r.rowTitle
    const row = { rowTitle: title }
    colTitlesDis.forEach((h, idx) => {
      row[`C${idx + 1}`] = r[h]
    })
    return row
  })

  // 5. 写回 DataPowerMap
  DataPowerMap[ip] = {
    ...currentEntry.value,
    colTitlesChrg,
    rowTitlesChrg: chargeTable.map((r) => r.rowTitle),
    chargeTable,
    rawSocChrg: importedSocChrg,
    rawTempChrg: importedTempChrg,
    colTitlesDis,
    rowTitlesDis: dischargeTable.map((r) => r.rowTitle),
    dischargeTable,
    rawSocDis: importedSocDis,
    rawTempDis: importedTempDis
  }
  localStorage.setItem(`${IPC_CHANNEL}-${ip}`, JSON.stringify(DataPowerMap[ip]))
}
// --- 新增方法 onWriteAll ---
async function onWriteAll() {
  if (!importValid.value) {
    toast.add({ severity: 'warn', summary: t('powerMap.toast.importValidWarn'), life: 3000 })
    return
  }
  const ip = ipStore.selectedIp
  const data = currentEntry.value
  const targets = ipStore.selectedIpsForWrite.length ? ipStore.selectedIpsForWrite : [ip]

  // 1) 写入“行列数”—— 一次写充电和放电
  const rcCmds = [
    { address: '0x5400', value: importedEdit.charge.rows, ip },
    { address: '0x5401', value: importedEdit.charge.cols, ip },
    { address: '0x5402', value: importedEdit.discharge.rows, ip },
    { address: '0x5403', value: importedEdit.discharge.cols, ip }
  ]

  // 2) 把 96 个「充电行／列标题」一次写完
  const socTempChrg = data.rawSocChrg.concat(data.rawTempChrg)
  const chrgTitleCmds = socTempChrg.map((v, idx) => ({
    address: `0x${(0x5406 + idx).toString(16)}`,
    value: v,
    ip
  }))

  // 3) 一次写完 96 个「放电行／列标题」
  const socTempDis = data.rawSocDis.concat(data.rawTempDis)
  const disTitleCmds = socTempDis.map((v, idx) => ({
    address: `0x${(0x5466 + idx).toString(16)}`,
    value: v,
    ip
  }))
  toast.add({ severity: 'info', summary: t('powerMap.toast.writeConfigStart'), life: 3000 })
  const results = await Promise.all(
    targets.map(async (ip) => {
      try {
        // 行列数
        await window.electron.ipcRenderer.invoke('write-modbus-registers', rcCmds)
        // 充电标题一次 96 寄存器
        await window.electron.ipcRenderer.invoke('write-modbus-registers', chrgTitleCmds)
        // 放电标题一次 96 寄存器
        await window.electron.ipcRenderer.invoke('write-modbus-registers', disTitleCmds)
        // 最后写两张 map
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
      life: 5000
    })
  if (fail.length)
    toast.add({
      severity: 'error',
      summary: t('powerMap.toast.writeFail', { devices: fail.join('，') }),
      life: 5000
    })
}
</script>

<style lang="less" scoped>
.toolbar {
  display: flex;
  align-items: center;
}
.rownum-panel {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
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
</style>
