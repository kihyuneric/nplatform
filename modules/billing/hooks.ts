"use client"
import { useState, useEffect } from "react"
import * as api from "./api"
import type { Subscription, CreditBalance, Invoice, SubscriptionPlan } from "./types"

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSubscription()
      .then(d => { setSubscription(d.data || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return { subscription, loading }
}

export function usePlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getPlans()
      .then(d => { setPlans(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return { plans, loading }
}

export function useCreditBalance() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getCreditBalance()
      .then(d => { setBalance(d.data || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return { balance, loading }
}

export function useInvoices(params?: Record<string, string>) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getInvoices(params)
      .then(d => { setInvoices(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [JSON.stringify(params)])

  return { invoices, loading }
}
