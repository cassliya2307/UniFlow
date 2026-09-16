import { Router } from 'express'
import { prisma } from '../utils/db'
import { registerSchema } from '../utils/validation'
import { hashPassword, generateToken } from '../utils/auth'


const router = Router()

router.post('/', async (req, res) => {
  const parseResult = registerSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() })
  }

  const { name, matriculationNumber, course: courseInput, email, password } = parseResult.data

  const normalizedCourseCode = courseInput.trim().toUpperCase()

  const course = await prisma.course.findUnique({ where: { code: normalizedCourseCode } })
  if (!course) {
    return res.status(404).json({ error: 'Course not found' })
  }

  const emailExists = await prisma.user.findUnique({ where: { email } })
  if (emailExists) {
    return res.status(400).json({ error: 'Email already registered' })
  }

  const matriExists = await prisma.user.findUnique({ where: { matriculationNumber: matriculationNumber.trim().toUpperCase() } })
  if (matriExists) {
    return res.status(400).json({ error: 'Matriculation number already registered' })
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.$transaction(async (prisma) => {
    const createdUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'STUDENT',
        matriculationNumber: matriculationNumber.trim().toUpperCase()
      }
    })

    await prisma.enrollment.create({
      data: {
        studentId: createdUser.id,
        courseId: course.id
      }
    })

    return createdUser
  })

  const token = generateToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'STUDENT' | 'LECTURER'
  })

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  })
})

export default router