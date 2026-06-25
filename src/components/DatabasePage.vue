<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import TopBar from './TopBar.vue'
import FilterBar from './FilterBar.vue'
import DataTable from './DataTable.vue'
import CardGrid from './CardGrid.vue'
import DetailDrawer from './DetailDrawer.vue'
import CompareModal from './CompareModal.vue'
import ComparePickModal from './ComparePickModal.vue'
import ColumnModal from './ColumnModal.vue'
import GlobalSearchModal from './GlobalSearchModal.vue'
import ImportModal from './ImportModal.vue'
import ExportModal from './ExportModal.vue'
import SuggestModal from './SuggestModal.vue'
import { useDatabase } from '../composables/useDatabase'
import { asNumber, formatValue } from '../utils/format'
import { atlasSectorNodes } from '../utils/sectorMapData'
import { loreChapters } from '../utils/loreData'

const db = useDatabase()
const compareOpen = ref(false)
const comparePickOpen = ref(false)
const compareRows = ref([])
const importOpen = ref(false)
const exportOpen = ref(false)
const columnOpen = ref(false)
const globalSearchOpen = ref(false)
const globalSearchLoading = ref(false)
const suggestOpen = ref(false)
const suggestRow = ref(null)
const selectedRankMetric = ref('')

const selectedRows = computed(() => db.selectedRowsForCurrentDataset())
const pageRows = computed(() => db.filteredRows.value.slice(0, 600))
const columnPresets = computed(() => buildColumnPresets(db.dataset.value, db.headers.value, db.datasetConfig.value.defaultColumns))
const activePresetKey = computed(() => {
  const active = db.activeColumns.value
  const match = columnPresets.value.find((preset) => sameColumns(active, preset.columns))
  return match?.key || ''
})
const metricFields = computed(() => {
  const preferred = [
    '平均价格（Cr）',
    '船体耐久',
    '理论 DPS（估算）',
    '单发伤害',
    '射程（米）',
    '货舱容量',
    '转向速度（度/秒）'
  ]
  return preferred.filter((field) => db.headers.value.includes(field))
})
const currentMetric = computed(() => {
  if (selectedRankMetric.value && metricFields.value.includes(selectedRankMetric.value)) return selectedRankMetric.value
  return metricFields.value[0] || db.activeColumns.value.find((field) => {
    return db.filteredRows.value.some((row) => asNumber(row[field]) !== null)
  }) || ''
})
const metricSummary = computed(() => {
  const field = currentMetric.value
  if (!field) return { label: '最高值', max: '—', maxSub: '—', avg: '—', avgSub: '—', complete: '—', topRows: [] }
  const values = db.filteredRows.value
    .map((row) => ({ row, value: asNumber(row[field]) }))
    .filter((item) => item.value !== null)
  const total = db.filteredRows.value.length || 0
  const sorted = [...values].sort((a, b) => b.value - a.value)
  const max = sorted[0]
  const avg = values.length ? values.reduce((sum, item) => sum + item.value, 0) / values.length : null
  return {
    label: field,
    max: max ? formatValue(max.value, field) : '—',
    maxSub: max ? formatValue(max.row[db.datasetConfig.value.nameKey], db.datasetConfig.value.nameKey) : '—',
    avg: avg !== null ? formatValue(avg, field) : '—',
    avgSub: values.length ? `${values.length} 条有值` : '无可计算数据',
    complete: total ? `${Math.round(values.length / total * 100)}%` : '—',
    topRows: sorted.slice(0, 5)
  }
})
const sourceModeLabel = computed(() => ({
  vanilla: '仅原版',
  all: '全部来源',
  custom: '指定 mod'
})[db.sourceMode.value] || db.sourceMode.value)
const activeFilterRows = computed(() => {
  const rows = Object.entries(db.filters)
    .filter(([, value]) => value)
    .map(([field, value]) => `${field}: ${value}`)
  if (db.quickFilterIndex.value !== null && db.quickFilters.value[db.quickFilterIndex.value]) {
    rows.unshift(`快捷: ${db.quickFilters.value[db.quickFilterIndex.value].label}`)
  }
  if (db.favoriteOnly.value) rows.unshift('收藏: 仅收藏')
  if (db.query.value.trim()) rows.unshift(`检索: ${db.query.value.trim()}`)
  return rows
})
const sourceSummary = computed(() => {
  if (db.sourceMode.value === 'custom') {
    const picked = db.sourceOptions.value.filter((item) => db.selectedSourceIds.value.has(item.id))
    if (!picked.length) return '未选择 mod'
    return picked.map((item) => item.shortLabel || item.label).join('、')
  }
  return sourceModeLabel.value
})
const datasetConsoleCards = computed(() => [
  ['筛选结果', formatValue(db.stats.value.filtered, ''), `共 ${db.stats.value.total} 条`],
  [`最高 ${metricSummary.value.label}`, metricSummary.value.max, metricSummary.value.maxSub],
  ['平均值', metricSummary.value.avg, metricSummary.value.label],
  ['数据完整度', metricSummary.value.complete, '当前指标有值占比']
])
const datasetLauncherCards = computed(() => Object.values(db.DATASETS).map((item) => {
  const count = db.datasetCounts.value[item.key]
  const isActive = db.dataset.value === item.key
  return {
    ...item,
    count: Number.isFinite(Number(count)) ? Number(count) : 0,
    active: isActive,
    status: isActive ? '当前打开' : '点击切换'
  }
}))

