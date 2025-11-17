  //\src\protocol\utils.js 
  import {  PACK_SUMMARY,
            IO_STATUS_SCHEMA,
            // HARDWARE_FAULT_SCHEMA,//协议修改删除
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
           BLOCK_BATT_PARAM_R, BLOCK_COMM_DEV_CFG_R, BLOCK_OPERATE_CFG_R, BLOCK_COMM_LOST, FACTORY_CALIB_PARAM_R,
           BCU_BMU_UPGRADE_RESULT_FIELDS, BAU_UPGRADE_RESULT_FIELDS, SYS_RUN_TIME_R,
           EVENT_RECORD_FLAG_R, EVENT_RECORD_R } from '../main/table'
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
    },
    hex16:(v,o)=>{
      const rawValue = v.getUint16(o, true);
      return rawValue.toString(16).toUpperCase();
    }
  }

   /* ---------- 通用表驱动解析 ---------- */
  export function parseByTable(view, table, start = 0){
    const ascii = new TextDecoder('ascii')
    const base  = {}
    let   off   = start
    const cache = {}                  // 存已读取寄存器，供 bit / bits 字段复用


    let fieldCount = 0

    // 🔥🔥🔥 DEBUG: 字段解析详细打印 - 用于排查解析问题时启用
    // const enableFieldDebug = true
    // if (enableFieldDebug) {
    //   console.log(`🔥🔥🔥 [parseByTable] === 字段解析详情 === 起始偏移:${start} 缓冲区长度:${view.byteLength} 字段数:${table.length}`)
    // }


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

      // 🔥🔥🔥 DEBUG: 字段解析详细打印 - 用于排查解析问题时启用
      // if (enableFieldDebug) {
      //   const remainingBytes = view.byteLength - off
      //   const rawDataHex = remainingBytes > 0 ? Array.from(new Uint8Array(view.buffer, view.byteOffset + off, Math.min(8, remainingBytes))).map(b => b.toString(16).padStart(2, '0')).join(' ') : 'EOF'
      //   console.log(`🔥 字段${fieldCount.toString().padStart(3)}: ${key.padEnd(20)} 类型:${type.padEnd(8)} 偏移:${off.toString().padStart(3)} 剩余:${remainingBytes.toString().padStart(3)} 原数据:[${rawDataHex}]`)
      // }

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

      // skip类型：跳过指定字节数
      if (type.startsWith('skip')) {
        const skipBytes = Number(type.slice(4))
        off += skipBytes
          continue
        }

      /* ---------- 位字段(bit) 解析（单 bit -> Boolean） ---------------- */
      if (type === 'bit'){                                            
        const parentVal = cache[fld.bitsOf]          // 取所属寄存器原始值
        if (parentVal === undefined){
          throw new Error(`bit 字段 ${key} 所依赖的寄存器 ${fld.bitsOf} 尚未解析`)
        }
        base[key] = Boolean(parentVal & (1 << fld.bit))
        continue
      }

      /* ---------- 位段(bits) 解析（多 bit -> 数值 / map） -------------- */
      if (type === 'bits'){                                            
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

         // 边界检查
         const typeSize = ({ u8:1, s8:1, u16:2, s16:2, u32:4, s32:4, hex:2, hex16:2 })[type] || 2;
         if (off + typeSize > view.byteLength) {
           throw new RangeError(`Offset ${off} is outside the bounds of the DataView (length ${view.byteLength}) for field ${key} (${type})`);
         }

         const rawVal = fn(view, off);

         // hex和hex16类型不需要进行scale处理，直接使用字符串值
         if (type === 'hex' || type === 'hex16') {
           base[key] = rawVal;
         } else {
           // 如果字段有map属性，进行映射；否则进行scale处理
           if (fld.map && typeof fld.map === 'object') {
             // 对于有map的字段，存储原始值和映射后的文本值
             base[key] = {
               raw: rawVal,
               txt: fld.map[rawVal] !== undefined ? fld.map[rawVal] : `未知值(0x${rawVal.toString(16).toUpperCase()})`
             }
           } else {
             base[key] = rawVal / (fld.scale ?? 1);
           }
         }
         cache[key] = rawVal;

         // 🔥🔥🔥 DEBUG: 解析结果打印 - 用于排查解析问题时启用
         // if (enableFieldDebug) {
         //   const finalValue = type === 'hex' ? rawVal : (rawVal / (fld.scale ?? 1))
         //   console.log(`🔥 结果${fieldCount.toString().padStart(3)}: ${key.padEnd(20)} 原值:${rawVal.toString().padStart(8)} 最终值:${finalValue.toString().padStart(8)} 比例:${(fld.scale ?? 1)}`)
         // }

          off += ({ u8:1, s8:1, u16:2, s16:2, u32:4, s32:4, hex:2, hex16:2 })[type];
        

    }

    // 🔥🔥🔥 DEBUG: 解析完成总结 - 用于排查解析问题时启用
    // if (enableFieldDebug) {
    //   console.log(`🔥🔥🔥 [parseByTable] === 解析完成 === 总字段:${fieldCount} 起始偏移:${start} 结束偏移:${off} 消耗字节:${off-start}`)
    // }

    return { baseConfig: base, nextOffset: off }
  }

  /* ---------- 专门用于PACK_SUMMARY的解析函数 ---------- */
  // valid=false的字段会跳过解析但仍然推进偏移，确保数据对齐正确
  export function parseByTableWithSkip(view, table, start = 0){
    const ascii = new TextDecoder('ascii')
    const base  = {}
    let   off   = start
    const cache = {}                  // 存已读取寄存器，供 bit / bits 字段复用

    // 🔥🔥🔥 DEBUG: 字段解析详细打印 - 用于排查解析问题时启用
    // const enableFieldDebug = true
    // if (enableFieldDebug) {
    //   console.log(`🔥🔥🔥 [parseByTableWithSkip] === 字段解析详情 === 起始偏移:${start} 缓冲区长度:${view.byteLength} 字段数:${table.length}`)
    // }
    let fieldCount = 0

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
      fieldCount++

      // 关键修改：对于valid=false的字段，推进偏移但不存储结果
      const shouldStore = fld.valid !== false && fld.hide !== true;

      // 🔥🔥🔥 DEBUG: 字段解析详细打印 - 用于排查解析问题时启用
      // if (enableFieldDebug) {
      //   const remainingBytes = view.byteLength - off
      //   const rawDataHex = remainingBytes > 0 ? Array.from(new Uint8Array(view.buffer, view.byteOffset + off, Math.min(8, remainingBytes))).map(b => b.toString(16).padStart(2, '0')).join(' ') : 'EOF'
      //   const storeFlag = shouldStore ? '存储' : '跳过'
      //   console.log(`🔥 字段${fieldCount.toString().padStart(3)}: ${key.padEnd(20)} 类型:${type.padEnd(8)} 偏移:${off.toString().padStart(3)} 剩余:${remainingBytes.toString().padStart(3)} ${storeFlag} 原数据:[${rawDataHex}]`)
      // }

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

      /* ---------- 固定长 ASCII 字符串 --------------------------------- */
      if (type.startsWith('str')){
        const len = Number(type.slice(3))  // str14 → 长度14
        const bytes = new Uint8Array(view.buffer, view.byteOffset + off, len)
        off += len
        if (shouldStore) {
          base[key] = ascii.decode(bytes).replace(/[^\x20-\x7E]/g, '')
        }
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

        // 🔥🔥🔥 DEBUG: 解析结果打印 - 用于排查解析问题时启用
        // if (enableFieldDebug) {
        //   const finalValue = shouldStore ? (rawValue / scale) : '跳过'
        //   const storeFlag = shouldStore ? '存储' : '跳过'
        //   console.log(`🔥 结果${fieldCount.toString().padStart(3)}: ${key.padEnd(20)} 原值:${rawValue.toString().padStart(8)} 最终值:${finalValue.toString().padStart(8)} 比例:${scale} ${storeFlag}`)
        // }

      } catch (error) {
        console.error(`解析字段 ${key} 时出错:`, error)
        throw error
      }
    }

    // 🔥🔥🔥 DEBUG: 解析完成总结 - 用于排查解析问题时启用
    // if (enableFieldDebug) {
    //   console.log(`🔥🔥🔥 [parseByTableWithSkip] === 解析完成 === 总字段:${fieldCount} 起始偏移:${start} 结束偏移:${off} 消耗字节:${off-start}`)
    // }

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

    if (rawValue === undefined || rawValue === null) {
      continue
    }

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
      return { bmu, afe: null, cellInBmu: null, globalCell: null };
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

    // ④ 计算全局电芯序号
    const cellsPerBmu = cellsPerAfe.reduce((total, count) => total + count, 0);
    const globalCell = cellsPerBmu > 0 ? (bmu - 1) * cellsPerBmu + cellInBmu : null;

    return { bmu, afe, cellInBmu, globalCell };
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

      // console.log(`[查询应答] 状态数据: 0x${statusValue.toString(16).toUpperCase().padStart(4, '0')} (${statusValue})`);

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

