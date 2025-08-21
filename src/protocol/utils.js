  //\src\protocol\utils.js 
  import {  PACK_SUMMARY,
            IO_STATUS_SCHEMA,
            HARDWARE_FAULT_SCHEMA,
            FAULT_LEVEL2_SCHEMA,
            FAULT_LEVEL3_SCHEMA,
            getCachedL3Schema,
            CELL_HEADER,
            BROKENWIRE_SCHEMA,
            BALANCE_STATUS_SCHEMA,
            CLU_ANALOG_FAULT_LEVEL_SUM_SCHEMA,
            CLU_ANALOG_FAULT_GRADE_SCHEMA,

  } from '../main/packSchemaFactory'//动态表解析
  import { SYS_BASE_PARAM_R, ERROR_CODES,CLUSTER_DNS_PARAM_R,PACK_DNS_PARAM_R,CELL_DNS_PARAM_R,
           REAL_TIME_SAVE_R, SOX_CFG_PARAM_R, SOC_CFG_PARAM_R, SOH_CFG_PARAM_R, BLOCK_SUMMARY, 
           BLOCK_VERSION, BLOCK_SYS_ABSTRACT, BLOCK_IO_STATUS, BLOCK_ANALOG_FAULT_LEVEL, BLOCK_ANALOG_FAULT_GRADE,
           BLOCK_COMMON_PARAM_R, BLOCK_TIME_CFG_R, BLOCK_PORT_CFG_R, BLOCK_DNS_PARAM_R,
           BLOCK_BATT_PARAM_R, BLOCK_COMM_DEV_CFG_R, BLOCK_OPERATE_CFG_R } from '../main/table'
  export const toBuf = hex => Buffer.from(hex.replace(/\s+/g, ''), 'hex')
  export const dv    = buf => new DataView(buf.buffer, buf.byteOffset, buf.byteLength)

  export const pick  = {
    u8 :(v,o)=>v.getUint8 (o),
    s8 :(v,o)=>v.getInt8  (o),
    u16:(v,o)=>v.getUint16(o, true),
    s16:(v,o)=>v.getInt16 (o, true),
    u32:(v,o)=>v.getUint32(o, true),
    s32:(v,o)=>v.getInt32 (o, true),
    f32: (view, off) => view.getFloat32(off, true),
    hex:(v,o)=>{
      const rawValue = v.getUint16(o, true);
      const hexResult = rawValue.toString(16).toUpperCase().padStart(4, '0');
      return hexResult;
    }
  }

   /* ---------- 通用表驱动解析 ---------- */
  export function parseByTable(view, table, start = 0){
    const ascii = new TextDecoder('ascii')
    const base  = {}
    let   off   = start
    const cache = {}                  // 存已读取寄存器，供 bit / bits 字段复用

    // 🔥🔥🔥 DEBUG: 显眼的调试日志 - 开始解析
    // console.log(`🔥🔥🔥 [PARSE_DEBUG] 开始解析表格，起始偏移: ${start}, 总字段数: ${table.length} 🔥🔥🔥`)

    // 🔥🔥🔥 DEBUG: 字段计数器
    let fieldCount = 0


    /* 取出 n 位 (len=1 ➜ 单 bit) ----------------------------------------- */
    const getBits = (val, from, len = 1) =>
      (val >> from) & ((1 << len) - 1);


    for (const fld of table){
      // 打印当前字段的 key, type, hide, valid 等属性，确认字段有没有进入解析逻辑
      // console.debug('[TABLE] check', fld.key, 'type=', fld.type,
                    // 'hide=', fld.hide, 'valid=', fld.valid);

      if (!('type' in fld) || typeof fld.type !== 'string') {
        continue;
      }

      const key   = fld.key
      const type  = fld.type
      const scale = fld.scale !== undefined ? fld.scale : 1  // 默认值处理
      fieldCount++

      // 隐藏/无效字段：旧语义不推进偏移，表层需要用 skipN 表达真实占位
      if (fld.hide === true || fld.valid === false) {
        continue
      }

      // 打印字段解析信息
      // console.log(`[PARSE_DEBUG] 解析字段: ${key} (${type}), 偏移: ${off}, 缓冲区长度: ${view.byteLength}`);
      
      const arrMatch = /^u8\[(\d+)]$/.exec(type)
        if(arrMatch){
          const len = Number(arrMatch[1])
          const arr = new Uint8Array(view.buffer, view.byteOffset + off, len)
          const result = Array.from(arr)
          base[key] = result
          cache[key] = result
          off += len
          continue
        }

      /* ---------- 位字段(bit) 解析（单 bit -> Boolean） ---------------- */
      if (type === 'bit'){                                             // ← 新增兼容
        const parentVal = cache[fld.bitsOf]          // 取所属寄存器原始值
        if (parentVal === undefined){
          throw new Error(`bit 字段 ${key} 所依赖的寄存器 ${fld.bitsOf} 尚未解析`)
        }
        base[key] = Boolean(parentVal & (1 << fld.bit))
        continue
      }

      /* ---------- 位段(bits) 解析（多 bit -> 数值 / map） -------------- */
      if (type === 'bits'){                                            // ← 新增类型
        const parentVal = cache[fld.bitsOf]
        if (parentVal === undefined){
          throw new Error(`bits 字段 ${key} 所依赖的寄存器 ${fld.bitsOf} 尚未解析`)
        }
        const raw = getBits(parentVal, fld.bit, fld.len || 1)          // 取 len 位
        // 若提供了 map（如告警等级 0/1/2/3）则映射，否则返回数值
        base[key] = {
          raw,                                  // 0-3
          txt: fld.map ? (fld.map[raw] ?? String(raw))
                    : String(raw)             // 若无 map → 返回数值字符串
        }
        continue
      }

      /* ---------- 跳过固定字节 ---------------------------------------- */
      if (type.startsWith('skip')){
        off += Number(type.slice(4))
        continue
      }

      /* ---------- IPv4 点分字符串（占4字节，按顺序 b0.b1.b2.b3） ------ */
      if (type === 'ipv4') {
        const b0 = view.getUint8(off)
        const b1 = view.getUint8(off + 1)
        const b2 = view.getUint8(off + 2)
        const b3 = view.getUint8(off + 3)
        base[key] = `${b0}.${b1}.${b2}.${b3}`
        cache[key] = base[key]
        off += 4
        continue
      }



      /* ---------- 固定长 ASCII 字符串 --------------------------------- */
      if (type.startsWith('str')){
        const len   = Number(type.slice(3))
        const bytes = new Uint8Array(view.buffer, view.byteOffset + off, len)
        base[key]   = ascii.decode(bytes).replace(/[^\x20-\x7E]/g, '')
        off        += len
        continue
      }

      const fn = pick[type]
        if(typeof fn!=='function'){
          throw new Error(`Unknown type "${type}" for key "${key}"`)
        }

         const rawVal = fn(view, off);
         
         // hex类型不需要进行scale处理，直接使用字符串值
         if (type === 'hex') {
           base[key] = rawVal;
         } else {
           base[key] = rawVal / (fld.scale ?? 1);
         }
         cache[key] = rawVal;

          off += ({ u8:1, s8:1, u16:2, s16:2, u32:4, s32:4, hex:2 })[type];
        

    }

    return { baseConfig: base, nextOffset: off }
  }

  /* ---------- 专门用于PACK_SUMMARY的解析函数 ---------- */
  // valid=false的字段会跳过解析但仍然推进偏移，确保数据对齐正确
  export function parseByTableWithSkip(view, table, start = 0){
    const ascii = new TextDecoder('ascii')
    const base  = {}
    let   off   = start
    const cache = {}                  // 存已读取寄存器，供 bit / bits 字段复用

    /* 取出 n 位 (len=1 ➜ 单 bit) ----------------------------------------- */
    const getBits = (val, from, len = 1) =>
      (val >> from) & ((1 << len) - 1);

    for (const fld of table){
      if (!('type' in fld) || typeof fld.type !== 'string') {
        continue;
      }

      const key   = fld.key
      const type  = fld.type
      const scale = fld.scale !== undefined ? fld.scale : 1

      // 关键修改：对于valid=false的字段，推进偏移但不存储结果
      const shouldStore = fld.valid !== false && fld.hide !== true;

      /* ---------- 位字段(bit) 解析（单 bit -> Boolean） ---------------- */
      if (type === 'bit'){
        const parentVal = cache[fld.bitsOf]
        if (parentVal === undefined){
          throw new Error(`bit 字段 ${key} 所依赖的寄存器 ${fld.bitsOf} 尚未解析`)
        }
        if (shouldStore) {
          base[key] = Boolean(parentVal & (1 << fld.bit))
        }
        continue
      }

      /* ---------- 位段字段(bits) 解析 ---------------------------------- */
      if (type === 'bits'){
        const parentVal = cache[fld.bitsOf]
        if (parentVal === undefined){
          throw new Error(`bits 字段 ${key} 所依赖的寄存器 ${fld.bitsOf} 尚未解析`)
        }
        const rawBits = getBits(parentVal, fld.bit, fld.len)
        if (shouldStore) {
          if (fld.map && fld.map[rawBits] !== undefined) {
            base[key] = { raw: rawBits, txt: fld.map[rawBits] }
          } else {
            base[key] = rawBits
          }
        }
        continue
      }

      /* ---------- 跳过字段 -------------------------------------------- */
      if (type.startsWith('skip')) {
        const n = parseInt(type.replace('skip', '')) || 0
        off += n
        continue
      }

      /* ---------- 普通字段解析 ---------------------------------------- */
      let rawValue
      try {
        switch (type) {
          case 'u8':  rawValue = view.getUint8(off, true);  off += 1; break
          case 's8':  rawValue = view.getInt8(off, true);   off += 1; break
          case 'u16': rawValue = view.getUint16(off, true); off += 2; break
          case 's16': rawValue = view.getInt16(off, true);  off += 2; break
          case 'u32': rawValue = view.getUint32(off, true); off += 4; break
          case 's32': rawValue = view.getInt32(off, true);  off += 4; break
          case 'f32': rawValue = view.getFloat32(off, true); off += 4; break
          case 'hex':
            rawValue = view.getUint16(off, true)
            off += 2
            if (shouldStore) {
              // 当原始值为0时显示 "--"，否则显示十六进制值
              base[key] = rawValue === 0 ? '--' : rawValue.toString(16).padStart(4, '0').toUpperCase()
            }
            continue
          case 'str2':
            const b1 = view.getUint8(off, true)
            const b2 = view.getUint8(off + 1, true)
            off += 2
            if (shouldStore) {
              // 修复字节顺序：b2 b1，并处理空值情况
              const decoded = ascii.decode(new Uint8Array([b2, b1])).replace(/\0/g, '')
              base[key] = decoded || '--'  // 如果为空，显示 '--'
            }
            continue
          default:
            throw new Error(`未知字段类型: ${type}`)
        }

        // 存储到cache供bit/bits字段使用
        cache[key] = rawValue

        // 只有shouldStore为true时才存储到结果中
        if (shouldStore) {
          base[key] = rawValue / scale
        }

      } catch (error) {
        console.error(`解析字段 ${key} 时出错:`, error)
        throw error
      }
    }

    return { baseConfig: base, nextOffset: off }
  }

  export function groupByClass(schema, flat) {
    const sections = {}
    for (const field of schema) {
      if (!field.label || (typeof field.type === 'string' && field.type.startsWith('skip'))) {
        continue
      }
      const cls = field.class || '配置'
      if (!sections[cls]) sections[cls] = []

      const rawValue = flat[field.key]

      if (rawValue === undefined || rawValue === null) continue

      const value = field.map && field.map[rawValue] !== undefined
        ? field.map[rawValue]
        : rawValue

      sections[cls].push({ label: field.label, value })
    }

    return Object.entries(sections).map(([cls, elems]) => ({
      class: cls,
      element: elems
    }))
  }

  export function serialize(schema, dataObj, offset, length) {

    /* === ① 计算整表寄存器数 & 序列化成 full Buffer =============== */
    const totalWords = schema.reduce((sum, f) => {
      if (f.type.startsWith('skip'))                      return sum + Number(f.type.slice(4))/2;
      if (f.type.startsWith('u32') || f.type.startsWith('s32')) return sum + 2;
      if (f.type === 'ipv4')                                   return sum + 2; // 4 字节 = 2 寄存器
      return sum + (f.count || 1);
    }, 0);

    const full = Buffer.alloc(totalWords * 2);  // 所有寄存器 → 字节
    let pos = 0;

    const put16 = (v, signed) =>
      signed ? full.writeInt16BE(v, pos) : full.writeUInt16BE(v & 0xFFFF, pos),
      inc = () => { pos += 2 };

    for (const f of schema) {
      const { key, type, count = 1, scale = 1 } = f;

      /* skipN: 直接占位 */
      if (type.startsWith('skip')) { pos += Number(type.slice(4)); continue; }

      /* IPv4：点分字符串写入4字节（a.b.c.d） -> 两个寄存器 */
      if (type === 'ipv4') {
        const raw = dataObj[key]
        let b0=0, b1=0, b2=0, b3=0
        if (typeof raw === 'string') {
          const parts = raw.trim().split('.')
          if (parts.length === 4) {
            b0 = Math.min(255, Math.max(0, Number(parts[0] ?? 0)))|0
            b1 = Math.min(255, Math.max(0, Number(parts[1] ?? 0)))|0
            b2 = Math.min(255, Math.max(0, Number(parts[2] ?? 0)))|0
            b3 = Math.min(255, Math.max(0, Number(parts[3] ?? 0)))|0
          }
        } else if (typeof raw === 'number' && Number.isFinite(raw)) {
          const v = (raw * scale) >>> 0
          b0 = v & 0xFF
          b1 = (v >>> 8) & 0xFF
          b2 = (v >>> 16) & 0xFF
          b3 = (v >>> 24) & 0xFF
        }
        // 直接按字节顺序写入（每寄存器内部为BE，但这里逐字节写更直观）
        full[pos]   = b0; pos += 1
        full[pos]   = b1; pos += 1
        full[pos]   = b2; pos += 1
        full[pos]   = b3; pos += 1
        continue
      }



      /* 32bit：拆成高低两寄存器 */
      if (type.startsWith('u32') || type.startsWith('s32')) {
        const v = (dataObj[key] ?? 0) * scale >>> 0;
        put16(v >>> 16, false); inc();   // 高 16
        put16(v       , false); inc();   // 低 16
        continue;
      }

      /* 数组字段 */
      if (count > 1) {
        const arr = dataObj[key] || [];
        const signed = type.startsWith('s');
        for (let i = 0; i < count; i++) { put16((arr[i] ?? 0) * scale, signed); inc(); }
        continue;
      }

      /* 普通 16 位 */
      put16((dataObj[key] ?? 0) * scale, type.startsWith('s')); inc();
    }

    /* === ② 截取 offset~offset+length 的寄存器片段 ================= */
    const slice = full.slice(offset*2, (offset+length)*2);

    /* === ③ 拼头部 offset/length & 返回 ============================ */
    const head = Buffer.alloc(4);
    head.writeUInt16BE(offset, 0);
    head.writeUInt16BE(length, 2);

    return Buffer.concat([head, slice]);   // 最终 payload
  }

  export function processPackSummaryRAW(hexString) {
    const buf = toBuf(hexString);
    const view = dv(buf);

    // 1. 解析 DataLength 和 bmuTotal
    const { baseConfig: head, nextOffset: off1 } =
      parseByTable(view, [{ key: 'DataLength', type: 'u16' }], 0);
    const bmuTotal = view.getUint8(off1, true);
    const off2 = off1 + 1;

    // 2. 生成完整 schema（32 BMU + 故障 + 32 Volt + 32 Temp + ...）
    const schema = PACK_SUMMARY(bmuTotal);

    // 3. 按 schema 完整解析 buffer - 使用新的解析函数
    const { baseConfig: bodyFlat } =
      parseByTableWithSkip(view, schema, off2);



    // 5. 分组并截断前 BMU 数量的数据
    const grouped = groupByClass(schema, bodyFlat);

    // const result = grouped.map(block => {
    //   if (block.class === '失联信息') return block;
    //   return {
    //     class: block.class,
    //     element: block.element.slice(0, bmuTotal)
    //   };
    // });

    // return {
    //   baseConfig: { DataLength: head.DataLength, bmuTotal },
    //   data: result
    // };



     // 封装消息
  return {
    baseConfig: { DataLength: head.DataLength, bmuTotal },
    data      : grouped
  };
}


  

  //解析IO数据
  export function processIoStatusRAW(hexString) {
    const buf  = toBuf(hexString);
    const view = dv(buf);

    /* 1. 先读 DataLength 2B */
    const { baseConfig: head, nextOffset: off1 } =
      parseByTable(view, [{ key: 'DataLength', type: 'u16' }], 0);

    /* 2. 再读 BMU Total 2B */
    const bmuTotal = view.getUint8(off1, true);
    const off2     = off1 + 1;

    /* 3. 动态 schema */
    const schema = IO_STATUS_SCHEMA(bmuTotal);

    /* 4. 正文解析 */
    const { baseConfig: flat } = parseByTable(view, schema, off2);

    /* 5. 分组输出 */
    return {
      baseConfig: { DataLength: head.DataLength, bmuTotal },
      data:      groupByClass(schema, flat)
    };
  }

  //解析硬件故障数据
  export function processHardwareFaultRAW (hex) {
  const buf  = toBuf(hex)
  const view = dv(buf)

  // ① 读 DataLength
  const { baseConfig: head, nextOffset: o1 } =
    parseByTable(view, [{ key:'DataLength', type:'u16' }], 0)

  // ② 读 BMU 数量 
  const bmuTotal = view.getUint8(o1, true)
  const o2       = o1 + 1     // 若协议还有 1B 对齐，再 +1

  // ③ schema & 正文解析
  const schema = HARDWARE_FAULT_SCHEMA(bmuTotal)
  const { baseConfig: flat }  = parseByTable(view, schema, o2)

  return {
    baseConfig: { DataLength: head.DataLength, bmuTotal },
    data:       groupByClass(schema, flat)
  }
  }

  //解析二级故障数据
  export function processSecondFaultRAW (hex) {
  const buf  = toBuf(hex)
  const view = dv(buf)

  // ① 读 DataLength
  const { baseConfig: head, nextOffset: o1 } =
    parseByTable(view, [{ key:'DataLength', type:'u16' }], 0)

  // ② 读 BMU 数量 
  const bmuTotal = view.getUint8(o1, true)
  const o2       = o1 + 1     // 若协议还有 1B 对齐，再 +1

  // ③ schema & 正文解析
  const schema = FAULT_LEVEL2_SCHEMA(bmuTotal)
  const DEBUG_SCHEMA = false 
  if (DEBUG_SCHEMA) {
        // console.log('=== SCHEMA START ===')
      schema.slice(0, 20).forEach((f, i) =>
        console.log(i, f.key, f.type, f.bitsOf ?? '')
      )
      // console.log('   ... total fields:', schema.length)
      // console.log('=== SCHEMA END ===')
    }
  const { baseConfig: flat }  = parseByTable(view, schema, o2)

  return {
    baseConfig: { DataLength: head.DataLength, bmuTotal },
    data:       groupByClass(schema, flat)
  }
  }


  //解析三级故障数据
