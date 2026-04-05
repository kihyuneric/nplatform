"use client"

import { useState, useRef, useCallback } from "react"
import {
  Bold, Italic, Underline, List, ListOrdered,
  ImagePlus, Link2, Quote, Heading1, Heading2,
  AlignLeft, AlignCenter, Minus, X, Loader2,
  Type,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  maxImages?: number
}

interface InlineImage {
  id: string
  src: string
  alt: string
  caption: string
}

const TOOLBAR_GROUPS = [
  {
    items: [
      { icon: Heading1, command: "h1", label: "제목 1" },
      { icon: Heading2, command: "h2", label: "제목 2" },
      { icon: Type, command: "p", label: "본문" },
    ],
  },
  {
    items: [
      { icon: Bold, command: "bold", label: "굵게" },
      { icon: Italic, command: "italic", label: "기울임" },
      { icon: Underline, command: "underline", label: "밑줄" },
    ],
  },
  {
    items: [
      { icon: List, command: "ul", label: "목록" },
      { icon: ListOrdered, command: "ol", label: "번호 목록" },
      { icon: Quote, command: "quote", label: "인용" },
    ],
  },
  {
    items: [
      { icon: AlignLeft, command: "left", label: "왼쪽 정렬" },
      { icon: AlignCenter, command: "center", label: "가운데 정렬" },
      { icon: Minus, command: "hr", label: "구분선" },
    ],
  },
]

export function RichEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  minHeight = 400,
  maxImages = 10,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<InlineImage[]>([])
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [showImageCaption, setShowImageCaption] = useState<string | null>(null)

  const execCommand = useCallback((command: string) => {
    const editor = editorRef.current
    if (!editor) return

    editor.focus()

    switch (command) {
      case "bold":
        document.execCommand("bold", false)
        break
      case "italic":
        document.execCommand("italic", false)
        break
      case "underline":
        document.execCommand("underline", false)
        break
      case "ul":
        document.execCommand("insertUnorderedList", false)
        break
      case "ol":
        document.execCommand("insertOrderedList", false)
        break
      case "quote":
        document.execCommand("formatBlock", false, "blockquote")
        break
      case "h1":
        document.execCommand("formatBlock", false, "h1")
        break
      case "h2":
        document.execCommand("formatBlock", false, "h2")
        break
      case "p":
        document.execCommand("formatBlock", false, "p")
        break
      case "left":
        document.execCommand("justifyLeft", false)
        break
      case "center":
        document.execCommand("justifyCenter", false)
        break
      case "hr":
        document.execCommand("insertHorizontalRule", false)
        break
    }

    // Sync content
    syncContent()
  }, [])

  const syncContent = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handleImageUpload = useCallback(async (files: FileList) => {
    if (images.length >= maxImages) {
      toast.error(`이미지는 최대 ${maxImages}장까지 삽입할 수 있습니다.`)
      return
    }

    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: 이미지 파일만 가능합니다.`)
        continue
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: 5MB 이하 파일만 가능합니다.`)
        continue
      }

      // Read as data URL for preview
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })

      const imgId = `img-${Date.now()}-${i}`

      // Insert image into editor at cursor position
      const editor = editorRef.current
      if (editor) {
        editor.focus()

        const imgHtml = `
          <div class="rich-editor-image" data-image-id="${imgId}" contenteditable="false" style="margin: 16px 0; text-align: center;">
            <img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; border-radius: 8px; cursor: pointer;" />
            <p style="margin-top: 4px; font-size: 12px; color: #9ca3af; font-style: italic;" contenteditable="true" data-placeholder="이미지 설명을 입력하세요"></p>
          </div>
          <p><br/></p>
        `
        document.execCommand("insertHTML", false, imgHtml)
      }

      setImages((prev) => [...prev, { id: imgId, src: dataUrl, alt: file.name, caption: "" }])
    }

    setUploading(false)
    syncContent()

    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [images, maxImages, syncContent])

  const handleInsertLink = useCallback(() => {
    if (!linkUrl.trim()) return

    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`
    document.execCommand("createLink", false, url)

    setLinkUrl("")
    setShowLinkInput(false)
    syncContent()
  }, [linkUrl, syncContent])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) {
          const dt = new DataTransfer()
          dt.items.add(file)
          handleImageUpload(dt.files)
        }
        return
      }
    }
  }, [handleImageUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files)
    }
  }, [handleImageUpload])

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-gray-50 px-2 py-1.5 dark:bg-gray-800 dark:border-gray-700">
        {TOOLBAR_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {group.items.map((item) => (
              <button
                key={item.command}
                type="button"
                onClick={() => execCommand(item.command)}
                title={item.label}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
              >
                <item.icon className="h-4 w-4" />
              </button>
            ))}
            {gi < TOOLBAR_GROUPS.length - 1 && (
              <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" />
            )}
          </div>
        ))}

        {/* Image button */}
        <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="이미지 삽입"
          className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </button>

        {/* Link button */}
        <button
          type="button"
          onClick={() => setShowLinkInput(!showLinkInput)}
          title="링크 삽입"
          className="rounded p-1.5 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          <Link2 className="h-4 w-4" />
        </button>

        {/* Image count */}
        {images.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
            이미지 {images.length}/{maxImages}
          </span>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Link input bar */}
      {showLinkInput && (
        <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-2 dark:bg-gray-800 dark:border-gray-700">
          <Link2 className="h-4 w-4 text-gray-400" />
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-8 text-sm flex-1 dark:bg-gray-700 dark:border-gray-600"
            onKeyDown={(e) => e.key === "Enter" && handleInsertLink()}
          />
          <Button size="sm" className="h-8 bg-[#1B3A5C]" onClick={handleInsertLink}>
            삽입
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowLinkInput(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        data-placeholder={placeholder}
        className="rich-editor-content prose prose-sm max-w-none p-4 focus:outline-none dark:prose-invert dark:bg-gray-900 dark:text-gray-200"
        style={{ minHeight }}
      />

      {/* Drag hint */}
      <div className="border-t bg-gray-50 px-3 py-1.5 text-xs text-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500">
        이미지를 드래그하거나 클립보드에서 붙여넣기(Ctrl+V)할 수 있습니다 &middot; Markdown 미지원
      </div>
    </div>
  )
}
