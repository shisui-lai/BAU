<!-- 电池管理系统菜单栏 - 带权限控制 -->
<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const userMenu = ref(null)

// 根据 role.value 值映射一个 key 用于比对
// role=1 时 key='admin'；role=2 时 key='guest'
const roleKey = computed(() => (authStore.isAdmin ? 'admin' : 'guest'))

// 用户菜单项
const userMenuItems = computed(() => [
  {
    label: authStore.isAdmin ? t('menu.admin') : t('menu.guest'),
    icon: 'pi pi-user',
    items: [
      {
        label: t('menu.logout'),
        icon: 'pi pi-sign-out',
        command: () => onLogout()
      }
    ]
  }
])

// 统一的菜单项结构，包含可折叠和不可折叠的项，并添加角色控制
const rawMenuItems = ref([
  // 可折叠的分组项
  {
    labelKey: 'menu.operationInfo',
    icon: 'pi pi-chart-line',
    expanded: false,
    type: 'group',
    roles: ['admin', 'guest'], // 管理员和访客都能看
    items: [
      { labelKey: 'menu.batteryInfo', icon: 'pi pi-home', route: '/', roles: ['admin', 'guest'] },
      { labelKey: 'menu.clusterVersion', icon: 'pi pi-info-circle', route: '/Cluster/version', roles: ['admin', 'guest'] },
      { labelKey: 'menu.disconnection', icon: 'pi pi-link', route: '/Cluster/Brokenwire', roles: ['admin', 'guest'] },
      { labelKey: 'menu.faultOverview', icon: 'pi pi-eye', route: '/FaultOverview', roles: ['admin', 'guest'] },
      { labelKey: 'menu.didoStatus', icon: 'pi pi-th-large', route: '/Cluster/DiDoStatus', roles: ['admin', 'guest'] }
    ]
  },
  {
    labelKey: 'menu.systemConfig',
    icon: 'pi pi-cog',
    expanded: false,
    type: 'group',
    roles: ['admin'], // 仅管理员能看
    items: [
      { labelKey: 'menu.clusterConfigParam', icon: 'pi pi-sliders-h', route: '/Cluster/BaseParam', roles: ['admin'] },
      { labelKey: 'menu.clusterAlarmThreshold', icon: 'pi pi-bell', route: '/Cluster/AlarmThreshold', roles: ['admin'] },
      { labelKey: 'menu.soxParam', icon: 'pi pi-chart-line', route: '/Cluster/SOXParam', roles: ['admin'] },
      { labelKey: 'menu.analogCalibration', icon: 'pi pi-wrench', route: '/Cluster/IvCalibration', roles: ['admin'] }
    ]
  },
  {
    labelKey: 'menu.controlFunction',
    icon: 'pi pi-play',
    expanded: false,
    type: 'group',
    roles: ['admin'], // 仅管理员能看
    items: [
      { labelKey: 'menu.commandIssue', icon: 'pi pi-send', route: '/Cluster/Order', roles: ['admin'] },
      { labelKey: 'menu.deviceUpgrade', icon: 'pi pi-download', route: '/Bau/upgrade', roles: ['admin'] },
      { labelKey: 'menu.addressAdaptive', icon: 'pi pi-sitemap', route: '/Bau/address-adaptive', roles: ['admin'] }
    ]
  },
  {
    labelKey: 'menu.blockSummary',
    icon: 'pi pi-server',
    expanded: false,
    type: 'group',
    roles: ['admin', 'guest'], // 部分子项所有人可见
    items: [
      { labelKey: 'menu.blockInfo', icon: 'pi pi-chart-bar', route: '/Block/BlockInfo', roles: ['admin', 'guest'] },
      { labelKey: 'menu.blockVersion', icon: 'pi pi-info-circle', route: '/Block/BlockVersion', roles: ['admin', 'guest'] },
      { labelKey: 'menu.blockAlarmThreshold', icon: 'pi pi-bell', route: '/Block/BlockAlarmThreshold', roles: ['admin'] },
      { labelKey: 'menu.blockIOStatus', icon: 'pi pi-server', route: '/Block/BlockIO', roles: ['admin', 'guest'] },
      { labelKey: 'menu.blockConfigParam', icon: 'pi pi-cog', route: '/Block/BlockConfigParam', roles: ['admin'] },
      { labelKey: 'menu.blockRemoteCommand', icon: 'pi pi-send', route: '/Block/BlockRemoteCommand', roles: ['admin'] }
    ]
  },
  // 不可折叠的独立项
  {
    labelKey: 'menu.alarmInfo',
    icon: 'pi pi-exclamation-triangle',
    route: '/Cluster/Fault',
    type: 'single',
    roles: ['admin', 'guest']
  },
  {
    labelKey: 'menu.bauAddressDetection',
    icon: 'pi pi-search',
    route: '/Device/BauAddressDetection',
    type: 'single',
    roles: ['admin']
  },
  {
    labelKey: 'menu.deviceManagement',
    icon: 'pi pi-wrench',
    route: '/Block/DeviceManagement',
    type: 'single',
    roles: ['admin']
  }
])

