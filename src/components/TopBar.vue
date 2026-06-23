<script setup>
defineProps({
  datasetLabel: { type: String, required: true },
  stats: { type: Object, required: true },
  query: { type: String, required: true },
  viewMode: { type: String, required: true },
  theme: { type: String, required: true }
})
defineEmits(['update:query', 'update:viewMode', 'update:theme', 'open-import', 'open-export', 'open-compare'])
</script>

<template>
  <header class="topbar">
    <div class="dataset-title">
      <h2>{{ datasetLabel }}</h2>
      <p>{{ stats.filtered }} / {{ stats.total }} 条，已选 {{ stats.selected }} 条，mod {{ stats.imported }} 条</p>
    </div>
    <label class="search-wrap">
      <span>搜索</span>
      <input :value="query" placeholder="输入中文名、英文名、宏名、势力或任意字段" @input="$emit('update:query', $event.target.value)" />
    </label>
    <div class="top-actions">
      <button type="button" class="btn" @click="$emit('update:viewMode', viewMode === 'table' ? 'card' : 'table')">
        {{ viewMode === 'table' ? '卡片视图' : '表格视图' }}
      </button>
      <button type="button" class="btn" @click="$emit('open-compare')">对比</button>
      <button type="button" class="btn" @click="$emit('open-export')">导出 CSV</button>
      <button type="button" class="btn primary" @click="$emit('open-import')">导入 mod</button>
      <button type="button" class="icon-toggle" :aria-label="theme === 'day' ? '切换夜间主题' : '切换日间主题'" @click="$emit('update:theme', theme === 'day' ? 'night' : 'day')">
        {{ theme === 'day' ? '夜' : '日' }}
      </button>
    </div>
  </header>
</template>
