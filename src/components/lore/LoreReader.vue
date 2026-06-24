<script setup>
import { categoryLabel } from '../../utils/loreData'

defineProps({
  chapter: { type: Object, default: null },
  activeAnchor: { type: String, default: '' }
})

defineEmits(['jump'])

function cardArchiveId(card) {
  const field = card.fields?.find(([key]) => key === '档案编号')
  return field ? field[1] : ''
}
</script>

<template>
  <article v-if="chapter" class="lore-reader">
    <header class="lore-reader-head">
      <div class="lore-reader-breadcrumb">
        <span>卷 {{ chapter.volume || '—' }}</span>
        <span class="lore-reader-category">{{ categoryLabel(chapter.category) }}</span>
      </div>
      <h1>{{ chapter.title }}</h1>
      <p v-if="chapter.summary" class="lore-reader-desc">{{ chapter.summary }}</p>
    </header>

    <div v-if="chapter.sections.length" class="lore-section-list">
      <article
        v-for="section in chapter.sections"
        :id="section.anchor"
        :key="section.id"
        class="lore-section"
        :class="{ active: activeAnchor === section.anchor }"
      >
        <div class="lore-section-head">
          <h2>{{ section.title }}</h2>
        </div>
        <p v-if="section.summary" class="lore-section-summary">{{ section.summary }}</p>
      </article>
    </div>

    <div v-if="chapter.cards.length" class="lore-card-reference">
      <h2 class="lore-card-section-title">参考档案</h2>
      <div class="lore-card-list">
        <article
          v-for="card in chapter.cards"
          :id="card.anchor"
          :key="card.id"
          class="lore-reference-card"
          :class="{ active: activeAnchor === card.anchor }"
        >
          <div
            class="lore-card-inner"
            role="button"
            tabindex="0"
            @click="$emit('jump', card.anchor)"
            @keydown.enter="$emit('jump', card.anchor)"
            @keydown.space.prevent="$emit('jump', card.anchor)"
          >
            <div class="lore-card-meta">
              <span class="lore-card-type">{{ card.subtitle }}</span>
              <span v-if="cardArchiveId(card)" class="lore-card-archive-id">{{ cardArchiveId(card) }}</span>
            </div>
            <h3>{{ card.title }}</h3>
            <p v-if="card.summary" class="lore-card-summary">{{ card.summary }}</p>
          </div>
        </article>
      </div>
    </div>
  </article>

  <article v-else class="lore-reader lore-empty">
    <div class="lore-empty-inner">
      <span class="lore-empty-label">编年史档案</span>
      <strong>请选择一个章节</strong>
      <p>从左侧目录选取章节，开始阅读 X 宇宙背景资料。</p>
    </div>
  </article>
</template>
