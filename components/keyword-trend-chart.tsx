'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

// 키워드별 색상
const KW_COLORS: Record<string, string> = {
  '아파트': '#3b82f6',
  '전세':   '#f59e0b',
  '매매':   '#22c55e',
  '청약':   '#8b5cf6',
  '재건축': '#ef4444',
};

interface TrendPoint {
  date: string;
  [keyword: string]: number | string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-xs min-w-32">
      <p className="font-semibold mb-1 text-gray-700">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="flex items-center justify-between gap-3">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-bold">{entry.value}건</span>
        </p>
      ))}
    </div>
  );
}

export function KeywordTrendChart() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/keyword-trend');
      if (res.ok) {
        const json = await res.json();
        // { trend: [{date, keywords: {아파트:120, ...}}, ...] }
        const transformed: TrendPoint[] = json.trend.map((item: any) => ({
          date: item.date.slice(5), // MM-DD
          ...item.keywords,
        }));
        setData(transformed);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          키워드 트렌드 (14일)
        </CardTitle>
      </CardHeader>
      <CardContent className="pr-2">
        {loading ? (
          <div className="h-52 animate-pulse bg-muted rounded" />
        ) : (
          <div role="img" aria-label="키워드 트렌드 라인 차트: 아파트, 전세, 매매, 청약, 재건축 키워드의 14일간 추이">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                interval={1}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              {Object.entries(KW_COLORS).map(([keyword, color]) => (
                <Line
                  key={keyword}
                  type="monotone"
                  dataKey={keyword}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
