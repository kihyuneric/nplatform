'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { GitBranch, Filter, RotateCcw, Search, Maximize2, Route } from 'lucide-react'
import KnowledgeGraph, { type KnowledgeGraphHandle } from '@/components/curriculum/KnowledgeGraph'
import ConceptDetailPanel from '@/components/curriculum/ConceptDetailPanel'

interface Domain {
  domain_id: number
  name: string
  color: string
}

interface GraphNode {
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
}

interface GraphEdge {
  source: number
  target: number
  relation_type: string
  weight: number
}

const LEVELS = ['전체', '왕초보', '초보', '중급', '고급', '전문가']
const RELATION_TYPES = [
  { key: 'prerequisite', label: '선수', color: '#6B7280' },
  { key: 'relatedTo', label: '관련', color: '#9CA3AF' },
  { key: 'partOf', label: '구성', color: '#3B82F6' },
]

interface LearningPath {
  path_id: number
  name: string
}

export default function GraphPage() {
  const graphRef = useRef<KnowledgeGraphHandle>(null)
  const [domains, setDomains] = useState<Domain[]>([])
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)

  // Learning paths
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [highlightedPath, setHighlightedPath] = useState<number[]>([])
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null)

  // Filters
  const [selectedDomains, setSelectedDomains] = useState<Set<number>>(new Set())
  const [selectedLevel, setSelectedLevel] = useState('전체')
  const [selectedRelations, setSelectedRelations] = useState<Set<string>>(new Set(['prerequisite', 'relatedTo', 'partOf']))
  const [minExpert, setMinExpert] = useState(0)

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null)

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.trim().toLowerCase()
    return nodes.filter(n => n.label.toLowerCase().includes(q)).slice(0, 8)
  }, [searchQuery, nodes])

  useEffect(() => {
    Promise.all([
      fetch('/api/ontology/domains').then(r => r.json()),
      fetch('/api/ontology/graph').then(r => r.json()),
      fetch('/api/ontology/paths').then(r => r.json()),
    ]).then(([domainRes, graphRes, pathRes]) => {
      const doms = domainRes.domains || []
      setDomains(doms)
      setSelectedDomains(new Set(doms.map((d: Domain) => d.domain_id)))
      setNodes(graphRes.nodes || [])
      setEdges(graphRes.edges || [])
      setPaths(pathRes.paths || [])
      setLoading(false)
    })
  }, [])

  const handlePathSelect = async (pathId: number | null) => {
    setSelectedPathId(pathId)
    if (!pathId) {
      setHighlightedPath([])
      return
    }
    try {
      const res = await fetch(`/api/ontology/path/${pathId}`)
      const data = await res.json()
      const steps = data.path?.steps || []
      const conceptIds = steps
        .sort((a: any, b: any) => a.step_order - b.step_order)
        .map((s: any) => s.concept_id)
        .filter(Boolean)
      setHighlightedPath(conceptIds)
    } catch {
      setHighlightedPath([])
    }
  }

  // Filtered data
  const filteredNodes = nodes.filter(n => {
    if (!selectedDomains.has(n.domain_id)) return false
    if (selectedLevel !== '전체' && n.level !== selectedLevel) return false
    if (n.expert_count < minExpert) return false
    return true
  })

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredEdges = edges.filter(e =>
    filteredNodeIds.has(e.source) &&
    filteredNodeIds.has(e.target) &&
    selectedRelations.has(e.relation_type)
  )

  const toggleDomain = (id: number) => {
    setSelectedDomains(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleRelation = (type: string) => {
    setSelectedRelations(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const resetFilters = () => {
    setSelectedDomains(new Set(domains.map(d => d.domain_id)))
    setSelectedLevel('전체')
    setSelectedRelations(new Set(['prerequisite', 'relatedTo', 'partOf']))
    setMinExpert(0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold">인터랙티브 지식그래프</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>노드 {filteredNodes.length}개</span>
            <span>엣지 {filteredEdges.length}개</span>
            <span>전문가 강조 {nodes.filter(n => n.expert_count > 0).length}개 노드</span>
          </div>
        </div>

        {/* Filter toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">도메인:</span>
          </div>
          {domains.map(d => (
            <button
              key={d.domain_id}
              onClick={() => toggleDomain(d.domain_id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedDomains.has(d.domain_id)
                  ? 'border-transparent text-white'
                  : 'border-gray-200 text-gray-400 bg-white'
              }`}
              style={selectedDomains.has(d.domain_id) ? { backgroundColor: d.color } : {}}
            >
              {d.name}
            </button>
          ))}

          <span className="text-gray-300">|</span>

          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
          >
            {LEVELS.map(l => (
              <option key={l} value={l}>{l === '전체' ? '전체 레벨' : l}</option>
            ))}
          </select>

          <span className="text-gray-300">|</span>

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">관계:</span>
            {RELATION_TYPES.map(rt => (
              <button
                key={rt.key}
                onClick={() => toggleRelation(rt.key)}
                className={`px-2 py-0.5 rounded text-xs border transition-all ${
                  selectedRelations.has(rt.key)
                    ? 'border-gray-400 bg-gray-100 text-gray-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                {rt.label}
              </button>
            ))}
          </div>

          <span className="text-gray-300">|</span>

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">최소 전문가:</span>
            <input
              type="range"
              min={0}
              max={5}
              value={minExpert}
              onChange={e => setMinExpert(parseInt(e.target.value))}
              className="w-16 h-1"
            />
            <span className="text-xs text-gray-600">{minExpert}명</span>
          </div>

          <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
            <RotateCcw className="w-3 h-3" />
            초기화
          </button>

          <button
            onClick={() => graphRef.current?.fitToView()}
            className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-0.5 px-2 py-1 border border-gray-200 rounded hover:border-purple-300 transition-colors"
            title="전체 보기"
          >
            <Maximize2 className="w-3 h-3" />
            전체보기
          </button>

          {paths.length > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1">
                <Route className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={selectedPathId ?? ''}
                  onChange={e => handlePathSelect(e.target.value ? Number(e.target.value) : null)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                >
                  <option value="">학습경로 선택</option>
                  {paths.map(p => (
                    <option key={p.path_id} value={p.path_id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <span className="text-gray-300">|</span>

          <div className="relative">
            <div className="flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="개념 검색..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setFocusNodeId(null) }}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white w-32 focus:ring-1 focus:ring-purple-400 outline-none"
              />
            </div>
            {searchResults.length > 0 && searchQuery.trim() && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-56 max-h-48 overflow-y-auto">
                {searchResults.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setFocusNodeId(n.id)
                      setSelectedNodeId(n.id)
                      setSearchQuery('')
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 flex items-center gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: n.domain_color }}
                    />
                    <span className="truncate">{n.label}</span>
                    <span className="text-gray-400 ml-auto flex-shrink-0">{n.level}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Graph + Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-gray-50">
          <KnowledgeGraph
            ref={graphRef}
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedNode={selectedNodeId}
            onNodeClick={(id) => setSelectedNodeId(id)}
            focusNodeId={focusNodeId}
            onFocusComplete={() => setFocusNodeId(null)}
            highlightedPath={highlightedPath.length > 0 ? highlightedPath : undefined}
          />
        </div>

        {selectedNodeId && (
          <ConceptDetailPanel
            conceptId={selectedNodeId}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-2 bg-white border-t flex items-center gap-6 text-xs text-gray-500">
        <span className="font-medium">범례:</span>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-gray-400" />
          <span>선수 관계</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-gray-300 border-dashed border-t" style={{ borderStyle: 'dashed' }} />
          <span>관련 관계</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-blue-300" style={{ borderStyle: 'dotted' }} />
          <span>구성 관계</span>
        </div>
        <span className="text-gray-300">|</span>
        <span>노드 크기 = 전문가 강조도</span>
        <span>테두리 두께 = 난이도</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-red-500 rounded-full text-white text-[8px] leading-3 text-center">N</span>
          = 전문가 수
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-purple-600 rounded-full text-white text-[7px] leading-3 text-center">⚡</span>
          = Atomic 캡슐
        </span>
      </div>
    </div>
  )
}
