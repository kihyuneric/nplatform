'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hash, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KeywordItem {
  keyword: string;
  count: number;
  rank: number;
  change: number;
}

interface Props {
  onKeywordClick?: (keyword: string) => void;
}

const RANK_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

export function KeywordRanking({ onKeywordClick }: Props) {
  const [mode, setMode]         = useState<'daily' | 'weekly'>('daily');
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = mode === 'daily'
        ? '/api/daily-top-keywords'
        : '/api/weekly-top-keywords';
      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        // API는 { data: [...] } 형태 반환
        setKeywords(json.data ?? json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4 text-blue-600" />
            키워드 순위
          </CardTitle>
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
            <Button
              variant={mode === 'daily' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs px-2.5 rounded-md"
              onClick={() => setMode('daily')}
            >
              일간
            </Button>
            <Button
              variant={mode === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs px-2.5 rounded-md"
              onClick={() => setMode('weekly')}
            >
              주간
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-7 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {keywords.map((kw) => (
              <div
                key={kw.keyword}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/60 transition-colors group ${onKeywordClick ? 'cursor-pointer' : ''}`}
                onClick={() => onKeywordClick?.(kw.keyword)}
              >
                {/* 순위 뱃지 */}
                <span
                  className={`w-5 text-center text-xs font-bold shrink-0 ${
                    kw.rank <= 3
                      ? RANK_COLORS[kw.rank - 1]
                      : 'text-muted-foreground'
                  }`}
                >
                  {kw.rank}
                </span>

                {/* 키워드 */}
                <span className={`flex-1 text-sm font-medium truncate ${onKeywordClick ? 'group-hover:text-blue-600' : ''}`}>
                  {kw.keyword}
                </span>

                {/* 건수 */}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {kw.count.toLocaleString()}
                </span>

                {/* 등락 표시 */}
                {kw.change > 0 ? (
                  <span className="flex items-center text-[10px] text-emerald-600 font-semibold w-8 justify-end shrink-0">
                    <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                    {kw.change}
                  </span>
                ) : kw.change < 0 ? (
                  <span className="flex items-center text-[10px] text-red-500 font-semibold w-8 justify-end shrink-0">
                    <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                    {Math.abs(kw.change)}
                  </span>
                ) : (
                  <span className="flex items-center justify-end w-8 shrink-0">
                    <Minus className="h-2.5 w-2.5 text-muted-foreground" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
