'use client';

import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network } from 'lucide-react';
import { getDummyKeywordNetwork, type KeywordCategory } from '@/lib/dummy-data';

const CATEGORY_COLORS: Record<KeywordCategory, string> = {
  '거래/시장': '#3b82f6',
  '개발/지역': '#22c55e',
  '정책/규제': '#f59e0b',
  '투자/금융': '#8b5cf6',
};

interface SimNode {
  id: string;
  label: string;
  count: number;
  category: KeywordCategory;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SimEdge {
  source: string;
  target: string;
  weight: number;
}

const W = 600;
const H = 300;
const CX = W / 2;
const CY = H / 2;

// 간단한 force-directed 레이아웃 (정적 계산)
function computeLayout(rawNodes: ReturnType<typeof getDummyKeywordNetwork>['nodes'], edges: SimEdge[]) {
  // 초기 원형 배치
  const nodes: SimNode[] = rawNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / rawNodes.length - Math.PI / 2;
    const r = 100;
    return {
      id: n.id, label: n.id, count: n.count, category: n.category,
      x: CX + r * Math.cos(angle),
      y: CY + r * Math.sin(angle),
      vx: 0, vy: 0,
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const REPULSION = 3500;
  const SPRING_LENGTH = 80;
  const SPRING_K = 0.04;
  const DAMPING = 0.85;
  const CENTER_K = 0.015;

  for (let iter = 0; iter < 150; iter++) {
    // 반발력
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]; const b = nodes[j];
        const dx = b.x - a.x; const dy = b.y - a.y;
        const dist2 = dx * dx + dy * dy;
        const dist = Math.sqrt(dist2) + 0.01;
        const f = REPULSION / dist2;
        const fx = f * dx / dist; const fy = f * dy / dist;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }
    // 인력 (스프링)
    for (const e of edges) {
      const a = nodeMap.get(e.source); const b = nodeMap.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const stretch = dist - SPRING_LENGTH;
      const f = SPRING_K * stretch * (e.weight / 5);
      const fx = f * dx / dist; const fy = f * dy / dist;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }
    // 중심 인력
    for (const n of nodes) {
      n.vx += (CX - n.x) * CENTER_K;
      n.vy += (CY - n.y) * CENTER_K;
    }
    // 위치 업데이트 + 감쇠 + 경계
    for (const n of nodes) {
      n.x = Math.max(32, Math.min(W - 32, n.x + n.vx));
      n.y = Math.max(20, Math.min(H - 20, n.y + n.vy));
      n.vx *= DAMPING;
      n.vy *= DAMPING;
    }
  }
  return nodes;
}

function nodeRadius(count: number, max: number) {
  return 8 + (count / max) * 14;
}

const CATEGORY_LABELS: { category: KeywordCategory; label: string }[] = [
  { category: '거래/시장', label: '거래/시장' },
  { category: '개발/지역', label: '개발/지역' },
  { category: '정책/규제', label: '정책/규제' },
  { category: '투자/금융', label: '투자/금융' },
];

interface Props {
  onKeywordClick?: (keyword: string) => void;
}

export function KeywordNetwork({ onKeywordClick }: Props) {
  const [hovered,  setHovered]  = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const { nodes: rawNodes, edges } = useMemo(() => getDummyKeywordNetwork(), []);
  const nodes = useMemo(() => computeLayout(rawNodes, edges), [rawNodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const maxCount = useMemo(() => Math.max(...nodes.map((n) => n.count)), [nodes]);

  const activeId = hovered ?? selected;

  // 활성 노드와 연결된 엣지/노드 세트
  const connectedSet = useMemo(() => {
    if (!activeId) return null;
    const set = new Set<string>([activeId]);
    edges.forEach((e) => {
      if (e.source === activeId) set.add(e.target);
      if (e.target === activeId) set.add(e.source);
    });
    return set;
  }, [activeId, edges]);

  const handleClick = useCallback(
    (id: string) => {
      setSelected((prev) => (prev === id ? null : id));
      onKeywordClick?.(id);
    },
    [onKeywordClick],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-stone-900" />
            키워드 연관 네트워크
          </CardTitle>
          {/* 범례 */}
          <div className="flex items-center gap-3">
            {CATEGORY_LABELS.map(({ category, label }) => (
              <span key={category} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="overflow-x-auto">
          <svg
            width={W} height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block mx-auto"
            style={{ maxWidth: '100%' }}
          >
            {/* 엣지 */}
            {edges.map((e, i) => {
              const a = nodeMap.get(e.source);
              const b = nodeMap.get(e.target);
              if (!a || !b) return null;
              const isActive = connectedSet
                ? connectedSet.has(e.source) && connectedSet.has(e.target)
                : false;
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isActive ? '#6366f1' : '#e2e8f0'}
                  strokeWidth={isActive ? (e.weight / 4) : (e.weight / 7)}
                  strokeOpacity={isActive ? 0.8 : 0.5}
                  style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
                />
              );
            })}

            {/* 노드 */}
            {nodes.map((n) => {
              const r = nodeRadius(n.count, maxCount);
              const color = CATEGORY_COLORS[n.category];
              const isActive = connectedSet ? connectedSet.has(n.id) : false;
              const isCenter = n.id === activeId;
              const dimmed = connectedSet && !isActive;

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                  opacity={dimmed ? 0.25 : 1}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleClick(n.id)}
                >
                  {/* 선택 링 */}
                  {isCenter && (
                    <circle r={r + 5} fill="none" stroke={color} strokeWidth={2} strokeDasharray="3 2" opacity={0.7} />
                  )}
                  {/* 노드 원 */}
                  <circle
                    r={r}
                    fill={color}
                    fillOpacity={isCenter ? 1 : 0.8}
                    stroke="white"
                    strokeWidth={1.5}
                    style={{ transition: 'r 0.1s' }}
                  />
                  {/* 레이블 */}
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize={r > 16 ? 11 : 9}
                    fontWeight={isCenter ? 700 : 500}
                    fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {n.label}
                  </text>
                  {/* 빈도 뱃지 (hover 시) */}
                  {isCenter && (
                    <text
                      textAnchor="middle"
                      dy={r + 13}
                      fontSize={9}
                      fill={color}
                      fontWeight={600}
                      style={{ pointerEvents: 'none' }}
                    >
                      {n.count}건
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          노드 크기 = 키워드 빈도 · 선 굵기 = 공출현 강도 · 클릭 시 뉴스 검색
        </p>
      </CardContent>
    </Card>
  );
}
