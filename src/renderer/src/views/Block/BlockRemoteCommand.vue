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
              <div v-for="command in controlCommandTableData" :key="command.id">
                <!-- 通用命令行：排除需要单独密码弹窗处理的命令 -->
                <div
                  v-if="command.id !== 'reset_flexcfg_area_times' && command.id !== 'erase_flexcfg_area'"
                  class="command-item"
                >
                  <div class="command-label">
                    {{ getCommandDisplayName(command.name) }}
                    <Tag
                      v-if="command.mode"
                      :value="getModeLabel(command.mode)"
                      :severity="getModeSeverity(command.mode)"
                      class="mode-tag"
                    />
                  </div>
                  <div class="flex align-items-center gap-2 flex-1 justify-content-end">
                    <!-- 下拉选择类型 -->
                    <div v-if="command.uiType === 'dropdown'" class="flex align-items-center gap-2">
                      <Dropdown
                        v-model="selectedValues[command.id]"
                        :options="translateOptions(command.options)"
                        optionLabel="label"
                        optionValue="value"
                        :placeholder="t('blockRemoteCommandPage.buttons.select') + getCommandDisplayName(command.name)"
                        class="w-full"
                        :disabled="executingCommands.has(command.id)"
                      />
                    </div>

                    <!-- 输入框类型：支持数字输入和密码输入 -->
                    <div
                      v-else-if="command.uiType === 'input'"
                      class="flex align-items-center gap-2"
                    >
                      <!-- 密码输入：用于需要特定密码（如0574）的敏感命令 -->
                      <InputText
                        v-if="command.inputType === 'password'"
                        v-model="selectedValues[command.id]"
                        :placeholder="getInputPlaceholder(command.placeholder)"
                        type="password"
                        class="w-full"
                        :disabled="executingCommands.has(command.id)"
                      />
                      <!-- 数字输入：用于数值型命令（如下设堆SOC） -->
                      <InputNumber
                        v-else
                        v-model="selectedValues[command.id]"
                        :placeholder="getInputPlaceholder(command.inputConfig?.placeholder)"
                        :min="command.inputConfig?.min"
                        :max="command.inputConfig?.max"
                        :step="command.inputConfig?.step"
                        :minFractionDigits="getFractionDigitsByScale(command.inputConfig?.scale)"
                        :maxFractionDigits="getFractionDigitsByScale(command.inputConfig?.scale)"
                        :suffix="command.inputConfig?.unit"
                        class="w-full"
                        :disabled="executingCommands.has(command.id)"
                      />
                    </div>

                    <!-- 复选框组类型 -->
                    <div
                      v-else-if="command.uiType === 'checkbox_group'"
                      class="checkbox-group-control"
                    >
                      <div class="checkbox-group-container">
                        <div
                          v-for="bitField in (command.id === 'reset_block_param' ? command.bitFields.filter(b => b.bit !== 2) : command.bitFields)"
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
                            {{ getOptionLabel(bitField.label) }}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex justify-content-end">
                    <Button
                      :label="t('blockRemoteCommandPage.buttons.send')"
                      icon="pi pi-send"
                      class="p-button-sm p-button-success"
                      @click="handleCommandClick(command)"
                      :disabled="!canSendCommand(command) || executingCommands.has(command.id)"
                      :loading="executingCommands.has(command.id)"
                    />
                  </div>
                </div>

                <!-- 复位系统端口配置参数：单独一行，无勾选框，点击发送后输入密码再发送 -->
                <div v-if="command.id === 'reset_block_param'" class="command-item">
                  <div class="command-label">
                    {{ getOptionLabel('复位系统端口配置参数') }}
                    <span class="password-hint">{{ t('blockRemoteCommandPage.labels.needPassword') }}</span>
                  </div>
                  <div class="flex align-items-center gap-2 flex-1 justify-content-end"></div>
                  <div class="flex justify-content-end">
                    <Button
                      :label="t('blockRemoteCommandPage.buttons.send')"
                      icon="pi pi-send"
                      class="p-button-sm p-button-success"
                      @click="handlePortParamSendClick()"
                      :disabled="executingCommands.has('reset_block_param')"
                      :loading="executingCommands.has('reset_block_param')"
                    />
                  </div>
                </div>

                <!-- 复位可配置默认参数次数：点击发送后弹出密码框，输入0574后下发控制字574 -->
                <div v-if="command.id === 'reset_flexcfg_area_times'" class="command-item">
                  <div class="command-label">
                    {{ getCommandDisplayName(command.name) }}
                    <span class="password-hint">{{ t('blockRemoteCommandPage.labels.needPassword') }}</span>
                  </div>
                  <div class="flex align-items-center gap-2 flex-1 justify-content-end"></div>
                  <div class="flex justify-content-end">
                    <Button
                      :label="t('blockRemoteCommandPage.buttons.send')"
                      icon="pi pi-send"
                      class="p-button-sm p-button-success"
                      @click="handleResetFlexcfgTimesClick()"
                      :disabled="executingCommands.has('reset_flexcfg_area_times')"
                      :loading="executingCommands.has('reset_flexcfg_area_times')"
                    />
                  </div>
                </div>

                <!-- 擦除可配置默认参数区：点击发送后弹出密码框，输入0574后下发控制字574 -->
                <div v-if="command.id === 'erase_flexcfg_area'" class="command-item">
                  <div class="command-label">
                    {{ getCommandDisplayName(command.name) }}
                    <span class="password-hint">{{ t('blockRemoteCommandPage.labels.needPassword') }}</span>
                  </div>
                  <div class="flex align-items-center gap-2 flex-1 justify-content-end"></div>
                  <div class="flex justify-content-end">
                    <Button
                      :label="t('blockRemoteCommandPage.buttons.send')"
                      icon="pi pi-send"
                      class="p-button-sm p-button-success"
                      @click="handleEraseFlexcfgAreaClick()"
                      :disabled="executingCommands.has('erase_flexcfg_area')"
                      :loading="executingCommands.has('erase_flexcfg_area')"
                    />
                  </div>
                </div>

                <!-- 接触器执行策略结果紧跟在“下设电池堆控制开关”之后显示 -->
                <div v-if="command.id === 'batt_stack_ctrl_switch'" class="command-item">
                  <div class="command-label">
                    {{ t('blockRemoteCommandPage.sections.contactorStrategyResult') }}
                  </div>
                  <div class="flex align-items-center gap-2 flex-1 justify-content-end">
                    <div
                      v-for="item in feedbackStatusData"
                      :key="item.id"
                      class="flex align-items-center gap-2"
                    >
                      <Tag
                        :value="getStatusDisplay(item.value)"
                        :severity="item.severity"
                        class="status-tag"
                      />
                    </div>
                  </div>
                  <div class="flex justify-content-end"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="section-divider"></div>
          
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
        <Button 
          :label="t('blockRemoteCommandPage.buttons.cancel')" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="showConfirmDialog = false" 
        />
        <Button 
          :label="t('blockRemoteCommandPage.buttons.confirm')" 
          icon="pi pi-check" 
          class="p-button-danger" 
          @click="executeConfirmedCommandWithToast"
        />
      </template>
    </Dialog>

    <!-- 密码验证对话框（复位系统端口参数 / 复位/擦除可配置默认参数区 共用） -->
    <Dialog
      v-model:visible="showPasswordDialog"
      :header="t('blockRemoteCommandPage.dialogs.passwordVerification')"
      :modal="true"
      :closable="true"
      :style="{ width: '360px' }"
      @hide="cancelPasswordDialog"
    >
      <div class="flex flex-column gap-3">
        <p class="password-dialog-message">{{ getPasswordDialogMessage() }}</p>
        <div class="field">
          <label for="reset-port-password">{{ t('blockRemoteCommandPage.dialogs.passwordLabel') }}</label>
          <InputText
            id="reset-port-password"
            v-model="inputPassword"
            type="password"
            @keyup.enter="confirmPasswordDialog"
            autofocus
          />
        </div>
        <div v-if="passwordError" class="password-error">{{ t('blockRemoteCommandPage.dialogs.passwordError') }}</div>
      </div>
      <template #footer>
        <Button :label="t('blockRemoteCommandPage.buttons.cancel')" icon="pi pi-times" class="p-button-text" @click="cancelPasswordDialog" />
        <Button :label="t('blockRemoteCommandPage.buttons.confirm')" icon="pi pi-check" @click="confirmPasswordDialog" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onDeactivated } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useRemoteCommand } from '@/composables/core/data-processing/remote-control/useRemoteCommand'
