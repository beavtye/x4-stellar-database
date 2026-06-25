<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { isShareRoute } from './utils/shareRoute'
import { isMapRoute } from './utils/mapRoute'
import { isLoreRoute } from './utils/loreRoute'
import { isBenchmarkRoute } from './utils/benchmarkRoute'

const SharePage = defineAsyncComponent(() => import('./components/share/SharePage.vue'))
const LegacyExactPage = defineAsyncComponent(() => import('./components/legacy/LegacyExactPage.vue'))
const DatabasePage = defineAsyncComponent(() => import('./components/DatabasePage.vue'))
const SectorMapPage = defineAsyncComponent(() => import('./components/map/SectorMapPage.vue'))
const LorePage = defineAsyncComponent(() => import('./components/lore/LorePage.vue'))
const BenchmarkPage = defineAsyncComponent(() => import('./components/benchmark/BenchmarkPage.vue'))
const routeVersion = ref(0)

const routeState = computed(() => {
  routeVersion.value
  const pathname = window.location.pathname || ''
  const hash = window.location.hash || ''
  return { pathname, hash }
})
const shareMode = computed(() => isShareRoute(routeState.value))
const mapMode = computed(() => isMapRoute(routeState.value))
const legacyMode = computed(() => {
  const { pathname, hash } = routeState.value
  return pathname === '/legacy' || hash === '#/legacy' || isRootRoute(pathname, hash)
})
const legacyMapMode = computed(() => {
  const { pathname, hash } = routeState.value
  return pathname === '/legacy-map' || hash === '#/legacy-map' || pathname === '/map' || hash === '#/map'
})
const mapVueMode = computed(() => {
  const { pathname, hash } = routeState.value
  return pathname === '/map-vue' || hash.startsWith('#/map-vue')
})
const databaseVueMode = computed(() => {
  const { pathname, hash } = routeState.value
  return pathname === '/database-vue' || hash.startsWith('#/database-vue')
})
const loreMode = computed(() => isLoreRoute(routeState.value))
const benchmarkMode = computed(() => isBenchmarkRoute(routeState.value))

function updateRoute() {
  routeVersion.value += 1
}

function isRootRoute(pathname, hash) {
  const isRootPath = pathname === '/' || pathname === ''
  const isRootHash = hash === '' || hash === '#/'
  return isRootPath && isRootHash
}

onMounted(() => {
  window.addEventListener('popstate', updateRoute)
  window.addEventListener('hashchange', updateRoute)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', updateRoute)
  window.removeEventListener('hashchange', updateRoute)
})
</script>

<template>
  <SharePage v-if="shareMode" :route-version="routeVersion" />
  <LegacyExactPage v-else-if="legacyMapMode" target="#/map" />
  <LegacyExactPage v-else-if="legacyMode" />
  <SectorMapPage v-else-if="mapVueMode" />
  <LorePage v-else-if="loreMode" :route-version="routeVersion" />
  <BenchmarkPage v-else-if="benchmarkMode" />
  <DatabasePage v-else-if="databaseVueMode" />
  <DatabasePage v-else />
</template>
