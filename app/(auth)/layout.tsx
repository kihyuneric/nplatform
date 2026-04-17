export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth pages own their full-screen layout (split-panels, role grids, etc).
  // Do NOT add max-width or padding wrappers here — they will squeeze child layouts.
  return <>{children}</>
}
