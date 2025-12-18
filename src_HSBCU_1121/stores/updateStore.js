import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useUpdateStore = defineStore('updateStore', () => {
  const upgradeOptions = ref([
    { key: 'upgrade.upgradeStyleOptions.BCU升级', value: '0xa001' },
    { key: 'upgrade.upgradeStyleOptions.BMU升级', value: '0xa002' },
    { key: 'upgrade.upgradeStyleOptions.BCU默认参数升级', value: '0xa003' }
  ])
  const bmuUpgradeOptions = ref([
    { key: 'upgrade.upgradeBMUStyleOptions.单机常规升级', value: '0xc0a1' },
    { key: 'upgrade.upgradeBMUStyleOptions.单机强制升级', value: '0xc0b1' },
    { key: 'upgrade.upgradeBMUStyleOptions.广播常规升级', value: '0xc0a2' },
    { key: 'upgrade.upgradeBMUStyleOptions.广播强制升级', value: '0xc0b2' }
  ])
  const selectedUpgrade = ref('0xa001') // 初始为 null 或默认值如 '0xa001'
  const bcuUpdateNum = ref(0)
  const bmuUpdateStyle = ref('0xc0a2')
  const bmuUpdateAddress = ref('B0')
  const bmuUpdateNum = ref(1)
  const FTPIp = ref('192.168.10.200')
  const FTPPort = ref(21)
  const FTPUser = ref('admin')
  const FTPPassword = ref('12345678')
  const updateFile = ref('')
  return {
    upgradeOptions,
    selectedUpgrade,
    bcuUpdateNum,
    bmuUpgradeOptions,
    bmuUpdateStyle,
    bmuUpdateAddress,
    bmuUpdateNum,
    FTPIp,
    FTPPort,
    FTPUser,
    FTPPassword,
    updateFile
  }
})
