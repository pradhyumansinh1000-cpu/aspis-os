// src/pages/Dashboard.jsx — Main overview dashboard
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CLASS_STATS, STUDENTS, NOTIFICATIONS } from '../data/mockData'
import RiskBadge from '../components/RiskBadge'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler
} from 'chart.js'
import { AlertTriangle, TrendingUp, Users, Brain, Activity, ChevronRight } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const chartData = {
    labels: CLASS_STATS.months,
    datasets: [{
      label: 'Class Average %',
      data: CLASS_STATS.monthly_scores,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      fill: true, tension: 0.4, pointRadius: 4,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#040812',
      pointBorderWidth: 2,
    }]
  }

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
      titleColor: '#f1f5f9', bodyColor: '#94a3b8',
    }},
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569' }, min: 50, max: 100 },
    },
  }

  const highRiskStudents = STUDENTS.filter(s => s.riskLevel === 'critical' || s.riskLevel === 'high')

  return (
    <div>
      {/* Greeting */}
      <div className="page-header fade-up">
        <h1 style={{ fontSize: '2.1rem' }}>Good morning, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Class 9A · 38 students · Last updated 2 hours ago</p>
      </div>

      {/* KPI Stats */}
      <div className="grid-4 fade-up fade-up-1">
        <div className="stat-card" style={{ '--accent-color': 'var(--risk-critical)' }}>
          <div className="stat-icon" style={{ background: 'var(--risk-critical-bg)' }}>
            <AlertTriangle size={16} color="var(--risk-critical)" />
          </div>
          <div className="stat-label">Critical + High Risk</div>
          <div className="stat-value" style={{ color: 'var(--risk-critical)' }}>
            {CLASS_STATS.critical_risk + CLASS_STATS.high_risk}
          </div>
          <div className="stat-sub">Need immediate attention</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--blue)' }}>
          <div className="stat-icon">
            <Users size={16} color="var(--blue)" />
          </div>
          <div className="stat-label">Total Students</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{CLASS_STATS.total_students}</div>
          <div className="stat-sub">{CLASS_STATS.low_risk} low risk, {CLASS_STATS.medium_risk} medium</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': '#f59e0b' }}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <TrendingUp size={16} color="#f59e0b" />
          </div>
          <div className="stat-label">Class Avg Score</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{CLASS_STATS.avg_accuracy}%</div>
          <div className="stat-sub">↑ 4.2% from last month</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--risk-low)' }}>
          <div className="stat-icon" style={{ background: 'var(--risk-low-bg)' }}>
            <Activity size={16} color="var(--risk-low)" />
          </div>
          <div className="stat-label">Avg Attendance</div>
          <div className="stat-value" style={{ color: 'var(--risk-low)' }}>{CLASS_STATS.avg_attendance}%</div>
          <div className="stat-sub">8 students below 75%</div>
        </div>
      </div>

      <div className="grid-2 section-gap fade-up fade-up-2">
        {/* Performance Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">CLASS PERFORMANCE TREND</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--risk-low)', fontWeight: 600 }}>↑ Improving</span>
          </div>
          <div className="card-body">
            <div style={{ height: 200 }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">RISK DISTRIBUTION</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>38 students</span>
          </div>
          <div className="card-body">
            {[
              { level: 'critical', count: CLASS_STATS.critical_risk, color: 'var(--risk-critical)' },
              { level: 'high',     count: CLASS_STATS.high_risk,     color: 'var(--risk-high)' },
              { level: 'medium',   count: CLASS_STATS.medium_risk,   color: 'var(--risk-medium)' },
              { level: 'low',      count: CLASS_STATS.low_risk,      color: 'var(--risk-low)' },
            ].map(({ level, count, color }) => (
              <div key={level} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.8rem', color, textTransform: 'capitalize', fontWeight: 600 }}>{level}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {count} ({(count / CLASS_STATS.total_students * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill"
                    style={{ width: `${count / CLASS_STATS.total_students * 100}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2 section-gap fade-up fade-up-3">
        {/* Students Needing Attention */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">IMMEDIATE ATTENTION NEEDED</span>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => navigate('/action-report')}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '8px 16px 16px' }}>
            {highRiskStudents.map(s => (
              <div key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                  borderBottom: '1px solid var(--border)', transition: 'background .2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: s.riskLevel === 'critical'
                    ? 'linear-gradient(135deg, #f43f5e, #f97316)'
                    : 'linear-gradient(135deg, #f97316, #f59e0b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.78rem', fontWeight: 700,
                  animation: s.riskLevel === 'critical' ? 'pulse-ring 2s infinite' : 'none',
                }}>{s.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Grade {s.grade}{s.section} · {s.weakTopics[0]}
                  </div>
                </div>
                <RiskBadge level={s.riskLevel} score={s.riskScore} />
              </div>
            ))}
          </div>
        </div>

        {/* Class Weak Topics */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">CLASS-WIDE WEAK TOPICS</span>
            <Brain size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="card-body" style={{ padding: '8px 20px 20px' }}>
            {CLASS_STATS.top_weak_topics.map((topic, i) => (
              <div key={topic.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{topic.name}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 10 }}>{topic.subject}</span>
                  </div>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 700,
                    color: topic.pct >= 40 ? 'var(--risk-critical)' : topic.pct >= 25 ? 'var(--risk-medium)' : 'var(--risk-low)'
                  }}>{topic.pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${topic.pct}%`,
                    background: topic.pct >= 40 ? 'linear-gradient(90deg,#f43f5e,#f97316)' : '#f59e0b'
                  }} />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 5 }}>
                  {topic.affected} of 38 students need support
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card section-gap fade-up fade-up-4">
        <div className="card-header">
          <span className="card-title">INTELLIGENCE ALERTS</span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10 }}>
          {NOTIFICATIONS.map(n => (
            <div key={n.id} className={`alert alert-${n.type === 'critical' ? 'critical' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info'}`}>
              <div className="alert-body">
                <div className="alert-title">{n.text}</div>
              </div>
              <span style={{ fontSize: '0.72rem', opacity: 0.6, flexShrink: 0 }}>{n.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
