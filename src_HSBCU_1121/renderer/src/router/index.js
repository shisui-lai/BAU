import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import AppLayout from '@/layout/AppLayout.vue'
import About from '@/views/help/about.vue'
import login from '@/views/auth/login.vue'
import SettingsView from '@/views/auth/SettingsView.vue'
import ParamWrapper from '@/views/Bcu/bcuParameter/param.vue'
const PASSWORD_KEY = 'vtSetShieldPassword'
const CORRECT_PASSWORD = '123456' // 你可以改成任意密码
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: login
  },
  { path: '/SettingsView', name: 'Settings', component: SettingsView },
  {
    path: '/about',
    name: 'About',
    component: About
  },
  {
    path: '/',
    component: AppLayout,
    //meta: { requiresAuth: true }, // 访问 AppLayout 下任何子路由，都需要先“登录”
    children: [
      {
        path: '',
        name: 'clusterDataSummHome',
        component: () => import('@/views/Bcu/clusterData/clusterDataSummHome.vue'),
        // 访客也能看“设备运行数据”相关的首页
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/DIDO/dido',
        name: 'DIDO',
        component: () => import('@/views/Bcu/DIDO/dido.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/alarmData/alarmData',
        name: 'alarmData',
        component: () => import('@/views/Bcu/alarmData/alarmData.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/alarmData/faultConfig',
        name: 'faultConfig',
        component: () => import('@/views/Bcu/alarmData/faultConfig.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/alarmData/DIDORTData',
        name: 'DIDORTData',
        component: () => import('@/views/Bcu/alarmData/DIDORTData.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/disconnectData/disconnectData',
        name: 'disconnectData',
        component: () => import('@/views/Bcu/disconnectData/disconnectData.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/clusterData/version',
        name: 'version',
        component: () => import('@/views/Bcu/clusterData/version.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/bcuParameter',
        component: () => import('@/views/Bcu/bcuParameter/param.vue'),
        meta: { visibleForGuest: false },
        children: [
          {
            path: '',
            name: 'BCU-Param',
            /*    redirect: '/Bcu/cellSOH/cellSOH-eachcluster/cellSOH-cluster1', */
            component: () =>
              import(
                /* webpackPrefetch: true */
                /* webpackChunkName: "bcu-param" */
                '@/views/Bcu/bcuParameter/bcuParameter.vue'
              ),
            meta: { visibleForGuest: false } // 管理员才看得见
          },
          {
            path: 'alarmConfig',
            name: 'BCU-AlarmConfig',
            component: () =>
              import(
                /* webpackPrefetch: true */
                /* webpackChunkName: "bcu-alarm-config" */
                '@/views/Bcu/bcuParameter/alarmConfig.vue'
              ),
            meta: { visibleForGuest: false } // 管理员才看得见
          },
          {
            path: 'SOXConfig',
            name: 'BCU-SOXConfig',
            component: () =>
              import(
                /* webpackPrefetch: true */
                /* webpackChunkName: "bcu-sox-config" */
                '@/views/Bcu/bcuParameter/SOXConfig.vue'
              ),
            meta: { visibleForGuest: false } // 管理员才看得见
          }
        ]
      },
      {
        path: '/Bcu/bcuParameter/ivCali',
        component: () => import('@/views/Bcu/bcuParameter/ivCali.vue'),
        meta: { visibleForGuest: false } // 管理员才看得见
      },
      {
        path: '/Bcu/control/fet',
        component: () => import('@/views/Bcu/control/fet.vue'),
        meta: { visibleForGuest: false } // 管理员才看得见
      },
      {
        path: '/Bcu/control/didoControl',
        component: () => import('@/views/Bcu/control/didoControl.vue'),
        meta: { visibleForGuest: false } // 管理员才看得见
      },
      {
        path: '/Bcu/control/vtSetShield',
        component: () => import('@/views/Bcu/control/vtSetShield.vue'),
        meta: { visibleForGuest: false, requirePassword: true } // 管理员才看得见
      },
      {
        path: '/Bcu/control/powerMap',
        component: () => import('@/views/Bcu/control/powerMap.vue'),
        meta: { visibleForGuest: false } // 管理员才看得见
      },
      {
        path: '/Bcu/eventRecord/event',
        component: () => import('@/views/Bcu/eventRecord/event.vue'),
        meta: { visibleForGuest: false } // 管理员才看得见
      },
      {
        path: '/Bcu/update/bcuUpdate',
        component: () => import('@/views/Bcu/update/bcuUpdate.vue'),
        meta: { visibleForGuest: false } // 管理员才看得见
      },
      {
        path: '/Bcu/update/bcuForceUpgrade',
        component: () => import('@/views/Bcu/update/bcuForceUpgrade.vue'),
        meta: { visibleForGuest: false } // 管理员才看得见
      },
      {
        path: '/Bcu/peripherals/refrigeration',
        component: () => import('@/views/Bcu/peripherals/refrigeration.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/peripherals/PCS',
        component: () => import('@/views/Bcu/peripherals/PCS.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/peripherals/dehumidifier',
        component: () => import('@/views/Bcu/peripherals/dehumidifier.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/peripherals/fireController',
        component: () => import('@/views/Bcu/peripherals/fireController.vue'),
        meta: { visibleForGuest: true }
      },
      {
        path: '/Bcu/ipConfig/addressAdapt',
        component: () => import('@/views/Bcu/ipConfig/addressAdapt.vue'),
        meta: { visibleForGuest: true }
      }
    ]
  },
  // 如果路由都不匹配，就重定向到登录页面
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]
const router = createRouter({
  history: createWebHashHistory(),
  routes
})
// —— 全局路由守卫 ——
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  // 1. 如果访问的是 /login，且用户已经登录了（role!==0），可以直接放行到 Home
  if (to.name === 'Login') {
    if (authStore.isLoggedIn) return next({ name: 'clusterDataSummHome' })
    return next()
  }

  // 2. 如果目标路由需要先登录（requiresAuth），但当前没有登录，就跳转到登录页
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next({ name: 'Login' })
  }

  // 3. 如果目标路由需要管理员权限、但当前不是管理员，则：
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    // 还没登录？跳登录；已以访客登录，跳回首页
    return authStore.isLoggedIn ? next({ name: 'clusterDataSummHome' }) : next({ name: 'Login' })
  }

  // 4. 如果目标路由需要密码保护，由页面内部弹窗处理，这里直接放行
  if (to.meta.requirePassword) {
    return next()
  }

  // 5. 其它情况
  return next()
})
export default router
