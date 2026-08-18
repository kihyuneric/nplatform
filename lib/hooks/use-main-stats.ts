'use client'

/**
 * useMainStats — 메인/NPL 자동매칭 지표 자동연동 (2026-08-18)
 *
 * 운영 관리자(/admin/main-stats)에서 입력한 값이 site-settings(api_configs)에 저장되고,
 * 메인 KPI · 라이브 티커 · NPL 자동매칭 KPI 가 이 훅으로 동일 값을 표시한다.
 * 저장값이 없으면 lib/platform-stats.ts (SSoT) 기본값으로 폴백.
 */

import { useEffect, useState } from 'react'
import { PLATFORM_STATS } from '@/lib/platform-stats'

export interface MainStats {
  nplCount: string           // NPL 등록 수 (예: 789개)
  appraisalTotal: string     // 감정평가 총액
  mortgageTotal: string      // 근저당권 설정금액
  loanPrincipalTotal: string // 대출원금 총액
  institutions: string       // 참여 기관
  sellers: string            // 매각사 (티커)
  buyers: string             // 매입사 (티커)
  investors: string          // 투자자 (티커)
  successCases: string       // 성공사례 (티커)
}

export const DEFAULT_MAIN_STATS: MainStats = {
  nplCount: PLATFORM_STATS.nplCount,
  appraisalTotal: PLATFORM_STATS.appraisalTotal,
  mortgageTotal: PLATFORM_STATS.mortgageTotal,
  loanPrincipalTotal: PLATFORM_STATS.loanPrincipalTotal,
  institutions: PLATFORM_STATS.institutions,
  sellers: '60개사',
  buyers: '180개사',
  investors: '340명',
  successCases: '120건',
}

export function useMainStats(): MainStats {
  const [stats, setStats] = useState<MainStats>(DEFAULT_MAIN_STATS)
  useEffect(() => {
    fetch('/api/v1/admin/site-settings')
      .then(r => r.json())
      .then(d => {
        const s = (d?.data ?? {}) as Record<string, string>
        setStats(prev => ({
          nplCount: s.statNplCount || prev.nplCount,
          appraisalTotal: s.statAppraisalTotal || prev.appraisalTotal,
          mortgageTotal: s.statMortgageTotal || prev.mortgageTotal,
          loanPrincipalTotal: s.statPrincipalTotal || prev.loanPrincipalTotal,
          institutions: s.statInstitutions || prev.institutions,
          sellers: s.statSellers || prev.sellers,
          buyers: s.statBuyers || prev.buyers,
          investors: s.statInvestors || prev.investors,
          successCases: s.statSuccess || prev.successCases,
        }))
      })
      .catch(() => {})
  }, [])
  return stats
}
