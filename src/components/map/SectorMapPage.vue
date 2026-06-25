<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SectorInfoPanel from './SectorInfoPanel.vue'
import SectorMapCanvas from './SectorMapCanvas.vue'
import {
  atlasDlcOptions,
  atlasResourceOptions,
  atlasSectorNodes,
  filterAtlasSectors,
  mapStats,
  rankAtlasSectors
} from '../../utils/sectorMapData'

const query = ref('')
const selectedId = ref('')
const resourceFilter = ref('all')
const dlcFilter = ref('all')
const leftTab = ref('index')
const rankResource = ref(atlasResourceOptions[0]?.key || 'ore')
const detailOpen = ref(true)
const canvasRef = ref(null)

const filteredNodes = computed(() => filterAtlasSectors({
  query: query.value,
  resource: resourceFilter.value,
  dlc: dlcFilter.value
}))
const visibleIds = computed(() => new Set(filteredNodes.value.map((node) => node.id)))
const selectedNode = computed(() => {
  return atlasSectorNodes.find((node) => node.id === selectedId.value) || filteredNodes.value[0] || atlasSectorNodes[0] || null
})
const rankedRows = computed(() => {
  return rankAtlasSectors(rankResource.value)
    .filter(({ node }) => dlcFilter.value === 'all' || node.dlc === dlcFilter.value)
    .slice(0, 80)
})
const rankLabel = computed(() => {
  return atlasResourceOptions.find((item) => item.key === rankResource.value)?.label || '资源'
})
const activeResourceLabel = computed(() => {
  if (resourceFilter.value === 'all') return '全部资源'
  return atlasResourceOptions.find((item) => item.key === resourceFilter.value)?.label || resourceFilter.value
})
const activeDlcLabel = computed(() => {
  if (dlcFilter.value === 'all') return '全部版本'
  return atlasDlcOptions.find((item) => item.key === dlcFilter.value)?.label || dlcFilter.value
})

function selectNode(node, focus = false) {
  if (!node) return
  selectedId.value = node.id
  if (focus) nextTick(() => canvasRef.value?.focusNode(node))
}

function resetMap() {
  query.value = ''
  resourceFilter.value = 'all'
  dlcFilter.value = 'all'
  leftTab.value = 'index'
  selectNode(atlasSectorNodes[0], true)
  canvasRef.value?.resetView()
}

function routeSectorId() {
  const hash = window.location.hash || ''
  const rawQuery = (hash.startsWith('#/map-vue') || hash.startsWith('#/map')) && hash.includes('?')
    ? hash.slice(hash.indexOf('?') + 1)
    : (window.location.search || '').replace(/^\?/, '')
  return String(new URLSearchParams(rawQuery).get('sector') || '').trim()
}

function syncRouteSector() {
  const routeId = routeSectorId()
  const routeNode = routeId ? atlasSectorNodes.find((node) => node.id === routeId) : null
  if (routeNode) selectNode(routeNode, true)
  else if (!selectedId.value) selectNode(atlasSectorNodes[0], false)
}

function submitSearch() {
  const first = filteredNodes.value[0]
  if (first) selectNode(first, true)
}

function formatNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('zh-CN') : value
}

watch(filteredNodes, (nodes) => {
  if (!nodes.length) return
  if (!nodes.some((node) => node.id === selectedId.value)) selectNode(nodes[0], true)
})

onMounted(() => {
  syncRouteSector()
  window.addEventListener('hashchange', syncRouteSector)
  window.addEventListener('popstate', syncRouteSector)
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncRouteSector)
  window.removeEventListener('popstate', syncRouteSector)
})
</script>