export function processThirdFaultRAW(hex, kind) {
  const buf = Buffer.from(hex.replace(/\s+/g, ''), 'hex');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const { baseConfig: head, nextOffset } = parseByTable(view, CELL_HEADER, 0);
  const afeCellCounts = Array.from({length:16}, (_,i)=>head[`afeCell${i+1}`]);
  const afeTempCounts = Array.from({ length: 16 }, (_, i) => head[`afeTemp${i+1}`])
  const schema = getCachedL3Schema(kind, {
    bmuTotal: head.bmuTotal,
    afePerBmu: head.afePerBmu,
    afeCellCounts,
    afeTempCounts
  });
  const { baseConfig: flat } = parseByTable(view, schema, nextOffset);
  return {
    baseConfig: {
      totalCell: head.totalCell,
      totalTemp: head.totalTemp,
      bmuTotal: head.bmuTotal,
      afePerBmu: head.afePerBmu,
      afeCellCounts,
      afeTempCounts,
    },
    data: groupByClass(schema, flat)
  };
}

  /**
   * 由故障 label 解析出 BMU 号、AFE 号、BMU 内电芯号。
   * @param {string} label  如 "BMU3 第 17 节 单体电池过压"
   * @param {object} cfg    baseConfig（可缺省）
   */
export function locateCell (label, cfg = {}) {
    // ① 解析 BMU 与在 BMU 内的 cell 序号
    const bmu        = +(label.match(/^BMU(\d+)/)?.[1] || 0);
    const cellInBmu  = +(label.match(/第\s*(\d+)\s*节/)?.[1] || 0);

    // ② 如果没有cell序号，说明是BMU级别故障，AFE和cell应该为null
    if (cellInBmu === 0) {
      return { bmu, afe: null, cellInBmu: null };
    }

    // ③ 由 cellInBmu → 推算 AFE
    const { afePerBmu = 4, afeCellCounts = [] } = cfg;
    const cellsPerAfe = afeCellCounts.slice(0, afePerBmu);
    let sum = 0, afe = 0;
    for (let i = 0; i < cellsPerAfe.length; i++) {
      const span = cellsPerAfe[i] || 0;
      if (cellInBmu <= sum + span) { afe = i + 1; break; }
      sum += span;
    }
    return { bmu, afe, cellInBmu };
}

