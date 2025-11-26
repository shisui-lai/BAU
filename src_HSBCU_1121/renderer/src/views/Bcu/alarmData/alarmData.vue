<script setup>
import { ref, computed, onBeforeMount, onBeforeUnmount, watch, shallowRef } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()

// 翻译单向菊花链断连故障
function translateDaisyChainFault(fault) {
  // 从故障名称中提取方向和位置
  // 格式为"单向菊花链断连-正向1#"或"单向菊花链断连-反向2#"
  const match = fault.match(/单向菊花链断连-(正向|反向)(\d+)#/)
  if (!match) return fault

  const direction = match[1] // 正向或反向
  const position = match[2] // 数字

  // 翻译基础部分和方向
  const baseFault = t('alarm.faults.单向菊花链断连')
  const directionTrans = t(`alarm.faults.${direction}`)

  // 根据当前语言环境选择"Position"的显示文本
  const positionText = locale.value === 'zh' ? '位置' : 'Position'
  // 组合翻译结果
  return `${baseFault} - ${directionTrans} ${positionText} ${position}`
}

// 翻译故障名称
function translateFaultName(fault) {
  if (!fault) return fault

  // 单向菊花链断连故障特殊处理
  if (fault.startsWith('单向菊花链断连-')) {
    return translateDaisyChainFault(fault)
  }

  // 处理保留故障（带有Reserved前缀）
  if (fault.startsWith('Reserved')) {
    return `${t('alarm.totalFaults.reserved1')}-${t(`alarm.faults.${fault.substring(8)}`)}`
  }

  // 检查是否为中文故障名称（来自getAlarmData1和getAlarmData2）
  // 如果是中文，直接返回，不需要翻译
  /* if (/[\u4e00-\u9fa5]/.test(fault)) {
    return fault
  } */

  // 尝试在faults中查找翻译（英文故障名称）
  if (te(`alarm.faults.${fault}`)) {
    return t(`alarm.faults.${fault}`)
  }

  // 最后尝试在totalFaults中查找
  if (te(`alarm.totalFaults.${fault}`)) {
    return t(`alarm.totalFaults.${fault}`)
  }

  // 如果都没有找到，返回原始故障名称
  return fault
}
// Pinia
const ipStore = useIpStore()
// 分页参数
const page = ref(1)
const pageSize = 200

// 扁平化后的告警数组（含 classification、timestamp）
const flatAlarms = shallowRef([])

// 故障等级排序映射
const levelOrder = { 严重: 3, 一般: 2, 轻微: 1 }
const levelSort = (a, b) => {
  return (levelOrder[b.level] || 0) - (levelOrder[a.level] || 0)
}

// 注册／注销 IPC 监听
function listener(_evt, data) {
  if (data.ip !== ipStore.selectedIp) return
  flatAlarms.value = data.Arg
  localStorage.setItem(`update-FC04Alarm-${data.ip}`, JSON.stringify(data.Arg))
}
onBeforeMount(() => {
  // 先加载缓存
  const key = `update-FC04Alarm-${ipStore.selectedIp}`
  const cached = localStorage.getItem(key)
  flatAlarms.value = cached ? JSON.parse(cached) : []
  window.electron.ipcRenderer.removeAllListeners('update-FC04Alarm')
  window.electron.ipcRenderer.on('update-FC04Alarm', listener)
})
onBeforeUnmount(() => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04Alarm')
})

watch(
  () => ipStore.selectedIp,
  (newIp) => {
    page.value = 1
    const key = `update-FC04Alarm-${newIp}`
    const cached = localStorage.getItem(key)
    flatAlarms.value = cached ? JSON.parse(cached) : []
  },
  { immediate: true }
)
// 总记录数
const total = computed(() => flatAlarms.value.length)

// 分页回调
function onPageChange(event) {
  page.value = event.page + 1
}
</script>

<template>
  <div class="card">
    <!-- 数据表格：按 classification 分组 -->
    <DataTable
      :value="flatAlarms"
      paginator
      :first="(page - 1) * pageSize"
      :rows="pageSize"
      :totalRecords="total"
      @page="onPageChange"
      showGridlines
      scrollable
      sortMode="multiple"
      class="centered-table"
    >
      <!--       <Column field="classification" header="故障分类" />
 -->
      <template #header>
        <div style="text-align: left; margin-left: -0.2rem">
          {{ t('alarm.totalNumbeOfFaults') }}：<strong>{{ total }}</strong>
        </div>
      </template>
      <Column :header="t('alarm.title1')" field="seqNo" sortable />
      <Column
        :header="t('alarm.title2')"
        field="formattedTime"
        :style="{ width: '180px', minWidth: '180px' }"
        sortable
      />
      <!--       <Column field="fault" :header="t('alarm.title3')" /> -->
      <Column :header="t('alarm.title3')">
        <template #body="{ data }">
          {{ translateFaultName(data.fault) }}
        </template>
      </Column>
      <Column :header="t('alarm.title4')" field="bmuIndex" />
      <Column field="cellIndexRelative" :header="t('alarm.title5')" />
      <Column field="cellIndex" :header="t('alarm.title8')" />
      <Column :header="t('alarm.title6')" field="level" sortable :sortFunction="levelSort">
        <template #body="slotProps">
          <span class="level-badge" :class="`level-${slotProps.data.level}`">
            {{
              locale === 'zh'
                ? slotProps.data.level
                : slotProps.data.level && $te(`alarm.levels.${slotProps.data.level}`)
                  ? t(`alarm.levels.${slotProps.data.level}`)
                  : ''
            }}
          </span>
        </template>
      </Column>
      <!--     <Column field="actionValue" header="动作值" /> -->
    </DataTable>
  </div>
</template>

<style scoped>
.centered-table :deep(.p-datatable-thead th) {
  text-align: center !important;
  vertical-align: middle !important;
}

.centered-table :deep(.p-datatable-tbody td) {
  text-align: center !important;
  vertical-align: middle !important;
}

/* 确保表头内容居中 */
.centered-table :deep(.p-column-header) {
  text-align: center !important;
}

.centered-table :deep(.p-column-header-content) {
  justify-content: center !important;
  text-align: center !important;
}
:deep(.p-paginator) {
  margin-bottom: 1rem;
  background: transparent;
  border: none;
}
.inner-table {
  width: 100%;
}
.level-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  text-align: center;
}

/* 不同等级的背景色（你可按需调整色值或名称） */
.level-严重 {
  background-color: #e53e3e; /* 红：高 */
}
.level-无效 {
  background-color: #e53e3e; /* 红：高 */
}
.level-一般 {
  background-color: #dd6b20; /* 橙：中 */
}
.level-轻微 {
  background-color: #38a169; /* 绿：低 */
}
.level-有效 {
  background-color: #38a169; /* 绿：低 */
}
</style>
