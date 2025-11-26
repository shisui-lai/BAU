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
      // 定义不显示导入值的分类
      const skipImportCategories = new Set(['设备出厂信息', '实时保存的SOX数据'])

      let matchCount = 0
      let skipCount = 0
      let notFoundCount = 0
      let moduleNotFoundCount = 0
      const notFoundParams = [] // 记录未找到的参数

      rows.forEach(({ 模块, 参数名, 值 }, index) => {
        const bucket = this.modules[模块]
        if (!bucket || !bucket[ip]) {
          moduleNotFoundCount++
          notFoundParams.push(`第${index + 1}行: 模块"${模块}"`)
          return
        }

        let found = false
        let skipped = false

        bucket[ip].forEach((group) => {
          // 如果已经找到或跳过，不再处理
          if (found || skipped) return

          const it = group.element.find((el) => el.label === 参数名)
          if (!it) return

          // 找到了参数，检查是否在跳过的分类中
          if (skipImportCategories.has(group.classification)) {
            skipped = true
            skipCount++
          } else {
            // 特殊处理0x005a寄存器的三个参数
            if (it.address === '0x005a' && ['簇压模式', 'BMU动力接插件温度', 'BMU温度数据类型'].includes(参数名)) {
              // 对于0x005a的特殊参数，直接使用导入的值，不需要位操作
              // 因为这些参数在导出时已经是分离的值了
              it.importedValue = isNaN(+值) ? 值 : +值
            } else {
              it.importedValue = isNaN(+值) ? 值 : +值
            }
            found = true
            matchCount++
          }
        })

        if (!found && !skipped) {
          notFoundCount++
          notFoundParams.push(`第${index + 1}行: "${参数名}"`)
        }
      })

      const summary = `总行数:${rows.length}, 成功:${matchCount}, 跳过:${skipCount}, 参数未找到:${notFoundCount}, 模块未找到:${moduleNotFoundCount}`

      // 返回统计信息
      return {
        total: rows.length,
        success: matchCount,
        skipped: skipCount,
        notFound: notFoundCount,
        moduleNotFound: moduleNotFoundCount,
        notFoundParams: notFoundParams.slice(0, 10), // 只返回前10个未找到的参数
        summary
      }
    },

    /** 清空某个 IP 下所有模块的导入值 */
    clearImportedValues(ip) {
      Object.keys(this.modules).forEach((moduleName) => {
        const bucket = this.modules[moduleName]
        if (!bucket || !bucket[ip]) return

        bucket[ip].forEach((group) => {
          group.element.forEach((el) => {
            // 统一设置为 null，与初始化逻辑保持一致
            el.importedValue = null
          })
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
