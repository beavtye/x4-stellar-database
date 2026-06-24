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
      <span>{{ hasQuery ? '搜索结果' : '章节目录' }}</span>
      <b>{{ hasQuery ? `${results.length} 条` : (chapter ? `${chapter.sections.length + chapter.cards.length} 项` : '—') }}</b>
    </header>

    <div v-if="hasQuery" class="lore-result-list">
      <button
        v-for="result in results"
        :key="`${result.chapterId}-${result.id}`"
        type="button"
        class="lore-result-item"
        @click="$emit('select-result', result)"
      >
        <span class="lore-result-chapter">{{ result.chapterTitle }}</span>
        <b>{{ result.title }}</b>
        <small>{{ result.summary }}</small>
      </button>
      <p v-if="!results.length" class="lore-list-empty">没有匹配的正文或档案卡。</p>
    </div>

    <div v-else-if="chapter" class="lore-content-index">
      <div v-if="chapter.sections.length" class="lore-index-group">
        <span class="lore-index-group-label">正文小节</span>
        <button
          v-for="section in chapter.sections"
          :key="section.id"
          type="button"
          :class="{ active: activeAnchor === section.anchor }"
          @click="$emit('jump', section.anchor)"
        >
          <span>{{ section.title }}</span>
        </button>
      </div>
      <div v-if="chapter.cards.length" class="lore-index-group">
        <span class="lore-index-group-label">参考档案</span>
        <button
          v-for="card in chapter.cards.slice(0, 12)"
          :key="card.id"
          type="button"
          :class="{ active: activeAnchor === card.anchor, 'lore-index-card-btn': true }"
          @click="$emit('jump', card.anchor)"
        >
          <small>{{ card.title }}</small>
        </button>
        <p v-if="chapter.cards.length > 12" class="lore-index-more">另有 {{ chapter.cards.length - 12 }} 张档案卡</p>
      </div>
    </div>
  </aside>
</template>
