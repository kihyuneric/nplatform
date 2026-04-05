"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useRealtimeListings() {
  const [newListingCount, setNewListingCount] = useState(0)

  useEffect(() => {
    try {
      const supabase = createClient()
      const channel = supabase
        .channel('new-listings')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_listings',
          filter: 'status=eq.OPEN',
        }, () => {
          setNewListingCount(c => c + 1)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } catch {}
  }, [])

  return { newListingCount, resetCount: () => setNewListingCount(0) }
}

export function useListingInterest(listingId: string) {
  const [interestedCount, setInterestedCount] = useState(0)

  useEffect(() => {
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`listing-interest-${listingId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'deals',
          filter: `listing_id=eq.${listingId}`,
        }, () => {
          setInterestedCount(c => c + 1)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } catch {}
  }, [listingId])

  return interestedCount
}
