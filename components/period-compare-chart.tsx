'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { BarChart2 } from 'lucide-react';

const WEEKLY = [
  { keyword: '아파트', 이번주: 130, 지난주: 112, diff:  18 },
  { keyword: '전세',   이번주:  90, 지난주:  78, diff:  12 },
  { keyword: '매매',   이번주:  82, 지난주:  88, diff:  -6 },
  { keyword: '청약',   이번주:  65, 지난주:  48, diff:  17 },
  { keyword: '재건축', 이번주:  52, 지난주:  45, diff:   7 },
  { keyword: '금리',   이번주:  48, 지난주:  55, diff:  -7 },
  { keyword: '분양',   이번주:  55, 지난주:  42, diff:  13 },
];

const MONTHLY = [
  { keyword: '아파트', 이번달: 520, 지난달: 480, diff:  40 },
  { keyword: '전세',   이번달: 380, 지난달: 420, diff: -40 },
  { keyword: '매매',   이번달: 345, 지난달: 360, diff: -15 },
  { keyword: '청약',   이번달: 280, 지난달: 210, diff:  70 },
  { keyword: '재건축', 이번달: 230, 지난달: 195, diff:  35 },
  { keyword: '금리',   이번달: 210, 지난달: 265, diff: -55 },
  { keyword: '분양',   이번달: 245, 지난달: 180, diff:  65 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const diff = payload[0]?.value - (payload[1]?.value ?? 0);
  return (
    <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold mb-1 text-[var(--color-text-secondary)]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="font-bold">{p.value.toLocaleString()}건</span>
        </p>
      ))}
      <p className={`mt-1 font-semibold ${diff >= 0 ? 'text-stone-900' : 'text-stone-900'}`}>
        변화 {diff >= 0 ? '+' : ''}{diff}건
      </p>
    </div>
  );
}

export function PeriodCompareChart() {
  const [mode, setMode] = useState<'weekly' | 'monthly'>('weekly');

  const data = mode === 'weekly' ? WEEKLY : MONTHLY;
  const keys = mode === 'weekly'
    ? (['이번주', '지난주'] as const)
    : (['이번달', '지난달'] as const);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4 text-stone-900" />
            기간별 키워드 비교
          </CardTitle>
          <div className="flex gap-1">
            {(['weekly', 'monthly'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  mode === m
                    ? 'bg-stone-100 text-white border-stone-300'
                    : 'text-[var(--color-text-secondary)] border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-base)]'
                }`}
              >
                {m === 'weekly' ? '주간' : '월간'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pr-2 pb-4">
        <div role="img" aria-label={`기간별 키워드 비교 막대 차트 (${mode === 'weekly' ? '주간' : '월간'})`}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -18 }}
            barCategoryGap="28%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="keyword" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            <Bar dataKey={keys[0]} fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey={keys[1]} fill="#bfdbfe" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>

        {/* 변화량 미니 표 */}
        <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
          {data.map((d: any) => {
            const diff = d.diff ?? 0;
            return (
              <span
                key={d.keyword}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  diff > 0 ? 'bg-stone-100/10 text-stone-900' :
                  diff < 0 ? 'bg-stone-100/10 text-stone-900' :
                  'bg-slate-500/15 text-[var(--color-text-muted)]'
                }`}
              >
                {d.keyword} {diff > 0 ? '+' : ''}{diff}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
