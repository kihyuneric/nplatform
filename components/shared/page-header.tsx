'use client'

interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, badge, actions, children }: PageHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-[#1B3A5C] to-[#2E75B6] text-white py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            {badge && (
              <span className="inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full mb-3">
                {badge}
              </span>
            )}
            <h1 className="text-3xl font-bold">{title}</h1>
            {subtitle && <p className="text-blue-100 mt-2">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-3">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}
