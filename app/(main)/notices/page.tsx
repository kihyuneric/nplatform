'use client'

/**
 * /notices — 소식 허브 (2026-08-17 재구성)
 *
 * 3개 탭: 공지사항 · 자주하는 질문 · 1:1 문의
 *   - 공지사항: 등록 건 없으면 빈 상태. 관리자 로그인 시 등록·수정·삭제 (/api/v1/notices CRUD)
 *   - 자주하는 질문: 정적 FAQ 아코디언
 *   - 1:1 문의: /api/v1/support 티켓 접수 (고객센터 기능은 1:1 문의만 유지)
 */

import { useEffect, useState } from 'react'
import { MckPageShell, MckPageHeader } from '@/components/mck'
import { useAuth } from '@/components/auth/auth-provider'
import { ChevronDown, Plus, Pencil, Trash2, Send, CheckCircle2 } from 'lucide-react'

const INK = '#0A1628'
const ELECTRIC = '#2251FF'

type Notice = { id: string; title: string; content: string; created_at?: string; is_pinned?: boolean }
type Tab = 'notice' | 'faq' | 'inquiry'

const FAQS: { q: string; a: string }[] = [
  { q: '회원가입은 유료인가요?', a: '아니요. 엔플랫폼은 승인제 무료 가입입니다. 가입 신청 후 관리자 승인(1~2영업일)이 완료되면 모든 기능을 무료로 이용할 수 있습니다.' },
  { q: '왜 리스트에 일부 물건만 보이나요?', a: '엔플랫폼은 매입조건에 매칭되는 딜만 선별해 공개하는 프라이빗 플랫폼입니다. 매입조건을 등록하시면 조건에 맞는 딜을 1:1로 소개받을 수 있습니다.' },
  { q: '물건의 정확한 주소·서류는 언제 볼 수 있나요?', a: '리스트에서는 지역·유형·면적·감정가·총 채권액·수익권금액(채권최고액)·협의가까지만 공개됩니다. 온라인 NDA 체결 후 정확한 주소·감정평가서·채권 정보·매각 기관 정보가 공개됩니다.' },
  { q: 'NPL 매각의뢰는 어떻게 하나요?', a: '보유 부실채권·부동산 리스트를 자체 양식 또는 엔플랫폼 표준 양식으로 파일 첨부해 접수하시면, 운영진이 등록을 대행하고 민감정보를 비식별화 처리해 등재합니다.' },
  { q: '매입조건은 여러 개 등록할 수 있나요?', a: '네. 지역·유형·면적·금액대별로 우선순위를 정해 여러 조건을 등록할 수 있으며, 우선순위 1부터 순서대로 매칭해 소개해 드립니다.' },
  { q: '거래는 어떻게 진행되나요?', a: 'NDA·상담 요청 시 엔플랫폼이 1차 미팅을 진행하고, 이후 금융기관과의 2차 미팅·협의로 연결합니다. 가격 협의 후 매매계약 체결로 딜을 완결합니다.' },
]