// 根据角色过滤菜单项并翻译
const menuItems = computed(() => {
  return rawMenuItems.value
    .filter(item => item.roles.includes(roleKey.value))
    .map(item => {
      if (item.type === 'group' && item.items) {
        // 过滤并翻译子项
        const translatedItems = item.items
          .filter(subItem => subItem.roles.includes(roleKey.value))
          .map(subItem => ({
            ...subItem,
            label: t(subItem.labelKey)
          }))
        return {
          ...item,
          label: t(item.labelKey),
          items: translatedItems
        }
      }
      return {
        ...item,
        label: t(item.labelKey)
      }
    })
    .filter(item => {
      // 如果是分组且没有子项，则不显示
      if (item.type === 'group' && (!item.items || item.items.length === 0)) {
        return false
      }
      return true
    })
})

// 处理菜单项点击
const handleMenuClick = (item, index) => {
  if (item.type === 'single') {
    // 单独项直接导航
    router.push(item.route)
  } else if (item.type === 'group') {
    // 分组项切换展开状态 - 需要找到原始菜单中对应的项
    const originalItem = rawMenuItems.value.find(raw => raw.labelKey === item.labelKey)
    if (originalItem) {
      originalItem.expanded = !originalItem.expanded
    }
  }
}

// 导航到指定路由
const navigateTo = (route) => {
  router.push(route)
}

// 检查路由是否激活
const isRouteActive = (targetRoute) => {
  return route.path === targetRoute
}

// 检查分组是否包含激活路由
const hasActiveRoute = (items) => {
  return items && items.some(item => isRouteActive(item.route))
}

// 点击"注销"时，把状态清掉并跳到登录页
function onLogout() {
  authStore.logout()
  router.replace({ name: 'Login' })
}
</script>

