'use client'

import {
  useState, useCallback, useRef, useEffect,
  useMemo, type ReactNode, type CSSProperties,
} from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search,
  Download, Columns, Filter, MoreHorizontal,
  ChevronLeft, ChevronRight, CheckSquare, Square,
  Pin, EyeOff,
} from 'lucide-react'

// ============================================================
// DataGridPro — 고성능 데이터 그리드 컴포넌트
// 가상 스크롤 + 정렬 + 필터 + 선택 + 열 조작
// ============================================================

// ─── 타입 ─────────────────────────────────────────────────

export type SortDir = 'asc' | 'desc' | null

export interface ColumnDef<T = Record<string, unknown>> {
  field: string                               // 데이터 키
  header: string                              // 헤더 레이블
  width?: number                              // 픽셀 너비 (기본 120)
  minWidth?: number
  maxWidth?: number
  flex?: number                               // flex 비율 (width 대신)
  sortable?: boolean
  filterable?: boolean
  resizable?: boolean
  pinned?: 'left' | 'right'
  hidden?: boolean
  align?: 'left' | 'center' | 'right'
  renderCell?: (value: unknown, row: T, rowIndex: number) => ReactNode
  renderHeader?: () => ReactNode
  valueGetter?: (row: T) => unknown           // 정렬/필터용 값 추출
  valueFormatter?: (value: unknown, row: T) => string
  type?: 'string' | 'number' | 'date' | 'boolean'
}

export interface DataGridProProps<T extends Record<string, unknown> = Record<string, unknown>> {
  rows: T[]
  columns: ColumnDef<T>[]
  rowKey?: string                             // 기본 'id'
  loading?: boolean
  height?: number | string                    // 그리드 높이 (기본 500)
  rowHeight?: number                          // 기본 44
  headerHeight?: number                       // 기본 44
  pageSize?: number                           // 페이지 사이즈 (0 = 가상스크롤)
  checkboxSelection?: boolean
  onSelectionChange?: (selected: Set<string>) => void
  onRowClick?: (row: T, rowIndex: number) => void
  onRowDoubleClick?: (row: T, rowIndex: number) => void
  toolbar?: ReactNode                         // 커스텀 툴바
  showToolbar?: boolean
  showSearch?: boolean
  showColumnControl?: boolean
  showExport?: boolean
  emptyMessage?: string
  className?: string
  stickyHeader?: boolean
  stripedRows?: boolean
  highlightOnHover?: boolean
  density?: 'compact' | 'standard' | 'comfortable'
  initialSort?: { field: string; dir: SortDir }
  initialFilters?: Record<string, string>
  onExport?: (rows: T[]) => void
}

// ─── 밀도 설정 ────────────────────────────────────────────

const DENSITY_CONFIG = {
  compact:     { row: 36, header: 36, px: 'px-2', text: 'text-xs' },
  standard:    { row: 44, header: 44, px: 'px-3', text: 'text-sm' },
  comfortable: { row: 56, header: 44, px: 'px-4', text: 'text-sm' },
}

// ─── 정렬 아이콘 ─────────────────────────────────────────

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc')  return <ChevronUp className="h-3.5 w-3.5 text-stone-900 flex-shrink-0" />
  if (dir === 'desc') return <ChevronDown className="h-3.5 w-3.5 text-stone-900 flex-shrink-0" />
  return <ChevronsUpDown className="h-3 w-3 text-gray-600 flex-shrink-0" />
}

// ─── 값 비교 ─────────────────────────────────────────────

function compareValues(a: unknown, b: unknown, type?: string): number {
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (type === 'number') return Number(a) - Number(b)
  if (type === 'date')   return new Date(String(a)).getTime() - new Date(String(b)).getTime()
  return String(a).localeCompare(String(b), 'ko')
}

// ─── 기본 내보내기 ───────────────────────────────────────

function defaultExportCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: ColumnDef<T>[]
) {
  const visibleCols = columns.filter(c => !c.hidden)
  const headers     = visibleCols.map(c => `"${c.header}"`).join(',')
  const lines       = rows.map(row =>
    visibleCols.map(c => {
      const val = c.valueGetter ? c.valueGetter(row) : row[c.field]
      const str = c.valueFormatter ? c.valueFormatter(val, row) : String(val ?? '')
      return `"${str.replace(/"/g, '""')}"`
    }).join(',')
  )
  const csv  = [headers, ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── 메인 컴포넌트 ────────────────────────────────────────

export default function DataGridPro<T extends Record<string, unknown> = Record<string, unknown>>({
  rows,
  columns: columnDefs,
  rowKey = 'id',
  loading = false,
  height = 500,
  rowHeight: rowHeightProp,
  headerHeight: headerHeightProp,
  pageSize = 0,
  checkboxSelection = false,
  onSelectionChange,
  onRowClick,
  onRowDoubleClick,
  toolbar,
  showToolbar = true,
  showSearch = true,
  showColumnControl = true,
  showExport = true,
  emptyMessage = '데이터가 없습니다',
  className = '',
  stickyHeader = true,
  stripedRows = false,
  highlightOnHover = true,
  density = 'standard',
  initialSort,
  initialFilters = {},
  onExport,
}: DataGridProProps<T>) {

  const dc = DENSITY_CONFIG[density]
  const rowH    = rowHeightProp    ?? dc.row
  const headerH = headerHeightProp ?? dc.header

  // ─── 상태 ───────────────────────────────────────────

  const [sortField,  setSortField]  = useState<string>(initialSort?.field ?? '')
  const [sortDir,    setSortDir]    = useState<SortDir>(initialSort?.dir ?? null)
  const [filters,    setFilters]    = useState<Record<string, string>>(initialFilters)
  const [globalSearch, setGlobalSearch] = useState('')
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    new Set(columnDefs.filter(c => c.hidden).map(c => c.field))
  )
  const [page, setPage]             = useState(1)
  const [showColMenu, setShowColMenu] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // 가상스크롤
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop]   = useState(0)

  // ─── 파생 데이터 ────────────────────────────────────

  const columns = useMemo(
    () => columnDefs.filter(c => !hiddenCols.has(c.field)),
    [columnDefs, hiddenCols]
  )

  const filteredRows = useMemo(() => {
    let result = [...rows]

    // 글로벌 검색
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      result = result.filter(row =>
        columns.some(col => {
          const val = col.valueGetter ? col.valueGetter(row) : row[col.field]
          return String(val ?? '').toLowerCase().includes(q)
        })
      )
    }

    // 컬럼 필터
    for (const [field, filterVal] of Object.entries(filters)) {
      if (!filterVal.trim()) continue
      const col = columnDefs.find(c => c.field === field)
      if (!col) continue
      const q = filterVal.toLowerCase()
      result = result.filter(row => {
        const val = col.valueGetter ? col.valueGetter(row) : row[field]
        return String(val ?? '').toLowerCase().includes(q)
      })
    }

    // 정렬
    if (sortField && sortDir) {
      const col = columnDefs.find(c => c.field === sortField)
      result.sort((a, b) => {
        const aVal = col?.valueGetter ? col.valueGetter(a) : a[sortField]
        const bVal = col?.valueGetter ? col.valueGetter(b) : b[sortField]
        const cmp  = compareValues(aVal, bVal, col?.type)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [rows, columns, columnDefs, globalSearch, filters, sortField, sortDir])

  // 페이지네이션
  const paginatedRows = useMemo(() => {
    if (!pageSize) return filteredRows
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const totalPages = pageSize ? Math.ceil(filteredRows.length / pageSize) : 1

  // 가상스크롤 계산
  const virtualRows = useMemo(() => {
    if (pageSize || typeof height !== 'number') return { startIdx: 0, endIdx: paginatedRows.length, offsetTop: 0 }
    const visibleH    = height - headerH - (showToolbar ? 48 : 0)
    const startIdx    = Math.max(0, Math.floor(scrollTop / rowH) - 3)
    const endIdx      = Math.min(paginatedRows.length, Math.ceil((scrollTop + visibleH) / rowH) + 3)
    return { startIdx, endIdx, offsetTop: startIdx * rowH }
  }, [scrollTop, paginatedRows.length, rowH, height, headerH, showToolbar, pageSize])

  const displayRows = paginatedRows.slice(virtualRows.startIdx, virtualRows.endIdx)

  // ─── 핸들러 ─────────────────────────────────────────

  const handleSort = useCallback((field: string, sortable?: boolean) => {
    if (sortable === false) return
    setSortField(prev => {
      if (prev !== field) { setSortDir('asc'); return field }
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')
      return field
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selected.size === filteredRows.length) {
      setSelected(new Set())
      onSelectionChange?.(new Set())
    } else {
      const all = new Set(filteredRows.map(r => String(r[rowKey] ?? '')))
      setSelected(all)
      onSelectionChange?.(all)
    }
  }, [filteredRows, selected.size, rowKey, onSelectionChange])

  const handleSelectRow = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      onSelectionChange?.(next)
      return next
    })
  }, [onSelectionChange])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // ─── 컬럼 너비 계산 ─────────────────────────────────

  function getColWidth(col: ColumnDef<T>): number {
    return col.width ?? col.minWidth ?? 120
  }

  // ─── 렌더링 ──────────────────────────────────────────

  const containerHeight = typeof height === 'number' ? height : height

  return (
    <div className={`flex flex-col bg-gray-950 rounded-xl border border-gray-800 overflow-hidden ${className}`} style={{ height: containerHeight }}>

      {/* 툴바 */}
      {showToolbar && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0">
          {/* 글로벌 검색 */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                value={globalSearch}
                onChange={e => { setGlobalSearch(e.target.value); setPage(1) }}
                placeholder="전체 검색..."
                className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-stone-300 w-48"
              />
            </div>
          )}

          {/* 필터 토글 */}
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-stone-100 border-stone-300 text-white'
                : 'border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            필터
          </button>

          {/* 선택 정보 */}
          {checkboxSelection && selected.size > 0 && (
            <span className="text-xs text-stone-900 bg-stone-100/15 px-2.5 py-1 rounded-lg">
              {selected.size}행 선택됨
            </span>
          )}

          <span className="text-xs text-gray-600 ml-auto">
            {filteredRows.length.toLocaleString()}건 / 전체 {rows.length.toLocaleString()}건
          </span>

          {/* 커스텀 툴바 */}
          {toolbar}

          {/* 열 관리 */}
          {showColumnControl && (
            <div className="relative">
              <button
                onClick={() => setShowColMenu(p => !p)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <Columns className="h-3.5 w-3.5" />
                열
              </button>
              {showColMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 min-w-[160px]">
                  {columnDefs.map(col => (
                    <label key={col.field} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hiddenCols.has(col.field)}
                        onChange={e => {
                          setHiddenCols(prev => {
                            const next = new Set(prev)
                            if (e.target.checked) next.delete(col.field)
                            else                  next.add(col.field)
                            return next
                          })
                        }}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-300">{col.header}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CSV 내보내기 */}
          {showExport && (
            <button
              onClick={() => onExport ? onExport(filteredRows) : defaultExportCSV(filteredRows, columns)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          )}
        </div>
      )}

      {/* 컬럼 필터 행 */}
      {showFilters && (
        <div
          className="flex border-b border-gray-800 bg-gray-900/50 flex-shrink-0"
          style={{ paddingLeft: checkboxSelection ? 40 : 0 }}
        >
          {columns.map(col => (
            <div
              key={col.field}
              className="flex-shrink-0 border-r border-gray-800/60 px-2 py-1"
              style={{ width: getColWidth(col) }}
            >
              {col.filterable !== false && (
                <input
                  value={filters[col.field] ?? ''}
                  onChange={e => { setFilters(prev => ({ ...prev, [col.field]: e.target.value })); setPage(1) }}
                  placeholder="필터..."
                  className="w-full bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-stone-300"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 테이블 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto"
      >
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          {/* 헤더 */}
          <thead
            style={{
              position: stickyHeader ? 'sticky' : 'static',
              top: 0,
              zIndex: 10,
            }}
          >
            <tr className="bg-gray-900 border-b border-gray-800">
              {checkboxSelection && (
                <th style={{ width: 40, height: headerH }} className="border-r border-gray-800">
                  <button onClick={handleSelectAll} className="flex items-center justify-center w-full h-full text-gray-400 hover:text-white">
                    {selected.size === filteredRows.length && filteredRows.length > 0
                      ? <CheckSquare className="h-4 w-4 text-stone-900" />
                      : <Square className="h-4 w-4" />}
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.field}
                  style={{ width: getColWidth(col), height: headerH, textAlign: col.align ?? 'left' }}
                  className={`border-r border-gray-800/60 last:border-r-0 select-none ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-800/60' : ''}`}
                  onClick={() => handleSort(col.field, col.sortable)}
                >
                  <div className={`flex items-center gap-1.5 ${dc.px} ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    {col.renderHeader ? col.renderHeader() : (
                      <span className={`${dc.text} font-semibold text-gray-400 truncate`}>{col.header}</span>
                    )}
                    {col.sortable !== false && (
                      <SortIcon dir={sortField === col.field ? sortDir : null} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* 가상스크롤 상단 패딩 */}
            {!pageSize && virtualRows.offsetTop > 0 && (
              <tr><td colSpan={columns.length + (checkboxSelection ? 1 : 0)} style={{ height: virtualRows.offsetTop }} /></tr>
            )}

            {/* 로딩 */}
            {loading && (
              <tr>
                <td colSpan={columns.length + (checkboxSelection ? 1 : 0)} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-500">데이터 로딩 중...</span>
                  </div>
                </td>
              </tr>
            )}

            {/* 빈 상태 */}
            {!loading && displayRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (checkboxSelection ? 1 : 0)} className="py-16 text-center">
                  <p className="text-sm text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            )}

            {/* 데이터 행 */}
            {!loading && displayRows.map((row, localIdx) => {
              const globalIdx = virtualRows.startIdx + localIdx
              const id        = String(row[rowKey] ?? globalIdx)
              const isSelected = selected.has(id)
              const isEven    = globalIdx % 2 === 0

              return (
                <tr
                  key={id}
                  onClick={() => {
                    if (checkboxSelection) handleSelectRow(id)
                    onRowClick?.(row, globalIdx)
                  }}
                  onDoubleClick={() => onRowDoubleClick?.(row, globalIdx)}
                  className={[
                    'border-b border-gray-800/50',
                    highlightOnHover ? 'hover:bg-gray-800/40 cursor-pointer' : '',
                    stripedRows && isEven ? 'bg-gray-900/30' : '',
                    isSelected ? 'bg-stone-100/10 border-stone-300/20' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ height: rowH }}
                >
                  {checkboxSelection && (
                    <td className="border-r border-gray-800 text-center" style={{ width: 40 }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleSelectRow(id) }}
                        className="flex items-center justify-center w-full h-full text-gray-500 hover:text-white"
                      >
                        {isSelected
                          ? <CheckSquare className="h-3.5 w-3.5 text-stone-900" />
                          : <Square className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  )}
                  {columns.map(col => {
                    const rawVal   = col.valueGetter ? col.valueGetter(row) : row[col.field]
                    const fmtVal   = col.valueFormatter ? col.valueFormatter(rawVal, row) : undefined
                    const cellNode = col.renderCell
                      ? col.renderCell(rawVal, row, globalIdx)
                      : <span className={`${dc.text} text-gray-200 truncate`}>{fmtVal ?? String(rawVal ?? '')}</span>

                    return (
                      <td
                        key={col.field}
                        className="border-r border-gray-800/40 last:border-r-0 overflow-hidden"
                        style={{ width: getColWidth(col), textAlign: col.align ?? 'left' }}
                      >
                        <div className={`${dc.px} h-full flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                          {cellNode}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* 가상스크롤 하단 패딩 */}
            {!pageSize && virtualRows.endIdx < paginatedRows.length && (
              <tr>
                <td
                  colSpan={columns.length + (checkboxSelection ? 1 : 0)}
                  style={{ height: (paginatedRows.length - virtualRows.endIdx) * rowH }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 bg-gray-900 flex-shrink-0">
          <span className="text-xs text-gray-500">
            {((page - 1) * pageSize + 1)}–{Math.min(page * pageSize, filteredRows.length)} / {filteredRows.length}행
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2
              if (n < 1 || n > totalPages) return null
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    n === page ? 'bg-stone-100 text-white' : 'text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {n}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 유용한 셀 렌더러 헬퍼 ──────────────────────────────

export function renderCurrencyCell(value: unknown): ReactNode {
  const n = Number(value)
  if (isNaN(n)) return <span className="text-gray-500">—</span>
  const formatted = n >= 100_000_000
    ? `${(n / 100_000_000).toFixed(1)}억`
    : n >= 10_000
    ? `${(n / 10_000).toFixed(0)}만`
    : n.toLocaleString('ko-KR') + '원'
  return <span className="font-medium tabular-nums text-white">{formatted}</span>
}

export function renderPercentCell(value: unknown, digits = 1): ReactNode {
  const n = Number(value)
  if (isNaN(n)) return <span className="text-gray-500">—</span>
  const color = n > 0 ? 'text-stone-900' : n < 0 ? 'text-stone-900' : 'text-gray-400'
  return <span className={`font-medium tabular-nums ${color}`}>{n > 0 ? '+' : ''}{n.toFixed(digits)}%</span>
}

export function renderDateCell(value: unknown, format: 'date' | 'datetime' = 'date'): ReactNode {
  if (!value) return <span className="text-gray-500">—</span>
  const d = new Date(String(value))
  if (isNaN(d.getTime())) return <span className="text-gray-500">—</span>
  const str = format === 'date'
    ? d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    : d.toLocaleString('ko-KR',     { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  return <span className="text-gray-300 text-xs">{str}</span>
}

export function renderBadgeCell(value: unknown, config: Record<string, { label?: string; color: string; bg: string }>): ReactNode {
  const key = String(value ?? '')
  const cfg = config[key]
  if (!cfg) return <span className="text-gray-500 text-xs">{key || '—'}</span>
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      {cfg.label ?? key}
    </span>
  )
}
