# SPEC 05: 인터랙티브 지식그래프

## 개요

131+ 개념 노드와 111+ 관계 엣지를 **Canvas 2D force-directed** 그래프로 시각화.
전문가 강조도, 도메인 색상, 난이도를 시각적으로 표현.

**신규 파일:**
- `components/curriculum/KnowledgeGraph.tsx` (~400줄)
- `components/curriculum/ConceptDetailPanel.tsx` (~200줄)
- `app/curriculum/graph/page.tsx` (~250줄)

---

## 아키텍처

```
graph/page.tsx
├── FilterToolbar (도메인/레벨/강조도/관계 필터)
├── GraphStats (노드수/엣지수/전문가수)
├── KnowledgeGraph (Canvas 2D, 전체 화면)
│   ├── Force Simulation (자체 구현)
│   ├── Canvas Renderer
│   ├── Interaction Handler (hover/click/drag/zoom/pan)
│   └── Tooltip Overlay
└── ConceptDetailPanel (사이드패널, 노드 클릭 시)
```

---

## 컴포넌트 1: `KnowledgeGraph.tsx`

### Props

```typescript
interface KnowledgeGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId?: number | null
  onNodeClick?: (nodeId: number) => void
  onNodeHover?: (nodeId: number | null) => void
  filters: {
    domains: number[]      // 선택된 도메인 ID 목록
    level: string | null   // 선택된 레벨 (null=전체)
    minExpertCount: number  // 최소 전문가 수
    relationTypes: string[] // 표시할 관계 유형
  }
}

interface GraphNode {
  id: number
  label: string
  domain_id: number
  domain_name: string
  domain_color: string
  level: string
  difficulty: number
  importance_score: number  // 0-1
  expert_count: number
  video_count: number
  rank_overall: number | null
}

interface GraphEdge {
  source: number
  target: number
  relation_type: string  // 'prerequisite' | 'relatedTo' | 'partOf' | 'appliedIn' | 'contradicts'
  weight: number
}
```

### 내부 상태

```typescript
// 시뮬레이션 노드 (물리 속성 포함)
interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
  radius: number    // 전문가 강조도 기반 크기
  fixed: boolean    // 드래그 중 고정
}

// Refs
const canvasRef = useRef<HTMLCanvasElement>(null)
const animFrameRef = useRef<number>()
const nodesRef = useRef<SimNode[]>([])
const edgesRef = useRef<GraphEdge[]>([])

// Transform (줌/팬)
const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })

// 인터랙션 상태
const [hoveredNode, setHoveredNode] = useState<number | null>(null)
const [draggingNode, setDraggingNode] = useState<number | null>(null)
const [isPanning, setIsPanning] = useState(false)
const [panStart, setPanStart] = useState({ x: 0, y: 0 })
```

### Force Simulation 알고리즘

