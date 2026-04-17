'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { getDummyHeatmapData } from '@/lib/dummy-data';

interface HeatCell {
  date: string;
  total: number;
  up: number;
  down: number;
  neutral: number;
}

function getCellColor(cell: HeatCell): string {
  if (cell.total === 0) return '#e2e8f0';
  const intensity = Math.min(cell.total / 15, 1);
  const upRatio   = cell.up   / cell.total;
  const downRatio = cell.down / cell.total;
  if (upRatio >= 0.5) {
    const alpha = 0.25 + intensity * 0.75;
    return `rgba(59,130,246,${alpha.toFixed(2)})`;
  }
  if (downRatio >= 0.38) {
    const alpha = 0.25 + intensity * 0.75;
    return `rgba(239,68,68,${alpha.toFixed(2)})`;
  }
  const alpha = 0.2 + intensity * 0.6;
  return `rgba(139,92,246,${alpha.toFixed(2)})`;
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  onDateClick?: (date: string) => void;
}

export function NewsHeatmap({ onDateClick }: Props) {
  const [tooltip, setTooltip]       = useState<{ cell: HeatCell; x: number; y: number } | null>(null);
  const [selectedDate, setSelected] = useState<string | null>(null);

  const data: HeatCell[] = useMemo(() => getDummyHeatmapData(), []);

  // 첫 날 요일에 맞게 앞을 null로 패딩
  const firstDow = new Date(data[0].date).getDay(); // 0=일
  const padded: (HeatCell | null)[] = [...Array(firstDow).fill(null), ...data];
  while (padded.length % 7 !== 0) padded.push(null);
  const numWeeks = padded.length / 7;

  // 월 레이블 계산
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < numWeeks; col++) {
    const cell = padded[col * 7];
    if (cell) {
      const m = new Date(cell.date).getMonth();
      if (m !== lastMonth) { monthLabels.push({ label: `${m + 1}월`, col }); lastMonth = m; }
    }
  }

  const handleClick = (cell: HeatCell) => {
    if (cell.total === 0) return;
    const next = cell.date === selectedDate ? null : cell.date;
    setSelected(next);
    if (next) onDateClick?.(next);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            뉴스 활동 히트맵 (90일)
          </CardTitle>
          {/* 범례 */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>적음</span>
            {[0.25, 0.45, 0.65, 0.9].map((a) => (
              <span key={a} className="w-3 h-3 rounded-sm inline-block"
                style={{ backgroundColor: `rgba(59,130,246,${a})` }} />
            ))}
            <span>많음</span>
            <span className="mx-1 text-gray-300">|</span>
            <span className="w-3 h-3 rounded-sm inline-block bg-red-400" />
            <span>하락 우세</span>
            <span className="w-3 h-3 rounded-sm inline-block bg-purple-400" />
            <span>중립</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-5 overflow-x-auto">
        <div className="relative min-w-max select-none">
          {/* 월 레이블 */}
          <div className="flex mb-1 ml-7">
            {Array.from({ length: numWeeks }, (_, col) => {
              const ml = monthLabels.find((m) => m.col === col);
              return (
                <div key={col} style={{ width: 13, marginRight: 2 }}
                  className="text-[9px] text-muted-foreground leading-none">
                  {ml ? ml.label : ''}
                </div>
              );
            })}
          </div>

          <div className="flex gap-0.5">
            {/* 요일 레이블 */}
            <div className="flex flex-col gap-0.5 mr-1.5 items-end">
              {DOW_LABELS.map((d, i) => (
                <div key={i} style={{ height: 12 }}
                  className="text-[9px] text-muted-foreground flex items-center">
                  {i % 2 === 1 ? d : ''}
                </div>
              ))}
            </div>

            {/* 셀 그리드: col=주차, row=요일 */}
            {Array.from({ length: numWeeks }, (_, col) => (
              <div key={col} className="flex flex-col gap-0.5">
                {Array.from({ length: 7 }, (_, row) => {
                  const cell = padded[col * 7 + row];
                  if (!cell) return <div key={row} style={{ width: 12, height: 12 }} />;
                  const isSelected = cell.date === selectedDate;
                  return (
                    <div
                      key={row}
                      title={cell.date}
                      style={{
                        width: 12, height: 12,
                        borderRadius: 2,
                        backgroundColor: getCellColor(cell),
                        cursor: cell.total > 0 ? 'pointer' : 'default',
                        outline: isSelected ? '2px solid #1d4ed8' : 'none',
                        outlineOffset: 1,
                        transition: 'transform 0.08s, opacity 0.08s',
                      }}
                      className={cell.total > 0 ? 'hover:opacity-80 hover:scale-110' : ''}
                      onMouseEnter={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setTooltip({ cell, x: r.left + window.scrollX, y: r.top + window.scrollY });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => handleClick(cell)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 선택 날짜 안내 */}
        {selectedDate && (
          <p className="mt-3 text-xs text-blue-600 font-medium">
            📌 {selectedDate} 선택됨 — 검색 필터에 날짜가 적용됩니다
            <button
              className="ml-2 text-muted-foreground hover:text-[var(--color-text-secondary)] underline"
              onClick={() => setSelected(null)}
            >해제</button>
          </p>
        )}
      </CardContent>

      {/* 툴팁: fixed position으로 마우스 근처 렌더 */}
      {tooltip && (
        <div
          className="fixed z-[200] bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none"
          style={{ left: tooltip.x + 16, top: tooltip.y - 68 }}
        >
          <p className="font-semibold mb-1 text-gray-200">{tooltip.cell.date}</p>
          {tooltip.cell.total === 0 ? (
            <p className="text-gray-400">기사 없음</p>
          ) : (
            <>
              <p>총 <span className="font-bold text-white">{tooltip.cell.total}</span>건</p>
              <div className="flex gap-3 mt-1">
                <span className="text-blue-400">↑ 상승 {tooltip.cell.up}</span>
                <span className="text-red-400">↓ 하락 {tooltip.cell.down}</span>
                <span className="text-gray-400">— 중립 {tooltip.cell.neutral}</span>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
