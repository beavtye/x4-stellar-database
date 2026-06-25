import { computed, reactive, ref, watch } from 'vue'
import { DATASETS, SOURCE_FIELD, SOURCE_TYPE_FIELD, VANILLA_SOURCE, baseRows, headersFor, loadDatasetPayload, rowIdentity } from '../dataIndex'
import { asNumber, compactText, isMissing, optionText } from '../utils/format'
import { fetchPublicModPackages, hasReviewApi } from '../utils/reviewApi'
import { PUBLIC_PACK_SOURCE, VANILLA_SOURCE_ID, normalizeImportedPack, packSourceLabel, packStableKey, publicModItemToPack } from '../utils/modPackages'

const IMPORT_KEY = 'x4_vue_imported_mod_packs'
const THEME_KEY = 'x4_dashboard_theme_mode'
const SOURCE_MODE_KEY = 'x4_vue_source_mode'
const SOURCE_IDS_KEY = 'x4_vue_source_ids'
const FAVORITES_KEY = 'x4_vue_favorites'

export function useDatabase() {
  const dataset = ref('ships')
  const query = ref('')
  const viewMode = ref('table')
  const theme = ref(localStorage.getItem(THEME_KEY) || 'day')
  const sort = reactive({ field: '', dir: 'asc' })
  const filters = reactive({})
  const quickFilterIndex = ref(null)
  const selected = reactive(new Set())
  const favorites = ref(loadFavoriteKeys())
  const favoriteOnly = ref(false)
  const currentRow = ref(null)
  const importedPacks = ref(loadImportedPacks())
  const sourceMode = ref(localStorage.getItem(SOURCE_MODE_KEY) || 'vanilla')
  const selectedSourceIds = ref(loadSelectedSourceIds())
  const publicSync = reactive({ state: 'idle', message: '' })
  const payloads = ref({})
  const loading = ref(false)
  const loadError = ref('')

  const importedRowsByDataset = computed(() => {
    const grouped = {}
    for (const pack of importedPacks.value) {
      for (const [key, rows] of Object.entries(pack.datasets || {})) {
        grouped[key] ||= []
        grouped[key].push(...rows.map((row, index) => ({
          ...row,
          __import_pack_id: pack.id,
          __import_pack_name: pack.packageName,
          __import_mod_id: pack.modId || '',
          __import_pack_source: pack.source || 'local',
          __index: row.__index ?? (payloads.value[key]?.data?.length || 0) + index,
          [SOURCE_FIELD]: pack.packageName,
          [SOURCE_TYPE_FIELD]: 'mod'
        })))
      }
    }
    return grouped
  })

  const currentPayload = computed(() => payloads.value[dataset.value] || null)
  const allRows = computed(() => [...baseRows(dataset.value, currentPayload.value), ...(importedRowsByDataset.value[dataset.value] || [])])
  const rows = computed(() => filterRowsBySource(allRows.value))
  const headers = computed(() => headersFor(dataset.value, importedRowsByDataset.value[dataset.value] || [], currentPayload.value))
  const datasetConfig = computed(() => DATASETS[dataset.value])
  const visibleColumns = ref({})
  const datasetCounts = computed(() => {
    const output = {}
    for (const key of Object.keys(DATASETS)) {
      const base = baseRows(key, payloads.value[key])
      const imported = importedRowsByDataset.value[key] || []
      output[key] = filterRowsBySource([...base, ...imported]).length
    }
    return output
  })

  const sourceOptions = computed(() => {
    const currentBaseCount = baseRows(dataset.value, currentPayload.value).length
    return [
      { id: VANILLA_SOURCE_ID, label: VANILLA_SOURCE, kind: 'vanilla', count: currentBaseCount },
      ...importedPacks.value.map((pack) => ({
        id: pack.id,
        label: packSourceLabel(pack),
        shortLabel: pack.packageName,
        kind: pack.source || 'local',
        count: Array.isArray(pack.datasets?.[dataset.value]) ? pack.datasets[dataset.value].length : 0
      }))
    ]
  })

  const activeColumns = computed(() => {
    const saved = visibleColumns.value[dataset.value]
    if (saved?.length) return saved.filter((field) => headers.value.includes(field))
    return datasetConfig.value.defaultColumns.filter((field) => headers.value.includes(field))
  })

  const filterFields = computed(() => {
    const preferred = ['种族', '势力', '制造种族', '尺寸', '船级/类型', '主要用途', '武器类型', '炮塔类型', '装备类型', '类型', 'Mk']
    return preferred.filter((field) => headers.value.includes(field))
  })

  const quickFilters = computed(() => quickFilterRulesFor(dataset.value).filter((rule) => headers.value.includes(rule.field)))

  const filterOptions = computed(() => {
    const output = {}
    for (const field of filterFields.value) {
      output[field] = [...new Set(rows.value.map((row) => optionText(row[field])).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'))
        .slice(0, 120)
    }
    return output
  })

  const filteredRows = computed(() => {
    const q = query.value.trim().toLowerCase()
    const filterPairs = Object.entries(filters).filter(([, value]) => value)
    const searchFields = headers.value
    let list = rows.value.filter((row) => {
      if (favoriteOnly.value && !favorites.value.has(rowKey(row))) return false
      if (q && !compactText(row, searchFields).includes(q)) return false
      for (const [field, value] of filterPairs) {
        if (optionText(row[field]) !== value) return false
      }
      if (!quickPass(row)) return false
      return true
    })
    if (sort.field) {
      const dir = sort.dir === 'desc' ? -1 : 1
      list = [...list].sort((a, b) => compareValues(a[sort.field], b[sort.field]) * dir)
    }
    return list
  })

  const stats = computed(() => {
    const importedCount = allRows.value.filter((row) => row[SOURCE_TYPE_FIELD] === 'mod').length
    const favoriteCount = rows.value.filter((row) => favorites.value.has(rowKey(row))).length
    return {
      total: rows.value.length,
      filtered: filteredRows.value.length,
      selected: selected.size,
      favorites: favoriteCount,
      imported: importedCount,
      sources: sourceOptions.value.length
    }
  })

  watch(theme, (value) => {
    localStorage.setItem(THEME_KEY, value)
    document.documentElement.dataset.theme = value
  }, { immediate: true })

  watch(dataset, (key) => {
    ensureDataset(key)
  }, { immediate: true })

  watch(sourceMode, (value) => {
    localStorage.setItem(SOURCE_MODE_KEY, value)
  }, { immediate: true })

  watch(selectedSourceIds, (value) => {
    localStorage.setItem(SOURCE_IDS_KEY, JSON.stringify([...value]))
  }, { deep: true })

  watch(importedPacks, () => {
    const validIds = new Set(importedPacks.value.map((pack) => pack.id))
    const kept = [...selectedSourceIds.value].filter((id) => validIds.has(id))
    if (kept.length !== selectedSourceIds.value.size) selectedSourceIds.value = new Set(kept)
  }, { deep: true })

  watch(favorites, (value) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...value]))
  }, { deep: true })

  function switchDataset(key) {
    dataset.value = key
    query.value = ''
    Object.keys(filters).forEach((field) => delete filters[field])
    quickFilterIndex.value = null
    sort.field = ''
    currentRow.value = null
  }

  async function openDatasetRow(key, row) {
    await ensureDataset(key)
    dataset.value = key
    query.value = ''
    Object.keys(filters).forEach((field) => delete filters[field])
    quickFilterIndex.value = null
    sort.field = ''
    currentRow.value = row
  }

  async function ensureDataset(key, options = {}) {
    if (payloads.value[key]) return
    const background = Boolean(options.background)
    if (!background) {
      loading.value = true
      loadError.value = ''
    }
    try {
      const payload = await loadDatasetPayload(key)
      payloads.value = { ...payloads.value, [key]: payload }
    } catch (error) {
      if (!background) loadError.value = error instanceof Error ? error.message : String(error)
    } finally {
      if (!background) loading.value = false
    }
  }

  async function ensureAllDatasets(options = {}) {
    await Promise.all(Object.keys(DATASETS).map((key) => ensureDataset(key, options)))
  }

  function rowsForDataset(key) {
    const base = baseRows(key, payloads.value[key])
    const imported = importedRowsByDataset.value[key] || []
    return filterRowsBySource([...base, ...imported])
  }

  function headersForDataset(key) {
    return headersFor(key, importedRowsByDataset.value[key] || [], payloads.value[key])
  }

  function setSort(field) {
    if (sort.field === field) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'
    else {
      sort.field = field
      sort.dir = 'asc'
    }
  }

  function rowKey(row, key = dataset.value) {
    const source = row[SOURCE_TYPE_FIELD] === 'mod' ? row.__import_pack_id || row[SOURCE_FIELD] || 'mod' : VANILLA_SOURCE_ID
    return `${key}:${source}:${rowIdentity(key, row)}`
  }

  function toggleSelected(row) {
    const key = rowKey(row)
    selected.has(key) ? selected.delete(key) : selected.add(key)
  }

  function isFavorite(row) {
    return favorites.value.has(rowKey(row))
  }

  function toggleFavorite(row) {
    const key = rowKey(row)
    const next = new Set(favorites.value)
    next.has(key) ? next.delete(key) : next.add(key)
    favorites.value = next
  }

  function setFavoriteOnly(value) {
    favoriteOnly.value = Boolean(value)
  }

  function clearSelected() {
    selected.clear()
  }

  function selectVisible() {
    for (const row of filteredRows.value) selected.add(rowKey(row))
  }

  function selectedRowsForCurrentDataset() {
    return rows.value.filter((row) => selected.has(rowKey(row)))
  }

  function setColumns(columns) {
    visibleColumns.value = { ...visibleColumns.value, [dataset.value]: columns }
  }

  function toggleQuickFilter(index) {
    quickFilterIndex.value = quickFilterIndex.value === index ? null : index
  }

  function clearQuickFilter() {
    quickFilterIndex.value = null
  }

  function addImportedPack(pack) {
    const normalized = normalizeImportedPack(pack)
    const stableKey = packStableKey(normalized)
    importedPacks.value = [normalized, ...importedPacks.value.filter((item) => packStableKey(item) !== stableKey && item.id !== normalized.id)]
    saveImportedPacks(importedPacks.value)
  }

  function replacePublicPacks(packs) {
    const normalized = packs.map(normalizeImportedPack)
    importedPacks.value = [
      ...normalized,
      ...importedPacks.value.filter((item) => item.source !== PUBLIC_PACK_SOURCE)
    ]
    saveImportedPacks(importedPacks.value)
  }

  function clearImportedPacks() {
    importedPacks.value = []
    saveImportedPacks([])
  }

  function mergedImportedDatasets() {
    const output = {}
    for (const pack of importedPacks.value) {
      for (const [key, list] of Object.entries(pack.datasets || {})) {
        output[key] ||= []
        output[key].push(...list)
      }
    }
    return output
  }

  function setSourceMode(mode) {
    sourceMode.value = mode
  }

  function toggleSourceId(id) {
    const next = new Set(selectedSourceIds.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedSourceIds.value = next
    if (next.size) sourceMode.value = 'custom'
  }

  async function syncPublicModPackages({ silent = false } = {}) {
    if (!hasReviewApi()) {
      publicSync.state = 'idle'
      publicSync.message = ''
      return []
    }
    if (!silent) publicSync.message = '正在同步公开 mod 数据...'
    publicSync.state = 'loading'
    try {
      const data = await fetchPublicModPackages()
      const items = Array.isArray(data.items) ? data.items : []
      const packs = items.map(publicModItemToPack).filter((pack) => Object.keys(pack.datasets || {}).length)
      replacePublicPacks(packs)
      publicSync.state = 'ok'
      publicSync.message = packs.length ? `已同步 ${packs.length} 个公开 mod 包。` : '当前没有已公开启用的 mod 包。'
      return packs
    } catch (error) {
      publicSync.state = 'error'
      publicSync.message = silent ? '' : `同步失败：${error instanceof Error ? error.message : String(error)}`
      return []
    }
  }

  function filterRowsBySource(list) {
    if (sourceMode.value === 'all') return list
    if (sourceMode.value === 'custom') {
      const ids = selectedSourceIds.value
      return list.filter((row) => row[SOURCE_TYPE_FIELD] === 'mod' && ids.has(row.__import_pack_id))
    }
    return list.filter((row) => row[SOURCE_TYPE_FIELD] !== 'mod')
  }

  function quickPass(row) {
    if (quickFilterIndex.value === null) return true
    const rule = quickFilters.value[quickFilterIndex.value]
    if (!rule) return true
    const value = row[rule.field]
    if (rule.type === 'equals') return optionText(value) === String(rule.value)
    if (rule.type === 'gte') {
      const num = asNumber(value)
      return num !== null && num >= Number(rule.value)
    }
    if (rule.type === 'in') return rule.values.map(String).includes(optionText(value))
    if (rule.type === 'containsAny') return rule.values.some((item) => String(value ?? '').includes(item))
    if (rule.type === 'top') {
      const vals = rows.value
        .map((item) => asNumber(item[rule.field]))
        .filter((num) => num !== null)
        .sort((a, b) => b - a)
      if (!vals.length) return false
      const index = Math.max(0, Math.ceil(vals.length * rule.percent) - 1)
      const threshold = vals[index]
      const current = asNumber(value)
      return current !== null && current >= threshold
    }
    return true
  }

  return {
    DATASETS,
    SOURCE_FIELD,
    VANILLA_SOURCE,
    dataset,
    datasetConfig,
    query,
    viewMode,
    theme,
    sort,
    filters,
    quickFilters,
    quickFilterIndex,
    selected,
    favorites,
    favoriteOnly,
    currentRow,
    importedPacks,
    sourceMode,
    selectedSourceIds,
    sourceOptions,
    publicSync,
    loading,
    loadError,
    allRows,
    rows,
    headers,
    datasetCounts,
    activeColumns,
    filterFields,
    filterOptions,
    filteredRows,
    stats,
    switchDataset,
    openDatasetRow,
    ensureDataset,
    ensureAllDatasets,
    rowsForDataset,
    headersForDataset,
    setSort,
    rowKey,
    toggleSelected,
    isFavorite,
    toggleFavorite,
    setFavoriteOnly,
    clearSelected,
    selectVisible,
    selectedRowsForCurrentDataset,
    setColumns,
    toggleQuickFilter,
    clearQuickFilter,
    addImportedPack,
    replacePublicPacks,
    clearImportedPacks,
    mergedImportedDatasets,
    setSourceMode,
    toggleSourceId,
    syncPublicModPackages
  }
}

