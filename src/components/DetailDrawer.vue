<script setup>
import { computed } from 'vue'
import { formatValue, isNumericField } from '../utils/format'
import { buildDetailPresentation, rowSubtitle } from '../utils/detailPresentation'

const props = defineProps({
  row: { type: Object, default: null },
  headers: { type: Array, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  selected: { type: Boolean, required: true }
})
defineEmits(['close', 'toggle-selected', 'suggest'])

const detail = computed(() => buildDetailPresentation(props.row, props.headers, {
  nameKey: props.nameKey,
  subKey: props.subKey
}))
const subtitle = computed(() => rowSubtitle(props.row, props.subKey))
const sourceLabel = computed(() => props.row?.__source || '')
const sourceType = computed(() => props.row?.__source_type === 'mod' ? 'mod' : 'vanilla')

function ddClass(field) {
  return isNumericField(field) ? 'num' : ''
}
</script>

<template>
  <div class="drawer-backdrop" :class="{ open: row }" @click="$emit('close')"></div>
  <aside class="drawer" :class="{ open: row }">
    <template v-if="row">
      <header class="drawer-head">
        <div class="drawer-title">
          <span class="drawer-source" :class="sourceType">{{ sourceLabel }}</span>
          <h3>{{ formatValue(row[nameKey], nameKey) }}</h3>
          <p>{{ subtitle }}</p>
        </div>
        <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
      </header>
      <div class="drawer-actions">
        <button type="button" class="btn" @click="$emit('toggle-selected', row)">{{ selected ? '移出对比' : '加入对比' }}</button>
        <button type="button" class="btn" @click="$emit('suggest', row)">提交修订建议</button>
      </div>
      <div class="drawer-body">
        <section v-for="section in detail.sections" :key="section.title" class="detail-group">
          <h4>{{ section.title }}</h4>
          <dl class="detail-grid" :class="{ compact: section.compact }">
            <div v-for="item in section.items" :key="item.field" class="detail-item" :class="{ wide: item.wide }">
              <dt>{{ item.field }}</dt>
              <dd :class="ddClass(item.field)">{{ item.value }}</dd>
            </div>
          </dl>
        </section>

        <details v-if="detail.technicalItems.length" class="detail-tech">
          <summary>技术信息（{{ detail.technicalItems.length }} 项）</summary>
          <dl class="detail-grid">
            <div v-for="item in detail.technicalItems" :key="item.field" class="detail-item wide tech">
              <dt>{{ item.field }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
        </details>
      </div>
    </template>
  </aside>
</template>
