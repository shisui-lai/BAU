<!-- 堆报警阈值页面 - 参考簇告警阈值实现，使用堆下拉与单一topic(block_fault_dns) -->
<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRetryLogic } from '@/composables/utils/useRetryLogic'
import { useRawInputCache, isNumericType, validateNumericInput } from '@/composables/utils/useParameterInput'
import { useRemoteControlCore, serializeParameterData, parseParameterReadResponse, parseParameterWriteResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useBlockStore } from '@/stores/device/blockStore'
import { BLOCK_DNS_PARAM_R } from '../../../../main/table.js'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'

const toastService = useToast()
const blockStore = useBlockStore()
const { t, locale, te } = useI18n()

// 参数名称翻译函数
const getLabelTranslation = (label) => {
  if (locale.value === 'zh') return label
  return te(`blockAlarmThresholdPage.label.${label}`) 
    ? t(`blockAlarmThresholdPage.label.${label}`) 
    : label
}

// 分类名称翻译函数
const getClassTranslation = (className) => {
  if (locale.value === 'zh') return className
  return te(`blockAlarmThresholdPage.parameterClasses.${className}`) 
    ? t(`blockAlarmThresholdPage.parameterClasses.${className}`) 
    : className
}

// 声明为堆级遥调页面（显示堆选择器和下发多选）
const { addPageTypeMapping } = usePageTypeDetection()
addPageTypeMapping('/Block/BlockAlarmThreshold', 'block')

// 确保页面类型正确设置
blockStore.setCurrentPageType('block')

// 计算分类范围（按 class 聚合，过滤保留）
function getFieldByteSize(t) {
  if (typeof t === 'string' && t.startsWith('skip')) return Number(t.slice(4))
  // bits字段不占用独立字节空间
  if (t === 'bits' || t === 'bit') return 0
  const map = { u8:1,s8:1,u16:2,s16:2,u32:4,s32:4,f32:4, ipv4:4 }
  return map[t] || 2
}
function buildParameterClasses(schema){
  const groups = new Map()
  let offset = 0
  for (const f of schema){
    const size = getFieldByteSize(f.type)
    const cls = f.class || ''
    if (cls && !/保留|预留|skip/i.test(cls)){
      if (!groups.has(cls)) groups.set(cls, { name: cls, byteOffset: offset, byteLength: 0 })
      const g = groups.get(cls)
      g.byteLength += size
    }
    offset += size
  }
  return Array.from(groups.values())
}

const parameterClasses = buildParameterClasses(BLOCK_DNS_PARAM_R)

// 页面配置（单topic：block_fault_dns）
const blockAlarmCfg = {
  dataSource: {
    name: 'BLOCK_DNS_PARAM',
    readTopicTemplate: 'bms/host/s2d/b{block}/block_fault_dns_r',
    writeTopicTemplate: 'bms/host/s2d/b{block}/block_fault_dns_w',
    parameterFields: BLOCK_DNS_PARAM_R,
    parameterClasses,
    writeWholeTable: true, // 整表下发，不分块
    readWholeTable: true,  // 整表读取，确保所有分类数据都被读取
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount) =>
      serializeParameterData(parameterDataFrame, BLOCK_DNS_PARAM_R, startByteOffset, registerCount, '[useBlockAlarmThreshold]', '堆报警阈值')
  }
}

// 复用通用核心（block模式由usePageTypeDetection控制）
const {
  isCurrentlyReading,
  currentSelectedClass,
  currentClassParameterList,
  allAvailableClasses,
  switchToParameterClass,
  startParameterReading,
  stopParameterReading,
  sendCurrentClassParameters,
  updateParameterValue,
  getParameterInputValue,
  setParameterInputValue,
  getParameterDecimalPlaces,
  handleReceivedParameterData,
  handleParameterWriteResponse,
  handleParameterReadError,
  sendParameterReadRequest
} = useRemoteControlCore(blockAlarmCfg, toastService, { selectorMode: 'block' })

// 翻译后的参数列表 - 使用 computed 确保响应式翻译
const translatedParameterList = computed(() => {
  const parameters = currentClassParameterList.value || []
  return parameters.map(param => ({
    ...param,
    label: getLabelTranslation(param.label || param.originalLabel)
  }))
})

