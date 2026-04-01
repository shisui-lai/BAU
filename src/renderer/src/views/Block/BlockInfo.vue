<template>
  <div class="card">
    <div class="block-info">
      <!-- 使用标签页代替手风琴 -->
      <TabView v-model:activeIndex="activeTabIndex" class="block-info-tabs">
        <!-- 堆汇总信息标签页 -->
      <TabPanel :header="t('config.blockInfoPage.sections.summaryInfo')">
          <div class="info-content" v-if="activeTabIndex === 0">
            <div v-if="summarySections.length === 0" class="empty-message">
              {{ selectedBlock ? t('config.blockInfoPage.messages.noData') : t('config.blockInfoPage.messages.selectBlock') }}
            </div>
            <div v-else class="groups-container">
              <div v-for="group in summarySections" :key="group.title" class="group-section">
                <div class="group-header">
                  <span class="group-icon">{{ group.title === '状态信息' ? '⚠️' : '📊' }}</span>
                  <h5 class="group-title">{{ group.titleTranslated || group.title }}</h5>
                </div>
                <!-- 堆运行信息分组：先渲染普通项，再单独渲染簇状态行 -->
                <div v-if="group.title === '堆运行信息'">
                  <div :class="['items-grid', 'items-grid-key']">
                    <div 
                      v-for="item in group.items.filter(it => !it.isClusterStatus)" 
                      :key="item.key || item.labelTranslated" 
                      :class="['item-card', item.cardClass || '']"
                    >
                      <div class="item-label">{{ item.labelTranslated }}</div>
                      <div class="item-value" :class="item.valueClass || ''">
                        {{ item.valueFormatted }}<span v-if="item.unitDisplay && item.unitDisplay !== '-'" class="item-unit">{{ item.unitDisplay }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="cluster-row">
                    <div 
                      v-for="item in group.items.filter(it => it.isClusterStatus)" 
                      :key="item.key || item.labelTranslated" 
                      :class="['item-card', 'cluster-status-card', item.key === 'EnableClusterStatus' ? 'enable-bits' : (item.key === 'CutoutClusterStatus' ? 'cutout-bits' : '')]"
                    >
                      <div class="item-label">{{ item.labelTranslated }}</div>
                      <div v-if="item.renderType === 'cluster-bits' && item.rows" class="cluster-bits-rows">
                        <div v-for="(row, r) in item.rows" :key="r" class="cluster-bits-row">
                          <div v-for="(checked, i) in row" :key="i" class="cluster-bit-item">
                            <label>
                              <input type="checkbox" :checked="checked" class="bit-checkbox" tabindex="-1" @click.prevent />
                              <span class="bit-label">{{ (r === 0 ? (item.rangeStart || 1) : ((item.rangeStart || 1) + 10)) + i }}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div v-else-if="item.renderType === 'cluster-bits'" class="cluster-bits">
                        <div v-for="(checked, i) in item.bits" :key="i" class="cluster-bit-item">
                          <label>
                            <input type="checkbox" :checked="checked" class="bit-checkbox" tabindex="-1" @click.prevent />
                            <span class="bit-label">{{ (item.rangeStart || 1) + i }}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 最大最小值分组：按类别容器内排布（簇电压、簇SOC、单体电压、单体温度等） -->
                <div v-else-if="group.title === '最大最小值' && group.subGroups && group.subGroups.length">
                  <div class="subgroups-container">
                    <div v-for="sg in group.subGroups" :key="sg.title" class="subgroup-section">
                      <div class="subgroup-header">
                        <h6 class="subgroup-title">{{ sg.titleTranslated || sg.title }}</h6>
                      </div>
                      <div class="items-grid">
                        <div 
                          v-for="item in sg.items" 
                          :key="item.key || item.labelTranslated" 
                          :class="['item-card', item.cardClass || '']"
                        >
                          <div class="item-label">{{ item.labelTranslated }}</div>
                          <div class="item-value" :class="item.valueClass || ''">
                            {{ item.valueFormatted }}<span v-if="item.unitDisplay && item.unitDisplay !== '-'" class="item-unit">{{ item.unitDisplay }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="group.otherItems && group.otherItems.length" class="items-grid">
                    <div 
                      v-for="item in group.otherItems" 
                      :key="item.key || item.labelTranslated" 
                      :class="['item-card', item.cardClass || '']"
                    >
                      <div class="item-label">{{ item.labelTranslated }}</div>
                      <div class="item-value">
                        {{ item.valueFormatted }}<span v-if="item.unitDisplay && item.unitDisplay !== '-'" class="item-unit">{{ item.unitDisplay }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 其他分组保持原逻辑 -->
                <div v-else>
                  <div :class="['items-grid']">
                    <div 
                      v-for="item in group.items" 
                      :key="item.key || item.labelTranslated" 
                      :class="['item-card', item.cardClass || '']"
                    >
                      <div class="item-label">{{ item.labelTranslated }}</div>
                      <div v-if="item.renderType === 'cluster-bits' && item.rows" class="cluster-bits-rows">
                        <div v-for="(row, r) in item.rows" :key="r" class="cluster-bits-row">
                          <div v-for="(checked, i) in row" :key="i" class="cluster-bit-item">
                            <label>
                              <input type="checkbox" :checked="checked" class="bit-checkbox" tabindex="-1" @click.prevent />
                              <span class="bit-label">{{ (r === 0 ? (item.rangeStart || 1) : ((item.rangeStart || 1) + 10)) + i }}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div v-else-if="item.renderType === 'cluster-bits'" class="cluster-bits">
                        <div v-for="(checked, i) in item.bits" :key="i" class="cluster-bit-item">
                          <label>
                            <input type="checkbox" :checked="checked" class="bit-checkbox" tabindex="-1" @click.prevent />
                            <span class="bit-label">{{ (item.rangeStart || 1) + i }}</span>
                          </label>
                        </div>
                      </div>
                      <div v-else class="item-value" :class="item.valueClass || ''">
                        {{ item.valueFormatted }}<span v-if="item.unitDisplay && item.unitDisplay !== '-'" class="item-unit">{{ item.unitDisplay }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
            </div>
          </div>
        </TabPanel>
        
        <!-- 堆系统概要信息标签页 -->
        <TabPanel :header="t('config.blockInfoPage.sections.systemAbstract')">
          <div class="info-content" v-if="activeTabIndex === 1">
            <div v-if="sysAbstractSections.length === 0" class="empty-message">
              {{ selectedBlock ? t('config.blockInfoPage.messages.noData') : t('config.blockInfoPage.messages.selectBlock') }}
            </div>
            <div v-else class="groups-container">
              <div v-for="group in sysAbstractSections" :key="group.title" class="group-section">
                <div class="group-header">
                  <span class="group-icon">📈</span>
                  <h5 class="group-title">{{ group.titleTranslated || group.title }}</h5>
                </div>
                <div class="items-grid">
                  <div v-for="item in group.items" :key="item.key || item.labelTranslated" :class="['item-card', item.cardClass || '']">
                    <div class="item-label">{{ item.labelTranslated }}</div>
                    <div class="item-value">
                      {{ item.valueFormatted }}<span v-if="item.unitDisplay && item.unitDisplay !== '-'" class="item-unit">{{ item.unitDisplay }}</span>
                    </div>
                  </div>
                </div>
              </div>
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
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import { BLOCK_SUMMARY, BLOCK_SYS_ABSTRACT } from '../../../../main/table.js'

const { t, te, locale } = useI18n()

// 激活的标签页索引（用于懒加载）
const activeTabIndex = ref(0)

// 使用堆选择composable
const { selectedBlock } = useBlockSelect()

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

// 分组标题翻译（堆汇总）
const translateSummaryClassTitle = (cls) => {
  const map = {
    '堆运行信息': t('config.blockInfoPage.summaryClasses.keyInfo'),
    '堆基本信息': t('config.blockInfoPage.summaryClasses.basicInfo'),
    '最大最小值': t('config.blockInfoPage.summaryClasses.maxMinValues'),
    '状态信息': t('config.blockInfoPage.summaryClasses.statusInfo')
  }
  return map[cls] || cls
}

// 分组标题翻译（系统概要）
const translateSysAbstractClassTitle = (cls) => {
  const map = {
    '单体电压概要': t('config.blockInfoPage.sysAbstractClasses.cellVoltageSummary'),
    '单体温度概要': t('config.blockInfoPage.sysAbstractClasses.cellTempSummary'),
    'BMU电压概要': t('config.blockInfoPage.sysAbstractClasses.bmuVoltageSummary'),
    'BMU电路板温度概要': t('config.blockInfoPage.sysAbstractClasses.bmuPcbTempSummary'),
    '单体SOC概要': t('config.blockInfoPage.sysAbstractClasses.cellSocSummary'),
    '单体SOH概要': t('config.blockInfoPage.sysAbstractClasses.cellSohSummary'),
    '动力接插件温度概要': t('config.blockInfoPage.sysAbstractClasses.powerConnectorTempSummary'),
    '簇SOC概要': t('config.blockInfoPage.sysAbstractClasses.clusterSocSummary'),
    '簇电压概要': t('config.blockInfoPage.sysAbstractClasses.clusterVoltageSummary'),
    '簇电流概要': t('config.blockInfoPage.sysAbstractClasses.clusterCurrentSummary'),
    '铜排温度概要': t('config.blockInfoPage.sysAbstractClasses.afeBusbarTempSummary')
  }
  return map[cls] || cls
}

// 使用堆store（已移除未使用引用）

const summarySections = ref([])
const sysAbstractSections = ref([])

// 按“大类”分配统一的点缀样式（颜色）
const accentClassForSummaryClass = (cls) => {
  if (cls === '堆运行信息') return 'accent-green'
  if (cls === '堆基本信息') return 'accent-soft'
  if (cls === '最大最小值') return 'accent-soft'
  if (cls === '状态信息') return 'accent-soft'
  return ''
}

const accentClassForSysAbstractClass = (_cls) => 'accent-soft'

// 故障状态值到颜色class映射
const faultStateClassForRawValue = (raw) => {
  const v = (raw && typeof raw === 'object' && 'raw' in raw) ? raw.raw : raw
  if (v === 0) return 'text-green-500'
  if (v === 1) return 'text-yellow-500'
  if (v === 2) return 'text-orange-500'
  if (v === 3) return 'text-red-500'
  return ''
}

// 关键信息统一标签列表（用于避免占位重复）
const KEY_LABELS = [
  '堆电压', '堆电流', '堆SOC',
  '堆最大允许充电功率', '堆最大允许放电功率',
  '绝缘电阻R+', '绝缘电阻R-',
  '簇总数', '在线簇数'
]

// 最大最小值分类分组（在脚本内）
const categorizeMaxMinItems = (items = []) => {
  const labelOf = (it) => it?.label || it?.key || ''
  const groups = [
    // 第一排：堆单体电压、堆单体温度
    {
      title: '堆单体电压相关',
      titleTranslated: t('config.blockInfoPage.maxMinSubGroups.cellVoltageRelated'),
      match: new Set([
        '堆单体电压最大值', '堆单体电压最大值簇号', '堆单体电压最大值节号',
        '堆单体电压最小值', '堆单体电压最小值簇号', '堆单体电压最小值节号',
        '堆单体电压压差极差值', '堆单体平均电压'
      ])
    },
    {
      title: '堆单体温度相关',
      titleTranslated: t('config.blockInfoPage.maxMinSubGroups.cellTempRelated'),
      match: new Set([
        '堆单体温度最大值', '堆单体温度最大值簇号', '堆单体温度最大值节号',
        '堆单体温度最小值', '堆单体温度最小值簇号', '堆单体温度最小值节号',
        '堆单体温度温差极差值', '堆单体平均温度'
      ])
    },
    // 第二排：簇电压、簇SOC
    {
      title: '簇电压相关',
      titleTranslated: t('config.blockInfoPage.maxMinSubGroups.clusterVoltageRelated'),
      match: new Set(['簇电压最大值', '簇电压最大值簇号', '簇电压最小值', '簇电压最小值簇号'])
    },
    {
      title: '簇SOC相关',
      titleTranslated: t('config.blockInfoPage.maxMinSubGroups.clusterSocRelated'),
      match: new Set(['簇SOC最大值', '簇SOC最大值簇号', '簇SOC最小值', '簇SOC最小值簇号'])
    },
    // 第三排：允许与跳闸限制相关参数
    {
      title: '堆允许与跳闸限制相关',
      titleTranslated: t('config.blockInfoPage.maxMinSubGroups.allowedTripsRelated'),
      match: new Set([
        '堆最大允许充电电流', '堆最大允许放电电流',
        '堆最大允许充电电压', '堆最小允许放电电压',
        '堆最大跳闸限制充电电流', '堆最大跳闸限制放电电流',
        '堆最大跳闸限制充电电压', '堆最大跳闸限制放电电压',
        '堆最大允许充电单体电压', '堆最小允许放电单体电压'
      ])
    }
  ]
  return groups
    .map(g => ({
      title: g.title,
      titleTranslated: g.titleTranslated,
      items: items.filter(it => g.match.has(labelOf(it)))
        .map(it => ({
          ...it,
          labelTranslated: translateParameterName(labelOf(it)),
          unitDisplay: it.unitDisplay || getFieldUnit(labelOf(it)) || '-',
          cardClass: accentClassForSummaryClass('最大最小值')
        }))
    }))
    .filter(sg => (sg.items || []).length > 0)
}

 


// 获取堆显示名称（未使用，移除）

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

// 生成堆汇总信息占位符数据（未使用，移除）

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

const generateSummaryGroupPlaceholders = () => {
  const summaryClasses = ['堆运行信息', '堆基本信息', '最大最小值', '状态信息']
  const itemsPerClass = {
    '堆运行信息': [
      '堆电压', '堆电流', '堆SOC',
      '堆最大允许充电功率', '堆最大允许放电功率',
      '电池堆禁充禁放状态', '堆故障状态', '堆运行状态',
      '簇间压差', '簇间电流差', '簇间SOC差',
      '绝缘电阻R+', '绝缘电阻R-',
      '簇总数', '在线簇数'
    ],
    '堆基本信息': [
      '簇总数', '在线簇数', '堆电压', '堆电流', '堆SOC', '堆SOH', '堆SOE', '堆SOP',
      '堆充电SOP', '堆放电SOP', '绝缘电阻R+', '绝缘电阻R-', '堆最大允许充电功率',
      '堆最大允许放电功率', '堆额定容量',
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
      '堆单体温度最小值节号', '堆单体温度温差极差值',
      '堆单体平均电压', '堆单体平均温度',
      '堆最大允许充电电流', '堆最大允许放电电流',
      '堆最大允许充电电压', '堆最小允许放电电压',
      '堆最大跳闸限制充电电流', '堆最大跳闸限制放电电流',
      '堆最大跳闸限制充电电压', '堆最大跳闸限制放电电压',
      '堆最大允许充电单体电压', '堆最小允许放电单体电压'
    ],
    '状态信息': [
      '堆故障状态', '堆运行状态', '设备系统状态', '电池堆禁充禁放状态',
      '电池堆的充放电状态', '电池系统循环次数', '系统心跳'
    ]
  }
  return summaryClasses.map(cls => {
    const baseLabels = (itemsPerClass[cls] || [])
      .filter(label => cls !== '堆基本信息' ? true : !KEY_LABELS.includes(label))
    const baseItems = baseLabels.map(label => ({
      key: label,
      labelTranslated: translateParameterName(label),
      valueFormatted: '-',
      unitDisplay: getFieldUnit(label) || '-',
      renderType: 'text',
      cardClass: accentClassForSummaryClass(cls)
    }))
    if (cls === '堆运行信息') {
      const rowFalse = Array.from({ length: 10 }, () => false)
      baseItems.push({
        key: 'EnableClusterStatus',
        labelTranslated: translateParameterName('使能簇状态'),
        renderType: 'cluster-bits',
        rows: [rowFalse, rowFalse],
        rangeStart: 1,
        isClusterStatus: true
      })
      baseItems.push({
        key: 'CutoutClusterStatus',
        labelTranslated: translateParameterName('切出簇状态'),
        renderType: 'cluster-bits',
        rows: [rowFalse, rowFalse],
        rangeStart: 1,
        isClusterStatus: true
      })
    }
    const section = {
      title: cls,
      titleTranslated: translateSummaryClassTitle(cls),
      items: baseItems
    }
    if (cls === '最大最小值') {
      section.subGroups = categorizeMaxMinItems(baseItems)
    }
    return section
  })
}

// 更新堆汇总显示数据
const updateBlockSummaryData = () => {
  if (!selectedBlock.value) {
    summarySections.value = generateSummaryGroupPlaceholders()
    return
  }
  try {
    const allClasses = ['堆基本信息', '最大最小值', '状态信息']
    const data = pickBlockSummary(selectedBlock.value, allClasses)
    const groupMap = new Map()
  data.forEach(section => {
    const items = []
    if (section.element && Array.isArray(section.element)) {
      section.element.forEach(item => {
        const l = item.label || item.key
        if ((l || '').includes('预留') || (l || '').includes('保留') || (l || '').includes('跳过')) return
        const baseItem = {
          key: item.key,
          label: l,
          labelTranslated: translateParameterName(l),
          valueFormatted: formatValue(item.value, item.scale, l),
          unitDisplay: item.unit || '-',
          renderType: 'text',
          rawValue: item.value,
          cardClass: accentClassForSummaryClass(section.class)
        }
        // 堆故障状态：应用颜色
        if (l === '堆故障状态') {
          baseItem.valueClass = faultStateClassForRawValue(item.value)
        }
        items.push(baseItem)
      })
    }
    groupMap.set(section.class, items)
  })
  // 将部分“堆基本信息”中的平均值与允许/跳闸限制相关项，调整到“最大最小值”分组
  const moveToMaxMinLabels = [
    '堆单体平均电压', '堆单体平均温度',
    '堆最大允许充电电流', '堆最大允许放电电流',
    '堆最大允许充电电压', '堆最小允许放电电压',
    '堆最大跳闸限制充电电流', '堆最大跳闸限制放电电流',
    '堆最大跳闸限制充电电压', '堆最大跳闸限制放电电压',
    '堆最大允许充电单体电压', '堆最小允许放电单体电压'
  ]
  const takeFromAny = (label) => {
    for (const [cls, arr] of groupMap.entries()) {
      const idx = arr.findIndex(i => i.label === label)
      if (idx >= 0) return arr.splice(idx, 1)[0]
    }
    return null
  }
  const maxMinAdds = []
  moveToMaxMinLabels.forEach(lbl => {
    const item = takeFromAny(lbl)
    if (item) maxMinAdds.push(item)
  })
  if (maxMinAdds.length) {
    const mm = groupMap.get('最大最小值') || []
    mm.push(...maxMinAdds)
    groupMap.set('最大最小值', mm)
  }
    const keyLabels = KEY_LABELS.concat(['电池堆禁充禁放状态', '堆故障状态', '堆运行状态'])
    const takeFromGroup = (label) => {
      for (const [cls, arr] of groupMap.entries()) {
        const idx = arr.findIndex(i => i.label === label)
        if (idx >= 0) {
          return arr.splice(idx, 1)[0]
        }
      }
      return null
    }
    const keyItems = keyLabels.map(label => {
      const found = takeFromGroup(label)
      if (found) {
        found.cardClass = accentClassForSummaryClass('堆运行信息')
        return found
      }
      return {
        key: label,
        label: label,
        labelTranslated: translateParameterName(label),
        valueFormatted: '-',
        unitDisplay: getFieldUnit(label) || '-',
        renderType: 'text',
        cardClass: accentClassForSummaryClass('堆运行信息')
      }
    })
    // 将“簇间压差/电流差/SOC差”从“堆基本信息”移到“堆运行信息”，并插入到“堆运行状态”之后
    const moveToKeyLabels = ['簇间压差', '簇间电流差', '簇间SOC差']
    const takeFromBasic = (label) => {
      const basicItems = groupMap.get('堆基本信息') || []
      const idx = basicItems.findIndex(i => i.label === label)
      if (idx >= 0) {
        const item = basicItems.splice(idx, 1)[0]
        groupMap.set('堆基本信息', basicItems)
        return item
      }
      return null
    }
    const interClusterItems = moveToKeyLabels
      .map(lbl => takeFromBasic(lbl))
      .filter(Boolean)
      .map(it => ({
        ...it,
        labelTranslated: translateParameterName(it.label || it.key),
        unitDisplay: it.unitDisplay || getFieldUnit(it.label || it.key) || '-',
        cardClass: accentClassForSummaryClass('堆运行信息')
      }))
    if (interClusterItems.length) {
      const runStateIdx = keyItems.findIndex(i => i.label === '堆运行状态')
      const insertPos = runStateIdx >= 0 ? runStateIdx + 1 : keyItems.findIndex(i => !i.isClusterStatus)
      keyItems.splice(insertPos >= 0 ? insertPos : keyItems.length, 0, ...interClusterItems)
    }
    const statusItems = groupMap.get('状态信息') || []
    const findAndRemove = (label) => {
      const idx = statusItems.findIndex(i => i.label === label)
      if (idx >= 0) return statusItems.splice(idx, 1)[0]
      return null
    }
    const enable1 = findAndRemove('使能簇状态1')
    const enable2 = findAndRemove('使能簇状态2')
    const cutout1 = findAndRemove('切出簇状态1')
    const cutout2 = findAndRemove('切出簇状态2')
    const bits10 = (val) => Array.from({ length: 10 }, (_, i) => Boolean(((Number(val) || 0) >> i) & 1))
    if (enable1 || enable2) {
      const bits = [
        ...bits10(enable1 ? enable1.rawValue : 0),
        ...bits10(enable2 ? enable2.rawValue : 0)
      ]
      keyItems.push({
        key: 'EnableClusterStatus',
        label: '使能簇状态',
        labelTranslated: translateParameterName('使能簇状态'),
        renderType: 'cluster-bits',
        bits,
        rows: [bits.slice(0, 10), bits.slice(10)],
        rangeStart: 1,
        isClusterStatus: true
      })
    }
    if (cutout1 || cutout2) {
      const bits = [
        ...bits10(cutout1 ? cutout1.rawValue : 0),
        ...bits10(cutout2 ? cutout2.rawValue : 0)
      ]
      keyItems.push({
        key: 'CutoutClusterStatus',
        label: '切出簇状态',
        labelTranslated: translateParameterName('切出簇状态'),
        renderType: 'cluster-bits',
        bits,
        rows: [bits.slice(0, 10), bits.slice(10)],
        rangeStart: 1,
        isClusterStatus: true
      })
    }
    groupMap.set('堆运行信息', keyItems)
    groupMap.set('状态信息', statusItems)
    const ordered = ['堆运行信息', '堆基本信息', '最大最小值', '状态信息'].map(title => {
      const items = groupMap.get(title) || []
      if (title === '最大最小值') {
    // 为“最大最小值”分组应用统一样式
    const subGroups = categorizeMaxMinItems(items)
    const matched = new Set()
    subGroups.forEach(sg => sg.items.forEach(it => matched.add(it.label || it.key)))
    const otherItems = items
      .filter(it => !matched.has(it.label || it.key))
      .map(it => ({ ...it, cardClass: accentClassForSummaryClass('最大最小值') }))
    return {
      title,
      titleTranslated: translateSummaryClassTitle(title),
      items: items.map(it => ({ ...it, cardClass: accentClassForSummaryClass(title) })),
      subGroups,
      otherItems
    }
  }
  return {
    title,
    titleTranslated: translateSummaryClassTitle(title),
    items: items.map(it => ({ ...it, cardClass: accentClassForSummaryClass(title) }))
  }
})
    if (!ordered.some(g => (g.items || []).length)) {
      summarySections.value = generateSummaryGroupPlaceholders()
    } else {
      summarySections.value = ordered
    }
  } catch (error) {
    summarySections.value = generateSummaryGroupPlaceholders()
  }
}

// 更新堆系统概要显示数据
const updateBlockSysAbstractData = () => {
  if (!selectedBlock.value) {
    sysAbstractSections.value = generateSysAbstractPlaceholders()
    return
  }
  try {
    const classes = [
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
    const data = pickBlockSysAbstract(selectedBlock.value.toString(), classes)
    const sections = classes.map(cls => {
      const classData = data[cls] || []
      const items = classData.filter(item => !item.hidden).map(item => ({
        key: item.key,
        label: item.label,
        labelTranslated: translateParameterName(item.label),
        valueFormatted: formatValue(item.value, item.scale, item.label),
        unitDisplay: item.unit || '-',
        renderType: 'text',
        cardClass: accentClassForSysAbstractClass(cls)
      }))
      return { title: cls, titleTranslated: translateSysAbstractClassTitle(cls), items }
    })
    if (!sections.some(s => (s.items || []).length)) {
      sysAbstractSections.value = generateSysAbstractPlaceholders()
    } else {
      sysAbstractSections.value = sections
    }
  } catch (error) {
    sysAbstractSections.value = generateSysAbstractPlaceholders()
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
  position: relative;
  overflow: hidden;
}

:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link:hover) {
  background: var(--surface-hover);
  color: var(--text-color);
  transform: translateY(-0.5px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link::after) {
  content: '';
  position: absolute;
  left: 14%;
  right: 14%;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--primary-color), rgba(255,255,255,0.35), var(--primary-color));
  opacity: 0;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.25s ease, opacity 0.25s ease;
}

:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link:hover::after) {
  opacity: 1;
  transform: scaleX(1);
}

:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link::before) {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%);
  transform: translateX(-100%);
  opacity: 0;
}

:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link:hover::before) {
  opacity: 1;
  animation: tab-glint 1.2s linear;
}

