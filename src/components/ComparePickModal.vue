<script setup>
import { computed, ref, watch } from 'vue'
import { formatValue } from '../utils/format'

const props = defineProps({
  open: { type: Boolean, required: true },
  rows: { type: Array, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  rowKey: { type: Function, required: true }
})
const emit = defineEmits(['close', 'confirm'])

const picked = ref(new Set())
const pickedRows = computed(() => props.rows.filter((row) => picked.value.has(props.rowKey(row))))
const canConfirm = computed(() => picked.value.size >= 2 && picked.value.size <= 4)

watch(() => props.open, (open) => {
  if (!open) return
  picked.value = new Set(props.rows.slice(0, 4).map((row) => props.rowKey(row)))
}, { immediate: true })

function toggle(row) {
  const key = props.rowKey(row)
  const next = new Set(picked.value)
  if (next.has(key)) next.delete(key)
  else if (next.size < 4) next.add(key)
  picked.value = next
}

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', pickedRows.value)
}
</script>

<template>
  <div class="modal-backdrop" :class="{ open }" @click="$emit('close')"></div>
  <section class="modal compare-pick-modal" :class="{ open }">
    <header class="modal-head">
      <h3>选择进入对比的条目</h3>
      <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
    </header>
    <div class="modal-body">
      <div class="compare-pick-intro">
        <p>你可以勾选很多条用于导出，但数据对比表最多同时展示 4 条。请从已勾选条目里挑 2-4 条进入对比。</p>
        <strong :class="{ ready: canConfirm }">已选择 {{ picked.size }} / 4</strong>
      </div>

      <div class="compare-pick-list">
        <button
          v-for="row in rows"
          :key="rowKey(row)"
          type="button"
          class="compare-pick-row"
          :class="{ active: picked.has(rowKey(row)), disabled: !picked.has(rowKey(row)) && picked.size >= 4 }"
          @click="toggle(row)"
        >
          <span class="pick-check">{{ picked.has(rowKey(row)) ? '✓' : '+' }}</span>
          <span class="pick-name">
            <b>{{ formatValue(row[nameKey], nameKey) }}</b>
            <small>{{ row[subKey] || row.__uid || rowKey(row) }}</small>
          </span>
          <em>{{ row.__source_type === 'mod' ? row.__source || 'mod' : '原版' }}</em>
        </button>
      </div>

      <div class="compare-pick-actions">
        <button type="button" class="btn ghost" @click="$emit('close')">取消</button>
        <button type="button" class="btn primary" :disabled="!canConfirm" @click="confirm">开始对比</button>
      </div>
    </div>
  </section>
</template>
