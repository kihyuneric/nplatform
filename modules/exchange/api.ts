const BASE = '/api/v1/exchange'

export async function fetchListings(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`${BASE}/listings${query}`)
  return res.json()
}

export async function fetchListing(id: string) {
  const res = await fetch(`${BASE}/listings/${id}`)
  return res.json()
}

export async function createListing(data: any) {
  const res = await fetch(`${BASE}/listings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  return res.json()
}

export async function fetchDeals(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`${BASE}/deals${query}`)
  return res.json()
}

export async function fetchDeal(id: string) {
  const res = await fetch(`${BASE}/deals/${id}`)
  return res.json()
}

export async function createDeal(listingId: string) {
  const res = await fetch(`${BASE}/deals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listing_id: listingId }) })
  return res.json()
}

export async function advanceDealStage(dealId: string, stage: string) {
  const res = await fetch(`${BASE}/deals/${dealId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_stage: stage }) })
  return res.json()
}

export async function submitOffer(dealId: string, amount: number, conditions?: string) {
  const res = await fetch(`${BASE}/deals/${dealId}/offers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, conditions }) })
  return res.json()
}

export async function sendMessage(dealId: string, content: string, type: string = 'TEXT') {
  const res = await fetch(`${BASE}/deals/${dealId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, message_type: type }) })
  return res.json()
}

export async function fetchMessages(dealId: string) {
  const res = await fetch(`${BASE}/deals/${dealId}/messages`)
  return res.json()
}
