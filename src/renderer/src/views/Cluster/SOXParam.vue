<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { scheduleAutoRead, cancelAutoRead } from '@/composables/utils/useAutoReadScheduler'
import { useRetryLogic } from '@/composables/utils/useRetryLogic'
import { useRemoteControlCore } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { useSOXParam } from '@/composables/core/data-processing/parameter-management/useSOXParam'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import Toast from 'primevue/toast'

const toastService = useToast()
const soxParamHandler = useSOXParam()

// 页面类型检测 - 设置为cluster类型以显示下发多选框
const { addPageTypeMapping } = usePageTypeDetection()

// 添加SOX参数页面的类型映射
addPageTypeMapping('/Cluster/SOXParam', 'cluster')

// 根据分类名称确定数据类型
function getDataTypeFromClassName(className) {
  // 实时SOX数据的三个分类都属于real_time_save这个topic
  if (['实时SOC', '实时SOH', '实时SOE'].includes(className)) {
    return 'real_time_save'
  }
  const classInfo = soxParamHandler.getClassInfo(className)
  return classInfo.dataType
}

// 计算实时SOX数据三个分类的偏移和长度
function calculateRealTimeSOXClassInfo() {
  const realTimeFields = soxParamHandler.ALL_SOX_PARAM_R.filter(field =>
    ['实时SOC', '实时SOH', '实时SOE'].includes(field.class)
  )

  const classes = ['实时SOC', '实时SOH', '实时SOE']
  const classInfos = []

  let currentOffset = 0

  for (const className of classes) {
    const classFields = realTimeFields.filter(field => field.class === className)
    let classLength = 0

    for (const field of classFields) {
      const typeByteMap = {
        'u8': 1, 's8': 1, 'u16': 2, 's16': 2,
        'u32': 4, 's32': 4, 'f32': 4
      }
      const fieldSize = typeByteMap[field.type] || 2
      const count = field.count || 1
      classLength += fieldSize * count
    }

    classInfos.push({
      name: className,
      byteOffset: currentOffset,
      byteLength: classLength
    })

    currentOffset += classLength
  }

  return classInfos
}

// 生成所有分类配置
const realTimeSOXClasses = calculateRealTimeSOXClassInfo()

// 获取其他topic的分类
const otherClasses = Array.from(new Set(soxParamHandler.ALL_SOX_PARAM_R.map(x => x.class)))
  .filter(className => {
    const classLower = (className || '').toLowerCase()
    return !['实时SOC', '实时SOH', '实时SOE'].includes(className) &&
           !classLower.includes('保留') &&
           !classLower.includes('预留') &&
           !classLower.includes('跳过') &&
           !classLower.includes('skip')
  })
  .map(name => {
    const classInfo = soxParamHandler.getClassInfo(name)
    return {
      name,
      byteOffset: classInfo.byteOffset,
      byteLength: classInfo.byteLength
    }
  })

// 合并所有分类
const parameterClasses = [...realTimeSOXClasses, ...otherClasses]

// console.log('[SOXParam] 分类配置:', parameterClasses)

