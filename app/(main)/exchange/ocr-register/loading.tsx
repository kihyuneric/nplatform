import DS from "@/lib/design-system"

export default function Loading() {
  return (
    <div className={DS.page.wrapper}>
      <div className={DS.page.container + " py-8 space-y-6"}>
        <div className="h-8 w-72 rounded-lg bg-[var(--color-surface-overlay)] animate-pulse" />
        <div className="h-4 w-96 rounded bg-[var(--color-surface-overlay)] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="h-[340px] rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
