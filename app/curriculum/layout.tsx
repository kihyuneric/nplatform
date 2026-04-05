'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookOpen, Upload, Home, GitBranch, BarChart3, Mail, Map, Menu, X, FileText, GraduationCap, Zap } from 'lucide-react'

const navItems = [
  { href: '/curriculum', label: '홈', icon: Home, exact: true },
  { href: '/curriculum/dashboard', label: '대시보드', icon: BarChart3 },
  { href: '/curriculum/upload', label: '대본분석', icon: Upload },
  { href: '/curriculum/graph', label: '지식그래프', icon: GitBranch },
  { href: '/curriculum/roadmap', label: '로드맵', icon: Map },
  { href: '/curriculum/samples', label: '샘플', icon: FileText },
  { href: '/curriculum/newsletter', label: '뉴스레터', icon: Mail },
]

const adminNavItem = { href: '/admin/lecture-plan', label: '강의안 생성', icon: GraduationCap }

export default function CurriculumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? ''
  const [mobileOpen, setMobileOpen] = useState(false)

  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = '부동산 투자 교육 — 온톨로지 학습 플랫폼'
  }, [])

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/curriculum" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">
              부동산 학습
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href || pathname.startsWith('/curriculum/capsule') || pathname.startsWith('/curriculum/concept') || pathname.startsWith('/curriculum/study')
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'text-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
            <span className="w-px h-4 bg-gray-200" />
            <Link
              href={adminNavItem.href}
              className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname.startsWith('/admin')
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-indigo-600'
              }`}
            >
              <adminNavItem.icon className="w-4 h-4" />
              {adminNavItem.label}
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <nav className="md:hidden border-t bg-white px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href || pathname.startsWith('/curriculum/capsule') || pathname.startsWith('/curriculum/concept') || pathname.startsWith('/curriculum/study')
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
            <div className="border-t border-gray-100 pt-1">
              <Link
                href={adminNavItem.href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <adminNavItem.icon className="w-4 h-4" />
                {adminNavItem.label}
              </Link>
            </div>
          </nav>
        )}

        <div className="h-[2px] bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500" />
      </header>
      <main>{children}</main>
    </div>
  )
}
