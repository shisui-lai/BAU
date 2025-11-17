<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRemoteControlCore } from '@/composables/useRemoteControlCore'
import { useSOXParam } from '@/composables/useSOXParam'
import { usePageTypeDetection } from '@/composables/usePageTypeDetection'
// 已移除 PrimeVue 组件导入，使用原生 HTML 元素
import Toast from 'primevue/toast'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
const toastService = useToast()
const soxParamHandler = useSOXParam()

// 页面类型检测 - 设置为cluster类型以显示下发多选框
const { addPageTypeMapping } = usePageTypeDetection()

// 添加SOX参数页面的类型映射
addPageTypeMapping('/Cluster/SOXParam', 'cluster')

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

const WriteClasses= {
      '实时SOC':`RTSOC`,
      '实时SOH':`RTSOH`,
      '实时SOE':`RTSOE`,
      '实时SOX数据':`SOXData`,
      'SOX通用参数':`SOXParam`,
      'SOC算法参数':`SOCParam`,
      'SOH算法参数':`SOHParam`
    }
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
      console.log(`[SOXParam] 序列化参数: className=${targetClassName}`)
      
      if (!targetClassName) {
        console.error('[SOXParam] 序列化失败: 缺少分类名称')
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
    getDataType: (currentClassName) => getDataTypeFromClassName(currentClassName),

    WriteClasses
  }
}

// ========== 新增：多topic读取topic数组 ==========
const allReadTopics = ['real_time_save', 'sox_cfg_param', 'soc_cfg_param', 'soh_cfg_param'];

// 复用遥调核心
const {
  isLoading,
  isWriting,
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
  handleReadRequest,
  handleWriteRequest,
  sendCurrentClassParameters,
  updateParameterValue,
  getParameterInputValue,
  setParameterInputValue,
  getParameterDecimalPlaces,
  handleReceivedParameterData,
  handleParameterWriteResponse,
  handleParameterReadError
} = useRemoteControlCore(soxParamConfig, toastService)

// MQTT事件处理 - 实时SOX数据
function handleRealTimeSaveReadEvent(event, mqttMessage) {
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
// 直接使用label翻译函数
const getLabelTranslation = (label) => {
  if (locale.value === 'zh') return label
  return te(`config.soxParam.label.${label}`) 
    ? t(`config.soxParam.label.${label}`) 
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
  console.log('[SOXParam] 页面挂载')

  // TODO: 写操作的响应，未来应由发送请求的函数直接处理，而不是在此处监听。

  // ========== 自动读取功能 ==========
  // 等待监听器完全注册后，自动读取一次所有topic的数据
  setTimeout(() => {
    console.log('[SOXParam] 开始自动读取SOX参数数据')
    handleReadRequest('first')
  }, 600) // 延迟确保监听器完全就绪
})

onUnmounted(() => {
  console.log('[SOXParam] 页面卸载，停止读取并清理资源')

  // 首先停止读取操作
  stopParameterReading()

  console.log('[SOXParam] 页面卸载完成')
})

// 获取参数备注说明
function getParameterRemarkText(parameterKey) {
  // 这里可以添加SOX参数的备注说明
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
          <button
            @click="() => {
              if (isLoading) {
                stopParameterReading()
              } else {
                handleReadRequest('once')
              }
            }"
            :class="['btn', isLoading ? 'btn-danger' : 'btn-primary']"
          >
            {{ isLoading ? t('soxParam.buttons.stopReading') : t('soxParam.buttons.startReading') }}
          </button>
          <button
            v-if="!['实时SOH', '实时SOE'].includes(currentSelectedClass.name)"
            @click="handleWriteRequest"
            :disabled="isLoading || !currentSelectedClass || isWriting"
            class="btn btn-warning"
          >
            {{ isWriting ? t('common.sending') : t('soxParam.buttons.sendParameters') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 参数分类切换标签 -->
    <div class="class-tabs mb-4">
      <button
        v-for="parameterClass in allAvailableClasses"
        :key="parameterClass.name"
        @click="switchToParameterClass(parameterClass.name)"
        :class="[
          'btn',
          'class-tab-button',
          currentSelectedClass?.name === parameterClass.name ? 'btn-primary' : 'btn-secondary'
        ]"
      >
        {{ t('soxParam.parameterClasses.' + parameterClass.name) }}
      </button>
    </div>

    <!-- 原生HTML表格 -->
    <div class="table-container">
      <table class="native-table">
        <thead>
          <tr>
            <th style="width: 250px">{{ t('soxParam.table.parameterName') }}</th>
            <th style="width: 150px">{{ t('soxParam.table.parameterValue') }}</th>
            <th style="width: 80px">{{ t('soxParam.table.unit') }}</th>
            <th style="width: 300px">{{ t('soxParam.table.remarks') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="param in translatedParameterList" :key="param.key">
            <td>
              <div class="font-medium">{{ param.label }}</div>
            </td>
            <td>
              <input
                type="number"
                :value="getParameterInputValue(param, param.currentValue)"
                @input="(e) => updateParameterValue(param.key, setParameterInputValue(param, parseFloat(e.target.value)))"
                :disabled="isLoading"
                :step="param.scale ? 1/param.scale : 1"
                class="input-control"
              />
            </td>
            <td>{{ param.unit || '-' }}</td>
            <td>
              <div class="text-sm whitespace-pre-line">
                {{ getParameterRemarkText(param.key) }}
              </div>
            </td>
          </tr>
          <tr v-if="!translatedParameterList || translatedParameterList.length === 0">
            <td colspan="4" class="empty-message">
              {{ t('soxParam.noData') }}
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
}
.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}
.btn-warning {
  background-color: #ffc107;
  color: #212529;
}
.btn-warning:hover:not(:disabled) {
  background-color: #e0a800;
}

/* 表格样式 */
.table-container {
  overflow-x: auto;
}
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

/* 工具类 */
.font-medium {
  font-weight: 500;
}
.text-sm {
  font-size: 0.875rem;
}
.whitespace-pre-line {
  white-space: pre-line;
}
.mb-4 {
  margin-bottom: 1rem;
}
</style>
