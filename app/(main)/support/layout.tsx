import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '고객 지원 | NPLatform',
  description: '문의사항이나 이용 중 불편한 점이 있으시면 고객 지원팀에 문의해 주세요.',
  openGraph: {
    title: '고객 지원 | NPLatform',
    description: '문의사항이나 이용 중 불편한 점이 있으시면 고객 지원팀에 문의해 주세요.',
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
