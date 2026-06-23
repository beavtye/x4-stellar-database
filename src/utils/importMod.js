import { DATASETS } from '../dataIndex'
import { parseCsv } from './csv'

const FIELD_ALIASES = {
  name: '中文名',
  zh: '中文名',
  cn: '中文名',
  english: '英文名',
  en: '英文名',
  id: '__uid',
  uid: '__uid',
  ware: 'ware ID',
  ware_id: 'ware ID',
  macro: 'macro'
}

export function guessDataset(filename, rows) {
  const lower = filename.toLowerCase()
  if (lower.includes('ship')) return 'ships'
  if (lower.includes('weapon')) return 'weapons'
  if (lower.includes('turret')) return 'turrets'
  if (lower.includes('equip')) return 'equipment'
  const keys = Object.keys(rows[0] || {}).join(' ')
  if (/船只|船级|货舱|ship/i.test(keys)) return 'ships'
  if (/炮塔|turret/i.test(keys)) return 'turrets'
  if (/武器|weapon|弹体/i.test(keys)) return 'weapons'
  return 'equipment'
}

export function parseImportPayload(text, filename = 'mod.csv') {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('文件为空')
  if (trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed)
    if (!data.datasets || typeof data.datasets !== 'object') throw new Error('JSON 缺少 datasets 对象')
    return normalizeDatasets(data.datasets)
  }
  if (trimmed.startsWith('[')) {
    const rows = JSON.parse(trimmed)
    const dataset = guessDataset(filename, rows)
    return normalizeDatasets({ [dataset]: rows })
  }
  const rows = parseCsv(trimmed)
  const dataset = guessDataset(filename, rows)
  return normalizeDatasets({ [dataset]: rows })
}

export function normalizeDatasets(datasets) {
  const output = {}
  for (const [dataset, rows] of Object.entries(datasets || {})) {
    if (!DATASETS[dataset] || !Array.isArray(rows)) continue
    output[dataset] = rows.map((row, index) => normalizeRow(row, dataset, index))
  }
  return output
}

export function reportForDatasets(datasets) {
  const counts = {}
  for (const [dataset, rows] of Object.entries(datasets || {})) counts[dataset] = rows.length
  return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0) }
}

export function importTemplateForDataset(dataset) {
  const config = DATASETS[dataset] || DATASETS.ships
  const headers = [...new Set([...(config.payload.headers || []), '__source', '__source_type'])]
  const sample = Object.fromEntries(headers.map((field) => [field, '']))
  sample[config.nameKey] = '示例：填写你的 mod 条目名称'
  sample[config.subKey] = 'Example Mod Entry'
  sample.__source = '示例 mod 包名'
  sample.__source_type = 'mod'
  return { headers, rows: [sample] }
}

