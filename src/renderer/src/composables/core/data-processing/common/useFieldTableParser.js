/**
 * 通用“字段表驱动解析”工具
 *
 * 适用场景：
 * - 页面只关心“字段表（table.js）”定义的字段顺序、缩放、偏移、枚举映射、位域拆分
 * - 原始数据为寄存器形式的 u16 数组（rawData），按字段表顺序逐个解析
 *
 * 字段表支持的关键字段（常用）：
 * - key / label / class / hide
 * - type: 'u16' | 's16' | 'bit' | 'bits'
 * - scale: 缩放因子，显示值 = raw / scale
 * - offset: 偏移量，显示值 = raw/scale + offset
 * - map: 枚举映射（例如 0->停机，1->运行）
 *
 * 位域拆分（与 PCS 表风格一致）：
 * - 基寄存器字段：type:'u16' 或 type:'s16'（通常 hide:true），key 作为 bitsOf 的引用源
 * - 派生位字段：type:'bit' 或 type:'bits'，并提供 bitsOf/baseKey + bit (+ len)
 *   - bit: 起始位（0~15）
 *   - len: 仅 type:'bits' 时使用，表示位宽（例如 2 表示 2bit 枚举）
 *
 * 多字（wordLength）支持：
 * - 默认每个字段消耗 1 个 u16 寄存器
 * - 若字段提供 wordLength>1，则按“高字在前”的大端顺序拼接为一个整型数
 */
export const getDecimalsByScale = (scale) => {
  if (!scale || scale === 1) return 0
  const s = String(scale)
  return s.length - 1
}

/**
 * 从 label 中提取单位：例如 '出水温度(℃)' -> '℃'
 */
export const getFieldUnit = (field) => {
  const label = field?.label
  if (!label || typeof label !== 'string') return ''
  if (label.includes('(') && label.includes(')')) {
    const match = label.match(/\(([^)]+)\)/)
    return match ? match[1] : ''
  }
  return ''
}

/**
 * 计算字段表“单台设备”占用的寄存器字数
 * - bitsOf 派生字段不占用寄存器
 * - 其它字段默认 1 个寄存器，或使用 wordLength（例如电表的 2 字拼接）
 */
export const countWordsForFields = (fields) => {
  const list = Array.isArray(fields) ? fields : []
  let count = 0
  for (const field of list) {
    const isDerivedBits = (field?.type === 'bit' || field?.type === 'bits') && field?.bitsOf
    if (isDerivedBits) continue
    const wordLength =
      typeof field?.wordLength === 'number' && field.wordLength > 0 ? field.wordLength : 1
    count += wordLength
  }
  return count
}

/**
 * 构建模板数据（仅用于页面在无数据/无设备时展示“结构”）
 * - bitsOf 派生字段会额外带 parentKey/bitIndex，方便统一做 label 翻译与显示
 */
export const buildTemplateData = (fields) => {
  const list = Array.isArray(fields) ? fields : []
  return list.map((field) => {
    const isDerivedBits = (field.type === 'bit' || field.type === 'bits') && field.bitsOf
    return {
      class: field.class,
      label: field.label,
      value: '---',
      map: field.map,
      key: field.key,
      unit: getFieldUnit(field),
      hide: field.hide === true,
      type: field.type,
      parentKey: isDerivedBits ? field.bitsOf : undefined,
      bitIndex: isDerivedBits ? field.bit : undefined,
      rawValue: null
    }
  })
}

/**
 * 解析字段表数据
 * - 顺序消费 rawData（u16数组）
 * - 基字段：做 s16 处理、scale/offset、map 映射与小数位格式化
 * - bitsOf 派生字段：从 baseWordByKey[bitsOf] 取基寄存器值并做位解码
 */
export const parseFieldTableData = (rawData, fields) => {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return buildTemplateData(fields)
  }

  const list = Array.isArray(fields) ? fields : []
  const baseWordByKey = {}
  const result = []
  let wordIndex = 0

  for (const field of list) {
    const isBitsType = field.type === 'bit' || field.type === 'bits'
    const isDerivedBits = isBitsType && field.bitsOf

    if (isDerivedBits) {
      // 派生位字段：不消耗寄存器，从 bitsOf 指定的基寄存器字段取值
      const baseKey = field.bitsOf
      const baseWord = baseWordByKey[baseKey]
      if (baseWord === undefined) {
        result.push({
          class: field.class,
          label: field.label,
          value: '---',
          rawValue: null,
          map: field.map,
          key: field.key,
          unit: getFieldUnit(field),
          hide: field.hide === true,
          type: field.type,
          parentKey: baseKey,
          bitIndex: field.bit
        })
        continue
      }

      const bit = typeof field.bit === 'number' ? field.bit : Number(field.bit || 0)
      const len =
        field.type === 'bits'
          ? typeof field.len === 'number'
            ? field.len
            : Number(field.len || 1)
          : 1
      const mask = len >= 16 ? 0xffff : (1 << len) - 1
      const decoded = (baseWord >> bit) & mask

      let value = decoded
      if (field.map && field.map[value] !== undefined) {
        value = field.map[value]
      }

      result.push({
        class: field.class,
        label: field.label,
        value,
        rawValue: decoded,
        map: field.map,
        key: field.key,
        unit: getFieldUnit(field),
        hide: field.hide === true,
        type: field.type,
        parentKey: baseKey,
        bitIndex: bit
      })
      continue
    }

    const wordLength =
      typeof field.wordLength === 'number' && field.wordLength > 0 ? field.wordLength : 1
    if (wordIndex + wordLength > rawData.length) {
      result.push({
        class: field.class,
        label: field.label,
        value: '---',
        rawValue: null,
        map: field.map,
        key: field.key,
        unit: getFieldUnit(field),
        hide: field.hide === true,
        type: field.type
      })
      wordIndex += wordLength
      continue
    }

    let rawValue
    if (wordLength === 1) {
      rawValue = rawData[wordIndex]
    } else {
      // 多字拼接：按“高字在前”的顺序合成为一个整数
      let v = 0
      for (let i = 0; i < wordLength; i++) {
        v = v * 65536 + rawData[wordIndex + i]
      }
      rawValue = v
    }

    baseWordByKey[field.key] = rawValue
    wordIndex += wordLength

    let value = rawValue
    if (field.type === 's16' && wordLength === 1 && value > 32767) {
      value = value - 65536
    }

    if (field.scale && field.scale !== 1) {
      value = value / field.scale
    }

    if (typeof field.offset === 'number' && field.offset !== 0) {
      value = value + field.offset
    }

    let displayValue = value
    if (field.map && field.map[value] !== undefined) {
      displayValue = field.map[value]
    } else if (!field.map && typeof value === 'number') {
      // 没有 map 时，用 scale 推导小数位数，保证显示稳定（例如 scale=10 -> 1位小数）
      const decimals = getDecimalsByScale(field.scale)
      displayValue = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()
    }

    result.push({
      class: field.class,
      label: field.label,
      value: displayValue,
      rawValue: value,
      map: field.map,
      key: field.key,
      unit: getFieldUnit(field),
      hide: field.hide === true,
      type: field.type
    })
  }

  return result
}
