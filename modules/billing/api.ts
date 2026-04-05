const BASE = '/api/v1/billing'

export async function getPlans() {
  const res = await fetch(`${BASE}/plans`)
  return res.json()
}

export async function getSubscription() {
  const res = await fetch(`${BASE}/subscription`)
  return res.json()
}

export async function subscribe(planId: string, billingCycle: string) {
  const res = await fetch(`${BASE}/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }) })
  return res.json()
}

export async function cancelSubscription() {
  const res = await fetch(`${BASE}/subscription`, { method: 'DELETE' })
  return res.json()
}

export async function getCreditBalance() {
  const res = await fetch('/api/v1/credits/balance')
  return res.json()
}

export async function purchaseCredits(amount: number) {
  const res = await fetch('/api/v1/credits/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) })
  return res.json()
}

export async function getCreditHistory(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`/api/v1/credits/history${query}`)
  return res.json()
}

export async function getInvoices(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`${BASE}/invoices${query}`)
  return res.json()
}
