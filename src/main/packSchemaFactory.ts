//BCU\src\protocol\packSchemaFactory.ts
//因为pack数据添加BMU数量且实际数据会根据BMU数量变化，所以改用当前文件来生成动态表
/* -------- schema 单字段统一类型 ---------- */
export interface PackField {
  class : string
  key   : string
  label? : string
  
  type  : string
  scale?: number          // 可选

  hide?  : boolean        // 跟 table.js 保持一致
  bitsOf?: string         // "这个 bit/位段 属于谁"
  bit?   : number         // 单 bit 的位置
  len?   : number         // 多 bit 位段长度
  map?   : Record<number,string>  // 可选映射
  meta?: {
  bmu        : number
  cellInBmu  : number
  }
  valid?: boolean;   // 新增：标记字段是否有效  
  
  
}

// 定义可用的 fault 类型
type FaultKey = keyof typeof FAULT_LEVEL3_types

// 定义表头 header 类型
interface Header {
  bmuTotal: number
  afePerBmu: number
  afeCellCounts: number[]
  afeTempCounts: number[]
  
}

//故障程度对应表
const ALARM_MAP = { 0:'无故障', 1:'严重报警', 2:'一般报警', 3:'轻微报警' }

//40字节表头
export const CELL_HEADER = [
  { class:'表头', key:'dataLen',  label:'数据长度',   type:'u16' },
  { class:'表头', key:'totalCell',  label:'电芯总数量',   type:'u16' },
  { class:'表头', key:'totalTemp',  label:'温感总数量',   type:'u16' },
  { class:'表头', key:'bmuTotal',   label:'BMU总数量',   type:'u8'  },
  { class:'表头', key:'afePerBmu',  label:'BMU下AFE数',  type:'u8'  },

  /* 16 × AFE-Cell 计数 */
  ...Array.from({ length:16 }, (_, i)=>({
    class:'表头',
    key  :`afeCell${i+1}`,
    label:`AFE${i+1} 电芯数`,
    type :'u8'
  })),

  /* 16 × AFE-Temp 计数 */
  ...Array.from({ length:16 }, (_, i)=>({
    class:'表头',
    key  :`afeTemp${i+1}`,
    label:`AFE${i+1} 温度数`,
    type :'u8'
  }))
]

/* -------- 根据 bmuTotal 生成 PACK-SUMMARY schema ---------- */
// export function PACK_SUMMARY (bmuTotal: number): PackField[] {
//   /* 最多 32，保险起见截断 */
//   const n = Math.min(Math.max(bmuTotal, 0), 32)

//   const schema: PackField[] = []

//   /* 1 ―― n × 单向菊花链断连位置 ------------------------------------ */
//   for (let i = 1; i <= 32; i++) {
//     const valid = i <= n;
//     schema.push({
//       class : '单项菊花链断连位置信息',
//       key   : `Bmu${i}ChokePos`,
//       label : `BMU${i} 断连位置`,
//       type  : 'u16',
//       valid: true,
//       hide: false
//     })
//   }

//   /* 故障统计 -------------------------------------------------------- */
//   schema.push(
//     { class:'pack端故障', key:'BmuLostNum',      label:'BMU失联数量',     type:'u16' },
//     { class:'pack端故障', key:'AfeLostNum',      label:'AFE失联数量',     type:'u16' },
//     { class:'pack端故障', key:'CellVoltLostNum', label:'电芯电压断线数量', type:'u16' },
//     { class:'pack端故障', key:'CellTempLostNum', label:'电芯温度断线数量', type:'u16' }
//   )

//   /* n × BMU 电压 ---------------------------------------------------- */
//   for (let i = 1; i <= 32; i++) {
//     const valid = i <= n;
//     schema.push({
//       class : 'BMU电压',
//       key   : `Bmu${i}Volt`,
//       label : `BMU${i} 电压(V)`,
//       type  : 'u16',
//       scale : 10,   // 0.1 V
//       valid: true,
//       hide: false
//     })
//   }

//   /* n × BMU 板温 ---------------------------------------------------- */
//   for (let i = 1; i <= 32; i++) {
//     const valid = i <= n;
//     schema.push({
//       class : 'BMU电路板温度',
//       key   : `Bmu${i}BoardTemp`,
//       label : `BMU${i} 板温(℃)`,
//       type  : 's16',
//       scale : 10,   // 0.1 ℃
//       valid: true,
//       hide: false
//     })
//   }

//   /* 2 × n × 动力接插件温度 ------------------------------------------ */
//   for (let i = 1; i <= 32; i++) {
//     const valid = i <= n;
//     schema.push(
//       {
//         class : '动力接插件温度1',
//         key   : `Bmu${i}Plug1Temp`,
//         label : `BMU${i} 插件1温度(℃)`,
//         type  : 's16',
//         scale : 10,
//         valid: true,
//         hide: false
//       },
//       {
//         class : '动力接插件温度2',
//         key   : `Bmu${i}Plug2Temp`,
//         label : `BMU${i} 插件2温度(℃)`,
//         type  : 's16',
//         scale : 10,
//         valid: true,
//         hide: false
//       }
//     )
//   }

//   /* 版本号：软件 + BOOT --------------------------------------------- */
//   for (let i = 1; i <= 32; i++) {
//     const valid = i <= n;
//     schema.push(
//       {
//         class : 'BMU版本信息',
//         key   : `Bmu${i}SwVer`,
//         label : `BMU${i} 软件版本`,
//         type  : 'u16',
//         valid: true,
//         hide: false
//       },
//       {
//         class : 'BMU版本信息',
//         key   : `Bmu${i}BootVer`,
//         label : `BMU${i} BOOT版本`,
//         type  : 'u16',
//         valid: true,
//         hide: false
//       }
//     )
//   }

//   return schema
// }

// 旧版本：根据实际BMU数量动态生成字段（已废弃，保留备用）
// export function PACK_SUMMARY (bmuTotal: number): PackField[] {
//   /* 最多 32，保险起见截断 */
//   const n = Math.min(Math.max(bmuTotal, 0), 32)

//   const schema: PackField[] = []

//   /* 1 ―― n × 单向菊花链断连位置 ------------------------------------ */
//   for (let i = 1; i <= n; i++) {
//     schema.push({
//       class : '单项菊花链断连位置信息',
//       key   : `Bmu${i}ChokePos`,
//       label : `BMU${i} 断连位置`,
//       type  : 'u16',
//     })
//   }

//   /* 故障统计 -------------------------------------------------------- */
//   schema.push(
//     { class:'失联信息', key:'BmuLostNum',      label:'BMU失联数量',     type:'u16' },
//     { class:'失联信息', key:'AfeLostNum',      label:'AFE失联数量',     type:'u16' },
//     { class:'失联信息', key:'CellVoltLostNum', label:'电芯电压断线数量', type:'u16' },
//     { class:'失联信息', key:'CellTempLostNum', label:'电芯温度断线数量', type:'u16' }
//   )

//   /* n × BMU 电压 ---------------------------------------------------- */
//   for (let i = 1; i <= n; i++) {
//     schema.push({
//       class : 'BMU电压',
//       key   : `Bmu${i}Volt`,
//       label : `BMU${i} 电压(V)`,
//       type  : 'u16',
//       scale : 10,   // 0.1 V
//     })
//   }

//   /* n × BMU 板温 ---------------------------------------------------- */
//   for (let i = 1; i <= n; i++) {
//     schema.push({
//       class : 'BMU电路板温度',
//       key   : `Bmu${i}BoardTemp`,
//       label : `BMU${i} 板温(℃)`,
//       type  : 's16',
//       scale : 10,   // 0.1 ℃
//     })
//   }

//   /* 2 × n × 动力接插件温度 ------------------------------------------ */
//   for (let i = 1; i <= n; i++) {
//     schema.push(
//       {
//         class : '动力接插件温度1',
//         key   : `Bmu${i}Plug1Temp`,
//         label : `BMU${i} 插件1温度(℃)`,
//         type  : 's16',
//         scale : 10,
//       },
//       {
//         class : '动力接插件温度2',
//         key   : `Bmu${i}Plug2Temp`,
//         label : `BMU${i} 插件2温度(℃)`,
//         type  : 's16',
//         scale : 10,

//       }
//     )
//   }

//   /* 版本号：软件 + BOOT --------------------------------------------- */
//   for (let i = 1; i <= n; i++) {
//     schema.push(
//       {
//         class : 'BMU版本信息',
//         key   : `Bmu${i}SwVer`,
//         label : `BMU${i} 软件版本`,
//         type  : 'hex',
//       },
//       {
//         class : 'BMU版本信息',
//         key   : `Bmu${i}BootVer`,
//         label : `BMU${i} BOOT版本`,
//         type  : 'str2',
//       }
//     )
//   }

//   return schema
// }

// 新版本：固定生成32个BMU的完整数据，通过valid标记区分有效数据
export function PACK_SUMMARY (bmuTotal: number): PackField[] {
  /* 最多 32，保险起见截断 */
  const n = Math.min(Math.max(bmuTotal, 0), 32)

  const schema: PackField[] = []

  /* 32 × 单向菊花链断连位置（固定32个，前n个有效） ------------------- */
  for (let i = 1; i <= 32; i++) {
    const valid = i <= n;
    schema.push({
      class : '单项菊花链断连位置信息',
      key   : `Bmu${i}ChokePos`,
      label : `BMU${i} 断连位置`,
      type  : 'u16',
      valid : valid,  // 标记是否为有效数据
    })
  }

  /* 故障统计（固定4个字段） ----------------------------------------- */
  schema.push(
    { class:'失联信息', key:'BmuLostNum',      label:'BMU失联数量',     type:'u16', valid: true },
    { class:'失联信息', key:'AfeLostNum',      label:'AFE失联数量',     type:'u16', valid: true },
    { class:'失联信息', key:'CellVoltLostNum', label:'电芯电压断线数量', type:'u16', valid: true },
    { class:'失联信息', key:'CellTempLostNum', label:'电芯温度断线数量', type:'u16', valid: true }
  )

  /* 32 × BMU 电压（固定32个，前n个有效） ---------------------------- */
  for (let i = 1; i <= 32; i++) {
    const valid = i <= n;
    schema.push({
      class : 'BMU电压',
      key   : `Bmu${i}Volt`,
      label : `BMU${i} 电压(V)`,
      type  : 'u16',
      scale : 10,   // 0.1 V
      valid : valid,
    })
  }

  /* 32 × BMU 板温（固定32个，前n个有效） ---------------------------- */
  for (let i = 1; i <= 32; i++) {
    const valid = i <= n;
    schema.push({
      class : 'BMU电路板温度',
      key   : `Bmu${i}BoardTemp`,
      label : `BMU${i} 板温(℃)`,
      type  : 's16',
      scale : 10,   // 0.1 ℃
      valid : valid,
    })
  }

  /* 64 × 动力接插件温度（固定64个，前2×n个有效） -------------------- */
  for (let i = 1; i <= 32; i++) {
    const valid = i <= n;
    schema.push(
      {
        class : '动力接插件温度1',
        key   : `Bmu${i}Plug1Temp`,
        label : `BMU${i} 插件1温度(℃)`,
        type  : 's16',
        scale : 10,
        valid : valid,
      },
      {
        class : '动力接插件温度2',
        key   : `Bmu${i}Plug2Temp`,
        label : `BMU${i} 插件2温度(℃)`,
        type  : 's16',
        scale : 10,
        valid : valid,
      }
    )
  }

  /* 64 × 版本号：软件 + BOOT（固定64个，前2×n个有效） --------------- */
  for (let i = 1; i <= 32; i++) {
    const valid = i <= n;
    schema.push(
      {
        class : 'BMU版本信息',
        key   : `Bmu${i}SwVer`,
        label : `BMU${i} 软件版本`,
        type  : 'hex',
        valid : valid,
      },
      {
        class : 'BMU版本信息',
        key   : `Bmu${i}BootVer`,
        label : `BMU${i} BOOT版本`,
        type  : 'str2',
        valid : valid,
      }
    )
  }

  return schema
}





