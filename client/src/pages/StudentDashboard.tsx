import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import { getStatusBadge, formatDate, getDeadlineStatus } from '../utils/format'
import LoadingSpinner from '../components/LoadingSpinner'
import type { StudentDashboard, StudentProject } from '../types'

function getDashboardErrorMessage(message: string): string {
  if (!message) return "We couldn't load your dashboard. Please try again."
  if (/failed to fetch|network|load failed|HTTP 5|Internal server error|Request failed/i.test(message)) {
    return "We couldn't load your dashboard. Please try again."
  }
  return message
}

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

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="alert alert-error" role="alert">{getDashboardErrorMessage(error)}</div>
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
          <div className="stat-label">Published</div>
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
            No projects yet.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <caption className="visually-hidden">Your projects</caption>
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Project</th>
                  <th scope="col">Deadline</th>
                  <th scope="col">Status</th>
                  <th scope="col">Grade</th>
                  <th scope="col" style={{ width: '100px' }}>Actions</th>
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
                    <td>
                      <div>{formatDate(project.deadline)}</div>
                      {getDeadlineStatus(project.deadline) === 'overdue' && (
                        <span className="badge badge-overdue" style={{ marginTop: '4px' }}>Overdue</span>
                      )}
                      {getDeadlineStatus(project.deadline) === 'today' && (
                        <span className="badge badge-due-today" style={{ marginTop: '4px' }}>Due today</span>
                      )}
                    </td>
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