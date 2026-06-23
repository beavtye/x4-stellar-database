<script setup>
defineProps({
  chapter: { type: Object, default: null },
  results: { type: Array, default: () => [] },
  hasQuery: { type: Boolean, default: false },
  activeAnchor: { type: String, default: '' }
})

defineEmits(['jump', 'select-result'])
</script>

<template>
  <aside class="lore-index-panel">
    <header class="lore-panel-head">
      <span>{{ hasQuery ? 'RESULTS' : 'CONTENTS' }}</span>
      <b>{{ hasQuery ? `${results.length} 条` : '章节目录' }}</b>
    </header>

    <div v-if="hasQuery" class="lore-result-list">
      <button
        v-for="result in results"
        :key="`${result.chapterId}-${result.id}`"
        type="button"
        class="lore-result-item"
        @click="$emit('select-result', result)"
      >
        <span>{{ result.chapterTitle }}</span>
        <b>{{ result.title }}</b>
        <small>{{ result.summary }}</small>
      </button>
      <p v-if="!results.length" class="lore-list-empty">没有匹配的正文或档案卡。</p>
    </div>

    <div v-else-if="chapter" class="lore-content-index">
      <button
        v-for="section in chapter.sections"
        :key="section.id"
        type="button"
        :class="{ active: activeAnchor === section.anchor }"
        @click="$emit('jump', section.anchor)"
      >
        <span>{{ section.title }}</span>
      </button>
      <button
        v-for="card in chapter.cards.slice(0, 12)"
        :key="card.id"
        type="button"
        :class="{ active: activeAnchor === card.anchor }"
        @click="$emit('jump', card.anchor)"
      >
        <small>{{ card.title }}</small>
      </button>
    </div>
  </aside>
</template>
