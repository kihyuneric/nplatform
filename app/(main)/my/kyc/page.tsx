"use client"

/**
 * /my/kyc — 투자자 인증 (사업자등록증 · 명함)
 *
 * 목적
 *   회원가입 시 업로드한 사업자등록증/명함을 한 곳에서 확인 · 다운로드 · 교체.
 *   관리자 승인 결과(PENDING / APPROVED / REJECTED) 를 동일한 카드에 표시.
 *
 * 데이터 흐름
 *   - GET  /api/v1/users/me/kyc-documents  → 본인 문서 (signup → /api/v1/users/documents 와 동일 store)
 *   - POST /api/v1/users/me/kyc-documents  → 본인 업로드 (PENDING 으로 등록)
 *   - 상태 변경(승인/반려)은 관리자 페이지(/admin) 에서만 가능.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import Link from "next/link"
import {
  ChevronLeft, Upload, Download, RefreshCcw, CheckCircle2,
  AlertCircle, Clock, ShieldCheck, FileText, Loader2, ImageIcon,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DocStatus = "PENDING" | "APPROVED" | "REJECTED"

interface KycDocument {
  id: string
  user_id: string
  type: string            // "사업자등록증" | "명함"
  name: string
  data: string            // data-URL (base64)
  status: DocStatus
  uploaded_at: string
  reviewed_at?: string
  review_note?: string
}

const SLOTS = [
  {
    type: "사업자등록증",
    title: "사업자등록증",
    desc: "법인/개인사업자 등록증 사본 (PDF · JPG · PNG · 최대 5MB)",
    required: true,
  },
  {
    type: "명함",
    title: "담당자 명함",
    desc: "직책 · 소속 확인용 명함 이미지 (JPG · PNG · PDF · 최대 5MB)",
    required: true,
  },
] as const

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KycPage() {
  const [docs, setDocs] = useState<KycDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/v1/users/me/kyc-documents", { cache: "no-store" })
      if (!res.ok) throw new Error("문서를 불러오지 못했습니다.")
      const json = await res.json()
      setDocs(json.documents ?? [])
      setErrorMsg(null)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "문서를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  // 전체 인증 상태 = 두 슬롯 모두 APPROVED
  const overall: DocStatus | "INCOMPLETE" = useMemo(() => {
    const map = new Map(docs.map(d => [d.type, d.status]))
    const biz = map.get("사업자등록증")
    const card = map.get("명함")
    if (!biz || !card) return "INCOMPLETE"
    if (biz === "REJECTED" || card === "REJECTED") return "REJECTED"
    if (biz === "PENDING" || card === "PENDING") return "PENDING"
    return "APPROVED"
  }, [docs])

  return (
    <main className="mck-paper" style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", color: "#0A1628" }}>
      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid rgba(10,22,40,0.10)", backgroundColor: "#F8FAFC" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 24px" }}>
          <Link
            href="/my"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "#475569", fontWeight: 600, textDecoration: "none",
            }}
          >
            <ChevronLeft size={14} /> 마이 / 투자자 인증
          </Link>
        </div>
      </div>

      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
              color: "#2251FF", fontWeight: 700, marginBottom: 10,
            }}
          >
            INVESTOR VERIFICATION
          </div>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 36, fontWeight: 700, color: "#0A1628",
              letterSpacing: "-0.01em", lineHeight: 1.15, marginBottom: 12,
            }}
          >
            투자자 인증
          </h1>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, maxWidth: 720 }}>
            회원가입 시 업로드하신 <b style={{ color: "#0A1628" }}>사업자등록증</b> 과
            {" "}<b style={{ color: "#0A1628" }}>담당자 명함</b> 을 확인하고, 필요 시 교체 업로드 할 수 있습니다.
            관리자 승인 후 거래소 매물 열람·딜룸 진입이 가능합니다.
          </p>
        </div>

        {/* Overall status banner */}
        <OverallStatusBanner status={overall} />

        {/* Error banner */}
        {errorMsg && (
          <div
            style={{
              padding: "14px 16px", borderRadius: 0, marginBottom: 20,
              backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5",
              borderLeft: "3px solid #DC2626",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}
          >
            <AlertCircle size={16} color="#DC2626" style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "#991B1B", lineHeight: 1.55 }}>{errorMsg}</div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
            <div style={{ fontSize: 12 }}>문서를 불러오는 중…</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20, marginBottom: 24 }}>
            {SLOTS.map(slot => (
              <KycSlotCard
                key={slot.type}
                slot={slot}
                doc={docs.find(d => d.type === slot.type)}
                onUploaded={fetchDocs}
              />
            ))}
          </div>
        )}

        {/* Helper notes */}
        <div
          style={{
            backgroundColor: "#F8FAFC",
            border: "1px solid rgba(10,22,40,0.10)",
            padding: "20px 24px",
          }}
        >
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 13, fontWeight: 700, color: "#0A1628", marginBottom: 12,
            }}
          >
            <ShieldCheck size={14} color="#2251FF" /> 인증 처리 안내
          </div>
          <ul style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, paddingLeft: 18, listStyle: "disc" }}>
            <li>관리자 검토는 <b style={{ color: "#0A1628" }}>영업일 기준 1~3일</b> 소요됩니다.</li>
            <li>승인 후 자동으로 거래소 매물 열람 및 딜룸 진입 권한이 부여됩니다.</li>
            <li>회원가입 시 업로드된 문서가 그대로 표시됩니다 — 교체 시 다시 검토 대기 상태가 됩니다.</li>
            <li>제출된 문서는 검토 완료 후 30일 이내 자동 파기됩니다 (개인정보보호법).</li>
            <li>허위 자료 제출 시 서비스 이용이 영구 정지될 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/*  Overall status banner                                              */
