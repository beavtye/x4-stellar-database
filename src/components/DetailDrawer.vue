<script setup>
import { computed } from 'vue'
import { asNumber, formatValue, isNumericField } from '../utils/format'
import { buildDetailPresentation, rowSubtitle } from '../utils/detailPresentation'

const props = defineProps({
  row: { type: Object, default: null },
  headers: { type: Array, required: true },
  dataset: { type: String, required: true },
  nameKey: { type: String, required: true },
  subKey: { type: String, required: true },
  selected: { type: Boolean, required: true },
  favorite: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'toggle-selected', 'toggle-favorite', 'suggest'])

const detail = computed(() => buildDetailPresentation(props.row, props.headers, {
  nameKey: props.nameKey,
  subKey: props.subKey
}))
const subtitle = computed(() => rowSubtitle(props.row, props.subKey))
const sourceLabel = computed(() => props.row?.__source || '')
const sourceType = computed(() => props.row?.__source_type === 'mod' ? 'mod' : 'vanilla')
const headlineItems = computed(() => buildHeadlineItems(props.row))
const identityTags = computed(() => buildIdentityTags(props.row))
const sectionNav = computed(() => {
  const sections = detail.value.sections.map((section, index) => ({
    title: section.title,
    count: section.items.length,
    id: sectionId(section.title, index)
  }))
  if (detail.value.technicalItems.length) {
    sections.push({ title: '技术信息', count: detail.value.technicalItems.length, id: 'detail-section-tech' })
  }
  return sections
})
const shareUrl = computed(() => {
  if (!props.row) return ''
  const type = ({
    ships: 'ship',
    weapons: 'weapon',
    turrets: 'turret',
    equipment: 'equipment',
    sectors: 'sector',
    lore: 'lore'
  })[props.dataset] || props.dataset
  const id = props.row.__uid ||
    props.row['ware ID'] ||
    props.row['船只 macro'] ||
    props.row['武器 macro'] ||
    props.row['炮塔 macro'] ||
    props.row['装备 macro'] ||
    props.row.id
  return `#/share?type=${encodeURIComponent(type)}&id=${encodeURIComponent(String(id || ''))}`
})

function ddClass(field) {
  return [
    isNumericField(field) ? 'num' : '',
    /材料|资源|说明|备注|关键参数|生产方式/.test(field) ? 'text-long' : ''
  ].filter(Boolean).join(' ')
}

function sectionId(title, index) {
  const slug = String(title || 'section')
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
  return `detail-section-${index}-${slug}`
}

function scrollToSection(id) {
  const target = document.getElementById(id)
  if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

function metricWidth(value) {
  const n = asNumber(value)
  if (n === null || n <= 0) return 0
  return Math.max(8, Math.min(100, Math.log10(n + 1) * 20))
}

function buildHeadlineItems(row) {
  if (!row) return []
  const candidates = [
    ['平均价格（Cr）', '平均价格'],
    ['船体耐久', '船体耐久'],
    ['货舱容量', '货舱容量'],
    ['理论 DPS（估算）', '理论 DPS'],
    ['单发伤害', '单发伤害'],
    ['射程（米）', '射程'],
    ['护盾容量（MJ）', '护盾容量'],
    ['前向推力', '前向推力'],
    ['转向速度（度/秒）', '转向速度']
  ]
  return candidates
    .map(([field, label]) => ({ field, label, value: formatValue(row[field], field), raw: row[field] }))
    .filter((item) => item.value !== '—')
    .slice(0, 4)
}

function buildIdentityTags(row) {
  if (!row) return []
  return ['尺寸', '种族', '势力', '制造种族', '船级/类型', '主要用途', '武器类型', '炮塔类型', '装备类型', 'Mk']
    .map((field) => formatValue(row[field], field))
    .filter((value, index, arr) => value !== '—' && arr.indexOf(value) === index)
    .slice(0, 5)
}

function openShare() {
  if (!shareUrl.value) return
  window.open(shareUrl.value, '_blank', 'noopener')
}

function readableRow() {
  if (!props.row) return {}
  const output = {}
  for (const field of props.headers) {
    if (field.startsWith('__')) continue
    const value = props.row[field]
    const formatted = formatValue(value, field)
    if (formatted !== '—') output[field] = formatted
  }
  return output
}

async function copyData() {
  const text = JSON.stringify(readableRow(), null, 2)
  if (!text || text === '{}') return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
  }
}
</script>

<template>
  <div class="drawer-backdrop" :class="{ open: row }" @click="$emit('close')"></div>
  <aside class="drawer" :class="{ open: row }">
    <template v-if="row">
      <header class="drawer-head">
        <div class="drawer-title">
          <span class="drawer-source" :class="sourceType">{{ sourceLabel }}</span>
          <h3>{{ formatValue(row[nameKey], nameKey) }}</h3>
          <p>{{ subtitle }}</p>
          <div v-if="identityTags.length" class="drawer-identity-tags">
            <span v-for="tag in identityTags" :key="tag">{{ tag }}</span>
          </div>
        </div>
        <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
      </header>
      <section v-if="headlineItems.length" class="drawer-headline-metrics" aria-label="关键参数">
        <article v-for="item in headlineItems" :key="item.field" class="drawer-headline-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <i :style="{ width: `${metricWidth(item.raw)}%` }"></i>
        </article>
      </section>
      <div class="drawer-actions">
        <button type="button" class="btn" :class="{ active: favorite }" @click="emit('toggle-favorite', row)">
          {{ favorite ? '★ 已收藏' : '☆ 收藏' }}
        </button>
        <button type="button" class="btn" :class="{ active: selected }" @click="emit('toggle-selected', row)">
          {{ selected ? '✓ 已加入对比' : '＋ 对比' }}
        </button>
        <button type="button" class="btn" @click="copyData">⧉ 复制数据</button>
        <button type="button" class="btn share-entry-btn" @click="openShare">⇪ 分享</button>
        <button type="button" class="btn" @click="emit('suggest', row)">✎ 修订</button>
      </div>
      <nav v-if="sectionNav.length" class="drawer-section-nav" aria-label="详情分组导航">
        <button
          v-for="section in sectionNav"
          :key="section.id"
          type="button"
          @click="scrollToSection(section.id)"
        >
          <span>{{ section.title }}</span>
          <b>{{ section.count }}</b>
        </button>
      </nav>
      <div class="drawer-body">
        <section
          v-for="(section, index) in detail.sections"
          :id="sectionId(section.title, index)"
          :key="section.title"
          class="detail-group"
        >
          <h4><span>{{ section.title }}</span><small>{{ section.items.length }} 项</small></h4>
          <dl class="detail-grid" :class="{ compact: section.compact }">
            <div v-for="item in section.items" :key="item.field" class="detail-item" :class="{ wide: item.wide }">
              <dt>{{ item.field }}</dt>
              <dd :class="ddClass(item.field)">
                <template v-if="isNumericField(item.field)">
                  <span>{{ item.value }}</span>
                  <i class="detail-metric-bar" :style="{ width: `${metricWidth(row[item.field])}%` }"></i>
                </template>
                <template v-else>
                  {{ item.value }}
                </template>
              </dd>
            </div>
          </dl>
        </section>

        <details v-if="detail.technicalItems.length" id="detail-section-tech" class="detail-tech">
          <summary>技术信息（{{ detail.technicalItems.length }} 项）</summary>
          <dl class="detail-grid">
            <div v-for="item in detail.technicalItems" :key="item.field" class="detail-item wide tech">
              <dt>{{ item.field }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
        </details>
      </div>
    </template>
  </aside>
</template>
