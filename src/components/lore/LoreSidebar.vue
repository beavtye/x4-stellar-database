<script setup>
defineProps({
  chapters: { type: Array, required: true },
  categories: { type: Array, required: true },
  currentId: { type: String, default: '' },
  currentCategory: { type: String, required: true },
  query: { type: String, default: '' }
})

defineEmits(['select', 'update:category', 'update:query'])
</script>

<template>
  <aside class="lore-sidebar">
    <header class="lore-panel-head">
      <span>章节索引</span>
      <b>{{ chapters.length }} 章</b>
    </header>

    <label class="lore-search">
      <span>搜索编年史</span>
      <input
        :value="query"
        type="search"
        placeholder="章节、派系、事件或关键词"
        autocomplete="off"
        @input="$emit('update:query', $event.target.value)"
      />
    </label>

    <div class="lore-category-tabs">
      <button
        v-for="category in categories"
        :key="category.key"
        type="button"
        :class="{ active: currentCategory === category.key }"
        @click="$emit('update:category', category.key)"
      >
        {{ category.label }}
        <small>{{ category.count }}</small>
      </button>
    </div>

    <nav class="lore-chapter-list">
      <button
        v-for="chapter in chapters"
        :key="chapter.id"
        type="button"
        class="lore-chapter-item"
        :class="{ active: currentId === chapter.id }"
        @click="$emit('select', chapter)"
      >
        <span class="lore-chapter-volume">{{ chapter.volume || '—' }}</span>
        <span class="lore-chapter-text">
          <b>{{ chapter.title }}</b>
          <small>{{ chapter.sections.length }} 节 / {{ chapter.cards.length }} 卡</small>
        </span>
      </button>
      <p v-if="!chapters.length" class="lore-list-empty">没有匹配的编年史章节。</p>
    </nav>
  </aside>
</template>
