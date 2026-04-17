"use client"

/**
 * 경매 NPL 지도 탐색 (/exchange/map 모드: AUCTION)
 *
 * 첨부 이미지 레이아웃 매칭:
 *  ┌──────────────┬──────────────────────────────────┐
 *  │ 검색바        │ 맵 툴바 (필터 / 마커설정 / 공시지가) │
 *  │ 총 N개 · 정렬 │                                  │
 *  │ ┌──────────┐ │                                  │
 *  │ │경매카드 1 │ │      [Kakao Map]                 │
 *  │ │ 사건번호  │ │       · 가격 마커 (13.2억)        │
 *  │ │ 감정가/최저│ │       · D-N 매각기일 배지         │
 *  │ │ 태그      │ │                                  │
 *  │ └──────────┘ │                                  │
 *  │ 카드 2 · 3… │                                  │
 *  └──────────────┴──────────────────────────────────┘
 *
 * 🔌 통합 포인트:
 *   - `AUCTION_ITEMS` mock 데이터를 실제 경매 NPL DB 쿼리로 교체
 *   - Kakao Maps 초기화 로직은 `useKakaoMap` hook 재사용 가능 (map-client.tsx와 동일 패턴)
 *   - 마커 커스텀 오버레이 HTML: `buildAuctionMarkerHTML()` 참고
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import {
  Search, Filter, MapPin, Settings2, Layers, ChevronRight,
  ZoomIn, ZoomOut, Locate, Navigation, Gavel,
} from "lucide-react"
import {
  REGION_SHORT_LIST,
  COLLATERAL_DETAIL_TO_MAJOR,
  formatMinBidRatio,
  formatDday,
} from "@/lib/taxonomy"

// ════════════════════════════════════════════════════════════
//  Kakao Maps Type Declarations
// ════════════════════════════════════════════════════════════
declare global {
  interface Window {
    kakao: any
  }
}

// ════════════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════════════
export interface AuctionItem {
  id: string
  caseNumber: string           // 사건번호 (예: 2025타경1086)
  collateralType: string       // 오피스텔(업무용), 아파트, ...
  address: string              // 전체 주소
  appraisalValue: number       // 감정가 (원)
  minimumBid: number           // 최저가 (원) — 최저입찰가
  failedCount: number          // 유찰 횟수
  court: string                // 관할 법원 (예: 서울중앙지방법원 본원)
  auctionDate: string          // 매각기일 (YYYY-MM-DD)
  caseSuffix?: string          // 물건번호 (예: 13호, 12회)
  tags?: string[]              // 분류 태그 (대항력있는 임차인, 장기미임대 등)
  thumbnail?: string | null    // 썸네일 이미지 URL
  lat: number
  lng: number
  daysUntilAuction?: number    // D-N 배지용 (자동 계산)
  bidderCount?: number         // 입찰 참여자 수
  viewCount?: number           // 조회수 (얼마나 봤는지)
}

// ════════════════════════════════════════════════════════════
//  Mock Data — 실제 연동 시 이 부분을 삭제하고 API 호출로 교체
// ════════════════════════════════════════════════════════════
const AUCTION_ITEMS: AuctionItem[] = [
  {
    id: "A-001",
    caseNumber: "2025타경1086",
    collateralType: "오피스텔(업무용)",
    address: "서울특별시 서초구 서초동 1316-5, 부띠끄 모나코 13층 1310호",
    appraisalValue: 2_070_000_000,
    minimumBid: 1_324_800_000,
    failedCount: 2,
    court: "서울중앙지방법원 본원",
    auctionDate: "2026-04-16",
    caseSuffix: "7호",
    tags: ["대항력있는 임차인", "장기미임대"],
    thumbnail: null,
    lat: 37.4925,
    lng: 127.0275,
    daysUntilAuction: 2,
    bidderCount: 7,
    viewCount: 1284,
  },
  {
    id: "A-002",
    caseNumber: "2025타경102451",
    collateralType: "아파트",
    address: "서울특별시 서초구 서초동 1675-10, 지에스타워주건축물제1동 지상11층 1106호",
    appraisalValue: 459_000_000,
    minimumBid: 293_760_000,
    failedCount: 2,
    court: "서울중앙지방법원 본원",
    auctionDate: "2026-04-16",
    caseSuffix: "12회",
    tags: ["부동산감정경매", "선순위 임차인", "+2개"],
    thumbnail: null,
    lat: 37.4890,
    lng: 127.0320,
    daysUntilAuction: 2,
    bidderCount: 12,
    viewCount: 2341,
  },
]

// ════════════════════════════════════════════════════════════
//  Utils
// ════════════════════════════════════════════════════════════
const formatKRW = (amount: number): string => {
  if (amount >= 100_000_000) {
    const eok = amount / 100_000_000
    return eok >= 10 ? `${eok.toFixed(1)}억` : `${eok.toFixed(2)}억`
  }
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(1)}천만`
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(0)}만`
  return `${amount.toLocaleString()}원`
}

const formatFullKRW = (amount: number): string => `${amount.toLocaleString()}원`

const todayPlusDays = (dateStr: string): number => {
  const target = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

// ════════════════════════════════════════════════════════════
//  Kakao Map Hook
// ════════════════════════════════════════════════════════════
function useKakaoMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY || "1a38cb478a2d7e097ffd739f2f67f0e5"

    const initMap = () => {
      if (!window.kakao?.maps || !containerRef.current) return
      window.kakao.maps.load(() => {
        if (!containerRef.current) return
        const center = new window.kakao.maps.LatLng(37.4907, 127.0290) // 서초동
        const map = new window.kakao.maps.Map(containerRef.current, {
          center,
          level: 4,
        })
        mapRef.current = map
        setReady(true)
      })
    }

    if (window.kakao?.maps) {
      initMap()
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[data-kakao-sdk]`)
      if (existing) {
        existing.addEventListener("load", initMap, { once: true })
      } else {
        const script = document.createElement("script")
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`
        script.async = true
        script.setAttribute("data-kakao-sdk", "true")
        script.addEventListener("load", initMap, { once: true })
        document.head.appendChild(script)
      }
    }

    return () => {
      mapRef.current = null
    }
  }, [containerRef])

  return { map: mapRef.current, mapRef, ready }
}

// ════════════════════════════════════════════════════════════
//  Main Component
// ════════════════════════════════════════════════════════════
// 담보 대분류 옵션 (중앙 taxonomy 4개 + 전체)
const MAP_COLLATERAL_FILTER: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "RESIDENTIAL", label: "주거용" },
  { value: "COMMERCIAL", label: "상업/산업용" },
  { value: "LAND", label: "토지" },
  { value: "ETC", label: "기타" },
]

export function AuctionMapPage() {
  const [query, setQuery] = useState("")
  const [collateralMajor, setCollateralMajor] = useState("ALL")
  const [regionShort, setRegionShort] = useState("ALL")
  const [sort, setSort] = useState<"recent" | "auctionDate" | "priceAsc">("recent")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { map, ready } = useKakaoMap(containerRef)
  const overlaysRef = useRef<any[]>([])

  // Filter + sort
  const filtered = useMemo(() => {
    let arr = [...AUCTION_ITEMS]
    if (query) {
      const q = query.toLowerCase()
      arr = arr.filter(it =>
        it.caseNumber.toLowerCase().includes(q) ||
        it.address.toLowerCase().includes(q) ||
        it.collateralType.toLowerCase().includes(q)
      )
    }
    if (collateralMajor !== "ALL") {
      arr = arr.filter(it => {
        const label = it.collateralType
        if (collateralMajor === "RESIDENTIAL") return /아파트|빌라|연립|다세대|주거용|원룸|단독|다가구|주상복합|도시형/.test(label)
        if (collateralMajor === "COMMERCIAL") return /상가|근린|오피스|사무실|사무소|지식산업|빌딩|창고|공장|숙박|의료|운동|교육|목욕|문화|종교|장례|농가|주유소|자동차|분뇨|쓰레기|업무용/.test(label)
        if (collateralMajor === "LAND")       return /토지|대지|전$|답$|과수원|임야|잡종지|공업용지/.test(label)
        return true
      })
    }
    if (regionShort !== "ALL") {
      arr = arr.filter(it => it.address.includes(regionShort))
    }
    if (sort === "auctionDate") {
      arr.sort((a, b) => new Date(a.auctionDate).getTime() - new Date(b.auctionDate).getTime())
    } else if (sort === "priceAsc") {
      arr.sort((a, b) => a.minimumBid - b.minimumBid)
    }
    return arr
  }, [query, collateralMajor, regionShort, sort])

  // Render markers
  useEffect(() => {
    if (!ready || !map) return

    // Clear old overlays
    overlaysRef.current.forEach(o => o.setMap(null))
    overlaysRef.current = []

    filtered.forEach(item => {
      const position = new window.kakao.maps.LatLng(item.lat, item.lng)
      const d = item.daysUntilAuction ?? todayPlusDays(item.auctionDate)
      const html = buildAuctionMarkerHTML(item, d, selectedId === item.id)
      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content: html,
        yAnchor: 1,
        clickable: true,
      })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)

      // Delegate click handler to container via data-attribute
      setTimeout(() => {
        const el = document.querySelector<HTMLDivElement>(`[data-auction-id="${item.id}"]`)
        if (el) {
          el.addEventListener("click", () => {
            setSelectedId(item.id)
            map.panTo(position)
          })
        }
      }, 0)
    })
  }, [ready, map, filtered, selectedId])

  const handleCardClick = useCallback((item: AuctionItem) => {
    setSelectedId(item.id)
    if (map && window.kakao?.maps) {
      const position = new window.kakao.maps.LatLng(item.lat, item.lng)
      map.panTo(position)
    }
  }, [map])

  return (
    <div className="flex h-full w-full" style={{ background: 'var(--color-surface-sunken)' }}>
      {/* ══ LEFT SIDEBAR ═══════════════════════════════════════════════ */}
      <aside
        className="flex flex-col flex-shrink-0 border-r"
        style={{
          width: 380,
          background: 'var(--color-surface-base)',
          borderColor: 'var(--color-border-subtle)',
        }}
      >
        {/* Search bar */}
        <div className="p-4 border-b space-y-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="사건번호, 상세주소 검색"
              className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-lg outline-none transition-all"
              style={{
                background: 'var(--color-surface-sunken)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* 담보 유형 + 지역 (사이트 전반 통일 카테고리) */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={collateralMajor}
              onChange={e => setCollateralMajor(e.target.value)}
              className="text-[12px] px-2.5 py-2 rounded-lg outline-none cursor-pointer"
              style={{
                background: 'var(--color-surface-sunken)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-primary)',
              }}
            >
              {MAP_COLLATERAL_FILTER.map(op => (
                <option key={op.value} value={op.value}>담보 · {op.label}</option>
              ))}
            </select>
            <select
              value={regionShort}
              onChange={e => setRegionShort(e.target.value)}
              className="text-[12px] px-2.5 py-2 rounded-lg outline-none cursor-pointer"
              style={{
                background: 'var(--color-surface-sunken)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="ALL">지역 · 전체</option>
              {REGION_SHORT_LIST.map(r => (
                <option key={r} value={r}>지역 · {r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter + Sort */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            총 <span style={{ color: '#DC2626' }}>{filtered.length}</span>개
          </span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="text-[12px] px-2 py-1 rounded-md outline-none cursor-pointer"
            style={{
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: 'none',
            }}
          >
            <option value="recent">최신순</option>
            <option value="auctionDate">매각기일순</option>
            <option value="priceAsc">최저가 낮은순</option>
          </select>
        </div>

        {/* Card List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              검색 결과가 없습니다.
            </div>
          )}
          {filtered.map(item => (
            <AuctionCard
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>
      </aside>

      {/* ══ RIGHT MAP ═════════════════════════════════════════════════ */}
      <main className="flex-1 relative">
        {/* Map Toolbar (top) */}
        <div className="absolute top-3 left-[calc(3.5rem+1rem)] right-3 z-50 flex items-center justify-between pointer-events-none">
          {/* Left: filter + marker setting */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <ToolbarButton icon={<Filter size={13} />} label="필터" />
            <ToolbarButton icon={<MapPin size={13} />} label="마커 설정" />
          </div>
          {/* Center: breadcrumb */}
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold shadow-sm"
              style={{
                background: 'var(--color-surface-base)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-secondary)',
              }}>
              서울 <ChevronRight size={11} /> 서초구 <ChevronRight size={11} /> 서초동
            </div>
          </div>
          {/* Right: map tools */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <ToolbarButton icon={<Layers size={13} />} label="공시지가" />
            <ToolbarButton icon={<Settings2 size={13} />} label="지도설정" />
          </div>
        </div>

        {/* Map container */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* Zoom controls */}
        <div className="absolute top-[60px] right-3 z-50 flex flex-col gap-0 shadow-lg rounded-lg overflow-hidden"
          style={{ background: 'var(--color-surface-base)', border: '1px solid var(--color-border-subtle)' }}>
          <button onClick={() => map?.setLevel(map.getLevel() - 1)}
            className="w-9 h-9 flex items-center justify-center hover:bg-[var(--color-surface-overlay)] border-b"
            style={{ borderColor: 'var(--color-border-subtle)' }}>
            <ZoomIn size={15} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
          <button onClick={() => map?.setLevel(map.getLevel() + 1)}
            className="w-9 h-9 flex items-center justify-center hover:bg-[var(--color-surface-overlay)]">
            <ZoomOut size={15} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>
        <button className="absolute top-[150px] right-3 z-50 w-9 h-9 flex items-center justify-center rounded-lg shadow-lg hover:bg-[var(--color-surface-overlay)]"
          style={{ background: 'var(--color-surface-base)', border: '1px solid var(--color-border-subtle)' }}>
          <Locate size={15} style={{ color: 'var(--color-text-secondary)' }} />
        </button>

        {/* Loading overlay */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'var(--color-surface-base)' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin w-7 h-7 border-3 border-red-500 border-t-transparent rounded-full" />
              <span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>지도 로딩 중…</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Sub-components
// ════════════════════════════════════════════════════════════
function AuctionCard({
  item, selected, onClick,
}: {
  item: AuctionItem
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 border-b transition-all hover:bg-[var(--color-surface-overlay)]"
      style={{
        borderColor: 'var(--color-border-subtle)',
        background: selected ? 'rgba(220,38,38,0.03)' : 'transparent',
        borderLeft: selected ? '3px solid #DC2626' : '3px solid transparent',
      }}
    >
      {/* Top row: 경매 badge + type + case number */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
          style={{ background: '#DC2626', color: 'white' }}>
          <Gavel size={9} />경매
        </span>
        <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {item.collateralType}
        </span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
          · {item.caseNumber}
        </span>
      </div>

      {/* Address + thumbnail */}
      <div className="flex gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] leading-snug line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
            {item.address}
          </p>
        </div>
        <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
          style={{ background: 'var(--color-surface-overlay)' }}>
          {item.thumbnail ? (
            <Image src={item.thumbnail} alt="" width={64} height={64} className="object-cover" />
          ) : (
            <MapPin size={18} style={{ color: 'var(--color-text-muted)' }} />
          )}
        </div>
      </div>

      {/* Prices */}
      <div className="space-y-0.5 mb-2 tabular-nums">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] w-10" style={{ color: 'var(--color-text-tertiary)' }}>감정가</span>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            {formatFullKRW(item.appraisalValue)}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] w-10" style={{ color: 'var(--color-text-tertiary)' }}>최저가</span>
          <span className="text-[13px] font-bold" style={{ color: '#DC2626' }}>
            {formatFullKRW(item.minimumBid)}
          </span>
          {/* 최저입찰 비율 — 자동 계산 (최저가 ÷ 감정가) */}
          <span className="text-[11px] font-semibold ml-1" style={{ color: '#DC2626' }}>
            ({formatMinBidRatio(item.appraisalValue, item.minimumBid)})
          </span>
        </div>
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {/* D-day 배지 (자동 계산) */}
        <Chip color="#FFFFFF" bg="#DC2626">{formatDday(item.auctionDate)}</Chip>
        {item.failedCount > 0 && (
          <Chip color="var(--color-text-danger, #F87171)" bg="rgba(239,68,68,0.12)">유찰 {item.failedCount}회</Chip>
        )}
        <Chip color="var(--color-text-secondary)" bg="var(--color-surface-overlay)">{item.court}</Chip>
        <Chip color="var(--color-text-secondary)" bg="var(--color-surface-overlay)">📅 {item.auctionDate}</Chip>
        {item.caseSuffix && <Chip color="var(--color-text-secondary)" bg="var(--color-surface-overlay)">· {item.caseSuffix}</Chip>}
      </div>

      {/* Engagement row: 입찰 참여자수 · 조회수 */}
      {(item.bidderCount != null || item.viewCount != null) && (
        <div className="flex items-center gap-3 text-[11px] mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {item.bidderCount != null && (
            <span className="inline-flex items-center gap-1">
              <span>👥</span>
              <span>입찰 <strong style={{ color: 'var(--color-text-secondary)' }}>{item.bidderCount}</strong>명</span>
            </span>
          )}
          {item.viewCount != null && (
            <span className="inline-flex items-center gap-1">
              <span>👁</span>
              <span>조회 <strong style={{ color: 'var(--color-text-secondary)' }}>{item.viewCount.toLocaleString()}</strong></span>
            </span>
          )}
        </div>
      )}

      {/* Tags row */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
          {item.tags.map((tag, i) => (
            <Chip key={i} color="#34D399" bg="rgba(16,185,129,0.12)">{tag}</Chip>
          ))}
        </div>
      )}
    </button>
  )
}

function Chip({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-medium whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {children}
    </span>
  )
}

function ToolbarButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold shadow-sm transition-all hover:bg-[var(--color-surface-overlay)]"
      style={{
        background: 'var(--color-surface-base)',
        border: '1px solid var(--color-border-subtle)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ════════════════════════════════════════════════════════════
//  Custom Marker HTML Builder (price + D-N badge)
// ════════════════════════════════════════════════════════════
function buildAuctionMarkerHTML(item: AuctionItem, dDay: number, selected: boolean): string {
  const priceLabel = formatKRW(item.minimumBid)
  const dBadge = dDay >= 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`
  const bgColor = selected ? "#DC2626" : "#FFFFFF"
  const textColor = selected ? "#FFFFFF" : "#0F172A"
  const borderColor = selected ? "#DC2626" : "#DC2626"
  const subBorder = selected ? "rgba(255,255,255,0.3)" : "#FEE2E2"

  return `
    <div data-auction-id="${item.id}" style="cursor:pointer; transform: translateX(-50%); user-select:none;">
      <div style="
        display:inline-flex; align-items:center; gap:6px;
        padding:5px 9px 5px 7px;
        background:${bgColor};
        color:${textColor};
        border:1.5px solid ${borderColor};
        border-radius:999px;
        font-family:'Pretendard',sans-serif;
        font-size:12px; font-weight:800;
        box-shadow:0 3px 10px rgba(220,38,38,0.22);
        white-space:nowrap;
      ">
        <span style="
          display:inline-flex; align-items:center; justify-content:center;
          padding:1px 5px;
          background:${selected ? "rgba(255,255,255,0.22)" : "#DC2626"};
          color:${selected ? "#fff" : "#fff"};
          border-radius:4px;
          font-size:9.5px; font-weight:800; letter-spacing:0.02em;
        ">경매</span>
        <span>${priceLabel}</span>
        <span style="
          padding:1px 5px;
          background:${selected ? "rgba(255,255,255,0.22)" : "#FFF7ED"};
          color:${selected ? "#fff" : "#C2410C"};
          border:1px solid ${subBorder};
          border-radius:4px;
          font-size:9.5px; font-weight:800;
        ">${dBadge}</span>
      </div>
      <div style="
        width:0; height:0;
        margin:0 auto;
        border-left:5px solid transparent;
        border-right:5px solid transparent;
        border-top:6px solid ${borderColor};
      "></div>
    </div>
  `
}
