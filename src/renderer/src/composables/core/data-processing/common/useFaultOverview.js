// 故障总览数据处理逻辑
import { ref, computed } from 'vue'
import { useBlockStore } from '@/stores/device/blockStore'
import { useClusterStore } from '@/stores/device/clusterStore'

export function useFaultOverview() {
  const blockStore = useBlockStore()
  const clusterStore = useClusterStore()

  // 原始数据存储 - 只保留FAULT_GRADE相关数据
  const blockGradeData = ref({})
  const enClusterHardwareSumData = ref({})
  const clusterGradeData = ref({})

  // 故障等级颜色映射
  const getFaultLevelColor = (level) => {
    const colors = {
      0: 'normal', // 正常/无故障 - 绿色
      1: 'severe', // 严重 - 红色
      2: 'general', // 一般 - 橙色
      3: 'minor' // 轻微 - 黄色
    }
    return colors[level] || 'normal'
  }

  // 故障等级名称映射表 - 用于 *_FAULT_GRADE 表（29个故障项）
  const faultGradeNames = {
    ClusterInterVoltageDiffFaultGrade: 'ClusterInterVoltageDiffFaultGrade',
    ClusterInterCurrentDiffFaultGrade: 'ClusterInterCurrentDiffFaultGrade',
    CellVoltageDiffFaultGrade: 'CellVoltageDiffFaultGrade',
    CellTempDiffFaultGrade: 'CellTempDiffFaultGrade',
    CellSocDiffFaultGrade: 'CellSocDiffFaultGrade',
    PackVoltageDiffFaultGrade: 'PackVoltageDiffFaultGrade',
    ClusterVoltageOverFaultGrade: 'ClusterVoltageOverFaultGrade',
    ClusterVoltageUnderFaultGrade: 'ClusterVoltageUnderFaultGrade',
    InsulationResistancePosFaultGrade: 'InsulationResistancePosFaultGrade',
    InsulationResistanceNegFaultGrade: 'InsulationResistanceNegFaultGrade',
    ChargeOvercurrentFaultGrade: 'ChargeOvercurrentFaultGrade',
    DischargeOvercurrentFaultGrade: 'DischargeOvercurrentFaultGrade',
    BcuRt1OvertempFaultGrade: 'BcuRt1OvertempFaultGrade',
    BcuRt2OvertempFaultGrade: 'BcuRt2OvertempFaultGrade',
    BcuRt3OvertempFaultGrade: 'BcuRt3OvertempFaultGrade',
    BcuRt4OvertempFaultGrade: 'BcuRt4OvertempFaultGrade',
    BcuRt5OvertempFaultGrade: 'BcuRt5OvertempFaultGrade',
    PackOvervoltageFaultGrade: 'PackOvervoltageFaultGrade',
    PackUndervoltageFaultGrade: 'PackUndervoltageFaultGrade',
    PackOvertempFaultGrade: 'PackOvertempFaultGrade',
    PackUndertempFaultGrade: 'PackUndertempFaultGrade',
    PackPowerConnectorPosOvertempFaultGrade: 'PackPowerConnectorPosOvertempFaultGrade',
    PackPowerConnectorNegOvertempFaultGrade: 'PackPowerConnectorNegOvertempFaultGrade',
    CellOvervoltageFaultGrade: 'CellOvervoltageFaultGrade',
    CellUndervoltageFaultGrade: 'CellUndervoltageFaultGrade',
    CellChargeOvertempFaultGrade: 'CellChargeOvertempFaultGrade',
    CellChargeUndertempFaultGrade: 'CellChargeUndertempFaultGrade',
    CellDischargeOvertempFaultGrade: 'CellDischargeOvertempFaultGrade',
    CellDischargeUndertempFaultGrade: 'CellDischargeUndertempFaultGrade',
    CellSocTooHighFaultGrade: 'CellSocTooHighFaultGrade',
    CellSocTooLowFaultGrade: 'CellSocTooLowFaultGrade'
  }

  // 簇级故障名称映射表 - 不包含簇间故障（27个故障项）
  const clusterFaultGradeNames = {
    CellVoltageDiffFaultGrade: 'CellVoltageDiffFaultGrade',
    CellTempDiffFaultGrade: 'CellTempDiffFaultGrade',
    CellSocDiffFaultGrade: 'CellSocDiffFaultGrade',
    PackVoltageDiffFaultGrade: 'PackVoltageDiffFaultGrade',
    ClusterVoltageOverFaultGrade: 'ClusterVoltageOverFaultGrade',
    ClusterVoltageUnderFaultGrade: 'ClusterVoltageUnderFaultGrade',
    InsulationResistancePosFaultGrade: 'InsulationResistancePosFaultGrade',
    InsulationResistanceNegFaultGrade: 'InsulationResistanceNegFaultGrade',
    ChargeOvercurrentFaultGrade: 'ChargeOvercurrentFaultGrade',
    DischargeOvercurrentFaultGrade: 'DischargeOvercurrentFaultGrade',
    BcuRt1OvertempFaultGrade: 'BcuRt1OvertempFaultGrade',
    BcuRt2OvertempFaultGrade: 'BcuRt2OvertempFaultGrade',
    BcuRt3OvertempFaultGrade: 'BcuRt3OvertempFaultGrade',
    BcuRt4OvertempFaultGrade: 'BcuRt4OvertempFaultGrade',
    BcuRt5OvertempFaultGrade: 'BcuRt5OvertempFaultGrade',
    PackOvervoltageFaultGrade: 'PackOvervoltageFaultGrade',
    PackUndervoltageFaultGrade: 'PackUndervoltageFaultGrade',
    PackOvertempFaultGrade: 'PackOvertempFaultGrade',
    PackUndertempFaultGrade: 'PackUndertempFaultGrade',
    PackPowerConnectorPosOvertempFaultGrade: 'PackPowerConnectorPosOvertempFaultGrade',
    PackPowerConnectorNegOvertempFaultGrade: 'PackPowerConnectorNegOvertempFaultGrade',
    CellOvervoltageFaultGrade: 'CellOvervoltageFaultGrade',
    CellUndervoltageFaultGrade: 'CellUndervoltageFaultGrade',
    CellChargeOvertempFaultGrade: 'CellChargeOvertempFaultGrade',
    CellChargeUndertempFaultGrade: 'CellChargeUndertempFaultGrade',
    CellDischargeOvertempFaultGrade: 'CellDischargeOvertempFaultGrade',
    CellDischargeUndertempFaultGrade: 'CellDischargeUndertempFaultGrade',
    CellSocTooHighFaultGrade: 'CellSocTooHighFaultGrade',
    CellSocTooLowFaultGrade: 'CellSocTooLowFaultGrade'
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
      return Object.values(faultGradeNames).map((name) => ({
        name: name,
        level: 0, // 正常状态
        color: 'normal' // 绿色
      }))
    }

    const data = blockGradeData.value.data
    const faults = []

    // 处理新的数组格式数据 [{ class, element: [{ label, value }] }]
    // 先将数组格式转换为键值对格式，便于查找
    const flatData = {}
    if (Array.isArray(data)) {
      data.forEach((section) => {
        if (section.element && Array.isArray(section.element)) {
          section.element.forEach((item) => {
            // 🚀 优化：通过label直接映射到key，不依赖于完全匹配
            // 建立label到key的映射关系
            const labelToKeyMap = {
              簇间压差过大故障: 'ClusterInterVoltageDiffFaultGrade',
              簇间电流差过大故障: 'ClusterInterCurrentDiffFaultGrade',
              单体电压压差故障等级: 'CellVoltageDiffFaultGrade',
              单体温度温差故障等级: 'CellTempDiffFaultGrade',
              单体soc差故障等级: 'CellSocDiffFaultGrade',
              包端电压压差故障等级: 'PackVoltageDiffFaultGrade',
              簇端电压过压故障等级: 'ClusterVoltageOverFaultGrade',
              簇端电压欠压故障等级: 'ClusterVoltageUnderFaultGrade',
              绝缘电阻正对地报警等级: 'InsulationResistancePosFaultGrade',
              绝缘电阻负对地报警等级: 'InsulationResistanceNegFaultGrade',
              充电过流故障等级: 'ChargeOvercurrentFaultGrade',
              放电过流故障等级: 'DischargeOvercurrentFaultGrade',
              'BCU RT1过温告警等级': 'BcuRt1OvertempFaultGrade',
              'BCU RT2过温告警等级': 'BcuRt2OvertempFaultGrade',
              'BCU RT3过温告警等级': 'BcuRt3OvertempFaultGrade',
              'BCU RT4过温告警等级': 'BcuRt4OvertempFaultGrade',
              'BCU RT5过温告警等级': 'BcuRt5OvertempFaultGrade',
              包过压故障等级: 'PackOvervoltageFaultGrade',
              包欠压故障等级: 'PackUndervoltageFaultGrade',
              包过温故障等级: 'PackOvertempFaultGrade',
              包欠温故障等级: 'PackUndertempFaultGrade',
              动力接插件正极过温故障等级: 'PackPowerConnectorPosOvertempFaultGrade',
              动力接插件负极过温故障等级: 'PackPowerConnectorNegOvertempFaultGrade',
              单体电池过压故障等级: 'CellOvervoltageFaultGrade',
              单体电池欠压故障等级: 'CellUndervoltageFaultGrade',
              单体电池充电过温故障等级: 'CellChargeOvertempFaultGrade',
              单体电池充电欠温故障等级: 'CellChargeUndertempFaultGrade',
              单体电池放电过温故障等级: 'CellDischargeOvertempFaultGrade',
              单体电池放电欠温故障等级: 'CellDischargeUndertempFaultGrade',
              单体SOC过高故障等级: 'CellSocTooHighFaultGrade',
              单体SOC过低故障等级: 'CellSocTooLowFaultGrade'
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
    Object.keys(faultGradeNames).forEach((key) => {
      const faultData = flatData[key]
      // 处理bits对象格式：{ raw: 数字, txt: '字符串' }
      const level =
        faultData && typeof faultData === 'object' && 'raw' in faultData
          ? faultData.raw
          : faultData || 0
      faults.push({
        name: faultGradeNames[key],
        level: level,
        color: getFaultLevelColor(level)
      })
    })

    return faults
  })

  const processedEnClusterHardwareSum = computed(() => {
    if (!enClusterHardwareSumData.value.data) return []
    const hwData = enClusterHardwareSumData.value.data
    const faults = []
    const skipLabel = (lbl) => /预留/.test(lbl)
    const HIDE_KEYS = new Set([
      'MainPosHighSideFeedbackFault2',
      'MainNegHighSideFeedbackFault2',
      'PrechargeHighSideFeedbackFault2',
      'BMUDeviceCommFault2',
      'SingleCellDropped2',
      'SingleTempProbeDropped2',
      'AFECommLost2'
    ])
    const labelToKeyMap = {
      主正接触器反馈故障: 'MainPosContactorFeedbackFault',
      主正高边驱动反馈故障: 'MainPosHighSideFeedbackFault',
      主正氧化: 'MainPosOxidation',
      主正黏连: 'MainPosAdhesion',
      '主正接触器故障 汇总': 'MainPosContactorFaultSummary',
      主负接触器反馈故障: 'MainNegContactorFeedbackFault',
      主负高边驱动反馈故障: 'MainNegHighSideFeedbackFault',
      主负氧化: 'MainNegOxidation',
      主负黏连: 'MainNegAdhesion',
      '主负接触器故障 汇总': 'MainNegContactorFaultSummary',
      预充接触器反馈故障: 'PrechargeContactorFeedbackFault',
      预充高边驱动反馈故障: 'PrechargeHighSideFeedbackFault',
      预充氧化: 'PrechargeOxidation',
      预充黏连: 'PrechargeAdhesion',
      '预充接触器故障 汇总': 'PrechargeContactorFaultSummary',
      汇总的故障: 'ContactorFaultSummary',
      隔离开关反馈故障: 'IsolationSwitchFeedbackFault',
      断路器反馈故障: 'CircuitBreakerFeedbackFault',
      风扇反馈故障: 'FanFeedbackFault',
      直流供电KM反馈故障: 'DCPowerKMFeedbackFault',
      门禁反馈故障: 'AccessControlFeedbackFault',
      SPD反馈故障: 'SPDFeedbackFault',
      交流电压反馈故障: 'ACVoltageFeedbackFault',
      烟感反馈故障: 'SmokeSensorFeedbackFault',
      消防释放信号: 'FireReleaseSignal',
      温感反馈故障: 'TempSensorFeedbackFault',
      排风系统反馈故障: 'ExhaustSystemFeedbackFault',
      辅助断路器反馈故障: 'AuxCircuitBreakerFeedbackFault',
      氢气探测器反馈故障: 'HydrogenDetectorFeedbackFault',
      MSD反馈故障: 'MSDFeedbackFault',
      急停反馈故障: 'EmergencyStopFeedbackFault',
      主正高边驱动反馈故障: 'MainPosHighSideFeedbackFault2',
      主负高边驱动反馈故障: 'MainNegHighSideFeedbackFault2',
      预充高边驱动反馈故障: 'PrechargeHighSideFeedbackFault2',
      红灯高边驱动反馈故障: 'RedLampHighSideFeedbackFault',
      黄灯高边驱动反馈故障: 'YellowLampHighSideFeedbackFault',
      绿灯高边驱动反馈故障: 'GreenLampHighSideFeedbackFault',
      风机高边驱动反馈故障: 'FanHighSideFeedbackFault2',
      主断分励高边驱动反馈故障: 'MainBreakerShuntHighSideFeedbackFault',
      直流供电KM高边驱动反馈故障: 'DCPowerKMHighSideFeedbackFault2',
      pcs封波高边驱动反馈故障: 'PCSSealedWaveHighSideFeedbackFault',
      辅助断路器控制高边驱动反馈故障: 'AuxCircuitBreakerControlHighSideFeedbackFault',
      排风系统控制高边驱动反馈故障: 'ExhaustSystemControlHighSideFeedbackFault',
      制冷设备通信故障: 'CoolingDeviceCommFault2',
      PCS设备通信故障: 'PCSCommFault2',
      除湿机通信故障: 'DehumidifierCommFault2',
      消防设备通信故障: 'FireDeviceCommFault2',
      BMU通信故障: 'BMUCommFault2',
      CAN霍尔通信故障: 'CANHallCommFault2',
      BCU内网通讯故障: 'BCUCommFault',
      菊花链通信故障: 'DaisyChainCommFault',
      afe通信故障: 'AFECommFault2',
      bcu环境传感器故障: 'BCUEnvSensorFault2',
      'B+传感器故障': 'BPosSensorFault2',
      'B-传感器故障': 'BNegSensorFault2',
      'P+传感器故障': 'PPosSensorFault2',
      'P-传感器故障': 'PNegSensorFault2',
      熔断器1传感器故障: 'Fuse1TempSensorFault2',
      熔断器2传感器故障: 'Fuse2TempSensorFault2',
      霍尔故障: 'HallFault2',
      存在无效数据: 'InvalidDataPresent2',
      铁电存储器故障: 'FRAMFault2',
      eeprom存储器故障: 'EEPROMFault2',
      flash存储器故障: 'FlashFault2',
      电压采集断线: 'VoltageAcqDisconnected2',
      温度采集断线: 'TempAcqDisconnected2',
      保留故障: 'ReservedFault2',
      BMU设备通讯故障: 'BMUDeviceCommFault2',
      单体电池掉线: 'SingleCellDropped2',
      单体温度探头掉线: 'SingleTempProbeDropped2',
      'BMU 1号 动力接插件温度断线': 'BMU1PowerConnectorTempDisconnected2',
      'BMU 2号 动力接插件温度断线': 'BMU2PowerConnectorTempDisconnected2',
      AFE通讯失联: 'AFECommLost2',
      BCU通讯故障: 'BCUCommFault_Stack',
      BCU通信故障: 'BCUCommFault_Stack'
    }

    hwData.forEach((section) => {
      if (section.element && Array.isArray(section.element)) {
        section.element.forEach((item) => {
          if (skipLabel(item.label)) return
          const key = labelToKeyMap[item.label] || item.label
          if (HIDE_KEYS.has(key)) return
          const level = item.value ? 1 : 0
          faults.push({ name: key, level, color: getFaultLevelColor(level) })
        })
      }
    })
    return faults
  })

  // ========== 簇级数据处理 ==========

  // 故障最高等级总览 - 使用 *_FAULT_GRADE 数据
  const processedClusterGradeOverview = computed(() => {
    // 如果没有数据，提供默认的簇数据（默认1个簇）
    if (!clusterGradeData.value.data) {
      const defaultClusters = []
      // 优化：根据当前选中堆的系统配置簇数生成默认簇列表
      // 1) 优先使用消息里携带的 baseConfig.clusterCount
      // 2) 其次使用全局 clusterStore 的 availableClusters 中该堆的簇数量
      // 3) 最后兜底为 1
      let clusterCount = 1
      const msgClusterCount = clusterGradeData.value.baseConfig?.clusterCount
      if (typeof msgClusterCount === 'number' && msgClusterCount > 0) {
        clusterCount = msgClusterCount
      } else {
        const selectedBlockKey = blockStore.selectedBlockForView
        const selectedBlockNum = selectedBlockKey
          ? parseInt(String(selectedBlockKey).replace('block', ''))
          : null
        if (selectedBlockNum && !isNaN(selectedBlockNum)) {
          const cfgCount = clusterStore.availableClusters.filter(
            (opt) => opt.block === selectedBlockNum
          ).length
          if (cfgCount > 0) {
            clusterCount = cfgCount
          }
        }
      }

      for (let i = 1; i <= clusterCount; i++) {
        const clusterFaults = Object.values(clusterFaultGradeNames).map((name) => ({
          name: name,
          level: 0, // 正常状态
          color: 'normal' // 绿色
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
      data.forEach((section) => {
        if (section.element && Array.isArray(section.element)) {
          section.element.forEach((item) => {
            // 从section.class中提取簇号，例如："第1簇模拟量故障等级1" -> 1
            const clusterMatch = section.class.match(/第(\d+)簇/)
            if (clusterMatch) {
              const clusterNum = parseInt(clusterMatch[1])

              // 🚀 优化：通过label直接映射到baseKey，不依赖于完全匹配
              // 建立label到baseKey的映射关系（簇级故障，不包含簇间故障）
              const labelToBaseKeyMap = {
                单体电压压差故障等级: 'CellVoltageDiffFaultGrade',
                单体温度温差故障等级: 'CellTempDiffFaultGrade',
                单体soc差故障等级: 'CellSocDiffFaultGrade',
                包端电压压差故障等级: 'PackVoltageDiffFaultGrade',
                簇端电压过压故障等级: 'ClusterVoltageOverFaultGrade',
                簇端电压欠压故障等级: 'ClusterVoltageUnderFaultGrade',
                绝缘电阻正对地报警等级: 'InsulationResistancePosFaultGrade',
                绝缘电阻负对地报警等级: 'InsulationResistanceNegFaultGrade',
                充电过流故障等级: 'ChargeOvercurrentFaultGrade',
                放电过流故障等级: 'DischargeOvercurrentFaultGrade',
                'BCU RT1过温告警等级': 'BcuRt1OvertempFaultGrade',
                'BCU RT2过温告警等级': 'BcuRt2OvertempFaultGrade',
                'BCU RT3过温告警等级': 'BcuRt3OvertempFaultGrade',
                'BCU RT4过温告警等级': 'BcuRt4OvertempFaultGrade',
                'BCU RT5过温告警等级': 'BcuRt5OvertempFaultGrade',
                包过压故障等级: 'PackOvervoltageFaultGrade',
                包欠压故障等级: 'PackUndervoltageFaultGrade',
                包过温故障等级: 'PackOvertempFaultGrade',
                包欠温故障等级: 'PackUndertempFaultGrade',
                动力接插件正极过温故障等级: 'PackPowerConnectorPosOvertempFaultGrade',
                动力接插件负极过温故障等级: 'PackPowerConnectorNegOvertempFaultGrade',
                单体电池过压故障等级: 'CellOvervoltageFaultGrade',
                单体电池欠压故障等级: 'CellUndervoltageFaultGrade',
                单体电池充电过温故障等级: 'CellChargeOvertempFaultGrade',
                单体电池充电欠温故障等级: 'CellChargeUndertempFaultGrade',
                单体电池放电过温故障等级: 'CellDischargeOvertempFaultGrade',
                单体电池放电欠温故障等级: 'CellDischargeUndertempFaultGrade',
                单体SOC过高故障等级: 'CellSocTooHighFaultGrade',
                单体SOC过低故障等级: 'CellSocTooLowFaultGrade'
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
      Object.keys(clusterFaultGradeNames).forEach((key) => {
        const clusterKey = `Cluster${i}${key}`
        const faultData = flatData[clusterKey]
        // 处理bits对象格式：{ raw: 数字, txt: '字符串' }
        const level =
          faultData && typeof faultData === 'object' && 'raw' in faultData
            ? faultData.raw
            : faultData || 0
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
    return gradeData.map((gradeCluster) => ({ id: gradeCluster.id, overview: gradeCluster.faults }))
  })

  return {
    // 原始数据 - 只保留FAULT_GRADE相关
    blockGradeData,
    enClusterHardwareSumData,
    clusterGradeData,

    // 处理后的数据
    processedBlockGradeOverview,
    processedEnClusterHardwareSum,
    processedClusterData, // 簇级完整数据（只包含overview）

    // 工具函数
    getFaultLevelColor,
    getFaultGradeName
  }
}
