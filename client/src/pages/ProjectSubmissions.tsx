import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../utils/api'
import { getStatusBadge, formatDateTime } from '../utils/format'
import LoadingSpinner from '../components/LoadingSpinner'
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

  if (isLoading) return <LoadingSpinner />
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
            {data.project.course} ({data.project.courseCode}) • Deadline: {formatDateTime(data.project.deadline)} • Type: {data.project.submissionType?.replace('_', ' ') || 'LINK'}
          </p>
        </div>
      </div>

      <div className="card">
        {data.submissions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-gray-500)' }}>
            No submissions yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="table-sticky-first">
              <caption className="visually-hidden">Submissions for {data.project.title}</caption>
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Status</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Score</th>
                  <th scope="col">Grade</th>
                  <th scope="col">Files</th>
                  <th scope="col">Actions</th>
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
                    <td>{formatDateTime(submission.submittedAt)}</td>
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