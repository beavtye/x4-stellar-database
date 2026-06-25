<script setup>
defineProps({
  datasetLabel: { type: String, required: true },
  stats: { type: Object, required: true },
  query: { type: String, required: true },
  viewMode: { type: String, required: true },
  theme: { type: String, required: true },
  favoriteOnly: { type: Boolean, default: false }
})
defineEmits(['update:query', 'update:viewMode', 'update:theme', 'update:favoriteOnly', 'open-import', 'open-export', 'open-compare', 'open-columns', 'open-global-search', 'select-visible'])
</script>

<template>
  <header class="topbar">
    <div class="dataset-title">
      <h2>{{ datasetLabel }}</h2>
      <p>已筛选 {{ stats.filtered }} / 总计 {{ stats.total }} · 已勾选 {{ stats.selected }} · mod {{ stats.imported }}</p>
    </div>
    <label class="search-wrap">
      <span class="search-icon">⌕</span>
      <input :value="query" placeholder="输入中文名、英文名、宏名、势力或任意字段检索..." @input="$emit('update:query', $event.target.value)" />
      <button type="button" class="search-hint" title="打开全库搜索" @click="$emit('open-global-search')">Ctrl K 全库</button>
    </label>
    <div class="actions top-actions">
      <button
        type="button"
        class="btn ghost"
        :class="{ active: favoriteOnly }"
        title="只看收藏"
        @click="$emit('update:favoriteOnly', !favoriteOnly)"
      >
        ★ <span>收藏</span>
      </button>
      <button type="button" class="btn" title="切换表格/卡片" @click="$emit('update:viewMode', viewMode === 'table' ? 'card' : 'table')">
        ▦ <span>视图</span>
      </button>
      <button type="button" class="btn" title="对比勾选条目" @click="$emit('open-compare')">
        ⇄ <span>对比</span>
      </button>
      <button type="button" class="btn" title="选择表格显示字段" @click="$emit('open-columns')">
        ▤ <span>字段</span>
      </button>
      <button type="button" class="btn" title="勾选当前筛选结果" @click="$emit('select-visible')">
        ☑ <span>勾选当前页</span>
      </button>
      <button type="button" class="btn" title="导入 mod 数据包" @click="$emit('open-import')">
        ⇧ <span>导入</span>
      </button>
      <button type="button" class="btn" title="导出当前筛选结果" @click="$emit('open-export')">
        ⇩ <span>导出</span>
      </button>
      <button type="button" class="icon-toggle" :aria-label="theme === 'day' ? '切换夜间主题' : '切换日间主题'" @click="$emit('update:theme', theme === 'day' ? 'night' : 'day')">
        {{ theme === 'day' ? '暗' : '亮' }}
      </button>
    </div>
  </header>
</template>
