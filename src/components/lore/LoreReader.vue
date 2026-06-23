<script setup>
defineProps({
  chapter: { type: Object, default: null },
  activeAnchor: { type: String, default: '' }
})

defineEmits(['jump'])
</script>

<template>
  <article v-if="chapter" class="lore-reader">
    <header class="lore-reader-head">
      <span>卷 {{ chapter.volume || '—' }} / {{ chapter.category }}</span>
      <h1>{{ chapter.title }}</h1>
      <p>{{ chapter.summary }}</p>
    </header>

    <section v-if="chapter.sections.length" class="lore-section-list">
      <article
        v-for="section in chapter.sections"
        :id="section.anchor"
        :key="section.id"
        class="lore-section"
        :class="{ active: activeAnchor === section.anchor }"
      >
        <span>{{ section.subtitle }}</span>
        <h2>{{ section.title }}</h2>
        <p>{{ section.summary }}</p>
      </article>
    </section>

    <section v-if="chapter.cards.length" class="lore-card-reference">
      <h2>档案卡</h2>
      <div class="lore-card-list">
        <button
          v-for="card in chapter.cards"
          :id="card.anchor"
          :key="card.id"
          type="button"
          class="lore-reference-card"
          :class="{ active: activeAnchor === card.anchor }"
          @click="$emit('jump', card.anchor)"
        >
          <span>{{ card.subtitle }}</span>
          <b>{{ card.title }}</b>
          <small>{{ card.summary }}</small>
        </button>
      </div>
    </section>
  </article>

  <article v-else class="lore-reader lore-empty">
    <strong>未找到编年史章节</strong>
    <p>请从左侧列表选择一个章节。</p>
  </article>
</template>
