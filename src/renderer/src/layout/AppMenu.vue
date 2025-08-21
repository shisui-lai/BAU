<!-- 电池管理系统菜单栏 - 统一的菜单结构 -->
<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 统一的菜单项结构，包含可折叠和不可折叠的项
const menuItems = ref([

  
  // 可折叠的分组项
  {
    label: '运行信息',
    icon: 'pi pi-chart-line',
    expanded: false,
    type: 'group', // 分组项，可折叠
    items: [
      { label: '电池信息', icon: 'pi pi-home', route: '/' },
      { label: '簇版本信息', icon: 'pi pi-info-circle', route: '/Cluster/version' },
      { label: '掉线信息', icon: 'pi pi-link', route: '/Cluster/Brokenwire' },
      { label: '故障总览', icon: 'pi pi-eye', route: '/FaultOverview' }
    ]
  },
  {
    label: '系统配置',
    icon: 'pi pi-cog',
    expanded: false,
    type: 'group',
    items: [
      { label: '簇配置参数', icon: 'pi pi-sliders-h', route: '/Cluster/BaseParam' },
      { label: '簇报警阈值', icon: 'pi pi-bell', route: '/Cluster/AlarmThreshold' },
      { label: '堆报警阈值', icon: 'pi pi-bell', route: '/Block/BlockAlarmThreshold' },
      { label: 'SOX参数', icon: 'pi pi-chart-line', route: '/Cluster/SOXParam' }
    ]
  },
  {
    label: '控制功能',
    icon: 'pi pi-play',
    expanded: false,
    type: 'group',
    items: [
      { label: '指令下发', icon: 'pi pi-send', route: '/Cluster/Order' }
    ]
  },
  {
    label: '堆汇总信息',
    icon: 'pi pi-server',
    expanded: false,
    type: 'group',
    items: [
      { label: '堆信息', icon: 'pi pi-chart-bar', route: '/Block/BlockInfo' },
      { label: '堆版本信息', icon: 'pi pi-info-circle', route: '/Block/BlockVersion' },
      { label: '堆IO状态', icon: 'pi pi-server', route: '/Block/BlockIO' },
      { label: '堆配置参数', icon: 'pi pi-cog', route: '/Block/BlockConfigParam' },
      { label: '堆命令下设', icon: 'pi pi-send', route: '/Block/BlockRemoteCommand' }
    ]
  },
    // 不可折叠的独立项
    { 
    label: '告警信息', 
    icon: 'pi pi-exclamation-triangle',
    route: '/Cluster/Fault',
    type: 'single'
    },
    { 
    label: '设备管理', 
    icon: 'pi pi-wrench', 
    route: '/Block/DeviceManagement',
    type: 'single' // 单独项，不可折叠
  },
])

// 处理菜单项点击
const handleMenuClick = (item, index) => {
  if (item.type === 'single') {
    // 单独项直接导航
    router.push(item.route)
  } else if (item.type === 'group') {
    // 分组项切换展开状态
    menuItems.value[index].expanded = !menuItems.value[index].expanded
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

    <!-- 公司链接 -->
    <div class="company-link">
      <a href="https://risenstorage.com/" target="_blank">
        <i class="pi pi-external-link"></i>
        <span>东方日升储能</span>
      </a>
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
  background: transparent; // 与整体容器一致的背景
  overflow-x: hidden; // 防止内部元素横向溢出造成滚动条
  
  // 菜单列表滚动容器（只让菜单滚动）
  .menu-list-scroll {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: none;      // Firefox
    -ms-overflow-style: none;   // IE/Edge Legacy
  }
  .menu-list-scroll::-webkit-scrollbar { width: 0; height: 0; }

  // 菜单列表内容
  .menu-list {
    flex: 1;
    padding: 0.5rem 0; // 去掉左右内边距，让菜单项能够更宽
    
    .menu-group {
      margin-bottom: 0; // 去掉间距，让菜单更紧凑
      
      // 菜单项标题（包括单独项和分组标题）
      .menu-header {
        display: flex;
        align-items: center;
        padding: 0.75rem 0.5rem;  // 减少左右内边距，让文字有更多空间
        cursor: pointer;
        transition: background-color 0.15s ease, color 0.15s ease;
        color: var(--text-color, #495057);
        font-size: 0.95rem;  
        font-weight: 500;
        border-radius: 6px;
        position: relative;
        outline: 0 none;
        width: 75%; // 占用侧边栏75%的宽度
        margin: 0 auto; // 居中显示
        min-width: 110px; // 确保最小宽度
        
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
          font-size: 1.05rem; 
          width: 1rem;
          text-align: center;
          flex-shrink: 0; // 防止图标被压缩
        }
        
        .menu-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap; // 确保标签文字不换行
          min-width: 0; // 允许flex子项缩小
        }
        
        .expand-icon {
          font-size: 0.75rem;  // 75%的字体大小，与原有设计一致
          margin-left: auto;
          transition: transform 0.15s ease;
          flex-shrink: 0; // 防止展开图标被压缩
          width: 0.75rem; // 固定宽度
          
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
          padding: 0.75rem 0.5rem 0.75rem 1rem; // 左缩进表示层级关系，减少内边距
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
          color: var(--text-color, #495057);
          font-size: 0.95rem;  
          border-radius: 6px;
          outline: 0 none;
          width: 75%; // 占用侧边栏75%的宽度
          margin: 0 auto; // 居中显示
          min-width: 110px; // 确保最小宽度
          
          &:hover {
            background-color: var(--surface-hover, #e9ecef);
          }
          
          &.active {
            background-color: var(--primary-color, #007ad9);
            color: #ffffff;
            font-weight: 700;
          }
          
          .menu-icon {
            margin-right: 0.5rem;  // 与原有菜单一致的图标边距
            font-size: 1.05rem;  // 稍微放大图标
            width: 1rem;
            text-align: center;
            flex-shrink: 0; // 防止图标被压缩
          }
          
          .menu-label {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap; // 确保标签文字不换行
            min-width: 0; // 允许flex子项缩小
          }
        }
      }
    }
  }
  
  // 顶部品牌标识（方案A样式：无卡片，仅分隔线与居中内容）
  .brand-header {
    padding: 0.9rem 0 0.8rem 0;
    border-bottom: 1px solid var(--surface-border, #dee2e6);

    .brand-inline {
      width: 100%;
      min-width: 110px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center; // 内容居中，左右留白对称
      gap: 0.4rem; // 保持图标与文字间距
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

  // 公司链接样式
  .company-link {
    margin-top: auto;
    padding: 1rem 0; // 去掉左右内边距，与菜单项保持一致
    border-top: 1px solid var(--surface-border, #dee2e6);
    
    a {
      display: flex;
      align-items: center;
      justify-content: center; // 居中内容，视觉更对称
      color: var(--text-color-secondary, #6c757d);
      text-decoration: none;
      font-size: 0.8rem;  // 略大
      padding: 0.5rem;
      transition: color 0.15s ease;
      width: 75%; // 与菜单项保持一致的宽度
      margin: 0 auto; // 居中显示
      min-width: 110px; // 确保最小宽度
      border-radius: 6px;
      
      &:hover {
        color: var(--primary-color, #007ad9);
        background-color: var(--surface-hover, #e9ecef);
      }
      
      i {
        margin-right: 0.75rem; // 增加图标与文字间距，让文字略向右移
        font-size: 0.75rem;
        flex-shrink: 0;
      }
      
      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }
    }
  }
}
</style>