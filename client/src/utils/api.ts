const API_BASE = '/api'

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isFormData = options.body instanceof FormData
    const headers: HeadersInit = {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }

  async getMe() {
    return this.request<User>('/auth/me')
  }

  async getStudentDashboard() {
    return this.request<StudentDashboard>('/student/dashboard')
  }

  async getStudentProject(projectId: string) {
    return this.request<Project & { submission: Submission | null }>(`/student/projects/${projectId}`)
  }

  async submitProject(projectId: string, data: { projectUrl?: string; files?: File[] }) {
    const formData = new FormData()
    if (data.projectUrl) {
      formData.append('projectUrl', data.projectUrl)
    }
    if (data.files) {
      data.files.forEach(file => formData.append('files', file))
    }
    return this.request<Submission>(`/student/projects/${projectId}/submit`, {
      method: 'POST',
      body: formData
    })
  }

  async getLecturerDashboard() {
    return this.request<LecturerDashboard>('/lecturer/dashboard')
  }

  async getLecturerCourses() {
    return this.request<Array<{ id: string; name: string; code: string }>>('/lecturer/courses')
  }

  async getProjectSubmissions(projectId: string) {
    return this.request<ProjectSubmissions>(`/lecturer/projects/${projectId}/submissions`)
  }

  async getSubmission(submissionId: string) {
    return this.request<Submission>(`/lecturer/submissions/${submissionId}`)
  }

  async gradeSubmission(submissionId: string, score: number, feedback?: string) {
    return this.request<GradeSubmissionResponse>(`/lecturer/submissions/${submissionId}/grade`, {
      method: 'PUT',
      body: JSON.stringify({ score, feedback })
    })
  }

  async publishGrade(submissionId: string, publish: boolean) {
    return this.request<{ id: string; status: string; score?: number; grade?: string }>(
      `/lecturer/submissions/${submissionId}/publish`,
      { method: 'PUT', body: JSON.stringify({ publish }) }
    )
  }

  async createProject(data: { courseId: string; title: string; description: string; requirements?: string; deadline: string; submissionType?: 'LINK' | 'FILE' | 'LINK_AND_FILE' }) {
    return this.request<Project>('/lecturer/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async createCourse(data: { name: string; code: string }) {
    return this.request<{ id: string; name: string; code: string }>('/lecturer/courses', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateProject(projectId: string, data: { title?: string; description?: string; requirements?: string; deadline?: string; courseId?: string; submissionType?: 'LINK' | 'FILE' | 'LINK_AND_FILE' }) {
    return this.request<Project>(`/lecturer/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteProject(projectId: string) {
    return this.request<void>(`/lecturer/projects/${projectId}`, {
      method: 'DELETE'
    })
  }

  async downloadFile(fileId: string) {
    const response = await fetch(`${API_BASE}/lecturer/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    return response.blob()
  }

  async downloadStudentFile(fileId: string) {
    const response = await fetch(`${API_BASE}/student/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    return response.blob()
  }
}

export const api = new ApiClient()

import type { User, StudentDashboard, Project, Submission, LecturerDashboard, ProjectSubmissions, GradeSubmissionResponse } from '../types'