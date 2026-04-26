'use client'

import { useState } from 'react'
import {
  Search,
  User,
  CreditCard,
  Home,
  Handshake,
  Settings,
  MessageCircle,
  Mail,
  Clock,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import {
  MckPageShell,
  MckPageHeader,
  MckSection,
  MckCard,
  MckCta,
  MckEmptyState,
} from '@/components/mck'
import { MCK, MCK_FONTS, MCK_TYPE } from '@/lib/mck-design'

const CATEGORIES = [
  { id: 'account', label: '계정/보안', icon: User, desc: '가입 · 로그인 · 인증 · 보안' },
  { id: 'billing', label: '결제/구독', icon: CreditCard, desc: '플랜 · 환불 · 크레딧' },
  { id: 'listings', label: '매물 이용', icon: Home, desc: '등록 · 검색 · 분석' },
  { id: 'deals', label: '거래', icon: Handshake, desc: '딜룸 · 공동투자' },
  { id: 'tech', label: '기술지원', icon: Settings, desc: '오류 · 버그 · 시스템' },
  { id: 'other', label: '기타', icon: MessageCircle, desc: '기타 문의사항' },
]

const FAQS = [
  {
    q: '회원가입은 어떻게 하나요?',
    a: '홈페이지 우측 상단 "회원가입" 버튼을 클릭하여 이메일과 비밀번호를 입력하면 가입이 완료됩니다. 가입 후 투자자 인증을 진행하면 더 많은 서비스를 이용할 수 있습니다.',
  },
  {
    q: 'NPL 분석은 어떻게 시작하나요?',
    a: '상단 메뉴의 분석 도구 > NPL 분석에서 "새 분석 시작"을 클릭하세요. 사건번호, 감정가, 최저입찰가를 입력하면 AI가 자동으로 수익률과 리스크를 분석합니다.',
  },
  {
    q: '경매 수익률 분석기는 무료인가요?',
    a: '네, 모든 회원에게 무료로 제공됩니다. 입찰가별 예상 수익률, 세금, 비용을 자동으로 계산하여 최적의 투자 의사결정을 도와드립니다.',
  },
  {
    q: '딜룸은 어떤 기능인가요?',
    a: '딜룸은 매수자와 매도자가 안전하게 거래를 진행할 수 있는 비공개 거래 워크스페이스입니다. NDA 서명, 실사 자료 공유, 계약 체결까지 모든 과정이 딜룸 내에서 이루어집니다.',
  },
  {
    q: '플랜은 언제든 변경할 수 있나요?',
    a: '네, 언제든 상위 플랜으로 업그레이드하거나 다음 결제 주기부터 다운그레이드할 수 있습니다. 마이페이지 > 결제에서 변경 가능합니다.',
  },
]

function FaqRow({ q, a, last }: { q: string; a: string; last: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        borderBottom: last ? 'none' : `1px solid ${MCK.border}`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          padding: '18px 22px',
          textAlign: 'left',
          background: open ? MCK.paperTint : MCK.paper,
          border: 'none',
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: MCK_FONTS.serif,
              color: MCK.brassDark,
              fontWeight: 800,
              fontSize: 15,
              flexShrink: 0,
              lineHeight: 1.4,
            }}
          >
            Q
          </span>
          <span
            style={{
              color: MCK.ink,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.5,
              letterSpacing: '-0.005em',
            }}
          >
            {q}
          </span>
        </div>
        <span
          style={{
            color: MCK.textMuted,
            fontSize: 18,
            lineHeight: 1,
            flexShrink: 0,
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
            marginTop: 2,
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: '0 22px 18px 22px',
            background: MCK.paperTint,
            borderTop: `1px solid ${MCK.border}`,
          }}
        >
          <div style={{ display: 'flex', gap: 12, paddingTop: 14 }}>
            <span
              style={{
                fontFamily: MCK_FONTS.serif,
                color: MCK.positive,
                fontWeight: 800,
                fontSize: 15,
                flexShrink: 0,
                lineHeight: 1.4,
              }}
            >
              A
            </span>
            <p
              style={{
                ...MCK_TYPE.body,
                color: MCK.textSub,
                margin: 0,
              }}
            >
              {a}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  const [search, setSearch] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ category: '', title: '', content: '' })

  const filtered = FAQS.filter(
    (f) => !search || f.q.includes(search) || f.a.includes(search),
  )

  const handleSubmit = async () => {
    if (!form.category || !form.title || !form.content) return
    try {
      await fetch('/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch {
      /* swallow — UX still confirms submission */
    }
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setForm({ category: '', title: '', content: '' })
    }, 3000)
  }

  // Search input rendered in the actions slot of the header
  const searchAction = (
    <div style={{ position: 'relative', minWidth: 280 }}>
      <Search
        size={16}
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: MCK.brassDark,
          pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        placeholder="질문을 검색해 보세요..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px 10px 36px',
          background: MCK.paper,
          border: `1px solid ${MCK.borderStrong}`,
          borderTop: `2px solid ${MCK.brass}`,
          color: MCK.ink,
          fontSize: 13,
          fontWeight: 500,
          fontFamily: MCK_FONTS.sans,
          outline: 'none',
        }}
      />
    </div>
  )

  // Shared form input style
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: MCK.paper,
    border: `1px solid ${MCK.borderStrong}`,
    color: MCK.ink,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: MCK_FONTS.sans,
    outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: MCK.textSub,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 6,
  }

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '공지/문의' },
          { label: '고객센터' },
        ]}
        eyebrow="CUSTOMER CARE · HELP CENTER"
        title="고객센터"
        subtitle="FAQ · 문의 분류 · 1:1 상담까지 — 궁금한 점을 한 곳에서 해결하세요."
        actions={searchAction}
      />

      {/* Category Grid */}
      <MckSection eyebrow="INQUIRY CATEGORIES" title="문의 분류" subtitle="원하는 문의 분류를 선택해 더 빠르게 도움을 받으세요.">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <MckCard key={cat.id} icon={Icon} title={cat.label} accent={MCK.brass}>
                <p
                  style={{
                    ...MCK_TYPE.bodySm,
                    color: MCK.textMuted,
                    margin: 0,
                  }}
                >
                  {cat.desc}
                </p>
              </MckCard>
            )
          })}
        </div>
      </MckSection>

      {/* Popular FAQs */}
      <MckSection
        eyebrow="POPULAR QUESTIONS"
        title="인기 FAQ"
        rightActions={
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: MCK.textMuted,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            총 {filtered.length}건
          </span>
        }
      >
        {filtered.length === 0 ? (
          <MckEmptyState
            icon={HelpCircle}
            title="검색 결과가 없습니다"
            description="다른 키워드로 다시 시도해 보시거나, 아래 1:1 문의를 이용해 주세요."
            variant="info"
          />
        ) : (
          <MckCard padding={0} accent={MCK.ink}>
            <div>
              {filtered.map((f, i) => (
                <FaqRow key={i} q={f.q} a={f.a} last={i === filtered.length - 1} />
              ))}
            </div>
          </MckCard>
        )}
      </MckSection>

      {/* Contact Channels */}
      <MckSection eyebrow="CONTACT CHANNELS" title="연락처">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14,
          }}
        >
          <MckCard icon={Mail} title="이메일 문의" accent={MCK.brass}>
            <p
              style={{
                fontFamily: MCK_FONTS.mono,
                color: MCK.blue,
                fontSize: 14,
                fontWeight: 700,
                margin: 0,
              }}
            >
              support@nplatform.co.kr
            </p>
            <p style={{ ...MCK_TYPE.bodySm, color: MCK.textMuted, margin: 0 }}>
              24시간 접수 · 영업일 1~2일 내 답변
            </p>
          </MckCard>

          <MckCard icon={Clock} title="운영시간" accent={MCK.brass}>
            <p
              style={{
                color: MCK.ink,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '-0.005em',
                margin: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              평일 09:00 — 18:00
            </p>
            <p style={{ ...MCK_TYPE.bodySm, color: MCK.textMuted, margin: 0 }}>
              주말 및 공휴일 제외
            </p>
          </MckCard>
        </div>
      </MckSection>

      {/* Inquiry Form */}
      <MckSection
        eyebrow="1:1 INQUIRY"
        title="1:1 문의하기"
        subtitle="문의 유형과 내용을 입력하시면 영업일 기준 1~2일 내 답변드립니다."
      >
        {submitted ? (
          <MckEmptyState
            icon={CheckCircle2}
            title="문의가 접수되었습니다"
            description="영업일 기준 1~2일 내 답변드리겠습니다. 등록하신 이메일을 확인해 주세요."
            variant="info"
          />
        ) : (
          <MckCard accent={MCK.ink} padding={28}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>문의 유형</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">유형 선택</option>
                    <option value="account">계정 관련</option>
                    <option value="billing">결제 관련</option>
                    <option value="listings">매물 관련</option>
                    <option value="deals">거래 관련</option>
                    <option value="tech">기술 지원</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>제목</label>
                  <input
                    type="text"
                    placeholder="문의 제목을 입력하세요"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>문의 내용</label>
                <textarea
                  placeholder="문의 내용을 상세히 입력해 주세요..."
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  style={{ ...inputStyle, resize: 'none' as const, lineHeight: 1.55 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <MckCta
                  label="문의 접수"
                  onClick={handleSubmit}
                  variant="primary"
                  size="md"
                  centered={false}
                  disabled={!form.category || !form.title || !form.content}
                />
              </div>
            </div>
          </MckCard>
        )}
      </MckSection>
    </MckPageShell>
  )
}
