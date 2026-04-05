import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '이용 가이드 | NPLatform',
  description: 'NPLatform 이용 방법과 NPL 투자 가이드를 확인하세요. 초보자도 쉽게 시작할 수 있습니다.',
  openGraph: {
    title: '이용 가이드 | NPLatform',
    description: 'NPLatform 이용 방법과 NPL 투자 가이드를 확인하세요.',
  },
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
