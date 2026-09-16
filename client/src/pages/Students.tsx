import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import { getStatusBadge, formatDateTime } from '../utils/format'
import LoadingSpinner from '../components/LoadingSpinner'
import type { LecturerStudent } from '../types'

export default function Students() {
  const [students, setStudents] = useState<LecturerStudent[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await api.getLecturerStudents()
        setStudents(data.students)
      } catch (err: any) {
        setError(err.message || 'Unable to load students. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStudents()
  }, [])

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="alert alert-error" role="alert">{error}</div>
  if (!students) return null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">
            {students.length === 0
              ? 'Students enrolled in your courses will appear here.'
              : `${students.length} student${students.length === 1 ? '' : 's'} enrolled in your courses`}
          </p>
        </div>
      </div>

      <div className="card">
        {students.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-gray-500)' }}>
            No students yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="table-sticky-first">
              <caption className="visually-hidden">Students enrolled in your courses</caption>
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Matric. No.</th>
                  <th scope="col">Course</th>
                  <th scope="col">Project</th>
                  <th scope="col">Status</th>
                  <th scope="col">Score</th>
                  <th scope="col">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  student.projects.length === 0 ? (
                    <tr key={student.id}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{student.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>{student.email}</div>
                      </td>
                      <td>{student.matriculationNumber || <span style={{ color: 'var(--color-gray-400)' }}>—</span>}</td>
                      <td>{student.course.code}</td>
                      <td><span style={{ color: 'var(--color-gray-400)' }}>—</span></td>
                      <td><span style={{ color: 'var(--color-gray-400)' }}>—</span></td>
                      <td><span style={{ color: 'var(--color-gray-400)' }}>—</span></td>
                      <td><span style={{ color: 'var(--color-gray-400)' }}>—</span></td>
                    </tr>
                  ) : (
                    student.projects.map(project => (
                      <tr key={`${student.id}-${project.projectId}`}>
                        <td>
                          <div style={{ fontWeight: '500' }}>{student.name}</div>
                          <div style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>{student.email}</div>
                        </td>
                        <td>{student.matriculationNumber || <span style={{ color: 'var(--color-gray-400)' }}>—</span>}</td>
                        <td>{student.course.code}</td>
                        <td>{project.title}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(project.status)}`}>
                            {project.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {project.score !== null && project.score !== undefined ? (
                            <span>{project.score} / 100</span>
                          ) : (
                            <span style={{ color: 'var(--color-gray-400)' }}>—</span>
                          )}
                        </td>
                        <td>{project.submittedAt ? formatDateTime(project.submittedAt) : <span style={{ color: 'var(--color-gray-400)' }}>—</span>}</td>
                      </tr>
                    ))
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
