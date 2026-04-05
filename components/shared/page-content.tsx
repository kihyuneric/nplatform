interface PageContentProps {
  children: React.ReactNode
  className?: string
}

export function PageContent({ children, className = '' }: PageContentProps) {
  return (
    <div className={`container mx-auto max-w-7xl px-4 py-8 ${className}`}>
      {children}
    </div>
  )
}
