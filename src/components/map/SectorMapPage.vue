<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import SectorInfoPanel from './SectorInfoPanel.vue'
import SectorMapCanvas from './SectorMapCanvas.vue'
import { mapStats, searchSectorNodes, sectorMapNodes } from '../../utils/sectorMapData'

const query = ref('')
const selectedId = ref('')
const canvasRef = ref(null)

const filteredNodes = computed(() => searchSectorNodes(query.value))
const selectedNode = computed(() => {
  return sectorMapNodes.find((node) => node.id === selectedId.value) || filteredNodes.value[0] || sectorMapNodes[0] || null
})

function selectNode(node, focus = false) {
  if (!node) return
  selectedId.value = node.id
  if (focus) nextTick(() => canvasRef.value?.focusNode(node))
}

function resetMap() {
  query.value = ''
  selectNode(sectorMapNodes[0])
  canvasRef.value?.resetView()
}

function submitSearch() {
  const first = filteredNodes.value[0]
  if (first) selectNode(first, true)
}

watch(filteredNodes, (nodes) => {
  if (!nodes.length) return
  if (!nodes.some((node) => node.id === selectedId.value)) selectNode(nodes[0], true)
})

onMounted(() => {
  selectNode(sectorMapNodes[0])
})
</script>

<template>
  <main class="sector-map-page">
    <header class="sector-map-toolbar">
      <div class="sector-map-title">
        <span>PHASE 3</span>
        <h1>星区地图</h1>
        <p>{{ mapStats.total }} 个星区 / {{ mapStats.clusters }} 个星系，基于 sectors.json 真实坐标。</p>
      </div>

      <form class="sector-map-search" @submit.prevent="submitSearch">
        <label>
          <span>搜索星区</span>
          <input v-model.trim="query" type="search" placeholder="输入星区名、星系名或别名" autocomplete="off" />
        </label>
        <button type="submit" class="btn primary">定位</button>
      </form>

      <div class="sector-map-actions">
        <a class="btn ghost" href="./">数据库</a>
        <button type="button" class="btn" @click="resetMap">重置视图</button>
      </div>
    </header>

    <section class="sector-map-layout">
      <aside class="sector-list-panel">
        <header class="map-panel-head">
          <span>SECTORS</span>
          <b>{{ filteredNodes.length }} / {{ mapStats.total }}</b>
        </header>
        <div class="sector-list">
          <button
            v-for="node in filteredNodes"
            :key="node.id"
            type="button"
            class="sector-list-item"
            :class="{ active: node.id === selectedNode?.id }"
            @click="selectNode(node, true)"
          >
            <i>{{ node.dlc || 'X4' }}</i>
            <span>
              <b>{{ node.title }}</b>
              <small>{{ node.clusterTitle }}</small>
            </span>
            <em v-if="node.resources.length">{{ node.resources.length }}</em>
          </button>
          <p v-if="!filteredNodes.length" class="sector-list-empty">没有匹配的星区。</p>
        </div>
      </aside>

      <SectorMapCanvas ref="canvasRef" :nodes="filteredNodes" :selected-id="selectedNode?.id || ''" @select="selectNode($event)" />
      <SectorInfoPanel :node="selectedNode" />
    </section>
  </main>
</template>