/* -------- 动态 IO-STATUS schema ---------- */
// export function IO_STATUS_SCHEMA(bmuTotal: number): PackField[] {
//   const n  = Math.min(Math.max(bmuTotal, 1), 32)          // 1-32
//   const regPerBlock = Math.ceil(n / 16)                   // 1 或 2
//   const schema: PackField[] = []

//   /* ── 系统 DI / DO：固定 2 个寄存器 ───────────────────────────── */
//   schema.push(
//     { class: '系统DI输入状态', key: 'SysDIState',
//       label: '系统 DI 输入寄存器', type: 'u16', hide: true },

//     ...Array.from({ length: 10 }, (_, i) => ({
//       class : '系统DI输入状态',
//       key   : `DI${i + 1}_FB`,
//       label : `DI${i + 1} 反馈`,
//       type  : 'bit', bitsOf: 'SysDIState', bit: i
//     })),

//     { class: '系统DO驱动状态', key: 'SysDOState',
//       label: '系统 DO 驱动寄存器', type: 'u16', hide: true },

//     ...Array.from({ length: 9 }, (_, i) => ({
//       class : '系统DO驱动状态',
//       key   : i < 8 ? `DO${i + 1}_FB` : 'Add_adapt_FB',
//       label : i < 8 ? `DO${i + 1} 反馈` : '地址自适应反馈',
//       type  : 'bit', bitsOf: 'SysDOState', bit: i
//     }))
//   )

//   /* ── 生成 BMU-DI1 / 2 / 3，可随 BMU 数变化 ─────────────────── */
//   const makeBmuDiBlock = (idx: 1 | 2 | 3): PackField[] => {
//     const blk: PackField[] = []

//     /** 把寄存器名称按"有就放"的规则 push 进去 */
//     const regKeys: string[] = ['BmuDI' + idx + '_L']
//     if (regPerBlock === 2) regKeys.push('BmuDI' + idx + '_H')

//     regKeys.forEach((k, i) =>
//       blk.push({
//         class: `BMU_DI${idx}反馈`,
//         key  : k,
//         label: i === 0 ? `BMU1-16 DI${idx}` : `BMU17-32 DI${idx}`,
//         type : 'u16',
//         hide : true
//       })
//     )

//     /* bit 字段（只生成 n 个） */
//     for (let b = 1; b <= n; b++) {
//       blk.push({
//         class : `BMU_DI${idx}反馈`,
//         key   : `BMU${b}_DI${idx}`,
//         label : `BMU${b} DI${idx}反馈`,
//         type  : 'bit',
//         bitsOf: b <= 16 ? regKeys[0] : regKeys[1],
//         bit   : (b - 1) % 16
//       })
//     }
//     return blk
//   }

//   schema.push(
//     ...makeBmuDiBlock(1),
//     ...makeBmuDiBlock(2),
//     ...makeBmuDiBlock(3),

//     /* 与旧协议保持一致的尾部保留字节 */
//     { class: '保留', key: '_skip1', label: '', type: 'skip2' }
//   )

//   return schema
// }
export function IO_STATUS_SCHEMA(bmuTotal: number): PackField[] {
  const n = Math.min(Math.max(bmuTotal, 0), 32);
  const schema: PackField[] = [];

  schema.push(
    { class: '系统DI输入状态', key: 'SysDIState',
      label: '系统 DI 输入寄存器', type: 'u16', hide: false },

    ...Array.from({ length: 10 }, (_, i) => ({
      class : '系统DI输入状态',
      key   : `DI${i + 1}_FB`,
      label : `DI${i + 1} 反馈`,
      type  : 'bit', bitsOf: 'SysDIState', bit: i
    })),

    { class: '系统DO驱动状态', key: 'SysDOState',
      label: '系统 DO 驱动寄存器', type: 'u16', hide: false },

    ...Array.from({ length: 9 }, (_, i) => ({
      class : '系统DO驱动状态',
      key   : i < 8 ? `DO${i + 1}_FB` : 'Add_adapt_FB',
      label : i < 8 ? `DO${i + 1} 反馈` : '地址自适应反馈',
      type  : 'bit', bitsOf: 'SysDOState', bit: i
    }))
  )

  const makeBmuDiBlock = (idx: 1 | 2 | 3): PackField[] => {
    const blk: PackField[] = [];
    const regKeys = ['BmuDI' + idx + '_L', 'BmuDI' + idx + '_H'];

    // L/H 固定两寄存器
    regKeys.forEach((k, i) => {
      blk.push({
        class: `BMU_DI${idx}反馈`,
        key: k,
        label: i === 0 ? `BMU1-16 DI${idx}` : `BMU17-32 DI${idx}`,
        type: 'u16',
        hide: false,         // 不单独展示原始寄存器值
      });
    });

    // bit fields 动态生成
    for (let b = 1; b <= n; b++) {
      const bitsOf = b <= 16 ? regKeys[0] : regKeys[1];
      blk.push({
        class: `BMU_DI${idx}反馈`,
        key: `BMU${b}_DI${idx}`,
        label: `BMU${b} DI${idx}反馈`,
        type: 'bit',
        bitsOf,
        bit: (b - 1) % 16
      });
    }
    return blk;
  };

  if (n > 0) {                                  
      schema.push(
        ...makeBmuDiBlock(1),
        ...makeBmuDiBlock(2),
        ...makeBmuDiBlock(3),
      );
    }
  return schema;
}

