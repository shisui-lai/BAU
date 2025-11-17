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
      <!-- 值 列 样式 -->
      <Column :header="t('config.header2')" field="value" headerStyle="width:100px">
        <template #body="{ data: el }">
          <div class="value-container">
            <InputText
              :modelValue="getInputValue(el)"
              :disabled="isDisabled || el.readonly"
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
      <Column :header="t('didoControl.operation')" headerStyle="width: 120px">
        <template #body="{ data: el }">
          <Button
            v-if="shouldShowSingleButton(el)"
            severity="success"
            @click="$emit('send-single', el)"
            :disabled="isDisabled"
            ><strong>{{ t('vtSetShield.calibration.set') }}</strong>
          </Button>
        </template>
      </Column>
      <Column :header="t('config.header3')">
        <template #body="{ data: el }">
          {{ el.importedValue === null || el.importedValue === undefined ? '' : el.importedValue }}
        </template>
      </Column>
      <Column field="unit" :header="t('config.header4')" headerStyle="width: 100px"> </Column>
      <Column field="note" :header="t('config.header5')" headerStyle="width: 300px"> </Column>
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
  mergeRegistersForSOX,
  scaleFactors,
  singleSendLabels,
  validateRange
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
    : te(`config.pageSOX.label.${label}`)
      ? t(`config.pageSOX.label.${label}`)
      : label
}
const emit = defineEmits(['send-single'])
// 原来的编辑相关方法——完全搬过来
function getInputValue(el) {
  return el.displayValue ?? el.value
}
// 处理焦点事件
const handleInputFocus = (element) => {
  if (!element.readonly && element.displayValue === null) {
    element.displayValue = element.value // 初始化编辑值为原始值
  }
}
function handleInputChange(el, val) {
  if (!el.readonly) {
    el.displayValue = val
    if (!el.hasInput) el.hasInput = true
  }
}
function handleInputBlur(el) {
  if (!el.readonly) {
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
}

// 判断是否显示单独下发按钮
const shouldShowSingleButton = (element) => {
  return singleSendLabels.has(element.label)
}
// 暴露给父组件分批写入时调用
// 批量下发本页“导入值”
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
  let hasError = false // 新增错误标志
  const seen = new Set()
  flatData.value.forEach((el) => {
    if (el.importedValue == null) return
    const [addr] = el.address.split('-')
    if (seen.has(addr)) return
    // SOX 专用：判断是否合并寄存器，计算 high/low
    if (mergeRegistersForSOX.has(addr)) {
      const paired = mergeRegistersForSOX.get(addr)
      const scale = scaleFactors.get(addr) || 1
      const raw = Number(el.importedValue)
      // 数值格式校验
      if (isNaN(raw)) {
        toast.add({
          severity: 'warn',
          summary: '提示信息',
          detail: `${el.label} 必须为数字`,
          life: 3000
        })
        /* alert(`${element.label} 必须为数字`) */
        hasError = true
        return
      }
      const numericValue = parseFloat(raw)
      const scaled = Math.round(numericValue * scale)
      // 32位无符号整数范围校验
      const maxValue = 4294967295
      if (scaled < 0 || scaled > maxValue) {
        const maxDisplayValue = (maxValue / scale).toFixed(2)
        toast.add({
          severity: 'warn',
          summary: '提示信息',
          detail: `${el.label} 取值范围为0-${maxDisplayValue}`,
          life: 3000
        })
        /*   alert(`${element.label} 取值范围为0-${maxDisplayValue}`) */
        hasError = true
        return
      }
      const high = (scaled >>> 16) & 0xffff
      const low = scaled & 0xffff
      writeData.push({ address: addr, value: +(low / scale).toFixed(2) })
      writeData.push({ address: paired, value: +(high / scale).toFixed(2) })
    } else {
      writeData.push({ address: addr, value: Number(el.importedValue) })
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

  // 清空本页 importedValue
  flatData.value.forEach((el) => (el.importedValue = null))
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
.param-label {
  font-weight: bold;
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

/* 只读状态样式 */
.readonly {
  background-color: #f5f5f5 !important;
  color: #999 !important;
  cursor: not-allowed !important;
}
</style>
