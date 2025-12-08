<template>
  <div class="summary-grid" :style="gridStyle">
    <SummaryLabelCard v-for="(it, i) in items" :key="i" :label="it.label" :value="it.value" :unit="it.unit" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { defineProps } from 'vue'
import SummaryLabelCard from './SummaryLabelCard.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  columns: { type: Number, default: 8 }
})

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
  gap: '8px 12px'
}))
</script>

<style scoped>
.summary-grid { width: 100%; }
@media (max-width: 1200px) { .summary-grid { grid-template-columns: repeat(6, 1fr) !important; } }
@media (max-width: 960px)  { .summary-grid { grid-template-columns: repeat(4, 1fr) !important; } }
@media (max-width: 640px)  { .summary-grid { grid-template-columns: repeat(2, 1fr) !important; } }
</style>
