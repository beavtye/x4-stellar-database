import ships from '../data/ships.json'
import weapons from '../data/weapons.json'
import turrets from '../data/turrets.json'
import equipment from '../data/equipment.json'
import { asNumber, formatValue } from './format'

export const benchmarkTypes = [
  { key: 'weapon_s', group: '武器', label: 'S 武器', dataset: 'weapons', size: 'S', kind: 'weapon', hint: '小型主武器，按弹速与理论 DPS 找火力标杆。' },
  { key: 'weapon_m', group: '武器', label: 'M 武器', dataset: 'weapons', size: 'M', kind: 'weapon', hint: '中型主武器，适合战机/护卫舰武器设计。' },
  { key: 'weapon_l', group: '武器', label: 'L 主炮', dataset: 'weapons', size: 'L', kind: 'weapon', hint: '大型固定武器与主炮，重点看射程、弹速和过热。' },
  { key: 'turret_m', group: '炮塔', label: 'M 炮塔', dataset: 'turrets', size: 'M', kind: 'turret', hint: '中型炮塔，兼看转向速度、弹体与材料成本。' },
  { key: 'turret_l', group: '炮塔', label: 'L 炮塔', dataset: 'turrets', size: 'L', kind: 'turret', hint: '大型炮塔，适合舰船防空/反舰火力对标。' },
  { key: 'ship_s', group: '舰船', label: 'S 舰船', dataset: 'ships', size: 'S', kind: 'ship', hint: '小型舰船，按价格、耐久、槽位和货舱看强度。' },
  { key: 'ship_m', group: '舰船', label: 'M 舰船', dataset: 'ships', size: 'M', kind: 'ship', hint: '中型舰船，适合护卫舰、运输船与特种船对标。' },
  { key: 'ship_l', group: '舰船', label: 'L 舰船', dataset: 'ships', size: 'L', kind: 'ship', hint: '大型舰船，重点看耐久、炮塔槽位、停靠和建造成本。' },
  { key: 'ship_xl', group: '舰船', label: 'XL 舰船', dataset: 'ships', size: 'XL', kind: 'ship', hint: '超大型舰船，适合航母、建造船和巨舰标杆。' },
  { key: 'shield_m', group: '装备', label: 'M 护盾', dataset: 'equipment', size: 'M', kind: 'shield', equipmentType: '护盾', hint: '护盾按容量、恢复、延迟和价格对标。' },
  { key: 'shield_l', group: '装备', label: 'L 护盾', dataset: 'equipment', size: 'L', kind: 'shield', equipmentType: '护盾', hint: '大型护盾，适合主力舰防御数值参考。' },
  { key: 'engine_m', group: '装备', label: 'M 引擎', dataset: 'equipment', size: 'M', kind: 'engine', equipmentType: '引擎', hint: '引擎按前向推力、旅行推力、助推和价格对标。' },
  { key: 'engine_l', group: '装备', label: 'L 引擎', dataset: 'equipment', size: 'L', kind: 'engine', equipmentType: '引擎', hint: '大型引擎，适合 L/XL 舰船机动标杆。' }
]

const payloads = { ships, weapons, turrets, equipment }

export function getBenchmarkType(key) {
  return benchmarkTypes.find((item) => item.key === key) || benchmarkTypes[0]
}

export function rowsForType(typeKey) {
  const type = getBenchmarkType(typeKey)
  const payload = payloads[type.dataset]
  return (payload?.data || [])
    .filter((row) => matchesType(row, type))
    .map((row, index) => normalizeBenchmarkRow(row, type, index))
    .filter((row) => row.chart.x !== null && row.chart.y !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))
}

export function defaultSelectedIds(rows) {
  const usable = rows.filter((row) => row.metrics.power !== null)
  if (!usable.length) return []
  const xMedian = median(usable.map((row) => row.chart.x).filter((value) => value !== null))
  const yMedian = median(usable.map((row) => row.chart.y).filter((value) => value !== null))
  const sane = usable.filter((row) => {
    const xOk = !xMedian || row.chart.x <= xMedian * 6
    const yOk = !yMedian || row.chart.y <= yMedian * 8
    return xOk && yOk
  })
  const sorted = (sane.length >= 4 ? sane : usable).sort((a, b) => a.metrics.power - b.metrics.power)
  return [0.25, 0.5, 0.72, 0.9]
    .map((ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))])
    .filter(Boolean)
    .filter((row, index, list) => list.findIndex((item) => item.id === row.id) === index)
    .map((row) => row.id)
}

