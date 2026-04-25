"use client"
import { useState, useRef, type ReactNode } from "react"
import { Heart, X } from "lucide-react"

interface SwipeCardProps {
  children: ReactNode
  onSwipeLeft?: () => void  // Pass
  onSwipeRight?: () => void // Like
}

export function SwipeCard({ children, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const [offset, setOffset] = useState(0)
  const [swiped, setSwiped] = useState<"left" | "right" | null>(null)
  const startX = useRef(0)
  const threshold = 100

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
  const handleTouchMove = (e: React.TouchEvent) => { setOffset(e.touches[0].clientX - startX.current) }
  const handleTouchEnd = () => {
    if (offset > threshold) { setSwiped("right"); onSwipeRight?.() }
    else if (offset < -threshold) { setSwiped("left"); onSwipeLeft?.() }
    else { setOffset(0) }
  }

  if (swiped) return null

  return (
    <div
      className="relative touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${offset}px) rotate(${offset * 0.05}deg)`,
        transition: offset === 0 ? "transform 0.3s" : "none",
      }}
    >
      {/* Swipe indicators */}
      {offset > 30 && (
        <div className="absolute top-4 right-4 z-10 rounded-full bg-[#14161A] p-2 shadow-lg">
          <Heart className="h-6 w-6 text-white" />
        </div>
      )}
      {offset < -30 && (
        <div className="absolute top-4 left-4 z-10 rounded-full bg-stone-100 p-2 shadow-lg">
          <X className="h-6 w-6 text-white" />
        </div>
      )}
      {children}
    </div>
  )
}
