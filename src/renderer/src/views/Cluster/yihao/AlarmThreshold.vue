// (HTTP改造版)
<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted,computed } from 'vue'
import { useRemoteControlCore } from '@/composables/useRemoteControlCore'
import { useAlarmThreshold } from '@/composables/useAlarmThreshold'
import { usePageTypeDetection } from '@/composables/usePageTypeDetection'
// 已移除 PrimeVue 组件导入，使用原生 HTML 元素
import Toast from 'primevue/toast'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
const toastService = useToast()
const alarmThresholdHandler = useAlarmThreshold()
const { addPageTypeMapping } = usePageTypeDetection()

addPageTypeMapping('/Cluster/AlarmThreshold', 'cluster')

// 根据分类名称动态确定数据类型
function getDataTypeFromClassName(className) {
  return alarmThresholdHandler.getDataTypeByClassName(className)
}

const parameterClasses = Array.from(new Set(alarmThresholdHandler.ALL_ALARM_PARAM_R.map(x => x.class)))
  .filter(className => {
    const classLower = (className || '').toLowerCase()
    return !classLower.includes('保留') && !classLower.includes('跳过')
  })
  .map(name => {
    // 使用新的getClassInfo方法获取分类信息
    const classInfo = alarmThresholdHandler.getClassInfo(name)
    // console.log(`[AlarmThreshold] 分类"${name}" 信息:`, classInfo)
    return {
      name,
      nameKey: classInfo.nameKey
    }
  })


// 动态计算当前分类的数据类型
const currentDataType = computed(() => {
  if (currentSelectedClass.value) {
    return getDataTypeFromClassName(currentSelectedClass.value.name)
  }
  return 'cluster_dns_param' // 默认值
})
// const WriteClasses = alarmThresholdHandler.ALL_ALARM_PARAM_R.filter(item => item.class === cls.name)

const WriteClasses= {
      '簇端电压':`ClusterAlamVolt`,
      '电流':`ClusterAlamCur`,
      '绝缘电阻':`ClusterAlamInsulation`,
      '簇端温度':`ClusterAlamTemp`,
      'BMU电压':`ClusterAlamPackVolt`, 
      'BMU温度':`ClusterAlamPackBoardTemp`, 
      '接插件温度':`ClusterAlamPlug`, 
      '单体电压':`ClusterAlamCellVolt`, 
      '单体温度':`ClusterAlamCellTemp`, 
      '单体SOC':`ClusterAlamCellSoc`, 
      '单体SOH':`ClusterAlamCellSoh`
    }
// 页面配置对象
const alarmThresholdConfig = {
  dataSource: {
    name: 'ALARM_THRESHOLD',
    dataType: currentDataType, // dataType现在是一个计算属性
    parameterFields: alarmThresholdHandler.ALL_ALARM_PARAM_R,
    parameterSerializer: (parameterDataFrame, startByteOffset, registerCount, className) => {
      const targetClassName = className || currentSelectedClass.value?.name
      return alarmThresholdHandler.serializeAlarmThresholdData(
        parameterDataFrame,
        targetClassName,
        startByteOffset,
        registerCount
      )
    },
    parameterClasses,
    WriteClasses
  }
}

// 复用遥调核心
const {
  isLoading,
  isWriting,
  currentSelectedClass,
  currentClassParameterList,
  allAvailableClasses,
  switchToParameterClass,
  handleReadRequest,
  stopParameterReading,
  handleWriteRequest,
  updateParameterValue,
  getParameterInputValue,
  setParameterInputValue,
  getParameterDecimalPlaces,
} = useRemoteControlCore(alarmThresholdConfig, toastService)

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
onMounted(() => {
  console.log('[AlarmThreshold] 页面挂载')

  // TODO: 写操作的响应，未来应由发送请求的函数直接处理，而不是在此处监听。

  // ========== 自动读取功能 ==========
  // 等待监听器完全注册后，自动读取一次所有topic的数据
  setTimeout(() => {
    console.log('[AlarmThreshold] 开始自动读取参数数据')
    handleReadRequest('first');
  }, 600) // 延迟确保监听器完全就绪
})

onUnmounted(() => {
  console.log('[AlarmThreshold] 页面卸载，停止读取并清理资源')

  // 首先停止读取操作
  stopParameterReading()

  console.log('[AlarmThreshold] 页面卸载完成')
})

// 备注功能（保持不变）
function getParameterRemarkText(parameterKey) {
  return ''
}
</script>

<template>
  <div class="card">
    <Toast />

    <!-- 控制操作区域 -->
    <div class="control-area mb-4">
      <div class="control-left">
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
            {{ isLoading ? t('alarmThreshold.buttons.stopReading') : t('alarmThreshold.buttons.startReading') }}
          </button>
          <button
            @click="() => handleWriteRequest()"
            :disabled="isLoading || !currentSelectedClass || isWriting"
            class="btn btn-warning"
          >
            {{ isWriting ? t('common.sending') : t('alarmThreshold.buttons.sendParameters') }}
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
        {{ parameterClass.nameKey ? t(parameterClass.nameKey) : parameterClass.name }}
      </button>
    </div>

    <!-- 原生HTML表格 -->
    <div class="table-container">
      <table class="native-table">
        <thead>
          <tr>
            <th style="width: 250px">{{ t('alarmThreshold.table.parameterName') }}</th>
            <th style="width: 150px">{{ t('alarmThreshold.table.parameterValue') }}</th>
            <th style="width: 80px">{{ t('alarmThreshold.table.unit') }}</th>
            <th style="width: 300px">{{ t('alarmThreshold.table.remarks') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="param in translatedParameterList" :key="param.key">
            <td>
              <div
                class="font-medium"
                :class="{
                  'text-red': (param.originalLabel || param.label || '').includes('严重') || (param.label || '').includes('Severe'),
                  'text-yellow': (param.originalLabel || param.label || '').includes('一般') || (param.label || '').includes('General'),
                  'text-cyan': (param.originalLabel || param.label || '').includes('轻微') || (param.label || '').includes('Minor')
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
              {{ t('alarmThreshold.noData') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.control-area, .control-left, .button-group, .class-tabs {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.class-tabs { flex-wrap: wrap; }
.class-tab-button { min-width: 100px; }

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
.whitespace-pre-line {
  white-space: pre-line;
}
.mb-4 {
  margin-bottom: 1rem;
}
</style>