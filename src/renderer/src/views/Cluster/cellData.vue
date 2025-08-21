  <script setup>  
  import { ref, reactive, computed, onMounted, onBeforeUnmount,onActivated, onDeactivated } from 'vue'
  import Dropdown  from 'primevue/dropdown'
  import Button    from 'primevue/button'
  import DataTable from 'primevue/datatable'
  import Column    from 'primevue/column'
  import SystemAbstract from './SystemAbstract.vue'
  
  import { useClusterSelect } from '@/composables/core/device-selection/useClusterSelect'
  const { clusterOptions, selectedCluster,
        ensureClusterOption, replaceClusterOptions } = useClusterSelect()
  import cluster from './version.vue' 
  import { pickCluster        } from '@/composables/core/data-processing/cluster/parseClusterSummary'
  import { pickPack           } from '@/composables/core/data-processing/cluster/parsePackSummary'
  import { parsePackSummary }    from '@/composables/core/data-processing/cluster/parsePackSummary'
  import { parseClusterSummary }    from '@/composables/core/data-processing/cluster/parseClusterSummary'
  function onPackSummary (_e, msg) {
    parsePackSummary(msg)
  }

  function onClusterSummary (_e, msg) {
    parseClusterSummary(msg)
  }

  /* ────────── 常量 ────────── */
  const DATA_TYPE_MAP = {
    CELL_VOLT: { label: '电压',  decimals: 3 },
    CELL_TEMP: { label: '温度',  decimals: 1 },
    CELL_SOC : { label: 'SOC',   decimals: 1 },
    CELL_SOH : { label: 'SOH',   decimals: 1 },
    BMU_VOLT:         { label: 'BMU 电压',     decimals: 1 },
    BMU_TEMP:         { label: 'BMU 温度',     decimals: 1 },
    BMU_PLUGIN_TEMP:  { label: '动力接插件温度',     decimals: 1 },
    // BMU_PLUGIN_TEMP2:  { label: '动力接插件温度2',     decimals: 1 }
    //decimals 保留小数位数，-1 表示不显示小数
  }

  /* ────────── 响应式状态 ────────── */
  const clusterCache    = reactive({})       // 二维缓存：type → Map<clusterKey, matrix>
  // const clusterOptions  = ref([])            // 下拉选项
  // const selectedCluster = ref(null)          // 当前簇 key，如 "1-1"
  const activeView      = ref('CELL_VOLT')   // 当前数据类型按钮

  /* ────────── MQTT / IPC 监听 ────────── */

  // ① 频道列表：后期待扩展可再加
const CELL_CHANNELS = [
  'CELL_VOLT',
  'CELL_TEMP',
  'CELL_SOC',
  'CELL_SOH',
]

function onCellMsg (_e, msg) { 
  handler(_e, msg) 
  if (msg.dataType === 'PACK_SUMMARY')       { parsePackSummary(msg); return }
  if (msg.dataType === 'CLUSTER_SUMMARY')    { parseClusterSummary(msg); return }
}  // 保留原 handler

