import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../utils/api'
import type { Project, Submission, ProjectWithCourse, SubmissionFile } from '../types'
import { calculateLetterGrade } from '../utils/grade'

interface StudentProjectResponse extends Omit<Project, 'course'> {
  course: string
  courseCode: string
  submission: (Submission & { project?: ProjectWithCourse; files?: SubmissionFile[] }) | null
}

export default function StudentProject() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<StudentProjectResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [projectUrl, setProjectUrl] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await api.getStudentProject(projectId!)
        setProject(data as unknown as StudentProjectResponse)
        if (data.submission?.projectUrl) {
          setProjectUrl(data.submission.projectUrl)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setIsSubmitting(true)

    try {
      await api.submitProject(projectId!, { projectUrl: projectUrl || undefined, files: selectedFiles })
      setSubmitSuccess(true)
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType.includes('wordprocessingml')) return '📝'
    if (mimeType.includes('presentationml')) return '📊'
    if (mimeType === 'application/zip') return '🗜️'
    return '📎'
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!project) return null

  const submission = project.submission
  const isSubmitted = submission && submission.status !== 'NOT_SUBMITTED'
  const isPublished = submission?.status === 'PUBLISHED'
  const deadlinePassed = new Date(project.deadline) < new Date()

  const showLinkField = project.submissionType === 'LINK' || project.submissionType === 'LINK_AND_FILE'
  const showFileField = project.submissionType === 'FILE' || project.submissionType === 'LINK_AND_FILE'
  const requireLink = project.submissionType === 'LINK' || project.submissionType === 'LINK_AND_FILE'
  const requireFile = project.submissionType === 'FILE' || project.submissionType === 'LINK_AND_FILE'

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/student/dashboard" className="btn btn-secondary" style={{ marginBottom: '16px', display: 'inline-flex' }}>
            ← Back to Dashboard
          </Link>
          <h1 className="page-title">{project.title}</h1>
          <p className="page-subtitle">{project.course} ({project.courseCode})</p>
          <p style={{ fontSize: '14px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
            Submission Type: {project.submissionType.replace('_', ' ')}
          </p>
        </div>
        <span className={`badge ${getStatusBadge(submission?.status || 'NOT_SUBMITTED')}`} style={{ fontSize: '14px', padding: '6px 14px' }}>
          {submission?.status?.replace('_', ' ') || 'Not Submitted'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Project Details</h2>
          <dl style={{ display: 'grid', gap: '16px' }}>
            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadline</dt>
              <dd style={{ fontSize: '16px', fontWeight: '500', marginTop: '4px' }}>{formatDate(project.deadline)}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</dt>
              <dd style={{ marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{project.description}</dd>
            </div>
            {project.requirements && (
              <div>
                <dt style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requirements</dt>
                <dd style={{ marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{project.requirements}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            {isSubmitted ? 'Your Submission' : 'Submit Project'}
          </h2>

          {submitSuccess && (
            <div className="alert alert-success">Project submitted successfully!</div>
          )}

          {submitError && <div className="alert alert-error">{submitError}</div>}

          {isSubmitted ? (
            <div>
              {submission.projectUrl && (
                <div style={{ marginBottom: '16px' }}>
                  <label>Submission Link</label>
                  <a href={submission.projectUrl} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all', display: 'block' }}>
                    {submission.projectUrl}
                  </a>
                </div>
              )}
              {submission.files && submission.files.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label>Uploaded Files</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
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
                          onClick={() => api.downloadStudentFile(file.id).then(blob => {
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = file.fileName
                            a.click()
                            URL.revokeObjectURL(url)
                          })}
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <label>Submitted</label>
                <div>{formatDate(submission.submittedAt!)}</div>
              </div>
              {isPublished && (
                <div style={{ padding: '16px', background: 'var(--color-success-light)', borderRadius: 'var(--radius)', border: '1px solid var(--color-success)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#166534', marginBottom: '12px' }}>Result Published</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Score</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-gray-900)' }}>
                        {submission.score} / 100
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Grade</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-success)' }}>
                        {submission.score !== null && submission.score !== undefined ? calculateLetterGrade(submission.score) : '—'}
                      </div>
                    </div>
                  </div>
                  {submission.feedback && (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '8px' }}>Feedback</div>
                      <div style={{ whiteSpace: 'pre-wrap', color: 'var(--color-gray-700)' }}>{submission.feedback}</div>
                    </div>
                  )}
                </div>
              )}
              {!isPublished && submission.status === 'GRADED' && (
                <div className="alert alert-info">Your submission has been graded. Results will be visible once published by the lecturer.</div>
              )}
              {!isPublished && submission.status === 'SUBMITTED' && (
                <div className="alert alert-info">Your submission is pending review.</div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {showLinkField && (
                <div className="form-group">
                  <label htmlFor="projectUrl">Submission Link {requireLink && <span style={{ color: 'var(--color-danger)' }}>*</span>}</label>
                  <input
                    id="projectUrl"
                    type="url"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    placeholder="https://github.com/username/project or https://drive.google.com/..."
                    required={requireLink}
                    disabled={deadlinePassed}
                  />
                  {requireLink && <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>Enter a URL to your project (GitHub, Google Drive, OneDrive, etc.)</p>}
                  {deadlinePassed && (
                    <p style={{ marginTop: '8px', color: 'var(--color-danger)', fontSize: '14px' }}>
                      The submission deadline has passed.
                    </p>
                  )}
                </div>
              )}

              {showFileField && (
                <div className="form-group">
                  <label>File Upload {requireFile && <span style={{ color: 'var(--color-danger)' }}>*</span>}</label>
                  <input
                    type="file"
                    id="files"
                    multiple
                    accept=".pdf,.docx,.pptx,.zip,.jpg,.jpeg,.png,.md,.txt"
                    onChange={handleFileChange}
                    required={requireFile}
                    disabled={deadlinePassed}
                  />
                  {requireFile && <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>Select at least one file (PDF, DOCX, PPTX, ZIP, JPG, PNG, MD, TXT - max 10MB each)</p>}
                  {selectedFiles.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <strong>Selected files:</strong>
                      {selectedFiles.map((file, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius)', border: '1px solid var(--color-gray-200)' }}>
                          <span>📎</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '500', wordBreak: 'break-all' }}>{file.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>{formatFileSize(file.size)} • {file.type || 'Unknown type'}</div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => removeFile(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {deadlinePassed && (
                    <p style={{ marginTop: '8px', color: 'var(--color-danger)', fontSize: '14px' }}>
                      The submission deadline has passed.
                    </p>
                  )}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isSubmitting || deadlinePassed}>
                {isSubmitting ? 'Submitting...' : 'Submit Project'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}