```typescript
const SIMULATION_CONFIG = {
  REPULSION: 5000,         // 노드 간 반발력 (쿨롱 상수)
  ATTRACTION: 0.005,       // 엣지 인력 (후크 상수)
  GRAVITY: 0.01,           // 중심 방향 중력
  DAMPING: 0.92,           // 속도 감쇠 (0.92 = 빠른 안정화)
  MIN_DISTANCE: 50,        // 최소 노드 간 거리
  MAX_VELOCITY: 10,        // 최대 속도 제한
  CONVERGENCE_THRESHOLD: 0.1  // 수렴 판정 (총 운동에너지)
}

function initializePositions(nodes: SimNode[], width: number, height: number) {
  // 도메인별로 군집 배치 (원형 배치)
  const domainPositions: Record<number, { cx: number; cy: number }> = {
    1: { cx: width * 0.3, cy: height * 0.3 },   // 내집마련: 좌상
    2: { cx: width * 0.7, cy: height * 0.3 },   // 부동산투자: 우상
    3: { cx: width * 0.2, cy: height * 0.7 },   // 경매: 좌하
    4: { cx: width * 0.8, cy: height * 0.7 },   // 공매: 우하
    5: { cx: width * 0.5, cy: height * 0.5 },   // NPL: 중앙
  }

  nodes.forEach(node => {
    const dp = domainPositions[node.domain_id] || { cx: width/2, cy: height/2 }
    // 도메인 중심 + 랜덤 오프셋 (반경 100px 내)
    node.x = dp.cx + (Math.random() - 0.5) * 200
    node.y = dp.cy + (Math.random() - 0.5) * 200
    node.vx = 0
    node.vy = 0
    node.radius = calculateRadius(node)
    node.fixed = false
  })
}

function calculateRadius(node: SimNode): number {
  // 기본 크기 8px + 전문가 수 × 4px, 최대 28px
  return Math.min(8 + node.expert_count * 4, 28)
}

function simulationStep(nodes: SimNode[], edges: GraphEdge[], width: number, height: number) {
  const { REPULSION, ATTRACTION, GRAVITY, DAMPING, MIN_DISTANCE, MAX_VELOCITY } = SIMULATION_CONFIG

  // 1. 노드 간 반발력 (O(n²) — 131 노드에서는 무시할 수준)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const distSq = dx * dx + dy * dy
      const dist = Math.max(Math.sqrt(distSq), MIN_DISTANCE)
      const force = REPULSION / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      if (!nodes[i].fixed) { nodes[i].vx -= fx; nodes[i].vy -= fy }
      if (!nodes[j].fixed) { nodes[j].vx += fx; nodes[j].vy += fy }
    }
  }

  // 2. 엣지 인력
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  for (const edge of edges) {
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) continue

    const dx = target.x - source.x
    const dy = target.y - source.y
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
    const force = ATTRACTION * dist * edge.weight
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    if (!source.fixed) { source.vx += fx; source.vy += fy }
    if (!target.fixed) { target.vx -= fx; target.vy -= fy }
  }

  // 3. 중심 방향 중력
  const cx = width / 2, cy = height / 2
  for (const node of nodes) {
    if (node.fixed) continue
    node.vx += (cx - node.x) * GRAVITY
    node.vy += (cy - node.y) * GRAVITY
  }

  // 4. 속도 적용 + 감쇠 + 속도 제한
  let totalEnergy = 0
  for (const node of nodes) {
    if (node.fixed) continue
    node.vx *= DAMPING
    node.vy *= DAMPING

    // 속도 제한
    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
    if (speed > MAX_VELOCITY) {
      node.vx = (node.vx / speed) * MAX_VELOCITY
      node.vy = (node.vy / speed) * MAX_VELOCITY
    }

    node.x += node.vx
    node.y += node.vy
    totalEnergy += speed * speed
  }

  return totalEnergy  // 수렴 판정용
}
```

### Canvas 렌더링

