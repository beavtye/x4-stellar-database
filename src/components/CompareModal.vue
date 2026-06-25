<script setup>
import { computed } from 'vue'
import { asNumber, formatValue } from '../utils/format'

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

const compareStats = computed(() => {
  const stats = new Map()
  fields.value.forEach((field) => {
    const values = props.rows
      .map((row) => asNumber(row[field]))
      .filter((value) => value !== null)
    if (values.length < 2) return
    const min = Math.min(...values)
    const max = Math.max(...values)
    if (min === max) return
    const lowerBetter = isLowerBetter(field)
    const best = lowerBetter ? min : max
    const worst = lowerBetter ? max : min
    const baseline = lowerBetter ? min : max
    stats.set(field, { min, max, best, worst, baseline, lowerBetter })
  })
  return stats
})

function cellMeta(field, row) {
  const stats = compareStats.value.get(field)
  const value = asNumber(row[field])
  if (!stats || value === null) return { className: '', label: '', delta: '' }
  const isBest = value === stats.best
  const isWorst = value === stats.worst
  return {
    className: isBest ? 'compare-best' : isWorst ? 'compare-worst' : '',
    label: isBest ? (stats.lowerBetter ? '最低' : '最佳') : isWorst ? '弱项' : '',
    delta: deltaText(value, stats)
  }
}

function deltaText(value, stats) {
  if (!Number.isFinite(stats.baseline) || stats.baseline === 0) return ''
  const ratio = stats.lowerBetter
    ? (value - stats.baseline) / Math.abs(stats.baseline)
    : (value - stats.baseline) / Math.abs(stats.baseline)
  if (!Number.isFinite(ratio) || Math.abs(ratio) < 0.005) return '基准'
  const sign = ratio > 0 ? '+' : ''
  return `${sign}${(ratio * 100).toFixed(1)}%`
}

function isLowerBetter(field = '') {
  return /(价格|最低价格|最高价格|耗时|时间|装填|冷却|延迟|热量|质量|体积|阻力|惯性|散布|弹药装填|生产方式)/i.test(field)
}
</script>

<template>
  <div class="modal-backdrop" :class="{ open }" @click="$emit('close')"></div>
  <section class="modal wide" :class="{ open }">
    <header class="modal-head">
      <div>
        <span>COMPARE MATRIX</span>
        <h3>数据对比</h3>
        <p>高亮胜出项、弱项和相对差值，用来快速判断同类条目的取舍。</p>
      </div>
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
            <td
              v-for="row in rows"
              :key="field + (row.__uid || row[nameKey])"
              :class="cellMeta(field, row).className"
            >
              <span class="compare-value">{{ formatValue(row[field], field) }}</span>
              <span v-if="cellMeta(field, row).label || cellMeta(field, row).delta" class="compare-cell-note">
                <b v-if="cellMeta(field, row).label">{{ cellMeta(field, row).label }}</b>
                <i v-if="cellMeta(field, row).delta">{{ cellMeta(field, row).delta }}</i>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
