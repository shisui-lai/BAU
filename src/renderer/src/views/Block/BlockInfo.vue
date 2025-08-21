<template>
  <div class="card">
    <Accordion :activeIndex="0">
      <!-- 堆汇总信息面板 -->
      <AccordionTab header="堆汇总信息">
        <DataTable 
          :value="blockSummaryData" 
          stripedRows
          showGridlines
          responsiveLayout="scroll"
          class="block-summary-table"
          :emptyMessage="selectedBlock ? '暂无数据' : '请选择堆'"
        >

          
          <!-- 左侧参数名称列 -->
          <Column field="leftLabel" header="参数名称" style="min-width:200px">
            <template #body="{ data }">
              <span class="font-medium">{{ data.leftLabel }}</span>
            </template>
          </Column>
          
          <!-- 左侧实际值列 -->
          <Column field="leftValue" header="实际值" style="min-width:120px">
            <template #body="{ data }">
              <span>{{ formatValue(data.leftValue, data.leftScale, data.leftLabel) }}</span>
            </template>
          </Column>
          
          <!-- 左侧单位列 -->
          <Column field="leftUnit" header="单位" style="min-width:80px">
            <template #body="{ data }">
              <span class="text-gray-600">{{ getFieldUnit(data.leftLabel) || '-' }}</span>
            </template>
          </Column>
          
          <!-- 右侧参数名称列 -->
          <Column field="rightLabel" header="参数名称" style="min-width:200px">
            <template #body="{ data }">
              <span class="font-medium">{{ data.rightLabel }}</span>
            </template>
          </Column>
          
          <!-- 右侧实际值列 -->
          <Column field="rightValue" header="实际值" style="min-width:120px">
            <template #body="{ data }">
              <span>{{ formatValue(data.rightValue, data.rightScale, data.rightLabel) }}</span>
            </template>
          </Column>
          
          <!-- 右侧单位列 -->
          <Column field="rightUnit" header="单位" style="min-width:80px">
            <template #body="{ data }">
              <span class="text-gray-600">{{ getFieldUnit(data.rightLabel) || '-' }}</span>
            </template>
          </Column>
        </DataTable>
      </AccordionTab>
      
      <!-- 堆系统概要信息面板 -->
      <AccordionTab header="堆系统概要信息">
        <DataTable 
          :value="blockSysAbstractData" 
          :paginator="false"
          :rows="100"
          class="sys-abstract-data-table"
        >
          <Column field="label" header="参数名称" style="width: 200px">
            <template #body="{ data }">
              <span>{{ data.label }}</span>
            </template>
          </Column>
          
          <Column field="value" header="实际值" style="width: 150px">
            <template #body="{ data }">
              <span>{{ formatValue(data.value, data.scale, data.label) }}</span>
            </template>
          </Column>
          
          <Column field="unit" header="单位" style="width: 80px">
            <template #body="{ data }">
              <span>{{ getFieldUnit(data.label) || '-' }}</span>
            </template>
          </Column>
        </DataTable>
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'
import { pickBlockSummary, parseBlockSummary } from '@/composables/core/data-processing/block/parseBlockSummary'
import { pickBlockSysAbstract, parseBlockSysAbstract } from '@/composables/core/data-processing/block/parseBlockSysAbstract'
import { useBlockStore } from '@/stores/device/blockStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import { BLOCK_SUMMARY, BLOCK_SYS_ABSTRACT } from '../../../../main/table.js'

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

// 使用堆store
const blockStore = useBlockStore()

// 堆汇总数据
const blockSummaryData = ref([])

// 堆系统概要数据
const blockSysAbstractData = ref([])

// 获取堆显示名称
const getBlockDisplayName = (blockKey) => {
  const option = blockOptions.value.find(opt => opt.value === blockKey)
  return option ? option.label : blockKey
}

