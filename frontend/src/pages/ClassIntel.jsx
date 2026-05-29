// src/pages/ClassIntel.jsx — Class intelligence map
import { useNavigate } from 'react-router-dom'
import { CLASS_STATS, STUDENTS } from '../data/mockData'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip
} from 'chart.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

export default function ClassIntel() {
  const navigate = useNavigate()

  const radarData = {
    labels: ['Math', 'Science', 'English', 'Social Sci', 'Computer'],
    datasets: [
      {
        label: 'Class 9A Avg',
        data: [58, 72, 78, 74, 81],
        backgroundColor: 'rgba(59,130,246,0.15)',
        borderColor: '#3b82f6', borderWidth: 2, pointRadius: 5,
        pointBackgroundColor: '#3b82f6',
      },
      {
        label: 'Top Quartile',
        data: [82, 91, 88, 86, 94],
        backgroundColor: 'rgba(16,185,129,0.08)',
        borderColor: '#10b981', borderWidth: 1.5, borderDash: [5, 3],
        pointRadius: 3, pointBackgroundColor: '#10b981',
      }
    ]
  }

  const radarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } }, tooltip: {
      backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
    }},
    scales: { r: {
      grid: { color: 'rgba(255,255,255,0.06)' },
      pointLabels: { color: '#94a3b8', font: { size: 12 } },
      ticks: { color: '#475569', backdropColor: 'transparent' },
      min: 0, max: 100,
    }},
  }

  return (
    <div>
      <div className="page-header fade-up">
        <h1>Class Intelligence</h1>
        <p>Grade 9 Section A · 38 students · AI-powered class analysis</p>
      </div>

      {/* Stats row */}
      <div className="grid-4 fade-up fade-up-1">
        {[
          { label: 'Class Average', value: `${CLASS_STATS.avg_accuracy}%`, sub: '↑ 4.2% trend', color: '#3b82f6', emoji: '📈' },
          { label: 'Avg Attendance', value: `${CLASS_STATS.avg_attendance}%`, sub: '8 below 75%', color: '#f59e0b', emoji: '📅' },
          { label: 'Topics At Risk', value: CLASS_STATS.top_weak_topics.length, sub: 'Need reteaching', color: '#f43f5e', emoji: '⚠️' },
          { label: 'Class Readiness', value: '64%', sub: 'For next chapter', color: '#10b981', emoji: '✅' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent-color': s.color }}>
            <div className="stat-icon" style={{ background: `${s.color}22`, fontSize: 18 }}>{s.emoji}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 section-gap fade-up fade-up-2">
        {/* Radar chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">SUBJECT PERFORMANCE RADAR</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class avg vs Top 25%</span>
          </div>
          <div className="card-body"><div style={{ height: 300 }}><Radar data={radarData} options={radarOptions} /></div></div>
        </div>

        {/* Concept Readiness */}
        <div className="card">
          <div className="card-header"><span className="card-title">CONCEPT READINESS — NEXT TOPICS</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { topic: 'Quadratic Equations', readiness: 72, status: 'ready' },
              { topic: 'Trigonometry Basics', readiness: 48, status: 'needs_prep' },
              { topic: 'Chemical Equations', readiness: 81, status: 'ready' },
              { topic: 'Coordinate Geometry', readiness: 34, status: 'not_ready' },
              { topic: 'Light & Optics', readiness: 65, status: 'ready' },
            ].map(item => (
              <div key={item.topic}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.topic}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: item.status === 'ready' ? 'var(--risk-low-bg)' :
                                item.status === 'needs_prep' ? 'var(--risk-medium-bg)' : 'var(--risk-critical-bg)',
                    color: item.status === 'ready' ? 'var(--risk-low)' :
                           item.status === 'needs_prep' ? 'var(--risk-medium)' : 'var(--risk-critical)',
                  }}>
                    {item.status === 'ready' ? '✓ Ready' : item.status === 'needs_prep' ? '⚡ Prep needed' : '✗ Not ready'}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${item.readiness}%`,
                    background: item.readiness >= 65 ? 'var(--risk-low)' :
                                item.readiness >= 45 ? 'var(--risk-medium)' : 'var(--risk-critical)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student performance heatmap */}
      <div className="card section-gap fade-up fade-up-3">
        <div className="card-header">
          <span className="card-title">STUDENT × SUBJECT PERFORMANCE MAP</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', gap: 10 }}>
              {[['var(--risk-critical)', 'Critical <40%'], ['var(--risk-medium)', 'Weak 40–60%'], ['var(--risk-low)', 'Good >75%']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: c, borderRadius: 2, display: 'inline-block' }} /> {l}
                </span>
              ))}
            </span>
          </span>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Student</th>
                {['Math', 'Science', 'English', 'Soc Sci', 'Computer'].map(s => (
                  <th key={s} style={{ padding: '6px 12px', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map(student => {
                const scores = [
                  student.overall_accuracy - 10 + Math.random() * 20,
                  student.overall_accuracy + Math.random() * 15,
                  student.overall_accuracy + 5 + Math.random() * 15,
                  student.overall_accuracy + Math.random() * 10,
                  student.overall_accuracy + 8 + Math.random() * 12,
                ].map(s => Math.max(10, Math.min(100, s)))

                return (
                  <tr key={student.id} style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/students/${student.id}`)}>
                    <td style={{ padding: '8px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
                      {student.name}
                    </td>
                    {scores.map((score, i) => (
                      <td key={i} style={{ padding: '6px 12px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 40, height: 28, borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                          background: score < 40 ? 'var(--risk-critical-bg)' :
                                      score < 60 ? 'var(--risk-medium-bg)' :
                                      score < 75 ? 'rgba(245,158,11,0.1)' : 'var(--risk-low-bg)',
                          color: score < 40 ? 'var(--risk-critical)' :
                                 score < 60 ? 'var(--risk-medium)' :
                                 score < 75 ? '#f59e0b' : 'var(--risk-low)',
                        }}>
                          {score.toFixed(0)}
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
