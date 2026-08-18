'use client'

/**
 * InquiryWidget — 플로팅 1:1 문의 (2026-08-18)
 *
 * 기존 AI 챗봇 위젯 대체. 첨부 시안 기준:
 *   - 고객센터 유선 문의 박스 (02-555-2822 · 이용시간)
 *   - 문의 유형 없음 (삭제)
 *   - 문의내용 + 연락처 → 접수 (/api/v1/support '[1:1 문의]' 티켓 → 관리자 접수함 연동)
 */

import { useState } from 'react'
import { MessageSquare, X, CheckCircle2 } from 'lucide-react'

const INK = '#0A1628'
const ELECTRIC = '#2251FF'

export function InquiryWidget() {
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      await fetch('/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[1:1 문의] ${contact.trim() || '연락처 미기재'}`,
          category: '일반',
          priority: 'MEDIUM',
          description: [
            contact.trim() ? `연락처: ${contact.trim()}` : '',
            '',
            message.trim(),
          ].filter((v, i) => i === 1 || v !== '').join('\n'),
        }),
      }).catch(() => {})
      setDone(true)
      setMessage('')
      setContact('')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => { setOpen(v => !v); setDone(false) }}
        aria-label="1:1 문의"
        className="no-print"
        style={{
          position: 'fixed', right: 20, bottom: 84, zIndex: 90,
          width: 52, height: 52,
          background: ELECTRIC, borderTop: '3px solid #00A9F4',
          border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(34, 81, 255, 0.45)',
        }}
      >
        {open ? <X size={20} color="#FFFFFF" /> : <MessageSquare size={20} color="#FFFFFF" />}
      </button>

      {/* 패널 */}
      {open && (
        <div
          className="no-print"
          style={{
            position: 'fixed', right: 20, bottom: 148, zIndex: 90,
            width: 340, maxWidth: 'calc(100vw - 40px)',
            background: 'var(--color-surface-elevated, #FFFFFF)',
            border: '1px solid var(--color-border-default, rgba(5,28,44,0.15))',
            borderTop: `3px solid ${ELECTRIC}`,
            boxShadow: '0 24px 48px -12px rgba(5, 28, 44, 0.35)',
          }}
        >
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border-subtle, rgba(5,28,44,0.08))' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary, #0A1628)' }}>1:1 문의</span>
            <button onClick={() => setOpen(false)} aria-label="닫기" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #6B7280)', padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: 16 }}>
            {/* 유선 문의 박스 */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted, #6B7280)', marginBottom: 6 }}>고객센터 유선 문의</div>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 14px', marginBottom: 16,
                background: 'var(--color-surface-overlay, #F4F6F9)',
                border: '1px solid var(--color-border-subtle, rgba(5,28,44,0.08))',
              }}
            >
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 19, fontWeight: 800, color: 'var(--color-text-primary, #0A1628)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                02-555-2822
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary, #3A4A5C)', lineHeight: 1.5 }}>
                <b>이용시간</b><br />평일 09:30 ~ 19:30<br />주말 10:00 ~ 15:00
              </span>
            </div>

            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <CheckCircle2 size={30} style={{ color: ELECTRIC, margin: '0 auto 8px' }} />
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary, #0A1628)' }}>문의가 접수되었습니다</p>
                <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted, #6B7280)' }}>운영진 확인 후 1~2영업일 내 연락드립니다.</p>
              </div>
            ) : (
              <>
                {/* 연락처 */}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted, #6B7280)', marginBottom: 6 }}>연락처 (회신용)</div>
                <input
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="전화번호 또는 이메일"
                  style={{
                    width: '100%', padding: '10px 12px', marginBottom: 14,
                    fontSize: 13, fontWeight: 500,
                    background: 'var(--color-surface-elevated, #FFFFFF)',
                    color: 'var(--color-text-primary, #0A1628)',
                    border: '1px solid var(--color-border-default, rgba(5,28,44,0.20))',
                    outline: 'none',
                  }}
                />

                {/* 문의내용 — 유형 선택 없음 */}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted, #6B7280)', marginBottom: 6 }}>문의내용</div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  placeholder="엔플랫폼 이용 중에 생긴 불편한 사항이나 문의 사항을 남겨주세요. NPL 매각·매입·NDA 무엇이든 좋습니다."
                  style={{
                    width: '100%', padding: '10px 12px', marginBottom: 14,
                    fontSize: 13, fontWeight: 500, lineHeight: 1.55, resize: 'vertical',
                    background: 'var(--color-surface-elevated, #FFFFFF)',
                    color: 'var(--color-text-primary, #0A1628)',
                    border: '1px solid var(--color-border-default, rgba(5,28,44,0.20))',
                    outline: 'none',
                  }}
                />

                <button
                  onClick={() => void submit()}
                  disabled={sending || !message.trim()}
                  style={{
                    width: '100%', height: 44,
                    background: message.trim() ? INK : 'var(--color-surface-overlay, #E5E9EF)',
                    color: message.trim() ? '#FFFFFF' : 'var(--color-text-muted, #9AA3AF)',
                    borderTop: message.trim() ? `2px solid ${ELECTRIC}` : 'none',
                    border: 'none',
                    fontSize: 14, fontWeight: 800,
                    cursor: message.trim() ? 'pointer' : 'default',
                    opacity: sending ? 0.6 : 1,
                  }}
                >
                  {sending ? '접수 중…' : '접수'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
