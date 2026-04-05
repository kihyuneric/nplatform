'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X, Scan } from 'lucide-react'

type DocumentType = '감정평가서' | '등기부등본' | '임차인현황표' | '채권소개자료' | '부동산소개자료'
type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

interface DocumentUploadProps {
  documentTypes: DocumentType[]
  onExtracted: (data: Record<string, unknown>, type: DocumentType) => void
}

export default function DocumentUpload({ documentTypes, onExtracted }: DocumentUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [selectedType, setSelectedType] = useState<DocumentType>(documentTypes[0])
  const [fileName, setFileName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [extractedFields, setExtractedFields] = useState<Record<string, unknown> | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setStatus('error')
      setErrorMessage('PDF, JPG, PNG, WEBP 파일만 지원합니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error')
      setErrorMessage('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setFileName(file.name)
    setStatus('uploading')
    setErrorMessage('')
    setExtractedFields(null)

    try {
      setStatus('processing')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', selectedType)

      const res = await fetch('/api/npl/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'OCR 처리 실패' }))
        throw new Error(err.error || `OCR 실패 (${res.status})`)
      }

      const result = await res.json()
      setExtractedFields(result.extracted_data)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.')
    }
  }, [selectedType])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    if (e.target) e.target.value = ''
  }, [processFile])

  const handleApply = useCallback(() => {
    if (extractedFields) {
      onExtracted(extractedFields, selectedType)
      setStatus('idle')
      setExtractedFields(null)
      setFileName('')
    }
  }, [extractedFields, selectedType, onExtracted])

  const handleReset = useCallback(() => {
    setStatus('idle')
    setExtractedFields(null)
    setFileName('')
    setErrorMessage('')
  }, [])

  const fieldLabels: Record<string, string> = {
    appraisal_value: '감정가', address: '소재지', land_area: '토지면적',
    building_area: '건물면적', property_type: '물건종류', appraisal_date: '감정일자',
    case_number: '사건번호', court_name: '법원', minimum_price: '최저가',
    ai_estimated_value: 'AI시세', auction_count: '유찰횟수', next_auction_date: '매각기일',
    property_composition: '물건구성', rights: '권리목록', tenants: '임차인목록',
    tenant_name: '임차인명', deposit: '보증금', monthly_rent: '월세',
    move_in_date: '전입일', has_opposition_right: '대항력',
    right_type: '권리종류', right_holder: '권리자', claim_amount: '채권액',
    max_claim_amount: '채권최고액', registration_date: '설정일',
  }

  function formatValue(key: string, val: unknown): string {
    if (val === null || val === undefined) return '-'
    if (Array.isArray(val)) return `${val.length}건`
    if (typeof val === 'boolean') return val ? '있음' : '없음'
    if (typeof val === 'number') {
      if (key.includes('area')) return `${val}m²`
      if (key.includes('rate')) return `${(val * 100).toFixed(1)}%`
      if (val >= 10000) return `${(val / 100000000).toFixed(2)}억원`
      return val.toLocaleString()
    }
    return String(val)
  }

  return (
    <Card className="mb-4 border-dashed border-2 border-gray-200 bg-gray-50/50">
      <CardContent className="p-4">
        {/* 문서 타입 선택 */}
        {documentTypes.length > 1 && status === 'idle' && (
          <div className="mb-3 flex flex-wrap gap-2">
            {documentTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-[#1B3A5C] text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* 상태별 UI */}
        {status === 'idle' && (
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
              isDragging ? 'border-[#1B3A5C] bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label={`${selectedType} 문서를 업로드하세요`}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
          >
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">
              {selectedType} 문서를 드래그하거나 클릭하여 업로드
            </p>
            <p className="mt-1 text-xs text-gray-400">PDF, JPG, PNG (최대 10MB)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="파일 선택"
            />
          </div>
        )}

        {status === 'processing' && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-[#1B3A5C]" />
            <div>
              <p className="text-sm font-medium text-[#1B3A5C]">
                <Scan className="mr-1 inline h-4 w-4" />
                OCR 분석 중...
              </p>
              <p className="text-xs text-gray-500">{fileName} — AI가 문서를 분석하고 있습니다 (약 5~15초)</p>
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div className="flex items-center gap-3 rounded-lg bg-gray-100 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            <p className="text-sm text-gray-600">업로드 중... {fileName}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">{errorMessage}</p>
                <Button variant="ghost" size="sm" onClick={handleReset} className="mt-2 text-xs text-red-600 hover:text-red-800">
                  다시 시도
                </Button>
              </div>
            </div>
          </div>
        )}

        {status === 'success' && extractedFields && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">추출 완료</span>
                <Badge variant="outline" className="text-xs">{selectedType}</Badge>
              </div>
              <button onClick={handleReset} aria-label="닫기" className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 추출 결과 미리보기 */}
            <div className="rounded-lg border bg-white p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(extractedFields).map(([key, val]) => {
                  if (Array.isArray(val)) {
                    return (
                      <div key={key} className="col-span-full">
                        <span className="text-xs text-gray-500">{fieldLabels[key] || key}</span>
                        <span className="ml-2 text-sm font-medium">{val.length}건 추출됨</span>
                      </div>
                    )
                  }
                  return (
                    <div key={key}>
                      <span className="text-xs text-gray-500">{fieldLabels[key] || key}</span>
                      <p className="text-sm font-medium">{formatValue(key, val)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApply} size="sm" className="bg-[#1B3A5C] hover:bg-[#152d48]">
                <FileText className="mr-1 h-3.5 w-3.5" />
                폼에 적용
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                취소
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
