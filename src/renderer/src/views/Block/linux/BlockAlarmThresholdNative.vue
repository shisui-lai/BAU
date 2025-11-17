<!-- 堆报警阈值页面 - 参考簇告警阈值实现，使用堆下拉与单一topic(block_fault_dns) -->
<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRetryLogic } from '@/composables/utils/useRetryLogic'
import { useRemoteControlCore, serializeParameterData, parseParameterReadResponse, parseParameterWriteResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useBlockStore } from '@/stores/device/blockStore'
import { BLOCK_DNS_PARAM_R } from '../../../../../main/table.js'

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
        <button 
          :class="['btn', isCurrentlyReading ? 'btn-danger' : 'btn-primary']"
          @click="isCurrentlyReading ? stopParameterReading() : startParameterReadingWithRetry()"
        >
          {{ isCurrentlyReading ? t('blockAlarmThresholdPage.buttons.stopReading') : t('blockAlarmThresholdPage.buttons.startReading') }}
        </button>
        <button 
          :class="['btn', 'btn-warning']"
          :disabled="isCurrentlyReading || !currentSelectedClass"
          @click="sendCurrentClassParameters"
        >
          {{ t('blockAlarmThresholdPage.buttons.sendParameters') }}
        </button>
      </div>
    </div>

    <!-- 分类切换 -->
    <div class="class-tabs mb-4">
      <button 
        v-for="cls in allAvailableClasses" 
        :key="cls.name" 
        :class="['btn', 'class-tab-button', currentSelectedClass?.name === cls.name ? 'btn-primary' : 'btn-secondary']"
        @click="switchToParameterClass(cls.name)"
      >
        {{ getClassTranslation(cls.name) }}
      </button>
    </div>

        <!-- 参数表格 -->
    <div class="table-container">
      <table class="native-table">
        <thead>
          <tr>
            <th style="width: 260px">{{ t('blockAlarmThresholdPage.table.parameterName') }}</th>
            <th style="width: 160px">{{ t('blockAlarmThresholdPage.table.parameterValue') }}</th>
            <th style="width: 90px">{{ t('blockAlarmThresholdPage.table.unit') }}</th>
            <th style="width: 320px">{{ t('blockAlarmThresholdPage.table.remarks') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="param in translatedParameterList" :key="param.key">
            <td>
              <div
                class="font-medium"
                :class="{
                  'text-red': param.label.includes('严重'),
                  'text-yellow': param.label.includes('一般'),
                  'text-cyan': param.label.includes('轻微')
                }"
              >
                {{ param.label }}
              </div>
            </td>
            <td>
              <input
                type="number"
                :value="getParameterInputValue(param, param.currentValue)"
                @input="(e) => updateParameterValue(param.key, setParameterInputValue(param, parseFloat(e.target.value)))"
                :disabled="isCurrentlyReading"
                :step="param.scale ? 1 / param.scale : 1"
                class="input-control"
              />
            </td>
            <td>
              <span>{{ param.unit || '-' }}</span>
            </td>
            <td>
              <span class="text-sm">{{ getParameterRemarkText() }}</span>
            </td>
          </tr>
          <!-- 空数据提示 -->
          <tr v-if="!translatedParameterList || translatedParameterList.length === 0">
            <td colspan="4" class="empty-message">
              {{ t('blockAlarmThresholdPage.noData') || '暂无数据' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  
</template>

<style scoped>
.control-area {
  display: flex;
  align-items: flex-start;
}

.button-group {
  display: flex;
  gap: 8px;
}

.class-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.class-tab-button {
  min-width: 100px;
}

/* 原生按钮样式 */
.btn {
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-600);
  border-color: var(--primary-600);
}

.btn-secondary {
  background-color: var(--surface-100);
  color: var(--text-color);
  border-color: var(--surface-300);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--surface-200);
}

.btn-danger {
  background-color: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
  border-color: #bd2130;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
  border-color: #ffc107;
}

.btn-warning:hover:not(:disabled) {
  background-color: #e0a800;
  border-color: #d39e00;
}

/* 表格容器 */
.table-container {
  overflow-x: auto;
}

/* 原生表格样式 */
.native-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--surface-card);
  border: 1px solid var(--surface-border);
  font-size: 0.875rem;
}

.native-table thead th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
  background-color: var(--surface-section);
  border-bottom: 2px solid var(--surface-border);
}

.native-table tbody tr {
  transition: background-color 0.2s;
}

.native-table tbody tr:hover {
  background-color: var(--surface-hover);
}

.native-table tbody tr:not(:last-child) td {
  border-bottom: 1px solid var(--surface-border);
}

.native-table tbody td {
  padding: 0.75rem 1rem;
  color: var(--text-color);
  vertical-align: middle;
}

.native-table tbody td.empty-message {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 2rem 1rem;
}

/* 输入控件样式 */
.input-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-0);
  color: var(--text-color);
  font-size: 0.875rem;
  transition: all 0.2s;
  outline: none;
}

.input-control:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
}

.input-control:disabled {
  background-color: var(--surface-100);
  opacity: 0.6;
  cursor: not-allowed;
}

/* 告警等级颜色 */
.text-red {
  color: #dc2626;
}

.text-yellow {
  color: #d97706;
}

.text-cyan {
  color: #0891b2;
}

/* 工具类 */
.font-medium {
  font-weight: 500;
}

.text-sm {
  font-size: 0.875rem;
}

.mb-4 {
  margin-bottom: 1.5rem;
}
</style>