/**
 * 从uint32_t bitmask解析BMU失败设备列表
 * @param {number} bitmask - 32位bitmask，每个bit代表一个BMU
 * @returns {Array<number>} 失败的BMU编号数组（1-32）
 */
function parseBmuFailedDevices(bitmask) {
  const failedDevices = []
  for (let i = 0; i < 32; i++) {
    if (bitmask & (1 << i)) {
      failedDevices.push(i + 1) // BMU编号从1开始
    }
  }
  return failedDevices
}

/**
 * 解析BCU/BMU升级执行结果
 * @param {string|Buffer} payload - MQTT消息payload（hex字符串或Buffer）
 * @returns {Object} 解析结果
 */
export function parseBcuBmuUpgradeResultRAW(payload) {
  try {
    const buf = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(String(payload).replace(/\s+/g, ''), 'hex')

    if (buf.length === 0) {
      return {
        error: true,
        commandType: 'query_command',
        topic: 'get_bcu_bmu_upgrade_result',
        data: {
          code: 0xFF,
          message: '响应数据为空',
          success: false
        }
      }
    }

    // 失败响应: 1字节错误码
    if (buf.length === 1) {
      const errorCode = buf.readUInt8(0)
      const isSuccess = errorCode === 0xE0

      return {
        error: !isSuccess,
        commandType: 'query_command',
        topic: 'get_bcu_bmu_upgrade_result',
        data: {
          code: errorCode,
          message: ERROR_CODES[errorCode] || '未知错误',
          success: isSuccess
        }
      }
    }

    // 成功响应: 20字节数据（9个字段，8个uint16_t + 1个uint32_t）
    if (buf.length === 20) {
      // 使用parseByTable解析字段（从table.js中的BCU_BMU_UPGRADE_RESULT_FIELDS）
      const view = dv(buf)
      const { baseConfig } = parseByTable(view, BCU_BMU_UPGRADE_RESULT_FIELDS, 0)

      // 提取解析结果（带map的字段返回{raw, txt}格式）
      const deviceType = baseConfig.deviceType
      const downloadCompleteFlag = baseConfig.downloadCompleteFlag
      const completionType = baseConfig.completionType
      const otaErrorCode = baseConfig.otaErrorCode
      const bcuFaultCode = baseConfig.bcuFaultCode
      const bmuFaultCode = baseConfig.bmuFaultCode
      const bmuFailedDevicesRaw = baseConfig.bmuFailedDevicesRaw
      const totalPackets = baseConfig.totalPackets
      const currentPacket = baseConfig.currentPacket

      // 解析BMU失败设备列表（从bitmask）
      const bmuFailedDevices = parseBmuFailedDevices(bmuFailedDevicesRaw)

      // 构建返回数据（统一格式）
      return {
        error: false,
        commandType: 'query_command',
        topic: 'get_bcu_bmu_upgrade_result',
        data: {
          // 原始值
          deviceTypeRaw: typeof deviceType === 'object' ? deviceType.raw : deviceType,
          downloadCompleteFlagRaw: typeof downloadCompleteFlag === 'object' ? downloadCompleteFlag.raw : downloadCompleteFlag,
          completionTypeRaw: typeof completionType === 'object' ? completionType.raw : completionType,
          otaErrorCodeRaw: typeof otaErrorCode === 'object' ? otaErrorCode.raw : otaErrorCode,
          bcuFaultCodeRaw: typeof bcuFaultCode === 'object' ? bcuFaultCode.raw : bcuFaultCode,
          bmuFaultCodeRaw: typeof bmuFaultCode === 'object' ? bmuFaultCode.raw : bmuFaultCode,
          bmuFailedDevicesRaw,
          totalPacketsRaw: totalPackets,
          currentPacketRaw: currentPacket,
          // 解析后的文本值（有map的字段使用txt，否则使用原始值）
          deviceType: typeof deviceType === 'object' ? deviceType.txt : deviceType,
          downloadCompleteFlag: typeof downloadCompleteFlag === 'object' ? downloadCompleteFlag.txt : downloadCompleteFlag,
          completionType: typeof completionType === 'object' ? completionType.txt : completionType,
          otaErrorCode: typeof otaErrorCode === 'object' ? otaErrorCode.txt : otaErrorCode,
          bcuFaultCode: typeof bcuFaultCode === 'object' ? bcuFaultCode.txt : (bcuFaultCode === 0 ? '无故障' : `故障码: 0x${bcuFaultCode.toString(16).toUpperCase()}`),
          bmuFaultCode: typeof bmuFaultCode === 'object' ? bmuFaultCode.txt : (bmuFaultCode === 0 ? '无故障' : `故障码: 0x${bmuFaultCode.toString(16).toUpperCase()}`),
          bmuFailedDevices,
          totalPackets,
          currentPacket,
          success: true
        }
      }
    }

    // 其他长度 - 异常响应
    console.warn(`[升级结果解析] 意外的响应长度: ${buf.length}`)
    return {
      error: true,
      commandType: 'query_command',
      topic: 'get_upgrade_result',
      data: {
        code: 0xFF,
        message: '响应格式异常',
        success: false
      }
    }

  } catch (error) {
    console.error(`[升级结果解析] 解析失败:`, error)
    return {
      error: true,
      commandType: 'query_command',
      topic: 'get_upgrade_result',
      data: {
        code: 0xFF,
        message: `解析错误: ${error.message}`,
        success: false
      }
    }
  }
}

