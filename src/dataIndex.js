import ships from './data/ships.json'
import weapons from './data/weapons.json'
import turrets from './data/turrets.json'
import equipment from './data/equipment.json'

export const SOURCE_FIELD = '__source'
export const SOURCE_TYPE_FIELD = '__source_type'
export const VANILLA_SOURCE = '原版数据'

export const DATASETS = {
  ships: {
    key: 'ships',
    label: '舰船',
    icon: '舰',
    description: '船体、槽位、价格与建造资料',
    nameKey: '中文名',
    subKey: '英文名',
    payload: ships,
    defaultColumns: ['中文名', '英文名', '种族', '势力', '尺寸', '船级/类型', '主要用途', '船体耐久', '货舱容量', '平均价格（Cr）']
  },
  weapons: {
    key: 'weapons',
    label: '武器',
    icon: '武',
    description: '主武器、弹体、射程与生产资料',
    nameKey: '中文名',
    subKey: '英文名',
    payload: weapons,
    defaultColumns: ['中文名', '英文名', '制造种族', '尺寸', 'Mk', '武器类型', '单发伤害', '理论 DPS（估算）', '射程（米）', '平均价格（Cr）']
  },
  turrets: {
    key: 'turrets',
    label: '炮塔',
    icon: '炮',
    description: '炮塔、导弹炮塔、弹体与转向资料',
    nameKey: '中文名',
    subKey: '英文名',
    payload: turrets,
    defaultColumns: ['中文名', '英文名', '制造种族', '尺寸', 'Mk', '炮塔类型', '单发伤害', '理论 DPS（估算）', '射程（米）', '平均价格（Cr）']
  },
  equipment: {
    key: 'equipment',
    label: '装备',
    icon: '装',
    description: '引擎、护盾、软件、消耗品与生产资料',
    nameKey: '中文名',
    subKey: '英文名',
    payload: equipment,
    defaultColumns: ['中文名', '英文名', '装备类型', '制造种族', '尺寸', 'Mk', '平均价格（Cr）', '最低价格（Cr）', '最高价格（Cr）']
  }
}

export function datasetKeys() {
  return Object.keys(DATASETS)
}

export function baseRows(datasetKey) {
  const payload = DATASETS[datasetKey]?.payload
  return (payload?.data || []).map((row, index) => ({
    ...row,
    __index: row.__index ?? index,
    [SOURCE_FIELD]: row[SOURCE_FIELD] || VANILLA_SOURCE,
    [SOURCE_TYPE_FIELD]: row[SOURCE_TYPE_FIELD] || 'vanilla'
  }))
}

export function headersFor(datasetKey, extraRows = []) {
  const base = DATASETS[datasetKey]?.payload?.headers || []
  const seen = new Set(base)
  const headers = [...base]
  for (const row of extraRows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    }
  }
  for (const field of [SOURCE_FIELD, SOURCE_TYPE_FIELD]) {
    if (!seen.has(field)) headers.push(field)
  }
  return headers
}

export function rowIdentity(datasetKey, row) {
  return String(row.__uid || row['ware ID'] || row['船只 macro'] || row['武器 macro'] || row['炮塔 macro'] || row[DATASETS[datasetKey].nameKey] || row.__index)
}
