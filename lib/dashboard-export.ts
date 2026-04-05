import * as XLSX from 'xlsx'

interface DashboardStats {
  total_concepts: number
  total_videos: number
  total_mappings: number
  total_experts: number
  coverage_rate: number
  domain_stats: Array<{
    domain_id: number
    domain_name: string
    concept_count: number
    covered_count: number
    coverage_rate: number
  }>
  level_stats: Array<{
    level: string
    concept_count: number
    covered_count: number
    coverage_rate: number
  }>
  top_concepts: Array<{
    concept_id: number
    concept_name: string
    domain_name: string
    expert_count: number
    avg_relevance: number
  }>
  coverage_matrix: Record<string, Record<string, { total: number; covered: number; rate: number }>>
}

export function exportDashboardToXlsx(stats: DashboardStats) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Overview
  const overview = [
    ['온톨로지 분석 대시보드 요약'],
    [],
    ['항목', '값'],
    ['전체 개념 수', stats.total_concepts],
    ['분석 영상 수', stats.total_videos],
    ['매핑 수', stats.total_mappings],
    ['전문가 수', stats.total_experts],
    ['커버리지율', `${stats.coverage_rate}%`],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(overview)
  ws1['!cols'] = [{ wch: 20 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, ws1, '개요')

  // Sheet 2: Domain Stats
  const domainRows = stats.domain_stats.map(d => [
    d.domain_name, d.concept_count, d.covered_count, `${d.coverage_rate}%`,
  ])
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['도메인', '개념 수', '커버된 수', '커버율'],
    ...domainRows,
  ])
  ws2['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws2, '도메인별 통계')

  // Sheet 3: Level Stats
  const levelRows = stats.level_stats.map(l => [
    l.level, l.concept_count, l.covered_count, `${l.coverage_rate}%`,
  ])
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['레벨', '개념 수', '커버된 수', '커버율'],
    ...levelRows,
  ])
  ws3['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws3, '레벨별 통계')

  // Sheet 4: Top Concepts
  const topRows = stats.top_concepts.map((c, i) => [
    i + 1, c.concept_name, c.domain_name, c.expert_count, `${Math.round(c.avg_relevance * 100)}%`,
  ])
  const ws4 = XLSX.utils.aoa_to_sheet([
    ['순위', '개념명', '도메인', '전문가 수', '평균 관련도'],
    ...topRows,
  ])
  ws4['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws4, 'Top 개념')

  // Sheet 5: Coverage Matrix
  const levels = stats.level_stats.map(l => l.level)
  const matrixHeader = ['도메인', ...levels]
  const matrixRows = stats.domain_stats.map(d => [
    d.domain_name,
    ...levels.map(l => {
      const cell = stats.coverage_matrix?.[d.domain_id]?.[l]
      return cell ? `${cell.rate}% (${cell.covered}/${cell.total})` : '-'
    }),
  ])
  const ws5 = XLSX.utils.aoa_to_sheet([matrixHeader, ...matrixRows])
  ws5['!cols'] = [{ wch: 20 }, ...levels.map(() => ({ wch: 18 }))]
  XLSX.utils.book_append_sheet(wb, ws5, '커버리지 매트릭스')

  XLSX.writeFile(wb, `대시보드_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
