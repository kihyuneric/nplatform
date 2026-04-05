'use client'

import { useSyncExternalStore, useCallback } from 'react'

// Minimal store implementation (Zustand-like, zero dependencies)
function createStore<T>(initialState: T) {
  let state = initialState
  const listeners = new Set<() => void>()

  const getState = () => state
  const setState = (partial: Partial<T> | ((prev: T) => Partial<T>)) => {
    const next = typeof partial === 'function' ? partial(state) : partial
    state = { ...state, ...next }
    listeners.forEach(l => l())
  }
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function useStore(): T
  function useStore<U>(selector: (state: T) => U): U
  function useStore<U>(selector?: (state: T) => U): T | U {
    const getSnapshot = selector ? () => selector(getState()) : getState
    const getServerSnapshot = selector ? () => selector(initialState) : () => initialState
    return useSyncExternalStore(
      subscribe,
      getSnapshot as () => T,
      getServerSnapshot as () => T
    )
  }

  return { getState, setState, subscribe, useStore }
}

// App-wide store
interface AppState {
  locale: 'ko' | 'en' | 'ja'
  unreadNotifications: number
  compareList: string[] // listing IDs
  recentlyViewed: string[] // listing IDs
  sidebarCollapsed: boolean
}

export const appStore = createStore<AppState>({
  locale: 'ko',
  unreadNotifications: 0,
  compareList: [],
  recentlyViewed: [],
  sidebarCollapsed: false,
})

// Convenience hooks
export const useLocale = () => appStore.useStore(s => s.locale)
export const useUnreadCount = () => appStore.useStore(s => s.unreadNotifications)
export const useCompareList = () => appStore.useStore(s => s.compareList)
export const useRecentlyViewed = () => appStore.useStore(s => s.recentlyViewed)

// Actions
export const setLocale = (locale: AppState['locale']) => appStore.setState({ locale })
export const incrementUnread = () => appStore.setState(s => ({ unreadNotifications: s.unreadNotifications + 1 }))
export const resetUnread = () => appStore.setState({ unreadNotifications: 0 })
export const addToCompare = (id: string) => appStore.setState(s => ({
  compareList: s.compareList.includes(id) ? s.compareList : [...s.compareList, id].slice(-4)
}))
export const removeFromCompare = (id: string) => appStore.setState(s => ({
  compareList: s.compareList.filter(x => x !== id)
}))
export const addRecentlyViewed = (id: string) => appStore.setState(s => ({
  recentlyViewed: [id, ...s.recentlyViewed.filter(x => x !== id)].slice(0, 20)
}))
