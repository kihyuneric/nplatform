"use client"

/**
 * /exchange/[id]/flow — 거래 플로우 통합 뷰 (Phase 6)
 *
 * 단일 매물에 대해 사용자가 BROWSE → CLOSED까지 거치는 모든 단계를
 * 한 화면에서 시각화한다. 각 단계는 4-tier 게이팅과 1:1 매핑.
 *
 * - 좌측: 단계 진행 타임라인 (10개 노드)
 * - 우측: 현재 단계 상세 + 다음 액션 + 가드 안내
 * - 하단: 시뮬레이터(본인인증·KYC·NDA·LOI 토글)로 상태머신 검증
 */

import { useState, useMemo, use } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft, CheckCircle2, Lock, Circle, ArrowRight,
  ShieldCheck, FileSignature, FileText, Database, Wallet,
  Eye, AlertTriangle, RefreshCcw,
} from "lucide-react"
import {
  STAGE_PATH, STAGE_META, STAGE_TIER, TRANSITIONS,
  nextTransitions, inferStage, progressPct, stageIndex,
  type DealStage, type TransitionContext,
} from "@/lib/deal-state"
import type { AccessTier } from "@/lib/access-tier"

const C = {
  bg0: "#030810", bg1: "#050D1A", bg2: "#080F1E",
  bg3: "#0A1628", bg4: "#0F1F35",
  em: "#10B981", emL: "#10B981",
  blue: "#2E75B6", blueL: "#3B82F6",
  amber: "#F59E0B", rose: "#EF4444", purple: "#A855F7",
  lt3: "#64748B", lt4: "#475569",
}

const TIER_COLOR: Record<AccessTier, string> = {
  L0: "#475569", L1: "#2E75B6", L2: "#10B981", L3: "#A855F7",
}

const STAGE_ICON: Partial<Record<DealStage, React.ElementType>> = {
  BROWSE:        Eye,
  VERIFIED:      ShieldCheck,
  NDA_REQUIRED:  FileSignature,
  NDA_SIGNED:    FileSignature,
  LOI_DRAFTING:  FileText,
  LOI_SUBMITTED: FileText,
  LOI_APPROVED:  CheckCircle2,
  DATAROOM:      Database,
  ESCROW:        Wallet,
  CLOSED:        CheckCircle2,
}

