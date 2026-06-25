<script setup>
import { computed, ref } from 'vue'
import { toCsv, downloadText } from '../utils/csv'

const props = defineProps({
  open: { type: Boolean, required: true },
  filteredRows: { type: Array, required: true },
  selectedRows: { type: Array, required: true },
  currentRow: { type: Object, default: null },
  headers: { type: Array, required: true },
  columns: { type: Array, required: true },
  dataset: { type: String, required: true }
})
defineEmits(['close'])

const scope = ref('filtered')
const fieldMode = ref('visible')

const exportRows = computed(() => {
  if (scope.value === 'selected') return props.selectedRows
  if (scope.value === 'current') return props.currentRow ? [props.currentRow] : []
  return props.filteredRows
})
const exportColumns = computed(() => {
  if (fieldMode.value === 'all') return props.headers.filter((field) => !field.startsWith('__'))
  if (fieldMode.value === 'player') return props.headers.filter(isPlayerReadableField)
  return props.columns
})
const exportSummary = computed(() => {
  const scopeText = {
    filtered: '当前筛选结果',
    selected: '已勾选对比项',
    current: '当前打开词条'
  }[scope.value] || '当前筛选结果'
  const fieldText = {
    visible: '当前显示字段',
    player: '玩家可读字段',
    all: '全部字段'
  }[fieldMode.value] || '当前显示字段'
  return `${scopeText} · ${exportRows.value.length} 行 · ${fieldText} ${exportColumns.value.length} 列`
})

function exportCsv() {
  const csv = toCsv(exportRows.value, exportColumns.value)
  downloadText(`x4-${props.dataset}-${scope.value}-${fieldMode.value}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8')
}

function isPlayerReadableField(field) {
  if (!field || field.startsWith('__')) return false
  return ![
    /^ware ID$/i,
    /macro/i,
    /component 引用/i,
    /来源文件/,
    /原始/,
    /生产资源原文/,
    /完整 ware 标签/,
    /ware 分组/i,
    /搜索别名/,
    /名称状态/,
    /数据状态/
  ].some((rule) => rule.test(field))
}
</script>

<template>
  <div class="modal-backdrop" :class="{ open }" @click="$emit('close')"></div>
  <section class="modal small" :class="{ open }">
    <header class="modal-head">
      <div>
        <span>EXPORT CONSOLE</span>
        <h3>导出 CSV</h3>
        <p>选择范围和字段口径，只导出你需要的资料。</p>
      </div>
      <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
    </header>
    <div class="modal-body">
      <div class="export-options">
        <section class="export-option-group">
          <strong>导出范围</strong>
          <label class="radio-line">
            <input v-model="scope" value="filtered" type="radio" />
            <span>当前筛选结果 <small>{{ filteredRows.length }} 行</small></span>
          </label>
          <label class="radio-line">
            <input v-model="scope" value="selected" type="radio" />
            <span>已勾选对比项 <small>{{ selectedRows.length }} 行</small></span>
          </label>
          <label class="radio-line" :class="{ disabled: !currentRow }">
            <input v-model="scope" value="current" type="radio" :disabled="!currentRow" />
            <span>当前打开词条 <small>{{ currentRow ? '1 行' : '未打开词条' }}</small></span>
          </label>
        </section>

        <section class="export-option-group">
          <strong>导出字段</strong>
          <label class="radio-line">
            <input v-model="fieldMode" value="visible" type="radio" />
            <span>当前显示字段 <small>{{ columns.length }} 列</small></span>
          </label>
          <label class="radio-line">
            <input v-model="fieldMode" value="player" type="radio" />
            <span>玩家可读字段 <small>隐藏维护字段</small></span>
          </label>
          <label class="radio-line">
            <input v-model="fieldMode" value="all" type="radio" />
            <span>全部字段 <small>包含宏名、来源等</small></span>
          </label>
        </section>
      </div>
      <p class="export-summary">{{ exportSummary }}</p>
      <button type="button" class="btn primary" :disabled="!exportRows.length || !exportColumns.length" @click="exportCsv">下载 CSV</button>
    </div>
  </section>
</template>
