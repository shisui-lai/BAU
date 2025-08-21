<script setup>
import { computed,onMounted,onUnmounted } from 'vue'
import Dropdown             from 'primevue/dropdown'
import Tag                  from 'primevue/tag'
import { useClusterSelect }     from '@/composables/core/device-selection/useClusterSelect'

import { brokenwireFrames as frames, pickBrokenwire} from '@/composables/core/data-processing/cluster/parseBrokenwire'
import { packFrames       as packFramesMap,pickPack} from '@/composables/core/data-processing/cluster/parsePackSummary'
import { parsePackSummary }    from '@/composables/core/data-processing/cluster/parsePackSummary'
import { parseBrokenwire }    from '@/composables/core/data-processing/cluster/parseBrokenwire'

function onPackSummary (_e, msg) {
  parsePackSummary(msg)
}

function onBrokenwire (_e, msg) {
  parseBrokenwire(msg)
}

/* ---------- ② 在 onMounted 里注册 ---------- */
onMounted(() => {
  window.electron.ipcRenderer.on('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.on('BROKENWIRE',    onBrokenwire)
})

/* ---------- ③ 在 onUnmounted 里用同一引用解绑 ---------- */
onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.removeListener('BROKENWIRE', onBrokenwire)
})

const { clusterOptions, selectedCluster } = useClusterSelect()

/* —— 2. 分类常量 —— */
const SKIP_CLASS      = new Set(['电压一级掉线', '温度一级掉线'])
const SPLIT_BY_BMU    = new Set(['电压二级掉线', '温度二级掉线', 'AFE失联'])

const CLASS_ORDER = [
  'BMU失联状态',
  '动力接插件1温度掉线',
  '动力接插件2温度掉线',
  'AFE失联',
  '电压一级掉线',
  '温度一级掉线',
  '电压采集状态',
  '温度采集状态',
]

const CLASS_TITLE_REMAP = {
  '插件1温度掉线': '动力接插件1温度掉线',
  '插件2温度掉线': '动力接插件2温度掉线',
  '电压二级掉线' : '电压采集状态',
  '温度二级掉线' : '温度采集状态',
}

/* —— 3. label 替换 —— */
function renameLabel (label, cls) {
  if (cls === 'BMU失联状态')
    return label.replace(/失联[:：]?\s*$/, '')

  if (cls === '电压一级掉线')
    return label.replace(/ 电压一级掉线[:：]?\s*$/, ' 电压')
  if (cls === '温度一级掉线')
    return label.replace(/ 温度一级掉线[:：]?\s*$/, ' 温度')

  if (cls.includes('二级掉线'))
    return label
      .replace(/ 电压二级掉线[:：]?/, '')
      .replace(/ 温度二级掉线[:：]?/, '')
      .replace(/\s+Cell(\d+)/, '-#$1')

  if (cls.includes('AFE失联'))
    return label.replace(/ 失联[:：]?\s*$/, '')

  if (cls === '插件1温度掉线' || cls === '插件2温度掉线')
    return label.replace(/ 插件\d温度掉线[:：]?\s*$/, '')

  return label
}

/* —— 4. 组装卡片 —— */
const tableRows = computed(() => {
  const key        = selectedCluster.value ?? ''
  const frame      = frames.get(key) ? Object.fromEntries(frames.get(key)) : {}
  const packFrame  = packFramesMap.get(key)
                    ? Object.fromEntries(packFramesMap.get(key))
                    : {}

  const rows = []
  let rowId  = 0

  for (const aliasTitle of CLASS_ORDER) {
    const originalCls = Object.keys(CLASS_TITLE_REMAP)
      .find(k => CLASS_TITLE_REMAP[k] === aliasTitle) ?? aliasTitle

    if (SKIP_CLASS.has(originalCls)) continue   // 整类跳过

    const list = (frame[originalCls] || [])
      .filter(e => e.value !== undefined && e.value !== null)
    if (!list.length) continue

    /* 4-1 需要按 BMU 拆卡？ */
    if (SPLIT_BY_BMU.has(originalCls)) {
      const map = new Map()           // bmuNo → element[]

      for (const e of list) {
        const m = e.label.match(/^BMU(\d+)/)
        if (!m) continue
        const bmu = +m[1]
        if (!map.has(bmu)) map.set(bmu, [])
        map.get(bmu).push({
          label: renameLabel(e.label, originalCls),
          value: e.value === true  ? '正常'
                : e.value === false ? '失联'
                : e.value
        })
      }

      /* 每个 BMU 单独一张 card */
      Array.from(map.keys()).sort((a,b)=>a-b).forEach(bmuNo => {
        rows.push({
          id           : rowId++,
          classification: `${aliasTitle} BMU${bmuNo}`,
          element      : map.get(bmuNo)
        })
      })
    } else {
      /* 4-2 普通分类 → 一张卡 */
      const ele = list.map(e => ({
        label: renameLabel(e.label, originalCls),
        value: e.value === true  ? '正常'
             : e.value === false ? '失联'
             : e.value
      }))
      rows.push({
        id           : rowId++,
        classification: aliasTitle,
        element      : ele
      })
    }
  }

  /* 4-3 pack 端“失联信息”统计卡片，放最前 */
  const statSrc = packFrame['失联信息']
  if (statSrc && statSrc.length) {
    const statBlock = statSrc.map(e => ({
      label : e.label.replace(/数量$/, ''),
      value : e.value ?? 0
    }))
    rows.unshift({
      id           : -1,
      classification: '失联信息',
      element      : statBlock
    })
  }

  return rows
})


/* —— 5. tag 颜色 / 文案 —— */
function getSeverity(arr) {
  if (arr.some(e => typeof e.value !== 'string')) return ''
  return arr.every(e => e.value === '正常') ? 'success' : 'danger'
}
function getStatusText(arr) {
  if (arr.some(e => typeof e.value !== 'string')) return ''
  return arr.every(e => e.value === '正常') ? '正常' : '失联'
}
</script>
<template>
  <div class="card">


    <!-- 加载骨架：pinia 还没拿到任何数据时 ----------------------- -->
    <div v-if="!tableRows.length" class="empty-state">
      <ProgressSpinner />
    </div>

    <!-- 主网格：一张 Card = 一个分类 ----------------------------- -->
    <div v-else class="bmu-grid">
      <div v-for="row in tableRows" :key="row.id" class="bmu-card">
        <div class="card-header">
          <strong>{{ row.classification }}</strong>
          <Tag v-if="getStatusText(row.element)"
              :severity="getSeverity(row.element)">
            {{ getStatusText(row.element) }}
          </Tag>
        </div>

        <div class="card-content">
          <div v-for="item in row.element"
              :key="item.label"
              class="data-item">
            <span>{{ item.label }}：</span>
            <span :class="{ 'text-red-600 font-bold': item.value === '失联' }">
              {{ item.value }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style lang="less" scoped>

.bmu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.bmu-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,.05);
  font-variant-numeric: tabular-nums;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #f0f0f0;
  }

  .card-content {
    padding: 8px 12px;

    .data-item {
      display: flex;
      justify-content: space-between;
      line-height: 24px;
    }
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
}


</style>