import { defineStore } from 'pinia'
import {
  initDataSOXConfig,
  initDataAlarmConfig,
  initDataBCUConfig1
} from '../renderer/src/views/Bcu/bcuParameter/configData'
export const useModuleDataStore = defineStore('moduleData', {
  state: () => ({
    // 每个模块底下按 ip 存一份数据
    modules: {
      ConfigParamSys: {}, // { [ip: string]: DataBCUConfig1[] }
      ConfigAlarm: {}, // { [ip: string]: DataAlarmConfig[] }
      ConfigSOX: {} // { [ip: string]: DataSOXConfig[] }
    }
  }),
  actions: {
    setModuleData(moduleName, ip, data) {
      this.modules[moduleName][ip] = data
    },
    /** 更新某个模块、某个 IP 下的 importedValue */
    updateImportedValues(rows, ip) {
      rows.forEach(({ 模块, 参数名, 值 }) => {
        const bucket = this.modules[模块]
        if (!bucket || !bucket[ip]) return
        bucket[ip].forEach((group) => {
          const it = group.element.find((el) => el.label === 参数名)
          if (it) it.importedValue = isNaN(+值) ? 值 : +值
        })
      })
    }
  },
  getters: {
    /** 拿当前选中 IP 的某个模块数据 */
    getModuleData: (state) => {
      return (moduleName, ip) => {
        // 如果没读过就初始化
        if (!state.modules[moduleName][ip]) {
          const fn =
            moduleName === 'ConfigParamSys'
              ? initDataBCUConfig1
              : moduleName === 'ConfigAlarm'
                ? initDataAlarmConfig
                : initDataSOXConfig
          state.modules[moduleName][ip] = fn()
        }
        return state.modules[moduleName][ip]
      }
    }
  }
})
