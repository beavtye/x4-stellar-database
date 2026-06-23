<script setup>
import { formatValue } from '../utils/format'

defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  rowKey: { type: Function, required: true },
  selected: { type: Object, required: true }
})
defineEmits(['open', 'toggle-selected'])
</script>

<template>
  <section class="card-grid">
    <article v-for="row in rows" :key="rowKey(row)" class="data-card" @click="$emit('open', row)">
      <div class="card-head">
        <div>
          <h3>{{ formatValue(row[nameKey], nameKey) }}</h3>
          <p>{{ row[subKey] || row.__uid }}</p>
        </div>
        <input type="checkbox" :checked="selected.has(rowKey(row))" @click.stop @change="$emit('toggle-selected', row)" />
      </div>
      <dl>
        <template v-for="field in columns.filter((f) => f !== nameKey && f !== subKey).slice(0, 8)" :key="field">
          <dt>{{ field }}</dt>
          <dd>{{ formatValue(row[field], field) }}</dd>
        </template>
      </dl>
    </article>
    <div v-if="!rows.length" class="empty">没有匹配的数据。</div>
  </section>
</template>
