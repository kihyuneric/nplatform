"use client"

import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const LANGUAGES = [
  { code: "ko", label: "한국어", flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { code: "en", label: "English", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "ja", label: "\u65E5\u672C\u8A9E", flag: "\uD83C\uDDEF\uD83C\uDDF5" },
]

export function LanguageSelector() {
  const current =
    typeof document !== "undefined"
      ? document.cookie.match(/locale=([^;]+)/)?.[1] || "ko"
      : "ko"

  const setLocale = (code: string) => {
    document.cookie = `locale=${code};path=/;max-age=${60 * 60 * 24 * 365}`
    window.location.reload()
  }

  const currentLang = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Globe className="h-3.5 w-3.5" />
          <span>
            {currentLang.flag} {currentLang.code.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={
              current === lang.code ? "bg-[var(--color-surface-overlay)]" : ""
            }
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
