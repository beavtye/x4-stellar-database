import { DATASETS, baseRows, loadDatasetPayload, rowIdentity } from '../dataIndex'
import sectors from '../data/sectors.json'
import lore from '../data/lore.json'
import { formatValue, isMissing } from './format'

const TYPE_TO_DATASET = {
  ship: 'ships',
  weapon: 'weapons',
  turret: 'turrets',
  equipment: 'equipment'
}

const TYPE_LABELS = {
  ship: '舰船档案',
  weapon: '武器档案',
  turret: '炮塔档案',
  equipment: '装备档案',
  sector: '星区档案',
  lore: '编年史档案'
}

const FIELD_PRESETS = {
  ship: ['种族', '势力', '尺寸', '船级/类型', '主要用途', '船体耐久', '货舱容量', '平均价格（Cr）'],
  weapon: ['制造种族', '尺寸', 'Mk', '武器类型', '单发伤害', '理论 DPS（估算）', '射程（米）', '平均价格（Cr）'],
  turret: ['制造种族', '尺寸', 'Mk', '炮塔类型', '单发伤害', '理论 DPS（估算）', '射程（米）', '平均价格（Cr）'],
  equipment: ['装备类型', '类型', '尺寸', '制造种族', 'Mk', '关键参数', '平均价格（Cr）', '许可证', '生产资源']
}

const ID_FIELDS = [
  '__uid',
  'ware ID',
  '船只 macro',
  '武器 macro',
  '炮塔 macro',
  '装备 macro',
  'component 引用',
  '英文名',
  '中文名'
]

export async function lookupShareRecord(route) {
  if (!route?.type || !route?.id) {
    return missingRecord(route, '缺少 type 或 id 参数')
  }
  if (TYPE_TO_DATASET[route.type]) {
    return lookupCoreRecord(route)
  }
  if (route.type === 'sector') {
    return lookupCompactRecord(route, sectors.records || [], 'sector')
  }
  if (route.type === 'lore') {
    return lookupCompactRecord(route, lore.records || [], 'lore')
  }
  return missingRecord(route, `暂不支持的分享类型：${route.type}`)
}

export async function exampleShareTarget(type = 'ship') {
  if (TYPE_TO_DATASET[type]) {
    const datasetKey = TYPE_TO_DATASET[type]
    const payload = await loadDatasetPayload(datasetKey)
    const row = baseRows(datasetKey, payload)[0]
    return row ? { type, id: rowIdentity(datasetKey, row) } : null
  }
  if (type === 'sector') {
    const row = (sectors.records || [])[0]
    return row ? { type, id: row.id } : null
  }
  if (type === 'lore') {
    const row = (lore.records || [])[0]
    return row ? { type, id: row.id } : null
  }
  return null
}

async function lookupCoreRecord(route) {
  const datasetKey = TYPE_TO_DATASET[route.type]
  const config = DATASETS[datasetKey]
  const payload = await loadDatasetPayload(datasetKey)
  const rows = baseRows(datasetKey, payload)
  const id = normalizeId(route.id)
  const row = rows.find((item) => {
    if (normalizeId(rowIdentity(datasetKey, item)) === id) return true
    return ID_FIELDS.some((field) => normalizeId(item[field]) === id)
  })
  if (!row) return missingRecord(route, `未找到 ${TYPE_LABELS[route.type]}：${route.id}`)
  const fields = fieldsFromRow(row, FIELD_PRESETS[route.type])
  return {
    found: true,
    type: route.type,
    label: TYPE_LABELS[route.type],
    id: rowIdentity(datasetKey, row),
    title: safeText(row[config.nameKey] || row.中文名 || row.英文名),
    subtitle: buildSubtitle(row, [config.subKey, '尺寸', '船级/类型', '武器类型', '炮塔类型', '类型']),
    summary: buildSummary(row, route.type),
    fields,
    tags: compactTags(row, route.type),
    source: 'X4 星际数据库'
  }
}

function lookupCompactRecord(route, records, family) {
  const id = normalizeId(route.id)
  const allowed = family === 'sector'
    ? new Set(['cluster', 'sector', 'map'])
    : new Set(['lore', 'lore_box', 'lore_section'])
  const row = records.find((item) => allowed.has(item.type) && (
    normalizeId(item.id) === id ||
    normalizeId(item.title) === id ||
    (item.aliases || []).some((alias) => normalizeId(alias) === id)
  ))
  if (!row) return missingRecord(route, `未找到 ${TYPE_LABELS[family]}：${route.id}`)
  return {
    found: true,
    type: family,
    label: row.label || TYPE_LABELS[family],
    id: row.id,
    title: safeText(row.title),
    subtitle: safeText(row.subtitle || row.type),
    summary: clampText(row.summary, family === 'lore' ? 120 : 150),
    fields: compactFields(row.fields, family === 'lore' ? 5 : 6),
    tags: (row.tags || []).slice(0, 4),
    source: 'X4 星际数据库'
  }
}

function missingRecord(route, message) {
  return {
    found: false,
    type: route?.type || 'unknown',
    label: '分享卡',
    id: route?.id || '',
    title: '未找到分享条目',
    subtitle: message,
    summary: '请检查 URL 中的 type 与 id。支持 ship、weapon、turret、equipment、sector、lore。',
    fields: [
      ['type', route?.type || '—'],
      ['id', route?.id || '—']
    ],
    tags: ['not-found'],
    source: 'X4 星际数据库'
  }
}

function fieldsFromRow(row, fields) {
  return fields
    .map((field) => [field, row[field]])
    .filter(([, value]) => !isMissing(value))
    .slice(0, 8)
    .map(([field, value]) => [field, formatValue(value, field)])
}

function compactFields(fields = [], limit = 6) {
  return fields
    .filter(([field, value]) => !isMissing(field) && !isMissing(value))
    .slice(0, limit)
    .map(([field, value]) => [field, formatValue(value, field)])
}

function buildSubtitle(row, fields) {
  return fields
    .map((field) => row[field])
    .filter((value) => !isMissing(value))
    .slice(0, 3)
    .join(' / ') || 'X4 数据档案'
}

function buildSummary(row, type) {
  const candidatesByType = {
    ship: [row.主要用途, row['船级/类型']],
    weapon: [row.类型说明, row.武器类型],
    turret: [row.炮塔类型说明, row.类型说明, row.炮塔类型],
    equipment: [row.关键参数, row.类型]
  }
  const candidates = (candidatesByType[type] || []).filter((value) => !isMissing(value))
  if (candidates.length) return clampText([...new Set(candidates.map(String))].join('；'), 90)
  const fallback = {
    ship: '舰船、槽位、价格与建造资料摘要。',
    weapon: '武器、弹体、射程与价格资料摘要。',
    turret: '炮塔、弹体、射程与价格资料摘要。',
    equipment: '装备、关键参数、价格与生产资料摘要。'
  }
  return fallback[type] || '静态资料摘要。'
}

function compactTags(row, type) {
  return [
    TYPE_LABELS[type],
    row.制造种族 || row.种族,
    row.尺寸,
    row.Mk && `Mk ${row.Mk}`
  ].filter((value) => !isMissing(value)).slice(0, 4).map(String)
}

function safeText(value) {
  return String(value ?? '').trim() || '未命名条目'
}

function clampText(value, maxLength) {
  const text = safeText(value).replace(/\s+/g, ' ')
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function normalizeId(value) {
  return String(value ?? '').trim().toLowerCase()
}
