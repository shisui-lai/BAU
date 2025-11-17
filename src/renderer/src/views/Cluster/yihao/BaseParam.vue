// 系统基本配置参数页面 - 支持参数分类切换和分组下发 (HTTP改造版)
<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted, computed } from 'vue'
import { SYS_BASE_PARAM_R } from '../../../../main/table.js'
import { useRemoteControlCore } from '@/composables/useRemoteControlCore'
import { useSysBaseParam } from '@/composables/useSysBaseParam'
import { BASE_PARAM_REMARKS } from '@/configs/Remarks'
// 已移除 PrimeVue 组件导入，使用原生 HTML 元素
import Toast from 'primevue/toast'
import { useI18n } from 'vue-i18n'

const { t, locale, te } = useI18n()

// 直接使用label翻译函数
const getLabelTranslation = (label) => {
  if (locale.value === 'zh') return label
  return te(`config.clusterConfigParam.label.${label}`) 
    ? t(`config.clusterConfigParam.label.${label}`) 
    : label
}
const getdropdownLabel = (data) => {
  if (locale.value === 'zh') return data.options
  return data.options.map(option => ({
        ...option,
        label: gettranslate(option.label,data.label)
      }));
}
const gettranslate = (label,category) => {
  if (locale.value === 'zh') return label
  return te(`clusterConfigParam.dropdownOptions.${category}.${label}`) 
    ? t(`clusterConfigParam.dropdownOptions.${category}.${label}`) 
    : label
}
// 备注翻译函数
const getRemarksTranslation = (remarks) => {
  if (locale.value === 'zh') return remarks
  return te(`config.clusterConfigParam.remarks.${remarks}`) 
    ? t(`config.clusterConfigParam.remarks.${remarks}`) 
    : remarks
}

const toastService = useToast()
const systemBaseParamHandler = useSysBaseParam()

function getDataTypeFromClassName(className) {
  if(className === '出厂校正参数'){
    return 'factoty_calibr_param'
  }else{
    return 'sys_base_param'
  }
}


// 📋 系统基本参数配置
const systemBaseParamConfig = {
  dataSource: {
    name: 'SYS_BASE_PARAM',
    dataType: 'sys_base_param',
    parameterFields: SYS_BASE_PARAM_R, //FACTORY_CALIB_PARAM_R
    parameterSerializer: systemBaseParamHandler.serializeSystemBaseParamData,
    parameterClasses: [                                                 // 参数分类配置
      {
        name: 'BMU配置',
        nameKey: 'clusterConfigParam.parameterClasses.bmuConfig',
        byteOffset: 0,      // 起始字节偏移：寄存器0开始
        byteLength: 132,    // 字节长度：BMU配置 + 虚拟电池位移，总共66个u16寄存器 = 132字节
      },
      {
        name: '类型选择',
        nameKey: 'clusterConfigParam.parameterClasses.typeSelection',
        byteOffset: 164,    // 起始字节偏移：跳过32字节预留 = 寄存器82开始
        byteLength: 20,     // 字节长度：10个类型选择参数，每个u16 = 20字节
        hiddenFields: ['SpecialFuncEnable']  // 隐藏特殊功能使能位配置寄存器，只显示解析出的bit位字段
      },
      {
        name: '基础设置',
        nameKey: 'clusterConfigParam.parameterClasses.basicSettings',
        byteOffset: 186,    // 起始字节偏移：跳过4字节预留 = 寄存器93开始
        byteLength: 16      // 字节长度：8个基础设置参数，每个u16 = 16字节
      },
      {
        name: '空调阈值',
        nameKey: 'clusterConfigParam.parameterClasses.airConditioningThreshold',
        byteOffset: 210,    // 起始字节偏移：跳过8字节预留 = 寄存器105开始
        byteLength: 12      // 字节长度：6个温度阈值参数，每个s16 = 12字节
      },
      {
        name: '通信设置',
        nameKey: 'clusterConfigParam.parameterClasses.communicationSettings',
        byteOffset: 230,    // 起始字节偏移：跳过8字节预留 = 寄存器115开始
        byteLength: 18      // 字节长度：9个通信参数，每个u16 = 18字节
      },
      {
        name: '电流传感器',
        nameKey: 'clusterConfigParam.parameterClasses.currentSensor',
        byteOffset: 256,    // 起始字节偏移：跳过8字节预留 = 寄存器128开始
        byteLength: 8       // 字节长度：4个传感器参数，每个u16 = 8字节
      },
      {
        name: '电池信息',
        nameKey: 'clusterConfigParam.parameterClasses.batteryInfo',
        byteOffset: 268,    // 起始字节偏移：跳过4字节预留 = 寄存器134开始
        byteLength: 6       // 字节长度：3个电池信息参数，每个u16 = 6字节
      },
      {
        name: '均衡参数',
        nameKey: 'clusterConfigParam.parameterClasses.balanceParams',
        byteOffset: 296,    // 起始字节偏移：跳过8字节预留 = 寄存器148开始
        byteLength: 22      // 字节长度：11个均衡参数，包含s16和u16 = 22字节
      },
      { name: '出厂校正参数', nameKey: 'clusterConfigParam.parameterClasses.deviceFactoryInfo',byteOffset: 0, byteLength: 94 }
    ],
    WriteClasses: {
      'BMU配置':'SysParamBMU',
      '类型选择':'SysParamType',
      '基础设置':'SysParamBase',
      '空调阈值':'SysParamAircondition',
      '通信设置':'SysParamCom', 
      '电流传感器':'SysParamCurrentSensor', 
      '电池信息':'SysParamBattery', 
      '均衡参数':'SysParamBalance',
      '出厂校正参数':'FactotyCalibrParam'
    }
  },
  getDataType: (currentClassName) => getDataTypeFromClassName(currentClassName)
}

