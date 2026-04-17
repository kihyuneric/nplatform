'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud } from 'lucide-react';
import type { KeywordCategory } from '@/lib/dummy-data';
import { KEYWORD_CATEGORY_MAP } from '@/lib/dummy-data';

interface KeywordItem {
  keyword: string;
  count: number;
  rank: number;
  change: number;
}

interface Props {
  onKeywordClick?: (keyword: string) => void;
}

const CATEGORY_STYLES: Record<KeywordCategory, { bg: string; text: string; border: string }> = {
  '거래/시장': { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20'   },
  '개발/지역': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  '정책/규제': { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20'   },
  '투자/금융': { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20'  },
};

const CATEGORY_LEGEND: { category: KeywordCategory; label: string }[] = [
  { category: '거래/시장', label: '거래/시장' },
  { category: '개발/지역', label: '개발/지역' },
  { category: '정책/규제', label: '정책/규제' },
  { category: '투자/금융', label: '투자/금융' },
];

// count → 폰트사이즈 & 패딩 매핑
function getBadgeSize(count: number, max: number) {
  const ratio = count / max;
  if (ratio > 0.75) return 'text-base font-bold px-3.5 py-1.5';
  if (ratio > 0.5)  return 'text-sm font-semibold px-3 py-1.5';
  if (ratio > 0.3)  return 'text-sm font-medium px-2.5 py-1';
  return 'text-xs font-medium px-2 py-0.5';
}

export function KeywordCloud({ onKeywordClick }: Props) {
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 일간 + 주간 합산으로 더 많은 키워드 확보
        const [d, w] = await Promise.all([
          fetch('/api/daily-top-keywords').then((r) => r.json()),
          fetch('/api/weekly-top-keywords').then((r) => r.json()),
        ]);
        const daily:  KeywordItem[] = d.data ?? [];
        const weekly: KeywordItem[] = w.data ?? [];

        // 합산 (중복 시 count 최대값)
        const merged: Record<string, KeywordItem> = {};
        [...daily, ...weekly].forEach((kw) => {
          if (!merged[kw.keyword] || kw.count > merged[kw.keyword].count) {
            merged[kw.keyword] = kw;
          }
        });
        // count 기준 내림차순, 최대 24개
        const sorted = Object.values(merged)
          .sort((a, b) => b.count - a.count)
          .slice(0, 24);
        setKeywords(sorted);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const max = keywords[0]?.count ?? 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-4 w-4 text-blue-600" />
            키워드 클라우드
          </CardTitle>
          {/* 범례 */}
          <div className="flex items-center gap-3">
            {CATEGORY_LEGEND.map(({ category, label }) => {
              const s = CATEGORY_STYLES[category];
              return (
                <span key={category} className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 rounded-full border ${s.border} ${s.bg}`} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </span>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-5">
        {loading ? (
          <div className="flex flex-wrap gap-2 min-h-[100px]">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="h-7 rounded-full bg-muted animate-pulse"
                style={{ width: `${40 + (i % 4) * 20}px` }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {keywords.map((kw) => {
              const category  = KEYWORD_CATEGORY_MAP[kw.keyword] ?? '거래/시장';
              const style     = CATEGORY_STYLES[category];
              const sizeClass = getBadgeSize(kw.count, max);

              return (
                <button
                  key={kw.keyword}
                  onClick={() => onKeywordClick?.(kw.keyword)}
                  className={`
                    rounded-full border transition-all duration-150
                    hover:scale-105 hover:shadow-sm active:scale-95
                    ${style.bg} ${style.text} ${style.border} ${sizeClass}
                    ${onKeywordClick ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  title={`${kw.keyword} — ${kw.count.toLocaleString()}건`}
                >
                  {kw.keyword}
                </button>
              );
            })}
          </div>
        )}

        {!loading && keywords.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            키워드 데이터가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
