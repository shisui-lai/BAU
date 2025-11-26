<template>
  <div>
    <DataTable
      :value="flatData"
      editMode="cell"
      tableStyle="min-width: 10rem"
      class="center-table"
      showGridlines
      scrollable
      :fixedHeader="true"
      paginator :rows="50"
    >
      <Column field="label" :header="t('config.header1')" headerStyle="width: 500px">
        <template #body="{ data: el }">
          <span
            :class="[
              'param-label',
              {
                critical: el.label.includes('严重'),
                warning: el.label.includes('一般'),
                info: el.label.includes('轻微')
              }
            ]"
            >{{ translateLabel(el.label) }}</span
          >
          <!--   <span>
                    {{ slotProps.data.label }}
                  </span> -->
        </template></Column
      >
      <!-- 值 列 样式 -->
      <Column :header="t('config.header2')" field="value" headerStyle="width:100px">
        <template #body="{ data: el }">
          <div class="value-container">
            <InputText
              :modelValue="getInputValue(el)"
              :disabled="isDisabled"
              @update:modelValue="(val) => handleInputChange(el, val)"
              @focus="() => handleInputFocus(el)"
              @blur="() => handleInputBlur(el)"
              :class="{
                editing: el.displayValue !== null,
                original: el.displayValue === null
              }"
            />
          </div>
        </template>
      </Column>
      <Column :header="t('config.header3')">
        <template #body="{ data: el }">
          {{ el.importedValue === null || el.importedValue === undefined ? '' : el.importedValue }}
        </template>
      </Column>
      <Column field="unit" :header="t('config.header4')" headerStyle="width: 100px"> </Column>
      <Column field="note" :header="t('config.header5')" headerStyle="width: 300px">
        <template #body="{ data: el }">
          {{ translateNote(el.note) }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useToast } from 'primevue/usetoast'
import { validateRange } from './configData.js'

const props = defineProps({
  data: Array,
  isDisabled: Boolean // ← 这里接收父组件传过来的 isModuleReading
})
const ipStore = useIpStore()
const toast = useToast()
const flatData = computed(() => {
  return props.data.flatMap((group) => group.element)
})
function translateLabel(label) {
  if (!label) return ''
  return locale.value === 'zh'
    ? label
    : te(`config.pageAlarm.label.${label}`)
      ? t(`config.pageAlarm.label.${label}`)
      : label
}
function translateNote(note) {
  if (!note) return ''
  return locale.value === 'zh'
    ? note
    : te(`config.pageAlarm.note.${note}`)
      ? t(`config.pageAlarm.note.${note}`)
      : note
}
// 原来的编辑相关方法——完全搬过来
function getInputValue(el) {
  return el.displayValue ?? el.value
}
const handleInputFocus = (element) => {
  if (element.displayValue === null) {
    element.displayValue = element.value // 初始化编辑值为原始值
  }
}
function handleInputChange(el, val) {
  el.displayValue = val
  if (!el.hasInput) el.hasInput = true
}
function handleInputBlur(el) {
  const p = parseFloat(el.displayValue)
  if (isNaN(p)) {
    el.displayValue = null
  } else if (p === el.value) {
    el.displayValue = null
  } else {
    // 范围校验
    const validation = validateRange(el, p, t)
    if (!validation.valid) {
      toast.add({
        severity: 'warn',
        summary: '参数范围错误',
        detail: validation.message,
        life: 3000
      })
      el.isInvalid = true
      // 保留用户输入，让用户修改
      el.displayValue = p
    } else {
      el.isInvalid = false
      el.displayValue = p
    }
  }
}

// 暴露给父组件分批写入时调用
async function writeImported() {
  // —— 1) 验证导入值 ——
  // 记下哪些行有 importedValue
  const totalCount = flatData.value.length
  const importedEntries = flatData.value.filter(
    (el) =>
      el.importedValue !== null &&
      el.importedValue !== undefined &&
      el.importedValue !== '' &&
      el.importedValue !== '-'
  )

  if (importedEntries.length === 0) {
    toast.add({
      severity: 'warn',
      summary: t('balanceControl.writeFailed'),
      detail: t('config.toast.importFirst'),
      life: 5000
    })
    return { ok: [], err: [] }
  }
  if (importedEntries.length < totalCount) {
    toast.add({
      severity: 'warn',
      summary: t('balanceControl.writeFailed'),
      detail: t('config.toast.emptyImport'),
      life: 5000
    })
    return { ok: [], err: [] }
  }

  // —— 1.5) 范围校验导入值 ——
  let hasRangeError = false
  for (const el of importedEntries) {
    const validation = validateRange(el, el.importedValue, t)
    if (!validation.valid) {
      toast.add({
        severity: 'warn',
        summary: '导入参数范围错误',
        detail: validation.message,
        life: 15000
      })
      hasRangeError = true
    }
  }
  if (hasRangeError) {
    return { ok: [], err: [] }
  }

  const writeData = []
  const seen = new Set()

  flatData.value.forEach((el) => {
    if (el.importedValue == null) return
    const [addr] = el.address.split('-')
    if (seen.has(addr)) return
    writeData.push({ address: addr, value: +el.importedValue })
    seen.add(addr)
  })

  if (!writeData.length) return
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  const results = await Promise.all(
    targets.map((ip) =>
      window.electron.ipcRenderer.invoke(
        'write-modbus-registers',
        writeData.map((r) => ({ ...r, ip }))
      )
    )
  )
  const ok = results.filter((r) => r.success).map((r) => r.ip)
  const err = results.filter((r) => !r.success).map((r) => r.ip)
  // 清空导入列
  props.data.forEach((g) => g.element.forEach((el) => (el.importedValue = null)))
  return { ok, err }
}

// 让父组件能调用 writeImported
defineExpose({ writeImported })
</script>
<style scoped>
.center-table td,
.center-table th {
  text-align: left !important;
}
.param-label.critical {
  color: #fd7272;
}
.param-label.warning {
  color: #eab543;
}
.param-label.info {
  color: #55e6c1;
}
.value-container {
  position: relative;
  min-height: 36px;
}
.import-input {
  width: 100%;
}
</style>
