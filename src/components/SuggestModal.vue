<script setup>
import { reactive, ref, watch } from 'vue'
import { postProposal } from '../utils/reviewApi'

const props = defineProps({
  open: { type: Boolean, required: true },
  row: { type: Object, default: null },
  dataset: { type: String, required: true },
  datasetLabel: { type: String, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  headers: { type: Array, required: true }
})
const emit = defineEmits(['close'])

const form = reactive({
  submitter: localStorage.getItem('x4_suggest_submitter') || '',
  contact: localStorage.getItem('x4_suggest_contact') || '',
  note: ''
})
const status = ref('')

watch(() => props.open, (open) => {
  if (open) {
    form.note = ''
    status.value = '提交后进入待审核列表，批准前不会影响正式数据。'
  }
})

async function submitSuggestion() {
  if (!props.row) return
  if (form.note.trim().length < 4) {
    status.value = '请至少写清楚要修改哪里。'
    return
  }
  localStorage.setItem('x4_suggest_submitter', form.submitter)
  localStorage.setItem('x4_suggest_contact', form.contact)
  status.value = '正在提交...'
  try {
    const snapshot = {}
    for (const field of props.headers) {
      if (field.startsWith('__')) continue
      const value = props.row[field]
      if (value !== undefined && value !== null && value !== '') snapshot[field] = String(value).slice(0, 2000)
    }
    const data = await postProposal({
      type: 'correction',
      dataset: props.dataset,
      record_id: String(props.row.__uid || props.row['ware ID'] || props.row[props.nameKey] || ''),
      title: String(props.row[props.nameKey] || '未命名条目'),
      submitter: form.submitter,
      contact: form.contact,
      note: form.note,
      payload: {
        dataset_label: props.datasetLabel,
        subtitle: String(props.row[props.subKey] || ''),
        record: snapshot
      }
    })
    status.value = `已提交到待审核列表，编号 #${data.id}。`
  } catch (err) {
    status.value = `提交失败：${err.message}`
  }
}
</script>

<template>
  <div class="modal-backdrop" :class="{ open }" @click="$emit('close')"></div>
  <section class="modal small" :class="{ open }">
    <header class="modal-head">
      <h3>提交修订建议</h3>
      <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
    </header>
    <form class="modal-body import-body" @submit.prevent="submitSuggestion">
      <section v-if="row" class="import-status">
        <b>{{ row[nameKey] || '未命名条目' }}</b>
        <small>{{ datasetLabel }} · {{ row[subKey] || row.__uid }}</small>
      </section>
      <div class="form-grid">
        <label><span>提交者</span><input v-model="form.submitter" /></label>
        <label><span>联系方式</span><input v-model="form.contact" /></label>
        <label class="wide"><span>修订说明</span><textarea v-model="form.note" required /></label>
      </div>
      <p class="muted">{{ status }}</p>
      <button type="submit" class="btn primary">提交到审核服务</button>
    </form>
  </section>
</template>
