//子组件batteryDataTable.vue
<script setup>
import { computed } from 'vue'
const props = defineProps({
  data: {
    type: Array,
    default: () => [],
    validator: (value) => value.every((item) => item?.cells)
  },
  columns: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  expandedRows: {
    type: Set,
    default: () => new Set()
  }
})

// 修复空状态检测
const hasData = computed(() => {
  return (
    props.data &&
    props.data.length > 0 &&
    props.data.some((item) => item?.cells?.length > 0 && Object.values(item).some((v) => v !== ''))
  )
})
</script>

<template>
  <div v-if="hasData">
    <ButtonGroup>
      <Button label="展开" @click="$emit('expand-all')" />
      <Button label="折叠" @click="$emit('collapse-all')" />
      <Button :label="title" />
    </ButtonGroup>

    <DataTable :value="data" :expandedRows="expandedRows" dataKey="id">
      <!-- 列配置保持不变 -->
    </DataTable>
  </div>
  <div v-else class="no-data">{{ title }} 数据暂未更新</div>
</template>

<style>
.no-data {
  padding: 1rem;
  text-align: center;
  color: #666;
}
</style>
