<script setup>
import { computed } from 'vue'
import { formatValue } from '../utils/format'

const props = defineProps({
  open: { type: Boolean, required: true },
  rows: { type: Array, required: true },
  headers: { type: Array, required: true },
  nameKey: { type: String, required: true }
})
defineEmits(['close', 'clear'])

const fields = computed(() => {
  const useful = props.headers.filter((field) => !field.startsWith('__'))
  return useful.filter((field) => props.rows.some((row) => row[field] !== undefined && row[field] !== '' && row[field] !== '—')).slice(0, 80)
})
</script>

<template>
  <div class="modal-backdrop" :class="{ open }" @click="$emit('close')"></div>
  <section class="modal wide" :class="{ open }">
    <header class="modal-head">
      <h3>数据对比</h3>
      <div>
        <button type="button" class="btn ghost" @click="$emit('clear')">清空</button>
        <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
      </div>
    </header>
    <div class="modal-body">
      <div v-if="rows.length < 2" class="empty">至少选择两条数据后再对比。</div>
      <table v-else class="compare-table">
        <thead>
          <tr>
            <th>字段</th>
            <th v-for="row in rows" :key="row.__uid || row[nameKey]">{{ row[nameKey] }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in fields" :key="field">
            <th>{{ field }}</th>
            <td v-for="row in rows" :key="field + (row.__uid || row[nameKey])">{{ formatValue(row[field], field) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
