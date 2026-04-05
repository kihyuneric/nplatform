"use client"

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from "react"
import { Search, Clock, X, Building2, MapPin, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  getRecentSearches,
  addSearch,
  clearRecentSearches,
  removeSearch,
  type RecentSearchEntry,
} from "@/lib/recent-searches"

// ─── Types ───────────────────────────────────────────────────

interface Suggestion {
  text: string
  type: "listing" | "region" | "institution" | "recent"
}

interface SearchAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSearch: (term: string) => void
  placeholder?: string
  className?: string
}

// ─── Helpers ─────────────────────────────────────────────────

const TYPE_ICONS: Record<Suggestion["type"], typeof Search> = {
  listing: FileText,
  region: MapPin,
  institution: Building2,
  recent: Clock,
}

const TYPE_LABELS: Record<Suggestion["type"], string> = {
  listing: "매물",
  region: "지역",
  institution: "기관",
  recent: "최근",
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700/50 text-inherit rounded-sm px-0">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Component ───────────────────────────────────────────────

export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  placeholder = "채권 검색 (지역, 기관, 담보유형...)",
  className = "",
}: SearchAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches on mount / when dropdown opens
  const refreshRecent = useCallback(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  useEffect(() => {
    refreshRecent()
  }, [refreshRecent])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setSuggestions([])
      setActiveIndex(-1)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/v1/search/suggestions?q=${encodeURIComponent(value.trim())}`
        )
        if (res.ok) {
          const data = await res.json()
          const apiSuggestions: Suggestion[] = (
            data.suggestions as { text: string; type: string }[]
          ).map((s) => ({
            text: s.text,
            type: s.type as Suggestion["type"],
          }))
          setSuggestions(apiSuggestions)
        }
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
        setActiveIndex(-1)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  // Build the visible items list
  const showRecent = !value.trim() && recentSearches.length > 0
  const recentItems: Suggestion[] = showRecent
    ? recentSearches.slice(0, 8).map((r) => ({ text: r.term, type: "recent" as const }))
    : []
  const visibleItems = showRecent ? recentItems : suggestions
  const hasItems = visibleItems.length > 0

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !hasItems) {
      if (e.key === "Enter") {
        handleCommitSearch(value)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((prev) => (prev < visibleItems.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : visibleItems.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < visibleItems.length) {
          handleSelectSuggestion(visibleItems[activeIndex].text)
        } else {
          handleCommitSearch(value)
        }
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  const handleCommitSearch = (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    addSearch(trimmed)
    refreshRecent()
    onSearch(trimmed)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleSelectSuggestion = (text: string) => {
    onChange(text)
    handleCommitSearch(text)
  }

  const handleClearRecent = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  const handleRemoveRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeSearch(term)
    refreshRecent()
  }

  const handleFocus = () => {
    refreshRecent()
    setOpen(true)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-8"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && hasItems}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
          }
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("")
              setSuggestions([])
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="검색어 지우기"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && hasItems && (
        <div
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
          role="listbox"
        >
          {/* Recent searches header */}
          {showRecent && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                최근 검색
              </span>
              <button
                type="button"
                onClick={handleClearRecent}
                className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                검색어 전체 삭제
              </button>
            </div>
          )}

          {/* Loading indicator */}
          {loading && !showRecent && (
            <div className="px-3 py-2 text-xs text-gray-400">검색 중...</div>
          )}

          {/* Suggestion items */}
          {visibleItems.map((item, idx) => {
            const Icon = TYPE_ICONS[item.type]
            const isActive = idx === activeIndex
            return (
              <button
                key={`${item.type}-${item.text}-${idx}`}
                id={`suggestion-${idx}`}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelectSuggestion(item.text)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex items-center w-full px-3 py-2.5 text-sm text-left transition-colors ${
                  isActive
                    ? "bg-gray-100 dark:bg-gray-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <Icon className="w-4 h-4 mr-2.5 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-700 dark:text-gray-200">
                  {highlightMatch(item.text, value)}
                </span>
                {item.type !== "recent" && (
                  <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {TYPE_LABELS[item.type]}
                  </span>
                )}
                {item.type === "recent" && (
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => handleRemoveRecent(item.text, e)}
                    className="ml-2 text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 flex-shrink-0"
                    aria-label={`${item.text} 삭제`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