/* -------- 动态 硬件故障 schema ---------- */
export function HARDWARE_FAULT_SCHEMA (bmuTotal: number): PackField[] {
  const n = Math.min(Math.max(bmuTotal, 1), 32)          // 限 1‥32
  const s: PackField[] = []

  /* 1-1 高边驱动反馈故障 ------------------------------------ */
  s.push(
    { class:'高边驱动反馈故障', key:'DOFBFault', label:'高边驱动反馈寄存器', type:'u16', hide:false },
    ...Array.from({ length:8 }, (_, i) => ({
      class :'高边驱动反馈故障',
      key   : `DO${i+1}_FB_Fault`,
      label : `DO${i+1} 高边驱动反馈故障`,
      type  : 'bit', bitsOf:'DOFBFault', bit:i
    }))
  )
  /* ─────────────────── 1-2 接触器故障 ─────────────────────── */
  s.push(
    { class:'接触器故障', key:'ContactorFault', label:'接触器故障', type:'u16', hide:false },
    { class:'接触器故障', key:'Pos_Contactor_FBFault',           label:'主正接触器反馈故障', type:'bit', bitsOf:'ContactorFault', bit:0 },
    { class:'接触器故障', key:'Neg_Contactor_FBFault',           label:'主负接触器反馈故障', type:'bit', bitsOf:'ContactorFault', bit:1 },
    { class:'接触器故障', key:'PreChg_Contactor_FBFault',        label:'预充接触器反馈故障', type:'bit', bitsOf:'ContactorFault', bit:2 },
    { class:'接触器故障', key:'Circuit_Breaker_FBFault',         label:'断路器反馈故障',     type:'bit', bitsOf:'ContactorFault', bit:3 },
    { class:'接触器故障', key:'DIDO_Detect_Fault',               label:'BMU DO/DI 检测故障', type:'bit', bitsOf:'ContactorFault', bit:4 },
    { class:'接触器故障', key:'Pos_Contactor_Fault',             label:'主正接触器故障',     type:'bit', bitsOf:'ContactorFault', bit:5 },
    { class:'接触器故障', key:'Neg_Contactor_Fault',             label:'主负接触器故障',     type:'bit', bitsOf:'ContactorFault', bit:6 },
    { class:'接触器故障', key:'PreChg_Contactor_Fault',          label:'预充接触器故障',     type:'bit', bitsOf:'ContactorFault', bit:7 },
    { class:'接触器故障', key:'Pos_Contactor_Oxid_Fault',        label:'主正接触器氧化',     type:'bit', bitsOf:'ContactorFault', bit:8 },
    { class:'接触器故障', key:'Pos_Contactor_adhesion_Fault',    label:'主正接触器黏连',     type:'bit', bitsOf:'ContactorFault', bit:9 },
    { class:'接触器故障', key:'Neg_Contactor_Oxid_Fault',        label:'主负接触器氧化',     type:'bit', bitsOf:'ContactorFault', bit:10 },
    { class:'接触器故障', key:'Neg_Contactor_adhesion_Fault',    label:'主负接触器黏连',     type:'bit', bitsOf:'ContactorFault', bit:11 },
    { class:'接触器故障', key:'PreChg_Contactor_Oxid_Fault',     label:'预充接触器氧化',     type:'bit', bitsOf:'ContactorFault', bit:12 },
    { class:'接触器故障', key:'PreChg_Contactor_adhesion_Fault', label:'预充接触器黏连',     type:'bit', bitsOf:'ContactorFault', bit:13 },
    { class:'接触器故障', key:'Contactor_total_Fault',           label:'接触器总故障位',     type:'bit', bitsOf:'ContactorFault', bit:14 },
  )

  /* ─────────────────── 1-3 反馈信号故障 ───────────────────── */
  s.push(
    { class:'反馈信号故障', key:'FBSignalFault',label:'反馈信号故障', type:'u16', hide:false },
    { class:'反馈信号故障', key:'MB_ShuntTrip_HS_FBFault',     label:'主断分励脱扣 HS 反馈故障', type:'bit', bitsOf:'FBSignalFault', bit:0 },
    { class:'反馈信号故障', key:'DC_KM_HS_FBFault',            label:'直流供电 KM HS 反馈故障',  type:'bit', bitsOf:'FBSignalFault', bit:1 },
    { class:'反馈信号故障', key:'Access_FBFault',              label:'门禁反馈故障',             type:'bit', bitsOf:'FBSignalFault', bit:2 },
    { class:'反馈信号故障', key:'Emergency_Stop_FBFault',      label:'急停反馈故障',             type:'bit', bitsOf:'FBSignalFault', bit:3 },
    { class:'反馈信号故障', key:'SPD_FBFault',                 label:'SPD 反馈故障',             type:'bit', bitsOf:'FBSignalFault', bit:4 },
    { class:'反馈信号故障', key:'AC_Vol_FBFault',              label:'交流电压反馈故障',         type:'bit', bitsOf:'FBSignalFault', bit:5 },
    { class:'反馈信号故障', key:'Smoke_FBFault',               label:'烟感反馈故障',             type:'bit', bitsOf:'FBSignalFault', bit:6 },
    { class:'反馈信号故障', key:'Fire_Release_Signal_FBFault', label:'消防释放信号故障',         type:'bit', bitsOf:'FBSignalFault', bit:7 },
    { class:'反馈信号故障', key:'MSD_Fault',                   label:'MSD 信号故障',            type:'bit', bitsOf:'FBSignalFault', bit:8 },
    { class:'反馈信号故障', key:'Hall_Fault',                  label:'霍尔故障',                type:'bit', bitsOf:'FBSignalFault', bit:9 },
  )

  /* ─────────────────── 1-4 通讯/采集失联故障 ──────────────── */
  s.push(
    { class:'通讯/采集失联故障', key:'ContactMissFault', label:'通讯/采集失联故障', type:'u16', hide:false },
    { class:'通讯/采集失联故障', key:'INVALID_DATA_FaultPos',  label:'无效数据故障',           type:'bit', bitsOf:'ContactMissFault', bit:0 },
    { class:'通讯/采集失联故障', key:'Cold_COM_Fault',         label:'制冷设备通讯异常',       type:'bit', bitsOf:'ContactMissFault', bit:1 },
    { class:'通讯/采集失联故障', key:'PCS_COM_Fault',          label:'PCS 通讯故障',           type:'bit', bitsOf:'ContactMissFault', bit:2 },
    { class:'通讯/采集失联故障', key:'DAISY_Disconnect_Fault', label:'菊花链断连',             type:'bit', bitsOf:'ContactMissFault', bit:3 },
    { class:'通讯/采集失联故障', key:'FRAM_FAIL_Fault',        label:'铁电存储器故障',         type:'bit', bitsOf:'ContactMissFault', bit:4 },
    { class:'通讯/采集失联故障', key:'FLASH_FAIL_Fault',       label:'EEPROM/FLASH 故障',      type:'bit', bitsOf:'ContactMissFault', bit:5 },
    { class:'通讯/采集失联故障', key:'BCU_TEMP1_FAULT',        label:'BCU 温感1故障',          type:'bit', bitsOf:'ContactMissFault', bit:6 },
    { class:'通讯/采集失联故障', key:'BCU_TEMP2_FAULT',        label:'BCU 温感2故障',          type:'bit', bitsOf:'ContactMissFault', bit:7 },
    { class:'通讯/采集失联故障', key:'BCU_TEMP3_FAULT',        label:'BCU 温感3故障',          type:'bit', bitsOf:'ContactMissFault', bit:8 },
    { class:'通讯/采集失联故障', key:'BCU_TEMP4_FAULT',        label:'BCU 温感4故障',          type:'bit', bitsOf:'ContactMissFault', bit:9 },
    { class:'通讯/采集失联故障', key:'BCU_TEMP5_FAULT',        label:'BCU 温感5故障',          type:'bit', bitsOf:'ContactMissFault', bit:10 },
    { class:'通讯/采集失联故障', key:'BMU_PareConfig_ERR',     label:'BMU 参数配置错误',       type:'bit', bitsOf:'ContactMissFault', bit:11 },
    { class:'通讯/采集失联故障', key:'BCU_PareConfig_ERR',     label:'BCU 参数配置错误',       type:'bit', bitsOf:'ContactMissFault', bit:12 },
    { class:'通讯/采集失联故障', key:'DEHUM_COM_FAULT',        label:'除湿机通讯故障',         type:'bit', bitsOf:'ContactMissFault', bit:13 },
  )

  /* 1-5 BMU 参数配置错误（动态） --------------------------- */
  s.push({ class:'BMU参数配置错误', key:'ParaConfigWrong1', label:'BMU参数配置错误', type:'u16', hide:false })
  if (n > 16) {
    s.push({ class:'BMU参数配置错误', key:'ParaConfigWrong2', label:'BMU参数配置错误', type:'u16', hide:false })
  }

  for (let i = 1; i <= 32; i++) {
    const valid = i <= n;
    s.push({
      class :'BMU参数配置错误',
      key   : `BMU${i}_ParaErr`,
      label : `BMU${i} 参数配置错误`,
      type  : 'bit',
      bitsOf: i <= 16 ? 'ParaConfigWrong1' : 'ParaConfigWrong2',
      bit   : (i - 1) % 16,
      valid,
      hide    : !valid
    })
  }

  /* ─────────────────── 1-6 硬件其它状态 ──────────────────── */
  s.push(
    { class:'硬件其它状态', key:'HardwareOther', label:'硬件其它状态' ,type:'u16', hide:false },
    { class:'硬件其它状态', key:'CAN1_COM_State',     label:'CAN1 通讯异常',      type:'bit', bitsOf:'HardwareOther', bit:0 },
    { class:'硬件其它状态', key:'CAN2_COM_State',     label:'CAN2 通讯异常',      type:'bit', bitsOf:'HardwareOther', bit:1 },
    { class:'硬件其它状态', key:'CAN3_COM_State',     label:'CAN3 通讯异常',      type:'bit', bitsOf:'HardwareOther', bit:2 },
    { class:'硬件其它状态', key:'RS485_1_COM_State',  label:'RS485-1 通讯异常',   type:'bit', bitsOf:'HardwareOther', bit:4 },
    { class:'硬件其它状态', key:'RS485_2_COM_State',  label:'RS485-2 通讯异常',   type:'bit', bitsOf:'HardwareOther', bit:5 },
    { class:'硬件其它状态', key:'RS485_3_COM_State',  label:'RS485-3 通讯异常',   type:'bit', bitsOf:'HardwareOther', bit:6 },
    { class:'硬件其它状态', key:'ETH1_COM_State',     label:'Ethernet1 通讯异常', type:'bit', bitsOf:'HardwareOther', bit:9 },
    { class:'硬件其它状态', key:'POS_Contactor_State', label:'主正接触器闭合状态', type:'bit', bitsOf:'HardwareOther', bit:11 },
    { class:'硬件其它状态', key:'Neg_Contactor_State', label:'主负接触器闭合状态', type:'bit', bitsOf:'HardwareOther', bit:12 },
  )

  /* ─────────────────── 最后保留字节 ─────────────────────── */
  s.push({ key:'_skip1', type:'skip2', class:'保留', label:'' })

  return s
}

/* -------- 动态 故障等级 2 schema ---------- */
// export function FAULT_LEVEL2_SCHEMA (bmuTotal = 32): PackField[] {
//   const n = Math.min(Math.max(bmuTotal, 1), 32)
//   const s: PackField[] = []

//   const validBMUCount = n;

//   /* ① 单体电池过压 / 欠压 / 温度 / SOC  (单 bit) ---------------- */
//   ;[
//     ['CellOv' , '单体电池过压'],
//     ['CellUv' , '单体电池欠压'],
//     ['CellOTc', '充电单体过温'],
//     ['CellUTc', '充电单体欠温'],
//     ['CellOTd', '放电单体过温'],
//     ['CellUTd', '放电单体欠温'],
//     ['SocHigh', '单体SOC过高'],
//     ['SocLow' , '单体SOC过低']
//   ].forEach(([prefix, cls]) => {
//     // const grpCnt = Math.ceil(n / 16)           // 每寄存器 16 bit
//     const grpCnt = 2;     
//     for (let g = 0; g < grpCnt; g++) {
//       s.push({ class:cls, key:`${prefix}${g+1}`, type:'u16', scale:1, hide:true , label:''})
//       // const bmux = Math.min(16, n - g*16)
//       for (let i = 0; i < 16; i++) {
//         const bmuId = g * 16 + i + 1;
//         const isValid = bmuId <= bmuTotal;
//         s.push({
//           class : cls,
//           key   : `BMU${g*16+i+1}_${prefix}`,
//           label : `BMU${g*16+i+1} ${cls}`,
//           type  : 'bit',
//           bitsOf: `${prefix}${g+1}`,
//           bit   : i,
//           // 无效时不显示
//           valid: isValid,    
//           hide: !isValid     
//         })
//       }
//     }
//   })

//   /* ② BMU 过压 / 欠压 / 过温 / 欠温 (2-bit 等级) -------------- */
//   ;[
//     ['BmuOv', 'BMU过压等级'],
//     ['BmuUv', 'BMU欠压等级'],
//     ['BmuOT', 'BMU过温等级'],
//     ['BmuUT', 'BMU欠温等级']
//   ].forEach(([prefix, cls]) => {
//     // const grpCnt = Math.ceil(n / 8)            // 每寄存器 8×2bit
//     const grpCnt = 4;
//     for (let g = 0; g < grpCnt; g++) {
//       s.push({ class:cls, key:`${prefix}${g+1}`, type:'u16', scale:1, hide:true , label:''})
//       // const bmux = Math.min(8, n - g*8)
//       for (let i = 0; i < 8; i++) {
//         const bmuId = g * 8 + i + 1;
//         const isValid = bmuId <= bmuTotal;
//         s.push({
//           class : cls,
//           key   : `BMU${g*8+i+1}_${prefix}`,
//           label : `BMU${g*8+i+1} ${cls}`,
//           type  : 'bits',
//           bitsOf: `${prefix}${g+1}`,
//           bit   : i*2,
//           len   : 2,
//           map   : ALARM_MAP,
//           valid: isValid,    
//           hide: !isValid  
//         })
//       }
//     }
//   })

//   /* ③ 动力接插件过温等级 (2-bit) ------------------------------ */
//   ;['Plug1OT', 'Plug2OT'].forEach((plug, idx) => {
//     const cls = `BMU${idx+1}号插件过温`
//     // const grpCnt = Math.ceil(n / 8)
//     const grpCnt = 4;
//     for (let g = 0; g < grpCnt; g++) {
//       s.push({ class:cls, key:`${plug}${g+1}`, type:'u16', scale:1, hide:true , label:''})
//       // const bmux = Math.min(8, n - g*8)
//       for (let i = 0; i < 8; i++) {
//         const bmuId = g * 8 + i + 1;
//         const isValid = bmuId <= bmuTotal;
//         s.push({
//           class : cls,
//           key   : `BMU${g*8+i+1}_${plug}`,
//           label : `BMU${g*8+i+1} 插件${idx+1}过温等级`,
//           type  : 'bits',
//           bitsOf: `${plug}${g+1}`,
//           bit   : i*2,
//           len   : 2,
//           map   : ALARM_MAP,
//           valid: isValid,    
//           hide: !isValid 
//         })
//       }
//     }
//   })

//   /* ④ 其他故障-1 (固定 8 项) ------------------------------------ */
//   s.push({ class:'其他故障', key:'Misc1', type:'u16', scale:1, hide:true , label:''})
//   ;[
//     ['DiffVolt' , '单体压差过大'],
//     ['DiffTemp' , '单体温差过大'],
//     ['SocDiff'  , 'SOC差异过大'],
//     ['BmuDiff'  , 'BMU压差'],
//     ['ClusterOv', '簇端过压'],
//     ['ClusterUv', '簇端欠压'],
//     ['InsPosGnd', '绝缘正对地'],
//     ['InsNegGnd', '绝缘负对地']
//   ].forEach(([key,label], idx) => {
//     s.push({
//       class :'其他故障',
//       key, label,
//       type  :'bits', bitsOf:'Misc1',
//       bit   : idx*2, len:2, map: ALARM_MAP
//     })
//   })

