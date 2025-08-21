// 页面类型自动检测 - 根据路由自动判断页面类型并设置簇选择器显示状态
import { watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useClusterStore } from '@/stores/device/clusterStore'
import { useBlockStore } from '@/stores/device/blockStore'

/**
 * 页面类型检测composable
 * 根据当前路由自动设置页面类型，控制导航栏选择器的显示
 */
export function usePageTypeDetection() {
  const route = useRoute()
  const clusterStore = useClusterStore()
  const blockStore = useBlockStore()
  
  // 页面类型映射表
  const pageTypeMap = {
    // ================== 簇级只读页面 (clusterread-type) ==================
    // 只显示查看簇选择器，不显示下发多选框（只读数据查看）
    '/': 'clusterread',                    // 电池信息页面（首页）
    '/index': 'clusterread',               // 电池信息页面（备用路由）
    '/Cluster/version': 'clusterread',         // 版本信息页面
    '/cluster/version': 'clusterread',         // 版本信息页面（备用路由）
    '/Cluster/Brokenwire': 'clusterread',      // 掉线信息页面
    '/cluster/brokenwire': 'clusterread',      // 掉线信息页面（备用路由）
    '/Cluster/Fault': 'clusterread',           // 故障页面
    '/cluster/fault': 'clusterread',           // 故障页面（备用路由）
    '/FaultOverview': 'blockread',             // 故障总览页面（堆级只读页面，显示堆选择器）
    '/fault-overview': 'blockread',            // 故障总览页面（备用路由）
    // 设备管理页面（独立页面：固定topic，无选择器）
    '/Block/DeviceManagement': 'standalone',
    '/block/device-management': 'standalone',
    
    // ================== 簇级遥调、遥控页面 (cluster-type) ==================
    // 需要显示簇选择器和下发多选框的页面（可读写）
    '/Cluster/BaseParam': 'cluster',           // 系统基础参数（配置参数）
    '/cluster/base-param': 'cluster',          // 系统基础参数（备用路由）
    '/Cluster/AlarmThreshold': 'cluster',      // 告警阈值页面
    '/cluster/alarm-threshold': 'cluster',     // 告警阈值页面（备用路由）
    '/Cluster/SOXParam': 'cluster',            // SOX参数页面
    '/cluster/sox-param': 'cluster',           // SOX参数页面（备用路由）

    '/Cluster/Order': 'cluster',               // 指令下发页面
    '/cluster/order': 'cluster',               // 指令下发页面（备用路由）
    
    // ================== 堆级只读页面 (blockread-type) ==================
    // 只显示查看堆选择器，不显示下发多选框（只读数据查看）
    '/Block/BlockSummary': 'blockread',             // 堆汇总信息页面
    '/block/blockSummary': 'blockread',             // 堆汇总信息页面（备用路由）
    '/Block/BlockInfo': 'blockread',                // 堆信息页面（汇总+系统概要）
    '/block/blockInfo': 'blockread',                // 堆信息页面（备用路由）
    '/Block/BlockVersion': 'standalone',             // 堆版本信息页面（独立页面，无选择器）
    '/block/blockVersion': 'standalone',             // 堆版本信息页面（备用路由）
    '/Block/BlockIO': 'blockread',                   // 堆IO状态页面（堆级只读页面）
    '/block/blockIO': 'blockread',                   // 堆IO状态页面（备用路由）
    '/Block/BlockSysAbstract': 'blockread',         // 堆系统概要页面
    '/block/blockSysAbstract': 'blockread',         // 堆系统概要页面（备用路由）
    
    // ================== 堆级遥调、遥控页面 (block-type) ==================
    // 需要显示堆选择器和下发多选框的页面（可读写）
    '/Block/BaseParam': 'block',               // 堆基础参数页面
    '/block/base-param': 'block',              // 堆基础参数页面（备用路由）
    '/Block/BlockAlarmThreshold': 'block',     // 堆告警阈值页面
    '/block/block-alarm-threshold': 'block',    // 堆告警阈值页面（备用路由）
    '/Block/BlockConfigParam': 'block',        // 堆配置参数页面
    '/Block/BlockRemoteCommand': 'block',      // 堆遥控页面
    '/block/block-remote-command': 'block',    // 堆遥控页面（备用路由）
  }
  
  /**
   * 根据路由路径获取页面类型
   * @param {string} path - 路由路径
   * @returns {string} 页面类型：'cluster' | 'clusterread' | 'block' | 'blockread'
   */
  function getPageTypeFromPath(path) {
    // 直接匹配
    if (pageTypeMap[path]) {
      return pageTypeMap[path]
    }
    
    // 模糊匹配（处理动态路由参数）
    for (const [routePath, pageType] of Object.entries(pageTypeMap)) {
      if (path.startsWith(routePath)) {
        return pageType
      }
    }
    
    // 默认为簇级只读页面
    console.warn(`[PageTypeDetection] 未找到路由 ${path} 的页面类型配置，使用默认类型: clusterread`)
    return 'clusterread'
  }
  
  /**
   * 设置页面类型
   * @param {string} pageType - 页面类型
   */
  function setPageType(pageType) {
    // 根据页面类型设置对应的store
    if (pageType.startsWith('block')) {
      blockStore.setCurrentPageType(pageType)
      // 清空簇选择器状态
      clusterStore.setCurrentPageType('standalone')
    } else if (pageType.startsWith('cluster')) {
      clusterStore.setCurrentPageType(pageType)
      // 清空堆选择器状态
      blockStore.setCurrentPageType('standalone')
    } else {
      // standalone类型，清空所有选择器状态
      clusterStore.setCurrentPageType('standalone')
      blockStore.setCurrentPageType('standalone')
    }
    // console.log(`[PageTypeDetection] 设置页面类型: ${pageType} (路由: ${route.path})`)
  }
  
  /**
   * 根据当前路由更新页面类型
   */
  function updatePageType() {
    const currentPath = route.path
    const pageType = getPageTypeFromPath(currentPath)
    setPageType(pageType)
  }
  
  /**
   * 添加新的页面类型映射
   * @param {string} path - 路由路径
   * @param {string} pageType - 页面类型
   */
  function addPageTypeMapping(path, pageType) {
    pageTypeMap[path] = pageType
    // console.log(`[PageTypeDetection] 添加页面类型映射: ${path} -> ${pageType}`)
    
    // 如果是当前路由，立即更新
    if (route.path === path) {
      setPageType(pageType)
    }
  }
  
  /**
   * 获取当前页面类型
   * @returns {string} 当前页面类型
   */
  function getCurrentPageType() {
    // 优先返回堆级页面类型，然后是簇级页面类型
    if (blockStore.currentPageType !== 'standalone') {
      return blockStore.currentPageType
    }
    return clusterStore.currentPageType
  }
  
  /**
   * 检查当前页面是否为指定类型
   * @param {string} pageType - 要检查的页面类型
   * @returns {boolean} 是否匹配
   */
  function isCurrentPageType(pageType) {
    return getCurrentPageType() === pageType
  }
  
  /**
   * 获取所有页面类型映射
   * @returns {Object} 页面类型映射对象
   */
  function getAllPageTypeMappings() {
    return { ...pageTypeMap }
  }
  
  // 监听路由变化，自动更新页面类型
  watch(
    () => route.path,
    (newPath) => {
      // console.log(`[PageTypeDetection] 路由变化: ${newPath}`)
      updatePageType()
    },
    { immediate: false }
  )
  
  // 组件挂载时初始化页面类型
  onMounted(() => {
    // console.log(`[PageTypeDetection] 初始化页面类型检测，当前路由: ${route.path}`)
    updatePageType()
  })
  
  return {
    // 核心方法
    updatePageType,
    setPageType,
    getCurrentPageType,
    isCurrentPageType,
    
    // 配置方法
    addPageTypeMapping,
    getAllPageTypeMappings,
    
    // 工具方法
    getPageTypeFromPath
  }
}

