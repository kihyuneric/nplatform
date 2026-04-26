import type { Metadata } from 'next'
import { CommunityTabs } from '@/components/community/community-tabs'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '고객센터 | NPLatform',
  description: '자주 묻는 질문, 문의 접수, 도움말 등 고객 지원 안내.',
  openGraph: {
    title: '고객센터 | NPLatform',
    description: '자주 묻는 질문, 문의 접수, 도움말 등 고객 지원 안내.',
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CommunityTabs />
      {children}
    </>
  )
}
