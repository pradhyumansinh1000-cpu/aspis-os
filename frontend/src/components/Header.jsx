// src/components/Header.jsx
import { Search, Bell, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NOTIFICATIONS } from '../data/mockData'

const PAGE_TITLES = {
  '/dashboard':      'Overview Dashboard',
  '/students':       'Student Roster',
  '/action-report':  'Teacher Action Report',
  '/class-intel':    'Class Intelligence',
  '/reports':        'AI Reports',
  '/knowledge-graph':'Knowledge Graph',
  '/ontology':       'Curriculum Map',
}

export default function Header() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const unread = NOTIFICATIONS.filter(n => n.type === 'critical' || n.type === 'warning').length

  return (
    <header className="header">
      <div className="header-title">{PAGE_TITLES[pathname] || 'Student Intelligence Platform'}</div>

      <div className="header-search">
        <Search size={14} />
        <input placeholder="Search students, topics…" />
      </div>

      <div className="header-actions">
        <button className="icon-btn" style={{ position: 'relative' }}>
          <Bell size={16} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, borderRadius: '50%',
              background: '#f43f5e', border: '2px solid var(--bg-secondary)',
            }} />
          )}
        </button>
        <button className="icon-btn">
          <RefreshCw size={16} />
        </button>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--blue), #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
        }}>{user?.initials}</div>
      </div>
    </header>
  )
}
