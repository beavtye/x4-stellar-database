<script setup>
import { computed, ref, watch } from 'vue'
import { categoryLabel } from '../../utils/loreData'
import { timelineEras } from '../../utils/loreTimeline'

const props = defineProps({
  chapter: { type: Object, default: null },
  activeAnchor: { type: String, default: '' }
})

defineEmits(['jump'])

const activeTimelineIndex = ref(0)
const timelineFilter = ref('all')
const activeConflictIndex = ref(0)
const conflictFilter = ref('all')

const isTimelineChapter = computed(() => props.chapter?.id === 'timeline')
const isConflictChapter = computed(() => props.chapter?.id === 'conflict-index')
const timelineItems = computed(() => isTimelineChapter.value ? props.chapter.sections : [])
const visibleTimelineItems = computed(() => {
  if (timelineFilter.value === 'all') return timelineItems.value
  return timelineItems.value.filter((item) => item.era === timelineFilter.value)
})
const activeTimelineItem = computed(() => {
  return timelineItems.value[activeTimelineIndex.value] || timelineItems.value[0] || null
})
const conflictClusters = [
  ['machine', '机器战争', '#dc2626', 'Xenon、地形改造者、AGI 创伤'],
  ['commonwealth', '旧共同体', '#059669', 'Boron、Split、Paranid、Teladi 早期裂痕'],
  ['terran', '地球线', '#0ea5e9', 'Terran 回归、地球环、冷战升级'],
  ['dark', '断门/企业', '#b45309', '门网关闭、公司政权、断裂交通'],
  ['modern', 'X4 现代', '#0891b2', '内战、债务、灰色政治、玩家入口']
]
const conflictItems = computed(() => {
  if (!isConflictChapter.value) return []
  return props.chapter.cards
    .filter((card) => !/收录口径/.test(card.title))
    .map((card, index) => {
      const cluster = classifyConflict(card)
      const meta = conflictClusterMeta(cluster)
      return {
        ...card,
        index,
        cleanTitle: cleanConflictTitle(card.title),
        actors: conflictField(card.summary, '牵涉势力') || '未标明',
        keywords: conflictField(card.summary, '关键词') || '历史冲突',
        location: conflictField(card.summary, '正文位置') || '见对应章节',
        oneLine: conflictField(card.summary, '一句话说明') || card.summary,
        cluster,
        clusterName: meta.label,
        clusterHint: meta.hint,
        clusterColor: meta.color
      }
    })
})
const visibleConflictItems = computed(() => {
  if (conflictFilter.value === 'all') return conflictItems.value
  return conflictItems.value.filter((item) => item.cluster === conflictFilter.value)
})
const activeConflictItem = computed(() => {
  return conflictItems.value[activeConflictIndex.value] || conflictItems.value[0] || null
})

watch(() => props.chapter?.id, () => {
  activeTimelineIndex.value = 0
  timelineFilter.value = 'all'
  activeConflictIndex.value = 0
  conflictFilter.value = 'all'
})

function cardArchiveId(card) {
  const field = card.fields?.find(([key]) => key === '档案编号')
  return field ? field[1] : ''
}

function fieldValue(entry, name) {
  return entry.fields?.find(([key]) => key === name)?.[1] || ''
}