export function fullImportExamplePackage() {
  const packName = '示例 mod 数据包'
  return {
    package_name: packName,
    format: 'x4-mod-import-example',
    version: 1,
    note: '下载后复制字段并替换成自己的数据，再通过“选择 CSV / JSON 文件”导入。弹体/子弹参数可直接写在 weapons/turrets 行中；equipment 里也提供了一条可复用弹体模板示例。',
    datasets: {
      ships: [
        {
          __dataset: 'ships',
          中文名: '示例 S 级截击机',
          英文名: 'Example S Interceptor',
          种族: 'ARG',
          势力: '示例作者',
          尺寸: 'S',
          '船级/类型': '战斗机',
          主要用途: '高速截击 / 轻型护航',
          船体耐久: 3200,
          护盾槽: 1,
          主武器槽: 2,
          炮塔槽: 0,
          引擎槽: 1,
          货舱容量: 120,
          '平均价格（Cr）': 185000,
          'ware ID': 'mod_example_ship_s_interceptor_01',
          '船只 macro': 'ship_mod_example_s_interceptor_01_macro',
          建造材料: '船体部件:420; 高级电子元件:38; 护盾元件:26; 引擎部件:32',
          __source: packName,
          __source_type: 'mod'
        },
        {
          __dataset: 'ships',
          中文名: '示例 M 级护卫舰',
          英文名: 'Example M Frigate',
          种族: 'TEL',
          势力: '示例作者',
          尺寸: 'M',
          '船级/类型': '护卫舰',
          主要用途: '巡逻 / 炮塔火力平台',
          船体耐久: 28500,
          护盾槽: 2,
          主武器槽: 2,
          炮塔槽: 4,
          引擎槽: 2,
          'S 停靠/机库': 1,
          货舱容量: 980,
          '平均价格（Cr）': 2650000,
          'ware ID': 'mod_example_ship_m_frigate_01',
          '船只 macro': 'ship_mod_example_m_frigate_01_macro',
          建造材料: '船体部件:2800; 炮塔元件:180; 护盾元件:140; 高级电子元件:260; 引擎部件:170',
          __source: packName,
          __source_type: 'mod'
        }
      ],
      weapons: [
        {
          __dataset: 'weapons',
          中文名: '示例 S 脉冲炮',
          英文名: 'Example S Pulse Cannon',
          制造种族: 'ARG',
          尺寸: 'S',
          武器类型: '脉冲 / 弹道',
          Mk: 'Mk1',
          单发伤害: 220,
          '射速（发/秒）': 4.2,
          '理论 DPS（估算）': 924,
          '射程（米）': 3600,
          '弹体速度（米/秒）': 2800,
          '弹体寿命（秒）': 1.3,
          弹数: 1,
          散布角度: 0.012,
          '热量/发': 7,
          过热容量: 950,
          '冷却延迟（秒）': 0.35,
          冷却速度: 90,
          '平均价格（Cr）': 42000,
          'ware ID': 'mod_example_weapon_s_pulse_01',
          '武器 macro': 'weapon_mod_example_s_pulse_01_macro',
          '弹体 macro': 'bullet_mod_example_s_pulse_01_macro',
          建造材料: '武器部件:64; 高级电子元件:12; 能量单元:80',
          __source: packName,
          __source_type: 'mod'
        },
        {
          __dataset: 'weapons',
          中文名: '示例 M 等离子炮',
          英文名: 'Example M Plasma Cannon',
          制造种族: 'PAR',
          尺寸: 'M',
          武器类型: '等离子 / 高伤低速',
          Mk: 'Mk1',
          单发伤害: 6800,
          '射速（发/秒）': 0.42,
          '理论 DPS（估算）': 2856,
          '射程（米）': 6200,
          '弹体速度（米/秒）': 760,
          '弹体寿命（秒）': 8.2,
          弹数: 1,
          散布角度: 0.018,
          '热量/发': 95,
          过热容量: 1100,
          '冷却延迟（秒）': 0.8,
          冷却速度: 115,
          '平均价格（Cr）': 168000,
          'ware ID': 'mod_example_weapon_m_plasma_01',
          '武器 macro': 'weapon_mod_example_m_plasma_01_macro',
          '弹体 macro': 'bullet_mod_example_m_plasma_01_macro',
          建造材料: '武器部件:210; 等离子导体:36; 高级电子元件:42',
          __source: packName,
          __source_type: 'mod'
        }
      ],
      turrets: [
        {
          __dataset: 'turrets',
          中文名: '示例 M 防空炮塔',
          英文名: 'Example M Flak Turret',
          制造种族: 'ARG',
          尺寸: 'M',
          炮塔类型: '防空 / 溅射',
          Mk: 'Mk1',
          单发伤害: 360,
          '射速（发/秒）': 3.6,
          '理论 DPS（估算）': 1296,
          '射程（米）': 3200,
          '弹体速度（米/秒）': 1800,
          '弹体寿命（秒）': 1.9,
          弹数: 1,
          'AOE 伤害': 120,
          'AOE 范围': 95,
          '转向速度（度/秒）': 96,
          转向加速度: 145,
          炮塔耐久: 620,
          '平均价格（Cr）': 136000,
          'ware ID': 'mod_example_turret_m_flak_01',
          '炮塔 macro': 'turret_mod_example_m_flak_01_macro',
          '弹体 macro': 'bullet_mod_example_m_flak_01_macro',
          建造材料: '炮塔元件:150; 武器部件:82; 高级电子元件:28',
          __source: packName,
          __source_type: 'mod'
        },
        {
          __dataset: 'turrets',
          中文名: '示例 L 等离子炮塔',
          英文名: 'Example L Plasma Turret',
          制造种族: 'PAR',
          尺寸: 'L',
          炮塔类型: '等离子 / 反大型',
          Mk: 'Mk1',
          单发伤害: 14500,
          '射速（发/秒）': 0.22,
          '理论 DPS（估算）': 3190,
          '射程（米）': 8600,
          '弹体速度（米/秒）': 620,
          '弹体寿命（秒）': 13.9,
          弹数: 1,
          '转向速度（度/秒）': 28,
          转向加速度: 44,
          炮塔耐久: 1850,
          '平均价格（Cr）': 620000,
          'ware ID': 'mod_example_turret_l_plasma_01',
          '炮塔 macro': 'turret_mod_example_l_plasma_01_macro',
          '弹体 macro': 'bullet_mod_example_l_plasma_01_macro',
          建造材料: '炮塔元件:620; 等离子导体:105; 高级电子元件:120',
          __source: packName,
          __source_type: 'mod'
        }
      ],
      equipment: [
        {
          __dataset: 'equipment',
          中文名: '示例 M 护盾发生器',
          英文名: 'Example M Shield Generator',
          制造种族: 'TER',
          尺寸: 'M',
          装备类型: '护盾',
          Mk: 'Mk1',
          '护盾容量（MJ）': 7200,
          '护盾回复（MJ/s）': 155,
          '平均价格（Cr）': 245000,
          'ware ID': 'mod_example_shield_m_01',
          '装备 macro': 'shield_mod_example_m_01_macro',
          建造材料: '护盾元件:160; 碳化硅:48; 微格栅:34',
          __source: packName,
          __source_type: 'mod'
        },
        {
          __dataset: 'equipment',
          中文名: '示例弹体参数模板',
          英文名: 'Example Bullet Data Template',
          制造种族: 'GEN',
          尺寸: '通用',
          装备类型: '弹体 / 子弹参数',
          关键参数: '给武器或炮塔引用的弹体数据；也可以把这些字段直接填在 weapons / turrets 行里。',
          单发伤害: 1200,
          护盾额外伤害: 0,
          船体额外伤害: 0,
          '射速（发/秒）': 1.5,
          '射程（米）': 4500,
          '弹体速度（米/秒）': 1400,
          '弹体寿命（秒）': 3.2,
          弹数: 1,
          管数: 1,
          散布角度: 0.01,
          'AOE 伤害': 0,
          'AOE 范围': 0,
          近炸引信: 0,
          '弹体 macro': 'bullet_mod_example_shared_01_macro',
          备注: '如果只做普通武器，优先在 weapons/turrets 行里填写弹体字段；如果要复用同一弹体，可以保留这一类装备行作为说明。',
          __source: packName,
          __source_type: 'mod'
        }
      ]
    }
  }
}

function normalizeRow(row, dataset, index) {
  const clean = {}
  const known = new Set(DATASETS[dataset].payload.headers || [])
  for (const [rawKey, value] of Object.entries(row || {})) {
    const key = canonicalField(rawKey, known)
    if (key) clean[key] = value
  }
  if (!clean.__uid) {
    const base = clean['ware ID'] || clean['英文名'] || clean['中文名'] || `${dataset}_${index + 1}`
    clean.__uid = String(base).trim().replace(/\s+/g, '_').toLowerCase()
  }
  return clean
}

function canonicalField(field, known) {
  const raw = String(field || '').trim()
  if (!raw) return ''
  if (known.has(raw) || raw.startsWith('__')) return raw
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, '_')
  return FIELD_ALIASES[normalized] || raw
}