function compareValues(a, b) {
  const an = asNumber(a)
  const bn = asNumber(b)
  if (an !== null && bn !== null) return an - bn
  if (isMissing(a) && isMissing(b)) return 0
  if (isMissing(a)) return 1
  if (isMissing(b)) return -1
  return String(a).localeCompare(String(b), 'zh-CN', { numeric: true })
}

function loadImportedPacks() {
  try {
    const data = JSON.parse(localStorage.getItem(IMPORT_KEY) || '[]')
    return Array.isArray(data) ? data.map(normalizeImportedPack) : []
  } catch {
    return []
  }
}

function saveImportedPacks(packs) {
  localStorage.setItem(IMPORT_KEY, JSON.stringify(packs))
}

function quickFilterRulesFor(dataset) {
  const rules = {
    ships: [
      { label: '大型舰 L/XL', type: 'in', field: '尺寸', values: ['L', 'XL'] },
      { label: '战斗舰', type: 'containsAny', field: '主要用途', values: ['战斗', '军用', '驱逐舰', '战列舰'] },
      { label: '贸易船', type: 'containsAny', field: '主要用途', values: ['贸易', '货船'] },
      { label: '采矿船', type: 'containsAny', field: '主要用途', values: ['采矿'] }
    ],
    weapons: [
      { label: '高 DPS', type: 'top', field: '理论 DPS（估算）', percent: 0.2 },
      { label: '远射程', type: 'top', field: '射程（米）', percent: 0.2 },
      { label: 'Mk2', type: 'equals', field: 'Mk', value: 2 },
      { label: '固定武器', type: 'equals', field: '武器类型', value: '固定武器' }
    ],
    turrets: [
      { label: '高 DPS', type: 'top', field: '理论 DPS（估算）', percent: 0.2 },
      { label: '远射程', type: 'top', field: '射程（米）', percent: 0.2 },
      { label: '高转向', type: 'top', field: '转向速度（度/秒）', percent: 0.2 },
      { label: '导弹炮塔', type: 'equals', field: '炮塔类型', value: '导弹炮塔' }
    ],
    equipment: [
      { label: '引擎', type: 'equals', field: '类型', value: '引擎' },
      { label: '护盾', type: 'equals', field: '类型', value: '护盾' },
      { label: '推进器', type: 'equals', field: '类型', value: '推进器' },
      { label: '太空服', type: 'equals', field: '类型', value: '太空服装备' },
      { label: 'Mk3+', type: 'gte', field: 'Mk', value: 3 }
    ]
  }
  return rules[dataset] || []
}

function loadSelectedSourceIds() {
  try {
    const data = JSON.parse(localStorage.getItem(SOURCE_IDS_KEY) || '[]')
    return new Set(Array.isArray(data) ? data : [])
  } catch {
    return new Set()
  }
}

function loadFavoriteKeys() {
  try {
    const data = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
    return new Set(Array.isArray(data) ? data : [])
  } catch {
    return new Set()
  }
}
