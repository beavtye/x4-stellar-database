<script setup>
import { computed, reactive, ref } from 'vue'
import { mapBounds } from '../../utils/sectorMapData'

const props = defineProps({
  nodes: { type: Array, required: true },
  selectedId: { type: String, default: '' }
})

const emit = defineEmits(['select'])

const svgRef = ref(null)
const view = reactive({
  x: mapBounds.x,
  y: mapBounds.y,
  scale: 1
})
const drag = reactive({
  active: false,
  pointerId: null,
  x: 0,
  y: 0,
  viewX: 0,
  viewY: 0
})

const viewBox = computed(() => {
  const width = mapBounds.width / view.scale
  const height = mapBounds.height / view.scale
  return `${view.x} ${view.y} ${width} ${height}`
})

function nodeClass(node) {
  return {
    active: node.id === props.selectedId,
    rich: node.hasResources,
    anomaly: node.hasAnomaly
  }
}

function resetView() {
  view.scale = 1
  view.x = mapBounds.x
  view.y = mapBounds.y
}

function focusNode(node) {
  if (!node) return
  view.scale = Math.max(view.scale, 2.35)
  clampToMap(node.x - mapBounds.width / view.scale / 2, node.y - mapBounds.height / view.scale / 2)
}

function onWheel(event) {
  event.preventDefault()
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect) return
  const currentWidth = mapBounds.width / view.scale
  const currentHeight = mapBounds.height / view.scale
  const px = (event.clientX - rect.left) / rect.width
  const py = (event.clientY - rect.top) / rect.height
  const worldX = view.x + currentWidth * px
  const worldY = view.y + currentHeight * py
  const nextScale = clamp(view.scale * (event.deltaY > 0 ? 0.88 : 1.14), 0.72, 4.2)
  const nextWidth = mapBounds.width / nextScale
  const nextHeight = mapBounds.height / nextScale
  view.scale = nextScale
  clampToMap(worldX - nextWidth * px, worldY - nextHeight * py)
}

function startDrag(event) {
  if (event.button !== undefined && event.button !== 0) return
  drag.active = true
  drag.pointerId = event.pointerId
  drag.x = event.clientX
  drag.y = event.clientY
  drag.viewX = view.x
  drag.viewY = view.y
  svgRef.value?.setPointerCapture(event.pointerId)
}

function moveDrag(event) {
  if (!drag.active || drag.pointerId !== event.pointerId) return
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect) return
  const width = mapBounds.width / view.scale
  const height = mapBounds.height / view.scale
  const dx = (event.clientX - drag.x) / rect.width * width
  const dy = (event.clientY - drag.y) / rect.height * height
  clampToMap(drag.viewX - dx, drag.viewY - dy)
}

function endDrag(event) {
  if (drag.pointerId !== event.pointerId) return
  drag.active = false
  drag.pointerId = null
  svgRef.value?.releasePointerCapture(event.pointerId)
}

function selectNode(node) {
  emit('select', node)
}

function clampToMap(nextX, nextY) {
  const width = mapBounds.width / view.scale
  const height = mapBounds.height / view.scale
  const padding = mapBounds.padding
  view.x = clamp(nextX, -padding, mapBounds.width - width + padding)
  view.y = clamp(nextY, -padding, mapBounds.height - height + padding)
}

function clamp(value, min, max) {
  if (min > max) return (min + max) / 2
  return Math.min(max, Math.max(min, value))
}

defineExpose({ resetView, focusNode })
</script>

<template>
  <section class="sector-map-canvas-panel">
    <header class="map-panel-head">
      <span>REAL COORDINATES</span>
      <b>{{ nodes.length }} 个星区</b>
    </header>

    <div class="sector-map-canvas-wrap">
      <svg
        ref="svgRef"
        class="sector-map-svg"
        :viewBox="viewBox"
        role="img"
        aria-label="X4 星区地图"
        @wheel="onWheel"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @pointerleave="endDrag"
      >
        <defs>
          <filter id="sectorNodeGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="sectorGrid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" class="sector-grid-line" />
          </pattern>
        </defs>

        <rect :x="-mapBounds.padding" :y="-mapBounds.padding" :width="mapBounds.width + mapBounds.padding * 2" :height="mapBounds.height + mapBounds.padding * 2" class="sector-map-bg" />
        <rect :x="0" :y="0" :width="mapBounds.width" :height="mapBounds.height" fill="url(#sectorGrid)" />

        <g class="sector-map-nodes">
          <g
            v-for="node in nodes"
            :key="node.id"
            class="sector-map-node"
            :class="nodeClass(node)"
            :transform="`translate(${node.x} ${node.y})`"
            tabindex="0"
            role="button"
            :aria-label="node.title"
            @pointerdown.stop
            @click.stop="selectNode(node)"
            @keydown.enter.prevent="selectNode(node)"
            @keydown.space.prevent="selectNode(node)"
          >
            <title>{{ node.title }} / {{ node.clusterTitle }}</title>
            <rect x="-34" y="-27" width="238" height="48" rx="8" class="sector-node-label-hit-area" />
            <circle r="30" class="sector-node-hit-area" />
            <circle r="14" class="sector-node-halo" />
            <circle r="7" class="sector-node-core" />
            <circle v-if="node.id === selectedId" r="24" class="sector-node-selected" />
            <text x="18" y="-9">{{ node.title }}</text>
            <text x="18" y="8" class="sector-node-cluster">{{ node.clusterTitle }}</text>
          </g>
        </g>
      </svg>

      <div class="sector-map-legend" aria-hidden="true">
        <span><i></i>星区</span>
        <span class="rich"><i></i>有资源</span>
        <span class="anomaly"><i></i>异常标签</span>
      </div>
    </div>
  </section>
</template>
