import type { Metadata } from 'next'

export const revalidate = 300

export const metadata: Metadata = {
  title: '공지사항 | NPLatform',
  description: 'NPLatform의 최신 공지사항과 업데이트 소식을 확인하세요.',
  openGraph: {
    title: '공지사항 | NPLatform',
    description: 'NPLatform의 최신 공지사항과 업데이트 소식을 확인하세요.',
  },
}

export default function NoticesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