```typescript
function render(
  ctx: CanvasRenderingContext2D,
  nodes: SimNode[],
  edges: GraphEdge[],
  transform: { x: number; y: number; scale: number },
  hoveredNodeId: number | null,
  selectedNodeId: number | null
) {
  const { x: tx, y: ty, scale } = transform
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.save()
  ctx.translate(tx, ty)
  ctx.scale(scale, scale)

  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // ── 1. 엣지 그리기 ──
  for (const edge of edges) {
    const s = nodeMap.get(edge.source)
    const t = nodeMap.get(edge.target)
    if (!s || !t) continue

    const isHighlighted = hoveredNodeId === edge.source || hoveredNodeId === edge.target
      || selectedNodeId === edge.source || selectedNodeId === edge.target

    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(t.x, t.y)

    // 관계 유형별 스타일
    switch (edge.relation_type) {
      case 'prerequisite':
        ctx.strokeStyle = isHighlighted ? '#374151' : '#D1D5DB'
        ctx.setLineDash([])
        ctx.lineWidth = isHighlighted ? 2 : 1
        // 화살표 그리기
        drawArrowhead(ctx, s.x, s.y, t.x, t.y, t.radius)
        break
      case 'relatedTo':
        ctx.strokeStyle = isHighlighted ? '#6B7280' : '#E5E7EB'
        ctx.setLineDash([4, 4])
        ctx.lineWidth = isHighlighted ? 1.5 : 0.8
        break
      case 'partOf':
        ctx.strokeStyle = isHighlighted ? '#3B82F6' : '#BFDBFE'
        ctx.setLineDash([2, 4])
        ctx.lineWidth = isHighlighted ? 1.5 : 0.8
        break
      default:
        ctx.strokeStyle = '#E5E7EB'
        ctx.setLineDash([])
        ctx.lineWidth = 0.5
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  // ── 2. 노드 그리기 ──
  for (const node of nodes) {
    const isHovered = hoveredNodeId === node.id
    const isSelected = selectedNodeId === node.id
    const isConnected = hoveredNodeId !== null && edges.some(e =>
      (e.source === hoveredNodeId && e.target === node.id) ||
      (e.target === hoveredNodeId && e.source === node.id)
    )

    const r = node.radius * (isHovered ? 1.3 : 1)
    const alpha = (hoveredNodeId !== null && !isHovered && !isConnected) ? 0.3 : 1.0

    // 원형 노드
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)

    // 채우기 (도메인 색상, 투명도)
    ctx.fillStyle = hexToRgba(node.domain_color, alpha * 0.6)
    ctx.fill()

    // 테두리 (난이도 = 두께)
    ctx.strokeStyle = hexToRgba(node.domain_color, alpha)
    ctx.lineWidth = Math.max(1, node.difficulty * 0.8)
    ctx.stroke()

    // 선택/호버 강조
    if (isSelected) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2)
      ctx.strokeStyle = '#F59E0B'
      ctx.lineWidth = 2
      ctx.stroke()
    } else if (isHovered) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2)
      ctx.strokeStyle = '#8B5CF6'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // 라벨 (줌 레벨에 따라 표시/숨김)
    if (scale > 0.5 || isHovered || isSelected || isConnected) {
      const fontSize = Math.max(9, Math.min(r * 0.7, 14))
      ctx.font = `${fontSize}px "Pretendard", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = hexToRgba('#1F2937', alpha)
      ctx.fillText(truncateLabel(node.label, 8), node.x, node.y + r + 4)
    }

    // 전문가 뱃지 (expert_count > 0)
    if (node.expert_count > 0 && (scale > 0.7 || isHovered)) {
      const badgeR = 8
      ctx.beginPath()
      ctx.arc(node.x + r * 0.7, node.y - r * 0.7, badgeR, 0, Math.PI * 2)
      ctx.fillStyle = '#EF4444'
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(node.expert_count), node.x + r * 0.7, node.y - r * 0.7)
    }
  }

  ctx.restore()
}

// 화살표 헤드 그리기
function drawArrowhead(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, targetRadius: number) {
  const angle = Math.atan2(ty - sy, tx - sx)
  const headLen = 8
  const tipX = tx - Math.cos(angle) * targetRadius
  const tipY = ty - Math.sin(angle) * targetRadius

  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX - headLen * Math.cos(angle - Math.PI/6), tipY - headLen * Math.sin(angle - Math.PI/6))
  ctx.lineTo(tipX - headLen * Math.cos(angle + Math.PI/6), tipY - headLen * Math.sin(angle + Math.PI/6))
  ctx.closePath()
  ctx.fillStyle = ctx.strokeStyle
  ctx.fill()
}

// HEX → RGBA 변환
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function truncateLabel(label: string, maxLen: number): string {
  return label.length > maxLen ? label.slice(0, maxLen) + '...' : label
}
```

### 인터랙션 핸들러

```typescript
// 마우스 좌표 → 월드 좌표 변환
function screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: (screenX - transform.x) / transform.scale,
    y: (screenY - transform.y) / transform.scale
  }
}

// 노드 히트 테스트
function hitTest(worldX: number, worldY: number): SimNode | null {
  // 역순 (위에 그려진 노드 우선)
  for (let i = nodesRef.current.length - 1; i >= 0; i--) {
    const node = nodesRef.current[i]
    const dx = worldX - node.x
    const dy = worldY - node.y
    if (dx * dx + dy * dy <= node.radius * node.radius * 1.5) {
      return node
    }
  }
  return null
}

