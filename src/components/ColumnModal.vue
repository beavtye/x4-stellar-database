<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, required: true },
  headers: { type: Array, required: true },
  activeColumns: { type: Array, required: true },
  defaultColumns: { type: Array, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  datasetLabel: { type: String, required: true }
})
const emit = defineEmits(['close', 'apply'])

const draft = ref(new Set())
const query = ref('')

const visibleHeaders = computed(() => props.headers.filter((field) => !field.startsWith('__')))
const filteredHeaders = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return visibleHeaders.value
  return visibleHeaders.value.filter((field) => field.toLowerCase().includes(keyword))
})
const pickedCount = computed(() => draft.value.size)

watch(() => props.open, (open) => {
  if (!open) return
  draft.value = new Set(props.activeColumns.filter((field) => visibleHeaders.value.includes(field)))
  query.value = ''
}, { immediate: true })

function setDraft(fields) {
  const required = [props.nameKey, props.subKey].filter(Boolean)
  draft.value = new Set([...required, ...fields.filter((field) => visibleHeaders.value.includes(field))])
}

function toggle(field) {
  const next = new Set(draft.value)
  if (next.has(field)) {
    if (field === props.nameKey) return
    next.delete(field)
  } else {
    next.add(field)
  }
  draft.value = next
}

function pickDefault() {
  setDraft(props.defaultColumns)
}

function pickCore() {
  const coreRe = /(中文名|英文名|种族|势力|制造种族|尺寸|Mk|类型|用途|价格|耐久|容量|伤害|DPS|射程|速度)/i
  setDraft(visibleHeaders.value.filter((field) => coreRe.test(field)).slice(0, 18))
}

function pickAll() {
  setDraft(visibleHeaders.value)
}

function hideTechnical() {
  const technicalRe = /(macro|ID|id|原文|xml|source|tag|标签|文件|路径|代码|ware|component|connection|storage|group)/i
  setDraft([...draft.value].filter((field) => field === props.nameKey || !technicalRe.test(field)))
}

function apply() {
  const next = [...draft.value].filter((field) => visibleHeaders.value.includes(field))
  emit('apply', next.length ? next : props.defaultColumns)
}
</script>

<template>
  <div class="modal-backdrop" :class="{ open }" @click="$emit('close')"></div>
  <section class="modal wide column-modal" :class="{ open }">
    <header class="modal-head">
      <div>
        <span>COLUMN PRESET</span>
        <h3>字段显示</h3>
        <p>切换玩家查询字段、核心字段或完整维护字段。</p>
      </div>
      <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
    </header>

    <div class="modal-body column-modal-body">
      <div class="column-modal-summary">
        <div>
          <span>{{ datasetLabel }}</span>
          <strong>已显示 {{ pickedCount }} / {{ visibleHeaders.length }} 个字段</strong>
        </div>
        <label class="column-search">
          <span>搜索字段</span>
          <input v-model="query" placeholder="中文名、价格、macro、DPS..." />
        </label>
      </div>

      <div class="column-presets">
        <button type="button" class="btn" @click="pickDefault">默认字段</button>
        <button type="button" class="btn" @click="pickCore">核心字段</button>
        <button type="button" class="btn" @click="pickAll">显示全部</button>
        <button type="button" class="btn ghost" @click="hideTechnical">隐藏技术字段</button>
      </div>

      <div class="column-list">
        <button
          v-for="field in filteredHeaders"
          :key="field"
          type="button"
          class="column-choice"
          :class="{ active: draft.has(field), locked: field === nameKey }"
          @click="toggle(field)"
        >
          <span>{{ draft.has(field) ? '✓' : '+' }}</span>
          <b>{{ field }}</b>
          <small v-if="field === nameKey">主名称</small>
          <small v-else-if="field === subKey">副名称</small>
        </button>
      </div>

      <div class="column-actions">
        <p>提示：显示全部会展开长表格，适合核查原始字段；日常查询建议用默认字段或核心字段。</p>
        <div>
          <button type="button" class="btn ghost" @click="$emit('close')">取消</button>
          <button type="button" class="btn primary" @click="apply">应用字段</button>
        </div>
      </div>
    </div>
  </section>
</template>
