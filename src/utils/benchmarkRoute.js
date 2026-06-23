const BENCHMARK_PATH = '/benchmark'

export function isBenchmarkRoute(locationLike = window.location) {
  const pathname = locationLike.pathname || ''
  const hash = locationLike.hash || ''
  return pathname === BENCHMARK_PATH || hash.startsWith('#/benchmark')
}
