export default function FundDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* 뒤로가기 */}
      <div className="h-5 w-32 bg-[var(--color-surface-overlay)] rounded" />

      {/* 매물 연동 카드 */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--color-surface-overlay)]" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-64 bg-[var(--color-surface-overlay)] rounded" />
            <div className="h-4 w-48 bg-[var(--color-surface-elevated)] rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-[var(--color-surface-elevated)] rounded" />
              <div className="h-5 w-24 bg-[var(--color-surface-overlay)] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border-subtle)] p-4 space-y-2">
            <div className="h-3 w-20 bg-[var(--color-surface-elevated)] rounded" />
            <div className="h-6 w-28 bg-[var(--color-surface-overlay)] rounded" />
          </div>
        ))}
      </div>

      {/* 리더 + 공동투자사 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--color-border-subtle)] p-6 space-y-4">
          <div className="h-5 w-24 bg-[var(--color-surface-overlay)] rounded" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-[var(--color-surface-elevated)] rounded" />
          ))}
        </div>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] p-6 space-y-4">
          <div className="h-5 w-24 bg-[var(--color-surface-overlay)] rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-[var(--color-border-subtle)]">
              <div className="h-9 w-9 rounded-full bg-[var(--color-surface-overlay)]" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-32 bg-[var(--color-surface-overlay)] rounded" />
                <div className="h-3 w-20 bg-[var(--color-surface-elevated)] rounded" />
              </div>
              <div className="h-4 w-24 bg-[var(--color-surface-overlay)] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
