<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  averageMetrics,
  benchmarkTypes,
  chartConfig,
  comparableRows,
  compareValue,
  createDraftFromRow,
  defaultSelectedIds,
  exportXmlSnippet,
  getBenchmarkType,
  materialRecommendation,
  metricRows,
  metricsFromDraft,
  rowsForType
} from '../../utils/benchmarkData'
import { formatValue } from '../../utils/format'

const typeKey = ref('weapon_m')
const query = ref('')
const selectedIds = ref(new Set())
const activeId = ref('')
const draft = reactive({})
const copied = ref(false)

const type = computed(() => getBenchmarkType(typeKey.value))
const rows = computed(() => rowsForType(typeKey.value))
const filteredRows = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((row) => {
    return [row.name, row.subtitle, row.row['武器系统'], row.row['炮塔类型'], row.row['船级/类型'], row.row['类型']]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})
const visibleRows = computed(() => filteredRows.value.slice(0, 80))
const selectedRows = computed(() => rows.value.filter((row) => selectedIds.value.has(row.id)))
const activeTemplate = computed(() => rows.value.find((row) => row.id === activeId.value) || selectedRows.value[0] || rows.value[0] || null)
const customMetrics = computed(() => metricsFromDraft(draft, typeKey.value))
const chart = computed(() => chartConfig(typeKey.value))
const chartRows = computed(() => comparableRows(rows.value, activeTemplate.value, customMetrics.value))
const metrics = computed(() => metricRows(typeKey.value))
const avg = computed(() => averageMetrics(selectedRows.value.length ? selectedRows.value : chartRows.value, metrics.value.map(([key]) => key)))
const material = computed(() => materialRecommendation(selectedRows.value, activeTemplate.value, draft.productionMode))
const xmlSnippet = computed(() => exportXmlSnippet(typeKey.value, draft, customMetrics.value))
const chartGeometry = computed(() => buildChartGeometry(chartRows.value, selectedRows.value, customMetrics.value, chart.value))
const curveGeometry = computed(() => buildCurveGeometry(metrics.value, chartRows.value, selectedRows.value, activeTemplate.value, customMetrics.value))

watch(typeKey, () => resetForType(), { immediate: true })
watch(rows, () => resetForType())

function resetForType() {
  const ids = new Set(defaultSelectedIds(rows.value))
  selectedIds.value = ids
  activeId.value = [...ids][0] || rows.value[0]?.id || ''
  resetDraft()
  query.value = ''
}

function resetDraft(row = activeTemplate.value) {
  const next = createDraftFromRow(row, typeKey.value)
  Object.keys(draft).forEach((key) => delete draft[key])
  Object.assign(draft, next)
}

function setActive(row) {
  activeId.value = row.id
  if (!selectedIds.value.has(row.id)) toggleSelected(row)
  resetDraft(row)
}

function toggleSelected(row) {
  const next = new Set(selectedIds.value)
  next.has(row.id) ? next.delete(row.id) : next.add(row.id)
  selectedIds.value = next
}

function selectVisible() {
  const next = new Set(selectedIds.value)
  visibleRows.value.slice(0, 24).forEach((row) => next.add(row.id))
  selectedIds.value = next
}

function clearSelected() {
  selectedIds.value = new Set()
}

function setDraftNumber(key, event) {
  const n = Number(event.target.value)
  draft[key] = Number.isFinite(n) ? Math.max(0, n) : 0
}

function setProductionMode(mode) {
  draft.productionMode = mode
}

async function copyXml() {
  copied.value = false
  await navigator.clipboard?.writeText(xmlSnippet.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1400)
}

function diffClass(key, diff) {
  if (diff === null) return ''
  const lowerIsGood = key === 'price' || key === 'delay' || key === 'travelCharge' || key === 'boostRecharge'
  if (Math.abs(diff) < 1) return 'even'
  return lowerIsGood ? (diff < 0 ? 'good' : 'bad') : (diff > 0 ? 'good' : 'bad')
}

