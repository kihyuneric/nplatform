'use client'

/**
 * AutoTranslateProvider
 * ─────────────────────────────────────────────
 * 페이지의 모든 한글 텍스트 노드를 훑어서:
 *  1) 정적 사전(STATIC_DICT)에 있으면 즉시 교체
 *  2) 번역 캐시(localStorage)에 있으면 즉시 교체
 *  3) 없으면 Google Translate 백그라운드 호출 후 교체
 *
 * MutationObserver로 동적 추가된 노드도 자동 번역.
 * data-no-translate 속성이 달린 요소/자손은 제외.
 *
 * locale === 'ko'일 때는 아무 작업도 하지 않음.
 */

import { useEffect, useRef } from 'react'
import { getLocale, t, translateText, type Locale } from '@/lib/i18n'

const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/
const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT'])

// 작업 대기열 (Google Translate는 rate-limit 있어서 직렬 처리)
const pendingQueue: Array<() => Promise<void>> = []
let isProcessing = false

async function processQueue() {
  if (isProcessing) return
  isProcessing = true
  while (pendingQueue.length > 0) {
    const task = pendingQueue.shift()
    if (task) {
      try {
        await task()
      } catch {
        // 무시하고 계속
      }
      // 초당 5건 제한
      await new Promise(r => setTimeout(r, 200))
    }
  }
  isProcessing = false
}

function shouldIgnore(el: Element | null): boolean {
  let cur: Element | null = el
  while (cur) {
    if (IGNORED_TAGS.has(cur.tagName)) return true
    if (cur.hasAttribute && cur.hasAttribute('data-no-translate')) return true
    // contenteditable 영역 제외
    if (cur.getAttribute && cur.getAttribute('contenteditable') === 'true') return true
    cur = cur.parentElement
  }
  return false
}

function translateTextNode(node: Text, locale: Locale) {
  const original = node.textContent
  if (!original) return
  if (!HANGUL_RE.test(original)) return
  if (shouldIgnore(node.parentElement)) return

  const trimmed = original.trim()
  if (!trimmed) return

  // 원본 저장 (복원용)
  const saved = (node as any).__npl_original
  if (!saved) {
    ;(node as any).__npl_original = original
  }

  // 즉시 번역 시도 (정적 사전 / 캐시)
  const immediate = t(trimmed, locale)
  if (immediate && immediate !== trimmed) {
    node.textContent = original.replace(trimmed, immediate)
    return
  }

  // 큐에 넣어 비동기 번역
  pendingQueue.push(async () => {
    // 노드가 DOM에서 분리되었으면 skip
    if (!node.isConnected) return
    try {
      const translated = await translateText(trimmed, locale)
      if (translated && translated !== trimmed && node.isConnected) {
        const current = node.textContent || original
        node.textContent = current.replace(trimmed, translated)
      }
    } catch {
      // 무시
    }
  })
  processQueue()
}

function walkAndTranslate(root: Node, locale: Locale) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, locale)
    return
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return
  if (shouldIgnore(root as Element)) return

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const parent = (n as Text).parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (shouldIgnore(parent)) return NodeFilter.FILTER_REJECT
      if (!HANGUL_RE.test(n.textContent || '')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const batch: Text[] = []
  let n = walker.nextNode()
  while (n) {
    batch.push(n as Text)
    n = walker.nextNode()
  }
  batch.forEach(tn => translateTextNode(tn, locale))

  // placeholder/title/aria-label 속성도 번역
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element
    ;['placeholder', 'title', 'aria-label'].forEach(attr => {
      el.querySelectorAll(`[${attr}]`).forEach(e => {
        if (shouldIgnore(e)) return
        const val = e.getAttribute(attr)
        if (!val || !HANGUL_RE.test(val)) return
        const saved = (e as any).__npl_attr_original?.[attr]
        if (!saved) {
          ;(e as any).__npl_attr_original = {
            ...(e as any).__npl_attr_original,
            [attr]: val,
          }
        }
        const immediate = t(val, locale)
        if (immediate && immediate !== val) {
          e.setAttribute(attr, immediate)
        } else {
          pendingQueue.push(async () => {
            if (!e.isConnected) return
            try {
              const translated = await translateText(val, locale)
              if (translated && translated !== val && e.isConnected) {
                e.setAttribute(attr, translated)
              }
            } catch {}
          })
          processQueue()
        }
      })
    })
  }
}

export function AutoTranslateProvider() {
  const observerRef = useRef<MutationObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const locale = getLocale()
    if (locale === 'ko') {
      // 혹시 이전에 번역된 노드가 있으면 복원
      return
    }

    // 초기 DOM 전체 번역
    const runInitial = () => {
      if (!document.body) return
      walkAndTranslate(document.body, locale)
    }

    // 약간의 지연 → 초기 렌더 완료 후 번역
    const initialTimer = setTimeout(runInitial, 100)

    // MutationObserver: 새 DOM 요소 감지
    // Phase L · 모달·드롭다운 등 Radix Portal 도 함께 감지
    //   characterData=true → 텍스트 노드 자체 변경도 감지 (예: {count}건 카운터)
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        // 새로 추가된 노드
        m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            walkAndTranslate(node, locale)
          }
        })
        // 기존 텍스트 노드 변경 (React 리렌더로 텍스트만 바뀐 경우)
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(m.target as Text, locale)
        }
        // 속성 변경 (placeholder/title/aria-label)
        if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
          const el = m.target as Element
          const attr = m.attributeName
          if (attr && ['placeholder', 'title', 'aria-label'].includes(attr)) {
            const val = el.getAttribute(attr)
            if (val && HANGUL_RE.test(val) && !shouldIgnore(el)) {
              const immediate = t(val, locale)
              if (immediate && immediate !== val) {
                el.setAttribute(attr, immediate)
              } else {
                pendingQueue.push(async () => {
                  if (!el.isConnected) return
                  try {
                    const translated = await translateText(val, locale)
                    if (translated && translated !== val && el.isConnected) {
                      el.setAttribute(attr, translated)
                    }
                  } catch {}
                })
                processQueue()
              }
            }
          }
        }
      }
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    })
    observerRef.current = observer

    return () => {
      clearTimeout(initialTimer)
      observer.disconnect()
      observerRef.current = null
    }
  }, [])

  return null
}

export default AutoTranslateProvider