export function createDraftFromRow(row, typeKey) {
  const type = getBenchmarkType(typeKey)
  const metrics = row?.metrics || {}
  if (type.kind === 'weapon' || type.kind === 'turret') {
    return {
      name: row?.name ? `${row.name} 改型` : '我的武器设计',
      bodyHull: positive(metrics.bodyHull, type.kind === 'turret' ? 4000 : 10000),
      turnSpeed: positive(metrics.turnSpeed, type.kind === 'turret' ? 40 : 20),
      turnAccel: positive(metrics.turnAccel, type.kind === 'turret' ? 60 : 30),
      overheat: positive(metrics.overheat, 10000),
      coolRate: positive(metrics.coolRate, 1000),
      coolDelay: positive(metrics.coolDelay, 1),
      price: positive(metrics.price, 10000),
      damage: positive(metrics.damage, 100),
      fireRate: positive(metrics.fireRate, deriveRate(metrics)),
      amount: positive(metrics.amount, 1),
      barrels: positive(metrics.barrels, type.kind === 'turret' ? 1 : 1),
      maxHit: positive(metrics.maxHit, 1),
      bulletSpeed: positive(metrics.bulletSpeed, 1000),
      lifetime: positive(metrics.lifetime, 4),
      heat: positive(metrics.heat, 10),
      productionMode: '常规'
    }
  }
  if (type.kind === 'ship') {
    return {
      name: row?.name ? `${row.name} 改型` : '我的舰船设计',
      hull: positive(metrics.hull, 10000),
      cargo: positive(metrics.cargo, 0),
      mainWeapons: positive(metrics.mainWeapons, 0),
      weaponSlots: positive(metrics.weaponSlots, 0),
      turretSlots: positive(metrics.turretSlots, 0),
      shieldSlots: positive(metrics.shieldSlots, 1),
      dockSlots: positive(metrics.dockSlots, 0),
      droneCapacity: positive(metrics.droneCapacity, 0),
      price: positive(metrics.price, 100000),
      productionMode: '常规'
    }
  }
  if (type.kind === 'shield') {
    return {
      name: row?.name ? `${row.name} 改型` : '我的护盾设计',
      capacity: positive(metrics.capacity, 1000),
      regen: positive(metrics.regen, 100),
      delay: positive(metrics.delay, 5),
      price: positive(metrics.price, 10000),
      productionMode: '常规'
    }
  }
  return {
    name: row?.name ? `${row.name} 改型` : '我的引擎设计',
    thrust: positive(metrics.thrust, 1000),
    reverseThrust: positive(metrics.reverseThrust, 500),
    boostDuration: positive(metrics.boostDuration, 5),
    boostRecharge: positive(metrics.boostRecharge, 10),
    travelCharge: positive(metrics.travelCharge, 10),
    travelThrust: positive(metrics.travelThrust, 4000),
    price: positive(metrics.price, 10000),
    productionMode: '常规'
  }
}

export function metricsFromDraft(draft, typeKey) {
  const type = getBenchmarkType(typeKey)
  if (type.kind === 'weapon' || type.kind === 'turret') {
    const damage = positive(draft.damage)
    const fireRate = positive(draft.fireRate)
    const amount = positive(draft.amount, 1)
    const barrels = positive(draft.barrels, 1)
    const maxHit = positive(draft.maxHit, 1)
    const dps = damage * fireRate * amount * barrels * maxHit
    const bulletSpeed = positive(draft.bulletSpeed)
    const lifetime = positive(draft.lifetime)
    return {
      power: round(dps),
      dps: round(dps),
      damage,
      fireRate,
      amount,
      barrels,
      maxHit,
      range: round(bulletSpeed * lifetime),
      bulletSpeed,
      lifetime,
      heat: positive(draft.heat),
      bodyHull: positive(draft.bodyHull),
      turnSpeed: positive(draft.turnSpeed),
      turnAccel: positive(draft.turnAccel),
      overheat: positive(draft.overheat),
      coolRate: positive(draft.coolRate),
      coolDelay: positive(draft.coolDelay),
      price: positive(draft.price)
    }
  }
  if (type.kind === 'ship') {
    const hull = positive(draft.hull)
    const cargo = positive(draft.cargo)
    const slotScore = positive(draft.mainWeapons) * 3 + positive(draft.weaponSlots) * 2 + positive(draft.turretSlots) * 1.8 + positive(draft.shieldSlots) * 1.4 + positive(draft.dockSlots) * 1.2
    return {
      power: round(hull + slotScore * 2500 + cargo * 0.35),
      hull,
      cargo,
      mainWeapons: positive(draft.mainWeapons),
      weaponSlots: positive(draft.weaponSlots),
      turretSlots: positive(draft.turretSlots),
      shieldSlots: positive(draft.shieldSlots),
      dockSlots: positive(draft.dockSlots),
      droneCapacity: positive(draft.droneCapacity),
      price: positive(draft.price)
    }
  }
  if (type.kind === 'shield') {
    const capacity = positive(draft.capacity)
    const regen = positive(draft.regen)
    return {
      power: round(capacity + regen * 8),
      capacity,
      regen,
      delay: positive(draft.delay),
      price: positive(draft.price)
    }
  }
  const thrust = positive(draft.thrust)
  const travelThrust = positive(draft.travelThrust)
  return {
    power: round(thrust + travelThrust * 0.28),
    thrust,
    reverseThrust: positive(draft.reverseThrust),
    boostDuration: positive(draft.boostDuration),
    boostRecharge: positive(draft.boostRecharge),
    travelCharge: positive(draft.travelCharge),
    travelThrust,
    price: positive(draft.price)
  }
}

