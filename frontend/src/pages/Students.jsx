// src/pages/Students.jsx — Student roster with search + filter
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { STUDENTS } from '../data/mockData'
import RiskBadge from '../components/RiskBadge'
import { Search, Filter, ChevronRight, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

const RISK_LEVELS = ['all', 'critical', 'high', 'medium', 'low']

function TrendArrow({ trend }) {
  if (trend === 'improving') return <TrendingUp size={13} style={{ color: 'var(--risk-low)' }} />
  if (trend === 'declining') return <TrendingDown size={13} style={{ color: 'var(--risk-critical)' }} />
  return <Minus size={13} style={{ color: 'var(--text-muted)' }} />
}

export default function Students() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('all')
  const [sortBy, setSortBy] = useState('risk')

  const filtered = STUDENTS
    .filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.weakTopics.some(t => t.toLowerCase().includes(q))
      const matchRisk = filterRisk === 'all' || s.riskLevel === filterRisk
      return matchSearch && matchRisk
    })
    .sort((a, b) => {
      if (sortBy === 'risk') return b.riskScore - a.riskScore
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'accuracy') return b.overall_accuracy - a.overall_accuracy
      return 0
    })

  return (
    <div>
      <div className="page-header fade-up">
        <h1>Student Roster</h1>
        <p>Class 9 · {STUDENTS.length} students · AI profiles active</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }} className="fade-up fade-up-1">
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: 1, maxWidth: 340 }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or topic…"
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', flex: 1 }} />
        </div>

        {/* Risk filter pills */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {RISK_LEVELS.map(r => (
            <button key={r} onClick={() => setFilterRisk(r)}
              className={`chip${filterRisk === r ? ' active' : ''}`}
              style={{
                cursor: 'pointer', textTransform: 'capitalize', fontWeight: 600,
                ...(filterRisk === r && r !== 'all' ? {
                  background: r === 'critical' ? 'var(--risk-critical-bg)' :
                              r === 'high'     ? 'var(--risk-high-bg)' :
                              r === 'medium'   ? 'var(--risk-medium-bg)' : 'var(--risk-low-bg)',
                  color: r === 'critical' ? 'var(--risk-critical)' :
                         r === 'high'     ? 'var(--risk-high)' :
                         r === 'medium'   ? 'var(--risk-medium)' : 'var(--risk-low)',
                  borderColor: 'currentColor',
                } : {})
              }}>
              {r}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, fontSize: '0.8rem', minWidth: 130 }}>
          <option value="risk">Sort: Risk Score</option>
          <option value="name">Sort: Name</option>
          <option value="accuracy">Sort: Accuracy</option>
        </select>
      </div>

      {/* Student Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="fade-up fade-up-2">
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 80px 90px 130px 200px 130px 40px',
          padding: '10px 18px', fontSize: '0.78rem', color: 'var(--text-muted)',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          <span>Student</span><span>Grade</span><span>Attend.</span>
          <span>Accuracy</span><span>Top Concern</span><span>Risk</span><span></span>
        </div>

        {filtered.map(student => (
          <div key={student.id}
            onClick={() => navigate(`/students/${student.id}`)}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 80px 90px 130px 200px 130px 40px',
              alignItems: 'center', padding: '18px 18px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, cursor: 'pointer', transition: 'all .2s',
              borderLeft: `3px solid ${
                student.riskLevel === 'critical' ? 'var(--risk-critical)' :
                student.riskLevel === 'high'     ? 'var(--risk-high)' :
                student.riskLevel === 'medium'   ? 'var(--risk-medium)' : 'var(--risk-low)'
              }`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.borderColor = 'var(--border-bright)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            {/* Name + avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${
                  student.riskLevel === 'critical' ? '#f43f5e,#f97316' :
                  student.riskLevel === 'high'     ? '#f97316,#f59e0b' :
                  student.riskLevel === 'medium'   ? '#f59e0b,#3b82f6' : '#10b981,#3b82f6'
                })`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', fontWeight: 700,
                animation: student.riskLevel === 'critical' ? 'pulse-ring 2.5s infinite' : 'none',
              }}>{student.initials}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{student.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <TrendArrow trend={student.trend} /> {student.trend}
                </div>
              </div>
            </div>

            <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {student.grade}{student.section}
            </span>

            <span style={{
              fontWeight: 700, fontSize: '0.875rem',
              color: student.attendance < 75 ? 'var(--risk-critical)' : 'var(--risk-low)'
            }}>{student.attendance}%</span>

            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{student.overall_accuracy.toFixed(1)}%</div>
              <div className="progress-bar" style={{ width: 70, marginTop: 3 }}>
                <div className="progress-fill" style={{
                  width: `${student.overall_accuracy}%`,
                  background: student.overall_accuracy >= 75 ? 'var(--risk-low)' :
                              student.overall_accuracy >= 55 ? 'var(--risk-medium)' : 'var(--risk-critical)'
                }} />
              </div>
            </div>

            <div style={{ fontSize: '0.88rem' }}>
              {student.weakTopics[0] ? (
                <span style={{ color: 'var(--risk-critical)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertTriangle size={11} /> {student.weakTopics[0]}
                </span>
              ) : (
                <span style={{ color: 'var(--risk-low)' }}>No weak topics</span>
              )}
            </div>

            <RiskBadge level={student.riskLevel} score={student.riskScore} />

            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          No students match your filter criteria.
        </div>
      )}
    </div>
  )
}
