import { normalizeDatasets, reportForDatasets } from './importMod'

const MAX_SCAN_FILES = 1200
const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024
const DATA_FILE_RE = /\.(xml|csv|json|txt)$/i
const SKIP_PATH_RE = /(^|\/)(textures|models|animations|sound|video|shader|screenshots?)(\/|$)|\.(dds|gz|ani|xac|xmf|bob|bod|ogg|wav|mp3|png|jpg|jpeg|webp)$/i

export async function parseX4DataFolder(fileList) {
  const files = [...(fileList || [])]
    .filter((file) => shouldScanFile(file))
    .slice(0, MAX_SCAN_FILES)

  if (!files.length) throw new Error('没有找到可识别的数据文件。请选择包含 assets / libraries / t 的 mod 数据文件夹。')

  const texts = new Map()
  const skipped = { large: 0, binary: 0, overflow: Math.max(0, [...(fileList || [])].filter(shouldScanFile).length - MAX_SCAN_FILES) }

  for (const file of files) {
    if (file.size > MAX_TEXT_FILE_BYTES) {
      skipped.large += 1
      continue
    }
    try {
      texts.set(filePath(file), await file.text())
    } catch {
      skipped.binary += 1
    }
  }

  const xmlDocs = readXmlDocs(texts)
  const textMaps = buildTextMaps(xmlDocs)
  const wares = buildWareIndex(xmlDocs, textMaps)
  const macros = buildMacroIndex(xmlDocs, textMaps)
  const bulletMacros = new Map([...macros.values()].filter((macro) => isBulletMacro(macro)).map((macro) => [macro.name, macro]))
  const rows = { ships: [], weapons: [], turrets: [], equipment: [] }

  for (const macro of macros.values()) {
    if (isBulletMacro(macro)) continue
    const ware = findWareForMacro(wares, macro)
    if (isShipMacro(macro)) rows.ships.push(shipRow(macro, ware, textMap))
    else if (isTurretMacro(macro)) rows.turrets.push(turretRow(macro, ware, bulletMacros, textMap))
    else if (isWeaponMacro(macro)) rows.weapons.push(weaponRow(macro, ware, bulletMacros, textMap))
    else if (isEquipmentMacro(macro)) rows.equipment.push(equipmentRow(macro, ware, textMap))
  }

  for (const ware of wares.values()) {
    if (ware.matched) continue
    const dataset = datasetFromWare(ware)
    if (dataset) rows[dataset].push(rowFromWareOnly(ware, dataset))
  }

  const datasets = normalizeDatasets(removeEmptyDatasets(rows))
  const report = reportForDatasets(datasets)
  const warnings = []
  if (skipped.large) warnings.push(`跳过 ${skipped.large} 个超过 ${Math.floor(MAX_TEXT_FILE_BYTES / 1024 / 1024)} MB 的文本文件`)
  if (skipped.binary) warnings.push(`跳过 ${skipped.binary} 个无法读取的文件`)
  if (skipped.overflow) warnings.push(`文件过多，仅扫描前 ${MAX_SCAN_FILES} 个数据文件`)
  if (!report.total) warnings.push('没有识别到舰船、武器、炮塔或装备；请确认选择的是 mod 根目录或包含 assets / libraries / t 的数据文件夹')

  return {
    datasets,
    report,
    warnings,
    scanned: texts.size,
    candidates: files.length
  }
}

function shouldScanFile(file) {
  const path = filePath(file).replace(/\\/g, '/')
  if (SKIP_PATH_RE.test(path)) return false
  return DATA_FILE_RE.test(path)
}

function filePath(file) {
  return file.webkitRelativePath || file.name || ''
}

function readXmlDocs(texts) {
  const parser = new DOMParser()
  const docs = []
  for (const [path, text] of texts.entries()) {
    if (!/\.xml$/i.test(path)) continue
    const doc = parser.parseFromString(text, 'application/xml')
    if (doc.querySelector('parsererror')) continue
    docs.push({ path: path.replace(/\\/g, '/'), doc })
  }
  return docs
}

