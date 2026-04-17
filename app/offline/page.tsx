/**
 * /offline — PWA 오프라인 폴백 페이지
 * Service worker가 네트워크 없을 때 이 페이지를 보여준다.
 */
export const metadata = {
  title: '오프라인 | NPLatform',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-surface-base)] px-6 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)]">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-[var(--color-text-tertiary)]">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
        </svg>
      </div>

      <h1 className="mb-3 text-2xl font-black text-[var(--color-text-primary)]">
        인터넷 연결이 없습니다
      </h1>
      <p className="mb-8 max-w-sm text-sm text-[var(--color-text-tertiary)] leading-relaxed">
        NPLatform에 접속하려면 인터넷 연결이 필요합니다.
        연결을 확인한 후 다시 시도해 주세요.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-[var(--color-brand-deep)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-bright)]"
      >
        다시 시도
      </button>

      <p className="mt-6 text-xs text-[var(--color-text-muted)]">
        오프라인 상태에서도 이전에 방문한 페이지는 캐시에서 열 수 있습니다.
      </p>
    </div>
  )
}