export default function NoticesPage() {
  const { user } = useAuth()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(String(user?.role ?? '').toUpperCase())
  const [tab, setTab] = useState<Tab>('notice')

  // ── 공지사항 ──
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Notice | null>(null)   // null=닫힘, id=''=신규
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadNotices = () => {
    fetch('/api/v1/notices?limit=50')
      .then(r => r.json())
      .then(d => setNotices((Array.isArray(d.data) ? d.data : []).map((n: Record<string, unknown>) => ({
        id: String(n.id),
        title: String(n.title ?? ''),
        content: String(n.content ?? ''),
        created_at: n.created_at ? String(n.created_at).slice(0, 10) : undefined,
        is_pinned: !!n.is_pinned,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(loadNotices, [])

  const openEditor = (n?: Notice) => {
    setEditing(n ?? { id: '', title: '', content: '' })
    setDraftTitle(n?.title ?? '')
    setDraftContent(n?.content ?? '')
  }

  const saveNotice = async () => {
    if (!draftTitle.trim()) return
    setSaving(true)
    try {
      if (editing && editing.id) {
        await fetch(`/api/v1/notices?id=${encodeURIComponent(editing.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: draftTitle.trim(), content: draftContent.trim() }),
        })
      } else {
        await fetch('/api/v1/notices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: draftTitle.trim(), content: draftContent.trim(), category: '공지' }),
        })
      }
      setEditing(null)
      loadNotices()
    } finally {
      setSaving(false)
    }
  }

  const deleteNotice = async (id: string) => {
    if (!confirm('이 공지를 삭제할까요?')) return
    await fetch(`/api/v1/notices?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    loadNotices()
  }

  // ── 1:1 문의 ──
  const [inq, setInq] = useState({ name: '', phone: '', email: '', message: '' })
  const [inqSending, setInqSending] = useState(false)
  const [inqDone, setInqDone] = useState(false)

  const submitInquiry = async () => {
    if (!inq.name.trim() || !inq.message.trim()) return
    setInqSending(true)
    try {
      await fetch('/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[1:1 문의] ${inq.name}`,
          category: '일반',
          priority: 'MEDIUM',
          description: [`이름: ${inq.name}`, inq.phone && `연락처: ${inq.phone}`, inq.email && `이메일: ${inq.email}`, '', inq.message].filter(Boolean).join('\n'),
        }),
      }).catch(() => {})
      setInqDone(true)
    } finally {
      setInqSending(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]'

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        eyebrow="Announcements · 소식"
        title="공지사항"
        subtitle="공지사항 · 자주하는 질문 · 1:1 문의를 한곳에서."
      />

      <div className="max-w-[880px] mx-auto px-6 py-10">
        {/* 탭 */}
        <div className="flex gap-1 mb-8 border-b border-[var(--color-border-subtle)]">
          {([['notice', '공지사항'], ['faq', '자주하는 질문'], ['inquiry', '1:1 문의']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-5 py-3 text-sm font-bold transition-colors"
              style={{
                color: tab === key ? INK : 'var(--color-text-muted)',
                borderBottom: tab === key ? `2px solid ${ELECTRIC}` : '2px solid transparent',
                marginBottom: -1,
                background: 'transparent', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid',
                borderBottomColor: tab === key ? ELECTRIC : 'transparent',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── 공지사항 ── */}
        {tab === 'notice' && (
          <div className="space-y-3">
            {isAdmin && (
              <div className="flex justify-end">
                <button
                  onClick={() => openEditor()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white"
                  style={{ background: INK, borderTop: `2px solid ${ELECTRIC}`, cursor: 'pointer', border: 'none' }}
                >
                  <Plus size={13} /> 공지 등록
                </button>
              </div>
            )}

            {/* 편집 폼 (관리자) */}
            {isAdmin && editing && (
              <div className="p-4 border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] space-y-3" style={{ borderTop: `2px solid ${ELECTRIC}` }}>
                <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="공지 제목" className={inputCls} />
                <textarea value={draftContent} onChange={e => setDraftContent(e.target.value)} placeholder="공지 내용" rows={5} className={inputCls + ' resize-y'} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-secondary)]" style={{ background: 'transparent', cursor: 'pointer' }}>취소</button>
                  <button onClick={() => void saveNotice()} disabled={saving} className="px-4 py-2 text-xs font-bold text-white" style={{ background: INK, borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                    {saving ? '저장 중…' : editing.id ? '수정 저장' : '등록'}
                  </button>
                </div>
              </div>
            )}

            {loading && <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</p>}

            {!loading && notices.length === 0 && (
              <div className="py-16 text-center border border-dashed border-[var(--color-border-default)]">
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">등록된 공지가 없습니다</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">새 소식이 등록되면 이곳에 표시됩니다.</p>
              </div>
            )}

            {notices.map(n => (
              <div key={n.id} className="border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
                <button
                  onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--color-text-primary)]">
                      {n.is_pinned && <span style={{ color: ELECTRIC }}>[고정] </span>}{n.title}
                    </span>
                    {n.created_at && <span className="block mt-0.5 text-[11px] text-[var(--color-text-muted)] tabular-nums">{n.created_at}</span>}
                  </span>
                  <ChevronDown size={15} style={{ flexShrink: 0, transform: expanded === n.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'var(--color-text-muted)' }} />
                </button>
                {expanded === n.id && (
                  <div className="px-4 pb-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap border-t border-[var(--color-border-subtle)] pt-3">
                    {n.content || '내용 없음'}
                    {isAdmin && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => openEditor(n)} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]" style={{ background: 'transparent', cursor: 'pointer' }}>
                          <Pencil size={11} /> 수정
                        </button>
                        <button onClick={() => void deleteNotice(n.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold border border-red-300 text-red-600" style={{ background: 'transparent', cursor: 'pointer' }}>
                          <Trash2 size={11} /> 삭제
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 자주하는 질문 ── */}
        {tab === 'faq' && (
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
                <button
                  onClick={() => setExpanded(expanded === `faq-${i}` ? null : `faq-${i}`)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">Q. {f.q}</span>
                  <ChevronDown size={15} style={{ flexShrink: 0, transform: expanded === `faq-${i}` ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'var(--color-text-muted)' }} />
                </button>
                {expanded === `faq-${i}` && (
                  <div className="px-4 pb-4 pt-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)] border-t border-[var(--color-border-subtle)]">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 1:1 문의 ── */}
        {tab === 'inquiry' && (
          inqDone ? (
            <div className="py-16 text-center">
              <CheckCircle2 size={36} className="mx-auto mb-3" style={{ color: ELECTRIC }} />
              <p className="text-base font-bold text-[var(--color-text-primary)]">문의가 접수되었습니다</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">운영진이 확인 후 1~2영업일 내 연락드립니다.</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-[560px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={inq.name} onChange={e => setInq({ ...inq, name: e.target.value })} placeholder="이름 *" className={inputCls} />
                <input value={inq.phone} onChange={e => setInq({ ...inq, phone: e.target.value })} placeholder="연락처" className={inputCls} />
              </div>
              <input value={inq.email} onChange={e => setInq({ ...inq, email: e.target.value })} placeholder="이메일" type="email" className={inputCls} />
              <textarea value={inq.message} onChange={e => setInq({ ...inq, message: e.target.value })} placeholder="문의 내용 * — NPL 매각·매입·NDA 등 무엇이든 남겨주세요" rows={6} className={inputCls + ' resize-y'} />
              <button
                onClick={() => void submitInquiry()}
                disabled={inqSending || !inq.name.trim() || !inq.message.trim()}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-extrabold text-white"
                style={{ background: INK, borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: 'pointer', opacity: inqSending ? 0.6 : 1 }}
              >
                <Send size={14} /> {inqSending ? '접수 중…' : '문의 접수하기'}
              </button>
              <p className="text-[11px] text-[var(--color-text-muted)]">접수된 문의는 운영진만 열람하며, 상담 목적으로만 사용됩니다.</p>
            </div>
          )
        )}
      </div>
    </MckPageShell>
  )
}
