<script setup>
import { ref, computed, watch,  onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
// import { storeToRefs } from 'pinia'
// import { useClusterSummaryStore } from '@/stores/clusterSummary'
// import { usePackSummaryStore } from '@/stores/packSummary'
import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'
import { parsePackSummary }    from '@/composables/core/data-processing/cluster/parsePackSummary'
// 改为本地缓存簇概要数据的方式，移除 parseClusterSummary 依赖
 import {packFrames    as packFramesMap,   pickPack   } from '@/composables/core/data-processing/cluster/parsePackSummary'
 import { parseClusterSummary, pickCluster } from '@/composables/core/data-processing/cluster/parseClusterSummary'

const { t, te } = useI18n()

const { clusterOptions, selectedCluster } = useClusterSelect()



function onPackSummary (_e, msg) {
  parsePackSummary(msg)
}

// 统一解析到集中缓存
function onClusterSummary (_e, msg) {
  parseClusterSummary(msg)
}

/* ---------- ② 在 onMounted 里注册 ---------- */
onMounted(() => {
  // 先清理可能存在的旧监听器（防止快速切换导致的残留）
  window.electron.ipcRenderer.removeAllListeners('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_SUMMARY', onClusterSummary)

  window.electron.ipcRenderer.on('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.on('CLUSTER_SUMMARY', onClusterSummary)
})

/* ---------- ③ 在 onUnmounted 里用同一引用解绑 ---------- */
onUnmounted(() => {
  window.electron.ipcRenderer.removeAllListeners('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.removeAllListeners('CLUSTER_SUMMARY', onClusterSummary)
})
const props = defineProps({
  filterClasses: {
    type: Array,
    default: () => [
      'CAN-Hall信息',
      '系统及空间信息',
      '版本信息',
      // 不再把 BMU 版本信息放这里
    ]
  }
})

const FIELD_TEMPLATES = computed(() => ({
  'CAN-Hall信息': ['LEM/SP5状态信息', 'Hall 名称', 'Hall 软件'],
  '系统及空间信息': ['系统状态位', '周期任务堆栈大小', '系统堆栈空间', '系统堆栈最小空间'],
  '版本信息': [
    'BCU产品编码',
    'BCU硬件版本号',
    'BCU软件版本号',
    'BCU_BOOT版本号',
    'BCU_BAU协议版本号',
    'BCU_BMU协议版本号',
    'BCU_事件记录版本号',
    'BCU_SOX算法版本号'
  ]
}))

// BMU 默认占位到 Pack 进来前用
const BMU_PLACEHOLDERS = computed(() => ['BMU1 软件版本', 'BMU1 BOOT版本'])

// 通用标签翻译函数 - 参考 Reference Modbus 项目的方式
const getLabelTranslation = (label) => {
  // 直接尝试翻译（现在所有标签都在本地化文件中预定义了）
  const directTranslation = t(`versionInfo.labels.${label}`)
  if (directTranslation && !directTranslation.startsWith('versionInfo.labels.')) {
    return directTranslation
  }
  
  // 如果翻译失败，返回原始标签
  return label
}

// 格式化数值显示函数 - 参考 Reference Modbus 项目的方式
const formatStackValue = (value, label) => {
  if (value === '–' || value === null || value === undefined) {
    return '–'
  }

  // 处理空字符串或无效值 - 直接返回，不需要翻译
  if (value === '' || value === '0000' || value === '0') {
    return '–'
  }

  // 处理bits类型的对象（如LEM/SP5状态信息）
  if (value && typeof value === 'object' && 'txt' in value) {
    // 对txt值进行翻译，使用 te() 检查翻译是否存在
    if (te(`versionInfo.values.${value.txt}`)) {
      return t(`versionInfo.values.${value.txt}`)
    }
    return value.txt
  }

  // 只对特定标签的值进行翻译（如状态信息）
  const translatableLabels = [
    'LEM/SP5状态信息',
    '系统状态位'
  ]
  
  if (translatableLabels.includes(label) && typeof value === 'string') {
    // 使用 te() 检查翻译是否存在，避免警告
    if (te(`versionInfo.values.${value}`)) {
      return t(`versionInfo.values.${value}`)
    }
    return value
  }

  // 处理这三个特定的堆栈字段
  const stackFields = [
    '周期任务堆栈大小',
    '系统堆栈空间',
    '系统堆栈最小空间'
  ]

  if (stackFields.includes(label) && typeof value === 'number') {
    // 限制两位小数并添加KB单位
    return `${value.toFixed(2)} KB`
  }

  // 其他字段（如版本号）直接返回，不翻译
  return value
}
const tableRows = computed(() => {
  const key = selectedCluster.value ?? ''
  const clsArr = props.filterClasses

  // 预处理簇端 rows
  const clusterData = key ? (pickCluster(key, clsArr) || []) : []
  const clusterMap = new Map(clusterData.map(b => [b.class, b.element]))
  const clusterRows = clsArr.map((cls, idx) => {
    const ele = clusterMap.get(cls) || []
    const labels = FIELD_TEMPLATES.value[cls] || []
    const m = new Map(ele.map(e => [e.label, e.value]))
    
    const completed = labels.map(label => {
      const value = m.get(label)
      if (value !== undefined) {
        return {
          label: getLabelTranslation(label),
          value: formatStackValue(value, label)
        }
      } else {
        return {
          label: getLabelTranslation(label),
          value: '–'
        }
      }
    })
    return { 
      id: idx, 
      classification: t(`versionInfo.classification.${cls}`) || cls, 
      element: completed 
    }
  })

  // 处理 BMU 版本
  // const packData = packPick.value(key, ['BMU版本信息'])
  const packData = pickPack(key, ['BMU版本信息'])  
  const elems = packData.length ? packData[0].element : []
  const completed2 = elems.length
    ? elems.map(e => ({ 
        label: getLabelTranslation(e.label), 
        value: formatStackValue(e.value, e.label)
      }))
    : BMU_PLACEHOLDERS.value.map(label => ({ 
        label: getLabelTranslation(label), 
        value: '–' 
      }))

  const bmuRow = {
    id: clusterRows.length,
    classification: t('versionInfo.classification.BMU版本信息') || 'BMU版本信息',
    element: completed2
  }

  return [...clusterRows, bmuRow]
})


// watch(selectedCluster, v => console.log('[watch] selectedCluster =', v))
// watch(tableRows, v => console.log('[watch] tableRows 更新，行数 =', v.length))
</script>

<template>
  <div class="card">
    <div
      v-for="group in tableRows"
      :key="group.id"
      class="group-section"
    >
      <h5>{{ group.classification }}</h5>
      <div class="items-grid">
        <div v-for="item in group.element" :key="item.label" class="item-card">
          <div class="item-label">{{ item.label }}</div>
          <div class="item-value">{{ item.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.card {
  /* 使用全局card样式，不覆盖margin-left */
  background: var(--surface-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 1rem;
}

.group-section + .group-section {
  margin-top: 2rem;
}

.group-section h5 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.75rem;
}

.item-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 4rem;
  background: var(--surface-0);
  transition: box-shadow 0.2s;
}

.item-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-label {
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.item-value {
  word-break: break-word;
  font-weight: 600;
  color: var(--text-color);
  font-size: 1rem;
}
</style>