//   /* ⑤ 其他故障-2 (固定 8 项) ------------------------------------ */
//   s.push({ class:'其他故障', key:'Misc2', type:'u16', scale:1, hide:true , label:''})
//   ;[
//     ['ChgOC' , '充电过流'],
//     ['DisOC' , '放电过流'],
//     ['RT1OT' , 'RT1过温'],
//     ['RT2OT' , 'RT2过温'],
//     ['RT3OT' , 'RT3过温'],
//     ['RT4OT' , 'RT4过温'],
//     ['RT5OT' , 'RT5过温'],
//   ].forEach(([key,label], idx) => {
//     s.push({
//       class :'其他故障',
//       key, label,
//       type  :'bits', bitsOf:'Misc2',
//       bit   : idx*2, len:2, map: ALARM_MAP
//     })
//   })



//   return s
// }/* -------- 动态 故障等级 2 schema ---------- */
export function FAULT_LEVEL2_SCHEMA(bmuTotal = 32): PackField[] {
  const n = Math.min(Math.max(bmuTotal, 1), 32);
  const s: PackField[] = [];

  /** ① 单体电池过压 / 欠压 / 温度 / SOC（单 bit，共 8 类） */
  ;[
    ['CellOv',  '单体电池过压'],
    ['CellUv',  '单体电池欠压'],
    ['CellOTc','充电单体过温'],
    ['CellUTc','充电单体欠温'],
    ['CellOTd','放电单体过温'],
    ['CellUTd','放电单体欠温'],
    ['SocHigh','单体SOC过高'],
    ['SocLow', '单体SOC过低'],
  ].forEach(([prefix, cls]) => {
    const grpCnt = 2; // 固定两个寄存器
    for (let g = 0; g < grpCnt; g++) {
      s.push({
        class: cls,
        key: `${prefix}${g + 1}`,
        type: 'u16',
        scale: 1,
        hide: false,
        label: ''
      });
    }
    for (let g = 0; g < grpCnt; g++) {
      for (let i = 0; i < 16; i++) {
        const bmuId = g * 16 + i + 1;
        const valid = bmuId <= n;
        s.push({
          class: cls,
          key: `BMU${bmuId}_${prefix}`,
          label: `BMU${bmuId} ${cls}`,
          type: 'bit',
          bitsOf: `${prefix}${g + 1}`,
          bit: i,
          valid,
          hide: !valid
        });
      }
    }
  });

  /** ② BMU 等级故障（过压/欠压/过温/欠温，共 4 类）2-bit */
  ;[
    ['BmuOv', 'BMU过压'],
    ['BmuUv', 'BMU欠压'],
    ['BmuOT', 'BMU过温'],
    ['BmuUT', 'BMU欠温'],
  ].forEach(([prefix, cls]) => {
    const grpCnt = 4; // 固定4个寄存器
    for (let g = 0; g < grpCnt; g++) {
      s.push({
        class: cls,
        key: `${prefix}${g + 1}`,
        type: 'u16',
        scale: 1,
        hide: false,
        label: ''
      });
      for (let i = 0; i < 8; i++) {
        const bmuId = g * 8 + i + 1;
        const valid = bmuId <= n;
        s.push({
          class: cls,
          key: `BMU${bmuId}_${prefix}`,
          label: `BMU${bmuId} ${cls}`,
          type: 'bits',
          bitsOf: `${prefix}${g + 1}`,
          bit: i * 2,
          len: 2,
          map: ALARM_MAP,
          valid,
          hide: !valid
        });
      }
    }
  });

  /** ③ 插件1/2 过温等级（2-bit） */
  ;['Plug1OT', 'Plug2OT'].forEach((prefix, idx) => {
    const cls = `BMU${idx + 1}号插件过温`;
    const grpCnt = 4;
    for (let g = 0; g < grpCnt; g++) {
      s.push({
        class: cls,
        key: `${prefix}${g + 1}`,
        type: 'u16',
        scale: 1,
        hide: false,
        label: ''
      });
      for (let i = 0; i < 8; i++) {
        const bmuId = g * 8 + i + 1;
        const valid = bmuId <= n;
        s.push({
          class: cls,
          key: `BMU${bmuId}_${prefix}`,
          label: `BMU${bmuId} 插件${idx + 1}过温`,
          type: 'bits',
          bitsOf: `${prefix}${g + 1}`,
          bit: i * 2,
          len: 2,
          map: ALARM_MAP,
          valid,
          hide: !valid
        });
      }
    }
  });

  /** ④ 其他故障-1（固定8项，2-bit） */
  s.push({
    class: '其他故障',
    key: 'Misc1',
    type: 'u16',
    scale: 1,
    hide: false,
    label: ''
  });
  ;[
    ['DiffVolt',  '单体压差过大'],
    ['DiffTemp',  '单体温差过大'],
    ['SocDiff',   'SOC差异过大'],
    ['BmuDiff',   'BMU压差'],
    ['ClusterOv','簇端过压'],
    ['ClusterUv','簇端欠压'],
    ['InsPosGnd','绝缘正对地'],
    ['InsNegGnd','绝缘负对地'],
  ].forEach(([key, label], idx) => {
    s.push({
      class: '其他故障',
      key,
      label,
      type: 'bits',
      bitsOf: 'Misc1',
      bit: idx * 2,
      len: 2,
      map: ALARM_MAP
    });
  });

  /** ⑤ 其他故障-2（固定7项，2-bit） */
  s.push({
    class: '其他故障',
    key: 'Misc2',
    type: 'u16',
    scale: 1,
    hide: false,
    label: ''
  });
  ;[
    ['ChgOC', '充电过流'],
    ['DisOC', '放电过流'],
    ['RT1OT', 'RT1过温'],
    ['RT2OT', 'RT2过温'],
    ['RT3OT', 'RT3过温'],
    ['RT4OT', 'RT4过温'],
    ['RT5OT', 'RT5过温'],
  ].forEach(([key, label], idx) => {
    s.push({
      class: '其他故障',
      key,
      label,
      type: 'bits',
      bitsOf: 'Misc2',
      bit: idx * 2,
      len: 2,
      map: ALARM_MAP
    });
  });

  return s;
}

const FAULT_LEVEL3_types = {
  cell_ov : { prefix: 'CellOv', label: '单体电池过压'   },   // cell_ov_fault_level3
  cell_uv : { prefix: 'CellUv', label: '单体电池欠压'   },
  chg_ot  : { prefix: 'ChgOT' , label: '充电单体过温'   },
  chg_ut  : { prefix: 'ChgUT' , label: '充电单体欠温'   },
  dsg_ot  : { prefix: 'DsgOT' , label: '放电单体过温'   },
  dsg_ut  : { prefix: 'DsgUT' , label: '放电单体欠温'   },
  soc_over: { prefix: 'SocHi' , label: '单体 SOC 过高' },
  soc_under:{prefix: 'SocLo' , label: '单体 SOC 过低' }
} as const

const TEMP_KINDS = new Set<FaultKey>([
  'chg_ot', 'chg_ut', 'dsg_ot', 'dsg_ut'
])


export const CELL_OV_L3_SCHEMA       = (hdr)=>getCachedL3Schema('cell_ov' , hdr)
export const CELL_UV_L3_SCHEMA       = (hdr)=>getCachedL3Schema('cell_uv' , hdr)
export const CHG_OT_L3_SCHEMA        = (hdr)=>getCachedL3Schema('chg_ot'  , hdr)
export const CHG_UT_L3_SCHEMA        = (hdr)=>getCachedL3Schema('chg_ut'  , hdr)
export const DSG_OT_L3_SCHEMA        = (hdr)=>getCachedL3Schema('dsg_ot'  , hdr)
export const DSG_UT_L3_SCHEMA        = (hdr)=>getCachedL3Schema('dsg_ut'  , hdr)
export const SOC_OVER_L3_SCHEMA      = (hdr)=>getCachedL3Schema('soc_over', hdr)
export const SOC_UNDER_L3_SCHEMA     = (hdr)=>getCachedL3Schema('soc_under',hdr)

// export function FAULT_LEVEL3_SCHEMA(
//   kind: FaultKey,
//   header: Header
// ): PackField[] {
//   const { prefix, label: faultLabel } = FAULT_LEVEL3_types[kind];
//   const bmuTotal = Math.max(1, Math.min(header.bmuTotal, 32));
//   const afeCounts = header.afeCellCounts.slice(0, header.afePerBmu);
//   const cellsPerBmu = afeCounts.reduce((a, b) => a + b, 0);
//   const totalCells = cellsPerBmu * bmuTotal;
//   const totalRegs = 512; // 协议固定 512 寄存器

//   const s: PackField[] = [];  // 明确声明类型

//   // 寄存器字段
//   for (let r = 0; r < totalRegs; r++) {
//     s.push({
//       class: faultLabel,
//       key: `Reg${r + 1}_${prefix}`,
//       label: `${faultLabel} 寄存器 #${r + 1}`,
//       type: 'u16',
//       hide: false
//     });
//   }

//   // 位字段
//   for (let r = 0; r < totalRegs; r++) {
//     for (let bitPair = 0; bitPair < 8; bitPair++) {
//       const cellIdx = r * 8 + bitPair;
//       const valid = cellIdx < totalCells;
//       const bmu = valid ? Math.floor(cellIdx / cellsPerBmu) + 1 : 0;
//       const cell = valid ? (cellIdx % cellsPerBmu) + 1 : 0;

//       s.push({
//         class: faultLabel,
//         key: `BMU${bmu}_${valid ? `Cell${cell}` : 'Cell0'}_${prefix}`,
//         label: valid
//           ? `BMU${bmu} 第${cell}节 ${faultLabel}`
//           : `${faultLabel} 保留位`,
//         type: 'bits',
//         bitsOf: `Reg${r + 1}_${prefix}`,
//         bit: bitPair * 2,
//         len: 2,
//         map: ALARM_MAP,
//         valid,
//         hide: !valid,
//         meta: valid ? { bmu, cellInBmu: cell } : undefined
//       });
//     }
//   }

//   return s;
// }
/* 缓存 Map：key = kind-bmuTotal-afeCells */
const l3SchemaCache = new Map<string, PackField[]>();
const MAX_SCHEMA_CACHE = 32;  
/* 帮助函数：先查缓存，没有才生成 */
export function getCachedL3Schema(kind: FaultKey, hdr: Header): PackField[] {
  const key = `${kind}-${hdr.bmuTotal}-${hdr.afePerBmu}`;
  let schema = l3SchemaCache.get(key);
  if (!schema) {
    if (l3SchemaCache.size >= MAX_SCHEMA_CACHE) l3SchemaCache.clear();
    schema = FAULT_LEVEL3_SCHEMA(kind, hdr);
    l3SchemaCache.set(key, schema);
  }
  return schema;
}

// export function FAULT_LEVEL3_SCHEMA (
//     kind  : FaultKey,
//     hdr   : Header
//   ): PackField[] {

//     const { prefix, label: faultLabel } = FAULT_LEVEL3_types[kind]

//     /* --------- 基本参数 -------------------------------------------- */
//     const bmuTotal     = Math.max(1, Math.min(hdr.bmuTotal, 32))   // 1-32
//     const cellsPerBmu  = hdr.afeCellCounts
//                           .slice(0, hdr.afePerBmu)
//                           .reduce((a, b) => a + b, 0)              // 真实电芯 / BMU
//     const REGS_PER_BMU = 16                                        // 协议固定
//     const CELLS_PER_REG= 8                                         // 1 寄存器 → 8 节（2 bit/节）
//     const MAX_REGS     = 512                                       // 32 × 16

