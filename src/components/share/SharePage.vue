<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import ShareCard from './ShareCard.vue'
import { lookupShareRecord } from '../../utils/shareLookup'
import { parseShareRoute, shareRouteText } from '../../utils/shareRoute'

const props = defineProps({
  routeVersion: { type: Number, default: 0 }
})

const route = computed(() => {
  props.routeVersion
  return parseShareRoute()
})
const record = ref(null)
const routeText = computed(() => shareRouteText(route.value))

watch(route, loadRecord, { immediate: true })

async function exportPng(options = {}) {
  const card = document.getElementById('x4-share-card')
  if (!card) throw new Error('分享卡 PNG 导出失败：未找到 #x4-share-card。')

  const rect = card.getBoundingClientRect()
  const width = Math.round(options.width || rect.width || (route.value.layout === 'portrait' ? 900 : 1200))
  const height = Math.round(options.height || rect.height || (route.value.layout === 'portrait' ? 1400 : 675))
  const scale = Math.max(1, Number(options.scale) || 1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  context.scale(scale, scale)
  drawShareCanvas(context, width, height)
  const dataUrl = canvas.toDataURL('image/png')
  return options.base64Only ? dataUrl.replace(/^data:image\/png;base64,/, '') : dataUrl
}

function normalizeColor(value) {
  return /^#[0-9a-f]{3,8}$/i.test(value || '') ? value : '#5fe1ff'
}

function drawRoundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text || '').split(/\s+/)
  const lines = []
  let line = ''
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = testLine
    }
  })
  if (line) lines.push(line)
  const clipped = lines.slice(0, maxLines)
  clipped.forEach((item, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : ''
    context.fillText(`${item}${suffix}`, x, y + index * lineHeight)
  })
  return clipped.length * lineHeight
}