/* ------------------------------------------------------------------ */

function OverallStatusBanner({ status }: { status: DocStatus | "INCOMPLETE" }) {
  const cfg = {
    APPROVED: {
      bg: "#ECFDF5", border: "#10B981", icon: <CheckCircle2 size={18} color="#047857" />,
      title: "인증 완료", desc: "거래소 매물 열람과 딜룸 진입이 활성화 되어 있습니다.",
      titleColor: "#047857",
    },
    PENDING: {
      bg: "#FEF3C7", border: "#F59E0B", icon: <Clock size={18} color="#B45309" />,
      title: "관리자 검토 중", desc: "영업일 기준 1~3일 이내에 승인 여부가 결정됩니다.",
      titleColor: "#B45309",
    },
    REJECTED: {
      bg: "#FEF2F2", border: "#DC2626", icon: <AlertCircle size={18} color="#B91C1C" />,
      title: "보완 요청", desc: "관리자가 문서 재제출을 요청했습니다. 아래에서 교체 업로드 해 주세요.",
      titleColor: "#B91C1C",
    },
    INCOMPLETE: {
      bg: "#F1F5F9", border: "#94A3B8", icon: <FileText size={18} color="#475569" />,
      title: "문서 미제출", desc: "사업자등록증과 명함을 모두 업로드 하면 관리자 검토가 시작됩니다.",
      titleColor: "#0A1628",
    },
  }[status]

  return (
    <div
      style={{
        padding: "16px 20px", marginBottom: 20,
        backgroundColor: cfg.bg, borderLeft: `3px solid ${cfg.border}`,
        border: `1px solid ${cfg.border}33`,
        display: "flex", gap: 14, alignItems: "flex-start",
      }}
    >
      <div style={{ marginTop: 2 }}>{cfg.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: cfg.titleColor, marginBottom: 4 }}>
          {cfg.title}
        </div>
        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.55 }}>{cfg.desc}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Per-slot card                                                       */
/* ------------------------------------------------------------------ */