function buildTextMaps(xmlDocs) {
  const zhRanked = new Map()
  const enRanked = new Map()
  for (const { path, doc } of xmlDocs) {
    if (!/(^|\/)t\//i.test(path)) continue
    const zhPriority = textFilePriority(path, 'zh')
    const enPriority = textFilePriority(path, 'en')
    for (const page of doc.querySelectorAll('page[id]')) {
      const pageId = page.getAttribute('id')
      for (const item of page.querySelectorAll('t[id]')) {
        const key = `${pageId}:${item.getAttribute('id')}`
        const value = textContent(item)
        setRankedText(zhRanked, key, value, zhPriority)
        setRankedText(enRanked, key, value, enPriority)
      }
    }
  }
  return {
    zh: rankedToMap(zhRanked),
    en: rankedToMap(enRanked)
  }
}

function setRankedText(map, key, value, priority) {
  if (!priority || !value) return
  const previous = map.get(key)
  if (!previous || priority > previous.priority) map.set(key, { value, priority })
}

function rankedToMap(ranked) {
  const map = new Map()
  for (const [key, entry] of ranked.entries()) map.set(key, entry.value)
  return map
}

function buildWareIndex(xmlDocs, textMaps) {
  const wares = new Map()
  for (const { doc } of xmlDocs) {
    for (const node of doc.querySelectorAll('ware[id]')) {
      const id = node.getAttribute('id')
      if (!id || wares.has(id)) continue
      const price = first(node, 'price')
      const component = first(node, 'component[ref], component[macro], macro[ref]')
      const ware = {
        id,
        zhName: resolveText(node.getAttribute('name') || node.getAttribute('basename'), textMaps.zh),
        enName: resolveText(node.getAttribute('name') || node.getAttribute('basename'), textMaps.en),
        zhDescription: resolveText(node.getAttribute('description'), textMaps.zh),
        enDescription: resolveText(node.getAttribute('description'), textMaps.en),
        group: node.getAttribute('group') || '',
        tags: node.getAttribute('tags') || '',
        owner: node.getAttribute('owner') || node.getAttribute('race') || '',
        transport: node.getAttribute('transport') || '',
        volume: numberAttr(node, 'volume'),
        minPrice: numberAttr(price, 'min'),
        averagePrice: numberAttr(price, 'average'),
        maxPrice: numberAttr(price, 'max'),
        macro: component?.getAttribute('ref') || component?.getAttribute('macro') || '',
        materials: materialText(node),
        node,
        matched: false
      }
      wares.set(id, ware)
    }
  }
  return wares
}

function buildMacroIndex(xmlDocs, textMaps) {
  const macros = new Map()
  for (const { path, doc } of xmlDocs) {
    for (const node of doc.querySelectorAll('macro[name]')) {
      const name = node.getAttribute('name')
      if (!name || macros.has(name)) continue
      const props = first(node, 'properties')
      const ident = first(node, 'identification')
      const storage = first(node, 'storage')
      const hull = first(node, 'hull')
      const damage = first(node, 'damage')
      const bullet = first(node, 'bullet')
      const ammunition = first(node, 'ammunition')
      const reload = first(node, 'reload')
      const heat = first(node, 'heat')
      const rawName = ident?.getAttribute('name') || ident?.getAttribute('basename')
      const rawDescription = ident?.getAttribute('description')
      macros.set(name, {
        name,
        className: node.getAttribute('class') || '',
        path,
        node,
        props,
        zhName: resolveText(rawName, textMaps.zh),
        enName: resolveText(rawName, textMaps.en),
        zhDescription: resolveText(rawDescription, textMaps.zh),
        enDescription: resolveText(rawDescription, textMaps.en),
        hull: numberAttr(hull, 'max') || numberAttr(props, 'hull'),
        storage: numberAttr(storage, 'cargo') || numberAttr(storage, 'unit') || numberAttr(storage, 'missile'),
        damage: numberAttr(damage, 'value'),
        shieldDamage: numberAttr(damage, 'shield'),
        hullDamage: numberAttr(damage, 'hull'),
        bulletSpeed: numberAttr(bullet, 'speed'),
        bulletLifetime: numberAttr(bullet, 'lifetime'),
        bulletAmount: numberAttr(bullet, 'amount'),
        bulletBarrels: numberAttr(bullet, 'barrelamount'),
        bulletAngle: numberAttr(bullet, 'angle'),
        maxHit: numberAttr(bullet, 'maxhit'),
        reloadRate: numberAttr(reload, 'rate'),
        ammoReload: numberAttr(ammunition, 'reload'),
        heatValue: numberAttr(heat, 'value'),
        heatOverheat: numberAttr(heat, 'overheat'),
        heatCoolDelay: numberAttr(heat, 'cooldelay'),
        heatCoolRate: numberAttr(heat, 'coolrate'),
        connections: [...node.querySelectorAll('connection')],
        bulletRefs: [...node.querySelectorAll('bullet, ammunition, macro')].map((item) => item.getAttribute('ref') || item.getAttribute('macro')).filter(Boolean)
      })
    }
  }
  return macros
}

function findWareForMacro(wares, macro) {
  for (const ware of wares.values()) {
    if (ware.macro === macro.name || ware.id === macro.name || macro.name.includes(ware.id) || ware.id.includes(macro.name.replace(/_macro$/, ''))) {
      ware.matched = true
      return ware
    }
  }
  return null
}

function shipRow(macro, ware) {
  const slots = countShipSlots(macro.connections)
  const fallbackName = readableIdentifier(ware?.id || macro.name)
  return cleanRow({
    __uid: ware?.id || macro.name,
    中文名: bestText(ware?.zhName, macro.zhName, ware?.enName, macro.enName, fallbackName),
    英文名: bestText(ware?.enName, macro.enName, ware?.zhName, macro.zhName, fallbackName),
    种族: raceFromId(ware?.id || macro.name),
    势力: ware?.owner,
    尺寸: sizeFromText(macro.className || macro.name),
    '船级/类型': shipClassLabel(macro.className || macro.name),
    主要用途: purposeFromText(macro.className || macro.name),
    船体耐久: macro.hull,
    货舱容量: macro.storage,
    货物类型: ware?.transport,
    主武器槽: slots.weapons,
    'S 武器槽': slots.sWeapons,
    'M 武器槽': slots.mWeapons,
    'L 武器槽': slots.lWeapons,
    炮塔槽: slots.turrets,
    'S 炮塔槽': slots.sTurrets,
    'M 炮塔槽': slots.mTurrets,
    'L 炮塔槽': slots.lTurrets,
    护盾槽: slots.shields,
    引擎槽: slots.engines,
    '平均价格（Cr）': ware?.averagePrice,
    '最低价格（Cr）': ware?.minPrice,
    '最高价格（Cr）': ware?.maxPrice,
    'ware ID': ware?.id,
    '船只 macro': macro.name,
    建造材料: ware?.materials,
    备注: bestText(macro.zhDescription, ware?.zhDescription, macro.enDescription, ware?.enDescription)
  })
}

function weaponRow(macro, ware, bulletMacros) {
  const bullet = findBullet(macro, bulletMacros)
  const damage = firstNumber(macro.damage, bullet?.damage)
  const rate = firstNumber(macro.reloadRate, macro.ammoReload)
  const fallbackName = readableIdentifier(ware?.id || macro.name)
  return cleanRow({
    __uid: ware?.id || macro.name,
    中文名: bestText(ware?.zhName, macro.zhName, ware?.enName, macro.enName, fallbackName),
    英文名: bestText(ware?.enName, macro.enName, ware?.zhName, macro.zhName, fallbackName),
    制造种族: raceFromId(ware?.id || macro.name),
    尺寸: sizeFromText(macro.className || macro.name),
    武器类型: weaponTypeLabel(macro.className || macro.name),
    Mk: mkFromText(ware?.id || macro.name),
    单发伤害: damage,
    护盾额外伤害: firstNumber(macro.shieldDamage, bullet?.shieldDamage),
    船体额外伤害: firstNumber(macro.hullDamage, bullet?.hullDamage),
    '射速（发/秒）': rate,
    '理论 DPS（估算）': dps(damage, rate, firstNumber(macro.bulletAmount, bullet?.bulletAmount)),
    '射程（米）': range(firstNumber(macro.bulletSpeed, bullet?.bulletSpeed), firstNumber(macro.bulletLifetime, bullet?.bulletLifetime)),
    '弹体速度（米/秒）': firstNumber(macro.bulletSpeed, bullet?.bulletSpeed),
    '弹体寿命（秒）': firstNumber(macro.bulletLifetime, bullet?.bulletLifetime),
    弹数: firstNumber(macro.bulletAmount, bullet?.bulletAmount),
    管数: firstNumber(macro.bulletBarrels, bullet?.bulletBarrels),
    散布角度: firstNumber(macro.bulletAngle, bullet?.bulletAngle),
    '热量/发': macro.heatValue,
    过热容量: macro.heatOverheat,
    '冷却延迟（秒）': macro.heatCoolDelay,
    冷却速度: macro.heatCoolRate,
    '平均价格（Cr）': ware?.averagePrice,
    'ware ID': ware?.id,
    '武器 macro': macro.name,
    '弹体 macro': bullet?.name || macro.bulletRefs[0],
    建造材料: ware?.materials,
    备注: bestText(macro.zhDescription, ware?.zhDescription, macro.enDescription, ware?.enDescription)
  })
}

function turretRow(macro, ware, bulletMacros) {
  const bullet = findBullet(macro, bulletMacros)
  const damage = firstNumber(macro.damage, bullet?.damage)
  const rate = firstNumber(macro.reloadRate, macro.ammoReload)
  const fallbackName = readableIdentifier(ware?.id || macro.name)
  return cleanRow({
    __uid: ware?.id || macro.name,
    中文名: bestText(ware?.zhName, macro.zhName, ware?.enName, macro.enName, fallbackName),
    英文名: bestText(ware?.enName, macro.enName, ware?.zhName, macro.zhName, fallbackName),
    制造种族: raceFromId(ware?.id || macro.name),
    尺寸: sizeFromText(macro.className || macro.name),
    炮塔类型: weaponTypeLabel(macro.className || macro.name),
    Mk: mkFromText(ware?.id || macro.name),
    单发伤害: damage,
    '射速（发/秒）': rate,
    '理论 DPS（估算）': dps(damage, rate, firstNumber(macro.bulletAmount, bullet?.bulletAmount)),
    '射程（米）': range(firstNumber(macro.bulletSpeed, bullet?.bulletSpeed), firstNumber(macro.bulletLifetime, bullet?.bulletLifetime)),
    '弹体速度（米/秒）': firstNumber(macro.bulletSpeed, bullet?.bulletSpeed),
    '弹体寿命（秒）': firstNumber(macro.bulletLifetime, bullet?.bulletLifetime),
    弹数: firstNumber(macro.bulletAmount, bullet?.bulletAmount),
    炮塔耐久: macro.hull,
    '平均价格（Cr）': ware?.averagePrice,
    'ware ID': ware?.id,
    '炮塔 macro': macro.name,
    '弹体 macro': bullet?.name || macro.bulletRefs[0],
    建造材料: ware?.materials,
    备注: bestText(macro.zhDescription, ware?.zhDescription, macro.enDescription, ware?.enDescription)
  })
}

function equipmentRow(macro, ware) {
  const fallbackName = readableIdentifier(ware?.id || macro.name)
  return cleanRow({
    __uid: ware?.id || macro.name,
    中文名: bestText(ware?.zhName, macro.zhName, ware?.enName, macro.enName, fallbackName),
    英文名: bestText(ware?.enName, macro.enName, ware?.zhName, macro.zhName, fallbackName),
    制造种族: raceFromId(ware?.id || macro.name),
    尺寸: sizeFromText(macro.className || macro.name),
    装备类型: equipmentTypeLabel(macro.className || macro.name),
    Mk: mkFromText(ware?.id || macro.name),
    '护盾容量（MJ）': /shield/i.test(macro.className + macro.name) ? macro.hull : '',
    '平均价格（Cr）': ware?.averagePrice,
    '最低价格（Cr）': ware?.minPrice,
    '最高价格（Cr）': ware?.maxPrice,
    'ware ID': ware?.id,
    '装备 macro': macro.name,
    建造材料: ware?.materials,
    备注: bestText(macro.zhDescription, ware?.zhDescription, macro.enDescription, ware?.enDescription)
  })
}

function rowFromWareOnly(ware, dataset) {
  const fallbackName = readableIdentifier(ware.id)
  const base = {
    __uid: ware.id,
    中文名: bestText(ware.zhName, ware.enName, fallbackName),
    英文名: bestText(ware.enName, ware.zhName, fallbackName),
    制造种族: raceFromId(ware.id),
    种族: raceFromId(ware.id),
    尺寸: sizeFromText(ware.id),
    Mk: mkFromText(ware.id),
    '平均价格（Cr）': ware.averagePrice,
    '最低价格（Cr）': ware.minPrice,
    '最高价格（Cr）': ware.maxPrice,
    'ware ID': ware.id,
    建造材料: ware.materials,
    备注: bestText(ware.zhDescription, ware.enDescription)
  }
  if (dataset === 'ships') base['船级/类型'] = shipClassLabel(ware.id)
  if (dataset === 'weapons') base.武器类型 = weaponTypeLabel(ware.id)
  if (dataset === 'turrets') base.炮塔类型 = weaponTypeLabel(ware.id)
  if (dataset === 'equipment') base.装备类型 = equipmentTypeLabel(ware.id)
  return cleanRow(base)
}

function countShipSlots(connections) {
  const slots = { weapons: 0, sWeapons: 0, mWeapons: 0, lWeapons: 0, turrets: 0, sTurrets: 0, mTurrets: 0, lTurrets: 0, shields: 0, engines: 0 }
  for (const conn of connections) {
    const text = `${conn.getAttribute('name') || ''} ${conn.getAttribute('tags') || ''} ${conn.getAttribute('ref') || ''}`.toLowerCase()
    if (/weapon/.test(text)) incrementSlot(slots, 'weapons', text)
    if (/turret/.test(text)) incrementSlot(slots, 'turrets', text)
    if (/shield/.test(text)) slots.shields += 1
    if (/engine/.test(text)) slots.engines += 1
  }
  return slots
}

function incrementSlot(slots, key, text) {
  slots[key] += 1
  if (/\bsmall\b|\bsize_s\b|_s_| s /.test(text)) slots[`s${cap(key)}`] += 1
  else if (/\bmedium\b|\bsize_m\b|_m_| m /.test(text)) slots[`m${cap(key)}`] += 1
  else if (/\blarge\b|\bsize_l\b|_l_| l /.test(text)) slots[`l${cap(key)}`] += 1
}

function cap(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}

function findBullet(macro, bulletMacros) {
  for (const ref of macro.bulletRefs) {
    if (bulletMacros.has(ref)) return bulletMacros.get(ref)
    const normalized = ref.replace(/^macro\./, '')
    if (bulletMacros.has(normalized)) return bulletMacros.get(normalized)
  }
  return null
}

function isShipMacro(macro) {
  return /(^|_)ship(_|$)|^ship_/i.test(`${macro.className} ${macro.name}`) && !/bullet|weapon|turret|storage/i.test(macro.className)
}

function isWeaponMacro(macro) {
  return /weapon/i.test(`${macro.className} ${macro.name}`) && !isTurretMacro(macro)
}

function isTurretMacro(macro) {
  return /turret/i.test(`${macro.className} ${macro.name}`)
}

function isBulletMacro(macro) {
  return /bullet|ammunition|missile/i.test(`${macro.className} ${macro.name}`)
}

function isEquipmentMacro(macro) {
  return /engine|shield|scanner|software|thruster|dock|module/i.test(`${macro.className} ${macro.name}`) && !isShipMacro(macro)
}

function datasetFromWare(ware) {
  const text = `${ware.id} ${ware.group} ${ware.tags} ${ware.macro}`.toLowerCase()
  if (/ship/.test(text)) return 'ships'
  if (/bullet|ammunition|ammo|missilebullet/.test(text)) return 'equipment'
  if (/turret/.test(text)) return 'turrets'
  if (/weapon|missile|laser|cannon|beam/.test(text)) return 'weapons'
  if (/engine|shield|scanner|software|thruster|equipment|drone|satellite/.test(text)) return 'equipment'
  return ''
}

function cleanRow(row) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== '' && value !== null && value !== undefined && value !== 0))
}

