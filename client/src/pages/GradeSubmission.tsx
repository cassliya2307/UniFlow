import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import type { GradeSubmissionData } from '../types'
import { calculateLetterGrade } from '../utils/grade'

export default function GradeSubmission() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState<GradeSubmissionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [publishError, setPublishError] = useState('')
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const data = await api.getSubmission(submissionId!)
        setSubmission(data as GradeSubmissionData)
        if (data.score !== undefined) {
          setScore(String(data.score))
        }
        if (data.feedback) {
          setFeedback(data.feedback)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubmission()
  }, [submissionId])

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    setIsSaving(true)

    try {
      const scoreNum = parseInt(score, 10)
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        throw new Error('Score must be between 0 and 100')
      }
      await api.gradeSubmission(submissionId!, scoreNum, feedback || undefined)
      setSaveError('')
      alert('Grade saved as draft')
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    setPublishError('')

    if (submission?.status !== 'GRADED') {
      setPublishError('Can only publish graded submissions')
      return
    }

    setIsPublishing(true)

    try {
      await api.publishGrade(submissionId!, true)
      navigate(`/lecturer/projects/${submission?.project.id}/submissions`)
    } catch (err: any) {
      setPublishError(err.message)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const blob = await api.downloadFile(fileId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Failed to download file: ' + err.message)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType.includes('wordprocessingml')) return '📝'
    if (mimeType.includes('presentationml')) return '📊'
    if (mimeType === 'application/zip') return '🗜️'
    return '📎'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!submission) return null

  const grade = score ? calculateLetterGrade(parseInt(score, 10)) : ''

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '16px', display: 'inline-flex' }}>
            ← Back
          </button>
          <h1 className="page-title">Grade Submission</h1>
          <p className="page-subtitle">{submission.student.name} • {submission.project.title}</p>
        </div>
        <span className={`badge ${getStatusBadge(submission.status)}`} style={{ fontSize: '14px', padding: '6px 14px' }}>
          {submission.status.replace('_', ' ')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Submission Details</h2>
          <dl style={{ display: 'grid', gap: '16px' }}>
            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student</dt>
              <dd style={{ fontSize: '16px', fontWeight: '500', marginTop: '4px' }}>{submission.student.name}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course</dt>
              <dd style={{ marginTop: '4px' }}>{submission.project.course} ({submission.project.courseCode})</dd>
            </div>
            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</dt>
              <dd style={{ marginTop: '4px', fontWeight: '500' }}>{submission.project.title}</dd>
            </div>
            {submission.projectUrl && (
              <div>
                <dt style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submission Link</dt>
                <dd style={{ marginTop: '4px' }}>
                  <a href={submission.projectUrl} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                    {submission.projectUrl}
                  </a>
                </dd>
              </div>
            )}
            {submission.files && submission.files.length > 0 && (
              <div>
                <dt style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uploaded Files</dt>
                <dd style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {submission.files.map(file => (
                    <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius)', border: '1px solid var(--color-gray-200)' }}>
                      <span style={{ fontSize: '24px' }}>{getFileIcon(file.mimeType)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '500', wordBreak: 'break-all' }}>{file.fileName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>{formatFileSize(file.fileSize)} • {file.mimeType}</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleDownloadFile(file.id, file.fileName)}
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </dd>
              </div>
            )}
            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted</dt>
              <dd style={{ marginTop: '4px' }}>{formatDate(submission.submittedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Grading</h2>

          {saveError && <div className="alert alert-error">{saveError}</div>}
          {publishError && <div className="alert alert-error">{publishError}</div>}

          <form onSubmit={handleSaveDraft}>
            <div className="form-group">
              <label htmlFor="score">Score <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  id="score"
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  min={0}
                  max={100}
                  required
                  style={{ width: '120px' }}
                  placeholder="85"
                />
                <span style={{ color: 'var(--color-gray-500)' }}> / 100</span>
                {score && (
                  <span style={{
                    padding: '4px 12px',
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    borderRadius: 'var(--radius)',
                    fontWeight: '600'
                  }}>
                    Grade: {grade}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                70-100: A • 60-69: B • 50-59: C • 45-49: D • 40-44: E • 0-39: F
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="feedback">Feedback (optional)</label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={6}
                placeholder="Enter your feedback for the student..."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-secondary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              {submission.status === 'GRADED' && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Publish Result'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

