// 单体信息系统概要组件 - 显示最大最小电压、温度等概要信息及对应电池编号
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  activeView: { type: String, required: true },
  selectedCluster: {            // 仅声明字符串
  required: true,          // 标记为必传
  default: null,           // 组件内部初始 fallback
  validator: v => v === null || typeof v === 'string'
  // ↑ 自定义校验：只接受 null 或 字符串，防止警告
}
})
const emit = defineEmits(['update:selectedCluster'])

// 扩展CLASS_MAP支持所有概要数据类型
const CLASS_MAP = {
  CELL_VOLT: '单体电压概要',
  CELL_TEMP: '单体温度概要',
  CELL_SOC : '电芯SOC概要',
  CELL_SOH : '电芯SOH概要',
  BMU_VOLT: 'BMU电压概要',
  BMU_TEMP: 'BMU温度概要',
  BMU_PLUGIN_TEMP: 'CNR温度概要'  // 动力接插件温度对应CNR温度概要
}

// 数据类型对应的小数位数配置
const DECIMAL_CONFIG = {
  CELL_VOLT: 3,        // 单体电压：3位小数
  CELL_TEMP: 1,        // 单体温度：1位小数
  CELL_SOC: 0,         // SOC：整数
  CELL_SOH: 0,         // SOH：整数
  BMU_VOLT: 1,         // BMU电压：1位小数
  BMU_TEMP: 1,         // BMU温度：1位小数
  BMU_PLUGIN_TEMP: 1   // 动力接插件温度：1位小数
}

// 扩展PICK_MAP支持所有概要数据类型
const PICK_MAP = {
    CELL_VOLT: [
    '单体最大电压1(V)','单体最大电压2(V)','单体最大电压3(V)',
    '平均电压(V)','单体最小电压1(V)','单体最小电压2(V)',
    '单体最小电压3(V)','电压极差(V)'
  ],
  CELL_TEMP: [
    '单体最大温度1(℃)','单体最大温度2(℃)','单体最大温度3(℃)',
    '平均温度(℃)','单体最小温度1(℃)','单体最小温度2(℃)',
    '单体最小温度3(℃)','温度极差(℃)'
  ],
  CELL_SOC: [
    '单体最大SOC1(%)','单体最大SOC2(%)','单体最大SOC3(%)',
    '平均SOC(%)','单体最小SOC1(%)','单体最小SOC2(%)',
    '单体最小SOC3(%)','SOC极差(%)'
  ],
  CELL_SOH: [
    '单体最大SOH1(%)','单体最大SOH2(%)','单体最大SOH3(%)',
    '平均SOH(%)','单体最小SOH1(%)','单体最小SOH2(%)',
    '单体最小SOH3(%)','SOH极差(%)'
  ],
  BMU_VOLT: [
    'BMU最大电压1(V)','BMU最大电压2(V)','BMU最大电压3(V)',
    '平均电压(V)','BMU最小电压1(V)','BMU最小电压2(V)',
    'BMU最小电压3(V)','电压极差(V)'
  ],
  BMU_TEMP: [
    'BMU最大温度1(℃)','BMU最大温度2(℃)','BMU最大温度3(℃)',
    '平均温度(℃)','BMU最小温度1(℃)','BMU最小温度2(℃)',
    'BMU最小温度3(℃)','温度极差(℃)'
  ],
  BMU_PLUGIN_TEMP: [
    '极柱最大温度1(℃)','极柱最大温度2(℃)','极柱最大温度3(℃)',
    '平均温度(℃)','极柱最小温度1(℃)','极柱最小温度2(℃)',
    '极柱最小温度3(℃)','温度极差(℃)'
  ]
}

const cache = ref({})
const clusterOptions = ref([])

onMounted(() => {
  window.electron.ipcRenderer.on('SYS_ABSTRACT', handler)
})
onBeforeUnmount(() => {
  window.electron.ipcRenderer.removeListener('SYS_ABSTRACT', handler)
})

function handler(_e, msg) {
  // if (msg.dataType !== 'SYS_ABSTRACT') return;
   if (msg.dataType !== 'SYS_ABSTRACT' ||
     msg.clusterId == null            ||   // null / undefined
     Number.isNaN(msg.clusterId)) return;  // NaN

  const key = `${msg.blockId}-${msg.clusterId}`;
  // console.log(`[SystemAbstract] 收到 SYS_ABSTRACT for cluster ${key}`);

  cache.value[key] = msg.data;

  if (!clusterOptions.value.includes(key)) {
    clusterOptions.value.push(key);
    // console.log(`[SystemAbstract] 新簇添加: ${key}`);
  }

  emit('update:selectedCluster', key);
}

// 数值格式化函数
function formatValue(value, activeView) {
  if (value === '–' || value === '--' || value === null || value === undefined) {
    return '–'
  }
  
  const decimals = DECIMAL_CONFIG[activeView] || 1
  const numValue = Number(value)
  
  if (isNaN(numValue)) {
    return value
  }
  
  return numValue.toFixed(decimals)
}

