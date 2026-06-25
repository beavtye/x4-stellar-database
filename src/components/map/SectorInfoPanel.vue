<script setup>
import { computed } from 'vue'
import { getAtlasClusterSectors } from '../../utils/sectorMapData'

const props = defineProps({
  node: { type: Object, default: null },
  stats: { type: Object, default: () => ({}) },
  open: { type: Boolean, default: true }
})
const emit = defineEmits(['toggle-open', 'select-sector'])

const resources = computed(() => {
  if (!props.node?.resources) return []
  return props.node.resources.filter((item) => item.yield > 0).slice(0, 8)
})
const siblingSectors = computed(() => {
  return getAtlasClusterSectors(props.node).filter((sector) => sector.id !== props.node?.id)
})
const conditionRows = computed(() => {
  if (!props.node) return []
  return [
    ['DLC', props.node.dlcLabel],
    ['星图编码', props.node.code],
    ['日照倍率', formatMaybeNumber(props.node.sunlight)],
    ['经济热度', formatMaybeNumber(props.node.economy)],
    ['安全指数', formatMaybeNumber(props.node.security)],
    ['资源种类', resources.value.length ? `${resources.value.length} 类` : '暂无记录']
  ].filter(([, value]) => value !== undefined && value !== null && value !== '')
})

function formatNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('zh-CN') : value
}

function formatMaybeNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function openShare() {
  if (!props.node?.id) return
  window.open(`#/share?type=sector&id=${encodeURIComponent(props.node.id)}`, '_blank', 'noopener')
}
</script>

<template>
  <aside class="map-panel-v4 map-detail-panel-v4" :class="{ collapsed: !open }">
    <div class="map-panel-head-v4 dossier-head-v4">
      <span>当前档案</span>
      <b>{{ open ? (node ? node.title : '未选择星区') : '收起详情' }}</b>
      <button v-if="open" type="button" class="x4-map-share-btn" :disabled="!node" @click="openShare">分享</button>
      <button type="button" class="detail-toggle-v4" :title="open ? '收起详情' : '展开详情'" @click="emit('toggle-open')">
        {{ open ? '‹' : '展开' }}
      </button>
    </div>

    <div v-if="node && open" class="map-detail-v4">
      <section class="detail-hero-v4 dossier-hero-v4">
        <div class="detail-cover-v4 dossier-cover-v4">
          <div class="dossier-cover-grid"></div>
          <strong>{{ node.dlcShort }}</strong>
        </div>
        <div class="detail-main-v4">
          <div class="detail-kicker-v4">{{ node.clusterTitle }}</div>
          <h2>{{ node.title }}</h2>
          <p class="detail-desc-v4">{{ node.summary }}</p>
          <div class="detail-meta-v4">
            <span>{{ node.dlcLabel }}</span>
            <span>{{ node.code }}</span>
            <span>{{ stats.total || 145 }} 星区</span>
            <span>{{ stats.edges || 146 }} 星门连接</span>
          </div>
        </div>
      </section>

      <section class="overview-v4">
        <div class="detail-kicker-v4">OVERVIEW</div>
        <h3>星区概览</h3>
        <p>{{ node.excerpt || node.summary }}</p>
      </section>

      <section class="condition-grid-v4">
        <article v-for="[label, value] in conditionRows" :key="label">
          <small>{{ label }}</small>
          <b>{{ value }}</b>
        </article>
      </section>

      <section v-if="resources.length" class="resource-grid-v4">
        <article v-for="resource in resources" :key="resource.ware" class="resource-card-v4">
          <small>{{ resource.areas }} 片 / {{ resource.amount }} 处</small>
          <b>{{ resource.label }}</b>
          <strong>{{ formatNumber(resource.yield) }}</strong>
        </article>
      </section>

      <section v-if="siblingSectors.length" class="system-list-v4">
        <button
          v-for="sector in siblingSectors"
          :key="sector.id"
          type="button"
          class="system-card-v4"
          @click="emit('select-sector', sector)"
        >
          <b>{{ sector.title }}</b>
          <small>{{ sector.fullName }}</small>
          <div>
            <span>{{ sector.dlcShort }}</span>
            <span v-if="sector.resources.length">{{ sector.resources.length }} 类资源</span>
          </div>
        </button>
      </section>
    </div>

    <div v-else-if="open" class="map-empty-v4">
      选择一个星区以展开档案。
    </div>
  </aside>
</template>
