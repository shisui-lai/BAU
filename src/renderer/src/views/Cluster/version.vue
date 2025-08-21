<script setup>
import { ref, computed, watch,  onMounted, onUnmounted } from 'vue'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
// import { storeToRefs } from 'pinia'
// import { useClusterSummaryStore } from '@/stores/clusterSummary'
// import { usePackSummaryStore } from '@/stores/packSummary'
import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'
import { parsePackSummary }    from '@/composables/core/data-processing/cluster/parsePackSummary'
import { parseClusterSummary }    from '@/composables/core/data-processing/cluster/parseClusterSummary'
 import {clusterFrames as clusterFramesMap,pickCluster} from '@/composables/core/data-processing/cluster/parseClusterSummary'
 import {packFrames    as packFramesMap,   pickPack   } from '@/composables/core/data-processing/cluster/parsePackSummary'

const { clusterOptions, selectedCluster } = useClusterSelect()



function onPackSummary (_e, msg) {
  parsePackSummary(msg)
}

function onClusterSummary (_e, msg) {
  parseClusterSummary(msg)
}

/* ---------- ② 在 onMounted 里注册 ---------- */
onMounted(() => {
  window.electron.ipcRenderer.on('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.on('CLUSTER_SUMMARY', onClusterSummary)
})

/* ---------- ③ 在 onUnmounted 里用同一引用解绑 ---------- */
onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.removeListener('CLUSTER_SUMMARY', onClusterSummary)
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

const FIELD_TEMPLATES = {
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
}

// BMU 默认占位到 Pack 进来前用
const BMU_PLACEHOLDERS = ['BMU1 软件版本', 'BMU1 BOOT版本']

// 格式化数值显示函数 - 专门处理堆栈相关数据和bits类型数据
const formatStackValue = (value, label) => {
  if (value === '–' || value === null || value === undefined) {
    return '–'
  }

  // 处理bits类型的对象（如LEM/SP5状态信息）
  if (value && typeof value === 'object' && 'txt' in value) {
    return value.txt
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

  // 其他字段保持原样
  return value
}
const tableRows = computed(() => {
  const key = selectedCluster.value ?? ''
  const clsArr = props.filterClasses

  // 预处理簇端 rows
  const clusterData = pickCluster(key, clsArr)
  const clusterMap = new Map(clusterData.map(b => [b.class, b.element]))
  const clusterRows = clsArr.map((cls, idx) => {
    const ele = clusterMap.get(cls) || []
    const labels = FIELD_TEMPLATES[cls] || []
    const m = new Map(ele.map(e => [e.label, e.value]))
    
    const completed = labels.map(label => {
      const value = m.get(label)
      if (value !== undefined) {
        return {
          label,
          value: formatStackValue(value, label)
        }
      } else {
        return {
          label,
          value: '–'
        }
      }
    })
    return { id: idx, classification: cls, element: completed }
  })

  // 处理 BMU 版本
  // const packData = packPick.value(key, ['BMU版本信息'])
  const packData = pickPack(key, ['BMU版本信息'])  
  const elems = packData.length ? packData[0].element : []
  const completed2 = elems.length
    ? elems.map(e => ({ label: e.label, value: e.value }))
    : BMU_PLACEHOLDERS.map(label => ({ label, value: '–' }))

  const bmuRow = {
    id: clusterRows.length,
    classification: 'BMU版本信息',
    element: completed2
  }

  return [...clusterRows, bmuRow]
})


// watch(selectedCluster, v => console.log('[watch] selectedCluster =', v))
// watch(tableRows, v => console.log('[watch] tableRows 更新，行数 =', v.length))
</script>

<template>
  <div class="card">

    <DataTable :value="tableRows" dataKey="id" showGridlines class="center-table">
      <Column header="分类" style="width:12rem">
        <template #body="{ data }">
          <div class="class-cell">{{ data.classification }}</div>
        </template>
      </Column>
      <Column header="">
        <template #body="{ data }">
  <div class="property-row">
    <div
      v-for="e in data.element"
      :key="e.label"
      class="kv-cell"
    >
      <div class="kv-label">{{ e.label }}</div>
      <div class="kv-value">{{ e.value }}</div>
    </div>
  </div>
</template>
      </Column>
    </DataTable>
  </div>
</template>

<style lang="less" scoped>
.card { 
  /* 使用全局card样式，不覆盖margin-left */
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.center-table :deep(th),
.center-table :deep(td) {
  border: 1px solid #dadada;
}
.class-cell {
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.property-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.kv-cell {
  min-width: 133px;
  padding: .35rem .5rem;
  border: 1px solid #c0c0c0;
  border-radius: 4px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.kv-label  { font-weight: 600; }   /* 上半部 */
.kv-value  { margin-top: 2px; }    /* 下半部 */
</style>