import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'
import { parseBAUResponseCode, parseContactorExecutionResult } from '@/configs/commands/block/blockRemoteCommandConfig'
import { PAGE_PASSWORDS } from '@/configs/passwords'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'

// Toast 组件
const toast = useToast()
const { t } = useI18n()

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

// 复位系统端口参数密码验证
const showPasswordDialog = ref(false)
const inputPassword = ref('')
const passwordError = ref(false)
// 当前需要密码验证的命令ID，用于区分不同敏感操作
const currentPasswordCommandId = ref('reset_block_param')

/** 获取模式标签文本 */
function getModeLabel(mode) {
  return mode === 'remote'
    ? t('blockRemoteCommandPage.statuses.mode.remote')
    : t('blockRemoteCommandPage.statuses.mode.local')
}

/**
 * 获取模式标签样式
 * @param {string} mode - 模式类型 ('remote' | 'local')
 * @returns {string} PrimeVue Tag 组件的 severity 属性值
 */
function getModeSeverity(mode) {
  return 'info' // 统一使用蓝色标签
}

function getFractionDigitsByScale(scale) {
  if (!scale || scale === 1) return 0
  if (scale >= 1000) return 3
  if (scale >= 100) return 2
  if (scale >= 10) return 1
  return 0
}

/**
 * 根据当前密码命令ID，返回对应的提示文案
 */
