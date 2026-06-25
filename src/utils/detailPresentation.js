import { formatValue, isMissing, isZeroLike, isZeroNoiseField } from './format'

const PRICE_FIELDS = ['最低价格（Cr）', '平均价格（Cr）', '最高价格（Cr）']
const MATERIAL_FIELDS = ['建造材料', '生产资源']

const TECH_FIELD_RULES = [
  /^__/,
  /macro/i,
  /^ware ID$/i,
  /component 引用/i,
  /来源文件/,
  /原始/,
  /生产资源原文/,
  /完整 ware 标签/,
  /ware 分组/i,
  /名称状态/,
  /数据状态/,
  /搜索别名/
]

const SECTION_RULES = [
  {
    key: 'identity',
    title: '基础资料',
    test: (field) => /种族|势力|制造种族|尺寸|船级|主要用途|武器类型|炮塔类型|装备类型|Mk|货物类型|许可证/.test(field)
  },
  {
    key: 'stats',
    title: '性能参数',
    test: (field) => /耐久|容量|伤害|DPS|射程|速度|寿命|射速|弹数|管数|散布|热量|冷却|过热|护盾|船体|回复|AOE|范围|转向|加速度/.test(field)
  },
  {
    key: 'slots',
    title: '槽位',
    test: (field) => /槽|停靠|机库/.test(field)
  },
  {
    key: 'notes',
    title: '说明',
    test: (field) => /备注|说明|关键参数|描述/.test(field)
  }
]

export function buildDetailPresentation(row, headers, options = {}) {
  if (!row) return { sections: [], priceItems: [], materialItems: [], technicalItems: [] }

  const hidden = new Set([options.nameKey, options.subKey].filter(Boolean))
  const fields = uniqueFields(headers, row)
  const priceItems = []
  const materialItems = []
  const technicalItems = []
  const buckets = new Map(SECTION_RULES.map((rule) => [rule.key, { title: rule.title, items: [] }]))
  const otherItems = []

  for (const field of fields) {
    if (!field || hidden.has(field)) continue
    const value = row[field]
    if (isMissing(value)) continue
    if (isZeroLike(value) && isZeroNoiseField(field)) continue

    if (isTechnicalField(field)) {
      const formatted = formatValue(value, field)
      if (!isMissing(formatted)) technicalItems.push({ field, value: formatted, wide: true })
      continue
    }

    if (PRICE_FIELDS.includes(field)) {
      const formatted = formatValue(value, field)
      if (formatted !== '—') priceItems.push({ field: field.replace('（Cr）', ''), value: formatted })
      continue
    }

    if (MATERIAL_FIELDS.includes(field)) {
      const formatted = formatValue(value, field)
      if (formatted !== '—' && !materialItems.some((item) => item.value === formatted)) {
        materialItems.push({ field, value: formatted, wide: true })
      }
      continue
    }

    const formatted = formatValue(value, field)
    if (formatted === '—') continue
    const item = { field, value: formatted, wide: shouldBeWide(field, formatted) }
    const section = SECTION_RULES.find((rule) => rule.test(field))
    if (section) buckets.get(section.key).items.push(item)
    else otherItems.push(item)
  }

  const sections = [...buckets.values()].filter((section) => section.items.length)
  if (priceItems.length) {
    sections.push({
      title: '价格',
      items: priceItems.map((item) => ({ ...item, wide: priceItems.length === 1 })),
      compact: true
    })
  }
  if (materialItems.length) sections.push({ title: '建造材料', items: materialItems })
  if (otherItems.length) sections.push({ title: '其他资料', items: otherItems })

  return { sections, priceItems, materialItems, technicalItems }
}

export function rowSubtitle(row, subKey) {
  const value = row?.[subKey]
  if (!isMissing(value)) return formatValue(value, subKey)
  return formatValue(row?.__uid, '__uid')
}

function uniqueFields(headers, row) {
  const seen = new Set()
  return [...headers, ...Object.keys(row || {})].filter((field) => {
    if (seen.has(field)) return false
    seen.add(field)
    return true
  })
}

function isTechnicalField(field) {
  return TECH_FIELD_RULES.some((rule) => rule.test(field))
}

function shouldBeWide(field, value) {
  return /备注|说明|关键参数|描述|材料|资源|生产方式/.test(field) || String(value).length > 42
}
