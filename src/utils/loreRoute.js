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
    id: String(params.get('id') || '').trim(),
    anchor: String(params.get('anchor') || '').trim()
  }
}

export function loreRouteHref(id, anchor = '') {
  const params = new URLSearchParams()
  if (id) params.set('id', id)
  if (anchor) params.set('anchor', anchor)
  const query = params.toString()
  return `#/lore${query ? `?${query}` : ''}`
}
