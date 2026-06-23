import lore from '../data/lore.json'

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
}

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

function buildCategories(chapters) {
  const categories = new Map()
  for (const chapter of chapters) {
    const current = categories.get(chapter.category) || { key: chapter.category, label: categoryLabel(chapter.category), count: 0 }
    current.count += 1
    categories.set(chapter.category, current)
  }
  return [{ key: 'all', label: '全部', count: chapters.length }, ...categories.values()]
}

function categoryLabel(category) {
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
