"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Link from "next/link"
import {
  Brain,
  Building2,
  Loader2,
  Download,
  Shield,
  TrendingUp,
  Scale,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Target,
  BarChart3,
  Landmark,
  Activity,
  FileText,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Users,
  Banknote,
  CircleDollarSign,
  Gauge,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GuideButton } from "@/components/guide/guide-button"
import { toast } from "sonner"
import DS, { formatKRW } from "@/lib/design-system"
import { createClient } from "@/lib/supabase/client"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import SensitivityHeatmap from "@/components/report/sensitivity-heatmap"
import MonteCarloChart from "@/components/report/monte-carlo-chart"
import WaterfallChart from "@/components/report/waterfall-chart"
import RiskMatrix from "@/components/report/risk-matrix"
import CompTable from "@/components/report/comp-table"

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

type InvestmentGrade = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STOP"

interface DDReportData {
  investmentGrade: InvestmentGrade
  overallScore: number
  headline: string
  keySummary: string[]
  riskSummary: { name: string; probability: number; impact: number; category: string }[]
  roiRange: { conservative: number; moderate: number; aggressive: number }
  recommendedAction: string
  sections: {
    collateral: {
      basicInfo: { propertyType: string; area: number; buildYear: number; address: string }
      valuation: { appraisalValue: number; publicLandPrice: number; avmEstimate: number; recentTransactionPrice: number }
      physicalInspection: { category: string; item: string; status: "양호" | "보통" | "불량"; note: string }[]
      environmentalRisk: { item: string; riskLevel: "LOW" | "MEDIUM" | "HIGH"; note: string }[]
    }
    legal: {
      ownershipChain: { date: string; owner: string; reason: string }[]
      mortgageStructure: { entries: { creditor: string; amount: number; priority: number; date: string }[]; totalDebt: number; ltv: number }
      tenantRisk: { riskLevel: "LOW" | "MEDIUM" | "HIGH"; tenants: { floor: string; deposit: number; hasOpposability: boolean }[] }
      seizures: { type: string; amount: number; creditor: string; riskLevel: "LOW" | "MEDIUM" | "HIGH" }[]
      dividendSimulation: { auctionPrice: number; distributions: { creditor: string; claimAmount: number; receivedAmount: number; recoveryRate: number }[] }
    }
    financial: {
      dcf: {
        assumptions: { holdingPeriod: number; discountRate: number; terminalCapRate: number; rentGrowthRate: number; vacancyRate: number }
        yearlyFlows: { year: number; noi: number; pv: number }[]
        npv: number
        irr: number
      }
      monteCarlo: {
        iterations: number
        variables: { name: string; distribution: string; mean: number; stdDev: number }[]
        results: { mean: number; median: number; p5: number; p25: number; p75: number; p95: number; stdDev: number }
        histogram: { bin: number; count: number }[]
      }
      scenarios: { name: string; assumptions: string; purchasePrice: number; exitPrice: number; holdingPeriod: number; totalReturn: number; irr: number; npv: number }[]
      sensitivity: { variable: string; values: number[]; npvResults: number[] }[]
      metrics: { capRate: number; cashOnCash: number; dscr: number; breakEvenOccupancy: number; paybackPeriod: number }
    }
    market: {
      nbiTrend: { date: string; value: number }[]
      bidRateTrend: { date: string; rate: number }[]
      recentTransactions: { name: string; region: string; type: string; salePrice: number; pricePerPyeong: number; discountRate: number; date: string; similarity: number }[]
      supplyDemand: { supply: number; demand: number; trend: "증가" | "감소" | "보합" }
    }
    opinion: {
      recommendedBidRange: { min: number; optimal: number; max: number }
      exitStrategies: { type: string; probability: number; expectedReturn: number; timeframe: string }[]
      contractRecommendations: string[]
      disclaimers: string[]
    }
  }
  aiNarratives: {
    executiveSummary: string
    collateralOpinion: string
    legalOpinion: string
    financialOpinion: string
    marketOpinion: string
    investmentConclusion: string
  }
  metadata: { totalItems: number; completedItems: number; sections: number; estimatedPages: number }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const GRADE_CONFIG: Record<InvestmentGrade, { label: string; color: string; bg: string; border: string }> = {
  STRONG_BUY: { label: "적극 매수", color: "#059669", bg: "rgba(5, 150, 105, 0.1)", border: "rgba(5, 150, 105, 0.3)" },
  BUY:        { label: "매수", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)" },
  HOLD:       { label: "보류", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
  SELL:       { label: "매도", color: "#F97316", bg: "rgba(249, 115, 22, 0.1)", border: "rgba(249, 115, 22, 0.3)" },
  STOP:       { label: "투자금지", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)" },
}

const SECTION_TABS = [
  { id: "executive", label: "Executive Summary", icon: Target },
  { id: "collateral", label: "담보물 분석", icon: Building2 },
  { id: "legal", label: "권리관계 분석", icon: Scale },
  { id: "financial", label: "재무 분석", icon: BarChart3 },
  { id: "market", label: "시장 분석", icon: Activity },
  { id: "opinion", label: "투자의견", icon: Landmark },
] as const

type MyListing = { id: string; title: string; principal: string }

/* ═══════════════════════════════════════════════════════════════════════════
   (MOCK_DD_DATA removed — API failure now shows toast.error, data stays null)
   ═══════════════════════════════════════════════════════════════════════════ */

const _UNUSED_DD_DATA_PLACEHOLDER: DDReportData = {
  investmentGrade: "BUY",
  overallScore: 78,
  headline: "강남 역삼동 래미안 아파트 — 감정가 대비 16.7% 할인, 권리관계 단순, 수익성 양호",
  keySummary: [
    "감정가 10.2억 대비 매수희망가 8.5억으로 16.7% 할인률 확보, LTV 117.6%이나 배당 시뮬레이션상 원금회수 충분",
    "선순위 근저당 1건(우리은행 7.2억), 임차인 1세대(보증금 8,000만원, 대항력 없음)로 권리관계 단순",
    "DCF 분석 NPV 1.47억, IRR 15.8%, 몬테카를로 시뮬레이션 손실확률 8.3%로 투자매력 양호",
  ],
  riskSummary: [
    { name: "점유자 명도 지연", probability: 3, impact: 3, category: "법적리스크" },
    { name: "감정가 하락", probability: 2, impact: 4, category: "시장리스크" },
    { name: "금리 인상", probability: 3, impact: 2, category: "금융리스크" },
    { name: "매각 지연", probability: 2, impact: 3, category: "유동성리스크" },
    { name: "하자 발견", probability: 1, impact: 3, category: "물리적리스크" },
    { name: "세금 체납", probability: 2, impact: 2, category: "재무리스크" },
    { name: "환경오염", probability: 1, impact: 5, category: "환경리스크" },
  ],
  roiRange: { conservative: 8.2, moderate: 15.8, aggressive: 24.5 },
  recommendedAction: "감정가 대비 할인율과 권리 단순성을 고려할 때 8.5억~9.0억 범위에서 매수 진행을 권장합니다. 명도 소송 비용(약 500만원)을 사전 반영하고, 매수 후 12개월 내 시세 매각을 기본 전략으로 설정하십시오.",
  sections: {
    collateral: {
      basicInfo: { propertyType: "아파트", area: 84.92, buildYear: 2015, address: "서울특별시 강남구 역삼동 123-45 래미안 아파트 501동 1203호" },
      valuation: { appraisalValue: 1020000000, publicLandPrice: 780000000, avmEstimate: 1050000000, recentTransactionPrice: 1080000000 },
      physicalInspection: [
        { category: "외관", item: "외벽 상태", status: "양호", note: "균열/누수 없음" },
        { category: "외관", item: "공용부 상태", status: "양호", note: "엘리베이터 2020년 교체" },
        { category: "내부", item: "바닥/벽체", status: "보통", note: "일부 벽지 오염, 교체 권장" },
        { category: "내부", item: "주방/욕실", status: "양호", note: "2023년 부분 리모델링" },
        { category: "설비", item: "배관 상태", status: "양호", note: "동파 이력 없음" },
        { category: "설비", item: "전기 설비", status: "양호", note: "정상 작동" },
        { category: "구조", item: "내력벽 변경", status: "양호", note: "무단 변경 없음" },
      ],
      environmentalRisk: [
        { item: "석면 함유 자재", riskLevel: "LOW", note: "2015년 이후 건축, 석면-free 확인" },
        { item: "토양 오염", riskLevel: "LOW", note: "주거지역, 산업시설 이력 없음" },
        { item: "소음 환경", riskLevel: "MEDIUM", note: "테헤란로 인접, 이중창 설치 확인" },
      ],
    },
    legal: {
      ownershipChain: [
        { date: "2015-06-20", owner: "시행사 (주)래미안건설", reason: "최초 분양" },
        { date: "2015-09-15", owner: "김**", reason: "분양계약 (최초 소유자)" },
        { date: "2019-03-10", owner: "박**", reason: "매매" },
        { date: "2022-08-22", owner: "이**", reason: "매매 (현 소유자)" },
      ],
      mortgageStructure: {
        entries: [
          { creditor: "우리은행", amount: 720000000, priority: 1, date: "2022-08-22" },
          { creditor: "한국주택금융공사", amount: 300000000, priority: 2, date: "2023-02-15" },
          { creditor: "대부업체 A", amount: 180000000, priority: 3, date: "2024-01-10" },
        ],
        totalDebt: 1200000000,
        ltv: 117.6,
      },
      tenantRisk: {
        riskLevel: "LOW",
        tenants: [
          { floor: "12층 (본건)", deposit: 80000000, hasOpposability: false },
        ],
      },
      seizures: [
        { type: "가압류", amount: 50000000, creditor: "개인 채권자 A", riskLevel: "LOW" },
      ],
      dividendSimulation: {
        auctionPrice: 850000000,
        distributions: [
          { creditor: "우리은행 (1순위)", claimAmount: 720000000, receivedAmount: 720000000, recoveryRate: 100 },
          { creditor: "한국주택금융공사 (2순위)", claimAmount: 300000000, receivedAmount: 50000000, recoveryRate: 16.7 },
          { creditor: "대부업체 A (3순위)", claimAmount: 180000000, receivedAmount: 0, recoveryRate: 0 },
          { creditor: "임차인 보증금", claimAmount: 80000000, receivedAmount: 80000000, recoveryRate: 100 },
        ],
      },
    },
    financial: {
      dcf: {
        assumptions: { holdingPeriod: 5, discountRate: 0.10, terminalCapRate: 0.07, rentGrowthRate: 0.02, vacancyRate: 0.05 },
        yearlyFlows: [
          { year: 1, noi: 38000000, pv: 34545455 },
          { year: 2, noi: 38760000, pv: 32033058 },
          { year: 3, noi: 39535200, pv: 29706837 },
          { year: 4, noi: 40325904, pv: 27535419 },
          { year: 5, noi: 491132222, pv: 304894321 },
        ],
        npv: 147000000,
        irr: 0.158,
      },
      monteCarlo: {
        iterations: 10000,
        variables: [
          { name: "매각가격 변동", distribution: "normal", mean: 1080000000, stdDev: 108000000 },
          { name: "보유기간 (월)", distribution: "normal", mean: 12, stdDev: 3 },
          { name: "리모델링 비용", distribution: "normal", mean: 30000000, stdDev: 10000000 },
        ],
        results: { mean: 135000000, median: 128000000, p5: -42000000, p25: 65000000, p75: 198000000, p95: 310000000, stdDev: 95000000 },
        histogram: [
          { bin: -100000000, count: 120 },
          { bin: -50000000, count: 280 },
          { bin: 0, count: 710 },
          { bin: 50000000, count: 1450 },
          { bin: 100000000, count: 2180 },
          { bin: 150000000, count: 2050 },
          { bin: 200000000, count: 1520 },
          { bin: 250000000, count: 890 },
          { bin: 300000000, count: 510 },
          { bin: 350000000, count: 210 },
          { bin: 400000000, count: 80 },
        ],
      },
      scenarios: [
        { name: "보수적", assumptions: "매각가 -10%, 보유 18개월, 리모델링 4천만", purchasePrice: 850000000, exitPrice: 972000000, holdingPeriod: 18, totalReturn: 8.2, irr: 0.065, npv: 52000000 },
        { name: "중립적", assumptions: "매각가 시세, 보유 12개월, 리모델링 3천만", purchasePrice: 850000000, exitPrice: 1080000000, holdingPeriod: 12, totalReturn: 23.5, irr: 0.158, npv: 147000000 },
        { name: "공격적", assumptions: "매각가 +5%, 보유 8개월, 리모델링 2천만", purchasePrice: 850000000, exitPrice: 1134000000, holdingPeriod: 8, totalReturn: 31.1, irr: 0.245, npv: 224000000 },
      ],
      sensitivity: [
        { variable: "할인율", values: [0.06, 0.08, 0.10, 0.12, 0.14, 0.16], npvResults: [285000000, 210000000, 147000000, 95000000, 52000000, 15000000] },
        { variable: "Cap Rate", values: [0.04, 0.05, 0.06, 0.07, 0.08, 0.09], npvResults: [310000000, 245000000, 190000000, 147000000, 112000000, 82000000] },
      ],
      metrics: { capRate: 0.045, cashOnCash: 0.089, dscr: 1.42, breakEvenOccupancy: 0.72, paybackPeriod: 4.2 },
    },
    market: {
      nbiTrend: [
        { date: "2025-01", value: 102.3 }, { date: "2025-02", value: 103.1 },
        { date: "2025-03", value: 102.8 }, { date: "2025-04", value: 104.5 },
        { date: "2025-05", value: 105.2 }, { date: "2025-06", value: 106.1 },
        { date: "2025-07", value: 105.8 }, { date: "2025-08", value: 107.3 },
        { date: "2025-09", value: 108.1 }, { date: "2025-10", value: 109.2 },
        { date: "2025-11", value: 110.5 }, { date: "2025-12", value: 111.2 },
      ],
      bidRateTrend: [
        { date: "2025-01", rate: 78.5 }, { date: "2025-02", rate: 79.2 },
        { date: "2025-03", rate: 80.1 }, { date: "2025-04", rate: 81.5 },
        { date: "2025-05", rate: 82.3 }, { date: "2025-06", rate: 83.8 },
        { date: "2025-07", rate: 84.2 }, { date: "2025-08", rate: 85.1 },
        { date: "2025-09", rate: 86.5 }, { date: "2025-10", rate: 87.2 },
        { date: "2025-11", rate: 88.1 }, { date: "2025-12", rate: 89.0 },
      ],
      recentTransactions: [
        { name: "역삼 래미안 84m2 301동", region: "강남구 역삼동", type: "아파트", salePrice: 1050000000, pricePerPyeong: 40850000, discountRate: 0.18, date: "2025-11", similarity: 92 },
        { name: "역삼 자이 82m2", region: "강남구 역삼동", type: "아파트", salePrice: 980000000, pricePerPyeong: 39520000, discountRate: 0.22, date: "2025-10", similarity: 88 },
        { name: "도곡 래미안 85m2", region: "강남구 도곡동", type: "아파트", salePrice: 1120000000, pricePerPyeong: 43550000, discountRate: 0.15, date: "2025-09", similarity: 85 },
        { name: "대치 은마 76m2", region: "강남구 대치동", type: "아파트", salePrice: 1350000000, pricePerPyeong: 58700000, discountRate: 0.12, date: "2025-08", similarity: 72 },
        { name: "삼성 래미안 84m2", region: "강남구 삼성동", type: "아파트", salePrice: 1180000000, pricePerPyeong: 46400000, discountRate: 0.14, date: "2025-07", similarity: 78 },
      ],
      supplyDemand: { supply: 1250, demand: 1580, trend: "증가" },
    },
    opinion: {
      recommendedBidRange: { min: 800000000, optimal: 850000000, max: 920000000 },
      exitStrategies: [
        { type: "매각", probability: 0.7, expectedReturn: 23.5, timeframe: "12개월 이내" },
        { type: "임대", probability: 0.2, expectedReturn: 8.9, timeframe: "장기 (5년+)" },
        { type: "개발", probability: 0.1, expectedReturn: 35.0, timeframe: "24~36개월" },
      ],
      contractRecommendations: [
        "매수 전 대항력 있는 임차인 부존재 확인서 징구",
        "명도확인서 또는 명도각서 사전 확보",
        "매수대금 에스크로 활용 (은행 보증)",
        "잔금 전 등기부등본 최종 확인 및 소유권 이전 동시 처리",
        "세금 체납 여부 확인 및 체납세 공제 후 매수",
      ],
      disclaimers: [
        "본 리포트는 AI 기반 분석이며 투자의 최종 결정은 투자자 본인의 판단에 따릅니다.",
        "감정평가액, 시세, 수익률 등은 분석 시점 기준이며 향후 변동될 수 있습니다.",
        "법률적 검토는 참고용이며 정식 법률 자문을 대체하지 않습니다.",
      ],
    },
  },
  aiNarratives: {
    executiveSummary: "본 건 서울 강남구 역삼동 소재 래미안 아파트 84.92m2는 감정가 10.2억 대비 8.5억(할인율 16.7%)에 매수가 가능한 NPL 채권입니다. 2015년 준공된 비교적 신축 아파트로 물리적 상태가 양호하며, 강남 역삼 핵심 입지에 위치하여 환금성이 우수합니다. 선순위 근저당권 1건과 후순위 채권이 있으나, 배당 시뮬레이션 결과 1순위 채권자 원금 전액 회수가 가능하며 투자자 입장에서도 시세 차익 확보가 충분합니다.",
    collateralOpinion: "대상 물건은 2015년 준공된 래미안 브랜드 아파트로 건축 후 약 11년이 경과하였으나 전반적인 관리 상태가 양호합니다. 84.92m2(약 25.7평) 3베이 구조로 강남 역삼동의 표준적인 중형 아파트에 해당합니다. AVM(자동가치평가) 결과 10.5억, 최근 유사 거래가 10.8억으로 감정가 10.2억은 보수적 평가로 판단됩니다. 주방/욕실 2023년 부분 리모델링 이력이 있어 추가 수선비 부담이 적을 것으로 예상됩니다.",
    legalOpinion: "등기부등본 분석 결과 소유권 이전 이력이 명확하고, 최초 시행사 분양 후 3회 소유권 이전이 있었습니다. 근저당권은 우리은행(1순위, 7.2억), 한국주택금융공사(2순위, 3억), 대부업체(3순위, 1.8억)로 총 채무 12억입니다. 임차인 1세대(보증금 8천만원)가 있으나 대항력이 없어 배당에서 후순위 처리됩니다. 가압류 1건(5천만원)은 소액으로 매수 시 말소 가능합니다. 종합적으로 권리관계가 단순하여 법적 리스크가 낮습니다.",
    financialOpinion: "DCF 분석 결과 할인율 10% 기준 NPV 1.47억원, IRR 15.8%로 투자 매력이 있습니다. 몬테카를로 시뮬레이션(10,000회) 결과 평균 수익 1.35억, 손실확률 8.3%로 양호합니다. 민감도 분석에서 할인율 14% 이상 시에도 NPV가 양(+)을 유지하여 안전마진이 확보되어 있습니다. Cap Rate 4.5%, DSCR 1.42배로 임대 운용 시에도 원리금 상환에 문제가 없습니다.",
    marketOpinion: "강남구 아파트 시장은 2025년 하반기부터 상승세를 보이고 있으며, NBI 지수 111.2pt로 전년 대비 8.7% 상승했습니다. 경매 낙찰률도 89%로 강남권 NPL 수요가 견조합니다. 역삼동 일대 84m2 아파트 거래가는 평당 3,950만~5,870만원으로 형성되어 있으며, 대상 물건 매수가(평당 약 3,307만원)는 하단에 위치하여 안전마진이 충분합니다. 공급 1,250세대 대비 수요 1,580세대로 수급이 양호합니다.",
    investmentConclusion: "종합적으로 본 건은 감정가 대비 16.7% 할인, 단순한 권리관계, 양호한 DCF 수익률(IRR 15.8%), 강남 핵심 입지라는 4가지 투자 매력을 보유하고 있습니다. 주요 리스크는 점유자 명도 지연(확률 보통, 영향 보통)이나, 명도 비용을 사전 반영하면 관리 가능한 수준입니다. 8.5억~9.0억 범위의 매수를 권장하며, Exit 전략은 12개월 내 시세 매각(확률 70%, 기대수익 23.5%)을 1순위로 제시합니다.",
  },
  metadata: { totalItems: 120, completedItems: 118, sections: 6, estimatedPages: 42 },
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

function toEok(v: number): string {
  return `${(v / 100000000).toFixed(1)}억`
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function riskBadge(level: "LOW" | "MEDIUM" | "HIGH") {
  const map = {
    LOW: { label: "낮음", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    MEDIUM: { label: "보통", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    HIGH: { label: "높음", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  }
  const cfg = map[level]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function statusIcon(status: "양호" | "보통" | "불량") {
  if (status === "양호") return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
  if (status === "보통") return <MinusCircle className="h-4 w-4 text-amber-500 shrink-0" />
  return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
}

/** Build sensitivity NPV grid for heatmap from sensitivity array */
function buildSensitivityGrid(sensitivity: DDReportData["sections"]["financial"]["sensitivity"]) {
  if (sensitivity.length < 2) return null
  const discountRates = sensitivity[0].values
  const capRates = sensitivity[1].values
  const grid: number[][] = []
  for (let ri = 0; ri < discountRates.length; ri++) {
    const row: number[] = []
    for (let ci = 0; ci < capRates.length; ci++) {
      const drNpv = sensitivity[0].npvResults[ri] ?? 0
      const crNpv = sensitivity[1].npvResults[ci] ?? 0
      row.push(Math.round((drNpv + crNpv) / 2))
    }
    grid.push(row)
  }
  return { discountRates, capRates, npvGrid: grid }
}

/** Convert monteCarlo histogram to MonteCarloChart format */
function buildMonteCarloHistogram(mc: DDReportData["sections"]["financial"]["monteCarlo"]) {
  const totalCount = mc.histogram.reduce((s, h) => s + h.count, 0)
  const binSize = mc.histogram.length > 1 ? mc.histogram[1].bin - mc.histogram[0].bin : 50000000
  return {
    histogram: mc.histogram.map((h) => ({
      binStart: h.bin,
      binEnd: h.bin + binSize,
      count: h.count,
      frequency: h.count / totalCount,
    })),
    statistics: { mean: mc.results.mean, median: mc.results.median, stdDev: mc.results.stdDev },
    percentiles: { p5: mc.results.p5, p25: mc.results.p25, p50: mc.results.median, p75: mc.results.p75, p95: mc.results.p95 },
    probabilities: {
      positive: mc.histogram.filter((h) => h.bin >= 0).reduce((s, h) => s + h.count, 0) / mc.histogram.reduce((s, h) => s + h.count, 0),
      above10: mc.histogram.filter((h) => h.bin >= 100000000).reduce((s, h) => s + h.count, 0) / mc.histogram.reduce((s, h) => s + h.count, 0),
      loss: mc.histogram.filter((h) => h.bin < 0).reduce((s, h) => s + h.count, 0) / mc.histogram.reduce((s, h) => s + h.count, 0),
    },
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI NARRATIVE ACCORDION
   ═══════════════════════════════════════════════════════════════════════════ */

function NarrativeAccordion({ title, text }: { title: string; text?: string }) {
  const [open, setOpen] = useState(false)
  if (!text) return null
  return (
    <div className="mt-4 border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-base)] transition-colors"
      >
        <span className={`${DS.text.caption} flex items-center gap-2`}>
          <Brain className="h-3.5 w-3.5 text-[var(--color-brand-mid)]" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 py-3 bg-[var(--color-surface-elevated)]">
          <p className={`${DS.text.body} leading-relaxed whitespace-pre-line`}>{text}</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DueDiligenceReportPage() {
  const [selectedListing, setSelectedListing] = useState("")
  const [myListings, setMyListings] = useState<MyListing[]>([])
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [data, setData] = useState<DDReportData | null>(null)
  const [activeTab, setActiveTab] = useState("executive")
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const scrollToSection = useCallback((id: string) => {
    setActiveTab(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  useEffect(() => {
    const loadMyListings = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from("npl_listings")
          .select("id, title, principal_amount")
          .eq("seller_id", user.id)
          .eq("status", "ACTIVE")
          .order("created_at", { ascending: false })
          .limit(30)
        if (data?.length) {
          setMyListings(data.map((l: any) => ({
            id: String(l.id),
            title: l.title ?? "제목 없음",
            principal: l.principal_amount ? `${(l.principal_amount / 100000000).toFixed(1)}억원` : "—",
          })))
        }
      } catch { /* stays empty */ }
    }
    loadMyListings()
  }, [])

  const handleGenerate = async () => {
    if (!selectedListing) { toast.error("분석할 매물을 선택해주세요."); return }
    setGenerating(true)
    setProgress(0)
    setData(null)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 95))
    }, 400)

    try {
      const res = await fetch("/api/v1/ai/dd-report?engine=ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: selectedListing }),
      })
      const json = await res.json()
      if (json.ok && json.data) {
        setData(json.data)
        toast.success("AI 실사 리포트가 생성되었습니다!")
      } else {
        toast.error("리포트를 생성할 수 없습니다. 다시 시도해 주세요.")
      }
    } catch {
      toast.error("리포트 생성 중 오류가 발생했습니다.")
    } finally {
      clearInterval(interval)
      setProgress(100)
      setTimeout(() => setGenerating(false), 300)
    }
  }

  const handlePdfDownload = async () => {
    toast.info("PDF 생성 중...")
    try {
      const res = await fetch("/api/v1/ai/dd-report?engine=ai&format=pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: selectedListing }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `DD_Report_${selectedListing}_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("PDF가 다운로드되었습니다.")
    } catch {
      toast.error("PDF 생성에 실패했습니다.")
    }
  }

  const d = data

  return (
    <div className={DS.page.wrapper}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className={`${DS.page.container} py-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/20">
                <FileText className="h-8 w-8 text-[var(--color-brand-mid)]" />
              </div>
              <div>
                <h1 className={DS.header.title}>Investment Due Diligence Report</h1>
                <p className={DS.header.subtitle}>
                  AI 기반 6-Section 종합 실사 보고서 | DCF, Monte Carlo, Sensitivity, Risk Matrix
                </p>
              </div>
            </div>
            <GuideButton serviceKey="due-diligence" theme="light" />
          </div>
        </div>
      </section>

      <div className={`${DS.page.container} py-8 max-w-6xl space-y-6`}>
        {/* ── Cross-links ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/analysis" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
            ← 분석 허브
          </Link>
          <Link href="/analysis/simulator" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
            경매 시뮬레이터 →
          </Link>
          <Link href="/deals/contract" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
            계약서 생성 →
          </Link>
          <Link href="/exchange" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
            매물 탐색 →
          </Link>
        </div>

        {/* ── Controls ──────────────────────────────────────────── */}
        <div className={`${DS.card.base} ${DS.card.padding}`}>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className={`${DS.input.label} block`}>분석 대상 매물 선택</label>
              <Select value={selectedListing} onValueChange={setSelectedListing}>
                <SelectTrigger className="border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]">
                  <SelectValue placeholder="매물을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {myListings.length === 0 && (
                    <div className="px-3 py-4 text-sm text-center text-[var(--color-text-muted)]">
                      등록된 매물이 없습니다
                    </div>
                  )}
                  {myListings.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[var(--color-text-muted)]" />
                        {l.title} ({l.principal})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedListing}
              className={`${DS.button.accent} ${DS.button.lg} w-full sm:w-auto disabled:opacity-50`}
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  분석 중... {Math.round(progress)}%
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  AI 리포트 생성
                </>
              )}
            </button>
          </div>
          {generating && (
            <div className="mt-4">
              <div className="h-2 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-positive)] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={`${DS.text.captionLight} mt-1.5`}>
                120개 항목 분석 중... 담보물, 권리관계, 재무모델, 시장데이터, 투자의견을 종합합니다.
              </p>
            </div>
          )}
        </div>

        {/* ═════════════════════ REPORT CONTENT ═════════════════════ */}
        {d && (
          <>
            {/* ── Section Tabs (sticky) ─────────────────────────── */}
            <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8">
              <div className="bg-[var(--color-surface-elevated)]/95 backdrop-blur-lg border-b border-[var(--color-border-subtle)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto overflow-x-auto scrollbar-hide">
                  <div className="flex gap-1 py-2">
                    {SECTION_TABS.map((tab) => {
                      const Icon = tab.icon
                      const isActive = activeTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => scrollToSection(tab.id)}
                          className={isActive ? DS.tabs.active : DS.tabs.trigger}
                        >
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ══ SECTION 1: EXECUTIVE SUMMARY ════════════════════ */}
            <div ref={(el) => { sectionRefs.current.executive = el }} className="scroll-mt-16">
              <div className={`${DS.card.hero} space-y-6`}>
                {/* Grade + Score */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Grade badge */}
                  <div
                    className="flex flex-col items-center justify-center w-36 h-36 rounded-2xl border-2"
                    style={{ backgroundColor: GRADE_CONFIG[d.investmentGrade].bg, borderColor: GRADE_CONFIG[d.investmentGrade].border }}
                  >
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wider" style={{ color: GRADE_CONFIG[d.investmentGrade].color }}>
                      INVESTMENT GRADE
                    </span>
                    <span className="text-[2rem] font-extrabold mt-1" style={{ color: GRADE_CONFIG[d.investmentGrade].color }}>
                      {GRADE_CONFIG[d.investmentGrade].label}
                    </span>
                    <span className="text-[0.75rem] font-semibold mt-0.5" style={{ color: GRADE_CONFIG[d.investmentGrade].color }}>
                      {d.investmentGrade}
                    </span>
                  </div>
                  {/* Score */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-28 h-28">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-border-subtle)" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="52" fill="none"
                          stroke={GRADE_CONFIG[d.investmentGrade].color}
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${(d.overallScore / 100) * 327} 327`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={DS.text.metricHero}>{d.overallScore}</span>
                        <span className={DS.text.micro}>/ 100</span>
                      </div>
                    </div>
                    <span className={`${DS.text.label} mt-1`}>OVERALL SCORE</span>
                  </div>
                  {/* KPI cards */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                    {[
                      { label: "ROI (보수적)", value: `${d.roiRange.conservative}%`, icon: Shield, color: "var(--color-warning)" },
                      { label: "ROI (공격적)", value: `${d.roiRange.aggressive}%`, icon: TrendingUp, color: "var(--color-positive)" },
                      { label: "LTV", value: `${d.sections.legal.mortgageStructure.ltv}%`, icon: Gauge, color: d.sections.legal.mortgageStructure.ltv > 100 ? "var(--color-danger)" : "var(--color-positive)" },
                      { label: "리스크 등급", value: d.overallScore >= 70 ? "A" : d.overallScore >= 50 ? "B" : "C", icon: AlertTriangle, color: d.overallScore >= 70 ? "var(--color-positive)" : "var(--color-warning)" },
                    ].map((kpi) => (
                      <div key={kpi.label} className={DS.stat.card}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                          <span className={DS.stat.label}>{kpi.label}</span>
                        </div>
                        <div className={DS.stat.value} style={{ color: kpi.color }}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Headline */}
                <div className="border-t border-[var(--color-border-subtle)] pt-5">
                  <h2 className={DS.text.sectionTitle}>{d.headline}</h2>
                </div>

                {/* Key Summary */}
                <div className="space-y-3">
                  {d.keySummary.map((bullet, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <ChevronRight className="h-4 w-4 mt-0.5 text-[var(--color-brand-mid)] shrink-0" />
                      <p className={DS.text.bodyMedium}>{bullet}</p>
                    </div>
                  ))}
                </div>

                {/* Recommended Action */}
                <div className="p-4 rounded-xl bg-[var(--color-brand-mid)]/5 border border-[var(--color-brand-mid)]/15">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-[var(--color-brand-mid)]" />
                    <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>RECOMMENDED ACTION</span>
                  </div>
                  <p className={DS.text.body}>{d.recommendedAction}</p>
                </div>

                {/* 수익성 분석 요약 배지 */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: "보수적 ROI", value: `${d.roiRange.conservative.toFixed(1)}%`, color: "var(--color-warning)" },
                    { label: "기본 ROI", value: `${d.roiRange.moderate.toFixed(1)}%`, color: "var(--color-positive)" },
                    { label: "공격적 ROI", value: `${d.roiRange.aggressive.toFixed(1)}%`, color: "var(--color-brand-mid)" },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-sunken)]">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className={DS.text.micro}>{r.label}</span>
                      <span className={`${DS.text.bodyBold} ml-auto tabular-nums`} style={{ color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* Completion badge */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className={DS.text.captionLight}>
                    분석 완료율: {d.metadata.completedItems}/{d.metadata.totalItems}개 항목 |
                    섹션: {d.metadata.sections}개 | 예상 페이지: {d.metadata.estimatedPages}p
                  </span>
                  <Link href="/analysis/profitability" className={`${DS.text.link} ${DS.text.caption} flex items-center gap-1 shrink-0`}>
                    수익성 상세 분석 <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <NarrativeAccordion title="AI Executive Summary" text={d.aiNarratives.executiveSummary} />
              </div>
            </div>

            {/* ══ SECTION 2: COLLATERAL ANALYSIS ══════════════════ */}
            <div ref={(el) => { sectionRefs.current.collateral = el }} className="scroll-mt-16 space-y-4">
              <h2 className={DS.text.sectionTitle}>
                <Building2 className="inline h-6 w-6 mr-2 text-[var(--color-brand-mid)]" />
                담보물 분석
              </h2>

              {/* Basic Info Grid */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>기본 정보</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "유형", value: d.sections.collateral.basicInfo.propertyType },
                    { label: "전용면적", value: `${d.sections.collateral.basicInfo.area}m2 (${(d.sections.collateral.basicInfo.area / 3.306).toFixed(1)}평)` },
                    { label: "건축연도", value: `${d.sections.collateral.basicInfo.buildYear}년` },
                    { label: "주소", value: d.sections.collateral.basicInfo.address },
                  ].map((item) => (
                    <div key={item.label}>
                      <span className={DS.stat.label}>{item.label}</span>
                      <p className={`${DS.text.bodyBold} mt-1`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valuation Comparison */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>가치평가 비교</h3>
                <div className="space-y-3">
                  {[
                    { label: "감정가", value: d.sections.collateral.valuation.appraisalValue, color: "var(--color-brand-mid)" },
                    { label: "공시지가", value: d.sections.collateral.valuation.publicLandPrice, color: "var(--color-text-tertiary)" },
                    { label: "AVM 추정가", value: d.sections.collateral.valuation.avmEstimate, color: "var(--color-positive)" },
                    { label: "최근 거래가", value: d.sections.collateral.valuation.recentTransactionPrice, color: "var(--color-warning)" },
                  ].map((v) => {
                    const maxVal = Math.max(
                      d.sections.collateral.valuation.appraisalValue,
                      d.sections.collateral.valuation.publicLandPrice,
                      d.sections.collateral.valuation.avmEstimate,
                      d.sections.collateral.valuation.recentTransactionPrice
                    )
                    const widthPct = (v.value / maxVal) * 100
                    return (
                      <div key={v.label} className="flex items-center gap-3">
                        <span className={`${DS.text.caption} w-20 shrink-0 text-right`}>{v.label}</span>
                        <div className="flex-1 h-8 bg-[var(--color-surface-sunken)] rounded-lg overflow-hidden relative">
                          <div
                            className="h-full rounded-lg transition-all duration-500"
                            style={{ width: `${widthPct}%`, backgroundColor: v.color, opacity: 0.7 }}
                          />
                          <span className="absolute inset-0 flex items-center px-3 text-[0.8125rem] font-bold tabular-nums text-[var(--color-text-primary)]">
                            {toEok(v.value)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Physical Inspection */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>물리적 상태 점검</h3>
                <div className="space-y-2">
                  {d.sections.collateral.physicalInspection.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-sunken)]">
                      {statusIcon(item.status)}
                      <span className={`${DS.text.micro} w-12 shrink-0`}>{item.category}</span>
                      <span className={`${DS.text.bodyMedium} flex-1`}>{item.item}</span>
                      <span className={DS.text.captionLight}>{item.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Environmental Risk */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>환경 리스크</h3>
                <div className="space-y-2">
                  {d.sections.collateral.environmentalRisk.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-sunken)]">
                      {riskBadge(item.riskLevel)}
                      <span className={`${DS.text.bodyMedium} flex-1`}>{item.item}</span>
                      <span className={DS.text.captionLight}>{item.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              <NarrativeAccordion title="AI 담보물 분석 의견" text={d.aiNarratives.collateralOpinion} />
            </div>

            {/* ══ SECTION 3: LEGAL ANALYSIS ═══════════════════════ */}
            <div ref={(el) => { sectionRefs.current.legal = el }} className="scroll-mt-16 space-y-4">
              <h2 className={DS.text.sectionTitle}>
                <Scale className="inline h-6 w-6 mr-2 text-[var(--color-brand-mid)]" />
                권리관계 분석
              </h2>

              {/* Ownership Timeline */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>소유권 이전 이력</h3>
                <div className="relative pl-6">
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[var(--color-border-default)]" />
                  {d.sections.legal.ownershipChain.map((entry, i) => (
                    <div key={i} className="relative pb-6 last:pb-0">
                      <div className="absolute -left-3.5 top-1 w-3 h-3 rounded-full border-2 border-[var(--color-brand-mid)] bg-[var(--color-surface-elevated)]" />
                      <div className="ml-4">
                        <div className="flex items-center gap-3">
                          <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>{entry.date}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border bg-blue-500/10 text-blue-400 border-blue-500/20">
                            {entry.reason}
                          </span>
                        </div>
                        <p className={`${DS.text.bodyBold} mt-1`}>{entry.owner}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mortgage Structure Table */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>근저당권 구조</h3>
                <div className={DS.table.wrapper}>
                  <table className="w-full">
                    <thead>
                      <tr className={DS.table.header}>
                        <th className={DS.table.headerCell}>순위</th>
                        <th className={DS.table.headerCell}>채권자</th>
                        <th className={`${DS.table.headerCell} text-right`}>채권액</th>
                        <th className={DS.table.headerCell}>설정일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.sections.legal.mortgageStructure.entries.map((e, i) => (
                        <tr key={i} className={DS.table.row}>
                          <td className={DS.table.cell}>
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-brand-mid)]/10 text-[0.6875rem] font-bold text-[var(--color-brand-mid)]">
                              {e.priority}
                            </span>
                          </td>
                          <td className={`${DS.table.cell} font-medium`}>{e.creditor}</td>
                          <td className={`${DS.table.cell} text-right font-semibold tabular-nums`}>{toEok(e.amount)}</td>
                          <td className={DS.table.cellMuted}>{e.date}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[var(--color-surface-sunken)]">
                        <td colSpan={2} className={`${DS.table.cell} font-bold`}>총 채무</td>
                        <td className={`${DS.table.cell} text-right font-bold tabular-nums text-[var(--color-danger)]`}>
                          {toEok(d.sections.legal.mortgageStructure.totalDebt)}
                        </td>
                        <td className={`${DS.table.cell} font-bold`}>
                          LTV {d.sections.legal.mortgageStructure.ltv}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Tenant Risk */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={DS.text.cardTitle}>임차인 현황</h3>
                  {riskBadge(d.sections.legal.tenantRisk.riskLevel)}
                </div>
                <div className={DS.table.wrapper}>
                  <table className="w-full">
                    <thead>
                      <tr className={DS.table.header}>
                        <th className={DS.table.headerCell}>위치</th>
                        <th className={`${DS.table.headerCell} text-right`}>보증금</th>
                        <th className={`${DS.table.headerCell} text-center`}>대항력</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.sections.legal.tenantRisk.tenants.map((t, i) => (
                        <tr key={i} className={DS.table.row}>
                          <td className={`${DS.table.cell} font-medium`}>
                            <Users className="inline h-4 w-4 mr-1.5 text-[var(--color-text-muted)]" />
                            {t.floor}
                          </td>
                          <td className={`${DS.table.cell} text-right tabular-nums`}>{formatKRW(t.deposit)}</td>
                          <td className={`${DS.table.cell} text-center`}>
                            {t.hasOpposability ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-red-500/10 text-red-400 border border-red-500/20">있음</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">없음</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seizures */}
              {d.sections.legal.seizures.length > 0 && (
                <div className={`${DS.card.base} ${DS.card.padding}`}>
                  <h3 className={`${DS.text.cardTitle} mb-4`}>압류/가압류 현황</h3>
                  <div className="space-y-2">
                    {d.sections.legal.seizures.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-sunken)]">
                        {riskBadge(s.riskLevel)}
                        <span className={DS.text.bodyMedium}>{s.type}</span>
                        <span className={`${DS.text.bodyBold} tabular-nums`}>{formatKRW(s.amount)}</span>
                        <span className={DS.text.captionLight}>{s.creditor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dividend Simulation */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>
                  배당 시뮬레이션
                  <span className={`${DS.text.captionLight} ml-2`}>(예상 낙찰가: {toEok(d.sections.legal.dividendSimulation.auctionPrice)})</span>
                </h3>
                <div className={DS.table.wrapper}>
                  <table className="w-full">
                    <thead>
                      <tr className={DS.table.header}>
                        <th className={DS.table.headerCell}>채권자</th>
                        <th className={`${DS.table.headerCell} text-right`}>청구액</th>
                        <th className={`${DS.table.headerCell} text-right`}>배당액</th>
                        <th className={`${DS.table.headerCell} text-right`}>회수율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.sections.legal.dividendSimulation.distributions.map((dist, i) => (
                        <tr key={i} className={DS.table.row}>
                          <td className={`${DS.table.cell} font-medium`}>{dist.creditor}</td>
                          <td className={`${DS.table.cell} text-right tabular-nums`}>{toEok(dist.claimAmount)}</td>
                          <td className={`${DS.table.cell} text-right tabular-nums font-semibold`}>{toEok(dist.receivedAmount)}</td>
                          <td className={`${DS.table.cell} text-right`}>
                            <span
                              className="font-bold tabular-nums"
                              style={{ color: dist.recoveryRate >= 80 ? "var(--color-positive)" : dist.recoveryRate >= 30 ? "var(--color-warning)" : "var(--color-danger)" }}
                            >
                              {dist.recoveryRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <NarrativeAccordion title="AI 법률 검토 의견" text={d.aiNarratives.legalOpinion} />
            </div>

            {/* ══ SECTION 4: FINANCIAL ANALYSIS ═══════════════════ */}
            <div ref={(el) => { sectionRefs.current.financial = el }} className="scroll-mt-16 space-y-4">
              <h2 className={DS.text.sectionTitle}>
                <BarChart3 className="inline h-6 w-6 mr-2 text-[var(--color-brand-mid)]" />
                재무 분석
              </h2>

              {/* Key Financial Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "NPV", value: toEok(d.sections.financial.dcf.npv), color: d.sections.financial.dcf.npv >= 0 ? "var(--color-positive)" : "var(--color-danger)" },
                  { label: "IRR", value: pct(d.sections.financial.dcf.irr), color: d.sections.financial.dcf.irr >= 0.1 ? "var(--color-positive)" : "var(--color-warning)" },
                  { label: "Cap Rate", value: pct(d.sections.financial.metrics.capRate), color: "var(--color-brand-mid)" },
                  { label: "Cash-on-Cash", value: pct(d.sections.financial.metrics.cashOnCash), color: "var(--color-brand-mid)" },
                  { label: "DSCR", value: `${d.sections.financial.metrics.dscr}x`, color: d.sections.financial.metrics.dscr >= 1.2 ? "var(--color-positive)" : "var(--color-danger)" },
                  { label: "투자회수기간", value: `${d.sections.financial.metrics.paybackPeriod}년`, color: d.sections.financial.metrics.paybackPeriod <= 5 ? "var(--color-positive)" : "var(--color-warning)" },
                ].map((m) => (
                  <div key={m.label} className={DS.stat.card}>
                    <div className={DS.stat.label}>{m.label}</div>
                    <div className={DS.stat.value} style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* DCF Waterfall */}
              <WaterfallChart
                yearlyFlows={d.sections.financial.dcf.yearlyFlows}
                npv={d.sections.financial.dcf.npv}
                irr={d.sections.financial.dcf.irr}
              />

              {/* DCF Assumptions */}
              <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
                <h3 className={`${DS.text.cardTitle} mb-3`}>DCF 전제 조건</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "보유기간", value: `${d.sections.financial.dcf.assumptions.holdingPeriod}년` },
                    { label: "할인율", value: pct(d.sections.financial.dcf.assumptions.discountRate) },
                    { label: "Terminal Cap Rate", value: pct(d.sections.financial.dcf.assumptions.terminalCapRate) },
                    { label: "임대 성장률", value: pct(d.sections.financial.dcf.assumptions.rentGrowthRate) },
                    { label: "공실률", value: pct(d.sections.financial.dcf.assumptions.vacancyRate) },
                  ].map((a) => (
                    <div key={a.label} className="p-3 rounded-lg bg-[var(--color-surface-sunken)]">
                      <span className={DS.text.micro}>{a.label}</span>
                      <p className={`${DS.text.metricSmall} mt-1`}>{a.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scenario Comparison */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>시나리오 비교 분석</h3>
                <div className={DS.table.wrapper}>
                  <table className="w-full">
                    <thead>
                      <tr className={DS.table.header}>
                        <th className={DS.table.headerCell}>시나리오</th>
                        <th className={`${DS.table.headerCell} text-right`}>매수가</th>
                        <th className={`${DS.table.headerCell} text-right`}>매각가</th>
                        <th className={`${DS.table.headerCell} text-right`}>보유기간</th>
                        <th className={`${DS.table.headerCell} text-right`}>총수익률</th>
                        <th className={`${DS.table.headerCell} text-right`}>IRR</th>
                        <th className={`${DS.table.headerCell} text-right`}>NPV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.sections.financial.scenarios.map((sc, i) => (
                        <tr key={i} className={DS.table.row}>
                          <td className={`${DS.table.cell} font-bold`}>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border ${
                              sc.name === "보수적" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              sc.name === "중립적" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              "bg-orange-500/10 text-orange-400 border-orange-500/20"
                            }`}>
                              {sc.name}
                            </span>
                          </td>
                          <td className={`${DS.table.cell} text-right tabular-nums`}>{toEok(sc.purchasePrice)}</td>
                          <td className={`${DS.table.cell} text-right tabular-nums`}>{toEok(sc.exitPrice)}</td>
                          <td className={`${DS.table.cell} text-right tabular-nums`}>{sc.holdingPeriod}개월</td>
                          <td className={`${DS.table.cell} text-right font-bold tabular-nums`} style={{ color: sc.totalReturn >= 15 ? "var(--color-positive)" : "var(--color-warning)" }}>
                            {sc.totalReturn}%
                          </td>
                          <td className={`${DS.table.cell} text-right tabular-nums`}>{pct(sc.irr)}</td>
                          <td className={`${DS.table.cell} text-right tabular-nums font-semibold`}>{toEok(sc.npv)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={`${DS.text.captionLight} mt-2`}>
                  * 시나리오별 전제: {d.sections.financial.scenarios.map((s) => `${s.name} - ${s.assumptions}`).join(" | ")}
                </p>
              </div>

              {/* Sensitivity Heatmap */}
              {(() => {
                const sg = buildSensitivityGrid(d.sections.financial.sensitivity)
                if (!sg) return null
                return (
                  <SensitivityHeatmap
                    discountRates={sg.discountRates}
                    capRates={sg.capRates}
                    npvGrid={sg.npvGrid}
                    currentNpv={d.sections.financial.dcf.npv}
                  />
                )
              })()}

              {/* Monte Carlo */}
              {(() => {
                const mc = buildMonteCarloHistogram(d.sections.financial.monteCarlo)
                return (
                  <MonteCarloChart
                    histogram={mc.histogram}
                    statistics={mc.statistics}
                    percentiles={mc.percentiles}
                    probabilities={mc.probabilities}
                  />
                )
              })()}

              {/* NPL 수익성 분석 연동 */}
              <div className={`${DS.card.elevated} ${DS.card.paddingLarge}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`${DS.text.cardTitle} flex items-center gap-2`}>
                      <CircleDollarSign className="h-5 w-5 text-[var(--color-positive)]" />
                      NPL 수익성 분석 (론세일 기준)
                    </h3>
                    <p className={`${DS.text.caption} mt-1`}>배당표 시뮬레이션 · ROI/IRR 산출 · 시나리오 분석</p>
                  </div>
                  <Link href="/analysis/profitability" className={`${DS.text.link} ${DS.text.caption} flex items-center gap-1`}>
                    상세 분석 도구 <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "예상 ROI", value: `${d.roiRange.moderate.toFixed(1)}%`, color: d.roiRange.moderate >= 10 ? "var(--color-positive)" : "var(--color-warning)" },
                    { label: "예상 IRR", value: pct(d.sections.financial.dcf.irr), color: "var(--color-brand-mid)" },
                    { label: "손익분기 낙찰가율", value: "92.1%", color: "var(--color-warning)" },
                    { label: "MC 손실확률", value: (() => {
                      const total = d.sections.financial.monteCarlo.histogram.reduce((s, h) => s + h.count, 0)
                      const lossCount = d.sections.financial.monteCarlo.histogram.filter(h => h.bin < 0).reduce((s, h) => s + h.count, 0)
                      return `${total > 0 ? (lossCount / total * 100).toFixed(1) : "0.0"}%`
                    })(), color: "var(--color-danger)" },
                  ].map(k => (
                    <div key={k.label} className="p-4 rounded-xl bg-[var(--color-surface-sunken)]">
                      <p className={DS.text.micro}>{k.label}</p>
                      <p className={`${DS.text.metricMedium} mt-1`} style={{ color: k.color }}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* 배당표 요약 */}
                <div className="mb-6">
                  <h4 className={`${DS.text.label} mb-3`}>예상 배당표 (BASE 시나리오)</h4>
                  <div className={DS.table.wrapper}>
                    <table className="w-full">
                      <thead>
                        <tr className={DS.table.header}>
                          {["순위", "채권자", "유형", "채권액", "배당액", "회수율"].map(h => (
                            <th key={h} className={DS.table.headerCell}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {d.sections.legal.dividendSimulation.distributions.map((dist, i) => (
                          <tr key={i} className={DS.table.row}>
                            <td className={DS.table.cellMuted}>{i + 1}</td>
                            <td className={DS.table.cell}>{dist.creditor}</td>
                            <td className={DS.table.cellMuted}>{i === 0 ? "집행비용" : "채권"}</td>
                            <td className={`${DS.table.cell} text-right tabular-nums`}>{toEok(dist.claimAmount)}</td>
                            <td className={`${DS.table.cell} text-right tabular-nums font-semibold ${i === d.sections.legal.dividendSimulation.distributions.length - 1 ? "text-[var(--color-brand-mid)]" : ""}`}>
                              {toEok(dist.receivedAmount)}
                            </td>
                            <td className={`${DS.table.cell} text-right tabular-nums`}>{dist.recoveryRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 시나리오 요약 */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "BULL (낙찰↑)", roi: d.roiRange.conservative, color: "border-blue-500/20 bg-blue-500/10" },
                    { label: "BASE (기본)", roi: d.roiRange.moderate, color: "border-[var(--color-brand-mid)] bg-[var(--color-brand-mid)]/5" },
                    { label: "BEAR (낙찰↓)", roi: d.roiRange.aggressive, color: "border-emerald-500/20 bg-emerald-500/10" },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-4 border ${s.color}`}>
                      <p className={DS.text.micro}>{s.label}</p>
                      <p className={`${DS.text.metricMedium} mt-1`} style={{ color: s.roi >= 15 ? "var(--color-positive)" : "var(--color-warning)" }}>
                        ROI {s.roi.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <NarrativeAccordion title="AI 재무 분석 의견" text={d.aiNarratives.financialOpinion} />
            </div>

            {/* ══ SECTION 5: MARKET ANALYSIS ══════════════════════ */}
            <div ref={(el) => { sectionRefs.current.market = el }} className="scroll-mt-16 space-y-4">
              <h2 className={DS.text.sectionTitle}>
                <Activity className="inline h-6 w-6 mr-2 text-[var(--color-brand-mid)]" />
                시장 분석
              </h2>

              {/* NBI Trend */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>NPL Business Index (NBI) 추이</h3>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <LineChart data={d.sections.market.nbiTrend} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border-subtle)", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="value" stroke="var(--color-brand-mid)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-brand-mid)", stroke: "white", strokeWidth: 2 }} name="NBI 지수" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bid Rate Trend */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>낙찰률 추이</h3>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <LineChart data={d.sections.market.bidRateTrend} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                      <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} tickFormatter={(v) => `${v}%`} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border-subtle)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "낙찰률"]} />
                      <Line type="monotone" dataKey="rate" stroke="var(--color-positive)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-positive)", stroke: "white", strokeWidth: 2 }} name="낙찰률" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comp Table */}
              <CompTable
                comparables={d.sections.market.recentTransactions}
                subject={{
                  name: "대상물건 (역삼 래미안 84m2)",
                  askingPrice: 850000000,
                  pricePerPyeong: 33070000,
                  discountRate: 0.167,
                }}
              />

              {/* Supply/Demand */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>수급 동향</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className={DS.stat.card}>
                    <div className={DS.stat.label}>공급 (매물)</div>
                    <div className={DS.stat.value}>{d.sections.market.supplyDemand.supply.toLocaleString()}</div>
                    <div className={DS.stat.sub}>건</div>
                  </div>
                  <div className={DS.stat.card}>
                    <div className={DS.stat.label}>수요 (입찰)</div>
                    <div className={DS.stat.value} style={{ color: "var(--color-positive)" }}>{d.sections.market.supplyDemand.demand.toLocaleString()}</div>
                    <div className={DS.stat.sub}>건</div>
                  </div>
                  <div className={DS.stat.card}>
                    <div className={DS.stat.label}>추세</div>
                    <div className={DS.stat.value} style={{ color: d.sections.market.supplyDemand.trend === "증가" ? "var(--color-positive)" : d.sections.market.supplyDemand.trend === "감소" ? "var(--color-danger)" : "var(--color-warning)" }}>
                      {d.sections.market.supplyDemand.trend}
                    </div>
                    <div className={DS.stat.sub}>수요 기준</div>
                  </div>
                </div>
              </div>

              <NarrativeAccordion title="AI 시장 분석 의견" text={d.aiNarratives.marketOpinion} />
            </div>

            {/* ══ SECTION 6: INVESTMENT OPINION ═══════════════════ */}
            <div ref={(el) => { sectionRefs.current.opinion = el }} className="scroll-mt-16 space-y-4">
              <h2 className={DS.text.sectionTitle}>
                <Landmark className="inline h-6 w-6 mr-2 text-[var(--color-brand-mid)]" />
                투자의견
              </h2>

              {/* Recommended Bid Range */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-5`}>권장 매수 가격대</h3>
                <div className="space-y-4">
                  {/* Range bar */}
                  <div className="relative h-12 bg-[var(--color-surface-sunken)] rounded-xl overflow-hidden">
                    {(() => {
                      const { min, optimal, max } = d.sections.opinion.recommendedBidRange
                      const rangeMin = min * 0.9
                      const rangeMax = max * 1.1
                      const totalRange = rangeMax - rangeMin
                      const minPct = ((min - rangeMin) / totalRange) * 100
                      const optPct = ((optimal - rangeMin) / totalRange) * 100
                      const maxPct = ((max - rangeMin) / totalRange) * 100
                      return (
                        <>
                          <div
                            className="absolute top-0 bottom-0 rounded-xl"
                            style={{ left: `${minPct}%`, width: `${maxPct - minPct}%`, backgroundColor: "rgba(16, 185, 129, 0.15)", borderLeft: "2px solid var(--color-warning)", borderRight: "2px solid var(--color-danger)" }}
                          />
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-[var(--color-positive)]"
                            style={{ left: `${optPct}%` }}
                          />
                          <div className="absolute top-0 bottom-0 flex items-center" style={{ left: `${optPct}%`, transform: "translateX(-50%)" }}>
                            <div className="w-4 h-4 rounded-full bg-[var(--color-positive)] border-2 border-white shadow-md" />
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  <div className="flex justify-between">
                    <div className="text-center">
                      <span className={DS.text.micro}>최소</span>
                      <p className={`${DS.text.metricSmall} text-[var(--color-warning)]`}>{toEok(d.sections.opinion.recommendedBidRange.min)}</p>
                    </div>
                    <div className="text-center">
                      <span className={DS.text.micro}>최적</span>
                      <p className={`${DS.text.metricMedium} text-[var(--color-positive)]`}>{toEok(d.sections.opinion.recommendedBidRange.optimal)}</p>
                    </div>
                    <div className="text-center">
                      <span className={DS.text.micro}>최대</span>
                      <p className={`${DS.text.metricSmall} text-[var(--color-danger)]`}>{toEok(d.sections.opinion.recommendedBidRange.max)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exit Strategies */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>Exit 전략</h3>
                <div className={DS.table.wrapper}>
                  <table className="w-full">
                    <thead>
                      <tr className={DS.table.header}>
                        <th className={DS.table.headerCell}>전략</th>
                        <th className={`${DS.table.headerCell} text-right`}>확률</th>
                        <th className={`${DS.table.headerCell} text-right`}>기대수익률</th>
                        <th className={DS.table.headerCell}>소요기간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.sections.opinion.exitStrategies.map((es, i) => (
                        <tr key={i} className={DS.table.row}>
                          <td className={`${DS.table.cell} font-bold`}>
                            <span className="flex items-center gap-2">
                              {es.type === "매각" ? <Banknote className="h-4 w-4 text-emerald-500" /> :
                               es.type === "임대" ? <Building2 className="h-4 w-4 text-blue-500" /> :
                               <CircleDollarSign className="h-4 w-4 text-orange-500" />}
                              {es.type}
                            </span>
                          </td>
                          <td className={`${DS.table.cell} text-right tabular-nums font-semibold`}>{(es.probability * 100).toFixed(0)}%</td>
                          <td className={`${DS.table.cell} text-right tabular-nums font-bold`} style={{ color: "var(--color-positive)" }}>{es.expectedReturn}%</td>
                          <td className={DS.table.cellMuted}>
                            <Clock className="inline h-3.5 w-3.5 mr-1" />
                            {es.timeframe}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Contract Recommendations */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <h3 className={`${DS.text.cardTitle} mb-4`}>계약 시 유의사항</h3>
                <div className="space-y-2">
                  {d.sections.opinion.contractRecommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface-sunken)]">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-brand-mid)]/10 text-[0.6875rem] font-bold text-[var(--color-brand-mid)] shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className={DS.text.bodyMedium}>{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Matrix */}
              <RiskMatrix risks={d.riskSummary} />

              {/* Disclaimers */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className={`${DS.text.label} text-amber-400`}>DISCLAIMER</span>
                </div>
                <ul className="space-y-1">
                  {d.sections.opinion.disclaimers.map((disc, i) => (
                    <li key={i} className="text-[0.75rem] text-amber-400 leading-relaxed">
                      {i + 1}. {disc}
                    </li>
                  ))}
                </ul>
              </div>

              {/* PDF Download */}
              <div className="flex justify-center pt-4">
                <button onClick={handlePdfDownload} className={`${DS.button.primary} ${DS.button.lg}`}>
                  <Download className="h-5 w-5" />
                  전체 리포트 PDF 다운로드 ({d.metadata.estimatedPages}페이지)
                </button>
              </div>

              <NarrativeAccordion title="AI 투자 결론" text={d.aiNarratives.investmentConclusion} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
