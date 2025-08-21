// 系统基本配置参数页面 - 支持参数分类切换和分组下发
<script setup>
import { useToast } from 'primevue/usetoast'
import { onMounted, onUnmounted } from 'vue'
import { SYS_BASE_PARAM_R } from '../../../../main/table.js'
import { useRemoteControlCore } from '@/composables/core/data-processing/remote-control/useRemoteControlCore'
import { useSysBaseParam } from '@/composables/core/data-processing/parameter-management/useSysBaseParam'
import { BASE_PARAM_REMARKS } from '@/configs/ui/Remarks'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import Toast from 'primevue/toast'

const toastService = useToast()

// 获取系统基本参数的专用处理功能
const systemBaseParamHandler = useSysBaseParam()

// 📋 系统基本参数配置 - 定义数据源和参数分类
const systemBaseParamConfig = {
  dataSource: {
    name: 'SYS_BASE_PARAM',                                             // 数据源名称标识
    readTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/sys_base_param_r',  // 读取MQTT主题模板
    writeTopicTemplate: 'bms/host/s2d/b{block}/c{cluster}/sys_base_param_w', // 写入MQTT主题模板
    parameterFields: SYS_BASE_PARAM_R,                                  // 参数字段定义表（159个字段）
    parameterSerializer: systemBaseParamHandler.serializeSystemBaseParamData, // 专用序列化函数
    parameterClasses: [                                                 // 参数分类配置
      {
        name: 'BMU配置',
        byteOffset: 0,      // 起始字节偏移：寄存器0开始
        byteLength: 132,    // 字节长度：BMU配置 + 虚拟电池位移，总共66个u16寄存器 = 132字节
      },
      {
        name: '类型选择', 
        byteOffset: 164,    // 起始字节偏移：跳过32字节预留 = 寄存器82开始
        byteLength: 16,     // 字节长度：8个类型选择参数，每个u16 = 16字节
      },
      {
        name: '基础设置',
        byteOffset: 186,    // 起始字节偏移：跳过6字节预留 = 寄存器93开始  
        byteLength: 16      // 字节长度：8个基础设置参数，每个u16 = 16字节
      },
      {
        name: '空调阈值',
        byteOffset: 210,    // 起始字节偏移：跳过8字节预留 = 寄存器105开始
        byteLength: 12      // 字节长度：6个温度阈值参数，每个s16 = 12字节
      },
      {
        name: '通信设置',
        byteOffset: 230,    // 起始字节偏移：跳过8字节预留 = 寄存器115开始
        byteLength: 18      // 字节长度：9个通信参数，每个u16 = 18字节
      },
      {
        name: '电流传感器',
        byteOffset: 256,    // 起始字节偏移：跳过8字节预留 = 寄存器128开始
        byteLength: 8       // 字节长度：4个传感器参数，每个u16 = 8字节
      },
      {
        name: '电池信息',
        byteOffset: 268,    // 起始字节偏移：跳过4字节预留 = 寄存器134开始
        byteLength: 6       // 字节长度：3个电池信息参数，每个u16 = 6字节
      },
      {
        name: '簇额定参数',
        byteOffset: 274,    // 起始字节偏移：紧接电池信息，寄存器137开始
        byteLength: 14      // 字节长度：1个u16 + 3个u32 = 2+12 = 14字节
      },
      {
        name: '均衡参数',
        byteOffset: 296,    // 起始字节偏移：跳过8字节预留 = 寄存器148开始
        byteLength: 22      // 字节长度：11个均衡参数，包含s16和u16 = 22字节
      }
    ]
  }
}

// ========== 新增：BaseParam自动读取topic数组 ==========
const allReadTopics = ['sys_base_param'];

// 使用通用遥调核心功能
const {
  isCurrentlyReading,
  selectedCluster,
  clusterOptions,
  currentSelectedClass,
  currentClassParameterList,
  allAvailableClasses,
  switchToParameterClass,
  startParameterReading,
  stopParameterReading,
  autoReadMultiTopicOnce, // 新增一次性自动读取
  sendCurrentClassParameters,
  updateParameterValue,
  getParameterInputValue,
  setParameterInputValue,
  getParameterDecimalPlaces,
  handleReceivedParameterData,
  handleParameterWriteResponse,
  handleParameterReadError,
  // 下拉框功能
  isParameterDropdown,
  getParameterDropdownOptions,
  updateDropdownParameterValue,
  enhancedParameterList
} = useRemoteControlCore(systemBaseParamConfig, toastService)

// ================== MQTT事件处理 ==================

/**
 * 处理系统基本参数读取响应
 * @param {Event} event - 事件对象
 * @param {Object} mqttMessage - MQTT消息数据
 */
