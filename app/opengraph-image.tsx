/**
 * Dynamic OG image for the site root.
 *  - Next.js App Router 규약: app/opengraph-image.tsx 를 두면 /opengraph-image
 *    경로로 자동 노출되고 metadata.openGraph.images 에 주입됩니다.
 *  - @vercel/og 대신 Next 내장 ImageResponse 사용 (edge runtime).
 */
import { ImageResponse } from 'next/og'
import { BRAND, CLAIMS } from '@/lib/brand'

export const runtime = 'edge'
export const alt = BRAND.taglineLong
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
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #0A1628 0%, #1B3A5C 60%, #2E75B6 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #10B981, #047857)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            N
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>{BRAND.name}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5 }}>
            {BRAND.taglineLong}
          </div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
            {BRAND.taglineShort}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '36px',
            borderTop: '1px solid rgba(255,255,255,0.14)',
            paddingTop: '28px',
            fontSize: 22,
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 2 }}>DATA</span>
            <span>{CLAIMS.dataCoverage.transactions}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 2 }}>AI</span>
            <span>{CLAIMS.ai.model}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 2 }}>TRUST</span>
            <span>{CLAIMS.trust.isms}</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