//     const schema: PackField[] = []

//     /* --------- ① 先生成 512 个寄存器字段 --------------------------- */
//     for (let regIdx = 0; regIdx < MAX_REGS; regIdx++) {
//       schema.push({
//         class : faultLabel,
//         key   : `Reg${regIdx + 1}_${prefix}`,
//         label : `${faultLabel} 寄存器 #${regIdx + 1}`,
//         type  : 'u16',
//         hide  : false
//       })
//     }

//     /* --------- ② 再生成位字段（2 bit / Cell） --------------------- */
//     for (let bmu = 1; bmu <= bmuTotal; bmu++) {
//       const baseReg = (bmu - 1) * REGS_PER_BMU         // 该 BMU 起始寄存器序号 (0-based)

//       for (let cell = 1; cell <= 128; cell++) {        // 每 BMU 理论上 128 节
//         const valid = cell <= cellsPerBmu              // 是否真有这一节
//         if (!valid) continue                           // 无效位直接跳过生成（节省前端遍历量）

//         const cellIdx   = cell - 1                     // 0-based
//         const regInBmu  = Math.floor(cellIdx / CELLS_PER_REG)
//         const bitPair   =  (cellIdx % CELLS_PER_REG)   // 0-7
//         const regIdx    = baseReg + regInBmu           // 全局寄存器序号

//         schema.push({
//           class  : faultLabel,
//           key    : `BMU${bmu}_Cell${cell}_${prefix}`,
//           label  : `BMU${bmu} 第${cell}节 ${faultLabel}`,
//           type   : 'bits',
//           bitsOf : `Reg${regIdx + 1}_${prefix}`,       // 寄存器字段 key
//           bit    : bitPair * 2,                       // 每节占 2 bit
//           len    : 2,
//           map    : ALARM_MAP,
//           valid  : true,
//           hide   : false,
//           meta   : { bmu, cellInBmu: cell }
//         })
//       }
//     }

//     return schema
// }

export function FAULT_LEVEL3_SCHEMA (
  kind  : FaultKey,
  hdr   : Header
): PackField[] {

  const { prefix, label: faultLabel } = FAULT_LEVEL3_types[kind]

  /* ---------- 基本参数 ---------- */
  // const bmuTotal    = Math.max(1, Math.min(hdr.bmuTotal, 32))   // 1-32
  // const cellsPerBmu = hdr.afeCellCounts
  //                       .slice(0, hdr.afePerBmu)
  //                       .reduce((a, b) => a + b, 0)             // 实际电芯 / BMU

   /* ---------- 基本参数 ---------- */
 const bmuTotal = Math.max(1, Math.min(hdr.bmuTotal, 32))      // 1-32

 // ❶ 选用"计数数组"——电芯 or 温度
 const perAfeCounts = TEMP_KINDS.has(kind)
   ? hdr.afeTempCounts            // ← 温度类：用温度探头数
   : hdr.afeCellCounts            // ← 其它：用电芯数

 // ❷ 计算"每 ­BMU 总通道数"
 const unitsPerBmu = perAfeCounts
   .slice(0, hdr.afePerBmu)
   .reduce((a, b) => a + b, 0)

  const UNITS_PER_REG = 8                                       // 1 寄存器 = 8 节
  const REGS_PER_BMU  = Math.ceil(unitsPerBmu / UNITS_PER_REG)  // ★ 动态计算
  const MAX_REGS      = bmuTotal * REGS_PER_BMU                 // ★ 总寄存器

  const schema: PackField[] = []

  /* ---------- ① 生成寄存器字段 ---------- */
  for (let regIdx = 0; regIdx < MAX_REGS; regIdx++) {
    schema.push({
      class : faultLabel,
      key   : `Reg${regIdx + 1}_${prefix}`,
      label : `${faultLabel} 寄存器 #${regIdx + 1}`,
      type  : 'u16',
      hide  : false
    })
  }

  /* ---------- ② 生成位字段 (2 bit / Cell) ---------- */
  for (let bmu = 1; bmu <= bmuTotal; bmu++) {
    const baseReg = (bmu - 1) * REGS_PER_BMU           // ★ 起始寄存器

    for (let u = 1; u <= unitsPerBmu; u++) {         // u = 单元序号
      const idxInBmu = u - 1
      const regInBmu = Math.floor(idxInBmu / UNITS_PER_REG)
      const bitPair  =  idxInBmu % UNITS_PER_REG
      const regIdx   = baseReg + regInBmu               // 全局寄存器序号

      schema.push({
        class  : faultLabel,
        key    : `BMU${bmu}_Cell${u}_${prefix}`,
        label  : `BMU${bmu} 第${u}节 ${faultLabel}`,
        type   : 'bits',
        bitsOf : `Reg${regIdx + 1}_${prefix}`,
        bit    : bitPair * 2,
        len    : 2,
        map    : ALARM_MAP,
        valid  : true,
        hide   : false,
        meta   : { bmu, cellInBmu: u }
      })
    }
  }

  return schema
}




/* =======================================================================
   Broken-Wire (掉线信息) ―― 动态 schema
   -----------------------------------------------------------------------
   header 由 CELL_HEADER 解析得到，字段含义：
     - header.bmuTotal        : 1-32
     - header.afePerBmu       : 1-16
     - header.afeCellCounts[] : AFE1…16 每个 AFE 支持的电芯数
   ======================================================================= */

// const ON_OFF_MAP = { 0: '失联', 1: '正常' } as const;

// export function BROKENWIRE_SCHEMA(header: {
//   bmuTotal: number;
//   afePerBmu: number;
//   afeCellCounts: number[];   // ⩽ 16 个元素
// }): PackField[] {

//   /* ---------------- 基本统计 ---------------- */
//   const nBMU  = Math.max(1, Math.min(header.bmuTotal, 32));
//   const cellsPerBmu = header.afeCellCounts.slice(0, header.afePerBmu)
//                                            .reduce((s, v) => s + v, 0);
//   const afePerBmu   = Math.max(1, Math.min(header.afePerBmu, 16));

//   const schema: PackField[] = [];

//   /* ---------- 1. BMU 失联状态（两寄存器，Bit-Map） ---------- */
//   (['BmuOffline1', 'BmuOffline2'] as const).forEach((regKey, grp) => {
//     schema.push({ class: 'BMU失联状态', key: regKey, type: 'u16', hide: false });
//     for (let i = 0; i < 16; i++) {
//       const bmuIdx = grp * 16 + i + 1;
//       schema.push({
//         class : 'BMU失联状态',
//         key   : `BMU${bmuIdx}_Offline`,
//         label : `BMU${bmuIdx} 失联`,
//         type  : 'bit',
//         bitsOf: regKey,
//         bit   : i,
//         valid : bmuIdx <= nBMU,
//         hide  : bmuIdx > nBMU,
//         map   : ON_OFF_MAP
//       });
//     }
//   });

//   /* ---------- 2. 插件温度掉线（插件1 & 插件2，各两寄存器） ---------- */
//   const makePlugBlock = (plugIdx: 1 | 2, baseKey: string, cls: string) => {
//     (['_L', '_H'] as const).forEach((suffix, grp) => {
//       const regKey = `${baseKey}${suffix}`;
//       schema.push({ class: cls, key: regKey, type: 'u16', hide: false });

//       for (let i = 0; i < 16; i++) {
//         const bmuIdx = grp * 16 + i + 1;
//         schema.push({
//           class : cls,
//           key   : `BMU${bmuIdx}_Plug${plugIdx}Offline`,
//           label : `BMU${bmuIdx} 插件${plugIdx}温度掉线`,
//           type  : 'bit',
//           bitsOf: regKey,
//           bit   : i,
//           valid : bmuIdx <= nBMU,
//           hide  : bmuIdx > nBMU,
//           map   : ON_OFF_MAP
//         });
//       }
//     });
//   };
//   makePlugBlock(1, 'Plug1Offline', '插件1温度掉线');
//   makePlugBlock(2, 'Plug2Offline', '插件2温度掉线');

//   /* ---------- 3. 预留 2 字节 ---------- */
//   schema.push({ key: '_skip_resv', type: 'skip2', class: '保留', label: '' });

//   /* ---------- 4. 一级掉线标志（电压 / 温度，各两寄存器） ---------- */
//   const makeLv1Block = (prefix: string, cls: string) => {
//     (['_1', '_2'] as const).forEach((suffix, grp) => {
//       const regKey = `${prefix}${suffix}`;
//       schema.push({ class: cls, key: regKey, type: 'u16', hide: false });

//       for (let i = 0; i < 16; i++) {
//         const bmuIdx = grp * 16 + i + 1;
//         schema.push({
//           class : cls,
//           key   : `BMU${bmuIdx}_${prefix}`,
//           label : `BMU${bmuIdx} ${cls}`,
//           type  : 'bit',
//           bitsOf: regKey,
//           bit   : i,
//           valid : bmuIdx <= nBMU,
//           hide  : bmuIdx > nBMU,
//           map   : { 0: '掉线', 1: '正常' }
//         });
//       }
//     });
//   };
//   makeLv1Block('VoltLv1', '电压一级掉线');
//   makeLv1Block('TempLv1', '温度一级掉线');

//   /* ---------- 5. 二级掉线（电压 / 温度，各 256 寄存器） ---------- */
//   const makeLv2Block = (prefix: string, cls: string) => {
//     for (let bmu = 1; bmu <= 32; bmu++) {
//       for (let r = 0; r < 8; r++) {
//         const regKey = `${prefix}_BMU${bmu}_R${r + 1}`;
//         schema.push({ class: cls, key: regKey, type: 'u16', hide: false });

//         for (let bit = 0; bit < 16; bit++) {
//           const cellIdx = r * 16 + bit;              // 0-127
//           const valid   = (bmu <= nBMU) && (cellIdx < cellsPerBmu);

//           schema.push({
//             class : cls,
//             key   : `BMU${bmu}_Cell${cellIdx + 1}_${prefix}`,
//             label : `BMU${bmu} Cell${cellIdx + 1} ${cls}`,
//             type  : 'bit',
//             bitsOf: regKey,
//             bit,
//             valid,
//             hide  : !valid,
//             map   : { 0: '掉线', 1: '正常' }
//           });
//         }
//       }
//     }
//   };
//   makeLv2Block('VoltLv2', '电压二级掉线');
//   makeLv2Block('TempLv2', '温度二级掉线');

//   /* ---------- 6. BMU-AFE 通讯失联（固定 32 寄存器） ---------- */
//   for (let bmu = 1; bmu <= 32; bmu++) {
//     const regKey = `BMU${bmu}_AfeLost`;
//     schema.push({ class: 'AFE失联', key: regKey, type: 'u16', hide: false });

//     for (let afe = 0; afe < 16; afe++) {
//       const valid = (bmu <= nBMU) && (afe < afePerBmu);
//       schema.push({
//         class : 'AFE失联',
//         key   : `BMU${bmu}_AFE${afe + 1}_Lost`,
//         label : `BMU${bmu} AFE${afe + 1} 失联`,
//         type  : 'bit',
//         bitsOf: regKey,
//         bit   : afe,
//         valid,
//         hide  : !valid,
//         map   : ON_OFF_MAP
//       });
//     }
//   }

//   return schema;
// }


