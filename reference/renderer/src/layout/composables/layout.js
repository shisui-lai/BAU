import { toRefs, reactive, computed } from 'vue'

// 从 Electron Store 读取保存的配置
const getSavedConfig = async () => {
  try {
    if (window.electronAPI?.layoutConfig?.get) {
      // 打包后使用 Electron Store
      return await window.electronAPI.layoutConfig.get()
    } else {
      // 开发环境或降级方案使用 localStorage
      const saved = localStorage.getItem('app-layout-config')
      return saved ? JSON.parse(saved) : {}
    }
  } catch (error) {
    console.error('Failed to load layout config:', error)
    return {}
  }
}

// 默认配置
const defaultConfig = {
  ripple: true,
  darkTheme: true,
  inputStyle: 'outlined',
  menuMode: 'static',
  theme: 'lara-dark-cyan',
  scale: 10,
  activeMenuItem: null
}

// layoutConfig 初始化为默认配置，异步加载保存的配置
const layoutConfig = reactive({
  ...defaultConfig,
  activeMenuItem: null
})

// 异步加载配置
getSavedConfig().then(savedConfig => {
  if (savedConfig && Object.keys(savedConfig).length > 0) {
    Object.assign(layoutConfig, savedConfig, { activeMenuItem: null })
  }
})

const layoutState = reactive({
  staticMenuDesktopInactive: false,
  overlayMenuActive: false,
  profileSidebarVisible: false,
  configSidebarVisible: false,
  staticMenuMobileActive: false,
  menuHoverActive: false
})

// 保存配置到 Electron Store 或 localStorage
const saveConfig = async () => {
  try {
    const configToSave = {
      ripple: layoutConfig.ripple,
      darkTheme: layoutConfig.darkTheme,
      inputStyle: layoutConfig.inputStyle,
      menuMode: layoutConfig.menuMode,
      theme: layoutConfig.theme,
      scale: layoutConfig.scale
    }
    
    if (window.electronAPI?.layoutConfig?.set) {
      // 打包后使用 Electron Store
      await window.electronAPI.layoutConfig.set(configToSave)
    } else {
      // 开发环境或降级方案使用 localStorage
      localStorage.setItem('app-layout-config', JSON.stringify(configToSave))
    }
  } catch (error) {
    console.error('Failed to save layout config:', error)
  }
}

export function useLayout() {
  const setScale = (scale) => {
    layoutConfig.scale = scale
    saveConfig()
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

  const isSidebarActive = computed(
    () => layoutState.overlayMenuActive || layoutState.staticMenuMobileActive
  )

  const isDarkTheme = computed(() => layoutConfig.darkTheme)
  // 菜单是否折叠（桌面静态模式下）
  const isMenuCollapsed = computed(() => layoutState.staticMenuDesktopInactive)
  return {
    layoutConfig: toRefs(layoutConfig),
    layoutState: toRefs(layoutState),
    setScale,
    onMenuToggle,
    isSidebarActive,
    isDarkTheme,
    setActiveMenuItem,
    isMenuCollapsed,
    saveConfig
  }
}
