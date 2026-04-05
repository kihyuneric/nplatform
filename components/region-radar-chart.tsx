'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { MapPin } from 'lucide-react';

const REGIONS = ['서울', '경기', '인천', '부산', '대구'] as const;
type Region = (typeof REGIONS)[number];

const REGION_COLORS: Record<Region, string> = {
  '서울': '#3b82f6',
  '경기': '#22c55e',
  '인천': '#f59e0b',
  '부산': '#ef4444',
  '대구': '#8b5cf6',
};

const METRICS = ['상승전망', '기사량', '감성지수', '키워드다양성', '변동성'] as const;

type RegionData = { region: Region } & Record<typeof METRICS[number], number>;

const THIS_WEEK: RegionData[] = [
  { region: '서울', 상승전망: 70, 기사량: 85, 감성지수: 65, 키워드다양성: 80, 변동성: 55 },
  { region: '경기', 상승전망: 65, 기사량: 75, 감성지수: 60, 키워드다양성: 70, 변동성: 50 },
  { region: '인천', 상승전망: 55, 기사량: 60, 감성지수: 52, 키워드다양성: 65, 변동성: 48 },
  { region: '부산', 상승전망: 38, 기사량: 55, 감성지수: 40, 키워드다양성: 60, 변동성: 62 },
  { region: '대구', 상승전망: 30, 기사량: 45, 감성지수: 34, 키워드다양성: 50, 변동성: 68 },
];

const LAST_WEEK: RegionData[] = [
  { region: '서울', 상승전망: 60, 기사량: 80, 감성지수: 55, 키워드다양성: 75, 변동성: 60 },
  { region: '경기', 상승전망: 60, 기사량: 70, 감성지수: 55, 키워드다양성: 65, 변동성: 55 },
  { region: '인천', 상승전망: 50, 기사량: 55, 감성지수: 48, 키워드다양성: 60, 변동성: 52 },
  { region: '부산', 상승전망: 42, 기사량: 58, 감성지수: 44, 키워드다양성: 62, 변동성: 58 },
  { region: '대구', 상승전망: 35, 기사량: 48, 감성지수: 38, 키워드다양성: 52, 변동성: 65 },
];

// RadarChart 형식으로 변환: [{metric, 서울, 경기, ...}]
function toRadarData(rows: RegionData[], regions: Region[]) {
  return METRICS.map((metric) => {
    const point: Record<string, string | number> = { metric };
    regions.forEach((r) => {
      const row = rows.find((d) => d.region === r);
      point[r] = row ? row[metric] : 0;
    });
    return point;
  });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold mb-1 text-gray-700">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center justify-between gap-3">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function RegionRadarChart() {
  const [week,    setWeek]    = useState<'this' | 'last'>('this');
  const [visible, setVisible] = useState<Set<Region>>(new Set(['서울', '경기', '인천']));

  const rows   = week === 'this' ? THIS_WEEK : LAST_WEEK;
  const active = REGIONS.filter((r) => visible.has(r));
  const data   = useMemo(() => toRadarData(rows, active), [rows, active]);

  const toggleRegion = (r: Region) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(r) && next.size === 1) return prev; // 최소 1개 유지
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-green-600" />
            지역별 시장 레이더
          </CardTitle>
          {/* 주차 토글 */}
          <div className="flex gap-1">
            {(['this', 'last'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  week === w
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {w === 'this' ? '이번 주' : '지난 주'}
              </button>
            ))}
          </div>
        </div>

        {/* 지역 토글 */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {REGIONS.map((r) => {
            const on = visible.has(r);
            return (
              <button
                key={r}
                onClick={() => toggleRegion(r)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  on ? 'text-white border-transparent' : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
                style={on ? { backgroundColor: REGION_COLORS[r] } : {}}
              >
                {r}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pr-2 pb-4">
        <div role="img" aria-label="지역별 시장 레이더 차트: 상승전망, 기사량, 감성지수, 키워드다양성, 변동성 비교">
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} tickCount={4} />
            <Tooltip content={<CustomTooltip />} />
            {active.map((r) => (
              <Radar
                key={r}
                name={r}
                dataKey={r}
                stroke={REGION_COLORS[r]}
                fill={REGION_COLORS[r]}
                fillOpacity={0.12}
                strokeWidth={2}
                dot={{ r: 3, fill: REGION_COLORS[r] }}
              />
            ))}
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          각 축: 0~100 정규화 점수 · 지역 버튼으로 표시 조절
        </p>
      </CardContent>
    </Card>
  );
}
