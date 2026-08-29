import { Router } from 'express'
import { prisma } from '../utils/db'
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth'
import { gradeSubmissionSchema, publishGradeSchema, createProjectSchema, createCourseSchema, updateProjectSchema } from '../utils/validation'
import { calculateLetterGrade } from '../utils/grade'
import fs from 'fs'
import path from 'path'

const router = Router()

router.use(authenticate)
router.use(requireRole('LECTURER'))

router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId

  const courses = await prisma.course.findMany({
    where: { lecturerId: userId },
    include: {
      projects: {
        include: {
          submissions: true
        }
      }
    }
  })

  const projectStats = courses.flatMap(course =>
    course.projects.map(project => {
      const projectSubmissions = project.submissions
      const totalStudents = projectSubmissions.length
      const submittedCount = projectSubmissions.filter(s => s.status !== 'NOT_SUBMITTED').length
      const gradedCount = projectSubmissions.filter(s => s.status === 'GRADED' || s.status === 'PUBLISHED').length
      const publishedCount = projectSubmissions.filter(s => s.status === 'PUBLISHED').length
      const pendingCount = totalStudents - submittedCount

      return {
        id: project.id,
        courseId: project.courseId,
        course: course.name,
        courseCode: course.code,
        title: project.title,
        deadline: project.deadline,
        totalStudents,
        submittedCount,
        gradedCount,
        publishedCount,
        pendingCount
      }
    })
  )

  res.json({
    name: req.user!.name,
    projects: projectStats
  })
})

router.get('/courses', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId

  const courses = await prisma.course.findMany({
    where: { lecturerId: userId },
    select: { id: true, name: true, code: true }
  })

  res.json(courses)
})

router.post('/courses', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId

  const parseResult = createCourseSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() })
  }

  const { name, code } = parseResult.data

  const existingCourse = await prisma.course.findUnique({ where: { code } })
  if (existingCourse) {
    return res.status(400).json({ error: 'Course code already exists' })
  }

  const course = await prisma.course.create({
    data: {
      name,
      code,
      lecturerId: userId
    }
  })

  res.status(201).json({
    id: course.id,
    name: course.name,
    code: course.code
  })
})

router.put('/projects/:projectId', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId
  const { projectId } = req.params

  const parseResult = updateProjectSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() })
  }

  const { title, description, requirements, deadline, courseId, submissionType } = parseResult.data

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { course: true }
  })

  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  if (project.course.lecturerId !== userId) {
    return res.status(403).json({ error: 'Not authorized for this project' })
  }

  // Handle course change
  if (courseId && courseId !== project.courseId) {
    const newCourse = await prisma.course.findUnique({ where: { id: courseId } })
    if (!newCourse) {
      return res.status(404).json({ error: 'New course not found' })
    }
    if (newCourse.lecturerId !== userId) {
      return res.status(403).json({ error: 'Not authorized for the new course' })
    }

    // Check if there are existing submissions
    const submissionsCount = await prisma.submission.count({
      where: { projectId }
    })
    if (submissionsCount > 0) {
      return res.status(400).json({ error: 'Cannot change course: project has existing submissions' })
    }
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      title,
      description,
      requirements,
      deadline: deadline ? new Date(deadline) : undefined,
      courseId: courseId && courseId !== project.courseId ? courseId : undefined,
      submissionType: submissionType || project.submissionType
    }
  })

  res.json({
    id: updated.id,
    courseId: updated.courseId,
    title: updated.title,
    description: updated.description,
    requirements: updated.requirements,
    deadline: updated.deadline
  })
})

router.delete('/projects/:projectId', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId
  const { projectId } = req.params

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { course: true }
  })

  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  if (project.course.lecturerId !== userId) {
    return res.status(403).json({ error: 'Not authorized for this project' })
  }

  // Delete orphaned files from disk before DB cascade
  try {
    const files = await prisma.submissionFile.findMany({
      where: { submission: { projectId } },
      select: { filePath: true }
    })
    for (const f of files) {
      try {
        const p = path.resolve(f.filePath)
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch (e) {
        console.error('Failed to delete orphaned file:', f.filePath, e)
      }
    }
  } catch (e) {
    console.error('Failed to enumerate orphaned files:', e)
  }

  await prisma.project.delete({ where: { id: projectId } })

  res.status(204).send()
})

