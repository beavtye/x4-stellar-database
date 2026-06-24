<script setup>
import { formatValue, isNumericField } from '../utils/format'

defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  rowKey: { type: Function, required: true },
  selected: { type: Object, required: true }
})
defineEmits(['open', 'toggle-selected'])

const PRIORITY_FIELD_RE = /(价格|Cr|耐久|容量|伤害|DPS|射程|速度|尺寸|种族|势力|类型|用途|装备类型|武器类型|炮塔类型)/i

function cardFields(row, columns, nameKey, subKey) {
  return columns
    .filter((field) => field !== nameKey && field !== subKey && !field.startsWith('__'))
    .map((field) => ({ field, value: formatValue(row[field], field) }))
    .filter((item) => item.value !== '—')
    .sort((a, b) => {
      const aPrio = PRIORITY_FIELD_RE.test(a.field) ? 0 : 1
      const bPrio = PRIORITY_FIELD_RE.test(b.field) ? 0 : 1
      return aPrio - bPrio
    })
    .slice(0, 8)
}

function fieldDivClass(field) {
  return isNumericField(field) ? 'card-field-num' : ''
}
</script>

<template>
  <section class="card-grid">
    <article
      v-for="row in rows"
      :key="rowKey(row)"
      class="data-card"
      :class="{ selected: selected.has(rowKey(row)) }"
      @click="$emit('open', row)"
    >
      <div class="card-head">
        <div>
          <h3>{{ formatValue(row[nameKey], nameKey) }}</h3>
          <p>{{ row[subKey] || row.__uid }}</p>
        </div>
        <div class="card-meta-actions">
          <input type="checkbox" :checked="selected.has(rowKey(row))" @click.stop @change="$emit('toggle-selected', row)" />
          <span v-if="row.__source_type === 'mod'" class="card-source-tag mod">{{ row.__source || 'mod' }}</span>
          <span v-else class="card-source-tag">{{ row.__source || '' }}</span>
        </div>
      </div>
      <dl>
        <template v-for="item in cardFields(row, columns, nameKey, subKey)" :key="item.field">
          <div :class="fieldDivClass(item.field)">
            <dt>{{ item.field }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </template>
      </dl>
    </article>
    <div v-if="!rows.length" class="empty">没有匹配的数据。</div>
  </section>
</template>
