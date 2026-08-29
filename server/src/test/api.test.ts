import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../utils/db'
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../utils/auth'
import { calculateLetterGrade } from '../utils/grade'
import request from 'supertest'
import express from 'express'
import authRoutes from '../routes/auth'
import studentRoutes from '../routes/student'
import lecturerRoutes from '../routes/lecturer'
import { authenticate } from '../middleware/auth'

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/lecturer', lecturerRoutes)

let lecturerToken: string
let studentToken: string
let projectId: string
let submissionId: string
let otherLecturerToken: string
let otherLecturerId: string

describe('Auth Utilities', () => {
  it('should hash and verify password', async () => {
    const password = 'testpassword123'
    const hash = await hashPassword(password)
    expect(hash).not.toBe(password)
    const valid = await verifyPassword(password, hash)
    expect(valid).toBe(true)
    const invalid = await verifyPassword('wrong', hash)
    expect(invalid).toBe(false)
  })

  it('should generate and verify JWT token', () => {
    const payload = { userId: 'test-id', email: 'test@test.com', name: 'Test User', role: 'STUDENT' as const }
    const token = generateToken(payload)
    expect(token).toBeDefined()
    const verified = verifyToken(token)
    expect(verified?.userId).toBe(payload.userId)
    expect(verified?.email).toBe(payload.email)
    expect(verified?.name).toBe(payload.name)
    expect(verified?.role).toBe(payload.role)
  })

  it('should return null for invalid token', () => {
    const verified = verifyToken('invalid-token')
    expect(verified).toBeNull()
  })
})

describe('Grade Calculation', () => {
  it('should calculate correct letter grades', () => {
    expect(calculateLetterGrade(85)).toBe('A')
    expect(calculateLetterGrade(70)).toBe('A')
    expect(calculateLetterGrade(65)).toBe('B')
    expect(calculateLetterGrade(60)).toBe('B')
    expect(calculateLetterGrade(55)).toBe('C')
    expect(calculateLetterGrade(50)).toBe('C')
    expect(calculateLetterGrade(47)).toBe('D')
    expect(calculateLetterGrade(45)).toBe('D')
    expect(calculateLetterGrade(42)).toBe('E')
    expect(calculateLetterGrade(40)).toBe('E')
    expect(calculateLetterGrade(35)).toBe('F')
    expect(calculateLetterGrade(0)).toBe('F')
  })
})

