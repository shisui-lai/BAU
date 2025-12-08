<template>
  <div class="summary-label-card">
    <div class="text-xs opacity-60 truncate">{{ label }}</div>
    <div class="text-xl font-semibold">
      <span>{{ value }}</span>
      <span v-if="unit" class="unit">{{ unit }}</span>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' }
})
</script>

<style scoped>
.summary-label-card {
  width: 9rem;
  height: fit-content;
  min-height: 2.9rem;
  text-align: left;
  display: inline-block;
  position: relative;
  padding: 0rem 0.2rem;
  border-radius: 3px;
  border: 1.4px solid #b9c1c6db;
  box-sizing: border-box;
  overflow: hidden;
  background: var(--surface-card);
}
.text-xs { font-size: 12px; }
.text-xl { font-size: 16px; }
.font-semibold { font-weight: 600; }
.summary-label-card .text-xs {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color-secondary);
}
.summary-label-card .text-xl { color: var(--text-color); line-height: 1.2; letter-spacing: -0.02em; }
.unit { margin-left: 4px; font-size: 12px; color: var(--text-color-secondary); }
</style>