function removeEmptyDatasets(rows) {
  return Object.fromEntries(Object.entries(rows).filter(([, list]) => list.length))
}

function textContent(node) {
  return (node?.textContent || '').replace(/\s+/g, ' ').trim()
}

function textFilePriority(path, locale) {
  const normalized = String(path || '').toLowerCase()
  if (locale === 'zh') {
    if (/-l086\.xml$/.test(normalized)) return 100
    if (/-l080\.xml$|-l081\.xml$|-l082\.xml$|-l088\.xml$/.test(normalized)) return 80
    if (/-l044\.xml$|-l049\.xml$/.test(normalized)) return 50
    if (/\/t\/[^/]+\.xml$/.test(normalized) && !/-l\d+\.xml$/.test(normalized)) return 40
    return 10
  }
  if (/\/t\/[^/]+\.xml$/.test(normalized) && !/-l\d+\.xml$/.test(normalized)) return 100
  if (/-l044\.xml$|-l049\.xml$|-l007\.xml$/.test(normalized)) return 90
  if (/-l086\.xml$/.test(normalized)) return 5
  return 20
}

function resolveText(value, textMap, depth = 0) {
  const raw = (value || '').trim()
  if (!raw) return ''
  if (depth > 8) return cleanupResolvedText(raw)
  const ref = raw.match(/^\{(\d+),\s*(\d+)\}$/)
  if (ref) {
    const resolved = textMap.get(`${ref[1]}:${ref[2]}`)
    return resolved ? resolveText(resolved, textMap, depth + 1) : ''
  }
  const resolved = raw.replace(/\{(\d+),\s*(\d+)\}/g, (_, page, id) => {
    const text = textMap.get(`${page}:${id}`)
    return text ? resolveText(text, textMap, depth + 1) : ''
  })
  return cleanupResolvedText(resolved)
}