// 이벤트 핸들러
onMouseMove(e) → {
  const rect = canvas.getBoundingClientRect()
  const { x, y } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)

  if (draggingNode) {
    // 드래그 중: 노드 위치 업데이트
    const node = nodesRef.current.find(n => n.id === draggingNode)
    if (node) { node.x = x; node.y = y }
  } else if (isPanning) {
    // 팬 중: 오프셋 업데이트
    setTransform(t => ({
      ...t,
      x: t.x + (e.clientX - panStart.x),
      y: t.y + (e.clientY - panStart.y)
    }))
    setPanStart({ x: e.clientX, y: e.clientY })
  } else {
    // 호버 감지
    const hit = hitTest(x, y)
    setHoveredNode(hit?.id ?? null)
    canvas.style.cursor = hit ? 'pointer' : 'default'
  }
}

onMouseDown(e) → {
  const { x, y } = screenToWorld(...)
  const hit = hitTest(x, y)
  if (hit) {
    setDraggingNode(hit.id)
    hit.fixed = true
  } else {
    setIsPanning(true)
    setPanStart({ x: e.clientX, y: e.clientY })
  }
}

onMouseUp(e) → {
  if (draggingNode) {
    const node = nodesRef.current.find(n => n.id === draggingNode)
    if (node) node.fixed = false
    setDraggingNode(null)
  }
  setIsPanning(false)
}

onClick(e) → {
  const { x, y } = screenToWorld(...)
  const hit = hitTest(x, y)
  if (hit) onNodeClick?.(hit.id)
}

onWheel(e) → {
  e.preventDefault()
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.2, Math.min(3.0, transform.scale * zoomFactor))
  // 마우스 위치 기준 줌
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  setTransform(t => ({
    x: mx - (mx - t.x) * (newScale / t.scale),
    y: my - (my - t.y) * (newScale / t.scale),
    scale: newScale
  }))
}
```

### useEffect 메인 루프

```typescript
useEffect(() => {
  if (!canvasRef.current) return
  const canvas = canvasRef.current
  const ctx = canvas.getContext('2d')!

  // 필터 적용
  const filteredNodes = nodes.filter(n =>
    filters.domains.includes(n.domain_id) &&
    (!filters.level || n.level === filters.level) &&
    n.expert_count >= filters.minExpertCount
  )
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredEdges = edges.filter(e =>
    filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target) &&
    filters.relationTypes.includes(e.relation_type)
  )

  // SimNode 초기화
  const simNodes: SimNode[] = filteredNodes.map(n => ({
    ...n, x: 0, y: 0, vx: 0, vy: 0,
    radius: calculateRadius(n), fixed: false
  }))
  initializePositions(simNodes, canvas.width, canvas.height)
  nodesRef.current = simNodes
  edgesRef.current = filteredEdges

  // 애니메이션 루프
  let frameCount = 0
  const MAX_FRAMES = 300  // 5초 후 시뮬레이션 정지

  function animate() {
    if (frameCount < MAX_FRAMES) {
      const energy = simulationStep(simNodes, filteredEdges, canvas.width, canvas.height)
      if (energy < SIMULATION_CONFIG.CONVERGENCE_THRESHOLD) {
        frameCount = MAX_FRAMES  // 수렴 시 정지
      }
      frameCount++
    }

    render(ctx, simNodes, filteredEdges, transform, hoveredNode, selectedNodeId)
    animFrameRef.current = requestAnimationFrame(animate)
  }

  animate()

  return () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
  }
}, [nodes, edges, filters, transform, hoveredNode, selectedNodeId])
```

---

## 컴포넌트 2: `ConceptDetailPanel.tsx`

### Props

```typescript
interface ConceptDetailPanelProps {
  conceptId: number | null
  onClose: () => void
}
```

### 구조

```
ConceptDetailPanel (fixed right-0, w-80, h-full, overflow-y-auto)
├── Header (개념명 + 닫기 버튼)
├── Badges (도메인 뱃지 + 레벨 뱃지 + 난이도 별)
├── Description (개념 설명)
├── ImportanceSection
│   ├── expert_count 표시
│   ├── avg_relevance 프로그레스 바
│   └── 전문가별 관련도 바 목록
├── RelationsSection
│   ├── 선수 개념 (→ 클릭 가능 링크)
│   └── 관련 개념 (→ 클릭 가능 링크)
├── YoutubeSection
│   └── 관련 영상 목록 (제목 + 관련도)
├── CapsuleLink
│   └── "강의 캡슐 보기" 버튼 → /curriculum/capsule/[id]
└── Keywords (키워드 태그 목록)
```

### 데이터 로딩

```typescript
// API 호출:
GET /api/ontology/concept/{conceptId}
GET /api/ontology/importance?concept_id={conceptId}
```

---

## 페이지: `app/curriculum/graph/page.tsx`

### 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│ 🕸️ 부동산 투자 지식그래프                                     │
├─────────────────────────────────────────────────────────────┤
│ 도메인: [✅내집마련] [✅투자] [✅경매] [✅공매] [✅NPL]          │
│ 레벨: [전체 ▼]  최소 강조도: [───●───] 0명                    │
│ 관계: [✅선수] [✅관련] [✅구성] [✅응용]                       │
│ 📊 노드: 131개 | 엣지: 111개 | 전문가: 2명                    │
├───────────────────────────────────────────┬─────────────────┤
│                                           │ ConceptDetail   │
│           KnowledgeGraph                  │ Panel           │
│           (Canvas, flex-1)                │ (w-80, 조건부)  │
│                                           │                 │
│           [인터랙티브 그래프]               │ [선택된 노드     │
│                                           │  상세 정보]      │
│                                           │                 │
└───────────────────────────────────────────┴─────────────────┘
│ 범례: ● 내집마련  ● 투자  ● 경매  ● 공매  ● NPL              │
│       크기=전문가수  테두리=난이도  ─→ 선수  ╌╌ 관련  ·· 구성  │
└─────────────────────────────────────────────────────────────┘
```

