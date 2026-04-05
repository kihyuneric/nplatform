"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, MessageSquare, BookOpen, Newspaper, Bell, PlusCircle } from "lucide-react"
import { BannerSlot } from '@/components/banners/banner-slot'

const EXPERT_TABS = [
  { href: "/services/experts",          label: "전문가 찾기", icon: Users,       exact: false },
  { href: "/services/experts/register", label: "전문가 등록", icon: PlusCircle,  exact: false },
]

const COMMUNITY_TABS = [
  { href: "/services/community", label: "커뮤니티",  icon: MessageSquare, exact: false },
  { href: "/services/learn",     label: "교육 센터", icon: BookOpen,      exact: false },
  { href: "/news",               label: "뉴스",      icon: Newspaper,     exact: false },
  { href: "/notices",            label: "공지사항",  icon: Bell,          exact: true  },
]

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''

  const isExpert = pathname.startsWith('/services/experts')
  const tabs = isExpert ? EXPERT_TABS : COMMUNITY_TABS

  return (
    <>
      <BannerSlot position="services-top" className="mx-auto max-w-7xl px-4 pt-4" />

      <div className="sticky top-[60px] z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? "border-[#1B3A5C] text-[#1B3A5C] dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {children}
    </>
  )
}
