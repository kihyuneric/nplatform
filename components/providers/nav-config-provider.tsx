'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { DEFAULT_NAV_CONFIG, type NavConfig, type NavCategory, type NavSubItem } from '@/lib/nav-config'

interface NavConfigContextValue {
  config: NavConfig
  // Get active categories sorted by order
  activeCategories: NavCategory[]
  // Get active items for a category key (top-nav dropdown)
  getActiveItems: (categoryKey: string) => NavSubItem[]
  // Get active page sub-nav items (e.g. exchange tabs)
  getPageSubNav: (pageKey: string) => NavSubItem[]
  // User personal prefs (can hide/reorder their own menu)
  userPrefs: Record<string, boolean>
  setUserPref: (key: string, active: boolean) => void
  // Reload from server
  reload: () => void
}

const NavConfigContext = createContext<NavConfigContextValue>({
  config: DEFAULT_NAV_CONFIG,
  activeCategories: DEFAULT_NAV_CONFIG.categories.filter(c => c.active).sort((a, b) => a.order - b.order),
  getActiveItems: (key) => DEFAULT_NAV_CONFIG.categories.find(c => c.key === key)?.items.filter(i => i.active).sort((a, b) => a.order - b.order) ?? [],
  getPageSubNav: (key) => (DEFAULT_NAV_CONFIG.pageSubNavs?.[key] ?? []).filter(i => i.active).sort((a, b) => a.order - b.order),
  userPrefs: {},
  setUserPref: () => {},
  reload: () => {},
})

const USER_PREFS_KEY = 'npl_user_nav_prefs'

export function NavConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<NavConfig>(DEFAULT_NAV_CONFIG)
  const [userPrefs, setUserPrefs] = useState<Record<string, boolean>>({})

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/nav-config', { cache: 'no-store' })
      if (res.ok) {
        const { data } = await res.json()
        if (data?.categories) setConfig(data)
      }
    } catch { /* use defaults */ }
  }, [])

  useEffect(() => {
    loadConfig()
    try {
      const raw = localStorage.getItem(USER_PREFS_KEY)
      if (raw) setUserPrefs(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [loadConfig])

  // Cross-tab refresh: when admin saves nav config, broadcast via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'npl_nav_config_updated') loadConfig()
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [loadConfig])

  const setUserPref = useCallback((key: string, active: boolean) => {
    setUserPrefs((prev) => {
      const next = { ...prev, [key]: active }
      try { localStorage.setItem(USER_PREFS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const activeCategories = config.categories
    .filter(c => c.active)
    .sort((a, b) => a.order - b.order)

  const getActiveItems = useCallback((categoryKey: string): NavSubItem[] => {
    const cat = config.categories.find(c => c.key === categoryKey)
    if (!cat) return []
    return cat.items
      .filter(i => i.active && userPrefs[i.key] !== false)
      .sort((a, b) => a.order - b.order)
  }, [config, userPrefs])

  const getPageSubNav = useCallback((pageKey: string): NavSubItem[] => {
    const items = config.pageSubNavs?.[pageKey] ?? []
    return items
      .filter(i => i.active && userPrefs[`subnav_${i.key}`] !== false)
      .sort((a, b) => a.order - b.order)
  }, [config, userPrefs])

  return (
    <NavConfigContext.Provider value={{
      config,
      activeCategories,
      getActiveItems,
      getPageSubNav,
      userPrefs,
      setUserPref,
      reload: loadConfig,
    }}>
      {children}
    </NavConfigContext.Provider>
  )
}

export function useNavConfig() {
  return useContext(NavConfigContext)
}
