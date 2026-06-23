<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import ShareCard from './ShareCard.vue'
import { lookupShareRecord } from '../../utils/shareLookup'
import { parseShareRoute, shareRouteText } from '../../utils/shareRoute'

const props = defineProps({
  routeVersion: { type: Number, default: 0 }
})

const route = computed(() => {
  props.routeVersion
  return parseShareRoute()
})
const record = computed(() => lookupShareRecord(route.value))
const routeText = computed(() => shareRouteText(route.value))

async function setReady() {
  await nextTick()
  window.X4ShareReady = true
  window.X4Share = {
    ...(window.X4Share || {}),
    ready: true,
    record: record.value,
    route: route.value,
    exportPng: window.X4Share?.exportPng || (() => {
      throw new Error('Vue 分享页当前使用 DOM 截图方案，exportPng 将在后续阶段补齐。')
    })
  }
  document.body.dataset.shareReady = '1'
}

function clearReady() {
  window.X4ShareReady = false
  if (window.X4Share) window.X4Share.ready = false
  delete document.body.dataset.shareReady
}

onMounted(setReady)
onBeforeUnmount(clearReady)
watch([record, route], setReady, { flush: 'post' })
</script>

<template>
  <main class="share-page" :class="`share-page-${route.layout}`">
    <ShareCard :record="record" :layout="route.layout" :route-text="routeText" />
    <p class="share-ready-hint">BOT READY: <code>1</code></p>
  </main>
</template>
