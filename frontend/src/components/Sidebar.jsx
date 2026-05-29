// src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, Brain, AlertTriangle,
  BookOpen, Activity, BarChart3, FileText,
  Settings, LogOut, Bell
} from 'lucide-react'

const TEACHER_NAV = [
  { label: 'Overview',       to: '/dashboard',       icon: LayoutDashboard },
  { label: 'Students',       to: '/students',        icon: Users },
  { label: 'Action Report',  to: '/action-report',   icon: AlertTriangle, badge: 3 },
  { label: 'Class Intel',    to: '/class-intel',     icon: Brain },
  { label: 'Reports',        to: '/reports',         icon: FileText },
]

const ADMIN_NAV = [
  { label: 'Dashboard',     to: '/dashboard',    icon: LayoutDashboard },
  { label: 'All Students',  to: '/students',     icon: Users },
  { label: 'Analytics',     to: '/analytics',    icon: BarChart3 },
  { label: 'Reports',       to: '/reports',      icon: FileText },
  { label: 'Settings',      to: '/settings',     icon: Settings },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = user?.role === 'admin' ? ADMIN_NAV : TEACHER_NAV

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🧠</div>
        <div>
          <div className="sidebar-logo-text">StudentIQ</div>
          <div className="sidebar-logo-sub">Intelligence Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon className="nav-icon" size={16} />
            {item.label}
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Intelligence</div>
        <NavLink to="/knowledge-graph" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Activity className="nav-icon" size={16} />
          Knowledge Graph
        </NavLink>
        <NavLink to="/ontology" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <BookOpen className="nav-icon" size={16} />
          Curriculum Map
        </NavLink>
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="user-pill" onClick={handleLogout} title="Logout">
          <div className="user-avatar">{user?.initials}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role} · {user?.institution?.split(' ')[0]}</div>
          </div>
          <LogOut size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </div>
      </div>
    </aside>
  )
}
