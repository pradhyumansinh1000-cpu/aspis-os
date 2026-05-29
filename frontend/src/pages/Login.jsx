// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brain, Lock, Mail, Eye, EyeOff } from 'lucide-react'

const DEMO_ROLES = [
  { role: 'teacher', label: '👩‍🏫 Teacher', desc: 'Priya Sharma' },
  { role: 'admin',   label: '🛡️ Admin',   desc: 'Rajan Mehta' },
  { role: 'student', label: '🎓 Student', desc: 'Arjun Verma' },
  { role: 'parent',  label: '👨‍👩‍👧 Parent',  desc: 'Sunita Verma' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState({ email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    login('teacher', credentials.password)
    navigate('/dashboard')
  }

  const handleDemo = async (role) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    login(role)
    navigate('/dashboard')
  }

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-orb login-orb-1" style={{ animation: 'float1 8s ease-in-out infinite' }} />
        <div className="login-orb login-orb-2" style={{ animation: 'float2 10s ease-in-out infinite' }} />
        <div className="login-orb login-orb-3" style={{ animation: 'float3 12s ease-in-out infinite' }} />

        {/* Neural net grid pattern */}
        <svg style={{ position: 'absolute', inset: 0, opacity: 0.04 }} width="100%" height="100%">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="login-card fade-up">
        {/* Branding */}
        <div className="login-logo">
          <div className="login-logo-icon">🧠</div>
          <div>
            <h1>StudentIQ</h1>
            <p>Digital Intelligence Platform</p>
          </div>
        </div>

        {/* Tag line */}
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          Longitudinal AI system tracking academic, behavioral,
          physical and developmental growth.
        </p>

        {/* Login form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input" type="email"
                style={{ paddingLeft: 36, width: '100%' }}
                placeholder="teacher@school.edu"
                value={credentials.email}
                onChange={e => setCredentials(p => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input" type={showPass ? 'text' : 'password'}
                style={{ paddingLeft: 36, paddingRight: 40, width: '100%' }}
                placeholder="••••••••"
                value={credentials.password}
                onChange={e => setCredentials(p => ({ ...p, password: e.target.value }))}
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Demo login */}
        <div style={{ marginTop: 20 }}>
          <div className="login-divider">— or login as demo —</div>
          <div className="login-demo-grid" style={{ marginTop: 10 }}>
            {DEMO_ROLES.map(d => (
              <button key={d.role} className="login-demo-btn" onClick={() => handleDemo(d.role)} disabled={loading}>
                <div style={{ fontWeight: 600 }}>{d.label}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: 2 }}>{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 24, textAlign: 'center' }}>
          CBSE · Class 9 · Delhi Public School
        </p>
      </div>

      <style>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px, -20px); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-25px, 15px); } }
        @keyframes float3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(15px, 25px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
