<!-- 堆报警阈值页面 - 参考簇告警阈值实现，使用堆下拉与单一topic(block_fault_dns) -->
<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRemoteControlCore, serializeParameterData, parseParameterReadResponse, parseParameterWriteResponse } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useBlockStore } from '@/stores/device/blockStore'
import { BLOCK_DNS_PARAM_R } from '../../../../main/table.js'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import Toast from 'primevue/toast'

const toastService = useToast()
const blockStore = useBlockStore()

// 声明为堆级遥调页面（显示堆选择器和下发多选）
const { addPageTypeMapping } = usePageTypeDetection()
addPageTypeMapping('/Block/BlockAlarmThreshold', 'block')

// 确保页面类型正确设置
blockStore.setCurrentPageType('block')

// 计算分类范围（按 class 聚合，过滤保留）
function getFieldByteSize(t) {
  if (typeof t === 'string' && t.startsWith('skip')) return Number(t.slice(4))
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

// 事件处理（子进程事件名 = topic后缀大写）
function handleReadEvent(event, mqttMessage){
  if (mqttMessage.dataType !== 'BLOCK_FAULT_DNS_R') return
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
  handleParameterWriteResponse(parsed)
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
    ipc.removeListener('BLOCK_FAULT_DNS_R', handleReadEvent)
    ipc.removeListener('BLOCK_FAULT_DNS_W', handleWriteEvent)
  }
  if (isCurrentlyReading.value) stopParameterReading()
})

// 备注（预留）
function getParameterRemarkText(){ return '' }
</script>

<template>
  <div class="card">
    <Toast />

    <!-- 操作区 -->
    <div class="control-area mb-4">
      <div class="button-group">
        <Button :label="isCurrentlyReading ? '停止读取' : '开始读取'" :severity="isCurrentlyReading ? 'danger' : 'primary'"
                size="small"
                @click="isCurrentlyReading ? stopParameterReading() : startParameterReading()" />
        <Button label="下发参数" severity="warning" size="small" :disabled="isCurrentlyReading || !currentSelectedClass"
                @click="sendCurrentClassParameters" />
      </div>
    </div>

    <!-- 分类切换 -->
    <div class="class-tabs mb-4">
      <Button v-for="cls in allAvailableClasses" :key="cls.name" :label="cls.name"
              :severity="currentSelectedClass?.name === cls.name ? 'primary' : 'secondary'"
              :outlined="currentSelectedClass?.name !== cls.name"
              size="small"
              class="class-tab-button"
              @click="switchToParameterClass(cls.name)"/>
    </div>

    <!-- 参数表格 -->
    <DataTable :value="currentClassParameterList" class="p-datatable-sm" :scrollable="true" scroll-height="600px" :show-gridlines="true">
      <Column header="参数名称" style="width: 260px" :frozen="true">
        <template #body="{ data }">
          <div>
            <div class="font-medium">{{ data.label }}</div>
            <div class="text-xs text-gray-500">{{ data.key }}</div>
          </div>
        </template>
      </Column>

      <Column header="参数值" style="width: 160px">
        <template #body="{ data }">
          <InputNumber
            :model-value="getParameterInputValue(data, data.currentValue)"
            @update:model-value="val => updateParameterValue(data.key, setParameterInputValue(data, val))"
            :disabled="isCurrentlyReading"
            :step="data.scale ? 1 / data.scale : 1"
            :min-fraction-digits="getParameterDecimalPlaces(data)"
            :max-fraction-digits="getParameterDecimalPlaces(data)"
            size="small"
            class="w-full"
          />
        </template>
      </Column>

      <Column header="单位" style="width: 90px">
        <template #body="{ data }">
          <span class="text-gray-600">{{ data.unit || '-' }}</span>
        </template>
      </Column>

      <Column header="备注说明" style="width: 320px">
        <template #body>
          <span class="text-sm text-gray-600">{{ getParameterRemarkText() }}</span>
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



