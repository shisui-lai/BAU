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
    'ClusterInterVoltageDiffFaultGrade': '簇间压差过大故障',
    'ClusterInterCurrentDiffFaultGrade': '簇间电流差异过大故障',
    'CellVoltageDiffFaultGrade': '单体电压压差故障',
    'CellTempDiffFaultGrade': '单体温度温差故障',
    'CellSocDiffFaultGrade': '单体soc差故障',
    'PackVoltageDiffFaultGrade': '包端电压压差故障',
    'ClusterVoltageOverFaultGrade': '簇端电压过压故障',
    'ClusterVoltageUnderFaultGrade': '簇端电压欠压故障',
    'InsulationResistancePosFaultGrade': '绝缘电阻正对地报警',
    'InsulationResistanceNegFaultGrade': '绝缘电阻负对地报警',
    'ChargeOvercurrentFaultGrade': '充电过流故障',
    'DischargeOvercurrentFaultGrade': '放电过流故障',
    'BcuRt1OvertempFaultGrade': 'BCU RT1过温告警',
    'BcuRt2OvertempFaultGrade': 'BCU RT2过温告警',
    'BcuRt3OvertempFaultGrade': 'BCU RT3过温告警',
    'BcuRt4OvertempFaultGrade': 'BCU RT4过温告警',
    'BcuRt5OvertempFaultGrade': 'BCU RT5过温告警',
    'PackOvervoltageFaultGrade': '包过压故障',
    'PackUndervoltageFaultGrade': '包欠压故障',
    'PackOvertempFaultGrade': '包过温故障',
    'PackUndertempFaultGrade': '包欠温故障',
    'PackPowerConnectorPosOvertempFaultGrade': '动力接插件正极过温故障',
    'PackPowerConnectorNegOvertempFaultGrade': '动力接插件负极过温故障',
    'CellOvervoltageFaultGrade': '单体电池过压故障',
    'CellUndervoltageFaultGrade': '单体电池欠压故障',
    'CellChargeOvertempFaultGrade': '单体电池充电过温故障',
    'CellChargeUndertempFaultGrade': '单体电池充电欠温故障',
    'CellDischargeOvertempFaultGrade': '单体电池放电过温故障',
    'CellDischargeUndertempFaultGrade': '单体电池放电欠温故障',
    'CellSocTooHighFaultGrade': '单体soc过高故障',
    'CellSocTooLowFaultGrade': '单体soc过低故障',

  }

  // 簇级故障名称映射表 - 不包含簇间故障（27个故障项）
  const clusterFaultGradeNames = {
    'CellVoltageDiffFaultGrade': '单体电压压差故障',
    'CellTempDiffFaultGrade': '单体温度温差故障',
    'CellSocDiffFaultGrade': '单体soc差故障',
    'PackVoltageDiffFaultGrade': '包端电压压差故障',
    'ClusterVoltageOverFaultGrade': '簇端电压过压故障',
    'ClusterVoltageUnderFaultGrade': '簇端电压欠压故障',
    'InsulationResistancePosFaultGrade': '绝缘电阻正对地报警',
    'InsulationResistanceNegFaultGrade': '绝缘电阻负对地报警',
    'ChargeOvercurrentFaultGrade': '充电过流故障',
    'DischargeOvercurrentFaultGrade': '放电过流故障',
    'BcuRt1OvertempFaultGrade': 'BCU RT1过温告警',
    'BcuRt2OvertempFaultGrade': 'BCU RT2过温告警',
    'BcuRt3OvertempFaultGrade': 'BCU RT3过温告警',
    'BcuRt4OvertempFaultGrade': 'BCU RT4过温告警',
    'BcuRt5OvertempFaultGrade': 'BCU RT5过温告警',
    'PackOvervoltageFaultGrade': '包过压故障',
    'PackUndervoltageFaultGrade': '包欠压故障',
    'PackOvertempFaultGrade': '包过温故障',
    'PackUndertempFaultGrade': '包欠温故障',
    'PackPowerConnectorPosOvertempFaultGrade': '动力接插件正极过温故障',
    'PackPowerConnectorNegOvertempFaultGrade': '动力接插件负极过温故障',
    'CellOvervoltageFaultGrade': '单体电池过压故障',
    'CellUndervoltageFaultGrade': '单体电池欠压故障',
    'CellChargeOvertempFaultGrade': '单体电池充电过温故障',
    'CellChargeUndertempFaultGrade': '单体电池充电欠温故障',
    'CellDischargeOvertempFaultGrade': '单体电池放电过温故障',
    'CellDischargeUndertempFaultGrade': '单体电池放电欠温故障',
    'CellSocTooHighFaultGrade': '单体soc过高故障',
    'CellSocTooLowFaultGrade': '单体soc过低故障'
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
    
    // 处理所有29个故障项
    Object.keys(faultGradeNames).forEach(key => {
      const faultData = data[key]
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
    
    for (let i = 1; i <= clusterCount; i++) {
      const clusterFaults = []
      
             // 处理所有27个故障项
       Object.keys(clusterFaultGradeNames).forEach(key => {
         const clusterKey = `Cluster${i}${key}`
         const faultData = data[clusterKey]
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