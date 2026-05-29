// src/App.jsx — Main router
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import StudentProfile from './pages/StudentProfile'
import ActionReport from './pages/ActionReport'
import ClassIntel from './pages/ClassIntel'

function ProtectedLayout({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="app-layout">
      <Sidebar />
      <Header />
      <main className="main-content">{children}</main>
    </div>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />

      <Route path="/dashboard" element={
        <ProtectedLayout><Dashboard /></ProtectedLayout>
      } />
      <Route path="/students" element={
        <ProtectedLayout><Students /></ProtectedLayout>
      } />
      <Route path="/students/:id" element={
        <ProtectedLayout><StudentProfile /></ProtectedLayout>
      } />
      <Route path="/action-report" element={
        <ProtectedLayout><ActionReport /></ProtectedLayout>
      } />
      <Route path="/class-intel" element={
        <ProtectedLayout><ClassIntel /></ProtectedLayout>
      } />
      {/* Placeholder routes */}
      <Route path="/reports" element={
        <ProtectedLayout><PlaceholderPage title="AI Reports" emoji="📄" /></ProtectedLayout>
      } />
      <Route path="/knowledge-graph" element={
        <ProtectedLayout><PlaceholderPage title="Knowledge Graph" emoji="🕸️" /></ProtectedLayout>
      } />
      <Route path="/ontology" element={
        <ProtectedLayout><PlaceholderPage title="Curriculum Map" emoji="📚" /></ProtectedLayout>
      } />
      <Route path="/analytics" element={
        <ProtectedLayout><PlaceholderPage title="Analytics" emoji="📊" /></ProtectedLayout>
      } />
      <Route path="/settings" element={
        <ProtectedLayout><PlaceholderPage title="Settings" emoji="⚙️" /></ProtectedLayout>
      } />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

function PlaceholderPage({ title, emoji }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div style={{ fontSize: '4rem' }}>{emoji}</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{title}</h1>
      <p style={{ color: 'var(--text-muted)' }}>This page is coming soon — backend APIs are ready!</p>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
