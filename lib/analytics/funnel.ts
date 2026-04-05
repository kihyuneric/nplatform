export interface FunnelStep { name: string; count: number; rate: number }

export function generateFunnelData(): FunnelStep[] {
  return [
    { name: '매물 검색', count: 5420, rate: 100 },
    { name: '매물 조회', count: 3180, rate: 58.7 },
    { name: '관심 표명', count: 847, rate: 15.6 },
    { name: 'NDA 체결', count: 423, rate: 7.8 },
    { name: '실사 진행', count: 215, rate: 4.0 },
    { name: '오퍼 제출', count: 142, rate: 2.6 },
    { name: '거래 완료', count: 89, rate: 1.6 },
  ]
}
