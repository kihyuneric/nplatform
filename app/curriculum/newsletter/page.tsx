'use client'

import { useState, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { Mail, Download, Send, Loader2, RefreshCw, X, Paperclip, BookOpen, Lightbulb, Users, BarChart3, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

interface Domain {
  domain_id: number
  name: string
}

interface HistoryItem {
  newsletter_id: number
  sent_at: string
  newsletter_type: string
  concept_id: number
  title: string
  status: string
  recipient_count: number | null
  error_message: string | null
}

const NEWSLETTER_TYPES = [
  { key: 'daily_lesson', label: '오늘의 학습', icon: BookOpen, description: '하나의 캡슐을 깊이 소개', color: 'purple' },
  { key: 'case_study', label: '사례 분석', icon: BarChart3, description: '캡슐의 사례를 AI가 종합 분석', color: 'blue' },
  { key: 'expert_compare', label: '전문가 비교', icon: Users, description: '하나의 주제에 대한 전문가 관점 비교', color: 'red' },
  { key: 'learning_tip', label: '학습 팁', icon: Lightbulb, description: '실전 팁과 체크리스트', color: 'amber' },
  { key: 'weekly_summary', label: '주간 요약', icon: Clock, description: '이번 주 콘텐츠 종합 + 트렌딩', color: 'green' },
] as const

const TYPE_LABEL_MAP: Record<string, string> = {
  daily_lesson: '오늘의 학습',
  case_study: '사례 분석',
  expert_compare: '전문가 비교',
  learning_tip: '학습 팁',
  weekly_summary: '주간 요약',
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  generated: { label: '생성됨', color: 'text-gray-600 bg-gray-100' },
  sent: { label: '발송완료', color: 'text-green-600 bg-green-100' },
  failed: { label: '실패', color: 'text-red-600 bg-red-100' },
}

const THEME_CHIPS = [
  '경매 입찰 전략', '등기부등본 읽는 법', '권리분석 핵심', '임대수익률 계산',
  '절세 전략', '부동산 시장 트렌드', '전세 vs 월세 비교', '낙찰가 분석법',
  '소형 아파트 투자', '상가 투자 주의점', '공매 vs 경매 차이', '부동산 법인 설립',
  '갭투자 리스크', '재개발·재건축 분석', 'NPL 투자 입문',
]

export default function NewsletterPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [selectedType, setSelectedType] = useState<string>('daily_lesson')
  const [domainFilter, setDomainFilter] = useState<number | ''>('')
  const [themeMode, setThemeMode] = useState<'concept' | 'theme'>('concept')
  const [theme, setTheme] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null)
  const [newsletterData, setNewsletterData] = useState<any>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [recipients, setRecipients] = useState('')
  const [attachPdf, setAttachPdf] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; failed: string[] } | null>(null)

  useEffect(() => {
    fetch('/api/ontology/domains')
      .then(r => r.json())
      .then(res => setDomains(res.domains || []))
      .catch(() => {})

    // Load history
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/ontology/newsletter/generate?days=30')
      const data = await res.json()
      setHistory(data.history || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setHtmlPreview(null)
    setSendResult(null)
    try {
      const res = await fetch('/api/ontology/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ai',
          type: selectedType,
          domain_id: themeMode === 'concept' ? (domainFilter || undefined) : undefined,
          theme: themeMode === 'theme' && theme.trim() ? theme.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성 실패')
      setHtmlPreview(data.html)
      setNewsletterData(data.newsletter)
      // Refresh history
      loadHistory()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const params = new URLSearchParams({ type: selectedType })
      if (domainFilter) params.set('domain_id', String(domainFilter))
      const res = await fetch(`/api/ontology/newsletter/export-pdf?${params}`)
      if (!res.ok) throw new Error('PDF 다운로드 실패')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `뉴스레터_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleSend = async () => {
    if (!recipients.trim()) return
    setSending(true)
    setSendResult(null)
    setError(null)
    try {
      const emailList = recipients.split(',').map(e => e.trim()).filter(Boolean)
      const res = await fetch('/api/ontology/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsletter_data: newsletterData,
          recipients: emailList,
          attach_pdf: attachPdf,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '발송 실패')
      setSendResult(data)
      loadHistory()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleRetry = async (item: HistoryItem) => {
    try {
      await fetch('/api/ontology/newsletter/generate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsletter_id: item.newsletter_id,
          status: 'generated',
          error_message: null,
        }),
      })
      loadHistory()
    } catch {}
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail className="w-6 h-6 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold dark:text-white">AI 뉴스레터 생성</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">온톨로지 기반 매일 교육 콘텐츠</p>
        </div>
      </div>

      {/* Content Type Selection */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">콘텐츠 유형</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {NEWSLETTER_TYPES.map(t => {
            const Icon = t.icon
            const isSelected = selectedType === t.key
            return (
              <button
                key={t.key}
                onClick={() => setSelectedType(t.key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-600'
                    : 'border-gray-100 hover:border-gray-200 text-gray-500 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{t.label}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight hidden md:block">{t.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 주제 선택 모드 + Config + Generate */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
        {/* 모드 토글 */}
        <div className="flex gap-2">
          <button
            onClick={() => setThemeMode('concept')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              themeMode === 'concept'
                ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-600'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'
            }`}
          >
            🏷️ 온톨로지 개념 기반
          </button>
          <button
            onClick={() => setThemeMode('theme')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              themeMode === 'theme'
                ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-600'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'
            }`}
          >
            ✏️ 자유 테마 작성
          </button>
        </div>

        {/* 개념 기반 모드 */}
        {themeMode === 'concept' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">도메인:</label>
            <select
              value={domainFilter}
              onChange={e => setDomainFilter(e.target.value ? Number(e.target.value) : '')}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">전체 (중요도 순 자동 선택)</option>
              {domains.map(d => (
                <option key={d.domain_id} value={d.domain_id}>{d.name}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400 dark:text-gray-500">온톨로지 분석 기반으로 오늘의 개념을 자동 선택합니다</span>
          </div>
        )}

        {/* 자유 테마 모드 */}
        {themeMode === 'theme' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={theme}
                onChange={e => setTheme(e.target.value)}
                placeholder="주제 직접 입력 (예: 경매 입찰 전략, 임대수익률 계산법...)"
                className="flex-1 text-sm border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-400"
                onKeyDown={e => e.key === 'Enter' && !generating && theme.trim() && handleGenerate()}
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">자주 쓰는 테마:</p>
              <div className="flex flex-wrap gap-1.5">
                {THEME_CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => setTheme(chip)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      theme === chip
                        ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium dark:bg-orange-950 dark:text-orange-300 dark:border-orange-600'
                        : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-orange-600 dark:hover:text-orange-400'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleGenerate}
            disabled={generating || (themeMode === 'theme' && !theme.trim())}
            className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            AI 뉴스레터 생성
          </button>
          {themeMode === 'theme' && !theme.trim() && (
            <span className="text-xs text-orange-500">테마를 입력하거나 선택해주세요</span>
          )}

          {htmlPreview && (
            <>
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                PDF
              </button>

              <button
                onClick={() => { setShowEmailModal(true); setSendResult(null) }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                이메일 발송
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Preview */}
      {generating && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">AI가 뉴스레터를 생성하고 있습니다...</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">온톨로지 컨텍스트 분석 + AI 콘텐츠 합성</p>
          </div>
        </div>
      )}

      {htmlPreview && !generating && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">AI 뉴스레터 미리보기</span>
            {newsletterData && (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {newsletterData.newsletter_type && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                    {TYPE_LABEL_MAP[newsletterData.newsletter_type] || newsletterData.newsletter_type}
                  </span>
                )}
                {newsletterData.target_capsule && (
                  <span>{newsletterData.target_capsule.capsule_title}</span>
                )}
                {newsletterData.ontology_context?.keywords?.length > 0 && (
                  <span>키워드: {newsletterData.ontology_context.keywords.slice(0, 3).join(', ')}</span>
                )}
              </div>
            )}
          </div>
          <div
            className="p-0"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlPreview) }}
            style={{ maxHeight: '80vh', overflow: 'auto' }}
          />
        </div>
      )}

      {!htmlPreview && !generating && (
        <div className="space-y-4">
          {/* Section header */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">샘플 뉴스레터 — AI가 생성하는 콘텐츠 예시</h2>
          </div>

          {/* Sample cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sample 1: 오늘의 학습 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  <BookOpen className="w-3 h-3" />
                  오늘의 학습
                </span>
                <span className="text-[10px] text-gray-400">daily_lesson</span>
              </div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug">
                등기부등본, 이것만 알면 됩니다
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                오늘은 부동산 투자의 필수 관문인 등기부등본 읽는 법을 알아봅니다. 많은 투자자들이 등기부등본을 처음 보면 복잡해 보인다고 느끼지만...
              </p>
              <div className="space-y-1">
                {['표제부: 소재지와 면적 확인', '갑구: 소유권 이전 이력 확인', '을구: 근저당권 등 부담 확인'].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                <div className="text-[10px] text-gray-400 space-y-0.5">
                  <div>중급 과정 15/47 · L2 심화</div>
                  <div>선수: 부동산 기초</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedType('daily_lesson')}
                className="w-full text-xs text-purple-600 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 transition-colors font-medium"
              >
                이 유형으로 생성
              </button>
            </div>

            {/* Sample 2: 사례 분석 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <BarChart3 className="w-3 h-3" />
                  사례 분석
                </span>
                <span className="text-[10px] text-gray-400">case_study</span>
              </div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug">
                낙찰 후 명도 성공 사례 분석
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                이번 사례는 실제 경매 낙찰 후 점유자 명도 과정에서 발생한 분쟁을 성공적으로 해결한 케이스입니다. NPLatform 전문가 8명이 동일한 유형의...
              </p>
              <div className="space-y-1">
                {['명도소송 vs 협의 명도 선택 기준', '점유자 보증금 처리 원칙', '명도 비용 예상 산정법'].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                <div className="text-[10px] text-gray-400 space-y-0.5">
                  <div>고급 과정 8/35 · L3 실전</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedType('case_study')}
                className="w-full text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors font-medium"
              >
                이 유형으로 생성
              </button>
            </div>

            {/* Sample 3: 전문가 비교 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3 hover:border-red-300 dark:hover:border-red-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <Users className="w-3 h-3" />
                  전문가 비교
                </span>
                <span className="text-[10px] text-gray-400">expert_compare</span>
              </div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug">
                권리분석, 전문가마다 다른 접근법
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                권리분석은 경매 투자의 핵심이지만, 전문가들 사이에서도 접근 방식에 차이가 있습니다. NPLatform 전문가 15명의 강의를 분석한 결과, 크게 두 가지...
              </p>
              <div className="space-y-1">
                {['안전 중심: 위험 요소 선별 후 입찰', '수익 중심: 권리 복잡도로 저가 낙찰 목표', '통합 관점: 상황에 따른 선택'].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                <div className="text-[10px] text-gray-400 space-y-0.5">
                  <div>중급 과정 22/47 · L2 심화</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedType('expert_compare')}
                className="w-full text-xs text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors font-medium"
              >
                이 유형으로 생성
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">자동 생성 방법</h3>
            <ul className="space-y-1.5">
              {[
                '온톨로지 엔진이 최근 발송하지 않은 캡슐 중 최적을 자동 선택',
                'AI가 선택된 유형에 맞춰 500~800자 본문 합성',
                '온톨로지 기반 학습 위치 정보 포함',
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">최근 발송 이력 (30일)</h2>
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <RotateCcw className={`w-3 h-3 ${historyLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">발송 이력이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="pb-2 pr-4">날짜</th>
                  <th className="pb-2 pr-4">유형</th>
                  <th className="pb-2 pr-4">제목</th>
                  <th className="pb-2 pr-4">상태</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => {
                  const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.generated
                  return (
                    <tr key={item.newsletter_id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(item.sent_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {TYPE_LABEL_MAP[item.newsletter_type] || item.newsletter_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                        {item.title}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusInfo.color}`}>
                          {item.status === 'sent' && <CheckCircle className="w-3 h-3" />}
                          {item.status === 'failed' && <XCircle className="w-3 h-3" />}
                          {statusInfo.label}
                          {item.recipient_count != null && item.status === 'sent' && ` (${item.recipient_count}명)`}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {item.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(item)}
                            className="text-xs text-purple-600 hover:text-purple-800"
                            title={item.error_message || '재시도'}
                          >
                            재시도
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold dark:text-white">이메일 발송</h2>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">수신자 이메일</label>
                <textarea
                  value={recipients}
                  onChange={e => setRecipients(e.target.value)}
                  placeholder="이메일 주소를 쉼표로 구분하여 입력..."
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 min-h-[80px] focus:ring-1 focus:ring-purple-400 outline-none resize-y bg-white dark:bg-gray-800 dark:text-gray-200"
                />
                <p className="text-xs text-gray-400 mt-1">여러 명에게 보내려면 쉼표(,)로 구분하세요</p>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={attachPdf}
                  onChange={e => setAttachPdf(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Paperclip className="w-3.5 h-3.5" />
                PDF 첨부
              </label>

              {sendResult && (
                <div className={`text-sm rounded-lg px-3 py-2 ${sendResult.failed.length > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                  {sendResult.sent}건 발송 완료
                  {sendResult.failed.length > 0 && ` · ${sendResult.failed.length}건 실패: ${sendResult.failed.join(', ')}`}
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
              )}

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  닫기
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !recipients.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  발송
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
