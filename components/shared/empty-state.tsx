"use client"

import { type ReactNode } from "react"
import { type LucideIcon, FileX2, Search, Inbox, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  children?: ReactNode
  variant?: "default" | "compact" | "full"
}

const VARIANT_STYLES = {
  default: "py-12",
  compact: "py-6",
  full: "py-24",
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  children,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${VARIANT_STYLES[variant]}`}>
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      )}
      {action && (
        action.href ? (
          <Button asChild className="bg-[#1B3A5C] hover:bg-[#2E75B6]">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button onClick={action.onClick} className="bg-[#1B3A5C] hover:bg-[#2E75B6]">
            {action.label}
          </Button>
        )
      )}
      {children}
    </div>
  )
}

// 프리셋
export function NoSearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={Search}
      title="검색 결과가 없습니다"
      description={query ? `"${query}"에 대한 결과를 찾을 수 없습니다. 다른 키워드로 검색해보세요.` : "검색어를 입력해주세요."}
    />
  )
}

export function NoListings() {
  return (
    <EmptyState
      icon={FolderOpen}
      title="등록된 매물이 없습니다"
      description="새 매각 공고를 등록하거나 필터를 변경해보세요."
      action={{ label: "매각 등록", href: "/exchange/sell" }}
    />
  )
}

export function NoData({ title = "데이터가 없습니다" }: { title?: string }) {
  return (
    <EmptyState
      icon={FileX2}
      title={title}
      variant="compact"
    />
  )
}