// 状态字段映射
const STATUS_MAPPINGS = {
  '堆故障状态': {
    0: '无故障',
    1: '轻微故障',
    2: '一般故障',
    3: '严重故障'
  },
  'BAU工作模式': {
    0: '静置',
    1: '充电',
    2: '放电',
    3: '开路',
    4: '接触器自检',
    65535: '各簇状态不一致'
  },
  '设备系统状态': {
    0: '运行监测',
    1: '绝缘检测状态',
    2: '接触器自检状态',
    3: '系统初始化',
    4: 'BCU升级状态',
    5: '---',
    6: 'BCU自适应地址状态',
    7: 'BMU自适应地址状态',
    8: 'BMU升级状态',
    65535: '其他'
  },
  '电池堆禁充禁放状态': {
    0: '可充可放',
    1: '可充禁放',
    2: '可放禁充',
    3: '禁充禁放'
  },
  '电池堆的充放电状态': {
    0: '其他',
    1: '充电',
    2: '放电'
  }
}

// 格式化数值显示
const formatValue = (value, scale = 1, label = '') => {
  if (value === null || value === undefined) {
    return '-'
  }
  
  // 检查是否是状态字段，如果是则返回对应的文本描述
  if (label && STATUS_MAPPINGS[label]) {
    const statusMapping = STATUS_MAPPINGS[label]
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
        '堆故障状态', 'BAU工作模式', '设备系统状态', '电池堆禁充禁放状态',
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
    '极柱温度概要',
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
        'BMU电压最大值', 'BMU电压最大值簇编号', 'BMU电压最大值电池编号',
        'BMU电压最小值', 'BMU电压最小值簇编号', 'BMU电压最小值电池编号',
        'BMU电压平均值', 'BMU电压极差值'
      ],
      'BMU电路板温度概要': [
        'BMU电路板温度最大值', 'BMU电路板温度最大值簇编号', 'BMU电路板温度最大值电池编号',
        'BMU电路板温度最小值', 'BMU电路板温度最小值簇编号', 'BMU电路板温度最小值电池编号',
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
      '极柱温度概要': [
        '极柱温度最大值', '极柱温度最大值簇编号', '极柱温度最大值电池编号',
        '极柱温度最小值', '极柱温度最小值簇编号', '极柱温度最小值电池编号',
        '极柱温度平均值', '极柱温度极差值'
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
    console.log(`[BlockInfo] 更新堆${selectedBlock.value}汇总数据，共${tableData.length}行记录`)
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
      '极柱温度概要',
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
    console.log(`[BlockInfo] 更新堆${selectedBlock.value}系统概要数据，共${allData.length}行记录`)
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
    console.log('[BlockInfo] 收到堆汇总信息MQTT消息:', data)
    
    if (data.dataType === 'BLOCK_SUMMARY') {
      console.log('[BlockInfo] 处理堆汇总信息:', data)
      
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
  console.log('[BlockInfo] 组件卸载')
  
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
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.block-summary-table {
  margin-top: 0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.table-header h6 {
  margin: 0;
  color: #374151;
  font-weight: 600;
}

.sys-abstract-data-table {
  width: 100%;
}

:deep(.p-datatable .p-datatable-header) {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: #f3f4f6;
  border-bottom: 1px solid #d1d5db;
  font-weight: 600;
  color: #374151;
}

:deep(.p-datatable .p-datatable-tbody > tr:nth-child(even)) {
  background: #f9fafb;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background: #f3f4f6;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  border-bottom: 1px solid #f1f3f4;
  padding: 12px 16px;
}

.text-gray-600 {
  color: #6b7280;
}

:deep(.p-accordion .p-accordion-header) {
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

:deep(.p-accordion .p-accordion-header:not(.p-disabled).p-highlight) {
  background: #e9ecef;
}

:deep(.p-accordion .p-accordion-content) {
  border-bottom: 1px solid #dee2e6;
  padding: 0;
}

:deep(.p-accordion .p-accordion-content-wrapper) {
  padding: 0;
}

:deep(.p-accordion .p-accordion-header) {
  transition: all 0.15s ease-in-out;
}

:deep(.p-accordion .p-accordion-content) {
  transition: all 0.15s ease-in-out;
}

:deep(.p-accordion .p-accordion-content-wrapper) {
  transition: all 0.15s ease-in-out;
}
</style> 