function updateFilter(field, value) {
  if (value) db.filters[field] = value
  else delete db.filters[field]
}

function resetFilters() {
  Object.keys(db.filters).forEach((field) => delete db.filters[field])
  db.clearQuickFilter()
}

function applyColumnPreset(preset) {
  db.setColumns(preset.columns)
}

function startCompare() {
  const rows = selectedRows.value
  if (rows.length < 2) {
    compareRows.value = rows
    compareOpen.value = true
    return
  }
  if (rows.length <= 4) {
    compareRows.value = rows
    compareOpen.value = true
    return
  }
  comparePickOpen.value = true
}

function confirmComparePick(rows) {
  compareRows.value = rows
  comparePickOpen.value = false
  compareOpen.value = true
}

function clearCompareSelection() {
  db.clearSelected()
  compareRows.value = []
  compareOpen.value = false
  comparePickOpen.value = false
}

function openSuggest(row) {
  suggestRow.value = row
  suggestOpen.value = true
}

async function openGlobalSearch() {
  globalSearchOpen.value = true
  globalSearchLoading.value = true
  await db.ensureAllDatasets()
  globalSearchLoading.value = false
}

async function selectGlobalSearchResult(result) {
  globalSearchOpen.value = false
  if (result.route) {
    window.location.hash = result.route.replace(/^#/, '')
    return
  }
  await db.openDatasetRow(result.datasetKey, result.row)
}

function handleKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openGlobalSearch()
  }
}

