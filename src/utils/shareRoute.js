const SHARE_PATH = '/share'

export function isShareRoute(locationLike = window.location) {
  const pathname = locationLike.pathname || ''
  const hash = locationLike.hash || ''
  return pathname === SHARE_PATH || hash.startsWith('#/share')
}

export function parseShareRoute(locationLike = window.location) {
  const hash = locationLike.hash || ''
  const rawQuery = hash.startsWith('#/share') && hash.includes('?')
    ? hash.slice(hash.indexOf('?') + 1)
    : (locationLike.search || '').replace(/^\?/, '')
  const params = new URLSearchParams(rawQuery)
  return {
    type: normalizeType(params.get('type')),
    id: String(params.get('id') || '').trim(),
    layout: params.get('layout') === 'portrait' ? 'portrait' : 'landscape'
  }
}

export function normalizeType(type) {
  const value = String(type || '').trim().toLowerCase()
  const aliases = {
    ships: 'ship',
    weapons: 'weapon',
    turrets: 'turret',
    equipments: 'equipment',
    clusters: 'sector',
    cluster: 'sector',
    sectors: 'sector',
    maps: 'sector',
    map: 'sector',
    lore_box: 'lore',
    lore_section: 'lore'
  }
  return aliases[value] || value
}

export function shareRouteText(route) {
  const type = route?.type || 'unknown'
  const id = route?.id || 'missing-id'
  const layout = route?.layout === 'portrait' ? '&layout=portrait' : ''
  return `/share?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}${layout}`
}