export function chartConfig(typeKey) {
  const type = getBenchmarkType(typeKey)
  if (type.kind === 'weapon' || type.kind === 'turret') {
    return { xKey: 'bulletSpeed', yKey: 'dps', xLabel: '弹体速度（米/秒）', yLabel: '理论 DPS（估算）' }
  }
  if (type.kind === 'ship') return { xKey: 'price', yKey: 'hull', xLabel: '平均价格（Cr）', yLabel: '船体耐久' }
  if (type.kind === 'shield') return { xKey: 'price', yKey: 'capacity', xLabel: '平均价格（Cr）', yLabel: '护盾容量（MJ）' }
  return { xKey: 'price', yKey: 'thrust', xLabel: '平均价格（Cr）', yLabel: '前向推力' }
}

export function comparableRows(rows, template, customMetrics) {
  const base = template?.metrics?.power || customMetrics.power || 0
  if (!base) return rows.slice(0, 24)
  const filtered = rows.filter((row) => row.metrics.power && row.metrics.power >= base * 0.45 && row.metrics.power <= base * 2.2)
  return (filtered.length >= 4 ? filtered : rows)
    .sort((a, b) => Math.abs((a.metrics.power || 0) - base) - Math.abs((b.metrics.power || 0) - base))
    .slice(0, 28)
}

export function compareValue(custom, reference) {
  if (custom === null || reference === null || reference === 0) return null
  return ((custom - reference) / reference) * 100
}

export function averageMetrics(rows, keys) {
  const output = {}
  for (const key of keys) {
    const values = rows.map((row) => row.metrics[key]).filter((value) => value !== null && Number.isFinite(value))
    output[key] = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  }
  return output
}

export function metricRows(typeKey) {
  const type = getBenchmarkType(typeKey)
  if (type.kind === 'weapon' || type.kind === 'turret') {
    return [
      ['dps', '理论 DPS'],
      ['damage', '单发伤害'],
      ['fireRate', '射速'],
      ['range', '射程'],
      ['bulletSpeed', '弹速'],
      ['lifetime', '寿命'],
      ['price', '平均价格'],
      ['bodyHull', '表面耐久'],
      ['turnSpeed', '转向速度']
    ]
  }
  if (type.kind === 'ship') {
    return [
      ['hull', '船体耐久'],
      ['cargo', '货舱容量'],
      ['mainWeapons', '主武器槽'],
      ['weaponSlots', '武器槽'],
      ['turretSlots', '炮塔槽'],
      ['shieldSlots', '护盾槽'],
      ['dockSlots', '停靠/机库'],
      ['price', '平均价格']
    ]
  }
  if (type.kind === 'shield') {
    return [
      ['capacity', '护盾容量'],
      ['regen', '恢复速度'],
      ['delay', '恢复延迟'],
      ['price', '平均价格']
    ]
  }
  return [
    ['thrust', '前向推力'],
    ['reverseThrust', '反向推力'],
    ['travelThrust', '旅行推力'],
    ['travelCharge', '旅行充能'],
    ['boostDuration', '助推持续'],
    ['boostRecharge', '助推恢复'],
    ['price', '平均价格']
  ]
}