function getPasswordDialogMessage() {
  // 为保持所有敏感操作文案一致，这里统一使用配置中的提示文本
  // 不在弹窗中直接暴露具体密码（如0574）
  return t('blockRemoteCommandPage.dialogs.passwordMessage')
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

/** 密码验证通过后，根据当前命令ID发送对应控制字 */
async function confirmPasswordDialog() {
  // 1）复位系统端口配置参数：使用页面配置的密码
  if (currentPasswordCommandId.value === 'reset_block_param') {
    if (inputPassword.value !== PAGE_PASSWORDS.RESET_PORT) {
      passwordError.value = true
      return
    }

    showPasswordDialog.value = false
    const result = await executeRemoteCommand('reset_block_param', 4)
    inputPassword.value = ''
    passwordError.value = false

    if (result?.success) {
      toast.add({
        severity: 'success',
        summary: t('toast.blockRemoteCommand.executeSuccess'),
        detail: getOptionLabel('复位系统端口配置参数'),
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: t('toast.blockRemoteCommand.executeFailed'),
        detail: result?.error || '',
        life: 5000
      })
    }
    return
  }

  // 2）复位/擦除可配置默认参数：密码固定为字符串"0574"，下发控制字574
  if (currentPasswordCommandId.value === 'reset_flexcfg_area_times' || currentPasswordCommandId.value === 'erase_flexcfg_area') {
    if (inputPassword.value !== '0574') {
      passwordError.value = true
      return
    }

    showPasswordDialog.value = false
    const commandId = currentPasswordCommandId.value
    const result = await executeRemoteCommand(commandId, 574)
    const displayName =
      commandId === 'reset_flexcfg_area_times'
        ? getCommandDisplayName('复位可配置默认参数次数')
        : getCommandDisplayName('擦除可配置默认参数区')

    inputPassword.value = ''
    passwordError.value = false

    if (result?.success) {
      toast.add({
        severity: 'success',
        summary: t('toast.blockRemoteCommand.executeSuccess'),
        detail: displayName,
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: t('toast.blockRemoteCommand.executeFailed'),
        detail: result?.error || '',
        life: 5000
      })
    }
    return
  }
}

function cancelPasswordDialog() {
  showPasswordDialog.value = false
  inputPassword.value = ''
  passwordError.value = false
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
    const fields = command.id === 'reset_block_param' ? command.bitFields.filter((b) => b.bit !== 2) : command.bitFields
    return fields.some((bf) => checkboxStates[command.id]?.[bf.bit])
  }
  return true
}

/** 点击复位系统端口参数发送：弹出密码框，验证通过后直接发送 value=4 */
function handlePortParamSendClick() {
  inputPassword.value = ''
  passwordError.value = false
  currentPasswordCommandId.value = 'reset_block_param'
  showPasswordDialog.value = true
}

/** 点击复位可配置默认参数次数：弹出密码框，验证通过后发送 command=574 */
function handleResetFlexcfgTimesClick() {
  inputPassword.value = ''
  passwordError.value = false
  currentPasswordCommandId.value = 'reset_flexcfg_area_times'
  showPasswordDialog.value = true
}

