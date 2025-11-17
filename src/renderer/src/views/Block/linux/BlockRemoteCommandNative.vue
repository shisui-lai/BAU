<!-- 堆遥控页面 - 基于实际通信协议的堆级遥控命令操作界面 -->
<template>
  <div class="card">
    <!-- Toast组件已移至AppLayout.vue，避免重复声明 -->

    <!-- 主要内容区域 -->
    <div class="content-wrapper">
      <!-- 控制命令卡片 -->
      <div class="table-container order-like-card">
        <h2 class="table-title">{{ t('blockRemoteCommandPage.title') }}</h2>
        <div class="table-content">
          <!-- 堆遥控命令区域 -->
          <div class="command-section">
            <h3 class="section-title">{{ t('blockRemoteCommandPage.sections.controlCommands') }}</h3>
            <div class="command-grid">
              <div 
                v-for="command in controlCommandTableData" 
                :key="command.id"
                class="command-item"
              >
                <div class="command-label">
                  {{ getCommandDisplayName(command.name) }}
                  <span
                    v-if="command.mode"
                    :class="['native-tag', 'mode-tag', `tag-${getModeSeverity(command.mode)}`]"
                  >
                    {{ getModeLabel(command.mode) }}
                  </span>
                </div>
                <div class="flex align-items-center gap-2 flex-1 justify-content-end">
                  <!-- 下拉选择类型 -->
                  <div v-if="command.uiType === 'dropdown'" class="flex align-items-center gap-2">
                    <select
                      :value="selectedValues[command.id]"
                      @change="(e) => selectedValues[command.id] = e.target.value"
                      :disabled="executingCommands.has(command.id)"
                      class="native-select w-full"
                    >
                      <option value="" disabled>{{ t('blockRemoteCommandPage.buttons.select') + getCommandDisplayName(command.name) }}</option>
                      <option
                        v-for="option in translateOptions(command.options)"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </div>

                  <!-- 输入框类型 -->
                  <div v-else-if="command.uiType === 'input'" class="flex align-items-center gap-2">
                    <div class="input-with-suffix">
                      <input
                        type="number"
                        :value="selectedValues[command.id]"
                        @input="(e) => selectedValues[command.id] = parseFloat(e.target.value) || 0"
                        :placeholder="getInputPlaceholder(command.inputConfig?.placeholder)"
                        :min="command.inputConfig?.min"
                        :max="command.inputConfig?.max"
                        :step="command.inputConfig?.step || 1"
                        :disabled="executingCommands.has(command.id)"
                        class="native-input w-full"
                      />
                      <span v-if="command.inputConfig?.unit" class="input-suffix">{{ command.inputConfig.unit }}</span>
                    </div>
                  </div>

                  <!-- 复选框组类型 - 直接展示 -->
                  <div v-else-if="command.uiType === 'checkbox_group'" class="checkbox-group-control">
                    <div class="checkbox-group-container">
                      <div
                        v-for="bitField in command.bitFields"
                        :key="bitField.bit"
                        class="checkbox-item"
                      >
                        <input
                          type="checkbox"
                          :id="'bit_' + command.id + '_' + bitField.bit"
                          :checked="checkboxStates[command.id] && checkboxStates[command.id][bitField.bit]"
                          @change="(e) => handleCheckboxChange(command.id, bitField.bit, e.target.checked)"
                          :disabled="executingCommands.has(command.id)"
                          class="native-checkbox"
                        />
                        <label :for="'bit_' + command.id + '_' + bitField.bit" class="checkbox-label">
                          {{ getOptionLabel(bitField.label) }}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex justify-content-end">
                  <button
                    @click="handleCommandClick(command)"
                    :disabled="!canSendCommand(command) || executingCommands.has(command.id)"
                    class="btn btn-primary btn-sm"
                  >
                    <i class="pi pi-send"></i>
                    <span>{{ executingCommands.has(command.id) ? t('blockRemoteCommandPage.statuses.executing') : t('blockRemoteCommandPage.buttons.send') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="section-divider"></div>
          
          <!-- 接触器执行策略结果区域 -->
          <div class="result-section">
            <h3 class="section-title">{{ t('blockRemoteCommandPage.sections.contactorStrategyResult') }}</h3>
            <div class="result-grid">
              <div 
                v-for="item in feedbackStatusData" 
                :key="item.id"
                class="result-item"
              >
                <div class="result-label">{{ getFeedbackLabel(item.id, item.name) }}</div>
                <div class="result-value">
                  <span
                    :class="['native-tag', 'status-tag', `tag-${item.severity}`]"
                  >
                    {{ getStatusDisplay(item.value) }}
                  </span>
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
      :header="t('blockRemoteCommandPage.dialogs.operationConfirmation')"
      :modal="true"
      :closable="true"
      :style="{ width: '400px' }"
    >
      <div class="confirm-content">
        <i class="pi pi-exclamation-triangle confirm-icon"></i>
        <span>{{ confirmMessage }}</span>
      </div>
      
      <template #footer>
        <button 
          @click="showConfirmDialog = false"
          class="btn btn-secondary"
        >
          <i class="pi pi-times"></i>
          <span>{{ t('blockRemoteCommandPage.buttons.cancel') }}</span>
        </button>
        <button 
          @click="executeConfirmedCommandWithToast"
          class="btn btn-danger"
        >
          <i class="pi pi-check"></i>
          <span>{{ t('blockRemoteCommandPage.buttons.confirm') }}</span>
        </button>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useRemoteCommand } from '@/composables/core/data-processing/remote-control/useRemoteCommand'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'
import { parseBAUResponseCode, parseContactorExecutionResult } from '@/configs/commands/block/blockRemoteCommandConfig'
// import { ERROR_CODES } from '../../../../main/table.js' // 已移除硬编码错误代码
import Dialog from 'primevue/dialog'
// 已移除 PrimeVue 组件导入（Tag, Dropdown, InputNumber, Checkbox, Button），使用原生 HTML 元素，保留 Dialog

// Toast 组件
const toast = useToast()
const { t, te } = useI18n()

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

/** 获取模式标签文本 */
function getModeLabel(mode) {
  return mode === 'remote'
    ? t('blockRemoteCommandPage.statuses.mode.remote')
    : t('blockRemoteCommandPage.statuses.mode.local')
}

/**
 * 获取模式标签样式
 * @param {string} mode - 模式类型 ('remote' | 'local')
 * @returns {string} 标签样式类型 ('info' | 'success' | 'danger' | 'warning')
 */
function getModeSeverity(mode) {
  return 'info' // 统一使用蓝色标签
}

/**
 * 统一处理命令点击事件
 * @param {Object} command - 命令对象
 */
function handleCommandClick(command) {
  if (command.uiType === 'checkbox_group') {
    handleCheckboxBitFieldControl(command.id, command, t, executeRemoteCommand)
  } else if (command.uiType === 'input') {
    handleInputCommand(command)
  } else {
    handleCommandExecution(command.id, selectedValues[command.id], t, executeRemoteCommand)
  }
}

/**
 * 处理输入框类型的命令
 * @param {Object} command - 命令对象
 */
function handleInputCommand(command) {
  const inputValue = selectedValues[command.id]

  // 验证输入值
  if (inputValue == null || inputValue === '') {
    toast.add({
      severity: 'warn',
      summary: t('toast.blockRemoteCommand.invalidInput'),
      detail: t('toast.blockRemoteCommand.pleaseEnterValid', getCommandDisplayName(command.name)),
      life: 3000
    })
    return
  }

  // 验证范围
  const config = command.inputConfig
  if (config) {
    if (config.min != null && inputValue < config.min) {
      toast.add({
        severity: 'warn',
        summary: t('toast.blockRemoteCommand.outOfRange'),
        detail: t('toast.blockRemoteCommand.minLimit', getCommandDisplayName(command.name), String(config.min)),
        life: 3000
      })
      return
    }
    if (config.max != null && inputValue > config.max) {
      toast.add({
        severity: 'warn',
        summary: t('toast.blockRemoteCommand.outOfRange'),
        detail: t('toast.blockRemoteCommand.maxLimit', getCommandDisplayName(command.name), String(config.max)),
        life: 3000
      })
      return
    }
  }

  // 处理scale转换
  let finalValue = inputValue
  if (config && config.scale) {
    finalValue = Math.round(inputValue * config.scale)
  }

  // 执行命令
  handleCommandExecution(command.id, finalValue, t, executeRemoteCommand)
}

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
  if (command.uiType === 'input') {
    const inputValue = selectedValues[command.id]
    return inputValue != null && inputValue !== ''
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
            summary: t('toast.blockRemoteCommand.commandSent'),
            detail: t(
              'blockRemoteCommandPage.messages.sentToCount',
              [
                getCommandDisplayName(result.commandName || 'Command'),
                String(result.successCount),
                result.failCount > 0 ? t('toast.blockRemoteCommand.someFailed', String(result.failCount)) : ''
              ]
            ),
            life: 3000
          })
        } else {
          toast.add({
            severity: 'success',
            summary: t('toast.blockRemoteCommand.executeSuccess'),
            detail: `${getCommandDisplayName(result.commandName || 'Command')}`,
            life: 3000
          })
        }
      } else {
        toast.add({
          severity: 'error',
          summary: t('toast.blockRemoteCommand.executeFailed'),
          detail: result.error || t('toast.blockRemoteCommand.executeFailed'),
          life: 5000
        })
      }
    }
  } catch (error) {
    console.error('[BlockRemoteCommand] 确认命令执行失败:', error)
    toast.add({
      severity: 'error',
      summary: t('toast.blockRemoteCommand.systemError'),
      detail: t('toast.blockRemoteCommand.errorDuringExec'),
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
  const deviceName = t('toast.remoteControl.deviceName.block', { blockId })

  // 获取命令显示名称
  const commandNameMap = {
    'batt_stack_ctrl_switch': t('blockRemoteCommandPage.commands.下设电池堆控制开关'),
    'force_clear_save_fault': t('blockRemoteCommandPage.commands.强制消除电池堆保留故障'),
    'reset_block_param': t('blockRemoteCommandPage.commands.控制参数复位'),
    'period_ins_detect_en': t('blockRemoteCommandPage.commands.下设周期性绝缘电阻检测指令'),
    'contactor_selftest_en': t('blockRemoteCommandPage.commands.下设接触器自检指令'),
    'reset_bau': t('blockRemoteCommandPage.commands.下设重启BAU指令'),
    'manual_ctrl_sd_record': t('blockRemoteCommandPage.commands.下设手动控制SD卡记录'),
    'set_block_soc': t('blockRemoteCommandPage.commands.下设堆SOC'),
    'get_batt_stack_ctrl_switch_result': t('blockRemoteCommandPage.commands.查询接触器执行策略结果')
  }

  const commandName = commandNameMap[commandType] || commandType

  // 检查是否是错误应答
  if (data.error) {
    toast.add({
      severity: 'error',
      summary: t('toast.blockRemoteCommand.rcFailed'),
      detail: `${deviceName}: ${commandName} ${t('toast.blockRemoteCommand.executeFailed')} - ${data.message || t('blockRemoteCommandPage.statuses.unknown')}`,
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

    const codeMessage = t(`toast.errorCodes.0x${data.code.toString(16).toUpperCase()}`) || t('toast.blockRemoteCommand.unknownResponseCode', [data.code.toString(16).toUpperCase()])
    const codeHex = `0x${data.code.toString(16).toUpperCase()}`

    toast.add({
      severity: isSuccess ? 'success' : 'error',
      summary: isSuccess ? t('toast.blockRemoteCommand.rcSuccess') : t('toast.blockRemoteCommand.rcFailed'),
      detail: isSuccess 
        ? `${deviceName}: ${commandName} ${t('toast.blockRemoteCommand.executeSuccess')} (${codeHex})`
        : `${deviceName}: ${commandName} ${codeMessage} (${codeHex})`,
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
  window.electron.ipcRenderer.removeAllListeners?.('CONTACTOR_SELFTEST_EN')
  window.electron.ipcRenderer.removeAllListeners?.('RESET_BAU')
  window.electron.ipcRenderer.removeAllListeners?.('MANUAL_CTRL_SD_RECORD')
  window.electron.ipcRenderer.removeAllListeners?.('SET_BLOCK_SOC')
  window.electron.ipcRenderer.removeAllListeners?.('GET_BATT_STACK_CTRL_SWITCH_RESULT')

  // 监听堆模式遥控命令应答
  window.electron.ipcRenderer.on('BATT_STACK_CTRL_SWITCH', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('FORCE_CLEAR_SAVE_FAULT', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('RESET_BLOCK_PARAM', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('PERIOD_INS_DETECT_EN', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('CONTACTOR_SELFTEST_EN', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('RESET_BAU', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('MANUAL_CTRL_SD_RECORD', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('SET_BLOCK_SOC', onRemoteCommandResponse)
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
        // console.log(`[BlockRemoteCommand] 初始化下拉框默认值: ${command.name} = ${command.options[0].label}`)
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
  window.electron.ipcRenderer.removeAllListeners('BATT_STACK_CTRL_SWITCH', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('FORCE_CLEAR_SAVE_FAULT', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('RESET_BLOCK_PARAM', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('PERIOD_INS_DETECT_EN', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('CONTACTOR_SELFTEST_EN', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('RESET_BAU', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('MANUAL_CTRL_SD_RECORD', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('SET_BLOCK_SOC', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('GET_BATT_STACK_CTRL_SWITCH_RESULT', onRemoteCommandResponse)
})

// ========== 翻译辅助 ==========
function getCommandDisplayName(name) {
  const translationKey = `blockRemoteCommandPage.commands.${name}`
  // 先检查翻译键是否存在，如果不存在就直接返回原始 name，避免警告
  if (te(translationKey)) {
    return t(translationKey)
  }
  return name
}

function translateOptions(options = []) {
  return (options || []).map(opt => ({ ...opt, label: getOptionLabel(opt.label) }))
}

function getOptionLabel(label) {
  const translationKey = `blockRemoteCommandPage.options.${label}`
  // 先检查翻译键是否存在，如果不存在就直接返回原始 label，避免警告
  if (te(translationKey)) {
    return t(translationKey)
  }
  return label
}

function getInputPlaceholder(ph) {
  if (!ph) return t('blockRemoteCommandPage.buttons.select')
  const translationKey = `blockRemoteCommandPage.options.${ph}`
  // 先检查翻译键是否存在，如果不存在就直接返回原始 ph，避免警告
  if (te(translationKey)) {
    return t(translationKey)
  }
  return ph
}

function getFeedbackLabel(id, fallback) {
  if (id === 'batt_stack_ctrl_switch_result') return t('blockRemoteCommandPage.sections.contactorStrategyResult')
  return fallback
}

function getStatusDisplay(value) {
  if (!value) return t('blockRemoteCommandPage.statuses.unknown')
  const mapping = {
    '执行中': t('blockRemoteCommandPage.statuses.executing'),
    '执行失败': t('blockRemoteCommandPage.statuses.failed'),
    '执行成功': t('blockRemoteCommandPage.statuses.success'),
    '空闲': t('blockRemoteCommandPage.statuses.idle'),
    '检测中': t('blockRemoteCommandPage.statuses.detecting'),
    '检测完成': t('blockRemoteCommandPage.statuses.completed'),
    '测试模式': t('blockRemoteCommandPage.statuses.testMode'),
    '正常模式': t('blockRemoteCommandPage.statuses.normalMode')
  }
  // 处理“未知状态(...)”形式
  if (/^未知状态/.test(String(value))) return t('blockRemoteCommandPage.statuses.unknown')
  return mapping[String(value)] || String(value)
}
</script>

<style scoped>
.card {
  padding: 12px;
  min-height: calc(100vh - 78px);
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
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
  border: 1px solid var(--surface-border);
  background: linear-gradient(135deg, var(--surface-card) 0%, var(--surface-section) 100%);
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
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-700) 100%);
  color: var(--primary-color-text);
  padding: 12px 16px;
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.order-like-card .table-content {
  padding: 16px;
}

/* 区域标题样式 - 紧凑版本 */
.section-title {
  color: var(--text-color);
  font-weight: 700;
  font-size: 1rem;
  margin: 0 0 12px 0;
  padding: 8px 12px;
  background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-hover) 100%);
  border-radius: 6px;
  border-left: 4px solid var(--primary-color);
  display: block;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 分隔线样式 - 简洁版本 */
.section-divider {
  margin: 16px 0;
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--surface-border) 50%, transparent 100%);
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
  background: linear-gradient(135deg, var(--surface-card) 0%, var(--surface-section) 100%);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.command-label {
  color: var(--text-color);
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 原生标签样式 */
.native-tag {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  display: inline-block;
  white-space: nowrap;
}

.mode-tag {
  font-size: 0.75rem !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-weight: 500 !important;
  white-space: nowrap;
  flex-shrink: 0;
}

.native-tag.tag-info {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #60a5fa;
}

.native-tag.tag-success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #34d399;
}

.native-tag.tag-danger {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #f87171;
}

.native-tag.tag-warning {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
}





  /* 复选框组样式 */

/* 原生下拉框样式 */
.native-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-0);
  color: var(--text-color);
  font-size: 0.875rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23495057' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
  transition: all 0.2s;
  outline: none;
  width: 100%;
}

.native-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
}

.native-select:disabled {
  background-color: var(--surface-100);
  opacity: 0.6;
  cursor: not-allowed;
}

/* 原生输入框样式 */
.native-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-0);
  color: var(--text-color);
  font-size: 0.875rem;
  transition: all 0.2s;
  outline: none;
  width: 100%;
}

.native-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
}

.native-input:disabled {
  background-color: var(--surface-100);
  opacity: 0.6;
  cursor: not-allowed;
}

/* 输入框带后缀样式 */
.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-with-suffix .native-input {
  padding-right: 3rem;
}

.input-suffix {
  position: absolute;
  right: 0.75rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  pointer-events: none;
}

/* 原生复选框样式 */
.native-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.native-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
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

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

/* 控件样式 */

.checkbox-group-control {
  width: 100%;
}

.checkbox-group-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, var(--surface-ground) 0%, var(--surface-section) 100%);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, var(--surface-card) 0%, var(--surface-section) 100%);
  border-radius: 6px;
  border: 1px solid var(--surface-border);
  cursor: pointer;
  transition: all 0.2s ease;
}

.checkbox-item:hover {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, var(--highlight-bg) 0%, var(--surface-hover) 100%);
  transform: translateX(2px);
}

.checkbox-label {
  flex: 1;
  font-size: 14px;
  color: var(--text-color);
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
  background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.result-label {
  color: var(--text-color);
  font-weight: 600;
  font-size: 0.95rem;
}

.result-value {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

/* 控制组件样式 */

/* 执行状态样式 */
.executing {
  opacity: 0.7;
  pointer-events: none;
}

.executing .btn {
  background: var(--surface-400) !important;
  border-color: var(--surface-400) !important;
}



/* 确认对话框样式 */
.confirm-content {
  display: flex;
  align-items: center;
  gap: 12px; /* 图标和文字之间的间距 */
}

.confirm-icon {
  font-size: 24px;
  color: var(--orange-500);
  flex-shrink: 0; /* 防止图标被压缩 */
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