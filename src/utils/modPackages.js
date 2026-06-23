export const VANILLA_SOURCE_ID = 'vanilla'
export const PUBLIC_PACK_SOURCE = 'public'
export const LOCAL_PACK_SOURCE = 'local'

export function publicModItemToPack(item) {
  const modId = String(item?.mod_id || item?.id || '').trim()
  const version = Number(item?.version || 1) || 1
  const packageName = String(item?.package_name || item?.mod_package || modId || '公开 mod 数据包').trim()
  return normalizeImportedPack({
    id: `public_${modId || packageName}`,
    source: PUBLIC_PACK_SOURCE,
    modId,
    version,
    packageName,
    authorName: item?.author_name || '',
    createdAt: item?.decided_at || item?.created_at || new Date().toISOString(),
    datasets: item?.datasets || {}
  })
}

export function normalizeImportedPack(pack) {
  const source = pack?.source || LOCAL_PACK_SOURCE
  const modId = String(pack?.modId || pack?.mod_id || '').trim()
  const version = Number(pack?.version || pack?.mod_version || 1) || 1
  const packageName = String(pack?.packageName || pack?.package_name || pack?.mod_package || modId || '未命名 mod 数据包').trim()
  return {
    ...pack,
    id: String(pack?.id || `${source}_${modId || packageName}_${Date.now()}`),
    source,
    modId,
    version,
    packageName,
    authorName: pack?.authorName || pack?.author_name || '',
    createdAt: pack?.createdAt || pack?.created_at || new Date().toISOString(),
    datasets: pack?.datasets || {}
  }
}

export function packStableKey(pack) {
  if (pack?.source === PUBLIC_PACK_SOURCE && pack.modId) return `${PUBLIC_PACK_SOURCE}:${pack.modId}`
  if (pack?.modId) return `${pack.source || LOCAL_PACK_SOURCE}:${pack.modId}`
  return String(pack?.id || '')
}

export function packSourceLabel(pack) {
  const version = pack?.version ? ` v${pack.version}` : ''
  const author = pack?.authorName ? ` / ${pack.authorName}` : ''
  return `${pack?.packageName || pack?.modId || '未命名 mod'}${version}${author}`
}
