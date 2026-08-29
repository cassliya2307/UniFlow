import { Router } from 'express'
import { prisma } from '../utils/db'
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth'
import { submitProjectSchema, submitProjectWithFilesSchema } from '../utils/validation'
import { calculateLetterGrade } from '../utils/grade'
import { upload } from '../utils/fileUpload'
import fs from 'fs'
import path from 'path'

const router = Router()

router.use(authenticate)
router.use(requireRole('STUDENT'))

router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: userId },
    include: {
      course: {
        include: {
          projects: {
            include: {
              submissions: {
                where: { studentId: userId }
              }
            }
          }
        }
      }
    }
  })

  // Map projects with their course info
  const projects = enrollments.flatMap(enrollment =>
    enrollment.course.projects.map(project => ({
      ...project,
      course: enrollment.course
    }))
  )

  const submissions = projects.flatMap(p => p.submissions)

  const totalProjects = projects.length
  const submittedProjects = submissions.filter(s => s.status !== 'NOT_SUBMITTED').length
  const gradedProjects = submissions.filter(s => s.status === 'GRADED' || s.status === 'PUBLISHED').length
  const publishedProjects = submissions.filter(s => s.status === 'PUBLISHED').length
  const pendingProjects = totalProjects - submittedProjects

  const projectList = projects.map(project => {
    const submission = project.submissions[0]
    return {
      id: project.id,
      course: project.course.name,
      courseCode: project.course.code,
      title: project.title,
      deadline: project.deadline,
      submissionType: project.submissionType,
      submissionStatus: submission?.status || 'NOT_SUBMITTED',
      score: submission?.status === 'PUBLISHED' ? submission.score : null,
      grade: submission?.status === 'PUBLISHED' && submission.score !== null
        ? calculateLetterGrade(submission.score)
        : null,
      submittedAt: submission?.submittedAt || null
    }
  })

  res.json({
    name: req.user!.name,
    totalProjects,
    submittedProjects,
    gradedProjects,
    publishedProjects,
    pendingProjects,
    projects: projectList
  })
})

router.get('/projects/:projectId', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId
  const { projectId } = req.params

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      course: true,
      submissions: {
        where: { studentId: userId },
        include: {
          files: true
        }
      }
    }
  })

  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: userId, courseId: project.courseId } }
  })
  if (!enrollment) {
    return res.status(403).json({ error: 'Not enrolled in this course' })
  }

  const submission = project.submissions[0]

  res.json({
    id: project.id,
    course: project.course.name,
    courseCode: project.course.code,
    title: project.title,
    description: project.description,
    requirements: project.requirements,
    deadline: project.deadline,
    submissionType: project.submissionType,
    submission: submission ? {
      id: submission.id,
      projectUrl: submission.projectUrl,
      submittedAt: submission.submittedAt,
      status: submission.status,
      score: submission.status === 'PUBLISHED' ? submission.score : null,
      grade: submission.status === 'PUBLISHED' && submission.score !== null
        ? calculateLetterGrade(submission.score)
        : null,
      feedback: submission.status === 'PUBLISHED' ? submission.feedback : null,
      files: submission.files?.map(f => ({
        id: f.id,
        fileName: f.fileName,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        createdAt: f.createdAt
      })) || []
    } : null
  })
})

router.post('/projects/:projectId/submit', upload.array('files'), async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId
  const { projectId } = req.params
  const projectUrl = req.body.projectUrl

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { course: true }
  })
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: userId, courseId: project.courseId } }
  })
  if (!enrollment) {
    return res.status(403).json({ error: 'Not enrolled in this course' })
  }

  const existingSubmission = await prisma.submission.findUnique({
    where: { projectId_studentId: { projectId, studentId: userId } }
  })

  if (existingSubmission && existingSubmission.status !== 'NOT_SUBMITTED') {
    return res.status(400).json({ error: 'Already submitted' })
  }

  const now = new Date()
  if (now > project.deadline) {
    return res.status(400).json({ error: 'Submission deadline has passed' })
  }

  // Validate based on submission type
  const files = req.files as Express.Multer.File[]

  if (project.submissionType === 'LINK') {
    if (!projectUrl) {
      return res.status(400).json({ error: 'Submission link is required' })
    }
    if (files && files.length > 0) {
      return res.status(400).json({ error: 'Files not allowed for link-only submissions' })
    }
  } else if (project.submissionType === 'FILE') {
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' })
    }
  } else if (project.submissionType === 'LINK_AND_FILE') {
    if (!projectUrl) {
      return res.status(400).json({ error: 'Submission link is required' })
    }
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' })
    }
  }

  if (now > project.deadline) {
    return res.status(400).json({ error: 'Submission deadline has passed' })
  }

  const submission = await prisma.submission.upsert({
    where: { projectId_studentId: { projectId, studentId: userId } },
    update: {
      projectUrl: project.submissionType !== 'FILE' ? projectUrl : null,
      submittedAt: now,
      status: 'SUBMITTED'
    },
    create: {
      projectId,
      studentId: userId,
      projectUrl: project.submissionType !== 'FILE' ? projectUrl : null,
      submittedAt: now,
      status: 'SUBMITTED'
    }
  })

  // Save files if any
  if (files && files.length > 0) {
    await prisma.submissionFile.createMany({
      data: files.map(file => ({
        submissionId: submission.id,
        fileName: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size
      }))
    })
  }

  res.json({
    id: submission.id,
    projectUrl: submission.projectUrl,
    submittedAt: submission.submittedAt,
    status: submission.status
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

  if (file.submission.studentId !== userId) {
    return res.status(403).json({ error: 'Not authorized to access this file' })
  }

  const filePath = path.resolve(file.filePath)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' })
  }

  res.download(filePath, file.fileName)
})

export default router