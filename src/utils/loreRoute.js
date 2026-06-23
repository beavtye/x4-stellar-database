const LORE_PATH = '/lore'

export function isLoreRoute(locationLike = window.location) {
  const pathname = locationLike.pathname || ''
  const hash = locationLike.hash || ''
  return pathname === LORE_PATH || hash.startsWith('#/lore')
}

export function parseLoreRoute(locationLike = window.location) {
  const hash = locationLike.hash || ''
  const rawQuery = hash.startsWith('#/lore') && hash.includes('?')
    ? hash.slice(hash.indexOf('?') + 1)
    : (locationLike.search || '').replace(/^\?/, '')
  const params = new URLSearchParams(rawQuery)
  return {
    id: String(params.get('id') || '').trim()
  }
}

export function loreRouteHref(id) {
  return `#/lore${id ? `?id=${encodeURIComponent(id)}` : ''}`
}
