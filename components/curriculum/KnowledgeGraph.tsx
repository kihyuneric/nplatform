'use client'

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'

interface SimNode {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  label: string
  domain_color: string
  domain_name: string
  domain_id?: number
  level: string
  difficulty: number
  importance_score: number
  expert_count: number
  video_count: number
  radius: number
  fixed?: boolean
}

interface SimEdge {
  source: number
  target: number
  relation_type: string
  weight: number
}

interface Props {
  nodes: Array<{
    id: number
    label: string
    domain_id: number
    domain_name: string
    domain_color: string
    level: string
    difficulty: number
    importance_score: number
    expert_count: number
    video_count: number
  }>
  edges: Array<{
    source: number
    target: number
    relation_type: string
    weight: number
  }>
  onNodeClick?: (nodeId: number) => void
  hoveredNode?: number | null
  selectedNode?: number | null
  focusNodeId?: number | null
  onFocusComplete?: () => void
  highlightedPath?: number[]
}

export interface KnowledgeGraphHandle {
  fitToView: () => void
}

const REPULSION = 5000
const ATTRACTION = 0.005
const GLOBAL_GRAVITY = 0.003
const DOMAIN_GRAVITY = 0.005
const DAMPING = 0.92
const MIN_DISTANCE = 60
const MAX_FRAMES = 500
const KE_THRESHOLD = 0.1

