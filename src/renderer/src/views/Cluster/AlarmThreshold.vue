<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, onActivated, onDeactivated, ref, computed, watch, nextTick } from 'vue'
import { scheduleAutoRead, cancelAutoRead } from '@/composables/utils/useAutoReadScheduler'
import { useRetryLogic } from '@/composables/utils/useRetryLogic'
import { useRemoteControlCore } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { useAlarmThreshold } from '@/composables/core/data-processing/parameter-management/useAlarmThreshold'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { DEFAULT_CLUSTER_DNS_PARAMS } from '@/configs/parameterDefaults'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import { useI18n } from 'vue-i18n'

const toastService = useToast()
const alarmThresholdHandler = useAlarmThreshold()
const { t, locale, te } = useI18n()

// 直接使用label翻译函数
const getLabelTranslation = (label) => {
  if (locale.value === 'zh') return label
  return te(`config.alarmThreshold.label.${label}`) 
    ? t(`config.alarmThreshold.label.${label}`) 
    : label
}

// 翻译后的参数列表
const translatedParameterList = computed(() => {
  const parameters = currentClassParameterList.value || []
  return parameters.map(param => ({
    ...param,
    label: getLabelTranslation(param.label || param.originalLabel)
  }))
})

// 已移除：分类按钮名称本地映射，统一由 handler.getClassInfo 返回 nameKey

// 页面类型检测 - 设置为cluster类型以显示下发多选框
const { addPageTypeMapping } = usePageTypeDetection()

// 添加报警阈值页面的类型映射
addPageTypeMapping('/Cluster/AlarmThreshold', 'cluster')

// 根据分类名称确定数据类型
function getDataTypeFromClassName(className) {
  const classInfo = alarmThresholdHandler.getClassInfo(className)
  return classInfo.dataType
}

// 移除手动定义的配置，改用动态计算
// 自动生成所有分类（过滤掉保留类）
const parameterClasses = Array.from(new Set(alarmThresholdHandler.ALL_ALARM_PARAM_R.map(x => x.class)))
  .filter(className => {
    const classLower = (className || '').toLowerCase()
    return !classLower.includes('保留') &&
           !classLower.includes('预留') &&
           !classLower.includes('跳过') &&
           !classLower.includes('skip')
  })
  .map(name => {
    // 使用新的getClassInfo方法获取分类信息
    const classInfo = alarmThresholdHandler.getClassInfo(name)
    // console.log(`[AlarmThreshold] 分类"${name}" 信息:`, classInfo)
    return {
      name,
      nameKey: classInfo.nameKey,
      byteOffset: classInfo.byteOffset,
      byteLength: classInfo.byteLength
    }
  })

// 页面配置对象 - 使用动态dataType替换
const alarmThresholdConfig = {
  dataSource: {
    name: 'ALARM_THRESHOLD',
    // 根据数据类型使用不同的topic模板
    readTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/{dataType}_r',
    writeTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/{dataType}_w',
    parameterFields: alarmThresholdHandler.ALL_ALARM_PARAM_R,
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount, className) => {
      // 优先使用传入的className，否则使用当前选中的分类
      const targetClassName = className || currentSelectedClass.value?.name
      // console.log(`[AlarmThreshold] 序列化参数: className=${targetClassName}`)

      if (!targetClassName) {
        // console.error('[AlarmThreshold] 序列化失败: 缺少分类名称')
        return null
      }
      
      return alarmThresholdHandler.serializeAlarmThresholdData(
        parameterDataFrame, 
        targetClassName,
        startByteOffset, 
        registerCount
      )
    },
    parameterClasses,
    // 动态dataType替换函数
    getDataType: (currentClassName) => getDataTypeFromClassName(currentClassName)
  }
}

// ========== 新增：多topic读取topic数组 ==========
const allReadTopics = ['cluster_dns_param', 'pack_dns_param', 'cell_dns_param'];



// 复用遥调核心
const {
  isCurrentlyReading,
  selectedCluster,
  clusterOptions,
  currentSelectedClass,
  currentClassParameterList,
  allAvailableClasses,
  switchToParameterClass,
  // startParameterReading, // 注释掉单topic读取
  stopParameterReading,
  startMultiTopicReading, // 新增多topic读取
  autoReadMultiTopicOnce, // 新增一次性自动读取
  sendCurrentClassParameters,
  updateParameterValue,
  getParameterInputValue,
  setParameterInputValue,
  getParameterDecimalPlaces,
  handleReceivedParameterData,
  handleParameterWriteResponse,
  handleParameterReadError
} = useRemoteControlCore(alarmThresholdConfig, toastService, {
  defaultData: DEFAULT_CLUSTER_DNS_PARAMS // 性能优化后重新启用
})

