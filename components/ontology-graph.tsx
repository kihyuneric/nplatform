'use client'

import React, { useMemo } from 'react'

// ============================================================
// 온톨로지 구조화 그래프 컴포넌트 (SVG 순수 구현)
// ============================================================

interface GraphNode {
  id: number
  name: string
  level?: string
  isCurrent?: boolean
}

interface GraphEdge {
  source: number
  target: number
  type: 'prerequisite' | 'partOf' | 'related'
}

interface OntologyGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  layout?: 'tree' | 'simple'
  width?: number
  height?: number
  onNodeClick?: (nodeId: number) => void
}

// 레벨별 색상
const LEVEL_COLORS: Record<string, string> = {
  '왕초보': '#22c55e',
  '초보': '#84cc16',
  '중급': '#eab308',
  '고급': '#f97316',
  '전문가': '#ef4444',
}

const NODE_WIDTH = 140
const NODE_HEIGHT = 40
const LAYER_HEIGHT = 100
const NODE_SPACING = 160

// ============================================================
// 레이아웃 알고리즘
// ============================================================

interface LayoutNode extends GraphNode {
  x: number
  y: number
  layer: number
}

/** 계층적 트리 레이아웃 (Sugiyama 간소화) */
function computeTreeLayout(nodes: GraphNode[], edges: GraphEdge[]): LayoutNode[] {
  if (nodes.length === 0) return []

  // prerequisite 관계만 계층 구조에 사용
  const prereqEdges = edges.filter(e => e.type === 'prerequisite')
  const inDegree = new Map<number, number>()
  const children = new Map<number, number[]>()

  for (const n of nodes) {
    inDegree.set(n.id, 0)
    children.set(n.id, [])
  }

  for (const e of prereqEdges) {
    if (inDegree.has(e.target)) {
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
    }
    children.get(e.source)?.push(e.target)
  }

  // 위상 정렬로 레이어 할당
  const layers = new Map<number, number>()
  const queue: number[] = []

  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id)
      layers.set(id, 0)
    }
  }

  let maxLayer = 0
  while (queue.length > 0) {
    const current = queue.shift()!
    const currentLayer = layers.get(current) || 0

    for (const child of (children.get(current) || [])) {
      const newLayer = currentLayer + 1
      const existing = layers.get(child)
      if (existing === undefined || existing < newLayer) {
        layers.set(child, newLayer)
        maxLayer = Math.max(maxLayer, newLayer)
      }
      const newDeg = (inDegree.get(child) || 1) - 1
      inDegree.set(child, newDeg)
      if (newDeg <= 0) queue.push(child)
    }
  }

  // 레이어에 할당되지 않은 노드 → 별도 레이어
  for (const n of nodes) {
    if (!layers.has(n.id)) {
      layers.set(n.id, maxLayer + 1)
    }
  }

  // 레이어별 노드 그룹핑
  const layerGroups = new Map<number, GraphNode[]>()
  for (const n of nodes) {
    const l = layers.get(n.id) || 0
    if (!layerGroups.has(l)) layerGroups.set(l, [])
    layerGroups.get(l)!.push(n)
  }

  // 좌표 계산
  const result: LayoutNode[] = []
  for (const [layerIdx, layerNodes] of layerGroups) {
    const totalWidth = layerNodes.length * NODE_SPACING
    const startX = -totalWidth / 2 + NODE_SPACING / 2

    layerNodes.forEach((n, posIdx) => {
      result.push({
        ...n,
        x: startX + posIdx * NODE_SPACING,
        y: layerIdx * LAYER_HEIGHT,
        layer: layerIdx,
      })
    })
  }

  return result
}

/** 캡슐 상세용 간단 3행 레이아웃 (선수→현재→후속) */
function computeSimpleLayout(nodes: GraphNode[], edges: GraphEdge[]): LayoutNode[] {
  if (nodes.length === 0) return []

  const currentNode = nodes.find(n => n.isCurrent)
  if (!currentNode) {
    return nodes.map((n, i) => ({ ...n, x: i * NODE_SPACING, y: 0, layer: 0 }))
  }

  const prereqIds = new Set(
    edges.filter(e => e.type === 'prerequisite' && e.target === currentNode.id).map(e => e.source)
  )
  const successorIds = new Set(
    edges.filter(e => e.type === 'prerequisite' && e.source === currentNode.id).map(e => e.target)
  )
  const relatedIds = new Set(
    edges.filter(e => e.type === 'related' && (e.source === currentNode.id || e.target === currentNode.id))
      .map(e => e.source === currentNode.id ? e.target : e.source)
  )

  const result: LayoutNode[] = []

  // Row 0: 선수 개념
  const prereqs = nodes.filter(n => prereqIds.has(n.id))
  const prereqStartX = -(prereqs.length * NODE_SPACING) / 2 + NODE_SPACING / 2
  prereqs.forEach((n, i) => {
    result.push({ ...n, x: prereqStartX + i * NODE_SPACING, y: 0, layer: 0 })
  })

  // Row 1: 현재 + 연관
  const relatedNodes = nodes.filter(n => relatedIds.has(n.id))
  const midRow = [currentNode, ...relatedNodes]
  const midStartX = -(midRow.length * NODE_SPACING) / 2 + NODE_SPACING / 2
  midRow.forEach((n, i) => {
    result.push({ ...n, x: midStartX + i * NODE_SPACING, y: LAYER_HEIGHT, layer: 1 })
  })

  // Row 2: 후속 개념
  const succs = nodes.filter(n => successorIds.has(n.id))
  const succStartX = -(succs.length * NODE_SPACING) / 2 + NODE_SPACING / 2
  succs.forEach((n, i) => {
    result.push({ ...n, x: succStartX + i * NODE_SPACING, y: LAYER_HEIGHT * 2, layer: 2 })
  })

  return result
}

