"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadCSV } from "@/lib/excel-export-utils"

interface ExcelExportProps {
  /** Array of objects to export */
  data: Record<string, any>[]
  /** Column definitions: key = data key, label = header label */
  columns: { key: string; label: string }[]
  /** Filename (without extension) */
  filename: string
  /** Button label */
  label?: string
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary"
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon"
  /** Disabled state */
  disabled?: boolean
}

export function ExcelExportButton({
  data,
  columns,
  filename,
  label = "Excel 내보내기",
  variant = "outline",
  size = "sm",
  disabled = false,
}: ExcelExportProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    if (!data || data.length === 0) return
    setExporting(true)

    try {
      const headers = columns.map((c) => c.label)
      const rows = data.map((row) =>
        columns.map((col) => {
          const val = row[col.key]
          if (val === undefined || val === null) return ""
          return val
        })
      )
      downloadCSV(filename, headers, rows)
    } finally {
      setTimeout(() => setExporting(false), 500)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || exporting || !data || data.length === 0}
    >
      <Download className="h-4 w-4 mr-1" />
      {exporting ? "내보내는 중..." : label}
    </Button>
  )
}
