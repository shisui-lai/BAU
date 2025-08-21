<script setup>
// DI/DO反馈页面：直接监听IO状态消息，无需pinia store
import { computed, onMounted, onUnmounted, nextTick } from 'vue'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'

import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'

import { usePageTypeDetection } from '@/composables/utils/page-detection/usePageTypeDetection'
import { pickIo } from '@/composables/core/data-processing/common/parseIoStatus'
import { parseIoStatus } from '@/composables/core/data-processing/common/parseIoStatus'
import { useRemoteCommand } from '@/composables/core/data-processing/remote-control/useRemoteCommand'
import { ERROR_CODES } from '../../../../main/table.js'

const { selectedCluster } = useClusterSelect()
const toast = useToast()

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

// 合并测试模式数据
const testModeAllData = computed(() => [
  ...testModeContactorData.value,
  ...testModeOtherData.value
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
          name: dropdown.name,
          stateKey: `${command.id}_${dropdown.name}`,
          options: dropdown.options,
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

// ========== IO状态相关 ==========

// MQTT消息处理函数
function onIOSummary(_e, msg) {
  parseIoStatus(msg)
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
  const deviceName = `堆${blockId}/簇${clusterId}`

  // 获取命令显示名称
  const commandNameMap = {
    'contactor_ctrl': '接触器执行策略',
    'contactor_ctrl_indep': '接触器独立执行',
    'insulation_detect_ctrl': '绝缘电阻检测',
    'sys_mode_ctrl': '系统模式控制',
    'brokenwire_detect_en': '断线检测使能',
    'hsd_lsd_ctrl_test': '高低边控制',
    'force_clear_bcu_fault': '强制清除BCU故障',
    'reset_record_flash': '重置记录Flash',
    'force_ocv_calib': '强制OCV校准',
    'weight_calib': '权重校准',
    'force_soh_calib': '强制SOH校准',
    'restore_ctrl_param': '参数复位'
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

  // 检查应答码
  if (data.code !== undefined) {
    const isSuccess = data.code === 0xE0

    const statusText = ERROR_CODES[data.code] || '未知状态'
    const errorCodeHex = `0x${data.code.toString(16).toUpperCase()}`

    if (isSuccess) {
      toast.add({
        severity: 'success',
        summary: '遥控命令执行成功',
        detail: `${deviceName}: ${commandName} 已成功执行 (应答码: ${errorCodeHex})`,
        life: 4000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: '遥控命令执行失败',
        detail: `${deviceName}: ${commandName} ${statusText} (应答码: ${errorCodeHex})`,
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
      matchedRow.doParam = doItem?.label?.replace('反馈', '') || `DO${i+1}`
      matchedRow.doValue = doItem?.value ?? false
    } else {
      // 创建新行
      rows.push({
        id: `sys-do-${i}`,
        type: '系统',
        diParam: '',
        diValue: null,
        doParam: doItem?.label?.replace('反馈', '') || `DO${i+1}`,
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
          summary: '命令已发送',
          detail: `${result.commandName} 已发送到 ${result.successCount} 个设备${result.failCount > 0 ? `，${result.failCount} 个失败` : ''}`,
          life: 3000
        })
      }
    } else {
      toast.add({
        severity: result.error === '请至少选择一个控制项' ? 'warn' : 'error',
        summary: result.error === '请至少选择一个控制项' ? '请选择控制项' : '控制失败',
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
          summary: '命令已发送',
          detail: `${result.commandName} 已发送到 ${result.successCount} 个设备${result.failCount > 0 ? `，${result.failCount} 个失败` : ''}`,
          life: 3000
        })
      }
    } else {
      toast.add({
        severity: 'error',
        summary: '命令执行失败',
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
          summary: '命令已发送',
          detail: `${command.name} 已发送到 ${result.successCount} 个设备${result.failCount > 0 ? `，${result.failCount} 个失败` : ''}`,
          life: 3000
        })
      }
    } else {
      toast.add({
        severity: result.error === '请至少选择一个控制项' ? 'warn' : 'error',
        summary: result.error === '请至少选择一个控制项' ? '请选择控制项' : '控制失败',
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
      summary: '无有效操作',
      detail: '请至少选择一个非"无效"的接触器操作',
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
          summary: '命令已发送',
          detail: `${command.name || '接触器独立控制'} 命令已发送`,
          life: 3000
        })
      } else {
        toast.add({
          severity: 'error',
          summary: '命令发送失败',
          detail: result?.error || '未知错误',
          life: 5000
        })
      }
    } catch (error) {
      console.error(`批量下发命令失败:`, error)
      toast.add({
        severity: 'error',
        summary: '命令发送失败',
        detail: error.message || '未知错误',
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
          summary: '命令已发送',
          detail: `${result.commandName} 已发送到 ${result.successCount} 个设备${result.failCount > 0 ? `，${result.failCount} 个失败` : ''}`,
          life: 3000
        })
      }
    } else {
      toast.add({
        severity: 'error',
        summary: '命令执行失败',
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
    'HSD_LSD_CTRL_TEST',
    'FORCE_CLEAR_BCU_FAULT',
    'RESET_RECORD_FLASH',
    'FORCE_OCV_CALIB',
    'WEIGHT_CALIB',
    'FORCE_SOH_CALIB',
    'RESTORE_CTRL_PARAM',
    // 反馈查询应答事件
    'GET_CONTACTOR_CTRL_RESULT',
    'GET_INSULATION_DETECT_RESULT'
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
    controlCommandTableData.value.forEach(command => {
      if (command.type === 'dropdown' && command.options && command.options.length > 0) {
        if (selectedValues[command.id] === undefined) {
          selectedValues[command.id] = command.options[0].value
          console.log(`[Order] 初始化下拉框默认值: ${command.name} = ${command.options[0].label}`)
        }
      }
    })
  })

  // 启动反馈状态定时查询
  startFeedbackPolling(() => selectedCluster.value)
  // console.log('[Order] 反馈状态定时查询已启动')
})

// 组件卸载时移除监听
onUnmounted(() => {  
  // 停止反馈状态定时查询
  stopFeedbackPolling()
  // 停止遥控命令服务
  stopRemoteCommandListeners()
  window.electron.ipcRenderer.removeListener('IO_STATUS', onIOSummary)
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
    'GET_INSULATION_DETECT_RESULT'
  ]

  remoteCommandEvents.forEach(eventName => {
    window.electron.ipcRenderer.removeListener(eventName, onRemoteCommandResponse)
    console.log(`[Order] 移除遥控命令应答监听: ${eventName}`)
  })

  // 停止遥控命令服务
  stopRemoteCommandListeners()

  // 停止反馈状态定时查询
  stopFeedbackPolling()
  console.log('[Order] 反馈状态定时查询已停止')
})
</script>