.cluster-bits {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.cluster-bit-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cluster-bit-item label {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}
.cluster-bit-item input[type="checkbox"] {
  margin-right: 4px;
}
.cluster-status-card input[type="checkbox"] {
  accent-color: #22c55e;
}
.bit-label {
  display: inline-block;
  font-size: 12px;
  color: var(--text-color-secondary);
}
.cluster-status-card .bit-label {
  color: #16a34a;
}
:deep(.p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link) {
  background: transparent;
  color: var(--primary-color);
  border-color: transparent;
}

/* 选中标签不需要特殊高亮效果，仅保留主题色 */

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

/* 数据表容器 */
.table-wrapper {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid var(--surface-border);
}

.lightweight-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface-card);
  font-size: 11px;
}

.lightweight-table thead {
  background: var(--surface-section);
  border-bottom: 2px solid var(--surface-border);
}

.lightweight-table th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--text-color);
  border-bottom: 1px solid var(--surface-border);
  white-space: nowrap;
  font-size: 11px;
}

.lightweight-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--surface-border);
  color: var(--text-color);
  font-size: 11px;
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
    font-size: 10px;
  }
  .lightweight-table th,
  .lightweight-table td {
    padding: 6px 8px;
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

@keyframes tab-glint {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}


/* 分组卡片 + 紧凑网格布局 */
.groups-container {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.group-section {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
  padding: 0.75rem 0.75rem 1rem 0.75rem;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.25rem 0.5rem 0.25rem;
  border-bottom: 2px solid var(--surface-border);
}

.group-icon {
  font-size: 1rem;
}

.group-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

/* 最大最小值的子分组容器样式 */
.subgroups-container {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0.6rem 0.25rem 0 0.25rem;
}

.subgroup-section {
  border: 1px dashed var(--surface-border);
  border-radius: 8px;
  background: var(--surface-0);
  padding: 0.5rem 0.5rem 0.75rem 0.5rem;
}

.subgroup-header {
  display: flex;
  align-items: center;
  padding-bottom: 0.4rem;
  border-bottom: 1px dashed var(--surface-border);
}

.subgroup-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color-secondary);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0.6rem;
  padding: 0.6rem 0.25rem 0 0.25rem;
}

