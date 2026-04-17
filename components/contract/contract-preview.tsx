"use client"

import { useRef } from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ContractPreviewProps {
  contractType: string
  contractText: string
  organizationName?: string
  isDraft?: boolean
}

export function ContractPreview({
  contractType,
  contractText,
  organizationName = "NPLatform",
  isDraft = true,
}: ContractPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML
    if (!printContents) return
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${contractType}</title>
        <style>
          @page { size: A4; margin: 20mm 25mm; }
          body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 12pt; line-height: 1.8; color: #111; }
          .contract-page { position: relative; }
          .letterhead { text-align: center; border-bottom: 2px solid #1B3A5C; padding-bottom: 16px; margin-bottom: 24px; }
          .letterhead h2 { font-size: 14pt; color: #1B3A5C; margin: 0; }
          .letterhead p { font-size: 10pt; color: #666; margin: 4px 0 0; }
          .contract-title { text-align: center; font-size: 18pt; font-weight: bold; margin: 32px 0 24px; color: #1B3A5C; }
          .contract-body { white-space: pre-wrap; font-size: 11pt; line-height: 2; }
          .signature-area { margin-top: 60px; page-break-inside: avoid; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 40px; }
          .signature-block { width: 45%; text-align: center; }
          .signature-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 8px; }
          .signature-label { font-size: 10pt; color: #666; }
          .date-field { text-align: right; font-size: 10pt; color: #666; margin-top: 8px; }
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; color: rgba(0,0,0,0.04); font-weight: bold; pointer-events: none; z-index: 0; }
          .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
          @media print {
            .no-print { display: none !important; }
            .watermark { color: rgba(0,0,0,0.03); }
          }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `)
    w.document.close()
    w.print()
    w.close()
  }

  // Parse contract text into title and body
  const lines = contractText.split("\n")
  const title = lines[0]?.trim() || contractType
  const body = lines.slice(1).join("\n").trim()

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="relative">
      {/* Print button */}
      <div className="flex justify-end mb-3 no-print">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
          <Printer className="h-4 w-4" />
          인쇄
        </Button>
      </div>

      {/* Contract preview */}
      <div
        ref={printRef}
        className="bg-white text-black rounded-lg shadow-inner border border-gray-200 overflow-auto"
        style={{
          maxHeight: "700px",
          padding: "40px 48px",
          fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
        }}
      >
        <div className="contract-page relative">
          {/* Watermark */}
          {isDraft && (
            <div
              className="watermark"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-45deg)",
                fontSize: "72pt",
                color: "rgba(0,0,0,0.04)",
                fontWeight: "bold",
                pointerEvents: "none",
                zIndex: 0,
                whiteSpace: "nowrap",
              }}
            >
              DRAFT
            </div>
          )}

          {/* Letterhead */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid #1B3A5C",
              paddingBottom: "16px",
              marginBottom: "24px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "8px",
                backgroundColor: "#1B3A5C",
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14pt",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              NP
            </div>
            <h2 style={{ fontSize: "14pt", color: "#1B3A5C", margin: "0" }}>
              {organizationName}
            </h2>
            <p style={{ fontSize: "10pt", color: "#888", margin: "4px 0 0" }}>
              NPL 거래 플랫폼
            </p>
          </div>

          {/* Contract Title */}
          <h1
            style={{
              textAlign: "center",
              fontSize: "20pt",
              fontWeight: "bold",
              margin: "32px 0 24px",
              color: "#1B3A5C",
              position: "relative",
              zIndex: 1,
            }}
          >
            {title}
          </h1>

          {/* Contract Body */}
          <div
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "11pt",
              lineHeight: "2",
              position: "relative",
              zIndex: 1,
            }}
          >
            {body}
          </div>

          {/* Signature Area */}
          <div
            style={{
              marginTop: "60px",
              position: "relative",
              zIndex: 1,
              pageBreakInside: "avoid" as const,
            }}
          >
            <div
              style={{
                textAlign: "right",
                fontSize: "10pt",
                color: "#666",
                marginBottom: "24px",
              }}
            >
              {today}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ width: "45%", textAlign: "center" }}>
                <p style={{ fontSize: "10pt", color: "#666", marginBottom: "8px" }}>
                  (갑)
                </p>
                <div
                  style={{
                    borderBottom: "1px solid #333",
                    height: "48px",
                    marginBottom: "8px",
                  }}
                />
                <p style={{ fontSize: "9pt", color: "#999" }}>서명 / 날인</p>
              </div>
              <div style={{ width: "45%", textAlign: "center" }}>
                <p style={{ fontSize: "10pt", color: "#666", marginBottom: "8px" }}>
                  (을)
                </p>
                <div
                  style={{
                    borderBottom: "1px solid #333",
                    height: "48px",
                    marginBottom: "8px",
                  }}
                />
                <p style={{ fontSize: "9pt", color: "#999" }}>서명 / 날인</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              fontSize: "8pt",
              color: "#999",
              borderTop: "1px solid #ddd",
              paddingTop: "12px",
              marginTop: "40px",
              position: "relative",
              zIndex: 1,
            }}
          >
            본 계약서는 NPLatform 계약서 생성기를 통해 작성되었습니다.
          </div>
        </div>
      </div>
    </div>
  )
}
