<!-- 堆遥控页面 - 基于实际通信协议的堆级遥控命令操作界面 -->
<template>
  <div class="card">
    <!-- Toast 消息提示 -->
    <Toast />
    
    <!-- 主要内容区域 -->
    <div class="content-wrapper">
      <!-- 控制命令卡片 -->
      <div class="table-container order-like-card">
        <h2 class="table-title">堆遥控命令操作</h2>
        <div class="table-content">
          <!-- 堆遥控命令区域 -->
          <div class="command-section">
            <h3 class="section-title">遥控命令</h3>
            <div class="command-grid">
              <div 
                v-for="command in controlCommandTableData" 
                :key="command.id"
                class="command-item"
              >
                <div class="command-label">{{ command.name }}</div>
                <div class="command-control">
                  <!-- 下拉选择类型 -->
                  <div v-if="command.uiType === 'dropdown'" class="dropdown-control">
                    <Dropdown
                      v-model="selectedValues[command.id]"
                      :options="command.options"
                      optionLabel="label"
                      optionValue="value"
                      :placeholder="'请选择' + command.name"
                      class="w-full"
                      :disabled="executingCommands.has(command.id)"
                    />
                  </div>
                  
                  <!-- 复选框组类型 - 直接展示 -->
                  <div v-else-if="command.uiType === 'checkbox_group'" class="checkbox-group-control">
                    <div class="checkbox-group-container">
                      <div 
                        v-for="bitField in command.bitFields" 
                        :key="bitField.bit"
                        class="checkbox-item"
                      >
                        <Checkbox
                            :model-value="checkboxStates[command.id] && checkboxStates[command.id][bitField.bit]"
                            @update:model-value="(value) => handleCheckboxChange(command.id, bitField.bit, value)"
                            :inputId="'bit_' + command.id + '_' + bitField.bit"
                            :binary="true"
                            :disabled="executingCommands.has(command.id)"
                          />
                        <label :for="'bit_' + command.id + '_' + bitField.bit" class="checkbox-label">
                          {{ bitField.label }}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>  
                <div class="command-action">
                  <Button
                    label="发送"
                    icon="pi pi-send"
                    class="p-button-sm p-button-success"
                    @click="command.uiType === 'checkbox_group' ? handleCheckboxBitFieldControl(command.id, command) : handleCommandExecution(command.id, selectedValues[command.id])"
                    :disabled="!canSendCommand(command) || executingCommands.has(command.id)"
                    :loading="executingCommands.has(command.id)"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="section-divider"></div>
          
          <!-- 接触器执行策略结果区域 -->
          <div class="result-section">
            <h3 class="section-title">接触器执行策略结果</h3>
            <div class="result-grid">
              <div 
                v-for="item in feedbackStatusData" 
                :key="item.id"
                class="result-item"
              >
                <div class="result-label">{{ item.name }}</div>
                <div class="result-value">
                  <Tag 
                    :value="item.value" 
                    :severity="item.severity"
                    class="status-tag"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 确认对话框 -->
    <Dialog 
      v-model:visible="showConfirmDialog" 
      header="操作确认"
      :modal="true"
      :closable="true"
      :style="{ width: '400px' }"
    >
      <div class="confirm-content">
        <i class="pi pi-exclamation-triangle confirm-icon"></i>
        <span>{{ confirmMessage }}</span>
      </div>
      
      <template #footer>
        <Button 
          label="取消" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="showConfirmDialog = false" 
        />
        <Button 
          label="确认" 
          icon="pi pi-check" 
          class="p-button-danger" 
          @click="executeConfirmedCommandWithToast"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useRemoteCommand } from '@/composables/core/data-processing/remote-control/useRemoteCommand'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'
import { parseBAUResponseCode, parseContactorExecutionResult } from '@/configs/commands/block/blockRemoteCommandConfig'
import { ERROR_CODES } from '../../../../main/table.js'

// Toast 组件
const toast = useToast()

// 页面类型检测 - 设置为block类型以显示堆选择器
const { addPageTypeMapping } = usePageTypeDetection()
addPageTypeMapping('/Block/BlockRemoteCommand', 'block')

// 堆选择器
const { selectedBlock } = useBlockSelect()

