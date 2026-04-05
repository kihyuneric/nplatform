"use client"

import Link from "next/link"
import Image from "next/image"
import { memo } from 'react'

interface BannerCardProps {
  banner: {
    id: string
    title: string
    image_url: string
    target_url: string
  }
  height?: string
}

export const BannerCard = memo(function BannerCard({ banner, height = "90px" }: BannerCardProps) {
  const handleClick = () => {
    fetch(`/api/v1/banners?id=${banner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "click" }),
    }).catch(() => { /* best-effort: ignore click tracking errors */ })
  }

  const isExternal = banner.target_url.startsWith("http")

  const imgElement = (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height }}>
      <Image
        src={banner.image_url}
        alt={banner.title}
        fill
        className="object-cover transition-opacity hover:opacity-95"
        loading="lazy"
        unoptimized={!banner.image_url.startsWith('https://')}
      />
    </div>
  )

  if (isExternal) {
    return (
      <a
        href={banner.target_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block"
        aria-label={`${banner.title} (새 창에서 열림)`}
      >
        {imgElement}
      </a>
    )
  }

  return (
    <Link href={banner.target_url} onClick={handleClick} className="block" aria-label={banner.title}>
      {imgElement}
    </Link>
  )
})
