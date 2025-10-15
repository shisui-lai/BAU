import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/login.vue')
    },
    {
      path: '/',
      component: () => import('@/layout/AppLayout.vue'),
      children: [{
      path: '',
      name: 'cellData',
      component: () => import('@/views/Cluster/cellData.vue'),
      meta: { visibleForGuest: true } // 所有用户可见
    },
    {
      path: '/Cluster/version',
      name: 'version',
      component: () => import('@/views/Cluster/version.vue'),
      meta: { visibleForGuest: true } // 所有用户可见
    },
    {
      path: '/Cluster/Order',
      name: 'Order',
      component: () => import('@/views/Cluster/Order.vue'),
      meta: { visibleForGuest: false } // 仅管理员
    },
    {
      path: '/Cluster/Fault',
      name: 'Fault',
      component: () => import('@/views/Cluster/Fault.vue'),
      meta: { visibleForGuest: true } // 所有用户可见
    },
    {
      path: '/Cluster/Brokenwire',
      name: 'Brokenwire',
      component: () => import('@/views/Cluster/Brokenwire.vue'),
      meta: { visibleForGuest: true } // 所有用户可见
    },
    {
      path: '/Cluster/BaseParam',
      name: 'BaseParam',
      component: () => import('@/views/Cluster/BaseParam.vue'),
      meta: { visibleForGuest: false } // 仅管理员
    },
    {
      path: '/Cluster/AlarmThreshold',
      name: 'AlarmThreshold',
      component: () => import('@/views/Cluster/AlarmThreshold.vue'),
      meta: { visibleForGuest: false } // 仅管理员
    },
    {
      path: '/Cluster/SOXParam',
      name: 'SOXParam',
      component: () => import('@/views/Cluster/SOXParam.vue'),
      meta: { visibleForGuest: false } // 仅管理员
    },
    {
      path: '/Cluster/IvCalibration',
      name: 'IvCalibration',
      component: () => import('@/views/Cluster/Calibration.vue'),
      meta: { visibleForGuest: false, requirePassword: true } // 仅管理员 + 密码保护
    },
    {
      path: '/Cluster/DiDoStatus',
      name: 'DiDoStatus',
      component: () => import('@/views/Cluster/DiDoStatus.vue'),
      meta: { visibleForGuest: true } // 所有用户可见
    },
    {
      path: '/FaultOverview',
      name: 'FaultOverview',
      component: () => import('@/views/Block/FaultOverview.vue'),
      meta: { visibleForGuest: true } // 所有用户可见
    },
    ]
    },
    {
      path: '/Block',
      name: 'Block',
      component: () => import('@/layout/AppLayout.vue'),
      children: [
        {
          path: 'BlockInfo',
          name: 'BlockInfo',
          component: () => import('@/views/Block/BlockInfo.vue'),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: 'BlockVersion',
          name: 'BlockVersion',
          component: () => import('@/views/Block/BlockVersion.vue'),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: 'BlockIO',
          name: 'BlockIO',
          component: () => import('@/views/Block/BlockIO.vue'),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: 'DeviceManagement',  
          name: 'DeviceManagement',
          component: () => import('@/views/Block/DeviceManagement.vue'),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: 'BlockAlarmThreshold',
          name: 'BlockAlarmThreshold',
          component: () => import('@/views/Block/BlockAlarmThreshold.vue'),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: 'BlockConfigParam',
          name: 'BlockConfigParam',
          component: () => import('@/views/Block/BlockConfigParam.vue'),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: 'BlockRemoteCommand',
          name: 'BlockRemoteCommand',
          component: () => import('@/views/Block/BlockRemoteCommand.vue'),
          meta: { visibleForGuest: false } // 仅管理员
        }
      ]
    },
    {
      path: '/Bau',
      name: 'Bau',
      component: () => import('@/layout/AppLayout.vue'),
      children: [
        {
          path: 'upgrade',
          name: 'BauUpgrade',
          component: () => import('@/views/Bau/upgrade/bauUpgrade.vue'),
          meta: { visibleForGuest: false, requirePassword: true } // 仅管理员 + 密码保护
        },
        {
          path: 'address-adaptive',
          name: 'AddressAdaptive',
          component: () => import('@/views/Bau/address-adaptive/addressAdaptive.vue'),
          meta: { visibleForGuest: false } // 仅管理员
        }
      ]
    },
    {
      path: '/Device',
      name: 'Device',
      component: () => import('@/layout/AppLayout.vue'),
      children: [
        {
          path: 'BauAddressDetection',
          name: 'BauAddressDetection',
          component: () => import('@/views/Device/BauAddressDetection.vue'),
          meta: { visibleForGuest: false } // 仅管理员
        }
      ]
    },
    // 如果路由都不匹配，就重定向到登录页面
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ]
})

// —— 全局路由守卫 ——
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // 1. 如果访问的是 /login，且用户已经登录了（role!==0），可以直接放行到 Home
  if (to.name === 'Login') {
    if (authStore.isLoggedIn) return next({ name: 'cellData' })
    return next()
  }

  // 2. 核心：如果用户未登录，强制跳转到登录页
  if (!authStore.isLoggedIn) {
    return next({ name: 'Login' })
  }

  // 3. 如果访客访问管理员页面（visibleForGuest: false），则跳转首页
  if (to.meta.visibleForGuest === false && authStore.isGuest) {
    return next({ name: 'cellData' })
  }

  // 4. 其它情况（已登录用户正常访问）
  return next()
})

export default router
