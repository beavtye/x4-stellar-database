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

function cardFields(row, columns, nameKey, subKey) {
  return columns
    .filter((field) => field !== nameKey && field !== subKey)
    .map((field) => ({ field, value: formatValue(row[field], field) }))
    .filter((item) => item.value !== '—')
    .slice(0, 8)
}
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
        <template v-for="item in cardFields(row, columns, nameKey, subKey)" :key="item.field">
          <div>
            <dt>{{ item.field }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </template>
      </dl>
    </article>
    <div v-if="!rows.length" class="empty">没有匹配的数据。</div>
  </section>
</template>