<template>
  <main class="map-view-v4 atlas-mode">
    <header class="map-toolbar-v4">
      <div>
        <div class="eyebrow">星图档案 / 可游玩星区</div>
        <h2>X4 可游玩星区地图 · 星区、航线与资源排行</h2>
      </div>

      <form class="map-search-v4" @submit.prevent="submitSearch">
        <span>⌕</span>
        <input v-model.trim="query" placeholder="搜索星区、星系、DLC 或资源线索……" autocomplete="off" />
      </form>

      <div class="map-actions-v4">
        <button type="button" title="缩小" @click="canvasRef?.zoomBy(0.86)">−</button>
        <button type="button" title="重置" @click="resetMap">◎</button>
        <button type="button" title="放大" @click="canvasRef?.zoomBy(1.18)">＋</button>
        <a href="#/" title="返回数据库">数据库</a>
      </div>
    </header>

    <section class="atlas-status-v4" aria-label="星图当前状态">
      <article>
        <span>筛选星区</span>
        <strong>{{ filteredNodes.length }}</strong>
        <small>/ {{ mapStats.total || atlasSectorNodes.length }}</small>
      </article>
      <article>
        <span>星门连接</span>
        <strong>{{ mapStats.edges || 0 }}</strong>
        <small>条可视航线</small>
      </article>
      <article>
        <span>资源视图</span>
        <strong>{{ activeResourceLabel }}</strong>
        <small>{{ rankLabel }} 排行可切换</small>
      </article>
      <article>
        <span>版本边界</span>
        <strong>{{ activeDlcLabel }}</strong>
        <small>仅显示已解析星区</small>
      </article>
    </section>

    <section class="map-shell-v4" :class="{ 'detail-collapsed': !detailOpen }">
      <aside class="map-panel-v4">
        <div class="map-panel-head-v4">
          <span>星图导航</span>
          <b>{{ leftTab === 'index' ? '星区索引' : '资源排行' }}</b>
        </div>

        <div class="atlas-tabs-v4">
          <button type="button" :class="{ active: leftTab === 'index' }" @click="leftTab = 'index'">星区索引</button>
          <button type="button" :class="{ active: leftTab === 'rank' }" @click="leftTab = 'rank'">资源排行</button>
        </div>

        <div class="atlas-left-v4" :class="{ active: leftTab === 'index' }">
          <div class="atlas-filters-v4">
            <div class="atlas-chip-row-v4">
              <button type="button" class="atlas-chip-v4" :class="{ active: resourceFilter === 'all' }" @click="resourceFilter = 'all'">全部资源</button>
              <button
                v-for="resource in atlasResourceOptions"
                :key="resource.key"
                type="button"
                class="atlas-chip-v4"
                :class="{ active: resourceFilter === resource.key }"
                @click="resourceFilter = resource.key"
              >
                {{ resource.label }}
              </button>
            </div>
            <div class="atlas-chip-row-v4">
              <button type="button" class="atlas-chip-v4" :class="{ active: dlcFilter === 'all' }" @click="dlcFilter = 'all'">全部版本</button>
              <button
                v-for="dlc in atlasDlcOptions"
                :key="dlc.key"
                type="button"
                class="atlas-chip-v4"
                :class="{ active: dlcFilter === dlc.key }"
                @click="dlcFilter = dlc.key"
              >
                {{ dlc.short }}
              </button>
            </div>
            <div class="atlas-note-v4">
              主图按旧版 HTML 的真实星图坐标、星门连接和 SVG 星区底图显示；点击条目会在主图定位并同步右侧档案。
            </div>
            <section class="atlas-side-stats-v4 compact">
              <div>
                <span>星系组</span>
                <strong>{{ mapStats.clusters || '—' }}</strong>
              </div>
              <div>
                <span>可见星区</span>
                <strong>{{ filteredNodes.length }}</strong>
              </div>
              <div>
                <span>星门连接</span>
                <strong>{{ mapStats.edges || 0 }}</strong>
              </div>
              <div>
                <span>版本包</span>
                <strong>{{ atlasDlcOptions.length }}</strong>
              </div>
            </section>
          </div>

          <div class="atlas-list-v4">
            <button
              v-for="node in filteredNodes"
              :key="node.id"
              type="button"
              class="atlas-list-item-v4"
              :class="{ active: node.id === selectedNode?.id }"
              @click="selectNode(node, true)"
            >
              <i>{{ node.dlcShort }}</i>
              <span>
                <b>{{ node.title }}</b>
                <small>{{ node.clusterTitle }}</small>
              </span>
              <em>{{ node.resources.length || '—' }}</em>
            </button>
            <p v-if="!filteredNodes.length" class="map-empty-v4">没有匹配的星区。</p>
          </div>
        </div>

        <div class="atlas-left-v4" :class="{ active: leftTab === 'rank' }">
          <label class="rank-select-v4">
            <span>资源排行榜</span>
            <select v-model="rankResource">
              <option v-for="resource in atlasResourceOptions" :key="resource.key" :value="resource.key">{{ resource.label }}</option>
            </select>
          </label>
          <div class="rank-summary-v4">
            当前按 {{ rankLabel }} 产出排序；点击任意星区可定位到主图和右侧档案。
          </div>
          <div class="ranking-list-v4">
            <button
              v-for="(row, index) in rankedRows"
              :key="row.node.id"
              type="button"
              class="ranking-item-v4"
              :class="{ active: row.node.id === selectedNode?.id }"
              @click="selectNode(row.node, true)"
            >
              <i>{{ String(index + 1).padStart(2, '0') }}</i>
              <span>
                <b>{{ row.node.title }}</b>
                <small>{{ row.node.clusterTitle }}</small>
              </span>
              <em>{{ formatNumber(row.value) }}</em>
            </button>
          </div>
        </div>
      </aside>

      <SectorMapCanvas
        ref="canvasRef"
        :nodes="atlasSectorNodes"
        :visible-ids="visibleIds"
        :selected-id="selectedNode?.id || ''"
        @select="selectNode($event)"
      />

      <SectorInfoPanel
        :node="selectedNode"
        :stats="mapStats"
        :open="detailOpen"
        @toggle-open="detailOpen = !detailOpen"
        @select-sector="selectNode($event, true)"
      />
    </section>
  </main>
</template>