// 重试逻辑
const retryLogic = useRetryLogic(toastService, stopParameterReading)

// 带重试逻辑的读取函数
function startParameterReadingWithRetry() {
  retryLogic.startRetry()
  startParameterReading()
}

// ===== 原文缓存（复用 composable）：保留用户输入的字符串（包括非法数值） =====
const { setRawInput, getRawInput, clearAll: clearRawInputCache, getInputDisplay } = useRawInputCache('BLOCK_DNS_PARAM')

// ===== 数值校验（复用 composable） =====

// ===== 下发（带校验） =====
function sendParametersWithValidation() {
  if (isCurrentlyReading.value || !currentSelectedClass?.value) return

  // 只校验当前分类的参数
  const params = translatedParameterList.value.filter(p => p.class === currentSelectedClass.value.name)

  const errors = []
  const updates = []

  for (const p of params) {
    // 非数值型直接跳过（下拉/位段/IPv4/hex）
    if (!isNumericType(p)) continue

    const raw = getRawInput(p)
    if (raw !== undefined) {
      const res = validateNumericInput(p, raw, { t, te })
      if (!res.valid) {
        errors.push(`${p.label}: ${res.message}`)
        continue
      }
      updates.push({ key: p.key, value: res.value })
      continue
    }

    const val = getParameterInputValue(p, p.currentValue)
    if (val === undefined || val === null || !Number.isFinite(Number(val))) {
      const msg = te('toast.remoteControl.invalidNumberEmpty') ? t('toast.remoteControl.invalidNumberEmpty') : '输入为空'
      errors.push(`${p.label}: ${msg}`)
      continue
    }
    const res = validateNumericInput(p, String(val), { t, te })
    if (!res.valid) {
      errors.push(`${p.label}: ${res.message}`)
      continue
    }
    updates.push({ key: p.key, value: res.value })
  }

  if (errors.length > 0) {
    toastService.add({
      severity: 'error',
      summary: te('toast.remoteControl.parameterValidationFailed') ? t('toast.remoteControl.parameterValidationFailed') : '参数校验失败',
      detail: errors.join('\n'),
      life: 8000
    })
    return
  }

  // 校验通过：先“同步写模型”，再下发（避免两次点击）
  for (const u of updates) {
    updateParameterValue(u.key, u.value, { immediate: true })
  }

  // 执行实际下发
  sendCurrentClassParameters()
}

// 事件处理（子进程事件名 = topic后缀大写）
function handleReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_FAULT_DNS_R') return

  // 标记收到响应，停止超时检查
  retryLogic.markResponse()
  const parsed = parseParameterReadResponse(mqttMessage, '[useBlockAlarmThreshold]', '堆报警阈值')
  if (!parsed) return
  if (parsed.result?.error) return handleParameterReadError(parsed)
  // 与簇页面对齐：收到堆数据后，补登记堆选项并触发自动选择
  try {
    if (typeof mqttMessage.blockId === 'number' && mqttMessage.blockId > 0) {
      // 【已禁用】动态发现机制，改用配置驱动方式
      // blockStore.ensureBlockOption(`block${mqttMessage.blockId}`)
    }
  } catch (_) {}
  handleReceivedParameterData(parsed)
  // 读取成功后清理原文缓存，显示设备实际值
  clearRawInputCache()
}
function handleWriteEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_FAULT_DNS_W') return
  const parsed = parseParameterWriteResponse(mqttMessage, '[useBlockAlarmThreshold]', '堆报警阈值')
  handleParameterWriteResponse({
    ...mqttMessage,
    ...parsed,
    className: currentSelectedClass.value?.name || '堆端报警参数'
  })
}

