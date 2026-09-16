import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function validateRegistration(data: { name: string; matriculationNumber: string; course: string; email: string; password: string }): string | null {
  if (!data.name.trim()) return 'Please fill all required fields correctly'
  if (!data.matriculationNumber.trim()) return 'Please fill all required fields correctly'
  if (!data.course.trim()) return 'Please fill all required fields correctly'
  if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return 'Please fill all required fields correctly'
  if (!data.password || data.password.length < 6) return 'Please fill all required fields correctly'
  return null
}

export default function Register() {
  const [name, setName] = useState('')
  const [matriculationNumber, setMatriculationNumber] = useState('')
  const [course, setCourse] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validateRegistration({ name, matriculationNumber, course, email, password })
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    try {
      await register({
        name: name.trim(),
        matriculationNumber: matriculationNumber.trim(),
        course: course.trim(),
        email: email.trim(),
        password
      })
      navigate('/student/dashboard')
    } catch (err: any) {
      if (err.message === 'Email already registered') {
        setError('An account with this email already exists. Please sign in.')
      } else if (err.message === 'Matriculation number already registered') {
        setError('This matriculation number is already registered.')
      } else if (err.message === 'Course not found') {
        setError('Course not found. Please check the course code and try again.')
      } else if (err.message === 'Invalid input') {
        setError('Please fill all required fields correctly')
      } else {
        setError(err.message || 'Unable to create your account right now. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            OPGS
          </h1>
          <p className="auth-subtitle">Create Your Student Account</p>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="matriculationNumber">Matriculation Number</label>
            <input
              id="matriculationNumber"
              type="text"
              value={matriculationNumber}
              onChange={(e) => setMatriculationNumber(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="course">Course Code</label>
            <input
              id="course"
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              required
              autoComplete="course"
              style={{ textTransform: 'uppercase' }}
              placeholder="SWE301"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit"
            className="btn btn-primary auth-submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}