export function reviewApiBase() {
  return import.meta.env.VITE_REVIEW_API_BASE || ''
}

export async function postModPackage(payload) {
  const res = await fetch(`${reviewApiBase()}/api/mod-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function postProposal(payload) {
  const res = await fetch(`${reviewApiBase()}/api/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchPublicModPackages() {
  const res = await fetch(`${reviewApiBase()}/api/mod-packages`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
