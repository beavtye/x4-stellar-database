import sectors from '../data/sectors.json'

const MAP_RECORD_TYPE = 'map'
const MAP_RECORDS = (sectors.records || []).filter((record) => {
  return record?.type === MAP_RECORD_TYPE && Number.isFinite(record?.map?.x) && Number.isFinite(record?.map?.y)
})

export const sectorMapNodes = MAP_RECORDS.map(normalizeMapRecord)
export const mapBounds = buildMapBounds(sectorMapNodes)
export const mapStats = {
  total: sectorMapNodes.length,
  clusters: new Set(sectorMapNodes.map((node) => node.clusterTitle).filter(Boolean)).size
}

export function searchSectorNodes(query, nodes = sectorMapNodes) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return nodes
  return nodes.filter((node) => {
    const haystack = node.searchText
    return terms.every((term) => haystack.includes(term))
  })
}

export function getSectorNode(id) {
  const normalizedId = normalizeSearch(id)
  return sectorMapNodes.find((node) => {
    return normalizeSearch(node.id) === normalizedId ||
      normalizeSearch(node.title) === normalizedId ||
      node.aliases.some((alias) => normalizeSearch(alias) === normalizedId)
  }) || null
}

function normalizeMapRecord(record) {
  const fields = compactFields(record.fields)
  const detailFields = compactFields((record.detailSections || []).flatMap((section) => section.fields || []))
  const fieldMap = new Map([...fields, ...detailFields].map(([key, value]) => [key, value]))
  const tags = Array.isArray(record.tags) ? record.tags.filter(Boolean).map(String) : []
  const resources = Array.isArray(record.resources) ? record.resources.map(normalizeResource).filter(Boolean) : []
  const aliases = Array.isArray(record.aliases) ? record.aliases.filter(Boolean).map(String) : []
  const dlc = fieldMap.get('DLC') || ''

  return {
    id: String(record.id || record.title),
    title: safeText(record.title, '未命名星区'),
    subtitle: safeText(record.subtitle || record.clusterTitle || '星图区资料'),
    clusterTitle: safeText(record.clusterTitle || fieldMap.get('所属星系') || '未标明星系'),
    summary: safeText(record.summary || '暂无描述。'),
    x: Number(record.map.x),
    y: Number(record.map.y),
    mapWidth: Number(record.map.width) || 1680,
    mapHeight: Number(record.map.height) || 1165,
    fields,
    detailFields,
    tags,
    aliases,
    resources,
    dlc,
    hasResources: resources.some((resource) => resource.yield > 0),
    hasAnomaly: tags.some((tag) => /anomaly/i.test(tag)),
    searchText: normalizeSearch([
      record.id,
      record.title,
      record.subtitle,
      record.clusterTitle,
      dlc,
      ...aliases,
      ...tags
    ].join(' '))
  }
}

function normalizeResource(resource) {
  const label = safeText(resource.label || resource.ware, '')
  if (!label) return null
  return {
    ware: safeText(resource.ware, ''),
    label,
    yield: Number(resource.yield) || 0,
    amount: Number(resource.amount) || 0,
    areas: Number(resource.areas) || 0,
    tiers: Array.isArray(resource.tiers) ? resource.tiers.filter(Boolean).map(String) : [],
    speeds: Array.isArray(resource.speeds) ? resource.speeds.filter(Boolean).map(String) : []
  }
}

function buildMapBounds(nodes) {
  const width = Math.max(...nodes.map((node) => node.mapWidth), 1680)
  const height = Math.max(...nodes.map((node) => node.mapHeight), 1165)
  return {
    x: 0,
    y: 0,
    width,
    height,
    padding: 72
  }
}

function compactFields(fields = []) {
  const seen = new Set()
  return fields
    .filter(([key, value]) => key && value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => [String(key), String(value)])
    .filter(([key]) => {
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function safeText(value, fallback) {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeSearch(value) {
  return String(value ?? '').trim().toLowerCase()
}
