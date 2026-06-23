<script setup>
defineProps({
  fields: { type: Array, required: true },
  options: { type: Object, required: true },
  filters: { type: Object, required: true },
  sourceMode: { type: String, required: true },
  sourceOptions: { type: Array, required: true },
  selectedSourceIds: { type: Object, required: true }
})
defineEmits(['update-filter', 'reset', 'update-source-mode', 'toggle-source'])
</script>

<template>
  <section class="filter-panel">
    <div class="source-filter">
      <div class="source-filter-head">
        <span>数据来源</span>
        <div class="segmented">
          <button type="button" :class="{ active: sourceMode === 'vanilla' }" @click="$emit('update-source-mode', 'vanilla')">原版</button>
          <button type="button" :class="{ active: sourceMode === 'all' }" @click="$emit('update-source-mode', 'all')">全部</button>
          <button type="button" :class="{ active: sourceMode === 'custom' }" @click="$emit('update-source-mode', 'custom')">指定 mod</button>
        </div>
      </div>
      <div v-if="sourceMode === 'custom'" class="source-choice-list">
        <label v-for="source in sourceOptions.filter((item) => item.kind !== 'vanilla')" :key="source.id" class="source-choice">
          <input type="checkbox" :checked="selectedSourceIds.has(source.id)" @change="$emit('toggle-source', source.id)" />
          <b>{{ source.shortLabel || source.label }}</b>
          <small>{{ source.count }} 条</small>
        </label>
        <p v-if="sourceOptions.filter((item) => item.kind !== 'vanilla').length === 0">还没有可筛选的 mod 数据。</p>
      </div>
    </div>
    <div class="filter-grid">
      <label v-for="field in fields" :key="field" class="filter-field">
        <span>{{ field }}</span>
        <select :value="filters[field] || ''" @change="$emit('update-filter', field, $event.target.value)">
          <option value="">全部</option>
          <option v-for="value in options[field]" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>
    </div>
    <button type="button" class="btn ghost" @click="$emit('reset')">重置筛选</button>
  </section>
</template>
