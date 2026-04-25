'use client';

import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar, Building, MapPin, ExternalLink,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import type { DummyArticle, KeywordCategory } from '@/lib/dummy-data';
import { KEYWORD_CATEGORY_MAP } from '@/lib/dummy-data';

interface Props {
  article: DummyArticle | null;
  open: boolean;
  onClose: () => void;
}

const CATEGORY_STYLES: Record<KeywordCategory, { bg: string; text: string; border: string }> = {
  '거래/시장': { bg: 'bg-stone-100/10',   text: 'text-stone-900',   border: 'border-stone-300/20'   },
  '개발/지역': { bg: 'bg-stone-100/10', text: 'text-stone-900', border: 'border-stone-300/20' },
  '정책/규제': { bg: 'bg-stone-100/10',   text: 'text-stone-900',   border: 'border-stone-300/20'   },
  '투자/금융': { bg: 'bg-stone-100/10',  text: 'text-stone-900',  border: 'border-stone-300/20'  },
};

const DIR_INFO: Record<string, { icon: typeof TrendingUp; color: string; bg: string }> = {
  '상승': { icon: TrendingUp,  color: 'text-stone-900', bg: 'bg-stone-100/10 border-stone-300/20' },
  '하락': { icon: TrendingDown, color: 'text-stone-900',     bg: 'bg-stone-100/10 border-stone-300/20'         },
  '중립': { icon: Minus,        color: 'text-[var(--color-text-secondary)]',    bg: 'bg-[var(--color-surface-base)] border-[var(--color-border-subtle)]'        },
};

/** SVG 원형 게이지 (0~1) */
function CircleGauge({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="text-lg font-bold tabular-nums" style={{ color }}>
        {Math.round(value * 100)}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

/** 수평 감성 바 (-1~1) */
function SentimentBar({ value }: { value: number }) {
  // -1=완전부정, 0=중립, 1=완전긍정
  const pct = ((value + 1) / 2) * 100;            // 0~100
  const clamp = Math.max(0, Math.min(100, pct));

  const label =
    value >= 0.5  ? '매우 긍정' :
    value >= 0.2  ? '긍정'      :
    value >= -0.2 ? '중립'      :
    value >= -0.5 ? '부정'      : '매우 부정';

  const color =
    value >= 0.2  ? '#22c55e' :
    value >= -0.2 ? '#94a3b8' : '#ef4444';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>부정</span>
        <span className="font-semibold" style={{ color }}>{label}</span>
        <span>긍정</span>
      </div>
      <div className="relative h-3 rounded-full bg-gradient-to-r from-stone-100 via-gray-200 to-stone-100">
        {/* 중앙 축 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-px bg-gray-400/40" />
        {/* 포인터 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
          style={{ left: `calc(${clamp}% - 8px)`, backgroundColor: color, transition: 'left 0.6s ease' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>-1.0</span>
        <span>{value.toFixed(2)}</span>
        <span>+1.0</span>
      </div>
    </div>
  );
}

export function NewsDetailPanel({ article, open, onClose }: Props) {
  if (!article) return null;

  const dir     = DIR_INFO[article.direction] ?? DIR_INFO['중립'];
  const DirIcon = dir.icon;
  const pubdate = article.published_at.split('T')[0];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-base leading-snug pr-6">
            {article.title}
          </SheetTitle>

          {/* 메타 */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />{pubdate}
            </span>
            <span className="flex items-center gap-1">
              <Building className="h-3 w-3" />{article.provider}
            </span>
            {(article.sido || article.sigungu) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[article.sido, article.sigungu].filter(Boolean).join(' ')}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 py-5">
          {/* 요약 */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">기사 요약</h4>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{article.summary}</p>
          </section>

          {/* 방향성 뱃지 */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">시장 방향성</h4>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${dir.bg} ${dir.color}`}>
              <DirIcon className="h-4 w-4" />
              {article.direction}
            </div>
          </section>

          {/* NLP 게이지 */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">NLP 분석</h4>
            <div className="flex justify-around">
              <CircleGauge
                value={article.direction_score}
                color={article.direction === '상승' ? '#22c55e' : article.direction === '하락' ? '#ef4444' : '#94a3b8'}
                label="방향성 확신도"
              />
              <div className="w-px bg-border" />
              <CircleGauge
                value={(article.sentiment_score + 1) / 2}
                color={article.sentiment_score >= 0.2 ? '#22c55e' : article.sentiment_score >= -0.2 ? '#94a3b8' : '#ef4444'}
                label="긍정도"
              />
            </div>
          </section>

          {/* 감성 바 */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">감성 분석</h4>
            <SentimentBar value={article.sentiment_score} />
          </section>

          {/* 키워드 */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">추출 키워드</h4>
            <div className="flex flex-wrap gap-2">
              {article.keywords.map((kw) => {
                const cat   = KEYWORD_CATEGORY_MAP[kw] ?? '거래/시장';
                const style = CATEGORY_STYLES[cat];
                return (
                  <span
                    key={kw}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium ${style.bg} ${style.text} ${style.border}`}
                  >
                    {kw}
                  </span>
                );
              })}
            </div>
            {/* 카테고리 범례 */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {(Object.entries(CATEGORY_STYLES) as [KeywordCategory, typeof CATEGORY_STYLES[KeywordCategory]][]).map(([cat, s]) => (
                <span key={cat} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={`w-2 h-2 rounded-full border ${s.border} ${s.bg}`} />
                  {cat}
                </span>
              ))}
            </div>
          </section>

          {/* 원문 링크 자리 (더미이므로 비활성) */}
          <section className="pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full gap-2" disabled>
              <ExternalLink className="h-4 w-4" />
              원문 보기 (더미 데이터)
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