// ============================================================
// SVG 렌더링
// ============================================================

function getEdgeStyle(type: string) {
  switch (type) {
    case 'prerequisite':
      return { stroke: '#6b7280', strokeDasharray: 'none', markerEnd: 'url(#arrowhead)' }
    case 'partOf':
      return { stroke: '#3b82f6', strokeDasharray: '4,4', markerEnd: 'url(#arrowhead-blue)' }
    case 'related':
      return { stroke: '#a855f7', strokeDasharray: '6,3', markerEnd: '' }
    default:
      return { stroke: '#d1d5db', strokeDasharray: 'none', markerEnd: '' }
  }
}

export default function OntologyGraph({
  nodes,
  edges,
  layout = 'tree',
  width,
  height,
  onNodeClick,
}: OntologyGraphProps) {
  const layoutNodes = useMemo(() => {
    if (layout === 'simple') return computeSimpleLayout(nodes, edges)
    return computeTreeLayout(nodes, edges)
  }, [nodes, edges, layout])

  const nodeMap = useMemo(() => {
    return new Map(layoutNodes.map(n => [n.id, n]))
  }, [layoutNodes])

  // 자동 크기 계산
  const bounds = useMemo(() => {
    if (layoutNodes.length === 0) return { minX: 0, maxX: 400, minY: 0, maxY: 200 }
    const xs = layoutNodes.map(n => n.x)
    const ys = layoutNodes.map(n => n.y)
    return {
      minX: Math.min(...xs) - NODE_WIDTH,
      maxX: Math.max(...xs) + NODE_WIDTH,
      minY: Math.min(...ys) - NODE_HEIGHT,
      maxY: Math.max(...ys) + NODE_HEIGHT + 20,
    }
  }, [layoutNodes])

  const svgWidth = width || (bounds.maxX - bounds.minX + 40)
  const svgHeight = height || (bounds.maxY - bounds.minY + 40)
  const viewBox = `${bounds.minX - 20} ${bounds.minY - 20} ${svgWidth} ${svgHeight}`

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        그래프 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* 데스크톱/태블릿: SVG 그래프 */}
      <div className="hidden sm:block">
        <svg
          width="100%"
          height={svgHeight}
          viewBox={viewBox}
          className="mx-auto"
          style={{ maxWidth: svgWidth }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#6b7280" />
            </marker>
            <marker
              id="arrowhead-blue"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>

          {/* 엣지 */}
          {edges.map((edge, idx) => {
            const source = nodeMap.get(edge.source)
            const target = nodeMap.get(edge.target)
            if (!source || !target) return null

            const style = getEdgeStyle(edge.type)
            return (
              <line
                key={`edge-${idx}`}
                x1={source.x}
                y1={source.y + NODE_HEIGHT / 2}
                x2={target.x}
                y2={target.y - NODE_HEIGHT / 2}
                stroke={style.stroke}
                strokeWidth={1.5}
                strokeDasharray={style.strokeDasharray === 'none' ? undefined : style.strokeDasharray}
                markerEnd={style.markerEnd}
                opacity={0.6}
              />
            )
          })}

          {/* 노드 */}
          {layoutNodes.map(node => {
            const fillColor = node.isCurrent
              ? '#2563eb'
              : LEVEL_COLORS[node.level || ''] || '#e5e7eb'
            const textColor = node.isCurrent || ['고급', '전문가'].includes(node.level || '')
              ? '#ffffff'
              : '#1f2937'

            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
                onClick={() => onNodeClick?.(node.id)}
                className="cursor-pointer"
              >
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  ry={8}
                  fill={fillColor}
                  stroke={node.isCurrent ? '#1d4ed8' : '#d1d5db'}
                  strokeWidth={node.isCurrent ? 2.5 : 1}
                  opacity={0.9}
                />
                {node.isCurrent && (
                  <text
                    x={NODE_WIDTH / 2}
                    y={-6}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#2563eb"
                    fontWeight="bold"
                  >
                    ★ 현재
                  </text>
                )}
                <text
                  x={NODE_WIDTH / 2}
                  y={NODE_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fill={textColor}
                  fontWeight={node.isCurrent ? 'bold' : 'normal'}
                >
                  {node.name.length > 10 ? node.name.slice(0, 9) + '…' : node.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 모바일: 텍스트 관계도 폴백 */}
      <div className="block sm:hidden space-y-3">
        {layout === 'simple' ? (
          <MobileSimpleView nodes={nodes} edges={edges} />
        ) : (
          <MobileTreeView nodes={nodes} edges={edges} />
        )}
      </div>
    </div>
  )
}

// ============================================================
// 모바일 폴백: 텍스트 관계도
// ============================================================

function MobileSimpleView({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const currentNode = nodes.find(n => n.isCurrent)
  if (!currentNode) return null

  const prereqIds = new Set(
    edges.filter(e => e.type === 'prerequisite' && e.target === currentNode.id).map(e => e.source)
  )
  const successorIds = new Set(
    edges.filter(e => e.type === 'prerequisite' && e.source === currentNode.id).map(e => e.target)
  )
  const relatedIds = new Set(
    edges.filter(e => e.type === 'related' && (e.source === currentNode.id || e.target === currentNode.id))
      .map(e => e.source === currentNode.id ? e.target : e.source)
  )

  const prereqs = nodes.filter(n => prereqIds.has(n.id))
  const succs = nodes.filter(n => successorIds.has(n.id))
  const related = nodes.filter(n => relatedIds.has(n.id))

  return (
    <div className="space-y-2 text-sm">
      {prereqs.length > 0 && (
        <div className="bg-stone-100/10 rounded-lg p-3">
          <div className="text-xs font-medium text-stone-900 mb-1">선수 개념</div>
          <div className="flex flex-wrap gap-1">
            {prereqs.map(n => (
              <span key={n.id} className="bg-stone-100/15 text-stone-900 px-2 py-0.5 rounded text-xs">
                {n.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-gray-400">↓</div>

      <div className="bg-stone-100/10 rounded-lg p-3 border-2 border-stone-300/40">
        <div className="text-xs font-medium text-stone-900 mb-1">★ 현재 학습</div>
        <div className="font-medium text-stone-900">{currentNode.name}</div>
      </div>

      <div className="text-center text-gray-400">↓</div>

      {succs.length > 0 && (
        <div className="bg-stone-100/10 rounded-lg p-3">
          <div className="text-xs font-medium text-stone-900 mb-1">후속 개념</div>
          <div className="flex flex-wrap gap-1">
            {succs.map(n => (
              <span key={n.id} className="bg-stone-100/15 text-stone-900 px-2 py-0.5 rounded text-xs">
                {n.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="bg-stone-100/10 rounded-lg p-3">
          <div className="text-xs font-medium text-stone-900 mb-1">연관 개념</div>
          <div className="flex flex-wrap gap-1">
            {related.map(n => (
              <span key={n.id} className="bg-stone-100/15 text-stone-900 px-2 py-0.5 rounded text-xs">
                {n.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MobileTreeView({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const prereqEdges = edges.filter(e => e.type === 'prerequisite')

  // 연결된 관계 표시
  return (
    <div className="space-y-1 text-sm">
      {nodes.map(node => {
        const targets = prereqEdges
          .filter(e => e.source === node.id)
          .map(e => nodes.find(n => n.id === e.target))
          .filter(Boolean) as GraphNode[]

        const color = LEVEL_COLORS[node.level || ''] || '#e5e7eb'

        return (
          <div key={node.id} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className={`${node.isCurrent ? 'font-bold text-stone-900' : ''}`}>
              {node.name}
            </span>
            {targets.length > 0 && (
              <span className="text-gray-400 text-xs">
                → {targets.map(t => t.name).join(', ')}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// 범례 컴포넌트
// ============================================================

export function OntologyGraphLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)] mt-2">
      <div className="flex items-center gap-1">
        <div className="w-8 h-0.5 bg-gray-500" />
        <span>선수 관계</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-8 h-0.5 border-t-2 border-dashed border-stone-300" />
        <span>포함 관계</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-8 h-0.5 border-t-2 border-dashed border-stone-300" />
        <span>연관 관계</span>
      </div>
      <span className="text-gray-300">|</span>
      {Object.entries(LEVEL_COLORS).map(([level, color]) => (
        <div key={level} className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span>{level}</span>
        </div>
      ))}
    </div>
  )
}
