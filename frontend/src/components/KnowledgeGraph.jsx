// src/components/KnowledgeGraph.jsx — D3.js force-directed graph
import { useEffect, useRef } from 'react'

const DOMAIN_COLORS = {
  topic:    '#6366f1',
  behavior: '#8b5cf6',
  sports:   '#10b981',
  health:   '#f43f5e',
  future_risk: '#f59e0b',
}

const MASTERY_COLORS = {
  critical:    '#f43f5e',
  weak:        '#f97316',
  developing:  '#f59e0b',
  strong:      '#10b981',
  future_risk: '#f59e0b',
}

function buildGraphData(student) {
  const nodes = []
  const links = []
  const addedIds = new Set()

  const addNode = (n) => { if (!addedIds.has(n.id)) { nodes.push(n); addedIds.add(n.id) } }

  // Academic topic nodes
  student.weakTopics?.forEach((t, i) => {
    addNode({ id: `topic_weak_${i}`, label: t, type: 'topic', mastery: 'critical', group: 'academic' })
  })
  student.strongTopics?.slice(0, 3).forEach((t, i) => {
    addNode({ id: `topic_strong_${i}`, label: t, type: 'topic', mastery: 'strong', group: 'academic' })
  })

  // Behavioral nodes
  addNode({ id: 'behavior_participation', label: 'Participation', type: 'behavior',
    score: student.behavioral?.participation, group: 'behavioral' })
  addNode({ id: 'behavior_leadership', label: 'Leadership', type: 'behavior',
    score: student.behavioral?.leadership, group: 'behavioral' })
  addNode({ id: 'behavior_assignment', label: 'Assignments', type: 'behavior',
    score: student.behavioral?.assignment, group: 'behavioral' })

  // Sports node
  if (student.sports?.sports?.length > 0) {
    addNode({ id: 'sports', label: student.sports.sports[0], type: 'sports',
      fitness: student.sports.fitness, group: 'sports' })
  }

  // Health node
  if (student.health?.absences > 5 || student.health?.vision_flag) {
    addNode({ id: 'health', label: 'Health Impact', type: 'health',
      absences: student.health.absences, group: 'health' })
  }

  // Future risk nodes + links
  student.futureRisks?.forEach((risk, i) => {
    const targetId = `future_${i}`
    addNode({ id: targetId, label: `${risk.to}\nGrade ${risk.grade}`, type: 'future_risk',
      impact: risk.impact, group: 'future' })

    const srcId = `topic_weak_${student.weakTopics?.indexOf(risk.from) || 0}`
    if (addedIds.has(srcId)) {
      links.push({ source: srcId, target: targetId, strength: risk.impact, type: 'at_risk' })
    }
  })

  // Behavioral links
  if (addedIds.has('behavior_leadership') && addedIds.has('sports')) {
    links.push({ source: 'sports', target: 'behavior_leadership', strength: 0.65, type: 'correlates' })
  }
  if (addedIds.has('health') && student.weakTopics?.[0]) {
    links.push({ source: 'health', target: `topic_weak_0`, strength: 0.55, type: 'correlates' })
  }

  return { nodes, links }
}

export default function KnowledgeGraph({ student, height = 480 }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current || !student) return

    import('d3').then(d3 => {
      const { nodes, links } = buildGraphData(student)
      const svg = d3.select(svgRef.current)
      svg.selectAll('*').remove()

      const W = svgRef.current.clientWidth || 800
      const H = height

      const g = svg.append('g')

      // Zoom
      svg.call(d3.zoom().scaleExtent([0.4, 3]).on('zoom', e => g.attr('transform', e.transform)))

      // Gradient defs
      const defs = svg.append('defs')
      const marker = defs.append('marker')
        .attr('id', 'arrow').attr('viewBox', '0 -5 10 10')
        .attr('refX', 20).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      marker.append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'rgba(255,255,255,0.2)')

      // Simulation
      const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(d => 80 + (1 - d.strength) * 60))
        .force('charge', d3.forceManyBody().strength(-280))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collision', d3.forceCollide(36))

      // Links
      const link = g.append('g').selectAll('line').data(links).enter().append('line')
        .attr('stroke', d => d.type === 'at_risk' ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.15)')
        .attr('stroke-width', d => d.strength * 2 + 0.5)
        .attr('stroke-dasharray', d => d.type === 'at_risk' ? '5,3' : null)
        .attr('marker-end', 'url(#arrow)')

      // Nodes
      const node = g.append('g').selectAll('g').data(nodes).enter().append('g')
        .call(d3.drag().on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }))

      // Node circles
      node.append('circle')
        .attr('r', d => d.type === 'future_risk' ? 16 : d.group === 'academic' ? 22 : 18)
        .attr('fill', d => {
          if (d.type === 'topic') return d.mastery === 'strong' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'
          return `${DOMAIN_COLORS[d.type] || '#3b82f6'}22`
        })
        .attr('stroke', d => {
          if (d.type === 'topic') return d.mastery === 'strong' ? '#10b981' : '#f43f5e'
          return DOMAIN_COLORS[d.type] || '#3b82f6'
        })
        .attr('stroke-width', 2)
        .style('filter', d => `drop-shadow(0 0 6px ${
          d.type === 'topic' && d.mastery !== 'strong' ? '#f43f5e40' : `${DOMAIN_COLORS[d.type] || '#3b82f6'}40`
        })`)

      // Node emoji icon
      node.append('text')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', '13px').text(d => {
          if (d.type === 'topic') return d.mastery === 'strong' ? '✓' : '✗'
          if (d.type === 'behavior') return '👤'
          if (d.type === 'sports') return '🏃'
          if (d.type === 'health') return '❤'
          if (d.type === 'future_risk') return '⚠'
          return '●'
        }).attr('fill', d => {
          if (d.type === 'topic') return d.mastery === 'strong' ? '#10b981' : '#f43f5e'
          return DOMAIN_COLORS[d.type] || '#94a3b8'
        })

      // Labels
      node.append('text')
        .attr('text-anchor', 'middle').attr('y', d => (d.group === 'academic' ? 28 : 24))
        .attr('fill', '#94a3b8').attr('font-size', '9px').attr('font-family', 'Inter')
        .text(d => d.label?.split('\n')[0]?.length > 14 ? d.label.split('\n')[0].slice(0, 14) + '…' : d.label?.split('\n')[0])

      node.append('text')
        .attr('text-anchor', 'middle').attr('y', d => d.group === 'academic' ? 38 : 34)
        .attr('fill', '#475569').attr('font-size', '8px')
        .text(d => d.label?.includes('\n') ? d.label.split('\n')[1] : '')

      sim.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        node.attr('transform', d => `translate(${d.x},${d.y})`)
      })
    })
  }, [student, height])

  return (
    <div className="graph-container" style={{ height }}>
      <svg ref={svgRef} width="100%" height="100%" />
      <div style={{
        position: 'absolute', bottom: 12, left: 16, display: 'flex', gap: 16,
        fontSize: '0.7rem', color: 'var(--text-muted)'
      }}>
        {[
          ['#f43f5e', 'Weak Topic'], ['#10b981', 'Strong Topic'],
          ['#6366f1', 'Behavioral'], ['#f59e0b', 'Future Risk'], ['#10b981', 'Sports'],
        ].map(([color, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
