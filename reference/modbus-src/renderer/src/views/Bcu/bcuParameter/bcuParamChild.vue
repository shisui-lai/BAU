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
    >
      <Column :header="t('config.header1')">
        <template #body="{ data: el }">
          {{ translateLabel(el.label) }}
        </template>
      </Column>
      <Column :header="t('config.header2')">
        <template #body="{ data: el }">
          <template v-if="isDropdownField(el)">
            <Dropdown
              :modelValue="getInputValue(el)"
              @update:modelValue="(val) => handleInputChange(el, val)"
              :options="getTranslatedOptions(getDropdownKey(el.label), t)"
              optionLabel="label"
              optionValue="value"
              :disabled="isDisabled"
            />
          </template>
          <template v-else>
            <InputText
              :modelValue="getInputValue(el)"
              :disabled="isDisabled || el.readOnly"
              @update:modelValue="(val) => handleInputChange(el, val)"
              @focus="() => handleInputFocus(el)"
              @blur="() => handleInputBlur(el)"
              @keypress="(e) => onKeyPress(e, el)"
              :class="{
                editing: el.displayValue !== null,
                original: el.displayValue === null,
                'p-invalid': el.isInvalid
              }"
            />
            <small v-if="el.isInvalid" class="p-error">
              {{ el.dataType === 'ip' ? 'IP格式错误' : '数值超出范围' }}
            </small>
          </template>
        </template>
      </Column>
      <Column field="importedValue" :header="t('config.header3')" />
      <Column field="unit" :header="t('config.header4')" headerStyle="width: 100px"> </Column>
      <Column :header="t('config.header5')" headerStyle="width: 300px">
        <template #body="{ data: el }">
          {{ translateNote(el.noteKey, el.note) }}
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
import {
  processValue,
  ipRelatedRegisters,
  getDropDownList,
  getDropDownListEN,
  labels,
  labelsEN,
  isDropdownField,
  getDropdownKey,
  getTranslatedOptions
} from './configData.js'

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
    : te(`config.pageSysConfig.label.${label}`)
      ? t(`config.pageSysConfig.label.${label}`)
      : label
}
function translateNote(noteKey, note) {
  if (!noteKey) return ''
  return locale.value === 'zh'
    ? note
    : te(`config.pageSysConfig.note.${noteKey}`)
      ? t(`config.pageSysConfig.note.${noteKey}`)
      : note
}
// 原来的编辑相关方法——完全搬过来
function getInputValue(el) {
  const value = el.displayValue ?? el.value
  // 对于下拉框，确保返回数值类型
  if (isDropdownField(el)) {
    return value === '-' ? null : Number(value)
  }
  return value
}
function handleInputFocus(el) {
  if (el.displayValue === null) {
    el.displayValue = el.dataType === 'ip' ? el.value.toString() : el.value
  }
}
function handleInputChange(el, val) {
  //console.log('val:', val, 'displayValue:', el.displayValue)
  if (el.dataType === 'ip') {
    const pat = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d?)\.?){0,4}$/
    if (!pat.test(val)) {
      el.isInvalid = true
      return
    }
    const segs = val.split('.').filter((s) => s)
    el.displayValue = segs.join('.') + (val.endsWith('.') ? '.' : '')
    el.isInvalid = segs.length > 4 || segs.some((s) => +s > 255)
  } else {
    // 对于下拉框，确保值是数值类型
    if (isDropdownField(el)) {
      el.displayValue = Number(val)
    } else {
      el.displayValue = val
    }
  }
  if (!el.hasInput) el.hasInput = true
}
function handleInputBlur(el) {
  if (el.dataType === 'ip') {
    const full = /^(25[0-5]|2[0-4]\d|[01]?\d?\d?)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d?)){3}$/
    if (!full.test(el.displayValue)) {
      el.isInvalid = true
      toast.add({ severity: 'warn', summary: 'IP格式错误' })
    } else {
      el.isInvalid = false
      el.value = el.displayValue
    }
  } else {
    const p = parseFloat(el.displayValue)
    if (isNaN(p)) el.displayValue = null
    else if (p === el.value) el.displayValue = null
    else el.displayValue = p
  }
}
function onKeyPress(e, el) {
  if (el.dataType === 'ip' && !/[0-9\.]/.test(e.key)) e.preventDefault()
}
function isLabelInList(label, lang) {
  if (lang === 'zh' && labels.includes(label)) {
    return labels.includes(label)
  } else if (lang === 'en' && labelsEN.includes(label)) {
    return labelsEN.includes(label)
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
  const writeData = []
  const seen = new Set()

  // 特殊：0x005a 三项合并（id:100/101/102）
  const all005a = flatData.value.filter((el) => (el.address || '').split('-')[0] === '0x005a')
  if (all005a.length) {
    const findById = (id) => all005a.find((e) => e.id === id)
    const elCluster = findById(100)
    const elPower = findById(101)
    const elBmuTemp = findById(102)
    const valOf = (el) => Number(el?.importedValue ?? el?.value ?? 0)
    const cluster = (valOf(elCluster) & 0x7) >>> 0
    const power = (valOf(elPower) & 0x1) >>> 0
    const bmuTemp = (valOf(elBmuTemp) & 0x1) >>> 0
    const combined = (cluster | (power << 3) | (bmuTemp << 4)) >>> 0
    writeData.push({ address: '0x005a', value: combined })
    seen.add('0x005a')
  }

  flatData.value.forEach((el) => {
    if (el.importedValue == null) return
    const [addr] = el.address.split('-')
    if (seen.has(addr)) return
    if (el.dataType === 'ip') {
      const { high, low } = processValue(el.importedValue, true)
      writeData.push({ address: addr, value: high })
      writeData.push({
        address: ipRelatedRegisters.get(addr).endAddr,
        value: low
      })
    } else {
      writeData.push({ address: addr, value: +el.importedValue })
    }
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
  props.data.forEach((g) => g.element.forEach((el) => (el.importedValue = null)))
  return { ok, err }
}
// 让父组件能调用 writeImported
defineExpose({ writeImported })
</script>
