"use client"

import { ErrorIllustration } from "@/components/shared/error-illustration"

export default function DisclaimerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorIllustration onRetry={reset} />
}
