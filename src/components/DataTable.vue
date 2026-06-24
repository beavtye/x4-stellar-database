<script setup>
import { formatValue, isNumericField } from '../utils/format'

defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  sort: { type: Object, required: true },
  rowKey: { type: Function, required: true },
  selected: { type: Object, required: true }
})
defineEmits(['sort', 'open', 'toggle-selected'])

function thClass(field) {
  return isNumericField(field) ? 'num' : ''
}
</script>

<template>
  <section class="table-card">
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th class="select-col"></th>
            <th v-for="field in columns" :key="field" :class="thClass(field)" @click="$emit('sort', field)">
              {{ field }}
              <span v-if="sort.field === field">{{ sort.dir === 'asc' ? '↑' : '↓' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="rowKey(row)" :class="{ selected: selected.has(rowKey(row)) }" @dblclick="$emit('open', row)">
            <td class="select-col">
              <input type="checkbox" :checked="selected.has(rowKey(row))" @change="$emit('toggle-selected', row)" />
            </td>
            <td v-for="field in columns" :key="field" :class="isNumericField(field) ? 'num' : ''" @click="$emit('open', row)">
              <template v-if="field === nameKey">
                <b class="name-main">{{ formatValue(row[field], field) }}</b>
                <small class="name-sub">{{ row[subKey] }}</small>
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
  </section>
</template>
