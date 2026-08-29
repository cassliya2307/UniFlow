import { Request, Response, NextFunction } from 'express'
import { verifyToken, extractTokenFromHeader, JwtPayload } from '../utils/auth'
import { prisma } from '../utils/db'

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }

  req.user = payload
  next()
}

export function requireRole(...roles: ('STUDENT' | 'LECTURER')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}