// 解析掉线信息 
export function processBrokenwireRAW(hexString) {
  /* ---------- ① HEX → DataView ------------------------------------ */
  const buf  = toBuf(hexString)          // 把十六进制字符串变成 Buffer
  const view = dv(buf)                   // DataView 方便按字节读取

  /* ---------- ② 解析 40 B 表头（CELL_HEADER） ---------------------- */
  const { baseConfig: head, nextOffset: offHdr } =
    parseByTable(view, CELL_HEADER, 0)

  // 把 AFE-Cell / AFE-Temp 个数整理成数组，后面生成 schema 要用
  const afeCellCounts = Array.from({ length: 16 }, (_, i) => head[`afeCell${i + 1}`])
  const afeTempCounts = Array.from({ length: 16 }, (_, i) => head[`afeTemp${i + 1}`])

  /* ---------- ③ 生成动态 schema ----------------------------------- */
  // BROKENWIRE_SCHEMA 会根据 BMU 数、AFE 数等自动裁剪 / 标记 valid
  const schema = BROKENWIRE_SCHEMA({
    bmuTotal     : head.bmuTotal,
    afePerBmu    : head.afePerBmu,
    totalCell    : head.totalCell,
    totalTemp    : head.totalTemp,
    afeCellCounts,
    afeTempCounts
  })

  /* ---------- ④ 解析正文 (556 × 2 B) ------------------------------- */
  const { baseConfig: flat } = parseByTable(view, schema, offHdr)

  /* ---------- ⑤ 整理输出 ------------------------------------------ */
  return {
    baseConfig : {
      totalCell    : head.totalCell,
      totalTemp    : head.totalTemp,
      bmuTotal     : head.bmuTotal,
      afePerBmu    : head.afePerBmu,
      afeCellCounts,
      afeTempCounts
    },
    data : groupByClass(schema, flat)    // [{ class:'BMU失联状态', element:[...] }, ...]
  }
}

