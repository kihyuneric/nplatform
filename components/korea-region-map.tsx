'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';

interface RegionDot {
  id: string;
  label: string;
  x: number;
  y: number;
  articles: number;
  up: number;
  down: number;
  neutral: number;
}

// 17개 시도 지리적 중심점 (SVG 320×290 기준)
const REGION_DATA: RegionDot[] = [
  { id:'서울',  label:'서울',  x:148, y:74,  articles:85, up:52, down:18, neutral:15 },
  { id:'인천',  label:'인천',  x:126, y:82,  articles:32, up:18, down:8,  neutral:6  },
  { id:'경기',  label:'경기',  x:162, y:96,  articles:78, up:45, down:20, neutral:13 },
  { id:'강원',  label:'강원',  x:218, y:72,  articles:15, up:7,  down:5,  neutral:3  },
  { id:'충북',  label:'충북',  x:178, y:126, articles:12, up:5,  down:4,  neutral:3  },
  { id:'충남',  label:'충남',  x:128, y:126, articles:18, up:8,  down:6,  neutral:4  },
  { id:'세종',  label:'세종',  x:150, y:132, articles:8,  up:4,  down:2,  neutral:2  },
  { id:'대전',  label:'대전',  x:162, y:142, articles:14, up:6,  down:5,  neutral:3  },
  { id:'전북',  label:'전북',  x:145, y:172, articles:16, up:6,  down:7,  neutral:3  },
  { id:'전남',  label:'전남',  x:138, y:216, articles:14, up:5,  down:6,  neutral:3  },
  { id:'광주',  label:'광주',  x:128, y:196, articles:18, up:7,  down:7,  neutral:4  },
  { id:'경북',  label:'경북',  x:246, y:128, articles:22, up:10, down:8,  neutral:4  },
  { id:'대구',  label:'대구',  x:236, y:152, articles:28, up:10, down:12, neutral:6  },
  { id:'경남',  label:'경남',  x:218, y:188, articles:20, up:8,  down:8,  neutral:4  },
  { id:'울산',  label:'울산',  x:265, y:172, articles:12, up:4,  down:6,  neutral:2  },
  { id:'부산',  label:'부산',  x:256, y:196, articles:35, up:12, down:16, neutral:7  },
  { id:'제주',  label:'제주',  x:148, y:264, articles:10, up:4,  down:3,  neutral:3  },
];

function dotColor(r: RegionDot): string {
  if (r.articles === 0) return '#cbd5e1';
  const up   = r.up   / r.articles;
  const down = r.down / r.articles;
  const a = 0.45 + Math.min(r.articles / 85, 1) * 0.55;
  if (up   >= 0.5) return `rgba(59,130,246,${a.toFixed(2)})`;
  if (down >= 0.5) return `rgba(239,68,68,${a.toFixed(2)})`;
  return `rgba(139,92,246,${(a * 0.8).toFixed(2)})`;
}

function dotRadius(articles: number, max: number): number {
  return 9 + (articles / max) * 16;
}

// Korea 대략 윤곽 (한반도 남한 단순화)
const KOREA_PATH = `
  M 190 14 L 225 18 L 268 42 L 286 68 L 280 88 L 292 110
  L 295 138 L 290 168 L 295 198 L 278 228 L 258 252
  L 238 262 L 210 268 L 185 268 L 162 260 L 140 248
  L 118 228 L 100 204 L 96 178 L 102 152 L 98 128
  L 105 100 L 118 78 L 132 58 L 152 40 L 170 22 Z
`;

interface Props {
  onRegionClick?: (sido: string) => void;
}

export function KoreaRegionMap({ onRegionClick }: Props) {
  const [tooltip,  setTooltip]  = useState<{ r: RegionDot; mx: number; my: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const maxArticles = useMemo(() => Math.max(...REGION_DATA.map(r => r.articles)), []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="h-4 w-4 text-emerald-600" />
            지역별 뉴스 분포
          </CardTitle>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {[['bg-blue-400','상승'],['bg-red-400','하락'],['bg-purple-400','중립']].map(([c,l])=>(
              <span key={l} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${c} inline-block`} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex justify-center">
          <svg
            viewBox="0 0 320 290"
            width="100%"
            style={{ maxWidth: 320, display: 'block' }}
            onMouseMove={e => {
              if (tooltip) {
                const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
                setTooltip(t => t ? { ...t, mx: e.clientX, my: e.clientY } : null);
              }
            }}
          >
            {/* 배경 */}
            <rect x="0" y="0" width="320" height="290" fill="#f1f5f9" rx="10" />

            {/* 한반도 윤곽 (단순화) */}
            <path d={KOREA_PATH} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />

            {/* 지역 버블 */}
            {REGION_DATA.map(r => {
              const radius = dotRadius(r.articles, maxArticles);
              const color  = dotColor(r);
              const isSel  = selected === r.id;
              return (
                <g
                  key={r.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelected(p => p === r.id ? null : r.id);
                    onRegionClick?.(r.id);
                  }}
                  onMouseEnter={e => setTooltip({ r, mx: e.clientX, my: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {isSel && (
                    <circle cx={r.x} cy={r.y} r={radius + 4}
                      fill="none" stroke="#1d4ed8" strokeWidth={2} strokeDasharray="3 2" />
                  )}
                  <circle cx={r.x} cy={r.y} r={radius}
                    fill={color} stroke="white" strokeWidth={1.5}
                    className="transition-opacity hover:opacity-80" />
                  <text x={r.x} y={r.y} textAnchor="middle" dy="0.35em"
                    fontSize={radius > 15 ? 10 : 8} fontWeight={600} fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {r.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          원 크기 = 기사량 · 색상 = 전망 방향 · 클릭 시 지역 필터
        </p>
      </CardContent>

      {/* 툴팁 */}
      {tooltip && (
        <div
          className="fixed z-[200] bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none"
          style={{ left: tooltip.mx + 14, top: tooltip.my - 72 }}
        >
          <p className="font-semibold mb-1">{tooltip.r.label}</p>
          <p>총 <strong>{tooltip.r.articles}</strong>건</p>
          <div className="flex gap-3 mt-1">
            <span className="text-blue-400">↑ {tooltip.r.up}</span>
            <span className="text-red-400">↓ {tooltip.r.down}</span>
            <span className="text-gray-400">— {tooltip.r.neutral}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
