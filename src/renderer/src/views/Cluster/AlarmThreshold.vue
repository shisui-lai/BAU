<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRemoteControlCore } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { useAlarmThreshold } from '@/composables/core/data-processing/parameter-management/useAlarmThreshold'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import Toast from 'primevue/toast'

const toastService = useToast()
const alarmThresholdHandler = useAlarmThreshold()

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
    console.log(`[AlarmThreshold] 分类"${name}" 信息:`, classInfo)
    return {
      name,
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
      console.log(`[AlarmThreshold] 序列化参数: className=${targetClassName}`)
      
      if (!targetClassName) {
        console.error('[AlarmThreshold] 序列化失败: 缺少分类名称')
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
} = useRemoteControlCore(alarmThresholdConfig, toastService)

// MQTT事件处理 - 簇端报警参数
function handleClusterAlarmReadEvent(event, mqttMessage) {
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
  console.log('[AlarmThreshold] 页面挂载，开始监听告警阈值事件')

  // 先清理可能存在的旧监听器（防止快速切换导致的残留）
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('PACK_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('CELL_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_DNS_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('PACK_DNS_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('CELL_DNS_PARAM_W')
  console.log('[AlarmThreshold] 预清理完成，开始注册新监听器')

  window.electron.ipcRenderer.on('CLUSTER_DNS_PARAM_R', handleClusterAlarmReadEvent)
  window.electron.ipcRenderer.on('PACK_DNS_PARAM_R', handlePackAlarmReadEvent)
  window.electron.ipcRenderer.on('CELL_DNS_PARAM_R', handleCellAlarmReadEvent)
  window.electron.ipcRenderer.on('CLUSTER_DNS_PARAM_W', handleClusterAlarmWriteEvent)
  window.electron.ipcRenderer.on('PACK_DNS_PARAM_W', handlePackAlarmWriteEvent)
  window.electron.ipcRenderer.on('CELL_DNS_PARAM_W', handleCellAlarmWriteEvent)
  console.log('[AlarmThreshold] 告警阈值监听器注册完成')

  // ========== 自动读取功能 ==========
  // 等待监听器完全注册后，自动读取一次所有topic的数据
  setTimeout(() => {
    console.log('[AlarmThreshold] 开始自动读取告警阈值数据')
    autoReadMultiTopicOnce(allReadTopics)
  }, 300) // 延迟300ms确保监听器完全就绪（优化：减少延迟）
})

onUnmounted(() => {
  console.log('[AlarmThreshold] 页面卸载，停止读取并清理资源')

  // 首先停止读取操作
  stopParameterReading()

  // 然后清理事件监听器
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('PACK_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('CELL_DNS_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_DNS_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('PACK_DNS_PARAM_W')
  window.electron.ipcRenderer.removeAllListeners('CELL_DNS_PARAM_W')

  console.log('[AlarmThreshold] 页面卸载完成')
})

// 获取参数备注说明
function getParameterRemarkText(parameterKey) {
  // 这里可以添加告警阈值参数的备注说明
  return '' // 暂时返回空字符串
}
</script>

<template>
  <div class="card">
    <Toast />
    
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
                startMultiTopicReading(allReadTopics)
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

    <!-- 参数分类切换标签 -->
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

    <!-- 当前分类的参数数据表格 -->
    <DataTable 
      :value="currentClassParameterList"
      class="p-datatable-sm"
      :scrollable="true"
      scroll-height="600px"
      :show-gridlines="true"
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
  min-width: 100px;
}
</style>