/**
 * 解析BAU升级执行结果
 * @param {string|Buffer} payload - MQTT消息payload（hex字符串或Buffer）
 * @returns {Object} 解析结果
 */
export function parseBauUpgradeResultRAW(payload) {
  try {
    const buf = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(String(payload).replace(/\s+/g, ''), 'hex')

    if (buf.length === 0) {
      return {
        error: true,
        commandType: 'query_command',
        topic: 'get_bau_upgrade_result',
        data: {
          code: 0xFF,
          message: '响应数据为空',
          success: false
        }
      }
    }

    // 失败响应: 1字节错误码
    if (buf.length === 1) {
      const errorCode = buf.readUInt8(0)
      const isSuccess = errorCode === 0xE0

      return {
        error: !isSuccess,
        commandType: 'query_command',
        topic: 'get_bau_upgrade_result',
        data: {
          code: errorCode,
          message: ERROR_CODES[errorCode] || '未知错误',
          success: isSuccess
        }
      }
    }

    // 成功响应: 6字节数据（3个uint16_t字段）
    if (buf.length === 6) {
      // 使用parseByTable解析字段（从table.js中的BAU_UPGRADE_RESULT_FIELDS）
      // 从offset 0开始解析，保持字段对齐，但只提取后两个字段
      const view = dv(buf)
      const { baseConfig } = parseByTable(view, BAU_UPGRADE_RESULT_FIELDS, 0)

      // 提取解析结果（带map的字段返回{raw, txt}格式）
      const downloadCompleteFlag = baseConfig.downloadCompleteFlag
      const otaErrorCode = baseConfig.otaErrorCode
      const bauFaultCode = baseConfig.bauFaultCode

      // 构建返回数据（包含所有字段）
      return {
        error: false,
        commandType: 'query_command',
        topic: 'get_bau_upgrade_result',
        data: {
          // 原始值
          downloadCompleteFlagRaw: typeof downloadCompleteFlag === 'object' ? downloadCompleteFlag.raw : downloadCompleteFlag,
          otaErrorCodeRaw: typeof otaErrorCode === 'object' ? otaErrorCode.raw : otaErrorCode,
          bauFaultCodeRaw: typeof bauFaultCode === 'object' ? bauFaultCode.raw : bauFaultCode,
          // 解析后的文本值（有map的字段使用txt，否则使用原始值）
          downloadCompleteFlag: typeof downloadCompleteFlag === 'object' ? downloadCompleteFlag.txt : downloadCompleteFlag,
          otaErrorCode: typeof otaErrorCode === 'object' ? otaErrorCode.txt : otaErrorCode,
          bauFaultCode: typeof bauFaultCode === 'object' ? bauFaultCode.txt : (bauFaultCode === 0 ? '无故障' : `故障码: 0x${bauFaultCode.toString(16).toUpperCase()}`),
          success: true
        }
      }
    }

    // 其他长度 - 异常响应
    console.warn(`[BAU升级结果解析] 意外的响应长度: ${buf.length}`)
    return {
      error: true,
      commandType: 'query_command',
      topic: 'get_bau_upgrade_result',
      data: {
        code: 0xFF,
        message: '响应格式异常',
        success: false
      }
    }

  } catch (error) {
    console.error(`[BAU升级结果解析] 解析失败:`, error)
    return {
      error: true,
      commandType: 'query_command',
      topic: 'get_bau_upgrade_result',
      data: {
        code: 0xFF,
        message: `解析错误: ${error.message}`,
        success: false
      }
    }
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

  // 解析 sys_run_time_r 原始数据（系统时间记录）
  export function parseSysRunTimeRAW(payload) {
    const buf = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(String(payload).replace(/\s+/g, ''), 'hex')
    
    if (buf.length === 0) return null
    
    // 失败响应: 1字节错误码
    if (buf.length === 1) {
      const errorCode = buf.readUInt8(0)
      return {
        error: true,
        baseConfig: {},
        data: {
          code: errorCode,
          message: ERROR_CODES[errorCode] || '未知错误'
        }
      }
    }
    
    // 成功响应: 前2字节为数据长度
    const dataLen = buf.readUInt16LE(0)
    const paramsBuf = buf.slice(2)
    
    // 根据协议定义：事件记录标志位(120 * 2字节) = 240字节
    // 使用实际数据长度，不进行截断，确保与协议完全一致
    if (paramsBuf.length !== dataLen) {
      console.warn(`[parseSysRunTimeRAW] length mismatch: dataLen field=${dataLen}, actual buffer length=${paramsBuf.length}`)
    }
    
    // 使用DataView解析，使用实际数据长度
    const view = new DataView(
      paramsBuf.buffer,
      paramsBuf.byteOffset,
      paramsBuf.byteLength
    )
    
    // 调用通用解析，按SYS_RUN_TIME_R定义将buffer解析为对象
    const { baseConfig } = parseByTable(view, SYS_RUN_TIME_R)
    
    
    // 后处理：BCD时间解码、32位字段组合、格式化
    const processedData = processSysRunTimeData(baseConfig, SYS_RUN_TIME_R)
    
    return {
      error: false,
      baseConfig: baseConfig,  // 保留原始解析数据
      data: processedData      // 返回分组后的数据
    }
  }

  // BCD解码函数
  function parseBCD(decimalValue) {
    if (decimalValue === undefined || decimalValue === null) {
      return 0
    }
    let bcd = decimalValue
    let result = 0
    let multiplier = 1
    while (bcd > 0) {
      const digit = bcd % 16
      result += digit * multiplier
      multiplier *= 10
      bcd = Math.floor(bcd / 16)
    }
    return result
  }

  // 格式化系统时间（7个BCD寄存器：秒-分-时-周-日-月-年）
  // 注意：虽然寄存器顺序是秒-分-时-周-日-月-年，但formatSystemTime需要按年-月-日-周-时-分-秒的顺序处理
  // 所以需要反转参数顺序：params[0]=年, params[1]=月, params[2]=日, params[3]=周, params[4]=时, params[5]=分, params[6]=秒
  // 注意：周字段不输出，但需要校验
  function formatSystemTime(params) {
    if (!Array.isArray(params) || params.length < 7) {
      return '无效时间'
    }
    
    // 反转参数顺序：从秒-分-时-周-日-月-年 转换为 年-月-日-周-时-分-秒
    // 注意：params数组顺序是秒-分-时-周-日-月-年，但实际数据含义是年-月-日-周-时-分-秒
    // 所以需要重新映射：
    const yearRaw = params[0]    // 年 (原params[0]，实际是秒的位置，但数据是年)
    const monthRaw = params[1]   // 月 (原params[1]，实际是分的位置，但数据是月)
    const dayRaw = params[2]     // 日 (原params[2]，实际是时的位置，但数据是日)
    const weekRaw = params[3]    // ISO周数（不输出但需要校验）(原params[3]，周)
    const hourRaw = params[4]    // 时 (原params[4]，实际是日的位置，但数据是时)
    const minuteRaw = params[5]  // 分 (原params[5]，实际是月的位置，但数据是分)
    const secondRaw = params[6]  // 秒 (原params[6]，实际是年的位置，但数据是秒)
    
    // BCD解码并应用范围校验（参考reference项目）
    // 验证规则顺序：年-月-日-周-时-分-秒
    const parseBCDWithValidation = (decimalValue, index) => {
      const value = parseBCD(decimalValue)
      // 验证规则（参考reference项目）
      const validationRules = [
        { min: 0, max: 99, fix: true },   // 年 (index 0, 后两位)
        { min: 1, max: 12, fix: true },  // 月 (index 1)
        { min: 1, max: 31, fix: true },  // 日 (index 2)
        { min: 1, max: 53, fix: false },  // 周 (index 3, 不输出但需要校验)
        { min: 0, max: 23, fix: true },   // 时 (index 4)
        { min: 0, max: 59, fix: true },   // 分 (index 5)
        { min: 0, max: 59, fix: true }   // 秒 (index 6)
      ]
      const rule = validationRules[index]
      if (rule?.fix) {
        return Math.max(rule.min, Math.min(value, rule.max))
      }
      return value
    }
    
    const year = 2000 + parseBCDWithValidation(yearRaw, 0)  // 年份后两位，转换为2000-2099
    const month = parseBCDWithValidation(monthRaw, 1)     // 月
    const day = parseBCDWithValidation(dayRaw, 2)         // 日
    const week = parseBCDWithValidation(weekRaw, 3)       // ISO周数（不输出但需要校验）
    const hour = parseBCDWithValidation(hourRaw, 4)       // 时
    const minute = parseBCDWithValidation(minuteRaw, 5)   // 分
    const second = parseBCDWithValidation(secondRaw, 6)  // 秒
    
    // 验证时间范围
    const pad2 = (num) => num.toString().padStart(2, '0')
    
    // 返回格式：YYYY-M-D-HH:mm:ss
    const result = `${year}-${month}-${day}-${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
    return result
  }

  // 将分钟转换为 "xx天xx小时xx分钟"
  function convertMinutesToDayHour(minutes) {
    if (minutes === 0) return '0分钟'
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    const mins = minutes % 60
    const parts = []
    if (days > 0) parts.push(`${days}天`)
    if (hours > 0) parts.push(`${hours}小时`)
    if (mins > 0 || parts.length === 0) parts.push(`${mins}分钟`)
    return parts.join('')
  }

  // 后处理函数：BCD解码、32位组合、格式化
  function processSysRunTimeData(baseConfig, schema) {
    const processedConfig = { ...baseConfig }
    
    // 1. BCD时间解码和格式化 - 直接更新baseConfig中的值，替换原始BCD值
    // 系统当前时间（7个字段合并为1个格式化字段）
    // 寄存器顺序：秒-分-时-周-日-月-年
    // schema定义的顺序也是：秒-分-时-周-日-月-年
    // 所以parseByTable读取后，字段映射关系为：
    // CurrentTime_Second = buffer[0] = 秒
    // CurrentTime_Minute = buffer[1] = 分
    // CurrentTime_Hour = buffer[2] = 时
    // CurrentTime_Week = buffer[3] = 周（不输出）
    // CurrentTime_Day = buffer[4] = 日
    // CurrentTime_Month = buffer[5] = 月
    // CurrentTime_Year = buffer[6] = 年
    if (processedConfig.CurrentTime_Second !== undefined) {
      // 注意：虽然schema定义的顺序是秒-分-时-周-日-月-年，但formatSystemTime期望的参数顺序也是秒-分-时-周-日-月-年
      // 所以直接按schema顺序传入即可
      const currentTimeParams = [
        processedConfig.CurrentTime_Second, // params[0] = 秒 (buffer[0])
        processedConfig.CurrentTime_Minute, // params[1] = 分 (buffer[1])
        processedConfig.CurrentTime_Hour,   // params[2] = 时 (buffer[2])
        processedConfig.CurrentTime_Week,    // params[3] = 周 (buffer[3]，不输出)
        processedConfig.CurrentTime_Day,     // params[4] = 日 (buffer[4])
        processedConfig.CurrentTime_Month,   // params[5] = 月 (buffer[5])
        processedConfig.CurrentTime_Year     // params[6] = 年 (buffer[6])
      ]
      
      // 将格式化后的时间值替换第一个时间字段的值，其他字段在groupByClass中会被跳过（因为没有label）
      const formattedTime = formatSystemTime(currentTimeParams)
      processedConfig.CurrentTime_Second = formattedTime
      // 清空其他时间字段，避免重复显示
      processedConfig.CurrentTime_Minute = undefined
      processedConfig.CurrentTime_Hour = undefined
      processedConfig.CurrentTime_Week = undefined
      processedConfig.CurrentTime_Day = undefined
      processedConfig.CurrentTime_Month = undefined
      processedConfig.CurrentTime_Year = undefined
    }
    
    // 处理3次系统记录
    for (let i = 1; i <= 3; i++) {
      const prefix = `Boot${i}_`
      
      // 启动时间（7个字段合并为1个格式化字段）
      // 寄存器顺序：秒-分-时-周-日-月-年
      // schema定义的顺序也是：秒-分-时-周-日-月-年
      // 所以字段映射关系与系统当前时间相同
      if (processedConfig[`${prefix}StartTime_Second`] !== undefined) {
        const startTimeParams = [
          processedConfig[`${prefix}StartTime_Second`], // params[0] = 秒 (buffer[0])
          processedConfig[`${prefix}StartTime_Minute`], // params[1] = 分 (buffer[1])
          processedConfig[`${prefix}StartTime_Hour`],   // params[2] = 时 (buffer[2])
          processedConfig[`${prefix}StartTime_Week`],   // params[3] = 周 (buffer[3]，不输出)
          processedConfig[`${prefix}StartTime_Day`],    // params[4] = 日 (buffer[4])
          processedConfig[`${prefix}StartTime_Month`],   // params[5] = 月 (buffer[5])
          processedConfig[`${prefix}StartTime_Year`]     // params[6] = 年 (buffer[6])
        ]
        processedConfig[`${prefix}StartTime_Second`] = formatSystemTime(startTimeParams)
        processedConfig[`${prefix}StartTime_Minute`] = undefined
        processedConfig[`${prefix}StartTime_Hour`] = undefined
        processedConfig[`${prefix}StartTime_Week`] = undefined
        processedConfig[`${prefix}StartTime_Day`] = undefined
        processedConfig[`${prefix}StartTime_Month`] = undefined
        processedConfig[`${prefix}StartTime_Year`] = undefined
      }
      
      // 停止时间（7个字段合并为1个格式化字段）
      // 寄存器顺序：秒-分-时-周-日-月-年
      // schema定义的顺序也是：秒-分-时-周-日-月-年
      // 所以字段映射关系与系统当前时间相同
      if (processedConfig[`${prefix}StopTime_Second`] !== undefined) {
        const stopTimeParams = [
          processedConfig[`${prefix}StopTime_Second`], // params[0] = 秒 (buffer[0])
          processedConfig[`${prefix}StopTime_Minute`], // params[1] = 分 (buffer[1])
          processedConfig[`${prefix}StopTime_Hour`],   // params[2] = 时 (buffer[2])
          processedConfig[`${prefix}StopTime_Week`],    // params[3] = 周 (buffer[3]，不输出)
          processedConfig[`${prefix}StopTime_Day`],     // params[4] = 日 (buffer[4])
          processedConfig[`${prefix}StopTime_Month`],   // params[5] = 月 (buffer[5])
          processedConfig[`${prefix}StopTime_Year`]     // params[6] = 年 (buffer[6])
        ]
        processedConfig[`${prefix}StopTime_Second`] = formatSystemTime(stopTimeParams)
        processedConfig[`${prefix}StopTime_Minute`] = undefined
        processedConfig[`${prefix}StopTime_Hour`] = undefined
        processedConfig[`${prefix}StopTime_Week`] = undefined
        processedConfig[`${prefix}StopTime_Day`] = undefined
        processedConfig[`${prefix}StopTime_Month`] = undefined
        processedConfig[`${prefix}StopTime_Year`] = undefined
      }
      
      // 2. 32位字段组合 - 组合后更新Low字段的值，High字段设为undefined
      // 运行时间（分钟）
      if (processedConfig[`${prefix}RunTime_Low`] !== undefined && processedConfig[`${prefix}RunTime_High`] !== undefined) {
        const runTime = processedConfig[`${prefix}RunTime_Low`] | (processedConfig[`${prefix}RunTime_High`] << 16)
        processedConfig[`${prefix}RunTime_Low`] = convertMinutesToDayHour(runTime)
        processedConfig[`${prefix}RunTime_High`] = undefined
      }
      
      // 周期任务堆栈大小（字节）
      if (processedConfig[`${prefix}PeriodicStack_Low`] !== undefined && processedConfig[`${prefix}PeriodicStack_High`] !== undefined) {
        const stackSize = processedConfig[`${prefix}PeriodicStack_Low`] | (processedConfig[`${prefix}PeriodicStack_High`] << 16)
        processedConfig[`${prefix}PeriodicStack_Low`] = `${(stackSize / 1000).toFixed(1)}Kb`
        processedConfig[`${prefix}PeriodicStack_High`] = undefined
      }
      
      // 系统堆栈空间（字节）
      if (processedConfig[`${prefix}SystemStack_Low`] !== undefined && processedConfig[`${prefix}SystemStack_High`] !== undefined) {
        const stackSize = processedConfig[`${prefix}SystemStack_Low`] | (processedConfig[`${prefix}SystemStack_High`] << 16)
        processedConfig[`${prefix}SystemStack_Low`] = `${(stackSize / 1000).toFixed(1)}Kb`
        processedConfig[`${prefix}SystemStack_High`] = undefined
      }
      
      // 系统堆栈最小空间（字节）
      if (processedConfig[`${prefix}SystemStackMin_Low`] !== undefined && processedConfig[`${prefix}SystemStackMin_High`] !== undefined) {
        const stackSize = processedConfig[`${prefix}SystemStackMin_Low`] | (processedConfig[`${prefix}SystemStackMin_High`] << 16)
        processedConfig[`${prefix}SystemStackMin_Low`] = `${(stackSize / 1000).toFixed(1)}Kb`
        processedConfig[`${prefix}SystemStackMin_High`] = undefined
      }
    }
    
    // 3. 使用groupByClass分组
    // groupByClass会自动跳过undefined值和skip类型的字段
    const grouped = groupByClass(schema, processedConfig)
    
    // 4. 更新分组后数据的label，使其更符合显示需求
    const timeRecordSection = grouped.find(section => section.class === '系统时间记录')
    if (timeRecordSection) {
      timeRecordSection.element.forEach(item => {
        // 更新label，将"第X次-启动时间-秒"改为"第X次-系统启动时间"
        if (item.label && item.label.includes('启动时间-秒')) {
          item.label = item.label.replace('启动时间-秒', '系统启动时间')
        }
        if (item.label && item.label.includes('停止时间-秒')) {
          item.label = item.label.replace('停止时间-秒', '系统停止时间')
        }
        if (item.label && item.label.includes('运行时间-低16位')) {
          item.label = item.label.replace('运行时间-低16位', '系统运行时间')
        }
        if (item.label && item.label.includes('周期任务堆栈-低16位')) {
          item.label = item.label.replace('周期任务堆栈-低16位', '周期任务堆栈大小')
        }
        if (item.label && item.label.includes('系统堆栈-低16位')) {
          item.label = item.label.replace('系统堆栈-低16位', '系统堆栈空间')
        }
        if (item.label && item.label.includes('系统堆栈最小-低16位')) {
          item.label = item.label.replace('系统堆栈最小-低16位', '系统堆栈最小空间')
        }
        if (item.label && item.label.includes('系统当前时间-秒')) {
          item.label = '系统当前时间'
        }
      })
    }
    
    return grouped
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
  // console.log(`[parseRealTimeSaveRAW] 收到数据长度: ${buf.length} 字节`)

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

  // 🚀 修复：转换为 parseFault 期望的数组格式
  const data = groupByClass(BLOCK_ANALOG_FAULT_LEVEL, baseConfig);

  return {
    error: false,
    baseConfig: { DataLength: dataLen },
    data: data  // 现在返回数组格式 [{ class, element }]
  };
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

  // 🚀 修复：转换为 parseFault 期望的数组格式
  const data = groupByClass(BLOCK_ANALOG_FAULT_GRADE, baseConfig);

  return {
    error: false,
    baseConfig: { DataLength: dataLen },
    data: data  // 现在返回数组格式 [{ class, element }]
  };
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
    const recalculatedClusterCount = Math.floor(dataBuf.length / 8);

    if (recalculatedClusterCount > 0) {
      // 使用重新计算的簇数量
      const schema = CLU_ANALOG_FAULT_GRADE_SCHEMA(recalculatedClusterCount);
      const view = new DataView(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength);
      const { baseConfig } = parseByTable(view, schema);

      // 🚀 修复：转换为 parseFault 期望的数组格式
      const data = groupByClass(schema, baseConfig);

      return {
        error: false,
        baseConfig: {
          dataLength: dataLen,
          clusterCount: recalculatedClusterCount
        },
        data: data  // 现在返回数组格式 [{ class, element }]
      };
    } else {
      console.error(`[ERROR] 重新计算的簇数量 ${recalculatedClusterCount} 不合理，返回空数据`);
      return {
        error: true,
        baseConfig: {
          dataLength: dataLen,
          clusterCount: 0
        },
        data: []  // 返回空数组而不是空对象
      };
    }
  }

  // 4. 动态生成schema
  const schema = CLU_ANALOG_FAULT_GRADE_SCHEMA(clusterCount);

  // 5. 解析数据
  const view = new DataView(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength);
  const { baseConfig } = parseByTable(view, schema);

  // 🚀 修复：转换为 parseFault 期望的数组格式
  const data = groupByClass(schema, baseConfig);

  return {
    error: false,
    baseConfig: {
      dataLength: dataLen,
      clusterCount: clusterCount
    },
    data: data  // 现在返回数组格式 [{ class, element }]
  };
}


// 堆配置参数处理函数

/**
 * 解析 block_batt_param_r 原始数据（系统簇端电池配置参数）
 */
export function parseBlockBattParamRAW(payload) {
  // console.log('[parseBlockBattParamRAW] 开始解析，原始payload:', payload)
  const buf = Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(String(payload).replace(/\s+/g,''), 'hex');

  // console.log('[parseBlockBattParamRAW] Buffer长度:', buf.length, 'hex:', buf.toString('hex'))
  
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
  // console.log('[parseBlockBattParamRAW] 数据长度:', dataLen, '实际参数长度:', paramsBuf.length)
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseBlockBattParamRAW] length mismatch: expected ${dataLen}, got ${paramsBuf.length}`);
  }

  const view = new DataView(paramsBuf.buffer, paramsBuf.byteOffset, paramsBuf.byteLength);
  // console.log('[parseBlockBattParamRAW] 开始按表解析...')
  const { baseConfig } = parseByTable(view, BLOCK_BATT_PARAM_R);
  // console.log('[parseBlockBattParamRAW] 解析结果:', baseConfig)

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

// ========== 地址自适应查询结果解析函数 ==========

/**
 * 解析BCU地址自适应查询结果
 * @param {string} hex - 十六进制字符串
 * @returns {Object} 解析结果
 */
export function processBcuAdaptiveQueryResult(hex) {
  const buf = Buffer.from(hex.replace(/\s+/g, ''), 'hex');

  if (buf.length === 0) return null;

  // 失败响应: 1字节错误码
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0);
    console.log(`[BCU地址自适应查询] 收到错误码: 0x${errorCode.toString(16).toUpperCase()}`);
    return {
      error: true,
      data: {
        success: false,
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };
  }

  // 成功响应: 直接8字节4寄存器数据（无长度前缀）
  if (buf.length === 8) {
    // 解析4个u16寄存器（小端序）
    const register1 = buf.readUInt16LE(0);
    const register2 = buf.readUInt16LE(2);
    const register3 = buf.readUInt16LE(4);
    const register4 = buf.readUInt16LE(6);

    console.log(`[BCU地址自适应查询] 解析成功: 寄存器[0x${register1.toString(16)}, 0x${register2.toString(16)}, 0x${register3.toString(16)}, 0x${register4.toString(16)}]`);

    return {
      error: false,
      data: {
        success: true,
        register1,
        register2,
        register3,
        register4
      }
    };
  }

  // 其他长度认为是异常
  console.warn(`[BCU地址自适应查询] 意外的响应长度: ${buf.length}字节，期望1字节(错误)或8字节(成功)`);
  return {
    error: true,
    data: {
      success: false,
      code: 255,
      message: `响应长度异常: ${buf.length}字节，期望1字节或8字节`
    }
  };
}

