'use client'

import * as React from 'react'
import { useIsMobile } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

export interface ColumnDef<T> {
  key: string
  header: string
  /** Render function for a cell value. Receives the full row object. */
  render?: (row: T) => React.ReactNode
  /** Class names to apply to the <th> / <td> */
  className?: string
  /** Hide this column on mobile card mode (still shown in table mode) */
  hideOnCard?: boolean
}

export interface ResponsiveTableProps<T extends Record<string, unknown>> {
  columns: ColumnDef<T>[]
  data: T[]
  /**
   * Custom card renderer.  When omitted a default stacked-field card is used.
   */
  renderCard?: (row: T, index: number) => React.ReactNode
  /**
   * Tailwind breakpoint class width below which the card view is shown.
   * Defaults to 'md' (768 px).  Pass 'lg' or 'sm' to override.
   * Note: actual switching is done via the useIsMobile hook (<768 px).
   */
  breakpoint?: 'sm' | 'md' | 'lg'
  /** Optional class applied to the wrapping element */
  className?: string
  /** Row key accessor – defaults to `(row) => JSON.stringify(row)` */
  rowKey?: (row: T) => string
}

function DefaultCard<T extends Record<string, unknown>>({
  row,
  columns,
}: {
  row: T
  columns: ColumnDef<T>[]
}) {
  const visibleColumns = columns.filter((c) => !c.hideOnCard)

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      {visibleColumns.map((col, idx) => (
        <div
          key={col.key}
          className={cn(
            'flex items-start justify-between gap-2 py-1.5 text-sm',
            idx !== 0 && 'border-t border-gray-50'
          )}
        >
          <span className="min-w-[80px] font-medium text-[#1B3A5C]">
            {col.header}
          </span>
          <span className="text-right text-gray-700">
            {col.render ? col.render(row) : String(row[col.key] ?? '-')}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  columns,
  data,
  renderCard,
  className,
  rowKey = (row) => JSON.stringify(row),
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {data.map((row, idx) =>
          renderCard ? (
            <React.Fragment key={rowKey(row)}>{renderCard(row, idx)}</React.Fragment>
          ) : (
            <DefaultCard key={rowKey(row)} row={row} columns={columns} />
          )
        )}
        {data.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">
            데이터가 없습니다.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left font-semibold text-[#1B3A5C]',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={rowKey(row)}
              className={cn(
                'border-b border-gray-50 transition-colors hover:bg-gray-50/60',
                idx === data.length - 1 && 'border-b-0'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-4 py-3 text-gray-700', col.className)}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="py-10 text-center text-sm text-gray-400"
              >
                데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
