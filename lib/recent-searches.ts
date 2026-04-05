// ============================================================
// Recent Searches Manager
// Persists recent search terms in localStorage
// ============================================================

const STORAGE_KEY = "npl_recent_searches"
const MAX_ENTRIES = 10

export interface RecentSearchEntry {
  term: string
  timestamp: number
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

export function getRecentSearches(): RecentSearchEntry[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e: unknown): e is RecentSearchEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as RecentSearchEntry).term === "string" &&
          typeof (e as RecentSearchEntry).timestamp === "number"
      )
      .sort((a: RecentSearchEntry, b: RecentSearchEntry) => b.timestamp - a.timestamp)
      .slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

export function addSearch(term: string): void {
  if (!isBrowser()) return
  const trimmed = term.trim()
  if (!trimmed) return

  const existing = getRecentSearches().filter((e) => e.term !== trimmed)
  const updated: RecentSearchEntry[] = [
    { term: trimmed, timestamp: Date.now() },
    ...existing,
  ].slice(0, MAX_ENTRIES)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

export function removeSearch(term: string): void {
  if (!isBrowser()) return
  const updated = getRecentSearches().filter((e) => e.term !== term)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export function clearRecentSearches(): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
