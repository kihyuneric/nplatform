import { TermsTabs } from './terms-tabs'

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TermsTabs />
      {children}
    </>
  )
}