// 重试逻辑
const retryLogic = useRetryLogic(toastService, stopParameterReading)

// 定时器引用，用于清理
let autoReadTimer = null

// 性能优化：虚拟滚动替代分批渲染（已移除分批渲染逻辑）

// 带重试逻辑的多topic读取函数
function startMultiTopicReadingWithRetry() {
  retryLogic.startRetry()
  startMultiTopicReading(allReadTopics)
}

// MQTT事件处理 - 簇端报警参数
function handleClusterAlarmReadEvent(event, mqttMessage) {
  // 标记收到响应，停止超时检查（任意topic响应即可）
  retryLogic.markResponse()

  const parsedReadData = alarmThresholdHandler.parseAlarmThresholdReadResponse(mqttMessage)
  if (!parsedReadData) return
  if (parsedReadData.result?.error) {
    handleParameterReadError({
      ...mqttMessage,
      ...parsedReadData
    })
    return
  }
  if (parsedReadData.data) {
    handleReceivedParameterData({
      ...mqttMessage,
      ...parsedReadData
    })
  }
}

function handleClusterAlarmWriteEvent(event, mqttMessage) {
  const parsedWriteData = alarmThresholdHandler.parseAlarmThresholdWriteResponse(mqttMessage)
  handleParameterWriteResponse({
    ...mqttMessage,
    ...parsedWriteData,
    className: currentSelectedClass.value?.name || '簇端报警参数'
  })
}

// MQTT事件处理 - 包端报警参数
function handlePackAlarmReadEvent(event, mqttMessage) {
  const parsedReadData = alarmThresholdHandler.parseAlarmThresholdReadResponse(mqttMessage)
  if (!parsedReadData) return
  if (parsedReadData.result?.error) {
    handleParameterReadError({
      ...mqttMessage,
      ...parsedReadData
    })
    return
  }
  if (parsedReadData.data) {
    handleReceivedParameterData({
      ...mqttMessage,
      ...parsedReadData
    })
  }
}

function handlePackAlarmWriteEvent(event, mqttMessage) {
  const parsedWriteData = alarmThresholdHandler.parseAlarmThresholdWriteResponse(mqttMessage)
  handleParameterWriteResponse({
    ...mqttMessage,
    ...parsedWriteData,
    className: currentSelectedClass.value?.name || '包端报警参数'
  })
}

// MQTT事件处理 - 单体报警参数
function handleCellAlarmReadEvent(event, mqttMessage) {
  const parsedReadData = alarmThresholdHandler.parseAlarmThresholdReadResponse(mqttMessage)
  if (!parsedReadData) return
  if (parsedReadData.result?.error) {
    handleParameterReadError({
      ...mqttMessage,
      ...parsedReadData
    })
    return
  }
  if (parsedReadData.data) {
    handleReceivedParameterData({
      ...mqttMessage,
      ...parsedReadData
    })
  }
}

function handleCellAlarmWriteEvent(event, mqttMessage) {
  const parsedWriteData = alarmThresholdHandler.parseAlarmThresholdWriteResponse(mqttMessage)
  handleParameterWriteResponse({
    ...mqttMessage,
    ...parsedWriteData,
    className: currentSelectedClass.value?.name || '单体报警参数'
  })
}