// 使用遥控命令服务（堆模式）
const {
  // 响应式状态
  selectedValues,
  executingCommands,
  showBitFieldDialog,
  showConfirmDialog,
  currentBitFieldCommand,
  confirmMessage,
  feedbackStatus,
  checkboxStates,
  
  // 计算属性
  controlCommandTableData,
  feedbackStatusData,
  
  // 方法
  executeRemoteCommand,
  handleCommandExecution,
  executeConfirmedCommand,
  confirmBitFieldCommand,
  handleCheckboxBitFieldControl,
  getStatusSeverity,
  startRemoteCommandListeners,
  stopRemoteCommandListeners,
  startFeedbackPolling,
  stopFeedbackPolling,
  handleFeedbackQueryResponse
} = useRemoteCommand({ selectorMode: 'block' })

// ========== 计算属性 ==========



// ========== 方法 ==========

/**
 * 检查是否可以发送命令
 * @param {Object} command - 命令对象
 * @returns {boolean} 是否可以发送
 */
function canSendCommand(command) {
  if (command.uiType === 'dropdown') {
    const selectedValue = selectedValues[command.id]
    return selectedValue != null && selectedValue !== ''
  }
  if (command.uiType === 'checkbox_group') {
    // 检查是否有选中的复选框
    return command.bitFields?.some(bitField => {
      return checkboxStates[command.id] && checkboxStates[command.id][bitField.bit]
    })
  }
  return true
}





/**
 * 处理复选框状态变化
 * @param {string} commandId - 命令ID
 * @param {number} bit - 位字段
 * @param {boolean} checked - 是否选中
 */
function handleCheckboxChange(commandId, bit, checked) {
  if (!checkboxStates[commandId]) {
    checkboxStates[commandId] = {}
  }
  checkboxStates[commandId][bit] = checked
}

/**
 * 处理确认命令执行（带Toast提示）
 */
async function executeConfirmedCommandWithToast() {
  try {
    const result = await executeConfirmedCommand()

    if (result && result.success !== undefined) {
      if (result.success) {
        if (result.successCount !== undefined) {
          toast.add({
            severity: 'info',
            summary: '命令已发送',
            detail: `${result.commandName || '命令'} 已发送到 ${result.successCount} 个设备${result.failCount > 0 ? `，${result.failCount} 个失败` : ''}`,
            life: 3000
          })
        } else {
          toast.add({
            severity: 'success',
            summary: '命令执行成功',
            detail: `${result.commandName || '命令'} 执行成功`,
            life: 3000
          })
        }
      } else {
        toast.add({
          severity: 'error',
          summary: '命令执行失败',
          detail: result.error || '命令执行失败',
          life: 5000
        })
      }
    }
  } catch (error) {
    console.error('[BlockRemoteCommand] 确认命令执行失败:', error)
    toast.add({
      severity: 'error',
      summary: '系统错误',
      detail: '命令执行过程中发生错误',
      life: 5000
    })
  }
}

// 遥控命令应答处理函数
function onRemoteCommandResponse(_e, msg) {
  handleRemoteCommandResponseWithToast(msg)
}

/**
 * 处理遥控命令应答并显示Toast
 * @param {Object} msg - MQTT消息对象
 */
