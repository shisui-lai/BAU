<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
const { t, locale, te } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore'
import { storeToRefs } from 'pinia'
const ipStore = useIpStore()
const { connectedIps, selectedIp } = storeToRefs(ipStore)
const ipOptions = computed(() =>
  connectedIps.value.map((ip, index) => {
    const bcuLabel = `BCU${index + 1}` // 根据索引生成 BCU 标识
    return { label: `${bcuLabel} (${ip})`, value: ip }
  })
)
watch(
  () => connectedIps,
  (newIps) => {
    ipStore.smartSelectIp()
  },
  { deep: true }
)
</script>

<template>
  <div>
    <Dropdown
      v-model="selectedIp"
      :options="ipOptions"
      optionLabel="label"
      optionValue="value"
      :placeholder="t('topBar.selectIp')"
    />
  </div>
</template>
