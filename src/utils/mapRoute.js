const MAP_PATH = '/map'

export function isMapRoute(locationLike = window.location) {
  const pathname = locationLike.pathname || ''
  const hash = locationLike.hash || ''
  return pathname === MAP_PATH || hash === '#/map' || hash.startsWith('#/map?')
}
