'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Upload,
  FileText,
  BarChart3,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Table2,
} from 'lucide-react'
import { parsePythonFile, parseExcelFile, parseCsvFile, type ParsedTranscript } from '@/lib/file-parsers'

interface CoverageStats {
  total_videos: number
  total_mappings: number
  covered_concepts: number
  total_concepts: number
  coverage_rate: number
}

interface MappingResult {
  concept_id: number
  concept_name: string
  relevance: number
  reason: string
  matched_keywords: string[]
}

interface StructureSegment {
  segment_type: string
  start_pct: number
  end_pct: number
  text_preview: string
  confidence: number
}

interface CaseReference {
  type: string
  number: string
  court?: string
  context: string
}

interface AnalysisResponse {
  success: boolean
  youtube_id: number
  mapped_concepts_count: number
  analysis: {
    total_chunks: number
    analyzed_at: string
    mappings: MappingResult[]
    lecture_type?: string
    lecture_type_scores?: Record<string, number>
    structure?: StructureSegment[]
    case_references?: CaseReference[]
    hooking_ratio?: number
    information_ratio?: number
    case_ratio?: number
    cta_ratio?: number
  }
}

interface HistoryItem {
  youtube_id: number
  title: string
  channel_name: string
  created_at: string
  concept_count: number
}