function toneClass(entry) {
  const text = [
    entry.subtitle,
    fieldValue(entry, '类型'),
    ...(entry.tags || [])
  ].join(' ').toLowerCase()
  if (/xenon/.test(text)) return 'tone-xenon'
  if (/khaak|kha'ak/.test(text)) return 'tone-khaak'
  if (/boron/.test(text)) return 'tone-boron'
  if (/terran|ter/.test(text)) return 'tone-terran'
  if (/split|spl/.test(text)) return 'tone-split'
  if (/paranid|par/.test(text)) return 'tone-paranid'
  if (/teladi|tel/.test(text)) return 'tone-teladi'
  if (/argon|arg/.test(text)) return 'tone-argon'
  if (/timeline|时间|纪年|year/.test(text)) return 'tone-time'
  if (/boundary|边界|误区|口径/.test(text)) return 'tone-boundary'
  return 'tone-default'
}

function cardIcon(card) {
  const type = fieldValue(card, '类型') || card.subtitle || ''
  if (/faction|派系|势力/i.test(type)) return '◆'
  if (/setting|设定|边界/i.test(type)) return '◇'
  if (/timeline|时间|纪年/i.test(type)) return '◎'
  if (/scene|战役|惨案|事件/i.test(type)) return '◉'
  return '•'
}

function cardTypeLabel(card) {
  return card.subtitle || fieldValue(card, '类型') || '档案'
}

function timelineEraMeta(key) {
  return timelineEras.find((era) => era.key === key) || timelineEras[0]
}

function selectTimelineItem(item) {
  if (!item) return
  activeTimelineIndex.value = item.index
}

function setTimelineFilter(key) {
  timelineFilter.value = key
  const first = key === 'all'
    ? timelineItems.value[0]
    : timelineItems.value.find((item) => item.era === key)
  selectTimelineItem(first)
}

function conflictClusterMeta(key) {
  const match = conflictClusters.find(([clusterKey]) => clusterKey === key) || conflictClusters[0]
  return {
    key: match[0],
    label: match[1],
    color: match[2],
    hint: match[3]
  }
}

function cleanConflictTitle(title) {
  return String(title || '').replace(/^⚔\s*/, '').replace(/^技术事故[｜|]\s*/, '').trim()
}

function conflictField(text, label) {
  const source = String(text || '').replace(/\s+/g, ' ').trim()
  const labels = ['牵涉势力', '关键词', '正文位置', '一句话说明']
  const next = labels.filter((item) => item !== label).join('|')
  const match = source.match(new RegExp(`${label}\\s*[：:]\\s*(.*?)(?=\\s*(?:${next})\\s*[：:]|$)`))
  return match?.[1]?.trim() || ''
}

function classifyConflict(card) {
  const title = cleanConflictTitle(card.title)
  const head = title.toLowerCase()
  const value = `${title} ${card.summary}`.toLowerCase()
  if (/terran-行星共同体|地球（earth）拒绝|通用人工智能紧张|阿尔德林|地球环毁灭|暗影交易/.test(head)) return 'terran'
  if (/门网关闭|跳跃不稳定|防火带|环轨加速器|普鲁塔克|阿尔比恩|公司/.test(head)) return 'dark'
  if (/paranid 内战|split 内战|贪婪|鳞甲协定|博索塔/.test(head)) return 'modern'
  if (/boron|split|paranid|teladi|kha’ak|kha'ak|索拉拉|希望之歌|总统之末|微光天琴座|最终狂怒/.test(head)) return 'commonwealth'
  if (/xenon|地形改造|agi|机器|黑洞太阳|超级武器|terraformer/.test(value)) return 'machine'
  if (/terran|地球|太阳系|torus|usc|atf|阿尔德林/.test(value)) return 'terran'
  if (/boron|split|paranid|teladi|kha’ak|kha'ak|共同体|索拉拉|希望之歌/.test(value)) return 'commonwealth'
  if (/断门|x 重生|跳跃门关闭/.test(value)) return 'dark'
  return 'modern'
}

function selectConflictItem(item) {
  if (!item) return
  activeConflictIndex.value = item.index
}

function setConflictFilter(key) {
  conflictFilter.value = key
  const first = key === 'all'
    ? conflictItems.value[0]
    : conflictItems.value.find((item) => item.cluster === key)
  selectConflictItem(first)
}

function openLoreShare(entry, type = 'lore_section') {
  if (!entry?.id) return
  window.open(`#/share?type=${type}&id=${encodeURIComponent(entry.id)}`, '_blank', 'noopener')
}
</script>

<template>
  <article
    v-if="chapter"
    class="lore-reader"
    :data-lore-slot="chapter.slotId"
    :data-render-kind="chapter.renderKind"
    :data-component-key="chapter.customComponentKey"
  >
    <header class="lore-reader-head">
      <div class="lore-reader-breadcrumb">
        <span>卷 {{ chapter.volume || '—' }}</span>
        <span class="lore-reader-category">{{ categoryLabel(chapter.category) }}</span>
      </div>
      <h1>{{ chapter.title }}</h1>
      <p v-if="chapter.summary" class="lore-reader-desc">{{ chapter.summary }}</p>
      <div class="lore-reader-metrics">
        <span><b>{{ chapter.sections.length }}</b> 正文小节</span>
        <span><b>{{ chapter.cards.length }}</b> 参考档案</span>
        <span><b>{{ chapter.tags.length }}</b> 标签</span>
      </div>
    </header>

    <section v-if="isTimelineChapter" class="lore-timeline-overview">
      <div class="lore-timeline-head">
        <div>
          <span>TIMELINE SPINE</span>
          <h2>一页先看因果链，再查具体节点</h2>
        </div>
        <p>总年表不是沙盒战局记录，而是把 X 宇宙主要设定事件按时代压缩成可查询的骨架。</p>
      </div>

      <div class="lore-timeline-body">
        <div class="lore-timeline-track" aria-label="X 宇宙主线时间轴">
          <section
            v-for="era in timelineEras"
            :key="era.key"
            class="lore-timeline-era"
            :class="{ muted: timelineFilter !== 'all' && timelineFilter !== era.key }"
            :style="{ '--timeline-era-color': era.color }"
          >
            <header>
              <small>{{ era.key.toUpperCase() }}</small>
              <b>{{ era.label }}</b>
              <span>{{ era.hint }}</span>
            </header>
            <button
              v-for="item in timelineItems.filter((entry) => entry.era === era.key)"
              :id="item.anchor"
              :key="item.id"
              type="button"
              class="lore-timeline-node"
              :class="{ active: activeTimelineItem?.id === item.id }"
              :data-lore-slot="item.slotId"
              :data-render-kind="item.renderKind"
              :data-component-key="item.customComponentKey"
              @click="selectTimelineItem(item)"
            >
              <small>{{ String(item.index + 1).padStart(2, '0') }} / {{ timelineEraMeta(item.era).label }}</small>
              <b>{{ item.title }}</b>
            </button>
          </section>
        </div>

        <aside class="lore-timeline-console">
          <div class="lore-timeline-filters">
            <button type="button" :class="{ active: timelineFilter === 'all' }" @click="setTimelineFilter('all')">全部</button>
            <button
              v-for="era in timelineEras"
              :key="era.key"
              type="button"
              :class="{ active: timelineFilter === era.key }"
              @click="setTimelineFilter(era.key)"
            >
              {{ era.label }}
            </button>
          </div>

          <div class="lore-timeline-scan">
            <div class="lore-timeline-scan-head">
              <span>GATE SPINE</span>
              <b>主线链路扫描</b>
              <span>{{ String((activeTimelineItem?.index ?? 0) + 1).padStart(2, '0') }} / {{ String(timelineItems.length).padStart(2, '0') }}</span>
            </div>
            <div class="lore-timeline-gate-chain" aria-hidden="true">
              <i :class="{ lit: (activeTimelineItem?.index ?? 0) >= 0 }"></i>
              <i :class="{ lit: (activeTimelineItem?.index ?? 0) >= Math.floor(timelineItems.length / 2) }"></i>
              <i :class="{ lit: (activeTimelineItem?.index ?? 0) >= timelineItems.length - 2 }"></i>
            </div>
            <p>{{ activeTimelineItem ? `${activeTimelineItem.title}：${activeTimelineItem.summary}` : '选择一个历史节点，查看它在门网、战争和重连链路中的位置。' }}</p>
          </div>

          <div v-if="activeTimelineItem" class="lore-timeline-detail">
            <small>{{ String(activeTimelineItem.index + 1).padStart(2, '0') }} / {{ timelineEraMeta(activeTimelineItem.era).label }}</small>
            <h3>{{ activeTimelineItem.title }}</h3>
            <p>{{ activeTimelineItem.summary }}</p>
            <dl>
              <div>
                <dt>关键词</dt>
                <dd>{{ activeTimelineItem.keyword }}</dd>
              </div>
              <div>
                <dt>X4 查询意义</dt>
                <dd>{{ activeTimelineItem.meaning }}</dd>
              </div>
            </dl>
            <button type="button" class="lore-entry-share lore-special-share" @click="openLoreShare(activeTimelineItem, 'lore_section')">
              分享该节点
            </button>
          </div>

          <div class="lore-timeline-jumps">
            <button type="button" @click="$emit('jump', 'timeline-event-03')">
              <b>地形改造者</b>
              <small>机器灾厄源头</small>
            </button>
            <button type="button" @click="$emit('jump', 'timeline-event-12')">
              <b>断门时代</b>
              <small>孤岛社会开端</small>
            </button>
          </div>
        </aside>
      </div>

      <p v-if="!visibleTimelineItems.length" class="lore-list-empty">没有匹配的年表节点。</p>
    </section>

    <section v-else-if="isConflictChapter" class="lore-conflict-overview">
      <div class="lore-conflict-head">
        <div>
          <span>CONFLICT RADAR</span>
          <h2>先按冲突来源聚类，再定位具体档案</h2>
        </div>
        <p>本索引只收录能改变历史结构的战争、政治冲突、交通断裂与现代灰色冲突；玩家沙盒战局不写入统一正史。</p>
      </div>

      <div class="lore-conflict-body">
        <div class="lore-conflict-map" aria-label="X 宇宙冲突索引雷达">
          <section
            v-for="cluster in conflictClusters"
            :key="cluster[0]"
            class="lore-conflict-cluster"
            :class="{ muted: conflictFilter !== 'all' && conflictFilter !== cluster[0] }"
            :style="{ '--conflict-cluster-color': cluster[2] }"
          >
            <header>
              <small>{{ cluster[0].toUpperCase() }}</small>
              <b>{{ cluster[1] }}</b>
              <span>{{ cluster[3] }}</span>
            </header>
            <button
              v-for="item in conflictItems.filter((entry) => entry.cluster === cluster[0])"
              :id="`radar-${item.anchor}`"
              :key="item.id"
              type="button"
              class="lore-conflict-node"
              :class="{ active: activeConflictItem?.id === item.id }"
              :data-lore-slot="item.slotId"
              :data-render-kind="item.renderKind"
              :data-component-key="item.customComponentKey"
              @click="selectConflictItem(item)"
            >
              <small>{{ String(item.index + 1).padStart(2, '0') }} / {{ item.clusterName }}</small>
              <b>{{ item.cleanTitle }}</b>
            </button>
          </section>
        </div>

        <aside class="lore-conflict-console">
          <div class="lore-conflict-filters">
            <button type="button" :class="{ active: conflictFilter === 'all' }" @click="setConflictFilter('all')">全部</button>
            <button
              v-for="cluster in conflictClusters"
              :key="cluster[0]"
              type="button"
              :class="{ active: conflictFilter === cluster[0] }"
              @click="setConflictFilter(cluster[0])"
            >
              {{ cluster[1] }}
            </button>
          </div>

          <div v-if="activeConflictItem" class="lore-conflict-detail">
            <small>{{ String(activeConflictItem.index + 1).padStart(2, '0') }} / {{ activeConflictItem.clusterName }}</small>
            <h3>{{ activeConflictItem.cleanTitle }}</h3>
            <p>{{ activeConflictItem.oneLine }}</p>
            <dl>
              <div>
                <dt>牵涉势力</dt>
                <dd>{{ activeConflictItem.actors }}</dd>
              </div>
              <div>
                <dt>关键词</dt>
                <dd>{{ activeConflictItem.keywords }}</dd>
              </div>
              <div>
                <dt>正文位置</dt>
                <dd>{{ activeConflictItem.location }}</dd>
              </div>
            </dl>
            <button type="button" class="lore-conflict-locate" @click="$emit('jump', activeConflictItem.anchor)">
              定位原档案
            </button>
            <button type="button" class="lore-conflict-locate lore-special-share" @click="openLoreShare(activeConflictItem, 'lore_box')">
              分享该冲突
            </button>
          </div>

          <div class="lore-conflict-jumps">
            <button type="button" @click="$emit('jump', 'lore-box-0013')">
              <b>机器战争源头</b>
              <small>第一次地形改造者战争</small>
            </button>
            <button type="button" @click="$emit('jump', 'lore-box-0023')">
              <b>地球线伤口</b>
              <small>地球环与冷战升级</small>
            </button>
          </div>
        </aside>
      </div>

      <p v-if="!visibleConflictItems.length" class="lore-list-empty">没有匹配的冲突档案。</p>
    </section>

    <div v-if="!isTimelineChapter && !isConflictChapter && chapter.sections.length" class="lore-section-list">
      <article
          v-for="(section, index) in chapter.sections"
          :id="section.anchor"
          :key="section.id"
          class="lore-section"
          :class="[toneClass(section), { active: activeAnchor === section.anchor }]"
          :data-lore-slot="section.slotId"
          :data-render-kind="section.renderKind"
          :data-component-key="section.customComponentKey"
        >
        <div class="lore-section-head">
          <span class="lore-section-index">SECTION {{ String(index + 1).padStart(2, '0') }}</span>
          <button type="button" class="lore-entry-share" @click="openLoreShare(section, 'lore_section')">分享</button>
          <h2>{{ section.title }}</h2>
        </div>
        <p v-if="section.summary" class="lore-section-summary">{{ section.summary }}</p>
      </article>
    </div>

    <div v-if="chapter.cards.length" class="lore-card-reference">
      <div class="lore-card-section-head">
        <div>
          <span>ARCHIVE RECORDS</span>
          <h2 class="lore-card-section-title">参考档案</h2>
        </div>
        <p>用于补充正文口径、来源边界与相关设定，不把待核内容混入已确认叙述。</p>
      </div>
      <div class="lore-card-list" :class="{ odd: chapter.cards.length % 2 === 1 }">
        <article
          v-for="card in chapter.cards"
          :id="card.anchor"
          :key="card.id"
          class="lore-reference-card"
          :class="[toneClass(card), { active: activeAnchor === card.anchor }]"
          :data-lore-slot="card.slotId"
          :data-render-kind="card.renderKind"
          :data-component-key="card.customComponentKey"
        >
          <button type="button" class="lore-entry-share lore-card-share" @click="openLoreShare(card, 'lore_box')">分享</button>
          <div
            class="lore-card-inner"
            role="button"
            tabindex="0"
            @click="$emit('jump', card.anchor)"
            @keydown.enter="$emit('jump', card.anchor)"
            @keydown.space.prevent="$emit('jump', card.anchor)"
          >
            <div class="lore-card-mark">
              <span class="lore-card-icon">{{ cardIcon(card) }}</span>
            </div>
            <div class="lore-card-content">
              <div class="lore-card-meta">
                <span class="lore-card-type">{{ cardTypeLabel(card) }}</span>
                <span v-if="cardArchiveId(card)" class="lore-card-archive-id">{{ cardArchiveId(card) }}</span>
              </div>
              <h3>{{ card.title }}</h3>
              <p v-if="card.summary" class="lore-card-summary">{{ card.summary }}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </article>

  <article v-else class="lore-reader lore-empty">
    <div class="lore-empty-inner">
      <span class="lore-empty-label">编年史档案</span>
      <strong>请选择一个章节</strong>
      <p>从左侧目录选取章节，开始阅读 X 宇宙背景资料。</p>
    </div>
  </article>
</template>
