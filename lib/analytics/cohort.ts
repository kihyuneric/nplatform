export interface CohortData { period: string; users: number; retention: number[] }

export function generateCohortData(): CohortData[] {
  return [
    { period: '2026-01', users: 120, retention: [100, 78, 65, 52, 45, 40] },
    { period: '2026-02', users: 185, retention: [100, 82, 70, 58, 48] },
    { period: '2026-03', users: 230, retention: [100, 85, 72, 60] },
  ]
}