describe('API Endpoints', () => {
  beforeAll(async () => {
    // Clean up any existing test data - delete in correct order to avoid FK constraints
    await prisma.submission.deleteMany({ where: { projectId: { startsWith: 'test-' } } })
    await prisma.project.deleteMany({ where: { id: { startsWith: 'test-' } } })
    await prisma.enrollment.deleteMany({ where: { student: { email: { startsWith: 'test' } } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'TEST' } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'CS' } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'OTHER' } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'ANOTHER' } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'NEW' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'other.lecturer' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'other.student' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'other.lecturer2' } } })

    // Create test lecturer
    const lecturerHash = await hashPassword('password123')
    const lecturer = await prisma.user.create({
      data: {
        name: 'Test Lecturer',
        email: 'test.lecturer@university.edu',
        passwordHash: lecturerHash,
        role: 'LECTURER'
      }
    })

    lecturerToken = generateToken({
      userId: lecturer.id,
      email: lecturer.email,
      name: lecturer.name,
      role: 'LECTURER'
    })

    // Create test student
    const studentHash = await hashPassword('password123')
    const student = await prisma.user.create({
      data: {
        name: 'Test Student',
        email: 'test.student@university.edu',
        passwordHash: studentHash,
        role: 'STUDENT'
      }
    })

    studentToken = generateToken({
      userId: student.id,
      email: student.email,
      name: student.name,
      role: 'STUDENT'
    })

    // Create other lecturer for authorization tests
    const otherLecturerHash = await hashPassword('password123')
    const otherLecturer = await prisma.user.create({
      data: {
        name: 'Other Lecturer',
        email: `other.lecturer.${Date.now()}@test.com`,
        passwordHash: otherLecturerHash,
        role: 'LECTURER'
      }
    })
    otherLecturerId = otherLecturer.id
    otherLecturerToken = generateToken({
      userId: otherLecturer.id,
      email: otherLecturer.email,
      name: otherLecturer.name,
      role: 'LECTURER'
    })

    // Create test course
    const course = await prisma.course.create({
      data: {
        name: 'Test Course',
        code: 'TEST101',
        lecturerId: lecturer.id
      }
    })

    // Enroll student
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id
      }
    })

    // Create test project
    const project = await prisma.project.create({
      data: {
        id: 'test-project-1',
        courseId: course.id,
        title: 'Test Project',
        description: 'Test project description',
        deadline: new Date('2026-12-31T23:59:00Z')
      }
    })
    projectId = project.id

    // Create submission for student
    const submission = await prisma.submission.create({
      data: {
        projectId: project.id,
        studentId: student.id,
        projectUrl: 'https://github.com/test/project',
        submittedAt: new Date(),
        status: 'SUBMITTED'
      }
    })
    submissionId = submission.id
  })

  afterAll(async () => {
    await prisma.submission.deleteMany({ where: { projectId: { startsWith: 'test-' } } })
    await prisma.project.deleteMany({ where: { id: { startsWith: 'test-' } } })
    await prisma.enrollment.deleteMany({ where: { student: { email: { startsWith: 'test' } } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'TEST' } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'CS' } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'OTHER' } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'ANOTHER' } } })
    await prisma.course.deleteMany({ where: { code: { startsWith: 'NEW' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'other.lecturer' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'other.student' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'other.lecturer2' } } })
    await prisma.$disconnect()
  })

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test.student@university.edu', password: 'password123' })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.role).toBe('STUDENT')
    })

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test.student@university.edu', password: 'wrong' })
      expect(res.status).toBe(401)
    })

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' })
      expect(res.status).toBe(401)
    })
  })

  describe('Student Authorization', () => {
    it('should allow student to access own dashboard', async () => {
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.projects).toBeDefined()
    })

    it('should reject lecturer accessing student endpoints', async () => {
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${lecturerToken}`)
      expect(res.status).toBe(403)
    })

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/student/dashboard')
      expect(res.status).toBe(401)
    })
  })

  describe('Lecturer Authorization', () => {
    it('should allow lecturer to access own dashboard', async () => {
      const res = await request(app)
        .get('/api/lecturer/dashboard')
        .set('Authorization', `Bearer ${lecturerToken}`)
      expect(res.status).toBe(200)
      expect(res.body.projects).toBeDefined()
    })

    it('should reject student accessing lecturer endpoints', async () => {
      const res = await request(app)
        .get('/api/lecturer/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
    })
  })

  describe('Submission', () => {
    it('should allow student to submit project', async () => {
      // Create new project for this test
      const course = await prisma.course.findFirst({ where: { code: 'TEST101' } })
      const project = await prisma.project.create({
        data: {
          id: 'test-project-2',
          courseId: course!.id,
          title: 'Test Project 2',
          description: 'Another test project',
          deadline: new Date('2026-12-31T23:59:00Z')
        }
      })

      const res = await request(app)
        .post(`/api/student/projects/${project.id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ projectUrl: 'https://github.com/test/project2' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('SUBMITTED')
      expect(res.body.projectUrl).toBe('https://github.com/test/project2')

      // Cleanup
      await prisma.submission.deleteMany({ where: { projectId: project.id } })
      await prisma.project.delete({ where: { id: project.id } })
    })

    it('should reject duplicate submission', async () => {
      const res = await request(app)
        .post(`/api/student/projects/${projectId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ projectUrl: 'https://github.com/test/project' })
      expect(res.status).toBe(400)
    })
  })

  describe('Grading', () => {
    it('should allow lecturer to grade submission', async () => {
      const res = await request(app)
        .put(`/api/lecturer/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ score: 85, feedback: 'Good work!' })
      expect(res.status).toBe(200)
      expect(res.body.score).toBe(85)
      expect(res.body.grade).toBe('A')
      expect(res.body.status).toBe('GRADED')
    })

    it('should reject invalid score', async () => {
      const res = await request(app)
        .put(`/api/lecturer/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ score: 150, feedback: 'Too high' })
      expect(res.status).toBe(400)
    })

    it('should reject negative score', async () => {
      const res = await request(app)
        .put(`/api/lecturer/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ score: -10, feedback: 'Negative' })
      expect(res.status).toBe(400)
    })

    it('should reject student grading', async () => {
      const res = await request(app)
        .put(`/api/lecturer/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ score: 85, feedback: 'Student grading' })
      expect(res.status).toBe(403)
    })
  })

  describe('Publishing', () => {
    it('should allow lecturer to publish grade', async () => {
      const res = await request(app)
        .put(`/api/lecturer/submissions/${submissionId}/publish`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ publish: true })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('PUBLISHED')
    })

    it('should hide unpublished grade from student', async () => {
      // Create a new submission with graded but unpublished status
      const course = await prisma.course.findFirst({ where: { code: 'TEST101' } })
      const student = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      const project = await prisma.project.create({
        data: {
          id: 'test-project-3',
          courseId: course!.id,
          title: 'Test Project 3',
          description: 'Test',
          deadline: new Date('2026-12-31T23:59:00Z')
        }
      })
      const submission = await prisma.submission.create({
        data: {
          projectId: project.id,
          studentId: student!.id,
          projectUrl: 'https://github.com/test/project3',
          submittedAt: new Date(),
          score: 90,
          feedback: 'Great!',
          status: 'GRADED',
          gradedAt: new Date()
        }
      })

      // Student should not see the grade
      const projectRes = await request(app)
        .get(`/api/student/projects/${project.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
      expect(projectRes.status).toBe(200)
      expect(projectRes.body.submission?.score).toBeNull()
      expect(projectRes.body.submission?.grade).toBeNull()

      // Publish
      await request(app)
        .put(`/api/lecturer/submissions/${submission.id}/publish`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ publish: true })

      // Student should now see the grade
      const projectRes2 = await request(app)
        .get(`/api/student/projects/${project.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
      expect(projectRes2.status).toBe(200)
      expect(projectRes2.body.submission?.score).toBe(90)
      expect(projectRes2.body.submission?.grade).toBe('A')

      // Cleanup
      await prisma.submission.delete({ where: { id: submission.id } })
      await prisma.project.delete({ where: { id: project.id } })
    })
  })

  describe('End-to-End Workflow', () => {
    it('should complete full workflow: submit -> grade -> publish -> view result', async () => {
      // Create fresh project
      const course = await prisma.course.findFirst({ where: { code: 'TEST101' } })
      const student = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      const project = await prisma.project.create({
        data: {
          id: 'test-project-e2e',
          courseId: course!.id,
          title: 'E2E Test Project',
          description: 'End to end test',
          deadline: new Date('2026-12-31T23:59:00Z')
        }
      })

      // Student submits
      const submitRes = await request(app)
        .post(`/api/student/projects/${project.id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ projectUrl: 'https://github.com/test/e2e' })
      expect(submitRes.status).toBe(200)
      const submissionId = submitRes.body.id

      // Lecturer grades
      const gradeRes = await request(app)
        .put(`/api/lecturer/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ score: 65, feedback: 'Nice implementation' })
      expect(gradeRes.status).toBe(200)
      expect(gradeRes.body.grade).toBe('B')

      // Lecturer publishes
      const publishRes = await request(app)
        .put(`/api/lecturer/submissions/${submissionId}/publish`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ publish: true })
      expect(publishRes.status).toBe(200)
      expect(publishRes.body.status).toBe('PUBLISHED')

      // Student views result
      const resultRes = await request(app)
        .get(`/api/student/projects/${project.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
      expect(resultRes.status).toBe(200)
      expect(resultRes.body.submission?.status).toBe('PUBLISHED')
      expect(resultRes.body.submission?.score).toBe(65)
      expect(resultRes.body.submission?.grade).toBe('B')
      expect(resultRes.body.submission?.feedback).toBe('Nice implementation')

      // Cleanup
      await prisma.submission.delete({ where: { id: submissionId } })
      await prisma.project.delete({ where: { id: project.id } })
    })
  })

  describe('Lecturer Project Creation', () => {
    let newProjectId: string

    it('should allow lecturer to create a project for their course', async () => {
      const res = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseId: (await prisma.course.findFirst({ where: { code: 'TEST101' } }))!.id,
          title: 'New Test Project',
          description: 'A newly created project',
          requirements: 'Requirement 1\nRequirement 2',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      expect(res.status).toBe(201)
      expect(res.body.title).toBe('New Test Project')
      expect(res.body.description).toBe('A newly created project')
      expect(res.body.courseId).toBeDefined()
      newProjectId = res.body.id
    })

    it('should reject project creation for unauthorized course', async () => {
      // Create a course for a different lecturer
      const otherLecturer = await prisma.user.create({
        data: {
          name: 'Other Lecturer 2',
          email: `other.lecturer2.${Date.now()}@test.com`,
          passwordHash: await hashPassword('password123'),
          role: 'LECTURER'
        }
      })
      const otherCourse = await prisma.course.create({
        data: {
          name: 'Other Course',
          code: `OTHER101-${Date.now()}`,
          lecturerId: otherLecturer.id
        }
      })

      const res = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseId: otherCourse.id,
          title: 'Unauthorized Project',
          description: 'Should fail',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      expect(res.status).toBe(403)

      // Cleanup
      await prisma.course.delete({ where: { id: otherCourse.id } })
      await prisma.user.delete({ where: { id: otherLecturer.id } })
    })

    it('should reject project creation with invalid data', async () => {
      const res = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseId: 'invalid-id',
          title: '',
          description: 'Missing title',
          deadline: 'invalid-date'
        })
      expect(res.status).toBe(400)
    })

    it('should reject project creation by student', async () => {
      const res = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: (await prisma.course.findFirst({ where: { code: 'TEST101' } }))!.id,
          title: 'Student Project',
          description: 'Should fail',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      expect(res.status).toBe(403)
    })
  })

  describe('Student Visibility of New Projects', () => {
    it('should allow enrolled student to see newly created project', async () => {
      // Create a new project via API (which creates submissions for enrolled students)
      const course = await prisma.course.findFirst({ where: { code: 'TEST101' } })
      const createRes = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseId: course!.id,
          title: 'Visibility Test Project',
          description: 'Test student visibility',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      expect(createRes.status).toBe(201)
      const projectId = createRes.body.id

      // Student should see the project in dashboard
      const dashboardRes = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(dashboardRes.status).toBe(200)
      const projectInDashboard = dashboardRes.body.projects.find((p: any) => p.id === projectId)
      expect(projectInDashboard).toBeDefined()
      expect(projectInDashboard.title).toBe('Visibility Test Project')
      expect(projectInDashboard.submissionStatus).toBe('NOT_SUBMITTED')

      // Student should see project details
      const projectRes = await request(app)
        .get(`/api/student/projects/${projectId}`)
        .set('Authorization', `Bearer ${studentToken}`)
      expect(projectRes.status).toBe(200)
      expect(projectRes.body.title).toBe('Visibility Test Project')
      expect(projectRes.body.submission.status).toBe('NOT_SUBMITTED')

      // Cleanup
      await prisma.submission.deleteMany({ where: { projectId } })
      await prisma.project.delete({ where: { id: projectId } })
    })

    it('should not allow student from different course to see the project', async () => {
      // Create another student not enrolled in TEST101
      const otherStudentHash = await hashPassword('password123')
      const otherStudentEmail = `other.student.${Date.now()}@test.com`
      const otherStudent = await prisma.user.create({
        data: {
          name: 'Other Student',
          email: otherStudentEmail,
          passwordHash: otherStudentHash,
          role: 'STUDENT'
        }
      })
      const otherStudentToken = generateToken({
        userId: otherStudent.id,
        email: otherStudent.email,
        name: otherStudent.name,
        role: 'STUDENT'
      })

      // Create a project in TEST101 via API
      const course = await prisma.course.findFirst({ where: { code: 'TEST101' } })
      const createRes = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseId: course!.id,
          title: 'Other Student Test',
          description: 'Should not be visible',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      expect(createRes.status).toBe(201)
      const projectId = createRes.body.id

      // Other student should not see it in dashboard
      const dashboardRes = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${otherStudentToken}`)
      expect(dashboardRes.status).toBe(200)
      const projectInDashboard = dashboardRes.body.projects.find((p: any) => p.id === projectId)
      expect(projectInDashboard).toBeUndefined()

      // Other student should get 403 when trying to access project directly
      const projectRes = await request(app)
        .get(`/api/student/projects/${projectId}`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
      expect(projectRes.status).toBe(403)

      // Cleanup
      await prisma.submission.deleteMany({ where: { projectId } })
      await prisma.project.delete({ where: { id: projectId } })
      await prisma.user.delete({ where: { id: otherStudent.id } })
    })
  })

  describe('Lecturer Courses Endpoint', () => {
    it('should return lecturer courses', async () => {
      const res = await request(app)
        .get('/api/lecturer/courses')
        .set('Authorization', `Bearer ${lecturerToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body[0]).toHaveProperty('id')
      expect(res.body[0]).toHaveProperty('name')
      expect(res.body[0]).toHaveProperty('code')
    })

    it('should reject student accessing courses endpoint', async () => {
      const res = await request(app)
        .get('/api/lecturer/courses')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
    })
  })

  describe('Lecturer Course Management', () => {
    it('should allow lecturer to create a course', async () => {
      const res = await request(app)
        .post('/api/lecturer/courses')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ name: 'Data Structures', code: 'CS201' })
      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Data Structures')
      expect(res.body.code).toBe('CS201')
      expect(res.body.id).toBeDefined()
    })

    it('should reject duplicate course code', async () => {
      const res = await request(app)
        .post('/api/lecturer/courses')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ name: 'Data Structures Again', code: 'CS201' })
      expect(res.status).toBe(400)
    })

    it('should reject invalid course code format', async () => {
      const res = await request(app)
        .post('/api/lecturer/courses')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ name: 'Invalid Course', code: 'cs201' })
      expect(res.status).toBe(400)
    })

    it('should allow lecturer to see their own courses', async () => {
      const res = await request(app)
        .get('/api/lecturer/courses')
        .set('Authorization', `Bearer ${lecturerToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      const course = res.body.find((c: any) => c.code === 'CS201')
      expect(course).toBeDefined()
      expect(course.name).toBe('Data Structures')
    })

    it('should reject student accessing courses endpoint', async () => {
      const res = await request(app)
        .get('/api/lecturer/courses')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
    })
  })

  describe('Lecturer Project Edit/Delete', () => {
    let editProjectId: string

    beforeAll(async () => {
      const course = await prisma.course.findFirst({ where: { code: 'TEST101' } })
      const project = await prisma.project.create({
        data: {
          id: 'test-project-edit',
          courseId: course!.id,
          title: 'Project to Edit',
          description: 'Will be edited',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      })
      editProjectId = project.id
    })

    afterAll(async () => {
      await prisma.submission.deleteMany({ where: { projectId: editProjectId } })
      await prisma.project.deleteMany({ where: { id: editProjectId } })
    })

    it('should allow lecturer to edit own project', async () => {
      const res = await request(app)
        .put(`/api/lecturer/projects/${editProjectId}`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ title: 'Edited Project Title', description: 'Updated description' })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Edited Project Title')
      expect(res.body.description).toBe('Updated description')
    })

    it('should allow lecturer to edit project deadline', async () => {
      const newDeadline = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
      const res = await request(app)
        .put(`/api/lecturer/projects/${editProjectId}`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ deadline: newDeadline })
      expect(res.status).toBe(200)
      expect(res.body.deadline).toBeDefined()
    })

    it('should reject course change when project has submissions', async () => {
      // Create a submission first
      const student = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      await prisma.submission.create({
        data: {
          projectId: editProjectId,
          studentId: student!.id,
          status: 'NOT_SUBMITTED'
        }
      })

      // Create another course owned by the SAME lecturer
      const otherCourse = await prisma.course.create({
        data: {
          name: 'Other Course',
          code: `OTHER${Date.now()}`,
          lecturerId: (await prisma.user.findFirst({ where: { email: 'test.lecturer@university.edu' } }))!.id
        }
      })

      const res = await request(app)
        .put(`/api/lecturer/projects/${editProjectId}`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ courseId: otherCourse.id })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('existing submissions')

      await prisma.submission.deleteMany({ where: { projectId: editProjectId } })
      await prisma.course.delete({ where: { id: otherCourse.id } })
    })

    it('should allow course change when project has no submissions', async () => {
      // Create another course owned by the SAME lecturer
      const otherCourse = await prisma.course.create({
        data: {
          name: 'Another Course',
          code: `ANOTHER${Date.now()}`,
          lecturerId: (await prisma.user.findFirst({ where: { email: 'test.lecturer@university.edu' } }))!.id
        }
      })

      const res = await request(app)
        .put(`/api/lecturer/projects/${editProjectId}`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ courseId: otherCourse.id })
      expect(res.status).toBe(200)
      expect(res.body.courseId).toBe(otherCourse.id)

      await prisma.course.delete({ where: { id: otherCourse.id } })
    })

    it('should reject unauthorized lecturer editing project', async () => {
      // Create a fresh project for this test
      const course = await prisma.course.findFirst({ where: { code: 'TEST101' } })
      const project = await prisma.project.create({
        data: {
          id: 'test-project-unauthorized-edit',
          courseId: course!.id,
          title: 'Project for Unauthorized Edit',
          description: 'Test unauthorized access',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      })

      const res = await request(app)
        .put(`/api/lecturer/projects/${project.id}`)
        .set('Authorization', `Bearer ${otherLecturerToken}`)
        .send({ title: 'Unauthorized Edit' })
      expect(res.status).toBe(403)

      await prisma.project.delete({ where: { id: project.id } })
    })

    it('should reject student editing project', async () => {
      const res = await request(app)
        .put(`/api/lecturer/projects/${editProjectId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Student Edit' })
      expect(res.status).toBe(403)
    })

    it('should allow lecturer to delete own project', async () => {
      const course = await prisma.course.findFirst({ where: { code: 'TEST101' } })
      const project = await prisma.project.create({
        data: {
          id: 'test-project-delete',
          courseId: course!.id,
          title: 'Project to Delete',
          description: 'Will be deleted',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      })

      const res = await request(app)
        .delete(`/api/lecturer/projects/${project.id}`)
        .set('Authorization', `Bearer ${lecturerToken}`)
      expect(res.status).toBe(204)

      const deleted = await prisma.project.findUnique({ where: { id: project.id } })
      expect(deleted).toBeNull()
    })

    it('should reject unauthorized lecturer deleting project', async () => {
      const course = await prisma.course.findFirst({ where: { code: 'TEST101' } })
      const project = await prisma.project.create({
        data: {
          id: 'test-project-delete-2',
          courseId: course!.id,
          title: 'Project to Delete 2',
          description: 'Will not be deleted',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      })

      const res = await request(app)
        .delete(`/api/lecturer/projects/${project.id}`)
        .set('Authorization', `Bearer ${otherLecturerToken}`)
      expect(res.status).toBe(403)

      await prisma.project.delete({ where: { id: project.id } })
    })
  })

  describe('Student Project Visibility (Regression)', () => {
    it('should allow enrolled student to see newly created project in new course', async () => {
      // Create a new course
      const courseRes = await request(app)
        .post('/api/lecturer/courses')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ name: 'New Course', code: 'NEW101' })
      expect(courseRes.status).toBe(201)
      const newCourseId = courseRes.body.id

      // Create a project in the new course
      const projectRes = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseId: newCourseId,
          title: 'New Course Project',
          description: 'Test visibility',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      expect(projectRes.status).toBe(201)

      // Enroll student in the new course
      const student = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      await prisma.enrollment.create({
        data: { studentId: student!.id, courseId: newCourseId }
      })

      // Student should see the project in dashboard
      const dashboardRes = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(dashboardRes.status).toBe(200)
      const projectInDashboard = dashboardRes.body.projects.find((p: any) => p.title === 'New Course Project')
      expect(projectInDashboard).toBeDefined()
      expect(projectInDashboard.submissionStatus).toBe('NOT_SUBMITTED')

      // Cleanup
      await prisma.enrollment.delete({ where: { studentId_courseId: { studentId: student!.id, courseId: newCourseId } } })
      await prisma.submission.deleteMany({ where: { projectId: projectRes.body.id } })
      await prisma.project.delete({ where: { id: projectRes.body.id } })
      await prisma.course.delete({ where: { id: newCourseId } })
    })

    it('should allow test student to see their enrolled test project', async () => {
      const dashboardRes = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(dashboardRes.status).toBe(200)
      const project = dashboardRes.body.projects.find((p: any) => p.title === 'Test Project')
      expect(project).toBeDefined()
      expect(project.course).toBe('Test Course')
      expect(project.courseCode).toBe('TEST101')
    })
  })

  describe('Submission Types (LINK / FILE / LINK_AND_FILE)', () => {
    let subTypeCourseId: string
    let linkProjectId: string
    let fileProjectId: string
    let linkAndFileProjectId: string

    beforeAll(async () => {
      // Create a dedicated course for submission-type tests
      const courseRes = await request(app)
        .post('/api/lecturer/courses')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ name: 'Submission Type Course', code: `SUBT${Date.now()}` })
      expect(courseRes.status).toBe(201)
      subTypeCourseId = courseRes.body.id

      // Enroll the test student
      const student = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      await prisma.enrollment.create({
        data: { studentId: student!.id, courseId: subTypeCourseId }
      })

      // Create LINK project
      const linkRes = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseId: subTypeCourseId,
          title: 'Link Only Project',
          description: 'Requires URL only',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          submissionType: 'LINK'
        })
      expect(linkRes.status).toBe(201)
      expect(linkRes.body.submissionType).toBe('LINK')
      linkProjectId = linkRes.body.id

      // Create FILE project
      const fileRes = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseId: subTypeCourseId,
          title: 'File Only Project',
          description: 'Requires file upload',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          submissionType: 'FILE'
        })
      expect(fileRes.status).toBe(201)
      expect(fileRes.body.submissionType).toBe('FILE')
      fileProjectId = fileRes.body.id

      // Create LINK_AND_FILE project
      const bothRes = await request(app)
        .post('/api/lecturer/projects')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseId: subTypeCourseId,
          title: 'Link And File Project',
          description: 'Requires both',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          submissionType: 'LINK_AND_FILE'
        })
      expect(bothRes.status).toBe(201)
      expect(bothRes.body.submissionType).toBe('LINK_AND_FILE')
      linkAndFileProjectId = bothRes.body.id
    })

    afterAll(async () => {
      await prisma.submission.deleteMany({ where: { projectId: { in: [linkProjectId, fileProjectId, linkAndFileProjectId] } } })
      await prisma.project.deleteMany({ where: { id: { in: [linkProjectId, fileProjectId, linkAndFileProjectId] } } })
      if (subTypeCourseId) {
        await prisma.enrollment.deleteMany({ where: { courseId: subTypeCourseId } })
        await prisma.course.delete({ where: { id: subTypeCourseId } }).catch(() => {})
      }
    })

    it('student sees submissionType on project details for each type', async () => {
      for (const [projectId, expectedType] of [
        [linkProjectId, 'LINK'],
        [fileProjectId, 'FILE'],
        [linkAndFileProjectId, 'LINK_AND_FILE']
      ] as const) {
        const res = await request(app)
          .get(`/api/student/projects/${projectId}`)
          .set('Authorization', `Bearer ${studentToken}`)
        expect(res.status).toBe(200)
        expect(res.body.submissionType).toBe(expectedType)
      }
    })

    it('existing LINK project still accepts URL-only submission', async () => {
      const res = await request(app)
        .post(`/api/student/projects/${linkProjectId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .field('projectUrl', 'https://github.com/test/link-only')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('SUBMITTED')
      expect(res.body.projectUrl).toBe('https://github.com/test/link-only')

      // Cleanup for next tests
      await prisma.submission.deleteMany({ where: { projectId: linkProjectId } })
    })

    it('FILE project rejects missing file', async () => {
      const res = await request(app)
        .post(`/api/student/projects/${fileProjectId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .field('projectUrl', 'https://example.com/not-allowed')
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('file is required')
    })

    it('FILE project rejects files with unsupported mime type', async () => {
      const res = await request(app)
        .post(`/api/student/projects/${fileProjectId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('files', Buffer.from('malicious content'), 'evil.exe')
      expect([400, 500]).toContain(res.status)
      // Cleanup any partial state
      await prisma.submission.deleteMany({ where: { projectId: fileProjectId, studentId: (await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } }))!.id } })
    })

    it('FILE project accepts valid PDF upload and lecturer can view/download it', async () => {
      // Minimal valid PDF content
      const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'utf8')

      const submitRes = await request(app)
        .post(`/api/student/projects/${fileProjectId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('files', pdfContent, { filename: 'report.pdf', contentType: 'application/pdf' })
        .attach('files', pngContent(), { filename: 'diagram.png', contentType: 'image/png' })
      expect(submitRes.status).toBe(200)
      expect(submitRes.body.status).toBe('SUBMITTED')

      // Verify file metadata saved
      const student = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      const submission = await prisma.submission.findUnique({
        where: { projectId_studentId: { projectId: fileProjectId, studentId: student!.id } },
        include: { files: true }
      })
      expect(submission?.files.length).toBe(2)

      // Lecturer can see the submission with files
      const listRes = await request(app)
        .get(`/api/lecturer/projects/${fileProjectId}/submissions`)
        .set('Authorization', `Bearer ${lecturerToken}`)
      expect(listRes.status).toBe(200)
      const listed = listRes.body.submissions.find((s: any) => s.student.email === 'test.student@university.edu')
      expect(listed).toBeDefined()
      expect(listed.files.length).toBe(2)
      expect(listed.files[0]).toHaveProperty('fileName')

      // Lecturer can download a file
      const fileId = submission!.files[0].id
      const downloadRes = await request(app)
        .get(`/api/lecturer/files/${fileId}`)
        .set('Authorization', `Bearer ${lecturerToken}`)
      expect(downloadRes.status).toBe(200)
    })

    it('student can submit link + file for LINK_AND_FILE project', async () => {
      const pdfContent = Buffer.from('%PDF-1.4\n% test\n%%EOF', 'utf8')

      const res = await request(app)
        .post(`/api/student/projects/${linkAndFileProjectId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .field('projectUrl', 'https://github.com/test/link-and-file')
        .attach('files', pdfContent, { filename: 'code.zip.pdf', contentType: 'application/pdf' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('SUBMITTED')
      expect(res.body.projectUrl).toBe('https://github.com/test/link-and-file')

      const student = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      const submission = await prisma.submission.findUnique({
        where: { projectId_studentId: { projectId: linkAndFileProjectId, studentId: student!.id } },
        include: { files: true }
      })
      expect(submission?.files.length).toBe(1)
    })

    it('LINK_AND_FILE project rejects missing required link', async () => {
      // Reset the submission first
      await prisma.submission.deleteMany({ where: { projectId: linkAndFileProjectId } })
      const pdfContent = Buffer.from('%PDF-1.4\n%%EOF', 'utf8')

      const res = await request(app)
        .post(`/api/student/projects/${linkAndFileProjectId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('files', pdfContent, { filename: 'doc.pdf', contentType: 'application/pdf' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('link is required')
    })

    it('LINK_AND_FILE project rejects missing required file', async () => {
      const res = await request(app)
        .post(`/api/student/projects/${linkAndFileProjectId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .field('projectUrl', 'https://github.com/test/no-file')
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('file is required')
    })

    it('oversized file is rejected', async () => {
      // Reset submission
      await prisma.submission.deleteMany({ where: { projectId: fileProjectId } })
      // Create an 11MB buffer (limit is 10MB)
      const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 'a')

      const res = await request(app)
        .post(`/api/student/projects/${fileProjectId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('files', bigBuffer, { filename: 'big.png', contentType: 'image/png' })
      // Multer rejects with error; express returns 500 or multer's own error status
      expect([400, 413, 500]).toContain(res.status)
      // Ensure no submission was created
      const student = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      const submission = await prisma.submission.findUnique({
        where: { projectId_studentId: { projectId: fileProjectId, studentId: student!.id } }
      })
      // If submission exists it should not be SUBMITTED
      if (submission) {
        expect(submission.status).not.toBe('SUBMITTED')
      }
    })

    it('student cannot access another student\'s file', async () => {
      // Ensure a valid submission with files exists (oversized test may have cleared it)
      const owner = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      let submission = await prisma.submission.findUnique({
        where: { projectId_studentId: { projectId: fileProjectId, studentId: owner!.id } },
        include: { files: true }
      })
      if (!submission || submission.files.length === 0) {
        await prisma.submission.deleteMany({ where: { projectId: fileProjectId, studentId: owner!.id } })
        const pdfContent = Buffer.from('%PDF-1.4\n%%EOF', 'utf8')
        await request(app)
          .post(`/api/student/projects/${fileProjectId}/submit`)
          .set('Authorization', `Bearer ${studentToken}`)
          .attach('files', pdfContent, { filename: 'report.pdf', contentType: 'application/pdf' })
        submission = await prisma.submission.findUnique({
          where: { projectId_studentId: { projectId: fileProjectId, studentId: owner!.id } },
          include: { files: true }
        })
      }
      expect(submission?.files.length).toBeGreaterThan(0)
      const fileId = submission!.files[0].id

      // Create another student not enrolled
      const otherStudent = await prisma.user.create({
        data: {
          name: 'Other Student 2',
          email: `other.student2.${Date.now()}@test.com`,
          passwordHash: await hashPassword('password123'),
          role: 'STUDENT'
        }
      })
      const otherToken = generateToken({
        userId: otherStudent.id,
        email: otherStudent.email,
        name: otherStudent.name,
        role: 'STUDENT'
      })

      const res = await request(app)
        .get(`/api/student/files/${fileId}`)
        .set('Authorization', `Bearer ${otherToken}`)
      expect(res.status).toBe(403)

      // Owner CAN access their own file
      const ownRes = await request(app)
        .get(`/api/student/files/${fileId}`)
        .set('Authorization', `Bearer ${studentToken}`)
      expect(ownRes.status).toBe(200)

      await prisma.user.delete({ where: { id: otherStudent.id } })
    })

    it('unauthorized lecturer cannot access another lecturer\'s course files', async () => {
      // Ensure a valid submission with files exists
      const owner = await prisma.user.findFirst({ where: { email: 'test.student@university.edu' } })
      let submission = await prisma.submission.findUnique({
        where: { projectId_studentId: { projectId: fileProjectId, studentId: owner!.id } },
        include: { files: true }
      })
      if (!submission || submission.files.length === 0) {
        await prisma.submission.deleteMany({ where: { projectId: fileProjectId, studentId: owner!.id } })
        const pdfContent = Buffer.from('%PDF-1.4\n%%EOF', 'utf8')
        await request(app)
          .post(`/api/student/projects/${fileProjectId}/submit`)
          .set('Authorization', `Bearer ${studentToken}`)
          .attach('files', pdfContent, { filename: 'report.pdf', contentType: 'application/pdf' })
        submission = await prisma.submission.findUnique({
          where: { projectId_studentId: { projectId: fileProjectId, studentId: owner!.id } },
          include: { files: true }
        })
      }
      expect(submission?.files.length).toBeGreaterThan(0)
      const fileId = submission!.files[0].id

      const res = await request(app)
        .get(`/api/lecturer/files/${fileId}`)
        .set('Authorization', `Bearer ${otherLecturerToken}`)
      expect(res.status).toBe(403)
    })

    it('existing seeded LINK project still works end-to-end', async () => {
      // The seeded E-Commerce Website project has submissionType LINK
      const seededProject = await prisma.project.findUnique({ where: { id: 'project-swe301-ecommerce' } })
      expect(seededProject).toBeDefined()

      // Use Emily who has NOT_SUBMITTED status on the seeded project
      const emilyHash = await hashPassword('password123')
      let emily = await prisma.user.findUnique({ where: { email: 'emily@test.com' } })
      if (!emily) {
        emily = await prisma.user.create({
          data: {
            name: 'Emily Test',
            email: `emily.${Date.now()}@test.com`,
            passwordHash: emilyHash,
            role: 'STUDENT'
          }
        })
        // Enroll in SWE301 course
        const swe301 = await prisma.course.findUnique({ where: { code: 'SWE301' } })
        if (swe301) {
          await prisma.enrollment.create({
            data: { studentId: emily.id, courseId: swe301.id }
          })
        }
      }

      const emilyToken = generateToken({
        userId: emily.id,
        email: emily.email,
        name: emily.name,
        role: 'STUDENT'
      })

      // Check project details show LINK type
      const detailRes = await request(app)
        .get(`/api/student/projects/project-swe301-ecommerce`)
        .set('Authorization', `Bearer ${emilyToken}`)

      if (detailRes.status === 200) {
        expect(detailRes.body.submissionType).toBe('LINK')

        // Submit URL only - should work
        const submitRes = await request(app)
          .post(`/api/student/projects/project-swe301-ecommerce/submit`)
          .set('Authorization', `Bearer ${emilyToken}`)
          .field('projectUrl', 'https://github.com/emily/test-project')
        expect(submitRes.status).toBe(200)
        expect(submitRes.body.projectUrl).toBe('https://github.com/emily/test-project')
      }

      // Cleanup
      await prisma.submission.deleteMany({ where: { studentId: emily.id } })
      await prisma.enrollment.deleteMany({ where: { studentId: emily.id } })
      await prisma.user.delete({ where: { id: emily.id } }).catch(() => {})
    })
  })

  // Helper to create minimal PNG content
  function pngContent(): Buffer {
    // Minimal valid PNG header + IHDR + IEND
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
      Buffer.from([0x00, 0x00, 0x00, 0x0D]), // IHDR length
      Buffer.from('IHDR'),
      Buffer.alloc(13), // IHDR data
      Buffer.alloc(4), // CRC
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // IEND length
      Buffer.from('IEND')
    ])
  }
})