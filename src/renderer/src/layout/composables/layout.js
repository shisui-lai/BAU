import { toRefs, reactive, computed } from 'vue'

const layoutConfig = reactive({
  ripple: true,
  darkTheme: false,
  inputStyle: 'outlined',
  menuMode: 'static',
  theme: 'aura-light-purple',
  scale: 12,
  activeMenuItem: null
})

const layoutState = reactive({
  staticMenuDesktopInactive: false,
  overlayMenuActive: false,
  profileSidebarVisible: false,
  configSidebarVisible: false,
  staticMenuMobileActive: false,
  menuHoverActive: false
})

export function useLayout() {
  const setScale = (scale) => {
    layoutConfig.scale = scale
  }

  const setActiveMenuItem = (item) => {
    layoutConfig.activeMenuItem = item.value || item
  }

  const onMenuToggle = () => {
    if (layoutConfig.menuMode === 'overlay') {
      layoutState.overlayMenuActive = !layoutState.overlayMenuActive
    }

    if (window.innerWidth > 991) {
      layoutState.staticMenuDesktopInactive = !layoutState.staticMenuDesktopInactive
    } else {
      layoutState.staticMenuMobileActive = !layoutState.staticMenuMobileActive
    }
  }

  const onTopBarMenuButton = () => {
    // 切换移动端顶部菜单的显示状态
    layoutState.profileSidebarVisible = !layoutState.profileSidebarVisible
    console.log('顶部菜单按钮被点击，当前状态:', layoutState.profileSidebarVisible)
  }

  const isSidebarActive = computed(
    () => layoutState.overlayMenuActive || layoutState.staticMenuMobileActive
  )

  const isDarkTheme = computed(() => layoutConfig.darkTheme)

  return {
    layoutConfig: toRefs(layoutConfig),
    layoutState: toRefs(layoutState),
    setScale,
    onMenuToggle,
    onTopBarMenuButton,
    isSidebarActive,
    isDarkTheme,
    setActiveMenuItem
  }
}
