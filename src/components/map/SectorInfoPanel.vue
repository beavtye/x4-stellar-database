<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: { type: Object, default: null }
})

const playerFields = computed(() => {
  if (!props.node?.fields) return []
  return props.node.fields
})

const supplementFields = computed(() => {
  if (!props.node?.supplementFields) return []
  // Only show supplement fields that are NOT already in playerFields
  const seen = new Set((props.node.fields || []).map(([k]) => k))
  return props.node.supplementFields.filter(([k]) => !seen.has(k)).slice(0, 12)
})

const resources = computed(() => {
  if (!props.node?.resources) return []
  return props.node.resources.filter((r) => r.yield > 0).slice(0, 8)
})

const tags = computed(() => {
  if (!props.node?.visibleTags) return (props.node?.tags || []).slice(0, 10)
  return props.node.visibleTags.slice(0, 10)
})

function formatNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('zh-CN') : value
}
</script>

<template>
  <aside class="sector-info-panel">
    <header class="map-panel-head">
      <span>星区资料</span>
      <b>{{ node ? node.title : '—' }}</b>
    </header>

    <div v-if="node" class="sector-info-body">
      <!-- Hero: cluster + name + DLC + description -->
      <section class="sector-info-hero">
        <div class="sector-info-hero-top">
          <span>{{ node.clusterTitle }}</span>
          <em v-if="node.dlc" class="sector-dlc-badge">{{ node.dlc }}</em>
        </div>
        <h2>{{ node.title }}</h2>
        <p v-if="node.summary && node.summary !== '暂无描述。'">{{ node.summary }}</p>
      </section>

      <!-- Player fields (primary stats) -->
      <dl v-if="playerFields.length" class="sector-field-list">
        <div v-for="[field, value] in playerFields" :key="field">
          <dt>{{ field }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>

      <!-- Resources -->
      <section v-if="resources.length" class="sector-resource-section">
        <h3>资源产出</h3>
        <div class="sector-resource-grid">
          <article v-for="resource in resources" :key="resource.ware || resource.label" class="sector-resource">
            <b>{{ resource.label }}</b>
            <small>{{ resource.areas }} 片 / {{ resource.amount }} 处</small>
            <strong>{{ formatNumber(resource.yield) }}</strong>
          </article>
        </div>
      </section>

      <!-- Tags -->
      <section v-if="tags.length" class="sector-tag-section">
        <h3>标签</h3>
        <div class="sector-tag-row">
          <span v-for="tag in tags" :key="tag">{{ tag }}</span>
        </div>
      </section>

      <!-- Supplement fields (internal, subdued) -->
      <details v-if="supplementFields.length" class="sector-supplement-details">
        <summary>详细数据（{{ supplementFields.length }} 项）</summary>
        <dl class="sector-field-list sector-field-list-supplement">
          <div v-for="[field, value] in supplementFields" :key="field">
            <dt>{{ field }}</dt>
            <dd>{{ value }}</dd>
          </div>
        </dl>
      </details>
    </div>

    <div v-else class="sector-info-empty">
      <strong>选择一个星区</strong>
      <p>点击地图节点或左侧列表查看资料。</p>
    </div>
  </aside>
</template>
