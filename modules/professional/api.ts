const BASE = '/api/v1/professional'

export async function fetchProfessionals(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`${BASE}/list${query}`)
  return res.json()
}

export async function fetchProfessional(id: string) {
  const res = await fetch(`${BASE}/${id}`)
  return res.json()
}

export async function fetchServices(professionalId: string) {
  const res = await fetch(`${BASE}/${professionalId}/services`)
  return res.json()
}

export async function createConsultation(data: { service_id: string; scheduled_at: string; notes?: string }) {
  const res = await fetch(`${BASE}/consultations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  return res.json()
}

export async function fetchConsultations(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`${BASE}/consultations${query}`)
  return res.json()
}

export async function updateConsultationStatus(id: string, status: string) {
  const res = await fetch(`${BASE}/consultations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  return res.json()
}