onMounted(() => {
  CELL_CHANNELS.forEach(ch =>
    window.electron.ipcRenderer.on(ch, onCellMsg)
  )
  window.electron.ipcRenderer.on('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.on('CLUSTER_SUMMARY', onClusterSummary)
  // window.electron.ipcRenderer.on('SYS_ABSTRACT',    handler)        // 仍走原 handler
})

onBeforeUnmount(() => {
  CELL_CHANNELS.forEach(ch =>
    window.electron.ipcRenderer.removeListener(ch, onCellMsg)
  )
  window.electron.ipcRenderer.removeListener('PACK_SUMMARY',    onPackSummary)
  window.electron.ipcRenderer.removeListener('CLUSTER_SUMMARY', onClusterSummary)
  // window.electron.ipcRenderer.removeListener('SYS_ABSTRACT',    handler)
})


  // onMounted(() => {
  //   // console.log('%c[连接成功] 渲染进程监听 mqtt-message', 'color:green')
  //   window.electron.ipcRenderer.on('mqtt-message', handler)
  //   // logCount('mounted')
  // })
  // onBeforeUnmount(() =>{
  //   window.electron.ipcRenderer.removeListener('mqtt-message', handler)
  //   // logCount('beforeUnmount')
  // })
 
   //单体数据
  /* ==========  消息处理  ========== */
  function handler (_e, msg) {
    // console.log('[handler] 收到原始 msg ↓↓↓')
    // console.log(JSON.stringify(msg, null, 2))

    /*  堆簇数量帧：只更新下拉 */
    if (msg.dataType === 'BLOCK_COMMON_PARAM_R') {
      buildClusterOptions(msg)
      return
    }

    // 关联下拉：只对于 CELL_* 或 SYS_ABSTRACT
    if (msg.clusterId != null &&
      (msg.dataType?.startsWith('CELL_') || msg.dataType === 'SYS_ABSTRACT')) {
      const clusterKey = `${msg.blockId}-${msg.clusterId}`
      // 【已禁用】动态发现机制，改用配置驱动方式
      // ensureClusterOption(clusterKey)
    }

    // 若是概要，不走 CELL_* 矩阵流程
    if (msg.dataType === 'SYS_ABSTRACT') return

    // 非 CELL_* 不处理
    const MEASURE_TYPES = ['CELL_VOLT', 'CELL_TEMP', 'CELL_SOC', 'CELL_SOH']
    if (!MEASURE_TYPES.includes(msg.dataType)) return

      const clusterKey = `${msg.blockId}-${msg.clusterId}`
      const cfg = DATA_TYPE_MAP[msg.dataType]
    // if (!cfg) {
    //     console.error('未知 dataType', msg.dataType)
    //     return
    //   }

    /*  如果首见该簇 → 创建空矩阵 */
    if (!clusterCache[msg.dataType]) clusterCache[msg.dataType] = new Map()
    if (!clusterCache[msg.dataType].has(clusterKey)) {
      if (!msg.baseConfig) {
        console.error('缺少 baseConfig，无法建矩阵')
        return
      }
      // const m = buildEmptyMatrix(msg.baseConfig)
            /* ➊ 选对计数数组：CELL_TEMP 用温感，其他用电芯 */
      const counts = msg.dataType === 'CELL_TEMP'
        ? msg.baseConfig.afeTempCounts
        : msg.baseConfig.afeCellCounts

      const m = buildEmptyMatrix({                            // ➋ 新写法
        bmuTotal     : msg.baseConfig.bmuTotal,
        afePerBmu    : msg.baseConfig.afePerBmu,
        afeCellCounts : counts
      })
      clusterCache[msg.dataType].set(clusterKey, m)
      // console.log(`   创建空矩阵 rows=${m.length} for ${clusterKey} ${msg.dataType}`)
    }

    /*  写入数据并强制触发响应式 */
    // const updated = fillMatrix(
    //   clusterCache[msg.dataType].get(clusterKey),
    //   msg,
    //   cfg.decimals
    // )
    // // 用新数组替换，保证 Vue 能侦测到变更
    // clusterCache[msg.dataType].set(clusterKey, [...updated])
    // console.log(`  ✔ 已写入 ${msg.data.length} 组 element (${msg.dataType})`)
    fillMatrix(clusterCache[msg.dataType].get(clusterKey), msg)
  }




  /* ---------- 生成/追加下拉 ---------- */
  function buildClusterOptions (msg) {
    const kv = Object.fromEntries(
      msg.data?.[0]?.element?.map(e => [e.label.replace(/\s/g, ''), e.value]) || []
    )
    const blockCnt = +kv['堆总数'] || 0
    const opts = []
    for (let b = 1; b <= blockCnt; b++) {
      const clusterCnt = +kv[`${b === 1 ? '第一' : '第二'}堆簇数`] || 0
      for (let c = 1; c <= clusterCnt; c++) {
        opts.push({ label: `堆${b}/簇${c}`, value: `${b}-${c}` })
      }
    }

    replaceClusterOptions(opts)    
    // console.log('   下拉更新 =', opts.map(o => o.value))

  }

  /* ---------- 创建空矩阵 ---------- */
  function buildEmptyMatrix (base) {
    const rows = []
    const { bmuTotal, afePerBmu, afeCellCounts } = base
    for (let b = 1; b <= bmuTotal; b++) {
      for (let a = 1; a <= afePerBmu; a++) {
        const cols = afeCellCounts[(a - 1) % afePerBmu] || 0
        if (cols === 0) continue // 跳过无效 AFE
        rows.push({
          rowIdx: (b - 1) * afePerBmu + (a - 1),
          bmuLabel: `BMU${b}-AFE${a}`,
          cells: Array(cols).fill('--')
        })
      }
    }
    return rows
  }

  /* ---------- 写入矩阵 ---------- */
  function fillMatrix (matrix, msg) {
    const { afePerBmu } = msg.baseConfig
    msg.data.forEach(group => {
      const rowIdx = (group.bmuId - 1) * afePerBmu + (group.afeId - 1)
      const row = matrix.find(r => r.rowIdx === rowIdx)
      if (!row) return
      group.element.forEach(({ label, value }) => {
        const col = +label.replace('#', '') - 1
        if (col >= 0 && col < row.cells.length) {
          row.cells[col] = value           // 保留原始数值
        }
      })
    })
  }

  /* ---------- 计算表格行列 ---------- */
  const matrixRows = computed(() => {
    const map = clusterCache[activeView.value]
    const rows = map?.get(selectedCluster.value) || []
    // console.log('[渲染] 当前簇', selectedCluster.value,
    //             '类型', activeView.value,
    //             'rows=', rows.length)
    return rows
  })

  const cellsPerAfe = computed(() => matrixRows.value[0]?.cells.length || 0)

  // const maxCols = computed(() =>
  //   Math.max(...matrixRows.value.map(r => r.cells.length), 0)
  // )
  const maxCols = computed(() =>
    Math.max(...matrixRows.value.map(r => r.cells.length), 0)
  )
  const displayCols = computed(() => Array.from({ length: maxCols.value }, (_, i) => i + 1))

  function formatCell(v){          // ★ 模板内按需格式化
    return v === '--' ? v : Number(v).toFixed(DATA_TYPE_MAP[activeView.value].decimals)
  }


  //簇端数据

  // 当前页面需要展示的三类数据
  const NEED = ['系统信息', '温度信息', '电池信息']

  // ①　原始提取（如果别处要用）
  const filteredClusterSections = computed(() =>
    pickCluster(selectedCluster.value, NEED))

  // 系统状态映射
  const SYSTEM_STATUS_MAP = {
    0: '静置状态',
    1: '充电状态', 
    2: '放电状态',
    3: '开路状态',
    4: '接触器自检'
  }

  // 故障等级映射
  const FAULT_LEVEL_MAP = {
    0: '无故障',
    1: '严重故障',
    2: '一般故障', 
    3: '轻微故障'
  }

  const FIELD_ORDER = [
    'AFE 数','电芯数','温感数','系统状态','故障等级',
    '簇电压','预充电压','簇电流',
    '绝缘 R+','绝缘 R-',
    '温度1','温度2','温度3','温度4','温度5',
    '簇SOC','簇SOH','簇SOE',
    '最大允充功率','最大允放功率',
    '单次充电电量','单次放电电量',
    '单次充电容量','单次放电容量'
  ];

  // 单位映射
  const UNIT_MAP = {
    'AFE 数': '',
    '电芯数': '',
    '温感数': '',
    '系统状态': '',
    '故障等级': '',
    '簇电压': 'V',
    '预充电压': 'V',
    '簇电流': 'A',
    '绝缘 R+': 'kΩ',
    '绝缘 R-': 'kΩ',
    '温度1': '°C',
    '温度2': '°C',
    '温度3': '°C',
    '温度4': '°C',
    '温度5': '°C',
    '簇SOC': '%',
    '簇SOH': '%',
    '簇SOE': '%',
    '最大允充功率': 'kW',
    '最大允放功率': 'kW',
    '单次充电电量': 'kWh',
    '单次放电电量': 'kWh',
    '单次充电容量': 'Ah',
    '单次放电容量': 'Ah'
  };

  const flatElems = computed(() => 
    // 每个 block.element 里已经是 {label,value}
    filteredClusterSections.value.flatMap(sec =>
      sec.element.filter(e =>
        ![
          '充电SOP', '放电SOP', '充电SOP标识', '放电SOP标识',
          '充电SOP-X', '充电SOP-Y', '放电SOP-X', '放电SOP-Y'
        ].some(sub => e.label.startsWith(sub))
      )
    )
  );

  const orderedElems = computed(() =>
    FIELD_ORDER.map(fieldLabel => {
      // 尝试多种匹配方式
      let found = flatElems.value.find(e => e.label === fieldLabel);
      
      // 如果直接匹配失败，尝试带单位的匹配
      if (!found) {
        const unit = UNIT_MAP[fieldLabel];
        if (unit) {
          found = flatElems.value.find(e => e.label === `${fieldLabel}(${unit})`);
        }
      }
      
      // 如果还是没找到，返回默认值
      if (!found) {
        return { label: fieldLabel, value: '–' };
      }
      
      // 对系统状态和故障等级进行文本映射
      let displayValue = found.value;
      if (fieldLabel === '系统状态' && SYSTEM_STATUS_MAP[found.value] !== undefined) {
        displayValue = SYSTEM_STATUS_MAP[found.value];
      } else if (fieldLabel === '故障等级' && FAULT_LEVEL_MAP[found.value] !== undefined) {
        displayValue = FAULT_LEVEL_MAP[found.value];
      }
      
      // 返回纯标签名（不带单位），单位会在模板中通过UNIT_MAP添加
      return { label: fieldLabel, value: displayValue };
    })
  );

  /* 注释掉不再使用的kvRow，因为已改用卡片布局 */
  // const kvRow = computed(() => [{
  //   id: 0,            // dataKey 用
  //   elems: orderedElems.value
  // }]);


  //BMU数据
  const NEED_FIELDS = computed(() => {
    if (activeView.value === 'BMU_VOLT') return ['BMU电压'];
    if (activeView.value === 'BMU_TEMP') return ['BMU电路板温度'];
    if (activeView.value === 'BMU_PLUGIN_TEMP') return ['动力接插件温度1','动力接插件温度2'];
    // if (activeView.value === 'BMU_PLUGIN_TEMP2') return ['动力接插件温度2'];
    return [];
  });

  const bmuRows = computed(() => {
    if (!['BMU_VOLT', 'BMU_TEMP', 'BMU_PLUGIN_TEMP'].includes(activeView.value)) {
      return [];
    }
    const secs = pickPack(selectedCluster.value, NEED_FIELDS.value) || []
    // return secs.length ? secs[0].element : [];
    return secs.flatMap(sec => sec.element) 
  });
  </script>

<template>
  <div class="card flex flex-col h-full p-3 gap-1">
    <!-- ▼▼ 簇端信息卡片布局：替换原DataTable ▼▼ -->
    <div class="cluster-info-container">
      <!-- 上方分隔线 -->
      <div class="cluster-divider"></div>
      
      <!-- 第一排卡片 -->
      <div class="cluster-info-row">
        <div v-for="e in orderedElems.slice(0, Math.ceil(orderedElems.length / 2))"
             :key="e.label"
             class="cluster-info-card">
          <div class="cluster-card-label">{{ e.label }}</div>
          <div class="cluster-card-value">{{ e.value }}{{ UNIT_MAP[e.label] }}</div>
        </div>
      </div>
      
      <!-- 中间分隔线 -->
      <div class="cluster-divider"></div>
      
      <!-- 第二排卡片 -->
      <div class="cluster-info-row">
        <div v-for="e in orderedElems.slice(Math.ceil(orderedElems.length / 2))"
             :key="e.label"
             class="cluster-info-card">
          <div class="cluster-card-label">{{ e.label }}</div>
          <div class="cluster-card-value">{{ e.value }}{{ UNIT_MAP[e.label] }}</div>
        </div>
      </div>
      
      <!-- 下方分隔线 -->
      <div class="cluster-divider"></div>
    </div>

    <!-- ▼▼ 数据类型切换按钮 ▼▼ -->
    <div class="flex gap-1">
      <Button v-for="(cfg,key) in DATA_TYPE_MAP"
              :key="key"
              :label="cfg.label"
              :class="{ 'p-button-outlined': activeView !== key }"
              @click="activeView = key" />
    </div>
    
    <!-- ▼▼ BMU 表卡片 ▼▼ -->
    <SystemAbstract v-show="['CELL_VOLT','CELL_TEMP','CELL_SOC','CELL_SOH','BMU_VOLT','BMU_TEMP','BMU_PLUGIN_TEMP'].includes(activeView)"
                    :activeView="activeView"
                    :selectedCluster="selectedCluster" />

    <!-- ▼▼ 单体数据表（唯一保留）▼▼ -->
    <keep-alive>
      <DataTable v-show="['CELL_VOLT','CELL_TEMP','CELL_SOC','CELL_SOH'].includes(activeView)"
                 :key="'cell-table'"
                 :value="matrixRows"
                 scrollable
                 scrollHeight="560px"
                 :virtualScrollerOptions="{ itemSize: 28 }"
                 showGridlines
                 style="width:auto">

        <!-- 冻结 BMU-AFE 列 -->
        <Column frozen header="BMU-AFE" style="width:120px">
          <template #body="{ data }">{{ data.bmuLabel }}</template>
        </Column>

        <!-- 动态 Cell 列 -->
        <Column v-for="col in displayCols"
                :key="col"
                :header="col"
                :field="`cells[${col-1}]`"
                style="width:80px">
          <template #body="{ data }">
            <span>{{ formatCell(data.cells[col-1]) }}</span>
            <template v-if="data.cells[col-1] !== '--'">
              &nbsp;#{{ ((data.rowIdx * cellsPerAfe) + col) }}
            </template>
          </template>
        </Column>
      </DataTable>
    </keep-alive>

    <div v-if="['BMU_VOLT','BMU_TEMP','BMU_PLUGIN_TEMP'].includes(activeView)"
         class="card-grid">
      <div v-for="e in bmuRows"
           :key="e.label"
           class="card">
        <div class="card-label">{{ e.label }}</div>
        <div class="card-value">{{ e.value }}</div>
      </div>
    </div>
  </div>
</template>

  <style scoped>
  .card { 
    /* 使用全局card样式，不覆盖margin-left */
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    /* 保持原有的flex布局 */
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1rem;
    gap: 0.5rem;
  }

  /* ====== 簇端信息卡片网格布局 ====== */
  .cluster-info-container {
    display: flex;
    flex-direction: column;
    gap: 6px; /* 减少容器内各元素间距 */
    padding: 2px 0; /* 进一步减少上下内边距 */
  }

  .cluster-info-row {
    display: grid;
    grid-template-columns: repeat(14, 1fr); /* 固定14列，正好占满整行 */
    gap: 6px; /* 减少卡片间距 */
    justify-content: center; /* 让卡片整体居中 */
    padding-left: 12px; /* 向右移动整体卡片 */
  }

  .cluster-divider {
    height: 1px;
    background-color: #b1bfca; /* 灰色分隔线 */
    margin: 0 8px; /* 减少分隔线左右边距 */
  }

  .cluster-info-card {
    background: white; /* 白色卡片背景 */
    border: 1px solid #92aabb; /* 灰色边框 */
    border-radius: 6px;
    padding: 4px 6px; /* 增加左右内边距，为左对齐文字提供空间 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start; /* 改为左对齐 */
    gap: 2px; /* 进一步减少标签和数值间距 */
    min-height: 35px; /* 进一步减少最小高度让卡片更矮 */
    min-width: 100px; /* 确保卡片有足够宽度 */
  }

  .cluster-card-label {
    font-size: 0.85rem; /* 进一步增大标签字体 */
    color: #51606d; /* 灰色文字 */
    text-align: left; /* 左对齐 */
    line-height: 1.1;
    font-weight: 500;
  }

  .cluster-card-value {
    font-size: 1rem; /* 增大数值字体 */
    font-weight: 600;
    color: #181b1e; /* 灰色数值 */
    text-align: left; /* 左对齐 */
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  /* 改善DataTable滚动体验 */
  :deep(.p-datatable-wrapper) {
    overflow-x: auto;
    overflow-y: hidden;
  }

  :deep(.p-datatable-table) {
    min-width: max-content;
  }

  :deep(.p-datatable-scrollable-header) {
    overflow: hidden;
  }

  :deep(.p-datatable-scrollable-body) {
    overflow: hidden;
  }
  
  /* ====== 卡片网格容器 ====== */
  .card-grid{
      display: grid;                            /* 启用 CSS Grid 布局（自动排成行列） */
      grid-template-columns: repeat(            /* 定义列宽与列数 */
          auto-fill,                            /* 自动填充：一行能塞多少列就塞多少列 */
          minmax(75px, 1fr)                    /* 每列最小 100px，最大占 1fr（平均分）*/
      );
      gap: 30px;                              /* 网格之间的水平 + 垂直间距（总槽距） */
      grid-auto-flow: dense;                    /* 开启"密集模式" → 小卡片会去填空洞 */
      padding-left: 20px;
  }

  /* ====== 单张卡片主体 ====== */
  .card-grid .card{
      min-width: 80px;                          /* 卡片最窄物理宽度；列宽 < 80px 就会换行 */
      background: #f8f9fa;                      /* 卡片背景色（浅灰可区块化） */
      border: 1px solid #ebeef4;                /* 1 像素细边；改粗细或改色都在这里 */
      border-radius: 6px;                       /* 圆角半径；0 = 方角，>8px = 更圆 */
      padding: .5rem .3rem;                     /* 内边距：上下 8px，左右 5px（.5rem≈8px） */
      display: flex;                            /* 启用 Flex → 纵向排列文字 */
      flex-direction: column;                   /* column = 上下垂直堆叠 label 和 value */
      justify-content: center;                  /* 让两行文字在卡片内部垂直居中 */
      gap: .2rem;                               /* label 与 value 的间距（≈3px） */
  }
  .card-grid .card:hover{ background:#eef1f4; }            /* 悬浮时背景稍变，鼠标指针反馈 */

  /* ====== 文本层级 ====== */
  .card-label{
      font-size: .95rem;                        /* 字号 ~15px；改小更紧凑，改大更醒目 */
      color: #5f6368;                           /* 标签文字颜色（次要灰） */
      line-height: 1.2;                         /* 行高；<=1.2 能缩小卡片高度 */
  }
  .card-value{
      font-size: 1.2rem;                        /* 数值字号 ~19px；决定卡片高度主要因素 */
      font-weight: 600;                         /* 半粗体，更突出主数值 */
      font-variant-numeric: tabular-nums;       /* 数字等宽对齐，便于比对 */
      color: #111;                              /* 数值颜色；可改为彩色高亮或告警色 */
  }
</style>