export default function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  // 시뮬레이터 상태
  const [identityVerified, setIdentityVerified] = useState(true)
  const [qualifiedInvestor, setQualifiedInvestor] = useState(true)
  const [ndaSigned, setNdaSigned] = useState(true)
  const [loiApproved, setLoiApproved] = useState(false)

  const ctx: TransitionContext = useMemo(
    () => ({
      identityVerified,
      qualifiedInvestor,
      ndaSigned,
      loiApproved,
      userTier: loiApproved ? "L3" : ndaSigned ? "L2" : identityVerified ? "L1" : "L0",
    }),
    [identityVerified, qualifiedInvestor, ndaSigned, loiApproved]
  )

  const currentStage = useMemo(() => inferStage(ctx), [ctx])
  const currentIdx = stageIndex(currentStage)
  const pct = progressPct(currentStage)
  const meta = STAGE_META[currentStage]
  const next = nextTransitions(currentStage)

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 20px" }}>
          <Link
            href={`/exchange/${id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.lt4, fontWeight: 600, textDecoration: "none",
            }}
          >
            <ChevronLeft size={14} /> 매물 상세
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ fontSize: 11, color: C.emL, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8 }}>
            DEAL FLOW · {id}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
            거래 진행 플로우
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 720 }}>
            탐색부터 종결까지의 10단계 상태머신을 시각화합니다.
            각 단계는 4-tier 정보 공개 모델(L0~L3)과 1:1 매핑되며, 가드를 통과해야 다음 단계로 진입합니다.
          </p>
        </motion.div>

        {/* Progress hero */}
        <div
          style={{
            padding: "24px 28px", borderRadius: 16,
            backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 4 }}>
                현재 단계
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>
                {meta.label}
                <span
                  style={{
                    marginLeft: 12, padding: "4px 10px", borderRadius: 6,
                    backgroundColor: `${TIER_COLOR[meta.tier]}1F`,
                    color: TIER_COLOR[meta.tier],
                    border: `1px solid ${TIER_COLOR[meta.tier]}66`,
                    fontSize: 11, fontWeight: 800,
                  }}
                >
                  {meta.tier}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 4 }}>진행률</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.emL }}>{pct}%</div>
            </div>
          </div>
          <div
            style={{
              height: 8, borderRadius: 999,
              backgroundColor: C.bg4, overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6 }}
              style={{
                height: "100%",
                background: `linear-gradient(90deg, ${C.blue}, ${C.em}, ${C.purple})`,
              }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 24, alignItems: "start" }}>
          {/* LEFT — Timeline */}
          <section
            style={{
              padding: "28px 28px 32px", borderRadius: 16,
              backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 20 }}>
              상태머신 타임라인
            </div>

            <div style={{ position: "relative" }}>
              {STAGE_PATH.map((stage, i) => {
                const m = STAGE_META[stage]
                const Icon = STAGE_ICON[stage] || Circle
                const passed = i < currentIdx
                const active = i === currentIdx
                const future = i > currentIdx
                const tColor = TIER_COLOR[m.tier]

                const nodeBg = active ? tColor : passed ? `${tColor}66` : C.bg4
                const nodeBorder = active ? tColor : passed ? `${tColor}99` : C.bg4
                const nodeIconColor = active || passed ? "#fff" : C.lt3

                return (
                  <div
                    key={stage}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 16,
                      paddingBottom: i < STAGE_PATH.length - 1 ? 24 : 0,
                      position: "relative",
                    }}
                  >
                    {/* connector */}
                    {i < STAGE_PATH.length - 1 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 17, top: 38, bottom: 0,
                          width: 2,
                          backgroundColor: passed || active ? `${tColor}66` : C.bg4,
                        }}
                      />
                    )}
                    {/* node */}
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 999,
                        backgroundColor: nodeBg,
                        border: `2px solid ${nodeBorder}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: active ? `0 0 0 6px ${tColor}1F` : "none",
                        transition: "all 0.3s",
                      }}
                    >
                      {passed ? (
                        <CheckCircle2 size={16} color="#fff" />
                      ) : future ? (
                        <Lock size={13} color={C.lt3} />
                      ) : (
                        <Icon size={16} color={nodeIconColor} />
                      )}
                    </div>
                    {/* label */}
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div
                          style={{
                            fontSize: 13, fontWeight: 800,
                            color: active ? "#fff" : passed ? C.lt4 : C.lt3,
                          }}
                        >
                          {m.label}
                        </div>
                        <span
                          style={{
                            padding: "2px 6px", borderRadius: 4,
                            backgroundColor: `${tColor}1F`,
                            color: tColor,
                            border: `1px solid ${tColor}44`,
                            fontSize: 9, fontWeight: 800,
                          }}
                        >
                          {m.tier}
                        </span>
                        {active && (
                          <span
                            style={{
                              padding: "2px 6px", borderRadius: 4,
                              backgroundColor: `${C.em}1F`, color: C.emL,
                              border: `1px solid ${C.em}66`,
                              fontSize: 9, fontWeight: 800,
                            }}
                          >
                            현재
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.lt4, lineHeight: 1.5 }}>
                        {m.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* RIGHT — Action panel + simulator */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 96 }}>
            {/* Next actions */}
            <section
              style={{
                padding: 22, borderRadius: 14,
                backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 14 }}>
                다음 액션
              </div>
              {next.length === 0 ? (
                <div
                  style={{
                    padding: 20, borderRadius: 10,
                    backgroundColor: `${C.em}0A`, border: `1px solid ${C.em}44`,
                    textAlign: "center",
                  }}
                >
                  <CheckCircle2 size={24} color={C.em} style={{ margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.emL }}>
                    최종 단계에 도달했습니다
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {next.map((t) => {
                    const allowed = !t.guard || t.guard(ctx)
                    const target = STAGE_META[t.to]
                    return (
                      <div
                        key={t.to}
                        style={{
                          padding: "14px 16px", borderRadius: 12,
                          backgroundColor: allowed ? C.bg3 : `${C.rose}08`,
                          border: `1px solid ${allowed ? C.bg4 : `${C.rose}44`}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>
                            {t.label}
                          </div>
                          <span
                            style={{
                              padding: "2px 7px", borderRadius: 4,
                              backgroundColor: `${TIER_COLOR[target.tier]}1F`,
                              color: TIER_COLOR[target.tier],
                              border: `1px solid ${TIER_COLOR[target.tier]}44`,
                              fontSize: 9, fontWeight: 800,
                            }}
                          >
                            → {target.tier}
                          </span>
                        </div>
                        {allowed ? (
                          <Link
                            href={target.routeFor(id)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "8px 12px", borderRadius: 8,
                              backgroundColor: C.em, color: "#fff",
                              fontSize: 11, fontWeight: 800,
                              textDecoration: "none",
                            }}
                          >
                            진행 <ArrowRight size={12} />
                          </Link>
                        ) : (
                          <div
                            style={{
                              display: "flex", gap: 6, alignItems: "flex-start",
                              fontSize: 10, color: C.rose,
                            }}
                          >
                            <AlertTriangle size={11} style={{ marginTop: 1, flexShrink: 0 }} />
                            <span>{t.blockedReason?.(ctx) || "접근 불가"}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Simulator */}
            <section
              style={{
                padding: 22, borderRadius: 14,
                backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4,
                }}
              >
                <RefreshCcw size={14} color={C.amber} />
                상태머신 시뮬레이터
              </div>
              <div style={{ fontSize: 10, color: C.lt4, marginBottom: 14 }}>
                각 가드를 토글해 단계 전환과 게이팅 동작을 검증하세요.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SimToggle label="본인인증 완료"     value={identityVerified}  onChange={setIdentityVerified}  tier="L1" />
                <SimToggle label="전문투자자(KYC)"  value={qualifiedInvestor} onChange={setQualifiedInvestor} tier="L2" />
                <SimToggle label="NDA 체결"          value={ndaSigned}         onChange={setNdaSigned}         tier="L2" />
                <SimToggle label="LOI 매도자 승인"   value={loiApproved}       onChange={setLoiApproved}       tier="L3" />
              </div>
              <div
                style={{
                  marginTop: 14, padding: "10px 12px", borderRadius: 10,
                  backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                  fontSize: 10, color: C.lt4, lineHeight: 1.5,
                }}
              >
                추정 사용자 티어: <b style={{ color: TIER_COLOR[ctx.userTier] }}>{ctx.userTier}</b>
                <br />
                추정 단계: <b style={{ color: "#fff" }}>{currentStage}</b>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}

function SimToggle({
  label, value, onChange, tier,
}: { label: string; value: boolean; onChange: (v: boolean) => void; tier: AccessTier }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px", borderRadius: 10,
        backgroundColor: value ? `${TIER_COLOR[tier]}14` : C.bg3,
        border: `1px solid ${value ? `${TIER_COLOR[tier]}66` : C.bg4}`,
        cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            padding: "2px 6px", borderRadius: 4,
            backgroundColor: `${TIER_COLOR[tier]}1F`,
            color: TIER_COLOR[tier],
            border: `1px solid ${TIER_COLOR[tier]}66`,
            fontSize: 9, fontWeight: 800,
          }}
        >
          {tier}
        </span>
        {label}
      </span>
      <span
        style={{
          width: 32, height: 18, borderRadius: 999,
          backgroundColor: value ? TIER_COLOR[tier] : C.bg4,
          position: "relative", transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute", top: 2, left: value ? 16 : 2,
            width: 14, height: 14, borderRadius: 999,
            backgroundColor: "#fff", transition: "left 0.2s",
          }}
        />
      </span>
    </button>
  )
}
