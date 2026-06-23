<script setup>
defineProps({
  fields: { type: Array, required: true },
  options: { type: Object, required: true },
  filters: { type: Object, required: true }
})
defineEmits(['update-filter', 'reset'])
</script>

<template>
  <section class="filter-panel">
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
