import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isStudent = user?.role === 'STUDENT'
  const basePath = isStudent ? '/student' : '/lecturer'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-gray-200)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="container" style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to={basePath + '/dashboard'} style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)', textDecoration: 'none' }}>
            University Project Portal
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: 'var(--color-gray-600)', fontSize: '14px' }}>
              {user?.name} ({user?.role})
            </span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="container" style={{ flex: 1, paddingTop: '24px', paddingBottom: '24px', width: '100%' }}>
        {children}
      </main>
      <footer style={{
        background: 'var(--color-white)',
        borderTop: '1px solid var(--color-gray-200)',
        padding: '16px 24px',
        textAlign: 'center',
        color: 'var(--color-gray-500)',
        fontSize: '14px'
      }}>
        University Project Portal — MVP
      </footer>
    </div>
  )
}