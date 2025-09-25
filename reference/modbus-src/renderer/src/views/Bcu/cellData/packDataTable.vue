<!-- packDataTable.vue 子组件 -->
<script setup>
defineProps({
  data: Object
})
</script>

<template>
  <DataTable :value="[data]">
    <Column>
      <template #body="{ data }">
        <div class="classification">
          <b>{{ data.classification }}</b>
        </div>
        <div class="property-row">
          <div v-for="item in data.element" :key="item.id" class="property-item">
            <div class="value">
              <div class="label">{{ item.label }}</div>
              <div class="value-content">{{ item.value }}</div>
            </div>
          </div>
        </div>
      </template>
    </Column>
  </DataTable>
</template>