function drawShareCanvas(context, width, height) {
  const data = record.value || {}
  const accent = normalizeColor(data.accentColor)
  const isPortrait = height > width
  const pad = isPortrait ? 58 : 54
  const innerWidth = width - pad * 2

  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#07111f')
  gradient.addColorStop(0.55, '#111827')
  gradient.addColorStop(1, '#05070d')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.fillStyle = accent
  context.fillRect(0, 0, width, isPortrait ? 12 : 10)

  context.strokeStyle = 'rgba(255,255,255,0.08)'
  context.lineWidth = 1
  for (let x = 0; x < width; x += 48) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }
  for (let y = 0; y < height; y += 48) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }

  context.fillStyle = accent
  context.globalAlpha = 0.14
  context.beginPath()
  context.arc(width * 0.82, height * 0.14, isPortrait ? 170 : 150, 0, Math.PI * 2)
  context.fill()
  context.globalAlpha = 1

  context.fillStyle = 'rgba(255,255,255,0.08)'
  drawRoundRect(context, pad, pad, innerWidth, height - pad * 2, 22)
  context.fill()
  context.strokeStyle = 'rgba(255,255,255,0.18)'
  context.stroke()

  let y = pad + 50
  context.font = '700 24px Arial, sans-serif'
  context.fillStyle = accent
  context.fillText(data.label || 'X4 数据库', pad + 34, y)

  context.textAlign = 'right'
  context.font = '800 44px Arial, sans-serif'
  context.fillText('X4', width - pad - 34, y + 8)
  context.textAlign = 'left'

  y += isPortrait ? 82 : 70
  context.fillStyle = '#ffffff'
  context.font = `800 ${isPortrait ? 58 : 56}px Arial, "Microsoft YaHei", sans-serif`
  drawWrappedText(context, data.title || '未找到分享条目', pad + 34, y, innerWidth - 68, isPortrait ? 68 : 64, 2)

  y += isPortrait ? 142 : 118
  context.fillStyle = 'rgba(230,244,255,0.78)'
  context.font = `500 ${isPortrait ? 28 : 24}px Arial, "Microsoft YaHei", sans-serif`
  y += drawWrappedText(context, data.subtitle || '', pad + 34, y, innerWidth - 68, isPortrait ? 38 : 34, 2)

  const fields = Array.isArray(data.fields) ? data.fields.slice(0, isPortrait ? 8 : 6) : []
  if (fields.length) {
    y += isPortrait ? 54 : 40
    const columns = isPortrait ? 2 : 3
    const gap = 18
    const itemWidth = (innerWidth - 68 - gap * (columns - 1)) / columns
    fields.forEach(([field, value], index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      const x = pad + 34 + col * (itemWidth + gap)
      const itemY = y + row * (isPortrait ? 108 : 94)
      context.fillStyle = 'rgba(255,255,255,0.08)'
      drawRoundRect(context, x, itemY, itemWidth, isPortrait ? 82 : 72, 14)
      context.fill()
      context.fillStyle = 'rgba(210,226,240,0.62)'
      context.font = `500 ${isPortrait ? 20 : 18}px Arial, "Microsoft YaHei", sans-serif`
      context.fillText(String(field), x + 18, itemY + 27)
      context.fillStyle = '#ffffff'
      context.font = `700 ${isPortrait ? 25 : 22}px Arial, "Microsoft YaHei", sans-serif`
      drawWrappedText(context, value, x + 18, itemY + (isPortrait ? 60 : 55), itemWidth - 36, isPortrait ? 28 : 24, 1)
    })
    y += Math.ceil(fields.length / columns) * (isPortrait ? 108 : 94)
  }

  y += isPortrait ? 34 : 28
  context.fillStyle = 'rgba(235,246,255,0.9)'
  context.font = `500 ${isPortrait ? 28 : 24}px Arial, "Microsoft YaHei", sans-serif`
  y += drawWrappedText(context, data.summary || '', pad + 34, y, innerWidth - 68, isPortrait ? 42 : 36, isPortrait ? 5 : 3)

  const tags = Array.isArray(data.tags) ? data.tags.slice(0, isPortrait ? 8 : 7) : []
  if (tags.length) {
    y += isPortrait ? 44 : 34
    context.font = `700 ${isPortrait ? 21 : 18}px Arial, "Microsoft YaHei", sans-serif`
    let tagX = pad + 34
    tags.forEach((tag) => {
      const text = String(tag)
      const tagWidth = Math.min(context.measureText(text).width + 34, innerWidth - 68)
      context.fillStyle = 'rgba(255,255,255,0.1)'
      drawRoundRect(context, tagX, y - 26, tagWidth, 38, 19)
      context.fill()
      context.fillStyle = accent
      context.fillText(text, tagX + 17, y)
      tagX += tagWidth + 12
    })
  }

  const footerY = height - pad - 46
  context.fillStyle = 'rgba(210,226,240,0.72)'
  context.font = `500 ${isPortrait ? 20 : 18}px Arial, "Microsoft YaHei", sans-serif`
  context.fillText(`来源：${data.source || 'X4 星际数据库'}`, pad + 34, footerY)
  context.textAlign = 'right'
  context.fillText('静态资料，不代表当前存档状态', width - pad - 34, footerY)
  context.textAlign = 'left'
}

async function loadRecord() {
  clearReady()
  record.value = null
  record.value = await lookupShareRecord(route.value)
  await setReady()
}

async function setReady() {
  await nextTick()
  window.X4ShareReady = true
  window.X4Share = {
    ...(window.X4Share || {}),
    ready: true,
    record: record.value,
    route: route.value,
    exportPng
  }
  document.body.dataset.shareReady = '1'
}

function clearReady() {
  window.X4ShareReady = false
  if (window.X4Share) window.X4Share.ready = false
  delete document.body.dataset.shareReady
}

onBeforeUnmount(clearReady)
</script>

<template>
  <main class="share-page" :class="`share-page-${route.layout}`">
    <ShareCard v-if="record" :record="record" :layout="route.layout" :route-text="routeText" />
    <p class="share-ready-hint">BOT READY: <code>1</code></p>
  </main>
</template>
