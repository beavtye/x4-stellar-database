<script setup>
import { asNumber, formatValue, isNumericField } from '../utils/format'

defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  sort: { type: Object, required: true },
  rowKey: { type: Function, required: true },
  selected: { type: Object, required: true },
  isFavorite: { type: Function, required: true }
})
defineEmits(['sort', 'open', 'toggle-selected', 'toggle-favorite'])

function thClass(field) {
  return [
    isNumericField(field) ? 'num' : '',
    isPrimaryNameField(field) ? 'name-col' : '',
    isBadgeField(field) ? 'badge-col' : ''
  ].filter(Boolean).join(' ')
}

function tdClass(field) {
  return [
    isNumericField(field) ? 'num' : '',
    isPrimaryNameField(field) ? 'name-col' : '',
    isBadgeField(field) ? 'badge-col' : ''
  ].filter(Boolean).join(' ')
}

function isPrimaryNameField(field) {
  return /中文名|名称|name/i.test(field)
}

function isBadgeField(field) {
  return /尺寸|种族|势力|类型|用途|Mk|制造/.test(field)
}

function fieldKind(field) {
  if (/价格|Cr/.test(field)) return 'price'
  if (/DPS|伤害|耐久|容量|射程|速度|推力|恢复|转向|加速度|寿命/.test(field)) return 'metric'
  if (isBadgeField(field)) return 'badge'
  return 'text'
}

function metricWidth(value) {
  const n = asNumber(value)
  if (n === null || n <= 0) return 0
  const scaled = Math.log10(n + 1) * 20
  return Math.max(8, Math.min(100, scaled))
}
</script>

<template>
  <div class="table-shell">
    <table>
      <thead>
        <tr>
          <th class="favorite-col" aria-label="收藏"></th>
          <th class="select-col" aria-label="勾选"></th>
          <th v-for="field in columns" :key="field" :class="thClass(field)" @click="$emit('sort', field)">
            {{ field }}
            <span v-if="sort.field === field">{{ sort.dir === 'asc' ? '↑' : '↓' }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="rowKey(row)" :class="{ selected: selected.has(rowKey(row)) }" @dblclick="$emit('open', row)">
          <td class="favorite-col">
            <button
              type="button"
              class="star-btn"
              :class="{ on: isFavorite(row) }"
              :aria-label="isFavorite(row) ? '取消收藏' : '收藏'"
              @click.stop="$emit('toggle-favorite', row)"
            >
              {{ isFavorite(row) ? '★' : '☆' }}
            </button>
          </td>
          <td class="select-col">
            <input type="checkbox" :checked="selected.has(rowKey(row))" @change="$emit('toggle-selected', row)" />
          </td>
          <td v-for="field in columns" :key="field" :class="tdClass(field)" @click="$emit('open', row)">
            <template v-if="field === nameKey">
              <span class="table-name-cell">
                <b class="name-main">{{ formatValue(row[field], field) }}</b>
                <small class="name-sub">{{ formatValue(row[subKey], subKey) }}</small>
              </span>
            </template>
            <template v-else-if="fieldKind(field) === 'metric' || fieldKind(field) === 'price'">
              <span class="metric-cell" :class="`metric-${fieldKind(field)}`">
                <span class="metric-value">{{ formatValue(row[field], field) }}</span>
                <i class="metric-bar" :style="{ width: `${metricWidth(row[field])}%` }"></i>
              </span>
            </template>
            <template v-else-if="fieldKind(field) === 'badge'">
              <span class="table-badge">{{ formatValue(row[field], field) }}</span>
            </template>
            <template v-else>
              <span class="cell-text">{{ formatValue(row[field], field) }}</span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!rows.length" class="empty">没有匹配的数据。</div>
  </div>
</template>