/**
 * 页面类型常量
 */
export const PAGE_TYPES = {
  CLUSTER: 'cluster',          // 簇级遥调页面（可读写）
  CLUSTERREAD: 'clusterread',  // 簇级只读页面（只读数据查看）
  BLOCK: 'block',              // 堆级遥调页面（可读写）
  BLOCKREAD: 'blockread'       // 堆级只读页面（只读数据查看）
}

/**
 * 页面类型描述
 */
export const PAGE_TYPE_DESCRIPTIONS = {
  [PAGE_TYPES.CLUSTER]: {
    name: '簇级遥调页面',
    description: '显示簇选择器和下发多选框，支持簇级数据查看和批量下发',
    features: ['簇选择器', '下发多选框', '全选/清空按钮', '数据读写']
  },
  [PAGE_TYPES.CLUSTERREAD]: {
    name: '簇级只读页面',
    description: '显示簇选择器但不显示下发功能，支持簇级数据查看',
    features: ['簇选择器', '数据查看', '只读模式']
  },
  [PAGE_TYPES.BLOCK]: {
    name: '堆级遥调页面',
    description: '显示堆选择器和下发多选框，支持堆级数据查看和批量下发',
    features: ['堆选择器', '下发多选框', '全选/清空按钮', '数据读写']
  },
  [PAGE_TYPES.BLOCKREAD]: {
    name: '堆级只读页面',
    description: '显示堆选择器但不显示下发功能，支持堆级数据查看',
    features: ['堆选择器', '数据查看', '只读模式']
  }
}
