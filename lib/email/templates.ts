/**
 * Pure-HTML email templates for NPLatform transactional emails.
 * No external dependency — compatible with any email provider.
 *
 * Design: dark brand header (#0F172A), white body, accent #22C55E
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nplatform.kr'

// ─── Shared layout wrapper ────────────────────────────────────────────────────
function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#F8FAFC; color:#1E293B; }
  .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  .header { background:#0F172A; padding:28px 32px; text-align:center; }
  .header img { height:32px; }
  .header-title { color:#fff; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; margin:8px 0 0; opacity:0.6; }
  .body { padding:40px 32px; }
  h1 { font-size:22px; font-weight:700; color:#0F172A; margin:0 0 12px; }
  p { font-size:14px; line-height:1.7; color:#475569; margin:0 0 16px; }
  .btn { display:inline-block; background:#22C55E; color:#fff; font-size:14px; font-weight:600; text-decoration:none; padding:12px 28px; border-radius:8px; margin:8px 0 24px; }
  .divider { border:none; border-top:1px solid #E2E8F0; margin:24px 0; }
  .meta { font-size:12px; color:#94A3B8; }
  .badge { display:inline-block; background:#F0FDF4; color:#15803D; font-size:12px; font-weight:600; padding:3px 10px; border-radius:20px; border:1px solid #BBF7D0; }
  .badge-amber { background:#FFFBEB; color:#92400E; border-color:#FDE68A; }
  .badge-blue { background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE; }
  .info-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #F1F5F9; font-size:13px; }
  .info-label { color:#64748B; }
  .info-value { font-weight:600; color:#0F172A; }
  .footer { background:#F8FAFC; padding:20px 32px; text-align:center; font-size:12px; color:#94A3B8; }
  .footer a { color:#64748B; text-decoration:none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;">N<span style="color:#22C55E;">Platform</span></div>
    <div class="header-title">NPL 투자 플랫폼</div>
  </div>
  <div class="body">${body}</div>
  <div class="footer">
    <p style="margin:0 0 6px">© ${new Date().getFullYear()} TransFarmer Inc. All rights reserved.</p>
    <p style="margin:0"><a href="${BASE_URL}/terms/privacy">개인정보처리방침</a> · <a href="${BASE_URL}/terms/service">이용약관</a></p>
  </div>
</div>
</body>
</html>`
}

// ─── Template 1: Welcome / Email Verification ────────────────────────────────
export function welcomeEmail(opts: { name: string; verifyUrl: string }): { subject: string; html: string } {
  return {
    subject: '[NPLatform] 회원가입을 환영합니다 🎉',
    html: layout('NPLatform 가입 환영', `
      <h1>환영합니다, ${opts.name}님!</h1>
      <p>NPLatform에 가입해 주셔서 감사합니다. 아래 버튼을 클릭하여 이메일 인증을 완료하세요.</p>
      <a href="${opts.verifyUrl}" class="btn">이메일 인증하기</a>
      <hr class="divider" />
      <p class="meta">이 링크는 24시간 후 만료됩니다. 본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
    `),
  }
}

// ─── Template 2: KYC Status Update ───────────────────────────────────────────
export function kycStatusEmail(opts: { name: string; status: 'APPROVED' | 'REJECTED'; reason?: string; tier?: string }): { subject: string; html: string } {
  const approved = opts.status === 'APPROVED'
  return {
    subject: approved
      ? `[NPLatform] KYC 심사가 승인되었습니다 ✅`
      : `[NPLatform] KYC 심사 결과 안내`,
    html: layout('KYC 심사 결과', `
      <h1>KYC 심사 ${approved ? '승인' : '미승인'} 안내</h1>
      <p>${opts.name}님의 KYC(본인인증) 심사 결과를 안내드립니다.</p>
      <p>결과: <span class="badge ${approved ? '' : 'badge-amber'}">${approved ? '승인' : '미승인'}</span></p>
      ${approved ? `<p>투자자 등급이 <strong>${opts.tier ?? 'L1'}</strong>로 업그레이드되었습니다. 이제 더 많은 매물 정보에 접근하실 수 있습니다.</p>` : ''}
      ${!approved && opts.reason ? `<p>미승인 사유: ${opts.reason}</p>` : ''}
      <a href="${BASE_URL}/my/kyc" class="btn">${approved ? '매물 탐색하기' : 'KYC 재신청하기'}</a>
    `),
  }
}

// ─── Template 3: Deal Stage Change ───────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  ANNOUNCED: '공고 등록',
  INTEREST_EXPRESSED: '관심 표명',
  NDA_SIGNED: 'NDA 체결',
  DUE_DILIGENCE: '실사 진행',
  PRICE_NEGOTIATION: '가격 협상',
  CONTRACT_SIGNED: '계약 체결',
  CLOSED: '거래 완료',
  CANCELLED: '거래 취소',
}

export function dealStageEmail(opts: { name: string; dealTitle: string; stage: string; dealId: string }): { subject: string; html: string } {
  const stageLabel = STAGE_LABELS[opts.stage] ?? opts.stage
  return {
    subject: `[NPLatform] 거래 단계 변경: ${opts.dealTitle} → ${stageLabel}`,
    html: layout('거래 단계 업데이트', `
      <h1>거래 단계가 변경되었습니다</h1>
      <p>${opts.name}님이 참여 중인 거래의 단계가 업데이트되었습니다.</p>
      <div style="background:#F8FAFC;border-radius:8px;padding:20px;margin:16px 0">
        <div class="info-row"><span class="info-label">매물명</span><span class="info-value">${opts.dealTitle}</span></div>
        <div class="info-row" style="border:none"><span class="info-label">현재 단계</span><span class="info-value"><span class="badge badge-blue">${stageLabel}</span></span></div>
      </div>
      <a href="${BASE_URL}/deals/${opts.dealId}" class="btn">딜룸 확인하기</a>
    `),
  }
}

// ─── Template 4: New Listing Match ───────────────────────────────────────────
export function newListingMatchEmail(opts: { name: string; listingTitle: string; listingId: string; matchScore: number; claimAmount: number; region: string }): { subject: string; html: string } {
  const amt = opts.claimAmount >= 1e8
    ? `${(opts.claimAmount / 1e8).toFixed(1)}억원`
    : `${(opts.claimAmount / 10000).toFixed(0)}만원`
  return {
    subject: `[NPLatform] AI 매칭 알림: ${opts.listingTitle} (매칭점수 ${opts.matchScore}점)`,
    html: layout('AI 매칭 알림', `
      <h1>새 매물이 매칭되었습니다</h1>
      <p>${opts.name}님의 투자 수요와 매칭되는 새 매물이 등록되었습니다.</p>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:20px;margin:16px 0">
        <div class="info-row"><span class="info-label">매물명</span><span class="info-value">${opts.listingTitle}</span></div>
        <div class="info-row"><span class="info-label">지역</span><span class="info-value">${opts.region}</span></div>
        <div class="info-row"><span class="info-label">채권원금</span><span class="info-value">${amt}</span></div>
        <div class="info-row" style="border:none"><span class="info-label">AI 매칭 점수</span><span class="info-value" style="color:#15803D">${opts.matchScore}점 / 100점</span></div>
      </div>
      <a href="${BASE_URL}/exchange/${opts.listingId}" class="btn">매물 상세보기</a>
      <hr class="divider" />
      <p class="meta">알림 수신을 원하지 않으시면 <a href="${BASE_URL}/my/settings">알림 설정</a>에서 변경하세요.</p>
    `),
  }
}

// ─── Template 5: E-sign Complete ─────────────────────────────────────────────
export function esignCompleteEmail(opts: { name: string; documentTitle: string; documentHash: string; signedAt: string }): { subject: string; html: string } {
  return {
    subject: `[NPLatform] 전자서명 완료: ${opts.documentTitle}`,
    html: layout('전자서명 완료', `
      <h1>전자서명이 완료되었습니다</h1>
      <p>${opts.name}님의 전자서명이 성공적으로 등록되었습니다.</p>
      <div style="background:#F8FAFC;border-radius:8px;padding:20px;margin:16px 0">
        <div class="info-row"><span class="info-label">문서명</span><span class="info-value">${opts.documentTitle}</span></div>
        <div class="info-row"><span class="info-label">서명 일시</span><span class="info-value">${opts.signedAt}</span></div>
        <div class="info-row" style="border:none"><span class="info-label">문서 해시</span><span class="info-value" style="font-family:monospace;font-size:11px;word-break:break-all">${opts.documentHash.slice(0, 32)}…</span></div>
      </div>
      <p class="meta">이 서명은 SHA-256 해시 체인으로 무결성이 보장됩니다.</p>
    `),
  }
}

// ─── Template 6: Settlement Payout ───────────────────────────────────────────
export function settlementPayoutEmail(opts: { name: string; amount: number; invoiceId: string; paidAt: string }): { subject: string; html: string } {
  const amt = opts.amount >= 1e8
    ? `${(opts.amount / 1e8).toFixed(2)}억원`
    : `${opts.amount.toLocaleString('ko-KR')}원`
  return {
    subject: `[NPLatform] 정산 지급 완료: ${amt}`,
    html: layout('정산 지급 완료', `
      <h1>정산이 지급되었습니다</h1>
      <p>${opts.name}님, 수익 정산금이 등록된 계좌로 지급 처리되었습니다.</p>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:20px;margin:16px 0">
        <div class="info-row"><span class="info-label">지급 금액</span><span class="info-value" style="color:#15803D;font-size:16px">${amt}</span></div>
        <div class="info-row"><span class="info-label">인보이스 ID</span><span class="info-value">${opts.invoiceId}</span></div>
        <div class="info-row" style="border:none"><span class="info-label">처리 일시</span><span class="info-value">${opts.paidAt}</span></div>
      </div>
      <a href="${BASE_URL}/my/billing" class="btn">정산 내역 확인</a>
    `),
  }
}

// ─── Template 7: Password Reset ──────────────────────────────────────────────
export function passwordResetEmail(opts: { name: string; resetUrl: string }): { subject: string; html: string } {
  return {
    subject: '[NPLatform] 비밀번호 재설정 안내',
    html: layout('비밀번호 재설정', `
      <h1>비밀번호 재설정</h1>
      <p>${opts.name}님, 비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정하세요.</p>
      <a href="${opts.resetUrl}" class="btn">비밀번호 재설정</a>
      <hr class="divider" />
      <p class="meta">이 링크는 1시간 후 만료됩니다. 본인이 요청하지 않은 경우 즉시 고객센터에 문의하세요.</p>
    `),
  }
}

// ─── Template 8: System Notice ───────────────────────────────────────────────
export function systemNoticeEmail(opts: { name: string; title: string; body: string; ctaUrl?: string; ctaLabel?: string }): { subject: string; html: string } {
  return {
    subject: `[NPLatform] ${opts.title}`,
    html: layout(opts.title, `
      <h1>${opts.title}</h1>
      <p>${opts.name}님께 안내 드립니다.</p>
      <div style="background:#F8FAFC;border-radius:8px;padding:20px;margin:16px 0;font-size:14px;line-height:1.7;color:#334155">
        ${opts.body}
      </div>
      ${opts.ctaUrl ? `<a href="${opts.ctaUrl}" class="btn">${opts.ctaLabel ?? '확인하기'}</a>` : ''}
    `),
  }
}