onMounted(() => {
  // 先清理可能存在的旧监听器（防止快速切换导致的残留）
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('PACK_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('CELL_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_DNS_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('PACK_DNS_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('CELL_DNS_PARAM_W')

  window.electron.ipcRenderer.on('CLUSTER_DNS_PARAM_R', handleClusterAlarmReadEvent)
  window.electron.ipcRenderer.on('PACK_DNS_PARAM_R', handlePackAlarmReadEvent)
  window.electron.ipcRenderer.on('CELL_DNS_PARAM_R', handleCellAlarmReadEvent)
  window.electron.ipcRenderer.on('CLUSTER_DNS_PARAM_W', handleClusterAlarmWriteEvent)
  window.electron.ipcRenderer.on('PACK_DNS_PARAM_W', handlePackAlarmWriteEvent)
  window.electron.ipcRenderer.on('CELL_DNS_PARAM_W', handleCellAlarmWriteEvent)

  // 使用全局调度器避免多页面并发读取
  scheduleAutoRead(allReadTopics, 500, 'AlarmThreshold')
})

// keep-alive 激活时的处理
onActivated(() => {
  scheduleAutoRead(allReadTopics, 500, 'AlarmThreshold')
})

// keep-alive 失活时的处理
onDeactivated(() => {
  cancelAutoRead('AlarmThreshold')
  stopParameterReading()
})

onUnmounted(() => {
  // 取消统一调度器的待处理请求
  cancelAutoRead('AlarmThreshold')

  // 首先停止读取操作
  stopParameterReading()

  // 然后清理事件监听器
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('PACK_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('CELL_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_DNS_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('PACK_DNS_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('CELL_DNS_PARAM_W')

  // 清理重试逻辑资源
  retryLogic.cleanup()
})

// 性能优化：已移除分批渲染逻辑，改用DataTable内置虚拟滚动

// 获取参数备注说明
function getParameterRemarkText(parameterKey) {
  // 这里可以添加告警阈值参数的备注说明
  return '' // 暂时返回空字符串
}






</script>

<template>
  <div class="card">

    <!-- 固定表头区域 -->
    <div class="fixed-header">
      <!--操作按钮组 -->
      <div class="control-area mb-3">
        <div class="control-left">
          <div class="button-group">
            <Button
              :label="isCurrentlyReading ? t('alarmThreshold.buttons.stopReading') : t('alarmThreshold.buttons.startReading')"
              @click="() => {
                if (isCurrentlyReading) {
                  stopParameterReading()
                } else {
                  startMultiTopicReadingWithRetry()
                }
              }"
              :severity="isCurrentlyReading ? 'danger' : 'primary'"
              size="small"
            />
            <Button
              :label="t('alarmThreshold.buttons.sendParameters')"
              @click="sendCurrentClassParameters"
              :disabled="isCurrentlyReading || !currentSelectedClass"
              severity="warning"
              size="small"
            />
          </div>
        </div>
      </div>

      <!--参数分类切换标签 -->
      <div class="class-tabs">
        <Button
          v-for="parameterClass in allAvailableClasses"
          :key="parameterClass.name"
          :label="parameterClass.nameKey ? t(parameterClass.nameKey) : parameterClass.name"
          @click="switchToParameterClass(parameterClass.name)"
          :severity="currentSelectedClass?.name === parameterClass.name ? 'primary' : 'secondary'"
          :outlined="currentSelectedClass?.name !== parameterClass.name"
          size="small"
          class="class-tab-button"
        />
      </div>
    </div>

    <!-- 当前分类的参数数据表格 - 使用翻译后的参数列表 -->
    <DataTable
      :value="translatedParameterList"
      class="p-datatable-sm"
      :show-gridlines="true"
      scrollable
      tableStyle="min-width: 50rem"
    >
      <!-- 参数名称列 -->
      <Column :header="t('alarmThreshold.table.parameterName')" style="width: 250px" :frozen="true">
        <template #body="slotProps">
          <div
            class="font-medium"
            :class="{
              // 颜色判断：优先基于 originalLabel 的中文关键词；兼容英文（Severe/General/Minor）
              'text-red-600': (slotProps.data.originalLabel || slotProps.data.label || '').includes('严重') || (slotProps.data.label || '').includes('Severe'),
              'text-yellow-600': (slotProps.data.originalLabel || slotProps.data.label || '').includes('一般') || (slotProps.data.label || '').includes('General'),
              'text-cyan-600': (slotProps.data.originalLabel || slotProps.data.label || '').includes('轻微') || (slotProps.data.label || '').includes('Minor')
            }"
          >
            {{ slotProps.data.label }}
          </div>
        </template>
      </Column>

      <!-- 参数值编辑列 -->
      <Column :header="t('alarmThreshold.table.parameterValue')" style="width: 150px">
        <template #body="slotProps">
          <InputNumber
            :model-value="getParameterInputValue(slotProps.data, slotProps.data.currentValue)"
            @update:model-value="(inputValue) => updateParameterValue(slotProps.data.key, setParameterInputValue(slotProps.data, inputValue))"
            :disabled="isCurrentlyReading"
            :step="slotProps.data.scale ? 1/slotProps.data.scale : 1"
            :min-fraction-digits="getParameterDecimalPlaces(slotProps.data)"
            :max-fraction-digits="getParameterDecimalPlaces(slotProps.data)"
            size="small"
            class="w-full"
          />
        </template>
      </Column>

      <!-- 参数单位列 -->
      <Column :header="t('alarmThreshold.table.unit')" style="width: 80px">
        <template #body="slotProps">
          <div>
            {{ slotProps.data.unit || '-' }}
          </div>
        </template>
      </Column>

      <!-- 参数备注列 -->
      <Column :header="t('alarmThreshold.table.remarks')" style="width: 300px">
        <template #body="slotProps">
          <div class="text-sm whitespace-pre-line">
            {{ getParameterRemarkText(slotProps.data.key) }}
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
/* 固定表头样式 */
.fixed-header {
  position: sticky;
  top: 40px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--surface-card);
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
  margin-bottom: 1rem;
}

.control-area {
  display: flex;
  align-items: flex-start;
}

.control-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
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

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
</style>