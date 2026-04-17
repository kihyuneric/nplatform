'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import DS from '@/lib/design-system'
import { staggerContainer, staggerItem, expandHeight } from '@/lib/animations'
import { SkeletonPulse } from '@/components/ui/skeleton-pulse'

// ─── Types ────────────────────────────────────────────────────────

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, row: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}

type SortDirection = 'asc' | 'desc' | null

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  sortable?: boolean
  stickyHeader?: boolean
  expandable?: boolean
  renderExpanded?: (row: T) => React.ReactNode
  pagination?: { pageSize: number }
  loading?: boolean
  loadingRows?: number
  emptyState?: React.ReactNode
  onRowClick?: (row: T, index: number) => void
  rowKey?: (row: T, index: number) => string | number
  className?: string
}

// ─── Component ────────────────────────────────────────────────────

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  sortable = false,
  stickyHeader = false,
  expandable = false,
  renderExpanded,
  pagination,
  loading = false,
  loadingRows = 5,
  emptyState,
  onRowClick,
  rowKey,
  className,
}: DataTableProps<T>) {
  const [sortCol, setSortCol] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<SortDirection>(null)
  const [expandedRows, setExpandedRows] = React.useState<Set<string | number>>(new Set())
  const [currentPage, setCurrentPage] = React.useState(1)

  // ── Sorting ──
  const handleSort = (key: string) => {
    if (sortCol === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') { setSortCol(null); setSortDir(null) }
      else setSortDir('asc')
    } else {
      setSortCol(key)
      setSortDir('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortCol || !sortDir) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortCol]
      const bVal = b[sortCol]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const cmp = String(aVal).localeCompare(String(bVal), 'ko')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortCol, sortDir])

  // ── Pagination ──
  const pageSize = pagination?.pageSize ?? sortedData.length
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData

  React.useEffect(() => { setCurrentPage(1) }, [data.length, sortCol, sortDir])

  // ── Expand ──
  const toggleExpand = (key: string | number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const getRowKey = (row: T, i: number) => rowKey ? rowKey(row, i) : (row as any).id ?? i

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className={cn(DS.table.wrapper, className)}>
        <div className={DS.table.header}>
          <div className="flex gap-4 px-4 py-3">
            {columns.map(col => (
              <div key={col.key} className="flex-1" style={col.width ? { width: col.width, flex: 'none' } : undefined}>
                <SkeletonPulse variant="shimmer" className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-[var(--color-border-subtle)]">
            {columns.map(col => (
              <div key={col.key} className="flex-1" style={col.width ? { width: col.width, flex: 'none' } : undefined}>
                <SkeletonPulse variant="shimmer" className="h-4 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // ── Empty ──
  if (data.length === 0 && emptyState) {
    return (
      <div className={cn(DS.table.wrapper, className)}>
        <div className="py-16 px-6 flex items-center justify-center">
          {emptyState}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(DS.table.wrapper, className)}>
      {/* Table */}
      <table className="w-full">
        {/* Header */}
        <thead>
          <tr className={cn(DS.table.header, stickyHeader && 'sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.06)]')}>
            {expandable && <th className="w-10 px-2 py-3" />}
            {columns.map((col, colIdx) => {
              const isSortable = sortable && col.sortable !== false
              const isActive = sortCol === col.key
              const colNum = (expandable ? 2 : 1) + colIdx
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    DS.table.headerCell,
                    isSortable && 'cursor-pointer select-none hover:text-[var(--color-text-primary)] transition-colors',
                    isActive && 'text-[var(--color-brand-mid)]',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.className,
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={isSortable ? () => handleSort(col.key) : undefined}
                  aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  aria-colindex={colNum}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {isSortable && (
                      <span className="inline-flex flex-col text-[var(--color-text-muted)]">
                        {isActive ? (
                          sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>

        {/* Body */}
        <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
          {paginatedData.map((row, i) => {
            const key = getRowKey(row, i)
            const isExpanded = expandedRows.has(key)
            return (
              <React.Fragment key={key}>
                <motion.tr
                  variants={staggerItem}
                  className={cn(
                    DS.table.row,
                    onRowClick && 'cursor-pointer',
                    expandable && 'cursor-pointer',
                  )}
                  onClick={() => {
                    if (expandable) toggleExpand(key)
                    onRowClick?.(row, i)
                  }}
                >
                  {expandable && (
                    <td className="w-10 px-2 py-3.5">
                      <motion.span
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.15 }}
                        className="inline-block text-[var(--color-text-muted)]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.span>
                    </td>
                  )}
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={cn(
                        DS.table.cell,
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.className,
                      )}
                      style={col.width ? { width: col.width } : undefined}
                      aria-colindex={(expandable ? 2 : 1) + colIdx}
                    >
                      {col.render ? col.render(row[col.key], row, i) : row[col.key]}
                    </td>
                  ))}
                </motion.tr>

                {/* Expanded row */}
                <AnimatePresence>
                  {expandable && isExpanded && renderExpanded && (
                    <motion.tr
                      key={`${key}-expanded`}
                      variants={expandHeight}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <td colSpan={columns.length + 1} className="bg-[var(--color-surface-sunken)] px-6 py-4">
                        {renderExpanded(row)}
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            )
          })}
        </motion.tbody>
      </table>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedData.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

// ─── Table Pagination ─────────────────────────────────────────────

function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  const pages = React.useMemo(() => {
    const p: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) p.push(i)
    } else {
      p.push(1)
      if (currentPage > 3) p.push('ellipsis')
      const lo = Math.max(2, currentPage - 1)
      const hi = Math.min(totalPages - 1, currentPage + 1)
      for (let i = lo; i <= hi; i++) p.push(i)
      if (currentPage < totalPages - 2) p.push('ellipsis')
      p.push(totalPages)
    }
    return p
  }, [currentPage, totalPages])

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-subtle)]">
      <span className="text-[0.75rem] text-[var(--color-text-tertiary)] tabular-nums">
        {start}–{end} / {totalItems.toLocaleString()}건
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="이전 페이지"
        >
          <ChevronUp className="w-4 h-4 -rotate-90" />
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1 text-[var(--color-text-muted)]">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-[32px] h-8 rounded-lg text-[0.8125rem] font-medium transition-colors',
                p === currentPage
                  ? 'bg-[var(--color-brand-mid)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]',
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="다음 페이지"
        >
          <ChevronUp className="w-4 h-4 rotate-90" />
        </button>
      </div>
    </div>
  )
}
