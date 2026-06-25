<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { compactText, formatValue } from '../utils/format'

const props = defineProps({
  open: { type: Boolean, default: false },
  datasets: { type: Object, required: true },
  rowsForDataset: { type: Function, required: true },
  headersForDataset: { type: Function, required: true },
  sectorNodes: { type: Array, default: () => [] },
  loreChapters: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'select'])
const query = ref('')
const inputRef = ref(null)

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const output = []
  for (const [datasetKey, config] of Object.entries(props.datasets)) {
    const headers = props.headersForDataset(datasetKey)
    const rows = props.rowsForDataset(datasetKey)
    for (const row of rows) {
      if (!compactText(row, headers).includes(q)) continue
      output.push({
        datasetKey,
        datasetLabel: config.label,
        name: formatValue(row[config.nameKey], config.nameKey),
        sub: formatValue(row[config.subKey], config.subKey),
        summary: summarizeRow(row, datasetKey),
        row
      })
      if (output.length >= 80) return output
    }
  }
  for (const sector of props.sectorNodes) {
    if (!matchText(sector, q)) continue
    output.push({
      datasetKey: 'sector-map',
      datasetLabel: '星区地图',
      name: sector.title || sector.fullName || '未命名星区',
      sub: sector.clusterTitle || sector.fullName || '星区资料',
      summary: summarizeSector(sector),
      route: `#/map?sector=${encodeURIComponent(sector.id)}`,
      row: sector
    })
    if (output.length >= 80) return output
  }
  for (const chapter of props.loreChapters) {
    if (!matchText(chapter, q)) continue
    output.push({
      datasetKey: 'lore',
      datasetLabel: '编年史',
      name: chapter.title || '未命名档案',
      sub: chapter.subtitle || chapter.category || '编年史档案',
      summary: summarizeLore(chapter),
      route: `#/lore?id=${encodeURIComponent(chapter.id)}`,
      row: chapter
    })
    if (output.length >= 80) return output
  }
  for (const chapter of props.loreChapters) {
    const entries = [...(chapter.sections || []), ...(chapter.cards || [])]
    for (const entry of entries) {
      if (!matchText(entry, q)) continue
      output.push({
        datasetKey: 'lore-entry',
        datasetLabel: entry.entryType || '编年史条目',
        name: entry.title || '未命名条目',
        sub: `${chapter.title} · ${entry.subtitle || '正文条目'}`,
        summary: summarizeLoreEntry(entry),
        route: `#/lore?id=${encodeURIComponent(chapter.id)}&anchor=${encodeURIComponent(entry.anchor || entry.id)}`,
        row: entry
      })
      if (output.length >= 80) return output
    }
  }
  return output
})
const resultGroups = computed(() => {
  const groups = new Map()
  for (const item of results.value) {
    if (!groups.has(item.datasetKey)) {
      groups.set(item.datasetKey, {
        key: item.datasetKey,
        label: item.datasetLabel,
        items: []
      })
    }
    groups.get(item.datasetKey).items.push(item)
  }
  return [...groups.values()]
})
const resultStats = computed(() => resultGroups.value.map((group) => `${group.label} ${group.items.length}`).join(' · '))

watch(() => props.open, async (open) => {
  if (!open) return
  query.value = ''
  await nextTick()
  inputRef.value?.focus()
})

function close() {
  emit('close')
}

function selectResult(result) {
  emit('select', result)
}

function matchText(item, q) {
  const haystack = [
    item.searchText,
    item.id,
    item.title,
    item.fullName,
    item.clusterTitle,
    item.subtitle,
    item.summary,
    item.category,
    ...(item.tags || []),
    ...(item.aliases || [])
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

function summarizeRow(row, datasetKey) {
  const fieldsByDataset = {
    ships: ['种族', '尺寸', '船级/类型', '船体耐久', '平均价格（Cr）'],
    weapons: ['制造种族', '尺寸', '武器类型', '理论 DPS（估算）', '射程（米）'],
    turrets: ['制造种族', '尺寸', '炮塔类型', '理论 DPS（估算）', '射程（米）'],
    equipment: ['装备类型', '制造种族', '尺寸', 'Mk', '平均价格（Cr）']
  }
  return (fieldsByDataset[datasetKey] || [])
    .map((field) => {
      const value = formatValue(row[field], field)
      return value === '—' ? '' : `${field}：${value}`
    })
    .filter(Boolean)
    .slice(0, 4)
    .join(' · ')
}

function summarizeSector(sector) {
  const parts = [
    sector.dlcLabel,
    sector.code,
    sector.resources?.length ? `${sector.resources.length} 类资源` : '',
    sector.summary
  ]
  return parts.filter(Boolean).slice(0, 4).join(' · ')
}

function summarizeLore(chapter) {
  const parts = [
    chapter.category,
    chapter.volume,
    chapter.sections?.length ? `${chapter.sections.length} 个小节` : '',
    chapter.cards?.length ? `${chapter.cards.length} 张档案卡` : '',
    chapter.summary
  ]
  return parts.filter(Boolean).slice(0, 4).join(' · ')
}

function summarizeLoreEntry(entry) {
  const parts = [
    entry.subtitle,
    entry.summary,
    ...(entry.tags || []).slice(0, 2)
  ]
  return parts.filter(Boolean).slice(0, 4).join(' · ')
}
</script>

<template>
  <div class="modal-backdrop" :class="{ open }" @click.self="close"></div>
  <section class="modal global-search-modal" :class="{ open }" role="dialog" aria-modal="true" aria-label="全库搜索">
    <header class="modal-head">
      <div>
        <span>GLOBAL SEARCH</span>
        <h3>全库搜索</h3>
      </div>
      <button type="button" class="icon-toggle" aria-label="关闭全库搜索" @click="close">×</button>
    </header>

    <div class="global-search-body">
      <label class="global-search-input">
        <span>搜索舰船、武器、炮塔、装备、星区和编年史</span>
        <input
          ref="inputRef"
          v-model="query"
          placeholder="输入中文名、英文名、宏名、势力或任意字段..."
          @keydown.esc.prevent="close"
        />
      </label>

      <div v-if="loading" class="global-search-empty">正在加载全库数据...</div>
      <div v-else-if="query && !results.length" class="global-search-empty">没有找到匹配条目。</div>
      <div v-else-if="!query" class="global-search-empty">输入关键词后，会同时搜索舰船、武器、炮塔、装备、星区地图和编年史。</div>
      <div v-else class="global-search-list">
        <div class="global-search-summary">
          <span>命中 {{ results.length }} 条</span>
          <small>{{ resultStats }}</small>
        </div>
        <section v-for="group in resultGroups" :key="group.key" class="global-search-group">
          <header>
            <span>{{ group.label }}</span>
            <small>{{ group.items.length }} 条</small>
          </header>
          <button
            v-for="(result, index) in group.items"
            :key="`${result.datasetKey}:${result.row.__uid || result.row.__index}:${result.name}`"
            type="button"
            class="global-search-row"
            @click="selectResult(result)"
          >
            <span class="global-search-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="global-search-kind">{{ result.datasetLabel }}</span>
            <span class="global-search-main">
              <b>{{ result.name }}</b>
              <small>{{ result.sub }}</small>
            </span>
            <em>{{ result.summary || '打开详情查看完整字段' }}</em>
          </button>
        </section>
      </div>
    </div>
  </section>
</template>