onMounted(() => {
  db.ensureAllDatasets({ background: true })
  db.syncPublicModPackages({ silent: true })
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="app-shell database-vue-page">
    <AppSidebar
      :datasets="db.DATASETS"
      :current="db.dataset.value"
      :stats="db.stats.value"
      :dataset-stats="db.datasetCounts.value"
      @switch="db.switchDataset"
    />

    <main class="main">
      <TopBar
        :dataset-label="db.datasetConfig.value.label"
        :stats="db.stats.value"
        :query="db.query.value"
        :view-mode="db.viewMode.value"
        :theme="db.theme.value"
        :favorite-only="db.favoriteOnly.value"
        @update:query="db.query.value = $event"
        @update:view-mode="db.viewMode.value = $event"
        @update:theme="db.theme.value = $event"
        @update:favorite-only="db.setFavoriteOnly"
        @open-import="importOpen = true"
        @open-export="exportOpen = true"
        @open-compare="startCompare"
        @open-columns="columnOpen = true"
        @open-global-search="openGlobalSearch"
        @select-visible="db.selectVisible"
      />

      <section class="database-legacy-workbench" aria-label="数据库工作台">
        <div class="database-workbench-head">
          <div>
            <span>DATABASE CONSOLE</span>
            <b>{{ db.datasetConfig.value.label }}</b>
          </div>
          <p>以查询和对比为主，保留旧版 HTML 的工作台密度。</p>
        </div>
        <div class="kpis" aria-label="当前数据库状态">
          <article v-for="card in datasetConsoleCards" :key="card[0]" class="kpi">
            <span class="kpi-label">{{ card[0] }}</span>
            <strong class="kpi-value">{{ card[1] }}</strong>
            <span class="kpi-sub">{{ card[2] }}</span>
          </article>
        </div>

        <section class="rank-panel database-rank-panel" aria-label="当前指标排行">
          <div class="rank-head">
            <div>
              <span>指标排行</span>
              <b>{{ metricSummary.label }}</b>
            </div>
            <select v-model="selectedRankMetric" class="mini-select" aria-label="选择排行榜指标">
              <option value="">自动指标</option>
              <option v-for="field in metricFields" :key="field" :value="field">{{ field }}</option>
            </select>
          </div>
          <div class="rank-list compact-rank-list">
            <div v-for="(item, index) in metricSummary.topRows" :key="db.rowKey(item.row)" class="rank-row legacy-rank-row">
              <span class="rank-no">{{ index + 1 }}</span>
              <span class="rank-name">{{ formatValue(item.row[db.datasetConfig.value.nameKey], db.datasetConfig.value.nameKey) }}</span>
              <span class="rank-track"><i class="rank-fill" :style="{ width: `${metricSummary.topRows[0]?.value ? Math.max(6, item.value / metricSummary.topRows[0].value * 100) : 0}%` }"></i></span>
              <span class="rank-val">{{ formatValue(item.value, metricSummary.label) }}</span>
            </div>
            <div v-if="!metricSummary.topRows.length" class="rank-row">
              <span class="rank-name">暂无可排行数据</span>
              <span class="rank-val">—</span>
            </div>
          </div>
        </section>

        <nav class="database-quick-rail" aria-label="数据库入口">
          <button
            v-for="item in datasetLauncherCards"
            :key="item.key"
            type="button"
            class="dataset-rail-btn"
            :class="{ active: item.active }"
            @click="db.switchDataset(item.key)"
          >
            <i>{{ item.icon }}</i>
            <span>{{ item.label }}</span>
            <b>{{ item.count }}</b>
          </button>
          <a href="#/map"><i>图</i><span>星区地图</span><b>MAP</b></a>
          <a href="#/lore"><i>史</i><span>编年史</span><b>LORE</b></a>
        </nav>
      </section>

      <FilterBar
        :fields="db.filterFields.value"
        :options="db.filterOptions.value"
        :filters="db.filters"
        :source-mode="db.sourceMode.value"
        :source-options="db.sourceOptions.value"
        :selected-source-ids="db.selectedSourceIds.value"
        :dataset-label="db.datasetConfig.value.label"
        :quick-filters="db.quickFilters.value"
        :quick-filter-index="db.quickFilterIndex.value"
        @update-filter="updateFilter"
        @reset="resetFilters"
        @update-source-mode="db.setSourceMode"
        @toggle-source="db.toggleSourceId"
        @toggle-quick-filter="db.toggleQuickFilter"
      />

      <p class="table-status" v-if="db.loading.value">正在加载 {{ db.datasetConfig.value.label }} 数据...</p>
      <p class="table-status error" v-else-if="db.loadError.value">数据加载失败：{{ db.loadError.value }}</p>
      <p class="table-status" v-else>
          为保证大数据量性能，当前视图显示前 {{ pageRows.length }} 条；搜索和导出仍基于完整筛选结果。
          <span v-if="db.publicSync.message">{{ db.publicSync.message }}</span>
      </p>

      <section class="database-table-card table-card">
        <div class="table-toolbar toolbar">
          <div class="toolbar-left">
            <span class="result-text">显示 {{ db.stats.value.filtered }} / {{ db.stats.value.total }} 条</span>
            <div class="preset-buttons" aria-label="常用列视图">
              <button
                v-for="preset in columnPresets"
                :key="preset.key"
                type="button"
                class="preset-btn"
                :class="{ active: activePresetKey === preset.key }"
                @click="applyColumnPreset(preset)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
          <div class="toolbar-right">
            <button type="button" class="btn" @click="db.selectVisible">勾选当前结果</button>
            <button type="button" class="btn ghost" @click="db.clearSelected">清空勾选</button>
            <span class="scroll-mode">连续滚动 · 无分页</span>
          </div>
        </div>

        <DataTable
          v-if="db.viewMode.value === 'table'"
          :rows="pageRows"
          :columns="db.activeColumns.value"
          :name-key="db.datasetConfig.value.nameKey"
          :sub-key="db.datasetConfig.value.subKey"
          :sort="db.sort"
          :row-key="db.rowKey"
          :selected="db.selected"
          :is-favorite="db.isFavorite"
          @sort="db.setSort"
          @open="db.currentRow.value = $event"
          @toggle-selected="db.toggleSelected"
          @toggle-favorite="db.toggleFavorite"
        />
        <CardGrid
          v-else
          :rows="pageRows"
          :columns="db.activeColumns.value"
          :name-key="db.datasetConfig.value.nameKey"
          :sub-key="db.datasetConfig.value.subKey"
          :row-key="db.rowKey"
          :selected="db.selected"
          :is-favorite="db.isFavorite"
          @open="db.currentRow.value = $event"
          @toggle-selected="db.toggleSelected"
          @toggle-favorite="db.toggleFavorite"
        />
      </section>
    </main>

    <DetailDrawer
      :row="db.currentRow.value"
      :headers="db.headers.value"
      :dataset="db.dataset.value"
      :name-key="db.datasetConfig.value.nameKey"
      :sub-key="db.datasetConfig.value.subKey"
      :selected="db.currentRow.value ? db.selected.has(db.rowKey(db.currentRow.value)) : false"
      :favorite="db.currentRow.value ? db.isFavorite(db.currentRow.value) : false"
      @close="db.currentRow.value = null"
      @toggle-selected="db.toggleSelected"
      @toggle-favorite="db.toggleFavorite"
      @suggest="openSuggest"
    />

    <CompareModal
      :open="compareOpen"
      :rows="compareRows"
      :headers="db.headers.value"
      :name-key="db.datasetConfig.value.nameKey"
      @close="compareOpen = false"
      @clear="clearCompareSelection"
    />

    <ComparePickModal
      :open="comparePickOpen"
      :rows="selectedRows"
      :name-key="db.datasetConfig.value.nameKey"
      :sub-key="db.datasetConfig.value.subKey"
      :row-key="db.rowKey"
      @close="comparePickOpen = false"
      @confirm="confirmComparePick"
    />

    <ImportModal
      :open="importOpen"
      :dataset="db.dataset.value"
      :pending-datasets="db.mergedImportedDatasets()"
      :imported-packs="db.importedPacks.value"
      @close="importOpen = false"
      @import-pack="db.addImportedPack"
      @replace-public-packs="db.replacePublicPacks"
      @clear-imports="db.clearImportedPacks"
    />

    <ColumnModal
      :open="columnOpen"
      :headers="db.headers.value"
      :active-columns="db.activeColumns.value"
      :default-columns="db.datasetConfig.value.defaultColumns"
      :name-key="db.datasetConfig.value.nameKey"
      :sub-key="db.datasetConfig.value.subKey"
      :dataset-label="db.datasetConfig.value.label"
      @close="columnOpen = false"
      @apply="db.setColumns($event); columnOpen = false"
    />

    <ExportModal
      :open="exportOpen"
      :filtered-rows="db.filteredRows.value"
      :selected-rows="selectedRows"
      :current-row="db.currentRow.value"
      :headers="db.headers.value"
      :columns="db.activeColumns.value"
      :dataset="db.dataset.value"
      @close="exportOpen = false"
    />

    <SuggestModal
      :open="suggestOpen"
      :row="suggestRow"
      :dataset="db.dataset.value"
      :dataset-label="db.datasetConfig.value.label"
      :name-key="db.datasetConfig.value.nameKey"
      :sub-key="db.datasetConfig.value.subKey"
      :headers="db.headers.value"
      @close="suggestOpen = false"
    />

    <GlobalSearchModal
      :open="globalSearchOpen"
      :datasets="db.DATASETS"
      :rows-for-dataset="db.rowsForDataset"
      :headers-for-dataset="db.headersForDataset"
      :sector-nodes="atlasSectorNodes"
      :lore-chapters="loreChapters"
      :loading="globalSearchLoading"
      @close="globalSearchOpen = false"
      @select="selectGlobalSearchResult"
    />

    <section class="compare-tray" :class="{ show: db.stats.value.selected > 0 }" aria-live="polite">
      <span>已勾选 {{ db.stats.value.selected }} 项 · 导出可用全部，对比最多 4 项</span>
      <button type="button" class="btn" @click="db.selectVisible">勾选当前页</button>
      <button type="button" class="btn primary" @click="startCompare">开始对比</button>
      <button type="button" class="icon-toggle" aria-label="清空勾选" @click="clearCompareSelection">×</button>
    </section>
  </div>
</template>

<script>
function buildColumnPresets(dataset, headers, defaults) {
  const base = {
    default: defaults,
    all: headers
  }
  const byDataset = {
    ships: {
      identity: ['中文名', '英文名', '种族', '势力', '尺寸', '船级/类型', '主要用途', '拥有势力', '许可证'],
      combat: ['中文名', '英文名', '尺寸', '船级/类型', '船体耐久', '主武器槽', 'S 武器槽', 'M 武器槽', 'L 武器槽', '炮塔槽', 'S 炮塔槽', 'M 炮塔槽', 'L 炮塔槽', '护盾槽'],
      economy: ['中文名', '英文名', '尺寸', '主要用途', '货舱容量', '货物类型', '平均价格（Cr）', '最低价格（Cr）', '最高价格（Cr）', '建造材料']
    },
    weapons: {
      identity: ['中文名', '英文名', '制造种族', '尺寸', 'Mk', '武器类型', '许可证', '拥有势力'],
      combat: ['中文名', '英文名', '尺寸', 'Mk', '武器类型', '单发伤害', '理论 DPS（估算）', '射速（发/秒）', '射程（米）', '弹体速度（米/秒）', '弹体寿命（秒）'],
      economy: ['中文名', '英文名', '制造种族', '平均价格（Cr）', '最低价格（Cr）', '最高价格（Cr）', '生产方式', '建造材料']
    },
    turrets: {
      identity: ['中文名', '英文名', '制造种族', '尺寸', 'Mk', '炮塔类型', '许可证', '拥有势力'],
      combat: ['中文名', '英文名', '尺寸', 'Mk', '炮塔类型', '单发伤害', '理论 DPS（估算）', '射程（米）', '弹体速度（米/秒）', '弹体寿命（秒）', '转向速度（度/秒）'],
      economy: ['中文名', '英文名', '制造种族', '平均价格（Cr）', '最低价格（Cr）', '最高价格（Cr）', '生产方式', '建造材料']
    },
    equipment: {
      identity: ['中文名', '英文名', '类型', '尺寸', '制造种族', 'Mk', '许可证', '拥有势力'],
      combat: ['中文名', '英文名', '类型', '尺寸', '关键参数', '护盾容量（MJ）', '护盾恢复（MW）', '前向推力', '反向推力', '旅行模式推力'],
      economy: ['中文名', '英文名', '类型', '平均价格（Cr）', '最低价格（Cr）', '最高价格（Cr）', '生产方式', '建造材料']
    }
  }
  const labels = {
    default: '默认',
    identity: '身份',
    combat: '性能',
    economy: '经济',
    all: '全部'
  }
  const merged = { ...base, ...(byDataset[dataset] || {}) }
  return Object.entries(merged)
    .map(([key, list]) => ({
      key,
      label: labels[key] || key,
      columns: list.filter((field) => headers.includes(field))
    }))
    .filter((preset) => preset.columns.length)
}

function sameColumns(a, b) {
  if (a.length !== b.length) return false
  return a.every((field, index) => field === b[index])
}
</script>
