/**
 * Dynamic OG image for the site root.
 *  - Next.js App Router 규약: app/opengraph-image.tsx 를 두면 /opengraph-image
 *    경로로 자동 노출되고 <meta property="og:image"> 에 주입됩니다.
 *  - 카카오톡 / 슬랙 / 트위터(X) / 페이스북 / 네이버 모두 1200×630 PNG 인식.
 *  - McKinsey White Paper 디자인 — Electric Blue · Cyan · Ink · Paper.
 *  - Latin / Romanized 텍스트만 사용해 edge runtime 폰트 의존성 제거.
 */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'NPLatform — AI-powered NPL Investment & Trading Platform'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        {/* Top accent stripes — McKinsey signature */}
        <div style={{ display: 'flex', height: 10, background: '#2251FF' }} />
        <div style={{ display: 'flex', height: 3, background: '#00A9F4' }} />

        {/* Body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '60px 78px',
          }}
        >
          {/* ── Brand row ─────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                background: '#2251FF',
                color: '#FFFFFF',
                fontSize: 38,
                fontWeight: 900,
                letterSpacing: '-0.04em',
                boxShadow: '0 6px 16px rgba(34, 81, 255, 0.35)',
              }}
            >
              N
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 30,
                  fontWeight: 900,
                  color: '#0A1628',
                  letterSpacing: '-0.02em',
                }}
              >
                <span>NPL</span>
                <span style={{ color: '#3D506F', fontWeight: 400 }}>atform</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#2251FF',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                }}
              >
                AI · NPL Marketplace · Since 2026
              </div>
            </div>
          </div>

          {/* ── Hero ───────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 86,
                fontWeight: 900,
                color: '#0A1628',
                letterSpacing: '-0.035em',
                lineHeight: 1.04,
              }}
            >
              <span>AI-Powered NPL</span>
              <span style={{ display: 'flex' }}>
                <span>Investment&nbsp;</span>
                <span style={{ color: '#2251FF' }}>Platform.</span>
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                fontWeight: 600,
                color: '#3D506F',
                lineHeight: 1.45,
                marginTop: 4,
                maxWidth: 940,
              }}
            >
              Deal-flow infrastructure connecting financial institutions and qualified investors —
              Korea&apos;s first AI-driven non-performing loan exchange.
            </div>
          </div>

          {/* ── Footer row ─────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 22,
              borderTop: '1px solid #E5E9F0',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 24,
                fontSize: 16,
                fontWeight: 800,
                color: '#0A1628',
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
            >
              <span>Exchange</span>
              <span style={{ color: '#A8CDE8' }}>/</span>
              <span>Deal Room</span>
              <span style={{ color: '#A8CDE8' }}>/</span>
              <span>AI Analysis</span>
              <span style={{ color: '#A8CDE8' }}>/</span>
              <span>Escrow</span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 800,
                color: '#2251FF',
                letterSpacing: '0.06em',
              }}
            >
              nplatform.co.kr
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
