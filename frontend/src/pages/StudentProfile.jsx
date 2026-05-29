// src/pages/StudentProfile.jsx — The flagship page
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { STUDENTS } from '../data/mockData'
import RiskBadge, { ScoreGauge, MiniBar } from '../components/RiskBadge'
import KnowledgeGraph from '../components/KnowledgeGraph'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip
} from 'chart.js'
import {
  ArrowLeft, Brain, Activity, Heart, Trophy, AlertTriangle,
  TrendingUp, TrendingDown, Minus, ChevronRight, BookOpen, RefreshCw
} from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const TABS = ['Overview', 'Academic', 'Knowledge Graph', 'Future Risks', 'AI Report']

function TrendIcon({ trend }) {
  if (trend === 'improving') return <TrendingUp size={14} style={{ color: 'var(--risk-low)' }} />
  if (trend === 'declining') return <TrendingDown size={14} style={{ color: 'var(--risk-critical)' }} />
  return <Minus size={14} style={{ color: 'var(--text-muted)' }} />
}

function FutureRiskChain({ risks }) {
  if (!risks?.length) return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      ✅ No significant future risks detected based on current performance.
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {risks.map((risk, i) => (
        <div key={i} style={{
          background: 'var(--bg-glass)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px',
          borderLeft: `3px solid ${risk.impact >= 0.75 ? 'var(--risk-critical)' : 'var(--risk-medium)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className="impact-chain">
              <span className="impact-node weak">{risk.from}</span>
              <span className="impact-arrow">→</span>
              <span className="impact-node risk">
                {risk.to}
                <span className="impact-grade">Grade {risk.grade}</span>
              </span>
            </div>
            {risk.cross && (
              <span className="chip" style={{ fontSize: '0.65rem' }}>Cross-Subject</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span>Impact: <strong style={{ color: risk.impact >= 0.75 ? 'var(--risk-critical)' : 'var(--risk-medium)' }}>{(risk.impact * 100).toFixed(0)}%</strong></span>
            <span>Grade gap: <strong>{risk.gap === 0 ? 'This year' : `${risk.gap} year(s) later`}</strong></span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function StudentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Overview')
  const student = STUDENTS.find(s => s.id === id) || STUDENTS[0]

  const RISK_COLORS = {
    low: 'var(--risk-low)', medium: 'var(--risk-medium)',
    high: 'var(--risk-high)', critical: 'var(--risk-critical)'
  }
  const riskColor = RISK_COLORS[student.riskLevel]

  const barData = {
    labels: ['Academics', 'Behavioral', 'Sports', 'Health'],
    datasets: [{
      data: [
        student.overall_accuracy,
        student.behavioral.composite * 10,
        student.sports.fitness,
        100 - (student.health.absences * 3),
      ],
      backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(139,92,246,0.7)', 'rgba(16,185,129,0.7)', 'rgba(244,63,94,0.7)'],
      borderColor: ['#6366f1', '#8b5cf6', '#10b981', '#f43f5e'],
      borderWidth: 1, borderRadius: 6,
    }]
  }

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
      titleColor: '#f1f5f9', bodyColor: '#94a3b8',
    }},
    scales: {
      x: { grid: { display: false }, ticks: { color: '#475569' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569' }, min: 0, max: 100 },
    },
  }

  return (
    <div>
      {/* Back button */}
      <button className="btn btn-ghost" style={{ marginBottom: 20 }} onClick={() => navigate('/students')}>
        <ArrowLeft size={15} /> Back to Students
      </button>

      {/* ── Hero Banner ───────────────────────────────────────── */}
      <div className="profile-hero fade-up">
        <div className="profile-avatar">{student.initials}</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div className="profile-name">{student.name}</div>
            <RiskBadge level={student.riskLevel} size="lg" />
          </div>
          <div className="profile-meta">
            <span>📚 Grade {student.grade}{student.section}</span>
            <span>🪪 Roll #{student.roll}</span>
            <span>📅 Attendance: <strong style={{ color: student.attendance < 75 ? 'var(--risk-critical)' : 'var(--risk-low)' }}>{student.attendance}%</strong></span>
            <span><TrendIcon trend={student.trend} style={{ marginRight: 4 }} /> {student.trend}</span>
          </div>

          {/* Top concerns chips */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {student.weakTopics.map(t => (
              <span key={t} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)',
                border: '1px solid rgba(244,63,94,0.25)'
              }}>⚠ {t}</span>
            ))}
            {student.strongTopics.slice(0, 2).map(t => (
              <span key={t} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                background: 'var(--risk-low-bg)', color: 'var(--risk-low)',
                border: '1px solid rgba(16,185,129,0.25)'
              }}>✓ {t}</span>
            ))}
          </div>
        </div>

        {/* Risk gauge */}
        <div className="profile-risk-panel">
          <ScoreGauge score={student.riskScore} riskLevel={student.riskLevel} size={110} />
          <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 12px' }}>
            <RefreshCw size={12} /> Rebuild
          </button>
        </div>
      </div>

      {/* ── 4 Domain Cards ──────────────────────────────────────── */}
      <div className="grid-4 fade-up fade-up-1">
        <div className="domain-card" style={{ '--domain-color': '#6366f1' }}>
          <div className="domain-icon">📚</div>
          <div className="domain-label">Academic</div>
          <div className="domain-score">{student.overall_accuracy.toFixed(1)}%</div>
          <div className="domain-sub">{student.weakTopics.length} weak topics</div>
        </div>
        <div className="domain-card" style={{ '--domain-color': '#8b5cf6' }}>
          <div className="domain-icon">🤝</div>
          <div className="domain-label">Behavioral</div>
          <div className="domain-score">{student.behavioral.composite.toFixed(1)}</div>
          <div className="domain-sub">out of 10</div>
        </div>
        <div className="domain-card" style={{ '--domain-color': '#10b981' }}>
          <div className="domain-icon">🏃</div>
          <div className="domain-label">Sports/Physical</div>
          <div className="domain-score">{student.sports.fitness}</div>
          <div className="domain-sub">{student.sports.sports.join(', ')}</div>
        </div>
        <div className="domain-card" style={{ '--domain-color': '#f43f5e' }}>
          <div className="domain-icon">❤️</div>
          <div className="domain-label">Health</div>
          <div className="domain-score">{student.health.absences}</div>
          <div className="domain-sub">absences · {student.health.exam_absences} in exam period</div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, margin: '24px 0 16px', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600,
              color: activeTab === tab ? 'var(--blue)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--blue)' : '2px solid transparent',
              background: 'none', transition: 'all .2s', borderRadius: '6px 6px 0 0',
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <div className="grid-2 fade-up">
          {/* Domain radar bar chart */}
          <div className="card">
            <div className="card-header"><span className="card-title">DOMAIN PERFORMANCE</span></div>
            <div className="card-body"><div style={{ height: 220 }}><Bar data={barData} options={barOptions} /></div></div>
          </div>

          {/* Behavioral breakdown */}
          <div className="card">
            <div className="card-header"><span className="card-title">BEHAVIORAL BREAKDOWN</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Participation',   student.behavioral.participation, '#6366f1'],
                ['Leadership',      student.behavioral.leadership,    '#8b5cf6'],
                ['Assignment Consistency', student.behavioral.assignment, '#f59e0b'],
                ['Communication',   student.behavioral.composite,     '#3b82f6'],
              ].map(([label, val, color]) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ color, fontWeight: 700 }}>{val?.toFixed(1)}/10</span>
                  </div>
                  <MiniBar value={val || 0} max={10} color={color} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Academic' && (
        <div className="fade-up">
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><span className="card-title">WEAK TOPICS</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {student.weakTopics.map((t, i) => (
                  <div key={t} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', background: 'var(--risk-critical-bg)',
                    border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8,
                  }}>
                    <span style={{ color: 'var(--risk-critical)', fontSize: '1rem' }}>✗</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {i === 0 ? 'Conceptual gap' : i === 1 ? 'Mixed mistakes' : 'Careless errors'}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: 'var(--risk-critical)' }}>
                      {30 + i * 8}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">STRONG TOPICS</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {student.strongTopics.map((t, i) => (
                  <div key={t} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', background: 'var(--risk-low-bg)',
                    border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8,
                  }}>
                    <span style={{ color: 'var(--risk-low)', fontSize: '1rem' }}>✓</span>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t}</div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: 'var(--risk-low)' }}>
                      {78 + i * 4}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mistake type */}
          <div className="card section-gap">
            <div className="card-header"><span className="card-title">MISTAKE ANALYSIS</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Conceptual Gaps</span>
                      <span style={{ color: 'var(--risk-critical)', fontWeight: 700 }}>65%</span>
                    </div>
                    <MiniBar value={6.5} max={10} color="var(--risk-critical)" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Careless Mistakes</span>
                      <span style={{ color: 'var(--risk-medium)', fontWeight: 700 }}>35%</span>
                    </div>
                    <MiniBar value={3.5} max={10} color="var(--risk-medium)" />
                  </div>
                </div>
                <div style={{ padding: '16px 20px', background: 'var(--risk-critical-bg)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--risk-critical)' }}>
                  <strong>Primary Issue:</strong><br />Conceptual gaps<br />in Fractions
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Knowledge Graph' && (
        <div className="fade-up">
          <div style={{ marginBottom: 12, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Interactive graph showing topic mastery, behavioral profile, and dependency risk cascades.
            <strong style={{ color: 'var(--text-primary)' }}> Drag nodes · Scroll to zoom.</strong>
          </div>
          <KnowledgeGraph student={student} height={520} />
        </div>
      )}

      {activeTab === 'Future Risks' && (
        <div className="fade-up">
          <div className="alert alert-critical" style={{ marginBottom: 16 }}>
            <AlertTriangle size={16} />
            <div className="alert-body">
              <div className="alert-title">Future Impact Warning</div>
              <div className="alert-desc">Current weak topics will cascade to {student.futureRisks.length} future topics across upcoming grades.</div>
            </div>
          </div>
          <FutureRiskChain risks={student.futureRisks} />
        </div>
      )}

      {activeTab === 'AI Report' && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Strengths */}
          <div className="card">
            <div className="card-header"><span className="card-title">💪 STRENGTHS</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {student.aiNarrative.strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--risk-low)', flexShrink: 0 }}>✓</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Concerns */}
          <div className="card">
            <div className="card-header"><span className="card-title">⚠️ CONCERNS</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {student.aiNarrative.concerns.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--risk-critical)', flexShrink: 0 }}>!</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher recommendations */}
          <div className="card" style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
            <div className="card-header"><span className="card-title">📋 TEACHER RECOMMENDATIONS</span></div>
            <div className="card-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {student.aiNarrative.teacher_recommendation}
              </p>
            </div>
          </div>

          {/* Student + Parent messages */}
          <div className="grid-2">
            <div className="card" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="card-header"><span className="card-title">🎓 MESSAGE TO STUDENT</span></div>
              <div className="card-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
                  "{student.aiNarrative.student_message}"
                </p>
              </div>
            </div>
            <div className="card" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
              <div className="card-header"><span className="card-title">👨‍👩‍👧 PARENT SUMMARY</span></div>
              <div className="card-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {student.aiNarrative.parent_summary}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