const KnowledgeGraph = forwardRef<KnowledgeGraphHandle, Props>(function KnowledgeGraph(
  { nodes: rawNodes, edges: rawEdges, onNodeClick, hoveredNode, selectedNode, focusNodeId, onFocusComplete, highlightedPath },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<SimNode[]>([])
  const edgesRef = useRef<SimEdge[]>([])
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const frameRef = useRef(0)
  const animRef = useRef<number>(0)
  const dragRef = useRef<{ node: SimNode | null; startX: number; startY: number; isPan: boolean }>({
    node: null, startX: 0, startY: 0, isPan: false,
  })
  const [hoverNodeId, setHoverNodeId] = useState<number | null>(null)
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number; node: SimNode } | null>(null)

  // fitToView
  const fitToView = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || nodesRef.current.length === 0) return
    const nodes = nodesRef.current
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.radius)
      maxX = Math.max(maxX, n.x + n.radius)
      minY = Math.min(minY, n.y - n.radius)
      maxY = Math.max(maxY, n.y + n.radius)
    }
    const pad = 60
    const w = canvas.width
    const h = canvas.height
    const graphW = maxX - minX + pad * 2
    const graphH = maxY - minY + pad * 2
    const scale = Math.min(w / graphW, h / graphH, 2)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    transformRef.current = {
      scale,
      x: w / 2 - cx * scale,
      y: h / 2 - cy * scale,
    }
  }, [])

  useImperativeHandle(ref, () => ({ fitToView }), [fitToView])

  // Initialize simulation nodes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const w = canvas.parentElement?.clientWidth || 800
    const h = canvas.parentElement?.clientHeight || 600
    canvas.width = w
    canvas.height = h

    // Setup minimap
    const minimap = minimapRef.current
    if (minimap) {
      minimap.width = 150
      minimap.height = 100
    }

    const cx = w / 2
    const cy = h / 2

    nodesRef.current = rawNodes.map((n) => ({
      id: n.id,
      x: cx + (Math.random() - 0.5) * w * 0.6,
      y: cy + (Math.random() - 0.5) * h * 0.6,
      vx: 0,
      vy: 0,
      label: n.label,
      domain_color: n.domain_color,
      domain_name: n.domain_name,
      domain_id: n.domain_id,
      level: n.level,
      difficulty: n.difficulty,
      importance_score: n.importance_score,
      expert_count: n.expert_count,
      video_count: n.video_count,
      radius: Math.min(8 + (n.expert_count || 0) * 4, 32),
      fixed: false,
    }))

    edgesRef.current = rawEdges.map(e => ({ ...e }))
    transformRef.current = { x: 0, y: 0, scale: 1 }
    frameRef.current = 0

    // Compute domain cluster centers (arranged in a circle)
    const uniqueDomains = [...new Set(nodesRef.current.map(n => n.domain_id))]
    const domainCenters = new Map<number, { cx: number; cy: number }>()
    uniqueDomains.forEach((domId, i) => {
      if (domId === undefined) return
      const angle = (2 * Math.PI * i) / uniqueDomains.length
      const radius = Math.min(w, h) * 0.25
      domainCenters.set(domId, {
        cx: cx + Math.cos(angle) * radius,
        cy: cy + Math.sin(angle) * radius,
      })
    })

    const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]))
    let converged = false

    function simulate() {
      const nodes = nodesRef.current
      if (frameRef.current >= MAX_FRAMES || converged) return

      // 1. Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DISTANCE)
          const force = REPULSION / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          if (!nodes[i].fixed) { nodes[i].vx -= fx; nodes[i].vy -= fy }
          if (!nodes[j].fixed) { nodes[j].vx += fx; nodes[j].vy += fy }
        }
      }

      // 2. Attraction
      for (const edge of edgesRef.current) {
        const s = nodeMap.get(edge.source)
        const t = nodeMap.get(edge.target)
        if (!s || !t) continue
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const force = ATTRACTION * dist
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        if (!s.fixed) { s.vx += fx; s.vy += fy }
        if (!t.fixed) { t.vx -= fx; t.vy -= fy }
      }

      // 3. Global gravity (weak) + domain clustering gravity
      for (const node of nodes) {
        if (node.fixed) continue
        // Global center pull
        node.vx += (cx - node.x) * GLOBAL_GRAVITY
        node.vy += (cy - node.y) * GLOBAL_GRAVITY
        // Domain cluster pull
        if (node.domain_id !== undefined) {
          const center = domainCenters.get(node.domain_id)
          if (center) {
            node.vx += (center.cx - node.x) * DOMAIN_GRAVITY
            node.vy += (center.cy - node.y) * DOMAIN_GRAVITY
          }
        }
      }

      // 4. Apply velocity + damping
      let kineticEnergy = 0
      for (const node of nodes) {
        if (node.fixed) continue
        node.vx *= DAMPING
        node.vy *= DAMPING
        node.x += node.vx
        node.y += node.vy
        kineticEnergy += node.vx * node.vx + node.vy * node.vy
      }

      // 5. Convergence detection
      if (kineticEnergy < KE_THRESHOLD && frameRef.current > 50) {
        converged = true
      }

      frameRef.current++
    }

    function renderMinimap() {
      const minimap = minimapRef.current
      if (!minimap || nodesRef.current.length === 0) return
      const mctx = minimap.getContext('2d')
      if (!mctx) return
      const mw = minimap.width
      const mh = minimap.height

      // Compute bounds
      const nodes = nodesRef.current
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const n of nodes) {
        minX = Math.min(minX, n.x)
        maxX = Math.max(maxX, n.x)
        minY = Math.min(minY, n.y)
        maxY = Math.max(maxY, n.y)
      }
      const pad = 20
      const graphW = maxX - minX + pad * 2
      const graphH = maxY - minY + pad * 2
      const scaleM = Math.min(mw / graphW, mh / graphH)

      mctx.clearRect(0, 0, mw, mh)
      mctx.fillStyle = 'rgba(255,255,255,0.85)'
      mctx.fillRect(0, 0, mw, mh)
      mctx.strokeStyle = '#E5E7EB'
      mctx.lineWidth = 1
      mctx.strokeRect(0, 0, mw, mh)

      const offX = (mw - graphW * scaleM) / 2 - (minX - pad) * scaleM
      const offY = (mh - graphH * scaleM) / 2 - (minY - pad) * scaleM

      // Draw nodes as dots
      for (const n of nodes) {
        const mx = n.x * scaleM + offX
        const my = n.y * scaleM + offY
        mctx.beginPath()
        mctx.arc(mx, my, Math.max(1.5, n.radius * scaleM * 0.3), 0, Math.PI * 2)
        mctx.fillStyle = n.domain_color
        mctx.fill()
      }

      // Draw viewport rectangle
      const mainCanvas = canvasRef.current
      if (mainCanvas) {
        const t = transformRef.current
        // Visible area in world coords
        const vLeft = -t.x / t.scale
        const vTop = -t.y / t.scale
        const vW = mainCanvas.width / t.scale
        const vH = mainCanvas.height / t.scale

        const rx = vLeft * scaleM + offX
        const ry = vTop * scaleM + offY
        const rw = vW * scaleM
        const rh = vH * scaleM

        mctx.strokeStyle = '#7C3AED'
        mctx.lineWidth = 1.5
        mctx.strokeRect(rx, ry, rw, rh)
      }
    }

    function render() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { x: tx, y: ty, scale } = transformRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(tx, ty)
      ctx.scale(scale, scale)

      const nodes = nodesRef.current
      const activeHover = hoveredNode ?? hoverNodeId

      // Highlighted path set
      const pathSet = highlightedPath ? new Set(highlightedPath) : null
      const pathEdgeSet = new Set<string>()
      if (highlightedPath && highlightedPath.length > 1) {
        for (let i = 0; i < highlightedPath.length - 1; i++) {
          pathEdgeSet.add(`${highlightedPath[i]}-${highlightedPath[i + 1]}`)
          pathEdgeSet.add(`${highlightedPath[i + 1]}-${highlightedPath[i]}`)
        }
      }

      // Draw edges
      for (const edge of edgesRef.current) {
        const s = nodeMap.get(edge.source)
        const t = nodeMap.get(edge.target)
        if (!s || !t) continue

        const isPathEdge = pathEdgeSet.has(`${edge.source}-${edge.target}`)
        const dimmed = pathSet && !isPathEdge

        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(t.x, t.y)

        const isHighlighted = activeHover && (edge.source === activeHover || edge.target === activeHover)

        if (isPathEdge) {
          ctx.strokeStyle = '#7C3AED'
          ctx.lineWidth = 3
          ctx.setLineDash([])
          ctx.stroke()
          // Arrow for path edges
          const angle = Math.atan2(t.y - s.y, t.x - s.x)
          const arrowSize = 10
          const endX = t.x - Math.cos(angle) * t.radius
          const endY = t.y - Math.sin(angle) * t.radius
          ctx.beginPath()
          ctx.moveTo(endX, endY)
          ctx.lineTo(endX - arrowSize * Math.cos(angle - 0.3), endY - arrowSize * Math.sin(angle - 0.3))
          ctx.lineTo(endX - arrowSize * Math.cos(angle + 0.3), endY - arrowSize * Math.sin(angle + 0.3))
          ctx.closePath()
          ctx.fillStyle = '#7C3AED'
          ctx.fill()
        } else if (edge.relation_type === 'prerequisite') {
          ctx.strokeStyle = dimmed ? 'rgba(209,213,219,0.3)' : (isHighlighted ? '#4B5563' : '#D1D5DB')
          ctx.setLineDash([])
          ctx.lineWidth = isHighlighted ? 2 : 1
          const angle = Math.atan2(t.y - s.y, t.x - s.x)
          const arrowSize = 8
          const endX = t.x - Math.cos(angle) * t.radius
          const endY = t.y - Math.sin(angle) * t.radius
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(endX, endY)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(endX, endY)
          ctx.lineTo(endX - arrowSize * Math.cos(angle - 0.3), endY - arrowSize * Math.sin(angle - 0.3))
          ctx.lineTo(endX - arrowSize * Math.cos(angle + 0.3), endY - arrowSize * Math.sin(angle + 0.3))
          ctx.closePath()
          ctx.fillStyle = dimmed ? 'rgba(209,213,219,0.3)' : (isHighlighted ? '#4B5563' : '#D1D5DB')
          ctx.fill()
        } else if (edge.relation_type === 'relatedTo') {
          ctx.strokeStyle = dimmed ? 'rgba(229,231,235,0.3)' : (isHighlighted ? '#9CA3AF' : '#E5E7EB')
          ctx.setLineDash([5, 5])
          ctx.lineWidth = isHighlighted ? 2 : 1
          ctx.stroke()
        } else {
          ctx.strokeStyle = dimmed ? 'rgba(219,234,254,0.3)' : (isHighlighted ? '#3B82F6' : '#DBEAFE')
          ctx.setLineDash([2, 4])
          ctx.lineWidth = isHighlighted ? 2 : 1
          ctx.stroke()
        }
        ctx.setLineDash([])
      }

      // Draw nodes
      for (const node of nodes) {
        const isHovered = activeHover === node.id
        const isSelected = selectedNode === node.id
        const isPathNode = pathSet?.has(node.id) ?? false
        const dimmed = pathSet && !isPathNode
        const r = isHovered ? node.radius * 1.3 : node.radius

        // Path glow
        if (isPathNode) {
          ctx.shadowColor = '#7C3AED'
          ctx.shadowBlur = 12
        } else if (isSelected) {
          ctx.shadowColor = node.domain_color
          ctx.shadowBlur = 15
        }

        // Circle
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        const alpha = dimmed ? '30' : (isHovered ? 'CC' : '80')
        ctx.fillStyle = node.domain_color + alpha
        ctx.fill()
        ctx.strokeStyle = isSelected ? '#1F2937' : isPathNode ? '#7C3AED' : (dimmed ? node.domain_color + '40' : node.domain_color)
        ctx.lineWidth = isSelected ? 3 : isPathNode ? 2.5 : Math.max(1, node.difficulty)
        ctx.stroke()

        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0

        // Label
        const showLabel = !dimmed && (isHovered || isSelected || isPathNode || scale >= 0.8 || node.importance_score >= 50 || node.expert_count > 0)
        if (showLabel) {
          const fontSize = Math.max(9, Math.min(r * 0.7, 14))
          ctx.fillStyle = dimmed ? '#9CA3AF' : (isHovered || isSelected ? '#111827' : '#374151')
          ctx.font = `${isHovered || isPathNode ? 'bold ' : ''}${fontSize}px "Pretendard", sans-serif`
          ctx.textAlign = 'center'
          let label = node.label
          if (!isHovered && !isSelected && !isPathNode && scale < 1.5 && label.length > 8) {
            label = label.slice(0, 8) + '...'
          }
          ctx.fillText(label, node.x, node.y + r + fontSize + 2)
        }

        // Expert badge
        if (node.expert_count > 0 && !dimmed) {
          const bx = node.x + r * 0.7
          const by = node.y - r * 0.7
          ctx.beginPath()
          ctx.arc(bx, by, 8, 0, Math.PI * 2)
          ctx.fillStyle = '#EF4444'
          ctx.fill()
          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold 9px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(node.expert_count), bx, by)
          ctx.textBaseline = 'alphabetic'
        }

        // Atomic capsule badge (purple, bottom-right)
        const atomicCount = (node as any).atomic_count || 0
        if (atomicCount > 0 && !dimmed) {
          const ax = node.x + r * 0.6
          const ay = node.y + r * 0.3
          ctx.beginPath()
          ctx.arc(ax, ay, 7, 0, Math.PI * 2)
          ctx.fillStyle = '#7C3AED'
          ctx.fill()
          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold 8px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('⚡', ax, ay)
          ctx.textBaseline = 'alphabetic'
        }
      }

      ctx.restore()

      // Draw minimap
      renderMinimap()
    }

    function loop() {
      simulate()
      render()
      animRef.current = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      cancelAnimationFrame(animRef.current)
    }
  }, [rawNodes, rawEdges, hoveredNode, selectedNode, hoverNodeId, highlightedPath])

  // Focus on a specific node
  useEffect(() => {
    if (!focusNodeId) return
    const canvas = canvasRef.current
    if (!canvas) return
    const node = nodesRef.current.find(n => n.id === focusNodeId)
    if (!node) return

    const w = canvas.width
    const h = canvas.height
    const targetScale = 1.5
    transformRef.current = {
      scale: targetScale,
      x: w / 2 - node.x * targetScale,
      y: h / 2 - node.y * targetScale,
    }
    onFocusComplete?.()
  }, [focusNodeId, onFocusComplete])

  // Mouse -> world coordinates
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { x, y, scale } = transformRef.current
    return { wx: (sx - x) / scale, wy: (sy - y) / scale }
  }, [])

  const hitTest = useCallback((wx: number, wy: number): SimNode | null => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i]
      const dx = wx - n.x
      const dy = wy - n.y
      if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n
    }
    return null
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { wx, wy } = screenToWorld(sx, sy)
    const hit = hitTest(wx, wy)

    if (hit) {
      hit.fixed = true
      dragRef.current = { node: hit, startX: sx, startY: sy, isPan: false }
    } else {
      dragRef.current = { node: null, startX: sx, startY: sy, isPan: true }
    }
  }, [screenToWorld, hitTest])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { wx, wy } = screenToWorld(sx, sy)

    if (dragRef.current.node) {
      dragRef.current.node.x = wx
      dragRef.current.node.y = wy
      frameRef.current = Math.min(frameRef.current, MAX_FRAMES - 100)
    } else if (dragRef.current.isPan) {
      const dx = sx - dragRef.current.startX
      const dy = sy - dragRef.current.startY
      transformRef.current.x += dx
      transformRef.current.y += dy
      dragRef.current.startX = sx
      dragRef.current.startY = sy
    } else {
      const hit = hitTest(wx, wy)
      setHoverNodeId(hit?.id ?? null)
      if (hit) {
        setTooltipInfo({ x: sx, y: sy, node: hit })
      } else {
        setTooltipInfo(null)
      }
    }
  }, [screenToWorld, hitTest])

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.node) {
      dragRef.current.node.fixed = false
    }
    dragRef.current = { node: null, startX: 0, startY: 0, isPan: false }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { wx, wy } = screenToWorld(sx, sy)
    const hit = hitTest(wx, wy)
    if (hit && onNodeClick) {
      onNodeClick(hit.id)
    }
  }, [screenToWorld, hitTest, onNodeClick])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.3, Math.min(3, transformRef.current.scale * delta))

    transformRef.current.x = sx - (sx - transformRef.current.x) * (newScale / transformRef.current.scale)
    transformRef.current.y = sy - (sy - transformRef.current.y) * (newScale / transformRef.current.scale)
    transformRef.current.scale = newScale
  }, [])

  // Minimap click to navigate
  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const minimap = minimapRef.current
    const canvas = canvasRef.current
    if (!minimap || !canvas || nodesRef.current.length === 0) return

    const rect = minimap.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const mw = minimap.width
    const mh = minimap.height

    const nodes = nodesRef.current
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x)
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y)
    }
    const pad = 20
    const graphW = maxX - minX + pad * 2
    const graphH = maxY - minY + pad * 2
    const scaleM = Math.min(mw / graphW, mh / graphH)
    const offX = (mw - graphW * scaleM) / 2 - (minX - pad) * scaleM
    const offY = (mh - graphH * scaleM) / 2 - (minY - pad) * scaleM

    const worldX = (mx - offX) / scaleM
    const worldY = (my - offY) / scaleM

    const t = transformRef.current
    transformRef.current = {
      ...t,
      x: canvas.width / 2 - worldX * t.scale,
      y: canvas.height / 2 - worldY * t.scale,
    }
  }, [])

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />
      {/* Minimap */}
      <canvas
        ref={minimapRef}
        width={150}
        height={100}
        onClick={handleMinimapClick}
        className="absolute bottom-3 right-3 rounded-lg shadow-md cursor-crosshair border border-gray-200"
      />
      {/* Tooltip */}
      {tooltipInfo && (
        <div
          className="absolute pointer-events-none bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs z-10"
          style={{ left: tooltipInfo.x + 12, top: tooltipInfo.y - 8 }}
        >
          <div className="font-bold text-sm">{tooltipInfo.node.label}</div>
          <div className="text-gray-500 mt-1">
            {tooltipInfo.node.domain_name} | {tooltipInfo.node.level}
          </div>
          {tooltipInfo.node.expert_count > 0 && (
            <div className="text-red-600 mt-0.5">
              전문가 {tooltipInfo.node.expert_count}명 강조
            </div>
          )}
          {(tooltipInfo.node as any).atomic_count > 0 && (
            <div className="text-purple-600 mt-0.5">
              ⚡ Atomic 캡슐 {(tooltipInfo.node as any).atomic_count}개
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default KnowledgeGraph
