'use client';

import { useState, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedStatsOverview } from '@/components/enhanced-stats-overview';
import { NewsFilters, DEFAULT_FILTERS, type FilterState } from '@/components/news-filters';
import NewsList from '@/components/news-list';
import { ScrapManager } from '@/components/scrap-manager';
import { KeywordRanking } from '@/components/keyword-ranking';
import { NewsDetailPanel } from '@/components/news-detail-panel';
import dynamic from 'next/dynamic';

const chartLoadingFallback = <div className="h-64 animate-pulse rounded-lg bg-[#0D1F38]" />;

const KeywordTrendChart = dynamic(
  () => import('@/components/keyword-trend-chart').then(m => m.KeywordTrendChart),
  { ssr: false, loading: () => chartLoadingFallback }
);
const KeywordCloud = dynamic(
  () => import('@/components/keyword-cloud').then(m => m.KeywordCloud),
  { ssr: false, loading: () => chartLoadingFallback }
);
const NewsHeatmap = dynamic(
  () => import('@/components/news-heatmap').then(m => m.NewsHeatmap),
  { ssr: false, loading: () => chartLoadingFallback }
);
const SentimentBubbleChart = dynamic(
  () => import('@/components/sentiment-bubble-chart').then(m => m.SentimentBubbleChart),
  { ssr: false, loading: () => chartLoadingFallback }
);
const RegionRadarChart = dynamic(
  () => import('@/components/region-radar-chart').then(m => m.RegionRadarChart),
  { ssr: false, loading: () => chartLoadingFallback }
);
const KeywordNetwork = dynamic(
  () => import('@/components/keyword-network').then(m => m.KeywordNetwork),
  { ssr: false, loading: () => chartLoadingFallback }
);
const KoreaRegionMap = dynamic(
  () => import('@/components/korea-region-map').then(m => m.KoreaRegionMap),
  { ssr: false, loading: () => chartLoadingFallback }
);
const PeriodCompareChart = dynamic(
  () => import('@/components/period-compare-chart').then(m => m.PeriodCompareChart),
  { ssr: false, loading: () => chartLoadingFallback }
);
const DirectionDonutChart = dynamic(
  () => import('@/components/direction-donut-chart').then(m => m.DirectionDonutChart),
  { ssr: false, loading: () => chartLoadingFallback }
);
const KeywordAlertModal = dynamic(
  () => import('@/components/keyword-alert-modal').then(m => m.KeywordAlertModal),
  { ssr: false }
);
const MarketInsightPanel = dynamic(
  () => import('@/components/market-insight-panel').then(m => m.MarketInsightPanel),
  { ssr: false, loading: () => chartLoadingFallback }
);
import type { DummyArticle } from '@/lib/dummy-data';
import { X, ChevronDown, ChevronUp, Printer, TrendingUp, BarChart3, Newspaper } from 'lucide-react';

// 활성 필터 칩 레이블 생성
function buildChips(f: FilterState): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  if (f.keyword)                     chips.push({ key: 'keyword',   label: `키워드: ${f.keyword}` });
  if (f.sido !== '전국')             chips.push({ key: 'sido',      label: `지역: ${f.sido}` });
  if (f.provider !== '전체')         chips.push({ key: 'provider',  label: `언론사: ${f.provider}` });
  if (f.period !== 'all') {
    const labels: Record<string, string> = {
      today: '오늘', '1week': '1주일', '1month': '1개월', '3months': '3개월', '6months': '6개월',
    };
    chips.push({ key: 'period', label: `기간: ${labels[f.period] ?? f.period}` });
  }
  if (f.direction !== '전체')        chips.push({ key: 'direction', label: `전망: ${f.direction}` });
  if (f.date)                        chips.push({ key: 'date',      label: `날짜: ${f.date}` });
  return chips;
}