function handleSystemBaseParamReadEvent(event, mqttMessage) {
  console.log('[BaseParam] handlerSystemBaseParamReadEvent called', handleSystemBaseParamReadEvent)
  console.log('[BaseParam] 收到系统基本参数读取事件:', mqttMessage)
  
  // 使用专用解析函数处理读取响应
  const parsedReadData = systemBaseParamHandler.parseSystemBaseParamReadResponse(mqttMessage)
  
  if (!parsedReadData) {
    console.warn('[BaseParam] 读取数据解析失败')
    return
  }
  
  // 检查是否为错误响应
  if (parsedReadData.result?.error) {
    handleParameterReadError(parsedReadData)
    return
  }
  
  // 处理成功的读取数据
  if (parsedReadData.data) {
    handleReceivedParameterData(parsedReadData)
  }
}

/**
 * 处理系统基本参数写入响应  
 * @param {Event} event - 事件对象
 * @param {Object} mqttMessage - MQTT消息数据
 */
function handleSystemBaseParamWriteEvent(event, mqttMessage) {
  console.log('[BaseParam] 收到系统基本参数写入事件:', mqttMessage)

  // 调试：记录事件接收的详细信息
  const timestamp = Date.now()
  const deviceKey = `${mqttMessage.blockId}-${mqttMessage.clusterId}`
  console.log(`[调试] BaseParam页面接收MQTT事件: ${deviceKey}, 时间戳: ${timestamp}`)
  console.log(`[调试] 当前选中分类: ${currentSelectedClass.value?.name}`)

  // 使用专用解析函数处理写入响应
  const parsedWriteData = systemBaseParamHandler.parseSystemBaseParamWriteResponse(mqttMessage)

  // 添加当前页面的分类信息，避免跨页面状态污染
  if (parsedWriteData && currentSelectedClass.value) {
    parsedWriteData.className = currentSelectedClass.value.name
    console.log(`[调试] 设置响应数据的分类名称: ${parsedWriteData.className}`)
  }

  // 处理写入响应（成功或失败）
  handleParameterWriteResponse(parsedWriteData)
}

// ================== 生命周期管理 ==================

let sysBaseParamWListenerCount = 0;

onMounted(() => {
  console.log('[BaseParam] 页面挂载，开始监听系统基本参数事件')

  // 先清理可能存在的旧监听器（防止快速切换导致的残留）
  window.electron.ipcRenderer.removeAllListeners('SYS_BASE_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('SYS_BASE_PARAM_W')
  console.log('[BaseParam] 预清理完成，开始注册新监听器')

  // 监听系统基本参数读取响应事件
  window.electron.ipcRenderer.on('SYS_BASE_PARAM_R', handleSystemBaseParamReadEvent)

  // 监听系统基本参数写入响应事件
  window.electron.ipcRenderer.on('SYS_BASE_PARAM_W', handleSystemBaseParamWriteEvent)
  sysBaseParamWListenerCount++;
  console.log('[BaseParam] 注册监听 SYS_BASE_PARAM_W，当前自增计数:', sysBaseParamWListenerCount);

  // ========== 自动读取功能 ==========
  // 等待监听器完全注册后，自动读取一次系统基本参数
  setTimeout(() => {
    console.log('[BaseParam] 开始自动读取系统基本参数')
    autoReadMultiTopicOnce(allReadTopics)
  }, 600) // 延迟600ms确保监听器完全就绪
})

onUnmounted(() => {
  console.log('[BaseParam] 页面卸载，停止读取并清理资源')

  // 首先停止读取操作
  stopParameterReading()

  // 然后强制清理所有事件监听器
  window.electron.ipcRenderer.removeAllListeners('SYS_BASE_PARAM_R')
  window.electron.ipcRenderer.removeAllListeners('SYS_BASE_PARAM_W')

  console.log('[BaseParam] 页面卸载完成')
})

// ================== 辅助功能 ==================

/**
 * 获取参数的备注说明
 * @param {string} parameterKey - 参数键名
 * @returns {string} 参数备注文本
 */
function getParameterRemarkText(parameterKey) {
  return BASE_PARAM_REMARKS[parameterKey] || ''
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
            @click="isCurrentlyReading ? stopParameterReading() : startParameterReading()"
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
      :value="enhancedParameterList"
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
          <!-- 下拉框参数 -->
          <Dropdown
            v-if="slotProps.data.inputType === 'dropdown'"
            :options="slotProps.data.options"
            optionLabel="label"
            optionValue="value"
            :model-value="slotProps.data.selectedOption?.value"
            @update:model-value="(value) => updateDropdownParameterValue(slotProps.data.key, slotProps.data.options.find(opt => opt.value === value))"
            :disabled="isCurrentlyReading"
            size="small"
            class="w-full"
          />

          <!-- 普通输入框参数 -->
          <InputNumber
            v-else
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

.cluster-dropdown {
  min-width: 200px;
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