// 解析均衡状态
export function processBalanceRAW(hexString) {
  /* ---------- ① HEX → DataView ---------------------------------- */
  const buf  = toBuf(hexString);        // 把十六进制字符串变成 Buffer
  const view = dv(buf);                 // DataView 方便按字节读取

  /* ---------- ② 解析 40 B 表头（CELL_HEADER） --------------------- */
  const { baseConfig: head, nextOffset: offHdr } =
    parseByTable(view, CELL_HEADER, 0);

  // 整理 AFE-Cell / AFE-Temp 个数成扁平数组（和失联解析相同）
  const afeCellCounts = Array.from({ length: 16 }, (_, i) => head[`afeCell${i + 1}`]);
  const afeTempCounts = Array.from({ length: 16 }, (_, i) => head[`afeTemp${i + 1}`]);

  /* ---------- ③ 生成动态 schema（均衡） --------------------------- */
  const schema = BALANCE_STATUS_SCHEMA({
    bmuTotal     : head.bmuTotal,
    afePerBmu    : head.afePerBmu,
    totalCell    : head.totalCell,
    totalTemp    : head.totalTemp,
    afeCellCounts,
    afeTempCounts
  });

  /* ---------- ④ 解析正文（长度由 schema 决定） -------------------- */
  const { baseConfig: flat } = parseByTable(view, schema, offHdr);

  /* ---------- ⑤ 输出 -------------------------------------------- */
  return {
    baseConfig : {
      totalCell    : head.totalCell,
      totalTemp    : head.totalTemp,
      bmuTotal     : head.bmuTotal,
      afePerBmu    : head.afePerBmu,
      afeCellCounts,
      afeTempCounts
    },
    data : groupByClass(schema, flat)   // [{ class:'均衡状态', element:[...] }, ...]
  };
}

// 解析堆IO状态数据
export function processBlockIoStatusRAW(hexString) {
  const buf  = toBuf(hexString);
  const view = dv(buf);

  /* 1. 先读 DataLength 2B */
  const { baseConfig: head, nextOffset: off1 } =
    parseByTable(view, [{ key: 'DataLength', type: 'u16' }], 0);

  /* 2. 解析堆IO状态 - 6个寄存器，每个2字节，总共12字节 */
  const schema = BLOCK_IO_STATUS;

  /* 3. 正文解析 */
  const { baseConfig: flat } = parseByTable(view, schema, off1);

  /* 4. 分组输出 */
  return {
    baseConfig: { DataLength: head.DataLength },
    data:      groupByClass(schema, flat)
  };
}


