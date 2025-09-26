<script setup>
  // import { useClusterListener } from '@/composables/useClusterListener.js'
  // import { usePackListener } from '@/composables/usePackListener.js'
  // import { IOListener  } from '@/composables/IOListener.js'
  // import { FaultListener  } from '@/composables/FaultListener.js'
  // import { Listener } from '@/composables/Listener'
  // Listener()  

  // useClusterListener()
  // usePackListener()  
  // IOListener()
  // FaultListener()
  // import { useCentralBus } from '@/composables/useCentralBus'

  // useCentralBus()  

</script>

<template>
  <router-view />
  <!-- Toast组件已移至AppLayout.vue，避免双Toast问题 -->
  <ConfirmDialog />
</template>

<style scoped></style>



