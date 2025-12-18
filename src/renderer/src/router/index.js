import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () =>
        import(
          /* webpackPrefetch: true */
          /* webpackChunkName: "login" */
          '@/views/auth/login.vue'
        )
    },
    {
      path: '/',
      component: () =>
        import(
          /* webpackPrefetch: true */
          /* webpackChunkName: "app-layout" */
          '@/layout/AppLayout.vue'
        ),
      children: [
        /* {
      path: '',
      name: 'cellData',
      component: () => import(
        '@/views/Cluster/cellData.vue'
      ),
      meta: { visibleForGuest: true } // 所有用户可见
    }, */
        {
          path: '',
          name: 'BlockInfoHome',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockInfo" */
              '@/views/Block/BlockInfo.vue'
            )
        },
        {
          path: '/Cluster/cellData',
          name: 'cellData',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "cellData" */
              '@/views/Cluster/cellData.vue'
            ),
          meta: { visibleForGuest: true }
        },
        {
          path: '/Cluster/version',
          name: 'version',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "version" */
              '@/views/Cluster/version.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: '/Cluster/Order',
          name: 'Order',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "order" */
              '@/views/Cluster/Order.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: '/Cluster/Fault',
          name: 'Fault',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "fault" */
              '@/views/Cluster/Fault.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: '/Cluster/Brokenwire',
          name: 'Brokenwire',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "brokenwire" */
              '@/views/Cluster/Brokenwire.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: '/Cluster/BaseParam',
          name: 'BaseParam',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "baseParam" */
              '@/views/Cluster/BaseParam.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: '/Cluster/AlarmThreshold',
          name: 'AlarmThreshold',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "alarmThreshold" */
              '@/views/Cluster/AlarmThreshold.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: '/Cluster/SOXParam',
          name: 'SOXParam',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "soxParam" */
              '@/views/Cluster/SOXParam.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: '/Cluster/IvCalibration',
          name: 'IvCalibration',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "calibration" */
              '@/views/Cluster/Calibration.vue'
            ),
          meta: { visibleForGuest: false, requirePassword: true } // 仅管理员 + 密码保护
        },
        {
          path: '/Cluster/DiDoStatus',
          name: 'DiDoStatus',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "diDoStatus" */
              '@/views/Cluster/DiDoStatus.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: '/FaultOverview',
          name: 'FaultOverview',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "faultOverview" */
              '@/views/Block/FaultOverview.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: '/dashboard',
          name: 'Dashboard',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "dashboard" */
              '@/views/Dashboard/Dashboard.vue'
            ),
          meta: { fullScreen: true, visibleForGuest: true } // 全屏显示，仅管理员
        }
      ]
    },
    {
      path: '/Block',
      name: 'Block',
      component: () =>
        import(
          /* webpackPrefetch: true */
          /* webpackChunkName: "app-layout" */
          '@/layout/AppLayout.vue'
        ),
      children: [
        {
          path: 'BlockInfo',
          name: 'BlockInfo',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockInfo" */
              '@/views/Block/BlockInfo.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: 'BlockVersion',
          name: 'BlockVersion',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockVersion" */
              '@/views/Block/BlockVersion.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: 'BlockIO',
          name: 'BlockIO',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockIO" */
              '@/views/Block/BlockIO.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: 'DeviceManagement',
          name: 'DeviceManagement',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "deviceManagement" */
              '@/views/Block/DeviceManagement.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: 'BlockAlarmThreshold',
          name: 'BlockAlarmThreshold',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockAlarmThreshold" */
              '@/views/Block/BlockAlarmThreshold.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: 'BlockConfigParam',
          name: 'BlockConfigParam',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockConfigParam" */
              '@/views/Block/BlockConfigParam.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: 'BlockRemoteCommand',
          name: 'BlockRemoteCommand',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockRemoteCommand" */
              '@/views/Block/BlockRemoteCommand.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        }
      ]
    },
    {
      path: '/Peripheral',
      name: 'Peripheral',
      component: () =>
        import(
          /* webpackPrefetch: true */
          /* webpackChunkName: "app-layout" */
          '@/layout/AppLayout.vue'
        ),
      children: [
        {
          path: 'BlockPcs',
          name: 'BlockPcs',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockPcs" */
              '@/views/Peripheral/BlockPcs.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: 'BlockRef',
          name: 'BlockRef',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockRef" */
              '@/views/Peripheral/BlockRef.vue'
            ),
          meta: { visibleForGuest: true } // 所有用户可见
        },
        {
          path: 'BlockDeh',
          name: 'BlockDeh',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "blockDeh" */
              '@/views/Peripheral/BlockDeh.vue'
            ),
          meta: { visibleForGuest: true }
        }
      ]
    },
    {
      path: '/Bau',
      name: 'Bau',
      component: () =>
        import(
          /* webpackPrefetch: true */
          /* webpackChunkName: "app-layout" */
          '@/layout/AppLayout.vue'
        ),
      children: [
        {
          path: 'upgrade',
          name: 'BauUpgrade',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "bauUpgrade" */
              '@/views/Bau/upgrade/bauUpgrade.vue'
            ),
          meta: { visibleForGuest: false, requirePassword: true } // 仅管理员 + 密码保护
        },
        {
          path: 'force-upgrade',
          name: 'BauForceUpgrade',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "bauForceUpgrade" */
              '@/views/Bau/force-upgrade/bauForceUpgrade.vue'
            ),
          meta: { visibleForGuest: false, requirePassword: true } // 仅管理员 + 密码保护
        },
        {
          path: 'address-adaptive',
          name: 'AddressAdaptive',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "addressAdaptive" */
              '@/views/Bau/address-adaptive/addressAdaptive.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        },
        {
          path: 'eventRecord/event',
          name: 'EventTime',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "eventTime" */
              '@/views/Bau/eventRecord/event.vue'
            ),
          meta: { visibleForGuest: false } // 仅管理员
        }
      ]
    },
    {
      path: '/Device',
      name: 'Device',
      component: () =>
        import(
          /* webpackPrefetch: true */
          /* webpackChunkName: "app-layout" */
          '@/layout/AppLayout.vue'
        ),
      children: [
        {
          path: 'BauAddressDetection',
          name: 'BauAddressDetection',
          component: () =>
            import(
              /* webpackPrefetch: true */
              /* webpackChunkName: "bauAddressDetection" */
              '@/views/Device/BauAddressDetection.vue'
            ),
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
    if (authStore.isLoggedIn) return next({ name: 'BlockInfoHome' })
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