// 解析写入响应 - 通用函数，适用于所有参数类型的写入响应
export function parseWriteResponse(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  if (buf.length === 0) return null;

  // 写入响应: 1字节状态码 (0xE0成功,0xE1失败,0xE2超时,0xE3繁忙,0xE4参数错误)
  if (buf.length === 1) {
    const statusCode = buf.readUInt8(0);
    const isSuccess = statusCode === 0xE0;

    console.log(`write response: ${statusCode.toString(16)} (${ERROR_CODES[statusCode] || '未知状态'})`);

    return {
      error: !isSuccess,
      baseConfig: {},
      data: {
        code: statusCode,
        message: ERROR_CODES[statusCode] || '未知状态',
        success: isSuccess
      }
    };
  }

  // 如果不是1字节，可能是异常响应
      console.warn(`write response unexpected length: ${buf.length}`);
  return {
    error: true,
    baseConfig: {},
    data: {
      code: 0xFF,
      message: '响应格式异常',
      success: false
    }
  };
}

// ========== 遥控命令响应解析函数 ==========

/**
 * @param {string|Buffer} payload - 响应数据
 * @param {string} commandTopic - 命令主题（用于日志）
 * @returns {Object} 解析结果
 */
export function parseRemoteCommandResponse(payload, commandTopic = 'unknown') {
  try {
    // 复用现有的写入响应解析逻辑
    const baseResult = parseWriteResponse(payload)

    if (!baseResult) {
      return {
        error: true,
        commandType: 'remote_command',
        topic: commandTopic,
        data: {
          code: 0xFF,
          message: '响应数据为空',
          success: false
        }
      }
    }

    // 添加遥控命令特有的信息
    const result = {
      ...baseResult,
      commandType: 'remote_command',
      topic: commandTopic,
      timestamp: Date.now()
    }

    // 记录遥控命令响应日志
    const logLevel = result.error ? 'error' : 'info'
    console[logLevel](`[RemoteCommand] ${commandTopic} 响应:`, {
      success: result.data.success,
      code: `0x${result.data.code.toString(16).toUpperCase()}`,
      message: result.data.message
    })

    return result

  } catch (error) {
    console.error(`[RemoteCommand] ${commandTopic} 响应解析失败:`, error)

    return {
      error: true,
      commandType: 'remote_command',
      topic: commandTopic,
      timestamp: Date.now(),
      data: {
        code: 0xFF,
        message: `响应解析失败: ${error.message}`,
        success: false
      }
    }
  }
}

/**
 * 创建特定遥控命令的解析函数工厂
 * 用于在 TOPIC_TABLE_MAP 中注册解析函数
 * @param {string} commandTopic - 命令主题
 * @returns {Function} 解析函数
 */
export function createRemoteCommandParser(commandTopic) {
  return (payload) => {
    return parseRemoteCommandResponse(payload, commandTopic)
  }
}

// ========== 查询应答解析函数 ==========

/**
 * 解析查询应答数据
 * @param {string|Buffer} payload - 响应数据
 * @param {string} commandTopic - 命令主题
 * @returns {Object} 解析结果
 */
export function parseQueryResponse(payload, commandTopic = 'unknown') {
  try {
    const buf = Buffer.isBuffer(payload)
                ? payload
                : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

    if (buf.length === 0) {
      return {
        error: true,
        commandType: 'query_command',
        topic: commandTopic,
        data: {
          code: 0xFF,
          message: '响应数据为空',
          success: false
        }
      }
    }

    // 查询应答: 可能是1字节错误码或2字节状态数据
    if (buf.length === 1) {
      // 1字节 - 错误应答 (e1, e2, 等等)
      const statusCode = buf.readUInt8(0);
      const isSuccess = statusCode === 0xE0;

      console.log(`[查询应答] 错误码: 0x${statusCode.toString(16).toUpperCase()} (${ERROR_CODES[statusCode] || '未知状态'})`);

      return {
        error: !isSuccess,
        commandType: 'query_command',
        topic: commandTopic,
        data: {
          code: statusCode,
          message: ERROR_CODES[statusCode] || '未知状态',
          success: isSuccess
        }
      };
    } else if (buf.length === 2) {
      // 2字节 - 成功应答，包含状态数据
      const statusValue = buf.readUInt16LE(0); // 小端序读取u16

      console.log(`[查询应答] 状态数据: 0x${statusValue.toString(16).toUpperCase().padStart(4, '0')} (${statusValue})`);

      return {
        error: false,
        commandType: 'query_command',
        topic: commandTopic,
        data: {
          value: statusValue,
          success: true
        }
      };
    } else {
      // 其他长度 - 异常响应
      console.warn(`[查询应答] 意外的响应长度: ${buf.length}`);
      return {
        error: true,
        commandType: 'query_command',
        topic: commandTopic,
        data: {
          code: 0xFF,
          message: '响应格式异常',
          success: false
        }
      };
    }

  } catch (error) {
    console.error(`[查询应答] 解析失败:`, error);
    return {
      error: true,
      commandType: 'query_command',
      topic: commandTopic,
      data: {
        code: 0xFF,
        message: `解析错误: ${error.message}`,
        success: false
      }
    };
  }
}

/**
 * 创建查询命令解析函数工厂
 * @param {string} commandTopic - 命令主题
 * @returns {Function} 解析函数
 */
export function createQueryCommandParser(commandTopic) {
  return (payload) => {
    return parseQueryResponse(payload, commandTopic)
  }
}

// 解析 sys_base_param_r 原始数据
export function parseSysBaseParamRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  // console.log(buf)
  if (buf.length === 0) return null;
  // 失败响应: 1字节错误码 (0xE1失败,0xE2超时,0xE3繁忙)
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0); 
    // 返回错误对象，或者交由上层统一处理
    console.error(`sys_base_param_r error: ${errorCode}`);
      return {
      error: true,
      baseConfig: {},
      data: {
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };    
  }

  
  // 成功响应: 前2字节为数据长度 (字节数)，后续为参数数据
  const dataLen = buf.readUInt16LE(0);  // 从payload提取长度（假定网络字节序）
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    // console.warn(`sys_base_param_r length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

    /* ----------  把 Buffer → DataView ---------- */
  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按SYS_BASE_PARAM_R定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, SYS_BASE_PARAM_R);
  return { error: false, data: baseConfig };
}


