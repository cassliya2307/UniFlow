import { Router } from 'express'
import { prisma } from '../utils/db'
import { generateToken, verifyPassword } from '../utils/auth'
import { loginSchema } from '../utils/validation'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.post('/login', async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() })
  }

  const { email, password } = parseResult.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

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

router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  if (!user) return res.status(404).json({ error: 'User not found' })

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  })
})

export default router