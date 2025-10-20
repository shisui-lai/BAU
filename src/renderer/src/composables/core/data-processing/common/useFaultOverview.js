// 故障总览数据处理逻辑
import { ref, computed } from 'vue'

export function useFaultOverview() {
  
  // 原始数据存储 - 只保留FAULT_GRADE相关数据
  const blockGradeData = ref({})
  const clusterGradeData = ref({})

  // 故障等级颜色映射
  const getFaultLevelColor = (level) => {
    const colors = {
      0: 'normal',    // 正常/无故障 - 绿色
      1: 'severe',    // 严重 - 红色
      2: 'general',   // 一般 - 橙色
      3: 'minor'      // 轻微 - 黄色
    }
    return colors[level] || 'normal'
  }

  // 故障等级名称映射表 - 用于 *_FAULT_GRADE 表（29个故障项）
  const faultGradeNames = {
    'ClusterInterVoltageDiffFaultGrade': 'ClusterInterVoltageDiffFaultGrade',
    'ClusterInterCurrentDiffFaultGrade': 'ClusterInterCurrentDiffFaultGrade',
    'CellVoltageDiffFaultGrade': 'CellVoltageDiffFaultGrade',
    'CellTempDiffFaultGrade': 'CellTempDiffFaultGrade',
    'CellSocDiffFaultGrade': 'CellSocDiffFaultGrade',
    'PackVoltageDiffFaultGrade': 'PackVoltageDiffFaultGrade',
    'ClusterVoltageOverFaultGrade': 'ClusterVoltageOverFaultGrade',
    'ClusterVoltageUnderFaultGrade': 'ClusterVoltageUnderFaultGrade',
    'InsulationResistancePosFaultGrade': 'InsulationResistancePosFaultGrade',
    'InsulationResistanceNegFaultGrade': 'InsulationResistanceNegFaultGrade',
    'ChargeOvercurrentFaultGrade': 'ChargeOvercurrentFaultGrade',
    'DischargeOvercurrentFaultGrade': 'DischargeOvercurrentFaultGrade',
    'BcuRt1OvertempFaultGrade': 'BcuRt1OvertempFaultGrade',
    'BcuRt2OvertempFaultGrade': 'BcuRt2OvertempFaultGrade',
    'BcuRt3OvertempFaultGrade': 'BcuRt3OvertempFaultGrade',
    'BcuRt4OvertempFaultGrade': 'BcuRt4OvertempFaultGrade',
    'BcuRt5OvertempFaultGrade': 'BcuRt5OvertempFaultGrade',
    'PackOvervoltageFaultGrade': 'PackOvervoltageFaultGrade',
    'PackUndervoltageFaultGrade': 'PackUndervoltageFaultGrade',
    'PackOvertempFaultGrade': 'PackOvertempFaultGrade',
    'PackUndertempFaultGrade': 'PackUndertempFaultGrade',
    'PackPowerConnectorPosOvertempFaultGrade': 'PackPowerConnectorPosOvertempFaultGrade',
    'PackPowerConnectorNegOvertempFaultGrade': 'PackPowerConnectorNegOvertempFaultGrade',
    'CellOvervoltageFaultGrade': 'CellOvervoltageFaultGrade',
    'CellUndervoltageFaultGrade': 'CellUndervoltageFaultGrade',
    'CellChargeOvertempFaultGrade': 'CellChargeOvertempFaultGrade',
    'CellChargeUndertempFaultGrade': 'CellChargeUndertempFaultGrade',
    'CellDischargeOvertempFaultGrade': 'CellDischargeOvertempFaultGrade',
    'CellDischargeUndertempFaultGrade': 'CellDischargeUndertempFaultGrade',
    'CellSocTooHighFaultGrade': 'CellSocTooHighFaultGrade',
    'CellSocTooLowFaultGrade': 'CellSocTooLowFaultGrade'
  }

  // 簇级故障名称映射表 - 不包含簇间故障（27个故障项）
  const clusterFaultGradeNames = {
    'CellVoltageDiffFaultGrade': 'CellVoltageDiffFaultGrade',
    'CellTempDiffFaultGrade': 'CellTempDiffFaultGrade',
    'CellSocDiffFaultGrade': 'CellSocDiffFaultGrade',
    'PackVoltageDiffFaultGrade': 'PackVoltageDiffFaultGrade',
    'ClusterVoltageOverFaultGrade': 'ClusterVoltageOverFaultGrade',
    'ClusterVoltageUnderFaultGrade': 'ClusterVoltageUnderFaultGrade',
    'InsulationResistancePosFaultGrade': 'InsulationResistancePosFaultGrade',
    'InsulationResistanceNegFaultGrade': 'InsulationResistanceNegFaultGrade',
    'ChargeOvercurrentFaultGrade': 'ChargeOvercurrentFaultGrade',
    'DischargeOvercurrentFaultGrade': 'DischargeOvercurrentFaultGrade',
    'BcuRt1OvertempFaultGrade': 'BcuRt1OvertempFaultGrade',
    'BcuRt2OvertempFaultGrade': 'BcuRt2OvertempFaultGrade',
    'BcuRt3OvertempFaultGrade': 'BcuRt3OvertempFaultGrade',
    'BcuRt4OvertempFaultGrade': 'BcuRt4OvertempFaultGrade',
    'BcuRt5OvertempFaultGrade': 'BcuRt5OvertempFaultGrade',
    'PackOvervoltageFaultGrade': 'PackOvervoltageFaultGrade',
    'PackUndervoltageFaultGrade': 'PackUndervoltageFaultGrade',
    'PackOvertempFaultGrade': 'PackOvertempFaultGrade',
    'PackUndertempFaultGrade': 'PackUndertempFaultGrade',
    'PackPowerConnectorPosOvertempFaultGrade': 'PackPowerConnectorPosOvertempFaultGrade',
    'PackPowerConnectorNegOvertempFaultGrade': 'PackPowerConnectorNegOvertempFaultGrade',
    'CellOvervoltageFaultGrade': 'CellOvervoltageFaultGrade',
    'CellUndervoltageFaultGrade': 'CellUndervoltageFaultGrade',
    'CellChargeOvertempFaultGrade': 'CellChargeOvertempFaultGrade',
    'CellChargeUndertempFaultGrade': 'CellChargeUndertempFaultGrade',
    'CellDischargeOvertempFaultGrade': 'CellDischargeOvertempFaultGrade',
    'CellDischargeUndertempFaultGrade': 'CellDischargeUndertempFaultGrade',
    'CellSocTooHighFaultGrade': 'CellSocTooHighFaultGrade',
    'CellSocTooLowFaultGrade': 'CellSocTooLowFaultGrade'
  }

  // 辅助函数：从字段名获取故障等级名称
  const getFaultGradeName = (key) => {
    return faultGradeNames[key] || key
  }

  // ========== 堆级数据处理 ==========
  
  // 故障最高等级总览 - 使用 *_FAULT_GRADE 数据
  const processedBlockGradeOverview = computed(() => {
    // 如果没有数据，提供默认的29个故障项，全部显示为正常状态
    if (!blockGradeData.value.data) {
      return Object.values(faultGradeNames).map(name => ({
        name: name,
        level: 0,  // 正常状态
        color: 'normal'  // 绿色
      }))
    }

    const data = blockGradeData.value.data
    const faults = []

    // 处理新的数组格式数据 [{ class, element: [{ label, value }] }]
    // 先将数组格式转换为键值对格式，便于查找
    const flatData = {}
    if (Array.isArray(data)) {
      data.forEach(section => {
        if (section.element && Array.isArray(section.element)) {
          section.element.forEach(item => {
            // 🚀 优化：通过label直接映射到key，不依赖于完全匹配
            // 建立label到key的映射关系
            const labelToKeyMap = {
              '簇间压差过大故障等级': 'ClusterInterVoltageDiffFaultGrade',
              '簇间电流差异过大故障等级': 'ClusterInterCurrentDiffFaultGrade',
              '单体电压压差故障等级': 'CellVoltageDiffFaultGrade',
              '单体温度温差故障等级': 'CellTempDiffFaultGrade',
              '单体soc差故障等级': 'CellSocDiffFaultGrade',
              '包端电压压差故障等级': 'PackVoltageDiffFaultGrade',
              '簇端电压过压故障等级': 'ClusterVoltageOverFaultGrade',
              '簇端电压欠压故障等级': 'ClusterVoltageUnderFaultGrade',
              '绝缘电阻正对地报警等级': 'InsulationResistancePosFaultGrade',
              '绝缘电阻负对地报警等级': 'InsulationResistanceNegFaultGrade',
              '充电过流故障等级': 'ChargeOvercurrentFaultGrade',
              '放电过流故障等级': 'DischargeOvercurrentFaultGrade',
              'BCU RT1过温告警等级': 'BcuRt1OvertempFaultGrade',
              'BCU RT2过温告警等级': 'BcuRt2OvertempFaultGrade',
              'BCU RT3过温告警等级': 'BcuRt3OvertempFaultGrade',
              'BCU RT4过温告警等级': 'BcuRt4OvertempFaultGrade',
              'BCU RT5过温告警等级': 'BcuRt5OvertempFaultGrade',
              '包过压故障等级': 'PackOvervoltageFaultGrade',
              '包欠压故障等级': 'PackUndervoltageFaultGrade',
              '包过温故障等级': 'PackOvertempFaultGrade',
              '包欠温故障等级': 'PackUndertempFaultGrade',
              '动力接插件正极过温故障等级': 'PackPowerConnectorPosOvertempFaultGrade',
              '动力接插件负极过温故障等级': 'PackPowerConnectorNegOvertempFaultGrade',
              '单体电池过压故障等级': 'CellOvervoltageFaultGrade',
              '单体电池欠压故障等级': 'CellUndervoltageFaultGrade',
              '单体电池充电过温故障等级': 'CellChargeOvertempFaultGrade',
              '单体电池充电欠温故障等级': 'CellChargeUndertempFaultGrade',
              '单体电池放电过温故障等级': 'CellDischargeOvertempFaultGrade',
              '单体电池放电欠温故障等级': 'CellDischargeUndertempFaultGrade',
              '单体SOC过高故障等级': 'CellSocTooHighFaultGrade',
              '单体SOC过低故障等级': 'CellSocTooLowFaultGrade'
            }

            const key = labelToKeyMap[item.label]
            if (key) {
              flatData[key] = item.value
            }
          })
        }
      })
    } else {
      // 兼容旧格式（对象格式）
      Object.assign(flatData, data)
    }

    // 处理所有29个故障项
    Object.keys(faultGradeNames).forEach(key => {
      const faultData = flatData[key]
      // 处理bits对象格式：{ raw: 数字, txt: '字符串' }
      const level = faultData && typeof faultData === 'object' && 'raw' in faultData
        ? faultData.raw
        : (faultData || 0)
      faults.push({
        name: faultGradeNames[key],
        level: level,
        color: getFaultLevelColor(level)
      })
    })

    return faults
  })

  // ========== 簇级数据处理 ==========
  
  // 故障最高等级总览 - 使用 *_FAULT_GRADE 数据
  const processedClusterGradeOverview = computed(() => {
    // 如果没有数据，提供默认的簇数据（默认1个簇）
    if (!clusterGradeData.value.data) {
      const defaultClusters = []
      const clusterCount = 1  // 默认1个簇

    for (let i = 1; i <= clusterCount; i++) {
        const clusterFaults = Object.values(clusterFaultGradeNames).map(name => ({
          name: name,
          level: 0,  // 正常状态
          color: 'normal'  // 绿色
        }))

        defaultClusters.push({
        id: i,
          faults: clusterFaults
        })
      }

      return defaultClusters
    }

    const data = clusterGradeData.value.data
    const clusterCount = clusterGradeData.value.baseConfig?.clusterCount || 0
    const clusters = []

    // 处理新的数组格式数据 [{ class, element: [{ label, value }] }]
    // 先将数组格式转换为键值对格式，便于查找
    const flatData = {}
    if (Array.isArray(data)) {
      data.forEach(section => {
        if (section.element && Array.isArray(section.element)) {
          section.element.forEach(item => {
            // 从section.class中提取簇号，例如："第1簇模拟量故障等级1" -> 1
            const clusterMatch = section.class.match(/第(\d+)簇/)
            if (clusterMatch) {
              const clusterNum = parseInt(clusterMatch[1])

              // 🚀 优化：通过label直接映射到baseKey，不依赖于完全匹配
              // 建立label到baseKey的映射关系（簇级故障，不包含簇间故障）
              const labelToBaseKeyMap = {
                '单体电压压差故障等级': 'CellVoltageDiffFaultGrade',
                '单体温度温差故障等级': 'CellTempDiffFaultGrade',
                '单体soc差故障等级': 'CellSocDiffFaultGrade',
                '包端电压压差故障等级': 'PackVoltageDiffFaultGrade',
                '簇端电压过压故障等级': 'ClusterVoltageOverFaultGrade',
                '簇端电压欠压故障等级': 'ClusterVoltageUnderFaultGrade',
                '绝缘电阻正对地报警等级': 'InsulationResistancePosFaultGrade',
                '绝缘电阻负对地报警等级': 'InsulationResistanceNegFaultGrade',
                '充电过流故障等级': 'ChargeOvercurrentFaultGrade',
                '放电过流故障等级': 'DischargeOvercurrentFaultGrade',
                'BCU RT1过温告警等级': 'BcuRt1OvertempFaultGrade',
                'BCU RT2过温告警等级': 'BcuRt2OvertempFaultGrade',
                'BCU RT3过温告警等级': 'BcuRt3OvertempFaultGrade',
                'BCU RT4过温告警等级': 'BcuRt4OvertempFaultGrade',
                'BCU RT5过温告警等级': 'BcuRt5OvertempFaultGrade',
                '包过压故障等级': 'PackOvervoltageFaultGrade',
                '包欠压故障等级': 'PackUndervoltageFaultGrade',
                '包过温故障等级': 'PackOvertempFaultGrade',
                '包欠温故障等级': 'PackUndertempFaultGrade',
                '动力接插件正极过温故障等级': 'PackPowerConnectorPosOvertempFaultGrade',
                '动力接插件负极过温故障等级': 'PackPowerConnectorNegOvertempFaultGrade',
                '单体电池过压故障等级': 'CellOvervoltageFaultGrade',
                '单体电池欠压故障等级': 'CellUndervoltageFaultGrade',
                '单体电池充电过温故障等级': 'CellChargeOvertempFaultGrade',
                '单体电池充电欠温故障等级': 'CellChargeUndertempFaultGrade',
                '单体电池放电过温故障等级': 'CellDischargeOvertempFaultGrade',
                '单体电池放电欠温故障等级': 'CellDischargeUndertempFaultGrade',
                '单体SOC过高故障等级': 'CellSocTooHighFaultGrade',
                '单体SOC过低故障等级': 'CellSocTooLowFaultGrade'
              }

              const baseKey = labelToBaseKeyMap[item.label]
              if (baseKey) {
                const clusterKey = `Cluster${clusterNum}${baseKey}`
                flatData[clusterKey] = item.value
              }
            }
          })
        }
      })
    } else {
      // 兼容旧格式（对象格式）
      Object.assign(flatData, data)
    }

    for (let i = 1; i <= clusterCount; i++) {
      const clusterFaults = []

             // 处理所有27个故障项
       Object.keys(clusterFaultGradeNames).forEach(key => {
         const clusterKey = `Cluster${i}${key}`
         const faultData = flatData[clusterKey]
         // 处理bits对象格式：{ raw: 数字, txt: '字符串' }
         const level = faultData && typeof faultData === 'object' && 'raw' in faultData
           ? faultData.raw
           : (faultData || 0)
         clusterFaults.push({
           name: clusterFaultGradeNames[key],
           level: level,
           color: getFaultLevelColor(level)
         })
      })

      clusters.push({
        id: i,
        faults: clusterFaults
      })
    }

    return clusters
  })

  // 合并簇级数据 - 简化版本
  const processedClusterData = computed(() => {
    const gradeData = processedClusterGradeOverview.value
    
    return gradeData.map(gradeCluster => {
      return {
        id: gradeCluster.id,
        overview: gradeCluster.faults  // 只保留故障最高等级总览数据
      }
    })
  })

  return {
    // 原始数据 - 只保留FAULT_GRADE相关
    blockGradeData,
    clusterGradeData,
    
    // 处理后的数据
    processedBlockGradeOverview,      // 堆级故障最高等级总览
    processedClusterData,             // 簇级完整数据（只包含overview）
    
    // 工具函数
    getFaultLevelColor,
    getFaultGradeName
  }
} 