// 解析 block_common_param_r 原始数据（堆通用配置参数）
export function parseBlockCommonParamRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  if (buf.length === 0) return null;
  // 失败响应: 1字节错误码（与 sys_base_param_r 风格一致）
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0);
    return {
      error: true,
      baseConfig: {},
      data: {
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };
  }

  // 成功响应: 前2字节为数据长度 (字节数)，后续为参数数据
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseBlockCommonParamRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  const { baseConfig } = parseByTable(view, BLOCK_COMMON_PARAM_R);

  // ====== 调试打印：关键字段按字节偏移读取值，用于核对解析是否正确 ======
  try {
    // 该结构从长度之后开始，字段顺序与 BLOCK_COMMON_PARAM_R 相同。
    // 注意：InternalTestMode 后在表中定义了 10 个 ReservedX(u16) 字段，这些字节实际存在于载荷中。
    // 因此 BlockCount 的真实字节偏移为 30（= 5个u16×2 + 10个u16×2）。
    const u16 = (off) => paramsBuf.readUInt16LE(off);
    const debugSnapshot = {
      RemoteLocalMode: u16(0),
      SplitClusterFlag: u16(2),
      EMSCommFaultDisconnectEnable: u16(4),
      MaintainMode: u16(6),
      InternalTestMode: u16(8),
      // Reserved1..10: 10 个 u16（偏移 10~28），此处略过
      BlockCount_RAW_at_30: paramsBuf.length >= 32 ? u16(30) : undefined,
      ClusterCount1_RAW_at_32: paramsBuf.length >= 34 ? u16(32) : undefined,
      ClusterCount2_RAW_at_34: paramsBuf.length >= 36 ? u16(34) : undefined,
      Parsed: {
        RemoteLocalMode: baseConfig.RemoteLocalMode,
        SplitClusterFlag: baseConfig.SplitClusterFlag,
        EMSCommFaultDisconnectEnable: baseConfig.EMSCommFaultDisconnectEnable,
        MaintainMode: baseConfig.MaintainMode,
        InternalTestMode: baseConfig.InternalTestMode,
        BlockCount: baseConfig.BlockCount,
        ClusterCount1: baseConfig.ClusterCount1,
        ClusterCount2: baseConfig.ClusterCount2
      }
    }
    // console.log('[BlockCommonParam][DEBUG]', {
    //   dataLen,
    //   payloadBytes: paramsBuf.length,
    //   fields: debugSnapshot
    // })
  } catch (e) {
    console.warn('[BlockCommonParam][DEBUG] snapshot failed:', e?.message)
  }

  return { error: false, data: baseConfig };
}

  // 解析 block_time_cfg_r 原始数据（设备时间设置）
  export function parseBlockTimeCfgRAW(payload) {
    const buf = Buffer.isBuffer(payload)
                ? payload
                : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

    if (buf.length === 0) return null;
    if (buf.length === 1) {
      const errorCode = buf.readUInt8(0);
      return {
        error: true,
        baseConfig: {},
        data: { code: errorCode, message: ERROR_CODES[errorCode] || '未知错误' }
      };
    }

    const dataLen = buf.readUInt16LE(0);
    const paramsBuf = buf.slice(2);
    if (paramsBuf.length !== dataLen) {
      console.warn(`[parseBlockTimeCfgRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
    }
    const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
    const { baseConfig } = parseByTable(view, BLOCK_TIME_CFG_R);
    return { error: false, data: baseConfig };
  }

  // 解析 block_port_cfg_r 原始数据（系统端口配置参数）
  export function parseBlockPortCfgRAW(payload) {
    const buf = Buffer.isBuffer(payload)
                ? payload
                : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

    if (buf.length === 0) return null;
    if (buf.length === 1) {
      const errorCode = buf.readUInt8(0);
      return {
        error: true,
        baseConfig: {},
        data: { code: errorCode, message: ERROR_CODES[errorCode] || '未知错误' }
      };
    }

    const dataLen = buf.readUInt16LE(0);
    const paramsBuf = buf.slice(2);
    if (paramsBuf.length !== dataLen) {
      console.warn(`[parseBlockPortCfgRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
    }
    const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
    const { baseConfig } = parseByTable(view, BLOCK_PORT_CFG_R);
    return { error: false, data: baseConfig };
  }

// 解析 cluster_dns_param_r 原始数据
export function parseClusterDnsParamRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  // console.log(buf)
  if (buf.length === 0) return null;
  // 失败响应: 1字节错误码 (0xE1失败,0xE2超时,0xE3繁忙)
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0); 
    // 返回错误对象，或者交由上层统一处理
    console.error(`cluster_dns_param_r error: ${errorCode}`);
      return {
      error: true,
      baseConfig: {},
      data: {
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };    
  }
  // 成功响应: 前2字节为数据长度 (字节数)，后续为参数数据
  const dataLen = buf.readUInt16LE(0);  // 从payload提取长度（假定网络字节序）
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`cluster_dns_param_r length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

    /* ----------  把 Buffer → DataView ---------- */
  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按CLUSTER_DNS_PARAM_R定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, CLUSTER_DNS_PARAM_R);
  return { error: false, data: baseConfig };
}

// 解析 pack_dns_param_r 原始数据
export function parsePackDnsParamRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  // console.log(buf)
  if (buf.length === 0) return null;
  // 失败响应: 1字节错误码 (0xE1失败,0xE2超时,0xE3繁忙)
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0); 
    // 返回错误对象，或者交由上层统一处理
    console.error(`pack_dns_param_r error: ${errorCode}`);
      return {
      error: true,
      baseConfig: {},
      data: {
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };    
  }
  // 成功响应: 前2字节为数据长度 (字节数)，后续为参数数据
  const dataLen = buf.readUInt16LE(0);  // 从payload提取长度（假定网络字节序）
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`pack_dns_param_r length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

    /* ----------  把 Buffer → DataView ---------- */
  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按PACK_DNS_PARAM_R定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, PACK_DNS_PARAM_R);
  return { error: false, data: baseConfig };
}

