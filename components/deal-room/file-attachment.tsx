"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, File, FileText, Image, Table2, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────

export interface AttachedFile {
  name: string
  size: number
  type: string
  dataUrl: string
}

interface FileAttachmentProps {
  onFileSelect: (file: AttachedFile) => void
  onRemove?: () => void
  selectedFile?: AttachedFile | null
  maxSizeMB?: number
  className?: string
}

// ─── Helpers ─────────────────────────────────────────────

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
}

const ACCEPT_STRING = Object.entries(ACCEPTED_TYPES)
  .flatMap(([mime, exts]) => [mime, ...exts])
  .join(",")

function getFileIcon(type: string) {
  if (type === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />
  if (type.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />
  if (type.includes("spreadsheet") || type.includes("excel"))
    return <Table2 className="w-5 h-5 text-green-600" />
  if (type.includes("word") || type.includes("document"))
    return <FileText className="w-5 h-5 text-blue-700" />
  return <File className="w-5 h-5 text-gray-500" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIconColor(type: string): string {
  if (type === "application/pdf") return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
  if (type.startsWith("image/")) return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
  if (type.includes("spreadsheet") || type.includes("excel"))
    return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
  if (type.includes("word") || type.includes("document"))
    return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
  return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
}

// ─── Component ───────────────────────────────────────────

export function FileAttachment({
  onFileSelect,
  onRemove,
  selectedFile,
  maxSizeMB = 10,
  className,
}: FileAttachmentProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    (file: globalThis.File) => {
      setError(null)

      // Validate size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`파일 크기가 ${maxSizeMB}MB를 초과합니다.`)
        return
      }

      // Validate type
      const isAccepted = Object.entries(ACCEPTED_TYPES).some(
        ([mime, exts]) =>
          file.type === mime || exts.some((ext) => file.name.toLowerCase().endsWith(ext))
      )
      if (!isAccepted) {
        setError("PDF, 이미지, Excel, Word 파일만 업로드 가능합니다.")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        onFileSelect({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
        })
      }
      reader.readAsDataURL(file)
    },
    [maxSizeMB, onFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset so the same file can be re-selected
      e.target.value = ""
    },
    [processFile]
  )

  // ── Selected file preview ──
  if (selectedFile) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg border",
          getFileIconColor(selectedFile.type),
          className
        )}
      >
        {getFileIcon(selectedFile.type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
            {selectedFile.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(selectedFile.size)}
          </p>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  // ── Drop zone ──
  return (
    <div className={cn("space-y-1", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
          isDragging
            ? "border-[#2E75B6] bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-[#2E75B6] hover:bg-gray-50 dark:hover:bg-gray-800/50"
        )}
      >
        <Upload
          className={cn(
            "w-6 h-6",
            isDragging ? "text-[#2E75B6]" : "text-gray-400 dark:text-gray-500"
          )}
        />
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            파일을 드래그하거나 <span className="text-[#2E75B6] font-medium">클릭하여 선택</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            PDF, 이미지, Excel, Word (최대 {maxSizeMB}MB)
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}

// ─── Inline file preview (for message display) ──────────

export interface FileMetadata {
  name: string
  size: number
  type: string
  url: string
}

export function FilePreview({ file }: { file: FileMetadata }) {
  return (
    <a
      href={file.url}
      download={file.name}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border mt-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer",
        getFileIconColor(file.type)
      )}
    >
      {getFileIcon(file.type)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
      </div>
    </a>
  )
}
