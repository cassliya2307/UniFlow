import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import type { StudentDashboard, StudentProject } from '../types'

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.getStudentDashboard()
        setDashboard(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      NOT_SUBMITTED: 'badge-not-submitted',
      SUBMITTED: 'badge-submitted',
      GRADED: 'badge-graded',
      PUBLISHED: 'badge-published'
    }
    return badges[status] || 'badge-not-submitted'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!dashboard) return null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {dashboard.name}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{dashboard.totalProjects}</div>
          <div className="stat-label">Total Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dashboard.submittedProjects}</div>
          <div className="stat-label">Submitted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dashboard.publishedProjects}</div>
          <div className="stat-label">Graded & Published</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dashboard.pendingProjects}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-gray-200)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Your Projects</h2>
        </div>
        {dashboard.projects.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-gray-500)' }}>
            No projects assigned yet.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Project</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Grade</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.projects.map((project: StudentProject) => (
                  <tr key={project.id}>
                    <td>
                      <div style={{ fontWeight: '500' }}>{project.course}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>{project.courseCode}</div>
                    </td>
                    <td>{project.title}</td>
                    <td>{formatDate(project.deadline)}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(project.submissionStatus)}`}>
                        {project.submissionStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {project.score !== null && project.grade ? (
                        <span>{project.score} / 100 ({project.grade})</span>
                      ) : (
                        <span style={{ color: 'var(--color-gray-400)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/student/projects/${project.id}`} style={{ fontSize: '14px' }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}