// 解析 cell_dns_param_r 原始数据
export function parseCellDnsParamRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  // console.log(buf)
  if (buf.length === 0) return null;
  // 失败响应: 1字节错误码 (0xE1失败,0xE2超时,0xE3繁忙)
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0); 
    // 返回错误对象，或者交由上层统一处理
    console.error(`cell_dns_param_r error: ${errorCode}`);
      return {
      error: true,
      baseConfig: {},
      data: {
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };    
  }
  // 成功响应: 前2字节为数据长度 (字节数)，后续为参数数据
  const dataLen = buf.readUInt16LE(0);  // 从payload提取长度（假定网络字节序）
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`cell_dns_param_r length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

    /* ----------  把 Buffer → DataView ---------- */
  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按CELL_DNS_PARAM_R定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, CELL_DNS_PARAM_R);
  return { error: false, data: baseConfig };
}

// 解析 block_fault_dns_r 原始数据（堆端报警阈值）
export function parseBlockDnsParamRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  if (buf.length === 0) return null;
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0);
    return {
      error: true,
      baseConfig: {},
      data: { code: errorCode, message: ERROR_CODES[errorCode] || '未知错误' }
    };
  }
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`block_fault_dns_r length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }
  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  const { baseConfig } = parseByTable(view, BLOCK_DNS_PARAM_R);
  return { error: false, data: baseConfig };
}

// 解析 real_time_save_r 原始数据
export function parseRealTimeSaveRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  // console.log(buf)
  console.log(`[parseRealTimeSaveRAW] 收到数据长度: ${buf.length} 字节`)

  // 检查响应状态
  if (buf.length < 2) {
    console.error('[parseRealTimeSaveRAW] 数据长度不足，无法解析数据')
    return { error: true, message: '数据长度不足' }
  }
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseRealTimeSaveRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }
  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  const { baseConfig } = parseByTable(view, REAL_TIME_SAVE_R);
  return { error: false, data: baseConfig };
}

// 解析 sox_cfg_param_r 原始数据
export function parseSOXCfgParamRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');
  // console.log(buf)
  if (buf.length < 2) {
    console.error('[parseSOXCfgParamRAW] 数据长度不足，无法解析数据')
    return { error: true, message: '数据长度不足' }
  }
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseSOXCfgParamRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }
  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  const { baseConfig } = parseByTable(view, SOX_CFG_PARAM_R);
  return { error: false, data: baseConfig };
}

// 解析 soc_cfg_param_r 原始数据
export function parseSOCCfgParamRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');
  // console.log(buf)
  if (buf.length < 2) {
    console.error('[parseSOCCfgParamRAW] 数据长度不足，无法解析数据')
    return { error: true, message: '数据长度不足' }
  }
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseSOCCfgParamRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }
  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  const { baseConfig } = parseByTable(view, SOC_CFG_PARAM_R);
  return { error: false, data: baseConfig };
}

// 解析 soh_cfg_param_r 原始数据
export function parseSOHCfgParamRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');
  // console.log(buf)
  if (buf.length < 2) {
    console.error('[parseSOHCfgParamRAW] 数据长度不足，无法解析数据')
    return { error: true, message: '数据长度不足' }
  }
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseSOHCfgParamRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }
  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  const { baseConfig } = parseByTable(view, SOH_CFG_PARAM_R);
  return { error: false, data: baseConfig };
}


// 解析堆汇总信息原始数据
export function parseBlockSummaryRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  // console.log(buf)
  if (buf.length === 0) return null;
  
  // 堆汇总信息有数据长度前缀，前2字节为数据长度
  const dataLen = buf.readUInt16LE(0);  // 从payload提取长度
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`block_summary length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  // 堆汇总信息是遥测数据，直接解析，不需要错误码处理
  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按BLOCK_SUMMARY定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, BLOCK_SUMMARY);
  return { error: false, data: baseConfig };
}

// 解析堆版本信息原始数据
export function parseBlockVersionRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  // console.log(buf)
  if (buf.length === 0) return null;
  
  // 堆版本信息有数据长度前缀，前2字节为数据长度
  const dataLen = buf.readUInt16LE(0);  // 从payload提取长度
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`block_version length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  // 堆版本信息是遥测数据，直接解析，不需要错误码处理
  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按BLOCK_VERSION定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, BLOCK_VERSION);
  return { error: false, data: baseConfig };
}

// 解析堆系统概要信息原始数据
export function parseBlockSysAbstractRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  // console.log(buf)
  if (buf.length === 0) return null;
  
  // 堆系统概要信息有数据长度前缀，前2字节为数据长度
  const dataLen = buf.readUInt16LE(0);  // 从payload提取长度
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`block_sys_abstract length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  // 堆系统概要信息是遥测数据，直接解析，不需要错误码处理
  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按BLOCK_SYS_ABSTRACT定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, BLOCK_SYS_ABSTRACT);
  return { error: false, data: baseConfig };
}

// 解析簇模拟量故障三级汇总原始数据
export function parseCluAnalogFaultLevelSumRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  if (buf.length === 0) return null;
  
  // 1. 读取数据长度（前2字节）
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  
  if (paramsBuf.length !== dataLen) {
    console.warn(`clu_analog_fault_level_sum length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }
  
  // 2. 读取簇数量（第3字节）
  const clusterCount = paramsBuf.readUInt8(0);
  const dataBuf = paramsBuf.slice(1);
  
  // 添加详细的调试信息 
  // console.log(`[DEBUG] CLU_ANALOG_FAULT_LEVEL_SUM 解析信息:`);
  // console.log(`  - 总数据长度: ${buf.length} 字节`);
  // console.log(`  - 数据长度字段: ${dataLen} 字节`);
  // console.log(`  - 簇数量: ${clusterCount}`);
  // console.log(`  - 实际数据长度: ${dataBuf.length} 字节`);
  
  // 3. 验证数据长度是否合理
  const expectedDataLength = clusterCount * 10; // 每个簇5个u16字段 = 10字节
  if (dataBuf.length < expectedDataLength) {
    console.error(`[ERROR] 数据长度不足: 需要 ${expectedDataLength} 字节，实际只有 ${dataBuf.length} 字节`);
    console.error(`[ERROR] 簇数量可能读取错误，尝试重新计算...`);
    
    // 尝试重新计算簇数量
    const recalculatedClusterCount = Math.floor(dataBuf.length / 10);
    console.log(`[DEBUG] 重新计算的簇数量: ${recalculatedClusterCount}`);
    
    if (recalculatedClusterCount > 0 && recalculatedClusterCount <= 64) {
      // 使用重新计算的簇数量
      const schema = CLU_ANALOG_FAULT_LEVEL_SUM_SCHEMA(recalculatedClusterCount);
      const view = new DataView(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength);
      const { baseConfig } = parseByTable(view, schema);
      
      return { 
        error: false, 
        data: baseConfig,
        baseConfig: { 
          dataLength: dataLen, 
          clusterCount: recalculatedClusterCount 
        }
      };
    } else {
      console.error(`[ERROR] 重新计算的簇数量 ${recalculatedClusterCount} 不合理，返回空数据`);
      return { 
        error: true, 
        data: {},
        baseConfig: { 
          dataLength: dataLen, 
          clusterCount: 0 
        }
      };
    }
  }
  
  // 4. 动态生成schema
  const schema = CLU_ANALOG_FAULT_LEVEL_SUM_SCHEMA(clusterCount);
  
  // 5. 解析数据
  const view = new DataView(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength);
  const { baseConfig } = parseByTable(view, schema);
  
  return { 
    error: false, 
    data: baseConfig,
    baseConfig: { 
      dataLength: dataLen, 
      clusterCount: clusterCount 
    }
  };
}