/**
 * 解析BMU地址自适应查询结果
 * @param {string} hex - 十六进制字符串
 * @returns {Object} 解析结果
 */
export function processBmuAdaptiveQueryResult(hex) {
  const buf = Buffer.from(hex.replace(/\s+/g, ''), 'hex');

  if (buf.length === 0) return null;

  // 失败响应: 1字节错误码
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0);
    console.log(`[BMU地址自适应查询] 收到错误码: 0x${errorCode.toString(16).toUpperCase()}`);
    return {
      error: true,
      data: {
        success: false,
        code: errorCode,
        message: ERROR_CODES[errorCode] || '未知错误'
      }
    };
  }

  // 成功响应: 10字节BMU自适应地址结果 (5个u16寄存器)
  // 寄存器1: 当前簇号 (u16, 1-20)
  // 寄存器2: BCU执行标识-状态 (u16, 0x00/0xC1/0xC2/0xC3)
  // 寄存器3: BCU执行标识-内容1 (u16, 失败时有效)
  // 寄存器4: BCU执行标识-内容2 (u16, 失败时有效，BMU地址)
  // 寄存器5: BCU执行标识-内容3 (u16, 失败时有效)
  if (buf.length === 10) {
    const currentCluster = buf.readUInt16LE(0); // 寄存器1: 簇号
    const status = buf.readUInt16LE(2); // 寄存器2: 状态
    const content1 = buf.readUInt16LE(4); // 寄存器3: 内容1
    const content2 = buf.readUInt16LE(6); // 寄存器4: BMU地址
    const content3 = buf.readUInt16LE(8); // 寄存器5: 内容3

    console.log(`[BMU地址自适应查询] 解析成功: 簇${currentCluster}, 状态0x${status.toString(16)}, 内容[0x${content1.toString(16)}, 0x${content2.toString(16)}, 0x${content3.toString(16)}]`);

    return {
      error: false,
      data: {
        success: true,
        currentCluster,
        register1: status, // 兼容现有解析逻辑，将状态映射到register1
        register2: content1,
        register3: content2, // BMU地址
        register4: content3
      }
    };
  }

  // 支持广播模式的多簇结果 (10*N字节，N为簇数量)
  // 每个簇结果: 5个u16寄存器 (10字节)
  if (buf.length > 10 && buf.length % 10 === 0) {
    const clusterCount = buf.length / 10;
    console.log(`[BMU地址自适应查询] 检测到多簇结果: ${clusterCount}个簇，共${buf.length}字节`);

    // 解析所有簇的结果
    const allResults = [];
    for (let i = 0; i < clusterCount; i++) {
      const offset = i * 10;
      const currentCluster = buf.readUInt16LE(offset);     // 寄存器1: 簇号
      const status = buf.readUInt16LE(offset + 2);         // 寄存器2: 状态
      const content1 = buf.readUInt16LE(offset + 4);       // 寄存器3: 内容1
      const content2 = buf.readUInt16LE(offset + 6);       // 寄存器4: BMU地址
      const content3 = buf.readUInt16LE(offset + 8);       // 寄存器5: 内容3

      allResults.push({
        currentCluster,
        status,
        content1,
        content2,
        content3
      });

      console.log(`[BMU地址自适应查询] 簇${currentCluster}: 状态0x${status.toString(16)}, 内容[0x${content1.toString(16)}, 0x${content2.toString(16)}, 0x${content3.toString(16)}]`);
    }

    // 返回第一个簇的结果作为主要结果，但包含所有簇的信息
    const firstResult = allResults[0];
    return {
      error: false,
      data: {
        success: true,
        currentCluster: firstResult.currentCluster,
        register1: firstResult.status,
        register2: firstResult.content1,
        register3: firstResult.content2,
        register4: firstResult.content3,
        totalClusters: clusterCount,
        allResults: allResults // 包含所有簇的结果
      }
    };
  }

  // 其他长度认为是异常
  console.warn(`[BMU地址自适应查询] 意外的响应长度: ${buf.length}字节，期望1字节(错误)或10字节(单簇)或10*N字节(多簇)`);
  return {
    error: true,
    data: {
      success: false,
      code: 255,
      message: `响应长度异常: ${buf.length}字节，期望1字节、10字节或10*N字节`
    }
  };
}