// 页面配置对象 - 使用动态dataType替换
const soxParamConfig = {
  dataSource: {
    name: 'SOX_PARAM',
    // 根据数据类型使用不同的topic模板
    readTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/{dataType}_r',
    writeTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/{dataType}_w',
    parameterFields: soxParamHandler.ALL_SOX_PARAM_R,
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount, className) => {
      // 优先使用传入的className，否则使用当前选中的分类
      const targetClassName = className || currentSelectedClass.value?.name
      // console.log(`[SOXParam] 序列化参数: className=${targetClassName}`)

      if (!targetClassName) {
        // console.error('[SOXParam] 序列化失败: 缺少分类名称')
        return null
      }

      // 对于实时SOX数据的三个分类，使用特殊的序列化逻辑
      if (['实时SOC', '实时SOH', '实时SOE'].includes(targetClassName)) {
        // 使用通用序列化函数，传入real_time_save的参数表
        const realTimeFields = soxParamHandler.ALL_SOX_PARAM_R.filter(field =>
          ['实时SOC', '实时SOH', '实时SOE'].includes(field.class)
        )
        return soxParamHandler.serializeParameterData(
          parameterDataFrame,
          realTimeFields,
          startByteOffset,
          registerCount,
          '[SOXParam]',
          `实时SOX数据-${targetClassName}`
        )
      }

      // 其他分类使用原有逻辑
      return soxParamHandler.serializeSOXParamData(
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
const allReadTopics = ['real_time_save', 'sox_cfg_param', 'soc_cfg_param', 'soh_cfg_param'];

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
} = useRemoteControlCore(soxParamConfig, toastService)

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

// MQTT事件处理 - 实时SOX数据
function handleRealTimeSaveReadEvent(event, mqttMessage) {
  // 标记收到响应，停止超时检查（任意topic响应即可）
  retryLogic.markResponse()

  const parsedReadData = soxParamHandler.parseSOXParamReadResponse(mqttMessage)
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

function handleRealTimeSaveWriteEvent(event, mqttMessage) {
  const parsedWriteData = soxParamHandler.parseSOXParamWriteResponse(mqttMessage)
  handleParameterWriteResponse({
    ...mqttMessage,
    ...parsedWriteData,
    className: currentSelectedClass.value?.name || '实时SOX数据'
  })
}

// MQTT事件处理 - SOX通用参数
function handleSOXCfgParamReadEvent(event, mqttMessage) {
  const parsedReadData = soxParamHandler.parseSOXParamReadResponse(mqttMessage)
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

function handleSOXCfgParamWriteEvent(event, mqttMessage) {
  const parsedWriteData = soxParamHandler.parseSOXParamWriteResponse(mqttMessage)
  handleParameterWriteResponse({
    ...mqttMessage,
    ...parsedWriteData,
    className: currentSelectedClass.value?.name || 'SOX通用参数'
  })
}

// MQTT事件处理 - SOC算法参数
function handleSOCCfgParamReadEvent(event, mqttMessage) {
  const parsedReadData = soxParamHandler.parseSOXParamReadResponse(mqttMessage)
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

function handleSOCCfgParamWriteEvent(event, mqttMessage) {
  const parsedWriteData = soxParamHandler.parseSOXParamWriteResponse(mqttMessage)
  handleParameterWriteResponse({
    ...mqttMessage,
    ...parsedWriteData,
    className: currentSelectedClass.value?.name || 'SOC算法参数'
  })
}

// MQTT事件处理 - SOH算法参数
function handleSOHCfgParamReadEvent(event, mqttMessage) {
  const parsedReadData = soxParamHandler.parseSOXParamReadResponse(mqttMessage)
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

function handleSOHCfgParamWriteEvent(event, mqttMessage) {
  const parsedWriteData = soxParamHandler.parseSOXParamWriteResponse(mqttMessage)
  handleParameterWriteResponse({
    ...mqttMessage,
    ...parsedWriteData,
    className: currentSelectedClass.value?.name || 'SOH算法参数'
  })
}

onMounted(() => {
  // 先清理可能存在的旧监听器（防止快速切换导致的残留）
  window.electron.ipcRenderer.removeAllListeners('REAL_TIME_SAVE_R')
  window.electron.ipcRenderer.removeAllListeners('SOX_CFG_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('SOC_CFG_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('SOH_CFG_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('REAL_TIME_SAVE_W')
  window.electron.ipcRenderer.removeAllListeners('SOX_CFG_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('SOC_CFG_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('SOH_CFG_PARAM_W')

  window.electron.ipcRenderer.on('REAL_TIME_SAVE_R', handleRealTimeSaveReadEvent)
  window.electron.ipcRenderer.on('SOX_CFG_PARAM_R', handleSOXCfgParamReadEvent)
  window.electron.ipcRenderer.on('SOC_CFG_PARAM_R', handleSOCCfgParamReadEvent)
  window.electron.ipcRenderer.on('SOH_CFG_PARAM_R', handleSOHCfgParamReadEvent)
  window.electron.ipcRenderer.on('REAL_TIME_SAVE_W', handleRealTimeSaveWriteEvent)
  window.electron.ipcRenderer.on('SOX_CFG_PARAM_W', handleSOXCfgParamWriteEvent)
  window.electron.ipcRenderer.on('SOC_CFG_PARAM_W', handleSOCCfgParamWriteEvent)
  window.electron.ipcRenderer.on('SOH_CFG_PARAM_W', handleSOHCfgParamWriteEvent)

  // 使用全局调度器避免多页面并发读取
  scheduleAutoRead(allReadTopics, 600, 'SOXParam')
})

// keep-alive 激活时的处理
onActivated(() => {
  scheduleAutoRead(allReadTopics, 600, 'SOXParam')
})

// keep-alive 失活时的处理
onDeactivated(() => {
  cancelAutoRead('SOXParam')
  stopParameterReading()
})

onUnmounted(() => {
  // 取消统一调度器的待处理请求
  cancelAutoRead('SOXParam')

  // 首先停止读取操作
  stopParameterReading()

  // 然后清理事件监听器
  window.electron.ipcRenderer.removeAllListeners('REAL_TIME_SAVE_R')
  window.electron.ipcRenderer.removeAllListeners('SOX_CFG_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('SOC_CFG_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('SOH_CFG_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('REAL_TIME_SAVE_W')
  window.electron.ipcRenderer.removeAllListeners('SOX_CFG_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('SOC_CFG_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('SOH_CFG_PARAM_W')

  // 清理重试逻辑资源
  retryLogic.cleanup()
})


// 获取参数备注说明
function getParameterRemarkText(parameterKey) {
  // 这里可以添加SOX参数的备注说明
  return '' // 暂时返回空字符串
}


</script>

<template>
  <div class="card">
    
    <!-- 控制操作区域 -->
    <div class="control-area mb-4">
      <div class="control-left">
          
        <!-- 操作按钮组 -->
        <div class="button-group">
          <Button
            :label="isCurrentlyReading ? '停止读取' : '开始读取'"
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
            label="下发参数"
            @click="sendCurrentClassParameters"
            :disabled="isCurrentlyReading || !currentSelectedClass"
            severity="warning"
            size="small"
          />
        </div>
      </div>
    </div>

    <!-- 参数分类切换按钮 -->
    <div class="class-tabs mb-4">
      <Button
        v-for="parameterClass in allAvailableClasses"
        :key="parameterClass.name"
        :label="parameterClass.name"
        @click="switchToParameterClass(parameterClass.name)"
        :severity="currentSelectedClass?.name === parameterClass.name ? 'primary' : 'secondary'"
        :outlined="currentSelectedClass?.name !== parameterClass.name"
        size="small"
        class="class-tab-button"
      />
    </div>

    <!-- 当前分类的参数数据表格 - 直接渲染 -->
    <DataTable
      :value="currentClassParameterList"
      class="p-datatable-sm"
      :show-gridlines="true"
      scrollable
      tableStyle="min-width: 50rem"
    >
      <!-- 参数名称列 -->
      <Column header="参数名称" style="width: 250px" :frozen="true">
        <template #body="slotProps">
          <div>
            <div class="font-medium">{{ slotProps.data.label }}</div>
            <div class="text-xs text-gray-500">{{ slotProps.data.key }}</div>
          </div>
        </template>
      </Column>

      <!-- 参数值编辑列 -->
      <Column header="参数值" style="width: 150px">
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
      <Column header="单位" style="width: 80px">
        <template #body="slotProps">
          <div class="text-gray-600">
            {{ slotProps.data.unit || '-' }}
          </div>
        </template>
      </Column>

      <!-- 参数备注列 -->
      <Column header="备注说明" style="width: 300px">
        <template #body="slotProps">
          <div class="text-sm text-gray-600 whitespace-pre-line">
            {{ getParameterRemarkText(slotProps.data.key) }}
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
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
  min-width: 120px;
  transition: all 0.2s ease;
}

.class-tab-button:hover {
  transform: translateY(-1px);
}
</style>