/* ---------- 常量 ---------- */
const ON_OFF_MAP = { 0: '失联', 1: '正常' } as const;

export interface BrokenWireHeader {
  bmuTotal: number;          // BMU 数量 (1-32)
  afePerBmu: number;         // 每 BMU AFE 数 (1-16)
  afeCellCounts: number[];   // 每 AFE 单体数
  afeTempCounts: number[];  // 可选：每 AFE 温度探头数
}

/**
 * 生成掉线 / 失联故障表
 */
// export function BROKENWIRE_SCHEMA(header: BrokenWireHeader): PackField[] {

//   /* ---------- ① 基本统计 ---------- */
//   const nBMU        = Math.max(1, Math.min(header.bmuTotal, 32));
//   const cellsPerBmu = header.afeCellCounts
//                              .slice(0, header.afePerBmu)
//                              .reduce((sum, v) => sum + v, 0);        // 单体总数
//   const tempsPerBmu = (header.afeTempCounts ?? header.afeCellCounts)
//                              .slice(0, header.afePerBmu)
//                              .reduce((sum, v) => sum + v, 0);        // 温度总数
//   const afePerBmu   = Math.max(1, Math.min(header.afePerBmu, 16));

//   /* ---------- ② 动态寄存器个数 ---------- */
//   const REG_1BIT_BY_BMU = Math.ceil(nBMU / 16);         // 1 寄存器 ⇔ 16 BMU (每 bit 1 BMU)
//   const REG_VOLT_LV2    = Math.ceil(cellsPerBmu / 16);  // 1 寄存器 ⇔ 16 Cell (bit)
//   const REG_TEMP_LV2    = Math.ceil(tempsPerBmu / 16);  // 1 寄存器 ⇔ 16 Temp

//   const schema: PackField[] = [];

//   /* ---------- ③ BMU 失联状态 ---------- */
//   Array.from({ length: REG_1BIT_BY_BMU }, (_, grp) => `BmuOffline${grp + 1}`)
//     .forEach((regKey, grp) => {
//       schema.push({ class: 'BMU失联状态', key: regKey, type: 'u16', hide: false });
//       for (let i = 0; i < 16; i++) {
//         const bmuIdx = grp * 16 + i + 1;
//         schema.push({
//           class : 'BMU失联状态',
//           key   : `BMU${bmuIdx}_Offline`,
//           label : `BMU${bmuIdx} 失联`,
//           type  : 'bit',
//           bitsOf: regKey,
//           bit   : i,
//           valid : bmuIdx <= nBMU,
//           hide  : bmuIdx > nBMU,
//           map   : ON_OFF_MAP
//         });
//       }
//     });

//   /* ---------- ④ 插件温度掉线 (插件1 / 2) ---------- */
//   const makePlugBlock = (plugIdx: 1 | 2, cls: string) => {
//     Array.from({ length: REG_1BIT_BY_BMU }, (_, grp) => `Plug${plugIdx}Offline${grp + 1}`)
//       .forEach((regKey, grp) => {
//         schema.push({ class: cls, key: regKey, type: 'u16', hide: false });
//         for (let i = 0; i < 16; i++) {
//           const bmuIdx = grp * 16 + i + 1;
//           schema.push({
//             class : cls,
//             key   : `BMU${bmuIdx}_Plug${plugIdx}Offline`,
//             label : `BMU${bmuIdx} 插件${plugIdx}温度掉线`,
//             type  : 'bit',
//             bitsOf: regKey,
//             bit   : i,
//             valid : bmuIdx <= nBMU,
//             hide  : bmuIdx > nBMU,
//             map   : ON_OFF_MAP
//           });
//         }
//       });
//   };
//   makePlugBlock(1, '插件1温度掉线');
//   makePlugBlock(2, '插件2温度掉线');

//   /* ---------- ⑤ 预留 2 字节 ---------- */
//   schema.push({ key: '_skip_resv', type: 'skip2', class: '保留', label: '' });

//   /* ---------- ⑥ 一级掉线标志 (电压 / 温度) ---------- */
//   const makeLv1Block = (prefix: string, cls: string) => {
//     Array.from({ length: REG_1BIT_BY_BMU }, (_, grp) => `${prefix}${grp + 1}`)
//       .forEach((regKey, grp) => {
//         schema.push({ class: cls, key: regKey, type: 'u16', hide: false });
//         for (let i = 0; i < 16; i++) {
//           const bmuIdx = grp * 16 + i + 1;
//           schema.push({
//             class : cls,
//             key   : `BMU${bmuIdx}_${prefix}`,
//             label : `BMU${bmuIdx} ${cls}`,
//             type  : 'bit',
//             bitsOf: regKey,
//             bit   : i,
//             valid : bmuIdx <= nBMU,
//             hide  : bmuIdx > nBMU,
//             map   : { 0: '掉线', 1: '正常' }
//           });
//         }
//       });
//   };
//   makeLv1Block('VoltLv1', '电压一级掉线');
//   makeLv1Block('TempLv1', '温度一级掉线');

//   /* ---------- ⑦ 二级掉线 (电压 / 温度) ---------- */
//   const makeLv2Block = (
//     prefix : 'VoltLv2' | 'TempLv2',
//     cls    : string,
//     regsPB : number,
//     maxIdx : number
//   ) => {
//     for (let bmu = 1; bmu <= nBMU; bmu++) {
//       for (let r = 0; r < regsPB; r++) {
//         const regKey = `${prefix}_BMU${bmu}_R${r + 1}`;
//         schema.push({ class: cls, key: regKey, type: 'u16', hide: false });

//         for (let bit = 0; bit < 16; bit++) {
//           const idxInBmu = r * 16 + bit;
//           const valid    = idxInBmu < maxIdx;        // 剩余位留空
//           schema.push({
//             class : cls,
//             key   : `BMU${bmu}_${prefix === 'VoltLv2' ? 'Cell' : 'Temp'}${idxInBmu + 1}_${prefix}`,
//             label : `BMU${bmu} ${prefix === 'VoltLv2' ? 'Cell' : 'Temp'}${idxInBmu + 1} ${cls}`,
//             type  : 'bit',
//             bitsOf: regKey,
//             bit,
//             valid,
//             hide  : !valid,
//             map   : { 0: '掉线', 1: '正常' }
//           });
//         }
//       }
//     }
//   };
//   makeLv2Block('VoltLv2', '电压二级掉线', REG_VOLT_LV2, cellsPerBmu);
//   makeLv2Block('TempLv2', '温度二级掉线', REG_TEMP_LV2, tempsPerBmu);

//   /* ---------- ⑧ BMU-AFE 通讯失联 (协议固定 32 寄存器) ---------- */
//   for (let bmu = 1; bmu <= nBMU; bmu++) {
//     const regKey = `BMU${bmu}_AfeLost`;
//     schema.push({ class: 'AFE失联', key: regKey, type: 'u16', hide: false });
//     for (let afe = 0; afe < 16; afe++) {
//       const valid = (bmu <= nBMU) && (afe < afePerBmu);
//       schema.push({
//         class : 'AFE失联',
//         key   : `BMU${bmu}_AFE${afe + 1}_Lost`,
//         label : `BMU${bmu} AFE${afe + 1} 失联`,
//         type  : 'bit',
//         bitsOf: regKey,
//         bit   : afe,
//         valid,
//         hide  : !valid,
//         map   : ON_OFF_MAP
//       });
//     }
//   }

//   return schema;
// }


export function BROKENWIRE_SCHEMA(header: BrokenWireHeader): PackField[] {
  const nBMU = Math.max(1, Math.min(header.bmuTotal, 32));
  const afePerBmu = Math.max(1, Math.min(header.afePerBmu, 16));
  const REG_1BIT_BY_BMU = Math.ceil(nBMU / 16);         // 1 寄存器 ⇔ 16 BMU (每 bit 1 BMU)

  const cellCounts = header.afeCellCounts;  // 扁平数组，如 [12,12,12,12,0…]
  const tempCounts = header.afeTempCounts;

  const cellsPerBmu = cellCounts.slice(0, afePerBmu).reduce((s, v) => s + v, 0); // 48
  const tempsPerBmu = tempCounts.slice(0, afePerBmu).reduce((s, v) => s + v, 0);
  

  const schema: PackField[] = [];
  
  // 公共：1-bit BMU 失联 & 插件 & 一级掉线 —— 与之前一致...
    Array.from({ length: REG_1BIT_BY_BMU }, (_, grp) => `BmuOffline${grp + 1}`)
    .forEach((regKey, grp) => {
      schema.push({ class: 'BMU失联状态', key: regKey, type: 'u16', hide: false });
      for (let i = 0; i < 16; i++) {
        const bmuIdx = grp * 16 + i + 1;
        schema.push({
          class : 'BMU失联状态',
          key   : `BMU${bmuIdx}_Offline`,
          label : `BMU${bmuIdx} 失联`,
          type  : 'bit',
          bitsOf: regKey,
          bit   : i,
          valid : bmuIdx <= nBMU,
          hide  : bmuIdx > nBMU,
          map   : ON_OFF_MAP
        });
      }
    });

  /* ---------- ④ 插件温度掉线 (插件1 / 2) ---------- */
  const makePlugBlock = (plugIdx: 1 | 2, cls: string) => {
    Array.from({ length: REG_1BIT_BY_BMU }, (_, grp) => `Plug${plugIdx}Offline${grp + 1}`)
      .forEach((regKey, grp) => {
        schema.push({ class: cls, key: regKey, type: 'u16', hide: false });
        for (let i = 0; i < 16; i++) {
          const bmuIdx = grp * 16 + i + 1;
          schema.push({
            class : cls,
            key   : `BMU${bmuIdx}_Plug${plugIdx}Offline`,
            label : `BMU${bmuIdx} 插件${plugIdx}温度掉线`,
            type  : 'bit',
            bitsOf: regKey,
            bit   : i,
            valid : bmuIdx <= nBMU,
            hide  : bmuIdx > nBMU,
            map   : ON_OFF_MAP
          });
        }
      });
  };
  makePlugBlock(1, '插件1温度掉线');
  makePlugBlock(2, '插件2温度掉线');

  /* ---------- ⑤ 预留 2  ---------- */
  schema.push({ key: '_skip_resv', type: 'skip4', class: '保留', label: '' });

  /* ---------- ⑥ 一级掉线标志 (电压 / 温度) ---------- */
  const makeLv1Block = (prefix: string, cls: string) => {
    Array.from({ length: REG_1BIT_BY_BMU }, (_, grp) => `${prefix}${grp + 1}`)
      .forEach((regKey, grp) => {
        schema.push({ class: cls, key: regKey, type: 'u16', hide: false });
        for (let i = 0; i < 16; i++) {
          const bmuIdx = grp * 16 + i + 1;
          schema.push({
            class : cls,
            key   : `BMU${bmuIdx}_${prefix}`,
            label : `BMU${bmuIdx} ${cls}`,
            type  : 'bit',
            bitsOf: regKey,
            bit   : i,
            valid : bmuIdx <= nBMU,
            hide  : bmuIdx > nBMU,
            map   : { 0: '掉线', 1: '正常' }
          });
        }
      });
  };
  makeLv1Block('VoltLv1', '电压一级掉线');
  makeLv1Block('TempLv1', '温度一级掉线');


  // console.log(`flatCellCounts length= ${cellCounts.length}`, cellCounts);
  // console.log(`flatTempCounts length= ${tempCounts.length}`, tempCounts);
  // 二级掉线（按每个 BMU 计算 regs 数）
 const makeLv2Block = (
    prefix: 'VoltLv2' | 'TempLv2',
    cls: string,
    counts: number[],
    unit: 'Cell' | 'Temp'
  ) => {
    for (let bmu = 1; bmu <= nBMU; bmu++) {
    const total /* 每 BMU */ =
    prefix === 'VoltLv2' ? cellsPerBmu   // 48
                       : tempsPerBmu; 
      // console.log(`${prefix} 全BMU total =`, total);
      const regs = Math.ceil(total / 16);
      for (let r = 0; r < regs; r++) {
        const regKey = `${prefix}_BMU${bmu}_R${r + 1}`;
        schema.push({ class: cls, key: regKey, type: 'u16', hide: false });
        for (let bit = 0; bit < 16; bit++) {
          const idx = r * 16 + bit;
          const valid = idx < total;
          schema.push({
            class: cls,
            key: `BMU${bmu}_${unit}${idx + 1}_${prefix}`,
            label: `BMU${bmu} ${unit}${idx + 1} ${cls}`,
            type: 'bit',
            bitsOf: regKey,
            bit,
            valid,
            hide: !valid,
            map: { 0: '掉线', 1: '正常' }
          });
        }
      }
    }
  };

  makeLv2Block('VoltLv2', '电压二级掉线', cellCounts, 'Cell');
  makeLv2Block('TempLv2', '温度二级掉线', tempCounts, 'Temp');



    /* ---------- ⑧ BMU-AFE 通讯失联 (协议固定 32 寄存器) ---------- */
  for (let bmu = 1; bmu <= nBMU; bmu++) {
    const regKey = `BMU${bmu}_AfeLost`;
    schema.push({ class: 'AFE失联', key: regKey, type: 'u16', hide: false });
    for (let afe = 0; afe < 16; afe++) {
      const valid = (bmu <= nBMU) && (afe < afePerBmu);
      schema.push({
        class : 'AFE失联',
        key   : `BMU${bmu}_AFE${afe + 1}_Lost`,
        label : `BMU${bmu} AFE${afe + 1} 失联`,
        type  : 'bit',
        bitsOf: regKey,
        bit   : afe,
        valid,
        hide  : !valid,
        map   : ON_OFF_MAP
      });
    }
  }
  // console.log(schema.filter(f => f.class==='电压二级掉线'));
  return schema;
}


