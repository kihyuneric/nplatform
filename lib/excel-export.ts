import * as XLSX from 'xlsx'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  format?: (value: any) => string | number
}

/**
 * Export data to an Excel (.xlsx) file and trigger a browser download.
 *
 * @param data - Array of row objects
 * @param columns - Column definitions (header label, data key, optional width & formatter)
 * @param filename - Base filename (date suffix is appended automatically)
 * @param sheetName - Optional worksheet name (defaults to "Sheet1")
 */
export function exportToExcel(
  data: Record<string, any>[],
  columns: ExcelColumn[],
  filename: string,
  sheetName = 'Sheet1',
) {
  // Build rows: first the header row, then data rows
  const headerRow = columns.map((c) => c.header)

  const bodyRows = data.map((row) =>
    columns.map((col) => {
      const raw = row[col.key]
      if (raw === undefined || raw === null || raw === '') return ''
      if (col.format) return col.format(raw)
      // If the value looks numeric, keep it as a number so Excel treats it properly
      if (typeof raw === 'number') return raw
      const num = Number(raw)
      if (!isNaN(num) && String(raw).trim() !== '') return num
      return String(raw)
    }),
  )

  const wsData = [headerRow, ...bodyRows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Apply column widths (wch = width in characters)
  ws['!cols'] = columns.map((col) => ({ wch: col.width ?? 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Filename includes today's date
  const date = new Date().toISOString().slice(0, 10)
  const fullFilename = `${filename}_${date}.xlsx`

  XLSX.writeFile(wb, fullFilename)
}