/** 点击擦除可配置默认参数区：弹出密码框，验证通过后发送 command=574 */
function handleEraseFlexcfgAreaClick() {
  inputPassword.value = ''
  passwordError.value = false
  currentPasswordCommandId.value = 'erase_flexcfg_area'
  showPasswordDialog.value = true
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
    'reset_event_record_flash': t('blockRemoteCommandPage.commands.复位事件记录存储器'),
    'reset_flexcfg_area_times': t('blockRemoteCommandPage.commands.复位可配置默认参数次数'),
    'erase_flexcfg_area': t('blockRemoteCommandPage.commands.擦除可配置默认参数区'),
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
  window.electron.ipcRenderer.removeAllListeners?.('RESET_EVENT_RECORD_FLASH')
  window.electron.ipcRenderer.removeAllListeners?.('SET_BLOCK_SOC')
  window.electron.ipcRenderer.removeAllListeners?.('RESET_FLEXCFG_AREA_TIMES')
  window.electron.ipcRenderer.removeAllListeners?.('ERASE_FLEXCFG_AREA')
  window.electron.ipcRenderer.removeAllListeners?.('GET_BATT_STACK_CTRL_SWITCH_RESULT')

  // 监听堆模式遥控命令应答
  window.electron.ipcRenderer.on('BATT_STACK_CTRL_SWITCH', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('FORCE_CLEAR_SAVE_FAULT', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('RESET_BLOCK_PARAM', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('PERIOD_INS_DETECT_EN', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('CONTACTOR_SELFTEST_EN', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('RESET_BAU', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('MANUAL_CTRL_SD_RECORD', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('RESET_EVENT_RECORD_FLASH', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('SET_BLOCK_SOC', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('RESET_FLEXCFG_AREA_TIMES', onRemoteCommandResponse)
  window.electron.ipcRenderer.on('ERASE_FLEXCFG_AREA', onRemoteCommandResponse)
  // 监听堆模式反馈查询应答
  window.electron.ipcRenderer.on('GET_BATT_STACK_CTRL_SWITCH_RESULT', onRemoteCommandResponse)
  
  // 初始化下拉框默认值
  initializeDropdownDefaults()
})

onDeactivated(() => {
  // 停止监听器
  stopRemoteCommandListeners()
  stopFeedbackPolling()
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
  window.electron.ipcRenderer.removeAllListeners('RESET_EVENT_RECORD_FLASH', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('SET_BLOCK_SOC', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('RESET_FLEXCFG_AREA_TIMES', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('ERASE_FLEXCFG_AREA', onRemoteCommandResponse)
  window.electron.ipcRenderer.removeAllListeners('GET_BATT_STACK_CTRL_SWITCH_RESULT', onRemoteCommandResponse)
})

// ========== 翻译辅助 ==========
function getCommandDisplayName(name) {
  return t(`blockRemoteCommandPage.commands.${name}`, name)
}

function translateOptions(options = []) {
  return (options || []).map(opt => ({ ...opt, label: getOptionLabel(opt.label) }))
}

function getOptionLabel(label) {
  return t(`blockRemoteCommandPage.options.${label}`, label)
}

function getInputPlaceholder(ph) {
  return ph ? t(`blockRemoteCommandPage.options.${ph}`, ph) : t('blockRemoteCommandPage.buttons.select')
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

/* 模式标签样式 */
.mode-tag {
  font-size: 0.75rem !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-weight: 500 !important;
  white-space: nowrap;
  flex-shrink: 0;
}





  /* 复选框组样式 */

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

/* 密码提示文字 */
.password-hint {
  font-size: 0.8rem;
  color: var(--orange-500);
  margin-left: 4px;
}

/* 密码对话框样式 */
.password-dialog-message {
  margin: 0 0 12px 0;
  color: var(--text-color);
  line-height: 1.5;
}

.password-dialog-message + .field {
  margin-top: 0;
}

.password-error {
  color: var(--red-500);
  font-size: 0.9rem;
  margin-top: 4px;
}

.password-dialog-message + .field label,
.field label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.field .p-inputtext {
  width: 100%;
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
  justify-content: flex-end;
  align-items: center;
}

/* 控制组件样式 */

/* 执行状态样式 */
.executing {
  opacity: 0.7;
  pointer-events: none;
}

.executing .p-button {
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