.item-card {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-0);
  padding: 0.6rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 3.25rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.18s ease;
}

.item-card:hover {
  transform: translateY(-1px);
  border-color: var(--surface-border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}


.item-label {
  font-size: 1.0rem;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.item-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}
/* 故障等级文本颜色 */
.text-green-500 { color: #22c55e; }
.text-red-500   { color: #ef4444; }
.text-orange-500{ color: #f59e0b; }
.text-yellow-500{ color: #fbbf24; }
.text-cyan-500  { color: #06b6d4; }
.text-gray-400  { color: #9ca3af; }

.item-unit {
  margin-left: 4px;
  font-size: 0.9rem;
  color: var(--text-color-secondary);
}

.items-grid-key .item-card {
  background: transparent;
  border-color: #10b981;
  box-shadow: 0 0 0 1px rgba(42, 180, 120, 0.28), 0 8px 16px rgba(42, 180, 120, 0.22);
}
.items-grid-key .item-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 0 1.5px rgba(42, 180, 120, 0.36), 0 10px 22px rgba(42, 180, 120, 0.30);
}

.items-grid-key .item-card .item-label,
.items-grid-key .item-card .item-value {
  color: #6ee7b7;
  -webkit-text-stroke: 0;
  -webkit-text-fill-color: initial;
  text-shadow: none;
}
.item-card.accent-green { border-color: #10b981; }
.item-card.accent-soft { border-color: #739fd8; }
.cluster-status-card {
  border-color: #10b981;
  border-width: 1px;
}
.cluster-status-card:hover {
  transform: translateY(-2px);
  border-color: rgba(42, 180, 120, 0.36);
  box-shadow: 0 0 0 1.5px rgba(42, 180, 120, 0.36), 0 10px 22px rgba(42, 180, 120, 0.30);
}
.cluster-status-card.enable-bits {
  background: transparent;
  border-color: #10b981;
  box-shadow: 0 0 0 1px rgba(42, 180, 120, 0.28), 0 8px 16px rgba(42, 180, 120, 0.22);
}
.cluster-status-card.cutout-bits {
  background: transparent;
  border-color: #10b981;
  box-shadow: 0 0 0 1px rgba(42, 180, 120, 0.28), 0 8px 16px rgba(42, 180, 120, 0.22);
}
.cluster-status-card.enable-bits .item-label,
.cluster-status-card.enable-bits .item-value,
.cluster-status-card.cutout-bits .item-label,
.cluster-status-card.cutout-bits .item-value {
  color: #6ee7b7;
  -webkit-text-stroke: 0;
  -webkit-text-fill-color: initial;
  text-shadow: none;
}
.cluster-status-card input.bit-checkbox { pointer-events: none; cursor: default; }
.cluster-status-card.enable-bits input.bit-checkbox { accent-color: #10b981; }
.cluster-status-card.cutout-bits input.bit-checkbox { accent-color: #10b981; }
.cluster-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-top: 0.6rem;
}
.cluster-bits-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cluster-bits-row {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px 10px;
}
</style>
