"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ImagePlus, X, GripVertical, AlertCircle } from "lucide-react"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_IMAGES = 10

interface ImageItem {
  id: string
  dataUrl: string
  name: string
  size: number
}

interface ImageUploadProps {
  value: ImageItem[]
  onChange: (images: ImageItem[]) => void
}

function generateId() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export type { ImageItem }

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null)
      const files = Array.from(fileList)

      // Validate count
      if (value.length + files.length > MAX_IMAGES) {
        setError(`최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다.`)
        return
      }

      // Validate each file
      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError("JPG, PNG, WebP 파일만 업로드할 수 있습니다.")
          return
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`파일 크기는 5MB 이하여야 합니다. (${file.name})`)
          return
        }
      }

      setUploading(true)
      setUploadProgress(0)

      const newImages: ImageItem[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const dataUrl = await readFileAsDataUrl(file)
        newImages.push({
          id: generateId(),
          dataUrl,
          name: file.name,
          size: file.size,
        })
        setUploadProgress(Math.round(((i + 1) / files.length) * 100))
      }

      onChange([...value, ...newImages])
      setUploading(false)
      setUploadProgress(0)
    },
    [value, onChange]
  )

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [processFiles]
  )

  const handleRemove = (id: string) => {
    onChange(value.filter((img) => img.id !== id))
  }

  // Reorder drag handlers
  const handleReorderDragStart = (idx: number) => {
    setDragIdx(idx)
  }

  const handleReorderDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  const handleReorderDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }
    const items = [...value]
    const [moved] = items.splice(dragIdx, 1)
    items.splice(targetIdx, 0, moved)
    onChange(items)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? "border-[#14161A] bg-stone-100/10"
            : "border-[var(--color-border-subtle)] hover:border-[var(--color-text-muted)]"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files)
            e.target.value = ""
          }}
        />
        <ImagePlus className="w-10 h-10 mx-auto text-[var(--color-text-muted)] mb-3" />
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          이미지를 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          JPG, PNG, WebP (최대 5MB, {MAX_IMAGES}장)
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          {value.length}/{MAX_IMAGES}장 업로드됨
        </p>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span>업로드 중...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-stone-100/10 rounded-lg text-sm text-stone-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Thumbnails */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {value.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleReorderDragStart(idx)}
              onDragOver={(e) => handleReorderDragOver(e, idx)}
              onDrop={(e) => handleReorderDrop(e, idx)}
              onDragEnd={() => {
                setDragIdx(null)
                setDragOverIdx(null)
              }}
              className={`relative group rounded-lg border overflow-hidden aspect-square ${
                dragOverIdx === idx
                  ? "border-[#14161A] border-2"
                  : "border-[var(--color-border-subtle)]"
              } ${dragIdx === idx ? "opacity-50" : ""}`}
            >
              <img
                src={img.dataUrl}
                alt={img.name}
                className="w-full h-full object-cover"
              />
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <div className="hidden group-hover:flex items-center gap-1">
                  <GripVertical className="w-5 h-5 text-white cursor-grab" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(img.id)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {/* Badge for first image */}
              {idx === 0 && (
                <span className="absolute top-1 left-1 text-[10px] bg-[#1B3A5C] text-white px-1.5 py-0.5 rounded">
                  대표
                </span>
              )}
              {/* File size */}
              <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 text-white px-1 py-0.5 rounded">
                {(img.size / 1024 / 1024).toFixed(1)}MB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
