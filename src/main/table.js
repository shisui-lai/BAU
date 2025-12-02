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
    {class:'温度信息', key:'Temp1',         label:'温度1(℃)',     type:'s16', scale:10  },
    {class:'温度信息', key:'Temp2',         label:'温度2(℃)',     type:'s16', scale:10  },
    {class:'温度信息', key:'Temp3',         label:'温度3(℃)',     type:'s16', scale:10  },
    {class:'温度信息', key:'Temp4',         label:'温度4(℃)',     type:'s16', scale:10  },
    {class:'温度信息', key:'Temp5',         label:'温度5(℃)',     type:'s16', scale:10  },

    /* 22-25：预留 4 字 → skip8 -------------------------------------------- */

    {class:'系统信息', key:'SysTotalStatus_Word1', label:'系统总状态位1', type:'u16', scale:1 },
    {class:'系统信息', key:'SysTotalStatus_Word2', label:'系统总状态位2', type:'u16', scale:1 },
    {class:'系统信息', key:'SysTotal_Idle',            label:'静止',             type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:0 },
    {class:'系统信息', key:'SysTotal_Charge',          label:'充电',             type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:1 },
    {class:'系统信息', key:'SysTotal_Disch',           label:'放电',             type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:2 },
    {class:'系统信息', key:'SysTotal_ForbidCharge',    label:'禁充',             type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:3 },
    {class:'系统信息', key:'SysTotal_ForbidDisch',     label:'禁放',             type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:4 },
    {class:'系统信息', key:'SysTotal_Standby',         label:'待机',             type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:5 },
    {class:'系统信息', key:'SysTotal_Alarm',           label:'告警',             type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:6 },
    {class:'系统信息', key:'SysTotal_Fault',           label:'故障',             type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:7 },
    {class:'系统信息', key:'SysTotal_ChgPowerLatch',   label:'充电功率锁存',     type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:8 },
    {class:'系统信息', key:'SysTotal_DischPowerLatch', label:'放电功率锁存',     type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:9 },
    {class:'系统信息', key:'SysTotal_ChgCmd',          label:'充电指令',         type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:10 },
    {class:'系统信息', key:'SysTotal_ChgCmdDone',      label:'充电指令完成',     type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:11 },
    {class:'系统信息', key:'SysTotal_DischCmd',        label:'放电指令',         type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:12 },
    {class:'系统信息', key:'SysTotal_DischCmdDone',    label:'放电指令完成',     type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:13 },
    {class:'系统信息', key:'SysTotal_BusOffCmd',       label:'脱离母线指令',     type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:14 },
    {class:'系统信息', key:'SysTotal_BusOffCmdDone',   label:'脱离母线指令完成', type:'bit',  bitsOf:'SysTotalStatus_Word1', bit:15 },
    {class:'系统信息', key:'SysTotal_MaintMode',       label:'运维模式',         type:'bits', bitsOf:'SysTotalStatus_Word2', bit:0, len:1, map:{0:'非运维模式',1:'运维模式'} },
    {class:'系统信息', key:'SysTotal_TestMode',        label:'正常模式/测试模式', type:'bits', bitsOf:'SysTotalStatus_Word2', bit:1, len:1, map:{0:'正常模式',1:'测试模式'} },
    {class:'系统信息', key:'SysTotal_Init',            label:'初始化',           type:'bits', bitsOf:'SysTotalStatus_Word2', bit:2, len:1, map:{0:'初始化完成',1:'初始化中'} },

    /* 17-18 预留 */
    { key:'skip1', type:'skip4' },

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


      /* 412A / 412B 新增字段 */
    {class:'电池信息', key:'ClusterRealSOC',  label:'真实SOC(%)',   type:'u16', scale:10 },
    {class:'电池信息', key:'OCVExecCount',    label:'OCV执行次数', type:'u16', scale:1 },
    { key:'_skip2', type:'skip4' },

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

    {class:'系统信息', key:'DefaultParamRemainTimes', label:'默认参数剩余次数', type:'u16'},
    /* 80-95：预留 16 字 → skip16 ---------------------------------------- */
    { key:'_skip4', type:'skip6' }
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

//协议修改删除
// export const TOTAL_FAULT = [
//   /* === ① 总故障位 (Word-1) ======================================= */
//   { class: '总故障', key: 'TotalFault', type: 'u16', scale: 1, hide: false },
//   { class: '总故障', key: 'Conventional_Serious_Fault', label: '常规严重故障位', type: 'bit',  bitsOf: 'TotalFault', bit: 0 },
//   { class: '总故障', key: 'Hardware_Total_Fault',       label: '硬件故障总故障位', type: 'bit',  bitsOf: 'TotalFault', bit: 1 },
//   { class: '总故障', key: 'Deferred_Total_Fault',       label: '保留故障总故障位', type: 'bit',  bitsOf: 'TotalFault', bit: 2 },

//   /* === ② 保留故障位 (Word-2) ===================================== */
//   { class: '保留故障', key: 'DeferredFault', type: 'u16', scale: 1, hide: false },
//   { class: '保留故障', key: 'Charge_OC_Alarm',      label: '充电过流严重告警',   type: 'bit',  bitsOf: 'DeferredFault', bit: 0 },
//   { class: '保留故障', key: 'Discharge_OC_Alarm',   label: '放电过流严重告警',   type: 'bit',  bitsOf: 'DeferredFault', bit: 1 },
//   { class: '保留故障', key: 'Insulation_Alarm',     label: '绝缘电阻严重告警',   type: 'bit',  bitsOf: 'DeferredFault', bit: 2 },
//   { class: '保留故障', key: 'Contactor_Weld_Alarm', label: '接触器黏连/氧化告警', type: 'bit',  bitsOf: 'DeferredFault', bit: 3 },
//   { class: '保留故障', key: 'PCS_Com_Fault',        label: 'PCS 通讯故障',      type: 'bit',  bitsOf: 'DeferredFault', bit: 4 },

//   /* === ③ 单体总故障 (Word-3，2 bit 等级映射) ====================== */
//   { class: '单体总故障', key: 'CellFault', type: 'u16', scale: 1, hide: false },

//   { class: '单体总故障', key: 'CellOv_Level',     label: '单体电压过压',     type: 'bits', bitsOf: 'CellFault', bit: 0,  len: 2, map: ALARM_MAP },
//   { class: '单体总故障', key: 'CellUv_Level',     label: '单体电压欠压',     type: 'bits', bitsOf: 'CellFault', bit: 2,  len: 2, map: ALARM_MAP },
//   { class: '单体总故障', key: 'CellOTc_Level',    label: '充电单体过温',     type: 'bits', bitsOf: 'CellFault', bit: 4,  len: 2, map: ALARM_MAP },
//   { class: '单体总故障', key: 'CellUTc_Level',    label: '充电单体欠温',     type: 'bits', bitsOf: 'CellFault', bit: 6,  len: 2, map: ALARM_MAP },
//   { class: '单体总故障', key: 'CellOTd_Level',    label: '放电单体过温',     type: 'bits', bitsOf: 'CellFault', bit: 8,  len: 2, map: ALARM_MAP },
//   { class: '单体总故障', key: 'CellUTd_Level',    label: '放电单体欠温',     type: 'bits', bitsOf: 'CellFault', bit: 10, len: 2, map: ALARM_MAP },
//   { class: '单体总故障', key: 'CellSocHigh_Level',label: '单体 SOC 过高',    type: 'bits', bitsOf: 'CellFault', bit: 12, len: 2, map: ALARM_MAP },
//   { class: '单体总故障', key: 'CellSocLow_Level', label: '单体 SOC 过低',    type: 'bits', bitsOf: 'CellFault', bit: 14, len: 2, map: ALARM_MAP },

//   /* === ④ pack 总故障 (Word-4，2 bit 等级映射) ===================== */
//   { class: 'pack总故障', key: 'PackFault', type: 'u16', scale: 1, hide: false },

//   { class: 'pack总故障', key: 'PackOv_Level',     label: 'pack过压',         type: 'bits', bitsOf: 'PackFault', bit: 0,  len: 2, map: ALARM_MAP },
//   { class: 'pack总故障', key: 'PackUv_Level',     label: 'pack欠压',         type: 'bits', bitsOf: 'PackFault', bit: 2,  len: 2, map: ALARM_MAP },
//   { class: 'pack总故障', key: 'PackOT_Level',     label: 'pack过温',             type: 'bits', bitsOf: 'PackFault', bit: 4,  len: 2, map: ALARM_MAP },
//   { class: 'pack总故障', key: 'PackUT_Level',     label: 'pack欠温',             type: 'bits', bitsOf: 'PackFault', bit: 6,  len: 2, map: ALARM_MAP },
//   { class: 'pack总故障', key: 'Plug1OT_Level',    label: '1 号动力接插件过温',    type: 'bits', bitsOf: 'PackFault', bit: 8,  len: 2, map: ALARM_MAP },
//   { class: 'pack总故障', key: 'Plug2OT_Level',    label: '2 号动力接插件过温',    type: 'bits', bitsOf: 'PackFault', bit: 10, len: 2, map: ALARM_MAP },


// ]

