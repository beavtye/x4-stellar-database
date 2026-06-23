<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import TopBar from './components/TopBar.vue'
import FilterBar from './components/FilterBar.vue'
import DataTable from './components/DataTable.vue'
import CardGrid from './components/CardGrid.vue'
import DetailDrawer from './components/DetailDrawer.vue'
import CompareModal from './components/CompareModal.vue'
import ImportModal from './components/ImportModal.vue'
import ExportModal from './components/ExportModal.vue'
import SuggestModal from './components/SuggestModal.vue'
import { useDatabase } from './composables/useDatabase'
import { isShareRoute } from './utils/shareRoute'
import { isMapRoute } from './utils/mapRoute'
import { isLoreRoute } from './utils/loreRoute'
import { isBenchmarkRoute } from './utils/benchmarkRoute'

const SharePage = defineAsyncComponent(() => import('./components/share/SharePage.vue'))
const SectorMapPage = defineAsyncComponent(() => import('./components/map/SectorMapPage.vue'))
const LorePage = defineAsyncComponent(() => import('./components/lore/LorePage.vue'))
const BenchmarkPage = defineAsyncComponent(() => import('./components/benchmark/BenchmarkPage.vue'))
const db = useDatabase()
const compareOpen = ref(false)
const importOpen = ref(false)
const exportOpen = ref(false)
const suggestOpen = ref(false)
const suggestRow = ref(null)
const routeVersion = ref(0)

const selectedRows = computed(() => db.selectedRowsForCurrentDataset())
const pageRows = computed(() => db.filteredRows.value.slice(0, 600))
const shareMode = computed(() => {
  routeVersion.value
  return isShareRoute()
})
const mapMode = computed(() => {
  routeVersion.value
  return isMapRoute()
})
const loreMode = computed(() => {
  routeVersion.value
  return isLoreRoute()
})
const benchmarkMode = computed(() => {
  routeVersion.value
  return isBenchmarkRoute()
})

function updateRoute() {
  routeVersion.value += 1
}

function updateFilter(field, value) {
  if (value) db.filters[field] = value
  else delete db.filters[field]
}

function resetFilters() {
  Object.keys(db.filters).forEach((field) => delete db.filters[field])
}

function openSuggest(row) {
  suggestRow.value = row
  suggestOpen.value = true
}

onMounted(() => {
  window.addEventListener('popstate', updateRoute)
  window.addEventListener('hashchange', updateRoute)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', updateRoute)
  window.removeEventListener('hashchange', updateRoute)
})
</script>

<template>
  <SharePage v-if="shareMode" :route-version="routeVersion" />
  <SectorMapPage v-else-if="mapMode" />
  <LorePage v-else-if="loreMode" :route-version="routeVersion" />
  <BenchmarkPage v-else-if="benchmarkMode" />
  <div v-else class="app-shell">
    <AppSidebar :datasets="db.DATASETS" :current="db.dataset.value" :stats="db.stats.value" @switch="db.switchDataset" />

    <main class="main">
      <TopBar
        :dataset-label="db.datasetConfig.value.label"
        :stats="db.stats.value"
        :query="db.query.value"
        :view-mode="db.viewMode.value"
        :theme="db.theme.value"
        @update:query="db.query.value = $event"
        @update:view-mode="db.viewMode.value = $event"
        @update:theme="db.theme.value = $event"
        @open-import="importOpen = true"
        @open-export="exportOpen = true"
        @open-compare="compareOpen = true"
      />

      <FilterBar :fields="db.filterFields.value" :options="db.filterOptions.value" :filters="db.filters" @update-filter="updateFilter" @reset="resetFilters" />

      <section class="toolbar">
        <div>
          <button type="button" class="btn" @click="db.selectVisible">勾选当前结果</button>
          <button type="button" class="btn ghost" @click="db.clearSelected">清空勾选</button>
        </div>
        <p>为保证大数据量性能，当前视图显示前 {{ pageRows.length }} 条；搜索和导出仍基于完整筛选结果。</p>
      </section>

      <DataTable
        v-if="db.viewMode.value === 'table'"
        :rows="pageRows"
        :columns="db.activeColumns.value"
        :name-key="db.datasetConfig.value.nameKey"
        :sub-key="db.datasetConfig.value.subKey"
        :sort="db.sort"
        :row-key="db.rowKey"
        :selected="db.selected"
        @sort="db.setSort"
        @open="db.currentRow.value = $event"
        @toggle-selected="db.toggleSelected"
      />
      <CardGrid
        v-else
        :rows="pageRows"
        :columns="db.activeColumns.value"
        :name-key="db.datasetConfig.value.nameKey"
        :sub-key="db.datasetConfig.value.subKey"
        :row-key="db.rowKey"
        :selected="db.selected"
        @open="db.currentRow.value = $event"
        @toggle-selected="db.toggleSelected"
      />
    </main>

    <DetailDrawer
      :row="db.currentRow.value"
      :headers="db.headers.value"
      :name-key="db.datasetConfig.value.nameKey"
      :sub-key="db.datasetConfig.value.subKey"
      :selected="db.currentRow.value ? db.selected.has(db.rowKey(db.currentRow.value)) : false"
      @close="db.currentRow.value = null"
      @toggle-selected="db.toggleSelected"
      @suggest="openSuggest"
    />

    <CompareModal
      :open="compareOpen"
      :rows="selectedRows"
      :headers="db.headers.value"
      :name-key="db.datasetConfig.value.nameKey"
      @close="compareOpen = false"
      @clear="db.clearSelected"
    />

    <ImportModal
      :open="importOpen"
      :dataset="db.dataset.value"
      :pending-datasets="db.mergedImportedDatasets()"
      :imported-packs="db.importedPacks.value"
      @close="importOpen = false"
      @import-pack="db.addImportedPack"
      @clear-imports="db.clearImportedPacks"
    />

    <ExportModal
      :open="exportOpen"
      :filtered-rows="db.filteredRows.value"
      :selected-rows="selectedRows"
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
  </div>
</template>