// ========== 单体数据解析函数（从mqtt.js迁移） ==========

/**
 * 通用单体数据解析函数
 * @param {string} hex - 十六进制字符串
 * @param {number} resolution - 分辨率（如0.001表示1mV）
 * @param {string} tag - 数据类型标签（如'volt', 'soc', 'soh'）
 * @param {boolean} isSigned - 是否为有符号数（温度为true，其他为false）
 * @returns {Object} 解析结果 { baseConfig, data }
 */
function processCellDataRAW(hex, resolution, tag = 'cell', isSigned = false) {
  const buf = toBuf(hex);
  const view = dv(buf);

  // 解析表头
  const { baseConfig, nextOffset } = parseByTable(view, CELL_HEADER);

  // 提取 & 删除 AFE-Cell/Temp 原始键
  const afeCellCounts = [], afeTempCounts = [];
  for (let i = 1; i <= 16; i++) {
    afeCellCounts.push(baseConfig[`afeCell${i}`]);
    afeTempCounts.push(baseConfig[`afeTemp${i}`]);
    delete baseConfig[`afeCell${i}`];
    delete baseConfig[`afeTemp${i}`];
  }
  Object.assign(baseConfig, { afeCellCounts, afeTempCounts });

  // 解析数据值
  const totalCount = tag === 'temp' ? baseConfig.totalTemp : baseConfig.totalCell;
  const remaining = view.byteLength - nextOffset;
  const maxCount = Math.floor(remaining / 2);
  const count = Math.min(totalCount, maxCount);

  const valueArr = [];
  for (let i = 0; i < count; i++) {
    const raw = isSigned
      ? pick.s16(view, nextOffset + i * 2)
      : pick.u16(view, nextOffset + i * 2);
    
    // 检查无效值
    let displayValue;
    if (raw === 32767) {
      // 32767是无效值标志，显示为'-'
      displayValue = '---';
    } else if (raw === 32766) {
      // 32766也是无效值标志，显示为'-'
      displayValue = '---';
    } else {
      // 正常值计算
      displayValue = (raw * resolution).toFixed(resolution < 0.01 ? 3 : 1) * 1;
    }
    
    valueArr.push(displayValue);
  }

  // 组装成 BMU-AFE-Cell 树
  const data = [];
  let idx = 0;
  const countsArray = tag === 'temp' ? afeTempCounts : afeCellCounts;

  for (let b = 1; b <= baseConfig.bmuTotal; b++) {
    for (let a = 1; a <= baseConfig.afePerBmu; a++) {
      const elementNum = countsArray[a - 1] || 0;
      if (!elementNum) continue;

      data.push({
        bmuId: b,
        afeId: a,
        class: tag.toUpperCase(),
        element: Array.from({ length: elementNum }, (_, i) => ({
          label: `#${i + 1}`,
          value: valueArr[idx + i] ?? '-'
        }))
      });
      idx += elementNum;
    }
  }

  return { baseConfig, data };
}

