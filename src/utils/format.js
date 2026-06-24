export function isMissing(value) {
  if (value === undefined || value === null || value === '' || value === '—') return true
  if (typeof value === 'string' && !value.trim()) return true
  return false
}

export function asNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value ?? '').replace(/,/g, '').trim()
  if (!text || text === '—') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

export function formatValue(value, field = '') {
  if (isMissing(value)) return '—'
  if (isZeroLike(value) && isZeroNoiseField(field)) return '—'
  if (/许可证/.test(field)) return formatCodeList(value, LICENSE_LABELS)
  if (/完整 ware 标签|ware 标签|标签/.test(field)) return formatCodeList(value, TAG_LABELS)
  if (/建造材料|生产资源/.test(field)) return formatMaterials(value)
  if (!/macro|ware ID|component|来源文件|原文/i.test(field) && looksLikeRawCode(value)) return readableIdentifier(value)
  const n = asNumber(value)
  if (n !== null && /(价格|Cr|耐久|容量|射程|伤害|DPS|速度|质量|体积)/i.test(field)) {
    return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(n)
  }
  return String(value)
}

export function isZeroLike(value) {
  if (typeof value === 'number') return value === 0
  return /^0(?:\.0+)?$/.test(String(value ?? '').trim())
}

export function isZeroNoiseField(field = '') {
  return /(槽|炮塔|武器|护盾|引擎|停靠|机库|伤害|范围|弹数|管数|热量|冷却|散布|回复|容量|射速)/.test(field)
}

export function looksLikeRawCode(value) {
  const text = String(value ?? '').trim()
  return /^[a-z0-9]+(?:_[a-z0-9]+){2,}(?:_macro)?$/i.test(text) ||
    /^\{\d+,\s*\d+\}$/.test(text)
}

export function readableIdentifier(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^\{\d+,\s*\d+\}$/.test(raw)) return '未解析文本'
  const cleaned = raw
    .replace(/_macro$/i, '')
    .replace(/^(ship|weapon|turret|shield|engine|storage|wares?)_*/i, '')
  const words = cleaned
    .split(/[_\s-]+/)
    .filter(Boolean)
    .filter((part) => !/^(macro|component|container|solid|liquid|equipment)$/.test(part.toLowerCase()))
  if (!words.length) return raw
  return words.map(formatIdentifierPart).join(' ')
}

export function formatMaterials(value) {
  const text = String(value ?? '').trim()
  if (!text) return '—'
  return text
    .split(/；|;\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^([^:=×x]+)\s*[:=]\s*(\d+(?:\.\d+)?)$/i) || part.match(/^(.+?)\s*[×x]\s*(\d+(?:\.\d+)?)$/i)
      if (!match) return formatCodeList(part, WARE_LABELS)
      return `${wareLabel(match[1])} ×${formatNumber(match[2])}`
    })
    .join('；')
}

export function formatCodeList(value, dictionary = {}) {
  return String(value ?? '')
    .split(/[,;]\s*|\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => dictionary[part.toLowerCase()] || dictionary[part] || readableIdentifier(part))
    .join('、')
}

function formatIdentifierPart(part) {
  const upper = part.toUpperCase()
  if (/^(ARG|ANT|BOR|HAT|HOP|KHA|PAR|PIO|SCA|SPL|TEL|TER|XEN|YAK|XL|L|M|S|XS)$/.test(upper)) return upper
  if (/^MK\d+$/i.test(part)) return upper.replace('MK', 'Mk')
  if (/^\d+$/.test(part)) return part
  return part.slice(0, 1).toUpperCase() + part.slice(1)
}

function wareLabel(value) {
  const raw = String(value || '').trim()
  return WARE_LABELS[raw.toLowerCase()] || readableIdentifier(raw)
}

function formatNumber(value) {
  const n = asNumber(value)
  return n === null ? String(value) : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(n)
}

const LICENSE_LABELS = {
  capitalship: '主力舰船许可证',
  generaluseship: '通用舰船许可证',
  militaryship: '军用舰船许可证',
  generaluseequipment: '通用装备许可证',
  militaryequipment: '军用装备许可证',
  capitalequipment: '主力舰装备许可证',
  stationmodule: '空间站模块许可证'
}

const TAG_LABELS = {
  equipment: '装备',
  turret: '炮塔',
  missilelauncher: '导弹发射器',
  noplayerblueprint: '无玩家蓝图',
  hiddenwithoutlicence: '需许可证显示',
  onlyownerbuild: '仅所属势力建造'
}

const WARE_LABELS = {
  advancedelectronics: '高级电子元件',
  antimattercells: '反物质电池',
  antimatterconverters: '反物质转换器',
  claytronics: '黏土电子',
  computronicsubstrate: '计算基板',
  dronecomponents: '无人机部件',
  energycells: '能量电池',
  engineparts: '引擎部件',
  fieldcoils: '场线圈',
  graphene: '石墨烯',
  hullparts: '船体部件',
  missilecomponents: '导弹部件',
  plasmaconductors: '等离子导体',
  'plasma conductors': '等离子导体',
  quantumtubes: '量子管',
  refinedmetals: '精炼金属',
  scanningarrays: '扫描阵列',
  shieldcomponents: '护盾元件',
  siliconcarbide: '碳化硅',
  siliconwafers: '硅晶圆',
  smartchips: '智能芯片',
  superfluidcoolant: '超流体冷却剂',
  turretcomponents: '炮塔元件',
  weaponcomponents: '武器部件'
}

export function displayName(row, nameKey = '中文名') {
  return String(row?.[nameKey] || row?.中文名 || row?.英文名 || row?.__uid || '未命名条目')
}

export function compactText(row, fields) {
  const searchable = ['搜索别名']
  return [...fields, ...searchable]
    .map((field) => `${field}:${formatValue(row[field], field)}`)
    .join(' ')
    .toLowerCase()
}

const NUMERIC_FIELD_RE = /(价格|Cr|耐久|容量|射程|伤害|DPS|速度|质量|体积|吨位|船员|射速|弹数|管数|热量|冷却|散布|回复|范围|转向|加速度|寿命|AOE)/i

export function isNumericField(field = '') {
  return NUMERIC_FIELD_RE.test(field)
}

export function optionText(value) {
  return String(value ?? '').trim() || '未填写'
}
