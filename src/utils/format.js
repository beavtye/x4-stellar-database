export function isMissing(value) {
  return value === undefined || value === null || value === '' || value === '—'
}

export function asNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value ?? '').replace(/,/g, '').trim()
  if (!text || text === '—') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

export function formatValue(value, field = '') {
  if (isMissing(value)) return '—'
  const n = asNumber(value)
  if (n !== null && /(价格|Cr|耐久|容量|射程|伤害|DPS|速度|质量|体积)/i.test(field)) {
    return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(n)
  }
  return String(value)
}

export function displayName(row, nameKey = '中文名') {
  return String(row?.[nameKey] || row?.中文名 || row?.英文名 || row?.__uid || '未命名条目')
}

export function compactText(row, fields) {
  return fields.map((field) => `${field}:${row[field] ?? ''}`).join(' ').toLowerCase()
}

export function optionText(value) {
  return String(value ?? '').trim() || '未填写'
}