/**
 * 单体电压解析函数
 * @param {string} hex - 十六进制字符串
 * @returns {Object} 解析结果
 */
export function processCellVoltageRAW(hex) {
  return processCellDataRAW(hex, 0.001, 'volt', false);
}

/**
 * 单体温度解析函数
 * @param {string} hex - 十六进制字符串
 * @returns {Object} 解析结果
 */
export function processCellTemperatureRAW(hex) {
  return processCellDataRAW(hex, 0.1, 'temp', true);
}

/**
 * 单体SOC解析函数
 * @param {string} hex - 十六进制字符串
 * @returns {Object} 解析结果
 */
export function processCellSocRAW(hex) {
  return processCellDataRAW(hex, 0.1, 'soc', false);
}

/**
 * 单体SOH解析函数
 * @param {string} hex - 十六进制字符串
 * @returns {Object} 解析结果
 */
export function processCellSohRAW(hex) {
  return processCellDataRAW(hex, 0.1, 'soh', false);
}

/**
 * 出厂校正参数解析函数
 * @param {string} hex - 十六进制字符串
 * @returns {Object} 解析结果
 */
export function parseFactoryCalibrationRAW(hex) {
  const buf = toBuf(hex);
  const view = dv(buf);

  // 跳过前2字节的数据长度字段
  const dataOffset = 2;

  // 使用标准的 parseByTable 方法解析
  const { baseConfig } = parseByTable(view, FACTORY_CALIB_PARAM_R, dataOffset);

  // 返回标准格式
  return { error: false, data: baseConfig };
}