function KycSlotCard({
  slot,
  doc,
  onUploaded,
}: {
  slot: typeof SLOTS[number]
  doc: KycDocument | undefined
  onUploaded: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("파일 크기는 최대 5MB 입니다.")
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const dataUrl = await readAsDataUrl(file)
      const res = await fetch("/api/v1/users/me/kyc-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: slot.type, name: file.name, data: dataUrl }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error?.message ?? "업로드에 실패했습니다.")
      }
      onUploaded()
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "업로드에 실패했습니다.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const status = doc?.status

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(10,22,40,0.10)",
        borderTop: "2px solid #2251FF",
        padding: 24,
        display: "flex", flexDirection: "column", gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div
            style={{
              fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "#2251FF", fontWeight: 700, marginBottom: 6,
            }}
          >
            DOCUMENT
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0A1628", marginBottom: 4 }}>
            {slot.title}
            {slot.required && <span style={{ color: "#DC2626", marginLeft: 4 }}>*</span>}
          </div>
          <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5 }}>{slot.desc}</div>
        </div>
        {status && <StatusPill status={status} />}
      </div>

      {/* Preview / dropzone */}
      {doc?.data ? (
        <DocPreview data={doc.data} name={doc.name} />
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            padding: "32px 20px", textAlign: "center",
            backgroundColor: "#F8FAFC",
            border: "2px dashed rgba(10,22,40,0.18)",
            cursor: uploading ? "default" : "pointer",
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={26} color="#2251FF" style={{ animation: "spin 1s linear infinite", marginBottom: 6 }} />
              <div style={{ fontSize: 12, color: "#2251FF", fontWeight: 700 }}>업로드 중…</div>
            </>
          ) : (
            <>
              <Upload size={26} color="#94A3B8" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 12, color: "#0A1628", fontWeight: 700, marginBottom: 4 }}>
                파일을 선택하세요
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>
                회원가입 시 업로드된 문서가 자동으로 표시됩니다
              </div>
            </>
          )}
        </div>
      )}

      {/* File meta */}
      {doc && (
        <div
          style={{
            fontSize: 11, color: "#64748B", lineHeight: 1.55,
            backgroundColor: "#F8FAFC", padding: "10px 12px",
            border: "1px solid rgba(10,22,40,0.08)",
          }}
        >
          <div>
            <b style={{ color: "#0A1628" }}>파일명:</b> {doc.name || "—"}
          </div>
          <div>
            <b style={{ color: "#0A1628" }}>업로드:</b> {formatDate(doc.uploaded_at)}
          </div>
          {doc.reviewed_at && (
            <div>
              <b style={{ color: "#0A1628" }}>검토 완료:</b> {formatDate(doc.reviewed_at)}
            </div>
          )}
          {doc.review_note && status === "REJECTED" && (
            <div style={{ marginTop: 6, color: "#B91C1C" }}>
              <b>반려 사유:</b> {doc.review_note}
            </div>
          )}
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div
          style={{
            fontSize: 11, color: "#B91C1C",
            backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5",
            padding: "8px 10px",
          }}
        >
          {uploadError}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: "none" }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        <button
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 14px",
            backgroundColor: doc ? "#FFFFFF" : "#0A1628",
            color: doc ? "#0A1628" : "#FFFFFF",
            border: doc ? "1px solid rgba(10,22,40,0.20)" : "1px solid #0A1628",
            borderTop: doc ? "1px solid rgba(10,22,40,0.20)" : "2px solid #2251FF",
            fontSize: 12, fontWeight: 700,
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {doc ? <RefreshCcw size={13} /> : <Upload size={13} />}
          {doc ? "교체 업로드" : "업로드"}
        </button>
        {doc?.data && (
          <a
            href={doc.data}
            download={doc.name || `${slot.type}.pdf`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 14px",
              backgroundColor: "#FFFFFF",
              color: "#0A1628",
              border: "1px solid rgba(10,22,40,0.20)",
              fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}
          >
            <Download size={13} /> 다운로드
          </a>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Status pill                                                         */
/* ------------------------------------------------------------------ */

function StatusPill({ status }: { status: DocStatus }) {
  const cfg = {
    PENDING:  { bg: "#FEF3C7", color: "#B45309", label: "검토 중" },
    APPROVED: { bg: "#DCFCE7", color: "#047857", label: "승인" },
    REJECTED: { bg: "#FEE2E2", color: "#B91C1C", label: "반려" },
  }[status]
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center",
        padding: "4px 10px",
        backgroundColor: cfg.bg, color: cfg.color,
        fontSize: 10, fontWeight: 800, letterSpacing: "0.05em",
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Document preview (image vs pdf)                                     */
/* ------------------------------------------------------------------ */

function DocPreview({ data, name }: { data: string; name: string }) {
  const isImage = data.startsWith("data:image/")
  const isPdf = data.startsWith("data:application/pdf")

  if (isImage) {
    return (
      <div
        style={{
          backgroundColor: "#F8FAFC",
          border: "1px solid rgba(10,22,40,0.10)",
          padding: 8,
          textAlign: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data}
          alt={name}
          style={{ maxWidth: "100%", maxHeight: 240, objectFit: "contain" }}
        />
      </div>
    )
  }

  if (isPdf) {
    return (
      <div
        style={{
          backgroundColor: "#F8FAFC",
          border: "1px solid rgba(10,22,40,0.10)",
          padding: 8,
        }}
      >
        <object data={data} type="application/pdf" width="100%" height="240" aria-label={name}>
          <div style={{ padding: 24, textAlign: "center", color: "#64748B", fontSize: 12 }}>
            PDF 미리보기를 지원하지 않는 브라우저입니다. 다운로드 버튼을 사용하세요.
          </div>
        </object>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        border: "1px solid rgba(10,22,40,0.10)",
        padding: "32px 16px",
        textAlign: "center",
      }}
    >
      <ImageIcon size={28} color="#94A3B8" style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 12, color: "#64748B" }}>
        업로드 된 파일 — 미리보기를 지원하지 않습니다
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return iso
  }
}