export default function UploadPage() {
  const [stats, setStats] = useState<CoverageStats | null>(null)
  const [title, setTitle] = useState('')
  const [channelName, setChannelName] = useState('')
  const [videoId, setVideoId] = useState('')
  const [transcript, setTranscript] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [reanalyzing, setReanalyzing] = useState(false)
  const [reanalyzeResult, setReanalyzeResult] = useState<{ reanalyzed: number; errors: string[] } | null>(null)
  const [excelPreview, setExcelPreview] = useState<ParsedTranscript[] | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadStats = () => {
    fetch('/api/ontology/youtube/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
  }

  const loadHistory = () => {
    fetch('/api/ontology/youtube?page=1&limit=20')
      .then((r) => r.json())
      .then((data) => setHistory(data.videos || []))
      .catch(console.error)
  }

  useEffect(() => {
    loadStats()
    loadHistory()
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'xlsx' || ext === 'csv') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const data = ev.target?.result as ArrayBuffer
        const rows = ext === 'csv' ? parseCsvFile(data) : parseExcelFile(data)
        setExcelPreview(rows)
        setSelectedRows(new Set(rows.map((_, i) => i)))
      }
      reader.readAsArrayBuffer(file)
    } else if (ext === 'py') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const parsed = parsePythonFile(text, file.name)
        setTranscript(parsed.transcript)
        if (!title) setTitle(parsed.title)
      }
      reader.readAsText(file)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        setTranscript(text)
        if (!title) setTitle(file.name.replace(/\.(txt|srt|vtt)$/, ''))
      }
      reader.readAsText(file)
    }
    // Reset file input
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleBulkUpload = async () => {
    if (!excelPreview || selectedRows.size === 0) return
    setBulkUploading(true)
    const selected = excelPreview.filter((_, i) => selectedRows.has(i))
    setBulkProgress({ current: 0, total: selected.length })

    const CHUNK_SIZE = 50
    for (let i = 0; i < selected.length; i += CHUNK_SIZE) {
      const chunk = selected.slice(i, i + CHUNK_SIZE)
      try {
        await fetch('/api/ontology/youtube/bulk-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videos: chunk }),
        })
      } catch (err) {
        console.error('Bulk upload chunk error:', err)
      }
      setBulkProgress({ current: Math.min(i + CHUNK_SIZE, selected.length), total: selected.length })
    }

    setBulkUploading(false)
    setBulkProgress(null)
    setExcelPreview(null)
    loadStats()
    loadHistory()
  }

  const handleSubmit = async (force = false) => {
    if (!title.trim() || !transcript.trim()) {
      setError('제목과 대본 텍스트를 입력해주세요.')
      return
    }
    setUploading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ontology/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          channel_name: channelName.trim() || undefined,
          video_id: videoId.trim() || undefined,
          transcript: transcript.trim(),
          force,
        }),
      })
      const data = await res.json()
      if (res.status === 409 && data.error === 'duplicate') {
        setUploading(false)
        const existing = data.existing
        if (confirm(`이미 등록된 영상입니다: "${existing.title}"\n계속 업로드하시겠습니까?`)) {
          handleSubmit(true)
        }
        return
      }
      if (!res.ok) throw new Error(data.error || '업로드 실패')
      setResult(data)
      setTitle('')
      setChannelName('')
      setVideoId('')
      setTranscript('')
      loadStats()
      loadHistory()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (youtubeId: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await fetch(`/api/ontology/youtube/${youtubeId}`, { method: 'DELETE' })
      loadStats()
      loadHistory()
    } catch (err) {
      console.error(err)
    }
  }

  const handleReanalyze = async () => {
    if (!confirm('모든 영상을 재분석합니다. 시간이 걸릴 수 있습니다. 계속하시겠습니까?')) return
    setReanalyzing(true)
    setReanalyzeResult(null)
    try {
      const res = await fetch('/api/ontology/youtube/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '재분석 실패')
      setReanalyzeResult({ reanalyzed: data.reanalyzed, errors: data.errors || [] })
      loadStats()
      loadHistory()
    } catch (err: any) {
      setReanalyzeResult({ reanalyzed: 0, errors: [err.message] })
    } finally {
      setReanalyzing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">YouTube 대본 분석</h1>

      {/* Coverage Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MiniStat label="업로드 영상" value={stats.total_videos} />
          <MiniStat label="총 매핑" value={stats.total_mappings} />
          <MiniStat label="커버 개념" value={stats.covered_concepts} />
          <MiniStat label="전체 개념" value={stats.total_concepts} />
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-2xl font-bold text-stone-900">
              {stats.coverage_rate}%
            </p>
            <p className="text-xs text-gray-500">커버리지</p>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(stats.coverage_rate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reanalyze Button */}
      {stats && stats.total_videos > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-white rounded-lg hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${reanalyzing ? 'animate-spin' : ''}`} />
            {reanalyzing ? '재분석 중...' : `전체 재분석 (${stats.total_videos}개 영상)`}
          </button>
          {reanalyzeResult && (
            <span className={`text-sm ${reanalyzeResult.errors.length > 0 ? 'text-stone-900' : 'text-stone-900'}`}>
              {reanalyzeResult.reanalyzed}개 재분석 완료
              {reanalyzeResult.errors.length > 0 && ` (오류 ${reanalyzeResult.errors.length}건)`}
            </span>
          )}
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="w-5 h-5 text-stone-900" />
          대본 업로드
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="영상 제목 *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <input
            type="text"
            placeholder="채널명"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <input
            type="text"
            placeholder="YouTube Video ID"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
        </div>

        <textarea
          placeholder="대본 텍스트를 붙여넣기 하거나 파일을 업로드하세요..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y"
        />

        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            파일 업로드 (.txt, .srt, .vtt, .py, .xlsx, .csv)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.srt,.vtt,.py,.xlsx,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="flex-1" />
          <button
            onClick={() => handleSubmit()}
            disabled={uploading || !title.trim() || !transcript.trim()}
            className="px-6 py-2 bg-stone-100 text-white rounded-lg text-sm font-medium hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            {uploading ? '분석 중...' : '분석 시작'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-stone-900 text-sm bg-stone-100 p-3 rounded-lg">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Excel Preview */}
      {excelPreview && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Table2 className="w-5 h-5 text-stone-900" />
              엑셀 데이터 미리보기 ({excelPreview.length}건)
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (selectedRows.size === excelPreview.length) setSelectedRows(new Set())
                  else setSelectedRows(new Set(excelPreview.map((_, i) => i)))
                }}
                className="text-xs text-stone-900 hover:underline"
              >
                {selectedRows.size === excelPreview.length ? '전체 해제' : '전체 선택'}
              </button>
              <span className="text-xs text-gray-500">{selectedRows.size}건 선택됨</span>
            </div>
          </div>

          <div className="max-h-72 overflow-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === excelPreview.length}
                      onChange={() => {
                        if (selectedRows.size === excelPreview.length) setSelectedRows(new Set())
                        else setSelectedRows(new Set(excelPreview.map((_, i) => i)))
                      }}
                    />
                  </th>
                  <th className="px-3 py-2 text-left">제목</th>
                  <th className="px-3 py-2 text-left">채널명</th>
                  <th className="px-3 py-2 text-left">대본 미리보기</th>
                  <th className="px-3 py-2 text-left">게시일</th>
                </tr>
              </thead>
              <tbody>
                {excelPreview.map((row, i) => (
                  <tr key={i} className={`border-t ${selectedRows.has(i) ? 'bg-stone-100/50' : ''}`}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(i)}
                        onChange={() => {
                          setSelectedRows(prev => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            return next
                          })
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium max-w-[200px] truncate">{row.title}</td>
                    <td className="px-3 py-2 text-gray-500">{row.channel_name || '-'}</td>
                    <td className="px-3 py-2 text-gray-400 max-w-[250px] truncate">{row.transcript.slice(0, 50)}...</td>
                    <td className="px-3 py-2 text-gray-400">{row.published_at || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bulkProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>업로드 중...</span>
                <span>{bulkProgress.current} / {bulkProgress.total}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-100 rounded-full transition-all"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkUpload}
              disabled={bulkUploading || selectedRows.size === 0}
              className="px-4 py-2 bg-stone-100 text-white rounded-lg text-sm font-medium hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bulkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {bulkUploading ? '업로드 중...' : `${selectedRows.size}건 일괄 업로드`}
            </button>
            <button
              onClick={() => setExcelPreview(null)}
              disabled={bulkUploading}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-stone-900" />
              분석 결과 — {result.mapped_concepts_count}개 개념 매핑됨
            </h2>
            <p className="text-sm text-gray-500">
              {result.analysis.total_chunks}개 청크 분석 |{' '}
              {new Date(result.analysis.analyzed_at).toLocaleString('ko-KR')}
            </p>

            {/* Lecture Type Badges */}
            {result.analysis.lecture_type && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">강의 유형</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.analysis.lecture_type_scores || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, score]) => {
                      const styles: Record<string, { bg: string; text: string }> = {
                        informational: { bg: 'bg-stone-100', text: 'text-stone-900' },
                        case_study: { bg: 'bg-stone-100', text: 'text-stone-900' },
                        hooking: { bg: 'bg-stone-100', text: 'text-stone-900' },
                        knowhow: { bg: 'bg-stone-100', text: 'text-stone-900' },
                      }
                      const labels: Record<string, string> = {
                        informational: '정보성',
                        case_study: '사례',
                        hooking: '후킹',
                        knowhow: '노하우',
                      }
                      const s = styles[type] || { bg: 'bg-gray-100', text: 'text-gray-700' }
                      return (
                        <span
                          key={type}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium ${s.bg} ${s.text} ${type === result.analysis.lecture_type ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                        >
                          {labels[type] || type} {Math.round(score * 100)}%
                        </span>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Structure Timeline */}
            {result.analysis.structure && result.analysis.structure.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">구조 분석</h3>
                <div className="flex h-6 rounded-lg overflow-hidden border">
                  {result.analysis.structure.map((seg, i) => {
                    const colors: Record<string, string> = {
                      hooking_intro: 'bg-stone-100',
                      information_body: 'bg-stone-100',
                      case_example: 'bg-stone-100',
                      call_to_action: 'bg-stone-100',
                      summary: 'bg-stone-100',
                      transition: 'bg-gray-300',
                    }
                    const width = seg.end_pct - seg.start_pct
                    return (
                      <div
                        key={i}
                        className={`${colors[seg.segment_type] || 'bg-gray-300'} relative group`}
                        style={{ width: `${width}%` }}
                        title={seg.text_preview}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                          <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            {seg.segment_type.replace('_', ' ')} ({width}%)
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {[
                    { label: '후킹', color: 'bg-stone-100', value: result.analysis.hooking_ratio },
                    { label: '정보', color: 'bg-stone-100', value: result.analysis.information_ratio },
                    { label: '사례', color: 'bg-stone-100', value: result.analysis.case_ratio },
                    { label: 'CTA/요약', color: 'bg-stone-100', value: result.analysis.cta_ratio },
                  ].map(item => (
                    <span key={item.label} className="flex items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                      {item.label} {Math.round((item.value || 0) * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Case References */}
            {result.analysis.case_references && result.analysis.case_references.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  탐지된 사례 ({result.analysis.case_references.length}건)
                </h3>
                <div className="space-y-2">
                  {result.analysis.case_references.map((ref, i) => {
                    const typeLabels: Record<string, string> = {
                      auction: '경매', public_sale: '공매', court: '법원', address: '주소',
                    }
                    return (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-900">
                            {typeLabels[ref.type] || ref.type}
                          </span>
                          <span className="font-mono text-sm font-medium text-gray-700">{ref.number}</span>
                          {ref.court && <span className="text-xs text-gray-400">({ref.court})</span>}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{ref.context}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Concept Mappings */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">매핑된 개념</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {result.analysis.mappings
                  .sort((a, b) => b.relevance - a.relevance)
                  .map((m) => (
                    <div
                      key={m.concept_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {m.concept_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {m.matched_keywords?.join(', ')}
                        </p>
                      </div>
                      <div className="w-32">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-stone-100 rounded-full"
                            style={{
                              width: `${Math.round(m.relevance * 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 text-right mt-0.5">
                          {Math.round(m.relevance * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">업로드 히스토리</h2>
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.youtube_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.channel_name || '채널 미지정'} |{' '}
                    {item.concept_count || 0}개 개념 |{' '}
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.youtube_id)}
                  className="p-2 text-gray-400 hover:text-stone-900 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl p-4 border">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