<template>
  <div class="order-page">
    <div class="card">
      <Toast />
      <!-- 主要内容区域 - 上下两行布局 -->
      <div class="main-content">
        <!-- 上行：三个表格并排 -->
        <div class="top-row">
          <!-- 左侧：控制信息表格 -->
          <div class="control-info-area">
            <div class="table-container">
              <h2 class="table-title">控制信息</h2>
              <DataTable :value="controlCommandTableData" dataKey="id" showGridlines scrollable class="control-info-table">
                <!-- 命令名称列 -->
                <Column header="命令名称" style="min-width:300px">
                  <template #body="{ data }">
                    <div class="command-row">
                      <div class="command-name-wrapper">
                        <span class="command-name">{{ data.name }}</span>
                        <!-- 执行状态标签 -->
                        <Tag
                          v-if="executingCommands.has(data.id)"
                          value="执行中"
                          severity="info"
                          class="command-status"
                        />
                      </div>
                      <!-- 下拉选择类型命令 -->
                      <Dropdown
                        v-if="data.type === 'dropdown'"
                        v-model="selectedValues[data.id]"
                        :options="data.options"
                        option-label="label"
                        option-value="value"
                        placeholder="选择操作"
                        class="command-dropdown-inline"
                        :disabled="executingCommands.has(data.id)"
                      />
                      <!-- 多选框类型命令 -->
                      <MultiSelect
                        v-else-if="data.type === 'checkbox_group'"
                        v-model="selectedValues[data.id]"
                        :options="data.options"
                        option-label="label"
                        option-value="value"
                        placeholder="选择控制项"
                        class="command-multiselect-inline"
                        :disabled="executingCommands.has(data.id)"
                        :selected-items-label="`已选{0}项`"
                        :max-selected-labels="0"
                      />
                    </div>
                  </template>
                </Column>

                <!-- 操作列 -->
                <Column header="操作" style="width:80px">
                  <template #body="{ data }">
                    <!-- 下拉选择类型命令 -->
                    <Button
                      v-if="data.type === 'dropdown'"
                      label="发送"
                      class="command-send-btn"
                      :disabled="executingCommands.has(data.id) || selectedValues[data.id] == null"
                      :loading="executingCommands.has(data.id)"
                      @click="handleCommandExecutionWithToast(data.id, selectedValues[data.id])"
                      size="small"
                    />
                    <!-- 多选框类型命令 -->
                    <Button
                      v-else-if="data.type === 'checkbox_group'"
                      label="发送"
                      class="command-send-btn"
                      :disabled="executingCommands.has(data.id) || !selectedValues[data.id] || selectedValues[data.id].length === 0"
                      :loading="executingCommands.has(data.id)"
                      @click="handleCheckboxGroupCommandWithToast(data.id, selectedValues[data.id])"
                      size="small"
                    />
                    <!-- 按钮类型命令 -->
                    <Button
                      v-else-if="data.type === 'button'"
                      :label="executingCommands.has(data.id) ? '发送中...' : '发送'"
                      class="command-execute-btn"
                      :loading="executingCommands.has(data.id)"
                      :disabled="executingCommands.has(data.id)"
                      @click="handleCommandExecutionWithToast(data.id)"
                      size="small"
                    />
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>

          <!-- 中间：测试模式下DO控制 -->
          <div class="test-mode-area">
            <div class="table-container">
              <h2 class="table-title">测试模式下DO控制</h2>

              <DataTable :value="testModeAllData" dataKey="id" showGridlines scrollable class="test-mode-table">
                <!-- 命令名称列 -->
                <Column header="命令名称" style="min-width:300px">
                  <template #body="{ data }">
                    <div class="command-row">
                      <div class="command-name-wrapper">
                        <span class="command-name">{{ data.name }}</span>
                        <!-- 执行状态标签 -->
                        <Tag
                          v-if="executingCommands.has(data.id)"
                          value="执行中"
                          severity="info"
                          class="command-status"
                        />
                      </div>
                      <!-- 多选框类型命令 -->
                      <MultiSelect
                        v-model="selectedValues[data.id]"
                        :options="data.options"
                        option-label="label"
                        option-value="value"
                        placeholder="选择控制项"
                        class="command-multiselect-inline"
                        :disabled="executingCommands.has(data.id)"
                        :selected-items-label="`已选{0}项`"
                        :max-selected-labels="0"
                      />
                    </div>
                  </template>
                </Column>

                <!-- 操作列 -->
                <Column header="操作" style="width:80px">
                  <template #body="{ data }">
                    <Button
                      label="发送"
                      class="command-send-btn"
                      :disabled="executingCommands.has(data.id) || !selectedValues[data.id] || selectedValues[data.id].length === 0"
                      :loading="executingCommands.has(data.id)"
                      @click="handleCheckboxGroupCommandWithToast(data.id, selectedValues[data.id])"
                      size="small"
                    />
                  </template>
                </Column>
              </DataTable>

              <!-- 反馈区域 -->
              <div class="feedback-section">
                <div class="section-header">
                  <span class="section-title">控制量</span>
                  <span class="section-title">反馈值</span>
                </div>

                <!-- 反馈状态显示 -->
                <div class="feedback-control-row">
                  <span class="control-label">接触器执行策略结果</span>
                  <span class="feedback-value">{{ feedbackStatus.contactor_ctrl_result }}</span>
                </div>

                <div class="feedback-control-row">
                  <span class="control-label">绝缘电阻检测执行结果</span>
                  <span class="feedback-value">{{ feedbackStatus.insulation_detect_result }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：下设接触器独立执行表格 -->
          <div class="contactor-control-area">
            <div class="table-container">
              <h2 class="table-title">下设接触器独立执行</h2>
              <DataTable :value="contactorIndependentRowData" dataKey="rowId" showGridlines scrollable class="contactor-independent-table">
                <!-- 接触器列 -->
                <Column header="接触器" style="min-width:200px">
                  <template #body="{ data }">
                    <div class="contactor-name-wrapper">
                      <span class="contactor-name">{{ data.name }}</span>
                      <!-- 执行状态标签 - 只有非"无效"选项才显示 -->
                      <Tag
                        v-if="executingCommands.has(data.commandId) && selectedValues[data.stateKey] != null && selectedValues[data.stateKey] !== 0"
                        value="执行中"
                        severity="info"
                        class="command-status"
                      />
                    </div>
                  </template>
                </Column>

                <!-- 操作列 -->
                <Column header="操作" style="min-width:300px">
                  <template #body="{ data }">
                    <div class="operation-wrapper">
                      <Dropdown
                        v-model="selectedValues[data.stateKey]"
                        :options="data.options"
                        option-label="label"
                        option-value="value"
                        placeholder="选择状态"
                        class="dropdown-control"
                        :disabled="executingCommands.has(data.commandId)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>

              <!-- 下发按钮 - 放在表格右下方 -->
              <div class="send-button-container">
                <Button
                  label="发送"
                  class="command-send-btn"
                  :disabled="contactorIndependentData.some(cmd => executingCommands.has(cmd.id)) || !hasValidContactorOperations"
                  @click="handleBatchSend"
                  size="small"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 下行：DI/DO反馈表格 -->
        <div class="bottom-row">
          <div class="dido-table-area">
            <div class="table-container">
              <h2 class="table-title">DI/DO反馈</h2>
              <!-- 单表布局（4列） -->
              <DataTable :value="tableRows" dataKey="id" showGridlines scrollable>
                <!-- DI参数 列 -->
                <Column header="DI参数" style="min-width:80px">
                  <template #body="{ data }">
                    <span>{{ data.diParam }}</span>
                  </template>
                </Column>

                <!-- DI状态 列 -->
                <Column header="DI状态" style="width:80px">
                  <template #body="{ data }">
                    <Tag
                      :value="data.diValue ? '1' : '0'"
                      :severity="data.diValue ? 'success' : 'danger'"
                    />
                  </template>
                </Column>

                <!-- DO参数 列 -->
                <Column header="DO参数" style="min-width:80px">
                  <template #body="{ data }">
                    <span>{{ data.doParam }}</span>
                  </template>
                </Column>

                <!-- DO状态 列 -->
                <Column header="DO状态" style="width:80px">
                  <template #body="{ data }">
                    <Tag
                      :value="data.doValue ? '1' : '0'"
                      :severity="data.doValue ? 'success' : 'danger'"
                    />
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      <!-- bit位控制弹窗 -->
      <Dialog
        v-model:visible="showBitFieldDialog"
        :header="currentBitFieldCommand?.name || 'bit位控制'"
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
            <label class="bitfield-label">{{ field.name }}:</label>
            <!-- 如果有options，显示下拉框 -->
            <Dropdown
              v-if="field.options"
              :model-value="getBitFieldValue(currentBitFieldCommand.id, field)"
              @update:model-value="(value) => setBitFieldValue(currentBitFieldCommand.id, field, value)"
              :options="field.options"
              option-label="label"
              option-value="value"
              placeholder="选择"
              class="bitfield-dropdown"
            />
            <!-- 如果没有options，显示复选框 -->
            <input
              v-else
              type="checkbox"
              :checked="getBitValue(currentBitFieldCommand.id, field.bit)"
              @change="(e) => setBitValue(currentBitFieldCommand.id, field.bit, e.target.checked)"
              class="bitfield-checkbox"
            />
          </div>
        </div>

        <template #footer>
          <Button label="取消" icon="pi pi-times" @click="showBitFieldDialog = false" class="p-button-text" />
          <Button
            label="发送"
            icon="pi pi-check"
            @click="confirmBitFieldCommand"
            :disabled="!currentBitFieldCommand || !hasBitFieldValue(currentBitFieldCommand.id)"
          />
        </template>
      </Dialog>

      <!-- 确认对话框 -->
      <Dialog
        v-model:visible="showConfirmDialog"
        header="确认操作"
        modal
        :style="{ width: '480px' }"
        class="modern-confirm-dialog"
      >
        <template #default>
          <div class="confirm-message">
            <i class="pi pi-exclamation-triangle confirmation-icon"></i>
            <div class="confirmation-message">
              {{ confirmMessage }}
            </div>
          </div>
        </template>

        <template #footer>
          <div class="confirmation-footer">
            <Button
              label="取消"
              icon="pi pi-times"
              @click="showConfirmDialog = false"
              class="p-button-outlined p-button-secondary cancel-btn"
            />
            <Button
              label="确认"
              icon="pi pi-check"
              @click="executeConfirmedCommandWithToast"
              class="confirm-btn"
            />
          </div>
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
  background-color: #f8fafc;
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
  grid-template-columns: 1.5fr 1fr 1fr;
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

.table-container {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  background: white;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-title {
  background: #007ad9;
  color: #ffffff;
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
  color: #374151;
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
  color: #374151;
  font-weight: 500;
  cursor: pointer;
}





/* ========== 反馈区域 ========== */
.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
  font-weight: 600;
  color: #1f2937;
  font-size: 1rem;
}

.section-header .section-title {
  flex: 1;
  font-weight: 600;
  color: #1f2937;
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
  border-bottom: 1px solid #f3f4f6;
}

.feedback-control-row:hover {
  background: #f9fafb;
}

.feedback-control-row:last-child {
  border-bottom: none;
}

.feedback-value {
  min-width: 120px;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
  color: #1f2937;
  font-weight: 600;
  font-size: 0.875rem;
  border: 1px solid #e5e7eb;
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
  color: #111827;
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
  color: #374151;
}

.operation-wrapper {
  padding: 0.5rem 0;
}

/* ========== 下发按钮容器 ========== */
.send-button-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-top: 1px solid #e5e7eb;
}

.command-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  width: 100%;
  padding: 0.25rem 0;
}

.command-dropdown,
.command-dropdown-inline {
  min-width: 140px;
  font-size: 0.9rem;
}

.command-send-btn,
.command-execute-btn {
  min-width: 68px;
  font-size: 0.9rem;
  height: 36px;
  border-radius: 8px;
}

/* ========== DataTable 悬停效果 ========== */
.control-info-table :deep(.p-datatable-tbody > tr:hover),
.test-mode-table :deep(.p-datatable-tbody > tr:hover),
.contactor-independent-table :deep(.p-datatable-tbody > tr:hover) {
  background-color: #e3f2fd !important;
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
  border-bottom: 1px solid #e5e7eb;
  padding: 0.75rem;
}

/* ========== 确认对话框 ========== */
.confirmation-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.cancel-btn,
.confirm-btn {
  min-width: 80px;
  height: 40px;
  font-size: 0.95rem;
  border-radius: 8px;
}

.confirm-message {
  padding: 1rem 0;
  font-size: 1rem;
  color: #374151;
  text-align: center;
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
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
</style>