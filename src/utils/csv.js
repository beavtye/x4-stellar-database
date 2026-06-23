export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  row.push(cell)
  rows.push(row)
  const [headers = [], ...body] = rows.filter((r) => r.some((c) => String(c).trim() !== ''))
  return body.map((cells) => Object.fromEntries(headers.map((h, i) => [String(h).trim(), normalizeCsvValue(cells[i])])))
}

export function toCsv(rows, columns) {
  const escape = (value) => {
    const text = String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [columns.map(escape).join(','), ...rows.map((row) => columns.map((field) => escape(row[field])).join(','))].join('\n')
}

export function downloadText(filename, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function normalizeCsvValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const n = Number(text.replace(/,/g, ''))
  return Number.isFinite(n) && /^-?\d+(?:\.\d+)?$/.test(text.replace(/,/g, '')) ? n : text
}
