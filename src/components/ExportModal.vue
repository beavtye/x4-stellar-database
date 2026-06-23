<script setup>
import { computed, ref } from 'vue'
import { toCsv, downloadText } from '../utils/csv'

const props = defineProps({
  open: { type: Boolean, required: true },
  filteredRows: { type: Array, required: true },
  selectedRows: { type: Array, required: true },
  columns: { type: Array, required: true },
  dataset: { type: String, required: true }
})
defineEmits(['close'])

const scope = ref('filtered')

const exportRows = computed(() => scope.value === 'selected' ? props.selectedRows : props.filteredRows)

function exportCsv() {
  const csv = toCsv(exportRows.value, props.columns)
  downloadText(`x4-${props.dataset}-${scope.value}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8')
}
</script>

<template>
  <div class="modal-backdrop" :class="{ open }" @click="$emit('close')"></div>
  <section class="modal small" :class="{ open }">
    <header class="modal-head">
      <h3>导出 CSV</h3>
      <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
    </header>
    <div class="modal-body">
      <label class="radio-line"><input v-model="scope" value="filtered" type="radio" /> 当前筛选结果：{{ filteredRows.length }} 行</label>
      <label class="radio-line"><input v-model="scope" value="selected" type="radio" /> 已勾选数据：{{ selectedRows.length }} 行</label>
      <p class="muted">导出字段使用当前视图列，避免把全部内部字段一次性塞进 CSV。</p>
      <button type="button" class="btn primary" :disabled="!exportRows.length" @click="exportCsv">下载 CSV</button>
    </div>
  </section>
</template>
