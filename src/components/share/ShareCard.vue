<script setup>
import { computed } from 'vue'

const props = defineProps({
  record: { type: Object, required: true },
  layout: { type: String, default: 'landscape' },
  routeText: { type: String, default: '' }
})

const accentStyle = computed(() => {
  const color = props.record?.accentColor || '#5fe1ff'
  return { '--share-accent': color }
})
</script>

<template>
  <div
    id="x4-share-card"
    class="share-card"
    :class="[`share-card-${layout}`, `share-card-type-${record.type || 'unknown'}`, { missing: !record.found }]"
    :style="accentStyle"
  >
    <div class="share-accent-band"></div>
    <div class="share-scanline"></div>
    <div class="share-card-inner">
      <!-- Header: type badge + title -->
      <header class="share-card-head">
        <div class="share-head-left">
          <span class="share-type-badge">{{ record.label }}</span>
          <h1>{{ record.title }}</h1>
          <p class="share-subtitle">{{ record.subtitle }}</p>
        </div>
        <div class="share-mark">X4</div>
      </header>

      <!-- Section: 关键参数 (portrait gets explicit label) -->
      <section class="share-key-section" v-if="record.fields?.length">
        <h2 class="share-section-label" v-if="layout === 'portrait'">关键参数</h2>
        <dl class="share-fields">
          <div v-for="[field, value] in record.fields" :key="field" class="share-field">
            <dt>{{ field }}</dt>
            <dd>{{ value }}</dd>
          </div>
        </dl>
      </section>

      <!-- Section: 摘要 (portrait gets explicit label) -->
      <section class="share-summary-section">
        <h2 class="share-section-label" v-if="layout === 'portrait'">摘要</h2>
        <p class="share-summary">{{ record.summary }}</p>
      </section>

      <!-- Tags -->
      <div class="share-tags" v-if="record.tags?.length">
        <span v-for="tag in record.tags" :key="tag">{{ tag }}</span>
      </div>

      <!-- Section: 来源 -->
      <section class="share-source-section">
        <h2 class="share-section-label" v-if="layout === 'portrait'">来源</h2>
        <footer class="share-footer">
          <span class="share-source-name">来源：{{ record.source || 'X4 星际数据库' }}</span>
          <span class="share-disclaimer">静态资料，不代表当前存档状态</span>
          <code>{{ routeText }}</code>
        </footer>
      </section>
    </div>

    <div class="share-watermark">X4 星际数据库</div>
  </div>
</template>
