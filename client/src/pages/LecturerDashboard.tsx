import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import type { LecturerDashboard, LecturerProjectStats } from '../types'

export default function LecturerDashboard() {
  const [dashboard, setDashboard] = useState<LecturerDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const formatDateForInput = (date: Date) => {
    return date.toISOString().slice(0, 16)
  }

  const defaultDeadline = formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    requirements: '',
    deadline: defaultDeadline,
    submissionType: 'LINK' as 'LINK' | 'FILE' | 'LINK_AND_FILE'
  })

  // Create project modal
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Create course modal
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false)
  const [courseFormData, setCourseFormData] = useState({ name: '', code: '' })
  const [isCreatingCourse, setIsCreatingCourse] = useState(false)
  const [courseCreateError, setCourseCreateError] = useState('')

  // Edit project modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState<LecturerProjectStats | null>(null)
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    deadline: '',
    courseId: '',
    submissionType: 'LINK' as 'LINK' | 'FILE' | 'LINK_AND_FILE'
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashboardData, coursesData] = await Promise.all([
          api.getLecturerDashboard(),
          api.getLecturerCourses()
        ])
        setDashboard(dashboardData)
        setCourses(coursesData)
        if (coursesData.length > 0) {
          setFormData(prev => ({ ...prev, courseId: coursesData[0].id }))
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, courseId: e.target.value }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setIsCreating(true)

    try {
      await api.createProject({
        courseId: formData.courseId,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements || undefined,
        deadline: formData.deadline,
        submissionType: formData.submissionType
      })
      setShowCreateModal(false)
      setFormData(prev => ({ ...prev, title: '', description: '', requirements: '', deadline: defaultDeadline, submissionType: 'LINK' }))
      window.location.reload()
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setCourseCreateError('')
    setIsCreatingCourse(true)

    try {
      await api.createCourse({
        name: courseFormData.name,
        code: courseFormData.code.toUpperCase()
      })
      setShowCreateCourseModal(false)
      setCourseFormData({ name: '', code: '' })
      window.location.reload()
    } catch (err: any) {
      setCourseCreateError(err.message)
    } finally {
      setIsCreatingCourse(false)
    }
  }

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError('')
    setIsEditing(true)

    if (!editingProject) return

    try {
      await api.updateProject(editingProject.id, {
        title: editFormData.title || undefined,
        description: editFormData.description || undefined,
        requirements: editFormData.requirements || undefined,
        deadline: editFormData.deadline || undefined,
        courseId: editFormData.courseId !== editingProject.courseId ? editFormData.courseId : undefined,
        submissionType: editFormData.submissionType
      })
      setShowEditModal(false)
      window.location.reload()
    } catch (err: any) {
      setEditError(err.message)
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!deletingProjectId) return
    setIsDeleting(true)

    try {
      await api.deleteProject(deletingProjectId)
      setShowDeleteModal(false)
      setDeletingProjectId(null)
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const openEditModal = (project: LecturerProjectStats) => {
    setEditingProject(project)
    setEditFormData({
      title: project.title,
      description: '',
      requirements: '',
      deadline: project.deadline ? formatDateForInput(new Date(project.deadline)) : '',
      courseId: project.courseId,
      submissionType: project.submissionType || 'LINK'
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (projectId: string) => {
    setDeletingProjectId(projectId)
    setShowDeleteModal(true)
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!dashboard) return null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lecturer Dashboard</h1>
          <p className="page-subtitle">Welcome, {dashboard.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setShowCreateCourseModal(true)}>
            Create Course
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Project
          </button>
        </div>
      </div>

      {/* Create Project Modal */}
      <div className="modal-overlay" style={{ display: showCreateModal ? 'flex' : 'none' }} onClick={() => setShowCreateModal(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Create New Project</h2>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleCreateProject}>
            <div className="modal-body">
              {createError && <div className="alert alert-error">{createError}</div>}

              <div className="form-group">
                <label htmlFor="courseId">Course <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select
                  id="courseId"
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleCourseChange}
                  required
                  disabled={courses.length === 0}
                >
                  {courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.code})
                      </option>
                    ))
                  )}
                </select>
                {courses.length === 0 && (
                  <p style={{ marginTop: '8px', color: 'var(--color-danger)', fontSize: '14px' }}>
                    You are not assigned to any courses. Create a course first.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="title">Project Title <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  maxLength={200}
                  placeholder="e.g., E-Commerce Website"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  placeholder="Describe the project objectives and scope..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="requirements">Requirements (optional)</label>
                <textarea
                  id="requirements"
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="List specific requirements, technologies, or deliverables..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="submissionType">Submission Type <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select
                  id="submissionType"
                  name="submissionType"
                  value={formData.submissionType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="LINK">Link (URL only)</option>
                  <option value="FILE">File upload only</option>
                  <option value="LINK_AND_FILE">Link + File</option>
                </select>
                <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                  LINK: URL only | FILE: File upload only | LINK_AND_FILE: Both URL and file required
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="deadline">Deadline <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="deadline"
                  name="deadline"
                  type="datetime-local"
                  value={formData.deadline || defaultDeadline}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={isCreating}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isCreating || courses.length === 0}>
                {isCreating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Create Course Modal */}
      <div className="modal-overlay" style={{ display: showCreateCourseModal ? 'flex' : 'none' }} onClick={() => setShowCreateCourseModal(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Create New Course</h2>
            <button className="modal-close" onClick={() => setShowCreateCourseModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleCreateCourse}>
            <div className="modal-body">
              {courseCreateError && <div className="alert alert-error">{courseCreateError}</div>}

              <div className="form-group">
                <label htmlFor="courseName">Course Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="courseName"
                  name="name"
                  type="text"
                  value={courseFormData.name}
                  onChange={(e) => setCourseFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  maxLength={100}
                  placeholder="e.g., Software Engineering"
                />
              </div>

              <div className="form-group">
                <label htmlFor="courseCode">Course Code <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="courseCode"
                  name="code"
                  type="text"
                  value={courseFormData.code}
                  onChange={(e) => setCourseFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  required
                  maxLength={20}
                  placeholder="e.g., SWE301"
                  style={{ textTransform: 'uppercase' }}
                />
                <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                  Uppercase alphanumeric only (e.g., SWE301, CS101)
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateCourseModal(false)} disabled={isCreatingCourse}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isCreatingCourse}>
                {isCreatingCourse ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit Project Modal */}
      <div className="modal-overlay" style={{ display: showEditModal ? 'flex' : 'none' }} onClick={() => setShowEditModal(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Edit Project</h2>
            <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleEditProject}>
            <div className="modal-body">
              {editError && <div className="alert alert-error">{editError}</div>}

              <div className="form-group">
                <label htmlFor="editCourseId">Course <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select
                  id="editCourseId"
                  name="courseId"
                  value={editFormData.courseId}
                  onChange={handleEditInputChange}
                  required
                  disabled={courses.length === 0}
                >
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editTitle">Project Title <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="editTitle"
                  name="title"
                  type="text"
                  value={editFormData.title}
                  onChange={handleEditInputChange}
                  required
                  maxLength={200}
                  placeholder="e.g., E-Commerce Website"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editDescription">Description</label>
                <textarea
                  id="editDescription"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  rows={4}
                  placeholder="Describe the project objectives and scope..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="editRequirements">Requirements (optional)</label>
                <textarea
                  id="editRequirements"
                  name="requirements"
                  value={editFormData.requirements}
                  onChange={handleEditInputChange}
                  rows={4}
                  placeholder="List specific requirements, technologies, or deliverables..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="editSubmissionType">Submission Type <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select
                  id="editSubmissionType"
                  name="submissionType"
                  value={editFormData.submissionType}
                  onChange={handleEditInputChange}
                  required
                >
                  <option value="LINK">Link (URL only)</option>
                  <option value="FILE">File upload only</option>
                  <option value="LINK_AND_FILE">Link + File</option>
                </select>
                <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                  LINK: URL only | FILE: File upload only | LINK_AND_FILE: Both URL and file required
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="editDeadline">Deadline <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  id="editDeadline"
                  name="deadline"
                  type="datetime-local"
                  value={editFormData.deadline || defaultDeadline}
                  onChange={handleEditInputChange}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={isEditing}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isEditing || courses.length === 0}>
                {isEditing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div className="modal-overlay" style={{ display: showDeleteModal ? 'flex' : 'none' }} onClick={() => setShowDeleteModal(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Delete Project</h2>
            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>&times;</button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete this project? This action cannot be undone.</p>
            <p style={{ color: 'var(--color-danger)', fontWeight: '500' }}>All submissions and grades for this project will be permanently deleted.</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDeleteProject} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </button>
          </div>
        </div>
      </div>

      {dashboard.projects.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-gray-500)' }}>
          <p>No projects assigned to you yet.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowCreateCourseModal(true)}>
              Create Course
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Your First Project
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {dashboard.projects.map((project: LecturerProjectStats) => (
            <div key={project.id} className="card">
              <div style={{ padding: '24px', borderBottom: '1px solid var(--color-gray-200)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600' }}>{project.title}</h2>
                    <p style={{ color: 'var(--color-gray-500)', marginTop: '4px' }}>
                      {project.course} ({project.courseCode}) • Deadline: {formatDate(project.deadline)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to={`/lecturer/projects/${project.id}/submissions`} className="btn btn-primary">
                      View Submissions
                    </Link>
                    <button className="btn btn-secondary" onClick={() => openEditModal(project)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => openDeleteModal(project.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ padding: '24px' }}>
                <div className="stat-grid" style={{ marginBottom: 0 }}>
                  <div className="stat-card" style={{ padding: '16px' }}>
                    <div className="stat-value" style={{ fontSize: '24px' }}>{project.totalStudents}</div>
                    <div className="stat-label">Total Students</div>
                  </div>
                  <div className="stat-card" style={{ padding: '16px' }}>
                    <div className="stat-value" style={{ fontSize: '24px', color: 'var(--color-primary)' }}>{project.submittedCount}</div>
                    <div className="stat-label">Submitted</div>
                  </div>
                  <div className="stat-card" style={{ padding: '16px' }}>
                    <div className="stat-value" style={{ fontSize: '24px', color: 'var(--color-warning)' }}>{project.gradedCount - project.publishedCount}</div>
                    <div className="stat-label">Graded (Draft)</div>
                  </div>
                  <div className="stat-card" style={{ padding: '16px' }}>
                    <div className="stat-value" style={{ fontSize: '24px', color: 'var(--color-success)' }}>{project.publishedCount}</div>
                    <div className="stat-label">Published</div>
                  </div>
                  <div className="stat-card" style={{ padding: '16px' }}>
                    <div className="stat-value" style={{ fontSize: '24px', color: 'var(--color-gray-500)' }}>{project.pendingCount}</div>
                    <div className="stat-label">Pending</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}