// ========== 事件记录解析函数 ==========

/**
 * 解析事件记录标志位数据（event_record_flag_r）
 * 数据格式：数据长度(2字节) + 事件记录标志位(23 * 2字节 = 46字节)
 * 
 * 事件记录标志位的作用：
 * 1. 存储状态管理：记录当前存储了多少条事件记录，存储百分比
 * 2. 读取位置管理：记录写事件记录开始位置，用于确定从哪里开始读取最新记录
 * 3. 删除操作管理：记录删除开始位置和等待删除数量，用于管理删除操作
 * 4. 版本信息：记录上一次事件记录版本号，用于版本兼容性检查
 * 5. 导出计算：根据存储数量和写开始位置，计算导出偏移量（offsetRead = 总数 - 要读数量）
 * 
 * @param {string|Buffer} payload - 十六进制字符串或Buffer
 * @returns {Object} 解析结果
 */
export function parseEventRecordFlagRAW(payload) {
  const buf = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(String(payload).replace(/\s+/g, ''), 'hex');

  if (buf.length === 0) return null;
  
  // 失败响应: 1字节错误码
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0);
    console.error(`event_record_flag_r error: ${errorCode}`);
    return {
      error: true,
      baseConfig: {},
      data: { code: errorCode, message: ERROR_CODES[errorCode] || '未知错误' }
    };
  }

  // 成功响应: 前2字节为数据长度 (字节数)，后续为事件记录标志位数据
  const dataLen = buf.readUInt16LE(0);
  const paramsBuf = buf.slice(2);
  
  if (paramsBuf.length !== dataLen) {
    console.warn(`[parseEventRecordFlagRAW] 数据长度不匹配: 期望 ${dataLen} 字节，实际 ${paramsBuf.length} 字节`);
  }

  // 把 Buffer → DataView
  const view = new DataView(
    paramsBuf.buffer,
    paramsBuf.byteOffset,
    paramsBuf.byteLength
  );

  // 调用通用解析，按EVENT_RECORD_FLAG_R定义将buffer解析为对象
  const { baseConfig } = parseByTable(view, EVENT_RECORD_FLAG_R);
  
  // 使用groupByClass分组数据
  const data = groupByClass(EVENT_RECORD_FLAG_R, baseConfig);
  
  return {
    error: false,
    baseConfig: { DataLength: dataLen },
    data: data
  };
}

/**
 * 解析事件记录数据（event_record_r）
 * 数据格式：数据长度(2字节) + 事件记录偏移量(2字节) + 事件记录数据(128 * 2字节 = 256字节)
 * 
 * 事件记录数据包含：
 * - 时间戳（年、月、日、周、时、分、秒）
 * - 事件类型和参数
 * - 系统状态（电压、电流、温度、SOC、SOH、SOE等）
 * - 故障信息（簇汇总模拟量三级告警、簇汇总硬件故障、堆硬件故障等）
 * - 版本信息（事件记录版本号、BOOT版本号、软件版本号等）
 * - CRC16校验
 * 
 * @param {string|Buffer} payload - 十六进制字符串或Buffer
 * @returns {Object} 解析结果
 */
