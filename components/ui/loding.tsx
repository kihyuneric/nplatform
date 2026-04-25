"use client"

interface Logo3DProps {
  isAnimating?: boolean
}

export default function Logo3D({ isAnimating = false }: Logo3DProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className={`w-16 h-16 rounded-full border-4 border-stone-300/30 border-t-cyan-500 ${
          isAnimating ? "animate-spin" : "animate-[spin_3s_linear_infinite]"
        }`}
      />
    </div>
  )
}
