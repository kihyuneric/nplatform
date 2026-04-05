'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, ZAxis, Cell,
} from 'recharts';
import { Sparkles } from 'lucide-react';
import { getDummySentimentScatter } from '@/lib/dummy-data';

const SIDO_COLORS: Record<string, string> = {
  '서울': '#3b82f6',
  '경기': '#22c55e',
  '인천': '#f59e0b',
  '부산': '#ef4444',
  '대구': '#8b5cf6',
  '세종': '#06b6d4',
  '광주': '#f97316',
  '전국': '#6b7280',
};

function getColor(sido: string) {
  return SIDO_COLORS[sido] ?? '#94a3b8';
}

// 4분면 라벨
const QUADRANTS = [
  { x: 0.76, y: 0.72,  label: '강한 상승', color: '#1d4ed8' },
  { x: 0.18, y: 0.72,  label: '불확실 낙관', color: '#0891b2' },
  { x: 0.76, y: -0.72, label: '강한 하락', color: '#b91c1c' },
  { x: 0.18, y: -0.72, label: '불확실 우려', color: '#9f1239' },
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border shadow-lg rounded-lg px-3 py-2 text-xs max-w-[200px]">
      <p className="font-semibold text-gray-800 mb-1 leading-tight">{d.title}</p>
      <p className="text-muted-foreground mb-1">{d.sido}</p>
      <div className="flex gap-2 text-[11px]">
        <span className="text-blue-600">방향성 {(d.x * 100).toFixed(0)}%</span>
        <span className={d.y >= 0 ? 'text-green-600' : 'text-red-600'}>
          감성 {d.y >= 0 ? '+' : ''}{d.y.toFixed(2)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {d.keywords?.slice(0, 3).map((k: string) => (
          <span key={k} className="bg-gray-100 text-gray-600 rounded px-1">{k}</span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  onKeywordClick?: (keyword: string) => void;
}

export function SentimentBubbleChart({ onKeywordClick }: Props) {
  const [hiddenSido, setHiddenSido] = useState<Set<string>>(new Set());

  const raw = useMemo(() => getDummySentimentScatter(), []);

  const chartData = useMemo(
    () =>
      raw
        .filter((d) => !hiddenSido.has(d.sido))
        .map((d) => ({
          x: d.direction_score,
          y: d.sentiment_score,
          title: d.title,
          sido: d.sido,
          direction: d.direction,
          keywords: d.keywords,
        })),
    [raw, hiddenSido],
  );

  const sidos = useMemo(() => [...new Set(raw.map((d) => d.sido))].sort(), [raw]);

  const toggleSido = (sido: string) => {
    setHiddenSido((prev) => {
      const next = new Set(prev);
      next.has(sido) ? next.delete(sido) : next.add(sido);
      return next;
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-purple-600" />
          감성 분포 분석
        </CardTitle>
        {/* 지역 필터 */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {sidos.map((sido) => {
            const hidden = hiddenSido.has(sido);
            return (
              <button
                key={sido}
                onClick={() => toggleSido(sido)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  hidden
                    ? 'bg-gray-100 text-gray-400 border-gray-200'
                    : 'text-white border-transparent'
                }`}
                style={hidden ? {} : { backgroundColor: getColor(sido) }}
              >
                {sido}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pr-2 pb-4">
        <div className="relative" role="img" aria-label="감성 분포 분석 산점도 차트: X축은 방향성 확신도, Y축은 감성 점수">
          {/* 4분면 라벨 오버레이 */}
          <div className="absolute inset-0 pointer-events-none" style={{ top: 10, left: 20, right: 10, bottom: 30 }}>
            <div className="relative w-full h-full">
              {QUADRANTS.map((q) => {
                const xPct = ((q.x - 0) / 1) * 100;
                const yPct = ((1 - (q.y + 1) / 2)) * 100;
                return (
                  <span
                    key={q.label}
                    className="absolute text-[9px] font-semibold opacity-30 select-none"
                    style={{ left: `${xPct}%`, top: `${yPct}%`, color: q.color, transform: 'translate(-50%, -50%)' }}
                  >
                    {q.label}
                  </span>
                );
              })}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number" dataKey="x" domain={[0, 1]}
                tick={{ fontSize: 10 }} label={{ value: '방향성 확신도', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#9ca3af' }}
              />
              <YAxis
                type="number" dataKey="y" domain={[-1, 1]}
                tick={{ fontSize: 10 }} label={{ value: '감성 점수', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#9ca3af' }}
              />
              <ZAxis type="number" range={[50, 50]} />
              <ReferenceLine x={0.5} stroke="#d1d5db" strokeDasharray="4 4" />
              <ReferenceLine y={0}   stroke="#d1d5db" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={chartData} onClick={(d: any) => d.keywords?.[0] && onKeywordClick?.(d.keywords[0])}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={getColor(d.sido)} fillOpacity={0.75} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          우상단 = 강한 상승 / 우하단 = 강한 하락 · 점 클릭 시 키워드 검색
        </p>
      </CardContent>
    </Card>
  );
}
