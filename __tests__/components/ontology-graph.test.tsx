import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OntologyGraph from '@/components/ontology-graph'

describe('OntologyGraph', () => {
  const mockNodes = [
    { id: 1, name: '부동산 기초', level: '왕초보' },
    { id: 2, name: '권리분석', level: '중급', isCurrent: true },
    { id: 3, name: '경매 입찰', level: '고급' },
    { id: 4, name: '등기부 해석', level: '중급' },
  ]

  const mockEdges = [
    { source: 1, target: 2, type: 'prerequisite' as const },
    { source: 2, target: 3, type: 'prerequisite' as const },
    { source: 2, target: 4, type: 'related' as const },
  ]

  it('should render without crashing', () => {
    const { container } = render(
      <OntologyGraph nodes={mockNodes} edges={mockEdges} />
    )
    expect(container).toBeTruthy()
  })

  it('should render with tree layout', () => {
    const { container } = render(
      <OntologyGraph nodes={mockNodes} edges={mockEdges} layout="tree" />
    )
    expect(container).toBeTruthy()
  })

  it('should render with simple layout', () => {
    const { container } = render(
      <OntologyGraph nodes={mockNodes} edges={mockEdges} layout="simple" />
    )
    expect(container).toBeTruthy()
  })

  it('should render empty state gracefully', () => {
    const { container } = render(
      <OntologyGraph nodes={[]} edges={[]} />
    )
    expect(container).toBeTruthy()
  })

  it('should render node names', () => {
    render(<OntologyGraph nodes={mockNodes} edges={mockEdges} />)
    // Check that node names are present in the document
    // SVG + mobile fallback both render names, so use getAllByText
    expect(screen.getAllByText('부동산 기초').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('권리분석').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('경매 입찰').length).toBeGreaterThanOrEqual(1)
  })

  it('should render SVG element', () => {
    const { container } = render(
      <OntologyGraph nodes={mockNodes} edges={mockEdges} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('should render with single node', () => {
    const { container } = render(
      <OntologyGraph
        nodes={[{ id: 1, name: '단독 개념', level: '왕초보' }]}
        edges={[]}
      />
    )
    expect(container).toBeTruthy()
    expect(screen.getAllByText('단독 개념').length).toBeGreaterThanOrEqual(1)
  })

  it('should handle many nodes', () => {
    const manyNodes = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `개념 ${i + 1}`,
      level: '중급',
    }))
    const manyEdges = Array.from({ length: 15 }, (_, i) => ({
      source: i + 1,
      target: i + 2,
      type: 'prerequisite' as const,
    }))

    const { container } = render(
      <OntologyGraph nodes={manyNodes} edges={manyEdges} layout="tree" />
    )
    expect(container).toBeTruthy()
  })
})
