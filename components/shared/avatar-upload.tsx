"use client"

import { useState, useRef } from "react"
import { Camera, User } from "lucide-react"
import { toast } from "sonner"

interface AvatarUploadProps {
  currentImage?: string | null
  name: string
  size?: "sm" | "md" | "lg"
  editable?: boolean
  onUpload?: (url: string) => void
}

const SIZE_MAP = {
  sm: { container: "h-10 w-10", text: "text-sm", icon: "h-3 w-3", camera: "p-1" },
  md: { container: "h-16 w-16", text: "text-xl", icon: "h-4 w-4", camera: "p-1.5" },
  lg: { container: "h-24 w-24", text: "text-3xl", icon: "h-5 w-5", camera: "p-2" },
}

export function AvatarUpload({
  currentImage,
  name,
  size = "md",
  editable = false,
  onUpload,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const s = SIZE_MAP[size]

  const initial = name ? name.charAt(0).toUpperCase() : "?"

  function handleClick() {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("JPG, PNG, WEBP 형식만 업로드할 수 있습니다.")
      return
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.")
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setPreview(dataUrl)
      onUpload?.(dataUrl)
      toast.success("프로필 사진이 업로드되었습니다.")
    }
    reader.readAsDataURL(file)

    // Reset input so the same file can be re-selected
    e.target.value = ""
  }

  return (
    <div
      className={`relative group ${editable ? "cursor-pointer" : ""}`}
      onClick={handleClick}
    >
      {/* Avatar circle */}
      <div
        className={`${s.container} shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#1B3A5C] to-[#2E75B6] text-white font-bold ${s.text}`}
      >
        {preview ? (
          <img
            src={preview}
            alt={`${name} 프로필`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {/* Camera overlay on hover (editable only) */}
      {editable && (
        <div className="absolute bottom-0 right-0">
          <div
            className={`${s.camera} bg-[var(--color-surface-overlay)] rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <Camera className={`${s.icon} text-[var(--color-text-secondary)]`} />
          </div>
        </div>
      )}

      {/* Hidden file input */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  )
}
