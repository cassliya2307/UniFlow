import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function NotFound() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner />

  const destination =
    user?.role === 'LECTURER'
      ? '/lecturer/dashboard'
      : user
        ? '/student/dashboard'
        : '/login'

  return (
    <div className="auth-page">
      <div className="card auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-header">
          <h1 className="auth-title">Page not found</h1>
          <p className="auth-subtitle">The page you&apos;re looking for doesn&apos;t exist or may have been moved.</p>
        </div>
        <Link to={destination} className="btn btn-primary auth-submit">
          {user ? 'Go to Dashboard' : 'Back to Sign In'}
        </Link>
      </div>
    </div>
  )
}
