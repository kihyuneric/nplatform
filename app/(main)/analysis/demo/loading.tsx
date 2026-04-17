import DS from "@/lib/design-system"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop}`}>
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-brand-mid)]" />
          <span className="text-[var(--color-text-muted)] text-sm">불러오는 중...</span>
        </div>
      </div>
    </div>
  )
}
