import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../utils/api'
import type { ProjectSubmissions, SubmissionListItem } from '../types'

export default function ProjectSubmissions() {
  const { projectId } = useParams<{ projectId: string }>()
  const [data, setData] = useState<ProjectSubmissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const result = await api.getProjectSubmissions(projectId!)
        setData(result)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubmissions()
  }, [projectId])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      NOT_SUBMITTED: 'badge-not-submitted',
      SUBMITTED: 'badge-submitted',
      GRADED: 'badge-graded',
      PUBLISHED: 'badge-published'
    }
    return badges[status] || 'badge-not-submitted'
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!data) return null

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/lecturer/dashboard" className="btn btn-secondary" style={{ marginBottom: '16px', display: 'inline-flex' }}>
            ← Back to Dashboard
          </Link>
          <h1 className="page-title">{data.project.title}</h1>
          <p className="page-subtitle">
            {data.project.course} ({data.project.courseCode}) • Deadline: {formatDate(data.project.deadline)} • Type: {data.project.submissionType?.replace('_', ' ') || 'LINK'}
          </p>
        </div>
      </div>

      <div className="card">
        {data.submissions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-gray-500)' }}>
            No student submissions yet.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '250px' }}>Student</th>
                  <th style={{ width: '140px' }}>Status</th>
                  <th style={{ width: '200px' }}>Submitted</th>
                  <th style={{ width: '120px' }}>Score</th>
                  <th style={{ width: '100px' }}>Grade</th>
                  <th style={{ width: '100px' }}>Files</th>
                  <th style={{ width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.submissions.map((submission: SubmissionListItem) => (
                  <tr key={submission.id}>
                    <td>
                      <div style={{ fontWeight: '500' }}>{submission.student.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>{submission.student.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(submission.status)}`}>
                        {submission.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{formatDate(submission.submittedAt)}</td>
                    <td>
                      {submission.score !== undefined ? (
                        <span>{submission.score} / 100</span>
                      ) : (
                        <span style={{ color: 'var(--color-gray-400)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {submission.grade ? <span>{submission.grade}</span> : <span style={{ color: 'var(--color-gray-400)' }}>—</span>}
                    </td>
                    <td>
                      {submission.files && submission.files.length > 0 ? (
                        <span style={{ color: 'var(--color-primary)' }}>{submission.files.length} file(s)</span>
                      ) : (
                        <span style={{ color: 'var(--color-gray-400)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {submission.status !== 'NOT_SUBMITTED' && (
                        <Link to={`/lecturer/submissions/${submission.id}/grade`} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                          {submission.status === 'SUBMITTED' ? 'Grade' : 'Review'}
                        </Link>
                      )}
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