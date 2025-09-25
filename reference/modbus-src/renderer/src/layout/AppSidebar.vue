<script setup>
import AppMenu from './AppMenu.vue'
import { useLayout } from '@/layout/composables/layout'
const { onMenuToggle, isMenuCollapsed } = useLayout()
</script>

<template>
  <app-menu />
  <!--  <div class="layout-sidebar1">
    <app-menu />
    <button
      class="toggle-button"
      :class="{ collapsed: isMenuCollapsed }"
      @click="onMenuToggle"
      aria-label="Toggle Menu"
    ></button>
  </div> -->
</template>

<style lang="scss" scoped>
.layout-sidebar1 {
  position: relative;
  overflow: visible;
}
/* Toggle Triangle Button */
.toggle-button {
  position: absolute;
  top: 50%;
  right: -12px;
  transform: translateY(-50%) rotate(0deg);
  width: 0;
  height: 0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-left: 10px solid var(--text-color);
  background: none;
  cursor: pointer;
  transition: transform 0.3s;
  padding: 0;
  z-index: 1000;
}

/* Collapsed state: triangle points right */
.toggle-button.collapsed {
  border-left: none;
  border-right: 10px solid var(--text-color);
}
</style>