function diffText(key, diff) {
  if (diff === null) return '缺少标杆'
  const label = key === 'price' ? (diff >= 0 ? '更贵' : '更省') : (diff >= 0 ? '高于标杆' : '低于标杆')
  return `${label} ${Math.abs(diff).toFixed(1)}%`
}

function fieldValue(value, field = '') {
  return formatValue(value, field)
}

function buildChartGeometry(baseRows, selected, custom, config) {
  const width = 860
  const height = 340
  const pad = { left: 76, right: 28, top: 22, bottom: 54 }
  const all = [
    ...baseRows.map((row) => ({ id: row.id, name: row.name, x: row.metrics[config.xKey], y: row.metrics[config.yKey], selected: selected.some((item) => item.id === row.id) })),
    { id: 'custom', name: draft.name || '我的设计', x: custom[config.xKey], y: custom[config.yKey], custom: true }
  ].filter((point) => point.x !== null && point.y !== null && Number.isFinite(point.x) && Number.isFinite(point.y))
  const xRawMax = Math.max(...all.map((point) => point.x), 1)
  const yRawMax = Math.max(...all.map((point) => point.y), 1)
  const xMax = robustMax(all.map((point) => point.x), xRawMax)
  const yMax = robustMax(all.map((point) => point.y), yRawMax)
  const xScale = (x) => pad.left + (Math.min(x, xMax) / xMax) * (width - pad.left - pad.right)
  const yScale = (y) => height - pad.bottom - (Math.min(y, yMax) / yMax) * (height - pad.top - pad.bottom)
  const points = all.map((point) => ({
    ...point,
    cx: xScale(point.x),
    cy: yScale(point.y)
  }))
  const buckets = Array.from({ length: 8 }, (_, index) => {
    const min = (xMax / 8) * index
    const max = (xMax / 8) * (index + 1)
    const items = baseRows.filter((row) => {
      const x = row.metrics[config.xKey]
      const y = row.metrics[config.yKey]
      return x !== null && y !== null && x >= min && x <= max
    })
    if (!items.length) return null
    const strongest = items.reduce((best, row) => row.metrics[config.yKey] > best.metrics[config.yKey] ? row : best, items[0])
    return `${xScale(strongest.metrics[config.xKey]).toFixed(1)},${yScale(strongest.metrics[config.yKey]).toFixed(1)}`
  }).filter(Boolean).join(' ')
  return {
    width,
    height,
    points,
    envelope: buckets,
    xMax,
    yMax,
    xAxis: yScale(0),
    yAxis: xScale(0)
  }
}