function cleanupResolvedText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
}

function bestText(...values) {
  return values.find((value) => {
    const text = String(value || '').trim()
    return text && !/\{\d+,\s*\d+\}/.test(text)
  }) || ''
}

function readableIdentifier(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const cleaned = raw
    .replace(/_macro$/i, '')
    .replace(/^ship_*/i, '')
    .replace(/^weapon_*/i, '')
    .replace(/^turret_*/i, '')
    .replace(/^shield_*/i, '')
    .replace(/^engine_*/i, '')
    .replace(/^storage_*/i, '')
    .replace(/^wares?_*/i, '')
  const words = cleaned
    .split(/[_\s-]+/)
    .filter(Boolean)
    .filter((part) => !/^(macro|component|container|solid|liquid)$/.test(part.toLowerCase()))
  if (!words.length) return raw
  return words
    .map((part) => {
      const upper = part.toUpperCase()
      if (/^(ARG|ANT|BOR|HAT|HOP|KHA|PAR|PIO|SCA|SPL|TEL|TER|XEN|YAK|XL|L|M|S|XS|MK\d+)$/.test(upper)) return upper
      if (/^\d+$/.test(part)) return part
      return part.slice(0, 1).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

function first(node, selector) {
  return node?.querySelector(selector) || null
}

function numberAttr(node, attr) {
  const value = node?.getAttribute?.(attr)
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  return Number.isFinite(num) ? num : ''
}

function firstNumber(...values) {
  return values.find((value) => typeof value === 'number' && Number.isFinite(value)) || ''
}

function dps(damage, rate, amount = 1) {
  if (!damage || !rate) return ''
  return Math.round(damage * rate * (amount || 1) * 100) / 100
}

function range(speed, lifetime) {
  if (!speed || !lifetime) return ''
  return Math.round(speed * lifetime)
}

function materialText(node) {
  const items = []
  for (const item of node.querySelectorAll('production ware[ware][amount], production primary ware[ware][amount], production method ware[ware][amount]')) {
    items.push(`${item.getAttribute('ware')}:${item.getAttribute('amount')}`)
  }
  return [...new Set(items)].join('; ')
}

function sizeFromText(text) {
  const lower = String(text || '').toLowerCase()
  if (/(^|_)xs(_|$)|extra.?small/.test(lower)) return 'XS'
  if (/(^|_)xl(_|$)|extra.?large/.test(lower)) return 'XL'
  if (/(^|_)s(_|$)|small/.test(lower)) return 'S'
  if (/(^|_)m(_|$)|medium/.test(lower)) return 'M'
  if (/(^|_)l(_|$)|large/.test(lower)) return 'L'
  return ''
}

function mkFromText(text) {
  const match = String(text || '').match(/mk[_\s-]?(\d+)/i)
  return match ? `Mk${match[1]}` : ''
}

function raceFromId(text) {
  const lower = String(text || '').toLowerCase()
  const pairs = [['arg', 'ARG'], ['par', 'PAR'], ['tel', 'TEL'], ['spl', 'SPL'], ['ter', 'TER'], ['bor', 'BOR'], ['xen', 'XEN'], ['kha', 'KHA'], ['yak', 'YAK']]
  return pairs.find(([key]) => lower.includes(`_${key}_`) || lower.startsWith(`${key}_`) || lower.includes(key))?.[1] || ''
}

function shipClassLabel(text) {
  const lower = String(text || '').toLowerCase()
  if (/carrier/.test(lower)) return '航母'
  if (/destroyer/.test(lower)) return '驱逐舰'
  if (/frigate/.test(lower)) return '护卫舰'
  if (/corvette/.test(lower)) return '轻型护卫舰'
  if (/fighter/.test(lower)) return '战斗机'
  if (/miner/.test(lower)) return '采矿船'
  if (/trader|freighter|transport/.test(lower)) return '货船'
  if (/builder/.test(lower)) return '建造船'
  return ''
}

function purposeFromText(text) {
  const lower = String(text || '').toLowerCase()
  if (/miner/.test(lower)) return '采矿'
  if (/trader|freighter|transport/.test(lower)) return '贸易 / 运输'
  if (/builder/.test(lower)) return '建造'
  if (/fighter|destroyer|carrier|corvette|frigate/.test(lower)) return '战斗'
  return ''
}

function weaponTypeLabel(text) {
  const lower = String(text || '').toLowerCase()
  if (/beam/.test(lower)) return '光束'
  if (/plasma/.test(lower)) return '等离子'
  if (/missile|launcher/.test(lower)) return '导弹'
  if (/flak/.test(lower)) return '防空'
  if (/pulse/.test(lower)) return '脉冲'
  if (/bolt/.test(lower)) return '机炮'
  if (/rail/.test(lower)) return '轨道炮'
  return ''
}

function equipmentTypeLabel(text) {
  const lower = String(text || '').toLowerCase()
  if (/engine|thruster/.test(lower)) return '引擎'
  if (/shield/.test(lower)) return '护盾'
  if (/scanner/.test(lower)) return '扫描器'
  if (/software/.test(lower)) return '软件'
  if (/drone/.test(lower)) return '无人机'
  return '装备'
}