<template>
  <div class="layout-menu">
    <!-- 顶部品牌标识固定，不参与滚动 -->
    <div class="brand-header">
      <div class="brand-inline" title="RISEN_BMS">
        <img src="../../images/icon.ico" alt="公司Logo" class="brand-image" />
        <span class="brand-text">RISEN_BMS</span>
      </div>
    </div>

    <!-- 仅菜单项区域可滚动，且隐藏滚动条 -->
    <div class="menu-list-scroll">
      <div class="menu-list">
        <div 
          v-for="(item, index) in menuItems" 
          :key="item.label"
          class="menu-group"
        >
          <!-- 菜单项（单独项或分组标题） -->
          <div 
            class="menu-header"
            :class="{ 
              active: item.type === 'single' && isRouteActive(item.route),
              expanded: item.type === 'group' && item.expanded,
              'has-active': item.type === 'group' && hasActiveRoute(item.items)
            }"
            @click="handleMenuClick(item, index)"
          >
            <i :class="item.icon" class="menu-icon"></i>
            <span class="menu-label">{{ item.label }}</span>
            <i 
              v-if="item.type === 'group'" 
              class="pi pi-chevron-right expand-icon" 
              :class="{ expanded: item.expanded }"
            ></i>
          </div>

          <!-- 分组子项（仅对group类型显示） -->
          <div 
            v-if="item.type === 'group'"
            class="group-content"
            :class="{ expanded: item.expanded }"
          >
            <div 
              v-for="subItem in item.items" 
              :key="subItem.route"
              class="menu-item sub-item"
              :class="{ active: isRouteActive(subItem.route) }"
              @click="navigateTo(subItem.route)"
            >
              <i :class="subItem.icon" class="menu-icon"></i>
              <span class="menu-label">{{ subItem.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部用户菜单 -->
    <div class="menu-footer">
      <Avatar
        style="cursor: pointer"
        size="large"
        shape="circle"
        icon="pi pi-user"
        @click="userMenu.toggle($event)"
      />
      <Menu ref="userMenu" :model="userMenuItems" popup />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-menu {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--text-color, #495057);
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  background: transparent;
  overflow-x: hidden;
  
  // 菜单列表滚动容器（只让菜单滚动，完全隐藏滚动条）
  .menu-list-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      width: 0;
      height: 0;
      background: transparent;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
    }
  }

  // 菜单列表内容
  .menu-list {
    flex: 1;
    padding: 0.5rem 0.5rem;
    
    .menu-group {
      margin-bottom: 0.5rem;
      
      // 菜单项标题（包括单独项和分组标题）
      .menu-header {
        display: flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        transition: background-color 0.15s ease, color 0.15s ease;
        color: var(--text-color, #495057);
        font-size: 1rem;  
        font-weight: 500;
        border-radius: 6px;
        position: relative;
        outline: 0 none;
        width: 100%;
        margin: 0;
        min-width: 120px;
        
        &:hover {
          background-color: var(--surface-hover, #e9ecef);
          color: var(--primary-color, #007ad9);
        }
        
        &.active {
          background-color: var(--primary-color, #007ad9);
          color: #ffffff;
          font-weight: 700;
        }
        
        &.expanded {
          color: var(--primary-color, #007ad9);
        }
        
        &.has-active {
          font-weight: 700;
          color: var(--primary-color, #007ad9);
        }
        
        .menu-icon {
          margin-right: 0.5rem;  
          font-size: 1rem; 
          width: 1rem;
          text-align: center;
          flex-shrink: 0;
        }
        
        .menu-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        
        .expand-icon {
          font-size: 0.75rem;
          margin-left: auto;
          transition: transform 0.15s ease;
          flex-shrink: 0;
          width: 0.75rem;
          
          &.expanded {
            transform: rotate(90deg);
          }
        }
      }
      
      // 分组内容
      .group-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.15s ease;
        
        &.expanded {
          max-height: 300px; 
        }
        
        .menu-item.sub-item {
          display: flex;
          align-items: center;
          padding: 0.4rem 0.75rem 0.4rem 1.2rem;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
          color: var(--text-color, #495057);
          font-size: 0.95rem;  
          border-radius: 6px;
          outline: 0 none;
          width: 100%;
          margin: 0;
          min-width: 120px;
          
          &:hover {
            background-color: var(--surface-hover, #e9ecef);
          }
          
          &.active {
            background-color: var(--primary-color, #007ad9);
            color: #ffffff;
            font-weight: 700;
          }
          
          .menu-icon {
            margin-right: 0.5rem;
            font-size: 0.95rem;
            width: 0.9rem;
            text-align: center;
            flex-shrink: 0;
          }
          
          .menu-label {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
          }
        }
      }
    }
  }
  
  // 顶部品牌标识
  .brand-header {
    padding: 0.9rem 0 0.8rem 0;
    border-bottom: 1px solid var(--surface-border, #dee2e6);

    .brand-inline {
      width: 100%;
      min-width: 110px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0 0.75rem;
      box-sizing: border-box;

      .brand-text {
        white-space: nowrap;
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--text-color, #495057);
      }

      .brand-image {
        width: 22px;
        height: 22px;
        display: block;
        object-fit: contain;
      }
    }
  }

  // 底部用户菜单
  .menu-footer {
    margin-top: auto;
    padding: 1rem 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-top: 1px solid var(--surface-border, #dee2e6);
  }
}
</style>

