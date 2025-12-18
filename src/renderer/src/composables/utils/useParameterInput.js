import { ref } from 'vue'
export function useRawInputCache(prefixOrFn) {
  const rawInputCache = ref({})

  function resolvePrefix() {
    return typeof prefixOrFn === 'function' ? String(prefixOrFn() || '') : String(prefixOrFn || '')
  }

  function makeKey(paramOrKey) {
    const key = typeof paramOrKey === 'string' ? paramOrKey : String(paramOrKey?.key || '')
    const prefix = resolvePrefix()
    return prefix ? `${prefix}:${key}` : key
  }

  function setRawInput(paramOrKey, raw) {
    const k = makeKey(paramOrKey)
    rawInputCache.value = { ...rawInputCache.value, [k]: raw }
  }

  function getRawInput(paramOrKey) {
    const k = makeKey(paramOrKey)
    return rawInputCache.value[k]
  }

  function clearByPrefix(prefix) {
    const p = String(prefix || '')
    if (!p) return
    const next = {}
    Object.keys(rawInputCache.value || {}).forEach((k) => {
      if (!String(k).startsWith(`${p}:`)) next[k] = rawInputCache.value[k]
    })
    rawInputCache.value = next
  }

  function clearAll() {
    rawInputCache.value = {}
  }

  function getInputDisplay(param, currentVal, fallbackGetter) {
    const raw = getRawInput(param)
    if (raw !== undefined && raw !== null) return String(raw)
    const v = typeof fallbackGetter === 'function' ? fallbackGetter(param, currentVal) : currentVal
    return v === undefined || v === null ? '' : String(v)
  }

  return {
    rawInputCache,
    makeKey,
    setRawInput,
    getRawInput,
    clearByPrefix,
    clearAll,
    getInputDisplay
  }
}

export function isNumericType(paramOrType) {
  const t = String(
    (typeof paramOrType === 'string' ? paramOrType : paramOrType?.type) || ''
  ).toLowerCase()
  return (
    t === 'u8' ||
    t === 's8' ||
    t === 'u16' ||
    t === 's16' ||
    t === 'u32' ||
    t === 's32' ||
    t === 'f32'
  )
}

export function normalizeNumericString(raw) {
  if (raw === undefined || raw === null) return ''
  return String(raw).replace(/,/g, '').trim()
}

export function getUiRange(paramOrType, maybeScale) {
  const type = String(
    (typeof paramOrType === 'string' ? paramOrType : paramOrType?.type) || ''
  ).toLowerCase()
  const scale =
    Number(typeof paramOrType === 'string' ? maybeScale || 1 : paramOrType?.scale || 1) || 1
  switch (type) {
    case 'u8':
      return { min: 0, max: 255 / scale }
    case 's8':
      return { min: -128 / scale, max: 127 / scale }
    case 'u16':
      return { min: 0, max: 65535 / scale }
    case 's16':
      return { min: -32768 / scale, max: 32767 / scale }
    case 'u32':
      return { min: 0, max: 4294967295 / scale }
    case 's32':
      return { min: -2147483648 / scale, max: 2147483647 / scale }
    case 'f32':
      return { min: -3.4e38, max: 3.4e38 }
    default:
      return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY }
  }
}

export function validateNumericInput(param, raw, i18n) {
  const { t, te } = i18n || {}
  const cleaned = normalizeNumericString(raw)
  if (cleaned === '') {
    const msg =
      te && te('toast.remoteControl.invalidNumberEmpty')
        ? t('toast.remoteControl.invalidNumberEmpty')
        : '输入为空'
    return { valid: false, reason: 'empty', message: msg }
  }
  const num = Number(cleaned)
  if (!Number.isFinite(num)) {
    const msg =
      te && te('toast.remoteControl.invalidNumberFormat')
        ? t('toast.remoteControl.invalidNumberFormat')
        : '请输入合法数值'
    return { valid: false, reason: 'nan', message: msg }
  }
  const { min, max } = getUiRange(param)
  if (num < min || num > max) {
    const rangeText = `${min} ~ ${max}`
    const msg =
      te && te('toast.remoteControl.outOfRange')
        ? t('toast.remoteControl.outOfRange', { range: rangeText })
        : `越界范围：${rangeText}`
    return { valid: false, reason: 'out_of_range', message: msg }
  }
  return { valid: true, value: num }
}

export function validateIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  if (!ipRegex.test(ip)) return false
  const parts = ip.split('.')
  return parts.every((part) => {
    const num = parseInt(part, 10)
    return num >= 0 && num <= 255
  })
}
