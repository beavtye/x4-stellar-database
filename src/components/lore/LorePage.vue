<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import LoreIndexPanel from './LoreIndexPanel.vue'
import LoreReader from './LoreReader.vue'
import LoreSidebar from './LoreSidebar.vue'
import { filterLoreChapters, getLoreChapter, loreCategories, loreChapters, loreStats, searchLoreContent } from '../../utils/loreData'
import { loreRouteHref, parseLoreRoute } from '../../utils/loreRoute'

const props = defineProps({
  routeVersion: { type: Number, default: 0 }
})

const query = ref('')
const category = ref('all')
const currentId = ref('')
const activeAnchor = ref('')

const route = computed(() => {
  props.routeVersion
  return parseLoreRoute()
})
const filteredChapters = computed(() => filterLoreChapters(query.value, category.value))
const currentChapter = computed(() => {
  return getLoreChapter(currentId.value) || filteredChapters.value[0] || loreChapters[0] || null
})
const contentResults = computed(() => searchLoreContent(query.value, currentChapter.value))
const hasQuery = computed(() => query.value.trim().length > 0)

function selectChapter(chapter, updateUrl = true) {
  if (!chapter) return
  currentId.value = chapter.id
  activeAnchor.value = ''
  if (updateUrl) window.history.replaceState({}, '', loreRouteHref(chapter.id))
}

async function jumpToAnchor(anchor) {
  activeAnchor.value = anchor
  await nextTick()
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function selectResult(result) {
  const chapter = getLoreChapter(result.chapterId)
  selectChapter(chapter)
  nextTick(() => jumpToAnchor(result.anchor))
}

watch(route, (nextRoute) => {
  const chapter = getLoreChapter(nextRoute.id)
  if (chapter) selectChapter(chapter, false)
}, { immediate: true })

watch(filteredChapters, (chapters) => {
  if (!chapters.length) return
  if (!chapters.some((chapter) => chapter.id === currentId.value)) selectChapter(chapters[0])
})

onMounted(() => {
  if (!currentId.value) selectChapter(loreChapters[0])
})
</script>

<template>
  <main class="lore-page">
    <header class="lore-topbar">
      <div>
        <span>X4 LORE ARCHIVE</span>
        <h1>编年史</h1>
        <p>{{ loreStats.chapters }} 个章节 / {{ loreStats.sections }} 个小节 / {{ loreStats.cards }} 张档案卡，按章节阅读 X 宇宙背景资料。</p>
      </div>
      <nav class="lore-page-links" aria-label="页面入口">
        <a class="btn ghost" href="./">数据库</a>
        <a class="btn ghost" href="#/map">星区地图</a>
      </nav>
    </header>

    <section class="lore-layout">
      <LoreSidebar
        :chapters="filteredChapters"
        :categories="loreCategories"
        :current-id="currentChapter?.id || ''"
        :current-category="category"
        :query="query"
        @select="selectChapter"
        @update:category="category = $event"
        @update:query="query = $event"
      />

      <LoreReader :chapter="currentChapter" :active-anchor="activeAnchor" @jump="jumpToAnchor" />

      <LoreIndexPanel
        :chapter="currentChapter"
        :results="contentResults"
        :has-query="hasQuery"
        :active-anchor="activeAnchor"
        @jump="jumpToAnchor"
        @select-result="selectResult"
      />
    </section>
  </main>
</template>
