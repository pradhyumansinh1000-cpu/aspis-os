// src/components/RiskBadge.jsx
export default function RiskBadge({ level, score, size = 'sm' }) {
  const labels = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk', critical: 'Critical' }
  return (
    <span className={`risk-badge ${level}`} style={{ fontSize: size === 'lg' ? '0.82rem' : undefined }}>
      {labels[level] || level}
      {score !== undefined && <span style={{ opacity: 0.75, marginLeft: 3 }}>({score?.toFixed(0)})</span>}
    </span>
  )
}

// src/components/ScoreGauge.jsx — SVG circular gauge
export function ScoreGauge({ score, size = 100, riskLevel = 'medium' }) {
  const COLORS = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#f43f5e' }
  const color = COLORS[riskLevel] || '#3b82f6'
  const r = 38; const circ = 2 * Math.PI * r
  const pct = Math.min(score, 100) / 100
  const dash = circ * pct

  return (
    <div className="gauge-wrap">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
          fill="white" fontSize="18" fontWeight="800" fontFamily="Inter">
          {Math.round(score)}
        </text>
      </svg>
      <div className="gauge-label">Risk Score</div>
    </div>
  )
}

// src/components/MiniBar.jsx
export function MiniBar({ value, max = 10, color = 'var(--blue)' }) {
  const pct = (value / max) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: 28 }}>
        {value.toFixed(1)}
      </span>
    </div>
  )
}