//协议修改新增
export const TOTAL_FAULT = [
  /* === ① 接触器详细故障 (Word-1) ======================================= */
  { class: '接触器详细故障', key: 'ContactorDetailFault', type: 'u16', scale: 1, hide: false },
  { class: '接触器详细故障', key: 'MainPosContactorFeedbackFault', label: '主正接触器反馈故障', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 0 },
  { class: '接触器详细故障', key: 'MainPosContactorHighSideFeedbackFault', label: '主正接触器高边反馈故障', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 1 },
  { class: '接触器详细故障', key: 'MainPosContactorOxidation', label: '主正接触器氧化', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 2 },
  { class: '接触器详细故障', key: 'MainPosContactorAdhesion', label: '主正接触器黏连', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 3 },
  { class: '接触器详细故障', key: 'MainPosContactorFaultSummary', label: '主正接触器故障汇总', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 4 },
  { class: '接触器详细故障', key: 'MainNegContactorFeedbackFault', label: '主负接触器反馈故障', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 5 },
  { class: '接触器详细故障', key: 'MainNegContactorHighSideFeedbackFault', label: '主负接触器高边反馈故障', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 6 },
  { class: '接触器详细故障', key: 'MainNegContactorOxidation', label: '主负接触器氧化', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 7 },
  { class: '接触器详细故障', key: 'MainNegContactorAdhesion', label: '主负接触器黏连', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 8 },
  { class: '接触器详细故障', key: 'MainNegContactorFaultSummary', label: '主负接触器故障汇总', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 9 },
  { class: '接触器详细故障', key: 'PrechargeContactorFeedbackFault', label: '预充接触器反馈故障', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 10 },
  { class: '接触器详细故障', key: 'PrechargeContactorHighSideFeedbackFault', label: '预充接触器高边反馈故障', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 11 },
  { class: '接触器详细故障', key: 'PrechargeContactorOxidation', label: '预充接触器氧化', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 12 },
  { class: '接触器详细故障', key: 'PrechargeContactorAdhesion', label: '预充接触器黏连', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 13 },
  { class: '接触器详细故障', key: 'PrechargeContactorFaultSummary', label: '预充接触器故障汇总', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 14 },
  { class: '接触器详细故障', key: 'ContactorDetailReserved', label: '预留', type: 'bit', bitsOf: 'ContactorDetailFault', bit: 15 },

  /* === ② 无效值标志-1 (Word-2) ===================================== */
  { class: '无效值标志-1', key: 'InvalidFlag1', type: 'u16', scale: 1, hide: false },
  { class: '无效值标志-1', key: 'CellVoltageInvalid', label: '单体电压无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 0 },
  { class: '无效值标志-1', key: 'CellTemperatureInvalid', label: '单体温度无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 1 },
  { class: '无效值标志-1', key: 'CellSOCInvalid', label: '单体SOC无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 2 },
  { class: '无效值标志-1', key: 'PackVoltageInvalid', label: '包电压无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 3 },
  { class: '无效值标志-1', key: 'BMUBoardTemperatureInvalid', label: 'BMU板载温度无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 4 },
  { class: '无效值标志-1', key: 'PowerConnector1TemperatureInvalid', label: '动力接插件1温度无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 5 },
  { class: '无效值标志-1', key: 'PowerConnector2TemperatureInvalid', label: '动力接插件2温度无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 6 },
  { class: '无效值标志-1', key: 'ClusterTemperature1Invalid', label: '簇温度1无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 7 },
  { class: '无效值标志-1', key: 'ClusterTemperature2Invalid', label: '簇温度2无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 8 },
  { class: '无效值标志-1', key: 'ClusterTemperature3Invalid', label: '簇温度3无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 9 },
  { class: '无效值标志-1', key: 'ClusterTemperature4Invalid', label: '簇温度4无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 10 },
  { class: '无效值标志-1', key: 'ClusterTemperature5Invalid', label: '簇温度5无效', type: 'bit', bitsOf: 'InvalidFlag1', bit: 11 },
  { class: '无效值标志-1', key: 'InvalidFlag1Reserved1', label: '预留', type: 'bit', bitsOf: 'InvalidFlag1', bit: 12 },
  { class: '无效值标志-1', key: 'InvalidFlag1Reserved2', label: '预留', type: 'bit', bitsOf: 'InvalidFlag1', bit: 13 },
  { class: '无效值标志-1', key: 'InvalidFlag1Reserved3', label: '预留', type: 'bit', bitsOf: 'InvalidFlag1', bit: 14 },
  { class: '无效值标志-1', key: 'InvalidFlag1Reserved4', label: '预留', type: 'bit', bitsOf: 'InvalidFlag1', bit: 15 },

  /* === ③ 无效值标志-2 (Word-3) ===================================== */
  { class: '无效值标志-2', key: 'InvalidFlag2', type: 'u16', scale: 1, hide: false },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved1', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 0 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved2', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 1 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved3', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 2 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved4', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 3 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved5', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 4 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved6', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 5 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved7', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 6 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved8', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 7 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved9', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 8 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved10', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 9 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved11', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 10 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved12', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 11 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved13', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 12 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved14', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 13 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved15', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 14 },
  { class: '无效值标志-2', key: 'InvalidFlag2Reserved16', label: '预留', type: 'bit', bitsOf: 'InvalidFlag2', bit: 15 },

  /* === ④ 预留 (Word-4 到 Word-8，5个寄存器) ====================== */
  { class: '预留', key: 'Reserved1', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'Reserved2', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'Reserved3', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'Reserved4', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'Reserved5', type: 'u16', scale: 1, hide: false },

  /* === ⑤ 单体总故障 (Word-9，2 bit 等级映射) ====================== */
  { class: '单体总故障', key: 'CellTotalFault', type: 'u16', scale: 1, hide: false },
  { class: '单体总故障', key: 'CellOverVoltageLevel', label: '单体电压过压', type: 'bits', bitsOf: 'CellTotalFault', bit: 0, len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellUnderVoltageLevel', label: '单体电压欠压', type: 'bits', bitsOf: 'CellTotalFault', bit: 2, len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellChargeOverTempLevel', label: '单体充电过温', type: 'bits', bitsOf: 'CellTotalFault', bit: 4, len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellChargeUnderTempLevel', label: '单体充电欠温', type: 'bits', bitsOf: 'CellTotalFault', bit: 6, len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellDischargeOverTempLevel', label: '单体放电过温', type: 'bits', bitsOf: 'CellTotalFault', bit: 8, len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellDischargeUnderTempLevel', label: '单体放电欠温', type: 'bits', bitsOf: 'CellTotalFault', bit: 10, len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellSOCHighLevel', label: '单体SOC过高', type: 'bits', bitsOf: 'CellTotalFault', bit: 12, len: 2, map: ALARM_MAP },
  { class: '单体总故障', key: 'CellSOCLowLevel', label: '单体SOC过低', type: 'bits', bitsOf: 'CellTotalFault', bit: 14, len: 2, map: ALARM_MAP },

  /* === ⑥ pack总故障 (Word-10，2 bit 等级映射) ===================== */
  { class: 'pack总故障', key: 'PackTotalFault', type: 'u16', scale: 1, hide: false },
  { class: 'pack总故障', key: 'PackOverVoltageLevel', label: 'pack电压过高', type: 'bits', bitsOf: 'PackTotalFault', bit: 0, len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PackUnderVoltageLevel', label: 'pack电压过低', type: 'bits', bitsOf: 'PackTotalFault', bit: 2, len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PackOverTempLevel', label: 'pack温度过温', type: 'bits', bitsOf: 'PackTotalFault', bit: 4, len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PackUnderTempLevel', label: 'pack温度欠温', type: 'bits', bitsOf: 'PackTotalFault', bit: 6, len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PowerConnector1OverTempLevel', label: '1号动力接插件过温', type: 'bits', bitsOf: 'PackTotalFault', bit: 8, len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PowerConnector2OverTempLevel', label: '2号动力接插件过温', type: 'bits', bitsOf: 'PackTotalFault', bit: 10, len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PackTotalFaultReserved1', label: '预留', type: 'bits', bitsOf: 'PackTotalFault', bit: 12, len: 2, map: ALARM_MAP },
  { class: 'pack总故障', key: 'PackTotalFaultReserved2', label: '预留', type: 'bits', bitsOf: 'PackTotalFault', bit: 14, len: 2, map: ALARM_MAP },

  /* === ⑦ 簇总故障1 (Word-11，2 bit 等级映射) ===================== */
  { class: '簇总故障1', key: 'ClusterTotalFault1', type: 'u16', scale: 1, hide: false },
  { class: '簇总故障1', key: 'CellVoltageDiffLevel', label: '单体电池压差过大故障等级', type: 'bits', bitsOf: 'ClusterTotalFault1', bit: 0, len: 2, map: ALARM_MAP },
  { class: '簇总故障1', key: 'CellTempDiffLevel', label: '单体电池温差过大故障等级', type: 'bits', bitsOf: 'ClusterTotalFault1', bit: 2, len: 2, map: ALARM_MAP },
  { class: '簇总故障1', key: 'SOCDiffLevel', label: 'SOC差异过大故障等级', type: 'bits', bitsOf: 'ClusterTotalFault1', bit: 4, len: 2, map: ALARM_MAP },
  { class: '簇总故障1', key: 'BMUVoltageDiffLevel', label: 'BMU压差故障等级', type: 'bits', bitsOf: 'ClusterTotalFault1', bit: 6, len: 2, map: ALARM_MAP },
  { class: '簇总故障1', key: 'ClusterOverVoltageLevel', label: '簇端过压故障等级', type: 'bits', bitsOf: 'ClusterTotalFault1', bit: 8, len: 2, map: ALARM_MAP },
  { class: '簇总故障1', key: 'ClusterUnderVoltageLevel', label: '簇端欠压故障等级', type: 'bits', bitsOf: 'ClusterTotalFault1', bit: 10, len: 2, map: ALARM_MAP },
  { class: '簇总故障1', key: 'InsulationPosToGroundLevel', label: '绝缘电阻正对地故障等级', type: 'bits', bitsOf: 'ClusterTotalFault1', bit: 12, len: 2, map: ALARM_MAP },
  { class: '簇总故障1', key: 'InsulationNegToGroundLevel', label: '绝缘电阻负对地故障等级', type: 'bits', bitsOf: 'ClusterTotalFault1', bit: 14, len: 2, map: ALARM_MAP },

  /* === ⑧ 簇总故障2 (Word-12，2 bit 等级映射) ===================== */
  { class: '簇总故障2', key: 'ClusterTotalFault2', type: 'u16', scale: 1, hide: false },
  { class: '簇总故障2', key: 'ChargeOverCurrentLevel', label: '充电过流故障等级', type: 'bits', bitsOf: 'ClusterTotalFault2', bit: 0, len: 2, map: ALARM_MAP },
  { class: '簇总故障2', key: 'DischargeOverCurrentLevel', label: '放电过流故障等级', type: 'bits', bitsOf: 'ClusterTotalFault2', bit: 2, len: 2, map: ALARM_MAP },
  { class: '簇总故障2', key: 'RT1OverTempLevel', label: 'RT1过温故障等级', type: 'bits', bitsOf: 'ClusterTotalFault2', bit: 4, len: 2, map: ALARM_MAP },
  { class: '簇总故障2', key: 'RT2OverTempLevel', label: 'RT2过温故障等级', type: 'bits', bitsOf: 'ClusterTotalFault2', bit: 6, len: 2, map: ALARM_MAP },
  { class: '簇总故障2', key: 'RT3OverTempLevel', label: 'RT3过温故障等级', type: 'bits', bitsOf: 'ClusterTotalFault2', bit: 8, len: 2, map: ALARM_MAP },
  { class: '簇总故障2', key: 'RT4OverTempLevel', label: 'RT4过温故障等级', type: 'bits', bitsOf: 'ClusterTotalFault2', bit: 10, len: 2, map: ALARM_MAP },
  { class: '簇总故障2', key: 'RT5OverTempLevel', label: 'RT5过温故障等级', type: 'bits', bitsOf: 'ClusterTotalFault2', bit: 12, len: 2, map: ALARM_MAP },
  { class: '簇总故障2', key: 'ClusterTotalFault2Reserved', label: '预留', type: 'bits', bitsOf: 'ClusterTotalFault2', bit: 14, len: 2, map: ALARM_MAP },

  /* === ⑨ 预留 (Word-13 到 Word-16，4个寄存器) ==================== */
  { class: '预留', key: 'Reserved6', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'Reserved7', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'Reserved8', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'Reserved9', type: 'u16', scale: 1, hide: false }
]

//协议修改新增 - DI/DO/温度状态
export const DI_DO_TEMP_STATUS = [
  /* === ① DI信号状态-1 (Word-1) ======================================= */
  { class: 'DI信号状态-1', key: 'DISignalStatus1', type: 'u16', scale: 1, hide: false },
  { class: 'DI信号状态-1', key: 'MainPosContactorFeedback', label: '主正接触器反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 0 },
  { class: 'DI信号状态-1', key: 'MainNegContactorFeedback', label: '主负接触器反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 1 },
  { class: 'DI信号状态-1', key: 'PrechargeContactorFeedback', label: '预充接触器反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 2 },
  { class: 'DI信号状态-1', key: 'IsolationSwitchFeedback', label: '隔离开关反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 3 },
  { class: 'DI信号状态-1', key: 'CircuitBreakerFeedback', label: '断路器反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 4 },
  { class: 'DI信号状态-1', key: 'FanFeedback', label: '风扇反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 5 },
  { class: 'DI信号状态-1', key: 'DCPowerKMFeedback', label: '直流供电KM反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 6 },
  { class: 'DI信号状态-1', key: 'AccessControlFeedback', label: '门禁反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 7 },
  { class: 'DI信号状态-1', key: 'SPDFeedback', label: 'SPD反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 8 },
  { class: 'DI信号状态-1', key: 'ACVoltageFeedback', label: '交流电压反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 9 },
  { class: 'DI信号状态-1', key: 'SmokeSensorFeedback', label: '烟感反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 10 },
  { class: 'DI信号状态-1', key: 'FireFeedback', label: '消防反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 11 },
  { class: 'DI信号状态-1', key: 'TempSensorFeedback', label: '温感反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 12 },
  { class: 'DI信号状态-1', key: 'ExhaustSystemFeedback', label: '排风系统反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 13 },
  { class: 'DI信号状态-1', key: 'AuxCircuitBreakerFeedback', label: '辅助断路器反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 14 },
  { class: 'DI信号状态-1', key: 'HydrogenDetectorFeedback', label: '氢气探测器反馈', type: 'bit', bitsOf: 'DISignalStatus1', bit: 15 },

  /* === ② DI信号状态-2 (Word-2) ===================================== */
  { class: 'DI信号状态-2', key: 'DISignalStatus2', type: 'u16', scale: 1, hide: false },
  { class: 'DI信号状态-2', key: 'MSDFeedback', label: 'MSD反馈', type: 'bit', bitsOf: 'DISignalStatus2', bit: 0 },
  { class: 'DI信号状态-2', key: 'EmergencyStopFeedback', label: '急停反馈', type: 'bit', bitsOf: 'DISignalStatus2', bit: 1 },
  { class: 'DI信号状态-2', key: 'CabinetFanFeedback', label: '柜体风机反馈', type: 'bit', bitsOf: 'DISignalStatus2', bit: 2 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved1', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 3 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved2', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 4 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved3', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 5 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved4', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 6 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved5', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 7 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved6', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 8 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved7', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 9 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved8', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 10 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved9', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 11 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved10', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 12 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved11', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 13 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved12', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 14 },
  { class: 'DI信号状态-2', key: 'DIStatus2Reserved13', label: '预留', type: 'bit', bitsOf: 'DISignalStatus2', bit: 15 },

  /* === ③ DI信号状态-3 (Word-3) ===================================== */
  { class: 'DI信号状态-3', key: 'DISignalStatus3', type: 'u16', scale: 1, hide: false },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved1', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 0 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved2', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 1 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved3', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 2 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved4', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 3 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved5', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 4 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved6', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 5 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved7', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 6 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved8', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 7 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved9', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 8 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved10', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 9 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved11', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 10 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved12', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 11 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved13', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 12 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved14', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 13 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved15', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 14 },
  { class: 'DI信号状态-3', key: 'DIStatus3Reserved16', label: '预留', type: 'bit', bitsOf: 'DISignalStatus3', bit: 15 },

  /* === ④ DI信号状态-4 (Word-4) ===================================== */
  { class: 'DI信号状态-4', key: 'DISignalStatus4', type: 'u16', scale: 1, hide: false },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved1', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 0 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved2', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 1 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved3', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 2 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved4', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 3 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved5', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 4 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved6', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 5 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved7', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 6 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved8', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 7 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved9', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 8 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved10', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 9 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved11', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 10 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved12', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 11 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved13', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 12 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved14', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 13 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved15', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 14 },
  { class: 'DI信号状态-4', key: 'DIStatus4Reserved16', label: '预留', type: 'bit', bitsOf: 'DISignalStatus4', bit: 15 },

  /* === ⑤ DO驱动反馈状态-1 (Word-5) ================================= */
  { class: 'DO驱动反馈状态-1', key: 'DODriveFeedbackStatus1', type: 'u16', scale: 1, hide: false },
  { class: 'DO驱动反馈状态-1', key: 'MainPosContactorHighSideDriveFeedback', label: '主正接触器高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 0 },
  { class: 'DO驱动反馈状态-1', key: 'MainNegContactorHighSideDriveFeedback', label: '主负接触器高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 1 },
  { class: 'DO驱动反馈状态-1', key: 'PrechargeContactorHighSideDriveFeedback', label: '预充接触器高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 2 },
  { class: 'DO驱动反馈状态-1', key: 'GreenLightHighSideDriveFeedback', label: '绿灯高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 3 },
  { class: 'DO驱动反馈状态-1', key: 'YellowLightHighSideDriveFeedback', label: '黄灯高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 4 },
  { class: 'DO驱动反馈状态-1', key: 'RedLightHighSideDriveFeedback', label: '红灯高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 5 },
  { class: 'DO驱动反馈状态-1', key: 'FanHighSideDriveFeedback', label: '风扇高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 6 },
  { class: 'DO驱动反馈状态-1', key: 'MainBreakerShuntTripHighSideDriveFeedback', label: '主断分励脱扣高边驱动反馈故障', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 7 },
  { class: 'DO驱动反馈状态-1', key: 'DCPowerKMHighSideDriveFeedback', label: '直流供电KM高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 8 },
  { class: 'DO驱动反馈状态-1', key: 'PCSWaveBlockHighSideDriveFeedback', label: 'pcs封波高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 9 },
  { class: 'DO驱动反馈状态-1', key: 'AuxBreakerHighSideDriveFeedback', label: '辅助断路器高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 10 },
  { class: 'DO驱动反馈状态-1', key: 'ExhaustSystemHighSideDriveFeedback', label: '排风系统高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 11 },
  { class: 'DO驱动反馈状态-1', key: 'CabinetFanHighSideDriveFeedback', label: '柜体风机高边驱动反馈', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 12 },
  { class: 'DO驱动反馈状态-1', key: 'DODriveFeedback1Reserved1', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 13 },
  { class: 'DO驱动反馈状态-1', key: 'DODriveFeedback1Reserved2', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 14 },
  { class: 'DO驱动反馈状态-1', key: 'DODriveFeedback1Reserved3', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus1', bit: 15 },

  /* === ⑥ DO驱动反馈状态-2 (Word-6) ================================= */
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedbackStatus2', type: 'u16', scale: 1, hide: false },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved1', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 0 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved2', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 1 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved3', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 2 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved4', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 3 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved5', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 4 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved6', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 5 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved7', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 6 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved8', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 7 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved9', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 8 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved10', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 9 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved11', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 10 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved12', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 11 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved13', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 12 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved14', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 13 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved15', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 14 },
  { class: 'DO驱动反馈状态-2', key: 'DODriveFeedback2Reserved16', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus2', bit: 15 },

  /* === ⑦ DO驱动反馈状态-3 (Word-7) ================================= */
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedbackStatus3', type: 'u16', scale: 1, hide: false },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved1', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 0 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved2', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 1 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved3', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 2 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved4', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 3 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved5', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 4 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved6', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 5 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved7', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 6 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved8', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 7 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved9', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 8 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved10', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 9 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved11', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 10 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved12', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 11 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved13', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 12 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved14', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 13 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved15', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 14 },
  { class: 'DO驱动反馈状态-3', key: 'DODriveFeedback3Reserved16', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus3', bit: 15 },

  /* === ⑧ DO驱动反馈状态-4 (Word-8) ================================= */
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedbackStatus4', type: 'u16', scale: 1, hide: false },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved1', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 0 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved2', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 1 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved3', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 2 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved4', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 3 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved5', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 4 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved6', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 5 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved7', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 6 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved8', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 7 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved9', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 8 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved10', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 9 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved11', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 10 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved12', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 11 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved13', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 12 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved14', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 13 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved15', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 14 },
  { class: 'DO驱动反馈状态-4', key: 'DODriveFeedback4Reserved16', label: '预留', type: 'bit', bitsOf: 'DODriveFeedbackStatus4', bit: 15 },

  /* === ⑨ DO控制状态-1 (Word-9) ===================================== */
  { class: 'DO控制状态-1', key: 'DOControlStatus1', type: 'u16', scale: 1, hide: false },
  { class: 'DO控制状态-1', key: 'MainPosContactorControl', label: '主正接触器控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 0 },
  { class: 'DO控制状态-1', key: 'MainNegContactorControl', label: '主负接触器控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 1 },
  { class: 'DO控制状态-1', key: 'PrechargeContactorControl', label: '预充接触器控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 2 },
  { class: 'DO控制状态-1', key: 'GreenLightControl', label: '绿灯控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 3 },
  { class: 'DO控制状态-1', key: 'YellowLightControl', label: '黄灯控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 4 },
  { class: 'DO控制状态-1', key: 'RedLightControl', label: '红灯控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 5 },
  { class: 'DO控制状态-1', key: 'FanControl', label: '风扇控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 6 },
  { class: 'DO控制状态-1', key: 'MainBreakerShuntTripControl', label: '主断分励脱扣控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 7 },
  { class: 'DO控制状态-1', key: 'DCPowerKMControl', label: '直流供电KM控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 8 },
  { class: 'DO控制状态-1', key: 'PCSWaveBlockControl', label: 'pcs封波控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 9 },
  { class: 'DO控制状态-1', key: 'AuxBreakerControl', label: '辅助断路器控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 10 },
  { class: 'DO控制状态-1', key: 'ExhaustSystemControl', label: '排风系统控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 11 },
  { class: 'DO控制状态-1', key: 'CabinetFanControl', label: '柜体风机控制', type: 'bit', bitsOf: 'DOControlStatus1', bit: 12 },
  { class: 'DO控制状态-1', key: 'DOControl1Reserved1', label: '预留', type: 'bit', bitsOf: 'DOControlStatus1', bit: 13 },
  { class: 'DO控制状态-1', key: 'DOControl1Reserved2', label: '预留', type: 'bit', bitsOf: 'DOControlStatus1', bit: 14 },
  { class: 'DO控制状态-1', key: 'DOControl1Reserved3', label: '预留', type: 'bit', bitsOf: 'DOControlStatus1', bit: 15 },

  /* === ⑩ DO控制状态-2 (Word-10) ==================================== */
  { class: 'DO控制状态-2', key: 'DOControlStatus2', type: 'u16', scale: 1, hide: false },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved1', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 0 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved2', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 1 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved3', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 2 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved4', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 3 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved5', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 4 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved6', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 5 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved7', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 6 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved8', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 7 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved9', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 8 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved10', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 9 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved11', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 10 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved12', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 11 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved13', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 12 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved14', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 13 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved15', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 14 },
  { class: 'DO控制状态-2', key: 'DOControl2Reserved16', label: '预留', type: 'bit', bitsOf: 'DOControlStatus2', bit: 15 },

  /* === ⑪ DO控制状态-3 (Word-11) ==================================== */
  { class: 'DO控制状态-3', key: 'DOControlStatus3', type: 'u16', scale: 1, hide: false },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved1', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 0 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved2', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 1 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved3', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 2 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved4', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 3 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved5', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 4 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved6', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 5 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved7', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 6 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved8', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 7 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved9', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 8 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved10', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 9 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved11', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 10 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved12', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 11 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved13', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 12 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved14', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 13 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved15', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 14 },
  { class: 'DO控制状态-3', key: 'DOControl3Reserved16', label: '预留', type: 'bit', bitsOf: 'DOControlStatus3', bit: 15 },

  /* === ⑫ DO控制状态-4 (Word-12) ==================================== */
  { class: 'DO控制状态-4', key: 'DOControlStatus4', type: 'u16', scale: 1, hide: false },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved1', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 0 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved2', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 1 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved3', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 2 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved4', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 3 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved5', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 4 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved6', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 5 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved7', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 6 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved8', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 7 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved9', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 8 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved10', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 9 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved11', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 10 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved12', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 11 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved13', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 12 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved14', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 13 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved15', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 14 },
  { class: 'DO控制状态-4', key: 'DOControl4Reserved16', label: '预留', type: 'bit', bitsOf: 'DOControlStatus4', bit: 15 },

  /* === ⑬ RT1温度信息 (Word-13-14) ================================== */
  { class: 'RT1温度信息', key: 'RT1TempName', label: 'RT1温度信号名称', type: 'u16', scale: 1, hide: false },
  { class: 'RT1温度信息', key: 'RT1TempData', label: 'RT1温度数据', type: 's16', scale: 10, unit: '℃', hide: false },

  /* === ⑭ RT2温度信息 (Word-15-16) ================================== */
  { class: 'RT2温度信息', key: 'RT2TempName', label: 'RT2温度信号名称', type: 'u16', scale: 1, hide: false },
  { class: 'RT2温度信息', key: 'RT2TempData', label: 'RT2温度数据', type: 's16', scale: 10, unit: '℃', hide: false },

  /* === ⑮ RT3温度信息 (Word-17-18) ================================== */
  { class: 'RT3温度信息', key: 'RT3TempName', label: 'RT3温度信号名称', type: 'u16', scale: 1, hide: false },
  { class: 'RT3温度信息', key: 'RT3TempData', label: 'RT3温度数据', type: 's16', scale: 10, unit: '℃', hide: false },

  /* === ⑯ RT4温度信息 (Word-19-20) ================================== */
  { class: 'RT4温度信息', key: 'RT4TempName', label: 'RT4温度信号名称', type: 'u16', scale: 1, hide: false },
  { class: 'RT4温度信息', key: 'RT4TempData', label: 'RT4温度数据', type: 's16', scale: 10, unit: '℃', hide: false },

  /* === ⑰ RT5温度信息 (Word-21-22) ================================== */
  { class: 'RT5温度信息', key: 'RT5TempName', label: 'RT5温度信号名称', type: 'u16', scale: 1, hide: false },
  { class: 'RT5温度信息', key: 'RT5TempData', label: 'RT5温度数据', type: 's16', scale: 10, unit: '℃', hide: false },

  /* === ⑱ 预留 (Word-23 到 Word-32，10个寄存器) ==================== */
  { class: '预留', key: 'DIDoTempReserved1', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'DIDoTempReserved2', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'DIDoTempReserved3', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'DIDoTempReserved4', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'DIDoTempReserved5', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'DIDoTempReserved6', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'DIDoTempReserved7', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'DIDoTempReserved8', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'DIDoTempReserved9', type: 'u16', scale: 1, hide: false },
  { class: '预留', key: 'DIDoTempReserved10', type: 'u16', scale: 1, hide: false }
]

//协议修改新增 - 输出的故障map (320个bit分配到20个寄存器)
export const OUT_FAULT_MAP = [
  /* === Register1 (编号1-16) ========================== */
  { class: 'Register1', key: 'FaultMap1', type: 'u16', scale: 1, hide: false },
  { class: 'Register1', key: 'CellOverVoltageSevere', label: '单体过压严重总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 0 },
  { class: 'Register1', key: 'CellOverVoltageModerate', label: '单体过压一般总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 1 },
  { class: 'Register1', key: 'CellOverVoltageMild', label: '单体过压轻微总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 2 },
  { class: 'Register1', key: 'CellUnderVoltageSevere', label: '单体欠压严重总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 3 },
  { class: 'Register1', key: 'CellUnderVoltageModerate', label: '单体欠压一般总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 4 },
  { class: 'Register1', key: 'CellUnderVoltageMild', label: '单体欠压轻微总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 5 },
  { class: 'Register1', key: 'ChargeOverTempSevere', label: '充电单体温度过高严重总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 6 },
  { class: 'Register1', key: 'ChargeOverTempModerate', label: '充电单体温度过高一般总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 7 },
  { class: 'Register1', key: 'ChargeOverTempMild', label: '充电单体温度过高轻微总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 8 },
  { class: 'Register1', key: 'ChargeUnderTempSevere', label: '充电单体温度过低严重总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 9 },
  { class: 'Register1', key: 'ChargeUnderTempModerate', label: '充电单体温度过低一般总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 10 },
  { class: 'Register1', key: 'ChargeUnderTempMild', label: '充电单体温度过低轻微总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 11 },
  { class: 'Register1', key: 'DischargeOverTempSevere', label: '放电单体温度过高严重总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 12 },
  { class: 'Register1', key: 'DischargeOverTempModerate', label: '放电单体温度过高一般总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 13 },
  { class: 'Register1', key: 'DischargeOverTempMild', label: '放电单体温度过高轻微总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 14 },
  { class: 'Register1', key: 'DischargeUnderTempSevere', label: '放电单体温度过低严重总故障', type: 'bit', bitsOf: 'FaultMap1', bit: 15 },

  /* === Register2 (编号17-32) ========================== */
  { class: 'Register2', key: 'FaultMap2', type: 'u16', scale: 1, hide: false },
  { class: 'Register2', key: 'DischargeUnderTempModerate', label: '放电单体温度过低一般总故障', type: 'bit', bitsOf: 'FaultMap2', bit: 0 },
  { class: 'Register2', key: 'DischargeUnderTempMild', label: '放电单体温度过低轻微总故障', type: 'bit', bitsOf: 'FaultMap2', bit: 1 },
  { class: 'Register2', key: 'CellSOCHighSevere', label: '单体SOC过高严重总故障', type: 'bit', bitsOf: 'FaultMap2', bit: 2 },
  { class: 'Register2', key: 'CellSOCHighModerate', label: '单体SOC过高一般总故障', type: 'bit', bitsOf: 'FaultMap2', bit: 3 },
  { class: 'Register2', key: 'CellSOCHighMild', label: '单体SOC过高轻微总故障', type: 'bit', bitsOf: 'FaultMap2', bit: 4 },
  { class: 'Register2', key: 'CellSOCLowSevere', label: '单体SOC过低严重总故障', type: 'bit', bitsOf: 'FaultMap2', bit: 5 },
  { class: 'Register2', key: 'CellSOCLowModerate', label: '单体SOC过低一般总故障', type: 'bit', bitsOf: 'FaultMap2', bit: 6 },
  { class: 'Register2', key: 'CellSOCLowMild', label: '单体SOC过低轻微总故障', type: 'bit', bitsOf: 'FaultMap2', bit: 7 },
  { class: 'Register2', key: 'CellVoltageSuper', label: '单体电压超级故障', type: 'bit', bitsOf: 'FaultMap2', bit: 8 },
  // 预留位26-32
  { class: 'Register2', key: 'Reserved26', label: '预留', type: 'bit', bitsOf: 'FaultMap2', bit: 9 },
  { class: 'Register2', key: 'Reserved27', label: '预留', type: 'bit', bitsOf: 'FaultMap2', bit: 10 },
  { class: 'Register2', key: 'Reserved28', label: '预留', type: 'bit', bitsOf: 'FaultMap2', bit: 11 },
  { class: 'Register2', key: 'Reserved29', label: '预留', type: 'bit', bitsOf: 'FaultMap2', bit: 12 },
  { class: 'Register2', key: 'Reserved30', label: '预留', type: 'bit', bitsOf: 'FaultMap2', bit: 13 },
  { class: 'Register2', key: 'Reserved31', label: '预留', type: 'bit', bitsOf: 'FaultMap2', bit: 14 },
  { class: 'Register2', key: 'Reserved32', label: '预留', type: 'bit', bitsOf: 'FaultMap2', bit: 15 },

  /* === Register3 (编号33-48) ========================== */
  { class: 'Register3', key: 'FaultMap3', type: 'u16', scale: 1, hide: false },
  { class: 'Register3', key: 'Reserved33', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 0 },
  { class: 'Register3', key: 'Reserved34', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 1 },
  { class: 'Register3', key: 'Reserved35', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 2 },
  { class: 'Register3', key: 'Reserved36', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 3 },
  { class: 'Register3', key: 'Reserved37', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 4 },
  { class: 'Register3', key: 'Reserved38', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 5 },
  { class: 'Register3', key: 'Reserved39', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 6 },
  { class: 'Register3', key: 'Reserved40', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 7 },
  { class: 'Register3', key: 'Reserved41', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 8 },
  { class: 'Register3', key: 'Reserved42', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 9 },
  { class: 'Register3', key: 'Reserved43', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 10 },
  { class: 'Register3', key: 'Reserved44', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 11 },
  { class: 'Register3', key: 'Reserved45', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 12 },
  { class: 'Register3', key: 'Reserved46', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 13 },
  { class: 'Register3', key: 'Reserved47', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 14 },
  { class: 'Register3', key: 'Reserved48', label: '预留', type: 'bit', bitsOf: 'FaultMap3', bit: 15 },

  /* === Register4 (编号49-64) ========================== */
  { class: 'Register4', key: 'FaultMap4', type: 'u16', scale: 1, hide: false },
  { class: 'Register4', key: 'Reserved49', label: '预留', type: 'bit', bitsOf: 'FaultMap4', bit: 0 },
  { class: 'Register4', key: 'Reserved50', label: '预留', type: 'bit', bitsOf: 'FaultMap4', bit: 1 },
  { class: 'Register4', key: 'BMUOverVoltageSevere', label: 'BMU过压严重总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 2 },
  { class: 'Register4', key: 'BMUOverVoltageModerate', label: 'BMU过压一般总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 3 },
  { class: 'Register4', key: 'BMUOverVoltageMild', label: 'BMU过压轻微总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 4 },
  { class: 'Register4', key: 'BMUUnderVoltageSevere', label: 'BMU欠压严重总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 5 },
  { class: 'Register4', key: 'BMUUnderVoltageModerate', label: 'BMU欠压一般总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 6 },
  { class: 'Register4', key: 'BMUUnderVoltageMild', label: 'BMU欠压轻微总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 7 },
  { class: 'Register4', key: 'BMUOverTempSevere', label: 'BMU温度过高严重总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 8 },
  { class: 'Register4', key: 'BMUOverTempModerate', label: 'BMU温度过高一般总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 9 },
  { class: 'Register4', key: 'BMUOverTempMild', label: 'BMU温度过高轻微总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 10 },
  { class: 'Register4', key: 'BMUUnderTempSevere', label: 'BMU温度过低严重总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 11 },
  { class: 'Register4', key: 'BMUUnderTempModerate', label: 'BMU温度过低一般总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 12 },
  { class: 'Register4', key: 'BMUUnderTempMild', label: 'BMU温度过低轻微总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 13 },
  { class: 'Register4', key: 'PowerConnectorOverTempSevere', label: '动力接插件1温度过高严重总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 14 },
  { class: 'Register4', key: 'PowerConnectorOverTempModerate', label: '动力接插件1温度过高一般总故障', type: 'bit', bitsOf: 'FaultMap4', bit: 15 },

  /* === Register5 (编号65-80) ========================== */
  { class: 'Register5', key: 'FaultMap5', type: 'u16', scale: 1, hide: false },
  { class: 'Register5', key: 'PowerConnectorOverTempMild', label: '动力接插件1温度过高轻微总故障', type: 'bit', bitsOf: 'FaultMap5', bit: 0 },
  { class: 'Register5', key: 'PowerConnectorUnderTempSevere', label: '动力接插件2温度过高严重总故障', type: 'bit', bitsOf: 'FaultMap5', bit: 1 },
  { class: 'Register5', key: 'PowerConnectorUnderTempModerate', label: '动力接插件2温度过高一般总故障', type: 'bit', bitsOf: 'FaultMap5', bit: 2 },
  { class: 'Register5', key: 'PowerConnectorUnderTempMild', label: '动力接插件2温度过高轻微总故障', type: 'bit', bitsOf: 'FaultMap5', bit: 3 },
  { class: 'Register5', key: 'Reserved69', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 4 },
  { class: 'Register5', key: 'Reserved70', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 5 },
  { class: 'Register5', key: 'Reserved71', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 6 },
  { class: 'Register5', key: 'Reserved72', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 7 },
  { class: 'Register5', key: 'Reserved73', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 8 },
  { class: 'Register5', key: 'Reserved74', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 9 },
  { class: 'Register5', key: 'Reserved75', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 10 },
  { class: 'Register5', key: 'Reserved76', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 11 },
  { class: 'Register5', key: 'Reserved77', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 12 },
  { class: 'Register5', key: 'Reserved78', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 13 },
  { class: 'Register5', key: 'Reserved79', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 14 },
  { class: 'Register5', key: 'Reserved80', label: '预留', type: 'bit', bitsOf: 'FaultMap5', bit: 15 },

  /* === Register6 (编号81-96) ========================== */
  { class: 'Register6', key: 'FaultMap6', type: 'u16', scale: 1, hide: false },
  { class: 'Register6', key: 'Reserved81', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 0 },
  { class: 'Register6', key: 'Reserved82', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 1 },
  { class: 'Register6', key: 'Reserved83', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 2 },
  { class: 'Register6', key: 'Reserved84', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 3 },
  { class: 'Register6', key: 'Reserved85', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 4 },
  { class: 'Register6', key: 'Reserved86', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 5 },
  { class: 'Register6', key: 'Reserved87', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 6 },
  { class: 'Register6', key: 'Reserved88', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 7 },
  { class: 'Register6', key: 'Reserved89', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 8 },
  { class: 'Register6', key: 'Reserved90', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 9 },
  { class: 'Register6', key: 'Reserved91', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 10 },
  { class: 'Register6', key: 'Reserved92', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 11 },
  { class: 'Register6', key: 'Reserved93', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 12 },
  { class: 'Register6', key: 'Reserved94', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 13 },
  { class: 'Register6', key: 'Reserved95', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 14 },
  { class: 'Register6', key: 'Reserved96', label: '预留', type: 'bit', bitsOf: 'FaultMap6', bit: 15 },

  /* === Register7 (编号97-112) ========================== */
  { class: 'Register7', key: 'FaultMap7', type: 'u16', scale: 1, hide: false },
  { class: 'Register7', key: 'Reserved97', label: '预留', type: 'bit', bitsOf: 'FaultMap7', bit: 0 },
  { class: 'Register7', key: 'Reserved98', label: '预留', type: 'bit', bitsOf: 'FaultMap7', bit: 1 },
  { class: 'Register7', key: 'Reserved99', label: '预留', type: 'bit', bitsOf: 'FaultMap7', bit: 2 },
  { class: 'Register7', key: 'Reserved100', label: '预留', type: 'bit', bitsOf: 'FaultMap7', bit: 3 },
  { class: 'Register7', key: 'CellVoltageDiffSevere', label: '单体压差过大严重故障', type: 'bit', bitsOf: 'FaultMap7', bit: 4 },
  { class: 'Register7', key: 'CellVoltageDiffModerate', label: '单体压差过大一般故障', type: 'bit', bitsOf: 'FaultMap7', bit: 5 },
  { class: 'Register7', key: 'CellVoltageDiffMild', label: '单体压差过大轻微故障', type: 'bit', bitsOf: 'FaultMap7', bit: 6 },
  { class: 'Register7', key: 'CellTempDiffSevere', label: '单体温差过大严重故障', type: 'bit', bitsOf: 'FaultMap7', bit: 7 },
  { class: 'Register7', key: 'CellTempDiffModerate', label: '单体温差过大一般故障', type: 'bit', bitsOf: 'FaultMap7', bit: 8 },
  { class: 'Register7', key: 'CellTempDiffMild', label: '单体温差过大轻微故障', type: 'bit', bitsOf: 'FaultMap7', bit: 9 },
  { class: 'Register7', key: 'CellSOCDiffSevere', label: '单体SOC差异过大严重故障', type: 'bit', bitsOf: 'FaultMap7', bit: 10 },
  { class: 'Register7', key: 'CellSOCDiffModerate', label: '单体SOC差异大一般故障', type: 'bit', bitsOf: 'FaultMap7', bit: 11 },
  { class: 'Register7', key: 'CellSOCDiffMild', label: '单体SOC差异大轻微故障', type: 'bit', bitsOf: 'FaultMap7', bit: 12 },
  { class: 'Register7', key: 'BMUVoltageDiffSevere', label: 'BMU压差过大严重故障', type: 'bit', bitsOf: 'FaultMap7', bit: 13 },
  { class: 'Register7', key: 'BMUVoltageDiffModerate', label: 'BMU压差过大一般故障', type: 'bit', bitsOf: 'FaultMap7', bit: 14 },
  { class: 'Register7', key: 'BMUVoltageDiffMild', label: 'BMU压差过大轻微故障', type: 'bit', bitsOf: 'FaultMap7', bit: 15 },

  /* === Register8 (编号113-128) ========================== */
  { class: 'Register8', key: 'FaultMap8', type: 'u16', scale: 1, hide: false },
  { class: 'Register8', key: 'Reserved113', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 0 },
  { class: 'Register8', key: 'Reserved114', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 1 },
  { class: 'Register8', key: 'Reserved115', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 2 },
  { class: 'Register8', key: 'Reserved116', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 3 },
  { class: 'Register8', key: 'Reserved117', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 4 },
  { class: 'Register8', key: 'Reserved118', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 5 },
  { class: 'Register8', key: 'Reserved119', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 6 },
  { class: 'Register8', key: 'Reserved120', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 7 },
  { class: 'Register8', key: 'Reserved121', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 8 },
  { class: 'Register8', key: 'Reserved122', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 9 },
  { class: 'Register8', key: 'Reserved123', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 10 },
  { class: 'Register8', key: 'Reserved124', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 11 },
  { class: 'Register8', key: 'Reserved125', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 12 },
  { class: 'Register8', key: 'Reserved126', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 13 },
  { class: 'Register8', key: 'Reserved127', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 14 },
  { class: 'Register8', key: 'Reserved128', label: '预留', type: 'bit', bitsOf: 'FaultMap8', bit: 15 },

  /* === Register9 (编号129-144) ========================== */
  { class: 'Register9', key: 'FaultMap9', type: 'u16', scale: 1, hide: false },
  { class: 'Register9', key: 'Reserved129', label: '预留', type: 'bit', bitsOf: 'FaultMap9', bit: 0 },
  { class: 'Register9', key: 'Reserved130', label: '预留', type: 'bit', bitsOf: 'FaultMap9', bit: 1 },
  { class: 'Register9', key: 'ClusterOverVoltageSevere', label: '簇端过压严重故障', type: 'bit', bitsOf: 'FaultMap9', bit: 2 },
  { class: 'Register9', key: 'ClusterOverVoltageModerate', label: '簇端过压一般故障', type: 'bit', bitsOf: 'FaultMap9', bit: 3 },
  { class: 'Register9', key: 'ClusterOverVoltageMild', label: '簇端过压轻微故障', type: 'bit', bitsOf: 'FaultMap9', bit: 4 },
  { class: 'Register9', key: 'ClusterUnderVoltageSevere', label: '簇端欠压严重故障', type: 'bit', bitsOf: 'FaultMap9', bit: 5 },
  { class: 'Register9', key: 'ClusterUnderVoltageModerate', label: '簇端欠压一般故障', type: 'bit', bitsOf: 'FaultMap9', bit: 6 },
  { class: 'Register9', key: 'ClusterUnderVoltageMild', label: '簇端欠压轻微故障', type: 'bit', bitsOf: 'FaultMap9', bit: 7 },
  { class: 'Register9', key: 'InsulationPosToGroundSevere', label: '绝缘电阻正对地严重故障', type: 'bit', bitsOf: 'FaultMap9', bit: 8 },
  { class: 'Register9', key: 'InsulationPosToGroundModerate', label: '绝缘电阻正对地一般故障', type: 'bit', bitsOf: 'FaultMap9', bit: 9 },
  { class: 'Register9', key: 'InsulationPosToGroundMild', label: '绝缘电阻正对地轻微故障', type: 'bit', bitsOf: 'FaultMap9', bit: 10 },
  { class: 'Register9', key: 'InsulationNegToGroundSevere', label: '绝缘电阻负对地严重故障', type: 'bit', bitsOf: 'FaultMap9', bit: 11 },
  { class: 'Register9', key: 'InsulationNegToGroundModerate', label: '绝缘电阻负对地一般故障', type: 'bit', bitsOf: 'FaultMap9', bit: 12 },
  { class: 'Register9', key: 'InsulationNegToGroundMild', label: '绝缘电阻负对地轻微故障', type: 'bit', bitsOf: 'FaultMap9', bit: 13 },
  { class: 'Register9', key: 'ChargeOverCurrentSevere', label: '充电过流严重故障', type: 'bit', bitsOf: 'FaultMap9', bit: 14 },
  { class: 'Register9', key: 'ChargeOverCurrentModerate', label: '充电过流一般故障', type: 'bit', bitsOf: 'FaultMap9', bit: 15 },

  /* === Register10 (编号145-160) ========================== */
  { class: 'Register10', key: 'FaultMap10', type: 'u16', scale: 1, hide: false },
  { class: 'Register10', key: 'ChargeOverCurrentMild', label: '充电过流轻微故障', type: 'bit', bitsOf: 'FaultMap10', bit: 0 },
  { class: 'Register10', key: 'DischargeOverCurrentSevere', label: '放电过流严重故障', type: 'bit', bitsOf: 'FaultMap10', bit: 1 },
  { class: 'Register10', key: 'DischargeOverCurrentModerate', label: '放电过流一般故障', type: 'bit', bitsOf: 'FaultMap10', bit: 2 },
  { class: 'Register10', key: 'DischargeOverCurrentMild', label: '放电过流轻微故障', type: 'bit', bitsOf: 'FaultMap10', bit: 3 },
  { class: 'Register10', key: 'EnvTempOverSevere', label: '环境温度过温严重故障', type: 'bit', bitsOf: 'FaultMap10', bit: 4 },
  { class: 'Register10', key: 'EnvTempOverModerate', label: '环境温度过温一般故障', type: 'bit', bitsOf: 'FaultMap10', bit: 5 },
  { class: 'Register10', key: 'EnvTempOverMild', label: '环境温度过温轻微故障', type: 'bit', bitsOf: 'FaultMap10', bit: 6 },
  { class: 'Register10', key: 'BPlusConnectorTempSevere', label: 'B+连接器温度过温严重故障', type: 'bit', bitsOf: 'FaultMap10', bit: 7 },
  { class: 'Register10', key: 'BPlusConnectorTempModerate', label: 'B+连接器温度过温一般故障', type: 'bit', bitsOf: 'FaultMap10', bit: 8 },
  { class: 'Register10', key: 'BPlusConnectorTempMild', label: 'B+连接器温度过温轻微故障', type: 'bit', bitsOf: 'FaultMap10', bit: 9 },
  { class: 'Register10', key: 'BMinusConnectorTempSevere', label: 'B-连接器温度过温严重故障', type: 'bit', bitsOf: 'FaultMap10', bit: 10 },
  { class: 'Register10', key: 'BMinusConnectorTempModerate', label: 'B-连接器温度过温一般故障', type: 'bit', bitsOf: 'FaultMap10', bit: 11 },
  { class: 'Register10', key: 'BMinusConnectorTempMild', label: 'B-连接器温度过温轻微故障', type: 'bit', bitsOf: 'FaultMap10', bit: 12 },
  { class: 'Register10', key: 'PPlusConnectorTempSevere', label: 'P+连接器温度过温严重故障', type: 'bit', bitsOf: 'FaultMap10', bit: 13 },
  { class: 'Register10', key: 'PPlusConnectorTempModerate', label: 'P+连接器温度过温一般故障', type: 'bit', bitsOf: 'FaultMap10', bit: 14 },
  { class: 'Register10', key: 'PPlusConnectorTempMild', label: 'P+连接器温度过温轻微故障', type: 'bit', bitsOf: 'FaultMap10', bit: 15 },

  /* === Register11 (编号161-176) ========================== */
  { class: 'Register11', key: 'FaultMap11', type: 'u16', scale: 1, hide: false },
  { class: 'Register11', key: 'PMinusConnectorTempSevere', label: 'P-连接器温度过温严重故障', type: 'bit', bitsOf: 'FaultMap11', bit: 0 },
  { class: 'Register11', key: 'PMinusConnectorTempModerate', label: 'P-连接器温度过温一般故障', type: 'bit', bitsOf: 'FaultMap11', bit: 1 },
  { class: 'Register11', key: 'PMinusConnectorTempMild', label: 'P-连接器温度过温轻微故障', type: 'bit', bitsOf: 'FaultMap11', bit: 2 },
  { class: 'Register11', key: 'Fuse1TempSevere', label: '熔断器1温度过温严重故障', type: 'bit', bitsOf: 'FaultMap11', bit: 3 },
  { class: 'Register11', key: 'Fuse1TempModerate', label: '熔断器1温度过温一般故障', type: 'bit', bitsOf: 'FaultMap11', bit: 4 },
  { class: 'Register11', key: 'Fuse1TempMild', label: '熔断器1温度过温轻微故障', type: 'bit', bitsOf: 'FaultMap11', bit: 5 },
  { class: 'Register11', key: 'Fuse2TempSevere', label: '熔断器2温度过温严重故障', type: 'bit', bitsOf: 'FaultMap11', bit: 6 },
  { class: 'Register11', key: 'Fuse2TempModerate', label: '熔断器2温度过温一般故障', type: 'bit', bitsOf: 'FaultMap11', bit: 7 },
  { class: 'Register11', key: 'Fuse2TempMild', label: '熔断器2温度过温轻微故障', type: 'bit', bitsOf: 'FaultMap11', bit: 8 },
  // bit 9-15: 预留 (编号170-176)
  { class: 'Register11', key: 'Reserved170', label: '预留', type: 'bit', bitsOf: 'FaultMap11', bit: 9 },
  { class: 'Register11', key: 'Reserved171', label: '预留', type: 'bit', bitsOf: 'FaultMap11', bit: 10 },
  { class: 'Register11', key: 'Reserved172', label: '预留', type: 'bit', bitsOf: 'FaultMap11', bit: 11 },
  { class: 'Register11', key: 'Reserved173', label: '预留', type: 'bit', bitsOf: 'FaultMap11', bit: 12 },
  { class: 'Register11', key: 'Reserved174', label: '预留', type: 'bit', bitsOf: 'FaultMap11', bit: 13 },
  { class: 'Register11', key: 'Reserved175', label: '预留', type: 'bit', bitsOf: 'FaultMap11', bit: 14 },
  { class: 'Register11', key: 'Reserved176', label: '预留', type: 'bit', bitsOf: 'FaultMap11', bit: 15 },

  /* === Register12 (编号177-192) ========================== */
  { class: 'Register12', key: 'FaultMap12', type: 'u16', scale: 1, hide: false },
  { class: 'Register12', key: 'Reserved177', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 0 },
  { class: 'Register12', key: 'Reserved178', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 1 },
  { class: 'Register12', key: 'Reserved179', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 2 },
  { class: 'Register12', key: 'Reserved180', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 3 },
  { class: 'Register12', key: 'Reserved181', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 4 },
  { class: 'Register12', key: 'Reserved182', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 5 },
  { class: 'Register12', key: 'Reserved183', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 6 },
  { class: 'Register12', key: 'Reserved184', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 7 },
  { class: 'Register12', key: 'Reserved185', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 8 },
  { class: 'Register12', key: 'Reserved186', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 9 },
  { class: 'Register12', key: 'Reserved187', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 10 },
  { class: 'Register12', key: 'Reserved188', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 11 },
  { class: 'Register12', key: 'Reserved189', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 12 },
  { class: 'Register12', key: 'Reserved190', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 13 },
  { class: 'Register12', key: 'Reserved191', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 14 },
  { class: 'Register12', key: 'Reserved192', label: '预留', type: 'bit', bitsOf: 'FaultMap12', bit: 15 },

  /* === Register13 (编号193-208) ========================== */
  { class: 'Register13', key: 'FaultMap13', type: 'u16', scale: 1, hide: false },
  // 预留位193-200
  { class: 'Register13', key: 'Reserved193', label: '预留', type: 'bit', bitsOf: 'FaultMap13', bit: 0 },
  { class: 'Register13', key: 'Reserved194', label: '预留', type: 'bit', bitsOf: 'FaultMap13', bit: 1 },
  { class: 'Register13', key: 'Reserved195', label: '预留', type: 'bit', bitsOf: 'FaultMap13', bit: 2 },
  { class: 'Register13', key: 'Reserved196', label: '预留', type: 'bit', bitsOf: 'FaultMap13', bit: 3 },
  { class: 'Register13', key: 'Reserved197', label: '预留', type: 'bit', bitsOf: 'FaultMap13', bit: 4 },
  { class: 'Register13', key: 'Reserved198', label: '预留', type: 'bit', bitsOf: 'FaultMap13', bit: 5 },
  { class: 'Register13', key: 'Reserved199', label: '预留', type: 'bit', bitsOf: 'FaultMap13', bit: 6 },
  { class: 'Register13', key: 'Reserved200', label: '预留', type: 'bit', bitsOf: 'FaultMap13', bit: 7 },
  { class: 'Register13', key: 'ContactorTotalFault', label: '接触器总故障', type: 'bit', bitsOf: 'FaultMap13', bit: 8 },
  { class: 'Register13', key: 'IsolationSwitchFeedbackFault', label: '隔离开关反馈故障', type: 'bit', bitsOf: 'FaultMap13', bit: 9 },
  { class: 'Register13', key: 'MainBreakerFeedbackFault', label: '主断路器反馈故障', type: 'bit', bitsOf: 'FaultMap13', bit: 10 },
  { class: 'Register13', key: 'FanControlFeedbackFault', label: '风扇控制反馈故障', type: 'bit', bitsOf: 'FaultMap13', bit: 11 },
  { class: 'Register13', key: 'DCPowerKMFeedbackFault', label: '直流供电KM反馈故障', type: 'bit', bitsOf: 'FaultMap13', bit: 12 },
  { class: 'Register13', key: 'AccessControlFeedbackFault', label: '门禁反馈故障', type: 'bit', bitsOf: 'FaultMap13', bit: 13 },
  { class: 'Register13', key: 'SPDFeedbackFault', label: 'SPD反馈故障', type: 'bit', bitsOf: 'FaultMap13', bit: 14 },
  { class: 'Register13', key: 'ACVoltageFeedbackFault', label: '交流电压反馈故障', type: 'bit', bitsOf: 'FaultMap13', bit: 15 },

  /* === Register14 (编号209-224) ========================== */
  { class: 'Register14', key: 'FaultMap14', type: 'u16', scale: 1, hide: false },
  { class: 'Register14', key: 'SmokeSensorFeedbackFault', label: '烟感反馈故障', type: 'bit', bitsOf: 'FaultMap14', bit: 0 },
  { class: 'Register14', key: 'FireFeedbackFault', label: '消防反馈故障', type: 'bit', bitsOf: 'FaultMap14', bit: 1 },
  { class: 'Register14', key: 'TempSensorFeedbackFault', label: '温感反馈故障', type: 'bit', bitsOf: 'FaultMap14', bit: 2 },
  { class: 'Register14', key: 'ExhaustSystemFeedbackFault', label: '排风系统反馈故障', type: 'bit', bitsOf: 'FaultMap14', bit: 3 },
  { class: 'Register14', key: 'AuxBreakerFeedbackFault', label: '辅助断路器反馈故障', type: 'bit', bitsOf: 'FaultMap14', bit: 4 },
  { class: 'Register14', key: 'HydrogenDetectorFeedbackFault', label: '氢气（H2）探测器反馈故障', type: 'bit', bitsOf: 'FaultMap14', bit: 5 },
  { class: 'Register14', key: 'MSDSignalFeedbackFault', label: 'MSD信号反馈故障', type: 'bit', bitsOf: 'FaultMap14', bit: 6 },
  { class: 'Register14', key: 'EmergencyStopFeedbackFault', label: '急停反馈故障', type: 'bit', bitsOf: 'FaultMap14', bit: 7 },
  { class: 'Register14', key: 'CabinetFanFeedbackFault', label: '柜体风机反馈故障', type: 'bit', bitsOf: 'FaultMap14', bit: 8 },
  // 预留位218-224
  { class: 'Register14', key: 'Reserved218', label: '预留', type: 'bit', bitsOf: 'FaultMap14', bit: 9 },
  { class: 'Register14', key: 'Reserved219', label: '预留', type: 'bit', bitsOf: 'FaultMap14', bit: 10 },
  { class: 'Register14', key: 'Reserved220', label: '预留', type: 'bit', bitsOf: 'FaultMap14', bit: 11 },
  { class: 'Register14', key: 'Reserved221', label: '预留', type: 'bit', bitsOf: 'FaultMap14', bit: 12 },
  { class: 'Register14', key: 'Reserved222', label: '预留', type: 'bit', bitsOf: 'FaultMap14', bit: 13 },
  { class: 'Register14', key: 'Reserved223', label: '预留', type: 'bit', bitsOf: 'FaultMap14', bit: 14 },
  { class: 'Register14', key: 'Reserved224', label: '预留', type: 'bit', bitsOf: 'FaultMap14', bit: 15 },

  /* === Register15 (编号225-240) ========================== */
  { class: 'Register15', key: 'FaultMap15', type: 'u16', scale: 1, hide: false },
  // 预留位225-230  
  { class: 'Register15', key: 'Reserved225', label: '预留', type: 'bit', bitsOf: 'FaultMap15', bit: 0 },
  { class: 'Register15', key: 'Reserved226', label: '预留', type: 'bit', bitsOf: 'FaultMap15', bit: 1 },
  { class: 'Register15', key: 'Reserved227', label: '预留', type: 'bit', bitsOf: 'FaultMap15', bit: 2 },
  { class: 'Register15', key: 'Reserved228', label: '预留', type: 'bit', bitsOf: 'FaultMap15', bit: 3 },
  { class: 'Register15', key: 'Reserved229', label: '预留', type: 'bit', bitsOf: 'FaultMap15', bit: 4 },
  { class: 'Register15', key: 'Reserved230', label: '预留', type: 'bit', bitsOf: 'FaultMap15', bit: 5 },
  // 高边驱动故障231-240
  { class: 'Register15', key: 'MainPosHighSideDriveFault', label: '主正高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 6 },
  { class: 'Register15', key: 'MainNegHighSideDriveFault', label: '主负高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 7 },
  { class: 'Register15', key: 'PrechargeHighSideDriveFault', label: '预充高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 8 },
  { class: 'Register15', key: 'RedLightHighSideDriveFault', label: '红灯高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 9 },
  { class: 'Register15', key: 'YellowLightHighSideDriveFault', label: '黄灯高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 10 },
  { class: 'Register15', key: 'GreenLightHighSideDriveFault', label: '绿灯高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 11 },
  { class: 'Register15', key: 'FanHighSideDriveFault', label: '风机高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 12 },
  { class: 'Register15', key: 'MainBreakerShuntTripHighSideFault', label: '主断分励高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 13 },
  { class: 'Register15', key: 'DCPowerHighSideDriveFault', label: '直流供电高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 14 },
  { class: 'Register15', key: 'PCSWaveBlockHighSideFault', label: 'PCS封波高边驱动反馈故障', type: 'bit', bitsOf: 'FaultMap15', bit: 15 },
  /* === Register16 (编号241-256) ========================== */
  { class: 'Register16', key: 'FaultMap16', type: 'u16', scale: 1, hide: false },
  { class: 'Register16', key: 'AuxBreakerShuntTripHighSideFault', label: '辅助断路器分励高边反馈故障', type: 'bit', bitsOf: 'FaultMap16', bit: 0 },
  { class: 'Register16', key: 'ExhaustSystemHighSideFault', label: '排风系统高边反馈故障', type: 'bit', bitsOf: 'FaultMap16', bit: 1 },
  { class: 'Register16', key: 'CabinetFanHighSideFault', label: '柜体风机高边反馈故障', type: 'bit', bitsOf: 'FaultMap16', bit: 2 },
  // 预留位244-256
  { class: 'Register16', key: 'Reserved244', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 3 },
  { class: 'Register16', key: 'Reserved245', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 4 },
  { class: 'Register16', key: 'Reserved246', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 5 },
  { class: 'Register16', key: 'Reserved247', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 6 },
  { class: 'Register16', key: 'Reserved248', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 7 },
  { class: 'Register16', key: 'Reserved249', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 8 },
  { class: 'Register16', key: 'Reserved250', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 9 },
  { class: 'Register16', key: 'Reserved251', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 10 },
  { class: 'Register16', key: 'Reserved252', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 11 },
  { class: 'Register16', key: 'Reserved253', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 12 },
  { class: 'Register16', key: 'Reserved254', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 13 },
  { class: 'Register16', key: 'Reserved255', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 14 },
  { class: 'Register16', key: 'Reserved256', label: '预留', type: 'bit', bitsOf: 'FaultMap16', bit: 15 },

  
  /* === Register17 (编号257-272) ========================== */
  { class: 'Register17', key: 'FaultMap17', type: 'u16', scale: 1, hide: false },
  // 通讯类故障 257-265
  { class: 'Register17', key: 'RefrigerationCommFault', label: '制冷设备通讯故障', type: 'bit', bitsOf: 'FaultMap17', bit: 0 }, // 257
  { class: 'Register17', key: 'PCSCommFault', label: 'PCS设备通讯故障', type: 'bit', bitsOf: 'FaultMap17', bit: 1 },         // 258
  { class: 'Register17', key: 'DehumidifierCommFault', label: '除湿机通讯故障', type: 'bit', bitsOf: 'FaultMap17', bit: 2 }, // 259
  { class: 'Register17', key: 'FireEquipmentCommFault', label: '消防设备通讯故障', type: 'bit', bitsOf: 'FaultMap17', bit: 3 },// 260
  { class: 'Register17', key: 'BMUCommFault', label: 'BMU通讯故障', type: 'bit', bitsOf: 'FaultMap17', bit: 4 },             // 261
  { class: 'Register17', key: 'CANHallCommFault', label: 'CAN霍尔通讯故障', type: 'bit', bitsOf: 'FaultMap17', bit: 5 },     // 262
  { class: 'Register17', key: 'BCUUpstreamCommFault', label: 'BCU对上通讯故障', type: 'bit', bitsOf: 'FaultMap17', bit: 6 }, // 263
  { class: 'Register17', key: 'DaisyChainDisconnectFault', label: '菊花链断连故障', type: 'bit', bitsOf: 'FaultMap17', bit: 7 },// 264
  { class: 'Register17', key: 'AFECommFault', label: 'AFE通讯故障', type: 'bit', bitsOf: 'FaultMap17', bit: 8 },               // 265

  // 预留 266-270 -> Register17 bit9..13
  { class: 'Register17', key: 'Reserved266', label: '预留', type: 'bit', bitsOf: 'FaultMap17', bit: 9 },  // 266
  { class: 'Register17', key: 'Reserved267', label: '预留', type: 'bit', bitsOf: 'FaultMap17', bit: 10 }, // 267
  { class: 'Register17', key: 'Reserved268', label: '预留', type: 'bit', bitsOf: 'FaultMap17', bit: 11 }, // 268
  { class: 'Register17', key: 'Reserved269', label: '预留', type: 'bit', bitsOf: 'FaultMap17', bit: 12 }, // 269
  { class: 'Register17', key: 'Reserved270', label: '预留', type: 'bit', bitsOf: 'FaultMap17', bit: 13 }, // 270

  // 温度传感器 271-272 -> Register17 bit14..15
  { class: 'Register17', key: 'EnvTempSensorFault', label: '环境温度传感器故障', type: 'bit', bitsOf: 'FaultMap17', bit: 14 },        // 271
  { class: 'Register17', key: 'BPosConnectorTempSensorFault', label: 'B+连接器温度传感器故障', type: 'bit', bitsOf: 'FaultMap17', bit: 15 }, // 272

  /* === Register18 (编号273-288) ========================== */
  { class: 'Register18', key: 'FaultMap18', type: 'u16', scale: 1, hide: false },
  // 温度传感器 273-277 -> Register18 bit0..4
  { class: 'Register18', key: 'BNegConnectorTempSensorFault', label: 'B-连接器温度传感器故障', type: 'bit', bitsOf: 'FaultMap18', bit: 0 }, // 273
  { class: 'Register18', key: 'PPosConnectorTempSensorFault', label: 'P+连接器温度传感器故障', type: 'bit', bitsOf: 'FaultMap18', bit: 1 }, // 274
  { class: 'Register18', key: 'PNegConnectorTempSensorFault', label: 'P-连接器温度传感器故障', type: 'bit', bitsOf: 'FaultMap18', bit: 2 }, // 275
  { class: 'Register18', key: 'Fuse1TempSensorFault', label: '熔断器1温度传感器故障', type: 'bit', bitsOf: 'FaultMap18', bit: 3 },              // 276
  { class: 'Register18', key: 'Fuse2TempSensorFault', label: '熔断器2温度传感器故障', type: 'bit', bitsOf: 'FaultMap18', bit: 4 },              // 277

  // 预留 278-288 -> Register18 bit5..15 (共 11 bit)
  { class: 'Register18', key: 'Reserved278', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 5 },  // 278
  { class: 'Register18', key: 'Reserved279', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 6 },  // 279
  { class: 'Register18', key: 'Reserved280', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 7 },  // 280
  { class: 'Register18', key: 'Reserved281', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 8 },  // 281
  { class: 'Register18', key: 'Reserved282', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 9 },  // 282
  { class: 'Register18', key: 'Reserved283', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 10 }, // 283
  { class: 'Register18', key: 'Reserved284', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 11 }, // 284
  { class: 'Register18', key: 'Reserved285', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 12 }, // 285
  { class: 'Register18', key: 'Reserved286', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 13 }, // 286
  { class: 'Register18', key: 'Reserved287', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 14 }, // 287
  { class: 'Register18', key: 'Reserved288', label: '预留', type: 'bit', bitsOf: 'FaultMap18', bit: 15 }, // 288

  /* === Register19 (编号289-304) ========================== */
  { class: 'Register19', key: 'FaultMap19', type: 'u16', scale: 1, hide: false },
  // 预留位 289-290 -> Register19 bit0..1
  { class: 'Register19', key: 'Reserved289', label: '预留', type: 'bit', bitsOf: 'FaultMap19', bit: 0 }, // 289
  { class: 'Register19', key: 'Reserved290', label: '预留', type: 'bit', bitsOf: 'FaultMap19', bit: 1 }, // 290

  // 其他故障 291-298 -> Register19 bit2..9
  { class: 'Register19', key: 'HallFault', label: '霍尔故障', type: 'bit', bitsOf: 'FaultMap19', bit: 2 },             // 291
  { class: 'Register19', key: 'InvalidDataExists', label: '存在无效数据', type: 'bit', bitsOf: 'FaultMap19', bit: 3 },  // 292
  { class: 'Register19', key: 'FeRAMFault', label: '铁电存储器故障', type: 'bit', bitsOf: 'FaultMap19', bit: 4 },       // 293
  { class: 'Register19', key: 'EEPROMFault', label: 'EEPROM故障', type: 'bit', bitsOf: 'FaultMap19', bit: 5 },          // 294
  { class: 'Register19', key: 'FLASHFault', label: 'FLASH故障', type: 'bit', bitsOf: 'FaultMap19', bit: 6 },            // 295
  { class: 'Register19', key: 'VoltageAcquisitionOffline', label: '电压采集掉线', type: 'bit', bitsOf: 'FaultMap19', bit: 7 }, // 296
  { class: 'Register19', key: 'TempAcquisitionOffline', label: '温度采集掉线', type: 'bit', bitsOf: 'FaultMap19', bit: 8 },    // 297
  { class: 'Register19', key: 'ReservedFaultSummary', label: '保留故障汇总点', type: 'bit', bitsOf: 'FaultMap19', bit: 9 },   // 298

  // 预留位 299-304 -> Register19 bit10..15
  { class: 'Register19', key: 'Reserved299', label: '预留', type: 'bit', bitsOf: 'FaultMap19', bit: 10 }, // 299
  { class: 'Register19', key: 'Reserved300', label: '预留', type: 'bit', bitsOf: 'FaultMap19', bit: 11 }, // 300
  { class: 'Register19', key: 'Reserved301', label: '预留', type: 'bit', bitsOf: 'FaultMap19', bit: 12 }, // 301
  { class: 'Register19', key: 'Reserved302', label: '预留', type: 'bit', bitsOf: 'FaultMap19', bit: 13 }, // 302
  { class: 'Register19', key: 'Reserved303', label: '预留', type: 'bit', bitsOf: 'FaultMap19', bit: 14 }, // 303
  { class: 'Register19', key: 'Reserved304', label: '预留', type: 'bit', bitsOf: 'FaultMap19', bit: 15 }, // 304

  /* === Register20 (编号305-320) ========================== */
  { class: 'Register20', key: 'FaultMap20', type: 'u16', scale: 1, hide: false },
  // 305-320 全部预留 -> Register20 bit0..15
  { class: 'Register20', key: 'Reserved305', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 0 },  // 305
  { class: 'Register20', key: 'Reserved306', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 1 },  // 306
  { class: 'Register20', key: 'Reserved307', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 2 },  // 307
  { class: 'Register20', key: 'Reserved308', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 3 },  // 308
  { class: 'Register20', key: 'Reserved309', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 4 },  // 309
  { class: 'Register20', key: 'Reserved310', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 5 },  // 310
  { class: 'Register20', key: 'Reserved311', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 6 },  // 311
  { class: 'Register20', key: 'Reserved312', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 7 },  // 312
  { class: 'Register20', key: 'Reserved313', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 8 },  // 313
  { class: 'Register20', key: 'Reserved314', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 9 },  // 314
  { class: 'Register20', key: 'Reserved315', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 10 }, // 315
  { class: 'Register20', key: 'Reserved316', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 11 }, // 316
  { class: 'Register20', key: 'Reserved317', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 12 }, // 317
  { class: 'Register20', key: 'Reserved318', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 13 }, // 318
  { class: 'Register20', key: 'Reserved319', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 14 }, // 319
  { class: 'Register20', key: 'Reserved320', label: '预留', type: 'bit', bitsOf: 'FaultMap20', bit: 15 }  // 320


]

//协议修改新增 - 保留故障map（与输出故障map结构相同）
export const SAVED_FAULT_MAP = [
  /* === 保留故障map结构与OUT_FAULT_MAP完全相同，只在label后追加“（保留）”以区分 =============== */
  ...OUT_FAULT_MAP.map(item => ({
    ...item,
    key: item.key.replace('OutFaultMap', 'SavedFaultMap').replace('OutFault', 'SavedFault'),
    label: item.label ? `${item.label}（保留）` : item.label
  }))
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
      label:`AFE${Math.floor(i / 2) + 1}的虚拟电池偏移位置${(i % 2) + 1}`, type:'u16'
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
    { class:'类型选择', key:'SpecialFuncEnable', label:'特殊功能使能位配置', type:'u16' },
    { class:'类型选择', key:'ClusterVoltMode',   label:'簇压模式',           type:'bits', bitsOf:'SpecialFuncEnable', bit:0, len:3, map:{0:'高压采集模式', 1:'单体电压累加模式'} },
    { class:'类型选择', key:'BmuPoleTemp', label:'动力接插件温度',       type:'bits', bitsOf:'SpecialFuncEnable', bit:3, len:1, map:{0:'不存在', 1:'存在'} },
    { class:'类型选择', key:'BMUTempDataType',   label:'BMU温度数据类型',    type:'bits', bitsOf:'SpecialFuncEnable', bit:4, len:1, map:{0:'普通模式', 1:'高精度模式'} },
    { class:'类型选择', key:'forbidEnableCluster', label:'禁止使能簇',       type:'u16', },
    /* ⑥ 预留 -------------------------------------------------------- */
    { key:'_skip1', type:'skip2' },

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
    { class:'簇额定参数', key:'clusterCalibEnergy', label:'簇校正电量',    type:'u32', scale:100, unit:'kWh' },
    { class:'簇额定参数', key:'clusterRatedEnergy', label:'簇额定电量',    type:'u32', scale:100, unit:'kWh' },
    { class:'簇额定参数', key:'clusterRatedPower',  label:'簇额定功率',     type:'u32', scale:100, unit:'kW' },
    { class:'簇额定参数', key:'clusterRatedVoltage',  label:'簇额定电压',     type:'u16', scale:10, unit:'V' },

    /* ⑯ 预留 6 B -------------------------------------------------------- */
    { key:'_skip7', type:'skip6' },

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
    0xE0:'成功', 0xE1: '失败', 0xE2: '超时', 0xE3: '繁忙', 0xE4:'参数错误', 0xE5: '当前模式不可配置', 0xE6: '最小并簇数必须小于当前使能簇'
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
  { class: '接插件温度', key: 'plugTempMinorVal', label: '动力接插件过温轻微报警值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plugTempMinorFilterMs', label: '动力接插件过温轻微报警滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plugTempMinorRecovVal', label: '动力接插件过温轻微报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plugTempMinorRecovFilterMs', label: '动力接插件过温轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plugTempGeneralVal', label: '动力接插件过温一般报警值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plugTempGeneralFilterMs', label: '动力接插件过温一般报警滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plugTempGeneralRecovVal', label: '动力接插件过温一般报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plugTempGeneralRecovFilterMs', label: '动力接插件过温一般报警恢复滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plugTempSevereVal', label: '动力接插件过温严重报警极值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plugTempSevereFilterMs', label: '动力接插件过温严重报警滤波时间', type: 'u16', unit: 'ms' },
  { class: '接插件温度', key: 'plugTempSevereRecovVal', label: '动力接插件过温严重报警恢复值', type: 's16', scale: 10, unit: '℃' },
  { class: '接插件温度', key: 'plugTempSevereRecovFilterMs', label: '动力接插件过温严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  // 插件2
  // { class: '接插件温度', key: 'plug2TempMinorVal', label: '动力接插件2过温轻微报警值', type: 's16', scale: 10, unit: '℃' },
  // { class: '接插件温度', key: 'plug2TempMinorFilterMs', label: '动力接插件2过温轻微报警滤波时间', type: 'u16', unit: 'ms' },  
  // { class: '接插件温度', key: 'plug2TempMinorRecovVal', label: '动力接插件2过温轻微报警恢复值', type: 's16', scale: 10, unit: '℃' },
  // { class: '接插件温度', key: 'plug2TempMinorRecovFilterMs', label: '动力接插件2过温轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },
  // { class: '接插件温度', key: 'plug2TempGeneralVal', label: '动力接插件2过温一般报警值', type: 's16', scale: 10, unit: '℃' },
  // { class: '接插件温度', key: 'plug2TempGeneralFilterMs', label: '动力接插件2过温一般报警滤波时间', type: 'u16', unit: 'ms' },
  // { class: '接插件温度', key: 'plug2TempGeneralRecovVal', label: '动力接插件2过温一般报警恢复值', type: 's16', scale: 10, unit: '℃' },
  // { class: '接插件温度', key: 'plug2TempGeneralRecovFilterMs', label: '动力接插件2过温一般报警恢复滤波时间', type: 'u16', unit: 'ms' },
  // { class: '接插件温度', key: 'plug2TempSevereVal', label: '动力接插件2过温严重报警值', type: 's16', scale: 10, unit: '℃' },
  // { class: '接插件温度', key: 'plug2TempSevereFilterMs', label: '动力接插件2过温严重报警滤波时间', type: 'u16', unit: 'ms' },
  // { class: '接插件温度', key: 'plug2TempSevereRecovVal', label: '动力接插件2过温严重报警恢复值', type: 's16', scale: 10, unit: '℃' },
  // { class: '接插件温度', key: 'plug2TempSevereRecovFilterMs', label: '动力接插件2过温严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

  // 预留空间
  { class: '保留', key: '_skip_pack_alarm', type: 'skip16' }
];


  // 单体报警参数表 - 完整的181个字段定义
  export const CELL_DNS_PARAM_R = [
    // ———— 单体电压上限 ————
    { class: '单体电压', key: 'cellVoltOverMinorVal',           label: '单体电压上限-轻微报警值',            type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverMinorFilterMs',      label: '单体电压上限-轻微报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltOverMinorRecovVal',      label: '单体电压上限-轻微报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverMinorRecovFilterMs', label: '单体电压上限-轻微报警恢复滤波时间',  type: 'u16', unit: 'ms' },

    { class: '单体电压', key: 'cellVoltOverGeneralVal',         label: '单体电压上限-一般报警值',             type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverGeneralFilterMs',    label: '单体电压上限-一般报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltOverGeneralRecovVal',    label: '单体电压上限-一般报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverGeneralRecovFilterMs', label: '单体电压上限-一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体电压', key: 'cellVoltOverSevereVal',          label: '单体电压上限-严重报警值',             type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverSevereFilterMs',     label: '单体电压上限-严重报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltOverSevereRecovVal',     label: '单体电压上限-严重报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltOverSevereRecovFilterMs', label: '单体电压上限-严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

    // ———— 单体电压下限 ————
    { class: '单体电压', key: 'cellVoltUnderMinorVal',           label: '单体电压下限-轻微报警值',            type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltUnderMinorFilterMs',      label: '单体电压下限-轻微报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltUnderMinorRecovVal',      label: '单体电压下限-轻微报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltUnderMinorRecovFilterMs', label: '单体电压下限-轻微报警恢复滤波时间',  type: 'u16', unit: 'ms' },

    { class: '单体电压', key: 'cellVoltUnderGeneralVal',         label: '单体电压下限-一般报警值',             type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltUnderGeneralFilterMs',    label: '单体电压下限-一般报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltUnderGeneralRecovVal',    label: '单体电压下限-一般报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltUnderGeneralRecovFilterMs', label: '单体电压下限-一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体电压', key: 'cellVoltUnderSevereVal',          label: '单体电压下限-严重报警值',             type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltUnderSevereFilterMs',     label: '单体电压下限-严重报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltUnderSevereRecovVal',     label: '单体电压下限-严重报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltUnderSevereRecovFilterMs', label: '单体电压下限-严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

    // ———— 单体电压压差 ————
    { class: '单体电压', key: 'cellVoltDiffMinorVal',           label: '单体电压压差-轻微报警值',            type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltDiffMinorFilterMs',      label: '单体电压压差-轻微报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltDiffMinorRecovVal',      label: '单体电压压差-轻微报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltDiffMinorRecovFilterMs', label: '单体电压压差-轻微报警恢复滤波时间',  type: 'u16', unit: 'ms' },

    { class: '单体电压', key: 'cellVoltDiffGeneralVal',         label: '单体电压压差-一般报警值',             type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltDiffGeneralFilterMs',    label: '单体电压压差-一般报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltDiffGeneralRecovVal',    label: '单体电压压差-一般报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltDiffGeneralRecovFilterMs', label: '单体电压压差-一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体电压', key: 'cellVoltDiffSevereVal',          label: '单体电压压差-严重报警值',             type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltDiffSevereFilterMs',     label: '单体电压压差-严重报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体电压', key: 'cellVoltDiffSevereRecovVal',     label: '单体电压压差-严重报警恢复值',        type: 's16', scale: 1, unit: 'mV' },
    { class: '单体电压', key: 'cellVoltDiffSevereRecovFilterMs', label: '单体电压压差-严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

    // ———— 充电单体温度上限 ————
    { class: '单体温度', key: 'cellChargeOverMinorVal',           label: '充电单体温度上限-轻微报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeOverMinorFilterMs',      label: '充电单体温度上限-轻微报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellChargeOverMinorRecovVal',      label: '充电单体温度上限-轻微报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeOverMinorRecovFilterMs', label: '充电单体温度上限-轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellChargeOverGeneralVal',         label: '充电单体温度上限-一般报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeOverGeneralFilterMs',    label: '充电单体温度上限-一般报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellChargeOverGeneralRecovVal',    label: '充电单体温度上限-一般报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeOverGeneralRecovFilterMs', label: '充电单体温度上限-一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellChargeOverSevereVal',          label: '充电单体温度上限-严重报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeOverSevereFilterMs',     label: '充电单体温度上限-严重报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellChargeOverSevereRecovVal',     label: '充电单体温度上限-严重报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeOverSevereRecovFilterMs', label: '充电单体温度上限-严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

    // ———— 充电单体温度下限 ————
    { class: '单体温度', key: 'cellChargeUnderMinorVal',           label: '充电单体温度下限-轻微报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeUnderMinorFilterMs',      label: '充电单体温度下限-轻微报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellChargeUnderMinorRecovVal',      label: '充电单体温度下限-轻微报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeUnderMinorRecovFilterMs', label: '充电单体温度下限-轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellChargeUnderGeneralVal',         label: '充电单体温度下限-一般报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeUnderGeneralFilterMs',    label: '充电单体温度下限-一般报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellChargeUnderGeneralRecovVal',    label: '充电单体温度下限-一般报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeUnderGeneralRecovFilterMs', label: '充电单体温度下限-一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellChargeUnderSevereVal',          label: '充电单体温度下限-严重报警值',         type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeUnderSevereFilterMs',     label: '充电单体温度下限-严重报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellChargeUnderSevereRecovVal',     label: '充电单体温度下限-严重报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellChargeUnderSevereRecovFilterMs', label: '充电单体温度下限-严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

    // ———— 放电单体温度上限 ————
    { class: '单体温度', key: 'cellDischargeOverMinorVal',           label: '放电单体温度上限-轻微报警值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeOverMinorFilterMs',      label: '放电单体温度上限-轻微报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellDischargeOverMinorRecovVal',      label: '放电单体温度上限-轻微报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeOverMinorRecovFilterMs', label: '放电单体温度上限-轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellDischargeOverGeneralVal',         label: '放电单体温度上限-一般报警值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeOverGeneralFilterMs',    label: '放电单体温度上限-一般报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellDischargeOverGeneralRecovVal',    label: '放电单体温度上限-一般报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeOverGeneralRecovFilterMs', label: '放电单体温度上限-一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellDischargeOverSevereVal',          label: '放电单体温度上限-严重报警值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeOverSevereFilterMs',     label: '放电单体温度上限-严重报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellDischargeOverSevereRecovVal',     label: '放电单体温度上限-严重报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeOverSevereRecovFilterMs', label: '放电单体温度上限-严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

    // ———— 放电单体温度下限 ————
    { class: '单体温度', key: 'cellDischargeUnderMinorVal',           label: '放电单体温度下限-轻微报警值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeUnderMinorFilterMs',      label: '放电单体温度下限-轻微报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellDischargeUnderMinorRecovVal',      label: '放电单体温度下限-轻微报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeUnderMinorRecovFilterMs', label: '放电单体温度下限-轻微报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellDischargeUnderGeneralVal',         label: '放电单体温度下限-一般报警值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeUnderGeneralFilterMs',    label: '放电单体温度下限-一般报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellDischargeUnderGeneralRecovVal',    label: '放电单体温度下限-一般报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeUnderGeneralRecovFilterMs', label: '放电单体温度下限-一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellDischargeUnderSevereVal',          label: '放电单体温度下限-严重报警值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeUnderSevereFilterMs',     label: '放电单体温度下限-严重报警滤波时间',  type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellDischargeUnderSevereRecovVal',     label: '放电单体温度下限-严重报警恢复值',     type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellDischargeUnderSevereRecovFilterMs', label: '放电单体温度下限-严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

    // ———— 单体温度温差 ————
    { class: '单体温度', key: 'cellTempDiffMinorVal',           label: '单体温度温差-轻微报警值',            type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellTempDiffMinorFilterMs',      label: '单体温度温差-轻微报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellTempDiffMinorRecovVal',      label: '单体温度温差-轻微报警恢复值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellTempDiffMinorRecovFilterMs', label: '单体温度温差-轻微报警恢复滤波时间',  type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellTempDiffGeneralVal',         label: '单体温度温差-一般报警值',             type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellTempDiffGeneralFilterMs',    label: '单体温度温差-一般报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellTempDiffGeneralRecovVal',    label: '单体温度温差-一般报警恢复值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellTempDiffGeneralRecovFilterMs', label: '单体温度温差-一般报警恢复滤波时间', type: 'u16', unit: 'ms' },

    { class: '单体温度', key: 'cellTempDiffSevereVal',          label: '单体温度温差-严重报警值',             type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellTempDiffSevereFilterMs',     label: '单体温度温差-严重报警滤波时间',       type: 'u16', unit: 'ms' },
    { class: '单体温度', key: 'cellTempDiffSevereRecovVal',     label: '单体温度温差-严重报警恢复值',        type: 's16', scale: 10, unit: '℃' },
    { class: '单体温度', key: 'cellTempDiffSevereRecovFilterMs', label: '单体温度温差-严重报警恢复滤波时间', type: 'u16', unit: 'ms' },

    // ———— 单体SOC上限 ————
    { class: '单体SOC', key: 'cellSocOverMinorVal',           label: '单体soc上限-轻微报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocOverMinorFilterMs',      label: '单体soc上限-轻微报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocOverMinorRecovVal',      label: '单体soc上限-轻微报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocOverMinorRecovFilterMs', label: '单体soc上限-轻微报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    { class: '单体SOC', key: 'cellSocOverGeneralVal',         label: '单体soc上限-一般报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocOverGeneralFilterMs',    label: '单体soc上限-一般报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocOverGeneralRecovVal',    label: '单体soc上限-一般报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocOverGeneralRecovFilterMs', label: '单体soc上限-一般报警恢复滤波时间',     type: 'u16', unit: 'ms' },

    { class: '单体SOC', key: 'cellSocOverSevereVal',          label: '单体soc上限-严重报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocOverSevereFilterMs',     label: '单体soc上限-严重报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocOverSevereRecovVal',     label: '单体soc上限-严重报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocOverSevereRecovFilterMs', label: '单体soc上限-严重报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    // ———— 单体SOC下限 ————
    { class: '单体SOC', key: 'cellSocUnderMinorVal',           label: '单体soc下限-轻微报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocUnderMinorFilterMs',      label: '单体soc下限-轻微报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocUnderMinorRecovVal',      label: '单体soc下限-轻微报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocUnderMinorRecovFilterMs', label: '单体soc下限-轻微报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    { class: '单体SOC', key: 'cellSocUnderGeneralVal',         label: '单体soc下限-一般报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocUnderGeneralFilterMs',    label: '单体soc下限-一般报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocUnderGeneralRecovVal',    label: '单体soc下限-一般报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocUnderGeneralRecovFilterMs', label: '单体soc下限-一般报警恢复滤波时间',     type: 'u16', unit: 'ms' },

    { class: '单体SOC', key: 'cellSocUnderSevereVal',          label: '单体soc下限-严重报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocUnderSevereFilterMs',     label: '单体soc下限-严重报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocUnderSevereRecovVal',     label: '单体soc下限-严重报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocUnderSevereRecovFilterMs', label: '单体soc下限-严重报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    // ———— 单体SOC差异 ————
    { class: '单体SOC', key: 'cellSocDiffMinorVal',           label: '单体soc差异-轻微报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocDiffMinorFilterMs',      label: '单体soc差异-轻微报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocDiffMinorRecovVal',      label: '单体soc差异-轻微报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocDiffMinorRecovFilterMs', label: '单体soc差异-轻微报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    { class: '单体SOC', key: 'cellSocDiffGeneralVal',         label: '单体soc差异-一般报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocDiffGeneralFilterMs',    label: '单体soc差异-一般报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocDiffGeneralRecovVal',    label: '单体soc差异-一般报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocDiffGeneralRecovFilterMs', label: '单体soc差异-一般报警恢复滤波时间',     type: 'u16', unit: 'ms' },

    { class: '单体SOC', key: 'cellSocDiffSevereVal',          label: '单体soc差异-严重报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocDiffSevereFilterMs',     label: '单体soc差异-严重报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOC', key: 'cellSocDiffSevereRecovVal',     label: '单体soc差异-严重报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOC', key: 'cellSocDiffSevereRecovFilterMs', label: '单体soc差异-严重报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    // ———— 单体SOH上限 ————
    { class: '单体SOH', key: 'cellSohOverMinorVal',           label: '单体soh上限-轻微报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohOverMinorFilterMs',      label: '单体soh上限-轻微报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohOverMinorRecovVal',      label: '单体soh上限-轻微报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohOverMinorRecovFilterMs', label: '单体soh上限-轻微报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    { class: '单体SOH', key: 'cellSohOverGeneralVal',         label: '单体soh上限-一般报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohOverGeneralFilterMs',    label: '单体soh上限-一般报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohOverGeneralRecovVal',    label: '单体soh上限-一般报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohOverGeneralRecovFilterMs', label: '单体soh上限-一般报警恢复滤波时间',     type: 'u16', unit: 'ms' },

    { class: '单体SOH', key: 'cellSohOverSevereVal',          label: '单体soh上限-严重报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohOverSevereFilterMs',     label: '单体soh上限-严重报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohOverSevereRecovVal',     label: '单体soh上限-严重报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohOverSevereRecovFilterMs', label: '单体soh上限-严重报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    // ———— 单体SOH下限 ————
    { class: '单体SOH', key: 'cellSohUnderMinorVal',           label: '单体soh下限-轻微报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohUnderMinorFilterMs',      label: '单体soh下限-轻微报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohUnderMinorRecovVal',      label: '单体soh下限-轻微报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohUnderMinorRecovFilterMs', label: '单体soh下限-轻微报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    { class: '单体SOH', key: 'cellSohUnderGeneralVal',         label: '单体soh下限-一般报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohUnderGeneralFilterMs',    label: '单体soh下限-一般报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohUnderGeneralRecovVal',    label: '单体soh下限-一般报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohUnderGeneralRecovFilterMs', label: '单体soh下限-一般报警恢复滤波时间',     type: 'u16', unit: 'ms' },

    { class: '单体SOH', key: 'cellSohUnderSevereVal',          label: '单体soh下限-严重报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohUnderSevereFilterMs',     label: '单体soh下限-严重报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohUnderSevereRecovVal',     label: '单体soh下限-严重报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohUnderSevereRecovFilterMs', label: '单体soh下限-严重报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    // ———— 单体SOH差异 ————
    { class: '单体SOH', key: 'cellSohDiffMinorVal',           label: '单体soh差异-轻微报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohDiffMinorFilterMs',      label: '单体soh差异-轻微报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohDiffMinorRecovVal',      label: '单体soh差异-轻微报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohDiffMinorRecovFilterMs', label: '单体soh差异-轻微报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    { class: '单体SOH', key: 'cellSohDiffGeneralVal',         label: '单体soh差异-一般报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohDiffGeneralFilterMs',    label: '单体soh差异-一般报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohDiffGeneralRecovVal',    label: '单体soh差异-一般报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohDiffGeneralRecovFilterMs', label: '单体soh差异-一般报警恢复滤波时间',     type: 'u16', unit: 'ms' },

    { class: '单体SOH', key: 'cellSohDiffSevereVal',          label: '单体soh差异-严重报警值',                  type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohDiffSevereFilterMs',     label: '单体soh差异-严重报警滤波时间',           type: 'u16', unit: 'ms' },
    { class: '单体SOH', key: 'cellSohDiffSevereRecovVal',     label: '单体soh差异-严重报警恢复值',             type: 's16', scale: 10, unit: '%' },
    { class: '单体SOH', key: 'cellSohDiffSevereRecovFilterMs', label: '单体soh差异-严重报警恢复滤波时间',      type: 'u16', unit: 'ms' },

    // ———— 预留空间 ————
    { class: '保留', key: '_skip_reserved', type: 'skip24' },  // 12个预留字段，每个2字节 = 24字节

    // ———— CRC16 ————
    // { class: 'CRC', key: 'crc16', label: 'CRC16', type: 'u16' }
  ];

//SOX 参数表定义
// 实时保存数据表
//协议修改新增
export const REAL_TIME_SAVE_R = [
  // ———— 第一个class：实时SOC数据 ————
  { class: '实时SOC', key: 'clusterDisplaySoc', label: '簇端显示SOC', type: 'u16', scale: 10, unit: '%' },

  // ———— BMU最大SOC*32 ————
  ...Array.from({ length: 32 }, (_, i) => ({
    class: '实时SOC',
    key: `bmuMaxSoc${i + 1}`,
    label: `BMU${i + 1}最大SOC`,
    type: 'u16',
    scale: 10,
    unit: '%'
  })),

  // ———— BMU最小SOC*32 ————
  ...Array.from({ length: 32 }, (_, i) => ({
    class: '实时SOC',
    key: `bmuMinSoc${i + 1}`,
    label: `BMU${i + 1}最小SOC`,
    type: 'u16',
    scale: 10,
    unit: '%'
  })),

  { class: '实时SOC', key: '_reserve1', label: '预留1', type: 'u16' },
  { class: '实时SOC', key: '_reserve2', label: '预留2', type: 'u16' },
  { class: '实时SOC', key: '_reserve3', label: '预留3', type: 'u16' },

  // ———— 第二个class：实时SOH数据 ————
  { class: '实时SOH', key: 'prevOnlineSoh', label: '前一次在线SOH', type: 'u16', scale: 10, unit: '%' },

  ...Array.from({ length: 10 }, (_, i) => ({
    class: '实时SOH',
    key: `historySoh${i + 1}`,
    label: `保存的历史SOH值${i + 1}`,
    type: 'u16',
    scale: 10,
    unit: '%'
  })),

  // 保存的历史工况权重值
  ...Array.from({ length: 10 }, (_, i) => ({
    class: '实时SOH',
    key: `historyConditionWeight${i + 1}`,
    label: `保存的历史工况权重值${i + 1}`,
    type: 'u16',
    scale: 1,
    unit: '%'
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    class: '实时SOH',
    key: `historyInterval${i + 1}`,
    label: `保存的历史时间间隔${i + 1}`,
    type: 'u16'
  })),

  { class: '实时SOH', key: 'prevTriggerTime', label: '前一次触发时间', type: 'u16' },
  { class: '实时SOH', key: 'cycleCount', label: '循环次数', type: 'u32' },

  { class: '实时SOH', key: 'sohCalcChargeAccTime1', label: 'SOH计算-充电累积安时', type: 's32', scale: 10, unit: 'Ah' },
  { class: '实时SOH', key: 'sohCalcDischargeAccTime1', label: 'SOH计算-放电累积安时', type: 's32', scale: 10, unit: 'Ah' },
  { class: '实时SOH', key: 'sohPowerOnInitFlag', label: 'SOH上电初始化标志位', type: 'u16' },
  { class: '实时SOH', key: 'sohCurrentUpdateCapacity', label: '存储的SOH当前更新容量', type: 'u16', scale: 10, unit: 'Ah' },
  { class: '实时SOH', key: '_reserve4', label: '预留4', type: 'u16' },
  { class: '实时SOH', key: '_reserve5', label: '预留5', type: 'u16' },
  { class: '实时SOH', key: '_reserve6', label: '预留6', type: 'u16' },

  // ———— 第三个class：实时SOE数据 ————
  { class: '实时SOE', key: 'clusterSoe', label: '簇端SOE', type: 'u16', scale: 10, unit: '%' },
  { class: '实时SOE', key: 'chargeEfficiency', label: '充电效率', type: 'u16', scale: 100, unit: '%' },
  // { class: '实时SOE', key: 'chargeEfficiency', label: '充电效率', type: 'u16', scale: 100},


  { class: '实时SOE', key: 'availableEnergy', label: '可用电量', type: 'u16', scale: 100, unit: 'kW' },
  { class: '实时SOE', key: 'totalChargeEnergy', label: '累计充电电量', type: 'u32', scale: 1, unit: 'kWh' },
  { class: '实时SOE', key: 'totalDischargeEnergy', label: '累计放电电量', type: 'u32', scale: 1, unit: 'kWh' },
  { class: '实时SOE', key: 'totalChargeCapacity', label: '累计充电容量', type: 'u32', scale: 1, unit: 'Ah' },
  { class: '实时SOE', key: 'totalDischargeCapacity', label: '累计放电容量', type: 'u32', scale: 1, unit: 'Ah' },
  { class: '实时SOE', key: '_reserve7', label: '预留7', type: 'u16' },
  { class: '实时SOE', key: '_reserve8', label: '预留8', type: 'u16' },
  { class: '实时SOE', key: '_reserve9', label: '预留9', type: 'u16' },
  { class: '实时SOE', key: '_reserve10', label: '预留10', type: 'u16' },

  { class: '实时SOE', key: 'faultProtectCount', label: '故障保护次数', type: 'u16' },
  { class: '实时SOE', key: 'voltageOverLimitCount', label: '电压过限次数', type: 'u16' },
  { class: '实时SOE', key: 'tempOverLimitCount', label: '温度过限次数', type: 'u16' },
  { class: '实时SOE', key: '_reserve11', label: '预留11', type: 'u16' },
  { class: '实时SOE', key: '_reserve12', label: '预留12', type: 'u16' },
  { class: '实时SOE', key: '_reserve13', label: '预留13', type: 'u16' }
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
//协议修改新增
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

  //协议修改新增
  { class: 'SOC算法参数', key: 'clusterUnderVoltageThreshold', label: '簇欠压阈值', type: 'u16', scale: 10, unit: 'V' },
  { class: 'SOC算法参数', key: 'clusterOverVoltageThreshold', label: '簇过压阈值', type: 'u16', scale: 10, unit: 'V' },
  { class: 'SOC算法参数', key: 'sohCycleCountDelivery', label: 'SOH循环次数下发', type: 'u16' },

  //协议修改：充电OCV表从21个改为18个，对应充电soc百分点：15%、20%、25%、30%、35%、40%、45%、50%、55%、60%、65%、70%、75%、80%、85%、90%、95%、100%
  ...Array.from({ length: 18 }, (_, i) => {
    const socPoints = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    return {
      class: 'SOC算法参数',
      key: `chargeOcvTable${i + 1}`,
      label: `充电OCV表(电压输入)${i + 1} - ${socPoints[i]}%`,
      type: 'u16',
      scale: 1,
      unit: 'mV'
    };
  }),

  //放电OCV表保持21个，对应放电soc百分点：0%、5%、10%、15%、20%、25%、30%、35%、40%、45%、50%、55%、60%、65%、70%、75%、80%、85%、90%、95%、100%
  ...Array.from({ length: 21 }, (_, i) => {
    const socPoints = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    return {
      class: 'SOC算法参数',
      key: `dischargeOcvTable${i + 1}`,
      label: `放电OCV表(电压输入)${i + 1} - ${socPoints[i]}%`,
      type: 'u16',
      scale: 1,
      unit: 'mV'
    };
  }),

  //充电修正电压拐点表（97%）*6，对应倍率：0.1C、0.25C、0.5C、0.75C、1C、1.5C
  ...Array.from({ length: 6 }, (_, i) => {
    const rates = ['10%C', '25%C', '50%C', '75%C', '100%C', '150%C'];
    return {
      class: 'SOC算法参数',
      key: `chargeCorrectVoltageKnee97${i + 1}`,
      label: `充电修正电压拐点表(97%)${i + 1} - ${rates[i]}`,
      type: 'u16',
      scale: 1,
      unit: 'mV'
    };
  }),

  //充电修正步长表*6，对应倍率：0.1C、0.25C、0.5C、0.75C、1C、1.5C
  ...Array.from({ length: 6 }, (_, i) => {
    const rates = ['10%C', '25%C', '50%C', '75%C', '100%C', '150%C'];
    return {
      class: 'SOC算法参数',
      key: `chargeCorrectStep97${i + 1}`,
      label: `充电修正步长表${i + 1} - ${rates[i]}`,
      type: 'u16',
      scale: 1,
      unit: 'mV'
    };
  }),

  //充电修正电流区间点*6，对应倍率：0.1C、0.25C、0.5C、0.75C、1C、1.5C
  ...Array.from({ length: 6 }, (_, i) => {
    const rates = ['10%C', '25%C', '50%C', '75%C', '100%C', '150%C'];
    return {
      class: 'SOC算法参数',
      key: `chargeCorrectCurrentRange${i + 1}`,
      label: `充电修正电流区间点${i + 1} - ${rates[i]}`,
      type: 's16',
      scale: 10,
      unit: 'A'
    };
  }),

  
  { class: 'SOC算法参数', key: 'catchUpTime97', label: '97%点追赶时间', type: 's16', scale: 10, unit: 's' },

  
  //充电修正电压拐点表（99%）*6，对应倍率：0.1C、0.25C、0.5C、0.75C、1C、1.5C
  ...Array.from({ length: 6 }, (_, i) => {
    const rates = ['10%C', '25%C', '50%C', '75%C', '100%C', '150%C'];
    return {
      class: 'SOC算法参数',
      key: `chargeCorrectVoltageKnee99${i + 1}`,
      label: `充电修正电压拐点表(99%)${i + 1} - ${rates[i]}`,
      type: 'u16',
      scale: 1,
      unit: 'mV'
    };
  }),

  //充电修正步长表*6，对应倍率：0.1C、0.25C、0.5C、0.75C、1C、1.5C
  ...Array.from({ length: 6 }, (_, i) => {
    const rates = ['10%C', '25%C', '50%C', '75%C', '100%C', '150%C'];
    return {
      class: 'SOC算法参数',
      key: `chargeCorrectStep99${i + 1}`,
      label: `充电修正步长表${i + 1} - ${rates[i]}`,
      type: 'u16',
      scale: 1,
      unit: 'mV'
    };
  }),


  { class: 'SOC算法参数', key: 'chargeCatchUpTime99',         label: '99%点追赶时间',               type: 'u16', scale: 10,   unit: 's' },
  { class: 'SOC算法参数', key: 'DischargeCorrectVol025C', label: '放电修正电压拐点-50%C', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOC算法参数', key: 'DischargeCorrectVol05C', label: '放电修正电压拐点-25%C', type: 'u16', scale: 1, unit: 'mV' },
  { class: 'SOC算法参数', key: 'chargeDischargeCorrectCurrent025C', label: '充放电修正电流=25%C', type: 's16', scale: 10, unit: 'A' },
  { class: 'SOC算法参数', key: 'chargeDischargeCorrectCurrent05C', label: '充放电修正电流=50%C', type: 's16', scale: 10, unit: 'A' },
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

// 出厂校正参数表 - 47个字段 (预期: 94字节 + 2字节DataLength = 96字节)
//协议修改新增
export const FACTORY_CALIB_PARAM_R = [
  // ———— 电流电压校准参数 (0-23字节) - Calibration.vue负责 ————
  { class: '电流电压校准参数', key: 'currentChargeSmallRangeK', label: '电流充电小量程校准K值', type: 's16', scale: 1000, defaultValue: 1000 },
  { class: '电流电压校准参数', key: 'currentChargeSmallRangeB', label: '电流充电小量程校准B值', type: 's16', scale: 10, defaultValue: 0 },
  { class: '电流电压校准参数', key: 'currentDischargeSmallRangeK', label: '电流放电小量程校准K值', type: 's16', scale: 1000, defaultValue: 1000 },
  { class: '电流电压校准参数', key: 'currentDischargeSmallRangeB', label: '电流放电小量程校准B值', type: 's16', scale: 10, defaultValue: 0 },
  { class: '电流电压校准参数', key: 'currentChargeLargeRangeK', label: '电流充电大量程校准K值', type: 's16', scale: 1000, defaultValue: 1000 },
  { class: '电流电压校准参数', key: 'currentChargeLargeRangeB', label: '电流充电大量程校准B值', type: 's16', scale: 10, defaultValue: 0 },
  { class: '电流电压校准参数', key: 'currentDischargeLargeRangeK', label: '电流放电大量程校准K值', type: 's16', scale: 1000, defaultValue: 1000 },
  { class: '电流电压校准参数', key: 'currentDischargeLargeRangeB', label: '电流放电大量程校准B值', type: 's16', scale: 10, defaultValue: 0 },
  { class: '电流电压校准参数', key: 'preChargeVoltageK', label: '预充电压校准K值', type: 's16', scale: 1000, defaultValue: 1000 },
  { class: '电流电压校准参数', key: 'preChargeVoltageB', label: '预充电压校准B值', type: 's16', scale: 10, defaultValue: 0 },
  { class: '电流电压校准参数', key: 'clusterVoltageK', label: '组端电压校准K值', type: 's16', scale: 1000, defaultValue: 1000 },
  { class: '电流电压校准参数', key: 'clusterVoltageB', label: '组端电压校准B值', type: 's16', scale: 10, defaultValue: 0 },

  // ———— 预留字段 (24-37字节) - Calibration.vue负责 ————
  { class: '电流电压校准参数', key: '_reserve1', label: '预留1', type: 'u16' },
  { class: '电流电压校准参数', key: '_reserve2', label: '预留2', type: 'u16' },
  { class: '电流电压校准参数', key: '_reserve3', label: '预留3', type: 'u16' },
  { class: '电流电压校准参数', key: '_reserve4', label: '预留4', type: 'u16' },
  { class: '电流电压校准参数', key: '_reserve5', label: '预留5', type: 'u16' },
  { class: '电流电压校准参数', key: '_reserve6', label: '预留6', type: 'u16' },
  { class: '电流电压校准参数', key: '_reserve7', label: '预留7', type: 'u16' },

  // ———— 设备出厂信息 (38-93字节) - BaseParam.vue负责 ————
  { class: '设备出厂信息', key: 'productionCode1', label: '生产编码1', type: 'u16' },
  { class: '设备出厂信息', key: 'productionCode2', label: '生产编码2', type: 'u16' },
  { class: '设备出厂信息', key: 'productionCode3', label: '生产编码3', type: 'u16' },
  { class: '设备出厂信息', key: 'productionCode4', label: '生产编码4', type: 'u16' },
  { class: '设备出厂信息', key: 'localId', label: '本机ID', type: 'hex16'},

  // ———— 网络配置 ————
  { class: '设备出厂信息', key: 'localIp', label: '本机IP', type: 'ipv4' },
  { class: '设备出厂信息', key: 'subnetMask', label: '子网掩码', type: 'ipv4' },
  { class: '设备出厂信息', key: 'defaultGateway', label: '默认网关', type: 'ipv4' },
  { class: '设备出厂信息', key: 'primaryDns', label: '首选DNS', type: 'ipv4' },
  { class: '设备出厂信息', key: 'alternateDns', label: '备用DNS', type: 'ipv4' },
  { class: '设备出厂信息', key: 'port', label: '端口', type: 'u16'},

  // ———— MAC地址 ————
  { class: '设备出厂信息', key: 'macAddr1', label: 'MAC地址1', type: 'u16'},
  { class: '设备出厂信息', key: 'macAddr2', label: 'MAC地址2', type: 'u16'},
  { class: '设备出厂信息', key: 'macAddr3', label: 'MAC地址3', type: 'u16'},

  // ———— 预留字段 ————
  { class: '设备出厂信息', key: '_reserve8', label: '预留8', type: 'u16', hide: true },
  { class: '设备出厂信息', key: '_reserve9', label: '预留9', type: 'u16', hide: true },
  { class: '设备出厂信息', key: '_reserve10', label: '预留10', type: 'u16', hide: true },
  { class: '设备出厂信息', key: '_reserve11', label: '预留11', type: 'u16', hide: true },
  { class: '设备出厂信息', key: '_reserve12', label: '预留12', type: 'u16', hide: true },
  { class: '设备出厂信息', key: '_reserve13', label: '预留13', type: 'u16', hide: true },
  { class: '设备出厂信息', key: '_reserve14', label: '预留14', type: 'u16', hide: true },
  { class: '设备出厂信息', key: '_reserve15', label: '预留15', type: 'u16', hide: true },
  { class: '设备出厂信息', key: '_reserve16', label: '预留16', type: 'u16', hide: true },

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
  { class: '堆基本信息', key: 'maxAllowableChargeCurrent', label: '堆最大允许充电电流', type: 'u16', scale: 10, unit: 'A' },
  { class: '堆基本信息', key: 'maxAllowableDischargeCurrent', label: '堆最大允许放电电流', type: 'u16', scale: 10, unit: 'A' },
  { class: '堆基本信息', key: 'maxAllowableChargeVoltage', label: '堆最大允许充电电压', type: 'u16', scale: 10, unit: 'V' },
  { class: '堆基本信息', key: 'maxAllowableDischargeVoltage', label: '堆最小允许放电电压', type: 'u16', scale: 10, unit: 'V' },
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
  { class: '状态信息', key: 'bauWorkingMode', label: '堆运行状态', type: 'u16', scale: 1, remarks: '0xFF:各簇状态不一致 其他(0:静置 1:充电 2:放电 3:开路 4:接触器自检)' },
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
  { class: 'BMU电压概要', key: 'bmuVoltageMaxBatteryId', label: 'BMU电压最大值包编号', type: 's16', scale: 1 },
  { class: 'BMU电压概要', key: 'bmuVoltageMin', label: 'BMU电压最小值', type: 'u16', scale: 10, unit: 'V', remarks: '默认无效值为0x7FFF' },
  { class: 'BMU电压概要', key: 'bmuVoltageMinClusterId', label: 'BMU电压最小值簇编号', type: 's16', scale: 1 },
  { class: 'BMU电压概要', key: 'bmuVoltageMinBatteryId', label: 'BMU电压最小值包编号', type: 's16', scale: 1 },
  { class: 'BMU电压概要', key: 'bmuVoltageAverage', label: 'BMU电压平均值', type: 'u16', scale: 10, unit: 'V' },
  { class: 'BMU电压概要', key: 'bmuVoltageRange', label: 'BMU电压极差值', type: 'u16', scale: 10, unit: 'V' },
  { key:'_skip3', type:'skip4' },
  // BMU电路板温度概要信息
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMax', label: 'BMU电路板温度最大值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMaxClusterId', label: 'BMU电路板温度最大值簇编号', type: 's16', scale: 1 },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMaxBatteryId', label: 'BMU电路板温度最大值包编号', type: 's16', scale: 1 },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMin', label: 'BMU电路板温度最小值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMinClusterId', label: 'BMU电路板温度最小值簇编号', type: 's16', scale: 1 },
  { class: 'BMU电路板温度概要', key: 'bmuBoardTempMinBatteryId', label: 'BMU电路板温度最小值包编号', type: 's16', scale: 1 },
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
  { class: '动力接插件温度概要', key: 'poleTempMax', label: '动力接插件温度最大值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: '动力接插件温度概要', key: 'poleTempMaxClusterId', label: '动力接插件温度最大值簇编号', type: 's16', scale: 1 },
  { class: '动力接插件温度概要', key: 'poleTempMaxBatteryId', label: '动力接插件温度最大值包编号', type: 's16', scale: 1 },
  { class: '动力接插件温度概要', key: 'poleTempMin', label: '动力接插件温度最小值', type: 's16', scale: 10, unit: '℃', remarks: '默认无效值为大于0x7FFE' },
  { class: '动力接插件温度概要', key: 'poleTempMinClusterId', label: '动力接插件温度最小值簇编号', type: 's16', scale: 1 },
  { class: '动力接插件温度概要', key: 'poleTempMinBatteryId', label: '动力接插件温度最小值包编号', type: 's16', scale: 1 },
  { class: '动力接插件温度概要', key: 'poleTempAverage', label: '动力接插件温度平均值', type: 's16', scale: 10, unit: '℃' },
  { class: '动力接插件温度概要', key: 'poleTempRange', label: '动力接插件温度极差值', type: 's16', scale: 10, unit: '℃' },
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
  { class: 'I/O心跳', key: 'I/OheartBeat', label: 'I/O控制板心跳', type: 'u16'},
  // 第5个寄存器：预留字段 (2字节，16位)
  { class: '预留', key: 'reserved1', label: '预留字段1', type: 'u16', hide: false },
  
  // 第6个寄存器：预留字段 (2字节，16位)
  // { class: '预留', key: 'reserved2', label: '预留字段2', type: 'u16', hide: false }
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
  { class: '堆模拟量故障等级4', key: 'CellSocTooHighFaultGrade', label: '单体SOC过高故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 8, len: 2 },
  { class: '堆模拟量故障等级4', key: 'CellSocTooLowFaultGrade', label: '单体SOC过低故障等级', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 10, len: 2 },
  { class: '堆模拟量故障等级4', key: 'BlockAnalogFaultGrade4Reserved', label: '预留', type: 'bits', bitsOf: 'BlockAnalogFaultGrade4', bit: 12, len: 4 },

  // 故障等级5 (2字节) - 2个故障类型，每个2位，其余预留
  { class: '堆模拟量故障等级5', key: 'BlockAnalogFaultGrade5', type: 'u16', scale: 1, hide: false },
  { class: '堆模拟量故障等级5', key: 'ClusterInterVoltageDiffFaultGrade', label: '簇间压差过大故障', type: 'bits', bitsOf: 'BlockAnalogFaultGrade5', bit: 0, len: 2 },
  { class: '堆模拟量故障等级5', key: 'ClusterInterCurrentDiffFaultGrade', label: '簇间电流差过大故障', type: 'bits', bitsOf: 'BlockAnalogFaultGrade5', bit: 2, len: 2 },
  { class: '堆模拟量故障等级5', key: 'BlockAnalogFaultGrade5Reserved', label: '预留', type: 'bits', bitsOf: 'BlockAnalogFaultGrade5', bit: 4, len: 12 },
];

// 簇通讯失联信息表 - 对应 bms/bau/d2s/bM/block_comm_lost
export const BLOCK_COMM_LOST = [
  // 寄存器1：BCU失联状态-1 (BCU1-16)
  { class: '簇通讯失联', key: 'bcuStatus1', type: 'u16', scale: 1, hide: false },
  { class: '簇通讯失联', key: 'BCU1CommLost', label: 'BCU1通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 0 },
  { class: '簇通讯失联', key: 'BCU2CommLost', label: 'BCU2通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 1 },
  { class: '簇通讯失联', key: 'BCU3CommLost', label: 'BCU3通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 2 },
  { class: '簇通讯失联', key: 'BCU4CommLost', label: 'BCU4通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 3 },
  { class: '簇通讯失联', key: 'BCU5CommLost', label: 'BCU5通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 4 },
  { class: '簇通讯失联', key: 'BCU6CommLost', label: 'BCU6通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 5 },
  { class: '簇通讯失联', key: 'BCU7CommLost', label: 'BCU7通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 6 },
  { class: '簇通讯失联', key: 'BCU8CommLost', label: 'BCU8通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 7 },
  { class: '簇通讯失联', key: 'BCU9CommLost', label: 'BCU9通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 8 },
  { class: '簇通讯失联', key: 'BCU10CommLost', label: 'BCU10通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 9 },
  { class: '簇通讯失联', key: 'BCU11CommLost', label: 'BCU11通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 10 },
  { class: '簇通讯失联', key: 'BCU12CommLost', label: 'BCU12通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 11 },
  { class: '簇通讯失联', key: 'BCU13CommLost', label: 'BCU13通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 12 },
  { class: '簇通讯失联', key: 'BCU14CommLost', label: 'BCU14通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 13 },
  { class: '簇通讯失联', key: 'BCU15CommLost', label: 'BCU15通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 14 },
  { class: '簇通讯失联', key: 'BCU16CommLost', label: 'BCU16通讯失联', type: 'bit', bitsOf: 'bcuStatus1', bit: 15 },

  // 寄存器2：BCU失联状态-2 (BCU17-20)
  { class: '簇通讯失联', key: 'bcuStatus2', type: 'u16', scale: 1, hide: false },
  { class: '簇通讯失联', key: 'BCU17CommLost', label: 'BCU17通讯失联', type: 'bit', bitsOf: 'bcuStatus2', bit: 0 },
  { class: '簇通讯失联', key: 'BCU18CommLost', label: 'BCU18通讯失联', type: 'bit', bitsOf: 'bcuStatus2', bit: 1 },
  { class: '簇通讯失联', key: 'BCU19CommLost', label: 'BCU19通讯失联', type: 'bit', bitsOf: 'bcuStatus2', bit: 2 },
  { class: '簇通讯失联', key: 'BCU20CommLost', label: 'BCU20通讯失联', type: 'bit', bitsOf: 'bcuStatus2', bit: 3 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved4', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 4 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved5', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 5 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved6', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 6 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved7', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 7 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved8', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 8 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved9', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 9 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved10', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 10 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved11', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 11 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved12', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 12 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved13', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 13 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved14', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 14 },
  { class: '簇通讯失联', key: 'bcuStatus2Reserved15', label: '预留', type: 'bit', bitsOf: 'bcuStatus2', bit: 15 }
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
    { class: '系统基本配置', key: 'RealTimeDataRecordPeriod',     label: '实时数据记录周期',           type: 'u16', scale: 1, unit: '秒' },
    // 9个预留字段 (9×2字节 = 18字节)
    { class: '系统基本配置', key: 'Reserved1',  label: '预留1', type: 'skip18'  },

    // ② 结构配置
    { class: '系统基本配置', key: 'BlockCount',                   label: '当前堆数',                   type: 'u16', scale: 1, unit: '个' },
    { class: '系统基本配置', key: 'ClusterCount1',                label: '第一堆下簇数',               type: 'u16', scale: 1, unit: '个' },
    { class: '系统基本配置', key: 'ClusterCount2',                label: '第二堆下簇数',               type: 'u16', scale: 1, unit: '个' },
    { class: '系统基本配置', key: 'ClusterCount3',                label: '第三堆下簇数',               type: 'u16', scale: 1, unit: '个' },
    { class: '系统基本配置', key: 'ClusterCount4',                label: '第四堆下簇数',               type: 'u16', scale: 1, unit: '个' },
    { class: '系统基本配置', key: 'ClusterCount5',                label: '第五堆下簇数',               type: 'u16', scale: 1, unit: '个' },
    { class: '系统基本配置', key: 'ClusterCount6',                label: '第六堆下簇数',               type: 'u16', scale: 1, unit: '个' },
    // 6个预留字段 (6×2字节 = 12字节)
    { class: '系统基本配置', key: 'Reserved2', label: '预留2', type: 'skip12' },

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

  // 系统时间记录（sys_run_time_r）
  // 数据长度：120 × u16 = 240 字节（120个寄存器）
  // 单独划分独立的掉电存储区
  // 协议格式：数据长度(2字节) + 事件记录标志位(120 * 2字节)
  export const SYS_RUN_TIME_R = [
    // 系统当前时间（7个寄存器，BCD编码：秒-分-时-周-日-月-年）
    { class: '系统时间记录', key: 'CurrentTime_Second', label: '系统当前时间-秒', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'CurrentTime_Minute', label: '系统当前时间-分', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'CurrentTime_Hour', label: '系统当前时间-时', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'CurrentTime_Week', label: '系统当前时间-周', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'CurrentTime_Day', label: '系统当前时间-日', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'CurrentTime_Month', label: '系统当前时间-月', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'CurrentTime_Year', label: '系统当前时间-年', type: 'u16', scale: 1 },
    
    // 系统启动次数（1个寄存器）
    { class: '系统时间记录', key: 'BootCount', label: '系统启动次数', type: 'u16', scale: 1 },
    
    // 第1次系统记录（21个寄存器）
    // 系统启动时间（7个寄存器，BCD编码：秒-分-时-周-日-月-年）
    { class: '系统时间记录', key: 'Boot1_StartTime_Second', label: '第1次-启动时间-秒', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StartTime_Minute', label: '第1次-启动时间-分', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StartTime_Hour', label: '第1次-启动时间-时', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StartTime_Week', label: '第1次-启动时间-周', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StartTime_Day', label: '第1次-启动时间-日', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StartTime_Month', label: '第1次-启动时间-月', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StartTime_Year', label: '第1次-启动时间-年', type: 'u16', scale: 1 },
    
    // 系统停止时间（7个寄存器，BCD编码：秒-分-时-周-日-月-年）
    { class: '系统时间记录', key: 'Boot1_StopTime_Second', label: '第1次-停止时间-秒', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StopTime_Minute', label: '第1次-停止时间-分', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StopTime_Hour', label: '第1次-停止时间-时', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StopTime_Week', label: '第1次-停止时间-周', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StopTime_Day', label: '第1次-停止时间-日', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StopTime_Month', label: '第1次-停止时间-月', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_StopTime_Year', label: '第1次-停止时间-年', type: 'u16', scale: 1 },
    
    // 系统运行时间（2个寄存器，uint32_t，单位：分钟，分辨率：1分钟）
    { class: '系统时间记录', key: 'Boot1_RunTime_Low', label: '第1次-运行时间-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_RunTime_High', label: '第1次-运行时间-高16位', type: 'u16', scale: 1 },
    
    // 周期任务堆栈大小（2个寄存器，uint32_t，单位：字节）
    { class: '系统时间记录', key: 'Boot1_PeriodicStack_Low', label: '第1次-周期任务堆栈-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_PeriodicStack_High', label: '第1次-周期任务堆栈-高16位', type: 'u16', scale: 1 },
    
    // 系统堆栈空间（2个寄存器，uint32_t，单位：字节）
    { class: '系统时间记录', key: 'Boot1_SystemStack_Low', label: '第1次-系统堆栈-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_SystemStack_High', label: '第1次-系统堆栈-高16位', type: 'u16', scale: 1 },
    
    // 系统堆栈最小空间（2个寄存器，uint32_t，单位：字节）
    { class: '系统时间记录', key: 'Boot1_SystemStackMin_Low', label: '第1次-系统堆栈最小-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot1_SystemStackMin_High', label: '第1次-系统堆栈最小-高16位', type: 'u16', scale: 1 },
    
    // 预留（10个寄存器）
    { key: '_skip_boot1', type: 'skip20' },
    
    // 第2次系统记录（21个寄存器）- 结构同第1次
    { class: '系统时间记录', key: 'Boot2_StartTime_Second', label: '第2次-启动时间-秒', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StartTime_Minute', label: '第2次-启动时间-分', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StartTime_Hour', label: '第2次-启动时间-时', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StartTime_Week', label: '第2次-启动时间-周', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StartTime_Day', label: '第2次-启动时间-日', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StartTime_Month', label: '第2次-启动时间-月', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StartTime_Year', label: '第2次-启动时间-年', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StopTime_Second', label: '第2次-停止时间-秒', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StopTime_Minute', label: '第2次-停止时间-分', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StopTime_Hour', label: '第2次-停止时间-时', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StopTime_Week', label: '第2次-停止时间-周', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StopTime_Day', label: '第2次-停止时间-日', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StopTime_Month', label: '第2次-停止时间-月', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_StopTime_Year', label: '第2次-停止时间-年', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_RunTime_Low', label: '第2次-运行时间-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_RunTime_High', label: '第2次-运行时间-高16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_PeriodicStack_Low', label: '第2次-周期任务堆栈-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_PeriodicStack_High', label: '第2次-周期任务堆栈-高16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_SystemStack_Low', label: '第2次-系统堆栈-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_SystemStack_High', label: '第2次-系统堆栈-高16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_SystemStackMin_Low', label: '第2次-系统堆栈最小-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot2_SystemStackMin_High', label: '第2次-系统堆栈最小-高16位', type: 'u16', scale: 1 },
    { key: '_skip_boot2', type: 'skip20' },
    
    // 第3次系统记录（21个寄存器）- 结构同第1次
    { class: '系统时间记录', key: 'Boot3_StartTime_Second', label: '第3次-启动时间-秒', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StartTime_Minute', label: '第3次-启动时间-分', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StartTime_Hour', label: '第3次-启动时间-时', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StartTime_Week', label: '第3次-启动时间-周', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StartTime_Day', label: '第3次-启动时间-日', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StartTime_Month', label: '第3次-启动时间-月', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StartTime_Year', label: '第3次-启动时间-年', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StopTime_Second', label: '第3次-停止时间-秒', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StopTime_Minute', label: '第3次-停止时间-分', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StopTime_Hour', label: '第3次-停止时间-时', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StopTime_Week', label: '第3次-停止时间-周', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StopTime_Day', label: '第3次-停止时间-日', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StopTime_Month', label: '第3次-停止时间-月', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_StopTime_Year', label: '第3次-停止时间-年', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_RunTime_Low', label: '第3次-运行时间-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_RunTime_High', label: '第3次-运行时间-高16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_PeriodicStack_Low', label: '第3次-周期任务堆栈-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_PeriodicStack_High', label: '第3次-周期任务堆栈-高16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_SystemStack_Low', label: '第3次-系统堆栈-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_SystemStack_High', label: '第3次-系统堆栈-高16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_SystemStackMin_Low', label: '第3次-系统堆栈最小-低16位', type: 'u16', scale: 1 },
    { class: '系统时间记录', key: 'Boot3_SystemStackMin_High', label: '第3次-系统堆栈最小-高16位', type: 'u16', scale: 1 },
    { key: '_skip_boot3', type: 'skip20' },
    
    // 预留（16个寄存器）
    { key: '_skip_reserved', type: 'skip32' }
    
    // 注意：根据协议定义，实际数据为120个u16寄存器（240字节），不包含CRC16
    // CRC16可能在协议的其他层处理，不在本数据块中
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
    label: `AFE${Math.floor(i / 2) + 1}的虚拟电池偏移位置${(i % 2) + 1}`,
    type: 'u16',
    scale: 1,
  })),

  // —— 末尾预留（占 16 寄存器 = 32 字节）——
  { class: '保留', key: '_skip', type: 'skip32' }
];


//系统通讯设备配置参数表 (19个参数)
//topic: block_comm_dev_cfg_r/w
export const BLOCK_COMM_DEV_CFG_R = [
  /* 系统通讯设备配置参数 ---------------------------------------- */
  { class: '系统通讯设备配置参数', key: 'PcsType', label: 'PCS类型', type: 'u16', scale: 1, remarks: '0-无PCS 1-双一力PCS' },
  { class: '系统通讯设备配置参数', key: 'PcsCount', label: 'PCS数量', type: 'u16', scale: 1 },
  { class: '系统通讯设备配置参数', key: 'CoolingDeviceType', label: '制冷设备类型', type: 'u16', scale: 1, remarks: '0-无制冷设备 1-三河同飞' },
  { class: '系统通讯设备配置参数', key: 'CoolingDeviceCount', label: '制冷设备数量', type: 'u16', scale: 1 },
  { class: '系统通讯设备配置参数', key: 'DehumidifierType', label: '除湿空调类型', type: 'u16', scale: 1, remarks: '0-无除湿空调 1-三河同飞' },
  { class: '系统通讯设备配置参数', key: 'DehumidifierCount', label: '除湿空调数量', type: 'u16', scale: 1 },
  { class: '系统通讯设备配置参数', key: 'IoControllerType', label: 'I/O控制板类型', type: 'u16', scale: 1, remarks: '0-无I/O控制板 1-艾莫讯' },
  { class: '系统通讯设备配置参数', key: 'IoControllerCount', label: 'I/O控制板数量', type: 'u16', scale: 1 },
  { class: '系统通讯设备配置参数', key: 'IoControllerBoardIP', label: 'I/O控制板IP基地址', type: 'ipv4', scale: 1 },
  { class: '系统通讯设备配置参数', key: 'IoControllerNetworkCard', label: 'I/O控制板网卡选择', type: 'u16', scale: 1, remarks: '0-网卡1 1-网卡2' },
  { class: '保留', key: '_skip', type: 'skip14' }
];


//系统操作配置参数表 (24个参数)
//topic: block_operate_cfg_r/w
export const BLOCK_OPERATE_CFG_R = [
  /* 系统操作配置参数 ------------------------------------------------ */
  { class: '系统操作配置参数', key: 'MinParallelClusterCount', label: '最小并簇数', type: 'u16', scale: 1, remarks: '最小并簇数 使能簇数 >= 最小并簇数 最小并簇数需大于0 （就地+全部簇开路下才可设置）' },
  { class: '系统操作配置参数', key: 'EnableClusterConfig1', label: '使能簇配置1', type: 'u16', scale: 1, clusterRange: [1, 10], remarks: 'Bit0~9配置第1~10簇(0x3FF为第1~10簇全部使能)（就地+全部簇开路下才可设置）' },
  { class: '系统操作配置参数', key: 'EnableClusterConfig2', label: '使能簇配置2', type: 'u16', scale: 1, clusterRange: [11, 20], remarks: 'Bit0~9配置第11~20簇(0x3FF为第11~20簇全部使能)（就地+全部簇开路下才可设置）' },
  { class: '系统操作配置参数', key: 'IsStackVoltageZeroWhenAllOpen', label: '全部开路时堆电压是否为0', type: 'u16', scale: 1, remarks: '0-不开启1-开启' },
  { class: '系统操作配置参数', key: 'BCPControlExists', label: '是否存在BCP控制', type: 'u16', scale: 1, remarks: '0-不存在1-存在' },
  { class: '保留', key: '_skip', type: 'skip30' }
];


// 系统堆SOC配置参数表 (49个参数)
// topic: block_soc_param_r/w
export const BLOCK_SOC_PARAM_R = [
  { class: '系统堆SOC配置参数', key: 'StackCurrentValidThreshold', label: '堆电流有效阈值', type: 'u16', scale: 10, unit: 'A' },
  { class: '系统堆SOC配置参数', key: 'BlockSOCLowerThreshold', label: 'BlockSOC取值阈值下限', type: 'u16', scale: 10, unit: '%' },
  { class: '系统堆SOC配置参数', key: 'BlockSOCUpperThreshold', label: 'BlockSOC取值阈值上限', type: 'u16', scale: 10, unit: '%' },
  { class: '系统堆SOC配置参数', key: 'DisplaySocCatchUpTime', label: '显示SOC追赶真实SOC时间', type: 'u16', scale: 10, unit: 's' },
  { class: '系统堆SOC配置参数', key: 'DisplaySocDiffRange', label: '堆显示SOC与堆真实SOC差值范围', type: 'u16', scale: 10, unit: '%' },

  // ===== 充电OCV表（1~16为具体字段，17~21为预留） =====
  { class: '系统堆SOC配置参数', key: 'ClusterUnderVoltThreshold', label: '簇欠压阈值', type: 'u16', scale: 10, unit: 'V' },
  { class: '系统堆SOC配置参数', key: 'ClusterOverVoltThreshold', label: '簇过压阈值', type: 'u16', scale: 10, unit: 'V' },
  { class: '系统堆SOC配置参数', key: 'SohCycleCountSet', label: 'SOH循环次数下发', type: 'u16', scale: 1 },
  { class: '系统堆SOC配置参数', key: 'LowPlatformLowerVolt', label: '低端平台区下限电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: '系统堆SOC配置参数', key: 'LowPlatformUpperVolt', label: '低端平台区上限电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: '系统堆SOC配置参数', key: 'HighPlatformLowerVolt', label: '高端平台区下限电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: '系统堆SOC配置参数', key: 'HighPlatformUpperVolt', label: '高端平台区上限电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: '系统堆SOC配置参数', key: 'LowPlatformBoundarySoc1', label: '低端平台边界值SOC', type: 'u16', scale: 10, unit: '%' },
  { class: '系统堆SOC配置参数', key: 'LowPlatformBoundarySoc2', label: '低端平台边界值SOC', type: 'u16', scale: 10, unit: '%' },
  { class: '系统堆SOC配置参数', key: 'HighPlatformBoundarySoc1', label: '高端平台边界值SOC', type: 'u16', scale: 10, unit: '%' },
  { class: '系统堆SOC配置参数', key: 'HighPlatformBoundarySoc2', label: '高端平台边界值SOC', type: 'u16', scale: 10, unit: '%' },
  { class: '系统堆SOC配置参数', key: 'SlopeRegionLowerVolt', label: '斜率区间下限电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: '系统堆SOC配置参数', key: 'SlopeRegionUpperVolt', label: '斜率区间上限电压', type: 'u16', scale: 1, unit: 'mV' },
  { class: '系统堆SOC配置参数', key: 'EnablePlatformCalibStrategy', label: '开启平台校准策略', type: 'u16', scale: 1, remarks: '0；不使能 1；使能' },
  { class: '系统堆SOC配置参数', key: 'ChargeAverageVoltThreshold', label: '充电平均电压阈值', type: 'u16', scale: 1, unit: 'mV' },
  { class: '系统堆SOC配置参数', key: 'DischargeAverageVoltThreshold', label: '放电平均电压阈值', type: 'u16', scale: 1, unit: 'mV' },

  // 预留(17~21)
  { class: '系统堆SOC配置参数', key: 'Reserved17', label: '预留', type: 'u16', scale: 1 },
  { class: '系统堆SOC配置参数', key: 'Reserved18', label: '预留', type: 'u16', scale: 1 },
  { class: '系统堆SOC配置参数', key: 'Reserved19', label: '预留', type: 'u16', scale: 1 },
  { class: '系统堆SOC配置参数', key: 'Reserved20', label: '预留', type: 'u16', scale: 1 },
  { class: '系统堆SOC配置参数', key: 'Reserved21', label: '预留', type: 'u16', scale: 1 },

  { class: '系统堆SOC配置参数', key: 'ValidCellSeriesCount', label: '单簇有效电芯串数', type: 'u16', scale: 1 },
  { class: '系统堆SOC配置参数', key: 'CellRatedCapacity', label: '电芯额定容量', type: 'u16', scale: 1, unit: 'Ah' },
  { class: '系统堆SOC配置参数', key: 'ClusterSocSyncSwitch', label: '簇间SOC同步开关', type: 'u16', scale: 1, remarks: '0；不使能 1；使能' },

  { class: '保留', key: '_skip', type: 'skip40' }
];



// 升级参数字段定义表 - 73个寄存器 (146字节)
export const UPGRADE_PARAM_FIELDS = [
  // 寄存器0: 升级指令 (2字节)
  { class: '升级参数', key: 'upgradeType', label: '升级指令', type: 'u16', scale: 1 },

  // 寄存器1-2: FTP服务器IP (4字节)
  { class: '升级参数', key: 'ftpServerIP', label: 'FTP服务器IP', type: 'ipv4', scale: 1 },

  // 寄存器3: FTP服务器端口 (2字节)
  { class: '升级参数', key: 'ftpPort', label: 'FTP服务器端口', type: 'u16', scale: 1 },

  // 寄存器4-19: FTP服务器账号 (32字节)
  { class: '升级参数', key: 'ftpUser', label: 'FTP服务器账号', type: 'str32', scale: 1 },

  // 寄存器20-35: FTP服务器密码 (32字节)
  { class: '升级参数', key: 'ftpPassword', label: 'FTP服务器密码', type: 'str32', scale: 1 },

  // 寄存器36-67: 升级文件名称 (64字节)
  { class: '升级参数', key: 'upgradeFile', label: '升级文件名称', type: 'str64', scale: 1 },

  // 寄存器68: BCU升级选择状态1 (2字节)
  { class: '升级参数', key: 'bcuSelection1', label: 'BCU升级选择状态1', type: 'u16', scale: 1 },

  // 寄存器69: BCU升级选择状态2 (2字节)
  { class: '升级参数', key: 'bcuSelection2', label: 'BCU升级选择状态2', type: 'u16', scale: 1 },

  // 寄存器70: BMU升级类型 (2字节)
  { class: '升级参数', key: 'bmuStyle', label: 'BMU升级类型', type: 'u16', scale: 1 },

  // 寄存器71: BMU升级起始地址 (2字节)
  { class: '升级参数', key: 'bmuStartAddress', label: 'BMU升级起始地址', type: 'u16', scale: 1 },

  // 寄存器72: BMU升级设备数量 (2字节)
  { class: '升级参数', key: 'bmuDeviceCount', label: 'BMU升级设备数量', type: 'u16', scale: 1 }
];

// BCU地址自适应参数字段定义表 - 3个寄存器 (6字节)
export const BCU_ADAPTIVE_ADDR_PARAM_FIELDS = [
  // 寄存器0: 启动标识 (2字节)
  { class: 'BCU地址自适应', key: 'startFlag', label: '启动标识', type: 'u16', scale: 1 },

  // 寄存器1: BCU起始地址 (2字节)
  { class: 'BCU地址自适应', key: 'bcuStartAddr', label: 'BCU起始地址', type: 'u16', scale: 1 },

  // 寄存器2: 总分配地址数 (2字节)
  { class: 'BCU地址自适应', key: 'totalAddrCount', label: '总分配地址数', type: 'u16', scale: 1 }
];

// BMU地址自适应参数字段定义表 - 4个寄存器 (8字节)
export const BMU_ADAPTIVE_ADDR_PARAM_FIELDS = [
  // 寄存器0: 簇序号 (2字节)
  { class: 'BMU地址自适应', key: 'clusterNumber', label: '簇序号', type: 'u16', scale: 1 },

  // 寄存器1: 启动标识 (2字节)
  { class: 'BMU地址自适应', key: 'startFlag', label: '启动标识', type: 'u16', scale: 1 },

  // 寄存器2: BMU起始地址 (2字节)
  { class: 'BMU地址自适应', key: 'bmuStartAddr', label: 'BMU起始地址', type: 'u16', scale: 1 },

  // 寄存器3: 总分配地址数 (2字节)
  { class: 'BMU地址自适应', key: 'totalAddrCount', label: '总分配地址数', type: 'u16', scale: 1 }
];

// ========== 升级结果字段映射表 ==========

/**
 * 升级设备类型映射
 */
export const UPGRADE_DEVICE_TYPE_MAP = {
  0xA001: 'BCU升级',
  0xA002: 'BMU升级'
}

/**
 * 升级文件下载完成标志映射
 */
export const DOWNLOAD_COMPLETE_FLAG_MAP = {
  0x0000: '未知',
  0x5BB5: '下载完成'
}

/**
 * 升级完成类型映射
 */
export const UPGRADE_COMPLETION_TYPE_MAP = {
  0x0000: '无效',
  0x5BB5: '升级执行中……',
  0xB0A1: '单机升级完成',
  0xB0B1: '单机升级失败',
  0xB0A2: '广播升级完成',
  0xB0B2: '广播升级失败',
  0xB0A3: '强制单机升级完成',
  0xB0B3: '强制单机升级失败',
  0xB0A4: '强制广播升级完成',
  0xB0B4: '强制广播升级失败'
}

/**
 * OTA文件下载错误码映射
 */
export const OTA_ERROR_CODE_MAP = {
  0x0000: '无故障',
  0x0001: '服务器名称无效',
  0x0002: '连接服务器失败',
  0x0003: '登录服务器失败',
  0x0004: '打开文件失败',
  0x0005: '读取文件失败',
  0x0006: '服务器端终止',
  0x0007: '文件头部CRC校验错误',
  0x0008: '文件类型不匹配',
  0x0009: '文件大小超限',
  0x000A: 'FLASH擦除失败',
  0x000B: 'FLASH编程错误',
  0x000C: 'FLASH读取错误',
  0x000D: '文件CRC32校验错误',
  0x000E: '系统状态错误',
  0x000F: '文件写入次数过多',
  // BAU特有错误码（0x0010-0x0013）
  0x0010: '本地FTP服务器不可用',
  0x0011: '本地磁盘异常',
  0x0012: '无在线簇',
  0x0013: '升级超时'
}

/**
 * BCU升级故障码映射
 * 说明：BCU升级故障码与OTA错误码保持一致（0x0000-0x000F）
 */
export const BCU_FAULT_CODE_MAP = {
  0x0000: '无故障',
  0x0001: '服务器名称无效',
  0x0002: '连接服务器失败',
  0x0003: '登录服务器失败',
  0x0004: '打开文件失败',
  0x0005: '读取文件失败',
  0x0006: '服务器端终止',
  0x0007: '文件头部CRC校验错误',
  0x0008: '文件类型不匹配',
  0x0009: '文件大小超限',
  0x000A: 'FLASH擦除失败',
  0x000B: 'FLASH编程错误',
  0x000C: 'FLASH读取错误',
  0x000D: '文件CRC32校验错误',
  0x000E: '系统状态错误',
  0x000F: '文件写入次数过多'
}

/**
 * BMU升级故障码映射
 * 说明：BMU升级故障码包含OTA错误码（0x0000）和BMU特有故障码（0x0001-0x0009）
 * 注意：BMU特有故障码的0x0001-0x0009与OTA错误码的对应映射含义不同，优先使用BMU特有故障码
 */
export const BMU_FAULT_CODE_MAP = {
  0x0000: '无故障',
  // BMU特有故障码（0x0001-0x0009）
  0x0001: 'BMU应答数量过多',
  0x0002: 'BMU应答数量过少',
  0x0003: '存在BMU应答升级失败',
  0x0004: '地址错误',
  0x0005: '请求升级帧应答超时',
  0x0006: 'pack开始帧应答超时',
  0x0007: 'pack结束帧应答超时',
  0x0008: '退出帧应答超时',
  0x0009: '完成帧应答超时',
  // OTA错误码（0x000A-0x000F）
  0x000A: 'FLASH擦除失败',
  0x000B: 'FLASH编程错误',
  0x000C: 'FLASH读取错误',
  0x000D: '文件CRC32校验错误',
  0x000E: '系统状态错误',
  0x000F: '文件写入次数过多'
}

/**
 * BAU升级故障码映射
 * 说明：BAU升级故障码包含OTA错误码（0x0000-0x000F）和BAU特有故障码（0x0010-0x0013）
 */
export const BAU_FAULT_CODE_MAP = {
  // OTA错误码（0x0000-0x000F）
  0x0000: '无故障',
  0x0001: '服务器名称无效',
  0x0002: '连接服务器失败',
  0x0003: '登录服务器失败',
  0x0004: '打开文件失败',
  0x0005: '读取文件失败',
  0x0006: '服务器端终止',
  0x0007: '文件头部CRC校验错误',
  0x0008: '文件类型不匹配',
  0x0009: '文件大小超限',
  0x000A: 'FLASH擦除失败',
  0x000B: 'FLASH编程错误',
  0x000C: 'FLASH读取错误',
  0x000D: '文件CRC32校验错误',
  0x000E: '系统状态错误',
  0x000F: '文件写入次数过多',
  // BAU特有故障码（0x0010-0x0013）
  0x0010: '本地FTP服务器不可用',
  0x0011: '本地磁盘异常',
  0x0012: '无在线簇',
  0x0013: '升级超时'
}

// ========== BCU/BMU升级结果字段定义表 ==========
// topic: get_bcu_bmu_upgrade_result (20字节，10个uint16_t字段，其中1个是uint32_t)
export const BCU_BMU_UPGRADE_RESULT_FIELDS = [
  // 字段1: 升级设备类型 (uint16_t, offset 0)
  { class: '升级控制执行结果', key: 'deviceType', label: '升级设备类型', type: 'u16', scale: 1, map: UPGRADE_DEVICE_TYPE_MAP },
  
  // 字段2: 升级文件下载完成标志 (uint16_t, offset 2)
  { class: '升级控制执行结果', key: 'downloadCompleteFlag', label: '升级文件下载完成标志', type: 'u16', scale: 1, map: DOWNLOAD_COMPLETE_FLAG_MAP },
  
  // 字段3: 升级完成类型 (uint16_t, offset 4)
  { class: '升级控制执行结果', key: 'completionType', label: '升级完成类型', type: 'u16', scale: 1, map: UPGRADE_COMPLETION_TYPE_MAP },
  
  // 字段4: OTA文件下载错误码 (uint16_t, offset 6)
  { class: '升级控制执行结果', key: 'otaErrorCode', label: 'OTA文件下载错误码', type: 'u16', scale: 1, map: OTA_ERROR_CODE_MAP },
  
  // 字段5: BCU升级故障码 (uint16_t, offset 8)
  { class: '升级控制执行结果', key: 'bcuFaultCode', label: 'BCU升级故障码', type: 'u16', scale: 1, map: BCU_FAULT_CODE_MAP },
  
  // 字段6: BMU升级故障码 (uint16_t, offset 10)
  { class: '升级控制执行结果', key: 'bmuFaultCode', label: 'BMU升级故障码', type: 'u16', scale: 1, map: BMU_FAULT_CODE_MAP },
  
  // 字段7: BMU升级失败设备标识 (uint32_t, offset 12-15)
  // 注意：这是bitmask，需要特殊处理，暂时存储原始值
  { class: '升级控制执行结果', key: 'bmuFailedDevicesRaw', label: 'BMU升级失败设备标识', type: 'u32', scale: 1 },
  
  // 字段8: BMU程序总包数 (uint16_t, offset 16)
  { class: '升级控制执行结果', key: 'totalPackets', label: 'BMU程序总包数', type: 'u16', scale: 1 },
  
  // 字段9: BMU下载当前包序号 (uint16_t, offset 18)
  { class: '升级控制执行结果', key: 'currentPacket', label: 'BMU下载当前包序号', type: 'u16', scale: 1 }
];

// ========== BAU升级结果字段定义表 ==========
// topic: get_bau_upgrade_result (6字节，3个uint16_t字段)
// 注意：第一个字段（下载完成标志）保留占位但不使用，仅用于保证解析对齐
export const BAU_UPGRADE_RESULT_FIELDS = [
  // 字段1: 升级文件下载完成标志 (uint16_t, offset 0) - 保留占位，不显示在UI
  { class: 'BAU升级控制执行结果', key: 'downloadCompleteFlag', label: '升级文件下载完成标志', type: 'u16', scale: 1, map: DOWNLOAD_COMPLETE_FLAG_MAP },
  
  // 字段2: OTA文件下载错误码 (uint16_t, offset 2)
  { class: 'BAU升级控制执行结果', key: 'otaErrorCode', label: 'OTA文件下载错误码', type: 'u16', scale: 1, map: OTA_ERROR_CODE_MAP },
  
  // 字段3: BAU升级故障码 (uint16_t, offset 4)
  { class: 'BAU升级控制执行结果', key: 'bauFaultCode', label: 'BAU升级故障码', type: 'u16', scale: 1, map: BAU_FAULT_CODE_MAP }
];

// ========== 事件记录标志位（event_record_flag_r）==========
// 数据长度：23 × u16 = 46 字节（23个寄存器）
// 协议格式：数据长度(2字节) + 事件记录标志位(23 * 2字节)
// 注意：只读，可控制数据复位；单独划分独立的掉电存储区
export const EVENT_RECORD_FLAG_R = [
  // 上一次事件记录版本号（10个寄存器，ASCII编码，20字节）
  // 注意：使用str20类型，直接读取20字节并解码为ASCII字符串
  { class: '事件记录标志位', key: 'LastVersion', label: '上一次事件记录版本号', type: 'str20' },
  
  // 事件记录存储数量（1个寄存器，uint16_t，单位：条）
  { class: '事件记录标志位', key: 'StorageCount', label: '事件记录存储数量', type: 'u16', scale: 1 },
  
  // 事件记录存储百分比（1个寄存器，uint16_t，范围：0-1000，单位：0.1%）

  { class: '事件记录标志位', key: 'StoragePercent', label: '事件记录存储百分比', type: 'u16', scale: 100 },
  
  // 写事件记录开始位置（2个寄存器，uint32_t）
  // 注意：当前项目支持直接使用u32类型，parseByTable会自动读取4字节
  { class: '事件记录标志位', key: 'WriteStartPos', label: '写事件记录开始位置', type: 'u32', scale: 1 },
  
  // 删除事件记录开始位置（2个寄存器，uint32_t）
  { class: '事件记录标志位', key: 'DeleteStartPos', label: '删除事件记录开始位置', type: 'u32', scale: 1 },
  
  // 等待删除事件记录数量（2个寄存器，uint32_t）
  { class: '事件记录标志位', key: 'PendingDeleteCount', label: '等待删除事件记录数量', type: 'u32', scale: 1 },
  
  // 预留（4个寄存器）
  { class: '事件记录标志位', key: 'Reserved_1', label: '预留-寄存器1', type: 'u16', scale: 1, hide: true },
  { class: '事件记录标志位', key: 'Reserved_2', label: '预留-寄存器2', type: 'u16', scale: 1, hide: true },
  { class: '事件记录标志位', key: 'Reserved_3', label: '预留-寄存器3', type: 'u16', scale: 1, hide: true },
  { class: '事件记录标志位', key: 'Reserved_4', label: '预留-寄存器4', type: 'u16', scale: 1, hide: true },
  
  // CRC16（1个寄存器）
  { class: '事件记录标志位', key: 'CRC16', label: 'CRC16', type: 'u16', scale: 1, hide: true }
];

// ========== 事件记录数据（event_record_r）==========
// 数据长度：128 × u16 = 256 字节（128个寄存器）
// 协议格式：数据长度(2字节) + 事件记录偏移量(2字节) + 事件记录数据(128 * 2字节) = 260字节
// 注意：根据事件触发记录结构体定义，事件记录数据包含128个寄存器，详细字段定义见文档
export const EVENT_RECORD_R = [
  // 字段0-6：事件记录时间（7个寄存器，BCD编码：年-月-日-周-时-分-秒）
  { class: '事件记录数据', key: 'Year', label: '年', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Month', label: '月', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Day', label: '日', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Week', label: '周', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Hour', label: '时', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Minute', label: '分', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Second', label: '秒', type: 'u16', scale: 1 },
  
  // 字段7：事件类型（1个寄存器）
  { class: '事件记录数据', key: 'EventType', label: '事件类型', type: 'u16', scale: 1 },
  
  // 字段8-11：事件参数1-4（4个寄存器）
  { class: '事件记录数据', key: 'Param1', label: '参数1', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Param2', label: '参数2', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Param3', label: '参数3', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'Param4', label: '参数4', type: 'u16', scale: 1 },
  
  // 字段12：远方就地场景（1个寄存器）
  { class: '事件记录数据', key: 'RemoteLocalScene', label: '远方就地场景', type: 'u16', scale: 1 },
  
  // 字段13：分簇控制模式（1个寄存器）
  { class: '事件记录数据', key: 'ClusterControlMode', label: '分簇控制模式', type: 'u16', scale: 1 },
  
  // 字段14：最小并簇数（1个寄存器）
  { class: '事件记录数据', key: 'MinClusterCount', label: '最小并簇数', type: 'u16', scale: 1 },
  
  // 字段15-16：使能簇标志1、2（2个寄存器）
  { class: '事件记录数据', key: 'EnableClusterFlag1', label: '使能簇标志1', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'EnableClusterFlag2', label: '使能簇标志2', type: 'u16', scale: 1 },
  
  // 字段17-18：退并簇标志1、2（2个寄存器）
  { class: '事件记录数据', key: 'ExitClusterFlag1', label: '退并簇标志1', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'ExitClusterFlag2', label: '退并簇标志2', type: 'u16', scale: 1 },
  
  // 字段19-20：安装簇数、在线簇数（2个寄存器）
  { class: '事件记录数据', key: 'InstalledClusterCount', label: '安装簇数', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'OnlineClusterCount', label: '在线簇数', type: 'u16', scale: 1 },
  
  // 字段21：堆运行状态（1个寄存器）
  { class: '事件记录数据', key: 'StackRunStatus', label: '堆运行状态', type: 'u16', scale: 1 },
  
  // 字段22：堆总故障（1个寄存器）
  { class: '事件记录数据', key: 'StackTotalFault', label: '堆总故障', type: 'u16', scale: 1 },
  
  // 字段23：堆允充允放状态（1个寄存器）
  { class: '事件记录数据', key: 'StackChargeDischargeStatus', label: '堆允充允放状态', type: 'u16', scale: 1 },
  
  // 字段24：簇汇总模拟量三级告警（6个寄存器，u16[6]，12字节，需要按bit解析）
  // 严重故障1（u16）
  { class: '簇汇总模拟量三级告警', key: 'ClusterAnalogAlarm_Severe1', label: '严重故障1', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总模拟量三级告警', key: 'CellVoltageDiffHigh_Severe', label: '单体压差上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 0 },
  { class: '簇汇总模拟量三级告警', key: 'CellTempDiffHigh_Severe', label: '单体温差上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 1 },
  { class: '簇汇总模拟量三级告警', key: 'CellSOCDiffHigh_Severe', label: '单体SOC差异过大告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 2 },
  { class: '簇汇总模拟量三级告警', key: 'PackVoltageDiffHigh_Severe', label: '电池包间压差过大告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 3 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterVoltageHigh_Severe', label: '簇电压上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 4 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterVoltageLow_Severe', label: '簇电压下限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 5 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterInsulationRPosLow_Severe', label: '簇绝缘电阻R+下限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 6 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterInsulationRNegLow_Severe', label: '簇绝缘电阻R-下限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 7 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterChargeCurrentHigh_Severe', label: '簇充电电流上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 8 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterDischargeCurrentHigh_Severe', label: '簇放电电流上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 9 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT1OverTemp_Severe', label: 'BCU RT1过温告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 10 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT2OverTemp_Severe', label: 'BCU RT2过温告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 11 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT3OverTemp_Severe', label: 'BCU RT3过温告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 12 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT4OverTemp_Severe', label: 'BCU RT4过温告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 13 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT5OverTemp_Severe', label: 'BCU RT5过温告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 14 },
  { class: '簇汇总模拟量三级告警', key: 'Reserved_Severe1', label: '预留-严重故障1', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe1', bit: 15 },
  
  // 严重故障2（u16）
  { class: '簇汇总模拟量三级告警', key: 'ClusterAnalogAlarm_Severe2', label: '严重故障2', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总模拟量三级告警', key: 'PackVoltageHigh_Severe', label: '电池包电压上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 0 },
  { class: '簇汇总模拟量三级告警', key: 'PackVoltageLow_Severe', label: '电池包电压下限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 1 },
  { class: '簇汇总模拟量三级告警', key: 'PackTempHigh_Severe', label: '电池包温度上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 2 },
  { class: '簇汇总模拟量三级告警', key: 'PackTempLow_Severe', label: '电池包温度下限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 3 },
  { class: '簇汇总模拟量三级告警', key: 'PackConnectorPosTempHigh_Severe', label: '电池包动力接插件正极温度上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 4 },
  { class: '簇汇总模拟量三级告警', key: 'PackConnectorNegTempHigh_Severe', label: '电池包动力接插件负极温度上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 5 },
  { class: '簇汇总模拟量三级告警', key: 'CellVoltageHigh_Severe', label: '单体电压上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 6 },
  { class: '簇汇总模拟量三级告警', key: 'CellVoltageLow_Severe', label: '单体电压下限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 7 },
  { class: '簇汇总模拟量三级告警', key: 'CellChargeTempHigh_Severe', label: '充电单体温度上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 8 },
  { class: '簇汇总模拟量三级告警', key: 'CellChargeTempLow_Severe', label: '充电单体温度下限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 9 },
  { class: '簇汇总模拟量三级告警', key: 'CellDischargeTempHigh_Severe', label: '放电单体温度上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 10 },
  { class: '簇汇总模拟量三级告警', key: 'CellDischargeTempLow_Severe', label: '放电单体温度下限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 11 },
  { class: '簇汇总模拟量三级告警', key: 'CellSOCHigh_Severe', label: '单体SOC上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 12 },
  { class: '簇汇总模拟量三级告警', key: 'CellSOCLow_Severe', label: '单体SOC下限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 13 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterVoltageDiffHigh_Severe', label: '簇间压差上限告警-严重', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 14 },
  { class: '簇汇总模拟量三级告警', key: 'Reserved_Severe2', label: '预留-严重故障2', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Severe2', bit: 15 },
  
  // 一般故障1（u16）
  { class: '簇汇总模拟量三级告警', key: 'ClusterAnalogAlarm_Moderate1', label: '一般故障1', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总模拟量三级告警', key: 'CellVoltageDiffHigh_Moderate', label: '单体压差上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 0 },
  { class: '簇汇总模拟量三级告警', key: 'CellTempDiffHigh_Moderate', label: '单体温差上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 1 },
  { class: '簇汇总模拟量三级告警', key: 'CellSOCDiffHigh_Moderate', label: '单体SOC差异过大告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 2 },
  { class: '簇汇总模拟量三级告警', key: 'PackVoltageDiffHigh_Moderate', label: '电池包间压差过大告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 3 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterVoltageHigh_Moderate', label: '簇电压上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 4 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterVoltageLow_Moderate', label: '簇电压下限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 5 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterInsulationRPosLow_Moderate', label: '簇绝缘电阻R+下限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 6 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterInsulationRNegLow_Moderate', label: '簇绝缘电阻R-下限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 7 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterChargeCurrentHigh_Moderate', label: '簇充电电流上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 8 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterDischargeCurrentHigh_Moderate', label: '簇放电电流上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 9 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT1OverTemp_Moderate', label: 'BCU RT1过温告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 10 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT2OverTemp_Moderate', label: 'BCU RT2过温告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 11 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT3OverTemp_Moderate', label: 'BCU RT3过温告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 12 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT4OverTemp_Moderate', label: 'BCU RT4过温告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 13 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT5OverTemp_Moderate', label: 'BCU RT5过温告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 14 },
  { class: '簇汇总模拟量三级告警', key: 'Reserved_Moderate1', label: '预留-一般故障1', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate1', bit: 15 },
  
  // 一般故障2（u16）
  { class: '簇汇总模拟量三级告警', key: 'ClusterAnalogAlarm_Moderate2', label: '一般故障2', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总模拟量三级告警', key: 'PackVoltageHigh_Moderate', label: '电池包电压上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 0 },
  { class: '簇汇总模拟量三级告警', key: 'PackVoltageLow_Moderate', label: '电池包电压下限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 1 },
  { class: '簇汇总模拟量三级告警', key: 'PackTempHigh_Moderate', label: '电池包温度上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 2 },
  { class: '簇汇总模拟量三级告警', key: 'PackTempLow_Moderate', label: '电池包温度下限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 3 },
  { class: '簇汇总模拟量三级告警', key: 'PackConnectorPosTempHigh_Moderate', label: '电池包动力接插件正极温度上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 4 },
  { class: '簇汇总模拟量三级告警', key: 'PackConnectorNegTempHigh_Moderate', label: '电池包动力接插件负极温度上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 5 },
  { class: '簇汇总模拟量三级告警', key: 'CellVoltageHigh_Moderate', label: '单体电压上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 6 },
  { class: '簇汇总模拟量三级告警', key: 'CellVoltageLow_Moderate', label: '单体电压下限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 7 },
  { class: '簇汇总模拟量三级告警', key: 'CellChargeTempHigh_Moderate', label: '充电单体温度上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 8 },
  { class: '簇汇总模拟量三级告警', key: 'CellChargeTempLow_Moderate', label: '充电单体温度下限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 9 },
  { class: '簇汇总模拟量三级告警', key: 'CellDischargeTempHigh_Moderate', label: '放电单体温度上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 10 },
  { class: '簇汇总模拟量三级告警', key: 'CellDischargeTempLow_Moderate', label: '放电单体温度下限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 11 },
  { class: '簇汇总模拟量三级告警', key: 'CellSOCHigh_Moderate', label: '单体SOC上限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 12 },
  { class: '簇汇总模拟量三级告警', key: 'CellSOCLow_Moderate', label: '单体SOC下限告警-一般', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 13 },
  { class: '簇汇总模拟量三级告警', key: 'Reserved_Moderate2_14', label: '预留-一般故障2-Bit14', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 14 },
  { class: '簇汇总模拟量三级告警', key: 'Reserved_Moderate2_15', label: '预留-一般故障2-Bit15', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Moderate2', bit: 15 },
  
  // 轻微故障1（u16）
  { class: '簇汇总模拟量三级告警', key: 'ClusterAnalogAlarm_Mild1', label: '轻微故障1', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总模拟量三级告警', key: 'CellVoltageDiffHigh_Mild', label: '单体压差上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 0 },
  { class: '簇汇总模拟量三级告警', key: 'CellTempDiffHigh_Mild', label: '单体温差上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 1 },
  { class: '簇汇总模拟量三级告警', key: 'CellSOCDiffHigh_Mild', label: '单体SOC差异过大告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 2 },
  { class: '簇汇总模拟量三级告警', key: 'PackVoltageDiffHigh_Mild', label: '电池包间压差过大告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 3 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterVoltageHigh_Mild', label: '簇电压上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 4 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterVoltageLow_Mild', label: '簇电压下限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 5 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterInsulationRPosLow_Mild', label: '簇绝缘电阻R+下限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 6 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterInsulationRNegLow_Mild', label: '簇绝缘电阻R-下限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 7 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterChargeCurrentHigh_Mild', label: '簇充电电流上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 8 },
  { class: '簇汇总模拟量三级告警', key: 'ClusterDischargeCurrentHigh_Mild', label: '簇放电电流上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 9 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT1OverTemp_Mild', label: 'BCU RT1过温告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 10 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT2OverTemp_Mild', label: 'BCU RT2过温告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 11 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT3OverTemp_Mild', label: 'BCU RT3过温告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 12 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT4OverTemp_Mild', label: 'BCU RT4过温告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 13 },
  { class: '簇汇总模拟量三级告警', key: 'BCU_RT5OverTemp_Mild', label: 'BCU RT5过温告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 14 },
  { class: '簇汇总模拟量三级告警', key: 'Reserved_Mild1', label: '预留-轻微故障1', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild1', bit: 15 },
  
  // 轻微故障2（u16）
  { class: '簇汇总模拟量三级告警', key: 'ClusterAnalogAlarm_Mild2', label: '轻微故障2', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总模拟量三级告警', key: 'PackVoltageHigh_Mild', label: '电池包电压上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 0 },
  { class: '簇汇总模拟量三级告警', key: 'PackVoltageLow_Mild', label: '电池包电压下限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 1 },
  { class: '簇汇总模拟量三级告警', key: 'PackTempHigh_Mild', label: '电池包温度上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 2 },
  { class: '簇汇总模拟量三级告警', key: 'PackTempLow_Mild', label: '电池包温度下限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 3 },
  { class: '簇汇总模拟量三级告警', key: 'PackConnectorPosTempHigh_Mild', label: '电池包动力接插件正极温度上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 4 },
  { class: '簇汇总模拟量三级告警', key: 'PackConnectorNegTempHigh_Mild', label: '电池包动力接插件负极温度上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 5 },
  { class: '簇汇总模拟量三级告警', key: 'CellVoltageHigh_Mild', label: '单体电压上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 6 },
  { class: '簇汇总模拟量三级告警', key: 'CellVoltageLow_Mild', label: '单体电压下限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 7 },
  { class: '簇汇总模拟量三级告警', key: 'CellChargeTempHigh_Mild', label: '充电单体温度上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 8 },
  { class: '簇汇总模拟量三级告警', key: 'CellChargeTempLow_Mild', label: '充电单体温度下限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 9 },
  { class: '簇汇总模拟量三级告警', key: 'CellDischargeTempHigh_Mild', label: '放电单体温度上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 10 },
  { class: '簇汇总模拟量三级告警', key: 'CellDischargeTempLow_Mild', label: '放电单体温度下限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 11 },
  { class: '簇汇总模拟量三级告警', key: 'CellSOCHigh_Mild', label: '单体SOC上限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 12 },
  { class: '簇汇总模拟量三级告警', key: 'CellSOCLow_Mild', label: '单体SOC下限告警-轻微', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 13 },
  { class: '簇汇总模拟量三级告警', key: 'Reserved_Mild2_14', label: '预留-轻微故障2-Bit14', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 14 },
  { class: '簇汇总模拟量三级告警', key: 'Reserved_Mild2_15', label: '预留-轻微故障2-Bit15', type: 'bit', bitsOf: 'ClusterAnalogAlarm_Mild2', bit: 15 },
  
  // 字段25：簇汇总硬件故障（6个寄存器，u16[6]，12字节，需要按bit解析）
  // 故障字1（u16）
  { class: '簇汇总硬件故障', key: 'ClusterHardwareFault_Word1', label: '故障字1', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总硬件故障', key: 'PrechargeHighSideDriveFault', label: '预充高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 0 },
  { class: '簇汇总硬件故障', key: 'MainPosHighSideDriveFault', label: '主正高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 1 },
  { class: '簇汇总硬件故障', key: 'MainPosOxidation', label: '主正氧化', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 2 },
  { class: '簇汇总硬件故障', key: 'MainPosSticking', label: '主正黏连', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 3 },
  { class: '簇汇总硬件故障', key: 'MainPosContactorFault', label: '主正接触器故障汇总', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 4 },
  { class: '簇汇总硬件故障', key: 'MainNegContactorFeedbackFault', label: '主负接触器反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 5 },
  { class: '簇汇总硬件故障', key: 'MainNegHighSideDriveFault', label: '主负高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 6 },
  { class: '簇汇总硬件故障', key: 'MainNegOxidation', label: '主负氧化', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 7 },
  { class: '簇汇总硬件故障', key: 'MainNegSticking', label: '主负黏连', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 8 },
  { class: '簇汇总硬件故障', key: 'MainNegContactorFault', label: '主负接触器故障汇总', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 9 },
  { class: '簇汇总硬件故障', key: 'PrechargeContactorFeedbackFault', label: '预充接触器反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 10 },
  { class: '簇汇总硬件故障', key: 'PrechargeHighSideDriveFault2', label: '预充高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 11 },
  { class: '簇汇总硬件故障', key: 'PrechargeOxidation', label: '预充氧化', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 12 },
  { class: '簇汇总硬件故障', key: 'PrechargeSticking', label: '预充黏连', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 13 },
  { class: '簇汇总硬件故障', key: 'PrechargeContactorFault', label: '预充接触器故障汇总', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 14 },
  { class: '簇汇总硬件故障', key: 'TotalFault', label: '汇总的故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word1', bit: 15 },
  
  // 故障字2（u16）
  { class: '簇汇总硬件故障', key: 'ClusterHardwareFault_Word2', label: '故障字2', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总硬件故障', key: 'IsolationSwitchFeedbackFault', label: '隔离开关反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 0 },
  { class: '簇汇总硬件故障', key: 'CircuitBreakerFeedbackFault', label: '断路器反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 1 },
  { class: '簇汇总硬件故障', key: 'FanFeedbackFault', label: '风扇反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 2 },
  { class: '簇汇总硬件故障', key: 'DCPowerKMFeedbackFault', label: '直流供电KM反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 3 },
  { class: '簇汇总硬件故障', key: 'DoorAccessFeedbackFault', label: '门禁反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 4 },
  { class: '簇汇总硬件故障', key: 'SPDFeedbackFault', label: 'SPD反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 5 },
  { class: '簇汇总硬件故障', key: 'ACVoltageFeedbackFault', label: '交流电压反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 6 },
  { class: '簇汇总硬件故障', key: 'SmokeDetectorFeedbackFault', label: '烟感反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 7 },
  { class: '簇汇总硬件故障', key: 'FireReleaseSignal', label: '消防释放信号', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 8 },
  { class: '簇汇总硬件故障', key: 'TempSensorFeedbackFault', label: '温感反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 9 },
  { class: '簇汇总硬件故障', key: 'VentilationSystemFeedbackFault', label: '排风系统反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 10 },
  { class: '簇汇总硬件故障', key: 'AuxCircuitBreakerFeedbackFault', label: '辅助断路器反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 11 },
  { class: '簇汇总硬件故障', key: 'HydrogenDetectorFeedbackFault', label: '氢气探测器反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 12 },
  { class: '簇汇总硬件故障', key: 'MSDFeedbackFault', label: 'MSD反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 13 },
  { class: '簇汇总硬件故障', key: 'EmergencyStopFeedbackFault', label: '急停反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 14 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word2', label: '预留1', type: 'bit', bitsOf: 'ClusterHardwareFault_Word2', bit: 15 },
  
  // 故障字3（u16）
  { class: '簇汇总硬件故障', key: 'ClusterHardwareFault_Word3', label: '故障字3', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总硬件故障', key: 'MainPosHighSideDriveFault_Word3', label: '主正高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 0 },
  { class: '簇汇总硬件故障', key: 'MainNegHighSideDriveFault_Word3', label: '主负高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 1 },
  { class: '簇汇总硬件故障', key: 'PrechargeHighSideDriveFault_Word3', label: '预充高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 2 },
  { class: '簇汇总硬件故障', key: 'RedLightHighSideDriveFault', label: '红灯高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 3 },
  { class: '簇汇总硬件故障', key: 'YellowLightHighSideDriveFault', label: '黄灯高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 4 },
  { class: '簇汇总硬件故障', key: 'GreenLightHighSideDriveFault', label: '绿灯高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 5 },
  { class: '簇汇总硬件故障', key: 'FanHighSideDriveFault', label: '风机高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 6 },
  { class: '簇汇总硬件故障', key: 'MainBreakerHighSideDriveFault', label: '主断分励高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 7 },
  { class: '簇汇总硬件故障', key: 'DCPowerKMHighSideDriveFault', label: '直流供电KM高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 8 },
  { class: '簇汇总硬件故障', key: 'PCSBlockHighSideDriveFault', label: 'pcs封波高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 9 },
  { class: '簇汇总硬件故障', key: 'AuxBreakerControlHighSideDriveFault', label: '辅助断路器控制高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 10 },
  { class: '簇汇总硬件故障', key: 'VentilationControlHighSideDriveFault', label: '排风系统控制高边驱动反馈故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 11 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word3_12', label: '预留2-Bit12', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 12 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word3_13', label: '预留2-Bit13', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 13 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word3_14', label: '预留2-Bit14', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 14 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word3_15', label: '预留2-Bit15', type: 'bit', bitsOf: 'ClusterHardwareFault_Word3', bit: 15 },
  
  // 故障字4（u16）
  { class: '簇汇总硬件故障', key: 'ClusterHardwareFault_Word4', label: '故障字4', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总硬件故障', key: 'CoolingDeviceCommFault', label: '制冷设备通信故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 0 },
  { class: '簇汇总硬件故障', key: 'PCSDeviceCommFault', label: 'PCS设备通信故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 1 },
  { class: '簇汇总硬件故障', key: 'DehumidifierCommFault', label: '除湿机通信故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 2 },
  { class: '簇汇总硬件故障', key: 'FireFightingDeviceCommFault', label: '消防设备通信故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 3 },
  { class: '簇汇总硬件故障', key: 'BMUCommFault', label: 'BMU通信故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 4 },
  { class: '簇汇总硬件故障', key: 'CANHallCommFault', label: 'CAN霍尔通信故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 5 },
  { class: '簇汇总硬件故障', key: 'BCUCommFault', label: 'BCU通信故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 6 },
  { class: '簇汇总硬件故障', key: 'DaisyChainCommFault', label: '菊花链通信故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 7 },
  { class: '簇汇总硬件故障', key: 'AFECommFault', label: 'afe通信故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 8 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word4_9', label: '预留3-Bit9', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 9 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word4_10', label: '预留3-Bit10', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 10 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word4_11', label: '预留3-Bit11', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 11 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word4_12', label: '预留3-Bit12', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 12 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word4_13', label: '预留3-Bit13', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 13 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word4_14', label: '预留3-Bit14', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 14 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word4_15', label: '预留3-Bit15', type: 'bit', bitsOf: 'ClusterHardwareFault_Word4', bit: 15 },
  
  // 故障字5（u16）
  { class: '簇汇总硬件故障', key: 'ClusterHardwareFault_Word5', label: '故障字5', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总硬件故障', key: 'BCUEnvSensorFault', label: 'bcu环境传感器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 0 },
  { class: '簇汇总硬件故障', key: 'BSensorFault', label: 'B+传感器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 1 },
  { class: '簇汇总硬件故障', key: 'BNegSensorFault', label: 'B-传感器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 2 },
  { class: '簇汇总硬件故障', key: 'PSensorFault', label: 'P+传感器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 3 },
  { class: '簇汇总硬件故障', key: 'PNegSensorFault', label: 'P-传感器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 4 },
  { class: '簇汇总硬件故障', key: 'Fuse1SensorFault', label: '熔断器1传感器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 5 },
  { class: '簇汇总硬件故障', key: 'Fuse2SensorFault', label: '熔断器2传感器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 6 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word5_7', label: '预留4-Bit7', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 7 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word5_8', label: '预留4-Bit8', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 8 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word5_9', label: '预留4-Bit9', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 9 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word5_10', label: '预留4-Bit10', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 10 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word5_11', label: '预留4-Bit11', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 11 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word5_12', label: '预留4-Bit12', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 12 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word5_13', label: '预留4-Bit13', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 13 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word5_14', label: '预留4-Bit14', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 14 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word5_15', label: '预留4-Bit15', type: 'bit', bitsOf: 'ClusterHardwareFault_Word5', bit: 15 },
  
  // 故障字6（u16）
  { class: '簇汇总硬件故障', key: 'ClusterHardwareFault_Word6', label: '故障字6', type: 'u16', scale: 1, hide: false },
  { class: '簇汇总硬件故障', key: 'HallFault', label: '霍尔故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 0 },
  { class: '簇汇总硬件故障', key: 'InvalidDataExists', label: '存在无效数据', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 1 },
  { class: '簇汇总硬件故障', key: 'FRAMFault', label: '铁电存储器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 2 },
  { class: '簇汇总硬件故障', key: 'EEPROMFault', label: 'eeprom存储器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 3 },
  { class: '簇汇总硬件故障', key: 'FlashFault', label: 'flash存储器故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 4 },
  { class: '簇汇总硬件故障', key: 'VoltageCollectionDisconnect', label: '电压采集断线', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 5 },
  { class: '簇汇总硬件故障', key: 'TemperatureCollectionDisconnect', label: '温度采集断线', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 6 },
  { class: '簇汇总硬件故障', key: 'ReservedFault', label: '保留故障', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 7 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word6_8', label: '预留5-Bit8', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 8 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word6_9', label: '预留5-Bit9', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 9 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word6_10', label: '预留5-Bit10', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 10 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word6_11', label: '预留5-Bit11', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 11 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word6_12', label: '预留5-Bit12', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 12 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word6_13', label: '预留5-Bit13', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 13 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word6_14', label: '预留5-Bit14', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 14 },
  { class: '簇汇总硬件故障', key: 'Reserved_Word6_15', label: '预留5-Bit15', type: 'bit', bitsOf: 'ClusterHardwareFault_Word6', bit: 15 },
  
  // 字段26：堆硬件故障（2个寄存器，u16[2]，4字节，需要按bit解析）
  // 故障字1（u16）
  { class: '堆硬件故障', key: 'StackHardwareFault_Word1', label: '故障字1', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'FireAlarm', label: '消防报警', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 0 },
  { class: '堆硬件故障', key: 'FireFault', label: '消防故障', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 1 },
  { class: '堆硬件故障', key: 'EmergencyStopSignal', label: '急停信号', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 2 },
  { class: '堆硬件故障', key: 'FireRelease', label: '消防释放', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 3 },
  { class: '堆硬件故障', key: 'DCSPDAlarm', label: '直流浪涌告警', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 4 },
  { class: '堆硬件故障', key: 'DoorAccessFault', label: '门禁故障', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 5 },
  { class: '堆硬件故障', key: 'ACSPDAlarm', label: '交流浪涌告警', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 6 },
  { class: '堆硬件故障', key: 'FuseFault', label: '熔断器故障', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 7 },
  { class: '堆硬件故障', key: 'Reserved_StackWord1_8', label: '预留1-Bit8', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 8 },
  { class: '堆硬件故障', key: 'Reserved_StackWord1_9', label: '预留1-Bit9', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 9 },
  { class: '堆硬件故障', key: 'Reserved_StackWord1_10', label: '预留1-Bit10', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 10 },
  { class: '堆硬件故障', key: 'Reserved_StackWord1_11', label: '预留1-Bit11', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 11 },
  { class: '堆硬件故障', key: 'Reserved_StackWord1_12', label: '预留1-Bit12', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 12 },
  { class: '堆硬件故障', key: 'Reserved_StackWord1_13', label: '预留1-Bit13', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 13 },
  { class: '堆硬件故障', key: 'Reserved_StackWord1_14', label: '预留1-Bit14', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 14 },
  { class: '堆硬件故障', key: 'Reserved_StackWord1_15', label: '预留1-Bit15', type: 'bit', bitsOf: 'StackHardwareFault_Word1', bit: 15 },
  
  // 故障字2（u16）
  { class: '堆硬件故障', key: 'StackHardwareFault_Word2', label: '故障字2', type: 'u16', scale: 1, hide: false },
  { class: '堆硬件故障', key: 'FRAMFault_Stack', label: '铁电存储器故障', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 0 },
  { class: '堆硬件故障', key: 'CoolingDeviceCommFault_Stack', label: '制冷设备通讯故障', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 1 },
  { class: '堆硬件故障', key: 'PCSCommFault_Stack', label: 'PCS通讯故障', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 2 },
  { class: '堆硬件故障', key: 'DehumidifierACCommFault', label: '除湿空调通讯故障', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 3 },
  { class: '堆硬件故障', key: 'IOControlBoardCommFault', label: 'I/O控制板通讯故障', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 4 },
  { class: '堆硬件故障', key: 'BCUCommFault_Stack', label: 'BCU通讯故障', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 5 },
  { class: '堆硬件故障', key: 'EMSCommFault', label: 'EMS通讯故障', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 6 },
  { class: '堆硬件故障', key: 'Reserved_StackWord2_7', label: '预留2-Bit7', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 7 },
  { class: '堆硬件故障', key: 'Reserved_StackWord2_8', label: '预留2-Bit8', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 8 },
  { class: '堆硬件故障', key: 'Reserved_StackWord2_9', label: '预留2-Bit9', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 9 },
  { class: '堆硬件故障', key: 'Reserved_StackWord2_10', label: '预留2-Bit10', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 10 },
  { class: '堆硬件故障', key: 'Reserved_StackWord2_11', label: '预留2-Bit11', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 11 },
  { class: '堆硬件故障', key: 'Reserved_StackWord2_12', label: '预留2-Bit12', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 12 },
  { class: '堆硬件故障', key: 'Reserved_StackWord2_13', label: '预留2-Bit13', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 13 },
  { class: '堆硬件故障', key: 'Reserved_StackWord2_14', label: '预留2-Bit14', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 14 },
  { class: '堆硬件故障', key: 'Reserved_StackWord2_15', label: '预留2-Bit15', type: 'bit', bitsOf: 'StackHardwareFault_Word2', bit: 15 },
  
  // 字段27-33：堆电压、堆电流、堆SOC、堆SOH、堆SOE、堆充电SOP、堆放电SOP（7个寄存器）
  { class: '事件记录数据', key: 'StackVoltage', label: '堆电压', type: 'u16', scale: 10, unit: 'V' },
  { class: '事件记录数据', key: 'StackCurrent', label: '堆电流', type: 's16', scale: 10, unit: 'A' },
  { class: '事件记录数据', key: 'StackSOC', label: '堆SOC', type: 'u16', scale: 10, unit: '%' },
  { class: '事件记录数据', key: 'StackSOH', label: '堆SOH', type: 'u16', scale: 10, unit: '%' },
  { class: '事件记录数据', key: 'StackSOE', label: '堆SOE', type: 'u16', scale: 10, unit: '%' },
  { class: '事件记录数据', key: 'StackChargeSOP', label: '堆充电SOP', type: 'u16', scale: 10, unit: '%' },
  { class: '事件记录数据', key: 'StackDischargeSOP', label: '堆放电SOP', type: 'u16', scale: 10, unit: '%' },
  
  // 字段34-35：绝缘电阻+、绝缘电阻-（2个寄存器）
  { class: '事件记录数据', key: 'InsulationResistancePos', label: '绝缘电阻+', type: 'u16', scale: 1, unit: 'kΩ' },
  { class: '事件记录数据', key: 'InsulationResistanceNeg', label: '绝缘电阻-', type: 'u16', scale: 1, unit: 'kΩ' },
  
  // 字段36-37：堆最大允许充电功率、堆最大放电允许功率（2个寄存器）
  { class: '事件记录数据', key: 'StackMaxChargePower', label: '堆最大允许充电功率', type: 'u16', scale: 1, unit: 'kW' },
  { class: '事件记录数据', key: 'StackMaxDischargePower', label: '堆最大放电允许功率', type: 'u16', scale: 1, unit: 'kW' },
  
  // 字段38-49：簇电压/电流/SOC的最大值和最小值（每个包含值和簇号）
  // 字段38-39：簇电压最大值、簇电压最大值簇号
  { class: '事件记录数据', key: 'ClusterVoltageMax', label: '簇电压最大值', type: 'u16', scale: 10, unit: 'V' },
  { class: '事件记录数据', key: 'ClusterVoltageMaxClusterNo', label: '簇电压最大值簇号', type: 'u8', scale: 1 },
  
  // 字段40-41：簇电压最小值、簇电压最小值簇号
  { class: '事件记录数据', key: 'ClusterVoltageMin', label: '簇电压最小值', type: 'u16', scale: 10, unit: 'V' },
  { class: '事件记录数据', key: 'ClusterVoltageMinClusterNo', label: '簇电压最小值簇号', type: 'u8', scale: 1 },
  
  // 字段42-43：簇电流最大值、簇电流最大值簇号
  { class: '事件记录数据', key: 'ClusterCurrentMax', label: '簇电流最大值', type: 's16', scale: 10, unit: 'A' },
  { class: '事件记录数据', key: 'ClusterCurrentMaxClusterNo', label: '簇电流最大值簇号', type: 'u8', scale: 1 },
  
  // 字段44-45：簇电流最小值、簇电流最小值簇号
  { class: '事件记录数据', key: 'ClusterCurrentMin', label: '簇电流最小值', type: 's16', scale: 10, unit: 'A' },
  { class: '事件记录数据', key: 'ClusterCurrentMinClusterNo', label: '簇电流最小值簇号', type: 'u8', scale: 1 },
  
  // 字段46-47：簇SOC最大值、簇SOC最大值簇号
  { class: '事件记录数据', key: 'ClusterSOCMax', label: '簇SOC最大值', type: 'u16', scale: 10, unit: '%' },
  { class: '事件记录数据', key: 'ClusterSOCMaxClusterNo', label: '簇SOC最大值簇号', type: 'u8', scale: 1 },
  
  // 字段48-49：簇SOC最小值、簇SOC最小值簇号
  { class: '事件记录数据', key: 'ClusterSOCMin', label: '簇SOC最小值', type: 'u16', scale: 10, unit: '%' },
  { class: '事件记录数据', key: 'ClusterSOCMinClusterNo', label: '簇SOC最小值簇号', type: 'u8', scale: 1 },
  
  // 字段50-61：包电压/温度的最大值和最小值（每个包含值、簇号、包号）
  // 字段50-52：包电压最大值、包电压最大值簇号、包电压最大值包号
  { class: '事件记录数据', key: 'PackVoltageMax', label: '包电压最大值', type: 'u16', scale: 10, unit: 'V' },
  { class: '事件记录数据', key: 'PackVoltageMaxClusterNo', label: '包电压最大值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'PackVoltageMaxPackNo', label: '包电压最大值包号', type: 'u8', scale: 1 },
  
  // 字段53-55：包电压最小值、包电压最小值簇号、包电压最小值包号
  { class: '事件记录数据', key: 'PackVoltageMin', label: '包电压最小值', type: 'u16', scale: 10, unit: 'V' },
  { class: '事件记录数据', key: 'PackVoltageMinClusterNo', label: '包电压最小值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'PackVoltageMinPackNo', label: '包电压最小值包号', type: 'u8', scale: 1 },
  
  // 字段56-58：包温度最大值、包温度最大值簇号、包温度最大值包号
  { class: '事件记录数据', key: 'PackTempMax', label: '包温度最大值', type: 's16', scale: 10, unit: '℃' },
  { class: '事件记录数据', key: 'PackTempMaxClusterNo', label: '包温度最大值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'PackTempMaxPackNo', label: '包温度最大值包号', type: 'u8', scale: 1 },
  
  // 字段59-61：包温度最小值、包温度最小值簇号、包温度最小值包号
  { class: '事件记录数据', key: 'PackTempMin', label: '包温度最小值', type: 's16', scale: 10, unit: '℃' },
  { class: '事件记录数据', key: 'PackTempMinClusterNo', label: '包温度最小值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'PackTempMinPackNo', label: '包温度最小值包号', type: 'u8', scale: 1 },
  
  // 字段62-67：动力接插件温度的最大值和最小值（每个包含值、簇号、包号）
  // 字段62-64：动力接插件温度最大值、动力接插件温度最大值簇号、动力接插件温度最大值包号
  { class: '事件记录数据', key: 'ConnectorTempMax', label: '动力接插件温度最大值', type: 's16', scale: 10, unit: '℃' },
  { class: '事件记录数据', key: 'ConnectorTempMaxClusterNo', label: '动力接插件温度最大值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'ConnectorTempMaxPackNo', label: '动力接插件温度最大值包号', type: 'u8', scale: 1 },
  
  // 字段65-67：动力接插件温度最小值、动力接插件温度最小值簇号、动力接插件温度最小值包号
  { class: '事件记录数据', key: 'ConnectorTempMin', label: '动力接插件温度最小值', type: 's16', scale: 10, unit: '℃' },
  { class: '事件记录数据', key: 'ConnectorTempMinClusterNo', label: '动力接插件温度最小值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'ConnectorTempMinPackNo', label: '动力接插件温度最小值包号', type: 'u8', scale: 1 },
  
  // 字段68-85：单体电压/温度/SOC的最大值和最小值（每个包含值、簇号、节号）
  // 字段68-70：单体电压最大值、单体电压最大值簇号、单体电压最大值节号
  { class: '事件记录数据', key: 'CellVoltageMax', label: '单体电压最大值', type: 'u16', scale: 1000, unit: 'V' },
  { class: '事件记录数据', key: 'CellVoltageMaxClusterNo', label: '单体电压最大值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'CellVoltageMaxCellNo', label: '单体电压最大值节号', type: 'u16', scale: 1 },
  
  // 字段71-73：单体电压最小值、单体电压最小值簇号、单体电压最小值节号
  { class: '事件记录数据', key: 'CellVoltageMin', label: '单体电压最小值', type: 'u16', scale: 1000, unit: 'V' },
  { class: '事件记录数据', key: 'CellVoltageMinClusterNo', label: '单体电压最小值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'CellVoltageMinCellNo', label: '单体电压最小值节号', type: 'u16', scale: 1 },
  
  // 字段74-76：单体温度最大值、单体温度最大值簇号、单体温度最大值节号
  { class: '事件记录数据', key: 'CellTempMax', label: '单体温度最大值', type: 's16', scale: 10, unit: '℃' },
  { class: '事件记录数据', key: 'CellTempMaxClusterNo', label: '单体温度最大值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'CellTempMaxCellNo', label: '单体温度最大值节号', type: 'u16', scale: 1 },
  
  // 字段77-79：单体温度最小值、单体温度最小值簇号、单体温度最小值节号
  { class: '事件记录数据', key: 'CellTempMin', label: '单体温度最小值', type: 's16', scale: 10, unit: '℃' },
  { class: '事件记录数据', key: 'CellTempMinClusterNo', label: '单体温度最小值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'CellTempMinCellNo', label: '单体温度最小值节号', type: 'u16', scale: 1 },
  
  // 字段80-82：单体SOC最大值、单体SOC最大值簇号、单体SOC最大值节号
  { class: '事件记录数据', key: 'CellSOCMax', label: '单体SOC最大值', type: 'u16', scale: 10, unit: '%' },
  { class: '事件记录数据', key: 'CellSOCMaxClusterNo', label: '单体SOC最大值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'CellSOCMaxCellNo', label: '单体SOC最大值节号', type: 'u16', scale: 1 },
  
  // 字段83-85：单体SOC最小值、单体SOC最小值簇号、单体SOC最小值节号
  { class: '事件记录数据', key: 'CellSOCMin', label: '单体SOC最小值', type: 'u16', scale: 10, unit: '%' },
  { class: '事件记录数据', key: 'CellSOCMinClusterNo', label: '单体SOC最小值簇号', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'CellSOCMinCellNo', label: '单体SOC最小值节号', type: 'u16', scale: 1 },
  
  // 字段86-89：OCV最大值和最小值（每个包含值和簇号）
  // 字段86-87：OCV最大值、OCV最大值簇号
  { class: '事件记录数据', key: 'OCVMax', label: 'OCV最大值', type: 'u16', scale: 1, unit: 'V' },
  { class: '事件记录数据', key: 'OCVMaxClusterNo', label: 'OCV最大值簇号', type: 'u8', scale: 1 },
  
  // 字段88-89：OCV最小值、OCV最小值簇号
  { class: '事件记录数据', key: 'OCVMin', label: 'OCV最小值', type: 'u16', scale: 1, unit: 'V' },
  { class: '事件记录数据', key: 'OCVMinClusterNo', label: 'OCV最小值簇号', type: 'u8', scale: 1 },
  
  // 字段90-92：版本号（20字节，ASCII编码）
  { class: '事件记录数据', key: 'EventRecordVersion', label: '事件记录版本号', type: 'str20' },
  { class: '事件记录数据', key: 'BootVersion', label: 'BOOT版本号', type: 'str20' },
  { class: '事件记录数据', key: 'SoftwareVersion', label: '软件版本号', type: 'str20' },
  
  // 字段93-94：算法版本号（2字节，16进制显示）
  { class: '事件记录数据', key: 'SOXAlgorithmVersion', label: 'SOX算法版本号', type: 'hex', scale: 1 },
  { class: '事件记录数据', key: 'ClusterExitMergeAlgorithmVersion', label: '退并簇算法版本号', type: 'hex', scale: 1 },
  
  // 字段95-96：系统DI/DO输入输出状态（2字节）
  { class: '事件记录数据', key: 'SystemDIInputStatus', label: '系统DI输入状态', type: 'u16', scale: 1 },
  { class: '事件记录数据', key: 'SystemDOOutputStatus', label: '系统DO输出状态', type: 'u16', scale: 1 },
  
  // 字段97-101：通讯状态（1字节，u8）
  { class: '事件记录数据', key: 'EMSCommStatus', label: 'EMS通讯状态', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'PCSCommStatus', label: 'PCS通讯状态', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'CoolingMachineCommStatus', label: '水冷机通讯状态', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'IOModuleCommStatus', label: 'I/O模块通讯状态', type: 'u8', scale: 1 },
  { class: '事件记录数据', key: 'DehumidifierCommStatus', label: '除湿机通讯状态', type: 'u8', scale: 1 },
  
  // 字段102：SD卡状态（2字节）
  { class: '事件记录数据', key: 'SDCardStatus', label: 'SD卡状态', type: 'u16', scale: 1 },
  
  // 字段103：网卡2 IP地址（1字节，u8）
  { class: '事件记录数据', key: 'NetworkCard2IPAddress', label: '网卡2 IP地址', type: 'u8', scale: 1 },
  
  // 字段104：预留（2字节）
  { class: '事件记录数据', key: 'Reserved', label: '预留', type: 'u16', scale: 1, hide: true },
  
  // 字段105：CRC16（2字节）
  { class: '事件记录数据', key: 'CRC16', label: 'CRC16', type: 'u16', scale: 1, hide: false }
];

//双一力PCS字段定义 (包含头部3个字段 + 20个数据寄存器)
export const PCS_SHUANGYILI_FIELDS = [
  // 头部字段 (前3个字段固定)
  { class: 'PCS基础信息', key: 'dataLength', label: '数据长度', type: 'u16', scale: 1, hide: true },
  { class: 'PCS基础信息', key: 'pcsAddress', label: 'PCS地址', type: 'u16', scale: 1, map: {1: '第1堆', 2: '第2堆'} },
  { class: 'PCS基础信息', key: 'commStatus', label: 'PCS通讯状态', type: 'u16', scale: 1, map: {0: '正常', 1: '通讯异常'} },
  // 数据字段 (20个数据寄存器)
  { class: 'PCS数据', key: 'totalVoltage', label: '总电压(V)', type: 'u16', scale: 10 },
  { class: 'PCS数据', key: 'totalCurrent', label: '电池组充/放电总电流(A)', type: 's16', scale: 10 },
  { class: 'PCS数据', key: 'soc', label: 'SOC(%)', type: 'u16', scale: 1 },
  { class: 'PCS数据', key: 'soh', label: 'SOH(%)', type: 'u16', scale: 1 },
  { class: 'PCS数据', key: 'soe', label: 'SOE(%)', type: 'u16', scale: 1 },
  { class: 'PCS数据', key: 'ratedVoltage', label: '额定电压(V)', type: 'u16', scale: 10 },
  { class: 'PCS数据', key: 'ratedCurrent', label: '额定电流(A)', type: 'u16', scale: 10 },
  { class: 'PCS数据', key: 'ratedCapacity', label: '额定容量(Ah)', type: 'u16', scale: 1 },
  { class: 'PCS数据', key: 'dischargeEndVoltage', label: '放电截止电压(V)', type: 'u16', scale: 10 },
  { class: 'PCS数据', key: 'chargeEndVoltage', label: '充电截止电压(V)', type: 'u16', scale: 10 },
  { class: 'PCS数据', key: 'maxDischargeCurrent', label: '最大放电电流(A)', type: 'u16', scale: 10 },
  { class: 'PCS数据', key: 'maxChargeCurrent', label: '最大充电电流(A)', type: 'u16', scale: 10 },
  { class: 'PCS数据', key: 'maxDischargepower', label: '最大允许放电功率(kW)', type: 'u16', scale: 10 },
  { class: 'PCS数据', key: 'maxChargePower', label: '最大允许充电功率(kW)', type: 'u16', scale: 10 },
  { class: 'PCS状态', key: 'totalAlarm', label: '总告警', type: 'u16', scale: 1, map: {0: '无告警', 1: '有一级或二级报警'} },
  { class: 'PCS状态', key: 'totalFault', label: '总故障', type: 'u16', scale: 1, map: {0: '正常', 1: '有三级报警'} },
  { class: 'PCS状态', key: 'hvDisconnectStatus', label: '高压断开状态', type: 'u16', scale: 1, map: {0: '闭合', 1: '断开'} },
  { class: 'PCS状态', key: 'chargeStatus', label: '充电状态', type: 'u16', scale: 1, map: {0: '允许充电', 1: '禁止充电'} },
  { class: 'PCS状态', key: 'dischargeStatus', label: '放电状态', type: 'u16', scale: 1, map: {0: '允许放电', 1: '禁止放电'} },
  { class: 'PCS状态', key: 'bmsStateMachine', label: 'BMS状态机', type: 'u16', scale: 1, map: {0: '初始化', 1: '停机', 2: '待机', 3: '充电', 4: '放电', 5: '故障'} },
  { class: 'PCS状态', key: 'bmsHeartbeat', label: 'BMS心跳', type: 'u16', scale: 1 }
]

// 后续可以添加其他PCS型号的字段定义
// export const PCS_XINXING_FIELDS = [...]
// export const PCS_KEHUA_FIELDS = [...]

//三河同飞水冷机字段定义 (包含头部3个字段 + 42个数据字段)
export const REF_SANHETONGFEI_FIELDS = [
  // 头部字段 (前3个字段固定)
  { class: '制冷设备基础信息', key: 'dataLength', label: '数据长度', type: 'u16', scale: 1, hide: true },
  { class: '制冷设备基础信息', key: 'refAddress', label: '制冷设备地址', type: 'u16', scale: 1, map: {1: '第1堆', 2: '第2堆'} },
  { class: '制冷设备基础信息', key: 'commStatus', label: '制冷设备通讯状态', type: 'u16', scale: 1, map: {0: '正常', 1: '通讯异常'} },

  // 三河同飞水冷机数据字段 (42个数据寄存器)
  { class: '运行状态', key: 'operatingStatus', label: '运行状态', type: 'u16', scale: 1, map: {0: '空闲', 1: '准备启动', 2: '运行', 3: '延时停机', 4: '故障'} },
  { class: '运行状态', key: 'relayOutputStatus', label: '继电器输出状态', type: 'bit', scale: 1, bitMap: {
    0: '供水泵',
    1: '供水泵2',
    2: '风机1',
    3: '风机2',
    4: '加热带1',
    5: '加热管',
    6: '报警输出',
    7: '补液电磁阀',
    8: '补液泵',
    9: '加热带2'
  }},
  { class: '温度监测', key: 'supplyLiquidTemp', label: '供液温度(℃)', type: 'u16', scale: 100 },
  { class: '温度监测', key: 'returnLiquidTemp', label: '回液温度(℃)', type: 'u16', scale: 10 },
  { class: '温度监测', key: 'systemEvap1InletTemp', label: '系统蒸发1进口温度(℃)', type: 'u16', scale: 10 },
  { class: '温度监测', key: 'systemEvap2InletTemp', label: '系统蒸发2进口温度(℃)', type: 'u16', scale: 10 },
  { class: '温度监测', key: 'evapOutlet1Temp', label: '蒸发出口1温度(℃)', type: 'u16', scale: 10 },
  { class: '温度监测', key: 'evapOutlet2Temp', label: '蒸发出口2温度(℃)', type: 'u16', scale: 10 },
  { class: '温度压力', key: 'condenser1TempHighPressure1', label: '冷凝温度1/高压1压力(℃/bar)', type: 'u16', scale: 10 },
  { class: '温度压力', key: 'condenser2TempHighPressure2', label: '冷凝温度2/高压2压力(℃/bar)', type: 'u16', scale: 10 },
  { class: '控制参数', key: 'throttle1ElecExpansionOpening', label: '节流1电膨当前开度(步)', type: 'u16', scale: 1 },
  { class: '控制参数', key: 'throttle2ElecExpansionOpening', label: '节流2电膨当前开度(步)', type: 'u16', scale: 1 },
  { class: '温度监测', key: 'ambientTemp', label: '环境温度(℃)', type: 'u16', scale: 10 },
  { class: '预留', key: 'reserved1', label: '备用1', type: 'u16', scale: 1 },
  { class: '预留', key: 'reserved2', label: '备用2', type: 'u16', scale: 1 },
  { class: '预留', key: 'reserved3', label: '备用3', type: 'u16', scale: 1 },
  { class: '预留', key: 'reserved4', label: '备用4', type: 'u16', scale: 1 },
  { class: '压力监测', key: 'supplyWaterPressure', label: '供水压力(bar)', type: 'u16', scale: 10 },
  { class: '压力监测', key: 'returnWaterPressure', label: '回水压力(bar)', type: 'u16', scale: 10 },
  { class: '故障状态', key: 'faultStatus1', label: '故障状态1', type: 'bit', scale: 1, bitMap: {
    2: '系统1低压',
    3: '系统2低压',
    4: '压机过载',
    5: '液位故障',
    6: '供水泵过载',
    7: '供水泵2过载',
    9: '加热管故障',
    10: '风机1过载',
    11: '风机2过载',
    12: '相序错误',
    13: '备用故障',
    14: '流量故障',
    15: '气体压差故障'
  }},
  { class: '故障状态', key: 'faultStatus2', label: '故障状态2', type: 'bit', scale: 1, bitMap: {
    0: '液温探头故障',
    1: '回液探头故障',
    2: '蒸进1探头故障',
    3: '蒸进2探头故障',
    4: '蒸出1探头故障',
    5: '蒸出2探头故障',
    6: '冷凝1探头故障',
    7: '冷凝2探头故障',
    8: '液温过高',
    10: '高压故障',
    11: '高压2故障',
    12: '高压报警锁定',
    13: '高压报警锁定',
    14: '2#冷凝温度未建立'
  }},
  { class: '故障状态', key: 'faultStatus3', label: '故障状态3', type: 'bit', scale: 1, bitMap: {
    0: '供水压力传感器故障',
    1: '补水压力传感器故障',
    2: '电导率传感器故障',
    3: '电导率过高',
    4: '主板IIC出错',
    6: '变频器1通讯故障',
    7: '变频器1其它故障',
    8: '变频器2通讯故障',
    9: '变频器2其它故障',
    12: '回水压力过低故障',
    13: '供水压力过高故障',
    14: '液温过低',
    15: '第三方通讯故障'
  }},
  { class: '故障状态', key: 'faultStatus4', label: '故障状态4', type: 'bit', scale: 1, bitMap: {
    0: '环温探头故障',
    1: '水泵变频器通讯故障',
    2: '水泵变频器其它故障',
    3: '低压1传感器故障',
    4: '低压2传感器故障',
    5: '高压1传感器故障',
    6: '高压2传感器故障',
    12: '三相电模块通讯故障',
    13: '三相电模块其它故障'
  }},
  { class: '故障状态', key: 'faultStatus5', label: '故障状态5', type: 'bit', scale: 1, bitMap: {
    0: '风机1故障',
    1: '风机2故障',
    2: '风机3故障',
    3: '风机4故障',
    4: '风机5故障',
    5: '风机6故障',
    6: '风机模块通讯故障',
    9: '泵1流量低',
    10: '泵2流量低',
    11: '流量低',
    12: '漏液报警',
    13: '排气温度探头故障',
    14: '排气温度过高',
    15: '排气温度过高锁定'
  }},
  { class: '工作模式', key: 'operatingMode', label: '工作模式', type: 'u16', scale: 1, map: {0: '通过启动/停止进行开/关机控制', 1: '待机情况下，延时自动启动机组', 2: '远程控制开关闭合时，延时自动启动机组'} },
  { class: '工作模式', key: 'coolingMode', label: '制冷方式', type: 'u16', scale: 1, map: {0: '关机模式', 1: '制冷', 2: '加热', 3: '自循环', 4: '自动'} },
  { class: '设置参数', key: 'coolingSetValue', label: '制冷设置值(℃)', type: 'u16', scale: 10 },
  { class: '设置参数', key: 'coolingControlHysteresis', label: '制冷控制回差(℃)', type: 'u16', scale: 10 },
  { class: '设置参数', key: 'heatingSetValue', label: '制热设置值(℃)', type: 'u16', scale: 10 },
  { class: '设置参数', key: 'heatingControlHysteresis', label: '制热控制回差(℃)', type: 'u16', scale: 10 },
  { class: '设置参数', key: 'tempControlTarget', label: '控温对象', type: 'u16', scale: 1, map: {0: '出液', 1: '回液'} },
  { class: '设置参数', key: 'highLiquidTempPoint', label: '液温过高点(℃)', type: 'u16', scale: 10 },
  { class: '设置参数', key: 'lowLiquidTempPoint', label: '液温过低点(℃)', type: 'u16', scale: 10 },
  { class: '设置参数', key: 'lowReturnLiquidPressurePoint', label: '回液压力过低点(bar)', type: 'u16', scale: 100 },
  { class: '设置参数', key: 'highOutletLiquidPressurePoint', label: '出液压力过高点(bar)', type: 'u16', scale: 100 },
  { class: '设置参数', key: 'remoteSignal', label: '远程信号', type: 'u16', scale: 1, map: {0: '禁用', 1: '启用'} },
  { class: '设置参数', key: 'autoRestartDelayTime', label: '自启动延时时间(s)', type: 'u16', scale: 1 },
  { class: '通讯参数', key: 'communicationAddress', label: '通信地址', type: 'u16', scale: 1 },
  { class: '通讯参数', key: 'baudRate', label: '波特率', type: 'u16', scale: 1, map: {0: '9600', 1: '4800', 2: '19200'} },
  { class: '设置参数', key: 'lowFlowPumpCutOffAlarmValue', label: '流量低切泵报警值', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'highConductivityPoint', label: '电导率过高点', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'conductivityResetHysteresis', label: '电导率复位回差', type: 'u16', scale: 1 }
]

export const DEH_SANHETONGFEI_FIELDS = [
  { class: '除湿空调基础信息', key: 'dataLength', label: '数据长度', type: 'u16', scale: 1, hide: true },
  { class: '除湿空调基础信息', key: 'dehAddress', label: '除湿空调地址', type: 'u16', scale: 1, map: {1: '第1堆', 2: '第2堆'} },
  { class: '除湿空调基础信息', key: 'commStatus', label: '除湿空调通讯状态', type: 'u16', scale: 1, map: {0: '正常', 1: '通讯异常'} },
  // 状态域
  { class: '运行状态', key: 'machineStatus', label: '整机状态', type: 'u16', map: {0: '停止', 1: '运行'} },
  { class: '运行状态', key: 'internalFan', label: '内风机', type: 'u16', map: {0: '停止', 1: '运行'} },
  { class: '运行状态', key: 'externalFan', label: '外风机', type: 'u16', map: {0: '停止', 1: '运行'} },
  { class: '运行状态', key: 'compressor', label: '压缩机', type: 'u16', map: {0: '停止', 1: '运行'} },
  { class: '运行状态', key: 'electricHeater', label: '电加热', type: 'u16', map: {0: '停止', 1: '运行'} },
  // 预留
  { class: '预留', key: 'reserved6', label: '保留', type: 'u16' },
  { class: '预留', key: 'reserved7', label: '保留', type: 'u16' },
  { class: '预留', key: 'reserved8', label: '保留', type: 'u16' },
  { class: '预留', key: 'reserved9', label: '保留', type: 'u16' },
  // 温湿度
  { class: '温度监测', key: 'defrostTemp', label: '融霜温度(℃)', type: 'u16', scale: 10 },
  { class: '预留', key: 'reserved11', label: '保留', type: 'u16' },
  { class: '温度监测', key: 'condensationTemp', label: '冷凝温度(℃)', type: 'u16', scale: 10 },
  { class: '温度监测', key: 'cabinetTemp', label: '柜内温度(℃)', type: 'u16', scale: 10 },
  { class: '湿度监测', key: 'cabinetHumidity', label: '柜内湿度(%)', type: 'u16', scale: 1 },
  { class: '温度监测', key: 'airOutletTemp', label: '出风温度(℃)', type: 'u16', scale: 10 },
  { class: '预留', key: 'reserved16', label: '保留', type: 'u16' },
  { class: '预留', key: 'reserved17', label: '保留', type: 'u16' },
  { class: '预留', key: 'reserved18', label: '保留', type: 'u16' },
  // 告警/故障
  { class: '故障状态', key: 'highTempAlarm', label: '高温告警', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '故障状态', key: 'lowTempAlarm', label: '低温告警', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '故障状态', key: 'highHumidityAlarm', label: '高湿告警', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '故障状态', key: 'lowHumidityAlarm', label: '低湿告警', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '故障状态', key: 'coilAntiFreeze', label: '盘管防冻', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '预留', key: 'reserved24', label: '保留', type: 'u16' },
  { class: '故障状态', key: 'defrostProbeFault', label: '容霜探头故障', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '预留', key: 'reserved26', label: '保留', type: 'u16' },
  { class: '故障状态', key: 'condensationProbeFault', label: '冷凝探头故障', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '故障状态', key: 'cabinetTempProbeFault', label: '柜内温度探头故障', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '故障状态', key: 'airOutletHumidityProbeFault', label: '出风湿度探头故障', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '故障状态', key: 'humidityProbeFault', label: '湿度探头故障', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '故障状态', key: 'internalFanFault', label: '内风机故障', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '预留', key: 'reserved32', label: '保留', type: 'u16' },
  { class: '故障状态', key: 'compressorFault', label: '压缩机故障', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '预留', key: 'reserved34', label: '保留', type: 'u16' },
  { class: '预留', key: 'reserved35', label: '保留', type: 'u16' },
  { class: '故障状态', key: 'highPressureAlarm', label: '高压告警', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '故障状态', key: 'lowPressureAlarm', label: '低压告警', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '预留', key: 'reserved38', label: '保留', type: 'u16' },
  { class: '故障状态', key: 'phaseSequenceAlarm', label: '相序报警', type: 'u16', map: {0: '正常', 1: '报警'} },
  { class: '预留', key: 'reserved40', label: '保留', type: 'u16' },
  // 设定点
  { class: '设置参数', key: 'refrigerationPoint', label: '制冷点(℃)', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'refrigerationHysteresis', label: '制冷回差(℃)', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'heatingPoint', label: '加热点(℃)', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'heatingHysteresis', label: '加热回差(℃)', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'dehumidificationPoint', label: '除湿点(%)', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'dehumidificationHysteresis', label: '除湿回差(%)', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'cabinetTempOverheatPoint', label: '柜内温度过高点(℃)', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'cabinetTempUnderheatPoint', label: '柜内温度过低点(℃)', type: 'u16', scale: 1 },
  { class: '设置参数', key: 'cabinetHumidityOverheatPoint', label: '柜内湿度过高点(%)', type: 'u16', scale: 1 },
  { class: '预留', key: 'reserved50', label: '保留', type: 'u16' },
  { class: '控制', key: 'monitoringSwitch', label: '监控开关机', type: 'u16', map: {0: '关机', 1: '开机'} },
  { class: '控制', key: 'forcedMode', label: '强制模式', type: 'u16', map: {0:'自动',1:'强制制冷',2:'强制制热',3:'强制送风',4:'强制待机'} }
]

// 后续可以添加其他制冷设备型号的字段定义
// export const REF_ENVICOOL_FIELDS = [...]
// export const REF_ESSENT_FIELDS = [...]
