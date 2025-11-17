<script setup>
// DI/DO反馈页面：直接监听IO状态消息，无需pinia store
import { computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { throttle } from 'lodash'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'

import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { pickIo } from '@/composables/core/data-processing/common/parseIoStatus'
import { parseIoStatus } from '@/composables/core/data-processing/common/parseIoStatus'
import { useRemoteCommand } from '@/composables/core/data-processing/remote-control/useRemoteCommand'
//import { ERROR_CODES } from '../../../../main/table.js'

const { selectedCluster } = useClusterSelect()
const toast = useToast()
const { t, te, locale } = useI18n()

// 翻译函数 - 参考didoControl.vue的实现方式
const translateCommandName = (name) => {
  return locale.value === 'zh' 
    ? name 
    : te(`commandIssue.commands.${name}`) 
      ? t(`commandIssue.commands.${name}`) 
      : name
}

const translateCommandOption = (option) => {
  return locale.value === 'zh' 
    ? option 
    : te(`commandIssue.commandOptions.${option}`) 
      ? t(`commandIssue.commandOptions.${option}`) 
      : option
}

const translateConfirmMessage = (message) => {
  return locale.value === 'zh' 
    ? message 
    : te(`commandIssue.confirmations.${message}`) 
      ? t(`commandIssue.confirmations.${message}`) 
      : message
}

const translateBitFieldName = (name) => {
  return locale.value === 'zh' 
    ? name 
    : te(`commandIssue.commandOptions.${name}`) 
      ? t(`commandIssue.commandOptions.${name}`) 
      : name
}

// 使用遥控命令服务
const {
  // 响应式状态
  selectedValues,
  executingCommands,
  showBitFieldDialog,
  showConfirmDialog,
  currentBitFieldCommand,
  confirmMessage,
  feedbackStatus,
  
  // 前置条件执行状态
  isExecutingPreCondition,
  currentPreConditionTopic,

  // 计算属性
  controlCommandTableData,
  testModeContactorData,
  testModeOtherData,
  contactorIndependentData,
  feedbackStatusData,

  // 方法
  executeRemoteCommand,
  handleMultiselectCommand,
  handleCheckboxGroupCommand,
  handleCommandExecution,
  confirmBitFieldCommand,
  executeConfirmedCommand,
  handleCheckboxBitFieldControl,
  getBitFieldValue,
  setBitFieldValue,
  getBitValue,
  setBitValue,
  hasBitFieldValue,
  getBitFieldCombinedValue,
  getStatusSeverity,
  startRemoteCommandListeners,
  stopRemoteCommandListeners,
  startFeedbackPolling,
  stopFeedbackPolling,
  handleFeedbackQueryResponse
} = useRemoteCommand()

// 翻译后的控制信息表格数据
const translatedControlCommandTableData = computed(() => {
  return controlCommandTableData.value.map(cmd => ({
    ...cmd,
    name: translateCommandName(cmd.name),
    options: cmd.options ? cmd.options.map(option => ({
      ...option,
      label: translateCommandOption(option.label)
    })) : cmd.options
  }))
})

// 翻译后的测试模式数据
const translatedTestModeContactorData = computed(() => {
  return testModeContactorData.value.map(cmd => ({
    ...cmd,
    name: translateCommandName(cmd.name),
    options: cmd.options ? cmd.options.map(option => ({
      ...option,
      label: translateCommandOption(option.label)
    })) : cmd.options
  }))
})

const translatedTestModeOtherData = computed(() => {
  return testModeOtherData.value.map(cmd => ({
    ...cmd,
    name: translateCommandName(cmd.name),
    options: cmd.options ? cmd.options.map(option => ({
      ...option,
      label: translateCommandOption(option.label)
    })) : cmd.options
  }))
})

// 合并测试模式数据
const testModeAllData = computed(() => [
  ...translatedTestModeContactorData.value,
  ...translatedTestModeOtherData.value
])

/**
 * 将接触器独立控制数据展开为行数据
 * 每个下拉框选项作为独立的一行
 */
const contactorIndependentRowData = computed(() => {
  const rows = []

  contactorIndependentData.value.forEach(command => {
    if (command.type === 'multi_dropdown' && command.dropdowns) {
      command.dropdowns.forEach(dropdown => {
        rows.push({
          rowId: `${command.id}_${dropdown.name}`,
          commandId: command.id,
          name: translateCommandOption(dropdown.name),
          stateKey: `${command.id}_${dropdown.name}`,
          options: dropdown.options ? dropdown.options.map(option => ({
            ...option,
            label: translateCommandOption(option.label)
          })) : dropdown.options,
          bitStart: dropdown.bitStart,
          bitEnd: dropdown.bitEnd
        })
      })
    }
  })

  return rows
})

/**
 * 检查是否有有效的接触器操作（非"无效"选项）
 */
const hasValidContactorOperations = computed(() => {
  return contactorIndependentRowData.value.some(row => {
    const selectedValue = selectedValues[row.stateKey]
    return selectedValue != null && selectedValue !== 0
  })
})

// 页面类型检测 - 设置为cluster类型以显示多选框
const { addPageTypeMapping } = usePageTypeDetection()
addPageTypeMapping('/Cluster/Order', 'cluster')

// 自动初始化多选框为数组
watch([translatedControlCommandTableData, testModeAllData], () => {
  translatedControlCommandTableData.value.forEach(command => {
    if (command.type === 'checkbox_group' && selectedValues[command.id] === undefined) {
      selectedValues[command.id] = []
    }
  })
  testModeAllData.value.forEach(command => {
    if (selectedValues[command.id] === undefined) {
      selectedValues[command.id] = []
    }
  })
}, { immediate: true })

// 自动初始化接触器独立执行下拉框默认值为第一个选项
watch(contactorIndependentRowData, () => {
  contactorIndependentRowData.value.forEach(row => {
    if (selectedValues[row.stateKey] === undefined && row.options && row.options.length > 0) {
      selectedValues[row.stateKey] = row.options[0].value
    }
  })
}, { immediate: true })

// 复选框变更处理
const handleCheckboxChange = (commandId, optionValue, event) => {
  if (!selectedValues[commandId]) {
    selectedValues[commandId] = []
  }
  const checked = event.target.checked
  const currentValues = [...selectedValues[commandId]]
  
  if (checked) {
    if (!currentValues.includes(optionValue)) {
      currentValues.push(optionValue)
    }
  } else {
    const index = currentValues.indexOf(optionValue)
    if (index > -1) {
      currentValues.splice(index, 1)
    }
  }
  
  selectedValues[commandId] = currentValues
}

// 全选/取消全选处理
const handleSelectAll = (commandId, options, event) => {
  const checked = event.target.checked
  if (checked) {
    selectedValues[commandId] = options.map(opt => opt.value)
  } else {
    selectedValues[commandId] = []
  }
}

// 判断是否为全选状态
const isAllSelected = (commandId, options) => {
  if (!selectedValues[commandId] || selectedValues[commandId].length === 0) {
    return false
  }
  return selectedValues[commandId].length === options.length
}

// ========== IO状态相关 ==========

// IO状态消息节流处理函数（限流入口）
const throttledIoStatusHandler = throttle(
  (event, message) => {
    parseIoStatus(message)
  },
  1000, // 2秒刷新间隔
  {
    leading: true,   // 首次调用立即执行
    trailing: true   // 结束时执行最后一次
  }
)

// MQTT消息处理函数
function onIOSummary(_e, msg) {
  throttledIoStatusHandler(_e, msg)
}

// 遥控命令应答处理函数
function onRemoteCommandResponse(_e, msg) {
  handleRemoteCommandResponse(msg)
}

/**
 * 处理遥控命令应答
 * @param {Object} msg - MQTT消息对象
 */
function handleRemoteCommandResponse(msg) {
  const { dataType, data, blockId, clusterId, topic } = msg

  // 检查是否是来自BAU的应答（topic包含bms/bau/d2s）
  if (!topic || !topic.includes('bms/bau/d2s')) {
    return
  }

  // 提取命令类型（dataType转小写）
  const commandType = dataType ? dataType.toLowerCase() : 'unknown'

  // 检查是否是反馈查询应答（通过命令类型判断）
  if (commandType === 'get_contactor_ctrl_result') {
    handleFeedbackQueryResponse('get_contactor_ctrl_result', data)
    return
  }
  if (commandType === 'get_insulation_detect_result') {
    handleFeedbackQueryResponse('get_insulation_detect_result', data)
    return
  }
  if (commandType === 'get_sys_run_mode') {
    handleFeedbackQueryResponse('get_sys_run_mode', data)
    return
  }

  // 处理其他遥控命令应答
  handleRemoteCommandResponseWithToast(commandType, data, blockId, clusterId)
}

/**
 * 处理遥控命令应答并显示Toast
 * @param {string} commandType - 命令类型
 * @param {Object} data - 应答数据
 * @param {number} blockId - 堆号
 * @param {number} clusterId - 簇号
 */
function handleRemoteCommandResponseWithToast(commandType, data, blockId, clusterId) {
  if (!data) {
    console.warn(`[Order] 遥控命令应答数据为空: ${commandType}`)
    return
  }

  // 检查是否是前置条件应答，如果是则不显示弹窗
  if (isExecutingPreCondition.value && commandType === 'contactor_ctrl') {
    // console.log('[前置条件] 前置条件应答，跳过弹窗显示:', commandType)
    return
  }

  // 获取设备显示名称
  const deviceName = t('toast.remoteControl.deviceName.cluster', { blockId, clusterId })

  // 获取命令显示名称
  const commandNameMap = {
    'contactor_ctrl': t('commandIssue.commands.下设接触器执行策略'),
    'contactor_ctrl_indep': t('commandIssue.commands.接触器独立执行'),
    'insulation_detect_ctrl': t('commandIssue.commands.下设绝缘电阻检测指令'),
    'sys_mode_ctrl': t('commandIssue.commands.设置系统运行模式'),
    'brokenwire_detect_en': t('commandIssue.commands.掉线检测功能使能'),
    'hsd_lsd_ctrl_test': t('commandIssue.commands.高边控制'),
    'force_clear_bcu_fault': t('commandIssue.commands.强制清除BCU故障'),
    'reset_record_flash': t('commandIssue.commands.重置记录Flash'),
    'force_ocv_calib': t('commandIssue.commands.强制OCV校准'),
    'weight_calib': t('commandIssue.commands.权重校准'),
    'force_soh_calib': t('commandIssue.commands.强制SOH校准'),
    'restore_ctrl_param': t('commandIssue.commands.参数复位')
  }

  const commandName = commandNameMap[commandType] || commandType

  // 检查是否是错误应答
  if (data.error) {
    toast.add({
      severity: 'error',
      summary: t('toast.commandIssue.remoteCommandFailed'),
      detail: `${deviceName}: ${commandName} ${t('toast.commandIssue.executionFailed')} - ${data.message || t('toast.common.unknownError')}`,
      life: 6000
    })
    return
  }

  // 检查应答码
  if (data.code !== undefined) {
    const isSuccess = data.code === 0xE0

    const statusText = t(`toast.errorCodes.0x${data.code.toString(16).toUpperCase()}`) || t('toast.commandIssue.unknownStatus')
    const errorCodeHex = `0x${data.code.toString(16).toUpperCase()}`

    if (isSuccess) {
      toast.add({
        severity: 'success',
        summary: t('toast.commandIssue.remoteCommandSuccess'),
        detail: `${deviceName}: ${commandName} ${t('toast.commandIssue.executionSuccess')} (${t('toast.commandIssue.responseCode')}: ${errorCodeHex})`,
        life: 4000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: t('toast.commandIssue.remoteCommandFailed'),
        detail: `${deviceName}: ${commandName} ${statusText} (${t('toast.commandIssue.responseCode')}: ${errorCodeHex})`,
        life: 6000
      })
    }
  } else {
    console.log(`[Order] 遥控命令应答:`, { commandType, data, blockId, clusterId })
  }
}





/* ------- 重构表格数据逻辑 ------- */
const tableRows = computed(() => {
  const key = selectedCluster.value ?? ''
  /* 把 Map 转成普通对象便于后续逻辑 */
 const frame = Object.fromEntries(
   pickIo(key, [                     // 需要的所有类别
     '系统DI输入状态', '系统DO驱动状态',
     'BMU_DI1反馈',   'BMU_DI2反馈', 'BMU_DI3反馈'
   ]).map(b => [b.class, b.element])
 )

  const rows = []

  // 1. 系统DI反馈
  const sysDI = frame['系统DI输入状态'] || []
  for (let i = 0; i < sysDI.length; i++) {
    rows.push({
      id: `sys-di-${i}`,
      type: '系统',
      diParam: sysDI[i]?.label?.replace('反馈', '') || `DI${i+1}`,
      diValue: sysDI[i]?.value ?? false,
      doParam: '',
      doValue: null
    })
  }

  // 2. 系统DO反馈
  const sysDO = frame['系统DO驱动状态'] || []
  for (let i = 0; i < sysDO.length; i++) {
    const doItem = sysDO[i]

    // 尝试匹配系统DI行
    let matchedRow = rows[i]

    if (matchedRow) {
      // 更新已有行
      const doParam = doItem?.label?.replace('反馈', '') || `DO${i+1}`
      matchedRow.doParam = doParam === '地址自适应' ? t('commandIssue.commandOptions.地址自适应输出') : doParam
      matchedRow.doValue = doItem?.value ?? false
    } else {
      // 创建新行
      const doParam = doItem?.label?.replace('反馈', '') || `DO${i+1}`
      rows.push({
        id: `sys-do-${i}`,
        type: '系统',
        diParam: '',
        diValue: null,
        doParam: doParam === '地址自适应' ? t('commandIssue.commandOptions.地址自适应输出') : doParam,
        doValue: doItem?.value ?? false
      })
    }
  }

  // 3. BMU DI反馈
  const bmuClasses = ['BMU_DI1反馈', 'BMU_DI2反馈', 'BMU_DI3反馈']
  bmuClasses.forEach((cls, bmuIndex) => {
    const bmuDI = frame[cls] || []
    bmuDI.forEach((item, itemIndex) => {
      rows.push({
        id: `bmu-${bmuIndex}-${itemIndex}`,
        type: `BMU${bmuIndex + 1}`,
        diParam: item?.label?.replace('反馈', '') || `DI${itemIndex + 1}`,
        diValue: item?.value ?? false,
        doParam: '',
        doValue: null
      })
    })
  })

  return rows
})

// ========== 包装函数处理Toast ==========

/**
 * 处理复选框组命令（带Toast）
 */
async function handleCheckboxGroupCommandWithToast(commandId, selectedOptions) {
  const result = await handleCheckboxGroupCommand(commandId, selectedOptions)

  if (result && result.success !== undefined) {
    // 如果显示了对话框，不需要显示Toast
    if (result.showDialog) {
      return
    }

    if (result.success) {
      if (result.successCount !== undefined) {
        toast.add({
          severity: 'info',
          summary: t('toast.commandIssue.commandSent'),
          detail: t('toast.commandIssue.sentToCount', { 
            commandName: translateCommandName(result.commandName), 
            count: String(result.successCount), 
            failInfo: result.failCount > 0 ? t('toast.commandIssue.someFailed', { count: String(result.failCount) }) : ''
          }),
          life: 3000
        })
      }
    } else {
      toast.add({
        severity: result.error === '请至少选择一个控制项' ? 'warn' : 'error',
        summary: result.error === '请至少选择一个控制项' ? t('toast.commandIssue.selectControlItems') : t('toast.commandIssue.executeFailed'),
        detail: result.error,
        life: result.error === '请至少选择一个控制项' ? 3000 : 5000
      })
    }
  }
}

/**
 * 处理命令执行（带Toast）
 */
async function handleCommandExecutionWithToast(commandId, value = null) {
  const result = await handleCommandExecution(commandId, value)

  if (result && result.success !== undefined) {
    // 如果显示了对话框，不需要显示Toast
    if (result.showDialog) {
      return
    }

    if (result.success) {
      if (result.successCount !== undefined) {
        toast.add({
          severity: 'info',
          summary: t('toast.commandIssue.commandSent'),
          detail: t('toast.commandIssue.sentToCount', { 
            commandName: translateCommandName(result.commandName), 
            count: String(result.successCount), 
            failInfo: result.failCount > 0 ? t('toast.commandIssue.someFailed', { count: String(result.failCount) }) : ''
          }),
          life: 3000
        })
      }
    } else {
      toast.add({
        severity: 'error',
        summary: t('toast.commandIssue.executeFailed'),
        detail: result.error,
        life: 5000
      })
    }
  }
}

/**
 * 处理复选框bit位控制（带Toast）
 */
async function handleCheckboxBitFieldControlWithToast(commandId, command) {
  const result = await handleCheckboxBitFieldControl(commandId, command)

  if (result && result.success !== undefined) {
    if (result.success) {
      if (result.successCount !== undefined) {
        toast.add({
          severity: 'info',
          summary: t('toast.commandIssue.commandSent'),
          detail: t('toast.commandIssue.sentToCount', { 
            commandName: translateCommandName(command.name), 
            count: String(result.successCount), 
            failInfo: result.failCount > 0 ? t('toast.commandIssue.someFailed', { count: String(result.failCount) }) : ''
          }),
          life: 3000
        })
      }
    } else {
      toast.add({
        severity: result.error === '请至少选择一个控制项' ? 'warn' : 'error',
        summary: result.error === '请至少选择一个控制项' ? t('toast.commandIssue.selectControlItems') : t('toast.commandIssue.controlFailed'),
        detail: result.error,
        life: result.error === '请至少选择一个控制项' ? 3000 : 5000
      })
    }
  }
}

/**
 * 批量下发所有接触器命令
 */
async function handleBatchSend() {
  // 获取所有非"无效"的接触器控制项
  const activeRows = contactorIndependentRowData.value.filter(row => {
    const selectedValue = selectedValues[row.stateKey]
    return selectedValue != null && selectedValue !== 0 // 过滤掉无效选项（值为0）
  })

  if (activeRows.length === 0) {
    toast.add({
      severity: 'warn',
      summary: t('toast.commandIssue.noValidOperation'),
      detail: t('toast.commandIssue.selectValidContactorOperation'),
      life: 3000
    })
    return
  }

  // 批量下发接触器独立控制命令
  for (const command of contactorIndependentData.value) {
    try {
      const result = await handleCheckboxBitFieldControl(command.id, command)
      if (result && result.success) {
        toast.add({
          severity: 'info',
          summary: t('toast.commandIssue.commandSent'),
          detail: t('toast.commandIssue.commandSentWithName', { commandName: translateCommandName(command.name || t('commandIssue.commands.接触器独立控制')) }),
          life: 3000
        })
      } else {
        toast.add({
          severity: 'error',
          summary: t('toast.commandIssue.commandSendFailed'),
          detail: result?.error || t('toast.commandIssue.unknownError'),
          life: 5000
        })
      }
    } catch (error) {
      console.error(`批量下发命令失败:`, error)
      toast.add({
        severity: 'error',
        summary: t('toast.commandIssue.commandSendFailed'),
        detail: error.message || t('toast.commandIssue.unknownError'),
        life: 5000
      })
    }
  }
}

/**
 * 处理确认命令执行（带Toast）
 */
async function executeConfirmedCommandWithToast() {
  const result = await executeConfirmedCommand()

  if (result && result.success !== undefined) {
    if (result.success) {
      if (result.successCount !== undefined) {
        toast.add({
          severity: 'info',
          summary: t('toast.commandIssue.commandSent'),
          detail: t('toast.commandIssue.sentToCount', { 
            commandName: translateCommandName(result.commandName), 
            count: String(result.successCount), 
            failInfo: result.failCount > 0 ? t('toast.commandIssue.someFailed', { count: String(result.failCount) }) : ''
          }),
          life: 3000
        })
      }
    } else {
      toast.add({
        severity: 'error',
        summary: t('toast.commandIssue.executeFailed'),
        detail: result.error,
        life: 5000
      })
    }
  }
}

// 组件挂载时监听IO状态消息和启动遥控命令服务
onMounted(() => {
  window.electron.ipcRenderer.on('IO_STATUS', onIOSummary)
  // console.log('[Order] 组件挂载，开始监听IO_STATUS消息')
  
  // 监听遥控命令应答
  const remoteCommandEvents = [
    'CONTACTOR_CTRL',
    'CONTACTOR_CTRL_INDEP',
    'INSULATION_DETECT_CTRL',
    'SYS_MODE_CTRL',
    'BROKENWIRE_DETECT_EN',
    'CONTACTOR_CTRL_TEST',
    'HSD_LSD_CTRL_TEST',
    'IO_CTRL_TEST',
    'FORCE_CLEAR_BCU_FAULT',
    'RESET_RECORD_FLASH',
    'FORCE_OCV_CALIB',
    'WEIGHT_CALIB',
    'FORCE_SOH_CALIB',
    'RESTORE_CTRL_PARAM',
    // 反馈查询应答事件
    'GET_CONTACTOR_CTRL_RESULT',
    'GET_INSULATION_DETECT_RESULT',
    'GET_SYS_RUN_MODE'
  ]

  // 预清理所有遥控命令事件监听器
  remoteCommandEvents.forEach(eventName => {
    window.electron.ipcRenderer.removeAllListeners(eventName)
  })

  remoteCommandEvents.forEach(eventName => {
    window.electron.ipcRenderer.on(eventName, onRemoteCommandResponse)
    // console.log(`[Order] 开始监听遥控命令应答: ${eventName}`)
  })

  // 启动遥控命令服务
  startRemoteCommandListeners()

  // 确保下拉框默认值初始化
  nextTick(() => {
    // 初始化控制信息表格中的下拉框默认值
    translatedControlCommandTableData.value.forEach(command => {
      if (command.type === 'dropdown' && command.options && command.options.length > 0) {
        if (selectedValues[command.id] === undefined) {
          selectedValues[command.id] = command.options[0].value
          console.log(`[Order] 初始化下拉框默认值: ${command.name} = ${command.options[0].label}`)
        }
      } else if (command.type === 'checkbox_group') {
        // 初始化多选框类型为空数组
        if (selectedValues[command.id] === undefined) {
          selectedValues[command.id] = []
        }
      }
    })
    
    // 初始化测试模式数据中的多选框
    testModeAllData.value.forEach(command => {
      if (selectedValues[command.id] === undefined) {
        selectedValues[command.id] = []
      }
    })

    // 初始化接触器独立执行下拉框默认值为第一个选项
    contactorIndependentRowData.value.forEach(row => {
      if (selectedValues[row.stateKey] === undefined && row.options && row.options.length > 0) {
        selectedValues[row.stateKey] = row.options[0].value
        console.log(`[Order] 初始化接触器独立执行下拉框默认值: ${row.name} = ${row.options[0].label}`)
      }
    })
  })

  // 启动反馈状态定时查询
  startFeedbackPolling(() => selectedCluster.value)
  // console.log('[Order] 反馈状态定时查询已启动')
})

// 组件卸载时移除监听
onUnmounted(() => {  
  // 取消IO状态消息节流函数中待执行的调用
  throttledIoStatusHandler.cancel()
  
  // 停止反馈状态定时查询
  stopFeedbackPolling()
  // 停止遥控命令服务
  stopRemoteCommandListeners()
  window.electron.ipcRenderer.removeAllListeners('IO_STATUS', onIOSummary)
  console.log('[Order] 组件卸载，移除IO_STATUS监听')

  // 移除遥控命令应答监听
  const remoteCommandEvents = [
    'CONTACTOR_CTRL',
    'CONTACTOR_CTRL_INDEP',
    'INSULATION_DETECT_CTRL',
    'SYS_MODE_CTRL',
    'BROKENWIRE_DETECT_EN',
    'HSD_LSD_CTRL_TEST',
    'FORCE_CLEAR_BCU_FAULT',
    'RESET_RECORD_FLASH',
    'FORCE_OCV_CALIB',
    'WEIGHT_CALIB',
    'FORCE_SOH_CALIB',
    'RESTORE_CTRL_PARAM',
    // 添加缺失的反馈查询应答事件
    'GET_CONTACTOR_CTRL_RESULT',
    'GET_INSULATION_DETECT_RESULT',
    'GET_SYS_RUN_MODE'
  ]

  // 使用removeAllListeners彻底清理每个事件的所有监听器
  remoteCommandEvents.forEach(eventName => {
    window.electron.ipcRenderer.removeAllListeners(eventName)
    console.log(`[Order] 彻底清理事件监听器: ${eventName}`)
  })

  console.log('[Order] 组件卸载完成，所有资源已清理')
})
</script>

<template>
  <div class="order-page">
    <div class="card">
      <!-- Toast组件已移至AppLayout.vue，避免重复声明 -->
      <!-- 主要内容区域 - 上下两行布局 -->
      <div class="main-content">
        <!-- 上行：三个表格并排 -->
        <div class="top-row">
          <!-- 左侧：控制信息表格 -->
          <div class="control-info-area">
            <div class="table-container">
              <h2 class="table-title">{{ t('commandIssue.sections.controlInfo') }}</h2>
              <table class="native-table control-info-table">
                <thead>
                  <tr>
                    <th style="min-width:300px">{{ t('commandIssue.table.commandName') }}</th>
                    <th style="width:80px">{{ t('commandIssue.table.operation') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="data in translatedControlCommandTableData" :key="data.id">
                    <td>
                      <div class="command-row">
                        <div class="command-name-wrapper">
                          <span class="command-name">{{ data.name }}</span>
                          <!-- 执行状态标签 -->
                          <span
                            v-if="executingCommands.has(data.id)"
                            class="command-status"
                          >
                            {{ t('commandIssue.buttons.executing') }}
                          </span>
                        </div>
                        <!-- 下拉选择类型命令 -->
                        <select
                          v-if="data.type === 'dropdown'"
                          v-model="selectedValues[data.id]"
                          class="command-dropdown-inline native-select"
                          :disabled="executingCommands.has(data.id)"
                        >
                          <option :value="null">{{ t('commandIssue.buttons.selectOperation') }}</option>
                          <option v-for="option in data.options" :key="option.value" :value="option.value">
                            {{ option.label }}
                          </option>
                        </select>
                        <!-- 多选框类型命令 -->
                        <div v-else-if="data.type === 'checkbox_group'" class="checkbox-container-inline">
                          <!-- 全选/取消全选 -->
                          <label class="checkbox-item-inline select-all-label">
                            <input
                              type="checkbox"
                              :checked="isAllSelected(data.id, data.options)"
                              @change="handleSelectAll(data.id, data.options, $event)"
                              :disabled="executingCommands.has(data.id)"
                              class="native-checkbox"
                            />
                            <span>{{ t('commandIssue.buttons.selectAll') }}</span>
                          </label>
                          <label
                            v-for="option in data.options"
                            :key="option.value"
                            class="checkbox-item-inline"
                          >
                            <input
                              type="checkbox"
                              :value="option.value"
                              :checked="selectedValues[data.id]?.includes(option.value)"
                              @change="handleCheckboxChange(data.id, option.value, $event)"
                              :disabled="executingCommands.has(data.id)"
                              class="native-checkbox"
                            />
                            <span>{{ option.label }}</span>
                          </label>
                        </div>
                      </div>
                    </td>
                    <td>
                      <!-- 下拉选择类型命令 -->
                      <button
                        v-if="data.type === 'dropdown'"
                        class="btn btn-primary"
                        :disabled="executingCommands.has(data.id) || selectedValues[data.id] == null"
                        @click="handleCommandExecutionWithToast(data.id, selectedValues[data.id])"
                      >
                        {{ t('commandIssue.buttons.send') }}
                      </button>
                      <!-- 多选框类型命令 -->
                      <button
                        v-else-if="data.type === 'checkbox_group'"
                        class="btn btn-primary"
                        :disabled="
                          executingCommands.has(data.id) ||
                          (
                            (!selectedValues[data.id]?.length) &&
                            ['restore_basic_param', 'restore_factory_param'].includes(data.id)
                          )
                        "
                        @click="handleCheckboxGroupCommandWithToast(data.id, selectedValues[data.id])"
                      >
                        {{ t('commandIssue.buttons.send') }}
                      </button>
                      <!-- 按钮类型命令 -->
                      <button
                        v-else-if="data.type === 'button'"
                        class="btn btn-primary"
                        :disabled="executingCommands.has(data.id)"
                        @click="handleCommandExecutionWithToast(data.id)"
                      >
                        {{ executingCommands.has(data.id) ? '发送中...' : '发送' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 中间：测试模式下DO控制 -->
          <div class="test-mode-area">
            <div class="table-container">
              <h2 class="table-title">{{ t('commandIssue.sections.testModeDO') }}</h2>

              <table class="native-table test-mode-table">
                <thead>
                  <tr>
                    <th style="min-width:300px">{{ t('commandIssue.table.commandName') }}</th>
                    <th style="width:80px">{{ t('commandIssue.table.operation') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="data in testModeAllData" :key="data.id">
                    <td>
                      <div class="command-row">
                        <div class="command-name-wrapper">
                          <span class="command-name">{{ data.name }}</span>
                          <!-- 执行状态标签 -->
                          <span
                            v-if="executingCommands.has(data.id)"
                            class="command-status"
                          >
                            {{ t('commandIssue.buttons.executing') }}
                          </span>
                        </div>
                        <!-- 多选框类型命令 -->
                        <div class="checkbox-container-inline">
                          <!-- 全选/取消全选 -->
                          <label class="checkbox-item-inline select-all-label">
                            <input
                              type="checkbox"
                              :checked="isAllSelected(data.id, data.options)"
                              @change="handleSelectAll(data.id, data.options, $event)"
                              :disabled="executingCommands.has(data.id)"
                              class="native-checkbox"
                            />
                            <span>{{ t('commandIssue.buttons.selectAll') }}</span>
                          </label>
                          <label
                            v-for="option in data.options"
                            :key="option.value"
                            class="checkbox-item-inline"
                          >
                            <input
                              type="checkbox"
                              :value="option.value"
                              :checked="selectedValues[data.id]?.includes(option.value)"
                              @change="handleCheckboxChange(data.id, option.value, $event)"
                              :disabled="executingCommands.has(data.id)"
                              class="native-checkbox"
                            />
                            <span>{{ option.label }}</span>
                          </label>
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        class="btn btn-primary"
                        :disabled="
                          executingCommands.has(data.id) ||
                          (
                            (!selectedValues[data.id]?.length) &&
                            ['restore_basic_param', 'restore_factory_param'].includes(data.id)
                          )
                        "
                        @click="handleCheckboxGroupCommandWithToast(data.id, selectedValues[data.id])"
                      >
                        {{ t('commandIssue.buttons.send') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- 反馈区域 -->
              <div class="feedback-section">
                <div class="section-header">
                  <span class="section-title">{{ t('commandIssue.feedback.controlQuantity') }}</span>
                  <span class="section-title">{{ t('commandIssue.feedback.feedbackValue') }}</span>
                </div>

                <!-- 反馈状态显示 -->
                <div class="feedback-control-row">
                  <span class="control-label">{{ t('commandIssue.feedback.contactorResult') }}</span>
                  <span class="feedback-value">{{ feedbackStatus.contactor_ctrl_result === '-' ? '-' : t(`commandIssue.feedback.values.${feedbackStatus.contactor_ctrl_result}`) }}</span>
                </div>

                <div class="feedback-control-row">
                  <span class="control-label">{{ t('commandIssue.feedback.insulationResult') }}</span>
                  <span class="feedback-value">{{ feedbackStatus.insulation_detect_result === '-' ? '-' : t(`commandIssue.feedback.values.${feedbackStatus.insulation_detect_result}`) }}</span>
                </div>

                <div class="feedback-control-row">
                  <span class="control-label">{{ t('commandIssue.feedback.systemMode') }}</span>
                  <span class="feedback-value">{{ feedbackStatus.sys_run_mode === '-' ? '-' : t(`commandIssue.feedback.values.${feedbackStatus.sys_run_mode}`) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：下设接触器独立执行表格 -->
          <div class="contactor-control-area">
            <div class="table-container">
              <h2 class="table-title">{{ t('commandIssue.sections.independentContactor') }}</h2>
              <table class="native-table contactor-independent-table">
                <thead>
                  <tr>
                    <th style="min-width:200px">{{ t('commandIssue.table.contactor') }}</th>
                    <th style="min-width:200px">{{ t('commandIssue.table.operation') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="data in contactorIndependentRowData" :key="data.rowId">
                    <td>
                      <div class="contactor-name-wrapper">
                        <span class="contactor-name">{{ data.name }}</span>
                        <!-- 执行状态标签 - 只有非"无效"选项才显示 -->
                        <span
                          v-if="executingCommands.has(data.commandId) && selectedValues[data.stateKey] != null && selectedValues[data.stateKey] !== 0"
                          class="command-status"
                        >
                          {{ t('commandIssue.buttons.executing') }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="operation-wrapper">
                        <select
                          v-model="selectedValues[data.stateKey]"
                          class="dropdown-control native-select"
                          :disabled="executingCommands.has(data.commandId)"
                        >
                          <option :value="null">{{ t('commandIssue.buttons.selectOperation') }}</option>
                          <option v-for="option in data.options" :key="option.value" :value="option.value">
                            {{ option.label }}
                          </option>
                        </select>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button
                class="btn btn-primary contactor-send-btn"
                :disabled="contactorIndependentData.some(cmd => executingCommands.has(cmd.id)) || !hasValidContactorOperations"
                @click="handleBatchSend"
              >
                {{ t('commandIssue.buttons.send') }}
              </button>
            </div>
                    <!-- 下行：DI/DO反馈表格 -->
        <div class="bottom-row">
          <div class="dido-table-area">
            <div class="table-container">
              <h2 class="table-title">{{ t('commandIssue.sections.didoFeedback') }}</h2>
              <div class="table-scroll-container">
                <!-- 单表布局（4列） -->
                <table class="native-table">
                  <thead>
                    <tr>
                      <th style="min-width:80px">{{ t('commandIssue.table.diParam') }}</th>
                      <th style="width:80px">{{ t('commandIssue.table.diStatus') }}</th>
                      <th style="min-width:80px">{{ t('commandIssue.table.doParam') }}</th>
                      <th style="width:80px">{{ t('commandIssue.table.doStatus') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="data in tableRows" :key="data.id">
                      <td>{{ data.diParam }}</td>
                      <td>
                        <span :class="['native-tag', data.diValue ? 'tag-success' : 'tag-danger']">
                          {{ data.diValue ? '1' : '0' }}
                        </span>
                      </td>
                      <td>{{ data.doParam }}</td>
                      <td>
                        <span :class="['native-tag', data.doValue ? 'tag-success' : 'tag-danger']">
                          {{ data.doValue ? '1' : '0' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>

      <!-- bit位控制弹窗 -->
      <Dialog
        v-model:visible="showBitFieldDialog"
        :header="currentBitFieldCommand?.name || t('commandIssue.dialogs.bitControl')"
        modal
        :style="{ width: '600px' }"
        class="bitfield-dialog"
      >
        <div v-if="currentBitFieldCommand" class="bitfield-controls">
          <div
            v-for="field in currentBitFieldCommand.bitFields"
            :key="field.name"
            class="bitfield-item"
          >
            <label class="bitfield-label">{{ translateBitFieldName(field.name) }}:</label>
            <!-- 如果有options，显示下拉框 -->
            <select
              v-if="field.options"
              :value="getBitFieldValue(currentBitFieldCommand.id, field)"
              @change="(e) => setBitFieldValue(currentBitFieldCommand.id, field, e.target.value)"
              class="bitfield-dropdown native-select"
            >
              <option :value="null">{{ t('commandIssue.buttons.selectOperation') }}</option>
              <option v-for="option in field.options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <!-- 如果没有options，显示复选框 -->
            <input
              v-else
              type="checkbox"
              :checked="getBitValue(currentBitFieldCommand.id, field.bit)"
              @change="(e) => setBitValue(currentBitFieldCommand.id, field.bit, e.target.checked)"
              class="native-checkbox"
            />
          </div>
        </div>

        <template #footer>
          <button @click="showBitFieldDialog = false" class="btn btn-secondary">
            {{ t('commandIssue.buttons.cancel') }}
          </button>
          <button
            @click="confirmBitFieldCommand"
            :disabled="!currentBitFieldCommand || !hasBitFieldValue(currentBitFieldCommand.id)"
            class="btn btn-primary"
          >
            {{ t('commandIssue.buttons.send') }}
          </button>
        </template>
      </Dialog>

      <!-- 确认对话框 -->
      <Dialog
        v-model:visible="showConfirmDialog"
        :header="t('commandIssue.dialogs.operationConfirmation')"
        :modal="true"
        :closable="true"
        :style="{ width: '400px' }"
      >
        <div class="confirm-content">
          <i class="pi pi-exclamation-triangle confirm-icon"></i>
          <span>{{ translateConfirmMessage(confirmMessage) }}</span>
        </div>

        <template #footer>
          <button
            @click="showConfirmDialog = false"
            class="btn btn-secondary"
          >
            {{ t('commandIssue.buttons.cancel') }}
          </button>
          <button
            @click="executeConfirmedCommandWithToast"
            class="btn btn-primary"
          >
            {{ t('commandIssue.buttons.confirm') }}
          </button>
        </template>
      </Dialog>

    </div>
  </div>
</template>

<style scoped>
/* ========== 基础布局 ========== */
.order-page {
  padding: 0;
  min-height: 100vh;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
}

.top-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
}

.bottom-row {
  width: 100%;
}

/* 通用表格容器 */
.control-info-area,
.test-mode-area,
.contactor-control-area,
.dido-table-area {
  display: flex;
  flex-direction: column;
}

.test-mode-area,
.contactor-control-area {
  min-height: 600px;
}

.dido-table-area .table-container {
  max-height: 400px;
  height: 400px;
}

.table-scroll-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
}

.table-container {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--surface-border);
  background: var(--surface-card);
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 下设接触器独立执行发送按钮样式 */
.contactor-send-btn {
  width: 60px;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  margin-left: 32rem;
  align-self: flex-start;
}

.table-header-with-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--primary-color);
  color: var(--primary-color-text);
  padding: 12px 20px;
}

.table-title {
  background: var(--primary-color);
  color: var(--primary-color-text);
  padding: 12px 20px;
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
}





/* 下拉框列表 */
.dropdown-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
}

.dropdown-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.dropdown-label {
  font-size: 0.9rem;
  color: var(--text-color);
  font-weight: 500;
}

.dropdown-control {
  width: 100%;
}

/* 复选框列表 */
.checkbox-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.checkbox-label {
  font-size: 0.9rem;
  color: var(--text-color);
  font-weight: 500;
  cursor: pointer;
}





/* ========== 反馈区域 ========== */
.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-section);
  font-weight: 600;
  color: var(--text-color);
  font-size: 1rem;
}

.section-header .section-title {
  flex: 1;
  font-weight: 600;
  color: var(--text-color);
}

.section-header .section-title:first-child {
  min-width: 160px;
  flex-shrink: 0;
}

.feedback-control-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--surface-border);
}

.feedback-control-row:hover {
  background: var(--surface-hover);
}

.feedback-control-row:last-child {
  border-bottom: none;
}

.feedback-value {
  min-width: 120px;
  padding: 0.75rem 1rem;
  background: var(--surface-section);
  border-radius: 8px;
  text-align: center;
  color: var(--text-color);
  font-weight: 600;
  font-size: 0.875rem;
  border: 1px solid var(--surface-border);
  margin-left: auto;
  margin-right: 68px;
}

/* ========== DataTable 样式 ========== */
:deep(.p-datatable-thead > tr > th) {
  font-size: 1rem !important;
  font-weight: 600 !important;
}

.command-name-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.command-name {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.95rem;
}

.command-status {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

/* ========== 接触器表格样式 ========== */
.contactor-name-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.contactor-name {
  font-weight: 500;
  color: var(--text-color);
}

.operation-wrapper {
  padding: 0.5rem 0;
}



.command-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  width: 100%;
  padding: 0.25rem 0;
}

.command-dropdown,
.command-dropdown-inline {
  min-width: 140px;
  font-size: 0.9rem;
}

/* ========== DataTable 悬停效果 ========== */
.control-info-table :deep(.p-datatable-tbody > tr:hover),
.test-mode-table :deep(.p-datatable-tbody > tr:hover),
.contactor-independent-table :deep(.p-datatable-tbody > tr:hover) {
  background-color: var(--surface-hover) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  transform: translateY(-1px);
}

/* 确保行级别悬停效果 */
.contactor-independent-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
  transition: all 0.2s ease;
}

.contactor-independent-table :deep(.p-datatable-tbody > tr > td) {
  border-bottom: 1px solid var(--surface-border);
  padding: 0.75rem;
}

/* ========== 确认对话框 ========== */
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

/* ========== 响应式设计 ========== */
@media (max-width: 1200px) {
  .top-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .order-page {
    padding: 0.5rem;
  }

  .command-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}

/* ========== 卡片样式 ========== */
.card {
  /* 使用全局card样式，不覆盖margin-left */
  background: var(--surface-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

/* ========== 原生组件样式 ========== */
/* 原生表格样式 */
.native-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--surface-card);
  font-size: 12px;
}

.native-table thead th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
  background-color: var(--surface-section);
  border-bottom: 2px solid var(--surface-border);
}

.native-table tbody tr {
  transition: all 0.2s ease;
}

.native-table tbody tr:hover {
  background: var(--surface-hover) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.native-table tbody tr:not(:last-child) td {
  border-bottom: 1px solid var(--surface-border);
}

.native-table tbody td {
  padding: 8px 12px;
  color: var(--text-color);
  vertical-align: middle;
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

.btn-warning {
  background-color: #ffc107;
  color: #212529;
  border-color: #ffc107;
}

.btn-warning:hover:not(:disabled) {
  background-color: #e0a800;
  border-color: #d39e00;
}

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

/* 原生标签样式 */
.native-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.tag-success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #34d399;
}

.tag-danger {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #f87171;
}

.tag-warning {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
}

.tag-info {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #60a5fa;
}

/* 原生复选框样式 */
.native-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--primary-color);
  flex-shrink: 0;
}

/* 复选框容器内联样式 */
.checkbox-container-inline {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 100px;
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-0);
  min-width: 140px;
}

.checkbox-item-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.875rem;
  transition: background-color 0.2s;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.checkbox-item-inline:hover {
  background-color: var(--surface-hover);
}

.select-all-label {
  font-weight: 600;
  border-bottom: 1px solid var(--surface-border);
  margin-bottom: 0.25rem;
  padding-bottom: 0.5rem;
}

.checkbox-container-inline::-webkit-scrollbar {
  width: 6px;
}

.checkbox-container-inline::-webkit-scrollbar-track {
  background: transparent;
}

.checkbox-container-inline::-webkit-scrollbar-thumb {
  background: var(--surface-300);
  border-radius: 3px;
}

.checkbox-container-inline::-webkit-scrollbar-thumb:hover {
  background: var(--surface-400);
}

/* DI/DO表格滚动条样式 */
.table-scroll-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

.table-scroll-container::-webkit-scrollbar-thumb {
  background: var(--surface-300);
  border-radius: 4px;
}

.table-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--surface-400);
}
</style>