const CATEGORY_FILTERS = [
  { key: '전체', label: '전체', color: 'bg-[#2E75B6] text-white' },
  { key: '규제', label: '규제·정책', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  { key: '경매', label: '경매·공매', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  { key: '판례', label: '판례·법원', color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
  { key: '시장', label: '시장·거래', color: 'bg-red-500/20 text-red-300 border border-red-500/30' },
];

export default function NewsPage() {
  const [activeTab,     setActiveTab]     = useState('search');
  const [pending,       setPending]       = useState<FilterState>(DEFAULT_FILTERS);
  const [applied,       setApplied]       = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedAt,     setAppliedAt]     = useState(0);
  const [deepOpen,      setDeepOpen]      = useState(false);
  const [activeCategory, setActiveCategory] = useState('전체');

  // 뉴스 상세 패널
  const [detailArticle, setDetailArticle] = useState<DummyArticle | null>(null);
  const [detailOpen,    setDetailOpen]    = useState(false);

  // 키워드 클릭 시 필터 자동 적용 + 뉴스 탭으로 스크롤
  const newsTabRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(() => {
    setApplied(pending);
    setAppliedAt(Date.now());
  }, [pending]);

  const removeChip = (key: string) => {
    const next = { ...applied, [key]: (DEFAULT_FILTERS as any)[key] };
    setPending(next);
    setApplied(next);
    setAppliedAt(Date.now());
  };

  const handleSidoClick = useCallback((sido: string) => {
    const next: FilterState = { ...DEFAULT_FILTERS, sido };
    setPending(next);
    setApplied(next);
    setAppliedAt(Date.now());
    setActiveTab('search');
    setTimeout(() => {
      newsTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleKeywordClick = useCallback((keyword: string) => {
    const next: FilterState = { ...DEFAULT_FILTERS, keyword };
    setPending(next);
    setApplied(next);
    setAppliedAt(Date.now());
    setActiveTab('search');
    setTimeout(() => {
      newsTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleDateClick = useCallback((date: string) => {
    const next: FilterState = { ...DEFAULT_FILTERS, date };
    setPending(next);
    setApplied(next);
    setAppliedAt(Date.now());
    setActiveTab('search');
    setTimeout(() => {
      newsTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleArticleClick = useCallback((article: DummyArticle) => {
    setDetailArticle(article);
    setDetailOpen(true);
  }, []);

  const chips = buildChips(applied);

  return (
    <div className="min-h-screen bg-[#060E1C]">

      {/* ── Editorial Header ── */}
      <div className="bg-[#0D1F38] border-b border-[#1a3a5c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top bar */}
          <div className="flex items-center justify-between py-4 border-b border-[#1a3a5c]/60">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded bg-[#2E75B6]">
                <Newspaper className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">NPL 뉴스</h1>
                <p className="text-xs text-[#7BA7C7] mt-0.5">부동산 NPL 시장 실시간 뉴스 인사이트</p>
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                className="gap-1.5 h-8 px-2 rounded-md flex items-center text-xs text-[#7BA7C7] hover:text-white hover:bg-[#1a3a5c] transition-colors"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" />
                PDF
              </button>
              <KeywordAlertModal />
            </div>
          </div>

          {/* Category filter chips */}
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            <span className="text-[11px] text-[#4a7a9b] font-medium shrink-0 mr-1">섹션</span>
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat.key
                    ? cat.color + ' shadow-lg shadow-[#2E75B6]/20'
                    : 'bg-[#0D2540] text-[#7BA7C7] hover:bg-[#1a3a5c] hover:text-white border border-[#1a3a5c]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* AI 시장 인사이트 */}
        <div className="rounded-xl overflow-hidden border border-[#1a3a5c] bg-[#0D1F38]">
          <div className="px-4 py-2.5 border-b border-[#1a3a5c] flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-[#2E75B6]" />
            <span className="text-xs font-semibold text-[#7BA7C7] uppercase tracking-wider">AI Market Insight</span>
          </div>
          <div className="p-4">
            <MarketInsightPanel />
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="rounded-xl overflow-hidden border border-[#1a3a5c] bg-[#0D1F38]">
          <div className="px-4 py-2.5 border-b border-[#1a3a5c] flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-[#2E75B6]" />
            <span className="text-xs font-semibold text-[#7BA7C7] uppercase tracking-wider">News Statistics</span>
          </div>
          <div className="p-4">
            <EnhancedStatsOverview />
          </div>
        </div>

        {/* 키워드 트렌드 + 순위 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-[#1a3a5c] bg-[#0D1F38] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#1a3a5c]">
              <span className="text-xs font-semibold text-[#7BA7C7] uppercase tracking-wider">Keyword Trends</span>
            </div>
            <div className="p-4">
              <KeywordTrendChart />
            </div>
          </div>
          <div className="rounded-xl border border-[#1a3a5c] bg-[#0D1F38] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#1a3a5c]">
              <span className="text-xs font-semibold text-[#7BA7C7] uppercase tracking-wider">Keyword Ranking</span>
            </div>
            <div className="p-4">
              <KeywordRanking onKeywordClick={handleKeywordClick} />
            </div>
          </div>
        </div>

        {/* 키워드 클라우드 */}
        <div className="rounded-xl border border-[#1a3a5c] bg-[#0D1F38] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1a3a5c]">
            <span className="text-xs font-semibold text-[#7BA7C7] uppercase tracking-wider">Keyword Cloud</span>
          </div>
          <div className="p-4">
            <KeywordCloud onKeywordClick={handleKeywordClick} />
          </div>
        </div>

        {/* ── 심화 분석 섹션 ── */}
        <div className="rounded-xl border border-[#1a3a5c] bg-[#0D1F38] overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#1a3a5c]/30 transition-colors"
            onClick={() => setDeepOpen((v) => !v)}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-4 w-4 text-[#2E75B6]" />
              <span className="text-sm font-semibold text-white">심화 시각화 분석</span>
              <span className="hidden sm:inline text-[11px] text-[#4a7a9b] bg-[#0D2540] px-2.5 py-0.5 rounded-full border border-[#1a3a5c]">
                히트맵 · 감성 산점도 · 지역 레이더 · 키워드 네트워크
              </span>
            </div>
            {deepOpen
              ? <ChevronUp className="h-4 w-4 text-[#4a7a9b]" />
              : <ChevronDown className="h-4 w-4 text-[#4a7a9b]" />}
          </button>

          {deepOpen && (
            <div className="px-4 pb-5 space-y-4 border-t border-[#1a3a5c] pt-4">
              <NewsHeatmap onDateClick={handleDateClick} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <KoreaRegionMap onRegionClick={handleSidoClick} />
                <PeriodCompareChart />
                <DirectionDonutChart />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SentimentBubbleChart onKeywordClick={handleKeywordClick} />
                <RegionRadarChart />
              </div>
              <KeywordNetwork onKeywordClick={handleKeywordClick} />
            </div>
          )}
        </div>

        {/* ── 뉴스 검색 / 스크랩 탭 ── */}
        <div ref={newsTabRef} className="rounded-xl border border-[#1a3a5c] bg-[#0D1F38] overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Tab header styled like editorial section bar */}
            <div className="border-b border-[#1a3a5c] px-4 pt-3">
              <TabsList className="bg-transparent gap-1 h-auto pb-0">
                <TabsTrigger
                  value="search"
                  className="text-sm font-medium text-[#7BA7C7] data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#2E75B6] rounded-none pb-2.5 px-3"
                >
                  뉴스 검색
                </TabsTrigger>
                <TabsTrigger
                  value="scrap"
                  className="text-sm font-medium text-[#7BA7C7] data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#2E75B6] rounded-none pb-2.5 px-3"
                >
                  스크랩 관리
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="search" className="space-y-4 p-4">
              {/* 필터 패널 */}
              <NewsFilters
                value={pending}
                onChange={setPending}
                onSearch={handleSearch}
              />

              {/* 활성 필터 칩 */}
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-[#4a7a9b]">적용된 필터:</span>
                  {chips.map((chip) => (
                    <button
                      key={chip.key}
                      className="inline-flex items-center gap-1 pr-1.5 pl-2 py-0.5 text-xs cursor-pointer bg-[#1a3a5c] text-[#7BA7C7] hover:bg-[#2E75B6]/20 hover:text-white border border-[#2E75B6]/30 rounded-full transition-colors"
                      onClick={() => removeChip(chip.key)}
                    >
                      {chip.label}
                      <X className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              )}

              {/* 뉴스 목록 */}
              <NewsList
                filters={applied}
                appliedAt={appliedAt}
                onArticleClick={handleArticleClick}
              />
            </TabsContent>

            <TabsContent value="scrap" className="p-4">
              <ScrapManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 뉴스 상세 패널 */}
      <NewsDetailPanel
        article={detailArticle}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