// 解析堆模拟量故障三级汇总原始数据
export function parseBlockAnalogFaultLevelRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  if (buf.length === 0) return null;
  
  // 堆模拟量故障三级汇总有数据长度前缀，前2字节为数据长度
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  
  if (paramsBuf.length !== dataLen) {
    console.warn(`block_analog_fault_level length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按BLOCK_ANALOG_FAULT_LEVEL定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, BLOCK_ANALOG_FAULT_LEVEL);
  return { error: false, data: baseConfig };
}

// 解析堆模拟量故障等级原始数据
export function parseBlockAnalogFaultGradeRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  if (buf.length === 0) return null;
  
  // 堆模拟量故障等级有数据长度前缀，前2字节为数据长度
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  
  if (paramsBuf.length !== dataLen) {
    console.warn(`block_analog_fault_grade length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  // 堆模拟量故障等级是遥测数据，直接解析，不需要错误码处理
  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按BLOCK_ANALOG_FAULT_GRADE定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, BLOCK_ANALOG_FAULT_GRADE);
  return { error: false, data: baseConfig };
}

// 解析簇模拟量故障等级原始数据
export function parseCluAnalogFaultGradeRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  if (buf.length === 0) return null;
  
  // 1. 读取数据长度（前2字节）
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  
  if (paramsBuf.length !== dataLen) {
    console.warn(`clu_analog_fault_grade length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }
  
  // 2. 读取簇数量（第3字节）
  const clusterCount = paramsBuf.readUInt8(0);
  const dataBuf = paramsBuf.slice(1);
  
  // console.log(`[DEBUG] CLU_ANALOG_FAULT_GRADE 解析信息:`);
  // console.log(`  - 总数据长度: ${buf.length} 字节`);
  // console.log(`  - 数据长度字段: ${dataLen} 字节`);
  // console.log(`  - 簇数量: ${clusterCount}`);
  // console.log(`  - 实际数据长度: ${dataBuf.length} 字节`);
  
  // 3. 验证数据长度是否合理
  const expectedDataLength = clusterCount * 8; // 每个簇4个u16字段 = 8字节
  if (dataBuf.length < expectedDataLength) {
    console.error(`[ERROR] 数据长度不足: 需要 ${expectedDataLength} 字节，实际只有 ${dataBuf.length} 字节`);
  

    
    if (recalculatedClusterCount > 0) {
      // 使用重新计算的簇数量
      const schema = CLU_ANALOG_FAULT_GRADE_SCHEMA(recalculatedClusterCount);
      const view = new DataView(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength);
      const { baseConfig } = parseByTable(view, schema);
      
      return { 
        error: false, 
        data: baseConfig,
        baseConfig: { 
          dataLength: dataLen, 
          clusterCount: recalculatedClusterCount 
        }
      };
    } else {
      console.error(`[ERROR] 重新计算的簇数量 ${recalculatedClusterCount} 不合理，返回空数据`);
      return { 
        error: true, 
        data: {},
        baseConfig: { 
          dataLength: dataLen, 
          clusterCount: 0 
        }
      };
    }
  }
  
  // 4. 动态生成schema
  const schema = CLU_ANALOG_FAULT_GRADE_SCHEMA(clusterCount);
  
  // 5. 解析数据
  const view = new DataView(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength);
  const { baseConfig } = parseByTable(view, schema);
  
  return { 
    error: false, 
    data: baseConfig,
    baseConfig: { 
      dataLength: dataLen, 
      clusterCount: clusterCount 
    }
  };
}


// 堆配置参数处理函数

/**
 * 解析 block_batt_param_r 原始数据（系统簇端电池配置参数）
 */
export function parseBlockBattParamRAW(payload) {
  console.log('[parseBlockBattParamRAW] 开始解析，原始payload:', payload)
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  console.log('[parseBlockBattParamRAW] Buffer长度:', buf.length, 'hex:', buf.toString('hex'))
  
  if (buf.length === 0) return null;
  
  // 失败响应: 1字节错误码
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0);
    console.log('[parseBlockBattParamRAW] 错误响应，错误码:', errorCode)
    return {
      error: true,
      baseConfig: {},
      data: {
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };
  }

  // 成功响应: 前2字节为数据长度 (字节数)，后续为参数数据
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  console.log('[parseBlockBattParamRAW] 数据长度:', dataLen, '实际参数长度:', paramsBuf.length)
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseBlockBattParamRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  console.log('[parseBlockBattParamRAW] 开始按表解析...')
  const { baseConfig } = parseByTable(view, BLOCK_BATT_PARAM_R);
  console.log('[parseBlockBattParamRAW] 解析结果:', baseConfig)

  return { error: false, data: baseConfig };
}

/**
 * 解析 block_comm_dev_cfg_r 原始数据（系统通讯设备配置参数）
 */
export function parseBlockCommDevCfgRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  if (buf.length === 0) return null;
  
  // 失败响应: 1字节错误码
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0);
    return {
      error: true,
      baseConfig: {},
      data: {
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };
  }

  // 成功响应: 前2字节为数据长度 (字节数)，后续为参数数据
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseBlockCommDevCfgRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  const { baseConfig } = parseByTable(view, BLOCK_COMM_DEV_CFG_R);

  return { error: false, data: baseConfig };
}

/**
 * 解析 block_operate_cfg_r 原始数据（系统操作配置参数）
 */
export function parseBlockOperateCfgRAW(payload) {
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  if (buf.length === 0) return null;
  
  // 失败响应: 1字节错误码
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0);
    return {
      error: true,
      baseConfig: {},
      data: {
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };
  }

  // 成功响应: 前2字节为数据长度 (字节数)，后续为参数数据
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseBlockOperateCfgRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  const { baseConfig } = parseByTable(view, BLOCK_OPERATE_CFG_R);

  return { error: false, data: baseConfig };
}