const viewData = computed(() => {
  // console.log('[viewData] props.selectedCluster=', props.selectedCluster,
  //             'activeView=', props.activeView)
  // console.log('[viewData] cache keys:', Object.keys(cache.value))
  const list = cache.value[props.selectedCluster] || []
  // console.log('[viewData] list:', list)
  const cls = CLASS_MAP[props.activeView]
  // console.log('[viewData] looking for class:', cls)
  const found = list.find(d => d.class === cls)
  // console.log('[viewData] found:', found)
  const pick = PICK_MAP[props.activeView] || []

  /* 若还没收到概要帧 → 生成占位 "–" */
  if (!found) {
   return pick.map(label => ({ label, value: '–' }))
  }

  /* 正常过滤已到达的概要帧，并添加编号信息 */
  const filtered = found.element.filter(e => pick.includes(e.label))
  
  // 添加编号信息的逻辑
  return filtered.map(item => {
    // 查找对应的编号字段
    const numFieldName = getNumberFieldName(item.label)
    let formattedValue = formatValue(item.value, props.activeView)
    
    if (numFieldName) {
      const numElement = found.element.find(e => e.label === numFieldName)
      if (numElement && numElement.value && numElement.value !== '0') {
        formattedValue = `${formattedValue} #${numElement.value}`
      }
    }
    
    return {
      label: item.label,
      value: formattedValue
    }
  })
})

// 根据数值字段名获取对应的编号字段名（现在所有编号字段都有明确的名称）
function getNumberFieldName(valueLabel) {
  const numberFieldMap = {
    // 单体电压
    '单体最大电压1(V)': '单体最大电压编号1',
    '单体最大电压2(V)': '单体最大电压编号2', 
    '单体最大电压3(V)': '单体最大电压编号3',
    '单体最小电压1(V)': '单体最小电压编号1',
    '单体最小电压2(V)': '单体最小电压编号2',
    '单体最小电压3(V)': '单体最小电压编号3',
    
    // 单体温度
    '单体最大温度1(℃)': '单体最大温度编号1',
    '单体最大温度2(℃)': '单体最大温度编号2',
    '单体最大温度3(℃)': '单体最大温度编号3',
    '单体最小温度1(℃)': '单体最小温度编号1',
    '单体最小温度2(℃)': '单体最小温度编号2',
    '单体最小温度3(℃)': '单体最小温度编号3',
    
    // 电芯SOC
    '单体最大SOC1(%)': '单体最大SOC编号1',
    '单体最大SOC2(%)': '单体最大SOC编号2',
    '单体最大SOC3(%)': '单体最大SOC编号3',
    '单体最小SOC1(%)': '单体最小SOC编号1',
    '单体最小SOC2(%)': '单体最小SOC编号2',
    '单体最小SOC3(%)': '单体最小SOC编号3',
    
    // 电芯SOH
    '单体最大SOH1(%)': '单体最大SOH编号1',
    '单体最大SOH2(%)': '单体最大SOH编号2',
    '单体最大SOH3(%)': '单体最大SOH编号3',
    '单体最小SOH1(%)': '单体最小SOH编号1',
    '单体最小SOH2(%)': '单体最小SOH编号2',
    '单体最小SOH3(%)': '单体最小SOH编号3',
    
    // BMU电压
    'BMU最大电压1(V)': 'BMU最大电压编号1',
    'BMU最大电压2(V)': 'BMU最大电压编号2',
    'BMU最大电压3(V)': 'BMU最大电压编号3',
    'BMU最小电压1(V)': 'BMU最小电压编号1',
    'BMU最小电压2(V)': 'BMU最小电压编号2',
    'BMU最小电压3(V)': 'BMU最小电压编号3',
    
    // BMU温度
    'BMU最大温度1(℃)': 'BMU最大温度编号1',
    'BMU最大温度2(℃)': 'BMU最大温度编号2',
    'BMU最大温度3(℃)': 'BMU最大温度编号3',
    'BMU最小温度1(℃)': 'BMU最小温度编号1',
    'BMU最小温度2(℃)': 'BMU最小温度编号2',
    'BMU最小温度3(℃)': 'BMU最小温度编号3',
    
    // CNR温度
    '极柱最大温度1(℃)': '极柱最大温度编号1',
    '极柱最大温度2(℃)': '极柱最大温度编号2',
    '极柱最大温度3(℃)': '极柱最大温度编号3',
    '极柱最小温度1(℃)': '极柱最小温度编号1',
    '极柱最小温度2(℃)': '极柱最小温度编号2',
    '极柱最小温度3(℃)': '极柱最小温度编号3'
  }
  
  return numberFieldMap[valueLabel] || null // 平均值、极差等不需要编号
}

</script>

<template>
  <div>
  
      <div
        v-for="item in viewData"
        :key="item.label"
        style="  width: fit-content;
          min-width: 7rem;
          height: fit-content;
          min-height: 2.9rem; 
          text-align: left;
          display: inline-block;
          position: relative; 
          padding: 0rem 0.2rem;
          border-radius: 3px; 
          border: 1.4px solid #b9c1c6db; "
      >
        <div class="text-xs opacity-60 truncate">{{ item.label }}</div>
        <div class="text-xl font-semibold">{{ item.value }}</div>

    </div>
  
  </div>
</template>

