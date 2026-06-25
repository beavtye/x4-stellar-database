<script setup>
import { computed } from 'vue'

const props = defineProps({
  target: { type: String, default: '' }
})

const legacySrc = computed(() => `${import.meta.env.BASE_URL}legacy/index.html${props.target}`)
const switchHref = computed(() => (props.target === '#/map' ? '#/map-vue' : '#/database-vue'))
const switchLabel = computed(() => (props.target === '#/map' ? '切换到 Vue 星图' : '切换到 Vue 数据库'))

function handleLoad(event) {
  if (props.target !== '#/map') return
  const win = event.target?.contentWindow
  win?.openAtlasV4?.()
  window.setTimeout(() => win?.openAtlasV4?.(), 300)
}
</script>

<template>
  <main class="legacy-exact-page">
    <a class="legacy-vue-switch" :href="switchHref" :aria-label="switchLabel">
      <span>Vue 施工版</span>
      <strong>{{ switchLabel }}</strong>
    </a>
    <iframe
      class="legacy-exact-frame"
      :src="legacySrc"
      title="X4 星际数据库 legacy exact view"
      @load="handleLoad"
    ></iframe>
  </main>
</template>
