import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layout/AppLayout.vue'),
      children: [{
      path: '',  // 正确：表示父路由的默认子路径
      name: 'cellData',
      component: () => import('@/views/Cluster/cellData.vue')
    },
    {
      path: '/Cluster/version',  // 正确：表示父路由的默认子路径
      name: 'version',
      component: () => import('@/views/Cluster/version.vue')
    },
    {
      path: '/Cluster/Order',  // 正确：表示父路由的默认子路径
      name: 'Order',
      component: () => import('@/views/Cluster/Order.vue')
    },
    {
      path: '/Cluster/Fault',  // 正确：表示父路由的默认子路径
      name: 'Fault',
      component: () => import('@/views/Cluster/Fault.vue')
    },
    {
      path: '/Cluster/Brokenwire',  // 正确：表示父路由的默认子路径
      name: 'Brokenwire',
      component: () => import('@/views/Cluster/Brokenwire.vue')
    },
    {
      path: '/Cluster/BaseParam',  // 正确：表示父路由的默认子路径
      name: 'BaseParam',
      component: () => import('@/views/Cluster/BaseParam.vue')
    },
    {
      path: '/Cluster/AlarmThreshold',  // 正确：表示父路由的默认子路径
      name: 'AlarmThreshold',
      component: () => import('@/views/Cluster/AlarmThreshold.vue')
    },
    {
      path: '/Cluster/SOXParam',  // SOX参数页面路由
      name: 'SOXParam',
      component: () => import('@/views/Cluster/SOXParam.vue')
    },
    {
      path: '/Cluster/IvCalibration',  // 模拟量校准页面路由
      name: 'IvCalibration',
      component: () => import('@/views/Cluster/Calibration.vue')
    },
    {
      path: '/FaultOverview',  // 故障总览页面路由
      name: 'FaultOverview',
      component: () => import('@/views/Block/FaultOverview.vue')
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
          component: () => import('@/views/Block/BlockInfo.vue')
        },
        {
          path: 'BlockVersion',
          name: 'BlockVersion',
          component: () => import('@/views/Block/BlockVersion.vue')
        },
        {
          path: 'BlockIO',
          name: 'BlockIO',
          component: () => import('@/views/Block/BlockIO.vue')
        },
        {
          path: 'DeviceManagement',  
          name: 'DeviceManagement',
          component: () => import('@/views/Block/DeviceManagement.vue')
        },
        {
          path: 'BlockAlarmThreshold',
          name: 'BlockAlarmThreshold',
          component: () => import('@/views/Block/BlockAlarmThreshold.vue')
        },
        {
          path: 'BlockConfigParam',
          name: 'BlockConfigParam',
          component: () => import('@/views/Block/BlockConfigParam.vue')
        },
        {
          path: 'BlockRemoteCommand',
          name: 'BlockRemoteCommand',
          component: () => import('@/views/Block/BlockRemoteCommand.vue')
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
          component: () => import('@/views/Bau/upgrade/bauUpgrade.vue')
        },
        {
          path: 'address-adaptive',
          name: 'AddressAdaptive',
          component: () => import('@/views/Bau/address-adaptive/addressAdaptive.vue')
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
          component: () => import('@/views/Device/BauAddressDetection.vue')
        }
      ]
    }
  ]
})

export default router