function buildCurveGeometry(metricList, baseRows, selected, template, custom) {
  const fields = metricList.filter(([key]) => key !== 'price').slice(0, 8)
  const references = (selected.length ? selected : template ? [template] : baseRows.slice(0, 4)).slice(0, 5)
  const width = 920
  const height = 300
  const pad = { left: 58, right: 28, top: 28, bottom: 58 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const x = (index) => fields.length <= 1 ? pad.left + innerW / 2 : pad.left + innerW * index / (fields.length - 1)
  const y = (value) => pad.top + innerH - Math.max(0, Math.min(220, value)) / 220 * innerH
  const average = averageMetrics(baseRows, fields.map(([key]) => key))
  const referenceBase = template?.metrics || average
  const lineFromMetrics = (source, id, name, className, color = '') => {
    const points = fields.map(([key], index) => {
      const base = positive(referenceBase[key], average[key] || 1)
      const raw = positive(source[key], 0)
      const ratio = base ? raw / base * 100 : 0
      return {
        key,
        label: fields[index][1],
        x: x(index),
        y: y(ratio),
        ratio,
        raw
      }
    })
    return {
      id,
      name,
      className,
      color,
      points,
      pointText: points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
    }
  }
  const lines = [
    lineFromMetrics(average, 'average', '同梯度均值', 'avg'),
    ...references.map((row, index) => lineFromMetrics(row.metrics, row.id, row.name, 'ref', curveColors[index % curveColors.length])),
    lineFromMetrics(custom, 'custom', custom.name || draft.name || '你的设计', 'custom')
  ]
  return {
    width,
    height,
    fields,
    lines,
    guideRows: [50, 100, 150, 200].map((value) => ({ value, y: y(value) })),
    xLabels: fields.map(([, label], index) => ({ label, x: x(index) }))
  }
}

function robustMax(values, fallback) {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (!sorted.length) return fallback
  const max = sorted[sorted.length - 1]
  const distinct = [...new Set(sorted.map((value) => Math.round(value * 1000) / 1000))]
  const secondDistinct = distinct.length > 1 ? distinct[distinct.length - 2] : max
  if (secondDistinct > 0 && max > secondDistinct * 4) return secondDistinct
  const p75 = sorted[Math.max(0, Math.floor(sorted.length * 0.75) - 1)]
  return max > p75 * 4 ? p75 : max
}

function positive(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const curveColors = ['#7c8cff', '#ff7a90', '#42b883', '#d6a63a', '#00a7d8']
</script>

<template>
  <main class="benchmark-page">
    <header class="benchmark-topbar">
      <div>
        <span class="benchmark-topbar-label">数值标杆工具</span>
        <h1>正在对比 <strong>{{ type.group }}</strong> · {{ type.label }}</h1>
        <p>{{ type.hint }}</p>
      </div>
      <nav class="benchmark-links" aria-label="页面入口">
        <a class="btn ghost" href="#/">数据库</a>
        <a class="btn ghost" href="#/map">星区地图</a>
        <a class="btn ghost" href="#/lore">编年史</a>
      </nav>
    </header>

    <section class="benchmark-workflow" aria-label="Benchmark 使用流程">
      <article>
        <span>01</span>
        <b>选择制作对象</b>
        <small>{{ type.label }} 只会匹配同尺寸/同类别原版对象。</small>
      </article>
      <article>
        <span>02</span>
        <b>勾选原版标杆</b>
        <small>可多选同类对象，曲线会分别显示，不只看均值。</small>
      </article>
      <article>
        <span>03</span>
        <b>填写你的数值</b>
        <small>负数会被拦截为 0；武器/炮塔会按弹体参数计算 DPS。</small>
      </article>
      <article>
        <span>04</span>
        <b>读取输出</b>
        <small>曲线、差值、材料建议和 XML 片段一起核对。</small>
      </article>
    </section>

    <section class="benchmark-chart-card">
      <div class="benchmark-chart-head">
        <div>
          <span>{{ type.group }} / {{ type.label }}</span>
          <h2>曲线对比表</h2>
          <p>纵轴为相对当前模板百分比；100% 表示等同模板。灰线是同梯度均值，彩线是已勾选原版对象，金线是你的设计。</p>
        </div>
        <div class="benchmark-kpis">
          <div class="kpi-custom">
            <small>你的强度</small>
            <b>{{ fieldValue(customMetrics.power, 'DPS') }}</b>
          </div>
          <div class="kpi-benchmark">
            <small>已勾选标杆</small>
            <b>{{ selectedRows.length }} 个</b>
          </div>
          <div class="kpi-sample">
            <small>同梯度样本</small>
            <b>{{ chartRows.length }} 个</b>
          </div>
        </div>
      </div>

      <svg class="benchmark-chart benchmark-curve-chart" :viewBox="`0 0 ${curveGeometry.width} ${curveGeometry.height}`" role="img" aria-label="Benchmark 曲线对比表">
        <g class="chart-grid">
          <line
            v-for="row in curveGeometry.guideRows"
            :key="`guide-${row.value}`"
            x1="58"
            x2="892"
            :y1="row.y"
            :y2="row.y"
            :class="{ baseline: row.value === 100 }"
          />
          <line
            v-for="label in curveGeometry.xLabels"
            :key="`x-${label.label}`"
            :x1="label.x"
            :x2="label.x"
            y1="28"
            y2="242"
          />
        </g>
        <text
          v-for="row in curveGeometry.guideRows"
          :key="`guide-label-${row.value}`"
          x="16"
          :y="row.y + 4"
          class="chart-label chart-percent-label"
        >{{ row.value }}%</text>
        <polyline
          v-for="line in curveGeometry.lines"
          :key="line.id"
          :points="line.pointText"
          class="benchmark-curve-line"
          :class="`benchmark-curve-line-${line.className}`"
          :style="line.color ? { stroke: line.color } : null"
        />
        <g v-for="line in curveGeometry.lines" :key="`dots-${line.id}`">
          <circle
            v-for="point in line.points"
            :key="`${line.id}-${point.key}`"
            :cx="point.x"
            :cy="point.y"
            :r="line.className === 'custom' ? 4.8 : 3.4"
            class="benchmark-curve-dot"
            :class="`benchmark-curve-dot-${line.className}`"
            :style="line.color ? { fill: line.color, stroke: line.color } : null"
          >
            <title>{{ line.name }} · {{ point.label }}：{{ point.ratio.toFixed(1) }}%</title>
          </circle>
        </g>
        <text
          v-for="label in curveGeometry.xLabels"
          :key="`label-${label.label}`"
          :x="label.x"
          y="270"
          class="chart-label chart-x-label"
        >{{ label.label }}</text>
      </svg>

      <div class="benchmark-curve-legend">
        <span><i class="legend-avg"></i>同梯度均值</span>
        <span v-for="line in curveGeometry.lines.filter((item) => item.className === 'ref')" :key="`legend-${line.id}`">
          <i :style="{ background: line.color }"></i>{{ line.name }}
        </span>
        <span><i class="legend-custom"></i>你的设计</span>
      </div>
    </section>

    <section class="benchmark-workspace">
      <aside class="benchmark-panel benchmark-picker">
        <header class="benchmark-panel-head">
          <span>原版对象选择</span>
          <b>{{ type.label }} · {{ rows.length }} 个</b>
        </header>
        <div class="benchmark-type-grid">
          <button
            v-for="item in benchmarkTypes"
            :key="item.key"
            type="button"
            :class="{ active: typeKey === item.key }"
            @click="typeKey = item.key"
          >
            <small>{{ item.group }}</small>
            <b>{{ item.label }}</b>
          </button>
        </div>

        <label class="benchmark-search">
          <span>搜索原版对象</span>
          <input v-model="query" type="search" placeholder="输入名称、种族、类型或武器系统" />
        </label>

        <div class="benchmark-picker-actions">
          <button type="button" class="btn" @click="selectVisible">勾选当前页</button>
          <button type="button" class="btn ghost" @click="clearSelected">清空</button>
        </div>

        <p class="benchmark-select-hint">点击行设为当前标杆，勾选框加入多选对比。</p>

        <div class="benchmark-template-list">
          <button
            v-for="row in visibleRows"
            :key="row.id"
            type="button"
            class="benchmark-template-row"
            :class="{ active: activeTemplate?.id === row.id, selected: selectedIds.has(row.id) }"
            @click="setActive(row)"
          >
            <input type="checkbox" :checked="selectedIds.has(row.id)" @click.stop="toggleSelected(row)" />
            <span>
              <b>{{ row.name }}</b>
              <small>{{ row.subtitle || row.typeLabel }}</small>
            </span>
            <em>{{ fieldValue(row.metrics.power, 'DPS') }}</em>
          </button>
          <p v-if="!visibleRows.length" class="benchmark-empty">没有匹配的原版对象。</p>
        </div>
      </aside>

      <section class="benchmark-panel benchmark-designer">
        <header class="benchmark-panel-head">
          <span>你的 mod 设计 — {{ type.label }}</span>
          <button type="button" class="btn ghost" @click="resetDraft()">按当前标杆重置</button>
        </header>

        <label class="benchmark-field wide">
          <span>设计名称</span>
          <input v-model="draft.name" type="text" />
        </label>

        <div class="benchmark-production">
          <span>生产方式</span>
          <button type="button" :class="{ active: draft.productionMode === '常规' }" @click="setProductionMode('常规')">常规</button>
          <button type="button" :class="{ active: draft.productionMode === 'TER' }" @click="setProductionMode('TER')">TER</button>
          <button type="button" :class="{ active: draft.productionMode === '闭环' }" @click="setProductionMode('闭环')">闭环</button>
        </div>

        <template v-if="type.kind === 'weapon' || type.kind === 'turret'">
          <h3>本体参数</h3>
          <div class="benchmark-form-grid">
            <label class="benchmark-field"><span>表面耐久</span><input :value="draft.bodyHull" type="number" min="0" @input="setDraftNumber('bodyHull', $event)" /></label>
            <label class="benchmark-field"><span>平均价格</span><input :value="draft.price" type="number" min="0" @input="setDraftNumber('price', $event)" /></label>
            <label class="benchmark-field"><span>转向速度</span><input :value="draft.turnSpeed" type="number" min="0" step="0.1" @input="setDraftNumber('turnSpeed', $event)" /></label>
            <label class="benchmark-field"><span>转向加速度</span><input :value="draft.turnAccel" type="number" min="0" step="0.1" @input="setDraftNumber('turnAccel', $event)" /></label>
            <label class="benchmark-field"><span>过热阈值</span><input :value="draft.overheat" type="number" min="0" @input="setDraftNumber('overheat', $event)" /></label>
            <label class="benchmark-field"><span>散热速度</span><input :value="draft.coolRate" type="number" min="0" @input="setDraftNumber('coolRate', $event)" /></label>
          </div>

          <h3>弹体参数</h3>
          <div class="benchmark-form-grid">
            <label class="benchmark-field"><span>单发伤害</span><input :value="draft.damage" type="number" min="0" step="0.1" @input="setDraftNumber('damage', $event)" /></label>
            <label class="benchmark-field"><span>射速（发/秒）</span><input :value="draft.fireRate" type="number" min="0" step="0.01" @input="setDraftNumber('fireRate', $event)" /></label>
            <label class="benchmark-field"><span>弹体数量</span><input :value="draft.amount" type="number" min="0" step="1" @input="setDraftNumber('amount', $event)" /></label>
            <label class="benchmark-field"><span>炮管数量</span><input :value="draft.barrels" type="number" min="0" step="1" @input="setDraftNumber('barrels', $event)" /></label>
            <label class="benchmark-field"><span>弹体速度</span><input :value="draft.bulletSpeed" type="number" min="0" @input="setDraftNumber('bulletSpeed', $event)" /></label>
            <label class="benchmark-field"><span>弹体寿命</span><input :value="draft.lifetime" type="number" min="0" step="0.1" @input="setDraftNumber('lifetime', $event)" /></label>
            <label class="benchmark-field"><span>最大命中数</span><input :value="draft.maxHit" type="number" min="0" step="1" @input="setDraftNumber('maxHit', $event)" /></label>
            <label class="benchmark-field"><span>每弹热量</span><input :value="draft.heat" type="number" min="0" step="0.1" @input="setDraftNumber('heat', $event)" /></label>
          </div>
        </template>

        <template v-else-if="type.kind === 'ship'">
          <h3>舰船规格</h3>
          <div class="benchmark-form-grid">
            <label class="benchmark-field"><span>船体耐久</span><input :value="draft.hull" type="number" min="0" @input="setDraftNumber('hull', $event)" /></label>
            <label class="benchmark-field"><span>平均价格</span><input :value="draft.price" type="number" min="0" @input="setDraftNumber('price', $event)" /></label>
            <label class="benchmark-field"><span>货舱容量</span><input :value="draft.cargo" type="number" min="0" @input="setDraftNumber('cargo', $event)" /></label>
            <label class="benchmark-field"><span>主武器槽</span><input :value="draft.mainWeapons" type="number" min="0" step="1" @input="setDraftNumber('mainWeapons', $event)" /></label>
            <label class="benchmark-field"><span>武器槽</span><input :value="draft.weaponSlots" type="number" min="0" step="1" @input="setDraftNumber('weaponSlots', $event)" /></label>
            <label class="benchmark-field"><span>炮塔槽</span><input :value="draft.turretSlots" type="number" min="0" step="1" @input="setDraftNumber('turretSlots', $event)" /></label>
            <label class="benchmark-field"><span>护盾槽</span><input :value="draft.shieldSlots" type="number" min="0" step="1" @input="setDraftNumber('shieldSlots', $event)" /></label>
            <label class="benchmark-field"><span>停靠/机库</span><input :value="draft.dockSlots" type="number" min="0" step="1" @input="setDraftNumber('dockSlots', $event)" /></label>
            <label class="benchmark-field wide"><span>无人机/单位容量</span><input :value="draft.droneCapacity" type="number" min="0" step="1" @input="setDraftNumber('droneCapacity', $event)" /></label>
          </div>
        </template>

        <template v-else-if="type.kind === 'shield'">
          <h3>护盾规格</h3>
          <div class="benchmark-form-grid">
            <label class="benchmark-field"><span>护盾容量</span><input :value="draft.capacity" type="number" min="0" @input="setDraftNumber('capacity', $event)" /></label>
            <label class="benchmark-field"><span>恢复速度</span><input :value="draft.regen" type="number" min="0" @input="setDraftNumber('regen', $event)" /></label>
            <label class="benchmark-field"><span>恢复延迟</span><input :value="draft.delay" type="number" min="0" step="0.1" @input="setDraftNumber('delay', $event)" /></label>
            <label class="benchmark-field"><span>平均价格</span><input :value="draft.price" type="number" min="0" @input="setDraftNumber('price', $event)" /></label>
          </div>
        </template>

        <template v-else>
          <h3>引擎规格</h3>
          <div class="benchmark-form-grid">
            <label class="benchmark-field"><span>前向推力</span><input :value="draft.thrust" type="number" min="0" @input="setDraftNumber('thrust', $event)" /></label>
            <label class="benchmark-field"><span>反向推力</span><input :value="draft.reverseThrust" type="number" min="0" @input="setDraftNumber('reverseThrust', $event)" /></label>
            <label class="benchmark-field"><span>旅行推力</span><input :value="draft.travelThrust" type="number" min="0" @input="setDraftNumber('travelThrust', $event)" /></label>
            <label class="benchmark-field"><span>旅行充能</span><input :value="draft.travelCharge" type="number" min="0" step="0.1" @input="setDraftNumber('travelCharge', $event)" /></label>
            <label class="benchmark-field"><span>助推持续</span><input :value="draft.boostDuration" type="number" min="0" step="0.1" @input="setDraftNumber('boostDuration', $event)" /></label>
            <label class="benchmark-field"><span>助推恢复</span><input :value="draft.boostRecharge" type="number" min="0" step="0.1" @input="setDraftNumber('boostRecharge', $event)" /></label>
            <label class="benchmark-field wide"><span>平均价格</span><input :value="draft.price" type="number" min="0" @input="setDraftNumber('price', $event)" /></label>
          </div>
        </template>
      </section>

      <aside class="benchmark-panel benchmark-output">
        <header class="benchmark-panel-head">
          <span>对比结果</span>
          <b>{{ selectedRows.length || chartRows.length }} 个标杆</b>
        </header>

        <div class="benchmark-compare-header">
          <span>指标</span>
          <span>你的设计</span>
          <span>对比标杆均值</span>
        </div>
        <div class="benchmark-compare-list">
          <div v-for="[key, label] in metrics" :key="key" class="benchmark-compare-row">
            <span>{{ label }}</span>
            <b>{{ fieldValue(customMetrics[key], label) }}</b>
            <small :class="diffClass(key, compareValue(customMetrics[key], avg[key]))">
              {{ diffText(key, compareValue(customMetrics[key], avg[key])) }}
            </small>
          </div>
        </div>

        <section class="benchmark-material">
          <h3>材料建议</h3>
          <p>{{ material.text }}</p>
          <small>{{ material.mode }}生产 / 来源标杆 {{ material.sourceCount }} 个。{{ material.note }}</small>
        </section>

        <details class="benchmark-xml">
          <summary>
            <h3>导出为 XML 片段</h3>
            <button type="button" class="btn" @click.prevent="copyXml">{{ copied ? '已复制' : '复制到剪贴板' }}</button>
          </summary>
          <pre>{{ xmlSnippet }}</pre>
        </details>
      </aside>
    </section>
  </main>
</template>
