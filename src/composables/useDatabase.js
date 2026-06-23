import { computed, reactive, ref, watch } from 'vue'
import { DATASETS, SOURCE_FIELD, SOURCE_TYPE_FIELD, VANILLA_SOURCE, baseRows, headersFor, loadDatasetPayload, rowIdentity } from '../dataIndex'
import { asNumber, compactText, isMissing, optionText } from '../utils/format'

const IMPORT_KEY = 'x4_vue_imported_mod_packs'
const THEME_KEY = 'x4_dashboard_theme_mode'

export function useDatabase() {
  const dataset = ref('ships')
  const query = ref('')
  const viewMode = ref('table')
  const theme = ref(localStorage.getItem(THEME_KEY) || 'day')
  const sort = reactive({ field: '', dir: 'asc' })
  const filters = reactive({})
  const selected = reactive(new Set())
  const currentRow = ref(null)
  const importedPacks = ref(loadImportedPacks())
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
          __index: row.__index ?? (payloads.value[key]?.data?.length || 0) + index,
          [SOURCE_FIELD]: pack.packageName,
          [SOURCE_TYPE_FIELD]: 'mod'
        })))
      }
    }
    return grouped
  })

  const currentPayload = computed(() => payloads.value[dataset.value] || null)
  const rows = computed(() => [...baseRows(dataset.value, currentPayload.value), ...(importedRowsByDataset.value[dataset.value] || [])])
  const headers = computed(() => headersFor(dataset.value, importedRowsByDataset.value[dataset.value] || [], currentPayload.value))
  const datasetConfig = computed(() => DATASETS[dataset.value])
  const visibleColumns = ref({})
  const datasetCounts = computed(() => {
    const output = {}
    for (const key of Object.keys(DATASETS)) {
      output[key] = (payloads.value[key]?.data?.length || 0) + (importedRowsByDataset.value[key]?.length || 0)
    }
    return output
  })

  const activeColumns = computed(() => {
    const saved = visibleColumns.value[dataset.value]
    if (saved?.length) return saved.filter((field) => headers.value.includes(field))
    return datasetConfig.value.defaultColumns.filter((field) => headers.value.includes(field))
  })

  const filterFields = computed(() => {
    const preferred = ['种族', '势力', '制造种族', '尺寸', '船级/类型', '主要用途', '武器类型', '炮塔类型', '装备类型', 'Mk', SOURCE_FIELD]
    return preferred.filter((field) => headers.value.includes(field))
  })

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
      if (q && !compactText(row, searchFields).includes(q)) return false
      for (const [field, value] of filterPairs) {
        if (optionText(row[field]) !== value) return false
      }
      return true
    })
    if (sort.field) {
      const dir = sort.dir === 'desc' ? -1 : 1
      list = [...list].sort((a, b) => compareValues(a[sort.field], b[sort.field]) * dir)
    }
    return list
  })

  const stats = computed(() => {
    const importedCount = rows.value.filter((row) => row[SOURCE_TYPE_FIELD] === 'mod').length
    return {
      total: rows.value.length,
      filtered: filteredRows.value.length,
      selected: selected.size,
      imported: importedCount
    }
  })

  watch(theme, (value) => {
    localStorage.setItem(THEME_KEY, value)
    document.documentElement.dataset.theme = value
  }, { immediate: true })

  watch(dataset, (key) => {
    ensureDataset(key)
  }, { immediate: true })

  function switchDataset(key) {
    dataset.value = key
    query.value = ''
    Object.keys(filters).forEach((field) => delete filters[field])
    sort.field = ''
    currentRow.value = null
  }

  async function ensureDataset(key) {
    if (payloads.value[key]) return
    loading.value = true
    loadError.value = ''
    try {
      const payload = await loadDatasetPayload(key)
      payloads.value = { ...payloads.value, [key]: payload }
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
  }

  function setSort(field) {
    if (sort.field === field) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'
    else {
      sort.field = field
      sort.dir = 'asc'
    }
  }

  function rowKey(row, key = dataset.value) {
    return `${key}:${rowIdentity(key, row)}`
  }

  function toggleSelected(row) {
    const key = rowKey(row)
    selected.has(key) ? selected.delete(key) : selected.add(key)
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

  function addImportedPack(pack) {
    importedPacks.value = [pack, ...importedPacks.value]
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
    selected,
    currentRow,
    importedPacks,
    loading,
    loadError,
    rows,
    headers,
    datasetCounts,
    activeColumns,
    filterFields,
    filterOptions,
    filteredRows,
    stats,
    switchDataset,
    setSort,
    rowKey,
    toggleSelected,
    clearSelected,
    selectVisible,
    selectedRowsForCurrentDataset,
    setColumns,
    addImportedPack,
    clearImportedPacks,
    mergedImportedDatasets
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
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveImportedPacks(packs) {
  localStorage.setItem(IMPORT_KEY, JSON.stringify(packs))
}