function handleRemoteCommandResponseWithToast(msg) {
  // 根据消息结构解构数据
  let dataType, data, blockId, topic
  
  if (msg.data && msg.data.dataType) {
    dataType = msg.data.dataType
    data = msg.data.data
    blockId = msg.data.blockId
    topic = msg.data.topic
  } else {
    ({ dataType, data, blockId, topic } = msg)//添加兼容性解构逻辑
  }

  if (!data) {
    console.warn(`[BlockRemoteCommand] 遥控命令应答数据为空: ${dataType}`)
    return
  }

  // 检查是否是来自BAU的应答（topic包含bms/bau/d2s）
  if (!topic || !topic.includes('bms/bau/d2s')) {
    return
  }

  // 统一处理dataType，转换为小写（与簇遥控保持一致）
  const commandType = dataType ? dataType.toLowerCase() : 'unknown'

  // 获取设备显示名称
  const deviceName = `堆${blockId}`

  // 获取命令显示名称
  const commandNameMap = {
    'batt_stack_ctrl_switch': '电池堆控制开关',
    'force_clear_save_fault': '强制消除保留故障',
    'reset_block_param': '控制参数复位',
    'period_ins_detect_en': '周期性绝缘检测',
    'get_batt_stack_ctrl_switch_result': '查询执行结果'
  }

  const commandName = commandNameMap[commandType] || commandType

  // 检查是否是错误应答
  if (data.error) {
    toast.add({
      severity: 'error',
      summary: '遥控命令执行失败',
      detail: `${deviceName}: ${commandName} 执行失败 - ${data.message || '未知错误'}`,
      life: 6000
    })
    return
  }

  // 特殊处理查询执行结果的应答
  if (commandType === 'get_batt_stack_ctrl_switch_result') {
    // 处理反馈查询应答，更新反馈状态
    if (data.value !== undefined) {
      const resultValue = data.value
      console.log(`[BlockRemoteCommand] 收到接触器执行策略结果查询应答: ${resultValue}`)
      
      // 使用handleFeedbackQueryResponse处理反馈数据
      handleFeedbackQueryResponse('get_batt_stack_ctrl_switch_result', data)
    }
    return // 查询应答不显示Toast
  }

  // 检查应答码
  if (data.code !== undefined) {
    const isSuccess = data.code === 0xE0

    const codeMessage = ERROR_CODES[data.code] || `未知应答码: 0x${data.code.toString(16).toUpperCase()}`
    const codeHex = `0x${data.code.toString(16).toUpperCase()}`

    toast.add({
      severity: isSuccess ? 'success' : 'error',
      summary: isSuccess ? '遥控命令执行成功' : '遥控命令执行失败',
      detail: isSuccess 
        ? `${deviceName}: ${commandName} 已成功执行 (应答码: ${codeHex})`
        : `${deviceName}: ${commandName} ${codeMessage} (应答码: ${codeHex})`,
      life: isSuccess ? 4000 : 6000
    })

    // 如果有执行结果数据，更新反馈状态
    if (data.executionResult !== undefined) {
      const resultMessage = parseContactorExecutionResult(data.executionResult)
      feedbackStatus.contactor_ctrl_result = resultMessage
    }
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  console.log('[BlockRemoteCommand] 页面已挂载')
  
  // 启动监听器
  startRemoteCommandListeners()
  
  // 启动反馈状态轮询
  startFeedbackPolling(() => selectedBlock.value)
  
  // 预清理，避免重复绑定
  window.electron.ipcRenderer.removeAllListeners?.('BATT_STACK_CTRL_SWITCH')
  window.electron.ipcRenderer.removeAllListeners?.('FORCE_CLEAR_SAVE_FAULT')
  window.electron.ipcRenderer.removeAllListeners?.('RESET_BLOCK_PARAM')
  window.electron.ipcRenderer.removeAllListeners?.('PERIOD_INS_DETECT_EN')
  window.electron.ipcRenderer.removeAllListeners?.('GET_BATT_STACK_CTRL_SWITCH_RESULT')
  
  // 监听堆模式遥控命令应答
  window.electron.ipcRenderer.on('BATT_STACK_CTRL_SWITCH', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('FORCE_CLEAR_SAVE_FAULT', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('RESET_BLOCK_PARAM', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('PERIOD_INS_DETECT_EN', onRemoteCommandResponse)
  
  // 监听堆模式反馈查询应答
  window.electron.ipcRenderer.on('GET_BATT_STACK_CTRL_SWITCH_RESULT', onRemoteCommandResponse)
  
  // 初始化下拉框默认值
  initializeDropdownDefaults()
})

// 初始化下拉框默认选中第一个选项
function initializeDropdownDefaults() {
  controlCommandTableData.value.forEach(command => {
    if (command.uiType === 'dropdown' && command.options && command.options.length > 0) {
      // 如果还没有选中值，则默认选中第一个选项
      if (selectedValues[command.id] === undefined) {
        selectedValues[command.id] = command.options[0].value
        console.log(`[BlockRemoteCommand] 初始化下拉框默认值: ${command.name} = ${command.options[0].label}`)
      }
    }
  })
}

onUnmounted(() => {
  console.log('[BlockRemoteCommand] 页面即将卸载')
  
  // 停止监听器
  stopRemoteCommandListeners()
  stopFeedbackPolling()
  
  // 移除堆模式遥控命令应答监听
  window.electron.ipcRenderer.removeListener('BATT_STACK_CTRL_SWITCH', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeListener('FORCE_CLEAR_SAVE_FAULT', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeListener('RESET_BLOCK_PARAM', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeListener('PERIOD_INS_DETECT_EN', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeListener('GET_BATT_STACK_CTRL_SWITCH_RESULT', onRemoteCommandResponse)
})
</script>

<style scoped>
.card {
  padding: 12px;
  min-height: calc(100vh - 78px);
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  overflow: hidden;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  gap: 0;
}

/* 采用设备管理页面的card样式 - 优化版本 */
.table-container.order-like-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.table-content {
  padding: 16px;
  flex: 1;
  min-height: 0;
}

.order-like-card .table-title {
  background: linear-gradient(135deg, #007ad9 0%, #0056b3 100%);
  color: #ffffff;
  padding: 12px 16px;
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 2px 8px rgba(0, 122, 217, 0.2);
}

.order-like-card .table-content {
  padding: 16px;
}

/* 区域标题样式 - 紧凑版本 */
.section-title {
  color: #1e293b;
  font-weight: 700;
  font-size: 1rem;
  margin: 0 0 12px 0;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 6px;
  border-left: 4px solid #007ad9;
  display: block;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 分隔线样式 - 简洁版本 */
.section-divider {
  margin: 16px 0;
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #cbd5e1 50%, transparent 100%);
}

.card-content {
  padding: 16px 20px 12px;
}

.control-section,
.result-section {
  height: 100%;
}

/* 命令网格布局 - 紧凑版本 */
.command-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.command-item {
  display: grid;
  grid-template-columns: 240px 1fr auto;
  align-items: center;
  padding: 12px 16px;
  gap: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.command-label {
  color: #1e293b;
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.4;
}

.command-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.command-action {
  display: flex;
  justify-content: flex-end;
}
  
  /* 复选框组样式 */
  .checkbox-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  
  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #4d5965;
  }
  
  .checkbox-item .p-checkbox {
    width: 16px;
    height: 16px;
  }

/* 控件样式 */
.dropdown-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group-control {
  width: 100%;
}

.checkbox-group-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.checkbox-item:hover {
  border-color: #007ad9;
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
  transform: translateX(2px);
}

.checkbox-label {
  flex: 1;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  font-weight: 500;
  line-height: 1.4;
}

.status-tag {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 结果网格布局 - 紧凑版本 */
.result-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.result-item {
  display: grid;
  grid-template-columns: 240px 1fr;
  align-items: center;
  padding: 12px 16px;
  gap: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.result-label {
  color: #1e293b;
  font-weight: 600;
  font-size: 0.95rem;
}

.result-value {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

/* 控制组件样式 */
.control-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.control-wrapper .p-dropdown {
  flex: 1;
  min-width: 120px;
}

.execute-btn {
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 0.85rem;
}

/* 执行状态样式 */
.executing {
  opacity: 0.7;
  pointer-events: none;
}

.executing .p-button {
  background: #94a3b8 !important;
  border-color: #94a3b8 !important;
}



/* 确认对话框样式 */
.confirm-content {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px 0;
}

.confirm-icon {
  font-size: 24px;
  color: #f39c12;
}

/* 响应式设计 - 优化版本 */
@media (max-width: 1200px) {
  .content-wrapper {
    max-width: 100%;
    padding: 0 8px;
  }
  
  .command-item,
  .result-item {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }
  
  .command-action {
    justify-content: center;
  }
  
  .section-divider {
    margin: 16px 0;
  }
}

@media (max-width: 768px) {
  .card {
    padding: 8px;
    min-height: calc(100vh - 70px);
  }
  
  .table-container.order-like-card {
    border-radius: 12px;
  }
  
  .order-like-card .table-title {
    padding: 12px 16px;
    font-size: 1rem;
  }
  
  .table-content {
    padding: 16px;
  }
  
  .section-title {
    font-size: 1rem;
    padding: 10px 12px;
    margin-bottom: 16px;
  }
  
  .command-item,
  .result-item {
    padding: 12px;
    gap: 10px;
  }
  
  .command-label,
  .result-label {
    font-size: 0.9rem;
  }
  
  .checkbox-group-container {
    padding: 12px;
    gap: 8px;
  }
  
  .checkbox-item {
    padding: 10px 12px;
    gap: 10px;
  }
  
  .section-divider {
    margin: 12px 0;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 6px;
  }
  
  .table-content {
    padding: 12px;
  }
  
  .command-item,
  .result-item {
    padding: 10px;
  }
}
</style>