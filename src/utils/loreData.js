import lore from '../data/lore.json'
import { timelineEvents } from './loreTimeline'

const records = lore.records || []
const chapterRecords = records.filter((record) => record.type === 'lore')
const sectionRecords = records.filter((record) => record.type === 'lore_section')
const boxRecords = records.filter((record) => record.type === 'lore_box')

export const loreChapters = chapterRecords.map(normalizeChapter)
export const loreStats = {
  chapters: loreChapters.length,
  sections: sectionRecords.length,
  cards: boxRecords.length
}
export const loreCategories = buildCategories(loreChapters)

const chapterTitleToId = new Map(loreChapters.map((chapter) => [chapter.title, chapter.id]))

for (const chapter of loreChapters) {
  chapter.sections = sectionRecords
    .filter((record) => chapterTitleToId.get(fieldValue(record, '所属档案')) === chapter.id)
    .map(normalizeSection)
  chapter.cards = boxRecords
    .filter((record) => chapterTitleToId.get(fieldValue(record, '所属档案')) === chapter.id)
    .map(normalizeCard)
  if (chapter.id === 'timeline') {
    chapter.sections = timelineEvents.map((event) => ({
      ...event,
      title: event.title,
      summary: event.summary
    }))
  }
  applyChapterSlots(chapter)
}

export const loreCustomSlots = buildLoreCustomSlots(loreChapters)

export function getLoreChapter(id) {
  if (!id) return loreChapters[0] || null
  const normalizedId = normalizeSearch(id)
  return loreChapters.find((chapter) => {
    return normalizeSearch(chapter.id) === normalizedId ||
      normalizeSearch(chapter.title) === normalizedId ||
      chapter.aliases.some((alias) => normalizeSearch(alias) === normalizedId)
  }) || null
}

export function filterLoreChapters(query = '', category = 'all') {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  return loreChapters.filter((chapter) => {
    if (category !== 'all' && chapter.category !== category) return false
    if (!terms.length) return true
    return terms.every((term) => chapter.searchText.includes(term))
  })
}

export function searchLoreContent(query = '', chapter = null) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  const sourceChapters = chapter ? [chapter] : loreChapters
  return sourceChapters.flatMap((item) => {
    return [...item.sections, ...item.cards]
      .filter((entry) => terms.every((term) => entry.searchText.includes(term)))
      .slice(0, 24)
      .map((entry) => ({
        ...entry,
        chapterId: item.id,
        chapterTitle: item.title
      }))
  }).slice(0, 40)
}

function normalizeChapter(record) {
  const fields = compactFields(record.fields)
  const category = fieldValue(record, '分类') || 'uncategorized'
  const volume = fieldValue(record, '卷号') || ''
  const aliases = toStringList(record.aliases)
  return {
    id: String(record.id),
    title: safeText(record.title, '未命名档案'),
    subtitle: safeText(record.subtitle || record.label, '编年史档案'),
    summary: safeText(record.summary, '暂无摘要。'),
    category,
    volume,
    fields,
    tags: toStringList(record.tags),
    aliases,
    sections: [],
    cards: [],
    searchText: normalizeSearch(record.searchText || [
      record.id,
      record.title,
      record.subtitle,
      record.summary,
      category,
      volume,
      ...aliases,
      ...toStringList(record.tags)
    ].join(' '))
  }
}

function normalizeSection(record) {
  return normalizeEntry(record, '正文小节')
}

function normalizeCard(record) {
  return normalizeEntry(record, fieldValue(record, '类型') || '档案卡')
}

function normalizeEntry(record, fallbackType) {
  const fields = compactFields(record.fields)
  const aliases = toStringList(record.aliases)
  const target = String(record.target || '')
  const anchor = target.includes('#') ? target.slice(target.indexOf('#') + 1) : record.id
  return {
    id: String(record.id),
    anchor,
    title: safeText(record.title, '未命名条目'),
    subtitle: safeText(record.subtitle || record.label || fallbackType, fallbackType),
    summary: safeText(record.summary, '暂无正文。'),
    fields,
    tags: toStringList(record.tags),
    aliases,
    entryType: fallbackType,
    searchText: normalizeSearch(record.searchText || [
      record.id,
      record.title,
      record.subtitle,
      record.summary,
      fallbackType,
      ...aliases,
      ...toStringList(record.tags)
    ].join(' '))
  }
}

