<script setup>
import { computed, reactive, ref } from 'vue'
import { atlasEdges, atlasMapBounds, atlasMeta } from '../../utils/sectorMapData'

const props = defineProps({
  nodes: { type: Array, required: true },
  visibleIds: { type: Object, required: true },
  selectedId: { type: String, default: '' }
})

const emit = defineEmits(['select'])

const svgRef = ref(null)
const view = reactive({
  x: atlasMapBounds.x,
  y: atlasMapBounds.y,
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
  const width = atlasMapBounds.width / view.scale
  const height = atlasMapBounds.height / view.scale
  return `${view.x} ${view.y} ${width} ${height}`
})
const hexRadius = computed(() => Number(atlasMeta.hexRadius) || 28)
const background = computed(() => atlasMeta.svgCoordinateTransform?.background || {
  x: 0,
  y: 0,
  width: atlasMapBounds.width,
  height: atlasMapBounds.height
})
const selectedNode = computed(() => props.nodes.find((node) => node.id === props.selectedId) || null)
const activeClusterId = computed(() => selectedNode.value?.clusterId || '')

function hexPoints(node, radius = hexRadius.value) {
  const points = []
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 6 + i * Math.PI / 3
    points.push(`${(node.x + Math.cos(angle) * radius).toFixed(2)},${(node.y + Math.sin(angle) * radius).toFixed(2)}`)
  }
  return points.join(' ')
}

function nodeClass(node) {
  return {
    active: node.id === props.selectedId,
    rich: node.hasResources,
    dim: !props.visibleIds.has(node.id),
    dlc: node.dlc !== 'base'
  }
}

function edgeClass(edge) {
  return {
    active: edge.a === props.selectedId ||
      edge.b === props.selectedId ||
      (edge.source?.clusterId && edge.source.clusterId === activeClusterId.value && edge.target?.clusterId === activeClusterId.value)
  }
}

function resourceShort(node) {
  return node.resources.slice(0, 2).map((item) => item.label).join(' / ')
}

function resetView() {
  view.scale = 1
  view.x = atlasMapBounds.x
  view.y = atlasMapBounds.y
}

function zoomBy(multiplier) {
  const nextScale = clamp(view.scale * multiplier, 0.72, 4.2)
  const centerX = view.x + atlasMapBounds.width / view.scale / 2
  const centerY = view.y + atlasMapBounds.height / view.scale / 2
  view.scale = nextScale
  clampToMap(centerX - atlasMapBounds.width / view.scale / 2, centerY - atlasMapBounds.height / view.scale / 2)
}

function focusNode(node) {
  if (!node) return
  view.scale = Math.max(view.scale, 2.35)
  clampToMap(node.x - atlasMapBounds.width / view.scale / 2, node.y - atlasMapBounds.height / view.scale / 2)
}

function onWheel(event) {
  event.preventDefault()
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect) return
  const currentWidth = atlasMapBounds.width / view.scale
  const currentHeight = atlasMapBounds.height / view.scale
  const px = (event.clientX - rect.left) / rect.width
  const py = (event.clientY - rect.top) / rect.height
  const worldX = view.x + currentWidth * px
  const worldY = view.y + currentHeight * py
  const nextScale = clamp(view.scale * (event.deltaY > 0 ? 0.88 : 1.14), 0.72, 4.2)
  const nextWidth = atlasMapBounds.width / nextScale
  const nextHeight = atlasMapBounds.height / nextScale
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
  const width = atlasMapBounds.width / view.scale
  const height = atlasMapBounds.height / view.scale
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

function clampToMap(nextX, nextY) {
  const width = atlasMapBounds.width / view.scale
  const height = atlasMapBounds.height / view.scale
  const padding = atlasMapBounds.padding
  view.x = clamp(nextX, -padding, atlasMapBounds.width - width + padding)
  view.y = clamp(nextY, -padding, atlasMapBounds.height - height + padding)
}

function clamp(value, min, max) {
  if (min > max) return (min + max) / 2
  return Math.min(max, Math.max(min, value))
}

defineExpose({ resetView, focusNode, zoomBy })
</script>

<template>
  <section class="map-panel-v4">
    <div class="map-canvas-v4">
      <svg
        ref="svgRef"
        class="map-svg-v4"
        :viewBox="viewBox"
        role="img"
        aria-label="X4 可游玩星区地图"
        @wheel="onWheel"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @pointerleave="endDrag"
      >
        <defs>
          <filter id="v4Glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="v4Grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" class="v4-grid" />
          </pattern>
        </defs>

        <rect :x="-atlasMapBounds.padding" :y="-atlasMapBounds.padding" :width="atlasMapBounds.width + atlasMapBounds.padding * 2" :height="atlasMapBounds.height + atlasMapBounds.padding * 2" fill="url(#v4Grid)" />
        <image
          v-if="atlasMeta.shapeSvgPath || atlasMeta.shapeSvgDataUri"
          class="v4-real-map-bg"
          :href="atlasMeta.shapeSvgPath || atlasMeta.shapeSvgDataUri"
          :x="background.x"
          :y="background.y"
          :width="background.width"
          :height="background.height"
          preserveAspectRatio="none"
        />

        <g class="v4-gates">
          <line
            v-for="edge in atlasEdges"
            :key="`${edge.a}-${edge.b}`"
            class="v4-gate"
            :class="edgeClass(edge)"
            :x1="edge.source.x"
            :y1="edge.source.y"
            :x2="edge.target.x"
            :y2="edge.target.y"
          />
        </g>

        <g class="v4-sectors">
          <g
            v-for="node in nodes"
            :key="node.id"
            class="v4-sector"
            :class="nodeClass(node)"
            tabindex="0"
            role="button"
            :aria-label="node.title"
            @pointerdown.stop
            @click.stop="emit('select', node)"
            @keydown.enter.prevent="emit('select', node)"
            @keydown.space.prevent="emit('select', node)"
          >
            <title>{{ node.fullName }} · {{ node.clusterTitle }}</title>
            <polygon :points="hexPoints(node)" />
            <circle v-if="node.id === selectedId" class="v4-select-ring" :cx="node.x" :cy="node.y" :r="hexRadius + 8" />
            <text class="sector-name" :x="node.labelX" :y="node.labelY">{{ node.title }}</text>
            <text class="sector-code" :x="node.labelX" :y="node.labelY + 5.8">{{ node.code }}</text>
            <text v-if="node.hasResources" class="sector-res" :x="node.labelX" :y="node.labelY + 11">{{ resourceShort(node) }}</text>
          </g>
        </g>
      </svg>

      <div class="map-legend-v4" aria-hidden="true">
        <span><i></i>可游玩星区</span>
        <span class="dlc"><i></i>DLC</span>
        <span class="rich"><i></i>资源富集</span>
        <span class="gate"><i></i>星门连接</span>
      </div>
    </div>
  </section>
</template>
