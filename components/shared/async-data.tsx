'use client'

import { useState, useEffect, ReactNode } from 'react'

interface AsyncDataProps<T> {
  url: string
  fallbackData?: T
  children: (data: T, loading: boolean) => ReactNode
  skeleton?: ReactNode
}

export function AsyncData<T>({ url, fallbackData, children, skeleton }: AsyncDataProps<T>) {
  const [data, setData] = useState<T | null>(fallbackData ?? null)
  const [loading, setLoading] = useState(!fallbackData)

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setData(d.data ?? d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [url])

  if (loading && skeleton) return <>{skeleton}</>
  if (!data) return null
  return <>{children(data, loading)}</>
}