export function materialRecommendation(selectedRows, template, productionMode = '常规') {
  const source = selectedRows.length ? selectedRows : template ? [template] : []
  const materialText = source.map((row) => row.row['建造材料'] || row.row['生产资源']).filter(Boolean)
  const first = materialText[0] || '暂无原版材料数据。'
  return {
    mode: productionMode,
    sourceCount: source.length,
    text: first,
    note: source.length > 1 ? '已按勾选标杆给出首个原版材料模板；后续可扩展为均值/配方混合。' : '建议先照同类原版材料走，再按强度和价格做微调。'
  }
}

export function exportXmlSnippet(typeKey, draft, customMetrics) {
  const type = getBenchmarkType(typeKey)
  const safeName = String(draft.name || 'my_x4_design').trim().replace(/\s+/g, '_')
  if (type.kind === 'weapon' || type.kind === 'turret') {
    return [
      `<properties name="${escapeXml(safeName)}">`,
      `  <bullet speed="${num(customMetrics.bulletSpeed)}" lifetime="${num(customMetrics.lifetime)}" amount="${num(customMetrics.amount)}" barrelamount="${num(customMetrics.barrels)}" maxhit="${num(customMetrics.maxHit)}" />`,
      `  <damage value="${num(customMetrics.damage)}" />`,
      `  <reload rate="${num(customMetrics.fireRate)}" />`,
      `  <heat value="${num(customMetrics.heat)}" overheat="${num(customMetrics.overheat)}" coolrate="${num(customMetrics.coolRate)}" cooldelay="${num(customMetrics.coolDelay)}" />`,
      `  <hull max="${num(customMetrics.bodyHull)}" />`,
      `</properties>`
    ].join('\n')
  }
  if (type.kind === 'ship') {
    return [
      `<ship name="${escapeXml(safeName)}">`,
      `  <hull max="${num(customMetrics.hull)}" />`,
      `  <storage cargo="${num(customMetrics.cargo)}" />`,
      `  <slots weapons="${num(customMetrics.weaponSlots)}" turrets="${num(customMetrics.turretSlots)}" shields="${num(customMetrics.shieldSlots)}" />`,
      `</ship>`
    ].join('\n')
  }
  if (type.kind === 'shield') {
    return [
      `<shield name="${escapeXml(safeName)}">`,
      `  <capacity value="${num(customMetrics.capacity)}" />`,
      `  <recharge rate="${num(customMetrics.regen)}" delay="${num(customMetrics.delay)}" />`,
      `</shield>`
    ].join('\n')
  }
  return [
    `<engine name="${escapeXml(safeName)}">`,
    `  <thrust forward="${num(customMetrics.thrust)}" reverse="${num(customMetrics.reverseThrust)}" />`,
    `  <travel charge="${num(customMetrics.travelCharge)}" thrust="${num(customMetrics.travelThrust)}" />`,
    `</engine>`
  ].join('\n')
}

function normalizeBenchmarkRow(row, type, index) {
  const id = String(row.__uid || row['ware ID'] || row['船只 macro'] || row['武器 macro'] || row['炮塔 macro'] || row['装备 macro'] || index)
  const metrics = metricsFromRow(row, type)
  const config = chartConfig(type.key)
  return {
    id,
    name: String(row['中文名'] || row['英文名'] || id),
    subtitle: [row['英文名'], row['制造种族'] || row['种族'], row['Mk'] && `Mk${row['Mk']}`].filter(Boolean).join(' / '),
    typeLabel: type.label,
    row,
    metrics,
    chart: {
      x: metrics[config.xKey] ?? null,
      y: metrics[config.yKey] ?? null
    }
  }
}