/** ──────────────────────────────────────────────
 *  动态均衡状态表：电芯 bit 解析
 *  ────────────────────────────────────────────── */
export function BALANCE_STATUS_SCHEMA(header: BrokenWireHeader): PackField[] {
  /* ① 读取表头里的配置 */
  const nBMU      = Math.max(1, Math.min(header.bmuTotal , 32));
  const afePerBmu = Math.max(1, Math.min(header.afePerBmu, 16));
  const cellFlat  = header.afeCellCounts;              // 扁平 Cell 数组

  /* ② 计算"某个 BMU 实际 Cell 数" */
  const cellsPerBmu = (bmuIdx: number) => {
    const start = (bmuIdx - 1) * afePerBmu;
    return cellFlat
      .slice(start, start + afePerBmu)
      .reduce((s, v) => s + (v || 0), 0);
  };

  /* ③ 依 BMU 顺序逐个 push；寄存器在流中自然连续 */
  const schema: PackField[] = [];

  for (let bmu = 1; bmu <= nBMU; bmu++) {
    const total   = cellsPerBmu(bmu);           // 例：48 / 49 …
    const regsNum = Math.ceil(total / 16);      // 例：3 / 4 …

    for (let r = 0; r < regsNum; r++) {
      const regKey = `Bal_BMU${bmu}_R${r + 1}`;

      /* --- 寄存器原值（u16） --- */
      schema.push({
        class : '均衡状态',
        key   : regKey,
        type  : 'u16',
        hide  : false
      });

      /* --- 16 bit → 16 Cell --- */
      for (let bit = 0; bit < 16; bit++) {
        const idx   = r * 16 + bit;           // 0-基序号
        const valid = idx < total;            // 超出本 BMU Cell 数就无效

        schema.push({
          class : '均衡状态',
          key   : `BMU${bmu}_Cell${idx + 1}_Bal`,
          label : `BMU${bmu} 电池${idx + 1} 均衡`,
          type  : 'bit',
          bitsOf: regKey,
          bit,
          valid,
          hide  : !valid,
          map   : { 0: '未均衡', 1: '均衡中' }
        });
      }
    }
  }

  return schema;
}

