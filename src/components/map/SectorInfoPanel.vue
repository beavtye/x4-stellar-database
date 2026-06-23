<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: { type: Object, default: null }
})

const primaryFields = computed(() => (props.node?.fields || []).slice(0, 8))
const resources = computed(() => (props.node?.resources || []).filter((resource) => resource.yield > 0).slice(0, 8))
const tags = computed(() => (props.node?.tags || []).slice(0, 10))

function formatNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('zh-CN') : value
}
</script>

<template>
  <aside class="sector-info-panel">
    <header class="map-panel-head">
      <span>SECTOR DATA</span>
      <b>{{ node ? node.title : '未选择星区' }}</b>
    </header>

    <div v-if="node" class="sector-info-body">
      <section class="sector-info-hero">
        <span>{{ node.clusterTitle }}</span>
        <h2>{{ node.title }}</h2>
        <p>{{ node.summary }}</p>
      </section>

      <dl v-if="primaryFields.length" class="sector-field-list">
        <div v-for="[field, value] in primaryFields" :key="field">
          <dt>{{ field }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>

      <section v-if="resources.length" class="sector-resource-section">
        <h3>资源</h3>
        <div class="sector-resource-grid">
          <article v-for="resource in resources" :key="resource.ware || resource.label" class="sector-resource">
            <b>{{ resource.label }}</b>
            <small>{{ resource.areas }} 片区域 / {{ resource.amount }} 处</small>
            <strong>{{ formatNumber(resource.yield) }}</strong>
          </article>
        </div>
      </section>

      <section v-if="tags.length" class="sector-tag-section">
        <h3>标签</h3>
        <div class="sector-tag-row">
          <span v-for="tag in tags" :key="tag">{{ tag }}</span>
        </div>
      </section>
    </div>

    <div v-else class="sector-info-empty">
      <strong>选择一个星区</strong>
      <p>点击地图节点或左侧搜索结果查看资料。</p>
    </div>
  </aside>
</template>