// 使用通用遥调核心功能
const {
  isLoading,
  isWriting,
  currentSelectedClass,
  allAvailableClasses,
  switchToParameterClass,
  handleReadRequest,
  stopParameterReading,
  handleWriteRequest,
  updateParameterValue,
  getParameterInputValue,
  setParameterInputValue,
  getParameterDecimalPlaces,
  isParameterDropdown,
  getParameterDropdownOptions,
  updateDropdownParameterValue,
  enhancedParameterList
} = useRemoteControlCore(systemBaseParamConfig, toastService)

// ================== 事件处理方法 ==================
function getParameterClass(parameterClass){
  return parameterClass.nameKey ? t(parameterClass.nameKey) : parameterClass.name
}
/**
 * 【修复】处理下拉框更新事件
 * @param {string} parameterKey - 参数的key
 * @param {Array} options - 该下拉框的所有选项
 * @param {*} newValue - 选中的新值
 */
function handleDropdownUpdate(parameterKey, options, newValue) {
  const selectedOption = options.find(opt => opt.value === newValue)
  updateDropdownParameterValue(parameterKey, selectedOption)
}
const defal={
  // 生产信息备注
  'productionCode': '0',
  'localId': '0xE8',

  // 网络配置备注
  'localIp': '0',
  'subnetMask': '0.0.0.0',
  'defaultGateway': '0.0.0.0',
  'primaryDns': '0.0.0.0',
  'alternateDns': '0.0.0.0',
  'port': '0',

  // MAC地址备注
  'macAddr': '0-0-0',
  'macAddr1': '暂不支持设置',
  'macAddr2': '暂不支持设置',
  'macAddr3': '暂不支持设置'
}
onMounted(() => {
  console.log('[BaseParam] 页面挂载')

  // TODO: 写操作的响应，未来应由发送请求的函数直接处理，而不是在此处监听。

  // ========== 自动读取功能 ==========
  // 等待监听器完全注册后，自动读取一次所有topic的数据
  setTimeout(() => {
    console.log('[BaseParam] 开始自动读取参数数据')
    handleReadRequest('first');
  }, 600) // 延迟确保监听器完全就绪
})

onUnmounted(() => {
  console.log('[BaseParam] 页面卸载，停止读取并清理资源')

  // 首先停止读取操作
  stopParameterReading()

  console.log('[BaseParam] 页面卸载完成')
})
// ================== 辅助功能 ==================
function getdefalt(parameterKey) {
  return defal[parameterKey] || ''
}
function getParameterRemarkText(parameterKey) {
  return getRemarksTranslation(BASE_PARAM_REMARKS[parameterKey]) || ''
}
const portModelCache = new Map()
function getPortModel(param){
  const key = param.key
  if (!portModelCache.has(key)) {
    portModelCache.set(key, computed({
      get: () => {
        const list = enhancedParameterList?.value || []
        const cur = list.find(p => p.key === key)
        let currentValue = cur?.currentValue ?? 0;
        if (typeof currentValue === 'string') {
                currentValue = currentValue.replace(/年|月|日/g, '-').replace(/-+/g, '-').replace(/号/g, '');
              }
        return (currentValue ?? 0)
      },
      set: (val) => updateParameterValue(key, val ?? 0)
    }))
  }
  return portModelCache.get(key)
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
            {{ isLoading ? t('clusterConfigParam.buttons.stopReading') : t('clusterConfigParam.buttons.startReading') }}
          </button>
          <button
            v-if="!['出厂校正参数'].includes(currentSelectedClass.name)"
            @click="handleWriteRequest"
            :disabled="isLoading || !currentSelectedClass || isWriting"
            class="btn btn-warning"
          >
            {{ isWriting ? t('common.sending') : t('clusterConfigParam.buttons.sendParameters') }}
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
        {{ getParameterClass(parameterClass) }}
      </button>
    </div>

    <!-- 原生HTML表格 -->
    <div class="table-container">
      <table class="native-table">
        <thead>
          <tr>
            <th style="width: 250px">{{ t('clusterConfigParam.table.parameterName') }}</th>
            <th style="width: 150px">{{ t('clusterConfigParam.table.parameterValue') }}</th>
            <th style="width: 80px">{{ t('clusterConfigParam.table.unit') }}</th>
            <th style="width: 300px">{{ t('clusterConfigParam.table.remarks') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="param in enhancedParameterList" :key="param.key">
            <td>
              <div class="font-medium">{{ getLabelTranslation(param.label) }}</div>
            </td>
            <td>
              <!-- 下拉框参数 -->
              <select
                v-if="param.inputType === 'dropdown'"
                :value="param.selectedOption?.value"
                @change="(e) => handleDropdownUpdate(param.key, param.options, e.target.value)"
                :disabled="isLoading"
                class="input-control"
              >
                <option v-for="option in getdropdownLabel(param)" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>

              <!-- IPv4 地址输入框 -->
              <input
                v-else-if="param.inputType === 'ipv4'"
                type="text"
                :disabled="true"
                :value="getPortModel(param).value"
                @input="(e) => (getPortModel(param).value = String(e.target.value ?? '0.0.0.0'))"
                :placeholder="getdefalt(param.key)"
                class="input-control"
              />

              <!-- 普通数字输入框参数 -->
              <input
                v-else
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
          <tr v-if="!enhancedParameterList || enhancedParameterList.length === 0">
            <td colspan="4" class="empty-message">
              {{ t('clusterConfigParam.noData') }}
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

/* 下拉框特殊样式 */
select.input-control {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23495057' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
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