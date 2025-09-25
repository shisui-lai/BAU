<script setup>
import { ref, computed, onMounted } from 'vue'
import AppMenuItem from './AppMenuItem.vue'
import { useAuthStore } from '../../../stores/auth.js'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()
// 根据 role.value 值映射一个 key 用于比对
// role=1 时 key='admin'；role=2 时 key='guest'
const roleKey = computed(() => (authStore.isAdmin ? 'admin' : 'guest'))
const userMenu = ref(null)
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
  /*   {
    label: t('menu.settings'),
    icon: 'pi pi-cog',
    command: () => {
      router.push({ name: 'Settings' })
    }
  } */
])
const rawModel = ref([
  {
    labelKey: 'menu.operationInformation',
    roles: ['admin', 'guest'], // 管理员和访客都能看
    icon: 'pi pi-spin pi-spinner',
    items: [
      {
        labelKey: 'menu.batteryInfo',
        icon: 'pi pi-fw pi-chart-bar',
        to: '/'
      },
      {
        labelKey: 'menu.alarmInformation',
        icon: 'pi pi-fw pi-exclamation-circle',
        to: '/Bcu/alarmData/alarmData'
      },
      {
        labelKey: 'menu.faultConfig',
        icon: 'pi pi-fw pi-cog',
        to: '/Bcu/alarmData/faultConfig'
      },
      { labelKey: 'menu.didoData', icon: 'pi pi-fw pi-table', to: '/Bcu/DIDO/dido' },

      {
        labelKey: 'menu.disconnection',
        icon: 'pi pi-fw pi-link',
        to: '/Bcu/disconnectData/disconnectData'
      },
      { labelKey: 'menu.version', icon: 'pi pi-fw pi-book', to: '/Bcu/clusterData/version' }
    ]
  },

  {
    labelKey: 'menu.systemConfig',
    roles: ['admin'], // 管理员能看
    icon: 'pi pi-file-edit',
    items: [
      { labelKey: 'menu.configParameter', icon: 'pi pi-fw  pi-file-edit', to: '/Bcu/bcuParameter' },
      {
        labelKey: 'menu.alramThreshold',
        icon: 'pi pi-fw pi-flag',
        to: '/Bcu/bcuParameter/alarmConfig'
      },
      {
        labelKey: 'menu.SOXConfig',
        icon: 'pi pi-fw pi-sliders-h',
        to: '/Bcu/bcuParameter/SOXConfig'
      }
    ]
  },
  {
    labelKey: 'menu.controlFunction',
    roles: ['admin'], // 管理员能看
    icon: 'pi  pi-cog',
    items: [
      { labelKey: 'menu.controlCommand', icon: 'pi pi-fw pi-cog', to: '/Bcu/control/fet' },
      {
        labelKey: 'menu.calibrationBalance',
        icon: 'pi pi-fw pi-wrench',
        to: '/Bcu/bcuParameter/ivCali'
      },
      {
        labelKey: 'menu.calibrationFilter',
        icon: 'pi pi-fw pi-pencil',
        to: '/Bcu/control/vtSetShield'
      },
      { labelKey: 'menu.powerMap', icon: 'pi pi-fw pi-table', to: '/Bcu/control/powerMap' },
      /*       { labelKey: '强制均衡', icon: 'pi pi-fw pi-table', to: '/Bcu/control/balance' }, */
      { labelKey: 'menu.eventTime', icon: 'pi pi-fw pi-file-export', to: '/Bcu/eventRecord/event' },
      { labelKey: 'menu.upgrade', icon: 'pi pi-fw pi-cloud-upload', to: '/Bcu/update/bcuUpdate' }
      /*   { labelKey: '地址自适应', icon: 'pi pi-fw pi-sitemap', to: '/Bcu/ipConfig/addressAdapt' } */
    ]
  },
  {
    labelKey: 'menu.peripherals',
    icon: 'pi pi-desktop',
    roles: ['admin', 'guest'],
    items: [
      {
        labelKey: 'menu.refrigeration',
        icon: 'pi pi-fw pi-sitemap',
        to: '/Bcu/peripherals/refrigeration'
      },
      {
        labelKey: 'menu.PCS',
        icon: 'pi pi-fw pi-sitemap',
        to: '/Bcu/peripherals/PCS'
      },
      {
        labelKey: 'menu.dehumidifier',
        icon: 'pi pi-fw pi-sitemap',
        to: '/Bcu/peripherals/dehumidifier'
      },
      {
        labelKey: 'menu.fireController',
        icon: 'pi pi-fw pi-sitemap',
        to: '/Bcu/peripherals/fireController'
      }
    ]
  },
  {
    labelKey: 'menu.systemManagement',
    icon: 'pi pi-desktop',
    roles: ['admin', 'guest'],
    items: [
      {
        labelKey: 'menu.deviceConnection',
        icon: 'pi pi-fw pi-sitemap',
        to: '/Bcu/ipConfig/addressAdapt'
      }
    ]
  }
])
// 生成“翻译完毕”的 model
const model = computed(() => {
  return (
    rawModel.value
      // 然后给每个 group 和它的 items 分别加上 label
      .map((group) => ({
        ...group,
        label: t(group.labelKey),
        items: group.items.map((item) => ({
          ...item,
          label: t(item.labelKey)
        }))
      }))
  )
})
// 点击“注销”时，把状态清掉并跳到登录页
function onLogout() {
  authStore.logout()
  router.replace({ name: 'Login' })
}
</script>

<template>
  <ul class="layout-menu">
    <!-- 遍历 model，每一项可能是一级菜单组 -->
    <template v-for="(item, i) in model" :key="i">
      <!-- 如果当前用户角色不在 item.roles 里，就不渲染这个菜单组 -->
      <app-menu-item v-if="item.roles.includes(roleKey)" :item="item" :index="i"></app-menu-item>
      <!-- 如果你还写了 separator, 也可以根据需求加 v-if -->
      <li v-if="item.separator && item.roles.includes(roleKey)" class="menu-separator"></li>
    </template>
    <!-- 底部固定显示“登录”或“注销”按钮 -->
    <li class="menu-footer">
      <Avatar
        style="cursor: pointer"
        size="large"
        shape="circle"
        icon="pi pi-user"
        @click="userMenu.toggle($event)"
      />
      <Menu ref="userMenu" :model="userMenuItems" popup />
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.menu-footer {
  margin-top: auto; /* 把底部菜单推到底部 */
  padding: 2rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}
.login-link {
  color: var(--text-color);
  text-decoration: none;
}

.login-link i {
  margin-right: 0.5rem;
}
</style>