router.post('/projects', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId

  const parseResult = createProjectSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() })
  }

  const { courseId, title, description, requirements, deadline, submissionType } = parseResult.data

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) {
    return res.status(404).json({ error: 'Course not found' })
  }

  if (course.lecturerId !== userId) {
    return res.status(403).json({ error: 'Not authorized for this course' })
  }

  const project = await prisma.project.create({
    data: {
      courseId,
      title,
      description,
      requirements,
      deadline: new Date(deadline),
      submissionType: submissionType || 'LINK'
    }
  })

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { studentId: true }
  })

  if (enrollments.length > 0) {
    await prisma.submission.createMany({
      data: enrollments.map(e => ({
        projectId: project.id,
        studentId: e.studentId,
        status: 'NOT_SUBMITTED'
      }))
    })
  }

  res.status(201).json({
    id: project.id,
    courseId: project.courseId,
    title: project.title,
    description: project.description,
    requirements: project.requirements,
    deadline: project.deadline,
    submissionType: project.submissionType
  })
})

router.get('/projects/:projectId/submissions', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId
  const { projectId } = req.params

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      course: true,
      submissions: {
        include: {
          student: { select: { id: true, name: true, email: true } },
          files: true
        }
      }
    }
  })

  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  if (project.course.lecturerId !== userId) {
    return res.status(403).json({ error: 'Not authorized for this project' })
  }

  const submissions = project.submissions.map(submission => ({
    id: submission.id,
    student: submission.student,
    status: submission.status,
    submittedAt: submission.submittedAt,
    score: submission.score,
    grade: submission.score !== null ? calculateLetterGrade(submission.score) : null,
    gradedAt: submission.gradedAt,
    files: submission.files?.map(f => ({
      id: f.id,
      fileName: f.fileName,
      mimeType: f.mimeType,
      fileSize: f.fileSize,
      createdAt: f.createdAt
    })) || []
  }))

  res.json({
    project: {
      id: project.id,
      title: project.title,
      course: project.course.name,
      courseCode: project.course.code,
      deadline: project.deadline,
      submissionType: project.submissionType
    },
    submissions
  })
})

router.get('/submissions/:submissionId', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId
  const { submissionId } = req.params

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      project: { include: { course: true } },
      student: { select: { id: true, name: true, email: true } },
      files: true
    }
  })

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' })
  }

  if (submission.project.course.lecturerId !== userId) {
    return res.status(403).json({ error: 'Not authorized for this submission' })
  }

  res.json({
    id: submission.id,
    student: submission.student,
    project: {
      id: submission.project.id,
      title: submission.project.title,
      course: submission.project.course.name,
      courseCode: submission.project.course.code
    },
    projectUrl: submission.projectUrl,
    submittedAt: submission.submittedAt,
    score: submission.score,
    feedback: submission.feedback,
    status: submission.status,
    grade: submission.score !== null ? calculateLetterGrade(submission.score) : null,
    files: submission.files?.map(f => ({
      id: f.id,
      fileName: f.fileName,
      mimeType: f.mimeType,
      fileSize: f.fileSize,
      createdAt: f.createdAt
    })) || []
  })
})

router.put('/submissions/:submissionId/grade', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId
  const { submissionId } = req.params

  const parseResult = gradeSubmissionSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() })
  }

  const { score, feedback } = parseResult.data

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { project: { include: { course: true } } }
  })

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' })
  }

  if (submission.project.course.lecturerId !== userId) {
    return res.status(403).json({ error: 'Not authorized for this submission' })
  }

  if (submission.status === 'NOT_SUBMITTED') {
    return res.status(400).json({ error: 'Cannot grade unsubmitted work' })
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      score,
      feedback,
      status: 'GRADED',
      gradedAt: new Date()
    }
  })

  res.json({
    id: updated.id,
    score: updated.score,
    feedback: updated.feedback,
    status: updated.status,
    grade: calculateLetterGrade(updated.score!),
    gradedAt: updated.gradedAt
  })
})

router.put('/submissions/:submissionId/publish', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId
  const { submissionId } = req.params

  const parseResult = publishGradeSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() })
  }

  const { publish } = parseResult.data

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { project: { include: { course: true } } }
  })

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' })
  }

  if (submission.project.course.lecturerId !== userId) {
    return res.status(403).json({ error: 'Not authorized for this submission' })
  }

  if (publish && submission.status !== 'GRADED') {
    return res.status(400).json({ error: 'Can only publish graded submissions' })
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: publish ? 'PUBLISHED' : 'GRADED'
    }
  })

  res.json({
    id: updated.id,
    status: updated.status,
    score: updated.score,
    grade: updated.score !== null ? calculateLetterGrade(updated.score) : null
  })
})

router.get('/files/:fileId', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId
  const { fileId } = req.params

  const file = await prisma.submissionFile.findUnique({
    where: { id: fileId },
    include: {
      submission: {
        include: {
          project: { include: { course: true } }
        }
      }
    }
  })

  if (!file) {
    return res.status(404).json({ error: 'File not found' })
  }

  if (file.submission.project.course.lecturerId !== userId) {
    return res.status(403).json({ error: 'Not authorized to access this file' })
  }

  const filePath = path.resolve(file.filePath)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' })
  }

  res.download(filePath, file.fileName)
})

export default router