/* -------- 簇模拟量故障三级汇总动态schema ---------- */
export function CLU_ANALOG_FAULT_LEVEL_SUM_SCHEMA(clusterCount: number): PackField[] {
  const schema: PackField[] = [];
  
  for (let i = 1; i <= clusterCount; i++) {
    // 第i簇严重故障1 (2字节)
    schema.push({
      class: `第${i}簇模拟量严重故障`,
      key: `Cluster${i}AnalogSevereFault1`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 严重故障1的位定义
    schema.push(
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}CellVoltageDiffUpperLimitSevere`, label: '单体压差上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 0 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}CellTempDiffUpperLimitSevere`, label: '单体温差上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 1 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}CellSocDiffTooLargeSevere`, label: '单体SOC差异过大告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 2 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}PackInterVoltageDiffTooLargeSevere`, label: '电池包间压差过大告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 3 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}ClusterVoltageUpperLimitSevere`, label: '簇电压上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 4 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}ClusterVoltageLowerLimitSevere`, label: '簇电压下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 5 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}ClusterInsulationResistanceRPlusLowerLimitSevere`, label: '簇绝缘电阻R+下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 6 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}ClusterInsulationResistanceRMinusLowerLimitSevere`, label: '簇绝缘电阻R-下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 7 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}ClusterChargeCurrentUpperLimitSevere`, label: '簇充电电流上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 8 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}ClusterDischargeCurrentUpperLimitSevere`, label: '簇放电电流上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 9 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}BcuRt1OvertempSevere`, label: 'BCU RT1过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 10 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}BcuRt2OvertempSevere`, label: 'BCU RT2过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 11 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}BcuRt3OvertempSevere`, label: 'BCU RT3过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 12 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}BcuRt4OvertempSevere`, label: 'BCU RT4过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 13 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}BcuRt5OvertempSevere`, label: 'BCU RT5过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 14 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}AnalogSevereFault1Reserved`, label: '预留', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault1`, bit: 15 }
    );
    
    // 第i簇严重故障2 (2字节)
    schema.push({
      class: `第${i}簇模拟量严重故障`,
      key: `Cluster${i}AnalogSevereFault2`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 严重故障2的位定义
    schema.push(
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}PackVoltageUpperLimitSevere`, label: '电池包电压上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 0 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}PackVoltageLowerLimitSevere`, label: '电池包电压下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 1 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}PackTempUpperLimitSevere`, label: '电池包温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 2 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}PackTempLowerLimitSevere`, label: '电池包温度下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 3 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}PackPowerConnectorPosTempUpperLimitSevere`, label: '电池包动力接插件正极温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 4 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}PackPowerConnectorNegTempUpperLimitSevere`, label: '电池包动力接插件负极温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 5 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}CellVoltageUpperLimitSevere`, label: '单体电压上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 6 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}CellVoltageLowerLimitSevere`, label: '单体电压下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 7 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}ChargeCellTempUpperLimitSevere`, label: '充电单体温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 8 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}ChargeCellTempLowerLimitSevere`, label: '充电单体温度下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 9 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}DischargeCellTempUpperLimitSevere`, label: '放电单体温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 10 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}DischargeCellTempLowerLimitSevere`, label: '放电单体温度下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 11 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}CellSocUpperLimitSevere`, label: '单体SOC上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 12 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}CellSocLowerLimitSevere`, label: '单体SOC下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 13 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}AnalogSevereFault2Reserved`, label: '预留', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 14 },
      { class: `第${i}簇模拟量严重故障`, key: `Cluster${i}AnalogSevereFault2Reserved2`, label: '预留', type: 'bit', bitsOf: `Cluster${i}AnalogSevereFault2`, bit: 15 }
    );
    
    // 第i簇一般故障1 (2字节)
    schema.push({
      class: `第${i}簇模拟量一般故障`,
      key: `Cluster${i}AnalogGeneralFault1`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 一般故障1的位定义
    schema.push(
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}CellVoltageDiffUpperLimitGeneral`, label: '单体压差上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 0 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}CellTempDiffUpperLimitGeneral`, label: '单体温差上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 1 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}CellSocDiffTooLargeGeneral`, label: '单体SOC差异过大告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 2 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}PackInterVoltageDiffTooLargeGeneral`, label: '电池包间压差过大告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 3 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}ClusterVoltageUpperLimitGeneral`, label: '簇电压上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 4 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}ClusterVoltageLowerLimitGeneral`, label: '簇电压下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 5 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}ClusterInsulationResistanceRPlusLowerLimitGeneral`, label: '簇绝缘电阻R+下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 6 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}ClusterInsulationResistanceRMinusLowerLimitGeneral`, label: '簇绝缘电阻R-下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 7 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}ClusterChargeCurrentUpperLimitGeneral`, label: '簇充电电流上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 8 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}ClusterDischargeCurrentUpperLimitGeneral`, label: '簇放电电流上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 9 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}BcuRt1OvertempGeneral`, label: 'BCU RT1过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 10 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}BcuRt2OvertempGeneral`, label: 'BCU RT2过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 11 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}BcuRt3OvertempGeneral`, label: 'BCU RT3过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 12 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}BcuRt4OvertempGeneral`, label: 'BCU RT4过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 13 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}BcuRt5OvertempGeneral`, label: 'BCU RT5过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 14 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}AnalogGeneralFault1Reserved`, label: '预留', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault1`, bit: 15 }
    );
    
    // 第i簇一般故障2 (2字节)
    schema.push({
      class: `第${i}簇模拟量一般故障`,
      key: `Cluster${i}AnalogGeneralFault2`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 一般故障2的位定义
    schema.push(
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}PackVoltageUpperLimitGeneral`, label: '电池包电压上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 0 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}PackVoltageLowerLimitGeneral`, label: '电池包电压下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 1 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}PackTempUpperLimitGeneral`, label: '电池包温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 2 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}PackTempLowerLimitGeneral`, label: '电池包温度下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 3 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}PackPowerConnectorPosTempUpperLimitGeneral`, label: '电池包动力接插件正极温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 4 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}PackPowerConnectorNegTempUpperLimitGeneral`, label: '电池包动力接插件负极温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 5 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}CellVoltageUpperLimitGeneral`, label: '单体电压上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 6 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}CellVoltageLowerLimitGeneral`, label: '单体电压下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 7 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}ChargeCellTempUpperLimitGeneral`, label: '充电单体温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 8 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}ChargeCellTempLowerLimitGeneral`, label: '充电单体温度下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 9 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}DischargeCellTempUpperLimitGeneral`, label: '放电单体温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 10 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}DischargeCellTempLowerLimitGeneral`, label: '放电单体温度下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 11 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}CellSocUpperLimitGeneral`, label: '单体SOC上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 12 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}CellSocLowerLimitGeneral`, label: '单体SOC下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 13 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}AnalogGeneralFault2Reserved`, label: '预留', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 14 },
      { class: `第${i}簇模拟量一般故障`, key: `Cluster${i}AnalogGeneralFault2Reserved2`, label: '预留', type: 'bit', bitsOf: `Cluster${i}AnalogGeneralFault2`, bit: 15 }
    );
    
    // 第i簇轻微故障1 (2字节)
    schema.push({
      class: `第${i}簇模拟量轻微故障`,
      key: `Cluster${i}AnalogMinorFault1`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 轻微故障1的位定义
    schema.push(
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}CellVoltageDiffUpperLimitMinor`, label: '单体压差上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 0 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}CellTempDiffUpperLimitMinor`, label: '单体温差上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 1 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}CellSocDiffTooLargeMinor`, label: '单体SOC差异过大告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 2 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}PackInterVoltageDiffTooLargeMinor`, label: '电池包间压差过大告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 3 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}ClusterVoltageUpperLimitMinor`, label: '簇电压上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 4 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}ClusterVoltageLowerLimitMinor`, label: '簇电压下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 5 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}ClusterInsulationResistanceRPlusLowerLimitMinor`, label: '簇绝缘电阻R+下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 6 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}ClusterInsulationResistanceRMinusLowerLimitMinor`, label: '簇绝缘电阻R-下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 7 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}ClusterChargeCurrentUpperLimitMinor`, label: '簇充电电流上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 8 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}ClusterDischargeCurrentUpperLimitMinor`, label: '簇放电电流上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 9 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}BcuRt1OvertempMinor`, label: 'BCU RT1过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 10 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}BcuRt2OvertempMinor`, label: 'BCU RT2过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 11 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}BcuRt3OvertempMinor`, label: 'BCU RT3过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 12 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}BcuRt4OvertempMinor`, label: 'BCU RT4过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 13 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}BcuRt5OvertempMinor`, label: 'BCU RT5过温告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 14 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}AnalogMinorFault1Reserved`, label: '预留', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault1`, bit: 15 }
    );
    
    // 第i簇轻微故障2 (2字节)
    schema.push({
      class: `第${i}簇模拟量轻微故障`,
      key: `Cluster${i}AnalogMinorFault2`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 轻微故障2的位定义
    schema.push(
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}PackVoltageUpperLimitMinor`, label: '电池包电压上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 0 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}PackVoltageLowerLimitMinor`, label: '电池包电压下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 1 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}PackTempUpperLimitMinor`, label: '电池包温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 2 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}PackTempLowerLimitMinor`, label: '电池包温度下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 3 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}PackPowerConnectorPosTempUpperLimitMinor`, label: '电池包动力接插件正极温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 4 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}PackPowerConnectorNegTempUpperLimitMinor`, label: '电池包动力接插件负极温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 5 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}CellVoltageUpperLimitMinor`, label: '单体电压上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 6 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}CellVoltageLowerLimitMinor`, label: '单体电压下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 7 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}ChargeCellTempUpperLimitMinor`, label: '充电单体温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 8 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}ChargeCellTempLowerLimitMinor`, label: '充电单体温度下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 9 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}DischargeCellTempUpperLimitMinor`, label: '放电单体温度上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 10 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}DischargeCellTempLowerLimitMinor`, label: '放电单体温度下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 11 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}CellSocUpperLimitMinor`, label: '单体SOC上限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 12 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}CellSocLowerLimitMinor`, label: '单体SOC下限告警', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 13 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}AnalogMinorFault2Reserved`, label: '预留', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 14 },
      { class: `第${i}簇模拟量轻微故障`, key: `Cluster${i}AnalogMinorFault2Reserved2`, label: '预留', type: 'bit', bitsOf: `Cluster${i}AnalogMinorFault2`, bit: 15 }
    );
  }
  
  return schema;
}

/* -------- 簇模拟量故障等级动态schema ---------- */
export function CLU_ANALOG_FAULT_GRADE_SCHEMA(clusterCount: number): PackField[] {
  const schema: PackField[] = [];
  
  for (let i = 1; i <= clusterCount; i++) {
    // 第i簇故障等级1 (2字节) - 8个故障类型，每个2位
    schema.push({
      class: `第${i}簇模拟量故障等级1`,
      key: `Cluster${i}AnalogFaultGrade1`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 故障等级1的位定义
    schema.push(
      { class: `第${i}簇模拟量故障等级1`, key: `Cluster${i}CellVoltageDiffFaultGrade`, label: '单体电压压差故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade1`, bit: 0, len: 2 },
      { class: `第${i}簇模拟量故障等级1`, key: `Cluster${i}CellTempDiffFaultGrade`, label: '单体温度温差故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade1`, bit: 2, len: 2 },
      { class: `第${i}簇模拟量故障等级1`, key: `Cluster${i}CellSocDiffFaultGrade`, label: '单体soc差故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade1`, bit: 4, len: 2 },
      { class: `第${i}簇模拟量故障等级1`, key: `Cluster${i}PackVoltageDiffFaultGrade`, label: '包端电压压差故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade1`, bit: 6, len: 2 },
      { class: `第${i}簇模拟量故障等级1`, key: `Cluster${i}ClusterVoltageOverFaultGrade`, label: '簇端电压过压故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade1`, bit: 8, len: 2 },
      { class: `第${i}簇模拟量故障等级1`, key: `Cluster${i}ClusterVoltageUnderFaultGrade`, label: '簇端电压欠压故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade1`, bit: 10, len: 2 },
      { class: `第${i}簇模拟量故障等级1`, key: `Cluster${i}InsulationResistancePosFaultGrade`, label: '绝缘电阻正对地报警等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade1`, bit: 12, len: 2 },
      { class: `第${i}簇模拟量故障等级1`, key: `Cluster${i}InsulationResistanceNegFaultGrade`, label: '绝缘电阻负对地报警等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade1`, bit: 14, len: 2 }
    );
    
    // 第i簇故障等级2 (2字节) - 8个故障类型，每个2位
    schema.push({
      class: `第${i}簇模拟量故障等级2`,
      key: `Cluster${i}AnalogFaultGrade2`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 故障等级2的位定义
    schema.push(
      { class: `第${i}簇模拟量故障等级2`, key: `Cluster${i}ChargeOvercurrentFaultGrade`, label: '充电过流故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade2`, bit: 0, len: 2 },
      { class: `第${i}簇模拟量故障等级2`, key: `Cluster${i}DischargeOvercurrentFaultGrade`, label: '放电过流故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade2`, bit: 2, len: 2 },
      { class: `第${i}簇模拟量故障等级2`, key: `Cluster${i}BcuRt1OvertempFaultGrade`, label: 'BCU RT1过温告警等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade2`, bit: 4, len: 2 },
      { class: `第${i}簇模拟量故障等级2`, key: `Cluster${i}BcuRt2OvertempFaultGrade`, label: 'BCU RT2过温告警等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade2`, bit: 6, len: 2 },
      { class: `第${i}簇模拟量故障等级2`, key: `Cluster${i}BcuRt3OvertempFaultGrade`, label: 'BCU RT3过温告警等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade2`, bit: 8, len: 2 },
      { class: `第${i}簇模拟量故障等级2`, key: `Cluster${i}BcuRt4OvertempFaultGrade`, label: 'BCU RT4过温告警等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade2`, bit: 10, len: 2 },
      { class: `第${i}簇模拟量故障等级2`, key: `Cluster${i}BcuRt5OvertempFaultGrade`, label: 'BCU RT5过温告警等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade2`, bit: 12, len: 2 },
      { class: `第${i}簇模拟量故障等级2`, key: `Cluster${i}AnalogFaultGrade2Reserved`, label: '预留', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade2`, bit: 14, len: 2 }
    );
    
    // 第i簇故障等级3 (2字节) - 8个故障类型，每个2位
    schema.push({
      class: `第${i}簇模拟量故障等级3`,
      key: `Cluster${i}AnalogFaultGrade3`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 故障等级3的位定义
    schema.push(
      { class: `第${i}簇模拟量故障等级3`, key: `Cluster${i}PackOvervoltageFaultGrade`, label: '包过压故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade3`, bit: 0, len: 2 },
      { class: `第${i}簇模拟量故障等级3`, key: `Cluster${i}PackUndervoltageFaultGrade`, label: '包欠压故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade3`, bit: 2, len: 2 },
      { class: `第${i}簇模拟量故障等级3`, key: `Cluster${i}PackOvertempFaultGrade`, label: '包过温故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade3`, bit: 4, len: 2 },
      { class: `第${i}簇模拟量故障等级3`, key: `Cluster${i}PackUndertempFaultGrade`, label: '包欠温故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade3`, bit: 6, len: 2 },
      { class: `第${i}簇模拟量故障等级3`, key: `Cluster${i}PackPowerConnectorPosOvertempFaultGrade`, label: '动力接插件正极过温故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade3`, bit: 8, len: 2 },
      { class: `第${i}簇模拟量故障等级3`, key: `Cluster${i}PackPowerConnectorNegOvertempFaultGrade`, label: '动力接插件负极过温故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade3`, bit: 10, len: 2 },
      { class: `第${i}簇模拟量故障等级3`, key: `Cluster${i}CellOvervoltageFaultGrade`, label: '单体电池过压故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade3`, bit: 12, len: 2 },
      { class: `第${i}簇模拟量故障等级3`, key: `Cluster${i}CellUndervoltageFaultGrade`, label: '单体电池欠压故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade3`, bit: 14, len: 2 }
    );
    
    // 第i簇故障等级4 (2字节) - 8个故障类型，每个2位
    schema.push({
      class: `第${i}簇模拟量故障等级4`,
      key: `Cluster${i}AnalogFaultGrade4`,
      type: 'u16',
      scale: 1,
      hide: false
    });
    
    // 故障等级4的位定义
    schema.push(
      { class: `第${i}簇模拟量故障等级4`, key: `Cluster${i}CellChargeOvertempFaultGrade`, label: '单体电池充电过温故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade4`, bit: 0, len: 2 },
      { class: `第${i}簇模拟量故障等级4`, key: `Cluster${i}CellChargeUndertempFaultGrade`, label: '单体电池充电欠温故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade4`, bit: 2, len: 2 },
      { class: `第${i}簇模拟量故障等级4`, key: `Cluster${i}CellDischargeOvertempFaultGrade`, label: '单体电池放电过温故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade4`, bit: 4, len: 2 },
      { class: `第${i}簇模拟量故障等级4`, key: `Cluster${i}CellDischargeUndertempFaultGrade`, label: '单体电池放电欠温故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade4`, bit: 6, len: 2 },
      { class: `第${i}簇模拟量故障等级4`, key: `Cluster${i}CellSocTooHighFaultGrade`, label: '单体soc过高故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade4`, bit: 8, len: 2 },
      { class: `第${i}簇模拟量故障等级4`, key: `Cluster${i}CellSocTooLowFaultGrade`, label: '单体soc过低故障等级', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade4`, bit: 10, len: 2 },
      { class: `第${i}簇模拟量故障等级4`, key: `Cluster${i}AnalogFaultGrade4Reserved`, label: '预留', type: 'bits', bitsOf: `Cluster${i}AnalogFaultGrade4`, bit: 12, len: 4 }
    );
    
  }
  
  return schema;
}
