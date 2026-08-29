export interface User {
  id: string
  name: string
  email: string
  role: 'STUDENT' | 'LECTURER'
}

export interface Course {
  id: string
  name: string
  code: string
}

export interface Project {
  id: string
  courseId: string
  course?: Course
  title: string
  description: string
  requirements?: string
  deadline: string
  submissionType: 'LINK' | 'FILE' | 'LINK_AND_FILE'
}

export interface ProjectWithCourse extends Omit<Project, 'course'> {
  course: string
  courseCode: string
}

export interface Submission {
  id: string
  projectId: string
  studentId: string
  projectUrl?: string
  submittedAt?: string
  score?: number
  feedback?: string
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED' | 'PUBLISHED'
  gradedAt?: string
  student?: User
  project?: ProjectWithCourse
  files?: SubmissionFile[]
}

export interface SubmissionFile {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  createdAt: string
}

export interface StudentDashboard {
  name: string
  totalProjects: number
  submittedProjects: number
  gradedProjects: number
  publishedProjects: number
  pendingProjects: number
  projects: StudentProject[]
}

export interface StudentProject {
  id: string
  course: string
  courseCode: string
  title: string
  deadline: string
  submissionType: 'LINK' | 'FILE' | 'LINK_AND_FILE'
  submissionStatus: string
  score?: number | null
  grade?: string | null
  submittedAt?: string | null
}

export interface LecturerDashboard {
  name: string
  projects: LecturerProjectStats[]
}

export interface LecturerProjectStats {
  id: string
  course: string
  courseCode: string
  courseId: string
  title: string
  deadline: string
  submissionType: 'LINK' | 'FILE' | 'LINK_AND_FILE'
  totalStudents: number
  submittedCount: number
  gradedCount: number
  publishedCount: number
  pendingCount: number
}

export interface ProjectSubmissions {
  project: {
    id: string
    title: string
    course: string
    courseCode: string
    deadline: string
    submissionType?: 'LINK' | 'FILE' | 'LINK_AND_FILE'
  }
  submissions: SubmissionListItem[]
}

export interface SubmissionListItem {
  id: string
  student: User
  status: string
  submittedAt?: string
  score?: number
  grade?: string
  gradedAt?: string
  files?: { id: string; fileName: string; mimeType: string; fileSize: number; createdAt: string }[]
}

export interface GradeSubmissionData {
  id: string
  student: User
  project: {
    id: string
    title: string
    course: string
    courseCode: string
  }
  projectUrl?: string
  submittedAt?: string
  score?: number
  feedback?: string
  status: string
  grade?: string
  files?: { id: string; fileName: string; mimeType: string; fileSize: number; createdAt: string }[]
}

export interface GradeSubmissionResponse {
  id: string
  score: number
  feedback?: string
  status: string
  grade: string
  gradedAt: string
}

export interface ApiError {
  error: string
  details?: any
}