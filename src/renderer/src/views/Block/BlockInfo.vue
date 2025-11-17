<template>
  <div class="card">
    <div class="block-info">
      <!-- 使用标签页代替手风琴 -->
      <TabView v-model:activeIndex="activeTabIndex" class="block-info-tabs">
        <!-- 堆汇总信息标签页 -->
        <TabPanel :header="t('config.blockInfoPage.sections.summaryInfo')">
          <div class="info-content" v-if="activeTabIndex === 0">
            <!-- 空数据提示 -->
            <div v-if="processedSummaryData.length === 0" class="empty-message">
              {{ selectedBlock ? t('config.blockInfoPage.messages.noData') : t('config.blockInfoPage.messages.selectBlock') }}
            </div>
            
            <!-- 轻量级原生表格 -->
            <div v-else class="table-wrapper">
              <table class="lightweight-table block-summary-table">
                <thead>
                  <tr>
                    <th style="min-width:200px">{{ t('config.blockInfoPage.table.parameterName') }}</th>
                    <th style="min-width:120px">{{ t('config.blockInfoPage.table.actualValue') }}</th>
                    <th style="min-width:80px">{{ t('config.blockInfoPage.table.unit') }}</th>
                    <th style="min-width:200px">{{ t('config.blockInfoPage.table.parameterName') }}</th>
                    <th style="min-width:120px">{{ t('config.blockInfoPage.table.actualValue') }}</th>
                    <th style="min-width:80px">{{ t('config.blockInfoPage.table.unit') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in processedSummaryData" :key="index" :class="{ 'striped': index % 2 === 1 }">
                    <td class="font-medium">{{ row.leftLabelTranslated }}</td>
                    <td>{{ row.leftValueFormatted }}</td>
                    <td>{{ row.leftUnitDisplay }}</td>
                    <td class="font-medium">{{ row.rightLabelTranslated }}</td>
                    <td>{{ row.rightValueFormatted }}</td>
                    <td>{{ row.rightUnitDisplay }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabPanel>
        
        <!-- 堆系统概要信息标签页 -->
        <TabPanel :header="t('config.blockInfoPage.sections.systemAbstract')">
          <div class="info-content" v-if="activeTabIndex === 1">
            <!-- 空数据提示 -->
            <div v-if="processedSysAbstractData.length === 0" class="empty-message">
              {{ selectedBlock ? t('config.blockInfoPage.messages.noData') : t('config.blockInfoPage.messages.selectBlock') }}
            </div>
            
            <!-- 轻量级原生表格 -->
            <div v-else class="table-wrapper">
              <table class="lightweight-table sys-abstract-table">
                <thead>
                  <tr>
                    <th style="width: 200px">{{ t('config.blockInfoPage.table.parameterName') }}</th>
                    <th style="width: 150px">{{ t('config.blockInfoPage.table.actualValue') }}</th>
                    <th style="width: 80px">{{ t('config.blockInfoPage.table.unit') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in processedSysAbstractData" :key="index" :class="{ 'striped': index % 2 === 1 }">
                    <td>{{ row.labelTranslated }}</td>
                    <td>{{ row.valueFormatted }}</td>
                    <td>{{ row.unitDisplay }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabPanel>
      </TabView>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'
import { pickBlockSummary, parseBlockSummary } from '@/composables/core/data-processing/block/parseBlockSummary'
import { pickBlockSysAbstract, parseBlockSysAbstract } from '@/composables/core/data-processing/block/parseBlockSysAbstract'
import { useBlockStore } from '@/stores/device/blockStore'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import { BLOCK_SUMMARY, BLOCK_SYS_ABSTRACT } from '../../../../main/table.js'

const { t, te, locale } = useI18n()

// 激活的标签页索引（用于懒加载）
const activeTabIndex = ref(0)

// 使用堆选择composable
const { blockOptions, selectedBlock } = useBlockSelect()

// 获取字段单位信息
const getFieldUnit = (label) => {
  // 从BLOCK_SUMMARY中查找
  const summaryField = BLOCK_SUMMARY.find(field => field.label === label)
  if (summaryField && summaryField.unit) {
    return summaryField.unit
  }
  
  // 从BLOCK_SYS_ABSTRACT中查找
  const sysAbstractField = BLOCK_SYS_ABSTRACT.find(field => field.label === label)
  if (sysAbstractField && sysAbstractField.unit) {
    return sysAbstractField.unit
  }
  
  return ''
}

// 直接使用label翻译函数
const getLabelTranslation = (label) => {
  if (locale.value === 'zh') return label
  return te(`config.blockInfoPage.parameters.${label}`) 
    ? t(`config.blockInfoPage.parameters.${label}`) 
    : label
}

// 翻译参数名称 - 使用直接label翻译方式
const translateParameterName = (name) => {
  return getLabelTranslation(name)
}

// 使用堆store
const blockStore = useBlockStore()

// 堆汇总数据（原始数据）
const blockSummaryData = ref([])

// 堆系统概要数据（原始数据）
const blockSysAbstractData = ref([])

// 预处理堆汇总数据（避免模板中重复调用函数）
const processedSummaryData = computed(() => {
  return blockSummaryData.value.map(row => ({
    // 左侧列数据
    leftLabelTranslated: translateParameterName(row.leftLabel),
    leftValueFormatted: formatValue(row.leftValue, row.leftScale, row.leftLabel),
    leftUnitDisplay: getFieldUnit(row.leftLabel) || '-',
    // 右侧列数据
    rightLabelTranslated: row.rightLabel ? translateParameterName(row.rightLabel) : '',
    rightValueFormatted: row.rightLabel ? formatValue(row.rightValue, row.rightScale, row.rightLabel) : '-',
    rightUnitDisplay: row.rightLabel ? (getFieldUnit(row.rightLabel) || '-') : '-'
  }))
})

// 预处理堆系统概要数据（避免模板中重复调用函数）
const processedSysAbstractData = computed(() => {
  return blockSysAbstractData.value.map(row => ({
    labelTranslated: translateParameterName(row.label),
    valueFormatted: formatValue(row.value, row.scale, row.label),
    unitDisplay: getFieldUnit(row.label) || '-'
  }))
})

// 获取堆显示名称
const getBlockDisplayName = (blockKey) => {
  const option = blockOptions.value.find(opt => opt.value === blockKey)
  return option ? option.label : blockKey
}

// 状态字段映射 - 使用翻译函数
const STATUS_MAPPINGS = computed(() => ({
  '堆故障状态': {
    0: t('config.blockInfoPage.status.faultState.0'),
    1: t('config.blockInfoPage.status.faultState.1'),
    2: t('config.blockInfoPage.status.faultState.2'),
    3: t('config.blockInfoPage.status.faultState.3')
  },
  '堆运行状态': {
    0: t('config.blockInfoPage.status.bauWorkMode.0'),
    1: t('config.blockInfoPage.status.bauWorkMode.1'),
    2: t('config.blockInfoPage.status.bauWorkMode.2'),
    3: t('config.blockInfoPage.status.bauWorkMode.3'),
    4: t('config.blockInfoPage.status.bauWorkMode.4'),
    65535: t('config.blockInfoPage.status.bauWorkMode.65535')
  },
  '设备系统状态': {
    0: t('config.blockInfoPage.status.deviceSystemState.0'),
    1: t('config.blockInfoPage.status.deviceSystemState.1'),
    2: t('config.blockInfoPage.status.deviceSystemState.2'),
    3: t('config.blockInfoPage.status.deviceSystemState.3'),
    4: t('config.blockInfoPage.status.deviceSystemState.4'),
    5: t('config.blockInfoPage.status.deviceSystemState.5'),
    6: t('config.blockInfoPage.status.deviceSystemState.6'),
    7: t('config.blockInfoPage.status.deviceSystemState.7'),
    8: t('config.blockInfoPage.status.deviceSystemState.8'),
    65535: t('config.blockInfoPage.status.deviceSystemState.65535')
  },
  '电池堆禁充禁放状态': {
    0: t('config.blockInfoPage.status.chargeDischargeState.0'),
    1: t('config.blockInfoPage.status.chargeDischargeState.1'),
    2: t('config.blockInfoPage.status.chargeDischargeState.2'),
    3: t('config.blockInfoPage.status.chargeDischargeState.3')
  },
  '电池堆的充放电状态': {
    0: t('config.blockInfoPage.status.batteryChargeDischargeState.0'),
    1: t('config.blockInfoPage.status.batteryChargeDischargeState.1'),
    2: t('config.blockInfoPage.status.batteryChargeDischargeState.2')
  }
}))

// 格式化数值显示
const formatValue = (value, scale = 1, label = '') => {
  if (value === null || value === undefined) {
    return '-'
  }
  
  // 检查是否是状态字段，如果是则返回对应的文本描述
  if (label && STATUS_MAPPINGS.value[label]) {
    const statusMapping = STATUS_MAPPINGS.value[label]
    if (statusMapping.hasOwnProperty(value)) {
      return statusMapping[value]
    }
  }
  
  // 如果是数值类型，根据scale信息进行格式化
  if (typeof value === 'number') {
    if (!scale || scale === 1) {
      // scale为1或没有scale，显示为整数
      return Math.round(value).toString()
    } else {
      // 根据scale计算小数位数
      const scaleStr = scale.toString()
      const decimalPlaces = scaleStr.length - 1
      return value.toFixed(decimalPlaces)
    }
  }
  
  return value
}

// 生成堆汇总信息占位符数据
const generateSummaryPlaceholders = () => {
  // 根据table.js中的BLOCK_SUMMARY表结构生成占位符
  // 这里我们使用实际的数据结构来生成占位符
  const summaryClasses = [
    '堆基本信息',
    '最大最小值', 
    '状态信息'
  ]
  
  const placeholderData = []
  let itemIndex = 0
  
  // 为每个类别生成占位符
  summaryClasses.forEach(className => {
    // 根据类别生成对应的占位符项
    const itemsPerClass = {
      '堆基本信息': [
        '簇总数', '在线簇数', '堆电压', '堆电流', '堆SOC', '堆SOH', '堆SOE', '堆SOP',
        '堆充电SOP', '堆放电SOP', '绝缘电阻R+', '绝缘电阻R-', '堆最大允许充电功率',
        '堆最大允许放电功率', '堆最大允许充电电流', '堆最大允许放电电流',
        '堆最大允许充电电压', '堆最大允许放电电压', '堆最大跳闸限制充电电流',
        '堆最大跳闸限制放电电流', '堆最大跳闸限制充电电压', '堆最大跳闸限制放电电压',
        '堆最大允许充电单体电压', '堆最小允许放电单体电压', '堆单体平均电压',
        '堆单体平均温度', '簇间压差', '簇间电流差', '簇间SOC差', '堆额定容量',
        '堆额定电量', '堆剩余容量', '堆剩余电量', '堆可充电量', '堆可放电量',
        '堆单次充电电量', '堆单次放电电量', '堆单次充电容量', '堆单次放电容量',
        '堆日充电电量', '堆日放电电量', '堆累计充电量', '堆累计放电量'
      ],
      '最大最小值': [
        '簇电压最大值', '簇电压最大值簇号', '簇电压最小值', '簇电压最小值簇号',
        '簇SOC最大值', '簇SOC最大值簇号', '簇SOC最小值', '簇SOC最小值簇号',
        '堆单体电压最大值', '堆单体电压最大值簇号', '堆单体电压最大值节号',
        '堆单体电压最小值', '堆单体电压最小值簇号', '堆单体电压最小值节号',
        '堆单体电压压差极差值', '堆单体温度最大值', '堆单体温度最大值簇号',
        '堆单体温度最大值节号', '堆单体温度最小值', '堆单体温度最小值簇号',
        '堆单体温度最小值节号', '堆单体温度温差极差值'
      ],
      '状态信息': [
        '堆故障状态', '堆运行状态', '设备系统状态', '电池堆禁充禁放状态',
        '电池堆的充放电状态', '电池系统循环次数', '系统心跳'
      ]
    }
    
    const classItems = itemsPerClass[className] || []
    
    // 将类别中的项目按左右两列排列
    for (let i = 0; i < classItems.length; i += 2) {
      const leftItem = classItems[i]
      const rightItem = classItems[i + 1]
      
      placeholderData.push({
        leftLabel: leftItem,
        leftValue: null,
        leftScale: 1,
        rightLabel: rightItem || '',
        rightValue: null,
        rightScale: 1
      })
    }
  })
  
  return placeholderData
}

// 生成堆系统概要信息占位符数据
const generateSysAbstractPlaceholders = () => {
  // 根据table.js中的BLOCK_SYS_ABSTRACT表结构生成占位符
  const sysAbstractClasses = [
    '单体电压概要',
    '单体温度概要', 
    'BMU电压概要',
    'BMU电路板温度概要',
    '单体SOC概要',
    '单体SOH概要',
    '动力接插件温度概要',
    '簇SOC概要',
    '簇电压概要',
    '簇电流概要'
  ]
  
  const placeholderData = []
  
  sysAbstractClasses.forEach(className => {
    // 根据类别生成对应的占位符项
    const itemsPerClass = {
      '单体电压概要': [
        '单体电压最大值', '单体电压最大值簇编号', '单体电压最大值电池编号',
        '单体电压最小值', '单体电压最小值簇编号', '单体电压最小值电池编号',
        '单体电压平均值', '单体电压极差值'
      ],
      '单体温度概要': [
        '单体温度最大值', '单体温度最大值簇编号', '单体温度最大值电池编号',
        '单体温度最小值', '单体温度最小值簇编号', '单体温度最小值电池编号',
        '单体温度平均值', '单体温度极差值'
      ],
      'BMU电压概要': [
        'BMU电压最大值', 'BMU电压最大值簇编号', 'BMU电压最大值包编号',
        'BMU电压最小值', 'BMU电压最小值簇编号', 'BMU电压最小值包编号',
        'BMU电压平均值', 'BMU电压极差值'
      ],
      'BMU电路板温度概要': [
        'BMU电路板温度最大值', 'BMU电路板温度最大值簇编号', 'BMU电路板温度最大值包编号',
        'BMU电路板温度最小值', 'BMU电路板温度最小值簇编号', 'BMU电路板温度最小值包编号',
        'BMU电路板温度平均值', 'BMU电路板温度极差值'
      ],
      '单体SOC概要': [
        '单体SOC最大值', '单体SOC最大值簇编号', '单体SOC最大值电池编号',
        '单体SOC最小值', '单体SOC最小值簇编号', '单体SOC最小值电池编号',
        '单体SOC平均值', '单体SOC极差值'
      ],
      '单体SOH概要': [
        '单体SOH最大值', '单体SOH最大值簇编号', '单体SOH最大值电池编号',
        '单体SOH最小值', '单体SOH最小值簇编号', '单体SOH最小值电池编号',
        '单体SOH平均值', '单体SOH极差值'
      ],
      '动力接插件温度概要': [
        '动力接插件温度最大值', '动力接插件温度最大值簇编号', '动力接插件温度最大值包编号',
        '动力接插件温度最小值', '动力接插件温度最小值簇编号', '动力接插件温度最小值包编号',
        '动力接插件温度平均值', '动力接插件温度极差值'
      ],
      '簇SOC概要': [
        '簇SOC最大值', '簇SOC最大值簇编号',
        '簇SOC最小值', '簇SOC最小值簇编号',
        '簇SOC平均值', '簇SOC极差值'
      ],
      '簇电压概要': [
        '簇电压最大值', '簇电压最大值簇编号',
        '簇电压最小值', '簇电压最小值簇编号',
        '簇电压平均值', '簇电压极差值'
      ],
      '簇电流概要': [
        '簇电流最大值', '簇电流最大值簇编号',
        '簇电流最小值', '簇电流最小值簇编号',
        '簇电流平均值', '簇电流极差值'
      ]
    }
    
    const classItems = itemsPerClass[className] || []
    
    classItems.forEach(label => {
      placeholderData.push({
        label,
        value: null,
        scale: 1
      })
    })
  })
  
  return placeholderData
}

// 更新堆汇总显示数据
const updateBlockSummaryData = () => {
  if (!selectedBlock.value) {
    // 没有选择堆时，显示占位符数据
    blockSummaryData.value = generateSummaryPlaceholders()
    return
  }
  
  try {
    // 获取所有类别的数据
    const allClasses = [
      '堆基本信息',
      '最大最小值', 
      '状态信息'
    ]
    
    const data = pickBlockSummary(selectedBlock.value, allClasses)
    
    // 收集所有需要显示的数据项
    const allItems = []
    data.forEach(section => {
      if (section.element && Array.isArray(section.element)) {
        section.element.forEach(item => {
          // 数据过滤：只显示需要的数据
          if (item.label && item.label.includes('预留') || item.label.includes('保留') || item.label.includes('跳过')) {
            return
          }
          allItems.push({
            label: item.label || item.key,
            value: item.value,
            unit: item.unit || '',
            remark: item.remark || '',
            scale: item.scale,
            class: section.class
          })
        })
      }
    })
    
    // 将数据转换为左右两列的格式
    const tableData = []
    for (let i = 0; i < allItems.length; i += 2) {
      const leftItem = allItems[i]
      const rightItem = allItems[i + 1]
      
      tableData.push({
        leftLabel: leftItem.label,
        leftValue: leftItem.value,
        leftScale: leftItem.scale,
        rightLabel: rightItem ? rightItem.label : '',
        rightValue: rightItem ? rightItem.value : null,
        rightScale: rightItem ? rightItem.scale : 1
      })
    }
    
    // 如果没有数据，使用占位符
    if (tableData.length === 0) {
      tableData.push(...generateSummaryPlaceholders())
    }
    
    blockSummaryData.value = tableData
    // console.log(`[BlockInfo] 更新堆${selectedBlock.value}汇总数据，共${tableData.length}行记录`)
  } catch (error) {
    console.error('[BlockInfo] 更新堆汇总数据失败:', error)
    // 出错时也显示占位符
    blockSummaryData.value = generateSummaryPlaceholders()
  }
}

// 更新堆系统概要显示数据
const updateBlockSysAbstractData = () => {
  if (!selectedBlock.value) {
    // 没有选择堆时，显示占位符数据
    blockSysAbstractData.value = generateSysAbstractPlaceholders()
    return
  }
  
  try {
    const data = pickBlockSysAbstract(selectedBlock.value.toString(), [
      '单体电压概要',
      '单体温度概要', 
      'BMU电压概要',
      'BMU电路板温度概要',
      '单体SOC概要',
      '单体SOH概要',
      '动力接插件温度概要',
      '簇SOC概要',
      '簇电压概要',
      '簇电流概要'
    ])
    
    const allData = []
    Object.values(data).forEach(classData => {
      // 过滤掉隐藏的字段（预留字段）
      const visibleData = classData.filter(item => !item.hidden)
      allData.push(...visibleData)
    })
    
    // 如果没有数据，使用占位符
    if (allData.length === 0) {
      allData.push(...generateSysAbstractPlaceholders())
    }
    
    blockSysAbstractData.value = allData
    // console.log(`[BlockInfo] 更新堆${selectedBlock.value}系统概要数据，共${allData.length}行记录`)
  } catch (error) {
    console.error('[BlockInfo] 更新堆系统概要数据失败:', error)
    // 出错时也显示占位符
    blockSysAbstractData.value = generateSysAbstractPlaceholders()
  }
}

// 监听堆选择变化
const handleBlockChange = () => {
  updateBlockSummaryData()
  updateBlockSysAbstractData()
}

// 监听MQTT消息 - 堆汇总信息
const handleBlockSummaryMessage = (event, data) => {
  try {
    // console.log('[BlockInfo] 收到堆汇总信息MQTT消息:', data)
    
    if (data.dataType === 'BLOCK_SUMMARY') {
      // console.log('[BlockInfo] 处理堆汇总信息:', data)
      
      parseBlockSummary(data)
      
      if (data.blockId && selectedBlock.value === `block${data.blockId}`) {
        setTimeout(() => {
          updateBlockSummaryData()
        }, 100)
      }
    }
  } catch (error) {
    console.error('[BlockInfo] 处理堆汇总信息MQTT消息失败:', error)
  }
}

// 监听MQTT消息 - 堆系统概要信息
const handleBlockSysAbstractMessage = (event, data) => {
  try {
    // console.log('[BlockInfo] 收到堆系统概要信息MQTT消息:', data)
    
    if (data.dataType === 'BLOCK_SYS_ABSTRACT') {
      // console.log('[BlockInfo] 处理堆系统概要信息:', data)
      
      parseBlockSysAbstract(data)
      
      if (data.blockId && selectedBlock.value === `block${data.blockId}`) {
        setTimeout(() => {
          updateBlockSysAbstractData()
        }, 100)
      }
    }
  } catch (error) {
    console.error('[BlockInfo] 处理堆系统概要信息MQTT消息失败:', error)
  }
}

// 组件挂载
onMounted(() => {
  // 监听MQTT消息
  window.electron.ipcRenderer.on('BLOCK_SUMMARY', handleBlockSummaryMessage)
  window.electron.ipcRenderer.on('BLOCK_SYS_ABSTRACT', handleBlockSysAbstractMessage)
  
  // 初始化数据
  updateBlockSummaryData()
  updateBlockSysAbstractData()
})

// 组件卸载
onUnmounted(() => {
  // console.log('[BlockInfo] 组件卸载')
  
  // 移除MQTT监听
  window.electron.ipcRenderer.removeAllListeners('BLOCK_SUMMARY')
  window.electron.ipcRenderer.removeAllListeners('BLOCK_SYS_ABSTRACT')
})

// 监听堆选择变化
watch(selectedBlock, handleBlockChange)
</script>

<style scoped>
.card {
  /* 使用全局card样式，不覆盖margin-left */
  background: var(--surface-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.block-info {
  max-width: 1400px;
  margin: 0 auto;
  background-color: var(--surface-ground);
  min-height: auto;
  height: auto;
}

/* 标签页样式优化 */
.block-info-tabs {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background: var(--surface-card);
}

:deep(.p-tabview .p-tabview-nav) {
  background: var(--surface-section);
  border-bottom: 1px solid var(--surface-border);
  padding: 0.5rem 1rem 0;
}

:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link) {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-color-secondary);
  padding: 0.55rem 1rem; /* 更紧凑 */
  font-weight: 600;
  font-size: 12px; /* 再缩小标签文字 */
  transition: all 0.2s ease;
  border-radius: 6px 6px 0 0;
  margin-right: 0.25rem;
  min-height: 32px; /* 更紧凑高度 */
  display: flex;
  align-items: center;
}

:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link:hover) {
  background: var(--surface-hover);
  color: var(--text-color);
}

:deep(.p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link) {
  background: var(--surface-card);
  color: var(--primary-color);
  border-color: var(--surface-border);
  border-bottom-color: var(--surface-card);
}

:deep(.p-tabview .p-tabview-panels) {
  background: var(--surface-card);
  padding: 1.2rem; /* 缩小内边距 */
  border: none;
}

/* 内容区域 */
.info-content {
  position: relative;
  min-height: auto;
  animation: fadeIn 0.3s ease-out;
}

/* 空数据提示 */
.empty-message {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-color-secondary);
  font-size: 12px; /* 再缩小提示文字 */
}

/* 表格容器 */
.table-wrapper {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid var(--surface-border);
}

/* 轻量级表格样式 */
.lightweight-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface-card);
  font-size: 11px; /* 再缩小字体：12px → 11px */
}

.lightweight-table thead {
  background: var(--surface-section);
  border-bottom: 2px solid var(--surface-border);
}

.lightweight-table th {
  padding: 8px 12px; /* 再缩小内边距 */
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
  border-bottom: 1px solid var(--surface-border);
  white-space: nowrap;
  font-size: 11px; /* 表头字体 */
}

.lightweight-table td {
  padding: 8px 12px; /* 再缩小内边距 */
  border-bottom: 1px solid var(--surface-border);
  color: var(--text-color);
  font-size: 11px; /* 单元格字体 */
}

.lightweight-table tbody tr {
  transition: background-color 0.15s ease;
}

.lightweight-table tbody tr:hover {
  background: var(--surface-hover);
}

.lightweight-table tbody tr.striped {
  background: var(--surface-ground);
}

.lightweight-table tbody tr.striped:hover {
  background: var(--surface-hover);
}

/* 字体粗细 */
.font-medium {
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .block-info {
    max-width: 100%;
  }
  
  :deep(.p-tabview .p-tabview-panels) {
    padding: 0.8rem;
  }
  
  :deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link) {
    padding: 0.5rem 1rem; /* 移动端更紧凑 */
    font-size: 12px;
  }
  
  .lightweight-table {
    font-size: 10px; /* 移动端进一步缩小 */
  }
  
  .lightweight-table th,
  .lightweight-table td {
    padding: 6px 8px; /* 移动端缩小内边距 */
  }
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style> 