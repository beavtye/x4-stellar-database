import sectors from '../data/sectors.json'
import atlasV4 from '../data/atlas-v4.json'

const MAP_RECORD_TYPE = 'map'
const MAP_RECORDS = (sectors.records || []).filter((record) => {
  return record?.type === MAP_RECORD_TYPE && Number.isFinite(record?.map?.x) && Number.isFinite(record?.map?.y)
})

export const atlasMeta = atlasV4.meta || {}
const atlasClusterById = new Map((atlasV4.clusters || []).map((cluster) => [cluster.id, cluster]))
const atlasSectorById = new Map((atlasV4.sectors || []).map((sector) => [sector.id, normalizeAtlasSector(sector)]))

export const sectorMapNodes = MAP_RECORDS.map(normalizeMapRecord)
export const mapBounds = buildMapBounds(sectorMapNodes)
export const mapStats = {
  total: atlasV4.meta?.sectorCount || sectorMapNodes.length,
  clusters: atlasV4.meta?.systemCount || new Set(sectorMapNodes.map((node) => node.clusterTitle).filter(Boolean)).size,
  edges: atlasV4.meta?.edgeCount || 0,
  dlc: atlasV4.meta?.dlcCount || 0
}

export const atlasMapBounds = {
  x: 0,
  y: 0,
  width: Number(atlasMeta.width) || 1680,
  height: Number(atlasMeta.height) || 1165,
  padding: 72
}
export const atlasResourceOptions = Object.entries(atlasMeta.resourceLabels || {}).map(([key, label]) => ({ key, label }))
export const atlasDlcOptions = Object.entries(atlasMeta.dlcLabels || {}).map(([key, label]) => ({
  key,
  label,
  short: atlasMeta.dlcShort?.[key] || key
}))
export const atlasEdges = (atlasV4.edges || []).map((edge) => ({
  ...edge,
  source: atlasSectorById.get(edge.a),
  target: atlasSectorById.get(edge.b)
})).filter((edge) => edge.source && edge.target)
export const atlasSectorNodes = Array.from(atlasSectorById.values())

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

export function getAtlasSectorNode(id) {
  const normalizedId = normalizeSearch(id)
  return atlasSectorNodes.find((node) => {
    return normalizeSearch(node.id) === normalizedId ||
      normalizeSearch(node.title) === normalizedId ||
      normalizeSearch(node.fullName) === normalizedId
  }) || null
}

export function filterAtlasSectors({ query = '', resource = 'all', dlc = 'all' } = {}) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  return atlasSectorNodes.filter((node) => {
    if (resource !== 'all' && !node.resources.some((item) => item.ware === resource && item.yield > 0)) return false
    if (dlc !== 'all' && node.dlc !== dlc) return false
    if (!terms.length) return true
    return terms.every((term) => node.searchText.includes(term))
  })
}

export function rankAtlasSectors(resourceKey = atlasResourceOptions[0]?.key || 'ore') {
  return atlasSectorNodes
    .map((node) => {
      const resource = node.resources.find((item) => item.ware === resourceKey)
      return { node, resource, value: Number(resource?.yield) || 0 }
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
}

export function getAtlasClusterSectors(node) {
  if (!node) return []
  return atlasSectorNodes.filter((sector) => sector.clusterId === node.clusterId)
}

function normalizeAtlasSector(sector) {
  const resources = Array.isArray(sector.resources) ? sector.resources.map(normalizeResource).filter(Boolean) : []
  const cluster = atlasClusterById.get(sector.clusterId)
  const tags = Array.isArray(sector.tags) ? sector.tags.filter(Boolean).map(String) : []
  return {
    id: String(sector.id || sector.display),
    code: safeText(sector.code, ''),
    title: safeText(sector.display, sector.fullName || '未命名星区'),
    fullName: safeText(sector.fullName, sector.display || '未命名星区'),
    clusterId: safeText(sector.clusterId, ''),
    clusterTitle: safeText(cluster?.display || cluster?.fullName || sector.fullName, '未标明星系'),
    summary: safeText(sector.description || sector.excerpt || cluster?.description || '暂无描述。', '暂无描述。'),
    excerpt: safeText(sector.excerpt || sector.description || '', ''),
    x: Number(sector.x) || 0,
    y: Number(sector.y) || 0,
    labelX: Number(sector.labelX) || Number(sector.x) || 0,
    labelY: Number(sector.labelY) || Number(sector.y) || 0,
    dlc: safeText(sector.dlc, 'base'),
    dlcLabel: safeText(sector.dlcLabel, atlasMeta.dlcLabels?.[sector.dlc] || '本体'),
    dlcShort: safeText(sector.dlcShort, atlasMeta.dlcShort?.[sector.dlc] || 'X4'),
    sunlight: sector.sunlight,
    economy: sector.economy,
    security: sector.security,
    tags,
    resources,
    hasResources: resources.some((resource) => resource.yield > 0),
    hasAnomaly: tags.some((tag) => /anomaly/i.test(tag)),
    searchText: normalizeSearch([
      sector.id,
      sector.code,
      sector.display,
      sector.fullName,
      sector.svgName,
      cluster?.display,
      cluster?.fullName,
      sector.dlcLabel,
      sector.dlcShort,
      ...tags
    ].join(' '))
  }
}

function normalizeMapRecord(record) {
  const primaryFields = compactFields(record.fields)
  const supplementFields = compactFields((record.detailSections || []).flatMap((section) => section.fields || []))
  const allFields = [...primaryFields, ...supplementFields]
  const fieldMap = new Map(allFields.map(([key, value]) => [key, value]))
  const tags = Array.isArray(record.tags) ? record.tags.filter(Boolean).map(String) : []
  const resources = Array.isArray(record.resources) ? record.resources.map(normalizeResource).filter(Boolean) : []
  const aliases = Array.isArray(record.aliases) ? record.aliases.filter(Boolean).map(String) : []
  const dlc = fieldMap.get('DLC') || ''

  // Separate visible tags from internal ones
  const visibleTags = tags.filter((tag) => !/^cluster_/i.test(tag) && !/macro/i.test(tag))

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
    fields: primaryFields,
    supplementFields,
    tags,
    visibleTags,
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
