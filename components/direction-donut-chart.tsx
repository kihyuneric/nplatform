'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PieChart as PieIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const DATA = [
  { name: '상승', value: 10, color: '#3b82f6', bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: TrendingUp   },
  { name: '하락', value:  5, color: '#ef4444', bg: 'bg-red-500/10',    text: 'text-red-400',    icon: TrendingDown },
  { name: '중립', value:  8, color: '#94a3b8', bg: 'bg-slate-500/15', text: 'text-[var(--color-text-secondary)]',  icon: Minus        },
];

const total = DATA.reduce((s, d) => s + d.value, 0);

function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.08) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold" style={{ color: d.color }}>{d.name} 전망</p>
      <p>{d.value}건 ({((d.value / total) * 100).toFixed(1)}%)</p>
    </div>
  );
}

export function DirectionDonutChart() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieIcon className="h-4 w-4 text-indigo-600" />
          전망 방향 분포
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="flex items-center gap-4">
          {/* 도넛 차트 */}
          <div className="flex-shrink-0" role="img" aria-label="전망 방향 분포 도넛 차트: 상승 10건, 하락 5건, 중립 8건">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={DATA}
                  cx="50%" cy="50%"
                  innerRadius={44} outerRadius={76}
                  dataKey="value"
                  labelLine={false}
                  label={renderLabel}
                  startAngle={90} endAngle={-270}
                >
                  {DATA.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 수치 목록 */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {DATA.map(d => {
              const Icon = d.icon;
              const pct  = ((d.value / total) * 100).toFixed(1);
              return (
                <div key={d.name}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${d.bg}`}>
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${d.text}`} />
                  <span className={`text-xs font-medium flex-1 ${d.text}`}>{d.name}</span>
                  <span className={`text-sm font-bold ${d.text}`}>{d.value}</span>
                  <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                </div>
              );
            })}

            {/* 합계 */}
            <div className="flex items-center justify-between px-2.5 pt-1 border-t">
              <span className="text-xs text-muted-foreground">전체</span>
              <span className="text-sm font-bold text-[var(--color-text-secondary)]">{total}건</span>
            </div>

            {/* 상승비율 프로그레스 */}
            <div className="px-0.5">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>상승 우세도</span>
                <span>{((DATA[0].value / total) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--color-border-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(DATA[0].value / total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
