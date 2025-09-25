<script setup>
import { ref, onBeforeMount, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLayout } from '@/layout/composables/layout'

const route = useRoute()

const { layoutConfig, layoutState, setActiveMenuItem, onMenuToggle } = useLayout()

const props = defineProps({
  item: {
    type: Object,
    default: () => ({})
  },
  index: {
    type: Number,
    default: 0
  },
  root: {
    type: Boolean,
    default: true
  },
  parentItemKey: {
    type: String,
    default: null
  }
})

const itemKey = ref(null)
const isExpanded = ref(true) // 添加展开状态

onBeforeMount(() => {
  itemKey.value = props.parentItemKey
    ? props.parentItemKey + '-' + props.index
    : String(props.index)
})

// 递归判断当前菜单项或其子项是否匹配当前路由
function hasActiveRoute(item) {
  if (item.to && route.path === item.to) return true
  if (item.items && Array.isArray(item.items)) {
    return item.items.some((child) => hasActiveRoute(child))
  }
  return false
}

const isActiveMenu = computed(() => {
  return hasActiveRoute(props.item)
})

// 切换展开/折叠状态
const toggleExpanded = (event) => {
  if (props.item.items && props.item.items.length > 0) {
    isExpanded.value = !isExpanded.value
    event.preventDefault()
    event.stopPropagation()
  }
}

const itemClick = (event, item) => {
  if (item.disabled) {
    event.preventDefault()
    return
  }

  const { overlayMenuActive, staticMenuMobileActive } = layoutState

  if ((item.to || item.url) && (staticMenuMobileActive.value || overlayMenuActive.value)) {
    onMenuToggle()
  }

  if (item.command) {
    item.command({ originalEvent: event, item: item })
  }

  const foundItemKey = item.items
    ? isActiveMenu.value
      ? props.parentItemKey
      : itemKey
    : itemKey.value

  setActiveMenuItem(foundItemKey)
}

const checkActiveRoute = (item) => {
  return route.path === item.to
}
</script>

<template>
  <li :class="{ 'layout-root-menuitem': root, 'active-menuitem': isActiveMenu }">
    <div v-if="root && item.visible !== false" class="layout-menuitem-root-text">
      <i v-if="item.icon" :class="item.icon"></i>
      <span style="margin-left: 0.5rem">{{ item.label }}</span>
      <i
        v-if="item.items && item.items.length > 0"
        :class="['pi pi-fw layout-submenu-toggler', isExpanded ? 'pi-angle-up' : 'pi-angle-down']"
        @click="toggleExpanded"
        style="margin-left: auto; cursor: pointer"
      ></i>
    </div>
    <a
      v-if="(!item.to || item.items) && item.visible !== false"
      :href="item.url"
      @click="itemClick($event, item, index)"
      :class="item.class"
      :target="item.target"
      tabindex="0"
    >
      <i :class="item.icon" class="layout-menuitem-icon"></i>
      <span class="layout-menuitem-text">{{ item.label }}</span>
      <i
        v-if="item.items && item.items.length > 0"
        :class="['pi pi-fw layout-submenu-toggler', isExpanded ? 'pi-angle-up' : 'pi-angle-down']"
        @click="toggleExpanded"
        style="cursor: pointer"
      ></i>
    </a>
    <router-link
      v-if="item.to && !item.items && item.visible !== false"
      @click="itemClick($event, item, index)"
      :class="[item.class, { 'active-route': checkActiveRoute(item) }]"
      tabindex="0"
      :to="item.to"
    >
      <i :class="item.icon" class="layout-menuitem-icon"></i>
      <span class="layout-menuitem-text">{{ item.label }}</span>
    </router-link>
    <Transition v-if="item.items && item.visible !== false" name="layout-submenu">
      <ul v-show="root ? isExpanded : isActiveMenu" class="layout-submenu">
        <app-menu-item
          v-for="(child, i) in item.items"
          :key="child"
          :index="i"
          :item="child"
          :parentItemKey="itemKey"
          :root="false"
        ></app-menu-item>
      </ul>
    </Transition>
  </li>
</template>

<style lang="scss" scoped>
.layout-menuitem-root-text {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .layout-submenu-toggler {
    transition: transform 0.3s ease;
    font-size: 0.875rem;

    &:hover {
      color: var(--primary-color);
    }
  }
}

.layout-submenu {
  transition: all 0.3s ease;
  overflow: hidden;
}

.layout-submenu-enter-active,
.layout-submenu-leave-active {
  transition: all 0.3s ease;
}

.layout-submenu-enter-from,
.layout-submenu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
