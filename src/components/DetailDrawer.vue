<script setup>
import { computed } from 'vue'
import { formatValue, isMissing } from '../utils/format'

const props = defineProps({
  row: { type: Object, default: null },
  headers: { type: Array, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  selected: { type: Boolean, required: true }
})
defineEmits(['close', 'toggle-selected', 'suggest'])

const visibleFields = computed(() => {
  if (!props.row) return []
  return props.headers.filter((field) => !field.startsWith('__') && !isMissing(props.row[field]))
})
</script>

<template>
  <div class="drawer-backdrop" :class="{ open: row }" @click="$emit('close')"></div>
  <aside class="drawer" :class="{ open: row }">
    <template v-if="row">
      <header class="drawer-head">
        <div>
          <h3>{{ formatValue(row[nameKey], nameKey) }}</h3>
          <p>{{ row[subKey] || row.__uid }}</p>
        </div>
        <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
      </header>
      <div class="drawer-actions">
        <button type="button" class="btn" @click="$emit('toggle-selected', row)">{{ selected ? '移出对比' : '加入对比' }}</button>
        <button type="button" class="btn" @click="$emit('suggest', row)">提交修订建议</button>
      </div>
      <div class="drawer-body">
        <dl class="detail-list">
          <template v-for="field in visibleFields" :key="field">
            <dt>{{ field }}</dt>
            <dd>{{ formatValue(row[field], field) }}</dd>
          </template>
        </dl>
      </div>
    </template>
  </aside>
</template>
