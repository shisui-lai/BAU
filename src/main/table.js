  export const ALARM_MAP = {
    0: '无故障',
    1: '严重报警',
    2: '一般报警',
    3: '轻微报警'
  };


  // //堆下信息
  // export const BLOCK_BATT_PARAM_R = [
  //   {class:'BMU信息', key:`BmuTotal`,      label:`堆-BMU 总数`,   type:'u16', scale:1 },
  //   {class:'BMU信息', key:`AfePerBmu`,     label:`BMU 下 AFE 数`,      type:'u16', scale:1 },

  //   /* 16 × AFE-Cell 数量 */
  //   ...Array.from({ length:16 }, (_, i) => ({
  //     class:'AFE电压',
  //     key  :`Afe${i+1}Cell`,
  //     label:`AFE${i+1} 电芯数`,
  //     type :'u16', scale:1,
  //   })),

  //   /* 16 × AFE-Temp 数量 */
  //   ...Array.from({ length:16 }, (_, i) => ({
  //     class:'AFE温度',
  //     key  :`Afe${i+1}Temp`,
  //     label:`AFE${i+1} 温度数`,
  //     type :'s16', scale:1,
  //   })),

  //   /* 32 × 虚拟偏移 */
  //   ...Array.from({ length:32 }, (_, i) => ({
  //     class:'虚拟偏移',
  //     key  :`VirtOffset${i+1}`,
  //     label:`虚拟 Cell 偏移 ${i+1}`,
  //     type :'u16', scale:1,
  //   })),
  // ];

  // * 38-byte header  ——  单体电压 / 温度 / SOC / SOH 公用
  export const CELL_HEADER = [
    {key: 'dataLength',  label: '数据长度',      type: 'u16', scale: 1 },
    {key: 'totalCell',  label: '电芯总数量',      type: 'u16', scale: 1 },
    {key: 'totalTemp',  label: '温感总数量',      type: 'u16', scale: 1 },
    {key: 'bmuTotal',   label: 'BMU 总数量',      type: 'u8',  scale: 1 },
    {key: 'afePerBmu',  label: 'BMU 下 AFE 数',   type: 'u8',  scale: 1 },

    /* 16 × AFE-Cell/Temp 计数 */
    ...Array.from({ length: 16 }, (_, i) => ({
      key: `afeCell${i + 1}`, label: `AFE${i + 1} 电芯数`,  type: 'u8', scale: 1
    })),
    ...Array.from({ length: 16 }, (_, i) => ({
      key: `afeTemp${i + 1}`, label: `AFE${i + 1} 温度数`,  type: 'u8', scale: 1
    }))
  ]

  //系统概要信息表
  export const SYS_ABSTRACT = [
    /* 单体电压极值段（0-31）------------------------------------------------ */
    { class:'单体电压概要', key:'MaxCellVoltage1',    label:'单体最大电压1(V)', type:'s16', scale:1000 },
    { class:'单体电压概要', key:'MaxCellVoltage1Num', label:'单体最大电压编号1', type:'s16', scale:1    },
    { class:'单体电压概要', key:'MaxCellVoltage2',    label:'单体最大电压2(V)', type:'s16', scale:1000 },
    { class:'单体电压概要', key:'MaxCellVoltage2Num', label:'单体最大电压编号2', type:'s16', scale:1    },
    { class:'单体电压概要', key:'MaxCellVoltage3',    label:'单体最大电压3(V)', type:'s16', scale:1000 },
    { class:'单体电压概要', key:'MaxCellVoltage3Num', label:'单体最大电压编号3', type:'s16', scale:1    },

    { class:'单体电压概要', key:'MinCellVoltage1',    label:'单体最小电压1(V)', type:'s16', scale:1000 },
    { class:'单体电压概要', key:'MinCellVoltage1Num', label:'单体最小电压编号1', type:'s16', scale:1    },
    { class:'单体电压概要', key:'MinCellVoltage2',    label:'单体最小电压2(V)', type:'s16', scale:1000 },
    { class:'单体电压概要', key:'MinCellVoltage2Num', label:'单体最小电压编号2', type:'s16', scale:1    },
    { class:'单体电压概要', key:'MinCellVoltage3',    label:'单体最小电压3(V)', type:'s16', scale:1000 },
    { class:'单体电压概要', key:'MinCellVoltage3Num', label:'单体最小电压编号3', type:'s16', scale:1 },

    { class:'单体电压概要', key:'AverCellVoltage',    label:'平均电压(V)',     type:'s16', scale:1000 },
    { class:'单体电压概要', key:'RangeCellVoltage',   label:'电压极差(V)',     type:'s16', scale:1000 },
    // { class:'单体电压概要', key:'ReservedCellVoltage',label:'预留',           type:'u16', scale:1    },
    { key:'_skip1', type:'skip4' },

    { class:'单体温度概要', key:'MaxCellTemp1',    label:'单体最大温度1(℃)', type:'s16', scale:10 },
    { class:'单体温度概要', key:'MaxCellTemp1Num', label:'单体最大温度编号1', type:'s16', scale:1  },
    { class:'单体温度概要', key:'MaxCellTemp2',    label:'单体最大温度2(℃)', type:'s16', scale:10 },
    { class:'单体温度概要', key:'MaxCellTemp2Num', label:'单体最大温度编号2', type:'s16', scale:1  },
    { class:'单体温度概要', key:'MaxCellTemp3',    label:'单体最大温度3(℃)', type:'s16', scale:10 },
    { class:'单体温度概要', key:'MaxCellTemp3Num', label:'单体最大温度编号3', type:'s16', scale:1  },

    { class:'单体温度概要', key:'MinCellTemp1',    label:'单体最小温度1(℃)', type:'s16', scale:10 },
    { class:'单体温度概要', key:'MinCellTemp1Num', label:'单体最小温度编号1', type:'s16', scale:1  },
    { class:'单体温度概要', key:'MinCellTemp2',    label:'单体最小温度2(℃)', type:'s16', scale:10 },
    { class:'单体温度概要', key:'MinCellTemp2Num', label:'单体最小温度编号2', type:'s16', scale:1  },
    { class:'单体温度概要', key:'MinCellTemp3',    label:'单体最小温度3(℃)', type:'s16', scale:10 },
    { class:'单体温度概要', key:'MinCellTemp3Num', label:'单体最小温度编号3', type:'s16', scale:1  },

    { class:'单体温度概要', key:'AverCellTemp',    label:'平均温度(℃)',       type:'s16', scale:10 },
    { class:'单体温度概要', key:'RangeCellTemp',   label:'温度极差(℃)',       type:'s16', scale:10 },
    // { class:'单体温度概要', key:'ReservedCellTemp',label:'预留',              type:'u16', scale:1  },
    { key:'_skip2', type:'skip4' },

    { class:'BMU电压概要', key:'MaxBmuVoltage1',    label:'BMU最大电压1(V)', type:'s16', scale:10 },
    { class:'BMU电压概要', key:'MaxBmuVoltage1Num', label:'BMU最大电压编号1',            type:'s16', scale:1  },
    { class:'BMU电压概要', key:'MaxBmuVoltage2',    label:'BMU最大电压2(V)', type:'s16', scale:10 },
    { class:'BMU电压概要', key:'MaxBmuVoltage2Num', label:'BMU最大电压编号2',            type:'s16', scale:1  },
    { class:'BMU电压概要', key:'MaxBmuVoltage3',    label:'BMU最大电压3(V)', type:'s16', scale:10 },
    { class:'BMU电压概要', key:'MaxBmuVoltage3Num', label:'BMU最大电压编号3',            type:'s16', scale:1  },

    { class:'BMU电压概要', key:'MinBmuVoltage1',    label:'BMU最小电压1(V)', type:'s16', scale:10 },
    { class:'BMU电压概要', key:'MinBmuVoltage1Num', label:'BMU最小电压编号1',            type:'s16', scale:1  },
    { class:'BMU电压概要', key:'MinBmuVoltage2',    label:'BMU最小电压2(V)', type:'s16', scale:10 },
    { class:'BMU电压概要', key:'MinBmuVoltage2Num', label:'BMU最小电压编号2',            type:'s16', scale:1  },
    { class:'BMU电压概要', key:'MinBmuVoltage3',    label:'BMU最小电压3(V)', type:'s16', scale:10 },
    { class:'BMU电压概要', key:'MinBmuVoltage3Num', label:'BMU最小电压编号3',            type:'s16', scale:1  },

    { class:'BMU电压概要', key:'AverBmuVoltage',    label:'平均电压(V)',     type:'s16', scale:10 },
    { class:'BMU电压概要', key:'RangeBmuVoltage',   label:'电压极差(V)',     type:'s16', scale:10 },
    // { class:'BMU电压概要', key:'ReservedBmuVoltage',label:'预留',            type:'u16', scale:1  },
    { key:'_skip3', type:'skip4' },

    { class:'BMU温度概要', key:'MaxBmuTemp1',    label:'BMU最大温度1(℃)', type:'s16', scale:10 },
    { class:'BMU温度概要', key:'MaxBmuTemp1Num', label:'BMU最大温度编号1',            type:'s16', scale:1  },
    { class:'BMU温度概要', key:'MaxBmuTemp2',    label:'BMU最大温度2(℃)', type:'s16', scale:10 },
    { class:'BMU温度概要', key:'MaxBmuTemp2Num', label:'BMU最大温度编号2',            type:'s16', scale:1  },
    { class:'BMU温度概要', key:'MaxBmuTemp3',    label:'BMU最大温度3(℃)', type:'s16', scale:10 },
    { class:'BMU温度概要', key:'MaxBmuTemp3Num', label:'BMU最大温度编号3',            type:'s16', scale:1  },

    { class:'BMU温度概要', key:'MinBmuTemp1',    label:'BMU最小温度1(℃)', type:'s16', scale:10 },
    { class:'BMU温度概要', key:'MinBmuTemp1Num', label:'BMU最小温度编号1',            type:'s16', scale:1  },
    { class:'BMU温度概要', key:'MinBmuTemp2',    label:'BMU最小温度2(℃)', type:'s16', scale:10 },
    { class:'BMU温度概要', key:'MinBmuTemp2Num', label:'BMU最小温度编号2',            type:'s16', scale:1  },
    { class:'BMU温度概要', key:'MinBmuTemp3',    label:'BMU最小温度3(℃)', type:'s16', scale:10 },
    { class:'BMU温度概要', key:'MinBmuTemp3Num', label:'BMU最小温度编号3',            type:'s16', scale:1  },

    { class:'BMU温度概要', key:'AverBmuTemp',    label:'平均温度(℃)',     type:'s16', scale:10 },
    { class:'BMU温度概要', key:'RangeBmuTemp',   label:'温度极差(℃)',     type:'s16', scale:10 },
    // { class:'BMU温度概要', key:'ReservedBmuTemp',label:'预留',            type:'u16', scale:1  },
    { key:'_skip4', type:'skip4' },

    { class:'电芯SOC概要', key:'MaxCellSOC1',    label:'单体最大SOC1(%)', type:'s16', scale:10 },
    { class:'电芯SOC概要', key:'MaxCellSOC1Num', label:'单体最大SOC编号1',            type:'s16', scale:1  },
    { class:'电芯SOC概要', key:'MaxCellSOC2',    label:'单体最大SOC2(%)', type:'s16', scale:10 },
    { class:'电芯SOC概要', key:'MaxCellSOC2Num', label:'单体最大SOC编号2',            type:'s16', scale:1  },
    { class:'电芯SOC概要', key:'MaxCellSOC3',    label:'单体最大SOC3(%)', type:'s16', scale:10 },
    { class:'电芯SOC概要', key:'MaxCellSOC3Num', label:'单体最大SOC编号3',            type:'s16', scale:1  },

    { class:'电芯SOC概要', key:'MinCellSOC1',    label:'单体最小SOC1(%)', type:'s16', scale:10 },
    { class:'电芯SOC概要', key:'MinCellSOC1Num', label:'单体最小SOC编号1',            type:'s16', scale:1  },
    { class:'电芯SOC概要', key:'MinCellSOC2',    label:'单体最小SOC2(%)', type:'s16', scale:10 },
    { class:'电芯SOC概要', key:'MinCellSOC2Num', label:'单体最小SOC编号2',            type:'s16', scale:1  },
    { class:'电芯SOC概要', key:'MinCellSOC3',    label:'单体最小SOC3(%)', type:'s16', scale:10 },
    { class:'电芯SOC概要', key:'MinCellSOC3Num', label:'单体最小SOC编号3',            type:'s16', scale:1  },

    { class:'电芯SOC概要', key:'AverCellSOC',    label:'平均SOC(%)',     type:'s16', scale:10 },
    { class:'电芯SOC概要', key:'RangeCellSOC',   label:'SOC极差(%)',     type:'s16', scale:10 },
    // { class:'电芯SOC概要', key:'ReservedCellSOC',label:'预留',          type:'u16', scale:1  },
    { key:'_skip5', type:'skip4' },

    { class:'电芯SOH概要', key:'MaxCellSOH1',    label:'单体最大SOH1(%)', type:'s16', scale:10 },
    { class:'电芯SOH概要', key:'MaxCellSOH1Num', label:'单体最大SOH编号1',            type:'s16', scale:1  },
    { class:'电芯SOH概要', key:'MaxCellSOH2',    label:'单体最大SOH2(%)', type:'s16', scale:10 },
    { class:'电芯SOH概要', key:'MaxCellSOH2Num', label:'单体最大SOH编号2',            type:'s16', scale:1  },
    { class:'电芯SOH概要', key:'MaxCellSOH3',    label:'单体最大SOH3(%)', type:'s16', scale:10 },
    { class:'电芯SOH概要', key:'MaxCellSOH3Num', label:'单体最大SOH编号3',            type:'s16', scale:1  },

    { class:'电芯SOH概要', key:'MinCellSOH1',    label:'单体最小SOH1(%)', type:'s16', scale:10 },
    { class:'电芯SOH概要', key:'MinCellSOH1Num', label:'单体最小SOH编号1',            type:'s16', scale:1  },
    { class:'电芯SOH概要', key:'MinCellSOH2',    label:'单体最小SOH2(%)', type:'s16', scale:10 },
    { class:'电芯SOH概要', key:'MinCellSOH2Num', label:'单体最小SOH编号2',            type:'s16', scale:1  },
    { class:'电芯SOH概要', key:'MinCellSOH3',    label:'单体最小SOH3(%)', type:'s16', scale:10 },
    { class:'电芯SOH概要', key:'MinCellSOH3Num', label:'单体最小SOH编号3',            type:'s16', scale:1  },

    { class:'电芯SOH概要', key:'AverCellSOH',    label:'平均SOH(%)',     type:'s16', scale:10 },
    { class:'电芯SOH概要', key:'RangeCellSOH',   label:'SOH极差(%)',     type:'s16', scale:10 },
    // { class:'电芯SOH概要', key:'ReservedCellSOH',label:'预留',          type:'s16', scale:1  },
    { key:'_skip6', type:'skip4' },
    
    { class:'CNR温度概要', key:'MaxCNRTemp1',    label:'极柱最大温度1(℃)', type:'s16', scale:10 },
    { class:'CNR温度概要', key:'MaxCNRTemp1Num', label:'极柱最大温度编号1',            type:'s16', scale:1  },
    { class:'CNR温度概要', key:'MaxCNRTemp2',    label:'极柱最大温度2(℃)', type:'s16', scale:10 },
    { class:'CNR温度概要', key:'MaxCNRTemp2Num', label:'极柱最大温度编号2',            type:'s16', scale:1  },
    { class:'CNR温度概要', key:'MaxCNRTemp3',    label:'极柱最大温度3(℃)', type:'s16', scale:10 },
    { class:'CNR温度概要', key:'MaxCNRTemp3Num', label:'极柱最大温度编号3',            type:'s16', scale:1  },

    { class:'CNR温度概要', key:'MinCNRTemp1',    label:'极柱最小温度1(℃)', type:'s16', scale:10 },
    { class:'CNR温度概要', key:'MinCNRTemp1Num', label:'极柱最小温度编号1',            type:'s16', scale:1  },
    { class:'CNR温度概要', key:'MinCNRTemp2',    label:'极柱最小温度2(℃)', type:'s16', scale:10 },
    { class:'CNR温度概要', key:'MinCNRTemp2Num', label:'极柱最小温度编号2',            type:'s16', scale:1  },
    { class:'CNR温度概要', key:'MinCNRTemp3',    label:'极柱最小温度3(℃)', type:'s16', scale:10 },
    { class:'CNR温度概要', key:'MinCNRTemp3Num', label:'极柱最小温度编号3',            type:'s16', scale:1  },

    { class:'CNR温度概要', key:'AverCNRTemp',    label:'平均温度(℃)',     type:'s16', scale:10 },
    { class:'CNR温度概要', key:'RangeCNRTemp',   label:'温度极差(℃)',     type:'s16', scale:10 },
    // { class:'CNR温度概要', key:'ReservedCNRTemp',label:'预留',            type:'u16', scale:1  },
    { key:'_skip7', type:'skip4' },
    { key:'_skip8', type:'skip64' },
  ]

  //簇端汇总信息表
  export const CLUSTER_SUMMARY = [
    /* 0-11：基础统计 ------------------------------------------------------- */
    {class:'系统信息', key:'AFETotal',         label:'AFE 数',             type:'u16', scale:1  },
    {class:'系统信息', key:'CellTotal',        label:'电芯数',             type:'u16', scale:1  },
    {class:'系统信息', key:'TempTotal',        label:'温感数',             type:'u16', scale:1  },
    {class:'系统信息', key:'SysCurrentStatus', label:'系统状态',           type:'u16', scale:1  },
    {class:'系统信息', key:'SysAlarmLevel',    label:'故障等级',           type:'u16', scale:1  },
    {class:'系统信息', key:'ClusterVolt',      label:'簇电压(V)',          type:'u16', scale:10 },
    {class:'系统信息', key:'ClusterPreVolt',   label:'预充电压(V)',        type:'u16', scale:10 },
    {class:'系统信息', key:'ClusterCurrent',   label:'簇电流(A)',          type:'s16', scale:10 },
    {class:'系统信息', key:'InsR_Pos',         label:'绝缘 R+(kΩ)',        type:'u16', scale:1  },
    {class:'系统信息', key:'InsR_Neg',         label:'绝缘 R-(kΩ)',        type:'u16', scale:1  },

    /* 12-21：温度 1-5 ----------------------------------------------------- */
    {class:'温度信息', key:'Temp1',         label:'温度1',        type:'s16', scale:10  },
    {class:'温度信息', key:'Temp2',         label:'温度2',        type:'s16', scale:10  },
    {class:'温度信息', key:'Temp3',         label:'温度3',        type:'s16', scale:10  },
    {class:'温度信息', key:'Temp4',         label:'温度4',        type:'s16', scale:10  },
    {class:'温度信息', key:'Temp5',         label:'温度5',        type:'s16', scale:10  },

    /* 22-25：预留 4 字 → skip8 -------------------------------------------- */
    { key:'_skip1', type:'skip8' },

    /* 26-37：SOC / SOH / SOE / SOP --------------------------------------- */
    {class:'电池信息', key:'ClusterSOC',       label:'簇SOC(%)',           type:'u16', scale:10 },
    {class:'电池信息', key:'ClusterSOH',       label:'簇SOH(%)',           type:'u16', scale:10 },
    {class:'电池信息', key:'ClusterSOE',       label:'簇SOE(%)',           type:'u16', scale:10 },

    {class:'电池信息', key:'ChargeSOPFlag',    label:'充电SOP标识',        type:'u16', scale:1  },
    {class:'电池信息', key:'ChargeSOP',        label:'充电SOP(%)',         type:'u16', scale:10 },
    {class:'电池信息', key:'ChargeSOPRow',     label:'充电SOP-Y',          type:'u16', scale:1  },
    {class:'电池信息', key:'ChargeSOPCol',     label:'充电SOP-X',          type:'u16', scale:1  },

    {class:'电池信息', key:'DischSOPFlag',     label:'放电SOP标识',        type:'u16', scale:1  },
    {class:'电池信息', key:'DischSOP',         label:'放电SOP(%)',         type:'u16', scale:10 },
    {class:'电池信息', key:'DischSOPRow',      label:'放电SOP-Y',          type:'u16', scale:1  },
    {class:'电池信息', key:'DischSOPCol',      label:'放电SOP-X',          type:'u16', scale:1  },

    /* 38-53：功率 & 电量电容 --------------------------------------------- */
    {class:'电池信息', key:'MaxAllowChargePower', label:'最大允充功率(kW)',    type:'u32', scale:10 },
    {class:'电池信息', key:'MaxAllowDischPower',  label:'最大允放功率(kW)',    type:'u32', scale:10 },
    {class:'电池信息', key:'SingleChargeEnergy',  label:'单次充电电量(kWh)',   type:'u32', scale:100 },
    {class:'电池信息', key:'SingleDischEnergy',   label:'单次放电电量(kWh)',   type:'u32', scale:100 },
    {class:'电池信息', key:'SingleChargeCap',     label:'单次充电容量(Ah)',    type:'u32', scale:100 },
    {class:'电池信息', key:'SingleDischCap',      label:'单次放电容量(Ah)',    type:'u32', scale:100 },

    /* 54-61：预留 16 字 → skip16 ----------------------------------------- */
    { key:'_skip2', type:'skip8' },

    /* 62-67：CAN-Hall 三字 + 4 字保留 ------------------------------------- */
    // 主寄存器字段（存储原始值，不显示在界面上）
    {class:'CAN-Hall信息', key:'CANHallStatus',   type:'u16', scale:1 },
    // 只解析第一个bit位
    {class:'CAN-Hall信息', key:'CANHallFaultInd', label:'LEM/SP5状态信息', type:'bits', bitsOf:'CANHallStatus', bit:0, len:1, map:{0:'无故障', 1:'有故障'} },
    {class:'CAN-Hall信息', key:'CANHallName',     label:'Hall 名称',   type:'hex', scale:1 },
    {class:'CAN-Hall信息', key:'CANHallSW',       label:'Hall 软件',   type:'hex', scale:1 },
    { key:'_skip3', type:'skip4' },

    /* 68-79：任务 / 堆栈 -------------------------------------------------- */
    {class:'系统及空间信息', key:'SystemState',     label:'系统状态位',   type:'u16', scale:1, map:{0:'系统正常', 1:'系统重启'} },
    {class:'系统及空间信息', key:'CycleTaskStack',  label:'周期任务堆栈大小',   type:'u32', scale:1024, unit:'KB' },
    {class:'系统及空间信息', key:'SystemStack',     label:'系统堆栈空间',   type:'u32', scale:1024, unit:'KB' },
    {class:'系统及空间信息', key:'SystemStackMin',  label:'系统堆栈最小空间',   type:'u32', scale:1024, unit:'KB' },

    /* 80-95：预留 16 字 → skip16 ---------------------------------------- */
    { key:'_skip4', type:'skip8' }
  ]

  /* 96-207：8 段 × 14B ASCII 版本串 --------------------------------------- */
  'BCU产品编码 BCU硬件版本号 BCU软件版本号 BCU_BOOT版本号 BCU_BAU协议版本号 BCU_BMU协议版本号 BCU_事件记录版本号 BCU_SOX算法版本号'
    .split(' ')
    .forEach(name =>
      CLUSTER_SUMMARY.push({
        class: '版本信息',
        key  : `${name}`,
        label: `${name.replace(' ')}`,
        // label: `${name.replace('_',' ')}`,
        type : 'str14'
      })
    )
  /* 最后 14 字节保留 --------------------------------------- */

  //PACK端汇总信息表
  // export const PACK_SUMMARY = [

  //   /* 1 – 32 : 单向菊花链断连位置 --------------------------------------- */
  //   ...Array.from({ length: 32 }, function (_, i) {
  //     return {
  //       class: '单项菊花链断连位置信息',
  //       key  : 'Bmu' + (i + 1) + 'ChokePos',
  //       label: 'BMU' + (i + 1) + ' 断连位置',
  //       type : 'u16',
  //       scale: 1
  //     };
  //   }),

  //   /* 故障统计 --------------------------------------------------------- */
  //   { class: 'pack端故障', key: 'BmuLostNum',      label: 'BMU失联数量',       type: 'u16', scale: 1 },
  //   { class: 'pack端故障', key: 'AfeLostNum',      label: 'AFE失联数量',       type: 'u16', scale: 1 },
  //   { class: 'pack端故障', key: 'CellVoltLostNum', label: '电芯电压断线数量',   type: 'u16', scale: 1 },
  //   { class: 'pack端故障', key: 'CellTempLostNum', label: '电芯温度断线数量',   type: 'u16', scale: 1 },

  //   /* 32 × BMU 电压 (0.1 V) ------------------------------------------- */
  //   ...Array.from({ length: 32 }, function (_, i) {
  //     return {
  //       class: 'BMU电压',
  //       key  : 'Bmu' + (i + 1) + 'Volt',
  //       label: 'BMU' + (i + 1) + ' 电压(V)',
  //       type : 'u16',
  //       scale: 10            // 0.1 V
  //     };
  //   }),

  //   /* 32 × BMU 电路板温度 (0.1 ℃) ------------------------------------- */
  //   ...Array.from({ length: 32 }, function (_, i) {
  //     return {
  //       class: 'BMU电路板温度',
  //       key  : 'Bmu' + (i + 1) + 'BoardTemp',
  //       label: 'BMU' + (i + 1) + ' 板温(℃)',
  //       type : 's16',
  //       scale: 10            // 0.1 ℃
  //     };
  //   }),

  //   /* 64 × BMU 动力接插件温度 (每 BMU 两路，0.1 ℃) -------------------- */
  //   ...Array.from({ length: 32 }, function (_, i) {
  //     var idx = i + 1;
  //     return [
  //       {
  //         class: '动力接插件温度1',
  //         key  : 'Bmu' + idx + 'Plug1Temp',
  //         label: 'BMU' + idx + ' 插件1温度(℃)',
  //         type : 's16',
  //         scale: 10
  //       },
  //       {
  //         class: '动力接插件温度2',
  //         key  : 'Bmu' + idx + 'Plug2Temp',
  //         label: 'BMU' + idx + ' 插件2温度(℃)',
  //         type : 's16',
  //         scale: 10
  //       }
  //     ];
  //   }).flat(),

  //   /* 64 × 版本号 —— 软件 (十六进制) + BOOT (ASCII) -------------------- */
  //   ...Array.from({ length: 32 }, function (_, i) {
  //     var idx = i + 1;
  //     return [
  //       {
  //         class: '版本信息',
  //         key  : 'Bmu' + idx + 'SwVer',
  //         label: 'BMU' + idx + ' 软件版本',
  //         type : 'u16',       // 后续展示时可用 toString(16).toUpperCase()
  //         scale: 1
  //       },
  //       {
  //         class: '版本信息',
  //         key  : 'Bmu' + idx + 'BootVer',
  //         label: 'BMU' + idx + ' BOOT版本',
  //         type : 'u16',       // 展示层按高/低字节转 ASCII
  //         scale: 1
  //       }
  //     ];
  //   }).flat()
  // ];

  // IO状态
  // export const IO_STATUS = [
  //   /* ── 系统 DI 输入 ───────────────────────────────────────────── */
  //   { class:'系统DI输入状态', key:'SysDIState', label:'系统 DI 输入寄存器', type:'u16', scale:1 , hide:true },
  //   ...Array.from({ length:10 }, (_, i) => ({
  //     class :'系统DI输入状态',
  //     key   : `DI${i+1}_FB`,
  //     label : `DI${i+1} 反馈`,
  //     type  : 'bit', bitsOf:'SysDIState', bit:i
  //   })),

  //   /* ── 系统 DO 驱动 ───────────────────────────────────────────── */
  //   { class:'系统DO驱动状态', key:'SysDOState', label:'系统 DO 驱动寄存器', type:'u16', scale:1 , hide:true},
  //   ...Array.from({ length:9 }, (_, i) => ({
  //     class :'系统DO驱动状态',
  //     key   : i < 8 ? `DO${i+1}_FB` : 'Add_adapt_FB',
  //     label : i < 8 ? `DO${i+1} 反馈` : '地址自适应反馈',
  //     type  : 'bit', bitsOf:'SysDOState', bit:i
  //   })),

  //   /* ── BMU-DI1 反馈 ──────────────────────────────────────────── */
  //   { class:'BMU_DI1反馈', key:'BmuDI1_L', label:'BMU1-16 DI1', type:'u16', scale:1 , hide:true},
  //   { class:'BMU_DI1反馈', key:'BmuDI1_H', label:'BMU17-32 DI1', type:'u16', scale:1 , hide:true},
  //   ...Array.from({ length:32 }, (_, i) => ({
  //     class :'BMU_DI1反馈',
  //     key   : `BMU${i+1}_DI1`,
  //     label : `BMU${i+1} DI1反馈`,
  //     type  : 'bit',
  //     bitsOf: i < 16 ? 'BmuDI1_L' : 'BmuDI1_H',
  //     bit   : i % 16
  //   })),

  //   /* ── BMU-DI2 反馈 ──────────────────────────────────────────── */
  //   { class:'BMU_DI2反馈', key:'BmuDI2_L', label:'BMU1-16 DI2', type:'u16', scale:1 , hide:true},
  //   { class:'BMU_DI2反馈', key:'BmuDI2_H', label:'BMU17-32 DI2', type:'u16', scale:1 , hide:true },
  //   ...Array.from({ length:32 }, (_, i) => ({
  //     class :'BMU_DI2反馈',
  //     key   : `BMU${i+1}_DI2`,
  //     label : `BMU${i+1} DI2反馈`,
  //     type  : 'bit',
  //     bitsOf: i < 16 ? 'BmuDI2_L' : 'BmuDI2_H',
  //     bit   : i % 16
  //   })),

  //   /* ── BMU-DI3 反馈 ──────────────────────────────────────────── */
  //   { class:'BMU_DI3反馈', key:'BmuDI3_L', label:'BMU1-16 DI3', type:'u16', scale:1 , hide:true },
  //   { class:'BMU_DI3反馈', key:'BmuDI3_H', label:'BMU17-32 DI3', type:'u16', scale:1 , hide:true },
  //   ...Array.from({ length:32 }, (_, i) => ({
  //     class :'BMU_DI3反馈',
  //     key   : `BMU${i+1}_DI3`,
  //     label : `BMU${i+1} DI3反馈`,
  //     type  : 'bit',
  //     bitsOf: i < 16 ? 'BmuDI3_L' : 'BmuDI3_H',
  //     bit   : i % 16
  //   })),

  //   /* ── 预留 2 字节 ───────────────────────────────────────────── */
  //   { key:'_skip1', type:'skip2' }
  // ];

  // export const HARDWARE_FAULT = [
  //   /* 1-1 高边驱动反馈故障 -------------------------------- */
  //   { class:'高边驱动反馈故障', key:'DOFBFault', type:'u16', scale:1, hide:true },
  //   { class:'高边驱动反馈故障', key:'DO1_FB_Fault', label:'DO1 高边驱动反馈故障', type:'bit', bitsOf:'DOFBFault', bit:0 },
  //   { class:'高边驱动反馈故障', key:'DO2_FB_Fault', label:'DO2 高边驱动反馈故障', type:'bit', bitsOf:'DOFBFault', bit:1 },
  //   { class:'高边驱动反馈故障', key:'DO3_FB_Fault', label:'DO3 高边驱动反馈故障', type:'bit', bitsOf:'DOFBFault', bit:2 },
  //   { class:'高边驱动反馈故障', key:'DO4_FB_Fault', label:'DO4 高边驱动反馈故障', type:'bit', bitsOf:'DOFBFault', bit:3 },
  //   { class:'高边驱动反馈故障', key:'DO5_FB_Fault', label:'DO5 高边驱动反馈故障', type:'bit', bitsOf:'DOFBFault', bit:4 },
  //   { class:'高边驱动反馈故障', key:'DO6_FB_Fault', label:'DO6 高边驱动反馈故障', type:'bit', bitsOf:'DOFBFault', bit:5 },
  //   { class:'高边驱动反馈故障', key:'DO7_FB_Fault', label:'DO7 高边驱动反馈故障', type:'bit', bitsOf:'DOFBFault', bit:6 },
  //   { class:'高边驱动反馈故障', key:'DO8_FB_Fault', label:'DO8 高边驱动反馈故障', type:'bit', bitsOf:'DOFBFault', bit:7 },

  //   /* 1-2 接触器故障 -------------------------------------- */
  //   { class:'接触器故障', key:'ContactorFault', type:'u16', scale:1, hide:true },
  //   { class:'接触器故障', key:'Pos_Contactor_FBFault',           label:'主正接触器反馈故障', type:'bit', bitsOf:'ContactorFault', bit:0 },
  //   { class:'接触器故障', key:'Neg_Contactor_FBFault',           label:'主负接触器反馈故障', type:'bit', bitsOf:'ContactorFault', bit:1 },
  //   { class:'接触器故障', key:'PreChg_Contactor_FBFault',        label:'预充接触器反馈故障', type:'bit', bitsOf:'ContactorFault', bit:2 },
  //   { class:'接触器故障', key:'Circuit_Breaker_FBFault',         label:'断路器反馈故障',     type:'bit', bitsOf:'ContactorFault', bit:3 },
  //   { class:'接触器故障', key:'DIDO_Detect_Fault',               label:'BMU DO/DI 检测故障', type:'bit', bitsOf:'ContactorFault', bit:4 },
  //   { class:'接触器故障', key:'Pos_Contactor_Fault',             label:'主正接触器故障',     type:'bit', bitsOf:'ContactorFault', bit:5 },
  //   { class:'接触器故障', key:'Neg_Contactor_Fault',             label:'主负接触器故障',     type:'bit', bitsOf:'ContactorFault', bit:6 },
  //   { class:'接触器故障', key:'PreChg_Contactor_Fault',          label:'预充接触器故障',     type:'bit', bitsOf:'ContactorFault', bit:7 },
  //   { class:'接触器故障', key:'Pos_Contactor_Oxid_Fault',        label:'主正接触器氧化',     type:'bit', bitsOf:'ContactorFault', bit:8 },
  //   { class:'接触器故障', key:'Pos_Contactor_adhesion_Fault',    label:'主正接触器黏连',     type:'bit', bitsOf:'ContactorFault', bit:9 },
  //   { class:'接触器故障', key:'Neg_Contactor_Oxid_Fault',        label:'主负接触器氧化',     type:'bit', bitsOf:'ContactorFault', bit:10 },
  //   { class:'接触器故障', key:'Neg_Contactor_adhesion_Fault',    label:'主负接触器黏连',     type:'bit', bitsOf:'ContactorFault', bit:11 },
  //   { class:'接触器故障', key:'PreChg_Contactor_Oxid_Fault',     label:'预充接触器氧化',     type:'bit', bitsOf:'ContactorFault', bit:12 },
  //   { class:'接触器故障', key:'PreChg_Contactor_adhesion_Fault', label:'预充接触器黏连',     type:'bit', bitsOf:'ContactorFault', bit:13 },
  //   { class:'接触器故障', key:'Contactor_total_Fault',           label:'接触器总故障位',     type:'bit', bitsOf:'ContactorFault', bit:14 },

  //   /* 1-3 反馈信号故障 ------------------------------------ */
  //   { class:'反馈信号故障', key:'FBSignalFault', type:'u16', scale:1, hide:true },
  //   { class:'反馈信号故障', key:'MB_ShuntTrip_HS_FBFault',         label:'主断分励脱扣 HS 反馈故障', type:'bit', bitsOf:'FBSignalFault', bit:0 },
  //   { class:'反馈信号故障', key:'DC_KM_HS_FBFault',                label:'直流供电 KM HS 反馈故障',  type:'bit', bitsOf:'FBSignalFault', bit:1 },
  //   { class:'反馈信号故障', key:'Access_FBFault',                  label:'门禁反馈故障',             type:'bit', bitsOf:'FBSignalFault', bit:2 },
  //   { class:'反馈信号故障', key:'Emergency_Stop_FBFault',          label:'急停反馈故障',             type:'bit', bitsOf:'FBSignalFault', bit:3 },
  //   { class:'反馈信号故障', key:'SPD_FBFault',                     label:'SPD 反馈故障',             type:'bit', bitsOf:'FBSignalFault', bit:4 },
  //   { class:'反馈信号故障', key:'AC_Vol_FBFault',                  label:'交流电压反馈故障',         type:'bit', bitsOf:'FBSignalFault', bit:5 },
  //   { class:'反馈信号故障', key:'Smoke_FBFault',                   label:'烟感反馈故障',             type:'bit', bitsOf:'FBSignalFault', bit:6 },
  //   { class:'反馈信号故障', key:'Fire_Release_Signal_FBFault',     label:'消防释放信号故障',         type:'bit', bitsOf:'FBSignalFault', bit:7 },
  //   { class:'反馈信号故障', key:'MSD_Fault',                       label:'MSD 信号故障',            type:'bit', bitsOf:'FBSignalFault', bit:8 },
  //   { class:'反馈信号故障', key:'Hall_Fault',                      label:'霍尔故障',                type:'bit', bitsOf:'FBSignalFault', bit:9 },

  //   /* 1-4 通讯 / 采集失联类故障 --------------------------- */
  //   { class:'通讯/采集失联故障', key:'ContactMissFault', type:'u16', scale:1, hide:true },
  //   { class:'通讯/采集失联故障', key:'INVALID_DATA_FaultPos',  label:'无效数据故障',           type:'bit', bitsOf:'ContactMissFault', bit:0 },
  //   { class:'通讯/采集失联故障', key:'Cold_COM_Fault',         label:'制冷设备通讯异常',       type:'bit', bitsOf:'ContactMissFault', bit:1 },
  //   { class:'通讯/采集失联故障', key:'PCS_COM_Fault',          label:'PCS 通讯故障',           type:'bit', bitsOf:'ContactMissFault', bit:2 },
  //   { class:'通讯/采集失联故障', key:'DAISY_Disconnect_Fault', label:'菊花链断连',             type:'bit', bitsOf:'ContactMissFault', bit:3 },
  //   { class:'通讯/采集失联故障', key:'FRAM_FAIL_Fault',        label:'铁电存储器故障',         type:'bit', bitsOf:'ContactMissFault', bit:4 },
  //   { class:'通讯/采集失联故障', key:'FLASH_FAIL_Fault',       label:'EEPROM/FLASH 故障',      type:'bit', bitsOf:'ContactMissFault', bit:5 },
  //   { class:'通讯/采集失联故障', key:'BCU_TEMP1_FAULT',        label:'BCU 温感1故障',          type:'bit', bitsOf:'ContactMissFault', bit:6 },
  //   { class:'通讯/采集失联故障', key:'BCU_TEMP2_FAULT',        label:'BCU 温感2故障',          type:'bit', bitsOf:'ContactMissFault', bit:7 },
  //   { class:'通讯/采集失联故障', key:'BCU_TEMP3_FAULT',        label:'BCU 温感3故障',          type:'bit', bitsOf:'ContactMissFault', bit:8 },
  //   { class:'通讯/采集失联故障', key:'BCU_TEMP4_FAULT',        label:'BCU 温感4故障',          type:'bit', bitsOf:'ContactMissFault', bit:9 },
  //   { class:'通讯/采集失联故障', key:'BCU_TEMP5_FAULT',        label:'BCU 温感5故障',          type:'bit', bitsOf:'ContactMissFault', bit:10 },
  //   { class:'通讯/采集失联故障', key:'BMU_PareConfig_ERR',     label:'BMU 参数配置错误',       type:'bit', bitsOf:'ContactMissFault', bit:11 },
  //   { class:'通讯/采集失联故障', key:'BCU_PareConfig_ERR',     label:'BCU 参数配置错误',       type:'bit', bitsOf:'ContactMissFault', bit:12 },
  //   { class:'通讯/采集失联故障', key:'DEHUM_COM_FAULT',        label:'除湿机通讯故障',         type:'bit', bitsOf:'ContactMissFault', bit:13 },

  //   /* 1-5 BMU 参数配置错误位 ------------------------------ */
  //   { class:'BMU参数配置错误', key:'ParaConfigWrong1', type:'u16', scale:1, hide:true },
  //   { class:'BMU参数配置错误', key:'ParaConfigWrong2', type:'u16', scale:1, hide:true },

  //   /* BMU1-32 每 bit 一位 */
  //   ...Array.from({ length:32 }, (_, i) => ({
  //     class :'BMU参数配置错误',
  //     key   : `BMU${i+1}_ParaErr`,
  //     label : `BMU${i+1} 参数配置错误`,
  //     type  : 'bit',
  //     bitsOf: i < 16 ? 'ParaConfigWrong1' : 'ParaConfigWrong2',
  //     bit   : i % 16
  //   })),

  //   /* 1-6 其它硬件状态 ------------------------------------ */
  //   { class:'硬件其它状态', key:'HardwareOther', type:'u16', scale:1, hide:true },
  //   { class:'硬件其它状态', key:'CAN1_COM_State',       label:'CAN1 通讯异常',         type:'bit', bitsOf:'HardwareOther', bit:0 },
  //   { class:'硬件其它状态', key:'CAN2_COM_State',       label:'CAN2 通讯异常',         type:'bit', bitsOf:'HardwareOther', bit:1 },
  //   { class:'硬件其它状态', key:'CAN3_COM_State',       label:'CAN3 通讯异常',         type:'bit', bitsOf:'HardwareOther', bit:2 },
  //   { class:'硬件其它状态', key:'RS485_1_COM_State',    label:'RS485-1 通讯异常',      type:'bit', bitsOf:'HardwareOther', bit:4 },
  //   { class:'硬件其它状态', key:'RS485_2_COM_State',    label:'RS485-2 通讯异常',      type:'bit', bitsOf:'HardwareOther', bit:5 },
  //   { class:'硬件其它状态', key:'RS485_3_COM_State',    label:'RS485-3 通讯异常',      type:'bit', bitsOf:'HardwareOther', bit:6 },
  //   { class:'硬件其它状态', key:'ETH1_COM_State',       label:'Ethernet1 通讯异常',    type:'bit', bitsOf:'HardwareOther', bit:9 },
  //   { class:'硬件其它状态', key:'POS_Contactor_State',  label:'主正接触器闭合状态',    type:'bit', bitsOf:'HardwareOther', bit:11 },
  //   { class:'硬件其它状态', key:'Neg_Contactor_State',  label:'主负接触器闭合状态',    type:'bit', bitsOf:'HardwareOther', bit:12 },

  //   { key:'_skip1', type:'skip2' }
  // ];

  // 总故障+保留故障
  // export const TOTAL_FAULT = [
  //   /* 2-1 总故障位 ---------------------------------------- */
  //   { class:'总故障', key:'TotalFault', type:'u16', scale:1, hide:true },
  //   { class:'总故障', key:'Conventional_Serious_Fault', label:'常规严重故障', type:'bit', bitsOf:'TotalFault', bit:0 },
  //   { class:'总故障', key:'Hardware_Total_Fault',       label:'硬件故障总故障', type:'bit', bitsOf:'TotalFault', bit:1 },
  //   { class:'总故障', key:'Deferred_Total_Fault',       label:'保留故障总故障', type:'bit', bitsOf:'TotalFault', bit:2 },

  //   /* 2-2 保留故障位 -------------------------------------- */
  //   { class:'保留故障', key:'DeferredFault', type:'u16', scale:1, hide:true },
  //   { class:'保留故障', key:'Charge_OC_ALARM',      label:'充电过流严重告警',     type:'bit', bitsOf:'DeferredFault', bit:0 },
  //   { class:'保留故障', key:'DisCharge_OC_ALARM',   label:'放电过流严重告警',     type:'bit', bitsOf:'DeferredFault', bit:1 },
  //   { class:'保留故障', key:'InsR_ALARM',           label:'绝缘电阻严重告警',     type:'bit', bitsOf:'DeferredFault', bit:2 },
  //   { class:'保留故障', key:'CONTACTOR_WELD_ALARM', label:'接触器黏连/氧化告警',  type:'bit', bitsOf:'DeferredFault', bit:3 },
  //   { class:'保留故障', key:'PCS_COM_FAULT',        label:'PCS 通讯故障',        type:'bit', bitsOf:'DeferredFault', bit:4 },

  //   { key:'_skip2', type:'skip2' }
  // ];
  // /* ────────────────────────────────────────────────

