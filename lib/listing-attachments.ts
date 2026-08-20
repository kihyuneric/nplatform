/**
 * 매물 첨부 규격 (SSoT · 2026-08-19) — 운영기획서 v4 §3-2-1
 *
 * 이전에는 파일을 고를 수는 있었지만 업로드 코드가 없어 **파일명만 남고 파일은 버려졌다.**
 * 이 모듈이 사진·서류의 종류·용량·개수 한도와 저장 경로 규칙을 한 곳에서 정한다.
 *
 * 공개 정책: 서류는 NDA 승인 전에는 **존재 여부조차 노출하지 않는다.**
 */

/** 첨부 종류 */
export type AttachmentKind =
  | 'photo'       // 담보물 사진
  | 'appraisal'   // 감정평가서
  | 'claim'       // 채권 서류 (채권원장·여신거래약정서)
  | 'registry'    // 등기부등본·토지대장
  | 'lease'       // 임대차계약서·확정일자 현황
  | 'etc'         // 기타

export const ATTACHMENT_KINDS: { key: AttachmentKind; label: string; hint: string }[] = [
  { key: 'photo',     label: '담보물 사진', hint: '외관·내부·주변 (자동매칭 카드에 노출)' },
  { key: 'appraisal', label: '감정평가서',  hint: '전문 또는 요약' },
  { key: 'claim',     label: '채권 서류',   hint: '채권원장 · 여신거래약정서' },
  { key: 'registry',  label: '등기 서류',   hint: '등기부등본 · 토지대장' },
  { key: 'lease',     label: '임대차 서류', hint: '임대차계약서 · 확정일자 현황' },
  { key: 'etc',       label: '기타',        hint: '현황조사서 등' },
]

export const KIND_LABEL: Record<AttachmentKind, string> =
  Object.fromEntries(ATTACHMENT_KINDS.map(k => [k.key, k.label])) as Record<AttachmentKind, string>

/** 저장된 첨부 1건 */
export type Attachment = {
  kind: AttachmentKind
  /** Storage 경로 (listing-files 버킷 기준) */
  path: string
  /** 원본 파일명 */
  name: string
  size: number
  /** 사진 정렬 순서 — 1번이 대표 사진 */
  order?: number
  uploaded_at?: string
}

// ── 한도 ────────────────────────────────────────────────
export const PHOTO_MAX_COUNT = 10
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024      // 10MB
export const DOC_MAX_COUNT = 20
export const DOC_MAX_BYTES = 30 * 1024 * 1024        // 30MB

const PHOTO_EXT = ['jpg', 'jpeg', 'png', 'webp']
const DOC_EXT = ['pdf', 'xlsx', 'xls', 'csv', 'docx', 'doc', 'hwp', 'hwpx', 'zip', 'jpg', 'jpeg', 'png']

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'
export const DOC_ACCEPT = '.pdf,.xlsx,.xls,.csv,.docx,.doc,.hwp,.hwpx,.zip,image/*'

const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

export const isPhoto = (a: Pick<Attachment, 'kind'>) => a.kind === 'photo'

/** 업로드 전 검증 — 통과하면 null, 아니면 사용자에게 보여줄 사유 */
export function validateFile(file: File, kind: AttachmentKind): string | null {
  const e = ext(file.name)
  if (kind === 'photo') {
    if (!PHOTO_EXT.includes(e)) return `사진은 ${PHOTO_EXT.join(' · ')} 만 올릴 수 있습니다`
    if (file.size > PHOTO_MAX_BYTES) return `사진은 장당 10MB 이하여야 합니다 (${fmtSize(file.size)})`
  } else {
    if (!DOC_EXT.includes(e)) return `지원하지 않는 형식입니다 (.${e})`
    if (file.size > DOC_MAX_BYTES) return `서류는 개당 30MB 이하여야 합니다 (${fmtSize(file.size)})`
  }
  return null
}

/** 개수 한도 검증 */
export function validateCount(current: Attachment[], kind: AttachmentKind, adding: number): string | null {
  const photos = current.filter(isPhoto).length
  const docs = current.length - photos
  if (kind === 'photo' && photos + adding > PHOTO_MAX_COUNT) {
    return `사진은 최대 ${PHOTO_MAX_COUNT}장까지 올릴 수 있습니다`
  }
  if (kind !== 'photo' && docs + adding > DOC_MAX_COUNT) {
    return `서류는 최대 ${DOC_MAX_COUNT}개까지 올릴 수 있습니다`
  }
  return null
}

export const fmtSize = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`

/**
 * 저장 경로 — `{소유자ID}/{접수ID}/{종류}/{시각}_{안전한이름}.{확장자}`
 *
 * 맨 앞이 소유자 ID여야 Storage 정책(본인 폴더만)이 동작한다.
 *
 * ⚠ 키는 **ASCII 로만** 만든다. 한글이 섞이면 Supabase Storage 가
 *   `Invalid key` 로 업로드를 거부한다(2026-08-19 실측).
 *   원본 파일명은 `Attachment.name` 에 따로 보관하므로 화면 표시에는 영향이 없다.
 */
export function buildPath(ownerId: string, intakeId: string, kind: AttachmentKind, fileName: string, stamp: number): string {
  const e = ext(fileName)
  const base = fileName
    .replace(/\.[^.]+$/, '')            // 확장자 분리
    .replace(/[^A-Za-z0-9._-]/g, '')    // ASCII 안전 문자만 남긴다
    .slice(0, 40)
  const safe = base || kind             // 한글만 있던 이름이면 종류로 대체
  return `${ownerId}/${intakeId}/${kind}/${stamp}_${safe}${e ? `.${e}` : ''}`
}

/** 대표 사진 = order 가 가장 작은 사진 */
export function coverPhoto(list: Attachment[]): Attachment | null {
  const photos = list.filter(isPhoto).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  return photos[0] ?? null
}
