// src/pages/ActionReport.jsx — Teacher Action Report (most valuable page)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { STUDENTS, CLASS_STATS } from '../data/mockData'
import RiskBadge from '../components/RiskBadge'
import { AlertTriangle, Brain, Lightbulb, CheckCircle, ChevronRight, Users } from 'lucide-react'

export default function ActionReport() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(new Set())

  const criticalStudents = STUDENTS.filter(s => s.riskLevel === 'critical' && !dismissed.has(s.id))
  const highStudents = STUDENTS.filter(s => s.riskLevel === 'high' && !dismissed.has(s.id))
  const mediumStudents = STUDENTS.filter(s => s.riskLevel === 'medium' && !dismissed.has(s.id))

  const classHealthColor = CLASS_STATS.class_health === 'serious_concern' ? 'var(--risk-critical)' :
                           CLASS_STATS.class_health === 'moderate_concern' ? 'var(--risk-medium)' : 'var(--risk-low)'

  return (
    <div>
      <div className="page-header fade-up">
        <h1>Teacher Action Report</h1>
        <p>Class 9A · Daily intelligence briefing · Updated 2h ago</p>
      </div>

      {/* Class Health Banner */}
      <div style={{
        background: `linear-gradient(135deg, rgba(244,63,94,0.12), rgba(249,115,22,0.08))`,
        border: '1px solid rgba(244,63,94,0.25)',
        borderRadius: 14, padding: '18px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 20,
      }} className="fade-up fade-up-1">
        <AlertTriangle size={28} style={{ color: 'var(--risk-critical)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 3 }}>
            Class Health: <span style={{ color: 'var(--risk-medium)' }}>Moderate Concern</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {criticalStudents.length + highStudents.length} students need intervention.
            {' '}{CLASS_STATS.top_weak_topics[0].pct}% of class weak in {CLASS_STATS.top_weak_topics[0].name}.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, textAlign: 'center' }}>
          {[
            [criticalStudents.length, 'Critical', 'var(--risk-critical)'],
            [highStudents.length,     'High',     'var(--risk-high)'],
            [mediumStudents.length,   'Medium',   'var(--risk-medium)'],
          ].map(([n, label, color]) => (
            <div key={label}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color, letterSpacing: -1 }}>{n}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Win Tip */}
      <div className="alert alert-info fade-up fade-up-2" style={{ marginBottom: 24 }}>
        <Lightbulb size={16} />
        <div className="alert-body">
          <div className="alert-title">💡 Quick Win for Today</div>
          <div className="alert-desc">
            {CLASS_STATS.top_weak_topics[0].pct}% of class is weak in <strong>{CLASS_STATS.top_weak_topics[0].name}</strong>.
            A focused 20-minute revision of this topic could significantly lift class average before next assessment.
          </div>
        </div>
      </div>

      {/* Critical Students */}
      {criticalStudents.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={16} style={{ color: 'var(--risk-critical)' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--risk-critical)' }}>
              🚨 Immediate Intervention Required ({criticalStudents.length})
            </h2>
          </div>
          {criticalStudents.map(s => (
            <InterventionCard key={s.id} student={s} onDismiss={() => setDismissed(p => new Set([...p, s.id]))} onNavigate={() => navigate(`/students/${s.id}`)} />
          ))}
        </section>
      )}

      {/* High Risk */}
      {highStudents.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--risk-high)' }}>
              ⚠️ High Risk — Monitor This Week ({highStudents.length})
            </h2>
          </div>
          {highStudents.map(s => (
            <InterventionCard key={s.id} student={s} onDismiss={() => setDismissed(p => new Set([...p, s.id]))} onNavigate={() => navigate(`/students/${s.id}`)} />
          ))}
        </section>
      )}

      {/* Medium Watch */}
      {mediumStudents.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--risk-medium)' }}>
              👀 Watch List — Medium Risk ({mediumStudents.length})
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {mediumStudents.map(s => (
              <div key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderLeft: '3px solid var(--risk-medium)',
                  borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12, transition: 'all .2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700,
                }}>{s.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {s.weakTopics[0] || 'Monitoring'}
                  </div>
                </div>
                <RiskBadge level={s.riskLevel} score={s.riskScore} />
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Class Weak Topics */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Brain size={16} style={{ color: 'var(--blue)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>📚 Topics Requiring Class Attention</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {CLASS_STATS.top_weak_topics.map((topic, i) => (
            <div key={topic.name} className="card" style={{
              borderLeft: `3px solid ${topic.pct >= 40 ? 'var(--risk-critical)' : topic.pct >= 25 ? 'var(--risk-medium)' : 'var(--risk-low)'}`,
            }}>
              <div className="card-header">
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{topic.name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{topic.subject}</span>
              </div>
              <div className="card-body" style={{ paddingTop: 10 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: topic.pct >= 40 ? 'var(--risk-critical)' : 'var(--risk-medium)', marginBottom: 4 }}>
                  {topic.pct}%
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  {topic.affected} of {CLASS_STATS.total_students} students need support
                </div>
                <div className="progress-bar" style={{ marginBottom: 10 }}>
                  <div className="progress-fill" style={{
                    width: `${topic.pct}%`,
                    background: topic.pct >= 40 ? 'linear-gradient(90deg, #f43f5e, #f97316)' : '#f59e0b'
                  }} />
                </div>
                <div style={{
                  padding: '8px 10px', background: 'var(--bg-glass)', borderRadius: 6,
                  fontSize: '0.75rem', color: 'var(--text-secondary)'
                }}>
                  💡 {topic.pct >= 40 ? 'Full class reteach recommended' :
                       topic.pct >= 25 ? 'Group remedial session needed' : 'Targeted individual support'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function InterventionCard({ student, onDismiss, onNavigate }) {
  const isCritical = student.riskLevel === 'critical'
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 14, marginBottom: 12,
      border: `1px solid ${isCritical ? 'rgba(244,63,94,0.3)' : 'rgba(249,115,22,0.2)'}`,
      borderLeft: `4px solid ${isCritical ? 'var(--risk-critical)' : 'var(--risk-high)'}`,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${isCritical ? '#f43f5e,#f97316' : '#f97316,#f59e0b'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700,
            animation: isCritical ? 'pulse-ring 2s infinite' : 'none',
          }}>{student.initials}</div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{student.name}</span>
              <RiskBadge level={student.riskLevel} score={student.riskScore} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                Grade {student.grade}{student.section} · Roll {student.roll}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {student.weakTopics.map(t => (
                <span key={t} style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600,
                  background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)'
                }}>⚠ {t}</span>
              ))}
              {student.health.vision_flag && (
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
                  👁 Vision concern
                </span>
              )}
            </div>

            <div style={{
              padding: '10px 12px', background: isCritical ? 'var(--risk-critical-bg)' : 'var(--risk-high-bg)',
              borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12
            }}>
              {student.aiNarrative.teacher_recommendation}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '6px 14px' }} onClick={onNavigate}>
                View Full Profile <ChevronRight size={12} />
              </button>
              <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
                📅 Schedule Meeting
              </button>
              <button onClick={onDismiss}
                style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <CheckCircle size={14} style={{ marginRight: 4 }} /> Mark reviewed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
