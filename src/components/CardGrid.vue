<script setup>
import { asNumber, formatValue, isNumericField } from '../utils/format'

defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  rowKey: { type: Function, required: true },
  selected: { type: Object, required: true },
  isFavorite: { type: Function, required: true }
})
defineEmits(['open', 'toggle-selected', 'toggle-favorite'])

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
  return [
    isNumericField(field) ? 'card-field-num' : '',
    isIdentityField(field) ? 'card-field-identity' : ''
  ].filter(Boolean).join(' ')
}

function isIdentityField(field) {
  return /尺寸|种族|势力|类型|用途|Mk|制造/.test(field)
}

function cardMeta(row) {
  return ['尺寸', '种族', '势力', '制造种族', '船级/类型', '主要用途', '武器类型', '炮塔类型', '类型']
    .map((field) => formatValue(row[field], field))
    .filter((value, index, arr) => value !== '—' && arr.indexOf(value) === index)
    .slice(0, 3)
}

function metricWidth(value) {
  const n = asNumber(value)
  if (n === null || n <= 0) return 0
  return Math.max(8, Math.min(100, Math.log10(n + 1) * 20))
}
</script>

<template>
  <div class="card-grid">
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
          <div class="card-identity-tags">
            <span v-for="tag in cardMeta(row)" :key="tag">{{ tag }}</span>
          </div>
        </div>
        <div class="card-meta-actions">
          <button
            type="button"
            class="star-btn"
            :class="{ on: isFavorite(row) }"
            :aria-label="isFavorite(row) ? '取消收藏' : '收藏'"
            @click.stop="$emit('toggle-favorite', row)"
          >
            {{ isFavorite(row) ? '★' : '☆' }}
          </button>
          <input type="checkbox" :checked="selected.has(rowKey(row))" @click.stop @change="$emit('toggle-selected', row)" />
          <span v-if="row.__source_type === 'mod'" class="card-source-tag mod">{{ row.__source || 'mod' }}</span>
          <span v-else class="card-source-tag">{{ row.__source || '' }}</span>
        </div>
      </div>
      <dl>
        <template v-for="item in cardFields(row, columns, nameKey, subKey)" :key="item.field">
          <div :class="fieldDivClass(item.field)">
            <dt>{{ item.field }}</dt>
            <dd>
              <template v-if="isNumericField(item.field)">
                <span class="card-metric-value">{{ item.value }}</span>
                <i class="card-metric-bar" :style="{ width: `${metricWidth(row[item.field])}%` }"></i>
              </template>
              <template v-else>
                {{ item.value }}
              </template>
            </dd>
          </div>
        </template>
      </dl>
    </article>
    <div v-if="!rows.length" class="empty">没有匹配的数据。</div>
  </div>
</template>
