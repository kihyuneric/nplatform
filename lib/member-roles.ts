/**
 * member-roles — 복수 역할 회원 모델 헬퍼 (D1 · 2026-08-18)
 *
 * 회원은 매각 회원(SELLER)이면서 동시에 매입 회원(BUYER)일 수 있다.
 * SoT: auth user_metadata.roles (배열) → 없으면 단일 role 로 폴백.
 * buyer_kind: CORP(법인) / INDIVIDUAL(개인자산가).
 */

const BUYER_ALIASES = ['BUYER', 'BUYER_INST', 'BUYER_INDV', 'INVESTOR']

/** metadata → 보유 역할 배열 (정규화: SELLER / BUYER / PARTNER / ADMIN / VIEWER) */
export function getMemberRoles(meta: Record<string, unknown> | null | undefined): string[] {
  if (!meta) return []
  const raw: string[] = Array.isArray(meta.roles)
    ? (meta.roles as string[])
    : meta.role ? [String(meta.role)] : []
  const norm = new Set<string>()
  for (const r of raw) {
    const u = String(r).toUpperCase()
    if (BUYER_ALIASES.includes(u)) norm.add('BUYER')
    else if (u === 'SUPER_ADMIN') norm.add('ADMIN')
    else if (u) norm.add(u)
  }
  return [...norm]
}

export function hasRole(meta: Record<string, unknown> | null | undefined, role: string): boolean {
  return getMemberRoles(meta).includes(role.toUpperCase())
}

/** 매입 세부유형 — CORP(법인) / INDIVIDUAL(개인자산가) */
export function getBuyerKind(meta: Record<string, unknown> | null | undefined): 'CORP' | 'INDIVIDUAL' | '' {
  const k = String(meta?.buyer_kind ?? '').toUpperCase()
  if (k === 'CORP' || k === 'INDIVIDUAL') return k
  // legacy 폴백 — BUYER_INST=법인 · BUYER_INDV=개인
  const r = String(meta?.role ?? '').toUpperCase()
  if (r === 'BUYER_INST') return 'CORP'
  if (r === 'BUYER_INDV' || r === 'INVESTOR') return 'INDIVIDUAL'
  return ''
}
