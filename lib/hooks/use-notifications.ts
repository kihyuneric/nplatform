'use client'

import { useApi, useMutation } from './use-api'
import { appStore } from '../stores/app-store'

export function useNotifications() {
  return useApi('/api/v1/notifications', {
    staleTime: 30000,
    onSuccess: (data: any[]) => {
      const unread = Array.isArray(data) ? data.filter((n: any) => !n.is_read).length : 0
      appStore.setState({ unreadNotifications: unread })
    }
  })
}

export function useMarkAsRead() {
  return useMutation(
    async (id: string) => {
      const res = await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read: true }),
      })
      return res.json()
    },
    { invalidateKeys: ['notifications'] }
  )
}
