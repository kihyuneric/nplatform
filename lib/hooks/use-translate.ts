"use client"

/**
 * lib/hooks/use-translate.ts
 *
 * 실제로 동작하는 React 다국어 번역 훅
 * - 정적 사전에서 즉시 반환
 * - 미번역 텍스트는 배경에서 구글 번역 호출
 * - 번역 완료 시 CustomEvent로 알림 → useState 업데이트 → 리렌더
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { t, translateText, getLocale, setLocale, type Locale } from "@/lib/i18n"

const TRANSLATION_EVENT = "npl_translation_ready"

// ─── useT: 단일 텍스트 번역 ───────────────────────────────────
export function useT(text: string): string {
  const [translated, setTranslated] = useState(() => t(text))
  const locale = getLocale()
  const textRef = useRef(text)
  textRef.current = text

  useEffect(() => {
    // locale 변경 / text 변경 시 즉시 재계산
    setTranslated(t(text))

    if (locale === "ko") return

    // 비동기 번역 완료 이벤트 구독
    const handler = (e: Event) => {
      const { key, result } = (e as CustomEvent).detail ?? {}
      const expectedKey = `${locale}:${text.substring(0, 100)}`
      if (key === expectedKey && result) {
        setTranslated(result)
      }
    }
    window.addEventListener(TRANSLATION_EVENT, handler)

    // 백그라운드 번역 시작
    translateText(text, locale).then(result => {
      setTranslated(result)
    })

    return () => window.removeEventListener(TRANSLATION_EVENT, handler)
  }, [text, locale])

  return translated
}

// ─── useTranslation: 다수 텍스트 + locale 관리 ───────────────
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window !== "undefined" ? (getLocale() as Locale) : "ko"
  )
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    // 번역 이벤트 수신 시 전체 재렌더
    const handler = () => forceUpdate(n => n + 1)
    window.addEventListener(TRANSLATION_EVENT, handler)
    return () => window.removeEventListener(TRANSLATION_EVENT, handler)
  }, [])

  const changeLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    setLocale(l)
  }, [])

  const tr = useCallback(
    (text: string | null | undefined): string => {
      if (!text) return ""
      return t(text, locale)
    },
    [locale]
  )

  return { t: tr, locale, setLocale: changeLocale }
}

// ─── useBatchTranslate: 여러 텍스트 일괄 번역 ────────────────
export function useBatchTranslate(texts: string[]): string[] {
  const locale = getLocale()
  const [results, setResults] = useState<string[]>(() =>
    texts.map(text => t(text))
  )

  useEffect(() => {
    setResults(texts.map(text => t(text)))

    if (locale === "ko") return

    // 모든 텍스트 비동기 번역
    Promise.all(texts.map(text => translateText(text, locale))).then(translated => {
      setResults(translated)
    })
  }, [texts.join("|"), locale])  // eslint-disable-line react-hooks/exhaustive-deps

  return results
}