function applyChapterSlots(chapter) {
  chapter.slotId = `lore:${chapter.id}:chapter`
  chapter.renderKind = chapter.id === 'timeline'
    ? 'chapter-timeline'
    : chapter.id === 'conflict-index'
      ? 'chapter-conflict-index'
      : 'chapter-standard'
  chapter.customComponentKey = `lore.${chapter.id}.chapter`
  chapter.customizable = true

  chapter.sections = chapter.sections.map((entry, index) => applyEntrySlot(chapter, entry, 'section', index))
  chapter.cards = chapter.cards.map((entry, index) => applyEntrySlot(chapter, entry, 'card', index))
}

function applyEntrySlot(chapter, entry, kind, index) {
  const slotId = `lore:${chapter.id}:${kind}:${entry.id}`
  const renderKind = kind === 'section'
    ? sectionRenderKind(chapter, entry)
    : cardRenderKind(chapter, entry)
  return {
    ...entry,
    slotId,
    slotIndex: index,
    renderKind,
    customComponentKey: `lore.${chapter.id}.${kind}.${entry.id}`,
    parentChapterId: chapter.id,
    customizable: true
  }
}

function sectionRenderKind(chapter, entry) {
  if (chapter.id === 'timeline') return 'timeline-node'
  const text = `${entry.title} ${entry.subtitle} ${entry.summary} ${entry.tags.join(' ')}`.toLowerCase()
  if (/年表|timeline|纪年|阶段/.test(text)) return 'section-timeline'
  if (/冲突|战争|战役|断裂|危机/.test(text)) return 'section-conflict'
  if (/误区|边界|口径|不能/.test(text)) return 'section-boundary'
  return 'section-standard'
}

function cardRenderKind(chapter, entry) {
  if (chapter.id === 'conflict-index') return 'card-conflict-index'
  const type = fieldValue(entry, '类型') || entry.subtitle || ''
  const text = `${entry.title} ${type} ${entry.summary} ${entry.tags.join(' ')}`.toLowerCase()
  if (/入稿摘录|excerpt|摘录/.test(text)) return 'card-excerpt'
  if (/faction|派系|势力/.test(text)) return 'card-faction'
  if (/timeline|时间|纪年|年表/.test(text)) return 'card-timeline'
  if (/boundary|边界|误区|口径|待核/.test(text)) return 'card-boundary'
  if (/conflict|冲突|战争|战役|惨案|危机/.test(text)) return 'card-conflict'
  return 'card-standard'
}

function buildLoreCustomSlots(chapters) {
  return chapters.flatMap((chapter) => [
    {
      slotId: chapter.slotId,
      chapterId: chapter.id,
      entryId: chapter.id,
      entryType: 'chapter',
      renderKind: chapter.renderKind,
      customComponentKey: chapter.customComponentKey,
      title: chapter.title
    },
    ...chapter.sections.map((entry) => slotManifestEntry(chapter, entry, 'section')),
    ...chapter.cards.map((entry) => slotManifestEntry(chapter, entry, 'card'))
  ])
}

function slotManifestEntry(chapter, entry, entryType) {
  return {
    slotId: entry.slotId,
    chapterId: chapter.id,
    entryId: entry.id,
    entryType,
    renderKind: entry.renderKind,
    customComponentKey: entry.customComponentKey,
    title: entry.title,
    anchor: entry.anchor
  }
}

function buildCategories(chapters) {
  const categories = new Map()
  for (const chapter of chapters) {
    const current = categories.get(chapter.category) || { key: chapter.category, label: categoryLabel(chapter.category), count: 0 }
    current.count += 1
    categories.set(chapter.category, current)
  }
  return [{ key: 'all', label: '全部', count: chapters.length }, ...categories.values()]
}

export function categoryLabel(category) {
  const labels = {
    overview: '导读',
    appendix: '附录',
    faction: '派系',
    main: '主线',
    deep: '外章',
    faq: 'FAQ'
  }
  return labels[category] || category
}

function compactFields(fields = []) {
  return fields
    .filter(([key, value]) => key && value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => [String(key), String(value)])
}

function fieldValue(record, fieldName) {
  return (record.fields || []).find(([key]) => key === fieldName)?.[1] || ''
}

function toStringList(values) {
  return Array.isArray(values) ? values.filter(Boolean).map(String) : []
}

function safeText(value, fallback) {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeSearch(value) {
  return String(value ?? '').trim().toLowerCase()
}