function metricsFromRow(row, type) {
  if (type.kind === 'weapon' || type.kind === 'turret') {
    const damage = firstNumber(row, ['弹体/导弹 单发伤害', '单发伤害'])
    const fireRate = firstNumber(row, ['弹体/导弹 射速（发/秒）', '射速（发/秒）'])
    const amount = firstNumber(row, ['弹体数量']) ?? 1
    const barrels = firstNumber(row, ['炮管数量']) ?? 1
    const maxHit = firstNumber(row, ['最大命中数']) ?? 1
    const fallbackDps = firstNumber(row, ['理论 DPS（估算）', '弹体/导弹 理论 DPS（估算）'])
    const dps = damage !== null && fireRate !== null ? damage * fireRate * amount * barrels * maxHit : fallbackDps
    return {
      power: round(dps),
      dps: round(dps),
      damage,
      fireRate,
      amount,
      barrels,
      maxHit,
      range: firstNumber(row, ['弹体/导弹 射程（米）', '射程（米）']),
      bulletSpeed: firstNumber(row, ['弹体/导弹 速度（米/秒）', '弹体速度（米/秒）']),
      lifetime: firstNumber(row, ['弹体/导弹 寿命（秒）', '弹体寿命（秒）']),
      heat: firstNumber(row, ['弹体/导弹 单发热量', '单发热量']),
      bodyHull: firstNumber(row, ['表面部件耐久']),
      turnSpeed: firstNumber(row, ['转向速度（度/秒）']),
      turnAccel: firstNumber(row, ['转向加速度（度/秒²）']),
      overheat: firstNumber(row, ['过热阈值']),
      coolRate: firstNumber(row, ['散热速度']),
      coolDelay: firstNumber(row, ['散热延迟（秒）']),
      price: firstNumber(row, ['平均价格（Cr）'])
    }
  }
  if (type.kind === 'ship') {
    const hull = firstNumber(row, ['船体耐久'])
    const cargo = firstNumber(row, ['货舱容量'])
    const weaponSlots = sumFields(row, ['主武器槽', 'S 武器槽', 'M 武器槽', 'L 武器槽'])
    const turretSlots = firstNumber(row, ['炮塔槽']) ?? sumFields(row, ['S 炮塔槽', 'M 炮塔槽', 'L 炮塔槽'])
    const shieldSlots = firstNumber(row, ['护盾槽']) ?? sumFields(row, ['S 护盾槽', 'M 护盾槽', 'L 护盾槽', 'XL 护盾槽'])
    const dockSlots = sumFields(row, ['XS 停靠/机库', 'S 停靠/机库', 'M 停靠/机库', 'L 停靠/机库', 'XL 停靠/机库'])
    const slotScore = weaponSlots * 2 + turretSlots * 1.8 + shieldSlots * 1.4 + dockSlots * 1.2
    return {
      power: round((hull || 0) + slotScore * 2500 + (cargo || 0) * 0.35),
      hull,
      cargo,
      mainWeapons: firstNumber(row, ['主武器槽']),
      weaponSlots,
      turretSlots,
      shieldSlots,
      dockSlots,
      droneCapacity: firstNumber(row, ['无人机/单位容量']),
      price: firstNumber(row, ['平均价格（Cr）'])
    }
  }
  if (type.kind === 'shield') {
    const capacity = firstNumber(row, ['护盾容量（MJ）'])
    const regen = firstNumber(row, ['护盾恢复（MW）'])
    return {
      power: round((capacity || 0) + (regen || 0) * 8),
      capacity,
      regen,
      delay: firstNumber(row, ['护盾延迟（秒）']),
      price: firstNumber(row, ['平均价格（Cr）'])
    }
  }
  const thrust = firstNumber(row, ['前向推力'])
  const travelThrust = firstNumber(row, ['旅行模式推力'])
  return {
    power: round((thrust || 0) + (travelThrust || 0) * 0.28),
    thrust,
    reverseThrust: firstNumber(row, ['反向推力']),
    boostDuration: firstNumber(row, ['助推持续（秒）']),
    boostRecharge: firstNumber(row, ['助推恢复（秒）']),
    travelCharge: firstNumber(row, ['旅行模式充能（秒）']),
    travelThrust,
    price: firstNumber(row, ['平均价格（Cr）'])
  }
}

function matchesType(row, type) {
  const size = String(row['尺寸'] || '').toUpperCase()
  if (type.size && size !== type.size) return false
  if (type.equipmentType) return String(row['类型'] || row['装备类型'] || '').includes(type.equipmentType)
  return true
}

function firstNumber(row, fields) {
  for (const field of fields) {
    const n = asNumber(row[field])
    if (n !== null) return n
  }
  return null
}

function sumFields(row, fields) {
  return fields.reduce((sum, field) => sum + (asNumber(row[field]) || 0), 0)
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (!sorted.length) return null
  return sorted[Math.floor(sorted.length / 2)]
}

function deriveRate(metrics) {
  if (metrics.dps && metrics.damage) {
    return metrics.dps / metrics.damage / positive(metrics.amount, 1) / positive(metrics.barrels, 1)
  }
  return 1
}

function positive(value, fallback = 0) {
  const n = asNumber(value)
  if (n === null) return fallback
  return Math.max(0, n)
}

function round(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function num(value) {
  return formatValue(round(positive(value)), '')
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;'
  })[char])
}
