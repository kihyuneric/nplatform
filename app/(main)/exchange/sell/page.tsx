'use client'

/**
 * /exchange/sell — NPL 매각의뢰 진입 (2026-08-19 재작성) · 운영기획서 v4 §3-2-0, §3-3-0
 *
 * 입구는 하나, 방식은 둘.
 *   ● 직접 등록   — 세부내역 폼을 채운다 (엑셀 업로드 / 직접 입력 / OCR 로 채울 수 있다)
 *   ● 등록 대행   — 파일만 올리면 운영사가 대신 채워 등록한다
 *
 * 이전 버전은 연락처·메모만 받는 접수 폼이었고, **첨부 파일이 저장되지 않았다**
 * (선택만 되고 업로드 코드가 없어 파일명만 티켓 본문에 남았다).
 * 이제 두 경로 모두 `listing_intakes` 에 저장되고 파일은 Storage 에 실제로 올라간다.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileSpreadsheet, UploadCloud, ArrowRight, Loader2, CheckCircle2,
  ShieldCheck, Clock, Download, AlertCircle,
} from 'lucide-react'
import { MckPageHeader } from '@/components/mck/page-header'
import { AttachmentUploader } from '@/components/listing/attachment-uploader'
import type { Attachment } from '@/lib/listing-attachments'

const INK = '#0A1628'
const ELECTRIC = '#2251FF'
const INK_MID = 'rgba(5, 28, 44, 0.65)'
const INK_MUTED = 'rgba(5, 28, 44, 0.45)'
const BORDER = 'rgba(5, 28, 44, 0.12)'

const TEMPLATE_HREF = '/templates/NPLatform_매물등록_템플릿.xlsx'

type Mode = null | 'agency'

export default function SellIntakePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)

  // 로그인 회원 — 첨부 저장 경로의 최상위이자 접수 소유자
  const [me, setMe] = useState<{ id: string; email?: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setMe(d?.user ?? null))
      .catch(() => setMe(null))
      .finally(() => setAuthChecked(true))
  }, [])

  // 접수 ID 를 미리 만들어 둔다 — 파일을 이 폴더 아래로 올리기 위함
  const intakeId = useMemo(
    () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
    [],
  )

  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [memo, setMemo] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submitAgency = async () => {
    setError('')
    if (attachments.length === 0) {
      setError('파일을 1개 이상 올려주셔야 등록 대행을 진행할 수 있습니다.')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/v1/listing-intakes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: intakeId,
          mode: 'agency',
          attachments,
          contact_phone: phone,
          memo,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error?.message ?? `접수에 실패했습니다 (${r.status})`)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '접수에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 접수 완료 ──
  if (done) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <MckPageHeader eyebrow="NPL 매각의뢰" title="접수되었습니다" subtitle="" />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
          <div style={{ background: '#FFF', border: `1px solid ${BORDER}`, borderTop: `3px solid ${ELECTRIC}`, padding: '32px 28px' }}>
            <CheckCircle2 size={28} style={{ color: ELECTRIC }} />
            <h2 style={{ marginTop: 14, fontSize: 20, fontWeight: 900, color: INK, fontFamily: 'Georgia, serif' }}>
              등록 대행 요청이 접수되었습니다
            </h2>
            <p style={{ marginTop: 10, fontSize: 13.5, color: INK_MID, lineHeight: 1.7 }}>
              올려주신 파일 {attachments.length}건을 운영사가 확인하고 세부내역을 정리해 등록합니다.
              등록이 끝나면 <b>관리번호와 함께 알림·이메일</b>로 알려드립니다.
              내용에 수정이 필요하면 그때 바로 요청하실 수 있습니다.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/my/seller" style={btnPrimary}>내 매물로 이동 <ArrowRight size={13} /></Link>
              <Link href="/exchange" style={btnGhost}>NPL 자동매칭 둘러보기</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 방식 선택 ──
  if (mode === null) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <MckPageHeader
          eyebrow="NPL 매각의뢰"
          title="어떻게 등록하시겠습니까?"
          subtitle="두 방식 모두 같은 곳에 등록됩니다. 세부내역을 직접 채우실지, 운영사에 맡기실지만 고르시면 됩니다."
        />
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 80px' }}>
          {authChecked && !me && (
            <div style={{ marginBottom: 16, padding: '12px 14px', border: '1px solid rgba(225,29,72,0.35)', background: 'rgba(225,29,72,0.06)' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#9F1239' }}>
                매각의뢰는 로그인 후 접수할 수 있습니다.
              </span>
              <Link href="/login" style={{ marginLeft: 10, fontSize: 12.5, fontWeight: 800, color: ELECTRIC }}>로그인 →</Link>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            {/* 직접 등록 */}
            <button
              type="button"
              onClick={() => router.push('/exchange/sell/direct')}
              disabled={!me}
              style={{ ...card, cursor: me ? 'pointer' : 'not-allowed', opacity: me ? 1 : 0.55 }}
            >
              <FileSpreadsheet size={20} style={{ color: ELECTRIC }} />
              <h3 style={cardTitle}>직접 등록</h3>
              <p style={cardDesc}>
                NPL 세부내역을 직접 채웁니다. 엑셀 템플릿을 올리면 <b>폼이 자동으로 채워집니다.</b>
              </p>
              <ul style={cardList}>
                <li>엑셀 업로드 · 직접 입력 · 파일 OCR 중 선택</li>
                <li>담보물 사진 · 관련 서류 첨부</li>
                <li>필수 항목은 6개뿐 — 나머지는 나중에 보완 가능</li>
              </ul>
              <span style={cardMeta}><Clock size={11} /> 소요 10~15분 · 검토 후 바로 등록</span>
              <span style={cardCta}>직접 등록하기 <ArrowRight size={13} /></span>
            </button>

            {/* 등록 대행 */}
            <button
              type="button"
              onClick={() => setMode('agency')}
              disabled={!me}
              style={{ ...card, cursor: me ? 'pointer' : 'not-allowed', opacity: me ? 1 : 0.55 }}
            >
              <UploadCloud size={20} style={{ color: ELECTRIC }} />
              <h3 style={cardTitle}>등록 대행 요청</h3>
              <p style={cardDesc}>
                가지고 계신 <b>채권 파일만 올려주시면</b> 운영사가 내용을 정리해 등록해 드립니다.
              </p>
              <ul style={cardList}>
                <li>채권원장 · 감정평가서 · 등기부 무엇이든</li>
                <li>운영사가 확인 후 세부내역 작성</li>
                <li>등록되면 관리번호와 함께 알려드립니다</li>
              </ul>
              <span style={cardMeta}><Clock size={11} /> 소요 1분 · 영업일 1~2일 내 등록</span>
              <span style={cardCta}>파일만 올리기 <ArrowRight size={13} /></span>
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 12, color: INK_MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={13} /> 올려주신 자료는 운영사 검토용으로만 쓰이며, 채권기관·담당자 정보는 매입 회원에게 공개되지 않습니다.
          </p>
        </div>
      </div>
    )
  }

  // ── 등록 대행 요청 ──
  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <MckPageHeader
        eyebrow="NPL 매각의뢰 · 등록 대행"
        title="파일만 올려주세요"
        subtitle="운영사가 내용을 확인하고 세부내역을 정리해 등록합니다. 더 물어보지 않습니다."
      />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 80px' }}>
        <button type="button" onClick={() => setMode(null)} style={{ ...btnGhost, marginBottom: 16 }}>
          ← 등록 방식 다시 고르기
        </button>

        <div style={{ background: '#FFF', border: `1px solid ${BORDER}`, borderTop: `3px solid ${ELECTRIC}`, padding: '22px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: INK }}>채권 관련 파일</h3>
            <a href={TEMPLATE_HREF} style={{ ...btnGhost, textDecoration: 'none' }}>
              <Download size={12} /> 표준 양식 받기 (선택)
            </a>
          </div>

          {me && (
            <AttachmentUploader
              ownerId={me.id}
              intakeId={intakeId}
              value={attachments}
              onChange={setAttachments}
              disabled={submitting}
            />
          )}

          <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
            <label style={{ display: 'block' }}>
              <span style={labelStyle}>연락처 <span style={{ color: INK_MUTED, fontWeight: 500 }}>(선택 · 미입력 시 가입 정보로 연락드립니다)</span></span>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-1234-5678"
                style={inputStyle} disabled={submitting} />
            </label>
            <label style={{ display: 'block' }}>
              <span style={labelStyle}>전달사항 <span style={{ color: INK_MUTED, fontWeight: 500 }}>(선택)</span></span>
              <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3}
                placeholder="매각 희망 시기 · 채권 규모 · 그 밖에 알아두어야 할 내용"
                style={{ ...inputStyle, resize: 'vertical' }} disabled={submitting} />
            </label>
          </div>

          {error && (
            <p style={{ marginTop: 14, padding: '10px 12px', border: '1px solid rgba(225,29,72,0.35)', background: 'rgba(225,29,72,0.06)', fontSize: 12.5, fontWeight: 700, color: '#9F1239', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={13} /> {error}
            </p>
          )}

          <button type="button" onClick={() => void submitAgency()} disabled={submitting || !me}
            style={{ ...btnPrimary, width: '100%', marginTop: 18, justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? <><Loader2 size={14} className="animate-spin" /> 접수 중…</> : <>등록 대행 요청하기 <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 스타일 ───────────────────────────────────────────────
const card: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
  background: '#FFFFFF', border: `1px solid ${BORDER}`, borderTop: `3px solid ${ELECTRIC}`,
  padding: '22px 20px', textAlign: 'left',
}
const cardTitle: React.CSSProperties = { fontSize: 17, fontWeight: 900, color: INK, fontFamily: 'Georgia, serif' }
const cardDesc: React.CSSProperties = { fontSize: 13, color: INK_MID, lineHeight: 1.6 }
const cardList: React.CSSProperties = { margin: '4px 0 0 16px', padding: 0, fontSize: 12, color: INK_MID, lineHeight: 1.9, listStyle: 'disc' }
const cardMeta: React.CSSProperties = { marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: INK_MUTED }
const cardCta: React.CSSProperties = { marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 800, color: ELECTRIC }
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 18px',
  background: INK, color: '#FFFFFF', fontSize: 13, fontWeight: 800,
  border: 'none', borderTop: `2px solid ${ELECTRIC}`, cursor: 'pointer', textDecoration: 'none',
}
const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px',
  background: 'transparent', color: INK, fontSize: 12, fontWeight: 700,
  border: `1px solid ${BORDER}`, cursor: 'pointer', textDecoration: 'none',
}
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 700, color: INK }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', fontSize: 13, color: INK,
  border: `1px solid ${BORDER}`, background: '#FFFFFF', outline: 'none',
}