### State 관리

```typescript
const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
const [filters, setFilters] = useState({
  domains: [1, 2, 3, 4, 5],  // 전체 선택
  level: null as string | null,
  minExpertCount: 0,
  relationTypes: ['prerequisite', 'relatedTo', 'partOf', 'appliedIn']
})
const [loading, setLoading] = useState(true)
```

### 데이터 로딩

```typescript
useEffect(() => {
  fetch('/api/ontology/graph')
    .then(r => r.json())
    .then(data => {
      setGraphData(data)
      setLoading(false)
    })
}, [])
```

### 범례 컴포넌트

```typescript
const DOMAIN_LEGEND = [
  { name: '내집마련', color: '#8B5CF6' },
  { name: '부동산 투자', color: '#3B82F6' },
  { name: '경매', color: '#EF4444' },
  { name: '공매', color: '#10B981' },
  { name: 'NPL', color: '#F59E0B' },
]

const EDGE_LEGEND = [
  { type: '선수 관계', style: '실선 화살표', color: '#374151' },
  { type: '관련 관계', style: '점선', color: '#6B7280' },
  { type: '구성 관계', style: '대시선', color: '#3B82F6' },
]
```

---

## 성능 최적화

| 항목 | 접근 | 근거 |
|------|------|------|
| 렌더링 | Canvas 2D | DOM 노드 131개보다 Canvas가 빠름 |
| 시뮬레이션 | O(n²) 반발력 | n=131에서 131²=17,161 → 60fps 충분 |
| 수렴 | MAX_FRAMES=300 | 5초 후 시뮬레이션 정지, 인터랙션만 유지 |
| 라벨 | 줌 레벨 기반 표시 | scale < 0.5에서 라벨 숨김 |
| 리렌더 | useRef로 노드 관리 | setState 최소화, requestAnimationFrame |

---

## 검증 체크리스트

- [ ] 131개 노드 + 111개 엣지 전체 렌더링 확인
- [ ] 5개 도메인별 색상 정확히 표현
- [ ] 전문가 강조도(expert_count) 기반 노드 크기 차이
- [ ] 호버 시 노드+연결 엣지 하이라이트
- [ ] 클릭 시 사이드패널 열림/닫힘
- [ ] 드래그로 노드 이동
- [ ] 마우스 휠로 줌 인/아웃 (0.2~3.0)
- [ ] 배경 드래그로 팬
- [ ] 도메인 필터 토글 → 해당 노드만 표시
- [ ] 레벨 필터 → 해당 레벨 노드만 표시
- [ ] 관계 유형 토글 → prerequisite/relatedTo/partOf 개별 표시
- [ ] 범례 정확히 표시
- [ ] 시뮬레이션 5초 내 수렴
