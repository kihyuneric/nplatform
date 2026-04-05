"use client"
import { useState, useEffect } from "react"
import * as api from "./api"
import type { Professional, ProfessionalService, Consultation } from "./types"

export function useProfessionals(params?: Record<string, string>) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.fetchProfessionals(params)
      .then(d => { setProfessionals(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [JSON.stringify(params)])

  return { professionals, loading }
}

export function useServices(professionalId: string) {
  const [services, setServices] = useState<ProfessionalService[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!professionalId) return
    api.fetchServices(professionalId)
      .then(d => { setServices(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [professionalId])

  return { services, loading }
}

export function useConsultations(params?: Record<string, string>) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.fetchConsultations(params)
      .then(d => { setConsultations(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [JSON.stringify(params)])

  return { consultations, loading }
}