onMounted(() => {
  const ipc = window.electron?.ipcRenderer
  if (ipc){
    ipc.removeAllListeners?.('BLOCK_FAULT_DNS_R')
    ipc.removeAllListeners?.('BLOCK_FAULT_DNS_W')
    ipc.on('BLOCK_FAULT_DNS_R', handleReadEvent)
    ipc.on('BLOCK_FAULT_DNS_W', handleWriteEvent)
  }
  
  // 确保页面类型正确设置
  blockStore.setCurrentPageType('block')
  
  // 默认选中第一个分类，并自动读取一次
  if (allAvailableClasses?.value?.length && !currentSelectedClass?.value){
    switchToParameterClass(allAvailableClasses.value[0].name)
  }
  
  // 延迟读取，确保选择器已就绪
  setTimeout(() => {
    try { 
      // 检查是否有选中的堆
      if (blockStore.selectedBlockForView) {
        console.log('[BlockAlarmThreshold] 自动执行一次读取')
        sendParameterReadRequest() 
      } else {
        console.log('[BlockAlarmThreshold] 等待堆选择器就绪...')
      }
    } catch(e){
      console.warn('[BlockAlarmThreshold] 自动读取触发失败:', e)
    }
  }, 800)
})

onUnmounted(() => {
  const ipc = window.electron?.ipcRenderer
  if (ipc){
    ipc.removeAllListeners('BLOCK_FAULT_DNS_R', handleReadEvent)
    ipc.removeAllListeners('BLOCK_FAULT_DNS_W', handleWriteEvent)
  }
  if (isCurrentlyReading.value) stopParameterReading()

  // 清理重试逻辑资源
  retryLogic.cleanup()
})

// 备注（预留）
function getParameterRemarkText(){ return '' }
</script>

<template>
  <div class="card">
    <!-- Toast组件已移至AppLayout.vue，避免重复声明 -->

    <!-- 操作区 -->
    <div class="control-area mb-4">
      <div class="button-group">
        <Button :label="isCurrentlyReading ? t('blockAlarmThresholdPage.buttons.stopReading') : t('blockAlarmThresholdPage.buttons.startReading')" :severity="isCurrentlyReading ? 'danger' : 'primary'"
                size="small"
                @click="isCurrentlyReading ? stopParameterReading() : startParameterReadingWithRetry()" />
        <Button :label="t('blockAlarmThresholdPage.buttons.sendParameters')" severity="warning" size="small" :disabled="isCurrentlyReading || !currentSelectedClass"
                @click="sendParametersWithValidation" />
      </div>
    </div>

    <!-- 分类切换 -->
    <div class="class-tabs mb-4">
      <Button v-for="cls in allAvailableClasses" :key="cls.name" :label="getClassTranslation(cls.name)"
              :severity="currentSelectedClass?.name === cls.name ? 'primary' : 'secondary'"
              :outlined="currentSelectedClass?.name !== cls.name"
              size="small"
              class="class-tab-button"
              @click="switchToParameterClass(cls.name)"/>
    </div>

    <!-- 参数表格 -->
    <DataTable :value="translatedParameterList" class="p-datatable-sm" :show-gridlines="true">
      <Column :header="t('blockAlarmThresholdPage.table.parameterName')" style="width: 260px" :frozen="true">
        <template #body="{ data }">
          <div
            class="font-medium"
            :class="{
              'text-red-600': data.label.includes('严重'),
              'text-yellow-600': data.label.includes('一般'),
              'text-cyan-600': data.label.includes('轻微')
            }"
          >
            {{ data.label }}
          </div>
        </template>
      </Column>

      <Column :header="t('blockAlarmThresholdPage.table.parameterValue')" style="width: 160px">
        <template #body="{ data }">
          <InputText
            :value="getInputDisplay(data, data.currentValue, getParameterInputValue)"
            @input="(e) => setRawInput(data.key, e?.target?.value ?? '')"
            :disabled="isCurrentlyReading"
            class="w-full"
          />
        </template>
      </Column>

      <Column :header="t('blockAlarmThresholdPage.table.unit')" style="width: 90px">
        <template #body="{ data }">
          <span>{{ data.unit || '-' }}</span>
        </template>
      </Column>

      <Column :header="t('blockAlarmThresholdPage.table.remarks')" style="width: 320px">
        <template #body>
          <span class="text-sm">{{ getParameterRemarkText() }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
  
</template>

<style scoped>
.control-area{ display:flex; align-items:flex-start }
.button-group{ display:flex; gap:8px }
.class-tabs{ display:flex; flex-wrap:wrap; gap:8px }
.class-tab-button{ min-width:100px }
</style>