export const TOTAL_FAULT = [
  /* === ① 总故障位 (Word-1) ======================================= */
  { class: '总故障', key: 'TotalFault', type: 'u16', scale: 1, hide: false },
  { class: '总故障', key: 'Conventional_Serious_Fault', label: '常规严重故障位', type: 'bit',  bitsOf: 'TotalFault', bit: 0 },
  { class: '总故障', key: 'Hardware_Total_Fault',       label: '硬件故障总故障位', type: 'bit',  bitsOf: 'TotalFault', bit: 1 },
  { class: '总故障', key: 'Deferred_Total_Fault',       label: '保留故障总故障位', type: 'bit',  bitsOf: 'TotalFault', bit: 2 },

  /* === ② 保留故障位 (Word-2) ===================================== */
  { class: '保留故障', key: 'DeferredFault', type: 'u16', scale: 1, hide: false },
  { class: '保留故障', key: 'Charge_OC_Alarm',      label: '充电过流严重告警',   type: 'bit',  bitsOf: 'DeferredFault', bit: 0 },
  { class: '保留故障', key: 'Discharge_OC_Alarm',   label: '放电过流严重告警',   type: 'bit',  bitsOf: 'DeferredFault', bit: 1 },
  { class: '保留故障', key: 'Insulation_Alarm',     label: '绝缘电阻严重告警',   type: 'bit',  bitsOf: 'DeferredFault', bit: 2 },
  { class: '保留故障', key: 'Contactor_Weld_Alarm', label: '接触器黏连/氧化告警', type: 'bit',  bitsOf: 'DeferredFault', bit: 3 },
  { class: '保留故障', key: 'PCS_Com_Fault',        label: 'PCS 通讯故障',      type: 'bit',  bitsOf: 'DeferredFault', bit: 4 },

  /* === ③ 单体总故障 (Word-3，2 bit 等级映射) ====================== */
  { class: '单体总故障', key: 'CellFault', type: 'u16', scale: 1, hide: false },

  { class: '单体总故障', key: 'CellOv_Level',     label: '单体电压过压',     type: 'bits', bitsOf: 'CellFault', bit: 0,  len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellUv_Level',     label: '单体电压欠压',     type: 'bits', bitsOf: 'CellFault', bit: 2,  len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellOTc_Level',    label: '充电单体过温',     type: 'bits', bitsOf: 'CellFault', bit: 4,  len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellUTc_Level',    label: '充电单体欠温',     type: 'bits', bitsOf: 'CellFault', bit: 6,  len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellOTd_Level',    label: '放电单体过温',     type: 'bits', bitsOf: 'CellFault', bit: 8,  len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellUTd_Level',    label: '放电单体欠温',     type: 'bits', bitsOf: 'CellFault', bit: 10, len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellSocHigh_Level',label: '单体 SOC 过高',    type: 'bits', bitsOf: 'CellFault', bit: 12, len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellSocLow_Level', label: '单体 SOC 过低',    type: 'bits', bitsOf: 'CellFault', bit: 14, len: 2, map: ALARM_MAP },

  /* === ④ pack 总故障 (Word-4，2 bit 等级映射) ===================== */
  { class: 'pack总故障', key: 'PackFault', type: 'u16', scale: 1, hide: false },

  { class: 'pack总故障', key: 'PackOv_Level',     label: 'pack过压',         type: 'bits', bitsOf: 'PackFault', bit: 0,  len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PackUv_Level',     label: 'pack欠压',         type: 'bits', bitsOf: 'PackFault', bit: 2,  len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PackOT_Level',     label: 'pack过温',             type: 'bits', bitsOf: 'PackFault', bit: 4,  len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PackUT_Level',     label: 'pack欠温',             type: 'bits', bitsOf: 'PackFault', bit: 6,  len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'Plug1OT_Level',    label: '1 号动力接插件过温',    type: 'bits', bitsOf: 'PackFault', bit: 8,  len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'Plug2OT_Level',    label: '2 号动力接插件过温',    type: 'bits', bitsOf: 'PackFault', bit: 10, len: 2, map: ALARM_MAP },


]

  //一级故障点表
  export const FAULT_LEVEL1 = [
    { class:'常规一级故障', key:'FaultLevel1', type:'u16', scale:1, hide: false },

    { class:'常规一级故障', key:'Cell_OverVOL',            label:'单电池过压',           type:'bit', bitsOf:'FaultLevel1', bit:0 },
    { class:'常规一级故障', key:'Cell_UnderVOL',           label:'单电池欠压',           type:'bit', bitsOf:'FaultLevel1', bit:1 },
    { class:'常规一级故障', key:'Chg_Cell_OverTemp',       label:'充电单体过温',         type:'bit', bitsOf:'FaultLevel1', bit:2 },
    { class:'常规一级故障', key:'Chg_Cell_UnderTemp',      label:'充电单体欠温',         type:'bit', bitsOf:'FaultLevel1', bit:3 },
    { class:'常规一级故障', key:'DisChg_Cell_OverTemp',    label:'放电单体过温',         type:'bit', bitsOf:'FaultLevel1', bit:4 },
    { class:'常规一级故障', key:'DisChg_Cell_UnderTemp',   label:'放电单体欠温',         type:'bit', bitsOf:'FaultLevel1', bit:5 },
    { class:'常规一级故障', key:'Cell_SOC_High',           label:'单体 SOC 过高',        type:'bit', bitsOf:'FaultLevel1', bit:6 },
    { class:'常规一级故障', key:'Cell_SOC_Low',            label:'单体 SOC 过低',        type:'bit', bitsOf:'FaultLevel1', bit:7 },
    { class:'常规一级故障', key:'BMU_OverVOL',             label:'BMU 过压',            type:'bit', bitsOf:'FaultLevel1', bit:8 },
    { class:'常规一级故障', key:'BMU_UnderVOL',            label:'BMU 欠压',            type:'bit', bitsOf:'FaultLevel1', bit:9 },
    { class:'常规一级故障', key:'BMU_OverTemp',            label:'BMU 过温',            type:'bit', bitsOf:'FaultLevel1', bit:10 },
    { class:'常规一级故障', key:'BMU_UnderTemp',           label:'BMU 欠温',            type:'bit', bitsOf:'FaultLevel1', bit:11 },
    { class:'常规一级故障', key:'Other_Fault',             label:'其他故障',            type:'bit', bitsOf:'FaultLevel1', bit:12 },
    { class:'常规一级故障', key:'CNR1_OverTemp',           label:'1 号动力接插件过温',  type:'bit', bitsOf:'FaultLevel1', bit:13 },
    { class:'常规一级故障', key:'CNR2_OverTemp',           label:'2 号动力接插件过温',  type:'bit', bitsOf:'FaultLevel1', bit:14 },

    { key:'_skip1', type:'skip2' }
  ];

  //常规故障二级点表
  // export const FAULT_LEVEL2 = [

  //   /* ── ① 单体电池过压 / 欠压 / 温度 / SOC ─────────────────────────── */
  //   ...[
  //     ['CellOv' , '单体电池过压'],
  //     ['CellUv' , '单体电池欠压'],
  //     ['CellOTc', '充电单体过温'],
  //     ['CellUTc', '充电单体欠温'],
  //     ['CellOTd', '放电单体过温'],
  //     ['CellUTd', '放电单体欠温'],
  //     ['SocHigh', '单体SOC过高'],
  //     ['SocLow' , '单体SOC过低']
  //   ].flatMap(([prefix , cls]) => [
  //     /* BMU1-16 */
  //     { class:cls, key:`${prefix}1`, type:'u16', scale:1, hide:true },
  //     ...Array.from({length:16}, (_,i)=>({
  //       class :cls,
  //       key   :`BMU${i+1}_${prefix}`,
  //       label :`BMU${i+1} ${cls}`,
  //       type  :'bit', bitsOf:`${prefix}1`, bit:i
  //     })),
  //     /* BMU17-32 */
  //     { class:cls, key:`${prefix}2`, type:'u16', scale:1, hide:true },
  //     ...Array.from({length:16}, (_,i)=>({
  //       class :cls,
  //       key   :`BMU${i+17}_${prefix}`,
  //       label :`BMU${i+17} ${cls}`,
  //       type  :'bit', bitsOf:`${prefix}2`, bit:i
  //     }))
  //   ]),

  //   /* ── ② BMU 过压 / 欠压 / 过温 / 欠温 等级(2bit) ───────────────── */
  //   ...[
  //     ['BmuOv', 'BMU过压等级'],
  //     ['BmuUv', 'BMU欠压等级'],
  //     ['BmuOT', 'BMU过温等级'],
  //     ['BmuUT', 'BMU欠温等级']
  //   ].flatMap(([prefix , cls]) =>
  //     Array.from({length:4}, (_,grp)=>[
  //       { class:cls, key:`${prefix}${grp+1}`, type:'u16', scale:1, hide:true },
  //       ...Array.from({length:8}, (_,i)=>({
  //         class :cls,
  //         key   :`BMU${grp*8+i+1}_${prefix}`,
  //         label :`BMU${grp*8+i+1} ${cls}`,
  //         type  :'bits', bitsOf:`${prefix}${grp+1}`,
  //         bit   :i*2, len:2, map:ALARM_MAP
  //       }))
  //     ]).flat()
  //   ),

  //   /* ── ③ 动力接插件过温等级(2bit) ───────────────────────────────── */
  //   ...['Plug1OT', 'Plug2OT'].flatMap((plug,idx)=>
  //     Array.from({length:4}, (_,grp)=>[
  //       { class:`BMU${idx+1}号插件过温`, key:`${plug}${grp+1}`, type:'u16', scale:1, hide:true },
  //       ...Array.from({length:8}, (_ ,i)=>({
  //         class :`BMU${idx+1}号插件过温`,
  //         key   :`BMU${grp*8+i+1}_${plug}`,
  //         label :`BMU${grp*8+i+1} 插件${idx+1}过温等级`,
  //         type  :'bits', bitsOf:`${plug}${grp+1}`,
  //         bit   :i*2, len:2, map:ALARM_MAP
  //       }))
  //     ]).flat()
  //   ),

  //   /* ── ④ 其他故障-1 ─────────────────────────────────────────────── */
  //   { class:'其他故障', key:'Misc1', type:'u16', scale:1, hide:true },
  //   ...[
  //     ['DiffVolt' , '单体压差过大'],
  //     ['DiffTemp' , '单体温差过大'],
  //     ['SocDiff'  , 'SOC差异过大'],
  //     ['BmuDiff'  , 'BMU压差'],
  //     ['ClusterOv', '簇端过压'],
  //     ['ClusterUv', '簇端欠压'],
  //     ['InsPosGnd', '绝缘正对地'],
  //     ['InsNegGnd', '绝缘负对地']
  //   ].map(( [key , label] , idx)=>({
  //     class :'其他故障',
  //     key   : key,
  //     label : label,
  //     type  :'bits', bitsOf:'Misc1', bit:idx*2, len:2, map:ALARM_MAP
  //   })),

  //   /* ── ⑤ 其他故障-2 ─────────────────────────────────────────────── */
  //   { class:'其他故障', key:'Misc2', type:'u16', scale:1, hide:true },
  //   ...[
  //     ['ChgOC' , '充电过流'],
  //     ['DisOC' , '放电过流'],
  //     ['RT1OT' , 'RT1过温'],
  //     ['RT2OT' , 'RT2过温'],
  //     ['RT3OT' , 'RT3过温'],
  //     ['RT4OT' , 'RT4过温'],
  //     ['RT5OT' , 'RT5过温'],
  //     ['RSVD'  , '预留']
  //   ].map(( [key , label] , idx)=>({
  //     class :'其他故障',
  //     key   : key,
  //     label : label,
  //     type  :'bits', bitsOf:'Misc2', bit:idx*2, len:2, map:ALARM_MAP
  //   })),

  //   /* ── 预留 2 字节 ──────────────────────────────────────────────── */
  //   { key:'_skip1', type:'skip2' }
  // ];


  //掉线故障表
  // export const BROKENWIRE = [

  //   /* 1-1 / 1-2 BMU 失联状态 ------------------------------------------------ */
  //   { class:'BMU失联状态', key:'BmuOffline1', type:'u16', scale:1, hide:false },
  //   ...Array.from({ length:16 }, (_,i)=>({
  //     class:'BMU失联状态', key:`BMU${i+1}_Offline`,
  //     label:`BMU${i+1} 失联`, type:'bit', bitsOf:'BmuOffline1', bit:i,
  //     map  : { 0:'失联', 1:'正常' } 

  //   })),
  //   { class:'BMU失联状态', key:'BmuOffline2', type:'u16', scale:1, hide:false },
  //   ...Array.from({ length:16 }, (_,i)=>({
  //     class:'BMU失联状态', key:`BMU${i+17}_Offline`,
  //     label:`BMU${i+17} 失联`, type:'bit', bitsOf:'BmuOffline2', bit:i,
  //      map  : { 0:'失联', 1:'正常' } 
  //   })),

  //   /* 1-3 / 1-4 BMU 插件温度掉线 (插件1) ----------------------------------- */
  //   { class:'插件1温度掉线', key:'Plug1Offline1', type:'u16', scale:1, hide:false },
  //   ...Array.from({ length:16 }, (_,i)=>({
  //     class:'插件1温度掉线', key:`BMU${i+1}_Plug1Offline`,
  //     label:`BMU${i+1} 插件1温度掉线`, type:'bit', bitsOf:'Plug1Offline1', bit:i,
  //      map  : { 0:'失联', 1:'正常' } 
  //   })),
  //   { class:'插件1温度掉线', key:'Plug1Offline2', type:'u16', scale:1, hide:false },
  //   ...Array.from({ length:16 }, (_,i)=>({
  //     class:'插件1温度掉线', key:`BMU${i+17}_Plug1Offline`,
  //     label:`BMU${i+17} 插件1温度掉线`, type:'bit', bitsOf:'Plug1Offline2', bit:i,
  //      map  : { 0:'失联', 1:'正常' } 
  //   })),

  //   /* 1-5 / 1-6 BMU 插件温度掉线 (插件2) ----------------------------------- */
  //   { class:'插件2温度掉线', key:'Plug2Offline1', type:'u16', scale:1, hide:false },
  //   ...Array.from({ length:16 }, (_,i)=>({
  //     class:'插件2温度掉线', key:`BMU${i+1}_Plug2Offline`,
  //     label:`BMU${i+1} 插件2温度掉线`, type:'bit', bitsOf:'Plug2Offline1', bit:i,
  //      map  : { 0:'失联', 1:'正常' } 
  //   })),
  //   { class:'插件2温度掉线', key:'Plug2Offline2', type:'u16', scale:1, hide:false },
  //   ...Array.from({ length:16 }, (_,i)=>({
  //     class:'插件2温度掉线', key:`BMU${i+17}_Plug2Offline`,
  //     label:`BMU${i+17} 插件2温度掉线`, type:'bit', bitsOf:'Plug2Offline2', bit:i,
  //      map  : { 0:'失联', 1:'正常' } 
  //   })),

  //   /* ── 4 字节预留 -------------------------------------------------------- */
  //   { key:'_skip1', type:'skip4' },

  //   /* 1-7 / 1-10 一级掉线标志 (电压/温度) --------------------------------- */
  //   ...['VoltLv1','TempLv1'].flatMap((prefix,idx)=>
  //     Array.from({ length:2 }, (_,grp)=>[
  //       { class:`${idx? '温度':'电压'}一级掉线`, key:`${prefix}${grp+1}`, type:'u16', scale:1, hide:false },
  //       ...Array.from({ length:16 }, (_ ,i)=>({
  //         class:`${idx? '温度':'电压'}一级掉线`,
  //         key  :`BMU${grp*16+i+1}_${prefix}`,
  //         label:`BMU${grp*16+i+1} ${idx? '温度':'电压'}一级掉线`,
  //         type :'bit', bitsOf:`${prefix}${grp+1}`, bit:i,
  //          map  : { 0:'失联', 1:'正常' } 
  //       }))
  //     ]).flat()
  //   ),

  //   /* ── 11 / 12 二级掉线 (电压/温度) - 共 256×2 寄存器 ------------------ */
  //   ...['VoltLv2','TempLv2'].flatMap((prefix,idx)=>
  //     Array.from({ length:32 }, (_,b)=>         // 32 BMU
  //       Array.from({ length:8 }, (_,r)=>{              // 每 BMU 8 寄存器
  //         const regKey = `${prefix}_BMU${b+1}_R${r+1}`;
  //         return [
  //           { class:`${idx? '温度':'电压'}二级掉线`, key:regKey, type:'u16', scale:1, hide:false },
  //           ...Array.from({ length:16 }, (_,bit)=>({
  //             class:`${idx? '温度':'电压'}二级掉线`,
  //             key  :`BMU${b+1}_Cell${r*16+bit+1}_${prefix}`,
  //             label:`BMU${b+1} Cell${r*16+bit+1} ${idx? '温度':'电压'}掉线`,
  //             type :'bit', bitsOf:regKey, bit,
  //              map  : { 0:'失联', 1:'正常' } 
  //           }))
  //         ];
  //       }).flat()
  //     ).flat()
  //   ),

  //   /* 13 BMU-AFE 通讯失联 (32 寄存器 = 32 BMU) --------------------------- */
  //   { class:'AFE失联', key:'AfeLost1', type:'u16', scale:1, hide:false },
  //   ...Array.from({ length:32 }, (_,b)=>[
  //     { class:'AFE失联', key:`BMU${b+1}_AfeLost`, type:'u16', scale:1, hide:false},
  //     ...Array.from({ length:16 }, (_,afe)=>({
  //       class:'AFE失联', key:`BMU${b+1}_AFE${afe+1}_Lost`,
  //       label:`BMU${b+1} AFE${afe+1} 失联`,
  //       type:'bit', bitsOf:`BMU${b+1}_AfeLost`, bit:afe,
  //        map  : { 0:'失联', 1:'正常' } 
  //     }))
  //   ]).flat()
  // ];

    //均衡状态表 256×2B (=32 BMU × 8 寄存器)  
  export const BALANCE_STATUS = [
    /* ---- 32 BMU × 8 寄存器 ------------------------------------ */
    ...Array.from({ length: 32 }, (_, b) =>          // b = 0-31
      Array.from({ length: 8 },  (_, r) => {        // r = 0-7
        const regKey = `Bal_BMU${b + 1}_R${r + 1}`; // 隐藏寄存器
        const cellBase = r * 16;                    // 该寄存器起始电池序号 (0-基)
        return [
          {                                          // 寄存器原值（隐藏）
            class : '均衡状态',
            key   : regKey,
            type  : 'u16',
            hide  : false
          },
          ...Array.from({ length: 16 }, (_, bit) => ({
            class : '均衡状态',
            key   : `BMU${b + 1}_Cell${cellBase + bit + 1}_Bal`,
            label : `BMU${b + 1} 电池${cellBase + bit + 1} 均衡`,
            type  : 'bit',
            bitsOf: regKey,
            bit,
            map   : { 0: '未均衡', 1: '均衡中' }
          }))
        ];
      }).flat()
    ).flat()
  ];

  //遥调
  //系统基本配置参数
  export const SYS_BASE_PARAM_R = [
    /* ① BMU / AFE 数量 ---------------------------------------------------- */
    // { class:'BMU配置', key:'BMUconfig', type:'u16', scale:1, hide:true },
    { class:'BMU配置', key:'BmuTotalNum',  label:'BMU总数量',         type:'u16' },
    { class:'BMU配置', key:'AfeNumInBmu',  label:'BMU下AFE数量',      type:'u16' },

    /* ② AFE-Cell / Temp 数量（各 16 个） ---------------------------------- */
    ...Array.from({ length:16 }, (_,i)=>({
      class:'BMU配置',
      key  :`afeCell${i+1}`, label:`AFE${i+1} 电池数量`, type:'u16'
    })),
    ...Array.from({ length:16 }, (_,i)=>({
      class:'BMU配置',
      key  :`afeTemp${i+1}`, label:`AFE${i+1} 温度数量`, type:'u16'
    })),

    /* ③ 虚拟电池偏移（32×u16） ------------------------------------------ */
    ...Array.from({ length:32 }, (_,i)=>({
      class:'BMU配置',
      key:`virtualCellOffset${i+1}`,
      label:`虚拟电池偏移${i+1}`, type:'u16'
    })),

    /* ④ 预留 32 B ------------------------------------------------------- */
    { key:'_skip1', type:'skip32' },

    /* ⑤ 工作/运维/设备类型 ------------------------------------------------ */
    { class:'类型选择', key:'EventRecordMode',  label:'事件记录模式',       type:'u16' },
    { class:'类型选择', key:'TestMode',         label:'内测模式',           type:'u16' },
    { class:'类型选择', key:'BalanceMode',      label:'均衡模式',           type:'u16' },
    { class:'类型选择', key:'OpMode',           label:'运维模式',           type:'u16' },
    { class:'类型选择', key:'PcsType',          label:'PCS类型',            type:'u16' },
    { class:'类型选择', key:'CoolDeviceType',   label:'制冷设备类型',       type:'u16' },
    { class:'类型选择', key:'DehumidifyType',   label:'除湿机设备类型',     type:'u16' },
    { class:'类型选择', key:'FireCtrlType',     label:'消防控制器类型',     type:'u16' },

    /* ⑥ 预留 6 B -------------------------------------------------------- */
    { key:'_skip2', type:'skip6' },

    /* ⑦ 单体电压/温度滤波与接触器参数 ------------------------------------ */
    { class:'基础设置', key:'cellVoltFilterDiff', label:'单体电压滤波差值',      type:'u16', scale:1000, unit:'V' },
    { class:'基础设置',  key:'cellVoltWeight',     label:'单体电压权重系数',      type:'u16', scale:100 },
    { class:'基础设置',  key:'cellTempFilterDiff', label:'单体温度滤波差值',      type:'s16', scale:10, unit:'℃' },
    { class:'基础设置',  key:'cellTempWeight',     label:'单体温度权重系数',      type:'u16', scale:100 },
    { class:'基础设置',  key:'dcPowerOffDelay',    label:'直流供电断开延时',   type:'u16', unit:'s' },
    { class:'基础设置',  key:'cellRestTime',       label:'电芯静置时间',     type:'u16', unit:'min' },
    { class:'基础设置',  key:'contactorValue',     label:'接触器范围值',       type:'u16', scale:10, unit:'V' },
    { class:'基础设置',  key:'contactorDetectDelay',label:'接触器检测延时',    type:'u16', unit:'s' },

    /* ⑧ 预留 8 B -------------------------------------------------------- */
    { key:'_skip3', type:'skip8' },

    /* ⑨ 制冷/风扇温度阈值 ----------------------------------------------- */
    { class:'空调阈值', key:'coolingStartTemp',  label:'制冷开启温度', type:'s16', scale:10, unit:'℃' },
    { class:'空调阈值', key:'coolingStopTemp',   label:'制冷关闭温度', type:'s16', scale:10, unit:'℃' },
    { class:'空调阈值', key:'heatingStartTemp',  label:'制热开启温度', type:'s16', scale:10, unit:'℃' },
    { class:'空调阈值', key:'heatingStopTemp',   label:'制热关闭温度', type:'s16', scale:10, unit:'℃' },
    { class:'空调阈值', key:'fanStartTemp',      label:'风扇开启温度', type:'s16', scale:10, unit:'℃' },
    { class:'空调阈值', key:'fanStopTemp',       label:'风扇停止温度', type:'s16', scale:10, unit:'℃' },

    /* ⑩ 预留 8 B -------------------------------------------------------- */
    { key:'_skip4', type:'skip8' },

    /* ⑪ CAN / RS485 波特率 ---------------------------------------------- */
    { class:'通信设置', key:'can1ComRate',   label:'CAN1通讯速率/仲裁域速率',    type:'u16' },
    { class:'通信设置', key:'can1DataBaud',  label:'CAN1数据域波特率',  type:'u16' },
    { class:'通信设置', key:'can2ComRate',   label:'CAN2通讯速率/仲裁域速率',    type:'u16' },
    { class:'通信设置', key:'can2DataBaud',  label:'CAN2数据域波特率',  type:'u16' },
    { class:'通信设置', key:'can3ComRate',   label:'CAN3通讯速率/仲裁域速率',    type:'u16' },
    { class:'通信设置', key:'can3DataBaud',  label:'CAN3数据域波特率',  type:'u16' },
    { class:'通信设置', key:'rs4851Baud',    label:'RS485-1 波特率',  type:'u16' },
    { class:'通信设置', key:'rs4852Baud',    label:'RS485-2 波特率',  type:'u16' },
    { class:'通信设置', key:'rs4853Baud',    label:'RS485-3 波特率',  type:'u16' },

    /* ⑫ 预留 8 B -------------------------------------------------------- */
    { key:'_skip5', type:'skip8' },

    /* ⑬ 电流传感器 ------------------------------------------------------ */
    { class:'电流传感器', key:'currentSensorType', label:'电流传感器类型',      type:'u16' },
    { class:'电流传感器', key:'sensor1Range',      label:'电流传感器1量程',     type:'u16', unit:'A' },
    { class:'电流传感器', key:'sensor2Range',      label:'电流传感器2量程',     type:'u16', unit:'A' },
    { class:'电流传感器', key:'sensor3Range',      label:'电流传感器3量程',     type:'u16', unit:'A' },

    /* ⑭ 预留 4 B -------------------------------------------------------- */
    { key:'_skip6', type:'skip4' },

    /* ⑮ 电池信息 / 簇额定参数 ------------------------------------------- */
    { class:'电池信息', key:'batteryType',        label:'电池类型',           type:'u16' },
    { class:'电池信息', key:'batteryModel',       label:'电池型号',           type:'u16' },
    { class:'电池信息', key:'batteryVendor',      label:'电池厂家',           type:'u16' },
    { class:'簇额定参数', key:'ratedCapacity',      label:'电池额定容量',   type:'u16', unit:'Ah' },
    { class:'簇额定参数', key:'clusterCalibEnergy', label:'簇校正电量',    type:'u32', scale:1000, unit:'kWh' },
    { class:'簇额定参数', key:'clusterRatedEnergy', label:'簇额定电量',    type:'u32', scale:1000, unit:'kWh' },
    { class:'簇额定参数', key:'clusterRatedPower',  label:'簇额定功率',     type:'u32', scale:1000, unit:'kW' },

    /* ⑯ 预留 8 B -------------------------------------------------------- */
    { key:'_skip7', type:'skip8' },

    /* ⑰ 均衡时间 / 阈值 -------------------------------------------------- */
    { class:'均衡参数', key:'balanceStartTime',    label:'均衡开启时间',          type:'u16', unit:'s' },
    { class:'均衡参数', key:'balanceStopTime',     label:'均衡关闭时间',          type:'u16', unit:'s' },
    { class:'均衡参数', key:'balanceModeOption',   label:'均衡模式选项',             type:'u16' },
    { class:'均衡参数', key:'balanceVoltMax',      label:'均衡启动单体电压上限',  type:'u16', unit:'mV' },
    { class:'均衡参数', key:'balanceVoltMin',      label:'均衡启动单体电压下限',  type:'u16', unit:'mV' },
    { class:'均衡参数', key:'balanceTempMax',      label:'均衡启动单体温度上限',      type:'s16', scale:10, unit:'℃' },
    { class:'均衡参数', key:'balanceTempMin',      label:'均衡启动单体温度下限',      type:'s16', scale:10, unit:'℃' },
    { class:'均衡参数', key:'openBalanceMaxTime',  label:'开路均衡最大时间',       type:'u16', unit:'s' },
    { class:'均衡参数', key:'chargeBalanceK',      label:'充电均衡阈值电压区间K值',            type:'u16' },
    { class:'均衡参数', key:'dischargeBalanceK',   label:'放电均衡阈值电压区间K值',            type:'u16' },
    { class:'均衡参数', key:'openBalanceK',        label:'开路均衡阈值电压区间K值',            type:'u16' },

    /* ⑱ 预留 10 B ------------------------------------------------------- */
    { key:'_skip8', type:'skip10' }
  ];



  export const ERROR_CODES = {
    0xE0:'成功', 0xE1: '失败', 0xE2: '超时', 0xE3: '繁忙', 0xE4:'参数错误', 0xE5: '当前模式不可配置'
  };




      // //簇端报警参数表
      // export const CLUSTER_DNS_PARAM = [
      //   { class:'簇端报警参数', key:'ClusterOverVolt', label:'簇端过压阈值(V)', type:'s16', scale:1000 },
      //   { class:'簇端报警参数', key:'ClusterUnderVolt', label:'簇端欠压阈值(V)', type:'s16', scale:1000 },
      //   { class:'簇端报警参数', key:'ClusterOverTemp', label:'簇端过温阈值(℃)', type:'s16', scale:10 }
      // ];
    
      // //包端报警参数表
      // export const PACK_DNS_PARAM = [
      //   { class:'包端报警参数', key:'PackOverVolt', label:'包端过压阈值(V)', type:'s16', scale:1000 },
      //   { class:'包端报警参数', key:'PackUnderVolt', label:'包端欠压阈值(V)', type:'s16', scale:1000 },
      //   { class:'包端报警参数', key:'PackOverTemp', label:'包端过温阈值(℃)', type:'s16', scale:10 }
      // ];
    
      // //单体电芯报警参数表
      // export const CELL_DNS_PARAM = [
      //   { class:'单体电芯报警参数', key:'CellOverVolt', label:'单体过压阈值(V)', type:'s16', scale:1000 },
      //   { class:'单体电芯报警参数', key:'CellUnderVolt', label:'单体欠压阈值(V)', type:'s16', scale:1000 },
      //   { class:'单体电芯报警参数', key:'CellOverTemp', label:'单体过温阈值(℃)', type:'s16', scale:10 }
      // ];


  // 完整展开后的簇端报警参数
  export const CLUSTER_DNS_PARAM_R = [
    // —— 簇端电压 上限 轻微/一般/严重（每组4项）
    { class: '簇端电压', key: 'clusterVoltUpMinorVal',        label: '簇端电压上限轻微报警值',        type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltUpMinorFilterMs',   label: '簇端电压上限轻微滤波时间',      type: 'u16',                  unit: 'ms' },
    { class: '簇端电压', key: 'clusterVoltUpMinorRecovVal',   label: '簇端电压上限轻微恢复值',        type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltUpMinorRecovFilterMs', label: '簇端电压上限轻微恢复滤波时间', type: 'u16',                  unit: 'ms' },
  
    { class: '簇端电压', key: 'clusterVoltUpGeneralVal',      label: '簇端电压上限一般报警值',        type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltUpGeneralFilterMs', label: '簇端电压上限一般滤波时间',      type: 'u16',                  unit: 'ms' },
    { class: '簇端电压', key: 'clusterVoltUpGeneralRecovVal', label: '簇端电压上限一般恢复值',        type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltUpGeneralRecovFilterMs', label: '簇端电压上限一般恢复滤波时间', type: 'u16',                  unit: 'ms' },
  
    { class: '簇端电压', key: 'clusterVoltUpSevereVal',       label: '簇端电压上限严重报警值',        type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltUpSevereFilterMs',  label: '簇端电压上限严重滤波时间',      type: 'u16',                  unit: 'ms' },
    { class: '簇端电压', key: 'clusterVoltUpSevereRecovVal',  label: '簇端电压上限严重恢复值',        type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltUpSevereRecovFilterMs', label: '簇端电压上限严重恢复滤波时间', type: 'u16',                  unit: 'ms' },
  
    // —— 簇端电压 下限
    { class: '簇端电压', key: 'clusterVoltDownMinorVal',        label: '簇端电压下限轻微报警值',       type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltDownMinorFilterMs',   label: '簇端电压下限轻微滤波时间',     type: 'u16',                  unit: 'ms' },
    { class: '簇端电压', key: 'clusterVoltDownMinorRecovVal',   label: '簇端电压下限轻微恢复值',       type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltDownMinorRecovFilterMs', label: '簇端电压下限轻微恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    { class: '簇端电压', key: 'clusterVoltDownGeneralVal',      label: '簇端电压下限一般报警值',       type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltDownGeneralFilterMs', label: '簇端电压下限一般滤波时间',     type: 'u16',                  unit: 'ms' },
    { class: '簇端电压', key: 'clusterVoltDownGeneralRecovVal', label: '簇端电压下限一般恢复值',       type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltDownGeneralRecovFilterMs', label: '簇端电压下限一般恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    { class: '簇端电压', key: 'clusterVoltDownSevereVal',       label: '簇端电压下限严重报警值',       type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltDownSevereFilterMs',  label: '簇端电压下限严重滤波时间',     type: 'u16',                  unit: 'ms' },
    { class: '簇端电压', key: 'clusterVoltDownSevereRecovVal',  label: '簇端电压下限严重恢复值',       type: 's16', scale: 10, unit: 'V' },
    { class: '簇端电压', key: 'clusterVoltDownSevereRecovFilterMs', label: '簇端电压下限严重恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    // —— 电流
    { class: '电流', key: 'chargeCurUpMinorVal',        label: '充电电流上限轻微报警值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'chargeCurUpMinorFilterMs',   label: '充电电流上限轻微滤波时间',     type: 'u16',                  unit: 'ms' },
    { class: '电流', key: 'chargeCurUpMinorRecovVal',   label: '充电电流上限轻微恢复值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'chargeCurUpMinorRecovFilterMs', label: '充电电流上限轻微恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    { class: '电流', key: 'chargeCurUpGeneralVal',      label: '充电电流上限一般报警值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'chargeCurUpGeneralFilterMs', label: '充电电流上限一般滤波时间',     type: 'u16',                  unit: 'ms' },
    { class: '电流', key: 'chargeCurUpGeneralRecovVal', label: '充电电流上限一般恢复值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'chargeCurUpGeneralRecovFilterMs', label: '充电电流上限一般恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    { class: '电流', key: 'chargeCurUpSevereVal',       label: '充电电流上限严重报警值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'chargeCurUpSevereFilterMs',  label: '充电电流上限严重滤波时间',     type: 'u16',                  unit: 'ms' },
    { class: '电流', key: 'chargeCurUpSevereRecovVal',  label: '充电电流上限严重恢复值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'chargeCurUpSevereRecovFilterMs', label: '充电电流上限严重恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    { class: '电流', key: 'dischargeCurUpMinorVal',        label: '放电电流上限轻微报警值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'dischargeCurUpMinorFilterMs',   label: '放电电流上限轻微滤波时间',     type: 'u16',                  unit: 'ms' },
    { class: '电流', key: 'dischargeCurUpMinorRecovVal',   label: '放电电流上限轻微恢复值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'dischargeCurUpMinorRecovFilterMs', label: '放电电流上限轻微恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    { class: '电流', key: 'dischargeCurUpGeneralVal',      label: '放电电流上限一般报警值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'dischargeCurUpGeneralFilterMs', label: '放电电流上限一般滤波时间',     type: 'u16',                  unit: 'ms' },
    { class: '电流', key: 'dischargeCurUpGeneralRecovVal', label: '放电电流上限一般恢复值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'dischargeCurUpGeneralRecovFilterMs', label: '放电电流上限一般恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    { class: '电流', key: 'dischargeCurUpSevereVal',       label: '放电电流上限严重报警值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'dischargeCurUpSevereFilterMs',  label: '放电电流上限严重滤波时间',     type: 'u16',                  unit: 'ms' },
    { class: '电流', key: 'dischargeCurUpSevereRecovVal',  label: '放电电流上限严重恢复值',       type: 's16', scale: 10, unit: 'A' },
    { class: '电流', key: 'dischargeCurUpSevereRecovFilterMs', label: '放电电流上限严重恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    // —— 绝缘电阻
    { class: '绝缘电阻', key: 'insulationMinorVal',        label: '绝缘电阻轻微报警值',            type: 's16', scale: 1, unit: 'kΩ' },
    { class: '绝缘电阻', key: 'insulationMinorFilterMs',   label: '绝缘电阻轻微滤波时间',          type: 'u16',                  unit: 'ms' },
    { class: '绝缘电阻', key: 'insulationMinorRecovVal',   label: '绝缘电阻轻微恢复值',            type: 's16', scale: 1, unit: 'kΩ' },
    { class: '绝缘电阻', key: 'insulationMinorRecovFilterMs', label: '绝缘电阻轻微恢复滤波时间',     type: 'u16',                  unit: 'ms' },
  
    { class: '绝缘电阻', key: 'insulationGeneralVal',     label: '绝缘电阻一般报警值',            type: 's16', scale: 1, unit: 'kΩ' },
    { class: '绝缘电阻', key: 'insulationGeneralFilterMs',label: '绝缘电阻一般滤波时间',          type: 'u16',                  unit: 'ms' },
    { class: '绝缘电阻', key: 'insulationGeneralRecovVal',label: '绝缘电阻一般恢复值',            type: 's16', scale: 1, unit: 'kΩ' },
    { class: '绝缘电阻', key: 'insulationGeneralRecovFilterMs', label: '绝缘电阻一般恢复滤波时间',   type: 'u16',                  unit: 'ms' },
  
    { class: '绝缘电阻', key: 'insulationSevereVal',       label: '绝缘电阻严重报警值',            type: 's16', scale: 1, unit: 'kΩ' },
    { class: '绝缘电阻', key: 'insulationSevereFilterMs',  label: '绝缘电阻严重滤波时间',          type: 'u16',                  unit: 'ms' },
    { class: '绝缘电阻', key: 'insulationSevereRecovVal',  label: '绝缘电阻严重恢复值',            type: 's16', scale: 1, unit: 'kΩ' },
    { class: '绝缘电阻', key: 'insulationSevereRecovFilterMs', label: '绝缘电阻严重恢复滤波时间',   type: 'u16',                  unit: 'ms' },
  
    // —— 簇端温度（5 路）Pos, Neg, Pre, Fan, Env
    // Pos（主正接触器）
    { class: '簇端温度', key: 'clusterTempPosMinorVal',        label: '主正接触器过温轻微报警值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPosMinorFilterMs',   label: '主正接触器过温轻微滤波时间',    type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempPosMinorRecovVal',   label: '主正接触器过温轻微恢复值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPosMinorRecovFilterMs', label: '主正接触器过温轻微恢复滤波时间', type: 'u16',                unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempPosGeneralVal',      label: '主正接触器过温一般报警值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPosGeneralFilterMs', label: '主正接触器过温一般滤波时间',    type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempPosGeneralRecovVal', label: '主正接触器过温一般恢复值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPosGeneralRecovFilterMs', label: '主正接触器过温一般恢复滤波时间', type: 'u16',                unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempPosSevereVal',      label: '主正接触器过温严重报警值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPosSevereFilterMs', label: '主正接触器过温严重滤波时间',    type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempPosSevereRecovVal', label: '主正接触器过温严重恢复值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPosSevereRecovFilterMs', label: '主正接触器过温严重恢复滤波时间', type: 'u16',                unit: 'ms' },
  
    // Neg（主负接触器）
    { class: '簇端温度', key: 'clusterTempNegMinorVal',        label: '主负接触器过温轻微报警值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempNegMinorFilterMs',   label: '主负接触器过温轻微滤波时间',    type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempNegMinorRecovVal',   label: '主负接触器过温轻微恢复值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempNegMinorRecovFilterMs', label: '主负接触器过温轻微恢复滤波时间', type: 'u16',               unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempNegGeneralVal',      label: '主负接触器过温一般报警值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempNegGeneralFilterMs', label: '主负接触器过温一般滤波时间',    type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempNegGeneralRecovVal', label: '主负接触器过温一般恢复值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempNegGeneralRecovFilterMs', label: '主负接触器过温一般恢复滤波时间', type: 'u16',              unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempNegSevereVal',      label: '主负接触器过温严重报警值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempNegSevereFilterMs', label: '主负接触器过温严重滤波时间',    type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempNegSevereRecovVal', label: '主负接触器过温严重恢复值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempNegSevereRecovFilterMs', label: '主负接触器过温严重恢复滤波时间', type: 'u16',              unit: 'ms' },
  
    // Pre（预充接触器）
    { class: '簇端温度', key: 'clusterTempPreMinorVal',        label: '预充接触器过温轻微报警值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPreMinorFilterMs',   label: '预充接触器过温轻微滤波时间',    type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempPreMinorRecovVal',   label: '预充接触器过温轻微恢复值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPreMinorRecovFilterMs', label: '预充接触器过温轻微恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempPreGeneralVal',      label: '预充接触器过温一般报警值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPreGeneralFilterMs', label: '预充接触器过温一般滤波时间',    type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempPreGeneralRecovVal', label: '预充接触器过温一般恢复值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPreGeneralRecovFilterMs', label: '预充接触器过温一般恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempPreSevereVal',      label: '预充接触器过温严重报警值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPreSevereFilterMs', label: '预充接触器过温严重滤波时间',    type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempPreSevereRecovVal', label: '预充接触器过温严重恢复值',      type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempPreSevereRecovFilterMs', label: '预充接触器过温严重恢复滤波时间',type: 'u16',                  unit: 'ms' },
  
    // Fan（风扇）
    { class: '簇端温度', key: 'clusterTempFanMinorVal',        label: '风扇过温轻微报警值',            type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempFanMinorFilterMs',   label: '风扇过温轻微滤波时间',          type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempFanMinorRecovVal',   label: '风扇过温轻微恢复值',            type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempFanMinorRecovFilterMs', label: '风扇过温轻微恢复滤波时间',     type: 'u16',                  unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempFanGeneralVal',      label: '风扇过温一般报警值',            type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempFanGeneralFilterMs', label: '风扇过温一般滤波时间',          type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempFanGeneralRecovVal', label: '风扇过温一般恢复值',            type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempFanGeneralRecovFilterMs', label: '风扇过温一般恢复滤波时间',     type: 'u16',                  unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempFanSevereVal',      label: '风扇过温严重报警值',            type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempFanSevereFilterMs', label: '风扇过温严重滤波时间',          type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempFanSevereRecovVal', label: '风扇过温严重恢复值',            type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempFanSevereRecovFilterMs', label: '风扇过温严重恢复滤波时间',     type: 'u16',                  unit: 'ms' },
  
    // Env（BCU环境温度）
    { class: '簇端温度', key: 'clusterTempEnvMinorVal',        label: 'BCU环境温度轻微报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempEnvMinorFilterMs',   label: 'BCU环境温度轻微滤波时间',       type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempEnvMinorRecovVal',   label: 'BCU环境温度轻微恢复值',         type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempEnvMinorRecovFilterMs', label: 'BCU环境温度轻微恢复滤波时间', type: 'u16',                  unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempEnvGeneralVal',      label: 'BCU环境温度一般报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempEnvGeneralFilterMs', label: 'BCU环境温度一般滤波时间',       type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempEnvGeneralRecovVal', label: 'BCU环境温度一般恢复值',         type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempEnvGeneralRecovFilterMs', label: 'BCU环境温度一般恢复滤波时间', type: 'u16',                  unit: 'ms' },
  
    { class: '簇端温度', key: 'clusterTempEnvSevereVal',      label: 'BCU环境温度严重报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempEnvSevereFilterMs', label: 'BCU环境温度严重滤波时间',       type: 'u16',                  unit: 'ms' },
    { class: '簇端温度', key: 'clusterTempEnvSevereRecovVal', label: 'BCU环境温度严重恢复值',         type: 's16', scale: 10, unit: '℃' },
    { class: '簇端温度', key: 'clusterTempEnvSevereRecovFilterMs', label: 'BCU环境温度严重恢复滤波时间', type: 'u16',                  unit: 'ms' },
  
    // —— 保留后续空间
    { class: '保留', key: '_skip_alarm', type: 'skip12' }
  ];
  
  

export const PACK_DNS_PARAM_R = [
  // BMU 电压 上限/下限（轻微/一般/严重）
  { class: 'BMU电压', key: 'packVoltUpMinorVal', label: 'BMU 电压上限轻微报警值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltUpMinorFilterMs', label: 'BMU 电压上限轻微报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU电压', key: 'packVoltUpMinorRecovVal', label: 'BMU 电压上限轻微报警恢复值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltUpMinorRecovFilterMs', label: 'BMU 电压上限轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },

  { class: 'BMU电压', key: 'packVoltUpGeneralVal', label: 'BMU 电压上限一般报警值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltUpGeneralFilterMs', label: 'BMU 电压上限一般报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU电压', key: 'packVoltUpGeneralRecovVal', label: 'BMU 电压上限一般报警恢复值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltUpGeneralRecovFilterMs', label: 'BMU 电压上限一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

  { class: 'BMU电压', key: 'packVoltUpSevereVal', label: 'BMU 电压上限严重报警值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltUpSevereFilterMs', label: 'BMU 电压上限严重报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU电压', key: 'packVoltUpSevereRecovVal', label: 'BMU 电压上限严重报警恢复值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltUpSevereRecovFilterMs', label: 'BMU 电压上限严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  { class: 'BMU电压', key: 'packVoltDownMinorVal', label: 'BMU 电压下限轻微报警值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDownMinorFilterMs', label: 'BMU 电压下限轻微报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU电压', key: 'packVoltDownMinorRecovVal', label: 'BMU 电压下限轻微报警恢复值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDownMinorRecovFilterMs', label: 'BMU 电压下限轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },

  { class: 'BMU电压', key: 'packVoltDownGeneralVal', label: 'BMU 电压下限一般报警值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDownGeneralFilterMs', label: 'BMU 电压下限一般报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU电压', key: 'packVoltDownGeneralRecovVal', label: 'BMU 电压下限一般报警恢复值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDownGeneralRecovFilterMs', label: 'BMU 电压下限一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

  { class: 'BMU电压', key: 'packVoltDownSevereVal', label: 'BMU 电压下限严重报警值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDownSevereFilterMs', label: 'BMU 电压下限严重报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU电压', key: 'packVoltDownSevereRecovVal', label: 'BMU 电压下限严重报警恢复值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDownSevereRecovFilterMs', label: 'BMU 电压下限严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  // BMU 电压压差 轻微/一般/严重
  { class: 'BMU电压', key: 'packVoltDiffMinorVal', label: 'BMU 电压压差轻微报警值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDiffMinorFilterMs', label: 'BMU 电压压差轻微报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU电压', key: 'packVoltDiffMinorRecovVal', label: 'BMU 电压压差轻微报警恢复值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDiffMinorRecovFilterMs', label: 'BMU 电压压差轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },

  { class: 'BMU电压', key: 'packVoltDiffGeneralVal', label: 'BMU 电压压差一般报警值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDiffGeneralFilterMs', label: 'BMU 电压压差一般报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU电压', key: 'packVoltDiffGeneralRecovVal', label: 'BMU 电压压差一般报警恢复值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDiffGeneralRecovFilterMs', label: 'BMU 电压压差一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

  { class: 'BMU电压', key: 'packVoltDiffSevereVal', label: 'BMU 电压压差严重报警值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDiffSevereFilterMs', label: 'BMU 电压压差严重报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU电压', key: 'packVoltDiffSevereRecovVal', label: 'BMU 电压压差严重报警恢复值', type: 's16', scale: 10, unit: 'V' },
  { class: 'BMU电压', key: 'packVoltDiffSevereRecovFilterMs', label: 'BMU 电压压差严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  // BMU 电路板温度 上限/下限/温差（上限、下限、温差 各 12 项）
  // 上限
  { class: 'BMU温度', key: 'packBoardTempUpMinorVal', label: 'BMU 电路板温度上限轻微报警值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempUpMinorFilterMs', label: 'BMU 电路板温度上限轻微报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempUpMinorRecovVal', label: 'BMU 电路板温度上限轻微报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempUpMinorRecovFilterMs', label: 'BMU 电路板温度上限轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempUpGeneralVal', label: 'BMU 电路板温度上限一般报警值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempUpGeneralFilterMs', label: 'BMU 电路板温度上限一般报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempUpGeneralRecovVal', label: 'BMU 电路板温度上限一般报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempUpGeneralRecovFilterMs', label: 'BMU 电路板温度上限一般报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempUpSevereVal', label: 'BMU 电路板温度上限严重报警值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempUpSevereFilterMs', label: 'BMU 电路板温度上限严重报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempUpSevereRecovVal', label: 'BMU 电路板温度上限严重报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempUpSevereRecovFilterMs', label: 'BMU 电路板温度上限严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  // 下限
  { class: 'BMU温度', key: 'packBoardTempDownMinorVal', label: 'BMU 电路板温度下限轻微报警值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDownMinorFilterMs', label: 'BMU 电路板温度下限轻微报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDownMinorRecovVal', label: 'BMU 电路板温度下限轻微报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDownMinorRecovFilterMs', label: 'BMU 电路板温度下限轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDownGeneralVal', label: 'BMU 电路板温度下限一般报警值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDownGeneralFilterMs', label: 'BMU 电路板温度下限一般报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDownGeneralRecovVal', label: 'BMU 电路板温度下限一般报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDownGeneralRecovFilterMs', label: 'BMU 电路板温度下限一般报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDownSevereVal', label: 'BMU 电路板温度下限严重报警值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDownSevereFilterMs', label: 'BMU 电路板温度下限严重报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDownSevereRecovVal', label: 'BMU 电路板温度下限严重报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDownSevereRecovFilterMs', label: 'BMU 电路板温度下限严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  // 温差
  { class: 'BMU温度', key: 'packBoardTempDiffMinorVal', label: 'BMU 电路板温度温差轻微报警值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDiffMinorFilterMs', label: 'BMU 电路板温度温差轻微报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDiffMinorRecovVal', label: 'BMU 电路板温度温差轻微报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDiffMinorRecovFilterMs', label: 'BMU 电路板温度温差轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDiffGeneralVal', label: 'BMU 电路板温度温差一般报警值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDiffGeneralFilterMs', label: 'BMU 电路板温度温差一般报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDiffGeneralRecovVal', label: 'BMU 电路板温度温差一般报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDiffGeneralRecovFilterMs', label: 'BMU 电路板温度温差一般报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDiffSevereVal', label: 'BMU 电路板温度温差严重报警值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDiffSevereFilterMs', label: 'BMU 电路板温度温差严重报警滤波时间', type: 'u16', unit: 'ms' },
  { class: 'BMU温度', key: 'packBoardTempDiffSevereRecovVal', label: 'BMU 电路板温度温差严重报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU温度', key: 'packBoardTempDiffSevereRecovFilterMs', label: 'BMU 电路板温度温差严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  // 动力接插件 1/2 过温（轻微/一般/严重）
  // 插件1
  { class: '接插件温度', key: 'plug1TempMinorVal', label: '动力接插件1过温轻微报警值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug1TempMinorFilterMs', label: '动力接插件1过温轻微报警滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plug1TempMinorRecovVal', label: '动力接插件1过温轻微报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug1TempMinorRecovFilterMs', label: '动力接插件1过温轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plug1TempGeneralVal', label: '动力接插件1过温一般报警值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug1TempGeneralFilterMs', label: '动力接插件1过温一般报警滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plug1TempGeneralRecovVal', label: '动力接插件1过温一般报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug1TempGeneralRecovFilterMs', label: '动力接插件1过温一般报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plug1TempSevereVal', label: '动力接插件1过温严重报警极值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug1TempSevereFilterMs', label: '动力接插件1过温严重报警滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plug1TempSevereRecovVal', label: '动力接插件1过温严重报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug1TempSevereRecovFilterMs', label: '动力接插件1过温严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  // 插件2
  { class: '接插件温度', key: 'plug2TempMinorVal', label: '动力接插件2过温轻微报警值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug2TempMinorFilterMs', label: '动力接插件2过温轻微报警滤波时间', type: 'u16', unit: 'ms' },  
  { class: '接插件温度', key: 'plug2TempMinorRecovVal', label: '动力接插件2过温轻微报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug2TempMinorRecovFilterMs', label: '动力接插件2过温轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plug2TempGeneralVal', label: '动力接插件2过温一般报警值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug2TempGeneralFilterMs', label: '动力接插件2过温一般报警滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plug2TempGeneralRecovVal', label: '动力接插件2过温一般报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug2TempGeneralRecovFilterMs', label: '动力接插件2过温一般报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plug2TempSevereVal', label: '动力接插件2过温严重报警值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug2TempSevereFilterMs', label: '动力接插件2过温严重报警滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plug2TempSevereRecovVal', label: '动力接插件2过温严重报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plug2TempSevereRecovFilterMs', label: '动力接插件2过温严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  // 预留空间
  { class: '保留', key: '_skip_pack_alarm', type: 'skip16' }
];


  // 单体报警参数表
  export const CELL_DNS_PARAM_R = [
    // ———— 单体电压 ————
    { class: '单体电压', key: 'cellVoltOverMinorVal',           label: '单体电压过压轻微报警值',            type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverMinorFilterMs',      label: '单体电压过压轻微报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltOverMinorRecovVal',      label: '单体电压过压轻微报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverMinorRecovFilterMs', label: '单体电压过压轻微报警恢复滤波时间',  type: 'u16', unit: 'ms' },
  
    { class: '单体电压', key: 'cellVoltOverGeneralVal',         label: '单体电压过压一般报警值',             type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverGeneralFilterMs',    label: '单体电压过压一般报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltOverGeneralRecovVal',    label: '单体电压过压一般报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverGeneralRecovFilterMs', label: '单体电压过压一般报警恢复滤波时间', type: 'u16', unit: 'ms' },
  
    // 电压其他项（按同样规则添加unit并清理label）...
  
    // ———— 单体温度 ————
    { class: '单体温度', key: 'cellChargeOverMinorVal',           label: '充电单体温度上限轻微报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeOverMinorFilterMs',      label: '充电单体温度上限轻微报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellChargeOverMinorRecovVal',      label: '充电单体温度上限轻微报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeOverMinorRecovFilterMs', label: '充电单体温度上限轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },
  
    { class: '单体温度', key: 'cellDischargeOverMinorVal',           label: '放电单体温度上限轻微报警值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeOverMinorFilterMs',      label: '放电单体温度上限轻微报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellDischargeOverMinorRecovVal',      label: '放电单体温度上限轻微报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeOverMinorRecovFilterMs', label: '放电单体温度上限轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },
  
    // 温度其他项（按同样规则添加unit并清理label）...
  
    // ———— 单体SOC ————
    { class: '单体SOC', key: 'cellSocOverMinorVal',           label: '单体SOC过高轻微报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocOverMinorFilterMs',      label: '单体SOC过高轻微报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocOverMinorRecovVal',      label: '单体SOC过高轻微报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocOverMinorRecovFilterMs', label: '单体SOC过高轻微报警恢复滤波时间',      type: 'u16', unit: 'ms' },
  
    // SOC其他项（按同样规则添加unit并清理label）...
  
    // ———— 单体SOH ————
    { class: '单体SOH', key: 'cellSohUnderSevereVal',         label: '单体SOH过低严重报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohUnderSevereFilterMs',    label: '单体SOH过低严重报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohUnderSevereRecovVal',    label: '单体SOH过低严重报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohUnderSevereRecovFilterMs',label: '单体SOH过低严重报警恢复滤波时间',     type: 'u16', unit: 'ms' },
  
    // ———— 预留空间 ————
    { class: '保留', key: '_skip_pack_alarm', type: 'skip20' }
  ];



//SOX 参数表定义
// 实时保存数据表
export const REAL_TIME_SAVE_R = [
  // ———— SOC 相关数据 ————
  { class: '实时SOX数据', key: 'clusterDisplaySoc', label: '簇端显示SOC', type: 'u16', scale: 10, unit: '%' },
  { class: '实时SOX数据', key: 'cellMaxSoc', label: '单体最大SOC', type: 'u16', scale: 10, unit: '%' },
  { class: '实时SOX数据', key: 'cellMinSoc', label: '单体最小SOC', type: 'u16', scale: 10, unit: '%' },
  { class: '实时SOX数据', key: '_reserve1', label: '预留1', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve2', label: '预留2', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve3', label: '预留3', type: 'u16' },

  { class: '实时SOX数据', key: 'prevOnlineSoh', label: '前一次在线SOH', type: 'u16', scale: 10, unit: '%' },

  ...Array.from({ length: 10 }, (_, i) => ({
    class: '实时SOX数据',
    key: `historySoh${i + 1}`,
    label: `保存的历史SOH值${i + 1}`,
    type: 'u16',
    scale: 10,
    unit: '%'
  })),

  // 保存的历史工况权重值
  ...Array.from({ length: 10 }, (_, i) => ({
    class: '实时SOX数据',
    key: `historyConditionWeight${i + 1}`,
    label: `保存的历史工况权重值${i + 1}`,
    type: 'u16',
    scale: 1,
    unit: '%'
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    class: '实时SOX数据',
    key: `historyInterval${i + 1}`,
    label: `保存的历史时间间隔${i + 1}`,
    type: 'u16'
  })),

  { class: '实时SOX数据', key: 'prevTriggerTime', label: '前一次触发时间', type: 'u16' },
  { class: '实时SOX数据', key: 'cycleCount', label: '循环次数', type: 'u32' },

  { class: '实时SOX数据', key: 'sohCalcChargeAccTime1', label: 'SOH计算-充电累积时', type: 'f32', scale: 10, unit: 'Ah' },
  { class: '实时SOX数据', key: 'sohCalcDischargeAccTime1', label: 'SOH计算-放电累积时', type: 'f32', scale: 10, unit: 'Ah' },
  { class: '实时SOX数据', key: 'sohPowerOnInitFlag', label: 'SOH上电初始化标志位', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve4', label: '预留4', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve5', label: '预留5', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve6', label: '预留6', type: 'u16' },

  { class: '实时SOX数据', key: 'clusterSoe', label: '簇端SOE', type: 'u16', scale: 10, unit: '%' },
  { class: '实时SOX数据', key: 'chargeEfficiency', label: '充电效率', type: 'u16', scale: 100, unit: '%' },


  { class: '实时SOX数据', key: 'availableEnergy', label: '可用电量', type: 'u16', scale: 100, unit: 'kW' },
  { class: '实时SOX数据', key: 'totalChargeEnergy', label: '累计充电电量', type: 'u32', scale: 1, unit: 'kWh' },
  { class: '实时SOX数据', key: 'totalDischargeEnergy', label: '累计放电电量', type: 'u32', scale: 1, unit: 'kWh' },
  { class: '实时SOX数据', key: 'totalChargeCapacity', label: '累计充电容量', type: 'u32', scale: 1, unit: 'Ah' },
  { class: '实时SOX数据', key: 'totalDischargeCapacity', label: '累计放电容量', type: 'u32', scale: 1, unit: 'Ah' },
  { class: '实时SOX数据', key: '_reserve7', label: '预留7', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve8', label: '预留8', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve9', label: '预留9', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve10', label: '预留10', type: 'u16' },

  { class: '实时SOX数据', key: 'faultProtectCount', label: '故障保护次数', type: 'u16' },
  { class: '实时SOX数据', key: 'voltageOverLimitCount', label: '电压过限次数', type: 'u16' },
  { class: '实时SOX数据', key: 'tempOverLimitCount', label: '温度过限次数', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve11', label: '预留11', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve12', label: '预留12', type: 'u16' },
  { class: '实时SOX数据', key: '_reserve13', label: '预留13', type: 'u16' }
];

// SOX算法配置参数-通用参数表
export const SOX_CFG_PARAM_R = [
  { class: 'SOX通用参数', key: 'validCellCount', label: '有效电芯数量', type: 'u16' },
  { class: 'SOX通用参数', key: 'cellRealCapacity', label: '电芯实际容量', type: 'u16', scale: 10, unit: 'Ah' },
  { class: 'SOX通用参数', key: 'cellRatedCapacity', label: '电芯额定容量', type: 'u16', scale: 10, unit: 'Ah' },
  { class: 'SOX通用参数', key: 'cellFullChargeVolt', label: '电芯满充电电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOX通用参数', key: 'cellEmptyDischargeVolt', label: '电芯放空电电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOX通用参数', key: 'cellCurrentUpperLimit', label: '电芯电流上限值', type: 's16', scale: 10, unit: 'A' },
  { class: 'SOX通用参数', key: 'cellCurrentLowerLimit', label: '电芯电流下限值', type: 's16', scale: 10, unit: 'A' },
  { class: 'SOX通用参数', key: 'cellTempUpperLimit', label: '电芯温度上限值', type: 's16', scale: 10, unit: '℃' },
  { class: 'SOX通用参数', key: 'cellTempLowerLimit', label: '电芯温度下限值', type: 's16', scale: 10, unit: '℃' },
  { class: 'SOX通用参数', key: 'cellVoltUpperLimit', label: '电芯电压上限值', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOX通用参数', key: 'cellVoltLowerLimit', label: '电芯电压下限值', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOX通用参数', key: '_reserve1', label: '预留1', type: 'u16' },
  { class: 'SOX通用参数', key: '_reserve2', label: '预留2', type: 'u16' }
];

// SOC算法配置参数表
export const SOC_CFG_PARAM_R = [
  { class: 'SOC算法参数', key: 'rackSocUpperLimit', label: 'RackSOC_SOC取值范围上限值', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOC算法参数', key: 'rackSocLowerLimit', label: 'RackSOC_SOC取值范围下限值', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOC算法参数', key: 'socLowCalibUpperVolt', label: 'SOC低端校准上限电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOC算法参数', key: 'socHighCalibUpperVolt', label: 'SOC高端校准上限电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOC算法参数', key: 'socStandTemp', label: 'SOC静置校准温度', type: 'u16', scale: 10, unit: '℃' },
  { class: 'SOC算法参数', key: 'socBgNormalTempTime', label: 'SOC静置常温校准时间', type: 'u32', scale: 10, unit: 's' },
  { class: 'SOC算法参数', key: 'socBgHighTempTime', label: 'SOC静置低温校准时间', type: 'u32', scale: 10, unit: 's' },
  { class: 'SOC算法参数', key: 'socBgLowTempTime', label: 'SOC静置校准电流触发阈值', type: 'u16', scale: 10, unit: 's' },
  { class: 'SOC算法参数', key: 'socBgCalibTempThreshold', label: 'SOC静置校准温度触发阈值', type: 's16', scale: 10, unit: '℃' },
  ...Array.from({ length: 6 }, (_, i) => ({
    class: 'SOC算法参数',
    key: `sleepWakeCalibTime${i + 1}`,
    label: `休眠唤醒校准时间与温度对应表_时间${i + 1}`,
    type: 'u16',
    scale: 1,
    unit: 's'
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    class: 'SOC算法参数',
    key: `sleepWakeCalibTemp${i + 1}`,
    label: `休眠唤醒校准时间与温度对应表_温度${i + 1}`,
    type: 's16',
    scale: 10,
    unit: '℃'
  })),
  { class: 'SOC算法参数', key: 'displaySocRackSocDiffRange', label: '显示SOC与RackSOC差值范围', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOC算法参数', key: 'displaySocFollowRealSocTime', label: '显示SOC追随真实SOC时间', type: 'u16', scale: 10, unit: 's' },
  
  ...Array.from({ length: 21 }, (_, i) => ({
    class: 'SOC算法参数',
    key: `chargeOcvTable${i + 1}`,
    label: `充电OCV表(电压输入)${i + 1}`,
    type: 'u16',
    scale: 1,
    unit: 'mV'
  })),

  ...Array.from({ length: 21 }, (_, i) => ({
    class: 'SOC算法参数',
    key: `dischargeOcvTable${i + 1}`,
    label: `放电OCV表(电压输入)${i + 1}`,
    type: 'u16',
    scale: 1,
    unit: 'mV'
  })),

  ...Array.from({ length: 6 }, (_, i) => ({
    class: 'SOC算法参数',
    key: `chargeCorrectVoltageKnee97${i + 1}`,
    label: `充电修正电压拐点表(97%)${i + 1}`,
    type: 'u16',
    scale: 1,
    unit: 'mV'
  })),
  
  ...Array.from({ length: 6 }, (_, i) => ({
    class: 'SOC算法参数',
    key: `chargeCorrectStep97${i + 1}`,
    label: `充电修正步长表${i + 1}`,
    type: 'u16',
    scale: 1,
    unit: 'mV'
  })),
  
  ...Array.from({ length: 6 }, (_, i) => ({
    class: 'SOC算法参数',
    key: `dischargeCorrectCurrentRange${i + 1}`,
    label: `放电修正电流区间${i + 1}`,
    type: 's16',
    scale: 10,
    unit: 'A'
  })),

  
  { class: 'SOC算法参数', key: 'catchUpTime97', label: '97%点追赶时间', type: 's16', scale: 10, unit: 's' },

  
  ...Array.from({ length: 6 }, (_, i) => ({
    class: 'SOC算法参数',
    key: `chargeCorrectVoltageKnee99${i + 1}`,
    label: `充电修正电压拐电表(99%)${i + 1}`,
    type: 'u16',
    scale: 1,
    unit: 'mV'
  })),

  ...Array.from({ length: 6 }, (_, i) => ({
    class: 'SOC算法参数',
    key: `chargeCorrectStep${i + 1}`,
    label: `充电修正步长表${i + 1}`,
    type: 'u16',
    scale: 1,
    unit: 'mV'
  })),


  { class: 'SOC算法参数', key: 'chargeCatchUpTime99',         label: '99%点追赶时间',               type: 'u16', scale: 10,   unit: 's' },
  { class: 'SOC算法参数', key: 'DischargeCorrectVol025C', label: '放电修正电压拐点-0.5C', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOC算法参数', key: 'DischargeCorrectVol05C', label: '放电修正电压拐点-0.25C', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOC算法参数', key: 'chargeDischargeCorrectCurrent025C', label: '充放电修正电流=0.25C', type: 's16', scale: 10, unit: 'A' },
  { class: 'SOC算法参数', key: 'chargeDischargeCorrectCurrent05C', label: '充放电修正电流=0.5C', type: 's16', scale: 10, unit: 'A' },
  { class: 'SOC算法参数', key: 'catchUpTime5Knee', label: '放电5拐点真实SOC追赶时间', type: 'u16', scale: 10, unit: 's' },
  { class: 'SOC算法参数', key: '_reserve1', label: '预留1', type: 'u16' },
  { class: 'SOC算法参数', key: '_reserve2', label: '预留2', type: 'u16' },
  { class: 'SOC算法参数', key: '_reserve3', label: '预留3', type: 'u16' },
  { class: 'SOC算法参数', key: '_reserve4', label: '预留4', type: 'u16' }
];

// SOH算法配置参数表
export const SOH_CFG_PARAM_R = [
  { class: 'SOH算法参数', key: 'sohBgTempLowerLimit', label: 'SOH背景条件_温度下限', type: 's16', scale: 10, unit: '℃' },
  { class: 'SOH算法参数', key: 'maxMinSocDiff', label: '最大最小soc差值', type: 'u16', scale: 10 },
  { class: 'SOH算法参数', key: 'batteryDischargeCapacityMaxPercent', label: '电池放电容量最大百分百值', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOH算法参数', key: 'sohCalibUpperLimitSoc', label: 'SOH校准上限值SOC值', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOH算法参数', key: 'cellCycleSoh1', label: '电芯循环次数对应的SOH值1', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOH算法参数', key: 'cellCycleSoh2', label: '电芯循环次数对应的SOH值2', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOH算法参数', key: 'cellCycleCount1', label: '电芯循环次数1', type: 'u16' },
  { class: 'SOH算法参数', key: 'cellCycleCount2', label: '电芯循环次数2', type: 'u16' },
  { class: 'SOH算法参数', key: 'socChangeWeight1', label: 'SOC变化权重值1', type: 'u16', scale: 10 },
  { class: 'SOH算法参数', key: 'socChangeWeight2', label: 'SOC变化权重值2', type: 'u16', scale: 10 },
  { class: 'SOH算法参数', key: 'socChangeValue1', label: 'SOC变化值1', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOH算法参数', key: 'socChangeValue2', label: 'SOC变化值2', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOH算法参数', key: 'computerSohUpperLimit', label: '计算的SOH值范围上限', type: 'u16', scale: 10, unit: '%' },
  { class: 'SOH算法参数', key: 'computerSohLowerLimit', label: '计算的SOH值范围下限', type: 'u16', scale: 10, unit: '%' },
  ...Array.from({ length: 4 }, (_, i) => ({
    class: 'SOH算法参数',
    key: `intervalWeight${i + 1}`,
    label: `时间间隔对应权重${i + 1}`,
    type: 'u32',
    scale: 100,
    unit: '0.01'
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    class: 'SOH算法参数',
    key: `sohCalcTimeInterval${i + 1}`,
    label: `SOH计算时间间隔${i + 1}`,
    type: 'u16'
  })),
  { class: 'SOH算法参数', key: '_reserve1', label: '预留1', type: 'u16' },
  { class: 'SOH算法参数', key: '_reserve2', label: '预留2', type: 'u16' },
  { class: 'SOH算法参数', key: '_reserve3', label: '预留3', type: 'u16' },
  { class: 'SOH算法参数', key: '_reserve4', label: '预留4', type: 'u16' }
];

// 堆汇总信息表 - 74个字段
export const BLOCK_SUMMARY = [
  { class: '堆基本信息', key: 'totalClusters', label: '簇总数', type: 'u16', scale: 1 },
  { class: '堆基本信息', key: 'onlineClusters', label: '在线簇数', type: 'u16', scale: 1 },
  { class: '堆基本信息', key: 'stackVoltage', label: '堆电压', type: 'u16', scale: 10, unit: 'V' },
  { class: '堆基本信息', key: 'stackCurrent', label: '堆电流', type: 's16', scale: 10, unit: 'A', remarks: '默认无效值为大于0x7FFE' },
  { class: '堆基本信息', key: 'stackSOC', label: '堆SOC', type: 'u16', scale: 10, unit: '%' },
  { class: '堆基本信息', key: 'stackSOH', label: '堆SOH', type: 'u16', scale: 10, unit: '%' },
  { class: '堆基本信息', key: 'stackSOE', label: '堆SOE', type: 'u16', scale: 10, unit: '%' },
  { class: '堆基本信息', key: 'stackSOP', label: '堆SOP', type: 's16', scale: 10, unit: '%' },
  { class: '堆基本信息', key: 'stackChargeSOP', label: '堆充电SOP', type: 'u16', scale: 10, unit: '%' },
  { class: '堆基本信息', key: 'stackDischargeSOP', label: '堆放电SOP', type: 'u16', scale: 10, unit: '%' },
  { class: '堆基本信息', key: 'insulationResistanceRPlus', label: '绝缘电阻R+', type: 'u16', scale: 1, unit: 'KΩ' },
  { class: '堆基本信息', key: 'insulationResistanceRMinus', label: '绝缘电阻R-', type: 'u16', scale: 1, unit: 'KΩ' },
  { class: '堆基本信息', key: 'maxAllowableChargePower', label: '堆最大允许充电功率', type: 'u16', scale: 1, unit: 'kW' },
  { class: '堆基本信息', key: 'maxAllowableDischargePower', label: '堆最大允许放电功率', type: 'u16', scale: 1, unit: 'kW' },
  { class: '堆基本信息', key: 'maxAllowableChargeCurrent', label: '堆最大允许充电电流', type: 'u16', scale: 1, unit: 'A' },
  { class: '堆基本信息', key: 'maxAllowableDischargeCurrent', label: '堆最大允许放电电流', type: 'u16', scale: 1, unit: 'A' },
  { class: '堆基本信息', key: 'maxAllowableChargeVoltage', label: '堆最大允许充电电压', type: 'u16', scale: 10, unit: 'V' },
  { class: '堆基本信息', key: 'maxAllowableDischargeVoltage', label: '堆最大允许放电电压', type: 'u16', scale: 10, unit: 'V' },
  { class: '堆基本信息', key: 'maxTripLimitChargeCurrent', label: '堆最大跳闸限制充电电流', type: 'u16', scale: 10, unit: 'A' },
  { class: '堆基本信息', key: 'maxTripLimitDischargeCurrent', label: '堆最大跳闸限制放电电流', type: 'u16', scale: 10, unit: 'A' },
  { class: '堆基本信息', key: 'maxTripLimitChargeVoltage', label: '堆最大跳闸限制充电电压', type: 'u16', scale: 10, unit: 'V' },
  { class: '堆基本信息', key: 'maxTripLimitDischargeVoltage', label: '堆最大跳闸限制放电电压', type: 'u16', scale: 10, unit: 'V' },
  { class: '堆基本信息', key: 'maxAllowableChargeCellVoltage', label: '堆最大允许充电单体电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: '堆基本信息', key: 'minAllowableDischargeCellVoltage', label: '堆最小允许放电单体电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: '堆基本信息', key: 'cellAverageVoltage', label: '堆单体平均电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: '堆基本信息', key: 'cellAverageTemperature', label: '堆单体平均温度', type: 's16', scale: 10, unit: '℃' },
  { class: '堆基本信息', key: 'interClusterVoltageDifference', label: '簇间压差', type: 'u16', scale: 10, unit: 'V' },
  { class: '堆基本信息', key: 'interClusterCurrentDifference', label: '簇间电流差', type: 'u16', scale: 10, unit: 'A' },
  { class: '堆基本信息', key: 'interClusterSOCDifference', label: '簇间SOC差', type: 'u16', scale: 10, unit: '%' },
  { class: '堆基本信息', key: 'ratedCapacity', label: '堆额定容量', type: 'u16', scale: 1, unit: 'Ah' },
  { class: '堆基本信息', key: 'ratedEnergy', label: '堆额定电量', type: 'u16', scale: 1, unit: 'kWh' },
  { class: '堆基本信息', key: 'remainingCapacity', label: '堆剩余容量', type: 'u16', scale: 1, unit: 'Ah' },
  { class: '堆基本信息', key: 'remainingEnergy', label: '堆剩余电量', type: 'u16', scale: 1, unit: 'kWh' },
  { class: '堆基本信息', key: 'chargeableEnergy', label: '堆可充电量', type: 'u16', scale: 1, unit: 'kWh' },
  { class: '堆基本信息', key: 'dischargeableEnergy', label: '堆可放电量', type: 'u16', scale: 1, unit: 'kWh' },
  { class: '堆基本信息', key: 'singleChargeEnergy', label: '堆单次充电电量', type: 'u16', scale: 1, unit: 'kWh' },
  { class: '堆基本信息', key: 'singleDischargeEnergy', label: '堆单次放电电量', type: 'u16', scale: 1, unit: 'kWh' },
  { class: '堆基本信息', key: 'singleChargeCapacity', label: '堆单次充电容量', type: 'u16', scale: 1, unit: 'Ah' },
  { class: '堆基本信息', key: 'singleDischargeCapacity', label: '堆单次放电容量', type: 'u16', scale: 1, unit: 'Ah' },
  { class: '堆基本信息', key: 'dailyChargeEnergy', label: '堆日充电电量', type: 'u16', scale: 1, unit: 'kWh' },
  { class: '堆基本信息', key: 'dailyDischargeEnergy', label: '堆日放电电量', type: 'u16', scale: 1, unit: 'kWh' },
  { class: '堆基本信息', key: 'totalChargeEnergy', label: '堆累计充电量', type: 'u32', scale: 1, unit: 'kWh' },
  { class: '堆基本信息', key: 'totalDischargeEnergy', label: '堆累计放电量', type: 'u32', scale: 1, unit: 'kWh' },

  { class: '最大最小值', key: 'clusterVoltageMax', label: '簇电压最大值', type: 'u16', scale: 10, unit: 'V' },
  { class: '最大最小值', key: 'clusterVoltageMaxClusterId', label: '簇电压最大值簇号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'clusterVoltageMin', label: '簇电压最小值', type: 'u16', scale: 10, unit: 'V' },
  { class: '最大最小值', key: 'clusterVoltageMinClusterId', label: '簇电压最小值簇号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'clusterSOCMax', label: '簇SOC最大值', type: 'u16', scale: 10, unit: '%' },
  { class: '最大最小值', key: 'clusterSOCMaxClusterId', label: '簇SOC最大值簇号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'clusterSOCMin', label: '簇SOC最小值', type: 'u16', scale: 10, unit: '%' },
  { class: '最大最小值', key: 'clusterSOCMinClusterId', label: '簇SOC最小值簇号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'stackCellVoltageMax', label: '堆单体电压最大值', type: 'u16', scale: 1, unit: 'mV' },
  { class: '最大最小值', key: 'stackCellVoltageMaxClusterId', label: '堆单体电压最大值簇号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'stackCellVoltageMaxNodeId', label: '堆单体电压最大值节号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'stackCellVoltageMin', label: '堆单体电压最小值', type: 'u16', scale: 1, unit: 'mV' },
  { class: '最大最小值', key: 'stackCellVoltageMinClusterId', label: '堆单体电压最小值簇号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'stackCellVoltageMinNodeId', label: '堆单体电压最小值节号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'stackCellVoltageDifferenceRange', label: '堆单体电压压差极差值', type: 'u16', scale: 1, unit: 'mV' },
  { class: '最大最小值', key: 'stackCellTemperatureMax', label: '堆单体温度最大值', type: 's16', scale: 10, unit: '℃' },
  { class: '最大最小值', key: 'stackCellTemperatureMaxClusterId', label: '堆单体温度最大值簇号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'stackCellTemperatureMaxNodeId', label: '堆单体温度最大值节号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'stackCellTemperatureMin', label: '堆单体温度最小值', type: 's16', scale: 10, unit: '℃' },
  { class: '最大最小值', key: 'stackCellTemperatureMinClusterId', label: '堆单体温度最小值簇号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'stackCellTemperatureMinNodeId', label: '堆单体温度最小值节号', type: 'u16', scale: 1 },
  { class: '最大最小值', key: 'stackCellTemperatureDifferenceRange', label: '堆单体温度温差极差值', type: 'u16', scale: 10, unit: '℃' },

  { class: '状态信息', key: 'stackFaultStatus', label: '堆故障状态', type: 'u16', scale: 1, remarks: '0-无故障 1-轻微故障 2-一般故障 3-严重故障(对外接口使用)' },
  { class: '状态信息', key: 'bauWorkingMode', label: 'BAU工作模式', type: 'u16', scale: 1, remarks: '0xFF:各簇状态不一致 其他(0:静置 1:充电 2:放电 3:开路 4:接触器自检)' },
  { class: '状态信息', key: 'deviceSystemStatus', label: '设备系统状态', type: 'u16', scale: 1, remarks: '0:运行监测 1:绝缘检测状态 2:接触器自检状态 3:系统初始化 4:BCU升级状态 5:-- 6:BCU自适应地址状态 7:BMU自适应地址状态 8:BMU升级状态 0xFFFF:其他' },
  { class: '状态信息', key: 'chargeDischargeForbiddenStatus', label: '电池堆禁充禁放状态', type: 'u16', scale: 1, remarks: '0:可充可放 1:可充禁放 2:可放禁充 3:禁充禁放' },
  { class: '状态信息', key: 'chargeDischargeStatus', label: '电池堆的充放电状态', type: 'u16', scale: 1, remarks: '0:其他 1:充电 2:放电' },
  { class: '状态信息', key: 'batterySystemCycleCount', label: '电池系统循环次数', type: 'u16', scale: 1 },
  { class: '状态信息', key: 'systemHeartbeat', label: '系统心跳', type: 'u16', scale: 1 }
];

// 堆版本信息表 - 12个字段
export const BLOCK_VERSION = [
  { class: '版本信息', key: 'sdCardTotalCapacity', label: 'SD卡总容量', type: 'u16', scale: 1, unit: 'GB' },
  { class: '版本信息', key: 'sdCardRemainingCapacity', label: 'SD卡剩余容量', type: 'u16', scale: 1, unit: 'GB' },
  { class: '版本信息', key: 'sdCardStatus', label: 'SD卡状态', type: 'u16', scale: 1, remarks: '0: SD卡路径不存在; 1: 写成功; 2: 写失败;' },
  { class: '版本信息', key: 'bauProductCode', label: 'BAU产品编码', type: 'str20'},
  { class: '版本信息', key: 'bauHardwareVersion', label: 'BAU硬件版本号', type: 'str20' },
  { class: '版本信息', key: 'bauSoftwareVersion', label: 'BAU软件版本号', type: 'str20' },
  { class: '版本信息', key: 'bauBootVersion', label: 'BAU-BOOT版本号', type: 'str20' },
  { class: '版本信息', key: 'bauHostProtocolVersion', label: 'BAU-上位机协议版本号', type: 'str20' },
  { class: '版本信息', key: 'bauBcuProtocolVersion', label: 'BAU-BCU协议版本号', type: 'str20' },
  { class: '版本信息', key: 'bauEventRecordVersion', label: 'BAU事件记录版本号', type: 'str20' },
  { class: '版本信息', key: 'bauSoxAlgorithmVersion', label: 'BAU-SOX算法版本号', type: 'str20' },
  { class: '版本信息', key: 'reserved', label: '预留', type: 'str20' }
];

// 堆系统概要信息表 - 9个概要信息组
export const BLOCK_SYS_ABSTRACT = [
  // 单体电压概要信息
  { class: '单体电压概要', key: 'cellVoltageMax', label: '单体电压最大值', type: 's16', scale: 1, unit: 'mV', remarks: '默认无效值为0x7FFF' },
  { class: '单体电压概要', key: 'cellVoltageMaxClusterId', label: '单体电压最大值簇编号', type: 's16', scale: 1 },
  { class: '单体电压概要', key: 'cellVoltageMaxBatteryId', label: '单体电压最大值电池编号', type: 's16', scale: 1 },
  { class: '单体电压概要', key: 'cellVoltageMin', label: '单体电压最小值', type: 's16', scale: 1, unit: 'mV' },
  { class: '单体电压概要', key: 'cellVoltageMinClusterId', label: '单体电压最小值簇编号', type: 's16', scale: 1 },
  { class: '单体电压概要', key: 'cellVoltageMinBatteryId', label: '单体电压最小值电池编号', type: 's16', scale: 1 },
  { class: '单体电压概要', key: 'cellVoltageAverage', label: '单体电压平均值', type: 's16', scale: 1, unit: 'mV' },
  { class: '单体电压概要', key: 'cellVoltageRange', label: '单体电压极差值', type: 's16', scale: 1, unit: 'mV' },
  { key:'_skip1', type:'skip4' },

  // 单体温度概要信息
  { class: '单体温度概要', key: 'cellTemperatureMax', label: '单体温度最大值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: '单体温度概要', key: 'cellTemperatureMaxClusterId', label: '单体温度最大值簇编号', type: 's16', scale: 1 },
  { class: '单体温度概要', key: 'cellTemperatureMaxBatteryId', label: '单体温度最大值电池编号', type: 's16', scale: 1 },
  { class: '单体温度概要', key: 'cellTemperatureMin', label: '单体温度最小值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: '单体温度概要', key: 'cellTemperatureMinClusterId', label: '单体温度最小值簇编号', type: 's16', scale: 1 },
  { class: '单体温度概要', key: 'cellTemperatureMinBatteryId', label: '单体温度最小值电池编号', type: 's16', scale: 1 },
  { class: '单体温度概要', key: 'cellTemperatureAverage', label: '单体温度平均值', type: 's16', scale: 10, unit: '℃' },
  { class: '单体温度概要', key: 'cellTemperatureRange', label: '单体温度极差值', type: 's16', scale: 10, unit: '℃' },
  { key:'_skip2', type:'skip4' },

  // BMU电压概要信息
  { class: 'BMU电压概要', key: 'bmuVoltageMax', label: 'BMU电压最大值', type: 'u16', scale: 10, unit: 'V', remarks: '默认无效值为0x7FFF' },
  { class: 'BMU电压概要', key: 'bmuVoltageMaxClusterId', label: 'BMU电压最大值簇编号', type: 's16', scale: 1 },
  { class: 'BMU电压概要', key: 'bmuVoltageMaxBatteryId', label: 'BMU电压最大值电池编号', type: 's16', scale: 1 },
  { class: 'BMU电压概要', key: 'bmuVoltageMin', label: 'BMU电压最小值', type: 'u16', scale: 10, unit: 'V', remarks: '默认无效值为0x7FFF' },
  { class: 'BMU电压概要', key: 'bmuVoltageMinClusterId', label: 'BMU电压最小值簇编号', type: 's16', scale: 1 },
  { class: 'BMU电压概要', key: 'bmuVoltageMinBatteryId', label: 'BMU电压最小值电池编号', type: 's16', scale: 1 },
  { class: 'BMU电压概要', key: 'bmuVoltageAverage', label: 'BMU电压平均值', type: 'u16', scale: 10, unit: 'V' },
  { class: 'BMU电压概要', key: 'bmuVoltageRange', label: 'BMU电压极差值', type: 'u16', scale: 10, unit: 'V' },
  { key:'_skip3', type:'skip4' },
  // BMU电路板温度概要信息
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMax', label: 'BMU电路板温度最大值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMaxClusterId', label: 'BMU电路板温度最大值簇编号', type: 's16', scale: 1 },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMaxBatteryId', label: 'BMU电路板温度最大值电池编号', type: 's16', scale: 1 },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMin', label: 'BMU电路板温度最小值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMinClusterId', label: 'BMU电路板温度最小值簇编号', type: 's16', scale: 1 },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMinBatteryId', label: 'BMU电路板温度最小值电池编号', type: 's16', scale: 1 },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempAverage', label: 'BMU电路板温度平均值', type: 's16', scale: 10, unit: '℃' },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempRange', label: 'BMU电路板温度极差值', type: 's16', scale: 10, unit: '℃' },
  { key:'_skip4', type:'skip4' },
  // 单体SOC概要信息
  { class: '单体SOC概要', key: 'cellSOCMax', label: '单体SOC最大值', type: 'u16', scale: 10, unit: '%', remarks: '默认无效值为0x7FFF' },
  { class: '单体SOC概要', key: 'cellSOCMaxClusterId', label: '单体SOC最大值簇编号', type: 's16', scale: 1 },
  { class: '单体SOC概要', key: 'cellSOCMaxBatteryId', label: '单体SOC最大值电池编号', type: 's16', scale: 1 },
  { class: '单体SOC概要', key: 'cellSOCMin', label: '单体SOC最小值', type: 'u16', scale: 10, unit: '%', remarks: '默认无效值为0x7FFF' },
  { class: '单体SOC概要', key: 'cellSOCMinClusterId', label: '单体SOC最小值簇编号', type: 's16', scale: 1 },
  { class: '单体SOC概要', key: 'cellSOCMinBatteryId', label: '单体SOC最小值电池编号', type: 's16', scale: 1 },
  { class: '单体SOC概要', key: 'cellSOCAverage', label: '单体SOC平均值', type: 'u16', scale: 10, unit: '%' },
  { class: '单体SOC概要', key: 'cellSOCRange', label: '单体SOC极差值', type: 'u16', scale: 10, unit: '%' },
  { key:'_skip5', type:'skip4' },
  // 单体SOH概要信息
  { class: '单体SOH概要', key: 'cellSOHMax', label: '单体SOH最大值', type: 'u16', scale: 10, unit: '%', remarks: '默认无效值为0x7FFF' },
  { class: '单体SOH概要', key: 'cellSOHMaxClusterId', label: '单体SOH最大值簇编号', type: 's16', scale: 1 },
  { class: '单体SOH概要', key: 'cellSOHMaxBatteryId', label: '单体SOH最大值电池编号', type: 's16', scale: 1 },
  { class: '单体SOH概要', key: 'cellSOHMin', label: '单体SOH最小值', type: 'u16', scale: 10, unit: '%', remarks: '默认无效值为0x7FFF' },
  { class: '单体SOH概要', key: 'cellSOHMinClusterId', label: '单体SOH最小值簇编号', type: 's16', scale: 1 },
  { class: '单体SOH概要', key: 'cellSOHMinBatteryId', label: '单体SOH最小值电池编号', type: 's16', scale: 1 },
  { class: '单体SOH概要', key: 'cellSOHAverage', label: '单体SOH平均值', type: 'u16', scale: 10, unit: '%' },
  { class: '单体SOH概要', key: 'cellSOHRange', label: '单体SOH极差值', type: 'u16', scale: 10, unit: '%' },
  { key:'_skip6', type:'skip4' },
  // 极柱温度概要信息
  { class: '极柱温度概要', key: 'poleTempMax', label: '极柱温度最大值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: '极柱温度概要', key: 'poleTempMaxClusterId', label: '极柱温度最大值簇编号', type: 's16', scale: 1 },
  { class: '极柱温度概要', key: 'poleTempMaxBatteryId', label: '极柱温度最大值电池编号', type: 's16', scale: 1 },
  { class: '极柱温度概要', key: 'poleTempMin', label: '极柱温度最小值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: '极柱温度概要', key: 'poleTempMinClusterId', label: '极柱温度最小值簇编号', type: 's16', scale: 1 },
  { class: '极柱温度概要', key: 'poleTempMinBatteryId', label: '极柱温度最小值电池编号', type: 's16', scale: 1 },
  { class: '极柱温度概要', key: 'poleTempAverage', label: '极柱温度平均值', type: 's16', scale: 10, unit: '℃' },
  { class: '极柱温度概要', key: 'poleTempRange', label: '极柱温度极差值', type: 's16', scale: 10, unit: '℃' },
  { key:'_skip7', type:'skip4' },
  // 簇SOC概要信息
  { class: '簇SOC概要', key: 'clusterSOCMax', label: '簇SOC最大值', type: 'u16', scale: 10, unit: '%', remarks: '默认无效值为0x7FFF' },
  { class: '簇SOC概要', key: 'clusterSOCMaxClusterId', label: '簇SOC最大值簇编号', type: 's16', scale: 1 },
  { class: '簇SOC概要', key: 'clusterSOCMaxReserved', label: '簇SOC最大值预留', type: 's16', scale: 1 },
  { class: '簇SOC概要', key: 'clusterSOCMin', label: '簇SOC最小值', type: 'u16', scale: 10, unit: '%', remarks: '默认无效值为0x7FFF' },
  { class: '簇SOC概要', key: 'clusterSOCMinClusterId', label: '簇SOC最小值簇编号', type: 's16', scale: 1 },
  { class: '簇SOC概要', key: 'clusterSOCMinReserved', label: '簇SOC最小值预留', type: 's16', scale: 1 },
  { class: '簇SOC概要', key: 'clusterSOCAverage', label: '簇SOC平均值', type: 'u16', scale: 10, unit: '%' },
  { class: '簇SOC概要', key: 'clusterSOCRange', label: '簇SOC极差值', type: 'u16', scale: 10, unit: '%' },
  { key:'_skip8', type:'skip4' },
  // 簇电压概要信息
  { class: '簇电压概要', key: 'clusterVoltageMax', label: '簇电压最大值', type: 'u16', scale: 10, unit: 'V', remarks: '默认无效值为0x7FFF' },
  { class: '簇电压概要', key: 'clusterVoltageMaxClusterId', label: '簇电压最大值簇编号', type: 's16', scale: 1 },
  { class: '簇电压概要', key: 'clusterVoltageMaxReserved', label: '簇电压最大值预留', type: 's16', scale: 1 },
  { class: '簇电压概要', key: 'clusterVoltageMin', label: '簇电压最小值', type: 'u16', scale: 10, unit: 'V', remarks: '默认无效值为0x7FFF' },
  { class: '簇电压概要', key: 'clusterVoltageMinClusterId', label: '簇电压最小值簇编号', type: 's16', scale: 1 },
  { class: '簇电压概要', key: 'clusterVoltageMinReserved', label: '簇电压最小值预留', type: 's16', scale: 1 },
  { class: '簇电压概要', key: 'clusterVoltageAverage', label: '簇电压平均值', type: 'u16', scale: 10, unit: 'V' },
  { class: '簇电压概要', key: 'clusterVoltageRange', label: '簇电压极差值', type: 'u16', scale: 10, unit: 'V' },
  { key:'_skip9', type:'skip4' },
  // 簇电流概要信息
  { class: '簇电流概要', key: 'clusterCurrentMax', label: '簇电流最大值', type: 's16', scale: 10, unit: 'A', remarks: '默认无效值为大于0x7FFE' },
  { class: '簇电流概要', key: 'clusterCurrentMaxClusterId', label: '簇电流最大值簇编号', type: 's16', scale: 1 },
  { class: '簇电流概要', key: 'clusterCurrentMaxReserved', label: '簇电流最大值预留', type: 's16', scale: 1 },
  { class: '簇电流概要', key: 'clusterCurrentMin', label: '簇电流最小值', type: 's16', scale: 10, unit: 'A', remarks: '默认无效值为大于0x7FFE' },
  { class: '簇电流概要', key: 'clusterCurrentMinClusterId', label: '簇电流最小值簇编号', type: 's16', scale: 1 },
  { class: '簇电流概要', key: 'clusterCurrentMinReserved', label: '簇电流最小值预留', type: 's16', scale: 1 },
  { class: '簇电流概要', key: 'clusterCurrentAverage', label: '簇电流平均值', type: 's16', scale: 10, unit: 'A' },
  { class: '簇电流概要', key: 'clusterCurrentRange', label: '簇电流极差值', type: 's16', scale: 10, unit: 'A' },
  { key:'_skip10', type:'skip4' },
];

// 堆IO相关状态表 - 6个2字节寄存器，总共12字节
export const BLOCK_IO_STATUS = [
  // 第1个寄存器：系统DI输入状态 (2字节，16位) - 只解析前6位
  { class: '系统DI输入状态', key: 'systemDIStatus', label: '系统DI输入状态', type: 'u16', hide: false },
  
  // 系统DI输入状态 - 只解析前6位，Bit6-15不解析
  { class: '系统DI输入状态', key: 'di1Feedback', label: 'DI1反馈', type: 'bit', bitsOf: 'systemDIStatus', bit: 0, remarks: '消防报警,常开' },
  { class: '系统DI输入状态', key: 'di2Feedback', label: 'DI2反馈', type: 'bit', bitsOf: 'systemDIStatus', bit: 1, remarks: '消防故障,常开' },
  { class: '系统DI输入状态', key: 'di3Feedback', label: 'DI3反馈', type: 'bit', bitsOf: 'systemDIStatus', bit: 2, remarks: '急停信号,常闭' },
  { class: '系统DI输入状态', key: 'di4Feedback', label: 'DI4反馈', type: 'bit', bitsOf: 'systemDIStatus', bit: 3, remarks: '消防释放,常开' },
  { class: '系统DI输入状态', key: 'di5Feedback', label: 'DI5反馈', type: 'bit', bitsOf: 'systemDIStatus', bit: 4 },
  { class: '系统DI输入状态', key: 'di6Feedback', label: 'DI6反馈', type: 'bit', bitsOf: 'systemDIStatus', bit: 5 },
  
  // 第2个寄存器：系统DO输出状态 (2字节，16位)
  { class: '系统DO输出状态', key: 'systemDOStatus', label: '系统DO输出状态', type: 'u16', hide: false },
  
  // 系统DO输出状态
  { class: '系统DO输出状态', key: 'do1Status', label: 'DO1', type: 'bit', bitsOf: 'systemDOStatus', bit: 0, remarks: '隔离开关分闸' },
  { class: '系统DO输出状态', key: 'do2Status', label: 'DO2', type: 'bit', bitsOf: 'systemDOStatus', bit: 1, remarks: '隔离开关合闸' },
  
  // 第3个寄存器：I/O控制板-DI (2字节，16位)
  { class: 'I/O控制板-DI', key: 'ioControlBoardDI', label: 'I/O控制板-DI状态', type: 'u16', hide: false },
  
  // I/O控制板-DI详细解析
  { class: 'I/O控制板-DI', key: 'di00Status', label: 'DI0.0', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 0, remarks: 'SPD直流浪涌,常闭' },
  { class: 'I/O控制板-DI', key: 'di01Status', label: 'DI0.1', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 1, remarks: '柜门位置状态,常闭' },
  { class: 'I/O控制板-DI', key: 'di02Status', label: 'DI0.2', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 2, remarks: 'SPD交流浪涌,常闭' },
  { class: 'I/O控制板-DI', key: 'di03Status', label: 'DI0.3', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 3, remarks: '熔断器状态,常闭' },
  { class: 'I/O控制板-DI', key: 'di04Status', label: 'DI0.4', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 4, remarks: '1#隔离开关状态,常开' },
  { class: 'I/O控制板-DI', key: 'di05Status', label: 'DI0.5', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 5 },
  { class: 'I/O控制板-DI', key: 'di06Status', label: 'DI0.6', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 6 },
  { class: 'I/O控制板-DI', key: 'di07Status', label: 'DI0.7', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 7 },
  { class: 'I/O控制板-DI', key: 'di10Status', label: 'DI1.0', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 8 },
  { class: 'I/O控制板-DI', key: 'di11Status', label: 'DI1.1', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 9 },
  { class: 'I/O控制板-DI', key: 'di12Status', label: 'DI1.2', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 10 },
  { class: 'I/O控制板-DI', key: 'di13Status', label: 'DI1.3', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 11 },
  { class: 'I/O控制板-DI', key: 'di14Status', label: 'DI1.4', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 12 },
  { class: 'I/O控制板-DI', key: 'di15Status', label: 'DI1.5', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 13 },
  { class: 'I/O控制板-DI', key: 'di16Status', label: 'DI1.6', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 14 },
  { class: 'I/O控制板-DI', key: 'di17Status', label: 'DI1.7', type: 'bit', bitsOf: 'ioControlBoardDI', bit: 15 },
  
  // 第4个寄存器：I/O控制板-DO (2字节，16位)
  { class: 'I/O控制板-DO', key: 'ioControlBoardDO', label: 'I/O控制板-DO状态', type: 'u16', hide: false },
  
  // I/O控制板-DO详细解析
  { class: 'I/O控制板-DO', key: 'do00Status', label: 'DO0.0', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 0, remarks: '运行指示灯' },
  { class: 'I/O控制板-DO', key: 'do01Status', label: 'DO0.1', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 1, remarks: '故障指示灯' },
  { class: 'I/O控制板-DO', key: 'do02Status', label: 'DO0.2', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 2, remarks: '辅助电源分励' },
  { class: 'I/O控制板-DO', key: 'do03Status', label: 'DO0.3', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 3, remarks: 'BMS故障至PCS' },
  { class: 'I/O控制板-DO', key: 'do04Status', label: 'DO0.4', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 4 },
  { class: 'I/O控制板-DO', key: 'do05Status', label: 'DO0.5', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 5 },
  { class: 'I/O控制板-DO', key: 'do06Status', label: 'DO0.6', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 6 },
  { class: 'I/O控制板-DO', key: 'do07Status', label: 'DO0.7', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 7 },
  { class: 'I/O控制板-DO', key: 'do10Status', label: 'DO1.0', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 8 },
  { class: 'I/O控制板-DO', key: 'do11Status', label: 'DO1.1', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 9 },
  { class: 'I/O控制板-DO', key: 'do12Status', label: 'DO1.2', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 10 },
  { class: 'I/O控制板-DO', key: 'do13Status', label: 'DO1.3', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 11 },
  { class: 'I/O控制板-DO', key: 'do14Status', label: 'DO1.4', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 12 },
  { class: 'I/O控制板-DO', key: 'do15Status', label: 'DO1.5', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 13 },
  { class: 'I/O控制板-DO', key: 'do16Status', label: 'DO1.6', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 14 },
  { class: 'I/O控制板-DO', key: 'do17Status', label: 'DO1.7', type: 'bit', bitsOf: 'ioControlBoardDO', bit: 15 },
  
  // 第5个寄存器：预留字段 (2字节，16位)
  { class: '预留', key: 'reserved1', label: '预留字段1', type: 'u16', hide: false },
  
  // 第6个寄存器：预留字段 (2字节，16位)
  { class: '预留', key: 'reserved2', label: '预留字段2', type: 'u16', hide: false }
];

// 堆硬件故障定义
export const BLOCK_HARDWARE_FAULT = [
  // 寄存器1：硬件故障-接触器/隔离开关故障
  { class: '堆硬件故障', key: 'BlockHardwareFault1', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'StackIsolationSwitchTripFault', label: '堆隔离开关分闸失败故障', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 0 },
  { class: '堆硬件故障', key: 'StackIsolationSwitchCloseFault', label: '堆隔离开关合闸失败故障', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 1 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 2 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 3 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved3', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 4 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved4', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 5 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved5', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 6 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved6', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 7 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved7', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 8 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved8', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 9 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved9', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 10 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved10', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 11 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved11', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 12 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved12', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 13 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved13', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 14 },
  { class: '堆硬件故障', key: 'StackHardwareFault1Reserved14', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault1', bit: 15 },
  
  // 寄存器2：硬件故障-反馈信号故障1
  { class: '堆硬件故障', key: 'BlockHardwareFault2', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'FireAlarm', label: '消防报警', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 0 },
  { class: '堆硬件故障', key: 'FireFault', label: '消防故障', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 1 },
  { class: '堆硬件故障', key: 'EmergencyStopSignal', label: '急停信号', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 2 },
  { class: '堆硬件故障', key: 'FireRelease', label: '消防释放', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 3 },
  { class: '堆硬件故障', key: 'DCSurgeAlarm', label: '直流浪涌告警', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 4 },
  { class: '堆硬件故障', key: 'AccessControlFaultSignal', label: '门禁故障信号', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 5 },
  { class: '堆硬件故障', key: 'ACSurgeAlarm', label: '交流浪涌告警', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 6 },
  { class: '堆硬件故障', key: 'FuseFault', label: '熔断器故障', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 7 },
  { class: '堆硬件故障', key: 'StackHardwareFault2Reserved', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 8 },
  { class: '堆硬件故障', key: 'StackHardwareFault2Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 9 },
  { class: '堆硬件故障', key: 'StackHardwareFault2Reserved3', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 10 },
  { class: '堆硬件故障', key: 'StackHardwareFault2Reserved4', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 11 },
  { class: '堆硬件故障', key: 'StackHardwareFault2Reserved5', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 12 },
  { class: '堆硬件故障', key: 'StackHardwareFault2Reserved6', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 13 },
  { class: '堆硬件故障', key: 'StackHardwareFault2Reserved7', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 14 },
  { class: '堆硬件故障', key: 'StackHardwareFault2Reserved8', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault2', bit: 15 },
  
  // 寄存器3：硬件故障-反馈信号故障2（全部预留）
  { class: '堆硬件故障', key: 'BlockHardwareFault3', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 0 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 1 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved3', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 2 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved4', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 3 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved5', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 4 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved6', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 5 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved7', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 6 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved8', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 7 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved9', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 8 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved10', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 9 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved11', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 10 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved12', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 11 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved13', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 12 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved14', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 13 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved15', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 14 },
  { class: '堆硬件故障', key: 'StackHardwareFault3Reserved16', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault3', bit: 15 },
  
  // 寄存器4：硬件故障-通讯/采集失联故障
  { class: '堆硬件故障', key: 'BlockHardwareFault4', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'FerroelectricMemoryFault', label: '铁电存储器故障', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 0 },
  { class: '堆硬件故障', key: 'CoolingDeviceCommunicationFault', label: '制冷设备通讯故障', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 1 },
  { class: '堆硬件故障', key: 'PCSCommunicationFault', label: 'PCS通讯故障', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 2 },
  { class: '堆硬件故障', key: 'DehumidifyingAirConditionerCommunicationFault', label: '除湿空调通讯故障', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 3 },
  { class: '堆硬件故障', key: 'IOControlBoardCommunicationFault', label: 'I/O控制板通讯故障', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 4 },
  { class: '堆硬件故障', key: 'BCUCommunicationFault', label: 'BCU通讯故障', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 5 },
  { class: '堆硬件故障', key: 'EMSCommunicationFault', label: 'EMS通讯故障', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 6 },
  { class: '堆硬件故障', key: 'StackHardwareFault4Reserved', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 7 },
  { class: '堆硬件故障', key: 'StackHardwareFault4Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 8 },
  { class: '堆硬件故障', key: 'StackHardwareFault4Reserved3', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 9 },
  { class: '堆硬件故障', key: 'StackHardwareFault4Reserved4', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 10 },
  { class: '堆硬件故障', key: 'StackHardwareFault4Reserved5', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 11 },
  { class: '堆硬件故障', key: 'StackHardwareFault4Reserved6', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 12 },
  { class: '堆硬件故障', key: 'StackHardwareFault4Reserved7', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 13 },
  { class: '堆硬件故障', key: 'StackHardwareFault4Reserved8', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 14 },
  { class: '堆硬件故障', key: 'StackHardwareFault4Reserved9', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault4', bit: 15 },
  
  // 寄存器5：硬件故障-预留
  { class: '堆硬件故障', key: 'BlockHardwareFault5', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 0 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 1 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved3', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 2 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved4', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 3 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved5', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 4 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved6', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 5 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved7', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 6 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved8', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 7 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved9', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 8 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved10', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 9 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved11', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 10 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved12', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 11 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved13', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 12 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved14', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 13 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved15', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 14 },
  { class: '堆硬件故障', key: 'StackHardwareFault5Reserved16', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault5', bit: 15 },
  
  // 寄存器6：硬件故障-预留
  { class: '堆硬件故障', key: 'BlockHardwareFault6', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 0 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 1 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved3', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 2 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved4', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 3 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved5', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 4 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved6', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 5 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved7', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 6 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved8', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 7 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved9', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 8 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved10', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 9 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved11', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 10 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved12', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 11 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved13', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 12 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved14', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 13 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved15', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 14 },
  { class: '堆硬件故障', key: 'StackHardwareFault6Reserved16', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault6', bit: 15 },
  
  // 寄存器7：硬件故障-预留
  { class: '堆硬件故障', key: 'BlockHardwareFault7', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 0 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 1 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved3', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 2 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved4', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 3 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved5', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 4 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved6', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 5 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved7', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 6 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved8', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 7 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved9', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 8 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved10', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 9 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved11', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 10 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved12', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 11 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved13', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 12 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved14', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 13 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved15', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 14 },
  { class: '堆硬件故障', key: 'StackHardwareFault7Reserved16', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault7', bit: 15 },
  
  // 寄存器8：硬件故障-预留
  { class: '堆硬件故障', key: 'BlockHardwareFault8', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 0 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 1 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved3', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 2 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved4', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 3 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved5', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 4 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved6', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 5 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved7', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 6 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved8', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 7 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved9', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 8 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved10', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 9 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved11', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 10 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved12', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 11 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved13', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 12 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved14', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 13 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved15', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 14 },
  { class: '堆硬件故障', key: 'StackHardwareFault8Reserved16', label: '预留', type: 'bit', bitsOf: 'BlockHardwareFault8', bit: 15 },
];

// 堆总故障定义
export const BLOCK_TOTAL_FAULT = [
  // 总故障位
  { class: '堆总故障', key: 'BlockTotalFault', type: 'u16', scale: 1, hide: false },
  { class: '堆总故障', key: 'BlockConventionalSeriousFault', label: '常规严重故障位', type: 'bit', bitsOf: 'BlockTotalFault', bit: 0 },
  { class: '堆总故障', key: 'BlockHardwareTotalFault', label: '硬件故障总故障位', type: 'bit', bitsOf: 'BlockTotalFault', bit: 1 },
  { class: '堆总故障', key: 'BlockDeferredTotalFault', label: '保留故障总故障位', type: 'bit', bitsOf: 'BlockTotalFault', bit: 2 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 3 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved2', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 4 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved3', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 5 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved4', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 6 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved5', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 7 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved6', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 8 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved7', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 9 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved8', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 10 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved9', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 11 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved10', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 12 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved11', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 13 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved12', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 14 },
  { class: '堆总故障', key: 'BlockTotalFaultReserved13', label: '预留', type: 'bit', bitsOf: 'BlockTotalFault', bit: 15 },
  
  // 保留故障
  { class: '堆保留故障', key: 'BlockDeferredFault', type: 'u16', scale: 1, hide: false },
  { class: '堆保留故障', key: 'ContactorIsolationSwitchFault', label: '接触器/隔离开关故障', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 0 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 1 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved2', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 2 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved3', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 3 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved4', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 4 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved5', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 5 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved6', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 6 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved7', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 7 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved8', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 8 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved9', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 9 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved10', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 10 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved11', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 11 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved12', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 12 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved13', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 13 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved14', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 14 },
  { class: '堆保留故障', key: 'BlockDeferredFaultReserved15', label: '预留', type: 'bit', bitsOf: 'BlockDeferredFault', bit: 15 },
];

// 堆模拟量故障三级汇总点表定义 
export const BLOCK_ANALOG_FAULT_LEVEL = [  
  // 严重故障1 (2字节)
  { class: '堆模拟量严重故障', key: 'BlockAnalogSevereFault1', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量严重故障', key: 'CellVoltageDiffUpperLimitSevere', label: '单体压差上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 0 },
  { class: '堆模拟量严重故障', key: 'CellTempDiffUpperLimitSevere', label: '单体温差上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 1 },
  { class: '堆模拟量严重故障', key: 'CellSocDiffTooLargeSevere', label: '单体SOC差异过大告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 2 },
  { class: '堆模拟量严重故障', key: 'PackInterVoltageDiffTooLargeSevere', label: '电池包间压差过大告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 3 },
  { class: '堆模拟量严重故障', key: 'ClusterVoltageUpperLimitSevere', label: '簇电压上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 4 },
  { class: '堆模拟量严重故障', key: 'ClusterVoltageLowerLimitSevere', label: '簇电压下限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 5 },
  { class: '堆模拟量严重故障', key: 'ClusterInsulationResistanceRPlusLowerLimitSevere', label: '簇绝缘电阻R+下限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 6 },
  { class: '堆模拟量严重故障', key: 'ClusterInsulationResistanceRMinusLowerLimitSevere', label: '簇绝缘电阻R-下限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 7 },
  { class: '堆模拟量严重故障', key: 'ClusterChargeCurrentUpperLimitSevere', label: '簇充电电流上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 8 },
  { class: '堆模拟量严重故障', key: 'ClusterDischargeCurrentUpperLimitSevere', label: '簇放电电流上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 9 },
  { class: '堆模拟量严重故障', key: 'BcuRt1OvertempSevere', label: 'BCU RT1过温告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 10 },
  { class: '堆模拟量严重故障', key: 'BcuRt2OvertempSevere', label: 'BCU RT2过温告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 11 },
  { class: '堆模拟量严重故障', key: 'BcuRt3OvertempSevere', label: 'BCU RT3过温告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 12 },
  { class: '堆模拟量严重故障', key: 'BcuRt4OvertempSevere', label: 'BCU RT4过温告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 13 },
  { class: '堆模拟量严重故障', key: 'BcuRt5OvertempSevere', label: 'BCU RT5过温告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 14 },
  { class: '堆模拟量严重故障', key: 'BlockAnalogSevereFault1Reserved', label: '预留', type: 'bit', bitsOf: 'BlockAnalogSevereFault1', bit: 15 },
  
  // 严重故障2 (2字节)
  { class: '堆模拟量严重故障', key: 'BlockAnalogSevereFault2', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量严重故障', key: 'PackVoltageUpperLimitSevere', label: '电池包电压上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 0 },
  { class: '堆模拟量严重故障', key: 'PackVoltageLowerLimitSevere', label: '电池包电压下限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 1 },
  { class: '堆模拟量严重故障', key: 'PackTempUpperLimitSevere', label: '电池包温度上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 2 },
  { class: '堆模拟量严重故障', key: 'PackTempLowerLimitSevere', label: '电池包温度下限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 3 },
  { class: '堆模拟量严重故障', key: 'PackPowerConnectorPosTempUpperLimitSevere', label: '电池包动力接插件正极温度上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 4 },
  { class: '堆模拟量严重故障', key: 'PackPowerConnectorNegTempUpperLimitSevere', label: '电池包动力接插件负极温度上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 5 },
  { class: '堆模拟量严重故障', key: 'CellVoltageUpperLimitSevere', label: '单体电压上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 6 },
  { class: '堆模拟量严重故障', key: 'CellVoltageLowerLimitSevere', label: '单体电压下限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 7 },
  { class: '堆模拟量严重故障', key: 'ChargeCellTempUpperLimitSevere', label: '充电单体温度上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 8 },
  { class: '堆模拟量严重故障', key: 'ChargeCellTempLowerLimitSevere', label: '充电单体温度下限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 9 },
  { class: '堆模拟量严重故障', key: 'DischargeCellTempUpperLimitSevere', label: '放电单体温度上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 10 },
  { class: '堆模拟量严重故障', key: 'DischargeCellTempLowerLimitSevere', label: '放电单体温度下限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 11 },
  { class: '堆模拟量严重故障', key: 'CellSocUpperLimitSevere', label: '单体SOC上限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 12 },
  { class: '堆模拟量严重故障', key: 'CellSocLowerLimitSevere', label: '单体SOC下限告警', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 13 },
  { class: '堆模拟量严重故障', key: 'BlockAnalogSevereFault2Reserved', label: '预留', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 14 },
  { class: '堆模拟量严重故障', key: 'BlockAnalogSevereFault2Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockAnalogSevereFault2', bit: 15 },
  
  // 一般故障1 (2字节)
  { class: '堆模拟量一般故障', key: 'BlockAnalogGeneralFault1', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量一般故障', key: 'CellVoltageDiffUpperLimitGeneral', label: '单体压差上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 0 },
  { class: '堆模拟量一般故障', key: 'CellTempDiffUpperLimitGeneral', label: '单体温差上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 1 },
  { class: '堆模拟量一般故障', key: 'CellSocDiffTooLargeGeneral', label: '单体SOC差异过大告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 2 },
  { class: '堆模拟量一般故障', key: 'PackInterVoltageDiffTooLargeGeneral', label: '电池包间压差过大告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 3 },
  { class: '堆模拟量一般故障', key: 'ClusterVoltageUpperLimitGeneral', label: '簇电压上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 4 },
  { class: '堆模拟量一般故障', key: 'ClusterVoltageLowerLimitGeneral', label: '簇电压下限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 5 },
  { class: '堆模拟量一般故障', key: 'ClusterInsulationResistanceRPlusLowerLimitGeneral', label: '簇绝缘电阻R+下限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 6 },
  { class: '堆模拟量一般故障', key: 'ClusterInsulationResistanceRMinusLowerLimitGeneral', label: '簇绝缘电阻R-下限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 7 },
  { class: '堆模拟量一般故障', key: 'ClusterChargeCurrentUpperLimitGeneral', label: '簇充电电流上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 8 },
  { class: '堆模拟量一般故障', key: 'ClusterDischargeCurrentUpperLimitGeneral', label: '簇放电电流上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 9 },
  { class: '堆模拟量一般故障', key: 'BcuRt1OvertempGeneral', label: 'BCU RT1过温告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 10 },
  { class: '堆模拟量一般故障', key: 'BcuRt2OvertempGeneral', label: 'BCU RT2过温告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 11 },
  { class: '堆模拟量一般故障', key: 'BcuRt3OvertempGeneral', label: 'BCU RT3过温告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 12 },
  { class: '堆模拟量一般故障', key: 'BcuRt4OvertempGeneral', label: 'BCU RT4过温告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 13 },
  { class: '堆模拟量一般故障', key: 'BcuRt5OvertempGeneral', label: 'BCU RT5过温告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 14 },
  { class: '堆模拟量一般故障', key: 'BlockAnalogGeneralFault1Reserved', label: '预留', type: 'bit', bitsOf: 'BlockAnalogGeneralFault1', bit: 15 },
  
  // 一般故障2 (2字节)
  { class: '堆模拟量一般故障', key: 'BlockAnalogGeneralFault2', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量一般故障', key: 'PackVoltageUpperLimitGeneral', label: '电池包电压上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 0 },
  { class: '堆模拟量一般故障', key: 'PackVoltageLowerLimitGeneral', label: '电池包电压下限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 1 },
  { class: '堆模拟量一般故障', key: 'PackTempUpperLimitGeneral', label: '电池包温度上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 2 },
  { class: '堆模拟量一般故障', key: 'PackTempLowerLimitGeneral', label: '电池包温度下限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 3 },
  { class: '堆模拟量一般故障', key: 'PackPowerConnectorPosTempUpperLimitGeneral', label: '电池包动力接插件正极温度上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 4 },
  { class: '堆模拟量一般故障', key: 'PackPowerConnectorNegTempUpperLimitGeneral', label: '电池包动力接插件负极温度上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 5 },
  { class: '堆模拟量一般故障', key: 'CellVoltageUpperLimitGeneral', label: '单体电压上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 6 },
  { class: '堆模拟量一般故障', key: 'CellVoltageLowerLimitGeneral', label: '单体电压下限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 7 },
  { class: '堆模拟量一般故障', key: 'ChargeCellTempUpperLimitGeneral', label: '充电单体温度上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 8 },
  { class: '堆模拟量一般故障', key: 'ChargeCellTempLowerLimitGeneral', label: '充电单体温度下限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 9 },
  { class: '堆模拟量一般故障', key: 'DischargeCellTempUpperLimitGeneral', label: '放电单体温度上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 10 },
  { class: '堆模拟量一般故障', key: 'DischargeCellTempLowerLimitGeneral', label: '放电单体温度下限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 11 },
  { class: '堆模拟量一般故障', key: 'CellSocUpperLimitGeneral', label: '单体SOC上限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 12 },
  { class: '堆模拟量一般故障', key: 'CellSocLowerLimitGeneral', label: '单体SOC下限告警', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 13 },
  { class: '堆模拟量一般故障', key: 'BlockAnalogGeneralFault2Reserved', label: '预留', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 14 },
  { class: '堆模拟量一般故障', key: 'BlockAnalogGeneralFault2Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockAnalogGeneralFault2', bit: 15 },
  
  // 轻微故障1 (2字节)
  { class: '堆模拟量轻微故障', key: 'BlockAnalogMinorFault1', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量轻微故障', key: 'CellVoltageDiffUpperLimitMinor', label: '单体压差上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 0 },
  { class: '堆模拟量轻微故障', key: 'CellTempDiffUpperLimitMinor', label: '单体温差上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 1 },
  { class: '堆模拟量轻微故障', key: 'CellSocDiffTooLargeMinor', label: '单体SOC差异过大告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 2 },
  { class: '堆模拟量轻微故障', key: 'PackInterVoltageDiffTooLargeMinor', label: '电池包间压差过大告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 3 },
  { class: '堆模拟量轻微故障', key: 'ClusterVoltageUpperLimitMinor', label: '簇电压上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 4 },
  { class: '堆模拟量轻微故障', key: 'ClusterVoltageLowerLimitMinor', label: '簇电压下限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 5 },
  { class: '堆模拟量轻微故障', key: 'ClusterInsulationResistanceRPlusLowerLimitMinor', label: '簇绝缘电阻R+下限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 6 },
  { class: '堆模拟量轻微故障', key: 'ClusterInsulationResistanceRMinusLowerLimitMinor', label: '簇绝缘电阻R-下限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 7 },
  { class: '堆模拟量轻微故障', key: 'ClusterChargeCurrentUpperLimitMinor', label: '簇充电电流上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 8 },
  { class: '堆模拟量轻微故障', key: 'ClusterDischargeCurrentUpperLimitMinor', label: '簇放电电流上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 9 },
  { class: '堆模拟量轻微故障', key: 'BcuRt1OvertempMinor', label: 'BCU RT1过温告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 10 },
  { class: '堆模拟量轻微故障', key: 'BcuRt2OvertempMinor', label: 'BCU RT2过温告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 11 },
  { class: '堆模拟量轻微故障', key: 'BcuRt3OvertempMinor', label: 'BCU RT3过温告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 12 },
  { class: '堆模拟量轻微故障', key: 'BcuRt4OvertempMinor', label: 'BCU RT4过温告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 13 },
  { class: '堆模拟量轻微故障', key: 'BcuRt5OvertempMinor', label: 'BCU RT5过温告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 14 },
  { class: '堆模拟量轻微故障', key: 'BlockAnalogMinorFault1Reserved', label: '预留', type: 'bit', bitsOf: 'BlockAnalogMinorFault1', bit: 15 },
  
  // 轻微故障2 (2字节)
  { class: '堆模拟量轻微故障', key: 'BlockAnalogMinorFault2', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量轻微故障', key: 'PackVoltageUpperLimitMinor', label: '电池包电压上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 0 },
  { class: '堆模拟量轻微故障', key: 'PackVoltageLowerLimitMinor', label: '电池包电压下限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 1 },
  { class: '堆模拟量轻微故障', key: 'PackTempUpperLimitMinor', label: '电池包温度上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 2 },
  { class: '堆模拟量轻微故障', key: 'PackTempLowerLimitMinor', label: '电池包温度下限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 3 },
  { class: '堆模拟量轻微故障', key: 'PackPowerConnectorPosTempUpperLimitMinor', label: '电池包动力接插件正极温度上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 4 },
  { class: '堆模拟量轻微故障', key: 'PackPowerConnectorNegTempUpperLimitMinor', label: '电池包动力接插件负极温度上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 5 },
  { class: '堆模拟量轻微故障', key: 'CellVoltageUpperLimitMinor', label: '单体电压上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 6 },
  { class: '堆模拟量轻微故障', key: 'CellVoltageLowerLimitMinor', label: '单体电压下限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 7 },
  { class: '堆模拟量轻微故障', key: 'ChargeCellTempUpperLimitMinor', label: '充电单体温度上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 8 },
  { class: '堆模拟量轻微故障', key: 'ChargeCellTempLowerLimitMinor', label: '充电单体温度下限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 9 },
  { class: '堆模拟量轻微故障', key: 'DischargeCellTempUpperLimitMinor', label: '放电单体温度上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 10 },
  { class: '堆模拟量轻微故障', key: 'DischargeCellTempLowerLimitMinor', label: '放电单体温度下限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 11 },
  { class: '堆模拟量轻微故障', key: 'CellSocUpperLimitMinor', label: '单体SOC上限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 12 },
  { class: '堆模拟量轻微故障', key: 'CellSocLowerLimitMinor', label: '单体SOC下限告警', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 13 },
  { class: '堆模拟量轻微故障', key: 'BlockAnalogMinorFault2Reserved', label: '预留', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 14 },
  { class: '堆模拟量轻微故障', key: 'BlockAnalogMinorFault2Reserved2', label: '预留', type: 'bit', bitsOf: 'BlockAnalogMinorFault2', bit: 15 },
];

// 堆模拟量故障等级点表定义
export const BLOCK_ANALOG_FAULT_GRADE = [
  // 故障等级1 (2字节) - 8个故障类型，每个2位
  { class: '堆模拟量故障等级1', key: 'BlockAnalogFaultGrade1', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量故障等级1', key: 'CellVoltageDiffFaultGrade', label: '单体电压压差故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade1', bit: 0, len: 2 },
  { class: '堆模拟量故障等级1', key: 'CellTempDiffFaultGrade', label: '单体温度温差故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade1', bit: 2, len: 2 },
  { class: '堆模拟量故障等级1', key: 'CellSocDiffFaultGrade', label: '单体soc差故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade1', bit: 4, len: 2 },
  { class: '堆模拟量故障等级1', key: 'PackVoltageDiffFaultGrade', label: '包端电压压差故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade1', bit: 6, len: 2 },
  { class: '堆模拟量故障等级1', key: 'ClusterVoltageOverFaultGrade', label: '簇端电压过压故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade1', bit: 8, len: 2 },
  { class: '堆模拟量故障等级1', key: 'ClusterVoltageUnderFaultGrade', label: '簇端电压欠压故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade1', bit: 10, len: 2 },
  { class: '堆模拟量故障等级1', key: 'InsulationResistancePosFaultGrade', label: '绝缘电阻正对地报警等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade1', bit: 12, len: 2 },
  { class: '堆模拟量故障等级1', key: 'InsulationResistanceNegFaultGrade', label: '绝缘电阻负对地报警等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade1', bit: 14, len: 2 },

  // 故障等级2 (2字节) - 8个故障类型，每个2位
  { class: '堆模拟量故障等级2', key: 'BlockAnalogFaultGrade2', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量故障等级2', key: 'ChargeOvercurrentFaultGrade', label: '充电过流故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade2', bit: 0, len: 2 },
  { class: '堆模拟量故障等级2', key: 'DischargeOvercurrentFaultGrade', label: '放电过流故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade2', bit: 2, len: 2 },
  { class: '堆模拟量故障等级2', key: 'BcuRt1OvertempFaultGrade', label: 'BCU RT1过温告警等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade2', bit: 4, len: 2 },
  { class: '堆模拟量故障等级2', key: 'BcuRt2OvertempFaultGrade', label: 'BCU RT2过温告警等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade2', bit: 6, len: 2 },
  { class: '堆模拟量故障等级2', key: 'BcuRt3OvertempFaultGrade', label: 'BCU RT3过温告警等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade2', bit: 8, len: 2 },
  { class: '堆模拟量故障等级2', key: 'BcuRt4OvertempFaultGrade', label: 'BCU RT4过温告警等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade2', bit: 10, len: 2 },
  { class: '堆模拟量故障等级2', key: 'BcuRt5OvertempFaultGrade', label: 'BCU RT5过温告警等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade2', bit: 12, len: 2 },
  { class: '堆模拟量故障等级2', key: 'BlockAnalogFaultGrade2Reserved', label: '预留', type: 'bits', bitsOf: 'BlockAnalogFaultGrade2', bit: 14, len: 2 },

  // 故障等级3 (2字节) - 8个故障类型，每个2位
  { class: '堆模拟量故障等级3', key: 'BlockAnalogFaultGrade3', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量故障等级3', key: 'PackOvervoltageFaultGrade', label: '包过压故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade3', bit: 0, len: 2 },
  { class: '堆模拟量故障等级3', key: 'PackUndervoltageFaultGrade', label: '包欠压故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade3', bit: 2, len: 2 },
  { class: '堆模拟量故障等级3', key: 'PackOvertempFaultGrade', label: '包过温故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade3', bit: 4, len: 2 },
  { class: '堆模拟量故障等级3', key: 'PackUndertempFaultGrade', label: '包欠温故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade3', bit: 6, len: 2 },
  { class: '堆模拟量故障等级3', key: 'PackPowerConnectorPosOvertempFaultGrade', label: '动力接插件正极过温故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade3', bit: 8, len: 2 },
  { class: '堆模拟量故障等级3', key: 'PackPowerConnectorNegOvertempFaultGrade', label: '动力接插件负极过温故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade3', bit: 10, len: 2 },
  { class: '堆模拟量故障等级3', key: 'CellOvervoltageFaultGrade', label: '单体电池过压故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade3', bit: 12, len: 2 },
  { class: '堆模拟量故障等级3', key: 'CellUndervoltageFaultGrade', label: '单体电池欠压故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade3', bit: 14, len: 2 },

  // 故障等级4 (2字节) - 8个故障类型，每个2位
  { class: '堆模拟量故障等级4', key: 'BlockAnalogFaultGrade4', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量故障等级4', key: 'CellChargeOvertempFaultGrade', label: '单体电池充电过温故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 0, len: 2 },
  { class: '堆模拟量故障等级4', key: 'CellChargeUndertempFaultGrade', label: '单体电池充电欠温故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 2, len: 2 },
  { class: '堆模拟量故障等级4', key: 'CellDischargeOvertempFaultGrade', label: '单体电池放电过温故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 4, len: 2 },
  { class: '堆模拟量故障等级4', key: 'CellDischargeUndertempFaultGrade', label: '单体电池放电欠温故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 6, len: 2 },
  { class: '堆模拟量故障等级4', key: 'CellSocTooHighFaultGrade', label: '单体soc过高故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 8, len: 2 },
  { class: '堆模拟量故障等级4', key: 'CellSocTooLowFaultGrade', label: '单体soc过低故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 10, len: 2 },
  { class: '堆模拟量故障等级4', key: 'BlockAnalogFaultGrade4Reserved', label: '预留', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 12, len: 4 },

  // 故障等级5 (2字节) - 2个故障类型，每个2位，其余预留
  { class: '堆模拟量故障等级5', key: 'BlockAnalogFaultGrade5', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量故障等级5', key: 'ClusterInterVoltageDiffFaultGrade', label: '簇间压差过大故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade5', bit: 0, len: 2 },
  { class: '堆模拟量故障等级5', key: 'ClusterInterCurrentDiffFaultGrade', label: '簇间电流差异过大故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade5', bit: 2, len: 2 },
  { class: '堆模拟量故障等级5', key: 'BlockAnalogFaultGrade5Reserved', label: '预留', type: 'bits', bitsOf: 'BlockAnalogFaultGrade5', bit: 4, len: 12 },
];

  // 堆系统基本配置参数
  // - 用于堆级遥调读/写：block_common_param_r / block_common_param_w
  export const BLOCK_COMMON_PARAM_R = [
    // ① 模式/控制开关
    { class: '系统基本配置', key: 'RemoteLocalMode',               label: '远方就地模式',               type: 'u16', scale: 1 },
    { class: '系统基本配置', key: 'SplitClusterFlag',             label: '分簇控制标志位',             type: 'u16', scale: 1 },
    { class: '系统基本配置', key: 'EMSCommFaultDisconnectEnable', label: 'EMS通讯故障断接触器使能',     type: 'u16', scale: 1 },
    { class: '系统基本配置', key: 'MaintainMode',                 label: '运维模式',                   type: 'u16', scale: 1 },
    { class: '系统基本配置', key: 'InternalTestMode',             label: '内测模式',                   type: 'u16', scale: 1 },
    // 这里的 10×u16 预留在载荷中确实占位，因此必须用 skip20 表达真实占位，避免前端解析错位
    { class: '系统基本配置', key: 'Reserved1',  label: '预留1', type: 'skip20'  },


    // ② 结构配置
    { class: '系统基本配置', key: 'BlockCount',                   label: '当前堆数',                   type: 'u16', scale: 1, unit: '个' },
    { class: '系统基本配置', key: 'ClusterCount1',                label: '第一堆下簇数',               type: 'u16', scale: 1, unit: '个' },
    { class: '系统基本配置', key: 'ClusterCount2',                label: '第二堆下簇数',               type: 'u16', scale: 1, unit: '个' },
    // 同理，后续 10×u16 预留也用 skip2 表达占位
    { class: '系统基本配置', key: 'Reserved2', label: '预留2', type: 'skip20' },

  ];


    //堆侧：系统时间配置（block_time_cfg）
  // 数据长度：6 × u16 = 12 字节
  export const BLOCK_TIME_CFG_R = [
    { class: '系统时间配置', key: 'Year',   label: '年', type: 'u16', scale: 1 },
    { class: '系统时间配置', key: 'Month',  label: '月', type: 'u16', scale: 1 },
    { class: '系统时间配置', key: 'Day',    label: '日', type: 'u16', scale: 1 },
    { class: '系统时间配置', key: 'Hour',   label: '时', type: 'u16', scale: 1 },
    { class: '系统时间配置', key: 'Minute', label: '分', type: 'u16', scale: 1 },
    { class: '系统时间配置', key: 'Second', label: '秒', type: 'u16', scale: 1 }
  ];

  // 堆系统端口配置参数（block_port_cfg） 
  export const BLOCK_PORT_CFG_R = [
    // —— CAN1/2/3 速率（仲裁/数据）——
    { class: '系统端口配置参数', key: 'CAN1ArbitrationBaud', label: 'CAN1通讯速率/仲裁域速率', type: 'u16' },
    { class: '系统端口配置参数', key: 'CAN1DataBaud',        label: 'CAN1数据域波特率',         type: 'u16' },
    { class: '系统端口配置参数', key: 'CAN2ArbitrationBaud', label: 'CAN2通讯速率/仲裁域速率', type: 'u16' },
    { class: '系统端口配置参数', key: 'CAN2DataBaud',        label: 'CAN2数据域波特率',         type: 'u16' },
    { class: '系统端口配置参数', key: 'CAN3ArbitrationBaud', label: 'CAN3通讯速率/仲裁域速率', type: 'u16' },
    { class: '系统端口配置参数', key: 'CAN3DataBaud',        label: 'CAN3数据域波特率',         type: 'u16' },

    // —— RS485(1~6) 速率 ——
    { class: '系统端口配置参数', key: 'RS485_1_Baud', label: 'RS485-1通讯速率', type: 'u16' },
    { class: '系统端口配置参数', key: 'RS485_2_Baud', label: 'RS485-2通讯速率', type: 'u16' },
    { class: '系统端口配置参数', key: 'RS485_3_Baud', label: 'RS485-3通讯速率', type: 'u16' },
    { class: '系统端口配置参数', key: 'RS485_4_Baud', label: 'RS485-4通讯速率', type: 'u16' },
    { class: '系统端口配置参数', key: 'RS485_5_Baud', label: 'RS485-5通讯速率', type: 'u16' },
    { class: '系统端口配置参数', key: 'RS485_6_Baud', label: 'RS485-6通讯速率', type: 'u16' },

    // —— 预留1（占 4 寄存器）——
    { key: '_rsv1', type: 'skip8' },

    // —— 网卡1 ——
    { class: '系统端口配置参数', key: 'Eth1_IP',      label: '网卡1 IP地址',   type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth1_Netmask', label: '网卡1 子网掩码', type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth1_Gateway', label: '网卡1 默认网关', type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth1_DNS1',    label: '网卡1 首选DNS',  type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth1_DNS2',    label: '网卡1 备用DNS',  type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth1_Port',    label: '网卡1 端口',     type: 'u16' },

    // —— 网卡2（紧随网卡1端口之后）——
    { class: '系统端口配置参数', key: 'Eth2_IP',      label: '网卡2 IP地址',   type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth2_Netmask', label: '网卡2 子网掩码', type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth2_Gateway', label: '网卡2 默认网关', type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth2_DNS1',    label: '网卡2 首选DNS',  type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth2_DNS2',    label: '网卡2 备用DNS',  type: 'ipv4' },
    { class: '系统端口配置参数', key: 'Eth2_Port',    label: '网卡2 端口',     type: 'u16' },

    // —— MAC 地址（各 3×u16）——
    { class: '系统端口配置参数', key: 'Eth1_MAC_H',   label: '网卡1 MAC地址1', type: 'u16' },
    { class: '系统端口配置参数', key: 'Eth1_MAC_M',   label: '网卡1 MAC地址2', type: 'u16' },
    { class: '系统端口配置参数', key: 'Eth1_MAC_L',   label: '网卡1 MAC地址3', type: 'u16' },
    { class: '系统端口配置参数', key: 'Eth2_MAC_H',   label: '网卡2 MAC地址1', type: 'u16' },
    { class: '系统端口配置参数', key: 'Eth2_MAC_M',   label: '网卡2 MAC地址2', type: 'u16' },
    { class: '系统端口配置参数', key: 'Eth2_MAC_L',   label: '网卡2 MAC地址3', type: 'u16' },

    // —— MQTT ——
    { class: '系统端口配置参数', key: 'MQTT_ServerIP',   label: 'MQTT服务器IP',   type: 'ipv4' },
    { class: '系统端口配置参数', key: 'MQTT_ServerPort', label: 'MQTT服务器端口', type: 'u16' },

    // —— 预留2（占 3 寄存器）——
    { key: '_rsv2', type: 'skip6' },

    // —— 网卡速度 ——
    { class: '系统端口配置参数', key: 'Eth1_Speed',   label: '网卡1速度', type: 'u16' },
    { class: '系统端口配置参数', key: 'Eth2_Speed',   label: '网卡2速度', type: 'u16' },

    // —— 预留3（占 8 寄存器）——
    { key: '_rsv3', type: 'skip16' },


  ];


    // 堆端报警阈值参数（block_fault_dns）
  export const BLOCK_DNS_PARAM_R = [
    /* 堆端电压差值 -------------------------------------------------------- */
    { class: '堆端电压差值', key: 'blockVoltDiffMinorVal',            label: '簇电压差值-轻微报警值',            type: 's16', scale: 10, unit: 'V' },
    { class: '堆端电压差值', key: 'blockVoltDiffMinorFilterMs',     label: '簇电压差值-轻微报警滤波时间',      type: 'u16',                  unit: 'ms' },
    { class: '堆端电压差值', key: 'blockVoltDiffMinorRecovVal',     label: '簇电压差值- 轻微报警恢复值',        type: 's16', scale: 10, unit: 'V' },
    { class: '堆端电压差值', key: 'blockVoltDiffMinorRecovFilterMs',label: '簇电压差值-轻微报警恢复滤波时间',  type: 'u16',                  unit: 'ms' },

    { class: '堆端电压差值', key: 'blockVoltDiffGeneralVal',            label: '簇电压差值-一般报警值',            type: 's16', scale: 10, unit: 'V' },
    { class: '堆端电压差值', key: 'blockVoltDiffGeneralFilterMs',     label: '簇电压差值-一般报警滤波时间',      type: 'u16',                  unit: 'ms' },
    { class: '堆端电压差值', key: 'blockVoltDiffGeneralRecovVal',     label: '簇电压差值-一般报警恢复值',        type: 's16', scale: 10, unit: 'V' },
    { class: '堆端电压差值', key: 'blockVoltDiffGeneralRecovFilterMs',label: '簇电压差值-一般报警恢复滤波时间',  type: 'u16',                  unit: 'ms' },

    { class: '堆端电压差值', key: 'blockVoltDiffSevereVal',            label: '簇电压差值-严重报警值',            type: 's16', scale: 10, unit: 'V' },
    { class: '堆端电压差值', key: 'blockVoltDiffSevereFilterMs',     label: '簇电压差值-严重报警滤波时间',      type: 'u16',                  unit: 'ms' },
    { class: '堆端电压差值', key: 'blockVoltDiffSevereRecovVal',     label: '簇电压差值-严重报警恢复值',        type: 's16', scale: 10, unit: 'V' },
    { class: '堆端电压差值', key: 'blockVoltDiffSevereRecovFilterMs',label: '簇电压差值-严重报警恢复滤波时间',  type: 'u16',                  unit: 'ms' },


    /* 堆端电流差值 -------------------------------------------------------- */
    { class: '堆端电流差值', key: 'blockCurrDiffMinorVal',            label: '簇电流差值-轻微报警值',            type: 's16', scale: 10, unit: 'A' },
    { class: '堆端电流差值', key: 'blockCurrDiffMinorFilterMs',     label: '簇电流差值-轻微报警滤波时间',      type: 'u16',                  unit: 'ms' },
    { class: '堆端电流差值', key: 'blockCurrDiffMinorRecovVal',     label: '簇电流差值-轻微报警恢复值',        type: 's16', scale: 10, unit: 'A' },
    { class: '堆端电流差值', key: 'blockCurrDiffMinorRecovFilterMs',label: '簇电流差值-轻微报警恢复滤波时间',  type: 'u16',                  unit: 'ms' },

    { class: '堆端电流差值', key: 'blockCurrDiffGeneralVal',            label: '簇电流差值-一般报警值',            type: 's16', scale: 10, unit: 'A' },
    { class: '堆端电流差值', key: 'blockCurrDiffGeneralFilterMs',     label: '簇电流差值-一般报警滤波时间',      type: 'u16',                  unit: 'ms' },
    { class: '堆端电流差值', key: 'blockCurrDiffGeneralRecovVal',     label: '簇电流差值-一般报警恢复值',        type: 's16', scale: 10, unit: 'A' },
    { class: '堆端电流差值', key: 'blockCurrDiffGeneralRecovFilterMs',label: '簇电流差值-一般报警恢复滤波时间',  type: 'u16',                  unit: 'ms' },

    { class: '堆端电流差值', key: 'blockCurrDiffSevereVal',            label: '簇电流差值-严重报警值',            type: 's16', scale: 10, unit: 'A' },
    { class: '堆端电流差值', key: 'blockCurrDiffSevereFilterMs',     label: '簇电流差值-严重报警滤波时间',      type: 'u16',                  unit: 'ms' },
    { class: '堆端电流差值', key: 'blockCurrDiffSevereRecovVal',     label: '簇电流差值-严重报警恢复值',        type: 's16', scale: 10, unit: 'A' },
    { class: '堆端电流差值', key: 'blockCurrDiffSevereRecovFilterMs',label: '簇电流差值-严重报警恢复滤波时间',  type: 'u16',                  unit: 'ms' },
    // —— 末尾预留（占 24 寄存器 = 48 字节）——
    { class: '保留', key: '_skip', type: 'skip48' }
  ];



//系统堆电池配置参数(82个参数)
//topic: block_batt_param_r/w
export const BLOCK_BATT_PARAM_R = [
  /* 系统簇端电池配置参数 ---------------------------------- */
  { class: '系统簇端电池配置参数', key: 'BmuTotalNum',      label: 'BMU总数量',     type: 'u16', scale: 1 },
  { class: '系统簇端电池配置参数', key: 'AfeNumUnderBmu',     label: 'BMU下AFE数', type: 'u16', scale: 1 },

  /* AFE下电池数量 (16个AFE)  -------------------------------- */
  ...Array.from({ length: 16 }, (_, i) => ({
    class: '系统簇端电池配置参数',
    key: `Afe${i+1}CellCount`,
    label: `AFE${i+1}下电池数量`,
    type: 'u16',
    scale: 1,
    remarks: `每个AFE下电池数量可配置不同；BMU下总电池数不超过128；`
  })),

  /* AFE下温度数量 (16个AFE) -------------------------------- */
  ...Array.from({ length: 16 }, (_, i) => ({
    class: '系统簇端电池配置参数',
    key: `Afe${i+1}TempCount`,
    label: `AFE${i+1}下温度数量`,
    type: 'u16',
    scale: 1,
    remarks: `每个AFE下温度数量可配置不同；BMU下总温度数不超过128；`
  })),

  /* 虚拟电池偏移位置 (32个位置)---------------------------- */
  ...Array.from({ length: 32 }, (_, i) => ({
    class: '系统簇端电池配置参数',
    key: `VirtualCellOffset${i+1}`,
    label: `虚拟电池偏移位置${i+1}`,
    type: 'u16',
    scale: 1,
  })),

  // —— 末尾预留（占 16 寄存器 = 32 字节）——
  { class: '保留', key: '_skip', type: 'skip32' }
];


//系统通讯设备配置参数表 (18个参数)
//topic: block_comm_dev_cfg_r/w
export const BLOCK_COMM_DEV_CFG_R = [
  /* 系统通讯设备配置参数 ---------------------------------------- */
  { class: '系统通讯设备配置参数', key: 'PcsType', label: 'PCS类型', type: 'u16', scale: 1, remarks: '0：无PCS\n1：双一力PCS' },
  { class: '系统通讯设备配置参数', key: 'PcsCount', label: 'PCS数量', type: 'u16', scale: 1 },
  { class: '系统通讯设备配置参数', key: 'CoolingDeviceType', label: '制冷设备类型', type: 'u16', scale: 1, remarks: '0：无制冷设备\n1：三河同飞' },
  { class: '系统通讯设备配置参数', key: 'CoolingDeviceCount', label: '制冷设备数量', type: 'u16', scale: 1 },
  { class: '系统通讯设备配置参数', key: 'DehumidifierType', label: '除湿空调类型', type: 'u16', scale: 1, remarks: '0：无除湿空调\n1：三河同飞' },
  { class: '系统通讯设备配置参数', key: 'DehumidifierCount', label: '除湿空调数量', type: 'u16', scale: 1 },
  { class: '系统通讯设备配置参数', key: 'IoControllerType', label: 'I/O控制板类型', type: 'u16', scale: 1, remarks: '0：无I/O控制板\n1：英美讯' },
  { class: '系统通讯设备配置参数', key: 'IoControllerCount', label: 'I/O控制板数量', type: 'u16', scale: 1 },
  { class: '系统通讯设备配置参数', key: 'IoControllerBoardIP', label: 'I/O控制板IP基地址', type: 'ipv4', scale: 1 },
  // { class: '系统通讯设备配置参数', key: 'Reserved1_1', label: '预留', type: 'u16', scale: 1 },
  { class: '保留', key: '_skip', type: 'skip16' }
];


//系统操作配置参数表 (20个参数)
//topic: block_operate_cfg_r/w
export const BLOCK_OPERATE_CFG_R = [
  /* 系统操作配置参数 ------------------------------------------------ */
  { class: '系统操作配置参数', key: 'MinParallelClusterCount', label: '最小并簇数', type: 'u16', scale: 1, remarks: '最小并簇数 使能簇数 >= 最小并簇数 最小并簇数需大于0 （就地+全部簇开路下才可设置）' },
  { class: '系统操作配置参数', key: 'EnableClusterConfig1', label: '使能簇配置1', type: 'u16', scale: 1, clusterRange: [1, 10], remarks: 'Bit0~9配置第1~10簇(0x3FF为第1~10簇全部使能)（就地+全部簇开路下才可设置）' },
  { class: '系统操作配置参数', key: 'EnableClusterConfig2', label: '使能簇配置2', type: 'u16', scale: 1, clusterRange: [11, 20], remarks: 'Bit0~9配置第11~20簇(0x3FF为第11~20簇全部使能)（就地+全部簇开路下才可设置）' },
  { class: '系统操作配置参数', key: 'IsStackVoltageZeroWhenAllOpen', label: '全部开路时堆电压是否为0', type: 'u16', scale: 1, remarks: '0：不开启\n1：开启' },
  { class: '系统操作配置参数', key: 'DoesStackSOCFollowAvgSOCWhenIdle', label: '静置时堆SOC是否追随平均SOC', type: 'u16', scale: 1, remarks: '0：不开启\n1：开启' },
  { class: '系统操作配置参数', key: 'AvgSOCFollowThreshold', label: '平均SOC追随阈值', type: 'u16', scale: 1 },
  { class: '系统操作配置参数', key: 'StackSOCChangeDiff', label: '堆SOC变化差值', type: 'u16', scale: 1 },
  { class: '系统操作配置参数', key: 'BCPControlExists', label: '是否存在BCP控制', type: 'u16', scale: 1, remarks: '0：不存在\n1：存在' },
  { class: '保留', key: '_skip', type: 'skip24' }
];

  
