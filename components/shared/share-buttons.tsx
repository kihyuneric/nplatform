"use client"

import { Link2, MessageCircle, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"

interface ShareButtonsProps {
  url?: string
  title?: string
  description?: string
}

export function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "")
  const shareTitle = title || "NPLatform 매물 정보"
  const shareDesc = description || ""

  const handleCopyLink = async () => {
    const currentUrl = url || window.location.href
    await copyToClipboard(currentUrl, "링크가 복사되었습니다")
  }

  const handleKakaoShare = () => {
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`
    window.open(kakaoUrl, "_blank", "width=600,height=400")
  }

  const handleNaverShare = () => {
    const naverUrl = `https://blog.naver.com/openapi/share?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`
    window.open(naverUrl, "_blank", "width=600,height=400")
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyLink}
        className="h-8 px-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        title="링크 복사"
      >
        <Link2 className="h-3.5 w-3.5 mr-1" />
        링크 복사
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleKakaoShare}
        className="h-8 px-2 text-xs text-[var(--color-text-secondary)] hover:text-yellow-600"
        title="카카오톡 공유"
      >
        <MessageCircle className="h-3.5 w-3.5 mr-1" />
        카카오톡
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNaverShare}
        className="h-8 px-2 text-xs text-[var(--color-text-secondary)] hover:text-green-600"
        title="네이버 블로그"
      >
        <Newspaper className="h-3.5 w-3.5 mr-1" />
        블로그
      </Button>
    </div>
  )
}
