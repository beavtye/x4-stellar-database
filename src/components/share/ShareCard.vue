<script setup>
defineProps({
  record: { type: Object, required: true },
  layout: { type: String, default: 'landscape' },
  routeText: { type: String, default: '' }
})
</script>

<template>
  <div id="x4-share-card" class="share-card" :class="[`share-card-${layout}`, { missing: !record.found }]">
    <div class="share-scanline"></div>
    <div class="share-card-inner">
      <header class="share-card-head">
        <div>
          <span class="share-kicker">{{ record.label }}</span>
          <h1>{{ record.title }}</h1>
          <p>{{ record.subtitle }}</p>
        </div>
        <div class="share-mark">X4</div>
      </header>

      <p class="share-summary">{{ record.summary }}</p>

      <dl class="share-fields">
        <div v-for="[field, value] in record.fields" :key="field" class="share-field">
          <dt>{{ field }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>

      <div class="share-tags" v-if="record.tags?.length">
        <span v-for="tag in record.tags" :key="tag">{{ tag }}</span>
      </div>

      <footer class="share-footer">
        <span>来源：{{ record.source || 'X4 星际数据库' }}</span>
        <span>静态资料，不代表当前存档状态</span>
        <code>{{ routeText }}</code>
      </footer>
    </div>
  </div>
</template>