export function parseEventRecordRAW(payload) {
  const buf = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(String(payload).replace(/\s+/g, ''), 'hex');

  if (buf.length === 0) return null;
  
  // 失败响应: 1字节错误码
  if (buf.length === 1) {
    const errorCode = buf.readUInt8(0);
    console.error(`event_record_r error: ${errorCode}`);
    return {
      error: true,
      baseConfig: {},
      data: { code: errorCode, message: ERROR_CODES[errorCode] || '未知错误' }
    };
  }

  // 成功响应: 前2字节为数据长度，后续为多条记录，每条记录格式为：事件记录偏移量(2字节) + 事件记录数据(256字节)
  // 新协议格式：数据长度(2) + [偏移量(2) + 数据(256)] * M
  const dataLen = buf.readUInt16LE(0);  // 数据长度字段（包含所有记录的偏移量和数据）
  
  // 每条记录的结构：偏移量(2字节) + 数据(256字节) = 258字节
  const RECORD_DATA_SIZE = 256  // 每条记录的数据部分：256字节（128个寄存器 * 2字节）
  const RECORD_TOTAL_SIZE = 2 + RECORD_DATA_SIZE  // 每条记录总长度：偏移量(2) + 数据(256) = 258字节
  
  // 根据实际数据长度计算记录数（从第2字节开始，每条记录258字节）
  const remainingData = buf.length - 2  // 减去数据长度字段(2字节)
  const recordCount = Math.floor(remainingData / RECORD_TOTAL_SIZE)  // 每条记录258字节
  
  // 验证数据长度：数据长度应该等于所有记录的总长度
  const expectedDataLength = RECORD_TOTAL_SIZE * recordCount  // 258 * M
  if (dataLen !== expectedDataLength && recordCount > 0) {
    console.warn(`[parseEventRecordRAW] 数据长度不匹配: header中为${dataLen}字节，计算为${expectedDataLength}字节（记录数${recordCount}）`);
  }
  
  // 如果剩余数据不足以构成一条完整记录，记录警告
  if (remainingData < RECORD_TOTAL_SIZE && recordCount === 0) {
    console.warn(`[parseEventRecordRAW] 数据长度不足: 需要至少${RECORD_TOTAL_SIZE}字节（1条记录），实际 ${remainingData} 字节`);
  }

  // 解析多条记录
  const records = []
  let offset = 2  // 从数据长度字段后开始（第2字节）
  
  for (let i = 0; i < recordCount; i++) {
    // 检查剩余数据是否足够
    if (offset + RECORD_TOTAL_SIZE > buf.length) {
      console.warn(`[parseEventRecordRAW] 记录${i}数据不足: 需要${RECORD_TOTAL_SIZE}字节，剩余 ${buf.length - offset} 字节`);
      break
    }
    
    // 读取本条记录的偏移量（2字节）
    const recordOffset = buf.readUInt16LE(offset)
    offset += 2
    
    // 读取本条记录的数据（256字节）
    const recordDataBuf = buf.slice(offset, offset + RECORD_DATA_SIZE)
    offset += RECORD_DATA_SIZE
    
    if (recordDataBuf.length < RECORD_DATA_SIZE) {
      console.warn(`[parseEventRecordRAW] 记录${i}数据长度不足: 需要${RECORD_DATA_SIZE}字节，实际 ${recordDataBuf.length} 字节`);
      break
    }
    
    // 提取原始寄存器数组（128个寄存器，每个2字节）
    const rawRegisters = []
    for (let j = 0; j < 128; j++) {
      rawRegisters.push(recordDataBuf.readUInt16LE(j * 2))
    }
    
    // 保存原始buffer的副本（用于准确读取非对齐字段）
    const rawBufferCopy = Buffer.from(recordDataBuf)

    // 把 Buffer → DataView
    const view = new DataView(
      recordDataBuf.buffer,
      recordDataBuf.byteOffset,
      recordDataBuf.byteLength
    );

    // 调用通用解析，按EVENT_RECORD_R定义将buffer解析为对象
    const { baseConfig: parsedBaseConfig } = parseByTable(view, EVENT_RECORD_R);
    
    // 将DataLength和RecordOffset合并到baseConfig中
    let baseConfig = {
      DataLength: dataLen,
      RecordOffset: recordOffset,  // 使用从响应中读取的偏移量，而不是计算值
      RecordCount: recordCount,    // 本次响应包含的记录数
      ...parsedBaseConfig // 包含所有解析后的字段值
    }
    
    // 后处理：BCD时间解码 - 事件记录的时间字段是BCD编码的
    // 事件记录时间字段顺序：年-月-日-周-时-分-秒（与系统时间记录的秒-分-时-周-日-月-年不同）
    if (baseConfig.Year !== undefined && baseConfig.Month !== undefined && baseConfig.Day !== undefined) {
      // BCD解码函数
      const parseBCD = (decimalValue) => {
        if (decimalValue === undefined || decimalValue === null) {
          return 0
        }
        let bcd = decimalValue
        let result = 0
        let multiplier = 1
        while (bcd > 0) {
          const digit = bcd % 16
          result += digit * multiplier
          multiplier *= 10
          bcd = Math.floor(bcd / 16)
        }
        return result
      }
      
      // BCD解码并校验
      const parseBCDWithValidation = (decimalValue, min, max) => {
        const value = parseBCD(decimalValue)
        return Math.max(min, Math.min(value, max))
      }
      
      // 保存原始值用于调试
      const yearRaw = baseConfig.Year
      const monthRaw = baseConfig.Month
      const dayRaw = baseConfig.Day
      const weekRaw = baseConfig.Week
      const hourRaw = baseConfig.Hour
      const minuteRaw = baseConfig.Minute
      const secondRaw = baseConfig.Second
      
      // BCD解码时间字段
      baseConfig.Year = 2000 + parseBCDWithValidation(yearRaw, 0, 99)  // 年份后两位，转换为2000-2099
      baseConfig.Month = parseBCDWithValidation(monthRaw, 1, 12)      // 月
      baseConfig.Day = parseBCDWithValidation(dayRaw, 1, 31)          // 日
      baseConfig.Week = parseBCDWithValidation(weekRaw, 1, 53)        // 周（不输出但需要校验）
      baseConfig.Hour = parseBCDWithValidation(hourRaw, 0, 23)        // 时
      baseConfig.Minute = parseBCDWithValidation(minuteRaw, 0, 59)    // 分
      baseConfig.Second = parseBCDWithValidation(secondRaw, 0, 59)    // 秒
    }
    
    // 使用groupByClass分组数据
    const data = groupByClass(EVENT_RECORD_R, baseConfig);

    records.push({
      RecordOffset: recordOffset,  // 使用从响应中读取的偏移量
      baseConfig: baseConfig,
      data: data,
      rawRegisters: rawRegisters,
      rawBuffer: rawBufferCopy
    })
  }

  return {
    error: false,
    baseConfig: {
      DataLength: dataLen,
      RecordOffset: records.length > 0 ? records[0].RecordOffset : 0,  // 第一条记录的偏移量
      RecordCount: recordCount     // 记录数量
    },
    records: records,  // 返回多条记录的数组
    // 为了向后兼容，保留单条记录的字段（第一条记录）
    data: records.length > 0 ? records[0].data : [],
    rawRegisters: records.length > 0 ? records[0].rawRegisters : [],
    rawBuffer: records.length > 0 ? records[0].rawBuffer : null
  };
}


