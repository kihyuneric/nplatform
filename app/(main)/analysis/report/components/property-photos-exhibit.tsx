'use client'
/**
 * PropertyPhotosExhibit
 *
 * 매물 등록 / 자발적 경매 등록 시 첨부된 현장 사진을 NPL 분석 보고서에 노출.
 *
 * 사용자 정책 (2026-05-05):
 *   · 사진 있을 때만 렌더링 (없으면 return null — 양식 변경 없음)
 *   · NPL Valuation / XRF Valuation 모두 동일 사진 노출 (보고서 상단)
 *   · 카드 형태 노출은 선택 — 사진이 있는 경우 별도 EXHIBIT 박스로 표시
 *   · 딜룸 현장 사진 (asset-detail-view.tsx) 과 동일 데이터 source (listing.images / site_photos)
 *
 * 이미지 source 우선순위:
 *   1. images: string[] (URL 배열) — 실제 이미지 url 또는 placeholder label
 *   2. 빈 경우 — return null (보고서 양식 변경 없음)
 */
import { useState } from 'react'
import { ImageIcon, X } from 'lucide-react'

interface PropertyPhotosExhibitProps {
  /** 매물 사진 URL 배열 — 비어있거나 undefined 면 컴포넌트 렌더링 안 함 */
  images?: readonly string[] | null
  /** 매물 제목 (alt 텍스트) */
  assetTitle?: string
}

const MCK = {
  brass: '#B7892C',
  cobalt: '#2251FF',
  navy: '#0A1628',
  navyDark: '#051C2C',
  navyMid: '#1B3A5C',
  border: '#E5E8EC',
  bgSoft: '#F5F7FA',
  textSub: '#6B7280',
  textTertiary: '#9CA3AF',
}

export function PropertyPhotosExhibit({ images, assetTitle }: PropertyPhotosExhibitProps) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  // ⚠ 사진이 없으면 컴포넌트 자체를 렌더링하지 않음 (사용자 정책 정합)
  const list = (images ?? []).filter(Boolean)
  if (list.length === 0) return null

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', marginBottom: 32 }} className="property-photos-section">
      {/* McKinsey-style Section header (eyebrow + title + cobalt rule) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: MCK.brass,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          EXHIBIT · 현장 사진
        </div>
        <div style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 18,
          fontWeight: 700,
          color: MCK.navy,
          letterSpacing: '-0.005em',
          lineHeight: 1.2,
          marginBottom: 8,
        }}>
          PROPERTY PHOTOGRAPHS · {list.length}장
        </div>
        <div style={{ height: 1, background: MCK.cobalt, width: 40, marginBottom: 8 }} />
        <div style={{ fontSize: 12.5, color: '#4B5563', lineHeight: 1.55, marginTop: 6 }}>
          매물 등록 / 자발적 경매 등록 시 첨부된 현장 사진 — 클릭 시 확대 (라이트박스).
          {assetTitle && ` 매물: ${assetTitle}`}
        </div>
      </div>

      {/* 사진 grid — 4열 (모바일 2열) */}
      <div
        className="photos-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {list.map((src, i) => {
          const isUrl = typeof src === 'string' && (src.startsWith('http') || src.startsWith('/'))
          return (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(i)}
              title={`사진 ${i + 1} 확대`}
              style={{
                position: 'relative',
                aspectRatio: '4 / 3',
                background: MCK.bgSoft,
                border: `1px solid ${MCK.border}`,
                borderTop: `2px solid ${MCK.cobalt}`,
                cursor: 'pointer',
                overflow: 'hidden',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(10, 22, 40, 0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {isUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={`${assetTitle ?? '매물'} 현장 사진 ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: MCK.textTertiary }}>
                  <ImageIcon size={28} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{src}</span>
                </div>
              )}
              {/* 사진 인덱스 라벨 (좌하단) */}
              <span style={{
                position: 'absolute',
                bottom: 6,
                left: 8,
                fontSize: 10,
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'rgba(10, 22, 40, 0.75)',
                padding: '2px 6px',
                borderRadius: 2,
                letterSpacing: '0.06em',
              }}>
                {String(i + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 10, color: MCK.textTertiary, marginTop: 8, fontStyle: 'italic' }}>
        ⓘ 현장 사진은 매도자가 매물 등록 시 첨부 (L2 이상 NDA 동의 후 열람) · 딜룸-딜룸 현장사진 모듈과 동일 source.
      </div>

      {/* 라이트박스 (확대 보기) */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)' }}
          onClick={() => setLightbox(null)}
        >
          <div
            style={{ position: 'relative', width: 'min(92vw, 1080px)', maxHeight: '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="닫기"
              style={{
                position: 'absolute',
                top: -44,
                right: 0,
                color: '#FFFFFF',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 14, fontWeight: 600,
              }}
            >
              <X size={20} /> 닫기
            </button>
            {(() => {
              const src = list[lightbox]
              const isUrl = typeof src === 'string' && (src.startsWith('http') || src.startsWith('/'))
              return isUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={`${assetTitle ?? '매물'} 현장 사진 ${lightbox + 1} (확대)`}
                  style={{ width: '100%', maxHeight: '88vh', objectFit: 'contain', background: '#0A1628', border: `1px solid ${MCK.cobalt}` }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '60vh',
                  background: '#0A1628',
                  border: `1px solid ${MCK.cobalt}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', gap: 12,
                }}>
                  <ImageIcon size={64} style={{ color: MCK.cobalt }} />
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{src}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    사진 {lightbox + 1} / {list.length}
                  </div>
                </div>
              )
            })()}
            {/* 좌/우 네비 */}
            <div style={{ position: 'absolute', bottom: -44, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button type="button" onClick={() => setLightbox((p) => (p === null ? 0 : (p - 1 + list.length) % list.length))} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', color: '#FFFFFF', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>← 이전</button>
              <span style={{ color: '#FFFFFF', fontSize: 12, padding: '6px 8px', fontWeight: 700 }}>
                {lightbox + 1} / {list.length}
              </span>
              <button type="button" onClick={() => setLightbox((p) => (p === null ? 0 : (p + 1) % list.length))} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', color: '#FFFFFF', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>다음 →</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
