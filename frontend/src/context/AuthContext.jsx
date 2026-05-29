// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// Mock users for demo — replace with real JWT auth
const DEMO_USERS = {
  teacher: { id: '1', name: 'Priya Sharma', role: 'teacher', institution: 'Delhi Public School', initials: 'PS' },
  admin:   { id: '2', name: 'Rajan Mehta',  role: 'admin',   institution: 'Delhi Public School', initials: 'RM' },
  student: { id: '3', name: 'Arjun Verma',  role: 'student', institution: 'Delhi Public School', initials: 'AV' },
  parent:  { id: '4', name: 'Sunita Verma', role: 'parent',  institution: 'Delhi Public School', initials: 'SV' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  const login = (role, password) => {
    // Demo login — swap with real API call
    const u = DEMO_USERS[role]
    if (u) { setUser(u); setToken('demo_token_' + role); return true }
    return false
  }

  const logout = () => { setUser(null); setToken(null) }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
